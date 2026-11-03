// 나쁜 예: 입력 콜백에서 위치를 바로 바꾸고, 누른 방향만 기록해 되돌릴 때 반대로 한 칸 움직이는 드론.
// 실제로는 MonoBehaviour 의 입력 콜백과 Update 안에 있는 흔한 코드다. 격자(DroneGrid)와 방향(Direction)은 Core 것을 같이 쓴다.
// 갤러리의 '효과 끄기' 가 이 코드를 같은 입력으로 돌린다. 프로젝트에 넣지 않는다.
using System.Collections.Generic;

namespace PatternGallery.CommandUndoReplay.Naive
{
    public sealed class NaiveDrone
    {
        public int historyLimit = 20;
        public float replayInterval = 0.4f;

        public readonly DroneGrid grid;
        public int X;
        public int Y;
        public readonly int startX;
        public readonly int startY;

        /// <summary>누른 방향만 기록한다. 그때 어디에 있었는지는 남기지 않는다</summary>
        public readonly List<Direction> moves = new List<Direction>();
        public readonly List<Direction> redoMoves = new List<Direction>();

        public bool isReplaying;
        public int replayIndex;
        float replayTimer;

        public NaiveDrone(DroneGrid grid, int x, int y)
        {
            this.grid = grid;
            X = x;
            Y = y;
            startX = x;
            startY = y;
        }

        public void OnMove(Direction dir)
        {
            if (isReplaying) return;
            Step(Directions.Dx(dir), Directions.Dy(dir));
            moves.Add(dir); // [!] 실제로 간 길이 아니라 누른 방향을 기록한다 (막혀 제자리였어도). 되돌리기로 위치가 어긋나면 이 방향을 다시 눌러도 지금 칸으로 오지 않는다
            if (moves.Count > historyLimit) moves.RemoveAt(0);
            redoMoves.Clear();
        }

        public void OnUndo()
        {
            if (isReplaying || moves.Count == 0) return;
            Direction last = moves[moves.Count - 1];
            moves.RemoveAt(moves.Count - 1);
            redoMoves.Add(last);
            Step(-Directions.Dx(last), -Directions.Dy(last)); // [!] 이전 위치가 아니라 반대 방향으로 한 칸. 벽에 막혀 제자리였던 이동을 되돌리면 한 칸 어긋난다
        }

        public void OnRedo()
        {
            if (isReplaying || redoMoves.Count == 0) return;
            Direction next = redoMoves[redoMoves.Count - 1];
            redoMoves.RemoveAt(redoMoves.Count - 1);
            Step(Directions.Dx(next), Directions.Dy(next));
            moves.Add(next);
            if (moves.Count > historyLimit) moves.RemoveAt(0);
        }

        public void OnReplay()
        {
            if (isReplaying || moves.Count == 0) return;
            X = startX; // [!] 기록의 첫 위치를 모르니 게임 시작 자리로 옮긴다. 오래된 기록을 버렸으면 남은 첫 방향은 그곳에서 누른 것이 아니다
            Y = startY;
            isReplaying = true;
            replayIndex = 0;
            replayTimer = replayInterval;
        }

        public void Update(float dt)
        {
            if (!isReplaying) return;
            replayTimer -= dt;
            while (isReplaying && replayTimer <= 0f)
            {
                Direction dir = moves[replayIndex];
                Step(Directions.Dx(dir), Directions.Dy(dir));
                replayIndex++;
                if (replayIndex >= moves.Count) isReplaying = false;
                else replayTimer += replayInterval;
            }
        }

        void Step(int dx, int dy)
        {
            int nx = X + dx;
            int ny = Y + dy;
            if (grid.IsOpen(nx, ny))
            {
                X = nx;
                Y = ny;
            }
        }
    }
}
