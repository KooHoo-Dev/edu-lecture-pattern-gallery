// 메멘토: 저장한 순간 하린의 HP, 칸, 크레딧, 인벤토리를 값으로 담는다. 만든 뒤에는 바깥에서 고칠 수 없다 (읽기 전용 속성, 인벤토리는 읽기 전용 복사본).
// 관리자(Checkpoint)는 이것을 들고만 있고, 속의 값으로 자기를 덮는 일은 원래 객체(Explorer)만 한다. UnityEngine 을 쓰지 않는다.
using System.Collections.Generic;

namespace PatternGallery.MementoCheckpoint
{
    public sealed class ExplorerMemento
    {
        public int Hp { get; }
        public int Cell { get; }
        public int Credits { get; }
        /// <summary>저장한 순간 인벤토리의 복사본. 읽기 전용이라 Add, Remove 가 없다</summary>
        public IReadOnlyList<string> Items { get; }

        /// <summary>
        /// Explorer.CreateMemento 로만 만들라는 뜻으로 internal 이다.
        /// Unity 에서 어셈블리 정의(asmdef)로 나누지 않으면 같은 어셈블리라 막지는 못한다.
        /// </summary>
        internal ExplorerMemento(int hp, int cell, int credits, IEnumerable<string> items)
        {
            Hp = hp;
            Cell = cell;
            Credits = credits;
            Items = new List<string>(items).AsReadOnly(); // [1] 새 목록에 복사해 읽기 전용으로 감싼다. 저장 뒤 Explorer 의 목록이 바뀌어도 닿지 않는다
        }
    }
}
