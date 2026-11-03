---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 14
verify:
  - node tools/truth.mjs singleton-scene-managers
  - node tools/gallery.mjs check singleton-scene-managers
  - node tools/gallery.mjs unity-compile singleton-scene-managers
  - node tools/gallery.mjs thumbs singleton-scene-managers
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)"]
writePaths:
  - unity/singleton-scene-managers/**
  - truth/singleton-scene-managers/**
  - src/specimens/singleton-scene-managers/**
  - src/shots/singleton-scene-managers/**
allowProfiles: [org]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: singleton-scene-managers

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전).
3. 기준 샘플 `observer-health-events` 의 파일 전부 (`unity/observer-health-events/`, `truth/observer-health-events/Target.cs`, `src/specimens/observer-health-events/`). 컴포넌트 수명(`OnEnable`/`OnDisable`)과 Unity 만의 동작(파괴된 컴포넌트의 예외)을 순수 C# 표시 필드로 흉내 내는 본보기다. 이 표본은 그 방식을 씬 로드·언로드로 넓힌다.
4. `docs/selection.md` 의 `singleton-scene-managers` 카드.

## 표본별

- ID `singleton-scene-managers`, namespace `PatternGallery.SingletonSceneManagers`. 제목 `싱글턴 패턴: 씬을 넘는 매니저`, 그룹 E, 순서 2, 난이도 2, `pattern: '싱글턴 패턴'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 씬 둘. **정비 기지** 씬에는 `SoundManager` (BGM, 씬을 넘어 유지)와 `CreditBank` (크레딧, 유지)가 놓여 있고, **지표 탐사 구역** 씬에는 `ExpeditionManager` (이번 탐사의 회로 조각 수, 씬과 함께 사라짐)가 놓여 있다. 기지에서 시작한다. 핵심 문장: "씬을 넘어 살아야 할 것과 씬과 함께 사라질 것을 나누고, 둘 다 하나만 둔다".
- **입력과 키**: `toField` 탐사 구역으로, `toBase` 기지로 (기지에서 누르면 기지 씬을 다시 연다), `pickup` 회로 조각 줍기 (탐사 구역에서만), `settle` 정산 (탐사 매니저의 조각을 `fragmentValue` 크레딧으로 바꿔 `CreditBank` 에 넣는다). `keys` 는 `KeyB` (기지), `KeyE` (탐사 구역), `KeyG` (줍기), `KeyC` (정산).
- **코어 (Core/)**: 등록 규칙 `SingleSlot<T> where T : class`: `bool TryClaim(T candidate)` (비어 있으면 차지하고 `true`, 이미 주인이 있으면 `false` — 먼저 온 것이 이긴다), `void Release(T owner)` (주인일 때만 비운다), `T Current`. 그리고 크레딧(`Deposit`)과 탐사 기록(`Pickup`, `TakeAll`) 같은 게임 규칙. 정산하는 쪽은 `ExpeditionManager` 자리가 비어 있으면 **받지 않고** 이벤트로 알린다 (기지에서 정산 → "탐사 구역에서만 정산"). 일어난 일은 C# event.
- **씬 흉내 (Target.cs 와 sim.ts)**: Unity 의 씬 전환을 흉내 내는 작은 장치를 Target.cs 와 sim.ts 에 같은 이름으로 둔다 (Core 가 아니다. 수강생이 복사하는 것은 Core 와 Unity 어댑터다). Single 모드 `SceneManager.LoadScene` 순서: (1) 지금 씬의 오브젝트 중 `DontDestroyOnLoad` 가 아닌 것을 `OnDisable` → `OnDestroy`, (2) 새 씬에 놓인 오브젝트를 놓인 순서대로 `Awake` → `OnEnable`. `DontDestroyOnLoad` 오브젝트는 남는다. `Awake` 안에서 `Destroy(gameObject)` 를 불러도 실제 파괴는 그 프레임 끝이라는 점, 그래서 어댑터가 `Destroy` 뒤에 `return` 해야 한다는 점을 흉내와 글에 반영한다. 흉내가 Unity 의 어떤 규칙을 따르는지 Target.cs 머리 주석에 출처(Unity 매뉴얼 "이벤트 함수 실행 순서", `Object.DontDestroyOnLoad` 스크립트 레퍼런스)와 함께 적는다. 확신이 없는 순서는 마지막 보고에 적는다.
- **나쁜 예 (Naive/)**: `Awake` 에서 `Instance = this; DontDestroyOnLoad(gameObject);` 만 하는 흔한 코드 (중복 검사 없음), 씬 종속 매니저는 `static Instance` 를 `OnDestroy` 에서 비우지 않는다. 문제 줄에 `// [!]`. ✖ `중복 매니저` (기지로 돌아오면 기지 씬의 `SoundManager`, `CreditBank` 가 또 생겨 BGM 이 두 겹이고, `Instance` 가 새로 생긴 0 크레딧 은행을 가리켜 크레딧이 0 으로 보인다), ✖ `파괴된 매니저 호출` (기지에서 정산하면 이미 파괴된 `ExpeditionManager` 를 불러 예외. 예외 뒤의 줄은 실행되지 않는다. 관찰자 표본처럼 표시 필드로 흉내 내고 파일 머리 주석에 적는다).
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): 탐사 구역으로 → 줍기 둘 → 정산 (두 모드 정상) → 줍기 → 기지로 (나쁜 예 ✖ 중복) → 기지에서 정산 (정상은 받지 않음, 나쁜 예 ✖ 파괴된 매니저 호출) → 탐사 구역으로 → 기지로 (나쁜 예는 BGM 세 겹). 두 번째: 탐사 구역에서 줍고 정산한 뒤 기지에서 다시 정산 (정상 경로를 자세히). 세 번째: 기지에서 기지 씬을 연달아 다시 열기 (정상은 유지 매니저가 그대로, 나쁜 예는 매번 늘어남).
- **조절 값**: `startCredits` (`CreditBank`), `fragmentValue` (`ExpeditionManager`, 조각 하나의 크레딧). 둘 다 화면 숫자로 차이가 보인다. 각 어댑터의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 세 구역을 `box` 로: 정비 기지 씬, 지표 탐사 구역 씬, 그리고 Unity Hierarchy 처럼 **`DontDestroyOnLoad` 구역** (유지 매니저가 옮겨 가는 곳). 지금 씬은 밝게, 아닌 씬은 흐리게. 매니저는 라벨 붙은 `box` (`SoundManager`, `CreditBank 120` 등), 살아 있는 `SoundManager` 마다 BGM `ring` 하나. 파괴된 매니저는 점선 `box` 와 `파괴됨`. 왼쪽 위에 지금 씬과 `CreditBank.Instance` 가 보는 크레딧. 나쁜 예는 같은 매니저 상자가 둘 이상 보이고, `ExpeditionManager.Instance` 가 점선 상자를 가리키는 `arrow` 가 보여야 한다.
- **구조 그림**: 호출하는 쪽(정산 버튼 등) → `XManager.Instance` → SingleSlot<T>, 베이스 `PersistentSingleton<T>` 와 `SceneSingleton<T>` 에 매니저 셋이 `implements` (또는 상속 화살표 대신 `ref`). 나쁜 예 구조 그림은 `static Instance` 하나를 `Awake` 마다 덮어쓰는 모양. 단계: 1 `Awake` 에서 자리를 요청한다 (`TryClaim`), 2 먼저 온 것이 이기고 늦게 온 복제본은 스스로 파괴한다, 3 씬 종속 매니저는 `OnDestroy` 에서 자리를 비운다, 4 호출하는 쪽은 자리가 비어 있으면 부르지 않는다.
- **Unity 어댑터 (Unity/)**: `PersistentSingleton<T> : MonoBehaviour where T : PersistentSingleton<T>` (`Awake` 에서 `TryClaim`, 지면 `Destroy(gameObject); return;`, 이기면 `DontDestroyOnLoad`, `OnDestroy` 에서 주인일 때만 `Release`), `SceneSingleton<T>` (`DontDestroyOnLoad` 없이 같은 규칙), `SoundManager`, `CreditBank`, `ExpeditionManager`, 그리고 씬 전환·줍기·정산 입력을 받는 `ExpeditionInput` (InputAction, `Reset` 에서 기본 키, 씬 이름은 `[SerializeField] string`). `DontDestroyOnLoad` 는 루트 오브젝트에만 동작한다는 것을 pitfalls 에 적는다. 씬 둘을 Build Profiles 의 Scene List 에 넣는 단계를 `unity.setup` 에 적는다 (Unity 6.3 메뉴 `File > Build Profiles`).
- **글**: 증상 "기지로 돌아오면 BGM 이 두 겹이고 크레딧이 0 이다" 에서 시작한다. 싱글턴이 편한 만큼 아무 데서나 `Instance` 로 불러 의존이 숨는다는 "남용" 이야기를 `mistakes` 로 채운다. `mistakes` 후보: 중복 검사 없음, 씬 종속 매니저에 `DontDestroyOnLoad` (지난 탐사의 수치가 다음 탐사에 남음), Enter Play Mode 설정에서 도메인 리로드를 끄면 `static` 이 지난 실행 값을 들고 있음 (`[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]` 로 비우기), 아무 데서나 `Instance` 로 불러 의존이 숨음, 첫 접근 때 `AddComponent` 로 몰래 만들어 씬에 둘이 됨. `references`: https://gameprogrammingpatterns.com/singleton.html (Nystrom: Singleton), https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Object.DontDestroyOnLoad.html, https://docs.unity3d.com/6000.3/Documentation/Manual/domain-reloading.html, https://docs.unity3d.com/6000.3/Documentation/Manual/execution-order.html, https://unity.com/resources/design-patterns-solid-ebook (Unity 전자책, 싱글턴 장). `related`: `observer-health-events` (파괴된 객체를 부르는 예외를 같은 방식으로 흉내).
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**(`state-player-actions`, `observer-health-events`, `command-undo-replay`)만 쓴다 (묶음 2 의 다른 표본은 아직 없어 링크가 깨진다). 교안 연계: Jay 의 강의 교안 같은 장의 강조점을 글에 녹이되 교안을 출처로 링크하지 않는다 (공개되지 않은 자료).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs singleton-scene-managers` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check singleton-scene-managers`, `node tools/gallery.mjs unity-compile singleton-scene-managers` 통과.
3. `node tools/gallery.mjs live singleton-scene-managers --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
