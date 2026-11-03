// 탄 풀: 처음에 몇 개 만들어 두고 빌려 주고 돌려받는다. 모자라면 새로 만들고, 이미 돌려받은 탄은 다시 받지 않는다.
// Unity 의 UnityEngine.Pool.ObjectPool<T> 와 같은 생각을 순수 C# 로 짰다 (dotnet 대조를 위해 UnityEngine 을 쓰지 않는다).
using System;
using System.Collections.Generic;

namespace PatternGallery.ObjectPoolProjectiles
{
    public sealed class ProjectilePool
    {
        readonly List<Projectile> all = new List<Projectile>();
        /// <summary>대기 중인 탄. 맨 끝이 다음에 빌려 줄 탄이다 (마지막에 돌려받은 것부터. ObjectPool&lt;T&gt; 의 스택과 같다)</summary>
        readonly List<Projectile> idle = new List<Projectile>();

        /// <summary>지금까지 만든 탄 전부 (만든 순서)</summary>
        public IReadOnlyList<Projectile> All => all;
        /// <summary>대기 줄. 맨 끝이 다음 Get 이 줄 탄</summary>
        public IReadOnlyList<Projectile> Idle => idle;
        public int CreatedCount => all.Count;
        public int ActiveCount => all.Count - idle.Count;
        public int IdleCount => idle.Count;
        /// <summary>한 번 쓰고 돌아온 탄을 다시 빌려 준 횟수 (그만큼 Instantiate 를 아꼈다)</summary>
        public int ReuseCount { get; private set; }

        /// <summary>탄을 새로 만들었을 때. Unity 어댑터가 여기서 한 번만 Instantiate 한다 (createFunc 자리)</summary>
        public event Action<Projectile> Created;
        /// <summary>탄을 빌려 줬을 때 (탄, 한 번 쓰고 돌아온 탄인가). Unity 어댑터가 SetActive(true) 한다</summary>
        public event Action<Projectile, bool> Taken;
        /// <summary>탄을 돌려받았을 때. Unity 어댑터가 SetActive(false) 한다 (actionOnRelease 자리)</summary>
        public event Action<Projectile> Returned;
        /// <summary>이미 대기 중인 탄을 또 돌려주려 했을 때. 받지 않는다 (collectionCheck 자리)</summary>
        public event Action<Projectile> ReleaseRejected;

        /// <summary>미리 count 개를 만들어 대기시킨다. #1 이 먼저 나가게 쌓는다</summary>
        public void Prewarm(int count)
        {
            int first = all.Count;
            for (int i = 0; i < count; i++) Create();
            for (int i = all.Count - 1; i >= first; i--) idle.Add(all[i]);
        }

        public Projectile Get()
        {
            Projectile p;
            if (idle.Count > 0)
            {
                p = idle[idle.Count - 1]; // [1] 대기 중인 탄을 빌려 준다
                idle.RemoveAt(idle.Count - 1);
            }
            else
            {
                p = Create(); // [1] 대기 중인 탄이 없을 때만 새로 만든다
            }
            bool reused = p.TimesTaken > 0;
            if (reused) ReuseCount++;
            p.TimesTaken++;
            p.InUse = true;
            Taken?.Invoke(p, reused);
            return p;
        }

        /// <summary>돌려받는다. 이미 대기 중인 탄이면 받지 않고 false (대기 줄에 같은 탄이 두 칸 생기지 않게)</summary>
        public bool Release(Projectile p)
        {
            if (!p.InUse) // [3] 이미 돌려받은 탄인가
            {
                ReleaseRejected?.Invoke(p);
                return false;
            }
            p.InUse = false;
            idle.Add(p); // [4] 다음 Get 이 이 탄을 다시 쓴다
            Returned?.Invoke(p);
            return true;
        }

        Projectile Create()
        {
            var p = new Projectile(all.Count + 1);
            all.Add(p);
            Created?.Invoke(p);
            return p;
        }
    }
}
