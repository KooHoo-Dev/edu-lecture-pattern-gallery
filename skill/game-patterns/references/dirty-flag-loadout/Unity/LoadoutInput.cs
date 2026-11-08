// 장비 칸 연결 컴포넌트: Input System 입력을 코어 Loadout 의 메서드에 잇고, 코어가 알리면 그 자리에서 확인용 글(IMGUI)을 고친다.
// 장비를 바꾸는 길은 Loadout 의 메서드뿐이다. 이 파일도 칸 목록을 직접 고치지 못한다 (private).
// 게임 규칙은 여기 없다. 무게 식이나 묶음 규칙을 바꾸려면 Core/Loadout.cs, Core/Items.cs 를 고친다.
using System.Text;
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.DirtyFlagLoadout
{
    public class LoadoutInput : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름. Play 중에 바꿔도 반영된다)")]
        [Tooltip("수리 키트 한 개 무게. Play 중에 바꾸면 들고 있는 수리 키트에도 반영된다")]
        [SerializeField] float kitWeight = 2f;
        [Tooltip("냉각 셀 한 개 무게. Play 중에 바꾸면 들고 있는 냉각 셀에도 반영된다")]
        [SerializeField] float cellWeight = 1f;
        [Tooltip("짐이 없을 때의 이동 속도 (유닛/초). 속도 = baseSpeed × max(0.25, 1 − 총 무게 / 30)")]
        [SerializeField] float baseSpeed = 4f;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다)")]
        [SerializeField] InputAction pickupAction;
        [SerializeField] InputAction dropAction;
        [SerializeField] InputAction useKitAction;
        [SerializeField] InputAction upgradeAction;
        [SerializeField] bool logEvents = true;

        Loadout loadout;
        string slotsText = "";
        string weightText = "";

        /// <summary>
        /// 처음 읽을 때 만든다. HarinMover 의 Update 나 다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게.
        /// </summary>
        public Loadout Loadout => loadout ??= Build();

        Loadout Build()
        {
            var l = new Loadout(baseSpeed);
            Items.FillStarter(l, kitWeight, cellWeight);
            return l;
        }

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            pickupAction = new InputAction("Pickup", InputActionType.Button, "<Keyboard>/q");
            dropAction = new InputAction("Drop", InputActionType.Button, "<Keyboard>/w");
            useKitAction = new InputAction("UseKit", InputActionType.Button, "<Keyboard>/e");
            upgradeAction = new InputAction("Upgrade", InputActionType.Button, "<Keyboard>/r");
        }

        void OnEnable()
        {
            Loadout.CountChanged += OnCountChanged;
            Loadout.UnitWeightChanged += OnUnitWeightChanged;
            Loadout.Ignored += OnIgnored;
            Loadout.Recalculated += OnRecalculated;
            pickupAction.performed += OnPickup;
            dropAction.performed += OnDrop;
            useKitAction.performed += OnUseKit;
            upgradeAction.performed += OnUpgrade;
            pickupAction.Enable();
            dropAction.Enable();
            useKitAction.Enable();
            upgradeAction.Enable();
            // 켜질 때 지금 값으로 맞춘다 (이벤트는 바뀔 때만 오므로). 처음에는 표시가 켜져 있어 여기서 첫 계산을 한다
            ShowSlots();
            ShowWeight(Loadout.TotalWeight);
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 두 번 처리된다
            Loadout.CountChanged -= OnCountChanged;
            Loadout.UnitWeightChanged -= OnUnitWeightChanged;
            Loadout.Ignored -= OnIgnored;
            Loadout.Recalculated -= OnRecalculated;
            pickupAction.performed -= OnPickup;
            dropAction.performed -= OnDrop;
            useKitAction.performed -= OnUseKit;
            upgradeAction.performed -= OnUpgrade;
            pickupAction.Disable();
            dropAction.Disable();
            useKitAction.Disable();
            upgradeAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어에도 넣는다. SetUnitWeight 도 표시를 켜는 길이라 다음에 읽을 때 다시 계산된다
            if (loadout == null) return;
            loadout.BaseSpeed = baseSpeed;
            loadout.SetUnitWeight(Items.Kit, kitWeight);
            loadout.SetUnitWeight(Items.Cell, cellWeight);
            ShowSlots();
            ShowWeight(loadout.TotalWeight);
        }

        void OnPickup(InputAction.CallbackContext _) => Loadout.Add(Items.Cell, cellWeight, Items.CellModule, Items.CellStack); // [1]
        void OnDrop(InputAction.CallbackContext _) => Loadout.RemoveLast(); // [1]
        void OnUseKit(InputAction.CallbackContext _) => Loadout.UseOne(Items.Kit); // [1] 수리 키트도 같은 메서드로만 줄인다
        void OnUpgrade(InputAction.CallbackContext _) => Loadout.Upgrade(Items.Oxygen); // [1]

        void OnCountChanged(string item, int before, int after)
        {
            // 여기서 TotalWeight 를 읽지 않는다. 읽으면 바뀔 때마다 계산해 표시를 둔 뜻이 없어진다
            ShowSlots();
            if (logEvents) Debug.Log($"[Loadout] {item} {before} → {after} · 표시 켬", this);
        }

        void OnUnitWeightChanged(string item, float before, float after)
        {
            ShowSlots();
            if (logEvents) Debug.Log($"[Loadout] {item} 합금: 한 개 {before:0.00} → {after:0.00} · 표시 켬", this);
        }

        void OnIgnored(string reason)
        {
            if (logEvents) Debug.Log($"[Loadout] 받지 않음: {reason}", this);
        }

        void OnRecalculated(float weight, int count)
        {
            ShowWeight(weight); // [3] 다시 계산했을 때만 무게 글을 고친다
            if (logEvents) Debug.Log($"[Loadout] 다시 계산 {count}회 → 총 무게 {weight:0.00}", this);
        }

        void ShowWeight(float weight)
        {
            weightText = $"다시 계산 {Loadout.RecalcCount}회 · 총 무게 {weight:0.0} / {Loadout.MaxWeight:0} · 속도 {Loadout.Speed:0.00}";
        }

        void ShowSlots()
        {
            var sb = new StringBuilder();
            for (int i = 0; i < Loadout.SlotCount; i++)
            {
                SlotInfo s = Loadout[i];
                sb.Append($"{s.Name} ×{s.Count}{(s.Alloy ? " (합금)" : "")} · {s.Weight:0.0}\n");
            }
            slotsText = sb.Length == 0 ? "(빈 장비)" : sb.ToString();
        }

        void OnGUI()
        {
            // 확인용 화면. 실제 게임은 UGUI·TextMeshPro 로 만든다
            GUI.Label(new Rect(10, 10, 600, 24), weightText);
            GUI.Label(new Rect(10, 34, 600, 140), slotsText);
        }
    }
}
