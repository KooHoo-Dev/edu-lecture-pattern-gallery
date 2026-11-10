// 책임 연쇄의 사슬: 클릭을 앞의 처리자부터 차례로 넘기고, 처리자가 true(소비)를 돌려주면 거기서 멈춘다.
// 관찰자(이벤트)는 모든 구독자에게 알리지만, 사슬은 처리한 하나에서 멈춘다. UnityEngine 을 쓰지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.ChainInputHandlers
{
    /// <summary>클릭 처리자. 자기 영역의 클릭이면 처리하고 true(소비), 아니면 아무것도 하지 않고 false(다음 처리자로)</summary>
    public interface IClickHandler
    {
        bool Handle(Click c);
    }

    public sealed class ClickChain
    {
        readonly List<IClickHandler> handlers = new List<IClickHandler>();

        /// <summary>받는 순서. 앞이 먼저 받는다</summary>
        public IReadOnlyList<IClickHandler> Handlers => handlers;

        /// <summary>처리자가 받지 않아 다음으로 넘겼을 때 (넘긴 처리자, 클릭)</summary>
        public event Action<IClickHandler, Click> Passed;
        /// <summary>처리자가 처리하고 소비했을 때 (소비한 처리자, 클릭). 그 뒤의 처리자는 이 클릭을 받지 않는다</summary>
        public event Action<IClickHandler, Click> Handled;
        /// <summary>끝까지 아무도 받지 않았을 때. 조용히 버리지 않고 알린다 (왜 반응이 없는지 찾을 수 있게)</summary>
        public event Action<Click> Unhandled;

        /// <summary>사슬 끝에 붙인다. 화면에서 위에 그려지는 것부터 붙여야 가려진 것이 클릭을 가로채지 않는다</summary>
        public void Add(IClickHandler handler)
        {
            if (handler == null) throw new ArgumentNullException(nameof(handler));
            if (handlers.Contains(handler)) return; // 두 번 붙이면 같은 처리자가 한 클릭을 두 번 볼 수 있다
            handlers.Add(handler);
        }

        public bool Remove(IClickHandler handler) => handlers.Remove(handler);

        /// <summary>클릭 하나를 사슬의 맨 앞에 넣는다. 누군가 소비했으면 true</summary>
        public bool Send(Click c)
        {
            // 처리자가 처리하는 도중에 사슬을 바꿔도(붙이기, 빼기) 이번 클릭은 시작할 때의 순서로 돈다.
            // 붙인 처리자는 다음 클릭부터 받고, 도중에 뺀 처리자는 이번 클릭도 받지 않는다.
            // 처리자 안에서 Send 를 다시 불러도(재진입) 안쪽 클릭은 자기 복사본으로 따로 돈다.
            IClickHandler[] order = handlers.ToArray(); // [1]
            foreach (IClickHandler h in order)
            {
                if (!handlers.Contains(h)) continue;
                if (h.Handle(c)) // [2]
                {
                    Handled?.Invoke(h, c); // [2] 소비: 뒤로 넘기지 않는다
                    return true;
                }
                Passed?.Invoke(h, c); // [3]
            }
            Unhandled?.Invoke(c); // [4]
            return false;
        }
    }
}
