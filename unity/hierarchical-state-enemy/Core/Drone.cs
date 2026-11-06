// 잔해 드론의 값과 동작: 위치, 타이머, 경계등처럼 드론마다 다른 값은 상태 객체가 아니라 여기에 둔다. UnityEngine 을 쓰지 않아 에디터 없이 테스트할 수 있다.
using System;

namespace PatternGallery.HierarchicalStateEnemy
{
    /// <summary>규칙 값. DroneBrain 이 Inspector 값으로 채워 넘기고, Play 중 값을 바꾸면 OnValidate 가 다시 넣는다</summary>
    public sealed class DroneSettings
    {
        public float DetectRange = 5f;
        public float AttackRange = 2.5f;
        public float ChargeTime = 0.6f;
        public float MoveSpeed = 2.5f;
        public float StunTime = 2f;
        public float SearchTime = 2f;
        /// <summary>순찰 구간 (코어 x). 시작 자리 11 에서 왼쪽 2m, 오른쪽 2m</summary>
        public float PatrolMinX = 9f;
        public float PatrolMaxX = 13f;
    }

    /// <summary>상태 기계가 받는 입력 이름. 문자열을 여기 한 곳에만 둔다</summary>
    public static class DroneInput
    {
        public const string Emp = "emp";
    }

    public sealed class Drone
    {
        public readonly DroneSettings Settings;

        public float X = 11f;
        /// <summary>바라보는 쪽 (1 오른쪽, -1 왼쪽)</summary>
        public int Facing = -1;
        /// <summary>쫓는 대상(하린)의 x. 연결 컴포넌트가 Tick 전에 넣는다. 처음에는 아주 먼 곳</summary>
        public float TargetX = float.PositiveInfinity;
        /// <summary>충전한 시간과 충전 중인지 (AttackState 가 Enter 에서 켜고 Exit 에서 끈다)</summary>
        public float ChargeTimer;
        public bool Charging;
        /// <summary>전투 중 마지막으로 대상을 본 자리. 수색은 여기로 간다 (CombatState.Tick 이 보이는 동안 매 프레임 적는다)</summary>
        public float LastSeenX;
        /// <summary>마지막으로 본 자리에 닿은 뒤 두리번거린 시간</summary>
        public float SearchTimer;
        /// <summary>기절이 끝날 때까지 남은 시간</summary>
        public float StunTimer;
        /// <summary>머리의 경계등. CombatState 가 Enter 에서 켜고 Exit 에서 끈다</summary>
        public bool AlertOn { get; private set; }

        /// <summary>경계등이 켜지거나 꺼질 때 (켜짐)</summary>
        public event Action<bool> AlertChanged;
        /// <summary>한 발 쐈을 때 (쏜 순간 대상의 x)</summary>
        public event Action<float> Fired;
        /// <summary>기절했을 때 (기절 시간)</summary>
        public event Action<float> Stunned;

        public Drone(DroneSettings settings)
        {
            Settings = settings;
        }

        /// <summary>대상까지의 가로 거리</summary>
        public float Distance => Math.Abs(TargetX - X);

        /// <summary>순찰 구간을 오간다. 구간 밖(수색·기절하다 남은 자리)이면 구간 쪽으로 돌아서 걸어 들어온다</summary>
        public void Patrol(float dt)
        {
            X += Facing * Settings.MoveSpeed * dt;
            if (X > Settings.PatrolMaxX && Facing > 0) Facing = -1;
            else if (X < Settings.PatrolMinX && Facing < 0) Facing = 1;
        }

        /// <summary>x 쪽으로 MoveSpeed 만큼 간다. 이번 걸음에 닿으면 그 자리에 서고 true</summary>
        public bool MoveToward(float x, float dt)
        {
            float gap = x - X;
            float step = Settings.MoveSpeed * dt;
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

        /// <summary>AttackState 가 충전을 마치면 부른다</summary>
        public void Fire()
        {
            Fired?.Invoke(TargetX);
        }

        /// <summary>CombatState 의 Enter(켬)와 Exit(끔)가 부른다. 이미 그 값이면 알리지 않는다</summary>
        public void SetAlert(bool on)
        {
            if (AlertOn == on) return;
            AlertOn = on;
            AlertChanged?.Invoke(on);
        }

        /// <summary>StunnedState.Enter 가 부른다. 기절 시간은 들어갈 때 한 번 정한다</summary>
        public void Stun()
        {
            StunTimer = Settings.StunTime;
            Stunned?.Invoke(StunTimer);
        }
    }
}
