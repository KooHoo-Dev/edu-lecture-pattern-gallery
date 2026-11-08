// 드론 종류 데이터 (플라이웨이트, 내재 상태): 이름, 최대 HP, 속도, 색. 종류마다 객체 하나를 그 종류의 모든 드론이 함께 쓴다.
// 드론마다 다른 값(지금 HP, 위치)은 여기 두지 않는다. UnityEngine 을 쓰지 않는다 (색은 "#RRGGBB" 글로 든다).
using System;

namespace PatternGallery.FlyweightDroneTypes
{
    public sealed class DroneType
    {
        /// <summary>종류 이름 (정찰형, 중장갑). Squad 의 종류 사전 열쇠</summary>
        public string Name { get; }
        /// <summary>드론 이름의 머리 글자 (S1, H1 의 S, H)</summary>
        public string Code { get; }
        /// <summary>최대 HP. 밸런스 수정(RaiseMaxHp) 밖에서는 바뀌지 않는다</summary>
        public int MaxHp { get; private set; }
        public float Speed { get; }
        public string ColorHex { get; }

        public DroneType(string name, string code, int maxHp, float speed, string colorHex)
        {
            Name = name;
            Code = code;
            MaxHp = Math.Max(1, maxHp);
            Speed = speed;
            ColorHex = colorHex;
        }

        /// <summary>
        /// 밸런스 수정: 최대 HP 를 올린다. 새 종류 객체로 바꾸지 않고 이 객체 하나를 고치므로,
        /// 이 객체를 가리키는 드론 모두에 바로 반영된다. 드론은 부르지 않는다 (Squad.Patch 만 부른다).
        /// 고치는 것은 ToDroneType() 이 Play 때 만든 런타임 객체라 에셋은 그대로다.
        /// 내재 상태는 원래 읽기 전용이고, 이 메서드만 종류 전체에 일부러 반영하는 수정이다.
        /// </summary>
        public void RaiseMaxHp(int amount)
        {
            if (amount <= 0) return;
            MaxHp += amount; // [4] 공유 객체 하나를 고친다
        }
    }
}
