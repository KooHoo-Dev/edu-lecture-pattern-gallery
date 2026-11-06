// 편대 오브젝트 (가지): 자기 바로 아래 자식 오브젝트를 보고 코어 Squad 를 Hierarchy 모양 그대로 만든다.
// Unity 의 Hierarchy 도 컴포지트다 (Transform 은 자식 Transform 목록을 들고, 부모를 옮기면 자식이 따라온다). 이 컴포넌트는 그 모양을 코어 트리로 옮길 뿐이다.
using UnityEngine;

namespace PatternGallery.CompositeDroneSquads
{
    public class SquadNode : MonoBehaviour, IUnitNode
    {
        Squad squad;

        /// <summary>BuildSquad 전에는 null. 본대 트리는 SquadCommandInput 이 처음 읽을 때 만든다</summary>
        public Squad Squad => squad;

        public Squad BuildSquad(FlightSettings settings)
        {
            if (squad != null) return squad;
            squad = new Squad(name);
            // 바로 아래 자식만 본다. 손주는 자식 편대가 자기 Build 에서 넣는다
            foreach (Transform child in transform)
            {
                if (!child.gameObject.activeSelf) continue; // 꺼 둔 자식 오브젝트는 편대에 넣지 않는다
                if (child.TryGetComponent(out IUnitNode node)) squad.Add(node.Build(settings)); // [3] 자식이 편대면 그 Build 가 다시 자기 자식을 넣는다
            }
            return squad;
        }

        IUnit IUnitNode.Build(FlightSettings settings) => BuildSquad(settings);

        /// <summary>다른 편대를 하위 편대로 받는다. 코어가 받아들였을 때만 Hierarchy 에서도 옮긴다</summary>
        public bool Join(SquadNode other)
        {
            if (squad == null || other.Squad == null) return false; // 둘 다 트리를 만든 뒤에만
            if (!squad.Add(other.Squad)) return false; // 자기 자신, 조상, 이미 소속이 있는 편대는 코어가 거절한다 (JoinRejected)
            // worldPositionStays = true: 지원 편대 오브젝트의 월드 위치를 그대로 두고 부모만 바꾼다
            other.transform.SetParent(transform, true);
            return true;
        }
    }
}
