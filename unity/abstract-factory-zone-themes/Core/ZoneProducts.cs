// 구역 세트의 제품들: 바닥, 잔해 드론 변종, 투사체. 테마와 이름을 든 작은 클래스다.
// 드론은 자기를 만든 공장을 기억했다가, 쏠 때 그 공장에 투사체를 만들게 한다. UnityEngine 을 쓰지 않는다.
using System;

namespace PatternGallery.AbstractFactoryZoneThemes
{
    /// <summary>구역 바닥. 화면 색은 Unity 쪽 ZoneArtSet 이 정한다 (코어는 무엇인지만 안다)</summary>
    public sealed class Ground
    {
        /// <summary>세트 이름 (forest, lava, ice). 만든 공장의 Theme 과 같다</summary>
        public string Theme { get; }
        /// <summary>바닥 이름 (이끼 바닥 …)</summary>
        public string Name { get; }

        public Ground(string theme, string name)
        {
            Theme = theme;
            Name = name;
        }
    }

    /// <summary>드론이 쏜 투사체. 왼쪽으로 날아 하린 앞에서 사라진다 (피해는 없다)</summary>
    public sealed class Projectile
    {
        public string Theme { get; }
        /// <summary>투사체 이름 (가시, 화염탄, 얼음 조각)</summary>
        public string Name { get; }
        /// <summary>가로 위치 (m). 쏠 때 정하고 ZoneDirector.Tick 이 줄인다</summary>
        public float X { get; set; }

        public Projectile(string theme, string name)
        {
            Theme = theme;
            Name = name;
        }
    }

    /// <summary>잔해 드론 변종 (덩굴, 화염, 서리). 출구 앞 자리에 서서 쏘기만 한다</summary>
    public sealed class Drone
    {
        public string Theme { get; }
        /// <summary>종류 이름 (덩굴 드론 …)</summary>
        public string Name { get; }
        /// <summary>짧은 이름 (덩굴 …). 화면과 기록에 쓴다</summary>
        public string Label { get; }
        /// <summary>나온 순서 (#1, #2 …). 만든 쪽이 정한다</summary>
        public int Number { get; set; }
        /// <summary>출구 앞 자리. 0 이 출구에 가장 가깝다</summary>
        public int Slot { get; set; } = -1;
        /// <summary>가로 위치 (m). 자리에서 정해진다</summary>
        public float X { get; set; }
        /// <summary>이 드론을 만든 공장. 구역을 옮겨도 바뀌지 않는다</summary>
        public IZoneFactory Factory { get; private set; }

        public string Tag => Label + " #" + Number;

        public Drone(string theme, string name, string label)
        {
            Theme = theme;
            Name = name;
            Label = label;
        }

        /// <summary>만든 공장을 쥐여 준다. ZoneDirector.Spawn 이 만든 직후 한 번만 부른다</summary>
        public void Remember(IZoneFactory maker)
        {
            if (maker == null) throw new ArgumentNullException(nameof(maker));
            if (Factory != null) throw new InvalidOperationException($"{Tag} 는 이미 {Factory.GetType().Name} 를 기억한다");
            Factory = maker;
        }

        /// <summary>한 발 쏜다. 지금 구역이 어디든 자기를 만든 공장의 투사체가 나온다</summary>
        public Projectile Fire()
        {
            if (Factory == null) throw new InvalidOperationException($"{Tag} 를 만든 공장이 없다 (ZoneDirector.Spawn 으로 만든다)");
            Projectile projectile = Factory.CreateProjectile(); // [3] 지금 공장이 아니라 나를 만든 공장
            projectile.X = X - 0.5f;
            return projectile;
        }
    }
}
