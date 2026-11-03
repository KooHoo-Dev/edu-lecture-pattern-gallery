import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/state-drone-ai 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/state-drone-ai/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다. */

const f = Math.fround

/** C# event 처럼: += 는 뒤에 붙이고, -= 는 뒤에서부터 같은 것 하나를 뺀다. 부를 때는 그 순간의 목록을 쓴다 */
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

/* ───────── Core/Drone.cs ───────── */

class DroneSettings {
  DetectRange = f(5)
  AttackRange = f(2.5)
  ChargeTime = f(0.6)
  MoveSpeed = f(2.5)
  MaxHp = 3
  PatrolMinX = f(9)
  PatrolMaxX = f(13)
}

class Drone {
  Settings: DroneSettings
  X = f(11)
  Facing = -1
  Speed: number
  Hp: number
  TargetX = 0
  ChargeTimer = 0
  Charging = false
  State: IDroneState

  StateChanged = new Event<[string, string]>()
  Fired = new Event<[number]>()
  Damaged = new Event<[number, number]>()
  Destroyed = new Event<[]>()

  constructor(settings: DroneSettings) {
    this.Settings = settings
    this.Speed = settings.MoveSpeed
    this.Hp = settings.MaxHp
    this.State = DroneStates.Patrol
    this.State.Enter(this)
  }

  get Distance() {
    return f(Math.abs(f(this.TargetX - this.X)))
  }

  Tick(dt: number, targetX: number) {
    this.TargetX = targetX
    this.State.Tick(this, dt)
  }

  ChangeState(next: IDroneState) {
    if (next === this.State) return
    const previous = this.State
    previous.Exit(this)
    this.State = next
    next.Enter(this)
    this.StateChanged.invoke(previous.Name, next.Name)
  }

  TakeHit(amount: number) {
    if (this.Hp <= 0) return
    this.Hp = Math.max(0, this.Hp - amount)
    this.Damaged.invoke(amount, this.Hp)
    if (this.Hp > 0) return
    this.ChangeState(DroneStates.Destroyed)
    this.Destroyed.invoke()
  }

  Patrol(dt: number) {
    this.X = f(this.X + f(f(this.Facing * this.Speed) * dt))
    if (this.X > this.Settings.PatrolMaxX && this.Facing > 0) this.Facing = -1
    else if (this.X < this.Settings.PatrolMinX && this.Facing < 0) this.Facing = 1
  }

  MoveTowardTarget(dt: number) {
    this.FaceTarget()
    this.X = f(this.X + f(f(this.Facing * this.Speed) * dt))
  }

  FaceTarget() {
    this.Facing = this.TargetX < this.X ? -1 : 1
  }

  Fire() {
    this.Fired.invoke(this.TargetX)
  }
}

/* ───────── Core/DroneStates.cs ───────── */

interface IDroneState {
  Name: string
  Enter(d: Drone): void
  Tick(d: Drone, dt: number): void
  Exit(d: Drone): void
}

const PatrolState: IDroneState = {
  Name: 'Patrol',
  Enter() {},
  Exit() {},
  Tick(d, dt) {
    if (d.Distance <= d.Settings.DetectRange) {
      d.ChangeState(DroneStates.Chase)
      return
    }
    d.Patrol(dt)
  },
}

const ChaseState: IDroneState = {
  Name: 'Chase',
  Enter() {},
  Exit() {},
  Tick(d, dt) {
    const distance = d.Distance
    if (distance > d.Settings.DetectRange) {
      d.ChangeState(DroneStates.Patrol)
      return
    }
    if (distance <= d.Settings.AttackRange) {
      d.ChangeState(DroneStates.Attack)
      return
    }
    d.MoveTowardTarget(dt)
  },
}

const AttackState: IDroneState = {
  Name: 'Attack',
  Enter(d) {
    d.Speed = 0
    d.ChargeTimer = 0
    d.Charging = true
    d.FaceTarget()
  },
  Exit(d) {
    d.Speed = d.Settings.MoveSpeed
    d.ChargeTimer = 0
    d.Charging = false
  },
  Tick(d, dt) {
    if (d.Distance > d.Settings.AttackRange) {
      d.ChangeState(DroneStates.Chase)
      return
    }
    d.ChargeTimer = f(d.ChargeTimer + dt)
    if (d.ChargeTimer >= d.Settings.ChargeTime) {
      d.Fire()
      d.ChargeTimer = 0
    }
  },
}

const DestroyedState: IDroneState = {
  Name: 'Destroyed',
  Enter(d) {
    d.Speed = 0
  },
  Exit() {},
  Tick() {},
}

/** C# 의 static class DroneStates: 상태 객체 한 벌을 모든 드론이 같이 쓴다 */
const DroneStates = {
  Patrol: PatrolState,
  Chase: ChaseState,
  Attack: AttackState,
  Destroyed: DestroyedState,
}

/* ───────── Naive/NaiveDrone.cs ───────── */

type DroneState = 'Patrol' | 'Chase' | 'Attack' | 'Destroyed'

class NaiveDrone {
  DetectRange = f(5)
  AttackRange = f(2.5)
  ChargeTime = f(0.6)
  MoveSpeed = f(2.5)
  MaxHp = 3

  state: DroneState = 'Patrol'
  X = f(11)
  facing = -1
  speed = 0
  hp = 0
  chargeTimer = 0
  isCharging = false
  shots = 0

  Start() {
    this.speed = this.MoveSpeed
    this.hp = this.MaxHp
  }

  TakeHit(amount: number) {
    if (this.state === 'Destroyed') return
    this.hp -= amount
    if (this.hp <= 0) this.state = 'Destroyed'
  }

  StartCharge() {
    this.isCharging = true
    this.chargeTimer = 0
  }

  Update(dt: number, targetX: number) {
    const distance = f(Math.abs(f(targetX - this.X)))
    switch (this.state) {
      case 'Patrol':
        if (distance <= this.DetectRange) {
          this.state = 'Chase'
          break
        }
        this.X = f(this.X + f(f(this.facing * this.speed) * dt))
        if (this.X > 13 && this.facing > 0) this.facing = -1
        else if (this.X < 9 && this.facing < 0) this.facing = 1
        break

      case 'Chase':
        if (distance > this.DetectRange) {
          this.state = 'Patrol'
          break
        }
        if (distance <= this.AttackRange) {
          this.state = 'Attack'
          this.speed = 0
          break
        }
        this.facing = targetX < this.X ? -1 : 1
        this.X = f(this.X + f(f(this.facing * this.speed) * dt))
        break

      case 'Attack':
        if (distance > this.AttackRange) {
          this.state = 'Chase'
          break
        }
        this.StartCharge()
        this.chargeTimer = f(this.chargeTimer + dt)
        if (this.chargeTimer >= this.ChargeTime) {
          this.shots++
          this.chargeTimer = 0
        }
        break

      case 'Destroyed':
        break
    }
  }
}

/* ───────── truth/state-drone-ai/Target.cs 와 같은 어댑터 + 무대 그림 ───────── */

const HARIN_START_X = f(3)
const HARIN_STEP = f(1)
const F2 = (v: number) => v.toFixed(2)
/** 충전 막대의 꽉 찬 값: 조절 값(chargeTime)의 최대값. 충전 시간은 막대 위 눈금으로 보인다 */
const CHARGE_BAR_FULL = 1.5
const STATE_NODE: Record<string, string> = { Patrol: 'pc', Chase: 'pc', Attack: 'attack', Destroyed: 'destroyed' }
const POSE = { Patrol: 'idle', Chase: 'run', Attack: 'attack', Destroyed: 'down' } as const
const C = { dim: '#8796ae', faint: '#4a5872', warn: '#ffb547', bug: '#ff5d6c', accent: '#7ee081', ally: '#5cc8ff', text: '#e6edf7' }

interface DroneLook {
  x: number
  facing: number
  state: DroneState
  speed: number
  charge: number
  chargeTime: number
  detect: number
  attack: number
}

/** 두 모드가 같이 쓰는 그림: 땅, 순찰 구간, 감지·공격 거리 상자, 드론, 충전 막대, 하린 */
function scene(d: DroneLook, harinX: number, chargeColor: string, chargeLabel: string): WorldItem[] {
  const destroyed = d.state === 'Destroyed'
  const world: WorldItem[] = [
    { kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' },
    { kind: 'box', x: 9, y: 0.62, w: 4, h: 0.26, fill: '#2f4363' },
    { kind: 'text', x: 11, y: 0.2, text: '순찰 구간', size: 16, color: C.dim },
  ]
  if (!destroyed) {
    world.push(
      { kind: 'box', x: d.x - d.detect, y: 1, w: d.detect * 2, h: 2.5, stroke: C.faint, dashed: true },
      // 거리 글은 상자의 오른쪽 위 (하린은 보통 드론 왼쪽에 있어 이름표와 겹치지 않게)
      { kind: 'text', x: Math.min(15.9, d.x + d.detect - 0.12), y: 3.18, text: `감지 ${d.detect.toFixed(1)}m`, align: 'right', size: 16, color: C.dim },
      { kind: 'box', x: d.x - d.attack, y: 1, w: d.attack * 2, h: 1.9, stroke: '#a8783a', dashed: true },
      { kind: 'text', x: d.x + d.attack - 0.12, y: 1.15, text: `공격 ${d.attack.toFixed(1)}m`, align: 'right', size: 16, color: C.warn },
    )
  }
  world.push({ kind: 'actor', x: d.x, y: 1, role: 'enemy', label: destroyed ? '잔해 드론 · 파괴' : '잔해 드론', pose: POSE[d.state], facing: d.facing === 1 ? 1 : -1 })
  if (d.state === 'Attack') {
    const left = d.x - 0.8
    world.push(
      { kind: 'bar', x: left, y: 3.75, w: 1.6, value: d.charge / CHARGE_BAR_FULL, fill: chargeColor, label: chargeLabel },
      // 눈금: 여기까지 차면 쏜다 (chargeTime)
      { kind: 'box', x: left + 1.6 * Math.min(1, d.chargeTime / CHARGE_BAR_FULL) - 0.03, y: 3.67, w: 0.06, h: 0.48, fill: C.text },
    )
  }
  world.push({ kind: 'actor', x: harinX, y: 1, role: 'ally', label: '하린', facing: d.x >= harinX ? 1 : -1 })
  return world
}

/** 하린이 드론에 준 피해: 하린 앞에서 드론까지의 화살표와 드론의 고리 (0.3초) */
function hitMark(harinX: number, droneX: number): WorldItem[] {
  const dir = droneX >= harinX ? 1 : -1
  return [
    { kind: 'arrow', x1: harinX + dir * 0.4, y1: 1.9, x2: droneX - dir * 0.35, y2: 1.5, color: C.ally },
    { kind: 'ring', x: droneX, y: 1.4, r: 0.5, color: C.ally },
  ]
}

export const createSim: SimFactory =(values: ParamValues, naive: boolean): PatternSim => {
  const num = (k: string) => f(Number(values[k]))
  const events: string[] = []
  let clock = 0
  let harinX = HARIN_START_X
  let lastMoveAt = -9
  let lastHitAt = -9
  let lastChangeAt = -9
  let lastFireAt = -9
  let shotX = 0

  if (!naive) {
    const settings = new DroneSettings()
    settings.DetectRange = num('detectRange')
    settings.AttackRange = num('attackRange')
    settings.ChargeTime = num('chargeTime')
    settings.MoveSpeed = num('moveSpeed')
    const drone = new Drone(settings)
    drone.StateChanged.add((from, to) => {
      events.push(`${from} → ${to}`)
      lastChangeAt = clock
    })
    drone.Fired.add(x => {
      events.push(`사격 → 하린 (거리 ${F2(Math.abs(f(x - drone.X)))})`)
      lastFireAt = clock
      shotX = x
    })
    drone.Damaged.add((amount, hp) => events.push(`피해 ${amount} (HP ${hp}/${drone.Settings.MaxHp})`))
    drone.Destroyed.add(() => events.push('파괴'))

    const step = (toward: number) => {
      const dir = drone.X >= harinX ? 1 : -1
      harinX = Math.max(f(0.5), Math.min(f(15.5), f(harinX + f(toward * dir * HARIN_STEP))))
    }
    return {
      input(name) {
        if (name === 'approach') step(1)
        else if (name === 'retreat') step(-1)
        else {
          lastHitAt = clock
          drone.TakeHit(1)
        }
        if (name !== 'hit') lastMoveAt = clock
      },
      tick(dt) {
        drone.Tick(dt, harinX)
        clock += dt
      },
      drain: () => events.splice(0),
      snapshot: () => `state=${drone.State.Name} x=${F2(drone.X)} harin=${F2(harinX)} speed=${F2(drone.Speed)} charge=${F2(drone.ChargeTimer)} hp=${drone.Hp}`,
      view(): SimView {
        const name = drone.State.Name as DroneState
        const world = scene(
          { x: drone.X, facing: drone.Facing, state: name, speed: drone.Speed, charge: drone.ChargeTimer, chargeTime: settings.ChargeTime, detect: settings.DetectRange, attack: settings.AttackRange },
          harinX,
          C.warn,
          '충전',
        )
        world.push(
          { kind: 'text', x: 0.4, y: 8.3, text: `현재 상태 객체: ${name}State`, align: 'left', size: 26, color: C.accent },
          { kind: 'text', x: 0.4, y: 7.6, text: `Speed ${F2(drone.Speed)} · 충전 ${drone.Charging ? `${F2(drone.ChargeTimer)} / ${F2(settings.ChargeTime)}초` : '꺼짐'} · HP ${drone.Hp}/${settings.MaxHp} · 거리 ${F2(drone.Distance)}m`, align: 'left', size: 20, color: C.dim },
        )
        if (clock - lastFireAt < 0.25) world.push({ kind: 'arrow', x1: drone.X + drone.Facing * 0.35, y1: 1.75, x2: shotX + (shotX < drone.X ? 0.3 : -0.3), y2: 1.75, color: C.warn }, { kind: 'ring', x: shotX, y: 1.7, r: 0.6, color: C.warn })
        if (clock - lastHitAt < 0.3) world.push(...hitMark(harinX, drone.X))
        const active = [STATE_NODE[name]]
        if (clock - lastMoveAt < 0.3) active.push('ctrl', 'ctrl-drone')
        if (clock - lastHitAt < 0.3) active.push('ctrl-drone', 'drone')
        if (clock - lastChangeAt < 0.3) active.push('change', 'drone')
        return { world, active }
      },
    }
  }

  const n = new NaiveDrone()
  n.DetectRange = num('detectRange')
  n.AttackRange = num('attackRange')
  n.ChargeTime = num('chargeTime')
  n.MoveSpeed = num('moveSpeed')
  n.Start()
  let lastState = n.state
  let lastSpeed = n.speed
  let lastHp = n.hp
  let lastShots = n.shots
  let attackTime = 0
  const bug = { stuck: false, charge: false }
  let bugAt = -9
  const report = (now: boolean, key: keyof typeof bug, message: string) => {
    if (now && !bug[key]) {
      events.push(message)
      bugAt = clock
    }
    bug[key] = now
  }
  const moving = () => n.state === 'Patrol' || n.state === 'Chase'
  const naiveEvents = () => {
    if (n.state !== lastState) {
      events.push(`state = ${n.state}`)
      lastChangeAt = clock
    }
    lastState = n.state
    if (n.speed !== lastSpeed) events.push(`speed = ${F2(n.speed)}`)
    lastSpeed = n.speed
    if (n.hp !== lastHp) events.push(`hp = ${n.hp}`)
    lastHp = n.hp
    if (n.shots !== lastShots) events.push('사격')
    lastShots = n.shots
    report(moving() && n.speed === 0, 'stuck', `!이동 멈춤: state = ${n.state} 인데 speed = 0`)
    report(n.state === 'Attack' && attackTime >= n.ChargeTime, 'charge', `!충전이 끝나지 않는다: chargeTime ${F2(n.ChargeTime)}초가 지났는데 chargeTimer = ${F2(n.chargeTimer)}`)
  }
  const step = (toward: number) => {
    const dir = n.X >= harinX ? 1 : -1
    harinX = Math.max(f(0.5), Math.min(f(15.5), f(harinX + f(toward * dir * HARIN_STEP))))
  }
  return {
    input(name) {
      if (name === 'approach') step(1)
      else if (name === 'retreat') step(-1)
      else {
        lastHitAt = clock
        n.TakeHit(1)
      }
      if (name !== 'hit') lastMoveAt = clock
      naiveEvents()
    },
    tick(dt) {
      const wasAttack = n.state === 'Attack'
      n.Update(dt, harinX)
      if (n.state !== 'Attack') attackTime = 0
      else if (wasAttack) attackTime = f(attackTime + dt)
      naiveEvents()
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot: () => `state=${n.state} x=${F2(n.X)} harin=${F2(harinX)} speed=${F2(n.speed)} charge=${F2(n.chargeTimer)} hp=${n.hp}`,
    view(): SimView {
      const stuck = moving() && n.speed === 0
      const world = scene(
        { x: n.X, facing: n.facing, state: n.state, speed: n.speed, charge: n.chargeTimer, chargeTime: n.ChargeTime, detect: n.DetectRange, attack: n.AttackRange },
        harinX,
        bug.charge ? C.bug : C.warn,
        bug.charge ? '충전 (매 프레임 0 으로)' : '충전',
      )
      const distance = f(Math.abs(f(harinX - n.X)))
      world.push(
        { kind: 'text', x: 0.4, y: 8.3, text: `state = ${n.state}  speed = ${F2(n.speed)}`, align: 'left', size: 26, color: stuck || bug.charge ? C.bug : clock - bugAt < 0.8 ? C.bug : C.warn },
        { kind: 'text', x: 0.4, y: 7.6, text: `chargeTimer = ${F2(n.chargeTimer)} / ${F2(n.ChargeTime)} · hp = ${n.hp} · 거리 ${F2(distance)}m · 사격 ${n.shots}번`, align: 'left', size: 20, color: C.dim },
      )
      if (stuck) {
        // 버그가 이어지는 동안 남는 표시: 드론 발밑의 '제자리'
        world.push({ kind: 'box', x: n.X - 0.55, y: 0.92, w: 1.1, h: 0.16, fill: C.bug }, { kind: 'text', x: n.X, y: 0.42, text: '제자리 (speed = 0)', size: 18, color: C.bug })
      }
      if (clock - lastHitAt < 0.3) world.push(...hitMark(harinX, n.X))
      const active = ['f-state']
      if (n.state === 'Attack') active.push('switch-charge', 'f-charge')
      if (stuck) active.push('switch-speed', 'f-speed')
      if (clock - lastMoveAt < 0.3 || clock - lastHitAt < 0.3 || clock - lastChangeAt < 0.3) active.push('nupdate-switch', 'switch')
      return { world, active }
    },
  }
}
