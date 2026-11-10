import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/spatial-grid-detection 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/spatial-grid-detection/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다. */

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

/* ───────── Core/SpatialGrid.cs ───────── */

interface Cell {
  X: number
  Y: number
}
const cellKey = (c: Cell) => `${c.X},${c.Y}`
const sameCell = (a: Cell, b: Cell) => a.X === b.X && a.Y === b.Y
const cellText = (c: Cell) => `(${c.X},${c.Y})`

class SpatialGrid {
  private cells = new Map<string, Drone[]>()
  CellSize = 0
  Count = 0

  constructor(cellSize: number) {
    this.Reset(cellSize)
  }

  Reset(cellSize: number) {
    if (cellSize <= 0) throw new Error('칸 크기는 0 보다 커야 한다')
    this.CellSize = cellSize
    this.cells.clear()
    this.Count = 0
  }

  CellOf(x: number, y: number): Cell {
    return { X: Math.floor(f(x / this.CellSize)), Y: Math.floor(f(y / this.CellSize)) }
  }

  Add(d: Drone) {
    d.Cell = this.CellOf(d.X, d.Y)
    this.ListAt(d.Cell).push(d)
    this.Count++
  }

  Remove(d: Drone) {
    const list = this.cells.get(cellKey(d.Cell))
    const i = list ? list.indexOf(d) : -1
    if (!list || i < 0) return false
    list.splice(i, 1)
    this.Count--
    return true
  }

  Move(d: Drone, oldCell: Cell, newCell: Cell) {
    if (sameCell(oldCell, newCell)) return
    const list = this.cells.get(cellKey(oldCell))
    const i = list ? list.indexOf(d) : -1
    if (!list || i < 0) return
    list.splice(i, 1)
    this.ListAt(newCell).push(d)
    d.Cell = newCell
  }

  Query(x: number, y: number, radius: number, found: Drone[], visited: Cell[] | null = null) {
    const min = this.CellOf(f(x - radius), f(y - radius))
    const max = this.CellOf(f(x + radius), f(y + radius))
    const r2 = f(radius * radius)
    let checks = 0
    for (let cy = min.Y; cy <= max.Y; cy++) {
      for (let cx = min.X; cx <= max.X; cx++) {
        if (!this.Touches(cx, cy, x, y, r2)) continue
        const cell = { X: cx, Y: cy }
        visited?.push(cell)
        const list = this.cells.get(cellKey(cell))
        if (!list) continue
        for (const d of list) {
          checks++
          if (d.DistanceSq(x, y) <= r2) found.push(d)
        }
      }
    }
    return checks
  }

  private Touches(cx: number, cy: number, x: number, y: number, r2: number) {
    const left = f(cx * this.CellSize)
    const bottom = f(cy * this.CellSize)
    const nx = Math.max(left, Math.min(x, f(left + this.CellSize)))
    const ny = Math.max(bottom, Math.min(y, f(bottom + this.CellSize)))
    const dx = f(x - nx)
    const dy = f(y - ny)
    return f(f(dx * dx) + f(dy * dy)) <= r2
  }

  private ListAt(cell: Cell) {
    const k = cellKey(cell)
    let list = this.cells.get(k)
    if (!list) {
      list = []
      this.cells.set(k, list)
    }
    return list
  }
}

/* ───────── Core/Drone.cs ───────── */

class Drone {
  Name: string
  X: number
  Y: number
  DirX: number
  DirY: number
  Cell: Cell = { X: 0, Y: 0 }
  Removed = false

  constructor(name: string, x: number, y: number, dirX: number, dirY: number) {
    this.Name = name
    this.X = x
    this.Y = y
    this.DirX = dirX
    this.DirY = dirY
  }

  DistanceSq(x: number, y: number) {
    const dx = f(this.X - x)
    const dy = f(this.Y - y)
    return f(f(dx * dx) + f(dy * dy))
  }

  Step(step: number, width: number, height: number) {
    this.X = f(this.X + f(this.DirX * step))
    this.Y = f(this.Y + f(this.DirY * step))
    if (this.X < 0) {
      this.X = -this.X
      this.DirX = -this.DirX
    } else if (this.X > width) {
      this.X = f(f(2 * width) - this.X)
      this.DirX = -this.DirX
    }
    if (this.Y < 0) {
      this.Y = -this.Y
      this.DirY = -this.DirY
    } else if (this.Y > height) {
      this.Y = f(f(2 * height) - this.Y)
      this.DirY = -this.DirY
    }
  }
}

/* ───────── Core/Field.cs ───────── */

interface FieldSettings {
  CellSize: number
  DroneSpeed: number
  Width: number
  Height: number
  TurretX: number
  TurretY: number
  WaveSize: number
}

const defaultSettings = (): FieldSettings => ({ CellSize: f(2), DroneSpeed: f(1.5), Width: f(16), Height: f(9), TurretX: f(8), TurretY: f(4.5), WaveSize: 3 })

const Spots: number[][] = [
  [8.6, 4.4, 1, 0],
  [9.6, 7.6, 0, -1],
  [14.5, 2, -0.6, 0.8],
  [7.6, 5.2, -1, 0],
  [1.2, 6.2, 0.8, -0.6],
  [14.8, 7, -0.6, -0.8],
  [3, 2.6, 1, 0],
  [12, 1, 0, 1],
  [5, 7, 0.6, -0.8],
  [15, 4, -1, 0],
  [0.8, 3.5, 0.6, 0.8],
  [11, 6.8, -0.8, -0.6],
].map(s => s.map(v => f(v)))

class Field {
  Settings: FieldSettings
  Grid: SpatialGrid
  private drones: Drone[] = []
  private moving: Drone[] = []
  private launched = 0
  private nextSpot = 0
  Added = new Event<[Drone]>()
  Removed = new Event<[Drone]>()
  CellChanged = new Event<[Drone, Cell, Cell]>()

  constructor(settings: FieldSettings) {
    this.Settings = settings
    this.Grid = new SpatialGrid(settings.CellSize)
  }

  get Drones(): readonly Drone[] {
    return this.drones
  }

  AddWave() {
    for (let k = 0; k < this.Settings.WaveSize; k++) {
      const s = Spots[this.nextSpot]
      this.nextSpot = (this.nextSpot + 1) % Spots.length
      this.launched++
      this.Add(new Drone('D' + this.launched, s[0], s[1], s[2], s[3]))
    }
  }

  Add(d: Drone) {
    d.Removed = false
    this.drones.push(d)
    this.Grid.Add(d)
    this.Added.invoke(d)
  }

  Remove(d: Drone) {
    const i = this.drones.indexOf(d)
    if (i < 0) return false
    this.drones.splice(i, 1)
    this.Grid.Remove(d)
    d.Removed = true
    this.Removed.invoke(d)
    return true
  }

  SetCellSize(cellSize: number) {
    this.Settings.CellSize = cellSize
    this.Grid.Reset(cellSize)
    for (const d of this.drones) this.Grid.Add(d)
  }

  Tick(dt: number) {
    const step = f(this.Settings.DroneSpeed * dt)
    this.moving = [...this.drones]
    for (const d of this.moving) {
      if (d.Removed) continue
      d.Step(step, this.Settings.Width, this.Settings.Height)
      const now = this.Grid.CellOf(d.X, d.Y)
      if (sameCell(now, d.Cell)) continue
      const old = d.Cell
      this.Grid.Move(d, old, now)
      this.CellChanged.invoke(d, old, now)
    }
  }
}

/* ───────── Core/Turret.cs ───────── */

class ScanResult {
  Found: Drone[] = []
  Visited: Cell[] = []
  Checks = 0
  FullChecks = 0
}

class Turret {
  private grid: SpatialGrid
  X: number
  Y: number
  Radius: number
  ScanInterval = f(0.5)
  private timer = 0
  AutoScan = false
  Last: ScanResult | null = null
  Scanned = new Event<[ScanResult]>()
  AutoScanChanged = new Event<[boolean]>()

  constructor(grid: SpatialGrid, x: number, y: number, radius: number) {
    this.grid = grid
    this.X = x
    this.Y = y
    this.Radius = radius
  }

  Scan() {
    const result = new ScanResult()
    result.Checks = this.grid.Query(this.X, this.Y, this.Radius, result.Found, result.Visited)
    result.FullChecks = this.grid.Count
    this.Last = result
    this.Scanned.invoke(result)
    return result
  }

  SetAutoScan(on: boolean) {
    if (this.AutoScan === on) return
    this.AutoScan = on
    this.timer = 0
    this.AutoScanChanged.invoke(on)
  }

  Tick(dt: number) {
    if (!this.AutoScan) return
    this.timer = f(this.timer + dt)
    if (this.timer < this.ScanInterval) return
    this.timer = f(this.timer - this.ScanInterval)
    this.Scan()
  }
}

/* ───────── Naive/NaiveTurret.cs ───────── */

interface NaiveDrone {
  name: string
  x: number
  y: number
  dirX: number
  dirY: number
}

type Pair = [number, number]
const pairKey = (c: Pair) => `${c[0]},${c[1]}`
const samePair = (a: Pair, b: Pair) => a[0] === b[0] && a[1] === b[1]
const pairText = (c: Pair) => `(${c[0]},${c[1]})`

class NaiveTurret {
  cells = new Map<string, NaiveDrone[]>()
  drones: NaiveDrone[] = []
  cellSize = f(2)
  scanRadius = f(2.5)
  droneSpeed = f(1.5)
  width = f(16)
  height = f(9)
  turretX = f(8)
  turretY = f(4.5)
  scanInterval = f(0.5)
  autoScan = false
  private timer = 0
  private launched = 0
  private nextSpot = 0
  found: NaiveDrone[] = []
  checks = 0
  scans = 0

  CellOf(x: number, y: number): Pair {
    return [Math.floor(f(x / this.cellSize)), Math.floor(f(y / this.cellSize))]
  }

  OnWave() {
    for (let k = 0; k < 3; k++) {
      const s = Spots[this.nextSpot]
      this.nextSpot = (this.nextSpot + 1) % Spots.length
      this.launched++
      const d: NaiveDrone = { name: 'D' + this.launched, x: s[0], y: s[1], dirX: s[2], dirY: s[3] }
      this.drones.push(d)
      const k2 = pairKey(this.CellOf(d.x, d.y))
      let list = this.cells.get(k2)
      if (!list) this.cells.set(k2, (list = []))
      list.push(d)
    }
  }

  OnScan() {
    this.Scan()
  }

  OnAutoScan() {
    this.autoScan = !this.autoScan
    this.timer = 0
  }

  Update(dt: number) {
    const step = f(this.droneSpeed * dt)
    for (const d of this.drones) {
      d.x = f(d.x + f(d.dirX * step))
      d.y = f(d.y + f(d.dirY * step))
      if (d.x < 0) {
        d.x = -d.x
        d.dirX = -d.dirX
      } else if (d.x > this.width) {
        d.x = f(f(2 * this.width) - d.x)
        d.dirX = -d.dirX
      }
      if (d.y < 0) {
        d.y = -d.y
        d.dirY = -d.dirY
      } else if (d.y > this.height) {
        d.y = f(f(2 * this.height) - d.y)
        d.dirY = -d.dirY
      }
      // [!] 칸이 바뀌어도 cells 를 고치지 않는다
    }
    if (!this.autoScan) return
    this.timer = f(this.timer + dt)
    if (this.timer < this.scanInterval) return
    this.timer = f(this.timer - this.scanInterval)
    this.Scan()
  }

  private Scan() {
    this.scans++
    this.found = []
    this.checks = 0
    const list = this.cells.get(pairKey(this.CellOf(this.turretX, this.turretY))) // [!] 포탑이 있는 칸만 본다
    if (!list) return
    for (const d of list) {
      this.checks++
      const dx = f(d.x - this.turretX)
      const dy = f(d.y - this.turretY)
      if (f(f(dx * dx) + f(dy * dy)) <= f(this.scanRadius * this.scanRadius)) this.found.push(d)
    }
  }
}

/* ───────── truth/spatial-grid-detection/Target.cs 와 같은 어댑터 + 무대 그림 ───────── */

const F2 = (v: number) => v.toFixed(2)
const names = (list: { name?: string; Name?: string }[]) => (list.length === 0 ? '없음' : list.map(d => d.Name ?? d.name).join(', '))

const RED = '#ff5d6c'
const GREEN = '#7ee081'
const ORANGE = '#ffb547'
const CYAN = '#5cc8ff'
const DIM = '#8796ae'
/** 화면에만: 드론 그림 크기 */
const DRONE_SCALE = 0.42
/** 화면에만: 입력·칸 이동 뒤 구조 그림을 빛내는 시간 */
const GLOW = 0.3

type Kind = '탐지 누락' | '경계 누락'

/** 화면에 그릴 드론 하나 (패턴과 나쁜 예 공통) */
interface Shown {
  name: string
  x: number
  y: number
  found: boolean
  /** 마지막 탐지에서 반경 안인데 못 찾았다 (사건 기록의 ✖ 와 같은 판정) */
  bug?: Kind
  /** 나쁜 예: 등록된 칸이 실제 칸과 다르면 그 칸 */
  reg?: Pair
}

/** 화면에만: 마지막 탐지 순간의 자리 표시. 드론이 움직여도 다음 탐지까지 그 자리에 남는다 */
interface Mark {
  name: string
  x: number
  y: number
  bug?: Kind
  /** 이번 탐지에서 ✖ 를 새로 쓴 드론 (앞 탐지부터 계속 놓친 드론은 빨간 링만) */
  fresh?: boolean
}

export const createSim: SimFactory = (values: ParamValues, naive: boolean): PatternSim => {
  const num = (k: string) => f(Number(values[k]))
  const cellSize = num('cellSize')
  const scanRadius = num('scanRadius')
  const droneSpeed = num('droneSpeed')
  const events: string[] = []
  let clock = 0
  const at = { wave: -9, move: -9, scan: -9 }
  let marks: Mark[] = []

  // 코어 (나쁜 예 모드에서는 그림자: 같은 입력을 받아 '찾았어야 할 드론' 을 알려 준다. 사건은 적지 않는다)
  const field = new Field({ ...defaultSettings(), CellSize: cellSize, DroneSpeed: droneSpeed })
  const turret = new Turret(field.Grid, field.Settings.TurretX, field.Settings.TurretY, scanRadius)

  /** 격자 선, 본 칸, 포탑, 반경 */
  const ground = (visited: Cell[]): WorldItem[] => {
    const out: WorldItem[] = []
    for (const c of visited) out.push({ kind: 'box', x: c.X * cellSize, y: c.Y * cellSize, w: cellSize, h: cellSize, fill: 'rgba(126, 224, 129, 0.14)' })
    for (let cy = 0; cy * cellSize < 9; cy++)
      for (let cx = 0; cx * cellSize < 16; cx++) out.push({ kind: 'box', x: cx * cellSize, y: cy * cellSize, w: cellSize, h: cellSize, stroke: '#2a3a55' })
    out.push(
      { kind: 'ring', x: 8, y: 4.5, r: scanRadius, color: CYAN },
      { kind: 'box', x: 7.75, y: 4.25, w: 0.5, h: 0.5, fill: CYAN },
    )
    return out
  }

  /** 드론과 이름(찾았으면 초록, 놓쳤으면 빨강), 마지막 탐지 순간의 자리 표시(초록 링 = 찾음, 빨간 링과 ✖ 글 = 놓침),
   *  나쁜 예의 등록 칸 → 실제 자리 점선 */
  const droneItems = (shown: Shown[], marks: Mark[]): WorldItem[] => {
    const arrows: WorldItem[] = []
    const rings: WorldItem[] = []
    const bodies: WorldItem[] = []
    const texts: WorldItem[] = []
    for (const m of marks) {
      rings.push({ kind: 'ring', x: m.x, y: m.y, r: 0.42, color: m.bug ? RED : GREEN })
      // ✖ 글은 링 왼쪽에 (드론 이름은 드론 오른쪽에 두어 막 움직인 드론과 겹치지 않게)
      if (m.bug && m.fresh) texts.push({ kind: 'text', x: m.x - 0.5, y: m.y - 0.1, text: `✖ ${m.bug}`, size: 15, color: RED, align: 'right' })
    }
    for (const d of shown) {
      if (d.reg) {
        const rx = (d.reg[0] + 0.5) * cellSize
        const ry = (d.reg[1] + 0.5) * cellSize
        arrows.push({ kind: 'box', x: rx - 0.08, y: ry - 0.08, w: 0.16, h: 0.16, fill: ORANGE })
        arrows.push({ kind: 'arrow', x1: rx, y1: ry, x2: d.x, y2: d.y, color: ORANGE, dashed: true })
      }
      bodies.push({ kind: 'actor', x: d.x, y: d.y - 0.27, role: 'enemy', scale: DRONE_SCALE })
      texts.push({ kind: 'text', x: d.x + 0.3, y: d.y - 0.12, align: 'left', text: d.bug ? `${d.name} 놓침` : d.found ? `${d.name} 찾음` : d.name, size: 15, color: d.bug ? RED : d.found ? GREEN : '#e6edf7' })
    }
    return [...arrows, ...rings, ...bodies, ...texts]
  }

  /** 왼쪽 위 글 두 줄 (뒤에 어두운 판을 깔아 격자와 드론 위에서도 읽히게) */
  const header = (line1: string, color1: string, line2: string, color2: string): WorldItem[] => [
    { kind: 'box', x: 0.1, y: 7.15, w: 11.6, h: 1.7, fill: 'rgba(11, 17, 28, 0.82)' },
    { kind: 'text', x: 0.35, y: 8.3, text: line1, align: 'left', size: 21, color: color1 },
    { kind: 'text', x: 0.35, y: 7.6, text: line2, align: 'left', size: 16, color: color2 },
  ]

  if (!naive) {
    field.Added.add(d => {
      events.push(`${d.Name} 칸 ${cellText(d.Cell)} 에 등록 · 자리 (${F2(d.X)}, ${F2(d.Y)})`)
    })
    field.CellChanged.add((d, from, to) => {
      events.push(`${d.Name} 칸 ${cellText(from)} → ${cellText(to)} · 옛 칸에서 빼고 새 칸에 넣음`)
      at.move = clock
    })
    turret.Scanned.add(r => {
      events.push(`탐지: 칸 ${r.Visited.length}개 · 거리 검사 ${r.Checks}회 (전체 검사면 ${r.FullChecks}회) · 찾음 ${names(r.Found)}`)
      at.scan = clock
      marks = r.Found.map(d => ({ name: d.Name, x: d.X, y: d.Y }))
    })
    turret.AutoScanChanged.add(on => events.push(on ? `자동 탐지 켬 (${F2(turret.ScanInterval)}초마다)` : '자동 탐지 끔'))

    return {
      input(name) {
        if (name === 'wave') {
          field.AddWave()
          at.wave = clock
        } else if (name === 'scan') turret.Scan()
        else if (name === 'autoScan') turret.SetAutoScan(!turret.AutoScan)
      },
      tick(dt) {
        field.Tick(dt)
        turret.Tick(dt)
        clock += dt
      },
      drain: () => events.splice(0),
      snapshot() {
        const r = turret.Last
        let s = `drones=${field.Drones.length} checks=${r ? r.Checks : 0} full=${r ? r.FullChecks : 0} found=${r ? r.Found.length : 0}`
        for (const d of field.Drones) s += ` ${d.Name} x=${F2(d.X)} y=${F2(d.Y)} cell=${d.Cell.X},${d.Cell.Y}`
        return s
      },
      view(): SimView {
        const r = turret.Last
        const world = ground(r ? r.Visited : [])
        world.push(...droneItems(field.Drones.map(d => ({ name: d.Name, x: d.X, y: d.Y, found: !!r && r.Found.includes(d) })), marks))
        world.push(
          ...header(
            r ? `거리 검사 ${r.Checks} 회 (전체 검사면 ${r.FullChecks} 회) · 찾은 드론 ${r.Found.length}` : `아직 탐지 전 · 드론 ${field.Drones.length} 대`,
            GREEN,
            `${r ? `본 칸 ${r.Visited.length} 개 · ` : ''}칸 ${cellSize}m · 반경 ${scanRadius}m · 자동 탐지 ${turret.AutoScan ? '켬' : '끔'} · 칸을 넘으면 등록을 옮긴다`,
            DIM,
          ),
        )
        const active: string[] = []
        if (clock - at.wave < GLOW) active.push('scanner', 'scanner-field', 'field', 'field-grid', 'grid')
        if (clock - at.move < GLOW) active.push('field', 'field-drone', 'field-grid', 'grid')
        if (clock - at.scan < GLOW) active.push('turret', 'scanner-turret', 'turret-grid', 'grid', 'grid-drone', 'drone')
        return { world, active }
      },
    }
  }

  const n = new NaiveTurret()
  n.cellSize = cellSize
  n.scanRadius = scanRadius
  n.droneSpeed = droneSpeed
  const actualCell = new Map<NaiveDrone, Pair>()
  let missed = new Map<NaiveDrone, Kind>()
  const atNaive = { stale: -9 }

  const Registered = (d: NaiveDrone): Pair => {
    for (const [k, list] of n.cells) if (list.includes(d)) return k.split(',').map(Number) as Pair
    return [-2147483648, -2147483648]
  }
  const NaiveOf = (d: Drone) => n.drones.find(x => x.name === d.Name) ?? null

  const Scanned = () => {
    at.scan = clock
    const own = n.CellOf(n.turretX, n.turretY)
    events.push(`탐지: 포탑 칸 ${pairText(own)} 만 · 거리 검사 ${n.checks}회 (전체 검사면 ${n.drones.length}회) · 찾음 ${names(n.found)}`)
    const next = new Map<NaiveDrone, Kind>()
    marks = n.found.map(d => ({ name: d.name, x: d.x, y: d.y }))
    for (const shadow of turret.Last?.Found ?? []) {
      const d = NaiveOf(shadow)
      if (!d || n.found.includes(d)) continue
      const actual = n.CellOf(d.x, d.y)
      const reg = Registered(d)
      const dist = F2(Math.sqrt(shadow.DistanceSq(turret.X, turret.Y)))
      const kind: Kind = samePair(actual, own) ? '탐지 누락' : '경계 누락'
      next.set(d, kind)
      const before = missed.get(d)
      marks.push({ name: d.name, x: d.x, y: d.y, bug: kind, fresh: before === undefined })
      if (before !== undefined) {
        events.push(`${d.name} 또 못 찾음 (${before === kind ? `${kind} 그대로` : `${before} → ${kind}`}) · 거리 ${dist}`)
        continue
      }
      if (kind === '탐지 누락') events.push(`!탐지 누락: ${d.name} 거리 ${dist} · 포탑 칸 ${pairText(own)} 에 왔는데 처음 칸 ${pairText(reg)} 목록에만 있다`)
      else if (samePair(reg, actual)) events.push(`!경계 누락: ${d.name} 거리 ${dist} · 옆 칸 ${pairText(actual)} 에 있어 보지 않았다 (등록은 맞다)`)
      else events.push(`!경계 누락: ${d.name} 거리 ${dist} · 옆 칸 ${pairText(actual)} 에 있어 보지 않았다 (등록도 처음 칸 ${pairText(reg)} 그대로)`)
    }
    missed = next
  }

  return {
    input(name) {
      if (name === 'wave') field.AddWave()
      else if (name === 'scan') turret.Scan()
      else if (name === 'autoScan') turret.SetAutoScan(!turret.AutoScan)

      const scans0 = n.scans
      if (name === 'wave') {
        at.wave = clock
        const n0 = n.drones.length
        n.OnWave()
        for (let i = n0; i < n.drones.length; i++) {
          const d = n.drones[i]
          actualCell.set(d, n.CellOf(d.x, d.y))
          events.push(`${d.name} 칸 ${pairText(actualCell.get(d) as Pair)} 에 등록 · 자리 (${F2(d.x)}, ${F2(d.y)})`)
        }
      } else if (name === 'scan') n.OnScan()
      else if (name === 'autoScan') {
        n.OnAutoScan()
        events.push(n.autoScan ? `자동 탐지 켬 (${F2(n.scanInterval)}초마다)` : '자동 탐지 끔')
      }
      if (n.scans !== scans0) Scanned()
    },
    tick(dt) {
      field.Tick(dt)
      turret.Tick(dt)
      const scans0 = n.scans
      n.Update(dt)
      for (const d of n.drones) {
        const now = n.CellOf(d.x, d.y)
        const before = actualCell.get(d) as Pair
        if (samePair(now, before)) continue
        events.push(`${d.name} 실제 칸 ${pairText(before)} → ${pairText(now)} · 등록은 처음 칸 ${pairText(Registered(d))} 그대로`)
        actualCell.set(d, now)
        atNaive.stale = clock
      }
      if (n.scans !== scans0) Scanned()
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot() {
      let s = `drones=${n.drones.length} checks=${n.checks} found=${n.found.length} missed=${missed.size}`
      for (const d of n.drones) {
        const a = n.CellOf(d.x, d.y)
        const reg = Registered(d)
        s += ` ${d.name} x=${F2(d.x)} y=${F2(d.y)} cell=${a[0]},${a[1]} reg=${reg[0]},${reg[1]}`
      }
      return s
    },
    view(): SimView {
      const own = n.CellOf(n.turretX, n.turretY)
      const scanned = n.scans > 0
      const world = ground(scanned ? [{ X: own[0], Y: own[1] }] : [])
      let stale = 0
      const shown: Shown[] = n.drones.map(d => {
        const reg = Registered(d)
        const actual = n.CellOf(d.x, d.y)
        const s: Shown = { name: d.name, x: d.x, y: d.y, found: n.found.includes(d), bug: missed.get(d) }
        if (!samePair(reg, actual)) {
          s.reg = reg
          stale++
        }
        return s
      })
      world.push(...droneItems(shown, marks))
      const shadowFound = turret.Last?.Found.length ?? 0
      world.push(
        ...header(
          scanned ? `거리 검사 ${n.checks} 회 (전체 검사면 ${n.drones.length} 회) · 찾은 드론 ${n.found.length}` : `아직 탐지 전 · 드론 ${n.drones.length} 대`,
          ORANGE,
          scanned
            ? `포탑 칸 ${pairText(own)} 만 봄 · 처음 칸에 남은 드론 ${stale} · 못 찾음 ${missed.size} (같은 입력의 패턴은 ${shadowFound} 찾음)`
            : `포탑 칸 ${pairText(own)} 만 봄 · 처음 칸에 남은 드론 ${stale} (주황 점선: 등록 칸 → 실제 자리)`,
          missed.size > 0 ? RED : DIM,
        ),
      )
      const active: string[] = []
      if (clock - at.wave < GLOW) active.push('nturret', 'nturret-ncells', 'ncells')
      if (clock - atNaive.stale < GLOW) active.push('nturret-ndrone', 'ndrone')
      if (clock - at.scan < GLOW) active.push('nturret', 'ncells-nown', 'nown', 'nown-ndrone')
      return { world, active }
    },
  }
}
