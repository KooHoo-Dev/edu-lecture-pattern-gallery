// 무기 출력 스탯과 감싸는 층: 기본값(BasePower)을 고치지 않고, 같은 인터페이스(IPowerStat)를 구현한 층이 안쪽 값을 감싸 더하거나 곱한다.
using System;

namespace PatternGallery.DecoratorStatBuffs
{
    /// <summary>값을 읽을 수 있는 출력. 기본값도, 그것을 감싼 층도 모두 이 모양이라 바깥에서는 구분하지 않고 Value 만 읽는다</summary>
    public interface IPowerStat
    {
        float Value { get; }
    }

    /// <summary>버프가 없을 때의 출력. 만든 뒤에는 바뀌지 않는다 (버프가 이 값을 직접 고치지 않는다)</summary>
    public sealed class BasePower : IPowerStat
    {
        public float Value { get; }

        public BasePower(float value)
        {
            Value = value;
        }
    }

    /// <summary>감싸는 층의 공통 부모. 안쪽 출력(Inner)을 들고, 자기 몫을 더한 값을 Value 로 돌려준다</summary>
    public abstract class PowerDecorator : IPowerStat
    {
        public readonly IPowerStat Inner;

        protected PowerDecorator(IPowerStat inner)
        {
            Inner = inner ?? throw new ArgumentNullException(nameof(inner));
        }

        public abstract float Value { get; }
    }

    /// <summary>안쪽 값에 일정량을 더하는 층 (냉각 셀)</summary>
    public sealed class AddLayer : PowerDecorator
    {
        public readonly float Amount;

        public AddLayer(IPowerStat inner, float amount) : base(inner)
        {
            Amount = amount;
        }

        public override float Value => Inner.Value + Amount; // [3] 안쪽 값을 먼저 읽고 자기 몫을 더한다
    }

    /// <summary>안쪽 값에 배율을 곱하는 층 (과부하)</summary>
    public sealed class MultiplyLayer : PowerDecorator
    {
        public readonly float Factor;

        public MultiplyLayer(IPowerStat inner, float factor) : base(inner)
        {
            Factor = factor;
        }

        public override float Value => Inner.Value * Factor; // [3] 안쪽 값을 먼저 읽고 자기 배율을 곱한다
    }
}
