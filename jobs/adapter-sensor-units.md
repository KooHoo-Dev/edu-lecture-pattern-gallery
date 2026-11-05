---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 10
verify:
  - node tools/truth.mjs adapter-sensor-units
  - node tools/gallery.mjs check adapter-sensor-units
  - node tools/gallery.mjs unity-compile adapter-sensor-units
  - node tools/gallery.mjs thumbs adapter-sensor-units
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)", "Bash(grep *)", "Bash(cat *)", "Bash(head *)"]
writePaths:
  - unity/adapter-sensor-units/**
  - truth/adapter-sensor-units/**
  - src/specimens/adapter-sensor-units/**
  - src/shots/adapter-sensor-units/**
allowProfiles: [org]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: adapter-sensor-units

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전). 작업 트리에는 처음에 `node_modules` 가 없다. `node tools/gallery.mjs` 를 인자 없이 한 번 부르면 메인 폴더의 것이 정션으로 이어지니, 그 뒤 Read 도구로 연다 (셸로 상위 폴더를 뒤지지 않는다. 막혀 있다).
3. 기준 샘플 `observer-health-events` 의 파일 전부 (`unity/observer-health-events/`, `truth/observer-health-events/Target.cs`, `src/specimens/observer-health-events/`). 시간이 없는 코어와, 나쁜 예를 입력마다 상태 비교로 기록하는 방식의 본보기다. 이 표본은 입력마다 값이 바뀌므로 코어에 `Tick` 이 없어도 된다 (막대가 움직이는 연출이 필요하면 sim 의 `view()` 와 Unity 쪽만).
4. `docs/selection.md` 의 `adapter-sensor-units` 카드.

## 표본별

- ID `adapter-sensor-units`, namespace `PatternGallery.AdapterSensorUnits`. 제목 `어댑터 패턴: 센서 장비 단위 맞추기`, 그룹 F, 순서 4, 난이도 1, `pattern: '어댑터 패턴'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 지표 탐사 구역 두 곳(북쪽 A, 남쪽 B)에 방사선 센서가 하나씩 있고, 기지 HUD 가 구역마다 막대(0~1, 꽉 차면 위험)와 경보등(`alarmLevel` 이상이면 켜짐)을 보인다. 비교를 위해 **두 구역의 실제 방사선은 같다**. 처음엔 두 구역 모두 기존 장비 `LegacyProbe` (`float GetLevel()`, 0~1). 정비사 도윤이 B 구역 장비를 외부 업체 신형 `GeigerX` 로 바꿀 수 있다: API 이름도 (`int ReadPercent()`), 단위도 (0~100 정수, 반올림) 다르다.
- **입력과 키**: `rise` 방사선 오름, `fall` 내림 (한 번에 `riseStep`, 0~1 로 자른다), `swap` B 구역 장비 바꾸기 (기존 ↔ 신형 번갈아). `keys` 는 `KeyQ`, `KeyW`, `KeyE`.
- **코어 (Core/)**: 우리 쪽 인터페이스 `IRadiationSensor { string Zone; float Level01 { get; } }`. 외부 장비 흉내 `LegacyProbe`, `GeigerX` 는 **고칠 수 없는 SDK** 라고 머리 주석에 밝히고 우리 인터페이스를 구현하지 않는다. 어댑터 `LegacyProbeAdapter`, `GeigerXAdapter` 가 장비를 **감싸서**(필드로 들고) `IRadiationSensor` 를 구현한다: 신형은 `ReadPercent() / 100f` (단위 변환은 여기 한 곳). `RadiationHud` (클라이언트)는 `IRadiationSensor` 만 알고 막대 값과 경보를 같은 `Level01` 로 정한다. `RadiationField` 가 실제 방사선 값. 일어난 일은 C# event (`LevelShown(zone, value)`, `AlarmChanged(zone, on)`, `SensorSwapped(zone, deviceName)` 등).
- **나쁜 예 (Naive/)**: HUD 가 장비를 직접 아는 흔한 코드. `DrawBars()` 와 `CheckAlarm()` 이 각자 `if (s is LegacyProbe p) … else if (s is GeigerX g) …` 로 장비 API 를 부른다. `DrawBars` 는 신형의 0~100 을 그대로 막대에 넣어 ✖ `막대 넘침` (B 막대가 틀 밖으로). `CheckAlarm` 은 변환을 넣었지만 `g.ReadPercent() / 100` (정수 나눗셈)이라 100 미만이면 0 이 되어 ✖ `경보 누락` (B 구역이 경보 수준인데 경보등이 꺼져 있음). 두 곳에 `// [!]`. 원인이 서로 다른 줄이라 한 버그의 결과가 아니다. 두 ✖ 모두 자동 데모에 나와야 한다.
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): `rise` 한두 번 (두 모드 같음) → `swap` (나쁜 예: B 막대 넘침) → `rise` 로 경보 수준을 넘김 (패턴: A·B 경보 켜짐, 나쁜 예: A 만). 경보 경계에 딱 걸치는 값은 피한다 (float 오차로 두 언어가 갈릴 수 있다). 두 번째: 바꾸지 않고 오르내림 (기존 장비끼리는 나쁜 예도 맞다는 것을 note 에). 세 번째: `swap` 을 두 번 눌러 기존 장비로 되돌리는 경로나 `values` 로 `alarmLevel` 을 바꾼 경로.
- **조절 값**: `alarmLevel`, `riseStep`. 막대의 꽉 찬 값은 고정 1.0 (조절 값으로 계산하지 않는다). 모두 Unity 쪽 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 땅 위에 두 구역(`box` 둘, 라벨 `북쪽 A`, `남쪽 B`), 구역마다 센서 장비(`box`, 라벨에 장비 이름 `LegacyProbe` / `GeigerX`), 교체할 때 도윤 `actor` (`role: 'ally'`)가 B 옆에 잠깐. 화면 위쪽 HUD: 구역마다 막대(`bar`), 장비가 돌려준 원래 값과 HUD 가 쓴 값 (`원래 70 (0~100) → 0.70`), 경보등(`ring`, 켜지면 빨강). 왼쪽 위에 실제 방사선 값. 나쁜 예는 B 막대가 틀 밖으로 뻗은 모양 (`bar` 가 1 에서 잘리면 넘친 부분을 `box` 로 그리고 `70.00 ← 0~1 막대에 0~100` 같은 값 글), 경보등 옆에 `70 / 100 = 0` 을 남긴다.
- **구조 그림**: RadiationHud(클라이언트) → IRadiationSensor(`kind: 'interface'`) ← LegacyProbeAdapter · GeigerXAdapter (`implements`), 각 어댑터 → LegacyProbe / GeigerX (`ref`, 라벨 `감쌈`). 나쁜 예 구조 그림은 HUD 의 `DrawBars`, `CheckAlarm` 두 노드가 LegacyProbe, GeigerX 를 각자 직접 부르는 모양 (호출 네 줄). 단계: 1 HUD 는 `Level01` 만 부른다 (장비 종류를 모른다), 2 어댑터가 장비 API 를 부른다 (신형은 `ReadPercent`), 3 어댑터가 단위를 0~1 float 로 바꾼다 (한 곳에서, 실수 나눗셈), 4 HUD 가 막대와 경보를 같은 값으로 정한다.
- **Unity 쪽 (Unity/)**: 이 표본은 패턴 이름이 어댑터라 **글에서 `Unity/` 폴더를 "Unity 어댑터" 라고 부르지 않는다** ("Unity 연결 컴포넌트" 나 "MonoBehaviour 쪽"). 구조 그림의 어댑터 노드도 패턴의 어댑터만 가리킨다. `SensorStation : MonoBehaviour` 가 코어(필드, 장비 둘, 어댑터, HUD)를 들고 (`??=`), InputAction 셋(`Reset` 에서 기본 키)으로 오르내림·교체를 흉내 낸다 (실제 게임에서는 장비 SDK 가 값을 준다). 화면은 코어 이벤트 핸들러에서 막대와 경보등을 바꾼다. 확인용 IMGUI 로 둬도 된다 (가이드 3절. 그러면 pitfalls 에 밝힌다). UGUI Filled Image 를 쓰면 가이드 3절의 Source Image·Fill Method 규칙을 따른다.
- **글**: 증상 "B 구역 장비를 신형으로 바꿨더니 막대가 화면 밖으로 뻗고, 방사선이 위험 수준인데 경보가 안 울린다" 에서 시작한다. 교안의 결제·로그 어댑터 이야기(외부 API 마다 절차와 매개변수가 다르다, 핵심 코드를 외부 API 변화에서 지킨다)를 녹인다. C# 는 클래스를 여럿 상속할 수 없어 **감싸는(객체) 어댑터**를 쓴다는 것을 한 문장. `mistakes` 후보: 쓰는 곳마다 변환, 정수 나눗셈 (`/ 100` 대 `/ 100f`), 어댑터와 쓰는 곳에서 두 번 변환 (0.007 이 됨), 어댑터가 경보 판단까지 함 (어댑터는 모양만 바꾼다), HUD 가 `GeigerX` 형식을 알게 됨 (어댑터 밖으로 샘). `references`: https://refactoring.guru/design-patterns/adapter (Refactoring Guru: Adapter), https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/arithmetic-operators (Microsoft Learn: 산술 연산자, 정수 나눗셈 절). `related`: `facade-hit-resolution` (퍼사드는 여럿을 단순한 창구로, 어댑터는 다른 모양 하나를 우리 모양으로), `decorator-stat-buffs` (같은 인터페이스를 감싸 기능을 더하기 대 다른 인터페이스를 감싸 모양을 바꾸기).
- **묶음 2·3 리뷰에서 반복된 지적을 미리 피한다**: (1) `unity.setup`·`unity.pitfalls`·`mistakes`·Tooltip 의 모든 문장이 **이 표본의 Unity/ 코드**에서 실제로 그런지 하나씩 대조한다 (일반론이 이 코드에서는 안 일어나면 그렇게 쓴다). (2) 효과 끄기에서 수강생이 자동 데모와 다른 순서로 눌러도 offNote 의 원인 설명이 맞는지 본다. (3) 시나리오 note 의 시각은 기록(`truth/<id>/*.log`)의 숫자와 같게 쓴다. (4) 정지 화면에서도 버그가 보이게, 버그 상태가 이어지는 동안 남는 표시를 둔다. (5) 막대 기준은 조절 값으로 계산하지 않는다. (6) `unity.setup` 단계끼리 모순이 없고, 적힌 대로 놓으면 카메라에 모두 보인다 (위치·카메라 값을 적는다). (7) Unity/ 코드에도 종류마다 복붙한 코드를 남기지 않는다 (패턴 표본의 Unity 쪽이 나쁜 예 모양이면 안 된다). (8) 같은 대상의 같은 ✖ 는 한 번, 앞 버그의 결과로 생긴 증상은 다른 이름이나 ✖ 가 아닌 사건 줄로 (가이드 4절).
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**만 쓴다 (`state-player-actions`, `observer-health-events`, `command-undo-replay`, `strategy-turret-targeting`, `decorator-stat-buffs`, `prototype-drone-clone`, `singleton-scene-managers`, `state-drone-ai`, `object-pool-projectiles`, `factory-drone-spawner`, `facade-hit-resolution`. 묶음 4 의 다른 표본은 아직 없어 링크가 깨진다). Jay 의 강의 교안 같은 장의 강조점을 글에 녹이되 교안을 출처로 링크하지 않는다 (공개되지 않은 자료).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs adapter-sensor-units` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check adapter-sensor-units`, `node tools/gallery.mjs unity-compile adapter-sensor-units` 통과.
3. `node tools/gallery.mjs live adapter-sensor-units --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
