---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 8
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
allowProfiles: [sub]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 수정: game-loop-fixed-step

Pattern Gallery 의 표본 `game-loop-fixed-step` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/game-loop-fixed-step/`, `truth/game-loop-fixed-step/`, `src/specimens/game-loop-fixed-step/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **기기 흉내 칸 `Target Frame Rate` 가 듣지 않을 수 있다** (`RunnerLoop.cs` 26·84, setup 6, verify, pitfall 3). 6000.3 `Application.targetFrameRate` 문서: 데스크톱에서 `vSyncCount != 0` 이면 무시되고, Editor 에서는 Game 뷰에만 듣는다 (리뷰가 문서로 확인). "VSync 설정에 따라 다를 수 있다" 를 확인된 사실로 고쳐 쓰고, `OnEnable` 에서 `QualitySettings.vSyncCount = 0;` (주석과 함께) 을 넣거나 setup 에 "Quality 의 VSync Count 를 Don't Sync 로" 를 적는다. Game 뷰에만 듣는다는 것도.
2. **돌진 시간을 float 타이머로 센다** (`Runner.cs` 12·95·116–118·126, sim, Naive 대응 부분): `DashTime = 0.19f` 는 float 오차를 피하려 고른 값이라 간격에 따라 거리가 2.85/2.925/3.00/3.15m 로 흔들린다. 고정 간격 코어에서는 **정수 단계로** 센다: `dashStepsLeft = Math.Max(1, (int)Math.Round(Settings.DashTime / step));` 으로 두고 단계마다 줄인다. `DashTime` 은 0.2f 로 되돌린다. 간격과 상관없이 같은 거리가 필요하면 남은 거리로 자르는 방식(`Math.Min(DashSpeed*step, remaining)`)도 글에. 나쁜 예는 "프레임 단위로 끊긴다" 를 보이는 것이 목적이니 그대로 두되 글과 맞춘다. C#·sim 을 같게, 기록을 다시 만든다.
3. **setup 6 의 시연 순서로는 벽 상황이 안 나온다** (`meta.ts` 228): "W 한 번 (x 9) → 돌진이 끝난 뒤 W 와 바로 E" 로 고치고 verify 의 "벽 앞에서" 와 맞춘다.
4. **일관성 정리에서 빠진 것**: pitfall 6 의 InputAction 콜백 떼기 내용은 지운다 (프롬프트 고정 규칙으로 옮겼다. `Stepped -= Runner.Step` 같은 이 표본만의 내용은 남김). IMGUI 문구는 OnValidate 항목에서 떼어 따로 한 항목으로, 표준 문장으로 쓰되 이 표본은 횟수 글을 매 프레임 `Update` 에서 고치므로 끝 문장을 "횟수 글은 매 프레임 바뀌어 `Update` 에서 고친다" 로. offNote 883자 → 450자 안팎 (시각·숫자는 시나리오 note 에 있다).
5. **원인 설명 바로잡기**: offNote 의 144fps 돌진 2.92m 원인은 `x += dashSpeed * dt` 가 아니라 `dashTimer -= dt` 와 `> 0` 비교가 돌진 시간을 프레임 단위로 끊는 것이다 (`NaiveRunner.cs` 38·41. 144fps 는 28프레임 0.194초). 물리: 나쁜 예와 코어는 둘 다 semi-implicit(symplectic) Euler (속도 먼저, 그 속도로 위치) 라 최고 높이 ≈ (v0 − g·dt/2)²/2g (30/60/144fps 0.672/0.735/0.772m, 고정 0.02 는 0.722m, 공식 0.80m). mistakes[0] 의 "속도가 그대로라고 보고" 는 이 순서와 맞지 않는다 — 위치를 먼저 옮기는 explicit Euler 면 오히려 30fps 가 더 높이 뜬다는 것을 밝힌다. mistakes[1] 의 "dt 를 곱해도 모자라므로" 는 지나치다: 중력이 일정하면 `y += v*dt - 0.5f*g*dt*dt` 로 높이 차가 거의 사라진다. 그래도 고정 간격이 필요한 까닭(충돌·터널링, 결정성·리플레이, 공식이 없는 힘)을 한 문장.
6. **Unity 와 웹의 차이** (가이드 6절): lagSpike hint 와 long-lag 프리셋의 "7.5m" 는 웹에서만이다. Unity 는 `Time.maximumDeltaTime`(기본 0.3333333)으로 dt 를 잘라 약 5m 가 된다. 렉 프레임 dt 는 Sleep 시간 + 보통 프레임 시간이라 30fps 에서는 자르는 경계에 닿는다는 것을 한 구절. 나쁜 예 구조 그림 화살표 글 `한 번에 4.5m` → `한 번에 15 × dt`.
7. **자잘한 것**: `RunnerLoop.cs` 13 `[Min(0.005f)]` → `[Range(0.005f, 0.05f)]` (0.054 를 넘으면 코어도 벽을 뚫는다) 또는 Tooltip. 단계 4(보간)가 미니 월드에 안 보인다 → coarse-step 의 144fps 줄에 규칙 위치(r.X, r.Y)를 흐린 `actor` (alpha) 로 그려 보간 차이가 정지 화면에 남게. 나쁜 예 줄마다 0.72m(패턴) 회색 기준선을 그어 높이 차가 눈에 보이게. jumpSpeed 9.5 이상에서 최고 높이 표시와 "최고 · 돌진" 글이 겹치는 것, tight-cap 의 0.76m 선이 하린·"벽" 글자에 겹치는 것 정리. pitfall 1 에 `FixedUpdate` 로 옮기면 `Stepper.Alpha` 가 사라지고 대안은 `(Time.time - Time.fixedTime) / Time.fixedDeltaTime`. maxSteps hint "12 면 거의 다 따라잡는다" → 실제 숫자(0.24초만 돌고 0.06~0.08초를 버린다).
8. **갤러리 전체 일관성 정리(`2794a90`)의 관례에 맞춘다** (다른 표본 meta 를 보고 같게): (1) `title` 은 `src/registry.ts` PLANNED 의 제목과 글자까지 같게 (검사가 이제 잡는다). (2) `unity.setup` 1단계는 `state-player-actions` 의 setup[0] 과 같은 문구 (`<id>` 만 바꿈, Active Input Handling 문장 포함). (3) IMGUI 확인용 글 주의는 표준 문구 "왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다." 에 표본별 덧말만 뒤에 (코드가 실제로 그렇게 하는지 맞춘다). (4) 표본별 InputAction 주의는 두지 않는다 (`src/ai.ts` 고정 규칙으로 옮겼다). (5) `Reset` 키는 `기본 키(…)` 로 쓰고, 웹 무대 키가 Unity 기본 키와 다르면 "웹 갤러리 무대의 … 는 Unity 에서 … 다" 를 한 줄. (6) 학생이 읽는 글에서 MonoBehaviour 쪽은 "연결 컴포넌트" (어댑터 아님). (7) Inspector 에 칠 숫자의 빼기는 ASCII `-`. (8) 모든 단계가 어떤 시나리오에서 한 번은 화면에 보여야 한다 (가이드 6절 `steps`).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs game-loop-fixed-step` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs game-loop-fixed-step`, `node tools/gallery.mjs check game-loop-fixed-step`, `node tools/gallery.mjs unity-compile game-loop-fixed-step` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
