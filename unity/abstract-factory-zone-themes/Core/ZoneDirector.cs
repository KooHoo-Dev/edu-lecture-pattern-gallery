// 구역 지휘 (추상 팩토리의 클라이언트): 지금 공장 하나만 들고 바닥과 드론을 그 공장에 만들게 한다.
// 어느 구역인지 이름으로 가르는 분기가 없다. 구역을 옮기면 공장 객체를 통째로 갈아 끼우고, 이미 나온 드론은 남는다. UnityEngine 을 쓰지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.AbstractFactoryZoneThemes
{
    /// <summary>규칙 값. ZoneDirectorInput 이 Inspector 값으로 채워 넘기고, Play 중 값을 바꾸면 OnValidate 가 다시 넣는다</summary>
    public sealed class ZoneSettings
    {
        /// <summary>출구 앞에 설 수 있는 드론 수</summary>
        public int MaxDrones = 4;
        /// <summary>투사체가 왼쪽으로 나는 빠르기 (m/s)</summary>
        public float ProjectileSpeed = 6f;
        /// <summary>0번 자리(출구에 가장 가까운 자리)의 가로 위치</summary>
        public float FirstSlotX = 12.8f;
        /// <summary>자리 사이 간격. 자리 번호가 하나 늘 때마다 왼쪽(하린 쪽)으로 이만큼</summary>
        public float SlotSpacing = 1.6f;
        /// <summary>투사체가 이 위치에 닿으면 사라진다 (하린 앞)</summary>
        public float VanishX = 3f;
    }

    public sealed class ZoneDirector
    {
        readonly List<Drone> drones = new List<Drone>();
        readonly List<Projectile> projectiles = new List<Projectile>();

        public readonly ZoneSettings Settings;
        /// <summary>지금 구역의 공장. 다음에 만드는 바닥과 드론은 이 공장 것이다</summary>
        public IZoneFactory Factory { get; private set; }
        public Ground Ground { get; private set; }
        /// <summary>출구 앞에 선 드론 (나온 순서). 구역을 옮겨도 남는다</summary>
        public IReadOnlyList<Drone> Drones => drones;
        /// <summary>날고 있는 투사체</summary>
        public IReadOnlyList<Projectile> Projectiles => projectiles;

        /// <summary>구역에 들어갔다 (새 공장, 그 공장이 만든 바닥)</summary>
        public event Action<IZoneFactory, Ground> ZoneEntered;
        /// <summary>드론 하나가 출구 앞 자리에 섰다</summary>
        public event Action<Drone> DroneSpawned;
        /// <summary>자리가 모두 차서 만들지 않았다 (자리 수)</summary>
        public event Action<int> SpawnRejected;
        /// <summary>드론 하나가 쐈다 (쏜 드론, 투사체)</summary>
        public event Action<Drone, Projectile> ProjectileFired;
        /// <summary>투사체가 하린 앞에 닿아 사라졌다</summary>
        public event Action<Projectile> ProjectileVanished;

        /// <summary>시작 구역의 공장으로 바로 들어간다 (이때는 구독한 쪽이 없어 ZoneEntered 를 듣지 못한다. 어댑터는 Ground 를 읽어 맞춘다)</summary>
        public ZoneDirector(IZoneFactory start, ZoneSettings settings)
        {
            Settings = settings;
            Enter(start);
        }

        /// <summary>구역을 옮긴다. 어떤 공장을 넘길지는 조립하는 곳(어댑터)이 고른다</summary>
        public void Enter(IZoneFactory next)
        {
            if (next == null) throw new ArgumentNullException(nameof(next));
            Factory = next; // [1] 공장 객체를 통째로 갈아 끼운다. 이미 나온 드론은 그대로 남는다
            Ground = next.CreateGround(); // [1] 바닥도 새 공장이 만든다
            ZoneEntered?.Invoke(next, Ground);
        }

        /// <summary>지금 공장으로 드론 하나. 자리가 차면 null 을 돌려주고 SpawnRejected 를 알린다</summary>
        public Drone Spawn()
        {
            if (drones.Count >= Settings.MaxDrones)
            {
                SpawnRejected?.Invoke(Settings.MaxDrones);
                return null;
            }
            IZoneFactory maker = Factory;
            Drone drone = maker.CreateDrone(); // [2] 무슨 드론인지는 지금 공장이 정한다
            drone.Remember(maker); // [2] 만든 공장을 드론에 쥐여 준다
            drone.Number = drones.Count + 1;
            drone.Slot = drones.Count;
            drone.X = Settings.FirstSlotX - drone.Slot * Settings.SlotSpacing;
            drones.Add(drone);
            DroneSpawned?.Invoke(drone);
            return drone;
        }

        /// <summary>출구 앞의 드론이 모두 한 발씩. 투사체는 드론이 자기 공장에 만들게 한다</summary>
        public void FireAll()
        {
            // 알림을 받은 쪽이 Spawn 을 불러도 목록이 바뀌지 않게 복사해 돈다
            foreach (Drone drone in drones.ToArray())
            {
                Projectile projectile = drone.Fire(); // [3] 지휘자는 구역을 묻지 않는다
                projectiles.Add(projectile);
                ProjectileFired?.Invoke(drone, projectile);
            }
        }

        /// <summary>매 프레임 (MonoBehaviour.Update 의 Time.deltaTime). 투사체를 왼쪽으로 옮기고 하린 앞에 닿으면 지운다</summary>
        public void Tick(float dt)
        {
            int i = 0;
            while (i < projectiles.Count)
            {
                Projectile p = projectiles[i];
                p.X -= Settings.ProjectileSpeed * dt;
                if (p.X <= Settings.VanishX)
                {
                    projectiles.RemoveAt(i);
                    ProjectileVanished?.Invoke(p);
                    continue;
                }
                i++;
            }
        }
    }
}
