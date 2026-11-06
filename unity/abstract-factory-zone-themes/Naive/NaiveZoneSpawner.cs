// 나쁜 예: 지금 구역을 string zone 하나로 들고, 테마를 쓰는 곳(바닥, 드론, 투사체)마다 switch (zone) 을 둔 흔한 코드.
// 처음에는 숲과 용암 둘뿐이었고, 빙하는 나중에 SetGround 와 SpawnDrone 에 case "ice" 를 넣어 더했다.
// 실제로는 MonoBehaviour 안의 코드다 (case 마다 Instantiate(forestDronePrefab, …) 와 바닥 색 바꾸기가 있다).
// 여기서는 Unity 없이 돌리려고 순수 C# 로 두었고, 바닥·드론·투사체 클래스는 코어의 것을 그대로 쓴다 (공장은 쓰지 않는다). 프로젝트에 넣지 않는다.
using System.Collections.Generic;

namespace PatternGallery.AbstractFactoryZoneThemes.Naive
{
    public sealed class NaiveZoneSpawner
    {
        public int maxDrones = 4;
        public float projectileSpeed = 6f;

        /// <summary>지금 구역 ("forest", "lava", "ice"). 테마를 쓰는 곳이 모두 이 값을 그때그때 읽는다</summary>
        public string zone = "forest";
        public Ground ground;
        public readonly List<Drone> drones = new List<Drone>();
        public readonly List<Projectile> projectiles = new List<Projectile>();

        public NaiveZoneSpawner(string startZone)
        {
            zone = startZone;
            SetGround();
        }

        /// <summary>구역 키 (Q, W, E)</summary>
        public void EnterZone(string next)
        {
            zone = next;
            SetGround();
        }

        public void SetGround()
        {
            switch (zone)
            {
                case "forest": ground = new Ground("forest", "이끼 바닥"); break;
                case "lava": ground = new Ground("lava", "현무암 바닥"); break;
                case "ice": ground = new Ground("ice", "빙판 바닥"); break; // 빙하를 더하며 넣었다
                default: ground = new Ground("lava", "현무암 바닥"); break;
            }
        }

        /// <summary>출격 키 (R). 자리가 차면 null</summary>
        public Drone SpawnDrone()
        {
            if (drones.Count >= maxDrones) return null;
            Drone drone;
            switch (zone)
            {
                case "forest": drone = new Drone("forest", "덩굴 드론", "덩굴"); break;
                case "lava": drone = new Drone("lava", "화염 드론", "화염"); break;
                case "ice": drone = new Drone("ice", "서리 드론", "서리"); break; // 빙하를 더하며 넣었다
                default: drone = new Drone("lava", "화염 드론", "화염"); break;
            }
            drone.Number = drones.Count + 1;
            drone.Slot = drones.Count;
            drone.X = 12.8f - drone.Slot * 1.6f;
            drones.Add(drone);
            return drone;
        }

        /// <summary>사격 키 (F). 드론마다 한 발</summary>
        public void FireAll()
        {
            foreach (Drone drone in drones)
            {
                Projectile p = MakeProjectile(zone); // [!] 드론의 테마가 아니라 지금 구역을 넘긴다. 구역을 옮기면 앞 구역 드론이 새 구역 투사체를 쏜다
                p.X = drone.X - 0.5f;
                projectiles.Add(p);
            }
        }

        public Projectile MakeProjectile(string zone)
        {
            switch (zone)
            {
                case "forest": return new Projectile("forest", "가시");
                case "lava": return new Projectile("lava", "화염탄");
                default: return new Projectile("lava", "화염탄"); // [!] 빙하를 더할 때 이 switch 에만 case "ice" 를 빠뜨려 빙하에서는 여기로 떨어진다
            }
        }

        public void Update(float dt)
        {
            for (int i = projectiles.Count - 1; i >= 0; i--)
            {
                projectiles[i].X -= projectileSpeed * dt;
                if (projectiles[i].X <= 3f) projectiles.RemoveAt(i);
            }
        }
    }
}
