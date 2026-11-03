// 하린의 총: 키를 누르면 코어 Gun 이 맨 앞 드론을 골라 창구에 한 줄로 넘긴다. 피해 계산도, HP 도, 파괴도 모른다.
// 창구는 Hub 칸으로 받는다 (싱글턴이 아니다).
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.FacadeHitResolution
{
    public class GunInput : MonoBehaviour
    {
        [Tooltip("명중 처리 창구. 씬의 CombatHub 오브젝트를 끌어 넣는다")]
        [SerializeField] CombatHub hub;
        [Tooltip("한 발의 기본 피해. 방어력은 창구가 뺀다")]
        [SerializeField] int gunDamage = 4;
        [Tooltip("컴포넌트를 붙일 때 Reset 이 Q 를 넣는다")]
        [SerializeField] InputAction fireAction;

        Gun gun;

        /// <summary>처음 쏠 때 만든다. Hub 칸이 채워져 있어야 한다</summary>
        Gun GunCore => gun ??= new Gun(hub.Combat, hub.Field) { Damage = gunDamage };

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다
            fireAction = new InputAction("Fire", InputActionType.Button, "<Keyboard>/q");
        }

        void OnEnable()
        {
            if (hub == null)
            {
                Debug.LogError("[Gun] Hub 칸이 비어 있다. 씬의 CombatHub 오브젝트를 넣는다", this);
                enabled = false;
                return;
            }
            fireAction.performed += OnFire;
            fireAction.Enable();
        }

        void OnDisable()
        {
            // OnEnable 에서 일찍 돌아갔다면 붙인 것이 없다 (떼기와 Disable 은 그래도 안전하다)
            fireAction.performed -= OnFire;
            fireAction.Disable();
        }

        void OnValidate()
        {
            if (gun != null) gun.Damage = gunDamage;
        }

        void OnFire(InputAction.CallbackContext _) => GunCore.Fire(); // [1] 창구에 한 줄
    }
}
