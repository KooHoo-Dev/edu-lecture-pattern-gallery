# 컴포지트 패턴: 드론 편대 명령 (Composite Pattern: Drone Squad Orders)

드론 하나와 편대를 같은 인터페이스로 다뤄, 편대 안 편대까지 명령 한 번이 끝까지 닿는다

패턴: 컴포지트 패턴. 난이도 2/3. 주제: 트리 구조, 재귀, 인터페이스, Hierarchy.

## 파일
- `Core/Drone.cs`
- `Core/IUnit.cs`
- `Core/Squad.cs`
- `Unity/DroneUnit.cs`
- `Unity/IUnitNode.cs`
- `Unity/SquadCommandInput.cs`
- `Unity/SquadNode.cs`

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/composite-drone-squads/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. `Main Camera` 를 Position (7.5, 3, -10) 에 두고 Projection 을 `Orthographic`, Size 를 4.5 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). 16:9 Game 뷰에서 가로 -0.5~15.5, 세로 -1.5~7.5 가 보인다.
3. `GameObject > Create Empty` 로 `본대` 를 만들고 Position 을 (0, 0, 0) 으로 둔다. Hierarchy 에서 `본대` 를 오른쪽 클릭해 `Create Empty` 로 자식 `B` 를 만든다. 빈 곳을 오른쪽 클릭해 `Create Empty` 로 본대 밖에 `C` 를 만든다. 셋 다 Position (0, 0, 0) 이고, 이름은 사건 기록과 같게 `본대`, `B`, `C` 로 짓는다.
4. 드론 다섯을 만든다. 부모를 오른쪽 클릭해 2D 템플릿은 `2D Object > Sprites > Capsule`, Universal 3D 템플릿은 `3D Object > Capsule` 을 고르면 그 아래 자식으로 생긴다. Scale 은 (0.4, 0.4, 0.4). `D1` 은 `본대` 아래 Position (0.7, 1, 0), `D2` (1.6, 1, 0) 와 `D3` (2.5, 1, 0) 은 `B` 아래, `D4` (3.4, 1, 0) 와 `D5` (4.3, 1, 0) 는 `C` 아래에 둔다. 부모가 모두 (0, 0, 0) 이라 이 값이 월드 위치이고, Play 할 때의 이 자리가 기지 자리가 된다.
5. `D1`~`D5` 에 `DroneUnit` 을 붙인다. Patrol Height 를 D1 2, D2 1, D3 3, D4 1, D5 2.4 로 넣고, `D4` 와 `D5` 는 Extra Reach 를 3 과 3.8 로, Start On Patrol 을 켠다. `본대`, `B`, `C` 에는 `SquadNode` 를 붙인다.
6. `본대` 에 `SquadCommandInput` 을 붙인다. 붙이는 순간 `Reset` 이 기본 키(Q 출격, W 귀환, E 지원 편대 합류)를 넣는다. `Join Target` 칸에 `B`, `Support Squad` 칸에 `C` 를 끌어 넣는다.
7. Play 하면 D4, D5 가 오른쪽 멀리 (11.4, 2), (13.1, 3.4) 의 정찰 지점으로 옮겨져 시작한다. Q 로 출격하고 E 로 합류시키면 Hierarchy 에서 `C` 가 `B` 아래로 옮겨진다. W 를 누르면 다섯 대가 모두 돌아오고, Console 에 `[Squad] 귀환 → 본대/B/C/D4` 처럼 명령이 내려간 순서가 남는다. Game 뷰 왼쪽 위에 `편대 드론 수 5`, `기지 도착 5 / 전체 5` 가 보인다.

## 확인
E 로 C 를 합류시킨 뒤 W 를 누르면 D4, D5 까지 다섯 대가 모두 기지 자리로 돌아오고, E 를 한 번 더 누르면 Console 에 `[Squad] 합류 거절: C 는 이미 B 소속 (JoinRejected)` 이 나온다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `flySpeed` | 비행 속도 | 3m/s |
| `patrolDistance` | 정찰 거리 | 5m |

## 동작 단계
1. **명령은 본대 하나에 보낸다**: `SquadCommandInput` 은 본대를 `IUnit Root` 로만 들고, Q·W 를 받으면 `Root.Sortie()` 나 `Root.Recall()` 한 줄만 부른다. 지휘 코드는 본대 아래가 몇 단계인지, 드론이 몇 대인지 모른다. 본대도 `IUnit` 이라 받는 쪽이 드론 한 대여도 같은 줄이다.
2. **편대는 자식마다 같은 메서드를 부른다**: `Squad.Recall` 은 받았다고 알리고(`OrderReceived`) 자식 목록 `children`(`List<IUnit>`)의 자식마다 `child.Recall()` 을 부른다. 자식이 드론인지 편대인지 묻지 않는다 (`is` 검사가 없다). 사건 기록의 `귀환 → 본대`, `귀환 → 본대/D1`, `귀환 → 본대/B` 순서가 이 호출 순서다.
3. **하위 편대도 같은 일을 되풀이한다**: 자식이 편대 B 면 `B.Recall` 이 다시 D2, D3, C 마다 부르고, C 가 또 D4, D5 에 부른다. 같은 메서드가 잎까지 스스로 내려가므로 세 단계든 열 단계든 지휘 코드는 그대로다. `CountDrones` 와 `Tick` 도 같은 길로 내려간다. Unity 쪽도 같은 컴포지트다: `SquadNode` 는 자식 오브젝트가 드론인지 편대인지 `is` 로 묻지 않고 `IUnitNode.Build` 하나만 불러, 자식 편대가 다시 자기 자식을 넣으며 Hierarchy 를 내려가 트리를 만든다. 합류는 `B.Add(C)` 한 번이고, 자기 자신·조상·이미 소속이 있는 편대는 받지 않는다 (`JoinRejected`).
4. **잎이 실제로 날고 도착을 알린다**: 움직이는 것은 `Drone.Tick` 뿐이다. `flySpeed` 로 목적지(정찰 지점이나 기지 자리)를 향해 날고, 닿으면 `Arrived` 를 알린다. 편대가 자식의 이벤트를 위로 올려 본대 구독자 하나가 모두 듣는다. Unity 에서는 `DroneUnit.Update` 가 코어 위치를 transform 에 옮긴다.

## 주의할 점
- `GetComponentsInChildren<DroneUnit>()` 를 본대에서 부르면 아래의 모든 드론을 한 번에 얻어 명령을 다 보낼 수 있다. 하지만 그러면 "편대 B 에만 귀환" 같은 편대 단위 명령과 편대가 받은 기록이 사라지고, 합류 전의 C 처럼 본대 밖의 드론은 빠진다. 꺼진 오브젝트는 기본으로 빠지고 `includeInactive: true` 를 줘야 들어간다. 이 표본의 `SquadNode` 는 바로 아래 자식만 보고, 꺼 둔(`activeSelf` 가 false 인) 자식은 넣지 않는다. 합류(`SquadNode.Join`)도 같아서, `C` 나 `B` 를 꺼 둔 채 E 를 누르면 받지 않고 Console 에 오류를 남긴다 (`Join Target`, `Support Squad` 칸이 비었을 때도). 받아 버리면 코어 드론 수는 5 인데 화면에 드론이 없다.
- 코어 트리는 `SquadCommandInput` 이 처음 `Root` 를 읽을 때(`OnEnable`) 한 번 만든다. Play 중에 Hierarchy 에서 오브젝트를 끌어 옮기거나 껐다 켜도 코어 트리는 그대로다. 합류처럼 코어 `Add` 와 `SetParent` 를 함께 해야 한다 (`SquadNode.Join`). 드론 위치는 `DroneUnit.Update` 가 매 프레임 코어 값으로 넣으므로 Scene 뷰에서 끌어도 다음 프레임에 돌아간다.
- `SetParent(transform, true)` 의 두 번째 값 `worldPositionStays` 가 true 면 C 오브젝트의 월드 위치를 그대로 두고 부모만 바꾼다. false 면 local 위치를 그대로 두어 월드 위치가 B 기준으로 바뀐다. 이 표본은 B 와 C 가 모두 (0, 0, 0) 이라 어느 쪽이든 C 가 움직이지 않고, 드론은 `DroneUnit.Update` 가 월드 위치를 넣어 튀지 않는다. 편대 오브젝트를 다른 자리에 두거나 C 에 깃발 같은 표시물을 달았다면 true 여야 한다.
- 본대의 `Tick` 하나가 트리 안 드론만 움직인다. 합류 전의 C 는 아무도 Tick 하지 않지만 명령을 받을 길도 없어 정찰 지점에 떠 있기만 한다. 합류 전에도 C 를 따로 움직이려면 C 에 자기 지휘 컴포넌트를 두고, 합류할 때 그쪽 Tick 을 멈춘다 (두 곳에서 Tick 하면 두 배로 빠르다).
- Play 중 Inspector 에서 `flySpeed` 를 바꾸면 `OnValidate` 가 코어에 넣어 바로 빨라진다. `patrolDistance` 를 바꾸면 정찰 지점으로 나는 중인 드론은 곧바로 새 지점으로 방향을 틀고, 이미 정찰 지점에 떠 있는 드론은 다음 명령까지 그 자리에 있다 (`Drone.Tick` 은 나는 중일 때만 움직인다). C 의 처음 자리는 트리를 만들 때의 값으로 정해진다.
- 왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다.

## 흔한 실수
- **지원 편대를 합류시켰더니 귀환 명령이 그 편대에만 닿지 않는다**: 지휘 코드가 `foreach (d in root.drones)` 와 `foreach (s in root.squads) foreach (d in s.drones)` 처럼 정해진 단계만 돈다. 편대 안에 편대가 생기면 세 번째 단계의 드론은 아무도 부르지 않는다. 드론 수를 세는 코드도 같은 모양이라 함께 틀린다. Unity 에서는 왼쪽 위 글이 `편대 드론 수 3`, `기지 도착 3 / 전체 3` 으로 다 돌아온 것처럼 보이고, Game 뷰 오른쪽에 D4, D5 만 떠 있다. 편대가 자식마다 같은 메서드를 부르게 하면(`child.Recall()`) 단계 수를 코드에 적을 일이 없다.
- **편대 안 편대를 처리하려고 `is Squad` 분기를 넣었더니 명령마다 if 가 늘어난다**: `if (u is Drone d) d.Recall(); else if (u is Squad s) …` 를 출격, 귀환, 수 세기마다 쓰면 새 종류(수송 드론 묶음 등)를 더할 때 모든 곳을 고쳐야 하고, 한 곳을 빠뜨리면 그 명령만 안 닿는다. 공통 명령은 `IUnit` 에 두고 각자 구현한다. 편대에만 있는 `Add` 는 이 표본처럼 `Squad` 에만 두거나(안전성: 드론에 넣는 코드를 컴파일이 막는다), `IUnit` 에 두고 `Drone.Add` 가 예외를 던지게 한다(투명성: 쓰는 쪽이 종류를 몰라도 된다). 어느 쪽이든 `Sortie`, `Recall` 에는 분기가 없어야 한다.
- **편대를 넣는 순간 게임이 멈추고 StackOverflowException 이 난다**: 편대를 자기 자신이나 자기 상위 편대 안에 넣으면 트리가 고리가 되어 `Recall` 이 끝없이 자기를 다시 부른다. `Squad.Add` 는 `Parent` 를 따라 올라가며 넣으려는 것이 자기나 조상인지 보고, 그러면 받지 않고 `JoinRejected` 로 알린다. 이 표본의 입력(E)은 C 를 B 에 넣기만 해서 이 경로를 밟지 않지만, 편대를 자유롭게 옮기는 UI 를 만들면 바로 필요하다.
- **한 드론이 명령을 두 번 받는다**: 같은 드론을 두 편대에 넣었거나, 합류 버튼을 두 번 눌러 같은 편대가 두 번 들어갔다. 트리에서는 한 유닛의 부모가 하나뿐이어야 한다. `Squad.Add` 는 `Parent` 가 이미 있는 유닛을 "C 는 이미 B 소속" 으로 거절한다. 다른 편대로 옮기려면 원래 편대에서 빼는 `Remove` 를 만들고, 그 안에서 `children.Remove(unit)`, `Parent` 비우기, 이벤트 해제(`unit.OrderReceived -= ForwardOrder`, `unit.Arrived -= ForwardArrived`)를 모두 한 뒤 새 편대에 `Add` 한다. 이벤트 해제를 빠뜨리면 옛 편대가 옮긴 편대의 명령·도착 이벤트를 계속 위로 올려, 본대 구독자가 같은 사건을 두 번 듣는다.
- **명령을 내리는 중에 편대를 바꿨더니 InvalidOperationException 이 난다**: `foreach (IUnit child in children)` 로 명령을 돌리는 동안 이벤트 핸들러가 `Add` 나 `Remove` 로 그 목록을 고치면 "Collection was modified" 예외가 난다. 예를 들어 `OrderReceived` 를 받자마자 합류시키는 코드다. 이 표본은 합류를 입력 콜백에서만 해 명령 도중과 겹치지 않는다. 명령 도중에 바꿔야 하면 바꿀 일을 모아 두었다가 명령이 끝난 뒤 적용하거나, 자식 목록을 복사해서 돈다.

## 변형 예시
- 본대가 아니라 편대 B 에만 따로 귀환 명령을 내리고 싶다.
- 편대를 다른 편대로 옮기는 Remove 와 이동을 넣고 싶다.
- 하위 메뉴가 있는 UI 메뉴를 같은 구조로 만들어 한 번에 열고 닫고 싶다.
- 가방 안 가방이 있는 인벤토리의 무게를 한 번에 합산하고 싶다.
- 편대 명령을 명령 객체로 만들어 되돌리기를 넣고 싶다.
