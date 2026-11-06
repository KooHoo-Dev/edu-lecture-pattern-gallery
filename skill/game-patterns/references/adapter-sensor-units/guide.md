# 어댑터 패턴: 센서 장비 단위 맞추기 (Adapter Pattern: Sensor Units)

장비마다 다른 API 와 단위를 어댑터 한 곳에서 우리 모양으로 바꿔, 화면과 경보는 한 모양만 안다

패턴: 어댑터 패턴. 난이도 1/3. 주제: 외부 SDK, 단위 변환, 인터페이스, 정수 나눗셈.

## 파일
- `Core/IRadiationSensor.cs`
- `Core/RadiationField.cs`
- `Core/RadiationHud.cs`
- `Core/RadiationSite.cs`
- `Core/SensorAdapters.cs`
- `Core/VendorDevices.cs`
- `Unity/SensorStation.cs`

모두 프로젝트의 `Assets/Patterns/adapter-sensor-units/` 아래에 같은 하위 폴더로 복사한다.

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/adapter-sensor-units/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Core/VendorDevices.cs` 는 장비 SDK 흉내다. 실제 프로젝트에서는 업체가 준 패키지가 그 자리이고, 고치지 않는다. `Edit > Project Settings > Player` 의 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. `GameObject > UI (Canvas) > Image` 로 Image 를 하나 만든다 (Canvas 와 EventSystem 이 함께 생긴다). 이름을 `BarA` 로 바꾸고 Rect Transform 을 Pos X 0, Pos Y 120, Width 400, Height 30 으로 둔다. Source Image 에 스프라이트(기본 `UISprite` 도 된다)를 넣어야 Image Type 칸이 보인다. Image Type 을 Filled, Fill Method 를 Horizontal, Fill Origin 을 Left 로 둔다.
3. `BarA` 를 선택하고 `Ctrl+D` 로 복제해 이름을 `BarB`, Pos Y 를 60 으로 바꾼다. 같은 메뉴로 Image 를 둘 더 만들어 `LampA` (Pos X -240, Pos Y 120, Width 30, Height 30), `LampB` (Pos X -240, Pos Y 60, Width 30, Height 30) 로 둔다. 경보등은 Filled 가 아니어도 된다. Canvas 는 Screen Space - Overlay 그대로라 카메라 위치와 상관없이 Game 뷰에 보인다.
4. Canvas 오브젝트에 `SensorStation` 을 붙인다. 붙이는 순간 `Reset` 이 기본 키(Q 오름, W 내림, E B 구역 장비 바꾸기)를 넣는다. `Bar A`, `Bar B`, `Lamp A`, `Lamp B` 칸에 위 Image 넷을 끌어 넣는다.
5. Play 하고 Q 를 두 번, E 를 한 번, Q 를 한 번 누른다. 두 막대가 함께 3/4 까지 차고 두 경보등이 빨갛게 바뀐다. Game 뷰 왼쪽 위 글에 `남쪽 B [GeigerX] 0.75 경보 켜짐` 이 보이고, Console 에는 `[Sensor] 도윤: B 구역 장비 → GeigerX (SensorSwapped)`, `[Sensor] HUD B 경보 켜짐 (AlarmChanged)` 처럼 웹의 사건 기록과 같은 줄이 남는다.

## 확인
E 로 B 구역 장비를 GeigerX 로 바꿔도 B 막대가 A 막대와 같은 길이이고, Q 로 경보 기준(0.7)을 넘기면 A, B 경보등이 함께 켜진다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `alarmLevel` | 경보 기준 | 0.7 |
| `riseStep` | 오름·내림 한 번 | 0.25 |

## 동작 단계
1. **HUD 는 Level01 만 부른다**: `RadiationHud` 는 구역마다 `sensor.Level01` 한 줄로 0~1 값을 받는다. 그 센서가 `LegacyProbe` 인지 `GeigerX` 인지 모르고, `if (s is GeigerX)` 같은 분기도 없다. 장비를 바꿔도 HUD 코드는 그대로다.
2. **어댑터가 장비 API 를 부른다**: `Level01` 을 받은 어댑터가 자기가 감싼 장비의 API 를 부른다. 기존 장비는 `GetLevel()`, 신형은 `ReadPercent()` 다. 장비 SDK 는 고칠 수 없어서 우리 인터페이스를 구현하게 만들 수 없다. 그래서 장비를 필드로 들고 감싼다. 상속하지 않는 까닭: SDK 클래스는 `sealed` 라 상속할 수 없고, 감싸면 이미 만든 장비 객체를 그대로 받을 수 있다. 우리 쪽이 인터페이스가 아니라 클래스였다면 C# 는 클래스를 둘 상속할 수 없어 감싸는 길뿐이다.
3. **어댑터가 단위를 0~1 float 로 바꾼다**: `GeigerXAdapter` 가 `percent / 100f` 로 75 를 0.75 로 바꾼다. 변환은 이 한 줄뿐이고, `100f` 라서 실수 나눗셈이다 (`/ 100` 이면 75 / 100 = 0). 기존 장비 어댑터는 이미 0~1 이라 이름만 맞춘다.
4. **HUD 가 막대와 경보를 같은 값으로 정한다**: 받은 `level` 하나로 막대(`LevelShown`)를 채우고 `level >= AlarmLevel` 로 경보등(`AlarmChanged`)을 정한다. 두 판단이 같은 값을 쓰므로 막대가 경보 눈금을 넘었는데 경보등이 꺼진 일이 생기지 않는다.

## 주의할 점
- `SensorStation.Site` 는 처음 읽을 때 만든다 (`??=`). 다른 컴포넌트가 이 오브젝트의 `Awake` 보다 먼저 `Site` 를 읽어도 null 이 아니다. 이 표본에서는 `SensorStation` 만 읽는다.
- 이 표본의 HUD 는 오름·내림·교체 입력이 있을 때만 장비를 다시 읽는다 (`RadiationSite.Rise`, `Fall`, `SwapB` 가 `Hud.Refresh` 나 `Hud.Attach` 를 부른다). 실제 장비 SDK 가 값을 스스로 바꾸면 `Update` 에서 0.2초 같은 간격으로 `Site.Hud.Refresh()` 를 부른다. 그때마다 `LevelShown` 이 불리므로 Console 기록은 꺼 둔다 (`Log Events` 칸).
- Play 중에 Inspector 에서 `alarmLevel`, `riseStep` 을 바꾸면 `OnValidate` 가 코어에 넣고 `Site.Hud.Refresh()` 로 두 구역을 바로 다시 그린다. 그래서 경보 기준을 바꾸는 순간 A, B 경보등이 함께 새 기준을 따른다 (다시 그리지 않으면 옛 기준이 남았다가, 교체(E) 때 B 만 다시 읽혀 A, B 가 어긋난다). `riseStep` 은 다음 오름·내림부터 쓴다. 슬라이더를 끄는 동안 Refresh 마다 Console 에 막대 줄이 남는다. 방사선 값과 B 구역 장비 상태는 처음 만든 코어에 남으므로 처음부터 하려면 Play 를 다시 누른다.
- `RadiationField` 는 방사선 값을 1% 단위 정수로 든다. float 로 0.10 을 더하고 빼면 0.70 이 0.69999993 이 되어, 0~1 을 그대로 쓰는 `LegacyProbe` 구역은 기준 0.7 미만으로 꺼지고 반올림하는 `GeigerX` 구역은 70 → 0.70 으로 켜진다. 어댑터 탓이 아니라 시연용 값의 오차이므로, 시연 값은 정수로 들어 두 장비가 늘 같은 float 를 받게 했다.
- 왼쪽 위 글(실제 방사선, 구역마다 장비 이름과 값)은 IMGUI(`OnGUI`)로 그리는 확인용이다. 실제 게임은 UGUI·TextMeshPro 로 그린다. 글은 이벤트 핸들러에서 만들고 `OnGUI` 는 그리기만 한다.
- 경보등은 색(초록 ↔ 빨강)만 바꾸고 깜빡이지 않는다. 깜빡이게 하려면 1초에 3번을 넘지 않게 하고, 색만으로 알리지 않게 왼쪽 위 글처럼 "경보 켜짐" 글을 함께 둔다.

## 흔한 실수
- **신형 장비로 바꾸자 막대가 틀 밖으로 뻗는다 (Filled Image 면 늘 꽉 찬다)**: 막대를 RectTransform 의 Scale X(너비)로 그리면 50 이 들어가 틀 밖으로 뻗는다. Filled Image 의 fillAmount 에 넣으면 0~1 로 잘려 B 막대가 늘 꽉 찬 채로 보인다 (방사선이 0.01 이어도 꽉 참). 외부 SDK 를 쓰는 곳(막대 그리기, 경보 판단, 기록 저장…)마다 장비를 직접 부르고 단위를 따로 바꿨고, 한 곳이 변환을 빠뜨렸다. 쓰는 곳이 늘수록 빠뜨릴 자리도 는다. 장비마다 어댑터를 하나 두고 변환을 그 안 한 곳에서 한다. 쓰는 곳은 `Level01` 만 부른다.
- **방사선이 위험 수준인데 신형 장비 구역만 경보가 안 울린다**: `ReadPercent() / 100` 은 `int / int` 라 정수 나눗셈이다. 75 / 100 은 0.75 가 아니라 0 이고, 결과를 `float` 에 넣어도 이미 0 이다. 한쪽을 실수로 만든다: `/ 100f` 나 `(float)percent / 100`. 이 표본은 `GeigerXAdapter` 한 곳에서 `percent / 100f` 로 한다.
- **어댑터를 넣었더니 막대가 거의 비어 있다 (0.75 가 0.0075)**: 어댑터가 이미 0~1 로 바꿨는데 HUD 에 남은 옛 변환 코드가 한 번 더 100 으로 나눴다. 두 번 변환이다. 어댑터를 들이면 쓰는 곳의 변환 코드는 모두 지운다. HUD 는 `Level01` 이 언제나 0~1 이라고 믿는다 (인터페이스 주석에 단위를 적어 둔다).
- **경보 기준을 바꿨는데 신형 장비 구역만 그대로다**: 어댑터가 `IsDangerous` 같은 판단까지 하면서 기준값을 자기 안에 따로 들었다. 어댑터는 모양(API 이름, 단위)만 바꾸고 판단은 쓰는 쪽(HUD)에 남긴다. 이 표본의 어댑터는 `Level01` 하나만 돌려주고, 경보 기준은 `RadiationHud.AlarmLevel` 한 곳에만 있다.
- **장비를 하나 더 들이자 HUD 코드를 또 고친다**: HUD 가 `if (sensor is GeigerXAdapter)` 처럼 어댑터나 장비 형식을 묻기 시작했다. 장비 형식이 어댑터 밖으로 샌 것이다. 장비의 구체 형식은 장비를 만들어 어댑터에 넣는 곳(이 표본은 `RadiationSite`)만 안다. 새 장비는 어댑터 클래스 하나와 그 조립 한 줄로 끝나야 한다.

## 변형 예시
- 온도 센서도 들이고 싶다. 업체 장비는 화씨 정수를 주는데 HUD 는 섭씨 float 를 쓴다.
- 세 번째 업체 장비는 값을 콜백(이벤트)으로 준다. 같은 IRadiationSensor 로 감싸고 싶다.
- 결제·광고·분석 SDK 처럼 업체가 바뀔 수 있는 외부 서비스를 우리 인터페이스 뒤에 두고 싶다.
- 장비가 고장 나면(값을 못 읽으면) HUD 에 "신호 없음" 을 보이고 싶다.
- 기록 저장(1초마다 값 기록)도 `IRadiationSensor` 를 쓰는 쪽으로 붙이고 싶다 (어댑터는 그대로).
