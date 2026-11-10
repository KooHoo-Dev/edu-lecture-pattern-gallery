// 묶음 6 수정 (2026-11-10): 독립 리뷰 지적. 구독 프로필 (회사 크레딧 소진). 리뷰 요약은 _review/<id>/review-summary.md (커밋 안 함).
// 묶음 6 잡은 갤러리 전체 일관성 정리(2794a90) 전에 갈라진 작업 트리에서 만들어졌다. CONSISTENCY 가 그 관례를 맞춘다.
const PROFILES = ['sub']
const CONSISTENCY = '**갤러리 전체 일관성 정리(`2794a90`)의 관례에 맞춘다** (다른 표본 meta 를 보고 같게): (1) `title` 은 `src/registry.ts` PLANNED 의 제목과 글자까지 같게 (검사가 이제 잡는다). (2) `unity.setup` 1단계는 `state-player-actions` 의 setup[0] 과 같은 문구 (`<id>` 만 바꿈, Active Input Handling 문장 포함). (3) IMGUI 확인용 글 주의는 표준 문구 "왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다." 에 표본별 덧말만 뒤에 (코드가 실제로 그렇게 하는지 맞춘다). (4) 표본별 InputAction 주의는 두지 않는다 (`src/ai.ts` 고정 규칙으로 옮겼다). (5) `Reset` 키는 `기본 키(…)` 로 쓰고, 웹 무대 키가 Unity 기본 키와 다르면 "웹 갤러리 무대의 … 는 Unity 에서 … 다" 를 한 줄. (6) 학생이 읽는 글에서 MonoBehaviour 쪽은 "연결 컴포넌트" (어댑터 아님). (7) Inspector 에 칠 숫자의 빼기는 ASCII `-`. (8) 모든 단계가 어떤 시나리오에서 한 번은 화면에 보여야 한다 (가이드 6절 `steps`).'

export default [
  {
    id: 'chain-input-handlers',
    fix: true,
    budgetUsd: 8,
    profiles: PROFILES,
    items: [
      '**제목**: `meta.ts` 의 `책임 연쇄: 클릭 처리 사슬` → `책임 연쇄 패턴: 클릭 처리 사슬` (registry 와 같게). `titleEn` 은 `Chain of Responsibility Pattern: …`.',
      '**"UI 가 먼저 받는다" 는 문서와 반대다** (pitfall, `meta.ts` 141 근처). Input System UI support 문서는 UI 가 입력 처리 **뒤에** 갱신된다고 한다. "먼저" 를 지우고, 콜백 안에서 `IsPointerOverGameObject()` 를 부르면 경고가 나고 UI 상태가 지난 프레임 것이라는 점(문서로 확인됨)을 적는다. 해법 한 줄: "콜백에서는 위치만 기억하고 `Update` 에서 `Send` 한다". 연결 컴포넌트도 그렇게 바꾼다 (`ClickInput.cs` 99 근처, 지금은 `performed` 콜백 안에서 `Send`). 그래야 adaptIdeas[0] 대로 UI 처리자를 `IsPointerOverGameObject` 로 바꿔도 경고가 나지 않는다.',
      '**`두 번 처리` 인데 드론 반응이 안 보인다** (`Target.cs` 101, `sim.ts` 405 근처): 드론 반응을 `selected && !selected0` 로 봐서 이미 선택된 드론을 다시 누르면 반응이 안 잡힌다 (`scenario=modal-popup` 효과 끄기 3.80: "반응: 땅 이동 ✖ 두 번 처리" 인데 드론 줄이 없음). 나쁜 예 드론 선택에 선택 횟수나 `Selected` 이벤트를 두고 그것으로 판정한다. C#·sim 을 같게, 기록을 다시 만든다.',
      '**IMGUI 주의와 코드**: 표준 문구 (CONSISTENCY 3) 에 `GUI.Box` 와 "상자는 클릭을 받지 않고 판정은 사슬이 한다" 를 덧말로. `ClickInput.cs` 159 근처가 두 번째 상태 줄을 `OnGUI` 안에서 매 프레임 만든다 → 이벤트 핸들러에서 만들어 두거나(하린 x 는 `Update`), 그 한 문장을 이 표본에서 뺀다. 코드 주석 151 근처 "사슬 순서와 같게 그린다" 는 반대 (그리는 순서는 사슬의 역순: 뒤에 그린 것이 위에 보이고 사슬은 위의 것부터 받는다).',
      '**넣는 순서 5단계**: "`Reset` 이 기본 키(마우스 왼쪽 버튼·터치·펜, `<Pointer>/press`)를 넣고" 로. "웹 갤러리 무대의 Q/W/E/R 은 정해진 자리를 누르는 시연이고 Unity 에서는 직접 클릭한다" 한 줄.',
      '**그림·글 다듬기**: "있어야 할 자리" 와 "하린" 이름표가 겹친다 (`sim.ts` 487, 1.35초): 거리가 1.6 단위 아래면 흐린 하린의 이름표를 다른 높이(y 3 안팎)에 두거나 뺀다. 하린이 드론 밑에 오면 "정비 드론 · 선택됨" 글과 몸이 겹치는 것도. 프리셋 `quick-walk` 의 `look` 은 효과 켬에서 보이는 모습("땅 탭에 하린이 금방 도착한다")을 먼저. offNote "창 밖의 땅, 드론, ✕" → "창 밖의 땅이나 드론, 창의 ✕". Tooltip·pitfall 의 버튼 폭 경계 "4 이상" → "4 안팎" (`Range` 슬라이더는 연속). 구조 그림 처리자 사이 "다음" 화살표 이름을 "다음 (사슬이 넘김)" 으로 (처리자는 다음을 모른다). 글에 Refactoring Guru 예제의 `SetNext` 형태와 이 표본의 "목록이 넘기는" 변형의 차이를 한 문장. 단계 4(버림)가 어느 시나리오에서도 안 보이면, 아무 처리자도 받지 않는 클릭이 생기는 시나리오(예: 화면 밖·빈 하늘 클릭 입력)를 하나 더하거나 단계 4 를 화면에 보이게 고친다 (CONSISTENCY 8).',
      CONSISTENCY,
    ],
  },
  {
    id: 'memento-checkpoint',
    fix: true,
    budgetUsd: 8,
    profiles: PROFILES,
    items: [
      '**JsonUtility 주의 문구가 사실과 다르다** (`meta.ts` 149 근처). 6000.3 `JsonUtility.ToJson` 문서는 public 필드만 말하고 나머지는 매뉴얼의 Serialization rules 로 넘긴다. 규칙은 "public 이거나 `[SerializeField]` 이면 직렬화" 라 `[SerializeField] private` 필드는 담긴다. 지금 글대로면 수강생이 메멘토를 public 필드로 열어야 한다고 믿어 캡슐화(이 표본의 핵심)와 부딪힌다. 고칠 문장: "`[Serializable]` 클래스에 `[SerializeField] int hp;` 와 `public int Hp => hp;` 처럼 두면 바깥에는 읽기 전용이면서 `JsonUtility` 가 담는다. readonly 필드와 `get` 만 있는 자동 속성은 담지 않는다. `FromJson` 은 private 필드도 채우므로, 고칠 수 없다는 약속은 코드 관례로 지킨다." (이 표본의 `ExplorerMemento` 를 그대로 넣으면 값이 안 담긴다는 결론은 맞다. 이유를 위처럼.) adaptIdeas 의 "public 필드로 옮겨" 에 이 방식도 함께.',
      '**Unity 로그가 틀린 이유를 말한다** (`Unity/CheckpointInput.cs` 159–163): `Hurt Damage` 가 0 이하면 `InputIgnored("hurt")` 가 나는데 Console 에 "끝 칸이라 더 가지 않음" 이 찍힌다. 분기를 `input == "walk" && !IsDown` 로 바꾸거나 `hurtDamage` 에 `[Min(1)]`.',
      '**숫자가 어긋난 채 남는다** (`sim.ts` 609, 628): 나쁜 예에서 ✖ 뒤에 다시 주우면 `bugExtra` 가 그대로라 빨간 칸은 2개인데 글은 "조각 1개가 그대로" (`scenario` 2 의 3.5~4.1초). `p.items.length - savedItems.length` 로 그때그때 계산한다.',
      '**글 다듬기**: offNote "저장 뒤 주운 칸은 빨간 ✖로 남는다" → "빨간 칸으로 남고 ✖ 가 붙는다" (무대와 같게). related 의 "둘 다 바뀌어야 할 참조 필드만 새로 만든다" → "둘 다 따로 가져야 할 참조 필드(목록)는 새로 만든다". 메멘토가 바깥에서 읽힌다는 점(불투명하지 않음)은 글이 밝히고 있으니 두고, 원하면 pitfall 한 줄 "C# 에서 완전히 숨기려면 중첩 클래스나 표지 인터페이스". 칸 1 의 깃발 기둥이 하린과 닿는 것은 조금 비킨다.',
      CONSISTENCY,
    ],
  },
]
