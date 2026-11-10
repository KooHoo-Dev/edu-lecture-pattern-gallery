// 나쁜 예: 격자(칸 → 드론 목록)는 만들었지만, 드론이 움직여도 처음 등록한 칸에 그대로 두고, 탐지는 포탑이 있는 칸 하나만 보는 흔한 코드.
// 실제로는 NaiveTurret 이 MonoBehaviour 이고 Update() 에서 Time.deltaTime 으로 드론을 옮긴다. Unity 없이 돌리려고 Update(dt) 로 받는다.
// 갤러리의 '효과 끄기' 가 같은 입력으로 돌린다. 프로젝트에 넣지 않는다.
using System;
using System.Collections.Generic;
using PatternGallery.SpatialGridDetection;

namespace PatternGallery.SpatialGridDetection.Naive
{
    public sealed class NaiveDrone
    {
        public string name;
        public float x;
        public float y;
        public float dirX;
        public float dirY;
    }

    public sealed class NaiveTurret
    {
        public readonly Dictionary<(int, int), List<NaiveDrone>> cells = new Dictionary<(int, int), List<NaiveDrone>>();
        public readonly List<NaiveDrone> drones = new List<NaiveDrone>();
        public float cellSize = 2f;
        public float scanRadius = 2.5f;
        public float droneSpeed = 1.5f;
        public float width = 16f;
        public float height = 9f;
        public float turretX = 8f;
        public float turretY = 4.5f;
        public float scanInterval = 0.5f;
        public bool autoScan;
        float timer;
        int launched;
        int nextSpot;

        /// <summary>마지막 탐지에서 찾은 드론, 거리 검사 횟수, 탐지 횟수</summary>
        public readonly List<NaiveDrone> found = new List<NaiveDrone>();
        public int checks;
        public int scans;

        public (int, int) CellOf(float x, float y) => ((int)Math.Floor(x / cellSize), (int)Math.Floor(y / cellSize));

        public void OnWave()
        {
            for (int k = 0; k < 3; k++)
            {
                float[] s = Field.Spots[nextSpot]; // 패턴과 같은 자리 표
                nextSpot = (nextSpot + 1) % Field.Spots.Length;
                launched++;
                var d = new NaiveDrone { name = "D" + launched, x = s[0], y = s[1], dirX = s[2], dirY = s[3] };
                drones.Add(d);
                var cell = CellOf(d.x, d.y);
                if (!cells.TryGetValue(cell, out List<NaiveDrone> list)) cells[cell] = list = new List<NaiveDrone>();
                list.Add(d);
            }
        }

        public void OnScan() => Scan();

        public void OnAutoScan()
        {
            autoScan = !autoScan;
            timer = 0f;
        }

        /// <summary>실제로는 MonoBehaviour.Update()</summary>
        public void Update(float dt)
        {
            float step = droneSpeed * dt;
            foreach (NaiveDrone d in drones)
            {
                d.x += d.dirX * step;
                d.y += d.dirY * step;
                if (d.x < 0f) { d.x = -d.x; d.dirX = -d.dirX; }
                else if (d.x > width) { d.x = 2f * width - d.x; d.dirX = -d.dirX; }
                if (d.y < 0f) { d.y = -d.y; d.dirY = -d.dirY; }
                else if (d.y > height) { d.y = 2f * height - d.y; d.dirY = -d.dirY; }
                // [!] 칸이 바뀌어도 cells 를 고치지 않는다: 드론은 처음 칸 목록에 남는다
            }
            if (!autoScan) return;
            timer += dt;
            if (timer < scanInterval) return;
            timer -= scanInterval;
            Scan();
        }

        void Scan()
        {
            scans++;
            found.Clear();
            checks = 0;
            if (!cells.TryGetValue(CellOf(turretX, turretY), out List<NaiveDrone> list)) return; // [!] 포탑이 있는 칸만 본다: 경계 너머 반경 안은 못 본다
            foreach (NaiveDrone d in list)
            {
                checks++;
                float dx = d.x - turretX;
                float dy = d.y - turretY;
                if (dx * dx + dy * dy <= scanRadius * scanRadius) found.Add(d);
            }
        }
    }
}
