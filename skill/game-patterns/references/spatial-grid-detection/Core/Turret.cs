// 탐지 포탑 코어: 격자에 반경 안의 드론을 묻고, 찾은 드론·본 칸·거리 검사 횟수와 전체 검사였을 때의 횟수를 Scanned 로 알린다. UnityEngine 을 쓰지 않는다.
// 자동 탐지를 켜면 Tick 에서 ScanInterval 초마다 탐지한다.
using System;
using System.Collections.Generic;

namespace PatternGallery.SpatialGridDetection
{
    /// <summary>탐지 한 번의 결과. 탐지마다 새로 만든다 (핸들러가 다시 Scan 을 불러도 앞 결과가 바뀌지 않게)</summary>
    public sealed class ScanResult
    {
        /// <summary>반경 안에서 찾은 드론 (본 칸 순서, 칸 안에서는 등록 순서)</summary>
        public readonly List<Drone> Found = new List<Drone>();
        /// <summary>이번 탐지가 본 칸</summary>
        public readonly List<Cell> Visited = new List<Cell>();
        /// <summary>거리를 잰 횟수 (본 칸에 등록된 드론 수)</summary>
        public int Checks;
        /// <summary>격자 없이 모든 드론과 거리를 쟀다면의 횟수</summary>
        public int FullChecks;
    }

    public sealed class Turret
    {
        readonly SpatialGrid grid;
        public readonly float X;
        public readonly float Y;
        public float Radius;
        public float ScanInterval = 0.5f;
        float timer;

        /// <summary>탐지를 마쳤다</summary>
        public event Action<ScanResult> Scanned;
        /// <summary>자동 탐지를 켜거나 껐다</summary>
        public event Action<bool> AutoScanChanged;

        public Turret(SpatialGrid grid, float x, float y, float radius)
        {
            this.grid = grid;
            X = x;
            Y = y;
            Radius = radius;
        }

        public bool AutoScan { get; private set; }
        /// <summary>마지막 탐지 결과. 아직 없으면 null</summary>
        public ScanResult Last { get; private set; }

        /// <summary>지금 탐지한다 (입력이나 자동 탐지)</summary>
        public ScanResult Scan()
        {
            var result = new ScanResult();
            result.Checks = grid.Query(X, Y, Radius, result.Found, result.Visited); // [3] 반경이 닿는 칸만 본다
            result.FullChecks = grid.Count; // [4] 비교용: 전체 검사였다면 모든 드론과 거리를 잰다
            Last = result;
            Scanned?.Invoke(result);
            return result;
        }

        public void SetAutoScan(bool on)
        {
            if (AutoScan == on) return;
            AutoScan = on;
            timer = 0f; // 켠 뒤 ScanInterval 초에 처음 탐지한다
            AutoScanChanged?.Invoke(on);
        }

        /// <summary>매 프레임 (Field.Tick 다음). 자동 탐지가 켜져 있으면 간격마다 탐지한다</summary>
        public void Tick(float dt)
        {
            if (!AutoScan) return;
            timer += dt;
            if (timer < ScanInterval) return;
            timer -= ScanInterval;
            Scan();
        }
    }
}
