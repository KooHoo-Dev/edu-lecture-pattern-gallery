import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/factory-drone-spawner 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/factory-drone-spawner/Target.cs 와 같은 글을 만드는 어댑터. 시간이 흐르는 규칙이 없어 float 계산도 없다. */

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

/* ───────── Core/Drones.cs ───────── */

abstract class Drone {
  Kind: string
  MaxHp: number
  Hp: number
  Number = 0
  Slot = -1
  Damaged = new Event<[Drone, number]>()
  Destroyed = new Event<[Drone]>()
  constructor(kind: string, hp: number) {
    this.Kind = kind
    this.MaxHp = Math.max(1, hp)
    this.Hp = this.MaxHp
  }
  get IsAlive() {
    return this.Hp > 0
  }
  get Name() {
    return this.Kind + ' #' + this.Number
  }
  TakeDamage(amount: number) {
    if (!this.IsAlive || amount <= 0) return
    this.Hp = Math.max(0, this.Hp - amount)
    this.Damaged.invoke(this, amount)
    if (this.Hp === 0) this.Destroyed.invoke(this)
  }
}

class ScoutDrone extends Drone {
  static readonly DefaultHp = 1
  constructor() {
    super('정찰', ScoutDrone.DefaultHp)
  }
}

class HeavyDrone extends Drone {
  constructor(hp: number) {
    super('중장갑', hp)
  }
}

class ShieldDrone extends Drone {
  constructor(hp: number) {
    super('방패', hp)
  }
}

/* ───────── Core/Exit.cs ───────── */

class Exit {
  private drones: Drone[] = []
  private placedCount = 0
  get Drones(): readonly Drone[] {
    return this.drones
  }
  Placed = new Event<[Drone]>()
  Place(drone: Drone) {
    if (this.drones.includes(drone)) return
    drone.Number = ++this.placedCount
    drone.Slot = this.FreeSlot()
    this.drones.push(drone)
    drone.Destroyed.add(this.OnDestroyed)
    this.Placed.invoke(drone)
  }
  private FreeSlot() {
    let slot = 0
    while (this.Taken(slot)) slot++
    return slot
  }
  private Taken(slot: number) {
    for (const d of this.drones) if (d.Slot === slot) return true
    return false
  }
  private OnDestroyed = (drone: Drone) => {
    drone.Destroyed.remove(this.OnDestroyed)
    const i = this.drones.indexOf(drone)
    if (i >= 0) this.drones.splice(i, 1)
  }
}

/* ───────── Core/Radar.cs ───────── */

class Radar {
  private tracked: Drone[] = []
  IsCleared = false
  Registered = new Event<[Drone, number]>()
  Unregistered = new Event<[Drone, number]>()
  WaveCleared = new Event<[]>()
  get AliveCount() {
    return this.tracked.length
  }
  Tracks(drone: Drone) {
    return this.tracked.includes(drone)
  }
  Register(drone: Drone) {
    if (!drone.IsAlive || this.tracked.includes(drone)) return
    this.tracked.push(drone)
    drone.Destroyed.add(this.OnDestroyed)
    this.IsCleared = false
    this.Registered.invoke(drone, this.tracked.length)
  }
  private OnDestroyed = (drone: Drone) => {
    drone.Destroyed.remove(this.OnDestroyed)
    const i = this.tracked.indexOf(drone)
    if (i >= 0) this.tracked.splice(i, 1)
    this.Unregistered.invoke(drone, this.tracked.length)
    if (this.tracked.length > 0) return
    this.IsCleared = true
    this.WaveCleared.invoke()
  }
}

/* ───────── Core/TurretBattery.cs ───────── */

class TurretBattery {
  VolleyDamage = 1
  Fired = new Event<[number, number]>()
  Volley(exit: Exit) {
    const targets = [...exit.Drones]
    this.Fired.invoke(targets.length, this.VolleyDamage)
    for (const drone of targets) drone.TakeDamage(this.VolleyDamage)
  }
}

/* ───────── Core/DroneSpawner.cs ───────── */

abstract class DroneSpawner {
  private exit: Exit
  private radar: Radar
  Label: string
  Spawned = new Event<[Drone]>()
  constructor(label: string, exit: Exit, radar: Radar) {
    this.Label = label
    this.exit = exit
    this.radar = radar
  }
  Spawn(): Drone {
    const drone = this.CreateDrone()
    this.exit.Place(drone)
    this.radar.Register(drone)
    this.OnSpawned(drone)
    this.Spawned.invoke(drone)
    return drone
  }
  /** 팩토리 메서드 (추상 단계): 자식이 반드시 구현한다 */
  protected abstract CreateDrone(): Drone
  /** 훅 (선택 단계): 기본 본문이 비어 있다 */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected OnSpawned(_drone: Drone): void {}
}

class ScoutSpawner extends DroneSpawner {
  constructor(exit: Exit, radar: Radar) {
    super('정찰', exit, radar)
  }
  protected CreateDrone(): Drone {
    return new ScoutDrone()
  }
}

class HeavySpawner extends DroneSpawner {
  Hp = 3
  constructor(exit: Exit, radar: Radar) {
    super('중장갑', exit, radar)
  }
  protected CreateDrone(): Drone {
    return new HeavyDrone(this.Hp)
  }
}

class ShieldSpawner extends DroneSpawner {
  Hp = 2
  constructor(exit: Exit, radar: Radar) {
    super('방패', exit, radar)
  }
  protected CreateDrone(): Drone {
    return new ShieldDrone(this.Hp)
  }
}

/* ───────── Core/WaveDirector.cs ───────── */

class WaveDirector {
  private spawners: DroneSpawner[]
  Count = 0
  Picked = new Event<[number, DroneSpawner]>()
  constructor(spawners: Iterable<DroneSpawner>) {
    this.spawners = [...spawners]
  }
  get Spawners(): readonly DroneSpawner[] {
    return this.spawners
  }
  PeekNext(): DroneSpawner | null {
    return this.spawners.length > 0 ? this.spawners[this.Count % this.spawners.length] : null
  }
  SpawnNext(): Drone | null {
    if (this.spawners.length === 0) return null
    const spawner = this.spawners[this.Count % this.spawners.length]
    this.Picked.invoke(this.Count, spawner)
    this.Count++
    return spawner.Spawn()
  }
}

/* ───────── Naive/NaiveWaveSpawner.cs ───────── */

class NaiveWaveSpawner {
  heavyHp = 3
  shieldHp = 2
  readonly types = ['scout', 'heavy', 'shield']
  count = 0
  private exit: Exit
  private radar: Radar
  Spawned = new Event<[Drone]>()
  constructor(exit: Exit, radar: Radar) {
    this.exit = exit
    this.radar = radar
  }
  SpawnNext(): Drone | null {
    const type = this.types[this.count % 2]
    this.count++
    return this.SpawnDrone(type)
  }
  SpawnDrone(type: string): Drone | null {
    if (type === 'scout') {
      const drone = new ScoutDrone()
      this.exit.Place(drone)
      this.radar.Register(drone)
      this.Spawned.invoke(drone)
      return drone
    } else if (type === 'heavy') {
      const drone = new HeavyDrone(this.heavyHp)
      this.exit.Place(drone)
      this.radar.Register(drone)
      this.Spawned.invoke(drone)
      return drone
    } else if (type === 'shield') {
      const drone = new ShieldDrone(this.shieldHp)
      this.exit.Place(drone) // radar.Register(drone) 가 빠졌다
      this.Spawned.invoke(drone)
      return drone
    }
    return null
  }
}

/* ───────── truth/factory-drone-spawner/Target.cs 와 같은 어댑터 ───────── */

const TypeOf = (d: Drone) => (d instanceof ScoutDrone ? 'scout' : d instanceof HeavyDrone ? 'heavy' : 'shield')
const Names = (drones: readonly Drone[]) => drones.map(d => d.Name).join(', ')

/* ───────── 무대 그림 ───────── */

const C = { ground: '#22314a', base: '#22385a', baseLine: '#5cc8ff', exit: '#0e1a2e', turret: '#3a4a66', volley: '#ffe08a', hp: '#ff9b8a', shield: '#5cc8ff', ok: '#7ee081', bug: '#ff5d6c', warn: '#ffb547', dim: '#8796ae', clearOk: '#1d3b26', clearBug: '#4a1820' }
/** HP 바의 꽉 찬 값: 조절 값(heavyHp, shieldHp) 범위의 최대 (고정). 조절 값으로 나누면 값을 바꿔도 막대 길이가 같아 보인다 */
const HP_FULL = 5
/** 출구 앞 자리: 0 이 출구에 가장 가깝고 왼쪽으로 1.45 간격. 아홉 자리가 차면 위 줄로 (화면에만) */
const SLOTS_PER_ROW = 9
const SX = (slot: number) => 12.7 - 1.45 * (slot % SLOTS_PER_ROW)
const SY = (slot: number) => 1 + 2.7 * Math.floor(slot / SLOTS_PER_ROW)
const SCALE = (d: Drone) => (d instanceof ScoutDrone ? 0.6 : d instanceof HeavyDrone ? 0.9 : 0.75)
const head = (d: Drone) => SY(d.Slot) + 1.4 * SCALE(d)
const body = (d: Drone) => SY(d.Slot) + 0.55 * SCALE(d)
const TURRET = { x: 15.1, y: 5.5 }
/** 웨이브 끝 상자: 왼쪽 위 글 오른쪽, 포탑 위. 드론 둘째 줄의 HP 바(y 6 안팎)보다 위라 겹치지 않는다 */
const WAVE_BOX = { x: 9.3, y: 6.75, w: 6.4, h: 0.85 }

const STATIC: WorldItem[] = [
  { kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: C.ground },
  { kind: 'box', x: 14.3, y: 1, w: 1.7, h: 4.2, fill: C.base, stroke: C.baseLine, label: '정비 기지' },
  { kind: 'box', x: 13.45, y: 1, w: 0.85, h: 1.75, fill: C.exit, stroke: C.dim, label: '출구' },
  { kind: 'box', x: 14.5, y: 5.2, w: 1.2, h: 0.55, fill: C.turret, stroke: C.dim },
  { kind: 'text', x: 15.1, y: 6.05, text: '포탑', size: 16, color: C.dim },
]

const CHILD: Record<string, string> = { scout: 'scout', heavy: 'heavy', shield: 'shield' }

export const createSim: SimFactory = (values: ParamValues, isNaive: boolean): PatternSim => {
  const intOf = (k: string) => Math.round(Number(values[k]))
  const events: string[] = []
  let clock = 0
  const at = { input: -9, spawn: -9, volley: -9, bug: -9 }
  let path: string[] = []
  let spawned: Drone | null = null
  let volleyTargets: { x: number; y: number }[] = []
  const hitAt = new Map<Drone, number>()
  const wrecks: { x: number; y: number; t: number }[] = []
  /** 섞인 순서로 나온 종류 (화면의 '지난 순서'). wrong 은 방패 차례인데 다른 종류가 나온 것 */
  const history: { kind: string; wrong: boolean }[] = []
  /** 나쁜 예: 방패 차례에 나온 다른 종류 (살아 있는 동안 표시) */
  const wrongKind = new Set<Drone>()

  // 화면에 보이는 세계 (두 모드 공통)
  const exit = new Exit()
  const radar = new Radar()
  const battery = new TurretBattery()
  const heavyHp = intOf('heavyHp')
  const shieldHp = intOf('shieldHp')
  battery.VolleyDamage = intOf('volleyDamage')

  let naive: NaiveWaveSpawner | null = null
  let lastMissing = false

  const onPlaced = (d: Drone) => {
    events.push(`${d.Name} → 출구 앞 자리 ${d.Slot}`)
    d.Damaged.add((x, amount) => {
      events.push(`${x.Name} 피해 ${amount} → HP ${x.Hp}`)
      hitAt.set(x, clock)
    })
    d.Destroyed.add(x => {
      events.push(`${x.Name} 파괴`)
      wrecks.push({ x: SX(x.Slot), y: body(x), t: clock })
      wrongKind.delete(x)
    })
    spawned = d
    at.spawn = clock
  }
  const onWaveCleared = () => {
    events.push('웨이브 끝')
    if (naive && exit.Drones.length > 0) {
      events.push(`!거짓 웨이브 끝: 출구 앞에 아직 ${Names(exit.Drones)} (레이더 누락의 결과)`)
      at.bug = clock
    }
  }
  exit.Placed.add(onPlaced)
  radar.Registered.add((d, n) => events.push(`레이더 등록 ${d.Name} → 살아 있는 드론 ${n}`))
  radar.Unregistered.add((d, n) => {
    events.push(`레이더 해제 ${d.Name} → 살아 있는 드론 ${n}`)
    path.push(...(naive ? ['nradar'] : ['radar-drone', 'radar']))
  })
  radar.WaveCleared.add(onWaveCleared)
  battery.Fired.add((count, damage) => events.push(count > 0 ? `일제 사격: ${count}대에 피해 ${damage}` : '일제 사격: 출구 앞에 드론이 없다'))

  const coreExit = isNaive ? new Exit() : exit
  const coreRadar = isNaive ? new Radar() : radar
  const scout = new ScoutSpawner(coreExit, coreRadar)
  const heavy = new HeavySpawner(coreExit, coreRadar)
  heavy.Hp = heavyHp
  const shield = new ShieldSpawner(coreExit, coreRadar)
  shield.Hp = shieldHp
  const director = new WaveDirector([scout, heavy, shield])
  const ClassOf = (s: DroneSpawner) => (s === scout ? 'ScoutSpawner' : s === heavy ? 'HeavySpawner' : 'ShieldSpawner')
  const childOf = (s: DroneSpawner) => (s === scout ? 'scout' : s === heavy ? 'heavy' : 'shield')
  let shadowExit: Exit | null = null
  let shadowBattery: TurretBattery | null = null

  if (isNaive) {
    shadowExit = coreExit
    shadowBattery = new TurretBattery()
    shadowBattery.VolleyDamage = battery.VolleyDamage
    naive = new NaiveWaveSpawner(exit, radar)
    naive.heavyHp = heavyHp
    naive.shieldHp = shieldHp
    naive.Spawned.add(d => events.push(`출격 알림: ${d.Name} HP ${d.Hp}`))
  } else {
    director.Picked.add((i, s) => {
      events.push(`섞인 순서 ${i + 1}번째: ${i} % ${director.Spawners.length} = ${i % director.Spawners.length} → ${ClassOf(s)}`)
      history.push({ kind: s.Label, wrong: false })
    })
    for (const s of director.Spawners) {
      const cls = ClassOf(s)
      s.Spawned.add(d => events.push(`출격 알림: ${d.Name} HP ${d.Hp} (${cls})`))
    }
  }

  /** 코어에 입력을 넣는다 (나쁜 예 모드에서는 그림자) */
  const CoreInput = (name: string) => {
    if (name === 'scout') scout.Spawn()
    else if (name === 'heavy') heavy.Spawn()
    else if (name === 'shield') shield.Spawn()
    else if (name === 'next') director.SpawnNext()
    else if (name === 'volley') {
      if (!naive) battery.Volley(exit)
      else shadowBattery!.Volley(shadowExit!)
    }
  }

  /** 출구 앞에 있는데 레이더가 모르는 드론. 생기는 순간 한 번 적는다 */
  const FindMissing = () => {
    const missing = exit.Drones.filter(d => !radar.Tracks(d))
    const on = missing.length > 0
    if (on && !lastMissing) {
      events.push(`!레이더 누락: 레이더에 없는 드론 ${Names(missing)} (레이더 ${radar.AliveCount}, 출구 앞 ${exit.Drones.length})`)
      at.bug = clock
    }
    lastMissing = on
  }

  const naiveInput = (n: NaiveWaveSpawner, name: string) => {
    const expected = name === 'next' ? director.PeekNext() : null
    const order = n.count
    CoreInput(name)

    const idx = events.length
    let made: Drone | null = null
    if (name === 'scout' || name === 'heavy' || name === 'shield') made = n.SpawnDrone(name)
    else if (name === 'next') made = n.SpawnNext()
    else if (name === 'volley') battery.Volley(exit)

    if (made) {
      const t = TypeOf(made)
      path = ['nspawner', `nspawner-n${t}`, `n${t}`]
      if (radar.Tracks(made)) path.push(`n${t}-nradar`, 'nradar')
    }
    if (name === 'next' && made) {
      events.splice(idx, 0, `섞인 순서 ${order + 1}번째 (count ${order}) → SpawnDrone("${TypeOf(made)}")`)
      const wrong = expected === shield && !(made instanceof ShieldDrone)
      history.push({ kind: made.Kind, wrong })
      if (wrong) {
        events.push(`!종류 누락: ${order + 1}번째는 방패 차례인데 ${made.Kind}이 나왔다 (types[count % 2] 는 0, 1 만 고른다)`)
        wrongKind.add(made)
        at.bug = clock
      }
    }
    FindMissing()
  }

  const recent = (t: number, within = 0.35) => clock - t < within

  return {
    input(name) {
      at.input = clock
      path = []
      spawned = null
      if (name === 'volley') {
        at.volley = clock
        volleyTargets = exit.Drones.map(d => ({ x: SX(d.Slot), y: body(d) }))
        path = naive ? [] : ['input', 'drone']
      }
      if (naive) {
        naiveInput(naive, name)
        return
      }
      if (name === 'next') {
        const s = director.PeekNext()
        if (s) path = ['input', 'input-director', 'director', 'director-spawner', 'spawner', CHILD[childOf(s)], `${childOf(s)}-spawner`, 'spawner-drone', 'drone', 'spawner-radar', 'radar']
      } else if (name in CHILD) {
        path = ['input', 'input-spawner', 'spawner', name, `${name}-spawner`, 'spawner-drone', 'drone', 'spawner-radar', 'radar']
      }
      CoreInput(name)
    },
    tick(dt) {
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot() {
      const list = exit.Drones.length === 0 ? '-' : exit.Drones.map(d => `${d.Kind}${d.Number}:${d.Hp}`).join(',')
      const count = naive ? naive.count : director.Count
      return `radar=${radar.AliveCount} field=${exit.Drones.length} cleared=${radar.IsCleared ? 1 : 0} count=${count} drones=${list}`
    },
    view(): SimView {
      const world: WorldItem[] = [...STATIC]
      const drones = exit.Drones
      const untracked = drones.filter(d => !radar.Tracks(d))
      // 드론: 몸, 방패 판, 머리 위 HP 바, 바닥의 번호
      for (const d of drones) {
        const x = SX(d.Slot)
        const y = SY(d.Slot)
        const s = SCALE(d)
        const top = head(d)
        world.push({ kind: 'actor', x, y, role: 'enemy', label: d.Kind, scale: s, facing: -1, pose: recent(hitAt.get(d) ?? -9, 0.2) ? 'hurt' : 'idle' })
        if (d instanceof ShieldDrone) world.push({ kind: 'box', x: x - 0.6, y: y + 0.08, w: 0.14, h: 0.75, fill: C.shield })
        world.push({ kind: 'bar', x: x - 0.45, y: top + 0.62, w: 0.9, value: d.Hp / HP_FULL, fill: C.hp, label: `HP ${d.Hp}` })
        world.push({ kind: 'text', x, y: y - 0.62, text: `#${d.Number}`, size: 16, color: C.dim })
      }
      // 방금 나온 드론: 출구에서 자리로 가는 화살표와 링
      if (spawned && recent(at.spawn) && drones.includes(spawned)) {
        world.push({ kind: 'arrow', x1: 13.45, y1: SY(spawned.Slot) + 0.5, x2: SX(spawned.Slot) + 0.45, y2: SY(spawned.Slot) + 0.5, color: C.dim })
        world.push({ kind: 'ring', x: SX(spawned.Slot), y: body(spawned), r: 0.6, color: C.ok })
      }
      // 일제 사격: 포탑에서 쏜 순간의 모든 대상으로
      if (recent(at.volley, 0.3)) for (const p of volleyTargets) world.push({ kind: 'arrow', x1: TURRET.x, y1: TURRET.y, x2: p.x + 0.15, y2: p.y + 0.1, color: C.volley })
      for (const w of wrecks) if (recent(w.t, 0.5)) world.push({ kind: 'ring', x: w.x, y: w.y, r: 0.5, color: C.warn })

      // 나쁜 예: 버그가 이어지는 동안 남는 표시
      if (naive) {
        for (const d of untracked) {
          const x = SX(d.Slot)
          world.push({ kind: 'box', x: x - 0.75, y: SY(d.Slot) - 0.05, w: 1.5, h: head(d) - SY(d.Slot) + 0.6, stroke: C.bug, dashed: true })
          world.push({ kind: 'text', x, y: head(d) + 1.75, text: '레이더에 없음', size: 16, color: C.bug })
          if (recent(at.bug, 1.2)) world.push({ kind: 'ring', x, y: body(d), r: 0.75, color: C.bug })
        }
        for (const d of wrongKind) if (drones.includes(d)) world.push({ kind: 'text', x: SX(d.Slot), y: head(d) + 1.75, text: '방패 차례였다', size: 16, color: C.warn })
      }

      // 웨이브 끝: 레이더가 알린 뒤 새 등록이 없으면 남는다. 드론 줄(두 줄까지)과 겹치지 않게 오른쪽 위에 둔다
      if (radar.IsCleared) {
        const left = drones.length
        const bad = left > 0
        world.push({ kind: 'box', x: WAVE_BOX.x, y: WAVE_BOX.y, w: WAVE_BOX.w, h: WAVE_BOX.h, fill: bad ? C.clearBug : C.clearOk, stroke: bad ? C.bug : C.ok, label: bad ? `거짓 웨이브 끝 ✖ 출구 앞에 ${left}대 남음` : '웨이브 끝 · 출구 앞 0대' })
        if (bad) for (const d of drones) world.push({ kind: 'arrow', x1: WAVE_BOX.x + WAVE_BOX.w / 2, y1: WAVE_BOX.y, x2: SX(d.Slot), y2: head(d) + 2.05, color: C.bug, dashed: true })
      }

      // 왼쪽 위: 레이더 수와 섞인 순서
      const field = drones.length
      const mismatch = radar.AliveCount !== field
      world.push({ kind: 'text', x: 0.4, y: 8.3, text: `레이더: 살아 있는 드론 ${radar.AliveCount}   ·   출구 앞 ${field}대${mismatch ? '  ✖' : ''}`, align: 'left', size: 26, color: mismatch ? C.bug : C.ok })
      let nextLine: string
      if (naive) {
        const shadowNext = director.PeekNext()
        const t = naive.types[naive.count % 2]
        nextLine = `섞인 순서 다음: types[${naive.count} % 2] = "${t}"${shadowNext === shield ? '  ← 방패 차례' : ''}`
      } else {
        const s = director.PeekNext()
        nextLine = `섞인 순서 다음: ${s ? s.Label : '-'}  (spawners[${director.Count} % ${director.Spawners.length}])`
      }
      world.push({ kind: 'text', x: 0.4, y: 7.6, text: nextLine, align: 'left', size: 20, color: naive ? C.warn : C.dim })
      const shown = history.slice(-5)
      const anyWrong = history.some(h => h.wrong)
      const past = shown.length === 0 ? '아직 없다' : (history.length > shown.length ? '… → ' : '') + shown.map(h => (h.wrong ? `${h.kind}(방패 차례 ✖)` : h.kind)).join(' → ')
      world.push({ kind: 'text', x: 0.4, y: 6.9, text: `지난 섞인 순서: ${past}`, align: 'left', size: 18, color: anyWrong ? C.bug : C.dim })

      const active = recent(at.input, 0.3) ? [...path] : []
      return { world, active }
    },
  }
}
