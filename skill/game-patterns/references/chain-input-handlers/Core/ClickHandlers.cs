// 처리자 넷: 정비 창(모달 팝업), UI 정비 버튼, 드론 선택, 땅 이동. 각자 자기 영역의 클릭인지만 보고,
// 서로를, 그리고 사슬에서 자기가 몇 번째인지를 모른다. 일어난 일은 C# event 로 알린다.
using System;

namespace PatternGallery.ChainInputHandlers
{
    /// <summary>정비 창(모달). 열려 있는 동안은 ✕ 를 누르면 닫고, 그 밖의 클릭은 창 안이든 밖이든 모두 먹는다</summary>
    public sealed class PopupHandler : IClickHandler
    {
        public Area Panel;
        public Area CloseButton;
        public bool IsOpen { get; private set; }

        public event Action Opened;
        public event Action Closed;
        /// <summary>✕ 가 아닌 곳을 눌러 모달이 먹은 클릭 (클릭, 창 밖이었는지)</summary>
        public event Action<Click, bool> Blocked;

        public PopupHandler(Area panel, Area closeButton)
        {
            Panel = panel;
            CloseButton = closeButton;
        }

        public void Open()
        {
            if (IsOpen) return;
            IsOpen = true;
            Opened?.Invoke();
        }

        public void Close()
        {
            if (!IsOpen) return;
            IsOpen = false;
            Closed?.Invoke();
        }

        public bool Handle(Click c)
        {
            if (!IsOpen) return false; // [3] 닫혀 있으면 다음 처리자로
            if (CloseButton.Contains(c.X, c.Y)) Close();
            else Blocked?.Invoke(c, !Panel.Contains(c.X, c.Y));
            return true; // [2] 모달: 열려 있으면 어디를 눌러도 소비한다
        }
    }

    /// <summary>화면 위 UI 정비 버튼. 누르면 Pressed 를 알린다 (무엇을 할지는 조립하는 쪽이 정한다)</summary>
    public sealed class UiButtonHandler : IClickHandler
    {
        public Area Area;

        public event Action Pressed;

        public UiButtonHandler(Area area) => Area = area;

        public bool Handle(Click c)
        {
            if (!Area.Contains(c.X, c.Y)) return false; // [3]
            Pressed?.Invoke();
            return true; // [2]
        }
    }

    /// <summary>땅 위의 정비 드론을 정비 대상으로 고른다</summary>
    public sealed class DroneSelectHandler : IClickHandler
    {
        public Area Area;
        public bool IsSelected { get; private set; }

        /// <summary>드론을 누를 때마다 (이미 선택돼 있어도)</summary>
        public event Action Selected;

        public DroneSelectHandler(Area area) => Area = area;

        public bool Handle(Click c)
        {
            if (!Area.Contains(c.X, c.Y)) return false; // [3]
            IsSelected = true;
            Selected?.Invoke();
            return true; // [2]
        }
    }

    /// <summary>땅을 누르면 하린에게 그 x 로 걸어가라고 명령한다. 사슬의 맨 끝이라 앞에서 아무도 받지 않은 클릭만 온다</summary>
    public sealed class GroundMoveHandler : IClickHandler
    {
        public Area Area;
        readonly Walker walker;

        public GroundMoveHandler(Area area, Walker walker)
        {
            Area = area;
            this.walker = walker;
        }

        public bool Handle(Click c)
        {
            if (!Area.Contains(c.X, c.Y)) return false; // [3]
            walker.MoveTo(c.X);
            return true; // [2]
        }
    }
}
