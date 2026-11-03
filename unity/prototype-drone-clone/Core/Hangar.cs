// 격납고: 견본 드론 하나와 복제본 목록을 들고 복제·모듈 장착·피해·견본 개조 입력을 처리한다. 일어난 일은 C# event 로 알린다.
// 시간이 흐르는 규칙이 없어 Tick 이 없다. UnityEngine 을 쓰지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.PrototypeDroneClone
{
    public sealed class Hangar
    {
        /// <summary>활주로에 세울 수 있는 복제본 수</summary>
        public int MaxClones = 5;
        /// <summary>'첫 복제본에 피해' 한 번에 깎는 HP</summary>
        public int DamageAmount = 40;
        /// <summary>'견본 개조' 한 번에 견본에 더하는 속도</summary>
        public float UpgradeSpeed = 2f;
        /// <summary>'마지막 복제본에 모듈 달기' 가 다는 모듈 이름</summary>
        public string ModuleName = "냉각";

        public ScoutDrone Template { get; }
        readonly List<ScoutDrone> clones = new List<ScoutDrone>();
        public IReadOnlyList<ScoutDrone> Clones => clones;

        /// <summary>복제본이 활주로에 섰다 (복제본)</summary>
        public event Action<ScoutDrone> Cloned;
        /// <summary>활주로가 가득 차 복제를 받지 않았다 (최대 수)</summary>
        public event Action<int> CloneRejected;
        /// <summary>드론에 모듈을 달았다 (드론, 모듈)</summary>
        public event Action<ScoutDrone, string> ModuleAttached;
        /// <summary>드론이 피해를 입었다 (드론, 피해량)</summary>
        public event Action<ScoutDrone, int> Damaged;
        /// <summary>견본의 속도가 바뀌었다 (이전, 지금)</summary>
        public event Action<float, float> TemplateUpgraded;
        /// <summary>복제본이 하나도 없어 입력을 받지 않았다 (입력 이름: module, damage)</summary>
        public event Action<string> NoClone;

        public Hangar(ScoutDrone template)
        {
            Template = template; // [1] 다 설정한 견본을 받아 둔다. 복제본은 모두 이것에서 나온다
        }

        /// <summary>견본을 복제해 활주로에 세운다. 가득 차 받지 않으면 null</summary>
        public ScoutDrone CloneTemplate()
        {
            if (clones.Count >= MaxClones)
            {
                CloneRejected?.Invoke(MaxClones);
                return null;
            }
            ScoutDrone drone = Template.Clone(); // [2] 생성자 인자를 다시 늘어놓지 않고 견본에게 복제를 맡긴다
            clones.Add(drone);
            drone.Name = "#" + clones.Count; // 필드에 새 string 을 대입하므로 이 복제본의 이름만 바뀐다 (견본 이름은 그대로)
            Cloned?.Invoke(drone);
            return drone;
        }

        /// <summary>마지막 복제본에 모듈을 단다</summary>
        public void AttachModule()
        {
            if (clones.Count == 0)
            {
                NoClone?.Invoke("module");
                return;
            }
            ScoutDrone target = clones[clones.Count - 1];
            target.Modules.Add(ModuleName); // [4] 이 복제본의 목록에만 들어간다. 견본과 다른 복제본은 그대로다
            ModuleAttached?.Invoke(target, ModuleName);
        }

        /// <summary>첫 복제본에 피해를 준다</summary>
        public void DamageFirst()
        {
            if (clones.Count == 0)
            {
                NoClone?.Invoke("damage");
                return;
            }
            ScoutDrone target = clones[0];
            target.TakeDamage(DamageAmount); // [4]
            Damaged?.Invoke(target, DamageAmount);
        }

        /// <summary>견본을 개조한다. 이후 복제본만 빨라지고 이미 나간 복제본은 그대로다</summary>
        public void UpgradeTemplate()
        {
            float previous = Template.Speed;
            Template.AddSpeed(UpgradeSpeed);
            TemplateUpgraded?.Invoke(previous, Template.Speed);
        }
    }
}
