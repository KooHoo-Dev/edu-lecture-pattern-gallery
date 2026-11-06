// 드론 상태 트리: Active { Patrol, Search, Combat { Chase, Attack } }, Stunned. 공통 규칙은 부모 한 곳에 있고 잎은 자기 일만 한다.
namespace PatternGallery.HierarchicalStateEnemy
{
    /// <summary>
    /// 상태 객체 한 벌. 부모를 먼저 만들어 자식에게 넘긴다 (static 필드는 적힌 순서대로 만들어진다).
    /// 상태에는 드론별 값이 없어 드론이 몇 대든 이 한 벌을 같이 쓴다
    /// </summary>
    public static class DroneStates
    {
        public static readonly ActiveState Active = new ActiveState();
        public static readonly PatrolState Patrol = new PatrolState(Active);
        public static readonly SearchState Search = new SearchState(Active);
        public static readonly CombatState Combat = new CombatState(Active);
        public static readonly ChaseState Chase = new ChaseState(Combat);
        public static readonly AttackState Attack = new AttackState(Combat);
        public static readonly StunnedState Stunned = new StunnedState();
    }

    /// <summary>움직이는 모든 상태의 부모. "EMP 를 맞으면 기절" 을 여기 한 곳에서 맡는다</summary>
    public sealed class ActiveState : HState
    {
        public ActiveState() : base("Active", null) { }

        /// <summary>잎(순찰, 수색, 추격, 공격)과 Combat 이 받지 않은 EMP 가 여기로 올라온다. 나중에 자식을 더해도 이 규칙을 복사하지 않는다</summary>
        public override bool Handle(StateMachine m, string evt)
        {
            if (evt != DroneInput.Emp) return false;
            m.ChangeState(DroneStates.Stunned); // [1] 어느 잎에 있든 Active 가 기절로 보낸다
            return true;
        }
    }

    public sealed class PatrolState : HState
    {
        public PatrolState(HState parent) : base("Patrol", parent) { }

        public override void Tick(StateMachine m, float dt)
        {
            Drone d = m.Drone;
            if (d.Distance <= d.Settings.DetectRange)
            {
                m.ChangeState(DroneStates.Chase); // 감지 거리 안이면 쫓는다
                return;
            }
            d.Patrol(dt);
        }
    }

    /// <summary>나중에 더한 상태. Active 의 자식으로 걸기만 해서 EMP 규칙을 따로 쓰지 않았다</summary>
    public sealed class SearchState : HState
    {
        /// <summary>두리번거리는 간격 (초). 이만큼마다 돌아본다</summary>
        public const float LookInterval = 0.5f;

        public SearchState(HState parent) : base("Search", parent) { }

        public override void Enter(StateMachine m)
        {
            m.Drone.SearchTimer = 0f;
        }

        public override void Exit(StateMachine m)
        {
            m.Drone.SearchTimer = 0f;
        }

        public override void Tick(StateMachine m, float dt)
        {
            Drone d = m.Drone;
            if (d.Distance <= d.Settings.DetectRange)
            {
                m.ChangeState(DroneStates.Chase); // 다시 보이면 추격 (Combat 에 다시 들어가 경계등이 켜진다)
                return;
            }
            if (!d.MoveToward(d.LastSeenX, dt)) return; // 마지막으로 본 자리까지 간다
            float before = d.SearchTimer;
            d.SearchTimer += dt;
            if ((int)(d.SearchTimer / LookInterval) != (int)(before / LookInterval)) d.Facing = -d.Facing; // 두리번거린다
            if (d.SearchTimer >= d.Settings.SearchTime) m.ChangeState(DroneStates.Patrol); // 못 찾으면 순찰로
        }
    }

    /// <summary>추격과 공격의 부모. "전투 중엔 경계등" 과 "감지 거리 밖이면 수색" 을 여기 한 곳에서 맡는다</summary>
    public sealed class CombatState : HState
    {
        /// <summary>
        /// 나가는 경계의 여유 (m). 감지 거리 + 이만큼보다 멀어져야 수색으로 나간다.
        /// 들어가는 경계(순찰·수색의 &lt;= DetectRange)와 같으면 Unity 의 연속 이동에서 경계 위를 오가며
        /// 수색 → 추격 → 수색을 매 프레임 되풀이한다 (경계등도 매 프레임 깜박인다)
        /// </summary>
        public const float LoseMargin = 0.5f;

        public CombatState(HState parent) : base("Combat", parent) { }

        public override void Enter(StateMachine m)
        {
            m.Drone.SetAlert(true); // [3] 추격으로 들어오든 수색에서 다시 들어오든 여기서 한 번 켠다
        }

        public override void Exit(StateMachine m)
        {
            m.Drone.SetAlert(false); // [2] Combat 을 나갈 때만 끈다. Chase → Attack 은 Combat 을 나가지 않는다
        }

        public override void Tick(StateMachine m, float dt)
        {
            Drone d = m.Drone;
            if (d.Distance > d.Settings.DetectRange + LoseMargin)
            {
                m.ChangeState(DroneStates.Search); // [4] 부모가 먼저 본다. 놓쳤으면 이 프레임에 자식(추격·공격)의 Tick 은 돌지 않는다
                return;
            }
            d.LastSeenX = d.TargetX; // 보이는 동안 마지막으로 본 자리를 적는다
        }
    }

    public sealed class ChaseState : HState
    {
        public ChaseState(HState parent) : base("Chase", parent) { }

        public override void Tick(StateMachine m, float dt)
        {
            Drone d = m.Drone;
            if (d.Distance <= d.Settings.AttackRange)
            {
                m.ChangeState(DroneStates.Attack); // 공격 거리 안이면 멈춰서 쏜다
                return;
            }
            d.MoveToward(d.TargetX, dt);
        }
    }

    public sealed class AttackState : HState
    {
        /// <summary>나가는 경계의 여유 (m). 공격 거리 + 이만큼보다 멀어져야 추격으로 나간다 (앞 편과 같은 이유)</summary>
        public const float LeaveMargin = 0.5f;

        public AttackState(HState parent) : base("Attack", parent) { }

        public override void Enter(StateMachine m)
        {
            Drone d = m.Drone;
            d.ChargeTimer = 0f; // 충전은 들어올 때 한 번만 시작한다
            d.Charging = true;
            d.FaceTarget();
        }

        public override void Exit(StateMachine m)
        {
            m.Drone.ChargeTimer = 0f;
            m.Drone.Charging = false;
        }

        public override void Tick(StateMachine m, float dt)
        {
            Drone d = m.Drone;
            if (d.Distance > d.Settings.AttackRange + LeaveMargin)
            {
                m.ChangeState(DroneStates.Chase); // 여유까지 벗어나면 다시 쫓는다 (경계등은 Combat 이 들고 있어 그대로다)
                return;
            }
            d.FaceTarget();
            d.ChargeTimer += dt;
            if (d.ChargeTimer >= d.Settings.ChargeTime)
            {
                d.Fire();
                d.ChargeTimer = 0f;
            }
        }
    }

    /// <summary>Active 밖의 상태. EMP 를 받지 않고(기절 중 EMP 는 무시), 시간이 다 되면 순찰로</summary>
    public sealed class StunnedState : HState
    {
        public StunnedState() : base("Stunned", null) { }

        public override void Enter(StateMachine m)
        {
            m.Drone.Stun();
        }

        public override void Exit(StateMachine m)
        {
            m.Drone.StunTimer = 0f;
        }

        public override void Tick(StateMachine m, float dt)
        {
            Drone d = m.Drone;
            d.StunTimer -= dt;
            if (d.StunTimer <= 0f) m.ChangeState(DroneStates.Patrol); // Active 와 Patrol 에 바깥부터 다시 들어간다
        }
    }
}
