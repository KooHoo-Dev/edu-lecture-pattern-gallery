// 격납고 어댑터: Input System 입력을 코어 Hangar 에 넘기고, 복제가 생기면 드론 프리팹을 Instantiate 해 코어 드론과 짝짓는다.
// 모듈·HP·속도 변화는 Hangar 의 이벤트 핸들러에서 바로 화면에 옮긴다. 복제 규칙은 여기 없다 (Core/ 의 ScoutDrone.Clone, Hangar).
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.PrototypeDroneClone
{
    public class DroneHangar : MonoBehaviour
    {
        [Header("조절 값 (Play 중에 바꿔도 반영된다. Module Name 밖은 웹 갤러리와 같은 이름)")]
        [Tooltip("활주로에 세울 수 있는 복제본 수. 가득 차면 복제를 받지 않는다")]
        [SerializeField] int maxClones = 5;
        [Tooltip("'첫 복제본에 피해' 한 번에 깎는 HP")]
        [SerializeField] int damageAmount = 40;
        [Tooltip("'견본 개조' 한 번에 견본에 더하는 속도. 개조 뒤의 복제본만 빨라진다")]
        [SerializeField] float upgradeSpeed = 2f;
        [Tooltip("'마지막 복제본에 모듈' 이 다는 모듈 이름. 바꾸면 다음 장착부터 쓴다")]
        [SerializeField] string moduleName = "냉각";

        [Header("견본 (Play 를 시작할 때 한 번만 읽는다)")]
        [SerializeField] string templateName = "정찰 드론";
        [SerializeField] int templateHp = 100;
        [SerializeField] float templateSpeed = 4f;
        [SerializeField] string[] templateModules = { "카메라" };

        [Header("화면")]
        [Tooltip("받침대 위 견본의 모습 (장면에 놓인 DroneView)")]
        [SerializeField] DroneView templateView;
        [Tooltip("복제본으로 Instantiate 할 프리팹 (Project 창의 에셋). Instantiate 는 넣은 오브젝트의 지금 상태를 복제한다. " +
                 "HP 를 뷰에 들고 있으면 장면의 다친 드론을 넣었을 때 다친 채 복제되지만, 이 표본은 복제 직후 코어 값으로 다시 그려서 드러나지 않는다")]
        [SerializeField] DroneView clonePrefab;
        [Tooltip("첫 복제본 자리. 비우면 이 오브젝트의 위치")]
        [SerializeField] Transform runwayStart;
        [SerializeField] float spacing = 2.1f;
        [SerializeField] bool showStatusOnScreen = true;
        [SerializeField] bool logEvents = true;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다)")]
        [SerializeField] InputAction cloneAction;
        [SerializeField] InputAction moduleAction;
        [SerializeField] InputAction damageAction;
        [SerializeField] InputAction upgradeAction;

        Hangar hangar;
        /// <summary>코어 드론과 화면 오브젝트의 짝. ScoutDrone 은 Equals 를 바꾸지 않아 참조로 찾는다</summary>
        readonly Dictionary<ScoutDrone, DroneView> views = new Dictionary<ScoutDrone, DroneView>();
        string statusText = "";

        /// <summary>
        /// 처음 읽을 때 만든다. 다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게.
        /// </summary>
        public Hangar Hangar => hangar ??= new Hangar(BuildTemplate())
        {
            MaxClones = maxClones,
            DamageAmount = damageAmount,
            UpgradeSpeed = upgradeSpeed,
            ModuleName = moduleName,
        };

        /// <summary>견본은 여기서 한 번만 다 설정한다. 이후 드론은 모두 이것을 복제한다</summary>
        ScoutDrone BuildTemplate() => new ScoutDrone(templateName, templateHp, templateSpeed, templateModules); // [1]

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            cloneAction = new InputAction("Clone", InputActionType.Button, "<Keyboard>/c");
            moduleAction = new InputAction("Module", InputActionType.Button, "<Keyboard>/m");
            damageAction = new InputAction("Damage", InputActionType.Button, "<Keyboard>/d");
            upgradeAction = new InputAction("Upgrade", InputActionType.Button, "<Keyboard>/u");
        }

        void OnEnable()
        {
            Hangar.Cloned += OnCloned;
            Hangar.CloneRejected += OnCloneRejected;
            Hangar.ModuleAttached += OnModuleAttached;
            Hangar.Damaged += OnDamaged;
            Hangar.TemplateUpgraded += OnTemplateUpgraded;
            Hangar.NoClone += OnNoClone;
            cloneAction.performed += OnClone;
            moduleAction.performed += OnModule;
            damageAction.performed += OnDamage;
            upgradeAction.performed += OnUpgrade;
            cloneAction.Enable();
            moduleAction.Enable();
            damageAction.Enable();
            upgradeAction.Enable();
            // 꺼져 있던 동안 다른 스크립트가 Hangar 를 바꿨다면 그 이벤트는 듣지 못했다. 빠진 뷰를 만들고 모두 코어 값으로 다시 그린다
            SyncViews();
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 두 대가 복제된다
            Hangar.Cloned -= OnCloned;
            Hangar.CloneRejected -= OnCloneRejected;
            Hangar.ModuleAttached -= OnModuleAttached;
            Hangar.Damaged -= OnDamaged;
            Hangar.TemplateUpgraded -= OnTemplateUpgraded;
            Hangar.NoClone -= OnNoClone;
            cloneAction.performed -= OnClone;
            moduleAction.performed -= OnModule;
            damageAction.performed -= OnDamage;
            upgradeAction.performed -= OnUpgrade;
            cloneAction.Disable();
            moduleAction.Disable();
            damageAction.Disable();
            upgradeAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어 설정에도 넣는다 (견본의 이름, HP, 속도, 모듈은 Play 를 다시 시작해야 바뀐다)
            if (hangar == null) return;
            hangar.MaxClones = maxClones;
            hangar.DamageAmount = damageAmount;
            hangar.UpgradeSpeed = upgradeSpeed;
            hangar.ModuleName = moduleName;
            RefreshStatus();
        }

        void OnClone(InputAction.CallbackContext _) => Hangar.CloneTemplate(); // [2]
        void OnModule(InputAction.CallbackContext _) => Hangar.AttachModule(); // [4]
        void OnDamage(InputAction.CallbackContext _) => Hangar.DamageFirst();
        void OnUpgrade(InputAction.CallbackContext _) => Hangar.UpgradeTemplate();

        void OnCloned(ScoutDrone drone)
        {
            DroneView view = CreateView(drone, Hangar.Clones.Count - 1);
            if (view != null) view.Show(drone); // [3] HP 바와 모듈 상자를 이 복제본의 코어 값으로 새로 그린다 (Instantiate 한 원본의 상태는 덮인다)
            Log($"복제 {drone.Name} · HP {drone.Hp} 속도 {drone.Speed:0.00} · 모듈 [{string.Join(" ", drone.Modules)}]");
            RefreshStatus();
        }

        /// <summary>
        /// 화면 쪽 복제: 프리팹(아무도 고치지 않는 견본)을 Instantiate 해 코어 드론과 짝짓는다. 이것도 프로토타입 패턴이다.
        /// 이 오브젝트 아래에 만들어, 격납고를 지우면 뷰도 함께 사라진다. 자리(spacing)는 화면에만 있고 코어는 위치를 모른다.
        /// </summary>
        DroneView CreateView(ScoutDrone drone, int index)
        {
            if (clonePrefab == null) return null;
            Vector3 origin = runwayStart != null ? runwayStart.position : transform.position;
            Vector3 position = origin + Vector3.right * spacing * index;
            DroneView view = Instantiate(clonePrefab, position, Quaternion.identity, transform); // [2] 엔진의 복제: 프리팹의 직렬화된 상태를 통째로 복사한다
            views[drone] = view;
            return view;
        }

        /// <summary>견본과 모든 복제본을 코어 값으로 다시 그린다. 뷰가 없거나 파괴됐으면(Unity 의 == null) 새로 만든다</summary>
        void SyncViews()
        {
            if (templateView != null) templateView.Show(Hangar.Template);
            for (int i = 0; i < Hangar.Clones.Count; i++)
            {
                ScoutDrone drone = Hangar.Clones[i];
                DroneView view = ViewOf(drone);
                if (view == null) view = CreateView(drone, i);
                if (view != null) view.Show(drone);
            }
            RefreshStatus();
        }

        /// <summary>코어 드론의 뷰. 짝이 없거나 뷰가 파괴됐으면(Unity 의 == null 이 참) null</summary>
        DroneView ViewOf(ScoutDrone drone)
        {
            if (views.TryGetValue(drone, out DroneView view) && view != null) return view;
            return null;
        }

        void OnCloneRejected(int max)
        {
            Log($"복제 거절: 활주로가 가득 찼다 ({max}/{max})");
        }

        void OnModuleAttached(ScoutDrone drone, string module)
        {
            DroneView view = ViewOf(drone);
            if (view != null) view.ShowModules(drone.Modules); // [4] 이 드론의 상자만 다시 그린다
            Log($"{drone.Name} 에 {module} 장착 → 모듈 [{string.Join(" ", drone.Modules)}]");
            RefreshStatus();
        }

        void OnDamaged(ScoutDrone drone, int amount)
        {
            DroneView view = ViewOf(drone);
            if (view != null) view.ShowHp(drone);
            Log($"{drone.Name} 피해 {amount} → HP {drone.Hp}");
        }

        void OnTemplateUpgraded(float previous, float current)
        {
            if (templateView != null) templateView.Show(Hangar.Template);
            Log($"견본 개조: 속도 {previous:0.00} → {current:0.00} (이미 나간 복제본은 그대로)");
            RefreshStatus();
        }

        void OnNoClone(string input) => Log(input == "module" ? "복제본이 없다 (모듈 장착)" : "복제본이 없다 (피해)");

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[Hangar] {message}", this);
        }

        /// <summary>왼쪽 위 상태 글. 이벤트를 받을 때 바로 만든다 (OnGUI 는 그리기만)</summary>
        void RefreshStatus()
        {
            // 견본과 복제본 가운데 같은 Modules 목록 객체를 가리키는 가장 큰 무리
            var lists = new List<List<string>> { Hangar.Template.Modules };
            foreach (ScoutDrone d in Hangar.Clones) lists.Add(d.Modules);
            int shared = 0;
            foreach (List<string> a in lists)
            {
                int n = 0;
                foreach (List<string> b in lists) if (ReferenceEquals(a, b)) n++;
                if (n > shared) shared = n;
            }
            string share = shared > 1 ? $"Modules 공유: {shared}대" : "Modules 공유: 없음 (대마다 새 목록)";
            statusText = $"복제 {Hangar.Clones.Count}/{Hangar.MaxClones} · 견본 속도 {Hangar.Template.Speed:0.0}\n{share}";
        }

        void OnGUI()
        {
            if (!showStatusOnScreen) return;
            GUI.Label(new Rect(12f, 12f, 640f, 48f), statusText);
        }
    }
}
