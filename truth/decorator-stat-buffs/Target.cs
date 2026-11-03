// 하네스 어댑터: 코어(BuffSet)와 나쁜 예(NaivePowerBuffs)를 시나리오 입력으로 돌리고 사건과 상태를 글로 꺼낸다.
// 나쁜 예 옆에는 같은 입력을 받는 코어(그림자)를 두고, 그 출력을 '있어야 할 값' 으로 삼아 기록에 같이 남긴다 (나쁜 예 코드에는 검사 코드를 넣지 않는다).
// 웹 sim(src/specimens/decorator-stat-buffs/sim.ts)의 drain, snapshot 과 같은 글을 만든다.
using System;
using System.Collections.Generic;
using PatternGallery.DecoratorStatBuffs.Naive;
using PatternGallery.Truth;

namespace PatternGallery.DecoratorStatBuffs
{
    [SimTarget("decorator-stat-buffs")]
    public sealed class Target : ISimTarget
    {
        readonly BuffSet buffs;
        readonly NaivePowerBuffs naive;
        readonly List<string> events = new List<string>();
        bool lastDrift;

        public Target(Values v, bool isNaive)
        {
            var settings = new BuffSettings
            {
                CellBonus = v.Float("cellBonus"),
                OverloadMultiplier = v.Float("overloadMultiplier"),
                CellDuration = v.Float("cellDuration"),
                OverloadDuration = v.Float("overloadDuration"),
            };
            buffs = new BuffSet(settings);
            if (isNaive)
            {
                naive = new NaivePowerBuffs
                {
                    cellBonus = settings.CellBonus,
                    overloadMultiplier = settings.OverloadMultiplier,
                    cellDuration = settings.CellDuration,
                    overloadDuration = settings.OverloadDuration,
                };
                return; // 그림자 코어의 사건은 적지 않는다
            }
            buffs.BuffApplied += (k, d) => events.Add($"{Name(k)} 받음 → 목록에 넣음 ({Fmt.F(d)}초)");
            buffs.BuffRefreshed += (k, r) => events.Add($"{Name(k)} 다시 받음 → 층은 그대로, 남은 시간만 {Fmt.F(r)}초로");
            buffs.BuffExpired += k => events.Add($"{Name(k)} 끝 → 목록에서 뺌");
            buffs.BuffsPurged += n => events.Add($"정화 → 버프 {n}개를 목록에서 뺌");
            buffs.NothingToPurge += () => events.Add("정화할 버프가 없다");
            buffs.ChainRebuilt += p => events.Add($"사슬 다시 감싸기: {StatText.Describe(p)}");
            buffs.PowerChanged += (from, to) => events.Add($"출력 {Fmt.F(from)} → {Fmt.F(to)}");
        }

        static string Name(BuffKind k) => BuffSet.NameOf(k);

        public void Input(string name)
        {
            if (name == "cell") buffs.Apply(BuffKind.Cell);
            else if (name == "overload") buffs.Apply(BuffKind.Overload);
            else if (name == "purge") buffs.Purge();
            if (naive == null) return;

            float p0 = naive.power;
            string bonus = StatText.Num(naive.cellBonus);
            string factor = StatText.Num(naive.overloadMultiplier);
            if (name == "cell")
            {
                WaitTimer before = naive.cellRoutine;
                naive.OnCell();
                if (before != null) events.Add($"앞 냉각 셀 코루틴 멈춤 (남은 {Fmt.F(before.Remaining)}초) → 그 power -= {bonus} 는 돌지 않는다");
                events.Add($"power += {bonus} : {Fmt.F(p0)} → {Fmt.F(naive.power)} (있어야 할 값 {Fmt.F(buffs.Value)})");
                if (before != null) events.Add($"!중복 적용 (냉각 셀 +{bonus} 를 두 번 더했는데 끝날 때는 한 번만 뺀다)");
            }
            else if (name == "overload")
            {
                WaitTimer before = naive.overloadRoutine;
                naive.OnOverload();
                if (before != null) events.Add($"앞 과부하 코루틴 멈춤 (남은 {Fmt.F(before.Remaining)}초) → 그 power /= {factor} 는 돌지 않는다");
                events.Add($"power *= {factor} : {Fmt.F(p0)} → {Fmt.F(naive.power)} (있어야 할 값 {Fmt.F(buffs.Value)})");
                if (before != null) events.Add($"!중복 적용 (과부하 ×{factor} 를 두 번 곱했는데 끝날 때는 한 번만 나눈다)");
            }
            else if (name == "purge")
            {
                var parts = new List<string>();
                if (naive.cellRoutine != null) parts.Add($"power -= {bonus}");
                if (naive.overloadRoutine != null) parts.Add($"power /= {factor}");
                naive.OnPurge();
                if (parts.Count == 0) events.Add("정화할 버프가 없다");
                else events.Add($"정화 → 코루틴을 멈추고 {string.Join(", ", parts)} : {Fmt.F(p0)} → {Fmt.F(naive.power)}");
            }
            CheckDrift();
        }

        public void Tick(float dt)
        {
            buffs.Tick(dt);
            if (naive == null) return;

            WaitTimer cell0 = naive.cellRoutine;
            WaitTimer overload0 = naive.overloadRoutine;
            float p0 = naive.power;
            naive.Update(dt);
            var parts = new List<string>();
            if (cell0 != null && naive.cellRoutine == null) parts.Add($"냉각 셀 끝 power -= {StatText.Num(naive.cellBonus)}");
            if (overload0 != null && naive.overloadRoutine == null) parts.Add($"과부하 끝 power /= {StatText.Num(naive.overloadMultiplier)}");
            if (parts.Count > 0) events.Add($"{string.Join(", ", parts)} : {Fmt.F(p0)} → {Fmt.F(naive.power)} (있어야 할 값 {Fmt.F(buffs.Value)})");
            CheckDrift();
        }

        /// <summary>돌고 있는 코루틴이 하나도 없는데 출력이 기본값이 아니면 버그 (켜지는 순간 한 번)</summary>
        void CheckDrift()
        {
            bool drift = naive.RunningCount == 0 && Math.Abs(naive.power - naive.basePower) > 0.005f;
            if (drift && !lastDrift) events.Add($"!기본값 어긋남 (버프가 모두 끝났는데 power {Fmt.F(naive.power)}, 기본값 {Fmt.F(naive.basePower)})");
            lastDrift = drift;
        }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        public string Snapshot()
        {
            if (naive == null)
                return $"power={Fmt.F(buffs.Value)} layers={buffs.Active.Count} cell={Fmt.F(buffs.RemainingOf(BuffKind.Cell))} overload={Fmt.F(buffs.RemainingOf(BuffKind.Overload))}";
            return $"power={Fmt.F(naive.power)} expect={Fmt.F(buffs.Value)} timers={naive.RunningCount} cell={Fmt.F(Left(naive.cellRoutine))} overload={Fmt.F(Left(naive.overloadRoutine))}";
        }

        static float Left(WaitTimer t) => t == null ? 0f : t.Remaining;
    }
}
