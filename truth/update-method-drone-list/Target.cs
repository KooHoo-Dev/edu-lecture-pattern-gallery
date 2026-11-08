// 하네스 어댑터: 코어(DroneSwarm, Drone)와 나쁜 예(NaiveDroneManager)를 시나리오 입력으로 돌리고 사건과 상태를 글로 꺼낸다.
// 패턴은 코어의 이벤트를 불린 순서대로 적고, 루프가 끝난 뒤 지운 것과 합친 것은 한 줄로 모은다.
// 나쁜 예에는 이벤트가 없으므로 프레임 전후의 목록과 드론마다의 업데이트 횟수를 비교해 적고, 버그는 여기서 찾는다 (나쁜 예 코드에는 검사 코드를 넣지 않는다).
// 웹 sim(src/specimens/update-method-drone-list/sim.ts)의 drain, snapshot 과 같은 글을 만든다.
using System.Collections.Generic;
using System.Text;
using PatternGallery.Truth;
using PatternGallery.UpdateMethodDroneList.Naive;

namespace PatternGallery.UpdateMethodDroneList
{
    [SimTarget("update-method-drone-list")]
    public sealed class Target : ISimTarget
    {
        readonly List<string> events = new List<string>();

        // 패턴
        readonly DroneSwarm swarm;
        bool ticking;
        readonly List<string> removed = new List<string>();
        readonly List<string> merged = new List<string>();

        // 나쁜 예
        readonly NaiveDroneManager naive;
        int naiveUpdated;
        /// <summary>업데이트 건너뜀 ✖ 를 이미 쓴 드론 → 건너뛴 횟수</summary>
        readonly Dictionary<NaiveDrone, int> skipped = new Dictionary<NaiveDrone, int>();
        int skippedTotal;
        int bornMovedTotal;

        public Target(Values v, bool isNaive)
        {
            float moveSpeed = v.Float("moveSpeed");
            float splitDelay = v.Float("splitDelay");
            int splitCount = v.Int("splitCount");
            if (isNaive)
            {
                naive = new NaiveDroneManager { moveSpeed = moveSpeed, splitDelay = splitDelay, splitCount = splitCount };
                return;
            }
            swarm = new DroneSwarm(new SwarmSettings { MoveSpeed = moveSpeed, SplitDelay = splitDelay, SplitCount = splitCount });
            swarm.Spawned += d =>
            {
                if (ticking) merged.Add(d.Name);
                else events.Add($"{d.Name} 출발 · 목록 {swarm.Drones.Count}");
            };
            swarm.SpawnQueued += d => events.Add($"{d.Name} 대기 목록에 (분열)");
            swarm.DespawnRequested += d => events.Add($"{d.Name} {Why(d.Reason)} → 지울 표시");
            swarm.Despawned += d => removed.Add(d.Name);
            swarm.Damaged += (n, dmg) => events.Add($"EMP: 드론 {n}대 HP -{dmg}");
        }

        static string Why(DespawnReason r) => r switch
        {
            DespawnReason.Destroyed => "HP 0",
            DespawnReason.ReachedBase => "기지 도달",
            _ => "분열",
        };

        public void Input(string name)
        {
            if (swarm != null)
            {
                if (name == "spawn") swarm.Launch(DroneKind.Normal);
                else if (name == "splitter") swarm.Launch(DroneKind.Splitter);
                else swarm.DamageAll(1);
                return;
            }
            if (name == "emp")
            {
                naive.OnEmp();
                events.Add($"EMP: 드론 {naive.drones.Count}대 HP -1");
                return;
            }
            if (name == "spawn") naive.OnSpawn();
            else naive.OnSplitter();
            events.Add($"{naive.drones[naive.drones.Count - 1].name} 출발 · 목록 {naive.drones.Count}");
        }

        public void Tick(float dt)
        {
            if (swarm != null)
            {
                ticking = true;
                swarm.Tick(dt);
                ticking = false;
                if (removed.Count > 0) events.Add($"지움 {string.Join(", ", removed)} (루프가 끝난 뒤 RemoveAll)");
                if (merged.Count > 0) events.Add($"합침 {string.Join(", ", merged)} → 목록 {swarm.Drones.Count} (다음 프레임부터 Update)");
                removed.Clear();
                merged.Clear();
                return;
            }

            var before = new List<NaiveDrone>(naive.drones);
            var updates0 = new List<int>();
            foreach (NaiveDrone d in before) updates0.Add(d.updates);
            naive.Update(dt);
            var after = naive.drones;

            naiveUpdated = 0;
            for (int i = 0; i < before.Count; i++) naiveUpdated += before[i].updates - updates0[i];
            foreach (NaiveDrone d in after)
                if (!before.Contains(d)) naiveUpdated += d.updates;

            // 목록에서 빠진 드론 (자기 Update 안에서 바로 Remove)
            foreach (NaiveDrone d in before)
            {
                if (after.Contains(d)) continue;
                if (d.hp <= 0) events.Add($"{d.name} HP 0 → 바로 Remove");
                else if (d.x <= naive.baseX) events.Add($"{d.name} 기지 도달 → 바로 Remove");
                else events.Add($"{d.name} 분열 → {Children(d, before)} 바로 Add, {d.name} 바로 Remove");
            }
            // 프레임 처음부터 있었고 아직 목록에 있는데 Update 를 받지 못한 드론
            for (int i = 0; i < before.Count; i++)
            {
                NaiveDrone d = before[i];
                if (!after.Contains(d) || d.updates != updates0[i]) continue;
                string prev = i > 0 ? before[i - 1].name : "?";
                if (d.hp <= 0)
                {
                    events.Add($"{d.name} 도 건너뜀 · HP 0 인데 목록에 남아 다음 프레임에 빠진다");
                    continue;
                }
                skippedTotal++;
                if (skipped.TryGetValue(d, out int n))
                {
                    skipped[d] = n + 1;
                    events.Add($"{d.name} 또 건너뜀 · 모두 {n + 1}번 (바로 앞 칸 {prev} Remove)");
                    continue;
                }
                skipped[d] = 1;
                events.Add($"!업데이트 건너뜀: {d.name} 이번 프레임에 안 움직임 (바로 앞 칸 {prev} Remove 로 당겨짐) · u {d.updates}");
            }
            // 이번 프레임에 Add 된 드론이 같은 프레임에 Update 를 받았다
            foreach (NaiveDrone d in after)
            {
                if (before.Contains(d) || d.updates == 0) continue;
                bornMovedTotal++;
                events.Add($"!태어난 프레임에 움직임: {d.name} Add 된 프레임에 바로 Update 됨 · u {d.updates}");
            }
        }

        /// <summary>이번 프레임에 parent 가 나뉘며 Add 한 조각 이름 (부모 이름 + 글자 하나)</summary>
        string Children(NaiveDrone parent, List<NaiveDrone> before)
        {
            var names = new List<string>();
            foreach (NaiveDrone d in naive.drones)
                if (!before.Contains(d) && d.name.Length == parent.name.Length + 1 && d.name.StartsWith(parent.name)) names.Add(d.name);
            return string.Join(", ", names);
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
            if (swarm != null)
            {
                s.Append($"list={swarm.Drones.Count} updated={swarm.LastUpdated}");
                foreach (Drone d in swarm.Drones) s.Append($" {d.Name} x={Fmt.F(d.X)} u={d.Updates}");
                return s.ToString();
            }
            s.Append($"list={naive.drones.Count} updated={naiveUpdated} skipped={skippedTotal} born={bornMovedTotal}");
            foreach (NaiveDrone d in naive.drones) s.Append($" {d.name} x={Fmt.F(d.x)} u={d.updates}");
            return s.ToString();
        }
    }
}
