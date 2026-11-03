// 묶음 2 수정 (2026-11-03): 독립 리뷰 지적. 네 표본 모두 판정은 "수정 뒤 병합 가능". 리뷰 요약은 _review/<id>/review-summary.md (커밋 안 함).
// 공통 규칙이 가이드에 더해졌다 (docs/specimen-guide.md 3·4·6절: 파괴된 컴포넌트 예외, 이어지는 버그 표시, 막대 기준, Unity 6.3 메뉴·칸 이름).
const GUIDE = '**가이드가 바뀌었다**: `docs/specimen-guide.md` 3절(파괴된 컴포넌트 예외), 4절(버그 표시가 이어지게, 원인 설명이 다른 입력 순서에도 맞게), 6절(`params` 의 막대 기준과 화면용 좌표, `unity.setup` 의 Unity 6.3 메뉴·칸 이름)을 다시 읽고 이 표본이 어긋나는 곳이 있으면 함께 고친다.'

export default [
  {
    id: 'strategy-turret-targeting',
    fix: true,
    budgetUsd: 8,
    items: [
      '**`unity.pitfalls` 의 레이저 설명이 코드와 다르다.** "레이저 끝은 `CurrentTarget` 의 짝 오브젝트 위치로 옮긴다" 고 적었지만 `TurretController` 는 `ToWorld(target)` (코어 좌표)를 쓴다. 코드대로 고쳐 쓰고, "빈 자리" 가 생기는 진짜 이유(파괴된 드론의 X 가 멈춘 채 남음)를 적는다. `mistakes` 의 `MissingReferenceException` 은 "드론 Transform 을 직접 들고 있을 때" 라는 조건을 붙인다 (가이드 3절).',
      '**자동 데모 note 의 "(가까운 것은 D5)" 가 바꾸는 순간(3.70초)에는 틀리다.** 그때 가장 가까운 것은 D4 이고 D5 는 3.8초부터다. "(가까운 것은 D4, 곧 D5)" 로 고치거나 괄호를 뺀다. 시나리오 note 의 "2.72초" 처럼 기록(2.73)과 다른 시각도 기록에 맞춘다.',
      '**거리는 가로(x)로만 잰다는 것이 단계 글과 무대 글에 없다.** 단계 2 본문에 "(거리는 가로 x 거리. 높이는 화면에만)" 을 넣는다. 드론 높이 차이(지금 1~4.4)를 줄여 레이저가 눈으로 더 먼 드론으로 가는 순간을 줄인다 (가이드 6절 화면용 좌표).',
      '**엇갈림이 정지 화면에 잘 안 보인다.** 명중 링은 0.25초, 발사 간격은 0.4초라 ✖ 가 이어지는 동안에도 엇갈림이 보이지 않는 때가 많다. 효과 끄기에서 엇갈린 동안 **마지막 명중 드론에 남는 표식**(작은 빨간 `box` 나 점선 `arrow`)을 둔다. 링과 레이저가 드론 라벨(`D1`)을 가리지 않게 라벨 자리를 옮긴다 (가이드 4절).',
      '**`mistakes` 의 상태·전략 문장**을 다듬는다: "대상 드론이 파괴되면 전략이 다음 전략을 골라 포탑에 넣는다 → 그러면 전략이 아니라 상태 전이다. 조준 방식처럼 바깥이 고르는 것은 전략으로 둔다" 처럼 상태 패턴 자체가 실수로 읽히지 않게.',
      '**포탑 여러 대 설명과 어댑터가 맞지 않는다.** 컨트롤러마다 자기 `DroneWave` 를 만들어 포탑을 하나 더 놓으면 웨이브도 두 벌이 된다. 웨이브를 따로 떼어 여러 포탑이 나눠 쓰게 하거나, 최소한 `unity.pitfalls` 에 "웨이브는 한 곳에서 만들어 나눠 쓴다" 를 적고 goals·adaptIdeas 글을 맞춘다.',
      '**어댑터 다듬기**: `Reset` 의 `GetComponent<LineRenderer>()` 는 setup 순서상 늘 null 이다 → `[RequireComponent(typeof(LineRenderer))]`. 속성 이름 `Turret` 이 형식 이름과 같아 `Turret.DefaultX`(static)와 `Turret.X` 가 헷갈린다 → `TurretCore` 같은 이름. `unity.pitfalls` 의 "timeScale 이 0 이면 `Tick` 이 멈춘다" 는 틀리다 (`Tick(0)` 이 불려 대상은 다시 고른다) → 고쳐 쓴다. `unity.verify` 의 "HP 가 가장 낮은 드론" 앞에 "사거리 안".',
      GUIDE,
    ],
  },
  {
    id: 'decorator-stat-buffs',
    fix: true,
    budgetUsd: 8,
    items: [
      '**버프를 다시 받지 않아도 나쁜 예가 12.5 에서 멈춘다 (잡 명세 탓).** 기본 지속 시간(냉각 셀 3초, 과부하 2.5초)이면 C, O 만 눌러도 냉각 셀이 먼저 끝나 30 → 25 → 12.5 가 된다. 그러면 offNote 와 자동 데모 note 의 "빼지 못한 +5" 설명이 그 경로에서 틀린다. **냉각 셀이 과부하보다 늦게 끝나게** 기본 지속 시간을 다시 정해, 다시 받지 않으면 10 으로 돌아오고 다시 받을 때만 어긋나게 한다 (예: 냉각 셀 4초, 과부하 2초. 자동 데모 6~7초 안에 모두 끝나야 한다). 순서가 섞여 생기는 어긋남은 정화나 다른 시나리오가 따로 보이고 글에 그렇게 쓴다. note 의 시각, preset 글, ✖ 원인 설명을 함께 맞춘다. `cellDuration` 범위 상한에서 자동 데모(반복 주기) 안에 끝나지 않으면 상한이나 hint 를 고친다 (가이드 4절).',
      '**조절 값이 막대 길이에 안 보인다.** 막대의 꽉 찬 값이 `(10 + cellBonus) × 배율 × 1.4` 라 조절 값을 바꿔도 막대가 같은 길이다. 막대 기준을 조절 값 범위의 최대값으로 **고정**해 `cellBonus` hint "막대가 그만큼 는다" 가 참이 되게 하고, 배율 hint 도 화면과 맞춘다. Unity 어댑터의 막대 비율도 같게 (가이드 6절).',
      '**`unity.setup` 메뉴**: `GameObject > UI > Image`, `GameObject > UI > Legacy > Text` 는 Unity 6.3 에서 `GameObject > UI (Canvas) > Image`, `GameObject > UI (Canvas) > Legacy > Text` 다 (`observer-health-events` 와 같게). 막대, 타이머 둘, Text 둘이 Canvas 가운데에 겹쳐 생기므로 각 요소의 위치(Pos X·Y)를 적는 단계를 넣는다. `Base Power` 는 웹에 없는 칸(웹은 10 고정)이라는 것도 한 줄.',
      '**글 보강 두 문장**: (1) 왜 공식 `(기본 + Σ보너스) × Π배율` 이 아니라 층인가 — 상한이나 조건부 층을 다른 층을 고치지 않고 더할 수 있고, 지금 걸린 사슬을 눈으로 확인할 수 있다. (2) 왜 더하기가 안쪽인가 — 보너스도 배율을 받게 하는 흔한 관례. tuned 시나리오에서 나쁜 예 23 과 정상 27 이 다른 이유(과부하 뒤에 더한 보너스는 배율을 받지 않음)를 note 에 적는다.',
      '**이벤트 순서**: `BuffApplied`, `BuffsPurged`, `BuffExpired` 가 `Rebuild` 보다 먼저 불려 핸들러가 `Value` 를 읽으면 옛 값이 나온다. 사슬을 다시 만든 뒤에 알린다 (`Tick` 루프 안에서 핸들러가 `Apply` 를 불러도 안전하게: 끝난 버프를 모은 뒤 빼고, 다시 만들고, 그다음 알린다). Unity 어댑터는 `OnChainRebuilt` 에서도 `ShowPower(Buffs.Value)` 를 불러 Inspector 값을 바꾸면 막대가 갱신되게. C# 를 바꾸면 `node tools/truth.mjs decorator-stat-buffs` 로 기록을 다시 만든다.',
      '**자잘한 것 (선택)**: `Describe` 가 구체 형식으로 switch 한다 → 층마다 `Label` 을 두어 바깥이 안쪽을 몰라도 되게. Unity `Debug.Log` 가 enum 이름(`Cell`)을 찍는다 → 웹과 같은 "냉각 셀".',
      GUIDE,
    ],
  },
  {
    id: 'prototype-drone-clone',
    fix: true,
    budgetUsd: 8,
    items: [
      '**"다친 채 복제된다" 가 이 어댑터에서 재현되지 않는다.** `unity.pitfalls[0]`, `DroneHangar` 의 Tooltip, `mistakes` 의 같은 항목. `OnCloned` 가 `Instantiate` 직후 `view.Show(drone)` 로 HP 바와 모듈 상자를 코어 값으로 다시 그려 원본의 상태가 덮인다. "HP 를 뷰 컴포넌트에 들고 있으면 다친 채 복제된다. 이 표본은 코어 값으로 다시 그려서 드러나지 않는다" 처럼 이 어댑터 동작에 맞게 고친다.',
      '**`Name` 을 값 필드라고 부른다.** `Core/ScoutDrone.cs` 머리 주석과 33행 근처, diagram 의 `sub`. "값 형식(MaxHp, Hp, Speed)과 바꿀 수 없는 string(Name)" 으로 고친다. `mistakes[0]` 이나 단계 2 에 한 문장: "공유가 위험한 것은 공유된 객체를 **고칠** 때(`Modules.Add`)다. 필드에 새 객체를 **대입**하면(`Name = …`, `Modules = new …`) 그 드론만 바뀐다." 그리고 "필드를 더하면 `MemberwiseClone` 이 조용히 공유하므로 `Clone` 을 다시 본다" 한 줄.',
      '**효과 끄기 화면 강조**: `#4` 가 냉각 모듈을 달고 나오는 순간(카드가 강조한 장면)에도 링 타이머를 켠다 (`sim.ts` 의 `at.bug`). 공유 목록을 가리키는 화살표는 공유 중이면 주황(warn), 내용까지 틀리면 빨강으로 나눠, 공유 자체가 문제라는 것이 `#3` 에서도 보이게 한다.',
      '**어댑터**: `moduleName` 필드를 "견본 (Play 시작 때 한 번)" 머리글에서 "조절 값" 머리글 아래로 옮기고 (`OnValidate` 가 Play 중에도 넣는다), `unity.pitfalls` 의 실시간 반영 목록에 `Module Name` 을 더한다. 컴포넌트가 꺼진 동안 다른 스크립트가 `Hangar` 를 바꾸면 뷰가 어긋난다 → `OnEnable` 에서 `Clones` 를 돌며 빠진 뷰를 만들고 다시 그린다. 뷰는 격납고 아래에 만들어 격납고를 지우면 함께 사라지게.',
      '**글 다듬기**: `mistakes[4]` 에 섞인 두 주제(깊은 복사 과잉, 생성자 인자 순서)를 나눈다. 생성자 예시는 실제 시그니처와 맞추거나 단계 1 본문으로 옮긴다. 두 번째 시나리오 note 의 괄호 문장을 자연스럽게. 단계 4 본문은 그 단계 화면(자동 데모 중간 시각)에 이미 일어난 일만 말하거나 "곧" 처럼 시간을 밝힌다.',
      GUIDE,
    ],
  },
  {
    id: 'singleton-scene-managers',
    fix: true,
    budgetUsd: 8,
    items: [
      '**AudioSource 칸 이름**: Unity 6.3 Inspector 의 첫 칸은 `Audio Generator` 다 (6000.3 매뉴얼 Audio Source component reference 표로 확인). setup 의 `Audio Resource` 를 고친다. `SoundManager` 의 `source.clip != null` 은 그 칸 값이 `clip` 으로 읽히는지 불확실하므로 `if (!source.isPlaying) source.Play();` 로 단순화한다.',
      '**"파괴된 매니저 호출" 예외는 조건부다** (가이드 3절). 파괴된 MonoBehaviour 를 static 참조로 부르는 것만으로는 예외가 나지 않고, 메서드 안에서 `transform`, `GetComponent`, UI Text 같은 네이티브 객체를 건드릴 때 난다. 나쁜 예 `ExpeditionManager` 의 정산 메서드에 그 줄(예: 조각 수 Text 갱신)을 **보이게** 두고 그 줄에 `// [!]`, 표시 필드는 그 줄이 예외를 낸다는 흉내로 둔다. offNote 에 조건을 밝히고, 그 줄이 없으면 실제 Unity 에서는 예외 없이 지난 탐사의 조각이 새 은행에 조용히 들어간다는 것도 한 줄 적는다.',
      '**`mistakes` 의 "씬 종속 매니저에 `DontDestroyOnLoad`" 원인 서술이 실제와 어긋난다.** 나쁜 예 방식(`Instance = this` + DDOL)이면 새로 온 매니저가 Instance 를 가져가 조각이 0 으로 보이고 옛 매니저만 쌓인다. "지난 탐사의 조각이 남는다" 는 중복 검사가 있는 `PersistentSingleton` 으로 만들었을 때다 → "ExpeditionManager 를 `PersistentSingleton` 으로 만들었다" 로 고친다.',
      '**출처 표기**: `Target.cs` 머리 주석과 meta `original` 이 "옛 씬 OnDestroy → 새 씬 Awake" 를 문서가 말하는 것처럼 적었다. execution-order 페이지와 LoadScene 레퍼런스에는 이 순서가 명시되지 않는다 → "문서에 명시되지 않음. 동기 LoadScene 에서 관찰되는 동작 기준" 으로 고친다.',
      '**pitfalls 보강**: (1) `LoadSceneAsync`(Single)나 Additive 에서는 옛 씬 파괴가 새 씬 `Awake` 보다 늦을 수 있어, 씬 종속 매니저를 다시 열 때 새 것이 `TryClaim` 에 지고 옛 것이 `Release` 해 하나도 남지 않을 수 있다 (이 표본은 `LoadScene` 이라 안전). (2) `[RuntimeInitializeOnLoadMethod]` 는 제네릭 클래스 안에서는 불리지 않으므로 제네릭 베이스에 붙이지 말 것, 이 베이스는 `OnDestroy` 로 충분. (3) CS0114 항목에 파생 클래스에서 `void OnDestroy()` 를 새로 쓰면 `Release` 가 빠진다는 점 (`protected override` 와 `base.OnDestroy()`). 그리고 "그 프레임 끝까지 복제본의 `OnEnable` 이 불린다" 를 "실제 파괴는 프레임 끝이라, 그 전에 복제본의 `OnEnable` 이 불린다" 로.',
      '**정산하지 않은 조각이 말없이 사라진다.** 정상 모드 자동 데모에서 마지막에 주운 조각이 기지로 돌아가며 사라진다. 의도된 "씬과 함께 사라짐" 이지만 버그처럼 보인다. 사건 줄(예: "ExpeditionManager 파괴: 정산하지 않은 조각 1개 사라짐")과 단계 3 또는 note 에 밝힌다. 사건 줄을 더하면 Target.cs 와 sim 을 같게 바꾸고 기록을 다시 만든다.',
      '**자잘한 것 (선택)**: `PersistentSingleton` 에서 `transform.parent != null` 이면 `Debug.LogError` ("DontDestroyOnLoad 는 루트에만"). `CreditBank` 의 지연 생성 주석 근거를 정리한다 (`Instance` 는 `Awake` 전 null).',
      GUIDE,
    ],
  },
]
