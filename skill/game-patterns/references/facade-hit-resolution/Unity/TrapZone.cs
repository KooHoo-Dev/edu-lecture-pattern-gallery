// 땅의 함정: 웹 무대와 같게 키로 터뜨린다. 코어 Trap 이 함정 자리(D1)에 선 드론을 골라 창구에 한 줄로 넘긴다.
// 물리 트리거를 쓰지 않으므로 Collider 가 없어도 된다. setup 대로 빈 CombatHub 오브젝트에 붙인다 (함정 자리는 코어의 TrapSlot 이 정해서 이 오브젝트의 위치와 상관없다).
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.FacadeHitResolution
{
    public class TrapZone : MonoBehaviour
    {
        [Tooltip("명중 처리 창구. 씬의 CombatHub 오브젝트를 끌어 넣는다")]
        [SerializeField] CombatHub hub;
        [Tooltip("함정의 기본 피해. 방어력은 창구가 뺀다")]
        [SerializeField] int trapDamage = 5;
        [Tooltip("컴포넌트를 붙일 때 Reset 이 W 를 넣는다")]
        [SerializeField] InputAction triggerAction;

        Trap trap;

        /// <summary>처음 터질 때 만든다. Hub 칸이 채워져 있어야 한다</summary>
        Trap TrapCore => trap ??= new Trap(hub.Combat, hub.Field) { Damage = trapDamage };

        void Reset()
        {
            triggerAction = new InputAction("Trap", InputActionType.Button, "<Keyboard>/w");
        }

        void OnEnable()
        {
            if (hub == null)
            {
                Debug.LogError("[Trap] Hub 칸이 비어 있다. 씬의 CombatHub 오브젝트를 넣는다", this);
                enabled = false;
                return;
            }
            triggerAction.performed += OnTrigger;
            triggerAction.Enable();
        }

        void OnDisable()
        {
            triggerAction.performed -= OnTrigger;
            triggerAction.Disable();
        }

        void OnValidate()
        {
            if (trap != null) trap.Damage = trapDamage;
        }

        void OnTrigger(InputAction.CallbackContext _) => TrapCore.Trigger(); // [1] 창구에 한 줄
    }
}
