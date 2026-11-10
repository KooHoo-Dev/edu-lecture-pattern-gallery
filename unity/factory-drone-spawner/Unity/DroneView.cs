// 드론 한 대의 화면: HP 바. 코어 Drone 의 이벤트를 듣고 HP 바를 고치고, 파괴되면 자기 오브젝트를 지운다. 규칙은 모른다.
// 이 컴포넌트가 붙은 오브젝트를 종류마다 프리팹으로 만들어 WaveSpawnerInput 의 Spawner Slots 칸에 넣는다. new 로 만들지 않는다 (MonoBehaviour).
// OnEnable 에서 지금 HP 로 바를 다시 맞춘다 (꺼져 있던 동안 받은 피해는 이벤트로 오지 않는다).
using UnityEngine;

namespace PatternGallery.FactoryDroneSpawner
{
    public class DroneView : MonoBehaviour
    {
        [Tooltip("x 크기로 HP 비율을 보이는 Transform. 왼쪽 끝에 둔 빈 부모를 넣으면 왼쪽을 기준으로 줄어든다")]
        [SerializeField] Transform hpFill;
        [Tooltip("HP 바가 꽉 찼을 때의 HP (고정). 드론마다 MaxHp 로 나누면 HP 1 정찰과 HP 3 중장갑이 같은 길이로 보인다")]
        [SerializeField] int fullHp = 5;

        Drone drone;
        bool subscribed;

        /// <summary>Instantiate 직후 연결 컴포넌트가 부른다. 이 뷰가 보일 코어 드론을 정한다</summary>
        public void Bind(Drone target)
        {
            Unsubscribe();
            drone = target;
            gameObject.name = $"Drone {target.Name}";
            if (isActiveAndEnabled) Subscribe();
            ShowHp();
        }

        void OnEnable()
        {
            // 꺼져 있던 동안 파괴된 드론이면 Destroyed 를 못 들었으니 여기서 지운다
            if (drone != null && !drone.IsAlive)
            {
                Destroy(gameObject);
                return;
            }
            Subscribe();
            ShowHp();
        }

        void OnDisable() => Unsubscribe();

        void Subscribe()
        {
            if (drone == null || subscribed) return;
            drone.Damaged += OnDamaged;
            drone.Destroyed += OnDestroyed;
            subscribed = true;
        }

        void Unsubscribe()
        {
            if (drone == null || !subscribed) return;
            drone.Damaged -= OnDamaged;
            drone.Destroyed -= OnDestroyed;
            subscribed = false;
        }

        void OnDamaged(Drone d, int amount) => ShowHp();

        void OnDestroyed(Drone d) => Destroy(gameObject); // 프레임 끝에 지워지며 OnDisable 이 구독을 뗀다

        void ShowHp()
        {
            if (hpFill == null || drone == null) return;
            Vector3 s = hpFill.localScale;
            s.x = Mathf.Clamp01((float)drone.Hp / Mathf.Max(1, fullHp));
            hpFill.localScale = s;
        }
    }
}
