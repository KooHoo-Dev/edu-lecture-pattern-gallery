---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 8
verify:
  - node tools/truth.mjs facade-hit-resolution
  - node tools/gallery.mjs check facade-hit-resolution
  - node tools/gallery.mjs unity-compile facade-hit-resolution
  - node tools/gallery.mjs thumbs facade-hit-resolution
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)"]
writePaths:
  - unity/facade-hit-resolution/**
  - truth/facade-hit-resolution/**
  - src/specimens/facade-hit-resolution/**
  - src/shots/facade-hit-resolution/**
allowProfiles: [org]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 수정: facade-hit-resolution

Pattern Gallery 의 표본 `facade-hit-resolution` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/facade-hit-resolution/`, `truth/facade-hit-resolution/`, `src/specimens/facade-hit-resolution/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **`unity.setup` 2단계와 4단계가 모순된다.** 2단계는 "하린과 드론은 스크립트를 붙이지 않는다", 4단계는 "하린에 `GunInput` 을 붙인다". "드론에는 스크립트를 붙이지 않는다 (하린에는 4단계에서 `GunInput`)" 로 고친다. `Unity/TrapZone.cs` 머리 주석("D1 발밑에 둔다")도 setup(빈 `CombatHub` 오브젝트에 붙임)과 맞춘다.
2. **두 번 파괴를 막지 않는다.** `HitTaken` 구독자가 같은 드론에 `Hit` 을 다시 부르면(폭발 연쇄, 반격) 안쪽에서 파괴·보상 뒤 바깥 `Hit` 이 `Hp == 0` 을 다시 보고 `Wreckage.Destroy` 를 또 불러 크레딧이 두 번 들어간다. `Destroy` 첫 줄 `if (target.IsDestroyed) return;` (또는 창구에서 `Hp == 0 && !IsDestroyed`). sim 도 같게. `mistakes` 의 "창구가 크레딧 두 번을 막는다" 가 참이 된다.
3. **pitfalls 다듬기**: 3번 "트리거에서 들어온 드론을 찾아 `combat.Hit`" 을 하려면 GameObject → 코어 `Drone` 변환이 필요한데 `CombatHub` 에는 반대 방향(private `ObjectOf`)만 있다 → public `DroneOf(GameObject)` 를 더하고 글에 쓴다. 2번 "CombatHub 를 둘 두면" → "공격 컴포넌트마다 다른 Hub 를 넣으면". 5번에서 `GunInput.gunDamage` 는 웹 갤러리에는 없는 Unity 전용 칸이라고 밝힌다 (Tooltip 도).
4. **`✖ 방어력 무시` 가 전기 충격마다 다시 뜬다.** 가이드 4절(같은 대상의 같은 종류는 한 번)대로 대상마다 한 번만. Target 과 sim 을 같게 고치고 기록을 다시 만든다.
5. **나쁜 예 주석**: `FrontAlive` 는 코어와 이름이 같지만 뜻이 "HP 가 남은" 이다 → 주석 한 줄. `removed = true` 가 `Destroy(gameObject)` 흉내라는 주석에 "프레임 끝 지연은 흉내 내지 않는다". `// [!]` 설명은 무대 문제 줄 칸에 보이므로 한 줄 안팎으로 (예: "여기서 HP 0 이면 파괴하는 단계를 빠뜨렸다").
6. **선택**: 하위 시스템을 창구 안에서 `new` 로 고정했으므로 `related` 의 데코레이터 문장("1단계 자리에 버프 층")에 "계산기를 생성자로 받으면" 한 구절. Trap·Shock 피해 숫자를 `Gun.DefaultDamage` 처럼 상수로.
7. **가이드가 바뀌었다** (`docs/specimen-guide.md`): 3절 (이벤트로 맞추는 화면은 `OnEnable` 에서 다시 맞추기, IMGUI 확인용 글, 거리 경계 깜박임), 4절 ("같은 버그는 한 번" = 같은 대상의 같은 종류는 한 번, 결과 증상은 다른 이름이나 일반 사건 줄로). 무대의 문제 줄 칸이 이제 `// [!]` 뒤 설명도 보이므로, 설명을 짧고 분명하게 (한 줄 안팎) 다듬는다.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs facade-hit-resolution` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs facade-hit-resolution`, `node tools/gallery.mjs check facade-hit-resolution`, `node tools/gallery.mjs unity-compile facade-hit-resolution` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
