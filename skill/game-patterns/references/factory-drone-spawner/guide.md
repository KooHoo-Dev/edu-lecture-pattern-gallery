# 팩토리 메서드: 드론 스포너 (Factory Method: Drone Spawner)

무엇을 만들지는 스포너 자식이, 만드는 절차는 부모가 한 곳에서 정한다

패턴: 팩토리 메서드. 난이도 2/3. 주제: 생성, 템플릿 메서드, 상속과 훅, 확장, 프리팹.

## 파일
- `Core/Drones.cs`
- `Core/DroneSpawner.cs`
- `Core/Exit.cs`
- `Core/Radar.cs`
- `Core/TurretBattery.cs`
- `Core/WaveDirector.cs`
- `Unity/DroneView.cs`
- `Unity/WaveSpawnerInput.cs`

모두 프로젝트의 `Assets/Patterns/factory-drone-spawner/` 아래에 같은 하위 폴더로 복사한다.

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/factory-drone-spawner/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. 드론 모양을 만든다. 2D 프로젝트면 `GameObject > 2D Object > Sprites > Square`, Universal 3D 프로젝트면 `GameObject > 3D Object > Cube` 다 (Sprites 메뉴는 2D Sprite 패키지가 있어야 보인다). 이름을 `ScoutDrone` 으로 바꾸고 `DroneView` 를 붙인다. HP 바: Hierarchy 에서 `ScoutDrone` 우클릭 > `Create Empty` 로 자식을 만들어 이름을 `HpFill` 로 바꾸고 Position (-0.5, 0.9, 0) 에 둔다 (자식이라 부모 기준 로컬 좌표다). 다시 `HpFill` 우클릭 > `2D Object > Sprites > Square` (또는 `3D Object > Cube`) 로 그 자식을 만들어 Position (0.5, 0, 0), Scale (1, 0.12, 1) 로 둔다. `DroneView` 의 `Hp Fill` 칸에 `HpFill` 을 넣는다 (`Full Hp` 5 를 꽉 찬 값으로 왼쪽을 기준으로 줄어든다).
3. `ScoutDrone` 을 Scale (0.6, 0.6, 1) 로 두고 Project 창으로 끌어 프리팹으로 만든다. Hierarchy 에서 `Edit > Duplicate` 로 둘을 더 만들어 `HeavyDrone` 은 Scale (1, 1, 1), `ShieldDrone` 은 Scale (0.8, 0.8, 1) 로 바꾸고 각각 Project 창으로 끈다. 복제본은 이미 `ScoutDrone` 프리팹의 인스턴스라 Original Prefab 과 Prefab Variant 중 무엇을 만들지 묻는 창이 뜨는데, **Original Prefab** 을 고른다 (Variant 는 `ScoutDrone` 프리팹을 바꾸면 함께 바뀐다). 장면의 세 드론은 지운다.
4. `GameObject > Create Empty` 로 `WaveSpawner` 를 만들어 Position (0, 0, 0) 에 두고 `WaveSpawnerInput` 을 붙인다. 붙이는 순간 `Reset` 이 `Spawner Slots` 에 정찰, 중장갑, 방패 세 칸(키 Q, W, E)을 만들고 `Next Action` 에 R(섞인 순서 다음), `Volley Action` 에 X(포탑 일제 사격)를 넣는다. 세 칸의 `Prefab` 에 Project 창의 `ScoutDrone`, `HeavyDrone`, `ShieldDrone` 프리팹을 이 순서로 넣는다 (장면의 오브젝트가 아니다. 칸 순서가 코드의 스포너 목록 순서와 같아야 한다). 빈 오브젝트 `Exit` 를 Position (7, -2, 0) 에 두고 `Exit Point` 칸에 넣는다. 드론은 출구에서 왼쪽으로 `Slot Spacing` 1.5 간격으로 선다.
5. `Main Camera` 를 Position (0, 0, -10) 에 두고 Projection 을 `Orthographic`, Size 를 5 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). 출구 왼쪽의 아홉 자리(x 5.5 ~ -6.5)가 모두 보인다.
6. Play 하고 R 세 번, X 두 번, E, X 를 눌러 본다. Console 에 `[Wave] 섞인 순서 3번째: 2 % 3 → 방패` 같은 줄이 남고, Hierarchy 의 `WaveSpawner` 아래에 `Drone 방패 #3` 같은 오브젝트가 생겼다가 파괴되면 지워진다. Game 뷰 왼쪽 위에 레이더 수, 출구 앞 수, 섞인 순서의 다음 종류가 보인다.

## 확인
R 을 세 번 누르면 정찰, 중장갑, 방패가 차례로 나오고, 언제 E 를 섞어 눌러도 왼쪽 위의 레이더 수와 출구 앞 수가 같다. X 로 모두 파괴하면 마지막 드론이 사라지는 순간 Console 에 `[Wave] 웨이브 끝` 이 한 번 남는다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `heavyHp` | 중장갑 HP | 3 |
| `shieldHp` | 방패 HP | 2 |
| `volleyDamage` | 일제 사격 피해 | 1 |

## 동작 단계
1. **`next` 가 목록에서 스포너를 고른다**: `WaveDirector.SpawnNext` 는 `spawners[count % spawners.Count]` 로 다음 스포너를 고르고 그 `Spawn()` 을 부른다. 나누는 수가 목록의 길이라 방패 스포너를 목록에 넣는 순간 섞인 순서가 정찰 → 중장갑 → 방패 → 정찰 … 이 된다. 지휘자는 어느 스포너가 무엇을 만드는지 모른다. 무대 왼쪽 위 둘째 줄이 다음에 고를 스포너다.
2. **`Spawn` 이 자식의 `CreateDrone` 을 부른다**: 부모 `DroneSpawner.Spawn()` 의 첫 줄 `CreateDrone()` 은 추상 메서드라, 실제로는 자식(`ScoutSpawner`, `HeavySpawner`, `ShieldSpawner`)이 구현한 것이 불린다. 이것이 **팩토리 메서드**, 자식이 반드시 채우는 단계다. 무엇을(`new ShieldDrone(Hp)`) 만들지는 자식이 정하고, 자식은 이 한 줄 말고는 아무것도 하지 않는다. 방패를 더할 때 쓴 것도 `ShieldSpawner` 클래스, 스포너 목록 한 칸, Unity Inspector 의 프리팹 한 칸뿐이다 (어댑터는 목록을 반복문으로 돌며 구독해 고칠 곳이 없다).
3. **배치, 레이더 등록, 알림은 부모 `Spawn` 이 한 곳에서**: `Spawn()` 은 **템플릿 메서드**다. 만들기 → 출구 앞 자리에 배치 → 레이더 등록 → `Spawned` 알림 순서가 부모에 한 번만 적혀 있고, `virtual` 이 아니어서 자식이 바꿀 수 없다. 그래서 어느 자식의 드론이든 빠짐없이 레이더에 잡힌다. 알림 바로 앞의 `OnSpawned` 는 빈 본문이 있는 선택 단계, 곧 **훅**이라 자식이 필요할 때만 덮는다 (`CreateDrone` 은 덮지 않으면 컴파일이 안 되는 추상 단계). Unity 어댑터는 `Spawned` 를 받아 같은 번호 칸의 프리팹을 `Instantiate` 한다. 출구 앞 자리 간격은 화면에만 있고 코어는 자리 번호만 안다.
4. **레이더가 파괴를 세어 웨이브 끝을 판정한다**: `Radar.Register` 는 드론의 `Destroyed` 를 구독한다. 일제 사격은 레이더가 아니라 출구 앞의 모든 드론을 쏘고, 파괴된 드론은 레이더에서 해제된다. 레이더가 아는 드론이 0 이 되는 순간 `WaveCleared` 가 한 번 불린다. 모든 드론이 같은 `Spawn` 으로 등록되었으니 레이더 수와 출구 앞의 수가 늘 같다 (왼쪽 위 첫 줄).

## 주의할 점
- `DroneSpawner.Spawn` 에는 `virtual` 이 없어 자식이 `override` 할 수 없다. 자식이 같은 이름의 `Spawn` 을 쓰면 상속한 멤버를 숨긴다는 경고(CS0108)가 나고, `DroneSpawner` 로 부르는 `WaveDirector` 에서는 부모의 절차가 그대로 돈다. 경고를 지우려고 `new` 를 붙이지 말고 훅을 하나 더 둔다.
- `Spawner Slots` 의 `Prefab` 이 비었거나 칸이 모자라면 코어 드론은 만들어지고 레이더에도 등록되지만 화면에는 없다. 이 표본은 그때 Console 에 `[Wave] Spawner Slots 의 0번 칸(정찰)이 없거나 Prefab 이 비어 …` 경고를 남긴다. 종류를 더했으면 `Director` 의 스포너 목록에 한 칸, 이 목록에 같은 순서로 한 칸을 더한다. 순서가 어긋나면 다른 종류의 프리팹이 나온다.
- 왼쪽 위 상태 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 띄운다. 글은 `OnEnable` 과 레이더 이벤트에서 바로 다시 만든다.
- `Heavy Hp`, `Shield Hp`, `Volley Damage` 는 Play 중에 바꿔도 `OnValidate` 가 코어에 넣는다. HP 는 다음에 만드는 드론부터이고 이미 나온 드론은 그대로다. `Exit Point` 와 `Slot Spacing` 은 화면에만 쓰여 다음에 나오는 드론의 위치부터 바뀐다.
- HP 바는 `DroneView` 의 `Full Hp`(5) 를 꽉 찬 값으로 쓴다. 드론마다 MaxHp 로 나누면 HP 1 정찰과 HP 3 중장갑의 바가 같은 길이로 보인다.
- `InputAction` 은 `OnEnable` 에서 콜백을 붙이고 `Enable`, `OnDisable` 에서 떼고 `Disable` 한다. 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 두 대가 나온다. 코드에서 만드는 액션은 `InputActionType.Button` 으로 만든다. 스포너와 칸별 키는 반복문이 람다로 붙이므로, 붙인 람다를 목록에 저장해 `OnDisable` 에서 그대로 뗀다 (`-=` 에 람다를 새로 쓰면 다른 델리게이트라 떼어지지 않는다).

## 흔한 실수
- **방패 드론을 더했는데 섞인 웨이브에는 안 나온다**: 종류 수를 숫자로 박았다. `types[count % 2]` 나 `Random.Range(0, 2)` 는 종류가 둘이던 때의 코드다. int 판 `Random.Range(min, max)` 는 max 를 **포함하지 않아** 0, 1 만 나온다. 배열에 `"shield"` 를 넣어도 2 번 칸은 고르지 않는다. 나누는 수와 범위를 목록의 길이로 쓴다: `spawners[count % spawners.Count]`, `Random.Range(0, spawners.Count)`.
- **새로 더한 종류만 레이더에 안 잡혀 웨이브가 일찍 끝난다**: `if (type == ...)` 분기마다 배치, 레이더 등록, 알림 줄을 복붙했고, 새 분기를 만들며 한 줄을 빠뜨렸다. 컴파일도 되고 드론도 화면에 나와서 웨이브 끝에서야 드러난다. 절차는 부모 `Spawn()` 에 한 번만 쓰고 자식은 `CreateDrone()` 만 구현하면, 새 종류가 등록을 빠뜨릴 자리가 없다. Unity 어댑터도 같다: 스포너마다 프리팹 칸·핸들러·`+=` 줄을 따로 두면 거기서 한 줄이 또 빠진다. (스포너, 프리팹) 쌍 목록을 반복문으로 구독한다.
- **MonoBehaviour 인 `DroneView` 를 `new` 했더니 경고가 나고 화면에 없다**: `new DroneView()` 처럼 MonoBehaviour 를 `new` 로 만들었다. Unity 는 "MonoBehaviour 를 new 로 만들 수 없다" 는 경고를 남기고, 그 객체는 어느 GameObject 에도 붙지 않아 화면에 없고 `Update` 도 돌지 않는다. 게다가 그 객체는 `== null` 이 참이라 null 검사 분기가 조용히 건너뛰어진다. 화면에 나올 것은 프리팹을 `Instantiate` 한다. 이 표본은 드론의 규칙(HP, 파괴)을 MonoBehaviour 가 아닌 순수 C# `Drone` 에 두어 `new ScoutDrone()` 이 맞고, 화면은 `WaveSpawnerInput` 이 그 칸의 `DroneView` 프리팹을 `Instantiate` 해 짝짓는다.
- **자식 스포너 하나만 알림이나 등록이 빠진다**: 부모의 `Spawn` 을 `virtual` 로 열어 두었고, 자식이 `override` 해서 절차를 처음부터 다시 썼다. 그러면 팩토리 메서드를 쓴 의미가 없다. `Spawn` 은 `virtual` 을 붙이지 않는다 (C# 메서드는 기본이 virtual 이 아니다). 종류마다 다른 일이 더 필요하면 부모가 정한 자리에서 부르는 훅을 덮는다. 이 표본의 `DroneSpawner` 에 빈 본문의 `protected virtual void OnSpawned(Drone drone) { }` 가 있다.
- **웨이브를 다시 시작해도 지난 드론이 남는다**: 스포너가 `Instantiate` 한 것을 어디에도 기록하지 않아, 살아 있는 드론을 아는 곳이 없다. 등록을 만드는 절차 안에 두면 빠지는 드론이 없다. 이 표본은 `Spawn` 이 모든 드론을 출구 목록과 레이더에 등록하고, 등록한 쪽이 파괴를 구독해 목록에서 뺀다. 화면 쪽은 `DroneView` 가 코어 드론이 파괴되면 자기 오브젝트를 지우고, `WaveSpawnerInput` 이 뷰를 `WaveSpawnerInput` 오브젝트 아래에 만들어 그 오브젝트를 지우면 함께 사라진다.

## 변형 예시
- 자폭 드론 종류를 하나 더하고, 섞인 순서에도 저절로 들어가게 하고 싶다.
- 스포너마다 출구를 따로 두고, 웨이브 표(ScriptableObject)에서 어느 스포너를 몇 번 부를지 정하고 싶다.
- 드론 대신 아이템 상자를 같은 구조로 만들어, 상자 종류마다 다른 보상이 나오게 하고 싶다.
- 만든 드론을 지우지 않고 오브젝트 풀에 돌려주게 CreateDrone 을 바꾸고 싶다.
