// 드론 화면 오브젝트: 코어 Drone 의 자리를 매 프레임 따라가기만 하고, 탐지에 걸렸는지를 색과 크기로 보인다. 자리를 스스로 정하지 않는다.
// 드론 프리팹에 붙인다. TurretScanner 가 자기 자식으로 만들어 Bind 하므로, 로컬 좌표 (X, Y) 가 곧 구역 안의 자리다.
using UnityEngine;

namespace PatternGallery.SpatialGridDetection
{
    public class DroneView : MonoBehaviour
    {
        [SerializeField] Color normalColor = new Color(1f, 0.42f, 0.42f);
        [SerializeField] Color foundColor = new Color(0.49f, 0.88f, 0.51f);
        [Tooltip("탐지에 걸리면 이만큼 키운다 (색만으로 알리지 않게)")]
        [SerializeField] float foundScale = 1.4f;

        Drone drone;
        Renderer body;
        Vector3 baseScale;
        bool found;
        MaterialPropertyBlock block;

        public Drone Drone => drone;

        void Awake()
        {
            body = GetComponentInChildren<Renderer>();
            baseScale = transform.localScale;
        }

        public void Bind(Drone d)
        {
            drone = d;
            name = $"Drone {d.Name}";
            Follow();
            Apply();
        }

        public void SetFound(bool on)
        {
            found = on;
            Apply(); // [4] 탐지 결과를 받은 그 자리에서 바로 바꾼다
        }

        // 위치는 코어가 정한다. 화면은 TurretScanner.Update 의 Tick 뒤에 따라만 간다
        void LateUpdate() => Follow();

        void Follow()
        {
            if (drone != null) transform.localPosition = new Vector3(drone.X, drone.Y, 0f);
        }

        /// <summary>스프라이트면 SpriteRenderer.color, 아니면 MaterialPropertyBlock 으로 _BaseColor(URP Lit)와 _Color(Built-in) 에 넣는다.
        /// body.material 을 쓰면 드론마다 머티리얼 사본이 생기고, 드론을 Destroy 해도 사본은 남는다</summary>
        void Apply()
        {
            transform.localScale = found ? baseScale * foundScale : baseScale;
            Color c = found ? foundColor : normalColor;
            if (body is SpriteRenderer sprite)
            {
                sprite.color = c;
                return;
            }
            if (body == null) return;
            block ??= new MaterialPropertyBlock();
            body.GetPropertyBlock(block);
            block.SetColor("_BaseColor", c);
            block.SetColor("_Color", c);
            body.SetPropertyBlock(block);
        }
    }
}
