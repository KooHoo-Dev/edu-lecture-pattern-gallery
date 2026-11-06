// 드론 오브젝트 (잎): Play 할 때의 위치를 기지 자리로 삼아 코어 Drone 을 만들고, 매 프레임 코어가 정한 위치로 옮긴다.
// 명령을 직접 받지 않는다. 명령은 본대에서 편대를 거쳐 코어 Drone 까지 내려온다.
using UnityEngine;

namespace PatternGallery.CompositeDroneSquads
{
    public class DroneUnit : MonoBehaviour, IUnitNode
    {
        [Tooltip("정찰 지점이 기지 자리보다 얼마나 높은가 (m)")]
        [SerializeField] float patrolHeight = 2f;
        [Tooltip("본대의 Patrol Distance 보다 더 멀리 가는 거리 (m). 멀리 정찰하는 지원 편대 C 의 드론에 준다")]
        [SerializeField] float extraReach = 0f;
        [Tooltip("켜면 Play 하자마자 정찰 지점(기지 자리 + Patrol Distance + Extra Reach, 위로 Patrol Height)에 있다. 지원 편대 C 의 드론에 켠다")]
        [SerializeField] bool startOnPatrol = false;

        Drone drone;

        /// <summary>SquadNode 가 트리를 만들기 전에는 null</summary>
        public Drone Drone => drone;

        public IUnit Build(FlightSettings settings)
        {
            if (drone != null) return drone;
            Vector3 p = transform.position; // 지금 월드 위치가 기지 자리다
            drone = new Drone(name, p.x, p.y, patrolHeight, extraReach, startOnPatrol, settings);
            return drone;
        }

        void Update()
        {
            if (drone == null) return; // 이 드론을 넣은 편대가 아직 트리를 만들지 않았다
            // 월드 위치를 넣으므로 합류로 부모가 바뀌어도 위치가 튀지 않는다. 원리를 보이려고 transform 을 직접 옮긴다
            transform.position = new Vector3(drone.X, drone.Y, transform.position.z); // [4] 실제로 움직이는 것은 잎뿐이다
        }
    }
}
