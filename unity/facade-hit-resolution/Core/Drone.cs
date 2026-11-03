// 잔해 드론 한 대(자기 HP 만 고친다)와 하린 앞에 선 드론 셋(DroneField). 명중 처리의 '적용' 하위 시스템이다. UnityEngine 을 쓰지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.FacadeHitResolution
{
    public sealed class Drone
    {
        public string Name { get; }
        public int MaxHp { get; }
        public int Hp { get; private set; }
        /// <summary>방어력. 창구가 피해 계산(DamageCalculator)에 넘긴다. 중장갑만 0 보다 크다</summary>
        public int Armor { get; set; }
        /// <summary>파괴했을 때 주는 크레딧</summary>
        public int Reward { get; }
        /// <summary>파괴 처리(Wreckage)가 화면에서 뺐는지</summary>
        public bool IsDestroyed { get; private set; }

        /// <summary>HP 가 바뀔 때 (드론, 전, 후)</summary>
        public event Action<Drone, int, int> HpChanged;

        public Drone(string name, int maxHp, int armor, int reward)
        {
            Name = name;
            MaxHp = maxHp;
            Hp = maxHp;
            Armor = armor;
            Reward = reward;
        }

        /// <summary>계산이 끝난 최종 피해를 HP 에 적용한다. 방어력은 여기서 빼지 않는다 (계산은 DamageCalculator 의 일)</summary>
        public void TakeDamage(int amount)
        {
            int before = Hp;
            Hp = Math.Max(0, Hp - amount); // [3]
            HpChanged?.Invoke(this, before, Hp);
        }

        /// <summary>파괴 처리(Wreckage.Destroy)가 부른다</summary>
        public void MarkDestroyed() => IsDestroyed = true;
    }

    /// <summary>하린 앞의 드론 셋. 목록 앞쪽이 하린에게 가깝다. 함정은 D1 발밑에 깔려 있다</summary>
    public sealed class DroneField
    {
        public const int NormalHp = 10;
        public const int NormalReward = 10;
        public const int HeavyReward = 20;

        readonly List<Drone> drones;

        public IReadOnlyList<Drone> All => drones;
        /// <summary>함정이 깔린 자리에 선 드론의 번호 (0 = D1)</summary>
        public int TrapSlot { get; }
        /// <summary>중장갑 드론의 번호 (2 = D3). 정비 드론의 전기 충격이 노린다</summary>
        public int HeavySlot { get; }

        public DroneField(List<Drone> drones, int trapSlot, int heavySlot)
        {
            this.drones = drones;
            TrapSlot = trapSlot;
            HeavySlot = heavySlot;
        }

        /// <summary>D1, D2 는 보통, D3 은 중장갑(방어력 heavyArmor). HP 는 모두 10</summary>
        public static DroneField CreateDefault(int heavyArmor) => new DroneField(new List<Drone>
        {
            new Drone("D1", NormalHp, 0, NormalReward),
            new Drone("D2", NormalHp, 0, NormalReward),
            new Drone("D3", NormalHp, heavyArmor, HeavyReward),
        }, 0, 2);

        public Drone Heavy => drones[HeavySlot];

        /// <summary>하린에게 가장 가까운, 파괴되지 않은 드론. 없으면 null</summary>
        public Drone FrontAlive()
        {
            foreach (Drone d in drones)
                if (!d.IsDestroyed) return d;
            return null;
        }

        /// <summary>함정 위에 선 드론. 파괴되어 빠졌으면 null</summary>
        public Drone OnTrap()
        {
            Drone d = drones[TrapSlot];
            return d.IsDestroyed ? null : d;
        }

        public int IndexOf(Drone d) => drones.IndexOf(d);
    }
}
