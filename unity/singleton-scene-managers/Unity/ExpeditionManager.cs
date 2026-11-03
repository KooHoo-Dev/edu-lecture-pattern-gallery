// 탐사 매니저: 지표 탐사 구역 씬에만 있고 씬과 함께 사라진다. 이번 탐사의 회로 조각 수(코어 Expedition)를 든다.
// DontDestroyOnLoad 를 하지 않는다. 했다면 지난 탐사의 조각이 다음 탐사에 남는다.
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

        void OnValidate()
        {
            if (expedition != null) expedition.FragmentValue = fragmentValue;
        }

        void OnChanged(int fragments) => Debug.Log($"[Expedition] 회로 조각 {fragments}개", this);
    }
}
