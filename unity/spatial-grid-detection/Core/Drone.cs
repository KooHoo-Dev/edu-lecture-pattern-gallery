// 잔해 드론 하나: 자리(X, Y), 정해진 방향, 지금 등록된 칸. 움직이는 것은 Field.Tick 이 부르고, 칸 등록은 SpatialGrid 만 바꾼다. UnityEngine 을 쓰지 않는다.
namespace PatternGallery.SpatialGridDetection
{
    public sealed class Drone
    {
        /// <summary>D1, D2 처럼 나온 순서 번호</summary>
        public readonly string Name;
        public float X;
        public float Y;
        /// <summary>움직이는 방향. 길이 1 이고 빠르기는 FieldSettings.DroneSpeed 다. 구역 가장자리에서 튕기면 부호가 바뀐다</summary>
        public float DirX;
        public float DirY;

        /// <summary>격자에 등록된 칸. SpatialGrid 의 Add·Move 만 바꾼다 (실제 자리와 같아야 탐지가 맞다)</summary>
        public Cell Cell { get; internal set; }
        /// <summary>Field 에서 빠졌다 (Tick 도중 핸들러가 뺐으면 그 Tick 의 나머지에서 건너뛴다)</summary>
        public bool Removed { get; internal set; }

        public Drone(string name, float x, float y, float dirX, float dirY)
        {
            Name = name;
            X = x;
            Y = y;
            DirX = dirX;
            DirY = dirY;
        }

        public float DistanceSq(float x, float y)
        {
            float dx = X - x;
            float dy = Y - y;
            return dx * dx + dy * dy;
        }

        /// <summary>step 만큼 가고, 구역(0~width, 0~height) 밖으로 나가면 가장자리에서 튕긴다</summary>
        internal void Step(float step, float width, float height)
        {
            X += DirX * step; // [2]
            Y += DirY * step; // [2]
            if (X < 0f) { X = -X; DirX = -DirX; }
            else if (X > width) { X = 2f * width - X; DirX = -DirX; }
            if (Y < 0f) { Y = -Y; DirY = -DirY; }
            else if (Y > height) { Y = 2f * height - Y; DirY = -DirY; }
        }
    }
}
