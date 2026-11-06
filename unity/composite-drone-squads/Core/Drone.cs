// 잎: 정찰 드론 하나. 명령을 받으면 목적지를 바꾸고, Tick 에서 실제로 날아 도착을 알린다. UnityEngine 을 쓰지 않는다.
using System;

namespace PatternGallery.CompositeDroneSquads
{
    public enum DroneStatus
    {
        /// <summary>기지 자기 자리에 있다</summary>
        Docked,
        /// <summary>정찰 지점으로 나는 중</summary>
        Outbound,
        /// <summary>정찰 지점에 떠 있다</summary>
        Patrolling,
        /// <summary>기지로 돌아오는 중</summary>
        Returning,
    }

    /// <summary>모든 드론이 같이 쓰는 규칙 값. SquadCommandInput 이 Inspector 값으로 채우고, Play 중 값을 바꾸면 OnValidate 가 다시 넣는다</summary>
    public sealed class FlightSettings
    {
        public float FlySpeed = 3f;
        /// <summary>기지 자리에서 정찰 지점까지의 가로 거리</summary>
        public float PatrolDistance = 5f;
    }

    public sealed class Drone : IUnit
    {
        public string Name { get; }
        public Squad Parent { get; set; }
        public readonly FlightSettings Settings;

        /// <summary>기지의 자기 자리</summary>
        public readonly float HomeX;
        public readonly float HomeY;
        /// <summary>정찰 지점이 자기 자리보다 얼마나 높은가</summary>
        public readonly float PatrolHeight;
        /// <summary>PatrolDistance 보다 더 멀리 가는 거리 (멀리 정찰하는 지원 편대)</summary>
        public readonly float ExtraReach;

        public float X;
        public float Y;
        public DroneStatus Status { get; private set; }

        public event Action<IUnit, Order> OrderReceived;
        public event Action<Drone> Arrived;

        public Drone(string name, float homeX, float homeY, float patrolHeight, float extraReach, bool startOnPatrol, FlightSettings settings)
        {
            Name = name;
            HomeX = homeX;
            HomeY = homeY;
            PatrolHeight = patrolHeight;
            ExtraReach = extraReach;
            Settings = settings;
            if (startOnPatrol)
            {
                X = PatrolX;
                Y = PatrolY;
                Status = DroneStatus.Patrolling;
            }
            else
            {
                X = homeX;
                Y = homeY;
                Status = DroneStatus.Docked;
            }
        }

        public float PatrolX => HomeX + Settings.PatrolDistance + ExtraReach;
        public float PatrolY => HomeY + PatrolHeight;
        public bool IsFlying => Status == DroneStatus.Outbound || Status == DroneStatus.Returning;

        /// <summary>정찰 지점으로 간다. 이미 나가 있으면 그대로다. 받은 것은 목적지를 바꾼 뒤에 알린다 (구독자가 기지 도착 수를 다시 세도 맞게)</summary>
        public void Sortie()
        {
            if (Status == DroneStatus.Docked || Status == DroneStatus.Returning) Status = DroneStatus.Outbound;
            OrderReceived?.Invoke(this, Order.Sortie);
        }

        /// <summary>기지 자기 자리로 돌아간다. 이미 기지에 있으면 그대로다</summary>
        public void Recall()
        {
            if (Status == DroneStatus.Outbound || Status == DroneStatus.Patrolling) Status = DroneStatus.Returning;
            OrderReceived?.Invoke(this, Order.Recall);
        }

        public int CountDrones() => 1;

        public int CountDocked() => Status == DroneStatus.Docked ? 1 : 0;

        public void Tick(float dt)
        {
            if (!IsFlying) return;
            bool outbound = Status == DroneStatus.Outbound;
            float tx = outbound ? PatrolX : HomeX;
            float ty = outbound ? PatrolY : HomeY;
            float dx = tx - X;
            float dy = ty - Y;
            float dist = (float)Math.Sqrt(dx * dx + dy * dy);
            float step = Settings.FlySpeed * dt;
            if (dist <= step)
            {
                X = tx;
                Y = ty;
                Status = outbound ? DroneStatus.Patrolling : DroneStatus.Docked;
                Arrived?.Invoke(this); // [4] 잎이 도착을 알린다. 편대들이 위로 올려 본대 구독자까지 간다
                return;
            }
            X += dx / dist * step; // [4] 실제로 움직이는 것은 잎뿐이다
            Y += dy / dist * step;
        }
    }
}
