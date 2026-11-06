---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 6
verify:
  - node tools/truth.mjs hierarchical-state-enemy
  - node tools/gallery.mjs check hierarchical-state-enemy
  - node tools/gallery.mjs unity-compile hierarchical-state-enemy
  - node tools/gallery.mjs thumbs hierarchical-state-enemy
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)", "Bash(grep *)", "Bash(cat *)", "Bash(head *)"]
writePaths:
  - unity/hierarchical-state-enemy/**
  - truth/hierarchical-state-enemy/**
  - src/specimens/hierarchical-state-enemy/**
  - src/shots/hierarchical-state-enemy/**
allowProfiles: [org]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 수정: hierarchical-state-enemy

Pattern Gallery 의 표본 `hierarchical-state-enemy` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/hierarchical-state-enemy/`, `truth/hierarchical-state-enemy/`, `src/specimens/hierarchical-state-enemy/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **감지·공격 거리 글이 겹친다.** `sim.ts` 의 두 글이 같은 y(1.15)에 오른쪽 정렬이라 간격이 `detectRange - attackRange` 뿐이다. 감지 3.5 에서 "공격 2.5m" 와 "감지 3.5m" 가 겹치고, 슬라이더 끝(감지 3.5, 공격 3.5)에서는 같은 자리에 완전히 겹친다 (프리셋 short-sight, 시나리오 search-then-reacquire·search-timeout 화면). 위아래로 엇갈리게 놓고, `live` 로 `p.detectRange=3.5&p.attackRange=3.5`, `p.attackRange=2.5`, `preset=short-sight` 와 다른 시나리오(`scenario=<id>`)를 찍어 확인한다 (가이드 7절의 주소 인자).
2. **나쁜 예 왼쪽 위 둘째 줄이 ✖ 없이 빨갛다.** `sim.ts` 에서 `leaf === "Search"` 이기만 하면 빨강이라, EMP 를 맞지 않은 수색(search-timeout 시나리오)에서도 빨갛다. ✖ 가 뜬 동안(`ignoring || bugAlert`)만 빨강, 그 밖의 Search 는 주황(`C.warn`). 나쁜 예 상태 트리의 고정 꼬리표(빠진 `EMP→기절`)도 ✖ 전에는 주황, ✖ 뒤에 빨강 (가이드 4절).
3. **문제 줄이 단계 줄과 같은 코드로 보인다.** `Naive/NaiveDroneStates.cs` 의 `d.SetAlert(false); // [!]` 는 2단계 코드 칸의 `m.Drone.SetAlert(false); // [2]` 와 같아 보인다 (칸에는 파일 이름만 나온다). 이 버그는 줄은 맞는데 놓인 클래스가 틀린 것이라, 설명 머리에 자리를 쓴다: `// [!] ChaseState.Exit 에서 끈다: …`. `AttackState.Enter` 의 `d.FaceTarget(); // [!]` 는 코어와 글자까지 같으니, 빠진 자리에 주석만 있는 줄 `// [!] 여기서 경계등을 켜지 않는다 (…)` 로 바꾼다 (가이드 4절). Naive 를 고쳤으면 `node tools/truth.mjs hierarchical-state-enemy` 를 다시 돌린다.
4. **권장 (코어)**: `CombatState.Enter` 에서 `LastSeenX` 를 지금 대상 자리로 적는다 (지금은 `CombatState.Tick` 만 적어, 전투에 들어간 바로 다음 프레임에 대상이 사라지면 이전 전투의 자리나 0 으로 수색하러 간다. Unity 순간이동·대상 파괴 때). sim 도 같게, 기록 다시 생성. `StateMachine` 에 재진입 검사: 전이 중(`Exit`/`Enter`/그 이벤트 구독자 안)에 `ChangeState` 가 다시 불리면 `InvalidOperationException`, 잎이 아닌 상태를 target 으로 주면 예외 (주석으로만 막혀 있고, adaptIdeas 의 엄폐·페이즈 추가를 따라 하는 수강생이 밟기 쉽다). 이 두 가지를 `mistakes` 나 pitfalls 와 맞춘다.
5. **권장 (그림·글)**: 구조 그림 잎 묶음 노드(`Patrol · Search`, `Chase · Attack`)의 sub 에 `: HState` (상속 화살표가 없어 HState 가 아닌 것처럼 보인다). 나쁜 예 그림의 AttackState sub 에 "emp → 기절" (명세: 각 노드에 복사된 EMP 규칙). `Unity/DroneBrain.cs` Header "웹 갤러리와 같은 이름" → "웹에 있는 값은 같은 이름" (chargeTime, moveSpeed, searchTime 은 웹에 없다). 선택: EMP 처리 기록을 "emp: Search → Active 가 처리" 처럼 잎과 처리한 층을 함께 써서 1단계(입력이 부모로 올라감)가 기록에 보이게.
6. **가이드가 바뀌었다** (`docs/specimen-guide.md`, 묶음 4 리뷰): 2절 (표본 글에서 `Unity/` 는 "연결 컴포넌트"), 3절 (`OnValidate` 뒤 다시 그리기, 이름 조회 실패는 `LogError` 와 빈 기본값, Inspector `+` 는 바인딩째 복사, `foreach` 람다 복사 불필요), 4절 (반올림·정수 변환이 있으면 조절 값 범위 전체에서 비교 경계에 걸리는 조합이 없는지, 미니 월드 ✖ 표시는 사건 기록 ✖ 와 같은 판정으로, 패턴도 같은 증상을 내는 입력 순서에서는 나쁜 예도 ✖ 를 쓰지 않음, `// [!]` 는 코어에도 똑같이 있는 줄에 두지 않음), 5절 (조절 값 끝과 프리셋에서도 그림이 겹치지 않게), 6절 (나쁜 예 증상은 Unity 에서 실제로 보이는 모습으로도, 구조 그림의 클라이언트 → 인터페이스 화살표는 Unity/ 필드 형식과 같게). 고친 뒤 바뀐 규칙에 맞는지 다시 본다.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs hierarchical-state-enemy` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs hierarchical-state-enemy`, `node tools/gallery.mjs check hierarchical-state-enemy`, `node tools/gallery.mjs unity-compile hierarchical-state-enemy` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
