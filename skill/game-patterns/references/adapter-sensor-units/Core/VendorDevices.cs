// 외부 장비 SDK 흉내: 기존 장비 LegacyProbe 와 외부 업체 신형 GeigerX. **고칠 수 없는 SDK** 라고 생각한다 (업체가 준 DLL·패키지).
// 둘은 우리 인터페이스(IRadiationSensor)를 모르고 구현하지도 않는다. API 이름도 단위도 다르다:
//   LegacyProbe.GetLevel()   → float 0~1
//   GeigerX.ReadPercent()    → int 0~100 (반올림)
// 실제 장비는 하드웨어 센서에서 읽는다. Unity 없이 돌리려고 바깥 값(RadiationField.Level)을 읽는 함수를 생성자로 받는다.
using System;

namespace PatternGallery.AdapterSensorUnits
{
    /// <summary>기존 장비 SDK. 0~1 float 를 돌려준다</summary>
    public sealed class LegacyProbe
    {
        readonly Func<float> sense;

        public LegacyProbe(Func<float> sense) { this.sense = sense; }

        public float GetLevel() => sense();
    }

    /// <summary>외부 업체 신형 SDK. 0~100 정수(퍼센트, 반올림)를 돌려준다</summary>
    public sealed class GeigerX
    {
        readonly Func<float> sense;

        public GeigerX(Func<float> sense) { this.sense = sense; }

        public int ReadPercent() => (int)Math.Round(sense() * 100f, MidpointRounding.AwayFromZero);
    }
}
