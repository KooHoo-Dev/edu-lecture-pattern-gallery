---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 12
verify:
  - node tools/truth.mjs service-locator-audio
  - node tools/gallery.mjs check service-locator-audio
  - node tools/gallery.mjs unity-compile service-locator-audio
  - node tools/gallery.mjs thumbs service-locator-audio
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)", "Bash(grep *)", "Bash(cat *)", "Bash(head *)"]
writePaths:
  - unity/service-locator-audio/**
  - truth/service-locator-audio/**
  - src/specimens/service-locator-audio/**
  - src/shots/service-locator-audio/**
allowProfiles: [sub]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: service-locator-audio

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전). 작업 트리에는 처음에 `node_modules` 가 없다. `node tools/gallery.mjs` 를 인자 없이 한 번 부르면 메인 폴더의 것이 정션으로 이어지니, 그 뒤 Read 도구로 연다 (셸로 상위 폴더를 뒤지지 않는다. 막혀 있다).
3. 기준 샘플 `observer-health-events` 의 파일 전부 (`unity/observer-health-events/`, `truth/observer-health-events/Target.cs`, `src/specimens/observer-health-events/`). 시간이 없는 코어와, Unity 만의 동작(없는 컴포넌트를 부르는 예외)을 표시 필드로 흉내 내는 본보기다. 싱글턴의 씬 흉내와 예외 조건 규칙은 `singleton-scene-managers` 를, 같은 소리 서비스 주제는 `event-queue-sound` 를 참고한다.
4. `docs/selection.md` 의 `service-locator-audio` 카드.

## 표본별

- ID `service-locator-audio`, namespace `PatternGallery.ServiceLocatorAudio`. 제목 `서비스 로케이터: 소리 서비스와 널 객체`, 그룹 B, 순서 3, 난이도 2, `pattern: '서비스 로케이터'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 정비 기지. 게임 코드 세 곳이 소리를 낸다: 포탑 발사 (탄약 −1, 발사음), 드론 파괴 (파괴음, 크레딧 `+reward`), 정비 완료 (완료음, 수리 키트 −1). 소리 서비스는 씬에 따라 없을 수 있다 (소리를 뺀 테스트 씬, 소리 끔 설정).
- **입력과 키**: `fire`, `destroy`, `repair`, `toggleAudio` (소리 서비스 빼기/넣기. 이름은 두 모드 모두 맞게 "소리 서비스 빼기·넣기"). `keys` 는 `KeyQ`, `KeyW`, `KeyE`, `KeyR`.
- **코어 (Core/)**: `IAudioService { void Play(string clip); }`, 실제 서비스 `AudioService` (재생 기록을 이벤트로), **널 객체** `NullAudioService` (아무것도 하지 않음), 로케이터 `Services` (`static IAudioService Audio` — 등록이 없으면 늘 `NullAudioService`, `Provide(IAudioService s)` 에 null 을 주면 널 객체로). 게임 코드(`Turret`, `DroneField`, `RepairBay` 등)는 `Services.Audio.Play(...)` 만 부른다. 로케이터가 static 이므로 하네스·Unity 의 시작마다 초기화하는 메서드를 둔다 (도메인 리로드를 끈 에디터 대비, `singleton-scene-managers` 의 글 참고). 일어난 일은 C# event.
- **나쁜 예 (Naive/)**: `AudioManager.Instance.Play(...)` 를 곳곳에서 직접 부르는 흔한 코드. 처음에 예외가 나서 발사 쪽에만 `if (AudioManager.Instance != null)` 을 넣었고, 파괴 쪽은 빠뜨렸다. 소리 서비스가 없을 때 드론 파괴가 `NullReferenceException` 으로 멈춰 그 아래 크레딧 지급 줄이 실행되지 않는다 ✖ `NullReferenceException` (Unity 의 진짜 null 이므로 흉내 조건은 간단하다. 예외 뒤 줄이 실행되지 않음을 표시 필드로 흉내 내고 파일 머리 주석에 적는다). 정비 완료 쪽도 검사가 없다면 대상(정비)마다 한 번씩 (가이드 4절). 문제 줄에 `// [!]`. 자동 데모에 나와야 한다.
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): 발사 → 파괴 → 소리 서비스 빼기 → 발사 (두 모드 모두 조용히 넘어감) → 파괴 (나쁜 예 ✖, 크레딧 안 들어옴) → 소리 서비스 넣기 → 파괴. 두 번째: 정비 완료 경로. 세 번째: 조절 값을 바꾼 경로.
- **조절 값**: `reward`, 그 밖에 화면 차이가 큰 것 (예: `startAmmo`). 모두 Unity 연결 컴포넌트의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 왼쪽 포탑, 오른쪽 드론 몇 대, 아래 정비대. 위쪽에 **서비스 자리** 상자: `Services.Audio → AudioService` 또는 `→ NullAudioService (무음)`. 소리가 나면 소리를 낸 곳에 `ring` 과 `♪ 발사음` 글. 왼쪽 위에 탄약·크레딧·수리 키트. 나쁜 예는 `AudioManager.Instance → null` 과, 예외로 멈춘 뒤 "크레딧 +10 안 들어옴" 이 이어서 보여야 한다.
- **구조 그림**: 게임 코드 (Turret · DroneField · RepairBay 한 노드로 묶어도 됨) → Services (로케이터) → IAudioService(`interface`) ← AudioService · NullAudioService, 그리고 AudioServiceHost(연결 컴포넌트) → Services (`Provide`). 나쁜 예 구조 그림은 세 게임 코드가 `AudioManager.Instance` 를 직접 부르고 일부만 null 검사를 하는 모양. 단계: 1 연결 컴포넌트가 켜질 때 실제 서비스를 등록한다, 2 게임 코드는 로케이터에서 서비스를 찾아 부르기만 한다, 3 등록이 없으면 널 객체가 대신해 아무 일도 하지 않는다, 4 그래서 소리가 없어도 그 아래 줄(크레딧 지급)이 그대로 돈다.
- **Unity 연결 컴포넌트 (Unity/)**: `AudioServiceHost : MonoBehaviour` 가 `OnEnable` 에서 `Services.Provide(this 의 서비스)`, `OnDisable` 에서 자기가 등록한 것일 때만 `Provide(null)`. 실제 서비스는 `AudioSource.PlayOneShot` 으로 클립 이름 → `AudioClip` 목록에서 찾아 재생 (이름 조회 실패는 `LogError` 와 무음, 가이드 3절). 입력은 InputAction (`Reset` 에서 기본 키). AudioSource 칸 이름은 6000.3 의 `Audio Generator` (가이드 6절). static 초기화는 `[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]` 를 **제네릭이 아닌** 클래스에.
- **글**: 증상 "소리 매니저를 뺀 테스트 씬에서 드론을 잡았는데 크레딧이 안 들어온다" 에서 시작한다. 싱글턴 표본과의 차이(누가 서비스를 정하나, 바꿔 끼우기, 없을 때의 기본값)를 한 문장으로 잇고, 서비스 로케이터도 결국 전역 접근이라 의존이 숨는다는 단점을 정직하게 쓴다 (생성자·칸으로 넘겨받는 의존성 주입이 더 분명한 경우). `mistakes` 후보: null 검사를 곳곳에 흩음, 널 객체가 아니라 null 을 등록, 등록 해제를 잊어 파괴된 서비스가 남음, 다른 오브젝트가 등록한 것을 내가 지움, 도메인 리로드를 끈 에디터에서 static 이 지난 실행의 서비스를 들고 있음. `references`: https://gameprogrammingpatterns.com/service-locator.html (Nystrom: Service Locator). `related`: `singleton-scene-managers` (싱글턴의 대안), `event-queue-sound` (같은 소리 서비스 뒤에 큐를 둘 수 있다).
- **묶음 2~4 리뷰에서 반복된 지적을 미리 피한다** (가이드 2~7절을 먼저 읽는다): (1) `unity.setup`·`unity.pitfalls`·`mistakes`·Tooltip 의 모든 문장이 **이 표본의 Unity/ 코드**에서 실제로 그런지 하나씩 대조한다. (2) 효과 끄기에서 수강생이 자동 데모와 다른 순서로 눌러도 offNote 의 원인 설명이 맞는지 본다. (3) 시나리오 note 의 시각은 기록(`truth/<id>/*.log`)의 숫자와 같게 쓴다. (4) 정지 화면에서도 버그가 보이게, 버그 상태가 이어지는 동안 남는 표시를 둔다. 미니 월드의 ✖ 표시는 기록과 같은 판정이다. (5) 막대 기준은 조절 값으로 계산하지 않는다. 조절 값 최소·최대와 프리셋마다 글·그림이 겹치지 않는지 `live` 로 본다 (`p.<key>=` , `preset=` 주소 인자, 가이드 7절). (6) `unity.setup` 단계끼리 모순이 없고, 적힌 대로 놓으면 카메라에 모두 보인다 (위치·카메라 값을 적는다). (7) Unity/ 코드에도 종류마다 복붙한 코드를 남기지 않는다. (8) 같은 대상의 같은 ✖ 는 한 번, 앞 버그의 결과로 생긴 증상은 다른 이름이나 ✖ 가 아닌 사건 줄로. 패턴도 같은 증상이면 ✖ 를 달지 않는다 (가이드 4절). (9) `// [!]` 설명은 한 줄 안팎 (무대 문제 줄 칸에 보인다). 빠진 코드가 원인이면 주석만 있는 `// [!]` 줄을 둔다.
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**만 쓴다 (`src/specimens/` 아래 폴더. 묶음 5 의 다른 표본은 아직 없어 링크가 깨진다). Jay 의 강의 교안 내용을 글에 녹일 수 있으나 교안을 출처로 링크하지 않는다 (공개되지 않은 자료).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs service-locator-audio` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check service-locator-audio`, `node tools/gallery.mjs unity-compile service-locator-audio` 통과.
3. `node tools/gallery.mjs live service-locator-audio --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
