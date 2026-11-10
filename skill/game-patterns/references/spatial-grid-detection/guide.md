# 공간 분할: 격자로 근처 적 찾기 (Spatial Partition: Finding Nearby Drones with a Grid)

땅을 칸으로 나눠 드론을 칸에 등록하고, 근처 칸만 보아 탐지 범위 안의 적을 찾는다

패턴: 공간 분할. 난이도 2/3. 주제: 격자, 근처 찾기, 거리 검사, 최적화.

## 파일
- `Core/Drone.cs`
- `Core/Field.cs`
- `Core/SpatialGrid.cs`
- `Core/Turret.cs`
- `Unity/DroneView.cs`
- `Unity/TurretScanner.cs`

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/spatial-grid-detection/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. 드론 프리팹: 2D 프로젝트면 `GameObject > 2D Object > Sprites > Triangle`, Universal 3D 프로젝트면 `GameObject > 3D Object > Cube` 로 하나 만든다 (Sprites 메뉴는 2D Sprite 패키지가 있어야 보인다). Scale 을 (0.4, 0.4, 0.4) 로 하고 `DroneView` 를 붙인 뒤, Hierarchy 에서 Project 창으로 끌어 프리팹을 만들고 (묻는 창이 나오면 Original Prefab) 장면에 남은 것은 지운다.
3. 포탑 그림: 같은 메뉴로 Square(3D 는 Cube)를 하나 만들어 이름을 `Turret` 으로 바꾸고 Position (0, 0, 0), Scale (0.5, 0.5, 0.5) 에 둔다. 자리 표시일 뿐 스크립트가 없다.
4. `GameObject > Create Empty` 로 `Scan Field` 를 만들어 Position (-8, -4.5, 0) 에 두고 `TurretScanner` 를 붙인다. 붙이는 순간 `Reset` 이 기본 키(Q 드론 3대 더하기, W 지금 탐지, E 자동 탐지 켜기·끄기)를 넣는다. `Drone Prefab` 칸에 2단계의 프리팹을 넣는다. 이 오브젝트 자리가 구역(16 × 9 m)의 왼쪽 아래이고, 포탑은 구역 가운데라 월드 (0, 0) 의 `Turret` 그림과 겹친다.
5. `Main Camera` 를 Position (0, 0, -10) 에 두고 Projection 을 `Orthographic`, Size 를 5 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). Game 뷰 비율을 16:9 로 두면 가로 -8.9 ~ 8.9, 세로 -5 ~ 5 가 보여 구역 전체가 들어온다. 격자 선·탐지 반경·본 칸은 Gizmos 라 Scene 뷰에 보이고, Game 뷰에서는 툴바의 Gizmos 버튼을 켜야 보인다.
6. Play 하고 Q 를 누른 뒤 W 를 몇 번 누른다. Console 에 `[Grid] D1 칸 (4,2) 에 등록`, 드론이 칸을 넘을 때마다 `[Grid] D2 칸 (4,3) → (4,2)`, 탐지마다 `[Grid] 탐지: 칸 12개 · 거리 검사 n회 (전체 검사면 3회) · 찾음 …` 이 나온다. 찾은 드론은 초록으로 바뀌고 커지며, Game 뷰 왼쪽 위에 `거리 검사 n 회 (전체 검사면 N 회) · 찾은 드론 n · 본 칸 n` 이 보인다.

## 확인
드론이 반경(Gizmos 의 하늘색 원) 안에 들어온 뒤 W 를 누르면, 그 드론이 Console 의 `찾음` 목록에 들고 초록으로 바뀐다. 포탑과 다른 칸에 있어도, 처음 나온 칸에서 멀리 왔어도 같다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `cellSize` | 칸 크기 | 2m |
| `scanRadius` | 탐지 반경 | 2.5m |
| `droneSpeed` | 드론 속도 | 1.5m/s |

## 동작 단계
1. **드론은 나오는 순간 지금 칸에 등록된다**: `AddWave` 가 정해진 자리에 드론 셋을 만들고 `Field.Add` 가 `grid.Add` 를 부른다. 칸 번호는 `Math.Floor(x / cellSize)` 로 내려 센다 (`(int)` 로 자르면 음수 좌표 -0.5 도 0 칸이 된다). 격자는 칸 → 드론 목록 사전이고, 드론도 자기가 등록된 칸(`Cell`)을 안다. 사건 기록의 `D1 칸 (4,2) 에 등록` 줄이 이 순간이다.
2. **움직여 칸을 넘으면 옛 칸에서 빼고 새 칸에 넣는다**: `Field.Tick` 이 드론마다 자리를 옮긴 뒤 지금 칸을 다시 센다. 등록된 칸과 다르면 `grid.Move(drone, 옛 칸, 새 칸)` 으로 옛 칸 목록에서 빼고 새 칸 목록에 넣는다. 자동 데모 1.25초에 D2 가 (4,3) 에서 포탑 칸 (4,2) 로 넘어오는 줄이 이것이다. 이 한 줄이 빠지면 격자는 드론이 처음 나온 자리를 계속 믿는다.
3. **탐지는 반경이 닿는 칸들만 본다**: `Turret.Scan` 이 `grid.Query(포탑, 반경)` 을 부른다. 원을 감싼 사각형의 칸 범위를 구하고, 그 가운데 원이 실제로 닿는 칸만 본다 (초록으로 칠한 칸). 포탑이 칸 경계 위에 있어도 경계 너머 칸까지 본다. 칸 2m, 반경 2.5m 면 구역 40칸 가운데 12칸이다.
4. **그 칸에 등록된 드론만 거리를 잰다**: 본 칸의 목록에 든 드론만 `거리² <= 반경²` 로 잰다. 왼쪽 위의 `거리 검사 n 회` 가 그 수이고, 괄호 안은 격자 없이 모든 드론을 쟀다면의 수다. 찾은 드론은 초록 링(탐지 순간의 자리)과 초록 이름으로 보이고, 결과는 `Scanned` 이벤트로 알린다. 드론이 늘수록 두 수의 차이가 커진다 (두 번째 시나리오).

## 주의할 점
- 콜라이더가 있는 대상이면 `Physics.OverlapSphere`(3D)나 `Physics2D.OverlapCircleAll`(2D)로 반경 안을 찾는 것이 보통 충분하다. 물리 엔진이 자체 가속 구조로 후보를 추린다고 알려져 있어서다. 2D 의 `Physics2D.OverlapCircle(point, radius)` 기본 오버로드는 콜라이더 하나만 돌려주므로, 전부 받으려면 `OverlapCircleAll` 이나 `ContactFilter2D` 와 `List<Collider2D>` 를 받는 오버로드를 쓴다. 이 표본은 콜라이더 없이 많은 대상(수백 개의 점, 경로점, 파티클 위치)을 다룰 때 직접 짜는 경우다.
- 격자 선, 반경, 이번 탐지가 본 칸은 `OnDrawGizmos` 로 그린다. Scene 뷰에는 늘 보이고 Game 뷰는 Gizmos 버튼을 켜야 보이며, 빌드에는 나오지 않는다. 실제 게임에서 보이려면 LineRenderer 나 스프라이트로 그린다.
- 왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다. 탐지 글은 `Scanned` 핸들러에서 만든다.
- Play 중에 `Cell Size` 를 바꾸면 `OnValidate` 가 `Field.SetCellSize` 로 모든 드론을 새 칸 크기로 다시 등록한다 (칸 이동 로그는 남지 않는다). Gizmos 의 본 칸은 다음 탐지부터 새 칸으로 보인다. `Scan Radius` 는 다음 탐지부터, `Drone Speed`, `Scan Interval` 은 다음 프레임부터 쓴다.
- 드론 위치는 코어(`Field.Tick`)가 정하고 `DroneView.LateUpdate` 가 매 프레임 그 자리로 `transform` 을 덮어쓴다. 다른 스크립트가 `transform` 을 옮기면 그 이동은 무시되고 격자도 모른다. 드론에 Rigidbody 를 붙여 물리로 움직이면 물리와 `LateUpdate` 가 자리를 두고 싸운다. 자리를 바꾸는 코드는 모두 코어의 드론 자리를 바꾸게 한다.
- `Time.timeScale` 이 0 이면 `Tick(0)` 이라 드론과 자동 탐지 시계가 멈춘다. W 로 누르는 탐지는 멈춘 채로도 돈다.

## 흔한 실수
- **드론이 포탑 바로 옆에 있는데 탐지 목록에 없다 (처음 나온 자리 근처에서만 잡힌다)**: 칸을 넘을 때 등록을 옮기지 않았다. 드론을 움직이는 코드(`transform.position` 이나 `x += …`)와 격자 등록이 따로 놀면 격자는 처음 자리를 계속 믿는다. 위치를 바꾸는 곳을 한 곳(`Field.Tick`)으로 모으고, 바뀐 칸을 세어 다르면 `grid.Move(drone, 옛 칸, 새 칸)` 을 바로 부른다. 순간 이동이나 넉백처럼 다른 곳에서 자리를 바꾸는 코드는 자리를 바꾼 곳에서 바로 칸을 다시 세어 `grid.Move` 를 부른다. 이 표본은 다음 `Field.Tick` 이 칸을 바로잡지만, 그 전에 탐지하면 옛 칸을 본다.
- **칸 경계 바로 너머의 드론만 못 찾는다**: 포탑이 있는 칸(내 칸)만 봤다. 반경이 칸 안에 다 들어가는 경우는 드물다: 포탑이 칸 가장자리에 있으면 반경 0.5m 라도 이웃 칸으로 넘친다. `(x ± r) / cellSize` 로 반경을 감싼 칸 범위를 구해 그 칸을 모두 본다. "주변 3×3 칸" 으로 고정해도 반경이 칸보다 크면 또 빠진다.
- **격자로 바꿨는데 오히려 느려졌다**: 칸 크기가 반경보다 훨씬 작으면 탐지 한 번에 훑을 칸이 많아진다 (칸 1m, 반경 2.5m 면 32칸). 반대로 칸이 너무 크면 칸 하나에 드론이 많이 들어 거리 검사가 전체 검사와 비슷해진다. 칸 크기를 반경과 비슷하게(반경의 1~2배) 두고, 드론이 수십 대 이하라면 전체 검사가 더 단순하고 빠를 수 있다는 것도 잰다.
- **파괴한 드론이 탐지에 잡히거나 `MissingReferenceException` 이 난다**: 드론 오브젝트를 `Destroy` 하면서 격자 칸에서 빼지 않았다. 칸 목록은 없앤 드론을 계속 들고 있다. 이 표본처럼 격자에 코어 `Drone` 을 넣었다면 예외 없이 없앤 드론이 `찾음` 에 계속 남는다. 격자에 Transform 이나 MonoBehaviour 를 넣었다면 탐지가 파괴된 드론의 `transform.position` 을 읽다가 `MissingReferenceException` 이 난다. 이 표본은 `Field.Remove` 가 목록과 격자에서 함께 빼고 `Removed` 이벤트로 알리며, 연결 컴포넌트는 그 이벤트에서 화면 오브젝트를 지운다. 다른 곳에서 드론을 없앨 때도 `Field.Remove` 를 부른다.
- **월드 원점 둘레의 드론이 엉뚱한 칸에서 잡히거나 빠진다**: 칸 번호를 `(int)(x / cellSize)` 로 셌다. C# 의 `(int)` 는 0 쪽으로 잘라 -0.5 도 0 이 되어, 0번 칸이 -1 칸까지 두 배로 넓어지고 -1 칸에는 아무도 등록되지 않는다. Unity 월드는 보통 원점이 가운데라 절반이 음수 좌표다: 월드 좌표 그대로 격자를 만들면 원점 둘레에서 이 일이 생긴다. 이 표본은 `Scan Field` 를 구역 왼쪽 아래에 두고 그 로컬 좌표(0 이상)만 써서 드러나지 않지만, `(int)Math.Floor(x / cellSize)` 로 내려 음수에서도 맞게 했다 (`SpatialGrid.CellOf`).

## 변형 예시
- 탐지에 걸린 드론 가운데 가장 가까운 드론을 포탑이 조준하게 하고 싶다.
- 드론 수백 대가 서로 너무 가까우면 밀어내도록, 드론마다 근처 드론을 격자로 찾고 싶다.
- 파괴된 드론을 격자와 목록에서 함께 빼고 화면 오브젝트도 지우고 싶다.
- 구역이 커져 빈 칸이 많으니 사전 대신 고정 크기 배열 격자로 바꾸고 싶다.
- 포탑을 여러 대 두고 각 포탑이 자기 반경만 탐지하게 하고 싶다.
