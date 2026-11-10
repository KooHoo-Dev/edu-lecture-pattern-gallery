// 클릭 한 번(Click)과 화면의 네모 영역(Area): 처리자가 "내 영역의 클릭인가" 를 묻는 값. UnityEngine 을 쓰지 않는다.
namespace PatternGallery.ChainInputHandlers
{
    /// <summary>
    /// 클릭(탭) 한 번. 좌표는 화면을 가로 16, 세로 9 로 본 단위다 (왼쪽 아래가 0, 0).
    /// Unity 에서는 카메라가 월드 x 0~16, y 0~9 를 보게 두어 이 좌표와 월드 좌표를 같게 한다.
    /// </summary>
    public readonly struct Click
    {
        /// <summary>몇 번째 클릭인지 (로그와 화면 표시용)</summary>
        public readonly int Number;
        public readonly float X;
        public readonly float Y;

        public Click(int number, float x, float y)
        {
            Number = number;
            X = x;
            Y = y;
        }

        public override string ToString() => $"#{Number}";
    }

    /// <summary>화면의 네모 영역. 처리자는 이 영역 안의 클릭만 자기 것으로 본다</summary>
    public readonly struct Area
    {
        public readonly float Left;
        public readonly float Bottom;
        public readonly float Width;
        public readonly float Height;

        public Area(float left, float bottom, float width, float height)
        {
            Left = left;
            Bottom = bottom;
            Width = width;
            Height = height;
        }

        public float CenterX => Left + Width * 0.5f;
        public float CenterY => Bottom + Height * 0.5f;

        /// <summary>경계 위도 안으로 친다</summary>
        public bool Contains(float x, float y) => x >= Left && x <= Left + Width && y >= Bottom && y <= Bottom + Height;
    }
}
