// 씬과 함께 사라지는 매니저의 베이스: 규칙은 PersistentSingleton 과 같고 DontDestroyOnLoad 만 없다.
// 씬이 언로드되면 OnDestroy 에서 자리를 비운다. 그래서 다른 씬에서 Instance 는 파괴된 매니저가 아니라 null 이다.
using UnityEngine;

namespace PatternGallery.SingletonSceneManagers
{
    public abstract class SceneSingleton<T> : MonoBehaviour where T : SceneSingleton<T>
    {
        static readonly SingleSlot<T> slot = new SingleSlot<T>();

        /// <summary>지금 씬의 주인. 다른 씬이면 null</summary>
        public static T Instance => slot.Current;
        public static bool HasInstance => !slot.IsEmpty;

        protected bool IsInstance => ReferenceEquals(slot.Current, this);

        protected virtual void Awake()
        {
            if (!slot.TryClaim((T)this)) // [1]
            {
                Destroy(gameObject); // [2] 같은 씬에 둘을 놓았거나 씬을 Additive 로 두 번 열었을 때
                return; // [2]
            }
            OnClaimed();
        }

        protected virtual void OnClaimed() { }

        // 파생 클래스는 protected override void OnDestroy() 로 쓰고 base.OnDestroy() 를 부른다 (ExpeditionManager 참고)
        protected virtual void OnDestroy()
        {
            slot.Release((T)this); // [3] 씬 종속 매니저는 OnDestroy 에서 자리를 비운다. 빼먹으면 Instance 가 파괴된 매니저를 가리킨다
        }
    }
}
