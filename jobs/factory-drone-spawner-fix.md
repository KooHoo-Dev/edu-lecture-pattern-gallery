---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 8
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

# 표본 수정: factory-drone-spawner

Pattern Gallery 의 표본 `factory-drone-spawner` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/factory-drone-spawner/`, `truth/factory-drone-spawner/`, `src/specimens/factory-drone-spawner/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **Unity 어댑터에 종류마다 복붙하는 코드가 남아 있다.** `WaveSpawnerInput` 이 스포너마다 프리팹 칸·핸들러(`OnScoutSpawned` 등)·`+=`/`-=` 줄을 따로 둬, 종류를 더하려면 여러 곳을 고쳐야 한다 (이 표본이 고치려는 "복붙하다 한 줄 빠짐" 이 어댑터에서 다시 생긴다). 글(goals, 단계 2, 어댑터 주석)은 "스포너 클래스 하나와 목록 한 칸만" 이라고 한다. 어댑터를 (스포너, 프리팹) 쌍 목록 하나와 반복문 구독으로 바꾼다 (해제용 델리게이트를 저장해 `OnDisable` 에서 뗀다). 그러면 종류를 더할 때 Core 의 스포너 클래스 하나 + 목록 한 칸 + Inspector 의 프리팹 한 칸이다. 글을 그에 맞춘다.
2. **`mistakes[2]` 제목이 Core 의 정답 코드와 부딪힌다.** 제목 "`new ScoutDrone()` 을 했더니 경고" 인데 `Core/DroneSpawner.cs` 의 정답이 바로 `new ScoutDrone()` (순수 C# 객체)이다. 제목을 MonoBehaviour 를 `new` 한 경우로 바꾼다 (예: "MonoBehaviour 인 `DroneView` 를 `new` 했더니 경고가 나고 화면에 없다"). 본문에 "`== null` 이 참이라 null 검사 분기가 조용히 건너뛰어진다" 한 문장.
3. **"훅" 이 두 뜻으로 쓰인다.** `CreateDrone` 은 "자식이 반드시 채우는 단계(추상 단계)", 훅이라는 말은 기본 본문이 있는 선택 단계 `OnSpawned` 에만 쓴다 (단계 3, goals). 구조 그림 `spawner-drone` 화살표 라벨은 "CreateDrone() (자식 구현)".
4. **`✖ 레이더 누락` 이 3.5초와 4.3초 두 번 뜬다.** 둘째("웨이브 끝을 알렸는데 …")는 첫째의 결과다. 가이드 4절대로 둘째를 다른 종류 이름(예 `✖ 거짓 웨이브 끝`, 결과임을 글에 밝힘)이나 ✖ 가 아닌 사건 줄로 바꾼다. 다른 종류로 하면 그 종류도 자동 데모에 나오는지 확인하고, 원인 줄 규칙(결과면 글에 밝힘)을 지킨다. Target 과 sim 을 같게 고치고 기록을 다시 만든다.
5. **`unity.setup` 문구**: 2단계 "빈 자식" 은 "`ScoutDrone` 우클릭 > Create Empty" (자식, 로컬 좌표). 3단계 프리팹으로 끌 때 Original Prefab / Prefab Variant 를 묻는 창에서 무엇을 고르는지 (Original Prefab).
6. **글 길이**: offNote(9문장), 첫 시나리오 note(6문장)를 수업에서 읽기 좋게 줄인다. 드론이 많아지면 HP 바가 "웨이브 끝" 상자와 겹치는 것은 상자 위치를 옮겨 피한다 (선택).
7. **가이드가 바뀌었다** (`docs/specimen-guide.md`): 3절 (이벤트로 맞추는 화면은 `OnEnable` 에서 다시 맞추기, IMGUI 확인용 글, 거리 경계 깜박임), 4절 ("같은 버그는 한 번" = 같은 대상의 같은 종류는 한 번, 결과 증상은 다른 이름이나 일반 사건 줄로). 무대의 문제 줄 칸이 이제 `// [!]` 뒤 설명도 보이므로, 설명을 짧고 분명하게 (한 줄 안팎) 다듬는다.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs factory-drone-spawner` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs factory-drone-spawner`, `node tools/gallery.mjs check factory-drone-spawner`, `node tools/gallery.mjs unity-compile factory-drone-spawner` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
