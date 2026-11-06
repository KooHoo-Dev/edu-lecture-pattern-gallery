// 드론 연결 컴포넌트: 대상(플레이어) Transform 의 x 를 계층 상태 기계에 넘기고, 코어의 x·경계등·기절을 Transform, 경계등 오브젝트, 색, 화면 글에 옮긴다.
// 게임 규칙은 여기 없다. 순찰·수색·전투·기절의 규칙을 바꾸려면 Core/ 의 상태 클래스를 고친다.
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.HierarchicalStateEnemy
{
    public class DroneBrain : MonoBehaviour
    {
        [Header("조절 값 (웹에 있는 값은 같은 이름. Play 중에 바꿔도 반영된다)")]
        [Tooltip("대상이 가로(x) 거리 이 안에 들어오면 순찰·수색에서 추격으로 (m). 전투에서 수색으로 나가는 것은 이보다 CombatState.LoseMargin(0.5m) 더 멀어졌을 때다")]
        [SerializeField] float detectRange = 5f;
        [Tooltip("대상이 가로(x) 거리 이 안이면 멈춰서 충전하고 쏜다 (m). 다시 쫓는 것은 이보다 AttackState.LeaveMargin(0.5m) 더 멀어졌을 때다")]
        [SerializeField] float attackRange = 2.5f;
        [Tooltip("멈춘 뒤 한 발을 쏘기까지의 충전 시간 (초)")]
        [SerializeField] float chargeTime = 0.6f;
        [Tooltip("순찰, 수색, 추격의 이동 속도 (m/s)")]
        [SerializeField] float moveSpeed = 2.5f;
        [Tooltip("EMP 를 맞고 기절해 있는 시간 (초). 기절에 들어갈 때 한 번 읽으므로, 기절 중에 바꾸면 다음 기절부터 쓴다")]
        [SerializeField] float stunTime = 2f;
        [Tooltip("마지막으로 본 자리에 닿은 뒤 두리번거리는 시간 (초). 다 지나도 못 찾으면 순찰로. 매 프레임 비교하므로 수색 중에 바꿔도 바로 쓴다")]
        [SerializeField] float searchTime = 2f;

        [Header("연결")]
        [Tooltip("쫓을 대상 (수강생의 플레이어). x 좌표만 본다. 비어 있으면 아무도 감지하지 않고 순찰만 한다")]
        [SerializeField] Transform target;
        [Tooltip("드론 머리의 경계등 오브젝트 (드론의 자식으로 둔다). Combat(추격·공격)에 있는 동안 켜진다. 비어 있으면 화면 글로만 보인다")]
        [SerializeField] GameObject alertLight;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다)")]
        [Tooltip("시연용: 이 키로 드론에 EMP 를 맞힌다. 실제 게임에서는 EMP 탄의 명중 판정이 HitByEmp() 를 부른다")]
        [SerializeField] InputAction testEmpAction;

        [Header("화면")]
        [Tooltip("기절 중에 색을 바꿀 렌더러 (Sprite Renderer 나 Mesh Renderer). 컴포넌트를 붙일 때 Reset 이 이 오브젝트의 것을 넣는다")]
        [SerializeField] Renderer bodyRenderer;
        [SerializeField] Color stunnedColor = new Color(0.3f, 0.3f, 0.34f);
        [Tooltip("Game 뷰 왼쪽 위에 지금 상태 경로와 경계등을 글로 보인다 (IMGUI). 드론이 여럿이면 한 대만 켠다")]
        [SerializeField] bool showStatusOnScreen = true;
        [SerializeField] bool logEvents = true;

        StateMachine machine;
        /// <summary>코어 x 0 이 놓이는 월드 위치. 시작 자리가 코어의 시작 X(11)가 되게 Awake 에서 맞춘다</summary>
        Vector3 origin;
        Vector3 baseScale;
        /// <summary>기절이 끝나면 되돌릴 원래 색 (Awake 에서 읽는다)</summary>
        Color normalColor = Color.white;
        string statusText = "";

        /// <summary>
        /// 코어 상태 기계. 처음 읽을 때 만든다 (다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게).
        /// 드론별 값은 Machine.Drone 에 있다
        /// </summary>
        public StateMachine Machine => machine ??= new StateMachine(new Drone(MakeSettings()), DroneStates.Patrol);

        DroneSettings MakeSettings() => new DroneSettings
        {
            DetectRange = detectRange,
            AttackRange = attackRange,
            ChargeTime = chargeTime,
            MoveSpeed = moveSpeed,
            StunTime = stunTime,
            SearchTime = searchTime,
        };

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            testEmpAction = new InputAction("TestEmp", InputActionType.Button, "<Keyboard>/e");
            bodyRenderer = GetComponent<Renderer>();
        }

        void Awake()
        {
            baseScale = transform.localScale;
            // 코어의 순찰 구간은 9~13 이다. 지금 자리가 코어의 시작 X(11)가 되게 맞추면 이 자리 기준 왼쪽 2m, 오른쪽 2m 를 오간다
            origin = transform.position - new Vector3(Machine.Drone.X, 0f, 0f);
            if (bodyRenderer is SpriteRenderer sprite) normalColor = sprite.color;
            else if (bodyRenderer != null) normalColor = bodyRenderer.material.color;
        }

        void OnEnable()
        {
            Machine.Entered += OnEntered;
            Machine.Exited += OnExited;
            Machine.Handled += OnHandled;
            Machine.Ignored += OnIgnored;
            Machine.Drone.AlertChanged += OnAlertChanged;
            Machine.Drone.Fired += OnFired;
            Machine.Drone.Stunned += OnStunned;
            testEmpAction.performed += OnTestEmp;
            testEmpAction.Enable();
            // 경계등과 색은 이벤트로만 맞춘다. 껐다 켜는 동안 코어는 그대로라, 켤 때마다 지금 코어 상태로 한 번 맞춘다
            ShowAlert(Machine.Drone.AlertOn);
            Paint(Machine.Current == DroneStates.Stunned);
            RefreshText();
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙는다
            Machine.Entered -= OnEntered;
            Machine.Exited -= OnExited;
            Machine.Handled -= OnHandled;
            Machine.Ignored -= OnIgnored;
            Machine.Drone.AlertChanged -= OnAlertChanged;
            Machine.Drone.Fired -= OnFired;
            Machine.Drone.Stunned -= OnStunned;
            testEmpAction.performed -= OnTestEmp;
            testEmpAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어 설정에도 넣는다.
            // 이 값들로 그리는 화면은 없어(경계등·색·상태 글은 지금 상태로만 정해진다) 여기서 다시 그릴 것은 없다
            if (machine == null) return;
            DroneSettings s = machine.Drone.Settings;
            s.DetectRange = detectRange;
            s.AttackRange = attackRange;
            s.ChargeTime = chargeTime;
            s.MoveSpeed = moveSpeed;
            s.StunTime = stunTime;
            s.SearchTime = searchTime;
        }

        void OnTestEmp(InputAction.CallbackContext _) => HitByEmp();

        /// <summary>EMP 탄의 명중 판정이 부른다. 지금 잎부터 부모 쪽으로 올라가며 처음 받은 층(Active)이 기절로 보낸다. 기절 중이면 아무 층도 받지 않는다</summary>
        public void HitByEmp() => Machine.Handle(DroneInput.Emp); // [1]

        void Update()
        {
            Drone d = Machine.Drone;
            // 대상의 x 를 코어 좌표로 바꿔 넣는다. 대상이 없으면 아주 먼 곳으로 보아 감지하지 않는다
            d.TargetX = target != null ? target.position.x - origin.x : float.PositiveInfinity;
            Machine.Tick(Time.deltaTime); // [4] 바깥 부모(Active, Combat)의 Tick 부터 잎까지. 여기에는 상태를 묻는 if 가 없다
            // 원리를 보이려고 transform 을 직접 옮긴다. 매 프레임 덮어쓰므로 다른 스크립트가 옮긴 x 는 남지 않는다
            transform.position = origin + new Vector3(d.X, 0f, 0f);
            transform.localScale = new Vector3(Mathf.Abs(baseScale.x) * d.Facing, baseScale.y, baseScale.z);
        }

        void OnEntered(HState s)
        {
            Log($"Enter {s.Name}");
            if (s == DroneStates.Stunned) Paint(true);
            RefreshText();
        }

        void OnExited(HState s)
        {
            Log($"Exit {s.Name}");
            if (s == DroneStates.Stunned) Paint(false);
            RefreshText();
        }

        void OnHandled(HState leaf, HState layer, string evt) => Log($"{evt}: {leaf.Name} → {layer.Name} 가 처리");

        void OnIgnored(HState leaf, string evt) => Log($"{evt} 받는 층 없음 ({leaf.Name})");

        void OnAlertChanged(bool on)
        {
            ShowAlert(on); // CombatState 의 Enter·Exit 가 부른 순간 바로 켜고 끈다
            Log(on ? "경계등 켬" : "경계등 끔");
            RefreshText();
        }

        void OnFired(float targetX)
        {
            // 탄을 실제로 날리려면 여기서 탄을 꺼내 origin.x + targetX 쪽으로 쏜다
            Log($"사격 → 대상 (거리 {Mathf.Abs(targetX - Machine.Drone.X):0.00})");
        }

        void OnStunned(float seconds) => Log($"기절 {seconds:0.00}초");

        void ShowAlert(bool on)
        {
            if (alertLight != null && alertLight.activeSelf != on) alertLight.SetActive(on);
        }

        void Paint(bool stunned)
        {
            Color c = stunned ? stunnedColor : normalColor;
            if (bodyRenderer is SpriteRenderer sprite) sprite.color = c;
            else if (bodyRenderer != null) bodyRenderer.material.color = c; // 3D: 이 렌더러만의 머티리얼 사본에 칠한다
        }

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[Drone] {message}", this);
        }

        /// <summary>상태 글. 이벤트를 받을 때 바로 만든다 (OnGUI 는 그리기만)</summary>
        void RefreshText()
        {
            string path = StateMachine.PathOf(Machine.Current).Replace("/", " › ");
            statusText = $"상태: {path}\n경계등: {(Machine.Drone.AlertOn ? "켜짐" : "꺼짐")}";
        }

        void OnGUI()
        {
            if (!showStatusOnScreen) return;
            GUI.Label(new Rect(12f, 12f, 420f, 48f), statusText);
        }
    }
}
