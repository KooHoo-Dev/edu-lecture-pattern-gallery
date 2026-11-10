// 공간 분할 격자: 땅을 CellSize 칸으로 나누고 칸마다 그 칸에 있는 드론 목록을 든다. 탐지는 반경이 닿는 칸의 드론만 거리를 잰다. UnityEngine 을 쓰지 않는다.
// 드론이 칸을 넘으면 Field 가 Move 로 등록을 옮긴다. 등록이 실제 자리와 어긋나면 격자는 틀린 답을 빠르게 낸다.
using System;
using System.Collections.Generic;

namespace PatternGallery.SpatialGridDetection
{
    /// <summary>칸 번호 (가로 X, 세로 Y). 왼쪽 아래 칸이 (0,0) 이고, 땅 밖의 음수 좌표도 Math.Floor 로 내려 (-1,0) 처럼 센다</summary>
    public readonly struct Cell : IEquatable<Cell>
    {
        public readonly int X;
        public readonly int Y;

        public Cell(int x, int y)
        {
            X = x;
            Y = y;
        }

        public bool Equals(Cell other) => X == other.X && Y == other.Y;
        public override bool Equals(object obj) => obj is Cell other && Equals(other);
        public override int GetHashCode() => (X * 397) ^ Y;
        public static bool operator ==(Cell a, Cell b) => a.Equals(b);
        public static bool operator !=(Cell a, Cell b) => !a.Equals(b);
        public override string ToString() => $"({X},{Y})";
    }

    public sealed class SpatialGrid
    {
        /// <summary>칸 → 그 칸에 등록된 드론. 빈 목록도 지우지 않고 다시 쓴다 (드론이 오갈 때마다 목록을 새로 만들지 않게)</summary>
        readonly Dictionary<Cell, List<Drone>> cells = new Dictionary<Cell, List<Drone>>();

        public SpatialGrid(float cellSize)
        {
            Reset(cellSize);
        }

        public float CellSize { get; private set; }
        /// <summary>등록된 드론 수. 전체 검사였다면 이만큼 거리를 잰다</summary>
        public int Count { get; private set; }

        /// <summary>칸을 모두 비우고 칸 크기를 바꾼다. 드론은 부르는 쪽(Field.SetCellSize)이 다시 Add 한다</summary>
        public void Reset(float cellSize)
        {
            if (cellSize <= 0f) throw new ArgumentOutOfRangeException(nameof(cellSize), "칸 크기는 0 보다 커야 한다");
            CellSize = cellSize;
            cells.Clear();
            Count = 0;
        }

        /// <summary>좌표가 든 칸. (int) 로 자르면 -0.5 도 0 칸이 되어 0 칸이 두 배 넓어지므로 Math.Floor 로 내린다</summary>
        public Cell CellOf(float x, float y) => new Cell((int)Math.Floor(x / CellSize), (int)Math.Floor(y / CellSize)); // [1]

        /// <summary>드론을 지금 자리의 칸에 등록한다</summary>
        public void Add(Drone d)
        {
            d.Cell = CellOf(d.X, d.Y); // [1]
            ListAt(d.Cell).Add(d); // [1]
            Count++;
        }

        /// <summary>드론을 등록된 칸에서 뺀다 (파괴할 때). 없으면 false</summary>
        public bool Remove(Drone d)
        {
            if (!cells.TryGetValue(d.Cell, out List<Drone> list) || !list.Remove(d)) return false;
            Count--;
            return true;
        }

        /// <summary>칸을 넘은 드론의 등록을 옮긴다: 옛 칸 목록에서 빼고 새 칸 목록에 넣는다</summary>
        public void Move(Drone d, Cell oldCell, Cell newCell)
        {
            if (oldCell == newCell) return;
            if (!cells.TryGetValue(oldCell, out List<Drone> list) || !list.Remove(d)) return; // 등록되지 않은 드론 (이미 Remove 됨)
            ListAt(newCell).Add(d); // [2]
            d.Cell = newCell; // [2]
        }

        /// <summary>(x, y) 에서 radius 안의 드론을 found 에 넣고, 거리 검사 횟수를 돌려준다. visited 가 있으면 본 칸을 넣는다.
        /// 원을 감싼 사각형의 칸 가운데 원이 실제로 닿는 칸만 보고, 그 칸에 등록된 드론만 거리를 잰다</summary>
        public int Query(float x, float y, float radius, List<Drone> found, List<Cell> visited = null)
        {
            Cell min = CellOf(x - radius, y - radius); // [3]
            Cell max = CellOf(x + radius, y + radius); // [3]
            float r2 = radius * radius;
            int checks = 0;
            for (int cy = min.Y; cy <= max.Y; cy++)
            {
                for (int cx = min.X; cx <= max.X; cx++)
                {
                    if (!Touches(cx, cy, x, y, r2)) continue; // [3] 사각형 모서리 칸 가운데 원이 닿지 않는 칸은 건너뛴다
                    var cell = new Cell(cx, cy);
                    visited?.Add(cell);
                    if (!cells.TryGetValue(cell, out List<Drone> list)) continue;
                    foreach (Drone d in list)
                    {
                        checks++; // [4]
                        if (d.DistanceSq(x, y) <= r2) found.Add(d); // [4]
                    }
                }
            }
            return checks;
        }

        /// <summary>칸 (cx, cy) 의 사각형에서 (x, y) 에 가장 가까운 점이 반경 안인가</summary>
        bool Touches(int cx, int cy, float x, float y, float r2)
        {
            float left = cx * CellSize;
            float bottom = cy * CellSize;
            float nx = Math.Max(left, Math.Min(x, left + CellSize));
            float ny = Math.Max(bottom, Math.Min(y, bottom + CellSize));
            float dx = x - nx;
            float dy = y - ny;
            return dx * dx + dy * dy <= r2; // [3]
        }

        List<Drone> ListAt(Cell cell)
        {
            if (!cells.TryGetValue(cell, out List<Drone> list))
            {
                list = new List<Drone>();
                cells.Add(cell, list);
            }
            return list;
        }
    }
}
