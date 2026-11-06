// 하네스 어댑터: 컴포지트 코어(Squad, Drone)와 나쁜 예(NaiveCommander)를 시나리오 입력으로 돌리고 사건과 상태를 글로 꺼낸다.
// 패턴은 본대 하나의 이벤트를 불린 순서대로 적는다 (명령이 트리를 내려간 순서가 그대로 남는다).
// 나쁜 예 옆에는 같은 입력을 받는 코어(그림자)를 두고 '있어야 할 결과' 로 삼아 비교한다 (나쁜 예 코드에는 검사 코드를 넣지 않는다).
// 웹 sim(src/specimens/composite-drone-squads/sim.ts)과 같은 글을 만든다.
using System.Collections.Generic;
using PatternGallery.CompositeDroneSquads.Naive;
using PatternGallery.Truth;

namespace PatternGallery.CompositeDroneSquads
{
    [SimTarget("composite-drone-squads")]
    public sealed class Target : ISimTarget
    {
        // 기본 편대 구성 (Unity 에서는 Hierarchy 가 이 일을 한다). D4, D5 는 지원 편대 C 로 처음부터 멀리 정찰 중
        static readonly string[] Names = { "D1", "D2", "D3", "D4", "D5" };
        static readonly float[] HomeXs = { 0.7f, 1.6f, 2.5f, 3.4f, 4.3f };
        const float HomeY = 1f;
        static readonly float[] Heights = { 2f, 1f, 3f, 1f, 2.4f };
        static readonly float[] Reaches = { 0f, 0f, 0f, 3f, 3.8f };

        readonly List<string> events = new List<string>();
        readonly FlightSettings settings;

        // 패턴 (나쁜 예 모드에서는 그림자)
        readonly Drone[] drones;
        readonly Squad root;
        readonly Squad squadB;
        readonly Squad support;

        // 나쁜 예
        readonly NaiveCommander naive;
        readonly Drone[] naiveDrones;
        bool lastCountWrong;
        bool reportedCount;
        readonly bool[] lastMissed = new bool[5];
        readonly bool[] reportedMissed = new bool[5];

        public Target(Values v, bool isNaive)
        {
            settings = new FlightSettings { FlySpeed = v.Float("flySpeed"), PatrolDistance = v.Float("patrolDistance") };
            drones = MakeDrones(settings);
            root = new Squad("본대");
            squadB = new Squad("B");
            support = new Squad("C");
            root.Add(drones[0]);
            root.Add(squadB);
            squadB.Add(drones[1]);
            squadB.Add(drones[2]);
            support.Add(drones[3]);
            support.Add(drones[4]);

            if (isNaive)
            {
                naiveDrones = MakeDrones(settings);
                naive = new NaiveCommander();
                naive.root.drones.Add(naiveDrones[0]);
                naive.root.squads.Add(naive.squadB);
                naive.squadB.drones.Add(naiveDrones[1]);
                naive.squadB.drones.Add(naiveDrones[2]);
                naive.support.drones.Add(naiveDrones[3]);
                naive.support.drones.Add(naiveDrones[4]);
                foreach (Drone d in naiveDrones)
                {
                    d.OrderReceived += (unit, order) => events.Add($"{OrderName(order)} → {unit.Name} ({Where(d)})");
                    d.Arrived += drone => events.Add(ArrivedLine(drone));
                }
                return; // 그림자 코어의 사건은 적지 않는다
            }
            root.OrderReceived += (unit, order) => events.Add($"{OrderName(order)} → {Path(unit)}");
            root.Arrived += drone => events.Add(ArrivedLine(drone));
            squadB.Joined += (squad, unit) => events.Add($"합류: {unit.Name} → {squad.Name} 의 하위 편대 (Joined)");
            squadB.JoinRejected += (squad, unit, reason) => events.Add($"합류 거절: {reason} (JoinRejected)");
        }

        static Drone[] MakeDrones(FlightSettings s)
        {
            var list = new Drone[5];
            for (int i = 0; i < 5; i++) list[i] = new Drone(Names[i], HomeXs[i], HomeY, Heights[i], Reaches[i], i >= 3, s);
            return list;
        }

        static string OrderName(Order o) => o == Order.Sortie ? "출격" : "귀환";

        static string ArrivedLine(Drone d) => d.Status == DroneStatus.Patrolling ? $"{d.Name} 정찰 지점 도착" : $"{d.Name} 기지 도착";

        /// <summary>본대에서 이 유닛까지의 길 (본대/B/C/D4)</summary>
        static string Path(IUnit unit)
        {
            string path = unit.Name;
            for (Squad s = unit.Parent; s != null; s = s.Parent) path = $"{s.Name}/{path}";
            return path;
        }

        /// <summary>나쁜 예: 이 드론이 들어 있는 목록 (root.squads[0].drones)</summary>
        string Where(Drone d) => Find(naive.root, d, "root") ?? "본대 밖";

        static string Find(NaiveSquad s, Drone d, string path)
        {
            if (s.drones.Contains(d)) return $"{path}.drones";
            for (int i = 0; i < s.squads.Count; i++)
            {
                string found = Find(s.squads[i], d, $"{path}.squads[{i}]");
                if (found != null) return found;
            }
            return null;
        }

        /// <summary>코어에 입력을 넣는다 (나쁜 예 모드에서는 그림자)</summary>
        bool CoreInput(string name)
        {
            switch (name)
            {
                case "sortie": root.Sortie(); return false;
                case "recall": root.Recall(); return false;
                default: return squadB.Add(support);
            }
        }

        public void Input(string name)
        {
            bool joined = CoreInput(name);
            if (naive == null)
            {
                if (joined) events.Add($"편대 드론 수 {root.CountDrones()} (CountDrones)");
                return;
            }
            switch (name)
            {
                case "sortie":
                    events.Add("SortieAll(): root.drones, root.squads[i].drones");
                    naive.SortieAll();
                    break;
                case "recall":
                    events.Add("RecallAll(): root.drones, root.squads[i].drones");
                    naive.RecallAll();
                    break;
                default:
                    if (naive.supportJoined)
                    {
                        naive.JoinSupport();
                        events.Add("합류 무시 (supportJoined 가 이미 true)");
                    }
                    else
                    {
                        naive.JoinSupport();
                        events.Add("합류: C 를 B.squads 에 넣음 (supportJoined = true)");
                        events.Add($"편대 드론 수 {naive.CountDrones()} (CountDrones)");
                    }
                    break;
            }
            Check();
        }

        static bool IsOut(Drone d) => d.Status == DroneStatus.Outbound || d.Status == DroneStatus.Patrolling;

        /// <summary>나쁜 예를 그림자 코어와 비교해 버그를 적는다</summary>
        void Check()
        {
            int shown = naive.CountDrones();
            int real = root.CountDrones();
            bool wrong = shown != real;
            if (wrong && !lastCountWrong)
            {
                if (!reportedCount)
                {
                    reportedCount = true;
                    events.Add($"!수 오산: 화면 {shown}, 실제 {real} (CountDrones 가 B.squads 안 하위 편대의 드론을 세지 않는다)");
                }
                else events.Add($"드론 수 또 틀림: 화면 {shown}, 실제 {real}");
            }
            lastCountWrong = wrong;

            var fresh = new List<string>();
            var again = new List<string>();
            for (int i = 0; i < 5; i++)
            {
                bool missed = !IsOut(drones[i]) && IsOut(naiveDrones[i]);
                if (missed && !lastMissed[i])
                {
                    if (!reportedMissed[i])
                    {
                        reportedMissed[i] = true;
                        fresh.Add(Names[i]);
                    }
                    else again.Add(Names[i]);
                }
                lastMissed[i] = missed;
            }
            if (fresh.Count > 0) events.Add($"!귀환 누락: {string.Join(", ", fresh)} 가 귀환 명령을 못 받았다 (하위 편대의 드론. RecallAll 은 두 단계까지만 돈다)");
            if (again.Count > 0) events.Add($"{string.Join(", ", again)} 또 귀환 명령을 못 받았다");
        }

        public void Tick(float dt)
        {
            root.Tick(dt);
            if (naive == null) return;
            foreach (Drone d in naiveDrones) d.Tick(dt); // 나쁜 예의 드론은 각자 자기 Update 에서 난다
        }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        public string Snapshot()
        {
            Drone[] ds = naive == null ? drones : naiveDrones;
            string pos = "";
            for (int i = 0; i < 5; i++) pos += $" x{i + 1}={Fmt.F(ds[i].X)} y{i + 1}={Fmt.F(ds[i].Y)}";
            if (naive == null) return $"count={root.CountDrones()} docked={root.CountDocked()}{pos}";
            int docked = 0;
            foreach (Drone d in naiveDrones) docked += d.CountDocked();
            return $"count={naive.CountDrones()} real={root.CountDrones()} docked={docked}{pos}";
        }
    }
}
