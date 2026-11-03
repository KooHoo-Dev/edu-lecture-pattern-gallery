// 씬을 넘어 사는 매니저의 베이스: Awake 에서 자리를 요청하고, 지면 스스로 파괴하고, 이기면 DontDestroyOnLoad 로 옮긴다.
// 수업 프로젝트의 SingletonBase 자리에 넣거나 나란히 둔다. 매니저는 class SoundManager : PersistentSingleton<SoundManager> 처럼 쓴다.
using UnityEngine;

namespace PatternGallery.SingletonSceneManagers
{
    public abstract class PersistentSingleton<T> : MonoBehaviour where T : PersistentSingleton<T>
    {
        // 제네릭 클래스의 static 은 T 마다 따로 생긴다 (SoundManager 자리, CreditBank 자리)
        static readonly SingleSlot<T> slot = new SingleSlot<T>();

        /// <summary>지금 주인. 없으면 null. 부르는 쪽은 null 이면 부르지 않는다</summary>
        public static T Instance => slot.Current;
        public static bool HasInstance => !slot.IsEmpty;

        /// <summary>이 컴포넌트가 자리의 주인인가. Destroy 를 예약한 복제본도 OnEnable 까지는 불리므로 거기서 확인한다</summary>
        protected bool IsInstance => ReferenceEquals(slot.Current, this);

        protected virtual void Awake()
        {
            if (!slot.TryClaim((T)this)) // [1] Awake 에서 자리를 요청한다
            {
                Destroy(gameObject); // [2] 늦게 온 복제본은 스스로 파괴한다. 실제 파괴는 이 프레임 끝이다
                return; // [2] 빼먹으면 아래 줄(DontDestroyOnLoad, 초기화)이 복제본에서도 돈다
            }
            // 루트 오브젝트에만 동작한다. 부모가 있으면 Unity 는 경고만 남기고 옮기지 않아 씬과 함께 파괴된다
            if (transform.parent != null)
                Debug.LogError($"[{typeof(T).Name}] DontDestroyOnLoad 는 루트 오브젝트에만 동작한다. 이 매니저를 Hierarchy 맨 위 단계로 옮긴다", this);
            DontDestroyOnLoad(gameObject); // 이긴 것만 씬을 넘어 산다
            OnClaimed();
        }

        /// <summary>자리를 차지했을 때만 불린다. 초기화는 Awake 를 덮어쓰지 말고 여기서 한다</summary>
        protected virtual void OnClaimed() { }

        // 파생 클래스에서 void OnDestroy() 를 새로 쓰면 이 메서드가 가려져 Release 가 빠진다 (CS0114).
        // protected override void OnDestroy() 로 쓰고 base.OnDestroy() 를 부른다
        protected virtual void OnDestroy()
        {
            slot.Release((T)this); // 주인일 때만 비운다. 복제본이 파괴될 때는 아무 일도 없다
        }
    }
}
