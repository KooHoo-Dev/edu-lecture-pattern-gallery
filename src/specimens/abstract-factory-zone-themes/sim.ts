import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/abstract-factory-zone-themes 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/abstract-factory-zone-themes/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다.
 * Core 파일 순서: ZoneProducts.cs (제품) → ZoneFactories.cs (공장) → ZoneDirector.cs (클라이언트) */

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

/* ───────── Core/ZoneProducts.cs ───────── */

class Ground {
  readonly Theme: string
  readonly Name: string
  constructor(theme: string, name: string) {
    this.Theme = theme
    this.Name = name
  }
}

class Projectile {
  readonly Theme: string
  readonly Name: string
  X = 0
  constructor(theme: string, name: string) {
    this.Theme = theme
    this.Name = name
  }
}

class Drone {
  readonly Theme: string
  readonly Name: string
  readonly Label: string
  Number = 0
  Slot = -1
  X = 0
  private factory: IZoneFactory | null = null
  get Factory(): IZoneFactory | null {
    return this.factory
  }
  get Tag() {
    return this.Label + ' #' + this.Number
  }
  constructor(theme: string, name: string, label: string) {
    this.Theme = theme
    this.Name = name
    this.Label = label
  }
  Remember(maker: IZoneFactory) {
    if (!maker) throw new Error('maker')
    if (this.factory) throw new Error(`${this.Tag} 는 이미 공장을 기억한다`)
    this.factory = maker
  }
  Fire(): Projectile {
    if (!this.factory) throw new Error(`${this.Tag} 를 만든 공장이 없다 (ZoneDirector.Spawn 으로 만든다)`)
    const projectile = this.factory.CreateProjectile() // [3] 지금 공장이 아니라 나를 만든 공장
    projectile.X = f(this.X - 0.5)
    return projectile
  }
}

/* ───────── Core/ZoneFactories.cs ───────── */

interface IZoneFactory {
  readonly Theme: string
  CreateGround(): Ground
  CreateDrone(): Drone
  CreateProjectile(): Projectile
}

class ForestFactory implements IZoneFactory {
  readonly Theme = 'forest'
  CreateGround() {
    return new Ground(this.Theme, '이끼 바닥')
  }
  CreateDrone() {
    return new Drone(this.Theme, '덩굴 드론', '덩굴')
  }
  CreateProjectile() {
    return new Projectile(this.Theme, '가시')
  }
}

class LavaFactory implements IZoneFactory {
  readonly Theme = 'lava'
  CreateGround() {
    return new Ground(this.Theme, '현무암 바닥')
  }
  CreateDrone() {
    return new Drone(this.Theme, '화염 드론', '화염')
  }
  CreateProjectile() {
    return new Projectile(this.Theme, '화염탄')
  }
}

class IceFactory implements IZoneFactory {
  readonly Theme = 'ice'
  CreateGround() {
    return new Ground(this.Theme, '빙판 바닥')
  }
  CreateDrone() {
    return new Drone(this.Theme, '서리 드론', '서리')
  }
  CreateProjectile() {
    return new Projectile(this.Theme, '얼음 조각')
  }
}

/* ───────── Core/ZoneDirector.cs ───────── */

interface ZoneSettings {
  MaxDrones: number
  ProjectileSpeed: number
  FirstSlotX: number
  SlotSpacing: number
  VanishX: number
}

class ZoneDirector {
  private drones: Drone[] = []
  private projectiles: Projectile[] = []
  readonly Settings: ZoneSettings
  Factory!: IZoneFactory
  Ground!: Ground
  get Drones(): readonly Drone[] {
    return this.drones
  }
  get Projectiles(): readonly Projectile[] {
    return this.projectiles
  }
  ZoneEntered = new Event<[IZoneFactory, Ground]>()
  DroneSpawned = new Event<[Drone]>()
  SpawnRejected = new Event<[number]>()
  ProjectileFired = new Event<[Drone, Projectile]>()
  ProjectileVanished = new Event<[Projectile]>()

  constructor(start: IZoneFactory, settings: ZoneSettings) {
    this.Settings = settings
    this.Enter(start)
  }

  Enter(next: IZoneFactory) {
    if (!next) throw new Error('next')
    this.Factory = next // [1] 공장 객체를 통째로 갈아 끼운다
    this.Ground = next.CreateGround()
    this.ZoneEntered.invoke(next, this.Ground)
  }

  Spawn(): Drone | null {
    if (this.drones.length >= this.Settings.MaxDrones) {
      this.SpawnRejected.invoke(this.Settings.MaxDrones)
      return null
    }
    const maker = this.Factory
    const drone = maker.CreateDrone() // [2] 무슨 드론인지는 지금 공장이 정한다
    drone.Remember(maker)
    drone.Number = this.drones.length + 1
    drone.Slot = this.drones.length
    drone.X = f(this.Settings.FirstSlotX - f(drone.Slot * this.Settings.SlotSpacing))
    this.drones.push(drone)
    this.DroneSpawned.invoke(drone)
    return drone
  }

  FireAll() {
    for (const drone of [...this.drones]) {
      const projectile = drone.Fire() // [3] 지휘자는 구역을 묻지 않는다
      this.projectiles.push(projectile)
      this.ProjectileFired.invoke(drone, projectile)
    }
  }

  Tick(dt: number) {
    let i = 0
    while (i < this.projectiles.length) {
      const p = this.projectiles[i]
      p.X = f(p.X - f(this.Settings.ProjectileSpeed * dt))
      if (p.X <= this.Settings.VanishX) {
        this.projectiles.splice(i, 1)
        this.ProjectileVanished.invoke(p)
        continue
      }
      i++
    }
  }
}

/* ───────── Naive/NaiveZoneSpawner.cs ───────── */

class NaiveZoneSpawner {
  maxDrones = 4
  projectileSpeed = f(6)
  zone = 'forest'
  ground!: Ground
  readonly drones: Drone[] = []
  readonly projectiles: Projectile[] = []

  constructor(startZone: string) {
    this.zone = startZone
    this.SetGround()
  }

  EnterZone(next: string) {
    this.zone = next
    this.SetGround()
  }

  SetGround() {
    switch (this.zone) {
      case 'forest': this.ground = new Ground('forest', '이끼 바닥'); break
      case 'lava': this.ground = new Ground('lava', '현무암 바닥'); break
      case 'ice': this.ground = new Ground('ice', '빙판 바닥'); break
      default: this.ground = new Ground('lava', '현무암 바닥'); break
    }
  }

  SpawnDrone(): Drone | null {
    if (this.drones.length >= this.maxDrones) return null
    let drone: Drone
    switch (this.zone) {
      case 'forest': drone = new Drone('forest', '덩굴 드론', '덩굴'); break
      case 'lava': drone = new Drone('lava', '화염 드론', '화염'); break
      case 'ice': drone = new Drone('ice', '서리 드론', '서리'); break
      default: drone = new Drone('lava', '화염 드론', '화염'); break
    }
    drone.Number = this.drones.length + 1
    drone.Slot = this.drones.length
    drone.X = f(f(12.8) - f(drone.Slot * f(1.6)))
    this.drones.push(drone)
    return drone
  }

  FireAll() {
    for (const drone of this.drones) {
      const p = this.MakeProjectile(this.zone) // [!] 드론의 테마가 아니라 지금 구역
      p.X = f(drone.X - 0.5)
      this.projectiles.push(p)
    }
  }

  MakeProjectile(zone: string): Projectile {
    switch (zone) {
      case 'forest': return new Projectile('forest', '가시')
      case 'lava': return new Projectile('lava', '화염탄')
      default: return new Projectile('lava', '화염탄') // [!] case "ice" 가 빠졌다
    }
  }

  Update(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.projectiles[i].X = f(this.projectiles[i].X - f(this.projectileSpeed * dt))
      if (this.projectiles[i].X <= 3) this.projectiles.splice(i, 1)
    }
  }
}

/* ───────── truth/abstract-factory-zone-themes/Target.cs 와 같은 어댑터 ───────── */

const ClassOf = (x: IZoneFactory | null) => (x instanceof ForestFactory ? 'ForestFactory' : x instanceof LavaFactory ? 'LavaFactory' : 'IceFactory')
const F2 = (v: number) => v.toFixed(2)

/* ───────── 무대 그림 ───────── */

/** 세트의 겉모습 (Unity 에서는 ZoneArtSet 에셋 하나). 화면에만 쓴다 */
const ART: Record<string, { ko: string; ground: string; mark: string }> = {
  forest: { ko: '숲', ground: '#3d8b4f', mark: '#7ee081' },
  lava: { ko: '용암', ground: '#c45a24', mark: '#ff9a4a' },
  ice: { ko: '빙하', ground: '#6fb6d8', mark: '#bfeeff' },
}
const C = { exit: '#0e1a2e', dim: '#8796ae', text: '#d8e2f0', ok: '#7ee081', bug: '#ff5d6c', warn: '#ffb547' }
/** 드론과 투사체의 높이 (화면에만) */
const DRONE_Y = 1.75
const DRONE_SCALE = 0.8
const SHOT_Y = 2.15
const HARIN_X = 1.8

export const createSim: SimFactory = (values: ParamValues, isNaive: boolean): PatternSim => {
  const factories: Record<string, IZoneFactory> = { forest: new ForestFactory(), lava: new LavaFactory(), ice: new IceFactory() }
  const events: string[] = []
  let clock = 0
  const at = { input: -9, spawn: -9, reject: -9, bug: -9 }
  let path: string[] = []
  let lastSpawned: Drone | null = null
  const start = String(values.startZone)
  const maxDrones = Math.round(Number(values.maxDrones))
  const projectileSpeed = f(Number(values.projectileSpeed))
  /** 나쁜 예: 드론마다 마지막 사격이 자기 세트와 어긋났는지 */
  const mismatched = new Map<Drone, boolean>()
  /** 나쁜 예: 어긋난 드론에 남기는 글 (어긋남이 이어지는 동안) */
  const wrongNote = new Map<Drone, string>()
  /** 나쁜 예: 세트가 어긋난 투사체 (빨간 테두리) */
  const wrongShots = new Set<Projectile>()

  let director: ZoneDirector | null = null
  let naive: NaiveZoneSpawner | null = null

  if (isNaive) {
    naive = new NaiveZoneSpawner(start)
    naive.maxDrones = maxDrones
    naive.projectileSpeed = projectileSpeed
    events.push(`시작 zone = "${naive.zone}" · ${naive.ground.Name}`)
  } else {
    const d = new ZoneDirector(factories[start], { MaxDrones: maxDrones, ProjectileSpeed: projectileSpeed, FirstSlotX: f(12.8), SlotSpacing: f(1.6), VanishX: f(3) })
    director = d
    events.push(`시작 구역 ${d.Factory.Theme} · ${ClassOf(d.Factory)} · ${d.Ground.Name}`)
    d.ZoneEntered.add((fac, g) => events.push(`구역 → ${fac.Theme} · ${ClassOf(fac)} · ${g.Name}`))
    d.DroneSpawned.add(x => {
      events.push(`${x.Tag} → 자리 ${x.Slot} (${ClassOf(x.Factory)})`)
      lastSpawned = x
      at.spawn = clock
    })
    d.SpawnRejected.add(n => {
      events.push(`출격 거절: 자리 ${n}개가 모두 찼다`)
      at.reject = clock
    })
    d.ProjectileFired.add((x, p) => events.push(`${x.Tag} → ${p.Name} (${ClassOf(x.Factory)}.CreateProjectile)`))
    d.ProjectileVanished.add(p => events.push(`${p.Name} 사라짐 (하린 앞)`))
  }

  const naiveFire = (n: NaiveZoneSpawner) => {
    const before = n.projectiles.length
    n.FireAll()
    for (let i = 0; i < n.drones.length; i++) {
      const d = n.drones[i]
      const p = n.projectiles[before + i]
      events.push(`${d.Tag} → ${p.Name} (MakeProjectile("${n.zone}"))`)
      const now = p.Theme !== d.Theme
      const last = mismatched.get(d) === true
      mismatched.set(d, now)
      const expected = factories[d.Theme].CreateProjectile().Name
      if (now) {
        wrongShots.add(p)
        wrongNote.set(d, `${expected} 대신 ${p.Name}`)
      } else wrongNote.delete(d)
      if (!now || last) continue
      if (d.Theme !== n.zone) events.push(`!구역 섞임: ${d.Tag} · ${expected} 대신 ${p.Name} (지금 zone "${n.zone}" 로 만들었다)`)
      else events.push(`!분기 누락: ${d.Tag} · ${expected} 대신 ${p.Name} (MakeProjectile 에 case "${n.zone}" 가 없어 default)`)
      at.bug = clock
    }
  }

  const naiveInput = (n: NaiveZoneSpawner, name: string) => {
    if (name === 'spawn') {
      const made = n.SpawnDrone()
      if (made === null) {
        events.push(`출격 거절: 자리 ${n.maxDrones}개가 모두 찼다`)
        at.reject = clock
        path = ['nspawn']
      } else {
        events.push(`${made.Tag} → 자리 ${made.Slot} (SpawnDrone: zone "${n.zone}")`)
        lastSpawned = made
        at.spawn = clock
        path = ['nspawn', 'nspawn-nzone']
      }
    } else if (name === 'fire') {
      naiveFire(n)
      path = ['nfire', 'nfire-nmake', 'nmake', 'nmake-nzone']
    } else {
      n.EnterZone(name)
      events.push(`zone = "${n.zone}" · ${n.ground.Name}`)
      path = ['nenter', 'nenter-nzone', 'nenter-nground', 'nground', 'nground-nzone']
    }
  }

  const coreInput = (d: ZoneDirector, name: string) => {
    if (name === 'spawn') {
      const made = d.Spawn()
      path = made ? ['input', 'input-director', 'director', 'director-factory', 'ifactory', made.Theme, `${made.Theme}-products`, 'products', 'drone', 'drone-factory'] : ['input', 'input-director', 'director']
    } else if (name === 'fire') {
      const sets = [...new Set(d.Drones.map(x => x.Theme))]
      d.FireAll()
      path = ['input', 'input-director', 'director', 'director-drone', 'drone', 'drone-factory', 'ifactory', ...sets.flatMap(t => [t, `${t}-products`]), ...(sets.length ? ['products'] : [])]
    } else {
      d.Enter(factories[name])
      path = ['input', 'input-pick', 'input-director', 'director', 'director-factory', 'ifactory', name, `i-${name}`]
    }
  }

  const recent = (t: number, within = 0.35) => clock - t < within

  return {
    input(name) {
      at.input = clock
      if (naive) naiveInput(naive, name)
      else coreInput(director!, name)
    },
    tick(dt) {
      if (director) director.Tick(dt)
      else {
        const n = naive!
        const before = [...n.projectiles]
        n.Update(dt)
        for (const p of before) if (!n.projectiles.includes(p)) {
          events.push(`${p.Name} 사라짐 (하린 앞)`)
          wrongShots.delete(p)
        }
      }
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot() {
      const zone = director ? director.Factory.Theme : naive!.zone
      const drones = director ? director.Drones : naive!.drones
      const flying = director ? director.Projectiles : naive!.projectiles
      const sets = drones.length === 0 ? '-' : drones.map(d => d.Theme).join(',')
      const shots = flying.length === 0 ? '-' : flying.map(p => p.Theme).join(',')
      const p0 = flying.length === 0 ? '-' : F2(flying[0].X)
      return `zone=${zone} drones=${drones.length} sets=${sets} flying=${shots} p0=${p0}`
    },
    view(): SimView {
      const ground = director ? director.Ground : naive!.ground
      const drones = director ? director.Drones : naive!.drones
      const flying = director ? director.Projectiles : naive!.projectiles
      const cap = director ? director.Settings.MaxDrones : naive!.maxDrones
      const full = drones.length >= cap
      const world: WorldItem[] = [
        // 바닥: 지금 구역 공장이 만든 Ground (색과 이름)
        { kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: ART[ground.Theme].ground },
        { kind: 'text', x: 8, y: 0.5, text: ground.Name, size: 18, color: C.exit },
        { kind: 'box', x: 13.7, y: 1, w: 1.5, h: 2.6, fill: C.exit, stroke: full ? C.warn : C.dim, label: '출구' },
        { kind: 'actor', x: HARIN_X, y: 1, role: 'ally', label: '하린', facing: 1 },
        { kind: 'box', x: 3, y: 1, w: 0.06, h: 2, fill: C.dim },
      ]
      // 드론: 몸(라벨은 짧은 이름), 발밑의 자기 세트 표식, 바닥의 번호
      for (const d of drones) {
        const art = ART[d.Theme]
        world.push({ kind: 'actor', x: d.X, y: DRONE_Y, role: 'enemy', label: d.Label, scale: DRONE_SCALE, facing: -1 })
        world.push({ kind: 'box', x: d.X - 0.35, y: 1.15, w: 0.7, h: 0.35, fill: art.mark, stroke: art.ground })
        world.push({ kind: 'text', x: d.X, y: 0.5, text: `#${d.Number}`, size: 16, color: C.exit })
      }
      // 방금 나온 드론: 출구에서 자리로
      if (lastSpawned && recent(at.spawn) && drones.includes(lastSpawned)) {
        world.push({ kind: 'arrow', x1: 13.7, y1: 2.3, x2: lastSpawned.X + 0.4, y2: 2.3, color: C.dim })
        world.push({ kind: 'ring', x: lastSpawned.X, y: DRONE_Y + 0.55, r: 0.6, color: C.ok })
      }
      if (recent(at.reject, 0.8)) world.push({ kind: 'text', x: 14.45, y: 4.1, text: '출격 거절', size: 18, color: C.warn })
      // 투사체: 자기 세트 색, 이름. 나쁜 예에서 세트가 어긋난 것은 빨간 테두리
      for (const p of flying) {
        const wrong = wrongShots.has(p)
        world.push({ kind: 'box', x: p.X - 0.25, y: SHOT_Y - 0.12, w: 0.5, h: 0.24, fill: ART[p.Theme].mark, stroke: wrong ? C.bug : undefined })
        if (wrong) world.push({ kind: 'box', x: p.X - 0.36, y: SHOT_Y - 0.22, w: 0.72, h: 0.44, stroke: C.bug })
        world.push({ kind: 'text', x: p.X, y: SHOT_Y + 0.42, text: p.Name, size: 15, color: wrong ? C.bug : C.text })
      }
      // 나쁜 예: 세트가 어긋난 드론 위에 남는 글
      if (naive) {
        for (const d of drones) {
          const note = wrongNote.get(d)
          if (!note) continue
          world.push({ kind: 'text', x: d.X, y: 4.25, text: '세트 어긋남', size: 15, color: C.bug })
          world.push({ kind: 'text', x: d.X, y: 3.75, text: note, size: 15, color: C.bug })
          world.push({ kind: 'box', x: d.X - 0.5, y: 1.05, w: 1, h: 2.35, stroke: C.bug, dashed: true })
        }
      }

      // 왼쪽 위: 지금 구역과 공장 (나쁜 예는 zone 문자열)
      const zone = director ? director.Factory.Theme : naive!.zone
      const head = director ? `구역: ${ART[zone].ko} · 공장: ${ClassOf(director.Factory)}` : `zone = "${zone}"  (${ART[zone].ko})`
      world.push({ kind: 'text', x: 0.4, y: 8.3, text: head, align: 'left', size: 26, color: director ? C.ok : C.warn })
      world.push({ kind: 'text', x: 0.4, y: 7.6, text: `바닥: ${ground.Name} · 출구 앞 드론 ${drones.length}/${cap}${full ? ' (가득)' : ''}`, align: 'left', size: 20, color: C.dim })
      world.push({ kind: 'text', x: 0.4, y: 6.95, text: '세트: 숲 = 덩굴·가시 · 용암 = 화염·화염탄 · 빙하 = 서리·얼음 조각', align: 'left', size: 16, color: C.dim })

      const active = recent(at.input, 0.3) ? [...path] : []
      active.push(naive ? 'nzone' : zone)
      return { world, active }
    },
  }
}
