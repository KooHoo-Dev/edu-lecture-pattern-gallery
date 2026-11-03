// 게임 오버: 체력이 0 이 되는 순간 패널을 켠다. Died 이벤트만 듣는다.
// 항상 켜진 오브젝트(Canvas 등)에 붙이고, 꺼 둔 게임 오버 패널을 Panel 칸에 넣는다 (패널 자신에 붙이면 꺼져 있는 동안 구독하지 않는다).
using UnityEngine;

namespace PatternGallery.ObserverHealthEvents
{
    public class GameOverOnDeath : MonoBehaviour
    {
        [SerializeField] PlayerHealth target;
        [SerializeField] GameObject panel;

        readonly GameOverPanel gameOver = new GameOverPanel();

        void OnEnable()
        {
            if (panel == null) Debug.LogWarning("[GameOver] Panel 칸이 비어 있다", this);
            gameOver.Shown += OnShown;
            gameOver.Bind(target.Health); // 이미 죽은 뒤에 켜져도 바로 띄운다
        }

        void OnDisable()
        {
            gameOver.Unbind();
            gameOver.Shown -= OnShown;
        }

        void OnShown()
        {
            if (panel != null) panel.SetActive(true);
        }
    }
}
