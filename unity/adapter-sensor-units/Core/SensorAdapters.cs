// 어댑터: 고칠 수 없는 장비 SDK 를 필드로 들고(감싸고) 우리 인터페이스 IRadiationSensor 를 구현한다.
// 장비 클래스를 상속하지 않고 감싼다 (객체 어댑터). SDK 클래스는 sealed 라 상속할 수 없고, 감싸면 이미 만든 장비 객체를
// 그대로 받을 수 있다. 우리 쪽이 인터페이스가 아니라 클래스였다면 C# 는 클래스를 둘 상속할 수 없어 감싸는 길뿐이다.
// (장비가 sealed 가 아니면 class GeigerXAdapter : GeigerX, IRadiationSensor 같은 클래스 어댑터도 된다.) 단위 변환은 여기 한 곳에만 있다.
// 어댑터는 모양만 바꾼다. 경보 판단이나 막대 그리기는 하지 않는다.
namespace PatternGallery.AdapterSensorUnits
{
    /// <summary>기존 장비: API 이름만 맞춘다. 단위는 이미 0~1 이다</summary>
    public sealed class LegacyProbeAdapter : IRadiationSensor
    {
        readonly LegacyProbe device;

        public LegacyProbeAdapter(string zone, LegacyProbe device)
        {
            Zone = zone;
            this.device = device;
        }

        public string Zone { get; }

        public float Level01 => device.GetLevel(); // [2] 장비 API 를 부른다 (이미 0~1)
    }

    /// <summary>신형 장비: API 이름(ReadPercent)과 단위(0~100 정수)를 둘 다 맞춘다</summary>
    public sealed class GeigerXAdapter : IRadiationSensor
    {
        readonly GeigerX device;

        public GeigerXAdapter(string zone, GeigerX device)
        {
            Zone = zone;
            this.device = device;
        }

        public string Zone { get; }

        public float Level01
        {
            get
            {
                int percent = device.ReadPercent(); // [2] 장비 API 를 부른다 (0~100 정수)
                return percent / 100f; // [3] 단위를 0~1 float 로. 100f 라서 실수 나눗셈이다 (/ 100 이면 정수 나눗셈으로 0)
            }
        }
    }
}
