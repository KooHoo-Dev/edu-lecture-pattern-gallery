// 하네스 어댑터: 코어(CommandHistory, MoveCommand, Drone)와 나쁜 예(NaiveDrone)를 시나리오 입력으로 돌리고 사건과 상태를 글로 꺼낸다.
// 나쁜 예 옆에는 같은 입력을 받는 코어(그림자)를 두고, 그 드론 위치를 '있어야 할 곳' 으로 삼아 비교한다 (나쁜 예 코드에는 검사 코드를 넣지 않는다).
// 웹 sim(src/specimens/command-undo-replay/sim.ts)의 drain, snapshot 과 같은 글을 만든다.
using System.Collections.Generic;
using PatternGallery.CommandUndoReplay.Naive;
using PatternGallery.Truth;

namespace PatternGallery.CommandUndoReplay
{
    [SimTarget("command-undo-replay")]
    public sealed class Target : ISimTarget
    {
        readonly Drone drone;
        readonly CommandHistory history;
        readonly NaiveDrone naive;
        readonly List<string> events = new List<string>();
        bool lastDesync;
        int replayFromX;
        int replayFromY;

        public Target(Values v, bool isNaive)
        {
            drone = new Drone(DroneGrid.CreateDefault(), DroneGrid.DefaultStartX, DroneGrid.DefaultStartY);
            history = new CommandHistory
            {
                HistoryLimit = v.Int("historyLimit"),
                ReplayInterval = v.Float("replayInterval"),
            };
            if (isNaive)
            {
                naive = new NaiveDrone(DroneGrid.CreateDefault(), DroneGrid.DefaultStartX, DroneGrid.DefaultStartY)
                {
                    historyLimit = v.Int("historyLimit"),
                    replayInterval = v.Float("replayInterval"),
                };
                return; // 그림자 코어의 사건은 적지 않는다
            }
            history.Executed += c => events.Add($"실행 {c} {Where((MoveCommand)c)} · 기록 {history.Done.Count}개");
            history.Undid += c => events.Add(Undone((MoveCommand)c));
            history.Redid += c => events.Add($"다시 하기 {c} {Where((MoveCommand)c)}");
            history.RedoCleared += n => events.Add($"다시 하기 목록 비움 ({n}개)");
            history.Dropped += c => events.Add($"가장 오래된 기록 버림 ({c})");
            history.ReplayStarted += n => events.Add($"리플레이 시작: 처음 위치 {P(drone.X, drone.Y)} 로 되돌리고 {n}개 다시 실행");
            history.ReplayStepped += (c, i) => events.Add($"리플레이 {i}/{history.Done.Count} {c} {Where((MoveCommand)c)}");
            history.ReplayFinished += () => events.Add($"리플레이 끝 {P(drone.X, drone.Y)}");
            history.InputIgnored += s => events.Add($"리플레이 중 무시 ({Label(s)})");
            history.NothingToDo += s => events.Add(Nothing(s));
        }

        static string P(int x, int y) => $"({x},{y})";

        string Where(MoveCommand m) => m.Blocked ? $"벽에 막힘 {P(m.FromX, m.FromY)}" : $"{P(m.FromX, m.FromY)} → {P(drone.X, drone.Y)}";

        static string Undone(MoveCommand m) => m.Blocked
            ? $"되돌리기 {m} → 저장한 위치 {P(m.FromX, m.FromY)} 그대로 (막혔던 이동)"
            : $"되돌리기 {m} → 저장한 위치 {P(m.FromX, m.FromY)}";

        static string Label(string s) => s switch
        {
            "undo" => "되돌리기",
            "redo" => "다시 하기",
            "replay" => "리플레이",
            "up" => "↑",
            "down" => "↓",
            "left" => "←",
            "right" => "→",
            _ => s,
        };

        static string Nothing(string s) => s switch
        {
            "undo" => "되돌릴 기록이 없다",
            "redo" => "다시 할 기록이 없다",
            _ => "리플레이할 기록이 없다",
        };

        static bool TryParse(string name, out Direction dir)
        {
            switch (name)
            {
                case "up": dir = Direction.Up; return true;
                case "down": dir = Direction.Down; return true;
                case "left": dir = Direction.Left; return true;
                case "right": dir = Direction.Right; return true;
            }
            dir = Direction.Up;
            return false;
        }

        /// <summary>코어에 입력을 넣는다 (나쁜 예 모드에서는 그림자)</summary>
        void CoreInput(string name)
        {
            if (TryParse(name, out Direction dir)) history.Execute(new MoveCommand(drone, dir));
            else if (name == "undo") history.Undo();
            else if (name == "redo") history.Redo();
            else if (name == "replay") history.StartReplay();
        }

        public void Input(string name)
        {
            CoreInput(name);
            if (naive == null) return;

            int x0 = naive.X;
            int y0 = naive.Y;
            int moves0 = naive.moves.Count;
            int redo0 = naive.redoMoves.Count;
            bool replaying0 = naive.isReplaying;
            string first0 = moves0 > 0 ? Directions.Arrow(naive.moves[0]) : "";
            string last0 = moves0 > 0 ? Directions.Arrow(naive.moves[moves0 - 1]) : "";
            string redoTop0 = redo0 > 0 ? Directions.Arrow(naive.redoMoves[redo0 - 1]) : "";

            bool isMove = TryParse(name, out Direction dir);
            if (isMove) naive.OnMove(dir);
            else if (name == "undo") naive.OnUndo();
            else if (name == "redo") naive.OnRedo();
            else if (name == "replay") naive.OnReplay();

            bool moved = naive.X != x0 || naive.Y != y0;
            string now = P(naive.X, naive.Y);
            if (replaying0) events.Add($"리플레이 중 무시 ({Label(name)})");
            else if (isMove)
            {
                string a = Directions.Arrow(dir);
                events.Add(moved ? $"{a} {P(x0, y0)} → {now} · moves 에 {a} 추가" : $"{a} 벽에 막힘 {now} · moves 에 {a} 추가");
                if (redo0 > 0) events.Add($"redo 목록 비움 ({redo0}개)");
                if (naive.moves.Count == moves0) events.Add($"가장 오래된 방향 버림 ({first0})");
            }
            else if (name == "undo")
            {
                if (moves0 == 0) events.Add("되돌릴 방향이 없다");
                else events.Add(moved ? $"되돌리기: {last0} 의 반대로 한 칸 {P(x0, y0)} → {now}" : $"되돌리기: {last0} 의 반대쪽이 막혀 제자리 {now}");
            }
            else if (name == "redo")
            {
                if (redo0 == 0) events.Add("다시 할 방향이 없다");
                else
                {
                    events.Add(moved ? $"다시 하기 {redoTop0} {P(x0, y0)} → {now}" : $"다시 하기 {redoTop0} 벽에 막힘 {now}");
                    if (naive.moves.Count == moves0) events.Add($"가장 오래된 방향 버림 ({first0})");
                }
            }
            else if (name == "replay")
            {
                if (moves0 == 0) events.Add("리플레이할 방향이 없다");
                else
                {
                    replayFromX = x0;
                    replayFromY = y0;
                    events.Add($"리플레이 시작: 시작 자리 {P(naive.startX, naive.startY)} 로 옮기고 {moves0}개 다시 누른다");
                }
            }

            bool desync = Desync();
            if (name == "undo" && desync && !lastDesync)
                events.Add($"!되돌렸더니 한 칸 어긋났다 (있어야 할 곳 {P(drone.X, drone.Y)}, 실제 {now})");
            lastDesync = desync;
        }

        bool Desync() => naive.X != drone.X || naive.Y != drone.Y;

        public void Tick(float dt)
        {
            history.Tick(dt);
            if (naive == null) return;

            int x0 = naive.X;
            int y0 = naive.Y;
            int index0 = naive.replayIndex;
            bool replaying0 = naive.isReplaying;
            naive.Update(dt);
            if (replaying0)
            {
                // replayInterval 의 하한(0.15초)이 한 프레임보다 길어 한 프레임에 많아야 한 번 걷는다
                for (int i = index0; i < naive.replayIndex; i++)
                {
                    string a = Directions.Arrow(naive.moves[i]);
                    bool moved = naive.X != x0 || naive.Y != y0;
                    events.Add(moved ? $"리플레이 {i + 1}/{naive.moves.Count} {a} {P(x0, y0)} → {P(naive.X, naive.Y)}" : $"리플레이 {i + 1}/{naive.moves.Count} {a} 벽에 막힘 {P(naive.X, naive.Y)}");
                }
                if (!naive.isReplaying)
                {
                    events.Add($"리플레이 끝 {P(naive.X, naive.Y)}");
                    if (naive.X != replayFromX || naive.Y != replayFromY)
                        events.Add($"!리플레이가 다른 곳에서 끝난다 (리플레이 전 {P(replayFromX, replayFromY)}, 끝 {P(naive.X, naive.Y)})");
                }
            }
            lastDesync = Desync();
        }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        public string Snapshot()
        {
            if (naive == null) return $"x={drone.X} y={drone.Y} done={history.Done.Count} redo={history.Undone.Count} replaying={B(history.IsReplaying)}";
            return $"x={naive.X} y={naive.Y} ex={drone.X} ey={drone.Y} moves={naive.moves.Count} redo={naive.redoMoves.Count} replaying={B(naive.isReplaying)}";
        }

        static int B(bool b) => b ? 1 : 0;
    }
}
