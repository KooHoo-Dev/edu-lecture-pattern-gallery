// 드론 스포너: Spawn() 은 템플릿 메서드다 (만들기 → 출구에 배치 → 레이더 등록 → 훅 → 알림, 순서 고정).
// 무엇을 만들지는 자식이 반드시 채우는 추상 단계 CreateDrone() 하나로 정한다 (팩토리 메서드). 한 클래스에 두 패턴이 함께 있다.
// OnSpawned 는 기본 본문(빈 본문)이 있어 자식이 필요할 때만 덮는 선택 단계, 곧 훅이다. UnityEngine 을 쓰지 않는다.
using System;

namespace PatternGallery.FactoryDroneSpawner
{
    public abstract class DroneSpawner
    {
        readonly Exit exit;
        readonly Radar radar;

        /// <summary>화면에 쓰는 종류 이름 (정찰, 중장갑, 방패)</summary>
        public string Label { get; }

        /// <summary>드론 하나를 내보냈다 (배치와 레이더 등록이 끝난 뒤)</summary>
        public event Action<Drone> Spawned;

        protected DroneSpawner(string label, Exit exit, Radar radar)
        {
            Label = label;
            this.exit = exit;
            this.radar = radar;
        }

        /// <summary>
        /// 만드는 절차. virtual 이 아니어서 자식이 바꿀 수 없다. 종류를 더해도 이 메서드는 그대로다
        /// </summary>
        public Drone Spawn()
        {
            Drone drone = CreateDrone(); // [2] 무엇을 만들지는 자식이 정한다 (팩토리 메서드)
            exit.Place(drone); // [3] 출구 앞 자리에 배치
            radar.Register(drone); // [3] 레이더 등록. 자식이 몇이든 이 줄은 여기 하나뿐이다
            OnSpawned(drone); // [3] 훅: 기본은 아무것도 안 한다
            Spawned?.Invoke(drone); // [3] 알림
            return drone;
        }

        /// <summary>팩토리 메서드 (추상 단계): 자식이 반드시 구현한다. 이 스포너가 만드는 드론 하나. 배치, 등록, 알림은 하지 않는다 (Spawn 이 한다)</summary>
        protected abstract Drone CreateDrone();

        /// <summary>훅 (선택 단계): 배치와 등록이 끝난 뒤 불린다. 기본 본문이 비어 있어 덮지 않아도 된다. 종류마다 더 할 일이 있으면 자식이 override 한다</summary>
        protected virtual void OnSpawned(Drone drone) { }
    }

    public sealed class ScoutSpawner : DroneSpawner
    {
        public ScoutSpawner(Exit exit, Radar radar) : base("정찰", exit, radar) { }

        protected override Drone CreateDrone() => new ScoutDrone();
    }

    public sealed class HeavySpawner : DroneSpawner
    {
        public int Hp = 3;

        public HeavySpawner(Exit exit, Radar radar) : base("중장갑", exit, radar) { }

        protected override Drone CreateDrone() => new HeavyDrone(Hp);
    }

    /// <summary>나중에 더한 종류. 이 클래스와 스포너 목록의 한 칸 (Unity 에서는 Inspector 의 프리팹 한 칸) 만 더했다</summary>
    public sealed class ShieldSpawner : DroneSpawner
    {
        public int Hp = 2;

        public ShieldSpawner(Exit exit, Radar radar) : base("방패", exit, radar) { }

        protected override Drone CreateDrone() => new ShieldDrone(Hp); // [2] 새 종류는 만드는 줄만 쓴다. 배치, 등록, 알림은 부모의 Spawn 이 한다
    }
}
