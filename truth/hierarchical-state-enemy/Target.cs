// 하네스 어댑터: 계층 상태 기계(StateMachine)와 나쁜 예(NaiveDrone)를 시나리오 입력으로 돌리고 사건과 상태를 글로 꺼낸다.
// 하린의 위치는 입력(approach, retreat)으로만 바뀐다. Unity 에서는 이 자리에 수강생의 플레이어 Transform 이 온다.
// 웹 sim(src/specimens/hierarchical-state-enemy/sim.ts)의 drain, snapshot 과 같은 글을 만든다.
using System;
using System.Collections.Generic;
using PatternGallery.Truth;
using NaiveDrone = PatternGallery.HierarchicalStateEnemy.Naive.NaiveDrone;
using Flat = PatternGallery.HierarchicalStateEnemy.Naive;

namespace PatternGallery.HierarchicalStateEnemy
{
    [SimTarget("hierarchical-state-enemy")]
    public sealed class Target : ISimTarget
    {
        const float HarinStartX = 3f;
        const float HarinStep = 1f;

        readonly StateMachine machine;
        readonly NaiveDrone naive;
        readonly List<string> events = new List<string>();
        float harinX = HarinStartX;

        /// <summary>나쁜 예의 버그가 지금 켜져 있는지와, 이 드론에서 ✖ 로 이미 썼는지</summary>
        bool bugAlert, reportedAlert, reportedEmp;

        public Target(Values v, bool isNaive)
        {
            if (isNaive)
            {
                naive = new NaiveDrone
                {
                    DetectRange = v.Float("detectRange"),
                    AttackRange = v.Float("attackRange"),
                    StunTime = v.Float("stunTime"),
                };
                naive.StateChanged += (from, to) => events.Add($"{from} → {to}");
                naive.AlertChanged += on => events.Add(on ? "경계등 켬" : "경계등 끔");
                naive.Fired += x => events.Add($"사격 → 하린 (거리 {Fmt.F(Math.Abs(x - naive.X))})");
                naive.Stunned += s => events.Add($"기절 {Fmt.F(s)}초");
                return;
            }
            var drone = new Drone(new DroneSettings
            {
                DetectRange = v.Float("detectRange"),
                AttackRange = v.Float("attackRange"),
                StunTime = v.Float("stunTime"),
            });
            machine = new StateMachine(drone, DroneStates.Patrol);
            machine.Exited += s => events.Add($"Exit {s.Name}");
            machine.Entered += s => events.Add($"Enter {s.Name}");
            machine.Handled += (leaf, s, evt) => events.Add($"{evt}: {leaf.Name} → {s.Name} 가 처리");
            machine.Ignored += (leaf, evt) => events.Add($"{evt} 받는 층 없음 ({leaf.Name})");
            drone.AlertChanged += on => events.Add(on ? "경계등 켬" : "경계등 끔");
            drone.Fired += x => events.Add($"사격 → 하린 (거리 {Fmt.F(Math.Abs(x - drone.X))})");
            drone.Stunned += s => events.Add($"기절 {Fmt.F(s)}초");
        }

        float DroneX => machine != null ? machine.Drone.X : naive.X;

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
            else if (machine != null) machine.Handle(DroneInput.Emp);
            else
            {
                Flat.IDroneState before = naive.State;
                naive.Handle("emp");
                // 기절 중이 아닌데 EMP 를 맞고도 상태가 그대로면 그 상태에 EMP 규칙이 없다
                if (before != Flat.DroneStates.Stunned && naive.State == before)
                {
                    events.Add(reportedEmp
                        ? $"또 EMP 무시 ({before.Name})"
                        : $"!EMP 무시: {before.Name} 에서 EMP 를 맞았는데 그대로 움직인다 ({before.Name}State.Handle 에 emp 규칙이 없다)");
                    reportedEmp = true;
                }
            }
            if (naive != null) NaiveBugs();
        }

        public void Tick(float dt)
        {
            if (machine != null)
            {
                machine.Drone.TargetX = harinX;
                machine.Tick(dt);
                return;
            }
            naive.TargetX = harinX;
            naive.Tick(dt);
            NaiveBugs();
        }

        /// <summary>공격 중인데 경계등이 꺼진 순간을 쓴다. 같은 드론의 같은 버그는 ✖('!')로 한 번만, 다시 켜지면 '!' 없는 사건 줄로</summary>
        void NaiveBugs()
        {
            bool now = naive.State == Flat.DroneStates.Attack && !naive.AlertOn;
            if (now && !bugAlert)
            {
                events.Add(reportedAlert
                    ? "또 경계등 꺼짐 (Attack)"
                    : "!경계등 꺼짐: Attack 인데 경계등이 꺼져 있다 (Chase.Exit 가 끄고 Attack.Enter 는 켜지 않는다)");
                reportedAlert = true;
            }
            bugAlert = now;
        }

        public IEnumerable<string> Drain()
        {
            var copy = events.ToArray();
            events.Clear();
            return copy;
        }

        public string Snapshot()
        {
            if (machine != null)
            {
                Drone d = machine.Drone;
                return $"state={StateMachine.PathOf(machine.Current)} x={Fmt.F(d.X)} harin={Fmt.F(harinX)} alert={B(d.AlertOn)} charge={Fmt.F(d.ChargeTimer)} search={Fmt.F(d.SearchTimer)} stun={Fmt.F(d.StunTimer)}";
            }
            return $"state={naive.State.Name} x={Fmt.F(naive.X)} harin={Fmt.F(harinX)} alert={B(naive.AlertOn)} charge={Fmt.F(naive.ChargeTimer)} search={Fmt.F(naive.SearchTimer)} stun={Fmt.F(naive.StunTimer)}";
        }

        static int B(bool b) => b ? 1 : 0;
    }
}
