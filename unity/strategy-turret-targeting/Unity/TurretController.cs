// 포탑 어댑터: Input System 입력으로 조준 전략 객체를 갈아 끼우고, 코어의 드론과 대상을 드론 오브젝트와 레이저(LineRenderer)에 옮긴다.
// 게임 규칙은 여기 없다. 조준 방식을 더하려면 Core/ 에 ITargetingStrategy 구현 클래스를 하나 더한다.
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.StrategyTurretTargeting
{
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

        [Header("화면")]
        [Tooltip("드론 하나의 모양. 코어 드론이 나올 때마다 하나씩 만들고, 파괴되거나 기지에 닿으면 지운다")]
        [SerializeField] GameObject dronePrefab;
        [Tooltip("포탑에서 지금 대상까지 그리는 선. 대상이 없으면 끈다")]
        [SerializeField] LineRenderer laser;
        [Tooltip("레이저가 나가는 높이 (포탑 오브젝트 기준)")]
        [SerializeField] float muzzleHeight = 0.5f;
        [Tooltip("드론이 모두 사라지면 표를 처음부터 다시 낸다")]
        [SerializeField] bool loopWave = true;
        [Tooltip("Game 뷰 왼쪽 위에 지금 방식과 대상을 글로 보인다 (IMGUI)")]
        [SerializeField] bool showStatusOnScreen = true;
        [SerializeField] bool logEvents = true;

        DroneWave wave;
        Turret turret;
        /// <summary>코어 드론 ↔ 화면의 드론 오브젝트</summary>
        readonly Dictionary<Drone, Transform> views = new Dictionary<Drone, Transform>();
        /// <summary>코어 x = 0 (드론이 나오는 왼쪽 끝) 의 월드 위치. 포탑 오브젝트 자리가 코어의 Turret.DefaultX 가 되게 맞춘다</summary>
        Vector3 origin;
        string statusText = "";

        /// <summary>처음 읽을 때 만든다. 다른 오브젝트(점수 UI 등)의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게</summary>
        public DroneWave Wave
        {
            get
            {
                Build();
                return wave;
            }
        }

        public Turret Turret
        {
            get
            {
                Build();
                return turret;
            }
        }

        void Build()
        {
            if (turret != null) return;
            wave = new DroneWave(DroneWave.CreateDefaultTable());
            // 전략 객체는 Targeting 의 static 필드 넷을 같이 쓴다. 여기서도, 입력 때도 new 하지 않는다
            turret = new Turret(wave, Turret.DefaultX, Targeting.Nearest)
            {
                Range = range,
                FireInterval = fireInterval,
                Damage = damage,
            };
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
            laser = GetComponent<LineRenderer>();
        }

        void Awake()
        {
            origin = transform.position - new Vector3(Turret.X, 0f, 0f);
            if (laser != null)
            {
                laser.positionCount = 2;
                laser.useWorldSpace = true;
                laser.enabled = false;
            }
            RefreshText();
        }

        void OnEnable()
        {
            Wave.DroneSpawned += OnDroneSpawned;
            Wave.DroneReachedBase += OnDroneReachedBase;
            Turret.StrategyChanged += OnStrategyChanged;
            Turret.TargetChanged += OnTargetChanged;
            Turret.Fired += OnFired;
            Turret.DroneDestroyed += OnDroneDestroyed;
            nearestAction.performed += OnNearest;
            strongestAction.performed += OnStrongest;
            firstAction.performed += OnFirst;
            weakestAction.performed += OnWeakest;
            nearestAction.Enable();
            strongestAction.Enable();
            firstAction.Enable();
            weakestAction.Enable();
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙는다
            Wave.DroneSpawned -= OnDroneSpawned;
            Wave.DroneReachedBase -= OnDroneReachedBase;
            Turret.StrategyChanged -= OnStrategyChanged;
            Turret.TargetChanged -= OnTargetChanged;
            Turret.Fired -= OnFired;
            Turret.DroneDestroyed -= OnDroneDestroyed;
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
            if (turret == null) return;
            turret.Range = range;
            turret.FireInterval = fireInterval;
            turret.Damage = damage;
        }

        // 입력은 미리 만들어 둔 전략 객체 하나를 골라 끼울 뿐이다. 어떤 방식인지 묻는 if 사슬이 없다
        void OnNearest(InputAction.CallbackContext _) => Turret.SetStrategy(Targeting.Nearest); // [1]
        void OnStrongest(InputAction.CallbackContext _) => Turret.SetStrategy(Targeting.Strongest); // [1]
        void OnFirst(InputAction.CallbackContext _) => Turret.SetStrategy(Targeting.First); // [1]
        void OnWeakest(InputAction.CallbackContext _) => Turret.SetStrategy(Targeting.Weakest); // [1]

        void Update()
        {
            Wave.Tick(Time.deltaTime);
            Turret.Tick(Time.deltaTime); // [2] 대상은 포탑이 Tick 안에서 전략에게 한 번 묻는다
            // 원리를 보이려고 transform 을 직접 옮긴다 (위치는 매 프레임 바뀌는 값이라 Update 에서 옮긴다)
            foreach (KeyValuePair<Drone, Transform> pair in views) pair.Value.position = ToWorld(pair.Key);
            Drone target = Turret.CurrentTarget;
            if (laser != null && target != null)
            {
                laser.SetPosition(0, transform.position + Vector3.up * muzzleHeight);
                laser.SetPosition(1, ToWorld(target)); // [3] 레이저도 발사와 같은 CurrentTarget 을 쓴다
            }
            if (loopWave && Wave.Finished) Wave.Restart();
        }

        Vector3 ToWorld(Drone d) => origin + new Vector3(d.X, d.Altitude, 0f);

        void OnDroneSpawned(Drone d)
        {
            if (dronePrefab != null)
            {
                GameObject go = Instantiate(dronePrefab, ToWorld(d), Quaternion.identity);
                go.name = d.Name;
                views[d] = go.transform;
            }
            Log($"{d.Name} 등장 (HP {d.Hp})");
        }

        void OnDroneReachedBase(Drone d)
        {
            RemoveView(d);
            Log($"{d.Name} 기지 도달 (HP {d.Hp} 남음)");
        }

        void OnDroneDestroyed(Drone d)
        {
            RemoveView(d);
            Log($"{d.Name} 파괴");
        }

        void RemoveView(Drone d)
        {
            if (!views.TryGetValue(d, out Transform view)) return;
            views.Remove(d);
            if (view != null) Destroy(view.gameObject);
        }

        void OnStrategyChanged(ITargetingStrategy from, ITargetingStrategy to)
        {
            Log($"조준 방식 {Short(from)} → {Short(to)}");
            RefreshText();
        }

        void OnTargetChanged(Drone from, Drone to)
        {
            if (laser != null) laser.enabled = to != null;
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
            Drone t = Turret.CurrentTarget;
            statusText = $"조준: {Short(Turret.Strategy)}\n대상: {(t == null ? "없음" : $"{t.Name} (HP {t.Hp}/{t.MaxHp})")}";
        }

        void OnGUI()
        {
            if (!showStatusOnScreen) return;
            GUI.Label(new Rect(12f, 12f, 480f, 48f), statusText);
        }
    }
}
