// 나쁜 예: 총, 함정, 전기 충격 코드가 명중 처리 다섯 단계(계산, 표시, 적용, 알림, 파괴)를 각자 복사해 들고 있다. 흔한 코드다.
// 총 코드를 먼저 짜고 함정과 전기 충격에 복사했다. 방어력 규칙은 나중에 생겨 그때 고친 곳에만 들어갔다.
// 실제로는 모두 MonoBehaviour 이고, removed = true 는 Destroy(target.gameObject) 를, removed 검사는 Unity 의 if (target == null) 을 흉내 낸다.
// Destroy 가 프레임 끝까지 미뤄지는 지연은 흉내 내지 않는다 (removed 는 바로 선다).
// Unity 없이 돌리려고 순수 C# 로 옮겼다. 갤러리의 '효과 끄기' 가 같은 입력으로 돌린다. 프로젝트에 넣지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.FacadeHitResolution.Naive
{
    public sealed class NaiveDrone
    {
        public string name;
        public int maxHp = 10;
        public int hp = 10;
        public int armor;
        public int reward = 10;
        /// <summary>Destroy(gameObject) 를 흉내 낸다. 프레임 끝 지연은 흉내 내지 않는다</summary>
        public bool removed;
    }

    /// <summary>드론 목록 (씬의 드론 매니저)</summary>
    public sealed class NaiveField
    {
        public readonly List<NaiveDrone> drones = new List<NaiveDrone>();
        public int trapSlot;
        public int heavySlot = 2;

        /// <summary>맨 앞에서 HP 가 남은 드론. 코어의 FrontAlive(파괴되지 않은 드론)와 이름은 같지만 뜻이 다르다</summary>
        public NaiveDrone FrontAlive()
        {
            foreach (NaiveDrone d in drones)
                if (!d.removed && d.hp > 0) return d;
            return null;
        }

        public NaiveDrone OnTrap() => drones[trapSlot].removed ? null : drones[trapSlot];
        public NaiveDrone Heavy() => drones[heavySlot].removed ? null : drones[heavySlot];
        public void Remove(NaiveDrone d) => d.removed = true;
    }

    /// <summary>드론 위 피해 숫자</summary>
    public sealed class NaiveDamagePopup
    {
        public int count;
        public NaiveDrone lastTarget;
        public int lastAmount;

        public void Show(NaiveDrone target, int amount)
        {
            count++;
            lastTarget = target;
            lastAmount = amount;
        }
    }

    /// <summary>피격 알림 (번쩍임, 소리)</summary>
    public sealed class NaiveHitFlash
    {
        public int count;
        public void Play(NaiveDrone target) => count++;
    }

    /// <summary>크레딧 지갑</summary>
    public sealed class NaiveWallet
    {
        public int credits;
        public void Add(int amount) => credits += amount;
    }

    public sealed class NaiveGun
    {
        public int damage = 4;
        public NaiveField field;
        public NaiveDamagePopup popup;
        public NaiveHitFlash flash;
        public NaiveWallet wallet;

        public void Fire()
        {
            NaiveDrone target = field.FrontAlive();
            if (target == null) return;
            int dmg = Math.Max(1, damage - target.armor); // 방어력 규칙: 나중에 생겨 여기에 더했다
            popup.Show(target, dmg);
            target.hp = Math.Max(0, target.hp - dmg);
            flash.Play(target);
            if (target.hp <= 0)
            {
                wallet.Add(target.reward);
                field.Remove(target);
            }
        }
    }

    public sealed class NaiveTrap
    {
        public int damage = 5;
        public NaiveField field;
        public NaiveDamagePopup popup;
        public NaiveHitFlash flash;
        public NaiveWallet wallet;

        public void Trigger()
        {
            NaiveDrone target = field.OnTrap();
            if (target == null) return;
            int dmg = Math.Max(1, damage - target.armor); // 방어력 규칙: 총과 함께 여기에도 더했다
            popup.Show(target, dmg);
            target.hp = Math.Max(0, target.hp - dmg);
            flash.Play(target); // [!] 여기서 HP 0 이면 보상하고 Remove 하는 파괴 단계를 빠뜨렸다
        }
    }

    public sealed class NaiveShockDrone
    {
        public int damage = 6;
        public NaiveField field;
        public NaiveDamagePopup popup;
        public NaiveHitFlash flash;
        public NaiveWallet wallet;

        public void Zap()
        {
            NaiveDrone target = field.Heavy();
            if (target == null) return;
            int dmg = damage; // [!] 방어력 빼기를 빠뜨렸다 (총·함정에만 더했다)
            popup.Show(target, dmg);
            target.hp = Math.Max(0, target.hp - dmg);
            flash.Play(target);
            if (target.hp <= 0)
            {
                wallet.Add(target.reward);
                field.Remove(target);
            }
        }
    }
}
