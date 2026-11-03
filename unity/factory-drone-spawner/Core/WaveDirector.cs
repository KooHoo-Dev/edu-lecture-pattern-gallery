// 웨이브 지휘: 스포너 목록을 들고 '섞인 순서' 입력마다 다음 스포너를 고른다. 종류를 더하면 목록만 늘어난다.
// 어느 스포너가 무엇을 만드는지는 모른다. UnityEngine 을 쓰지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.FactoryDroneSpawner
{
    public sealed class WaveDirector
    {
        readonly List<DroneSpawner> spawners;

        public IReadOnlyList<DroneSpawner> Spawners => spawners;
        /// <summary>섞인 순서로 지금까지 내보낸 수</summary>
        public int Count { get; private set; }

        /// <summary>섞인 순서로 스포너를 골랐다 (몇 번째, 0 부터; 고른 스포너)</summary>
        public event Action<int, DroneSpawner> Picked;

        public WaveDirector(IEnumerable<DroneSpawner> spawners)
        {
            this.spawners = new List<DroneSpawner>(spawners);
        }

        /// <summary>다음 '섞인 순서' 가 고를 스포너. 목록이 비었으면 null</summary>
        public DroneSpawner PeekNext() => spawners.Count > 0 ? spawners[Count % spawners.Count] : null;

        /// <summary>섞인 순서의 다음 스포너에서 하나 내보낸다 (정찰 → 중장갑 → 방패 → 정찰 …)</summary>
        public Drone SpawnNext()
        {
            if (spawners.Count == 0) return null;
            DroneSpawner spawner = spawners[Count % spawners.Count]; // [1] 목록의 길이로 나눈다. 종류 수를 숫자로 박지 않는다
            Picked?.Invoke(Count, spawner);
            Count++;
            return spawner.Spawn(); // [1]
        }
    }
}
