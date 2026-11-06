// 나쁜 예: 드론 목록과 편대 목록을 따로 들고, 지휘 코드가 foreach 를 두 단계로 겹쳐 도는 흔한 코드. 실제로는 지휘 MonoBehaviour 안에 있다.
// 처음에는 본대 = 드론 + 편대(드론만 든)였고, 나중에 편대 안 편대(squads)를 더했지만 지휘 코드는 그대로 두었다.
// 드론(Core 의 Drone)은 각자 자기 MonoBehaviour 의 Update 에서 날므로 여기서 Tick 하지 않는다. 갤러리의 '효과 끄기' 가 이 코드를 같은 입력으로 돌린다. 프로젝트에 넣지 않는다.
using System.Collections.Generic;

namespace PatternGallery.CompositeDroneSquads.Naive
{
    public sealed class NaiveSquad
    {
        public string name;
        public List<Drone> drones = new List<Drone>();
        /// <summary>나중에 더한 하위 편대 목록</summary>
        public List<NaiveSquad> squads = new List<NaiveSquad>();

        public NaiveSquad(string name)
        {
            this.name = name;
        }
    }

    public sealed class NaiveCommander
    {
        public NaiveSquad root = new NaiveSquad("본대");
        public NaiveSquad squadB = new NaiveSquad("B");
        /// <summary>지원 편대 C. 합류 전에는 본대 밖에서 정찰 중</summary>
        public NaiveSquad support = new NaiveSquad("C");
        public bool supportJoined;

        public void SortieAll()
        {
            foreach (Drone d in root.drones) d.Sortie();
            foreach (NaiveSquad s in root.squads)
                foreach (Drone d in s.drones) d.Sortie(); // [!] 두 단계까지만. s.squads(하위 편대)는 돌지 않는다
        }

        public void RecallAll()
        {
            foreach (Drone d in root.drones) d.Recall();
            foreach (NaiveSquad s in root.squads)
                foreach (Drone d in s.drones) d.Recall(); // [!] 두 단계까지만. 하위 편대 C 의 드론에 귀환 명령이 닿지 않는다
        }

        public int CountDrones()
        {
            int n = root.drones.Count;
            foreach (NaiveSquad s in root.squads) n += s.drones.Count; // [!] 하위 편대의 드론을 세지 않는다
            return n;
        }

        public void JoinSupport()
        {
            if (supportJoined) return;
            supportJoined = true;
            squadB.squads.Add(support); // 지원 편대 C 는 B 의 하위 편대가 된다
        }
    }
}
