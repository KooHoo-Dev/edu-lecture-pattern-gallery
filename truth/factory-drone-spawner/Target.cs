// 하네스 어댑터: 팩토리 메서드 코어(WaveDirector, DroneSpawner 자식들)와 나쁜 예(NaiveWaveSpawner)를 시나리오 입력으로 돌리고 사건과 상태를 글로 꺼낸다.
// 두 모드 모두 출구, 레이더, 드론, 포탑의 이벤트를 불린 순서대로 적는다 (나쁜 예도 출구와 레이더는 코어의 것을 쓴다).
// 나쁜 예 옆에는 같은 입력을 받는 코어(그림자)를 두고, 그 섞인 순서가 고른 종류를 '있어야 할 종류' 로 삼아 비교한다 (나쁜 예 코드에는 검사 코드를 넣지 않는다).
// 웹 sim(src/specimens/factory-drone-spawner/sim.ts)과 같은 글을 만든다.
using System.Collections.Generic;
using System.Linq;
using PatternGallery.FactoryDroneSpawner.Naive;
using PatternGallery.Truth;

namespace PatternGallery.FactoryDroneSpawner
{
    [SimTarget("factory-drone-spawner")]
    public sealed class Target : ISimTarget
    {
        readonly List<string> events = new List<string>();

        // 화면에 보이는 세계 (두 모드 공통)
        readonly Exit exit = new Exit();
        readonly Radar radar = new Radar();
        readonly TurretBattery battery = new TurretBattery();

        // 패턴 코어. 나쁜 예 모드에서는 그림자 (자기 출구와 레이더를 따로 쓰고 사건은 적지 않는다)
        readonly ScoutSpawner scout;
        readonly HeavySpawner heavy;
        readonly ShieldSpawner shield;
        readonly WaveDirector director;
        readonly Exit shadowExit;
        readonly TurretBattery shadowBattery;

        // 나쁜 예
        readonly NaiveWaveSpawner naive;
        bool lastMissing;

        public Target(Values v, bool isNaive)
        {
            int heavyHp = v.Int("heavyHp");
            int shieldHp = v.Int("shieldHp");
            battery.VolleyDamage = v.Int("volleyDamage");

            exit.Placed += OnPlaced;
            radar.Registered += (d, n) => events.Add($"레이더 등록 {d.Name} → 살아 있는 드론 {n}");
            radar.Unregistered += (d, n) => events.Add($"레이더 해제 {d.Name} → 살아 있는 드론 {n}");
            radar.WaveCleared += OnWaveCleared;
            battery.Fired += (count, damage) => events.Add(count > 0 ? $"일제 사격: {count}대에 피해 {damage}" : "일제 사격: 출구 앞에 드론이 없다");

            Exit coreExit = isNaive ? new Exit() : exit;
            Radar coreRadar = isNaive ? new Radar() : radar;
            scout = new ScoutSpawner(coreExit, coreRadar);
            heavy = new HeavySpawner(coreExit, coreRadar) { Hp = heavyHp };
            shield = new ShieldSpawner(coreExit, coreRadar) { Hp = shieldHp };
            director = new WaveDirector(new DroneSpawner[] { scout, heavy, shield });

            if (isNaive)
            {
                shadowExit = coreExit;
                shadowBattery = new TurretBattery { VolleyDamage = battery.VolleyDamage };
                naive = new NaiveWaveSpawner(exit, radar) { heavyHp = heavyHp, shieldHp = shieldHp };
                naive.Spawned += d => events.Add($"출격 알림: {d.Name} HP {d.Hp}");
                return;
            }
            director.Picked += (i, s) => events.Add($"섞인 순서 {i + 1}번째: {i} % {director.Spawners.Count} = {i % director.Spawners.Count} → {ClassOf(s)}");
            foreach (DroneSpawner s in director.Spawners)
            {
                string cls = ClassOf(s);
                s.Spawned += d => events.Add($"출격 알림: {d.Name} HP {d.Hp} ({cls})");
            }
        }

        string ClassOf(DroneSpawner s) => s == scout ? "ScoutSpawner" : s == heavy ? "HeavySpawner" : "ShieldSpawner";

        static string TypeOf(Drone d) => d is ScoutDrone ? "scout" : d is HeavyDrone ? "heavy" : "shield";

        static string Names(IEnumerable<Drone> drones) => string.Join(", ", drones.Select(d => d.Name));

        void OnPlaced(Drone d)
        {
            events.Add($"{d.Name} → 출구 앞 자리 {d.Slot}");
            d.Damaged += (x, amount) => events.Add($"{x.Name} 피해 {amount} → HP {x.Hp}");
            d.Destroyed += x => events.Add($"{x.Name} 파괴");
        }

        void OnWaveCleared()
        {
            events.Add("웨이브 끝");
            if (naive != null && exit.Drones.Count > 0)
                events.Add($"!레이더 누락: 웨이브 끝을 알렸는데 출구 앞에 아직 있다: {Names(exit.Drones)}");
        }

        /// <summary>코어에 입력을 넣는다 (나쁜 예 모드에서는 그림자)</summary>
        void CoreInput(string name)
        {
            switch (name)
            {
                case "scout": scout.Spawn(); break;
                case "heavy": heavy.Spawn(); break;
                case "shield": shield.Spawn(); break;
                case "next": director.SpawnNext(); break;
                case "volley":
                    if (naive == null) battery.Volley(exit);
                    else shadowBattery.Volley(shadowExit);
                    break;
            }
        }

        public void Input(string name)
        {
            if (naive == null)
            {
                CoreInput(name);
                return;
            }

            DroneSpawner expected = name == "next" ? director.PeekNext() : null;
            int order = naive.count;
            CoreInput(name);

            int at = events.Count;
            Drone made = null;
            switch (name)
            {
                case "scout":
                case "heavy":
                case "shield":
                    made = naive.SpawnDrone(name);
                    break;
                case "next":
                    made = naive.SpawnNext();
                    break;
                case "volley":
                    battery.Volley(exit);
                    break;
            }

            if (name == "next" && made != null)
            {
                events.Insert(at, $"섞인 순서 {order + 1}번째 (count {order}) → SpawnDrone(\"{TypeOf(made)}\")");
                if (expected == shield && !(made is ShieldDrone))
                    events.Add($"!종류 누락: {order + 1}번째는 방패 차례인데 {made.Kind}이 나왔다 (types[count % 2] 는 0, 1 만 고른다)");
            }
            FindMissing();
        }

        /// <summary>출구 앞에 있는데 레이더가 모르는 드론. 생기는 순간 한 번 적는다</summary>
        void FindMissing()
        {
            List<Drone> missing = exit.Drones.Where(d => !radar.Tracks(d)).ToList();
            bool on = missing.Count > 0;
            if (on && !lastMissing)
                events.Add($"!레이더 누락: 레이더에 없는 드론 {Names(missing)} (레이더 {radar.AliveCount}, 출구 앞 {exit.Drones.Count})");
            lastMissing = on;
        }

        public void Tick(float dt) { }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        public string Snapshot()
        {
            string list = exit.Drones.Count == 0 ? "-" : string.Join(",", exit.Drones.Select(d => $"{d.Kind}{d.Number}:{d.Hp}"));
            int count = naive == null ? director.Count : naive.count;
            return $"radar={radar.AliveCount} field={exit.Drones.Count} cleared={B(radar.IsCleared)} count={count} drones={list}";
        }

        static int B(bool b) => b ? 1 : 0;
    }
}
