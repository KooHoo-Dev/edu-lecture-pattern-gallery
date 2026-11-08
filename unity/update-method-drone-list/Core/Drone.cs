// 잔해 드론 하나: 매니저(DroneSwarm)가 매 프레임 부르는 Update 에서 움직이고, 빠질 때와 나뉠 때를 스스로 정한다. UnityEngine 을 쓰지 않는다.
// 목록을 직접 건드리지 않는다. 빠지기는 swarm.Despawn(this) 로 요청만 하고, 새 드론은 swarm.Spawn 에 넘긴다.
namespace PatternGallery.UpdateMethodDroneList
{
    public enum DroneKind
    {
        Normal,
        /// <summary>태어나고 SplitDelay 초 뒤 자기 Update 안에서 SplitCount 대로 나뉜다</summary>
        Splitter,
    }

    public enum DespawnReason
    {
        /// <summary>HP 가 0 이 됐다 (EMP)</summary>
        Destroyed,
        /// <summary>기지(왼쪽 끝)에 닿았다</summary>
        ReachedBase,
        /// <summary>나뉘고 사라졌다</summary>
        Split,
    }

    public sealed class Drone
    {
        /// <summary>D1, S4 처럼 출발 순서 번호. 나뉜 조각은 부모 이름 뒤에 a, b, c (S4a)</summary>
        public readonly string Name;
        public readonly DroneKind Kind;
        /// <summary>화면에만 쓰는 줄 번호 (규칙에 쓰지 않는다). 드론이 겹쳐 보이지 않게 나란히 세운다</summary>
        public readonly int Lane;
        public float X;
        public int Hp;
        /// <summary>태어난 뒤 Update 로 받은 시간의 합</summary>
        public float Age;
        /// <summary>Update 가 불린 횟수. 같은 프레임에 태어난 드론끼리는 늘 같아야 한다</summary>
        public int Updates;

        /// <summary>목록에서 빠지기를 요청했다. 이번 Tick 이 끝날 때 지워진다</summary>
        public bool IsDead { get; private set; }
        public DespawnReason Reason { get; private set; }

        public Drone(string name, DroneKind kind, float x, int hp, int lane)
        {
            Name = name;
            Kind = kind;
            X = x;
            Hp = hp;
            Lane = lane;
        }

        internal void MarkDead(DespawnReason reason)
        {
            IsDead = true;
            Reason = reason;
        }

        /// <summary>매니저가 매 프레임 한 번 부른다. 드론은 MonoBehaviour 가 아니라 자기 Update 를 엔진이 부르지 않는다</summary>
        public void Update(float dt, DroneSwarm swarm)
        {
            Updates++; // [1]
            Age += dt;
            X -= swarm.Settings.MoveSpeed * dt;
            if (Hp <= 0 || X <= swarm.Settings.BaseX)
            {
                swarm.Despawn(this, Hp <= 0 ? DespawnReason.Destroyed : DespawnReason.ReachedBase); // [2] 표시만 한다. 목록은 그대로다
                return;
            }
            if (Kind == DroneKind.Splitter && Age >= swarm.Settings.SplitDelay) Split(swarm);
        }

        void Split(DroneSwarm swarm)
        {
            for (int k = 0; k < swarm.Settings.SplitCount; k++)
            {
                var piece = new Drone(Name + (char)('a' + k), DroneKind.Normal, X, swarm.Settings.DroneHp, (Lane + k) % swarm.Settings.Lanes);
                swarm.Spawn(piece); // [3] 대기 목록에 넣는다. 이번 프레임에는 Update 되지 않는다
            }
            swarm.Despawn(this, DespawnReason.Split); // [2]
        }
    }
}
