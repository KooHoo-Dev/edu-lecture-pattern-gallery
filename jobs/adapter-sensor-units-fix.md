---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 6
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

# 표본 수정: adapter-sensor-units

Pattern Gallery 의 표본 `adapter-sensor-units` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/adapter-sensor-units/`, `truth/adapter-sensor-units/`, `src/specimens/adapter-sensor-units/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **슬라이더 하나만 바꿔도 패턴 모드에서 A 와 B 의 경보가 갈린다.** 기본 `alarmLevel` 0.70 에서 `riseStep` 만 0.10 으로 바꾸고 1.00 까지 올린 뒤 세 번 내리면 `Level` 이 0.69999993 이 된다. A(`LegacyProbe`)는 0.7 미만이라 꺼지고 B(`GeigerX`)는 반올림해 70 → 0.7f 라 켜진다 (기준 0.3~0.8 × 걸음 0.05/0.10 에서 내려올 때, 기준 0.4 × 걸음 0.30 에서 내려올 때도). "패턴이면 A·B 가 함께 켜진다" 는 핵심 주장과 부딪힌다. `RadiationField` 가 값을 **1% 단위 정수**로 들게 고친다 (예: `int percent`, `Level => percent / 100f`, `Add` 는 `Math.Round(delta * 100)` 을 더하고 0~100 으로 자른다). 그러면 두 장비가 늘 같은 float 를 받는다. sim.ts 도 같게 고치고 `node tools/truth.mjs adapter-sensor-units` 로 기록을 다시 만든다. 조절 값 범위 전체(슬라이더 격자)를 돌려 A·B 경보가 갈리는 조합이 없는지 확인하고 결과를 보고에 적는다.
2. **나쁜 예의 "막대가 틀 밖으로" 는 Unity 에서 나오지 않는다.** `Naive/NaiveRadiationHud.cs` 머리 주석은 "bars 대신 Image.fillAmount 에 넣는다" 인데 UGUI `Image.fillAmount` 는 0~1 로 잘려, 50 을 넣으면 막대가 **늘 꽉 찬** 채로 보일 뿐이다. 머리 주석을 "막대 RectTransform 의 Scale X(또는 너비)에 넣는다" 로 고치고, `mistakes[0]` 제목·본문과 offNote 첫 문장에 "Filled Image 의 fillAmount 에 넣으면 0~1 로 잘려 B 막대가 늘 꽉 찬 채로 보인다" 를 한 문장 더한다 (수강생 화면에서 보일 증상 두 가지를 모두).
3. **객체 어댑터를 쓰는 이유가 사실과 다르다.** `Core/SensorAdapters.cs` 2행의 "C# 는 클래스를 여럿 상속할 수 없어 장비 클래스를 상속하지 않고 감싼다" 는, 우리 쪽 `IRadiationSensor` 가 인터페이스라 맞지 않는다 (장비가 sealed 가 아니면 `class GeigerXAdapter : GeigerX, IRadiationSensor` 클래스 어댑터가 된다). "SDK 클래스는 sealed 라 상속할 수 없고, 감싸면 이미 만든 장비 객체를 그대로 받을 수 있다. 우리 쪽이 인터페이스가 아니라 클래스였다면 C# 는 클래스를 둘 상속할 수 없어 감싸는 길뿐이다" 처럼 고친다. 같은 취지의 한 문장을 단계 2 본문이나 글에도 둔다 (명세가 글에 두라고 했는데 코드 주석에만 있다).
4. **`prompt.adaptIdeas` 마지막 항목이 표본의 메시지와 반대다.** "같은 어댑터에 기록 저장도 붙이고 싶다" 는 "어댑터는 모양만 바꾼다" (`mistakes[3]`) 와 어긋난다. "기록 저장도 `IRadiationSensor` 를 쓰는 쪽으로 붙이고 싶다 (어댑터는 그대로)" 로 바꾼다.
5. **Play 중 `alarmLevel` 을 바꾼 뒤 교체(E)하면 B 경보만 반영된다.** `Unity/SensorStation.cs` 의 `OnValidate` 가 `AlarmLevel` 만 넣고 다시 그리지 않는다. `OnValidate` 에서 HUD 를 다시 그리게(`Refresh`) 하고, `unity.pitfalls` 의 "다음 입력 때 반영" 문장을 실제 동작에 맞춘다.
6. **가이드가 바뀌었다** (`docs/specimen-guide.md`, 묶음 4 리뷰): 2절 (표본 글에서 `Unity/` 는 "연결 컴포넌트"), 3절 (`OnValidate` 뒤 다시 그리기, 이름 조회 실패는 `LogError` 와 빈 기본값, Inspector `+` 는 바인딩째 복사, `foreach` 람다 복사 불필요), 4절 (반올림·정수 변환이 있으면 조절 값 범위 전체에서 비교 경계에 걸리는 조합이 없는지, 미니 월드 ✖ 표시는 사건 기록 ✖ 와 같은 판정으로, 패턴도 같은 증상을 내는 입력 순서에서는 나쁜 예도 ✖ 를 쓰지 않음, `// [!]` 는 코어에도 똑같이 있는 줄에 두지 않음), 5절 (조절 값 끝과 프리셋에서도 그림이 겹치지 않게), 6절 (나쁜 예 증상은 Unity 에서 실제로 보이는 모습으로도, 구조 그림의 클라이언트 → 인터페이스 화살표는 Unity/ 필드 형식과 같게). 고친 뒤 바뀐 규칙에 맞는지 다시 본다.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs adapter-sensor-units` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs adapter-sensor-units`, `node tools/gallery.mjs check adapter-sensor-units`, `node tools/gallery.mjs unity-compile adapter-sensor-units` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
