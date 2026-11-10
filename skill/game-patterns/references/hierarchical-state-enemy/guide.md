# 상태 패턴: 계층 상태 기계 (State Pattern: Hierarchical State Machine)

여러 상태에 공통인 규칙(EMP, 경계등)을 부모 상태 한 곳에 두고, 자식 상태는 자기 일만 한다

패턴: 상태 패턴. 난이도 3/3. 주제: 계층 상태 기계, 적 AI, 공통 규칙, 진입·이탈 처리.

## 파일
- `Core/Drone.cs`
- `Core/DroneStates.cs`
- `Core/HState.cs`
- `Core/StateMachine.cs`
- `Unity/DroneBrain.cs`

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/hierarchical-state-enemy/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. 앞 편 `state-drone-ai` 가 같은 프로젝트에 있어도 namespace 가 달라 부딪치지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다 (시연용 EMP 키).
2. 드론 오브젝트를 만든다. 2D 프로젝트면 `GameObject > 2D Object > Sprites > Triangle` (2D Sprite 패키지가 있어야 보인다), Universal 3D 프로젝트면 `GameObject > 3D Object > Cube`. 이름을 `Drone` 으로 바꾸고 Position 을 (4, 0, 0), Scale 을 (1, 1, 1) 로 둔다. 드론은 이 자리에서 왼쪽 2m, 오른쪽 2m (x 2~6) 를 순찰한다.
3. Hierarchy 에서 `Drone` 을 오른쪽 클릭해 2D 면 `2D Object > Sprites > Circle`, 3D 면 `3D Object > Sphere` 로 자식을 만든다. 이름을 `AlertLight`, Position 을 (0, 0.8, 0), Scale 을 (0.3, 0.3, 0.3) 으로 두고, 2D 는 Sprite Renderer 의 Color 를 빨강으로, 3D 는 `Assets > Create > Material` 로 만든 머티리얼의 Base Map 색을 빨강으로 해 끌어 넣는다. 켜 둔 채로 두면 된다 (Play 하면 `OnEnable` 이 지금 상태대로 끈다).
4. `Drone` 에 `DroneBrain` 을 붙인다. 붙이는 순간 `Reset` 이 기본 키(E EMP 시연)와 `Body Renderer` 칸(같은 오브젝트의 Sprite Renderer 나 Mesh Renderer)을 채운다. `Alert Light` 칸에 `AlertLight` 를 끌어 넣는다. 기절하는 동안 몸 색이 `Stunned Color`(어두운 회색)로 바뀌고 끝나면 원래 색으로 돌아온다.
5. `Target` 칸에 플레이어 오브젝트를 끌어 넣는다. 웹 무대의 다가가기·물러나기(Q/W)는 하린을 움직이는 시연용 입력이라 연결 컴포넌트에는 없고, 수강생의 플레이어를 원래 이동 코드 그대로 드론 쪽으로 걸리면 된다 (드론은 x 좌표만 본다). 플레이어가 아직 없으면 Cube 하나를 (-4, 0, 0) 에 두고 Play 중 Scene 뷰에서 x 로 끌어 옮긴다.
6. `Main Camera` 를 Position (1, 1.5, -10), Rotation (0, 0, 0) 에 두고 Projection 을 `Orthographic`, Size 를 5 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). 16:9 Game 뷰에서 x -8 부터 10 쯤까지 보여 순찰 구간(x 2~6), 수색하러 가는 왼쪽, 플레이어가 함께 보인다.
7. Play 하고 플레이어를 드론에 다가가게 했다가 멀리 물러나 본다. Console 에 `[Drone] Exit Patrol`, `[Drone] 경계등 켬`, `[Drone] Enter Combat`, `[Drone] Enter Chase` 가 차례로 남고, 공격 거리에서는 `Exit Chase`, `Enter Attack` 만 남는다. 감지 거리 밖까지 물러나면 `Exit Chase`, `경계등 끔`, `Exit Combat`, `Enter Search`. 그때 E 를 누르면 `Exit Search`, `Exit Active`, `기절 2.00초`, `Enter Stunned`, `emp: Search → Active 가 처리` 가 남는다. Game 뷰 왼쪽 위에 지금 상태 경로와 경계등이 보인다.

## 확인
공격 거리 안에 서 있는 동안 경계등(`AlertLight`)이 켜져 있고 Console 의 `Exit Chase` 와 `Enter Attack` 사이에 `경계등 끔` 이 없다. 수색 중(마지막 줄이 `Enter Search`)에 E 를 누르면 드론이 어두운 색으로 멈추고 `stunTime` 초 뒤 `Enter Active`, `Enter Patrol` 이 남는다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `detectRange` | 감지 거리 | 5m |
| `attackRange` | 공격 거리 | 2.5m |
| `stunTime` | 기절 시간 | 2초 |

## 동작 단계
1. **입력은 잎에서 부모로 올라간다**: `DroneBrain.HitByEmp` 가 `StateMachine.Handle("emp")` 를 부르면, 기계는 지금 잎부터 `Parent` 를 따라 올라가며 층마다 `Handle` 을 부르고, 처음 `true` 를 돌려준 층이 맡는다. 잎(Patrol, Search, Chase, Attack)과 Combat 은 EMP 를 몰라 `false` 를 돌려주고, `ActiveState.Handle` 이 받아 `ChangeState(Stunned)` 를 부른다. 자동 데모 3.10초, 수색 중 EMP 가 이 길이다 (사건 기록 `emp: Search → Active 가 처리` 는 입력을 받은 잎과 처리한 층을 함께 쓴다). 나중에 더한 `SearchState` 에는 EMP 줄이 하나도 없지만 Active 의 자식으로 걸었으므로 기절한다. 기절 중에는 Active 밖이라 받는 층이 없다.
2. **나갈 때는 안쪽부터, 공통 조상 바로 아래까지**: `ChangeState(target)` 은 먼저 지금 잎과 target 을 함께 품은 가장 가까운 상태(공통 조상)를 찾는다. 그리고 지금 잎부터 `Parent` 를 따라 공통 조상 바로 아래까지 `Exit` 를 부른다. 2.70초 Chase → Search 는 공통 조상이 Active 라 `Exit Chase`, `Exit Combat` 순서로 나가고, 이때 `CombatState.Exit` 가 경계등을 끈다. 3.10초 Search → Stunned 는 공통 조상이 없어(뿌리가 다르다) `Exit Search`, `Exit Active` 까지 나간다.
3. **들어갈 때는 바깥부터, Chase → Attack 은 Combat 을 지나지 않는다**: 그다음 공통 조상 아래에서 target 까지 바깥부터 `Enter` 를 부른다. 0.60초 Patrol → Chase 는 `Enter Combat`(경계등 켬) 다음 `Enter Chase`. 1.02초 Chase → Attack 은 공통 조상이 Combat 이라 `Exit Chase`, `Enter Attack` 만 불리고, Combat 은 나가지도 다시 들어오지도 않아 경계등이 켜진 채다. 경계등을 켜고 끄는 줄은 `CombatState` 의 `Enter`·`Exit` 두 줄뿐이다.
4. **Tick 은 바깥 부모 규칙부터**: `StateMachine.Tick` 은 Active → Combat → 잎 순서로 `Tick` 을 부르고, 어느 층이 전이하면 그 프레임의 남은 층은 건너뛴다. `CombatState.Tick` 이 "감지 거리 + 0.5m(`LoseMargin`) 밖이면 수색" 을 먼저 보므로, 하린을 놓친 프레임에 자식(추격·공격)의 일이 돌지 않는다. 보이는 동안에는 Combat 이 마지막으로 본 자리를 적고, 잎은 자기 일(추격은 다가가기, 공격은 충전과 사격)만 한다. 위치·타이머·경계등 같은 드론별 값은 `Drone` 이 들고, 상태 객체는 `DroneStates` 의 static 한 벌이다.

## 주의할 점
- 거리로 전이하는 상태는 Unity 의 연속 이동에서 경계 위를 오갈 수 있다. 순찰·수색은 `<= detectRange` 에서 추격으로 들어오고 Combat 은 그보다 0.5m(`CombatState.LoseMargin`) 더 멀어져야 수색으로 나가며, 공격도 `attackRange` + 0.5m(`AttackState.LeaveMargin`)를 넘어야 추격으로 나간다. 두 경계가 같으면 플레이어가 경계에서 천천히 움직일 때 수색 ↔ 추격이 매 프레임 되풀이되어 `Exit Combat`·`Enter Combat` 이 매 프레임 남고 경계등이 깜박인다. 웹 시나리오는 하린이 1m 걸음으로 움직여 이 깜박임이 보이지 않는다. 여유를 바꾸려면 두 상수를 고친다.
- 거리는 가로(x) 거리다. 연결 컴포넌트는 플레이어의 y·z 를 보지 않고 드론의 y·z 는 시작 자리 그대로 둔다. `Update` 가 매 프레임 `transform.position` 을 코어의 `X` 로 덮어써서 벽·바닥 충돌을 보지 않고, 다른 스크립트(넉백 등)가 옮긴 x 는 남지 않는다. 장애물을 돌아와야 하면 추격·수색이 정한 목표를 NavMeshAgent 같은 이동 컴포넌트에 넘긴다. 마지막으로 본 자리(`LastSeenX`)는 `CombatState.Enter` 에서 한 번, `Tick` 에서 보이는 동안 매 프레임 적는다. `Tick` 에서만 적으면 전투에 들어간 바로 다음 프레임에 대상이 사라졌을 때(플레이어 순간이동, 대상 파괴로 `Target` 이 비면 아주 먼 곳으로 본다) "놓치면 수색" 이 먼저 나가 한 번도 적지 못하고, 이전 전투의 자리나 처음 값 x 0 으로 수색하러 간다 (웹 시나리오는 하린이 1m 걸음이라 이 경로가 나오지 않는다).
- `Time.timeScale` 이 0 이어도 `Update` 는 돌아 `Tick(0)` 이 불린다. 이동, 충전, 기절·수색 시간은 멈추지만 거리로 넘어가는 전이는 그대로 일어나고, 시연용 EMP 키(E)도 받는다.
- 경계등과 기절 색은 `AlertChanged` 와 `Entered`·`Exited`(Stunned) 이벤트로만 맞춘다. 드론이 꺼져 있는 동안 다른 스크립트가 `HitByEmp` 를 부르면 코어는 기절하고 경계등을 끄지만 연결 컴포넌트는 듣지 않으므로, `OnEnable` 에서 지금 코어 상태로 경계등을 켜고 끄고 색을 칠한다. 3D 의 `Body Renderer` 색은 `material` 로 칠해 그 렌더러만의 머티리얼 사본을 만든다.
- 드론을 여러 대 놓아도 상태 객체는 `DroneStates` 의 static 한 벌을 같이 쓴다. 상태 객체에는 `Name` 과 `Parent` 만 있고 위치·타이머·경계등은 드론마다 `Drone` 이 든다. 왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다. 모든 드론이 같은 자리에 그리므로 여럿이면 한 대만 `Show Status On Screen` 을 켠다. 엄폐 상태나 보스 페이즈를 더할 때: 상태의 `Enter`·`Exit` 안(그리고 `Entered`·`Exited` 구독자 안)에서 `ChangeState` 를 부르면, 바깥 전이가 `Enter` 를 다 부르기 전에 안쪽 전이가 `Exit` 를 불러 순서가 꼬인다. `ChangeState(DroneStates.Combat)` 처럼 자식이 있는 상태를 주면 지금 상태가 잎이 아니게 되어 추격·공격의 `Tick` 이 돌지 않는다. `StateMachine.ChangeState` 는 두 경우 모두 `InvalidOperationException` 을 던진다 (Console 에 빨간 줄). 들어가자마자 다른 상태로 가야 하면 그 판단을 `Tick` 에 두고, 부모로 가려면 그 부모의 첫 잎(Combat 이면 Chase)을 준다.
- Play 중 Inspector 값을 바꾸면 `OnValidate` 가 코어 설정에 넣는다. `stunTime` 은 기절에 들어갈 때 한 번 읽어 다음 기절부터, 나머지(감지·공격 거리, 충전·수색 시간, 속도)는 다음 프레임부터 쓴다.

## 흔한 실수
- **새로 더한 상태에서만 EMP 가 안 먹는다**: "EMP 를 맞으면 기절" 같은 공통 규칙을 상태마다 `if (evt == "emp")` 로 복사해 두면, 나중에 더한 상태가 그 줄을 빠뜨려도 컴파일 오류도 경고도 없다. 규칙을 부모 상태(`ActiveState.Handle`) 한 곳에 두고 새 상태는 생성자에서 `Parent` 만 정해 걸면, 잎이 처리하지 않은 입력이 부모로 올라가 같은 규칙을 탄다.
- **추격에서 공격으로 넘어갈 때 경보음이나 경계등 파티클이 처음부터 다시 나온다**: 전이 때 공통 조상을 찾지 않고 지금 잎의 모든 층을 나갔다가 목표의 모든 층에 다시 들어가면, Chase → Attack 에서 `CombatState.Exit` 와 `Enter` 가 같은 프레임에 불려 경계등을 껐다 켠다. `SetActive(false)` 와 `SetActive(true)` 가 한 프레임 안이라 불빛은 안 깜박여 보이지만, 경계등 오브젝트에 붙은 Play On Awake 경보음·파티클은 켜질 때마다 처음부터 다시 시작된다. `ChangeState` 는 공통 조상 바로 아래까지만 `Exit` 하고 그 아래부터 `Enter` 한다.
- **하린이 감지 거리 밖으로 달아났는데 드론이 한 발 더 쏘거나 추격으로 먼저 넘어간다**: 부모의 `Tick` 을 자식보다 나중에 부르면(잎 → 부모), 하린을 놓친 프레임에도 자식 규칙이 먼저 돈다. 공격 거리를 감지 거리보다 넓게 잡은 드론이라면 감지 거리 밖인데 `AttackState.Tick` 이 충전을 더하고 다 찼으면 쏜다. 이 표본의 기본값이라면 `AttackState.Tick` 이 먼저 추격으로 바꿔 `Enter Chase` 가 불리고, Combat 의 "놓치면 수색" 은 그다음에야 본다. `Tick` 은 바깥 부모부터 부르고, 어느 층이 전이하면 남은 층을 건너뛴다 (`StateMachine.TickDown`).
- **부모에 규칙을 옮겼는데 아무 상태에서도 EMP 가 처리되지 않는다**: 상태에 `Parent` 를 달아 놓고 입력은 여전히 지금 잎에게만 주면 평평한 구조와 다를 바 없다. 잎의 `Handle` 이 `false` 를 돌려주면 기계가 `Parent` 로 올려 다시 물어야 한다 (`StateMachine.Handle` 의 반복문). 잎은 자기가 받을 입력만 `true` 를 돌려주고 나머지는 `false` 로 부모에게 넘긴다. 잎이 같은 입력에 `true` 를 돌려주면 부모 규칙보다 앞선다 (예: EMP 에 끄떡없는 장갑 상태).
- **드론 두 대 중 한 대가 수색을 끝내면 다른 대도 순찰로 돌아간다**: 부모·자식 상태 객체(`SearchState`, `CombatState`)에 마지막으로 본 자리나 수색 시간 같은 드론별 값을 넣고, static 한 벌을 여러 드론이 같이 쓰면 한 드론이 바꾼 값을 다른 드론이 읽는다. 이 표본은 `LastSeenX`, `SearchTimer`, `StunTimer`, `AlertOn` 을 `Drone` 에 두고, 상태 객체에는 `Name` 과 `Parent` 만 둔다.

## 변형 예시
- 전투 안에 엄폐 상태를 더하되, EMP 와 경계등 규칙은 손대지 않고 Combat 의 자식으로만 걸고 싶다.
- 기절이 끝나면 순찰이 아니라 기절 전에 있던 상태(추격이나 수색)로 돌아가게 하고 싶다 (상태를 쌓아 두는 푸시다운 오토마타).
- 이동(순찰·추격)과 무기(충전·과열)를 서로 다른 상태 기계 두 개로 동시에 돌리고 싶다 (동시 상태 기계).
- 보스 드론에 2페이즈를 더해 페이즈마다 다른 자식 상태를 두되, EMP 규칙은 Active 하나로 같이 쓰고 싶다.
- 경계등과 함께 경보음을 Combat 의 Enter 에서 켜고 Exit 에서 끄고 싶다.
