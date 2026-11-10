---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 12
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
allowProfiles: [org, sub]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: spatial-grid-detection

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전). 작업 트리에는 처음에 `node_modules` 가 없다. `node tools/gallery.mjs` 를 인자 없이 한 번 부르면 메인 폴더의 것이 정션으로 이어지니, 그 뒤 Read 도구로 연다 (셸로 상위 폴더를 뒤지지 않는다. 막혀 있다).
3. 기준 샘플 `state-player-actions` 의 파일 전부 (`unity/state-player-actions/`, `truth/state-player-actions/Target.cs`, `src/specimens/state-player-actions/`). 시간이 흐르는 코어(`Tick`)와 float 계산을 맞춘 sim 의 본보기다. 나쁜 예의 어긋남을 "있어야 할 결과" 코어와 비교해 찾는 방식은 `command-undo-replay` 의 Target 을, 목록과 이동 구조는 `update-method-drone-list` 를 참고한다.
4. `docs/selection.md` 의 `spatial-grid-detection` 카드.

## 표본별

- ID `spatial-grid-detection`, namespace `PatternGallery.SpatialGridDetection`. 제목 `공간 분할: 격자로 근처 적 찾기`, 그룹 D, 순서 4, 난이도 2, `pattern: '공간 분할'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 위에서 본 탐사 구역 (가로 16, 세로 9 단위를 `cellSize` 칸으로 나눈 격자). 가운데 탐지 포탑이 반경 `scanRadius` 안의 드론을 찾는다. 드론 여럿(난수 없이 정해진 시작 자리·속도·방향)이 움직이며 칸을 넘는다. 탐지할 때 **근처 칸만** 보아 거리 검사 횟수를 줄인다.
- **입력과 키**: `wave` 드론 몇 대 더하기 (정해진 자리), `scan` 지금 탐지, `autoScan` 자동 탐지 켜기·끄기 (선택. 넣으면 일정 간격 탐지). `keys` 는 `KeyQ`, `KeyW`, `KeyE`.
- **코어 (Core/)**: `SpatialGrid` (칸 → 드론 목록, `Add`, `Remove`, `Move(drone, oldCell, newCell)`, `Query(center, radius)` 는 반경이 닿는 **모든 칸**을 본다), `Drone` (위치, 속도, 지금 칸), `Field` (`Tick` 에서 드론을 움직이고 칸이 바뀌면 `grid.Move`). 탐지 결과와 거리 검사 횟수를 이벤트로 (`Scanned(found, checks)` 등). 같은 탐지를 전체 검사로 했을 때의 횟수도 함께 알려 화면에 비교한다.
- **나쁜 예 (Naive/)**: 격자는 있지만 드론이 움직여도 **처음 칸에 그대로** 두는 흔한 코드 ✖ `탐지 누락` (반경 안에 들어온 드론을 못 찾음). 그리고 포탑이 있는 **내 칸만** 보는 코드 ✖ `경계 누락` (칸 경계 바로 너머 반경 안의 드론을 못 찾음). 두 원인이 한 나쁜 예에 함께 있으면 ✖ 마다 원인 줄이 분명해야 한다 (각자의 `// [!]`, 같은 드론이면 어느 원인인지 글에). 버그 판정은 Target 이 같은 입력을 받는 정상 코어와 비교해서 한다. 두 ✖ 모두 자동 데모에 나와야 한다.
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): 드론 몇 대 → 탐지 → (드론이 칸을 넘어 반경 안으로) → 탐지 (나쁜 예 ✖ 탐지 누락) → 경계 너머 드론이 있는 순간 탐지 (✖ 경계 누락). 두 번째: 드론을 많이 더해 거리 검사 횟수 대비가 커지는 경로. 세 번째: `cellSize` 나 `scanRadius` 를 바꾼 경로 (칸이 반경보다 작거나 클 때).
- **조절 값**: `cellSize`, `scanRadius`, 그 밖에 `droneSpeed`. 모두 Unity 연결 컴포넌트의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 격자 선(`box` 테두리), 탐지 포탑 `box`, 반경 `ring`, 드론 `actor` (`role: 'enemy'`, 작은 `scale`, 라벨), 탐지에 걸린 드론은 표시(링·색), 이번 탐지가 본 칸은 옅게 칠한다. 왼쪽 위에 `거리 검사 n 회 (전체 검사면 N 회) · 찾은 드론 n`. 나쁜 예는 드론이 등록된 칸(옛 칸)과 실제 자리 사이를 점선 `arrow` 로, 반경 안인데 못 찾은 드론에 빨간 표시가 다음 탐지까지 남아야 한다.
- **구조 그림**: TurretScanner(연결 컴포넌트) → SpatialGrid (칸 → 드론) → Drone (`object`), 그리고 Field → SpatialGrid (`Move`). 나쁜 예 구조 그림은 Field 가 드론 위치만 바꾸고 격자를 건드리지 않는 모양. 단계: 1 드론은 지금 칸에 등록된다, 2 움직여 칸을 넘으면 옛 칸에서 빼고 새 칸에 넣는다, 3 탐지는 반경이 닿는 칸들만 본다, 4 그 칸의 드론만 거리를 잰다.
- **Unity 연결 컴포넌트 (Unity/)**: `TurretScanner : MonoBehaviour` 와 드론 뷰. 드론 위치는 코어가 정하고 뷰는 따라만 간다. Unity 에는 물리 쿼리(`Physics.OverlapSphere`, `Physics2D.OverlapCircle`)가 내부에서 공간 분할을 쓴다는 것을 "그래서 물리 콜라이더가 있으면 보통 그것으로 충분하다" 정도로만 적는다 (내부 구조를 단정하지 않는다). 이 표본은 콜라이더 없이 많은 대상을 다룰 때(예: 수백 개의 점)의 직접 구현이다.
- **글**: 증상 "드론이 바로 옆에 있는데 포탑이 못 찾는다" 에서 시작한다. 거리 검사 횟수를 줄이는 것이 목적이지만 칸 등록을 지키지 않으면 틀린 답을 빠르게 낸다는 것이 요점. `mistakes` 후보: 칸을 넘을 때 등록을 안 옮김, 내 칸만 봄, 칸 크기가 반경보다 훨씬 작아 볼 칸이 너무 많음, 파괴된 드론을 칸에서 안 뺌, 칸 번호 계산에서 음수 좌표를 `(int)` 로 잘라 0 칸이 두 배. `references`: https://gameprogrammingpatterns.com/spatial-partition.html (Nystrom: Spatial Partition). `related`: `update-method-drone-list`, `strategy-turret-targeting`.
- **묶음 2~5 리뷰에서 반복된 지적을 미리 피한다** (가이드 2~7절을 먼저 읽는다): (1) `unity.setup`·`unity.pitfalls`·`mistakes`·Tooltip 의 모든 문장이 **이 표본의 Unity/ 코드**에서 실제로 그런지 하나씩 대조한다. 매뉴얼에 없는 Unity 내부 동작은 단정하지 않는다. (2) 효과 끄기에서 수강생이 자동 데모와 다른 순서로 눌러도 offNote 의 원인 설명이 맞는지 본다. (3) 시나리오 note 의 시각은 기록(`truth/<id>/*.log`)의 숫자와 같게 쓴다. (4) 정지 화면에서도 버그가 보이게 버그 상태가 이어지는 동안 남는 표시를 둔다. 한 프레임처럼 작은 어긋남은 숫자로, 같은 프레임에 사라지는 상태는 0.3~0.5초 남겨 그린다. (5) 막대 기준은 조절 값으로 계산하지 않는다. 조절 값 최소·최대, 프리셋, 나중 시나리오의 효과 켬·끔에서 글·그림이 겹치거나 잘리지 않는지 `live` 로 본다 (`p.<key>=`, `preset=`, `scenario=` 주소 인자, 가이드 7절). (6) `unity.setup` 단계끼리 모순이 없고 적힌 대로 놓으면 카메라에 모두 보인다. (7) Unity/ 코드에도 종류마다 복붙한 코드를 남기지 않는다. 인터페이스 형식의 `[SerializeField]` 칸은 Inspector 에 보이지 않는다. (8) 같은 대상(한 번씩 일어나는 일)의 같은 ✖ 는 버그 상태가 이어지는 동안 한 번, 앞 버그의 결과는 다른 이름이나 일반 사건 줄로, 패턴도 같은 증상이면 ✖ 없음 (가이드 4절). (9) `// [n]` 은 코드 줄 끝에 (주석만 있는 줄은 검사가 잡는다). `// [!]` 설명은 한 줄 안팎. 빠진 코드가 원인이면 주석만 있는 `// [!]` 줄. (10) Core 는 수강생이 복사하는 원본이다: 처리 중 재진입(핸들러가 다시 부름), 같은 프레임에 생기고 사라짐 같은 가장자리도 맞게.
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**만 쓴다 (`src/specimens/` 아래 폴더. 묶음 6 의 다른 표본은 아직 없어 링크가 깨진다).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs spatial-grid-detection` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check spatial-grid-detection`, `node tools/gallery.mjs unity-compile spatial-grid-detection` 통과.
3. `node tools/gallery.mjs live spatial-grid-detection --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
