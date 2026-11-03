// 플레이어 상태들: 대기, 이동, 점프, 공격, 피격 경직. 상태마다 받는 입력과 다음 상태를 스스로 정한다.
using System;

namespace PatternGallery.StatePlayerActions
{
    public interface IPlayerState
    {
        string Name { get; }
        void Enter(Player p);
        void Exit(Player p);
        /// <summary>다음 상태. 상태 안에서 처리하고 그대로면 자기 자신, 이 상태에서 받지 않는 입력이면 null</summary>
        IPlayerState HandleInput(Player p, PlayerInput input);
        /// <summary>다음 상태. 그대로면 자기 자신 (null 을 돌려주지 않는다)</summary>
        IPlayerState Tick(Player p, float dt);
    }

    /// <summary>
    /// 상태 객체들. 상태 안에는 캐릭터별 값을 두지 않는다 (남은 시간 등은 Player 에).
    /// 그래서 플레이어마다 한 벌씩 만들어도 되고 여러 플레이어가 같이 써도 섞이지 않는다
    /// </summary>
    public sealed class PlayerStates
    {
        public readonly IdleState Idle = new IdleState();
        public readonly RunState Run = new RunState();
        public readonly JumpState Jump = new JumpState();
        public readonly AttackState Attack = new AttackState();
        public readonly HitStunState HitStun = new HitStunState();
    }

    public sealed class IdleState : IPlayerState
    {
        public string Name => "Idle";
        public void Enter(Player p) { }
        public void Exit(Player p) { }

        public IPlayerState HandleInput(Player p, PlayerInput input)
        {
            switch (input)
            {
                case PlayerInput.Jump: return p.States.Jump;
                case PlayerInput.Attack: return p.States.Attack;
                case PlayerInput.Hit: return p.States.HitStun;
                case PlayerInput.Move:
                    p.WantsMove = !p.WantsMove;
                    return p.GroundState;
            }
            return null;
        }

        public IPlayerState Tick(Player p, float dt) => this;
    }

    public sealed class RunState : IPlayerState
    {
        public string Name => "Run";
        public void Enter(Player p) { }
        public void Exit(Player p) { }

        public IPlayerState HandleInput(Player p, PlayerInput input)
        {
            switch (input)
            {
                case PlayerInput.Jump: return p.States.Jump;
                case PlayerInput.Attack: return p.States.Attack;
                case PlayerInput.Hit: return p.States.HitStun;
                case PlayerInput.Move:
                    p.WantsMove = !p.WantsMove;
                    return p.GroundState;
            }
            return null;
        }

        public IPlayerState Tick(Player p, float dt)
        {
            p.Walk(dt);
            return this;
        }
    }

    public sealed class JumpState : IPlayerState
    {
        public string Name => "Jump";

        public void Enter(Player p)
        {
            // 땅에서 뛸 때만 위로 민다 (공중 공격이 끝나고 돌아올 때는 떨어지던 속도 그대로)
            if (p.Grounded) p.VelocityY = (float)Math.Sqrt(2f * p.Settings.Gravity * p.Settings.JumpHeight);
        }

        public void Exit(Player p) { }

        public IPlayerState HandleInput(Player p, PlayerInput input)
        {
            switch (input)
            {
                case PlayerInput.Attack: return p.Settings.AllowAirAttack ? p.States.Attack : null;
                case PlayerInput.Hit: return p.States.HitStun;
                case PlayerInput.Move:
                    p.WantsMove = !p.WantsMove;
                    return this;
            }
            return null; // 공중에서 다시 점프하지 않는다
        }

        public IPlayerState Tick(Player p, float dt)
        {
            if (p.WantsMove) p.Walk(dt);
            p.ApplyGravity(dt); // [4]
            return p.Grounded ? p.GroundState : this; // [4]
        }
    }

    public sealed class AttackState : IPlayerState
    {
        public string Name => "Attack";

        public void Enter(Player p)
        {
            p.Timer = p.Settings.AttackDuration;
            p.HitboxOn = true;
        }

        public void Exit(Player p)
        {
            p.Timer = 0f;
            p.HitboxOn = false; // [3] 맞아서 공격이 끊겨도 판정이 남지 않는다
        }

        public IPlayerState HandleInput(Player p, PlayerInput input)
        {
            switch (input)
            {
                case PlayerInput.Hit: return p.States.HitStun; // [2]
                case PlayerInput.Move:
                    p.WantsMove = !p.WantsMove;
                    return this;
            }
            return null; // [2] 공격 중에는 점프와 다음 공격을 받지 않는다
        }

        public IPlayerState Tick(Player p, float dt)
        {
            p.ApplyGravity(dt);
            p.Timer -= dt;
            if (p.Timer > 0f) return this;
            return p.Grounded ? p.GroundState : p.States.Jump;
        }
    }

    public sealed class HitStunState : IPlayerState
    {
        public string Name => "HitStun";

        public void Enter(Player p)
        {
            p.Timer = p.Settings.HitStunDuration;
        }

        public void Exit(Player p)
        {
            p.Timer = 0f;
        }

        public IPlayerState HandleInput(Player p, PlayerInput input)
        {
            switch (input)
            {
                case PlayerInput.Hit:
                    p.Timer = p.Settings.HitStunDuration; // 다시 맞으면 경직을 처음부터
                    return this;
                case PlayerInput.Move:
                    p.WantsMove = !p.WantsMove; // 기억만 하고 경직이 끝나면 따른다
                    return this;
            }
            return null; // 경직 중에는 점프와 공격을 받지 않는다
        }

        public IPlayerState Tick(Player p, float dt)
        {
            p.ApplyGravity(dt);
            p.Timer -= dt;
            if (p.Timer > 0f || !p.Grounded) return this;
            return p.GroundState;
        }
    }
}
