---
# 표본 구현 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 10
verify:
  - node tools/truth.mjs event-queue-sound
  - node tools/gallery.mjs check event-queue-sound
  - node tools/gallery.mjs unity-compile event-queue-sound
  - node tools/gallery.mjs thumbs event-queue-sound
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)", "Bash(grep *)", "Bash(cat *)", "Bash(head *)"]
writePaths:
  - unity/event-queue-sound/**
  - truth/event-queue-sound/**
  - src/specimens/event-queue-sound/**
  - src/shots/event-queue-sound/**
allowProfiles: [org]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 구현: event-queue-sound

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 `@koohoo/gallery-kit`)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체. 규격과 절차는 이 문서를 따른다.
2. `node_modules/@koohoo/gallery-kit/docs/kit-guide.md` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전). 작업 트리에는 처음에 `node_modules` 가 없다. `node tools/gallery.mjs` 를 인자 없이 한 번 부르면 메인 폴더의 것이 정션으로 이어지니, 그 뒤 Read 도구로 연다 (셸로 상위 폴더를 뒤지지 않는다. 막혀 있다).
3. 기준 샘플 `state-player-actions` 의 파일 전부 (`unity/state-player-actions/`, `truth/state-player-actions/Target.cs`, `src/specimens/state-player-actions/`). 시간이 흐르는 코어(`Tick`)와 float 계산을 맞춘 sim 의 본보기다 (채널이 시간이 지나야 빈다). 일어난 일을 C# event 로 알리고 구독자가 반응하는 모양은 `observer-health-events` 를 참고한다 (이 표본은 그 다음 편: 바로 부르지 않고 큐에 모았다가 나중에 처리한다).
4. `docs/selection.md` 의 `event-queue-sound` 카드.

## 표본별

- ID `event-queue-sound`, namespace `PatternGallery.EventQueueSound`. 제목 `이벤트 큐: 효과음 요청 모으기`, 그룹 B, 순서 2, 난이도 2, `pattern: '이벤트 큐'`.
- 제목, 그룹, 순서, 한 줄 설명은 `src/registry.ts` 의 PLANNED 항목과 같게 한다.
- **상황**: 정비 기지 앞에 잔해 드론 여럿(처음 5대 안팎)이 줄지어 있다. 포탑이 단발로 맨 앞 드론을, 일제 사격으로 살아 있는 드론 모두를 **같은 프레임에** 파괴한다. 드론이 파괴될 때마다 폭발음, 마지막 드론이 파괴되면 웨이브 끝 알림음을 요청한다. 기지 스피커는 채널이 `maxVoices` 개 (AudioSource 풀)이고, 소리 하나는 `soundLength` 초 동안 채널을 쓴다. 새 웨이브 입력으로 드론이 다시 선다.
- **입력과 키**: `shot` 단발, `volley` 일제 사격, `wave` 새 웨이브. `keys` 는 `KeyQ`, `KeyW`, `KeyE`.
- **코어 (Core/)**: `SoundQueue` 가 요청(`SoundRequest`: 소리 id, 음량)을 **고정 크기 링 버퍼**(`queueSize`, Nystrom 의 head/tail)에 모은다. `Request(id, volume)` 는 큐에 넣기만 한다: 같은 id 가 이미 대기 중이면 합치고(큰 음량을 남김) `Merged` 를 알린다. 큐가 꽉 차면 `Dropped` 를 알린다 (기본 크기는 자동 데모에서 넘치지 않게). 재생은 `Tick(dt)` 에서만: 채널의 남은 시간을 줄이고, 빈 채널마다 큐 앞에서 하나씩 꺼내 `Played(channel, id, volume)` 을 알린다. 빈 채널이 없으면 요청은 큐에 남아 다음 프레임을 기다린다. `Request` 안에서 재생하지 않는다 (재진입이 없고, 같은 프레임의 요청을 모두 모은 뒤 처리한다). 드론과 웨이브는 별도의 작은 코어(`DroneLine` 등)이고, 드론 파괴 이벤트를 받은 쪽이 `Request` 를 부른다. 음량 미터는 지금 울리는 채널 음량의 합.
- **나쁜 예 (Naive/)**: 요청 즉시 빈 채널을 찾아 재생하는 흔한 사운드 매니저 (`foreach (var s in sources) if (!s.isPlaying) { … Play(); return; }` 를 순수 C# 로 흉내. 실제로는 MonoBehaviour 라는 것을 머리 주석에). 드론 파괴 처리 안에서 바로 `Play` 를 부른다. 일제 사격 한 번에 폭발음이 같은 프레임에 채널을 모두 채워 ✖ `소리 겹침` (같은 소리 n 겹, 음량 합이 기준 1.0 을 넘음), 빈 채널이 없으면 그냥 버려 웨이브 끝 알림이 사라지는 ✖ `알림 잘림`. 함께 버려진 폭발음은 ✖ 가 아닌 사건 줄로 (같은 원인). 문제 줄에 `// [!]`. 두 ✖ 모두 자동 데모에 나와야 한다.
- **시나리오**: 첫 번째(자동 데모, 6초 안팎): `shot` (폭발음 하나, 두 모드 같음) → 그 소리가 끝난 뒤 `volley` (남은 드론 모두와 웨이브 끝 알림이 한 프레임에. 나쁜 예 ✖ 둘) → `wave` → `shot` 정도. 두 번째: `shot` 만 간격을 두고 여러 번 (요청이 몰리지 않으면 두 모드가 같다는 것을 note 에). 세 번째: `values` 로 `maxVoices` 를 줄이거나 채널이 아직 차 있을 때 `volley` 를 넣어, 패턴 쪽 알림이 **늦게라도 나오는** 경로 (큐가 기다린다).
- **조절 값**: `maxVoices`, `soundLength`, `explosionVolume` (미터가 넘는지가 보이는 값). 음량 미터의 기준선은 고정 1.0 (조절 값으로 계산하지 않는다). 기본값에서 패턴 쪽 미터가 1.0 을 넘지 않게 고른다 (예: 폭발 0.5, 알림 0.4). 모두 Unity 어댑터의 `[SerializeField]` 필드와 이름이 같다.
- **무대 그림**: 왼쪽 포탑(`box`), 오른쪽 드론 줄 (`actor` `role: 'enemy'`, 파괴되면 `pose: 'down'` 이나 사라짐), 사격은 `arrow`. 화면 위쪽에 **스피커 채널** `maxVoices` 칸: 칸마다 지금 울리는 소리 이름과 남은 시간 `bar`. 그 옆에 **대기 큐** 칸들 (합쳐진 요청은 `폭발 ×5` 처럼). 음량 미터 `bar` 와 기준선 1.0. 왼쪽 위에 `대기 n · 합침 n · 버림 n`. 나쁜 예는 큐 칸 대신 `바로 재생` 이라고 쓰고, 같은 소리가 여러 채널을 차지한 것, 미터가 기준선을 넘은 것, 버려진 알림(`웨이브 끝 알림 버림`, 빨강)이 이어서 보여야 한다 (가이드 4절).
- **구조 그림**: 드론 파괴 쪽(예: DroneLine) → SoundQueue (`call`, 라벨 `Request`), SoundQueue → 채널 (Tick 에서 꺼내 재생), SoundQueuePlayer(어댑터) → SoundQueue (`Tick` 호출과 `Played` 구독). 나쁜 예 구조 그림은 드론 파괴 → SoundManager → AudioSource 들 (바로 재생). 단계: 1 드론 파괴 처리는 소리를 요청만 하고 바로 돌아간다, 2 같은 소리가 이미 대기 중이면 합친다, 3 다음 Tick 에 빈 채널마다 큐 앞에서 하나씩 꺼내 튼다, 4 빈 채널이 없으면 큐에서 기다린다 (버리지 않는다).
- **Unity 어댑터 (Unity/)**: `SoundQueuePlayer : MonoBehaviour` 가 코어 `SoundQueue` 를 들고 (`??=`), `Update` 에서 `Tick(Time.deltaTime)`, `Played` 핸들러에서 그 채널의 AudioSource 에 클립과 음량을 넣고 `Play()`. 소리 id → AudioClip 은 `[SerializeField]` 칸 (폭발, 알림. 종류마다 복붙하지 않게 배열이나 작은 표로). 채널 AudioSource 는 `maxVoices` 개 (`Awake` 에서 `AddComponent<AudioSource>()` 로 만들거나 칸으로 받는다. 어느 쪽인지 `unity.setup` 과 맞춘다). 드론과 사격 입력은 확인용 `DroneLineInput` (InputAction 셋). AudioSource 의 클립 칸은 Unity 6.3 Inspector 에서 `Audio Generator` (가이드 6절). Unity 자체에도 동시에 실제로 울리는 소리 수 한도(Project Settings > Audio 의 `Max Real Voices`, 매 프레임 큰 소리부터 고른다)가 있다는 것을 pitfalls 에 한 줄 (이 표본의 채널 수는 우리가 정한 풀 크기다). 기본값 숫자는 적지 않는다 (매뉴얼에 없다).
- **글**: 증상 "일제 사격 한 번에 폭발음이 한꺼번에 터져 귀가 아프고, 웨이브 끝 알림은 들리지 않는다" 에서 시작한다. 관찰자(바로 부름)와 이벤트 큐(요청과 처리를 시간으로 떼어 놓음)의 차이, 소리가 한 프레임 늦게 나는 것은 의도라는 것을 한 문장씩. `mistakes` 후보: `Request` 안에서 바로 재생 (큐가 아니다), 큐를 처리하다 들어온 새 요청을 같은 프레임에 또 처리 (재진입, 끝없는 반복), 큐 크기 제한이 없음, 요청에 곧 파괴될 객체 참조를 넣음 (값으로 넣는다: 소리 id, 위치), 같은 소리 합치기를 빼먹음, 채널이 없을 때 조용히 버림. `references`: https://gameprogrammingpatterns.com/event-queue.html (Nystrom: Event Queue), https://docs.unity3d.com/6000.3/Documentation/ScriptReference/AudioSource.PlayOneShot.html (Unity `AudioSource.PlayOneShot`: 앞 소리를 끊지 않고 겹친다), https://docs.unity3d.com/6000.3/Documentation/Manual/class-AudioManager.html (Unity Audio 프로젝트 설정: Max Real Voices). `related`: `observer-health-events` (바로 부르는 알림의 다음 편), `object-pool-projectiles` (AudioSource 풀도 오브젝트 풀이다).
- **묶음 2·3 리뷰에서 반복된 지적을 미리 피한다**: (1) `unity.setup`·`unity.pitfalls`·`mistakes`·Tooltip 의 모든 문장이 **이 표본의 Unity/ 코드**에서 실제로 그런지 하나씩 대조한다 (일반론이 이 코드에서는 안 일어나면 그렇게 쓴다). (2) 효과 끄기에서 수강생이 자동 데모와 다른 순서로 눌러도 offNote 의 원인 설명이 맞는지 본다. (3) 시나리오 note 의 시각은 기록(`truth/<id>/*.log`)의 숫자와 같게 쓴다. (4) 정지 화면에서도 버그가 보이게, 버그 상태가 이어지는 동안 남는 표시를 둔다. (5) 막대 기준은 조절 값으로 계산하지 않는다. (6) `unity.setup` 단계끼리 모순이 없고, 적힌 대로 놓으면 카메라에 모두 보인다 (위치·카메라 값을 적는다). (7) Unity/ 코드에도 종류마다 복붙한 코드를 남기지 않는다 (패턴 표본의 Unity 쪽이 나쁜 예 모양이면 안 된다). (8) 같은 대상의 같은 ✖ 는 한 번, 앞 버그의 결과로 생긴 증상은 다른 이름이나 ✖ 가 아닌 사건 줄로 (가이드 4절).
- **글**: 증상에서 시작한다. `inspiredBy` 는 비운다 (범용 기법). `references` 는 표본마다 적은 URL 만 쓴다 (구독 세션이 열어 확인했다. 다른 URL 을 더하지 않는다). `related` 의 같은 갤러리 표본은 **이미 있는 표본**만 쓴다 (`state-player-actions`, `observer-health-events`, `command-undo-replay`, `strategy-turret-targeting`, `decorator-stat-buffs`, `prototype-drone-clone`, `singleton-scene-managers`, `state-drone-ai`, `object-pool-projectiles`, `factory-drone-spawner`, `facade-hit-resolution`. 묶음 4 의 다른 표본은 아직 없어 링크가 깨진다). Jay 의 강의 교안 같은 장의 강조점을 글에 녹이되 교안을 출처로 링크하지 않는다 (공개되지 않은 자료).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 특히 `src/stage`, `src/ai.ts`, `src/gallery.config.tsx`, `src/registry.ts`, `tools`, `truth/Runner`, `docs`, 다른 표본.
- 무대(`src/stage`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. `node tools/truth.mjs event-queue-sound` 가 모든 시나리오에서 "같다".
2. `node tools/gallery.mjs check event-queue-sound`, `node tools/gallery.mjs unity-compile event-queue-sound` 통과.
3. `node tools/gallery.mjs live event-queue-sound --query="auto=1&t=<초>" wait:600 stage:<이름>` 으로 최종, `&off=1`, `&step=N` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
