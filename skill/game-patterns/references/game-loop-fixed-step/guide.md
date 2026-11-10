# 게임 루프: 고정 시간 간격 (Game Loop: Fixed Time Step)

화면 프레임이 몇이든 게임 규칙은 같은 시간 간격으로 돌려, 30fps 와 144fps 에서 점프 높이가 같게 한다

패턴: 게임 루프. 난이도 2/3. 주제: 게임 루프, 고정 시간 간격, deltaTime, 프레임 속도, 보간.

## 파일
- `Core/FixedStepper.cs`
- `Core/Runner.cs`
- `Unity/RunnerLoop.cs`

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/game-loop-fixed-step/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. `GameObject > Create Empty` 로 `Track` 을 만들어 Position (-9, -2, 0) 에 두고 `RunnerLoop` 를 붙인다. 붙이는 순간 `Reset` 이 기본 키(Q 점프, W 돌진, E 렉, R 처음 자리로)를 넣는다. 웹 갤러리 무대의 Q/W/E 는 Unity 기본 키와 같고, R(처음 자리로)은 Unity 에만 있다. 이 오브젝트 자리가 코어의 x 0, 땅 높이다.
3. 하린: 2D 프로젝트면 `GameObject > 2D Object > Sprites > Square`, Universal 3D 프로젝트면 `GameObject > 3D Object > Cube` 로 하나 만들어 이름을 `Harin` 으로 바꾸고 Scale 을 (0.6, 0.9, 1) 로 한다 (Sprites 메뉴는 2D Sprite 패키지가 있어야 보인다). `Track` 의 `Runner View` 칸에 끌어 넣는다. 위치는 Play 하면 코드가 정한다 (x 6, 발이 땅에 닿게).
4. 벽: 같은 메뉴로 하나 더 만들어 이름을 `Wall` 로 바꾸고 `Wall View` 칸에 넣는다. 자리와 크기는 코드가 코어 설정에 맞춰 정한다 (x 12, 두께 0.2, 높이 1.5).
5. `Main Camera` 를 Position (0, 0, -10) 에 두고 Projection 을 `Orthographic`, Size 를 5 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). Game 뷰 비율을 16:9 로 두면 가로 -8.9 ~ 8.9 가 보여, 월드 x -3 에서 시작하는 하린과 월드 x 3 의 벽이 모두 들어온다.
6. Play 하고 Q 를 누른다. Console 에 `[RunnerLoop] 점프`, `최고 0.72m`, `착지` 가 나오고 Game 뷰 왼쪽 위에 `목표 60fps · 화면 프레임 n회 · 고정 단계 n회 · 버린 시간 0.00초` 와 `최고 높이 0.72m · 돌진 -` 가 보인다. R 로 처음 자리로 돌린 뒤 W 를 한 번 눌러 x 9 까지 돌진한다 (`돌진 끝 · 3.00m`). 돌진이 끝난 뒤 W 와 바로 E 를 눌러 돌진 중에 렉을 낸다 (E 가 W 뒤 0.18초 안에 와야 벽에 닿기 전이다): 하린은 벽을 넘지 않고 `벽에 막힘 · x 11.70` 과 `상한 5단계 · … 초 버림` 이 나온다. Play 를 멈추고 `Target Frame Rate` 를 30, 144 로 바꿔 다시 해 본다. `OnEnable` 이 VSync 를 끄므로 목표 프레임이 들으며, Editor 에서는 Game 뷰에만 듣는다.

## 확인
`Target Frame Rate` 를 30, 60, 144 로 바꿔 Play 할 때마다 Q 로 점프한 `최고 높이` 가 0.72m 로 같고, W 한 번으로 x 9 에 선 뒤 벽 앞에서 W 와 바로 E 를 눌러도 하린이 벽을 넘지 않고 x 11.70 에서 막히며 `상한 5단계 · … 초 버림` 이 Console 에 나온다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `fixedStep` | 고정 간격 | 0.02초 |
| `maxStepsPerFrame` | 프레임당 단계 상한 | 5회 |
| `lagSpike` | 렉 프레임 길이 | 0.3초 |
| `jumpSpeed` | 점프 속도 | 8m/s |

## 동작 단계
1. **화면 프레임마다 지난 시간을 쌓는다**: 엔진이 부르는 `Update` 는 `RunnerLoop` 하나뿐이고, 거기서 `Stepper.Advance(Time.deltaTime)` 으로 그 프레임이 걸린 시간을 `accumulator` 에 더한다. 무대의 세 줄은 같은 입력을 받는 30·60·144fps 기기다: 무대가 1/60초씩 흐르면 144fps 줄은 화면 프레임을 2~3번, 30fps 줄은 두 번에 한 번 만들어 그때마다 `Advance` 를 부른다. 줄 왼쪽의 화면 프레임 횟수가 그 차이다. 입력은 `RequestJump`, `RequestDash` 로 요청만 남긴다.
2. **쌓인 시간이 고정 간격만큼 있으면 규칙을 한 단계씩 돌린다**: `while (accumulator >= FixedStep)` 동안 `FixedStep` 만큼 빼며 `Stepped` 를 알리고, 받은 `Runner.Step(fixedStep)` 이 중력, 점프, 돌진, 벽을 한 단계 진행한다. 규칙에 들어가는 시간이 늘 같은 0.02초라, 기기가 달라도 같은 단계를 같은 순서로 밟는다. 돌진 0.2초도 시작할 때 `Math.Max(1, (int)Math.Round(DashTime / step))` 단계(10단계)로 바꿔 정수로 센다. float 타이머를 빼며 `> 0` 으로 세면 간격과 float 오차에 따라 한 단계 더 돌거나 덜 돈다. 간격이 0.2초를 나누지 못하면(0.03초면 7단계 3.15m) 거리가 조금 다르므로, 간격과 상관없이 같은 거리가 필요하면 남은 거리를 두고 한 단계에 `Math.Min(DashSpeed * step, remaining)` 만큼만 간다. 그래서 세 줄의 최고 높이(0.72m), 착지(점프 뒤 18단계), 돌진(3.00m)이 같다. 요청한 입력은 다음 단계가 읽으므로, 단계가 없는 144fps 프레임에 눌러도 놓치지 않는다 (그 대신 한 단계까지 늦게 뛴다).
3. **한 프레임에 너무 많이 쌓이면 상한까지만 돌리고 버린다**: 렉으로 화면 프레임 하나가 0.30초 걸리면 15단계가 쌓인다. 다 돌리면 그 프레임이 더 길어지고 다음 프레임에 더 쌓이는 죽음의 나선이 될 수 있어, `maxStepsPerFrame`(5)번 돈 뒤 남은 시간을 버리고 `Dropped` 로 알린다. 하린은 그만큼 늦을 뿐, 한 단계에 0.3m 씩만 가며 단계마다 벽을 검사해 벽을 건너뛰지 않는다. 줄 왼쪽의 "버린 시간" 이 쌓인 몫이다.
4. **화면은 마지막 두 단계 사이를 보간해 그린다**: `Runner.Step` 은 단계 처음에 `PrevX`, `PrevY` 를 남긴다. 화면은 `Alpha`(쌓인 시간 ÷ 고정 간격)로 직전 단계와 지금 단계 사이를 섞어 그린다. 144fps 기기는 화면 프레임 셋에 한 단계 정도라, 보간이 없으면 하린이 계단처럼 끊겨 움직인다 (Unity 의 `Interpolate` 칸으로 꺼 볼 수 있다). 무대의 144fps 줄에서 흐린 하린이 규칙 위치(`X`, `Y`), 진한 하린이 보간한 화면 위치다 (굵은 간격 시나리오에서 잘 보인다). 보간은 화면에만 쓰고 규칙 상태는 바꾸지 않는다. 그 대가로 화면은 한 단계까지 늦게 보인다.

## 주의할 점
- Unity 의 `FixedUpdate` 가 바로 이 패턴이다: 엔진이 시간을 쌓아 `Time.fixedDeltaTime` 간격으로 한 화면 프레임에 `FixedUpdate` 를 0번 이상 부르고, Project Settings > Time 의 Maximum Allowed Timestep 이 상한 구실을 한다. 이 표본은 웹 무대와 같은 코어를 보이려고 `Update` 에서 `FixedStepper.Advance(Time.deltaTime)` 을 직접 부른다. `FixedUpdate` 로 옮기려면 거기서 `Runner.Step(Time.fixedDeltaTime)` 만 부르고, 입력은 지금처럼 InputAction 콜백에서 요청만 남긴다 (`FixedUpdate` 에서 "이번 프레임에 눌림" 을 읽으면 놓친다). 그러면 `Stepper.Alpha` 가 없어지므로, `Update` 의 보간 비율은 `(Time.time - Time.fixedTime) / Time.fixedDeltaTime` 으로 구한다.
- `Fixed Step` 은 `Time.fixedDeltaTime` 과 따로 논다. 이 컴포넌트는 Rigidbody 를 쓰지 않고 Transform 만 옮긴다. Rigidbody 로 움직이는 오브젝트와 섞으면 둘의 단계가 어긋나므로, 물리 엔진과 함께 쓸 규칙은 `FixedUpdate` 로 옮긴다. `Fixed Step` 칸은 0.005~0.05 슬라이더다: 한 단계 돌진(15 × 간격)이 벽 두께 + 몸 폭(0.8m)을 넘는 0.054 부터는 코어도 벽을 건너뛴다. Play 중에 바꾼 `Fixed Step`, `Max Steps Per Frame`, `Jump Speed` 는 `OnValidate` 가 코어에 넣어 다음 단계부터 쓰고, `Lag Spike` 는 다음 렉부터 쓴다.
- `Target Frame Rate` 는 `Application.targetFrameRate` 에 넣는다. 6000.3 문서대로 데스크톱에서는 `QualitySettings.vSyncCount` 가 0 이 아니면 이 값이 무시되고 모니터 주사율을 따르므로, `OnEnable` 이 `QualitySettings.vSyncCount = 0` 으로 VSync 를 끈다 (Edit > Project Settings > Quality 의 VSync Count 를 Don't Sync 로 둔 것과 같다. 시연용이다). Editor 에서는 Game 뷰에만 듣는다. Game 뷰 왼쪽 위의 화면 프레임 횟수로 실제로 몇 번 돌았는지 본다.
- E(렉)는 다음 `Update` 에서 `System.Threading.Thread.Sleep` 으로 메인 스레드를 `Lag Spike` 초 재운다. 렉 프레임의 `Time.deltaTime` 은 Sleep 시간 + 보통 프레임 시간이고, `Time.maximumDeltaTime`(Maximum Allowed Timestep, 기본 0.3333초)을 넘지 않게 잘린다. 그래서 `Lag Spike` 0.3 이면 60fps 에서 약 0.317초, 30fps 에서는 자르는 경계 0.333초에 닿고, 0.5 로 해도 0.333초다. 웹 무대의 4.5m · 7.5m 는 Unity 의 나쁜 예에서 약 4.75~5m 가 된다. 시연용이라 실제 게임에는 두지 않는다.
- 왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다. 횟수 글은 매 프레임 바뀌어 `Update` 에서 고친다.
- `OnDisable` 에서 `Stepper.Stepped -= Runner.Step` 을 뗀다. 떼지 않으면 껐다 켤 때 두 번 붙어 고정 단계 하나에 규칙이 두 번 돈다 (점프가 두 배 빨라진다).

## 흔한 실수
- **내 PC 에서는 점프가 높은데 노트북에서는 낮다**: 중력과 속도를 `Update` 에서 `Time.deltaTime` 으로 바로 적분했다. `velocityY -= gravity * dt; y += velocityY * dt;` 는 속도를 먼저 깎고 그 속도로 위치를 옮기는 순서(semi-implicit Euler)라, 처음 속도가 g·dt/2 만큼 작은 셈이 되어 최고 높이가 약 (v0 - g·dt/2)² / 2g 다. 점프 속도 8 이면 30fps 0.67m, 60fps 0.73m, 144fps 0.77m 이고 공식 v0² / 2g 는 0.80m 다. 두 줄의 순서를 바꿔 위치를 먼저 옮기면(explicit Euler) 반대로 30fps 가 가장 높이 뜬다. 어느 쪽이든 결과가 dt 에 달린 것이 문제다. 규칙을 고정 간격(`FixedUpdate` 나 이 표본의 `FixedStepper`)으로만 진행하면 같은 적분이라도 기기와 상관없이 같은 높이(0.02초면 0.72m)가 된다. 물리를 `Update` 에서 돌리는 것도 같은 문제다.
- **`Time.deltaTime` 을 빠뜨려 빠른 PC 에서 캐릭터가 더 빨리 달린다**: `x += speed;` 처럼 프레임마다 같은 거리를 더하면 1초에 프레임 수만큼 움직여 144fps 는 30fps 의 4.8배를 간다. 타이머를 `timer -= 1f / 60f;` 처럼 60fps 를 가정해 빼도 같다. 프레임마다 쓰는 값에는 dt 를 곱한다. 중력처럼 힘이 일정하면 `y += v * dt - 0.5f * g * dt * dt;` 다음에 `v -= g * dt;` 로 적분해 높이 차가 거의 사라진다. 그래도 충돌(긴 프레임 하나에 벽을 건너뜀), 같은 입력에 같은 결과(결정성·리플레이), 공식이 없는 힘(마찰, 스프링, 조종)은 dt 에 따라 달라지므로 규칙은 고정 간격으로 돌린다.
- **렉이 한 번 튀자 캐릭터가 얇은 벽을 뚫고 나갔다**: 한 프레임이 길면 그 dt 로 한 번에 멀리 가고, "지금 겹쳤는가" 만 보는 검사는 벽을 건너뛴다. 고정 간격으로 나누면 한 단계의 이동이 `속도 × fixedStep` 을 넘지 않아 단계마다 벽을 검사한다. 이 거리가 벽 두께 + 몸 폭보다 짧아야 하므로, 아주 빠른 물체는 지나온 길을 검사(스윕)하거나 Rigidbody 의 Collision Detection 을 Continuous 로 둔다.
- **렉이 한 번 오면 게임이 점점 더 느려지다가 멈춘다**: 밀린 시간을 모두 따라잡으려고 한 프레임에 단계를 끝없이 돌렸다. 단계를 많이 돈 프레임은 더 오래 걸리고, 다음 프레임에 더 많이 쌓여 더 많이 돈다 (죽음의 나선). 한 프레임의 단계 수에 상한(`maxStepsPerFrame`)을 두고 넘친 시간은 버린다. 게임이 잠깐 느려지는 대신 멈추지 않는다. Unity 에서는 Project Settings > Time 의 Maximum Allowed Timestep 이 이 구실을 한다.
- **점프 키를 눌렀는데 가끔 안 먹는다**: "이번 프레임에 눌렸다" 는 값(`wasPressedThisFrame`)을 `FixedUpdate` 에서 읽었다. 고정 단계는 화면 프레임마다 돌지 않아서 (144fps 는 대부분의 프레임에 단계가 없다) 그 프레임의 누름을 보지 못한다. 입력은 `Update` 나 InputAction 콜백에서 받아 요청으로 남기고, 다음 고정 단계가 읽고 지운다 (이 표본의 `RequestJump`).

## 변형 예시
- 이미 FixedUpdate 와 Rigidbody2D 로 움직이는 플레이어에 점프 입력을 놓치지 않게 넣고 싶다.
- 슬로 모션 중에는 쌓는 시간에 배율을 곱하고, 일시정지 중에는 쌓지 않게 하고 싶다.
- 아주 빠른 총알이 얇은 벽을 뚫지 않게 지나온 길을 검사하고 싶다.
- 같은 입력 기록을 다시 넣으면 같은 결과가 나오는 리플레이를 만들고 싶다.
- 적 AI 는 0.1초 간격으로만 생각하고 이동은 매 단계 하게 나누고 싶다.
