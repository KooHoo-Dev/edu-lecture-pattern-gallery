---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 8
verify:
  - node tools/truth.mjs flyweight-drone-types
  - node tools/gallery.mjs check flyweight-drone-types
  - node tools/gallery.mjs unity-compile flyweight-drone-types
  - node tools/gallery.mjs thumbs flyweight-drone-types
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)", "Bash(grep *)", "Bash(cat *)", "Bash(head *)"]
writePaths:
  - unity/flyweight-drone-types/**
  - truth/flyweight-drone-types/**
  - src/specimens/flyweight-drone-types/**
  - src/shots/flyweight-drone-types/**
allowProfiles: [sub]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 수정: flyweight-drone-types

Pattern Gallery 의 표본 `flyweight-drone-types` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/flyweight-drone-types/`, `truth/flyweight-drone-types/`, `src/specimens/flyweight-drone-types/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **타입 객체 설명이 없고, `original` 은 플라이웨이트와 타입 객체를 같은 것으로 적었다.** 단계 2 나 goals 에 한 문장: "정찰형·중장갑을 `ScoutDrone : Drone` 같은 하위 클래스로 나누지 않고 종류를 데이터 객체 `DroneType` 으로 둔다 (타입 객체. 새 종류는 에셋 하나). 그 객체를 같은 종류의 모든 드론이 한 벌만 함께 쓰는 것이 플라이웨이트." `original` 은 "플라이웨이트와 타입 객체를 함께". "메모리를 아끼는 것보다 값의 주인이 누구인가가 요점" 문장을 goals 나 offNote 끝에. `related` 에 `factory-drone-spawner` (종류마다 스포너 클래스를 상속으로 나눈 표본과의 대비) 를 더할 수 있다.
2. **단계 4 코드 칸에 빈 줄이 나온다.** `Unity/SquadInput.cs` 175행 주석만 있는 `// [4]` 줄 → 그 표시를 177행 `pair.Value.ShowHp(barFullHp);` 끝으로 옮긴다 (검사가 이제 잡는다).
3. **첫 피해가 아닌 경로의 ✖ 와 글** (`Target.cs` 120~121, `sim.ts` 421~425, offNote, `scoutCount` hint): (a) `scoutCount` 1 이면 정찰형 ✖ 가 스폰 때 뜨는데 결과 줄("S2 가 다친 채 나왔다")이 ✖ 보다 먼저 나오고, ✖ 문구 "HP 공유: S2 도 HP 2" 는 주어가 없어 안 읽힌다. 스폰 경로에서 ✖ 가 뜨면 ✖ 를 먼저 쓰고 문구를 "S2 가 정찰형 에셋의 currentHp 2 를 함께 읽어 다친 채 나왔다" 처럼 주어 있게, 그때 "다친 채" 줄은 뺀다. (b) "밸런스 수정 → 정찰형 하나 더" 는 아무도 안 맞았는데 ✖ 가 뜬다 (나쁜 예 S4 는 4/6, 코어는 6/6). offNote 에 "정찰형이 한 대뿐이면 때릴 때는 티가 안 나고 다음 정찰형이 나올 때 드러난다. 밸런스 수정은 maxHp 만 올려, 그 뒤 나온 드론은 올린 최대 HP 가 아니라 currentHp 로 나온다" 를 더한다. hint "스폰 때 드러난다" 는 "정찰형의 HP 공유는" 으로 좁힌다 (중장갑 ✖ 는 첫 피해에 뜬다). Target 과 sim 을 같게 고치고 기록을 다시 만든다.
4. **공유 객체를 고치는 장면의 긴장**: 단계 4 본문과 `DroneType.RaiseMaxHp` 주석에 "고치는 것은 `ToDroneType()` 이 Play 때 만든 런타임 객체라 에셋은 그대로다. 내재 상태는 원래 읽기 전용이고 이 메서드만 종류 전체에 일부러 반영하는 수정이다" 한 줄.
5. **무대 화살표가 엉킨다** (`sim.ts` 503 근처): 스폰된 정찰형이 중장갑 오른쪽에 나와 종류 상자로 가는 화살표가 X 자로 겹친다. 화살표를 종류 색(`#5cc8ff` 정찰형, `#ffb547` 중장갑 등 지금 쓰는 종류 색)으로 칠하고, 가능하면 스폰 자리를 같은 종류 옆으로 둔다. 프리셋 `crowd` 와 조절 값 끝 화면으로 확인한다.
6. **Unity 빈틈**: `dronePrefab` 이 비면 `LogError` (가이드 3절). `HasTypes` 가 중장갑의 Type Name·Code 가 빈 경우도 본다. 공개 `Squad` getter 가 `HasTypes` 를 거치게 (다른 스크립트가 먼저 읽어도 NRE 가 나지 않게). `damage`·`patchHp` 에 `[Min(1)]`. setup 에 HP 막대의 `Order in Layer` (HpFill 1) 도 적는다 (2D Custom Axis 정렬에서는 z 가 효과가 없다).
7. **글 다듬기**: `mistakes` 의 "순환 참조" 항목은 근거를 "오래 사는 공유 객체(SO)가 개체 참조를 붙잡아 파괴된 드론을 가리키고 메모리를 붙든다" 로. 나쁜 예 머리 주석의 "빌드에서는 남지 않는다" 는 "새 실행이면 남지 않지만, 한 실행 안에서는 씬을 다시 불러도 에셋이 메모리에 있는 동안 값이 남는다" 로. `DroneView.Bind` 의 `body.material` 은 드론마다 사본이라 괜찮지만, `sharedMaterial` 을 고치면 이 표본과 같은 공유 에셋 변경이 된다는 것을 pitfalls 에 (6개 상한이면 기존 항목에 합친다).
8. **가이드·검사가 바뀌었다**: `docs/specimen-guide.md` 4절 ("같은 대상의 같은 종류는 버그 상태가 이어지는 동안 한 번", 같은 프레임에 사라지는 상태는 0.3~0.5초 남겨 그리기). `check-domain` 이 이제 주석만 있는 줄의 `// [n]` 을 오류로 잡는다 (코드 줄 끝에 둔다). `// [!]` 설명은 무대 문제 줄 칸에 한 줄로 보이므로 짧게.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs flyweight-drone-types` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs flyweight-drone-types`, `node tools/gallery.mjs check flyweight-drone-types`, `node tools/gallery.mjs unity-compile flyweight-drone-types` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
