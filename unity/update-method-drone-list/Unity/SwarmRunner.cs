// 드론 무리 연결 컴포넌트: 엔진이 부르는 Update 는 이 컴포넌트 하나뿐이고, 여기서 코어 DroneSwarm.Tick 이 드론 목록을 돌며 drone.Update 를 부른다.
// 드론 오브젝트는 프리팹으로 만들어 코어 드론과 짝짓기만 한다 (드론 오브젝트에는 스크립트도 Update 도 없다). Despawned 에서 Destroy 한다.
// 왼쪽 위 상태 글은 확인용 IMGUI(OnGUI) 다. 실제 게임의 화면 글은 UGUI·TextMeshPro 로 만든다.
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.UpdateMethodDroneList
{
    public class SwarmRunner : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름. Play 중에 바꿔도 반영된다)")]
        [Tooltip("드론이 왼쪽 기지 쪽으로 가는 빠르기 (m/s). 드론은 이 오브젝트에서 오른쪽 14.8m 에 나타나 1.8m 에 닿으면 기지에 닿은 것으로 빠진다 (13m)")]
        [Min(0.1f)]
        [SerializeField] float moveSpeed = 3f;
        [Tooltip("분열 드론이 나타나고 나뉘기까지의 시간 (초). 드론이 Update 로 받은 시간의 합으로 잰다. Play 중에 바꾸면 아직 나뉘지 않은 분열 드론에도 쓴다")]
        [Min(0.1f)]
        [SerializeField] float splitDelay = 1f;
        [Tooltip("분열 드론 하나가 나뉘는 조각 수. 조각은 보통 드론이고 다시 나뉘지 않는다. Play 중에 바꾸면 다음 분열부터 쓴다")]
        [Min(1)]
        [SerializeField] int splitCount = 2;

        [Header("화면")]
        [Tooltip("드론 프리팹 (Project 창의 에셋). 스크립트는 붙이지 않는다: 드론마다 Update 를 두지 않고 이 컴포넌트가 목록을 돈다")]
        [SerializeField] GameObject dronePrefab;
        [Tooltip("분열 드론을 보통 드론보다 이만큼 키운다")]
        [SerializeField] float splitterScale = 1.4f;
        [Tooltip("드론 줄(3줄) 사이 세로 간격 (m). 줄은 화면에만 쓰고 규칙에는 쓰지 않는다. 첫 줄이 이 오브젝트의 높이다")]
        [SerializeField] float laneGap = 1.5f;
        [SerializeField] bool showStatusOnScreen = true;
        [SerializeField] bool logEvents = true;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다)")]
        [SerializeField] InputAction spawnAction;
        [SerializeField] InputAction splitterAction;
        [Tooltip("시연용: 화면의 모든 드론에 피해 1. 보통 드론(HP 1)은 다음 Update 에서 스스로 빠지고, 분열 드론(HP 2)은 남는다")]
        [SerializeField] InputAction empAction;

        DroneSwarm swarm;
        /// <summary>코어 드론 → 화면 오브젝트. Despawned 에서 Destroy 하고 여기서도 뺀다 (파괴된 오브젝트를 들고 있지 않게)</summary>
        readonly Dictionary<Drone, GameObject> views = new Dictionary<Drone, GameObject>();
        string statusText = "";
        int shownCount = -1, shownUpdated = -1, shownMerged = -1, shownRemoved = -1;

        /// <summary>처음 읽을 때 만든다. 다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게</summary>
        public DroneSwarm Swarm => swarm ??= new DroneSwarm(new SwarmSettings { MoveSpeed = moveSpeed, SplitDelay = splitDelay, SplitCount = splitCount });

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            spawnAction = new InputAction("Spawn", InputActionType.Button, "<Keyboard>/q");
            splitterAction = new InputAction("Splitter", InputActionType.Button, "<Keyboard>/w");
            empAction = new InputAction("Emp", InputActionType.Button, "<Keyboard>/e");
        }

        void OnEnable()
        {
            if (dronePrefab == null) Debug.LogError("[Swarm] Drone Prefab 칸이 비어 있다. 드론은 코어에서 움직이지만 화면에 보이지 않는다", this);
            Swarm.Spawned += OnSpawned;
            Swarm.SpawnQueued += OnSpawnQueued;
            Swarm.DespawnRequested += OnDespawnRequested;
            Swarm.Despawned += OnDespawned;
            Swarm.Damaged += OnDamaged;
            spawnAction.performed += OnSpawn;
            splitterAction.performed += OnSplitter;
            empAction.performed += OnEmp;
            spawnAction.Enable();
            splitterAction.Enable();
            empAction.Enable();
            // 꺼져 있던 동안 다른 스크립트가 드론을 내보냈다면 그 이벤트는 듣지 못했다. 화면 오브젝트를 지금 목록에 맞춘다
            SyncViews();
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 드론이 두 대 나온다
            Swarm.Spawned -= OnSpawned;
            Swarm.SpawnQueued -= OnSpawnQueued;
            Swarm.DespawnRequested -= OnDespawnRequested;
            Swarm.Despawned -= OnDespawned;
            Swarm.Damaged -= OnDamaged;
            spawnAction.performed -= OnSpawn;
            splitterAction.performed -= OnSplitter;
            empAction.performed -= OnEmp;
            spawnAction.Disable();
            splitterAction.Disable();
            empAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어 설정에도 넣는다
            if (swarm == null) return;
            swarm.Settings.MoveSpeed = moveSpeed;
            swarm.Settings.SplitDelay = splitDelay;
            swarm.Settings.SplitCount = splitCount;
        }

        void OnSpawn(InputAction.CallbackContext _) => Swarm.Launch(DroneKind.Normal);
        void OnSplitter(InputAction.CallbackContext _) => Swarm.Launch(DroneKind.Splitter);
        void OnEmp(InputAction.CallbackContext _) => Swarm.DamageAll(1);

        void Update()
        {
            Swarm.Tick(Time.deltaTime); // [1] 드론마다의 Update 는 엔진이 아니라 이 Tick 이 목록을 돌며 부른다
            // 매 프레임 바뀌는 위치만 여기서 옮긴다. 만들기와 Destroy 는 이벤트 핸들러에서 바로 한다
            foreach (Drone d in Swarm.Drones)
                if (views.TryGetValue(d, out GameObject go)) go.transform.position = WorldOf(d);
            RefreshStatus();
        }

        Vector3 WorldOf(Drone d) => transform.position + new Vector3(d.X, d.Lane * laneGap, 0f);

        void OnSpawned(Drone d)
        {
            CreateView(d); // [4] 목록에 들어온 드론에 화면 오브젝트를 짝짓는다
            Log($"{d.Name} 목록에 들어옴 · 목록 {Swarm.Drones.Count}");
        }

        void OnSpawnQueued(Drone d) => Log($"{d.Name} 대기 목록에 (분열)");

        void OnDespawnRequested(Drone d) => Log($"{d.Name} {Why(d.Reason)} → 지울 표시");

        void OnDespawned(Drone d)
        {
            if (views.TryGetValue(d, out GameObject go))
            {
                Destroy(go); // [4] Unity 의 Destroy 도 그 자리에서 지우지 않고 그 프레임의 Update 가 끝날 때까지 미룬다 (같은 생각)
                views.Remove(d);
            }
            Log($"{d.Name} 목록에서 지움");
        }

        void OnDamaged(int count, int damage) => Log($"EMP: 드론 {count}대 HP -{damage}");

        static string Why(DespawnReason reason) => reason == DespawnReason.Destroyed ? "HP 0" : reason == DespawnReason.ReachedBase ? "기지 도달" : "분열";

        void CreateView(Drone d)
        {
            if (dronePrefab == null || views.ContainsKey(d)) return;
            GameObject go = Instantiate(dronePrefab, WorldOf(d), Quaternion.identity, transform);
            go.name = $"Drone {d.Name}";
            if (d.Kind == DroneKind.Splitter) go.transform.localScale *= splitterScale;
            views[d] = go;
        }

        void SyncViews()
        {
            var alive = new HashSet<Drone>(Swarm.Drones);
            var gone = new List<Drone>();
            foreach (KeyValuePair<Drone, GameObject> pair in views)
                if (!alive.Contains(pair.Key)) gone.Add(pair.Key);
            foreach (Drone d in gone)
            {
                if (views[d] != null) Destroy(views[d]);
                views.Remove(d);
            }
            foreach (Drone d in Swarm.Drones) CreateView(d);
        }

        /// <summary>왼쪽 위 상태 글. 숫자가 바뀐 프레임에만 다시 만든다 (OnGUI 는 그리기만)</summary>
        void RefreshStatus()
        {
            int count = Swarm.Drones.Count;
            if (count == shownCount && Swarm.LastUpdated == shownUpdated && Swarm.LastMerged == shownMerged && Swarm.LastRemoved == shownRemoved) return;
            shownCount = count;
            shownUpdated = Swarm.LastUpdated;
            shownMerged = Swarm.LastMerged;
            shownRemoved = Swarm.LastRemoved;
            statusText = $"목록 {count} · 이번 프레임 업데이트 {shownUpdated} · 합침 {shownMerged} · 지움 {shownRemoved}";
        }

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[Swarm] {message}", this);
        }

        void OnGUI()
        {
            if (!showStatusOnScreen) return;
            GUI.Label(new Rect(12f, 12f, 640f, 24f), statusText);
        }
    }
}
