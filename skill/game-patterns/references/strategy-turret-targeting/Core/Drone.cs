// 잔해 드론과 웨이브: 고정 표대로 왼쪽에서 나와 기지로 다가온다. 난수와 UnityEngine 을 쓰지 않아 에디터 없이 같은 결과가 나온다.
using System;
using System.Collections.Generic;

namespace PatternGallery.StrategyTurretTargeting
{
    /// <summary>표 한 줄: 언제, 얼마나 빠르게, 체력 얼마로 나오는가</summary>
    public sealed class DroneSpec
    {
        public readonly float SpawnTime;
        public readonly float Speed;
        public readonly int Hp;
        /// <summary>땅 위 높이. 화면에만 쓰고 규칙(거리, 선두)에는 쓰지 않는다</summary>
        public readonly float Altitude;

        public DroneSpec(float spawnTime, float speed, int hp, float altitude)
        {
            SpawnTime = spawnTime;
            Speed = speed;
            Hp = hp;
            Altitude = altitude;
        }
    }

    public sealed class Drone
    {
        public readonly int Id;
        public readonly float Speed;
        public readonly int MaxHp;
        public readonly float Altitude;
        /// <summary>왼쪽 끝(0)에서 기지(DroneWave.BaseX) 쪽으로 늘어난다</summary>
        public float X;
        public int Hp;

        public Drone(int id, DroneSpec spec)
        {
            Id = id;
            Speed = spec.Speed;
            MaxHp = spec.Hp;
            Hp = spec.Hp;
            Altitude = spec.Altitude;
        }

        public string Name => "D" + Id;
        public bool IsAlive => Hp > 0;
    }

    /// <summary>드론 표를 시간대로 내보내고 움직인다. 기지에 닿은 드론은 목록에서 빼고 알린다</summary>
    public sealed class DroneWave
    {
        public const float SpawnX = 0f;
        public const float BaseX = 15f;

        /// <summary>
        /// 기본 배치. HP 가 서로 달라 조준 방식마다 고르는 드론이 갈린다.
        /// 높이(마지막 값)는 화면에만 쓴다. 서로 앞지르는 D2, D4, D5 만 층을 나누고 차이는 작게 두어,
        /// 가로 거리로 가까운 드론이 눈으로도 가깝게 보이게 한다
        /// </summary>
        public static DroneSpec[] CreateDefaultTable() => new[]
        {
            new DroneSpec(0f, 2.8f, 8, 2.2f),   // D1 빠른 선두
            new DroneSpec(0f, 1.3f, 10, 1f),    // D2 느리고 단단하다
            new DroneSpec(0.2f, 2.2f, 2, 1.6f), // D3 약하다
            new DroneSpec(0.8f, 2f, 5, 2.2f),   // D4
            new DroneSpec(1.4f, 2.5f, 3, 3.4f), // D5
        };

        readonly DroneSpec[] table;
        readonly List<Drone> active = new List<Drone>();
        float time;
        int nextSpawn;

        /// <summary>나온 뒤 아직 파괴되지도 기지에 닿지도 않은 드론 (나온 순서 = id 순서)</summary>
        public IReadOnlyList<Drone> Active => active;
        public float Time => time;
        /// <summary>표의 드론이 모두 나왔고 하나도 남지 않았다</summary>
        public bool Finished => nextSpawn >= table.Length && active.Count == 0;

        public event Action<Drone> DroneSpawned;
        public event Action<Drone> DroneReachedBase;

        public DroneWave(DroneSpec[] table)
        {
            this.table = table;
        }

        public void Tick(float dt)
        {
            time += dt;
            while (nextSpawn < table.Length && table[nextSpawn].SpawnTime <= time)
            {
                var drone = new Drone(nextSpawn + 1, table[nextSpawn]) { X = SpawnX };
                nextSpawn++;
                active.Add(drone);
                DroneSpawned?.Invoke(drone);
            }
            for (int i = 0; i < active.Count; i++)
            {
                Drone d = active[i];
                d.X += d.Speed * dt;
                if (d.X < BaseX) continue;
                active.RemoveAt(i);
                i--;
                DroneReachedBase?.Invoke(d);
            }
        }

        /// <summary>파괴된 드론을 뺀다 (포탑이 부른다)</summary>
        public void Remove(Drone drone)
        {
            active.Remove(drone);
        }

        /// <summary>x 에서 가로 거리 range 안의 살아 있는 드론을 into 에 담는다 (목록을 재사용해 매 프레임 할당하지 않는다)</summary>
        public void CollectInRange(float x, float range, List<Drone> into)
        {
            into.Clear();
            foreach (Drone d in active)
                if (d.IsAlive && Math.Abs(d.X - x) <= range) into.Add(d);
        }

        /// <summary>처음부터 다시 (연결 컴포넌트의 반복 재생용)</summary>
        public void Restart()
        {
            active.Clear();
            time = 0f;
            nextSpawn = 0;
        }
    }
}
