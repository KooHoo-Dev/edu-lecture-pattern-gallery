# 관찰자 패턴: 체력 알림 (Observer Pattern: Health Events)

체력은 바뀌었다고 알리기만 하고, 구독한 쪽이 각자 반응한다

패턴: 관찰자 패턴. 난이도 1/3. 주제: 이벤트, 느슨한 결합, UI 갱신, 컴포넌트 수명.

## 파일
- `Core/Health.cs`
- `Core/HealthReactions.cs`
- `Unity/AchievementOnDamage.cs`
- `Unity/GameOverOnDeath.cs`
- `Unity/HealthBarUI.cs`
- `Unity/HitSoundOnDamage.cs`
- `Unity/PlayerHealth.cs`

모두 프로젝트의 `Assets/Patterns/observer-health-events/` 아래에 같은 하위 폴더로 복사한다.

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/observer-health-events/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다.
2. 플레이어 오브젝트에 `PlayerHealth` 를 붙인다. 붙이는 순간 `Reset` 이 시연 키(K 피해, H 회복)를 넣는다.
3. `GameObject > UI (Canvas) > Image` 로 체력 바를 만든다. Source Image 에 스프라이트(기본 UISprite 도 된다)를 넣어야 Image Type 칸이 보인다. Image Type 을 Filled, Fill Method 를 Horizontal, Fill Origin 을 Left 로 둔다. 그 Image 에 `HealthBarUI` 를 붙이고 `Target` 에 플레이어, `Fill` 에 그 Image 를 넣는다.
4. 항상 켜진 오브젝트(Canvas 등)에 `HitSoundOnDamage` 를 붙인다. 같이 붙는 AudioSource 에 피격음 클립을 넣고 Play On Awake 를 끈다. `Target` 에 플레이어를 넣는다.
5. 같은 오브젝트에 `AchievementOnDamage` 와 `GameOverOnDeath` 를 붙이고 `Target` 에 플레이어를 넣는다. 업적 알림 창과 게임 오버 패널은 만들어서 꺼 두고, 각각 `Toast`, `Panel` 칸에 넣는다. 꺼진 창 자신에 붙이면 `OnEnable` 이 돌지 않아 구독하지 않는다.
6. Play 하고 K 로 피해를 주다가 Hierarchy 에서 체력 바 오브젝트를 Delete 로 지워 본다. 소리, 업적, 게임 오버는 그대로 동작해야 한다.

## 확인
체력 바를 Delete 로 지워도 피격음, 업적, 게임 오버가 그대로 동작하고 Console 에 예외가 없다. 체력 바를 다시 만들면 붙는 순간 지금 체력으로 맞춰진다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `maxHealth` | 최대 체력 | 100 |
| `damage` | 피해량 | 20 |
| `healAmount` | 회복량 | 15 |
| `lowHealthRatio` | 경고 색 기준 | 0.3 |
| `achievementDamage` | 업적 기준 피해 | 60 |

## 동작 단계
1. **체력이 바뀐다**: `PlayerHealth` 가 피해 입력을 `Health.Damage` 에 넘기고, `Health` 가 체력을 깎는다. `Health` 는 체력 바도 소리도 모른다.
2. **소식을 알린다**: `Changed?.Invoke(...)` 한 줄로 "바뀌었다"고만 알린다. 듣는 쪽이 몇이든, 없든 이 줄은 그대로다. 0 이 되는 순간에는 `Died` 도 알린다.
3. **구독자가 각자 반응한다**: 체력 바는 채움과 경고 색을, 피격음은 피해일 때만 소리를, 업적은 누적 피해를, 게임 오버는 `Died` 만 듣고 창을 띄운다. 경고 색 기준과 업적 기준은 그 구독자만 안다.
4. **생기고 없어질 때 붙고 떨어진다**: `HealthBarUI` 는 `OnEnable` 에서 구독하고 `OnDisable` 에서 해제한다. 오브젝트를 파괴해도 `OnDisable` 이 먼저 불리므로 파괴된 바는 불리지 않는다. 새로 만든 바는 붙는 순간 지금 값으로 맞춘다. "체력 바 없애기/다시 만들기" 로 확인한다.

## 주의할 점
- 구독자 컴포넌트가 다른 오브젝트에 있으면 `Awake`, `OnEnable` 순서가 정해져 있지 않다. 그래서 `PlayerHealth.Health` 는 처음 읽을 때 만든다. 체력을 `Awake` 에서만 만들면 구독자가 먼저 켜질 때 null 이다.
- `UnityEvent` (Inspector 에서 연결하는 이벤트)도 같은 관찰자 패턴이다. 기획자가 Inspector 에서 연결해야 하면 `UnityEvent`, 코드에서만 쓰면 C# `event` 가 가볍고 해제도 분명하다. `UnityEvent` 에 코드로 `AddListener` 했다면 `RemoveListener` 도 한다.
- 씬을 넘어 사는 체력(`DontDestroyOnLoad`)에 씬의 UI 가 구독하면, UI 가 파괴될 때 `OnDisable` 에서 해제해야 다음 씬에서 예외가 나지 않는다.
- 구독자가 핸들러 안에서 `Damage` 를 다시 부르면(출혈 같은 연쇄 피해), 뒤쪽 구독자는 바깥 변화를 안쪽 변화보다 늦게 받는다. 이 표본의 `Health` 는 `Died` 가 두 번 불리지 않게 막았지만, 연쇄 피해는 다음 프레임으로 미루는 쪽이 안전하다.

## 흔한 실수
- **체력 바를 지우거나 씬을 바꾼 뒤 MissingReferenceException 이 난다**: `OnEnable` 에서 구독했는데 `OnDisable` 에서 해제하지 않았다. 이벤트는 구독자를 계속 붙잡고 있어 파괴된 컴포넌트의 핸들러를 부르고, 핸들러가 파괴된 Image 를 건드리는 줄에서 예외가 난다. 이벤트를 쓴다고 예외에서 안전해지는 것은 아니다. 구독자 하나가 던지면 그 뒤 구독자와 `Died` 도 건너뛰어진다. 지켜 주는 것은 `OnEnable` 과 `OnDisable` 의 짝이다.
- **새로 만든 체력 바가 100% 로 보인다**: 붙기 전에 일어난 `Changed` 는 받지 못했다. 상태를 보여 주는 구독자는 붙을 때 지금 값(`health.Current`)으로 한 번 맞춘다. 이 표본의 `HealthBar.Bind` 와 `GameOverPanel.Bind` 가 그렇게 한다. 소리, 업적처럼 순간을 알리는 구독자는 지난 일을 다시 내지 않는다.
- **처음 실행할 때 NullReferenceException 이 난다**: 구독자의 `OnEnable` 이 체력 컴포넌트의 `Awake` 보다 먼저 불렸다. 오브젝트 사이의 `Awake`, `OnEnable` 순서는 정해져 있지 않다. `PlayerHealth.Health` 처럼 처음 읽을 때 만든다.
- **구독자끼리 순서에 기대다가 가끔 틀린다**: 이벤트는 붙은 순서대로 부르지만, 다시 만든 구독자는 맨 뒤에 붙는다. 이 표본에서 체력 바를 다시 만든 뒤 피해를 주면 사건 기록에서 바가 소리와 업적 뒤로 간다. 순서가 필요하면 이벤트 둘로 나누거나 한 구독자가 다음 일을 부른다.
- **람다로 구독했더니 해제가 안 된다**: `health.Changed += c => Show(c);` 처럼 람다로 붙이면, `-=` 에 똑같이 쓴 람다는 새로 만들어진 다른 대리자라 떨어지지 않는다. 메서드(`OnChanged`)로 붙이거나 람다를 필드에 담아 두고 그 필드로 뗀다.

## 변형 예시
- 체력이 줄 때 화면 가장자리를 붉게 깜빡이는 구독자를 더하고 싶다. 1초에 3번을 넘지 않게.
- 보스 체력에도 같은 Health 를 쓰고, 보스 체력 바는 다른 위치에 띄우고 싶다.
- 체력 대신 탄약, 돈처럼 다른 값에도 같은 구조를 쓰고 싶다.
- Inspector 에서 기획자가 반응을 연결할 수 있게 UnityEvent 판도 만들고 싶다.
- 피해 숫자가 머리 위로 떠오르게 하고 싶다.
