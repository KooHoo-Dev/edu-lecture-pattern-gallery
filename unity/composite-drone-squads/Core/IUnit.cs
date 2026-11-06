// 드론 하나(잎)와 편대(가지)가 함께 구현하는 인터페이스. 지휘 코드는 이것 하나만 알고, 받는 쪽이 드론인지 편대인지 묻지 않는다.
using System;

namespace PatternGallery.CompositeDroneSquads
{
    public enum Order
    {
        Sortie,
        Recall,
    }

    public interface IUnit
    {
        string Name { get; }

        /// <summary>속한 편대. 본대와 아직 합류하지 않은 편대는 null. Squad.Add 만 바꾼다</summary>
        Squad Parent { get; set; }

        /// <summary>출격. 편대면 자식마다 같은 메서드를 부른다</summary>
        void Sortie();

        /// <summary>귀환. 편대면 자식마다 같은 메서드를 부른다</summary>
        void Recall();

        /// <summary>이 아래에 있는 드론 수. 드론은 1, 편대는 자식들의 합</summary>
        int CountDrones();

        /// <summary>이 아래에서 기지 자리에 있는 드론 수</summary>
        int CountDocked();

        /// <summary>매 프레임 (MonoBehaviour.Update 의 Time.deltaTime). 편대는 자식에게 내려 보내고, 드론이 실제로 난다</summary>
        void Tick(float dt);

        /// <summary>명령을 받았을 때 (받은 쪽, 명령). 편대는 자식이 받은 것도 위로 올린다. 그래서 본대 하나만 구독하면 트리를 내려간 순서대로 들린다</summary>
        event Action<IUnit, Order> OrderReceived;

        /// <summary>드론이 목적지(정찰 지점이나 기지 자리)에 닿았을 때. 편대는 자식의 것을 위로 올린다</summary>
        event Action<Drone> Arrived;
    }
}
