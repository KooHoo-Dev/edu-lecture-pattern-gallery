---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 12
verify:
  - node tools/truth.mjs flyweight-drone-types
  - node tools/gallery.mjs check flyweight-drone-types
  - node tools/gallery.mjs unity-compile flyweight-drone-types
  - node tools/gallery.mjs thumbs flyweight-drone-types
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)", "Bash(grep *)", "Bash(cat *)", "Bash(head *)"]
writePaths:
  - unity/flyweight-drone-types/**
  - truth/flyweight-drone-types/**
  - src/specimens/flyweight-drone-types/**
  - src/shots/flyweight-drone-types/**
allowProfiles: [sub]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: flyweight-drone-types

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전). 작업 트리에는 처음에 `node_modules` 가 없다. `node tools/gallery.mjs` 를 인자 없이 한 번 부르면 메인 폴더의 것이 정션으로 이어지니, 그 뒤 Read 도구로 연다 (셸로 상위 폴더를 뒤지지 않는다. 막혀 있다).
3. 기준 샘플 `observer-health-events` 의 파일 전부 (`unity/observer-health-events/`, `truth/observer-health-events/Target.cs`, `src/specimens/observer-health-events/`). 시간이 없는 코어와, 나쁜 예를 입력마다 상태 비교로 기록하는 방식의 본보기다. 나쁜 예의 어긋남을 "있어야 할 결과" 코어와 비교해 찾는 방식은 `command-undo-replay` 의 Target 을, 공유 참조를 화살표로 그리는 방식은 `prototype-drone-clone` 의 sim 을 참고한다.
4. `docs/selection.md` 의 `flyweight-drone-types` 카드.

## 표본별

- ID `flyweight-drone-types`, namespace `PatternGallery.FlyweightDroneTypes`. 제목 `플라이웨이트: 드론 종류 데이터 공유`, 그룹 D, 순서 2, 난이도 2, `pattern: '플라이웨이트'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 지표 탐사 구역에 잔해 드론 다섯 대: 정찰형 셋(`S1`~`S3`), 중장갑 둘(`H1`, `H2`). 종류 데이터 `DroneType` (이름, 최대 HP, 속도, 색) 은 종류마다 **한 객체**를 그 종류의 모든 드론이 함께 쓴다 (내재 상태, 플라이웨이트). 드론 `Drone` 은 자기 종류 참조와 지금 HP, 위치만 든다 (외재 상태). Unity 에서는 종류 데이터가 `ScriptableObject` 에셋이다.
- **입력과 키**: `hitScout` 첫 살아 있는 정찰형에 `damage` 피해, `hitHeavy` 첫 살아 있는 중장갑에 피해, `spawn` 정찰형 하나 더, `patch` 밸런스 수정 (정찰형 최대 HP `+patchHp`. 공유라 모든 정찰형에 바로 반영되고 지금 HP 는 그대로). `keys` 는 `KeyQ`, `KeyW`, `KeyE`, `KeyR`.
- **코어 (Core/)**: `DroneType` (읽기 전용 속성, 생성자에서만 정함. 밸런스 수정은 `DroneType` 을 고치는 메서드 하나 또는 새 종류 객체로 바꿈 — 어느 쪽이든 공유가 유지되는 쪽을 고르고 글에 적는다), `Drone` (`Type`, `Hp`, `X`, `TakeDamage`), `Squad` (드론 목록, 종류 사전, 입력 처리, 파괴되면 목록에서 뺌). 일어난 일은 C# event. 화면에 "종류 데이터 2개를 드론 n대가 공유" 를 보이게 코어가 공유 수를 알려 준다.
- **나쁜 예 (Naive/)**: 공유 종류 객체에 **지금 HP** 필드를 두고 드론이 그 값을 깎는 흔한 코드 (Unity 에서 `ScriptableObject` 에 런타임 값을 넣는 실수. 파일 머리 주석에 적는다). ✖ `HP 공유` (한 대를 때리면 같은 종류가 모두 깎임). 새로 나온 정찰형이 이미 깎인 HP 로 나오는 것은 같은 원인의 결과라 다른 이름(예: `다친 채 나옴`)이나 일반 사건 줄로 (가이드 4절). 문제 줄에 `// [!]`. 자동 데모에 나와야 한다. 밸런스 수정은 두 모드 모두 모든 정찰형에 반영되므로 ✖ 가 아니다 (글에서 공유의 좋은 점으로 쓴다).
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): 정찰형 피해 → 중장갑 피해 → 정찰형 피해 → 정찰형 하나 더 → 밸런스 수정. 두 번째: 정찰형을 파괴될 때까지 (나쁜 예는 같은 종류가 한꺼번에 HP 0 — 결과 증상 처리 규칙대로). 세 번째: `values` 로 `damage` 나 `patchHp` 를 바꾼 경로.
- **조절 값**: `damage`, `patchHp`, 그 밖에 화면 차이가 큰 것 하나 (예: 처음 정찰형 수). 모두 Unity 연결 컴포넌트의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 위쪽에 종류 데이터 상자 둘 (`정찰형 · 최대 HP 4 · 속도 2`, `중장갑 …`), 아래 땅에 드론 `actor` (`role: 'enemy'`, 종류마다 `scale`·라벨), 머리 위 HP `bar` (기준은 고정 최대값, 가이드 6절). 드론에서 자기 종류 상자로 `arrow` (공유가 보이게). 왼쪽 위에 `종류 데이터 2개 · 드론 n대`. 나쁜 예는 종류 상자 안에 `지금 HP 2` 처럼 공유된 지금 HP 가 보이고, 한 대를 때렸는데 같은 종류 바가 모두 줄어든 것이 이어서 보여야 한다.
- **구조 그림**: DroneSpawnerInput(연결 컴포넌트) → Squad → Drone (`object`, 여럿) → DroneType (`object`, 공유). 나쁜 예 구조 그림은 `DroneType` 노드 안에 `currentHp` 가 있고 드론이 그것을 고치는 모양. 단계: 1 종류마다 데이터 객체를 하나만 만든다, 2 드론은 종류를 참조하고 지금 HP·위치만 든다, 3 피해는 드론의 지금 HP 만 바꾼다, 4 밸런스 수정은 종류 객체 하나를 바꿔 그 종류 모두에 반영된다.
- **Unity 연결 컴포넌트 (Unity/)**: `DroneTypeAsset : ScriptableObject` (`[CreateAssetMenu]`, 최대 HP·속도·색 필드. 런타임 값은 두지 않는다) 를 코어 `DroneType` 으로 바꿔 주는 메서드, 드론 오브젝트의 `DroneView : MonoBehaviour` (코어 `Drone` 과 짝, HP 바 갱신), 입력을 받는 `SquadInput`. Play 중에 에셋 값을 바꾸면 Play 를 끈 뒤에도 남는다는 것, 그래서 런타임 값을 에셋에 두지 말고 필요하면 `Instantiate(asset)` 로 사본을 쓴다는 것을 pitfalls 에.
- **글**: 증상 "드론 한 대를 때렸는데 같은 종류가 모두 같이 깎인다" 에서 시작한다. 내재 상태(공유)와 외재 상태(개체) 구분, 메모리를 아끼는 것보다 **값의 주인이 누구인가**가 수업의 요점이라는 것. Nystrom 의 타입 객체(종류를 클래스 상속 대신 데이터 객체로)와 잇는다. `mistakes` 후보: SO 에 런타임 값, Play 뒤 에셋이 바뀐 채 남음, 종류마다 데이터를 복사해 밸런스 수정이 이미 나온 드론에 안 먹음, 공유 객체를 `Instantiate` 로 매번 복제해 공유가 깨짐, 종류 데이터에 드론 참조를 넣어 순환. `references`: https://gameprogrammingpatterns.com/flyweight.html (Nystrom: Flyweight), https://gameprogrammingpatterns.com/type-object.html (Nystrom: Type Object), https://docs.unity3d.com/6000.3/Documentation/ScriptReference/ScriptableObject.html (Unity `ScriptableObject`). `related`: `prototype-drone-clone` (공유와 복사), `abstract-factory-zone-themes`.
- **묶음 2~4 리뷰에서 반복된 지적을 미리 피한다** (가이드 2~7절을 먼저 읽는다): (1) `unity.setup`·`unity.pitfalls`·`mistakes`·Tooltip 의 모든 문장이 **이 표본의 Unity/ 코드**에서 실제로 그런지 하나씩 대조한다. (2) 효과 끄기에서 수강생이 자동 데모와 다른 순서로 눌러도 offNote 의 원인 설명이 맞는지 본다. (3) 시나리오 note 의 시각은 기록(`truth/<id>/*.log`)의 숫자와 같게 쓴다. (4) 정지 화면에서도 버그가 보이게, 버그 상태가 이어지는 동안 남는 표시를 둔다. 미니 월드의 ✖ 표시는 기록과 같은 판정이다. (5) 막대 기준은 조절 값으로 계산하지 않는다. 조절 값 최소·최대와 프리셋마다 글·그림이 겹치지 않는지 `live` 로 본다 (`p.<key>=` , `preset=` 주소 인자, 가이드 7절). (6) `unity.setup` 단계끼리 모순이 없고, 적힌 대로 놓으면 카메라에 모두 보인다 (위치·카메라 값을 적는다). (7) Unity/ 코드에도 종류마다 복붙한 코드를 남기지 않는다. (8) 같은 대상의 같은 ✖ 는 한 번, 앞 버그의 결과로 생긴 증상은 다른 이름이나 ✖ 가 아닌 사건 줄로. 패턴도 같은 증상이면 ✖ 를 달지 않는다 (가이드 4절). (9) `// [!]` 설명은 한 줄 안팎 (무대 문제 줄 칸에 보인다). 빠진 코드가 원인이면 주석만 있는 `// [!]` 줄을 둔다.
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**만 쓴다 (`src/specimens/` 아래 폴더. 묶음 5 의 다른 표본은 아직 없어 링크가 깨진다). Jay 의 강의 교안 내용을 글에 녹일 수 있으나 교안을 출처로 링크하지 않는다 (공개되지 않은 자료).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs flyweight-drone-types` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check flyweight-drone-types`, `node tools/gallery.mjs unity-compile flyweight-drone-types` 통과.
3. `node tools/gallery.mjs live flyweight-drone-types --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
