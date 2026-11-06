// 탐사 구역 설비 (조립하는 곳): 방사선 값, 장비 셋, 어댑터, HUD 를 만들어 잇는다. 장비의 구체 형식은 여기서만 안다.
// 정비사 도윤의 일(B 구역 장비 바꾸기)도 여기 있다. 바꿀 때는 어댑터만 바꿔 끼우고, HUD 코드는 그대로다.
using System;

namespace PatternGallery.AdapterSensorUnits
{
    public sealed class RadiationSite
    {
        public const string ZoneA = "A";
        public const string ZoneB = "B";

        public readonly RadiationField Field = new RadiationField();
        public readonly RadiationHud Hud;
        /// <summary>오름·내림 한 번에 바뀌는 방사선</summary>
        public float RiseStep;

        // 두 구역의 실제 방사선은 같다 (비교를 위해). 장비는 구역마다 따로 있다
        readonly LegacyProbe probeA;
        readonly LegacyProbe probeB;
        readonly GeigerX geigerB;
        readonly IRadiationSensor legacyB;
        readonly IRadiationSensor upgradedB;

        /// <summary>B 구역 장비가 신형(GeigerX)인지</summary>
        public bool IsBUpgraded { get; private set; }
        public string DeviceA => nameof(LegacyProbe);
        public string DeviceB => IsBUpgraded ? nameof(GeigerX) : nameof(LegacyProbe);

        /// <summary>장비를 바꿔 끼웠을 때 (구역, 새 장비 이름)</summary>
        public event Action<string, string> SensorSwapped;

        public RadiationSite(float alarmLevel, float riseStep)
        {
            RiseStep = riseStep;
            Hud = new RadiationHud { AlarmLevel = alarmLevel };
            probeA = new LegacyProbe(() => Field.Level);
            probeB = new LegacyProbe(() => Field.Level);
            geigerB = new GeigerX(() => Field.Level);
            legacyB = new LegacyProbeAdapter(ZoneB, probeB);
            upgradedB = new GeigerXAdapter(ZoneB, geigerB);
            Hud.Attach(new LegacyProbeAdapter(ZoneA, probeA));
            Hud.Attach(legacyB);
        }

        public void Rise()
        {
            if (Field.Add(RiseStep)) Hud.Refresh();
        }

        public void Fall()
        {
            if (Field.Add(-RiseStep)) Hud.Refresh();
        }

        /// <summary>도윤이 B 구역 장비를 기존 ↔ 신형으로 바꾼다. HUD 에는 어댑터를 끼우므로 HUD 는 바뀐 줄 모른다</summary>
        public void SwapB()
        {
            IsBUpgraded = !IsBUpgraded;
            SensorSwapped?.Invoke(ZoneB, DeviceB);
            Hud.Attach(IsBUpgraded ? upgradedB : legacyB);
        }
    }
}
