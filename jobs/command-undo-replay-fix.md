---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 8
verify:
  - node tools/truth.mjs command-undo-replay
  - node tools/gallery.mjs check command-undo-replay
  - node tools/gallery.mjs unity-compile command-undo-replay
  - node tools/gallery.mjs thumbs command-undo-replay
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)"]
writePaths:
  - unity/command-undo-replay/**
  - truth/command-undo-replay/**
  - src/specimens/command-undo-replay/**
  - src/shots/command-undo-replay/**
allowProfiles: [org]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 수정: command-undo-replay

Pattern Gallery 의 표본 `command-undo-replay` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/command-undo-replay/`, `truth/command-undo-replay/`, `src/specimens/command-undo-replay/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **자동 데모의 리플레이 ✖ 원인 설명이 틀렸다.** 자동 데모는 기록을 버리지 않으므로 Naive 의 `X = startX` 줄은 이 데모에서 맞게 동작한다. 나쁜 예의 리플레이가 리플레이 전과 다른 칸에서 끝나는 진짜 이유는 `moves` 가 실제로 간 길이 아니라 누른 방향이라, 되돌리기로 어긋난 플레이와 다시 누른 방향이 서로 다른 칸에서 끝나기 때문이다. `offNote` 와 첫 시나리오 `note` 를 이렇게 고친다. 기록을 버렸을 때 시작 자리부터 틀리는 버그(`X = startX`)는 세 번째 시나리오와 짧은 기록 프리셋의 일로 글에 따로 쓴다. 가이드 4절의 새 규칙(✖ 마다 원인인 `// [!]` 줄이 그 시나리오에서 실제로 동작해야 한다)을 지킨다.
2. **나쁜 예 미니 월드에 리플레이 버그가 보이지 않는다.** 리플레이를 시작할 때 리플레이 전 위치를 점선 `box`(라벨 `리플레이 전`)로 남겨, 리플레이가 끝나 ✖ 가 뜨는 순간 두 칸이 다르다는 것이 미니 월드에도 보이게 한다 (`live` 로 t≈5.2 의 효과 끄기 화면을 찍어 확인).
3. **`unity.setup` 의 메뉴가 3D 템플릿에는 없다.** `GameObject > 2D Object > Sprites > Square` 는 2D Sprite 패키지 메뉴다. 수업 프로젝트는 2D 템플릿과 Universal 3D 템플릿 둘 다이므로 "2D 프로젝트면 Sprites > Square, 3D 프로젝트면 3D Object > Cube" 처럼 둘 다 적는다 (벽 프리팹도 같다). 카메라 안내도 한 줄 넣는다: 격자 전체가 보이게 카메라 위치나 Orthographic Size, 또는 드론을 둘 위치 예시.
4. **`mistakes[4]` 제목**: 증상은 "엉뚱한 칸에서 시작한다" 가 아니라 "엉뚱한 칸에서 끝난다" 다. 본문도 맞춘다.
5. **`meta.keys` 가 갤러리 단축키 S·A 와 겹친다** (검사가 이제 오류로 잡는다). 웹 무대 키는 `KeyT` 위, `KeyG` 아래, `KeyF` 왼쪽, `KeyH` 오른쪽, `KeyZ` 되돌리기, `KeyY` 다시 하기, `KeyR` 리플레이로 바꾼다. Unity 어댑터의 `Reset` 기본 키(WASD 등)는 갤러리와 상관없으니 그대로 두고, `unity.setup` 이 그 키를 적는다.
6. **구조 그림 강조가 단계 2·3·4 에서 같다.** sim 의 view 가 `history` 를 늘 켜고, 입력 직후 0.3초와 리플레이 중에 거의 모든 노드를 켠다. 늘 켜는 것은 빼고, 입력 종류마다 그 입력이 지나는 노드와 화살표만 켠다 (이동: 어댑터 → 기록 → ICommand → MoveCommand → Drone, 되돌리기: 기록 → MoveCommand(Undo) → Drone, 리플레이: 기록 → Drone 처음 위치 → 차례로 Execute). 무대도 단계 강조를 앞세우게 바뀌었다.
7. **막힌 이동도 기록하는 선택을 설명하지 않는다.** 코어는 벽에 막혀 제자리였던 명령도 기록한다 (그래서 되돌리기 한 번이 아무 변화가 없을 수 있고, 되돌린 뒤 벽 쪽을 누르면 다시 하기 목록이 지워진다). `mistakes` 나 `unity.pitfalls` 에 한 줄 넣는다: 막힌 이동을 기록할지는 선택이다 (Execute 가 움직였는지를 돌려주고 안 움직였으면 기록하지 않는 방법). 그래도 "반대 동작" 되돌리기는 상자 밀기, 문, 미끄러운 바닥처럼 되돌림이 단순한 반대가 아닌 곳에서 또 어긋난다.
8. **리플레이 시작 때 드론이 처음 칸까지 미끄러진다** (`moveDuration` > 0). `OnReplayStarted` 에서 처음 칸으로 바로 옮긴다. sim 의 Glide 도 같게 한다.
9. **반환값 정리.** `Undo`, `Redo`, `StartReplay` 가 "리플레이 중이라 안 받음" 과 "할 것이 없음" 에 같은 `false` 를 돌려주고 아무도 쓰지 않는다. `void` 로 바꾸고 두 경우는 이미 있는 이벤트(`InputIgnored`, `NothingToDo`)로만 알린다. C# 를 바꾸므로 `node tools/truth.mjs command-undo-replay` 로 기록을 다시 만든다.
10. **Unity 어댑터 자잘한 것**: `OnValidate` 가 기록 글(`기록 n/상한`)을 바로 다시 쓰게 한다. `NothingToDo` 를 구독해 Console 에 남긴다. `InputIgnored` 로그의 입력 이름을 웹과 같은 한국어로 쓴다.
11. **드론이 격자 한 칸보다 크다.** 무대 `actor` 에 `scale` 옵션이 생겼다 (src/stage/types.ts). 드론을 0.6 안팎으로 줄이고 라벨이 다시 하기 점선이나 길 화살표를 가리지 않게 한다.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs command-undo-replay` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs command-undo-replay`, `node tools/gallery.mjs check command-undo-replay`, `node tools/gallery.mjs unity-compile command-undo-replay` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
