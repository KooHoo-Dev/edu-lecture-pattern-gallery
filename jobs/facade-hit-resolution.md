---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 12
verify:
  - node tools/truth.mjs facade-hit-resolution
  - node tools/gallery.mjs check facade-hit-resolution
  - node tools/gallery.mjs unity-compile facade-hit-resolution
  - node tools/gallery.mjs thumbs facade-hit-resolution
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)"]
writePaths:
  - unity/facade-hit-resolution/**
  - truth/facade-hit-resolution/**
  - src/specimens/facade-hit-resolution/**
  - src/shots/facade-hit-resolution/**
allowProfiles: [org]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: facade-hit-resolution

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전).
3. 기준 샘플 `observer-health-events` 의 파일 전부 (`unity/observer-health-events/`, `truth/observer-health-events/Target.cs`, `src/specimens/observer-health-events/`). 시간이 없는 코어, 구독자 여럿, 나쁜 예를 입력마다 상태 비교로 기록하는 방식의 본보기다. 나쁜 예의 어긋남을 "있어야 할 결과" 코어와 비교해 찾는 방식은 `command-undo-replay` 의 Target 을 참고한다.
4. `docs/selection.md` 의 `facade-hit-resolution` 카드.

## 표본별

- ID `facade-hit-resolution`, namespace `PatternGallery.FacadeHitResolution`. 제목 `퍼사드 패턴: 명중 처리 창구`, 그룹 F, 순서 2, 난이도 1, `pattern: '퍼사드 패턴'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 하린 앞에 잔해 드론 셋 (`D1`, `D2` 는 보통, `D3` 은 중장갑으로 방어력 `armor`). 공격은 세 군데에서 일어난다: `shot` 하린의 총 (맨 앞 살아 있는 드론), `trap` 땅의 함정 (함정 위의 드론), `shock` 정비 드론의 전기 충격 (중장갑 `D3`). 명중 처리는 다섯 단계다: (1) 최종 피해 계산 (방어력 빼기, 최소 1) (2) 숫자 표시 (3) HP 적용 (4) 피격 알림 (5) HP 0 이면 파괴 처리 (화면에서 빼기, 크레딧 보상).
- **입력과 키**: `shot`, `trap`, `shock`. `keys` 는 `KeyQ`, `KeyW`, `KeyE`.
- **코어 (Core/)**: 하위 시스템 (`DamageCalculator`, `Health` 또는 드론의 HP, `HitFeed` 숫자 표시와 알림, `Wreckage` 파괴 처리와 보상)과 창구 `CombatSystem.Hit(attacker, target, baseDamage)` 가 다섯 단계를 순서대로 조율한다. 공격하는 쪽(`Gun`, `Trap`, `ShockDrone`)은 창구 **한 줄**만 부른다. 이미 파괴된 드론에 맞으면 창구가 받지 않고 이벤트로 알린다. 일어난 일은 C# event (`DamageShown`, `HitTaken`, `Destroyed`, `RewardGranted` 등).
- **나쁜 예 (Naive/)**: 세 공격 코드가 다섯 단계를 **각자 복사**한 흔한 코드. 함정 코드는 사망 처리를 빠뜨려 ✖ `파괴 누락` (HP 0 인 드론이 그대로 남아 보상도 없다). 방어력 계산은 나중에 규칙으로 더해져 총과 함정에는 들어갔지만 전기 충격 코드에는 빠져 ✖ `방어력 무시` (중장갑에 전기 충격이 방어력 없이 들어간다). 문제 줄에 `// [!]` (빠진 단계는 빠진 자리 근처 줄에 "여기서 … 를 빠뜨렸다" 처럼). 두 ✖ 모두 자동 데모에 나와야 한다.
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): 총 몇 발 → 함정으로 D1 마무리 (나쁜 예 HP 0 인데 남음) → 중장갑 D3 에 전기 충격 (나쁜 예 방어력 무시). 두 번째: 총만으로 셋을 차례로 파괴 (두 모드 같음 — 복사본이 맞으면 결과도 같다는 것을 note 에). 세 번째: `values` 로 `armor` 나 피해 값을 바꾼 경로.
- **조절 값**: `armor`, `trapDamage`, `shockDamage` (또는 화면 차이가 더 큰 것). 모두 Unity 어댑터의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 하린 `actor` (`role: 'ally'`), 드론 셋 `actor` (`role: 'enemy'`, 라벨, 파괴되면 사라지거나 `pose: 'down'`), 머리 위 HP `bar`, 함정은 땅 위 `box`, 전기 충격은 `arrow`, 피해 숫자는 드론 위 `text` (잠깐). 왼쪽 위에 크레딧과 마지막 명중의 다섯 단계 체크 (`계산 ✓ 표시 ✓ 적용 ✓ 알림 ✓ 파괴 ✓`). 나쁜 예는 빠진 단계가 `✗` 로 남고, HP 0 인 드론이 서 있는 것이 이어서 보여야 한다.
- **구조 그림**: 공격하는 쪽 세 노드(Gun, Trap, ShockDrone. 한 노드로 묶어도 된다) → CombatSystem(창구) → DamageCalculator · HitFeed · Wreckage (드론 HP 포함). 나쁜 예 구조 그림은 세 공격 노드가 하위 시스템 넷을 **각자 직접** 부르는 거미줄 모양. 단계: 1 공격하는 쪽은 창구에 "누가 누구에게 얼마" 만 넘긴다, 2 창구가 피해를 계산하고 숫자를 띄운다, 3 HP 를 고치고 알린다, 4 HP 가 0 이면 파괴 처리와 보상까지 창구 안에서 끝낸다.
- **Unity 어댑터 (Unity/)**: `CombatHub : MonoBehaviour` 가 `CombatSystem` 을 들고 (`??=` 로 처음 읽을 때 만든다), 공격 컴포넌트(`GunInput`, `TrapZone`, `ShockDroneInput` 등)는 `[SerializeField] CombatHub hub` 칸으로 받는다 (싱글턴으로 만들지 않는다. 싱글턴 표본과 겹치지 않게 칸 연결을 쓴다). 함정은 2D/3D 둘 다 되게 트리거 콜백을 둘 다 적거나, 웹과 같게 입력으로 터뜨린다 (`unity.setup` 에 어느 쪽인지 적는다).
- **글**: 증상 "함정으로 쓰러뜨린 드론만 HP 0 인 채 서 있다" 에서 시작한다. 퍼사드는 하위 시스템을 숨기는 것이지 막는 것이 아니라는 것(필요하면 하위 시스템을 직접 쓸 수 있다), 창구가 모든 일을 떠맡는 신 객체(God Object)가 되지 않게 단계마다 하위 시스템에 맡긴다는 것을 한 문장씩. `mistakes` 후보: 호출부마다 절차 복사, 규칙 변경이 일부 호출부에만 들어감, 창구가 하위 시스템의 일을 직접 다 해 비대해짐, 창구를 거치지 않고 HP 를 직접 깎는 새 코드, 파괴된 대상에 다시 명중 처리. `references`: https://refactoring.guru/design-patterns/facade (Refactoring Guru: Facade). `related`: `observer-health-events` (4단계 알림을 관찰자로 받는다), `decorator-stat-buffs` (1단계 피해 계산에 버프를 끼울 자리).
- **묶음 2 리뷰에서 반복된 지적을 미리 피한다**: (1) `unity.setup`·`unity.pitfalls`·`mistakes`·Tooltip 의 모든 문장이 **이 표본의 어댑터 코드**에서 실제로 그런지 하나씩 대조한다 (일반론이 이 어댑터에서는 안 일어나면 그렇게 쓴다). (2) 효과 끄기에서 수강생이 자동 데모와 다른 순서로 눌러도 offNote 의 원인 설명이 맞는지 본다. (3) 시나리오 note 의 시각은 기록(`truth/<id>/*.log`)의 숫자와 같게 쓴다. (4) 정지 화면에서도 버그가 보이게 버그 상태가 이어지는 동안 남는 표시를 둔다. (5) 막대 기준은 조절 값으로 계산하지 않는다.
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**만 쓴다 (`state-player-actions`, `observer-health-events`, `command-undo-replay`, `strategy-turret-targeting`, `decorator-stat-buffs`, `prototype-drone-clone`, `singleton-scene-managers`. 묶음 3 의 다른 표본은 아직 없어 링크가 깨진다). Jay 의 강의 교안 같은 장의 강조점을 글에 녹이되 교안을 출처로 링크하지 않는다 (공개되지 않은 자료).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs facade-hit-resolution` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check facade-hit-resolution`, `node tools/gallery.mjs unity-compile facade-hit-resolution` 통과.
3. `node tools/gallery.mjs live facade-hit-resolution --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
