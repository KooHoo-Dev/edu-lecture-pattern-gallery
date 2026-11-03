// 나쁜 예: Awake 에서 Instance = this; DontDestroyOnLoad(gameObject); 만 하는 흔한 싱글턴. 중복 검사가 없고,
// 씬 종속 매니저(ExpeditionManager)는 OnDestroy 에서 Instance 를 비우지 않는다. 정산하는 쪽은 Instance 를 바로 부른다.
// 실제로는 모두 MonoBehaviour 다. Unity 없이 돌리려고 다음을 표시 필드로 흉내 낸다.
//   KeptOnLoad = true      실제로는 DontDestroyOnLoad(gameObject)
//   Playing = true         실제로는 AudioSource.Play() (BGM)
//   Destroyed              씬 언로드로 파괴된 상태. 파괴된 컴포넌트를 static 참조로 부르는 것만으로는 예외가 나지 않는다
//                          (C# 메서드는 그대로 실행된다. Unity 의 가짜 null 은 == 와 bool 변환에서만 동작한다).
//   NaiveLabel             실제로는 같은 씬에 놓인 UI Text (조각 수 표시). 씬과 함께 파괴되면 Destroyed 가 켜지고,
//                          그 text 를 바꾸는 줄(countLabel.text = …)에서 MissingReferenceException 이 난다. 그 예외를 throw 로 흉내 낸다.
//                          그 줄이 없으면 실제 Unity 에서는 예외 없이 지난 탐사의 조각이 새 은행에 조용히 들어간다
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

    /// <summary>실제로는 UnityEngine.UI.Text. 탐사 구역 씬에 놓여 씬과 함께 파괴된다</summary>
    public sealed class NaiveLabel
    {
        public bool Destroyed;
        string shown = "";

        public string text
        {
            get => shown;
            set
            {
                // 흉내: 파괴된 Text 의 text 를 바꾸면 Unity 가 MissingReferenceException 을 던진다
                if (Destroyed) throw new InvalidOperationException("MissingReferenceException: 파괴된 ExpeditionManager 의 Text 를 건드렸다");
                shown = value;
            }
        }
    }

    public sealed class NaiveExpeditionManager
    {
        public static NaiveExpeditionManager Instance;
        public int fragmentValue;
        public NaiveLabel countLabel = new NaiveLabel(); // 실제로는 [SerializeField] Text countLabel
        public int Fragments;
        public bool Destroyed;

        public void Awake() => Instance = this; // [!] 씬 종속인데 OnDestroy 에서 Instance 를 비우지 않는다. 씬이 바뀌면 파괴된 매니저를 가리킨다

        public void Pickup()
        {
            Fragments++;
            countLabel.text = "회로 조각 " + Fragments;
        }

        /// <summary>정산: 조각을 크레딧으로 바꿔 돌려주고 조각 수 표시를 0 으로</summary>
        public int TakeAll()
        {
            int credits = Fragments * fragmentValue;
            Fragments = 0;
            countLabel.text = "회로 조각 0"; // [!] 매니저가 파괴됐으면 함께 파괴된 Text 를 건드리는 이 줄에서 MissingReferenceException. 이 줄이 없으면 예외 없이 지난 조각이 정산된다
            return credits;
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
            int credits = NaiveExpeditionManager.Instance.TakeAll(); // [!] 씬과 함께 파괴된 매니저를 부른다. 부르는 것 자체는 되고, 안의 Text 줄에서 예외가 나면 아래 줄은 실행되지 않는다
            NaiveCreditBank.Instance.Deposit(credits);
        }
    }
}
