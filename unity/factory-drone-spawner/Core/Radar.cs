// 레이더: 등록된 드론만 센다. 등록한 드론의 파괴를 구독해 해제하고, 마지막 하나가 파괴되면 웨이브 끝을 알린다.
// 등록되지 않은 드론은 출구 앞에 있어도 모른다. UnityEngine 을 쓰지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.FactoryDroneSpawner
{
    public sealed class Radar
    {
        readonly List<Drone> tracked = new List<Drone>();

        /// <summary>레이더가 아는 살아 있는 드론 수</summary>
        public int AliveCount => tracked.Count;
        /// <summary>웨이브 끝을 알린 뒤 아직 새로 등록된 드론이 없다</summary>
        public bool IsCleared { get; private set; }

        /// <summary>드론을 등록했다 (드론, 등록 뒤 살아 있는 수)</summary>
        public event Action<Drone, int> Registered;
        /// <summary>등록한 드론이 파괴되어 해제했다 (드론, 해제 뒤 살아 있는 수)</summary>
        public event Action<Drone, int> Unregistered;
        /// <summary>살아 있는 수가 0 이 되는 순간 한 번</summary>
        public event Action WaveCleared;

        public bool Tracks(Drone drone) => tracked.Contains(drone);

        public void Register(Drone drone)
        {
            if (!drone.IsAlive || tracked.Contains(drone)) return;
            tracked.Add(drone);
            drone.Destroyed += OnDestroyed; // [4] 파괴를 듣는 것은 등록한 드론뿐이다
            IsCleared = false;
            Registered?.Invoke(drone, tracked.Count);
        }

        void OnDestroyed(Drone drone)
        {
            drone.Destroyed -= OnDestroyed;
            tracked.Remove(drone); // [4]
            Unregistered?.Invoke(drone, tracked.Count);
            if (tracked.Count > 0) return;
            IsCleared = true;
            WaveCleared?.Invoke(); // [4] 레이더가 아는 드론이 모두 파괴됐다
        }
    }
}
