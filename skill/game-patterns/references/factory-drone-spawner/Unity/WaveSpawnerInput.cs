// 웨이브 스포너 어댑터: Input System 입력을 WaveDirector, 스포너, 포탑에 넘기고, 스포너가 드론을 내보내면 그 스포너의 프리팹을 Instantiate 해 코어 드론과 짝짓는다.
// 레이더 수와 웨이브 끝은 Radar 의 이벤트 핸들러에서 바로 화면 글에 옮긴다. 만드는 규칙은 여기 없다 (Core/ 의 DroneSpawner 자식들).
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.FactoryDroneSpawner
{
    public class WaveSpawnerInput : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름. Play 중에 바꾸면 다음에 만드는 드론, 다음 사격부터 반영된다)")]
        [Tooltip("중장갑 스포너가 만드는 드론의 HP. 이미 나온 드론은 그대로다")]
        [SerializeField] int heavyHp = 3;
        [Tooltip("방패 스포너가 만드는 드론의 HP. 이미 나온 드론은 그대로다")]
        [SerializeField] int shieldHp = 2;
        [Tooltip("일제 사격 한 번에 출구 앞의 모든 드론에 주는 피해")]
        [SerializeField] int volleyDamage = 1;

        [Header("프리팹 (스포너마다 하나. Project 창의 DroneView 프리팹을 넣는다)")]
        [SerializeField] DroneView scoutPrefab;
        [SerializeField] DroneView heavyPrefab;
        [SerializeField] DroneView shieldPrefab;

        [Header("화면")]
        [Tooltip("출구. 드론은 이 위치에서 왼쪽으로 Slot Spacing 간격으로 줄을 선다. 비우면 이 오브젝트의 위치")]
        [SerializeField] Transform exitPoint;
        [Tooltip("출구 앞 자리 사이 간격. 화면에만 쓴다 (코어는 자리 번호만 안다)")]
        [SerializeField] float slotSpacing = 1.5f;
        [SerializeField] bool showStatusOnScreen = true;
        [SerializeField] bool logEvents = true;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다)")]
        [SerializeField] InputAction scoutAction;
        [SerializeField] InputAction heavyAction;
        [SerializeField] InputAction shieldAction;
        [SerializeField] InputAction nextAction;
        [SerializeField] InputAction volleyAction;

        Exit exit;
        Radar radar;
        TurretBattery battery;
        ScoutSpawner scoutSpawner;
        HeavySpawner heavySpawner;
        ShieldSpawner shieldSpawner;
        WaveDirector director;
        string statusText = "";

        /// <summary>
        /// 처음 읽을 때 만든다. 다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게.
        /// 종류를 더하면 스포너 하나를 만들어 이 목록에 한 칸 더한다. WaveDirector 와 DroneSpawner.Spawn 은 그대로다
        /// </summary>
        public WaveDirector Director
        {
            get
            {
                if (director != null) return director;
                exit = new Exit();
                radar = new Radar();
                battery = new TurretBattery { VolleyDamage = volleyDamage };
                scoutSpawner = new ScoutSpawner(exit, radar);
                heavySpawner = new HeavySpawner(exit, radar) { Hp = heavyHp };
                shieldSpawner = new ShieldSpawner(exit, radar) { Hp = shieldHp };
                director = new WaveDirector(new List<DroneSpawner> { scoutSpawner, heavySpawner, shieldSpawner });
                return director;
            }
        }

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            scoutAction = new InputAction("Scout", InputActionType.Button, "<Keyboard>/q");
            heavyAction = new InputAction("Heavy", InputActionType.Button, "<Keyboard>/w");
            shieldAction = new InputAction("Shield", InputActionType.Button, "<Keyboard>/e");
            nextAction = new InputAction("Next", InputActionType.Button, "<Keyboard>/r");
            volleyAction = new InputAction("Volley", InputActionType.Button, "<Keyboard>/x");
        }

        void OnEnable()
        {
            _ = Director;
            // 스포너마다 핸들러가 따로라, 어느 프리팹을 쓸지 종류를 묻는 if 가 없다
            scoutSpawner.Spawned += OnScoutSpawned;
            heavySpawner.Spawned += OnHeavySpawned;
            shieldSpawner.Spawned += OnShieldSpawned;
            director.Picked += OnPicked;
            radar.Registered += OnRadarChanged;
            radar.Unregistered += OnRadarChanged;
            radar.WaveCleared += OnWaveCleared;
            battery.Fired += OnFired;
            scoutAction.performed += OnScout;
            heavyAction.performed += OnHeavy;
            shieldAction.performed += OnShield;
            nextAction.performed += OnNext;
            volleyAction.performed += OnVolley;
            scoutAction.Enable();
            heavyAction.Enable();
            shieldAction.Enable();
            nextAction.Enable();
            volleyAction.Enable();
            RefreshStatus();
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 두 대가 나온다
            scoutSpawner.Spawned -= OnScoutSpawned;
            heavySpawner.Spawned -= OnHeavySpawned;
            shieldSpawner.Spawned -= OnShieldSpawned;
            director.Picked -= OnPicked;
            radar.Registered -= OnRadarChanged;
            radar.Unregistered -= OnRadarChanged;
            radar.WaveCleared -= OnWaveCleared;
            battery.Fired -= OnFired;
            scoutAction.performed -= OnScout;
            heavyAction.performed -= OnHeavy;
            shieldAction.performed -= OnShield;
            nextAction.performed -= OnNext;
            volleyAction.performed -= OnVolley;
            scoutAction.Disable();
            heavyAction.Disable();
            shieldAction.Disable();
            nextAction.Disable();
            volleyAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어 설정에도 넣는다 (이미 나온 드론의 HP 는 그대로)
            if (director == null) return;
            heavySpawner.Hp = heavyHp;
            shieldSpawner.Hp = shieldHp;
            battery.VolleyDamage = volleyDamage;
        }

        void OnScout(InputAction.CallbackContext _) => scoutSpawner.Spawn();
        void OnHeavy(InputAction.CallbackContext _) => heavySpawner.Spawn();
        void OnShield(InputAction.CallbackContext _) => shieldSpawner.Spawn();
        void OnNext(InputAction.CallbackContext _) => Director.SpawnNext(); // [1] 섞인 순서는 WaveDirector 가 목록에서 고른다
        void OnVolley(InputAction.CallbackContext _) => battery.Volley(exit);

        void OnScoutSpawned(Drone drone) => Show(drone, scoutPrefab, "Scout Prefab");
        void OnHeavySpawned(Drone drone) => Show(drone, heavyPrefab, "Heavy Prefab");
        void OnShieldSpawned(Drone drone) => Show(drone, shieldPrefab, "Shield Prefab");

        /// <summary>
        /// 화면 쪽 만들기: 프리팹을 Instantiate 해 코어 드론과 짝짓는다. MonoBehaviour 는 new 로 만들지 않는다.
        /// 이 오브젝트 아래에 만들어, 스포너 오브젝트를 지우면 드론 뷰도 함께 사라진다
        /// </summary>
        void Show(Drone drone, DroneView prefab, string slotName)
        {
            if (prefab == null)
            {
                Debug.LogWarning($"[Wave] {slotName} 칸이 비어 {drone.Name} 는 화면에 보이지 않는다 (코어 드론과 레이더 등록은 그대로)", this);
            }
            else
            {
                Vector3 origin = exitPoint != null ? exitPoint.position : transform.position;
                Vector3 position = origin + Vector3.left * slotSpacing * (drone.Slot + 1);
                DroneView view = Instantiate(prefab, position, Quaternion.identity, transform); // [3] 엔진 쪽 만들기는 Instantiate
                view.Bind(drone);
            }
            Log($"출격 {drone.Name} · HP {drone.Hp} · 출구 앞 자리 {drone.Slot}");
            RefreshStatus();
        }

        void OnPicked(int index, DroneSpawner spawner) => Log($"섞인 순서 {index + 1}번째: {index} % {director.Spawners.Count} → {spawner.Label}");

        void OnRadarChanged(Drone drone, int alive) => RefreshStatus();

        void OnWaveCleared()
        {
            Log("웨이브 끝"); // [4] 레이더가 아는 드론이 모두 파괴됐다
            RefreshStatus();
        }

        void OnFired(int count, int damage) => Log(count > 0 ? $"일제 사격: {count}대에 피해 {damage}" : "일제 사격: 출구 앞에 드론이 없다");

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[Wave] {message}", this);
        }

        /// <summary>왼쪽 위 상태 글. 이벤트를 받을 때 바로 만든다 (OnGUI 는 그리기만)</summary>
        void RefreshStatus()
        {
            DroneSpawner next = director.PeekNext();
            string wave = radar.IsCleared ? "  ·  웨이브 끝" : "";
            statusText = $"레이더: 살아 있는 드론 {radar.AliveCount} (출구 앞 {exit.Drones.Count}대){wave}\n섞인 순서 다음: {(next != null ? next.Label : "-")}";
        }

        void OnGUI()
        {
            if (!showStatusOnScreen) return;
            GUI.Label(new Rect(12f, 12f, 640f, 48f), statusText);
        }
    }
}
