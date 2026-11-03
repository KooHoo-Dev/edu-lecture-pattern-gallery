// 나쁜 예: Awake 에서 Instance = this; DontDestroyOnLoad(gameObject); 만 하는 흔한 싱글턴. 중복 검사가 없고,
// 씬 종속 매니저(ExpeditionManager)는 OnDestroy 에서 Instance 를 비우지 않는다. 정산하는 쪽은 Instance 를 바로 부른다.
// 실제로는 모두 MonoBehaviour 다. Unity 없이 돌리려고 다음을 표시 필드로 흉내 낸다.
//   KeptOnLoad = true      실제로는 DontDestroyOnLoad(gameObject)
//   Playing = true         실제로는 AudioSource.Play() (BGM)
//   Destroyed              씬 언로드로 파괴된 상태. 파괴된 컴포넌트의 C# 메서드를 부르는 것 자체는 실행되고,
//                          그 안에서 파괴된 Text 를 건드리는 줄(countLabel.text = …)에서 MissingReferenceException 이 난다. 그 줄을 throw 로 흉내 낸다
//   InField                실제로는 SceneManager.GetActiveScene().name == fieldScene
// static Instance 는 Play 를 다시 시작해도 남을 수 있어(도메인 리로드를 끈 경우) 하네스가 시나리오마다 비운다.
// 갤러리의 '효과 끄기' 가 같은 입력으로 돌린다. 프로젝트에 넣지 않는다.
using System;

namespace PatternGallery.SingletonSceneManagers.Naive
{
    public sealed class NaiveSoundManager
    {
        public static NaiveSoundManager Instance;
        public bool KeptOnLoad;
        public bool Playing;

        public void Awake()
        {
            Instance = this; // [!] 중복 검사 없이 덮어쓴다. 기지 씬을 다시 열 때마다 하나 더 생긴다
            KeptOnLoad = true; // [!] DontDestroyOnLoad(gameObject): 늘어난 복제본도 모두 살아남아 BGM 이 겹친다
            Playing = true;
        }
    }

    public sealed class NaiveCreditBank
    {
        public static NaiveCreditBank Instance;
        public int startCredits;
        public int Credits;
        public bool KeptOnLoad;

        public void Awake()
        {
            Instance = this; // [!] 기지에 돌아올 때 새로 생긴 은행이 Instance 를 가져간다 (크레딧은 시작 값)
            KeptOnLoad = true;
            Credits = startCredits;
        }

        public void Deposit(int amount) => Credits += amount;
    }

    public sealed class NaiveExpeditionManager
    {
        public static NaiveExpeditionManager Instance;
        public int fragmentValue;
        public int Fragments;
        public bool Destroyed;

        public void Awake() => Instance = this; // [!] 씬 종속인데 OnDestroy 에서 Instance 를 비우지 않는다. 씬이 바뀌면 파괴된 매니저를 가리킨다

        public void Pickup()
        {
            Fragments++;
            ShowCount();
        }

        public int TakeAll()
        {
            int credits = Fragments * fragmentValue;
            Fragments = 0;
            ShowCount();
            return credits;
        }

        void ShowCount()
        {
            // 실제로는 다음 줄의 countLabel.text = … 에서 던진다 (Text 는 탐사 구역 씬과 함께 파괴됐다)
            if (Destroyed) throw new InvalidOperationException("MissingReferenceException: 파괴된 ExpeditionManager 의 Text 를 건드렸다");
        }
    }

    /// <summary>씬 전환·줍기·정산 입력을 받는 쪽. 매니저를 Instance 로 바로 부른다</summary>
    public sealed class NaiveExpeditionInput
    {
        public bool InField;

        public void Pickup()
        {
            if (!InField) return;
            NaiveExpeditionManager.Instance.Pickup();
        }

        public void Settle()
        {
            int credits = NaiveExpeditionManager.Instance.TakeAll(); // [!] 씬과 함께 파괴된 매니저를 부른다. 예외가 나면 아래 줄은 실행되지 않는다
            NaiveCreditBank.Instance.Deposit(credits);
        }
    }
}
