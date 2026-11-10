// 체크포인트(관리자): 저장 칸 하나에 메멘토를 들고만 있다. 속의 값은 보지 않고, 뜨는 일과 덮는 일은 원래 객체(Explorer)에 맡긴다.
// 일어난 일은 C# event 로 알린다. UnityEngine 을 쓰지 않는다.
using System;

namespace PatternGallery.MementoCheckpoint
{
    public sealed class Checkpoint
    {
        readonly Explorer explorer;

        /// <summary>들고 있는 메멘토 (저장 전에는 null). 화면이 읽을 수 있지만 메멘토가 읽기 전용이라 고칠 수 없다</summary>
        public ExplorerMemento Memento { get; private set; }
        public bool HasSave => Memento != null;

        /// <summary>저장했다 (새 메멘토). 저장 칸이 하나라 앞 저장본은 덮였다</summary>
        public event Action<ExplorerMemento> Saved;
        /// <summary>쓰러져 있어 저장하지 않았다</summary>
        public event Action SaveRefused;
        /// <summary>저장본이 없어 되살리지 않았다</summary>
        public event Action NothingToRestore;

        public Checkpoint(Explorer explorer)
        {
            this.explorer = explorer ?? throw new ArgumentNullException(nameof(explorer));
        }

        /// <summary>지금 상태를 저장한다. 쓰러져 있으면 받지 않고 false</summary>
        public bool Save()
        {
            if (explorer.IsDown)
            {
                SaveRefused?.Invoke(); // 쓰러진 상태를 저장하면 되살려도 쓰러져 있다
                return false;
            }
            Memento = explorer.CreateMemento(); // [2] 원래 객체가 뜬 메멘토를 받아 들고만 있다
            Saved?.Invoke(Memento);
            return true;
        }

        /// <summary>마지막 저장본으로 되살린다. 저장본이 없으면 받지 않고 false</summary>
        public bool Respawn()
        {
            if (Memento == null)
            {
                NothingToRestore?.Invoke();
                return false;
            }
            explorer.Restore(Memento); // [3] 덮는 일은 원래 객체가 한다. 메멘토는 그대로 남아 다시 쓸 수 있다
            return true;
        }
    }
}
