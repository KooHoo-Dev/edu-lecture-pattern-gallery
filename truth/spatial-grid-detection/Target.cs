// 하네스 어댑터: 코어(Field, SpatialGrid, Turret)와 나쁜 예(NaiveTurret)를 시나리오 입력으로 돌리고 사건과 상태를 글로 꺼낸다.
// 패턴은 코어의 이벤트를 불린 순서대로 적는다. 나쁜 예에는 이벤트가 없으므로 프레임 전후를 비교해 적고,
// 같은 입력을 받는 코어(그림자)의 탐지 결과를 '찾았어야 할 드론' 으로 삼아 버그를 여기서 찾는다 (나쁜 예 코드에는 검사 코드를 넣지 않는다).
// 웹 sim(src/specimens/spatial-grid-detection/sim.ts)의 drain, snapshot 과 같은 글을 만든다.
using System;
using System.Collections.Generic;
using System.Text;
using PatternGallery.SpatialGridDetection.Naive;
using PatternGallery.Truth;

namespace PatternGallery.SpatialGridDetection
{
    [SimTarget("spatial-grid-detection")]
    public sealed class Target : ISimTarget
    {
        readonly List<string> events = new List<string>();

        // 패턴 (나쁜 예 모드에서는 그림자: 사건은 적지 않는다)
        readonly Field field;
        readonly Turret turret;

        // 나쁜 예
        readonly NaiveTurret naive;
        /// <summary>드론마다 마지막으로 적은 실제 칸</summary>
        readonly Dictionary<NaiveDrone, (int, int)> actualCell = new Dictionary<NaiveDrone, (int, int)>();
        /// <summary>마지막 탐지에서 반경 안인데 못 찾은 드론 → 버그 종류 (다음 탐지까지 남는다)</summary>
        Dictionary<NaiveDrone, string> missed = new Dictionary<NaiveDrone, string>();

        public Target(Values v, bool isNaive)
        {
            float cellSize = v.Float("cellSize");
            float scanRadius = v.Float("scanRadius");
            float droneSpeed = v.Float("droneSpeed");
            field = new Field(new FieldSettings { CellSize = cellSize, DroneSpeed = droneSpeed });
            turret = new Turret(field.Grid, field.Settings.TurretX, field.Settings.TurretY, scanRadius);
            if (isNaive)
            {
                naive = new NaiveTurret { cellSize = cellSize, scanRadius = scanRadius, droneSpeed = droneSpeed };
                return;
            }
            field.Added += d => events.Add($"{d.Name} 칸 {d.Cell} 에 등록 · 자리 ({Fmt.F(d.X)}, {Fmt.F(d.Y)})");
            field.CellChanged += (d, from, to) => events.Add($"{d.Name} 칸 {from} → {to} · 옛 칸에서 빼고 새 칸에 넣음");
            turret.Scanned += r => events.Add($"탐지: 칸 {r.Visited.Count}개 · 거리 검사 {r.Checks}회 (전체 검사면 {r.FullChecks}회) · 찾음 {Names(r.Found)}");
            turret.AutoScanChanged += on => events.Add(on ? $"자동 탐지 켬 ({Fmt.F(turret.ScanInterval)}초마다)" : "자동 탐지 끔");
        }

        static string Names(List<Drone> list)
        {
            if (list.Count == 0) return "없음";
            var names = new List<string>();
            foreach (Drone d in list) names.Add(d.Name);
            return string.Join(", ", names);
        }

        static string C((int, int) c) => $"({c.Item1},{c.Item2})";

        public void Input(string name)
        {
            // 코어 (나쁜 예 모드에서는 그림자)
            if (name == "wave") field.AddWave();
            else if (name == "scan") turret.Scan();
            else if (name == "autoScan") turret.SetAutoScan(!turret.AutoScan);
            if (naive == null) return;

            int scans0 = naive.scans;
            if (name == "wave")
            {
                int n0 = naive.drones.Count;
                naive.OnWave();
                for (int i = n0; i < naive.drones.Count; i++)
                {
                    NaiveDrone d = naive.drones[i];
                    actualCell[d] = naive.CellOf(d.x, d.y);
                    events.Add($"{d.name} 칸 {C(actualCell[d])} 에 등록 · 자리 ({Fmt.F(d.x)}, {Fmt.F(d.y)})");
                }
            }
            else if (name == "scan") naive.OnScan();
            else if (name == "autoScan")
            {
                naive.OnAutoScan();
                events.Add(naive.autoScan ? $"자동 탐지 켬 ({Fmt.F(naive.scanInterval)}초마다)" : "자동 탐지 끔");
            }
            if (naive.scans != scans0) Scanned();
        }

        public void Tick(float dt)
        {
            field.Tick(dt);
            turret.Tick(dt);
            if (naive == null) return;

            int scans0 = naive.scans;
            naive.Update(dt);
            foreach (NaiveDrone d in naive.drones)
            {
                var now = naive.CellOf(d.x, d.y);
                if (now == actualCell[d]) continue;
                events.Add($"{d.name} 실제 칸 {C(actualCell[d])} → {C(now)} · 등록은 처음 칸 {C(Registered(d))} 그대로");
                actualCell[d] = now;
            }
            if (naive.scans != scans0) Scanned();
        }

        /// <summary>나쁜 예가 이 드론을 넣어 둔 칸 (처음 칸)</summary>
        (int, int) Registered(NaiveDrone d)
        {
            foreach (KeyValuePair<(int, int), List<NaiveDrone>> pair in naive.cells)
                if (pair.Value.Contains(d)) return pair.Key;
            return (int.MinValue, int.MinValue);
        }

        NaiveDrone NaiveOf(Drone d)
        {
            foreach (NaiveDrone n in naive.drones)
                if (n.name == d.Name) return n;
            return null;
        }

        /// <summary>나쁜 예가 탐지했다. 같은 입력을 받은 그림자 코어가 찾았는데 나쁜 예가 못 찾은 드론을 원인별로 적는다</summary>
        void Scanned()
        {
            var own = naive.CellOf(naive.turretX, naive.turretY);
            var names = new List<string>();
            foreach (NaiveDrone d in naive.found) names.Add(d.name);
            events.Add($"탐지: 포탑 칸 {C(own)} 만 · 거리 검사 {naive.checks}회 (전체 검사면 {naive.drones.Count}회) · 찾음 {(names.Count == 0 ? "없음" : string.Join(", ", names))}");

            var next = new Dictionary<NaiveDrone, string>();
            foreach (Drone shadow in turret.Last.Found)
            {
                NaiveDrone d = NaiveOf(shadow);
                if (d == null || naive.found.Contains(d)) continue;
                var actual = naive.CellOf(d.x, d.y);
                var reg = Registered(d);
                string dist = Fmt.F(Math.Sqrt(shadow.DistanceSq(turret.X, turret.Y)));
                // 실제로 포탑 칸에 있으면 등록만 맞았어도 찾았다 → 칸 등록을 옮기지 않은 탓. 옆 칸이면 등록이 맞아도 보지 않았다 → 내 칸만 본 탓
                string kind = actual == own ? "탐지 누락" : "경계 누락";
                next[d] = kind;
                // 앞 탐지에서도 못 찾았으면 같은 누락이 이어지는 것이다 (✖ 는 처음 한 번. 그사이 칸을 옮겨 원인이 바뀌었으면 글에 적는다)
                if (missed.TryGetValue(d, out string before))
                {
                    events.Add($"{d.name} 또 못 찾음 ({(before == kind ? kind + " 그대로" : before + " → " + kind)}) · 거리 {dist}");
                    continue;
                }
                if (kind == "탐지 누락")
                    events.Add($"!탐지 누락: {d.name} 거리 {dist} · 포탑 칸 {C(own)} 에 왔는데 처음 칸 {C(reg)} 목록에만 있다");
                else if (reg == actual)
                    events.Add($"!경계 누락: {d.name} 거리 {dist} · 옆 칸 {C(actual)} 에 있어 보지 않았다 (등록은 맞다)");
                else
                    events.Add($"!경계 누락: {d.name} 거리 {dist} · 옆 칸 {C(actual)} 에 있어 보지 않았다 (등록도 처음 칸 {C(reg)} 그대로)");
            }
            missed = next;
        }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        public string Snapshot()
        {
            var s = new StringBuilder();
            if (naive == null)
            {
                ScanResult r = turret.Last;
                s.Append($"drones={field.Drones.Count} checks={(r == null ? 0 : r.Checks)} full={(r == null ? 0 : r.FullChecks)} found={(r == null ? 0 : r.Found.Count)}");
                foreach (Drone d in field.Drones) s.Append($" {d.Name} x={Fmt.F(d.X)} y={Fmt.F(d.Y)} cell={d.Cell.X},{d.Cell.Y}");
                return s.ToString();
            }
            s.Append($"drones={naive.drones.Count} checks={naive.checks} found={naive.found.Count} missed={missed.Count}");
            foreach (NaiveDrone d in naive.drones)
            {
                var a = naive.CellOf(d.x, d.y);
                var reg = Registered(d);
                s.Append($" {d.name} x={Fmt.F(d.x)} y={Fmt.F(d.y)} cell={a.Item1},{a.Item2} reg={reg.Item1},{reg.Item2}");
            }
            return s.ToString();
        }
    }
}
