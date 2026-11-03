// 크레딧 은행: 씬을 넘어 하나만 산다. 코어 Credits 를 들고, 잔액이 바뀌면 그 자리에서 Console 에 남긴다.
using UnityEngine;

namespace PatternGallery.SingletonSceneManagers
{
    public class CreditBank : PersistentSingleton<CreditBank>
    {
        [Tooltip("처음 차지한 은행의 시작 크레딧. 복제본의 값은 쓰이지 않는다. Play 중에 바꾸면 다음 실행부터 반영된다")]
        [SerializeField] int startCredits = 0;

        Credits credits;

        /// <summary>처음 읽을 때 만든다. 다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게</summary>
        public Credits Credits => credits ??= new Credits(startCredits);

        void OnEnable()
        {
            if (!IsInstance) return; // Destroy 를 예약한 복제본도 OnEnable 은 불린다. 주인만 구독한다
            Credits.Changed += OnChanged;
        }

        void OnDisable()
        {
            if (credits != null) credits.Changed -= OnChanged;
        }

        void OnChanged(int previous, int current) => Debug.Log($"[CreditBank] 크레딧 {previous} → {current}", this);
    }
}
