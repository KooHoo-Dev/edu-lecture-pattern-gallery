---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 12
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

# 표본 구현: hierarchical-state-enemy

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전). 작업 트리에는 처음에 `node_modules` 가 없다. `node tools/gallery.mjs` 를 인자 없이 한 번 부르면 메인 폴더의 것이 정션으로 이어지니, 그 뒤 Read 도구로 연다 (셸로 상위 폴더를 뒤지지 않는다. 막혀 있다).
3. 기준 샘플 `state-player-actions` 의 파일 전부 (`unity/state-player-actions/`, `truth/state-player-actions/Target.cs`, `src/specimens/state-player-actions/`). 같은 상태 패턴의 기준 샘플이다. **앞 편 `state-drone-ai` 의 파일도 모두 읽는다** (고치지는 않는다): 이 표본은 그 다음 편이라 같은 땅·드론·하린·거리 표시를 쓰고, 나쁜 예가 바로 그 **평평한 상태 클래스 구조**다 (enum 이 아니다). 무대 모양과 이름을 맞춰 두 표본이 이어져 보이게 한다.
4. `docs/selection.md` 의 `hierarchical-state-enemy` 카드.

## 표본별

- ID `hierarchical-state-enemy`, namespace `PatternGallery.HierarchicalStateEnemy`. 제목 `상태 패턴: 계층 상태 기계`, 그룹 A, 순서 4, 난이도 3, `pattern: '상태 패턴'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: `state-drone-ai` 의 잔해 드론에 상태가 늘었다. 상태 트리: `Active` (부모) { `Patrol` 순찰, `Search` 수색 (나중에 더함), `Combat` (부모) { `Chase` 추격, `Attack` 공격 } }, 그리고 `Stunned` 기절. 규칙: Active 의 모든 상태는 EMP 를 맞으면 `stunTime` 초 기절한 뒤 순찰로. Combat 에 있는 동안 드론 머리의 **경계등**이 켜져 있다 (들어갈 때 켜고 나올 때 끈다). Combat 에서 하린이 감지 거리 `detectRange` 밖으로 나가면 마지막으로 본 자리로 가서 `searchTime` 초 두리번거리는 수색, 그 사이 다시 보이면 추격. 순찰 중 감지 거리 안이면 추격, 추격 중 공격 거리 `attackRange` 안이면 멈춰서 충전·사격 (앞 편과 같음).
- **입력과 키**: `approach` 하린이 한 걸음 다가감, `retreat` 한 걸음 물러남, `emp` 드론에 EMP. 하린의 위치는 입력으로만 바뀐다. `keys` 는 `KeyQ`, `KeyW`, `KeyE`.
- **코어 (Core/)**: `HState` (추상: `Parent`, `Enter`, `Exit`, `Tick`, 처리했는지 돌려주는 `Handle(string evt)`)와 상태 여섯. `StateMachine.ChangeState(target)` 이 **공통 조상**을 찾아, 지금 잎에서 공통 조상 바로 아래까지 안쪽부터 `Exit`, 공통 조상 아래에서 목표까지 바깥부터 `Enter` 를 부른다 (그래서 Chase → Attack 은 Combat 을 나가지 않아 경계등이 그대로다). 입력은 지금 잎부터 부모 쪽으로 올라가며 처음 처리한 층이 맡는다 (EMP 는 Active 가 한 곳에서). `Tick` 은 바깥 부모부터 안쪽 잎 순서로 부르고, 어느 층이 전이하면 그 프레임의 나머지 층은 건너뛴다 (Combat 의 "감지 거리 밖이면 수색" 이 자식보다 먼저). 이 순서들을 단계 글과 코드 주석에 분명히 적는다. 상태 객체는 드론별 값을 들지 않는다 (앞 편과 같음). 일어난 일은 C# event (`Entered(state)`, `Exited(state)`, `AlertChanged(bool)`, `Fired`, `Stunned` 등). 사건 기록에 `Exit Attack`, `Exit Combat`, `Enter Search` 처럼 실제 호출 순서가 보이게 한다.
- **나쁜 예 (Naive/)**: `state-drone-ai` 처럼 상태를 **평평한 클래스 다섯**(Patrol, Search, Chase, Attack, Stunned)으로 나눈 코드. 공통 규칙을 상태마다 복사했다: 각 상태의 입력 처리에 `if (evt == "emp") { 기절로 }`, Chase·Attack 의 Tick 에 "감지 거리 밖이면 수색". 경계등은 전투 상태가 추격 하나였던 시절에 쓴 `Chase.Enter` 켬 / `Chase.Exit` 끔이 그대로다. ✖ `경계등 꺼짐`: 추격 → 공격으로 옮기면 `Chase.Exit` 이 끄고 나중에 더한 `Attack.Enter` 는 켜지 않는다 (공격 중인데 꺼져 있음). ✖ `EMP 무시`: 나중에 더한 `Search` 가 EMP 규칙을 복사하지 않아 수색 중 EMP 를 맞아도 계속 움직인다. 문제 줄에 `// [!]` (빠진 규칙은 빠진 자리 근처 줄에 "여기서 … 를 복사하지 않았다" 처럼). 두 ✖ 모두 자동 데모에 나와야 한다.
- **시나리오**: 첫 번째(자동 데모, 6~7초): `approach` 몇 번 (순찰 → 추격 → 공격, 나쁜 예 경계등 꺼짐) → `retreat` 몇 번 (공격 → 추격 → 수색. 패턴은 여기서 Combat 을 나가며 경계등을 끈다) → 수색 중 `emp` (패턴 기절, 나쁜 예 계속 이동) → 기절이 끝나 순찰. 두 번째: 순찰·추격 중 EMP (Active 의 공통 규칙이 어느 자식에서든 같게 동작. 이 상태들에서는 나쁜 예도 맞다는 것을 note 에). 세 번째: 수색 중 하린이 다시 다가가 추격으로 돌아가는 경로, 또는 `values` 로 `searchTime`·`stunTime` 을 바꾼 경로.
- **조절 값**: `detectRange`, `attackRange`, `stunTime`, `searchTime` 중 화면 차이가 큰 것 3개 안팎. 모두 Unity 어댑터의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: `state-drone-ai` 와 같은 땅, 순찰 구간, 드론 `actor` (`role: 'enemy'`, 공격 `attack`, 기절 `down`), 하린 `actor` (`role: 'ally'`), 감지·공격 거리 표시, 충전 `bar`, 사격 `arrow`. 경계등은 드론 머리 위 `ring` (켜지면 빨강, 꺼지면 회색), 수색 중이면 마지막으로 본 자리에 `?` 표시, 기절이면 남은 초. 화면 오른쪽 위에 **상태 트리**: 상자 안 상자(`box`)로 Active{Patrol, Search, Combat{Chase, Attack}} 과 Stunned, 지금 잎부터 조상까지의 경로를 밝게. 나쁜 예는 같은 자리에 평평한 상자 다섯을 두고, 상자마다 복사된 규칙 꼬리표(`EMP→기절`, `경계등`)를 달아 Search 의 빠진 `EMP→기절` 을 빨갛게, 공격 중 꺼진 경계등 옆에 `경계등 꺼짐 (Chase.Exit)` 를 남긴다.
- **구조 그림**: DroneBrain(어댑터) → StateMachine → HState(추상 class 나 `kind: 'interface'`) ← Active(부모) · Combat(부모) · 잎 상태들 (잎은 `Patrol · Search`, `Chase · Attack`, `Stunned` 처럼 묶은 노드), 자식 → 부모 `ref` 화살표 (라벨 `Parent`). 한 줄에 셋까지. 나쁜 예 구조 그림은 `IDroneState` 하나에 평평한 상태 노드들, 각 노드에 복사된 EMP 규칙. 단계: 1 입력은 지금 잎부터 부모로 올라가며 처음 처리한 층이 맡는다 (EMP 는 Active), 2 전이하면 공통 조상 아래까지 안쪽부터 `Exit`, 3 공통 조상 아래에서 바깥부터 `Enter` (Chase → Attack 은 Combat 을 나가지 않는다), 4 `Tick` 은 바깥 부모 규칙부터 본다.
- **Unity 어댑터 (Unity/)**: `DroneBrain : MonoBehaviour` 가 `Update` 에서 `Tick(Time.deltaTime)`, 하린 Transform 의 x 를 코어에 넘기고(`[SerializeField] Transform target`), 드론 Transform 을 코어 x 로 옮긴다. 경계등은 `[SerializeField] GameObject alertLight` 를 `AlertChanged` 핸들러에서 켜고 끈다 (`OnEnable` 에서 지금 코어 상태로 다시 맞춤, 가이드 3절). EMP 는 `public void HitByEmp()`. 하린을 움직이는 입력은 웹 시나리오용이므로 Unity 에서는 수강생의 플레이어 이동을 그대로 쓴다고 `unity.setup` 에 적는다 (앞 편과 같음). 거리 경계에서 매 프레임 전이하지 않게 가이드 3절의 여유를 둔다 (감지 거리 밖 → 수색, 수색 중 다시 보임 → 추격이 경계 위에서 오갈 수 있다).
- **글**: 증상 "새로 넣은 수색 상태에서만 EMP 가 안 먹고, 공격만 하면 경계등이 꺼진다" 에서 시작한다. 앞 편 `state-drone-ai` 의 구조가 이 표본의 나쁜 예라는 것을 한 문장으로 잇고 `related` 로 건다. 상태가 많아질 때의 다른 선택지(푸시다운 오토마타, 동시 상태 기계)는 이름만 `prompt.adaptIdeas` 나 글 끝에. `mistakes` 후보: 공통 규칙을 상태마다 복사, 전이 때 모든 층을 나갔다 다시 들어감 (공통 조상을 찾지 않아 경계등이 깜박임), 부모가 자식보다 늦게 Tick 해 감지 거리 밖인데 자식이 공격을 이어감, 자식이 처리하지 않은 입력을 부모에 넘기지 않음, 부모 상태 객체에 드론별 값을 넣음. `references`: https://gameprogrammingpatterns.com/state.html (Nystrom: State, 계층 상태 기계 절). `related`: `state-drone-ai`, `state-player-actions`.
- **묶음 2·3 리뷰에서 반복된 지적을 미리 피한다**: (1) `unity.setup`·`unity.pitfalls`·`mistakes`·Tooltip 의 모든 문장이 **이 표본의 Unity/ 코드**에서 실제로 그런지 하나씩 대조한다 (일반론이 이 코드에서는 안 일어나면 그렇게 쓴다). (2) 효과 끄기에서 수강생이 자동 데모와 다른 순서로 눌러도 offNote 의 원인 설명이 맞는지 본다. (3) 시나리오 note 의 시각은 기록(`truth/<id>/*.log`)의 숫자와 같게 쓴다. (4) 정지 화면에서도 버그가 보이게, 버그 상태가 이어지는 동안 남는 표시를 둔다. (5) 막대 기준은 조절 값으로 계산하지 않는다. (6) `unity.setup` 단계끼리 모순이 없고, 적힌 대로 놓으면 카메라에 모두 보인다 (위치·카메라 값을 적는다). (7) Unity/ 코드에도 종류마다 복붙한 코드를 남기지 않는다 (패턴 표본의 Unity 쪽이 나쁜 예 모양이면 안 된다). (8) 같은 대상의 같은 ✖ 는 한 번, 앞 버그의 결과로 생긴 증상은 다른 이름이나 ✖ 가 아닌 사건 줄로 (가이드 4절).
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**만 쓴다 (`state-player-actions`, `observer-health-events`, `command-undo-replay`, `strategy-turret-targeting`, `decorator-stat-buffs`, `prototype-drone-clone`, `singleton-scene-managers`, `state-drone-ai`, `object-pool-projectiles`, `factory-drone-spawner`, `facade-hit-resolution`. 묶음 4 의 다른 표본은 아직 없어 링크가 깨진다). Jay 의 강의 교안 같은 장의 강조점을 글에 녹이되 교안을 출처로 링크하지 않는다 (공개되지 않은 자료).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs hierarchical-state-enemy` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check hierarchical-state-enemy`, `node tools/gallery.mjs unity-compile hierarchical-state-enemy` 통과.
3. `node tools/gallery.mjs live hierarchical-state-enemy --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
