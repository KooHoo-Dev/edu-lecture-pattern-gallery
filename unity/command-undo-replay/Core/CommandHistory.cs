// 명령 기록: 실행한 명령과 되돌린 명령(다시 하기)을 들고 되돌리기, 다시 하기, 리플레이를 맡는다. 시간은 Tick(dt) 로만 받는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.CommandUndoReplay
{
    public sealed class CommandHistory
    {
        /// <summary>기록 상한. 넘으면 가장 오래된 명령을 버린다 (DroneCommander 가 Inspector 값으로 넣는다)</summary>
        public int HistoryLimit = 20;
        /// <summary>리플레이에서 명령 사이 간격 (초)</summary>
        public float ReplayInterval = 0.4f;

        readonly List<ICommand> done = new List<ICommand>();
        /// <summary>되돌린 명령. 마지막이 다음 다시 하기 차례</summary>
        readonly List<ICommand> undone = new List<ICommand>();
        int replayIndex = -1;
        float replayTimer;

        public IReadOnlyList<ICommand> Done => done;
        public IReadOnlyList<ICommand> Undone => undone;
        public bool IsReplaying => replayIndex >= 0;
        /// <summary>리플레이 중 이미 다시 실행한 명령 수</summary>
        public int ReplayIndex => Math.Max(0, replayIndex);

        /// <summary>새 명령을 실행하고 기록에 넣었다</summary>
        public event Action<ICommand> Executed;
        public event Action<ICommand> Undid;
        public event Action<ICommand> Redid;
        /// <summary>새 명령이 와서 다시 하기 목록을 비웠다 (비운 개수)</summary>
        public event Action<int> RedoCleared;
        /// <summary>상한을 넘어 가장 오래된 명령을 버렸다</summary>
        public event Action<ICommand> Dropped;
        /// <summary>처음 위치로 되돌렸고 이제 다시 실행한다 (명령 수)</summary>
        public event Action<int> ReplayStarted;
        /// <summary>리플레이에서 명령 하나를 다시 실행했다 (명령, 몇 번째인지 1부터)</summary>
        public event Action<ICommand, int> ReplayStepped;
        public event Action ReplayFinished;
        /// <summary>리플레이 중이라 받지 않은 입력 ("↑", "undo", "redo", "replay")</summary>
        public event Action<string> InputIgnored;
        /// <summary>받았지만 할 것이 없다 ("undo", "redo", "replay")</summary>
        public event Action<string> NothingToDo;

        /// <summary>새 명령. 리플레이 중이면 실행하지 않고 false</summary>
        public bool Execute(ICommand command)
        {
            if (IsReplaying)
            {
                InputIgnored?.Invoke(command.ToString()); // 리플레이 중 입력이 기록에 섞이지 않게
                return false;
            }
            command.Execute(); // [2] 실행하고
            if (undone.Count > 0)
            {
                int count = undone.Count;
                undone.Clear(); // [2] 새 명령 뒤에는 되돌린 명령을 다시 할 수 없다
                RedoCleared?.Invoke(count);
            }
            // 벽에 막혀 제자리였던 명령도 기록한다 (선택이다. 안 움직인 명령을 빼려면 Execute 가 움직였는지를 돌려주게 하고 여기서 거른다)
            Push(command); // [2] 기록에 넣는다
            Executed?.Invoke(command);
            return true;
        }

        /// <summary>마지막 명령을 되돌린다. 받지 않았으면 InputIgnored, 되돌릴 것이 없으면 NothingToDo 로 알린다</summary>
        public void Undo()
        {
            if (IsReplaying)
            {
                InputIgnored?.Invoke("undo");
                return;
            }
            if (done.Count == 0)
            {
                NothingToDo?.Invoke("undo");
                return;
            }
            ICommand last = done[done.Count - 1];
            done.RemoveAt(done.Count - 1);
            last.Undo(); // [3] 어떻게 되돌릴지는 명령이 안다
            undone.Add(last);
            Undid?.Invoke(last);
        }

        /// <summary>마지막으로 되돌린 명령을 다시 실행한다. 받지 않았으면 InputIgnored, 다시 할 것이 없으면 NothingToDo 로 알린다</summary>
        public void Redo()
        {
            if (IsReplaying)
            {
                InputIgnored?.Invoke("redo");
                return;
            }
            if (undone.Count == 0)
            {
                NothingToDo?.Invoke("redo");
                return;
            }
            ICommand next = undone[undone.Count - 1];
            undone.RemoveAt(undone.Count - 1);
            next.Execute();
            Push(next);
            Redid?.Invoke(next);
        }

        /// <summary>기록을 거꾸로 되돌려 처음 위치로 간 뒤, ReplayInterval 마다 하나씩 다시 실행한다. 받지 않았으면 InputIgnored, 기록이 없으면 NothingToDo 로 알린다</summary>
        public void StartReplay()
        {
            if (IsReplaying)
            {
                InputIgnored?.Invoke("replay");
                return;
            }
            if (done.Count == 0)
            {
                NothingToDo?.Invoke("replay");
                return;
            }
            for (int i = done.Count - 1; i >= 0; i--) done[i].Undo(); // [4] 처음 위치로: 기록을 뒤에서부터 되돌린다
            replayIndex = 0;
            replayTimer = ReplayInterval;
            ReplayStarted?.Invoke(done.Count);
        }

        /// <summary>매 프레임 (MonoBehaviour.Update 의 Time.deltaTime)</summary>
        public void Tick(float dt)
        {
            if (!IsReplaying) return;
            replayTimer -= dt;
            while (IsReplaying && replayTimer <= 0f)
            {
                ICommand command = done[replayIndex];
                command.Execute(); // [4] 같은 명령 객체를 처음부터 다시 실행한다
                replayIndex++;
                ReplayStepped?.Invoke(command, replayIndex);
                if (replayIndex >= done.Count)
                {
                    replayIndex = -1;
                    ReplayFinished?.Invoke();
                }
                else replayTimer += ReplayInterval;
            }
        }

        void Push(ICommand command)
        {
            done.Add(command);
            while (done.Count > Math.Max(1, HistoryLimit))
            {
                ICommand oldest = done[0];
                done.RemoveAt(0);
                Dropped?.Invoke(oldest);
            }
        }
    }
}
