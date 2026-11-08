---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 12
verify:
  - node tools/truth.mjs dirty-flag-loadout
  - node tools/gallery.mjs check dirty-flag-loadout
  - node tools/gallery.mjs unity-compile dirty-flag-loadout
  - node tools/gallery.mjs thumbs dirty-flag-loadout
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)", "Bash(grep *)", "Bash(cat *)", "Bash(head *)"]
writePaths:
  - unity/dirty-flag-loadout/**
  - truth/dirty-flag-loadout/**
  - src/specimens/dirty-flag-loadout/**
  - src/shots/dirty-flag-loadout/**
allowProfiles: [sub]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: dirty-flag-loadout

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전). 작업 트리에는 처음에 `node_modules` 가 없다. `node tools/gallery.mjs` 를 인자 없이 한 번 부르면 메인 폴더의 것이 정션으로 이어지니, 그 뒤 Read 도구로 연다 (셸로 상위 폴더를 뒤지지 않는다. 막혀 있다).
3. 기준 샘플 `observer-health-events` 의 파일 전부 (`unity/observer-health-events/`, `truth/observer-health-events/Target.cs`, `src/specimens/observer-health-events/`). 시간이 없는 코어와 입력마다 상태 비교로 기록하는 방식의 본보기다. 나쁜 예의 어긋남을 "있어야 할 값" 코어와 비교해 찾는 방식은 `command-undo-replay` 의 Target 을 참고한다. 이동이 필요하면 `state-player-actions` 의 `Tick` 방식을 따른다.
4. `docs/selection.md` 의 `dirty-flag-loadout` 카드.

## 표본별

- ID `dirty-flag-loadout`, namespace `PatternGallery.DirtyFlagLoadout`. 제목 `더티 플래그: 장비 무게 다시 계산`, 그룹 D, 순서 3, 난이도 2, `pattern: '더티 플래그'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 탐사대장 하린의 장비 칸. 아이템마다 무게가 있고 수리 키트·냉각 셀은 묶음(개수)이다. 총 무게가 이동 속도를 정한다 (무거울수록 느림, 식은 글에 적는다). 총 무게 계산은 칸마다 모듈 무게까지 더하는 비싼 계산이라고 두고, **바뀌었을 때만** 다시 계산한다 (더티 플래그). 화면에 다시 계산한 횟수를 센다.
- **입력과 키**: `pickup` 냉각 셀 줍기 (묶음 +1 또는 새 칸), `drop` 마지막 칸 버리기, `useKit` 수리 키트 하나 쓰기 (묶음 −1, 0 이면 칸 비움), `upgrade` 가벼운 합금 (한 아이템 무게 감소). `keys` 는 `KeyQ`, `KeyW`, `KeyE`, `KeyR`.
- **코어 (Core/)**: `Loadout` 이 칸 목록을 **private** 으로 들고, 바꾸는 길은 메서드뿐이다 (`Add`, `RemoveLast`, `UseOne`, `Upgrade`). 모든 메서드가 `dirty = true`. `TotalWeight` 를 읽을 때 dirty 면 다시 계산하고 끈다 (`Recalculated` 이벤트로 횟수). 속도는 `TotalWeight` 에서 구한다. 교안 01 의 캡슐화(`private set`)가 더티 플래그를 지키는 방법이라는 것을 코드 주석과 글에. 일어난 일은 C# event.
- **나쁜 예 (Naive/)**: 캐시와 `isDirty` 는 있지만 칸 목록과 묶음 수가 **public** 이고, 수리 키트 쓰기 코드가 바깥에서 `slot.count--` 만 하고 `isDirty = true` 를 빠뜨린 흔한 코드 ✖ `옛 무게` (무게와 속도가 바뀌지 않음). 빠진 코드는 주석만 있는 `// [!]` 줄로 (가이드 4절). 속도가 옛 무게를 따라 어긋나는 것은 같은 원인의 결과라 ✖ 를 하나 더 달지 않는다. 자동 데모에 나와야 한다. 다음 줍기·버리기가 표시를 켜면 그때 맞는 값으로 돌아온다는 것(그래서 재현이 오락가락)을 글에.
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): 줍기 둘 → 수리 키트 쓰기 (나쁜 예 ✖) → 수리 키트 한 번 더 → 버리기 (나쁜 예가 맞는 값으로 돌아옴). 두 번째: 합금 업그레이드 경로. 세 번째: 조절 값을 바꾼 경로.
- **조절 값**: 화면 차이가 큰 것 2~3개 (예: `kitWeight`, `cellWeight`, `baseSpeed`). 모두 Unity 연결 컴포넌트의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 하린 `actor` (`role: 'ally'`) 와 장비 칸 상자 줄 (칸마다 이름·개수·무게), 총 무게 `bar` (기준은 고정 최대 무게) 와 숫자, 속도 글. 왼쪽 위에 `다시 계산 n 회 · 표시 dirty/clean`. 나쁜 예는 칸의 실제 합과 캐시된 총 무게가 다른 것 (`캐시 14.0 · 실제 13.0`) 이 이어서 보여야 한다.
- **구조 그림**: LoadoutInput(연결 컴포넌트) → Loadout (`dirty`, `TotalWeight`) → 칸 목록 (`object`), 그리고 HarinMover → Loadout (속도를 읽음). 나쁜 예 구조 그림은 바깥 코드(RepairKit)가 칸 목록을 직접 고치고 표시를 건너뛰는 모양. 단계: 1 장비를 바꾸는 길은 Loadout 의 메서드뿐이다, 2 바꾸는 메서드는 계산하지 않고 표시만 켠다, 3 무게를 읽을 때 표시가 켜져 있으면 한 번 다시 계산하고 끈다, 4 바뀌지 않았으면 캐시를 그대로 쓴다.
- **Unity 연결 컴포넌트 (Unity/)**: `LoadoutInput : MonoBehaviour` 가 InputAction 으로 코어 메서드를 부르고, 무게·속도 글은 이벤트 핸들러에서 갱신 (IMGUI 확인용 허용, 가이드 3절). 이동하는 `HarinMover` 는 `Update` 에서 `Loadout.Speed` 를 읽어 움직인다 (읽기가 매 프레임이어도 계산은 바뀔 때만이라는 것이 요점).
- **글**: 증상 "수리 키트를 썼는데 짐이 그대로 무겁다" 에서 시작한다. 매 프레임 계산 → 캐시 → 캐시가 틀림 → 바꾸는 길을 한 곳에 모음(캡슐화)의 순서로. Unity 의 `Transform` 이 위치를 바꿀 때 내부 행렬을 바로 계산하지 않는 것도 같은 생각이라는 것을 한 문장 (단정하지 말고 "같은 생각" 정도로). `mistakes` 후보: 바꾸는 길 하나에서 표시를 빠뜨림, 바깥에 필드를 열어 둠, 표시를 켜기만 하고 읽는 쪽이 캐시를 그대로 씀, 다시 계산을 매 프레임 해 캐시가 무의미, 여러 캐시가 서로 의존하는데 하나만 표시. `references`: https://gameprogrammingpatterns.com/dirty-flag.html (Nystrom: Dirty Flag). `related`: `decorator-stat-buffs` (값이 바뀔 때 다시 계산), `observer-health-events`.
- **묶음 2~4 리뷰에서 반복된 지적을 미리 피한다** (가이드 2~7절을 먼저 읽는다): (1) `unity.setup`·`unity.pitfalls`·`mistakes`·Tooltip 의 모든 문장이 **이 표본의 Unity/ 코드**에서 실제로 그런지 하나씩 대조한다. (2) 효과 끄기에서 수강생이 자동 데모와 다른 순서로 눌러도 offNote 의 원인 설명이 맞는지 본다. (3) 시나리오 note 의 시각은 기록(`truth/<id>/*.log`)의 숫자와 같게 쓴다. (4) 정지 화면에서도 버그가 보이게, 버그 상태가 이어지는 동안 남는 표시를 둔다. 미니 월드의 ✖ 표시는 기록과 같은 판정이다. (5) 막대 기준은 조절 값으로 계산하지 않는다. 조절 값 최소·최대와 프리셋마다 글·그림이 겹치지 않는지 `live` 로 본다 (`p.<key>=` , `preset=` 주소 인자, 가이드 7절). (6) `unity.setup` 단계끼리 모순이 없고, 적힌 대로 놓으면 카메라에 모두 보인다 (위치·카메라 값을 적는다). (7) Unity/ 코드에도 종류마다 복붙한 코드를 남기지 않는다. (8) 같은 대상의 같은 ✖ 는 한 번, 앞 버그의 결과로 생긴 증상은 다른 이름이나 ✖ 가 아닌 사건 줄로. 패턴도 같은 증상이면 ✖ 를 달지 않는다 (가이드 4절). (9) `// [!]` 설명은 한 줄 안팎 (무대 문제 줄 칸에 보인다). 빠진 코드가 원인이면 주석만 있는 `// [!]` 줄을 둔다.
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**만 쓴다 (`src/specimens/` 아래 폴더. 묶음 5 의 다른 표본은 아직 없어 링크가 깨진다). Jay 의 강의 교안 내용을 글에 녹일 수 있으나 교안을 출처로 링크하지 않는다 (공개되지 않은 자료).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs dirty-flag-loadout` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check dirty-flag-loadout`, `node tools/gallery.mjs unity-compile dirty-flag-loadout` 통과.
3. `node tools/gallery.mjs live dirty-flag-loadout --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
