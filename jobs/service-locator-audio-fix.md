---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 8
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

# 표본 수정: service-locator-audio

Pattern Gallery 의 표본 `service-locator-audio` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/service-locator-audio/`, `truth/service-locator-audio/`, `src/specimens/service-locator-audio/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **`unity.pitfalls` 의 의존성 주입 문장이 Unity 에서 그대로 안 된다.** "Inspector 칸으로 `IAudioService` 를 넘겨받는" 은 `[SerializeField]` 인터페이스 칸이 Inspector 에 보이지 않아 따라 할 수 없다 (가이드 3절). "생성자로 `IAudioService` 를, 또는 Inspector 칸으로 구체 컴포넌트(`AudioServiceHost`)를 넘겨받는" 으로 고친다.
2. **`mistakes` 의 도메인 리로드 항목 조건이 틀렸다.** Play 를 끝낼 때 `AudioServiceHost.OnDisable` 이 `Provide(null)` 을 부르므로 이 표본의 Host 라면 지난 서비스가 남지 않는다. 남는 경우는 등록 해제를 빠뜨렸을 때나 MonoBehaviour 가 아닌 곳에서 `Provide` 했을 때뿐이라고 밝히고, `Reset` 은 그런 경우를 대비한 방어 코드라고 쓴다. `Naive/NaiveAudioCalls.cs` 9행 근처 주석도 OnDestroy 가 Instance 를 비우므로 같게 고친다.
3. **정비 ✖ 글 위치** (`sim.ts` 466 근처): "✖ 키트만 쓰고 완료 기록 안 됨" 이 D1 옆(6.4, 3.7)에 있고 포탑 발사 화살표가 가로지른다. 정비대 바로 위로 옮기고 도윤 이름표·완료음 글과 겹치지 않게 (`p.`·`preset=`·`scenario=repair-without-sound` 화면으로 확인).
4. **`silent-start-bounty` note 시각**: "4.20 에 소리 매니저를 넣은 뒤의 파괴만" → 기록상 넣는 시각은 3.60. "3.60 에 소리 매니저를 다시 넣은 뒤 4.20 의 파괴만 30 을 받는다" 로.
5. **선택**: `mistakes` 의 구독을 남긴 항목에 "남은 구독의 `MissingReferenceException` 이 `Services.Audio.Play` 를 지나 게임 코드까지 올라와 크레딧 지급 줄도 멈춘다 (나쁜 예와 같은 증상)" 한마디. Host 를 둘 켰다가 나중 것을 끄면 앞 Host 로 되돌아가지 않고 무음이 된다는 한계를 괄호로. `Core/BaseGameCode.cs` 54행 근처 `DroneField` 가 개수를 `Math.Max(0, count)` 로 자르게. 나쁜 예의 `OnDestroy` 가 Instance 를 비우지 않는 흔한 변형이면 NRE 대신 파괴된 AudioSource 를 건드리는 `MissingReferenceException` 이 난다는 것과 `?.`·`??` 가 Unity 의 가짜 null 을 거르지 못한다는 것을 offNote 나 mistakes 에 한 줄 (6개·5개 상한이면 기존 항목에 합친다).
6. **가이드·검사가 바뀌었다**: `docs/specimen-guide.md` 4절 ("같은 대상의 같은 종류는 버그 상태가 이어지는 동안 한 번", 같은 프레임에 사라지는 상태는 0.3~0.5초 남겨 그리기). `check-domain` 이 이제 주석만 있는 줄의 `// [n]` 을 오류로 잡는다 (코드 줄 끝에 둔다). `// [!]` 설명은 무대 문제 줄 칸에 한 줄로 보이므로 짧게.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs service-locator-audio` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs service-locator-audio`, `node tools/gallery.mjs check service-locator-audio`, `node tools/gallery.mjs unity-compile service-locator-audio` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
