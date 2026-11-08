// 드론 종류 에셋 (ScriptableObject): 종류마다 같은 값(이름, 최대 HP, 속도, 색)을 Inspector 에 적어 두는 곳.
// 런타임 값(지금 HP 등)은 두지 않는다. Play 할 때 SquadInput 이 ToDroneType() 으로 코어 DroneType 을 한 번 만들고, 에셋은 읽기만 한다.
using UnityEngine;

namespace PatternGallery.FlyweightDroneTypes
{
    [CreateAssetMenu(fileName = "DroneType", menuName = "Pattern Gallery/Drone Type")]
    public class DroneTypeAsset : ScriptableObject
    {
        [Tooltip("종류 이름 (정찰형, 중장갑). Squad 의 종류 사전 열쇠라 에셋끼리 달라야 한다")]
        [SerializeField] string typeName = "";
        [Tooltip("드론 이름의 머리 글자 (S 면 S1, S2 …)")]
        [SerializeField] string code = "";
        [SerializeField] int maxHp = 4;
        [SerializeField] float speed = 2f;
        [SerializeField] Color color = Color.white;

        public string TypeName => typeName;

        /// <summary>
        /// 코어 종류 객체를 새로 만든다. 부를 때마다 새 객체라, 종류마다 한 번만 부르고 그 객체를 모든 드론이 함께 쓴다.
        /// 드론이 나올 때마다 부르면 종류 데이터가 드론 수만큼 생기고 밸런스 수정이 한 대에만 들어간다.
        /// </summary>
        public DroneType ToDroneType() => new DroneType(typeName, code, maxHp, speed, "#" + ColorUtility.ToHtmlStringRGB(color));
    }
}
