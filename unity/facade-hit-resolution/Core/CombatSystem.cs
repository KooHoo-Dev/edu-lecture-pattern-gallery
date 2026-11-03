// 명중 처리 창구(퍼사드): 공격하는 쪽은 Hit(누가, 누구에게, 얼마) 한 줄만 부르고, 창구가 다섯 단계를 순서대로 하위 시스템에 맡긴다.
// 창구는 계산도 표시도 직접 하지 않는다 (신 객체가 되지 않게). 하위 시스템은 숨길 뿐 막지 않아서 속성으로 꺼내 쓸 수 있다.
using System;

namespace PatternGallery.FacadeHitResolution
{
    public sealed class CombatSystem
    {
        public DamageCalculator Calculator { get; } = new DamageCalculator();
        public HitFeed Feed { get; } = new HitFeed();
        public Wreckage Wreckage { get; } = new Wreckage();

        /// <summary>창구가 명중을 받았을 때 (공격한 쪽, 드론, 기본 피해)</summary>
        public event Action<string, Drone, int> HitRequested;
        /// <summary>받지 않았을 때 (공격한 쪽, 드론). 드론이 null 이면 노릴 대상이 없었고, 아니면 이미 파괴된 드론이다</summary>
        public event Action<string, Drone> HitRefused;

        /// <summary>명중 하나를 처리한다. 받지 않았으면 false (HitRefused 로 알린다)</summary>
        public bool Hit(string attacker, Drone target, int baseDamage) // [1]
        {
            if (target == null || target.IsDestroyed)
            {
                HitRefused?.Invoke(attacker, target); // [1] 파괴된 드론에 다시 명중 처리를 하지 않는다
                return false;
            }
            HitRequested?.Invoke(attacker, target, baseDamage);
            int damage = Calculator.Final(baseDamage, target.Armor); // [2] (1) 최종 피해 계산
            Feed.ShowDamage(target, damage); // [2] (2) 숫자 표시
            target.TakeDamage(damage); // [3] (3) HP 적용
            Feed.NotifyHit(attacker, target); // [3] (4) 피격 알림
            if (target.Hp == 0) Wreckage.Destroy(target); // [4] (5) 파괴 처리와 보상 (이미 파괴됐으면 Destroy 가 거른다)
            return true;
        }
    }
}
