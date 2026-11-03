// 명중 처리 창구를 씬에 두는 컴포넌트: 코어 CombatSystem 과 드론 셋(DroneField)을 들고, 하위 시스템이 알린 일을 화면과 Console 에 옮긴다.
// 공격 컴포넌트(GunInput, TrapZone, ShockDroneInput)는 Inspector 의 Hub 칸으로 이 컴포넌트를 받는다. 싱글턴이 아니다.
// 게임 규칙은 여기 없다. 피해 규칙을 바꾸려면 Core/ 의 DamageCalculator 한 곳을 고친다.
using System.Text;
using UnityEngine;

namespace PatternGallery.FacadeHitResolution
{
    public class CombatHub : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름. Play 중에 바꿔도 반영된다)")]
        [Tooltip("중장갑 D3 의 방어력. D3 을 맞히면 창구가 피해를 계산할 때 어느 공격이든 기본 피해에서 뺀다 (최소 1)")]
        [SerializeField] int armor = 2;

        [Header("화면")]
        [Tooltip("D1, D2, D3 순서의 드론 오브젝트. 파괴 처리되면 끈다 (SetActive(false))")]
        [SerializeField] GameObject[] droneObjects = new GameObject[3];
        [Tooltip("Game 뷰 왼쪽 위에 크레딧, 드론 HP, 마지막 명중의 단계를, 맞은 드론 위에 피해 숫자를 그린다 (IMGUI, Camera.main 기준)")]
        [SerializeField] bool showStatusOnScreen = true;
        [SerializeField] bool logEvents = true;

        DroneField field;
        CombatSystem combat;
        string statusText = "";
        string lastHit = "아직 없음";
        string popupText = "";
        Vector3 popupWorld;
        float popupUntil = -1f;

        /// <summary>드론 셋. 처음 읽을 때 만든다 (공격 컴포넌트가 이 오브젝트의 Awake 보다 먼저 읽어도 null 이 아니게)</summary>
        public DroneField Field => field ??= DroneField.CreateDefault(armor);

        /// <summary>명중 처리 창구. 처음 읽을 때 만든다. 공격 컴포넌트는 이것의 Hit 한 줄만 부른다</summary>
        public CombatSystem Combat => combat ??= new CombatSystem();

        void OnEnable()
        {
            Combat.HitRequested += OnHitRequested;
            Combat.HitRefused += OnHitRefused;
            Combat.Calculator.Calculated += OnCalculated;
            Combat.Feed.DamageShown += OnDamageShown;
            Combat.Feed.HitTaken += OnHitTaken;
            Combat.Wreckage.Destroyed += OnDestroyed;
            Combat.Wreckage.RewardGranted += OnRewardGranted;
            foreach (Drone d in Field.All) d.HpChanged += OnHpChanged;
            // 꺼져 있던 동안 파괴된 드론은 Destroyed 를 듣지 못했다. 지금 코어 상태로 오브젝트를 한 번 다시 맞춘다
            foreach (Drone d in Field.All)
            {
                GameObject go = ObjectOf(d);
                if (go != null && d.IsDestroyed) go.SetActive(false);
            }
            RefreshText();
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 핸들러가 두 번 붙는다
            Combat.HitRequested -= OnHitRequested;
            Combat.HitRefused -= OnHitRefused;
            Combat.Calculator.Calculated -= OnCalculated;
            Combat.Feed.DamageShown -= OnDamageShown;
            Combat.Feed.HitTaken -= OnHitTaken;
            Combat.Wreckage.Destroyed -= OnDestroyed;
            Combat.Wreckage.RewardGranted -= OnRewardGranted;
            foreach (Drone d in Field.All) d.HpChanged -= OnHpChanged;
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어 드론에도 넣는다
            if (field == null) return;
            field.Heavy.Armor = armor;
            RefreshText();
        }

        void OnHitRequested(string attacker, Drone target, int baseDamage)
        {
            lastHit = $"{attacker} → {target.Name}:";
            Log($"{attacker} → 창구 Hit({target.Name}, 기본 {baseDamage})");
        }

        void OnHitRefused(string attacker, Drone target)
        {
            lastHit = target == null ? $"{attacker}: 대상 없음 → 창구가 받지 않음" : $"{attacker} → {target.Name}: 이미 파괴됨 → 창구가 받지 않음";
            Log(target == null ? $"{attacker} → 창구: 대상 없음, 받지 않는다" : $"{attacker} → 창구: {target.Name} 이미 파괴됨, 받지 않는다");
            RefreshText();
        }

        void OnCalculated(int baseDamage, int armorValue, int final)
        {
            lastHit += $" 계산 {baseDamage}-{armorValue}={final} ✓";
            Log(baseDamage - armorValue >= DamageCalculator.MinDamage
                ? $"계산 {baseDamage} - 방어 {armorValue} = {final}"
                : $"계산 {baseDamage} - 방어 {armorValue} → 최소 {final}");
        }

        void OnDamageShown(Drone d, int amount)
        {
            lastHit += " 표시 ✓";
            // 숫자는 OnGUI 가 그리기만 한다. 무엇을 어디에 띄울지는 여기서 바로 정한다
            GameObject go = ObjectOf(d);
            popupText = $"-{amount}";
            popupWorld = go != null ? go.transform.position + Vector3.up * 1.2f : transform.position;
            popupUntil = Time.time + 0.7f;
            Log($"표시 {d.Name} -{amount}");
        }

        void OnHpChanged(Drone d, int before, int after)
        {
            lastHit += " 적용 ✓";
            Log($"적용 {d.Name} HP {before} → {after}");
            RefreshText();
        }

        void OnHitTaken(string attacker, Drone d)
        {
            lastHit += " 알림 ✓";
            Log($"알림 {d.Name} 피격 ({attacker})");
            RefreshText();
        }

        void OnDestroyed(Drone d)
        {
            lastHit += " 파괴 ✓";
            // Destroy 대신 끈다. 코어 드론의 IsDestroyed 가 이미 true 라 창구가 다음 명중을 받지 않는다
            GameObject go = ObjectOf(d);
            if (go != null) go.SetActive(false);
            Log($"파괴 {d.Name} (화면에서 뺀다)");
        }

        void OnRewardGranted(Drone d, int reward, int total)
        {
            Log($"보상 +{reward} 크레딧 (합 {total})");
            RefreshText();
        }

        GameObject ObjectOf(Drone d)
        {
            int i = Field.IndexOf(d);
            return droneObjects != null && i >= 0 && i < droneObjects.Length ? droneObjects[i] : null;
        }

        /// <summary>씬의 드론 오브젝트에 맞는 코어 드론 (ObjectOf 의 반대). Drone Objects 칸에 없으면 null.
        /// 물리 트리거로 들어온 오브젝트를 창구에 넘길 때 쓴다: combat.Hit("Trap", hub.DroneOf(other.gameObject), …)</summary>
        public Drone DroneOf(GameObject go)
        {
            if (go == null || droneObjects == null) return null;
            int i = System.Array.IndexOf(droneObjects, go);
            return i >= 0 && i < Field.All.Count ? Field.All[i] : null;
        }

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[Combat] {message}", this);
        }

        /// <summary>상태 글. 이벤트를 받을 때 바로 만든다 (OnGUI 는 그리기만)</summary>
        void RefreshText()
        {
            var sb = new StringBuilder();
            sb.Append($"크레딧 {Combat.Wreckage.Credits}\n");
            foreach (Drone d in Field.All)
                sb.Append(d.IsDestroyed ? $"{d.Name} 파괴   " : $"{d.Name} HP {d.Hp}/{d.MaxHp}{(d.Armor > 0 ? $" (방어 {d.Armor})" : "")}   ");
            sb.Append($"\n마지막 명중 {lastHit}");
            statusText = sb.ToString();
        }

        void OnGUI()
        {
            if (!showStatusOnScreen) return;
            GUI.Label(new Rect(12f, 12f, 720f, 64f), statusText);
            if (Time.time >= popupUntil || Camera.main == null) return;
            Vector3 screen = Camera.main.WorldToScreenPoint(popupWorld);
            if (screen.z > 0f) GUI.Label(new Rect(screen.x - 20f, Screen.height - screen.y - 12f, 60f, 24f), popupText);
        }
    }
}
