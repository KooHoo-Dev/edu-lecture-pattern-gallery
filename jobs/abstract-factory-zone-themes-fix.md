---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 6
verify:
  - node tools/truth.mjs abstract-factory-zone-themes
  - node tools/gallery.mjs check abstract-factory-zone-themes
  - node tools/gallery.mjs unity-compile abstract-factory-zone-themes
  - node tools/gallery.mjs thumbs abstract-factory-zone-themes
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)", "Bash(grep *)", "Bash(cat *)", "Bash(head *)"]
writePaths:
  - unity/abstract-factory-zone-themes/**
  - truth/abstract-factory-zone-themes/**
  - src/specimens/abstract-factory-zone-themes/**
  - src/shots/abstract-factory-zone-themes/**
allowProfiles: [org]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 수정: abstract-factory-zone-themes

Pattern Gallery 의 표본 `abstract-factory-zone-themes` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/abstract-factory-zone-themes/`, `truth/abstract-factory-zone-themes/`, `src/specimens/abstract-factory-zone-themes/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **새 `ZoneArtSet` 에셋의 `theme` 기본값이 `"forest"` 다.** 수강생이 LavaArt·IceArt 를 만들고 Theme 을 고치지 않으면 W·E 가 경고 없이 숲으로 옮긴다 (`FactoryFor("forest")` 가 성공). 기본값을 `""` 로 바꾸고 (그러면 키를 누를 때 '공장이 없다' 가 난다), `CheckArt` 에서 같은 Theme 이 두 칸에 있으면 알린다. `unity.setup` 2 의 "새 에셋의 기본값은 숲의 초록이다" 문장도 맞춘다.
2. **Start Zone 오타(`Ice`, `lava `)면 경고 한 줄 뒤 숲으로 시작해 그대로 돈다.** `mistakes` 가 "모르는 이름은 `default` 로 넘기지 말라" 고 가르치는 바로 그 모양이다. 조립하는 곳의 이름 조회 실패는 `Debug.LogError` 로 올리고 (가이드 3절), `unity.pitfalls` 에 "Start Zone 오타면 오류를 남기고 첫 공장으로 시작한다" 처럼 실제 동작을 적는다.
3. **`ZoneDirectorInput.cs` 의 `ZoneSlot captured = slot; // 람다가 이 칸을 잡게 복사한다` 는 C# 5 부터 필요 없다** (foreach 변수는 반복마다 새것이다). 지금도 필요한 것처럼 가르치므로 줄을 지우거나 주석을 사실대로 고친다.
4. **단계·글 다듬기**: 4단계의 "(Unity 는 겉모습 에셋 하나와 칸 하나)" 가 공장 표 한 줄을 대신하는 것처럼 읽힌다 → "(Unity 는 여기에 겉모습 에셋 하나와 칸 하나를 더한다)". 목표의 "팩토리 메서드와의 차이" 를 받치는 문장을 2단계나 4단계 본문에 둔다: "팩토리 메서드는 스포너 자식이 제품 하나를 고르고(상속), 여기는 세 제품을 만드는 공장 객체를 통째로 바꾼다(조합)." `mistakes` 의 약점 항목 근처에 "값만 다르면 표(에셋)로 충분하고, 세트마다 클래스·동작이 다를 때 공장이 값을 한다" 한 문장.
5. **권장**: `Core/ZoneFactories.cs` 의 `// [4]` 가 IceFactory 의 `CreateProjectile` 한 줄에만 있어 4단계 코드 칸이 한 줄로 보인다 → 세 Create 줄 모두(또는 class 줄)에. Inspector `Zones` 의 `+` 는 마지막 칸(빙하, E 바인딩 포함)을 복사해 한 키에 두 칸이 붙는다 → `unity.pitfalls` 와 `prompt.adaptIdeas` (사막 구역)에 "칸을 더하면 Enter Action 키도 바꾼다". `sim.ts` 의 쓰기만 하고 읽지 않는 `at.bug` 를 지운다.
6. **가이드가 바뀌었다** (`docs/specimen-guide.md`, 묶음 4 리뷰): 2절 (표본 글에서 `Unity/` 는 "연결 컴포넌트"), 3절 (`OnValidate` 뒤 다시 그리기, 이름 조회 실패는 `LogError` 와 빈 기본값, Inspector `+` 는 바인딩째 복사, `foreach` 람다 복사 불필요), 4절 (반올림·정수 변환이 있으면 조절 값 범위 전체에서 비교 경계에 걸리는 조합이 없는지, 미니 월드 ✖ 표시는 사건 기록 ✖ 와 같은 판정으로, 패턴도 같은 증상을 내는 입력 순서에서는 나쁜 예도 ✖ 를 쓰지 않음, `// [!]` 는 코어에도 똑같이 있는 줄에 두지 않음), 5절 (조절 값 끝과 프리셋에서도 그림이 겹치지 않게), 6절 (나쁜 예 증상은 Unity 에서 실제로 보이는 모습으로도, 구조 그림의 클라이언트 → 인터페이스 화살표는 Unity/ 필드 형식과 같게). 고친 뒤 바뀐 규칙에 맞는지 다시 본다.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs abstract-factory-zone-themes` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs abstract-factory-zone-themes`, `node tools/gallery.mjs check abstract-factory-zone-themes`, `node tools/gallery.mjs unity-compile abstract-factory-zone-themes` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
