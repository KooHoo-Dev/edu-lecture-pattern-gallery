// 나쁜 예: 매니저가 for 문으로 드론 목록을 도는데, 드론이 자기 Update 안에서 목록을 바로 Remove 하고 Add 하는 흔한 코드.
// 실제로는 NaiveDroneManager 가 MonoBehaviour 이고 Update() 에서 Time.deltaTime 으로 돈다. Unity 없이 돌리려고 Update(dt) 로 받는다.
// 갤러리의 '효과 끄기' 가 같은 입력으로 돌린다. 프로젝트에 넣지 않는다.
using System.Collections.Generic;

namespace PatternGallery.UpdateMethodDroneList.Naive
{
    public sealed class NaiveDrone
    {
        public string name;
        public bool isSplitter;
        /// <summary>화면에만 쓰는 줄 번호</summary>
        public int lane;
        public float x;
        public int hp;
        public float age;
        public int updates;

        public void Update(float dt, NaiveDroneManager manager)
        {
            updates++;
            age += dt;
            x -= manager.moveSpeed * dt;
            if (hp <= 0 || x <= manager.baseX)
            {
                manager.drones.Remove(this); // [!] 도는 중에 바로 지운다: 뒤 칸이 당겨져 다음 드론을 건너뛴다
                return;
            }
            if (isSplitter && age >= manager.splitDelay)
            {
                for (int k = 0; k < manager.splitCount; k++)
                {
                    var piece = new NaiveDrone { name = name + (char)('a' + k), x = x, hp = manager.droneHp, lane = (lane + k) % 3 };
                    manager.drones.Add(piece); // [!] 도는 중에 바로 더한다: 늘어난 Count 로 이번 프레임에 돈다
                }
                manager.drones.Remove(this); // [!] 나뉜 드론도 바로 지운다: 다음 드론을 건너뛴다
            }
        }
    }

    public sealed class NaiveDroneManager
    {
        public readonly List<NaiveDrone> drones = new List<NaiveDrone>();
        public float moveSpeed = 3f;
        public float splitDelay = 1f;
        public int splitCount = 2;
        public float startX = 14.8f;
        public float baseX = 1.8f;
        public int droneHp = 1;
        public int splitterHp = 2;
        int launched;

        public void OnSpawn() => Launch(false);
        public void OnSplitter() => Launch(true);

        void Launch(bool splitter)
        {
            launched++;
            drones.Add(new NaiveDrone { name = (splitter ? "S" : "D") + launched, isSplitter = splitter, x = startX, hp = splitter ? splitterHp : droneHp, lane = (launched - 1) % 3 });
        }

        public void OnEmp()
        {
            foreach (NaiveDrone d in drones) d.hp -= 1;
        }

        /// <summary>실제로는 MonoBehaviour.Update()</summary>
        public void Update(float dt)
        {
            for (int i = 0; i < drones.Count; i++)
                drones[i].Update(dt, this);
        }
    }
}
