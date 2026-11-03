// 하네스 어댑터: 프로토타입 패턴 코어(Hangar, ScoutDrone)와 나쁜 예(NaiveHangar)를 시나리오 입력으로 돌리고 사건과 상태를 글로 꺼낸다.
// 패턴은 Hangar 의 이벤트를 불린 순서대로 적는다. 나쁜 예는 이벤트가 없으므로 입력마다 상태를 비교해 적고,
// 같은 입력을 받는 코어(그림자)의 모듈 목록을 '있어야 할 것' 으로 삼아 버그를 찾는다 (나쁜 예 코드에는 검사 코드를 넣지 않는다).
// 웹 sim(src/specimens/prototype-drone-clone/sim.ts)과 같은 글을 만든다.
using System.Collections.Generic;
using System.Linq;
using PatternGallery.PrototypeDroneClone.Naive;
using PatternGallery.Truth;

namespace PatternGallery.PrototypeDroneClone
{
    [SimTarget("prototype-drone-clone")]
    public sealed class Target : ISimTarget
    {
        readonly List<string> events = new List<string>();
        readonly Hangar hangar;
        readonly NaiveHangar naive;
        bool sharedBug;
        bool templateBug;
        string lastModuleTarget = "";

        public Target(Values v, bool isNaive)
        {
            hangar = new Hangar(ScoutDrone.CreateDefaultTemplate())
            {
                MaxClones = v.Int("maxClones"),
                DamageAmount = v.Int("damageAmount"),
                UpgradeSpeed = v.Float("upgradeSpeed"),
            };
            if (isNaive)
            {
                naive = new NaiveHangar
                {
                    maxClones = v.Int("maxClones"),
                    damageAmount = v.Int("damageAmount"),
                    upgradeSpeed = v.Float("upgradeSpeed"),
                };
                return; // 그림자 코어의 사건은 적지 않는다
            }
            hangar.Cloned += d => events.Add(CloneLine(d.Name, d.Hp, d.Speed, d.Modules, hangar.Template.Modules));
            hangar.CloneRejected += max => events.Add(Rejected(max));
            hangar.ModuleAttached += (d, m) => events.Add(Attached(d.Name, m, d.Modules));
            hangar.Damaged += (d, amount) => events.Add(DamagedLine(d.Name, amount, d.Hp));
            hangar.TemplateUpgraded += (from, to) => events.Add(Upgraded(from, to));
            hangar.NoClone += input => events.Add(NoCloneLine(input));
        }

        static string Mods(List<string> m) => "[" + string.Join(" ", m) + "]";

        static string CloneLine(string name, int hp, float speed, List<string> modules, List<string> templateModules) =>
            $"복제 {name} · HP {hp} 속도 {Fmt.F(speed)} · 모듈 {Mods(modules)} ({(ReferenceEquals(modules, templateModules) ? "견본과 같은 목록" : "새 목록")})";

        static string Rejected(int max) => $"복제 거절: 활주로가 가득 찼다 ({max}/{max})";
        static string Attached(string name, string module, List<string> modules) => $"{name} 에 {module} 장착 → {name} 모듈 {Mods(modules)}";
        static string DamagedLine(string name, int amount, int hp) => $"{name} 피해 {amount} → HP {hp}";
        static string Upgraded(float from, float to) => $"견본 개조: 속도 {Fmt.F(from)} → {Fmt.F(to)} (이미 나간 복제본은 그대로)";
        static string NoCloneLine(string input) => $"복제본이 없다 ({(input == "module" ? "모듈 장착" : "피해")})";

        void CoreInput(string name)
        {
            switch (name)
            {
                case "clone": hangar.CloneTemplate(); break;
                case "module": hangar.AttachModule(); break;
                case "damage": hangar.DamageFirst(); break;
                case "upgrade": hangar.UpgradeTemplate(); break;
            }
        }

        public void Input(string name)
        {
            CoreInput(name);
            if (naive == null) return;

            int count0 = naive.clones.Count;
            float speed0 = naive.template.Speed;
            switch (name)
            {
                case "clone": naive.OnClone(); break;
                case "module": naive.OnModule(); break;
                case "damage": naive.OnDamage(); break;
                case "upgrade": naive.OnUpgrade(); break;
            }

            if (name == "clone")
            {
                if (naive.clones.Count == count0) events.Add(Rejected(naive.maxClones));
                else
                {
                    NaiveScoutDrone d = naive.clones[naive.clones.Count - 1];
                    events.Add(CloneLine(d.Name, d.Hp, d.Speed, d.Modules, naive.template.Modules));
                    string expected = Mods(hangar.Clones[naive.clones.Count - 1].Modules);
                    if (Mods(d.Modules) != expected) events.Add($"{d.Name} 가 {naive.moduleName} 모듈을 달고 나왔다 (있어야 할 모듈 {expected})");
                }
            }
            else if (name == "module")
            {
                if (count0 == 0) events.Add(NoCloneLine("module"));
                else
                {
                    NaiveScoutDrone d = naive.clones[count0 - 1];
                    lastModuleTarget = d.Name;
                    events.Add(Attached(d.Name, naive.moduleName, d.Modules));
                }
            }
            else if (name == "damage")
            {
                if (count0 == 0) events.Add(NoCloneLine("damage"));
                else events.Add(DamagedLine(naive.clones[0].Name, naive.damageAmount, naive.clones[0].Hp));
            }
            else if (name == "upgrade") events.Add(Upgraded(speed0, naive.template.Speed));

            FindBugs();
        }

        /// <summary>나쁜 예의 모듈 목록을 그림자 코어(있어야 할 것)와 비교한다. 같은 버그는 켜지는 순간 한 번만 적는다</summary>
        void FindBugs()
        {
            var wrong = new List<string>();
            for (int i = 0; i < naive.clones.Count; i++)
                if (Mods(naive.clones[i].Modules) != Mods(hangar.Clones[i].Modules)) wrong.Add(naive.clones[i].Name);
            if (!sharedBug && wrong.Count > 0)
            {
                sharedBug = true;
                events.Add($"!모듈 공유: {string.Join(" ", wrong)} 에도 {naive.moduleName} 모듈이 보인다 (단 것은 {lastModuleTarget} 하나)");
            }
            if (!templateBug && Mods(naive.template.Modules) != Mods(hangar.Template.Modules))
            {
                templateBug = true;
                events.Add($"!견본 오염: 견본 목록에도 {naive.moduleName} 모듈이 생겼다 (다음 복제본이 달고 나온다)");
            }
        }

        public void Tick(float dt) { }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        /// <summary>견본과 복제본 가운데 같은 Modules 목록을 가리키는 가장 큰 무리의 크기. 모두 따로면 0</summary>
        static int Shared(List<List<string>> lists)
        {
            int best = 0;
            foreach (var a in lists)
            {
                int n = lists.Count(b => ReferenceEquals(a, b));
                if (n > best) best = n;
            }
            return best > 1 ? best : 0;
        }

        static string Join<T>(IEnumerable<T> items, System.Func<T, string> f)
        {
            string s = string.Join(",", items.Select(f));
            return s.Length > 0 ? s : "-";
        }

        public string Snapshot()
        {
            if (naive == null)
            {
                var all = new List<List<string>> { hangar.Template.Modules };
                all.AddRange(hangar.Clones.Select(d => d.Modules));
                return $"clones={hangar.Clones.Count} tspeed={Fmt.F(hangar.Template.Speed)} tmods={hangar.Template.Modules.Count} hp={Join(hangar.Clones, d => d.Hp.ToString())} speed={Join(hangar.Clones, d => Fmt.F(d.Speed))} mods={Join(hangar.Clones, d => d.Modules.Count.ToString())} shared={Shared(all)}";
            }
            var lists = new List<List<string>> { naive.template.Modules };
            lists.AddRange(naive.clones.Select(d => d.Modules));
            return $"clones={naive.clones.Count} tspeed={Fmt.F(naive.template.Speed)} tmods={naive.template.Modules.Count} hp={Join(naive.clones, d => d.Hp.ToString())} speed={Join(naive.clones, d => Fmt.F(d.Speed))} mods={Join(naive.clones, d => d.Modules.Count.ToString())} shared={Shared(lists)} emods={Join(hangar.Clones, d => d.Modules.Count.ToString())}";
        }
    }
}
