// 하네스 어댑터: 더티 플래그 코어(Loadout)와 나쁜 예(NaiveLoadout + NaiveRepairKit)를 시나리오 입력으로 돌린다.
// 패턴은 코어 이벤트를 불린 순서대로 적는다. 나쁜 예는 이벤트가 없으므로 입력마다 칸을 비교해 적고,
// 캐시된 총 무게와 칸의 실제 합을 비교해 옛 무게 버그를 찾는다 (나쁜 예 코드에는 검사 코드를 넣지 않는다).
// Tick 은 HarinMover.Update 처럼 매 프레임 속도를 읽고 하린을 좌우로 걷게 한다.
// 웹 sim(src/specimens/dirty-flag-loadout/sim.ts)과 같은 글을 만든다.
using System.Collections.Generic;
using PatternGallery.DirtyFlagLoadout.Naive;
using PatternGallery.Truth;

namespace PatternGallery.DirtyFlagLoadout
{
    [SimTarget("dirty-flag-loadout")]
    public sealed class Target : ISimTarget
    {
        /// <summary>하린이 걷는 구간 (무대 x). 화면 연출만, 규칙과 상관없다</summary>
        const float Left = 1.2f;
        const float Right = 14.8f;

        readonly List<string> events = new List<string>();
        readonly float kitWeight;
        readonly float cellWeight;
        float x = Left;
        float dir = 1f;

        // 패턴
        readonly Loadout loadout;

        // 나쁜 예
        readonly NaiveLoadout naive;
        bool stale;
        float lastActual;
        string lastInput = "";

        public Target(Values v, bool isNaive)
        {
            kitWeight = v.Float("kitWeight");
            cellWeight = v.Float("cellWeight");
            float baseSpeed = v.Float("baseSpeed");
            if (isNaive)
            {
                naive = new NaiveLoadout { baseSpeed = baseSpeed };
                naive.Add(Items.Oxygen, Items.OxygenWeight, Items.OxygenModule, 1);
                naive.Add(Items.Kit, kitWeight, Items.KitModule, Items.KitStack);
                naive.Add(Items.Kit, kitWeight, Items.KitModule, Items.KitStack);
                naive.Add(Items.Cell, cellWeight, Items.CellModule, Items.CellStack);
                ReadNaiveSpeed();
                lastActual = Actual();
                return;
            }
            loadout = new Loadout(baseSpeed);
            Items.FillStarter(loadout, kitWeight, cellWeight);
            loadout.CountChanged += (name, before, after) => events.Add($"{CountText(name, before, after)} · 표시 {(loadout.IsDirty ? "켬" : "안 켬")}");
            loadout.UnitWeightChanged += (name, before, after) => events.Add($"{name} 합금: 한 개 {Fmt.F(before)} → {Fmt.F(after)} · 표시 {(loadout.IsDirty ? "켬" : "안 켬")}");
            loadout.Ignored += reason => events.Add($"받지 않음: {reason}");
            loadout.Recalculated += (weight, count) => events.Add(RecalcText(count, weight, loadout.Speed));
            // LoadoutInput.OnEnable 처럼 켜질 때 지금 값으로 맞춘다 (처음에는 표시가 켜져 있어 여기서 첫 계산)
            _ = loadout.TotalWeight;
        }

        static string CountText(string name, int before, int after)
        {
            string tail = before == 0 ? " (새 칸)" : after == 0 ? " (칸 비움)" : "";
            return $"{name} {before} → {after}{tail}";
        }

        static string RecalcText(int count, float weight, float speed) => $"다시 계산 {count}회 → 총 무게 {Fmt.F(weight)} · 속도 {Fmt.F(speed)}";

        public void Input(string name)
        {
            if (naive == null)
            {
                switch (name)
                {
                    case "pickup": loadout.Add(Items.Cell, cellWeight, Items.CellModule, Items.CellStack); break;
                    case "drop": loadout.RemoveLast(); break;
                    case "useKit": loadout.UseOne(Items.Kit); break;
                    case "upgrade": loadout.Upgrade(Items.Oxygen); break;
                }
                return;
            }
            var before = Capture();
            switch (name)
            {
                case "pickup": naive.Add(Items.Cell, cellWeight, Items.CellModule, Items.CellStack); lastInput = "줍기가"; break;
                case "drop": naive.RemoveLast(); lastInput = "버리기가"; break;
                case "useKit": NaiveRepairKit.Use(naive); break;
                case "upgrade": naive.Upgrade(Items.Oxygen); lastInput = "합금 업그레이드가"; break;
            }
            Diff(before);
            CheckStale();
        }

        /// <summary>나쁜 예의 칸을 (이름, 개수, 한 개 무게) 로 베낀다</summary>
        List<(string name, int count, float unit)> Capture()
        {
            var list = new List<(string, int, float)>();
            foreach (NaiveSlot s in naive.slots) list.Add((s.name, s.count, Unit(s)));
            return list;
        }

        static float Unit(NaiveSlot s) => s.alloy ? s.unitWeight * NaiveLoadout.AlloyRatio : s.unitWeight;

        /// <summary>나쁜 예: 입력 전후의 칸을 비교해 바뀐 것 하나를 패턴과 같은 글로 적는다</summary>
        void Diff(List<(string name, int count, float unit)> before)
        {
            string flag = $" · 표시 {(naive.isDirty ? "켬" : "안 켬")}";
            var after = naive.slots;
            int n = System.Math.Min(before.Count, after.Count);
            int i = 0;
            while (i < n && before[i].name == after[i].name && before[i].count == after[i].count && before[i].unit == Unit(after[i])) i++;
            if (after.Count > before.Count) events.Add(CountText(after[i].name, 0, after[i].count) + flag);
            else if (after.Count < before.Count) events.Add(CountText(before[i].name, before[i].count, 0) + flag);
            else if (i < n && before[i].count != after[i].count) events.Add(CountText(after[i].name, before[i].count, after[i].count) + flag);
            else if (i < n) events.Add($"{after[i].name} 합금: 한 개 {Fmt.F(before[i].unit)} → {Fmt.F(Unit(after[i]))}{flag}");
            else events.Add("바뀐 것 없음");
        }

        /// <summary>칸의 실제 합 (어댑터가 public 칸에서 직접 더한다. 나쁜 예의 캐시와 비교하는 데만 쓴다)</summary>
        float Actual()
        {
            float sum = 0f;
            foreach (NaiveSlot s in naive.slots) sum += Unit(s) * s.count + s.moduleWeight;
            return sum;
        }

        /// <summary>표시가 꺼져 있는데 캐시가 실제 합과 다르면 옛 무게다. 같은 버그가 이어지는 동안은 한 번만 ✖</summary>
        void CheckStale()
        {
            if (naive.isDirty) return; // 다음에 읽을 때 다시 계산한다
            float actual = Actual();
            bool off = naive.cachedWeight != actual;
            if (off && !stale)
            {
                stale = true;
                events.Add($"!옛 무게: 캐시 {Fmt.F(naive.cachedWeight)} · 실제 {Fmt.F(actual)} (무게와 속도가 그대로)");
            }
            else if (off && actual != lastActual) events.Add($"캐시 {Fmt.F(naive.cachedWeight)} 그대로 · 실제 {Fmt.F(actual)}");
            else if (!off && stale)
            {
                stale = false;
                events.Add($"무게 다시 맞음: {lastInput} 켠 표시로 수리 키트 몫까지 다시 계산");
            }
            lastActual = actual;
        }

        float ReadNaiveSpeed()
        {
            int count = naive.recalcCount;
            float speed = naive.Speed;
            if (naive.recalcCount != count) events.Add(RecalcText(naive.recalcCount, naive.cachedWeight, speed));
            return speed;
        }

        /// <summary>HarinMover.Update 와 같다: 매 프레임 속도를 읽고 좌우로 걷는다</summary>
        public void Tick(float dt)
        {
            float speed;
            if (naive == null) speed = loadout.Speed;
            else
            {
                speed = ReadNaiveSpeed();
                CheckStale();
            }
            x += dir * speed * dt;
            if (x >= Right)
            {
                x = Right;
                dir = -1f;
            }
            else if (x <= Left)
            {
                x = Left;
                dir = 1f;
            }
        }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        public string Snapshot()
        {
            if (naive == null)
            {
                float real = 0f;
                var counts = new List<string>();
                for (int i = 0; i < loadout.SlotCount; i++)
                {
                    real += loadout[i].Weight;
                    counts.Add(loadout[i].Count.ToString());
                }
                return $"w={Fmt.F(loadout.TotalWeight)} real={Fmt.F(real)} speed={Fmt.F(loadout.Speed)} recalcs={loadout.RecalcCount} x={Fmt.F(x)} slots={Join(counts)}";
            }
            var naiveCounts = new List<string>();
            foreach (NaiveSlot s in naive.slots) naiveCounts.Add(s.count.ToString());
            return $"w={Fmt.F(naive.TotalWeight)} real={Fmt.F(Actual())} speed={Fmt.F(naive.Speed)} recalcs={naive.recalcCount} x={Fmt.F(x)} slots={Join(naiveCounts)}";
        }

        static string Join(List<string> parts) => parts.Count == 0 ? "-" : string.Join("/", parts);
    }
}
