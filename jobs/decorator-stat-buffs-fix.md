---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 8
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

# 표본 수정: decorator-stat-buffs

Pattern Gallery 의 표본 `decorator-stat-buffs` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/decorator-stat-buffs/`, `truth/decorator-stat-buffs/`, `src/specimens/decorator-stat-buffs/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **버프를 다시 받지 않아도 나쁜 예가 12.5 에서 멈춘다 (잡 명세 탓).** 기본 지속 시간(냉각 셀 3초, 과부하 2.5초)이면 C, O 만 눌러도 냉각 셀이 먼저 끝나 30 → 25 → 12.5 가 된다. 그러면 offNote 와 자동 데모 note 의 "빼지 못한 +5" 설명이 그 경로에서 틀린다. **냉각 셀이 과부하보다 늦게 끝나게** 기본 지속 시간을 다시 정해, 다시 받지 않으면 10 으로 돌아오고 다시 받을 때만 어긋나게 한다 (예: 냉각 셀 4초, 과부하 2초. 자동 데모 6~7초 안에 모두 끝나야 한다). 순서가 섞여 생기는 어긋남은 정화나 다른 시나리오가 따로 보이고 글에 그렇게 쓴다. note 의 시각, preset 글, ✖ 원인 설명을 함께 맞춘다. `cellDuration` 범위 상한에서 자동 데모(반복 주기) 안에 끝나지 않으면 상한이나 hint 를 고친다 (가이드 4절).
2. **조절 값이 막대 길이에 안 보인다.** 막대의 꽉 찬 값이 `(10 + cellBonus) × 배율 × 1.4` 라 조절 값을 바꿔도 막대가 같은 길이다. 막대 기준을 조절 값 범위의 최대값으로 **고정**해 `cellBonus` hint "막대가 그만큼 는다" 가 참이 되게 하고, 배율 hint 도 화면과 맞춘다. Unity 어댑터의 막대 비율도 같게 (가이드 6절).
3. **`unity.setup` 메뉴**: `GameObject > UI > Image`, `GameObject > UI > Legacy > Text` 는 Unity 6.3 에서 `GameObject > UI (Canvas) > Image`, `GameObject > UI (Canvas) > Legacy > Text` 다 (`observer-health-events` 와 같게). 막대, 타이머 둘, Text 둘이 Canvas 가운데에 겹쳐 생기므로 각 요소의 위치(Pos X·Y)를 적는 단계를 넣는다. `Base Power` 는 웹에 없는 칸(웹은 10 고정)이라는 것도 한 줄.
4. **글 보강 두 문장**: (1) 왜 공식 `(기본 + Σ보너스) × Π배율` 이 아니라 층인가 — 상한이나 조건부 층을 다른 층을 고치지 않고 더할 수 있고, 지금 걸린 사슬을 눈으로 확인할 수 있다. (2) 왜 더하기가 안쪽인가 — 보너스도 배율을 받게 하는 흔한 관례. tuned 시나리오에서 나쁜 예 23 과 정상 27 이 다른 이유(과부하 뒤에 더한 보너스는 배율을 받지 않음)를 note 에 적는다.
5. **이벤트 순서**: `BuffApplied`, `BuffsPurged`, `BuffExpired` 가 `Rebuild` 보다 먼저 불려 핸들러가 `Value` 를 읽으면 옛 값이 나온다. 사슬을 다시 만든 뒤에 알린다 (`Tick` 루프 안에서 핸들러가 `Apply` 를 불러도 안전하게: 끝난 버프를 모은 뒤 빼고, 다시 만들고, 그다음 알린다). Unity 어댑터는 `OnChainRebuilt` 에서도 `ShowPower(Buffs.Value)` 를 불러 Inspector 값을 바꾸면 막대가 갱신되게. C# 를 바꾸면 `node tools/truth.mjs decorator-stat-buffs` 로 기록을 다시 만든다.
6. **자잘한 것 (선택)**: `Describe` 가 구체 형식으로 switch 한다 → 층마다 `Label` 을 두어 바깥이 안쪽을 몰라도 되게. Unity `Debug.Log` 가 enum 이름(`Cell`)을 찍는다 → 웹과 같은 "냉각 셀".
7. **가이드가 바뀌었다**: `docs/specimen-guide.md` 3절(파괴된 컴포넌트 예외), 4절(버그 표시가 이어지게, 원인 설명이 다른 입력 순서에도 맞게), 6절(`params` 의 막대 기준과 화면용 좌표, `unity.setup` 의 Unity 6.3 메뉴·칸 이름)을 다시 읽고 이 표본이 어긋나는 곳이 있으면 함께 고친다.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs decorator-stat-buffs` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs decorator-stat-buffs`, `node tools/gallery.mjs check decorator-stat-buffs`, `node tools/gallery.mjs unity-compile decorator-stat-buffs` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
