// 정비 기지 연결 컴포넌트: 게임 코드 셋(Turret, DroneField, RepairBay)을 들고 입력을 넘기고, 일어난 일을 Console 과 확인용 화면 글로 보인다.
// 소리 서비스를 칸으로 들지 않는다. 게임 코드가 Services.Audio 로 찾는다. Audio Host 칸은 R 키로 빼고 넣는 시연에만 쓴다.
// 왼쪽 위 상태 글은 확인용 IMGUI(OnGUI) 다. 실제 게임의 화면 글은 UGUI·TextMeshPro 로 만든다.
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.ServiceLocatorAudio
{
    public class MaintenanceBase : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름)")]
        [Tooltip("포탑의 처음 탄약. 처음 읽을 때(Play 시작) 한 번만 쓰고 Play 중에 바꿔도 반영되지 않는다. 0 이 되면 발사를 받지 않아 발사음도 없다")]
        [SerializeField] int startAmmo = 5;
        [Tooltip("드론 한 대를 파괴할 때 받는 크레딧. Play 중에 바꾸면 다음 파괴부터 쓴다")]
        [SerializeField] int reward = 10;

        [Header("기지 (웹 갤러리는 드론 5대, 수리 키트 3개로 고정)")]
        [Tooltip("드론 수. Play 를 시작할 때 한 번만 읽는다")]
        [SerializeField] int droneCount = 5;
        [Tooltip("처음 수리 키트. Play 를 시작할 때 한 번만 읽는다")]
        [SerializeField] int startKits = 3;

        [Header("소리 서비스 빼기·넣기 시연")]
        [Tooltip("R 로 끄고 켤 AudioServiceHost. 게임 코드는 이 칸이 아니라 Services.Audio 로 서비스를 찾는다. 비워 두면 R 은 경고만 남긴다")]
        [SerializeField] AudioServiceHost audioHost;

        [Header("입력")]
        [SerializeField] InputAction fireAction;
        [SerializeField] InputAction destroyAction;
        [SerializeField] InputAction repairAction;
        [SerializeField] InputAction toggleAudioAction;

        Turret turret;
        DroneField drones;
        RepairBay bay;
        string statusText = "";

        // 처음 읽을 때 만든다. 다른 오브젝트가 이 오브젝트의 Awake 보다 먼저 읽어도 null 이 아니게
        public Turret Turret => turret ??= new Turret(startAmmo);
        public DroneField Drones => drones ??= new DroneField(droneCount, reward);
        public RepairBay Bay => bay ??= new RepairBay(startKits);

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다
            fireAction = new InputAction("Fire", InputActionType.Button, "<Keyboard>/q");
            destroyAction = new InputAction("DestroyDrone", InputActionType.Button, "<Keyboard>/w");
            repairAction = new InputAction("CompleteRepair", InputActionType.Button, "<Keyboard>/e");
            toggleAudioAction = new InputAction("ToggleAudio", InputActionType.Button, "<Keyboard>/r");
        }

        void OnEnable()
        {
            Turret.Fired += HandleFired;
            Turret.Empty += HandleEmpty;
            Drones.Destroyed += HandleDroneDestroyed;
            Drones.NoneLeft += HandleNoneLeft;
            Bay.Repaired += HandleRepaired;
            Bay.NoKits += HandleNoKits;
            Services.AudioChanged += HandleAudioChanged;

            fireAction.performed += FirePressed;
            destroyAction.performed += DestroyPressed;
            repairAction.performed += RepairPressed;
            toggleAudioAction.performed += ToggleAudioPressed;
            fireAction.Enable();
            destroyAction.Enable();
            repairAction.Enable();
            toggleAudioAction.Enable();
            RefreshStatus();
        }

        void OnDisable()
        {
            Turret.Fired -= HandleFired;
            Turret.Empty -= HandleEmpty;
            Drones.Destroyed -= HandleDroneDestroyed;
            Drones.NoneLeft -= HandleNoneLeft;
            Bay.Repaired -= HandleRepaired;
            Bay.NoKits -= HandleNoKits;
            Services.AudioChanged -= HandleAudioChanged;

            fireAction.performed -= FirePressed;
            destroyAction.performed -= DestroyPressed;
            repairAction.performed -= RepairPressed;
            toggleAudioAction.performed -= ToggleAudioPressed;
            fireAction.Disable();
            destroyAction.Disable();
            repairAction.Disable();
            toggleAudioAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 에서 보상을 바꾸면 코어에도 넣고 화면 글을 다시 만든다 (startAmmo, droneCount, startKits 는 시작할 때만 읽는다)
            if (drones == null) return;
            drones.Reward = reward;
            RefreshStatus();
        }

        void FirePressed(InputAction.CallbackContext _) => Turret.Fire();
        void DestroyPressed(InputAction.CallbackContext _) => Drones.DestroyNext();
        void RepairPressed(InputAction.CallbackContext _) => Bay.Complete();

        void ToggleAudioPressed(InputAction.CallbackContext _)
        {
            // 지운 오브젝트는 == null 이 참이다 (Unity 의 파괴 비교)
            if (audioHost == null)
            {
                Debug.LogWarning("[정비 기지] Audio Host 칸이 비었거나 지워졌다. 빼기·넣기를 할 수 없다 (게임 코드는 그대로 NullAudioService 를 쓴다)", this);
                return;
            }
            audioHost.enabled = !audioHost.enabled; // 끄면 OnDisable → Provide(null), 켜면 OnEnable → Provide(서비스)
        }

        static string Silent() => Services.Audio is NullAudioService ? " (무음)" : "";

        void HandleFired(int ammoLeft) => Report($"포탑 발사 · 탄약 {ammoLeft}{Silent()}");
        void HandleEmpty() => Report("포탑 탄약 없음 (쏘지 않음)");
        void HandleDroneDestroyed(int index, int credits) => Report($"드론 {index + 1} 파괴{Silent()} · 크레딧 +{credits} → {Drones.Credits}");
        void HandleNoneLeft() => Report("남은 드론 없음");
        void HandleRepaired(int kits, int completed) => Report($"정비 완료 {completed}건{Silent()} · 수리 키트 {kits}");
        void HandleNoKits() => Report("수리 키트 없음 (정비 안 함)");
        void HandleAudioChanged(IAudioService audio) => Report($"Services.Audio → {AudioName(audio)}");

        static string AudioName(IAudioService audio) => audio is NullAudioService ? "NullAudioService (무음)" : audio.GetType().Name;

        void Report(string message)
        {
            Debug.Log($"[정비 기지] {message}", this);
            RefreshStatus();
        }

        /// <summary>왼쪽 위 상태 글. 이벤트를 받을 때 바로 만든다 (OnGUI 는 그리기만)</summary>
        void RefreshStatus()
        {
            int alive = 0;
            for (int i = 0; i < Drones.Count; i++) if (Drones.IsAlive(i)) alive++;
            statusText = $"탄약 {Turret.Ammo} · 크레딧 {Drones.Credits} (한 대 +{Drones.Reward}) · 수리 키트 {Bay.Kits} · 정비 완료 {Bay.Completed}건 · 드론 {alive}/{Drones.Count}\n"
                + $"Services.Audio → {AudioName(Services.Audio)}";
        }

        void OnGUI() => GUI.Label(new Rect(12f, 12f, 720f, 48f), statusText);
    }
}
