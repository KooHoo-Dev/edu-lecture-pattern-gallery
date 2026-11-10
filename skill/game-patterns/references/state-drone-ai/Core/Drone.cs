// 잔해 드론 코어: 매 프레임의 판단을 지금 상태 객체에 맡기고, 상태는 ChangeState 한 곳에서만 바꾼다. UnityEngine 을 쓰지 않아 에디터 없이 테스트할 수 있다.
using System;

namespace PatternGallery.StateDroneAi
{
    /// <summary>규칙 값. DroneController 가 Inspector 값으로 채워 넘기고, Play 중 값을 바꾸면 OnValidate 가 다시 넣는다</summary>
    public sealed class DroneSettings
    {
        public float DetectRange = 5f;
        public float AttackRange = 2.5f;
        public float ChargeTime = 0.6f;
        public float MoveSpeed = 2.5f;
        public int MaxHp = 3;
        /// <summary>순찰 구간 (코어 x). 시작 자리 11 에서 왼쪽 2m, 오른쪽 2m</summary>
        public float PatrolMinX = 9f;
        public float PatrolMaxX = 13f;
    }

    public sealed class Drone
    {
        public readonly DroneSettings Settings;

        public float X = 11f;
        /// <summary>바라보는 쪽 (1 오른쪽, -1 왼쪽)</summary>
        public int Facing = -1;
        /// <summary>지금 이동 속도. AttackState 가 Enter 에서 0 으로 멈추고 Exit 에서 Settings.MoveSpeed 로 되돌린다</summary>
        public float Speed;
        public int Hp;
        /// <summary>쫓는 대상(하린)의 x. 연결 컴포넌트가 Tick 마다 넘긴다</summary>
        public float TargetX;
        /// <summary>충전한 시간과 충전 중인지. 드론마다 다른 값이라 상태 객체가 아니라 드론이 든다</summary>
        public float ChargeTimer;
        public bool Charging;

        public IDroneState State { get; private set; }

        /// <summary>상태가 바뀔 때 (이전, 다음)</summary>
        public event Action<string, string> StateChanged;
        /// <summary>한 발 쐈을 때 (쏜 순간 대상의 x)</summary>
        public event Action<float> Fired;
        /// <summary>피해를 받았을 때 (피해량, 남은 HP)</summary>
        public event Action<int, int> Damaged;
        /// <summary>HP 가 0 이 되어 파괴 상태로 바뀐 직후</summary>
        public event Action Destroyed;

        public Drone(DroneSettings settings)
        {
            Settings = settings;
            Speed = settings.MoveSpeed;
            Hp = settings.MaxHp;
            State = DroneStates.Patrol;
            State.Enter(this);
        }

        /// <summary>대상까지의 가로 거리</summary>
        public float Distance => Math.Abs(TargetX - X);

        /// <summary>매 프레임 (MonoBehaviour.Update 의 Time.deltaTime 과 대상의 x)</summary>
        public void Tick(float dt, float targetX)
        {
            TargetX = targetX;
            State.Tick(this, dt); // [4] 지금 상태가 할 일만 한다. 여기에는 상태를 묻는 분기가 없다
        }

        /// <summary>상태를 바꾸는 유일한 곳. 나가는 상태의 Exit 를 부른 뒤 들어가는 상태의 Enter 를 부른다</summary>
        public void ChangeState(IDroneState next)
        {
            if (next == State) return;
            IDroneState previous = State;
            previous.Exit(this); // [2]
            State = next;
            next.Enter(this); // [3]
            StateChanged?.Invoke(previous.Name, next.Name);
        }

        /// <summary>피해. HP 가 0 이 되면 어느 상태에 있든 파괴 상태로 바꾼다</summary>
        public void TakeHit(int amount)
        {
            if (Hp <= 0) return; // 이미 파괴됐다
            Hp = Math.Max(0, Hp - amount);
            Damaged?.Invoke(amount, Hp);
            if (Hp > 0) return;
            ChangeState(DroneStates.Destroyed); // [1] 체력이 다하면 파괴로
            Destroyed?.Invoke();
        }

        /// <summary>순찰 구간을 오간다. 구간 밖(추격하다 돌아온 자리)이면 구간 쪽으로 돌아서 걸어 들어온다</summary>
        public void Patrol(float dt)
        {
            X += Facing * Speed * dt;
            if (X > Settings.PatrolMaxX && Facing > 0) Facing = -1;
            else if (X < Settings.PatrolMinX && Facing < 0) Facing = 1;
        }

        /// <summary>대상 쪽으로 Speed 만큼 간다</summary>
        public void MoveTowardTarget(float dt)
        {
            FaceTarget();
            X += Facing * Speed * dt;
        }

        public void FaceTarget()
        {
            Facing = TargetX < X ? -1 : 1;
        }

        /// <summary>AttackState 가 충전을 마치면 부른다</summary>
        public void Fire()
        {
            Fired?.Invoke(TargetX);
        }
    }
}
