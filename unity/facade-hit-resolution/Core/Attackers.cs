// 공격하는 쪽 셋: 하린의 총, 땅의 함정, 정비 드론의 전기 충격. 누구를 노릴지만 정하고 창구에 한 줄로 넘긴다.
// 방어력, 숫자 표시, 파괴와 보상은 모른다. 규칙이 바뀌어도 이 파일은 그대로다.
namespace PatternGallery.FacadeHitResolution
{
    /// <summary>하린의 총: 맨 앞의 살아 있는 드론</summary>
    public sealed class Gun
    {
        public const int DefaultDamage = 4;

        public int Damage = DefaultDamage;
        readonly CombatSystem combat;
        readonly DroneField field;

        public Gun(CombatSystem combat, DroneField field)
        {
            this.combat = combat;
            this.field = field;
        }

        public bool Fire() => combat.Hit("Gun", field.FrontAlive(), Damage); // [1]
    }

    /// <summary>땅의 함정: 함정 위에 선 드론 (D1 자리)</summary>
    public sealed class Trap
    {
        public int Damage = 5;
        readonly CombatSystem combat;
        readonly DroneField field;

        public Trap(CombatSystem combat, DroneField field)
        {
            this.combat = combat;
            this.field = field;
        }

        public bool Trigger() => combat.Hit("Trap", field.OnTrap(), Damage); // [1]
    }

    /// <summary>정비 드론의 전기 충격: 중장갑 드론 (D3)</summary>
    public sealed class ShockDrone
    {
        public int Damage = 6;
        readonly CombatSystem combat;
        readonly DroneField field;

        public ShockDrone(CombatSystem combat, DroneField field)
        {
            this.combat = combat;
            this.field = field;
        }

        public bool Zap() => combat.Hit("ShockDrone", field.Heavy, Damage); // [1]
    }
}
