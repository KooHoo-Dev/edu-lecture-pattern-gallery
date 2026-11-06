// 계층 상태의 바탕: 상태마다 부모(Parent)가 있고, 자식이 처리하지 않은 입력과 여러 자식에 공통인 규칙은 부모가 맡는다.
namespace PatternGallery.HierarchicalStateEnemy
{
    /// <summary>
    /// 상태 하나. 상태 객체에는 드론별 값을 두지 않는다 (그 값은 Drone 이 든다).
    /// 그래서 DroneStates 의 static 한 벌을 드론 몇 대든 같이 쓴다.
    /// Enter 와 Exit 안에서는 ChangeState 를 부르지 않는다 (전이 도중에 또 전이하면 나가고 들어가는 순서가 꼬인다. StateMachine 이 예외로 막는다).
    /// </summary>
    public abstract class HState
    {
        public readonly string Name;
        /// <summary>바로 위 부모. 맨 바깥 상태(Active, Stunned)는 null</summary>
        public readonly HState Parent;
        /// <summary>자식이 하나라도 있는가 (Active, Combat). 자식이 생성자에서 부모에 표시한다. ChangeState 의 target 은 자식이 없는 잎이어야 한다</summary>
        public bool HasChildren { get; private set; }

        protected HState(string name, HState parent)
        {
            Name = name;
            Parent = parent;
            if (parent != null) parent.HasChildren = true;
        }

        /// <summary>이 상태에 들어올 때 한 번. 부모부터 자식 순서로 불린다</summary>
        public virtual void Enter(StateMachine m) { }

        /// <summary>이 상태에서 나갈 때 한 번. 자식부터 부모 순서로 불린다. Enter 에서 바꾼 것을 되돌린다</summary>
        public virtual void Exit(StateMachine m) { }

        /// <summary>매 프레임. 바깥 부모부터 불리고, 이 층이 ChangeState 를 부르면 그 아래 층은 이 프레임에 불리지 않는다</summary>
        public virtual void Tick(StateMachine m, float dt) { }

        /// <summary>입력 하나. 처리했으면 true, 아니면 false 를 돌려줘 부모에게 넘긴다</summary>
        public virtual bool Handle(StateMachine m, string evt) => false;
    }
}
