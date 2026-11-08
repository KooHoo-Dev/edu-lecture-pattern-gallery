---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 8
verify:
  - node tools/truth.mjs dirty-flag-loadout
  - node tools/gallery.mjs check dirty-flag-loadout
  - node tools/gallery.mjs unity-compile dirty-flag-loadout
  - node tools/gallery.mjs thumbs dirty-flag-loadout
allowedTools: [Read, Edit, Write, Glob, Grep, "Bash(node tools/truth.mjs *)", "Bash(node tools/gallery.mjs *)", "Bash(git status*)", "Bash(git diff*)", "Bash(ls *)", "Bash(grep *)", "Bash(cat *)", "Bash(head *)"]
writePaths:
  - unity/dirty-flag-loadout/**
  - truth/dirty-flag-loadout/**
  - src/specimens/dirty-flag-loadout/**
  - src/shots/dirty-flag-loadout/**
allowProfiles: [sub]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 수정: dirty-flag-loadout

Pattern Gallery 의 표본 `dirty-flag-loadout` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/dirty-flag-loadout/`, `truth/dirty-flag-loadout/`, `src/specimens/dirty-flag-loadout/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **무대 속도 식 글이 하한을 빠뜨렸다** (`sim.ts` 493 근처): 실제 값은 `max(0.25, 1 − w/30)` 인데 글은 `base × (1 − w / 30)` 이다. 식 글을 하한까지 쓰고, 하한에 걸렸을 때는 "(하한 0.25)" 를 붙인다. 조절 값 최대(`p.cellWeight`, `p.kitWeight`)로 무게 30 을 넘겨 `live` 로 확인한다.
2. **단계 4 의 `Transform` 문장이 매뉴얼에 없는 내부 동작을 단정한다** ("위치를 바꿀 때 내부 행렬을 바로 계산하지 않는다"). 비유를 흐리거나 확인된 예로 바꾼다: Nystrom 의 더티 플래그 장이 드는 예(씬 그래프의 월드 변환)를 "책의 예" 로, 또는 Unity 의 `Physics.SyncTransforms` (Transform 변경을 물리에 한꺼번에 맞춤) 를 "같은 생각" 으로.
3. **`Naive/NaiveLoadout.cs` 89행 `// [!]` 설명이 길어 문제 줄 칸에서 잘린다.** 한 줄로: 예 `// [!] 여기서 isDirty = true 를 켜지 않는다 (옛 무게가 남는다)`.
4. **offNote 마지막 문장**: "다음 줍기에 갑자기 가벼워진다" 는 `cellWeight` 가 `kitWeight` 보다 크면 틀린다 → "다음 줍기에야 키트 몫이 빠진다". "그대로이다가" 도 자연스럽게.
5. **패턴 모드에서 "표시 dirty" 가 화면에 거의 나오지 않는다.** 무대가 입력 다음 프레임에 바로 읽어 늘 `clean` 이다. `sim.ts` 475 주석("옛 캐시를 그대로 보인다")은 476~479 코드와 반대다. 주석과 코드를 맞추고, 입력 뒤 0.3~0.5초 동안 "표시 켬 → 읽을 때 다시 계산" 을 남겨 단계 2 가 화면에 보이게 한다 (가이드 4절). 왼쪽 위에 `속도 읽기 n 회 · 다시 계산 m 회` 를 나란히 두어 단계 4 의 "360번 읽어도" 가 화면에 보이게 한다 (읽기 횟수가 기록 대조에 들어가면 C#·sim·Target 을 같게).
6. **묶음 한도와 모듈 무게가 글에 없다**: 냉각 셀은 칸당 2개, 칸마다 모듈 0.5 가 붙어 줍기가 +1.5 일 때와 +1.0 일 때가 있다. 시나리오 note 나 preset look 에 한 문장.
7. **자잘한 것**: `Unity/HarinMover.cs` 필드 `LoadoutInput loadout` → `loadoutInput`, `[RequireComponent(typeof(LoadoutInput))]`. "다시 계산 4 회"(무대) 와 "4회"(기록·Unity) 표기를 하나로. `unity.pitfalls` 3 의 "다시 계산 횟수가 하나 는다" 는 그 칸을 들고 있을 때만이라고 조건을 적는다. Core 도 메서드마다 `MarkDirty()` 를 부른다는 점을 "표시를 켜는 곳을 한 클래스 안으로 좁힌 것" 이라는 한 문장으로. 시나리오 3 의 ✖ `옛 무게` 두 번은 별개 사건이라 그대로 둔다 (가이드 4절 새 문구에 맞다).
8. **가이드·검사가 바뀌었다**: `docs/specimen-guide.md` 4절 ("같은 대상의 같은 종류는 버그 상태가 이어지는 동안 한 번", 같은 프레임에 사라지는 상태는 0.3~0.5초 남겨 그리기). `check-domain` 이 이제 주석만 있는 줄의 `// [n]` 을 오류로 잡는다 (코드 줄 끝에 둔다). `// [!]` 설명은 무대 문제 줄 칸에 한 줄로 보이므로 짧게.

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs dirty-flag-loadout` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs dirty-flag-loadout`, `node tools/gallery.mjs check dirty-flag-loadout`, `node tools/gallery.mjs unity-compile dirty-flag-loadout` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
