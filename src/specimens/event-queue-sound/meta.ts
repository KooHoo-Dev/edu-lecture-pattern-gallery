import type { PatternMeta } from '../../stage/types.ts'

export const meta: PatternMeta = {
  id: 'event-queue-sound',
  title: '이벤트 큐: 효과음 요청 모으기',
  titleEn: 'Event Queue: Batching Sound Requests',
  pattern: '이벤트 큐',
  group: 'B',
  order: 2,
  oneLiner: '효과음을 바로 틀지 않고 큐에 모아, 같은 프레임의 같은 소리는 합치고 빈 채널이 나면 차례로 튼다',
  goals: [
    '일제 사격처럼 한 프레임에 요청이 몰릴 때, 요청 즉시 빈 AudioSource 를 찾아 트는 사운드 매니저가 왜 같은 소리를 겹쳐 키우고 웨이브 끝 알림을 버리는지 설명할 수 있다.',
    '요청(`Request`)과 처리(`Tick`)를 시간으로 떼어 놓아, 같은 프레임의 같은 소리는 합치고 빈 채널이 없으면 기다리게 할 수 있다.',
    '고정 크기 링 버퍼(head, tail)로 큐를 만들고, 꽉 찼을 때와 처리 중에 새 요청이 들어올 때(재진입)를 다룰 수 있다.',
    '관찰자(알리면 그 자리에서 바로 반응)와 이벤트 큐(모았다가 나중에 처리)의 차이를 말하고, 소리가 조금 늦게 나는 것이 의도라는 것을 설명할 수 있다.',
  ],
  tags: ['효과음', '링 버퍼', '요청 합치기'],
  difficulty: 2,
  params: [
    { key: 'maxVoices', label: '스피커 채널 수', type: 'range', min: 1, max: 6, step: 1, default: 4, unit: '개', hint: '채널(AudioSource) 칸 수. 줄이면 패턴은 알림이 큐에서 기다렸다 늦게 나오고(1개면 자동 데모에서도), 나쁜 예는 폭발이 채널을 다 차지해 알림을 버린다. 일제 사격 때 남은 드론 수 + 1 이상이면 (자동 데모 5, 새 웨이브 직후 6) 나쁜 예도 일제 사격의 폭발과 알림이 모두 들어가 알림은 살지만, 폭발은 그대로 겹친다' },
    { key: 'soundLength', label: '소리 길이', type: 'range', min: 0.3, max: 1.5, step: 0.1, default: 0.8, unit: '초', hint: '소리 하나가 채널을 쓰는 시간. 칸 아래 막대가 남은 시간이다 (막대 끝은 1.5초로 고정). 길수록 채널이 오래 찬다. 패턴은 빈 채널을 기다리는 요청이 그만큼 늦게 나오고 (채널 하나일 때 알림이 폭발 뒤 이만큼 기다린다), 나쁜 예는 단발을 연달아 누를 때 더 빨리 채널이 차서 버린다. 자동 데모의 첫 폭발은 1.5초여도 일제 사격(2.0초) 전에 끝난다' },
    { key: 'explosionVolume', label: '폭발음 음량', type: 'range', min: 0.1, max: 0.8, step: 0.05, default: 0.5, hint: '폭발 요청 하나의 음량. 미터는 지금 울리는 채널 음량의 합이고 기준선 1.0 은 고정이다. 나쁜 예는 폭발 수만큼 더해져 0.3 이상이면 자동 데모에서 기준을 넘는다 (4 × 0.3). 패턴은 폭발을 하나로 합쳐 폭발 + 알림(0.4)이라, 0.65 이상이면 패턴도 넘는다. 합치기는 같은 소리만 줄인다' },
  ],
  presets: [
    { id: 'standard', name: '기본', look: '채널 4개. 패턴은 합친 폭발 하나와 알림, 나쁜 예는 폭발 넷이 채널을 모두 채운다', values: {} },
    { id: 'small-speaker', name: '작은 스피커', look: '채널 2개. 패턴은 두 칸으로 충분하고, 나쁜 예는 폭발 둘이 다 차지해 알림을 버린다', values: { maxVoices: 2 } },
    { id: 'one-voice', name: '채널 하나', look: '패턴은 알림이 폭발이 끝날 때까지 큐에서 기다렸다 나온다', values: { maxVoices: 1 } },
    { id: 'long-sounds', name: '긴 소리', look: '소리 하나가 1.4초 동안 채널을 잡아, 일제 사격 뒤 채널이 새 웨이브 무렵까지 찬다', values: { soundLength: 1.4 } },
    { id: 'loud-explosion', name: '큰 폭발음', look: '패턴도 폭발과 알림이 함께 울려 기준을 넘는다. 합치기는 같은 소리만 줄인다', values: { explosionVolume: 0.7 } },
  ],
  events: [
    { id: 'shot', label: '단발' },
    { id: 'volley', label: '일제 사격' },
    { id: 'wave', label: '새 웨이브' },
  ],
  keys: { KeyQ: 'shot', KeyW: 'volley', KeyE: 'wave' },
  scenarios: [
    {
      id: 'shot-then-volley',
      label: '단발, 소리가 끝난 뒤 일제 사격, 새 웨이브, 단발',
      duration: 5.5,
      note:
        '자동 데모. 0.30초 단발은 폭발 하나라 두 모드가 같다 (채널 1). 그 소리가 끝난 뒤 2.00초 일제 사격이 남은 드론 넷의 폭발과 웨이브 끝 알림을 한 프레임에 요청한다. ' +
        '패턴은 폭발 넷을 큐에서 `폭발 ×4` 한 칸으로 합치고(합침 3), 같은 프레임의 Tick 에서 채널 1 에 폭발(0.50), 채널 2 에 알림(0.40)을 튼다. 음량 합은 0.90 이다. ' +
        '나쁜 예는 폭발 넷이 채널 넷을 모두 채워 음량 합 2.00 이 되고 (소리 겹침), 이어 온 알림은 빈 칸이 없어 버린다 (알림 잘림). 3.40초 새 웨이브 뒤 4.00초 단발은 다시 두 모드가 같다',
      inputs: [
        [0.3, 'shot'],
        [2.0, 'volley'],
        [3.4, 'wave'],
        [4.0, 'shot'],
      ],
    },
    {
      id: 'spaced-shots',
      label: '단발만 간격을 두고 다섯 번',
      duration: 5.5,
      note: '단발만 1초 간격으로 다섯 번 쏜다 (0.30, 1.30, 2.30, 3.30, 4.30초). 앞 폭발이 다음 단발 전에 끝나 매번 채널 1 이 비어 있다. 4.30초 마지막 드론에서는 폭발과 알림이 한 프레임에 오지만 둘뿐이라 채널 1, 2 에 함께 들어간다. 요청이 채널 수보다 몰리지 않으면 바로 재생해도 두 모드가 같다. 나쁜 예가 평소 테스트에서는 멀쩡해 보이는 까닭이다',
      inputs: [
        [0.3, 'shot'],
        [1.3, 'shot'],
        [2.3, 'shot'],
        [3.3, 'shot'],
        [4.3, 'shot'],
      ],
    },
    {
      id: 'two-voices-wait',
      label: '채널 2개: 알림이 큐에서 기다렸다 나온다',
      duration: 3.5,
      values: { maxVoices: 2 },
      note:
        '채널 2개. 0.30초 단발의 폭발이 채널 1 을 잡은 채 0.60초 일제 사격을 넣는다. 패턴은 폭발 넷을 합쳐 채널 2 에 틀고, 알림은 빈 채널이 없어 큐에 남았다가 1.12초에 채널 1 이 비자 나온다 (0.52초 기다림). ' +
        '나쁜 예는 채널 2 에 폭발 하나를 넣고 나머지 폭발 셋과 알림을 버린다 (알림 잘림). 이때 두 채널이 다 폭발이지만 하나는 0.30초 단발에서 먼저 시작한 소리라, 패턴도 채널 1 의 단발 폭발과 채널 2 의 합친 폭발이 함께 울린다. 두 모드가 같은 겹침이라 소리 겹침 ✖ 는 없다. ' +
        '1.80초 새 웨이브 뒤 2.20초 일제 사격 때는 두 채널이 모두 비어 있다. 패턴은 `폭발 ×5` 와 알림으로 두 채널이면 충분하고, 나쁜 예는 폭발 둘이 함께 시작해 두 채널을 차지하고 또 알림을 버린다. 함께 시작한 폭발 둘의 음량 합이 1.00 이라 기준을 넘지 않아 여기서도 소리 겹침 ✖ 는 없다',
      inputs: [
        [0.3, 'shot'],
        [0.6, 'volley'],
        [1.8, 'wave'],
        [2.2, 'volley'],
      ],
    },
  ],
  diagram: {
    nodes: [
      { id: 'input', label: 'DroneLineInput', sub: 'MonoBehaviour · 파괴 구독', x: 17, y: 12 },
      { id: 'drones', label: 'DroneLine', sub: '코어 · Destroyed · WaveCleared', x: 83, y: 12 },
      { id: 'queue', label: 'SoundQueue', sub: '링 버퍼 · 같은 id 합치기', x: 50, y: 50 },
      { id: 'player', label: 'SoundQueuePlayer', sub: 'MonoBehaviour · Update 에서 Tick', x: 17, y: 88 },
      { id: 'channels', label: '채널 (SoundChannel)', sub: '코어 · maxVoices 개', x: 83, y: 88, kind: 'object' },
    ],
    edges: [
      { id: 'input-drones', from: 'input', to: 'drones', label: 'Shot · Volley · 구독', kind: 'call' },
      { id: 'input-queue', from: 'input', to: 'queue', label: 'Request', kind: 'call' },
      { id: 'player-queue', from: 'player', to: 'queue', label: 'Tick · Played 구독', kind: 'call' },
      { id: 'queue-channels', from: 'queue', to: 'channels', label: 'Tick 에서 꺼내 재생', kind: 'ref' },
      { id: 'player-channels', from: 'player', to: 'channels', label: 'AudioSource.Play()', kind: 'call' },
    ],
  },
  naiveDiagram: {
    nodes: [
      { id: 'ndrones', label: 'NaiveDroneLine', sub: '파괴 처리 안에서 Play', x: 17, y: 12 },
      { id: 'nmgr', label: 'NaiveSoundManager', sub: '빈 AudioSource 를 찾아 바로 Play', x: 50, y: 50 },
      { id: 'ndrop', label: '버림', sub: '빈 칸이 없으면 return false', x: 17, y: 88, kind: 'object' },
      { id: 'nsources', label: 'AudioSource 풀', sub: '같은 소리도 칸마다 따로', x: 83, y: 88, kind: 'object' },
    ],
    edges: [
      { id: 'ndrones-nmgr', from: 'ndrones', to: 'nmgr', label: 'Play (파괴마다 바로)', kind: 'call' },
      { id: 'nmgr-nsources', from: 'nmgr', to: 'nsources', label: '빈 칸에 Play()', kind: 'call' },
      { id: 'nmgr-ndrop', from: 'nmgr', to: 'ndrop', label: '빈 칸 없음', kind: 'ref' },
    ],
  },
  steps: [
    {
      n: 1,
      label: '드론 파괴 처리는 소리를 요청만 하고 바로 돌아간다',
      body: '`DroneLine` 이 드론을 파괴하면 `Destroyed` 를 알리고, 구독한 `DroneLineInput` 이 `SoundQueue.Request(id, 음량)` 를 부른다. `Request` 는 요청을 링 버퍼의 tail 칸에 넣고 돌아간다. 여기서는 소리를 틀지 않는다. 관찰자 패턴은 알리면 듣는 쪽이 그 자리에서 바로 일하지만, 이벤트 큐는 요청과 처리 사이에 시간을 둔다. 요청에는 값(소리 id, 음량)만 넣고 파괴된 드론의 참조는 넣지 않는다.',
      target: 'input-drones,input-queue,queue',
    },
    {
      n: 2,
      label: '같은 소리가 이미 대기 중이면 합친다',
      body: '일제 사격은 `Volley` 호출 하나 안에서 드론 넷을 차례로 파괴해 같은 프레임에 폭발 요청이 넷 온다. `Request` 는 큐를 앞에서부터 보고 같은 id 가 대기 중이면 칸을 늘리지 않고 `Count` 를 올리며 큰 음량을 남긴다 (`Merged`, 기록의 "합침 폭발 ×4"). 그래서 채널에는 `폭발 ×4` 한 칸만 들어간다. 아직 대기 중인 요청끼리만 합치므로, 이미 울리고 있는 폭발과는 합치지 않는다. Nystrom 이 짚은 절충대로, 합칠 수 있는 창은 요청이 큐에 머무는 시간만큼이다. 늦게 처리하면 더 합치지만 소리가 늦는다.',
      target: 'queue',
    },
    {
      n: 3,
      label: 'Tick 에서 빈 채널마다 큐 앞에서 하나씩 꺼내 튼다',
      body: '`SoundQueuePlayer.Update` 가 `Tick(Time.deltaTime)` 을 부르면 큐는 채널의 남은 시간을 줄이고, 빈 채널마다 head 칸을 꺼내 `Played(채널, id, 음량)` 를 알린다. 코어의 채널(`SoundChannel`)은 AudioSource 를 모르고, 연결 컴포넌트 `SoundQueuePlayer` 가 같은 번호의 AudioSource 에 클립과 음량을 넣고 `Play()` 한다. 꺼내는 수는 Tick 을 시작할 때의 대기 수까지라, `Played` 를 받은 쪽이 또 요청해도 다음 Tick 으로 미뤄진다 (재진입이 없다). 그래서 소리는 요청한 순간보다 늦게 날 수 있다 (늦어도 다음 프레임). 같은 프레임의 요청을 다 모은 뒤에 고르려는 의도된 지연이다. 기록에서 요청과 재생이 같은 시각인 것은 하네스가 입력을 넣은 다음 같은 프레임의 Tick 을 돌리기 때문이다. Unity 에서도 Input System 콜백은 기본 설정에서 `Update` 보다 먼저 돌아 보통 같은 프레임에 나고, 다른 스크립트의 `Update` 에서 요청하면 실행 순서에 따라 다음 프레임에 난다.',
      target: 'player-queue,queue-channels,player-channels',
    },
    {
      n: 4,
      label: '빈 채널이 없으면 큐에서 기다린다 (버리지 않는다)',
      body: '채널이 모두 울리는 중이면 남은 요청은 큐에 그대로 두고, 다음 Tick 에 채널이 비면 꺼낸다. 세 번째 시나리오(채널 2개)에서 웨이브 끝 알림은 0.60초에 요청되어 1.12초에 나온다. 무대 큐 칸 옆에 "빈 채널을 기다린다" 가 보이는 동안이다. 버리는 것은 링 버퍼가 꽉 찼을 때뿐이고, 그때도 `Dropped` 로 알린다. 이 표본은 소리가 두 종류라 합치기 덕에 큐가 두 칸을 넘지 않는다.',
      target: 'queue',
    },
  ],
  offNote: 'Unity 에서는 일제 사격 한 번에 같은 폭발 클립 넷이 같은 순간 시작돼 한 소리가 네 배로 커져 찢어지듯 들리고, 웨이브 끝 알림은 들리지 않는다. 웹 무대에서는 채널 칸 넷이 모두 폭발로 차고 음량 미터가 기준선 1.0 을 넘는다 (소리 겹침). 원인은 요청하는 순간 빈 AudioSource 를 찾아 바로 트는 흔한 사운드 매니저다. 같은 프레임의 같은 폭발을 합칠 곳이 없고, 빈 칸이 없으면 `return false` 로 버리는데 부른 쪽은 반환값을 보지 않아 폭발 뒤에 오는 알림이 사라진다 (알림 잘림). 요청이 몰리지 않으면 패턴과 똑같이 들려서 평소 테스트로는 찾기 어렵다.',
  mistakes: [
    {
      title: '큐를 만들었는데 일제 사격 때 여전히 폭발음이 겹쳐 터진다',
      body: '`Request` 안에서 바로 빈 채널을 찾아 틀었거나 같은 소리 합치기를 빼먹었다. 안에서 바로 틀면 이름만 큐이고 나쁜 예와 같다. `Request` 는 넣기만 하고 재생은 `Tick` 에서만 하며, 넣을 때 같은 id 가 대기 중이면 칸을 늘리지 말고 합친다 (이 표본의 `Merged`). Unity 에서는 같은 폭발 클립이 같은 순간 여러 AudioSource 에서 시작돼 한 소리가 몇 배로 커져 찢어지듯 들린다.',
    },
    {
      title: '단발을 빠르게 연타하면 큐가 있어도 폭발음이 채널마다 겹친다',
      body: '합치기는 아직 큐에서 대기 중인 요청끼리만이다. 단발은 누를 때마다 다른 프레임에 요청이 오고, 그 프레임의 Tick 이 바로 꺼내 빈 채널에 틀기 때문에 앞 폭발이 울리는 동안 다음 폭발이 다른 채널에서 또 시작한다. 이 표본도 그렇고, 나쁜 예와 같은 증상이라 효과 끄기에서도 ✖ 를 쓰지 않는다. 막으려면 같은 id 가 최근 몇 초(예: 0.1초) 안에 시작됐으면 그 요청은 버리거나 그 채널에 합친다 (폭발은 늦으면 의미가 없다). 빈 채널을 기다리게 하면 폭발이 늦게 나서 아래 "몇 초 늦게" 항목의 문제가 된다 (이 표본에는 없다).',
    },
    {
      title: '효과음 하나 때문에 게임이 멈춘다 (끝없는 반복)',
      body: '큐를 처리하다가 `Played` 를 받은 쪽이 또 `Request` 하고, 처리 루프가 "큐가 빌 때까지" 돌면 새 요청을 같은 프레임에 또 처리한다. 서로를 부르는 소리(메아리, 연쇄 폭발)가 있으면 끝나지 않는다. 이 표본의 `Tick` 은 시작할 때의 대기 수(`ready`)만큼만 꺼내서, 처리 중에 들어온 요청은 다음 Tick 에 처리한다.',
    },
    {
      title: '웨이브 끝 알림처럼 중요한 소리가 가끔 안 들린다',
      body: '채널이 없을 때 조용히 버렸다. 나쁜 예의 `return false` 처럼 부른 쪽이 반환값을 보지 않으면 아무도 모른다. 큐는 빈 채널이 날 때까지 기다리게 하고, 정말 버려야 하는 경우(큐가 꽉 참)는 이벤트나 경고 로그로 알린다 (이 표본의 `Dropped` 와 SoundQueuePlayer 의 경고. 경고는 `Log Events` 를 꺼도 남는다). Unity 자체의 동시 재생 한도(Max Real Voices)에 걸려 가상 음성으로 밀린 소리도 안 들릴 수 있으니 함께 본다.',
    },
    {
      title: '요청이 쌓여 소리가 몇 초 늦게 나오거나 메모리가 늘어난다',
      body: '큐 크기에 제한이 없다. `List` 나 `Queue<T>` 에 계속 넣으면 처리가 밀릴 때 끝없이 자라고, 한참 전의 폭발이 뒤늦게 난다. 크기가 정해진 링 버퍼(head, tail)를 쓰면 배열을 새로 만들지 않고 넘칠 때가 분명하다. 이 표본은 `queueSize` 칸(기본 8)이고 꽉 차면 `Dropped` 를 알린다. 오래 기다린 요청을 버리는 규칙이 필요하면 요청에 요청 시각을 넣는다.',
    },
  ],
  unity: {
    setup: [
      '`Core/` 와 `Unity/` 폴더를 `Assets/Patterns/event-queue-sound/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.',
      '짧은 효과음 두 개(폭발, 알림. 1초 안쪽의 wav 나 ogg)를 Project 창에 넣는다. `GameObject > Create Empty` 로 `Speaker` 를 만들어 Position (0, 0, 0) 에 두고 `SoundQueuePlayer` 를 붙인다. `Clips` 표에 처음부터 있는 두 줄(Id `explosion`, `wave-alert`)의 Clip 칸에 폭발음과 알림음을 넣고, `Sound Length` 를 두 클립 중 긴 쪽의 길이에 맞춘다. Clip 칸을 비워 두면 그 소리를 처음 틀 때 Console 에 빨간 오류(`클립이 없다`)가 난다. AudioSource 는 직접 붙이지 않는다: Play 하면 `Awake` 가 `Max Voices` 개를 이 오브젝트에 만든다.',
      '드론 그림: 2D 프로젝트면 `GameObject > 2D Object > Sprites > Triangle`, Universal 3D 프로젝트면 `GameObject > 3D Object > Cube` 로 다섯 개를 만든다 (Sprites 메뉴는 2D Sprite 패키지가 있어야 보인다). 이름을 `Drone 1` ~ `Drone 5` 로 바꾸고 Position 을 (-2, 0, 0), (0, 0, 0), (2, 0, 0), (4, 0, 0), (6, 0, 0) 에 둔다. 같은 메뉴로 하나 더(Square 나 Cube) 만들어 `Turret` 이라 하고 (-6, 0, 0) 에 둔다. 포탑은 자리 표시일 뿐 스크립트가 없다.',
      '`GameObject > Create Empty` 로 `Drone Line` 을 만들고 `DroneLineInput` 을 붙인다. 붙이는 순간 `Reset` 이 기본 키(Q 단발, W 일제 사격, E 새 웨이브)를 넣는다. `Sounds` 칸에 `Speaker` 를 넣고, `Drone Views` 에 `Drone 1` ~ `Drone 5` 를 포탑에 가까운 것부터 차례로 넣는다 (칸 수가 드론 수다).',
      '`Main Camera` 를 Position (0, 0, -10) 에 두고 Projection 을 `Orthographic`, Size 를 5 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). Game 뷰 비율을 16:9 로 두면 가로 -8.9 ~ 8.9 가 보여 포탑과 드론 다섯이 모두 화면에 들어온다.',
      'Play 하고 Q 를 한 번, 소리가 끝난 뒤 W 를 누른다. 드론이 사라지고 Console 에 `[DroneLine] 드론 2 파괴`, `[SoundQueue] 요청 폭발 · 대기 1`, `[SoundQueue] 합침 폭발 ×2` … `[SoundQueue] 채널 1 재생 폭발 ×4 · 음량 0.50`, `[SoundQueue] 채널 2 재생 웨이브 끝 알림 · 음량 0.40` 이 차례로 남고, Game 뷰 왼쪽 위에 대기·합침·버림 수와 채널마다 울리는 소리가 보인다. Play 중 `Speaker` 의 Inspector 에 AudioSource 가 `Max Voices` 개 있고, 방금 튼 채널의 첫 칸 `Audio Generator` 에 그 클립이 들어가 있다. E 로 드론을 다시 세운다.',
    ],
    verify: 'Q 로 단발을 쏘고 소리가 끝난 뒤 W 로 일제 사격하면 Console 에 `합침 폭발 ×4` 가 나오고, 폭발음은 채널 하나에서 한 번 나며 웨이브 끝 알림이 다른 채널에서 함께 들린다.',
    pitfalls: [
      '`AudioSource.PlayOneShot` 은 앞 소리를 끊지 않고 겹친다. AudioSource 하나에 PlayOneShot 으로 바꾸면 채널이 모자라 버리는 일은 없어지지만, 일제 사격의 폭발은 그대로 한 프레임에 겹쳐 커지고 우리 풀의 채널 수 한도도 사라진다. 이 표본은 채널마다 `clip` 과 `volume` 을 넣고 `Play()` 한다 (`Play` 는 그 AudioSource 의 앞 소리를 끊는다). 이 채널 수(`maxVoices`)와 별개로 Unity 도 동시에 실제로 섞는 소리 수에 한도가 있다 (`Edit > Project Settings > Audio` 의 `Max Real Voices`). 넘치면 매 프레임 더 크게 들리는 소리부터 골라 실제로 섞고 나머지는 가상 음성으로 돌린다.',
      '코어는 클립 길이를 모르고 `soundLength` 동안 채널이 찬 것으로 본다. 클립이 더 길면 그 채널에 다음 소리가 들어올 때 `Play()` 가 앞 소리를 끊고, 더 짧으면 소리가 끝난 뒤에도 요청이 기다린다. 클립 길이가 제각각이면 요청에 길이를 넣거나 `OnPlayed` 에서 `clip.length` 를 코어 채널에 넣도록 고친다. `maxVoices` 와 `queueSize` 는 Play 를 시작할 때만 읽고, `soundLength` 는 `OnValidate` 가 넣어 다음 재생부터 쓴다.',
      '코어 시간은 `Tick(Time.deltaTime)` 으로 받는다. `Time.timeScale` 이 0(일시정지)이면 채널 시간이 줄지 않아 큐가 멈춘다 (이미 울리는 AudioSource 는 timeScale 과 상관없이 끝까지 난다). 일시정지 메뉴 소리도 이 큐로 내려면 `Time.unscaledDeltaTime` 으로 Tick 한다. `SoundQueuePlayer` 를 끄면 `Update` 가 멈춰 재생도 멈추지만 `Request` 는 계속 받아, 다시 켜면 쌓인 요청이 그때 한꺼번에 난다.',
      '요청에 곧 파괴될 드론의 `Transform` 이나 컴포넌트를 넣으면, 큐에서 꺼낼 때는 그 드론이 이미 파괴돼 소리가 엉뚱한 곳에서 나거나 `MissingReferenceException` 이 날 수 있다. 요청에는 값만 넣는다: 소리 id, 음량, 필요하면 파괴 순간의 위치(`Vector3`). 이 표본의 `SoundRequest` 는 id, 음량, 합친 수만 담는 struct 다.',
      '왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. UI 를 만드는 단계를 줄이려고 썼고, 실제 게임은 UGUI·TextMeshPro 로 만든다. 글은 이벤트를 받을 때 만들어 두고 `OnGUI` 는 그리기만 한다.',
    ],
  },
  prompt: {
    goal: '드론 파괴와 웨이브 끝 효과음을 바로 틀지 않고 고정 크기 링 버퍼 큐에 요청으로 모아, 같은 프레임의 같은 소리는 합치고 매 프레임 Tick 에서 빈 AudioSource 채널마다 하나씩 꺼내 틀며, 빈 채널이 없으면 큐에서 기다리게 한다.',
    adaptIdeas: [
      '같은 소리가 0.1초 안에 다시 요청되면 새 채널에 틀지 않고 버리거나 이미 울리는 채널에 합쳐, 연타해도 폭발이 겹쳐 커지지 않게 하고 싶다.',
      '소리마다 우선순위를 두고, 채널이 모자라면 웨이브 끝 알림 같은 중요한 소리를 먼저 꺼내고 싶다.',
      '파괴 위치를 요청에 값으로 넣어 폭발음이 그 자리(3D 위치)에서 나게 하고 싶다.',
      '0.5초 넘게 기다린 요청은 늦게 틀지 않고 버리고 싶다.',
      '대사(음성)와 효과음을 다른 큐와 다른 채널 풀로 나누고 싶다.',
    ],
  },
  inspiredBy: [],
  original: '특정 게임의 재현이 아니라 널리 쓰이는 이벤트 큐를 정비 기지 포탑의 효과음에 적용했다. 인물과 문구는 이 갤러리의 가상 세계(외곽 탐사대)이고, 코드는 이 갤러리에서 새로 작성했다. 웹 무대는 소리를 내지 않고 채널, 대기 큐, 음량 합을 그림으로 보인다.',
  references: [
    { label: 'Game Programming Patterns: Event Queue (Robert Nystrom)', url: 'https://gameprogrammingpatterns.com/event-queue.html' },
    { label: 'Unity 스크립트 레퍼런스: AudioSource.PlayOneShot (앞 소리를 끊지 않고 겹친다)', url: 'https://docs.unity3d.com/6000.3/Documentation/ScriptReference/AudioSource.PlayOneShot.html' },
    { label: 'Unity 매뉴얼: Audio 프로젝트 설정 (Max Real Voices)', url: 'https://docs.unity3d.com/6000.3/Documentation/Manual/class-AudioManager.html' },
  ],
  related: [
    { id: 'observer-health-events', why: '바로 부르는 알림의 다음 편이다. 관찰자는 알리는 순간 구독자가 바로 일하고, 이벤트 큐는 요청을 모아 두었다가 나중에 처리한다' },
    { id: 'object-pool-projectiles', why: '채널 AudioSource 묶음도 오브젝트 풀이다. 만들고 지우지 않고 빈 것을 골라 다시 쓴다' },
  ],
}
