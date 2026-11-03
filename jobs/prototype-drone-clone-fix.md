---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 8
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

# 표본 수정: prototype-drone-clone

Pattern Gallery 의 표본 `prototype-drone-clone` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/prototype-drone-clone/`, `truth/prototype-drone-clone/`, `src/specimens/prototype-drone-clone/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **"다친 채 복제된다" 가 이 어댑터에서 재현되지 않는다.** `unity.pitfalls[0]`, `DroneHangar` 의 Tooltip, `mistakes` 의 같은 항목. `OnCloned` 가 `Instantiate` 직후 `view.Show(drone)` 로 HP 바와 모듈 상자를 코어 값으로 다시 그려 원본의 상태가 덮인다. "HP 를 뷰 컴포넌트에 들고 있으면 다친 채 복제된다. 이 표본은 코어 값으로 다시 그려서 드러나지 않는다" 처럼 이 어댑터 동작에 맞게 고친다.
2. **`Name` 을 값 필드라고 부른다.** `Core/ScoutDrone.cs` 머리 주석과 33행 근처, diagram 의 `sub`. "값 형식(MaxHp, Hp, Speed)과 바꿀 수 없는 string(Name)" 으로 고친다. `mistakes[0]` 이나 단계 2 에 한 문장: "공유가 위험한 것은 공유된 객체를 **고칠** 때(`Modules.Add`)다. 필드에 새 객체를 **대입**하면(`Name = …`, `Modules = new …`) 그 드론만 바뀐다." 그리고 "필드를 더하면 `MemberwiseClone` 이 조용히 공유하므로 `Clone` 을 다시 본다" 한 줄.
3. **효과 끄기 화면 강조**: `#4` 가 냉각 모듈을 달고 나오는 순간(카드가 강조한 장면)에도 링 타이머를 켠다 (`sim.ts` 의 `at.bug`). 공유 목록을 가리키는 화살표는 공유 중이면 주황(warn), 내용까지 틀리면 빨강으로 나눠, 공유 자체가 문제라는 것이 `#3` 에서도 보이게 한다.
4. **어댑터**: `moduleName` 필드를 "견본 (Play 시작 때 한 번)" 머리글에서 "조절 값" 머리글 아래로 옮기고 (`OnValidate` 가 Play 중에도 넣는다), `unity.pitfalls` 의 실시간 반영 목록에 `Module Name` 을 더한다. 컴포넌트가 꺼진 동안 다른 스크립트가 `Hangar` 를 바꾸면 뷰가 어긋난다 → `OnEnable` 에서 `Clones` 를 돌며 빠진 뷰를 만들고 다시 그린다. 뷰는 격납고 아래에 만들어 격납고를 지우면 함께 사라지게.
5. **글 다듬기**: `mistakes[4]` 에 섞인 두 주제(깊은 복사 과잉, 생성자 인자 순서)를 나눈다. 생성자 예시는 실제 시그니처와 맞추거나 단계 1 본문으로 옮긴다. 두 번째 시나리오 note 의 괄호 문장을 자연스럽게. 단계 4 본문은 그 단계 화면(자동 데모 중간 시각)에 이미 일어난 일만 말하거나 "곧" 처럼 시간을 밝힌다.
6. **가이드가 바뀌었다**: `docs/specimen-guide.md` 3절(파괴된 컴포넌트 예외), 4절(버그 표시가 이어지게, 원인 설명이 다른 입력 순서에도 맞게), 6절(`params` 의 막대 기준과 화면용 좌표, `unity.setup` 의 Unity 6.3 메뉴·칸 이름)을 다시 읽고 이 표본이 어긋나는 곳이 있으면 함께 고친다.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs prototype-drone-clone` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs prototype-drone-clone`, `node tools/gallery.mjs check prototype-drone-clone`, `node tools/gallery.mjs unity-compile prototype-drone-clone` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
