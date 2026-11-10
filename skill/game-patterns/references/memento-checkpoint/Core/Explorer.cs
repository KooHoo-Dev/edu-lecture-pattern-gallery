// 탐사대장 하린(원래 객체): HP, 위치(칸), 인벤토리, 크레딧을 들고, 자기 상태를 값으로 떠 메멘토를 만들거나 메멘토의 값으로 자기를 덮는다.
// 일어난 일은 C# event 로 알린다. 시간이 흐르는 규칙이 없어 Tick 이 없다. UnityEngine 을 쓰지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.MementoCheckpoint
{
    public sealed class Explorer
    {
        /// <summary>걸을 수 있는 마지막 칸 (첫 칸은 0)</summary>
        public const int LastCell = 8;

        public int MaxHp { get; }
        public int Hp { get; private set; }
        public int Cell { get; private set; }
        public int Credits { get; private set; }
        readonly List<string> items = new List<string>();
        /// <summary>지금 인벤토리. 바깥에는 읽기 전용으로만 보인다</summary>
        public IReadOnlyList<string> Items => items;
        public bool IsDown => Hp == 0;

        /// <summary>한 칸 걸었다 (지금 칸)</summary>
        public event Action<int> Walked;
        /// <summary>아이템을 주웠다 (아이템, 더한 크레딧)</summary>
        public event Action<string, int> PickedUp;
        /// <summary>피해를 입었다 (피해량). 지금 HP 는 Hp 로 읽는다</summary>
        public event Action<int> Hurt;
        /// <summary>HP 가 0 이 되어 쓰러졌다</summary>
        public event Action Downed;
        /// <summary>메멘토의 값으로 자기를 덮었다</summary>
        public event Action Restored;
        /// <summary>입력을 받지 않았다 (walk, pickup, hurt). 쓰러져 있거나 끝 칸이다</summary>
        public event Action<string> InputIgnored;

        public Explorer(int maxHp, int startCell)
        {
            MaxHp = Math.Max(1, maxHp);
            Hp = MaxHp;
            Cell = Math.Max(0, Math.Min(LastCell, startCell));
        }

        /// <summary>오른쪽으로 한 칸 걷는다</summary>
        public void Walk()
        {
            if (IsDown || Cell >= LastCell)
            {
                InputIgnored?.Invoke("walk");
                return;
            }
            Cell++;
            Walked?.Invoke(Cell);
        }

        /// <summary>아이템을 인벤토리에 넣고 크레딧을 더한다</summary>
        public void PickUp(string item, int credits)
        {
            if (IsDown)
            {
                InputIgnored?.Invoke("pickup");
                return;
            }
            int gained = Math.Max(0, credits);
            items.Add(item); // [4] 지금 목록에만 들어간다. 메멘토는 저장할 때 따로 뜬 복사본이라 그대로다
            Credits += gained;
            PickedUp?.Invoke(item, gained);
        }

        /// <summary>피해를 입는다. HP 가 0 이 되면 쓰러진다</summary>
        public void TakeDamage(int amount)
        {
            if (IsDown || amount <= 0)
            {
                InputIgnored?.Invoke("hurt");
                return;
            }
            Hp = Math.Max(0, Hp - amount);
            bool downedNow = Hp == 0; // 이 호출이 쓰러뜨렸는지 먼저 기억한다 (Hurt 핸들러가 다시 TakeDamage 를 불러도 Downed 가 두 번 나지 않게)
            Hurt?.Invoke(amount);
            if (downedNow && IsDown) Downed?.Invoke(); // Hurt 핸들러가 그 사이에 되살렸으면 쓰러졌다고 알리지 않는다
        }

        /// <summary>지금 상태를 값으로 떠서 메멘토를 만든다</summary>
        public ExplorerMemento CreateMemento()
        {
            return new ExplorerMemento(Hp, Cell, Credits, items); // [1] 지금 상태를 값으로 뜬다 (목록은 메멘토가 새 목록에 복사한다)
        }

        /// <summary>메멘토의 값으로 자기를 덮는다. 같은 메멘토로 몇 번이든 되살릴 수 있다</summary>
        public void Restore(ExplorerMemento memento)
        {
            if (memento == null) throw new ArgumentNullException(nameof(memento));
            Hp = memento.Hp; // [3] 메멘토의 값으로 자기를 덮는다
            Cell = memento.Cell; // [3]
            Credits = memento.Credits; // [3]
            items.Clear(); // [3] 목록은 바꿔 끼우지 않고 내용만 덮는다. 메멘토의 복사본은 그대로 남는다
            items.AddRange(memento.Items); // [3]
            Restored?.Invoke(); // 모든 값을 덮은 뒤에 알린다 (핸들러가 반쯤 덮인 상태를 읽지 않게)
        }
    }
}
