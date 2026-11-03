# 데코레이터 패턴: 버프 겹치기와 풀기 (Decorator Pattern: Stacking and Clearing Buffs)

버프를 감싸는 층으로 겹치고, 층을 빼면 원래 값으로 돌아온다

패턴: 데코레이터 패턴. 난이도 2/3. 주제: 버프, 스탯 계산, 감싸기, 타이머.

## 파일
- `Core/BuffSet.cs`
- `Core/PowerStats.cs`
- `Unity/PowerBuffs.cs`

모두 프로젝트의 `Assets/Patterns/decorator-stat-buffs/` 아래에 같은 하위 폴더로 복사한다.

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/decorator-stat-buffs/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. `GameObject > UI > Image` 로 출력 막대를 만든다 (Canvas 와 EventSystem 이 함께 생긴다). 이름을 `PowerFill` 로 바꾸고 Rect Transform 의 Width 를 600, Height 를 30 으로 한다. Source Image 에 스프라이트(예: 기본 제공 `UISprite`)를 넣어야 Image Type 칸이 보인다. Image Type 을 `Filled`, Fill Method 를 `Horizontal`, Fill Origin 을 `Left` 로 둔다.
3. 같은 방법으로 작은 Image 둘(`CellTimer`, `OverloadTimer`, Width 200, Height 12, Filled · Horizontal)을 만들고, `GameObject > UI > Legacy > Text` 로 Text 둘(`PowerText`, `ChainText`)을 만든다. `ChainText` 는 Width 를 800 으로 넓힌다. Canvas 는 Screen Space - Overlay 라 카메라 위치와 상관없이 Game 뷰에 보인다.
4. 항상 켜져 있는 `Canvas` 에 `PowerBuffs` 를 붙인다. 붙이는 순간 `Reset` 이 기본 키(1 냉각 셀, 2 과부하, 3 정화)를 넣는다. `Power Fill`, `Power Text`, `Chain Text`, `Cell Timer Fill`, `Overload Timer Fill` 칸에 만든 것을 끌어 넣는다. 웹 갤러리 무대의 C/O/X 는 갤러리 단축키를 피한 것이라 Unity 와 다르다.
5. Play 하고 1, 2, 1 을 차례로 누른 뒤 기다린다. `ChainText` 가 `과부하 ×2 [냉각 셀 +5 [기본 10]]` 처럼 바뀌고, Console 에 `[PowerBuffs] 출력 15 → 30` 같은 줄이 남는다.

## 확인
1, 2, 1 을 누르고 기다리면 출력이 10 → 15 → 30 → 15 → 10 으로 바뀌고, 모든 버프가 끝난 뒤 `PowerText` 가 정확히 10 이며 `ChainText` 가 `기본 10` 이다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `cellBonus` | 냉각 셀 보너스 | 5 |
| `overloadMultiplier` | 과부하 배율 | 2배 |
| `cellDuration` | 냉각 셀 지속 시간 | 3초 |
| `overloadDuration` | 과부하 지속 시간 | 2.5초 |

## 동작 단계
1. **버프를 받으면 목록에 넣는다**: `PowerBuffs` 는 냉각 셀 키를 받으면 `BuffSet.Apply(Cell)` 만 부른다. `BuffSet` 은 출력 숫자를 고치지 않고 활성 버프 목록에 (종류, 남은 시간)을 넣는다. 같은 버프가 이미 있으면 층을 하나 더 두지 않고 남은 시간만 처음으로 되돌린다 (갱신). 기록의 "다시 받음 → 층은 그대로" 가 그 순간이다.
2. **목록에서 사슬을 다시 감싼다**: 목록이 바뀌면 `Rebuild` 가 `new BasePower(10)` 에서 시작해 냉각 셀마다 `AddLayer`, 과부하마다 `MultiplyLayer` 로 감싼다. **더하기 층이 안쪽, 곱하기 층이 바깥** 으로 고정이다. 받은 순서대로 감싸면 같은 두 버프가 (10 + 5) × 2 = 30 도 되고 10 × 2 + 5 = 25 도 된다. 데코레이터는 같은 인터페이스로 감싸 원본을 고치지 않는다. 여기서는 그 감싸기를 수정자 목록에서 매번 다시 만든다.
3. **값을 읽으면 바깥 층부터 안으로**: `BuffSet.Value` 는 바깥 층의 `Value` 를 읽는다. `MultiplyLayer` 는 안쪽(`inner`) 값을 읽어 ×2 하고, `AddLayer` 는 안쪽 값을 읽어 +5 한다. 맨 안쪽 `BasePower` 는 10 그대로다. 모두 `IPowerStat` 라 바깥 층은 안쪽이 기본값인지 다른 층인지 모른다. 미니 월드의 겹친 상자 오른쪽 숫자가 층마다 돌려준 값이다.
4. **끝난 버프는 목록에서 빠진다**: `Tick(dt)` 가 남은 시간을 줄이다 0 이 된 버프를 목록에서 빼고 사슬을 처음부터 다시 만든다. 과부하가 먼저 끝나도 사슬 중간의 층을 떼어 내지 않으므로 냉각 셀 층은 그대로 남고, 모두 끝나면 사슬은 `BasePower` 하나라 출력이 정확히 기본값이다. 타이머가 코루틴이 아니라서 `StopCoroutine` 으로 끝 처리를 건너뛰는 일도 없다.

## 주의할 점
- 버프 시간은 `Update` 의 `Tick(Time.deltaTime)` 으로 센다. `Time.timeScale` 이 0(일시정지)이면 버프도 멈춘다. 일시정지 중에도 흘러야 하는 버프라면 `Time.unscaledDeltaTime` 을 넘긴다.
- 사슬은 목록이 바뀔 때만 다시 만든다 (버프를 받거나, 끝나거나, 정화하거나, Inspector 값이 바뀔 때). 매 프레임 `Rebuild` 하면 층 객체가 프레임마다 생겨 GC 가 늘어난다. 출력은 `PowerChanged` 를 받아 UI 에 옮기고 `Update` 에서 다시 읽지 않는다.
- 층 순서(더하기 안쪽, 곱하기 바깥)는 `BuffSet.Rebuild` 한 곳에 있다. "배율 뒤에 더하는 고정 보너스" 같은 규칙이 생기면 그 층을 곱하기 층 바깥에 감싸는 단계를 `Rebuild` 에 하나 더한다. 버프마다 순서를 따로 정하지 않는다.
- `InputAction` 은 `OnEnable` 에서 콜백을 붙이고 `Enable`, `OnDisable` 에서 떼고 `Disable` 한다. 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 버프 갱신이 두 번 일어난다. 코드에서 만드는 액션은 `InputActionType.Button` 으로 만든다.
- UGUI Filled Image 는 Source Image 에 스프라이트가 있어야 Image Type 칸이 보이고 `fillAmount` 가 화면에 나타난다. 막대가 가득 차는 출력은 `(Base Power + Cell Bonus) × Overload Multiplier × 1.4` 로 잡았다 (웹 무대와 같다).

## 흔한 실수
- **버프가 다 끝났는데 공격력이 원래대로 안 돌아온다**: 같은 버프를 다시 받을 때 `StopCoroutine` 으로 앞 코루틴을 멈추고 새로 시작했다. 멈춘 코루틴은 `yield` 뒤의 빼기 줄을 실행하지 않아 더한 값이 하나 남는다. 버프 시간을 코루틴 대신 목록과 `Tick(dt)` 로 세고, 출력은 목록에서 다시 계산한다. 다시 받으면 목록의 남은 시간만 갱신한다.
- **배율 버프를 풀었더니 10 이 9.999999 나 12.5 가 된다**: 배율을 그 자리에서 곱해 두고 끝날 때 나누면, 그 사이에 더한 값까지 나뉘고 float 오차도 쌓인다. 곱하기와 더하기를 건 순서의 반대로 정확히 풀어야 하는데, 버프가 제각각 끝나면 그 순서를 지킬 수 없다. 출력을 고쳐 두지 말고 기본값에서 층을 감싸 매번 다시 계산한다.
- **최대 체력 버프가 끝났는데 체력이 최대치를 넘어 있다**: 최대 체력만 층으로 되돌리고 현재 체력은 그대로 두었다. 최대 체력이 줄어드는 순간(`PowerChanged` 같은 알림)에 현재 체력을 새 최대치로 깎는다. 버프가 걸릴 때 현재 체력을 함께 늘릴지(비율 유지)도 게임 규칙으로 정해 한 곳에 둔다.
- **같은 버프를 연타했더니 끝없이 세진다**: 같은 종류 버프의 갱신과 중첩을 구분하지 않았다. 이 표본은 같은 종류를 다시 받으면 층을 더하지 않고 남은 시간만 갱신한다. 중첩이 규칙이라면 종류마다 최대 중첩 수를 두고 목록에 그만큼만 넣는다. 어느 쪽이든 목록 한 곳에서 정한다.
- **중간 버프를 떼었더니 바깥 버프까지 사라졌다**: 감싼 사슬에서 가운데 층만 직접 빼려고 바깥 층의 `inner` 를 끊거나, 바깥 층을 가리키던 참조를 버렸다. 층은 자기 안쪽만 알아서 사슬 중간을 고치기 어렵다. 층을 떼지 말고 활성 버프 목록에서 빼고, 목록으로 사슬을 처음부터 다시 만든다.

## 변형 예시
- 이동 속도 버프(+%)와 둔화 디버프(×0.5)를 같은 방식으로 겹치고 풀고 싶다.
- 최대 체력 버프가 끝날 때 현재 체력이 새 최대치를 넘지 않게 하고 싶다.
- 같은 독 디버프는 최대 3번까지 중첩되고 각자 따로 끝나게 하고 싶다.
- 장비를 끼우고 뺄 때 공격력 보너스도 같은 사슬의 층으로 넣고 싶다.
- 버프 아이콘 줄에 남은 시간과 지금 출력을 함께 보여 주고 싶다.
