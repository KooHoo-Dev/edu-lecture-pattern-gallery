// 체력 구독자들: 체력 바, 피격음, 업적, 게임 오버. 각자 자기 규칙만 알고 서로를, 그리고 플레이어를 모른다.
// 반응한 결과는 다시 C# event 로 알린다. Unity 쪽 컴포넌트가 그 이벤트를 받아 바로 화면과 소리에 옮긴다.
using System;

namespace PatternGallery.ObserverHealthEvents
{
    /// <summary>상태를 보여 주는 구독자: 붙을 때 지금 값으로 맞춘다</summary>
    public sealed class HealthBar
    {
        public float LowRatio = 0.3f;
        public float Fill { get; private set; } = 1f;
        public bool Warning { get; private set; }

        /// <summary>채움이나 경고 색이 바뀔 때 (채움, 경고)</summary>
        public event Action<float, bool> Updated;

        Health bound;

        public void Bind(Health health)
        {
            if (bound == health) return;
            Unbind();
            bound = health;
            health.Changed += OnChanged; // [4]
            Show(health.Current, health.Max); // 붙기 전에 놓친 값을 지금 값으로 맞춘다
        }

        public void Unbind()
        {
            if (bound == null) return;
            bound.Changed -= OnChanged; // [4] 빼먹으면 파괴된 바가 계속 불린다
            bound = null;
        }

        void OnChanged(HealthChange change) => Show(change.Current, change.Max); // [3]

        void Show(int current, int max)
        {
            Fill = max > 0 ? (float)current / max : 0f;
            Warning = Fill <= LowRatio;
            Updated?.Invoke(Fill, Warning);
        }
    }

    /// <summary>순간을 알리는 구독자: 붙기 전의 일은 맞추지 않는다 (지난 피해에 소리를 내지 않는다)</summary>
    public sealed class HitSound
    {
        public int PlayCount { get; private set; }

        /// <summary>소리를 낼 때 (지금까지 횟수)</summary>
        public event Action<int> Played;

        Health bound;

        public void Bind(Health health)
        {
            if (bound == health) return;
            Unbind();
            bound = health;
            health.Changed += OnChanged;
        }

        public void Unbind()
        {
            if (bound == null) return;
            bound.Changed -= OnChanged;
            bound = null;
        }

        void OnChanged(HealthChange change)
        {
            if (change.Delta >= 0) return; // 회복에는 울리지 않는다
            PlayCount++; // [3]
            Played?.Invoke(PlayCount);
        }
    }

    /// <summary>순간을 알리는 구독자: 붙어 있는 동안 받은 피해만 센다</summary>
    public sealed class DamageAchievement
    {
        public int Threshold = 60;
        public int TotalDamage { get; private set; }
        public bool IsUnlocked { get; private set; }

        /// <summary>누적 피해가 늘 때 (누적)</summary>
        public event Action<int> Progressed;
        /// <summary>누적 피해가 기준 이상이 되는 순간 한 번</summary>
        public event Action Unlocked;

        Health bound;

        public void Bind(Health health)
        {
            if (bound == health) return;
            Unbind();
            bound = health;
            health.Changed += OnChanged;
        }

        public void Unbind()
        {
            if (bound == null) return;
            bound.Changed -= OnChanged;
            bound = null;
        }

        void OnChanged(HealthChange change)
        {
            if (change.Delta >= 0) return;
            TotalDamage += -change.Delta; // [3]
            Progressed?.Invoke(TotalDamage);
            if (IsUnlocked || TotalDamage < Threshold) return;
            IsUnlocked = true;
            Unlocked?.Invoke();
        }
    }

    /// <summary>상태를 보여 주는 구독자: 이미 죽은 뒤에 붙어도 게임 오버를 띄운다</summary>
    public sealed class GameOverPanel
    {
        public bool IsShown { get; private set; }

        /// <summary>게임 오버 창을 띄울 때 한 번</summary>
        public event Action Shown;

        Health bound;

        public void Bind(Health health)
        {
            if (bound == health) return;
            Unbind();
            bound = health;
            health.Died += OnDied;
            if (health.IsDead) OnDied();
        }

        public void Unbind()
        {
            if (bound == null) return;
            bound.Died -= OnDied;
            bound = null;
        }

        void OnDied() // [3]
        {
            if (IsShown) return;
            IsShown = true;
            Shown?.Invoke();
        }
    }
}
