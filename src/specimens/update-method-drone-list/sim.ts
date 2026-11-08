import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/update-method-drone-list 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/update-method-drone-list/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다. */

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

const DroneKind = { Normal: 0, Splitter: 1 } as const
type DroneKind = (typeof DroneKind)[keyof typeof DroneKind]

const DespawnReason = { Destroyed: 0, ReachedBase: 1, Split: 2 } as const
type DespawnReason = (typeof DespawnReason)[keyof typeof DespawnReason]

class Drone {
  Name: string
  Kind: DroneKind
  Lane: number
  X: number
  Hp: number
  Age = 0
  Updates = 0
  IsDead = false
  Reason: DespawnReason = DespawnReason.Destroyed

  constructor(name: string, kind: DroneKind, x: number, hp: number, lane: number) {
    this.Name = name
    this.Kind = kind
    this.X = x
    this.Hp = hp
    this.Lane = lane
  }

  MarkDead(reason: DespawnReason) {
    this.IsDead = true
    this.Reason = reason
  }

  Update(dt: number, swarm: DroneSwarm) {
    this.Updates++
    this.Age = f(this.Age + dt)
    this.X = f(this.X - f(swarm.Settings.MoveSpeed * dt))
    if (this.Hp <= 0 || this.X <= swarm.Settings.BaseX) {
      swarm.Despawn(this, this.Hp <= 0 ? DespawnReason.Destroyed : DespawnReason.ReachedBase)
      return
    }
    if (this.Kind === DroneKind.Splitter && this.Age >= swarm.Settings.SplitDelay) this.Split(swarm)
  }

  Split(swarm: DroneSwarm) {
    for (let k = 0; k < swarm.Settings.SplitCount; k++) {
      const piece = new Drone(this.Name + String.fromCharCode(97 + k), DroneKind.Normal, this.X, swarm.Settings.DroneHp, (this.Lane + k) % swarm.Settings.Lanes)
      swarm.Spawn(piece)
    }
    swarm.Despawn(this, DespawnReason.Split)
  }
}

/* ───────── Core/DroneSwarm.cs ───────── */

interface SwarmSettings {
  MoveSpeed: number
  SplitDelay: number
  SplitCount: number
  StartX: number
  BaseX: number
  DroneHp: number
  SplitterHp: number
  Lanes: number
}

const defaultSettings = (): SwarmSettings => ({ MoveSpeed: f(3), SplitDelay: f(1), SplitCount: 2, StartX: f(14.8), BaseX: f(1.8), DroneHp: 1, SplitterHp: 2, Lanes: 3 })

class DroneSwarm {
  Settings: SwarmSettings
  private drones: Drone[] = []
  private pending: Drone[] = []
  private updating = false
  private launched = 0
  private deadCount = 0
  Spawned = new Event<[Drone]>()
  SpawnQueued = new Event<[Drone]>()
  DespawnRequested = new Event<[Drone]>()
  Despawned = new Event<[Drone]>()
  Damaged = new Event<[number, number]>()
  LastUpdated = 0
  LastMerged = 0
  LastRemoved = 0

  constructor(settings: SwarmSettings) {
    this.Settings = settings
  }

  get Drones(): readonly Drone[] {
    return this.drones
  }
  get IsUpdating() {
    return this.updating
  }

  Launch(kind: DroneKind) {
    this.launched++
    const splitter = kind === DroneKind.Splitter
    const d = new Drone((splitter ? 'S' : 'D') + this.launched, kind, this.Settings.StartX, splitter ? this.Settings.SplitterHp : this.Settings.DroneHp, (this.launched - 1) % this.Settings.Lanes)
    this.Spawn(d)
    return d
  }

  Spawn(d: Drone) {
    if (this.updating) {
      this.pending.push(d)
      this.SpawnQueued.invoke(d)
      return
    }
    this.drones.push(d)
    this.Spawned.invoke(d)
  }

  Despawn(d: Drone, reason: DespawnReason) {
    if (d.IsDead) return
    d.MarkDead(reason)
    this.deadCount++
    this.DespawnRequested.invoke(d)
  }

  DamageAll(amount: number) {
    let hit = 0
    for (const d of this.drones) {
      if (d.IsDead) continue
      d.Hp -= amount
      hit++
    }
    this.Damaged.invoke(hit, amount)
  }

  Tick(dt: number) {
    this.updating = true
    let updated = 0
    for (const d of this.drones) {
      if (d.IsDead) continue
      d.Update(dt, this)
      updated++
    }
    this.LastUpdated = updated
    this.LastRemoved = this.deadCount
    this.LastMerged = this.pending.length
    if (this.deadCount > 0) {
      for (const d of this.drones) if (d.IsDead) this.Despawned.invoke(d)
      this.drones = this.drones.filter(d => !d.IsDead) // List<T>.RemoveAll
      this.deadCount = 0
    }
    this.updating = false
    for (const d of this.pending) {
      this.drones.push(d)
      this.Spawned.invoke(d)
    }
    this.pending = []
  }
}

/* ───────── Naive/NaiveDroneManager.cs ───────── */

class NaiveDrone {
  name = ''
  isSplitter = false
  lane = 0
  x = 0
  hp = 0
  age = 0
  updates = 0

  Update(dt: number, manager: NaiveDroneManager) {
    this.updates++
    this.age = f(this.age + dt)
    this.x = f(this.x - f(manager.moveSpeed * dt))
    if (this.hp <= 0 || this.x <= manager.baseX) {
      Remove(manager.drones, this)
      return
    }
    if (this.isSplitter && this.age >= manager.splitDelay) {
      for (let k = 0; k < manager.splitCount; k++) {
        const piece = Object.assign(new NaiveDrone(), { name: this.name + String.fromCharCode(97 + k), x: this.x, hp: manager.droneHp, lane: (this.lane + k) % 3 })
        manager.drones.push(piece)
      }
      Remove(manager.drones, this)
    }
  }
}

/** List<T>.Remove: 처음 찾은 하나를 빼고 뒤를 한 칸씩 당긴다 */
const Remove = <T>(list: T[], item: T) => {
  const i = list.indexOf(item)
  if (i >= 0) list.splice(i, 1)
}

class NaiveDroneManager {
  drones: NaiveDrone[] = []
  moveSpeed = f(3)
  splitDelay = f(1)
  splitCount = 2
  startX = f(14.8)
  baseX = f(1.8)
  droneHp = 1
  splitterHp = 2
  private launched = 0

  OnSpawn() {
    this.Launch(false)
  }
  OnSplitter() {
    this.Launch(true)
  }

  private Launch(splitter: boolean) {
    this.launched++
    this.drones.push(Object.assign(new NaiveDrone(), { name: (splitter ? 'S' : 'D') + this.launched, isSplitter: splitter, x: this.startX, hp: splitter ? this.splitterHp : this.droneHp, lane: (this.launched - 1) % 3 }))
  }

  OnEmp() {
    for (const d of this.drones) d.hp -= 1
  }

  Update(dt: number) {
    for (let i = 0; i < this.drones.length; i++) this.drones[i].Update(dt, this)
  }
}

/* ───────── truth/update-method-drone-list/Target.cs 와 같은 어댑터 + 무대 그림 ───────── */

const F2 = (v: number) => v.toFixed(2)
const WHY = ['HP 0', '기지 도달', '분열']

/* 무대 배치 (세로 위치는 화면에만 있다: 드론이 겹쳐 보이지 않게 줄을 나눈다) */
const LANE_Y = [1, 3.3, 5.6]
const BASE = { x: 0.2, w: 1.3 }
const RING_COLOR = ['#ffb547', '#8fd3ff', '#c792ea']
const RED = '#ff5d6c'
/** 화면에만: 방금 일어난 일 글을 남기는 시간, 링을 남기는 시간 */
const RECENT_SHOW = 1
const RING_SHOW = 0.35

interface Ring {
  x: number
  lane: number
  at: number
  reason: DespawnReason
}

export const createSim: SimFactory = (values: ParamValues, naive: boolean): PatternSim => {
  const num = (k: string) => f(Number(values[k]))
  const moveSpeed = num('moveSpeed')
  const splitDelay = num('splitDelay')
  const splitCount = Math.round(Number(values.splitCount))
  const events: string[] = []
  let clock = 0
  /** 끝난 Tick 수. 드론마다 '있어야 할 업데이트 횟수' = ticks - 들어온 때 (화면에만) */
  let ticks = 0
  const at = { input: -9, mark: -9, queued: -9, loopEnd: -9, removed: -9, skip: -9 }
  let rings: Ring[] = []
  let recent = ''
  let recentAt = -9

  const ground = (): WorldItem[] => [
    { kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' },
    { kind: 'box', x: BASE.x, y: 1, w: BASE.w, h: 5.7, fill: '#1b2a40', stroke: '#4a5872', label: '기지' },
  ]
  const ringItems = (): WorldItem[] =>
    rings.filter(r => clock - r.at < RING_SHOW).map(r => ({ kind: 'ring', x: r.x, y: LANE_Y[r.lane] + 0.45, r: 0.6, color: RING_COLOR[r.reason] }))
  /** HP 0 인데 아직 목록에 있는 드론은 흐리게 (나쁜 예에서 건너뛰어 한 프레임 더 남을 때) */
  const droneItem = (name: string, splitter: boolean, x: number, lane: number, updates: number, hp: number): WorldItem => ({
    kind: 'actor',
    x,
    y: LANE_Y[lane],
    role: 'enemy',
    facing: -1,
    scale: splitter ? 0.95 : 0.7,
    alpha: hp <= 0 ? 0.4 : 1,
    label: hp <= 0 ? `${name} · HP 0 · u ${updates}` : `${name} · u ${updates}`,
  })

  if (!naive) {
    const swarm = new DroneSwarm({ ...defaultSettings(), MoveSpeed: moveSpeed, SplitDelay: splitDelay, SplitCount: splitCount })
    let ticking = false
    let removed: string[] = []
    let merged: string[] = []
    swarm.Spawned.add(d => {
      if (ticking) merged.push(d.Name)
      else events.push(`${d.Name} 출발 · 목록 ${swarm.Drones.length}`)
    })
    swarm.SpawnQueued.add(d => {
      events.push(`${d.Name} 대기 목록에 (분열)`)
      at.queued = clock
    })
    swarm.DespawnRequested.add(d => {
      events.push(`${d.Name} ${WHY[d.Reason]} → 지울 표시`)
      at.mark = clock
      rings.push({ x: d.X, lane: d.Lane, at: clock, reason: d.Reason })
    })
    swarm.Despawned.add(d => removed.push(d.Name))
    swarm.Damaged.add((n, dmg) => events.push(`EMP: 드론 ${n}대 HP -${dmg}`))

    return {
      input(name) {
        at.input = clock
        if (name === 'spawn') swarm.Launch(DroneKind.Normal)
        else if (name === 'splitter') swarm.Launch(DroneKind.Splitter)
        else swarm.DamageAll(1)
      },
      tick(dt) {
        ticking = true
        swarm.Tick(dt)
        ticking = false
        const parts: string[] = []
        if (removed.length > 0) {
          events.push(`지움 ${removed.join(', ')} (루프가 끝난 뒤 RemoveAll)`)
          parts.push(`지움 ${removed.join(', ')}`)
          at.removed = clock
        }
        if (merged.length > 0) {
          events.push(`합침 ${merged.join(', ')} → 목록 ${swarm.Drones.length} (다음 프레임부터 Update)`)
          parts.push(`합침 ${merged.join(', ')}`)
        }
        if (parts.length > 0) {
          recent = `방금 루프가 끝난 뒤: ${parts.join(' · ')}`
          recentAt = clock
          at.loopEnd = clock
        }
        removed = []
        merged = []
        ticks++
        clock += dt
        rings = rings.filter(r => clock - r.at < RING_SHOW)
      },
      drain: () => events.splice(0),
      snapshot() {
        let s = `list=${swarm.Drones.length} updated=${swarm.LastUpdated}`
        for (const d of swarm.Drones) s += ` ${d.Name} x=${F2(d.X)} u=${d.Updates}`
        return s
      },
      view(): SimView {
        const world = ground()
        for (const d of swarm.Drones) world.push(droneItem(d.Name, d.Kind === DroneKind.Splitter, d.X, d.Lane, d.Updates, d.Hp))
        world.push(...ringItems())
        world.push(
          { kind: 'text', x: 0.4, y: 8.3, text: `목록 ${swarm.Drones.length} · 이번 프레임 업데이트 ${swarm.LastUpdated} · 대기 ${swarm.LastMerged} · 지울 것 ${swarm.LastRemoved}`, align: 'left', size: 24, color: '#7ee081' },
          {
            kind: 'text',
            x: 0.4,
            y: 7.6,
            text: clock - recentAt < RECENT_SHOW ? recent : '도는 중에는 표시만 하고 대기 목록에 둔다. 목록은 루프가 끝난 뒤에 바뀐다',
            align: 'left',
            size: 19,
            color: '#8796ae',
          },
        )
        const active: string[] = []
        if (clock - at.input < 0.3) active.push('runner', 'swarm')
        if (clock - at.mark < 0.3) active.push('swarm-drone', 'drone', 'drone-dead', 'dead')
        if (clock - at.queued < 0.3) active.push('swarm-drone', 'drone', 'drone-pending', 'pending')
        if (clock - at.loopEnd < 0.3) active.push('swarm')
        if (clock - at.removed < 0.3) active.push('swarm-dead')
        if (clock - at.queued < 0.3) active.push('swarm-pending')
        return { world, active }
      },
    }
  }

  const n = new NaiveDroneManager()
  n.moveSpeed = moveSpeed
  n.splitDelay = splitDelay
  n.splitCount = splitCount
  let naiveUpdated = 0
  const skipped = new Map<NaiveDrone, number>()
  let skippedTotal = 0
  let bornMovedTotal = 0
  /** 화면에만: 태어난 프레임에 움직임 ✖ 를 쓴 드론 (사건 기록과 같은 판정) */
  const bornMoved = new Set<NaiveDrone>()
  /** 화면에만: 드론이 목록에 들어온 Tick 번호 (입력이면 이번 Tick, Tick 안에서 Add 면 다음 Tick) */
  const enteredAt = new Map<NaiveDrone, number>()

  const children = (parent: NaiveDrone, before: NaiveDrone[]) =>
    n.drones.filter(d => !before.includes(d) && d.name.length === parent.name.length + 1 && d.name.startsWith(parent.name)).map(d => d.name)

  return {
    input(name) {
      at.input = clock
      if (name === 'emp') {
        n.OnEmp()
        events.push(`EMP: 드론 ${n.drones.length}대 HP -1`)
        return
      }
      if (name === 'spawn') n.OnSpawn()
      else n.OnSplitter()
      const d = n.drones[n.drones.length - 1]
      enteredAt.set(d, ticks)
      events.push(`${d.name} 출발 · 목록 ${n.drones.length}`)
    },
    tick(dt) {
      const before = [...n.drones]
      const updates0 = before.map(d => d.updates)
      n.Update(dt)
      const after = n.drones

      naiveUpdated = 0
      for (let i = 0; i < before.length; i++) naiveUpdated += before[i].updates - updates0[i]
      for (const d of after) if (!before.includes(d)) naiveUpdated += d.updates

      const parts: string[] = []
      for (const d of before) {
        if (after.includes(d)) continue
        const reason = d.hp <= 0 ? DespawnReason.Destroyed : d.x <= n.baseX ? DespawnReason.ReachedBase : DespawnReason.Split
        if (reason === DespawnReason.Destroyed) events.push(`${d.name} HP 0 → 바로 Remove`)
        else if (reason === DespawnReason.ReachedBase) events.push(`${d.name} 기지 도달 → 바로 Remove`)
        else events.push(`${d.name} 분열 → ${children(d, before).join(', ')} 바로 Add, ${d.name} 바로 Remove`)
        rings.push({ x: d.x, lane: d.lane, at: clock, reason })
        parts.push(`${d.name} Remove`)
        at.removed = clock
      }
      for (let i = 0; i < before.length; i++) {
        const d = before[i]
        if (!after.includes(d) || d.updates !== updates0[i]) continue
        const prev = i > 0 ? before[i - 1].name : '?'
        at.skip = clock
        if (d.hp <= 0) {
          events.push(`${d.name} 도 건너뜀 · HP 0 인데 목록에 남아 다음 프레임에 빠진다`)
          continue
        }
        skippedTotal++
        const k = skipped.get(d)
        if (k !== undefined) {
          skipped.set(d, k + 1)
          events.push(`${d.name} 또 건너뜀 · 모두 ${k + 1}번 (바로 앞 칸 ${prev} Remove)`)
          continue
        }
        skipped.set(d, 1)
        events.push(`!업데이트 건너뜀: ${d.name} 이번 프레임에 안 움직임 (바로 앞 칸 ${prev} Remove 로 당겨짐) · u ${d.updates}`)
      }
      for (const d of after) {
        if (before.includes(d)) continue
        enteredAt.set(d, ticks + 1)
        if (d.updates === 0) continue
        bornMovedTotal++
        bornMoved.add(d)
        events.push(`!태어난 프레임에 움직임: ${d.name} Add 된 프레임에 바로 Update 됨 · u ${d.updates}`)
      }
      if (parts.length > 0) {
        recent = `방금 도는 중에: ${parts.join(' · ')}`
        recentAt = clock
      }
      ticks++
      clock += dt
      rings = rings.filter(r => clock - r.at < RING_SHOW)
    },
    drain: () => events.splice(0),
    snapshot() {
      let s = `list=${n.drones.length} updated=${naiveUpdated} skipped=${skippedTotal} born=${bornMovedTotal}`
      for (const d of n.drones) s += ` ${d.name} x=${F2(d.x)} u=${d.updates}`
      return s
    },
    view(): SimView {
      const world = ground()
      const marks: WorldItem[] = []
      for (const d of n.drones) {
        world.push(droneItem(d.name, d.isSplitter, d.x, d.lane, d.updates, d.hp))
        const skips = skipped.get(d)
        const born = bornMoved.has(d)
        if (skips === undefined && !born) continue
        // 사건 기록의 ✖ 와 같은 판정의 드론만: 프레임마다 한 번씩 Update 됐다면 있을 자리와 횟수
        const expected = ticks - (enteredAt.get(d) ?? ticks)
        const ex = d.x - (expected - d.updates) * moveSpeed * (1 / 60)
        marks.push({ kind: 'box', x: ex - 0.4, y: LANE_Y[d.lane] - 0.05, w: 0.8, h: 1.15, stroke: RED, dashed: true })
        const what = [skips !== undefined ? `건너뜀 ${skips}` : '', born ? '태어남' : ''].filter(Boolean).join('+')
        // 기지 쪽 끝에서 글이 왼쪽 밖으로 잘리지 않게 가운데를 묶는다
        marks.push({ kind: 'text', x: Math.max(d.x, 2.4), y: LANE_Y[d.lane] - 0.4, text: `${what} · 있어야 ${expected}`, size: 14, color: RED })
      }
      world.push(...marks, ...ringItems())
      const bad = skippedTotal + bornMovedTotal > 0
      world.push(
        { kind: 'text', x: 0.4, y: 8.3, text: `목록 ${n.drones.length} · 이번 프레임 업데이트 ${naiveUpdated} · 대기 없음 (바로 Remove · Add)`, align: 'left', size: 24, color: '#ffb547' },
        {
          kind: 'text',
          x: 0.4,
          y: 7.6,
          text: clock - recentAt < RECENT_SHOW ? recent : `건너뜀 ${skippedTotal}번 · 태어난 프레임에 움직임 ${bornMovedTotal}대 · 점선과 "있어야" = 프레임마다 한 번씩 돌았다면의 자리와 u`,
          align: 'left',
          size: 19,
          color: bad ? RED : '#8796ae',
        },
      )
      const active: string[] = []
      if (clock - at.input < 0.3) active.push('nmgr')
      if (clock - at.removed < 0.3) active.push('nmgr-ndrone', 'ndrone', 'ndrone-nlist', 'nlist')
      if (clock - at.skip < 0.3) active.push('nmgr-nidx', 'nidx', 'nidx-nlist')
      return { world, active }
    },
  }
}
