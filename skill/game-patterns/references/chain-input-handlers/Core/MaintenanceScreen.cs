// 정비 기지 화면 조립: 화면 영역을 정하고, 처리자 넷을 화면에서 위에 있는 순서(팝업 → 버튼 → 드론 → 땅)로 사슬에 붙인다.
// Unity 연결 컴포넌트와 하네스가 같은 조립을 쓴다. UnityEngine 을 쓰지 않는다.
namespace PatternGallery.ChainInputHandlers
{
    /// <summary>화면 배치 (가로 16, 세로 9 단위. 왼쪽 아래가 0, 0)</summary>
    public static class ScreenLayout
    {
        /// <summary>정비 버튼은 오른쪽 끝이 여기에 붙고 폭만큼 왼쪽으로 넓어진다</summary>
        public const float ButtonRight = 15.4f;
        public const float ButtonBottom = 2.6f;
        public const float ButtonHeight = 1f;
        public const float HarinStartX = 5.5f;

        /// <summary>정비 드론 (공중에 떠 있다)</summary>
        public static readonly Area Drone = new Area(11f, 2f, 1f, 1.4f);
        /// <summary>정비 창과 그 오른쪽 위 ✕</summary>
        public static readonly Area PopupPanel = new Area(3.5f, 3.8f, 7.5f, 2.8f);
        public static readonly Area PopupClose = new Area(10.2f, 5.8f, 0.6f, 0.6f);
        /// <summary>땅 이동을 받는 곳. 그 위 띠(y 7 위)는 아무 처리자의 영역도 아니다</summary>
        public static readonly Area Ground = new Area(0f, 0f, 16f, 7f);

        public static Area Button(float width) => new Area(ButtonRight - width, ButtonBottom, width, ButtonHeight);
    }

    public sealed class MaintenanceScreen
    {
        public readonly ClickChain Chain = new ClickChain();
        public readonly PopupHandler Popup;
        public readonly UiButtonHandler Button;
        public readonly DroneSelectHandler Drone;
        public readonly GroundMoveHandler Ground;
        public readonly Walker Harin;

        public MaintenanceScreen(float buttonWidth, float walkSpeed)
        {
            Harin = new Walker(ScreenLayout.HarinStartX, walkSpeed);
            Popup = new PopupHandler(ScreenLayout.PopupPanel, ScreenLayout.PopupClose);
            Button = new UiButtonHandler(ScreenLayout.Button(buttonWidth));
            Drone = new DroneSelectHandler(ScreenLayout.Drone);
            Ground = new GroundMoveHandler(ScreenLayout.Ground, Harin);
            Button.Pressed += Popup.Open; // 정비 버튼은 정비 창을 연다

            // 화면에서 위에 그려지는 것이 먼저 받는다. 이 순서가 화면 겹침 순서와 다르면 가려진 것이 클릭을 가로챈다
            Chain.Add(Popup);
            Chain.Add(Button);
            Chain.Add(Drone);
            Chain.Add(Ground);
        }

        /// <summary>Play 중 버튼 폭을 바꿀 때. 다음 클릭부터 새 영역으로 판정한다</summary>
        public void SetButtonWidth(float width) => Button.Area = ScreenLayout.Button(width);
    }
}
