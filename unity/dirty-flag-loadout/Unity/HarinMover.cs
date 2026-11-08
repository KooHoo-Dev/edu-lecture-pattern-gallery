// 하린 이동 연결 컴포넌트: 매 프레임 Loadout.Speed 를 읽어 좌우로 걷는다.
// 읽기는 매 프레임이지만 무게 계산은 장비가 바뀐 뒤 처음 읽을 때 한 번뿐이다 (더티 플래그). 그 계산이 LoadoutInput 의 무게 글도 고친다.
using UnityEngine;

namespace PatternGallery.DirtyFlagLoadout
{
    [RequireComponent(typeof(LoadoutInput))]
    public class HarinMover : MonoBehaviour
    {
        [Tooltip("속도를 읽을 장비 칸. 같은 오브젝트에 붙이면 Reset 이 채운다")]
        [SerializeField] LoadoutInput loadoutInput;
        [Tooltip("걷는 구간 (월드 x). 화면 연출만, 무게 규칙과 상관없다")]
        [SerializeField] float leftX = -6f;
        [SerializeField] float rightX = 6f;

        float dir = 1f;

        void Reset()
        {
            loadoutInput = GetComponent<LoadoutInput>();
        }

        void Update()
        {
            float speed = loadoutInput.Loadout.Speed; // [4] 매 프레임 읽는다. 바뀌지 않았으면 캐시를 그대로 쓴다
            Vector3 p = transform.position;
            p.x += dir * speed * Time.deltaTime;
            if (p.x >= rightX)
            {
                p.x = rightX;
                dir = -1f;
            }
            else if (p.x <= leftX)
            {
                p.x = leftX;
                dir = 1f;
            }
            transform.position = p;
        }
    }
}
