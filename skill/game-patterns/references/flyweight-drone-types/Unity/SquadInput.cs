// 구역 연결 컴포넌트: 종류 에셋을 한 번씩 읽어 코어 DroneType 을 만들고, Input System 입력을 코어 Squad 에 넘긴다.
// 드론이 나오면 프리팹을 Instantiate 해 코어 Drone 과 짝짓고, 피해·파괴·밸런스 수정은 Squad 의 이벤트 핸들러에서 바로 화면에 옮긴다.
// 공유 규칙은 여기 없다 (Core/ 의 Squad, Drone, DroneType). 에셋은 읽기만 하고 고치지 않는다.
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.FlyweightDroneTypes
{
    public class SquadInput : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름)")]
        [Tooltip("피해 입력 한 번에 깎는 HP. Play 중에 바꾸면 다음 피해부터 쓴다")]
        [Min(1)]
        [SerializeField] int damage = 1;
        [Tooltip("밸런스 수정 한 번에 정찰형 최대 HP 에 더하는 값. Play 중에 바꾸면 다음 수정부터 쓴다")]
        [Min(1)]
        [SerializeField] int patchHp = 2;
        [Tooltip("처음 구역에 둘 정찰형 수. Play 를 시작할 때 한 번만 읽는다")]
        [SerializeField] int scoutCount = 3;
        [Tooltip("처음 구역에 둘 중장갑 수. Play 를 시작할 때 한 번만 읽는다")]
        [SerializeField] int heavyCount = 2;

        [Header("종류 데이터 (Play 를 시작할 때 한 번만 읽는다. 에셋은 고치지 않는다)")]
        [SerializeField] DroneTypeAsset scoutType;
        [SerializeField] DroneTypeAsset heavyType;

        [Header("화면")]
        [Tooltip("드론으로 Instantiate 할 프리팹 (Project 창의 에셋). 이 오브젝트 아래, 코어 Drone.X 만큼 오른쪽에 생긴다")]
        [SerializeField] DroneView dronePrefab;
        [Tooltip("HP 막대가 꽉 차는 HP. 종류의 최대 HP 로 나누지 않는다 (밸런스 수정이 막대에 보이게)")]
        [SerializeField] float barFullHp = 10f;
        [SerializeField] bool showStatusOnScreen = true;
        [SerializeField] bool logEvents = true;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다)")]
        [SerializeField] InputAction hitScoutAction;
        [SerializeField] InputAction hitHeavyAction;
        [SerializeField] InputAction spawnAction;
        [SerializeField] InputAction patchAction;

        Squad squad;
        DroneType scout;
        DroneType heavy;
        /// <summary>코어 드론과 화면 오브젝트의 짝. Drone 은 Equals 를 바꾸지 않아 참조로 찾는다</summary>
        readonly Dictionary<Drone, DroneView> views = new Dictionary<Drone, DroneView>();
        string statusText = "";

        /// <summary>
        /// 처음 읽을 때 만든다. 다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게.
        /// 종류 에셋 칸이 잘못됐으면 만들지 않고 LogError 를 남긴 뒤 null (빈 에셋을 읽다 NullReferenceException 이 나지 않게).
        /// </summary>
        public Squad Squad => squad ??= HasTypes() ? BuildSquad() : null;

        Squad BuildSquad()
        {
            scout = scoutType.ToDroneType(); // [1] 에셋마다 한 번만 만든다. 모든 정찰형이 이 객체 하나를 가리킨다
            heavy = heavyType.ToDroneType(); // [1]
            var s = new Squad(scout, heavy) { Damage = damage, PatchHp = patchHp };
            // 중장갑을 먼저 왼쪽 자리에 둔다. 새 정찰형은 왼쪽부터 빈 자리에 나오므로 정찰형 옆(오른쪽)에 생긴다
            for (int i = 0; i < heavyCount; i++) s.Spawn(heavy);
            for (int i = 0; i < scoutCount; i++) s.Spawn(scout);
            return s;
        }

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            hitScoutAction = new InputAction("HitScout", InputActionType.Button, "<Keyboard>/q");
            hitHeavyAction = new InputAction("HitHeavy", InputActionType.Button, "<Keyboard>/w");
            spawnAction = new InputAction("Spawn", InputActionType.Button, "<Keyboard>/e");
            patchAction = new InputAction("Patch", InputActionType.Button, "<Keyboard>/r");
        }

        /// <summary>두 종류 에셋이 들어 있고 이름·머리 글자가 비지 않았으며 이름이 서로 다른지 본다. 아니면 알리고 다른 값으로 대신하지 않는다</summary>
        bool HasTypes()
        {
            if (scoutType == null || heavyType == null)
            {
                Debug.LogError("[Squad] Scout Type 과 Heavy Type 칸에 종류 에셋(Create > Pattern Gallery > Drone Type)을 넣는다", this);
                return false;
            }
            if (string.IsNullOrEmpty(scoutType.TypeName) || string.IsNullOrEmpty(heavyType.TypeName) || scoutType.TypeName == heavyType.TypeName)
            {
                Debug.LogError("[Squad] 두 종류 에셋의 Type Name 을 비우지 말고 서로 다르게 적는다 (종류 사전의 열쇠다)", this);
                return false;
            }
            if (string.IsNullOrEmpty(scoutType.Code) || string.IsNullOrEmpty(heavyType.Code))
            {
                Debug.LogError("[Squad] 두 종류 에셋의 Code 를 비우지 않는다 (드론 이름 S1, H1 의 머리 글자다)", this);
                return false;
            }
            return true;
        }

        void OnEnable()
        {
            if (Squad == null) // 종류 에셋 칸이 잘못됐다. HasTypes 가 LogError 를 남겼다
            {
                enabled = false;
                return;
            }
            if (dronePrefab == null)
                Debug.LogError("[Squad] Drone Prefab 칸에 Project 창의 Drone 프리팹을 넣는다. 비어 있으면 드론이 화면에 나오지 않는다 (Console 기록만 남는다)", this);
            Squad.Spawned += OnSpawned;
            Squad.SpawnRejected += OnSpawnRejected;
            Squad.Damaged += OnDamaged;
            Squad.Destroyed += OnDestroyed;
            Squad.NoTarget += OnNoTarget;
            Squad.TypePatched += OnTypePatched;
            hitScoutAction.performed += OnHitScout;
            hitHeavyAction.performed += OnHitHeavy;
            spawnAction.performed += OnSpawn;
            patchAction.performed += OnPatch;
            hitScoutAction.Enable();
            hitHeavyAction.Enable();
            spawnAction.Enable();
            patchAction.Enable();
            // 처음 드론들과, 꺼져 있던 동안 다른 스크립트가 바꾼 드론은 이벤트를 듣지 못했다. 코어 목록으로 뷰를 맞춘다
            SyncViews();
        }

        void OnDisable()
        {
            if (squad == null) return; // 종류 에셋이 없어 켜지지 않았다
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 두 번 맞는다
            squad.Spawned -= OnSpawned;
            squad.SpawnRejected -= OnSpawnRejected;
            squad.Damaged -= OnDamaged;
            squad.Destroyed -= OnDestroyed;
            squad.NoTarget -= OnNoTarget;
            squad.TypePatched -= OnTypePatched;
            hitScoutAction.performed -= OnHitScout;
            hitHeavyAction.performed -= OnHitHeavy;
            spawnAction.performed -= OnSpawn;
            patchAction.performed -= OnPatch;
            hitScoutAction.Disable();
            hitHeavyAction.Disable();
            spawnAction.Disable();
            patchAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어 설정에도 넣고, 막대 기준이 바뀌었을 수 있어 모두 다시 그린다
            if (squad == null) return;
            squad.Damage = damage;
            squad.PatchHp = patchHp;
            foreach (DroneView view in views.Values) if (view != null) view.ShowHp(barFullHp);
        }

        void OnHitScout(InputAction.CallbackContext _) => Squad.HitFirst(scout);
        void OnHitHeavy(InputAction.CallbackContext _) => Squad.HitFirst(heavy);
        void OnSpawn(InputAction.CallbackContext _) => Squad.Spawn(scout);
        void OnPatch(InputAction.CallbackContext _) => Squad.Patch(scout);

        void OnSpawned(Drone drone)
        {
            CreateView(drone);
            Log($"{drone.Name} 나옴 · {drone.Type.Name} · HP {drone.Hp}/{drone.Type.MaxHp}");
            RefreshStatus();
        }

        void OnSpawnRejected(int max) => Log($"나오지 못함: 구역 자리가 가득 찼다 ({max}/{max})");

        void OnDamaged(Drone drone, int amount)
        {
            DroneView view = ViewOf(drone);
            if (view != null) view.ShowHp(barFullHp); // [3] 맞은 드론의 막대만 다시 그린다
            Log($"{drone.Name} 피해 {amount} → HP {drone.Hp}/{drone.Type.MaxHp}");
        }

        void OnDestroyed(Drone drone)
        {
            DroneView view = ViewOf(drone);
            if (view != null) Destroy(view.gameObject);
            views.Remove(drone);
            Log($"{drone.Name} 파괴 → 목록에서 뺀다");
            RefreshStatus();
        }

        void OnNoTarget(DroneType type) => Log($"{type.Name} 드론이 없다 (피해 없음)");

        void OnTypePatched(DroneType type, int previous)
        {
            // 코어는 공유라 이미 반영됐다. 화면은 이 종류를 가리키는 드론의 뷰를 모두 다시 그린다
            foreach (KeyValuePair<Drone, DroneView> pair in views)
                if (pair.Key.Type == type && pair.Value != null) pair.Value.ShowHp(barFullHp); // [4]
            Log($"밸런스 수정: {type.Name} 최대 HP {previous} → {type.MaxHp} ({type.Name} {Squad.CountOf(type)}대에 바로 반영, 지금 HP 는 그대로)");
            RefreshStatus();
        }

        /// <summary>프리팹을 이 오브젝트 아래, 코어 드론의 X 자리에 만들어 짝짓는다</summary>
        void CreateView(Drone drone)
        {
            if (dronePrefab == null) return;
            DroneView view = Instantiate(dronePrefab, transform);
            view.transform.localPosition = new Vector3(drone.X, 0f, 0f);
            view.Bind(drone, barFullHp);
            views[drone] = view;
        }

        /// <summary>코어 목록으로 뷰를 맞춘다: 없거나 파괴된 뷰는 만들고, 목록에서 빠진 드론의 뷰는 지운다</summary>
        void SyncViews()
        {
            var alive = new HashSet<Drone>(Squad.Drones);
            var gone = new List<Drone>();
            foreach (KeyValuePair<Drone, DroneView> pair in views)
            {
                if (alive.Contains(pair.Key)) continue;
                if (pair.Value != null) Destroy(pair.Value.gameObject);
                gone.Add(pair.Key);
            }
            foreach (Drone d in gone) views.Remove(d);
            foreach (Drone drone in Squad.Drones)
            {
                DroneView view = ViewOf(drone);
                if (view == null) CreateView(drone);
                else view.ShowHp(barFullHp);
            }
            RefreshStatus();
        }

        /// <summary>코어 드론의 뷰. 짝이 없거나 뷰가 파괴됐으면(Unity 의 == null 이 참) null</summary>
        DroneView ViewOf(Drone drone)
        {
            if (views.TryGetValue(drone, out DroneView view) && view != null) return view;
            return null;
        }

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[Squad] {message}", this);
        }

        /// <summary>왼쪽 위 상태 글. 이벤트를 받을 때 바로 만든다 (OnGUI 는 그리기만)</summary>
        void RefreshStatus()
        {
            statusText = $"종류 데이터 {Squad.Types.Count}개 · 드론 {Squad.Drones.Count}대\n" +
                         $"{scout.Name} 최대 HP {scout.MaxHp} · {heavy.Name} 최대 HP {heavy.MaxHp} · 지금 HP 는 드론마다 따로";
        }

        void OnGUI()
        {
            if (!showStatusOnScreen) return;
            GUI.Label(new Rect(12f, 12f, 640f, 48f), statusText);
        }
    }
}
