// 하네스 어댑터: 코어(Turret, 조준 전략, DroneWave)와 나쁜 예(NaiveTurret)를 시나리오 입력으로 돌리고 사건과 상태를 글로 꺼낸다.
// 나쁜 예는 이벤트가 없어 프레임마다 레이저 대상과 HP 를 비교해 쓴다 (나쁜 예 코드에는 검사 코드를 넣지 않는다).
// 웹 sim(src/specimens/strategy-turret-targeting/sim.ts)의 drain, snapshot 과 같은 글을 만든다.
using System.Collections.Generic;
using System.Text;
using PatternGallery.StrategyTurretTargeting.Naive;
using PatternGallery.Truth;

namespace PatternGallery.StrategyTurretTargeting
{
    [SimTarget("strategy-turret-targeting")]
    public sealed class Target : ISimTarget
    {
        readonly DroneWave wave;
        readonly Turret turret;
        readonly NaiveTurret naive;
        readonly List<string> events = new List<string>();
        readonly List<Drone> before = new List<Drone>();
        readonly List<int> hpBefore = new List<int>();
        Drone lastAim;
        bool lastMismatch;

        public Target(Values v, bool isNaive)
        {
            wave = new DroneWave(DroneWave.CreateDefaultTable());
            wave.DroneSpawned += d => events.Add($"{d.Name} 등장 (HP {d.Hp})");
            wave.DroneReachedBase += d => events.Add($"{d.Name} 기지 도달 (HP {d.Hp} 남음)");
            if (isNaive)
            {
                naive = new NaiveTurret(wave)
                {
                    range = v.Float("range"),
                    fireInterval = v.Float("fireInterval"),
                    damage = v.Int("damage"),
                };
                return;
            }
            turret = new Turret(wave, Turret.DefaultX, Targeting.Nearest)
            {
                Range = v.Float("range"),
                FireInterval = v.Float("fireInterval"),
                Damage = v.Int("damage"),
            };
            turret.StrategyChanged += (from, to) => events.Add($"조준 방식 {Short(from)} → {Short(to)}");
            turret.TargetChanged += (from, to) => events.Add($"대상 {N(from)} → {N(to)}");
            turret.Fired += (d, damage) => events.Add($"발사 → {d.Name} (HP {d.Hp}/{d.MaxHp})");
            turret.DroneDestroyed += d => events.Add($"{d.Name} 파괴");
        }

        static string N(Drone d) => d == null ? "없음" : d.Name;

        /// <summary>NearestTarget → Nearest</summary>
        static string Short(ITargetingStrategy s) => s.GetType().Name.Replace("Target", "");

        static ITargetingStrategy Parse(string name) => name switch
        {
            "strongest" => Targeting.Strongest,
            "first" => Targeting.First,
            "weakest" => Targeting.Weakest,
            _ => Targeting.Nearest,
        };

        public void Input(string name)
        {
            if (turret != null)
            {
                turret.SetStrategy(Parse(name));
                return;
            }
            if (naive.mode == name) return;
            naive.mode = name;
            events.Add($"mode = \"{name}\"");
        }

        public void Tick(float dt)
        {
            wave.Tick(dt);
            if (turret != null)
            {
                turret.Tick(dt);
                return;
            }

            before.Clear();
            hpBefore.Clear();
            foreach (Drone d in wave.Active)
            {
                before.Add(d);
                hpBefore.Add(d.Hp);
            }
            naive.Update(dt);
            if (naive.aimTarget != lastAim)
            {
                events.Add($"레이저 {N(lastAim)} → {N(naive.aimTarget)}");
                lastAim = naive.aimTarget;
            }
            for (int i = 0; i < before.Count; i++)
            {
                Drone hit = before[i];
                if (hit.Hp == hpBefore[i]) continue;
                events.Add($"발사 → {hit.Name} (HP {hit.Hp}/{hit.MaxHp})");
                if (!hit.IsAlive) events.Add($"{hit.Name} 파괴");
                bool mismatch = hit != naive.aimTarget;
                if (mismatch && !lastMismatch) events.Add($"!조준 엇갈림: 레이저 {N(naive.aimTarget)}, 명중 {hit.Name}");
                lastMismatch = mismatch;
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
            var sb = new StringBuilder();
            if (turret != null) sb.Append($"방식={Short(turret.Strategy)} 대상={N(turret.CurrentTarget)} cd={Fmt.F(turret.Cooldown)}");
            else sb.Append($"mode={naive.mode} 레이저={N(naive.aimTarget)}");
            foreach (Drone d in wave.Active) sb.Append($" {d.Name} x={Fmt.F(d.X)} hp={d.Hp}");
            return sb.ToString();
        }
    }
}
