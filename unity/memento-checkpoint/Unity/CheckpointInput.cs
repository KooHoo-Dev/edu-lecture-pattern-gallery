// 체크포인트 연결 컴포넌트: Input System 입력을 코어(Explorer, Checkpoint)에 넘기고, 화면은 코어의 이벤트 핸들러에서 바로 갱신한다.
// 저장·되살리기 규칙은 여기 없다 (Core/ 의 Explorer.CreateMemento·Restore, Checkpoint).
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.MementoCheckpoint
{
    public class CheckpointInput : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름)")]
        [Tooltip("'회로 조각 줍기' 한 번에 더하는 크레딧. 누를 때마다 읽어 Play 중에 바꾸면 다음 줍기부터 쓴다")]
        [SerializeField] int fragmentValue = 20;
        [Tooltip("'피해' 한 번에 깎는 HP. 누를 때마다 읽어 Play 중에 바꾸면 다음 피해부터 쓴다")]
        [SerializeField] int hurtDamage = 50;
        [Tooltip("하린의 최대 HP 이자 시작 HP. 코어를 처음 만들 때 한 번만 읽는다")]
        [SerializeField] int maxHp = 100;

        [Header("아이템")]
        [Tooltip("'줍기' 가 인벤토리에 넣는 아이템 이름. 누를 때마다 읽는다")]
        [SerializeField] string fragmentName = "회로 조각";

        [Header("시작 (코어를 처음 만들 때 한 번만 읽는다)")]
        [Tooltip("하린이 처음 서는 칸 (0~8)")]
        [SerializeField] int startCell = 1;

        [Header("화면")]
        [Tooltip("하린의 모습. 칸 자리로 옮기고, 쓰러지면 옆으로 눕힌다")]
        [SerializeField] Transform explorerView;
        [Tooltip("체크포인트 깃발. 저장한 칸 옆에 세운다. 저장하기 전에는 꺼 둔다")]
        [SerializeField] Transform checkpointFlag;
        [Tooltip("칸 0 의 자리. 비우면 이 오브젝트의 위치")]
        [SerializeField] Transform firstCell;
        [SerializeField] float cellSize = 1.5f;
        [SerializeField] bool showStatusOnScreen = true;
        [SerializeField] bool logEvents = true;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다)")]
        [SerializeField] InputAction saveAction;
        [SerializeField] InputAction pickupAction;
        [SerializeField] InputAction hurtAction;
        [SerializeField] InputAction restoreAction;
        [SerializeField] InputAction walkAction;

        Explorer explorer;
        Checkpoint checkpoint;
        string statusText = "";

        /// <summary>
        /// 처음 읽을 때 만든다. 다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게.
        /// </summary>
        public Explorer Explorer => explorer ??= new Explorer(maxHp, startCell);
        public Checkpoint Checkpoint => checkpoint ??= new Checkpoint(Explorer);

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            saveAction = new InputAction("Save", InputActionType.Button, "<Keyboard>/q");
            pickupAction = new InputAction("Pickup", InputActionType.Button, "<Keyboard>/w");
            hurtAction = new InputAction("Hurt", InputActionType.Button, "<Keyboard>/e");
            restoreAction = new InputAction("Restore", InputActionType.Button, "<Keyboard>/r");
            walkAction = new InputAction("Walk", InputActionType.Button, "<Keyboard>/t");
        }

        void OnEnable()
        {
            Explorer.Walked += OnWalked;
            Explorer.PickedUp += OnPickedUp;
            Explorer.Hurt += OnHurt;
            Explorer.Downed += OnDowned;
            Explorer.Restored += OnRestored;
            Explorer.InputIgnored += OnInputIgnored;
            Checkpoint.Saved += OnSaved;
            Checkpoint.SaveRefused += OnSaveRefused;
            Checkpoint.NothingToRestore += OnNothingToRestore;
            saveAction.performed += OnSave;
            pickupAction.performed += OnPickup;
            hurtAction.performed += OnHurtKey;
            restoreAction.performed += OnRestore;
            walkAction.performed += OnWalk;
            saveAction.Enable();
            pickupAction.Enable();
            hurtAction.Enable();
            restoreAction.Enable();
            walkAction.Enable();
            // 꺼져 있던 동안 다른 스크립트가 저장하거나 되살렸다면 그 이벤트는 듣지 못했다. 지금 코어 값으로 다시 맞춘다
            ShowAll();
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 두 번 줍는다
            Explorer.Walked -= OnWalked;
            Explorer.PickedUp -= OnPickedUp;
            Explorer.Hurt -= OnHurt;
            Explorer.Downed -= OnDowned;
            Explorer.Restored -= OnRestored;
            Explorer.InputIgnored -= OnInputIgnored;
            Checkpoint.Saved -= OnSaved;
            Checkpoint.SaveRefused -= OnSaveRefused;
            Checkpoint.NothingToRestore -= OnNothingToRestore;
            saveAction.performed -= OnSave;
            pickupAction.performed -= OnPickup;
            hurtAction.performed -= OnHurtKey;
            restoreAction.performed -= OnRestore;
            walkAction.performed -= OnWalk;
            saveAction.Disable();
            pickupAction.Disable();
            hurtAction.Disable();
            restoreAction.Disable();
            walkAction.Disable();
        }

        void OnSave(InputAction.CallbackContext _) => Checkpoint.Save(); // [1] 저장은 관리자에게 맡긴다. 관리자는 원래 객체에 뜨기를 맡긴다
        void OnPickup(InputAction.CallbackContext _) => Explorer.PickUp(fragmentName, fragmentValue); // [4] 지금 상태만 바뀐다
        void OnHurtKey(InputAction.CallbackContext _) => Explorer.TakeDamage(hurtDamage);
        void OnRestore(InputAction.CallbackContext _) => Checkpoint.Respawn(); // [3]
        void OnWalk(InputAction.CallbackContext _) => Explorer.Walk();

        void OnSaved(ExplorerMemento memento)
        {
            ShowFlag();
            Log($"저장 · HP {memento.Hp} 칸 {memento.Cell} 크레딧 {memento.Credits} 인벤토리 {memento.Items.Count}개 (새 목록에 복사)");
            RefreshStatus();
        }

        void OnWalked(int cell)
        {
            ShowExplorer();
            Log($"한 칸 이동 → 칸 {cell}");
            RefreshStatus();
        }

        void OnPickedUp(string item, int gained)
        {
            Log($"{item} 주움 (+{gained}) → 인벤토리 {Explorer.Items.Count}개 크레딧 {Explorer.Credits}");
            RefreshStatus();
        }

        void OnHurt(int amount)
        {
            Log($"피해 {amount} → HP {Explorer.Hp}");
            RefreshStatus();
        }

        void OnDowned()
        {
            ShowExplorer();
            Log("쓰러짐 (HP 0)");
            RefreshStatus();
        }

        void OnRestored()
        {
            ShowExplorer(); // [3] 덮인 값(칸, 쓰러짐)으로 하린을 다시 그린다
            Log($"되살림 · HP {Explorer.Hp} 칸 {Explorer.Cell} 크레딧 {Explorer.Credits} 인벤토리 {Explorer.Items.Count}개");
            RefreshStatus();
        }

        void OnInputIgnored(string input)
        {
            if (!Explorer.IsDown) Log("끝 칸이라 더 가지 않음");
            else Log($"쓰러져 있어 받지 않음 ({(input == "walk" ? "이동" : input == "pickup" ? "줍기" : "피해")})");
        }

        void OnSaveRefused() => Log("쓰러져 있어 저장하지 않음");
        void OnNothingToRestore() => Log("되살릴 저장본이 없다");

        Vector3 CellPosition(int cell)
        {
            Vector3 origin = firstCell != null ? firstCell.position : transform.position;
            return origin + Vector3.right * cellSize * cell;
        }

        /// <summary>하린을 지금 칸에 세우고, 쓰러졌으면 옆으로 눕힌다</summary>
        void ShowExplorer()
        {
            if (explorerView == null) return;
            explorerView.position = CellPosition(Explorer.Cell);
            explorerView.rotation = Explorer.IsDown ? Quaternion.Euler(0f, 0f, 90f) : Quaternion.identity;
        }

        /// <summary>깃발을 저장한 칸 왼쪽에 세운다. 저장 전에는 꺼 둔다</summary>
        void ShowFlag()
        {
            if (checkpointFlag == null) return;
            ExplorerMemento memento = Checkpoint.Memento;
            checkpointFlag.gameObject.SetActive(memento != null);
            if (memento != null) checkpointFlag.position = CellPosition(memento.Cell) + Vector3.left * cellSize * 0.4f;
        }

        void ShowAll()
        {
            ShowExplorer();
            ShowFlag();
            RefreshStatus();
        }

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[Checkpoint] {message}", this);
        }

        /// <summary>왼쪽 위 상태 글. 이벤트를 받을 때 바로 만든다 (OnGUI 는 그리기만)</summary>
        void RefreshStatus()
        {
            string now = $"하린 HP {Explorer.Hp}/{Explorer.MaxHp} · 칸 {Explorer.Cell} · 크레딧 {Explorer.Credits} · 인벤토리 {Explorer.Items.Count}개{(Explorer.IsDown ? " · 쓰러짐" : "")}";
            ExplorerMemento m = Checkpoint.Memento;
            string saved = m == null ? "저장본: 없음" : $"저장본: HP {m.Hp} · 칸 {m.Cell} · 크레딧 {m.Credits} · 인벤토리 {m.Items.Count}개";
            statusText = now + "\n" + saved;
        }

        void OnGUI()
        {
            if (!showStatusOnScreen) return;
            GUI.Label(new Rect(12f, 12f, 640f, 48f), statusText);
        }
    }
}
