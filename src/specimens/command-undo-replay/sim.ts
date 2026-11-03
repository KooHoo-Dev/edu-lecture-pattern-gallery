import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/command-undo-replay 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/command-undo-replay/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다. */

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

type Direction = 'Up' | 'Down' | 'Left' | 'Right'

const Directions = {
  Dx: (d: Direction) => (d === 'Right' ? 1 : d === 'Left' ? -1 : 0),
  Dy: (d: Direction) => (d === 'Up' ? 1 : d === 'Down' ? -1 : 0),
  Arrow: (d: Direction) => (d === 'Up' ? '↑' : d === 'Down' ? '↓' : d === 'Left' ? '←' : '→'),
}

class DroneGrid {
  static DefaultStartX = 1
  static DefaultStartY = 1
  Width: number
  Height: number
  private walls = new Set<number>()
  constructor(width: number, height: number) {
    this.Width = Math.max(1, width)
    this.Height = Math.max(1, height)
  }
  AddWall(x: number, y: number) {
    if (this.Inside(x, y)) this.walls.add(y * this.Width + x)
  }
  Inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.Width && y < this.Height
  }
  IsWall(x: number, y: number) {
    return this.Inside(x, y) && this.walls.has(y * this.Width + x)
  }
  IsOpen(x: number, y: number) {
    return this.Inside(x, y) && !this.walls.has(y * this.Width + x)
  }
  static CreateDefault() {
    const grid = new DroneGrid(12, 6)
    grid.AddWall(4, 0)
    grid.AddWall(4, 1)
    grid.AddWall(4, 2)
    grid.AddWall(7, 3)
    grid.AddWall(7, 4)
    grid.AddWall(7, 5)
    grid.AddWall(9, 1)
    grid.AddWall(10, 1)
    return grid
  }
}

class Drone {
  Grid: DroneGrid
  X: number
  Y: number
  Moved = new Event<[number, number, number, number]>()
  Bumped = new Event<[Direction]>()
  constructor(grid: DroneGrid, x: number, y: number) {
    this.Grid = grid
    this.X = x
    this.Y = y
  }
  TryMove(direction: Direction) {
    const nx = this.X + Directions.Dx(direction)
    const ny = this.Y + Directions.Dy(direction)
    if (!this.Grid.IsOpen(nx, ny)) {
      this.Bumped.invoke(direction)
      return false
    }
    this.PlaceAt(nx, ny)
    return true
  }
  PlaceAt(x: number, y: number) {
    if (x === this.X && y === this.Y) return
    const fromX = this.X
    const fromY = this.Y
    this.X = x
    this.Y = y
    this.Moved.invoke(fromX, fromY, x, y)
  }
}

/* ───────── Core/Commands.cs ───────── */

interface ICommand {
  Execute(): void
  Undo(): void
  toString(): string
}

class MoveCommand implements ICommand {
  private drone: Drone
  Direction: Direction
  FromX = 0
  FromY = 0
  Blocked = false
  constructor(drone: Drone, direction: Direction) {
    this.drone = drone
    this.Direction = direction
  }
  Execute() {
    this.FromX = this.drone.X
    this.FromY = this.drone.Y
    this.Blocked = !this.drone.TryMove(this.Direction)
  }
  Undo() {
    this.drone.PlaceAt(this.FromX, this.FromY)
  }
  toString() {
    return Directions.Arrow(this.Direction)
  }
}

/* ───────── Core/CommandHistory.cs ───────── */

class CommandHistory {
  HistoryLimit = 20
  ReplayInterval = f(0.4)
  private done: ICommand[] = []
  private undone: ICommand[] = []
  private replayIndex = -1
  private replayTimer = 0

  Executed = new Event<[ICommand]>()
  Undid = new Event<[ICommand]>()
  Redid = new Event<[ICommand]>()
  RedoCleared = new Event<[number]>()
  Dropped = new Event<[ICommand]>()
  ReplayStarted = new Event<[number]>()
  ReplayStepped = new Event<[ICommand, number]>()
  ReplayFinished = new Event<[]>()
  InputIgnored = new Event<[string]>()
  NothingToDo = new Event<[string]>()

  get Done(): readonly ICommand[] {
    return this.done
  }
  get Undone(): readonly ICommand[] {
    return this.undone
  }
  get IsReplaying() {
    return this.replayIndex >= 0
  }
  get ReplayIndex() {
    return Math.max(0, this.replayIndex)
  }

  Execute(command: ICommand) {
    if (this.IsReplaying) {
      this.InputIgnored.invoke(command.toString())
      return false
    }
    command.Execute()
    if (this.undone.length > 0) {
      const count = this.undone.length
      this.undone.length = 0
      this.RedoCleared.invoke(count)
    }
    this.Push(command)
    this.Executed.invoke(command)
    return true
  }

  Undo(): void {
    if (this.IsReplaying) {
      this.InputIgnored.invoke('undo')
      return
    }
    if (this.done.length === 0) {
      this.NothingToDo.invoke('undo')
      return
    }
    const last = this.done.pop()!
    last.Undo()
    this.undone.push(last)
    this.Undid.invoke(last)
  }

  Redo(): void {
    if (this.IsReplaying) {
      this.InputIgnored.invoke('redo')
      return
    }
    if (this.undone.length === 0) {
      this.NothingToDo.invoke('redo')
      return
    }
    const next = this.undone.pop()!
    next.Execute()
    this.Push(next)
    this.Redid.invoke(next)
  }

  StartReplay(): void {
    if (this.IsReplaying) {
      this.InputIgnored.invoke('replay')
      return
    }
    if (this.done.length === 0) {
      this.NothingToDo.invoke('replay')
      return
    }
    for (let i = this.done.length - 1; i >= 0; i--) this.done[i].Undo()
    this.replayIndex = 0
    this.replayTimer = this.ReplayInterval
    this.ReplayStarted.invoke(this.done.length)
  }

  Tick(dt: number) {
    if (!this.IsReplaying) return
    this.replayTimer = f(this.replayTimer - dt)
    while (this.IsReplaying && this.replayTimer <= 0) {
      const command = this.done[this.replayIndex]
      command.Execute()
      this.replayIndex++
      this.ReplayStepped.invoke(command, this.replayIndex)
      if (this.replayIndex >= this.done.length) {
        this.replayIndex = -1
        this.ReplayFinished.invoke()
      } else this.replayTimer = f(this.replayTimer + this.ReplayInterval)
    }
  }

  private Push(command: ICommand) {
    this.done.push(command)
    while (this.done.length > Math.max(1, this.HistoryLimit)) {
      const oldest = this.done.shift()!
      this.Dropped.invoke(oldest)
    }
  }
}

/* ───────── Naive/NaiveDrone.cs ───────── */

class NaiveDrone {
  historyLimit = 20
  replayInterval = f(0.4)
  grid: DroneGrid
  X: number
  Y: number
  startX: number
  startY: number
  moves: Direction[] = []
  redoMoves: Direction[] = []
  isReplaying = false
  replayIndex = 0
  private replayTimer = 0

  constructor(grid: DroneGrid, x: number, y: number) {
    this.grid = grid
    this.X = x
    this.Y = y
    this.startX = x
    this.startY = y
  }

  OnMove(dir: Direction) {
    if (this.isReplaying) return
    this.Step(Directions.Dx(dir), Directions.Dy(dir))
    this.moves.push(dir)
    if (this.moves.length > this.historyLimit) this.moves.shift()
    this.redoMoves.length = 0
  }

  OnUndo() {
    if (this.isReplaying || this.moves.length === 0) return
    const last = this.moves.pop()!
    this.redoMoves.push(last)
    this.Step(-Directions.Dx(last), -Directions.Dy(last))
  }

  OnRedo() {
    if (this.isReplaying || this.redoMoves.length === 0) return
    const next = this.redoMoves.pop()!
    this.Step(Directions.Dx(next), Directions.Dy(next))
    this.moves.push(next)
    if (this.moves.length > this.historyLimit) this.moves.shift()
  }

  OnReplay() {
    if (this.isReplaying || this.moves.length === 0) return
    this.X = this.startX
    this.Y = this.startY
    this.isReplaying = true
    this.replayIndex = 0
    this.replayTimer = this.replayInterval
  }

  Update(dt: number) {
    if (!this.isReplaying) return
    this.replayTimer = f(this.replayTimer - dt)
    while (this.isReplaying && this.replayTimer <= 0) {
      const dir = this.moves[this.replayIndex]
      this.Step(Directions.Dx(dir), Directions.Dy(dir))
      this.replayIndex++
      if (this.replayIndex >= this.moves.length) this.isReplaying = false
      else this.replayTimer = f(this.replayTimer + this.replayInterval)
    }
  }

  private Step(dx: number, dy: number) {
    const nx = this.X + dx
    const ny = this.Y + dy
    if (this.grid.IsOpen(nx, ny)) {
      this.X = nx
      this.Y = ny
    }
  }
}

/* ───────── truth/command-undo-replay/Target.cs 와 같은 어댑터 ───────── */

const P = (x: number, y: number) => `(${x},${y})`
const B = (b: boolean) => (b ? 1 : 0)
const LABEL: Record<string, string> = { undo: '되돌리기', redo: '다시 하기', replay: '리플레이', up: '↑', down: '↓', left: '←', right: '→' }
const Label = (s: string) => LABEL[s] ?? s
const Nothing = (s: string) => (s === 'undo' ? '되돌릴 기록이 없다' : s === 'redo' ? '다시 할 기록이 없다' : '리플레이할 기록이 없다')
const PARSE: Record<string, Direction> = { up: 'Up', down: 'Down', left: 'Left', right: 'Right' }

/* ───────── 무대 그림 ───────── */

/** 격자 왼쪽 아래 (월드 단위). 칸 하나가 1 단위 */
const GX = 2
const GY = 0.3
const C = { floor: '#141e30', floorLine: '#26344c', wall: '#3a4a66', wallLine: '#56688a', trail: '#4f86b8', redoTrail: '#7d8fae', bump: '#ffb547', ok: '#7ee081', bug: '#ff5d6c', dim: '#8796ae', warn: '#ffb547' }
const center = (x: number, y: number) => ({ x: GX + x + 0.5, y: GY + y + 0.5 })

function gridItems(grid: DroneGrid): WorldItem[] {
  const items: WorldItem[] = []
  for (let y = 0; y < grid.Height; y++)
    for (let x = 0; x < grid.Width; x++) {
      const wall = grid.IsWall(x, y)
      items.push({ kind: 'box', x: GX + x + 0.04, y: GY + y + 0.04, w: 0.92, h: 0.92, fill: wall ? C.wall : C.floor, stroke: wall ? C.wallLine : C.floorLine })
    }
  const s = center(DroneGrid.DefaultStartX, DroneGrid.DefaultStartY)
  items.push({ kind: 'text', x: s.x, y: s.y - 0.38, text: '출발', size: 14, color: '#4a5872' })
  return items
}

/** 칸 a 에서 칸 b 로 가는 화살표 (양 끝을 조금 줄인다) */
function step(ax: number, ay: number, bx: number, by: number, color: string, dashed = false): WorldItem {
  const a = center(ax, ay)
  const b = center(bx, by)
  const dx = Math.sign(b.x - a.x) * 0.22
  const dy = Math.sign(b.y - a.y) * 0.22
  return { kind: 'arrow', x1: a.x + dx * 0.4, y1: a.y + dy * 0.4, x2: b.x - dx, y2: b.y - dy, color, dashed }
}

/** 벽에 막힌 이동: 칸 가운데에서 벽 쪽으로 짧게 */
function bumpMark(x: number, y: number, d: Direction): WorldItem {
  const c = center(x, y)
  return { kind: 'arrow', x1: c.x + Directions.Dx(d) * 0.1, y1: c.y + Directions.Dy(d) * 0.1, x2: c.x + Directions.Dx(d) * 0.46, y2: c.y + Directions.Dy(d) * 0.46, color: C.bump }
}

/** 정비 드론: 격자 한 칸 안에 들어가게 줄인다. 라벨은 길 화살표를 가리지 않게 격자 위 범례(legend)로 뺀다 */
const droneActor = (x: number, y: number): WorldItem => ({ kind: 'actor', x, y: y - 0.42, role: 'neutral', scale: 0.6 })
const legend = (text: string): WorldItem => ({ kind: 'text', x: GX, y: GY + 6.45, text, align: 'left', size: 15, color: C.dim })

/** 입력 종류마다 그 입력이 지나는 구조 그림 노드와 화살표 */
type Kind = 'move' | 'undo' | 'redo' | 'replay' | 'refused' | ''
const PATH: Record<Exclude<Kind, ''>, string[]> = {
  // 어댑터 → 기록 → ICommand → MoveCommand → Drone
  move: ['cmdr', 'cmdr-move', 'cmdr-history', 'history', 'history-icommand', 'icommand', 'move-icommand', 'move', 'move-drone', 'drone'],
  // 기록 → ICommand.Undo (MoveCommand 가 구현) → Drone (저장한 위치에 놓는다)
  undo: ['history', 'history-icommand', 'icommand', 'move-icommand', 'move', 'move-drone', 'drone'],
  // 기록 → ICommand.Execute → MoveCommand → Drone
  redo: ['history', 'history-icommand', 'icommand', 'move-icommand', 'move', 'move-drone', 'drone'],
  // 기록 → 명령마다 뒤에서부터 Undo → Drone 이 처음 위치로 (그 뒤는 REPLAY_STEP)
  replay: ['cmdr-history', 'history', 'history-icommand', 'icommand', 'move-icommand', 'move', 'move-drone', 'drone'],
  // 기록이 받지 않았거나 할 것이 없다
  refused: ['cmdr-history', 'history'],
}
/** 리플레이가 명령 하나를 다시 실행할 때: 기록 → ICommand.Execute → MoveCommand → Drone */
const REPLAY_STEP = ['history', 'history-icommand', 'icommand', 'move-icommand', 'move', 'move-drone', 'drone']

const arrows = (list: readonly string[], max: number) => (list.length > max ? `… ${list.slice(-max).join(' ')}` : list.join(' ')) || '(비어 있음)'

/** 표시 위치: 격자 칸으로 미끄러지는 연출 (Unity 어댑터의 Update 와 같은 일. 기록에는 들어가지 않는다) */
class Glide {
  x: number
  y: number
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }
  /** 미끄러지지 않고 바로 놓는다 (리플레이 시작: Unity 어댑터의 OnReplayStarted 와 같다) */
  snap(x: number, y: number) {
    this.x = x
    this.y = y
  }
  follow(tx: number, ty: number, duration: number, dt: number) {
    const dx = tx - this.x
    const dy = ty - this.y
    const dist = Math.hypot(dx, dy)
    const max = duration > 0 ? dt / duration : Infinity
    if (dist <= max || dist < 1e-6) {
      this.x = tx
      this.y = ty
    } else {
      this.x += (dx / dist) * max
      this.y += (dy / dist) * max
    }
  }
}

export const createSim: SimFactory = (values: ParamValues, naive: boolean): PatternSim => {
  const intOf = (k: string) => Math.round(Number(values[k]))
  const moveDuration = Number(values.moveDuration)
  const events: string[] = []
  let clock = 0
  const at = { input: -9, bump: -9, step: -9, bug: -9 }
  let lastInput = ''
  /** 마지막 입력을 코어가 어떻게 처리했는지 (구조 그림 강조용) */
  let kind: Kind = ''
  let bumpDir: Direction = 'Up'
  let note = ''

  const drone = new Drone(DroneGrid.CreateDefault(), DroneGrid.DefaultStartX, DroneGrid.DefaultStartY)
  const history = new CommandHistory()
  history.HistoryLimit = intOf('historyLimit')
  history.ReplayInterval = f(Number(values.replayInterval))
  const GRID = gridItems(drone.Grid)
  const glide = new Glide(drone.X, drone.Y)

  const Where = (m: MoveCommand) => (m.Blocked ? `벽에 막힘 ${P(m.FromX, m.FromY)}` : `${P(m.FromX, m.FromY)} → ${P(drone.X, drone.Y)}`)
  const Undone = (m: MoveCommand) => (m.Blocked ? `되돌리기 ${m} → 저장한 위치 ${P(m.FromX, m.FromY)} 그대로 (막혔던 이동)` : `되돌리기 ${m} → 저장한 위치 ${P(m.FromX, m.FromY)}`)

  const CoreInput = (name: string) => {
    const dir = PARSE[name]
    if (dir) history.Execute(new MoveCommand(drone, dir))
    else if (name === 'undo') history.Undo()
    else if (name === 'redo') history.Redo()
    else if (name === 'replay') history.StartReplay()
  }

  if (!naive) {
    history.Executed.add(c => {
      events.push(`실행 ${c} ${Where(c as MoveCommand)} · 기록 ${history.Done.length}개`)
      kind = 'move'
      if ((c as MoveCommand).Blocked) note = '벽에 막혀 제자리. 그래도 기록에 남는다'
    })
    history.Undid.add(c => {
      const m = c as MoveCommand
      events.push(Undone(m))
      kind = 'undo'
      note = m.Blocked ? `되돌린 위치 ${P(m.FromX, m.FromY)}: 막혔던 이동이라 제자리` : `되돌린 위치 ${P(m.FromX, m.FromY)}: 저장한 이전 위치`
    })
    history.Redid.add(c => {
      events.push(`다시 하기 ${c} ${Where(c as MoveCommand)}`)
      kind = 'redo'
      note = `다시 하기 ${c}`
    })
    history.RedoCleared.add(n => {
      events.push(`다시 하기 목록 비움 (${n}개)`)
      note = `새 이동이 와서 다시 하기 ${n}개를 비웠다`
    })
    history.Dropped.add(c => {
      events.push(`가장 오래된 기록 버림 (${c})`)
      note = `상한 ${history.HistoryLimit}개: 가장 오래된 ${c} 를 버렸다`
    })
    history.ReplayStarted.add(n => {
      events.push(`리플레이 시작: 처음 위치 ${P(drone.X, drone.Y)} 로 되돌리고 ${n}개 다시 실행`)
      kind = 'replay'
      glide.snap(drone.X, drone.Y) // 처음 칸까지 미끄러지지 않게 바로 놓는다
      note = `처음 위치 ${P(drone.X, drone.Y)} 로 되돌렸다`
    })
    history.ReplayStepped.add((c, i) => {
      events.push(`리플레이 ${i}/${history.Done.length} ${c} ${Where(c as MoveCommand)}`)
      at.step = clock
    })
    history.ReplayFinished.add(() => {
      events.push(`리플레이 끝 ${P(drone.X, drone.Y)}`)
      note = `리플레이 끝 ${P(drone.X, drone.Y)}: 리플레이 전과 같은 칸`
    })
    history.InputIgnored.add(s => {
      events.push(`리플레이 중 무시 (${Label(s)})`)
      kind = 'refused'
      note = `리플레이 중이라 ${Label(s)} 를 받지 않았다`
    })
    history.NothingToDo.add(s => {
      events.push(Nothing(s))
      kind = 'refused'
      note = Nothing(s)
    })
    drone.Bumped.add(d => {
      at.bump = clock
      bumpDir = d
    })

    return {
      input(name) {
        at.input = clock
        lastInput = name
        kind = ''
        CoreInput(name)
      },
      tick(dt) {
        history.Tick(dt)
        clock += dt
        glide.follow(drone.X, drone.Y, moveDuration, dt)
      },
      drain: () => events.splice(0),
      snapshot: () => `x=${drone.X} y=${drone.Y} done=${history.Done.length} redo=${history.Undone.length} replaying=${B(history.IsReplaying)}`,
      view(): SimView {
        const world: WorldItem[] = [...GRID]
        const done = history.Done as readonly MoveCommand[]
        const shown = history.IsReplaying ? done.slice(0, history.ReplayIndex) : done
        // 지나온 길: 각 명령이 저장한 이전 위치에서 다음 위치로
        shown.forEach((m, i) => {
          const to = i + 1 < shown.length ? { x: shown[i + 1].FromX, y: shown[i + 1].FromY } : { x: drone.X, y: drone.Y }
          if (m.Blocked) world.push(bumpMark(m.FromX, m.FromY, m.Direction))
          else world.push(step(m.FromX, m.FromY, to.x, to.y, C.trail))
        })
        // 다시 하기 길 (점선): 되돌린 명령이 다시 실행되면 갈 곳
        if (!history.IsReplaying) {
          for (let i = history.Undone.length - 1; i >= 0; i--) {
            const m = history.Undone[i] as MoveCommand
            if (!m.Blocked) world.push(step(m.FromX, m.FromY, m.FromX + Directions.Dx(m.Direction), m.FromY + Directions.Dy(m.Direction), C.redoTrail, true))
          }
        }
        const p = center(glide.x, glide.y)
        if (clock - at.bump < 0.3) world.push({ kind: 'ring', x: p.x, y: p.y, r: 0.42, color: C.bump }, bumpMark(drone.X, drone.Y, bumpDir))
        world.push(droneActor(p.x, p.y), legend(`◆ 정비 드론 ${P(drone.X, drone.Y)}   파란 화살표: 지나온 길   점선: 다시 하기   주황: 벽에 막힘`))
        const doneText = done.map(c => c.toString())
        const redoText = [...history.Undone].reverse().map(c => c.toString())
        world.push(
          { kind: 'text', x: 0.4, y: 8.3, text: `기록 ${done.length}/${history.HistoryLimit}  ${arrows(doneText, 14)}`, align: 'left', size: 24, color: C.ok },
          { kind: 'text', x: 0.4, y: 7.6, text: history.IsReplaying ? `▶ 리플레이 ${history.ReplayIndex}/${done.length}` : `다시 하기  ${arrows(redoText, 6)}`, align: 'left', size: 20, color: history.IsReplaying ? C.warn : C.dim },
          { kind: 'text', x: 15.6, y: 7.6, text: note, align: 'right', size: 18, color: C.dim },
        )
        // 늘 켜 두는 노드는 없다. 입력 직후 0.3초는 그 입력이 지난 길만, 리플레이 중에는 기록을 들고 있는 CommandHistory 만,
        // 리플레이가 명령 하나를 다시 실행한 직후 0.3초는 Execute 가 지나는 길만 켠다
        const active = new Set<string>()
        if (clock - at.input < 0.3 && kind) for (const id of PATH[kind]) active.add(id)
        if (history.IsReplaying) active.add('history')
        if (clock - at.step < 0.3) for (const id of REPLAY_STEP) active.add(id)
        return { world, active: [...active] }
      },
    }
  }

  // 나쁜 예 + 같은 입력을 받는 코어(그림자). 그림자의 드론 위치가 '있어야 할 곳' 이다
  const n = new NaiveDrone(DroneGrid.CreateDefault(), DroneGrid.DefaultStartX, DroneGrid.DefaultStartY)
  n.historyLimit = intOf('historyLimit')
  n.replayInterval = f(Number(values.replayInterval))
  let lastDesync = false
  let replayFromX = 0
  let replayFromY = 0
  /** 리플레이 전 위치를 그림에 남길지. 리플레이를 시작할 때 켜고, 다음에 받은 이동·되돌리기·다시 하기가 끈다 */
  let showReplayFrom = false
  /** 그림자 코어가 리플레이를 시작한 칸 (남은 기록의 첫 위치) */
  let replayCoreX = 0
  let replayCoreY = 0
  const Desync = () => n.X !== drone.X || n.Y !== drone.Y
  const bug = (text: string) => {
    events.push(text)
    at.bug = clock
  }

  return {
    input(name) {
      at.input = clock
      lastInput = name
      CoreInput(name)
      const x0 = n.X
      const y0 = n.Y
      const moves0 = n.moves.length
      const redo0 = n.redoMoves.length
      const replaying0 = n.isReplaying
      const first0 = moves0 > 0 ? Directions.Arrow(n.moves[0]) : ''
      const last0 = moves0 > 0 ? Directions.Arrow(n.moves[moves0 - 1]) : ''
      const redoTop0 = redo0 > 0 ? Directions.Arrow(n.redoMoves[redo0 - 1]) : ''

      const dir = PARSE[name]
      if (dir) n.OnMove(dir)
      else if (name === 'undo') n.OnUndo()
      else if (name === 'redo') n.OnRedo()
      else if (name === 'replay') n.OnReplay()

      const moved = n.X !== x0 || n.Y !== y0
      const now = P(n.X, n.Y)
      if (!replaying0 && name !== 'replay') showReplayFrom = false
      if (replaying0) {
        events.push(`리플레이 중 무시 (${Label(name)})`)
        note = `리플레이 중이라 ${Label(name)} 를 받지 않았다`
      } else if (dir) {
        const a = Directions.Arrow(dir)
        events.push(moved ? `${a} ${P(x0, y0)} → ${now} · moves 에 ${a} 추가` : `${a} 벽에 막힘 ${now} · moves 에 ${a} 추가`)
        if (!moved) {
          at.bump = clock
          bumpDir = dir
          note = `벽에 막혔는데 moves 에 ${a} 가 들어갔다`
        } else note = `moves 에 ${a} 추가 (위치는 남기지 않는다)`
        if (redo0 > 0) events.push(`redo 목록 비움 (${redo0}개)`)
        if (n.moves.length === moves0) events.push(`가장 오래된 방향 버림 (${first0})`)
      } else if (name === 'undo') {
        if (moves0 === 0) events.push('되돌릴 방향이 없다')
        else events.push(moved ? `되돌리기: ${last0} 의 반대로 한 칸 ${P(x0, y0)} → ${now}` : `되돌리기: ${last0} 의 반대쪽이 막혀 제자리 ${now}`)
        note = moves0 === 0 ? '되돌릴 방향이 없다' : `되돌리기: ${last0} 의 반대로 한 칸`
      } else if (name === 'redo') {
        if (redo0 === 0) events.push('다시 할 방향이 없다')
        else {
          events.push(moved ? `다시 하기 ${redoTop0} ${P(x0, y0)} → ${now}` : `다시 하기 ${redoTop0} 벽에 막힘 ${now}`)
          if (n.moves.length === moves0) events.push(`가장 오래된 방향 버림 (${first0})`)
        }
        note = redo0 === 0 ? '다시 할 방향이 없다' : `다시 하기 ${redoTop0}`
      } else if (name === 'replay') {
        if (moves0 === 0) events.push('리플레이할 방향이 없다')
        else {
          replayFromX = x0
          replayFromY = y0
          replayCoreX = drone.X
          replayCoreY = drone.Y
          showReplayFrom = true
          glide.snap(n.X, n.Y) // 시작 자리까지 미끄러지지 않게 바로 놓는다
          events.push(`리플레이 시작: 시작 자리 ${P(n.startX, n.startY)} 로 옮기고 ${moves0}개 다시 누른다`)
        }
        note = moves0 === 0 ? '리플레이할 방향이 없다' : `게임 시작 자리 ${P(n.startX, n.startY)} 로 옮겼다`
      }

      const desync = Desync()
      if (name === 'undo' && desync && !lastDesync) bug(`!되돌렸더니 한 칸 어긋났다 (있어야 할 곳 ${P(drone.X, drone.Y)}, 실제 ${now})`)
      lastDesync = desync
    },
    tick(dt) {
      history.Tick(dt)
      const x0 = n.X
      const y0 = n.Y
      const index0 = n.replayIndex
      const replaying0 = n.isReplaying
      n.Update(dt)
      if (replaying0) {
        for (let i = index0; i < n.replayIndex; i++) {
          const a = Directions.Arrow(n.moves[i])
          const moved = n.X !== x0 || n.Y !== y0
          events.push(moved ? `리플레이 ${i + 1}/${n.moves.length} ${a} ${P(x0, y0)} → ${P(n.X, n.Y)}` : `리플레이 ${i + 1}/${n.moves.length} ${a} 벽에 막힘 ${P(n.X, n.Y)}`)
          at.step = clock
        }
        if (!n.isReplaying) {
          events.push(`리플레이 끝 ${P(n.X, n.Y)}`)
          note = `리플레이 끝 ${P(n.X, n.Y)}`
          if (n.X !== replayFromX || n.Y !== replayFromY) {
            bug(`!리플레이가 다른 곳에서 끝난다 (리플레이 전 ${P(replayFromX, replayFromY)}, 끝 ${P(n.X, n.Y)})`)
            // 원인 둘을 나눠 적는다: 시작 자리가 기록의 첫 위치가 아님(X = startX) / 누른 방향이 실제 길과 다름(moves)
            note =
              n.startX !== replayCoreX || n.startY !== replayCoreY
                ? `시작 자리 ${P(n.startX, n.startY)} 는 기록의 첫 위치 ${P(replayCoreX, replayCoreY)} 가 아니다`
                : `누른 방향을 다시 눌러 리플레이 전 ${P(replayFromX, replayFromY)} 과 다른 칸`
          }
        }
      }
      lastDesync = Desync()
      clock += dt
      glide.follow(n.X, n.Y, moveDuration, dt)
    },
    drain: () => events.splice(0),
    snapshot: () => `x=${n.X} y=${n.Y} ex=${drone.X} ey=${drone.Y} moves=${n.moves.length} redo=${n.redoMoves.length} replaying=${B(n.isReplaying)}`,
    view(): SimView {
      const world: WorldItem[] = [...GRID]
      const desync = Desync()
      const p = center(glide.x, glide.y)
      // 리플레이 전 위치: 리플레이 중이거나, 끝났는데 그 칸과 다를 때 남긴다
      const fromShown = showReplayFrom && (n.isReplaying || n.X !== replayFromX || n.Y !== replayFromY)
      const sameCell = fromShown && desync && replayFromX === drone.X && replayFromY === drone.Y
      if (fromShown) {
        const r = center(replayFromX, replayFromY)
        world.push({ kind: 'box', x: GX + replayFromX + 0.16, y: GY + replayFromY + 0.16, w: 0.68, h: 0.68, stroke: C.warn, dashed: true })
        world.push({ kind: 'text', x: r.x, y: r.y - 0.74, text: sameCell ? '리플레이 전 · 있어야 할 곳' : '리플레이 전', size: 15, color: C.warn })
        if (!n.isReplaying) world.push({ kind: 'arrow', x1: p.x, y1: p.y, x2: r.x, y2: r.y, color: C.warn, dashed: true })
      }
      if (desync) {
        const e = center(drone.X, drone.Y)
        world.push({ kind: 'box', x: GX + drone.X + 0.06, y: GY + drone.Y + 0.06, w: 0.88, h: 0.88, stroke: C.ok, dashed: true })
        if (!sameCell) world.push({ kind: 'text', x: e.x, y: e.y - 0.74, text: '있어야 할 곳', size: 15, color: C.ok })
        if (!(sameCell && !n.isReplaying)) world.push({ kind: 'arrow', x1: p.x, y1: p.y, x2: e.x, y2: e.y, color: C.bug, dashed: true })
      }
      if (clock - at.bump < 0.3) world.push({ kind: 'ring', x: p.x, y: p.y, r: 0.42, color: C.bump }, bumpMark(n.X, n.Y, bumpDir))
      world.push(droneActor(p.x, p.y), legend(`◆ 정비 드론 ${P(n.X, n.Y)}${desync ? ' 어긋남' : ''}   초록 점선: 있어야 할 곳   주황 점선: 리플레이 전`))
      const hot = clock - at.bug < 0.8
      world.push(
        { kind: 'text', x: 0.4, y: 8.3, text: `moves = ${arrows(n.moves.map(Directions.Arrow), 14)}  (방향만)`, align: 'left', size: 24, color: hot ? C.bug : C.warn },
        {
          kind: 'text',
          x: 0.4,
          y: 7.6,
          text: n.isReplaying ? `▶ 리플레이 ${n.replayIndex}/${n.moves.length}` : desync ? `실제 ${P(n.X, n.Y)} ≠ 있어야 할 곳 ${P(drone.X, drone.Y)}` : `실제 ${P(n.X, n.Y)} · 이전 위치는 모른다`,
          align: 'left',
          size: 20,
          color: desync ? C.bug : C.dim,
        },
        { kind: 'text', x: 15.6, y: 7.6, text: note, align: 'right', size: 18, color: C.dim },
      )
      const active = ['naive']
      if (clock - at.input < 0.3) {
        active.push('nctrl', 'nctrl-naive', 'naive-pos', 'f-pos')
        if (PARSE[lastInput] || lastInput === 'undo' || lastInput === 'redo') active.push('naive-moves', 'f-moves')
      }
      if (n.isReplaying) active.push('naive-moves', 'f-moves')
      if (clock - at.step < 0.3) active.push('naive-pos', 'f-pos')
      return { world, active }
    },
  }
}
