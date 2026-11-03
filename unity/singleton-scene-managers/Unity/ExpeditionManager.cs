// 탐사 매니저: 지표 탐사 구역 씬에만 있고 씬과 함께 사라진다. 이번 탐사의 회로 조각 수(코어 Expedition)를 든다.
// DontDestroyOnLoad 를 하지 않는다. PersistentSingleton 으로 만들었다면 첫 탐사의 매니저가 남고 다음 탐사의 매니저는
// 복제본으로 파괴되어, 지난 탐사의 조각이 다음 탐사에 남는다.
// 정산하지 않은 조각은 씬과 함께 사라진다 (의도된 동작). 버그로 보이지 않게 OnDestroy 에서 Console 에 남긴다.
using UnityEngine;

namespace PatternGallery.SingletonSceneManagers
{
    public class ExpeditionManager : SceneSingleton<ExpeditionManager>
    {
        [Tooltip("회로 조각 하나의 크레딧")]
        [SerializeField] int fragmentValue = 30;

        Expedition expedition;

        public Expedition Expedition => expedition ??= new Expedition(fragmentValue);

        void OnEnable()
        {
            if (!IsInstance) return;
            Expedition.Changed += OnChanged;
        }

        void OnDisable()
        {
            if (expedition != null) expedition.Changed -= OnChanged;
        }

        // void OnDestroy() 로 새로 쓰면 베이스의 OnDestroy(Release)가 가려진다 (CS0114). override 하고 base 를 부른다
        protected override void OnDestroy()
        {
            if (IsInstance && expedition != null && expedition.Fragments > 0) // [3] 주인이 정산하지 않은 조각을 들고 사라질 때
                Debug.Log($"[Expedition] 파괴: 정산하지 않은 회로 조각 {expedition.Fragments}개가 씬과 함께 사라진다", this);
            base.OnDestroy(); // [3] 자리를 비운다
        }

        void OnValidate()
        {
            if (expedition != null) expedition.FragmentValue = fragmentValue;
        }

        void OnChanged(int fragments) => Debug.Log($"[Expedition] 회로 조각 {fragments}개", this);
    }
}
