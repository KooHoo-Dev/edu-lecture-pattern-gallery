// 탐사 구역의 드론 무리: 종류 사전(종류마다 객체 하나)과 드론 목록을 들고 피해·스폰·밸런스 수정 입력을 처리한다.
// 일어난 일은 C# event 로 알린다. 파괴된 드론은 목록에서 뺀다. 시간이 흐르는 규칙이 없어 Tick 이 없다. UnityEngine 을 쓰지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.FlyweightDroneTypes
{
    public sealed class Squad
    {
        /// <summary>피해 입력 한 번에 깎는 HP</summary>
        public int Damage = 1;
        /// <summary>밸런스 수정 한 번에 올리는 최대 HP</summary>
        public int PatchHp = 2;
        /// <summary>구역의 자리 수. 가득 차면 스폰을 받지 않는다</summary>
        public int MaxDrones = 9;
        /// <summary>자리 사이 거리 (X 단위)</summary>
        public float Spacing = 1.75f;

        readonly Dictionary<string, DroneType> types = new Dictionary<string, DroneType>();
        readonly List<Drone> drones = new List<Drone>();
        /// <summary>종류마다 지금까지 만든 수 (이름 번호). DroneType 은 Equals 를 바꾸지 않아 참조로 센다</summary>
        readonly Dictionary<DroneType, int> made = new Dictionary<DroneType, int>();

        /// <summary>종류 이름 → 종류 객체. 종류마다 하나뿐이다</summary>
        public IReadOnlyDictionary<string, DroneType> Types => types;
        public IReadOnlyList<Drone> Drones => drones;

        /// <summary>드론이 나왔다 (드론)</summary>
        public event Action<Drone> Spawned;
        /// <summary>자리가 가득 차 스폰을 받지 않았다 (자리 수)</summary>
        public event Action<int> SpawnRejected;
        /// <summary>드론이 피해를 입었다 (드론, 피해량)</summary>
        public event Action<Drone, int> Damaged;
        /// <summary>HP 가 0 이 되어 목록에서 뺐다 (드론)</summary>
        public event Action<Drone> Destroyed;
        /// <summary>그 종류의 드론이 없어 피해를 주지 못했다 (종류)</summary>
        public event Action<DroneType> NoTarget;
        /// <summary>밸런스 수정으로 종류의 최대 HP 가 바뀌었다 (종류, 이전 최대 HP)</summary>
        public event Action<DroneType, int> TypePatched;

        public Squad(params DroneType[] kinds)
        {
            foreach (DroneType kind in kinds) types.Add(kind.Name, kind); // [1] 종류마다 객체 하나를 사전에 둔다. 같은 이름을 두 번 넣으면 Add 가 던진다
        }

        /// <summary>이름으로 종류 객체를 꺼낸다. 없는 이름이면 KeyNotFoundException</summary>
        public DroneType TypeOf(string name) => types[name];

        /// <summary>이 종류 객체를 가리키는 드론 수</summary>
        public int CountOf(DroneType type)
        {
            int n = 0;
            foreach (Drone d in drones) if (d.Type == type) n++;
            return n;
        }

        /// <summary>드론들이 함께 쓰는 종류 객체 수 (참조로 센다). 드론이 몇 대든 종류 수를 넘지 않는다</summary>
        public int SharedTypeCount()
        {
            var seen = new HashSet<DroneType>();
            foreach (Drone d in drones) seen.Add(d.Type);
            return seen.Count;
        }

        /// <summary>그 종류 드론을 빈 자리에 하나 만든다. 자리가 가득 차 받지 않으면 null</summary>
        public Drone Spawn(DroneType type)
        {
            if (!types.TryGetValue(type.Name, out DroneType known) || known != type)
                throw new ArgumentException($"사전에 없는 종류 객체다: {type.Name}. 종류 객체는 Squad 의 사전에 넣은 것을 쓴다");
            if (drones.Count >= MaxDrones)
            {
                SpawnRejected?.Invoke(MaxDrones);
                return null;
            }
            made.TryGetValue(type, out int n);
            made[type] = ++n;
            var drone = new Drone(type, type.Code + n, FreeX()); // [2] 새 종류 객체를 만들지 않고 사전의 그 객체를 넘긴다
            drones.Add(drone);
            Spawned?.Invoke(drone);
            return drone;
        }

        /// <summary>그 종류의 첫 드론(목록에 있는 것은 모두 살아 있다)에 피해를 준다. HP 가 0 이 되면 목록에서 뺀다</summary>
        public void HitFirst(DroneType type)
        {
            Drone target = FirstOf(type);
            if (target == null)
            {
                NoTarget?.Invoke(type);
                return;
            }
            target.TakeDamage(Damage); // [3] 맞은 드론 하나의 HP 만 바뀐다
            Damaged?.Invoke(target, Damage);
            if (!target.IsDestroyed) return;
            drones.Remove(target);
            Destroyed?.Invoke(target);
        }

        /// <summary>밸런스 수정: 그 종류의 최대 HP 를 PatchHp 만큼 올린다. 드론의 지금 HP 는 그대로다</summary>
        public void Patch(DroneType type)
        {
            int previous = type.MaxHp;
            type.RaiseMaxHp(PatchHp); // [4] 종류 객체 하나만 고친다. 이 종류의 드론은 모두 이 객체를 가리켜 바로 반영된다
            TypePatched?.Invoke(type, previous);
        }

        Drone FirstOf(DroneType type)
        {
            foreach (Drone d in drones) if (d.Type == type) return d;
            return null;
        }

        /// <summary>왼쪽부터 비어 있는 첫 자리. 파괴된 드론의 자리는 다시 쓴다</summary>
        float FreeX()
        {
            for (int slot = 0; ; slot++)
            {
                float x = slot * Spacing;
                bool taken = false;
                foreach (Drone d in drones)
                {
                    if (d.X != x) continue;
                    taken = true;
                    break;
                }
                if (!taken) return x;
            }
        }
    }
}
