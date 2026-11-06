// 하네스 어댑터: 어댑터 패턴 코어(RadiationSite)와 나쁜 예(NaiveRadiationHud)를 시나리오 입력으로 돌린다.
// 패턴은 코어가 알리는 이벤트를 불린 순서대로 적는다. 나쁜 예는 이벤트가 없으므로 입력마다 상태를 비교해 적고,
// 버그(막대 넘침, 경보 누락)는 여기서 찾아 '!' 로 적는다 (나쁜 예 코드에 검사 코드를 넣지 않는다).
// 웹 sim(src/specimens/adapter-sensor-units/sim.ts)과 같은 글을 만든다.
using System.Collections.Generic;
using PatternGallery.AdapterSensorUnits.Naive;
using PatternGallery.Truth;

namespace PatternGallery.AdapterSensorUnits
{
    [SimTarget("adapter-sensor-units")]
    public sealed class Target : ISimTarget
    {
        readonly List<string> events = new List<string>();

        // 패턴
        readonly RadiationSite site;

        // 나쁜 예: 방사선 값과 장비는 Core 의 것을 쓰고, HUD 만 장비를 직접 안다
        readonly RadiationField field;
        readonly NaiveRadiationHud naive;
        readonly LegacyProbe probeB;
        readonly GeigerX geigerB;
        readonly float riseStep;
        bool upgraded;
        readonly float[] lastBars = new float[2];
        readonly bool[] lastAlarms = new bool[2];
        readonly bool[] lastOverflow = new bool[2];
        readonly bool[] lastMissed = new bool[2];
        readonly bool[] reportedOverflow = new bool[2];
        readonly bool[] reportedMissed = new bool[2];

        public Target(Values v, bool isNaive)
        {
            float alarmLevel = v.Float("alarmLevel");
            riseStep = v.Float("riseStep");
            if (isNaive)
            {
                field = new RadiationField();
                field.Changed += OnFieldChanged;
                probeB = new LegacyProbe(() => field.Level);
                geigerB = new GeigerX(() => field.Level);
                naive = new NaiveRadiationHud { alarmLevel = alarmLevel };
                naive.sensors[0] = new LegacyProbe(() => field.Level);
                naive.sensors[1] = probeB;
                naive.Refresh();
                Remember();
                return;
            }
            site = new RadiationSite(alarmLevel, riseStep);
            site.Field.Changed += OnFieldChanged;
            site.Hud.LevelShown += (zone, level) => events.Add($"HUD {zone} 막대 {Fmt.F(level)}");
            site.Hud.AlarmChanged += (zone, on) => events.Add($"HUD {zone} 경보 {(on ? "켜짐" : "꺼짐")} (AlarmChanged)");
            site.SensorSwapped += (zone, device) => events.Add($"도윤: {zone} 구역 장비 → {device} (SensorSwapped)");
        }

        void OnFieldChanged(float before, float after) => events.Add($"방사선 {Fmt.F(before)} → {Fmt.F(after)}");

        public void Input(string name)
        {
            if (naive == null)
            {
                switch (name)
                {
                    case "rise": site.Rise(); break;
                    case "fall": site.Fall(); break;
                    case "swap": site.SwapB(); break;
                }
                return;
            }
            switch (name)
            {
                case "rise":
                    if (field.Add(riseStep)) naive.Refresh();
                    break;
                case "fall":
                    if (field.Add(-riseStep)) naive.Refresh();
                    break;
                case "swap":
                    upgraded = !upgraded;
                    naive.sensors[1] = upgraded ? (object)geigerB : probeB;
                    events.Add($"도윤: B 구역 장비 → {DeviceB()} (HUD 의 sensors[1] 칸에 장비를 직접 끼움)");
                    naive.Refresh();
                    break;
            }
            Diff();
        }

        string DeviceB() => upgraded ? nameof(GeigerX) : nameof(LegacyProbe);

        /// <summary>장비가 돌려준 값을 제대로 0~1 로 바꾼 값 (버그 판정용. 패턴의 어댑터와 같은 계산)</summary>
        static float Correct(object s) => s is GeigerX g ? g.ReadPercent() / 100f : ((LegacyProbe)s).GetLevel();

        /// <summary>나쁜 예: HUD 의 막대와 경보등 변화를 구역마다 적고, 버그를 찾는다</summary>
        void Diff()
        {
            for (int i = 0; i < 2; i++)
            {
                string zone = naive.zones[i];
                float bar = naive.bars[i];
                if (bar != lastBars[i]) events.Add($"HUD {zone} 막대 {Fmt.F(bar)}");
                bool overflow = bar > 1f;
                if (overflow && !lastOverflow[i])
                {
                    if (!reportedOverflow[i])
                    {
                        reportedOverflow[i] = true;
                        events.Add($"!막대 넘침: {zone} 막대 {Fmt.F(bar)} (0~1 막대에 ReadPercent 의 0~100 을 그대로 넣었다)");
                    }
                    else events.Add($"{zone} 막대 또 넘침 {Fmt.F(bar)}");
                }
                bool alarm = naive.alarms[i];
                if (alarm != lastAlarms[i]) events.Add($"HUD {zone} 경보 {(alarm ? "켜짐" : "꺼짐")}");
                object s = naive.sensors[i];
                float correct = Correct(s);
                bool missed = correct >= naive.alarmLevel && !alarm;
                if (missed && !lastMissed[i])
                {
                    string why = s is GeigerX g ? $"{g.ReadPercent()} / 100 = {g.ReadPercent() / 100}" : "";
                    if (!reportedMissed[i])
                    {
                        reportedMissed[i] = true;
                        events.Add($"!경보 누락: {zone} 구역 {Fmt.F(correct)} ≥ 기준 {Fmt.F(naive.alarmLevel)} 인데 경보등 꺼짐 ({why})");
                    }
                    else events.Add($"{zone} 경보 또 누락 ({why})");
                }
                lastOverflow[i] = overflow;
                lastMissed[i] = missed;
            }
            Remember();
        }

        void Remember()
        {
            for (int i = 0; i < 2; i++)
            {
                lastBars[i] = naive.bars[i];
                lastAlarms[i] = naive.alarms[i];
            }
        }

        public void Tick(float dt) { }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        public string Snapshot()
        {
            if (naive == null)
                return $"level={Fmt.F(site.Field.Level)} b={site.DeviceB} barA={Fmt.F(site.Hud.LevelOf("A"))} barB={Fmt.F(site.Hud.LevelOf("B"))} alarmA={B(site.Hud.IsAlarmOn("A"))} alarmB={B(site.Hud.IsAlarmOn("B"))}";
            return $"level={Fmt.F(field.Level)} b={DeviceB()} barA={Fmt.F(naive.bars[0])} barB={Fmt.F(naive.bars[1])} alarmA={B(naive.alarms[0])} alarmB={B(naive.alarms[1])}";
        }

        static int B(bool b) => b ? 1 : 0;
    }
}
