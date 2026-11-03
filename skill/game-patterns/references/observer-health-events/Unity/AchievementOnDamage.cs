// 업적: 누적 피해가 기준 이상이 되면 알림 창을 켠다. 플레이어 코드는 이 컴포넌트를 모른다.
// 항상 켜진 오브젝트(Canvas 등)에 붙이고, 꺼 둔 알림 창을 Toast 칸에 넣는다 (꺼진 오브젝트에 붙이면 OnEnable 이 돌지 않아 구독하지 않는다).
using UnityEngine;

namespace PatternGallery.ObserverHealthEvents
{
    public class AchievementOnDamage : MonoBehaviour
    {
        [SerializeField] PlayerHealth target;
        [SerializeField] int achievementDamage = 60;
        [Tooltip("해금되면 켜는 알림 창 (없으면 Console 에만 남긴다)")]
        [SerializeField] GameObject toast;

        readonly DamageAchievement achievement = new DamageAchievement();

        void OnEnable()
        {
            achievement.Threshold = achievementDamage;
            achievement.Unlocked += OnUnlocked;
            achievement.Bind(target.Health);
        }

        void OnDisable()
        {
            achievement.Unbind();
            achievement.Unlocked -= OnUnlocked;
        }

        void OnUnlocked()
        {
            Debug.Log("[업적] 버텨 낸 탐사대장", this);
            if (toast != null) toast.SetActive(true);
        }
    }
}
