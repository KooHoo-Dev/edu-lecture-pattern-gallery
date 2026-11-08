# 플라이웨이트: 드론 종류 데이터 공유 (Flyweight: Shared Drone Type Data)

종류마다 같은 값은 한 객체를 모든 드론이 함께 쓰고, 드론마다 다른 값은 드론이 든다

패턴: 플라이웨이트. 난이도 2/3. 주제: 플라이웨이트, 타입 객체, ScriptableObject, 공유 데이터, 내재·외재 상태.

## 파일
- `Core/Drone.cs`
- `Core/DroneType.cs`
- `Core/Squad.cs`
- `Unity/DroneTypeAsset.cs`
- `Unity/DroneView.cs`
- `Unity/SquadInput.cs`

모두 프로젝트의 `Assets/Patterns/flyweight-drone-types/` 아래에 같은 하위 폴더로 복사한다.

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/flyweight-drone-types/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. Project 창에서 `Create > Pattern Gallery > Drone Type` 으로 에셋 둘을 만든다. `Scout` 은 Type Name `정찰형`, Code `S`, Max Hp 4, Speed 2, `Heavy` 는 Type Name `중장갑`, Code `H`, Max Hp 8, Speed 1. Color 는 서로 다르게 둔다. 지금 HP 칸은 없다.
3. 드론 모양을 만든다. 2D 프로젝트면 `GameObject > 2D Object > Sprites > Square`, Universal 3D 프로젝트면 `GameObject > 3D Object > Cube` 다 (Sprites 메뉴는 2D Sprite 패키지가 있어야 보인다). 이름을 `Drone` 으로 바꾸고 `DroneView` 를 붙인다. 그 Square(또는 Cube)의 Renderer 가 `Body` 칸에 저절로 들어가지 않으면 끌어 넣는다.
4. HP 막대: 빈 자식(`Create Empty`) `HpFill` 을 `Drone` 아래 Position (-0.5, 0.9, 0) 에 두고, 그 자식으로 같은 메뉴의 Square(또는 Cube)를 Position (0.5, 0, 0), Scale (1, 0.15, 1) 로 둔다. 같은 방법으로 `HpMax` 를 Position (-0.5, 0.9, 0.01) 에 만들고 자식을 어두운 회색으로 한다 (Square 는 SpriteRenderer 의 Color, Cube 는 어두운 Material). z 가 조금 뒤라 3D 에서는 `HpFill` 뒤에 그려진다. 2D 템플릿은 Custom Axis 정렬이라 z 가 효과가 없으니, Square 면 `HpFill` 자식 SpriteRenderer 의 `Order in Layer` 를 1 로(`HpMax` 는 0 그대로) 둔다. `DroneView` 의 `Hp Fill`, `Hp Max` 칸에 넣는다 (왼쪽 끝을 기준으로 줄어든다). `Drone` 을 Project 창으로 끌어 프리팹으로 만들고 장면의 것은 지운다.
5. `GameObject > Create Empty` 로 `Squad` 를 만들어 Position (-7, -1, 0) 에 두고 `SquadInput` 을 붙인다. 붙이는 순간 `Reset` 이 기본 키(Q 정찰형에 피해, W 중장갑에 피해, E 정찰형 하나 더, R 밸런스 수정)를 넣는다. `Scout Type`, `Heavy Type` 에 두 에셋을, `Drone Prefab` 에 Project 창의 `Drone` 프리팹을 넣는다 (비어 있으면 Console 에 오류가 남고 드론이 화면에 나오지 않는다). 드론은 이 오브젝트 아래, 오른쪽으로 1.75 씩 떨어진 자리(9칸)에 생긴다. 중장갑이 먼저 왼쪽 두 자리에 나오고 정찰형이 그 오른쪽에 나온다.
6. `Main Camera` 를 Position (0, 0, -10) 에 두고 Projection 을 `Orthographic`, Size 를 5 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). 16:9 Game 뷰에서 x -7 ~ 7 의 아홉 자리가 모두 보인다.
7. Play 하고 Q, W, Q, E, R 을 눌러 본다. Console 에 `[Squad] S1 피해 1 → HP 3/4` 같은 줄이 남고, Game 뷰 왼쪽 위에 `종류 데이터 2개 · 드론 6대` 가 보인다. Play 를 끈 뒤 `Scout` 에셋의 Max Hp 가 4 그대로인지 본다.

## 확인
Q 로 S1 을 때리면 S1 의 HP 막대만 줄고 S2, S3 은 그대로이며, R 을 누르면 모든 정찰형의 어두운 최대 HP 막대(`HpMax`)가 함께 늘고 지금 HP 막대는 그대로다. Play 를 끈 뒤 `Scout` 에셋의 Max Hp 는 4 그대로다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `damage` | 피해량 | 1 |
| `patchHp` | 밸런스 수정 HP | 2 |
| `scoutCount` | 처음 정찰형 수 | 3대 |

## 동작 단계
1. **종류마다 데이터 객체를 하나만 만든다**: `SquadInput` 이 Play 할 때 정찰형·중장갑 에셋(`DroneTypeAsset`)을 한 번씩 읽어 `DroneType` 을 하나씩 만들고, `Squad` 의 종류 사전에 넣는다. 위쪽 상자 둘이 그 객체다. 드론이 몇 대든 종류 데이터는 2개다 (왼쪽 위 글). 에셋은 읽기만 하고 고치지 않는다.
2. **드론은 종류를 가리키고 지금 HP·위치만 든다**: `Squad.Spawn` 은 사전의 그 객체를 `new Drone(type, …)` 에 넘긴다. `Drone` 은 `Type` 참조와 자기 `Hp`, `X` 만 든다. 정찰형·중장갑을 하위 클래스로 나누지 않고 종류를 이 데이터 객체로 둔 것이 타입 객체이고(새 종류는 에셋 하나), 그 객체를 같은 종류의 드론이 한 벌만 함께 쓰는 것이 플라이웨이트다. 무대에서 드론마다 자기 종류 상자로 가는 종류 색 화살표가 그 참조다. 화살표가 상자 하나로 모인다는 것이 "함께 쓴다" 는 뜻이다. 최대 HP, 속도, 색은 드론에 없고 `Type` 에서 읽는다.
3. **피해는 드론의 지금 HP 만 바꾼다**: `Squad.HitFirst` 가 그 종류의 첫 드론을 찾아 `TakeDamage` 를 부르고, `Drone.Hp` 만 준다. 종류 객체는 건드리지 않아 같은 종류의 다른 드론은 그대로다. HP 0 이 된 드론은 목록에서 빼고 `Destroyed` 로 알린다. 효과 끄기는 이 값이 종류 에셋에 있어 한 대를 때리면 같은 종류가 모두 깎인다.
4. **밸런스 수정은 종류 객체 하나를 고친다**: `Squad.Patch` 는 정찰형 `DroneType` 하나의 `RaiseMaxHp` 를 부른다. 새 종류 객체로 바꾸면 드론마다 참조를 다시 넣어야 해서, 공유가 유지되는 이 방법을 골랐다. 고치는 것은 `ToDroneType()` 이 Play 때 만든 런타임 객체라 에셋은 그대로다. 내재 상태는 원래 읽기 전용이고, 이 메서드만 종류 전체에 일부러 반영하는 수정이다. 모든 정찰형이 그 객체를 가리키므로 HP 막대의 밝은 테두리(최대 HP)가 정찰형 모두에서 함께 늘고 지금 HP 는 그대로다. 곧 올 밸런스 수정(4.40초)에서 본다.

## 주의할 점
- `ScriptableObject` 에셋은 Play 중에 고치면 Play 를 끈 뒤에도 남는다 (빌드는 새 실행이면 처음 값이지만 한 실행 안에서는 씬을 다시 불러도 남는다). 그래서 `DroneTypeAsset` 에는 런타임 값을 두지 않고, `SquadInput` 이 Play 할 때 `ToDroneType()` 으로 순수 C# `DroneType` 을 만들어 밸런스 수정도 그 객체에만 한다. 에셋째 고쳐야 하면 `Instantiate(asset)` 로 사본을 만들어 고치되, 종류마다 한 번만 만든다. 머티리얼도 같다: `DroneView.Bind` 의 `body.material` 은 드론마다 사본을 만들어 괜찮지만, `sharedMaterial` 을 고치면 그 머티리얼을 쓰는 모든 드론과 머티리얼 에셋이 바뀐다 (이 표본의 나쁜 예와 같은 공유 에셋 변경).
- `Scout Count` 와 두 에셋의 값은 Play 를 시작할 때 한 번만 읽는다. `Damage`, `Patch Hp` 는 Play 중에 바꿔도 `OnValidate` 가 코어에 넣어 다음 입력부터 쓴다. Play 중에 에셋의 Max Hp 를 Inspector 에서 바꿔도 이미 만든 `DroneType` 에는 들어가지 않는다 (R 로 바꾼다).
- HP 막대는 `Bar Full Hp`(기본 10)를 꽉 찬 값으로 그린다. 종류마다 최대 HP 로 나누면 중장갑과 정찰형의 막대가 같은 길이로 보이고, 밸런스 수정 뒤에도 막대가 그대로라 반영이 안 보인다. 최대 HP 가 이 값을 넘으면 막대가 꽉 찬 채로 보인다.
- 밸런스 수정 이벤트(`TypePatched`)는 종류 하나만 알린다. 코어 값은 공유라 바로 바뀌지만, 화면의 막대(Transform 크기)는 그렸을 때 그대로라 `SquadInput.OnTypePatched` 가 그 종류를 가리키는 드론 뷰를 모두 다시 그린다. 이것을 빼면 다음 피해 때 맞은 드론의 최대 HP 막대만 늘어난다.
- 왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. 실제 게임은 UGUI 나 TextMeshPro 로 만든다.
- `InputAction` 은 `OnEnable` 에서 콜백을 붙이고 `Enable`, `OnDisable` 에서 떼고 `Disable` 한다. 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 두 번 맞는다.

## 흔한 실수
- **드론 한 대를 때렸는데 같은 종류가 모두 같이 깎인다**: 지금 HP 를 종류 데이터(`ScriptableObject` 에셋)에 두었다. 에셋은 프로젝트에 하나뿐이고 그 종류의 드론이 모두 같은 에셋을 가리키므로, 지금 HP 도 하나를 함께 쓴다. 종류마다 같은 값(최대 HP, 속도, 색)만 종류 데이터에 두고, 드론마다 다른 값(지금 HP, 위치, 표적)은 드론 쪽(`Drone` 객체나 드론의 컴포넌트 필드)에 둔다. 새로 나온 드론이 다친 채 나오는 것도 같은 원인이다.
- **Play 를 끈 뒤에도 에셋의 값이 바뀌어 있다**: `ScriptableObject` 는 장면 오브젝트가 아니라 프로젝트 에셋이라, 에디터에서 Play 중에 고친 값은 Play 를 꺼도 되돌아가지 않고 저장될 수 있다 (빌드는 새 실행이면 처음 값이지만, 한 실행 안에서는 씬을 다시 불러도 에셋이 메모리에 있는 동안 값이 남는다). 다음 Play 가 다친 드론이나 바뀐 밸런스로 시작한다. 에셋은 읽기만 하고, 런타임에 바뀌는 값은 이 표본처럼 순수 C# 객체(`DroneType`, `Drone`)에 옮겨 쓴다. 에셋째 고쳐야 하면 `Instantiate(asset)` 로 사본을 만들어 고친다.
- **밸런스 수정이 이미 나와 있는 드론에 안 먹는다**: 드론을 만들 때 종류 데이터를 드론마다 복사했다 (`maxHp = type.maxHp;` 로 필드에 옮겨 두거나 `new DroneType(...)` 을 드론마다). 복사한 값은 원본을 고쳐도 따라오지 않는다. 종류 데이터는 복사하지 말고 참조로 들고(`drone.Type.MaxHp`), 수정은 그 객체 하나에 한다. 이 표본의 `Squad.Spawn` 은 사전에 없는 종류 객체를 받으면 예외를 던져 복사본이 섞이지 않게 막는다.
- **드론마다 `Instantiate(asset)` 했더니 공유가 깨졌다**: Play 뒤 에셋이 바뀌는 문제를 피하려고 드론이 나올 때마다 `Instantiate(typeAsset)` 로 사본을 만들면, 종류 데이터가 드론 수만큼 생겨 메모리도 늘고 밸런스 수정도 한 대에만 들어간다. 사본이 필요하면 종류마다 한 번만 만들어 그 종류의 드론이 함께 쓴다. 이 표본은 `SquadInput` 이 에셋마다 `ToDroneType()` 을 한 번 불러 만든 객체를 모든 드론에 넘긴다.
- **종류 데이터가 드론 목록을 들고 있다가 꼬인다**: "이 종류의 드론" 을 찾으려고 종류 데이터에 드론 목록이나 드론 참조를 넣으면, 오래 사는 공유 객체(에셋인 `ScriptableObject`)가 개체 참조를 붙잡아, 씬이 바뀐 뒤에도 파괴된 드론을 가리키고 그 메모리를 붙든다. 종류 데이터는 드론을 모르게 두고, 모아 보는 일은 드론 목록을 가진 쪽(`Squad.CountOf`)이 한다.

## 변형 예시
- 무기 종류(사거리, 연사 속도, 탄 프리팹)를 ScriptableObject 로 나누고, 탄약 수는 무기마다 따로 두고 싶다.
- 아이템 종류(이름, 아이콘, 설명)는 공유하고, 개수와 강화 단계는 인벤토리 칸마다 두고 싶다.
- 난이도에 따라 적 종류의 최대 HP 를 한꺼번에 올리되, 에셋은 고치지 않고 싶다.
- 타일 지형 종류(이동 비용, 색)를 공유하고 칸마다 점령 상태만 두는 격자 맵을 만들고 싶다.
