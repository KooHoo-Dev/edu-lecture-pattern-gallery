// 나쁜 예: 종류 데이터(ScriptableObject 에셋)에 지금 HP 칸까지 두고, 드론이 그 칸을 깎는 흔한 코드다.
// 실제로는 NaiveDroneType 이 ScriptableObject, NaiveDrone 이 드론 오브젝트의 MonoBehaviour, NaiveSquad 가 입력을 받는 MonoBehaviour 다.
// 정찰형 드론은 모두 같은 에셋 하나를 가리키므로 currentHp 도 하나뿐이다. 한 대를 때리면 같은 종류가 모두 깎이고,
// 새로 나온 드론도 깎인 HP 로 나온다. currentHp 는 에셋 Inspector 에 maxHp 와 같게 적어 두었다.
// 에디터에서는 Play 를 꺼도 에셋에 깎인 currentHp 가 남아 다음 Play 도 다친 채 시작한다 (빌드에서는 남지 않는다).
// 여기서는 Unity 없이 돌리려고 순수 C# 으로 옮겼다 (Destroy(gameObject) 는 목록에서 빼는 것으로). 갤러리의 '효과 끄기' 가 같은 입력으로 돌린다.
// 프로젝트에 넣지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.FlyweightDroneTypes.Naive
{
    /// <summary>실제로는 [CreateAssetMenu] 를 붙인 ScriptableObject</summary>
    public sealed class NaiveDroneType
    {
        public string typeName;
        public string code;
        public int maxHp;
        public float speed;
        public string color;
        public int currentHp; // [!] 공유 에셋에 지금 HP: 같은 종류 드론이 모두 이 칸 하나를 쓴다
    }

    /// <summary>실제로는 드론 오브젝트에 붙은 MonoBehaviour. type 칸에 에셋을 끌어 넣는다</summary>
    public sealed class NaiveDrone
    {
        public NaiveDroneType type;
        public string droneName;
        public float x;

        public int Hp => type.currentHp;

        public void TakeDamage(int amount)
        {
            type.currentHp = Math.Max(0, type.currentHp - amount); // [!] 자기 HP 가 아니라 종류 에셋의 칸을 깎는다
        }
    }

    public sealed class NaiveSquad
    {
        public int damage = 1;
        public int patchHp = 2;
        public int maxDrones = 9;
        public float spacing = 1.75f;
        public NaiveDroneType scoutType;
        public NaiveDroneType heavyType;
        public List<NaiveDrone> drones = new List<NaiveDrone>();
        readonly Dictionary<NaiveDroneType, int> made = new Dictionary<NaiveDroneType, int>();

        public void OnHitScout() => Hit(scoutType);
        public void OnHitHeavy() => Hit(heavyType);
        public void OnSpawn() => Spawn(scoutType);
        public void OnPatch() => scoutType.maxHp += patchHp;

        public NaiveDrone Spawn(NaiveDroneType type)
        {
            if (drones.Count >= maxDrones) return null;
            made.TryGetValue(type, out int n);
            made[type] = ++n;
            // 실제로는 Instantiate(dronePrefab) 뒤 drone.type = type. HP 는 에셋의 currentHp 를 읽는다
            var drone = new NaiveDrone { type = type, droneName = type.code + n, x = FreeX() };
            drones.Add(drone);
            return drone;
        }

        void Hit(NaiveDroneType type)
        {
            NaiveDrone target = drones.Find(d => d.type == type);
            if (target == null) return;
            target.TakeDamage(damage);
            if (target.Hp <= 0) drones.Remove(target); // 실제로는 Destroy(target.gameObject)
        }

        float FreeX()
        {
            for (int slot = 0; ; slot++)
            {
                float x = slot * spacing;
                if (!drones.Exists(d => d.x == x)) return x;
            }
        }
    }
}
