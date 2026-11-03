// 드론 한 대의 화면: 이름, HP 바, 모듈 상자. 코어 ScoutDrone 의 값을 받아 그리기만 하고 규칙은 모른다.
// 이 컴포넌트가 붙은 오브젝트를 프리팹으로 만들어 DroneHangar 의 Clone Prefab 칸에 넣는다.
using System.Collections.Generic;
using UnityEngine;

namespace PatternGallery.PrototypeDroneClone
{
    public class DroneView : MonoBehaviour
    {
        [Tooltip("x 크기로 HP 비율을 보이는 Transform. 왼쪽 끝에 둔 빈 부모를 넣으면 왼쪽을 기준으로 줄어든다")]
        [SerializeField] Transform hpFill;
        [Tooltip("모듈 상자를 아래로 쌓을 자리 (드론 아래의 빈 자식)")]
        [SerializeField] Transform moduleRoot;
        [Tooltip("모듈 하나를 보이는 작은 상자 프리팹")]
        [SerializeField] GameObject moduleBoxPrefab;
        [SerializeField] float moduleGap = 0.35f;

        /// <summary>코어 드론의 지금 값으로 모두 다시 그린다 (복제 직후, 견본 개조 뒤)</summary>
        public void Show(ScoutDrone drone)
        {
            gameObject.name = $"Drone {drone.Name}";
            ShowHp(drone);
            ShowModules(drone.Modules);
        }

        public void ShowHp(ScoutDrone drone)
        {
            if (hpFill == null) return;
            Vector3 s = hpFill.localScale;
            s.x = drone.MaxHp > 0 ? (float)drone.Hp / drone.MaxHp : 0f;
            hpFill.localScale = s;
        }

        public void ShowModules(IReadOnlyList<string> modules)
        {
            if (moduleRoot == null || moduleBoxPrefab == null) return;
            // 프리팹이나 장면 오브젝트를 Instantiate 하면 자식으로 있던 모듈 상자도 함께 복제된다. 있던 것을 모두 지우고 코어의 목록대로 다시 만든다
            for (int i = moduleRoot.childCount - 1; i >= 0; i--) Destroy(moduleRoot.GetChild(i).gameObject);
            for (int i = 0; i < modules.Count; i++)
            {
                GameObject box = Instantiate(moduleBoxPrefab, moduleRoot);
                box.transform.localPosition = new Vector3(0f, -i * moduleGap, 0f);
                box.name = modules[i];
            }
        }
    }
}
