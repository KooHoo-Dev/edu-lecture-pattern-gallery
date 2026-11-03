// 나쁜 예: 스포너 하나가 SpawnDrone(string type) 의 if 사슬로 드론을 만들고, 분기마다 배치·레이더 등록·알림 줄을 복붙한 흔한 코드.
// 처음에는 정찰과 중장갑 둘뿐이었고, 방패는 나중에 types 배열에 넣고 정찰 분기를 복사해 더했다.
// 실제로는 MonoBehaviour 안의 코드다 (분기마다 Instantiate(scoutPrefab, …) 와 GetComponent 가 있다).
// 여기서는 Unity 없이 돌리려고 순수 C# 로 두었고, 드론·출구·레이더는 코어의 것을 그대로 쓴다. 프로젝트에 넣지 않는다.
using System;

namespace PatternGallery.FactoryDroneSpawner.Naive
{
    public sealed class NaiveWaveSpawner
    {
        public int heavyHp = 3;
        public int shieldHp = 2;

        // 섞인 순서에 쓰는 종류. 방패를 더하며 배열에는 넣었다
        public readonly string[] types = { "scout", "heavy", "shield" };
        public int count;

        readonly Exit exit;
        readonly Radar radar;

        /// <summary>드론 하나를 내보냈다</summary>
        public event Action<Drone> Spawned;

        public NaiveWaveSpawner(Exit exit, Radar radar)
        {
            this.exit = exit;
            this.radar = radar;
        }

        /// <summary>섞인 순서의 다음 종류 하나</summary>
        public Drone SpawnNext()
        {
            string type = types[count % 2]; // [!] 종류가 둘이던 때의 2 를 그대로 두었다. 0, 1 만 나와 방패 차례에 정찰이 나온다
            count++;
            return SpawnDrone(type);
        }

        public Drone SpawnDrone(string type)
        {
            if (type == "scout")
            {
                Drone drone = new ScoutDrone();
                exit.Place(drone);
                radar.Register(drone);
                Spawned?.Invoke(drone);
                return drone;
            }
            else if (type == "heavy")
            {
                Drone drone = new HeavyDrone(heavyHp);
                exit.Place(drone);
                radar.Register(drone);
                Spawned?.Invoke(drone);
                return drone;
            }
            else if (type == "shield")
            {
                Drone drone = new ShieldDrone(shieldHp);
                exit.Place(drone); // [!] 정찰 분기를 복사하다 다음 줄 radar.Register(drone) 를 빠뜨렸다. 레이더가 방패를 세지 않는다
                Spawned?.Invoke(drone);
                return drone;
            }
            return null;
        }
    }
}
