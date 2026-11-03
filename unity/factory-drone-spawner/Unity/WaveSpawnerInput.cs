// 웨이브 스포너 어댑터: Input System 입력을 WaveDirector, 스포너, 포탑에 넘기고, 스포너가 드론을 내보내면 그 칸의 프리팹을 Instantiate 해 코어 드론과 짝짓는다.
// 스포너 목록의 i 번째와 Spawner Slots 의 i 번째 칸(프리팹, 키)이 한 쌍이고, 구독은 반복문 하나로 한다. 종류마다 핸들러나 += 줄을 따로 두지 않는다.
// 레이더 수와 웨이브 끝은 Radar 의 이벤트 핸들러에서 바로 화면 글에 옮긴다. 만드는 규칙은 여기 없다 (Core/ 의 DroneSpawner 자식들).
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.FactoryDroneSpawner
{
    public class WaveSpawnerInput : MonoBehaviour
    {
        /// <summary>Inspector 의 스포너 칸 하나. 스포너 목록에서 같은 번호인 스포너와 한 쌍이다</summary>
        [Serializable]
        public class SpawnerSlot
        {
            [Tooltip("칸 이름. Inspector 에서 칸을 알아보는 데만 쓴다 (같은 번호 스포너의 이름과 맞춘다)")]
            public string label;
            [Tooltip("이 스포너가 내보낸 드론을 보일 프리팹. Project 창의 DroneView 프리팹을 넣는다 (장면의 오브젝트가 아니다)")]
            public DroneView prefab;
            [Tooltip("이 스포너에서 바로 하나 내보내는 키. 비워 두어도 R(섞인 순서)이 목록 전체를 돈다")]
            public InputAction spawnAction;
        }

        /// <summary>OnEnable 에서 붙인 델리게이트. 람다는 다시 만들면 다른 델리게이트라 -= 로 떼려면 붙인 것을 들고 있어야 한다</summary>
        struct Subscription
        {
            public DroneSpawner spawner;
            public Action<Drone> onSpawned;
            public InputAction action;
            public Action<InputAction.CallbackContext> onKey;
        }

        [Header("조절 값 (웹 갤러리와 같은 이름. Play 중에 바꾸면 다음에 만드는 드론, 다음 사격부터 반영된다)")]
        [Tooltip("중장갑 스포너가 만드는 드론의 HP. 이미 나온 드론은 그대로다")]
        [SerializeField] int heavyHp = 3;
        [Tooltip("방패 스포너가 만드는 드론의 HP. 이미 나온 드론은 그대로다")]
        [SerializeField] int shieldHp = 2;
        [Tooltip("일제 사격 한 번에 출구 앞의 모든 드론에 주는 피해")]
        [SerializeField] int volleyDamage = 1;

        [Header("스포너 칸 (스포너 목록과 같은 순서: 0 정찰, 1 중장갑, 2 방패. 종류를 더하면 한 칸 늘린다)")]
        [SerializeField] List<SpawnerSlot> spawnerSlots = new List<SpawnerSlot>();

        [Header("화면")]
        [Tooltip("출구. 드론은 이 위치에서 왼쪽으로 Slot Spacing 간격으로 줄을 선다. 비우면 이 오브젝트의 위치")]
        [SerializeField] Transform exitPoint;
        [Tooltip("출구 앞 자리 사이 간격. 화면에만 쓴다 (코어는 자리 번호만 안다)")]
        [SerializeField] float slotSpacing = 1.5f;
        [SerializeField] bool showStatusOnScreen = true;
        [SerializeField] bool logEvents = true;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다. 스포너별 키는 Spawner Slots 의 각 칸에 있다)")]
        [SerializeField] InputAction nextAction;
        [SerializeField] InputAction volleyAction;

        Exit exit;
        Radar radar;
        TurretBattery battery;
        // 조절 값(HP)을 넣으려고만 따로 든다. 만들고 구독하는 일은 아래 목록과 반복문이 한다
        HeavySpawner heavySpawner;
        ShieldSpawner shieldSpawner;
        WaveDirector director;
        readonly List<Subscription> subscriptions = new List<Subscription>();
        string statusText = "";

        /// <summary>
        /// 처음 읽을 때 만든다. 다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게.
        /// 종류를 더하면 스포너 하나를 이 목록에 한 칸 더하고, Inspector 의 Spawner Slots 에 프리팹 한 칸을 더한다. 그 밖의 코드는 그대로다
        /// </summary>
        public WaveDirector Director
        {
            get
            {
                if (director != null) return director;
                exit = new Exit();
                radar = new Radar();
                battery = new TurretBattery { VolleyDamage = volleyDamage };
                heavySpawner = new HeavySpawner(exit, radar) { Hp = heavyHp };
                shieldSpawner = new ShieldSpawner(exit, radar) { Hp = shieldHp };
                director = new WaveDirector(new List<DroneSpawner>
                {
                    new ScoutSpawner(exit, radar), // 0 → Spawner Slots 0번 칸
                    heavySpawner, // 1
                    shieldSpawner, // 2
                });
                return director;
            }
        }

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            spawnerSlots = new List<SpawnerSlot>
            {
                new SpawnerSlot { label = "정찰", spawnAction = new InputAction("Scout", InputActionType.Button, "<Keyboard>/q") },
                new SpawnerSlot { label = "중장갑", spawnAction = new InputAction("Heavy", InputActionType.Button, "<Keyboard>/w") },
                new SpawnerSlot { label = "방패", spawnAction = new InputAction("Shield", InputActionType.Button, "<Keyboard>/e") },
            };
            nextAction = new InputAction("Next", InputActionType.Button, "<Keyboard>/r");
            volleyAction = new InputAction("Volley", InputActionType.Button, "<Keyboard>/x");
        }

        void OnEnable()
        {
            _ = Director;
            // 스포너마다 같은 일을 하므로 반복문 하나로 붙인다. 어느 프리팹을 쓸지는 칸 번호가 정한다 (종류를 묻는 if 가 없다)
            IReadOnlyList<DroneSpawner> spawners = director.Spawners;
            for (int i = 0; i < spawners.Count; i++)
            {
                int index = i; // 람다가 반복 변수 i 가 아니라 이 칸 번호를 잡게 복사한다
                DroneSpawner spawner = spawners[i];
                var s = new Subscription { spawner = spawner, onSpawned = drone => Show(drone, index) };
                spawner.Spawned += s.onSpawned;
                InputAction action = index < spawnerSlots.Count ? spawnerSlots[index].spawnAction : null;
                if (action != null)
                {
                    s.action = action;
                    s.onKey = _ => spawner.Spawn();
                    action.performed += s.onKey;
                    action.Enable();
                }
                subscriptions.Add(s);
            }
            director.Picked += OnPicked;
            radar.Registered += OnRadarChanged;
            radar.Unregistered += OnRadarChanged;
            radar.WaveCleared += OnWaveCleared;
            battery.Fired += OnFired;
            nextAction.performed += OnNext;
            volleyAction.performed += OnVolley;
            nextAction.Enable();
            volleyAction.Enable();
            RefreshStatus(); // 꺼져 있던 동안 바뀐 코어 상태로 화면 글을 다시 맞춘다
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 두 대가 나온다. 붙일 때 저장한 델리게이트를 그대로 뗀다
            foreach (Subscription s in subscriptions)
            {
                s.spawner.Spawned -= s.onSpawned;
                if (s.action == null) continue;
                s.action.performed -= s.onKey;
                s.action.Disable();
            }
            subscriptions.Clear();
            director.Picked -= OnPicked;
            radar.Registered -= OnRadarChanged;
            radar.Unregistered -= OnRadarChanged;
            radar.WaveCleared -= OnWaveCleared;
            battery.Fired -= OnFired;
            nextAction.performed -= OnNext;
            volleyAction.performed -= OnVolley;
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

        void OnNext(InputAction.CallbackContext _) => Director.SpawnNext(); // [1] 섞인 순서는 WaveDirector 가 목록에서 고른다
        void OnVolley(InputAction.CallbackContext _) => battery.Volley(exit);

        /// <summary>
        /// 화면 쪽 만들기: index 번 칸의 프리팹을 Instantiate 해 코어 드론과 짝짓는다. MonoBehaviour 는 new 로 만들지 않는다.
        /// 프리팹은 이때 칸에서 읽어 Play 중에 바꿔도 다음 드론부터 반영된다. 이 오브젝트 아래에 만들어, 스포너 오브젝트를 지우면 드론 뷰도 함께 사라진다
        /// </summary>
        void Show(Drone drone, int index)
        {
            DroneView prefab = index < spawnerSlots.Count ? spawnerSlots[index].prefab : null;
            if (prefab == null)
            {
                Debug.LogWarning($"[Wave] Spawner Slots 의 {index}번 칸({director.Spawners[index].Label})이 없거나 Prefab 이 비어 {drone.Name} 는 화면에 보이지 않는다 (코어 드론과 레이더 등록은 그대로)", this);
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

        /// <summary>확인용 IMGUI 글. UI 를 만드는 단계를 줄이려고 썼다. 실제 게임은 UGUI·TextMeshPro 로 띄운다</summary>
        void OnGUI()
        {
            if (!showStatusOnScreen) return;
            GUI.Label(new Rect(12f, 12f, 640f, 48f), statusText);
        }
    }
}
