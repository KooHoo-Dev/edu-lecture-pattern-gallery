// 게임 규칙: 하린의 위치, 속도, 중력, 점프, 돌진, 벽 충돌. 고정 간격 한 단계(Step)로만 진행해, 화면 프레임 속도와 상관없이 같은 결과가 된다.
// 입력은 요청(RequestJump, RequestDash)으로 받아 다음 고정 단계에서 처리한다. 그 화면 프레임에 고정 단계가 없어도 입력을 놓치지 않는다.
using System;

namespace PatternGallery.GameLoopFixedStep
{
    public sealed class RunnerSettings
    {
        public float JumpSpeed = 8f;
        public float Gravity = 40f;
        public float DashSpeed = 15f;
        public float DashTime = 0.19f;
        public float StartX = 6f;
        /// <summary>벽의 왼쪽 면</summary>
        public float WallX = 12f;
        public float WallThickness = 0.2f;
        /// <summary>몸 폭의 절반. 한 단계 이동(DashSpeed × 고정 간격)이 벽 두께 + 몸 폭보다 짧아야 겹침 검사가 벽을 놓치지 않는다</summary>
        public float HalfWidth = 0.3f;
    }

    public sealed class Runner
    {
        public readonly RunnerSettings Settings;
        public float X;
        public float Y;
        public float VelocityY;
        public float DashTimer;
        /// <summary>직전 고정 단계가 끝났을 때의 위치. 화면이 두 단계 사이를 보간할 때 쓴다</summary>
        public float PrevX;
        public float PrevY;
        /// <summary>이번 점프에서 가장 높이 오른 높이</summary>
        public float Peak;
        public bool Rising;

        float dashStartX;
        bool jumpRequested;
        bool dashRequested;

        public event Action Jumped;
        /// <summary>올라가다 내려오기 시작했다. 인자는 최고 높이</summary>
        public event Action<float> PeakReached;
        public event Action Landed;
        public event Action Dashed;
        /// <summary>돌진이 끝났다. 인자는 돌진한 거리</summary>
        public event Action<float> DashEnded;
        /// <summary>벽에 막혔다. 인자는 멈춘 X</summary>
        public event Action<float> WallHit;

        public Runner(RunnerSettings settings)
        {
            Settings = settings;
            Restart();
        }

        public bool Grounded => Y <= 0f;

        /// <summary>다음 고정 단계에서 점프한다 (땅에 있을 때만)</summary>
        public void RequestJump() => jumpRequested = true;

        /// <summary>다음 고정 단계에서 오른쪽(벽 쪽)으로 돌진한다</summary>
        public void RequestDash() => dashRequested = true;

        /// <summary>처음 자리로 돌린다. 처리하지 않은 요청도 지운다</summary>
        public void Restart()
        {
            X = PrevX = Settings.StartX;
            Y = PrevY = 0f;
            VelocityY = 0f;
            DashTimer = 0f;
            Peak = 0f;
            Rising = false;
            jumpRequested = false;
            dashRequested = false;
        }

        /// <summary>고정 간격 한 단계. step 은 늘 같은 값(FixedStepper.FixedStep)이다</summary>
        public void Step(float step)
        {
            PrevX = X; // [4] 보간에 쓸 직전 단계 위치를 남긴다
            PrevY = Y;
            if (jumpRequested)
            {
                jumpRequested = false;
                if (Grounded)
                {
                    VelocityY = Settings.JumpSpeed;
                    Peak = 0f;
                    Rising = true;
                    Jumped?.Invoke();
                }
            }
            if (dashRequested)
            {
                dashRequested = false;
                DashTimer = Settings.DashTime;
                dashStartX = X;
                Dashed?.Invoke();
            }

            VelocityY -= Settings.Gravity * step; // [2] 중력은 늘 같은 길이로 적분한다: 기기가 달라도 같은 높이
            Y += VelocityY * step;
            if (Y > Peak) Peak = Y;
            if (Rising && VelocityY <= 0f)
            {
                Rising = false;
                PeakReached?.Invoke(Peak);
            }
            if (Y <= 0f)
            {
                bool wasInAir = PrevY > 0f;
                Y = 0f;
                VelocityY = 0f;
                if (wasInAir) Landed?.Invoke();
            }

            if (DashTimer <= 0f) return;
            X += Settings.DashSpeed * step; // [2] 한 단계에 DashSpeed × step 보다 멀리 가지 않는다
            DashTimer -= step;
            bool hit = X + Settings.HalfWidth > Settings.WallX && X - Settings.HalfWidth < Settings.WallX + Settings.WallThickness;
            if (hit)
            {
                X = Settings.WallX - Settings.HalfWidth;
                DashTimer = 0f;
                WallHit?.Invoke(X);
            }
            if (DashTimer <= 0f) DashEnded?.Invoke(X - dashStartX);
        }
    }
}
