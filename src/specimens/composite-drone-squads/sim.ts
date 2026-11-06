import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/composite-drone-squads 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/composite-drone-squads/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다. */

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

/* ───────── Core/IUnit.cs ───────── */

type Order = 'Sortie' | 'Recall'

interface IUnit {
  readonly Name: string
  Parent: Squad | null
  Sortie(): void
  Recall(): void
  CountDrones(): number
  CountDocked(): number
  Tick(dt: number): void
  readonly OrderReceived: Event<[IUnit, Order]>
  readonly Arrived: Event<[Drone]>
}

/* ───────── Core/Drone.cs ───────── */

type DroneStatus = 'Docked' | 'Outbound' | 'Patrolling' | 'Returning'

interface FlightSettings {
  FlySpeed: number
  PatrolDistance: number
}

class Drone implements IUnit {
  readonly Name: string
  Parent: Squad | null = null
  readonly Settings: FlightSettings
  readonly HomeX: number
  readonly HomeY: number
  readonly PatrolHeight: number
  readonly ExtraReach: number
  X: number
  Y: number
  Status: DroneStatus
  readonly OrderReceived = new Event<[IUnit, Order]>()
  readonly Arrived = new Event<[Drone]>()

  constructor(name: string, homeX: number, homeY: number, patrolHeight: number, extraReach: number, startOnPatrol: boolean, settings: FlightSettings) {
    this.Name = name
    this.HomeX = homeX
    this.HomeY = homeY
    this.PatrolHeight = patrolHeight
    this.ExtraReach = extraReach
    this.Settings = settings
    if (startOnPatrol) {
      this.X = this.PatrolX
      this.Y = this.PatrolY
      this.Status = 'Patrolling'
    } else {
      this.X = homeX
      this.Y = homeY
      this.Status = 'Docked'
    }
  }

  get PatrolX() {
    return f(f(this.HomeX + this.Settings.PatrolDistance) + this.ExtraReach)
  }
  get PatrolY() {
    return f(this.HomeY + this.PatrolHeight)
  }
  get IsFlying() {
    return this.Status === 'Outbound' || this.Status === 'Returning'
  }

  Sortie() {
    if (this.Status === 'Docked' || this.Status === 'Returning') this.Status = 'Outbound'
    this.OrderReceived.invoke(this, 'Sortie')
  }

  Recall() {
    if (this.Status === 'Outbound' || this.Status === 'Patrolling') this.Status = 'Returning'
    this.OrderReceived.invoke(this, 'Recall')
  }

  CountDrones() {
    return 1
  }

  CountDocked() {
    return this.Status === 'Docked' ? 1 : 0
  }

  Tick(dt: number) {
    if (!this.IsFlying) return
    const outbound = this.Status === 'Outbound'
    const tx = outbound ? this.PatrolX : this.HomeX
    const ty = outbound ? this.PatrolY : this.HomeY
    const dx = f(tx - this.X)
    const dy = f(ty - this.Y)
    const dist = f(Math.sqrt(f(f(dx * dx) + f(dy * dy))))
    const step = f(this.Settings.FlySpeed * dt)
    if (dist <= step) {
      this.X = tx
      this.Y = ty
      this.Status = outbound ? 'Patrolling' : 'Docked'
      this.Arrived.invoke(this)
      return
    }
    this.X = f(this.X + f(f(dx / dist) * step))
    this.Y = f(this.Y + f(f(dy / dist) * step))
  }
}

/* ───────── Core/Squad.cs ───────── */

class Squad implements IUnit {
  private children: IUnit[] = []
  readonly Name: string
  Parent: Squad | null = null
  readonly OrderReceived = new Event<[IUnit, Order]>()
  readonly Arrived = new Event<[Drone]>()
  readonly Joined = new Event<[Squad, IUnit]>()
  readonly JoinRejected = new Event<[Squad, IUnit, string]>()

  constructor(name: string) {
    this.Name = name
  }

  get Children(): readonly IUnit[] {
    return this.children
  }

  Add(unit: IUnit): boolean {
    const reason = this.RejectReason(unit)
    if (reason !== null) {
      this.JoinRejected.invoke(this, unit, reason)
      return false
    }
    this.children.push(unit)
    unit.Parent = this
    unit.OrderReceived.add(this.ForwardOrder)
    unit.Arrived.add(this.ForwardArrived)
    this.Joined.invoke(this, unit)
    return true
  }

  private RejectReason(unit: IUnit): string | null {
    for (let s: Squad | null = this; s !== null; s = s.Parent) {
      if (s !== unit) continue
      return s === this ? `${this.Name} 를 자기 안에 넣을 수 없다` : `${unit.Name} 는 ${this.Name} 의 상위 편대다 (넣으면 명령이 끝없이 돈다)`
    }
    if (unit.Parent !== null) return `${unit.Name} 는 이미 ${unit.Parent.Name} 소속`
    return null
  }

  private ForwardOrder = (unit: IUnit, order: Order) => this.OrderReceived.invoke(unit, order)

  private ForwardArrived = (drone: Drone) => this.Arrived.invoke(drone)

  Sortie() {
    this.OrderReceived.invoke(this, 'Sortie')
    for (const child of this.children) child.Sortie()
  }

  Recall() {
    this.OrderReceived.invoke(this, 'Recall')
    for (const child of this.children) child.Recall()
  }

  CountDrones() {
    let n = 0
    for (const child of this.children) n += child.CountDrones()
    return n
  }

  CountDocked() {
    let n = 0
    for (const child of this.children) n += child.CountDocked()
    return n
  }

  Tick(dt: number) {
    for (const child of this.children) child.Tick(dt)
  }
}

/* ───────── Naive/NaiveSquads.cs ───────── */

class NaiveSquad {
  name: string
  drones: Drone[] = []
  squads: NaiveSquad[] = []
  constructor(name: string) {
    this.name = name
  }
}

class NaiveCommander {
  root = new NaiveSquad('본대')
  squadB = new NaiveSquad('B')
  support = new NaiveSquad('C')
  supportJoined = false

  SortieAll() {
    for (const d of this.root.drones) d.Sortie()
    for (const s of this.root.squads) for (const d of s.drones) d.Sortie()
  }

  RecallAll() {
    for (const d of this.root.drones) d.Recall()
    for (const s of this.root.squads) for (const d of s.drones) d.Recall()
  }

  CountDrones() {
    let n = this.root.drones.length
    for (const s of this.root.squads) n += s.drones.length
    return n
  }

  JoinSupport() {
    if (this.supportJoined) return
    this.supportJoined = true
    this.squadB.squads.push(this.support)
  }
}

/* ───────── truth/composite-drone-squads/Target.cs 와 같은 어댑터 + 무대 그림 ───────── */

const Names = ['D1', 'D2', 'D3', 'D4', 'D5']
const HomeXs = [0.7, 1.6, 2.5, 3.4, 4.3].map(f)
const HomeY = f(1)
const Heights = [2, 1, 3, 1, 2.4].map(f)
const Reaches = [0, 0, 0, 3, 3.8].map(f)

const makeDrones = (s: FlightSettings) => Names.map((n, i) => new Drone(n, HomeXs[i], HomeY, Heights[i], Reaches[i], i >= 3, s))
const orderName = (o: Order) => (o === 'Sortie' ? '출격' : '귀환')
const arrivedLine = (d: Drone) => (d.Status === 'Patrolling' ? `${d.Name} 정찰 지점 도착` : `${d.Name} 기지 도착`)
const path = (unit: IUnit) => {
  let p = unit.Name
  for (let s = unit.Parent; s !== null; s = s.Parent) p = `${s.Name}/${p}`
  return p
}
const find = (s: NaiveSquad, d: Drone, p: string): string | null => {
  if (s.drones.includes(d)) return `${p}.drones`
  for (let i = 0; i < s.squads.length; i++) {
    const found = find(s.squads[i], d, `${p}.squads[${i}]`)
    if (found !== null) return found
  }
  return null
}
const isOut = (d: Drone) => d.Status === 'Outbound' || d.Status === 'Patrolling'
const F2 = (v: number) => v.toFixed(2)

/* 무대 색 */
const COL = { ok: '#7ee081', bug: '#ff5d6c', warn: '#ffb547', dim: '#8796ae', line: '#33445f', chip: '#1b2a40', text: '#e6edf7' }

export const createSim: SimFactory = (values: ParamValues, isNaive: boolean): PatternSim => {
  const events: string[] = []
  const settings: FlightSettings = { FlySpeed: f(Number(values.flySpeed)), PatrolDistance: f(Number(values.patrolDistance)) }

  // 패턴 (나쁜 예 모드에서는 그림자)
  const drones = makeDrones(settings)
  const root = new Squad('본대')
  const squadB = new Squad('B')
  const support = new Squad('C')
  root.Add(drones[0])
  root.Add(squadB)
  squadB.Add(drones[1])
  squadB.Add(drones[2])
  support.Add(drones[3])
  support.Add(drones[4])

  // 나쁜 예
  let naive: NaiveCommander | null = null
  let naiveDrones: Drone[] = []
  let lastCountWrong = false
  let reportedCount = false
  const lastMissed = [false, false, false, false, false]
  const reportedMissed = [false, false, false, false, false]

  // 그림용: 마지막 명령과 그 명령이 닿은 것 (패턴: 코어 이벤트, 나쁜 예: 나쁜 예 드론 + 그림자가 닿게 한 것)
  let clock = 0
  let lastOrder: Order | null = null
  const reached = new Set<string>()
  const shouldReach = new Set<string>()
  const at = { order: -9, join: -9, arrived: -9, count: -9, missed: -9 }

  // 그림자/패턴 코어가 이번 명령에서 닿은 것 (나쁜 예 모드에서는 '닿아야 할 것')
  root.OrderReceived.add(unit => {
    if (naive) shouldReach.add(unit.Name)
    else reached.add(unit.Name)
  })

  if (isNaive) {
    naiveDrones = makeDrones(settings)
    const n = new NaiveCommander()
    naive = n
    n.root.drones.push(naiveDrones[0])
    n.root.squads.push(n.squadB)
    n.squadB.drones.push(naiveDrones[1])
    n.squadB.drones.push(naiveDrones[2])
    n.support.drones.push(naiveDrones[3])
    n.support.drones.push(naiveDrones[4])
    for (const d of naiveDrones) {
      d.OrderReceived.add((unit, order) => {
        events.push(`${orderName(order)} → ${unit.Name} (${find(n.root, d, 'root') ?? '본대 밖'})`)
        reached.add(unit.Name)
      })
      d.Arrived.add(drone => {
        events.push(arrivedLine(drone))
        at.arrived = clock
      })
    }
  } else {
    root.OrderReceived.add((unit, order) => events.push(`${orderName(order)} → ${path(unit)}`))
    root.Arrived.add(drone => {
      events.push(arrivedLine(drone))
      at.arrived = clock
    })
    squadB.Joined.add((squad, unit) => events.push(`합류: ${unit.Name} → ${squad.Name} 의 하위 편대 (Joined)`))
    squadB.JoinRejected.add((_squad, _unit, reason) => events.push(`합류 거절: ${reason} (JoinRejected)`))
  }

  const coreInput = (name: string): boolean => {
    if (name === 'sortie') {
      root.Sortie()
      return false
    }
    if (name === 'recall') {
      root.Recall()
      return false
    }
    return squadB.Add(support)
  }

  const check = () => {
    const n = naive!
    const shown = n.CountDrones()
    const real = root.CountDrones()
    const wrong = shown !== real
    if (wrong && !lastCountWrong) {
      if (!reportedCount) {
        reportedCount = true
        events.push(`!수 오산: 화면 ${shown}, 실제 ${real} (CountDrones 가 B.squads 안 하위 편대의 드론을 세지 않는다)`)
        at.count = clock
      } else events.push(`드론 수 또 틀림: 화면 ${shown}, 실제 ${real}`)
    }
    lastCountWrong = wrong

    const fresh: string[] = []
    const again: string[] = []
    for (let i = 0; i < 5; i++) {
      const missed = !isOut(drones[i]) && isOut(naiveDrones[i])
      if (missed && !lastMissed[i]) {
        if (!reportedMissed[i]) {
          reportedMissed[i] = true
          fresh.push(Names[i])
        } else again.push(Names[i])
      }
      lastMissed[i] = missed
    }
    if (fresh.length > 0) {
      events.push(`!귀환 누락: ${fresh.join(', ')} 가 귀환 명령을 못 받았다 (하위 편대의 드론. RecallAll 은 두 단계까지만 돈다)`)
      at.missed = clock
    }
    if (again.length > 0) events.push(`${again.join(', ')} 또 귀환 명령을 못 받았다`)
  }

  const recent = (t: number, within = 0.3) => clock - t < within
  const joined = () => (naive ? naive.supportJoined : support.Parent !== null)

  return {
    input(name) {
      if (name !== 'join') {
        lastOrder = name === 'sortie' ? 'Sortie' : 'Recall'
        reached.clear()
        shouldReach.clear()
        at.order = clock
      } else at.join = clock
      const ok = coreInput(name)
      if (!naive) {
        if (ok) events.push(`편대 드론 수 ${root.CountDrones()} (CountDrones)`)
        return
      }
      if (name === 'sortie') {
        events.push('SortieAll(): root.drones, root.squads[i].drones')
        naive.SortieAll()
      } else if (name === 'recall') {
        events.push('RecallAll(): root.drones, root.squads[i].drones')
        naive.RecallAll()
      } else if (naive.supportJoined) {
        naive.JoinSupport()
        events.push('합류 무시 (supportJoined 가 이미 true)')
      } else {
        naive.JoinSupport()
        events.push('합류: C 를 B.squads 에 넣음 (supportJoined = true)')
        events.push(`편대 드론 수 ${naive.CountDrones()} (CountDrones)`)
      }
      check()
    },
    tick(dt) {
      root.Tick(dt)
      if (naive) for (const d of naiveDrones) d.Tick(dt)
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot: () => {
      const ds = naive ? naiveDrones : drones
      const pos = ds.map((d, i) => ` x${i + 1}=${F2(d.X)} y${i + 1}=${F2(d.Y)}`).join('')
      if (!naive) return `count=${root.CountDrones()} docked=${root.CountDocked()}${pos}`
      const docked = naiveDrones.reduce((n, d) => n + d.CountDocked(), 0)
      return `count=${naive.CountDrones()} real=${root.CountDrones()} docked=${docked}${pos}`
    },
    view(): SimView {
      const ds = naive ? naiveDrones : drones
      const isJoined = joined()
      const shown = naive ? naive.CountDrones() : root.CountDrones()
      const real = root.CountDrones()
      const docked = ds.reduce((n, d) => n + d.CountDocked(), 0)
      const orderText = lastOrder ? orderName(lastOrder) : ''
      /** 마지막 명령이 닿아야 했는데 못 받은 것 (나쁜 예만) */
      const missedOrder = (name: string) => naive !== null && shouldReach.has(name) && !reached.has(name)
      /** ✖ 귀환 누락과 같은 판정: 그림자 코어는 들어왔는데(오는 중) 나쁜 예 드론은 밖에 있다. 빨간 표시는 이것만 */
      const missedRecall = (i: number) => naive !== null && !isOut(drones[i]) && isOut(naiveDrones[i])
      /** 명령이 안 닿았지만 결과는 같은 것 (이미 나가 있는 드론에 출격). ✖ 가 아니라 회색으로 */
      const missedNoEffect = (i: number) => !missedRecall(i) && missedOrder(Names[i]) && lastOrder === 'Sortie' && isOut(ds[i])
      const got = (name: string) => lastOrder !== null && reached.has(name)

      const world: WorldItem[] = [{ kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' }]

      // 왼쪽 위: 편대 드론 수와 기지 도착
      world.push({ kind: 'text', x: 0.4, y: 8.3, text: `편대 드론 수 ${shown}`, align: 'left', size: 26, color: naive && shown !== real ? COL.warn : COL.ok })
      if (naive && shown !== real) world.push({ kind: 'text', x: 3.85, y: 8.3, text: `(실제 ${real})`, align: 'left', size: 26, color: COL.bug })
      world.push({
        kind: 'text',
        x: 0.4,
        y: 7.6,
        text: `기지 도착 ${docked} / 전체 ${shown}${lastOrder ? ` · 마지막 명령 ${orderText}` : ''}`,
        align: 'left',
        size: 20,
        color: naive && shown !== real ? COL.warn : COL.dim,
      })
      if (naive && shown !== real && docked === shown) world.push({ kind: 'text', x: 0.4, y: 6.95, text: `다 돌아왔다고 보이지만 ${ds.filter(d => isOut(d)).map(d => d.Name).join(', ')} 는 밖에 있다`, align: 'left', size: 18, color: COL.bug })

      // 정비 기지와 자리 다섯 칸. 상자 위 끝(2.45)은 정찰 거리 최소(4)에서 D1 이 뜨는 (4.7, 3) 과 그 아래 글보다 낮다. 이름은 땅 띠에
      world.push({ kind: 'box', x: 0.15, y: 1, w: 4.7, h: 1.45, fill: '#131d2d', stroke: COL.line })
      world.push({ kind: 'text', x: 0.3, y: 0.15, text: '정비 기지', align: 'left', size: 14, color: COL.dim })
      for (let i = 0; i < 5; i++) world.push({ kind: 'box', x: HomeXs[i] - 0.4, y: 1.02, w: 0.8, h: 1.0, stroke: '#2b3a52', dashed: true })

      // 오른쪽 위: 편대 트리 (상자 안 상자). 판의 아래 끝(y 5.5)은 정찰 거리 최대(7)에서 가장 높이 뜨는 D3(9.5, 4)의 이름표 위다.
      // 드론을 이 판 뒤에 그려 판이 드론을 가리지 않게 한다
      const squadStroke = (name: string) => (got(name) && recent(at.order, 1.2) ? COL.ok : COL.line)
      const chip = (i: number, x: number, y: number) => {
        const name = Names[i]
        const miss = missedRecall(i)
        const noEffect = missedNoEffect(i)
        const ok = !miss && !noEffect && got(name)
        world.push({
          kind: 'box',
          x,
          y,
          w: 1.2,
          h: 0.6,
          fill: COL.chip,
          stroke: miss ? COL.bug : noEffect ? COL.dim : ok ? COL.ok : '#4a5872',
          dashed: noEffect,
          label: miss ? `${name} ✖` : noEffect ? `${name} –` : ok ? `${name} ✓` : name,
        })
      }
      world.push({ kind: 'box', x: 8.2, y: 5.5, w: 5.85, h: 3.35, fill: '#101a2a', stroke: squadStroke('본대') })
      world.push({ kind: 'text', x: 8.35, y: 8.45, text: '본대', align: 'left', size: 18, color: COL.text })
      chip(0, 8.35, 7.55)
      world.push({ kind: 'box', x: 9.65, y: 5.62, w: 4.25, h: 3.1, fill: '#14213a', stroke: squadStroke('B') })
      world.push({ kind: 'text', x: 9.8, y: 8.3, text: '편대 B', align: 'left', size: 18, color: COL.text })
      chip(1, 9.8, 7.3)
      chip(2, 11.1, 7.3)
      if (isJoined) {
        // ✖ 수 오산과 같은 판정 (보이는 수가 실제와 다르다)
        const cMissed = naive !== null && shown !== real
        world.push({ kind: 'box', x: 9.8, y: 5.75, w: 3.95, h: 1.33, fill: '#182844', stroke: cMissed ? COL.bug : squadStroke('C'), dashed: cMissed })
        world.push({ kind: 'text', x: 9.95, y: 6.72, text: '편대 C', align: 'left', size: 18, color: COL.text })
        if (cMissed) world.push({ kind: 'text', x: 11.2, y: 6.72, text: 'foreach 밖', align: 'left', size: 15, color: COL.bug })
        chip(3, 11.2, 5.88)
        chip(4, 12.5, 5.88)
      } else {
        world.push({ kind: 'box', x: 14.25, y: 5.5, w: 1.6, h: 3.35, fill: '#101a2a', stroke: '#4a5872', dashed: true })
        world.push({ kind: 'text', x: 15.05, y: 8.45, text: '편대 C', size: 18, color: COL.text })
        world.push({ kind: 'text', x: 15.05, y: 8.0, text: '합류 전', size: 15, color: COL.dim })
        chip(3, 14.45, 7.0)
        chip(4, 14.45, 6.1)
      }
      // 합류 직후: 트리 밖에 있던 C 가 B 안으로 들어온 길
      if (recent(at.join, 0.8)) world.push({ kind: 'arrow', x1: 15.8, y1: 6.2, x2: 13.85, y2: 6.2, color: isJoined ? COL.ok : COL.dim, dashed: true })

      // 드론 (트리 판보다 나중에 그린다). 빨간 `명령 못 받음` 은 ✖ 귀환 누락과 같은 판정에서만,
      // 이미 나가 있어 결과가 같은 출격 누락은 회색 한 줄로 (정찰 거리 최대에서 D5 글이 D4 이름표에 닿지 않는 길이.
      // 오른쪽 끝 드론은 글이 잘리지 않게 글만 안쪽으로)
      ds.forEach((d, i) => {
        const flying = d.IsFlying
        const facing = d.Status === 'Returning' ? -1 : 1
        world.push({ kind: 'actor', x: d.X, y: d.Y, role: 'ally', label: d.Name, pose: flying ? 'run' : 'idle', facing, scale: 0.6 })
        const markY = d.Y - 0.42
        if (missedRecall(i)) world.push({ kind: 'text', x: Math.min(d.X, 15), y: markY, text: '명령 못 받음', size: 18, color: COL.bug })
        else if (missedNoEffect(i)) world.push({ kind: 'text', x: Math.min(d.X, 15.1), y: markY, text: '출격 못 받음', size: 15, color: COL.dim })
        else if (got(d.Name)) world.push({ kind: 'text', x: d.X, y: markY, text: d.Status === 'Docked' ? '✓' : `${orderText} ✓`, size: 16, color: COL.ok })
      })

      // 구조 그림: 입력 직후 그 입력이 지나는 노드와 화살표만
      const active: string[] = []
      if (naive) {
        if (recent(at.order)) active.push('ncmd', 'ncmd-ndrones', 'ndrones', 'ncmd-nsquads', 'nsquads', 'nsquads-nsubdrones', 'nsubdrones')
        if (recent(at.join)) active.push('nsquads', 'nsquads-nsub', 'nsub')
      } else {
        if (recent(at.order)) active.push('input', 'input-iunit', 'iunit', 'squad', 'squad-children', 'children', 'children-iunit', 'drone')
        if (recent(at.join)) active.push('input', 'squad', 'squad-children', 'children')
        if (recent(at.arrived)) active.push('drone')
      }
      return { world, active: [...new Set(active)] }
    },
  }
}
