// 하네스 어댑터: 퍼사드 코어(CombatSystem + 하위 시스템 + 공격하는 쪽 셋)와 나쁜 예(NaiveAttacks)를 시나리오 입력으로 돌린다.
// 패턴은 하위 시스템이 알리는 이벤트를 불린 순서대로 적는다. 나쁜 예는 이벤트가 없으므로 입력마다 상태를 비교해 적는다.
// 나쁜 예 옆에는 같은 입력을 받는 코어(그림자)를 두고 '있어야 할 결과' 로 상태 줄에 함께 적는다 (나쁜 예 코드에는 검사 코드를 넣지 않는다).
// 웹 sim(src/specimens/facade-hit-resolution/sim.ts)과 같은 글을 만든다.
using System;
using System.Collections.Generic;
using PatternGallery.FacadeHitResolution.Naive;
using PatternGallery.Truth;

namespace PatternGallery.FacadeHitResolution
{
    [SimTarget("facade-hit-resolution")]
    public sealed class Target : ISimTarget
    {
        readonly List<string> events = new List<string>();

        // 패턴 (나쁜 예 모드에서는 그림자: 사건은 적지 않는다)
        readonly DroneField field;
        readonly CombatSystem combat;
        readonly Gun gun;
        readonly Trap trap;
        readonly ShockDrone shock;

        // 나쁜 예
        readonly bool isNaive;
        readonly NaiveField nField;
        readonly NaiveDamagePopup popup;
        readonly NaiveHitFlash flash;
        readonly NaiveWallet wallet;
        readonly NaiveGun nGun;
        readonly NaiveTrap nTrap;
        readonly NaiveShockDrone nShock;
        readonly bool[] missingFlagged = new bool[3];

        public Target(Values v, bool isNaive)
        {
            this.isNaive = isNaive;
            int armor = v.Int("armor");
            int trapDamage = v.Int("trapDamage");
            int shockDamage = v.Int("shockDamage");

            field = DroneField.CreateDefault(armor);
            combat = new CombatSystem();
            gun = new Gun(combat, field) { Damage = Gun.DefaultDamage };
            trap = new Trap(combat, field) { Damage = trapDamage };
            shock = new ShockDrone(combat, field) { Damage = shockDamage };

            if (isNaive)
            {
                nField = new NaiveField { trapSlot = field.TrapSlot, heavySlot = field.HeavySlot };
                foreach (Drone d in field.All)
                    nField.drones.Add(new NaiveDrone { name = d.Name, maxHp = d.MaxHp, hp = d.MaxHp, armor = d.Armor, reward = d.Reward });
                popup = new NaiveDamagePopup();
                flash = new NaiveHitFlash();
                wallet = new NaiveWallet();
                nGun = new NaiveGun { damage = Gun.DefaultDamage, field = nField, popup = popup, flash = flash, wallet = wallet };
                nTrap = new NaiveTrap { damage = trapDamage, field = nField, popup = popup, flash = flash, wallet = wallet };
                nShock = new NaiveShockDrone { damage = shockDamage, field = nField, popup = popup, flash = flash, wallet = wallet };
                return;
            }

            combat.HitRequested += (a, d, b) => events.Add($"{a} → 창구 Hit({d.Name}, 기본 {b})");
            combat.HitRefused += (a, d) => events.Add(d == null ? $"{a} → 창구: 대상 없음, 받지 않는다" : $"{a} → 창구: {d.Name} 이미 파괴됨, 받지 않는다");
            combat.Calculator.Calculated += (b, ar, f) => events.Add(Calc(b, ar, f));
            combat.Feed.DamageShown += (d, n) => events.Add($"표시 {d.Name} -{n}");
            foreach (Drone d in field.All) d.HpChanged += (x, before, after) => events.Add($"적용 {x.Name} HP {before} → {after}");
            combat.Feed.HitTaken += (a, d) => events.Add($"알림 {d.Name} 피격 ({a})");
            combat.Wreckage.Destroyed += d => events.Add($"파괴 {d.Name} (화면에서 뺀다)");
            combat.Wreckage.RewardGranted += (d, r, total) => events.Add($"보상 +{r} 크레딧 (합 {total})");
        }

        static string Calc(int b, int armor, int final) => b - armor >= DamageCalculator.MinDamage
            ? $"계산 {b} - 방어 {armor} = {final}"
            : $"계산 {b} - 방어 {armor} → 최소 {final}";

        static string Who(string input) => input == "shot" ? "Gun" : input == "trap" ? "Trap" : "ShockDrone";

        /// <summary>코어에 입력을 넣는다 (나쁜 예 모드에서는 그림자)</summary>
        void CoreInput(string name)
        {
            switch (name)
            {
                case "shot": gun.Fire(); break;
                case "trap": trap.Trigger(); break;
                case "shock": shock.Zap(); break;
            }
        }

        public void Input(string name)
        {
            CoreInput(name);
            if (!isNaive) return;

            int shown0 = popup.count;
            int flashed0 = flash.count;
            int credits0 = wallet.credits;
            var hp0 = new int[nField.drones.Count];
            var removed0 = new bool[nField.drones.Count];
            for (int i = 0; i < hp0.Length; i++)
            {
                hp0[i] = nField.drones[i].hp;
                removed0[i] = nField.drones[i].removed;
            }

            string who = Who(name);
            int baseDamage;
            switch (name)
            {
                case "shot": baseDamage = nGun.damage; nGun.Fire(); break;
                case "trap": baseDamage = nTrap.damage; nTrap.Trigger(); break;
                case "shock": baseDamage = nShock.damage; nShock.Zap(); break;
                default: return;
            }

            if (popup.count == shown0)
            {
                events.Add(name == "shot" ? "Gun 코드: 쏠 드론 없음 (return)"
                    : name == "trap" ? "Trap 코드: 함정 위에 드론 없음 (return)"
                    : "ShockDrone 코드: D3 없음 (target == null 이면 return)");
                return;
            }

            NaiveDrone d = popup.lastTarget;
            int k = nField.drones.IndexOf(d);
            events.Add($"{who} 코드 → {d.name} (다섯 단계를 직접)");
            events.Add($"표시 {d.name} -{popup.lastAmount}");
            events.Add($"적용 {d.name} HP {hp0[k]} → {d.hp}");
            if (flash.count > flashed0) events.Add($"알림 {d.name} 피격 ({who})");
            if (d.removed && !removed0[k]) events.Add($"파괴 {d.name} (화면에서 뺀다)");
            if (wallet.credits > credits0) events.Add($"보상 +{wallet.credits - credits0} 크레딧 (합 {wallet.credits})");

            int expected = Math.Max(DamageCalculator.MinDamage, baseDamage - d.armor);
            if (popup.lastAmount != expected)
                events.Add($"!방어력 무시: {d.name} 에 피해 {popup.lastAmount} 그대로 (방어력 {d.armor} 를 빼면 {expected})");
            if (d.hp == 0 && !d.removed && !missingFlagged[k])
            {
                missingFlagged[k] = true;
                events.Add($"!파괴 누락: {d.name} HP 0 인데 그대로 서 있다 (보상 +{d.reward} 도 없다)");
            }
        }

        public void Tick(float dt) { }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        static string Hp(Drone d) => d.IsDestroyed ? "gone" : d.Hp.ToString();
        static string Hp(NaiveDrone d) => d.removed ? "gone" : d.hp.ToString();

        public string Snapshot()
        {
            IReadOnlyList<Drone> all = field.All;
            string core = $"D1={Hp(all[0])} D2={Hp(all[1])} D3={Hp(all[2])}";
            if (!isNaive) return $"credits={combat.Wreckage.Credits} {core}";
            List<NaiveDrone> n = nField.drones;
            return $"credits={wallet.credits} D1={Hp(n[0])} D2={Hp(n[1])} D3={Hp(n[2])} ecredits={combat.Wreckage.Credits} e{core.Replace(" ", " e")}";
        }
    }
}
