// 씬 전환·줍기·정산 입력: 두 씬에 하나씩 놓는다 (씬과 함께 사라지고 다시 생긴다).
// 매니저는 Instance 로 부르되, 씬 종속 매니저(ExpeditionManager)는 자리가 비어 있으면 부르지 않는다.
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;

namespace PatternGallery.SingletonSceneManagers
{
    public class ExpeditionInput : MonoBehaviour
    {
        [Tooltip("File > Build Profiles 의 Scene List 에 넣은 씬 이름")]
        [SerializeField] string baseScene = "Base";
        [SerializeField] string fieldScene = "Field";
        [SerializeField] InputAction toBaseAction;
        [SerializeField] InputAction toFieldAction;
        [SerializeField] InputAction pickupAction;
        [SerializeField] InputAction settleAction;

        readonly Settlement settlement = new Settlement();

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다
            toBaseAction = new InputAction("ToBase", InputActionType.Button, "<Keyboard>/b");
            toFieldAction = new InputAction("ToField", InputActionType.Button, "<Keyboard>/e");
            pickupAction = new InputAction("Pickup", InputActionType.Button, "<Keyboard>/g");
            settleAction = new InputAction("Settle", InputActionType.Button, "<Keyboard>/c");
        }

        void OnEnable()
        {
            settlement.Settled += OnSettled;
            settlement.Refused += OnRefused;
            toBaseAction.performed += OnToBase;
            toFieldAction.performed += OnToField;
            pickupAction.performed += OnPickup;
            settleAction.performed += OnSettle;
            toBaseAction.Enable();
            toFieldAction.Enable();
            pickupAction.Enable();
            settleAction.Enable();
        }

        void OnDisable()
        {
            settlement.Settled -= OnSettled;
            settlement.Refused -= OnRefused;
            toBaseAction.performed -= OnToBase;
            toFieldAction.performed -= OnToField;
            pickupAction.performed -= OnPickup;
            settleAction.performed -= OnSettle;
            toBaseAction.Disable();
            toFieldAction.Disable();
            pickupAction.Disable();
            settleAction.Disable();
        }

        // Single 모드 LoadScene 은 다음 프레임에 지금 씬을 내리고 새 씬을 연다. 기지에서 기지를 부르면 기지 씬을 다시 연다
        void OnToBase(InputAction.CallbackContext _) => SceneManager.LoadScene(baseScene);
        void OnToField(InputAction.CallbackContext _) => SceneManager.LoadScene(fieldScene);

        void OnPickup(InputAction.CallbackContext _)
        {
            ExpeditionManager expedition = ExpeditionManager.Instance;
            if (expedition == null) // [4] 자리가 비어 있으면(탐사 구역이 아니면) 부르지 않는다
            {
                Debug.Log("[줍기] 기지에는 회로 조각이 없다", this);
                return;
            }
            expedition.Expedition.Pickup();
        }

        void OnSettle(InputAction.CallbackContext _)
        {
            ExpeditionManager expedition = ExpeditionManager.Instance; // [4] 탐사 구역 밖이면 null (OnDestroy 에서 자리를 비웠다)
            CreditBank bank = CreditBank.Instance;
            settlement.Settle(expedition != null ? expedition.Expedition : null, bank != null ? bank.Credits : null); // [4]
        }

        void OnSettled(int fragments, int credits) => Debug.Log($"[정산] 회로 조각 {fragments}개 → {credits} 크레딧", this);
        void OnRefused(string reason) => Debug.Log($"[정산] 받지 않음: {reason}", this);
    }
}
