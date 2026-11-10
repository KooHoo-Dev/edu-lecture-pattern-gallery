# 메멘토 패턴: 체크포인트 저장과 되살리기 (Memento Pattern: Checkpoint Save and Respawn)

저장할 때 상태를 값으로 떠서 메멘토에 담고, 되살릴 때 그 값으로 덮는다

패턴: 메멘토 패턴. 난이도 2/3. 주제: 체크포인트, 저장과 되살리기, 값과 참조, 캡슐화.

## 파일
- `Core/Checkpoint.cs`
- `Core/Explorer.cs`
- `Core/ExplorerMemento.cs`
- `Unity/CheckpointInput.cs`

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/memento-checkpoint/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. 하린을 만든다. 2D 프로젝트면 `GameObject > 2D Object > Sprites > Capsule`, Universal 3D 프로젝트면 `GameObject > 3D Object > Capsule` 이다 (Sprites 메뉴는 2D Sprite 패키지가 있어야 보인다). 이름을 `Harin` 으로 바꾼다. 같은 메뉴의 Square(3D 는 Cube)로 `Flag` 를 만들어 Scale 을 (0.3, 1.2, 1) 로 한다.
3. `GameObject > Create Empty` 로 `FirstCell` 을 만들어 Position (-6, -1, 0) 에 둔다. 칸 0 의 자리다.
4. `GameObject > Create Empty` 로 `Checkpoint` 를 만들고 `CheckpointInput` 을 붙인다. 붙이는 순간 `Reset` 이 기본 키(Q 저장, W 회로 조각 줍기, E 피해, R 되살리기, T 한 칸 이동)를 넣는다. `Explorer View` 칸에 `Harin`, `Checkpoint Flag` 칸에 `Flag`, `First Cell` 칸에 `FirstCell` 을 넣는다. 깃발은 저장하기 전에는 꺼진다.
5. `Main Camera` 를 Position (0, 0, -10) 에 두고 Projection 을 `Orthographic`, Size 를 5 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). 칸 0~8(`Cell Size` 1.5, x -6~6)이 모두 보인다.
6. Play 하고 W, Q, T, W, T, W, E, E, R 을 차례로 눌러 본다. Console 에 `[Checkpoint] 저장 · HP 100 칸 1 …` 같은 줄이 남고, Game 뷰 왼쪽 위에 지금 상태와 저장본이 두 줄로 보인다.

## 확인
W, Q 뒤 T 와 W 를 두 번씩 누르면 왼쪽 위 지금 인벤토리는 3개, 저장본은 1개다. E 두 번에 하린이 옆으로 눕고, R 을 누르면 깃발 칸에 선 채 HP 100, 크레딧 20, 인벤토리 1개로 돌아온다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `fragmentValue` | 조각 값 | 20크레딧 |
| `hurtDamage` | 피해량 | 50 |
| `maxHp` | 최대 HP | 100 |

## 동작 단계
1. **저장할 때 원래 객체가 자기 상태를 값으로 떠 메멘토를 만든다**: Q(저장)를 누르면 `CheckpointInput` 이 `Checkpoint.Save()` 를 부르고, 관리자는 `explorer.CreateMemento()` 에 뜨는 일을 맡긴다. `Explorer` 는 HP, 칸, 크레딧(모두 int 값)과 인벤토리를 `ExplorerMemento` 생성자에 넘기고, 생성자는 인벤토리를 **새 목록에 복사해 읽기 전용으로** 감싼다. 무대 오른쪽 위 `저장본` 상자에 값이 채워지고, 인벤토리 상자도 따로 생긴다. 깃발은 저장한 칸에 선다 (칸 사이 거리는 화면에만 있다).
2. **관리자는 메멘토를 들고만 있다**: `Checkpoint` 는 받은 메멘토를 `Memento` 칸 하나에 넣을 뿐, HP 가 몇인지 인벤토리에 무엇이 있는지 읽지 않는다. 그래서 저장할 상태(예: 산소 캔 수)가 늘어도 `Explorer` 와 메멘토만 고치면 된다. 메멘토의 속성은 `get` 만 있고 인벤토리는 `IReadOnlyList` 라, 화면 코드가 저장본을 읽을 수는 있어도 고칠 수는 없다. 저장 칸이 하나라 다시 저장하면 앞 저장본은 덮인다.
3. **되살릴 때 원래 객체가 메멘토의 값으로 자기를 덮는다**: R(되살리기)은 `Checkpoint.Respawn()` 이 `explorer.Restore(memento)` 를 부른다. `Explorer` 가 HP, 칸, 크레딧을 덮고, 인벤토리는 목록을 바꿔 끼우지 않고 `Clear` 뒤 메멘토의 복사본으로 다시 채운다. 모든 값을 덮은 뒤 `Restored` 를 알려 화면이 새 값을 그린다. 하린이 깃발 칸으로 돌아오고 `지금 상태` 상자의 숫자가 `저장본` 과 같아진다.
4. **저장 뒤 바뀐 것은 메멘토에 닿지 않는다**: 저장 뒤에 주운 조각은 `Explorer` 의 목록에만 들어간다 (무대의 초록 칸). 메멘토의 인벤토리는 저장할 때 따로 복사한 목록이라 그대로다. 되살린 뒤에도 메멘토는 바뀌지 않아, 다시 줍고 쓰러져도 같은 저장본으로 몇 번이든 되살린다 (두 번째 시나리오).

## 주의할 점
- `Fragment Value` 와 `Hurt Damage` 는 키를 누를 때마다 필드에서 읽어 Play 중에 바꾸면 다음 입력부터 쓴다. `Max Hp` 와 `Start Cell` 은 코어를 처음 만들 때 한 번만 읽어, 바꾸려면 Play 를 다시 시작한다.
- 메멘토를 파일로 남기려면 `JsonUtility.ToJson` 을 쓸 수 있다. 무엇이 담기는지는 매뉴얼의 Serialization rules 를 따른다: public 이거나 `[SerializeField]` 인 필드가 담기고, readonly 필드와 `get` 만 있는 자동 속성(의 숨은 필드)은 담기지 않는다. 그래서 이 표본의 `ExplorerMemento`(`get` 만 있는 속성과 `IReadOnlyList`)를 그대로 넣으면 값이 담기지 않는다. `[Serializable]` 클래스에 `[SerializeField] int hp;` 와 `public int Hp => hp;` 처럼 두면 바깥에는 읽기 전용이면서 `JsonUtility` 가 담는다 (목록은 `[SerializeField] List<string> items;`). public 필드로 열 필요는 없다. `FromJson` 은 private 필드도 채우므로, 고칠 수 없다는 약속은 코드 관례로 지킨다. 이 표본에는 파일 저장 코드가 없다.
- C# 에서 메멘토의 속을 관리자에게도 완전히 숨기려면 메멘토를 `Explorer` 안의 중첩 클래스로 두고 바깥에는 빈 표지 인터페이스(`IExplorerMemento`)로만 건넨다. 이 표본은 화면이 저장본을 읽어 보여 주려고 읽기 전용 속성으로 열어 두었다.
- `ExplorerMemento` 의 생성자는 `internal` 이지만, Assets 아래 스크립트는 어셈블리 정의(asmdef)가 없으면 한 어셈블리(Assembly-CSharp)로 컴파일되어 다른 폴더에서도 부를 수 있다. 막으려면 `Core/` 에 asmdef 를 둔다. 속성이 `get` 만 있어 고칠 수 없다는 것은 asmdef 없이도 지켜진다.
- 컴포넌트가 꺼진 동안에는 `Explorer` 와 `Checkpoint` 의 이벤트를 듣지 않는다. 그동안 다른 스크립트가 저장하거나 되살렸다면, 다시 켤 때 `OnEnable` 이 하린의 위치·자세, 깃발, 왼쪽 위 글을 지금 코어 값으로 다시 맞춘다.
- 왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다.

## 흔한 실수
- **체크포인트에서 되살렸는데 인벤토리는 쓰러지기 직전 그대로다**: 저장할 때 `saved.items = player.items;` 로 목록을 참조째 담았다. int 는 값이 복사되지만 `List` 는 주소만 복사되어, 저장본과 지금 상태가 같은 목록 하나를 쓴다. 저장 뒤 주운 것은 저장본에도 들어가고, 되살리며 `player.items = saved.items;` 를 해도 같은 목록이다. 메멘토를 만들 때 `new List<string>(items)` 처럼 새 목록에 복사하고, 되살릴 때는 `items.Clear(); items.AddRange(memento.Items);` 로 내용을 덮는다. 목록 안 원소가 클래스(강화 수치를 가진 아이템)라면 원소도 값으로 떠야 한다.
- **저장본의 값이 저장한 적 없는 값으로 바뀌어 있다**: 저장본이 public 필드(`saved.credits`)라 UI 나 다른 스크립트가 미리보기를 고치다 저장본 자체를 바꿨다. 메멘토는 만든 뒤 바뀌지 않아야 한다. 속성을 `get` 만 두고 생성자에서만 채우고, 목록은 `IReadOnlyList` 로 감싼 복사본을 내준다 (이 표본의 `ExplorerMemento`). 관리자(`Checkpoint`)는 메멘토를 들고만 있고 속을 읽거나 고치지 않는다.
- **되살렸더니 저장본이 가리키던 오브젝트가 사라졌거나 지금 것과 같다**: 메멘토에 장면 오브젝트의 참조(`Transform`, 손에 든 무기 `GameObject`)를 담았다. 참조는 지금 그 오브젝트를 가리킬 뿐이라 저장 뒤 움직이면 저장본도 함께 바뀐 셈이고, 오브젝트가 파괴되면 Unity 의 `==` 비교로 null 이 된다. 되살리는 데 필요한 것만 값(위치 좌표, 아이템 이름이나 ID)으로 담고, 오브젝트는 되살릴 때 그 값으로 찾거나 다시 만든다.
- **되살렸는데 화면의 HP 와 위치가 쓰러질 때 그대로다**: `Restore` 가 값만 덮고 이벤트를 내지 않아, 이벤트로 그리는 HP 바와 위치가 옛 값을 보인다. `Restore` 끝에서 모든 값을 덮은 뒤 `Restored` 를 알리고, 화면은 그 핸들러에서 다시 그린다. 값 하나를 덮을 때마다 알리면 핸들러가 반쯤 덮인 상태를 읽는다.
- **되살렸더니 다시 쓰러지기 직전으로 돌아간다**: 저장 칸이 하나인데 아무 때나(쓰러진 뒤, HP 가 거의 없을 때) 저장해 쓸 만한 저장본을 덮어썼다. 이 표본은 쓰러져 있으면 `Save` 가 받지 않고 `SaveRefused` 로 알린다. 체크포인트에서만 저장하거나, 저장 칸을 둘 이상(`List<ExplorerMemento>`) 두어 앞 저장본으로 돌아갈 길을 남긴다.

## 변형 예시
- 체크포인트를 파일로도 남겨 게임을 껐다 켜도 이어 하고 싶다 (메멘토 값을 `[Serializable]` 클래스의 public 필드로 옮기거나, `[SerializeField]` private 필드에 `get` 만 있는 속성을 붙여 읽기 전용으로 둔 채 `JsonUtility.ToJson`).
- 저장 칸을 세 개 두고 플레이어가 고른 칸에서 되살리고 싶다.
- 퍼즐 방에 들어갈 때 상자와 스위치의 상태를 떠 두었다가 "방 다시 시작" 으로 되돌리고 싶다.
- 강화 수치가 있는 아이템(클래스)을 인벤토리에 두면서도 저장본이 지금 아이템과 섞이지 않게 하고 싶다.
