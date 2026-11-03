# 싱글턴 패턴: 씬을 넘는 매니저 (Singleton Pattern: Managers Across Scenes)

씬을 넘는 매니저와 씬과 함께 사라질 매니저를 나누고 둘 다 하나만 둔다

패턴: 싱글턴 패턴. 난이도 2/3. 주제: 씬 전환, DontDestroyOnLoad, 컴포넌트 수명, 전역 접근.

## 파일
- `Core/ExpeditionRules.cs`
- `Core/SingleSlot.cs`
- `Unity/CreditBank.cs`
- `Unity/ExpeditionInput.cs`
- `Unity/ExpeditionManager.cs`
- `Unity/PersistentSingleton.cs`
- `Unity/SceneSingleton.cs`
- `Unity/SoundManager.cs`

모두 프로젝트의 `Assets/Patterns/singleton-scene-managers/` 아래에 같은 하위 폴더로 복사한다.

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/singleton-scene-managers/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다.
2. `File > New Scene` 으로 씬 둘을 만들어 `Base`, `Field` 로 저장한다. 두 씬을 차례로 열어 `File > Build Profiles` 창의 Scene List 에서 `Add Open Scenes` 로 넣고, `Base` 를 맨 위에 둔다 (목록에 없는 씬은 `LoadScene` 으로 열리지 않는다).
3. `Base` 씬의 루트에 빈 오브젝트(`GameObject > Create Empty`) 둘을 만들어 각각 `SoundManager`, `CreditBank` 를 붙인다. `SoundManager` 와 같이 붙는 AudioSource 의 `Audio Resource` 칸에 BGM 클립을 넣고 `Play On Awake` 는 끈다 (Loop 는 코드가 켠다).
4. `Field` 씬의 루트에 빈 오브젝트를 만들어 `ExpeditionManager` 를 붙인다.
5. 두 씬에 각각 빈 오브젝트를 만들어 `ExpeditionInput` 을 붙인다. 붙이는 순간 `Reset` 이 기본 키(B 기지, E 탐사 구역, G 줍기, C 정산)를 넣는다. `Base Scene`, `Field Scene` 칸이 저장한 씬 이름과 같은지 본다.
6. `Base` 씬을 열고 Play 한다. E 로 탐사 구역에 가서 G 로 줍고 C 로 정산한 뒤 B 로 돌아온다. 카메라는 새 씬의 Main Camera 그대로 둔다. 화면에 보일 것은 없고 결과는 Hierarchy 의 `DontDestroyOnLoad` 아래와 Console 에서 본다.

## 확인
B 로 기지에 몇 번을 돌아와도 Hierarchy 의 `DontDestroyOnLoad` 아래에 `SoundManager` 와 `CreditBank` 가 하나씩만 있고 BGM 이 한 겹이며, 기지에서 C 를 누르면 Console 에 예외 없이 "[정산] 받지 않음: 탐사 구역에서만 정산" 이 남는다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `startCredits` | 시작 크레딧 | 0 |
| `fragmentValue` | 조각 하나의 크레딧 | 30 |

## 동작 단계
1. **Awake 에서 자리를 요청한다**: 씬이 열리면 놓인 매니저마다 `Awake` 가 불리고, 베이스(`PersistentSingleton`, `SceneSingleton`)가 `SingleSlot.TryClaim(this)` 로 자리를 요청한다. 자리가 비어 있으면 차지하고, 유지 매니저는 이긴 경우에만 `DontDestroyOnLoad` 구역으로 옮긴다.
2. **먼저 온 것이 이기고 복제본은 스스로 파괴한다**: 기지로 돌아오면 기지 씬에 놓인 `SoundManager`, `CreditBank` 가 또 생긴다. 자리에 이미 주인이 있어 `TryClaim` 이 `false` 를 주고, 복제본은 `Destroy(gameObject)` 뒤 `return` 한다. 파괴는 프레임 끝이라 그 사이 `OnEnable` 은 불린다. 사건 기록의 "파괴 예약 중에도 불린다" 줄이 그것이다. 그래서 `return` 을 빼먹으면 아래 초기화가 복제본에서도 돈다.
3. **씬 종속 매니저는 OnDestroy 에서 자리를 비운다**: `ExpeditionManager` 는 `DontDestroyOnLoad` 를 하지 않아 탐사 구역 씬과 함께 파괴되고, `OnDestroy` 에서 `Release` 로 자리를 비운다. 그래서 기지에서 `ExpeditionManager.Instance` 는 파괴된 매니저가 아니라 `null` 이다. 주인이 아닌 복제본의 `Release` 는 아무것도 하지 않는다.
4. **부르는 쪽은 자리가 비어 있으면 부르지 않는다**: 정산 입력은 `ExpeditionManager.Instance` 가 `null` 이면 `Settlement.Settle` 에 `null` 을 넘기고, 정산은 받지 않은 채 `Refused` 로 "탐사 구역에서만 정산" 을 알린다. 줍기도 자리가 비어 있으면 부르지 않는다.

## 주의할 점
- `DontDestroyOnLoad` 는 루트 오브젝트에만 동작한다. 매니저를 다른 오브젝트의 자식으로 두면 경고만 남고 씬과 함께 파괴된다. 매니저는 Hierarchy 의 맨 위 단계에 둔다.
- Single 모드 `SceneManager.LoadScene` 은 부른 그 줄에서 바로 씬을 바꾸지 않고 다음 프레임에 바꾼다. 같은 프레임 안의 다음 줄에서 새 씬의 매니저를 찾으면 아직 없다.
- `Destroy(gameObject)` 는 예약이라 그 프레임 끝까지 복제본의 `OnEnable` 이 불린다. 그래서 `CreditBank`, `ExpeditionManager` 는 `OnEnable` 에서 `IsInstance` 를 확인하고 주인만 구독한다.
- `?.` 와 `??` 는 Unity 의 "파괴되면 null 과 같다" 비교를 거치지 않는다. 파괴된 매니저를 `Instance?.TakeAll()` 로 부르면 그대로 불린다. 매니저 확인은 `== null` 로 하거나, 이 표본처럼 `OnDestroy` 에서 자리를 비운다.
- 한 씬 안에서 서로 다른 오브젝트의 `Awake` 순서는 정해져 있지 않다. 다른 매니저의 `Instance` 를 `Awake` 에서 읽지 말고 `Start` 이후에 읽는다.
- 매니저에 `void Awake()` 를 새로 쓰면 베이스의 `Awake` 가 가려져 자리 요청이 빠진다 (컴파일러 경고 CS0114). 초기화는 `OnClaimed` 를 `override` 해서 한다.

## 흔한 실수
- **기지로 돌아오면 BGM 이 두 겹이고 크레딧이 0 이다**: 매니저가 놓인 씬을 다시 열면 그 씬의 매니저가 또 생긴다. `Awake` 에서 `Instance = this` 만 하면 새 것이 `Instance` 를 가져가고, `DontDestroyOnLoad` 한 옛 것도 남아 둘이 된다. 이미 주인이 있으면 늦게 온 쪽이 `Destroy(gameObject)` 하고 `return` 한다. 이 표본의 `SingleSlot.TryClaim` 이 그 규칙이다. 첫 씬에만 두는 부트 씬을 따로 만들면 다시 열리지 않아 더 단순하다.
- **두 번째 탐사에서 지난 탐사의 회로 조각이 남아 있다**: 씬과 함께 사라져야 할 `ExpeditionManager` 에도 `DontDestroyOnLoad` 를 붙였다. 매니저를 만들 때 "씬을 넘어 살아야 하나" 를 먼저 묻는다. BGM, 크레딧은 유지, 이번 탐사의 수치는 씬 종속이다. 씬 종속 매니저는 `SceneSingleton` 처럼 `OnDestroy` 에서 자리를 비운다.
- **도메인 리로드를 끄자 Play 를 다시 눌렀을 때 Instance 가 이상하다**: Enter Play Mode 설정에서 도메인 리로드를 끄면 `static` 필드가 지난 실행의 값을 들고 다음 Play 를 시작한다. 지난 실행에서 비우지 않은 `Instance` 가 남는다. `[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]` 를 붙인 static 메서드에서 static 값을 비운다. 이 표본의 베이스는 Play 가 끝날 때 불리는 `OnDestroy` 에서 자리를 비운다.
- **어디서 크레딧이 바뀌는지 찾을 수 없다**: 싱글턴은 편해서 아무 데서나 `CreditBank.Instance` 를 부르게 된다. 그러면 어떤 클래스가 은행에 기대는지 필드나 생성자에 드러나지 않아 의존이 숨고, 테스트에서 은행을 바꿔 끼울 수 없다. `Instance` 는 입력 처리처럼 바깥 경계에서만 읽고, 규칙(`Settlement`)에는 매개변수로 넘긴다. 정말 하나만 있어야 하는 것만 싱글턴으로 둔다.
- **씬에 매니저를 놓았는데도 Hierarchy 에 둘이 보인다**: `Instance` 를 처음 읽을 때 없으면 `new GameObject().AddComponent<T>()` 로 몰래 만드는 코드가 씬의 매니저보다 먼저 불렸다. 다른 오브젝트의 `Awake` 가 매니저의 `Awake` 보다 먼저 돌 수 있어서다. 몰래 만들지 말고 씬(또는 부트 씬)에 놓은 것 하나만 쓰고, 없으면 오류를 내 바로 알게 한다.

## 변형 예시
- 씬마다 다른 BGM 을 틀고, 씬이 바뀔 때 SoundManager 가 곡만 바꾸게 하고 싶다.
- 매니저들을 부트 씬 하나에 모아 처음에 한 번만 열고, 그다음부터는 기지와 탐사 구역만 오가게 하고 싶다.
- 크레딧을 저장하고 불러오는 SaveManager 를 같은 PersistentSingleton 으로 더하고 싶다.
- 탐사 구역을 Additive 로 열어 기지 씬 위에 겹쳐 두고 싶다.
- 싱글턴 대신 매니저를 Inspector 칸으로 넘겨받는 판도 만들어 비교하고 싶다.
