// 나쁜 예: enum DroneState 와 Update 안의 거대 switch 로 짠 드론 AI. 실제로는 MonoBehaviour 의 Start, Update 안에 있는 흔한 코드다.
// 갤러리의 '효과 끄기' 가 이 코드를 같은 입력으로 돌린다. Time.deltaTime 과 대상 Transform 의 x 는 Update 의 인자로 흉내 낸다. 프로젝트에 넣지 않는다.
using System;

namespace PatternGallery.StateDroneAi.Naive
{
    public enum DroneState
    {
        Patrol,
        Chase,
        Attack,
        Destroyed,
    }

    public sealed class NaiveDrone
    {
        public float DetectRange = 5f;
        public float AttackRange = 2.5f;
        public float ChargeTime = 0.6f;
        public float MoveSpeed = 2.5f;
        public int MaxHp = 3;

        public DroneState state = DroneState.Patrol;
        public float X = 11f;
        public int facing = -1;
        public float speed;
        public int hp;
        public float chargeTimer;
        public bool isCharging;
        /// <summary>쏜 횟수 (사격 효과 대신)</summary>
        public int shots;

        public void Start()
        {
            speed = MoveSpeed;
            hp = MaxHp;
        }

        public void TakeHit(int amount)
        {
            if (state == DroneState.Destroyed) return;
            hp -= amount;
            if (hp <= 0) state = DroneState.Destroyed;
        }

        void StartCharge()
        {
            isCharging = true;
            chargeTimer = 0f;
        }

        public void Update(float dt, float targetX)
        {
            float distance = Math.Abs(targetX - X);
            switch (state)
            {
                case DroneState.Patrol:
                    if (distance <= DetectRange)
                    {
                        state = DroneState.Chase;
                        break;
                    }
                    X += facing * speed * dt;
                    if (X > 13f && facing > 0) facing = -1;
                    else if (X < 9f && facing < 0) facing = 1;
                    break;

                case DroneState.Chase:
                    if (distance > DetectRange)
                    {
                        state = DroneState.Patrol;
                        break;
                    }
                    if (distance <= AttackRange)
                    {
                        state = DroneState.Attack;
                        speed = 0f; // 쏘려고 멈춘다
                        break;
                    }
                    facing = targetX < X ? -1 : 1;
                    X += facing * speed * dt;
                    break;

                case DroneState.Attack:
                    if (distance > AttackRange)
                    {
                        state = DroneState.Chase; // [!] 멈출 때 0 으로 한 speed 를 되돌리는 곳이 없다. 추격 case 가 speed 0 으로 걷는다
                        break;
                    }
                    StartCharge(); // [!] 들어갈 때 한 번 할 일(충전 시작)을 case 안에서 매 프레임 부른다. chargeTimer 가 매번 0 이 된다
                    chargeTimer += dt;
                    if (chargeTimer >= ChargeTime)
                    {
                        shots++;
                        chargeTimer = 0f;
                    }
                    break;

                case DroneState.Destroyed:
                    break;
            }
        }
    }
}
