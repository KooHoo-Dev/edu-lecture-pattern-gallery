---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 8
verify:
  - node tools/truth.mjs state-drone-ai
  - node tools/gallery.mjs check state-drone-ai
  - node tools/gallery.mjs unity-compile state-drone-ai
  - node tools/gallery.mjs thumbs state-drone-ai
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)"]
writePaths:
  - unity/state-drone-ai/**
  - truth/state-drone-ai/**
  - src/specimens/state-drone-ai/**
  - src/shots/state-drone-ai/**
allowProfiles: [org]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 수정: state-drone-ai

Pattern Gallery 의 표본 `state-drone-ai` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/state-drone-ai/`, `truth/state-drone-ai/`, `src/specimens/state-drone-ai/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **Unity 에서 공격↔추격이 매 프레임 깜박일 수 있다.** `AttackState` 에 들어가는 경계(`<= attackRange`)와 나가는 경계(`> attackRange`)가 같아, 플레이어가 드론보다 느리게 계속 물러나면 매 프레임 전이하고 `CrossFade` 가 매 프레임 다시 불린다 (웹은 걸음 단위라 안 보인다). 나가는 거리에 여유를 둔다 (예: `attackRange + 0.5` 를 넘어야 추격으로. 여유 값은 상수나 조절 값으로, 글에 이유를 적는다). Core 를 바꾸면 sim·Target 과 기록을 함께 고친다 (`node tools/truth.mjs state-drone-ai`). 시나리오 note 의 시각도 기록에 맞춘다 (가이드 3절).
2. **`mistakes[4]` (파괴된 드론이 떨림)가 이 어댑터에서는 맞지 않는다.** `DroneController.Update` 가 모든 상태에서 매 프레임 위치를 코어 값으로 덮어써, 다른 코드의 이동(넉백 등)은 실행 순서에 따라 조용히 무시되거나 한 프레임 튈 뿐이다. 이 어댑터 동작에 맞게 고쳐 쓴다.
3. **자동 데모 끝 화면에서 `잔해 드론 · 파괴` 이름표가 하린 캡슐 위에 겹친다** (`_review/state-drone-ai/live-t6.2-*`). 겹치지 않게 옮긴다. 구조 그림의 `change` 화살표가 `AttackState → Drone` 에만 있어 다른 전이 때도 AttackState 가 부른 것처럼 빛난다 → 라벨을 "상태들이 ChangeState" 로 하거나 지금 전이를 부른 상태에서 빛나게. 프리셋 `hunter` 글의 "7.5m 밖에서 알아채고" → "7.5m 앞에서".
4. **코어 다듬기**: `AttackState.Tick` 에서도 `FaceTarget()` (공격 중 대상이 드론을 지나치면 등을 돌린 채 쏜다. sim 의 사격 화살표 시작점도). `DestroyedState.Exit` 에 "나가는 전이가 없어 되돌리지 않는다. 부활을 더하면 여기서 속도를 되돌린다" 주석 (Enter 에서 바꾼 것을 Exit 에서 되돌린다는 원칙과 맞추기). 나쁜 예의 읽히지 않는 `isCharging` 은 지우거나 의도를 주석으로.
5. **어댑터**: `OnValidate` 가 `Speed > 0` 이 아니라 상태(공격·파괴가 아닐 때)로 속도를 다시 넣게. `OnEnable` 에서 Animator 를 지금 코어 상태로 다시 맞춘다 (가이드 3절). `CrossFade` 의 0.05 는 정규화 시간이라 `CrossFadeInFixedTime` 이 더 분명하다 (선택).
6. **`state-player-actions` 와의 대비 글**: 단계 1 의 "입력이 아니라 거리와 체력이 전이를 일으킨다" 는 `hit` 입력이 파괴 전이를 일으키는 것과 부딪힌다 → "입력을 상태에 넘기지 않고, 상태가 조건(거리·HP)을 보고 스스로 전이한다" 로. 두 표본의 `Tick` 방식 차이 (그쪽은 다음 상태를 돌려줌, 이쪽은 상태가 `ChangeState` 를 부름) 를 한 문장. `mistakes` 중 그쪽과 거의 같은 항목(전이가 흩어져 Exit 를 건너뜀)은 `TakeHit` 경로 중심으로 줄여 겹침을 덜고, 상태 객체 공유 항목은 이 표본이 실제로 static 한 벌을 쓰므로 남긴다. 둘째 ✖ offNote 에 "0.02 에 머문다" 가 한 프레임 dt 라는 것을 덧붙인다. 그리고 Unity 경계 깜박임과 해법을 `unity.pitfalls` 에.
7. **가이드가 바뀌었다** (`docs/specimen-guide.md`): 3절 (이벤트로 맞추는 화면은 `OnEnable` 에서 다시 맞추기, IMGUI 확인용 글, 거리 경계 깜박임), 4절 ("같은 버그는 한 번" = 같은 대상의 같은 종류는 한 번, 결과 증상은 다른 이름이나 일반 사건 줄로). 무대의 문제 줄 칸이 이제 `// [!]` 뒤 설명도 보이므로, 설명을 짧고 분명하게 (한 줄 안팎) 다듬는다.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs state-drone-ai` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs state-drone-ai`, `node tools/gallery.mjs check state-drone-ai`, `node tools/gallery.mjs unity-compile state-drone-ai` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
