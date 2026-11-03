// 매니저 하나가 들어가는 자리: 먼저 온 것이 차지하고, 늦게 온 것은 거절되며, 주인만 자리를 비울 수 있다. UnityEngine 을 쓰지 않는다.
using System;

namespace PatternGallery.SingletonSceneManagers
{
    /// <summary>
    /// "하나만 둔다" 는 규칙만 맡는다. 누가 들어오는지(MonoBehaviour 인지)는 모른다.
    /// 비교는 일부러 참조 비교(ReferenceEquals)다. Unity 의 '파괴되면 null 처럼 보이는' 비교에 기대지 않고,
    /// 주인이 파괴될 때 Release 로 직접 비운다.
    /// </summary>
    public sealed class SingleSlot<T> where T : class
    {
        public T Current { get; private set; }
        public bool IsEmpty => Current == null;

        /// <summary>자리를 차지했을 때 (차지한 것)</summary>
        public event Action<T> Claimed;
        /// <summary>이미 주인이 있어 거절했을 때 (늦게 온 것, 지금 주인)</summary>
        public event Action<T, T> Rejected;
        /// <summary>주인이 자리를 비웠을 때 (비운 주인)</summary>
        public event Action<T> Released;

        /// <summary>비어 있으면 차지하고 true, 이미 주인이 있으면 false. 먼저 온 것이 이긴다</summary>
        public bool TryClaim(T candidate) // [1]
        {
            if (candidate == null) throw new ArgumentNullException(nameof(candidate));
            if (ReferenceEquals(Current, candidate)) return true; // 주인이 다시 요청하면 그대로
            if (Current != null) // [2] 먼저 온 주인이 있으면 늦게 온 쪽이 진다
            {
                Rejected?.Invoke(candidate, Current);
                return false; // [2]
            }
            Current = candidate; // [1]
            Claimed?.Invoke(candidate);
            return true;
        }

        /// <summary>주인일 때만 비운다. 거절된 복제본이 파괴되며 불러도 자리는 그대로다</summary>
        public void Release(T owner) // [3]
        {
            if (Current == null || !ReferenceEquals(Current, owner)) return; // [3]
            Current = null; // [3]
            Released?.Invoke(owner);
        }
    }
}
