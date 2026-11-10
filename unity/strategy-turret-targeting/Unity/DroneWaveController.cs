// 드론 웨이브 연결 컴포넌트: 코어 DroneWave 하나를 만들어 시간을 흘리고, 코어 드론을 드론 오브젝트로 보인다.
// 씬에 하나만 두고 포탑(TurretController) 여러 대가 이 웨이브를 나눠 쓴다. 포탑마다 웨이브를 만들면 드론도 두 벌이 된다.
using System.Collections.Generic;
using UnityEngine;

namespace PatternGallery.StrategyTurretTargeting
{
    // 포탑보다 먼저 Update 가 돌아야 포탑이 이번 프레임의 드론 위치로 대상을 고른다
    [DefaultExecutionOrder(-100)]
    public class DroneWaveController : MonoBehaviour
    {
        [Tooltip("드론 하나의 모양. 코어 드론이 나올 때마다 하나씩 만들고, 파괴되거나 기지에 닿으면 지운다")]
        [SerializeField] GameObject dronePrefab;
        [Tooltip("드론이 모두 사라지면 표를 처음부터 다시 낸다")]
        [SerializeField] bool loopWave = true;
        [SerializeField] bool logEvents = true;

        DroneWave wave;
        /// <summary>코어 드론 ↔ 화면의 드론 오브젝트</summary>
        readonly Dictionary<Drone, Transform> views = new Dictionary<Drone, Transform>();

        /// <summary>처음 읽을 때 만든다. 포탑의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게</summary>
        public DroneWave Wave => wave ??= new DroneWave(DroneWave.CreateDefaultTable());

        /// <summary>코어 좌표 → 월드 위치. 이 오브젝트 자리가 코어 x = 0 (드론이 나오는 왼쪽 끝)이다. 높이(Altitude)는 화면에만 쓴다</summary>
        public Vector3 ToWorld(Drone d) => transform.position + new Vector3(d.X, d.Altitude, 0f);

        /// <summary>월드 위치 → 코어 x (가로 거리만 잰다)</summary>
        public float ToCoreX(Vector3 world) => world.x - transform.position.x;

        void OnEnable()
        {
            Wave.DroneSpawned += OnDroneSpawned;
            Wave.DroneReachedBase += OnDroneReachedBase;
        }

        void OnDisable()
        {
            Wave.DroneSpawned -= OnDroneSpawned;
            Wave.DroneReachedBase -= OnDroneReachedBase;
        }

        void Update()
        {
            Wave.Tick(Time.deltaTime);
            // 원리를 보이려고 transform 을 직접 옮긴다 (위치는 매 프레임 바뀌는 값이라 Update 에서 옮긴다)
            foreach (KeyValuePair<Drone, Transform> pair in views) pair.Value.position = ToWorld(pair.Key);
            if (loopWave && Wave.Finished) Wave.Restart();
        }

        /// <summary>포탑이 드론을 파괴했을 때 부른다 (코어 웨이브는 이미 목록에서 뺐다)</summary>
        public void RemoveView(Drone d)
        {
            if (!views.TryGetValue(d, out Transform view)) return;
            views.Remove(d);
            if (view != null) Destroy(view.gameObject);
        }

        void OnDroneSpawned(Drone d)
        {
            if (dronePrefab != null)
            {
                GameObject go = Instantiate(dronePrefab, ToWorld(d), Quaternion.identity);
                go.name = d.Name;
                views[d] = go.transform;
            }
            Log($"{d.Name} 등장 (HP {d.Hp})");
        }

        void OnDroneReachedBase(Drone d)
        {
            RemoveView(d);
            Log($"{d.Name} 기지 도달 (HP {d.Hp} 남음)");
        }

        void Log(string message)
        {
            if (logEvents) Debug.Log($"[Wave] {message}", this);
        }
    }
}
