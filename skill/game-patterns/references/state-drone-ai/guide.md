# 상태 패턴: 잔해 드론 AI (State Pattern: Debris Drone AI)

적 AI 의 순찰·추격·공격·파괴를 상태 객체로 나누고, 들어갈 때 바꾼 것을 나올 때 되돌린다

패턴: 상태 패턴. 난이도 2/3. 주제: 상태 기계, 적 AI, 진입·이탈 처리, 거리 판정.

## 파일
- `Core/Drone.cs`
- `Core/DroneStates.cs`
- `Unity/DroneController.cs`

모두 프로젝트의 `Assets/Patterns/state-drone-ai/` 아래에 같은 하위 폴더로 복사한다.

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/state-drone-ai/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다 (시연용 피해 키).
2. 드론 오브젝트를 만든다. 2D 프로젝트면 `GameObject > 2D Object > Sprites > Triangle` (2D Sprite 패키지가 있어야 보인다), Universal 3D 프로젝트면 `GameObject > 3D Object > Cube`. 이름을 `Drone` 으로 바꾸고 Position 을 (4, 0, 0) 에 둔다. 드론은 이 자리에서 왼쪽 2m, 오른쪽 2m (x 2~6) 를 순찰한다.
3. 드론에 `DroneController` 를 붙인다. 붙이는 순간 `Reset` 이 시연용 피해 키(H)와 `Body Renderer` 칸(같은 오브젝트의 Sprite Renderer 나 Mesh Renderer)을 채운다. 상태가 바뀔 때마다 이 렌더러의 색이 바뀐다 (순찰 회청색, 추격 주황, 공격 빨강, 파괴 검정).
4. `Target` 칸에 플레이어 오브젝트를 끌어 넣는다. 웹 무대의 다가가기·물러나기(Q/W)는 하린을 움직이는 시연용 입력이라 Unity 어댑터에는 없다. 수강생의 플레이어를 원래 이동 코드 그대로 드론 쪽으로 걸리면 된다. 드론은 플레이어의 x 좌표만 본다. 플레이어가 아직 없으면 Cube 하나를 (-4, 0, 0) 에 두고 Play 중 Scene 뷰에서 x 로 끌어 옮겨도 된다.
5. `Main Camera` 를 Position (1, 1.5, -10) 에 두고 Projection 을 `Orthographic`, Size 를 5 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). x -8 부터 10 쯤까지 보여 순찰 구간과 플레이어가 함께 보인다.
6. Animator 가 있으면 `Animator` 칸에 넣고 상태 이름과 같은 Animator 상태(Patrol, Chase, Attack, Destroyed)를 만든다. Patrol 을 기본 상태(Set as Layer Default State)로 둔다. 시작 상태는 바뀐 적이 없어 CrossFade 되지 않기 때문이다.
7. Play 하고 플레이어를 드론에 다가가게 했다가 물러나 본다. Console 에 `[Drone] Patrol → Chase`, `[Drone] Chase → Attack`, `[Drone] 사격 → 대상 (거리 2.48)` 같은 줄이 남고, Game 뷰 왼쪽 위에 지금 상태, 속도, HP 가 보인다. H 를 세 번 누르면 `Attack → Destroyed` (공격 중이었다면) 와 `파괴` 가 남는다.

## 확인
공격 거리 안에 서 있으면 `chargeTime` 마다 Console 에 `사격` 줄이 남고, 물러나면 `Attack → Chase` 가 남으며 왼쪽 위 속도가 0.0 에서 `moveSpeed` 로 돌아와 드론이 곧바로 다시 쫓아온다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `detectRange` | 감지 거리 | 5m |
| `attackRange` | 공격 거리 | 2.5m |
| `chargeTime` | 충전 시간 | 0.6초 |
| `moveSpeed` | 이동 속도 | 2.5m/s |

## 동작 단계
1. **상태가 거리를 보고 다음을 정한다**: `DroneController` 가 매 프레임 하린의 x 를 `Drone.Tick` 에 넘기면, 드론은 지금 상태 객체의 `Tick` 에 맡긴다. `PatrolState` 는 감지 거리를, `ChaseState` 는 감지·공격 거리를, `AttackState` 는 공격 거리를 보고 넘어갈 때가 되면 `d.ChangeState(…)` 를 부른다. 체력은 `TakeHit` 이 보고 HP 가 0 이면 어느 상태에서든 `Destroyed` 로 바꾼다. 입력이 아니라 거리와 체력이 전이를 일으킨다.
2. **ChangeState 가 먼저 Exit 를 부른다**: 상태는 `Drone.ChangeState` 한 곳에서만 바뀐다 (`State` 의 setter 는 `private`). 공격 중에 하린이 물러나면(자동 데모 2.40초) `AttackState.Tick` 이 `ChangeState(Chase)` 를 부르고, `ChangeState` 는 먼저 `AttackState.Exit` 를 불러 `Speed` 를 `moveSpeed` 로 되돌리고 충전을 끈다. 피해로 파괴될 때도 같은 `Exit` 를 지난다.
3. **다음 상태의 Enter 를 한 번**: 그다음 들어가는 상태의 `Enter` 를 한 번 부른다. `AttackState.Enter` 가 `Speed` 를 0 으로 해 멈추고 충전을 0 에서 시작한다. 한 번만 부르므로 충전이 `chargeTime` 까지 차서 쏜다 (1.02초 진입, 1.62초 사격). 충전 막대의 흰 눈금이 `chargeTime` 이고 막대 끝은 최대값 1.5초다.
4. **Tick 은 지금 상태의 일만**: `Drone.Tick` 에는 상태를 묻는 `switch` 가 없다. 움직이는 것은 `PatrolState` 와 `ChaseState` 뿐이고, `AttackState.Tick` 은 충전하고 쏘기만, `DestroyedState.Tick` 은 아무것도 하지 않는다. 충전한 시간과 속도는 `Drone` 이 들고 상태 객체는 `DroneStates` 의 static 한 벌이라, 드론이 몇 대든 같은 객체를 같이 쓴다.

## 주의할 점
- 거리는 가로(x) 거리다. 어댑터는 플레이어의 y 와 z 를 보지 않고, 드론의 y·z 도 시작 자리 그대로 둔다 (시작 자리에 코어의 X 만 더한다). 3D 에서 z 로도 걷는 게임이면 `Drone.Distance` 를 평면 거리로 바꾸고 코어에 x, z 를 함께 넘긴다.
- 이 표본은 원리를 보이려고 `transform.position` 을 직접 옮기고 벽이나 바닥과의 충돌을 보지 않는다. 장애물을 돌아와야 하면 `ChaseState` 가 정한 목표를 NavMeshAgent 같은 이동 컴포넌트에 넘기고, 멈추기(`AttackState.Enter`)와 되돌리기(`AttackState.Exit`)도 그 컴포넌트의 `isStopped` 로 옮긴다. 짝은 그대로 Enter 와 Exit 에 둔다.
- `Time.timeScale` 이 0 이어도 `Update` 는 돌아 `Tick(0)` 이 불린다. 이동과 충전은 멈추지만 거리로 넘어가는 전이는 그대로 일어나고 (일시정지 중 Scene 뷰에서 플레이어를 옮기면 상태가 바뀐다), 시연용 피해 키(H)도 그대로 받는다. 일시정지 중 조작을 막으려면 입력도 함께 끈다.
- 드론을 여러 대 놓아도 상태 객체는 `DroneStates` 의 static 한 벌을 같이 쓴다. 충전 시간, 속도, HP 는 드론마다 `Drone` 이 따로 들어 섞이지 않는다. 화면 글(`Show Status On Screen`)은 모두 같은 자리에 그려지므로 한 대만 켠다.
- 3D 의 `Body Renderer` 색은 `material` 로 칠해 그 렌더러만의 머티리얼 사본을 만든다. 같은 머티리얼을 쓰는 다른 오브젝트에는 번지지 않는다. `maxHp` 는 Play 를 시작할 때만 읽고, 나머지 조절 값은 Play 중에 바꿔도 `OnValidate` 가 코어에 넣는다.
- `InputAction` 은 `OnEnable` 에서 콜백을 붙이고 `Enable`, `OnDisable` 에서 떼고 `Disable` 한다. 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 피해가 두 번 들어간다. 코드에서 만드는 액션은 `InputActionType.Button` 으로 만든다.

## 흔한 실수
- **공격하다 플레이어가 물러났는데 적이 제자리에 서서 안 쫓아온다**: 공격에 들어갈 때 멈춘 속도(`speed = 0`)를 나갈 때 되돌리지 않았다. `switch` 에는 "이 상태에서 나갈 때" 의 자리가 없어서 나가는 길(추격으로, 파괴로)마다 되돌리는 줄을 따로 넣어야 하고, 하나만 빠져도 멈춘다. 들어갈 때 바꾼 것은 그 상태의 `Exit` 에서 되돌리고, 전이는 `ChangeState` 한 곳에서 해서 어느 길로 나가든 `Exit` 를 지나게 한다.
- **충전 막대가 차지 않고 적이 한 번도 쏘지 않는다**: 충전 시작, 애니메이션 트리거, 효과음처럼 들어갈 때 한 번 할 일을 `case` 안, 곧 매 프레임 도는 자리에 두었다. 같은 값을 넣는 `speed = 0` 은 매 프레임 해도 티가 나지 않아 괜찮아 보이지만, 타이머를 0 으로 되돌리는 일은 매 프레임 하면 끝나지 않는다. 한 번 할 일은 `Enter` 에, 매 프레임 할 일만 `Tick` 에 둔다.
- **Exit 를 만들었는데도 가끔 속도가 돌아오지 않는다**: `state = …` 처럼 상태를 직접 바꾸는 줄이 `ChangeState` 밖에 남아 있어, 그 길로 나가면 `Exit` 와 `Enter` 의 짝이 깨진다. 이 표본은 `Drone.State` 의 setter 를 `private` 로 막아 `ChangeState` 로만 바꿀 수 있다. 피해로 파괴될 때도 `TakeHit` 이 `ChangeState(Destroyed)` 를 불러 `AttackState.Exit` 를 지난다.
- **드론 두 대를 놓았더니 한 대가 쏠 때 다른 대의 충전도 처음부터 다시 찬다**: 상태 객체 안에 충전 시간 같은 드론별 값을 두고, 그 상태 객체를 여러 드론이 같이 썼다. 한 드론이 쏘고 값을 0 으로 돌리면 다른 드론의 값도 0 이 된다. 이 표본은 상태 객체를 `DroneStates` 의 static 한 벌로 같이 쓰는 대신 `ChargeTimer`, `Speed`, `Hp` 를 `Drone` 에 둔다. 상태 객체에 값을 꼭 두고 싶으면 드론마다 상태 객체를 새로 만든다.
- **파괴된 드론이 미끄러지거나 떨린다**: 파괴 상태여도 다른 스크립트(넉백, 물리, 다른 이동 코드)가 같은 오브젝트를 계속 움직인다. 이 표본의 `DestroyedState.Tick` 은 아무것도 하지 않아 코어의 X 가 그대로이고, 어댑터는 매 `Update` 에 위치를 그 X 로 덮어쓴다. 그래서 다른 코드가 옮겨도 다음 프레임에 제자리로 돌아오는데, 그 사이가 떨림으로 보인다. 다른 이동 코드는 `Destroyed` 이벤트에서 끄거나, Rigidbody 가 있으면 그때 `isKinematic` 을 켠다.

## 변형 예시
- `AttackState` 를 상속한 연사 공격 상태를 만들어, 충전이 끝나면 세 발을 짧은 간격으로 쏘게 하고 싶다.
- 맞으면 잠깐 멈칫하는 경직 상태를 더하고, 경직이 끝나면 하던 상태(추격이나 공격)로 돌아가게 하고 싶다.
- HP 가 절반 아래로 떨어지면 플레이어에게서 멀어지는 도주 상태로 바꾸고 싶다.
- 드론 여러 대가 같은 상태 객체를 쓰면서 각자 다른 순찰 구간을 돌게 하고 싶다.
- 추격을 NavMeshAgent 로 바꿔 장애물을 돌아오게 하되, 공격 때 멈추고 나올 때 다시 움직이는 짝은 그대로 두고 싶다.
