// 나쁜 예의 상태들: 순찰, 수색, 추격, 공격, 기절을 같은 높이의 클래스 다섯으로 두고, 공통 규칙을 상태마다 복사했다.
// 전투 상태가 추격 하나였을 때 경계등을 Chase 의 Enter/Exit 에 넣었고, 공격과 수색은 나중에 더했다.
namespace PatternGallery.HierarchicalStateEnemy.Naive
{
    public interface IDroneState
    {
        string Name { get; }
        void Enter(NaiveDrone d);
        void Tick(NaiveDrone d, float dt);
        void Exit(NaiveDrone d);
        /// <summary>입력 하나. 처리했으면 true</summary>
        bool Handle(NaiveDrone d, string evt);
    }

    public static class DroneStates
    {
        public static readonly PatrolState Patrol = new PatrolState();
        public static readonly SearchState Search = new SearchState();
        public static readonly ChaseState Chase = new ChaseState();
        public static readonly AttackState Attack = new AttackState();
        public static readonly StunnedState Stunned = new StunnedState();
    }

    public sealed class PatrolState : IDroneState
    {
        public string Name => "Patrol";
        public void Enter(NaiveDrone d) { }
        public void Exit(NaiveDrone d) { }

        public bool Handle(NaiveDrone d, string evt)
        {
            if (evt == "emp") { d.ChangeState(DroneStates.Stunned); return true; } // 공통 규칙 복사 1
            return false;
        }

        public void Tick(NaiveDrone d, float dt)
        {
            if (d.Distance <= d.DetectRange)
            {
                d.ChangeState(DroneStates.Chase);
                return;
            }
            d.Patrol(dt);
        }
    }

    /// <summary>나중에 더한 상태. Patrol 을 본떠 만들면서 Tick 은 새로 썼다</summary>
    public sealed class SearchState : IDroneState
    {
        public string Name => "Search";
        public void Enter(NaiveDrone d) { d.SearchTimer = 0f; }
        public void Exit(NaiveDrone d) { d.SearchTimer = 0f; }

        public bool Handle(NaiveDrone d, string evt)
        {
            // [!] 여기서 EMP 를 받지 않는다 (나중에 더한 수색 상태: 다른 상태의 if (evt == "emp") 기절 줄을 복사하지 않았다)
            return false;
        }

        public void Tick(NaiveDrone d, float dt)
        {
            if (d.Distance <= d.DetectRange)
            {
                d.ChangeState(DroneStates.Chase);
                return;
            }
            if (!d.MoveToward(d.LastSeenX, dt)) return;
            float before = d.SearchTimer;
            d.SearchTimer += dt;
            if ((int)(d.SearchTimer / 0.5f) != (int)(before / 0.5f)) d.Facing = -d.Facing;
            if (d.SearchTimer >= d.SearchTime) d.ChangeState(DroneStates.Patrol);
        }
    }

    public sealed class ChaseState : IDroneState
    {
        public string Name => "Chase";

        public void Enter(NaiveDrone d)
        {
            d.SetAlert(true); // 전투 상태가 추격 하나였던 시절에 쓴 줄
            d.LastSeenX = d.TargetX; // 전투에 들어오는 순간의 자리도 적는다 (계층 쪽 CombatState.Enter 와 같다)
        }

        public void Exit(NaiveDrone d)
        {
            d.SetAlert(false); // [!] ChaseState.Exit 에서 끈다: 전투가 추격 하나였던 시절의 자리라, 추격 → 공격(아직 전투 중)으로 옮겨도 꺼진다
        }

        public bool Handle(NaiveDrone d, string evt)
        {
            if (evt == "emp") { d.ChangeState(DroneStates.Stunned); return true; } // 공통 규칙 복사 2
            return false;
        }

        public void Tick(NaiveDrone d, float dt)
        {
            if (d.Distance > d.DetectRange + 0.5f)
            {
                d.ChangeState(DroneStates.Search); // 놓치면 수색 (Attack 에도 복사)
                return;
            }
            d.LastSeenX = d.TargetX;
            if (d.Distance <= d.AttackRange)
            {
                d.ChangeState(DroneStates.Attack);
                return;
            }
            d.MoveToward(d.TargetX, dt);
        }
    }

    /// <summary>나중에 더한 상태. Chase 를 본떠 Handle 과 '놓치면 수색' 은 복사했다</summary>
    public sealed class AttackState : IDroneState
    {
        public string Name => "Attack";

        public void Enter(NaiveDrone d)
        {
            d.ChargeTimer = 0f;
            d.Charging = true;
            d.FaceTarget();
            // [!] 여기서 경계등을 켜지 않는다 (나중에 더한 공격 상태: Chase.Enter 의 d.SetAlert(true) 를 복사하지 않았다)
        }

        public void Exit(NaiveDrone d)
        {
            d.ChargeTimer = 0f;
            d.Charging = false;
        }

        public bool Handle(NaiveDrone d, string evt)
        {
            if (evt == "emp") { d.ChangeState(DroneStates.Stunned); return true; } // 공통 규칙 복사 3
            return false;
        }

        public void Tick(NaiveDrone d, float dt)
        {
            if (d.Distance > d.DetectRange + 0.5f)
            {
                d.ChangeState(DroneStates.Search); // 놓치면 수색 (Chase 에서 복사)
                return;
            }
            d.LastSeenX = d.TargetX;
            if (d.Distance > d.AttackRange + 0.5f)
            {
                d.ChangeState(DroneStates.Chase);
                return;
            }
            d.FaceTarget();
            d.ChargeTimer += dt;
            if (d.ChargeTimer >= d.ChargeTime)
            {
                d.Fire();
                d.ChargeTimer = 0f;
            }
        }
    }

    public sealed class StunnedState : IDroneState
    {
        public string Name => "Stunned";
        public void Enter(NaiveDrone d) { d.Stun(); }
        public void Exit(NaiveDrone d) { d.StunTimer = 0f; }

        /// <summary>기절 중 EMP 는 받지 않는다 (계층 쪽 Stunned 와 같다)</summary>
        public bool Handle(NaiveDrone d, string evt) => false;

        public void Tick(NaiveDrone d, float dt)
        {
            d.StunTimer -= dt;
            if (d.StunTimer <= 0f) d.ChangeState(DroneStates.Patrol);
        }
    }
}
