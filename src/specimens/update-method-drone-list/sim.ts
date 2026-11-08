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
  private dying: Drone[] = []
  private updating = false
  private launched = 0
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

    let removed = 0
    while (true) {
      this.dying = []
      for (const d of this.drones) if (d.IsDead) this.dying.push(d)
      if (this.dying.length === 0) break
      for (const d of this.dying) this.Despawned.invoke(d)
      const dying = this.dying
      this.drones = this.drones.filter(d => !dying.includes(d)) // List<T>.RemoveAll(dying.Contains)
      removed += dying.length
    }
    this.dying = []
    this.LastRemoved = removed

    this.updating = false
    let merged = 0
    for (const d of this.pending) {
      if (d.IsDead) continue
      this.drones.push(d)
      merged++
      this.Spawned.invoke(d)
    }
    this.pending = []
    this.LastMerged = merged
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
/** 화면에만: 루프 끝 한 프레임의 합침·지움 수를 남기는 시간 */
const HOLD = 0.4
const DRONE_SCALE = 0.7
const SPLITTER_SCALE = 0.95

interface Ring {
  x: number
  lane: number
  at: number
  reason: DespawnReason
}

/** 화면에 그릴 드론 하나 (패턴과 나쁜 예 공통). red 는 ✖ 가 붙은 드론의 빨간 글 */
interface Shown {
  name: string
  splitter: boolean
  x: number
  lane: number
  updates: number
  hp: number
  red?: string
}

/** 무대 글 폭 어림 (월드 단위, 1단위 ≈ 55px). 한글은 글자 크기만큼, 그 밖은 0.56배 */
const textWidth = (s: string, size: number) => {
  let px = 0
  for (const ch of s) px += (ch.codePointAt(0) ?? 0) > 0x2e80 ? size : size * 0.56
  return px / 55
}

/** 드론 글 하나의 자리. 드론 가운데(x)에 맞추거나, 이웃과 겹치면 드론 쪽 끝에 붙여 서로 반대로 비킨다 */
interface Label {
  x: number
  w: number
  align: 'left' | 'center' | 'right'
  row: number
}
const LABEL_GAP = 0.12
/** 글 끝을 드론 가운데에서 이만큼 넘겨 붙인다 (비킨 글도 자기 드론 위에 걸친다) */
const LABEL_HANG = 0.3
const span = (l: Label): [number, number] =>
  l.align === 'center' ? [l.x - l.w / 2, l.x + l.w / 2] : l.align === 'left' ? [l.x - LABEL_HANG, l.x - LABEL_HANG + l.w] : [l.x + LABEL_HANG - l.w, l.x + LABEL_HANG]
/** text 그림의 x (align 에 맞춘 기준점) */
const anchorX = (l: Label) => (l.align === 'center' ? l.x : l.align === 'left' ? l.x - LABEL_HANG : l.x + LABEL_HANG)
const clear = (a: Label, b: Label | undefined) => !b || span(b)[1] + LABEL_GAP <= span(a)[0]

/** 같은 줄의 글을 x 순서로 놓는다. 앞 글과 겹치면 (1) 이 글을 오른쪽으로 (2) 앞 글도 왼쪽으로 비켜 보고, 그래도 겹치면 한 칸 비킨 줄에 놓는다.
 *  글은 world 가로 [minLeft, 16 - minLeft] 안에 둔다 (양쪽 끝에서 잘리지 않게) */
const placeLabels = (xs: number[], ws: number[], minLeft: number): Label[] => {
  const maxRight = 16 - minLeft
  const fits = (l: Label) => span(l)[0] >= minLeft - 1e-6 && span(l)[1] <= maxRight + 1e-6
  const rows: Label[][] = []
  return xs.map((x0, i) => {
    const w = ws[i]
    const x = Math.min(Math.max(x0, minLeft + w / 2), maxRight - w / 2)
    for (let row = 0; ; row++) {
      const placed = (rows[row] ??= [])
      const prev = placed[placed.length - 1]
      const before = placed[placed.length - 2]
      const center: Label = { x, w, align: 'center', row }
      const left: Label = { x, w, align: 'left', row }
      let ok: Label | undefined = clear(center, prev) ? center : fits(left) && clear(left, prev) ? left : undefined
      if (!ok && prev && prev.align === 'center' && fits(left)) {
        prev.align = 'right'
        if (fits(prev) && clear(prev, before) && clear(left, prev)) ok = left
        else prev.align = 'center'
      }
      if (ok) {
        placed.push(ok)
        return ok
      }
    }
  })
}

export const createSim: SimFactory = (values: ParamValues, naive: boolean): PatternSim => {
  const num = (k: string) => f(Number(values[k]))
  const moveSpeed = num('moveSpeed')
  const splitDelay = num('splitDelay')
  const splitCount = Math.round(Number(values.splitCount))
  const events: string[] = []
  let clock = 0
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
  /** HP 0 인데 아직 목록에 있는 드론은 흐리게 (나쁜 예에서 건너뛰어 한 프레임 더 남을 때). 이름 글은 dronesItems 가 따로 놓는다 */
  const droneItem = (d: Shown): WorldItem => ({
    kind: 'actor',
    x: d.x,
    y: LANE_Y[d.lane],
    role: 'enemy',
    facing: -1,
    scale: d.splitter ? SPLITTER_SCALE : DRONE_SCALE,
    alpha: d.hp <= 0 ? 0.4 : 1,
  })
  /** 드론과 글. 같은 줄에서 가까운 드론(분열 조각이 이웃 옆에 붙을 때, 기지 앞에 몰릴 때)의 글은 겹치지 않게 한 칸씩 비켜 놓는다.
   *  이름 글은 위로, 빨간 글은 아래로 비킨다 */
  const droneItems = (shown: Shown[]): WorldItem[] => {
    const out: WorldItem[] = shown.map(droneItem)
    const texts: WorldItem[] = []
    for (let lane = 0; lane < LANE_Y.length; lane++) {
      const row = shown.filter(d => d.lane === lane).sort((a, b) => a.x - b.x)
      const names = row.map(d => (d.hp <= 0 ? `${d.name} · HP 0 · u ${d.updates}` : `${d.name} · u ${d.updates}`))
      const nameAt = placeLabels(
        row.map(d => d.x),
        names.map(s => textWidth(s, 20)),
        0.1,
      )
      row.forEach((d, i) => {
        const top = LANE_Y[lane] + 1.4 * (d.splitter ? SPLITTER_SCALE : DRONE_SCALE) + 0.22
        const lab = nameAt[i]
        texts.push({ kind: 'text', x: anchorX(lab), y: top + lab.row * 0.36, text: names[i], size: 20, align: lab.align, color: d.hp <= 0 ? '#8796ae' : '#e6edf7' })
      })
      const reds = row.filter(d => d.red)
      // 기지 쪽 끝에서 글이 왼쪽 밖으로 잘리지 않게 왼쪽 끝을 묶는다
      const redAt = placeLabels(
        reds.map(d => d.x),
        reds.map(d => textWidth(d.red ?? '', 15)),
        0.15,
      )
      reds.forEach((d, i) => {
        const lab = redAt[i]
        texts.push({ kind: 'text', x: anchorX(lab), y: LANE_Y[lane] - 0.4 - lab.row * 0.32, text: d.red ?? '', size: 15, align: lab.align, color: RED })
      })
    }
    return [...out, ...ringItems(), ...texts]
  }
  /** 화면에만: 마지막으로 0 이 아니었던 합침·지움 수. 루프 끝 한 프레임에만 0 이 아니라 HOLD 초 남겨 보인다 */
  let held = { merged: 0, removed: 0, at: -9 }

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
        if (swarm.LastMerged + swarm.LastRemoved > 0) held = { merged: swarm.LastMerged, removed: swarm.LastRemoved, at: clock }
        removed = []
        merged = []
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
        world.push(...droneItems(swarm.Drones.map(d => ({ name: d.Name, splitter: d.Kind === DroneKind.Splitter, x: d.X, lane: d.Lane, updates: d.Updates, hp: d.Hp }))))
        const hold = clock - held.at < HOLD
        world.push(
          { kind: 'text', x: 0.4, y: 8.3, text: `목록 ${swarm.Drones.length} · 이번 프레임 업데이트 ${swarm.LastUpdated} · 합침 ${hold ? held.merged : 0} · 지움 ${hold ? held.removed : 0}`, align: 'left', size: 24, color: '#7ee081' },
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
  /** 화면에만: 같은 입력을 받는 패턴 코어. 같은 이름 드론의 업데이트 횟수가 나쁜 예 드론이 '있어야' 할 횟수다
   *  (늦게 나뉜 부모의 조각이 물려받은 뒤처짐까지 나온다). 사건 기록과 ✖ 판정에는 쓰지 않는다 */
  const ref = new DroneSwarm({ ...defaultSettings(), MoveSpeed: moveSpeed, SplitDelay: splitDelay, SplitCount: splitCount })

  const children = (parent: NaiveDrone, before: NaiveDrone[]) =>
    n.drones.filter(d => !before.includes(d) && d.name.length === parent.name.length + 1 && d.name.startsWith(parent.name)).map(d => d.name)

  return {
    input(name) {
      at.input = clock
      if (name === 'spawn') ref.Launch(DroneKind.Normal)
      else if (name === 'splitter') ref.Launch(DroneKind.Splitter)
      else ref.DamageAll(1)
      if (name === 'emp') {
        n.OnEmp()
        events.push(`EMP: 드론 ${n.drones.length}대 HP -1`)
        return
      }
      if (name === 'spawn') n.OnSpawn()
      else n.OnSplitter()
      events.push(`${n.drones[n.drones.length - 1].name} 출발 · 목록 ${n.drones.length}`)
    },
    tick(dt) {
      ref.Tick(dt)
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
        if (before.includes(d) || d.updates === 0) continue
        bornMovedTotal++
        bornMoved.add(d)
        events.push(`!태어난 프레임에 움직임: ${d.name} Add 된 프레임에 바로 Update 됨 · u ${d.updates}`)
      }
      if (parts.length > 0) {
        recent = `방금 도는 중에: ${parts.join(' · ')}`
        recentAt = clock
      }
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
      const shown: Shown[] = n.drones.map(d => {
        const s: Shown = { name: d.name, splitter: d.isSplitter, x: d.x, lane: d.lane, updates: d.updates, hp: d.hp }
        const skips = skipped.get(d)
        const born = bornMoved.has(d)
        if (skips === undefined && !born) return s
        // 사건 기록의 ✖ 와 같은 판정의 드론만: 버그와, 같은 입력을 받은 패턴 코어의 같은 드론이 받은 업데이트 횟수
        const what = [skips !== undefined ? `건너뜀 ${skips}` : '', born ? '태어남' : ''].filter(Boolean).join('+')
        const twin = ref.Drones.find(r => r.Name === d.name)
        s.red = `${what} · ${twin ? `있어야 u ${twin.Updates}` : '패턴은 이미 빠짐'}`
        return s
      })
      world.push(...droneItems(shown))
      const bad = skippedTotal + bornMovedTotal > 0
      world.push(
        { kind: 'text', x: 0.4, y: 8.3, text: `목록 ${n.drones.length} · 이번 프레임 업데이트 ${naiveUpdated} · 대기 없음 (바로 Remove · Add)`, align: 'left', size: 24, color: '#ffb547' },
        {
          kind: 'text',
          x: 0.4,
          y: 7.6,
          text: clock - recentAt < RECENT_SHOW ? recent : `건너뜀 ${skippedTotal}번 · 태어나며 움직임 ${bornMovedTotal}대 · "있어야 u" = 같은 입력의 패턴`,
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
