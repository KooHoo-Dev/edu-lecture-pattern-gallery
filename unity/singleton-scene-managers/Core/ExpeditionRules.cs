// 게임 규칙: 크레딧(씬을 넘어 유지), 이번 탐사의 회로 조각(씬과 함께 사라짐), 조각을 크레딧으로 바꾸는 정산. UnityEngine 을 쓰지 않는다.
// 정산하는 쪽은 탐사 기록이 없으면(탐사 매니저 자리가 비어 있으면) 받지 않고 이벤트로 알린다.
using System;

namespace PatternGallery.SingletonSceneManagers
{
    /// <summary>크레딧 잔액. CreditBank 가 들고 씬을 넘어 산다</summary>
    public sealed class Credits
    {
        public int Balance { get; private set; }

        /// <summary>잔액이 바뀔 때 (이전, 지금)</summary>
        public event Action<int, int> Changed;

        public Credits(int start)
        {
            Balance = Math.Max(0, start);
        }

        public void Deposit(int amount)
        {
            if (amount <= 0) return;
            int previous = Balance;
            Balance += amount;
            Changed?.Invoke(previous, Balance);
        }
    }

    /// <summary>이번 탐사의 기록. ExpeditionManager 가 들고 탐사 구역 씬과 함께 사라진다</summary>
    public sealed class Expedition
    {
        /// <summary>회로 조각 하나의 크레딧</summary>
        public int FragmentValue;
        public int Fragments { get; private set; }

        /// <summary>조각 수가 바뀔 때 (지금 조각 수)</summary>
        public event Action<int> Changed;

        public Expedition(int fragmentValue)
        {
            FragmentValue = fragmentValue;
        }

        public void Pickup()
        {
            Fragments++;
            Changed?.Invoke(Fragments);
        }

        /// <summary>모은 조각을 모두 꺼낸다 (꺼낸 수)</summary>
        public int TakeAll()
        {
            int taken = Fragments;
            if (taken == 0) return 0;
            Fragments = 0;
            Changed?.Invoke(Fragments);
            return taken;
        }
    }

    /// <summary>정산: 탐사 기록의 조각을 크레딧으로 바꿔 은행에 넣는다</summary>
    public sealed class Settlement
    {
        /// <summary>정산했을 때 (조각 수, 넣은 크레딧)</summary>
        public event Action<int, int> Settled;
        /// <summary>정산을 받지 않았을 때 (까닭)</summary>
        public event Action<string> Refused;

        /// <summary>탐사 기록이 없으면 받지 않고 false. 부르는 쪽은 자리가 비었으면 null 을 넘긴다</summary>
        public bool Settle(Expedition expedition, Credits bank) // [4]
        {
            if (expedition == null) // [4] 자리가 비어 있으면 부르지 않는다
            {
                Refused?.Invoke("탐사 구역에서만 정산");
                return false;
            }
            if (bank == null)
            {
                Refused?.Invoke("크레딧 은행이 없다");
                return false;
            }
            int fragments = expedition.TakeAll();
            int credits = fragments * expedition.FragmentValue;
            bank.Deposit(credits);
            Settled?.Invoke(fragments, credits);
            return true;
        }
    }
}
