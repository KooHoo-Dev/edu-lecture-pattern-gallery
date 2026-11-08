---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 8
verify:
  - node tools/truth.mjs update-method-drone-list
  - node tools/gallery.mjs check update-method-drone-list
  - node tools/gallery.mjs unity-compile update-method-drone-list
  - node tools/gallery.mjs thumbs update-method-drone-list
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)", "Bash(grep *)", "Bash(cat *)", "Bash(head *)"]
writePaths:
  - unity/update-method-drone-list/**
  - truth/update-method-drone-list/**
  - src/specimens/update-method-drone-list/**
  - src/shots/update-method-drone-list/**
allowProfiles: [sub]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 수정: update-method-drone-list

Pattern Gallery 의 표본 `update-method-drone-list` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/update-method-drone-list/`, `truth/update-method-drone-list/`, `src/specimens/update-method-drone-list/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **Core: 같은 프레임에 생기고 지워진 드론이 목록에 남는다** (`DroneSwarm.cs` 123–133 근처). 도는 중에 `Spawn` 된 드론에 같은 Tick 안에서 `Despawn` 을 부르면 `IsDead` 는 켜지지만 `Despawned` 루프와 `RemoveAll` 은 `drones` 만 봐서, 대기 목록에서 그대로 합쳐지고 `Spawned` 까지 불린다 (멈춘 유령 드론, 화면 오브젝트 누수, "지울 것" 수 어긋남). 또 `Despawned` 핸들러가 앞쪽 드론을 `Despawn` 하면 그 드론은 `Despawned` 없이 `RemoveAll` 로만 빠진다. 고칠 것: 합칠 때 `IsDead` 인 대기 드론은 더하지 않고 `Spawned` 도 부르지 않는다. 정리는 표시된 드론을 떠서 알린 뒤 지우는 일을 새 표시가 없을 때까지 반복한다. sim·Target 을 같게 하고 기록을 다시 만든다. 그 전까지 지나친 `mistakes` 4번의 "누가 누구를 지우고 만들든 같게 동작한다" 를 고친 동작에 맞게 다듬는다. `Despawned` 설명은 "목록에서 지우기 직전" 으로 (핸들러에서 `Drones.Count` 는 옛 값).
2. **효과 끄기 상태 둘째 줄이 오른쪽에서 잘린다** (`sim.ts` 501 근처, 자동 데모 첫 화면). 짧게: 예 `건너뜀 n번 · 태어나며 움직임 n대 · 점선 = 있어야 할 자리`.
3. **같은 줄 드론의 글이 겹친다** (`scenario=fast-three-pieces` t≈1.85 패턴·나쁜 예, 자동 데모 t≈3.4 나쁜 예, early-split 1.6–1.7초). 조각의 줄을 `(Lane + k) % Lanes` 로 정해 이웃 옆에 붙고, 빨간 글을 `Math.max(d.x, 2.4)` 로 묶기 때문이다. 같은 줄에서 가까운 글은 세로로 비켜 놓거나 조각에 그림 전용 줄 오프셋을 둔다. 해당 시나리오·시각의 효과 켬·끔 화면을 `live` 로 찍어 확인한다.
4. **"있어야 할 자리" 점선이 사실상 드론 위치와 같다** (한 프레임 차이 0.05–0.1m, 상자 폭 0.8m). 점선은 위치 차이를 보여 주지 못하고, 늦게 나뉜 부모의 조각은 물려받은 뒤처짐이 안 드러난다. 가이드 4절의 새 문장대로 숫자(업데이트 횟수, 있어야 할 횟수)를 앞세우고, `moveSpeed` 힌트의 "빨간 점선과의 간격도 커진다" 와 offNote 를 숫자 중심으로 고쳐 쓴다. 점선을 남긴다면 Target 처럼 같은 입력을 받는 패턴 코어의 위치로 그린다.
5. **자잘한 것**: `mistakes` 3번에 "루프 전에 센 `count` 로 돌면서 `Remove` 하면 `ArgumentOutOfRangeException` 도 난다". `SwarmRunner.cs` 128 근처 주석 "이번 프레임 끝까지" 를 단계 4·pitfalls 의 "그 프레임의 Update 가 끝날 때까지" 와 같게. Tooltip "이만큼 크게 보인다" → "이만큼 키운다". 구조 그림 `지울 목록` 노드는 따로 된 목록이 없으므로 "지울 표시" 로.
6. **가이드·검사가 바뀌었다**: `docs/specimen-guide.md` 4절 ("같은 대상의 같은 종류는 버그 상태가 이어지는 동안 한 번", 같은 프레임에 사라지는 상태는 0.3~0.5초 남겨 그리기). `check-domain` 이 이제 주석만 있는 줄의 `// [n]` 을 오류로 잡는다 (코드 줄 끝에 둔다). `// [!]` 설명은 무대 문제 줄 칸에 한 줄로 보이므로 짧게.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs update-method-drone-list` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs update-method-drone-list`, `node tools/gallery.mjs check update-method-drone-list`, `node tools/gallery.mjs unity-compile update-method-drone-list` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
