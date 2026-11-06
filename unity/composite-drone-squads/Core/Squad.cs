// 가지: 편대. 자식(IUnit) 목록을 들고 같은 메서드를 자식마다 부른다. 자식이 드론인지 편대인지 묻지 않아서 편대 안 편대도 끝까지 내려간다.
using System;
using System.Collections.Generic;

namespace PatternGallery.CompositeDroneSquads
{
    public sealed class Squad : IUnit
    {
        readonly List<IUnit> children = new List<IUnit>();

        public string Name { get; }
        public Squad Parent { get; set; }
        public IReadOnlyList<IUnit> Children => children;

        public event Action<IUnit, Order> OrderReceived;
        public event Action<Drone> Arrived;
        /// <summary>자식을 받아들였을 때 (이 편대, 들어온 것)</summary>
        public event Action<Squad, IUnit> Joined;
        /// <summary>자식으로 받지 않았을 때 (이 편대, 넣으려던 것, 까닭)</summary>
        public event Action<Squad, IUnit, string> JoinRejected;

        public Squad(string name)
        {
            Name = name;
        }

        /// <summary>
        /// 자식을 넣는다. 자기 자신이나 자기 조상을 넣으면 명령이 끝없이 돌고(StackOverflowException),
        /// 이미 다른 편대에 속한 것을 넣으면 같은 드론이 명령을 두 번 받는다. 그런 경우는 받지 않고 JoinRejected 로 알린다
        /// </summary>
        public bool Add(IUnit unit)
        {
            string reason = RejectReason(unit);
            if (reason != null)
            {
                JoinRejected?.Invoke(this, unit, reason);
                return false;
            }
            children.Add(unit);
            unit.Parent = this;
            unit.OrderReceived += ForwardOrder; // 자식(과 그 아래)이 받은 명령을 위로 올린다
            unit.Arrived += ForwardArrived;
            Joined?.Invoke(this, unit);
            return true;
        }

        string RejectReason(IUnit unit)
        {
            for (Squad s = this; s != null; s = s.Parent)
            {
                if (!ReferenceEquals(s, unit)) continue;
                return s == this ? $"{Name} 를 자기 안에 넣을 수 없다" : $"{unit.Name} 는 {Name} 의 상위 편대다 (넣으면 명령이 끝없이 돈다)";
            }
            if (unit.Parent != null) return $"{unit.Name} 는 이미 {unit.Parent.Name} 소속";
            return null;
        }

        void ForwardOrder(IUnit unit, Order order) => OrderReceived?.Invoke(unit, order);

        void ForwardArrived(Drone drone) => Arrived?.Invoke(drone);

        public void Sortie()
        {
            OrderReceived?.Invoke(this, Order.Sortie);
            foreach (IUnit child in children) child.Sortie(); // [2] 드론인지 편대인지 묻지 않고 같은 메서드
        }

        public void Recall()
        {
            OrderReceived?.Invoke(this, Order.Recall);
            foreach (IUnit child in children) child.Recall(); // [2] 자식이 편대면 그 편대가 다시 자기 자식마다 부른다
        }

        public int CountDrones()
        {
            int n = 0;
            foreach (IUnit child in children) n += child.CountDrones(); // [3] 하위 편대면 다시 이 메서드로 들어와 잎까지 센다
            return n;
        }

        public int CountDocked()
        {
            int n = 0;
            foreach (IUnit child in children) n += child.CountDocked();
            return n;
        }

        public void Tick(float dt)
        {
            foreach (IUnit child in children) child.Tick(dt); // [3] 시간도 같은 길로 잎까지 내려간다
        }
    }
}
