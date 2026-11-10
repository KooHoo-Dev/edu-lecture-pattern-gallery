// 하네스 어댑터: 메멘토 패턴 코어(Explorer, ExplorerMemento, Checkpoint)와 나쁜 예(NaiveCheckpoint)를 시나리오 입력으로 돌리고 사건과 상태를 글로 꺼낸다.
// 패턴은 코어의 이벤트를 불린 순서대로 적는다. 나쁜 예는 이벤트가 없으므로 입력마다 상태를 비교해 적고,
// 저장한 순간의 인벤토리를 어댑터가 따로 복사해 두어 '있어야 할 것' 으로 삼아 버그를 찾는다 (나쁜 예 코드에는 검사 코드를 넣지 않는다).
// 웹 sim(src/specimens/memento-checkpoint/sim.ts)과 같은 글을 만든다.
using System.Collections.Generic;
using PatternGallery.MementoCheckpoint.Naive;
using PatternGallery.Truth;

namespace PatternGallery.MementoCheckpoint
{
    [SimTarget("memento-checkpoint")]
    public sealed class Target : ISimTarget
    {
        const string Fragment = "회로 조각";
        const int StartCell = 1;

        readonly List<string> events = new List<string>();
        readonly Explorer explorer;
        readonly Checkpoint checkpoint;
        readonly int fragmentValue;
        readonly int hurtDamage;
        readonly NaiveCheckpoint naive;
        /// <summary>나쁜 예: 저장한 순간의 인벤토리 (어댑터가 따로 복사한 '있어야 할 것'). 저장 전 null</summary>
        List<string> savedItems;

        public Target(Values v, bool isNaive)
        {
            fragmentValue = v.Int("fragmentValue");
            hurtDamage = v.Int("hurtDamage");
            if (isNaive)
            {
                naive = new NaiveCheckpoint(v.Int("maxHp"), StartCell)
                {
                    fragmentValue = fragmentValue,
                    hurtDamage = hurtDamage,
                };
                return;
            }
            explorer = new Explorer(v.Int("maxHp"), StartCell);
            checkpoint = new Checkpoint(explorer);
            explorer.Walked += cell => events.Add(WalkLine(cell));
            explorer.PickedUp += (item, gained) => events.Add(PickLine(gained, explorer.Items.Count, explorer.Credits, ""));
            explorer.Hurt += amount => events.Add(HurtLine(amount, explorer.Hp));
            explorer.Downed += () => events.Add(DownLine);
            explorer.Restored += () => events.Add(RestoreLine(explorer.Hp, explorer.Cell, explorer.Credits, explorer.Items.Count));
            explorer.InputIgnored += input => events.Add(Ignored(input, explorer.IsDown));
            checkpoint.Saved += m => events.Add(SaveLine(m.Hp, m.Cell, m.Credits, m.Items.Count, false));
            checkpoint.SaveRefused += () => events.Add(SaveRefusedLine);
            checkpoint.NothingToRestore += () => events.Add(NothingLine);
        }

        static string WalkLine(int cell) => $"한 칸 이동 → 칸 {cell}";
        static string PickLine(int gained, int count, int credits, string tail) => $"{Fragment} 주움 (+{gained}) → 인벤토리 {count}개 크레딧 {credits}{tail}";
        static string HurtLine(int amount, int hp) => $"피해 {amount} → HP {hp}";
        const string DownLine = "쓰러짐 (HP 0)";
        static string RestoreLine(int hp, int cell, int credits, int count) => $"되살림 · HP {hp} 칸 {cell} 크레딧 {credits} 인벤토리 {count}개";
        static string SaveLine(int hp, int cell, int credits, int count, bool shared) =>
            $"저장 · HP {hp} 칸 {cell} 크레딧 {credits} 인벤토리 {count}개 ({(shared ? "지금 목록을 그대로 가리킴" : "새 목록에 복사")})";
        const string SaveRefusedLine = "쓰러져 있어 저장하지 않음";
        const string NothingLine = "되살릴 저장본이 없다";

        static string Ignored(string input, bool down)
        {
            if (!down) return "끝 칸이라 더 가지 않음";
            string label = input == "walk" ? "이동" : input == "pickup" ? "줍기" : "피해";
            return $"쓰러져 있어 받지 않음 ({label})";
        }

        public void Input(string name)
        {
            if (naive == null)
            {
                switch (name)
                {
                    case "save": checkpoint.Save(); break;
                    case "pickup": explorer.PickUp(Fragment, fragmentValue); break;
                    case "hurt": explorer.TakeDamage(hurtDamage); break;
                    case "restore": checkpoint.Respawn(); break;
                    case "walk": explorer.Walk(); break;
                }
                return;
            }

            NaivePlayer p = naive.player;
            int hp0 = p.hp;
            int cell0 = p.cell;
            int count0 = p.items.Count;
            SaveData saved0 = naive.saved;
            switch (name)
            {
                case "save": naive.OnSave(); break;
                case "pickup": naive.OnPickup(); break;
                case "hurt": naive.OnHurt(); break;
                case "restore": naive.OnRestore(); break;
                case "walk": naive.OnWalk(); break;
            }
            p = naive.player;
            bool down = p.hp == 0;

            if (name == "walk")
                events.Add(p.cell != cell0 ? WalkLine(p.cell) : Ignored("walk", down));
            else if (name == "pickup")
            {
                if (p.items.Count == count0) events.Add(Ignored("pickup", down));
                else
                {
                    bool shared = naive.saved != null && ReferenceEquals(naive.saved.items, p.items);
                    string tail = shared ? $" · 저장본 인벤토리도 {naive.saved.items.Count}개 (같은 목록)" : "";
                    events.Add(PickLine(naive.fragmentValue, p.items.Count, p.credits, tail));
                }
            }
            else if (name == "hurt")
            {
                if (p.hp == hp0) events.Add(Ignored("hurt", down));
                else
                {
                    events.Add(HurtLine(naive.hurtDamage, p.hp));
                    if (down) events.Add(DownLine);
                }
            }
            else if (name == "save")
            {
                if (ReferenceEquals(naive.saved, saved0)) events.Add(SaveRefusedLine);
                else
                {
                    SaveData s = naive.saved;
                    savedItems = new List<string>(s.items);
                    events.Add(SaveLine(s.hp, s.cell, s.credits, s.items.Count, ReferenceEquals(s.items, p.items)));
                }
            }
            else if (name == "restore")
            {
                if (naive.saved == null) events.Add(NothingLine);
                else
                {
                    events.Add(RestoreLine(p.hp, p.cell, p.credits, p.items.Count));
                    // 되살리기 한 번이 대상이다: 저장한 순간의 인벤토리로 돌아오지 않았으면 그 되살리기에 한 번 적는다
                    if (!SameItems(p.items, savedItems))
                        events.Add($"!인벤토리 안 돌아옴: 저장 뒤 주운 {Fragment} {p.items.Count - savedItems.Count}개가 그대로 (저장할 때 {savedItems.Count}개, 되살린 뒤 {p.items.Count}개) · 크레딧은 저장한 값 {p.credits} 이 돌아옴");
                }
            }
        }

        static bool SameItems(List<string> a, List<string> b)
        {
            if (a.Count != b.Count) return false;
            for (int i = 0; i < a.Count; i++) if (a[i] != b[i]) return false;
            return true;
        }

        public void Tick(float dt) { }

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
                ExplorerMemento m = checkpoint.Memento;
                string save = m == null ? "saved=0" : $"saved=1 shp={m.Hp} scell={m.Cell} scredits={m.Credits} sitems={m.Items.Count}";
                return $"hp={explorer.Hp} cell={explorer.Cell} credits={explorer.Credits} items={explorer.Items.Count} {save}";
            }
            NaivePlayer p = naive.player;
            SaveData s = naive.saved;
            string nsave = s == null
                ? "saved=0"
                : $"saved=1 shp={s.hp} scell={s.cell} scredits={s.credits} sitems={s.items.Count} shared={(ReferenceEquals(s.items, p.items) ? 1 : 0)} expect={savedItems.Count}";
            return $"hp={p.hp} cell={p.cell} credits={p.credits} items={p.items.Count} {nsave}";
        }
    }
}
