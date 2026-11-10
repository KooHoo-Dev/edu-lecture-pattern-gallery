// 드론 연결 컴포넌트: 대상(플레이어) Transform 의 x 를 코어(Drone)에 넘기고, 코어의 x 와 상태를 Transform, 색, Animator, 화면 글에 옮긴다.
// 게임 규칙은 여기 없다. 순찰·추격·공격·파괴의 규칙을 바꾸려면 Core/ 의 상태 클래스를 고친다.
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.StateDroneAi
{
    public class DroneController : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름. Play 중에 바꿔도 반영된다)")]
        [Tooltip("대상이 가로(x) 거리 이 안에 들어오면 쫓는다 (m)")]
        [SerializeField] float detectRange = 5f;
        [Tooltip("대상이 가로(x) 거리 이 안이면 멈춰서 충전하고 쏜다 (m). 나갈 때는 이보다 AttackState.LeaveMargin(0.5m) 더 멀어져야 다시 쫓는다")]
        [SerializeField] float attackRange = 2.5f;
        [Tooltip("멈춘 뒤 한 발을 쏘기까지의 충전 시간 (초). 바꾸면 지금 충전 중인 한 발부터 새 값으로 비교한다")]
        [SerializeField] float chargeTime = 0.6f;
        [Tooltip("순찰과 추격의 이동 속도 (m/s). 공격 중에 바꾸면 공격에서 나갈 때 새 값으로 되돌린다")]
        [SerializeField] float moveSpeed = 2.5f;
        [Tooltip("이만큼 피해를 받으면 파괴된다. Play 를 시작할 때만 읽는다")]
        [SerializeField] int maxHp = 3;

        [Header("연결")]
        [Tooltip("쫓을 대상 (수강생의 플레이어). x 좌표만 본다. 비어 있으면 아무도 감지하지 않고 순찰만 한다")]
        [SerializeField] Transform target;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다)")]
        [Tooltip("시연용: 이 키로 드론에 피해 1 을 준다. 실제 게임에서는 플레이어의 공격 판정이 TakeHit(1) 을 부른다")]
        [SerializeField] InputAction testHitAction;

        [Header("화면")]
        [Tooltip("상태마다 색을 바꿀 렌더러 (Sprite Renderer 나 Mesh Renderer). 컴포넌트를 붙일 때 Reset 이 이 오브젝트의 것을 넣는다")]
        [SerializeField] Renderer bodyRenderer;
        [SerializeField] Color patrolColor = new Color(0.55f, 0.62f, 0.75f);
        [SerializeField] Color chaseColor = new Color(1f, 0.6f, 0.25f);
        [SerializeField] Color attackColor = new Color(0.95f, 0.25f, 0.25f);
        [SerializeField] Color destroyedColor = new Color(0.25f, 0.25f, 0.28f);
        [Tooltip("있으면 상태 이름과 같은 Animator 상태로 CrossFade 한다 (Patrol, Chase, Attack, Destroyed). Patrol 을 기본 상태로 둔다")]
        [SerializeField] Animator animator;
        [Tooltip("Game 뷰 왼쪽 위에 지금 상태, 속도, HP 를 글로 보인다 (IMGUI). 드론이 여럿이면 한 대만 켠다")]
        [SerializeField] bool showStatusOnScreen = true;
        [SerializeField] bool logEvents = true;

        Drone droneCore;
        /// <summary>코어 x 0 이 놓이는 월드 위치. 시작 자리가 코어의 시작 X(11)가 되게 Awake 에서 맞춘다</summary>
        Vector3 origin;
        Vector3 baseScale;
        string statusText = "";

        /// <summary>
        /// 코어 드론. 처음 읽을 때 만든다 (다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게).
        /// 형식 이름(Drone)과 겹치지 않게 DroneCore 라고 부른다
        /// </summary>
        public Drone DroneCore => droneCore ??= new Drone(MakeSettings());

        DroneSettings MakeSettings() => new DroneSettings
        {
            DetectRange = detectRange,
            AttackRange = attackRange,
            ChargeTime = chargeTime,
            MoveSpeed = moveSpeed,
            MaxHp = maxHp,
        };

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            testHitAction = new InputAction("TestHit", InputActionType.Button, "<Keyboard>/h");
            bodyRenderer = GetComponent<Renderer>();
        }

        void Awake()
        {
            baseScale = transform.localScale;
            // 코어의 순찰 구간은 9~13 이다. 지금 자리가 코어의 시작 X(11)가 되게 맞추면 이 자리 기준 왼쪽 2m, 오른쪽 2m 를 오간다
            origin = transform.position - new Vector3(DroneCore.X, 0f, 0f);
        }

        void OnEnable()
        {
            DroneCore.StateChanged += OnStateChanged;
            DroneCore.Fired += OnFired;
            DroneCore.Damaged += OnDamaged;
            DroneCore.Destroyed += OnDestroyed;
            testHitAction.performed += OnTestHit;
            testHitAction.Enable();
            // 색과 Animator 는 이벤트로만 맞춘다. 시작 상태는 바뀐 적이 없어 StateChanged 가 오지 않고,
            // 껐다 켜면 Animator 는 기본 상태로 돌아가지만 코어는 그대로다. 그래서 켤 때마다 지금 코어 상태로 한 번 맞춘다
            string now = DroneCore.State.Name;
            ShowState(now);
            if (animator != null && animator.isActiveAndEnabled) animator.Play(now, 0, 0f); // 전환 없이 바로 그 상태로
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙는다
            DroneCore.StateChanged -= OnStateChanged;
            DroneCore.Fired -= OnFired;
            DroneCore.Damaged -= OnDamaged;
            DroneCore.Destroyed -= OnDestroyed;
            testHitAction.performed -= OnTestHit;
            testHitAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어 설정에도 넣는다
            if (droneCore == null) return;
            DroneSettings s = droneCore.Settings;
            s.DetectRange = detectRange;
            s.AttackRange = attackRange;
            s.ChargeTime = chargeTime;
            s.MoveSpeed = moveSpeed;
            // 지금 속도는 상태를 보고 넣는다 (Speed > 0 으로 고르면 moveSpeed 를 0 으로 했다 되돌릴 때 순찰이 멈춘 채 남는다).
            // 멈춘 상태(공격, 파괴)는 그대로 두고, 공격은 Exit 가 되돌릴 때 새 값을 쓴다
            IDroneState state = droneCore.State;
            bool stopped = state == DroneStates.Attack || state == DroneStates.Destroyed;
            if (!stopped) droneCore.Speed = moveSpeed;
            RefreshText();
        }

        void OnTestHit(InputAction.CallbackContext _) => TakeHit(1);

        /// <summary>플레이어의 공격 판정이 부른다. 파괴된 뒤에는 코어가 무시한다</summary>
        public void TakeHit(int amount) => DroneCore.TakeHit(amount); // [1] HP 가 0 이 되면 코어가 Destroyed 로 바꾼다

        void Update()
        {
            // 대상의 x 를 코어 좌표로 바꿔 넘긴다. 대상이 없으면 아주 먼 곳으로 보아 감지하지 않는다
            float targetX = target != null ? target.position.x - origin.x : float.PositiveInfinity;
            DroneCore.Tick(Time.deltaTime, targetX); // [4] 무엇을 할지는 지금 상태가 정한다. 여기에는 상태를 묻는 if 가 없다
            // 원리를 보이려고 transform 을 직접 옮긴다. 코어의 X 는 순찰과 추격 상태만 바꾸므로 공격·파괴 중에는 제자리다.
            // 모든 상태에서 매 프레임 덮어쓰므로 다른 스크립트(넉백 등)가 옮긴 x 는 남지 않는다. 그런 이동은 코어에 알린다
            transform.position = origin + new Vector3(DroneCore.X, 0f, 0f);
            transform.localScale = new Vector3(Mathf.Abs(baseScale.x) * DroneCore.Facing, baseScale.y, baseScale.z);
        }

        void OnStateChanged(string from, string to)
        {
            Log($"{from} → {to}");
            ShowState(to); // [3] 들어간 상태의 색, 애니메이션
            if (animator != null) animator.CrossFadeInFixedTime(to, 0.05f); // 상태 이름 = Animator 상태 이름. 0.05초에 걸쳐 넘어간다
        }

        void OnFired(float targetX)
        {
            // 탄을 실제로 날리려면 여기서 탄을 꺼내 origin.x + targetX 쪽으로 쏜다
            Log($"사격 → 대상 (거리 {Mathf.Abs(targetX - DroneCore.X):0.00})");
        }

        void OnDamaged(int amount, int hp)
        {
            Log($"피해 {amount} (HP {hp}/{DroneCore.Settings.MaxHp})");
            RefreshText();
        }

        void OnDestroyed()
        {
            Log("파괴");
        }

        void ShowState(string state)
        {
            Color c = state == "Chase" ? chaseColor : state == "Attack" ? attackColor : state == "Destroyed" ? destroyedColor : patrolColor;
            if (bodyRenderer is SpriteRenderer sprite) sprite.color = c;
            else if (bodyRenderer != null) bodyRenderer.material.color = c; // 3D: 이 렌더러만의 머티리얼 사본에 칠한다
            RefreshText();
        }

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[Drone] {message}", this);
        }

        /// <summary>상태 글. 이벤트를 받을 때 바로 만든다 (OnGUI 는 그리기만)</summary>
        void RefreshText()
        {
            Drone d = DroneCore;
            statusText = $"상태: {d.State.Name}\n속도: {d.Speed:0.0} · HP {d.Hp}/{d.Settings.MaxHp}";
        }

        void OnGUI()
        {
            if (!showStatusOnScreen) return;
            GUI.Label(new Rect(12f, 12f, 360f, 48f), statusText);
        }
    }
}
