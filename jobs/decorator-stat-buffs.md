---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 12
verify:
  - node tools/truth.mjs decorator-stat-buffs
  - node tools/gallery.mjs check decorator-stat-buffs
  - node tools/gallery.mjs unity-compile decorator-stat-buffs
  - node tools/gallery.mjs thumbs decorator-stat-buffs
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)"]
writePaths:
  - unity/decorator-stat-buffs/**
  - truth/decorator-stat-buffs/**
  - src/specimens/decorator-stat-buffs/**
  - src/shots/decorator-stat-buffs/**
allowProfiles: [org]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: decorator-stat-buffs

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전).
3. 기준 샘플 `state-player-actions` 의 파일 전부 (`unity/state-player-actions/`, `truth/state-player-actions/Target.cs`, `src/specimens/state-player-actions/`). 시간이 흐르는 코어(`Tick`)와 float 계산을 맞춘 sim 의 본보기다. 나쁜 예의 어긋남을 "있어야 할 값" 코어와 비교해 찾는 방식은 `command-undo-replay` 의 Target 을 참고한다.
4. `docs/selection.md` 의 `decorator-stat-buffs` 카드.

## 표본별

- ID `decorator-stat-buffs`, namespace `PatternGallery.DecoratorStatBuffs`. 제목 `데코레이터 패턴: 버프 겹치기와 풀기`, 그룹 F, 순서 1, 난이도 2, `pattern: '데코레이터 패턴'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 탐사대장 하린의 무기 출력(기본 10)에 버프가 겹친다. `cell` 냉각 셀 (출력 `+cellBonus`, `cellDuration` 초), `overload` 과부하 (출력 `×overloadMultiplier`, `overloadDuration` 초), `purge` 정화 (모든 버프 해제). 같은 버프를 다시 받으면 **겹치지 않고 남은 시간만 갱신**한다.
- **입력과 키**: `cell`, `overload`, `purge`. `keys` 는 `KeyC`, `KeyO`, `KeyX`.
- **코어 (Core/)**: `IPowerStat { float Value { get; } }`, 기본 `BasePower`, 감싸는 층 `AddLayer(inner, amount)` 와 `MultiplyLayer(inner, factor)` (공통 부모 `PowerDecorator` 가 `inner` 를 든다). `BuffSet` 은 **활성 버프 목록**을 들고 `Tick(dt)` 로 남은 시간을 줄여 끝난 것을 빼고, 목록이 바뀔 때마다 기본값에서 시작해 **사슬을 다시 감싼다**: 더하기 층이 안쪽, 곱하기 층이 바깥 (이 순서는 고정이고 글에 적는다. 들어온 순서대로 감싸면 같은 조합이 순서마다 다른 값이 된다). 그래서 중간 버프가 먼저 끝나도 층 하나만 빠진다. 일어난 일은 C# event (`BuffApplied`, `BuffRefreshed`, `BuffExpired`, `BuffsPurged`, `PowerChanged(old, now)` 등).
- **나쁜 예 (Naive/)**: `float power` 하나를 직접 고치는 흔한 코드. 시작 때 `power += cellBonus` / `power *= overloadMultiplier`, 끝날 때 `power -= cellBonus` / `power /= overloadMultiplier`. 같은 버프를 다시 받으면 이전 타이머를 멈추고(빼기를 건너뜀, `StopCoroutine` 을 순수 C# 타이머로 흉내. 파일 머리 주석에 적는다) 새로 더한다. 문제 줄에 `// [!]`. ✖ `중복 적용` (같은 버프를 두 번 더했는데 끝날 때 한 번만 뺀다), ✖ `기본값 어긋남` (모든 버프가 끝났는데 출력이 기본값이 아님. 예: 10 → +5 → ×2 → 다시 +5 → ÷2 → −5 = 12.5). ✖ 마다 원인인 `// [!]` 줄이 그 시나리오에서 실제로 돈다 (가이드 4절).
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): 냉각 셀 → 과부하 → 냉각 셀 다시 받음 (갱신) → 과부하 끝 → 냉각 셀 끝. 자동 데모 안에 모든 버프가 끝나 ✖ `기본값 어긋남` 이 나와야 하므로 기본 지속 시간을 그에 맞게 정한다 (예: 냉각 셀 3초, 과부하 2.5초). 두 번째: 버프 둘이 걸린 중에 정화. 세 번째: `values` 로 보너스·배율·지속 시간을 바꾼 경로.
- **조절 값**: `cellBonus`, `overloadMultiplier`, `cellDuration`, `overloadDuration`. 모두 Unity 어댑터의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 하린은 `actor` (`role: 'ally'`, 라벨 `하린`). 출력은 긴 가로 `bar` 와 숫자 `text`, 기본값 자리에 가는 `box` 눈금 (모든 버프가 끝나면 막대 끝이 눈금에 와야 한다). 버프마다 남은 시간 작은 `bar`. 감싸기 사슬은 겹친 `box` 로 `[과부하 ×2 [냉각 셀 +5 [기본 10]]]` 처럼 그린다. 나쁜 예는 `power = 12.50` 과 돌고 있는 타이머 수를 왼쪽 위에 보이고, 눈금에서 벗어나 멈춘 막대 끝이 보여야 한다.
- **구조 그림**: PowerBuffs(어댑터) → BuffSet → IPowerStat(`kind: 'interface'`) 사슬: MultiplyLayer → AddLayer → BasePower (`implements` 화살표). 나쁜 예 구조 그림은 `power` 값 노드를 시작·끝 코드가 직접 고치는 모양. 단계: 1 버프를 받으면 목록에 넣는다 (같은 버프는 시간 갱신), 2 목록에서 사슬을 다시 감싼다 (더하기 안쪽, 곱하기 바깥), 3 값을 읽으면 바깥 층이 안쪽 값에 자기 몫을 더하거나 곱한다, 4 끝난 버프는 목록에서 빠지고 사슬을 다시 만든다.
- **Unity 어댑터 (Unity/)**: `PowerBuffs : MonoBehaviour` 가 InputAction 셋(`Reset` 에서 숫자 1~3 키)을 코어에 넘기고, `Update` 에서 `Tick(Time.deltaTime)`, 출력은 `PowerChanged` 핸들러에서 UI 에 바로 옮긴다 (UGUI. 기준 샘플이 쓰는 UI 방식을 따른다). 지속 시간 타이머는 코루틴이 아니라 코어의 `Tick` 이다 (그래서 `StopCoroutine` 실수가 생기지 않는다는 것을 글에 적는다).
- **글**: 증상 "버프가 다 끝났는데 공격력이 원래대로 안 돌아온다" 에서 시작한다. 데코레이터는 같은 인터페이스로 감싸 원본을 고치지 않는다는 것, 그리고 이 표본이 정석 감싸기와 수정자 목록을 "목록에서 사슬을 다시 만든다" 로 잇는다는 것을 적는다. `mistakes` 후보: 코루틴을 멈춰 빼기를 건너뜀, 배율을 바로 곱해 두어 풀 때 나누기 오차, 최대 체력 버프가 끝날 때 현재 체력을 상한으로 깎지 않음, 같은 종류 버프의 갱신과 중첩을 구분하지 않음, 사슬 중간 층을 직접 떼려다 참조가 끊김. `related`: `observer-health-events` (출력이 바뀌면 알림). `references`: https://refactoring.guru/design-patterns/decorator (Refactoring Guru: Decorator), https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/interfaces (Microsoft C# 인터페이스).
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**(`state-player-actions`, `observer-health-events`, `command-undo-replay`)만 쓴다 (묶음 2 의 다른 표본은 아직 없어 링크가 깨진다). 교안 연계: Jay 의 강의 교안 같은 장의 강조점을 글에 녹이되 교안을 출처로 링크하지 않는다 (공개되지 않은 자료).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs decorator-stat-buffs` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check decorator-stat-buffs`, `node tools/gallery.mjs unity-compile decorator-stat-buffs` 통과.
3. `node tools/gallery.mjs live decorator-stat-buffs --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
