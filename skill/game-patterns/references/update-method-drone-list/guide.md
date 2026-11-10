# 업데이트 메서드: 드론 목록 한 프레임 (Update Method: One Frame of a Drone List)

매니저가 드론 목록을 돌며 하나씩 업데이트하되, 도는 중에 생기고 사라지는 드론은 루프 밖에서 정리한다

패턴: 업데이트 메서드. 난이도 2/3. 주제: 게임 루프, 컬렉션 수정, 생성과 파괴.

## 파일
- `Core/Drone.cs`
- `Core/DroneSwarm.cs`
- `Unity/SwarmRunner.cs`

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/update-method-drone-list/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. 드론 프리팹: 2D 프로젝트면 `GameObject > 2D Object > Sprites > Triangle`, Universal 3D 프로젝트면 `GameObject > 3D Object > Cube` 로 하나 만든다 (Sprites 메뉴는 2D Sprite 패키지가 있어야 보인다). Scale 을 (0.6, 0.6, 0.6) 으로 하고 Hierarchy 에서 Project 창으로 끌어 프리팹을 만든 뒤, 장면에 남은 것은 지운다. 스크립트는 붙이지 않는다.
3. 기지 그림: 같은 메뉴로 Square(3D 는 Cube)를 하나 만들어 이름을 `Base` 로 바꾸고 Position (-7.2, -1, 0), Scale (1, 4, 1) 에 둔다. 자리 표시일 뿐 스크립트가 없다.
4. `GameObject > Create Empty` 로 `Drone Swarm` 을 만들어 Position (-8, -2.5, 0) 에 두고 `SwarmRunner` 를 붙인다. 붙이는 순간 `Reset` 이 기본 키(Q 드론 출발, W 분열 드론 출발, E EMP)를 넣는다. `Drone Prefab` 칸에 2단계의 프리팹을 넣는다. 드론은 월드 x 6.8 에 나타나 x -6.2 에서 기지에 닿고, 세 줄은 `Lane Gap` 1.5 간격으로 월드 y -2.5, -1, 0.5 에 놓인다.
5. `Main Camera` 를 Position (0, 0, -10) 에 두고 Projection 을 `Orthographic`, Size 를 5 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). Game 뷰 비율을 16:9 로 두면 가로 -8.9 ~ 8.9, 세로 -5 ~ 5 가 보여 기지, 드론이 나타나는 자리, 세 줄이 모두 화면에 들어온다.
6. Play 하고 Q 를 세 번, W 를 한 번 누른 뒤 E 를 누른다. Console 에 `[Swarm] D1 HP 0 → 지울 표시` 같은 줄이 모두 나온 다음 `[Swarm] D1 목록에서 지움` 줄들이 이어지고, Hierarchy 의 `Drone Swarm` 아래 드론 오브젝트가 사라진다. 분열 드론은 나오고 1초 뒤 `S4a 대기 목록에 (분열)` 을 남기고 조각 둘로 바뀐다. Game 뷰 왼쪽 위에 `목록 n · 이번 프레임 업데이트 n · 합침 n · 지움 n` 이 보인다.

## 확인
분열 드론이 나뉘는 프레임에 Console 에 `대기 목록에 (분열)` 줄들, `분열 → 지울 표시`, `목록에서 지움`, `목록에 들어옴` 줄들이 이 순서로 나오고, EMP 로 여러 대를 잡아도 `지울 표시` 줄이 모두 나온 뒤에야 `목록에서 지움` 줄이 나온다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `moveSpeed` | 이동 속도 | 3m/s |
| `splitDelay` | 분열까지 시간 | 1초 |
| `splitCount` | 분열 조각 수 | 2대 |

## 동작 단계
1. **매니저가 목록을 처음부터 돌며 드론마다 Update 를 부른다**: 엔진이 부르는 `Update` 는 `SwarmRunner` 하나뿐이다. 거기서 `DroneSwarm.Tick(Time.deltaTime)` 이 드론 목록을 처음부터 돌며 드론마다 `drone.Update(dt, this)` 를 부르고, 드론은 자기 위치를 옮기고 업데이트 횟수(u)를 올린다. 같은 프레임에 태어난 드론끼리는 u 가 늘 같다. 드론이 세 줄로 나뉜 것은 겹쳐 보이지 않게 한 화면에만 있는 높이다.
2. **드론이 빠지겠다고 하면 표시만 한다**: 기지에 닿거나 HP 가 0 인 드론은 자기 Update 안에서 `swarm.Despawn(this)` 를 부른다. `Despawn` 은 `IsDead` 를 켜고 `DespawnRequested` 를 알릴 뿐 목록을 건드리지 않는다. 그래서 도는 중인 목록의 칸이 당겨지지 않고, 바로 다음 드론도 이번 프레임에 Update 된다. 자동 데모 1.70초 EMP 에서 넷이 한꺼번에 표시돼도 S4 는 그대로 움직인다.
3. **새 드론은 대기 목록에 넣는다**: 분열 드론은 `splitDelay` 가 지나면 자기 Update 안에서 조각을 만들어 `swarm.Spawn(조각)` 에 넘기고 자기는 `Despawn` 한다. 도는 중이면 `Spawn` 은 조각을 대기 목록에 넣는다 (루프 밖에서 들어온 출발 입력은 바로 목록에 넣는다). 그래서 조각은 만들어진 프레임에는 Update 되지 않는다.
4. **루프가 끝나면 표시된 드론을 지우고 대기 목록을 합친다**: 루프가 끝나면 표시된 드론을 떠서 하나씩 `Despawned` 로 알린 뒤 (목록에서 지우기 직전이라 핸들러 안의 `Drones.Count` 는 옛 값이다) `RemoveAll` 로 한꺼번에 지운다. 알림을 받은 쪽이 다른 드론을 또 `Despawn` 하면 새 표시가 없을 때까지 되풀이한다. 그다음 대기 목록을 목록 뒤에 붙이는데, 대기 중에 빠지기를 요청한 드론은 붙이지 않는다. 합친 조각은 다음 프레임부터 Update 된다. `SwarmRunner` 는 `Despawned` 에서 드론 오브젝트를 `Destroy` 한다. Unity 의 `Destroy` 도 그 자리에서 지우지 않고 그 프레임의 Update 가 끝날 때까지 미루는데, 같은 생각이다. 왼쪽 위의 합침·지움 숫자가 이 순간의 수다 (한 프레임뿐이라 웹 무대는 0.4초 남겨 보인다).

## 주의할 점
- Unity 의 `MonoBehaviour.Update` 자체가 업데이트 메서드 패턴이다: 엔진이 켜진 컴포넌트를 돌며 `Update` 를 부르고, 그 도중의 `Destroy` 는 그 프레임의 Update 가 끝날 때까지 미룬다. 드론마다 `Update` 를 두는 대신 이 표본처럼 매니저 하나가 목록을 돌면, 수백 대일 때 엔진이 스크립트의 `Update` 를 부르는 횟수가 드론 수에서 한 번으로 줄고, 도는 순서와 생기고 사라지는 시점도 코드에 드러난다.
- 코어 시간은 `Tick(Time.deltaTime)` 으로 받는다. `Time.timeScale` 이 0(일시정지)이어도 `SwarmRunner.Update` 는 불려 `Tick(0)` 이 돈다: 드론은 멈추지만 업데이트 횟수(u)는 계속 오르고, EMP 로 HP 0 이 된 드론은 그대로 빠진다. 일시정지 중에 드론을 아예 멈추려면 `Time.deltaTime` 이 0 일 때 `Tick` 을 부르지 않는다.
- Play 중에 바꾼 `Move Speed`, `Split Delay`, `Split Count` 는 `OnValidate` 가 코어 설정에 넣어 다음 프레임부터 쓴다. `Lane Gap` 은 위치를 옮길 때마다 읽어 바로 반영되고, `Splitter Scale` 은 다음에 나오는 분열 드론부터 쓴다.
- 왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다. 합침·지움 숫자는 마지막 프레임의 루프가 끝난 뒤 합치고 지운 수라, 분열이나 파괴가 있던 한 프레임에만 0 이 아니다 (웹 무대는 보이게 0.4초 남긴다).

## 흔한 실수
- **적 여럿이 한꺼번에 죽은 프레임에 살아남은 적 하나가 한 박자 늦게 움직인다**: 목록을 `for` 로 도는 중에 `Remove` 했다. 지운 칸 뒤가 한 칸씩 당겨지는데 `i++` 는 그대로라 바로 다음 원소를 건너뛴다. 빠질 것은 표시(`IsDead`)만 하고 루프가 끝난 뒤 `RemoveAll(d => d.IsDead)` 로 한꺼번에 지운다. `RemoveAt` 은 지운 칸 뒤를 매번 당기지만 `RemoveAll` 은 한 번 훑으며 남길 것만 앞으로 모은다.
- **`foreach` 로 바꿨더니 `InvalidOperationException: Collection was modified` 가 난다**: `List<T>` 의 열거자는 도는 중에 목록이 바뀌면 다음 칸으로 넘어갈 때 예외를 던진다. 그 프레임의 나머지 드론은 Update 되지 않고 매니저의 Update 도 거기서 끝난다 (Unity 는 Console 에 오류를 남기고 다음 프레임에 다시 부르므로, 드론이 죽거나 나뉠 때마다 오류가 난다). 도는 중에는 목록을 바꾸지 않는 것이 해법이고, 그러면 이 표본의 `Tick` 처럼 `foreach` 로 돌아도 안전하다.
- **분열로 만든 적이 만들어진 프레임에 벌써 한 걸음 가 있다**: 도는 중에 `Add` 했다. `i < drones.Count` 는 매번 `Count` 를 다시 읽어 방금 붙인 드론까지 돈다. 새 드론이 Update 에서 또 무언가를 만들면 한 프레임 안에서 끝없이 늘 수도 있다. 새 드론은 대기 목록에 넣고 루프가 끝난 뒤 합친다. 루프 전에 `int count = drones.Count;` 로 세어 그만큼만 도는 방법도 있지만 (Nystrom), 도는 중의 `Remove` 와 함께 쓰면 칸 번호가 다시 어긋나고, 루프 전에 센 `count` 로 돌면서 `Remove` 하면 줄어든 목록의 끝을 넘어 `ArgumentOutOfRangeException` 도 난다.
- **거꾸로 돌기로 고쳤는데 이웃을 터뜨리는 드론을 넣자 한 드론이 두 번 움직인다**: `for (int i = drones.Count - 1; i >= 0; i--)` 로 돌면 자기를 지울 때 당겨지는 칸은 이미 돈 드론이고, 끝에 `Add` 한 드론도 시작 때의 `Count` 밖이라 이번 프레임에 돌지 않는다. 그러나 이것은 "자기만 지우고 끝에만 더할 때" 만 맞는다. 앞쪽(아직 안 돈 칸)의 이웃을 지우면 지금 드론이 한 칸 당겨져 다음 반복에서 또 Update 되고, 중간에 `Insert` 하면 다른 드론을 건너뛴다. 도는 순서도 뒤에서 앞으로 바뀐다. 표시 후 정리에서는 도는 중에 어느 드론이 어느 드론을 지워도 목록 칸이 움직이지 않는다: 표시된 드론은 그 프레임의 나머지 차례를 건너뛰고, 나머지는 모두 한 번씩 Update 된다. 만든 드론은 대기 목록에 있다가 루프 뒤에 합치고, 같은 프레임에 만들고 지운 드론은 합치지 않는다. `Despawned` 를 받은 쪽이 또 지우면 새 표시가 없을 때까지 정리를 되풀이한다.
- **Destroy 한 적을 목록이 계속 들고 있다가 `MissingReferenceException` 이 난다**: 매니저 목록에 `GameObject` 나 컴포넌트를 넣어 두고 다른 곳(총알, 폭발)에서 `Destroy` 하면, 목록에는 파괴된 오브젝트가 남는다. C# 참조는 진짜 null 이 아니라 `== null` 만 참이 되고, 다음 프레임에 그 `transform` 을 건드리는 순간 예외다. 이 표본은 코어 드론과 화면 오브젝트를 나눠, 코어 목록에서 지울 때(`Despawned`) 오브젝트를 `Destroy` 하고 짝 사전에서도 뺀다. 다른 곳에서 적을 없앨 때도 오브젝트를 직접 `Destroy` 하지 말고 `swarm.Despawn` 을 부른다.

## 변형 예시
- 폭발하는 드론이 주변 드론에게 피해를 줘서, 한 드론의 Update 안에서 다른 드론이 빠지게 하고 싶다.
- 드론 오브젝트를 Destroy 하지 않고 오브젝트 풀에 돌려주고 다시 쓰고 싶다.
- 수백 대일 때 화면 밖 드론은 몇 프레임에 한 번만 업데이트하고 싶다.
- 드론 종류(보통, 분열, 방패)마다 다른 Update 를 인터페이스로 나누고 싶다.
- 슬로 모션 중에는 드론에 넘기는 dt 를 줄이고, 일시정지 중에는 Tick 을 멈추고 싶다.
