// 실제 방사선 값: 지표 탐사 구역의 방사선 세기(0~1). 두 구역(북쪽 A, 남쪽 B)이 같은 값을 쓴다. UnityEngine 을 쓰지 않는다.
// 실제 게임에서는 장비가 하드웨어로 재는 바깥 세계다. 여기서는 오름·내림 입력으로 흉내 낸다.
// 값은 1% 단위 정수(percent)로 든다. float 를 더하고 빼면 0.7 이 0.69999993 처럼 어긋나, 0~1 그대로 읽는 LegacyProbe 와
// 반올림해 읽는 GeigerX 가 경보 기준 양쪽으로 갈린다. 정수로 들면 두 장비가 늘 같은 float(percent / 100f)를 받는다.
using System;

namespace PatternGallery.AdapterSensorUnits
{
    public sealed class RadiationField
    {
        int percent;

        /// <summary>지금 방사선 세기. 0 이 깨끗하고 1 이 장비가 잴 수 있는 최대. 언제나 0.01 단위다</summary>
        public float Level => percent / 100f;

        /// <summary>값이 바뀔 때 (이전, 지금)</summary>
        public event Action<float, float> Changed;

        /// <summary>delta 를 1% 단위로 반올림해 더하고 0~100% 로 자른다. 바뀌었으면 true</summary>
        public bool Add(float delta)
        {
            int before = percent;
            int step = (int)Math.Round(delta * 100f, MidpointRounding.AwayFromZero);
            percent = Math.Clamp(percent + step, 0, 100);
            if (percent == before) return false;
            Changed?.Invoke(before / 100f, Level);
            return true;
        }
    }
}
