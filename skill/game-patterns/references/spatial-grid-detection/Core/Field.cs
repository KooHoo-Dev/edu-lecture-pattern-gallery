// 탐사 구역 코어: 드론 목록과 격자를 함께 들고, Tick 에서 드론을 옮기며 칸이 바뀐 드론은 격자에서 등록을 옮긴다. UnityEngine 을 쓰지 않는다.
// 드론 자리는 난수 없이 정해진 표(Spots)에서 차례로 꺼낸다.
using System;
using System.Collections.Generic;

namespace PatternGallery.SpatialGridDetection
{
    /// <summary>규칙 값. TurretScanner 가 Inspector 값으로 채워 넘기고, Play 중 값을 바꾸면 OnValidate 가 다시 넣는다</summary>
    public sealed class FieldSettings
    {
        public float CellSize = 2f;
        public float DroneSpeed = 1.5f;
        /// <summary>구역 크기 (m). 왼쪽 아래가 (0, 0)</summary>
        public float Width = 16f;
        public float Height = 9f;
        /// <summary>탐지 포탑 자리 (구역 가운데)</summary>
        public float TurretX = 8f;
        public float TurretY = 4.5f;
        /// <summary>AddWave 한 번에 나오는 드론 수</summary>
        public int WaveSize = 3;
    }

    public sealed class Field
    {
        /// <summary>드론이 나오는 자리와 방향. 차례로 꺼내고 끝나면 처음부터 다시 쓴다</summary>
        public static readonly float[][] Spots =
        {
            new[] { 8.6f, 4.4f, 1f, 0f },
            new[] { 9.6f, 7.6f, 0f, -1f },
            new[] { 14.5f, 2f, -0.6f, 0.8f },
            new[] { 7.6f, 5.2f, -1f, 0f },
            new[] { 1.2f, 6.2f, 0.8f, -0.6f },
            new[] { 14.8f, 7f, -0.6f, -0.8f },
            new[] { 3f, 2.6f, 1f, 0f },
            new[] { 12f, 1f, 0f, 1f },
            new[] { 5f, 7f, 0.6f, -0.8f },
            new[] { 15f, 4f, -1f, 0f },
            new[] { 0.8f, 3.5f, 0.6f, 0.8f },
            new[] { 11f, 6.8f, -0.8f, -0.6f },
        };

        public readonly FieldSettings Settings;
        public readonly SpatialGrid Grid;
        readonly List<Drone> drones = new List<Drone>();
        /// <summary>Tick 이 도는 목록의 사본 (도는 중에 핸들러가 드론을 더하거나 빼도 안전하게)</summary>
        readonly List<Drone> moving = new List<Drone>();
        int launched;
        int nextSpot;

        /// <summary>드론이 구역에 들어와 칸에 등록됐다</summary>
        public event Action<Drone> Added;
        /// <summary>드론이 구역과 격자에서 빠졌다</summary>
        public event Action<Drone> Removed;
        /// <summary>드론이 칸을 넘어 등록을 옮겼다 (드론, 옛 칸, 새 칸)</summary>
        public event Action<Drone, Cell, Cell> CellChanged;

        public Field(FieldSettings settings)
        {
            Settings = settings;
            Grid = new SpatialGrid(settings.CellSize);
        }

        public IReadOnlyList<Drone> Drones => drones;

        /// <summary>정해진 자리에서 드론 WaveSize 대를 더한다 (입력)</summary>
        public void AddWave()
        {
            for (int k = 0; k < Settings.WaveSize; k++)
            {
                float[] s = Spots[nextSpot];
                nextSpot = (nextSpot + 1) % Spots.Length;
                launched++;
                Add(new Drone("D" + launched, s[0], s[1], s[2], s[3]));
            }
        }

        public void Add(Drone d)
        {
            if (drones.Contains(d)) return; // 두 번 넣으면 격자 칸에도 두 번 들어가 탐지에 두 번 잡힌다
            d.Removed = false;
            drones.Add(d);
            Grid.Add(d); // [1] 나오는 순간 지금 칸에 등록한다
            Added?.Invoke(d);
        }

        /// <summary>드론을 구역에서 뺀다 (파괴). 격자에서도 반드시 함께 뺀다</summary>
        public bool Remove(Drone d)
        {
            if (!drones.Remove(d)) return false;
            Grid.Remove(d);
            d.Removed = true;
            Removed?.Invoke(d);
            return true;
        }

        /// <summary>칸 크기를 바꾸고 모든 드론을 새 칸에 다시 등록한다 (Play 중 Inspector 값 변경)</summary>
        public void SetCellSize(float cellSize)
        {
            Settings.CellSize = cellSize;
            Grid.Reset(cellSize);
            foreach (Drone d in drones) Grid.Add(d);
        }

        /// <summary>매 프레임 (TurretScanner.Update 의 Time.deltaTime)</summary>
        public void Tick(float dt)
        {
            float step = Settings.DroneSpeed * dt;
            moving.Clear();
            moving.AddRange(drones);
            foreach (Drone d in moving)
            {
                if (d.Removed) continue; // 앞 드론의 CellChanged 핸들러가 이 드론을 뺐다
                d.Step(step, Settings.Width, Settings.Height); // [2]
                Cell now = Grid.CellOf(d.X, d.Y); // [2]
                if (now == d.Cell) continue;
                Cell old = d.Cell;
                Grid.Move(d, old, now); // [2] 옛 칸에서 빼고 새 칸에 넣는다
                CellChanged?.Invoke(d, old, now);
            }
        }
    }
}
