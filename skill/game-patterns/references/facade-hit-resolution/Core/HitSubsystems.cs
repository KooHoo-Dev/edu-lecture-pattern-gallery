// 명중 처리의 하위 시스템들: 피해 계산(DamageCalculator), 숫자 표시와 피격 알림(HitFeed), 파괴와 보상(Wreckage).
// 각자 자기 일 하나만 하고 서로를 모른다. 순서를 정하는 것은 창구(CombatSystem)다. 일어난 일은 C# event 로 알린다.
using System;

namespace PatternGallery.FacadeHitResolution
{
    /// <summary>1단계: 최종 피해 = 기본 피해 - 방어력, 최소 1</summary>
    public sealed class DamageCalculator
    {
        public const int MinDamage = 1;

        /// <summary>계산할 때마다 (기본 피해, 방어력, 최종 피해)</summary>
        public event Action<int, int, int> Calculated;

        public int Final(int baseDamage, int armor)
        {
            int final = Math.Max(MinDamage, baseDamage - armor); // [2]
            Calculated?.Invoke(baseDamage, armor, final);
            return final;
        }
    }

    /// <summary>2단계 숫자 표시, 4단계 피격 알림. 숫자를 띄우고 소리를 내는 일은 이벤트를 받은 화면 쪽이 한다</summary>
    public sealed class HitFeed
    {
        /// <summary>드론 위에 피해 숫자를 띄울 때 (드론, 최종 피해)</summary>
        public event Action<Drone, int> DamageShown;
        /// <summary>HP 를 고친 뒤 '맞았다' 고 알릴 때 (공격한 쪽, 드론). 피격 효과, 소리, 퀘스트 집계가 듣는다</summary>
        public event Action<string, Drone> HitTaken;

        public void ShowDamage(Drone target, int amount) => DamageShown?.Invoke(target, amount); // [2]

        public void NotifyHit(string attacker, Drone target) => HitTaken?.Invoke(attacker, target); // [3]
    }

    /// <summary>5단계: HP 0 인 드론을 화면에서 빼고 크레딧을 준다. 이미 파괴된 드론이면 아무것도 하지 않는다</summary>
    public sealed class Wreckage
    {
        public int Credits { get; private set; }

        /// <summary>드론을 파괴 처리했을 때. 화면의 오브젝트를 끄는 것은 이 이벤트를 받은 쪽이다</summary>
        public event Action<Drone> Destroyed;
        /// <summary>보상을 줬을 때 (드론, 보상, 합계)</summary>
        public event Action<Drone, int, int> RewardGranted;

        public void Destroy(Drone target)
        {
            // HitTaken 구독자(폭발 연쇄, 반격)가 같은 드론에 Hit 을 다시 부르면 안쪽 Hit 이 먼저 파괴와 보상을 끝낸다.
            // 바깥 Hit 이 Hp == 0 을 다시 보고 여기로 와도 크레딧이 두 번 들어가지 않게 거른다
            if (target.IsDestroyed) return; // [4] 두 번 파괴하지 않는다
            target.MarkDestroyed(); // [4]
            Destroyed?.Invoke(target);
            Credits += target.Reward; // [4]
            RewardGranted?.Invoke(target, target.Reward, Credits);
        }
    }
}
