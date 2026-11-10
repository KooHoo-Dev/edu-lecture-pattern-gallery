---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 12
verify:
  - node tools/truth.mjs memento-checkpoint
  - node tools/gallery.mjs check memento-checkpoint
  - node tools/gallery.mjs unity-compile memento-checkpoint
  - node tools/gallery.mjs thumbs memento-checkpoint
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)", "Bash(grep *)", "Bash(cat *)", "Bash(head *)"]
writePaths:
  - unity/memento-checkpoint/**
  - truth/memento-checkpoint/**
  - src/specimens/memento-checkpoint/**
  - src/shots/memento-checkpoint/**
allowProfiles: [org, sub]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: memento-checkpoint

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전). 작업 트리에는 처음에 `node_modules` 가 없다. `node tools/gallery.mjs` 를 인자 없이 한 번 부르면 메인 폴더의 것이 정션으로 이어지니, 그 뒤 Read 도구로 연다 (셸로 상위 폴더를 뒤지지 않는다. 막혀 있다).
3. 기준 샘플 `observer-health-events` 의 파일 전부 (`unity/observer-health-events/`, `truth/observer-health-events/Target.cs`, `src/specimens/observer-health-events/`). 시간이 없는 코어와, 나쁜 예를 입력마다 상태 비교로 기록하는 방식의 본보기다. 나쁜 예의 어긋남을 "있어야 할 결과" 코어와 비교해 찾는 방식은 `command-undo-replay` 의 Target 을, 공유 참조를 그리는 방식은 `prototype-drone-clone` 의 sim 을 참고한다.
4. `docs/selection.md` 의 `memento-checkpoint` 카드.

## 표본별

- ID `memento-checkpoint`, namespace `PatternGallery.MementoCheckpoint`. 제목 `메멘토: 체크포인트 저장과 되살리기`, 그룹 C, 순서 2, 난이도 2, `pattern: '메멘토 패턴'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 탐사대장 하린의 상태: HP, 위치(칸 번호), 인벤토리(아이템 이름 목록), 크레딧. 체크포인트에서 저장하고, 쓰러지면 마지막 체크포인트로 되살린다. 저장 칸은 하나 (선택: 둘 이상이면 글에 적는다).
- **입력과 키**: `save` 체크포인트 저장, `pickup` 회로 조각 줍기 (인벤토리 + 크레딧), `hurt` 피해, `restore` 쓰러져 되살리기 (또는 HP 0 이면 자동, 어느 쪽이든 글과 맞게), 그리고 화면 차이가 나면 `walk` 한 칸 이동. `keys` 는 `KeyQ`, `KeyW`, `KeyE`, `KeyR` (넷째 입력이 있으면 `KeyT`).
- **코어 (Core/)**: 원래 객체 `Explorer` 가 `CreateMemento()` 로 지금 상태를 **값으로 뜬** 메멘토(`ExplorerMemento`, 인벤토리는 새 목록이나 읽기 전용 배열로 복사)를 만들고 `Restore(memento)` 로 덮는다. 메멘토의 속은 바깥에서 고칠 수 없다 (읽기 전용 또는 `internal`). 보관하는 쪽 `Checkpoint` (관리자)는 메멘토를 들고만 있고 속을 보지 않는다. 일어난 일은 C# event.
- **나쁜 예 (Naive/)**: 저장할 때 HP·위치·크레딧은 값으로 담지만 **인벤토리는 목록을 참조째** 담는 흔한 코드 (`saved.items = player.items;`). ✖ `인벤토리 안 돌아옴` (되살렸는데 저장 뒤 주운 조각이 그대로, 크레딧은 돌아옴 — 값과 참조의 대비가 한 화면에). 둘째 ✖ 가 자연스러우면: 바깥(UI 코드)이 저장본의 필드를 직접 고쳐 저장본이 바뀌는 것 (캡슐화가 없어서) 중 하나. 문제 줄에 `// [!]`. 자동 데모에 나와야 한다.
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): 줍기 → 저장 → 줍기 둘 → 피해 → 되살리기 (나쁜 예 ✖). 두 번째: 저장 없이 되살리기 (패턴은 처음 상태로, 또는 거절 이벤트. 글과 맞게). 세 번째: 조절 값을 바꾼 경로.
- **조절 값**: 화면 차이가 큰 것 2~3개 (예: `fragmentValue`, `hurtDamage`, 시작 HP). 모두 Unity 연결 컴포넌트의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 하린 `actor` (`role: 'ally'`) 와 체크포인트 깃발(`box`), 위쪽에 두 상자: `지금 상태` 와 `저장본(메멘토)`. 각 상자 안에 HP·크레딧 숫자와 인벤토리 칸들. 나쁜 예는 두 상자의 인벤토리가 **같은 목록**을 가리키는 것(상자 하나에서 두 쪽으로 `arrow`, `prototype-drone-clone` 처럼)과, 되살린 뒤 "저장 뒤 주운 조각이 그대로" 가 이어서 보여야 한다.
- **구조 그림**: CheckpointInput(연결 컴포넌트) → Checkpoint (관리자) → ExplorerMemento (`object`), Explorer → ExplorerMemento (`CreateMemento`/`Restore`). 나쁜 예 구조 그림은 저장본과 플레이어가 같은 인벤토리 목록 노드를 가리키는 모양. 단계: 1 저장할 때 원래 객체가 자기 상태를 값으로 떠 메멘토를 만든다, 2 관리자는 메멘토를 들고만 있다, 3 되살릴 때 원래 객체가 메멘토의 값으로 자기를 덮는다, 4 저장 뒤 바뀐 것은 메멘토에 닿지 않는다.
- **Unity 연결 컴포넌트 (Unity/)**: `CheckpointInput : MonoBehaviour` 가 InputAction 으로 코어를 부르고 화면을 이벤트 핸들러에서 갱신. 메멘토를 `[Serializable]` 로 두면 `JsonUtility.ToJson` 으로 파일에 저장할 수 있다는 것을 글이나 adaptIdeas 에 (실제 파일 저장 코드를 넣는다면 `Application.persistentDataPath`. 넣지 않으면 단정하지 않는다).
- **글**: 증상 "체크포인트에서 되살렸는데 인벤토리는 죽기 직전 그대로다" 에서 시작한다. 프로토타입(얕은 복사)과 명령(이전 상태 저장)과의 관계를 한 문장. `mistakes` 후보: 목록을 참조째 저장, 저장본을 바깥에서 고침, 저장할 필요 없는 것(참조 중인 씬 오브젝트)까지 저장, 되살릴 때 이벤트를 안 내 UI 가 옛 값, 저장 칸을 덮어써 되돌릴 곳이 없음. `references`: https://refactoring.guru/design-patterns/memento (Refactoring Guru: Memento), https://docs.unity3d.com/6000.3/Documentation/ScriptReference/JsonUtility.html (Unity `JsonUtility`). `related`: `prototype-drone-clone`, `command-undo-replay`.
- **묶음 2~5 리뷰에서 반복된 지적을 미리 피한다** (가이드 2~7절을 먼저 읽는다): (1) `unity.setup`·`unity.pitfalls`·`mistakes`·Tooltip 의 모든 문장이 **이 표본의 Unity/ 코드**에서 실제로 그런지 하나씩 대조한다. 매뉴얼에 없는 Unity 내부 동작은 단정하지 않는다. (2) 효과 끄기에서 수강생이 자동 데모와 다른 순서로 눌러도 offNote 의 원인 설명이 맞는지 본다. (3) 시나리오 note 의 시각은 기록(`truth/<id>/*.log`)의 숫자와 같게 쓴다. (4) 정지 화면에서도 버그가 보이게 버그 상태가 이어지는 동안 남는 표시를 둔다. 한 프레임처럼 작은 어긋남은 숫자로, 같은 프레임에 사라지는 상태는 0.3~0.5초 남겨 그린다. (5) 막대 기준은 조절 값으로 계산하지 않는다. 조절 값 최소·최대, 프리셋, 나중 시나리오의 효과 켬·끔에서 글·그림이 겹치거나 잘리지 않는지 `live` 로 본다 (`p.<key>=`, `preset=`, `scenario=` 주소 인자, 가이드 7절). (6) `unity.setup` 단계끼리 모순이 없고 적힌 대로 놓으면 카메라에 모두 보인다. (7) Unity/ 코드에도 종류마다 복붙한 코드를 남기지 않는다. 인터페이스 형식의 `[SerializeField]` 칸은 Inspector 에 보이지 않는다. (8) 같은 대상(한 번씩 일어나는 일)의 같은 ✖ 는 버그 상태가 이어지는 동안 한 번, 앞 버그의 결과는 다른 이름이나 일반 사건 줄로, 패턴도 같은 증상이면 ✖ 없음 (가이드 4절). (9) `// [n]` 은 코드 줄 끝에 (주석만 있는 줄은 검사가 잡는다). `// [!]` 설명은 한 줄 안팎. 빠진 코드가 원인이면 주석만 있는 `// [!]` 줄. (10) Core 는 수강생이 복사하는 원본이다: 처리 중 재진입(핸들러가 다시 부름), 같은 프레임에 생기고 사라짐 같은 가장자리도 맞게.
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**만 쓴다 (`src/specimens/` 아래 폴더. 묶음 6 의 다른 표본은 아직 없어 링크가 깨진다).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs memento-checkpoint` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check memento-checkpoint`, `node tools/gallery.mjs unity-compile memento-checkpoint` 통과.
3. `node tools/gallery.mjs live memento-checkpoint --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
