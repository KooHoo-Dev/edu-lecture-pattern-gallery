# 오브젝트 풀: 포탑 탄 재사용 (Object Pool: Reusing Turret Projectiles)

탄을 만들고 지우는 대신 빌려 쓰고 돌려주되, 빌릴 때 상태를 새로 맞춘다

패턴: 오브젝트 풀. 난이도 2/3. 주제: 오브젝트 풀, 객체 재사용, GC 멈춤, 탄 발사.

## 파일
- `Core/Projectile.cs`
- `Core/ProjectilePool.cs`
- `Core/Turret.cs`
- `Unity/TurretFire.cs`

모두 프로젝트의 `Assets/Patterns/object-pool-projectiles/` 아래에 같은 하위 폴더로 복사한다.

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/object-pool-projectiles/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. 탄 프리팹: 2D 프로젝트면 `GameObject > 2D Object > Sprites > Circle`, Universal 3D 프로젝트면 `GameObject > 3D Object > Sphere` 를 만들고 Scale 을 (0.3, 0.3, 0.3) 으로 한다 (Sprites 메뉴는 2D Sprite 패키지가 있어야 보인다). Sphere 의 Sphere Collider 는 지워도 된다 (명중은 코어가 가로 위치로 판정한다). 이름을 `Projectile` 로 바꾸고 Project 창으로 끌어 프리팹으로 만든 뒤 장면의 것은 지운다.
3. `GameObject > Create Empty` 로 `Turret` 을 만들어 Position (-5.5, 0, 0), Scale (1, 1, 1) 에 두고 `TurretFire` 를 붙인다. 붙이는 순간 `Reset` 이 기본 키(Q 빠른 탄, W 냉각탄, E 빠른 탄 연사)를 넣는다. `Projectile Prefab` 칸에 Project 창의 `Projectile` 프리팹을 넣는다. `Muzzle` 칸을 비우면 `Turret` 자리에서 탄이 나오고, 탄 오브젝트는 `Turret` 아래에 생긴다.
4. 표적 그림: 2D 면 Sprites > Square, 3D 면 3D Object > Cube 를 하나 더 만들어 이름을 `Target` 으로 바꾸고 Position (7.5, 0, 0) 에 둔다. 포구에서 오른쪽 13m(x 7.5)가 표적 가운데이자 화면 끝이라, 1m 표적의 왼쪽 반이 화면에 보인다. 탄은 표적 가운데(화면 끝)에서 사라진다. 명중은 코어가 가로 위치로 판정하므로 표적에 스크립트나 콜라이더가 필요 없다.
5. `Main Camera` 를 Position (0, 0, -10) 에 두고 Projection 을 `Orthographic`, Size 를 4.22 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). Game 뷰 비율을 16:9 로 두면 화면 오른쪽 끝이 x 7.5 로, 코어의 화면 끝(포구에서 13m)이자 표적 가운데와 같다.
6. Play 하고 Q 를 몇 번, 1초쯤 뒤 W, 그리고 E 를 눌러 본다. Hierarchy 의 `Turret` 아래에 `Projectile #1` ~ `#4` 가 미리 생겨 꺼져 있다가 쏠 때 켜지고, 연사로 대기 줄이 비었을 때만 `#5` 부터 새로 생긴다. Console 에 `[TurretFire] 냉각탄 #1 발사 · 속도 6.00 수명 3.50` 같은 줄이 남고, Game 뷰 왼쪽 위에 만든 수·쓰는 중·대기와 재사용 횟수가 보인다.

## 확인
Q 로 빠른 탄을 쏘고 1초 뒤 W 로 냉각탄을 쏘면 Console 에 같은 번호의 탄이 `속도 6.00 수명 3.50` 으로 나가 표적에 맞을 때 `명중 · 같은 프레임에 화면 밖도 참 → 한 번만 반납` 이 한 줄 남고, Hierarchy 의 `Projectile #n` 수는 E 연사로 대기 줄이 빌 때만 는다.

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `poolSize` | 미리 만들 탄 | 4개 |
| `fastSpeed` | 빠른 탄 속도 | 14m/s |
| `slowSpeed` | 냉각탄 속도 | 6m/s |

## 동작 단계
1. **발사하면 풀에서 대기 중인 탄을 빌린다 (없으면 새로 만든다)**: `TurretFire` 가 Q(빠른 탄)·W(냉각탄) 입력을 `Turret.Fire` 에 넘기고, `Turret` 은 `Pool.Get()` 으로 탄을 빌린다. 풀은 대기 줄의 맨 앞(마지막에 돌아온 탄)을 주고, 줄이 비었을 때만 새로 만든다. 새로 만들 때만 `Created` 가 불려 어댑터가 프리팹을 `Instantiate` 한다. 무대 위쪽 선반이 지금까지 만든 탄 전부이고, 그 아래가 대기 줄이다.
2. **빌린 탄의 모든 상태를 새로 맞춘다**: `Turret.Fire` 는 빌린 탄의 `Launch(kind, x, speed, life)` 를 부른다. 1.6초 냉각탄이 받은 #1 은 방금까지 빠른 탄으로 날던 객체지만, 종류·위치·속도·수명을 모두 이번 종류로 덮어써서 속도 6, 수명 3.5 로 난다. 탄에 필드를 더하면 `Launch` 에도 더한다. 나쁜 예에는 이 자리가 없고 `Start` 가 처음 한 번만 값을 넣어, 냉각탄 #1 이 빠른 탄 속도로 난다.
3. **명중이나 화면 밖이면 한 번만 돌려준다**: `Turret.Tick` 이 탄을 옮긴 뒤 명중(x 15 이상), 화면 밖(x 15 이상), 수명 끝을 한꺼번에 보고, 사라지는 길 하나에서 `Release` 를 한 번 부른다. 표적 드론이 화면 끝에 걸쳐 있어 냉각탄이 맞는 프레임(3.75초)에는 화면 밖도 참이지만 반납은 한 번이다. 이 배치는 겹침을 늘 보이려는 교육용이라 명중이 늘 먼저고, 코어의 `Expired` 는 수명 끝으로만 불리며 화면 밖 경우는 돌지 않는다. 다른 코드가 같은 탄을 또 돌려주면 `Release` 가 `InUse` 를 보고 받지 않는다 (`ReleaseRejected`). 기지·선반·탄의 높이는 화면에만 있고, 코어는 가로 위치(x)만 쓴다.
4. **돌려받은 탄은 다음 발사 때 다시 쓴다**: 돌려받은 탄은 대기 줄 맨 앞에 서고, `Returned` 를 받은 어댑터는 `SetActive(false)` 만 한다 (Destroy 하지 않는다). 다음 발사가 이 탄을 다시 켠다. 선반 칸 수가 그대로인 동안은 `Instantiate` 가 없고, 왼쪽 위 "재사용 n회" 가 그만큼 아낀 횟수다. 2.3초 연사처럼 한꺼번에 많이 쏘면 줄이 비어 칸이 늘고, 그 뒤로는 늘어난 칸도 함께 돈다.

## 주의할 점
- Unity 에는 `UnityEngine.Pool.ObjectPool<T>` 가 있다. `new ObjectPool<GameObject>(createFunc, actionOnGet, actionOnRelease, actionOnDestroy, collectionCheck, defaultCapacity, maxSize)` 로 만들고 `Get()`, `Release(obj)` 를 부른다. 이 표본과 짝지으면 `createFunc` 는 `ProjectilePool.Create` 와 `Created`(어댑터의 `Instantiate`), `actionOnGet` 은 `Taken`(`SetActive(true)`), `actionOnRelease` 는 `Returned`(`SetActive(false)`), `collectionCheck` 는 `Release` 의 `InUse` 검사와 `ReleaseRejected` 다. `Launch` 는 콜백 자리가 아니다. `actionOnGet` 은 객체 하나만 받는 `Action<T>` 라 종류·속도처럼 발사마다 다른 값을 받을 수 없어서, 기본값 되돌리기와 `SetActive(true)` 만 맡고, 이번 발사의 값은 `Get()` 다음에 호출자가 `Launch` 로 넣는다 (`Turret.Fire`). `collectionCheck` 의 중복 검사는 Editor 에서만 돌고, `maxSize` 를 넘겨 돌려받은 객체는 보관하지 않고 `actionOnDestroy` 로 넘긴다. 코어는 dotnet 대조를 위해 UnityEngine 을 쓰지 않는 순수 C# 로 따로 짰다. 게임에서는 `ObjectPool<T>` 를 바로 써도 된다.
- `ObjectPool<T>` 는 미리 만들지 않는다 (`defaultCapacity` 는 내부 목록의 처음 크기다). 미리 만들려면 시작할 때 `Get` 을 여러 번 한 뒤 모두 `Release` 한다. 이 표본은 `Start` 에서 `Pool.Prewarm(poolSize)` 를 부르고, `poolSize` 는 그때 한 번만 읽어 Play 중에 바꿔도 반영되지 않는다. `fastSpeed`, `slowSpeed` 는 `OnValidate` 가 코어 설정에 넣어 다음 발사부터 쓴다 (날고 있는 탄은 그대로).
- 이 표본은 원리를 보이려고 탄을 `Update` 에서 `transform.position` 으로 옮기고, 명중을 코어가 가로 위치로 판정한다 (콜라이더와 Rigidbody 가 없다). 물리로 명중을 받는 게임에서는 표적의 `OnTriggerEnter2D` 와 화면 밖 검사가 각자 반납하기 쉽다. 두 곳 모두 탄의 "사라지기" 메서드 하나를 부르게 하고, 그 메서드가 이미 반납했는지 본다.
- 탄 오브젝트는 `TurretFire` 가 붙은 오브젝트 아래에 생긴다. 그 Scale 이 (1, 1, 1) 이 아니면 탄 크기도 따라 바뀌고, 그 오브젝트를 지우면 탄도 함께 사라진다. 어댑터는 발사 순간의 포구 위치를 탄마다 저장해 그 점에서 오른쪽으로 옮긴다. 매 프레임 `muzzle.position` 을 다시 읽어 더하면 포탑을 옮길 때 날던 탄도 같이 미끄러진다. `TurretFire` 를 끄면 `Update` 가 멈춰 날던 탄이 그 자리에 멈췄다가, 다시 켜면 이어서 난다. 다시 켤 때 `OnEnable` 이 탄의 켜짐·색·위치를 지금 코어 상태로 한 번 다시 맞춘다 (꺼진 동안 놓친 이벤트가 있어도 화면이 어긋나지 않게).
- Game 뷰 왼쪽 위의 상태 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임의 화면 글은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다.
- `InputAction` 은 `OnEnable` 에서 콜백을 붙이고 `Enable`, `OnDisable` 에서 떼고 `Disable` 한다. 떼지 않으면 다시 켤 때 콜백이 두 번 붙어 한 번 누를 때 두 발이 나간다. 코드에서 만드는 액션은 `InputActionType.Button` 으로 만든다 (기본값 Value 는 다시 켤 때 눌려 있던 키를 바로 처리한다).

## 흔한 실수
- **재사용한 총알이 이전 총알의 속도로 날아간다**: 풀에서 빌린 객체에는 지난번에 쓴 값이 그대로 있다. 초기화를 `Start` 나 `Awake` 에 두면 처음 켜질 때 한 번만 돌고 (`OnEnable` 은 켤 때마다 돈다), 위치만 다시 넣으면 속도와 수명은 이전 값이다. 발사하는 쪽이 `Get` 바로 다음에 `Launch(kind, x, speed, life)` 처럼 모든 상태를 새로 넣는 메서드 하나를 부른다. `ObjectPool<T>` 의 `actionOnGet` 은 객체 하나만 받는 `Action<T>` 라 발사마다 다른 종류·속도를 넣을 수 없으니, 거기서는 기본값 되돌리기와 `SetActive(true)` 만 한다. 탄에 필드를 더할 때마다 그 메서드에 더했는지 본다. 이 표본은 코어의 `Launch` 가 그 자리이고, 어댑터는 `OnFired` 에서 화면 오브젝트의 위치와 색을 다시 맞춘다.
- **탄 하나가 갑자기 사라지거나 포구로 순간 이동한다**: 같은 탄을 두 번 돌려줬다. 명중 처리와 화면 밖 처리가 각자 `Release` 하면 둘이 같은 프레임에 참일 때 대기 줄에 같은 객체가 두 칸 들어가고, 다음 두 발이 한 객체를 나눠 받는다. 사라지는 길을 한 곳으로 모아 한 번만 돌려주고, 풀은 이미 대기 중인 객체를 받지 않게 한다. `ObjectPool<T>` 는 `collectionCheck` 가 켜져 있으면(생성자 기본값 true) 이미 돌아온 객체를 다시 `Release` 할 때 예외를 던진다. 이 검사는 Editor 에서만 돌아서 빌드에서는 조용히 두 칸이 될 수 있다. 이 표본의 `ProjectilePool.Release` 는 예외 대신 `ReleaseRejected` 로 알리고 받지 않으며, 어댑터가 경고 로그를 남긴다.
- **돌려준 탄을 계속 건드렸더니 다른 탄이 움직인다**: 반납한 객체를 가리키는 변수(유도탄의 목표, 마지막으로 쏜 탄)를 그대로 쓰면, 그 객체를 다른 발사가 빌려 간 뒤 엉뚱한 탄을 건드린다. 반납한 뒤에는 참조를 비우고, 오래 들고 있어야 하면 번호와 함께 "몇 번째 빌림"(`TimesTaken`)을 저장해 두었다가 다를 때는 쓰지 않는다. 이 표본의 `Turret` 은 반납하는 순간 `Flying` 목록에서 빼고, 어댑터는 `Turret.Flying` 에 있는 탄만 옮긴다.
- **풀을 만들었는데도 연사할 때마다 Instantiate 가 일어난다**: 풀 크기를 동시에 날 수 있는 탄 수보다 작게 잡았다. 동시에 나는 탄 수는 대략 초당 발사 수 × 수명이다. 이 표본에서 미리 만들 탄을 2개로 줄이면 연사 때 새로 만든다 (세 번째 시나리오). `ObjectPool<T>` 의 `maxSize` 가 작으면 넘친 객체를 풀이 보관하지 않고 `actionOnDestroy` 로 넘겨(보통 `Destroy`) 다음에 또 만든다. 선반이나 `CountAll`, `CountInactive` 를 보고 정한다.
- **다시 꺼낸 탄의 꼬리가 화면을 가로지르거나 지난 효과가 이어진다**: 반납할 때 끄지 않았거나 꺼낼 때 비우지 않은 붙은 상태가 있다. `TrailRenderer` 는 이전에 남은 점에서 꼬리를 이어 그릴 수 있어 위치를 옮긴 뒤 `Clear()` 한다. 탄 스크립트의 코루틴은 `SetActive(false)` 때 멈추고 다시 켜도 이어지지 않으니 `OnEnable` 에서 다시 시작한다. 파티클은 반납할 때 멈추고 비운다. 이 표본의 어댑터는 `OnFired` 에서 위치를 포구로 옮긴 뒤 프리팹에 `TrailRenderer` 가 있으면 `Clear()` 한다. 탄 프리팹에는 스크립트가 없어 끌 코루틴은 없다.

## 변형 예시
- 적이 쏘는 탄막(원형, 부채꼴)도 같은 풀에서 빌려 쓰고 싶다.
- 명중 이펙트(파티클)와 피해 숫자 팝업도 풀로 돌리고 싶다.
- Unity 의 ObjectPool<T> 로 바꾸되 actionOnGet 에서는 기본값만 되돌리고, Get 다음에 Launch 로 발사 값을 넣고 싶다.
- 유도탄이 반납되어 다른 발사에 쓰인 탄을 계속 쫓지 않게 하고 싶다.
- 탄 종류마다 풀을 따로 두고 종류별로 미리 만들 수를 정하고 싶다.
