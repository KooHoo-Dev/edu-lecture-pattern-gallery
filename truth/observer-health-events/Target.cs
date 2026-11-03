// 하네스 어댑터: 관찰자 패턴 코어(Health + 구독자)와 나쁜 예(NaivePlayerHealth)를 시나리오 입력으로 돌린다.
// 패턴은 구독자가 알리는 이벤트를 그 순서대로 적는다. 나쁜 예는 이벤트가 없으므로 입력마다 상태를 비교해 적는다.
// 웹 sim(src/specimens/observer-health-events/sim.ts)과 같은 글을 만든다.
using System;
using System.Collections.Generic;
using PatternGallery.ObserverHealthEvents.Naive;
using PatternGallery.Truth;

namespace PatternGallery.ObserverHealthEvents
{
    [SimTarget("observer-health-events")]
    public sealed class Target : ISimTarget
    {
        readonly List<string> events = new List<string>();
        readonly int damage;
        readonly int healAmount;
        readonly float lowRatio;

        // 패턴: 'HP 바 없애기/다시 만들기' 는 컴포넌트의 파괴(OnDisable)와 새로 만들기(OnEnable)다
        readonly Health health;
        HealthBar bar;
        HitSound sound;
        readonly DamageAchievement achievement;
        readonly GameOverPanel gameOver;
        bool barAlive = true;
        bool soundAlive = true;
        bool lastWarning;
        int soundsTotal;

        // 나쁜 예
        readonly NaivePlayerHealth naive;
        NaiveHealthBar shownBar;
        NaiveHitSound shownSound;
        bool deadButNoGameOver;
        string lastBar;
        bool lastNaiveWarning;
        int lastSounds;
        int lastTotal;
        bool lastUnlocked;
        bool lastOver;

        public Target(Values v, bool isNaive)
        {
            damage = v.Int("damage");
            healAmount = v.Int("healAmount");
            lowRatio = v.Float("lowHealthRatio");
            int max = v.Int("maxHealth");
            if (isNaive)
            {
                naive = new NaivePlayerHealth
                {
                    Max = max,
                    Current = max,
                    bar = new NaiveHealthBar { LowRatio = lowRatio },
                    sound = new NaiveHitSound(),
                    achievement = new NaiveAchievement { Threshold = v.Int("achievementDamage") },
                    gameOver = new NaiveGameOver(),
                };
                shownBar = naive.bar;
                shownSound = naive.sound;
                Remember();
                return;
            }
            health = new Health(max);
            health.Changed += c => events.Add($"Health {c.Previous} → {c.Current} (Changed)");
            health.Died += () => events.Add("Health 0 (Died)");
            achievement = new DamageAchievement { Threshold = v.Int("achievementDamage") };
            achievement.Progressed += total => events.Add($"Achievement 누적 피해 {total}");
            achievement.Unlocked += () => events.Add("Achievement 해금: 버텨 낸 탐사대장");
            gameOver = new GameOverPanel();
            gameOver.Shown += () => events.Add("GameOver 표시");
            NewBar();
            NewSound();
            achievement.Bind(health);
            gameOver.Bind(health);
        }

        void NewBar()
        {
            bar = new HealthBar { LowRatio = lowRatio };
            lastWarning = false;
            bar.Updated += OnBarUpdated;
            bar.Bind(health);
        }

        void OnBarUpdated(float fill, bool warning)
        {
            events.Add($"HealthBar 채움 {Fmt.F(fill)}");
            if (warning != lastWarning) events.Add(warning ? "HealthBar 경고 색" : "HealthBar 보통 색");
            lastWarning = warning;
        }

        void NewSound()
        {
            sound = new HitSound();
            sound.Played += _ => events.Add($"HitSound 재생 ({++soundsTotal}번째)");
            sound.Bind(health);
        }

        public void Input(string name)
        {
            if (naive == null) PatternInput(name);
            else
            {
                NaiveInput(name);
                Diff();
            }
        }

        void PatternInput(string name)
        {
            switch (name)
            {
                case "damage": health.Damage(damage); break;
                case "heal": health.Heal(healAmount); break;
                case "bar":
                    if (barAlive)
                    {
                        bar.Unbind();
                        bar.Updated -= OnBarUpdated;
                        events.Add("HealthBar 파괴 → OnDisable 에서 구독 해제");
                    }
                    else
                    {
                        events.Add("새 HealthBar → OnEnable 에서 구독 (지금 값으로 맞춘다)");
                        NewBar();
                    }
                    barAlive = !barAlive;
                    break;
                case "sound":
                    if (soundAlive)
                    {
                        sound.Unbind();
                        events.Add("HitSound 파괴 → OnDisable 에서 구독 해제");
                    }
                    else
                    {
                        events.Add("새 HitSound → OnEnable 에서 구독");
                        NewSound();
                    }
                    soundAlive = !soundAlive;
                    break;
            }
        }

        void NaiveInput(string name)
        {
            switch (name)
            {
                case "damage": Call(() => naive.Damage(damage), true); break;
                case "heal": Call(() => naive.Heal(healAmount), false); break;
                case "bar":
                    if (shownBar != null)
                    {
                        shownBar.Destroyed = true;
                        shownBar = null;
                        events.Add("HealthBar 파괴 (Destroy)");
                    }
                    else
                    {
                        shownBar = new NaiveHealthBar { LowRatio = lowRatio };
                        events.Add("새 HealthBar 생성 (플레이어의 bar 칸은 아직 파괴된 옛 바)");
                        if (naive.Current < naive.Max) events.Add("!새 체력 바가 100% 로 보인다 (아무도 값을 넣지 않는다)");
                    }
                    break;
                case "sound":
                    if (shownSound != null)
                    {
                        shownSound.Destroyed = true;
                        shownSound = null;
                        events.Add("HitSound 파괴 (Destroy)");
                    }
                    else
                    {
                        shownSound = new NaiveHitSound();
                        events.Add("새 HitSound 생성 (플레이어의 sound 칸은 아직 옛 것)");
                    }
                    break;
            }
        }

        void Call(Action action, bool isDamage)
        {
            int before = naive.Current;
            try
            {
                action();
            }
            catch (InvalidOperationException e)
            {
                if (naive.Current != before) events.Add($"Current {before} → {naive.Current}");
                string skipped = e.Message.Contains("HitSound") ? "아래 줄(업적, 게임 오버)이 실행되지 않았다"
                    : isDamage ? "아래 줄(피격음, 업적, 게임 오버)이 실행되지 않았다" : "회복이 바에 보이지 않는다";
                events.Add($"!{e.Message} → {skipped}");
                return;
            }
            if (naive.Current != before) events.Add($"Current {before} → {naive.Current}");
        }

        string BarText() => naive == null ? (barAlive ? Fmt.F(bar.Fill) : "off") : (shownBar != null ? Fmt.F(shownBar.Fill) : "off");

        void Remember()
        {
            lastBar = BarText();
            lastNaiveWarning = shownBar != null && shownBar.Warning;
            lastSounds = naive.sound.PlayCount;
            lastTotal = naive.achievement.TotalDamage;
            lastUnlocked = naive.achievement.Unlocked;
            lastOver = naive.gameOver.Shown;
        }

        /// <summary>나쁜 예: 플레이어가 직접 부른 것들의 상태 변화를 차례로 적는다</summary>
        void Diff()
        {
            string b = BarText();
            if (b != lastBar && b != "off") events.Add($"HealthBar 채움 {b}");
            bool w = shownBar != null && shownBar.Warning;
            if (w && !lastNaiveWarning) events.Add("HealthBar 경고 색");
            if (!w && lastNaiveWarning && b != "off") events.Add("HealthBar 보통 색");
            if (naive.sound.PlayCount > lastSounds) events.Add($"HitSound 재생 ({naive.sound.PlayCount}번째)");
            if (naive.achievement.TotalDamage != lastTotal) events.Add($"Achievement 누적 피해 {naive.achievement.TotalDamage}");
            if (naive.achievement.Unlocked && !lastUnlocked) events.Add("Achievement 해금: 버텨 낸 탐사대장");
            if (naive.gameOver.Shown && !lastOver) events.Add("GameOver 표시");
            if (naive.Current == 0 && !naive.gameOver.Shown && !deadButNoGameOver)
            {
                deadButNoGameOver = true;
                events.Add("!체력이 0 인데 게임 오버 창이 뜨지 않는다");
            }
            Remember();
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
                return $"hp={health.Current} bar={BarText()} sounds={soundsTotal} total={achievement.TotalDamage} unlocked={B(achievement.IsUnlocked)} over={B(gameOver.IsShown)}";
            return $"hp={naive.Current} bar={BarText()} sounds={naive.sound.PlayCount} total={naive.achievement.TotalDamage} unlocked={B(naive.achievement.Unlocked)} over={B(naive.gameOver.Shown)}";
        }

        static int B(bool b) => b ? 1 : 0;
    }
}
