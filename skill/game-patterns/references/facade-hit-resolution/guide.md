# 퍼사드 패턴: 명중 처리 창구 (Facade Pattern: Hit Resolution)

명중 처리 다섯 단계를 창구 하나가 맡고, 공격하는 곳은 창구만 부른다

패턴: 퍼사드 패턴. 난이도 1/3. 주제: 명중 처리, 창구, 중복 제거, 전투 시스템.

## 파일
- `Core/Attackers.cs`
- `Core/CombatSystem.cs`
- `Core/Drone.cs`
- `Core/HitSubsystems.cs`
- `Unity/CombatHub.cs`
- `Unity/GunInput.cs`
- `Unity/ShockDroneInput.cs`
- `Unity/TrapZone.cs`

모두 프로젝트의 `Assets/Patterns/facade-hit-resolution/` 아래에 같은 하위 폴더로 복사한다.

## 넣는 순서
1. `Core/` 와 `Unity/` 폴더를 `Assets/Patterns/facade-hit-resolution/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.
2. 드론 셋과 하린을 만든다. 2D 프로젝트면 `GameObject > 2D Object > Sprites > Triangle`, Universal 3D 프로젝트면 `GameObject > 3D Object > Cube` 를 세 번 만들어 이름을 `D1`, `D2`, `D3`, Position 을 (1, 0, 0), (3, 0, 0), (5, 0, 0) 으로 둔다. 하린은 2D 는 `Sprites > Capsule`, 3D 는 `3D Object > Capsule` 로 (-4, 0, 0) 에 둔다 (Sprites 메뉴는 2D Sprite 패키지가 있어야 보인다). 모양만 보이는 오브젝트라 스크립트를 붙이지 않는다.
3. 빈 오브젝트(`GameObject > Create Empty`)의 이름을 `CombatHub` 로 바꾸고 `CombatHub` 컴포넌트를 붙인다. `Drone Objects` 칸(크기 3)의 Element 0, 1, 2 에 D1, D2, D3 을 차례로 끌어 넣는다. 파괴 처리된 드론은 이 오브젝트가 꺼진다. 창구는 이 컴포넌트 하나이고 싱글턴이 아니다.
4. 하린에 `GunInput` 을, `CombatHub` 오브젝트에 `TrapZone` 과 `ShockDroneInput` 을 붙인다. 붙이는 순간 `Reset` 이 기본 키(Q 총, W 함정, E 전기 충격)를 넣는다. 셋의 `Hub` 칸에 `CombatHub` 오브젝트를 끌어 넣는다. 함정은 이 어댑터에서 웹 무대와 같게 키로 터뜨리고, 맞는 드론은 코어가 정한 함정 자리(D1)라 Collider 가 없어도 된다.
5. `Main Camera` 를 Position (0.5, 1, -10) 에 두고 Projection 을 `Orthographic`, Size 를 4 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). 하린(x -4)부터 D3(x 5)까지 보인다. 피해 숫자는 `Camera.main` 으로 자리를 잡으므로 카메라의 Tag 는 `MainCamera` 그대로 둔다.
6. Play 하고 Q 를 두 번, W 를 한 번 누른다. 맞은 드론 위에 피해 숫자가 잠깐 뜨고, Game 뷰 왼쪽 위의 마지막 명중이 `Trap → D1: 계산 5-0=5 ✓ 표시 ✓ 적용 ✓ 알림 ✓ 파괴 ✓` 가 되며 D1 이 꺼지고 크레딧이 10 이 된다. 이어서 E 를 누르면 D3 이 HP 10/10 에서 6/10 이 된다. Console 에는 `[Combat] Trap → 창구 Hit(D1, 기본 5)`, `[Combat] 파괴 D1 (화면에서 뺀다)` 처럼 웹의 사건 기록과 같은 줄이 차례로 남는다.

## 확인
W(함정)로 D1 을 마무리해도 D1 오브젝트가 꺼지고 크레딧이 10 오르며, E(전기 충격)는 D3 의 HP 를 6 이 아니라 4 씩 깎는다 (Armor 2).

## 기본 Inspector 값
| 필드 | 뜻 | 값 |
|---|---|---|
| `armor` | 중장갑 방어력 | 2 |
| `trapDamage` | 함정 피해 | 5 |
| `shockDamage` | 전기 충격 피해 | 6 |

## 동작 단계
1. **공격하는 쪽은 "누가 누구에게 얼마" 만 넘긴다**: `Gun.Fire`, `Trap.Trigger`, `ShockDrone.Zap` 은 노릴 드론만 고르고 `combat.Hit("Gun", 드론, 4)` 한 줄을 부른다. 방어력도, 숫자도, 크레딧도 모른다. 노릴 드론이 없거나 이미 파괴된 드론이면 창구가 받지 않고 `HitRefused` 로 알린다.
2. **창구가 피해를 계산하고 숫자를 띄운다**: 창구는 계산을 `DamageCalculator.Final(기본, 방어력)` 에 맡기고(빼기, 최소 1) 그 값을 `HitFeed.ShowDamage` 로 띄운다. 창구가 직접 빼지 않으므로 피해 규칙이 바뀌면 계산기 한 곳만 고친다. 중장갑 D3 에 전기 충격 6 이 오면 6 - 2 = 4 가 뜬다.
3. **HP 를 고치고 알린다**: `Drone.TakeDamage` 가 받은 값만큼 HP 를 깎고(0 아래로 내려가지 않는다), `HitFeed.NotifyHit` 이 "맞았다" 고 알린다. 피격 효과, 소리, 퀘스트 집계는 `HitTaken` 을 구독하면 되고 창구는 그들을 모른다.
4. **HP 가 0 이면 파괴와 보상까지 창구 안에서**: `if (target.Hp == 0) Wreckage.Destroy(target);` 가 창구 안에 한 번만 있다. 총이든 함정이든 전기 충격이든 마지막 한 방을 넣은 쪽과 상관없이 드론을 화면에서 빼고 크레딧을 준다. 함정으로 D1 을 마무리해도 D1 이 쓰러지고 크레딧이 10 오른다.

## 주의할 점
- `CombatHub` 의 `Combat` 과 `Field` 는 처음 읽을 때 만든다 (`??=`). 공격 컴포넌트는 키를 누를 때 처음 읽으므로 오브젝트 사이의 `Awake` 순서와 상관없다. `Hub` 칸이 비어 있으면 공격 컴포넌트가 `OnEnable` 에서 오류를 남기고 스스로 꺼진다.
- 창구를 싱글턴으로 만들지 않고 Inspector 칸으로 연결했다. `CombatHub` 를 씬에 둘 두면 공격 컴포넌트마다 다른 창구가 들어가 드론과 크레딧이 두 벌이 된다. 창구는 하나만 두고 모든 공격 컴포넌트의 `Hub` 칸에 같은 오브젝트를 넣는다.
- 이 어댑터의 함정은 키로 터지고 물리 트리거가 없다. 드론이 걸어 들어오는 함정이 필요하면 함정에 Collider 를 Is Trigger 로 두고 2D 는 `OnTriggerEnter2D`, 3D 는 `OnTriggerEnter` 에서 들어온 드론을 찾아 같은 `combat.Hit("Trap", 드론, trapDamage)` 한 줄을 부른다. 두 콜라이더 중 하나에 Rigidbody(2D 는 Rigidbody 2D)가 있어야 콜백이 불린다.
- 파괴된 드론은 `Destroy` 하지 않고 `SetActive(false)` 로 끈다. 창구가 오브젝트가 아니라 코어 드론의 `IsDestroyed` 를 보고 다음 명중을 받지 않으므로, 꺼진 드론을 노린 전기 충격은 Console 에 `[Combat] ShockDrone → 창구: D3 이미 파괴됨, 받지 않는다` 로 남는다.
- `armor`, `trapDamage`, `shockDamage`, `gunDamage` 는 Play 중에 Inspector 에서 바꾸면 `OnValidate` 가 코어에 넣는다. 드론 HP 와 크레딧은 처음 만든 코어에 남으므로 처음부터 다시 하려면 Play 를 다시 누른다.
- 피해 숫자와 왼쪽 위 글은 IMGUI(`OnGUI`)로 그리는 확인용이다. 실제 게임에서는 `Feed.DamageShown` 을 구독하는 컴포넌트가 TextMeshPro 숫자를 띄우면 된다. 그렇게 바꿔도 창구와 공격 코드는 그대로다.

## 흔한 실수
- **함정으로 쓰러뜨린 드론만 HP 0 인 채 서 있다**: 공격 코드마다 명중 처리 절차를 복사했고, 한 곳(함정)이 마지막 파괴 단계를 빠뜨렸다. 복사본은 처음에 맞아도 고칠 때마다 갈라진다. 다섯 단계를 `CombatSystem.Hit` 한 곳에 두고 공격하는 쪽은 `combat.Hit(...)` 한 줄만 부른다. 그러면 새 공격(독가스, 폭발)을 더해도 파괴를 빠뜨릴 자리가 없다.
- **방어력 규칙을 넣었는데 전기 충격만 중장갑을 그대로 뚫는다**: 규칙을 바꿀 때 복사본 일부(총, 함정)만 고쳤다. 같은 일이 약점, 치명타, 버프를 더할 때마다 되풀이된다. 피해 계산은 `DamageCalculator.Final` 하나에 두고 창구가 언제나 거치게 한다. 규칙이 바뀌면 그 메서드만 고친다.
- **창구 클래스가 수백 줄이 되어 아무도 고치지 못한다**: 창구가 계산, 숫자 띄우기, 소리, 보상을 직접 다 하는 신 객체(God Object)가 되었다. 퍼사드는 순서만 정하고 일은 하위 시스템에 맡긴다. 이 표본의 `Hit` 은 단계마다 하위 시스템 메서드 한 줄씩이다. 단계 안의 일이 커지면 그 하위 시스템을 키운다.
- **새로 만든 공격이 숫자도 안 띄우고 드론도 안 터뜨린다**: 창구를 거치지 않고 `drone.TakeDamage(…)` 를 직접 불렀다. 퍼사드는 하위 시스템을 숨길 뿐 막지 않는다 (`TakeDamage` 는 public 이다). 하위 시스템을 직접 쓰는 것은 명중이 아닌 일(회복, 디버그 명령)에 남겨 두고, 명중은 언제나 `Hit` 으로 넘긴다. 팀 규칙으로 정하고 코드 리뷰에서 본다.
- **터진 드론에 한 번 더 맞아 크레딧이 두 번 들어온다**: 파괴된 대상에 다시 명중 처리를 했다. Unity 의 `Destroy(gameObject)` 는 그 프레임이 끝난 뒤에 지워지므로, 같은 프레임의 두 번째 명중에서는 `target == null` 검사가 아직 통과한다. 이 표본은 파괴 처리에서 코어 드론의 `IsDestroyed` 를 바로 세우고, 창구가 그것을 보고 받지 않으며 `HitRefused` 로 알린다.

## 변형 예시
- 불타는 바닥처럼 시간마다 피해를 주는 공격을 더하고 싶다. 파괴와 보상은 그대로 창구가 하게.
- 치명타(확률로 2배)를 넣고 싶다. 공격하는 쪽 코드는 고치지 않고.
- 하린이 맞을 때도 같은 창구를 쓰고, 하린의 HP 가 0 이면 게임 오버를 띄우고 싶다.
- 드론 종류마다 파괴 보상과 터지는 효과를 다르게 하고 싶다.
- 피격 알림을 받아 피격음, 화면 흔들림, 퀘스트 집계가 각자 반응하게 하고 싶다.
