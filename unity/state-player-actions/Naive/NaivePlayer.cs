// 나쁜 예: bool 플래그와 if 문으로 짠 플레이어. 실제로는 MonoBehaviour 의 Update 안에 있는 흔한 코드다.
// 갤러리의 '효과 끄기' 가 이 코드를 같은 입력으로 돌린다. 프로젝트에 넣지 않는다.
using System;

namespace PatternGallery.StatePlayerActions.Naive
{
    public sealed class NaivePlayer
    {
        public float JumpHeight = 1.6f;
        public float AttackDuration = 0.45f;
        public float HitStunDuration = 0.6f;
        public float MoveSpeed = 3f;
        public float Gravity = 20f;

        public float X = 4f;
        public float Y;
        public float VelocityY;
        public int Facing = 1;

        public bool isJumping;
        public bool isAttacking;
        public bool isHurt;
        public bool wantsMove;
        float attackTimer;
        float hurtTimer;

        public void OnJump()
        {
            if (!isJumping) // [!] 공격 중이나 경직 중인지 확인하지 않는다
            {
                isJumping = true;
                VelocityY = (float)Math.Sqrt(2f * Gravity * JumpHeight);
            }
        }

        public void OnAttack()
        {
            if (!isAttacking && !isJumping) // [!] 공중 공격은 막았지만 경직(isHurt) 중인지는 보지 않는다
            {
                isAttacking = true;
                attackTimer = AttackDuration;
            }
        }

        public void OnHit()
        {
            isHurt = true; // [!] 공격을 끊지 않는다. 맞은 뒤에도 공격 자세와 판정이 이어진다
            hurtTimer = HitStunDuration;
        }

        public void OnMove()
        {
            wantsMove = !wantsMove;
        }

        public void Update(float dt)
        {
            if (wantsMove && !isAttacking) // [!] 경직(isHurt) 중에도 걷는다
            {
                X += Facing * MoveSpeed * dt;
                if (X > 14.5f) { X = 14.5f; Facing = -1; }
                else if (X < 1.5f) { X = 1.5f; Facing = 1; }
            }
            if (isJumping)
            {
                VelocityY -= Gravity * dt;
                Y += VelocityY * dt;
                if (Y <= 0f)
                {
                    Y = 0f;
                    VelocityY = 0f;
                    isJumping = false;
                }
            }
            if (isAttacking)
            {
                attackTimer -= dt;
                if (attackTimer <= 0f) isAttacking = false;
            }
            if (isHurt)
            {
                hurtTimer -= dt;
                if (hurtTimer <= 0f) isHurt = false;
            }
        }
    }
}
