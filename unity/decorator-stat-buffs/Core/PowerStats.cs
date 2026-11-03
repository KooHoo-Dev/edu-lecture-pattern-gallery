// 무기 출력 스탯과 감싸는 층: 기본값(BasePower)을 고치지 않고, 같은 인터페이스(IPowerStat)를 구현한 층이 안쪽 값을 감싸 더하거나 곱한다.
// 공식 한 줄((기본 + Σ보너스) × Π배율) 대신 층으로 두면, 상한이나 조건부 층을 다른 층을 고치지 않고 더할 수 있고 지금 걸린 사슬을 글로 꺼내 볼 수 있다.
using System;
using System.Globalization;

namespace PatternGallery.DecoratorStatBuffs
{
    /// <summary>값을 읽을 수 있는 출력. 기본값도, 그것을 감싼 층도 모두 이 모양이라 바깥에서는 구분하지 않고 Value 만 읽는다</summary>
    public interface IPowerStat
    {
        float Value { get; }
        /// <summary>이 층 하나의 이름 (예: 냉각 셀 +5). 안쪽 층은 적지 않는다</summary>
        string Label { get; }
    }

    /// <summary>버프가 없을 때의 출력. 만든 뒤에는 바뀌지 않는다 (버프가 이 값을 직접 고치지 않는다)</summary>
    public sealed class BasePower : IPowerStat
    {
        public float Value { get; }
        public string Label => "기본 " + StatText.Num(Value);

        public BasePower(float value)
        {
            Value = value;
        }
    }

    /// <summary>감싸는 층의 공통 부모. 안쪽 출력(Inner)과 층 이름(Name)을 들고, 자기 몫을 더한 값을 Value 로 돌려준다</summary>
    public abstract class PowerDecorator : IPowerStat
    {
        public readonly IPowerStat Inner;
        /// <summary>이 층을 만든 버프의 이름 (예: 냉각 셀). 층은 어느 버프인지 몰라도 되고 이름만 든다</summary>
        public readonly string Name;

        protected PowerDecorator(IPowerStat inner, string name)
        {
            Inner = inner ?? throw new ArgumentNullException(nameof(inner));
            Name = name;
        }

        public abstract float Value { get; }
        public abstract string Label { get; }
    }

    /// <summary>안쪽 값에 일정량을 더하는 층 (냉각 셀)</summary>
    public sealed class AddLayer : PowerDecorator
    {
        public readonly float Amount;

        public AddLayer(IPowerStat inner, string name, float amount) : base(inner, name)
        {
            Amount = amount;
        }

        public override float Value => Inner.Value + Amount; // [3] 안쪽 값을 먼저 읽고 자기 몫을 더한다
        public override string Label => Name + " +" + StatText.Num(Amount);
    }

    /// <summary>안쪽 값에 배율을 곱하는 층 (과부하)</summary>
    public sealed class MultiplyLayer : PowerDecorator
    {
        public readonly float Factor;

        public MultiplyLayer(IPowerStat inner, string name, float factor) : base(inner, name)
        {
            Factor = factor;
        }

        public override float Value => Inner.Value * Factor; // [3] 안쪽 값을 먼저 읽고 자기 배율을 곱한다
        public override string Label => Name + " ×" + StatText.Num(Factor);
    }

    /// <summary>사슬과 숫자를 글로 바꾼다</summary>
    public static class StatText
    {
        /// <summary>조절 값 표기 (소수 둘째 자리까지, 뒤의 0 은 뺀다)</summary>
        public static string Num(float v) => v.ToString("0.##", CultureInfo.InvariantCulture);

        /// <summary>
        /// 사슬을 글로 (예: 과부하 ×2 [냉각 셀 +5 [기본 10]]). 바깥 층부터 Inner 를 따라 안으로 들어가며 층마다 자기 Label 을 적는다.
        /// 층의 구체 형식(AddLayer, MultiplyLayer)을 묻지 않으므로 새 층을 더해도 이 함수는 그대로다
        /// </summary>
        public static string Describe(IPowerStat stat)
        {
            if (stat is PowerDecorator layer) return layer.Label + " [" + Describe(layer.Inner) + "]";
            return stat.Label;
        }
    }
}
