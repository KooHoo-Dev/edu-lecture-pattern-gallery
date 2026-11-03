// 체력 바 UI: 켜질 때 구독하고 꺼지거나 파괴될 때 해제한다. 코어(HealthBar)가 알리면 그 자리에서 Image 를 고친다.
using UnityEngine;
using UnityEngine.UI;

namespace PatternGallery.ObserverHealthEvents
{
    public class HealthBarUI : MonoBehaviour
    {
        [SerializeField] PlayerHealth target;
        [Tooltip("Source Image 에 스프라이트를 넣고 Image Type 을 Filled, Fill Method 를 Horizontal 로 둔 Image")]
        [SerializeField] Image fill;
        [SerializeField] float lowHealthRatio = 0.3f;
        [SerializeField] Color normalColor = new Color(0.36f, 0.78f, 1f);
        [SerializeField] Color warningColor = new Color(1f, 0.36f, 0.42f);

        readonly HealthBar bar = new HealthBar();

        void OnEnable()
        {
            bar.LowRatio = lowHealthRatio;
            bar.Updated += Apply;
            bar.Bind(target.Health); // [4] 켜질 때 구독하고 지금 값으로 맞춘다
        }

        void OnDisable()
        {
            bar.Unbind(); // [4] 꺼지거나 파괴될 때 해제한다. 빼먹으면 파괴된 Image 를 건드려 MissingReferenceException
            bar.Updated -= Apply;
        }

        void Apply(float value, bool warning)
        {
            fill.fillAmount = value;
            fill.color = warning ? warningColor : normalColor;
        }
    }
}
