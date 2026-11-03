---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 8
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

# 표본 수정: singleton-scene-managers

Pattern Gallery 의 표본 `singleton-scene-managers` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/singleton-scene-managers/`, `truth/singleton-scene-managers/`, `src/specimens/singleton-scene-managers/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **AudioSource 칸 이름**: Unity 6.3 Inspector 의 첫 칸은 `Audio Generator` 다 (6000.3 매뉴얼 Audio Source component reference 표로 확인). setup 의 `Audio Resource` 를 고친다. `SoundManager` 의 `source.clip != null` 은 그 칸 값이 `clip` 으로 읽히는지 불확실하므로 `if (!source.isPlaying) source.Play();` 로 단순화한다.
2. **"파괴된 매니저 호출" 예외는 조건부다** (가이드 3절). 파괴된 MonoBehaviour 를 static 참조로 부르는 것만으로는 예외가 나지 않고, 메서드 안에서 `transform`, `GetComponent`, UI Text 같은 네이티브 객체를 건드릴 때 난다. 나쁜 예 `ExpeditionManager` 의 정산 메서드에 그 줄(예: 조각 수 Text 갱신)을 **보이게** 두고 그 줄에 `// [!]`, 표시 필드는 그 줄이 예외를 낸다는 흉내로 둔다. offNote 에 조건을 밝히고, 그 줄이 없으면 실제 Unity 에서는 예외 없이 지난 탐사의 조각이 새 은행에 조용히 들어간다는 것도 한 줄 적는다.
3. **`mistakes` 의 "씬 종속 매니저에 `DontDestroyOnLoad`" 원인 서술이 실제와 어긋난다.** 나쁜 예 방식(`Instance = this` + DDOL)이면 새로 온 매니저가 Instance 를 가져가 조각이 0 으로 보이고 옛 매니저만 쌓인다. "지난 탐사의 조각이 남는다" 는 중복 검사가 있는 `PersistentSingleton` 으로 만들었을 때다 → "ExpeditionManager 를 `PersistentSingleton` 으로 만들었다" 로 고친다.
4. **출처 표기**: `Target.cs` 머리 주석과 meta `original` 이 "옛 씬 OnDestroy → 새 씬 Awake" 를 문서가 말하는 것처럼 적었다. execution-order 페이지와 LoadScene 레퍼런스에는 이 순서가 명시되지 않는다 → "문서에 명시되지 않음. 동기 LoadScene 에서 관찰되는 동작 기준" 으로 고친다.
5. **pitfalls 보강**: (1) `LoadSceneAsync`(Single)나 Additive 에서는 옛 씬 파괴가 새 씬 `Awake` 보다 늦을 수 있어, 씬 종속 매니저를 다시 열 때 새 것이 `TryClaim` 에 지고 옛 것이 `Release` 해 하나도 남지 않을 수 있다 (이 표본은 `LoadScene` 이라 안전). (2) `[RuntimeInitializeOnLoadMethod]` 는 제네릭 클래스 안에서는 불리지 않으므로 제네릭 베이스에 붙이지 말 것, 이 베이스는 `OnDestroy` 로 충분. (3) CS0114 항목에 파생 클래스에서 `void OnDestroy()` 를 새로 쓰면 `Release` 가 빠진다는 점 (`protected override` 와 `base.OnDestroy()`). 그리고 "그 프레임 끝까지 복제본의 `OnEnable` 이 불린다" 를 "실제 파괴는 프레임 끝이라, 그 전에 복제본의 `OnEnable` 이 불린다" 로.
6. **정산하지 않은 조각이 말없이 사라진다.** 정상 모드 자동 데모에서 마지막에 주운 조각이 기지로 돌아가며 사라진다. 의도된 "씬과 함께 사라짐" 이지만 버그처럼 보인다. 사건 줄(예: "ExpeditionManager 파괴: 정산하지 않은 조각 1개 사라짐")과 단계 3 또는 note 에 밝힌다. 사건 줄을 더하면 Target.cs 와 sim 을 같게 바꾸고 기록을 다시 만든다.
7. **자잘한 것 (선택)**: `PersistentSingleton` 에서 `transform.parent != null` 이면 `Debug.LogError` ("DontDestroyOnLoad 는 루트에만"). `CreditBank` 의 지연 생성 주석 근거를 정리한다 (`Instance` 는 `Awake` 전 null).
8. **가이드가 바뀌었다**: `docs/specimen-guide.md` 3절(파괴된 컴포넌트 예외), 4절(버그 표시가 이어지게, 원인 설명이 다른 입력 순서에도 맞게), 6절(`params` 의 막대 기준과 화면용 좌표, `unity.setup` 의 Unity 6.3 메뉴·칸 이름)을 다시 읽고 이 표본이 어긋나는 곳이 있으면 함께 고친다.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs singleton-scene-managers` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs singleton-scene-managers`, `node tools/gallery.mjs check singleton-scene-managers`, `node tools/gallery.mjs unity-compile singleton-scene-managers` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
