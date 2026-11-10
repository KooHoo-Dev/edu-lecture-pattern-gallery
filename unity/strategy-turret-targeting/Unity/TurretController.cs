// 포탑 연결 컴포넌트: Input System 입력으로 조준 전략 객체를 갈아 끼우고, 코어 포탑의 대상을 레이저(LineRenderer)에 옮긴다.
// 게임 규칙은 여기 없다. 조준 방식을 더하려면 Core/ 에 ITargetingStrategy 구현 클래스를 하나 더한다.
// 드론 웨이브는 씬의 DroneWaveController 하나를 칸으로 받아 쓴다. 포탑을 더 놓으면 같은 웨이브를 넣는다.
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.StrategyTurretTargeting
{
    // 붙일 때 Line Renderer 가 먼저 붙어 Reset 이 Laser 칸을 채울 수 있다
    [RequireComponent(typeof(LineRenderer))]
    public class TurretController : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름. Play 중에 바꿔도 반영된다)")]
        [Tooltip("포탑에서 가로 거리 이 안의 드론만 후보가 된다")]
        [SerializeField] float range = 6f;
        [Tooltip("발사 간격 (초)")]
        [SerializeField] float fireInterval = 0.4f;
        [Tooltip("한 발에 깎는 HP")]
        [SerializeField] int damage = 1;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다)")]
        [SerializeField] InputAction nearestAction;
        [SerializeField] InputAction strongestAction;
        [SerializeField] InputAction firstAction;
        [SerializeField] InputAction weakestAction;

        [Header("연결")]
        [Tooltip("씬에 하나 둔 드론 웨이브. 포탑을 여러 대 놓으면 모두 같은 것을 넣는다")]
        [SerializeField] DroneWaveController droneWave;

        [Header("화면")]
        [Tooltip("포탑에서 지금 대상까지 그리는 선. 대상이 없으면 끈다")]
        [SerializeField] LineRenderer laser;
        [Tooltip("레이저가 나가는 높이 (포탑 오브젝트 기준)")]
        [SerializeField] float muzzleHeight = 0.5f;
        [Tooltip("Game 뷰 왼쪽 위에 지금 방식과 대상을 글로 보인다 (IMGUI). 포탑이 여럿이면 한 대만 켠다")]
        [SerializeField] bool showStatusOnScreen = true;
        [SerializeField] bool logEvents = true;

        Turret turretCore;
        string statusText = "";

        /// <summary>
        /// 코어 포탑. 처음 읽을 때 만든다 (다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게).
        /// 형식 이름(Turret)과 겹치지 않게 TurretCore 라고 부른다. Drone Wave 칸이 채워져 있어야 한다
        /// </summary>
        public Turret TurretCore
        {
            get
            {
                if (turretCore == null)
                {
                    // 코어 x 는 웨이브 오브젝트(드론이 나오는 왼쪽 끝)에서 이 오브젝트까지의 가로 거리다.
                    // 전략 객체는 Targeting 의 static 필드 넷을 같이 쓴다. 여기서도, 입력 때도 new 하지 않는다
                    turretCore = new Turret(droneWave.Wave, droneWave.ToCoreX(transform.position), Targeting.Nearest)
                    {
                        Range = range,
                        FireInterval = fireInterval,
                        Damage = damage,
                    };
                }
                return turretCore;
            }
        }

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            nearestAction = new InputAction("Nearest", InputActionType.Button, "<Keyboard>/1");
            nearestAction.AddBinding("<Gamepad>/dpad/left");
            strongestAction = new InputAction("Strongest", InputActionType.Button, "<Keyboard>/2");
            strongestAction.AddBinding("<Gamepad>/dpad/up");
            firstAction = new InputAction("First", InputActionType.Button, "<Keyboard>/3");
            firstAction.AddBinding("<Gamepad>/dpad/right");
            weakestAction = new InputAction("Weakest", InputActionType.Button, "<Keyboard>/4");
            weakestAction.AddBinding("<Gamepad>/dpad/down");
            // RequireComponent 가 Line Renderer 를 먼저 붙이므로 여기서 찾을 수 있다
            laser = GetComponent<LineRenderer>();
        }

        void Awake()
        {
            if (laser == null) laser = GetComponent<LineRenderer>();
            laser.positionCount = 2;
            laser.useWorldSpace = true;
            laser.enabled = false;
        }

        void OnEnable()
        {
            if (droneWave == null)
            {
                Debug.LogError("[Turret] Drone Wave 칸이 비어 있다. 씬의 DroneWaveController 오브젝트를 넣는다", this);
                enabled = false;
                return;
            }
            TurretCore.StrategyChanged += OnStrategyChanged;
            TurretCore.TargetChanged += OnTargetChanged;
            TurretCore.Fired += OnFired;
            TurretCore.DroneDestroyed += OnDroneDestroyed;
            nearestAction.performed += OnNearest;
            strongestAction.performed += OnStrongest;
            firstAction.performed += OnFirst;
            weakestAction.performed += OnWeakest;
            nearestAction.Enable();
            strongestAction.Enable();
            firstAction.Enable();
            weakestAction.Enable();
            RefreshText();
        }

        void OnDisable()
        {
            // Drone Wave 칸이 비어 OnEnable 에서 붙이지 않았으면 뗄 것도 없다
            if (turretCore == null) return;
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙는다
            TurretCore.StrategyChanged -= OnStrategyChanged;
            TurretCore.TargetChanged -= OnTargetChanged;
            TurretCore.Fired -= OnFired;
            TurretCore.DroneDestroyed -= OnDroneDestroyed;
            nearestAction.performed -= OnNearest;
            strongestAction.performed -= OnStrongest;
            firstAction.performed -= OnFirst;
            weakestAction.performed -= OnWeakest;
            nearestAction.Disable();
            strongestAction.Disable();
            firstAction.Disable();
            weakestAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어 설정에도 넣는다
            if (turretCore == null) return;
            turretCore.Range = range;
            turretCore.FireInterval = fireInterval;
            turretCore.Damage = damage;
        }

        // 입력은 미리 만들어 둔 전략 객체 하나를 골라 끼울 뿐이다. 어떤 방식인지 묻는 if 사슬이 없다
        void OnNearest(InputAction.CallbackContext _) => TurretCore.SetStrategy(Targeting.Nearest); // [1]
        void OnStrongest(InputAction.CallbackContext _) => TurretCore.SetStrategy(Targeting.Strongest); // [1]
        void OnFirst(InputAction.CallbackContext _) => TurretCore.SetStrategy(Targeting.First); // [1]
        void OnWeakest(InputAction.CallbackContext _) => TurretCore.SetStrategy(Targeting.Weakest); // [1]

        void Update()
        {
            // 웨이브는 DroneWaveController 가 먼저(DefaultExecutionOrder) 흘린다. 포탑은 자기 Tick 만 부른다
            TurretCore.Tick(Time.deltaTime); // [2] 대상은 포탑이 Tick 안에서 전략에게 한 번 묻는다
            Drone target = TurretCore.CurrentTarget;
            if (target != null)
            {
                laser.SetPosition(0, transform.position + Vector3.up * muzzleHeight);
                // 레이저 끝은 드론 오브젝트가 아니라 코어 드론의 좌표(ToWorld)로 옮긴다
                laser.SetPosition(1, droneWave.ToWorld(target)); // [3] 레이저도 발사와 같은 CurrentTarget 을 쓴다
            }
        }

        void OnDroneDestroyed(Drone d)
        {
            // 코어 웨이브는 이미 목록에서 뺐다. 화면의 드론 오브젝트는 웨이브 연결 컴포넌트가 지운다
            droneWave.RemoveView(d);
            Log($"{d.Name} 파괴");
        }

        void OnStrategyChanged(ITargetingStrategy from, ITargetingStrategy to)
        {
            Log($"조준 방식 {Short(from)} → {Short(to)}");
            RefreshText();
        }

        void OnTargetChanged(Drone from, Drone to)
        {
            laser.enabled = to != null;
            RefreshText();
        }

        void OnFired(Drone d, int dealt)
        {
            Log($"발사 → {d.Name} (HP {d.Hp}/{d.MaxHp})");
            RefreshText();
        }

        /// <summary>NearestTarget → Nearest (웹 갤러리의 사건 기록과 같은 말)</summary>
        static string Short(ITargetingStrategy s) => s.GetType().Name.Replace("Target", "");

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[Turret] {message}", this);
        }

        /// <summary>상태 글. 이벤트를 받을 때 바로 만든다 (OnGUI 는 그리기만)</summary>
        void RefreshText()
        {
            Drone t = TurretCore.CurrentTarget;
            statusText = $"조준: {Short(TurretCore.Strategy)}\n대상: {(t == null ? "없음" : $"{t.Name} (HP {t.Hp}/{t.MaxHp})")}";
        }

        void OnGUI()
        {
            if (!showStatusOnScreen) return;
            GUI.Label(new Rect(12f, 12f, 480f, 48f), statusText);
        }
    }
}
