# 명령 패턴: 되돌리기와 리플레이 (Command Pattern: Undo and Replay)

입력을 객체로 만들어 기록하고 되돌리고 다시 재생한다

패턴: 명령 패턴. 난이도 2/3. 주제: 되돌리기, 리플레이, 입력 기록, 격자 이동.

## 파일
- `Core/CommandHistory.cs`
- `Core/Commands.cs`
- `Core/Drone.cs`
- `Unity/DroneCommander.cs`

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/command-undo-replay/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. 드론 오브젝트를 만든다. 2D 프로젝트면 `GameObject > 2D Object > Sprites > Square`, Universal 3D 프로젝트면 `GameObject > 3D Object > Cube` 다 (Sprites 메뉴는 2D Sprite 패키지가 있어야 보인다). 이름을 `Drone` 으로 바꾸고 Position 을 (0, 0, 0) 에 둔 뒤 `DroneCommander` 를 붙인다. 붙이는 순간 `Reset` 이 기본 키(W/A/S/D 와 방향키 이동, Z 되돌리기, Y 다시 하기, R 리플레이, 패드는 십자키, West, North, Start)를 넣는다. 웹 갤러리 무대의 T/F/G/H 는 갤러리 단축키를 피한 것이라 Unity 와 다르다.
3. `Use Default Layout` 이 켜져 있으면 코드의 기본 배치(12 x 6 칸, 벽 8칸, 출발 (1, 1))를 쓴다. 끄면 `Grid Size`, `Start Cell`, `Walls` 칸의 값을 쓴다. Play 할 때의 드론 자리가 출발 칸이 되고, 격자는 XY 평면에 `Cell Size` 간격으로 놓인다. 드론을 (0, 0, 0) 에 두면 격자는 x -1~10, y -1~4 에 놓인다.
4. 격자 전체가 보이게 `Main Camera` 를 옮긴다. 드론이 (0, 0, 0) 이고 `Cell Size` 가 1 이면 Position (4.5, 1.5, -10), Rotation (0, 0, 0) 에 두고, Projection 을 `Orthographic`, Size 를 4 로 한다 (2D 템플릿은 처음부터 Orthographic 이다. Universal 3D 템플릿은 Projection 을 바꾼다).
5. 벽을 화면에 보이려면 벽 모양 프리팹을 `Wall Prefab` 칸에 넣는다. 2D 프로젝트면 `2D Object > Sprites > Square`, Universal 3D 프로젝트면 `3D Object > Cube` 를 하나 만들어 회색으로 칠하고(2D 는 Sprite Renderer 의 Color, 3D 는 회색 Material) Project 창으로 끌어 프리팹으로 만든 뒤 씬의 것은 지운다. Play 하면 벽 칸마다 하나씩 만든다.
6. Play 하고 W 와 D 로 벽 쪽으로 몇 번 움직인 뒤(막혀도 한 번 더 누른다) Z 를 여러 번, Y 를 한 번, R 을 눌러 본다. Game 뷰 왼쪽 위에 기록이 보이고, Console 에 `[Drone] 실행 → 벽에 막힘` 같은 줄이 남는다.

## 확인
벽에 막혀 제자리였던 이동을 Z 로 되돌려도 드론이 그 칸에 그대로 있고, R 을 누르면 처음 칸으로 돌아갔다가 기록대로 다시 걸어 리플레이 전과 같은 칸에서 멈춘다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `historyLimit` | 기록 상한 | 20개 |
| `replayInterval` | 리플레이 간격 | 0.4초 |
| `moveDuration` | 이동 연출 시간 | 0.1초 |

## 동작 단계
1. **입력이 명령 객체가 된다**: `DroneCommander` 는 위로 키(Unity 기본 W, 웹 무대 T)를 받으면 드론을 직접 옮기지 않고 `new MoveCommand(drone, Up)` 을 만들어 `CommandHistory.Execute` 에 넘긴다. "무엇을 할지" 가 객체가 되어 기록하고, 되돌리고, 다시 쓸 수 있다.
2. **Execute 하고 기록에 넣는다**: `MoveCommand.Execute` 는 움직이기 전에 지금 위치를 `FromX`, `FromY` 에 저장하고 `Drone.TryMove` 를 부른다. 벽에 막혀 제자리여도 명령은 기록에 들어간다. 새 명령이 오면 다시 하기 목록을 비우고, `historyLimit` 을 넘으면 가장 오래된 명령을 버린다.
3. **Undo 는 저장한 이전 위치로**: 되돌리기는 마지막 명령의 `Undo` 를 부른다. `MoveCommand.Undo` 는 반대 방향으로 가 보지 않고 저장한 위치에 `PlaceAt` 으로 놓는다. 막혔던 이동은 저장한 위치가 지금 자리라 드론이 그대로 있다. 나쁜 예는 여기서 한 칸 밀려난다.
4. **리플레이는 기록을 처음부터 다시 실행한다**: `StartReplay` 는 기록을 뒤에서부터 `Undo` 해 처음 위치로 돌린 뒤, `Tick(dt)` 에서 `replayInterval` 초마다 같은 명령 객체를 하나씩 다시 `Execute` 한다. 리플레이 중 입력은 `InputIgnored` 로 알리고 받지 않아 기록이 섞이지 않는다.

## 주의할 점
- 이 표본은 원리를 보이려고 `transform.position` 을 직접 옮기고 벽은 코어의 격자로 판정한다. `Move Duration` 은 `Update` 의 연출일 뿐 규칙에 영향이 없다. Rigidbody 로 움직이는 게임이라면 명령이 이전 위치와 속도를 함께 저장해야 정확히 되돌릴 수 있다.
- 리플레이는 같은 명령을 다시 실행하면 같은 결과가 나온다는 가정에 기댄다. 난수나 `Time.deltaTime` 처럼 실행할 때마다 달라지는 값을 명령 안에서 읽으면 리플레이가 갈라진다. 그런 값은 명령을 만들 때 정해 명령 안에 저장한다.
- 왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다.
- 이 표본은 벽에 막혀 제자리였던 명령도 기록한다. 그래서 되돌리기 한 번이 아무 변화가 없을 수 있고, 되돌린 뒤 벽 쪽을 누르면 움직이지 않았어도 새 명령이라 다시 하기 목록이 지워진다. 막힌 이동을 기록할지는 선택이다: `Execute` 가 움직였는지를 돌려주게 하고 안 움직였으면 `CommandHistory` 가 기록하지 않으면 된다. 그래도 "반대 동작" 으로 되돌리는 방식은 상자 밀기, 문, 미끄러운 바닥처럼 되돌림이 단순한 반대가 아닌 곳에서 또 어긋나므로, 이전 상태를 저장해 되살리는 `Undo` 는 그대로 둔다.
- `History Limit` 을 Play 중에 줄이면 다음 명령이 들어갈 때 넘친 만큼 오래된 명령을 버린다. 기록은 메모리에만 있어 씬을 다시 열면 사라진다. 저장하려면 명령을 (방향, 이전 위치) 같은 값으로 바꿔 직렬화한다.

## 흔한 실수
- **되돌리기를 눌렀더니 드론이 벽 앞에서 한 칸 밀려났다**: 되돌리기를 "마지막 방향의 반대로 한 칸" 으로 만들었다. 벽에 막혀 제자리였던 이동도 입력으로 기록되므로 되돌릴 때 원래 없던 한 칸을 움직인다. 이동 명령이 `Execute` 할 때 이전 위치를 저장하고, `Undo` 는 그 위치에 그대로 놓는다. 반대 동작을 계산하지 않고 이전 상태를 되살린다.
- **되돌린 뒤 새로 움직였는데 다시 하기를 누르니 엉뚱한 곳으로 간다**: 새 명령을 실행할 때 다시 하기 목록을 비우지 않았다. 되돌린 명령들은 그 뒤에 새 이동이 끼어들면 더는 이어지지 않는 기록이다. `CommandHistory.Execute` 에서 새 명령을 넣기 전에 다시 하기 목록을 비운다. 다시 하기 자체는 목록을 비우지 않는다.
- **되돌리기를 해도 드론이 움직이지 않거나 모두 같은 칸으로 돌아간다**: `Undo` 를 `() => drone.PlaceAt(drone.X, drone.Y)` 같은 람다로 만들면, 람다는 만들 때의 값이 아니라 `drone` 을 붙잡아 되돌리는 순간의 현재 위치를 읽는다. `lastX` 같은 공유 필드 하나에 저장해도 마지막 명령이 덮어쓴다. 이전 위치는 `Execute` 안에서 int 로 복사해 그 명령 객체의 필드(`FromX`, `FromY`)에 둔다.
- **리플레이를 보다가 키를 눌렀더니 기록이 뒤섞였다**: 리플레이가 기록을 다시 실행하는 동안 새 입력도 받아 기록에 넣었다. 리플레이 중에는 `CommandHistory` 가 새 명령, 되돌리기, 다시 하기를 받지 않고 `InputIgnored` 로 알린다. 입력 액션을 끄는 쪽보다 기록 한 곳에서 막아야 키보드, 패드, UI 버튼 어느 경로로 와도 같다.
- **기록을 줄였더니 리플레이가 엉뚱한 칸에서 끝난다**: `historyLimit` 으로 오래된 기록을 버리면 남은 기록의 첫 명령은 게임 시작 자리가 아닌 곳에서 실행된 것이다. 리플레이를 게임 시작 자리에서 시작하면(나쁜 예의 `X = startX`) 첫 명령부터 다른 칸에서 실행되어, 리플레이 전과 다른 칸에서 끝난다. 이 표본은 남은 기록을 뒤에서부터 `Undo` 해 첫 명령의 이전 위치로 돌아간 뒤 다시 실행한다.

## 변형 예시
- 상자를 미는 퍼즐에서 드론 이동과 밀린 상자를 한 명령으로 묶어 함께 되돌리고 싶다.
- 레벨 에디터에서 타일 놓기와 지우기를 Ctrl+Z, Ctrl+Y 로 되돌리고 싶다.
- 스테이지를 깬 뒤 플레이 기록을 파일로 저장했다가 처음부터 다시 보여 주고 싶다.
- 턴제 전략 게임에서 이번 턴의 이동만 한꺼번에 취소하고 싶다.
- 키 재설정 화면에서 바꾼 키도 같은 명령을 만들게 하고 싶다.
