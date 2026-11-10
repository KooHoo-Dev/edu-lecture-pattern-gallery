---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 12
verify:
  - node tools/truth.mjs game-loop-fixed-step
  - node tools/gallery.mjs check game-loop-fixed-step
  - node tools/gallery.mjs unity-compile game-loop-fixed-step
  - node tools/gallery.mjs thumbs game-loop-fixed-step
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)", "Bash(grep *)", "Bash(cat *)", "Bash(head *)"]
writePaths:
  - unity/game-loop-fixed-step/**
  - truth/game-loop-fixed-step/**
  - src/specimens/game-loop-fixed-step/**
  - src/shots/game-loop-fixed-step/**
allowProfiles: [org, sub]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: game-loop-fixed-step

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전). 작업 트리에는 처음에 `node_modules` 가 없다. `node tools/gallery.mjs` 를 인자 없이 한 번 부르면 메인 폴더의 것이 정션으로 이어지니, 그 뒤 Read 도구로 연다 (셸로 상위 폴더를 뒤지지 않는다. 막혀 있다).
3. 기준 샘플 `state-player-actions` 의 파일 전부 (`unity/state-player-actions/`, `truth/state-player-actions/Target.cs`, `src/specimens/state-player-actions/`). 시간이 흐르는 코어(`Tick`)와 float 계산을 맞춘 sim 의 본보기다. 나쁜 예의 어긋남을 "있어야 할 결과" 코어와 비교해 찾는 방식은 `command-undo-replay` 의 Target 을, 업데이트 루프 구조는 `update-method-drone-list` 를 참고한다.
4. `docs/selection.md` 의 `game-loop-fixed-step` 카드.

## 표본별

- ID `game-loop-fixed-step`, namespace `PatternGallery.GameLoopFixedStep`. 제목 `게임 루프: 고정 시간 간격`, 그룹 A, 순서 6, 난이도 2, `pattern: '게임 루프'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 지표 탐사 구역의 하린 셋이 **같은 입력**을 받는다. 셋은 각각 다른 화면 프레임 속도로 도는 기기를 흉내 낸다: 30fps, 60fps, 144fps (줄 셋). 무대는 늘 1/60 로 `Tick` 하지만, 코어(또는 Target·sim 의 흉내 장치)가 무대 시간을 쌓아 줄마다 그 기기의 "화면 프레임" 을 만들고 그 프레임마다 게임 코드를 부른다 (흉내 장치는 Target.cs 와 sim.ts 에 같은 이름으로 두고, 어떻게 흉내 내는지 머리 주석에 적는다). 오른쪽에 얇은 벽이 있다. 렉(한 프레임이 `lagSpike` 초 걸림)을 일부러 낼 수 있다.
- **입력과 키**: `jump` 점프, `dash` 오른쪽으로 짧게 돌진(벽 쪽), `lag` 다음 화면 프레임 하나를 길게. `keys` 는 `KeyQ`, `KeyW`, `KeyE`.
- **코어 (Core/)**: 고정 간격 루프 `FixedStepper` (쌓인 시간 accumulator, `fixedStep`, 한 화면 프레임에 도는 고정 단계 상한 `maxStepsPerFrame` — 넘치면 버리고 알림) 와 게임 규칙 `Runner` (위치, 속도, 중력, 점프, 돌진, 벽 충돌). 규칙은 **고정 간격으로만** 진행하므로 기기 프레임 속도와 상관없이 같은 결과가 된다 (점프 최고 높이, 착지 시각, 벽에서 멈춤). 화면 위치는 마지막 두 고정 단계 사이를 보간할 수 있다 (선택, 하면 글에 적는다). 일어난 일은 C# event.
- **나쁜 예 (Naive/)**: 화면 프레임마다 가변 dt 로 바로 적분하는 흔한 코드 (`velocity.y -= gravity * dt; y += velocity.y * dt;` 를 `Update` 에서, 돌진은 dt 를 곱하지 않은 `x += dashSpeed` 처럼 한 줄은 dt 를 빠뜨린 것). ✖ `프레임마다 다른 점프` (줄마다 최고 높이나 돌진 거리가 다름. 어느 쪽이 원인인지 `// [!]` 줄로 분명히), ✖ `렉에 벽 통과` (긴 프레임 하나에 벽을 건너뜀). 문제 줄에 `// [!]`. 두 ✖ 모두 자동 데모에 나와야 한다. 줄마다의 차이는 숫자(최고 높이, 거리)로 화면에 남긴다.
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): 점프 → 돌진 → 렉 직전 돌진(벽 통과) → 점프. 두 번째: 렉만 여러 번 (패턴은 상한에 걸려 느려질 뿐 통과하지 않음, `maxStepsPerFrame` 의 의미). 세 번째: 조절 값을 바꾼 경로.
- **조절 값**: `fixedStep`, `lagSpike`, 그 밖에 화면 차이가 큰 것 (예: `jumpSpeed`). 모두 Unity 연결 컴포넌트의 `[SerializeField]` 필드와 이름이 같다 (Unity 에서 `fixedStep` 은 `Time.fixedDeltaTime` 과의 관계를 글에 적는다).
- **무대 그림**: 줄 셋(위에서 30·60·144fps, 줄마다 라벨), 줄마다 하린 `actor` (`role: 'ally'`), 벽 `box`, 줄마다 최고 높이 표시 선과 숫자, 돌진 거리 숫자. 왼쪽 위에 `고정 단계 n 회 · 화면 프레임 n 회` (줄마다). 나쁜 예는 세 줄의 최고 높이가 다른 것, 벽 너머에 선 하린이 이어서 보여야 한다.
- **구조 그림**: RunnerLoop(연결 컴포넌트) → FixedStepper (쌓인 시간) → Runner (규칙) , 그리고 화면 프레임 노드와 고정 단계 노드. 나쁜 예 구조 그림은 화면 프레임이 규칙을 바로 부르는 모양. 단계: 1 화면 프레임마다 지난 시간을 쌓는다, 2 쌓인 시간이 고정 간격만큼 있으면 규칙을 한 단계씩 돌린다, 3 한 프레임에 너무 많이 쌓이면 상한까지만 돌리고 버린다, 4 화면은 마지막 상태(또는 보간)를 그린다.
- **Unity 연결 컴포넌트 (Unity/)**: 두 가지 중 하나를 고르고 글에 적는다: (a) 코어 `FixedStepper` 를 `Update` 에서 직접 돌림 (`Time.deltaTime` 을 넣는다), (b) Unity 의 `FixedUpdate` 를 쓰고 코어는 한 단계만. (b) 를 고르면 "Unity 의 `FixedUpdate` 가 바로 이 패턴" 이라는 것과 입력은 `Update` 에서 받아 다음 `FixedUpdate` 에 넘겨야 놓치지 않는다는 것을 적는다. 어느 쪽이든 Inspector 에 기기 프레임 속도를 흉내 내는 칸(`Application.targetFrameRate` 로 30·60·144 를 바꿔 보기)을 둘 수 있다 (VSync 를 꺼야 듣는다는 것은 확인되지 않으면 단정하지 말고 "VSync 설정에 따라 다를 수 있다").
- **글**: 증상 "내 PC 에서는 점프가 높은데 노트북에서는 낮다" 에서 시작한다. `mistakes` 후보: `Time.deltaTime` 을 빠뜨림, 가변 dt 로 중력 적분(같은 dt 를 곱해도 프레임마다 높이가 조금씩 다름), 물리를 `Update` 에서, 입력을 `FixedUpdate` 에서 읽어 놓침, 렉에 상한이 없어 죽음의 나선(한 프레임이 길어져 더 많이 돌리고 더 길어짐). `references`: https://gameprogrammingpatterns.com/game-loop.html (Nystrom: Game Loop), https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Time-deltaTime.html, https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Time-fixedDeltaTime.html, https://docs.unity3d.com/6000.3/Documentation/ScriptReference/MonoBehaviour.FixedUpdate.html. `related`: `update-method-drone-list`, `state-player-actions`.
- **묶음 2~5 리뷰에서 반복된 지적을 미리 피한다** (가이드 2~7절을 먼저 읽는다): (1) `unity.setup`·`unity.pitfalls`·`mistakes`·Tooltip 의 모든 문장이 **이 표본의 Unity/ 코드**에서 실제로 그런지 하나씩 대조한다. 매뉴얼에 없는 Unity 내부 동작은 단정하지 않는다. (2) 효과 끄기에서 수강생이 자동 데모와 다른 순서로 눌러도 offNote 의 원인 설명이 맞는지 본다. (3) 시나리오 note 의 시각은 기록(`truth/<id>/*.log`)의 숫자와 같게 쓴다. (4) 정지 화면에서도 버그가 보이게 버그 상태가 이어지는 동안 남는 표시를 둔다. 한 프레임처럼 작은 어긋남은 숫자로, 같은 프레임에 사라지는 상태는 0.3~0.5초 남겨 그린다. (5) 막대 기준은 조절 값으로 계산하지 않는다. 조절 값 최소·최대, 프리셋, 나중 시나리오의 효과 켬·끔에서 글·그림이 겹치거나 잘리지 않는지 `live` 로 본다 (`p.<key>=`, `preset=`, `scenario=` 주소 인자, 가이드 7절). (6) `unity.setup` 단계끼리 모순이 없고 적힌 대로 놓으면 카메라에 모두 보인다. (7) Unity/ 코드에도 종류마다 복붙한 코드를 남기지 않는다. 인터페이스 형식의 `[SerializeField]` 칸은 Inspector 에 보이지 않는다. (8) 같은 대상(한 번씩 일어나는 일)의 같은 ✖ 는 버그 상태가 이어지는 동안 한 번, 앞 버그의 결과는 다른 이름이나 일반 사건 줄로, 패턴도 같은 증상이면 ✖ 없음 (가이드 4절). (9) `// [n]` 은 코드 줄 끝에 (주석만 있는 줄은 검사가 잡는다). `// [!]` 설명은 한 줄 안팎. 빠진 코드가 원인이면 주석만 있는 `// [!]` 줄. (10) Core 는 수강생이 복사하는 원본이다: 처리 중 재진입(핸들러가 다시 부름), 같은 프레임에 생기고 사라짐 같은 가장자리도 맞게.
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**만 쓴다 (`src/specimens/` 아래 폴더. 묶음 6 의 다른 표본은 아직 없어 링크가 깨진다).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs game-loop-fixed-step` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check game-loop-fixed-step`, `node tools/gallery.mjs unity-compile game-loop-fixed-step` 통과.
3. `node tools/gallery.mjs live game-loop-fixed-step --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
