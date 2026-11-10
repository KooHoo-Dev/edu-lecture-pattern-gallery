---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 12
verify:
  - node tools/truth.mjs chain-input-handlers
  - node tools/gallery.mjs check chain-input-handlers
  - node tools/gallery.mjs unity-compile chain-input-handlers
  - node tools/gallery.mjs thumbs chain-input-handlers
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)", "Bash(grep *)", "Bash(cat *)", "Bash(head *)"]
writePaths:
  - unity/chain-input-handlers/**
  - truth/chain-input-handlers/**
  - src/specimens/chain-input-handlers/**
  - src/shots/chain-input-handlers/**
allowProfiles: [org, sub]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: chain-input-handlers

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전). 작업 트리에는 처음에 `node_modules` 가 없다. `node tools/gallery.mjs` 를 인자 없이 한 번 부르면 메인 폴더의 것이 정션으로 이어지니, 그 뒤 Read 도구로 연다 (셸로 상위 폴더를 뒤지지 않는다. 막혀 있다).
3. 기준 샘플 `observer-health-events` 의 파일 전부 (`unity/observer-health-events/`, `truth/observer-health-events/Target.cs`, `src/specimens/observer-health-events/`). 시간이 없는 코어와 구독자 여럿의 본보기다 (이 표본은 "모두에게 알리기" 와 반대로 "처리하면 멈추기" 다). 나쁜 예의 어긋남을 "있어야 할 결과" 코어와 비교해 찾는 방식은 `command-undo-replay` 의 Target 을 참고한다.
4. `docs/selection.md` 의 `chain-input-handlers` 카드.

## 표본별

- ID `chain-input-handlers`, namespace `PatternGallery.ChainInputHandlers`. 제목 `책임 연쇄: 클릭 처리 사슬`, 그룹 B, 순서 4, 난이도 2, `pattern: '책임 연쇄 패턴'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 정비 기지 화면. 클릭(탭)이 떨어질 수 있는 것: 화면 위 UI 정비 버튼, 땅 위의 드론, 땅. 클릭은 앞에서부터 처리자 사슬을 지난다: (팝업이 열려 있으면) 팝업 → UI 버튼 → 드론 선택 → 땅 이동 명령. 처리한 처리자가 소비하면 뒤로 넘기지 않는다. 팝업은 열려 있는 동안 자기 밖 클릭도 모두 먹는다 (모달).
- **입력과 키**: 클릭이 정해진 자리에 떨어지는 입력 넷: `tapButton` (정비 버튼 위, 그 아래에 땅이 있다), `tapDrone` (드론 위, 그 아래에 땅), `tapGround` (빈 땅), `togglePopup` (정비 버튼이 여는 팝업을 열고 닫기 — 버튼 클릭이 팝업을 여는 것과 같게 할지 따로 둘지 글과 맞게). `keys` 는 `KeyQ`, `KeyW`, `KeyE`, `KeyR`.
- **코어 (Core/)**: `IClickHandler { bool Handle(Click c); }` (처리했으면 `true`), 사슬 `ClickChain` (순서 있는 목록, 앞에서부터 `Handle` 을 불러 `true` 면 멈춤, 아무도 처리하지 않으면 이벤트), 처리자 넷 (`PopupHandler`, `UiButtonHandler`, `DroneSelectHandler`, `GroundMoveHandler`). 각 처리자는 자기 영역에 맞는지만 본다. 일어난 일은 C# event (`Handled(by, click)`, `Unhandled` 등).
- **나쁜 예 (Naive/)**: UI, 드론 선택, 땅 이동이 클릭 이벤트를 **각자 구독**하고 각자 판정하는 흔한 코드 (서로 모른다). ✖ `클릭 관통` (버튼을 눌렀는데 하린이 그 자리로 걸어감), ✖ `두 번 처리` (드론을 눌렀더니 선택과 이동 명령이 함께). 팝업이 열려 있어도 뒤가 반응하는 것은 같은 원인의 다른 대상이면 같은 종류로 (가이드 4절의 "대상" 정의). 문제 줄에 `// [!]` (빠진 소비 확인은 주석만 있는 `// [!]` 줄). 두 ✖ 모두 자동 데모에 나와야 한다.
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): 땅 → 드론 → 버튼(팝업 열림) → 땅(팝업이 먹음) → 팝업 닫기 → 버튼. 두 번째: 팝업이 열린 채 여러 곳 클릭. 세 번째: 조절 값을 바꾼 경로 (예: 버튼 크기·위치를 바꿔 겹침이 달라짐).
- **조절 값**: 화면 차이가 큰 것 2개 안팎 (예: `buttonWidth`, `walkSpeed`). 모두 Unity 연결 컴포넌트의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 땅, 하린 `actor` (`role: 'ally'`), 드론 `actor` (`role: 'enemy'` 또는 중립), 화면 위 UI 버튼 `box` (UI 층이라는 표시), 팝업 `box`. 클릭이 떨어진 자리에 `ring` 과 번호. 오른쪽 위에 사슬 줄: `팝업 → 버튼 → 드론 → 땅` 칸마다 이번 클릭이 지나간 칸 ✓, 소비한 칸 ●, 닿지 않은 칸 흐림. 나쁜 예는 같은 클릭에 반응한 처리자가 둘 이상 빛나고, 하린이 버튼 아래로 걸어간 것이 이어서 보여야 한다.
- **구조 그림**: ClickInput(연결 컴포넌트) → ClickChain → IClickHandler(`interface`) ← PopupHandler · UiButtonHandler · DroneSelectHandler · GroundMoveHandler (한 줄에 셋까지라 묶어도 된다), 그리고 처리자 사이의 "다음" 화살표. 나쁜 예 구조 그림은 클릭 이벤트 하나를 세 시스템이 각자 구독하는 모양. 단계: 1 클릭이 사슬의 앞에 들어온다, 2 처리자가 자기 영역이면 처리하고 소비한다, 3 아니면 다음 처리자로 넘긴다, 4 끝까지 아무도 안 받으면 버린다.
- **Unity 연결 컴포넌트 (Unity/)**: `ClickInput : MonoBehaviour` 가 Input System 의 클릭(포인터) 액션으로 화면 좌표를 받아 코어 `Click` 으로 넘긴다. 실제 Unity 에서는 UGUI 의 `EventSystem` 이 UI 를 먼저 받으므로, UI 처리자는 `EventSystem.current.IsPointerOverGameObject()` 로 판정하는 방법이 흔하다고 글에 적는다. 단, Input System 액션 콜백 안에서 이 함수를 부르면 경고가 나고 결과가 한 프레임 늦을 수 있다는 것은 **확인되지 않으면 단정하지 말고** "콜백 안에서 부르면 기대와 다를 수 있다 (Input System 문서의 UI support 를 확인)" 정도로 쓴다. 드론·땅 판정은 Raycast 대신 이 표본의 코어 영역 판정을 쓰고, 실제 게임에서는 `Physics.Raycast`/`Physics2D.OverlapPoint` 로 바꾼다고 적는다.
- **글**: 증상 "UI 버튼을 눌렀는데 뒤의 땅도 클릭되어 캐릭터가 걸어간다" 에서 시작한다. 관찰자(모두에게 알림)와의 차이를 한 문장 (책임 연쇄는 처리하면 멈춘다). `mistakes` 후보: 시스템마다 클릭을 각자 들음, 처리하고도 `true` 를 안 돌려줌, 사슬 순서가 화면 겹침 순서와 다름, 모달 팝업이 바깥 클릭을 안 먹음, 사슬 끝에서 처리 안 된 클릭을 조용히 버려 디버깅이 어려움. `references`: https://refactoring.guru/design-patterns/chain-of-responsibility (Refactoring Guru: Chain of Responsibility), https://docs.unity3d.com/Packages/com.unity.ugui@2.0/api/UnityEngine.EventSystems.EventSystem.html (UGUI `EventSystem`), https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/UISupport.html (Input System UI support). `related`: `command-undo-replay`, `observer-health-events`.
- **묶음 2~5 리뷰에서 반복된 지적을 미리 피한다** (가이드 2~7절을 먼저 읽는다): (1) `unity.setup`·`unity.pitfalls`·`mistakes`·Tooltip 의 모든 문장이 **이 표본의 Unity/ 코드**에서 실제로 그런지 하나씩 대조한다. 매뉴얼에 없는 Unity 내부 동작은 단정하지 않는다. (2) 효과 끄기에서 수강생이 자동 데모와 다른 순서로 눌러도 offNote 의 원인 설명이 맞는지 본다. (3) 시나리오 note 의 시각은 기록(`truth/<id>/*.log`)의 숫자와 같게 쓴다. (4) 정지 화면에서도 버그가 보이게 버그 상태가 이어지는 동안 남는 표시를 둔다. 한 프레임처럼 작은 어긋남은 숫자로, 같은 프레임에 사라지는 상태는 0.3~0.5초 남겨 그린다. (5) 막대 기준은 조절 값으로 계산하지 않는다. 조절 값 최소·최대, 프리셋, 나중 시나리오의 효과 켬·끔에서 글·그림이 겹치거나 잘리지 않는지 `live` 로 본다 (`p.<key>=`, `preset=`, `scenario=` 주소 인자, 가이드 7절). (6) `unity.setup` 단계끼리 모순이 없고 적힌 대로 놓으면 카메라에 모두 보인다. (7) Unity/ 코드에도 종류마다 복붙한 코드를 남기지 않는다. 인터페이스 형식의 `[SerializeField]` 칸은 Inspector 에 보이지 않는다. (8) 같은 대상(한 번씩 일어나는 일)의 같은 ✖ 는 버그 상태가 이어지는 동안 한 번, 앞 버그의 결과는 다른 이름이나 일반 사건 줄로, 패턴도 같은 증상이면 ✖ 없음 (가이드 4절). (9) `// [n]` 은 코드 줄 끝에 (주석만 있는 줄은 검사가 잡는다). `// [!]` 설명은 한 줄 안팎. 빠진 코드가 원인이면 주석만 있는 `// [!]` 줄. (10) Core 는 수강생이 복사하는 원본이다: 처리 중 재진입(핸들러가 다시 부름), 같은 프레임에 생기고 사라짐 같은 가장자리도 맞게.
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**만 쓴다 (`src/specimens/` 아래 폴더. 묶음 6 의 다른 표본은 아직 없어 링크가 깨진다).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs chain-input-handlers` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check chain-input-handlers`, `node tools/gallery.mjs unity-compile chain-input-handlers` 통과.
3. `node tools/gallery.mjs live chain-input-handlers --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
