import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/object-pool-projectiles 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/object-pool-projectiles/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다. */

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

type ProjectileKind = 'Fast' | 'Slow'

/* ───────── Core/Projectile.cs ───────── */

class Projectile {
  Id: number
  Kind: ProjectileKind = 'Fast'
  X = 0
  Speed = 0
  Life = 0
  InUse = false
  TimesTaken = 0

  constructor(id: number) {
    this.Id = id
  }

  Launch(kind: ProjectileKind, x: number, speed: number, life: number) {
    this.Kind = kind
    this.X = x
    this.Speed = speed
    this.Life = life
  }

  Move(dt: number) {
    this.X = f(this.X + f(this.Speed * dt))
    this.Life = f(this.Life - dt)
  }
}

/* ───────── Core/ProjectilePool.cs ───────── */

class ProjectilePool {
  private all: Projectile[] = []
  private idle: Projectile[] = []
  ReuseCount = 0

  get All(): readonly Projectile[] {
    return this.all
  }
  get Idle(): readonly Projectile[] {
    return this.idle
  }
  get CreatedCount() {
    return this.all.length
  }
  get ActiveCount() {
    return this.all.length - this.idle.length
  }
  get IdleCount() {
    return this.idle.length
  }

  Created = new Event<[Projectile]>()
  Taken = new Event<[Projectile, boolean]>()
  Returned = new Event<[Projectile]>()
  ReleaseRejected = new Event<[Projectile]>()

  Prewarm(count: number) {
    const first = this.all.length
    for (let i = 0; i < count; i++) this.Create()
    for (let i = this.all.length - 1; i >= first; i--) this.idle.push(this.all[i])
  }

  Get(): Projectile {
    let p: Projectile
    if (this.idle.length > 0) {
      p = this.idle[this.idle.length - 1]
      this.idle.splice(this.idle.length - 1, 1)
    } else {
      p = this.Create()
    }
    const reused = p.TimesTaken > 0
    if (reused) this.ReuseCount++
    p.TimesTaken++
    p.InUse = true
    this.Taken.invoke(p, reused)
    return p
  }

  Release(p: Projectile): boolean {
    if (!p.InUse) {
      this.ReleaseRejected.invoke(p)
      return false
    }
    p.InUse = false
    this.idle.push(p)
    this.Returned.invoke(p)
    return true
  }

  private Create(): Projectile {
    const p = new Projectile(this.all.length + 1)
    this.all.push(p)
    this.Created.invoke(p)
    return p
  }
}

/* ───────── Core/Turret.cs ───────── */

class TurretSettings {
  FastSpeed = f(14)
  SlowSpeed = f(6)
  FastLife = f(0.6)
  SlowLife = f(3.5)
  BurstCount = 5
  BurstInterval = f(0.1)
  MuzzleX = f(2)
  TargetX = f(15)
  ScreenRightX = f(15)

  SpeedOf(kind: ProjectileKind) {
    return kind === 'Fast' ? this.FastSpeed : this.SlowSpeed
  }
  LifeOf(kind: ProjectileKind) {
    return kind === 'Fast' ? this.FastLife : this.SlowLife
  }
}

class Turret {
  Settings: TurretSettings
  Pool: ProjectilePool
  private flying: Projectile[] = []
  private burstLeft = 0
  private burstTimer = 0
  Hits = 0

  get Flying(): readonly Projectile[] {
    return this.flying
  }
  get BurstLeft() {
    return this.burstLeft
  }

  Fired = new Event<[Projectile]>()
  Hit = new Event<[Projectile, boolean]>()
  Expired = new Event<[Projectile, boolean]>()

  constructor(settings: TurretSettings, pool: ProjectilePool) {
    this.Settings = settings
    this.Pool = pool
  }

  Fire(kind: ProjectileKind): Projectile {
    const p = this.Pool.Get()
    p.Launch(kind, this.Settings.MuzzleX, this.Settings.SpeedOf(kind), this.Settings.LifeOf(kind))
    this.flying.push(p)
    this.Fired.invoke(p)
    return p
  }

  StartBurst() {
    this.burstLeft = this.Settings.BurstCount - 1
    this.burstTimer = this.Settings.BurstInterval
    this.Fire('Fast')
  }

  Tick(dt: number) {
    if (this.burstLeft > 0) {
      this.burstTimer = f(this.burstTimer - dt)
      if (this.burstTimer <= 0) {
        this.burstLeft--
        this.burstTimer = f(this.burstTimer + this.Settings.BurstInterval)
        this.Fire('Fast')
      }
    }

    for (let i = 0; i < this.flying.length; i++) {
      const p = this.flying[i]
      p.Move(dt)
      const hit = p.X >= this.Settings.TargetX
      const outside = p.X >= this.Settings.ScreenRightX
      const expired = p.Life <= 0
      if (!hit && !outside && !expired) continue
      this.flying.splice(i, 1)
      i--
      if (hit) {
        this.Hits++
        this.Hit.invoke(p, outside)
      } else {
        this.Expired.invoke(p, outside)
      }
      this.Pool.Release(p)
    }
  }
}

/* ───────── Naive/NaiveTurret.cs ───────── */

class NaiveProjectile {
  Id: number
  private turret: NaiveTurret
  Kind: ProjectileKind = 'Fast'
  X = 0
  Speed = 0
  Lifetime = 0
  Age = 0
  Active = false
  private started = false

  constructor(id: number, turret: NaiveTurret) {
    this.Id = id
    this.turret = turret
  }

  SetActive(on: boolean) {
    if (on === this.Active) return
    this.Active = on
    if (!on) return
    this.OnEnable()
    if (this.started) return
    this.started = true
    this.Start()
  }

  private Start() {
    this.Speed = this.turret.SpeedOf(this.Kind)
    this.Lifetime = this.turret.LifeOf(this.Kind)
  }

  private OnEnable() {
    this.Age = 0
  }

  Update(dt: number) {
    this.X = f(this.X + f(this.Speed * dt))
    this.Age = f(this.Age + dt)
    if (this.X >= this.turret.TargetX) {
      this.turret.hits++
      this.turret.pool.Release(this)
    }
    if (this.X >= this.turret.ScreenRightX || this.Age >= this.Lifetime) this.turret.pool.Release(this)
  }
}

class NaivePool {
  all: NaiveProjectile[] = []
  idle: NaiveProjectile[] = []
  private turret: NaiveTurret

  constructor(turret: NaiveTurret) {
    this.turret = turret
  }

  Prewarm(count: number) {
    const first = this.all.length
    for (let i = 0; i < count; i++) this.Create()
    for (let i = this.all.length - 1; i >= first; i--) this.idle.push(this.all[i])
  }

  Get(): NaiveProjectile {
    if (this.idle.length === 0) return this.Create()
    const p = this.idle[this.idle.length - 1]
    this.idle.splice(this.idle.length - 1, 1)
    return p
  }

  Release(p: NaiveProjectile) {
    p.SetActive(false)
    this.idle.push(p)
  }

  private Create(): NaiveProjectile {
    const p = new NaiveProjectile(this.all.length + 1, this.turret)
    this.all.push(p)
    return p
  }
}

class NaiveTurret {
  fastSpeed = f(14)
  slowSpeed = f(6)
  fastLife = f(0.6)
  slowLife = f(3.5)
  burstCount = 5
  burstInterval = f(0.1)
  MuzzleX = f(2)
  TargetX = f(15)
  ScreenRightX = f(15)

  pool: NaivePool
  hits = 0
  shotsFired = 0
  lastShot: NaiveProjectile | null = null
  private burstLeft = 0
  private burstTimer = 0

  constructor(poolSize: number) {
    this.pool = new NaivePool(this)
    this.pool.Prewarm(poolSize)
  }

  get BurstLeft() {
    return this.burstLeft
  }
  SpeedOf(kind: ProjectileKind) {
    return kind === 'Fast' ? this.fastSpeed : this.slowSpeed
  }
  LifeOf(kind: ProjectileKind) {
    return kind === 'Fast' ? this.fastLife : this.slowLife
  }

  Fire(kind: ProjectileKind) {
    const p = this.pool.Get()
    p.X = this.MuzzleX
    p.Kind = kind
    p.SetActive(true)
    this.shotsFired++
    this.lastShot = p
  }

  StartBurst() {
    this.burstLeft = this.burstCount - 1
    this.burstTimer = this.burstInterval
    this.Fire('Fast')
  }

  Update(dt: number) {
    if (this.burstLeft > 0) {
      this.burstTimer = f(this.burstTimer - dt)
      if (this.burstTimer <= 0) {
        this.burstLeft--
        this.burstTimer = f(this.burstTimer + this.burstInterval)
        this.Fire('Fast')
      }
    }
    for (let i = 0; i < this.pool.all.length; i++) {
      if (this.pool.all[i].Active) this.pool.all[i].Update(dt)
    }
  }
}

/* ───────── truth/object-pool-projectiles/Target.cs 와 같은 어댑터 ───────── */

const F2 = (v: number) => v.toFixed(2)
const K = (kind: ProjectileKind) => (kind === 'Fast' ? '빠른 탄' : '냉각탄')
const Source = (created: boolean, reused: boolean) => (created ? '새 객체' : reused ? '재사용' : '미리 만든 것')

/* ───────── 무대 그림 ───────── */

const C = {
  ground: '#22314a',
  base: '#22385a',
  baseLine: '#5cc8ff',
  turret: '#3a4a66',
  turretLine: '#8796ae',
  fast: '#ffd166',
  slow: '#6fd3ff',
  fastFill: '#6b5419',
  slowFill: '#1d5470',
  idleFill: '#141d2c',
  idleLine: '#3a4a66',
  offscreen: '#0d1420',
  dim: '#8796ae',
  ok: '#7ee081',
  warn: '#ffb547',
  bug: '#ff5d6c',
  bugFill: '#5a1f2a',
  text: '#e6edf7',
}
const LANE_Y = 2.2
const SHELF_Y = 5.75
const QUEUE_Y = 4.15
/** 표적 그림의 가운데. 코어의 명중 위치(TargetX 15)이자 화면 끝이라 표적이 화면 끝 선에 반쯤 걸친다 (Unity 의 Target 이 x 7.5 에 있는 것과 같다) */
const TARGET_X = 15
const kindColor = (k: ProjectileKind) => (k === 'Fast' ? C.fast : C.slow)
const kindShort = (k: ProjectileKind) => (k === 'Fast' ? '빠름' : '냉각')

/** 바닥, 화면 끝, 기지, 포탑, 표적 (모드와 상관없이 같다) */
function fieldItems(muzzleX: number, screenRightX: number, hitRecently: boolean): WorldItem[] {
  return [
    { kind: 'box', x: screenRightX, y: 1, w: 16 - screenRightX + 0.2, h: 3.1, fill: C.offscreen },
    { kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: C.ground },
    { kind: 'box', x: 0.15, y: 1, w: 1.05, h: 2.5, fill: C.base, stroke: C.baseLine },
    { kind: 'text', x: 0.68, y: 0.38, text: '정비 기지', size: 15, color: C.dim },
    { kind: 'box', x: 1.0, y: LANE_Y - 0.3, w: muzzleX - 1.0, h: 0.6, fill: C.turret, stroke: C.turretLine },
    { kind: 'text', x: 1.5, y: LANE_Y + 0.55, text: '포탑', size: 15, color: C.dim },
    { kind: 'actor', x: TARGET_X, y: LANE_Y - 0.6, role: 'enemy', scale: 0.85, pose: hitRecently ? 'hurt' : 'idle', facing: -1 },
    // 화면 끝 선은 표적 위에 그려 표적이 선에 걸친 것이 보이게 한다
    { kind: 'box', x: screenRightX - 0.02, y: 1, w: 0.04, h: 3.1, fill: C.dim },
    { kind: 'text', x: screenRightX - 0.1, y: 3.75, text: '화면 끝', align: 'right', size: 15, color: C.dim },
    { kind: 'text', x: screenRightX - 0.45, y: LANE_Y + 1.0, text: '잔해 드론 (표적)', align: 'right', size: 15, color: '#ff9b8a' },
  ]
}

/** 날아가는 탄: 빠른 탄은 납작한 상자, 냉각탄은 고리. 위에 번호, 아래에 종류 */
function bulletItems(id: number, kind: ProjectileKind, x: number, outline: string | null): WorldItem[] {
  const items: WorldItem[] =
    kind === 'Fast'
      ? [{ kind: 'box', x: x - 0.28, y: LANE_Y - 0.12, w: 0.56, h: 0.24, fill: C.fast }]
      : [{ kind: 'ring', x, y: LANE_Y, r: 0.2, color: C.slow }]
  items.push({ kind: 'text', x, y: LANE_Y + 0.38, text: `#${id}`, size: 17, color: outline ?? C.text })
  items.push({ kind: 'text', x, y: LANE_Y - 0.6, text: kindShort(kind), size: 14, color: kindColor(kind) })
  if (outline) items.push({ kind: 'box', x: x - 0.42, y: LANE_Y - 0.3, w: 0.84, h: 0.6, stroke: outline, dashed: true })
  return items
}

interface Slot {
  id: number
  inUse: boolean
  kind: ProjectileKind | null
  /** 나쁜 예: 대기 줄에 두 칸 이상, 또는 날면서 대기 줄에도 있다 */
  wrong: string | null
}

/** 풀 선반 (만든 탄마다 한 칸)과 대기 줄 (맨 왼쪽이 다음 Get) */
function shelfItems(slots: Slot[], queue: number[], dupIds: Set<number>): WorldItem[] {
  const items: WorldItem[] = [{ kind: 'text', x: 0.4, y: SHELF_Y + 1.15, text: '풀 선반: 만든 탄마다 한 칸 (밝음 = 쓰는 중, 흐림 = 대기)', align: 'left', size: 16, color: C.dim }]
  const n = slots.length
  const step = Math.min(1.15, 15.2 / Math.max(1, n))
  const w = step - 0.15
  slots.forEach((s, i) => {
    const x = 0.4 + i * step
    const fill = s.wrong ? C.bugFill : s.inUse && s.kind ? (s.kind === 'Fast' ? C.fastFill : C.slowFill) : C.idleFill
    const stroke = s.wrong ? C.bug : s.inUse && s.kind ? kindColor(s.kind) : C.idleLine
    items.push({ kind: 'box', x, y: SHELF_Y, w, h: 0.8, fill, stroke, dashed: !s.inUse && !s.wrong, label: `#${s.id}` })
    const sub = s.wrong ? `✖ ${s.kind ? kindShort(s.kind) : ''}` : s.kind ? kindShort(s.kind) : '새것'
    items.push({ kind: 'text', x: x + w / 2, y: SHELF_Y - 0.3, text: sub, size: 13, color: s.wrong ? C.bug : s.inUse ? C.text : C.dim })
  })
  // 나쁜 예: 어긋난 칸의 까닭은 칸 밑이 좁아 대기 줄 아래에 글로 둔다 (상태가 이어지는 동안 남는다)
  const dup = slots.filter(s => s.wrong && !s.inUse).map(s => `#${s.id}(${s.wrong?.replace('대기 줄에 ', '')})`)
  const fly = slots.filter(s => s.wrong && s.inUse).map(s => `#${s.id}`)
  const parts = [dup.length ? `대기 줄에 두 칸 이상 ${dup.join(' ')}` : '', fly.length ? `날면서 대기 줄에도 ${fly.join(' ')}` : ''].filter(Boolean)
  if (parts.length) items.push({ kind: 'text', x: 0.4, y: QUEUE_Y - 0.5, text: `✖ ${parts.join(' · ')}`, align: 'left', size: 16, color: C.bug })
  items.push({ kind: 'text', x: 0.4, y: QUEUE_Y + 0.95, text: queue.length ? '대기 줄 (왼쪽부터 다음 Get 이 준다)' : '대기 줄: 비었다 → 다음 Get 은 새로 만든다', align: 'left', size: 16, color: C.dim })
  const qStep = Math.min(0.95, 15.2 / Math.max(1, queue.length))
  queue.forEach((id, i) => {
    const dup = dupIds.has(id)
    items.push({ kind: 'box', x: 0.4 + i * qStep, y: QUEUE_Y, w: qStep - 0.12, h: 0.55, fill: dup ? C.bugFill : C.idleFill, stroke: dup ? C.bug : C.idleLine, label: `#${id}` })
  })
  return items
}

export const createSim: SimFactory = (values: ParamValues, naive: boolean): PatternSim => {
  const poolSize = Math.round(Number(values.poolSize))
  const fastSpeed = f(Number(values.fastSpeed))
  const slowSpeed = f(Number(values.slowSpeed))
  const events: string[] = []
  let clock = 0
  const at = { input: -9, fire: -9, hit: -9, ret: -9, created: -9, bug: -9, stale: -9, dup: -9 }
  events.push(`풀 준비: ${poolSize}개 미리 만듦`)

  if (!naive) {
    const pool = new ProjectilePool()
    pool.Prewarm(poolSize)
    const settings = new TurretSettings()
    settings.FastSpeed = fastSpeed
    settings.SlowSpeed = slowSpeed
    const turret = new Turret(settings, pool)
    let lastReused = false
    let lastCreated = false
    let lastOverlap = ''
    pool.Created.add(p => {
      events.push(`#${p.Id} 새로 만듦 · 대기 줄이 비었다 (만든 수 ${pool.CreatedCount})`)
      lastCreated = true
      at.created = clock
    })
    pool.Taken.add((_p, reused) => {
      lastReused = reused
    })
    pool.Returned.add(p => {
      events.push(`#${p.Id} 반납 · 대기 ${pool.IdleCount}`)
      at.ret = clock
    })
    pool.ReleaseRejected.add(p => events.push(`#${p.Id} 은 이미 대기 중 · 반납 거절`))
    turret.Fired.add(p => {
      events.push(`${K(p.Kind)} #${p.Id} 발사 (${Source(lastCreated, lastReused)}) · 속도 ${F2(p.Speed)} 수명 ${F2(p.Life)}`)
      lastCreated = false
      at.fire = clock
    })
    turret.Hit.add((p, outside) => {
      events.push(outside ? `${K(p.Kind)} #${p.Id} 명중 · 같은 프레임에 화면 밖도 참 → 한 번만 반납` : `${K(p.Kind)} #${p.Id} 명중`)
      at.hit = clock
      if (outside) lastOverlap = `#${p.Id} 명중과 화면 밖이 같은 프레임 → 반납 1번`
    })
    turret.Expired.add((p, outside) => events.push(`${K(p.Kind)} #${p.Id} ${outside ? '화면 밖' : '수명 끝'}`))

    return {
      input(name) {
        at.input = clock
        if (name === 'fast') turret.Fire('Fast')
        else if (name === 'slow') turret.Fire('Slow')
        else turret.StartBurst()
      },
      tick(dt) {
        turret.Tick(dt)
        clock += dt
      },
      drain: () => events.splice(0),
      snapshot: () => `made=${pool.CreatedCount} active=${pool.ActiveCount} idle=${pool.IdleCount} reuse=${pool.ReuseCount} hits=${turret.Hits}${turret.Flying.map(p => ` #${p.Id} x=${F2(p.X)}`).join('')}`,
      view(): SimView {
        const world: WorldItem[] = fieldItems(settings.MuzzleX, settings.ScreenRightX, clock - at.hit < 0.3)
        const slots: Slot[] = pool.All.map(p => ({ id: p.Id, inUse: p.InUse, kind: p.Speed === 0 ? null : p.Kind, wrong: null }))
        world.push(...shelfItems(slots, [...pool.Idle].reverse().map(p => p.Id), new Set()))
        for (const p of turret.Flying) world.push(...bulletItems(p.Id, p.Kind, p.X, null))
        if (clock - at.hit < 0.3) world.push({ kind: 'ring', x: TARGET_X, y: LANE_Y, r: 0.75 - (clock - at.hit), color: C.slow })
        world.push(
          { kind: 'text', x: 0.4, y: 8.3, text: `만든 수 ${pool.CreatedCount} · 쓰는 중 ${pool.ActiveCount} · 대기 ${pool.IdleCount}`, align: 'left', size: 26, color: C.ok },
          { kind: 'text', x: 0.4, y: 7.6, text: `Instantiate 대신 재사용 ${pool.ReuseCount}회 · 명중 ${turret.Hits}${lastOverlap ? ` · ${lastOverlap}` : ''}`, align: 'left', size: 20, color: C.dim },
        )
        if (turret.BurstLeft > 0) world.push({ kind: 'text', x: 2.2, y: LANE_Y + 1.05, text: `연사 ${turret.BurstLeft}발 남음`, align: 'left', size: 16, color: C.fast })
        // 늘 켜 두는 것은 풀이 탄을 들고 있다는 화살표 하나. 입력·발사·반납 직후 0.3초만 그 길을 켠다
        const active = new Set<string>(['pool-proj'])
        if (clock - at.input < 0.3) for (const id of ['mb', 'mb-turret', 'turret']) active.add(id)
        if (clock - at.fire < 0.3) for (const id of ['turret', 'turret-pool', 'pool', 'turret-proj', 'proj']) active.add(id)
        if (clock - at.created < 0.3) for (const id of ['pool', 'pool-mb', 'mb', 'mb-view', 'view']) active.add(id)
        if (clock - at.ret < 0.3) for (const id of ['turret', 'turret-pool', 'pool', 'pool-mb']) active.add(id)
        return { world, active: [...active] }
      },
    }
  }

  const n = new NaiveTurret(poolSize)
  n.fastSpeed = fastSpeed
  n.slowSpeed = slowSpeed
  let naiveReuse = 0
  const naiveUsed: boolean[] = []
  const doubled: boolean[] = []
  const idleCount: number[] = []
  const staleShown: boolean[] = []
  /** 무대 표시용: 마지막 버그 글, 날던 중에 다시 빌려 사라진 한 발의 자리, 탄마다 마지막으로 빌린 시각 */
  let lastBug = ''
  let lost: { id: number; x: number; t: number } | null = null
  const firedAt: number[] = []

  const activeFlags = () => n.pool.all.map(p => p.Active)

  const naiveFired = (madeBefore: number, wasActive: boolean[], xBefore: number[]) => {
    const p = n.lastShot as NaiveProjectile
    const created = n.pool.all.length !== madeBefore
    if (created) {
      events.push(`#${p.Id} 새로 만듦 · 대기 줄이 비었다 (만든 수 ${n.pool.all.length})`)
      at.created = clock
    }
    while (naiveUsed.length < p.Id) naiveUsed.push(false)
    const reused = naiveUsed[p.Id - 1]
    naiveUsed[p.Id - 1] = true
    if (reused) naiveReuse++
    events.push(`${K(p.Kind)} #${p.Id} 발사 (${Source(created, reused)}) · 속도 ${F2(p.Speed)} 수명 ${F2(p.Lifetime)}`)
    at.fire = clock
    firedAt[p.Id - 1] = clock
    const bugs: string[] = []
    if (!created && wasActive[p.Id - 1]) {
      events.push(`!같은 탄을 또 빌려 줌: 날던 #${p.Id} 이 포구로 돌아간다 (한 발이 사라졌다)`)
      lost = { id: p.Id, x: xBefore[p.Id - 1], t: clock }
      bugs.push(`#${p.Id} 을 또 빌려 줌 (날던 한 발이 사라짐)`)
    }
    const speed = n.SpeedOf(p.Kind)
    const life = n.LifeOf(p.Kind)
    const stale = p.Speed !== speed || p.Lifetime !== life
    while (staleShown.length < p.Id) staleShown.push(false)
    // 이미 알린 채 날던 같은 객체를 또 빌렸다면 (SetActive(true) 가 아무것도 하지 않아 값이 그대로) 같은 버그라 다시 쓰지 않는다
    if (stale && !staleShown[p.Id - 1]) {
      events.push(`!이전 상태 재사용: ${K(p.Kind)} #${p.Id} 속도 ${F2(p.Speed)} (있어야 할 ${F2(speed)}) · 수명 ${F2(p.Lifetime)} (${F2(life)})`)
      bugs.push(`${K(p.Kind)} #${p.Id}: 속도 ${p.Speed} 수명 ${F2(p.Lifetime)} (있어야 할 ${speed}, ${F2(life)}) · 이전 종류의 값`)
      at.stale = clock
    }
    staleShown[p.Id - 1] = stale
    if (bugs.length) {
      lastBug = `✖ ${bugs.join(' · ')}`
      at.bug = clock
    }
  }

  return {
    input(name) {
      at.input = clock
      const shots = n.shotsFired
      const made = n.pool.all.length
      const wasActive = activeFlags()
      const xBefore = n.pool.all.map(p => p.X)
      if (name === 'fast') n.Fire('Fast')
      else if (name === 'slow') n.Fire('Slow')
      else n.StartBurst()
      if (n.shotsFired !== shots) naiveFired(made, wasActive, xBefore)
    },
    tick(dt) {
      const shots = n.shotsFired
      const made = n.pool.all.length
      const wasActive = activeFlags()
      const xBefore = n.pool.all.map(p => p.X)
      const idleBefore = n.pool.idle.length
      n.Update(dt)
      const fired = n.shotsFired !== shots
      if (fired) naiveFired(made, wasActive, xBefore)
      const start = idleBefore - (fired && n.pool.all.length === made ? 1 : 0)
      const idle = n.pool.idle
      let next = start
      for (let i = 0; i < wasActive.length; i++) {
        const p = n.pool.all[i]
        if (!wasActive[i] || p.Active) continue
        if (i < staleShown.length) staleShown[i] = false
        if (p.X >= n.TargetX) {
          events.push(p.X >= n.ScreenRightX ? `${K(p.Kind)} #${p.Id} 명중 · 같은 프레임에 화면 밖도 참` : `${K(p.Kind)} #${p.Id} 명중`)
          at.hit = clock
        } else events.push(`${K(p.Kind)} #${p.Id} ${p.X >= n.ScreenRightX ? '화면 밖' : '수명 끝'}`)
        while (next < idle.length && idle[next] === p) {
          next++
          events.push(`#${p.Id} 반납 · 대기 ${next}`)
          at.ret = clock
        }
        if (lost && lost.id === p.Id) lost = null
      }
      for (let i = 0; i < n.pool.all.length; i++) {
        const p = n.pool.all[i]
        let count = 0
        for (const q of idle) if (q === p) count++
        while (doubled.length <= i) doubled.push(false)
        while (idleCount.length <= i) idleCount.push(0)
        if (count > 1 && !doubled[i]) {
          events.push(`!이중 반납: #${p.Id} 이 대기 줄에 ${count}칸 (명중 처리와 화면 밖 처리가 각자 Release)`)
          lastBug = `✖ #${p.Id} 이중 반납: 명중 처리와 화면 밖 처리가 각자 Release → 대기 줄에 ${count}칸`
          at.bug = clock
          at.dup = clock
        } else if (count > 1 && count > idleCount[i]) {
          events.push(`#${p.Id} 이 대기 줄에 ${count}칸 (같은 탄이 또 이중 반납, 앞서 알린 버그)`)
          lastBug = `#${p.Id} 이 또 이중 반납 → 대기 줄에 ${count}칸 (앞서 알린 버그)`
          at.dup = clock
        }
        doubled[i] = count > 1 || (p.Active && count > 0)
        idleCount[i] = count
      }
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot: () => {
      const all = n.pool.all
      return `made=${all.length} active=${all.filter(p => p.Active).length} idle=${n.pool.idle.length} reuse=${naiveReuse} hits=${n.hits}${all
        .filter(p => p.Active)
        .map(p => ` #${p.Id} x=${F2(p.X)}`)
        .join('')}`
    },
    view(): SimView {
      const all = n.pool.all
      const idle = n.pool.idle
      const activeCount = all.filter(p => p.Active).length
      const counts = new Map<number, number>()
      for (const q of idle) counts.set(q.Id, (counts.get(q.Id) ?? 0) + 1)
      const dupIds = new Set<number>()
      for (const [id, c] of counts) if (c > 1 || all[id - 1].Active) dupIds.add(id)
      const world: WorldItem[] = fieldItems(n.MuzzleX, n.ScreenRightX, clock - at.hit < 0.3)
      const slots: Slot[] = all.map(p => {
        const c = counts.get(p.Id) ?? 0
        const wrong = c > 1 ? `대기 줄에 ${c}칸` : p.Active && c > 0 ? '날면서 대기 줄에도' : null
        return { id: p.Id, inUse: p.Active, kind: p.Speed === 0 ? null : p.Kind, wrong }
      })
      world.push(...shelfItems(slots, [...idle].reverse().map(p => p.Id), dupIds))
      if (lost && clock - lost.t < 1.5) {
        // 날던 중에 같은 객체를 또 빌려 줘서 사라진 한 발: 사라진 자리에 점선 상자를 남긴다.
        // 글은 바닥 띠에 둔다 (탄 줄 바로 아래는 포구에서 다시 나온 그 탄의 종류 라벨이 지나간다)
        world.push({ kind: 'box', x: lost.x - 0.42, y: LANE_Y - 0.3, w: 0.84, h: 0.6, stroke: C.bug, dashed: true })
        world.push({ kind: 'text', x: lost.x - 0.15, y: 0.45, text: `↑ #${lost.id} 이 사라진 자리`, align: 'left', size: 15, color: C.bug })
      }
      for (const p of all) {
        if (!p.Active) continue
        const stale = p.Speed !== n.SpeedOf(p.Kind) || p.Lifetime !== n.LifeOf(p.Kind)
        if (stale) {
          // 있어야 할 자리: 마지막으로 빌린 순간부터 제 종류의 속도로 났다면 지금 있을 곳 (흐린 점선).
          // Age 는 쓰지 않는다: 날던 탄을 또 빌리면 SetActive(true) 가 아무것도 하지 않아 Age 가 0 으로 돌아가지 않는다
          const age = clock - (firedAt[p.Id - 1] ?? clock)
          const ex = n.MuzzleX + n.SpeedOf(p.Kind) * age
          if (age < n.LifeOf(p.Kind) && ex < n.ScreenRightX) world.push({ kind: 'box', x: ex - 0.3, y: LANE_Y - 0.18, w: 0.6, h: 0.36, stroke: kindColor(p.Kind), dashed: true })
          world.push({ kind: 'text', x: p.X, y: LANE_Y + 0.85, text: `속도 ${p.Speed} ≠ ${n.SpeedOf(p.Kind)}`, size: 16, color: C.bug })
        }
        world.push(...bulletItems(p.Id, p.Kind, p.X, stale || dupIds.has(p.Id) ? C.bug : null))
      }
      if (clock - at.hit < 0.3) world.push({ kind: 'ring', x: TARGET_X, y: LANE_Y, r: 0.75 - (clock - at.hit), color: C.slow })
      const sumWrong = activeCount + idle.length !== all.length
      world.push(
        { kind: 'text', x: 0.4, y: 8.3, text: `만든 수 ${all.length} · 쓰는 중 ${activeCount} · 대기 ${idle.length}${sumWrong ? '  (합이 안 맞는다)' : ''}`, align: 'left', size: 26, color: sumWrong || clock - at.bug < 0.8 ? C.bug : C.warn },
        { kind: 'text', x: 0.4, y: 7.6, text: lastBug || `Instantiate 대신 재사용 ${naiveReuse}회 · 명중 ${n.hits}`, align: 'left', size: 20, color: lastBug ? C.bug : C.dim },
      )
      if (n.BurstLeft > 0) world.push({ kind: 'text', x: 2.2, y: LANE_Y + 1.05, text: `연사 ${n.BurstLeft}발 남음`, align: 'left', size: 16, color: C.fast })
      const active = new Set<string>()
      if (clock - at.input < 0.3) for (const id of ['nturret', 'nturret-npool', 'npool', 'nturret-nproj']) active.add(id)
      if (clock - at.stale < 0.6) for (const id of ['nproj', 'nturret-nproj']) active.add(id)
      if (clock - at.dup < 0.6) for (const id of ['nhit', 'nout', 'nhit-npool', 'nout-npool', 'npool']) active.add(id)
      if (clock - at.ret < 0.3) for (const id of ['nproj-nhit', 'nproj-nout']) active.add(id)
      return { world, active: [...active] }
    },
  }
}
