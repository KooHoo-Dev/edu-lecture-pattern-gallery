// 드론 한 대 (외재 상태): 자기 종류 데이터의 참조와, 드론마다 다른 지금 HP 와 위치만 든다.
// 최대 HP, 속도, 색은 Type 에서 읽는다. UnityEngine 을 쓰지 않는다.
using System;

namespace PatternGallery.FlyweightDroneTypes
{
    public sealed class Drone
    {
        public DroneType Type { get; } // [2] 공유하는 종류 데이터. 드론마다 복사하지 않고 가리키기만 한다
        public string Name { get; }
        /// <summary>지금 HP. 이 드론만의 값이다</summary>
        public int Hp { get; private set; }
        /// <summary>구역 안 위치 (왼쪽 끝에서 오른쪽으로). 이 드론만의 값이다</summary>
        public float X { get; }
        public bool IsDestroyed => Hp <= 0;

        public Drone(DroneType type, string name, float x)
        {
            Type = type;
            Name = name;
            X = x;
            Hp = type.MaxHp; // [2] 지금 HP 는 드론이 든다. 나올 때 종류의 최대 HP 로 시작한다
        }

        public void TakeDamage(int amount)
        {
            if (amount <= 0 || IsDestroyed) return;
            Hp = Math.Max(0, Hp - amount); // [3] 이 드론의 HP 만 준다. 종류 데이터는 건드리지 않는다
        }
    }
}
