# 전략 패턴: 포탑 조준 방식 (Strategy Pattern: Turret Targeting)

포탑은 조준 방식 객체에게 대상을 묻고, 방식은 실행 중에 갈아 끼운다

패턴: 전략 패턴. 난이도 1/3. 주제: 조준, 전략 교체, 합성, 타워 디펜스.

## 파일
- `Core/Drone.cs`
- `Core/TargetingStrategies.cs`
- `Core/Turret.cs`
- `Unity/TurretController.cs`

모두 프로젝트의 `Assets/Patterns/strategy-turret-targeting/` 아래에 같은 하위 폴더로 복사한다.

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/strategy-turret-targeting/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. 드론 프리팹을 만든다. 2D 프로젝트면 `GameObject > 2D Object > Sprites > Triangle`, Universal 3D 프로젝트면 `GameObject > 3D Object > Cube` 를 만들고 Scale 을 (0.6, 0.6, 0.6) 정도로 줄여 빨갛게 칠한 뒤(2D 는 Sprite Renderer 의 Color, 3D 는 Material) Project 창으로 끌어 프리팹으로 만들고 씬의 것은 지운다 (Sprites 메뉴는 2D Sprite 패키지가 있어야 보인다).
3. 포탑 오브젝트를 만든다 (2D 는 `GameObject > 2D Object > Sprites > Square`, 3D 는 `GameObject > 3D Object > Cube`). 이름을 `Turret` 으로 바꾸고 Position 을 (0, 0, 0) 에 둔 뒤 `TurretController` 를 붙인다. 붙이는 순간 `Reset` 이 기본 키(1 가까운 것, 2 체력 많은 것, 3 선두, 4 체력 적은 것)를 넣는다. 웹 갤러리 무대의 Q/W/E/R 은 갤러리 단축키를 피한 것이라 Unity 와 다르다. `Drone Prefab` 칸에 드론 프리팹을 넣는다.
4. 같은 오브젝트에 `Component > Effects > Line Renderer` 를 붙이고 Width 를 0.05 정도로 줄인다. Materials 의 Element 0 에 `Sprites-Default` 를 넣는다 (비어 있으면 분홍색으로 보인다). 이 Line Renderer 를 `TurretController` 의 `Laser` 칸에 끌어 넣는다. 레이저는 포탑에서 지금 대상까지 그려지고 대상이 없으면 꺼진다.
5. 포탑이 (0, 0, 0) 이면 드론은 x -8 에서 나와 x 7 의 기지 쪽으로 간다. `Main Camera` 를 Position (-0.5, 2.5, -10) 에 두고 Projection 을 `Orthographic`, Size 를 5 로 한다 (2D 템플릿은 처음부터 Orthographic 이다).
6. Play 하고 2, 3, 4 를 눌러 본다. Game 뷰 왼쪽 위에 지금 방식과 대상이 보이고, Console 에 `[Turret] 조준 방식 Nearest → Weakest`, `발사 → D3 (HP 1/2)` 같은 줄이 남는다.

## 확인
4(체력 적은 것)를 누르면 레이저가 HP 가 가장 낮은 드론으로 옮겨 가고, Console 의 `발사 →` 줄이 그 드론 이름을 가리킨다. 레이저와 발사 대상이 다른 순간이 없다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `range` | 사거리 | 6m |
| `fireInterval` | 발사 간격 | 0.4초 |
| `damage` | 한 발 피해 | 1 |

## 동작 단계
1. **입력이 전략 객체를 갈아 끼운다**: `TurretController` 는 키(웹 무대 Q/W/E/R, Unity 기본 1~4)를 받으면 미리 만들어 둔 전략 객체 하나를 `Turret.SetStrategy` 에 넘긴다. 포탑은 바꿔 끼우기만 하고 대상을 바로 다시 고르지 않는다. 어떤 방식이 있는지 포탑 코드는 모른다.
2. **Tick 에서 대상을 한 번 묻는다**: `Turret.Tick` 은 `DroneWave` 에서 사거리 안 후보를 모아 지금 전략의 `SelectTarget` 에 한 번 묻는다. 거리, 체력, 선두를 비교하는 코드는 전략 클래스 안에만 있다. 같은 값이면 id 가 작은 드론이라 언제 돌려도 같다.
3. **같은 대상을 조준과 발사가 함께 쓴다**: 물어서 받은 드론은 `CurrentTarget` 하나에 둔다. 어댑터의 레이저도, 쿨다운이 끝나 쏘는 `Fire` 도 이 값을 쓴다. 고르는 곳이 한 군데라 새 방식을 더해도 레이저와 총알이 갈라질 수 없다. 파괴한 드론은 바로 `CurrentTarget` 에서 놓는다.

## 주의할 점
- 이 표본의 거리는 가로(x) 거리다. 드론의 높이(`Altitude`)는 화면에만 쓴다. 2D 나 3D 거리로 고르려면 `SelectTarget` 에 포탑 위치를 벡터로 넘기도록 인터페이스를 바꾼다. 그래도 고르는 곳은 전략 하나다.
- 전략 객체는 `Targeting` 의 static 필드로 한 번만 만든다. ScriptableObject 로 만들어 Inspector 에서 고르게 할 수도 있는데, 그때도 에셋에 포탑별 값을 저장하지 않는다 (에셋 하나를 모든 포탑이 같이 쓴다).
- `InputAction` 은 `OnEnable` 에서 콜백을 붙이고 `Enable`, `OnDisable` 에서 떼고 `Disable` 한다. 떼지 않으면 다시 켤 때 콜백이 두 번 붙는다. 코드에서 만드는 액션은 `InputActionType.Button` 으로 만든다.
- 드론 오브젝트는 코어 드론과 `Dictionary` 로 짝지어 두고, `DroneDestroyed` 와 `DroneReachedBase` 에서 지운다. 레이저 끝은 `Update` 에서 `CurrentTarget` 의 짝 오브젝트 위치로 옮기므로, 짝을 먼저 지우고 대상이 남아 있으면 레이저가 빈 자리를 가리킨다. 코어가 파괴와 동시에 대상을 놓는 이유다.
- 로켓, 레이저, 냉각 포탑마다 `RocketNearestTurret` 처럼 조준 방식별 하위 클래스를 만들면 종류 3 × 방식 4 로 12개가 된다. 포탑 종류는 종류대로 두고 조준 방식은 `ITargetingStrategy` 필드로 들게 하면 3 + 4 로 더해진다 (무기 × 인챈트를 나누는 브리지 패턴과 같은 생각이다).
- `Loop Wave` 가 켜져 있으면 드론이 모두 사라진 뒤 표를 처음부터 다시 낸다. `Time.timeScale` 이 0 이면 `Tick` 이 멈춰 발사도 멈추지만 키 입력은 그대로 방식을 바꾼다.

## 흔한 실수
- **새 조준 방식을 넣었더니 레이저와 총알이 다른 드론을 가리킨다**: 조준 표시와 발사가 각자 `if (mode == …)` 로 대상을 고르고, 새 방식을 한쪽 사슬에만 더했다. 대상은 한 곳(`Turret.Tick`)에서 전략에게 한 번만 묻고, 레이저와 발사는 그 결과(`CurrentTarget`)를 같이 쓴다. 새 방식은 `ITargetingStrategy` 를 구현한 클래스 하나로 더한다.
- **조준 방식이 저절로 바뀐다**: 전략 안에서 "체력이 다 빠지면 다음은 선두" 처럼 다음 전략을 골라 포탑에 넣으면 그건 상태 패턴이다. 그렇게 짜면 누가 방식을 바꾸는지 찾기 어렵다. 전략은 후보 중 하나를 고르는 일만 하고, 방식을 바꾸는 것은 입력, 업그레이드, AI 처럼 바깥이 `SetStrategy` 로 한다.
- **포탑 두 대가 같은 전략을 쓰자 대상이 섞인다**: 전략 객체에 `lastTarget` 같은 포탑별 값을 두고 한 객체를 두 포탑이 같이 쓰면 서로 덮어쓴다. 전략은 받은 후보와 포탑 위치만 보고 답하게 하고, 마지막 대상 같은 값은 `Turret` 에 둔다. 상태가 없으면 `Targeting.Nearest` 하나를 몇 대든 같이 쓸 수 있다.
- **조준 방식을 쓰니 GC 경고가 늘었다**: `Update` 마다 `new NearestTarget()` 을 만들어 넘기면 프레임마다 쓰레기가 생긴다. 상태 없는 전략은 한 번 만들어 두고(`Targeting` 의 static 필드나 어댑터의 필드) 같은 객체를 다시 끼운다. 후보 목록도 `List` 하나를 재사용한다.
- **드론이 터졌는데 레이저가 빈 자리를 가리키거나 MissingReferenceException 이 난다**: 파괴된 드론을 대상으로 계속 들고 있다. 이 표본은 매 `Tick` 후보에서 다시 고르고, 쏘아서 파괴하면 그 자리에서 `CurrentTarget` 을 `null` 로 놓고 `TargetChanged` 로 알린다. 어댑터는 `DroneDestroyed` 에서 드론 오브젝트를 지우고, 레이저는 `CurrentTarget` 이 있을 때만 그린다.

## 변형 예시
- 포탑 업그레이드를 사면 조준 방식 메뉴에 "가장 빠른 것" 이 새로 열리게 하고 싶다.
- 포탑마다 조준 방식을 Inspector 의 드롭다운으로 고르게 하고 싶다.
- 적 AI 의 공격 대상 고르기(가까운 아군, 체력 낮은 아군)도 같은 구조로 만들고 싶다.
- 로켓 포탑, 레이저 포탑, 냉각 포탑에 같은 조준 방식들을 상속 없이 조합해 쓰고 싶다.
- 같은 값일 때 고르는 기준(먼저 들어온 것, 기지에 가까운 것)을 바꿀 수 있게 하고 싶다.
