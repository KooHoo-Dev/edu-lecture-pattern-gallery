import type { PatternMeta } from '../../stage/types.ts'

export const meta: PatternMeta = {
  id: 'spatial-grid-detection',
  title: '공간 분할: 격자로 근처 적 찾기',
  titleEn: 'Spatial Partition: Finding Nearby Drones with a Grid',
  pattern: '공간 분할',
  group: 'D',
  order: 4,
  oneLiner: '땅을 칸으로 나눠 드론을 칸에 등록하고, 근처 칸만 보아 탐지 범위 안의 적을 찾는다',
  goals: [
    '드론이 바로 옆에 있는데 포탑이 못 찾는 두 원인(칸을 넘을 때 등록을 옮기지 않음, 포탑이 있는 칸만 봄)을 화면과 사건 기록에서 가려낼 수 있다.',
    '드론을 지금 칸에 등록하고, 칸을 넘을 때마다 `grid.Move(drone, 옛 칸, 새 칸)` 으로 등록을 옮겨 격자가 실제 자리와 늘 같게 할 수 있다.',
    '탐지 반경이 닿는 **모든 칸**을 계산해 그 칸의 드론만 거리를 재고, 거리 검사 횟수를 전체 검사와 비교할 수 있다.',
    '칸 크기와 반경의 관계(칸이 너무 작으면 볼 칸이, 너무 크면 칸마다 드론이 는다)를 설명하고, 콜라이더가 있으면 Unity 물리 쿼리로 대개 충분하다는 것을 안다.',
  ],
  tags: ['격자', '근처 찾기', '거리 검사', '최적화'],
  difficulty: 2,
  params: [
    {
      key: 'cellSize',
      label: '칸 크기',
      type: 'range',
      min: 1,
      max: 4,
      step: 0.5,
      default: 2,
      unit: 'm',
      hint: '격자 한 칸의 한 변. 탐지는 반경이 닿는 칸만 본다 (초록으로 칠한 칸). 1 이면 칸이 반경보다 훨씬 작아 볼 칸이 32개로 늘고 (원을 감싼 6×6 칸 가운데 원이 닿지 않는 위쪽 끝 4칸은 뺀다), 4 면 볼 칸은 4개뿐이지만 칸 하나가 넓어 거리 검사가 전체 검사에 가까워진다. 나쁜 예는 칸이 작을수록 포탑 칸이 좁아 경계 누락이 는다. 자동 데모의 장면(D2 가 포탑 칸으로 넘어옴, D4 가 옆 칸)은 2 에 맞췄다',
    },
    {
      key: 'scanRadius',
      label: '탐지 반경',
      type: 'range',
      min: 1,
      max: 4,
      step: 0.5,
      default: 2.5,
      unit: 'm',
      hint: '포탑에서 이 거리 안의 드론을 찾는다 (하늘색 원). 반경이 커지면 원이 닿는 칸이 늘어 거리 검사도 는다. 나쁜 예는 원이 포탑 칸 밖으로 나간 부분을 보지 않는다',
    },
    {
      key: 'droneSpeed',
      label: '드론 속도',
      type: 'range',
      min: 0.5,
      max: 3,
      step: 0.25,
      default: 1.5,
      unit: 'm/s',
      hint: '모든 드론의 빠르기. 칸을 넘는 시각이 바뀐다. 자동 데모는 1.5 에 맞춰 2.2초에 D2 가 포탑 칸에, 4.8초에 D4 가 옆 칸에 있다. 0.75 면 2.2초에 D2 가 반경 안이지만 아직 처음 칸 (4,3) 에 있어 탐지 누락 대신 경계 누락이 뜨고, 0.5 면 D2 가 반경 밖이라 그 탐지에 ✖ 가 없다',
    },
  ],
  presets: [
    { id: 'standard', name: '기본', look: '칸 2m, 반경 2.5m. 탐지는 포탑 둘레 12칸만 본다', values: {} },
    { id: 'tiny-cells', name: '잘게 나눈 칸', look: '칸 1m. 반경이 닿는 칸이 32개로 늘고, 나쁜 예는 1m 짜리 포탑 칸 하나만 봐서 거의 모두 놓친다', values: { cellSize: 1 } },
    { id: 'big-cells', name: '큰 칸', look: '칸 4m. 볼 칸은 4개지만 칸이 넓어 드론이 많이 들고, 나쁜 예의 포탑 칸도 넓어져 경계 누락이 준다', values: { cellSize: 4 } },
    { id: 'wide-scan', name: '넓은 탐지', look: '반경 4m. 원이 구역 위아래 끝 가까이까지 닿아 볼 칸과 거리 검사가 함께 늘고, 나쁜 예는 원의 대부분을 보지 않는다', values: { scanRadius: 4 } },
  ],
  events: [
    { id: 'wave', label: '드론 3대 더하기' },
    { id: 'scan', label: '지금 탐지' },
    { id: 'autoScan', label: '자동 탐지 켜기·끄기' },
  ],
  keys: { KeyQ: 'wave', KeyW: 'scan', KeyE: 'autoScan' },
  scenarios: [
    {
      id: 'missed-next-to-turret',
      label: '드론 셋, 탐지, 칸을 넘은 드론, 바로 옆 칸의 드론',
      duration: 5.5,
      note:
        '자동 데모. 0.20초에 D1, D2, D3 이 나와 각자 칸 (4,2), (4,3), (7,1) 에 등록된다. 0.80초 탐지는 포탑 칸 (4,2) 의 D1 을 찾는다 (패턴은 12칸을 보고 거리 검사 2회, 나쁜 예는 포탑 칸만 보고 1회). ' +
        '1.25초에 D2 가 아래로 내려와 포탑 칸 (4,2) 로 넘어온다. 패턴은 등록을 옮기고, 나쁜 예는 D2 를 처음 칸 (4,3) 목록에 그대로 둔다. ' +
        '2.20초 탐지에서 패턴은 D2 를 찾고, 나쁜 예는 포탑 칸 목록에 D2 가 없어 못 찾는다 (탐지 누락, 거리 1.60). ' +
        '4.00초에 D4, D5, D6 이 나온다. D4 는 포탑 바로 왼쪽 칸 (3,2) 에 나와 등록도 맞다. 4.80초 탐지에서 패턴은 D4 를 찾고, 나쁜 예는 포탑 칸만 봐서 칸 경계 바로 너머의 D4 를 못 찾는다 (경계 누락, 거리 1.75). 빨간 링은 놓친 순간의 자리에 다음 탐지까지 남는다',
      inputs: [
        [0.2, 'wave'],
        [0.8, 'scan'],
        [2.2, 'scan'],
        [4.0, 'wave'],
        [4.8, 'scan'],
      ],
    },
    {
      id: 'many-drones-auto',
      label: '드론 열여덟, 자동 탐지',
      duration: 5,
      note:
        '0.20~0.80초에 드론 열두 대가 나오고 1.00초에 자동 탐지를 켠다 (0.5초마다, 1.48초부터). 2.40, 2.60초에 여섯 대가 더 나온다. ' +
        '패턴은 늘 12칸만 보아 거리 검사가 6~11회인데, 전체 검사면 12~18회다. 드론이 늘어도 포탑 둘레에 있는 드론만 잰다. ' +
        '나쁜 예는 포탑 칸 목록만 보아 거리 검사가 1~2회로 더 적지만, 1.48초부터 매번 반경 안의 드론 여럿을 놓친다. 계속 놓친 드론은 ✖ 없이 "또 못 찾음" 으로 적고, 그사이 칸을 옮겨 원인이 바뀌면 (D2 는 2.98초, D12 는 3.48초에 탐지 누락 → 경계 누락) 그것도 적는다. 4.60초에 자동 탐지를 끈다',
      inputs: [
        [0.2, 'wave'],
        [0.4, 'wave'],
        [0.6, 'wave'],
        [0.8, 'wave'],
        [1.0, 'autoScan'],
        [2.4, 'wave'],
        [2.6, 'wave'],
        [4.6, 'autoScan'],
      ],
    },
    {
      id: 'tiny-cells',
      label: '칸 1m, 반경 3m',
      duration: 4.5,
      values: { cellSize: 1, scanRadius: 3 },
      note:
        '칸이 반경보다 훨씬 작은 경우. 0.20, 0.50초에 드론 여섯 대가 나오고 1.00, 2.50, 4.00초에 탐지한다. 패턴은 반경이 닿는 39칸을 훑지만 드론이 든 칸은 몇 안 돼 거리 검사는 1~3회다 (칸이 작으면 거리 검사는 줄어도 볼 칸을 고르는 일이 는다). ' +
        '나쁜 예의 포탑 칸 (8,4) 는 1m 뿐이라 1.00초에 D4, D2 를, 4.00초에 D5 를 놓친다 (경계 누락. 셋 다 처음 칸에서도 벗어나 있다)',
      inputs: [
        [0.2, 'wave'],
        [0.5, 'wave'],
        [1.0, 'scan'],
        [2.5, 'scan'],
        [4.0, 'scan'],
      ],
    },
  ],
  diagram: {
    nodes: [
      { id: 'scanner', label: 'TurretScanner', sub: 'MonoBehaviour · 입력, Tick', x: 50, y: 8 },
      { id: 'field', label: 'Field', sub: '코어 · 드론을 옮긴다', x: 17, y: 42 },
      { id: 'turret', label: 'Turret', sub: '코어 · Scan 과 결과', x: 83, y: 42 },
      { id: 'drone', label: 'Drone', sub: 'X, Y, Cell (등록된 칸)', x: 17, y: 90, kind: 'object' },
      { id: 'grid', label: 'SpatialGrid', sub: '칸 → 드론 목록', x: 83, y: 90 },
    ],
    edges: [
      { id: 'scanner-field', from: 'scanner', to: 'field', label: 'Tick · AddWave', kind: 'call' },
      { id: 'scanner-turret', from: 'scanner', to: 'turret', label: 'Scan()', kind: 'call' },
      { id: 'field-drone', from: 'field', to: 'drone', label: '자리 옮김', kind: 'call' },
      { id: 'field-grid', from: 'field', to: 'grid', label: 'Add · Move(옛 칸, 새 칸)', kind: 'call' },
      { id: 'turret-grid', from: 'turret', to: 'grid', label: 'Query(포탑, 반경)', kind: 'call' },
      { id: 'grid-drone', from: 'grid', to: 'drone', label: '거리 검사', kind: 'ref' },
    ],
  },
  naiveDiagram: {
    nodes: [
      { id: 'nturret', label: 'NaiveTurret', sub: 'MonoBehaviour · Update 와 Scan', x: 50, y: 10 },
      { id: 'ndrone', label: 'NaiveDrone', sub: 'x, y 만 바뀐다', x: 17, y: 55, kind: 'object' },
      { id: 'ncells', label: 'cells', sub: 'Dictionary · 처음 칸 그대로', x: 83, y: 55, kind: 'object' },
      { id: 'nown', label: 'cells[포탑 칸]', sub: '탐지는 이 목록 하나만', x: 83, y: 92, kind: 'object' },
    ],
    edges: [
      { id: 'nturret-ndrone', from: 'nturret', to: 'ndrone', label: 'x, y 만 옮김', kind: 'call' },
      { id: 'nturret-ncells', from: 'nturret', to: 'ncells', label: 'OnWave 때만 Add', kind: 'call' },
      { id: 'ncells-nown', from: 'ncells', to: 'nown', label: 'Scan: 포탑 칸 하나', kind: 'ref' },
      { id: 'nown-ndrone', from: 'nown', to: 'ndrone', label: '이 목록만 거리 검사', kind: 'ref' },
    ],
  },
  steps: [
    {
      n: 1,
      label: '드론은 나오는 순간 지금 칸에 등록된다',
      body: '`AddWave` 가 정해진 자리에 드론 셋을 만들고 `Field.Add` 가 `grid.Add` 를 부른다. 칸 번호는 `Math.Floor(x / cellSize)` 로 내려 센다 (`(int)` 로 자르면 음수 좌표 -0.5 도 0 칸이 된다). 격자는 칸 → 드론 목록 사전이고, 드론도 자기가 등록된 칸(`Cell`)을 안다. 사건 기록의 `D1 칸 (4,2) 에 등록` 줄이 이 순간이다.',
      target: 'field-grid,grid',
    },
    {
      n: 2,
      label: '움직여 칸을 넘으면 옛 칸에서 빼고 새 칸에 넣는다',
      body: '`Field.Tick` 이 드론마다 자리를 옮긴 뒤 지금 칸을 다시 센다. 등록된 칸과 다르면 `grid.Move(drone, 옛 칸, 새 칸)` 으로 옛 칸 목록에서 빼고 새 칸 목록에 넣는다. 자동 데모 1.25초에 D2 가 (4,3) 에서 포탑 칸 (4,2) 로 넘어오는 줄이 이것이다. 이 한 줄이 빠지면 격자는 드론이 처음 나온 자리를 계속 믿는다.',
      target: 'field-drone,field-grid',
    },
    {
      n: 3,
      label: '탐지는 반경이 닿는 칸들만 본다',
      body: '`Turret.Scan` 이 `grid.Query(포탑, 반경)` 을 부른다. 원을 감싼 사각형의 칸 범위를 구하고, 그 가운데 원이 실제로 닿는 칸만 본다 (초록으로 칠한 칸). 포탑이 칸 경계 위에 있어도 경계 너머 칸까지 본다. 칸 2m, 반경 2.5m 면 구역 40칸 가운데 12칸이다.',
      target: 'scanner-turret,turret-grid',
    },
    {
      n: 4,
      label: '그 칸에 등록된 드론만 거리를 잰다',
      body: '본 칸의 목록에 든 드론만 `거리² <= 반경²` 로 잰다. 왼쪽 위의 `거리 검사 n 회` 가 그 수이고, 괄호 안은 격자 없이 모든 드론을 쟀다면의 수다. 찾은 드론은 초록 링(탐지 순간의 자리)과 초록 이름으로 보이고, 결과는 `Scanned` 이벤트로 알린다. 드론이 늘수록 두 수의 차이가 커진다 (두 번째 시나리오).',
      target: 'grid-drone,drone',
    },
  ],
  offNote:
    '증상은 "드론이 포탑 바로 옆에 있는데 포탑이 못 찾는다" 이다. 나쁜 예는 격자를 만들고 드론을 나올 때 한 번 칸에 넣지만 (1) 드론이 움직여도 `cells` 를 고치지 않고 (2) 탐지할 때 `cells[포탑 칸]` 목록 하나만 본다. ' +
    '반경 안의 드론이 **포탑 칸에 와 있는데** 처음 칸 목록에만 있으면 (1) 때문이다 (✖ 탐지 누락, 자동 데모 2.20초의 D2). 반경 안의 드론이 **옆 칸**에 있으면 등록이 맞아도 (2) 때문에 못 찾는다 (✖ 경계 누락, 4.80초의 D4. 처음 칸에서 벗어나 있었다면 글에 "등록도 처음 칸 그대로" 를 붙인다). 어느 순서로 눌러도 이 기준으로 가른다. ' +
    '버그 판정은 같은 입력의 패턴 코어가 찾은 드론과 비교한다. 빨간 링과 ✖ 글은 놓친 순간의 자리에 다음 탐지까지 남고, 주황 점선은 등록 칸에서 실제 자리로 간다 (✖ 없는 포탑 칸 밖 드론은 점만). 거리 검사는 대개 나쁜 예가 더 적다: 틀린 답을 빠르게 낸다. 계속 놓친 드론은 ✖ 없이 빨간 링과 "놓침" 만 남는다. Unity 에서는 Console 탐지 줄에 그 드론 이름이 빠지고, 그 드론이 찾은 색으로 바뀌지 않는다.',
  mistakes: [
    {
      title: '드론이 포탑 바로 옆에 있는데 탐지 목록에 없다 (처음 나온 자리 근처에서만 잡힌다)',
      body: '칸을 넘을 때 등록을 옮기지 않았다. 드론을 움직이는 코드(`transform.position` 이나 `x += …`)와 격자 등록이 따로 놀면 격자는 처음 자리를 계속 믿는다. 위치를 바꾸는 곳을 한 곳(`Field.Tick`)으로 모으고, 바뀐 칸을 세어 다르면 `grid.Move(drone, 옛 칸, 새 칸)` 을 바로 부른다. 순간 이동이나 넉백처럼 다른 곳에서 자리를 바꾸는 코드는 자리를 바꾼 곳에서 바로 칸을 다시 세어 `grid.Move` 를 부른다. 이 표본은 다음 `Field.Tick` 이 칸을 바로잡지만, 그 전에 탐지하면 옛 칸을 본다.',
    },
    {
      title: '칸 경계 바로 너머의 드론만 못 찾는다',
      body: '포탑이 있는 칸(내 칸)만 봤다. 반경이 칸 안에 다 들어가는 경우는 드물다: 포탑이 칸 가장자리에 있으면 반경 0.5m 라도 이웃 칸으로 넘친다. `(x ± r) / cellSize` 로 반경을 감싼 칸 범위를 구해 그 칸을 모두 본다. "주변 3×3 칸" 으로 고정해도 반경이 칸보다 크면 또 빠진다.',
    },
    {
      title: '격자로 바꿨는데 오히려 느려졌다',
      body: '칸 크기가 반경보다 훨씬 작으면 탐지 한 번에 훑을 칸이 많아진다 (칸 1m, 반경 2.5m 면 32칸). 반대로 칸이 너무 크면 칸 하나에 드론이 많이 들어 거리 검사가 전체 검사와 비슷해진다. 칸 크기를 반경과 비슷하게(반경의 1~2배) 두고, 드론이 수십 대 이하라면 전체 검사가 더 단순하고 빠를 수 있다는 것도 잰다.',
    },
    {
      title: '파괴한 드론이 탐지에 잡히거나 `MissingReferenceException` 이 난다',
      body: '드론 오브젝트를 `Destroy` 하면서 격자 칸에서 빼지 않았다. 칸 목록은 없앤 드론을 계속 들고 있다. 이 표본처럼 격자에 코어 `Drone` 을 넣었다면 예외 없이 없앤 드론이 `찾음` 에 계속 남는다. 격자에 Transform 이나 MonoBehaviour 를 넣었다면 탐지가 파괴된 드론의 `transform.position` 을 읽다가 `MissingReferenceException` 이 난다. 이 표본은 `Field.Remove` 가 목록과 격자에서 함께 빼고 `Removed` 이벤트로 알리며, 연결 컴포넌트는 그 이벤트에서 화면 오브젝트를 지운다. 다른 곳에서 드론을 없앨 때도 `Field.Remove` 를 부른다.',
    },
    {
      title: '월드 원점 둘레의 드론이 엉뚱한 칸에서 잡히거나 빠진다',
      body: '칸 번호를 `(int)(x / cellSize)` 로 셌다. C# 의 `(int)` 는 0 쪽으로 잘라 -0.5 도 0 이 되어, 0번 칸이 -1 칸까지 두 배로 넓어지고 -1 칸에는 아무도 등록되지 않는다. Unity 월드는 보통 원점이 가운데라 절반이 음수 좌표다: 월드 좌표 그대로 격자를 만들면 원점 둘레에서 이 일이 생긴다. 이 표본은 `Scan Field` 를 구역 왼쪽 아래에 두고 그 로컬 좌표(0 이상)만 써서 드러나지 않지만, `(int)Math.Floor(x / cellSize)` 로 내려 음수에서도 맞게 했다 (`SpatialGrid.CellOf`).',
    },
  ],
  unity: {
    setup: [
      '`Core/` 와 `Unity/` 폴더를 `Assets/Patterns/spatial-grid-detection/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.',
      '드론 프리팹: 2D 프로젝트면 `GameObject > 2D Object > Sprites > Triangle`, Universal 3D 프로젝트면 `GameObject > 3D Object > Cube` 로 하나 만든다 (Sprites 메뉴는 2D Sprite 패키지가 있어야 보인다). Scale 을 (0.4, 0.4, 0.4) 로 하고 `DroneView` 를 붙인 뒤, Hierarchy 에서 Project 창으로 끌어 프리팹을 만들고 (묻는 창이 나오면 Original Prefab) 장면에 남은 것은 지운다.',
      '포탑 그림: 같은 메뉴로 Square(3D 는 Cube)를 하나 만들어 이름을 `Turret` 으로 바꾸고 Position (0, 0, 0), Scale (0.5, 0.5, 0.5) 에 둔다. 자리 표시일 뿐 스크립트가 없다.',
      '`GameObject > Create Empty` 로 `Scan Field` 를 만들어 Position (-8, -4.5, 0) 에 두고 `TurretScanner` 를 붙인다. 붙이는 순간 `Reset` 이 기본 키(Q 드론 3대 더하기, W 지금 탐지, E 자동 탐지 켜기·끄기)를 넣는다. `Drone Prefab` 칸에 2단계의 프리팹을 넣는다. 이 오브젝트 자리가 구역(16 × 9 m)의 왼쪽 아래이고, 포탑은 구역 가운데라 월드 (0, 0) 의 `Turret` 그림과 겹친다.',
      '`Main Camera` 를 Position (0, 0, -10) 에 두고 Projection 을 `Orthographic`, Size 를 5 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). Game 뷰 비율을 16:9 로 두면 가로 -8.9 ~ 8.9, 세로 -5 ~ 5 가 보여 구역 전체가 들어온다. 격자 선·탐지 반경·본 칸은 Gizmos 라 Scene 뷰에 보이고, Game 뷰에서는 툴바의 Gizmos 버튼을 켜야 보인다.',
      'Play 하고 Q 를 누른 뒤 W 를 몇 번 누른다. Console 에 `[Grid] D1 칸 (4,2) 에 등록`, 드론이 칸을 넘을 때마다 `[Grid] D2 칸 (4,3) → (4,2)`, 탐지마다 `[Grid] 탐지: 칸 12개 · 거리 검사 n회 (전체 검사면 3회) · 찾음 …` 이 나온다. 찾은 드론은 초록으로 바뀌고 커지며, Game 뷰 왼쪽 위에 `거리 검사 n 회 (전체 검사면 N 회) · 찾은 드론 n · 본 칸 n` 이 보인다.',
    ],
    verify: '드론이 반경(Gizmos 의 하늘색 원) 안에 들어온 뒤 W 를 누르면, 그 드론이 Console 의 `찾음` 목록에 들고 초록으로 바뀐다. 포탑과 다른 칸에 있어도, 처음 나온 칸에서 멀리 왔어도 같다.',
    pitfalls: [
      '콜라이더가 있는 대상이면 `Physics.OverlapSphere`(3D)나 `Physics2D.OverlapCircleAll`(2D)로 반경 안을 찾는 것이 보통 충분하다. 물리 엔진이 자체 가속 구조로 후보를 추린다고 알려져 있어서다. 2D 의 `Physics2D.OverlapCircle(point, radius)` 기본 오버로드는 콜라이더 하나만 돌려주므로, 전부 받으려면 `OverlapCircleAll` 이나 `ContactFilter2D` 와 `List<Collider2D>` 를 받는 오버로드를 쓴다. 이 표본은 콜라이더 없이 많은 대상(수백 개의 점, 경로점, 파티클 위치)을 다룰 때 직접 짜는 경우다.',
      '격자 선, 반경, 이번 탐지가 본 칸은 `OnDrawGizmos` 로 그린다. Scene 뷰에는 늘 보이고 Game 뷰는 Gizmos 버튼을 켜야 보이며, 빌드에는 나오지 않는다. 실제 게임에서 보이려면 LineRenderer 나 스프라이트로 그린다.',
      '왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다. 탐지 글은 `Scanned` 핸들러에서 만든다.',
      'Play 중에 `Cell Size` 를 바꾸면 `OnValidate` 가 `Field.SetCellSize` 로 모든 드론을 새 칸 크기로 다시 등록한다 (칸 이동 로그는 남지 않는다). Gizmos 의 본 칸은 다음 탐지부터 새 칸으로 보인다. `Scan Radius` 는 다음 탐지부터, `Drone Speed`, `Scan Interval` 은 다음 프레임부터 쓴다.',
      '드론 위치는 코어(`Field.Tick`)가 정하고 `DroneView.LateUpdate` 가 매 프레임 그 자리로 `transform` 을 덮어쓴다. 다른 스크립트가 `transform` 을 옮기면 그 이동은 무시되고 격자도 모른다. 드론에 Rigidbody 를 붙여 물리로 움직이면 물리와 `LateUpdate` 가 자리를 두고 싸운다. 자리를 바꾸는 코드는 모두 코어의 드론 자리를 바꾸게 한다.',
      '`Time.timeScale` 이 0 이면 `Tick(0)` 이라 드론과 자동 탐지 시계가 멈춘다. W 로 누르는 탐지는 멈춘 채로도 돈다.',
    ],
  },
  prompt: {
    goal: '탐지 포탑이 구역을 칸으로 나눈 격자에 드론을 등록하고, 드론이 칸을 넘을 때마다 grid.Move 로 등록을 옮기며, 탐지할 때는 반경이 닿는 모든 칸의 드론만 거리를 재서 반경 안의 드론을 하나도 빠뜨리지 않고 찾는다.',
    adaptIdeas: [
      '탐지에 걸린 드론 가운데 가장 가까운 드론을 포탑이 조준하게 하고 싶다.',
      '드론 수백 대가 서로 너무 가까우면 밀어내도록, 드론마다 근처 드론을 격자로 찾고 싶다.',
      '파괴된 드론을 격자와 목록에서 함께 빼고 화면 오브젝트도 지우고 싶다.',
      '구역이 커져 빈 칸이 많으니 사전 대신 고정 크기 배열 격자로 바꾸고 싶다.',
      '포탑을 여러 대 두고 각 포탑이 자기 반경만 탐지하게 하고 싶다.',
    ],
  },
  inspiredBy: [],
  original: '특정 게임의 재현이 아니라 널리 쓰이는 공간 분할(고정 격자) 기법을 정비 기지 탐지 포탑과 잔해 드론에 적용했다. 인물과 문구는 이 갤러리의 가상 세계(외곽 탐사대)이고, 코드는 이 갤러리에서 새로 작성했다.',
  references: [{ label: 'Game Programming Patterns: Spatial Partition (Robert Nystrom)', url: 'https://gameprogrammingpatterns.com/spatial-partition.html' }],
  related: [
    { id: 'update-method-drone-list', why: '드론 목록을 매 프레임 도는 매니저 구조가 같다. 그 표본은 도는 중에 빠진 드론을 루프가 끝난 뒤 빼지만, 이 표본의 `Field.Remove` 는 목록과 격자에서 바로 빼고 `Tick` 은 사본 목록을 돌며 `Removed` 플래그로 빠진 드론을 건너뛴다' },
    { id: 'strategy-turret-targeting', why: '격자로 찾은 반경 안 드론 가운데 누구를 쏠지는 조준 방식(전략)이 고른다' },
  ],
}
