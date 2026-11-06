// 실제 방사선 값: 지표 탐사 구역의 방사선 세기(0~1). 두 구역(북쪽 A, 남쪽 B)이 같은 값을 쓴다. UnityEngine 을 쓰지 않는다.
// 실제 게임에서는 장비가 하드웨어로 재는 바깥 세계다. 여기서는 오름·내림 입력으로 흉내 낸다.
using System;

namespace PatternGallery.AdapterSensorUnits
{
    public sealed class RadiationField
    {
        /// <summary>지금 방사선 세기. 0 이 깨끗하고 1 이 장비가 잴 수 있는 최대</summary>
        public float Level { get; private set; }

        /// <summary>값이 바뀔 때 (이전, 지금)</summary>
        public event Action<float, float> Changed;

        /// <summary>delta 만큼 바꾸고 0~1 로 자른다. 바뀌었으면 true</summary>
        public bool Add(float delta)
        {
            float before = Level;
            Level = Math.Clamp(Level + delta, 0f, 1f);
            if (Level == before) return false;
            Changed?.Invoke(before, Level);
            return true;
        }
    }
}
