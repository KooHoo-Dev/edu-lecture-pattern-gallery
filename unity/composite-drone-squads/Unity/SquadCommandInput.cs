// 본대 지휘 어댑터: Input System 입력을 본대(트리의 뿌리) 하나에 넘긴다. 받는 쪽이 드론인지 편대인지, 트리가 몇 단계인지 모른다.
// 트리는 처음 읽을 때 Hierarchy 에서 만들고(SquadNode), 매 프레임 본대의 Tick 하나로 트리 안 모든 드론을 움직인다.
// 화면 글과 Console 기록은 코어 이벤트 핸들러에서 바로 바꾼다. 게임 규칙은 여기 없다 (Core/ 의 Squad, Drone).
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.CompositeDroneSquads
{
    [RequireComponent(typeof(SquadNode))]
    public class SquadCommandInput : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름. Play 중에 바꿔도 반영된다)")]
        [Tooltip("모든 드론의 비행 속도 (m/s)")]
        [Range(1.5f, 6f)]
        [SerializeField] float flySpeed = 3f;
        [Tooltip("기지 자리에서 정찰 지점까지의 가로 거리 (m). 지원 편대 C 의 드론은 여기에 자기 Extra Reach 를 더 간다")]
        [Range(4f, 7f)]
        [SerializeField] float patrolDistance = 5f;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다)")]
        [SerializeField] InputAction sortieAction;
        [SerializeField] InputAction recallAction;
        [SerializeField] InputAction joinAction;

        [Header("합류")]
        [Tooltip("지원 편대를 받을 편대. 본대 아래에 있는 편대 B")]
        [SerializeField] SquadNode joinTarget;
        [Tooltip("합류할 지원 편대 C. 처음에는 본대 밖(Hierarchy 맨 위)에 둔다. 비우면 C 의 트리를 만들지 않아 C 의 드론이 놓인 자리에서 움직이지 않는다")]
        [SerializeField] SquadNode supportSquad;

        [Tooltip("코어 이벤트를 Console 에 웹의 사건 기록과 같은 글로 남긴다")]
        [SerializeField] bool logEvents = true;

        FlightSettings settings;
        Squad root;

        // 확인용 글 (IMGUI). 이벤트 핸들러에서 만들고 OnGUI 는 그리기만 한다
        string countLine = "";
        string dockedLine = "";
        GUIStyle style;

        /// <summary>모든 드론이 같이 쓰는 규칙 값. 본대와 지원 편대가 같은 객체를 쓴다</summary>
        public FlightSettings Settings => settings ??= new FlightSettings { FlySpeed = flySpeed, PatrolDistance = patrolDistance };

        /// <summary>
        /// 처음 읽을 때 Hierarchy 에서 본대 트리를 만든다. 지원 편대도 같은 설정으로 따로 만들어 둔다 (합류 전에는 본대 밖이다).
        /// 다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게 Awake 에서 만들지 않는다
        /// </summary>
        public Squad Root
        {
            get
            {
                if (root != null) return root;
                root = GetComponent<SquadNode>().BuildSquad(Settings);
                if (supportSquad != null) supportSquad.BuildSquad(Settings);
                return root;
            }
        }

        /// <summary>지원 편대를 받을 편대의 코어. 칸이 비었거나 본대 밖에 있으면 null</summary>
        Squad JoinTargetSquad => Root != null && joinTarget != null ? joinTarget.Squad : null;

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            sortieAction = new InputAction("Sortie", InputActionType.Button, "<Keyboard>/q");
            recallAction = new InputAction("Recall", InputActionType.Button, "<Keyboard>/w");
            joinAction = new InputAction("Join", InputActionType.Button, "<Keyboard>/e");
        }

        void OnEnable()
        {
            Root.OrderReceived += OnOrderReceived;
            Root.Arrived += OnArrived;
            Squad target = JoinTargetSquad;
            if (target != null)
            {
                target.Joined += OnJoined;
                target.JoinRejected += OnJoinRejected;
            }
            sortieAction.performed += OnSortie;
            recallAction.performed += OnRecall;
            joinAction.performed += OnJoin;
            sortieAction.Enable();
            recallAction.Enable();
            joinAction.Enable();
            RebuildLines(); // 이벤트로만 맞추는 글이라, 켜질 때 지금 코어 상태로 한 번 맞춘다
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 두 번 처리된다
            Root.OrderReceived -= OnOrderReceived;
            Root.Arrived -= OnArrived;
            Squad target = JoinTargetSquad;
            if (target != null)
            {
                target.Joined -= OnJoined;
                target.JoinRejected -= OnJoinRejected;
            }
            sortieAction.performed -= OnSortie;
            recallAction.performed -= OnRecall;
            joinAction.performed -= OnJoin;
            sortieAction.Disable();
            recallAction.Disable();
            joinAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어 설정에 넣는다. 편집 중에는 코어를 만들지 않는다
            if (settings == null) return;
            settings.FlySpeed = flySpeed;
            settings.PatrolDistance = patrolDistance;
        }

        void OnSortie(InputAction.CallbackContext _) => Root.Sortie(); // [1] 본대 하나에 보낸다. 트리가 몇 단계인지 모른다
        void OnRecall(InputAction.CallbackContext _) => Root.Recall(); // [1]

        void OnJoin(InputAction.CallbackContext _)
        {
            if (joinTarget == null || supportSquad == null) return;
            joinTarget.Join(supportSquad); // 코어 Add 와 Hierarchy SetParent 를 함께. 결과는 Joined, JoinRejected 로 온다
        }

        void Update()
        {
            Root.Tick(Time.deltaTime); // 본대 Tick 하나가 편대를 거쳐 모든 드론에 내려간다
        }

        void OnOrderReceived(IUnit unit, Order order)
        {
            RebuildLines();
            Log($"{OrderName(order)} → {Path(unit)}");
        }

        void OnArrived(Drone drone)
        {
            RebuildLines();
            Log(drone.Status == DroneStatus.Patrolling ? $"{drone.Name} 정찰 지점 도착" : $"{drone.Name} 기지 도착");
        }

        void OnJoined(Squad squad, IUnit unit)
        {
            RebuildLines();
            Log($"합류: {unit.Name} → {squad.Name} 의 하위 편대 (Joined)");
            Log($"편대 드론 수 {Root.CountDrones()} (CountDrones)");
        }

        void OnJoinRejected(Squad squad, IUnit unit, string reason) => Log($"합류 거절: {reason} (JoinRejected)");

        static string OrderName(Order order) => order == Order.Sortie ? "출격" : "귀환";

        /// <summary>본대에서 이 유닛까지의 길 (본대/B/C/D4)</summary>
        static string Path(IUnit unit)
        {
            string path = unit.Name;
            for (Squad s = unit.Parent; s != null; s = s.Parent) path = $"{s.Name}/{path}";
            return path;
        }

        void RebuildLines()
        {
            int total = Root.CountDrones(); // 트리 전체에 같은 질문 하나. 몇 단계든 잎까지 센다
            countLine = $"편대 드론 수 {total}";
            dockedLine = $"기지 도착 {Root.CountDocked()} / 전체 {total}";
        }

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[Squad] {message}", this);
        }

        void OnGUI()
        {
            style ??= new GUIStyle(GUI.skin.label) { fontSize = 18 };
            GUI.Label(new Rect(12, 10, 480, 28), countLine, style);
            GUI.Label(new Rect(12, 38, 480, 28), dockedLine, style);
        }
    }
}
