---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 8
verify:
  - node tools/truth.mjs spatial-grid-detection
  - node tools/gallery.mjs check spatial-grid-detection
  - node tools/gallery.mjs unity-compile spatial-grid-detection
  - node tools/gallery.mjs thumbs spatial-grid-detection
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)", "Bash(grep *)", "Bash(cat *)", "Bash(head *)"]
writePaths:
  - unity/spatial-grid-detection/**
  - truth/spatial-grid-detection/**
  - src/specimens/spatial-grid-detection/**
  - src/shots/spatial-grid-detection/**
allowProfiles: [sub]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 수정: spatial-grid-detection

Pattern Gallery 의 표본 `spatial-grid-detection` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/spatial-grid-detection/`, `truth/spatial-grid-detection/`, `src/specimens/spatial-grid-detection/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **"36칸" 이 틀렸다** (`meta.ts` 29 cellSize hint, 56 preset `tiny-cells` look, 192 mistakes[2]): 칸 1m·반경 2.5m 에서 `Touches` 가 모서리 칸을 걸러 실제 32칸이다 (프리셋 화면 머리글도 32). 글의 숫자를 화면·코드와 맞춘다.
2. **droneSpeed hint 가 틀렸다** (`meta.ts` 51): 0.75 면 2.2초에 D2 가 반경 안인데 칸은 아직 처음 칸이라 탐지 누락 대신 경계 누락이 뜬다. "0.75 면 D2 가 아직 처음 칸에 있어 탐지 누락 대신 경계 누락이, 0.5 면 반경 밖이라 ✖ 가 없다" 처럼 실제와 맞게.
3. **물리 쿼리 글** (pitfalls[0] 214, goals[3] 15): `Physics2D.OverlapCircle(point, radius)` 기본 오버로드는 하나만 돌려준다 → 전부는 `OverlapCircleAll` 이나 `ContactFilter2D` + `List<Collider2D>` 오버로드. "물리 엔진이 안에서 공간 분할로 후보를 추리기 때문" 은 단정이다 → "물리 엔진이 자체 가속 구조로 후보를 추린다고 알려져 있어 보통 충분하다". goals[3] "충분하다는 것을 안다" → "대개 충분하다".
4. **머리글 판이 드론을 가린다** (`sim.ts` `header`, box y 7.15~8.85, 드론 다음에 그림): 판을 드론보다 먼저 그리고, 불투명도를 0.5 안팎으로 낮추고 폭을 글 길이에 맞춘다 (자동 데모 0.2초 D2, `bug-2`·끝 화면 D3, 18대 시나리오 D11·D3·D14).
5. **핵심 ✖ 정지 화면이 잘 안 읽힌다** (`bug-1`): `✖ 탐지 누락` 글이 포탑 상자와 겹친다 → ✖ 글을 링 위(y+0.55)로, 새 ✖ 드론은 이름표를 `✖ D2 탐지 누락` 하나로 합친다. 왼쪽으로 가는 드론이 자기 ✖ 글 위로 걷는 것도 비킨다. 18대 시나리오 정리: 찾음·놓침이 아니고 반경+1칸 밖인 드론은 이름표를 숨기거나 작게·흐리게, 주황 점선은 ✖ 드론과 등록 칸이나 실제 칸이 포탑 칸인 드론에만 (나머지는 작은 주황 점), 등록 칸 사각형은 칸마다 한 번.
6. **머티리얼 사본 누수** (`Unity/DroneView.cs` 54 `body.material.color`): 드론마다 사본이 생기고 Destroy 때 남는다. `MaterialPropertyBlock` 으로 `_BaseColor`·`_Color` 를 넣거나 (abstract-factory-zone-themes 관례) `OnDestroy` 에서 사본을 Destroy.
7. **글을 이 코드에 맞추기**: mistakes[4] `(int)` — 이 표본은 드론이 0 이상이라 놓치는 일이 없다 → "Unity 월드는 보통 원점이 가운데라 절반이 음수 좌표" 를 실제 예로. mistakes[0] "같은 메서드를 거치게 한다" — Core 에 순간 이동 메서드가 없고 다음 `Tick` 이 칸을 바로잡는다 → `Field.Teleport(d, x, y)` 를 더하거나 글을 "자리를 바꾼 곳에서 바로 `grid.Move`" 로. mistakes[3] `MissingReferenceException` — 이 표본 격자는 코어 `Drone` 이라 예외 없이 사라진 드론이 `찾음` 에 남는다 → "격자에 Transform·MonoBehaviour 를 넣었다면" 조건. pitfalls[4] — `DroneView.LateUpdate` 가 덮어써 "어긋난다" 가 아니라 "무시된다", Rigidbody 를 붙이면 물리와 싸운다. related[0] "루프가 끝난 뒤 함께 뺀다" — 이 Core 는 즉시 빼고 `Removed` 플래그와 사본 목록으로 Tick 을 지킨다 → 코드와 맞게.
8. **선택**: `Field.Add`/`SpatialGrid.Add` 중복 가드 (`if (drones.Contains(d)) return;`). Gizmos 에 `Gizmos.matrix = transform.localToWorldMatrix`. `Turret.Tick` 의 float 타이머는 가이드의 정수 단계 규칙으로 (기록을 다시 만든다). offNote 는 587자라 더 늘리지 않는다.
9. **갤러리 전체 일관성 정리(`2794a90`)의 관례에 맞춘다** (다른 표본 meta 를 보고 같게): (1) `title` 은 `src/registry.ts` PLANNED 의 제목과 글자까지 같게 (검사가 이제 잡는다). (2) `unity.setup` 1단계는 `state-player-actions` 의 setup[0] 과 같은 문구 (`<id>` 만 바꿈, Active Input Handling 문장 포함). (3) IMGUI 확인용 글 주의는 표준 문구 "왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다." 에 표본별 덧말만 뒤에 (코드가 실제로 그렇게 하는지 맞춘다). (4) 표본별 InputAction 주의는 두지 않는다 (`src/ai.ts` 고정 규칙으로 옮겼다). (5) `Reset` 키는 `기본 키(…)` 로 쓰고, 웹 무대 키가 Unity 기본 키와 다르면 "웹 갤러리 무대의 … 는 Unity 에서 … 다" 를 한 줄. (6) 학생이 읽는 글에서 MonoBehaviour 쪽은 "연결 컴포넌트" (어댑터 아님). (7) Inspector 에 칠 숫자의 빼기는 ASCII `-`. (8) 모든 단계가 어떤 시나리오에서 한 번은 화면에 보여야 한다 (가이드 6절 `steps`).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs spatial-grid-detection` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs spatial-grid-detection`, `node tools/gallery.mjs check spatial-grid-detection`, `node tools/gallery.mjs unity-compile spatial-grid-detection` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
