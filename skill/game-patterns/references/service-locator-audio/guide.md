# 서비스 로케이터: 소리 서비스와 널 객체 (Service Locator: Audio Service and Null Object)

게임 코드는 소리 서비스를 찾아 쓰기만 하고, 서비스가 없으면 아무것도 하지 않는 널 객체가 대신한다

패턴: 서비스 로케이터. 난이도 2/3. 주제: 널 객체, 전역 접근, 의존 바꿔 끼우기, 컴포넌트 수명, 효과음.

## 파일
- `Core/AudioService.cs`
- `Core/BaseGameCode.cs`
- `Core/IAudioService.cs`
- `Core/NullAudioService.cs`
- `Core/Services.cs`
- `Unity/AudioServiceHost.cs`
- `Unity/MaintenanceBase.cs`

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/service-locator-audio/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. `GameObject > Create Empty` 로 빈 오브젝트를 만들어 이름을 `Audio Service` 로 바꾸고 `AudioServiceHost` 를 붙인다. AudioSource 가 같이 붙는다. AudioSource 의 첫 칸 `Audio Generator` 는 비워 두고 `Play On Awake` 를 끈다 (`PlayOneShot` 이 클립을 직접 받는다).
3. `AudioServiceHost` 의 `Clips` 표에 이미 있는 세 줄(fire, drone-down, repair-done)의 `Clip` 칸에 발사음, 파괴음, 완료음 클립을 넣는다. 비워 둔 줄은 처음 울릴 때 Console 에 오류를 한 번 남기고 소리 없이 넘어간다.
4. 빈 오브젝트를 하나 더 만들어 `MaintenanceBase` 를 붙인다. 붙이는 순간 `Reset` 이 기본 키(Q 포탑 발사, W 드론 파괴, E 정비 완료, R 소리 서비스 빼기·넣기)를 넣는다. `Audio Host` 칸에 2단계의 `Audio Service` 오브젝트를 넣는다.
5. Play 한다. 월드에 그리는 것이 없어 카메라 위치·크기와 상관없이 Game 뷰 왼쪽 위에 확인용 글(탄약·크레딧·수리 키트, `Services.Audio → …`)이 보이고, 일어난 일은 Console 에 남는다.
6. R 로 소리 서비스를 빼고 W 로 드론을 파괴해 크레딧이 들어오는지 본다. Hierarchy 에서 `Audio Service` 오브젝트를 Delete 로 지워도 같다. 소리를 뺀 테스트 씬은 `Audio Service` 오브젝트를 놓지 않으면 된다.

## 확인
R 로 소리 서비스를 빼면 화면 글이 `Services.Audio → NullAudioService (무음)` 으로 바뀌고, 그 상태에서 W 를 눌러도 Console 에 예외 없이 크레딧이 보상만큼 오른다. 다시 R 로 넣고 W 를 누르면 파괴음이 난다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `reward` | 드론 보상 | 10 |
| `startAmmo` | 시작 탄약 | 5 |

## 동작 단계
1. **연결 컴포넌트가 켜질 때 실제 서비스를 등록한다**: `AudioServiceHost.OnEnable` 이 자기 `AudioService` 를 `Services.Provide` 에 넘긴다. 꺼질 때(`OnDisable`)는 지금 등록된 것이 자기 것일 때만 `Provide(null)` 한다. "소리 서비스 빼기·넣기" 가 이 둘이다. 게임 코드는 누가 등록했는지 모른다.
2. **게임 코드는 로케이터에서 찾아 부르기만 한다**: `Turret`, `DroneField`, `RepairBay` 는 `Services.Audio.Play(...)` 한 줄만 쓴다. 서비스를 필드에 담아 두지 않고 부를 때마다 찾으므로, 중간에 빼고 넣어도 다음 호출부터 맞는다. 실제 서비스면 `Played` 를 알리고 연결 컴포넌트가 `PlayOneShot` 으로 울린다.
3. **등록이 없으면 널 객체가 대신한다**: `Provide(null)` 뒤나 아무도 등록하지 않은 씬에서 `Services.Audio` 는 `NullAudioService` 다. `Play` 를 받아도 아무것도 하지 않고 예외도 없다. 로케이터는 null 을 돌려주지 않는다. 위쪽 서비스 자리 상자가 "→ NullAudioService (무음)" 으로 바뀐다.
4. **그래서 소리가 없어도 그 아래 줄이 돈다**: `Play` 다음 줄인 크레딧 지급(`Credits += Reward`)과 정비 완료 기록이 소리 유무와 상관없이 실행된다. 사건 기록의 "(무음)" 줄에도 크레딧이 들어온다. 부르는 쪽에 null 검사가 하나도 없다.

## 주의할 점
- 왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다.
- `Services.Audio` 를 `Awake` 에서 필드에 담아 두지 않는다. 담아 둔 뒤에는 서비스를 빼고 넣은 것이 반영되지 않고, 파괴된 연결 컴포넌트의 서비스를 계속 부른다. 이 표본의 게임 코드는 부를 때마다 `Services.Audio` 로 찾는다.
- 오브젝트 사이의 `Awake`, `OnEnable` 순서는 정해져 있지 않다. 다른 오브젝트의 `Awake`·`OnEnable` 에서 낸 첫 소리는 `AudioServiceHost.OnEnable` 보다 먼저 와 무음(널 객체)일 수 있다. 예외는 나지 않는다. 시작 소리는 `Start` 이후에 낸다 (씬의 모든 `OnEnable` 이 `Start` 보다 먼저 돈다).
- `ResetStatics` 의 `[RuntimeInitializeOnLoadMethod]` 는 씬에 `AudioServiceHost` 가 없어도 클래스가 프로젝트에 있으면 Play 마다 불린다. 그래서 소리를 뺀 테스트 씬도 깨끗한 로케이터로 시작한다. 이 메서드는 제네릭이 아닌 클래스에 둔다.
- 서비스 로케이터도 결국 전역 접근이다. `Turret` 이 소리를 쓴다는 것이 생성자나 필드에 드러나지 않아 의존이 숨고, 테스트에서는 `Services.Reset` 과 `Provide` 를 잊지 말아야 한다. 쓰는 곳이 적고 조립하는 곳이 분명하면 생성자로 `IAudioService` 를, 또는 Inspector 칸으로 구체 컴포넌트(`AudioServiceHost`)를 넘겨받는 의존성 주입이 더 분명하다 (인터페이스 형식의 `[SerializeField]` 칸은 Inspector 에 보이지 않는다). 소리·로그처럼 어디서나 쓰고 없어도 되는 서비스에 로케이터가 잘 맞는다.

## 흔한 실수
- **소리 매니저를 뺀 테스트 씬에서 드론을 잡았는데 크레딧이 안 들어온다**: `AudioManager.Instance.Play(...)` 가 `NullReferenceException` 을 던져 그 아래 크레딧 지급 줄이 실행되지 않았다. Console 에 예외가 남지만 게임은 계속 돌아 놓치기 쉽다. null 검사를 부르는 곳마다 흩어 두면 한 곳은 꼭 빠진다. `OnDestroy` 에서 `Instance` 를 비우지 않는 흔한 변형이면 NullReferenceException 대신 파괴된 AudioSource 를 건드리는 `MissingReferenceException` 이 나고, `?.`·`??` 는 Unity 의 가짜 null 을 거르지 못해 막지 못한다 (`!= null` 비교만 거른다). 서비스는 로케이터(`Services.Audio`)에서 찾고, 없을 때는 아무것도 하지 않는 `NullAudioService` 를 돌려주게 한 곳에서 정한다.
- **"소리 끔" 을 만들었더니 여기저기서 NullReferenceException 이 난다**: 소리를 끄려고 로케이터에 null 을 등록했다. 그러면 로케이터를 거쳐도 부르는 쪽이 다시 null 을 받아 검사를 흩어야 한다. 이 표본의 `Services.Provide` 는 null 을 받으면 `NullAudioService` 로 바꿔 담는다. 소리 끔 설정도 `Provide(null)` 이나 `Provide(NullAudioService.Instance)` 로 만든다.
- **소리 오브젝트를 지운 뒤 소리가 사라지거나 MissingReferenceException 이 난다**: `OnDisable` 에서 등록을 지우지 않아 로케이터가 파괴된 연결 컴포넌트의 서비스를 계속 돌려준다. 이 표본처럼 `Played` 구독도 함께 뗐다면 소리만 조용히 사라지고(서비스 자리는 그대로 `AudioService`), 구독을 남겼다면 핸들러가 파괴된 AudioSource 를 건드려 `MissingReferenceException` 이 난다. 이 예외는 `Services.Audio.Play` 를 지나 게임 코드까지 올라와 크레딧 지급 줄도 멈춘다 (나쁜 예와 같은 증상). 켤 때 등록, 끌 때 해제를 짝으로 둔다.
- **다른 소리 오브젝트를 끄자 켜져 있는 쪽 소리까지 사라진다**: `OnDisable` 에서 무조건 `Provide(null)` 했다. 씬을 바꾸는 중이나 시험용 서비스를 겹쳐 둘 때 다른 오브젝트가 등록한 서비스를 내가 지운다. `AudioServiceHost` 처럼 `Services.Audio == Service` 일 때, 곧 내가 등록한 것일 때만 지운다. (켜는 쪽은 늘 덮어쓰므로 나중에 켜진 것이 이긴다. 로케이터는 하나만 기억해, Host 둘을 켰다가 나중 것을 끄면 앞 Host 로 되돌아가지 않고 무음이 된다.)
- **도메인 리로드를 끈 에디터에서 두 번째 Play 부터 소리가 이상하다**: Enter Play Mode 설정에서 도메인 리로드를 끄면 `static` 필드는 지난 Play 의 값을 들고 다음 Play 를 시작한다. 이 표본의 `AudioServiceHost` 라면 Play 를 끝낼 때 `OnDisable` 이 `Provide(null)` 을 부르므로 지난 서비스가 남지 않는다. 남는 것은 `OnDisable` 의 등록 해제를 빠뜨렸을 때나 MonoBehaviour 가 아닌 곳(정적 초기화, 에디터 코드)에서 `Provide` 했을 때다. 그러면 소리 서비스를 놓지 않은 씬인데도 지난 Play 의 서비스가 남는다. `[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]` 을 붙인 static 메서드에서 `Services.Reset()` 을 불러 그런 경우를 막는다 (방어 코드). 이 표본은 `AudioServiceHost.ResetStatics` 다. 제네릭 클래스 안에 두면 불리지 않는다.

## 변형 예시
- 설정 화면의 "효과음 끔" 을 켜면 널 객체로, 끄면 실제 소리 서비스로 바꿔 끼우고 싶다.
- 실제 서비스를 감싸 재생할 때마다 Console 에 남기는 디버그용 소리 서비스를 끼우고 싶다.
- 진동이나 카메라 흔들림 같은 다른 서비스도 같은 로케이터에 더하고 싶다.
- 같은 프레임에 겹친 소리를 합치도록 소리 서비스 뒤에 큐를 두고 싶다.
- 테스트 코드에서 재생 기록만 남기는 가짜 서비스를 등록해 크레딧 규칙을 검사하고 싶다.
