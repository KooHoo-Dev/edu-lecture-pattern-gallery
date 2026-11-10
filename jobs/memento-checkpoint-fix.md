---
# 표본 수정 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: claude-opus-5-5
effort: high
budgetUsd: 8
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
allowProfiles: [sub]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---

# 표본 수정: memento-checkpoint

Pattern Gallery 의 표본 `memento-checkpoint` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(`unity/`)이다.

## 먼저 읽을 것

1. `docs/specimen-guide.md` 전체.
2. 이 표본의 파일 전부 (`unity/memento-checkpoint/`, `truth/memento-checkpoint/`, `src/specimens/memento-checkpoint/`).

## 고칠 것 (위에서부터 중요한 순서)

1. **JsonUtility 주의 문구가 사실과 다르다** (`meta.ts` 149 근처). 6000.3 `JsonUtility.ToJson` 문서는 public 필드만 말하고 나머지는 매뉴얼의 Serialization rules 로 넘긴다. 규칙은 "public 이거나 `[SerializeField]` 이면 직렬화" 라 `[SerializeField] private` 필드는 담긴다. 지금 글대로면 수강생이 메멘토를 public 필드로 열어야 한다고 믿어 캡슐화(이 표본의 핵심)와 부딪힌다. 고칠 문장: "`[Serializable]` 클래스에 `[SerializeField] int hp;` 와 `public int Hp => hp;` 처럼 두면 바깥에는 읽기 전용이면서 `JsonUtility` 가 담는다. readonly 필드와 `get` 만 있는 자동 속성은 담지 않는다. `FromJson` 은 private 필드도 채우므로, 고칠 수 없다는 약속은 코드 관례로 지킨다." (이 표본의 `ExplorerMemento` 를 그대로 넣으면 값이 안 담긴다는 결론은 맞다. 이유를 위처럼.) adaptIdeas 의 "public 필드로 옮겨" 에 이 방식도 함께.
2. **Unity 로그가 틀린 이유를 말한다** (`Unity/CheckpointInput.cs` 159–163): `Hurt Damage` 가 0 이하면 `InputIgnored("hurt")` 가 나는데 Console 에 "끝 칸이라 더 가지 않음" 이 찍힌다. 분기를 `input == "walk" && !IsDown` 로 바꾸거나 `hurtDamage` 에 `[Min(1)]`.
3. **숫자가 어긋난 채 남는다** (`sim.ts` 609, 628): 나쁜 예에서 ✖ 뒤에 다시 주우면 `bugExtra` 가 그대로라 빨간 칸은 2개인데 글은 "조각 1개가 그대로" (`scenario` 2 의 3.5~4.1초). `p.items.length - savedItems.length` 로 그때그때 계산한다.
4. **글 다듬기**: offNote "저장 뒤 주운 칸은 빨간 ✖로 남는다" → "빨간 칸으로 남고 ✖ 가 붙는다" (무대와 같게). related 의 "둘 다 바뀌어야 할 참조 필드만 새로 만든다" → "둘 다 따로 가져야 할 참조 필드(목록)는 새로 만든다". 메멘토가 바깥에서 읽힌다는 점(불투명하지 않음)은 글이 밝히고 있으니 두고, 원하면 pitfall 한 줄 "C# 에서 완전히 숨기려면 중첩 클래스나 표지 인터페이스". 칸 1 의 깃발 기둥이 하린과 닿는 것은 조금 비킨다.
5. **갤러리 전체 일관성 정리(`2794a90`)의 관례에 맞춘다** (다른 표본 meta 를 보고 같게): (1) `title` 은 `src/registry.ts` PLANNED 의 제목과 글자까지 같게 (검사가 이제 잡는다). (2) `unity.setup` 1단계는 `state-player-actions` 의 setup[0] 과 같은 문구 (`<id>` 만 바꿈, Active Input Handling 문장 포함). (3) IMGUI 확인용 글 주의는 표준 문구 "왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다." 에 표본별 덧말만 뒤에 (코드가 실제로 그렇게 하는지 맞춘다). (4) 표본별 InputAction 주의는 두지 않는다 (`src/ai.ts` 고정 규칙으로 옮겼다). (5) `Reset` 키는 `기본 키(…)` 로 쓰고, 웹 무대 키가 Unity 기본 키와 다르면 "웹 갤러리 무대의 … 는 Unity 에서 … 다" 를 한 줄. (6) 학생이 읽는 글에서 MonoBehaviour 쪽은 "연결 컴포넌트" (어댑터 아님). (7) Inspector 에 칠 숫자의 빼기는 ASCII `-`. (8) 모든 단계가 어떤 시나리오에서 한 번은 화면에 보여야 한다 (가이드 6절 `steps`).

## 범위

- 위 `writePaths` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 `node tools/truth.mjs memento-checkpoint` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. `node tools/truth.mjs memento-checkpoint`, `node tools/gallery.mjs check memento-checkpoint`, `node tools/gallery.mjs unity-compile memento-checkpoint` 를 통과시킨다.
2. 고친 화면을 `node tools/gallery.mjs live` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
