# 더티 플래그: 장비 무게 다시 계산 (Dirty Flag: Loadout Weight)

비싼 합계는 바뀌었을 때만 다시 계산하고, 값을 바꾸는 모든 길이 다시 계산 표시를 켜게 한 곳에 모은다

패턴: 더티 플래그. 난이도 2/3. 주제: 캐시, 캡슐화, 지연 계산, 성능.

## 파일
- `Core/Items.cs`
- `Core/Loadout.cs`
- `Unity/HarinMover.cs`
- `Unity/LoadoutInput.cs`

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/dirty-flag-loadout/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. 하린을 만든다. Universal 3D 템플릿은 `GameObject > 3D Object > Capsule`, 2D 템플릿은 `GameObject > 2D Object > Sprites > Capsule` (2D Sprite 패키지, 2D 템플릿에 들어 있다). 이름을 Harin, Position 을 (0, 0, 0) 으로 둔다. 기본 카메라(2D 템플릿은 Orthographic Size 5, Universal 3D 는 (0, 1, -10) 원근)에 x -6 ~ 6 이 모두 보인다.
3. Harin 에 `LoadoutInput` 을 붙인다. 붙이는 순간 `Reset` 이 기본 키(Q 냉각 셀 줍기, W 마지막 칸 버리기, E 수리 키트 쓰기, R 산소 캔 합금)를 넣는다.
4. 같은 Harin 에 `HarinMover` 를 붙인다. `Reset` 이 같은 오브젝트의 `LoadoutInput` 을 `Loadout Input` 칸에 넣는다. `[RequireComponent]` 라 `LoadoutInput` 이 없으면 함께 붙지만, 위 순서대로 먼저 붙여 두는 편이 확실하다 (칸이 비어 있으면 Harin 의 `LoadoutInput` 을 끌어 넣는다). Left X -6, Right X 6 사이를 걷는다.
5. Play 하면 화면 왼쪽 위에 "다시 계산 1회 · 총 무게 11.0 / 30 · 속도 2.53" 과 칸 목록이 보인다. Q 로 셀을 줍고 E 로 수리 키트를 써 본다.

## 확인
E 로 수리 키트를 쓰는 순간 무게 글이 줄고 하린이 빨라지며, 키를 누르지 않는 동안은 "다시 계산 n회" 가 늘지 않는다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `kitWeight` | 수리 키트 무게 | 2 |
| `cellWeight` | 냉각 셀 무게 | 1 |
| `baseSpeed` | 기본 속도 | 4 |

## 동작 단계
1. **장비를 바꾸는 길은 Loadout 의 메서드뿐이다**: 칸 목록은 `Loadout` 안의 `private` 목록이다. 줍기, 버리기, 수리 키트 쓰기, 합금 모두 `Add`, `RemoveLast`, `UseOne`, `Upgrade` 를 부른다. 바깥은 `SlotInfo` 복사본만 읽을 수 있어 개수를 직접 고치지 못한다.
2. **바꾸는 메서드는 계산하지 않고 표시만 켠다**: 메서드는 칸을 고친 뒤 `MarkDirty()` 로 `dirty = true` 한 줄만 한다. 한 프레임에 열 번 바꿔도 무게 계산은 아직 없다. 사건 기록의 "· 표시 켬" 이 그 순간이다. 무대는 바로 다음 프레임에 읽어 표시를 끄므로, 왼쪽 위 "표시 dirty" 와 오른쪽 "표시 켬 → 읽을 때 다시 계산" 을 0.4초 남겨 보인다.
3. **읽을 때 표시가 켜져 있으면 한 번 다시 계산하고 끈다**: `HarinMover` 가 `Speed` 를 읽으면 `TotalWeight` 가 표시를 보고 칸마다 개수 × 무게 + 모듈 무게를 더한 뒤 표시를 끈다. 왼쪽 위 "다시 계산 n회" 가 하나 는다. 무게 글은 이때 오는 `Recalculated` 에서만 고친다.
4. **바뀌지 않았으면 캐시를 그대로 쓴다**: 하린은 매 프레임 속도를 읽지만 표시가 꺼져 있으면 캐시를 돌려줄 뿐이다. 자동 데모 6초 동안 왼쪽 위 "속도 읽기" 는 360회까지 늘지만 "다시 계산" 은 처음 한 번과 입력 수만큼이다 (매 프레임 계산하던 코드라면 360번). 책의 예는 씬 그래프다: 부모가 움직이면 자식들의 월드 변환을 바로 다시 계산하지 않고 표시만 해 두었다가, 그릴 때 한 번 계산한다. Unity 물리도 같은 생각이다: Transform 을 바꿔도 물리에 바로 맞추지 않고 모아 두었다가, 다음 물리 단계 전이나 `Physics.SyncTransforms` 를 부를 때 한꺼번에 맞춘다.

## 주의할 점
- 왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다. 무게 글은 같은 `Recalculated` 핸들러에서 고친다.
- 무게는 읽을 때 계산된다. `HarinMover` 를 빼면 아무도 `Speed` 를 읽지 않아 다시 계산도 무게 글 갱신도 일어나지 않는다. 화면에만 쓰는 값이면 `CountChanged` 핸들러에서 `TotalWeight` 를 한 번 읽어도 된다 (그러면 바뀔 때마다 계산한다).
- Play 중 Inspector 에서 `kitWeight`, `cellWeight` 를 바꾸면 `OnValidate` 가 `SetUnitWeight` 로 들고 있는 칸에도 넣는다. 그 이름의 칸을 들고 있어 값이 실제로 바뀔 때만 표시를 켜므로, 그때만 다시 계산 횟수가 하나 는다 (다 쓴 수리 키트의 무게를 바꾸면 늘지 않는다).
- `HarinMover` 는 `transform.position` 을 고쳐 걷는다 (물리가 없는 확인용). Rigidbody 를 붙이면 `FixedUpdate` 에서 `MovePosition` 으로 바꾼다.

## 흔한 실수
- **수리 키트를 썼는데 짐이 그대로 무겁다**: 바꾸는 길 하나에서 표시를 빠뜨렸다. 개수를 줄이는 코드가 `isDirty = true` 를 켜지 않으면 캐시가 옛 무게로 남는다. 다음에 다른 길이 표시를 켜면 그때 맞아져 원인을 찾기 어렵다. 바꾸는 코드를 `Loadout` 의 메서드로 모으고, 각 메서드 안에서 표시를 켠다. 이 표본의 `Loadout` 도 메서드마다 `MarkDirty()` 를 부른다. 부르는 곳을 없앤 것이 아니라 표시를 켜는 곳을 한 클래스 안으로 좁힌 것이다.
- **고쳐도 다른 스크립트에서 또 같은 버그가 생긴다**: 칸 목록이나 개수 필드가 `public` 이라 누구든 직접 고칠 수 있다. 이 표본의 `Loadout` 은 목록을 `private` 으로 두고 바깥에는 `SlotInfo` 값 복사본만 내준다. 교안 01 의 캡슐화(`{ get; private set; }`)처럼 읽기는 열고 쓰기는 닫으면 표시를 건너뛰는 길이 아예 없다.
- **표시는 켜지는데 화면 숫자가 안 바뀐다**: 읽는 쪽이 `TotalWeight` 대신 캐시 필드(`cachedWeight`)를 바로 읽었다. 표시를 확인하고 다시 계산하는 곳은 `TotalWeight` 하나여야 한다. 캐시 필드는 `private` 으로 둔다. 이 표본의 무게 글은 `Recalculated` 이벤트에서 고치므로 아무도 무게를 읽지 않으면 글도 그대로다. `HarinMover` 를 빼면 확인할 수 있다.
- **캐시를 만들었는데 다시 계산 횟수가 매 프레임 는다**: `Update` 에서 `isDirty = true` 를 켜거나, 무게를 바꾸지 않는 메서드(받지 않은 합금 등)에서도 표시를 켠다. 표시는 실제로 바뀌었을 때만 켠다. 이 표본의 `Upgrade` 는 바꿀 칸이 없으면 표시를 켜지 않고 `Ignored` 만 알린다.
- **총 무게는 맞는데 속도만 옛 값이다**: 여러 캐시가 서로 기대는데 하나만 표시했다. 속도까지 캐시하면 무게가 다시 계산될 때 속도 캐시도 표시해야 한다. 이 표본은 속도를 캐시하지 않고 읽을 때마다 `TotalWeight` 에서 구한다 (싼 계산은 캐시하지 않는다).

## 변형 예시
- 장비마다 내구도가 있어 닳을수록 무게가 늘게 하고 싶다. 내구도가 바뀌는 길도 표시를 켜게.
- 무게가 한계를 넘으면 달리기를 막는 과적 상태를 더하고 싶다.
- 총 무게 말고 방어력 합계도 캐시하고 싶다. 표시를 따로 둘지 같이 쓸지.
- 인벤토리 UI 를 UGUI 슬롯 격자로 바꾸고 싶다.
- 캐릭터 여럿이 같은 Loadout 구조를 쓰게 하고 싶다.
