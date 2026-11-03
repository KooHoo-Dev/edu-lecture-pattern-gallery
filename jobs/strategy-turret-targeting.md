---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 12
verify:
  - node tools/truth.mjs strategy-turret-targeting
  - node tools/gallery.mjs check strategy-turret-targeting
  - node tools/gallery.mjs unity-compile strategy-turret-targeting
  - node tools/gallery.mjs thumbs strategy-turret-targeting
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)"]
writePaths:
  - unity/strategy-turret-targeting/**
  - truth/strategy-turret-targeting/**
  - src/specimens/strategy-turret-targeting/**
  - src/shots/strategy-turret-targeting/**
allowProfiles: [org]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: strategy-turret-targeting

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전).
3. 기준 샘플 `state-player-actions` 의 파일 전부 (`unity/state-player-actions/`, `truth/state-player-actions/Target.cs`, `src/specimens/state-player-actions/`). 시간이 흐르는 코어(`Tick`)와 float 계산을 맞춘 sim 의 본보기다. 나쁜 예의 어긋남을 "있어야 할 결과" 코어와 비교해 찾는 방식은 `command-undo-replay` 의 Target 을 참고한다.
4. `docs/selection.md` 의 `strategy-turret-targeting` 카드.

## 표본별

- ID `strategy-turret-targeting`, namespace `PatternGallery.StrategyTurretTargeting`. 제목 `전략 패턴: 포탑 조준 방식`, 그룹 A, 순서 2, 난이도 1, `pattern: '전략 패턴'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 정비 기지(화면 오른쪽 끝) 앞에 포탑 하나가 있고, 잔해 드론 5대가 왼쪽에서 정해진 시각·속도·HP 로 나와 기지로 다가온다. 배치는 코어의 고정 표다 (난수 없음). HP 는 서로 달라서 "가까운 것", "체력 많은 것", "선두", "체력 적은 것" 이 고르는 드론이 자동 데모 안에서 실제로 갈려야 한다. 포탑은 `fireInterval` 초마다 지금 대상에게 `damage` 를 준다. 사거리 `range` 안의 드론만 후보다. 기지에 닿은 드론은 사라지고 사건으로 남는다.
- **입력과 키**: `nearest` 가까운 것, `strongest` 체력 많은 것, `first` 선두 (기지에 가장 가까운 것), `weakest` 체력 적은 것. `keys` 는 `KeyQ`, `KeyW`, `KeyE`, `KeyR` 순서. 이름은 두 모드에서 다 맞게 "조준: 가까운 것" 식으로 짓는다.
- **코어 (Core/)**: `ITargetingStrategy { Drone SelectTarget(IReadOnlyList<Drone> candidates, float turretX); }` 와 구현 넷 (`NearestTarget`, `StrongestTarget`, `FirstTarget`, `WeakestTarget`). 같은 값이면 id 가 작은 드론을 고른다 (결정적으로). 전략은 상태를 갖지 않아 포탑 여러 대가 같은 객체를 써도 된다. `Turret` 은 전략 하나를 들고 `SetStrategy(ITargetingStrategy)` 로 갈아 끼운다. `Tick(dt)` 에서 **대상을 한 번만 묻고**, 그 대상을 조준 표시(`CurrentTarget`)와 발사가 함께 쓴다. 전략은 다음 전략을 스스로 고르지 않는다 (그러면 상태 패턴이다). 일어난 일은 C# event (`StrategyChanged`, `TargetChanged`, `Fired`, `DroneDestroyed`, `DroneReachedBase` 등).
- **나쁜 예 (Naive/)**: 조준 방식을 `string mode` 로 들고, `UpdateAim()` 과 `Fire()` 가 **각자** `if (mode == "nearest") … else if …` 사슬을 가진 흔한 코드. 나중에 더한 `"weakest"` 를 `Fire()` 에만 넣고 `UpdateAim()` 에는 빠뜨렸다 (`UpdateAim` 은 모르는 값이면 기본으로 가까운 것). 이 줄에 `// [!]`. 그 방식일 때 레이저는 가까운 드론을, 총알은 체력 적은 드론을 가리킨다. ✖ `조준 엇갈림` (예 `!조준 엇갈림: 레이저 D2, 명중 D4`). 미니 월드에서 레이저 끝과 명중 링이 다른 드론에 있어야 한다.
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): 가까운 것으로 시작 → 체력 적은 것 (엇갈림) → 선두 → 체력 많은 것. 두 번째: 쏘는 사이에 방식을 바꾸면 다음 발사부터 대상이 바뀐다 (발사 직전·직후에 바꾸기). 세 번째: `values` 로 `range` 를 줄여 사거리 밖 드론은 어떤 방식이든 고르지 않는다.
- **조절 값**: `range` (사거리), `fireInterval` (발사 간격, 초), `damage` (int). 모두 Unity 어댑터의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 땅, 기지(오른쪽 `box`), 포탑(`box`), 드론은 `actor` (`role: 'enemy'`, 라벨 `D1`~`D5`) 와 머리 위 HP `bar`, 조준 레이저는 포탑에서 대상까지 `arrow`, 명중은 짧게 `ring`, 사거리는 점선 `box` 나 `arrow`. 왼쪽 위에 지금 방식("조준: 체력 적은 것")과 대상. 나쁜 예는 `mode = "weakest"` 와 "레이저 D2 / 명중 D4" 를 보인다.
- **구조 그림**: TurretController(어댑터) → Turret → ITargetingStrategy(`kind: 'interface'`) ← 구현 노드 (넷을 한 노드 "Nearest · Strongest · First · Weakest" 로 묶어도 된다). 나쁜 예 구조 그림은 `mode` 문자열 노드와 `UpdateAim`, `Fire` 두 노드가 각자 if 사슬을 갖는 모양. 단계: 1 입력이 전략 객체를 갈아 끼운다 (`SetStrategy`), 2 `Tick` 에서 포탑이 전략에게 대상을 한 번 묻는다, 3 같은 대상을 조준 표시와 발사가 함께 쓴다.
- **Unity 어댑터 (Unity/)**: `TurretController : MonoBehaviour` 가 InputAction 넷(`Reset` 에서 숫자 1~4 키. Unity 기본 키는 갤러리와 상관없다)으로 전략을 바꾸고, 드론 Transform 들과 레이저(`LineRenderer`)를 코어 상태로 옮긴다. 드론은 Inspector 의 프리팹으로 만들고 코어 드론과 짝지어 둔다. 전략 객체는 한 번 만들어 재사용한다 (매 프레임 `new` 금지).
- **글**: 증상 "새 조준 방식을 넣었더니 레이저와 총알이 다른 드론을 가리킨다" 에서 시작한다. 본문에서 두 가지를 짧게 잇는다: (1) 상태 패턴과의 차이 — 다음을 스스로 정하면 상태, 바깥이 골라 끼우면 전략 (`related` 로 `state-player-actions`), (2) 포탑 종류 × 조준 방식을 상속으로 곱하지 않고 합성으로 더한다 (브리지와 같은 생각). `mistakes` 후보: 전략이 스스로 다음 전략을 고름, 전략 객체에 포탑별 값(마지막 대상)을 넣고 두 포탑이 같이 써서 섞임, 매 프레임 `new` 로 전략을 만듦, 파괴된 드론을 대상으로 계속 붙들고 있음. `references`: https://refactoring.guru/design-patterns/strategy (Refactoring Guru: Strategy), https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/interfaces (Microsoft C# 인터페이스). Unity 전자책은 전략 장 수록이 확인되지 않아 넣지 않는다.
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**(`state-player-actions`, `observer-health-events`, `command-undo-replay`)만 쓴다 (묶음 2 의 다른 표본은 아직 없어 링크가 깨진다). 교안 연계: Jay 의 강의 교안 같은 장의 강조점을 글에 녹이되 교안을 출처로 링크하지 않는다 (공개되지 않은 자료).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs strategy-turret-targeting` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check strategy-turret-targeting`, `node tools/gallery.mjs unity-compile strategy-turret-targeting` 통과.
3. `node tools/gallery.mjs live strategy-turret-targeting --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
