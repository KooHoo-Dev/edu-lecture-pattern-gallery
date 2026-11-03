// 활성 버프 목록: 받은 버프를 목록에 넣고 Tick 으로 남은 시간을 줄여 끝난 것을 뺀다. 목록이 바뀔 때마다 기본값에서 시작해 감싸기 사슬을 다시 만든다.
// UnityEngine 을 쓰지 않는다. 시간은 Tick(dt) 로만 받아 에디터 없이 테스트할 수 있다.
using System;
using System.Collections.Generic;

namespace PatternGallery.DecoratorStatBuffs
{
    public enum BuffKind
    {
        /// <summary>냉각 셀: 출력 + CellBonus</summary>
        Cell,
        /// <summary>과부하: 출력 × OverloadMultiplier</summary>
        Overload,
    }

    /// <summary>규칙 값. PowerBuffs 가 Inspector 값으로 채워 넘기고, Play 중 값을 바꾸면 OnValidate 가 다시 넣는다</summary>
    public sealed class BuffSettings
    {
        public float BasePower = 10f;
        public float CellBonus = 5f;
        public float OverloadMultiplier = 2f;
        public float CellDuration = 4f;
        public float OverloadDuration = 2f;
    }

    /// <summary>목록에 든 버프 하나. 값(더할 양, 배율)은 들지 않고 종류와 남은 시간만 든다</summary>
    public sealed class ActiveBuff
    {
        public readonly BuffKind Kind;
        public float Remaining;

        public ActiveBuff(BuffKind kind, float remaining)
        {
            Kind = kind;
            Remaining = remaining;
        }
    }

    public sealed class BuffSet
    {
        public readonly BuffSettings Settings;
        readonly List<ActiveBuff> active = new List<ActiveBuff>();
        /// <summary>마지막으로 알린 출력 (PowerChanged 의 이전 값)</summary>
        float current;

        /// <summary>지금 걸린 버프. 받은 순서대로 들어 있다 (사슬의 층 순서는 이 순서가 아니라 Rebuild 가 정한다)</summary>
        public IReadOnlyList<ActiveBuff> Active => active;
        /// <summary>감싸기 사슬의 바깥 층. 버프가 없으면 BasePower 그 자체다</summary>
        public IPowerStat Power { get; private set; }
        /// <summary>지금 출력. 바깥 층의 Value 를 읽으면 층마다 안쪽 값을 읽어 자기 몫을 더하거나 곱한다</summary>
        public float Value => Power.Value; // [3]

        /// <summary>새 버프를 목록에 넣었을 때 (종류, 지속 시간)</summary>
        public event Action<BuffKind, float> BuffApplied;
        /// <summary>이미 걸린 버프를 다시 받아 남은 시간만 갱신했을 때 (종류, 새 남은 시간). 층은 그대로라 출력이 바뀌지 않는다</summary>
        public event Action<BuffKind, float> BuffRefreshed;
        /// <summary>남은 시간이 다 되어 목록에서 뺐을 때</summary>
        public event Action<BuffKind> BuffExpired;
        /// <summary>정화로 모든 버프를 뺐을 때 (뺀 개수)</summary>
        public event Action<int> BuffsPurged;
        /// <summary>걸린 버프가 없어 정화가 할 일이 없을 때</summary>
        public event Action NothingToPurge;
        /// <summary>목록에서 사슬을 다시 감쌌을 때 (새 바깥 층)</summary>
        public event Action<IPowerStat> ChainRebuilt;
        /// <summary>출력이 바뀌었을 때 (이전, 지금)</summary>
        public event Action<float, float> PowerChanged;

        public BuffSet(BuffSettings settings)
        {
            Settings = settings;
            Power = new BasePower(settings.BasePower);
            current = Power.Value;
        }

        public float DurationOf(BuffKind kind) => kind == BuffKind.Cell ? Settings.CellDuration : Settings.OverloadDuration;

        /// <summary>화면과 기록에 쓰는 버프 이름 (층의 Name 에도 들어간다)</summary>
        public static string NameOf(BuffKind kind) => kind == BuffKind.Cell ? "냉각 셀" : "과부하";

        /// <summary>이 종류의 버프가 걸려 있으면 남은 시간, 아니면 0</summary>
        public float RemainingOf(BuffKind kind)
        {
            ActiveBuff b = Find(kind);
            return b == null ? 0f : b.Remaining;
        }

        ActiveBuff Find(BuffKind kind)
        {
            foreach (ActiveBuff b in active)
                if (b.Kind == kind) return b;
            return null;
        }

        /// <summary>버프를 받는다. 같은 종류가 이미 있으면 겹치지 않고 남은 시간만 처음으로 되돌린다</summary>
        public void Apply(BuffKind kind)
        {
            ActiveBuff existing = Find(kind);
            if (existing != null)
            {
                existing.Remaining = DurationOf(kind); // [1] 같은 버프는 층을 하나 더 두지 않고 시간만 갱신한다
                BuffRefreshed?.Invoke(kind, existing.Remaining);
                return;
            }
            active.Add(new ActiveBuff(kind, DurationOf(kind))); // [1] 새 버프는 목록에 넣는다
            Rebuild();
            // 알림은 사슬을 다시 만든 뒤에. 핸들러가 Value 를 읽으면 새 값이 나온다
            BuffApplied?.Invoke(kind, DurationOf(kind));
            AnnounceChain();
        }

        /// <summary>정화: 모든 버프를 뺀다. 층을 하나씩 떼지 않고 빈 목록에서 다시 만든다</summary>
        public void Purge()
        {
            if (active.Count == 0)
            {
                NothingToPurge?.Invoke();
                return;
            }
            int count = active.Count;
            active.Clear();
            Rebuild();
            BuffsPurged?.Invoke(count);
            AnnounceChain();
        }

        /// <summary>
        /// 매 프레임 (MonoBehaviour.Update 의 Time.deltaTime). 끝난 버프를 모두 목록에서 빼고, 사슬을 다시 만들고, 그다음 알린다.
        /// 목록을 도는 동안에는 알리지 않으므로 BuffExpired 핸들러가 Apply 를 불러도 목록이 도중에 바뀌지 않는다
        /// </summary>
        public void Tick(float dt)
        {
            List<BuffKind> ended = null;
            for (int i = 0; i < active.Count;)
            {
                ActiveBuff b = active[i];
                b.Remaining -= dt;
                if (b.Remaining > 0f)
                {
                    i++;
                    continue;
                }
                active.RemoveAt(i); // [4] 끝난 버프는 목록에서 뺀다. 사슬 중간의 층을 직접 떼지 않는다
                (ended ??= new List<BuffKind>()).Add(b.Kind);
            }
            if (ended == null) return;
            Rebuild(); // [4] 남은 버프로 사슬을 처음부터 다시 감싼다
            foreach (BuffKind kind in ended) BuffExpired?.Invoke(kind);
            AnnounceChain();
        }

        /// <summary>Play 중 조절 값이 바뀌었을 때. 걸린 버프는 그대로 두고 새 값으로 사슬을 다시 만든다</summary>
        public void SettingsChanged()
        {
            Rebuild();
            AnnounceChain();
        }

        /// <summary>
        /// 기본값에서 시작해 목록의 버프를 층으로 감싼다. 더하기 층이 안쪽, 곱하기 층이 바깥 (고정).
        /// 더하기가 안쪽이면 보너스도 배율을 받는다 (흔한 관례: (10 + 5) × 2 = 30).
        /// 받은 순서대로 감싸면 같은 버프 조합이라도 받은 순서마다 출력이 달라진다 (과부하 먼저면 10 × 2 + 5 = 25).
        /// 알리지는 않는다. 부른 쪽이 자기 알림 뒤에 AnnounceChain 을 부른다
        /// </summary>
        void Rebuild()
        {
            IPowerStat stat = new BasePower(Settings.BasePower); // [2] 기본값은 고치지 않고 매번 새 사슬의 가장 안쪽에 둔다
            foreach (ActiveBuff b in active)
                if (b.Kind == BuffKind.Cell) stat = new AddLayer(stat, NameOf(b.Kind), Settings.CellBonus); // [2] 더하기 층이 안쪽
            foreach (ActiveBuff b in active)
                if (b.Kind == BuffKind.Overload) stat = new MultiplyLayer(stat, NameOf(b.Kind), Settings.OverloadMultiplier); // [2] 곱하기 층이 바깥
            Power = stat;
        }

        /// <summary>새 사슬과, 값이 바뀌었으면 출력을 알린다</summary>
        void AnnounceChain()
        {
            ChainRebuilt?.Invoke(Power);
            float previous = current;
            current = Power.Value; // [3]
            if (current != previous) PowerChanged?.Invoke(previous, current);
        }
    }
}
