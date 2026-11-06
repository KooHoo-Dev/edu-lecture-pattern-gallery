---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 6
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

# 표본 수정: event-queue-sound

Pattern Gallery 의 표본 `event-queue-sound` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/event-queue-sound/`, `truth/event-queue-sound/`, `src/specimens/event-queue-sound/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **나쁜 예의 `소리 겹침` 원인 줄과 ✖ 판정이 패턴이 실제로 고치는 범위와 어긋난다.** `Naive/NaiveSoundManager.cs` 의 `if (!s.isPlaying) // [!] 같은 소리가 이미 울리는지 보지 않는다` 는 코어 `SoundQueue.cs` 의 `if (c.IsPlaying) continue; // [4]` 와 같은 로직이라 "문제 줄" 과 4단계 코드 줄이 같은 코드로 보이고, 코어도 이미 울리는 소리와는 합치지 않는다. 또 `CheckOverlap` (Target.cs, sim.ts)이 입력·Tick 마다 지금 울리는 소리를 모두 세서, 효과 끄기에서 Q 를 0.8초 안에 세 번 누르면 `✖ 소리 겹침` 이 뜨는데 효과 켜기에서도 같은 입력이면 채널 셋에 폭발이 울리고 미터가 빨갛다 (패턴이 고치지 않는 증상에 ✖). 고친다: (1) `[!]` 를 `s.Play();` 줄로 옮기고 설명을 "모으지 않고 부르는 즉시 튼다: 같은 프레임의 같은 소리를 합칠 곳이 없다" 로. (2) `CheckOverlap` 은 **이번 입력에서 함께 시작한** 같은 소리가 2개 이상이고 합이 1.0 을 넘을 때만 ✖ (Tick 쪽은 표시를 끄는 데만). sim `view` 의 빨간 테두리와 "같은 폭발 n겹" 도 같은 기준. (3) offNote 와 `naiveDiagram` 의 "이미 울리는지 보지 않고" 문구, offNote 의 "연타해도 같은 일" 문장, `two-voices-wait` note 를 맞춘다 (연타는 알림 잘림만 나쁜 예의 버그이고 겹침은 두 모드가 같다). `node tools/truth.mjs event-queue-sound` 로 기록을 다시 만든다.
2. **`mistakes[0]` 이 두 증상을 섞었고 해법이 `mistakes[4]` 와 부딪친다.** 연타 겹침 단서가 "Request 안에서 바로 재생" 항목에 묻혀 있고, 해법 "같은 id 가 울리는 채널 수를 보고 기다리게" 는 늦은 폭발을 만드는데 `mistakes[4]` 가 바로 그것을 경고한다. 연타 겹침을 별도 항목으로 빼고 해법을 "같은 id 가 최근 몇 초 안에 시작됐으면 그 요청은 버리거나 그 채널에 합친다 (폭발은 늦으면 의미가 없다)" 로.
3. **offNote 가 증상이 아니라 코드 설명으로 시작하고 Unity 에서 들리는 모습이 없다** (가이드 6절). 첫 문장을 "Unity 에서는 일제 사격 한 번에 같은 폭발 클립 넷이 같은 순간 시작돼 한 소리가 네 배로 커져 찢어지듯 들리고, 웨이브 끝 알림은 들리지 않는다" 처럼.
4. **`Unity/SoundQueuePlayer.cs` 의 id → 클립 조회 실패가 `LogWarning` 이다** → `Debug.LogError` (가이드 3절). 큐 꽉 참 경고는 `logEvents` 를 끄면 사라지는데 Tooltip("경고 로그를 남긴다")과 `mistakes` 는 늘 경고한다고 말한다 → 경고는 `logEvents` 와 상관없이 남긴다.
5. **권장**: 무대의 "방금 꺼낸" 흐린 칸이 1.2초 고정이라 소리가 끝난 뒤에도 남는다 → 그 채널이 아직 그 소리를 울리는 동안, 최대 0.5초 안팎만. setup 의 "`Sound Length` 를 클립 길이에 맞춘다" → "두 클립 중 긴 쪽에". `maxVoices` hint 와 offNote 의 "6 이면 알림이 산다" → "드론 수 + 1 (자동 데모 5, 새 웨이브 직후 6)". `SoundQueue.cs`·Tooltip 의 "종류 수보다 크면" → "종류 수 이상이면". 3단계 이름 "다음 Tick 에" → "Tick 에서" (기록상 같은 프레임). 구조 그림의 채널 노드를 "채널 (SoundChannel)" 로 (코어는 AudioSource 를 모른다). 2단계 본문에 Nystrom 의 절충 한 문장 ("합칠 수 있는 창은 요청이 큐에 머무는 시간만큼이다. 늦게 처리하면 더 합치지만 소리가 늦는다"), 링 버퍼에 "Nystrom 은 칸 하나를 비워 두고, 여기서는 count 로 꽉 참과 빔을 가른다" 주석.
6. **가이드가 바뀌었다** (`docs/specimen-guide.md`, 묶음 4 리뷰): 2절 (표본 글에서 `Unity/` 는 "연결 컴포넌트"), 3절 (`OnValidate` 뒤 다시 그리기, 이름 조회 실패는 `LogError` 와 빈 기본값, Inspector `+` 는 바인딩째 복사, `foreach` 람다 복사 불필요), 4절 (반올림·정수 변환이 있으면 조절 값 범위 전체에서 비교 경계에 걸리는 조합이 없는지, 미니 월드 ✖ 표시는 사건 기록 ✖ 와 같은 판정으로, 패턴도 같은 증상을 내는 입력 순서에서는 나쁜 예도 ✖ 를 쓰지 않음, `// [!]` 는 코어에도 똑같이 있는 줄에 두지 않음), 5절 (조절 값 끝과 프리셋에서도 그림이 겹치지 않게), 6절 (나쁜 예 증상은 Unity 에서 실제로 보이는 모습으로도, 구조 그림의 클라이언트 → 인터페이스 화살표는 Unity/ 필드 형식과 같게). 고친 뒤 바뀐 규칙에 맞는지 다시 본다.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs event-queue-sound` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs event-queue-sound`, `node tools/gallery.mjs check event-queue-sound`, `node tools/gallery.mjs unity-compile event-queue-sound` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
