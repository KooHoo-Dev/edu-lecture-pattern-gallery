// 나쁜 예: 화면 프레임마다 Update(dt) 에서 규칙을 바로 적분하는 흔한 코드. 실제로는 MonoBehaviour.Update 안에 있고 dt 는 Time.deltaTime 이다.
// dt 는 빠뜨리지 않았다. 그래도 dt 가 기기마다, 프레임마다 다르면 점프 높이가 기기마다 다르고, 렉으로 길어진 프레임 하나에 벽을 건너뛴다.
// 입력은 Update 에서 Input System 의 wasPressedThisFrame 으로 읽는 자리를 jumpPressed, dashPressed 로 흉내 낸다 (하네스가 그 프레임 전에 켠다).
namespace PatternGallery.GameLoopFixedStep.Naive
{
    public sealed class NaiveRunner
    {
        public float jumpSpeed = 8f;
        public float gravity = 40f;
        public float dashSpeed = 15f;
        public float dashTime = 0.19f;
        public float wallX = 12f;
        public float wallThickness = 0.2f;
        public float halfWidth = 0.3f;

        public float x = 6f;
        public float y;
        public float velocityY;
        public float dashTimer;
        public bool jumpPressed;
        public bool dashPressed;

        public void Update(float dt)
        {
            if (jumpPressed && y <= 0f) velocityY = jumpSpeed;
            if (dashPressed) dashTimer = dashTime;
            jumpPressed = false;
            dashPressed = false;

            velocityY -= gravity * dt; // [!] 화면 프레임 길이(dt)로 바로 적분: 프레임이 길수록 낮게 뜬다
            y += velocityY * dt;
            if (y <= 0f)
            {
                y = 0f;
                velocityY = 0f;
            }

            if (dashTimer > 0f)
            {
                x += dashSpeed * dt; // [!] 렉으로 길어진 dt 를 한 번에 곱해 벽 두께보다 멀리 건너뛴다
                dashTimer -= dt;
                if (x + halfWidth > wallX && x - halfWidth < wallX + wallThickness)
                {
                    x = wallX - halfWidth;
                    dashTimer = 0f;
                }
            }
        }
    }
}
