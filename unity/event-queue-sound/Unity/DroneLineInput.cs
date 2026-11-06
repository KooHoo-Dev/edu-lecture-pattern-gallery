// 드론 줄 확인용 어댑터: Input System 입력(단발, 일제 사격, 새 웨이브)을 코어 DroneLine 에 넘기고, 파괴·웨이브 끝 이벤트를 받으면 효과음을 큐에 요청만 한다.
// 실제 게임에서는 포탑과 드론의 체력 코드가 DroneLine 자리에 있다. 여기 핸들러는 소리를 틀지 않는다: Request 하고 바로 돌아가며, 소리는 SoundQueuePlayer 의 Tick 에서 난다.
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.EventQueueSound
{
    public class DroneLineInput : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름)")]
        [Tooltip("드론 하나가 파괴될 때 요청하는 폭발음 음량 (0~1). 같은 프레임의 폭발은 큐에서 하나로 합쳐 이 음량으로 한 번 난다. Play 중에 바꾸면 다음 요청부터 쓴다")]
        [SerializeField] float explosionVolume = 0.5f;
        [Tooltip("마지막 드론이 파괴될 때 요청하는 웨이브 끝 알림음 음량 (0~1). Play 중에 바꾸면 다음 요청부터 쓴다")]
        [SerializeField] float alertVolume = 0.4f;

        [Header("연결")]
        [Tooltip("효과음 큐를 든 SoundQueuePlayer (스피커 오브젝트). 비어 있으면 드론은 파괴되지만 소리를 요청하지 않는다")]
        [SerializeField] SoundQueuePlayer sounds;
        [Tooltip("드론 그림. 포탑에 가까운 것부터 차례로 넣는다 (단발은 맨 앞부터 맞힌다). 칸 수가 드론 수이고, Play 를 시작할 때 한 번 읽는다. 비워 두면 그림 없이 5대로 돈다")]
        [SerializeField] GameObject[] droneViews = new GameObject[0];
        [SerializeField] bool logEvents = true;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다)")]
        [SerializeField] InputAction shotAction;
        [SerializeField] InputAction volleyAction;
        [SerializeField] InputAction waveAction;

        DroneLine line;

        /// <summary>처음 읽을 때 만든다. 다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게</summary>
        public DroneLine Line => line ??= new DroneLine(droneViews != null && droneViews.Length > 0 ? droneViews.Length : 5);

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            shotAction = new InputAction("Shot", InputActionType.Button, "<Keyboard>/q");
            volleyAction = new InputAction("Volley", InputActionType.Button, "<Keyboard>/w");
            waveAction = new InputAction("Wave", InputActionType.Button, "<Keyboard>/e");
        }

        void OnEnable()
        {
            if (sounds == null) Debug.LogWarning("[DroneLine] Sounds 칸이 비어 있다. 스피커 오브젝트의 SoundQueuePlayer 를 넣는다", this);
            Line.Destroyed += OnDroneDestroyed;
            Line.WaveCleared += OnWaveCleared;
            Line.WaveStarted += OnWaveStarted;
            Line.NoTarget += OnNoTarget;
            shotAction.performed += OnShot;
            volleyAction.performed += OnVolley;
            waveAction.performed += OnWave;
            shotAction.Enable();
            volleyAction.Enable();
            waveAction.Enable();
            // 꺼져 있던 동안 놓친 이벤트가 있어도 드론 그림을 지금 코어 상태로 맞춘다
            SyncViews();
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 두 번 쏜다
            Line.Destroyed -= OnDroneDestroyed;
            Line.WaveCleared -= OnWaveCleared;
            Line.WaveStarted -= OnWaveStarted;
            Line.NoTarget -= OnNoTarget;
            shotAction.performed -= OnShot;
            volleyAction.performed -= OnVolley;
            waveAction.performed -= OnWave;
            shotAction.Disable();
            volleyAction.Disable();
            waveAction.Disable();
        }

        void OnShot(InputAction.CallbackContext _) => Line.Shot();
        void OnVolley(InputAction.CallbackContext _) => Line.Volley();
        void OnWave(InputAction.CallbackContext _) => Line.NewWave();

        void OnDroneDestroyed(int index)
        {
            SetView(index, false);
            Log($"드론 {index + 1} 파괴");
            // 요청에는 값만 넣는다 (소리 id, 음량). 파괴된 드론의 참조는 넣지 않는다
            if (sounds != null) sounds.Queue.Request(SoundIds.Explosion, explosionVolume); // [1] 요청만 하고 바로 돌아간다
        }

        void OnWaveCleared(int wave)
        {
            Log($"웨이브 {wave} 끝");
            if (sounds != null) sounds.Queue.Request(SoundIds.WaveAlert, alertVolume); // [1]
        }

        void OnWaveStarted(int wave, int count)
        {
            SyncViews();
            Log($"웨이브 {wave} 시작 · 드론 {count}대");
        }

        void OnNoTarget() => Log("쏠 드론 없음");

        void SyncViews()
        {
            for (int i = 0; i < Line.Count; i++) SetView(i, Line.IsAlive(i));
        }

        void SetView(int index, bool alive)
        {
            if (droneViews == null || index >= droneViews.Length || droneViews[index] == null) return;
            droneViews[index].SetActive(alive);
        }

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[DroneLine] {message}", this);
        }
    }
}
