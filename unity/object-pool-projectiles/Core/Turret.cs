// 포탑 코어: 풀에서 탄을 빌려 Launch 로 새로 맞춰 쏘고, 매 프레임 탄을 옮기며 명중·화면 밖·수명 끝을 한 곳에서 판정해 한 번만 돌려준다.
using System;
using System.Collections.Generic;

namespace PatternGallery.ObjectPoolProjectiles
{
    /// <summary>규칙 값. TurretFire 가 Inspector 값으로 채워 넘기고, Play 중 값을 바꾸면 OnValidate 가 다시 넣는다</summary>
    public sealed class TurretSettings
    {
        public float FastSpeed = 14f;
        public float SlowSpeed = 6f;
        /// <summary>빠른 탄의 수명. 짧아서 표적까지 못 가고 공중에서 사라진다</summary>
        public float FastLife = 0.6f;
        /// <summary>냉각탄의 수명. 길어서 표적까지 간다</summary>
        public float SlowLife = 3.5f;
        public int BurstCount = 5;
        public float BurstInterval = 0.1f;
        /// <summary>포구의 가로 위치 (탄이 나오는 곳)</summary>
        public float MuzzleX = 2f;
        /// <summary>잔해 드론 표적의 앞면. 탄이 여기를 넘으면 명중</summary>
        public float TargetFrontX = 15f;
        /// <summary>화면 오른쪽 끝. 표적이 화면 끝에 걸쳐 있어 앞면과 같은 자리다 (명중과 화면 밖이 같은 프레임에 참이 된다)</summary>
        public float ScreenRightX = 15f;

        public float SpeedOf(ProjectileKind kind) => kind == ProjectileKind.Fast ? FastSpeed : SlowSpeed;
        public float LifeOf(ProjectileKind kind) => kind == ProjectileKind.Fast ? FastLife : SlowLife;
    }

    public sealed class Turret
    {
        public readonly TurretSettings Settings;
        public readonly ProjectilePool Pool;
        readonly List<Projectile> flying = new List<Projectile>();
        int burstLeft;
        float burstTimer;

        /// <summary>날고 있는 탄 (쏜 순서)</summary>
        public IReadOnlyList<Projectile> Flying => flying;
        /// <summary>연사에서 아직 쏘지 않은 발 수</summary>
        public int BurstLeft => burstLeft;
        public int Hits { get; private set; }

        /// <summary>탄을 쐈을 때 (Launch 가 끝난 뒤)</summary>
        public event Action<Projectile> Fired;
        /// <summary>표적에 맞았을 때 (탄, 같은 프레임에 화면 밖도 참이었나)</summary>
        public event Action<Projectile, bool> Hit;
        /// <summary>맞지 않고 사라질 때 (탄, 화면 밖이면 true · 수명 끝이면 false)</summary>
        public event Action<Projectile, bool> Expired;

        public Turret(TurretSettings settings, ProjectilePool pool)
        {
            Settings = settings;
            Pool = pool;
        }

        public Projectile Fire(ProjectileKind kind)
        {
            Projectile p = Pool.Get(); // [1]
            p.Launch(kind, Settings.MuzzleX, Settings.SpeedOf(kind), Settings.LifeOf(kind)); // [2] 빌린 탄의 모든 상태를 지금 종류에 맞게 새로 넣는다
            flying.Add(p);
            Fired?.Invoke(p);
            return p;
        }

        /// <summary>빠른 탄 연사: 지금 한 발, 나머지는 BurstInterval 마다 Tick 에서. 연사 중에 다시 누르면 처음부터</summary>
        public void StartBurst()
        {
            burstLeft = Settings.BurstCount - 1;
            burstTimer = Settings.BurstInterval;
            Fire(ProjectileKind.Fast);
        }

        /// <summary>매 프레임 (MonoBehaviour.Update 의 Time.deltaTime)</summary>
        public void Tick(float dt)
        {
            if (burstLeft > 0)
            {
                burstTimer -= dt;
                if (burstTimer <= 0f)
                {
                    burstLeft--;
                    burstTimer += Settings.BurstInterval;
                    Fire(ProjectileKind.Fast);
                }
            }

            for (int i = 0; i < flying.Count; i++)
            {
                Projectile p = flying[i];
                p.Move(dt);
                bool hit = p.X >= Settings.TargetFrontX;
                bool outside = p.X >= Settings.ScreenRightX;
                bool expired = p.Life <= 0f;
                if (!hit && !outside && !expired) continue;
                // 판정이 몇 개 겹쳐도 사라지는 길은 여기 하나다
                flying.RemoveAt(i); // [3]
                i--;
                if (hit)
                {
                    Hits++;
                    Hit?.Invoke(p, outside);
                }
                else
                {
                    Expired?.Invoke(p, outside);
                }
                Pool.Release(p); // [3] 한 번만 돌려준다
            }
        }
    }
}
