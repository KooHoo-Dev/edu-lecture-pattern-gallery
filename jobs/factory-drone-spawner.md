---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 12
verify:
  - node tools/truth.mjs factory-drone-spawner
  - node tools/gallery.mjs check factory-drone-spawner
  - node tools/gallery.mjs unity-compile factory-drone-spawner
  - node tools/gallery.mjs thumbs factory-drone-spawner
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)"]
writePaths:
  - unity/factory-drone-spawner/**
  - truth/factory-drone-spawner/**
  - src/specimens/factory-drone-spawner/**
  - src/shots/factory-drone-spawner/**
allowProfiles: [org]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: factory-drone-spawner

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전).
3. 기준 샘플 `observer-health-events` 의 파일 전부 (`unity/observer-health-events/`, `truth/observer-health-events/Target.cs`, `src/specimens/observer-health-events/`). 시간이 없는 코어와, 나쁜 예를 입력마다 상태 비교로 기록하는 방식의 본보기다. 나쁜 예의 어긋남을 "있어야 할 결과" 코어와 비교해 찾는 방식은 `command-undo-replay` 의 Target 을 참고한다. 드론이 움직여야 하면 `state-player-actions` 의 `Tick` 방식을 따른다.
4. `docs/selection.md` 의 `factory-drone-spawner` 카드.

## 표본별

- ID `factory-drone-spawner`, namespace `PatternGallery.FactoryDroneSpawner`. 제목 `팩토리 메서드: 드론 스포너`, 그룹 E, 순서 3, 난이도 2, `pattern: '팩토리 메서드'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 정비 기지 앞 출구에서 잔해 드론 세 종류가 나온다: 정찰(HP 1), 중장갑(HP 3), 방패(HP 2, 나중에 더한 종류). 레이더가 살아 있는 드론 수를 세고, 웨이브의 모든 드론이 파괴되면 "웨이브 끝" 을 알린다. 포탑 일제 사격은 모든 드론에 피해 1.
- **입력과 키**: `scout`, `heavy`, `shield` (그 스포너에서 하나), `next` 섞인 순서의 다음 종류 (정찰 → 중장갑 → 방패 → 정찰 …), `volley` 일제 사격. `keys` 는 `KeyQ`, `KeyW`, `KeyE`, `KeyR`, `KeyX`.
- **코어 (Core/)**: 추상 `DroneSpawner` 의 `public Drone Spawn()` 은 **템플릿 메서드**다: (1) `CreateDrone()` (2) 출구 위치에 배치 (3) 레이더에 등록 (4) 알림 — 순서가 고정이고 오버라이드하지 않는다. 자식(`ScoutSpawner`, `HeavySpawner`, `ShieldSpawner`)은 `protected abstract Drone CreateDrone()` 만 구현한다 (팩토리 메서드). `WaveDirector` 는 스포너 목록을 들고 `next` 를 `spawners[count % spawners.Count]` 로 고른다 (종류를 더하면 목록만 늘어난다). `Radar` 는 등록·해제와 살아 있는 수, 웨이브 끝 판정. 일어난 일은 C# event (`Spawned`, `Damaged`, `Destroyed`, `WaveCleared` 등).
- **나쁜 예 (Naive/)**: `SpawnDrone(string type)` 하나가 `if (type == "scout") { … } else if …` 로 만들고, **분기마다 초기화 줄(배치, 레이더 등록, 알림)을 복붙**한 흔한 코드. 섞인 순서는 `types[count % 2]` 처럼 방패를 더하기 전의 종류 수 2 를 숫자로 박아 두어 ✖ `종류 누락` (방패 차례인데 정찰이 나온다). 나중에 더한 `"shield"` 분기는 정찰 분기를 복사하다 레이더 등록 줄을 빠뜨려 ✖ `레이더 누락` (방패 드론이 살아 있는데 레이더 수가 0 이 되어 웨이브 끝을 알린다). 문제 줄에 `// [!]`. 두 ✖ 모두 자동 데모에 나와야 한다.
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): `next` 세 번 (셋째가 방패 차례) → `shield` → 일제 사격 몇 번 (정찰·중장갑이 먼저 파괴되고 방패가 남는 순간, 나쁜 예는 웨이브 끝을 알림). 두 번째: 종류별 버튼으로 하나씩 만들고 모두 파괴 (정상 웨이브 끝). 세 번째: 조절 값을 바꾼 경로.
- **조절 값**: 화면에 눈에 띄는 차이를 만드는 것 2~3개 (예: `shieldHp`, `volleyDamage`). 모두 Unity 어댑터의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 오른쪽에 출구(`box`), 드론은 `actor` (`role: 'enemy'`, 종류마다 라벨 `정찰`, `중장갑`, `방패` 와 `scale`), 머리 위 HP `bar`, 포탑 일제 사격은 `arrow` 여러 개. 왼쪽 위에 레이더 글 `레이더: 살아 있는 드론 n` 과 섞인 순서의 다음 종류. 나쁜 예는 레이더 수와 실제 화면의 드론 수가 다른 것, "웨이브 끝" 글 옆에 남은 방패 드론이 보여야 한다 (가이드 4절: 이어지는 표시).
- **구조 그림**: WaveSpawnerInput(어댑터) → WaveDirector → DroneSpawner(추상, `Spawn` 이 절차) ← ScoutSpawner · HeavySpawner · ShieldSpawner (`implements` 또는 상속), DroneSpawner → Radar. 나쁜 예 구조 그림은 `SpawnDrone(string)` 노드 하나에 분기마다 복붙된 초기화 노드. 단계: 1 `next` 가 목록에서 스포너를 고른다, 2 `Spawn` 이 자식의 `CreateDrone` 을 부른다 (무엇을 만들지는 자식), 3 배치·레이더 등록·알림은 부모 `Spawn` 이 한 곳에서 한다, 4 레이더가 파괴를 세어 웨이브 끝을 판정한다.
- **Unity 어댑터 (Unity/)**: 스포너마다 `[SerializeField]` 프리팹을 두고 코어 드론이 생기면 `Instantiate` 해 짝짓는다 (`MonoBehaviour` 를 `new` 로 만들지 않는다 — 교안 예제가 그렇게 해서 Unity 에서 경고가 나고 동작하지 않는다. `mistakes` 에 넣는다). 입력은 InputAction (`Reset` 에서 기본 키).
- **글**: 증상 "방패 드론을 새로 넣었는데 섞인 웨이브에는 안 나오고, 나오면 다 잡기 전에 웨이브가 끝난다" 에서 시작한다. 팩토리 메서드와 템플릿 메서드가 한 클래스에 함께 있다는 것(`Spawn` = 절차, `CreateDrone` = 훅)을 단계 글에서 분명히 한다. `mistakes` 후보: 종류 수를 숫자로 박음 (`Random.Range(0, 2)` 의 끝은 포함되지 않는다는 것도), 분기마다 초기화 복붙, `MonoBehaviour` 를 `new` 로, 자식이 `Spawn` 전체를 오버라이드해 절차를 다시 씀, 스포너가 만든 것을 어디에도 등록하지 않아 정리되지 않음. `references`: https://refactoring.guru/design-patterns/factory-method (Refactoring Guru: Factory Method), https://refactoring.guru/design-patterns/template-method (Refactoring Guru: Template Method), https://unity.com/resources/design-patterns-solid-ebook (Unity 전자책, 팩토리 장). `related`: `prototype-drone-clone` (만드는 두 방법: 복제와 팩토리).
- **묶음 2 리뷰에서 반복된 지적을 미리 피한다**: (1) `unity.setup`·`unity.pitfalls`·`mistakes`·Tooltip 의 모든 문장이 **이 표본의 어댑터 코드**에서 실제로 그런지 하나씩 대조한다 (일반론이 이 어댑터에서는 안 일어나면 그렇게 쓴다). (2) 효과 끄기에서 수강생이 자동 데모와 다른 순서로 눌러도 offNote 의 원인 설명이 맞는지 본다. (3) 시나리오 note 의 시각은 기록(`truth/<id>/*.log`)의 숫자와 같게 쓴다. (4) 정지 화면에서도 버그가 보이게 버그 상태가 이어지는 동안 남는 표시를 둔다. (5) 막대 기준은 조절 값으로 계산하지 않는다.
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**만 쓴다 (`state-player-actions`, `observer-health-events`, `command-undo-replay`, `strategy-turret-targeting`, `decorator-stat-buffs`, `prototype-drone-clone`, `singleton-scene-managers`. 묶음 3 의 다른 표본은 아직 없어 링크가 깨진다). Jay 의 강의 교안 같은 장의 강조점을 글에 녹이되 교안을 출처로 링크하지 않는다 (공개되지 않은 자료).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs factory-drone-spawner` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check factory-drone-spawner`, `node tools/gallery.mjs unity-compile factory-drone-spawner` 통과.
3. `node tools/gallery.mjs live factory-drone-spawner --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
