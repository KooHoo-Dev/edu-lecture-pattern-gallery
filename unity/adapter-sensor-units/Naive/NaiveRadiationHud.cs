// 나쁜 예: HUD 가 장비를 직접 안다. 흔한 코드다. 실제로는 MonoBehaviour 안에 있고, bars 대신 막대 RectTransform 의
// Scale X(또는 너비)에 넣는다. 그래서 50 이 들어가면 막대가 틀 밖으로 뻗는다. Filled Image 의 fillAmount 에 넣었다면
// Unity 가 0~1 로 잘라 막대가 틀 밖으로 나가지 않고 늘 꽉 찬 채로 보인다 (0.01 이든 0.99 든 같은 모습).
// 막대 그리기(DrawBars)와 경보 판단(CheckAlarm)이 각자 장비 종류를 묻고 장비 API 를 부른다. 신형 장비를 들이면서
// 두 곳에 분기를 더했는데, 한 곳은 단위 변환을 빠뜨리고 한 곳은 정수 나눗셈을 했다. 두 실수는 서로 다른 줄이다.
// 장비(LegacyProbe, GeigerX)와 방사선 값(RadiationField)은 Core/ 의 것을 그대로 쓴다. 갤러리의 '효과 끄기' 가 같은 입력으로 돌린다.
// 프로젝트에 넣지 않는다.
namespace PatternGallery.AdapterSensorUnits.Naive
{
    public sealed class NaiveRadiationHud
    {
        public float alarmLevel = 0.7f;
        public readonly string[] zones = { "A", "B" };
        /// <summary>구역마다 장비를 그대로 든다 (LegacyProbe 나 GeigerX). 그래서 object 다</summary>
        public readonly object[] sensors = new object[2];
        /// <summary>막대 채움. 꽉 찬 값은 1 이다</summary>
        public readonly float[] bars = new float[2];
        public readonly bool[] alarms = new bool[2];

        public void Refresh()
        {
            DrawBars();
            CheckAlarm();
        }

        public void DrawBars()
        {
            for (int i = 0; i < sensors.Length; i++)
            {
                object s = sensors[i];
                if (s is LegacyProbe p) bars[i] = p.GetLevel();
                else if (s is GeigerX g) bars[i] = g.ReadPercent(); // [!] 0~100 을 그대로 0~1 막대에 넣는다 (변환을 빠뜨렸다)
            }
        }

        public void CheckAlarm()
        {
            for (int i = 0; i < sensors.Length; i++)
            {
                object s = sensors[i];
                float level = 0f;
                if (s is LegacyProbe p) level = p.GetLevel();
                else if (s is GeigerX g) level = g.ReadPercent() / 100; // [!] int / int 는 정수 나눗셈이라 100 미만이면 0 이 된다
                alarms[i] = level >= alarmLevel;
            }
        }
    }
}
