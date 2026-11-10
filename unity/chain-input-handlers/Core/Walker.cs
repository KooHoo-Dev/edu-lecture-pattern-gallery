// 하린 걷기: 땅 이동 명령을 받으면 목표 x 까지 일정한 빠르기로 걷는다. 시간은 Tick(dt) 로만 받는다. UnityEngine 을 쓰지 않는다.
using System;

namespace PatternGallery.ChainInputHandlers
{
    public sealed class Walker
    {
        public float X { get; private set; }
        public float TargetX { get; private set; }
        public bool IsWalking { get; private set; }
        /// <summary>m/s. 0 이하면 걷지 않는다</summary>
        public float Speed;

        /// <summary>이동 명령을 받았을 때 (그때 위치, 목표)</summary>
        public event Action<float, float> MoveOrdered;
        /// <summary>목표에 닿았을 때 (위치)</summary>
        public event Action<float> Arrived;

        public Walker(float x, float speed)
        {
            X = x;
            TargetX = x;
            Speed = speed;
        }

        /// <summary>걷는 중이면 목표만 바꾼다</summary>
        public void MoveTo(float x)
        {
            TargetX = x;
            IsWalking = true;
            MoveOrdered?.Invoke(X, x);
        }

        public void Tick(float dt)
        {
            if (!IsWalking || Speed <= 0f) return;
            float step = Speed * dt;
            float gap = TargetX - X;
            if (Math.Abs(gap) <= step)
            {
                X = TargetX;
                IsWalking = false;
                Arrived?.Invoke(X); // 받는 쪽이 여기서 MoveTo 를 다시 불러도 된다 (상태를 먼저 바꿨다)
                return;
            }
            X += gap > 0f ? step : -step;
        }
    }
}
