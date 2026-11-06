import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/hierarchical-state-enemy 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/hierarchical-state-enemy/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다. */

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
  StunTime = f(2)
  SearchTime = f(2)
  PatrolMinX = f(9)
  PatrolMaxX = f(13)
}

const DroneInput = { Emp: 'emp' }

class Drone {
  Settings: DroneSettings
  X = f(11)
  Facing = -1
  TargetX = Infinity
  ChargeTimer = 0
  Charging = false
  LastSeenX = 0
  SearchTimer = 0
  StunTimer = 0
  AlertOn = false

  AlertChanged = new Event<[boolean]>()
  Fired = new Event<[number]>()
  Stunned = new Event<[number]>()

  constructor(settings: DroneSettings) {
    this.Settings = settings
  }

  get Distance() {
    return f(Math.abs(f(this.TargetX - this.X)))
  }

  Patrol(dt: number) {
    this.X = f(this.X + f(f(this.Facing * this.Settings.MoveSpeed) * dt))
    if (this.X > this.Settings.PatrolMaxX && this.Facing > 0) this.Facing = -1
    else if (this.X < this.Settings.PatrolMinX && this.Facing < 0) this.Facing = 1
  }

  MoveToward(x: number, dt: number) {
    const gap = f(x - this.X)
    const step = f(this.Settings.MoveSpeed * dt)
    if (Math.abs(gap) <= step) {
      this.X = x
      return true
    }
    this.Facing = gap < 0 ? -1 : 1
    this.X = f(this.X + f(this.Facing * step))
    return false
  }

  FaceTarget() {
    this.Facing = this.TargetX < this.X ? -1 : 1
  }

  Fire() {
    this.Fired.invoke(this.TargetX)
  }

  SetAlert(on: boolean) {
    if (this.AlertOn === on) return
    this.AlertOn = on
    this.AlertChanged.invoke(on)
  }

  Stun() {
    this.StunTimer = this.Settings.StunTime
    this.Stunned.invoke(this.StunTimer)
  }
}

/* ───────── Core/HState.cs ───────── */

class HState {
  Name: string
  Parent: HState | null
  /** 자식이 하나라도 있는가 (Active, Combat). ChangeState 의 target 은 잎이어야 한다 */
  HasChildren = false
  constructor(name: string, parent: HState | null) {
    this.Name = name
    this.Parent = parent
    if (parent !== null) parent.HasChildren = true
  }
  Enter(_m: StateMachine) {}
  Exit(_m: StateMachine) {}
  Tick(_m: StateMachine, _dt: number) {}
  Handle(_m: StateMachine, _evt: string): boolean {
    return false
  }
}

/* ───────── Core/StateMachine.cs ───────── */

class StateMachine {
  Drone: Drone
  Current: HState
  private changed = false
  private transitioning = false

  Entered = new Event<[HState]>()
  Exited = new Event<[HState]>()
  /** (입력을 받은 잎, 처리한 층, 입력) */
  Handled = new Event<[HState, HState, string]>()
  Ignored = new Event<[HState, string]>()

  constructor(drone: Drone, start: HState) {
    StateMachine.RequireLeaf(start)
    this.Drone = drone
    this.Current = start
    this.transitioning = true
    try {
      this.EnterDown(start, null)
    } finally {
      this.transitioning = false
    }
  }

  Handle(evt: string) {
    const leaf = this.Current
    for (let s: HState | null = leaf; s !== null; s = s.Parent) {
      if (!s.Handle(this, evt)) continue
      this.Handled.invoke(leaf, s, evt)
      return true
    }
    this.Ignored.invoke(leaf, evt)
    return false
  }

  Tick(dt: number) {
    this.changed = false
    this.TickDown(this.Current, dt)
  }

  private TickDown(s: HState, dt: number): boolean {
    if (s.Parent !== null && this.TickDown(s.Parent, dt)) return true
    s.Tick(this, dt)
    return this.changed
  }

  ChangeState(target: HState) {
    if (this.transitioning) throw new Error(`${target.Name} 로 바꾸려 했지만 지금 ${this.Current.Name} 로 전이하는 중이다 (InvalidOperationException)`)
    StateMachine.RequireLeaf(target)
    if (target === this.Current) return
    const common = StateMachine.CommonAncestor(this.Current, target)
    this.transitioning = true
    try {
      for (let s: HState | null = this.Current; s !== common && s !== null; s = s.Parent) {
        s.Exit(this)
        this.Exited.invoke(s)
      }
      this.Current = target
      this.changed = true
      this.EnterDown(target, common)
    } finally {
      this.transitioning = false
    }
  }

  static RequireLeaf(s: HState) {
    if (s.HasChildren) throw new Error(`${s.Name} 는 자식이 있는 상태다. ChangeState 에는 잎을 준다 (InvalidOperationException)`)
  }

  private EnterDown(s: HState | null, stop: HState | null) {
    if (s === stop || s === null) return
    this.EnterDown(s.Parent, stop)
    s.Enter(this)
    this.Entered.invoke(s)
  }

  static CommonAncestor(a: HState, b: HState): HState | null {
    for (let x: HState | null = a; x !== null; x = x.Parent) for (let y: HState | null = b; y !== null; y = y.Parent) if (x === y) return x
    return null
  }

  static PathOf(s: HState): string {
    return s.Parent === null ? s.Name : `${StateMachine.PathOf(s.Parent)}/${s.Name}`
  }
}

/* ───────── Core/DroneStates.cs ───────── */

class ActiveState extends HState {
  constructor() {
    super('Active', null)
  }
  Handle(m: StateMachine, evt: string) {
    if (evt !== DroneInput.Emp) return false
    m.ChangeState(DroneStates.Stunned)
    return true
  }
}

class PatrolState extends HState {
  Tick(m: StateMachine, dt: number) {
    const d = m.Drone
    if (d.Distance <= d.Settings.DetectRange) {
      m.ChangeState(DroneStates.Chase)
      return
    }
    d.Patrol(dt)
  }
}

/** SearchState.LookInterval: 두리번거리는 간격 (초) */
const LookInterval = f(0.5)

class SearchState extends HState {
  Enter(m: StateMachine) {
    m.Drone.SearchTimer = 0
  }
  Exit(m: StateMachine) {
    m.Drone.SearchTimer = 0
  }
  Tick(m: StateMachine, dt: number) {
    const d = m.Drone
    if (d.Distance <= d.Settings.DetectRange) {
      m.ChangeState(DroneStates.Chase)
      return
    }
    if (!d.MoveToward(d.LastSeenX, dt)) return
    const before = d.SearchTimer
    d.SearchTimer = f(d.SearchTimer + dt)
    if (Math.trunc(f(d.SearchTimer / LookInterval)) !== Math.trunc(f(before / LookInterval))) d.Facing = -d.Facing
    if (d.SearchTimer >= d.Settings.SearchTime) m.ChangeState(DroneStates.Patrol)
  }
}

/** CombatState.LoseMargin: 감지 거리 + 이만큼보다 멀어져야 수색으로 나간다 */
const LoseMargin = f(0.5)

class CombatState extends HState {
  Enter(m: StateMachine) {
    m.Drone.SetAlert(true)
    m.Drone.LastSeenX = m.Drone.TargetX
  }
  Exit(m: StateMachine) {
    m.Drone.SetAlert(false)
  }
  Tick(m: StateMachine) {
    const d = m.Drone
    if (d.Distance > f(d.Settings.DetectRange + LoseMargin)) {
      m.ChangeState(DroneStates.Search)
      return
    }
    d.LastSeenX = d.TargetX
  }
}

class ChaseState extends HState {
  Tick(m: StateMachine, dt: number) {
    const d = m.Drone
    if (d.Distance <= d.Settings.AttackRange) {
      m.ChangeState(DroneStates.Attack)
      return
    }
    d.MoveToward(d.TargetX, dt)
  }
}

/** AttackState.LeaveMargin: 공격 거리 + 이만큼보다 멀어져야 추격으로 나간다 */
const LeaveMargin = f(0.5)

class AttackState extends HState {
  Enter(m: StateMachine) {
    const d = m.Drone
    d.ChargeTimer = 0
    d.Charging = true
    d.FaceTarget()
  }
  Exit(m: StateMachine) {
    m.Drone.ChargeTimer = 0
    m.Drone.Charging = false
  }
  Tick(m: StateMachine, dt: number) {
    const d = m.Drone
    if (d.Distance > f(d.Settings.AttackRange + LeaveMargin)) {
      m.ChangeState(DroneStates.Chase)
      return
    }
    d.FaceTarget()
    d.ChargeTimer = f(d.ChargeTimer + dt)
    if (d.ChargeTimer >= d.Settings.ChargeTime) {
      d.Fire()
      d.ChargeTimer = 0
    }
  }
}

class StunnedState extends HState {
  constructor() {
    super('Stunned', null)
  }
  Enter(m: StateMachine) {
    m.Drone.Stun()
  }
  Exit(m: StateMachine) {
    m.Drone.StunTimer = 0
  }
  Tick(m: StateMachine, dt: number) {
    const d = m.Drone
    d.StunTimer = f(d.StunTimer - dt)
    if (d.StunTimer <= 0) m.ChangeState(DroneStates.Patrol)
  }
}

/** C# 의 static class DroneStates: 부모를 먼저 만들어 자식에게 넘긴다. 상태 객체 한 벌을 모든 드론이 같이 쓴다 */
const Active = new ActiveState()
const Combat = new CombatState('Combat', Active)
const DroneStates = {
  Active,
  Patrol: new PatrolState('Patrol', Active),
  Search: new SearchState('Search', Active),
  Combat,
  Chase: new ChaseState('Chase', Combat),
  Attack: new AttackState('Attack', Combat),
  Stunned: new StunnedState(),
}

/* ───────── Naive/NaiveDrone.cs, Naive/NaiveDroneStates.cs ─────────
 * 이름이 위의 코어(PatrolState 등)와 같아 함수 안에 따로 둔다 */

const Naive = (() => {
  interface IDroneState {
    Name: string
    Enter(d: NaiveDrone): void
    Tick(d: NaiveDrone, dt: number): void
    Exit(d: NaiveDrone): void
    Handle(d: NaiveDrone, evt: string): boolean
  }

  class NaiveDrone {
    DetectRange = f(5)
    AttackRange = f(2.5)
    ChargeTime = f(0.6)
    MoveSpeed = f(2.5)
    StunTime = f(2)
    SearchTime = f(2)

    X = f(11)
    Facing = -1
    TargetX = Infinity
    ChargeTimer = 0
    Charging = false
    LastSeenX = 0
    SearchTimer = 0
    StunTimer = 0
    AlertOn = false

    State: IDroneState = DroneStates.Patrol

    StateChanged = new Event<[string, string]>()
    AlertChanged = new Event<[boolean]>()
    Fired = new Event<[number]>()
    Stunned = new Event<[number]>()

    get Distance() {
      return f(Math.abs(f(this.TargetX - this.X)))
    }

    Tick(dt: number) {
      this.State.Tick(this, dt)
    }

    Handle(evt: string) {
      return this.State.Handle(this, evt)
    }

    ChangeState(next: IDroneState) {
      if (next === this.State) return
      const previous = this.State
      previous.Exit(this)
      this.State = next
      next.Enter(this)
      this.StateChanged.invoke(previous.Name, next.Name)
    }

    Patrol(dt: number) {
      this.X = f(this.X + f(f(this.Facing * this.MoveSpeed) * dt))
      if (this.X > 13 && this.Facing > 0) this.Facing = -1
      else if (this.X < 9 && this.Facing < 0) this.Facing = 1
    }

    MoveToward(x: number, dt: number) {
      const gap = f(x - this.X)
      const step = f(this.MoveSpeed * dt)
      if (Math.abs(gap) <= step) {
        this.X = x
        return true
      }
      this.Facing = gap < 0 ? -1 : 1
      this.X = f(this.X + f(this.Facing * step))
      return false
    }

    FaceTarget() {
      this.Facing = this.TargetX < this.X ? -1 : 1
    }

    Fire() {
      this.Fired.invoke(this.TargetX)
    }

    SetAlert(on: boolean) {
      if (this.AlertOn === on) return
      this.AlertOn = on
      this.AlertChanged.invoke(on)
    }

    Stun() {
      this.StunTimer = this.StunTime
      this.Stunned.invoke(this.StunTimer)
    }
  }

  const PatrolState: IDroneState = {
    Name: 'Patrol',
    Enter() {},
    Exit() {},
    Handle(d, evt) {
      if (evt === 'emp') {
        d.ChangeState(DroneStates.Stunned)
        return true
      }
      return false
    },
    Tick(d, dt) {
      if (d.Distance <= d.DetectRange) {
        d.ChangeState(DroneStates.Chase)
        return
      }
      d.Patrol(dt)
    },
  }

  const SearchState: IDroneState = {
    Name: 'Search',
    Enter(d) {
      d.SearchTimer = 0
    },
    Exit(d) {
      d.SearchTimer = 0
    },
    Handle() {
      // [!] 여기서 EMP 를 받지 않는다 (나중에 더한 수색 상태: emp 규칙을 복사하지 않았다)
      return false
    },
    Tick(d, dt) {
      if (d.Distance <= d.DetectRange) {
        d.ChangeState(DroneStates.Chase)
        return
      }
      if (!d.MoveToward(d.LastSeenX, dt)) return
      const before = d.SearchTimer
      d.SearchTimer = f(d.SearchTimer + dt)
      if (Math.trunc(f(d.SearchTimer / f(0.5))) !== Math.trunc(f(before / f(0.5)))) d.Facing = -d.Facing
      if (d.SearchTimer >= d.SearchTime) d.ChangeState(DroneStates.Patrol)
    },
  }

  const ChaseState: IDroneState = {
    Name: 'Chase',
    Enter(d) {
      d.SetAlert(true)
      d.LastSeenX = d.TargetX
    },
    Exit(d) {
      d.SetAlert(false) // [!] ChaseState.Exit 에서 끈다: 추격 → 공격으로 옮겨도 꺼진다
    },
    Handle(d, evt) {
      if (evt === 'emp') {
        d.ChangeState(DroneStates.Stunned)
        return true
      }
      return false
    },
    Tick(d, dt) {
      if (d.Distance > f(d.DetectRange + f(0.5))) {
        d.ChangeState(DroneStates.Search)
        return
      }
      d.LastSeenX = d.TargetX
      if (d.Distance <= d.AttackRange) {
        d.ChangeState(DroneStates.Attack)
        return
      }
      d.MoveToward(d.TargetX, dt)
    },
  }

  const AttackState: IDroneState = {
    Name: 'Attack',
    Enter(d) {
      d.ChargeTimer = 0
      d.Charging = true
      d.FaceTarget()
      // [!] 여기서 경계등을 켜지 않는다 (Chase.Enter 의 SetAlert(true) 를 복사하지 않았다)
    },
    Exit(d) {
      d.ChargeTimer = 0
      d.Charging = false
    },
    Handle(d, evt) {
      if (evt === 'emp') {
        d.ChangeState(DroneStates.Stunned)
        return true
      }
      return false
    },
    Tick(d, dt) {
      if (d.Distance > f(d.DetectRange + f(0.5))) {
        d.ChangeState(DroneStates.Search)
        return
      }
      d.LastSeenX = d.TargetX
      if (d.Distance > f(d.AttackRange + f(0.5))) {
        d.ChangeState(DroneStates.Chase)
        return
      }
      d.FaceTarget()
      d.ChargeTimer = f(d.ChargeTimer + dt)
      if (d.ChargeTimer >= d.ChargeTime) {
        d.Fire()
        d.ChargeTimer = 0
      }
    },
  }

  const StunnedState: IDroneState = {
    Name: 'Stunned',
    Enter(d) {
      d.Stun()
    },
    Exit(d) {
      d.StunTimer = 0
    },
    Handle() {
      return false
    },
    Tick(d, dt) {
      d.StunTimer = f(d.StunTimer - dt)
      if (d.StunTimer <= 0) d.ChangeState(DroneStates.Patrol)
    },
  }

  const DroneStates = { Patrol: PatrolState, Search: SearchState, Chase: ChaseState, Attack: AttackState, Stunned: StunnedState }
  return { NaiveDrone, DroneStates }
})()

/* ───────── truth/hierarchical-state-enemy/Target.cs 와 같은 어댑터 + 무대 그림 ───────── */

const HARIN_START_X = f(3)
const HARIN_STEP = f(1)
const F2 = (v: number) => v.toFixed(2)
const B = (b: boolean) => (b ? 1 : 0)
const C = { dim: '#8796ae', faint: '#4a5872', line: '#26344c', warn: '#ffb547', bug: '#ff5d6c', accent: '#7ee081', ally: '#5cc8ff', enemy: '#ff6b6b', text: '#e6edf7', panel: '#162135' }
/** 충전 막대의 꽉 찬 값: 충전 시간은 조절 값이 아니라 고정(0.6초)이다. 막대 끝이 쏘는 순간 */
const CHARGE_FULL = f(0.6)
/** 경계등 고리의 높이 (화면에만): 드론 이름표 위 */
const ALERT_Y = 3.32
/** 감지 거리 점선 상자의 높이 (화면에만) */
const DETECT_H = 2.5
const POSE = { Patrol: 'idle', Search: 'idle', Chase: 'run', Attack: 'attack', Stunned: 'down' } as const
type Leaf = keyof typeof POSE
/** 구조 그림 노드: 상태 이름 → 그 상태가 들어 있는 노드 */
const NODE: Record<string, string> = { Active: 'active', Combat: 'combat', Patrol: 'ps', Search: 'ps', Chase: 'ca', Attack: 'ca', Stunned: 'stunned' }

interface DroneLook {
  x: number
  facing: number
  leaf: Leaf
  alert: boolean
  charge: number
  lastSeenX: number
  searchTimer: number
  searchTime: number
  stunTimer: number
  detect: number
  attack: number
  distance: number
}

/** 두 모드가 같이 쓰는 그림: 땅, 순찰 구간, 감지·공격 거리, 드론, 경계등, 충전 막대, 수색 표시, 하린 */
function scene(d: DroneLook, harinX: number): WorldItem[] {
  const stunned = d.leaf === 'Stunned'
  const world: WorldItem[] = [
    { kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' },
    { kind: 'box', x: 9, y: 0.62, w: 4, h: 0.26, fill: '#2f4363' },
    { kind: 'text', x: 11, y: 0.2, text: '순찰 구간', size: 16, color: C.dim },
  ]
  if (!stunned) {
    const attack = d.attack
    // 두 글을 위아래로 엇갈린다: 감지 거리는 큰 상자 윗변 바로 위, 공격 거리는 작은 상자 아래쪽. 두 거리가 같아도(3.5m) 겹치지 않는다.
    // 큰 상자 안쪽 위는 경계등 고리와 그 설명("경계등 꺼짐") 자리다. 두 글 모두 하린의 반대쪽 모서리에 둔다
    const side = harinX <= d.x ? 1 : -1
    const edge = (x: number) => Math.max(0.1, Math.min(15.9, x))
    const toward = side > 0 ? 'right' : 'left'
    const away = side > 0 ? 'left' : 'right'
    // 공격 상자가 좁으면(2m 미만) 안쪽 글이 드론 몸에 닿아, 상자 바깥 아래에 둔다 (감지 상자 모서리는 3.5m 이상이라 닿지 않는다)
    const inside = attack >= 2
    world.push(
      { kind: 'box', x: d.x - d.detect, y: 1, w: d.detect * 2, h: DETECT_H, stroke: C.faint, dashed: true },
      { kind: 'text', x: edge(d.x + side * (d.detect - 0.12)), y: 1 + DETECT_H + 0.12, text: `감지 ${d.detect.toFixed(1)}m`, align: toward, size: 16, color: C.dim },
      { kind: 'box', x: d.x - attack, y: 1, w: attack * 2, h: 1.9, stroke: '#a8783a', dashed: true },
      { kind: 'text', x: edge(d.x + side * (inside ? attack - 0.12 : attack + 0.12)), y: 1.15, text: `공격 ${attack.toFixed(1)}m`, align: inside ? toward : away, size: 16, color: C.warn },
    )
  }
  if (d.leaf === 'Search') {
    // 마지막으로 본 자리: 수색이 여기로 가서 두리번거린다
    world.push(
      { kind: 'text', x: d.lastSeenX, y: 1.3, text: '?', size: 44, color: C.warn },
      { kind: 'box', x: d.lastSeenX - 0.04, y: 0.62, w: 0.08, h: 0.38, fill: C.warn },
      { kind: 'text', x: d.lastSeenX, y: 0.2, text: '마지막으로 본 자리', size: 16, color: C.warn },
    )
  }
  world.push({ kind: 'actor', x: d.x, y: 1, role: 'enemy', label: stunned ? undefined : '잔해 드론', pose: POSE[d.leaf], facing: d.facing === 1 ? 1 : -1 })
  if (stunned) {
    const away = harinX <= d.x ? 1 : -1
    world.push({ kind: 'text', x: d.x - away * 0.25, y: 1.75, text: `잔해 드론 · 기절 ${F2(d.stunTimer)}초`, align: away > 0 ? 'left' : 'right', size: 20, color: C.text })
  } else {
    // 경계등: 머리 위 고리. 켜지면 빨간 겹고리, 꺼지면 회색 고리 하나 (색과 모양을 함께 바꾼다)
    if (d.alert) world.push({ kind: 'ring', x: d.x, y: ALERT_Y, r: 0.11, color: C.enemy }, { kind: 'ring', x: d.x, y: ALERT_Y, r: 0.23, color: C.enemy })
    else world.push({ kind: 'ring', x: d.x, y: ALERT_Y, r: 0.11, color: C.faint })
  }
  if (d.leaf === 'Attack') {
    const left = d.x - 0.8
    world.push({ kind: 'bar', x: left, y: 3.75, w: 1.6, value: d.charge / CHARGE_FULL, fill: C.warn, label: '충전' })
  }
  world.push({ kind: 'actor', x: harinX, y: 1, role: 'ally', label: '하린', facing: d.x >= harinX ? 1 : -1 })
  return world
}

/** 왼쪽 위 셋째 줄: 지금 잎의 일 */
function detail(d: DroneLook) {
  const base = `경계등 ${d.alert ? '켜짐' : '꺼짐'} · 거리 ${Number.isFinite(d.distance) ? F2(d.distance) : '-'}m`
  if (d.leaf === 'Attack') return `${base} · 충전 ${F2(d.charge)}/${F2(CHARGE_FULL)}초`
  if (d.leaf === 'Search') return `${base} · 수색 ${F2(d.searchTimer)}/${F2(d.searchTime)}초`
  if (d.leaf === 'Stunned') return `${base} · 기절 남은 ${F2(d.stunTimer)}초`
  return base
}

/** EMP: 하린 앞에서 드론까지의 화살표와 드론의 고리 (0.3초) */
function empMark(harinX: number, droneX: number): WorldItem[] {
  const dir = droneX >= harinX ? 1 : -1
  return [
    { kind: 'arrow', x1: harinX + dir * 0.4, y1: 1.9, x2: droneX - dir * 0.35, y2: 1.5, color: C.ally },
    { kind: 'ring', x: droneX, y: 1.5, r: 0.55, color: C.ally },
  ]
}

function shotMark(droneX: number, facing: number, shotX: number): WorldItem[] {
  return [
    { kind: 'arrow', x1: droneX + facing * 0.35, y1: 1.75, x2: shotX + (shotX < droneX ? 0.3 : -0.3), y2: 1.75, color: C.warn },
    { kind: 'ring', x: shotX, y: 1.7, r: 0.6, color: C.warn },
  ]
}

/* 오른쪽 위 상태 트리 (가로 9.15~15.95, 세로 4.35~8.75) */
const ON_FILL = 'rgba(126, 224, 129, 0.14)'
const LEAF_FILL = 'rgba(126, 224, 129, 0.38)'

function treeBox(x: number, y: number, w: number, h: number, on: boolean, leaf: boolean, label?: string): WorldItem {
  return { kind: 'box', x, y, w, h, fill: leaf ? LEAF_FILL : on ? ON_FILL : C.panel, stroke: on ? C.accent : C.line, label }
}

/** 계층: Active{Patrol, Search, Combat{Chase, Attack}}, Stunned. 지금 잎부터 조상까지 밝게 */
function hierarchyTree(leaf: Leaf): WorldItem[] {
  const onPath = new Set<string>()
  for (let s: HState | null = DroneStates[leaf]; s !== null; s = s.Parent) onPath.add(s.Name)
  const tone = (name: string) => (onPath.has(name) ? C.accent : C.dim)
  return [
    treeBox(9.15, 4.35, 4.75, 4.4, onPath.has('Active'), false),
    { kind: 'text', x: 9.3, y: 8.38, text: 'Active · EMP→기절', align: 'left', size: 18, color: tone('Active') },
    treeBox(9.3, 7.0, 2.15, 0.85, onPath.has('Patrol'), leaf === 'Patrol', 'Patrol'),
    treeBox(11.6, 7.0, 2.15, 0.85, onPath.has('Search'), leaf === 'Search', 'Search'),
    treeBox(9.3, 4.5, 4.45, 2.3, onPath.has('Combat'), false),
    { kind: 'text', x: 9.45, y: 6.38, text: 'Combat · 경계등', align: 'left', size: 18, color: tone('Combat') },
    { kind: 'text', x: 9.45, y: 5.95, text: '놓치면 수색', align: 'left', size: 16, color: tone('Combat') },
    treeBox(9.45, 4.65, 2.0, 0.85, onPath.has('Chase'), leaf === 'Chase', 'Chase'),
    treeBox(11.6, 4.65, 2.0, 0.85, onPath.has('Attack'), leaf === 'Attack', 'Attack'),
    treeBox(14.05, 7.0, 1.9, 0.85, onPath.has('Stunned'), leaf === 'Stunned', 'Stunned'),
    { kind: 'text', x: 15.0, y: 6.6, text: '시간 끝→순찰', size: 15, color: tone('Stunned') },
  ]
}

/** 나쁜 예: 같은 높이의 상자 다섯과 상자마다 복사한 규칙 꼬리표. 빠진 규칙은 주황, 그 버그의 ✖ 가 사건 기록에 뜬 뒤에는 빨강 */
function flatTree(leaf: Leaf, empBug: boolean, alertBug: boolean): WorldItem[] {
  const rows: [Leaf, [string, string][]][] = [
    ['Patrol', [['EMP→기절', C.dim]]],
    ['Search', [['EMP→기절 없음', empBug ? C.bug : C.warn]]],
    ['Chase', [['EMP→기절', C.dim], ['경계등 켬/끔', C.dim]]],
    ['Attack', [['EMP→기절', C.dim], ['경계등 없음', alertBug ? C.bug : C.warn]]],
    ['Stunned', [['시간 끝→순찰', C.dim]]],
  ]
  const world: WorldItem[] = []
  rows.forEach(([name, tags], i) => {
    const y = 8.0 - i * 0.86
    world.push(treeBox(9.15, y, 2.1, 0.72, name === leaf, name === leaf, name))
    tags.forEach(([text, color], j) => world.push({ kind: 'text', x: 11.4 + j * 1.62, y: y + 0.22, text: j ? `· ${text}` : text, align: 'left', size: 16, color }))
  })
  return world
}

export const createSim: SimFactory = (values: ParamValues, naive: boolean): PatternSim => {
  const num = (k: string) => f(Number(values[k]))
  const events: string[] = []
  let clock = 0
  let harinX = HARIN_START_X
  let lastMoveAt = -9
  let lastEmpAt = -9
  let lastFireAt = -9
  let shotX = 0
  const detect = num('detectRange')
  const attack = num('attackRange')
  const stunTime = num('stunTime')
  /** 수색 시간은 조절 값이 아니다 (기본 2초) */
  const searchTime = new DroneSettings().SearchTime

  if (!naive) {
    const settings = new DroneSettings()
    settings.DetectRange = detect
    settings.AttackRange = attack
    settings.StunTime = stunTime
    const drone = new Drone(settings)
    const machine = new StateMachine(drone, DroneStates.Patrol)
    /** 0.3초 안에 Exit·Enter·Handle 한 층의 노드 (구조 그림) */
    const touched: { at: number; node: string }[] = []
    const touch = (s: HState) => touched.push({ at: clock, node: NODE[s.Name] })
    machine.Exited.add(s => {
      events.push(`Exit ${s.Name}`)
      touch(s)
    })
    machine.Entered.add(s => {
      events.push(`Enter ${s.Name}`)
      touch(s)
    })
    machine.Handled.add((leaf, s, evt) => {
      events.push(`${evt}: ${leaf.Name} → ${s.Name} 가 처리`)
      touch(s)
    })
    machine.Ignored.add((leaf, evt) => {
      events.push(`${evt} 받는 층 없음 (${leaf.Name})`)
      touch(leaf)
    })
    drone.AlertChanged.add(on => events.push(on ? '경계등 켬' : '경계등 끔'))
    drone.Fired.add(x => {
      events.push(`사격 → 하린 (거리 ${F2(Math.abs(f(x - drone.X)))})`)
      lastFireAt = clock
      shotX = x
    })
    drone.Stunned.add(s => events.push(`기절 ${F2(s)}초`))

    const step = (toward: number) => {
      const dir = drone.X >= harinX ? 1 : -1
      harinX = Math.max(f(0.5), Math.min(f(15.5), f(harinX + f(toward * dir * HARIN_STEP))))
    }
    return {
      input(name) {
        if (name === 'approach') step(1)
        else if (name === 'retreat') step(-1)
        else {
          lastEmpAt = clock
          machine.Handle(DroneInput.Emp)
        }
        if (name !== 'emp') lastMoveAt = clock
      },
      tick(dt) {
        drone.TargetX = harinX
        machine.Tick(dt)
        clock += dt
      },
      drain: () => events.splice(0),
      snapshot: () => `state=${StateMachine.PathOf(machine.Current)} x=${F2(drone.X)} harin=${F2(harinX)} alert=${B(drone.AlertOn)} charge=${F2(drone.ChargeTimer)} search=${F2(drone.SearchTimer)} stun=${F2(drone.StunTimer)}`,
      view(): SimView {
        const leaf = machine.Current.Name as Leaf
        const look: DroneLook = {
          x: drone.X,
          facing: drone.Facing,
          leaf,
          alert: drone.AlertOn,
          charge: drone.ChargeTimer,
          lastSeenX: drone.LastSeenX,
          searchTimer: drone.SearchTimer,
          searchTime,
          stunTimer: drone.StunTimer,
          detect,
          attack,
          distance: f(Math.abs(f(harinX - drone.X))),
        }
        const world = scene(look, harinX)
        world.push(
          { kind: 'text', x: 0.4, y: 8.3, text: `현재 잎: ${leaf}State`, align: 'left', size: 26, color: C.accent },
          { kind: 'text', x: 0.4, y: 7.6, text: `경로 ${StateMachine.PathOf(machine.Current).split('/').join(' › ')}`, align: 'left', size: 20, color: C.dim },
          { kind: 'text', x: 0.4, y: 6.95, text: detail(look), align: 'left', size: 20, color: C.dim },
          ...hierarchyTree(leaf),
        )
        if (clock - lastFireAt < 0.25) world.push(...shotMark(drone.X, drone.Facing, shotX))
        if (clock - lastEmpAt < 0.3) world.push(...empMark(harinX, drone.X))
        const active = new Set([NODE[leaf]])
        if (clock - lastMoveAt < 0.3) active.add('ctrl').add('ctrl-machine')
        if (clock - lastEmpAt < 0.3) active.add('ctrl').add('ctrl-machine').add('machine')
        const recent = touched.filter(t => clock - t.at < 0.3)
        if (recent.length) active.add('machine').add('machine-hstate')
        for (const t of recent) active.add(t.node)
        while (touched.length && clock - touched[0].at >= 0.3) touched.shift()
        return { world, active: [...active] }
      },
    }
  }

  const n = new Naive.NaiveDrone()
  n.DetectRange = detect
  n.AttackRange = attack
  n.StunTime = stunTime
  let lastChangeAt = -9
  n.StateChanged.add((from, to) => {
    events.push(`${from} → ${to}`)
    lastChangeAt = clock
  })
  n.AlertChanged.add(on => events.push(on ? '경계등 켬' : '경계등 끔'))
  n.Fired.add(x => {
    events.push(`사격 → 하린 (거리 ${F2(Math.abs(f(x - n.X)))})`)
    lastFireAt = clock
    shotX = x
  })
  n.Stunned.add(s => events.push(`기절 ${F2(s)}초`))
  /** Target.cs 의 bugAlert, reportedAlert, reportedEmp */
  let bugAlert = false
  let reportedAlert = false
  let reportedEmp = false
  /** 무시된 EMP: 그때의 상태와, 기절했어야 할 시간이 끝나는 시각 (그림 전용) */
  let ignoredIn = ''
  let ignoredUntil = -9
  const naiveBugs = () => {
    const now = n.State === Naive.DroneStates.Attack && !n.AlertOn
    if (now && !bugAlert) {
      events.push(reportedAlert ? '또 경계등 꺼짐 (Attack)' : '!경계등 꺼짐: Attack 인데 경계등이 꺼져 있다 (Chase.Exit 가 끄고 Attack.Enter 는 켜지 않는다)')
      reportedAlert = true
    }
    bugAlert = now
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
        lastEmpAt = clock
        const before = n.State
        n.Handle('emp')
        if (before !== Naive.DroneStates.Stunned && n.State === before) {
          events.push(reportedEmp ? `또 EMP 무시 (${before.Name})` : `!EMP 무시: ${before.Name} 에서 EMP 를 맞았는데 그대로 움직인다 (${before.Name}State.Handle 에 emp 규칙이 없다)`)
          reportedEmp = true
          ignoredIn = before.Name
          ignoredUntil = clock + n.StunTime
        }
      }
      if (name !== 'emp') lastMoveAt = clock
      naiveBugs()
    },
    tick(dt) {
      n.TargetX = harinX
      n.Tick(dt)
      naiveBugs()
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot: () => `state=${n.State.Name} x=${F2(n.X)} harin=${F2(harinX)} alert=${B(n.AlertOn)} charge=${F2(n.ChargeTimer)} search=${F2(n.SearchTimer)} stun=${F2(n.StunTimer)}`,
    view(): SimView {
      const leaf = n.State.Name as Leaf
      const look: DroneLook = {
        x: n.X,
        facing: n.Facing,
        leaf,
        alert: n.AlertOn,
        charge: n.ChargeTimer,
        lastSeenX: n.LastSeenX,
        searchTimer: n.SearchTimer,
        searchTime,
        stunTimer: n.StunTimer,
        detect,
        attack,
        distance: f(Math.abs(f(harinX - n.X))),
      }
      const ignoring = clock < ignoredUntil
      const world = scene(look, harinX)
      world.push(
        { kind: 'text', x: 0.4, y: 8.3, text: `State = ${leaf}State`, align: 'left', size: 26, color: bugAlert || ignoring ? C.bug : C.warn },
        // 빨강은 ✖ 판정(경계등 꺼진 공격, 무시된 EMP)이 이어지는 동안만. EMP 를 맞지 않은 수색은 emp 줄이 빠진 모양만 주황으로
        { kind: 'text', x: 0.4, y: 7.6, text: `AlertOn = ${n.AlertOn} · ${leaf}.Handle: emp ${leaf === 'Search' || leaf === 'Stunned' ? '없음' : '있음'}`, align: 'left', size: 20, color: bugAlert || ignoring ? C.bug : leaf === 'Search' ? C.warn : C.dim },
        { kind: 'text', x: 0.4, y: 6.95, text: detail(look), align: 'left', size: 20, color: bugAlert ? C.bug : C.dim },
        ...flatTree(leaf, reportedEmp, reportedAlert),
      )
      if (bugAlert) {
        // 버그가 이어지는 동안 남는 표시: 꺼진 경계등 옆의 원인
        world.push({ kind: 'text', x: n.X + 0.35, y: ALERT_Y - 0.12, text: '경계등 꺼짐 (Chase.Exit)', align: 'left', size: 18, color: C.bug })
      }
      if (ignoring) {
        // 기절했어야 할 동안 남는 표시: 드론 둘레의 빨간 점선과, 왼쪽 위의 남은 시간
        world.push(
          { kind: 'box', x: n.X - 0.6, y: 0.95, w: 1.2, h: 1.65, stroke: C.bug, dashed: true },
          { kind: 'text', x: 0.4, y: 6.3, text: `EMP 무시 (${ignoredIn}) · 기절했어야 ${F2(ignoredUntil - clock)}초 더`, align: 'left', size: 20, color: C.bug },
        )
      }
      if (clock - lastFireAt < 0.25) world.push(...shotMark(n.X, n.Facing, shotX))
      if (clock - lastEmpAt < 0.3) world.push(...empMark(harinX, n.X))
      const active = new Set([leaf.toLowerCase()])
      if (clock - lastMoveAt < 0.3 || clock - lastEmpAt < 0.3 || clock - lastChangeAt < 0.3) active.add('ndrone').add('n-state')
      if (bugAlert) active.add('chase')
      return { world, active: [...active] }
    },
  }
}
