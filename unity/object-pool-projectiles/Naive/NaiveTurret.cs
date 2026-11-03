// 나쁜 예: 풀은 있지만 빌린 탄의 속도·수명을 다시 맞추지 않고, 명중 처리와 화면 밖 처리가 각자 Release 하는 흔한 코드.
// 실제로는 탄 프리팹의 MonoBehaviour(Start, OnEnable, Update)와 포탑 MonoBehaviour 안에 있는 코드다.
// Unity 만의 동작(SetActive, Start 는 처음 켜질 때 한 번만, 켜진 오브젝트마다 Update)은 필드와 메서드로 흉내 낸다.
// 갤러리의 '효과 끄기' 가 이 코드를 같은 입력으로 돌린다. 프로젝트에 넣지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.ObjectPoolProjectiles.Naive
{
    /// <summary>탄 프리팹의 스크립트 (실제로는 MonoBehaviour)</summary>
    public sealed class NaiveProjectile
    {
        public readonly int Id;
        readonly NaiveTurret turret;
        /// <summary>포탑이 쏘기 전에 넣는다. 색과 라벨이 이 값을 따른다</summary>
        public ProjectileKind Kind;
        public float X;
        public float Speed;
        public float Lifetime;
        public float Age;
        /// <summary>gameObject.activeSelf 흉내</summary>
        public bool Active;
        /// <summary>Unity 가 이 오브젝트의 Start 를 이미 불렀는가 (흉내)</summary>
        bool started;

        public NaiveProjectile(int id, NaiveTurret turret)
        {
            Id = id;
            this.turret = turret;
        }

        /// <summary>gameObject.SetActive 흉내: 켜질 때 OnEnable, 처음 켜질 때만 Start. 이미 켜져 있으면 아무것도 하지 않는다</summary>
        public void SetActive(bool on)
        {
            if (on == Active) return;
            Active = on;
            if (!on) return;
            OnEnable();
            if (started) return;
            started = true;
            Start();
        }

        void Start()
        {
            Speed = turret.SpeedOf(Kind); // [!] Start 는 처음 켜질 때 한 번만 불린다. 다시 빌리면 이전 종류의 속도가 남는다
            Lifetime = turret.LifeOf(Kind); // [!] 수명도 처음 쓴 종류의 것 그대로
        }

        void OnEnable()
        {
            Age = 0f; // 켜질 때마다 경과 시간만 0 으로 (흔히 이것만 OnEnable 에 둔다)
        }

        public void Update(float dt)
        {
            X += Speed * dt;
            Age += dt;
            if (X >= turret.TargetFrontX)
            {
                turret.hits++; // 명중 처리: 표적에 맞히고 돌려준다
                turret.pool.Release(this);
            }
            if (X >= turret.ScreenRightX || Age >= Lifetime) turret.pool.Release(this); // [!] 위에서 이미 돌려줬어도 return 이 없어 또 돌려준다
        }
    }

    public sealed class NaivePool
    {
        public readonly List<NaiveProjectile> all = new List<NaiveProjectile>();
        /// <summary>대기 줄. 맨 끝이 다음에 빌려 줄 탄</summary>
        public readonly List<NaiveProjectile> idle = new List<NaiveProjectile>();
        readonly NaiveTurret turret;

        public NaivePool(NaiveTurret turret)
        {
            this.turret = turret;
        }

        public void Prewarm(int count)
        {
            int first = all.Count;
            for (int i = 0; i < count; i++) Create();
            for (int i = all.Count - 1; i >= first; i--) idle.Add(all[i]);
        }

        public NaiveProjectile Get()
        {
            if (idle.Count == 0) return Create();
            NaiveProjectile p = idle[idle.Count - 1];
            idle.RemoveAt(idle.Count - 1);
            return p;
        }

        public void Release(NaiveProjectile p)
        {
            p.SetActive(false);
            idle.Add(p); // [!] 이미 대기 줄에 있는지 보지 않는다. 같은 탄이 두 칸 들어간다
        }

        NaiveProjectile Create()
        {
            var p = new NaiveProjectile(all.Count + 1, turret); // 실제로는 Instantiate(prefab) 뒤 SetActive(false)
            all.Add(p);
            return p;
        }
    }

    /// <summary>포탑 스크립트 (실제로는 MonoBehaviour)</summary>
    public sealed class NaiveTurret
    {
        public float fastSpeed = 14f;
        public float slowSpeed = 6f;
        public float fastLife = 0.6f;
        public float slowLife = 3.5f;
        public int burstCount = 5;
        public float burstInterval = 0.1f;
        public float MuzzleX = 2f;
        public float TargetFrontX = 15f;
        public float ScreenRightX = 15f;

        public readonly NaivePool pool;
        public int hits;
        /// <summary>쏜 발 수와 마지막으로 쏜 탄 (총구 불꽃, 화면 흔들기 같은 연출이 읽는다)</summary>
        public int shotsFired;
        public NaiveProjectile lastShot;
        int burstLeft;
        float burstTimer;

        public NaiveTurret(int poolSize)
        {
            pool = new NaivePool(this);
            pool.Prewarm(poolSize);
        }

        public int BurstLeft => burstLeft;
        public float SpeedOf(ProjectileKind kind) => kind == ProjectileKind.Fast ? fastSpeed : slowSpeed;
        public float LifeOf(ProjectileKind kind) => kind == ProjectileKind.Fast ? fastLife : slowLife;

        public void Fire(ProjectileKind kind)
        {
            NaiveProjectile p = pool.Get();
            p.X = MuzzleX; // 위치를 포구로
            p.Kind = kind; // 종류 (색과 라벨은 바로 보여서 빠뜨리지 않았다)
            p.SetActive(true);
            shotsFired++;
            lastShot = p;
        }

        public void StartBurst()
        {
            burstLeft = burstCount - 1;
            burstTimer = burstInterval;
            Fire(ProjectileKind.Fast);
        }

        public void Update(float dt)
        {
            if (burstLeft > 0)
            {
                burstTimer -= dt;
                if (burstTimer <= 0f)
                {
                    burstLeft--;
                    burstTimer += burstInterval;
                    Fire(ProjectileKind.Fast);
                }
            }
            // Unity 가 켜진 탄마다 Update 를 한 번씩 부르는 것을 흉내 낸다
            for (int i = 0; i < pool.all.Count; i++)
            {
                if (pool.all[i].Active) pool.all[i].Update(dt);
            }
        }
    }
}
