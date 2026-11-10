// 클릭 입력 연결 컴포넌트: Input System 의 포인터 클릭을 받아 화면 좌표를 월드 좌표로 바꾸고, 코어 Click 으로 만들어 사슬(ClickChain)의 맨 앞에 넣는다.
// 처리자 넷과 사슬은 코어 MaintenanceScreen 이 조립한다. 이 컴포넌트는 입력, 하린·드론 오브젝트 옮기기, 확인용 화면 글만 맡는다.
// 정비 버튼과 정비 창은 확인용 IMGUI(OnGUI 의 GUI.Box) 상자로 그린다. 상자는 클릭을 받지 않고, 클릭은 모두 사슬이 판정한다.
// 실제 게임의 UI 는 UGUI 로 만든다 (그때 UI 처리자의 판정은 meta 글의 pitfalls 를 본다).
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.ChainInputHandlers
{
    public class ClickInput : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름. Play 중에 바꿔도 반영된다)")]
        [Tooltip("정비 버튼의 폭 (m). 버튼은 오른쪽 끝이 x 15.4 에 붙어 왼쪽으로 넓어진다. 4 이상이면 드론 가운데(x 11.5)까지 덮어, 드론 가운데를 누른 클릭을 위에 그려진 버튼이 먼저 받는다")]
        [Range(1.5f, 6f)]
        [SerializeField] float buttonWidth = 2.5f;
        [Tooltip("하린이 땅 이동 명령을 받아 걷는 빠르기 (m/s)")]
        [Min(0.1f)]
        [SerializeField] float walkSpeed = 3f;

        [Header("장면")]
        [Tooltip("화면 좌표를 월드 좌표로 바꿀 카메라. 월드 x 0~16, y 0~9 가 화면에 꽉 차게 둔다 (코어 좌표와 같게)")]
        [SerializeField] Camera viewCamera;
        [Tooltip("하린 오브젝트. x 만 코어의 하린 위치로 옮긴다 (y, z 는 놓은 그대로)")]
        [SerializeField] Transform harin;
        [Tooltip("정비 드론 오브젝트. 켜질 때 코어의 드론 영역 가운데(11.5, 2.7)로 옮긴다")]
        [SerializeField] Transform drone;
        [Tooltip("드론이 선택되면 켜는 표시 오브젝트 (꺼 둔 채로 넣는다)")]
        [SerializeField] GameObject droneSelectedMark;
        [SerializeField] bool showOverlay = true;
        [SerializeField] bool logEvents = true;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 바인딩을 넣는다)")]
        [Tooltip("누르는 순간. 위치는 누른 장치(마우스, 터치)의 position 에서 읽는다")]
        [SerializeField] InputAction clickAction;

        MaintenanceScreen maintenance;
        int clicks;
        string lastResult = "클릭을 기다린다";

        /// <summary>처음 읽을 때 만든다. 다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게</summary>
        public MaintenanceScreen Maintenance => maintenance ??= new MaintenanceScreen(buttonWidth, walkSpeed);

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다. <Pointer> 는 마우스, 펜, 터치를 함께 받는다
            clickAction = new InputAction("Click", InputActionType.Button, "<Pointer>/press");
            viewCamera = Camera.main;
        }

        void OnEnable()
        {
            if (viewCamera == null) Debug.LogError("[Click] View Camera 칸이 비어 있다. 클릭을 월드 좌표로 바꿀 수 없다", this);
            Maintenance.Chain.Passed += OnPassed;
            Maintenance.Chain.Handled += OnHandled;
            Maintenance.Chain.Unhandled += OnUnhandled;
            Maintenance.Popup.Opened += OnPopupOpened;
            Maintenance.Popup.Closed += OnPopupClosed;
            Maintenance.Drone.Selected += ShowDrone;
            Maintenance.Harin.MoveOrdered += OnMoveOrdered;
            clickAction.performed += OnClick;
            clickAction.Enable();
            if (drone != null)
            {
                Area d = Maintenance.Drone.Area;
                drone.position = new Vector3(d.CenterX, d.CenterY, drone.position.z);
            }
            ShowDrone(); // 꺼져 있던 동안 바뀐 선택을 다시 맞춘다
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 클릭이 두 번 들어간다
            Maintenance.Chain.Passed -= OnPassed;
            Maintenance.Chain.Handled -= OnHandled;
            Maintenance.Chain.Unhandled -= OnUnhandled;
            Maintenance.Popup.Opened -= OnPopupOpened;
            Maintenance.Popup.Closed -= OnPopupClosed;
            Maintenance.Drone.Selected -= ShowDrone;
            Maintenance.Harin.MoveOrdered -= OnMoveOrdered;
            clickAction.performed -= OnClick;
            clickAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어에도 넣는다. 버튼 상자는 OnGUI 가 코어 영역을 읽어 그리므로 바로 맞는다
            if (maintenance == null) return;
            maintenance.SetButtonWidth(buttonWidth);
            maintenance.Harin.Speed = walkSpeed;
        }

        void OnClick(InputAction.CallbackContext ctx)
        {
            if (viewCamera == null || !(ctx.control.device is Pointer pointer)) return;
            Vector2 screen = pointer.position.ReadValue();
            // 카메라에서 z = 0 평면까지의 거리. Orthographic 이면 x, y 에 영향이 없다
            float depth = Mathf.Abs(viewCamera.transform.position.z);
            Vector3 world = viewCamera.ScreenToWorldPoint(new Vector3(screen.x, screen.y, depth));
            Maintenance.Chain.Send(new Click(++clicks, world.x, world.y)); // [1] 클릭을 사슬의 맨 앞에 넣는다
        }

        void Update()
        {
            Maintenance.Harin.Tick(Time.deltaTime);
            // 매 프레임 바뀌는 위치만 여기서 옮긴다
            if (harin == null) return;
            Vector3 p = harin.position;
            p.x = Maintenance.Harin.X;
            harin.position = p;
        }

        void OnPassed(IClickHandler h, Click c) => Log($"#{c.Number} {h.GetType().Name} → 넘김");

        void OnHandled(IClickHandler h, Click c)
        {
            lastResult = $"클릭 #{c.Number} → {h.GetType().Name} 가 소비";
            Log(lastResult);
        }

        void OnUnhandled(Click c)
        {
            lastResult = $"클릭 #{c.Number} ({c.X:0.0}, {c.Y:0.0}) → 아무도 받지 않아 버림";
            Debug.LogWarning($"[Click] {lastResult}", this); // [4] 조용히 버리지 않는다
        }

        void OnPopupOpened() => Log("정비 창 열림");
        void OnPopupClosed() => Log("정비 창 닫힘");
        void OnMoveOrdered(float from, float to) => Log($"하린 이동 명령 {from:0.00} → {to:0.00}");

        void ShowDrone()
        {
            if (droneSelectedMark != null) droneSelectedMark.SetActive(Maintenance.Drone.IsSelected);
        }

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[Click] {message}", this);
        }

        /// <summary>코어 영역(월드 단위)을 IMGUI 사각형(픽셀, 위가 0)으로</summary>
        Rect ToGui(Area a)
        {
            Vector3 topLeft = viewCamera.WorldToScreenPoint(new Vector3(a.Left, a.Bottom + a.Height, 0f));
            Vector3 bottomRight = viewCamera.WorldToScreenPoint(new Vector3(a.Left + a.Width, a.Bottom, 0f));
            return Rect.MinMaxRect(topLeft.x, Screen.height - topLeft.y, bottomRight.x, Screen.height - bottomRight.y);
        }

        void OnGUI()
        {
            if (!showOverlay || viewCamera == null) return;
            // 사슬 순서와 같게 그린다: 뒤에 그린 것이 위에 보인다 (버튼 위에 정비 창)
            GUI.Box(ToGui(Maintenance.Button.Area), "UI 정비");
            if (Maintenance.Popup.IsOpen)
            {
                GUI.Box(ToGui(Maintenance.Popup.Panel), "정비 창 (모달)\n오른쪽 위 X 를 눌러야 닫힌다");
                GUI.Box(ToGui(Maintenance.Popup.CloseButton), "X");
            }
            GUI.Label(new Rect(12f, 12f, 640f, 24f), lastResult);
            GUI.Label(new Rect(12f, 34f, 640f, 24f), $"정비 창 {(Maintenance.Popup.IsOpen ? "열림" : "닫힘")} · 드론 {(Maintenance.Drone.IsSelected ? "선택됨" : "선택 안 됨")} · 하린 x {Maintenance.Harin.X:0.00}");
        }
    }
}
