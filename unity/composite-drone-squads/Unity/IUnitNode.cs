// Hierarchy 의 마디(편대 오브젝트, 드론 오브젝트)가 함께 구현하는 인터페이스. SquadNode 는 자식 오브젝트가 드론인지 편대인지 묻지 않고 이것으로 코어 유닛을 얻는다.
namespace PatternGallery.CompositeDroneSquads
{
    public interface IUnitNode
    {
        /// <summary>이 오브젝트의 코어 유닛을 만든다 (편대면 자기 바로 아래 자식들까지). 두 번 불러도 처음 만든 것을 돌려준다</summary>
        IUnit Build(FlightSettings settings);
    }
}
