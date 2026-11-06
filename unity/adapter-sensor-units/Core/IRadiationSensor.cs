// 우리 쪽 인터페이스: HUD 가 아는 센서 모양은 이것 하나다. 값은 언제나 0~1 float (0 깨끗, 1 최대).
// 장비가 무엇이든, 단위가 무엇이든 이 모양으로 바꾸는 일은 어댑터가 한다.
namespace PatternGallery.AdapterSensorUnits
{
    public interface IRadiationSensor
    {
        /// <summary>센서가 있는 구역 ("A" 북쪽, "B" 남쪽)</summary>
        string Zone { get; }

        /// <summary>지금 방사선 세기, 0~1 float</summary>
        float Level01 { get; }
    }
}
