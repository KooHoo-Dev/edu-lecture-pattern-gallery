# 프로토타입 패턴: 견본 드론 복제 (Prototype Pattern: Cloning a Template Drone)

견본을 복제하되 참조 필드는 새로 만들어 복제본끼리 섞이지 않게 한다

패턴: 프로토타입 패턴. 난이도 2/3. 주제: 복제, 얕은 복사와 깊은 복사, 값과 참조, 프리팹.

## 파일
- `Core/Hangar.cs`
- `Core/ScoutDrone.cs`
- `Unity/DroneHangar.cs`
- `Unity/DroneView.cs`

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/prototype-drone-clone/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. 드론 모양을 만든다. 2D 프로젝트면 `GameObject > 2D Object > Sprites > Square`, Universal 3D 프로젝트면 `GameObject > 3D Object > Cube` 다 (Sprites 메뉴는 2D Sprite 패키지가 있어야 보인다). 이름을 `Drone` 으로 바꾸고 `DroneView` 를 붙인다.
3. HP 바: 빈 자식(`Create Empty`) `HpFill` 을 `Drone` 아래 Position (-0.5, 0.9, 0) 에 두고, 그 자식으로 같은 메뉴의 Square(또는 Cube)를 Position (0.5, 0, 0), Scale (1, 0.12, 1) 로 둔다. `DroneView` 의 `Hp Fill` 칸에 `HpFill` 을 넣는다 (왼쪽 끝을 기준으로 줄어든다). 모듈: 빈 자식 `Modules` 를 Position (0, -0.9, 0) 에 두고 `Module Root` 칸에 넣는다. 작은 Square(Scale 0.8, 0.25)를 하나 만들어 Project 창으로 끌어 프리팹으로 만들고 `Module Box Prefab` 칸에 넣은 뒤 장면의 것은 지운다.
4. Hierarchy 의 `Drone` 을 Project 창으로 끌어 프리팹으로 만든다. 장면의 `Drone` 은 이름을 `Template` 으로 바꿔 (-6, 0, 0) 에 둔다. 받침대 위 견본의 모습이다.
5. `GameObject > Create Empty` 로 `Hangar` 를 만들고 Scale 은 (1, 1, 1) 그대로 둔 채 `DroneHangar` 를 붙인다. 복제본의 뷰는 이 오브젝트 아래에 생겨, `Hangar` 를 지우면 함께 사라진다. 붙이는 순간 `Reset` 이 기본 키(C 복제, M 마지막 복제본에 냉각 모듈, D 첫 복제본에 피해, U 견본 개조)를 넣는다. `Template View` 에 장면의 `Template`, `Clone Prefab` 에 Project 창의 `Drone` 프리팹을 넣는다 (장면의 Template 을 넣지 않는다). 빈 오브젝트 `RunwayStart` 를 (-3, 0, 0) 에 두고 `Runway Start` 칸에 넣는다.
6. `Main Camera` 를 Position (1, 0, -10) 에 두고 Projection 을 `Orthographic`, Size 를 5 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). 견본과 활주로 여섯 자리(`Spacing` 2.1)가 모두 보인다.
7. Play 하고 C 세 번, M, D, C 를 눌러 본다. Console 에 `[Hangar] 복제 #1 …` 같은 줄이 남고, Hierarchy 의 `Hangar` 아래에 `Drone #1` … 이 생기며, Game 뷰 왼쪽 위에 복제 수와 `Modules 공유` 가 보인다.

## 확인
C 세 번 뒤 M 을 누르면 #3 아래에만 모듈 상자가 하나 늘고, D 는 #1 의 HP 바만 줄이며, 다시 C 로 나온 #4 는 견본처럼 카메라 상자 하나만 달고 나온다. 왼쪽 위 글은 `Modules 공유: 없음` 이다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `maxClones` | 활주로 자리 | 5대 |
| `damageAmount` | 피해량 | 40 |
| `upgradeSpeed` | 개조 속도 | 2 |

## 동작 단계
1. **견본을 한 번 다 설정해 둔다**: `DroneHangar` 가 Play 할 때 이름, HP, 속도, 모듈 목록(카메라)을 넣어 견본 `ScoutDrone` 을 한 번 만들고 `Hangar` 에 넘긴다. 복제본마다 `new ScoutDrone("정찰 드론", 100, 4f, modules)` 를 다시 쓰면, HP 와 속도 자리를 바꿔 `(…, 4, 100, …)` 로 써도 int 가 float 로 저절로 바뀌어 컴파일된다. 다 설정한 견본을 복제하면 인자를 다시 늘어놓을 일이 없다. 무대 왼쪽 받침대 위가 견본이고, 활주로 자리와 간격은 화면에만 있다 (코어 드론은 위치를 모른다).
2. **Clone 이 필드를 통째로 복사한다**: `Template.Clone()` 안의 `MemberwiseClone()` 이 필드를 한 번에 복사한다. `MaxHp`, `Hp`, `Speed` 같은 값 형식은 값 자체가 복사되어 복제본마다 따로다. `Name` 은 string 이라 주소가 복사되지만 바꿀 수 없어 함께 가리켜도 안전하다. `Modules` 는 목록의 주소만 복사되어, 이 줄에서 멈추면 견본과 같은 목록을 가리킨다. 효과 끄기가 여기서 멈춘 코드다. 공유가 위험한 것은 공유된 객체를 **고칠** 때(`Modules.Add`)다. 필드에 새 객체를 **대입**하면(`Name = …`, `Modules = new …`) 그 드론만 바뀐다. `Hangar` 가 복제 뒤 `Name = "#1"` 을 넣어도 견본 이름이 그대로인 까닭이다.
3. **참조 필드는 새 목록으로**: 바로 다음 줄 `copy.Modules = new List<string>(Modules)` 가 같은 내용의 새 목록을 만든다. 모든 필드가 아니라 복제본마다 따로 바뀌어야 하는 참조 필드만 새로 만든다. 무대에서 드론마다 자기 모듈 상자로 화살표가 따로 간다.
4. **복제본을 고쳐도 다른 드론은 그대로**: `#3` 에 단 냉각 모듈은 `#3` 의 목록에만 들어갔고, `#1`, `#2` 와 견본의 목록은 카메라 하나 그대로다. 곧 들어올 피해(3.3초)도 `#1` 의 `Hp` 만 깎고, 그 뒤 복제본 `#4`(4.3초)는 견본처럼 카메라만 달고 나온다. 견본을 개조하면 그 뒤에 나온 복제본만 빨라진다 (두 번째 시나리오).

## 주의할 점
- `Instantiate` 가 곧 엔진의 프로토타입이다. 프리팹은 아무도 고치지 않는 견본이고, `Instantiate` 는 넣은 오브젝트의 지금 상태(직렬화된 필드, 자식, 크기)를 통째로 복제한다. HP 를 뷰 컴포넌트에 들고 있으면 장면의 다친 드론을 복제했을 때 다친 채 나온다. 이 표본은 `OnCloned` 가 `Instantiate` 직후 `view.Show(drone)` 로 HP 바와 모듈 상자를 코어 값으로 다시 그려서, `Clone Prefab` 에 장면의 드론을 넣어도 드러나지 않는다. 그래도 `Clone Prefab` 에는 Project 창의 프리팹을 넣는다.
- `Instantiate` 는 Unity 가 직렬화하는 필드(`[SerializeField]`, public)를 복제하고, 직렬화된 `List` 는 새 목록으로 만든다. 직렬화되지 않는 필드(순수 C# 객체를 담은 private 필드 등)는 복제되지 않고 필드 초기값으로 시작한다. 그래서 이 표본은 코어 드론을 `ScoutDrone.Clone()` 으로 따로 복제하고 `Instantiate` 한 뷰와 짝짓는다.
- `Max Clones`, `Damage Amount`, `Upgrade Speed`, `Module Name` 은 Play 중에 바꿔도 `OnValidate` 가 코어에 넣는다 (`Module Name` 은 다음 장착부터). 견본의 이름, HP, 속도, 모듈은 Play 를 시작할 때 한 번만 읽는다. 견본을 한 번 설정해 두는 것이 이 패턴의 출발점이다.
- 컴포넌트가 꺼진 동안에는 `Hangar` 의 이벤트를 듣지 않는다. 그동안 다른 스크립트가 `Hangar` 로 복제하거나 피해를 주면, 다시 켤 때 `OnEnable` 이 `Clones` 를 돌며 빠진 뷰(없거나 파괴된 것)를 만들고 모두 코어 값으로 다시 그린다.
- 왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다.

## 흔한 실수
- **드론 한 대에 모듈을 달았더니 모든 드론과 견본에 붙었다**: `MemberwiseClone()` 은 얕은 복사다. int, float, struct 같은 값 형식은 변수(스택의 지역 변수나 객체 안의 칸)에 값이 직접 들어 있어 복사하면 값이 둘이 된다. List, 배열, 클래스 같은 참조 형식은 객체가 힙에 하나 있고 변수에는 그 주소만 들어 있어, 복사하면 같은 객체를 가리키는 주소가 둘이 된다. `Clone()` 에서 `MemberwiseClone()` 뒤에 `copy.Modules = new List<string>(Modules);` 처럼 참조 필드를 새로 만든다. 목록 안 원소도 클래스라면 원소까지 복제할지 따로 정한다. 필드를 더하면 `MemberwiseClone` 이 조용히 공유하므로 `Clone` 을 다시 본다.
- **`var copy = template;` 으로 복제했더니 견본까지 바뀐다**: 클래스 변수의 대입은 객체를 복사하지 않고 주소를 복사한다. `copy` 와 `template` 은 같은 드론이라 `copy.Hp -= 10` 이 견본의 HP 를 깎는다. 복제는 `Clone()` 을 거친다. struct 라면 대입이 값 복사지만, 그 안의 List 필드는 여전히 같은 목록을 가리킨다.
- **Play 를 끈 뒤에도 견본 에셋의 값이 바뀌어 있다**: `ScriptableObject` 견본을 런타임에 직접 고쳤다 (`template.speed += 2`). ScriptableObject 는 장면 오브젝트가 아니라 프로젝트 에셋이라, 에디터에서는 Play 를 꺼도 고친 값이 되돌아가지 않는다. 런타임에는 `Instantiate(template)` 로 사본을 만들어 고치거나, 에셋의 값을 읽어 순수 C# 객체에 복사해 쓴다.
- **새로 만든 드론이 이미 다친 채 나온다**: HP 를 뷰 컴포넌트의 필드(`[SerializeField] int hp`)에 들고 있는 드론을 장면에서 골라 `Instantiate` 했다. `Instantiate` 는 지금 상태를 그대로 복제하는 엔진의 프로토타입이라 줄어든 HP, 붙은 자식 오브젝트까지 따라온다. 복제 원본은 Project 창의 프리팹(아무도 고치지 않는 견본)으로 두고, 장면에서 쓰이는 오브젝트는 복제하지 않는다. 이 표본은 HP 를 코어 `ScoutDrone` 에 두고 `Instantiate` 직후 `view.Show(drone)` 로 코어 값으로 다시 그려서, 장면의 다친 드론을 넣어도 이 증상이 드러나지 않는다.
- **복제본이 엉뚱한 표적을 쫓거나 소속이 둘이 된다**: 깊은 복사를 지나치게 했다. 모든 참조 필드를 새로 만들면 함께 써야 할 것(소속 편대, 쫓는 표적, 공유 설정 데이터)까지 복제되어 복제본이 가짜 표적을 따라가거나 복제본마다 편대가 따로 생긴다. 복제본마다 따로 바뀌는 것(모듈 목록, 버프)만 새로 만들고, 가리키기만 하는 것은 주소를 그대로 둔다.

## 변형 예시
- 적 스포너가 다 설정한 견본 적을 복제해 웨이브를 만들고, 웨이브마다 견본만 강화하고 싶다.
- 인벤토리 아이템을 복제할 때 강화 목록은 따로 두고, 아이콘 같은 공유 데이터는 그대로 가리키게 하고 싶다.
- ScriptableObject 견본을 런타임에 고치지 않게, 시작할 때 사본을 만들어 쓰고 싶다.
- 레벨 에디터에서 선택한 오브젝트를 복제하되 고유 ID 는 새로 받게 하고 싶다.
