// 고정 간격 루프: 화면 프레임마다 지난 시간을 쌓고, 쌓인 시간이 고정 간격만큼 있을 때마다 규칙을 한 단계씩 돌린다.
// 한 화면 프레임에 너무 많이 쌓이면(렉) 상한까지만 돌리고 나머지 시간은 버린다. 게임이 잠깐 느려질 뿐, 따라잡으려고 더 돌다가 프레임이 더 길어지는 죽음의 나선에 빠지지 않는다.
using System;

namespace PatternGallery.GameLoopFixedStep
{
    public sealed class FixedStepper
    {
        /// <summary>고정 간격 (초). 규칙은 늘 이 길이로만 진행한다. Play 중에 바꿔도 다음 단계부터 쓴다</summary>
        public float FixedStep;
        /// <summary>한 화면 프레임에 도는 고정 단계 상한. 1 보다 작으면 1 로 본다</summary>
        public int MaxStepsPerFrame;

        float accumulator;
        bool advancing;

        public FixedStepper(float fixedStep, int maxStepsPerFrame)
        {
            FixedStep = fixedStep;
            MaxStepsPerFrame = maxStepsPerFrame;
        }

        /// <summary>아직 단계로 돌리지 않은 쌓인 시간 (초). 늘 FixedStep 보다 작다 (단계 처리 중에 다시 불린 경우만 빼고)</summary>
        public float Accumulator => accumulator;
        /// <summary>마지막 고정 단계에서 다음 단계까지 얼마나 왔는지 (0~1). 화면 위치 보간에 쓴다</summary>
        public float Alpha => Math.Min(1f, accumulator / FixedStep);
        /// <summary>지금까지 돈 고정 단계 수</summary>
        public int TotalSteps { get; private set; }
        /// <summary>마지막 Advance 에서 돈 고정 단계 수</summary>
        public int LastSteps { get; private set; }
        /// <summary>상한에 걸려 버린 시간의 합 (초)</summary>
        public float TotalDropped { get; private set; }

        /// <summary>고정 단계 하나. 인자는 단계 길이(FixedStep)</summary>
        public event Action<float> Stepped;
        /// <summary>상한에 걸려 시간을 버렸다. (버린 시간, 이번 프레임에 돈 단계 수)</summary>
        public event Action<float, int> Dropped;

        /// <summary>화면 프레임 하나가 걸린 시간을 넣는다. 이번에 돈 고정 단계 수를 돌려준다</summary>
        public int Advance(float frameTime)
        {
            if (!(FixedStep > 0f)) throw new InvalidOperationException("FixedStep 은 0 보다 커야 한다");
            accumulator += frameTime; // [1] 화면 프레임이 걸린 시간을 쌓는다
            // Stepped 나 Dropped 를 받은 쪽이 다시 부르면 시간만 쌓는다. 바깥 루프가 이어서 돌리거나 다음 프레임에 돌린다
            if (advancing) return 0;
            advancing = true;
            int steps = 0;
            try
            {
                while (accumulator >= FixedStep) // [2] 쌓인 시간이 고정 간격만큼 있으면
                {
                    if (steps >= Math.Max(1, MaxStepsPerFrame)) // [3] 이번 프레임에 상한만큼 돌았으면
                    {
                        float dropped = accumulator;
                        accumulator = 0f; // [3] 남은 시간을 버린다: 따라잡으려고 더 돌지 않는다
                        TotalDropped += dropped;
                        Dropped?.Invoke(dropped, steps);
                        break;
                    }
                    accumulator -= FixedStep;
                    steps++;
                    TotalSteps++;
                    Stepped?.Invoke(FixedStep); // [2] 규칙을 고정 간격 한 단계만큼 돌린다
                }
            }
            finally
            {
                advancing = false;
                LastSteps = steps;
            }
            return steps;
        }
    }
}
