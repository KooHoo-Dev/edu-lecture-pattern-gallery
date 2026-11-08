import type { PatternMeta } from '../../stage/types.ts'

export const meta: PatternMeta = {
  id: 'dirty-flag-loadout',
  title: '더티 플래그: 장비 무게 다시 계산',
  titleEn: 'Dirty Flag: Loadout Weight',
  pattern: '더티 플래그',
  group: 'D',
  order: 3,
  oneLiner: '비싼 합계는 바뀌었을 때만 다시 계산하고, 값을 바꾸는 모든 길이 다시 계산 표시를 켜게 한 곳에 모은다',
  goals: [
    '매 프레임 다시 계산하던 총 무게를 캐시하고, 바뀌었을 때만 다시 계산하는 표시(dirty)를 둘 수 있다.',
    '값을 바꾸는 메서드는 계산하지 않고 표시만 켜고, 읽는 쪽이 표시를 보고 한 번 다시 계산하게 나눌 수 있다.',
    '수리 키트를 썼는데 무게가 그대로인 버그가 "바깥이 필드를 직접 고쳐 표시를 건너뛴 것" 임을 찾아낼 수 있다.',
    '칸 목록을 private 으로 숨기고 바꾸는 길을 메서드로 모으는 캡슐화가 더티 플래그를 지킨다는 것을 설명할 수 있다.',
  ],
  tags: ['캐시', '캡슐화', '지연 계산', '성능'],
  difficulty: 2,
  params: [
    { key: 'kitWeight', label: '수리 키트 무게', type: 'range', min: 1, max: 4, step: 0.5, default: 2, hint: '수리 키트 한 개 무게. 클수록 키트를 쓸 때 줄어야 할 무게가 커서, 효과 끄기에서 캐시와 실제의 차이가 크다' },
    { key: 'cellWeight', label: '냉각 셀 무게', type: 'range', min: 0.5, max: 3, step: 0.5, default: 1, hint: '냉각 셀 한 개 무게. 클수록 줍기마다 막대가 크게 늘고 하린이 느려진다' },
    { key: 'baseSpeed', label: '기본 속도', type: 'range', min: 2, max: 6, step: 0.5, default: 4, hint: '짐이 없을 때의 이동 속도. 속도 = 기본 속도 × max(0.25, 1 − 총 무게 / 30). 하린이 걷는 빠르기가 바뀐다' },
  ],
  presets: [
    { id: 'standard', name: '기본', look: '산소 캔, 수리 키트 둘, 냉각 셀 하나로 시작', values: {} },
    { id: 'heavy-kits', name: '무거운 수리 키트', look: '키트 하나가 4 라 쓰면 무게가 크게 줄어야 한다', values: { kitWeight: 4, cellWeight: 2 } },
    { id: 'light-runner', name: '가벼운 정찰', look: '셀이 가볍고 빨리 걷는다', values: { cellWeight: 0.5, baseSpeed: 6 } },
  ],
  events: [
    { id: 'pickup', label: '냉각 셀 줍기' },
    { id: 'drop', label: '마지막 칸 버리기' },
    { id: 'useKit', label: '수리 키트 쓰기' },
    { id: 'upgrade', label: '산소 캔 합금 업그레이드' },
  ],
  keys: { KeyQ: 'pickup', KeyW: 'drop', KeyE: 'useKit', KeyR: 'upgrade' },
  scenarios: [
    {
      id: 'kit-skips-flag',
      label: '셀을 줍고, 수리 키트를 두 번 쓰고, 마지막 칸을 버린다',
      duration: 6,
      note: '자동 데모. 냉각 셀은 칸당 2개까지 묶이고 칸마다 모듈 0.5 가 붙어, 0.50 줍기는 기존 칸에 더해 +1.00, 1.30 줍기는 새 칸이라 +1.50 이다. 줍기마다 한 번 다시 계산한다. 2.30 수리 키트 쓰기에서 효과 끄기는 표시를 켜지 않아 캐시 13.50 · 실제 11.50 로 어긋나고(✖ 옛 무게), 3.40 에 한 번 더 써도 캐시 그대로다. 4.60 버리기가 표시를 켜서 7.00 으로 돌아온다',
      inputs: [
        [0.5, 'pickup'],
        [1.3, 'pickup'],
        [2.3, 'useKit'],
        [3.4, 'useKit'],
        [4.6, 'drop'],
      ],
    },
    {
      id: 'alloy-upgrade',
      label: '합금 업그레이드 뒤 수리 키트 쓰기',
      duration: 4,
      note: '0.40 합금으로 산소 캔이 4.00 → 2.00. 1.20 수리 키트 쓰기에서 효과 끄기는 캐시 9.00 · 실제 7.00 으로 어긋난다. 2.00 합금은 이미 끝나 받지 않으므로 표시도 켜지 않고, 2.80 줍기가 표시를 켜서야 8.00 으로 맞는다',
      inputs: [
        [0.4, 'upgrade'],
        [1.2, 'useKit'],
        [2.0, 'upgrade'],
        [2.8, 'pickup'],
      ],
    },
    {
      id: 'heavy-kit-twice',
      label: '무거운 수리 키트를 쓰고 줍고 또 쓴다',
      duration: 4,
      values: { kitWeight: 4, cellWeight: 2, baseSpeed: 6 },
      note: '키트 하나가 4 라 0.40 에 효과 끄기의 캐시 16.00 · 실제 12.00. 1.20 줍기로 맞았다가 2.00 에 키트를 다 쓰면 다시 어긋난다(캐시 14.00 · 실제 9.00). 2.80 버리기가 표시를 켜 4.50 으로 맞는다',
      inputs: [
        [0.4, 'useKit'],
        [1.2, 'pickup'],
        [2.0, 'useKit'],
        [2.8, 'drop'],
      ],
    },
  ],
  diagram: {
    nodes: [
      { id: 'input', label: 'LoadoutInput', sub: 'MonoBehaviour · 키 입력', x: 20, y: 16 },
      { id: 'loadout', label: 'Loadout', sub: 'dirty · TotalWeight', x: 50, y: 52 },
      { id: 'slots', label: '칸 목록', sub: 'private List<Slot>', x: 50, y: 88, kind: 'object' },
      { id: 'mover', label: 'HarinMover', sub: 'Update 에서 Speed 읽기', x: 80, y: 16 },
    ],
    edges: [
      { id: 'input-loadout', from: 'input', to: 'loadout', label: '메서드로만', kind: 'call' },
      { id: 'loadout-slots', from: 'loadout', to: 'slots', label: '안에서만 고친다', kind: 'ref' },
      { id: 'mover-loadout', from: 'mover', to: 'loadout', label: 'Speed 읽기', kind: 'call' },
    ],
  },
  naiveDiagram: {
    nodes: [
      { id: 'n-input', label: 'LoadoutInput', sub: '줍기 · 버리기 · 합금', x: 20, y: 16 },
      { id: 'n-kit', label: 'RepairKit', sub: '바깥 코드 · 표시 안 켬', x: 18, y: 86 },
      { id: 'n-loadout', label: 'NaiveLoadout', sub: 'isDirty · 캐시', x: 55, y: 46 },
      { id: 'n-slots', label: 'slots', sub: 'public List · count', x: 78, y: 86, kind: 'object' },
      { id: 'n-mover', label: 'HarinMover', sub: 'TotalWeight 읽기', x: 82, y: 14 },
    ],
    edges: [
      { id: 'n-input-loadout', from: 'n-input', to: 'n-loadout', label: '메서드 (표시 켬)', kind: 'call' },
      { id: 'n-kit-slots', from: 'n-kit', to: 'n-slots', label: 'count--', kind: 'ref' },
      { id: 'n-loadout-slots', from: 'n-loadout', to: 'n-slots', label: '합계', kind: 'ref' },
      { id: 'n-mover-loadout', from: 'n-mover', to: 'n-loadout', label: '캐시를 그대로', kind: 'call' },
    ],
  },
  steps: [
    { n: 1, label: '장비를 바꾸는 길은 Loadout 의 메서드뿐이다', body: '칸 목록은 `Loadout` 안의 `private` 목록이다. 줍기, 버리기, 수리 키트 쓰기, 합금 모두 `Add`, `RemoveLast`, `UseOne`, `Upgrade` 를 부른다. 바깥은 `SlotInfo` 복사본만 읽을 수 있어 개수를 직접 고치지 못한다.', target: 'input,input-loadout,loadout' },
    { n: 2, label: '바꾸는 메서드는 계산하지 않고 표시만 켠다', body: '메서드는 칸을 고친 뒤 `MarkDirty()` 로 `dirty = true` 한 줄만 한다. 한 프레임에 열 번 바꿔도 무게 계산은 아직 없다. 사건 기록의 "· 표시 켬" 이 그 순간이다. 무대는 바로 다음 프레임에 읽어 표시를 끄므로, 왼쪽 위 "표시 dirty" 와 오른쪽 "표시 켬 → 읽을 때 다시 계산" 을 0.4초 남겨 보인다.', target: 'loadout,loadout-slots,slots' },
    { n: 3, label: '읽을 때 표시가 켜져 있으면 한 번 다시 계산하고 끈다', body: '`HarinMover` 가 `Speed` 를 읽으면 `TotalWeight` 가 표시를 보고 칸마다 개수 × 무게 + 모듈 무게를 더한 뒤 표시를 끈다. 왼쪽 위 "다시 계산 n회" 가 하나 는다. 무게 글은 이때 오는 `Recalculated` 에서만 고친다.', target: 'mover,mover-loadout,loadout,slots' },
    { n: 4, label: '바뀌지 않았으면 캐시를 그대로 쓴다', body: '하린은 매 프레임 속도를 읽지만 표시가 꺼져 있으면 캐시를 돌려줄 뿐이다. 자동 데모 6초 동안 왼쪽 위 "속도 읽기" 는 360회까지 늘지만 "다시 계산" 은 처음 한 번과 입력 수만큼이다 (매 프레임 계산하던 코드라면 360번). 책의 예는 씬 그래프다: 부모가 움직이면 자식들의 월드 변환을 바로 다시 계산하지 않고 표시만 해 두었다가, 그릴 때 한 번 계산한다. Unity 물리도 같은 생각이다: Transform 을 바꿔도 물리에 바로 맞추지 않고 모아 두었다가, 다음 물리 단계 전이나 `Physics.SyncTransforms` 를 부를 때 한꺼번에 맞춘다.', target: 'mover-loadout,loadout' },
  ],
  offNote: '캐시와 `isDirty` 는 있지만 칸 목록과 묶음 수가 `public` 이고, 수리 키트를 쓰는 바깥 코드가 `slot.count--` 만 하고 `isDirty = true` 를 빠뜨린 흔한 코드다. 수리 키트를 쓰면 칸의 개수는 줄었는데 캐시된 총 무게와 그 무게로 구한 속도가 그대로다(자동 데모 2.30 에 캐시 13.5 · 실제 11.5). 어느 순서로 눌러도 원인은 이 한 길이다. 수리 키트를 쓴 뒤 줍기, 버리기, 합금 업그레이드처럼 메서드를 거치는 길이 실제로 무언가를 바꿔 표시를 켜면(칸이 가득 찬 줍기나 이미 끝난 합금은 켜지 않는다) 그때 수리 키트 몫까지 맞게 다시 계산된다. 그래서 "가끔 맞고 가끔 틀린" 버그로 보여 재현이 오락가락한다. Unity 에서는 키트를 써도 무게 글과 하린의 걸음이 바뀌지 않고, 다음 줍기(또는 버리기, 합금)가 표시를 켤 때에야 키트 몫이 빠진다.',
  mistakes: [
    { title: '수리 키트를 썼는데 짐이 그대로 무겁다', body: '바꾸는 길 하나에서 표시를 빠뜨렸다. 개수를 줄이는 코드가 `isDirty = true` 를 켜지 않으면 캐시가 옛 무게로 남는다. 다음에 다른 길이 표시를 켜면 그때 맞아져 원인을 찾기 어렵다. 바꾸는 코드를 `Loadout` 의 메서드로 모으고, 각 메서드 안에서 표시를 켠다. 이 표본의 `Loadout` 도 메서드마다 `MarkDirty()` 를 부른다. 부르는 곳을 없앤 것이 아니라 표시를 켜는 곳을 한 클래스 안으로 좁힌 것이다.' },
    { title: '고쳐도 다른 스크립트에서 또 같은 버그가 생긴다', body: '칸 목록이나 개수 필드가 `public` 이라 누구든 직접 고칠 수 있다. 이 표본의 `Loadout` 은 목록을 `private` 으로 두고 바깥에는 `SlotInfo` 값 복사본만 내준다. 교안 01 의 캡슐화(`{ get; private set; }`)처럼 읽기는 열고 쓰기는 닫으면 표시를 건너뛰는 길이 아예 없다.' },
    { title: '표시는 켜지는데 화면 숫자가 안 바뀐다', body: '읽는 쪽이 `TotalWeight` 대신 캐시 필드(`cachedWeight`)를 바로 읽었다. 표시를 확인하고 다시 계산하는 곳은 `TotalWeight` 하나여야 한다. 캐시 필드는 `private` 으로 둔다. 이 표본의 무게 글은 `Recalculated` 이벤트에서 고치므로 아무도 무게를 읽지 않으면 글도 그대로다. `HarinMover` 를 빼면 확인할 수 있다.' },
    { title: '캐시를 만들었는데 다시 계산 횟수가 매 프레임 는다', body: '`Update` 에서 `isDirty = true` 를 켜거나, 무게를 바꾸지 않는 메서드(받지 않은 합금 등)에서도 표시를 켠다. 표시는 실제로 바뀌었을 때만 켠다. 이 표본의 `Upgrade` 는 바꿀 칸이 없으면 표시를 켜지 않고 `Ignored` 만 알린다.' },
    { title: '총 무게는 맞는데 속도만 옛 값이다', body: '여러 캐시가 서로 기대는데 하나만 표시했다. 속도까지 캐시하면 무게가 다시 계산될 때 속도 캐시도 표시해야 한다. 이 표본은 속도를 캐시하지 않고 읽을 때마다 `TotalWeight` 에서 구한다 (싼 계산은 캐시하지 않는다).' },
  ],
  unity: {
    setup: [
      '`Core/` 와 `Unity/` 폴더를 `Assets/Patterns/dirty-flag-loadout/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다.',
      '하린을 만든다. Universal 3D 템플릿은 `GameObject > 3D Object > Capsule`, 2D 템플릿은 `GameObject > 2D Object > Sprites > Capsule` (2D Sprite 패키지, 2D 템플릿에 들어 있다). 이름을 Harin, Position 을 (0, 0, 0) 으로 둔다. 기본 카메라(2D 템플릿은 Orthographic Size 5, Universal 3D 는 (0, 1, −10) 원근)에 x −6 ~ 6 이 모두 보인다.',
      'Harin 에 `LoadoutInput` 을 붙인다. 붙이는 순간 `Reset` 이 시연 키(Q 냉각 셀 줍기, W 마지막 칸 버리기, E 수리 키트 쓰기, R 산소 캔 합금)를 넣는다.',
      '같은 Harin 에 `HarinMover` 를 붙인다. `Reset` 이 같은 오브젝트의 `LoadoutInput` 을 `Loadout Input` 칸에 넣는다. `[RequireComponent]` 라 `LoadoutInput` 이 없으면 함께 붙지만, 위 순서대로 먼저 붙여 두는 편이 확실하다 (칸이 비어 있으면 Harin 의 `LoadoutInput` 을 끌어 넣는다). Left X −6, Right X 6 사이를 걷는다.',
      'Play 하면 화면 왼쪽 위에 "다시 계산 1회 · 총 무게 11.0 / 30 · 속도 2.53" 과 칸 목록이 보인다. Q 로 셀을 줍고 E 로 수리 키트를 써 본다.',
    ],
    verify: 'E 로 수리 키트를 쓰는 순간 무게 글이 줄고 하린이 빨라지며, 키를 누르지 않는 동안은 "다시 계산 n회" 가 늘지 않는다.',
    pitfalls: [
      '무게 글은 `LoadoutInput` 의 `OnGUI` 로 그리는 확인용 화면이다 (IMGUI). 실제 게임은 UGUI·TextMeshPro 로 만들고, 같은 `Recalculated` 핸들러에서 글을 고친다.',
      '무게는 읽을 때 계산된다. `HarinMover` 를 빼면 아무도 `Speed` 를 읽지 않아 다시 계산도 무게 글 갱신도 일어나지 않는다. 화면에만 쓰는 값이면 `CountChanged` 핸들러에서 `TotalWeight` 를 한 번 읽어도 된다 (그러면 바뀔 때마다 계산한다).',
      'Play 중 Inspector 에서 `kitWeight`, `cellWeight` 를 바꾸면 `OnValidate` 가 `SetUnitWeight` 로 들고 있는 칸에도 넣는다. 그 이름의 칸을 들고 있어 값이 실제로 바뀔 때만 표시를 켜므로, 그때만 다시 계산 횟수가 하나 는다 (다 쓴 수리 키트의 무게를 바꾸면 늘지 않는다).',
      '`HarinMover` 는 `transform.position` 을 고쳐 걷는다 (물리가 없는 확인용). Rigidbody 를 붙이면 `FixedUpdate` 에서 `MovePosition` 으로 바꾼다.',
    ],
  },
  prompt: {
    goal: '장비 칸의 총 무게를 캐시하고, 칸을 바꾸는 모든 길이 다시 계산 표시를 켜게 칸 목록을 private 으로 숨긴 뒤 메서드로만 고치게 한다. 무게는 읽을 때 표시가 켜져 있으면 한 번만 다시 계산한다.',
    adaptIdeas: [
      '장비마다 내구도가 있어 닳을수록 무게가 늘게 하고 싶다. 내구도가 바뀌는 길도 표시를 켜게.',
      '무게가 한계를 넘으면 달리기를 막는 과적 상태를 더하고 싶다.',
      '총 무게 말고 방어력 합계도 캐시하고 싶다. 표시를 따로 둘지 같이 쓸지.',
      '인벤토리 UI 를 UGUI 슬롯 격자로 바꾸고 싶다.',
      '캐릭터 여럿이 같은 Loadout 구조를 쓰게 하고 싶다.',
    ],
  },
  inspiredBy: [],
  original: '특정 게임의 재현이 아니라 널리 쓰이는 더티 플래그 기법을 탐사대장의 장비 무게에 적용했다. 인물과 문구는 이 갤러리의 가상 세계(외곽 탐사대)이고, 코드는 이 갤러리에서 새로 작성했다.',
  references: [
    { label: 'Game Programming Patterns: Dirty Flag (Robert Nystrom)', url: 'https://gameprogrammingpatterns.com/dirty-flag.html' },
  ],
  related: [
    { id: 'decorator-stat-buffs', why: '버프가 바뀔 때 출력을 다시 계산한다. 감싸는 층이 바뀌는 길을 한 곳에 모은 것도 같다' },
    { id: 'observer-health-events', why: '`Recalculated` 이벤트로 무게 글을 고치는 것은 관찰자 패턴이다' },
  ],
}
