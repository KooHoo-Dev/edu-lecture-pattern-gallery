---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 12
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

# 표본 구현: state-drone-ai

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전).
3. 기준 샘플 `state-player-actions` 의 파일 전부 (`unity/state-player-actions/`, `truth/state-player-actions/Target.cs`, `src/specimens/state-player-actions/`). 같은 상태 패턴의 기준 샘플이다. 이 표본은 플레이어 입력이 아니라 **거리와 체력으로 스스로 전이**하는 적 AI 이고, 나쁜 예는 bool 플래그가 아니라 `enum` + `switch` 다. 두 표본이 나란히 놓였을 때 겹치지 않게 한다.
4. `docs/selection.md` 의 `state-drone-ai` 카드.

## 표본별

- ID `state-drone-ai`, namespace `PatternGallery.StateDroneAi`. 제목 `상태 패턴: 잔해 드론 AI`, 그룹 A, 순서 3, 난이도 2, `pattern: '상태 패턴'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 지표 탐사 구역의 땅 위에 잔해 드론 하나와 탐사대장 하린. 드론은 순찰 구간을 오가다(Patrol), 하린이 감지 거리 `detectRange` 안에 들어오면 쫓고(Chase), 공격 거리 `attackRange` 안이면 **멈춰서** `chargeTime` 초 충전한 뒤 사격하고 다시 충전한다(Attack). 하린이 공격 거리를 벗어나면 다시 쫓고, 감지 거리를 벗어나면 순찰로 돌아간다. 피해가 HP 를 다 깎으면 파괴(Destroyed)되고 아무것도 하지 않는다.
- **입력과 키**: `approach` 하린이 드론 쪽으로 한 걸음, `retreat` 하린이 한 걸음 물러남, `hit` 드론에 피해 1. `keys` 는 `KeyQ`, `KeyW`, `KeyE`. 하린의 위치는 입력으로만 바뀐다 (하린은 AI 가 아니다).
- **코어 (Core/)**: `IDroneState { void Enter(Drone d); void Tick(Drone d, float dt); void Exit(Drone d); }` 와 상태 넷 (`PatrolState`, `ChaseState`, `AttackState`, `DestroyedState`). 전이는 `Drone.ChangeState(IDroneState next)` **한 곳**에서만 Exit → Enter 를 부른다. `AttackState.Enter` 가 이동을 멈추고 충전을 시작하고, `AttackState.Exit` 가 이동 속도를 되돌리고 충전을 끈다 (교안이 강조한 진입·이탈 1회 처리). 상태 객체는 드론별 값을 들지 않아 여러 드론이 같은 객체를 재사용할 수 있다 (충전 시각 같은 드론별 값은 `Drone` 이 든다). 일어난 일은 C# event (`StateChanged(from, to)`, `Fired`, `Damaged`, `Destroyed` 등).
- **나쁜 예 (Naive/)**: `enum DroneState { Patrol, Chase, Attack, Destroyed }` 와 `Tick` 안의 거대 `switch` 흔한 코드. 공격으로 바뀔 때 `speed = 0` 을 하지만 공격에서 나갈 때 되돌리는 곳이 없어 ✖ `이동 멈춤` (추격 상태인데 제자리). 둘째 ✖ 는 enum + switch 에서 실제로 흔한 것 하나: 진입 처리(충전 시작)를 case 안에서 **매 프레임** 해서 충전이 끝나지 않는 것, 또는 파괴 판정이 case 밖에 있어 파괴된 뒤에도 사격 case 가 한 번 더 도는 것 중 화면에 더 분명한 것을 고른다. 문제 줄에 `// [!]`. 두 ✖ 모두 자동 데모에 나와야 한다.
- **시나리오**: 첫 번째(자동 데모, 6~7초): 다가감 몇 번(순찰 → 추격 → 공격, 사격 한 번 이상) → 물러남(공격 → 추격, 나쁜 예는 여기서 멈춤) → 다시 다가감 → 피해로 파괴. 두 번째: 감지 거리 밖으로 물러나 순찰로 돌아가는 경로. 세 번째: `values` 로 `chargeTime` 이나 거리를 바꾼 경로.
- **조절 값**: `detectRange`, `attackRange`, `chargeTime`, 그 밖에 화면 차이가 큰 것이 있으면 `moveSpeed`. 모두 Unity 어댑터의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 땅, 순찰 구간 표시, 드론은 `actor` (`role: 'enemy'`, 라벨 `잔해 드론`, `pose` 로 상태: 공격 중 `attack`, 파괴 `down`), 하린은 `actor` (`role: 'ally'`, 라벨 `하린`). 감지·공격 거리는 드론 둘레 점선 `box` 나 땅 위 띠, 충전은 드론 위 작은 `bar`, 사격은 `arrow`. 왼쪽 위에 지금 상태와 속도. 나쁜 예는 `state = Chase speed = 0` 처럼 버그를 일으키는 값을 보이고, 멈춘 동안 드론 아래 "제자리" 표시를 남긴다.
- **구조 그림**: DroneController(어댑터) → Drone → IDroneState(`kind: 'interface'`) ← Patrol · Chase · Attack · Destroyed (한 줄에 셋까지라 넷을 두 노드로 묶어도 된다), 그리고 Drone 의 `ChangeState` 화살표. 나쁜 예 구조 그림은 `enum state` 노드와 `switch` 노드, `speed` 값 노드. 단계: 1 상태가 매 Tick 거리·체력을 보고 다음 상태를 정한다, 2 `ChangeState` 가 지금 상태의 `Exit` 를 부른다 (공격이면 속도를 되돌림), 3 다음 상태의 `Enter` 를 부른다 (공격이면 멈추고 충전 시작), 4 `Tick` 은 지금 상태의 일만 한다.
- **Unity 어댑터 (Unity/)**: `DroneController : MonoBehaviour` 가 `Update` 에서 `Tick(Time.deltaTime)`, 하린 Transform 의 x 를 코어에 넘기고(`[SerializeField] Transform target`), 드론 Transform 을 코어 x 로 옮기며, `StateChanged` 핸들러에서 색이나 Animator 파라미터를 바꾼다. 하린을 움직이는 입력은 웹 시나리오용이므로 Unity 에서는 수강생의 플레이어 이동을 그대로 쓴다고 `unity.setup` 에 적는다. 피해는 `public void TakeHit(int amount)` 로 받는다.
- **글**: 증상 "공격하다 플레이어가 물러났는데 적이 제자리에 서서 안 쫓아온다" 에서 시작한다. `state-player-actions` 와의 차이(입력 대 거리로 전이, bool 대 enum 나쁜 예)를 한 문장으로 잇고 `related` 로 건다. `mistakes` 후보: Exit 에서 되돌리지 않음, 진입 처리를 매 프레임, 전이를 여러 곳에서 해 Exit/Enter 짝이 깨짐, 상태 객체에 드론별 값을 넣고 여러 드론이 공유해 섞임, 파괴 상태에서도 다른 코드가 드론을 움직임. 상태 상속으로 확장하는 방법(예: `AttackState` 를 상속한 연사 공격)은 `prompt.adaptIdeas` 에. `references`: https://gameprogrammingpatterns.com/state.html (Nystrom: State), https://unity.com/resources/design-patterns-solid-ebook (Unity 전자책, 상태 장).
- **묶음 2 리뷰에서 반복된 지적을 미리 피한다**: (1) `unity.setup`·`unity.pitfalls`·`mistakes`·Tooltip 의 모든 문장이 **이 표본의 어댑터 코드**에서 실제로 그런지 하나씩 대조한다 (일반론이 이 어댑터에서는 안 일어나면 그렇게 쓴다). (2) 효과 끄기에서 수강생이 자동 데모와 다른 순서로 눌러도 offNote 의 원인 설명이 맞는지 본다. (3) 시나리오 note 의 시각은 기록(`truth/<id>/*.log`)의 숫자와 같게 쓴다. (4) 정지 화면에서도 버그가 보이게 버그 상태가 이어지는 동안 남는 표시를 둔다. (5) 막대 기준은 조절 값으로 계산하지 않는다.
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**만 쓴다 (`state-player-actions`, `observer-health-events`, `command-undo-replay`, `strategy-turret-targeting`, `decorator-stat-buffs`, `prototype-drone-clone`, `singleton-scene-managers`. 묶음 3 의 다른 표본은 아직 없어 링크가 깨진다). Jay 의 강의 교안 같은 장의 강조점을 글에 녹이되 교안을 출처로 링크하지 않는다 (공개되지 않은 자료).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs state-drone-ai` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check state-drone-ai`, `node tools/gallery.mjs unity-compile state-drone-ai` 통과.
3. `node tools/gallery.mjs live state-drone-ai --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
