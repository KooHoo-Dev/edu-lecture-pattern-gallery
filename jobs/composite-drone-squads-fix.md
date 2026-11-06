---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 6
verify:
  - node tools/truth.mjs composite-drone-squads
  - node tools/gallery.mjs check composite-drone-squads
  - node tools/gallery.mjs unity-compile composite-drone-squads
  - node tools/gallery.mjs thumbs composite-drone-squads
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)", "Bash(grep *)", "Bash(cat *)", "Bash(head *)"]
writePaths:
  - unity/composite-drone-squads/**
  - truth/composite-drone-squads/**
  - src/specimens/composite-drone-squads/**
  - src/shots/composite-drone-squads/**
allowProfiles: [org]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 수정: composite-drone-squads

Pattern Gallery 의 표본 `composite-drone-squads` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/composite-drone-squads/`, `truth/composite-drone-squads/`, `src/specimens/composite-drone-squads/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **지휘 코드가 `IUnit` 대신 `Squad` 를 안다.** `Unity/SquadCommandInput.cs` 의 `Squad root` / `public Squad Root` 로 명령을 보내는데, 구조 그림(`input → iunit`), 1단계 글("본대도 IUnit 이라…"), `IUnit.cs` 머리 주석은 지휘 코드가 `IUnit` 만 안다고 말한다. 컴포지트의 핵심(클라이언트는 공통 인터페이스만 안다)이 수강생이 복사하는 코드에서 안 보인다. `IUnit root` / `public IUnit Root` 로 바꾼다 (`Root` 로 쓰는 멤버는 모두 `IUnit` 에 있다. 합류는 `joinTarget.Squad` 를 따로 쓴다).
2. **효과 끄기 트리의 `foreach 밖` 글이 D4 칩에 가려 `foreach ㅂ` 로 잘린다** (`sim.ts` 의 글을 칩보다 먼저 그림. 합류 뒤 모든 효과 끄기 화면과 썸네일). 칩과 겹치지 않는 자리(예: 제목 오른쪽)로 옮기고 화면을 다시 찍어 확인한다.
3. **`patrolDistance` 6 이상(프리셋 `far` 7)에서 D3 가 트리 판 밑에 깔린다** (계산: D3 정찰 지점 (9.5, 4), 머리 4.84, 본대 상자는 x 8.2~14.05·y 4.75 부터이고 불투명, 드론을 트리보다 먼저 그림). 모든 프리셋과 조절 값 끝(최소·최대)에서 최종 화면을 `live` 로 찍어 겹침이 없는지 보고 고친다 (트리 판을 옮기거나 드론을 위에 그리기. 정찰 높이를 바꾸면 기록·note·setup 을 함께).
4. **"어댑터" 를 쓰지 않는다** (가이드 2절, 같은 그룹에 어댑터 패턴 표본이 있다): `meta.ts` 구조 그림 sub `어댑터 · 본대 하나에 명령`, `SquadCommandInput.cs` 머리 주석 "본대 지휘 어댑터" 를 "연결 컴포넌트" 등으로.
5. **출격 쪽 단서 글이 무대와 어긋난다.** `join-first-twice` note 는 "화면에 차이가 없다", offNote 는 "출격에서는 티가 안 난다" 인데, 합류 → 출격 순서면 sim 이 D4·D5 에 빨간 `명령 못 받음` 과 `D4 ✖` 칩을 띄운다 (사건 기록에는 ✖ 줄이 없다). 미니 월드의 ✖ 표시는 사건 기록 ✖ 와 같은 판정에서만 쓰거나 (출격 때는 다른 모양, 예: 회색 `출격 명령 못 받음 (이미 나가 있음)`), 글을 "위치는 같지만 무대는 명령이 닿지 않은 것을 표시한다 (이미 나가 있어 결과는 같다)" 로 맞춘다. 둘이 서로 맞게.
6. **`SquadNode.Join` 이 꺼진 지원 편대도 받는다.** `BuildSquad` 는 꺼진 자식을 빼는데 Join 은 `activeInHierarchy` 를 보지 않아, C 를 꺼 둔 채 합류하면 코어 드론 수는 5 인데 화면에 드론이 없다. 꺼진 대상은 거절하고, 합류 실패와 빈 칸(`joinTarget` 없음, B 꺼짐)은 `Debug.LogError` 로 알린다 (가이드 3절).
7. **글 다듬기**: `mistakes` 의 `Remove` 안내에 `Parent` 비우기만이 아니라 `children.Remove` 와 이벤트 해제(`OrderReceived -= …`, `Arrived -= …`)도 (빠뜨리면 옛 편대가 옮긴 편대의 이벤트를 계속 올린다). offNote 에 Unity(IMGUI)에서 보이는 모습 한 문장 ("편대 드론 수 3", "기지 도착 3 / 전체 3" 과 오른쪽에 떠 있는 D4·D5 만 보인다, 가이드 6절). 3단계 글에 `IUnitNode` (Hierarchy 쪽도 `is` 분기 없이 같은 컴포지트로 만든다) 한 구절. 구조 그림의 `List<IUnit>` 노드 라벨을 코드 필드 이름 `children` 으로, sub 를 `List<IUnit> · 드론도 편대도` 로 (별도 클래스로 오해하지 않게).
8. **가이드가 바뀌었다** (`docs/specimen-guide.md`, 묶음 4 리뷰): 2절 (표본 글에서 `Unity/` 는 "연결 컴포넌트"), 3절 (`OnValidate` 뒤 다시 그리기, 이름 조회 실패는 `LogError` 와 빈 기본값, Inspector `+` 는 바인딩째 복사, `foreach` 람다 복사 불필요), 4절 (반올림·정수 변환이 있으면 조절 값 범위 전체에서 비교 경계에 걸리는 조합이 없는지, 미니 월드 ✖ 표시는 사건 기록 ✖ 와 같은 판정으로, 패턴도 같은 증상을 내는 입력 순서에서는 나쁜 예도 ✖ 를 쓰지 않음, `// [!]` 는 코어에도 똑같이 있는 줄에 두지 않음), 5절 (조절 값 끝과 프리셋에서도 그림이 겹치지 않게), 6절 (나쁜 예 증상은 Unity 에서 실제로 보이는 모습으로도, 구조 그림의 클라이언트 → 인터페이스 화살표는 Unity/ 필드 형식과 같게). 고친 뒤 바뀐 규칙에 맞는지 다시 본다.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs composite-drone-squads` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs composite-drone-squads`, `node tools/gallery.mjs check composite-drone-squads`, `node tools/gallery.mjs unity-compile composite-drone-squads` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
