---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 10
verify:
  - node tools/truth.mjs abstract-factory-zone-themes
  - node tools/gallery.mjs check abstract-factory-zone-themes
  - node tools/gallery.mjs unity-compile abstract-factory-zone-themes
  - node tools/gallery.mjs thumbs abstract-factory-zone-themes
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)", "Bash(grep *)", "Bash(cat *)", "Bash(head *)"]
writePaths:
  - unity/abstract-factory-zone-themes/**
  - truth/abstract-factory-zone-themes/**
  - src/specimens/abstract-factory-zone-themes/**
  - src/shots/abstract-factory-zone-themes/**
allowProfiles: [org]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: abstract-factory-zone-themes

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전). 작업 트리에는 처음에 `node_modules` 가 없다. `node tools/gallery.mjs` 를 인자 없이 한 번 부르면 메인 폴더의 것이 정션으로 이어지니, 그 뒤 Read 도구로 연다 (셸로 상위 폴더를 뒤지지 않는다. 막혀 있다).
3. 기준 샘플 `state-player-actions` 의 파일 전부 (`unity/state-player-actions/`, `truth/state-player-actions/Target.cs`, `src/specimens/state-player-actions/`). 시간이 흐르는 코어(`Tick`)와 float 계산을 맞춘 sim 의 본보기다 (투사체가 난다). 같은 생성 그룹의 `factory-drone-spawner` 도 읽고 겹치지 않게 한다: 그 표본은 **제품 하나**를 스포너 자식이 고르는 팩토리 메서드, 이 표본은 **제품 세트**를 공장 객체째 갈아 끼우는 추상 팩토리다.
4. `docs/selection.md` 의 `abstract-factory-zone-themes` 카드.

## 표본별

- ID `abstract-factory-zone-themes`, namespace `PatternGallery.AbstractFactoryZoneThemes`. 제목 `추상 팩토리: 구역 테마 세트`, 그룹 E, 순서 4, 난이도 2, `pattern: '추상 팩토리'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 탐사 구역 세 곳: 숲, 용암, 나중에 더한 빙하. 구역마다 어울리는 세트가 있다: 바닥(색과 이름), 잔해 드론 변종(덩굴 드론, 화염 드론, 서리 드론), 그 드론이 쏘는 투사체(가시, 화염탄, 얼음 조각). 하린이 왼쪽에 서 있고, 드론은 오른쪽 출구에서 나와 줄지어 선다 (자리가 차면 더 나오지 않고 이벤트로 알린다). 구역을 옮기면 바닥이 바뀌고 **그 뒤에 나오는** 드론이 새 구역 것이다. 이미 나온 드론은 남는다 (앞 웨이브가 남은 채 다음 구역 웨이브가 시작되는 상황).
- **입력과 키**: `forest`, `lava`, `ice` (구역 옮기기), `spawn` 드론 하나, `fire` 살아 있는 드론이 모두 한 발씩. 투사체는 왼쪽으로 `projectileSpeed` 로 날아 하린 앞에서 사라진다 (피해는 없다. 무엇이 날아오는지만 본다). `keys` 는 `KeyQ`, `KeyW`, `KeyE`, `KeyR`, `KeyF`.
- **코어 (Core/)**: `IZoneFactory { string Theme; Ground CreateGround(); Drone CreateDrone(); Projectile CreateProjectile(); }` 와 `ForestFactory`, `LavaFactory`, `IceFactory`. 제품은 테마와 이름을 든 작은 클래스. `ZoneDirector` (클라이언트)는 지금 공장 하나만 들고 (`Enter(IZoneFactory)`), 드론을 만들 때 그 공장을 드론에 쥐여 준다. 드론의 사격은 **자기를 만든 공장**의 `CreateProjectile()` 을 부른다. 그래서 클라이언트 어디에도 테마 이름으로 가르는 분기가 없다. 입력 이름 → 공장 객체는 조립하는 곳(하네스 Target, Unity 어댑터) 한 곳에서만 고른다. 일어난 일은 C# event (`ZoneEntered`, `DroneSpawned`, `ProjectileFired(drone, projectile)`, `SpawnRejected` 등).
- **나쁜 예 (Naive/)**: 테마를 쓰는 곳마다 `switch (zone)` 이 있는 흔한 코드: `string zone` 하나와 `SetGround()`, `SpawnDrone()`, `MakeProjectile()`. ✖ `구역 섞임`: `FireAll()` 이 드론마다 `MakeProjectile(zone)` 을 부르는데 `zone` 은 **지금** 구역이라, 숲에서 나온 드론이 용암으로 옮긴 뒤 화염탄을 쏜다. ✖ `분기 누락`: 빙하를 더할 때 `SetGround`, `SpawnDrone` 에는 `case "ice"` 를 넣고 `MakeProjectile` 에는 빠뜨려 `default` (화염탄)로 떨어진다 (빙하 구역에서 서리 드론이 화염탄). 하네스 어댑터가 두 원인을 갈라 쓴다 (드론의 테마가 지금 구역과 다르면 구역 섞임, 같은데 세트가 어긋나면 분기 누락). 문제 줄에 `// [!]`. 두 ✖ 모두 자동 데모에 나와야 한다.
- **시나리오**: 첫 번째(자동 데모, 6~7초): (시작 구역 숲) `spawn` → `fire` (두 모드 같음) → `lava` → `spawn` → `fire` (나쁜 예: 숲 드론이 화염탄) → `ice` → `spawn` → `fire` (나쁜 예: 서리 드론이 화염탄). 화면이 어지럽지 않게 드론은 셋 안팎. 두 번째: 한 구역에서만 만들고 쏜다 (구역을 옮기지 않으면 나쁜 예도 맞다는 것을 note 에). 세 번째: `values` 로 시작 구역이나 `projectileSpeed` 를 바꾼 경로, 또는 자리가 차서 더 나오지 않는 경로.
- **조절 값**: `startZone` (select: 숲, 용암, 빙하. Unity 어댑터에서는 시작 공장을 고르는 칸), `projectileSpeed`, 필요하면 `maxDrones`. 모두 Unity 어댑터의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 땅(`box`)의 색과 이름이 지금 구역 바닥 (숲 초록, 용암 주황, 빙하 하늘색). 하린 `actor` (`role: 'ally'`) 왼쪽, 드론 `actor` (`role: 'enemy'`, 라벨 `덩굴`, `화염`, `서리`) 오른쪽 줄. 드론마다 자기 세트 색의 작은 표식(`box`)을 둬 **드론이 어느 세트인지** 바닥과 상관없이 보이게 한다. 투사체는 세트 색의 작은 `box` 와 라벨. 왼쪽 위에 `구역: 용암 · 공장: LavaFactory` (나쁜 예는 `zone = "lava"`). 나쁜 예는 세트가 어긋난 드론 위에 빨간 `세트 어긋남: 가시 대신 화염탄` 을 남기고 (투사체가 사라진 뒤에도), 어긋난 투사체는 빨간 테두리.
- **구조 그림**: ZoneDirectorInput(어댑터) → ZoneDirector → IZoneFactory(`kind: 'interface'`) ← ForestFactory · LavaFactory · IceFactory (한 노드로 묶어도 된다), 공장 → 제품 (Ground · Drone · Projectile 을 한 노드로 묶어도 된다), Drone → IZoneFactory (`ref`, 라벨 `만든 공장`). 나쁜 예 구조 그림은 `string zone` 노드 하나를 `SetGround`, `SpawnDrone`, `MakeProjectile` 세 switch 노드가 각자 읽는 모양. 단계: 1 구역을 옮기면 공장 객체를 통째로 갈아 끼운다 (고르는 분기는 조립하는 곳 한 곳), 2 드론은 지금 공장이 만들고 그 공장을 기억한다, 3 사격하면 드론이 **자기 공장**에 투사체를 만들게 한다, 4 새 구역은 공장 클래스 하나를 더하면 된다 (쓰는 곳은 고치지 않는다).
- **Unity 어댑터 (Unity/)**: `ZoneDirectorInput : MonoBehaviour` 가 InputAction 다섯(`Reset` 에서 기본 키)과 코어 `ZoneDirector` 를 들고, 코어 이벤트 핸들러에서 오브젝트를 만들고 바닥 색을 바꾼다. 테마별 겉모습(바닥 색, 드론·투사체 프리팹이나 색)은 ScriptableObject 에셋 하나에 묶는다 (`ZoneArtSet`, `[CreateAssetMenu]`. 에셋 하나 = 세트 하나라 Inspector 에서도 짝이 어긋나지 않는다). 코어 공장은 무엇을 만들지, 에셋은 어떻게 보일지를 맡는다. 제품의 테마로 에셋을 찾는 곳은 한 곳. 프리팹 없이 기본 도형(Cube, Sphere)과 색으로도 되게 `unity.setup` 을 쓴다 (2D·Universal 3D 템플릿 둘 다).
- **글**: 증상 "용암 구역으로 넘어가자 남아 있던 숲 드론이 화염탄을 쏜다. 새로 넣은 빙하 구역에서는 서리 드론이 화염탄을 쏜다" 에서 시작한다. 추상 팩토리의 약점도 한 문장: 새 **세트**(구역)는 공장 클래스 하나로 끝나지만 새 **제품**(예: 보상 상자)은 모든 공장을 고쳐야 한다. `mistakes` 후보: 쓰는 곳마다 switch, 쏘는 순간 지금 구역 전역 값을 다시 읽음, 공장 안에서 복붙하다 다른 세트 제품을 돌려줌 (패턴이 막아 주지 않는다. 공장마다 세트를 확인한다), `default` 로 조용히 넘어감 (모르는 구역이면 예외나 경고), 공장을 매번 `new` 로 만듦. `references`: https://refactoring.guru/design-patterns/abstract-factory (Refactoring Guru: Abstract Factory), https://docs.unity3d.com/6000.3/Documentation/Manual/class-ScriptableObject.html (Unity 매뉴얼: ScriptableObject), https://docs.unity3d.com/6000.3/Documentation/ScriptReference/CreateAssetMenuAttribute.html (Unity `CreateAssetMenu`). `related`: `factory-drone-spawner` (팩토리 메서드와의 차이), `strategy-turret-targeting` (공장 객체를 갈아 끼우는 모양은 전략과 같다).
- **묶음 2·3 리뷰에서 반복된 지적을 미리 피한다**: (1) `unity.setup`·`unity.pitfalls`·`mistakes`·Tooltip 의 모든 문장이 **이 표본의 Unity/ 코드**에서 실제로 그런지 하나씩 대조한다 (일반론이 이 코드에서는 안 일어나면 그렇게 쓴다). (2) 효과 끄기에서 수강생이 자동 데모와 다른 순서로 눌러도 offNote 의 원인 설명이 맞는지 본다. (3) 시나리오 note 의 시각은 기록(`truth/<id>/*.log`)의 숫자와 같게 쓴다. (4) 정지 화면에서도 버그가 보이게, 버그 상태가 이어지는 동안 남는 표시를 둔다. (5) 막대 기준은 조절 값으로 계산하지 않는다. (6) `unity.setup` 단계끼리 모순이 없고, 적힌 대로 놓으면 카메라에 모두 보인다 (위치·카메라 값을 적는다). (7) Unity/ 코드에도 종류마다 복붙한 코드를 남기지 않는다 (패턴 표본의 Unity 쪽이 나쁜 예 모양이면 안 된다). (8) 같은 대상의 같은 ✖ 는 한 번, 앞 버그의 결과로 생긴 증상은 다른 이름이나 ✖ 가 아닌 사건 줄로 (가이드 4절).
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**만 쓴다 (`state-player-actions`, `observer-health-events`, `command-undo-replay`, `strategy-turret-targeting`, `decorator-stat-buffs`, `prototype-drone-clone`, `singleton-scene-managers`, `state-drone-ai`, `object-pool-projectiles`, `factory-drone-spawner`, `facade-hit-resolution`. 묶음 4 의 다른 표본은 아직 없어 링크가 깨진다). Jay 의 강의 교안 같은 장의 강조점을 글에 녹이되 교안을 출처로 링크하지 않는다 (공개되지 않은 자료).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs abstract-factory-zone-themes` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check abstract-factory-zone-themes`, `node tools/gallery.mjs unity-compile abstract-factory-zone-themes` 통과.
3. `node tools/gallery.mjs live abstract-factory-zone-themes --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
