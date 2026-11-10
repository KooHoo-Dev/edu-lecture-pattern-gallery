// 하네스 어댑터: 책임 연쇄 코어(MaintenanceScreen 의 ClickChain)와 나쁜 예(클릭을 각자 구독하는 세 시스템)를 시나리오 입력으로 돌린다.
// 입력 다섯은 정해진 자리에 떨어지는 클릭이다. 패턴은 사슬과 처리자의 이벤트를 불린 순서대로 적는다.
// 나쁜 예는 클릭마다 상태를 비교해 적는다 (드론은 Selected 가 불린 횟수로 본다. 이미 선택된 드론을 또 눌러도 반응이 잡히게).
// 옆에 같은 클릭을 받는 코어(그림자)를 두고,
// 그 사슬에서 소비한 처리자를 '있어야 할 결과' 로 삼아 버그를 찾는다 (나쁜 예 코드에는 검사 코드를 넣지 않는다).
// 웹 sim(src/specimens/chain-input-handlers/sim.ts)과 같은 글을 만든다.
using System.Collections.Generic;
using PatternGallery.ChainInputHandlers.Naive;
using PatternGallery.Truth;

namespace PatternGallery.ChainInputHandlers
{
    [SimTarget("chain-input-handlers")]
    public sealed class Target : ISimTarget
    {
        /// <summary>'빈 땅 탭' 이 떨어지는 자리</summary>
        const float GroundTapX = 2.5f;
        const float GroundTapY = 2f;
        /// <summary>'빈 하늘 탭' 이 떨어지는 자리 (땅 영역 y 7 위. 어느 처리자의 영역도 아니다)</summary>
        const float SkyTapX = 7.6f;
        const float SkyTapY = 7.4f;

        readonly List<string> events = new List<string>();
        readonly MaintenanceScreen screen; // 패턴. 나쁜 예 모드에서는 그림자
        readonly Dictionary<IClickHandler, string> names = new Dictionary<IClickHandler, string>();
        readonly bool isNaive;
        int clicks;
        int droneHits;
        IClickHandler consumer;

        readonly NaiveClickInput input;
        readonly NaiveMaintenanceUi ui;
        readonly NaiveDroneSelect drone;
        readonly NaiveGroundMove ground;

        public Target(Values v, bool isNaive)
        {
            this.isNaive = isNaive;
            float width = v.Float("buttonWidth");
            float speed = v.Float("walkSpeed");
            screen = new MaintenanceScreen(width, speed);
            names[screen.Popup] = "팝업";
            names[screen.Button] = "버튼";
            names[screen.Drone] = "드론";
            names[screen.Ground] = "땅";
            screen.Chain.Handled += (h, c) => consumer = h;
            if (isNaive)
            {
                input = new NaiveClickInput();
                ui = new NaiveMaintenanceUi { button = ScreenLayout.Button(width), closeButton = ScreenLayout.PopupClose };
                drone = new NaiveDroneSelect { drone = ScreenLayout.Drone };
                ground = new NaiveGroundMove { ground = ScreenLayout.Ground, walkSpeed = speed, harinX = ScreenLayout.HarinStartX, targetX = ScreenLayout.HarinStartX };
                ui.Listen(input);
                drone.Listen(input);
                ground.Listen(input);
                drone.Selected += () => droneHits++;
                return; // 그림자 코어의 사건은 적지 않는다
            }
            screen.Chain.Passed += (h, c) => events.Add($"#{c.Number} {names[h]} → 넘김");
            screen.Chain.Handled += (h, c) => events.Add($"#{c.Number} {names[h]} ● 소비");
            screen.Chain.Unhandled += c => events.Add($"#{c.Number} 아무도 받지 않음 → 버림");
            screen.Popup.Opened += () => events.Add("정비 창 열림");
            screen.Popup.Closed += () => events.Add("정비 창 닫힘 (✕)");
            screen.Popup.Blocked += (c, outside) => events.Add(outside ? "정비 창(모달)이 창 밖 클릭을 막음" : "정비 창 안 클릭 (✕ 아님)");
            screen.Drone.Selected += () => events.Add("정비 드론 선택");
            screen.Harin.MoveOrdered += (from, to) => events.Add($"하린 이동 명령 {Fmt.F(from)} → {Fmt.F(to)}");
            screen.Harin.Arrived += x => events.Add($"하린 도착 {Fmt.F(x)}");
        }

        bool PopupOpen => isNaive ? ui.popupOpen : screen.Popup.IsOpen;

        public void Input(string name)
        {
            string spot;
            float x;
            float y;
            Area button = screen.Button.Area;
            switch (name)
            {
                case "tapButton": spot = "정비 버튼"; x = button.CenterX; y = button.CenterY; break;
                case "tapDrone": spot = "드론"; x = screen.Drone.Area.CenterX; y = screen.Drone.Area.CenterY; break;
                case "tapGround": spot = "빈 땅"; x = GroundTapX; y = GroundTapY; break;
                case "tapSky": spot = "빈 하늘"; x = SkyTapX; y = SkyTapY; break;
                case "togglePopup":
                    // 열려 있으면 창의 ✕, 닫혀 있으면 정비 버튼을 누른다
                    if (PopupOpen) { spot = "팝업 ✕"; x = screen.Popup.CloseButton.CenterX; y = screen.Popup.CloseButton.CenterY; }
                    else { spot = "정비 버튼"; x = button.CenterX; y = button.CenterY; }
                    break;
                default: return;
            }
            clicks++;
            events.Add($"클릭 #{clicks} {spot} ({Fmt.F(x)}, {Fmt.F(y)})");
            consumer = null;
            screen.Chain.Send(new Click(clicks, x, y));
            if (isNaive) NaiveClick(x, y);
        }

        void NaiveClick(float x, float y)
        {
            bool open0 = ui.popupOpen;
            int hits0 = droneHits;
            bool walking0 = ground.walking;
            float target0 = ground.targetX;
            float from = ground.harinX;
            input.Click(x, y);

            if (ui.popupOpen != open0) events.Add(ui.popupOpen ? "UI: 정비 창 열림" : "UI: 정비 창 닫힘 (✕)");
            bool droneReacted = droneHits != hits0;
            if (droneReacted) events.Add("드론 선택: 정비 드론 선택");
            bool groundReacted = ground.walking != walking0 || ground.targetX != target0;
            if (groundReacted) events.Add($"땅 이동: 하린 이동 명령 {Fmt.F(from)} → {Fmt.F(ground.targetX)}");

            // 그림자 사슬에서 소비한 처리자 말고 반응한 시스템이 있으면 버그다
            var extra = new List<string>();
            if (droneReacted && consumer != screen.Drone) extra.Add("드론 선택");
            if (groundReacted && consumer != screen.Ground) extra.Add("땅 이동");
            if (extra.Count == 0) return;
            string result = groundReacted ? $"하린 목표 {Fmt.F(ground.targetX)}" : "드론 선택됨";
            if (consumer == screen.Drone)
                events.Add($"!두 번 처리: 드론 위 클릭 #{clicks} 에 드론 선택과 땅 이동이 함께 반응 → {result}");
            else
                events.Add($"!클릭 관통: {Where(consumer)} 클릭 #{clicks} 에 {string.Join(", ", extra)}도 반응 → {result}");
        }

        string Where(IClickHandler h) => h == screen.Popup ? "정비 창이 열린 채 누른" : h == screen.Button ? "정비 버튼 위" : "받을 처리자가 없는";

        public void Tick(float dt)
        {
            screen.Harin.Tick(dt);
            if (!isNaive) return;
            bool walking0 = ground.walking;
            ground.Update(dt);
            if (walking0 && !ground.walking) events.Add($"하린 도착 {Fmt.F(ground.harinX)}");
        }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        public string Snapshot()
        {
            if (!isNaive)
                return $"harin={Fmt.F(screen.Harin.X)} target={Fmt.F(screen.Harin.TargetX)} popup={B(screen.Popup.IsOpen)} selected={B(screen.Drone.IsSelected)} clicks={clicks}";
            return $"harin={Fmt.F(ground.harinX)} target={Fmt.F(ground.targetX)} popup={B(ui.popupOpen)} selected={B(drone.selected)} eharin={Fmt.F(screen.Harin.X)} clicks={clicks}";
        }

        static int B(bool b) => b ? 1 : 0;
    }
}
