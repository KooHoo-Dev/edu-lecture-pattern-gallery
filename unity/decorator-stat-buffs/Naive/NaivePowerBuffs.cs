// 나쁜 예: 무기 출력 float 하나를 버프가 시작할 때 더하고 곱하고, 끝날 때 빼고 나누는 흔한 코드.
// 실제로는 MonoBehaviour 안에서 코루틴으로 짠다:
//   IEnumerator CellBuff() { power += cellBonus; yield return new WaitForSeconds(cellDuration); power -= cellBonus; }
//   public void OnCell() { if (cellRoutine != null) StopCoroutine(cellRoutine); cellRoutine = StartCoroutine(CellBuff()); }
// Unity 없이 돌리려고 코루틴을 순수 C# 타이머(WaitTimer)로 흉내 낸다. StartCoroutine 은 yield 앞 줄(시작)을 바로 하고 타이머를 건다.
// 시간이 다 되면 yield 뒤 줄(끝)을 부른다. StopCoroutine 으로 멈춘 코루틴은 yield 뒤 줄이 영영 돌지 않는다 (Unity 와 같다).
// 갤러리의 '효과 끄기' 가 이 코드를 같은 입력으로 돌린다. 프로젝트에 넣지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.DecoratorStatBuffs.Naive
{
    /// <summary>코루틴 하나를 흉내 낸 타이머: WaitForSeconds 가 끝나면 onDone(yield 뒤 줄)을 부른다</summary>
    public sealed class WaitTimer
    {
        public float Remaining;
        public bool Running = true;
        readonly Action onDone;

        public WaitTimer(float seconds, Action onDone)
        {
            Remaining = seconds;
            this.onDone = onDone;
        }

        /// <summary>StopCoroutine: 멈춘 뒤에는 onDone 을 부르지 않는다</summary>
        public void Stop() => Running = false;

        public void Tick(float dt)
        {
            if (!Running) return;
            Remaining -= dt;
            if (Remaining > 0f) return;
            Running = false;
            onDone();
        }
    }

    public sealed class NaivePowerBuffs
    {
        public float basePower = 10f;
        public float cellBonus = 5f;
        public float overloadMultiplier = 2f;
        public float cellDuration = 3f;
        public float overloadDuration = 2.5f;

        /// <summary>무기 출력. 버프마다 이 값을 직접 고친다</summary>
        public float power = 10f;
        public WaitTimer cellRoutine;
        public WaitTimer overloadRoutine;
        /// <summary>MonoBehaviour 가 돌리고 있는 코루틴들 (흉내)</summary>
        readonly List<WaitTimer> coroutines = new List<WaitTimer>();

        public int RunningCount
        {
            get
            {
                int n = 0;
                foreach (WaitTimer t in coroutines)
                    if (t.Running) n++;
                return n;
            }
        }

        WaitTimer StartCoroutine(float seconds, Action onDone)
        {
            var t = new WaitTimer(seconds, onDone);
            coroutines.Add(t);
            return t;
        }

        void StopCoroutine(WaitTimer t) => t.Stop();

        public void OnCell()
        {
            if (cellRoutine != null) StopCoroutine(cellRoutine); // [!] 앞 코루틴을 멈추면 그 냉각 셀의 power -= cellBonus 도 영영 돌지 않는다
            cellRoutine = StartCoroutine(cellDuration, CellEnd);
            power += cellBonus; // [!] 앞에서 더한 냉각 셀을 빼지 않은 채 또 더한다 (끝날 때는 한 번만 뺀다)
        }

        void CellEnd()
        {
            power -= cellBonus;
            cellRoutine = null;
        }

        public void OnOverload()
        {
            if (overloadRoutine != null) StopCoroutine(overloadRoutine); // [!] 앞 과부하의 power /= overloadMultiplier 가 영영 돌지 않는다
            overloadRoutine = StartCoroutine(overloadDuration, OverloadEnd);
            power *= overloadMultiplier;
        }

        void OverloadEnd()
        {
            power /= overloadMultiplier; // [!] 과부하가 걸린 뒤에 더한 몫까지 함께 나눈다 (더하기와 곱하기를 건 순서와 다른 순서로 푼다)
            overloadRoutine = null;
        }

        /// <summary>정화: 돌고 있는 버프의 코루틴을 멈추고 끝 처리를 직접 한다</summary>
        public void OnPurge()
        {
            if (cellRoutine != null)
            {
                StopCoroutine(cellRoutine);
                cellRoutine = null;
                power -= cellBonus; // [!] 과부하로 함께 커진 몫은 모른 채 더한 양만 뺀다
            }
            if (overloadRoutine != null)
            {
                StopCoroutine(overloadRoutine);
                overloadRoutine = null;
                power /= overloadMultiplier;
            }
        }

        public void Update(float dt)
        {
            foreach (WaitTimer t in coroutines.ToArray()) t.Tick(dt);
            coroutines.RemoveAll(t => !t.Running);
        }
    }
}
