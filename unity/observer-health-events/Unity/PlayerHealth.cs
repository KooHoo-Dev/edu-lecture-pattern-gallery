// 플레이어 체력 컴포넌트: 코어 Health 를 들고 있고, 누가 듣는지 모른다. 시연용 피해·회복 키도 여기 있다.
// 구독자들은 이 컴포넌트의 Health 에 스스로 붙는다. 이 파일은 체력 바나 소리를 모른다.
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.ObserverHealthEvents
{
    public class PlayerHealth : MonoBehaviour
    {
        [SerializeField] int maxHealth = 100;
        [Header("시연용 입력 (실제 게임에서는 적의 공격 판정이 Damage 를 부른다)")]
        [SerializeField] int damage = 20;
        [SerializeField] int healAmount = 15;
        [SerializeField] InputAction damageAction;
        [SerializeField] InputAction healAction;

        Health health;

        /// <summary>
        /// 처음 읽을 때 만든다. 다른 오브젝트의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게.
        /// </summary>
        public Health Health => health ??= new Health(maxHealth);

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다
            damageAction = new InputAction("Damage", InputActionType.Button, "<Keyboard>/k");
            healAction = new InputAction("Heal", InputActionType.Button, "<Keyboard>/h");
        }

        void OnEnable()
        {
            damageAction.performed += OnDamage;
            healAction.performed += OnHeal;
            damageAction.Enable();
            healAction.Enable();
        }

        void OnDisable()
        {
            damageAction.performed -= OnDamage;
            healAction.performed -= OnHeal;
            damageAction.Disable();
            healAction.Disable();
        }

        void OnDamage(InputAction.CallbackContext _) => Health.Damage(damage); // [1]
        void OnHeal(InputAction.CallbackContext _) => Health.Heal(healAmount);
    }
}
