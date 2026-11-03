// 정찰 드론(프로토타입): 값 필드(Name, Hp, Speed)와 참조 필드(Modules)를 들고, Clone() 으로 자기와 같은 드론을 만든다. UnityEngine 을 쓰지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.PrototypeDroneClone
{
    public sealed class ScoutDrone
    {
        /// <summary>값처럼 쓰는 필드들. string 은 참조 형식이지만 바꿀 수 없어(immutable) 함께 가리켜도 안전하다</summary>
        public string Name { get; set; }
        public int MaxHp { get; private set; }
        public int Hp { get; private set; }
        public float Speed { get; private set; }

        /// <summary>참조 필드: 목록 객체는 힙에 하나 있고, 이 필드는 그 주소만 든다</summary>
        public List<string> Modules { get; private set; }

        public ScoutDrone(string name, int maxHp, float speed, IEnumerable<string> modules) // [1] 견본은 한 번만 다 설정해 둔다
        {
            Name = name;
            MaxHp = Math.Max(1, maxHp);
            Hp = MaxHp;
            Speed = speed;
            Modules = new List<string>(modules); // [1]
        }

        /// <summary>갤러리와 하네스가 함께 쓰는 기본 견본: 정찰 드론, HP 100, 속도 4, 카메라 모듈</summary>
        public static ScoutDrone CreateDefaultTemplate() => new ScoutDrone("정찰 드론", 100, 4f, new[] { "카메라" });

        /// <summary>자기와 같은 드론을 하나 더 만든다. 값 필드는 통째로 복사하고, 참조 필드는 깊은 복사가 필요한 것만 새로 만든다</summary>
        public ScoutDrone Clone()
        {
            var copy = (ScoutDrone)MemberwiseClone(); // [2] 값 필드(Name, MaxHp, Hp, Speed)를 한 번에 복사한다. Modules 는 아직 주소만 복사된 상태
            copy.Modules = new List<string>(Modules); // [3] 참조 필드는 새 목록으로 만든다. 이제 복제본에 단 모듈은 견본에 생기지 않는다
            return copy;
        }

        public void TakeDamage(int amount)
        {
            if (amount <= 0) return;
            Hp = Math.Max(0, Hp - amount); // [4] 값 필드라 이 드론의 Hp 만 줄어든다
        }

        public void AddSpeed(float amount) => Speed += amount;
    }
}
