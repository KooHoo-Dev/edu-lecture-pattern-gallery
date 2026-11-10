// 탐지 포탑 연결 컴포넌트: 입력(Input System)으로 드론을 더하고 탐지하며, Update 에서 코어 Field·Turret 을 Tick 한다.
// 이 오브젝트의 자리가 구역의 왼쪽 아래 (0, 0) 이고, 포탑은 구역 가운데 (8, 4.5) 다. 드론 화면(DroneView)은 이 오브젝트의 자식으로 만든다.
// 격자 선·반경·이번 탐지가 본 칸은 Gizmos 로 그리고 (Scene 뷰, Game 뷰는 Gizmos 버튼), 왼쪽 위 상태 글은 확인용 IMGUI(OnGUI) 다.
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.SpatialGridDetection
{
    public class TurretScanner : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름. Play 중에 바꿔도 반영된다)")]
        [Tooltip("격자 한 칸의 크기 (m). 작을수록 탐지가 보는 칸이 늘고, 클수록 한 칸에 드론이 많아 거리 검사가 는다. Play 중에 바꾸면 모든 드론을 새 칸에 다시 등록한다")]
        [Min(0.25f)]
        [SerializeField] float cellSize = 2f;
        [Tooltip("탐지 반경 (m). 포탑(구역 가운데)에서 이 거리 안의 드론을 찾는다")]
        [Min(0.1f)]
        [SerializeField] float scanRadius = 2.5f;
        [Tooltip("드론이 움직이는 빠르기 (m/s). 드론마다 정해진 방향으로 가고 구역 가장자리에서 튕긴다")]
        [Min(0f)]
        [SerializeField] float droneSpeed = 1.5f;
        [Tooltip("자동 탐지를 켰을 때 탐지 간격 (초). 웹은 0.5 고정")]
        [Min(0.05f)]
        [SerializeField] float scanInterval = 0.5f;

        [Header("화면")]
        [Tooltip("DroneView 를 붙인 드론 프리팹 (Project 창의 에셋)")]
        [SerializeField] DroneView dronePrefab;
        [SerializeField] bool showStatusOnScreen = true;
        [SerializeField] bool logEvents = true;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다)")]
        [SerializeField] InputAction waveAction;
        [SerializeField] InputAction scanAction;
        [SerializeField] InputAction autoScanAction;

        Field field;
        Turret turret;
        /// <summary>코어 드론 → 화면 오브젝트</summary>
        readonly Dictionary<Drone, DroneView> views = new Dictionary<Drone, DroneView>();
        string statusText = "아직 탐지 전";

        /// <summary>처음 읽을 때 만든다. 다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게</summary>
        public Field Field => field ??= new Field(new FieldSettings { CellSize = cellSize, DroneSpeed = droneSpeed });
        public Turret Turret => turret ??= new Turret(Field.Grid, Field.Settings.TurretX, Field.Settings.TurretY, scanRadius) { ScanInterval = scanInterval };

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            waveAction = new InputAction("Wave", InputActionType.Button, "<Keyboard>/q");
            scanAction = new InputAction("Scan", InputActionType.Button, "<Keyboard>/w");
            autoScanAction = new InputAction("AutoScan", InputActionType.Button, "<Keyboard>/e");
        }

        void OnEnable()
        {
            if (dronePrefab == null) Debug.LogError("[Grid] Drone Prefab 칸이 비어 있다. 드론은 코어에서 움직이지만 화면에 보이지 않는다", this);
            Field.Added += OnAdded;
            Field.Removed += OnRemoved;
            Field.CellChanged += OnCellChanged;
            Turret.Scanned += OnScanned;
            Turret.AutoScanChanged += OnAutoScanChanged;
            waveAction.performed += OnWave;
            scanAction.performed += OnScan;
            autoScanAction.performed += OnAutoScan;
            waveAction.Enable();
            scanAction.Enable();
            autoScanAction.Enable();
            // 꺼져 있던 동안의 이벤트는 듣지 못했다. 화면 오브젝트와 탐지 표시를 지금 코어 상태에 맞춘다
            SyncViews();
            ShowScan(Turret.Last);
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 드론이 여섯 대 나온다
            Field.Added -= OnAdded;
            Field.Removed -= OnRemoved;
            Field.CellChanged -= OnCellChanged;
            Turret.Scanned -= OnScanned;
            Turret.AutoScanChanged -= OnAutoScanChanged;
            waveAction.performed -= OnWave;
            scanAction.performed -= OnScan;
            autoScanAction.performed -= OnAutoScan;
            waveAction.Disable();
            scanAction.Disable();
            autoScanAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어 설정에도 넣는다
            if (field == null) return;
            field.Settings.DroneSpeed = droneSpeed;
            if (field.Grid.CellSize != cellSize) field.SetCellSize(cellSize); // 모든 드론을 새 칸 크기로 다시 등록한다
            if (turret == null) return;
            turret.Radius = scanRadius;
            turret.ScanInterval = scanInterval;
        }

        void OnWave(InputAction.CallbackContext _) => Field.AddWave();
        void OnScan(InputAction.CallbackContext _) => Turret.Scan(); // [3]
        void OnAutoScan(InputAction.CallbackContext _) => Turret.SetAutoScan(!Turret.AutoScan);

        void Update()
        {
            Field.Tick(Time.deltaTime); // [2] 드론을 옮기고, 칸을 넘은 드론은 격자에서 등록을 옮긴다
            Turret.Tick(Time.deltaTime);
            // 드론 화면은 DroneView.LateUpdate 가 코어 자리를 따라간다
        }

        void OnAdded(Drone d)
        {
            CreateView(d);
            Log($"{d.Name} 칸 {d.Cell} 에 등록"); // [1]
        }

        void OnRemoved(Drone d)
        {
            if (views.TryGetValue(d, out DroneView view))
            {
                if (view != null) Destroy(view.gameObject);
                views.Remove(d);
            }
            Log($"{d.Name} 구역과 격자에서 빠짐");
        }

        void OnCellChanged(Drone d, Cell from, Cell to) => Log($"{d.Name} 칸 {from} → {to}");

        void OnScanned(ScanResult r)
        {
            ShowScan(r);
            var names = new List<string>();
            foreach (Drone d in r.Found) names.Add(d.Name);
            Log($"탐지: 칸 {r.Visited.Count}개 · 거리 검사 {r.Checks}회 (전체 검사면 {r.FullChecks}회) · 찾음 {(names.Count == 0 ? "없음" : string.Join(", ", names))}");
        }

        void OnAutoScanChanged(bool on) => Log(on ? $"자동 탐지 켬 ({Turret.ScanInterval}초마다)" : "자동 탐지 끔");

        /// <summary>탐지 결과를 드론 화면과 상태 글에 바로 반영한다 (이벤트 핸들러 안에서)</summary>
        void ShowScan(ScanResult r)
        {
            var found = r == null ? new HashSet<Drone>() : new HashSet<Drone>(r.Found);
            foreach (KeyValuePair<Drone, DroneView> pair in views)
                if (pair.Value != null) pair.Value.SetFound(found.Contains(pair.Key)); // [4]
            statusText = r == null
                ? "아직 탐지 전"
                : $"거리 검사 {r.Checks} 회 (전체 검사면 {r.FullChecks} 회) · 찾은 드론 {r.Found.Count} · 본 칸 {r.Visited.Count}";
        }

        void CreateView(Drone d)
        {
            if (dronePrefab == null || views.ContainsKey(d)) return;
            DroneView view = Instantiate(dronePrefab, transform);
            view.Bind(d);
            views[d] = view;
        }

        void SyncViews()
        {
            var alive = new HashSet<Drone>(Field.Drones);
            var gone = new List<Drone>();
            foreach (KeyValuePair<Drone, DroneView> pair in views)
                if (!alive.Contains(pair.Key)) gone.Add(pair.Key);
            foreach (Drone d in gone)
            {
                if (views[d] != null) Destroy(views[d].gameObject);
                views.Remove(d);
            }
            foreach (Drone d in Field.Drones) CreateView(d);
        }

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[Grid] {message}", this);
        }

        void OnGUI()
        {
            if (!showStatusOnScreen) return;
            GUI.Label(new Rect(12f, 12f, 720f, 24f), statusText);
        }

        /// <summary>격자 선, 탐지 반경, 마지막 탐지가 본 칸. Play 전에도 Inspector 값으로 그린다</summary>
        void OnDrawGizmos()
        {
            FieldSettings s = field != null ? field.Settings : new FieldSettings();
            float size = field != null ? field.Grid.CellSize : cellSize;
            if (size <= 0f) return;
            // 드론 화면이 이 오브젝트의 자식(로컬 좌표)이므로 Gizmos 도 이 오브젝트의 로컬 좌표로 그린다 (돌리거나 키워도 함께 따라간다)
            Matrix4x4 before = Gizmos.matrix;
            Gizmos.matrix = transform.localToWorldMatrix;
            if (turret != null && turret.Last != null)
            {
                Gizmos.color = new Color(0.49f, 0.88f, 0.51f, 0.18f);
                foreach (Cell c in turret.Last.Visited)
                    Gizmos.DrawCube(new Vector3((c.X + 0.5f) * size, (c.Y + 0.5f) * size, 0f), new Vector3(size, size, 0.01f));
            }
            Gizmos.color = new Color(0.35f, 0.45f, 0.6f, 0.8f);
            for (int i = 0; i * size <= s.Width + 0.001f; i++)
                Gizmos.DrawLine(new Vector3(i * size, 0f, 0f), new Vector3(i * size, s.Height, 0f));
            for (int j = 0; j * size <= s.Height + 0.001f; j++)
                Gizmos.DrawLine(new Vector3(0f, j * size, 0f), new Vector3(s.Width, j * size, 0f));
            // 구역 테두리 (칸 크기가 16·9 로 나누어떨어지지 않으면 오른쪽·위 끝 칸은 구역 밖으로 걸친다)
            Gizmos.DrawWireCube(new Vector3(s.Width / 2f, s.Height / 2f, 0f), new Vector3(s.Width, s.Height, 0f));
            Gizmos.color = new Color(0.36f, 0.78f, 1f);
            Gizmos.DrawWireSphere(new Vector3(s.TurretX, s.TurretY, 0f), turret != null ? turret.Radius : scanRadius);
            Gizmos.matrix = before;
        }
    }
}
