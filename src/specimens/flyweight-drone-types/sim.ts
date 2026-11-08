import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/flyweight-drone-types 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/flyweight-drone-types/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다. */

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

/* ───────── Core/DroneType.cs ───────── */

class DroneType {
  readonly Name: string
  readonly Code: string
  private maxHp: number
  get MaxHp() {
    return this.maxHp
  }
  readonly Speed: number
  readonly ColorHex: string
  constructor(name: string, code: string, maxHp: number, speed: number, colorHex: string) {
    this.Name = name
    this.Code = code
    this.maxHp = Math.max(1, maxHp)
    this.Speed = f(speed)
    this.ColorHex = colorHex
  }
  RaiseMaxHp(amount: number) {
    if (amount <= 0) return
    this.maxHp += amount
  }
}

/* ───────── Core/Drone.cs ───────── */

class Drone {
  readonly Type: DroneType
  readonly Name: string
  private hp: number
  get Hp() {
    return this.hp
  }
  readonly X: number
  get IsDestroyed() {
    return this.hp <= 0
  }
  constructor(type: DroneType, name: string, x: number) {
    this.Type = type
    this.Name = name
    this.X = x
    this.hp = type.MaxHp
  }
  TakeDamage(amount: number) {
    if (amount <= 0 || this.IsDestroyed) return
    this.hp = Math.max(0, this.hp - amount)
  }
}

/* ───────── Core/Squad.cs ───────── */

class Squad {
  Damage = 1
  PatchHp = 2
  MaxDrones = 9
  Spacing = f(1.75)
  private types = new Map<string, DroneType>()
  private drones: Drone[] = []
  private made = new Map<DroneType, number>()
  get Types(): ReadonlyMap<string, DroneType> {
    return this.types
  }
  get Drones(): readonly Drone[] {
    return this.drones
  }
  Spawned = new Event<[Drone]>()
  SpawnRejected = new Event<[number]>()
  Damaged = new Event<[Drone, number]>()
  Destroyed = new Event<[Drone]>()
  NoTarget = new Event<[DroneType]>()
  TypePatched = new Event<[DroneType, number]>()

  constructor(...kinds: DroneType[]) {
    for (const kind of kinds) {
      if (this.types.has(kind.Name)) throw new Error(`같은 이름의 종류: ${kind.Name}`)
      this.types.set(kind.Name, kind)
    }
  }
  TypeOf(name: string) {
    const t = this.types.get(name)
    if (!t) throw new Error(`없는 종류: ${name}`)
    return t
  }
  CountOf(type: DroneType) {
    let n = 0
    for (const d of this.drones) if (d.Type === type) n++
    return n
  }
  SharedTypeCount() {
    return new Set(this.drones.map(d => d.Type)).size
  }
  Spawn(type: DroneType): Drone | null {
    if (this.types.get(type.Name) !== type) throw new Error(`사전에 없는 종류 객체다: ${type.Name}`)
    if (this.drones.length >= this.MaxDrones) {
      this.SpawnRejected.invoke(this.MaxDrones)
      return null
    }
    const n = (this.made.get(type) ?? 0) + 1
    this.made.set(type, n)
    const drone = new Drone(type, type.Code + n, this.FreeX())
    this.drones.push(drone)
    this.Spawned.invoke(drone)
    return drone
  }
  HitFirst(type: DroneType) {
    const target = this.FirstOf(type)
    if (!target) {
      this.NoTarget.invoke(type)
      return
    }
    target.TakeDamage(this.Damage)
    this.Damaged.invoke(target, this.Damage)
    if (!target.IsDestroyed) return
    this.drones.splice(this.drones.indexOf(target), 1)
    this.Destroyed.invoke(target)
  }
  Patch(type: DroneType) {
    const previous = type.MaxHp
    type.RaiseMaxHp(this.PatchHp)
    this.TypePatched.invoke(type, previous)
  }
  private FirstOf(type: DroneType) {
    for (const d of this.drones) if (d.Type === type) return d
    return null
  }
  private FreeX() {
    for (let slot = 0; ; slot++) {
      const x = f(slot * this.Spacing)
      let taken = false
      for (const d of this.drones) {
        if (d.X !== x) continue
        taken = true
        break
      }
      if (!taken) return x
    }
  }
}

/* ───────── Naive/NaiveSquad.cs ───────── */

class NaiveDroneType {
  typeName = ''
  code = ''
  maxHp = 0
  speed = 0
  color = ''
  currentHp = 0
}

class NaiveDrone {
  type!: NaiveDroneType
  droneName = ''
  x = 0
  get Hp() {
    return this.type.currentHp
  }
  TakeDamage(amount: number) {
    this.type.currentHp = Math.max(0, this.type.currentHp - amount)
  }
}

class NaiveSquad {
  damage = 1
  patchHp = 2
  maxDrones = 9
  spacing = f(1.75)
  scoutType!: NaiveDroneType
  heavyType!: NaiveDroneType
  drones: NaiveDrone[] = []
  private made = new Map<NaiveDroneType, number>()
  OnHitScout() {
    this.Hit(this.scoutType)
  }
  OnHitHeavy() {
    this.Hit(this.heavyType)
  }
  OnSpawn() {
    this.Spawn(this.scoutType)
  }
  OnPatch() {
    this.scoutType.maxHp += this.patchHp
  }
  Spawn(type: NaiveDroneType): NaiveDrone | null {
    if (this.drones.length >= this.maxDrones) return null
    const n = (this.made.get(type) ?? 0) + 1
    this.made.set(type, n)
    const drone = Object.assign(new NaiveDrone(), { type, droneName: type.code + n, x: this.FreeX() })
    this.drones.push(drone)
    return drone
  }
  private Hit(type: NaiveDroneType) {
    const target = this.drones.find(d => d.type === type)
    if (!target) return
    target.TakeDamage(this.damage)
    if (target.Hp <= 0) this.drones.splice(this.drones.indexOf(target), 1)
  }
  private FreeX() {
    for (let slot = 0; ; slot++) {
      const x = f(slot * this.spacing)
      if (!this.drones.some(d => d.x === x)) return x
    }
  }
}

/* ───────── truth/flyweight-drone-types/Target.cs 와 같은 어댑터 ───────── */

const HeavyCount = 2
const SpawnLine = (name: string, type: string, hp: number, max: number) => `${name} 나옴 · ${type} · HP ${hp}/${max}`
const Rejected = (max: number) => `나오지 못함: 구역 자리가 가득 찼다 (${max}/${max})`
const HitLine = (name: string, amount: number, hp: number, max: number) => `${name} 피해 ${amount} → HP ${hp}/${max}`
const DestroyedLine = (name: string) => `${name} 파괴 → 목록에서 뺀다`
const NoTargetLine = (type: string) => `${type} 드론이 없다 (피해 없음)`
const PatchLine = (type: string, from: number, to: number, count: number) => `밸런스 수정: ${type} 최대 HP ${from} → ${to} (${type} ${count}대에 바로 반영, 지금 HP 는 그대로)`
const Join = (items: string[]) => items.join(',') || '-'

/* ───────── 무대 그림 ───────── */

const C = { ok: '#7ee081', bug: '#ff5d6c', warn: '#ffb547', dim: '#8796ae', faint: '#4a5872', line: '#56688a', hp: '#5cc8ff', fresh: '#2f7d4a', box: '#1b2638' }
/** 코어 X(구역 단위) → 무대 x */
const GX = (x: number) => 1 + x
/** HP 막대: 높이, 폭, 꽉 찬 값 (고정 기준. 조절 값으로 계산하지 않는다) */
const BAR_Y = 2.45
const BW = 1.5
const BAR_MAX = 10
/** 종류 상자: 아래 끝, 높이, 폭, 가운데 x (정찰형, 중장갑) */
const BOX_Y = 4.45
const BOX_H = 1.3
const BOX_W = 6.8
const BOX_CX = [3.9, 12.1]
const scaleOf = (code: string) => (code === 'S' ? 0.6 : 0.85)

type Kind = 'hit' | 'destroy' | 'spawn' | 'patch' | 'rejected' | 'none' | ''
const PATH: Record<Exclude<Kind, ''>, string[]> = {
  hit: ['input', 'input-squad', 'squad', 'squad-drone', 'drone'],
  destroy: ['input', 'input-squad', 'squad', 'squad-drone', 'drone'],
  spawn: ['input-squad', 'squad', 'squad-type', 'type', 'drone', 'drone-type'],
  patch: ['input-squad', 'squad', 'squad-type', 'type'],
  rejected: ['input-squad', 'squad'],
  none: ['input-squad', 'squad'],
}
const NPATH: Record<Exclude<Kind, ''>, string[]> = {
  hit: ['nsquad', 'nsquad-ndrone', 'ndrone', 'ndrone-ntype', 'ntype'],
  destroy: ['nsquad', 'nsquad-ndrone', 'ndrone', 'ndrone-ntype', 'ntype'],
  spawn: ['nsquad', 'nsquad-ndrone', 'ndrone', 'ndrone-ntype', 'ntype'],
  patch: ['nsquad', 'nsquad-ntype', 'ntype'],
  rejected: ['nsquad'],
  none: ['nsquad'],
}

/** 그림에 쓰는 드론 한 대 (패턴과 나쁜 예 공통) */
interface Shown {
  name: string
  code: string
  typeIndex: number
  hp: number
  max: number
  x: number
  wrong: boolean
}

export const createSim: SimFactory = (values: ParamValues, isNaive: boolean): PatternSim => {
  const intOf = (k: string) => Math.round(Number(values[k]))
  const events: string[] = []
  let clock = 0
  const at = { input: -9, hit: -9, spawn: -9, patch: -9, bug: -9, destroyed: -9 }
  let kind: Kind = ''
  let note = ''
  let hitName = ''
  let spawnName = ''
  let gone: { x: number; name: string; code: string } | null = null
  const sharedBug = new Set<string>()

  const scout = new DroneType('정찰형', 'S', 4, 2, '#5cc8ff')
  const heavy = new DroneType('중장갑', 'H', 8, 1, '#ffb547')
  const squad = new Squad(scout, heavy)
  squad.Damage = intOf('damage')
  squad.PatchHp = intOf('patchHp')
  const scouts = intOf('scoutCount')
  for (let i = 0; i < scouts; i++) squad.Spawn(scout)
  for (let i = 0; i < HeavyCount; i++) squad.Spawn(heavy)

  let naive: NaiveSquad | null = null
  if (isNaive) {
    naive = new NaiveSquad()
    naive.damage = intOf('damage')
    naive.patchHp = intOf('patchHp')
    naive.scoutType = Object.assign(new NaiveDroneType(), { typeName: '정찰형', code: 'S', maxHp: 4, speed: f(2), color: '#5cc8ff', currentHp: 4 })
    naive.heavyType = Object.assign(new NaiveDroneType(), { typeName: '중장갑', code: 'H', maxHp: 8, speed: f(1), color: '#ffb547', currentHp: 8 })
    for (let i = 0; i < scouts; i++) naive.Spawn(naive.scoutType)
    for (let i = 0; i < HeavyCount; i++) naive.Spawn(naive.heavyType)
  } else {
    squad.Spawned.add(d => {
      events.push(SpawnLine(d.Name, d.Type.Name, d.Hp, d.Type.MaxHp))
      kind = 'spawn'
      at.spawn = clock
      spawnName = d.Name
      note = `${d.Name}: 사전의 ${d.Type.Name} 객체를 가리키고 HP ${d.Hp} 로 시작`
    })
    squad.SpawnRejected.add(max => {
      events.push(Rejected(max))
      kind = 'rejected'
      note = `구역 자리 ${max}칸이 가득 찼다`
    })
    squad.Damaged.add((d, amount) => {
      events.push(HitLine(d.Name, amount, d.Hp, d.Type.MaxHp))
      kind = 'hit'
      at.hit = clock
      hitName = d.Name
      note = `피해는 ${d.Name} 의 Hp 에만. 같은 종류의 다른 드론은 그대로`
    })
    squad.Destroyed.add(d => {
      events.push(DestroyedLine(d.Name))
      kind = 'destroy'
      at.destroyed = clock
      gone = { x: d.X, name: d.Name, code: d.Type.Code }
      note = `${d.Name} 파괴: 목록에서 뺐다. 종류 데이터는 그대로`
    })
    squad.NoTarget.add(t => {
      events.push(NoTargetLine(t.Name))
      kind = 'none'
      note = `${t.Name} 드론이 없다`
    })
    squad.TypePatched.add((t, previous) => {
      events.push(PatchLine(t.Name, previous, t.MaxHp, squad.CountOf(t)))
      kind = 'patch'
      at.patch = clock
      note = `${t.Name} 객체 하나를 고쳐 ${squad.CountOf(t)}대 모두 최대 HP ${t.MaxHp}`
    })
  }

  const CoreInput = (name: string) => {
    if (name === 'hitScout') squad.HitFirst(scout)
    else if (name === 'hitHeavy') squad.HitFirst(heavy)
    else if (name === 'spawn') squad.Spawn(scout)
    else if (name === 'patch') squad.Patch(scout)
  }

  const ExpectedHp = (droneName: string) => {
    const d = squad.Drones.find(x => x.Name === droneName)
    return d ? d.Hp : -1
  }

  const FindBugs = (n: NaiveSquad, type: NaiveDroneType, hit: string | null) => {
    if (sharedBug.has(type.typeName)) return false
    const wrong = n.drones.filter(d => d.type === type && ExpectedHp(d.droneName) >= 0 && ExpectedHp(d.droneName) !== d.Hp).map(d => d.droneName)
    if (wrong.length === 0) return false
    sharedBug.add(type.typeName)
    const who = hit !== null ? `${hit} 을 때렸는데 ` : ''
    events.push(`!HP 공유: ${who}${wrong.join(' ')} 도 HP ${type.currentHp} (${type.typeName} 종류 데이터의 currentHp 하나를 함께 쓴다)`)
    at.bug = clock
    return true
  }

  const NaiveHit = (n: NaiveSquad, type: NaiveDroneType, hit: () => void) => {
    const target = n.drones.find(d => d.type === type)
    if (!target) {
      hit()
      events.push(NoTargetLine(type.typeName))
      kind = 'none'
      note = `${type.typeName} 드론이 없다`
      return
    }
    hit()
    events.push(HitLine(target.droneName, n.damage, target.Hp, type.maxHp))
    kind = 'hit'
    at.hit = clock
    hitName = target.droneName
    note = `${target.droneName} 을 때렸는데 ${type.typeName} 에셋의 currentHp 가 깎였다`
    if (!n.drones.includes(target)) {
      events.push(DestroyedLine(target.droneName))
      kind = 'destroy'
      at.destroyed = clock
      gone = { x: target.x, name: target.droneName, code: type.code }
    }
    if (FindBugs(n, type, target.droneName)) return
    const others = n.drones.filter(d => d.type === type && d !== target).map(d => d.droneName)
    if (others.length === 0) return
    const fallen = type.currentHp === 0 ? ' (맞지 않았는데 HP 0 이다. 다음 한 방에 쓰러진다)' : ''
    events.push(`같은 종류 ${others.join(' ')} 도 HP ${type.currentHp}${fallen}`)
  }

  const NaiveSpawn = (n: NaiveSquad) => {
    const count0 = n.drones.length
    n.OnSpawn()
    if (n.drones.length === count0) {
      events.push(Rejected(n.maxDrones))
      kind = 'rejected'
      note = `구역 자리 ${n.maxDrones}칸이 가득 찼다`
      return
    }
    const d = n.drones[n.drones.length - 1]
    events.push(SpawnLine(d.droneName, d.type.typeName, d.Hp, d.type.maxHp))
    kind = 'spawn'
    at.spawn = clock
    spawnName = d.droneName
    note = `${d.droneName}: ${d.type.typeName} 에셋을 가리키고 HP 는 에셋의 currentHp`
    if (d.Hp !== d.type.maxHp) {
      events.push(`${d.droneName} 가 다친 채 나왔다: HP ${d.Hp} (새 드론은 HP ${d.type.maxHp} 로 나와야 한다. 종류 에셋의 currentHp 를 읽었다)`)
      note = `${d.droneName} 가 에셋의 currentHp ${d.Hp} 를 읽어 다친 채 나왔다`
    }
    FindBugs(n, d.type, null)
  }

  const naiveInput = (n: NaiveSquad, name: string) => {
    if (name === 'hitScout') NaiveHit(n, n.scoutType, () => n.OnHitScout())
    else if (name === 'hitHeavy') NaiveHit(n, n.heavyType, () => n.OnHitHeavy())
    else if (name === 'spawn') NaiveSpawn(n)
    else if (name === 'patch') {
      const from = n.scoutType.maxHp
      n.OnPatch()
      const count = n.drones.filter(d => d.type === n.scoutType).length
      events.push(PatchLine(n.scoutType.typeName, from, n.scoutType.maxHp, count))
      kind = 'patch'
      at.patch = clock
      note = `정찰형 에셋 하나를 고쳐 ${count}대 모두 최대 HP ${n.scoutType.maxHp}. currentHp 는 그대로`
    }
  }

  const recent = (t: number, within = 0.35) => clock - t < within

  /** 지금 그릴 드론들 */
  const shownDrones = (): Shown[] => {
    if (!naive) return squad.Drones.map(d => ({ name: d.Name, code: d.Type.Code, typeIndex: d.Type === scout ? 0 : 1, hp: d.Hp, max: d.Type.MaxHp, x: d.X, wrong: false }))
    const n = naive
    return n.drones.map(d => {
      const e = ExpectedHp(d.droneName)
      return { name: d.droneName, code: d.type.code, typeIndex: d.type === n.scoutType ? 0 : 1, hp: d.Hp, max: d.type.maxHp, x: d.x, wrong: sharedBug.has(d.type.typeName) && e >= 0 && e !== d.Hp }
    })
  }

  return {
    input(name) {
      at.input = clock
      kind = ''
      CoreInput(name)
      if (naive) naiveInput(naive, name)
    },
    tick(dt) {
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot() {
      const core = Join(squad.Drones.map(d => `${d.Name}:${d.Hp}`))
      if (!naive) return `types=${squad.SharedTypeCount()} drones=${squad.Drones.length} smax=${scout.MaxHp} hmax=${heavy.MaxHp} hp=${core}`
      const n = naive
      const types = new Set(n.drones.map(d => d.type)).size
      return `types=${types} drones=${n.drones.length} smax=${n.scoutType.maxHp} hmax=${n.heavyType.maxHp} hp=${Join(n.drones.map(d => `${d.droneName}:${d.Hp}`))} scur=${n.scoutType.currentHp} hcur=${n.heavyType.currentHp} ehp=${core}`
    },
    view(): SimView {
      const list = shownDrones()
      const world: WorldItem[] = [{ kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' }]

      // 종류 상자 둘 (위쪽). 나쁜 예는 상자 안에 공유된 지금 HP 가 보인다
      const typeInfo = naive
        ? [naive.scoutType, naive.heavyType].map(t => ({ name: t.typeName, max: t.maxHp, speed: t.speed, cur: t.currentHp as number | null }))
        : [scout, heavy].map(t => ({ name: t.Name, max: t.MaxHp, speed: t.Speed, cur: null as number | null }))
      typeInfo.forEach((t, i) => {
        const count = list.filter(d => d.typeIndex === i).length
        const bug = naive !== null && sharedBug.has(t.name)
        const patched = i === 0 && recent(at.patch, 0.9)
        world.push({ kind: 'box', x: BOX_CX[i] - BOX_W / 2, y: BOX_Y, w: BOX_W, h: BOX_H, fill: patched ? C.fresh : C.box, stroke: naive ? (bug ? C.bug : C.warn) : C.line })
        world.push({ kind: 'text', x: BOX_CX[i], y: BOX_Y + 0.82, text: `${t.name} · 최대 HP ${t.max} · 속도 ${t.speed.toFixed(0)}`, size: 20, color: '#e6ecf5' })
        if (t.cur === null) world.push({ kind: 'text', x: BOX_CX[i], y: BOX_Y + 0.3, text: `DroneType 객체 하나 · 드론 ${count}대가 가리킨다`, size: 16, color: C.dim })
        else world.push({ kind: 'text', x: BOX_CX[i], y: BOX_Y + 0.3, text: `지금 HP ${t.cur} · 드론 ${count}대가 이 칸 하나를 쓴다`, size: 17, color: bug ? C.bug : C.warn })
      })

      // 방금 파괴된 드론의 흔적
      if (gone && recent(at.destroyed, 0.9)) {
        const g = gone as { x: number; name: string; code: string }
        world.push({ kind: 'actor', x: GX(g.x), y: 1, role: 'enemy', scale: scaleOf(g.code), pose: 'down', alpha: 0.35 })
        world.push({ kind: 'text', x: GX(g.x), y: 0.38, text: `${g.name} 파괴`, size: 16, color: C.dim })
      }

      // 드론, HP 막대, 최대 HP 틀, 종류 상자로 가는 화살표
      for (const d of list) {
        const cx = GX(d.x)
        const bx = BOX_CX[d.typeIndex] + (cx - BOX_CX[d.typeIndex]) * 0.35
        const hurt = d.name === hitName && recent(at.hit, 0.25)
        world.push({ kind: 'arrow', x1: cx, y1: 3.3, x2: bx, y2: BOX_Y - 0.02, color: d.wrong ? C.bug : naive ? C.warn : C.line })
        world.push({ kind: 'actor', x: cx, y: 1, role: 'enemy', scale: scaleOf(d.code), pose: hurt ? 'hurt' : 'idle' })
        world.push({ kind: 'bar', x: cx - BW / 2, y: BAR_Y, w: BW, value: d.hp / BAR_MAX, fill: d.wrong ? C.bug : C.hp, label: `${d.hp}/${d.max}` })
        world.push({ kind: 'box', x: cx - BW / 2, y: BAR_Y, w: BW * Math.min(1, d.max / BAR_MAX), h: 0.32, stroke: recent(at.patch, 0.9) && d.typeIndex === 0 ? C.ok : '#c8d0de' })
        world.push({ kind: 'text', x: cx, y: 0.38, text: d.wrong ? `${d.name} ✖` : d.name, size: 18, color: d.wrong ? C.bug : '#c8d0de' })
        if (d.name === spawnName && recent(at.spawn, 0.8)) world.push({ kind: 'ring', x: cx, y: 1.5, r: 0.75, color: d.wrong ? C.bug : C.ok })
      }
      if (recent(at.hit) && !recent(at.destroyed)) {
        const t = list.find(d => d.name === hitName)
        if (t) world.push({ kind: 'ring', x: GX(t.x), y: 1.5, r: 0.75, color: C.warn })
      }

      const typeCount = naive ? 2 : squad.Types.size
      const sharedBugNow = naive !== null && list.some(d => d.wrong)
      world.push(
        { kind: 'text', x: 0.4, y: 8.3, text: `종류 데이터 ${typeCount}개 · 드론 ${list.length}대`, align: 'left', size: 24, color: C.ok },
        {
          kind: 'text',
          x: 0.4,
          y: 7.6,
          text: naive ? '지금 HP 는 종류 에셋에 하나 (currentHp) · 같은 종류가 함께 쓴다' : '지금 HP 는 드론마다 따로 (Drone.Hp)',
          align: 'left',
          size: 20,
          color: naive ? (sharedBugNow ? C.bug : C.warn) : C.ok,
        },
        { kind: 'text', x: 15.6, y: 6.55, text: note, align: 'right', size: 17, color: C.dim },
      )
      const active = recent(at.input, 0.3) && kind ? [...(naive ? NPATH : PATH)[kind]] : []
      return { world, active }
    },
  }
}
