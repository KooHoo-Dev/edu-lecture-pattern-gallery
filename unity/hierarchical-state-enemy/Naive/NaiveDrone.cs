// 나쁜 예: 앞 편(state-drone-ai)처럼 상태를 평평한 클래스 다섯으로 나눈 드론. 실제로는 MonoBehaviour 가 들고 Update 에서 Tick 을 부르는 코드다.
// 상태가 늘면서 공통 규칙(EMP → 기절, 놓치면 수색, 경계등)을 상태마다 복사했다. 갤러리의 '효과 끄기' 가 같은 입력으로 돌린다. 프로젝트에 넣지 않는다.
using System;

namespace PatternGallery.HierarchicalStateEnemy.Naive
{
    public sealed class NaiveDrone
    {
        public float DetectRange = 5f;
        public float AttackRange = 2.5f;
        public float ChargeTime = 0.6f;
        public float MoveSpeed = 2.5f;
        public float StunTime = 2f;
        public float SearchTime = 2f;

        public float X = 11f;
        public int Facing = -1;
        public float TargetX = float.PositiveInfinity;
        public float ChargeTimer;
        public bool Charging;
        public float LastSeenX;
        public float SearchTimer;
        public float StunTimer;
        public bool AlertOn;

        public IDroneState State { get; private set; } = DroneStates.Patrol;

        /// <summary>상태가 바뀔 때 (이전, 다음)</summary>
        public event Action<string, string> StateChanged;
        public event Action<bool> AlertChanged;
        public event Action<float> Fired;
        public event Action<float> Stunned;

        public float Distance => Math.Abs(TargetX - X);

        /// <summary>매 프레임. 지금 상태 하나의 Tick 만 부른다</summary>
        public void Tick(float dt)
        {
            State.Tick(this, dt);
        }

        /// <summary>입력은 지금 상태 하나에게만 간다. 그 상태가 받지 않으면 넘길 곳이 없다</summary>
        public bool Handle(string evt) => State.Handle(this, evt);

        /// <summary>나가는 상태의 Exit, 들어가는 상태의 Enter 를 하나씩 부른다 (앞 편의 ChangeState 그대로)</summary>
        public void ChangeState(IDroneState next)
        {
            if (next == State) return;
            IDroneState previous = State;
            previous.Exit(this);
            State = next;
            next.Enter(this);
            StateChanged?.Invoke(previous.Name, next.Name);
        }

        public void Patrol(float dt)
        {
            X += Facing * MoveSpeed * dt;
            if (X > 13f && Facing > 0) Facing = -1;
            else if (X < 9f && Facing < 0) Facing = 1;
        }

        public bool MoveToward(float x, float dt)
        {
            float gap = x - X;
            float step = MoveSpeed * dt;
            if (Math.Abs(gap) <= step)
            {
                X = x;
                return true;
            }
            Facing = gap < 0f ? -1 : 1;
            X += Facing * step;
            return false;
        }

        public void FaceTarget()
        {
            Facing = TargetX < X ? -1 : 1;
        }

        public void Fire()
        {
            Fired?.Invoke(TargetX);
        }

        public void SetAlert(bool on)
        {
            if (AlertOn == on) return;
            AlertOn = on;
            AlertChanged?.Invoke(on);
        }

        public void Stun()
        {
            StunTimer = StunTime;
            Stunned?.Invoke(StunTimer);
        }
    }
}
