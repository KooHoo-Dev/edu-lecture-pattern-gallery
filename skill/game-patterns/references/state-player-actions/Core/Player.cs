// 플레이어 코어: 지금 상태 객체 하나에 입력과 시간을 맡긴다. UnityEngine 을 쓰지 않아 에디터 없이 테스트할 수 있다.
using System;

namespace PatternGallery.StatePlayerActions
{
    public enum PlayerInput
    {
        Jump,
        Attack,
        Hit,
        /// <summary>이동 켜기/끄기 (누를 때마다 바뀐다)</summary>
        Move,
    }

    /// <summary>규칙 값. PlayerController 가 Inspector 값으로 채워 넘기고, Play 중 값을 바꾸면 OnValidate 가 다시 넣는다</summary>
    public sealed class PlayerSettings
    {
        public float JumpHeight = 1.6f;
        public float AttackDuration = 0.45f;
        public float HitStunDuration = 0.6f;
        public bool AllowAirAttack = false;
        public float MoveSpeed = 3f;
        public float Gravity = 20f;
        /// <summary>왼쪽, 오른쪽 끝 (닿으면 돌아선다)</summary>
        public float MinX = 1.5f;
        public float MaxX = 14.5f;
    }

    public sealed class Player
    {
        public readonly PlayerSettings Settings;
        public readonly PlayerStates States;

        public float X = 4f;
        /// <summary>땅에서의 높이. 0 이면 땅에 있다</summary>
        public float Y;
        public float VelocityY;
        public int Facing = 1;
        /// <summary>이동 입력이 켜져 있는가. 공격·경직 중에 바뀌어도 기억했다가 끝나면 따른다</summary>
        public bool WantsMove;
        /// <summary>공격, 경직처럼 시간이 정해진 상태가 쓰는 남은 시간</summary>
        public float Timer;
        /// <summary>공격 판정이 켜져 있는가. AttackState 가 Enter 에서 켜고 Exit 에서 끈다</summary>
        public bool HitboxOn;

        public IPlayerState State { get; private set; }

        /// <summary>상태가 바뀔 때 (이전, 다음)</summary>
        public event Action<string, string> StateChanged;
        /// <summary>지금 상태가 받지 않는 입력이 왔을 때 (상태, 입력). 공격 중 점프처럼 상태가 입력을 걸러 낸 순간이다</summary>
        public event Action<string, PlayerInput> InputIgnored;

        public Player(PlayerSettings settings)
        {
            Settings = settings;
            States = new PlayerStates();
            State = States.Idle;
            State.Enter(this);
        }

        public bool Grounded => Y <= 0f;

        /// <summary>입력은 지금 상태가 처리한다. 여기에는 입력 종류를 묻는 분기가 없다</summary>
        public void Handle(PlayerInput input)
        {
            IPlayerState next = State.HandleInput(this, input); // [1]
            if (next == null)
            {
                InputIgnored?.Invoke(State.Name, input); // [2] 이 상태는 이 입력을 받지 않는다
                return;
            }
            ChangeTo(next);
        }

        /// <summary>매 프레임 (MonoBehaviour.Update 의 Time.deltaTime)</summary>
        public void Tick(float dt)
        {
            ChangeTo(State.Tick(this, dt)); // [4]
        }

        void ChangeTo(IPlayerState next)
        {
            if (next == State) return;
            IPlayerState previous = State;
            previous.Exit(this); // [3]
            State = next;
            State.Enter(this); // [3]
            StateChanged?.Invoke(previous.Name, next.Name);
        }

        /// <summary>중력과 착지. 공중에 있는 상태들이 같이 쓴다</summary>
        public void ApplyGravity(float dt)
        {
            if (Grounded && VelocityY <= 0f) return;
            VelocityY -= Settings.Gravity * dt;
            Y += VelocityY * dt;
            if (Y <= 0f)
            {
                Y = 0f;
                VelocityY = 0f;
            }
        }

        /// <summary>바라보는 쪽으로 걷는다. 끝에 닿으면 돌아선다</summary>
        public void Walk(float dt)
        {
            X += Facing * Settings.MoveSpeed * dt;
            if (X > Settings.MaxX)
            {
                X = Settings.MaxX;
                Facing = -1;
            }
            else if (X < Settings.MinX)
            {
                X = Settings.MinX;
                Facing = 1;
            }
        }

        /// <summary>땅에서 쉬거나 걷는 상태 중 지금 입력에 맞는 것</summary>
        public IPlayerState GroundState => WantsMove ? (IPlayerState)States.Run : States.Idle;
    }
}
