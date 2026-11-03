// 묶음 3 수정 (2026-11-03): 독립 리뷰 지적. 네 표본 모두 판정은 "수정 뒤 병합 가능". 리뷰 요약은 _review/<id>/review-summary.md (커밋 안 함).
const GUIDE = '**가이드가 바뀌었다** (`docs/specimen-guide.md`): 3절 (이벤트로 맞추는 화면은 `OnEnable` 에서 다시 맞추기, IMGUI 확인용 글, 거리 경계 깜박임), 4절 ("같은 버그는 한 번" = 같은 대상의 같은 종류는 한 번, 결과 증상은 다른 이름이나 일반 사건 줄로). 무대의 문제 줄 칸이 이제 `// [!]` 뒤 설명도 보이므로, 설명을 짧고 분명하게 (한 줄 안팎) 다듬는다.'

export default [
  {
    id: 'state-drone-ai',
    fix: true,
    budgetUsd: 8,
    items: [
      '**Unity 에서 공격↔추격이 매 프레임 깜박일 수 있다.** `AttackState` 에 들어가는 경계(`<= attackRange`)와 나가는 경계(`> attackRange`)가 같아, 플레이어가 드론보다 느리게 계속 물러나면 매 프레임 전이하고 `CrossFade` 가 매 프레임 다시 불린다 (웹은 걸음 단위라 안 보인다). 나가는 거리에 여유를 둔다 (예: `attackRange + 0.5` 를 넘어야 추격으로. 여유 값은 상수나 조절 값으로, 글에 이유를 적는다). Core 를 바꾸면 sim·Target 과 기록을 함께 고친다 (`node tools/truth.mjs state-drone-ai`). 시나리오 note 의 시각도 기록에 맞춘다 (가이드 3절).',
      '**`mistakes[4]` (파괴된 드론이 떨림)가 이 어댑터에서는 맞지 않는다.** `DroneController.Update` 가 모든 상태에서 매 프레임 위치를 코어 값으로 덮어써, 다른 코드의 이동(넉백 등)은 실행 순서에 따라 조용히 무시되거나 한 프레임 튈 뿐이다. 이 어댑터 동작에 맞게 고쳐 쓴다.',
      '**자동 데모 끝 화면에서 `잔해 드론 · 파괴` 이름표가 하린 캡슐 위에 겹친다** (`_review/state-drone-ai/live-t6.2-*`). 겹치지 않게 옮긴다. 구조 그림의 `change` 화살표가 `AttackState → Drone` 에만 있어 다른 전이 때도 AttackState 가 부른 것처럼 빛난다 → 라벨을 "상태들이 ChangeState" 로 하거나 지금 전이를 부른 상태에서 빛나게. 프리셋 `hunter` 글의 "7.5m 밖에서 알아채고" → "7.5m 앞에서".',
      '**코어 다듬기**: `AttackState.Tick` 에서도 `FaceTarget()` (공격 중 대상이 드론을 지나치면 등을 돌린 채 쏜다. sim 의 사격 화살표 시작점도). `DestroyedState.Exit` 에 "나가는 전이가 없어 되돌리지 않는다. 부활을 더하면 여기서 속도를 되돌린다" 주석 (Enter 에서 바꾼 것을 Exit 에서 되돌린다는 원칙과 맞추기). 나쁜 예의 읽히지 않는 `isCharging` 은 지우거나 의도를 주석으로.',
      '**어댑터**: `OnValidate` 가 `Speed > 0` 이 아니라 상태(공격·파괴가 아닐 때)로 속도를 다시 넣게. `OnEnable` 에서 Animator 를 지금 코어 상태로 다시 맞춘다 (가이드 3절). `CrossFade` 의 0.05 는 정규화 시간이라 `CrossFadeInFixedTime` 이 더 분명하다 (선택).',
      '**`state-player-actions` 와의 대비 글**: 단계 1 의 "입력이 아니라 거리와 체력이 전이를 일으킨다" 는 `hit` 입력이 파괴 전이를 일으키는 것과 부딪힌다 → "입력을 상태에 넘기지 않고, 상태가 조건(거리·HP)을 보고 스스로 전이한다" 로. 두 표본의 `Tick` 방식 차이 (그쪽은 다음 상태를 돌려줌, 이쪽은 상태가 `ChangeState` 를 부름) 를 한 문장. `mistakes` 중 그쪽과 거의 같은 항목(전이가 흩어져 Exit 를 건너뜀)은 `TakeHit` 경로 중심으로 줄여 겹침을 덜고, 상태 객체 공유 항목은 이 표본이 실제로 static 한 벌을 쓰므로 남긴다. 둘째 ✖ offNote 에 "0.02 에 머문다" 가 한 프레임 dt 라는 것을 덧붙인다. 그리고 Unity 경계 깜박임과 해법을 `unity.pitfalls` 에.',
      GUIDE,
    ],
  },
  {
    id: 'object-pool-projectiles',
    fix: true,
    budgetUsd: 8,
    items: [
      '**Unity 설정대로 하면 표적이 화면에 안 보인다.** 카메라 Size 4.22, 16:9 면 오른쪽 끝이 x 7.5 인데 1m Cube 를 (8,0,0) 에 두면 통째로 밖이다. 표적을 (7.5,0,0) 에 두고 "탄은 표적 가운데(화면 끝)에서 사라진다" 로 고친다. 웹도 `TARGET_X = 15.5` 라 삼각형이 화면 끝 선 바깥에 그려진다 → 15.0 안팎으로 옮겨 실제로 걸치게 (기록 대조에 쓰이는 값이면 C# 와 함께 바꾸고 기록을 다시 만든다).',
      '**`unity.pitfalls[0]` 의 `ObjectPool<T>` 대응이 부정확하다.** `actionOnGet` 은 `Action<T>` 라 종류·속도 같은 발사마다 다른 값을 받을 수 없다. `Launch` 는 "Get 다음에 호출자가 하는 초기화" 자리이고, `actionOnGet` 은 기본값 되돌리기·`SetActive` 만 맡는다고 고쳐 쓴다 (Unity 문서로 확인됨: 콜백 이름, `collectionCheck` 는 Editor 에서만, `defaultCapacity` 는 미리 만들지 않음, `maxSize` 넘치면 `actionOnDestroy`).',
      '**같은 ✖ 를 두 번 쓴다.** 5.50초에 날던 `#6` 을 또 빌리면 `같은 탄을 또 빌려 줌` 과 함께 `이전 상태 재사용` 이 다시 찍힌다 (5.20초에 이미 보고한 같은 객체). 이미 켜진 객체(`wasActive`)면 `이전 상태 재사용` 은 건너뛴다 (가이드 4절). Target 과 sim 을 같게 고치고 기록을 다시 만든다.',
      '**다시 빌린 탄의 "있어야 할 자리" 점선 상자가 엉뚱한 곳에 있다.** 이미 켜진 객체는 `SetActive(true)` 가 아무것도 하지 않아 `Age` 가 0 으로 안 돌아가, 5.5초 발사가 아니라 5.2초 발사의 자리에 그려진다. 다시 빌린 순간을 기준으로 그린다. "#6 이 사라진 자리" 글이 `빠름` 라벨과 겹치지 않게.',
      '**억지 배치를 교육 장치로 밝힌다.** 표적을 화면 끝에 걸쳐 명중과 화면 밖이 늘 같은 프레임에 겹치게 했다 (코어의 화면 밖 경로는 돌지 않는다). 글에 "실제 게임에서는 둘이 같은 프레임에 겹치는 일이 드물어 이중 반납이 가끔만 난다 → 재현이 어려운 버그다. 이 표본은 늘 겹치게 놓았다" 한 문장. 카드의 "위치만" 과 달리 나쁜 예가 위치와 종류를 맞추는 것은 받아들인다 (냉각 라벨이 빠르게 나는 증상을 보이려고). offNote 와 맞는지만 확인한다.',
      '**자잘한 것**: Unity 의 날던 탄이 매 프레임 `muzzle.position` 을 따라가 포탑을 옮기면 같이 미끄러진다 → 발사 때 시작점을 저장하거나 pitfall 한 줄. preset `standard` 의 "연사 때 두 개를 더 만든다" 를 실제(냉각탄 때 하나 더)와 맞춘다. 자동 데모 note 를 두 문단으로 나눈다.',
      GUIDE,
    ],
  },
  {
    id: 'factory-drone-spawner',
    fix: true,
    budgetUsd: 8,
    items: [
      '**Unity 어댑터에 종류마다 복붙하는 코드가 남아 있다.** `WaveSpawnerInput` 이 스포너마다 프리팹 칸·핸들러(`OnScoutSpawned` 등)·`+=`/`-=` 줄을 따로 둬, 종류를 더하려면 여러 곳을 고쳐야 한다 (이 표본이 고치려는 "복붙하다 한 줄 빠짐" 이 어댑터에서 다시 생긴다). 글(goals, 단계 2, 어댑터 주석)은 "스포너 클래스 하나와 목록 한 칸만" 이라고 한다. 어댑터를 (스포너, 프리팹) 쌍 목록 하나와 반복문 구독으로 바꾼다 (해제용 델리게이트를 저장해 `OnDisable` 에서 뗀다). 그러면 종류를 더할 때 Core 의 스포너 클래스 하나 + 목록 한 칸 + Inspector 의 프리팹 한 칸이다. 글을 그에 맞춘다.',
      '**`mistakes[2]` 제목이 Core 의 정답 코드와 부딪힌다.** 제목 "`new ScoutDrone()` 을 했더니 경고" 인데 `Core/DroneSpawner.cs` 의 정답이 바로 `new ScoutDrone()` (순수 C# 객체)이다. 제목을 MonoBehaviour 를 `new` 한 경우로 바꾼다 (예: "MonoBehaviour 인 `DroneView` 를 `new` 했더니 경고가 나고 화면에 없다"). 본문에 "`== null` 이 참이라 null 검사 분기가 조용히 건너뛰어진다" 한 문장.',
      '**"훅" 이 두 뜻으로 쓰인다.** `CreateDrone` 은 "자식이 반드시 채우는 단계(추상 단계)", 훅이라는 말은 기본 본문이 있는 선택 단계 `OnSpawned` 에만 쓴다 (단계 3, goals). 구조 그림 `spawner-drone` 화살표 라벨은 "CreateDrone() (자식 구현)".',
      '**`✖ 레이더 누락` 이 3.5초와 4.3초 두 번 뜬다.** 둘째("웨이브 끝을 알렸는데 …")는 첫째의 결과다. 가이드 4절대로 둘째를 다른 종류 이름(예 `✖ 거짓 웨이브 끝`, 결과임을 글에 밝힘)이나 ✖ 가 아닌 사건 줄로 바꾼다. 다른 종류로 하면 그 종류도 자동 데모에 나오는지 확인하고, 원인 줄 규칙(결과면 글에 밝힘)을 지킨다. Target 과 sim 을 같게 고치고 기록을 다시 만든다.',
      '**`unity.setup` 문구**: 2단계 "빈 자식" 은 "`ScoutDrone` 우클릭 > Create Empty" (자식, 로컬 좌표). 3단계 프리팹으로 끌 때 Original Prefab / Prefab Variant 를 묻는 창에서 무엇을 고르는지 (Original Prefab).',
      '**글 길이**: offNote(9문장), 첫 시나리오 note(6문장)를 수업에서 읽기 좋게 줄인다. 드론이 많아지면 HP 바가 "웨이브 끝" 상자와 겹치는 것은 상자 위치를 옮겨 피한다 (선택).',
      GUIDE,
    ],
  },
  {
    id: 'facade-hit-resolution',
    fix: true,
    budgetUsd: 8,
    items: [
      '**`unity.setup` 2단계와 4단계가 모순된다.** 2단계는 "하린과 드론은 스크립트를 붙이지 않는다", 4단계는 "하린에 `GunInput` 을 붙인다". "드론에는 스크립트를 붙이지 않는다 (하린에는 4단계에서 `GunInput`)" 로 고친다. `Unity/TrapZone.cs` 머리 주석("D1 발밑에 둔다")도 setup(빈 `CombatHub` 오브젝트에 붙임)과 맞춘다.',
      '**두 번 파괴를 막지 않는다.** `HitTaken` 구독자가 같은 드론에 `Hit` 을 다시 부르면(폭발 연쇄, 반격) 안쪽에서 파괴·보상 뒤 바깥 `Hit` 이 `Hp == 0` 을 다시 보고 `Wreckage.Destroy` 를 또 불러 크레딧이 두 번 들어간다. `Destroy` 첫 줄 `if (target.IsDestroyed) return;` (또는 창구에서 `Hp == 0 && !IsDestroyed`). sim 도 같게. `mistakes` 의 "창구가 크레딧 두 번을 막는다" 가 참이 된다.',
      '**pitfalls 다듬기**: 3번 "트리거에서 들어온 드론을 찾아 `combat.Hit`" 을 하려면 GameObject → 코어 `Drone` 변환이 필요한데 `CombatHub` 에는 반대 방향(private `ObjectOf`)만 있다 → public `DroneOf(GameObject)` 를 더하고 글에 쓴다. 2번 "CombatHub 를 둘 두면" → "공격 컴포넌트마다 다른 Hub 를 넣으면". 5번에서 `GunInput.gunDamage` 는 웹 갤러리에는 없는 Unity 전용 칸이라고 밝힌다 (Tooltip 도).',
      '**`✖ 방어력 무시` 가 전기 충격마다 다시 뜬다.** 가이드 4절(같은 대상의 같은 종류는 한 번)대로 대상마다 한 번만. Target 과 sim 을 같게 고치고 기록을 다시 만든다.',
      '**나쁜 예 주석**: `FrontAlive` 는 코어와 이름이 같지만 뜻이 "HP 가 남은" 이다 → 주석 한 줄. `removed = true` 가 `Destroy(gameObject)` 흉내라는 주석에 "프레임 끝 지연은 흉내 내지 않는다". `// [!]` 설명은 무대 문제 줄 칸에 보이므로 한 줄 안팎으로 (예: "여기서 HP 0 이면 파괴하는 단계를 빠뜨렸다").',
      '**선택**: 하위 시스템을 창구 안에서 `new` 로 고정했으므로 `related` 의 데코레이터 문장("1단계 자리에 버프 층")에 "계산기를 생성자로 받으면" 한 구절. Trap·Shock 피해 숫자를 `Gun.DefaultDamage` 처럼 상수로.',
      GUIDE,
    ],
  },
]
