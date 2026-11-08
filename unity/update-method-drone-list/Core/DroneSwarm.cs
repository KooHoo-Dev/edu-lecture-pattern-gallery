// 드론 매니저 코어: 드론 목록을 매 프레임 처음부터 돌며 drone.Update(dt) 를 부른다 (업데이트 메서드 패턴).
// 도는 중에는 목록을 바꾸지 않는다. 빠지기 요청은 표시만, 새 드론은 대기 목록에 두고, 루프가 끝난 뒤 한꺼번에 지우고 합친다. UnityEngine 을 쓰지 않는다.
using System;
using System.Collections.Generic;

namespace PatternGallery.UpdateMethodDroneList
{
    /// <summary>규칙 값. SwarmRunner 가 Inspector 값으로 채워 넘기고, Play 중 값을 바꾸면 OnValidate 가 다시 넣는다</summary>
    public sealed class SwarmSettings
    {
        public float MoveSpeed = 3f;
        public float SplitDelay = 1f;
        public int SplitCount = 2;
        /// <summary>새 드론이 나타나는 가로 위치 (오른쪽 끝)</summary>
        public float StartX = 14.8f;
        /// <summary>이 가로 위치에 닿으면 기지에 닿은 것이다 (왼쪽)</summary>
        public float BaseX = 1.8f;
        public int DroneHp = 1;
        public int SplitterHp = 2;
        /// <summary>화면에만 쓰는 줄 수</summary>
        public int Lanes = 3;
    }

    public sealed class DroneSwarm
    {
        public readonly SwarmSettings Settings;
        readonly List<Drone> drones = new List<Drone>();
        readonly List<Drone> pending = new List<Drone>();
        static readonly Predicate<Drone> IsDead = d => d.IsDead;
        bool updating;
        int launched;
        int deadCount;

        /// <summary>목록에 들어왔다 (입력으로 바로, 또는 루프가 끝난 뒤 대기 목록에서)</summary>
        public event Action<Drone> Spawned;
        /// <summary>업데이트 중에 만들어져 대기 목록에 들어갔다</summary>
        public event Action<Drone> SpawnQueued;
        /// <summary>드론이 빠지기를 요청했다 (표시만. 아직 목록에 있다)</summary>
        public event Action<Drone> DespawnRequested;
        /// <summary>루프가 끝난 뒤 목록에서 지웠다. 화면 오브젝트는 여기서 Destroy 한다</summary>
        public event Action<Drone> Despawned;
        /// <summary>EMP: (맞은 드론 수, 피해)</summary>
        public event Action<int, int> Damaged;

        public DroneSwarm(SwarmSettings settings)
        {
            Settings = settings;
        }

        public IReadOnlyList<Drone> Drones => drones;
        /// <summary>지금 업데이트 루프 안인가</summary>
        public bool IsUpdating => updating;
        /// <summary>마지막 Tick 에서 Update 를 부른 드론 수</summary>
        public int LastUpdated { get; private set; }
        /// <summary>마지막 Tick 의 루프가 끝났을 때 대기 목록에 있던 수 (그 뒤 합쳤다)</summary>
        public int LastMerged { get; private set; }
        /// <summary>마지막 Tick 의 루프가 끝났을 때 지울 표시가 된 수 (그 뒤 지웠다)</summary>
        public int LastRemoved { get; private set; }

        /// <summary>오른쪽 끝에 새 드론 하나를 내보낸다 (입력)</summary>
        public Drone Launch(DroneKind kind)
        {
            launched++;
            bool splitter = kind == DroneKind.Splitter;
            var d = new Drone((splitter ? "S" : "D") + launched, kind, Settings.StartX, splitter ? Settings.SplitterHp : Settings.DroneHp, (launched - 1) % Settings.Lanes);
            Spawn(d);
            return d;
        }

        /// <summary>새 드론을 더한다. 업데이트 중이면 대기 목록에 넣고, 루프 밖이면 바로 목록에 넣는다</summary>
        public void Spawn(Drone d)
        {
            if (updating)
            {
                pending.Add(d); // [3]
                SpawnQueued?.Invoke(d);
                return;
            }
            drones.Add(d);
            Spawned?.Invoke(d);
        }

        /// <summary>빠지기 요청. 표시만 하고 목록은 Tick 이 끝날 때 바뀐다</summary>
        public void Despawn(Drone d, DespawnReason reason)
        {
            if (d.IsDead) return;
            d.MarkDead(reason); // [2]
            deadCount++;
            DespawnRequested?.Invoke(d);
        }

        /// <summary>EMP: 살아 있는 모든 드론의 HP 를 깎는다. 0 이 된 드론은 다음 Update 에서 스스로 빠진다</summary>
        public void DamageAll(int amount)
        {
            int hit = 0;
            foreach (Drone d in drones)
            {
                if (d.IsDead) continue;
                d.Hp -= amount;
                hit++;
            }
            Damaged?.Invoke(hit, amount);
        }

        /// <summary>매 프레임 (SwarmRunner.Update 의 Time.deltaTime)</summary>
        public void Tick(float dt)
        {
            updating = true;
            int updated = 0;
            // 도는 동안 목록이 바뀌지 않으니 foreach 로 돌아도 안전하다
            foreach (Drone d in drones) // [1]
            {
                if (d.IsDead) continue;
                d.Update(dt, this); // [1]
                updated++;
            }
            LastUpdated = updated;
            LastRemoved = deadCount;
            LastMerged = pending.Count;
            if (deadCount > 0)
            {
                // Despawned 를 받은 쪽이 Spawn 해도 아직 updating 이라 대기 목록으로 간다 (도는 중인 drones 를 바꾸지 않는다)
                foreach (Drone d in drones)
                    if (d.IsDead) Despawned?.Invoke(d);
                drones.RemoveAll(IsDead); // [4] 표시된 드론을 한꺼번에 지운다
                deadCount = 0;
            }
            updating = false;
            foreach (Drone d in pending)
            {
                drones.Add(d); // [4] 대기 목록을 합친다. 다음 프레임부터 Update 된다
                Spawned?.Invoke(d);
            }
            pending.Clear();
        }
    }
}
