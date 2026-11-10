import type { PatternMeta } from '../../stage/types.ts'

export const meta: PatternMeta = {
  id: 'game-loop-fixed-step',
  title: '게임 루프: 고정 시간 간격',
  titleEn: 'Game Loop: Fixed Time Step',
  pattern: '게임 루프',
  group: 'A',
  order: 6,
  oneLiner: '화면 프레임이 몇이든 게임 규칙은 같은 시간 간격으로 돌려, 30fps 와 144fps 에서 점프 높이가 같게 한다',
  goals: [
    '`Time.deltaTime` 을 곱해도 화면 프레임마다 바로 적분하면 왜 기기마다 점프 높이가 다르고, 렉 한 번에 벽을 건너뛰는지 설명할 수 있다.',
    '화면 프레임이 걸린 시간을 쌓아 두고 고정 간격(`fixedStep`)만큼씩 규칙을 돌리는 루프를 순수 C# 으로 만들 수 있다.',
    '한 프레임에 도는 단계에 상한(`maxStepsPerFrame`)을 두어 렉이 와도 게임이 잠깐 느려질 뿐 죽음의 나선에 빠지지 않게 할 수 있다.',
    'Unity 의 `FixedUpdate` 와 `Time.fixedDeltaTime` 이 같은 생각이라는 것을 알고, 입력은 화면 프레임에서 받아 다음 고정 단계로 넘길 수 있다.',
  ],
  tags: ['게임 루프', '고정 시간 간격', 'deltaTime', '프레임 속도', '보간'],
  difficulty: 2,
  params: [
    {
      key: 'fixedStep',
      label: '고정 간격',
      type: 'range',
      min: 0.01,
      max: 0.04,
      step: 0.005,
      default: 0.02,
      unit: '초',
      hint: '규칙 한 단계의 길이. Unity 의 `Time.fixedDeltaTime` 기본값이 0.02 다. 바꿔도 세 줄의 최고 높이는 늘 서로 같고 (0.01 이면 0.76m, 0.04 면 0.64m), 줄 왼쪽의 고정 단계 횟수가 바뀐다. 한 단계에 돌진이 15 × 간격 만큼 가므로 0.04 (0.6m)까지가 벽 두께 + 몸 폭 (0.8m) 안이다. 나쁜 예는 이 값을 쓰지 않는다',
    },
    {
      key: 'maxStepsPerFrame',
      label: '프레임당 단계 상한',
      type: 'range',
      min: 2,
      max: 12,
      step: 1,
      default: 5,
      unit: '회',
      hint: '한 화면 프레임에 도는 고정 단계의 최대 수. 넘친 시간은 버린다 (줄 왼쪽의 "버린 시간"). 렉 프레임(0.3초)은 기본값 5 로 0.1초만 돌고 0.2초를 버린다. 12 면 렉 하나를 거의 다 따라잡는다. 고정 간격 × 상한이 30fps 프레임(0.033초)보다 짧으면 렉이 없어도 30fps 줄이 매번 시간을 버려 느려진다. 나쁜 예는 이 값을 쓰지 않는다',
    },
    {
      key: 'lagSpike',
      label: '렉 프레임 길이',
      type: 'range',
      min: 0.1,
      max: 0.5,
      step: 0.05,
      default: 0.3,
      unit: '초',
      hint: '렉 입력 뒤 화면 프레임 하나가 걸리는 시간. 그동안 그 줄은 멈춰 있다. 나쁜 예는 이 dt 를 한 번에 곱해 돌진이 15 × 렉 길이 만큼 한 번에 간다 (0.3 이면 4.5m 로 벽 통과, 0.1 이면 1.5m 라 대개 벽에 걸린다). 패턴은 상한까지만 돌리고 나머지를 버린다',
    },
    {
      key: 'jumpSpeed',
      label: '점프 속도',
      type: 'range',
      min: 6,
      max: 10,
      step: 0.5,
      default: 8,
      unit: 'm/s',
      hint: '점프할 때 위로 주는 속도 (중력 40 m/s²). 클수록 높이 뛰고, 나쁜 예의 줄마다 높이 차이도 커진다 (8 이면 30fps 0.67m · 144fps 0.77m, 10 이면 1.09m · 1.22m)',
    },
  ],
  presets: [
    { id: 'standard', name: '기본 (50Hz)', look: 'Unity 기본과 같은 0.02초 간격. 세 줄의 최고 높이가 0.72m 로 같고, 렉 하나에 0.2초를 버린다', values: {} },
    { id: 'fine-step', name: '촘촘한 간격', look: '0.01초(100Hz) 간격. 30fps 줄은 한 프레임에 고정 단계를 3~4번 돌고, 최고 높이가 0.76m 로 실제 공식 값(0.8m)에 가까워진다', values: { fixedStep: 0.01, maxStepsPerFrame: 8 } },
    { id: 'coarse-step', name: '굵은 간격', look: '0.04초(25Hz) 간격. 144fps 줄은 여러 화면 프레임에 한 단계뿐이지만 보간 덕에 하린이 끊기지 않고, 세 줄이 같은 0.64m 를 뛴다', values: { fixedStep: 0.04 } },
    { id: 'tight-cap', name: '너무 낮은 상한', look: '0.01초 간격에 상한 2. 30fps 줄은 한 프레임에 3.3단계가 필요해 렉이 없어도 매번 시간을 버리고, 다른 줄보다 느리게 움직인다', values: { fixedStep: 0.01, maxStepsPerFrame: 2 } },
    { id: 'long-lag', name: '긴 렉', look: '렉 프레임 0.5초. 나쁜 예는 한 번에 7.5m 를 가 화면 밖까지 나가고, 패턴은 0.4초를 버린다', values: { lagSpike: 0.5 } },
  ],
  events: [
    { id: 'jump', label: '점프' },
    { id: 'dash', label: '돌진 (벽 쪽)' },
    { id: 'lag', label: '렉 (다음 화면 프레임 길게)' },
  ],
  keys: { KeyQ: 'jump', KeyW: 'dash', KeyE: 'lag' },
  scenarios: [
    {
      id: 'jump-dash-lag',
      label: '점프, 돌진, 렉 직전 돌진, 점프',
      duration: 6,
      note:
        '자동 데모. 세 줄이 같은 입력을 받는다. 0.30초 점프: 패턴은 다음 고정 단계에서 뛰어 (144fps 0.30초, 30·60fps 0.32초) 0.48초에 세 줄 모두 최고 0.72m, 점프 뒤 18단계(0.36초)에 착지한다. ' +
        '나쁜 예는 0.50초에 ✖ 프레임마다 다른 점프 (30fps 0.67m · 60fps 0.73m · 144fps 0.77m), 착지도 점프 뒤 0.33 · 0.38 · 0.39초로 다르다. ' +
        '1.30초 돌진은 패턴이 세 줄 모두 3.00m, 나쁜 예는 30·60fps 3.00m, 144fps 2.92m (돌진 시간이 프레임 단위로 끊긴다). ' +
        '2.40초 돌진 뒤 2.50초 렉: 세 줄 모두 화면 프레임 하나가 0.30초 걸려 2.78초에 끝난다. 패턴은 그 0.30초를 고정 단계 5번까지만 돌리며 한 단계씩 벽을 검사해 x 11.70 에서 막히고 0.20초(144fps 0.22초)를 버린다. ' +
        '나쁜 예는 dt 0.30초를 한 번에 곱해 4.5m 를 건너뛰어 ✖ 렉에 벽 통과 (x 10.50 → 15.00, 144fps 10.48 → 14.98). 3.60초 점프에서 나쁜 예는 벽 너머에서 3.80초에 다시 ✖ 프레임마다 다른 점프',
      inputs: [
        [0.3, 'jump'],
        [1.3, 'dash'],
        [2.4, 'dash'],
        [2.5, 'lag'],
        [3.6, 'jump'],
      ],
    },
    {
      id: 'lag-many',
      label: '렉 여러 번: 돌진 중, 서 있을 때, 공중에서',
      duration: 4.5,
      note:
        '렉을 다섯 번 낸다 (0.25, 1.00, 1.50, 2.30, 3.45초). 패턴은 렉마다 상한 5단계만 돌리고 0.20~0.22초를 버린다. 버린 시간은 끝에 1.03초(144fps 1.05초)로, 하린이 그만큼 늦을 뿐 규칙은 그대로다: 0.20초 돌진은 렉이 끼어도 3.00m, 2.20초 점프는 2.30초 렉이 공중에 끼어도 2.60초에 세 줄 모두 최고 0.72m, 3.40초 돌진은 3.77~3.78초에 x 11.70 벽에 막힌다. ' +
        '나쁜 예는 0.52~0.53초 렉 프레임 하나에 돌진이 5.00 · 5.25 · 5.33m 가고, 2.58초에 공중의 렉 프레임이 점프를 끊어 ✖ 프레임마다 다른 점프 (0.53 · 0.57 · 0.58m). ' +
        '3.40초 돌진에서 60·144fps 는 렉 전의 짧은 프레임에 벽에 닿아 3.42초에 막히지만, 30fps 는 프레임 하나에 0.5m 씩 가 렉 직전 x 11.50 에 있다가 3.72초에 ✖ 렉에 벽 통과 (→ 16.00)',
      inputs: [
        [0.2, 'dash'],
        [0.25, 'lag'],
        [1.0, 'lag'],
        [1.5, 'lag'],
        [2.2, 'jump'],
        [2.3, 'lag'],
        [3.4, 'dash'],
        [3.45, 'lag'],
      ],
    },
    {
      id: 'coarse-step',
      label: '굵은 고정 간격, 높은 점프, 짧은 렉',
      duration: 4,
      values: { fixedStep: 0.04, jumpSpeed: 10, lagSpike: 0.15 },
      note:
        '고정 간격 0.04초, 점프 속도 10, 렉 0.15초. 패턴은 0.55초에 세 줄 모두 최고 1.06m 이고, 렉 0.15초는 상한(5 × 0.04 = 0.2초) 안이라 버리지 않고 모두 따라잡으며 2.43초에 x 11.70 벽에 막힌다. ' +
        '나쁜 예는 0.55초 ✖ 프레임마다 다른 점프 (1.09 · 1.17 · 1.22m), 렉이 짧아도 벽 바로 앞이라 2.43초에 ✖ 렉에 벽 통과 (x 10.50 → 12.75, 벽 바로 뒤)',
      inputs: [
        [0.3, 'jump'],
        [1.3, 'dash'],
        [2.2, 'dash'],
        [2.3, 'lag'],
        [3.0, 'jump'],
      ],
    },
  ],
  diagram: {
    nodes: [
      { id: 'frame', label: '화면 프레임', sub: '기기마다, 렉마다 길이가 다름', x: 17, y: 10, kind: 'object' },
      { id: 'loop', label: 'RunnerLoop', sub: 'MonoBehaviour · Update', x: 83, y: 10 },
      { id: 'stepper', label: 'FixedStepper', sub: '코어 · 쌓인 시간 accumulator', x: 17, y: 50 },
      { id: 'runner', label: 'Runner', sub: '코어 · 중력, 점프, 돌진, 벽', x: 83, y: 50 },
      { id: 'dropped', label: '버린 시간', sub: 'maxStepsPerFrame 을 넘친 몫', x: 17, y: 90, kind: 'object' },
      { id: 'step', label: '고정 단계', sub: '늘 fixedStep 초', x: 50, y: 90, kind: 'object' },
      { id: 'view', label: '화면 위치', sub: '두 단계 사이 보간', x: 83, y: 90, kind: 'object' },
    ],
    edges: [
      { id: 'frame-loop', from: 'frame', to: 'loop', label: 'Time.deltaTime', kind: 'call' },
      { id: 'loop-stepper', from: 'loop', to: 'stepper', label: 'Advance(dt)', kind: 'call' },
      { id: 'loop-runner', from: 'loop', to: 'runner', label: 'RequestJump · RequestDash', kind: 'call' },
      { id: 'stepper-dropped', from: 'stepper', to: 'dropped', label: '상한 넘침', kind: 'ref' },
      { id: 'stepper-step', from: 'stepper', to: 'step', label: 'Stepped', kind: 'subscribe' },
      { id: 'step-runner', from: 'step', to: 'runner', label: 'Step(fixedStep)', kind: 'call' },
      { id: 'runner-view', from: 'runner', to: 'view', label: '보간', kind: 'ref' },
    ],
  },
  naiveDiagram: {
    nodes: [
      { id: 'nframe', label: '화면 프레임', sub: '기기마다, 렉마다 길이가 다름', x: 50, y: 8, kind: 'object' },
      { id: 'nupdate', label: 'NaiveRunner', sub: 'Update(dt) 에서 규칙을 바로', x: 50, y: 45 },
      { id: 'nwall', label: '벽 겹침 검사', sub: '건너뛴 벽은 못 잡음', x: 83, y: 50, kind: 'object' },
      { id: 'ngravity', label: '중력 적분', sub: 'velocityY -= gravity * dt', x: 17, y: 88, kind: 'object' },
      { id: 'ndash', label: '돌진 이동', sub: 'x += dashSpeed * dt', x: 50, y: 88, kind: 'object' },
    ],
    edges: [
      { id: 'nframe-nupdate', from: 'nframe', to: 'nupdate', label: 'Update(Time.deltaTime)', kind: 'call' },
      { id: 'nupdate-ngravity', from: 'nupdate', to: 'ngravity', label: '프레임 dt 그대로', kind: 'call' },
      { id: 'nupdate-ndash', from: 'nupdate', to: 'ndash', kind: 'call' },
      { id: 'ndash-nwall', from: 'ndash', to: 'nwall', label: '한 번에 4.5m', kind: 'ref' },
    ],
  },
  steps: [
    {
      n: 1,
      label: '화면 프레임마다 지난 시간을 쌓는다',
      body: '엔진이 부르는 `Update` 는 `RunnerLoop` 하나뿐이고, 거기서 `Stepper.Advance(Time.deltaTime)` 으로 그 프레임이 걸린 시간을 `accumulator` 에 더한다. 무대의 세 줄은 같은 입력을 받는 30·60·144fps 기기다: 무대가 1/60초씩 흐르면 144fps 줄은 화면 프레임을 2~3번, 30fps 줄은 두 번에 한 번 만들어 그때마다 `Advance` 를 부른다. 줄 왼쪽의 화면 프레임 횟수가 그 차이다. 입력은 `RequestJump`, `RequestDash` 로 요청만 남긴다.',
      target: 'frame-loop,loop-stepper,loop-runner',
    },
    {
      n: 2,
      label: '쌓인 시간이 고정 간격만큼 있으면 규칙을 한 단계씩 돌린다',
      body: '`while (accumulator >= FixedStep)` 동안 `FixedStep` 만큼 빼며 `Stepped` 를 알리고, 받은 `Runner.Step(fixedStep)` 이 중력, 점프, 돌진, 벽을 한 단계 진행한다. 규칙에 들어가는 시간이 늘 같은 0.02초라, 기기가 달라도 같은 단계를 같은 순서로 밟는다. 그래서 세 줄의 최고 높이(0.72m), 착지(점프 뒤 18단계), 돌진(3.00m)이 같다. 요청한 입력은 다음 단계가 읽으므로, 단계가 없는 144fps 프레임에 눌러도 놓치지 않는다 (그 대신 한 단계까지 늦게 뛴다).',
      target: 'stepper-step,step-runner,step',
    },
    {
      n: 3,
      label: '한 프레임에 너무 많이 쌓이면 상한까지만 돌리고 버린다',
      body: '렉으로 화면 프레임 하나가 0.30초 걸리면 15단계가 쌓인다. 다 돌리면 그 프레임이 더 길어지고 다음 프레임에 더 쌓이는 죽음의 나선이 될 수 있어, `maxStepsPerFrame`(5)번 돈 뒤 남은 시간을 버리고 `Dropped` 로 알린다. 하린은 그만큼 늦을 뿐, 한 단계에 0.3m 씩만 가며 단계마다 벽을 검사해 벽을 건너뛰지 않는다. 줄 왼쪽의 "버린 시간" 이 쌓인 몫이다.',
      target: 'stepper-dropped,dropped',
    },
    {
      n: 4,
      label: '화면은 마지막 두 단계 사이를 보간해 그린다',
      body: '`Runner.Step` 은 단계 처음에 `PrevX`, `PrevY` 를 남긴다. 화면은 `Alpha`(쌓인 시간 ÷ 고정 간격)로 직전 단계와 지금 단계 사이를 섞어 그린다. 144fps 기기는 화면 프레임 셋에 한 단계 정도라, 보간이 없으면 하린이 계단처럼 끊겨 움직인다 (Unity 의 `Interpolate` 칸으로 꺼 볼 수 있다). 보간은 화면에만 쓰고 규칙 상태는 바꾸지 않는다. 그 대가로 화면은 한 단계까지 늦게 보인다.',
      target: 'runner-view,view',
    },
  ],
  offNote:
    '증상은 "내 PC(144Hz)에서는 점프가 높은데 노트북(30fps)에서는 낮다" 와 "렉이 한 번 튀자 캐릭터가 벽을 뚫고 나갔다" 이다. 나쁜 예는 `Time.deltaTime` 을 빠뜨리지 않았다. 화면 프레임마다 `Update(dt)` 에서 `velocityY -= gravity * dt; y += velocityY * dt;` 로 바로 적분할 뿐이다. ' +
    '그런데 이 적분은 dt 가 클수록 첫 프레임부터 속도를 크게 깎아, 같은 점프 속도라도 30fps 는 0.67m, 60fps 는 0.73m, 144fps 는 0.77m 를 뛴다 (✖ 프레임마다 다른 점프. 세 줄이 같은 점프의 최고 높이에 닿으면 견준다). 어느 순서로 눌러도, 렉이 공중에 끼면 그 줄이 더 낮아질 뿐 원인은 같은 줄이다. ' +
    '돌진의 `x += dashSpeed * dt` 도 같은 문제다: 보통은 프레임 단위로 끊겨 144fps 만 2.92m 로 조금 짧고, 렉으로 화면 프레임 하나가 0.30초 걸리면 그 dt 를 한 번에 곱해 4.5m 를 간다. 벽 검사는 "지금 겹쳤는가" 만 보므로, 한 프레임에 벽 두께 + 몸 폭(0.8m)보다 멀리 가면 벽 앞에서 벽 뒤로 건너뛴다 (✖ 렉에 벽 통과). 벽 너머의 하린과 빨간 점선이 그 자리다. 렉 전에 이미 벽에 닿은 줄은 통과하지 않는다. ' +
    '무대의 줄 왼쪽 "최고 · 돌진" 숫자와 높이 선으로 세 줄을 견준다. Unity 에서도 같다: `Application.targetFrameRate` 나 모니터 주사율이 다르면 점프 높이가 달라지고, 렉 프레임에 얇은 콜라이더를 건너뛴다 (Unity 는 `Time.maximumDeltaTime` 보다 긴 `Time.deltaTime` 을 그 값으로 자르지만 기본 0.33초라 4.5m 는 그대로 간다).',
  mistakes: [
    {
      title: '내 PC 에서는 점프가 높은데 노트북에서는 낮다',
      body: '중력과 속도를 `Update` 에서 `Time.deltaTime` 으로 바로 적분했다. dt 를 곱해도 한 프레임 안에서는 속도가 그대로라고 보고 위치를 옮기므로, 프레임이 길수록(30fps) 오차가 커져 낮게 뜬다. 규칙은 고정 간격(`FixedUpdate` 나 이 표본의 `FixedStepper`)으로만 진행하면 기기와 상관없이 같은 높이가 된다. 물리를 `Update` 에서 돌리는 것도 같은 문제다.',
    },
    {
      title: '`Time.deltaTime` 을 빠뜨려 빠른 PC 에서 캐릭터가 더 빨리 달린다',
      body: '`x += speed;` 처럼 프레임마다 같은 거리를 더하면 1초에 프레임 수만큼 움직여 144fps 는 30fps 의 4.8배를 간다. 타이머를 `timer -= 1f / 60f;` 처럼 60fps 를 가정해 빼도 같다. 프레임마다 쓰는 값에는 dt 를 곱하되, 점프처럼 결과가 정확히 같아야 하는 규칙은 dt 를 곱해도 모자라므로 고정 간격으로 돌린다.',
    },
    {
      title: '렉이 한 번 튀자 캐릭터가 얇은 벽을 뚫고 나갔다',
      body: '한 프레임이 길면 그 dt 로 한 번에 멀리 가고, "지금 겹쳤는가" 만 보는 검사는 벽을 건너뛴다. 고정 간격으로 나누면 한 단계의 이동이 `속도 × fixedStep` 을 넘지 않아 단계마다 벽을 검사한다. 이 거리가 벽 두께 + 몸 폭보다 짧아야 하므로, 아주 빠른 물체는 지나온 길을 검사(스윕)하거나 Rigidbody 의 Collision Detection 을 Continuous 로 둔다.',
    },
    {
      title: '렉이 한 번 오면 게임이 점점 더 느려지다가 멈춘다',
      body: '밀린 시간을 모두 따라잡으려고 한 프레임에 단계를 끝없이 돌렸다. 단계를 많이 돈 프레임은 더 오래 걸리고, 다음 프레임에 더 많이 쌓여 더 많이 돈다 (죽음의 나선). 한 프레임의 단계 수에 상한(`maxStepsPerFrame`)을 두고 넘친 시간은 버린다. 게임이 잠깐 느려지는 대신 멈추지 않는다. Unity 에서는 Project Settings > Time 의 Maximum Allowed Timestep 이 이 구실을 한다.',
    },
    {
      title: '점프 키를 눌렀는데 가끔 안 먹는다',
      body: '"이번 프레임에 눌렸다" 는 값(`wasPressedThisFrame`)을 `FixedUpdate` 에서 읽었다. 고정 단계는 화면 프레임마다 돌지 않아서 (144fps 는 대부분의 프레임에 단계가 없다) 그 프레임의 누름을 보지 못한다. 입력은 `Update` 나 InputAction 콜백에서 받아 요청으로 남기고, 다음 고정 단계가 읽고 지운다 (이 표본의 `RequestJump`).',
    },
  ],
  unity: {
    setup: [
      '`Core/` 와 `Unity/` 폴더를 `Assets/Patterns/game-loop-fixed-step/` 에 둔다. `Naive/` 는 비교용 나쁜 예라 넣지 않는다. `Edit > Project Settings > Player` 의 Other Settings > Configuration 에 있는 Active Input Handling 이 `Input System Package (New)` 나 `Both` 여야 한다.',
      '`GameObject > Create Empty` 로 `Track` 을 만들어 Position (-9, -2, 0) 에 두고 `RunnerLoop` 를 붙인다. 붙이는 순간 `Reset` 이 기본 키(Q 점프, W 돌진, E 렉, R 처음 자리로)를 넣는다. 이 오브젝트 자리가 코어의 x 0, 땅 높이다.',
      '하린: 2D 프로젝트면 `GameObject > 2D Object > Sprites > Square`, Universal 3D 프로젝트면 `GameObject > 3D Object > Cube` 로 하나 만들어 이름을 `Harin` 으로 바꾸고 Scale 을 (0.6, 0.9, 1) 로 한다 (Sprites 메뉴는 2D Sprite 패키지가 있어야 보인다). `Track` 의 `Runner View` 칸에 끌어 넣는다. 위치는 Play 하면 코드가 정한다 (x 6, 발이 땅에 닿게).',
      '벽: 같은 메뉴로 하나 더 만들어 이름을 `Wall` 로 바꾸고 `Wall View` 칸에 넣는다. 자리와 크기는 코드가 코어 설정에 맞춰 정한다 (x 12, 두께 0.2, 높이 1.5).',
      '`Main Camera` 를 Position (0, 0, -10) 에 두고 Projection 을 `Orthographic`, Size 를 5 로 한다 (2D 템플릿은 처음부터 Orthographic 이다). Game 뷰 비율을 16:9 로 두면 가로 -8.9 ~ 8.9 가 보여, 월드 x -3 에서 시작하는 하린과 월드 x 3 의 벽이 모두 들어온다.',
      'Play 하고 Q 를 누른다. Console 에 `[RunnerLoop] 점프`, `최고 0.72m`, `착지` 가 나오고 Game 뷰 왼쪽 위에 `목표 60fps · 화면 프레임 n회 · 고정 단계 n회 · 버린 시간 0.00초` 와 `최고 높이 0.72m` 가 보인다. W 를 두 번 누르면 두 번째 돌진에서 `벽에 막힘 · x 11.70` 이 나온다. Play 를 멈추고 `Target Frame Rate` 를 30, 144 로 바꿔 다시 해 보고, R 로 처음 자리로 돌린 뒤 W 를 누르고 바로 E 를 눌러 렉을 낸다.',
    ],
    verify: '`Target Frame Rate` 를 30, 60, 144 로 바꿔 Play 할 때마다 Q 로 점프한 `최고 높이` 가 0.72m 로 같고, 벽 앞에서 W 와 E 를 함께 눌러도 하린이 벽을 넘지 않고 `상한 5단계 · … 초 버림` 이 Console 에 나온다.',
    pitfalls: [
      'Unity 의 `FixedUpdate` 가 바로 이 패턴이다: 엔진이 시간을 쌓아 `Time.fixedDeltaTime` 간격으로 한 화면 프레임에 `FixedUpdate` 를 0번 이상 부르고, Project Settings > Time 의 Maximum Allowed Timestep 이 상한 구실을 한다. 이 표본은 웹 무대와 같은 코어를 보이려고 `Update` 에서 `FixedStepper.Advance(Time.deltaTime)` 을 직접 부른다. `FixedUpdate` 로 옮기려면 거기서 `Runner.Step(Time.fixedDeltaTime)` 만 부르고, 입력은 지금처럼 InputAction 콜백에서 요청만 남긴다 (`FixedUpdate` 에서 "이번 프레임에 눌림" 을 읽으면 놓친다).',
      '`Fixed Step` 은 `Time.fixedDeltaTime` 과 따로 논다. 이 컴포넌트는 Rigidbody 를 쓰지 않고 Transform 만 옮긴다. Rigidbody 로 움직이는 오브젝트와 섞으면 둘의 단계가 어긋나므로, 물리 엔진과 함께 쓸 규칙은 `FixedUpdate` 로 옮긴다.',
      '`Target Frame Rate` 는 `Application.targetFrameRate` 에 넣는다. VSync 설정에 따라 다를 수 있다 (Edit > Project Settings > Quality 의 VSync Count). Game 뷰 왼쪽 위의 화면 프레임 횟수로 실제로 몇 번 돌았는지 본다.',
      'E(렉)는 다음 `Update` 에서 `System.Threading.Thread.Sleep` 으로 메인 스레드를 `Lag Spike` 초 재운다. `Time.maximumDeltaTime` 문서대로 `Time.deltaTime` 은 그 값(Maximum Allowed Timestep, 기본 0.3333초)을 넘지 않으므로, `Lag Spike` 를 0.5 로 해도 코어에 들어가는 시간은 그 안이다. 시연용이라 실제 게임에는 두지 않는다.',
      'Play 중에 바꾼 `Fixed Step`, `Max Steps Per Frame`, `Jump Speed` 는 `OnValidate` 가 코어에 넣어 다음 단계부터 쓰고, `Lag Spike` 는 다음 렉부터 쓴다. Game 뷰 왼쪽 위 글은 확인용 IMGUI(`OnGUI` 의 `GUI.Label`)다. 실제 게임은 UGUI·TextMeshPro 로 만든다.',
      '`OnDisable` 에서 `Stepper.Stepped -= Runner.Step` 과 InputAction 콜백을 뗀다. 떼지 않으면 껐다 켤 때 두 번 붙어 고정 단계 하나에 규칙이 두 번 돌고 (점프가 두 배 빨라진다), 키 한 번에 요청이 두 번 들어간다.',
    ],
  },
  prompt: {
    goal: '플레이어의 중력, 점프, 대시, 벽 충돌을 순수 C# 규칙 클래스에 두고, Update 에서 Time.deltaTime 을 쌓아 고정 간격으로만 규칙을 돌리며, 한 프레임의 단계 수에 상한을 두고 화면은 두 단계 사이를 보간해, 프레임 속도와 렉에 상관없이 같은 점프 높이와 벽 충돌이 나오게 한다.',
    adaptIdeas: [
      '이미 FixedUpdate 와 Rigidbody2D 로 움직이는 플레이어에 점프 입력을 놓치지 않게 넣고 싶다.',
      '슬로 모션 중에는 쌓는 시간에 배율을 곱하고, 일시정지 중에는 쌓지 않게 하고 싶다.',
      '아주 빠른 총알이 얇은 벽을 뚫지 않게 지나온 길을 검사하고 싶다.',
      '같은 입력 기록을 다시 넣으면 같은 결과가 나오는 리플레이를 만들고 싶다.',
      '적 AI 는 0.1초 간격으로만 생각하고 이동은 매 단계 하게 나누고 싶다.',
    ],
  },
  inspiredBy: [],
  original: '특정 게임의 재현이 아니라 널리 쓰이는 고정 시간 간격 게임 루프를 하린의 점프와 돌진에 적용했다. 같은 입력을 세 기기(30·60·144fps)에 넣어 견주는 무대와 코드는 이 갤러리에서 새로 작성했다.',
  references: [
    { label: 'Game Programming Patterns: Game Loop (Robert Nystrom)', url: 'https://gameprogrammingpatterns.com/game-loop.html' },
    { label: 'Unity 스크립팅 API: Time.deltaTime', url: 'https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Time-deltaTime.html' },
    { label: 'Unity 스크립팅 API: Time.fixedDeltaTime', url: 'https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Time-fixedDeltaTime.html' },
    { label: 'Unity 스크립팅 API: MonoBehaviour.FixedUpdate', url: 'https://docs.unity3d.com/6000.3/Documentation/ScriptReference/MonoBehaviour.FixedUpdate.html' },
  ],
  related: [
    { id: 'update-method-drone-list', why: '게임 루프가 한 단계마다 부르는 것이 업데이트 메서드다. 고정 단계 안에서 드론 목록을 돌면 드론도 기기와 상관없이 같은 속도로 움직인다' },
    { id: 'state-player-actions', why: '같은 하린의 점프·공격 규칙을 상태 객체로 나눈 표본이다. 상태의 Tick 을 고정 단계에서 부르면 두 표본을 합칠 수 있다' },
  ],
}
