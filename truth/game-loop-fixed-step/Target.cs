// 하네스 어댑터: 같은 입력을 30·60·144fps 기기 셋에 넣고, 기기마다 코어(FixedStepper + Runner) 또는 나쁜 예(NaiveRunner)를 돌려 사건과 상태를 글로 꺼낸다.
// 흉내 장치 Device: 무대는 늘 1/60 초로 Tick 한다. Device 는 그 시간을 쌓아, 자기 화면 프레임 길이(1/fps 초, 렉이면 lagSpike 초)가 찰 때마다 화면 프레임 하나를 만든다.
//   그래서 무대 한 Tick 에 144fps 는 화면 프레임이 2~3개, 60fps 는 1개, 30fps 는 두 Tick 에 1개다. 렉 입력은 지금 쌓고 있는 화면 프레임을 lagSpike 초짜리로 바꾼다 (그동안 그 기기는 멈춰 있다).
//   입력은 기기마다 다음 화면 프레임이 시작할 때 읽는다 (Unity 에서 Update 가 그 프레임에 눌린 키를 읽는 자리).
// 패턴은 코어 이벤트를 불린 순서대로 적고, 나쁜 예는 이벤트가 없어 프레임 전후 값을 비교해 적는다. 버그(!)는 여기서 찾는다 (나쁜 예 코드에는 검사 코드를 넣지 않는다).
// 웹 sim(src/specimens/game-loop-fixed-step/sim.ts)의 drain, snapshot 과 같은 글을 만든다.
using System;
using System.Collections.Generic;
using System.Text;
using PatternGallery.GameLoopFixedStep.Naive;
using PatternGallery.Truth;

namespace PatternGallery.GameLoopFixedStep
{
    /// <summary>흉내 장치: 무대 시간을 쌓아 이 기기의 화면 프레임을 만든다</summary>
    public sealed class Device
    {
        public readonly string Name;
        public readonly float Period;
        public float Elapsed;
        public bool LagNext;
        public bool LastWasLag;
        public int Frames;
        public float LastFrame;
        public bool Jump;
        public bool Dash;

        public Device(int fps)
        {
            Name = fps + "fps";
            Period = 1f / fps;
        }

        /// <summary>무대 시간 dt 를 쌓고, 화면 프레임 길이가 찰 때마다 frame(그 프레임 길이)를 부른다</summary>
        public void Advance(float dt, float lagSpike, Action<float> frame)
        {
            Elapsed += dt;
            while (true)
            {
                float length = LagNext ? lagSpike : Period;
                if (Elapsed < length) return;
                Elapsed -= length;
                LastWasLag = LagNext;
                LagNext = false;
                Frames++;
                LastFrame = length;
                frame(length);
            }
        }
    }

    /// <summary>기기 하나의 줄. 패턴이면 Stepper·Runner, 나쁜 예면 Naive 를 쓴다</summary>
    public sealed class Lane
    {
        public Device Device;
        public FixedStepper Stepper;
        public Runner Runner;
        public NaiveRunner Naive;
        public readonly List<float> Peaks = new List<float>();
        public int JumpStep;
        // 나쁜 예 추적
        public bool Rising;
        public float Peak;
        public float AirTime;
        public float DashStartX;
        public bool Passed;
    }

    [SimTarget("game-loop-fixed-step")]
    public sealed class Target : ISimTarget
    {
        static readonly int[] Fps = { 30, 60, 144 };

        readonly List<string> events = new List<string>();
        readonly List<Lane> lanes = new List<Lane>();
        readonly float lagSpike;
        int reportedJumps;

        public Target(Values v, bool isNaive)
        {
            lagSpike = v.Float("lagSpike");
            float fixedStep = v.Float("fixedStep");
            int maxSteps = v.Int("maxStepsPerFrame");
            float jumpSpeed = v.Float("jumpSpeed");
            foreach (int fps in Fps)
            {
                var lane = new Lane { Device = new Device(fps) };
                lanes.Add(lane);
                if (isNaive)
                {
                    lane.Naive = new NaiveRunner { jumpSpeed = jumpSpeed };
                    continue;
                }
                lane.Stepper = new FixedStepper(fixedStep, maxSteps);
                lane.Runner = new Runner(new RunnerSettings { JumpSpeed = jumpSpeed });
                string name = lane.Device.Name;
                Runner r = lane.Runner;
                FixedStepper s = lane.Stepper;
                s.Stepped += r.Step;
                s.Dropped += (time, steps) => events.Add($"{name} 상한 {steps}단계 · {Fmt.F(time)}초 버림");
                r.Jumped += () =>
                {
                    lane.JumpStep = s.TotalSteps;
                    events.Add($"{name} 점프");
                };
                r.PeakReached += peak => lane.Peaks.Add(peak);
                r.Landed += () =>
                {
                    int n = s.TotalSteps - lane.JumpStep;
                    events.Add($"{name} 착지 · 점프 뒤 {n}단계 ({Fmt.F(n * s.FixedStep)}초)");
                };
                r.Dashed += () => events.Add($"{name} 돌진");
                r.WallHit += x => events.Add($"{name} 벽에 막힘 · x {Fmt.F(x)}");
                r.DashEnded += d => events.Add($"{name} 돌진 끝 · {Fmt.F(d)}m");
            }
        }

        public void Input(string name)
        {
            foreach (Lane lane in lanes)
            {
                if (name == "jump") lane.Device.Jump = true;
                else if (name == "dash") lane.Device.Dash = true;
                else lane.Device.LagNext = true;
            }
        }

        public void Tick(float dt)
        {
            foreach (Lane lane in lanes)
                lane.Device.Advance(dt, lagSpike, length => Frame(lane, length));
            ReportPeaks();
        }

        void Frame(Lane lane, float dt)
        {
            Device d = lane.Device;
            if (lane.Runner != null)
            {
                if (d.LastWasLag) events.Add($"{d.Name} 렉 프레임 {Fmt.F(dt)}초 → Advance 에 그대로 쌓음");
                if (d.Jump) lane.Runner.RequestJump();
                if (d.Dash) lane.Runner.RequestDash();
                d.Jump = false;
                d.Dash = false;
                lane.Stepper.Advance(dt);
                return;
            }

            NaiveRunner n = lane.Naive;
            if (d.LastWasLag) events.Add($"{d.Name} 렉 프레임 {Fmt.F(dt)}초 → Update(dt) 한 번에 적분");
            bool jumping = d.Jump && n.y <= 0f;
            bool dashing = d.Dash || n.dashTimer > 0f;
            if (jumping) events.Add($"{d.Name} 점프");
            if (d.Dash)
            {
                lane.DashStartX = n.x;
                events.Add($"{d.Name} 돌진");
            }
            float x0 = n.x;
            float y0 = n.y;
            n.jumpPressed = d.Jump;
            n.dashPressed = d.Dash;
            d.Jump = false;
            d.Dash = false;
            n.Update(dt);

            if (jumping)
            {
                lane.Rising = true;
                lane.Peak = 0f;
                lane.AirTime = 0f;
            }
            else if (y0 > 0f) lane.AirTime += dt;
            if (n.y > lane.Peak) lane.Peak = n.y;
            if (lane.Rising && n.velocityY <= 0f)
            {
                lane.Rising = false;
                lane.Peaks.Add(lane.Peak);
            }
            if (!lane.Passed && x0 + n.halfWidth <= n.wallX && n.x - n.halfWidth >= n.wallX + n.wallThickness)
            {
                lane.Passed = true;
                events.Add($"!렉에 벽 통과: {d.Name} dt {Fmt.F(dt)}초 한 프레임에 x {Fmt.F(x0)} → {Fmt.F(n.x)}");
            }
            if (dashing && n.x == n.wallX - n.halfWidth && n.dashTimer == 0f) events.Add($"{d.Name} 벽에 막힘 · x {Fmt.F(n.x)}");
            if (dashing && n.dashTimer <= 0f) events.Add($"{d.Name} 돌진 끝 · {Fmt.F(n.x - lane.DashStartX)}m");
            if (y0 > 0f && n.y <= 0f) events.Add($"{d.Name} 착지 · 점프 뒤 {Fmt.F(lane.AirTime)}초");
        }

        /// <summary>세 기기가 모두 같은 점프의 최고 높이에 닿으면 한 줄로 견준다</summary>
        void ReportPeaks()
        {
            while (true)
            {
                foreach (Lane lane in lanes)
                    if (lane.Peaks.Count <= reportedJumps) return;
                float min = float.MaxValue;
                float max = float.MinValue;
                var parts = new List<string>();
                foreach (Lane lane in lanes)
                {
                    float p = lane.Peaks[reportedJumps];
                    min = Math.Min(min, p);
                    max = Math.Max(max, p);
                    parts.Add($"{lane.Device.Name} {Fmt.F(p)}");
                }
                reportedJumps++;
                string list = string.Join(" · ", parts);
                if (lanes[0].Naive != null && max - min >= 0.01f) events.Add($"!프레임마다 다른 점프: 최고 높이 {list}");
                else events.Add($"최고 높이 {list} (같다)");
            }
        }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        public string Snapshot()
        {
            var s = new StringBuilder();
            foreach (Lane lane in lanes)
            {
                if (s.Length > 0) s.Append(' ');
                string p = "f" + lane.Device.Name.Replace("fps", "");
                if (lane.Runner != null)
                    s.Append($"{p}.x={Fmt.F(lane.Runner.X)} {p}.y={Fmt.F(lane.Runner.Y)} {p}.frames={lane.Device.Frames} {p}.steps={lane.Stepper.TotalSteps} {p}.dropped={Fmt.F(lane.Stepper.TotalDropped)}");
                else
                    s.Append($"{p}.x={Fmt.F(lane.Naive.x)} {p}.y={Fmt.F(lane.Naive.y)} {p}.frames={lane.Device.Frames}");
            }
            return s.ToString();
        }
    }
}
