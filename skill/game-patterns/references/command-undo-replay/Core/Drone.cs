// 격자와 정비 드론: 벽이 있는 격자 위를 한 칸씩 움직이는 대상. 명령(MoveCommand)이 이 객체를 움직인다. UnityEngine 을 쓰지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.CommandUndoReplay
{
    public enum Direction
    {
        Up,
        Down,
        Left,
        Right,
    }

    public static class Directions
    {
        public static int Dx(Direction d) => d == Direction.Right ? 1 : d == Direction.Left ? -1 : 0;
        public static int Dy(Direction d) => d == Direction.Up ? 1 : d == Direction.Down ? -1 : 0;

        /// <summary>기록 목록에 보일 화살표</summary>
        public static string Arrow(Direction d) => d switch
        {
            Direction.Up => "↑",
            Direction.Down => "↓",
            Direction.Left => "←",
            _ => "→",
        };
    }

    /// <summary>가로 Width, 세로 Height 칸의 격자. (0, 0) 이 왼쪽 아래, 위쪽이 +Y. 바깥은 벽과 같다</summary>
    public sealed class DroneGrid
    {
        public const int DefaultStartX = 1;
        public const int DefaultStartY = 1;

        public readonly int Width;
        public readonly int Height;
        readonly HashSet<int> walls = new HashSet<int>();

        public DroneGrid(int width, int height)
        {
            Width = Math.Max(1, width);
            Height = Math.Max(1, height);
        }

        public void AddWall(int x, int y)
        {
            if (Inside(x, y)) walls.Add(y * Width + x);
        }

        public bool Inside(int x, int y) => x >= 0 && y >= 0 && x < Width && y < Height;
        public bool IsWall(int x, int y) => Inside(x, y) && walls.Contains(y * Width + x);
        public bool IsOpen(int x, int y) => Inside(x, y) && !walls.Contains(y * Width + x);

        /// <summary>기본 배치: 12 x 6 칸, 벽 8칸. 출발은 (1, 1)</summary>
        public static DroneGrid CreateDefault()
        {
            var grid = new DroneGrid(12, 6);
            grid.AddWall(4, 0);
            grid.AddWall(4, 1);
            grid.AddWall(4, 2);
            grid.AddWall(7, 3);
            grid.AddWall(7, 4);
            grid.AddWall(7, 5);
            grid.AddWall(9, 1);
            grid.AddWall(10, 1);
            return grid;
        }
    }

    /// <summary>정비 드론. 명령이 부르는 두 가지만 할 줄 안다: 한 칸 가 보기(TryMove), 정한 칸에 놓기(PlaceAt)</summary>
    public sealed class Drone
    {
        public readonly DroneGrid Grid;
        public int X { get; private set; }
        public int Y { get; private set; }

        /// <summary>자리가 바뀌었을 때 (이전 X, 이전 Y, 새 X, 새 Y)</summary>
        public event Action<int, int, int, int> Moved;
        /// <summary>벽이나 격자 끝에 막혀 움직이지 못했을 때 (가려던 방향)</summary>
        public event Action<Direction> Bumped;

        public Drone(DroneGrid grid, int x, int y)
        {
            Grid = grid;
            X = x;
            Y = y;
        }

        /// <summary>한 칸 가 본다. 막히면 제자리에 있고 false</summary>
        public bool TryMove(Direction direction)
        {
            int nx = X + Directions.Dx(direction);
            int ny = Y + Directions.Dy(direction);
            if (!Grid.IsOpen(nx, ny))
            {
                Bumped?.Invoke(direction);
                return false;
            }
            PlaceAt(nx, ny);
            return true;
        }

        /// <summary>정한 칸에 바로 놓는다. 되돌리기와 리플레이 준비가 쓴다</summary>
        public void PlaceAt(int x, int y)
        {
            if (x == X && y == Y) return;
            int fromX = X;
            int fromY = Y;
            X = x;
            Y = y;
            Moved?.Invoke(fromX, fromY, x, y);
        }
    }
}
