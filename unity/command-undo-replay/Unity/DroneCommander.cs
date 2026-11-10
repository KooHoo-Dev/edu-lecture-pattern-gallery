// 드론 연결 컴포넌트: Input System 입력을 명령 객체(MoveCommand)로 바꿔 CommandHistory 에 넘기고, 드론의 격자 좌표를 Transform 에 옮긴다.
// 게임 규칙은 여기 없다. 되돌리기와 리플레이 규칙을 바꾸려면 Core/ 의 CommandHistory 와 MoveCommand 를 고친다.
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.InputSystem;

namespace PatternGallery.CommandUndoReplay
{
    public class DroneCommander : MonoBehaviour
    {
        [Header("조절 값 (웹 갤러리와 같은 이름. Play 중에 바꿔도 반영된다)")]
        [Tooltip("기록에 남기는 명령 수. 넘으면 가장 오래된 명령을 버린다")]
        [SerializeField] int historyLimit = 20;
        [Tooltip("리플레이에서 명령 하나를 다시 실행하는 간격 (초)")]
        [SerializeField] float replayInterval = 0.4f;
        [Tooltip("한 칸을 미끄러져 가는 연출 시간 (초). 0 이면 바로 옮긴다. 규칙에는 영향이 없다")]
        [SerializeField] float moveDuration = 0.1f;

        [Header("격자 (Use Default Layout 이 켜져 있으면 코드의 기본 배치: 12 x 6 칸, 벽 8칸, 출발 (1, 1))")]
        [SerializeField] bool useDefaultLayout = true;
        [SerializeField] Vector2Int gridSize = new Vector2Int(12, 6);
        [SerializeField] Vector2Int startCell = new Vector2Int(1, 1);
        [SerializeField] Vector2Int[] walls = new Vector2Int[0];
        [Tooltip("칸 사이 간격 (월드 단위). 격자는 XY 평면에 놓인다")]
        [SerializeField] float cellSize = 1f;
        [Tooltip("있으면 Play 할 때 벽 칸마다 하나씩 만든다")]
        [SerializeField] GameObject wallPrefab;

        [Header("입력 (컴포넌트를 붙일 때 Reset 이 기본 키를 넣는다)")]
        [SerializeField] InputAction upAction;
        [SerializeField] InputAction downAction;
        [SerializeField] InputAction leftAction;
        [SerializeField] InputAction rightAction;
        [SerializeField] InputAction undoAction;
        [SerializeField] InputAction redoAction;
        [SerializeField] InputAction replayAction;

        [Header("화면")]
        [Tooltip("Game 뷰 왼쪽 위에 기록 목록을 글로 보인다 (IMGUI)")]
        [SerializeField] bool showHistoryOnScreen = true;
        [SerializeField] bool logCommands = true;

        DroneGrid grid;
        Drone drone;
        CommandHistory history;
        Vector3 origin;
        Vector3 targetPosition;
        string historyText = "";

        /// <summary>
        /// 처음 읽을 때 만든다. 다른 오브젝트(기록 UI 등)의 OnEnable 이 이 오브젝트의 Awake 보다 먼저 불려도 null 이 아니게.
        /// </summary>
        public Drone Drone
        {
            get
            {
                Build();
                return drone;
            }
        }

        public CommandHistory History
        {
            get
            {
                Build();
                return history;
            }
        }

        void Build()
        {
            if (history != null) return;
            if (useDefaultLayout)
            {
                grid = DroneGrid.CreateDefault();
                drone = new Drone(grid, DroneGrid.DefaultStartX, DroneGrid.DefaultStartY);
            }
            else
            {
                grid = new DroneGrid(gridSize.x, gridSize.y);
                foreach (Vector2Int w in walls) grid.AddWall(w.x, w.y);
                drone = new Drone(grid, startCell.x, startCell.y);
            }
            history = new CommandHistory { HistoryLimit = historyLimit, ReplayInterval = replayInterval };
        }

        void Reset()
        {
            // Button 으로 만들어야 누른 순간 한 번만 performed 가 불린다 (기본값 Value 는 다시 켤 때 눌린 키를 바로 처리한다)
            upAction = new InputAction("Up", InputActionType.Button, "<Keyboard>/w");
            upAction.AddBinding("<Keyboard>/upArrow");
            upAction.AddBinding("<Gamepad>/dpad/up");
            downAction = new InputAction("Down", InputActionType.Button, "<Keyboard>/s");
            downAction.AddBinding("<Keyboard>/downArrow");
            downAction.AddBinding("<Gamepad>/dpad/down");
            leftAction = new InputAction("Left", InputActionType.Button, "<Keyboard>/a");
            leftAction.AddBinding("<Keyboard>/leftArrow");
            leftAction.AddBinding("<Gamepad>/dpad/left");
            rightAction = new InputAction("Right", InputActionType.Button, "<Keyboard>/d");
            rightAction.AddBinding("<Keyboard>/rightArrow");
            rightAction.AddBinding("<Gamepad>/dpad/right");
            undoAction = new InputAction("Undo", InputActionType.Button, "<Keyboard>/z");
            undoAction.AddBinding("<Gamepad>/buttonWest");
            redoAction = new InputAction("Redo", InputActionType.Button, "<Keyboard>/y");
            redoAction.AddBinding("<Gamepad>/buttonNorth");
            replayAction = new InputAction("Replay", InputActionType.Button, "<Keyboard>/r");
            replayAction.AddBinding("<Gamepad>/start");
        }

        void Awake()
        {
            // 지금 자리가 출발 칸이 되게 격자의 원점을 맞춘다
            origin = transform.position - new Vector3(Drone.X * cellSize, Drone.Y * cellSize, 0f);
            targetPosition = transform.position;
            if (wallPrefab != null)
            {
                for (int y = 0; y < grid.Height; y++)
                    for (int x = 0; x < grid.Width; x++)
                        if (grid.IsWall(x, y)) Instantiate(wallPrefab, CellToWorld(x, y), Quaternion.identity);
            }
            RefreshText();
        }

        void OnEnable()
        {
            Drone.Moved += OnDroneMoved;
            History.Executed += OnExecuted;
            History.Undid += OnUndid;
            History.Redid += OnRedid;
            History.RedoCleared += OnRedoCleared;
            History.Dropped += OnDropped;
            History.ReplayStarted += OnReplayStarted;
            History.ReplayStepped += OnReplayStepped;
            History.ReplayFinished += OnReplayFinished;
            History.InputIgnored += OnInputIgnored;
            History.NothingToDo += OnNothingToDo;
            upAction.performed += OnUp;
            downAction.performed += OnDown;
            leftAction.performed += OnLeft;
            rightAction.performed += OnRight;
            undoAction.performed += OnUndo;
            redoAction.performed += OnRedo;
            replayAction.performed += OnReplay;
            upAction.Enable();
            downAction.Enable();
            leftAction.Enable();
            rightAction.Enable();
            undoAction.Enable();
            redoAction.Enable();
            replayAction.Enable();
        }

        void OnDisable()
        {
            // 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 명령이 두 개 생긴다
            Drone.Moved -= OnDroneMoved;
            History.Executed -= OnExecuted;
            History.Undid -= OnUndid;
            History.Redid -= OnRedid;
            History.RedoCleared -= OnRedoCleared;
            History.Dropped -= OnDropped;
            History.ReplayStarted -= OnReplayStarted;
            History.ReplayStepped -= OnReplayStepped;
            History.ReplayFinished -= OnReplayFinished;
            History.InputIgnored -= OnInputIgnored;
            History.NothingToDo -= OnNothingToDo;
            upAction.performed -= OnUp;
            downAction.performed -= OnDown;
            leftAction.performed -= OnLeft;
            rightAction.performed -= OnRight;
            undoAction.performed -= OnUndo;
            redoAction.performed -= OnRedo;
            replayAction.performed -= OnReplay;
            upAction.Disable();
            downAction.Disable();
            leftAction.Disable();
            rightAction.Disable();
            undoAction.Disable();
            redoAction.Disable();
            replayAction.Disable();
        }

        void OnValidate()
        {
            // Play 중 Inspector 값을 바꾸면 코어 설정에도 넣는다 (격자 배치는 Play 를 다시 시작해야 바뀐다)
            if (history == null) return;
            history.HistoryLimit = historyLimit;
            history.ReplayInterval = replayInterval;
            RefreshText(); // 화면의 '기록 n/상한' 도 바로 바꾼다
        }

        void OnUp(InputAction.CallbackContext _) => Move(Direction.Up);
        void OnDown(InputAction.CallbackContext _) => Move(Direction.Down);
        void OnLeft(InputAction.CallbackContext _) => Move(Direction.Left);
        void OnRight(InputAction.CallbackContext _) => Move(Direction.Right);
        void OnUndo(InputAction.CallbackContext _) => History.Undo(); // [3]
        void OnRedo(InputAction.CallbackContext _) => History.Redo();
        void OnReplay(InputAction.CallbackContext _) => History.StartReplay(); // [4]

        /// <summary>입력을 바로 실행하지 않고 명령 객체로 만들어 기록에 넘긴다</summary>
        void Move(Direction direction) => History.Execute(new MoveCommand(Drone, direction)); // [1] 입력이 명령 객체가 된다

        void Update()
        {
            History.Tick(Time.deltaTime); // [4] 리플레이는 시간에 맞춰 하나씩
            // 원리를 보이려고 transform 을 직접 옮긴다. 목표 칸은 OnDroneMoved 가 정하고 여기서는 미끄러지는 연출만 한다
            if (moveDuration <= 0f) transform.position = targetPosition;
            else transform.position = Vector3.MoveTowards(transform.position, targetPosition, cellSize / moveDuration * Time.deltaTime);
        }

        Vector3 CellToWorld(int x, int y) => origin + new Vector3(x * cellSize, y * cellSize, 0f);

        void OnDroneMoved(int fromX, int fromY, int toX, int toY)
        {
            targetPosition = CellToWorld(toX, toY);
            if (moveDuration <= 0f) transform.position = targetPosition;
        }

        void OnExecuted(ICommand command)
        {
            var move = command as MoveCommand;
            Log(move != null && move.Blocked ? $"실행 {command} 벽에 막힘 ({move.FromX},{move.FromY})" : $"실행 {command} → ({Drone.X},{Drone.Y})");
            RefreshText();
        }

        void OnUndid(ICommand command)
        {
            var move = command as MoveCommand;
            Log(move != null ? $"되돌리기 {command} → 저장한 위치 ({move.FromX},{move.FromY})" : $"되돌리기 {command}");
            RefreshText();
        }

        void OnRedid(ICommand command)
        {
            Log($"다시 하기 {command} → ({Drone.X},{Drone.Y})");
            RefreshText();
        }

        void OnRedoCleared(int count) => Log($"다시 하기 목록 비움 ({count}개)");
        void OnDropped(ICommand command) => Log($"가장 오래된 기록 버림 ({command})");

        void OnReplayStarted(int count)
        {
            // 처음 칸까지 미끄러져 가면 리플레이가 그 길을 걷는 것처럼 보인다. 처음 칸에 바로 놓는다
            targetPosition = CellToWorld(Drone.X, Drone.Y);
            transform.position = targetPosition;
            Log($"리플레이 시작: 처음 위치 ({Drone.X},{Drone.Y}) 에서 {count}개");
            RefreshText();
        }

        void OnReplayStepped(ICommand command, int index) => RefreshText();

        void OnReplayFinished()
        {
            Log($"리플레이 끝 ({Drone.X},{Drone.Y})");
            RefreshText();
        }

        void OnInputIgnored(string input) => Log($"리플레이 중 무시 ({Label(input)})");

        void OnNothingToDo(string input) => Log(input == "undo" ? "되돌릴 기록이 없다" : input == "redo" ? "다시 할 기록이 없다" : "리플레이할 기록이 없다");

        /// <summary>코어가 알리는 입력 이름을 웹 갤러리의 사건 기록과 같은 말로 (이동은 이미 화살표다)</summary>
        static string Label(string input) => input switch
        {
            "undo" => "되돌리기",
            "redo" => "다시 하기",
            "replay" => "리플레이",
            _ => input,
        };

        void Log(string message)
        {
            if (logCommands) Debug.Log($"[Drone] {message}", this);
        }

        /// <summary>기록 목록 글. 이벤트를 받을 때 바로 만든다 (OnGUI 는 그리기만)</summary>
        void RefreshText()
        {
            var sb = new StringBuilder();
            sb.Append("기록 ").Append(History.Done.Count).Append('/').Append(History.HistoryLimit).Append("  ");
            AppendList(sb, History.Done);
            sb.Append("\n");
            if (History.IsReplaying) sb.Append("리플레이 ").Append(History.ReplayIndex).Append('/').Append(History.Done.Count);
            else
            {
                sb.Append("다시 하기  ");
                for (int i = History.Undone.Count - 1; i >= 0; i--) sb.Append(History.Undone[i]).Append(' ');
            }
            historyText = sb.ToString();
        }

        static void AppendList(StringBuilder sb, IReadOnlyList<ICommand> list)
        {
            foreach (ICommand c in list) sb.Append(c).Append(' ');
        }

        void OnGUI()
        {
            if (!showHistoryOnScreen) return;
            GUI.Label(new Rect(12f, 12f, 640f, 48f), historyText);
        }
    }
}
