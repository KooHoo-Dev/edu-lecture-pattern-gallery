// 하네스 어댑터: 코어(Player)와 나쁜 예(NaivePlayer)를 시나리오 입력으로 돌리고 사건과 상태를 글로 꺼낸다.
// 웹 sim(src/specimens/state-player-actions/sim.ts)의 drain, snapshot 과 같은 글을 만든다.
using System.Collections.Generic;
using PatternGallery.StatePlayerActions.Naive;
using PatternGallery.Truth;

namespace PatternGallery.StatePlayerActions
{
    [SimTarget("state-player-actions")]
    public sealed class Target : ISimTarget
    {
        readonly Player player;
        readonly NaivePlayer naive;
        readonly List<string> events = new List<string>();
        bool lastJump, lastAttack, lastHurt, lastMove;
        bool bugJumpAttack, bugHurtAttack, bugHurtWalk, bugHurtJump;

        public Target(Values v, bool isNaive)
        {
            if (isNaive)
            {
                naive = new NaivePlayer
                {
                    JumpHeight = v.Float("jumpHeight"),
                    AttackDuration = v.Float("attackDuration"),
                    HitStunDuration = v.Float("hitStunDuration"),
                    MoveSpeed = v.Float("moveSpeed"),
                };
                return;
            }
            player = new Player(new PlayerSettings
            {
                JumpHeight = v.Float("jumpHeight"),
                AttackDuration = v.Float("attackDuration"),
                HitStunDuration = v.Float("hitStunDuration"),
                AllowAirAttack = v.Bool("allowAirAttack"),
                MoveSpeed = v.Float("moveSpeed"),
            });
            player.StateChanged += (from, to) => events.Add($"{from} → {to}");
            player.InputIgnored += (state, input) => events.Add($"{state} 무시 ({Name(input)})");
        }

        static string Name(PlayerInput input) => input switch
        {
            PlayerInput.Jump => "jump",
            PlayerInput.Attack => "attack",
            PlayerInput.Hit => "hit",
            _ => "move",
        };

        static PlayerInput Parse(string name) => name switch
        {
            "jump" => PlayerInput.Jump,
            "attack" => PlayerInput.Attack,
            "hit" => PlayerInput.Hit,
            _ => PlayerInput.Move,
        };

        public void Input(string name)
        {
            if (player != null)
            {
                player.Handle(Parse(name));
                return;
            }
            switch (name)
            {
                case "jump": naive.OnJump(); break;
                case "attack": naive.OnAttack(); break;
                case "hit": naive.OnHit(); break;
                default: naive.OnMove(); break;
            }
            NaiveEvents(null);
        }

        public void Tick(float dt)
        {
            if (player != null)
            {
                player.Tick(dt);
                return;
            }
            float x0 = naive.X;
            naive.Update(dt);
            NaiveEvents(naive.X != x0);
        }

        void Flag(string name, bool now, ref bool last)
        {
            if (now != last) events.Add($"{name} = {(now ? "true" : "false")}");
            last = now;
        }

        void Bug(bool now, ref bool last, string message)
        {
            if (now && !last) events.Add(message);
            last = now;
        }

        /// <summary>나쁜 예의 플래그 변화와, 플래그가 함께 켜져 생긴 버그를 적는다 (moved 는 Tick 에서만)</summary>
        void NaiveEvents(bool? moved)
        {
            Flag("isJumping", naive.isJumping, ref lastJump);
            Flag("isAttacking", naive.isAttacking, ref lastAttack);
            Flag("isHurt", naive.isHurt, ref lastHurt);
            Flag("wantsMove", naive.wantsMove, ref lastMove);
            Bug(naive.isJumping && naive.isAttacking, ref bugJumpAttack, "!공격 자세로 점프한다 (isAttacking && isJumping)");
            Bug(naive.isHurt && naive.isJumping, ref bugHurtJump, "!경직 중에 점프한다 (isHurt && isJumping)");
            Bug(naive.isHurt && naive.isAttacking, ref bugHurtAttack, "!맞았는데 공격이 이어진다 (isHurt && isAttacking)");
            if (moved.HasValue) Bug(naive.isHurt && moved.Value, ref bugHurtWalk, "!경직 중에 걷는다 (isHurt 인데 X 가 움직인다)");
        }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        public string Snapshot()
        {
            if (player != null) return $"state={player.State.Name} x={Fmt.F(player.X)} y={Fmt.F(player.Y)} hitbox={B(player.HitboxOn)}";
            return $"jump={B(naive.isJumping)} attack={B(naive.isAttacking)} hurt={B(naive.isHurt)} x={Fmt.F(naive.X)} y={Fmt.F(naive.Y)}";
        }

        static int B(bool b) => b ? 1 : 0;
    }
}
