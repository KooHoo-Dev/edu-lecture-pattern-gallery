// 포탑 일제 사격: 출구 앞에 서 있는 모든 드론에 같은 피해를 준다. 레이더가 아니라 출구 앞(화면)의 드론을 쏜다.
// UnityEngine 을 쓰지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.FactoryDroneSpawner
{
    public sealed class TurretBattery
    {
        /// <summary>일제 사격 한 번에 드론마다 주는 피해</summary>
        public int VolleyDamage = 1;

        /// <summary>쏘기 직전 (대상 수, 피해)</summary>
        public event Action<int, int> Fired;

        public void Volley(Exit exit)
        {
            // 맞아 파괴되면 exit.Drones 가 줄어들므로 미리 복사해 둔다
            var targets = new List<Drone>(exit.Drones);
            Fired?.Invoke(targets.Count, VolleyDamage);
            foreach (Drone drone in targets) drone.TakeDamage(VolleyDamage);
        }
    }
}
