// 하네스 어댑터: 코어(ProjectilePool, Turret)와 나쁜 예(NaiveTurret)를 시나리오 입력으로 돌리고 사건과 상태를 글로 꺼낸다.
// 나쁜 예에는 이벤트가 없으므로 입력과 프레임마다 상태를 비교해 쓰고, 버그는 여기서 찾는다 (나쁜 예 코드에는 검사 코드를 넣지 않는다).
// 웹 sim(src/specimens/object-pool-projectiles/sim.ts)의 drain, snapshot 과 같은 글을 만든다.
using System.Collections.Generic;
using System.Text;
using PatternGallery.ObjectPoolProjectiles.Naive;
using PatternGallery.Truth;

namespace PatternGallery.ObjectPoolProjectiles
{
    [SimTarget("object-pool-projectiles")]
    public sealed class Target : ISimTarget
    {
        readonly ProjectilePool pool;
        readonly Turret turret;
        readonly NaiveTurret naive;
        readonly List<string> events = new List<string>();
        bool lastReused;
        bool lastCreated;
        int naiveReuse;
        /// <summary>나쁜 예: 한 번이라도 쏜 탄 (번호 - 1). 나쁜 예에는 빌려 준 횟수가 없어 여기서 센다</summary>
        readonly List<bool> naiveUsed = new List<bool>();
        /// <summary>나쁜 예: 대기 줄에 두 칸 있는 탄 (번호 - 1). 켜지는 순간만 ✖ 로 쓴다</summary>
        readonly List<bool> doubled = new List<bool>();

        public Target(Values v, bool isNaive)
        {
            int poolSize = v.Int("poolSize");
            events.Add($"풀 준비: {poolSize}개 미리 만듦");
            if (isNaive)
            {
                naive = new NaiveTurret(poolSize)
                {
                    fastSpeed = v.Float("fastSpeed"),
                    slowSpeed = v.Float("slowSpeed"),
                };
                return;
            }
            pool = new ProjectilePool();
            pool.Prewarm(poolSize);
            turret = new Turret(new TurretSettings
            {
                FastSpeed = v.Float("fastSpeed"),
                SlowSpeed = v.Float("slowSpeed"),
            }, pool);
            pool.Created += p =>
            {
                events.Add($"#{p.Id} 새로 만듦 · 대기 줄이 비었다 (만든 수 {pool.CreatedCount})");
                lastCreated = true;
            };
            pool.Taken += (p, reused) => lastReused = reused;
            pool.Returned += p => events.Add($"#{p.Id} 반납 · 대기 {pool.IdleCount}");
            pool.ReleaseRejected += p => events.Add($"#{p.Id} 은 이미 대기 중 · 반납 거절");
            turret.Fired += p =>
            {
                events.Add($"{K(p.Kind)} #{p.Id} 발사 ({Source(lastCreated, lastReused)}) · 속도 {Fmt.F(p.Speed)} 수명 {Fmt.F(p.Life)}");
                lastCreated = false;
            };
            turret.Hit += (p, outside) => events.Add(outside ? $"{K(p.Kind)} #{p.Id} 명중 · 같은 프레임에 화면 밖도 참 → 한 번만 반납" : $"{K(p.Kind)} #{p.Id} 명중");
            turret.Expired += (p, outside) => events.Add($"{K(p.Kind)} #{p.Id} {(outside ? "화면 밖" : "수명 끝")}");
        }

        static string K(ProjectileKind kind) => kind == ProjectileKind.Fast ? "빠른 탄" : "냉각탄";

        /// <summary>쏜 탄이 어디서 왔나: 방금 새로 만든 것, 한 번 쓰고 돌아온 것, 미리 만들어 두고 처음 쓰는 것</summary>
        static string Source(bool created, bool reused) => created ? "새 객체" : reused ? "재사용" : "미리 만든 것";

        public void Input(string name)
        {
            if (turret != null)
            {
                if (name == "fast") turret.Fire(ProjectileKind.Fast);
                else if (name == "slow") turret.Fire(ProjectileKind.Slow);
                else turret.StartBurst();
                return;
            }
            int shots = naive.shotsFired;
            int made = naive.pool.all.Count;
            bool[] wasActive = ActiveFlags();
            if (name == "fast") naive.Fire(ProjectileKind.Fast);
            else if (name == "slow") naive.Fire(ProjectileKind.Slow);
            else naive.StartBurst();
            if (naive.shotsFired != shots) NaiveFired(made, wasActive);
        }

        bool[] ActiveFlags()
        {
            var flags = new bool[naive.pool.all.Count];
            for (int i = 0; i < flags.Length; i++) flags[i] = naive.pool.all[i].Active;
            return flags;
        }

        /// <summary>나쁜 예가 방금 쏜 탄 (lastShot) 을 적고, 날던 탄을 또 빌렸는지와 이전 상태가 남았는지 본다</summary>
        void NaiveFired(int madeBefore, bool[] wasActive)
        {
            NaiveProjectile p = naive.lastShot;
            bool created = naive.pool.all.Count != madeBefore;
            if (created) events.Add($"#{p.Id} 새로 만듦 · 대기 줄이 비었다 (만든 수 {naive.pool.all.Count})");
            while (naiveUsed.Count < p.Id) naiveUsed.Add(false);
            bool reused = naiveUsed[p.Id - 1];
            naiveUsed[p.Id - 1] = true;
            if (reused) naiveReuse++;
            events.Add($"{K(p.Kind)} #{p.Id} 발사 ({Source(created, reused)}) · 속도 {Fmt.F(p.Speed)} 수명 {Fmt.F(p.Lifetime)}");
            if (!created && wasActive[p.Id - 1])
                events.Add($"!같은 탄을 또 빌려 줌: 날던 #{p.Id} 이 포구로 돌아간다 (한 발이 사라졌다)");
            float speed = naive.SpeedOf(p.Kind);
            float life = naive.LifeOf(p.Kind);
            if (p.Speed != speed || p.Lifetime != life)
                events.Add($"!이전 상태 재사용: {K(p.Kind)} #{p.Id} 속도 {Fmt.F(p.Speed)} (있어야 할 {Fmt.F(speed)}) · 수명 {Fmt.F(p.Lifetime)} ({Fmt.F(life)})");
        }

        public void Tick(float dt)
        {
            if (turret != null)
            {
                turret.Tick(dt);
                return;
            }
            int shots = naive.shotsFired;
            int made = naive.pool.all.Count;
            bool[] wasActive = ActiveFlags();
            int idleBefore = naive.pool.idle.Count;
            naive.Update(dt);
            bool fired = naive.shotsFired != shots;
            if (fired) NaiveFired(made, wasActive);
            // 연사의 한 발은 탄을 옮기기 전에 쏜다. 그 한 발이 재사용이면 대기 줄 끝에서 하나가 빠졌다
            int start = idleBefore - (fired && naive.pool.all.Count == made ? 1 : 0);
            List<NaiveProjectile> idle = naive.pool.idle;
            int next = start;
            // 탄마다 Update 를 번호 순서로 부르므로 반납도 번호 순서로 쌓인다
            for (int i = 0; i < wasActive.Length; i++)
            {
                NaiveProjectile p = naive.pool.all[i];
                if (!wasActive[i] || p.Active) continue;
                if (p.X >= naive.TargetFrontX)
                    events.Add(p.X >= naive.ScreenRightX ? $"{K(p.Kind)} #{p.Id} 명중 · 같은 프레임에 화면 밖도 참" : $"{K(p.Kind)} #{p.Id} 명중");
                else events.Add($"{K(p.Kind)} #{p.Id} {(p.X >= naive.ScreenRightX ? "화면 밖" : "수명 끝")}");
                while (next < idle.Count && idle[next] == p)
                {
                    next++;
                    events.Add($"#{p.Id} 반납 · 대기 {next}");
                }
            }
            for (int i = 0; i < naive.pool.all.Count; i++)
            {
                NaiveProjectile p = naive.pool.all[i];
                int count = 0;
                foreach (NaiveProjectile q in idle) if (q == p) count++;
                while (doubled.Count <= i) doubled.Add(false);
                if (count > 1 && !doubled[i]) events.Add($"!이중 반납: #{p.Id} 이 대기 줄에 {count}칸 (명중 처리와 화면 밖 처리가 각자 Release)");
                doubled[i] = count > 1;
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
            var s = new StringBuilder();
            if (turret != null)
            {
                s.Append($"made={pool.CreatedCount} active={pool.ActiveCount} idle={pool.IdleCount} reuse={pool.ReuseCount} hits={turret.Hits}");
                foreach (Projectile p in turret.Flying) s.Append($" #{p.Id} x={Fmt.F(p.X)}");
                return s.ToString();
            }
            int active = 0;
            foreach (NaiveProjectile p in naive.pool.all) if (p.Active) active++;
            s.Append($"made={naive.pool.all.Count} active={active} idle={naive.pool.idle.Count} reuse={naiveReuse} hits={naive.hits}");
            foreach (NaiveProjectile p in naive.pool.all) if (p.Active) s.Append($" #{p.Id} x={Fmt.F(p.X)}");
            return s.ToString();
        }
    }
}
