import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/strategy-turret-targeting 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/strategy-turret-targeting/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다. */

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

class DroneSpec {
  SpawnTime: number
  Speed: number
  Hp: number
  /** 땅 위 높이. 화면에만 쓴다 */
  Altitude: number
  constructor(spawnTime: number, speed: number, hp: number, altitude: number) {
    this.SpawnTime = f(spawnTime)
    this.Speed = f(speed)
    this.Hp = hp
    this.Altitude = f(altitude)
  }
}

class Drone {
  Id: number
  Speed: number
  MaxHp: number
  Altitude: number
  X = 0
  Hp: number
  constructor(id: number, spec: DroneSpec) {
    this.Id = id
    this.Speed = spec.Speed
    this.MaxHp = spec.Hp
    this.Hp = spec.Hp
    this.Altitude = spec.Altitude
  }
  get Name() {
    return `D${this.Id}`
  }
  get IsAlive() {
    return this.Hp > 0
  }
}

class DroneWave {
  static SpawnX = 0
  static BaseX = 15

  static CreateDefaultTable() {
    return [
      new DroneSpec(0, 2.8, 8, 1.8), // D1 빠른 선두
      new DroneSpec(0, 1.3, 10, 2.4), // D2 느리고 단단하다
      new DroneSpec(0.2, 2.2, 2, 4.4), // D3 약하다
      new DroneSpec(0.8, 2, 5, 1), // D4
      new DroneSpec(1.4, 2.5, 3, 3.7), // D5
    ]
  }

  private table: DroneSpec[]
  private active: Drone[] = []
  private time = 0
  private nextSpawn = 0

  get Active(): readonly Drone[] {
    return this.active
  }
  get Time() {
    return this.time
  }
  get Finished() {
    return this.nextSpawn >= this.table.length && this.active.length === 0
  }

  DroneSpawned = new Event<[Drone]>()
  DroneReachedBase = new Event<[Drone]>()

  constructor(table: DroneSpec[]) {
    this.table = table
  }

  Tick(dt: number) {
    this.time = f(this.time + dt)
    while (this.nextSpawn < this.table.length && this.table[this.nextSpawn].SpawnTime <= this.time) {
      const drone = new Drone(this.nextSpawn + 1, this.table[this.nextSpawn])
      drone.X = DroneWave.SpawnX
      this.nextSpawn++
      this.active.push(drone)
      this.DroneSpawned.invoke(drone)
    }
    for (let i = 0; i < this.active.length; i++) {
      const d = this.active[i]
      d.X = f(d.X + f(d.Speed * dt))
      if (d.X < DroneWave.BaseX) continue
      this.active.splice(i, 1)
      i--
      this.DroneReachedBase.invoke(d)
    }
  }

  Remove(drone: Drone) {
    const i = this.active.indexOf(drone)
    if (i >= 0) this.active.splice(i, 1)
  }

  CollectInRange(x: number, range: number, into: Drone[]) {
    into.length = 0
    for (const d of this.active) if (d.IsAlive && Math.abs(f(d.X - x)) <= range) into.push(d)
  }

  Restart() {
    this.active.length = 0
    this.time = 0
    this.nextSpawn = 0
  }
}

/* ───────── Core/TargetingStrategies.cs ───────── */

interface ITargetingStrategy {
  SelectTarget(candidates: readonly Drone[], turretX: number): Drone | null
}

class NearestTarget implements ITargetingStrategy {
  SelectTarget(candidates: readonly Drone[], turretX: number) {
    let best: Drone | null = null
    let bestDistance = 0
    for (const d of candidates) {
      const distance = Math.abs(f(d.X - turretX))
      if (best === null || distance < bestDistance || (distance === bestDistance && d.Id < best.Id)) {
        best = d
        bestDistance = distance
      }
    }
    return best
  }
}

class StrongestTarget implements ITargetingStrategy {
  SelectTarget(candidates: readonly Drone[]) {
    let best: Drone | null = null
    for (const d of candidates) if (best === null || d.Hp > best.Hp || (d.Hp === best.Hp && d.Id < best.Id)) best = d
    return best
  }
}

class FirstTarget implements ITargetingStrategy {
  SelectTarget(candidates: readonly Drone[]) {
    let best: Drone | null = null
    for (const d of candidates) if (best === null || d.X > best.X || (d.X === best.X && d.Id < best.Id)) best = d
    return best
  }
}

class WeakestTarget implements ITargetingStrategy {
  SelectTarget(candidates: readonly Drone[]) {
    let best: Drone | null = null
    for (const d of candidates) if (best === null || d.Hp < best.Hp || (d.Hp === best.Hp && d.Id < best.Id)) best = d
    return best
  }
}

const Targeting = {
  Nearest: new NearestTarget() as ITargetingStrategy,
  Strongest: new StrongestTarget() as ITargetingStrategy,
  First: new FirstTarget() as ITargetingStrategy,
  Weakest: new WeakestTarget() as ITargetingStrategy,
}

/* ───────── Core/Turret.cs ───────── */

class Turret {
  static DefaultX = 8
  X: number
  Range = f(6)
  FireInterval = f(0.4)
  Damage = 1
  private wave: DroneWave
  private candidates: Drone[] = []
  Strategy: ITargetingStrategy
  CurrentTarget: Drone | null = null
  Cooldown = 0

  StrategyChanged = new Event<[ITargetingStrategy, ITargetingStrategy]>()
  TargetChanged = new Event<[Drone | null, Drone | null]>()
  Fired = new Event<[Drone, number]>()
  DroneDestroyed = new Event<[Drone]>()

  constructor(wave: DroneWave, x: number, strategy: ITargetingStrategy) {
    this.wave = wave
    this.X = f(x)
    this.Strategy = strategy
  }

  SetStrategy(strategy: ITargetingStrategy) {
    if (strategy === this.Strategy) return
    const previous = this.Strategy
    this.Strategy = strategy
    this.StrategyChanged.invoke(previous, strategy)
  }

  Tick(dt: number) {
    this.wave.CollectInRange(this.X, this.Range, this.candidates)
    const next = this.Strategy.SelectTarget(this.candidates, this.X)
    if (next !== this.CurrentTarget) {
      const previous = this.CurrentTarget
      this.CurrentTarget = next
      this.TargetChanged.invoke(previous, next)
    }

    if (this.Cooldown > 0) this.Cooldown = f(this.Cooldown - dt)
    if (this.CurrentTarget === null || this.Cooldown > 0) return
    this.Fire(this.CurrentTarget)
    this.Cooldown = f(this.Cooldown + this.FireInterval)
  }

  private Fire(target: Drone) {
    target.Hp = Math.max(0, target.Hp - this.Damage)
    this.Fired.invoke(target, this.Damage)
    if (target.IsAlive) return
    this.wave.Remove(target)
    this.DroneDestroyed.invoke(target)
    this.CurrentTarget = null
    this.TargetChanged.invoke(target, null)
  }
}

/* ───────── Naive/NaiveTurret.cs ───────── */

class NaiveTurret {
  X = f(8)
  range = f(6)
  fireInterval = f(0.4)
  damage = 1
  mode = 'nearest'
  aimTarget: Drone | null = null
  private wave: DroneWave
  private cooldown = 0

  constructor(wave: DroneWave) {
    this.wave = wave
  }

  Update(dt: number) {
    this.UpdateAim()
    if (this.cooldown > 0) this.cooldown = f(this.cooldown - dt)
    if (this.cooldown <= 0 && this.Fire()) this.cooldown = f(this.cooldown + this.fireInterval)
  }

  private UpdateAim() {
    if (this.mode === 'strongest') this.aimTarget = this.FindStrongest()
    else if (this.mode === 'first') this.aimTarget = this.FindFirst()
    else this.aimTarget = this.FindNearest()
  }

  private Fire() {
    let target: Drone | null = null
    if (this.mode === 'nearest') target = this.FindNearest()
    else if (this.mode === 'strongest') target = this.FindStrongest()
    else if (this.mode === 'first') target = this.FindFirst()
    else if (this.mode === 'weakest') target = this.FindWeakest()
    if (target === null) return false
    target.Hp = Math.max(0, target.Hp - this.damage)
    if (target.Hp <= 0) this.wave.Remove(target)
    return true
  }

  private InRange(d: Drone) {
    return d.IsAlive && Math.abs(f(d.X - this.X)) <= this.range
  }

  private FindNearest() {
    let best: Drone | null = null
    for (const d of this.wave.Active) if (this.InRange(d) && (best === null || Math.abs(f(d.X - this.X)) < Math.abs(f(best.X - this.X)))) best = d
    return best
  }

  private FindStrongest() {
    let best: Drone | null = null
    for (const d of this.wave.Active) if (this.InRange(d) && (best === null || d.Hp > best.Hp)) best = d
    return best
  }

  private FindFirst() {
    let best: Drone | null = null
    for (const d of this.wave.Active) if (this.InRange(d) && (best === null || d.X > best.X)) best = d
    return best
  }

  private FindWeakest() {
    let best: Drone | null = null
    for (const d of this.wave.Active) if (this.InRange(d) && (best === null || d.Hp < best.Hp)) best = d
    return best
  }
}

/* ───────── truth/strategy-turret-targeting/Target.cs 와 같은 어댑터 ───────── */

const N = (d: Drone | null) => (d === null ? '없음' : d.Name)
const Short = (s: ITargetingStrategy) => (s instanceof NearestTarget ? 'Nearest' : s instanceof StrongestTarget ? 'Strongest' : s instanceof FirstTarget ? 'First' : 'Weakest')
const PARSE: Record<string, ITargetingStrategy> = { nearest: Targeting.Nearest, strongest: Targeting.Strongest, first: Targeting.First, weakest: Targeting.Weakest }
const Parse = (name: string) => PARSE[name] ?? Targeting.Nearest
const F2 = (v: number) => v.toFixed(2)

/* ───────── 무대 그림 ───────── */

const KOREAN: Record<string, string> = { Nearest: '가까운 것', Strongest: '체력 많은 것', First: '선두', Weakest: '체력 적은 것' }
const MODE_KOREAN: Record<string, string> = { nearest: '가까운 것', strongest: '체력 많은 것', first: '선두', weakest: '체력 적은 것' }
const C = { ground: '#22314a', base: '#22385a', baseLine: '#5cc8ff', turret: '#3a4a66', turretLine: '#8796ae', laser: '#7ee081', naiveLaser: '#ffb547', hit: '#ffe08a', bug: '#ff5d6c', dim: '#8796ae', ok: '#7ee081', warn: '#ffb547', hp: '#ff9b8a', range: '#56688a' }
const TURRET_TOP = 1.85
/** 드론의 발 높이와 몸 가운데 */
const footY = (d: Drone) => 1 + d.Altitude
const bodyY = (d: Drone) => footY(d) + 0.35

function fieldItems(turretX: number, range: number): WorldItem[] {
  const left = Math.max(0.05, turretX - range)
  const right = Math.min(DroneWave.BaseX, turretX + range)
  return [
    { kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: C.ground },
    // 사거리: 땅에 그린 점선 띠
    { kind: 'box', x: left, y: 0.14, w: right - left, h: 0.72, stroke: C.range, dashed: true },
    { kind: 'text', x: left + 0.12, y: 0.38, text: `사거리 ±${range}`, align: 'left', size: 15, color: C.dim },
    { kind: 'box', x: DroneWave.BaseX, y: 1, w: 1, h: 2.6, fill: C.base, stroke: C.baseLine, label: '기지' },
    { kind: 'box', x: turretX - 0.4, y: 1, w: 0.8, h: TURRET_TOP - 1, fill: C.turret, stroke: C.turretLine },
    { kind: 'text', x: turretX, y: 0.38, text: '포탑', size: 15, color: C.dim },
  ]
}

function droneItems(drones: readonly Drone[]): WorldItem[] {
  const items: WorldItem[] = []
  for (const d of drones) {
    // 이름은 삼각형 왼쪽(지나온 쪽)에, HP 바는 머리 위에 붙여 드론 하나가 차지하는 높이를 줄인다
    items.push({ kind: 'actor', x: d.X, y: footY(d), role: 'enemy', scale: 0.7, facing: 1 })
    items.push({ kind: 'text', x: d.X - 0.42, y: footY(d) + 0.12, text: d.Name, align: 'right', size: 18, color: '#e6edf7' })
    items.push({ kind: 'bar', x: d.X - 0.4, y: footY(d) + 1.02, w: 0.8, value: d.Hp / d.MaxHp, fill: C.hp })
  }
  return items
}

const laser = (turretX: number, d: Drone, color: string): WorldItem => ({ kind: 'arrow', x1: turretX, y1: TURRET_TOP, x2: d.X - 0.12, y2: bodyY(d), color })

/** 명중 링을 보이는 시간 (초). 발사 간격의 하한(0.2초)보다 짧지 않게 두되, 방식을 바꾼 뒤 지난 명중이 오래 남아 엇갈림처럼 보이지 않게 짧게 */
const RING_TIME = 0.25
/** 명중 링: 맞은 드론을 따라가며 크기만 줄어든다 (밝기가 번쩍이지 않는다) */
const hitRing = (x: number, y: number, since: number, color: string): WorldItem => ({ kind: 'ring', x, y, r: 0.45 + 0.3 * Math.max(0, 1 - since / RING_TIME), color })

export const createSim: SimFactory = (values: ParamValues, naive: boolean): PatternSim => {
  const range = f(Number(values.range))
  const fireInterval = f(Number(values.fireInterval))
  const damage = Math.round(Number(values.damage))
  const events: string[] = []
  let clock = 0
  const at = { input: -9, target: -9, shot: -9, aim: -9, bug: -9 }
  /** 마지막으로 맞은 드론과 그 자리 (파괴되어 목록에서 빠져도 링을 잠깐 남긴다) */
  let lastHit: Drone | null = null
  let hitX = 0
  let hitY = 0

  const wave = new DroneWave(DroneWave.CreateDefaultTable())
  wave.DroneSpawned.add(d => events.push(`${d.Name} 등장 (HP ${d.Hp})`))
  wave.DroneReachedBase.add(d => events.push(`${d.Name} 기지 도달 (HP ${d.Hp} 남음)`))
  const FIELD = fieldItems(Turret.DefaultX, range)

  const ringItems = (color: string): WorldItem[] => {
    const since = clock - at.shot
    if (lastHit === null || since > RING_TIME) return []
    if (wave.Active.includes(lastHit)) {
      hitX = lastHit.X
      hitY = bodyY(lastHit)
    }
    return [hitRing(hitX, hitY, since, color)]
  }

  if (!naive) {
    const turret = new Turret(wave, Turret.DefaultX, Targeting.Nearest)
    turret.Range = range
    turret.FireInterval = fireInterval
    turret.Damage = damage
    turret.StrategyChanged.add((from, to) => events.push(`조준 방식 ${Short(from)} → ${Short(to)}`))
    turret.TargetChanged.add((from, to) => {
      events.push(`대상 ${N(from)} → ${N(to)}`)
      at.target = clock
    })
    turret.Fired.add(d => {
      events.push(`발사 → ${d.Name} (HP ${d.Hp}/${d.MaxHp})`)
      at.shot = clock
      lastHit = d
      hitX = d.X
      hitY = bodyY(d)
    })
    turret.DroneDestroyed.add(d => events.push(`${d.Name} 파괴`))

    return {
      input(name) {
        at.input = clock
        turret.SetStrategy(Parse(name))
      },
      tick(dt) {
        wave.Tick(dt)
        turret.Tick(dt)
        clock += dt
      },
      drain: () => events.splice(0),
      snapshot: () => `방식=${Short(turret.Strategy)} 대상=${N(turret.CurrentTarget)} cd=${F2(turret.Cooldown)}${wave.Active.map(d => ` ${d.Name} x=${F2(d.X)} hp=${d.Hp}`).join('')}`,
      view(): SimView {
        const name = Short(turret.Strategy)
        const target = turret.CurrentTarget
        const inRange = wave.Active.filter(d => Math.abs(d.X - turret.X) <= turret.Range).length
        const world: WorldItem[] = [...FIELD, ...droneItems(wave.Active)]
        if (target) world.push(laser(turret.X, target, C.laser))
        world.push(...ringItems(C.hit))
        world.push(
          { kind: 'text', x: 0.4, y: 8.3, text: `조준: ${KOREAN[name]}  (${name}Target)`, align: 'left', size: 26, color: C.ok },
          { kind: 'text', x: 0.4, y: 7.6, text: `대상 ${N(target)} (레이저 = 발사) · 다음 발사 ${F2(Math.max(0, turret.Cooldown))}초 · 후보 ${inRange}대`, align: 'left', size: 20, color: C.dim },
        )
        // 늘 켜 두는 것은 포탑이 지금 전략을 들고 있다는 화살표 하나. 입력, 대상 바뀜, 발사 직후 0.3초만 그 길을 켠다
        const active = new Set<string>(['turret-strategy'])
        if (clock - at.input < 0.3) for (const id of ['ctrl', 'ctrl-turret', 'turret']) active.add(id)
        if (clock - at.target < 0.3) for (const id of ['turret', 'istrategy', 'impls', 'impls-istrategy']) active.add(id)
        if (clock - at.shot < 0.3) for (const id of ['turret', 'turret-wave', 'wave']) active.add(id)
        return { world, active: [...active] }
      },
    }
  }

  const n = new NaiveTurret(wave)
  n.range = range
  n.fireInterval = fireInterval
  n.damage = damage
  let lastAim: Drone | null = null
  let lastMismatch = false
  /** 마지막 발사 때 레이저가 가리키던 드론 (화면의 '레이저 D1 / 명중 D3') */
  let aimAtShot: Drone | null = null
  const before: Drone[] = []
  const hpBefore: number[] = []

  return {
    input(name) {
      at.input = clock
      if (n.mode === name) return
      n.mode = name
      events.push(`mode = "${name}"`)
    },
    tick(dt) {
      wave.Tick(dt)
      before.length = 0
      hpBefore.length = 0
      for (const d of wave.Active) {
        before.push(d)
        hpBefore.push(d.Hp)
      }
      n.Update(dt)
      if (n.aimTarget !== lastAim) {
        events.push(`레이저 ${N(lastAim)} → ${N(n.aimTarget)}`)
        lastAim = n.aimTarget
        at.aim = clock
      }
      for (let i = 0; i < before.length; i++) {
        const hit = before[i]
        if (hit.Hp === hpBefore[i]) continue
        events.push(`발사 → ${hit.Name} (HP ${hit.Hp}/${hit.MaxHp})`)
        if (!hit.IsAlive) events.push(`${hit.Name} 파괴`)
        const mismatch = hit !== n.aimTarget
        if (mismatch && !lastMismatch) {
          events.push(`!조준 엇갈림: 레이저 ${N(n.aimTarget)}, 명중 ${hit.Name}`)
          at.bug = clock
        }
        lastMismatch = mismatch
        at.shot = clock
        lastHit = hit
        aimAtShot = n.aimTarget
        hitX = hit.X
        hitY = bodyY(hit)
      }
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot: () => `mode=${n.mode} 레이저=${N(n.aimTarget)}${wave.Active.map(d => ` ${d.Name} x=${F2(d.X)} hp=${d.Hp}`).join('')}`,
    view(): SimView {
      const aim = n.aimTarget && wave.Active.includes(n.aimTarget) ? n.aimTarget : null
      const world: WorldItem[] = [...FIELD, ...droneItems(wave.Active)]
      if (aim) world.push(laser(n.X, aim, C.naiveLaser))
      world.push(...ringItems(lastMismatch ? C.bug : C.hit))
      const hot = clock - at.bug < 0.8
      const shotLine = lastHit ? `마지막 발사: 레이저 ${N(aimAtShot)} / 명중 ${N(lastHit)}${lastMismatch ? '  ✖ 엇갈림' : ''}` : '아직 쏘지 않았다'
      world.push(
        { kind: 'text', x: 0.4, y: 8.3, text: `mode = "${n.mode}"  (${MODE_KOREAN[n.mode] ?? n.mode})`, align: 'left', size: 26, color: hot ? C.bug : C.warn },
        { kind: 'text', x: 0.4, y: 7.6, text: shotLine, align: 'left', size: 20, color: lastMismatch ? C.bug : C.dim },
      )
      const active = new Set<string>()
      if (clock - at.input < 0.3) active.add('mode')
      if (clock - at.aim < 0.3) for (const id of ['nupdate-aim', 'aim', 'aim-mode']) active.add(id)
      if (clock - at.shot < 0.3) for (const id of ['nupdate-fire', 'fire', 'fire-mode']) active.add(id)
      return { world, active: [...active] }
    },
  }
}
