// 센서 기지 컴포넌트 (MonoBehaviour 쪽): 코어 RadiationSite(방사선 값, 장비, 어댑터, HUD)를 들고, 시연 키로 오르내림·교체를 흉내 낸다.
// 화면(막대 Image, 경보등 Image, 확인용 글)은 코어 이벤트 핸들러에서 바로 바꾼다. 이 파일도 장비 종류별 분기를 갖지 않는다.
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

namespace PatternGallery.AdapterSensorUnits
{
    public class SensorStation : MonoBehaviour
    {
        [Tooltip("HUD 가 받은 0~1 값이 이 이상이면 경보등이 켜진다")]
        [Range(0.3f, 0.95f)]
        [SerializeField] float alarmLevel = 0.7f;

        [Header("시연용 입력 (실제 게임에서는 장비 SDK 가 값을 준다)")]
        [Tooltip("오름·내림 키 한 번에 바뀌는 실제 방사선 (1% 단위 정수로 들고 0~1 로 자른다)")]
        [Range(0.05f, 0.5f)]
        [SerializeField] float riseStep = 0.25f;
        [SerializeField] InputAction riseAction;
        [SerializeField] InputAction fallAction;
        [SerializeField] InputAction swapAction;

        [Header("화면")]
        [Tooltip("북쪽 A 막대. Source Image 에 스프라이트를 넣고 Image Type 을 Filled, Fill Method 를 Horizontal 로 둔 Image. 꽉 찬 값은 1")]
        [SerializeField] Image barA;
        [Tooltip("남쪽 B 막대. Source Image 에 스프라이트를 넣고 Image Type 을 Filled, Fill Method 를 Horizontal 로 둔 Image. 꽉 찬 값은 1")]
        [SerializeField] Image barB;
        [Tooltip("북쪽 A 경보등. 색만 바꾼다")]
        [SerializeField] Image lampA;
        [Tooltip("남쪽 B 경보등. 색만 바꾼다")]
        [SerializeField] Image lampB;
        [SerializeField] Color lampOffColor = new Color(0.30f, 0.72f, 0.45f);
        [SerializeField] Color lampOnColor = new Color(0.90f, 0.28f, 0.32f);
        [Tooltip("코어 이벤트를 Console 에 웹의 사건 기록과 같은 글로 남긴다")]
        [SerializeField] bool logEvents = true;

        RadiationSite site;

        /// <summary>
        /// 처음 읽을 때 만든다. 다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게.
        /// 장비 SDK 객체와 어댑터를 만들어 HUD 에 끼우는 일은 RadiationSite 생성자가 한다.
        /// </summary>
        public RadiationSite Site => site ??= new RadiationSite(alarmLevel, riseStep);

        // 확인용 글 (IMGUI). 이벤트 핸들러에서 만들고 OnGUI 는 그리기만 한다
        string fieldLine = "";
        string lineA = "";
        string lineB = "";
        GUIStyle style;

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다
            riseAction = new InputAction("Rise", InputActionType.Button, "<Keyboard>/q");
            fallAction = new InputAction("Fall", InputActionType.Button, "<Keyboard>/w");
            swapAction = new InputAction("Swap", InputActionType.Button, "<Keyboard>/e");
        }

        void OnEnable()
        {
            Site.Field.Changed += OnFieldChanged;
            Site.Hud.LevelShown += OnLevelShown;
            Site.Hud.AlarmChanged += OnAlarmChanged;
            Site.SensorSwapped += OnSensorSwapped;
            riseAction.performed += OnRise;
            fallAction.performed += OnFall;
            swapAction.performed += OnSwap;
            riseAction.Enable();
            fallAction.Enable();
            swapAction.Enable();
            // 이벤트로만 맞추는 화면이라, 켜질 때 지금 코어 상태로 한 번 맞춘다 (처음 Attach 때의 LevelShown 은 구독 전에 지나갔다)
            fieldLine = $"실제 방사선 {Site.Field.Level:0.00}";
            foreach (IRadiationSensor sensor in Site.Hud.Sensors)
            {
                ApplyLevel(sensor.Zone, Site.Hud.LevelOf(sensor.Zone));
                ApplyAlarm(sensor.Zone, Site.Hud.IsAlarmOn(sensor.Zone));
            }
        }

        void OnDisable()
        {
            Site.Field.Changed -= OnFieldChanged;
            Site.Hud.LevelShown -= OnLevelShown;
            Site.Hud.AlarmChanged -= OnAlarmChanged;
            Site.SensorSwapped -= OnSensorSwapped;
            riseAction.performed -= OnRise;
            fallAction.performed -= OnFall;
            swapAction.performed -= OnSwap;
            riseAction.Disable();
            fallAction.Disable();
            swapAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어에 넣고 HUD 를 다시 그린다. 편집 중에는 코어를 만들지 않는다
            if (site == null) return;
            site.Hud.AlarmLevel = alarmLevel;
            site.RiseStep = riseStep;
            // 다시 그리지 않으면 경보등이 옛 기준 그대로 남는다. 그 상태로 교체(E)하면 Attach 가 B 만 다시 읽어 A·B 경보등이 어긋난다
            site.Hud.Refresh();
        }

        void OnRise(InputAction.CallbackContext _) => Site.Rise();
        void OnFall(InputAction.CallbackContext _) => Site.Fall();
        void OnSwap(InputAction.CallbackContext _) => Site.SwapB(); // 도윤이 B 구역 장비를 바꾼다. 어댑터만 바꿔 끼운다

        void OnFieldChanged(float before, float after)
        {
            fieldLine = $"실제 방사선 {after:0.00}";
            Log($"방사선 {before:0.00} → {after:0.00}");
        }

        void OnLevelShown(string zone, float level)
        {
            ApplyLevel(zone, level);
            Log($"HUD {zone} 막대 {level:0.00}");
        }

        void OnAlarmChanged(string zone, bool on)
        {
            ApplyAlarm(zone, on);
            Log($"HUD {zone} 경보 {(on ? "켜짐" : "꺼짐")} (AlarmChanged)");
        }

        void OnSensorSwapped(string zone, string device)
        {
            RebuildLine(zone);
            Log($"도윤: {zone} 구역 장비 → {device} (SensorSwapped)");
        }

        void ApplyLevel(string zone, float level)
        {
            BarOf(zone).fillAmount = level; // [4] 막대는 HUD 가 받은 0~1 값 그대로 (꽉 찬 값은 1)
            RebuildLine(zone);
        }

        void ApplyAlarm(string zone, bool on)
        {
            LampOf(zone).color = on ? lampOnColor : lampOffColor; // [4] 경보등도 HUD 가 같은 값으로 정한 결과
            RebuildLine(zone);
        }

        // 구역 → 화면 칸. 장비 종류가 아니라 구역으로만 고른다
        Image BarOf(string zone) => zone == RadiationSite.ZoneA ? barA : barB;
        Image LampOf(string zone) => zone == RadiationSite.ZoneA ? lampA : lampB;

        void RebuildLine(string zone)
        {
            bool isA = zone == RadiationSite.ZoneA;
            string device = isA ? Site.DeviceA : Site.DeviceB; // 이름 글만. 값을 읽는 길은 언제나 IRadiationSensor 다
            string line = $"{(isA ? "북쪽 A" : "남쪽 B")} [{device}] {Site.Hud.LevelOf(zone):0.00} 경보 {(Site.Hud.IsAlarmOn(zone) ? "켜짐" : "꺼짐")}";
            if (isA) lineA = line;
            else lineB = line;
        }

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[Sensor] {message}", this);
        }

        void OnGUI()
        {
            style ??= new GUIStyle(GUI.skin.label) { fontSize = 18 };
            GUI.Label(new Rect(12, 10, 640, 28), fieldLine, style);
            GUI.Label(new Rect(12, 38, 640, 28), lineA, style);
            GUI.Label(new Rect(12, 66, 640, 28), lineB, style);
        }
    }
}
