// 드론 줄: 단발은 맨 앞 드론을, 일제 사격은 살아 있는 드론 모두를 같은 프레임에 파괴한다. 파괴와 웨이브 끝을 이벤트로 알리기만 하고 소리는 모른다.
using System;

namespace PatternGallery.EventQueueSound
{
    public sealed class DroneLine
    {
        /// <summary>드론마다 살아 있는가. 0 번이 포탑에 가장 가까운 맨 앞 드론이다</summary>
        readonly bool[] alive;

        public int Wave { get; private set; } = 1;

        /// <summary>드론 하나가 파괴됐다 (드론 번호, 0 부터)</summary>
        public event Action<int> Destroyed;
        /// <summary>마지막 드론이 파괴되어 웨이브가 끝났다 (웨이브 번호)</summary>
        public event Action<int> WaveCleared;
        /// <summary>새 웨이브로 드론이 다시 섰다 (웨이브 번호, 드론 수)</summary>
        public event Action<int, int> WaveStarted;
        /// <summary>쐈지만 살아 있는 드론이 없다</summary>
        public event Action NoTarget;

        public DroneLine(int count)
        {
            alive = new bool[Math.Max(1, count)];
            for (int i = 0; i < alive.Length; i++) alive[i] = true;
        }

        public int Count => alive.Length;
        public bool IsAlive(int index) => alive[index];

        public int AliveCount
        {
            get
            {
                int n = 0;
                foreach (bool a in alive)
                    if (a) n++;
                return n;
            }
        }

        /// <summary>단발: 살아 있는 드론 중 맨 앞 하나</summary>
        public void Shot()
        {
            for (int i = 0; i < alive.Length; i++)
            {
                if (!alive[i]) continue;
                Destroy(i);
                return;
            }
            NoTarget?.Invoke();
        }

        /// <summary>일제 사격: 살아 있는 드론 모두를 이 호출 안에서 (같은 프레임에) 차례로</summary>
        public void Volley()
        {
            bool any = false;
            for (int i = 0; i < alive.Length; i++)
            {
                if (!alive[i]) continue;
                Destroy(i);
                any = true;
            }
            if (!any) NoTarget?.Invoke();
        }

        /// <summary>새 웨이브: 드론이 모두 다시 선다</summary>
        public void NewWave()
        {
            Wave++;
            for (int i = 0; i < alive.Length; i++) alive[i] = true;
            WaveStarted?.Invoke(Wave, alive.Length);
        }

        void Destroy(int index)
        {
            alive[index] = false;
            Destroyed?.Invoke(index);
            if (AliveCount == 0) WaveCleared?.Invoke(Wave);
        }
    }
}
