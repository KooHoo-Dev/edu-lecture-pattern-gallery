// 나쁜 예: 조준 방식을 문자열로 들고, 레이저(UpdateAim)와 발사(Fire)가 각자 if 사슬로 대상을 고르는 포탑. 실제로는 MonoBehaviour 의 Update 안에 있는 흔한 코드다.
// 갤러리의 '효과 끄기' 가 이 코드를 같은 입력으로 돌린다. 프로젝트에 넣지 않는다. 드론과 웨이브는 코어의 것을 같이 쓴다.
using System;

namespace PatternGallery.StrategyTurretTargeting.Naive
{
    public sealed class NaiveTurret
    {
        public float X = 8f;
        public float range = 6f;
        public float fireInterval = 0.4f;
        public int damage = 1;

        /// <summary>"nearest", "strongest", "first", 나중에 더한 "weakest"</summary>
        public string mode = "nearest";
        /// <summary>레이저가 가리키는 드론. UpdateAim 이 매 프레임 정한다</summary>
        public Drone aimTarget;

        readonly DroneWave wave;
        float cooldown;

        public NaiveTurret(DroneWave wave)
        {
            this.wave = wave;
        }

        public void Update(float dt)
        {
            UpdateAim();
            if (cooldown > 0f) cooldown -= dt;
            if (cooldown <= 0f && Fire()) cooldown += fireInterval;
        }

        /// <summary>조준 레이저가 가리킬 드론</summary>
        void UpdateAim()
        {
            if (mode == "strongest") aimTarget = FindStrongest();
            else if (mode == "first") aimTarget = FindFirst();
            else aimTarget = FindNearest(); // [!] "weakest" 를 Fire() 에만 더하고 여기는 빠뜨렸다. 모르는 값이면 가까운 것을 가리킨다
        }

        /// <summary>쏠 드론을 다시 골라 쏜다. 쏘았으면 true</summary>
        bool Fire()
        {
            Drone target = null;
            if (mode == "nearest") target = FindNearest();
            else if (mode == "strongest") target = FindStrongest();
            else if (mode == "first") target = FindFirst();
            else if (mode == "weakest") target = FindWeakest(); // 나중에 더한 방식 (발사 쪽 사슬에만 들어갔다)
            if (target == null) return false;
            target.Hp = Math.Max(0, target.Hp - damage);
            if (target.Hp <= 0) wave.Remove(target);
            return true;
        }

        bool InRange(Drone d) => d.IsAlive && Math.Abs(d.X - X) <= range;

        Drone FindNearest()
        {
            Drone best = null;
            foreach (Drone d in wave.Active)
                if (InRange(d) && (best == null || Math.Abs(d.X - X) < Math.Abs(best.X - X))) best = d;
            return best;
        }

        Drone FindStrongest()
        {
            Drone best = null;
            foreach (Drone d in wave.Active)
                if (InRange(d) && (best == null || d.Hp > best.Hp)) best = d;
            return best;
        }

        Drone FindFirst()
        {
            Drone best = null;
            foreach (Drone d in wave.Active)
                if (InRange(d) && (best == null || d.X > best.X)) best = d;
            return best;
        }

        Drone FindWeakest()
        {
            Drone best = null;
            foreach (Drone d in wave.Active)
                if (InRange(d) && (best == null || d.Hp < best.Hp)) best = d;
            return best;
        }
    }
}
