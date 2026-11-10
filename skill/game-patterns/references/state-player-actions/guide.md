# 상태 패턴: 플레이어 행동 (State Pattern: Player Actions)

bool 덩어리 대신 지금 상태 객체가 입력과 시간을 처리한다

패턴: 상태 패턴. 난이도 1/3. 주제: 상태 기계, 입력 처리, 캐릭터 조작.

## 파일
- `Core/Player.cs`
- `Core/PlayerStates.cs`
- `Unity/PlayerController.cs`

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/state-player-actions/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. 캐릭터 오브젝트에 `PlayerController` 를 붙인다. 붙이는 순간 `Reset` 이 기본 키(Space 점프, X 공격, D 이동 켜기/끄기, C 피격 시연)를 넣는다. D 는 누를 때마다 걷기와 멈춤이 바뀌고, 시작 자리 기준 왼쪽 2.5m, 오른쪽 10.5m 에서 돌아선다. 웹 갤러리 무대의 ↑/↓ 는 갤러리 단축키를 피한 것이라 Unity 와 다르다.
3. `Main Camera` 를 Position (4, 1, -10) 에 두고 Projection 을 `Orthographic`, Size 를 4.5 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). 캐릭터를 (0, 0, 0) 에 두면 걷는 범위 x -2.5~10.5 와 점프가 모두 보인다.
4. Animator 가 있으면 `Animator` 칸에 넣고, 상태 이름과 같은 Animator 상태(Idle, Run, Jump, Attack, HitStun)를 만든다. Idle 을 기본 상태(Set as Layer Default State)로 둔다. 시작 상태는 바뀐 적이 없어 CrossFade 되지 않기 때문이다. 공격 판정 오브젝트가 있으면 `Attack Hitbox` 칸에 넣는다.
5. 적의 공격 판정에서 `PlayerController.TakeHit()` 을 부른다. 그 전까지는 C 키로 피격을 흉내 낸다.
6. Play 하고 공격(X) 중에 점프(Space)를 눌러 본다. Console 에 상태가 바뀔 때마다 `[Player] Idle → Attack` 처럼 남는다.

## 확인
공격(X) 중에 점프(Space)를 눌러도 Console 에 `Attack → Jump` 가 나오지 않고, 공격 중에 피격(C)하면 `Attack → HitStun` 이 나오며 공격 판정 오브젝트가 바로 꺼진다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `jumpHeight` | 점프 높이 | 1.6m |
| `attackDuration` | 공격 시간 | 0.45초 |
| `hitStunDuration` | 피격 경직 | 0.6초 |
| `allowAirAttack` | 공중 공격 허용 | 끔 |
| `moveSpeed` | 이동 속도 | 3m/s |

## 동작 단계
1. **입력을 상태에 맡긴다**: `PlayerController` 는 입력을 `Player.Handle` 에 넘기고, `Player` 는 입력 종류를 묻지 않고 지금 상태 객체의 `HandleInput` 에 맡긴다. 어떤 입력을 받을지는 상태마다 다르다.
2. **상태가 입력을 거른다**: 공격 중에 점프를 누르면 `AttackState.HandleInput` 이 `null` 을 돌려준다. 이 상태는 그 입력을 받지 않는다는 뜻이라 점프가 일어나지 않는다. 기록에 "Attack 무시 (jump)" 가 남는 순간이다.
3. **Exit 와 Enter**: 상태는 `ChangeTo` 한 곳에서만 바뀐다. 공격 중에 맞으면 `AttackState.Exit` 가 공격 판정을 끄고 `HitStunState.Enter` 가 경직 시간을 넣는다. 나쁜 예는 맞은 뒤에도 공격 자세와 판정이 남는다.
4. **Tick 은 상태의 일**: 매 프레임 `Tick` 도 지금 상태가 처리한다. `JumpState.Tick` 은 중력을 적용하고 땅에 닿으면 다음 상태(대기나 이동)를 돌려준다. 시간은 `Tick(dt)` 로만 받아 에디터 없이도 돌릴 수 있다.

## 주의할 점
- 이 표본은 원리를 보이려고 `transform.position` 을 직접 옮긴다. `CharacterController` 나 `Rigidbody` 로 움직이는 게임에서는 코어가 정한 속도를 그 컴포넌트에 넘기고, 땅에 닿았는지는 그쪽 결과를 코어에 알려 준다.
- 코어의 시간은 `Tick(Time.deltaTime)` 으로 받는다. `Time.timeScale` 이 0(일시정지)이면 시간으로 넘어가는 전이(착지, 공격 끝)는 멈추지만 입력 콜백은 그대로 불려 `Idle → Jump` 처럼 바뀐다. 일시정지 중에는 입력 액션을 `Disable` 하거나 메뉴용 액션 맵으로 바꾼다.
- 입력 콜백(`performed`)은 `Update` 밖에서 불린다. 이 표본은 입력을 받는 즉시 상태를 바꾸므로 괜찮지만, 물리와 맞춰야 하는 입력은 값만 기억했다가 `Update` 나 `FixedUpdate` 에서 처리한다.

## 흔한 실수
- **상태가 바뀌었는데 이전 상태의 공격 판정이나 효과가 남는다**: `Exit` 를 비워 두거나, 상태를 바꾸는 코드가 여러 곳에 흩어져 `Exit` 를 건너뛰는 경로가 있다. 상태 변경은 `ChangeTo` 한 곳에서만 하고, 그 상태가 켠 것(판정, 이펙트, 타이머)은 그 상태의 `Exit` 에서 끈다.
- **적 두 마리가 같은 상태 객체를 쓰다가 남은 시간이 섞인다**: 상태 클래스 안에 남은 시간 같은 캐릭터별 값을 두고 상태 객체를 `static` 으로 같이 쓰면 다른 캐릭터의 값을 덮어쓴다. 캐릭터별 값은 `Player` 같은 문맥 객체에 두거나, 캐릭터마다 상태 객체를 새로 만든다.
- **Animator 의 상태와 코드의 상태가 따로 논다**: Animator 전이 조건에도 bool 을 또 두면 상태를 두 군데서 관리하게 된다. 코드의 상태가 바뀔 때(`StateChanged`) Animator 의 같은 이름 상태로 `CrossFade` 한 번만 부르고, Animator 쪽 전이 화살표는 쓰지 않는다.
- **상태 클래스가 금방 열 개가 넘는다**: 공중 공격, 지상 공격, 달리며 공격처럼 조합마다 상태를 만들면 상태가 곱으로 늘어난다. 공통 동작은 `Player` 의 도우미(`ApplyGravity`, `Walk`)로 빼고, 그래도 많으면 공중·지상 같은 상위 상태 안에 하위 상태를 두는 계층 상태 기계를 검토한다.

## 변형 예시
- 구르기(회피) 상태를 더하고, 구르는 동안에는 피격을 무시하고 싶다.
- 공격 버튼을 박자에 맞춰 연타하면 3단 콤보가 이어지게 하고 싶다.
- 공중 공격을 지상 공격과 다른 상태로 나누고 착지하면 끊기게 하고 싶다.
- 적 AI 도 같은 구조(순찰, 추적, 공격, 경직)로 만들고 싶다.
- 상태가 바뀔 때마다 Animator 의 같은 이름 상태로 CrossFade 하고 싶다.
