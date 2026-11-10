// 무기 출력 연결 컴포넌트: Input System 입력을 코어(BuffSet)에 넘기고, 출력이 바뀌면(PowerChanged) 그 자리에서 UGUI 에 옮긴다.
// 버프 지속 시간은 코루틴이 아니라 코어의 Tick 이 센다. 그래서 StopCoroutine 으로 끝 처리(빼기)를 건너뛰는 일이 생기지 않는다.
// 게임 규칙은 여기 없다. 층 순서나 갱신 규칙을 바꾸려면 Core/BuffSet.cs 를 고친다.
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

namespace PatternGallery.DecoratorStatBuffs
{
    public class PowerBuffs : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름. Play 중에 바꿔도 반영된다)")]
        [SerializeField] float cellBonus = 5f;
        [SerializeField] float overloadMultiplier = 2f;
        [SerializeField] float cellDuration = 4f;
        [SerializeField] float overloadDuration = 2f;
        [Tooltip("버프가 없을 때의 무기 출력. 웹 갤러리에는 없는 칸이다 (웹은 10 고정)")]
        [SerializeField] float basePower = 10f;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다)")]
        [SerializeField] InputAction cellAction;
        [SerializeField] InputAction overloadAction;
        [SerializeField] InputAction purgeAction;

        [Header("화면 (UGUI)")]
        [Tooltip("Source Image 에 스프라이트를 넣고 Image Type 을 Filled, Fill Method 를 Horizontal 로 둔 Image")]
        [SerializeField] Image powerFill;
        [SerializeField] Text powerText;
        [Tooltip("감싸기 사슬을 글로 보인다 (예: 과부하 ×2 [냉각 셀 +5 [기본 10]])")]
        [SerializeField] Text chainText;
        [Tooltip("있으면 냉각 셀의 남은 시간을 채움으로 보인다 (Filled · Horizontal)")]
        [SerializeField] Image cellTimerFill;
        [Tooltip("있으면 과부하의 남은 시간을 채움으로 보인다 (Filled · Horizontal)")]
        [SerializeField] Image overloadTimerFill;
        [SerializeField] bool logEvents = true;

        BuffSet buffs;

        /// <summary>
        /// 처음 읽을 때 만든다. 다른 오브젝트(버프 아이콘 UI 등)의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게.
        /// </summary>
        public BuffSet Buffs => buffs ??= new BuffSet(MakeSettings());

        BuffSettings MakeSettings() => new BuffSettings
        {
            BasePower = basePower,
            CellBonus = cellBonus,
            OverloadMultiplier = overloadMultiplier,
            CellDuration = cellDuration,
            OverloadDuration = overloadDuration,
        };

        /// <summary>
        /// 막대가 가득 차는 출력. 조절 값 범위의 최대값 (10 + 15) × 3 = 75 로 고정한다 (웹 무대와 같다).
        /// 조절 값으로 계산하면 값을 바꿔도 막대 길이가 같아 보인다
        /// </summary>
        const float FullScale = 75f;

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            cellAction = new InputAction("Cell", InputActionType.Button, "<Keyboard>/1");
            overloadAction = new InputAction("Overload", InputActionType.Button, "<Keyboard>/2");
            purgeAction = new InputAction("Purge", InputActionType.Button, "<Keyboard>/3");
        }

        void OnEnable()
        {
            Buffs.PowerChanged += OnPowerChanged;
            Buffs.ChainRebuilt += OnChainRebuilt;
            Buffs.BuffRefreshed += OnBuffRefreshed;
            Buffs.BuffExpired += OnBuffExpired;
            cellAction.performed += OnCell;
            overloadAction.performed += OnOverload;
            purgeAction.performed += OnPurge;
            cellAction.Enable();
            overloadAction.Enable();
            purgeAction.Enable();
            // 켜질 때 지금 값으로 맞춘다 (이벤트는 바뀔 때만 오므로)
            ShowPower(Buffs.Value);
            ShowChain(Buffs.Power);
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 두 번 처리된다
            Buffs.PowerChanged -= OnPowerChanged;
            Buffs.ChainRebuilt -= OnChainRebuilt;
            Buffs.BuffRefreshed -= OnBuffRefreshed;
            Buffs.BuffExpired -= OnBuffExpired;
            cellAction.performed -= OnCell;
            overloadAction.performed -= OnOverload;
            purgeAction.performed -= OnPurge;
            cellAction.Disable();
            overloadAction.Disable();
            purgeAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어 설정에도 넣고 사슬을 다시 만든다
            if (buffs == null) return;
            BuffSettings s = buffs.Settings;
            s.BasePower = basePower;
            s.CellBonus = cellBonus;
            s.OverloadMultiplier = overloadMultiplier;
            s.CellDuration = cellDuration;
            s.OverloadDuration = overloadDuration;
            buffs.SettingsChanged();
        }

        void OnCell(InputAction.CallbackContext _) => Buffs.Apply(BuffKind.Cell); // [1]
        void OnOverload(InputAction.CallbackContext _) => Buffs.Apply(BuffKind.Overload); // [1]
        void OnPurge(InputAction.CallbackContext _) => Buffs.Purge();

        void Update()
        {
            Buffs.Tick(Time.deltaTime); // [4] 버프 시간은 코루틴이 아니라 여기서 센다
            // 남은 시간은 매 프레임 바뀌는 값이라 Update 에서 옮긴다. 출력은 PowerChanged 에서만 옮긴다
            if (cellTimerFill != null) cellTimerFill.fillAmount = Buffs.RemainingOf(BuffKind.Cell) / Mathf.Max(0.01f, cellDuration);
            if (overloadTimerFill != null) overloadTimerFill.fillAmount = Buffs.RemainingOf(BuffKind.Overload) / Mathf.Max(0.01f, overloadDuration);
        }

        void OnPowerChanged(float previous, float now)
        {
            ShowPower(now);
            if (logEvents) Debug.Log($"[PowerBuffs] 출력 {StatText.Num(previous)} → {StatText.Num(now)}", this);
        }

        void OnChainRebuilt(IPowerStat chain)
        {
            ShowChain(chain);
            // Inspector 값을 바꿔 사슬만 다시 만들어진 경우에도 막대와 숫자를 맞춘다 (출력이 같으면 PowerChanged 는 오지 않는다)
            ShowPower(Buffs.Value);
            if (logEvents) Debug.Log($"[PowerBuffs] 사슬 다시 감싸기: {StatText.Describe(chain)}", this);
        }

        void OnBuffRefreshed(BuffKind kind, float remaining)
        {
            if (logEvents) Debug.Log($"[PowerBuffs] {BuffSet.NameOf(kind)} 다시 받음 → 남은 시간만 {remaining:0.00}초로", this);
        }

        void OnBuffExpired(BuffKind kind)
        {
            if (logEvents) Debug.Log($"[PowerBuffs] {BuffSet.NameOf(kind)} 끝 → 목록에서 뺌", this);
        }

        void ShowPower(float value)
        {
            if (powerFill != null) powerFill.fillAmount = Mathf.Clamp01(value / FullScale);
            if (powerText != null) powerText.text = $"무기 출력 {StatText.Num(value)}";
        }

        void ShowChain(IPowerStat chain)
        {
            if (chainText != null) chainText.text = StatText.Describe(chain);
        }
    }
}
