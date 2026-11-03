// 정비 드론의 전기 충격: 키를 누르면 코어 ShockDrone 이 중장갑 D3 을 노려 창구에 한 줄로 넘긴다.
// 방어력을 빼는 규칙은 창구의 피해 계산에 있으므로 이 파일은 방어력을 모른다.
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.FacadeHitResolution
{
    public class ShockDroneInput : MonoBehaviour
    {
        [Tooltip("명중 처리 창구. 씬의 CombatHub 오브젝트를 끌어 넣는다")]
        [SerializeField] CombatHub hub;
        [Tooltip("전기 충격의 기본 피해. 중장갑의 방어력은 창구가 뺀다")]
        [SerializeField] int shockDamage = 6;
        [Tooltip("컴포넌트를 붙일 때 Reset 이 E 를 넣는다")]
        [SerializeField] InputAction zapAction;

        ShockDrone shock;

        /// <summary>처음 쏠 때 만든다. Hub 칸이 채워져 있어야 한다</summary>
        ShockDrone ShockCore => shock ??= new ShockDrone(hub.Combat, hub.Field) { Damage = shockDamage };

        void Reset()
        {
            zapAction = new InputAction("Shock", InputActionType.Button, "<Keyboard>/e");
        }

        void OnEnable()
        {
            if (hub == null)
            {
                Debug.LogError("[Shock] Hub 칸이 비어 있다. 씬의 CombatHub 오브젝트를 넣는다", this);
                enabled = false;
                return;
            }
            zapAction.performed += OnZap;
            zapAction.Enable();
        }

        void OnDisable()
        {
            zapAction.performed -= OnZap;
            zapAction.Disable();
        }

        void OnValidate()
        {
            if (shock != null) shock.Damage = shockDamage;
        }

        void OnZap(InputAction.CallbackContext _) => ShockCore.Zap(); // [1] 창구에 한 줄
    }
}
