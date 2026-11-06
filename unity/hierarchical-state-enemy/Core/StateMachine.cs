// 계층 상태 기계: 지금 잎 상태 하나를 들고, 입력은 잎에서 부모 쪽으로 올리고, Tick 은 바깥 부모부터 돌리며, 전이는 공통 조상까지만 나갔다 들어온다.
using System;

namespace PatternGallery.HierarchicalStateEnemy
{
    public sealed class StateMachine
    {
        public readonly Drone Drone;

        /// <summary>지금 잎 상태 (Patrol, Search, Chase, Attack, Stunned 중 하나). 부모들은 Parent 를 따라가면 나온다</summary>
        public HState Current { get; private set; }

        /// <summary>이번 Tick 에서 전이가 일어났는가</summary>
        bool changed;

        /// <summary>상태 하나의 Enter 를 부른 뒤 (부모부터 차례로 한 층씩)</summary>
        public event Action<HState> Entered;
        /// <summary>상태 하나의 Exit 를 부른 뒤 (잎부터 차례로 한 층씩)</summary>
        public event Action<HState> Exited;
        /// <summary>입력을 처리한 층 (그 층, 입력)</summary>
        public event Action<HState, string> Handled;
        /// <summary>잎부터 맨 바깥까지 아무 층도 받지 않은 입력 (그때의 잎, 입력)</summary>
        public event Action<HState, string> Ignored;

        /// <summary>start 는 잎 상태. 바깥 부모부터 Enter 한다 (아직 구독자가 없어 이벤트는 들리지 않는다)</summary>
        public StateMachine(Drone drone, HState start)
        {
            Drone = drone;
            Current = start;
            EnterDown(start, null);
        }

        /// <summary>
        /// 입력은 지금 잎에서 시작해 부모 쪽으로 올라가며, 처음으로 true 를 돌려준 층이 맡는다.
        /// EMP 는 잎들이 모두 false 를 돌려주고 Active 가 받는다
        /// </summary>
        public bool Handle(string evt)
        {
            HState leaf = Current;
            for (HState s = leaf; s != null; s = s.Parent)
            {
                if (!s.Handle(this, evt)) continue; // [1] 이 층이 받지 않으면 부모에게 올린다
                Handled?.Invoke(s, evt);
                return true;
            }
            Ignored?.Invoke(leaf, evt);
            return false;
        }

        /// <summary>매 프레임. 바깥 부모의 Tick 부터 잎 쪽으로 부르고, 어느 층이 전이하면 그 아래 층은 이 프레임에 건너뛴다</summary>
        public void Tick(float dt)
        {
            changed = false;
            TickDown(Current, dt);
        }

        /// <summary>s 의 부모들을 먼저 Tick 한다. 전이가 일어났으면 true 를 돌려줘 남은 층을 건너뛴다</summary>
        bool TickDown(HState s, float dt)
        {
            if (s.Parent != null && TickDown(s.Parent, dt)) return true; // [4] 부모 규칙(놓치면 수색)이 자식(공격)보다 먼저다
            s.Tick(this, dt); // [4]
            return changed;
        }

        /// <summary>
        /// 잎 target 으로 바꾼다. 지금 잎과 target 의 공통 조상을 찾아,
        /// 지금 잎부터 공통 조상 바로 아래까지 안쪽부터 Exit, 공통 조상 아래에서 target 까지 바깥부터 Enter.
        /// Chase → Attack 은 공통 조상이 Combat 이라 Combat 을 나가지도 다시 들어오지도 않는다
        /// </summary>
        public void ChangeState(HState target)
        {
            if (target == Current) return;
            HState common = CommonAncestor(Current, target);
            for (HState s = Current; s != common; s = s.Parent)
            {
                s.Exit(this); // [2] 안쪽(잎)부터 공통 조상 바로 아래까지 나간다
                Exited?.Invoke(s);
            }
            Current = target;
            changed = true;
            EnterDown(target, common);
        }

        /// <summary>stop 아래에서 s 까지 바깥부터 Enter 한다 (s 의 부모를 먼저)</summary>
        void EnterDown(HState s, HState stop)
        {
            if (s == stop) return;
            EnterDown(s.Parent, stop);
            s.Enter(this); // [3] 공통 조상 아래에서 바깥부터 들어간다
            Entered?.Invoke(s);
        }

        /// <summary>a 와 b 를 함께 품은 가장 가까운 상태. 없으면 null (Active 안의 잎과 Stunned 처럼 뿌리가 다르다)</summary>
        static HState CommonAncestor(HState a, HState b)
        {
            for (HState x = a; x != null; x = x.Parent)
                for (HState y = b; y != null; y = y.Parent)
                    if (x == y) return x;
            return null;
        }

        /// <summary>바깥부터 잎까지의 이름 (예: Active/Combat/Attack)</summary>
        public static string PathOf(HState s) => s.Parent == null ? s.Name : PathOf(s.Parent) + "/" + s.Name;
    }
}
