// 플레이어 연결 컴포넌트: Input System 입력을 코어(Player)에 넘기고, 코어의 상태를 위치, 공격 판정, Animator 에 옮긴다.
// 게임 규칙은 여기 없다. 규칙을 바꾸려면 Core/ 의 상태 클래스를 고친다.
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.StatePlayerActions
{
    public class PlayerController : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름. Play 중에 바꿔도 반영된다)")]
        [SerializeField] float jumpHeight = 1.6f;
        [SerializeField] float attackDuration = 0.45f;
        [SerializeField] float hitStunDuration = 0.6f;
        [SerializeField] bool allowAirAttack = false;
        [SerializeField] float moveSpeed = 3f;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다)")]
        [SerializeField] InputAction jumpAction;
        [SerializeField] InputAction attackAction;
        [Tooltip("누를 때마다 걷기와 멈춤이 바뀐다. 누르고 있는 동안 걷는 것이 아니다. 시작 자리 기준 왼쪽 2.5m, 오른쪽 10.5m 에서 돌아선다")]
        [SerializeField] InputAction moveAction;
        [Tooltip("시연용: 이 키로 피격을 흉내 낸다. 실제 게임에서는 적의 공격 판정이 TakeHit() 을 부른다")]
        [SerializeField] InputAction testHitAction;

        [Header("화면")]
        [Tooltip("있으면 상태 이름과 같은 Animator 상태로 CrossFade 한다 (Idle, Run, Jump, Attack, HitStun). Idle 을 기본 상태로 둔다")]
        [SerializeField] Animator animator;
        [Tooltip("공격 판정 오브젝트. 있으면 코어의 HitboxOn 을 따라 켜고 끈다")]
        [SerializeField] GameObject attackHitbox;
        [SerializeField] bool logStateChanges = true;

        Player player;
        Vector3 origin;
        Vector3 baseScale;

        /// <summary>
        /// 처음 읽을 때 만든다. 다른 오브젝트(상태 표시 UI 등)의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게.
        /// </summary>
        public Player Player => player ??= new Player(MakeSettings());

        PlayerSettings MakeSettings() => new PlayerSettings
        {
            JumpHeight = jumpHeight,
            AttackDuration = attackDuration,
            HitStunDuration = hitStunDuration,
            AllowAirAttack = allowAirAttack,
            MoveSpeed = moveSpeed,
        };

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            jumpAction = new InputAction("Jump", InputActionType.Button, "<Keyboard>/space");
            jumpAction.AddBinding("<Gamepad>/buttonSouth");
            attackAction = new InputAction("Attack", InputActionType.Button, "<Keyboard>/x");
            attackAction.AddBinding("<Gamepad>/buttonWest");
            moveAction = new InputAction("Move", InputActionType.Button, "<Keyboard>/d");
            moveAction.AddBinding("<Gamepad>/dpad/right");
            testHitAction = new InputAction("TestHit", InputActionType.Button, "<Keyboard>/c");
        }

        void Awake()
        {
            baseScale = transform.localScale;
            // 코어의 X 는 걷는 범위(1.5~14.5) 안의 좌표다. 지금 자리가 코어의 시작 X 가 되게 맞춘다
            origin = transform.position - new Vector3(Player.X, 0f, 0f);
        }

        void OnEnable()
        {
            Player.StateChanged += OnStateChanged;
            jumpAction.performed += OnJump;
            attackAction.performed += OnAttack;
            moveAction.performed += OnMove;
            testHitAction.performed += OnTestHit;
            jumpAction.Enable();
            attackAction.Enable();
            moveAction.Enable();
            testHitAction.Enable();
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 두 번 처리된다
            Player.StateChanged -= OnStateChanged;
            jumpAction.performed -= OnJump;
            attackAction.performed -= OnAttack;
            moveAction.performed -= OnMove;
            testHitAction.performed -= OnTestHit;
            jumpAction.Disable();
            attackAction.Disable();
            moveAction.Disable();
            testHitAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어 설정에도 넣는다
            if (player == null) return;
            PlayerSettings s = player.Settings;
            s.JumpHeight = jumpHeight;
            s.AttackDuration = attackDuration;
            s.HitStunDuration = hitStunDuration;
            s.AllowAirAttack = allowAirAttack;
            s.MoveSpeed = moveSpeed;
        }

        void OnJump(InputAction.CallbackContext _) => Player.Handle(PlayerInput.Jump); // [1]
        void OnAttack(InputAction.CallbackContext _) => Player.Handle(PlayerInput.Attack);
        void OnMove(InputAction.CallbackContext _) => Player.Handle(PlayerInput.Move);
        void OnTestHit(InputAction.CallbackContext _) => TakeHit();

        /// <summary>적의 공격 판정이 부른다</summary>
        public void TakeHit() => Player.Handle(PlayerInput.Hit);

        void Update()
        {
            Player.Tick(Time.deltaTime);
            // 원리를 보이려고 transform 을 직접 옮긴다. CharacterController 나 Rigidbody 를 쓰면 코어의 속도를 그쪽에 넘긴다
            transform.position = origin + new Vector3(Player.X, Player.Y, 0f);
            transform.localScale = new Vector3(Mathf.Abs(baseScale.x) * Player.Facing, baseScale.y, baseScale.z);
            if (attackHitbox != null && attackHitbox.activeSelf != Player.HitboxOn) attackHitbox.SetActive(Player.HitboxOn);
        }

        void OnStateChanged(string from, string to)
        {
            if (logStateChanges) Debug.Log($"[Player] {from} → {to}", this);
            if (animator != null) animator.CrossFade(to, 0.05f); // 상태 이름 = Animator 상태 이름
        }
    }
}
