// 하네스 어댑터: 추상 팩토리 코어(ZoneDirector, 구역 공장들)와 나쁜 예(NaiveZoneSpawner)를 시나리오 입력으로 돌리고 사건과 상태를 글로 꺼낸다.
// 입력 이름(forest, lava, ice) → 공장 객체는 여기 한 곳(factories)에서 고른다 (Unity 에서는 ZoneDirectorInput 이 같은 일을 한다).
// 나쁜 예는 이벤트가 없어 입력마다 목록을 비교해 적고, 드론이 쏜 투사체가 그 드론 세트의 것인지는 같은 공장 표로 확인한다 (나쁜 예 코드에는 검사 코드를 넣지 않는다).
// 웹 sim(src/specimens/abstract-factory-zone-themes/sim.ts)과 같은 글을 만든다.
using System.Collections.Generic;
using System.Linq;
using PatternGallery.AbstractFactoryZoneThemes.Naive;
using PatternGallery.Truth;

namespace PatternGallery.AbstractFactoryZoneThemes
{
    [SimTarget("abstract-factory-zone-themes")]
    public sealed class Target : ISimTarget
    {
        /// <summary>조립하는 곳: 입력 이름 → 공장. 공장에는 상태가 없어 한 번 만들어 계속 쓴다</summary>
        readonly Dictionary<string, IZoneFactory> factories = new Dictionary<string, IZoneFactory>
        {
            { "forest", new ForestFactory() },
            { "lava", new LavaFactory() },
            { "ice", new IceFactory() },
        };

        readonly List<string> events = new List<string>();
        readonly ZoneDirector director;
        readonly NaiveZoneSpawner naive;
        /// <summary>나쁜 예: 드론마다 마지막 사격이 자기 세트와 어긋났는지 (켜지는 순간 한 번만 ✖ 를 적는다)</summary>
        readonly Dictionary<Drone, bool> mismatched = new Dictionary<Drone, bool>();

        public Target(Values v, bool isNaive)
        {
            string start = v.Str("startZone");
            if (isNaive)
            {
                naive = new NaiveZoneSpawner(start) { maxDrones = v.Int("maxDrones"), projectileSpeed = v.Float("projectileSpeed") };
                events.Add($"시작 zone = \"{naive.zone}\" · {naive.ground.Name}");
                return;
            }
            director = new ZoneDirector(factories[start], new ZoneSettings
            {
                MaxDrones = v.Int("maxDrones"),
                ProjectileSpeed = v.Float("projectileSpeed"),
            });
            events.Add($"시작 구역 {director.Factory.Theme} · {ClassOf(director.Factory)} · {director.Ground.Name}");
            director.ZoneEntered += (f, g) => events.Add($"구역 → {f.Theme} · {ClassOf(f)} · {g.Name}");
            director.DroneSpawned += d => events.Add($"{d.Tag} → 자리 {d.Slot} ({ClassOf(d.Factory)})");
            director.SpawnRejected += n => events.Add($"출격 거절: 자리 {n}개가 모두 찼다");
            director.ProjectileFired += (d, p) => events.Add($"{d.Tag} → {p.Name} ({ClassOf(d.Factory)}.CreateProjectile)");
            director.ProjectileVanished += p => events.Add($"{p.Name} 사라짐 (하린 앞)");
        }

        static string ClassOf(IZoneFactory f) => f.GetType().Name;

        public void Input(string name)
        {
            if (director != null)
            {
                switch (name)
                {
                    case "spawn": director.Spawn(); break;
                    case "fire": director.FireAll(); break;
                    default: director.Enter(factories[name]); break;
                }
                return;
            }

            switch (name)
            {
                case "spawn":
                    Drone made = naive.SpawnDrone();
                    if (made == null) events.Add($"출격 거절: 자리 {naive.maxDrones}개가 모두 찼다");
                    else events.Add($"{made.Tag} → 자리 {made.Slot} (SpawnDrone: zone \"{naive.zone}\")");
                    break;
                case "fire":
                    NaiveFire();
                    break;
                default:
                    naive.EnterZone(name);
                    events.Add($"zone = \"{naive.zone}\" · {naive.ground.Name}");
                    break;
            }
        }

        /// <summary>나쁜 예의 사격: 드론 순서대로 한 발씩 더해진 투사체를 드론과 짝지어 적고, 그 드론 세트의 투사체와 비교한다</summary>
        void NaiveFire()
        {
            int before = naive.projectiles.Count;
            naive.FireAll();
            for (int i = 0; i < naive.drones.Count; i++)
            {
                Drone d = naive.drones[i];
                Projectile p = naive.projectiles[before + i];
                events.Add($"{d.Tag} → {p.Name} (MakeProjectile(\"{naive.zone}\"))");
                bool now = p.Theme != d.Theme;
                bool last = mismatched.TryGetValue(d, out bool was) && was;
                mismatched[d] = now;
                if (!now || last) continue;
                string expected = factories[d.Theme].CreateProjectile().Name;
                // 드론의 세트가 지금 구역과 다르면 '지금 구역을 다시 읽은 것' 이 원인, 같으면 그 구역의 case 가 빠진 것이 원인
                if (d.Theme != naive.zone)
                    events.Add($"!구역 섞임: {d.Tag} · {expected} 대신 {p.Name} (지금 zone \"{naive.zone}\" 로 만들었다)");
                else
                    events.Add($"!분기 누락: {d.Tag} · {expected} 대신 {p.Name} (MakeProjectile 에 case \"{naive.zone}\" 가 없어 default)");
            }
        }

        public void Tick(float dt)
        {
            if (director != null)
            {
                director.Tick(dt);
                return;
            }
            List<Projectile> before = naive.projectiles.ToList();
            naive.Update(dt);
            foreach (Projectile p in before)
                if (!naive.projectiles.Contains(p)) events.Add($"{p.Name} 사라짐 (하린 앞)");
        }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        public string Snapshot()
        {
            string zone = director != null ? director.Factory.Theme : naive.zone;
            IReadOnlyList<Drone> drones = director != null ? director.Drones : naive.drones;
            IReadOnlyList<Projectile> flying = director != null ? director.Projectiles : naive.projectiles;
            string sets = drones.Count == 0 ? "-" : string.Join(",", drones.Select(d => d.Theme));
            string shots = flying.Count == 0 ? "-" : string.Join(",", flying.Select(p => p.Theme));
            string p0 = flying.Count == 0 ? "-" : Fmt.F(flying[0].X);
            return $"zone={zone} drones={drones.Count} sets={sets} flying={shots} p0={p0}";
        }
    }
}
