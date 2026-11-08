// 하네스 어댑터: 플라이웨이트 코어(Squad, Drone, DroneType)와 나쁜 예(NaiveSquad)를 시나리오 입력으로 돌리고 사건과 상태를 글로 꺼낸다.
// 패턴은 Squad 의 이벤트를 불린 순서대로 적는다. 나쁜 예는 이벤트가 없으므로 입력마다 상태를 비교해 적고,
// 같은 입력을 받는 코어(그림자)의 드론 HP 를 '있어야 할 결과' 로 삼아 버그를 찾는다 (나쁜 예 코드에는 검사 코드를 넣지 않는다).
// 웹 sim(src/specimens/flyweight-drone-types/sim.ts)과 같은 글을 만든다.
using System.Collections.Generic;
using System.Linq;
using PatternGallery.FlyweightDroneTypes.Naive;
using PatternGallery.Truth;

namespace PatternGallery.FlyweightDroneTypes
{
    [SimTarget("flyweight-drone-types")]
    public sealed class Target : ISimTarget
    {
        const int HeavyCount = 2;

        readonly List<string> events = new List<string>();
        readonly Squad squad;
        readonly DroneType scout;
        readonly DroneType heavy;
        readonly NaiveSquad naive;
        /// <summary>HP 공유 ✖ 를 이미 쓴 종류 이름 (같은 종류는 한 번)</summary>
        readonly HashSet<string> sharedBug = new HashSet<string>();

        public Target(Values v, bool isNaive)
        {
            scout = new DroneType("정찰형", "S", 4, 2f, "#5cc8ff");
            heavy = new DroneType("중장갑", "H", 8, 1f, "#ffb547");
            squad = new Squad(scout, heavy) { Damage = v.Int("damage"), PatchHp = v.Int("patchHp") };
            int scouts = v.Int("scoutCount");
            // 중장갑을 먼저 왼쪽 자리에 둔다. 새 정찰형은 왼쪽부터 빈 자리에 나오므로 정찰형 옆(오른쪽)에 생긴다
            for (int i = 0; i < HeavyCount; i++) squad.Spawn(heavy);
            for (int i = 0; i < scouts; i++) squad.Spawn(scout);
            if (isNaive)
            {
                naive = new NaiveSquad
                {
                    damage = v.Int("damage"),
                    patchHp = v.Int("patchHp"),
                    scoutType = new NaiveDroneType { typeName = "정찰형", code = "S", maxHp = 4, speed = 2f, color = "#5cc8ff", currentHp = 4 },
                    heavyType = new NaiveDroneType { typeName = "중장갑", code = "H", maxHp = 8, speed = 1f, color = "#ffb547", currentHp = 8 },
                };
                for (int i = 0; i < HeavyCount; i++) naive.Spawn(naive.heavyType);
                for (int i = 0; i < scouts; i++) naive.Spawn(naive.scoutType);
                return; // 그림자 코어의 사건은 적지 않는다
            }
            squad.Spawned += d => events.Add(SpawnLine(d.Name, d.Type.Name, d.Hp, d.Type.MaxHp));
            squad.SpawnRejected += max => events.Add(Rejected(max));
            squad.Damaged += (d, amount) => events.Add(HitLine(d.Name, amount, d.Hp, d.Type.MaxHp));
            squad.Destroyed += d => events.Add(DestroyedLine(d.Name));
            squad.NoTarget += t => events.Add(NoTargetLine(t.Name));
            squad.TypePatched += (t, previous) => events.Add(PatchLine(t.Name, previous, t.MaxHp, squad.CountOf(t)));
        }

        static string SpawnLine(string name, string type, int hp, int max) => $"{name} 나옴 · {type} · HP {hp}/{max}";
        static string Rejected(int max) => $"나오지 못함: 구역 자리가 가득 찼다 ({max}/{max})";
        static string HitLine(string name, int amount, int hp, int max) => $"{name} 피해 {amount} → HP {hp}/{max}";
        static string DestroyedLine(string name) => $"{name} 파괴 → 목록에서 뺀다";
        static string NoTargetLine(string type) => $"{type} 드론이 없다 (피해 없음)";
        static string PatchLine(string type, int from, int to, int count) => $"밸런스 수정: {type} 최대 HP {from} → {to} ({type} {count}대에 바로 반영, 지금 HP 는 그대로)";

        void CoreInput(string name)
        {
            switch (name)
            {
                case "hitScout": squad.HitFirst(scout); break;
                case "hitHeavy": squad.HitFirst(heavy); break;
                case "spawn": squad.Spawn(scout); break;
                case "patch": squad.Patch(scout); break;
            }
        }

        public void Input(string name)
        {
            CoreInput(name);
            if (naive == null) return;

            switch (name)
            {
                case "hitScout": NaiveHit(naive.scoutType, naive.OnHitScout); break;
                case "hitHeavy": NaiveHit(naive.heavyType, naive.OnHitHeavy); break;
                case "spawn": NaiveSpawn(); break;
                case "patch":
                    int from = naive.scoutType.maxHp;
                    naive.OnPatch();
                    events.Add(PatchLine(naive.scoutType.typeName, from, naive.scoutType.maxHp, naive.drones.Count(d => d.type == naive.scoutType)));
                    break;
            }
        }

        void NaiveHit(NaiveDroneType type, System.Action hit)
        {
            NaiveDrone target = naive.drones.FirstOrDefault(d => d.type == type);
            if (target == null)
            {
                hit();
                events.Add(NoTargetLine(type.typeName));
                return;
            }
            hit();
            events.Add(HitLine(target.droneName, naive.damage, target.Hp, type.maxHp));
            if (!naive.drones.Contains(target)) events.Add(DestroyedLine(target.droneName));
            if (FindBugs(type, target.droneName, null)) return;
            var others = naive.drones.Where(d => d.type == type && d != target).Select(d => d.droneName).ToList();
            if (others.Count == 0) return;
            string fallen = type.currentHp == 0 ? " (맞지 않았는데 HP 0 이다. 다음 한 방에 쓰러진다)" : "";
            events.Add($"같은 종류 {string.Join(" ", others)} 도 HP {type.currentHp}{fallen}");
        }

        void NaiveSpawn()
        {
            int count0 = naive.drones.Count;
            naive.OnSpawn();
            if (naive.drones.Count == count0)
            {
                events.Add(Rejected(naive.maxDrones));
                return;
            }
            NaiveDrone d = naive.drones[naive.drones.Count - 1];
            events.Add(SpawnLine(d.droneName, d.type.typeName, d.Hp, d.type.maxHp));
            // 이 스폰에서 HP 공유가 처음 드러나면 ✖ 하나로 쓰고, 이미 ✖ 를 쓴 종류면 그 결과라 사건 줄로 쓴다
            if (FindBugs(d.type, null, d.droneName)) return;
            if (d.Hp != d.type.maxHp) events.Add($"{d.droneName} 가 다친 채 나왔다: HP {d.Hp} (새 드론은 HP {d.type.maxHp} 로 나와야 한다. 종류 에셋의 currentHp 를 읽었다)");
        }

        /// <summary>그림자 코어에서 같은 이름의 드론 HP. 그림자에 없으면 -1</summary>
        int ExpectedHp(string droneName)
        {
            Drone d = squad.Drones.FirstOrDefault(x => x.Name == droneName);
            return d == null ? -1 : d.Hp;
        }

        /// <summary>
        /// 나쁜 예 드론 가운데 그 종류에서 HP 가 그림자 코어(있어야 할 결과)와 다른 드론을 찾는다.
        /// 종류마다 처음 한 번만 ✖ 로 적는다 (공유 칸 currentHp 는 다시 맞춰지지 않아 버그 상태가 끝나지 않는다). 적었으면 true.
        /// 맞은 드론(hitName)이나 방금 나온 드론(spawnedName)을 주어로 쓴다
        /// </summary>
        bool FindBugs(NaiveDroneType type, string hitName, string spawnedName)
        {
            if (sharedBug.Contains(type.typeName)) return false;
            var wrong = naive.drones.Where(d => d.type == type && ExpectedHp(d.droneName) >= 0 && ExpectedHp(d.droneName) != d.Hp).Select(d => d.droneName).ToList();
            if (wrong.Count == 0) return false;
            sharedBug.Add(type.typeName);
            if (spawnedName != null && wrong.Count == 1 && wrong[0] == spawnedName)
            {
                events.Add($"!HP 공유: {spawnedName} 가 {type.typeName} 에셋의 currentHp 를 함께 읽어 다친 채 나왔다 (HP {type.currentHp}/{type.maxHp}. 새 드론은 꽉 찬 HP 로 나와야 한다)");
                return true;
            }
            string who = hitName != null ? $"{hitName} 을 때렸는데 " : "";
            events.Add($"!HP 공유: {who}{string.Join(" ", wrong)} 도 HP {type.currentHp} ({type.typeName} 종류 데이터의 currentHp 하나를 함께 쓴다)");
            return true;
        }

        public void Tick(float dt) { }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        static string Join(IEnumerable<string> items)
        {
            string s = string.Join(",", items);
            return s.Length > 0 ? s : "-";
        }

        public string Snapshot()
        {
            string core = Join(squad.Drones.Select(d => $"{d.Name}:{d.Hp}"));
            if (naive == null)
                return $"types={squad.SharedTypeCount()} drones={squad.Drones.Count} smax={scout.MaxHp} hmax={heavy.MaxHp} hp={core}";
            int types = naive.drones.Select(d => d.type).Distinct().Count();
            return $"types={types} drones={naive.drones.Count} smax={naive.scoutType.maxHp} hmax={naive.heavyType.maxHp} hp={Join(naive.drones.Select(d => $"{d.droneName}:{d.Hp}"))} scur={naive.scoutType.currentHp} hcur={naive.heavyType.currentHp} ehp={core}";
        }
    }
}
