// 구역 세트 하나의 겉모습 (ScriptableObject 에셋): 바닥 색, 드론과 투사체의 프리팹이나 색을 한 에셋에 묶는다.
// 코어 공장(Core/ZoneFactories.cs)은 무엇을 만들지, 이 에셋은 어떻게 보일지를 맡는다. 에셋 하나 = 세트 하나라 Inspector 에서도 짝이 어긋나지 않는다.
using UnityEngine;

namespace PatternGallery.AbstractFactoryZoneThemes
{
    [CreateAssetMenu(fileName = "ZoneArtSet", menuName = "Pattern Gallery/Zone Art Set")]
    public class ZoneArtSet : ScriptableObject
    {
        // 새 에셋의 기본값은 일부러 비워 둔다 (Theme 빈 값, 색 회색). 유효한 값(forest)을 기본으로 두면 고치지 않은 에셋이 경고 없이 숲 세트가 된다
        [Tooltip("이 에셋이 입히는 공장의 Theme. ForestFactory 는 forest, LavaFactory 는 lava, IceFactory 는 ice (글자까지 같아야 한다). 비워 두면 Play 할 때 Console 에 오류가 난다")]
        public string theme = "";
        [Tooltip("화면 글에 쓰는 구역 이름 (숲, 용암, 빙하). 비우면 Theme 을 쓴다")]
        public string displayName = "";
        [Tooltip("이 구역에 들어가면 바닥을 이 색으로 칠한다")]
        public Color groundColor = Color.gray;

        [Header("드론 (이 세트의 공장이 만든 드론)")]
        [Tooltip("비우면 Cube 를 만들어 Drone Color 로 칠한다. 넣으면 프리팹의 겉모습 그대로이고 칠하지 않는다")]
        public GameObject dronePrefab;
        public Color droneColor = Color.gray;

        [Header("투사체 (이 세트의 공장이 만든 투사체)")]
        [Tooltip("비우면 Sphere 를 만들어 Projectile Color 로 칠한다. 넣으면 프리팹의 겉모습 그대로이고 칠하지 않는다")]
        public GameObject projectilePrefab;
        public Color projectileColor = Color.gray;

        public GameObject MakeDrone(Transform parent) => Make(dronePrefab, PrimitiveType.Cube, droneColor, 0.7f, parent);

        public GameObject MakeProjectile(Transform parent) => Make(projectilePrefab, PrimitiveType.Sphere, projectileColor, 0.35f, parent);

        /// <summary>프리팹이 있으면 Instantiate, 없으면 기본 도형을 만들어 칠한다. 드론과 투사체가 같은 코드를 쓴다</summary>
        static GameObject Make(GameObject prefab, PrimitiveType shape, Color color, float size, Transform parent)
        {
            if (prefab != null) return Instantiate(prefab, parent);
            GameObject go = GameObject.CreatePrimitive(shape);
            go.transform.SetParent(parent, false);
            go.transform.localScale = Vector3.one * size;
            Paint(go, color);
            return go;
        }

        /// <summary>
        /// 스프라이트면 SpriteRenderer.color, 아니면 MaterialPropertyBlock 으로 _BaseColor(URP Lit)와 _Color(Built-in) 에 넣는다.
        /// renderer.material 을 쓰면 오브젝트마다 머티리얼 사본이 생긴다
        /// </summary>
        public static void Paint(GameObject go, Color color)
        {
            if (go.TryGetComponent(out SpriteRenderer sprite))
            {
                sprite.color = color;
                return;
            }
            if (!go.TryGetComponent(out Renderer renderer)) return;
            var block = new MaterialPropertyBlock();
            renderer.GetPropertyBlock(block);
            block.SetColor("_BaseColor", color);
            block.SetColor("_Color", color);
            renderer.SetPropertyBlock(block);
        }
    }
}
