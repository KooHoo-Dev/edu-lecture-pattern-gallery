// 나쁜 예: 견본 드론을 MemberwiseClone() 만으로 복제하는 흔한 코드 (얕은 복사).
// Hp, Speed 같은 값 필드는 복제본마다 따로 복사되지만, Modules 는 목록의 주소만 복사되어 견본과 모든 복제본이 같은 목록 하나를 쓴다.
// 실제로는 격납고 MonoBehaviour 안의 코드다. 여기서는 Unity 없이 돌리려고 순수 C# 로 두었다. 이벤트가 없어 하네스가 상태를 비교해 기록한다.
// 프로젝트에 넣지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.PrototypeDroneClone.Naive
{
    public class NaiveScoutDrone
    {
        public string Name;
        public int MaxHp;
        public int Hp;
        public float Speed;
        public List<string> Modules = new List<string>();

        public NaiveScoutDrone Clone()
        {
            return (NaiveScoutDrone)MemberwiseClone(); // [!] 얕은 복사: Hp, Speed 는 따로 복사되지만 Modules 는 견본과 같은 목록을 가리킨다
        }
    }

    public class NaiveHangar
    {
        public int maxClones = 5;
        public int damageAmount = 40;
        public float upgradeSpeed = 2f;
        public string moduleName = "냉각";

        public NaiveScoutDrone template;
        public List<NaiveScoutDrone> clones = new List<NaiveScoutDrone>();

        public NaiveHangar()
        {
            template = new NaiveScoutDrone { Name = "정찰 드론", MaxHp = 100, Hp = 100, Speed = 4f };
            template.Modules.Add("카메라");
        }

        public void OnClone()
        {
            if (clones.Count >= maxClones) return;
            NaiveScoutDrone drone = template.Clone();
            clones.Add(drone);
            drone.Name = "#" + clones.Count;
        }

        public void OnModule()
        {
            if (clones.Count == 0) return;
            clones[clones.Count - 1].Modules.Add(moduleName);
        }

        public void OnDamage()
        {
            if (clones.Count == 0) return;
            NaiveScoutDrone first = clones[0];
            first.Hp = Math.Max(0, first.Hp - damageAmount);
        }

        public void OnUpgrade()
        {
            template.Speed += upgradeSpeed;
        }
    }
}
