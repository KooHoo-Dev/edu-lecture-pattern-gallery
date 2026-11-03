// 정비 기지 앞 출구: 나온 드론에 번호와 출구 앞 자리를 정해 주고, 출구 앞에 서 있는 드론 목록을 든다 (포탑 일제 사격의 대상).
// 파괴된 드론은 목록에서 빼고 자리를 비운다. 레이더와는 따로다. UnityEngine 을 쓰지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.FactoryDroneSpawner
{
    public sealed class Exit
    {
        readonly List<Drone> drones = new List<Drone>();
        int placedCount;

        /// <summary>출구 앞에 서 있는 (화면에 보이는) 드론</summary>
        public IReadOnlyList<Drone> Drones => drones;

        /// <summary>드론이 출구 앞 자리에 섰다</summary>
        public event Action<Drone> Placed;

        public void Place(Drone drone)
        {
            if (drones.Contains(drone)) return;
            drone.Number = ++placedCount;
            drone.Slot = FreeSlot();
            drones.Add(drone);
            drone.Destroyed += OnDestroyed;
            Placed?.Invoke(drone);
        }

        /// <summary>비어 있는 가장 앞 자리</summary>
        int FreeSlot()
        {
            int slot = 0;
            while (Taken(slot)) slot++;
            return slot;
        }

        bool Taken(int slot)
        {
            foreach (Drone d in drones)
                if (d.Slot == slot) return true;
            return false;
        }

        void OnDestroyed(Drone drone)
        {
            drone.Destroyed -= OnDestroyed;
            drones.Remove(drone);
        }
    }
}
