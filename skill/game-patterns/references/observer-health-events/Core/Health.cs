// 체력(관찰 대상, Subject): 값이 바뀌면 이벤트로 알린다. 누가 듣는지는 모른다. UnityEngine 을 쓰지 않는다.
using System;

namespace PatternGallery.ObserverHealthEvents
{
    /// <summary>체력이 바뀐 한 번의 소식</summary>
    public readonly struct HealthChange
    {
        public readonly int Previous;
        public readonly int Current;
        public readonly int Max;

        public HealthChange(int previous, int current, int max)
        {
            Previous = previous;
            Current = current;
            Max = max;
        }

        /// <summary>바뀐 양. 피해면 음수</summary>
        public int Delta => Current - Previous;
    }

    public sealed class Health
    {
        public int Max { get; }
        public int Current { get; private set; }
        public bool IsDead => Current <= 0;

        /// <summary>체력이 바뀔 때마다. 구독자는 OnEnable 에서 +=, OnDisable 에서 -= 한다</summary>
        public event Action<HealthChange> Changed;
        /// <summary>체력이 0 이 되는 순간 한 번</summary>
        public event Action Died;

        public Health(int max)
        {
            Max = max;
            Current = max;
        }

        public void Damage(int amount) // [1]
        {
            if (IsDead || amount <= 0) return;
            Set(Current - amount);
        }

        public void Heal(int amount)
        {
            if (IsDead || amount <= 0) return;
            Set(Current + amount);
        }

        void Set(int value)
        {
            int previous = Current;
            Current = Math.Clamp(value, 0, Max); // [1]
            if (Current == previous) return;
            // 구독자가 안에서 Damage 를 다시 불러도 Died 가 두 번 불리지 않게, 이번 변화로 죽었는지를 먼저 잡아 둔다
            bool died = Current == 0;
            Changed?.Invoke(new HealthChange(previous, Current, Max)); // [2] 누가 듣는지 모른 채 알리기만 한다
            if (died) Died?.Invoke(); // [2]
        }
    }
}
