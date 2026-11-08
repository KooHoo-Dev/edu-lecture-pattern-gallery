// 장비 칸 코어: 칸 목록을 private 으로 들고, 바꾸는 메서드는 계산하지 않고 표시(dirty)만 켠다. 총 무게는 읽을 때 표시가 켜져 있으면 한 번 다시 계산한다.
// UnityEngine 을 쓰지 않는다. 연결 컴포넌트(LoadoutInput, HarinMover)와 갤러리 하네스가 같은 이벤트를 듣는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.DirtyFlagLoadout
{
    /// <summary>
    /// 칸 하나를 바깥에 보여 주는 값 복사본. 바깥이 이 값을 고쳐도 Loadout 안의 칸에는 닿지 않는다.
    /// </summary>
    public readonly struct SlotInfo
    {
        public readonly string Name;
        public readonly int Count;
        /// <summary>한 개 무게 (합금이면 이미 줄인 값)</summary>
        public readonly float UnitWeight;
        /// <summary>칸에 붙은 모듈(상자, 거치대) 무게. 개수와 상관없이 칸마다 한 번</summary>
        public readonly float ModuleWeight;
        public readonly bool Alloy;
        /// <summary>이 칸의 무게 = 한 개 무게 × 개수 + 모듈 무게</summary>
        public readonly float Weight;

        public SlotInfo(string name, int count, float unitWeight, float moduleWeight, bool alloy, float weight)
        {
            Name = name;
            Count = count;
            UnitWeight = unitWeight;
            ModuleWeight = moduleWeight;
            Alloy = alloy;
            Weight = weight;
        }
    }

    public sealed class Loadout
    {
        /// <summary>속도 식과 무게 막대의 기준 (한계 무게). 조절 값이 아니라 고정이다</summary>
        public const float MaxWeight = 30f;
        /// <summary>무거워도 이 비율 아래로는 느려지지 않는다</summary>
        public const float MinSpeedRatio = 0.25f;
        /// <summary>가벼운 합금으로 바꾸면 한 개 무게가 이 비율이 된다</summary>
        public const float AlloyRatio = 0.5f;
        public const int MaxSlots = 5;

        /// <summary>안에서만 고치는 칸. 바깥에는 SlotInfo 복사본만 내보낸다</summary>
        sealed class Slot
        {
            public string Name;
            public int Count;
            public float BaseUnitWeight;
            public float ModuleWeight;
            public int MaxStack;
            public bool Alloy;

            public float UnitWeight => Alloy ? BaseUnitWeight * AlloyRatio : BaseUnitWeight;
            public float Weight() => UnitWeight * Count + ModuleWeight;
        }

        // 칸 목록은 private 이다. 바꾸는 길이 아래 메서드뿐이라 어느 길로 바꿔도 표시가 켜진다.
        // 교안 01 의 캡슐화(public get, private set)가 더티 플래그를 지키는 방법이다. 바깥이 목록을 직접 고칠 수 있으면 표시를 건너뛰는 길이 생긴다
        readonly List<Slot> slots = new List<Slot>(); // [1]
        bool dirty = true;
        float cachedWeight;

        /// <summary>다시 계산한 횟수. 바깥은 읽기만 한다 (private set)</summary>
        public int RecalcCount { get; private set; }
        /// <summary>짐이 없을 때의 이동 속도. 속도는 싼 계산이라 캐시하지 않고 읽을 때마다 구한다</summary>
        public float BaseSpeed { get; set; }
        public bool IsDirty => dirty;
        public int SlotCount => slots.Count;
        public SlotInfo this[int index]
        {
            get
            {
                Slot s = slots[index];
                return new SlotInfo(s.Name, s.Count, s.UnitWeight, s.ModuleWeight, s.Alloy, s.Weight());
            }
        }

        /// <summary>묶음 수가 바뀌었다: 이름, 전, 후 (새 칸은 0 → 1, 버리거나 비운 칸은 n → 0). 표시를 켠 뒤에 알린다</summary>
        public event Action<string, int, int> CountChanged;
        /// <summary>한 개 무게가 바뀌었다 (합금): 이름, 전, 후</summary>
        public event Action<string, float, float> UnitWeightChanged;
        /// <summary>받지 않은 입력과 까닭 (아무것도 바뀌지 않았으니 표시도 켜지 않는다)</summary>
        public event Action<string> Ignored;
        /// <summary>다시 계산했다: 새 총 무게, 지금까지 다시 계산한 횟수</summary>
        public event Action<float, int> Recalculated;

        public Loadout(float baseSpeed)
        {
            BaseSpeed = baseSpeed;
        }

        /// <summary>
        /// 총 무게. 표시가 켜져 있으면 한 번 다시 계산하고 끈다. 꺼져 있으면 캐시를 그대로 돌려준다.
        /// 매 프레임 읽어도 계산은 바뀐 뒤 처음 읽을 때 한 번뿐이다
        /// </summary>
        public float TotalWeight
        {
            get
            {
                if (dirty) Recalculate(); // [3] 표시가 켜져 있을 때만 다시 계산한다
                return cachedWeight; // [4] 바뀌지 않았으면 캐시를 그대로 쓴다
            }
        }

        /// <summary>이동 속도 = BaseSpeed × max(0.25, 1 − 총 무게 / 30)</summary>
        public float Speed => BaseSpeed * Math.Max(MinSpeedRatio, 1f - TotalWeight / MaxWeight);

        /// <summary>
        /// 아이템 하나를 넣는다. 같은 이름의 마지막 칸에 자리가 있으면 묶음 +1, 없으면 새 칸.
        /// 묶음에 더할 때는 그 칸의 무게를 쓴다 (unitWeight 는 새 칸일 때만)
        /// </summary>
        public bool Add(string name, float unitWeight, float moduleWeight, int maxStack)
        {
            Slot stack = slots.FindLast(s => s.Name == name);
            if (stack != null && stack.Count < stack.MaxStack)
            {
                stack.Count++;
                MarkDirty(); // [2]
                CountChanged?.Invoke(name, stack.Count - 1, stack.Count);
                return true;
            }
            if (slots.Count >= MaxSlots)
            {
                Ignored?.Invoke("칸이 가득 찼다");
                return false;
            }
            slots.Add(new Slot { Name = name, Count = 1, BaseUnitWeight = unitWeight, ModuleWeight = moduleWeight, MaxStack = maxStack });
            MarkDirty(); // [2]
            CountChanged?.Invoke(name, 0, 1);
            return true;
        }

        /// <summary>마지막 칸을 통째로 버린다</summary>
        public bool RemoveLast()
        {
            if (slots.Count == 0)
            {
                Ignored?.Invoke("버릴 칸이 없다");
                return false;
            }
            Slot last = slots[slots.Count - 1];
            slots.RemoveAt(slots.Count - 1);
            MarkDirty(); // [2]
            CountChanged?.Invoke(last.Name, last.Count, 0);
            return true;
        }

        /// <summary>그 이름의 마지막 칸에서 하나를 쓴다. 0 이 되면 칸을 비운다</summary>
        public bool UseOne(string name)
        {
            Slot slot = slots.FindLast(s => s.Name == name);
            if (slot == null)
            {
                Ignored?.Invoke($"{name} 없음");
                return false;
            }
            slot.Count--;
            if (slot.Count == 0) slots.Remove(slot);
            MarkDirty(); // [2] 수리 키트를 쓰는 길도 같은 표시를 켠다
            CountChanged?.Invoke(name, slot.Count + 1, slot.Count);
            return true;
        }

        /// <summary>그 이름의 첫 칸(아직 합금이 아닌)을 가벼운 합금으로 바꾼다. 한 개 무게가 AlloyRatio 배가 된다</summary>
        public bool Upgrade(string name)
        {
            Slot slot = slots.Find(s => s.Name == name && !s.Alloy);
            if (slot == null)
            {
                Ignored?.Invoke($"합금으로 바꿀 {name} 없음");
                return false;
            }
            float before = slot.UnitWeight;
            slot.Alloy = true;
            MarkDirty(); // [2]
            UnitWeightChanged?.Invoke(name, before, slot.UnitWeight);
            return true;
        }

        /// <summary>그 이름의 칸들의 기본 한 개 무게를 바꾼다 (Play 중 Inspector 값 반영용). 이 길도 표시를 켠다</summary>
        public void SetUnitWeight(string name, float unitWeight)
        {
            foreach (Slot s in slots)
            {
                if (s.Name != name || s.BaseUnitWeight == unitWeight) continue;
                s.BaseUnitWeight = unitWeight;
                MarkDirty();
            }
        }

        /// <summary>바꾸는 메서드는 계산하지 않고 표시만 켠다. 한 프레임에 열 번 바꿔도 계산은 다음에 읽을 때 한 번이다</summary>
        void MarkDirty() => dirty = true; // [2]

        /// <summary>
        /// 비싼 계산이라고 둔다: 칸마다 개수 × 한 개 무게에 모듈 무게까지 더한다.
        /// 실제 게임에서는 모듈 목록, 내구도 보정, 버프까지 도는 계산이다
        /// </summary>
        void Recalculate()
        {
            float sum = 0f;
            foreach (Slot s in slots) sum += s.Weight(); // [3]
            cachedWeight = sum;
            dirty = false; // [3] 다시 계산했으니 표시를 끈다
            RecalcCount++;
            Recalculated?.Invoke(cachedWeight, RecalcCount);
        }
    }
}
