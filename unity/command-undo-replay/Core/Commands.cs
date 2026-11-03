// 명령: 입력 하나를 '실행'과 '되돌리기'를 가진 객체로 만든다. 이동 명령은 실행 직전 위치를 저장해 두고 되돌릴 때 그 자리로 놓는다.
namespace PatternGallery.CommandUndoReplay
{
    public interface ICommand
    {
        void Execute();
        void Undo();
    }

    public sealed class MoveCommand : ICommand
    {
        readonly Drone drone;
        public readonly Direction Direction;

        /// <summary>Execute 직전의 위치. Undo 는 이 자리로 놓는다</summary>
        public int FromX { get; private set; }
        public int FromY { get; private set; }
        /// <summary>마지막 Execute 가 벽에 막혀 제자리였는가</summary>
        public bool Blocked { get; private set; }

        public MoveCommand(Drone drone, Direction direction)
        {
            this.drone = drone;
            Direction = direction;
        }

        public void Execute()
        {
            // 방향만이 아니라 실행 시점의 위치를 명령 객체 안에 값으로 저장한다 (드론을 나중에 다시 읽지 않는다)
            FromX = drone.X; // [2] 실행 직전 위치를 저장한다
            FromY = drone.Y; // [2]
            Blocked = !drone.TryMove(Direction);
        }

        public void Undo()
        {
            drone.PlaceAt(FromX, FromY); // [3] 반대로 한 칸 가지 않고 저장한 위치로 놓는다. 막혔던 이동이면 제자리 그대로다
        }

        public override string ToString() => Directions.Arrow(Direction);
    }
}
