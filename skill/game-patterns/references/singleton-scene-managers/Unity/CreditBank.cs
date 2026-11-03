// 크레딧 은행: 씬을 넘어 하나만 산다. 코어 Credits 를 들고, 잔액이 바뀌면 그 자리에서 Console 에 남긴다.
using UnityEngine;

namespace PatternGallery.SingletonSceneManagers
{
    public class CreditBank : PersistentSingleton<CreditBank>
    {
        [Tooltip("처음 차지한 은행의 시작 크레딧. 복제본의 값은 쓰이지 않는다. Play 중에 바꾸면 다음 실행부터 반영된다")]
        [SerializeField] int startCredits = 0;

        Credits credits;

        /// <summary>
        /// 처음 읽을 때 만든다 (표본 공통 규칙). 다른 오브젝트는 CreditBank.Instance 로만 닿는데 Instance 는 이 오브젝트의
        /// Awake(TryClaim) 전에는 null 이라, 그 경우는 부르는 쪽의 null 확인이 막는다. 지연 생성이 맡는 것은 그 밖의 경우다:
        /// 주인이 된 뒤 처음 읽는 곳(자기 OnEnable)에서 만들고, 주인이 아닌 복제본은 읽지 않으므로 만들지 않는다.
        /// </summary>
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
