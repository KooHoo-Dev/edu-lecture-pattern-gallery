// 포탑 코어: 조준 방식(전략) 하나를 들고, 매 Tick 대상을 한 번만 묻는다. 그 대상을 조준 표시와 발사가 함께 쓴다.
using System;
using System.Collections.Generic;

namespace PatternGallery.StrategyTurretTargeting
{
    public sealed class Turret
    {
        /// <summary>하네스와 웹 무대의 포탑 위치. 기지(15) 앞, 드론이 지나쳐 가는 자리 (Unity 에서는 TurretController 가 오브젝트 자리로 정한다)</summary>
        public const float DefaultX = 8f;

        /// <summary>포탑의 가로 위치 (드론이 나오는 왼쪽 끝이 0). 거리는 이 가로 위치로만 잰다</summary>
        public readonly float X;
        /// <summary>규칙 값. TurretController 가 Inspector 값으로 채우고, Play 중 값을 바꾸면 OnValidate 가 다시 넣는다</summary>
        public float Range = 6f;
        public float FireInterval = 0.4f;
        public int Damage = 1;

        readonly DroneWave wave;
        /// <summary>사거리 안 후보. 매 Tick 다시 채운다 (목록 하나를 재사용)</summary>
        readonly List<Drone> candidates = new List<Drone>();

        public ITargetingStrategy Strategy { get; private set; }
        /// <summary>지금 대상. 레이저(조준 표시)도 발사도 이 값 하나를 쓴다</summary>
        public Drone CurrentTarget { get; private set; }
        /// <summary>다음 발사까지 남은 시간</summary>
        public float Cooldown { get; private set; }

        /// <summary>조준 방식이 바뀔 때 (이전, 다음)</summary>
        public event Action<ITargetingStrategy, ITargetingStrategy> StrategyChanged;
        /// <summary>대상이 바뀔 때 (이전, 다음). 없으면 null</summary>
        public event Action<Drone, Drone> TargetChanged;
        /// <summary>쐈을 때 (맞은 드론, 준 피해)</summary>
        public event Action<Drone, int> Fired;
        public event Action<Drone> DroneDestroyed;

        public Turret(DroneWave wave, float x, ITargetingStrategy strategy)
        {
            this.wave = wave;
            X = x;
            Strategy = strategy ?? throw new ArgumentNullException(nameof(strategy));
        }

        /// <summary>바깥(입력, AI, 업그레이드)이 조준 방식을 골라 끼운다. 전략은 다음 전략을 스스로 고르지 않는다</summary>
        public void SetStrategy(ITargetingStrategy strategy)
        {
            if (strategy == null) throw new ArgumentNullException(nameof(strategy));
            if (strategy == Strategy) return;
            ITargetingStrategy previous = Strategy;
            Strategy = strategy; // [1] 갈아 끼우기만 한다. 대상은 다음 Tick 에 새 전략이 고른다
            StrategyChanged?.Invoke(previous, strategy);
        }

        /// <summary>매 프레임 (MonoBehaviour.Update 의 Time.deltaTime). DroneWave.Tick 다음에 부른다</summary>
        public void Tick(float dt)
        {
            wave.CollectInRange(X, Range, candidates);
            Drone next = Strategy.SelectTarget(candidates, X); // [2] 대상은 여기서 한 번만 묻는다
            if (next != CurrentTarget)
            {
                Drone previous = CurrentTarget;
                CurrentTarget = next;
                TargetChanged?.Invoke(previous, next);
            }

            if (Cooldown > 0f) Cooldown -= dt;
            if (CurrentTarget == null || Cooldown > 0f) return;
            Fire(CurrentTarget); // [3] 레이저가 가리키는 그 드론에 쏜다
            Cooldown += FireInterval;
        }

        void Fire(Drone target)
        {
            target.Hp = Math.Max(0, target.Hp - Damage);
            Fired?.Invoke(target, Damage);
            if (target.IsAlive) return;
            wave.Remove(target);
            DroneDestroyed?.Invoke(target);
            CurrentTarget = null; // [3] 파괴된 드론을 대상으로 붙들고 있지 않는다
            TargetChanged?.Invoke(target, null);
        }
    }
}
