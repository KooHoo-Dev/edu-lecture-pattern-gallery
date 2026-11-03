// 드론 상태들: 순찰, 추격, 공격, 파괴. 상태마다 Tick 에서 거리를 보고 d.ChangeState 를 불러 스스로 전이하고, 들어갈 때 바꾼 것은 나올 때 되돌린다.
namespace PatternGallery.StateDroneAi
{
    public interface IDroneState
    {
        string Name { get; }
        /// <summary>이 상태에 들어올 때 한 번</summary>
        void Enter(Drone d);
        /// <summary>매 프레임. 다음 상태로 가야 하면 d.ChangeState 를 부른다</summary>
        void Tick(Drone d, float dt);
        /// <summary>이 상태에서 나갈 때 한 번. Enter 에서 바꾼 것을 되돌린다</summary>
        void Exit(Drone d);
    }

    /// <summary>
    /// 상태 객체들. 상태 안에는 드론별 값(충전 시간, 속도)을 두지 않는다. 그 값은 Drone 이 든다.
    /// 그래서 한 벌을 static 으로 만들어 두고 드론이 몇 대든 같은 객체를 같이 쓴다
    /// </summary>
    public static class DroneStates
    {
        public static readonly PatrolState Patrol = new PatrolState();
        public static readonly ChaseState Chase = new ChaseState();
        public static readonly AttackState Attack = new AttackState();
        public static readonly DestroyedState Destroyed = new DestroyedState();
    }

    public sealed class PatrolState : IDroneState
    {
        public string Name => "Patrol";
        public void Enter(Drone d) { }
        public void Exit(Drone d) { }

        public void Tick(Drone d, float dt)
        {
            if (d.Distance <= d.Settings.DetectRange)
            {
                d.ChangeState(DroneStates.Chase); // [1] 감지 거리 안이면 쫓는다
                return;
            }
            d.Patrol(dt);
        }
    }

    public sealed class ChaseState : IDroneState
    {
        public string Name => "Chase";
        public void Enter(Drone d) { }
        public void Exit(Drone d) { }

        public void Tick(Drone d, float dt)
        {
            float distance = d.Distance;
            if (distance > d.Settings.DetectRange)
            {
                d.ChangeState(DroneStates.Patrol); // [1] 놓치면 순찰로
                return;
            }
            if (distance <= d.Settings.AttackRange)
            {
                d.ChangeState(DroneStates.Attack); // [1] 공격 거리 안이면 공격으로
                return;
            }
            d.MoveTowardTarget(dt);
        }
    }

    public sealed class AttackState : IDroneState
    {
        public string Name => "Attack";

        /// <summary>
        /// 나가는 경계의 여유 (m). 공격 거리 + 이만큼보다 멀어져야 추격으로 나간다.
        /// 들어가는 경계(&lt;= AttackRange)와 나가는 경계가 같으면, 대상이 드론보다 느리게 물러날 때 Unity 의 연속 이동에서
        /// 멈춤 → 벗어남 → 한 프레임 쫓아 다시 들어옴을 매 프레임 되풀이한다 (전이와 CrossFade 가 매 프레임, 충전은 늘 처음부터)
        /// </summary>
        public const float LeaveMargin = 0.5f;

        public void Enter(Drone d)
        {
            d.Speed = 0f; // [3] 멈춰서 쏜다
            d.ChargeTimer = 0f; // [3] 충전은 들어올 때 한 번만 시작한다
            d.Charging = true;
            d.FaceTarget();
        }

        public void Exit(Drone d)
        {
            d.Speed = d.Settings.MoveSpeed; // [2] Enter 에서 멈춘 것을 되돌린다. 어느 상태로 나가든 여기를 지난다
            d.ChargeTimer = 0f;
            d.Charging = false; // [2]
        }

        public void Tick(Drone d, float dt)
        {
            if (d.Distance > d.Settings.AttackRange + LeaveMargin)
            {
                d.ChangeState(DroneStates.Chase); // [1] 여유까지 벗어나면 다시 쫓는다
                return;
            }
            d.FaceTarget(); // 대상이 드론을 지나쳐 가도 등을 돌린 채 쏘지 않게 돌아본다
            d.ChargeTimer += dt; // [4] 공격 상태의 일: 충전하고 다 차면 쏜다
            if (d.ChargeTimer >= d.Settings.ChargeTime)
            {
                d.Fire(); // [4]
                d.ChargeTimer = 0f;
            }
        }
    }

    public sealed class DestroyedState : IDroneState
    {
        public string Name => "Destroyed";

        public void Enter(Drone d)
        {
            d.Speed = 0f;
        }

        /// <summary>나가는 전이가 없어 Enter 에서 멈춘 속도를 되돌리지 않는다. 부활을 더하면 여기서 속도를 되돌린다</summary>
        public void Exit(Drone d) { }

        /// <summary>파괴된 드론은 아무것도 하지 않는다. 이 상태에서 나가는 전이도 없다</summary>
        public void Tick(Drone d, float dt) { }
    }
}
