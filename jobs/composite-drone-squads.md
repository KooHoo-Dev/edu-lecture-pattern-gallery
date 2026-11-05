---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 10
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

# 표본 구현: composite-drone-squads

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전). 작업 트리에는 처음에 `node_modules` 가 없다. `node tools/gallery.mjs` 를 인자 없이 한 번 부르면 메인 폴더의 것이 정션으로 이어지니, 그 뒤 Read 도구로 연다 (셸로 상위 폴더를 뒤지지 않는다. 막혀 있다).
3. 기준 샘플 `state-player-actions` 의 파일 전부 (`unity/state-player-actions/`, `truth/state-player-actions/Target.cs`, `src/specimens/state-player-actions/`). 시간이 흐르는 코어(`Tick`)와 float 계산을 맞춘 sim 의 본보기다 (드론이 난다). 나쁜 예의 어긋남을 "있어야 할 결과" 코어와 비교해 찾는 방식은 `command-undo-replay` 의 Target 을 참고한다.
4. `docs/selection.md` 의 `composite-drone-squads` 카드.

## 표본별

- ID `composite-drone-squads`, namespace `PatternGallery.CompositeDroneSquads`. 제목 `컴포지트 패턴: 드론 편대 명령`, 그룹 F, 순서 3, 난이도 2, `pattern: '컴포지트 패턴'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 정비 기지(왼쪽)의 아군 정찰 드론. 본대는 드론 `D1` 과 편대 `B` (`D2`, `D3`). 지원 편대 `C` (`D4`, `D5`) 는 처음부터 탐사 구역 오른쪽 멀리서 정찰 중이고 아직 본대에 속하지 않는다. 합류하면 편대 `B` 의 **하위 편대**가 된다 (본대 → B → C, 세 단계). 출격하면 드론마다 정해진 정찰 지점으로, 귀환하면 기지의 자기 자리로 `flySpeed` 로 난다. 화면 위쪽에 `편대 드론 수` 와 `기지 도착 n / 전체 n`.
- **입력과 키**: `sortie` 출격, `recall` 귀환, `join` 지원 편대 C 합류 (이미 합류했으면 받지 않고 이벤트로 알린다). 명령은 언제나 **본대 하나**에 보낸다. `keys` 는 `KeyQ`, `KeyW`, `KeyE`.
- **코어 (Core/)**: `IUnit` (이름, `Sortie()`, `Recall()`, `int CountDrones()`)을 잎 `Drone` 과 가지 `Squad` 가 함께 구현한다. `Squad` 는 `List<IUnit>` 자식을 들고 같은 메서드를 자식마다 부른다 (자식이 드론인지 편대인지 묻지 않는다. `is` 검사 없음). `Squad.Add(IUnit)` 는 자기 자신이나 자기 조상을 넣으려 하면 받지 않고 이벤트로 알린다 (무한 재귀 방지). 드론의 이동은 `Tick(dt)` (본대 `Tick` 이 자식에게 내려 보내도 되고 드론 목록을 따로 돌려도 된다. 어느 쪽인지 단계 글과 맞춘다). 일어난 일은 C# event (`OrderReceived(unit, order)`, `Arrived`, `Joined`, `JoinRejected` 등). 명령이 트리를 어떤 순서로 내려갔는지 사건 기록에서 보이게 한다.
- **나쁜 예 (Naive/)**: 개별과 묶음을 다르게 다루는 흔한 코드. 나쁜 예의 `Squad` 는 `List<Drone> drones` 와 나중에 더한 `List<Squad> squads` 를 따로 들고, 지휘 코드의 `RecallAll()` 과 `CountDrones()` 가 **두 단계까지만** 돈다 (`root.drones` 와 `root.squads` 의 각 `drones`. 하위 편대가 없던 시절에 쓴 코드). 합류로 C 가 B 의 하위 편대가 되면 귀환 명령이 C 의 드론에 닿지 않아 ✖ `귀환 누락` (D4, D5 가 밖에 남음), 드론 수가 C 를 세지 않아 ✖ `수 오산` (화면 3, 실제 5). 출격 코드도 같은 두 단계지만 C 는 처음부터 나가 있어 출격에서는 티가 안 난다. 이것을 offNote 나 시나리오 note 에 정직하게 적는다. 문제 줄에 `// [!]`. 두 ✖ 모두 자동 데모에 나와야 한다.
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): 출격 → (드론이 정찰 지점에 닿을 즈음) 합류 → 귀환 (나쁜 예는 D4, D5 가 남는다). 두 번째: 합류하지 않고 출격 → 귀환 (두 단계뿐이면 나쁜 예도 맞다는 것을 note 에). 세 번째: 합류를 먼저 하고 출격 → 귀환, 또는 `values` 로 `flySpeed` 를 바꾼 경로. 합류를 두 번 누르는 입력을 한 시나리오에 넣어 받지 않는 경로도 덮는다.
- **조절 값**: `flySpeed`, 그리고 화면 차이가 분명한 것 하나 (예: 정찰 지점까지의 거리 `patrolDistance`). 모두 Unity 어댑터의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 왼쪽 기지(`box`)와 자리 다섯 칸, 드론은 `actor` (`role: 'ally'`, `scale` 0.6 안팎, 라벨 `D1`~`D5`, 나는 동안 `pose: 'run'`). 화면 오른쪽 위에 **편대 트리**: 본대 상자 안에 D1 과 편대 B 상자, B 상자 안에 D2·D3 과 (합류 뒤) 편대 C 상자 (상자 안 상자, `box` 겹치기). 합류 전 C 는 트리 밖에 따로. 마지막 명령이 닿은 드론은 트리와 미니 월드 양쪽에 표시 (예: `귀환 ✓`). 왼쪽 위에 `편대 드론 수 n` 과 `기지 도착 n / 전체 n`. 나쁜 예는 명령이 닿지 않은 드론 위에 빨간 `명령 못 받음` 을 남기고 (다른 드론이 다 돌아온 뒤에도), 드론 수 옆에 `(실제 5)` 를 둔다.
- **구조 그림**: SquadCommandInput(어댑터) → IUnit(`kind: 'interface'`, 본대) ← Drone · Squad (`implements`), Squad → IUnit (`ref`, 라벨 `자식들`. 편대가 같은 인터페이스를 다시 가리키는 것이 핵심). 나쁜 예 구조 그림은 지휘 코드 → `drones` 목록, 지휘 코드 → `squads` 목록 → 각 편대의 `drones` 목록 (두 단계), 그리고 닿지 않는 `하위 편대` 노드. 단계: 1 명령은 본대 하나에 보낸다 (지휘 코드는 트리 모양을 모른다), 2 편대는 자식마다 같은 메서드를 부른다 (드론인지 편대인지 묻지 않는다), 3 하위 편대도 같은 일을 되풀이해 잎까지 내려간다, 4 드론(잎)이 실제로 움직이고 도착을 알린다.
- **Unity 어댑터 (Unity/)**: 편대 GameObject 에 `SquadNode`, 드론에 `DroneUnit`. 코어 트리는 **Hierarchy 모양 그대로** 만든다: `SquadNode` 가 자기 바로 아래 자식 Transform 을 보고 `DroneUnit` 은 잎, `SquadNode` 는 하위 편대로 넣는다 (Unity Hierarchy 자체가 컴포지트라는 것을 글에 잇는다). 합류는 지원 편대의 `transform.SetParent(편대 B)` 와 코어 `Add` 를 함께 한다 (`SetParent` 의 `worldPositionStays` 로 위치가 튀지 않게). 입력은 본대의 `SquadCommandInput` (InputAction 셋, `Reset` 에서 기본 키). 드론 Transform 은 `Update` 에서 코어 위치로 옮긴다. `GetComponentsInChildren<DroneUnit>()` 로 모든 드론을 한 번에 얻을 수도 있지만 그러면 "편대 단위로 명령" 이 사라진다는 것, 꺼진 자식을 넣을지는 `includeInactive` 매개변수로 정한다는 것을 pitfalls 나 글에.
- **글**: 증상 "지원 편대를 합류시킨 뒤 귀환 명령을 내렸더니 그 편대만 밖에 남았다" 에서 시작한다. 교안의 함정 문장(개별과 묶음을 다르게 처리하면 중첩될수록 분기가 감당 안 된다)을 글에 녹인다. `mistakes` 후보: `is Squad` 로 분기, 두 단계만 도는 `foreach`, 편대를 자기 안(또는 조상 안)에 넣어 무한 재귀, 한 드론이 두 편대에 들어가 명령을 두 번 받음, 명령을 돌리는 중에 자식 목록을 고침 (`InvalidOperationException`), 잎에도 `Add` 를 두고 예외로 막기 (투명성과 안전성의 선택). `references`: https://refactoring.guru/design-patterns/composite (Refactoring Guru: Composite), https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Component.GetComponentsInChildren.html (Unity `Component.GetComponentsInChildren`). `related`: `decorator-stat-buffs` (같은 인터페이스로 하나를 감싸기 대 여럿을 묶기), `command-undo-replay` (편대 명령을 명령 객체로 만들면 되돌리기도 된다).
- **묶음 2·3 리뷰에서 반복된 지적을 미리 피한다**: (1) `unity.setup`·`unity.pitfalls`·`mistakes`·Tooltip 의 모든 문장이 **이 표본의 Unity/ 코드**에서 실제로 그런지 하나씩 대조한다 (일반론이 이 코드에서는 안 일어나면 그렇게 쓴다). (2) 효과 끄기에서 수강생이 자동 데모와 다른 순서로 눌러도 offNote 의 원인 설명이 맞는지 본다. (3) 시나리오 note 의 시각은 기록(`truth/<id>/*.log`)의 숫자와 같게 쓴다. (4) 정지 화면에서도 버그가 보이게, 버그 상태가 이어지는 동안 남는 표시를 둔다. (5) 막대 기준은 조절 값으로 계산하지 않는다. (6) `unity.setup` 단계끼리 모순이 없고, 적힌 대로 놓으면 카메라에 모두 보인다 (위치·카메라 값을 적는다). (7) Unity/ 코드에도 종류마다 복붙한 코드를 남기지 않는다 (패턴 표본의 Unity 쪽이 나쁜 예 모양이면 안 된다). (8) 같은 대상의 같은 ✖ 는 한 번, 앞 버그의 결과로 생긴 증상은 다른 이름이나 ✖ 가 아닌 사건 줄로 (가이드 4절).
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**만 쓴다 (`state-player-actions`, `observer-health-events`, `command-undo-replay`, `strategy-turret-targeting`, `decorator-stat-buffs`, `prototype-drone-clone`, `singleton-scene-managers`, `state-drone-ai`, `object-pool-projectiles`, `factory-drone-spawner`, `facade-hit-resolution`. 묶음 4 의 다른 표본은 아직 없어 링크가 깨진다). Jay 의 강의 교안 같은 장의 강조점을 글에 녹이되 교안을 출처로 링크하지 않는다 (공개되지 않은 자료).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs composite-drone-squads` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check composite-drone-squads`, `node tools/gallery.mjs unity-compile composite-drone-squads` 통과.
3. `node tools/gallery.mjs live composite-drone-squads --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
