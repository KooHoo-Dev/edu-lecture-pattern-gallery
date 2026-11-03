// 하네스 어댑터: 코어(Drone)와 나쁜 예(NaiveDrone)를 시나리오 입력으로 돌리고 사건과 상태를 글로 꺼낸다.
// 하린의 위치는 입력(approach, retreat)으로만 바뀐다. Unity 에서는 이 자리에 수강생의 플레이어 Transform 이 온다.
// 웹 sim(src/specimens/state-drone-ai/sim.ts)의 drain, snapshot 과 같은 글을 만든다.
using System;
using System.Collections.Generic;
using PatternGallery.StateDroneAi.Naive;
using PatternGallery.Truth;

namespace PatternGallery.StateDroneAi
{
    [SimTarget("state-drone-ai")]
    public sealed class Target : ISimTarget
    {
        const float HarinStartX = 3f;
        const float HarinStep = 1f;

        readonly Drone drone;
        readonly NaiveDrone naive;
        readonly List<string> events = new List<string>();
        float harinX = HarinStartX;

        // 나쁜 예는 이벤트가 없으므로 값의 변화를 비교해 적는다
        DroneState lastState;
        float lastSpeed;
        int lastHp;
        int lastShots;
        /// <summary>나쁜 예가 공격 case 를 돈 시간. 패턴이라면 충전이 다 찼을 시각을 알려고 센다</summary>
        float attackTime;
        /// <summary>버그가 지금 켜져 있는지와, 이 드론에서 ✖ 로 이미 썼는지</summary>
        bool bugStuck, bugCharge, reportedStuck, reportedCharge;

        public Target(Values v, bool isNaive)
        {
            if (isNaive)
            {
                naive = new NaiveDrone
                {
                    DetectRange = v.Float("detectRange"),
                    AttackRange = v.Float("attackRange"),
                    ChargeTime = v.Float("chargeTime"),
                    MoveSpeed = v.Float("moveSpeed"),
                };
                naive.Start();
                lastState = naive.state;
                lastSpeed = naive.speed;
                lastHp = naive.hp;
                return;
            }
            drone = new Drone(new DroneSettings
            {
                DetectRange = v.Float("detectRange"),
                AttackRange = v.Float("attackRange"),
                ChargeTime = v.Float("chargeTime"),
                MoveSpeed = v.Float("moveSpeed"),
            });
            drone.StateChanged += (from, to) => events.Add($"{from} → {to}");
            drone.Fired += x => events.Add($"사격 → 하린 (거리 {Fmt.F(Math.Abs(x - drone.X))})");
            drone.Damaged += (amount, hp) => events.Add($"피해 {amount} (HP {hp}/{drone.Settings.MaxHp})");
            drone.Destroyed += () => events.Add("파괴");
        }

        float DroneX => drone != null ? drone.X : naive.X;

        /// <summary>하린이 드론 쪽(toward = 1)이나 반대쪽(-1)으로 한 걸음</summary>
        void Step(int toward)
        {
            int dir = DroneX >= harinX ? 1 : -1;
            harinX = Math.Max(0.5f, Math.Min(15.5f, harinX + toward * dir * HarinStep));
        }

        public void Input(string name)
        {
            if (name == "approach") Step(1);
            else if (name == "retreat") Step(-1);
            else if (drone != null) drone.TakeHit(1);
            else naive.TakeHit(1);
            if (naive != null) NaiveEvents();
        }

        public void Tick(float dt)
        {
            if (drone != null)
            {
                drone.Tick(dt, harinX);
                return;
            }
            bool wasAttack = naive.state == DroneState.Attack;
            naive.Update(dt, harinX);
            if (naive.state != DroneState.Attack) attackTime = 0f;
            else if (wasAttack) attackTime += dt;
            NaiveEvents();
        }

        /// <summary>버그가 켜지는 순간 쓴다. 같은 드론의 같은 버그는 ✖('!')로 한 번만 쓰고, 다시 켜지면 '!' 없는 사건 줄(again)로 쓴다</summary>
        void Bug(bool now, ref bool last, ref bool reported, string message, string again)
        {
            if (now && !last)
            {
                events.Add(reported ? again : "!" + message);
                reported = true;
            }
            last = now;
        }

        void NaiveEvents()
        {
            if (naive.state != lastState) events.Add($"state = {naive.state}");
            lastState = naive.state;
            if (naive.speed != lastSpeed) events.Add($"speed = {Fmt.F(naive.speed)}");
            lastSpeed = naive.speed;
            if (naive.hp != lastHp) events.Add($"hp = {naive.hp}");
            lastHp = naive.hp;
            if (naive.shots != lastShots) events.Add("사격");
            lastShots = naive.shots;
            bool moving = naive.state == DroneState.Patrol || naive.state == DroneState.Chase;
            Bug(moving && naive.speed == 0f, ref bugStuck, ref reportedStuck,
                $"이동 멈춤: state = {naive.state} 인데 speed = 0",
                $"또 멈춤 (state = {naive.state}, speed = 0)");
            Bug(naive.state == DroneState.Attack && attackTime >= naive.ChargeTime, ref bugCharge, ref reportedCharge,
                $"충전이 끝나지 않는다: chargeTime {Fmt.F(naive.ChargeTime)}초가 지났는데 chargeTimer = {Fmt.F(naive.chargeTimer)}",
                $"또 충전이 끝나지 않음 (chargeTimer = {Fmt.F(naive.chargeTimer)})");
        }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        public string Snapshot()
        {
            if (drone != null) return $"state={drone.State.Name} x={Fmt.F(drone.X)} harin={Fmt.F(harinX)} speed={Fmt.F(drone.Speed)} charge={Fmt.F(drone.ChargeTimer)} hp={drone.Hp}";
            return $"state={naive.state} x={Fmt.F(naive.X)} harin={Fmt.F(harinX)} speed={Fmt.F(naive.speed)} charge={Fmt.F(naive.chargeTimer)} hp={naive.hp}";
        }
    }
}
