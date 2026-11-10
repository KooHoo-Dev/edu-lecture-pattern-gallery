// 나쁜 예: 정비 UI, 드론 선택, 땅 이동이 클릭 이벤트 하나를 각자 구독하고 각자 판정한다. 서로를 모른다. 흔한 코드다.
// 실제로는 넷 다 MonoBehaviour 다. 클릭 입력 컴포넌트가 Input System 의 클릭을 받아 Clicked 로 알리고,
// 셋은 OnEnable 에서 input.Clicked += OnClicked 로 각자 붙는다. 여기서는 Unity 없이 돌리려고 순수 C# 으로 옮겼고,
// 영역은 코어의 Area 와 ScreenLayout 을 같이 쓴다. 갤러리의 '효과 끄기' 가 같은 입력으로 돌린다. 프로젝트에 넣지 않는다.
using System;

namespace PatternGallery.ChainInputHandlers.Naive
{
    public sealed class NaiveClickInput
    {
        public event Action<float, float> Clicked;

        public void Click(float x, float y) => Clicked?.Invoke(x, y);
    }

    /// <summary>정비 버튼과 정비 창. 창이 열려 있으면 UI 안의 다른 버튼은 막지만, 다른 시스템은 창이 열린 줄 모른다</summary>
    public sealed class NaiveMaintenanceUi
    {
        public Area button;
        public Area closeButton;
        public bool popupOpen;

        public void Listen(NaiveClickInput input) => input.Clicked += OnClicked;

        void OnClicked(float x, float y)
        {
            if (popupOpen)
            {
                if (closeButton.Contains(x, y)) popupOpen = false;
                return;
            }
            if (button.Contains(x, y)) popupOpen = true;
        }
    }

    public sealed class NaiveDroneSelect
    {
        public Area drone;
        public bool selected;

        /// <summary>드론을 누를 때마다 (이미 선택돼 있어도). 선택 표시나 정비 대상 창이 듣는다</summary>
        public event Action Selected;

        public void Listen(NaiveClickInput input) => input.Clicked += OnClicked;

        void OnClicked(float x, float y)
        {
            // [!] 버튼이나 열린 정비 창이 위에 있는지 묻지 않는다 (클릭 관통)
            if (!drone.Contains(x, y)) return;
            selected = true;
            Selected?.Invoke();
        }
    }

    public sealed class NaiveGroundMove
    {
        public Area ground;
        public float walkSpeed;
        public float harinX;
        public float targetX;
        public bool walking;

        public void Listen(NaiveClickInput input) => input.Clicked += OnClicked;

        void OnClicked(float x, float y)
        {
            // [!] UI 나 드론이 이미 처리한 클릭인지 알 길이 없다 (클릭 관통, 두 번 처리)
            if (!ground.Contains(x, y)) return;
            targetX = x;
            walking = true;
        }

        public void Update(float dt)
        {
            if (!walking || walkSpeed <= 0f) return;
            float step = walkSpeed * dt;
            float gap = targetX - harinX;
            if (Math.Abs(gap) <= step)
            {
                harinX = targetX;
                walking = false;
                return;
            }
            harinX += gap > 0f ? step : -step;
        }
    }
}
