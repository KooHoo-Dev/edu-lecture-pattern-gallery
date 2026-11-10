import type { PatternMeta } from '../../stage/types.ts'

export const meta: PatternMeta = {
  id: 'update-method-drone-list',
  title: '업데이트 메서드: 드론 목록 한 프레임',
  titleEn: 'Update Method: One Frame of a Drone List',
  pattern: '업데이트 메서드',
  group: 'A',
  order: 6,
  oneLiner: '매니저가 드론 목록을 돌며 하나씩 업데이트하되, 도는 중에 생기고 사라지는 드론은 루프 밖에서 정리한다',
  goals: [
    '매니저가 목록을 도는 중에 `Remove` 하면 왜 바로 다음 드론이 그 프레임에 건너뛰어지고, `Add` 하면 왜 새 드론이 태어난 프레임에 움직이는지 설명할 수 있다.',
    '도는 중의 제거는 표시(`IsDead`)만, 추가는 대기 목록에만 하고, 루프가 끝난 뒤 `RemoveAll` 과 합치기로 목록을 정리할 수 있다.',
    'Unity 의 `MonoBehaviour.Update` 도 엔진이 오브젝트 목록을 도는 업데이트 메서드라는 것을 알고, 드론마다 `Update` 를 두는 대신 매니저 하나가 목록을 도는 구조로 옮길 수 있다.',
    '드론 규칙을 순수 C# 코어에 두고 시간을 `Tick(dt)` 로만 받아, 에디터 없이도 드론마다의 업데이트 횟수를 확인할 수 있다.',
  ],
  tags: ['게임 루프', '컬렉션 수정', '생성과 파괴'],
  difficulty: 2,
  params: [
    {
      key: 'moveSpeed',
      label: '이동 속도',
      type: 'range',
      min: 1.5,
      max: 4.5,
      step: 0.5,
      default: 3,
      unit: 'm/s',
      hint: '드론이 오른쪽 끝에서 기지까지 13m 를 가는 빠르기. 빠를수록 기지에 일찍 닿아, 나쁜 예에서 앞 드론이 빠질 때 다음 드론이 건너뛰는 장면이 일찍 나온다. 건너뛴 한 프레임의 거리는 속도 ÷ 60 (3 이면 0.05m)이라 화면에서는 안 보이고, 빨간 글의 업데이트 횟수(u)와 "있어야 u" 의 차이로 본다. 자동 데모는 3 이상이어야 6초 안에 조각이 기지에 닿는다',
    },
    {
      key: 'splitDelay',
      label: '분열까지 시간',
      type: 'range',
      min: 0.5,
      max: 2,
      step: 0.1,
      default: 1,
      unit: '초',
      hint: '분열 드론이 나와서 나뉘기까지 Update 로 받은 시간의 합. 자동 데모의 S4 는 1.1초에 나와 이만큼 뒤에 나뉜다. 0.5 면 EMP(1.7초) 전에 나뉘어 조각(HP 1)도 EMP 에 함께 빠진다. 나쁜 예는 건너뛴 프레임만큼 늦게 나뉜다',
    },
    {
      key: 'splitCount',
      label: '분열 조각 수',
      type: 'range',
      min: 1,
      max: 3,
      step: 1,
      default: 2,
      unit: '대',
      hint: '분열 드론 하나가 나뉘는 조각 수. 조각은 부모 자리에서 나와 줄을 하나씩 차지하고 다시 나뉘지 않는다. 나쁜 예는 도는 중에 Add 한 조각이 많을수록 태어난 프레임에 움직이는 드론이 는다',
    },
  ],
  presets: [
    { id: 'standard', name: '기본', look: '드론 넷과 분열 드론 하나. EMP 뒤 남은 분열 드론이 두 조각으로 나뉘고 5.4초에 기지에 닿는다', values: {} },
    { id: 'fast-swarm', name: '빠른 무리', look: '드론이 나오고 3초쯤에 기지에 닿아, 자동 데모 안에 조각, D6, D7 이 차례로 빠지며 나쁜 예는 그때마다 다음 드론을 건너뛴다', values: { moveSpeed: 4.5 } },
    { id: 'early-split', name: '빨리 나뉨', look: '분열 드론이 EMP 전에 세 조각으로 나뉘고, 조각도 EMP 에 함께 빠진다', values: { splitDelay: 0.5, splitCount: 3 } },
    { id: 'slow-line', name: '느린 행렬', look: '자동 데모 안에 기지에 닿는 드론이 없다. 도는 중에 목록이 바뀌는 순간은 EMP 와 분열뿐이다', values: { moveSpeed: 1.5 } },
  ],
  events: [
    { id: 'spawn', label: '드론 출발' },
    { id: 'splitter', label: '분열 드론 출발' },
    { id: 'emp', label: 'EMP (모두 피해 1)' },
  ],
  keys: { KeyQ: 'spawn', KeyW: 'splitter', KeyE: 'emp' },
  scenarios: [
    {
      id: 'emp-then-split',
      label: '드론 넷과 분열 드론, EMP, 분열, 기지 도달',
      duration: 6,
      note:
        '자동 데모. 0.20~1.40초에 D1, D2, D3, 분열 드론 S4, D5 가 차례로 나온다. 1.70초 EMP 로 HP 1 인 D1, D2, D3, D5 가 같은 프레임에 빠지기를 요청한다. ' +
        '패턴은 넷을 표시만 하고 루프가 끝난 뒤 한꺼번에 지워, 남은 S4(HP 2)는 그 프레임에도 움직인다. ' +
        '나쁜 예는 도는 중에 D1, D3, D5 를 바로 Remove 해서 D2 와 S4 를 건너뛰고 (업데이트 건너뜀. D2 는 HP 0 이라 사건 줄), 1.72초에 남아 있던 D2 를 Remove 하며 S4 를 또 건너뛴다. ' +
        '1.90초 D6 이 나온 뒤, 패턴은 2.10초에 S4 가 나뉘어 S4a, S4b 를 대기 목록에 넣고 루프 끝에 합친다. 나쁜 예의 S4 는 두 번 건너뛴 만큼 늦은 2.13초에 나뉘며 자기를 Remove 해 D6 을 건너뛰고, 바로 Add 한 S4a, S4b 는 그 프레임에 Update 된다 (태어난 프레임에 움직임). ' +
        '2.60초 D7, 3.20초 D8 이 뒤따른다. 패턴은 5.42초 S4a, S4b 가 함께 기지에 닿아 빠지고, 나쁜 예는 5.43초 S4a 를 Remove 하며 S4b 를 건너뛰어 S4b 만 5.45초에 빠지고, 그때 Remove 로 D7 을 또 건너뛴다',
      inputs: [
        [0.2, 'spawn'],
        [0.5, 'spawn'],
        [0.8, 'spawn'],
        [1.1, 'splitter'],
        [1.4, 'spawn'],
        [1.7, 'emp'],
        [1.9, 'spawn'],
        [2.6, 'spawn'],
        [3.2, 'spawn'],
      ],
    },
    {
      id: 'splitters-only',
      label: '분열 드론만 넷',
      duration: 4.5,
      note:
        '분열 드론 S1~S4 를 1초 간격으로 내보낸다 (0.20, 1.20, 2.20, 3.20초). 패턴은 1.20, 2.20, 3.20, 4.20초에 나뉘고 조각은 다음 프레임부터 움직인다. ' +
        '나쁜 예는 나뉠 때마다 자기를 Remove 해 바로 뒤 칸을 건너뛰고, 바로 Add 한 조각 둘이 그 프레임에 Update 된다. 1.20초에는 같은 프레임에 나온 S2 를 건너뛰어 (u 0) S2 가 한 프레임 늦은 2.22초에 나뉜다. ' +
        '그 뒤로는 목록 뒤에 붙은 앞 조각이 바로 뒤 칸이라 S1a(2.22초), S2a(3.20초), S3a(4.20초)가 건너뛰어진다. 이 조각들은 태어난 프레임에 한 번 더 돌고 나중에 한 번 건너뛰어 업데이트 횟수는 맞지만, 두 버그가 모두 일어났다. ' +
        '조각은 보통 드론이라 다시 나뉘지 않으므로, 한 프레임 안에서 연쇄로 더 나뉘지는 않는다',
      inputs: [
        [0.2, 'splitter'],
        [1.2, 'splitter'],
        [2.2, 'splitter'],
        [3.2, 'splitter'],
      ],
    },
    {
      id: 'fast-three-pieces',
      label: '빠른 드론, 세 조각 분열, 연달아 기지 도달',
      duration: 3.7,
      values: { moveSpeed: 4.5, splitCount: 3, splitDelay: 0.6 },
      note:
        '이동 속도 4.5, 분열까지 0.6초, 세 조각. D1, D2, 분열 드론 S3, D4 가 나온다. 1.18초 S3 이 세 조각으로 나뉠 때 나쁜 예는 D4 를 건너뛰고 S3a, S3b, S3c 가 모두 태어난 프레임에 움직인다. ' +
        '3.08초 D1 이 기지에 닿아 빠질 때 나쁜 예는 D2 를 건너뛰고, D2 가 빠질 때 (패턴 3.28초, 나쁜 예 3.30초) D4 를 또 건너뛴다. ' +
        '패턴은 3.48초에 세 조각이 함께 빠지고, 나쁜 예는 3.47초에 S3a 와 S3c 만 빠지며 그 사이의 S3b 를 건너뛰어 S3b 는 3.48초에 빠진다',
      inputs: [
        [0.2, 'spawn'],
        [0.4, 'spawn'],
        [0.6, 'splitter'],
        [1.0, 'spawn'],
      ],
    },
  ],
  diagram: {
    nodes: [
      { id: 'runner', label: 'SwarmRunner', sub: 'MonoBehaviour · Update 하나', x: 50, y: 8 },
      { id: 'swarm', label: 'DroneSwarm', sub: '코어 · Tick 이 목록을 돈다', x: 50, y: 36 },
      { id: 'dead', label: '지울 표시', sub: 'Drone.IsDead', x: 17, y: 64, kind: 'object' },
      { id: 'pending', label: '대기 목록', sub: '도는 중에 만든 드론', x: 83, y: 64, kind: 'object' },
      { id: 'drone', label: 'Drone', sub: 'Update(dt, swarm)', x: 50, y: 92, kind: 'object' },
    ],
    edges: [
      { id: 'runner-swarm', from: 'runner', to: 'swarm', label: 'Tick(Time.deltaTime)', kind: 'call' },
      { id: 'swarm-drone', from: 'swarm', to: 'drone', label: '드론마다 Update', kind: 'call' },
      { id: 'drone-dead', from: 'drone', to: 'dead', label: 'Despawn(this)', kind: 'call' },
      { id: 'drone-pending', from: 'drone', to: 'pending', label: 'Spawn(조각)', kind: 'call' },
      { id: 'swarm-dead', from: 'swarm', to: 'dead', label: '루프 끝 RemoveAll', kind: 'ref' },
      { id: 'swarm-pending', from: 'swarm', to: 'pending', label: '루프 끝 합치기', kind: 'ref' },
    ],
  },
  naiveDiagram: {
    nodes: [
      { id: 'nmgr', label: 'NaiveDroneManager', sub: 'for (i < drones.Count)', x: 50, y: 10 },
      { id: 'ndrone', label: 'NaiveDrone', sub: 'Update 안에서 Remove · Add', x: 17, y: 50 },
      { id: 'nidx', label: 'i', sub: 'Remove 뒤에도 i++', x: 83, y: 50, kind: 'object' },
      { id: 'nlist', label: 'drones', sub: 'List<NaiveDrone> · 도는 중에 바뀜', x: 50, y: 90, kind: 'object' },
    ],
    edges: [
      { id: 'nmgr-ndrone', from: 'nmgr', to: 'ndrone', label: 'drones[i].Update', kind: 'call' },
      { id: 'ndrone-nlist', from: 'ndrone', to: 'nlist', label: 'Remove(this) · Add', kind: 'call' },
      { id: 'nmgr-nidx', from: 'nmgr', to: 'nidx', label: 'i++', kind: 'ref' },
      { id: 'nidx-nlist', from: 'nidx', to: 'nlist', label: '당겨진 칸을 넘음', kind: 'ref' },
    ],
  },
  steps: [
    {
      n: 1,
      label: '매니저가 목록을 처음부터 돌며 드론마다 Update 를 부른다',
      body: '엔진이 부르는 `Update` 는 `SwarmRunner` 하나뿐이다. 거기서 `DroneSwarm.Tick(Time.deltaTime)` 이 드론 목록을 처음부터 돌며 드론마다 `drone.Update(dt, this)` 를 부르고, 드론은 자기 위치를 옮기고 업데이트 횟수(u)를 올린다. 같은 프레임에 태어난 드론끼리는 u 가 늘 같다. 드론이 세 줄로 나뉜 것은 겹쳐 보이지 않게 한 화면에만 있는 높이다.',
      target: 'runner-swarm,swarm-drone',
    },
    {
      n: 2,
      label: '드론이 빠지겠다고 하면 표시만 한다',
      body: '기지에 닿거나 HP 가 0 인 드론은 자기 Update 안에서 `swarm.Despawn(this)` 를 부른다. `Despawn` 은 `IsDead` 를 켜고 `DespawnRequested` 를 알릴 뿐 목록을 건드리지 않는다. 그래서 도는 중인 목록의 칸이 당겨지지 않고, 바로 다음 드론도 이번 프레임에 Update 된다. 자동 데모 1.70초 EMP 에서 넷이 한꺼번에 표시돼도 S4 는 그대로 움직인다.',
      target: 'drone-dead,dead',
    },
    {
      n: 3,
      label: '새 드론은 대기 목록에 넣는다',
      body: '분열 드론은 `splitDelay` 가 지나면 자기 Update 안에서 조각을 만들어 `swarm.Spawn(조각)` 에 넘기고 자기는 `Despawn` 한다. 도는 중이면 `Spawn` 은 조각을 대기 목록에 넣는다 (루프 밖에서 들어온 출발 입력은 바로 목록에 넣는다). 그래서 조각은 만들어진 프레임에는 Update 되지 않는다.',
      target: 'drone-pending,pending',
    },
    {
      n: 4,
      label: '루프가 끝나면 표시된 드론을 지우고 대기 목록을 합친다',
      body: '루프가 끝나면 표시된 드론을 떠서 하나씩 `Despawned` 로 알린 뒤 (목록에서 지우기 직전이라 핸들러 안의 `Drones.Count` 는 옛 값이다) `RemoveAll` 로 한꺼번에 지운다. 알림을 받은 쪽이 다른 드론을 또 `Despawn` 하면 새 표시가 없을 때까지 되풀이한다. 그다음 대기 목록을 목록 뒤에 붙이는데, 대기 중에 빠지기를 요청한 드론은 붙이지 않는다. 합친 조각은 다음 프레임부터 Update 된다. `SwarmRunner` 는 `Despawned` 에서 드론 오브젝트를 `Destroy` 한다. Unity 의 `Destroy` 도 그 자리에서 지우지 않고 그 프레임의 Update 가 끝날 때까지 미루는데, 같은 생각이다. 왼쪽 위의 합침·지움 숫자가 이 순간의 수다 (한 프레임뿐이라 웹 무대는 0.4초 남겨 보인다).',
      target: 'swarm-dead,swarm-pending',
    },
  ],
  offNote: '증상은 "EMP 로 여러 대를 잡았더니 남은 드론 하나가 줄에서 뒤처진다" 이다. 원인은 매니저의 `for (int i = 0; i < drones.Count; i++) drones[i].Update(dt, this);` 안에서 드론이 자기를 바로 `drones.Remove(this)` 하는 흔한 코드다. `Remove` 는 뒤 드론을 한 칸씩 당기는데 루프는 그대로 `i++` 해서, 지워진 드론 바로 다음 드론이 그 프레임에 Update 되지 않는다 (업데이트 건너뜀). 분열 드론이 조각을 바로 `drones.Add` 하면 루프가 늘어난 `Count` 를 읽어 조각이 태어난 프레임에 움직인다 (태어난 프레임에 움직임). 한 프레임은 0.05m 안팎이라 위치로는 잘 안 보이므로 숫자로 본다: 드론 위의 u 는 받은 업데이트 횟수, 빨간 "있어야 u" 는 패턴 코드였다면 받았을 횟수다.',
  mistakes: [
    {
      title: '적 여럿이 한꺼번에 죽은 프레임에 살아남은 적 하나가 한 박자 늦게 움직인다',
      body: '목록을 `for` 로 도는 중에 `Remove` 했다. 지운 칸 뒤가 한 칸씩 당겨지는데 `i++` 는 그대로라 바로 다음 원소를 건너뛴다. 빠질 것은 표시(`IsDead`)만 하고 루프가 끝난 뒤 `RemoveAll(d => d.IsDead)` 로 한꺼번에 지운다. `RemoveAt` 은 지운 칸 뒤를 매번 당기지만 `RemoveAll` 은 한 번 훑으며 남길 것만 앞으로 모은다.',
    },
    {
      title: '`foreach` 로 바꿨더니 `InvalidOperationException: Collection was modified` 가 난다',
      body: '`List<T>` 의 열거자는 도는 중에 목록이 바뀌면 다음 칸으로 넘어갈 때 예외를 던진다. 그 프레임의 나머지 드론은 Update 되지 않고 매니저의 Update 도 거기서 끝난다 (Unity 는 Console 에 오류를 남기고 다음 프레임에 다시 부르므로, 드론이 죽거나 나뉠 때마다 오류가 난다). 도는 중에는 목록을 바꾸지 않는 것이 해법이고, 그러면 이 표본의 `Tick` 처럼 `foreach` 로 돌아도 안전하다.',
    },
    {
      title: '분열로 만든 적이 만들어진 프레임에 벌써 한 걸음 가 있다',
      body: '도는 중에 `Add` 했다. `i < drones.Count` 는 매번 `Count` 를 다시 읽어 방금 붙인 드론까지 돈다. 새 드론이 Update 에서 또 무언가를 만들면 한 프레임 안에서 끝없이 늘 수도 있다. 새 드론은 대기 목록에 넣고 루프가 끝난 뒤 합친다. 루프 전에 `int count = drones.Count;` 로 세어 그만큼만 도는 방법도 있지만 (Nystrom), 도는 중의 `Remove` 와 함께 쓰면 칸 번호가 다시 어긋나고, 루프 전에 센 `count` 로 돌면서 `Remove` 하면 줄어든 목록의 끝을 넘어 `ArgumentOutOfRangeException` 도 난다.',
    },
    {
      title: '거꾸로 돌기로 고쳤는데 이웃을 터뜨리는 드론을 넣자 한 드론이 두 번 움직인다',
      body: '`for (int i = drones.Count - 1; i >= 0; i--)` 로 돌면 자기를 지울 때 당겨지는 칸은 이미 돈 드론이고, 끝에 `Add` 한 드론도 시작 때의 `Count` 밖이라 이번 프레임에 돌지 않는다. 그러나 이것은 "자기만 지우고 끝에만 더할 때" 만 맞는다. 앞쪽(아직 안 돈 칸)의 이웃을 지우면 지금 드론이 한 칸 당겨져 다음 반복에서 또 Update 되고, 중간에 `Insert` 하면 다른 드론을 건너뛴다. 도는 순서도 뒤에서 앞으로 바뀐다. 표시 후 정리에서는 도는 중에 어느 드론이 어느 드론을 지워도 목록 칸이 움직이지 않는다: 표시된 드론은 그 프레임의 나머지 차례를 건너뛰고, 나머지는 모두 한 번씩 Update 된다. 만든 드론은 대기 목록에 있다가 루프 뒤에 합치고, 같은 프레임에 만들고 지운 드론은 합치지 않는다. `Despawned` 를 받은 쪽이 또 지우면 새 표시가 없을 때까지 정리를 되풀이한다.',
    },
    {
      title: 'Destroy 한 적을 목록이 계속 들고 있다가 `MissingReferenceException` 이 난다',
      body: '매니저 목록에 `GameObject` 나 컴포넌트를 넣어 두고 다른 곳(총알, 폭발)에서 `Destroy` 하면, 목록에는 파괴된 오브젝트가 남는다. C# 참조는 진짜 null 이 아니라 `== null` 만 참이 되고, 다음 프레임에 그 `transform` 을 건드리는 순간 예외다. 이 표본은 코어 드론과 화면 오브젝트를 나눠, 코어 목록에서 지울 때(`Despawned`) 오브젝트를 `Destroy` 하고 짝 사전에서도 뺀다. 다른 곳에서 적을 없앨 때도 오브젝트를 직접 `Destroy` 하지 말고 `swarm.Despawn` 을 부른다.',
    },
  ],
  unity: {
    setup: [
      '`Core/` 와 `Unity/` 폴더를 `Assets/Patterns/update-method-drone-list/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.',
      '드론 프리팹: 2D 프로젝트면 `GameObject > 2D Object > Sprites > Triangle`, Universal 3D 프로젝트면 `GameObject > 3D Object > Cube` 로 하나 만든다 (Sprites 메뉴는 2D Sprite 패키지가 있어야 보인다). Scale 을 (0.6, 0.6, 0.6) 으로 하고 Hierarchy 에서 Project 창으로 끌어 프리팹을 만든 뒤, 장면에 남은 것은 지운다. 스크립트는 붙이지 않는다.',
      '기지 그림: 같은 메뉴로 Square(3D 는 Cube)를 하나 만들어 이름을 `Base` 로 바꾸고 Position (-7.2, -1, 0), Scale (1, 4, 1) 에 둔다. 자리 표시일 뿐 스크립트가 없다.',
      '`GameObject > Create Empty` 로 `Drone Swarm` 을 만들어 Position (-8, -2.5, 0) 에 두고 `SwarmRunner` 를 붙인다. 붙이는 순간 `Reset` 이 기본 키(Q 드론 출발, W 분열 드론 출발, E EMP)를 넣는다. `Drone Prefab` 칸에 2단계의 프리팹을 넣는다. 드론은 월드 x 6.8 에 나타나 x -6.2 에서 기지에 닿고, 세 줄은 `Lane Gap` 1.5 간격으로 월드 y -2.5, -1, 0.5 에 놓인다.',
      '`Main Camera` 를 Position (0, 0, -10) 에 두고 Projection 을 `Orthographic`, Size 를 5 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). Game 뷰 비율을 16:9 로 두면 가로 -8.9 ~ 8.9, 세로 -5 ~ 5 가 보여 기지, 드론이 나타나는 자리, 세 줄이 모두 화면에 들어온다.',
      'Play 하고 Q 를 세 번, W 를 한 번 누른 뒤 E 를 누른다. Console 에 `[Swarm] D1 HP 0 → 지울 표시` 같은 줄이 모두 나온 다음 `[Swarm] D1 목록에서 지움` 줄들이 이어지고, Hierarchy 의 `Drone Swarm` 아래 드론 오브젝트가 사라진다. 분열 드론은 나오고 1초 뒤 `S4a 대기 목록에 (분열)` 을 남기고 조각 둘로 바뀐다. Game 뷰 왼쪽 위에 `목록 n · 이번 프레임 업데이트 n · 합침 n · 지움 n` 이 보인다.',
    ],
    verify: '분열 드론이 나뉘는 프레임에 Console 에 `대기 목록에 (분열)` 줄들, `분열 → 지울 표시`, `목록에서 지움`, `목록에 들어옴` 줄들이 이 순서로 나오고, EMP 로 여러 대를 잡아도 `지울 표시` 줄이 모두 나온 뒤에야 `목록에서 지움` 줄이 나온다.',
    pitfalls: [
      'Unity 의 `MonoBehaviour.Update` 자체가 업데이트 메서드 패턴이다: 엔진이 켜진 컴포넌트를 돌며 `Update` 를 부르고, 그 도중의 `Destroy` 는 그 프레임의 Update 가 끝날 때까지 미룬다. 드론마다 `Update` 를 두는 대신 이 표본처럼 매니저 하나가 목록을 돌면, 수백 대일 때 엔진이 스크립트의 `Update` 를 부르는 횟수가 드론 수에서 한 번으로 줄고, 도는 순서와 생기고 사라지는 시점도 코드에 드러난다.',
      '코어 시간은 `Tick(Time.deltaTime)` 으로 받는다. `Time.timeScale` 이 0(일시정지)이어도 `SwarmRunner.Update` 는 불려 `Tick(0)` 이 돈다: 드론은 멈추지만 업데이트 횟수(u)는 계속 오르고, EMP 로 HP 0 이 된 드론은 그대로 빠진다. 일시정지 중에 드론을 아예 멈추려면 `Time.deltaTime` 이 0 일 때 `Tick` 을 부르지 않는다.',
      'Play 중에 바꾼 `Move Speed`, `Split Delay`, `Split Count` 는 `OnValidate` 가 코어 설정에 넣어 다음 프레임부터 쓴다. `Lane Gap` 은 위치를 옮길 때마다 읽어 바로 반영되고, `Splitter Scale` 은 다음에 나오는 분열 드론부터 쓴다.',
      '왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다. 합침·지움 숫자는 마지막 프레임의 루프가 끝난 뒤 합치고 지운 수라, 분열이나 파괴가 있던 한 프레임에만 0 이 아니다 (웹 무대는 보이게 0.4초 남긴다).',
    ],
  },
  prompt: {
    goal: '드론 매니저가 드론 목록을 매 프레임 돌며 drone.Update(dt) 를 부르고, 업데이트 중에 빠지는 드론은 표시만, 새로 만든 드론은 대기 목록에만 넣었다가 루프가 끝난 뒤 RemoveAll 과 합치기로 정리해, 건너뛰거나 태어난 프레임에 움직이는 드론이 없게 한다.',
    adaptIdeas: [
      '폭발하는 드론이 주변 드론에게 피해를 줘서, 한 드론의 Update 안에서 다른 드론이 빠지게 하고 싶다.',
      '드론 오브젝트를 Destroy 하지 않고 오브젝트 풀에 돌려주고 다시 쓰고 싶다.',
      '수백 대일 때 화면 밖 드론은 몇 프레임에 한 번만 업데이트하고 싶다.',
      '드론 종류(보통, 분열, 방패)마다 다른 Update 를 인터페이스로 나누고 싶다.',
      '슬로 모션 중에는 드론에 넘기는 dt 를 줄이고, 일시정지 중에는 Tick 을 멈추고 싶다.',
    ],
  },
  inspiredBy: [],
  original: '특정 게임의 재현이 아니라 널리 쓰이는 업데이트 메서드 패턴을 잔해 드론 무리에 적용했다. 인물과 문구는 이 갤러리의 가상 세계(외곽 탐사대)이고, 코드는 이 갤러리에서 새로 작성했다.',
  references: [
    { label: 'Game Programming Patterns: Update Method (Robert Nystrom)', url: 'https://gameprogrammingpatterns.com/update-method.html' },
    { label: 'Microsoft 문서: List<T>.RemoveAll', url: 'https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1.removeall' },
    { label: 'Microsoft 문서: List<T>.RemoveAt', url: 'https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1.removeat' },
  ],
  related: [
    { id: 'object-pool-projectiles', why: '빠진 드론을 Destroy 하는 대신 풀에 돌려줄 수 있다. 돌려주는 시점도 루프가 끝난 뒤(Despawned)여야 같은 프레임에 다시 빌려 가지 않는다' },
    { id: 'event-queue-sound', why: '같은 생각의 다른 쓰임이다. 도는 중에 생긴 요청을 바로 처리하지 않고 모아 두었다가 정해진 때에 한꺼번에 처리한다' },
  ],
}
