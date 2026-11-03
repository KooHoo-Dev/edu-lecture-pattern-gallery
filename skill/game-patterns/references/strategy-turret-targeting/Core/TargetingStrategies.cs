// 조준 방식(전략): 사거리 안 후보 중 하나를 고르는 일만 한다. 상태를 갖지 않아 포탑 여러 대가 같은 객체를 같이 써도 된다.
using System;
using System.Collections.Generic;

namespace PatternGallery.StrategyTurretTargeting
{
    public interface ITargetingStrategy
    {
        /// <summary>후보 중 쏠 드론. 후보가 없으면 null. 같은 값이면 id 가 작은 드론</summary>
        Drone SelectTarget(IReadOnlyList<Drone> candidates, float turretX);
    }

    /// <summary>포탑과 가로 거리가 가장 짧은 드론</summary>
    public sealed class NearestTarget : ITargetingStrategy
    {
        public Drone SelectTarget(IReadOnlyList<Drone> candidates, float turretX)
        {
            Drone best = null;
            float bestDistance = 0f;
            foreach (Drone d in candidates)
            {
                float distance = Math.Abs(d.X - turretX);
                if (best == null || distance < bestDistance || (distance == bestDistance && d.Id < best.Id))
                {
                    best = d;
                    bestDistance = distance;
                }
            }
            return best;
        }
    }

    /// <summary>남은 체력이 가장 많은 드론</summary>
    public sealed class StrongestTarget : ITargetingStrategy
    {
        public Drone SelectTarget(IReadOnlyList<Drone> candidates, float turretX)
        {
            Drone best = null;
            foreach (Drone d in candidates)
                if (best == null || d.Hp > best.Hp || (d.Hp == best.Hp && d.Id < best.Id)) best = d;
            return best;
        }
    }

    /// <summary>선두: 기지에 가장 가까운(가장 많이 온) 드론</summary>
    public sealed class FirstTarget : ITargetingStrategy
    {
        public Drone SelectTarget(IReadOnlyList<Drone> candidates, float turretX)
        {
            Drone best = null;
            foreach (Drone d in candidates)
                if (best == null || d.X > best.X || (d.X == best.X && d.Id < best.Id)) best = d;
            return best;
        }
    }

    /// <summary>남은 체력이 가장 적은 드론 (나중에 더한 방식. 클래스 하나만 더하면 된다)</summary>
    public sealed class WeakestTarget : ITargetingStrategy
    {
        public Drone SelectTarget(IReadOnlyList<Drone> candidates, float turretX)
        {
            Drone best = null;
            foreach (Drone d in candidates)
                if (best == null || d.Hp < best.Hp || (d.Hp == best.Hp && d.Id < best.Id)) best = d;
            return best;
        }
    }

    /// <summary>
    /// 한 번 만들어 같이 쓰는 전략 객체. 전략에 포탑별 값(마지막 대상 등)이 없으니 포탑이 몇 대든 이 넷이면 된다.
    /// 매 프레임 new 하지 않는다
    /// </summary>
    public static class Targeting
    {
        public static readonly ITargetingStrategy Nearest = new NearestTarget();
        public static readonly ITargetingStrategy Strongest = new StrongestTarget();
        public static readonly ITargetingStrategy First = new FirstTarget();
        public static readonly ITargetingStrategy Weakest = new WeakestTarget();
    }
}
