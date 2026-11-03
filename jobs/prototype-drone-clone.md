---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 12
verify:
  - node tools/truth.mjs prototype-drone-clone
  - node tools/gallery.mjs check prototype-drone-clone
  - node tools/gallery.mjs unity-compile prototype-drone-clone
  - node tools/gallery.mjs thumbs prototype-drone-clone
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)"]
writePaths:
  - unity/prototype-drone-clone/**
  - truth/prototype-drone-clone/**
  - src/specimens/prototype-drone-clone/**
  - src/shots/prototype-drone-clone/**
allowProfiles: [org]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: prototype-drone-clone

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전).
3. 기준 샘플 `observer-health-events` 의 파일 전부 (`unity/observer-health-events/`, `truth/observer-health-events/Target.cs`, `src/specimens/observer-health-events/`). 시간이 없는 코어와, 이벤트가 없는 나쁜 예를 입력마다 상태 비교(`Diff`)로 기록하는 방식의 본보기다. 나쁜 예의 어긋남을 "있어야 할 결과" 코어와 비교해 찾는 방식은 `command-undo-replay` 의 Target 도 참고한다.
4. `docs/selection.md` 의 `prototype-drone-clone` 카드.

## 표본별

- ID `prototype-drone-clone`, namespace `PatternGallery.PrototypeDroneClone`. 제목 `프로토타입 패턴: 견본 드론 복제`, 그룹 E, 순서 1, 난이도 2, `pattern: '프로토타입 패턴'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 정비사 도윤의 격납고. 다 설정한 견본 정찰 드론(이름, HP, 속도, 장착 모듈 목록)이 왼쪽 받침대에 있고, 복제본이 활주로에 줄 선다. 최대 `maxClones` 대.
- **입력과 키**: `clone` 복제, `module` 마지막 복제본에 냉각 모듈 달기, `damage` 첫 복제본에 `damageAmount` 피해, `upgrade` 견본 개조 (속도 +). `keys` 는 `KeyC`, `KeyM`, `KeyD`, `KeyU`.
- **코어 (Core/)**: `ScoutDrone` 은 값 필드(`Hp`, `Speed`, `Name` 등)와 참조 필드 `List<string> Modules` 를 든다. `Clone()` 은 `MemberwiseClone()` 으로 값 필드를 복사한 뒤 **`Modules` 는 새 목록으로** 만든다 (깊은 복사가 필요한 필드만). 원하면 `IDronePrototype` 같은 작은 인터페이스를 둬도 된다. `Hangar` 는 견본과 복제본 목록을 들고 입력을 처리한다. 가득 차면 복제를 받지 않고 이벤트로 알린다. 일어난 일은 C# event (`Cloned`, `ModuleAttached`, `Damaged`, `TemplateUpgraded`, `CloneRejected` 등). 시간이 없는 코어라 `Tick` 은 하는 일이 없어도 된다.
- **나쁜 예 (Naive/)**: `Clone()` 이 `MemberwiseClone()` 만 하는 흔한 코드 (얕은 복사). 이 줄에 `// [!]`. HP 와 속도는 따로 복사되지만 모듈 목록은 견본과 모든 복제본이 같은 목록이다. ✖ `모듈 공유` (한 대에 단 모듈이 다른 복제본에도 보임), ✖ `견본 오염` (견본에도 생겨 다음 복제본이 모듈을 달고 나옴). 피해는 그 드론에만 들어가 "값은 복사, 참조는 공유" 가 한 화면에서 대비돼야 한다. 버그 판정은 Target 이 같은 입력을 받는 정상 코어와 비교해서 한다.
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): 복제 셋 → 셋째에 모듈 → 첫째에 피해 → 하나 더 복제 (나쁜 예에서는 새 복제본이 이미 모듈을 달고 나온다). 두 번째: 견본 개조 뒤 복제 (이후 복제본만 빨라지고 이미 나간 것은 그대로 = 견본과 복제본이 독립. 두 모드 모두 같다는 것을 note 에 적는다). 세 번째: `values` 로 `maxClones` 를 줄여 가득 찬 뒤의 복제를 받지 않음.
- **조절 값**: `maxClones` (int), `damageAmount` (int), 그 밖에 화면에 눈에 띄는 차이를 만드는 값이 있으면 하나 더. 모두 Unity 어댑터의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 받침대(`box`) 위 견본은 `actor` (`role: 'neutral'`, 라벨 `견본`), 복제본은 `actor` (`role: 'neutral'`, `scale` 0.8 안팎, 라벨 `#1`~), 머리 위 HP `bar`, 모듈은 드론 아래 작은 `box` (라벨 `냉각`). 정상에서는 드론마다 자기 모듈 상자. 나쁜 예에서는 공유 목록을 **상자 하나**로 그리고 견본과 모든 복제본에서 그 상자로 `arrow` 를 그어 같은 객체를 가리킨다는 것이 보이게 한다. 왼쪽 위에 복제 수와 `Modules` 참조가 몇 대에서 같은지 (예 `Modules 공유: 5대`).
- **구조 그림**: DroneHangar(어댑터) → Hangar → ScoutDrone(견본, `kind: 'object'`) —Clone()→ ScoutDrone(복제본, `object`), 그리고 각 드론 → 자기 `List<string>` 노드. 나쁜 예 구조 그림은 견본과 복제본이 **같은** List 노드를 가리키는 모양. 단계: 1 견본을 한 번 다 설정해 둔다, 2 `Clone` 이 `MemberwiseClone` 으로 값 필드를 복사한다, 3 참조 필드(`Modules`)는 새 목록으로 만든다, 4 복제본을 고쳐도 견본과 다른 복제본은 그대로다.
- **Unity 어댑터 (Unity/)**: `DroneHangar : MonoBehaviour` 가 InputAction 넷(`Reset` 에서 C, M, D, U 등)을 코어에 넘기고, 복제가 생기면 `[SerializeField]` 프리팹을 `Instantiate` 해 코어 드론과 짝짓고, 모듈·HP 변화는 이벤트 핸들러에서 바로 화면에 옮긴다. `Instantiate` 자체가 엔진의 프로토타입(프리팹 복제)이라는 것과, 장면에 있던 (이미 다친) 오브젝트를 복제하면 다친 채 나온다는 것을 글에 적는다.
- **글**: 증상 "드론 한 대에 모듈을 달았더니 모든 드론과 견본에 붙었다" 에서 시작한다. 값 형식과 참조 형식(스택·힙)의 차이를 한 단락으로 잇는다. `mistakes` 후보: `var copy = template;` 참조 대입, `ScriptableObject` 견본을 런타임에 고쳐 Play 를 끈 뒤에도 에셋이 바뀜, 장면의 다친 오브젝트를 `Instantiate`, 깊은 복사 과잉 (공유해야 할 소유자·표적까지 복제), 같은 형식 인자가 많은 생성자에서 순서가 바뀜 (견본 복제가 이것을 피하는 방법이기도 하다). `references`: https://gameprogrammingpatterns.com/prototype.html (Nystrom: Prototype), https://learn.microsoft.com/en-us/dotnet/api/system.object.memberwiseclone (Microsoft `Object.MemberwiseClone`), https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/reference-types (Microsoft 참조 형식). `related`: `command-undo-replay` (이전 위치를 값으로 저장해 되돌림. 값 복사가 왜 안전한지).
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**(`state-player-actions`, `observer-health-events`, `command-undo-replay`)만 쓴다 (묶음 2 의 다른 표본은 아직 없어 링크가 깨진다). 교안 연계: Jay 의 강의 교안 같은 장의 강조점을 글에 녹이되 교안을 출처로 링크하지 않는다 (공개되지 않은 자료).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs prototype-drone-clone` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check prototype-drone-clone`, `node tools/gallery.mjs unity-compile prototype-drone-clone` 통과.
3. `node tools/gallery.mjs live prototype-drone-clone --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
