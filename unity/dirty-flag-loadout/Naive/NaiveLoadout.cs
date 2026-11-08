// 나쁜 예: 캐시와 isDirty 표시는 있지만 칸 목록과 묶음 수가 public 이다. 수리 키트를 쓰는 바깥 코드가 count-- 만 하고 표시를 켜지 않는다. 흔한 코드다.
// 실제로는 NaiveLoadout 은 하린의 MonoBehaviour, NaiveRepairKit 은 수리 키트를 쓰는 다른 MonoBehaviour(회복 버튼 등) 안에 있는 코드다.
// 갤러리의 '효과 끄기' 가 같은 입력으로 돌린다. 프로젝트에 넣지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.DirtyFlagLoadout.Naive
{
    public sealed class NaiveSlot
    {
        public string name;
        public int count;
        public float unitWeight;
        public float moduleWeight;
        public int maxStack;
        public bool alloy;
    }

    public sealed class NaiveLoadout
    {
        public const float MaxWeight = 30f;
        public const float MinSpeedRatio = 0.25f;
        public const float AlloyRatio = 0.5f;
        public const int MaxSlots = 5;

        public List<NaiveSlot> slots = new List<NaiveSlot>(); // [!] 바깥에 열어 두어 표시를 건너뛰고 고치는 길이 생긴다
        public bool isDirty = true;
        public float cachedWeight;
        public int recalcCount;
        public float baseSpeed = 4f;

        public float TotalWeight
        {
            get
            {
                if (isDirty)
                {
                    float sum = 0f;
                    foreach (NaiveSlot s in slots) sum += (s.alloy ? s.unitWeight * AlloyRatio : s.unitWeight) * s.count + s.moduleWeight;
                    cachedWeight = sum;
                    isDirty = false;
                    recalcCount++;
                }
                return cachedWeight;
            }
        }

        public float Speed => baseSpeed * Math.Max(MinSpeedRatio, 1f - TotalWeight / MaxWeight);

        public void Add(string name, float unitWeight, float moduleWeight, int maxStack)
        {
            NaiveSlot stack = slots.FindLast(s => s.name == name);
            if (stack != null && stack.count < stack.maxStack)
            {
                stack.count++;
                isDirty = true;
                return;
            }
            if (slots.Count >= MaxSlots) return;
            slots.Add(new NaiveSlot { name = name, count = 1, unitWeight = unitWeight, moduleWeight = moduleWeight, maxStack = maxStack });
            isDirty = true;
        }

        public void RemoveLast()
        {
            if (slots.Count == 0) return;
            slots.RemoveAt(slots.Count - 1);
            isDirty = true;
        }

        public void Upgrade(string name)
        {
            NaiveSlot slot = slots.Find(s => s.name == name && !s.alloy);
            if (slot == null) return;
            slot.alloy = true;
            isDirty = true;
        }
    }

    /// <summary>수리 키트를 쓰는 바깥 코드. 칸 목록이 public 이라 직접 고친다</summary>
    public static class NaiveRepairKit
    {
        public static void Use(NaiveLoadout loadout)
        {
            NaiveSlot slot = loadout.slots.FindLast(s => s.name == "수리 키트");
            if (slot == null) return;
            slot.count--;
            if (slot.count == 0) loadout.slots.Remove(slot);
            // [!] 여기서 isDirty = true 를 켜지 않는다 (옛 무게가 남는다)
        }
    }
}
