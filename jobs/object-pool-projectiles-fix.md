---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 8
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

# 표본 수정: object-pool-projectiles

Pattern Gallery 의 표본 `object-pool-projectiles` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/object-pool-projectiles/`, `truth/object-pool-projectiles/`, `src/specimens/object-pool-projectiles/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **Unity 설정대로 하면 표적이 화면에 안 보인다.** 카메라 Size 4.22, 16:9 면 오른쪽 끝이 x 7.5 인데 1m Cube 를 (8,0,0) 에 두면 통째로 밖이다. 표적을 (7.5,0,0) 에 두고 "탄은 표적 가운데(화면 끝)에서 사라진다" 로 고친다. 웹도 `TARGET_X = 15.5` 라 삼각형이 화면 끝 선 바깥에 그려진다 → 15.0 안팎으로 옮겨 실제로 걸치게 (기록 대조에 쓰이는 값이면 C# 와 함께 바꾸고 기록을 다시 만든다).
2. **`unity.pitfalls[0]` 의 `ObjectPool<T>` 대응이 부정확하다.** `actionOnGet` 은 `Action<T>` 라 종류·속도 같은 발사마다 다른 값을 받을 수 없다. `Launch` 는 "Get 다음에 호출자가 하는 초기화" 자리이고, `actionOnGet` 은 기본값 되돌리기·`SetActive` 만 맡는다고 고쳐 쓴다 (Unity 문서로 확인됨: 콜백 이름, `collectionCheck` 는 Editor 에서만, `defaultCapacity` 는 미리 만들지 않음, `maxSize` 넘치면 `actionOnDestroy`).
3. **같은 ✖ 를 두 번 쓴다.** 5.50초에 날던 `#6` 을 또 빌리면 `같은 탄을 또 빌려 줌` 과 함께 `이전 상태 재사용` 이 다시 찍힌다 (5.20초에 이미 보고한 같은 객체). 이미 켜진 객체(`wasActive`)면 `이전 상태 재사용` 은 건너뛴다 (가이드 4절). Target 과 sim 을 같게 고치고 기록을 다시 만든다.
4. **다시 빌린 탄의 "있어야 할 자리" 점선 상자가 엉뚱한 곳에 있다.** 이미 켜진 객체는 `SetActive(true)` 가 아무것도 하지 않아 `Age` 가 0 으로 안 돌아가, 5.5초 발사가 아니라 5.2초 발사의 자리에 그려진다. 다시 빌린 순간을 기준으로 그린다. "#6 이 사라진 자리" 글이 `빠름` 라벨과 겹치지 않게.
5. **억지 배치를 교육 장치로 밝힌다.** 표적을 화면 끝에 걸쳐 명중과 화면 밖이 늘 같은 프레임에 겹치게 했다 (코어의 화면 밖 경로는 돌지 않는다). 글에 "실제 게임에서는 둘이 같은 프레임에 겹치는 일이 드물어 이중 반납이 가끔만 난다 → 재현이 어려운 버그다. 이 표본은 늘 겹치게 놓았다" 한 문장. 카드의 "위치만" 과 달리 나쁜 예가 위치와 종류를 맞추는 것은 받아들인다 (냉각 라벨이 빠르게 나는 증상을 보이려고). offNote 와 맞는지만 확인한다.
6. **자잘한 것**: Unity 의 날던 탄이 매 프레임 `muzzle.position` 을 따라가 포탑을 옮기면 같이 미끄러진다 → 발사 때 시작점을 저장하거나 pitfall 한 줄. preset `standard` 의 "연사 때 두 개를 더 만든다" 를 실제(냉각탄 때 하나 더)와 맞춘다. 자동 데모 note 를 두 문단으로 나눈다.
7. **가이드가 바뀌었다** (`docs/specimen-guide.md`): 3절 (이벤트로 맞추는 화면은 `OnEnable` 에서 다시 맞추기, IMGUI 확인용 글, 거리 경계 깜박임), 4절 ("같은 버그는 한 번" = 같은 대상의 같은 종류는 한 번, 결과 증상은 다른 이름이나 일반 사건 줄로). 무대의 문제 줄 칸이 이제 `// [!]` 뒤 설명도 보이므로, 설명을 짧고 분명하게 (한 줄 안팎) 다듬는다.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs object-pool-projectiles` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs object-pool-projectiles`, `node tools/gallery.mjs check object-pool-projectiles`, `node tools/gallery.mjs unity-compile object-pool-projectiles` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
