// 드론 한 대의 화면: 코어 Drone 과 짝을 이뤄 종류 색, HP 막대, 최대 HP 막대를 그린다. 규칙은 모른다.
// 이 컴포넌트가 붙은 오브젝트를 프리팹으로 만들어 SquadInput 의 Drone Prefab 칸에 넣는다.
using UnityEngine;

namespace PatternGallery.FlyweightDroneTypes
{
    public class DroneView : MonoBehaviour
    {
        [Tooltip("드론 몸체의 Renderer (Square 의 SpriteRenderer 나 Cube 의 MeshRenderer). 종류 색을 칠한다")]
        [SerializeField] Renderer body;
        [Tooltip("x 크기로 지금 HP 를 보이는 Transform. 왼쪽 끝에 둔 빈 부모를 넣으면 왼쪽을 기준으로 줄어든다")]
        [SerializeField] Transform hpFill;
        [Tooltip("x 크기로 최대 HP 를 보이는 뒤 막대 (비워도 된다). 밸런스 수정이 같은 종류 모두에서 함께 늘어나는 것이 보인다")]
        [SerializeField] Transform hpMax;
        [Tooltip("위아래로 떠 있는 폭. 흔들리는 빠르기는 종류의 속도(Type.Speed)에서 읽는다. 화면 연출만 바꾼다")]
        [SerializeField] float hover = 0.1f;

        public Drone Drone { get; private set; }
        Vector3 basePosition;

        void Reset()
        {
            body = GetComponent<Renderer>();
        }

        /// <summary>코어 드론과 짝짓고 지금 값으로 그린다. 자리는 부르기 전에 정해 둔다</summary>
        public void Bind(Drone drone, float barFullHp)
        {
            Drone = drone;
            gameObject.name = $"Drone {drone.Name}";
            basePosition = transform.localPosition;
            if (body != null && ColorUtility.TryParseHtmlString(drone.Type.ColorHex, out Color c))
            {
                if (body is SpriteRenderer sprite) sprite.color = c;
                else body.material.color = c; // material 은 드론마다 사본이다. sharedMaterial 을 고치면 머티리얼 에셋째 바뀐다 (나쁜 예와 같은 공유 에셋 변경)
            }
            ShowHp(barFullHp);
        }

        /// <summary>지금 HP 와 최대 HP 를 막대로 그린다. 꽉 찬 값은 종류의 최대 HP 가 아니라 고정 기준(barFullHp)이다</summary>
        public void ShowHp(float barFullHp)
        {
            if (Drone == null || barFullHp <= 0f) return;
            SetWidth(hpFill, Drone.Hp / barFullHp);
            SetWidth(hpMax, Drone.Type.MaxHp / barFullHp); // 종류 객체에서 읽는다: 밸런스 수정이 같은 종류 모두에 같은 값으로 보인다
        }

        static void SetWidth(Transform bar, float ratio)
        {
            if (bar == null) return;
            Vector3 s = bar.localScale;
            s.x = Mathf.Clamp01(ratio);
            bar.localScale = s;
        }

        void Update()
        {
            if (Drone == null) return;
            // 매 프레임 바뀌는 연출만 여기서 한다. 속도는 공유하는 종류 객체에서 읽는다
            transform.localPosition = basePosition + Vector3.up * (Mathf.Sin(Time.time * Drone.Type.Speed * 2f) * hover);
        }
    }
}
