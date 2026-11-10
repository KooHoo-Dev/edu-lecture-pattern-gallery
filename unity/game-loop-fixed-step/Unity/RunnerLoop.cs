// 하린 연결 컴포넌트: 엔진이 부르는 Update 에서 Time.deltaTime 을 코어 FixedStepper 에 넣고, 쌓인 시간만큼 Runner 를 고정 간격으로 돌린다.
// Unity 의 FixedUpdate 를 쓰지 않고 같은 일을 코어로 직접 한다 (웹 무대와 같은 코드). 화면 위치는 마지막 두 고정 단계 사이를 보간한다.
// 왼쪽 위 상태 글은 확인용 IMGUI(OnGUI) 다. 실제 게임의 화면 글은 UGUI·TextMeshPro 로 만든다. 최고 높이·돌진 글은 이벤트를 받을 때, 횟수 글은 매 프레임 바뀌어 Update 에서 만든다.
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.GameLoopFixedStep
{
    public class RunnerLoop : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름. Play 중에 바꿔도 반영된다)")]
        [Tooltip("규칙 한 단계의 길이 (초). 뜻은 Unity 의 Time.fixedDeltaTime(Project Settings > Time 의 Fixed Timestep, 기본 0.02)과 같지만, 이 컴포넌트는 FixedUpdate 를 쓰지 않아 서로 영향을 주지 않는다. 한 단계 돌진(15 × 이 값)이 벽 두께 + 몸 폭(0.8m)보다 짧아야 하므로 0.05 까지만 둔다 (0.054 를 넘으면 코어도 벽을 건너뛴다)")]
        [Range(0.005f, 0.05f)]
        [SerializeField] float fixedStep = 0.02f;
        [Tooltip("한 화면 프레임에 도는 고정 단계 상한. 넘친 시간은 버린다. fixedStep × 이 값이 보통 프레임 길이보다 짧으면 렉이 없어도 시간을 버려 게임이 느려진다")]
        [Min(1)]
        [SerializeField] int maxStepsPerFrame = 5;
        [Tooltip("렉 키를 누르면 다음 Update 에서 메인 스레드를 이 시간(초)만큼 재워 프레임 하나를 길게 만든다")]
        [Min(0f)]
        [SerializeField] float lagSpike = 0.3f;
        [Tooltip("점프할 때 위로 주는 속도 (m/s). 중력은 40 m/s² 이다")]
        [Min(0.1f)]
        [SerializeField] float jumpSpeed = 8f;

        [Header("기기 흉내")]
        [Tooltip("Application.targetFrameRate 에 넣는다. 30·60·144 로 바꿔 Play 하며 최고 높이를 견준다. 데스크톱에서는 QualitySettings.vSyncCount 가 0 이 아니면 무시되므로 OnEnable 에서 VSync 를 끈다. Editor 에서는 Game 뷰에만 듣는다")]
        [SerializeField] int targetFrameRate = 60;

        [Header("화면")]
        [Tooltip("하린 그림. 이 오브젝트 자리가 x 0, 땅 높이다. 하린은 x 6 에서 시작한다")]
        [SerializeField] Transform runnerView;
        [Tooltip("벽 그림. 코어 설정의 벽 자리(x 12, 두께 0.2)에 맞춰 옮기고 늘린다")]
        [SerializeField] Transform wallView;
        [Tooltip("끄면 마지막 고정 단계의 위치를 그대로 그린다. 고정 간격이 화면 프레임보다 길 때 계단처럼 끊겨 보인다")]
        [SerializeField] bool interpolate = true;
        [SerializeField] bool showStatusOnScreen = true;
        [SerializeField] bool logEvents = true;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다)")]
        [SerializeField] InputAction jumpAction;
        [SerializeField] InputAction dashAction;
        [SerializeField] InputAction lagAction;
        [SerializeField] InputAction restartAction;

        FixedStepper stepper;
        Runner runner;
        bool lagRequested;
        int frames;
        float lastPeak = -1f;
        float lastDash = -1f;
        string countText = "";
        string resultText = "최고 높이 - · 돌진 -";

        /// <summary>처음 읽을 때 만든다. 다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게</summary>
        public FixedStepper Stepper => stepper ??= new FixedStepper(fixedStep, maxStepsPerFrame);
        public Runner Runner => runner ??= new Runner(new RunnerSettings { JumpSpeed = jumpSpeed });

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            jumpAction = new InputAction("Jump", InputActionType.Button, "<Keyboard>/q");
            dashAction = new InputAction("Dash", InputActionType.Button, "<Keyboard>/w");
            lagAction = new InputAction("Lag", InputActionType.Button, "<Keyboard>/e");
            restartAction = new InputAction("Restart", InputActionType.Button, "<Keyboard>/r");
        }

        void OnEnable()
        {
            if (runnerView == null) Debug.LogError("[RunnerLoop] Runner View 칸이 비어 있다. 규칙은 돌지만 하린이 보이지 않는다", this);
            Stepper.Stepped += Runner.Step; // [2] 고정 단계마다 규칙을 한 단계 돌린다
            Stepper.Dropped += OnDropped;
            Runner.Jumped += OnJumped;
            Runner.PeakReached += OnPeakReached;
            Runner.Landed += OnLanded;
            Runner.DashEnded += OnDashEnded;
            Runner.WallHit += OnWallHit;
            jumpAction.performed += OnJump;
            dashAction.performed += OnDash;
            lagAction.performed += OnLag;
            restartAction.performed += OnRestart;
            jumpAction.Enable();
            dashAction.Enable();
            lagAction.Enable();
            restartAction.Enable();
            // 데스크톱에서는 vSyncCount 가 0 이 아니면 targetFrameRate 가 무시되고 모니터 주사율을 따른다 (6000.3 문서).
            // 기기 흉내를 위해 VSync 를 끈다. 프로젝트 전체 설정(Quality 의 VSync Count)을 바꾸는 것이라 시연용이다
            QualitySettings.vSyncCount = 0;
            Application.targetFrameRate = targetFrameRate;
            PlaceWall();
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 두 번 붙어, 고정 단계 하나에 규칙이 두 번 돈다
            Stepper.Stepped -= Runner.Step;
            Stepper.Dropped -= OnDropped;
            Runner.Jumped -= OnJumped;
            Runner.PeakReached -= OnPeakReached;
            Runner.Landed -= OnLanded;
            Runner.DashEnded -= OnDashEnded;
            Runner.WallHit -= OnWallHit;
            jumpAction.performed -= OnJump;
            dashAction.performed -= OnDash;
            lagAction.performed -= OnLag;
            restartAction.performed -= OnRestart;
            jumpAction.Disable();
            dashAction.Disable();
            lagAction.Disable();
            restartAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어 설정에도 넣는다
            if (stepper != null)
            {
                stepper.FixedStep = fixedStep;
                stepper.MaxStepsPerFrame = maxStepsPerFrame;
            }
            if (runner != null) runner.Settings.JumpSpeed = jumpSpeed;
            if (Application.isPlaying) Application.targetFrameRate = targetFrameRate;
            PlaceWall();
        }

        // 입력은 요청만 남긴다. 이번 프레임에 고정 단계가 없어도 다음 단계가 읽어 놓치지 않는다
        void OnJump(InputAction.CallbackContext _) => Runner.RequestJump();
        void OnDash(InputAction.CallbackContext _) => Runner.RequestDash();
        void OnLag(InputAction.CallbackContext _) => lagRequested = true;

        void OnRestart(InputAction.CallbackContext _)
        {
            Runner.Restart();
            Log("처음 자리로");
        }

        void Update()
        {
            if (lagRequested)
            {
                lagRequested = false;
                // 시연용 렉: 이 프레임을 일부러 길게 만든다. 다음 프레임의 Time.deltaTime 이 그만큼 커진다
                System.Threading.Thread.Sleep(Mathf.RoundToInt(lagSpike * 1000f));
            }
            frames++;
            Stepper.Advance(Time.deltaTime); // [1] 화면 프레임이 걸린 시간을 쌓고, 쌓인 만큼 고정 단계를 돌린다
            if (runnerView != null)
            {
                float a = interpolate ? Stepper.Alpha : 1f;
                float x = Mathf.Lerp(Runner.PrevX, Runner.X, a); // [4] 마지막 두 고정 단계 사이를 보간해 그린다
                float y = Mathf.Lerp(Runner.PrevY, Runner.Y, a);
                runnerView.position = transform.position + new Vector3(x, y + runnerView.lossyScale.y * 0.5f, 0f);
            }
            // 횟수 글은 매 프레임 바뀌어 여기서 고친다
            countText = $"목표 {targetFrameRate}fps · 화면 프레임 {frames}회 · 고정 단계 {Stepper.TotalSteps}회 · 버린 시간 {Stepper.TotalDropped:0.00}초";
        }

        /// <summary>최고 높이·돌진 글은 그 이벤트를 받을 때만 만든다</summary>
        void UpdateResultText()
        {
            resultText = $"최고 높이 {(lastPeak < 0f ? "-" : lastPeak.ToString("0.00") + "m")} · 돌진 {(lastDash < 0f ? "-" : lastDash.ToString("0.00") + "m")}";
        }

        void PlaceWall()
        {
            if (wallView == null) return;
            RunnerSettings s = Runner.Settings;
            wallView.position = transform.position + new Vector3(s.WallX + s.WallThickness * 0.5f, 0.75f, 0f);
            wallView.localScale = new Vector3(s.WallThickness, 1.5f, 1f);
        }

        void OnDropped(float time, int steps) => Log($"상한 {steps}단계 · {time:0.00}초 버림 (프레임 {Time.deltaTime:0.00}초)"); // [3] 넘친 시간은 버렸다

        void OnJumped() => Log("점프");

        void OnPeakReached(float peak)
        {
            lastPeak = peak;
            UpdateResultText();
            Log($"최고 {peak:0.00}m");
        }

        void OnLanded() => Log("착지");

        void OnDashEnded(float distance)
        {
            lastDash = distance;
            UpdateResultText();
            Log($"돌진 끝 · {distance:0.00}m");
        }

        void OnWallHit(float x) => Log($"벽에 막힘 · x {x:0.00}");

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[RunnerLoop] {message}", this);
        }

        void OnGUI()
        {
            if (!showStatusOnScreen) return;
            GUI.Label(new Rect(12f, 12f, 760f, 22f), countText);
            GUI.Label(new Rect(12f, 34f, 760f, 22f), resultText);
        }
    }
}
