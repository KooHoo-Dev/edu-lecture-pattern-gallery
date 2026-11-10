import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/game-loop-fixed-step 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/game-loop-fixed-step/Target.cs 와 같은 글을 만드는 어댑터 (흉내 장치 Device 포함). C# 의 float 계산은 f() 로 맞춘다. */

const f = Math.fround

/** C# event 흉내: 붙은 순서대로 부르고, -= 는 뒤에서부터 하나를 뺀다 */
class Event<T extends unknown[]> {
  private list: ((...args: T) => void)[] = []
  add(fn: (...args: T) => void) {
    this.list.push(fn)
  }
  remove(fn: (...args: T) => void) {
    const i = this.list.lastIndexOf(fn)
    if (i >= 0) this.list.splice(i, 1)
  }
  invoke(...args: T) {
    for (const fn of [...this.list]) fn(...args)
  }
}

/* ───────── Core/FixedStepper.cs ───────── */

class FixedStepper {
  FixedStep: number
  MaxStepsPerFrame: number
  private accumulator = 0
  private advancing = false
  TotalSteps = 0
  LastSteps = 0
  TotalDropped = 0
  Stepped = new Event<[number]>()
  Dropped = new Event<[number, number]>()

  constructor(fixedStep: number, maxStepsPerFrame: number) {
    this.FixedStep = fixedStep
    this.MaxStepsPerFrame = maxStepsPerFrame
  }

  get Accumulator() {
    return this.accumulator
  }
  get Alpha() {
    return Math.min(1, f(this.accumulator / this.FixedStep))
  }

  Advance(frameTime: number): number {
    if (!(this.FixedStep > 0)) throw new Error('FixedStep 은 0 보다 커야 한다')
    this.accumulator = f(this.accumulator + frameTime)
    if (this.advancing) return 0
    this.advancing = true
    let steps = 0
    try {
      while (this.accumulator >= this.FixedStep) {
        if (steps >= Math.max(1, this.MaxStepsPerFrame)) {
          const dropped = this.accumulator
          this.accumulator = 0
          this.TotalDropped = f(this.TotalDropped + dropped)
          this.Dropped.invoke(dropped, steps)
          break
        }
        this.accumulator = f(this.accumulator - this.FixedStep)
        steps++
        this.TotalSteps++
        this.Stepped.invoke(this.FixedStep)
      }
    } finally {
      this.advancing = false
      this.LastSteps = steps
    }
    return steps
  }
}

/* ───────── Core/Runner.cs ───────── */

class RunnerSettings {
  JumpSpeed = f(8)
  Gravity = f(40)
  DashSpeed = f(15)
  DashTime = f(0.19)
  StartX = f(6)
  WallX = f(12)
  WallThickness = f(0.2)
  HalfWidth = f(0.3)
}

class Runner {
  Settings: RunnerSettings
  X = 0
  Y = 0
  VelocityY = 0
  DashTimer = 0
  PrevX = 0
  PrevY = 0
  Peak = 0
  Rising = false
  private dashStartX = 0
  private jumpRequested = false
  private dashRequested = false
  Jumped = new Event<[]>()
  PeakReached = new Event<[number]>()
  Landed = new Event<[]>()
  Dashed = new Event<[]>()
  DashEnded = new Event<[number]>()
  WallHit = new Event<[number]>()

  constructor(settings: RunnerSettings) {
    this.Settings = settings
    this.Restart()
  }

  get Grounded() {
    return this.Y <= 0
  }

  RequestJump() {
    this.jumpRequested = true
  }

  RequestDash() {
    this.dashRequested = true
  }

  Restart() {
    this.X = this.PrevX = this.Settings.StartX
    this.Y = this.PrevY = 0
    this.VelocityY = 0
    this.DashTimer = 0
    this.Peak = 0
    this.Rising = false
    this.jumpRequested = false
    this.dashRequested = false
  }

  Step(step: number) {
    const s = this.Settings
    this.PrevX = this.X
    this.PrevY = this.Y
    if (this.jumpRequested) {
      this.jumpRequested = false
      if (this.Grounded) {
        this.VelocityY = s.JumpSpeed
        this.Peak = 0
        this.Rising = true
        this.Jumped.invoke()
      }
    }
    if (this.dashRequested) {
      this.dashRequested = false
      this.DashTimer = s.DashTime
      this.dashStartX = this.X
      this.Dashed.invoke()
    }

    this.VelocityY = f(this.VelocityY - f(s.Gravity * step))
    this.Y = f(this.Y + f(this.VelocityY * step))
    if (this.Y > this.Peak) this.Peak = this.Y
    if (this.Rising && this.VelocityY <= 0) {
      this.Rising = false
      this.PeakReached.invoke(this.Peak)
    }
    if (this.Y <= 0) {
      const wasInAir = this.PrevY > 0
      this.Y = 0
      this.VelocityY = 0
      if (wasInAir) this.Landed.invoke()
    }

    if (this.DashTimer <= 0) return
    this.X = f(this.X + f(s.DashSpeed * step))
    this.DashTimer = f(this.DashTimer - step)
    const hit = f(this.X + s.HalfWidth) > s.WallX && f(this.X - s.HalfWidth) < f(s.WallX + s.WallThickness)
    if (hit) {
      this.X = f(s.WallX - s.HalfWidth)
      this.DashTimer = 0
      this.WallHit.invoke(this.X)
    }
    if (this.DashTimer <= 0) this.DashEnded.invoke(f(this.X - this.dashStartX))
  }
}

/* ───────── Naive/NaiveRunner.cs ───────── */

class NaiveRunner {
  jumpSpeed = f(8)
  gravity = f(40)
  dashSpeed = f(15)
  dashTime = f(0.19)
  wallX = f(12)
  wallThickness = f(0.2)
  halfWidth = f(0.3)
  x = f(6)
  y = 0
  velocityY = 0
  dashTimer = 0
  jumpPressed = false
  dashPressed = false

  Update(dt: number) {
    if (this.jumpPressed && this.y <= 0) this.velocityY = this.jumpSpeed
    if (this.dashPressed) this.dashTimer = this.dashTime
    this.jumpPressed = false
    this.dashPressed = false

    this.velocityY = f(this.velocityY - f(this.gravity * dt))
    this.y = f(this.y + f(this.velocityY * dt))
    if (this.y <= 0) {
      this.y = 0
      this.velocityY = 0
    }

    if (this.dashTimer > 0) {
      this.x = f(this.x + f(this.dashSpeed * dt))
      this.dashTimer = f(this.dashTimer - dt)
      if (f(this.x + this.halfWidth) > this.wallX && f(this.x - this.halfWidth) < f(this.wallX + this.wallThickness)) {
        this.x = f(this.wallX - this.halfWidth)
        this.dashTimer = 0
      }
    }
  }
}

/* ───────── truth/game-loop-fixed-step/Target.cs 와 같은 흉내 장치·어댑터 + 무대 그림 ───────── */

/** 흉내 장치: 무대 시간(1/60)을 쌓아 이 기기의 화면 프레임(1/fps 초, 렉이면 lagSpike 초)을 만든다 */
class Device {
  Name: string
  Period: number
  Elapsed = 0
  LagNext = false
  LastWasLag = false
  Frames = 0
  LastFrame = 0
  Jump = false
  Dash = false

  constructor(fps: number) {
    this.Name = `${fps}fps`
    this.Period = f(1 / fps)
  }

  Advance(dt: number, lagSpike: number, frame: (length: number) => void) {
    this.Elapsed = f(this.Elapsed + dt)
    for (;;) {
      const length = this.LagNext ? lagSpike : this.Period
      if (this.Elapsed < length) return
      this.Elapsed = f(this.Elapsed - length)
      this.LastWasLag = this.LagNext
      this.LagNext = false
      this.Frames++
      this.LastFrame = length
      frame(length)
    }
  }
}

interface Lane {
  Device: Device
  Stepper: FixedStepper | null
  Runner: Runner | null
  Naive: NaiveRunner | null
  Peaks: number[]
  JumpStep: number
  Rising: boolean
  Peak: number
  AirTime: number
  DashStartX: number
  Passed: boolean
  // 무대 그림만 쓰는 값 (기록과 상관없음)
  view: { jumpX: number; lastDash: number; heightBad: boolean; passFrom: number; lagEndAt: number; lagText: string }
}

const FPS = [30, 60, 144]
const F2 = (v: number) => v.toFixed(2)
/** 줄의 땅 높이 (위에서 30·60·144fps) */
const LANE_Y = [5.0, 2.55, 0.1]
const GROUND_H = 0.15
const ACTOR_SCALE = 0.6

export const createSim: SimFactory = (values: ParamValues, naive: boolean): PatternSim => {
  const num = (k: string) => f(Number(values[k]))
  const events: string[] = []
  const lanes: Lane[] = []
  const lagSpike = num('lagSpike')
  const fixedStep = num('fixedStep')
  const maxSteps = Math.round(Number(values.maxStepsPerFrame))
  const jumpSpeed = num('jumpSpeed')
  let reportedJumps = 0
  let clock = 0
  let lastMoveInputAt = -9
  let lastLagInputAt = -9
  let lastDropAt = -9

  for (const fps of FPS) {
    const lane: Lane = {
      Device: new Device(fps),
      Stepper: null,
      Runner: null,
      Naive: null,
      Peaks: [],
      JumpStep: 0,
      Rising: false,
      Peak: 0,
      AirTime: 0,
      DashStartX: 0,
      Passed: false,
      view: { jumpX: -1, lastDash: -1, heightBad: false, passFrom: 0, lagEndAt: -9, lagText: '' },
    }
    lanes.push(lane)
    if (naive) {
      lane.Naive = new NaiveRunner()
      lane.Naive.jumpSpeed = jumpSpeed
      continue
    }
    const settings = new RunnerSettings()
    settings.JumpSpeed = jumpSpeed
    lane.Stepper = new FixedStepper(fixedStep, maxSteps)
    lane.Runner = new Runner(settings)
    const name = lane.Device.Name
    const r = lane.Runner
    const s = lane.Stepper
    s.Stepped.add((step) => r.Step(step))
    s.Dropped.add((time, steps) => {
      events.push(`${name} 상한 ${steps}단계 · ${F2(time)}초 버림`)
      lastDropAt = clock
      lane.view.lagText = `상한 ${steps}단계만 돌리고 ${F2(time)}초 버림`
      lane.view.lagEndAt = clock
    })
    r.Jumped.add(() => {
      lane.JumpStep = s.TotalSteps
      events.push(`${name} 점프`)
      lane.view.jumpX = r.X
    })
    r.PeakReached.add((peak) => lane.Peaks.push(peak))
    r.Landed.add(() => {
      const n = s.TotalSteps - lane.JumpStep
      events.push(`${name} 착지 · 점프 뒤 ${n}단계 (${F2(f(n * s.FixedStep))}초)`)
    })
    r.Dashed.add(() => events.push(`${name} 돌진`))
    r.WallHit.add((x) => events.push(`${name} 벽에 막힘 · x ${F2(x)}`))
    r.DashEnded.add((d) => {
      events.push(`${name} 돌진 끝 · ${F2(d)}m`)
      lane.view.lastDash = d
    })
  }

  const frame = (lane: Lane, dt: number) => {
    const d = lane.Device
    if (lane.Runner && lane.Stepper) {
      if (d.LastWasLag) {
        events.push(`${d.Name} 렉 프레임 ${F2(dt)}초 → Advance 에 그대로 쌓음`)
        lane.view.lagText = `렉 프레임 ${F2(dt)}초를 고정 단계로 나눠 돌림`
        lane.view.lagEndAt = clock
      }
      if (d.Jump) lane.Runner.RequestJump()
      if (d.Dash) lane.Runner.RequestDash()
      d.Jump = false
      d.Dash = false
      lane.Stepper.Advance(dt)
      return
    }

    const n = lane.Naive!
    if (d.LastWasLag) {
      events.push(`${d.Name} 렉 프레임 ${F2(dt)}초 → Update(dt) 한 번에 적분`)
      lane.view.lagText = `렉 프레임 dt ${F2(dt)}초를 한 번에 곱함`
      lane.view.lagEndAt = clock
    }
    const jumping = d.Jump && n.y <= 0
    const dashing = d.Dash || n.dashTimer > 0
    if (jumping) {
      events.push(`${d.Name} 점프`)
      lane.view.jumpX = n.x
      lane.view.heightBad = false
    }
    if (d.Dash) {
      lane.DashStartX = n.x
      events.push(`${d.Name} 돌진`)
    }
    const x0 = n.x
    const y0 = n.y
    n.jumpPressed = d.Jump
    n.dashPressed = d.Dash
    d.Jump = false
    d.Dash = false
    n.Update(dt)

    if (jumping) {
      lane.Rising = true
      lane.Peak = 0
      lane.AirTime = 0
    } else if (y0 > 0) lane.AirTime = f(lane.AirTime + dt)
    if (n.y > lane.Peak) lane.Peak = n.y
    if (lane.Rising && n.velocityY <= 0) {
      lane.Rising = false
      lane.Peaks.push(lane.Peak)
    }
    if (!lane.Passed && f(x0 + n.halfWidth) <= n.wallX && f(n.x - n.halfWidth) >= f(n.wallX + n.wallThickness)) {
      lane.Passed = true
      lane.view.passFrom = x0
      events.push(`!렉에 벽 통과: ${d.Name} dt ${F2(dt)}초 한 프레임에 x ${F2(x0)} → ${F2(n.x)}`)
    }
    if (dashing && n.x === f(n.wallX - n.halfWidth) && n.dashTimer === 0) events.push(`${d.Name} 벽에 막힘 · x ${F2(n.x)}`)
    if (dashing && n.dashTimer <= 0) {
      const dist = f(n.x - lane.DashStartX)
      events.push(`${d.Name} 돌진 끝 · ${F2(dist)}m`)
      lane.view.lastDash = dist
    }
    if (y0 > 0 && n.y <= 0) events.push(`${d.Name} 착지 · 점프 뒤 ${F2(lane.AirTime)}초`)
  }

  const reportPeaks = () => {
    for (;;) {
      for (const lane of lanes) if (lane.Peaks.length <= reportedJumps) return
      let min = Number.MAX_VALUE
      let max = -Number.MAX_VALUE
      const parts: string[] = []
      for (const lane of lanes) {
        const p = lane.Peaks[reportedJumps]
        min = Math.min(min, p)
        max = Math.max(max, p)
        parts.push(`${lane.Device.Name} ${F2(p)}`)
      }
      reportedJumps++
      const list = parts.join(' · ')
      if (naive && f(max - min) >= f(0.01)) {
        events.push(`!프레임마다 다른 점프: 최고 높이 ${list}`)
        for (const lane of lanes) lane.view.heightBad = true
      } else events.push(`최고 높이 ${list} (같다)`)
    }
  }

  /* ───── 무대 그림 ───── */

  const RED = '#ff5d6c'
  const ORANGE = '#ffb547'
  const GREEN = '#7ee081'
  const GRAY = '#8796ae'

  const laneView = (lane: Lane, i: number): WorldItem[] => {
    const d = lane.Device
    const gy = LANE_Y[i] + GROUND_H
    const r = lane.Runner
    const n = lane.Naive
    let x: number
    let y: number
    let pose: 'idle' | 'run' | 'jump'
    if (r && lane.Stepper) {
      // 두 고정 단계 사이를 보간해 그린다 (규칙 상태는 그대로)
      const a = lane.Stepper.Alpha
      x = r.PrevX + (r.X - r.PrevX) * a
      y = r.PrevY + (r.Y - r.PrevY) * a
      pose = r.Y > 0 ? 'jump' : r.DashTimer > 0 ? 'run' : 'idle'
    } else {
      x = n!.x
      y = n!.y
      pose = n!.y > 0 ? 'jump' : n!.dashTimer > 0 ? 'run' : 'idle'
    }
    const drawX = Math.min(x, 15.55)
    const lastPeak = lane.Peaks.length > 0 ? lane.Peaks[lane.Peaks.length - 1] : -1
    const peakColor = naive ? (lane.view.heightBad ? RED : ORANGE) : GREEN
    const items: WorldItem[] = [
      { kind: 'box', x: 0, y: LANE_Y[i], w: 16, h: GROUND_H, fill: '#22314a' },
      { kind: 'box', x: 12, y: gy, w: 0.2, h: 1.5, fill: '#5a6b86', label: i === 0 ? '벽' : undefined },
      { kind: 'text', x: 0.3, y: gy + 1.95, text: d.Name, align: 'left', size: 22, color: '#e6edf7' },
      {
        kind: 'text',
        x: 0.3,
        y: gy + 1.5,
        text: lane.Stepper ? `고정 단계 ${lane.Stepper.TotalSteps}회 · 화면 프레임 ${d.Frames}회` : `고정 단계 없음 · 화면 프레임 ${d.Frames}회`,
        align: 'left',
        size: 16,
        color: GRAY,
      },
      {
        kind: 'text',
        x: 0.3,
        y: gy + 1.05,
        text: `최고 ${lastPeak >= 0 ? `${F2(lastPeak)}m` : '-'} · 돌진 ${lane.view.lastDash >= 0 ? `${F2(lane.view.lastDash)}m` : '-'}`,
        align: 'left',
        size: 18,
        color: lastPeak >= 0 ? peakColor : GRAY,
      },
      {
        kind: 'text',
        x: 0.3,
        y: gy + 0.6,
        text: lane.Stepper ? `버린 시간 ${F2(lane.Stepper.TotalDropped)}초` : `마지막 dt ${F2(d.LastFrame)}초`,
        align: 'left',
        size: 16,
        color: GRAY,
      },
    ]
    if (lastPeak >= 0 && lane.view.jumpX >= 0) {
      const jx = Math.min(lane.view.jumpX, 15.2)
      items.push(
        { kind: 'box', x: jx - 0.55, y: gy + lastPeak, w: 1.1, h: 0.04, fill: peakColor },
        { kind: 'text', x: jx - 0.65, y: gy + lastPeak, text: `${F2(lastPeak)}m`, align: 'right', size: 15, color: peakColor },
      )
    }
    if (n && lane.Passed) {
      items.push(
        { kind: 'arrow', x1: lane.view.passFrom, y1: gy + 0.35, x2: drawX - 0.3, y2: gy + 0.35, color: RED, dashed: true },
        { kind: 'text', x: drawX, y: gy + 1.55, text: x > 15.55 ? `✖ 벽 통과 x ${F2(x)}→` : '✖ 벽 통과', align: 'right', size: 16, color: RED },
      )
    }
    items.push({ kind: 'actor', x: drawX, y: gy + y, role: 'ally', label: i === 2 ? '하린' : undefined, pose, facing: 1, scale: ACTOR_SCALE })
    if (d.LagNext) items.push({ kind: 'text', x: 9, y: gy + 1.95, text: `렉: 화면 프레임 하나가 ${F2(lagSpike)}초 걸리는 중`, align: 'center', size: 16, color: ORANGE })
    else if (clock - lane.view.lagEndAt < 0.8) items.push({ kind: 'text', x: 9, y: gy + 1.95, text: lane.view.lagText, align: 'center', size: 16, color: naive ? RED : ORANGE })
    return items
  }

  return {
    input(name) {
      if (name === 'lag') lastLagInputAt = clock
      else lastMoveInputAt = clock
      for (const lane of lanes) {
        if (name === 'jump') lane.Device.Jump = true
        else if (name === 'dash') lane.Device.Dash = true
        else lane.Device.LagNext = true
      }
    },
    tick(dt) {
      for (const lane of lanes) lane.Device.Advance(dt, lagSpike, (length) => frame(lane, length))
      reportPeaks()
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot() {
      const parts: string[] = []
      for (const lane of lanes) {
        const p = `f${lane.Device.Name.replace('fps', '')}`
        if (lane.Runner && lane.Stepper)
          parts.push(`${p}.x=${F2(lane.Runner.X)} ${p}.y=${F2(lane.Runner.Y)} ${p}.frames=${lane.Device.Frames} ${p}.steps=${lane.Stepper.TotalSteps} ${p}.dropped=${F2(lane.Stepper.TotalDropped)}`)
        else parts.push(`${p}.x=${F2(lane.Naive!.x)} ${p}.y=${F2(lane.Naive!.y)} ${p}.frames=${lane.Device.Frames}`)
      }
      return parts.join(' ')
    },
    view(): SimView {
      const world: WorldItem[] = naive
        ? [
            { kind: 'text', x: 0.3, y: 8.3, text: '나쁜 예: 화면 프레임마다 Update(dt) 에서 바로 적분', align: 'left', size: 24, color: ORANGE },
            { kind: 'text', x: 0.3, y: 7.75, text: '같은 입력 · 프레임 길이(dt)가 기기마다, 렉마다 다르다', align: 'left', size: 17, color: GRAY },
          ]
        : [
            { kind: 'text', x: 0.3, y: 8.3, text: `규칙은 고정 간격 ${fixedStep.toFixed(3)}초로만 돈다 · 프레임당 상한 ${maxSteps}단계`, align: 'left', size: 24, color: GREEN },
            { kind: 'text', x: 0.3, y: 7.75, text: '같은 입력 · 화면은 두 고정 단계 사이를 보간해 그린다', align: 'left', size: 17, color: GRAY },
          ]
      lanes.forEach((lane, i) => world.push(...laneView(lane, i)))

      const active: string[] = []
      if (naive) {
        active.push('nupdate')
        if (clock - lastLagInputAt < 0.3 || lanes.some((l) => l.Device.LagNext)) active.push('nframe', 'nframe-nupdate')
        if (lanes.some((l) => l.Naive!.y > 0)) active.push('ngravity', 'nupdate-ngravity')
        if (lanes.some((l) => l.Naive!.dashTimer > 0)) active.push('ndash', 'nupdate-ndash')
        if (lanes.some((l) => l.Passed)) active.push('nwall', 'ndash-nwall')
      } else {
        active.push('stepper')
        if (clock - lastMoveInputAt < 0.3) active.push('loop', 'loop-runner')
        if (clock - lastLagInputAt < 0.3 || lanes.some((l) => l.Device.LagNext)) active.push('frame', 'frame-loop', 'loop-stepper')
        if (clock - lastDropAt < 0.4) active.push('dropped', 'stepper-dropped')
      }
      return { world, active }
    },
  }
}
