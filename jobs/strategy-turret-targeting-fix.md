---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 8
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

# 표본 수정: strategy-turret-targeting

Pattern Gallery 의 표본 `strategy-turret-targeting` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/strategy-turret-targeting/`, `truth/strategy-turret-targeting/`, `src/specimens/strategy-turret-targeting/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **`unity.pitfalls` 의 레이저 설명이 코드와 다르다.** "레이저 끝은 `CurrentTarget` 의 짝 오브젝트 위치로 옮긴다" 고 적었지만 `TurretController` 는 `ToWorld(target)` (코어 좌표)를 쓴다. 코드대로 고쳐 쓰고, "빈 자리" 가 생기는 진짜 이유(파괴된 드론의 X 가 멈춘 채 남음)를 적는다. `mistakes` 의 `MissingReferenceException` 은 "드론 Transform 을 직접 들고 있을 때" 라는 조건을 붙인다 (가이드 3절).
2. **자동 데모 note 의 "(가까운 것은 D5)" 가 바꾸는 순간(3.70초)에는 틀리다.** 그때 가장 가까운 것은 D4 이고 D5 는 3.8초부터다. "(가까운 것은 D4, 곧 D5)" 로 고치거나 괄호를 뺀다. 시나리오 note 의 "2.72초" 처럼 기록(2.73)과 다른 시각도 기록에 맞춘다.
3. **거리는 가로(x)로만 잰다는 것이 단계 글과 무대 글에 없다.** 단계 2 본문에 "(거리는 가로 x 거리. 높이는 화면에만)" 을 넣는다. 드론 높이 차이(지금 1~4.4)를 줄여 레이저가 눈으로 더 먼 드론으로 가는 순간을 줄인다 (가이드 6절 화면용 좌표).
4. **엇갈림이 정지 화면에 잘 안 보인다.** 명중 링은 0.25초, 발사 간격은 0.4초라 ✖ 가 이어지는 동안에도 엇갈림이 보이지 않는 때가 많다. 효과 끄기에서 엇갈린 동안 **마지막 명중 드론에 남는 표식**(작은 빨간 `box` 나 점선 `arrow`)을 둔다. 링과 레이저가 드론 라벨(`D1`)을 가리지 않게 라벨 자리를 옮긴다 (가이드 4절).
5. **`mistakes` 의 상태·전략 문장**을 다듬는다: "대상 드론이 파괴되면 전략이 다음 전략을 골라 포탑에 넣는다 → 그러면 전략이 아니라 상태 전이다. 조준 방식처럼 바깥이 고르는 것은 전략으로 둔다" 처럼 상태 패턴 자체가 실수로 읽히지 않게.
6. **포탑 여러 대 설명과 어댑터가 맞지 않는다.** 컨트롤러마다 자기 `DroneWave` 를 만들어 포탑을 하나 더 놓으면 웨이브도 두 벌이 된다. 웨이브를 따로 떼어 여러 포탑이 나눠 쓰게 하거나, 최소한 `unity.pitfalls` 에 "웨이브는 한 곳에서 만들어 나눠 쓴다" 를 적고 goals·adaptIdeas 글을 맞춘다.
7. **어댑터 다듬기**: `Reset` 의 `GetComponent<LineRenderer>()` 는 setup 순서상 늘 null 이다 → `[RequireComponent(typeof(LineRenderer))]`. 속성 이름 `Turret` 이 형식 이름과 같아 `Turret.DefaultX`(static)와 `Turret.X` 가 헷갈린다 → `TurretCore` 같은 이름. `unity.pitfalls` 의 "timeScale 이 0 이면 `Tick` 이 멈춘다" 는 틀리다 (`Tick(0)` 이 불려 대상은 다시 고른다) → 고쳐 쓴다. `unity.verify` 의 "HP 가 가장 낮은 드론" 앞에 "사거리 안".
8. **가이드가 바뀌었다**: `docs/specimen-guide.md` 3절(파괴된 컴포넌트 예외), 4절(버그 표시가 이어지게, 원인 설명이 다른 입력 순서에도 맞게), 6절(`params` 의 막대 기준과 화면용 좌표, `unity.setup` 의 Unity 6.3 메뉴·칸 이름)을 다시 읽고 이 표본이 어긋나는 곳이 있으면 함께 고친다.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs strategy-turret-targeting` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs strategy-turret-targeting`, `node tools/gallery.mjs check strategy-turret-targeting`, `node tools/gallery.mjs unity-compile strategy-turret-targeting` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
