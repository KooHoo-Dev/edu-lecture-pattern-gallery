// 기지 HUD (클라이언트): 구역마다 막대(0~1)와 경보등을 정한다. IRadiationSensor 만 알고 장비 종류(LegacyProbe, GeigerX)를 모른다.
// 막대와 경보는 같은 Level01 값 하나로 정한다. 정한 결과는 C# event 로 알리고, Unity 쪽 컴포넌트가 받아 화면에 옮긴다.
using System;
using System.Collections.Generic;

namespace PatternGallery.AdapterSensorUnits
{
    public sealed class RadiationHud
    {
        /// <summary>이 값 이상이면 경보등을 켠다 (0~1)</summary>
        public float AlarmLevel = 0.7f;

        /// <summary>막대에 값을 넣을 때 (구역, 0~1 값). 막대의 꽉 찬 값은 언제나 1 이다</summary>
        public event Action<string, float> LevelShown;
        /// <summary>경보등이 켜지거나 꺼질 때 (구역, 켜짐)</summary>
        public event Action<string, bool> AlarmChanged;

        readonly List<IRadiationSensor> sensors = new List<IRadiationSensor>();
        readonly Dictionary<string, float> shown = new Dictionary<string, float>();
        readonly Dictionary<string, bool> alarms = new Dictionary<string, bool>();

        public IReadOnlyList<IRadiationSensor> Sensors => sensors;

        /// <summary>구역에 센서를 붙인다. 같은 구역에 이미 있으면 바꿔 끼운다. 붙이는 순간 지금 값으로 한 번 보인다</summary>
        public void Attach(IRadiationSensor sensor)
        {
            int i = sensors.FindIndex(s => s.Zone == sensor.Zone);
            if (i >= 0) sensors[i] = sensor;
            else sensors.Add(sensor);
            Show(sensor);
        }

        /// <summary>모든 구역을 다시 읽어 보인다</summary>
        public void Refresh()
        {
            foreach (IRadiationSensor sensor in sensors) Show(sensor);
        }

        public float LevelOf(string zone) => shown.TryGetValue(zone, out float v) ? v : 0f;
        public bool IsAlarmOn(string zone) => alarms.TryGetValue(zone, out bool on) && on;

        void Show(IRadiationSensor sensor)
        {
            float level = sensor.Level01; // [1] 장비 종류를 모른 채 0~1 float 하나만 받는다
            shown[sensor.Zone] = level;
            LevelShown?.Invoke(sensor.Zone, level); // [4] 막대는 이 값 그대로
            bool on = level >= AlarmLevel; // [4] 경보도 같은 값으로 정한다
            if (on == IsAlarmOn(sensor.Zone)) return;
            alarms[sensor.Zone] = on;
            AlarmChanged?.Invoke(sensor.Zone, on);
        }
    }
}
