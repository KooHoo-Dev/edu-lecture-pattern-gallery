// 잔해 드론 (스포너가 만드는 제품): HP, 피해, 파괴를 알리는 이벤트. 종류는 자식 클래스가 정한다. UnityEngine 을 쓰지 않는다.
using System;

namespace PatternGallery.FactoryDroneSpawner
{
    public abstract class Drone
    {
        /// <summary>화면과 기록에 쓰는 종류 이름 (정찰, 중장갑, 방패)</summary>
        public string Kind { get; }
        public int MaxHp { get; }
        public int Hp { get; private set; }
        /// <summary>출구가 붙인 번호 (#1, #2 …). 배치 전에는 0</summary>
        public int Number { get; internal set; }
        /// <summary>출구 앞 자리. 0 이 출구에 가장 가깝다. 배치 전에는 -1</summary>
        public int Slot { get; internal set; } = -1;
        public bool IsAlive => Hp > 0;
        public string Name => Kind + " #" + Number;

        /// <summary>피해를 입었다 (드론, 피해량)</summary>
        public event Action<Drone, int> Damaged;
        /// <summary>HP 가 0 이 되는 순간 한 번</summary>
        public event Action<Drone> Destroyed;

        protected Drone(string kind, int hp)
        {
            Kind = kind;
            MaxHp = Math.Max(1, hp);
            Hp = MaxHp;
        }

        public void TakeDamage(int amount)
        {
            if (!IsAlive || amount <= 0) return;
            Hp = Math.Max(0, Hp - amount);
            Damaged?.Invoke(this, amount);
            if (Hp == 0) Destroyed?.Invoke(this);
        }
    }

    public sealed class ScoutDrone : Drone
    {
        public const int DefaultHp = 1;
        public ScoutDrone() : base("정찰", DefaultHp) { }
    }

    public sealed class HeavyDrone : Drone
    {
        public HeavyDrone(int hp) : base("중장갑", hp) { }
    }

    /// <summary>나중에 더한 종류</summary>
    public sealed class ShieldDrone : Drone
    {
        public ShieldDrone(int hp) : base("방패", hp) { }
    }
}
