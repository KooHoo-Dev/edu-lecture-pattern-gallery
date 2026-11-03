---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 12
verify:
  - node tools/truth.mjs object-pool-projectiles
  - node tools/gallery.mjs check object-pool-projectiles
  - node tools/gallery.mjs unity-compile object-pool-projectiles
  - node tools/gallery.mjs thumbs object-pool-projectiles
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)"]
writePaths:
  - unity/object-pool-projectiles/**
  - truth/object-pool-projectiles/**
  - src/specimens/object-pool-projectiles/**
  - src/shots/object-pool-projectiles/**
allowProfiles: [org]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: object-pool-projectiles

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전).
3. 기준 샘플 `state-player-actions` 의 파일 전부 (`unity/state-player-actions/`, `truth/state-player-actions/Target.cs`, `src/specimens/state-player-actions/`). 시간이 흐르는 코어(`Tick`)와 float 계산을 맞춘 sim 의 본보기다. 나쁜 예의 어긋남을 "있어야 할 결과" 코어와 비교해 찾는 방식은 `command-undo-replay` 의 Target 을 참고한다.
4. `docs/selection.md` 의 `object-pool-projectiles` 카드.

## 표본별

- ID `object-pool-projectiles`, namespace `PatternGallery.ObjectPoolProjectiles`. 제목 `오브젝트 풀: 포탑 탄 재사용`, 그룹 D, 순서 1, 난이도 2, `pattern: '오브젝트 풀'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 정비 기지(왼쪽)의 포탑이 오른쪽으로 탄을 쏜다. 탄은 두 종류: 빠른 탄(`fastSpeed`, 짧은 수명)과 느린 냉각탄(`slowSpeed`, 긴 수명, 색과 라벨이 다름). 탄은 오른쪽의 잔해 드론 표적(고정)에 맞거나 화면 밖으로 나가면 사라진다. 탄은 풀에서 빌리고 돌려준다. 풀은 처음에 `poolSize` 개를 만들어 두고, 모자라면 새로 만든다.
- **입력과 키**: `fast` 빠른 탄, `slow` 냉각탄, `burst` 빠른 탄 연사(짧은 간격으로 여러 발). `keys` 는 `KeyQ`, `KeyW`, `KeyE`.
- **코어 (Core/)**: `Projectile` (종류, 위치, 속도, 남은 수명, 쓰는 중 여부)과 `ProjectilePool` (`Get()` / `Release(Projectile p)`, 만든 수·쓰는 중·대기 수). `Get` 으로 빌린 뒤 발사하는 쪽이 `p.Launch(kind, x, speed, life)` 처럼 **모든 상태를 새로 맞추는** 한 메서드를 부른다 (또는 풀이 `Get` 때 초기화 콜백을 부른다. Unity `ObjectPool<T>` 의 `actionOnGet` 과 같은 자리). `Release` 는 이미 돌려받은 탄이면 받지 않고 이벤트로 알린다 (Unity `ObjectPool<T>` 의 `collectionCheck` 와 같은 생각). 명중과 화면 밖 판정이 같은 프레임에 겹쳐도 한 번만 돌려준다. 일어난 일은 C# event (`Created`, `Taken`, `Returned`, `ReleaseRejected`, `Hit` 등).
- **나쁜 예 (Naive/)**: 풀은 있지만 빌릴 때 **위치만** 다시 맞추고 속도·종류·수명은 이전 값을 그대로 쓰는 흔한 코드 ✖ `이전 상태 재사용` (냉각탄을 쐈는데 이전에 빠른 탄으로 쓰인 객체라 빠른 속도로 날아감). 그리고 명중 처리와 화면 밖 처리가 각자 `Release` 를 불러 같은 탄이 풀에 두 번 들어가고, 다음 두 발이 **같은 객체**를 받아 한 발이 사라지거나 순간 이동하는 ✖ `이중 반납`. 문제 줄에 `// [!]`. 두 ✖ 모두 자동 데모에 나와야 한다.
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): 빠른 탄 몇 발(풀이 데워짐) → 냉각탄 (재사용된 객체, 나쁜 예는 빠르게 날아감) → 명중과 화면 밖이 겹치는 순간이 생기게 → 연사로 풀이 비어 새로 만듦. 두 번째: 냉각탄만 여러 발 (재사용해도 같은 종류면 나쁜 예도 티가 안 난다는 것을 note 에 적는다). 세 번째: `values` 로 `poolSize` 를 줄여 새로 만드는 경로.
- **조절 값**: `poolSize`, `fastSpeed`, `slowSpeed`. 모두 Unity 어댑터의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 왼쪽에 기지와 포탑(`box`), 오른쪽 표적(`actor` `role: 'enemy'`), 날아가는 탄은 작은 `box` 나 `ring` (종류마다 색과 라벨, 객체 번호 `#3` 처럼). 화면 위쪽에 **풀 선반**: 만든 객체마다 칸 하나, 쓰는 중이면 밝게, 대기면 흐리게, 칸 안에 객체 번호와 지금 종류. 왼쪽 위에 `만든 수 n · 쓰는 중 n · 대기 n` 과 `Instantiate 대신 재사용 n 회`. 나쁜 예는 같은 번호가 선반에 두 칸 있거나 날아가는 탄 둘이 같은 번호인 것, 냉각탄 라벨이 빠른 속도로 가는 것이 보여야 한다.
- **구조 그림**: TurretFire(어댑터) → ProjectilePool —Get/Release→ Projectile, 그리고 Projectile 의 `Launch` (상태를 새로 맞춤). 나쁜 예 구조 그림은 `Get` 이 위치만 고치고, 명중·화면 밖 두 곳이 각자 `Release` 하는 모양. 단계: 1 발사하면 풀에서 대기 중인 탄을 빌린다 (없으면 새로 만든다), 2 빌린 탄의 모든 상태를 새로 맞춘다, 3 명중이나 화면 밖이면 한 번만 돌려준다, 4 돌려받은 탄은 다음 발사 때 다시 쓴다.
- **Unity 어댑터 (Unity/)**: `TurretFire : MonoBehaviour` 가 InputAction 셋(`Reset` 에서 기본 키)으로 쏘고, 탄 오브젝트는 `[SerializeField]` 프리팹을 풀이 처음 만들 때만 `Instantiate` 해 코어 탄과 짝짓고, 빌리면 `SetActive(true)`, 돌려주면 `SetActive(false)`. 위치는 `Update` 에서 코어 값으로 옮긴다. 글에서 Unity 의 `UnityEngine.Pool.ObjectPool<T>` 를 소개하고, 이 표본의 코어가 그 콜백(`createFunc`, `actionOnGet`, `actionOnRelease`, `collectionCheck`)과 어떻게 대응하는지 적는다 (코어는 dotnet 대조 때문에 순수 C# 로 따로 짰다).
- **글**: 증상 "재사용한 총알이 이전 총알의 속도로 날아간다" 에서 시작한다. `Instantiate`/`Destroy` 를 매번 하면 생기는 GC 멈춤을 한 문장으로 잇는다 (이 표본의 웹 화면은 GC 를 재지 않는다는 것도 정직하게). `mistakes` 후보: 빌릴 때 상태를 다시 맞추지 않음, 두 번 반납, 돌려준 뒤에도 참조를 들고 계속 씀, 풀 크기를 너무 작게 잡아 결국 매번 새로 만듦, 코루틴·트레일 같은 붙은 상태를 끄지 않고 반납. `references`: https://gameprogrammingpatterns.com/object-pool.html (Nystrom: Object Pool), https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Pool.ObjectPool_1.html (Unity `ObjectPool<T>`), https://unity.com/resources/design-patterns-solid-ebook (Unity 전자책, 오브젝트 풀 장). `related`: `prototype-drone-clone` (새로 만들기 대신 복제, 상태를 섞지 않기).
- **묶음 2 리뷰에서 반복된 지적을 미리 피한다**: (1) `unity.setup`·`unity.pitfalls`·`mistakes`·Tooltip 의 모든 문장이 **이 표본의 어댑터 코드**에서 실제로 그런지 하나씩 대조한다 (일반론이 이 어댑터에서는 안 일어나면 그렇게 쓴다). (2) 효과 끄기에서 수강생이 자동 데모와 다른 순서로 눌러도 offNote 의 원인 설명이 맞는지 본다. (3) 시나리오 note 의 시각은 기록(`truth/<id>/*.log`)의 숫자와 같게 쓴다. (4) 정지 화면에서도 버그가 보이게 버그 상태가 이어지는 동안 남는 표시를 둔다. (5) 막대 기준은 조절 값으로 계산하지 않는다.
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**만 쓴다 (`state-player-actions`, `observer-health-events`, `command-undo-replay`, `strategy-turret-targeting`, `decorator-stat-buffs`, `prototype-drone-clone`, `singleton-scene-managers`. 묶음 3 의 다른 표본은 아직 없어 링크가 깨진다). Jay 의 강의 교안 같은 장의 강조점을 글에 녹이되 교안을 출처로 링크하지 않는다 (공개되지 않은 자료).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs object-pool-projectiles` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check object-pool-projectiles`, `node tools/gallery.mjs unity-compile object-pool-projectiles` 통과.
3. `node tools/gallery.mjs live object-pool-projectiles --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
