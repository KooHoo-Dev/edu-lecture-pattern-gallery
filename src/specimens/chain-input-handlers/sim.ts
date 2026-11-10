import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/chain-input-handlers 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/chain-input-handlers/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다. */

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

/* ───────── Core/Click.cs ───────── */

interface Click {
  Number: number
  X: number
  Y: number
}
const newClick = (number: number, x: number, y: number): Click => ({ Number: number, X: x, Y: y })

class Area {
  readonly Left: number
  readonly Bottom: number
  readonly Width: number
  readonly Height: number
  constructor(left: number, bottom: number, width: number, height: number) {
    this.Left = f(left)
    this.Bottom = f(bottom)
    this.Width = f(width)
    this.Height = f(height)
  }
  get CenterX() {
    return f(this.Left + f(this.Width * 0.5))
  }
  get CenterY() {
    return f(this.Bottom + f(this.Height * 0.5))
  }
  Contains(x: number, y: number) {
    return x >= this.Left && x <= f(this.Left + this.Width) && y >= this.Bottom && y <= f(this.Bottom + this.Height)
  }
}

/* ───────── Core/ClickChain.cs ───────── */

interface IClickHandler {
  Handle(c: Click): boolean
}

class ClickChain {
  private handlers: IClickHandler[] = []
  get Handlers(): readonly IClickHandler[] {
    return this.handlers
  }
  Passed = new Event<[IClickHandler, Click]>()
  Handled = new Event<[IClickHandler, Click]>()
  Unhandled = new Event<[Click]>()
  Add(handler: IClickHandler) {
    if (this.handlers.includes(handler)) return
    this.handlers.push(handler)
  }
  Remove(handler: IClickHandler) {
    const i = this.handlers.indexOf(handler)
    if (i < 0) return false
    this.handlers.splice(i, 1)
    return true
  }
  Send(c: Click) {
    const order = [...this.handlers]
    for (const h of order) {
      if (!this.handlers.includes(h)) continue
      if (h.Handle(c)) {
        this.Handled.invoke(h, c)
        return true
      }
      this.Passed.invoke(h, c)
    }
    this.Unhandled.invoke(c)
    return false
  }
}

/* ───────── Core/ClickHandlers.cs ───────── */

class PopupHandler implements IClickHandler {
  Panel: Area
  CloseButton: Area
  IsOpen = false
  Opened = new Event<[]>()
  Closed = new Event<[]>()
  Blocked = new Event<[Click, boolean]>()
  constructor(panel: Area, closeButton: Area) {
    this.Panel = panel
    this.CloseButton = closeButton
  }
  Open = () => {
    if (this.IsOpen) return
    this.IsOpen = true
    this.Opened.invoke()
  }
  Close() {
    if (!this.IsOpen) return
    this.IsOpen = false
    this.Closed.invoke()
  }
  Handle(c: Click) {
    if (!this.IsOpen) return false
    if (this.CloseButton.Contains(c.X, c.Y)) this.Close()
    else this.Blocked.invoke(c, !this.Panel.Contains(c.X, c.Y))
    return true
  }
}

class UiButtonHandler implements IClickHandler {
  Area: Area
  Pressed = new Event<[]>()
  constructor(area: Area) {
    this.Area = area
  }
  Handle(c: Click) {
    if (!this.Area.Contains(c.X, c.Y)) return false
    this.Pressed.invoke()
    return true
  }
}

class DroneSelectHandler implements IClickHandler {
  Area: Area
  IsSelected = false
  Selected = new Event<[]>()
  constructor(area: Area) {
    this.Area = area
  }
  Handle(c: Click) {
    if (!this.Area.Contains(c.X, c.Y)) return false
    this.IsSelected = true
    this.Selected.invoke()
    return true
  }
}

class GroundMoveHandler implements IClickHandler {
  Area: Area
  private walker: Walker
  constructor(area: Area, walker: Walker) {
    this.Area = area
    this.walker = walker
  }
  Handle(c: Click) {
    if (!this.Area.Contains(c.X, c.Y)) return false
    this.walker.MoveTo(c.X)
    return true
  }
}

/* ───────── Core/Walker.cs ───────── */

class Walker {
  X: number
  TargetX: number
  IsWalking = false
  Speed: number
  MoveOrdered = new Event<[number, number]>()
  Arrived = new Event<[number]>()
  constructor(x: number, speed: number) {
    this.X = f(x)
    this.TargetX = f(x)
    this.Speed = f(speed)
  }
  MoveTo(x: number) {
    this.TargetX = x
    this.IsWalking = true
    this.MoveOrdered.invoke(this.X, x)
  }
  Tick(dt: number) {
    if (!this.IsWalking || this.Speed <= 0) return
    const step = f(this.Speed * dt)
    const gap = f(this.TargetX - this.X)
    if (Math.abs(gap) <= step) {
      this.X = this.TargetX
      this.IsWalking = false
      this.Arrived.invoke(this.X)
      return
    }
    this.X = f(this.X + (gap > 0 ? step : -step))
  }
}

/* ───────── Core/MaintenanceScreen.cs ───────── */

const ScreenLayout = {
  ButtonRight: f(15.4),
  ButtonBottom: f(2.6),
  ButtonHeight: f(1),
  HarinStartX: f(5.5),
  Drone: new Area(11, 2, 1, 1.4),
  PopupPanel: new Area(3.5, 3.8, 7.5, 2.8),
  PopupClose: new Area(10.2, 5.8, 0.6, 0.6),
  Ground: new Area(0, 0, 16, 7),
  Button: (width: number) => new Area(f(ScreenLayout.ButtonRight - width), ScreenLayout.ButtonBottom, width, ScreenLayout.ButtonHeight),
}

class MaintenanceScreen {
  readonly Chain = new ClickChain()
  readonly Popup: PopupHandler
  readonly Button: UiButtonHandler
  readonly Drone: DroneSelectHandler
  readonly Ground: GroundMoveHandler
  readonly Harin: Walker
  constructor(buttonWidth: number, walkSpeed: number) {
    this.Harin = new Walker(ScreenLayout.HarinStartX, walkSpeed)
    this.Popup = new PopupHandler(ScreenLayout.PopupPanel, ScreenLayout.PopupClose)
    this.Button = new UiButtonHandler(ScreenLayout.Button(buttonWidth))
    this.Drone = new DroneSelectHandler(ScreenLayout.Drone)
    this.Ground = new GroundMoveHandler(ScreenLayout.Ground, this.Harin)
    this.Button.Pressed.add(this.Popup.Open)
    this.Chain.Add(this.Popup)
    this.Chain.Add(this.Button)
    this.Chain.Add(this.Drone)
    this.Chain.Add(this.Ground)
  }
  SetButtonWidth(width: number) {
    this.Button.Area = ScreenLayout.Button(width)
  }
}

/* ───────── Naive/NaiveClickSystems.cs ───────── */

class NaiveClickInput {
  Clicked = new Event<[number, number]>()
  Click(x: number, y: number) {
    this.Clicked.invoke(x, y)
  }
}

class NaiveMaintenanceUi {
  button!: Area
  closeButton!: Area
  popupOpen = false
  Listen(input: NaiveClickInput) {
    input.Clicked.add(this.OnClicked)
  }
  private OnClicked = (x: number, y: number) => {
    if (this.popupOpen) {
      if (this.closeButton.Contains(x, y)) this.popupOpen = false
      return
    }
    if (this.button.Contains(x, y)) this.popupOpen = true
  }
}

class NaiveDroneSelect {
  drone!: Area
  selected = false
  Selected = new Event<[]>()
  Listen(input: NaiveClickInput) {
    input.Clicked.add(this.OnClicked)
  }
  private OnClicked = (x: number, y: number) => {
    if (!this.drone.Contains(x, y)) return
    this.selected = true
    this.Selected.invoke()
  }
}

class NaiveGroundMove {
  ground!: Area
  walkSpeed = 0
  harinX = 0
  targetX = 0
  walking = false
  Listen(input: NaiveClickInput) {
    input.Clicked.add(this.OnClicked)
  }
  private OnClicked = (x: number, y: number) => {
    if (!this.ground.Contains(x, y)) return
    this.targetX = x
    this.walking = true
  }
  Update(dt: number) {
    if (!this.walking || this.walkSpeed <= 0) return
    const step = f(this.walkSpeed * dt)
    const gap = f(this.targetX - this.harinX)
    if (Math.abs(gap) <= step) {
      this.harinX = this.targetX
      this.walking = false
      return
    }
    this.harinX = f(this.harinX + (gap > 0 ? step : -step))
  }
}

/* ───────── truth/chain-input-handlers/Target.cs 와 같은 어댑터 + 무대 그림 ───────── */

const F2 = (v: number) => v.toFixed(2)
const B = (b: boolean) => (b ? 1 : 0)
const GroundTapX = f(2.5)
const GroundTapY = f(2)
const SkyTapX = f(7.6)
const SkyTapY = f(7.4)

const GREEN = '#7ee081'
const RED = '#ff5d6c'
const DIM = '#4a5872'
const SOFT = '#8796ae'

/** 화면에 남기는 마지막 클릭 */
interface LastClick {
  n: number
  x: number
  y: number
  spot: string
  /** 패턴: 지나간 처리자 이름. 나쁜 예: 그림자 사슬 기준 */
  passed: string[]
  /** 소비한 처리자 이름 (패턴, 나쁜 예는 그림자) */
  by: string | null
  /** 나쁜 예에서 반응한 시스템 */
  reacted: { ui: boolean; drone: boolean; ground: boolean }
  /** 나쁜 예 버그 종류 */
  bug: string | null
  at: number
}

const ID: Record<string, string> = { 팝업: 'popup', 버튼: 'button', 드론: 'drone', 땅: 'ground' }
const CHAIN = ['팝업', '버튼', '드론', '땅']

export const createSim: SimFactory = (values: ParamValues, isNaive: boolean): PatternSim => {
  const events: string[] = []
  const width = f(Number(values.buttonWidth))
  const speed = f(Number(values.walkSpeed))
  const screen = new MaintenanceScreen(width, speed) // 패턴. 나쁜 예 모드에서는 그림자
  const names = new Map<IClickHandler, string>([
    [screen.Popup, '팝업'],
    [screen.Button, '버튼'],
    [screen.Drone, '드론'],
    [screen.Ground, '땅'],
  ])
  let clicks = 0
  let droneHits = 0
  let consumer: IClickHandler | null = null
  let clock = 0
  let last: LastClick | null = null
  let prev: LastClick | null = null
  /** 나쁜 예: 하린이 지금 걷는 목표를 준 버그 클릭 번호, 관통으로 선택된 드론의 클릭 번호 */
  let badWalk: { n: number; kind: string } | null = null
  let badSelect: number | null = null

  screen.Chain.Handled.add(h => (consumer = h))
  screen.Chain.Passed.add(h => last?.passed.push(names.get(h)!)) // 그림 전용 (사건 글을 쓰지 않는다)

  let input: NaiveClickInput | null = null
  let ui: NaiveMaintenanceUi | null = null
  let drone: NaiveDroneSelect | null = null
  let ground: NaiveGroundMove | null = null

  if (isNaive) {
    input = new NaiveClickInput()
    ui = new NaiveMaintenanceUi()
    ui.button = ScreenLayout.Button(width)
    ui.closeButton = ScreenLayout.PopupClose
    drone = new NaiveDroneSelect()
    drone.drone = ScreenLayout.Drone
    ground = new NaiveGroundMove()
    ground.ground = ScreenLayout.Ground
    ground.walkSpeed = speed
    ground.harinX = ScreenLayout.HarinStartX
    ground.targetX = ScreenLayout.HarinStartX
    ui.Listen(input)
    drone.Listen(input)
    ground.Listen(input)
    drone.Selected.add(() => droneHits++)
  } else {
    screen.Chain.Passed.add((h, c) => events.push(`#${c.Number} ${names.get(h)} → 넘김`))
    screen.Chain.Handled.add((h, c) => events.push(`#${c.Number} ${names.get(h)} ● 소비`))
    screen.Chain.Unhandled.add(c => events.push(`#${c.Number} 아무도 받지 않음 → 버림`))
    screen.Popup.Opened.add(() => events.push('정비 창 열림'))
    screen.Popup.Closed.add(() => events.push('정비 창 닫힘 (✕)'))
    screen.Popup.Blocked.add((_c, outside) => events.push(outside ? '정비 창(모달)이 창 밖 클릭을 막음' : '정비 창 안 클릭 (✕ 아님)'))
    screen.Drone.Selected.add(() => events.push('정비 드론 선택'))
    screen.Harin.MoveOrdered.add((from, to) => events.push(`하린 이동 명령 ${F2(from)} → ${F2(to)}`))
    screen.Harin.Arrived.add(x => events.push(`하린 도착 ${F2(x)}`))
  }

  const popupOpen = () => (isNaive ? ui!.popupOpen : screen.Popup.IsOpen)

  const where = (h: IClickHandler | null) => (h === screen.Popup ? '정비 창이 열린 채 누른' : h === screen.Button ? '정비 버튼 위' : '받을 처리자가 없는')

  const naiveClick = (x: number, y: number) => {
    const u = ui!
    const g = ground!
    const open0 = u.popupOpen
    const hits0 = droneHits
    const walking0 = g.walking
    const target0 = g.targetX
    const from = g.harinX
    input!.Click(x, y)

    const uiReacted = u.popupOpen !== open0
    if (uiReacted) events.push(u.popupOpen ? 'UI: 정비 창 열림' : 'UI: 정비 창 닫힘 (✕)')
    const droneReacted = droneHits !== hits0
    if (droneReacted) events.push('드론 선택: 정비 드론 선택')
    const groundReacted = g.walking !== walking0 || g.targetX !== target0
    if (groundReacted) events.push(`땅 이동: 하린 이동 명령 ${F2(from)} → ${F2(g.targetX)}`)
    last!.reacted = { ui: uiReacted, drone: droneReacted, ground: groundReacted }

    const extra: string[] = []
    if (droneReacted && consumer !== screen.Drone) extra.push('드론 선택')
    if (groundReacted && consumer !== screen.Ground) extra.push('땅 이동')
    if (extra.length === 0) {
      if (groundReacted) badWalk = null
      return
    }
    const result = groundReacted ? `하린 목표 ${F2(g.targetX)}` : '드론 선택됨'
    if (consumer === screen.Drone) {
      events.push(`!두 번 처리: 드론 위 클릭 #${clicks} 에 드론 선택과 땅 이동이 함께 반응 → ${result}`)
      last!.bug = '두 번 처리'
    } else {
      events.push(`!클릭 관통: ${where(consumer)} 클릭 #${clicks} 에 ${extra.join(', ')}도 반응 → ${result}`)
      last!.bug = '클릭 관통'
    }
    if (groundReacted) badWalk = { n: clicks, kind: last!.bug }
    if (droneReacted && !screen.Drone.IsSelected) badSelect = clicks
  }

  const fire = (name: string) => {
    let spot: string
    let x: number
    let y: number
    const button = screen.Button.Area
    if (name === 'tapButton') [spot, x, y] = ['정비 버튼', button.CenterX, button.CenterY]
    else if (name === 'tapDrone') [spot, x, y] = ['드론', screen.Drone.Area.CenterX, screen.Drone.Area.CenterY]
    else if (name === 'tapGround') [spot, x, y] = ['빈 땅', GroundTapX, GroundTapY]
    else if (name === 'tapSky') [spot, x, y] = ['빈 하늘', SkyTapX, SkyTapY]
    else if (name === 'togglePopup') {
      if (popupOpen()) [spot, x, y] = ['팝업 ✕', screen.Popup.CloseButton.CenterX, screen.Popup.CloseButton.CenterY]
      else [spot, x, y] = ['정비 버튼', button.CenterX, button.CenterY]
    } else return
    clicks++
    events.push(`클릭 #${clicks} ${spot} (${F2(x)}, ${F2(y)})`)
    consumer = null
    prev = last
    last = { n: clicks, x, y, spot, passed: [], by: null, reacted: { ui: false, drone: false, ground: false }, bug: null, at: clock }
    screen.Chain.Send(newClick(clicks, x, y))
    last.by = consumer ? names.get(consumer)! : null
    if (isNaive) naiveClick(x, y)
    if (screen.Drone.IsSelected) badSelect = null
  }

  const recent = (t: number, within = 0.35) => clock - t < within

  return {
    input: fire,
    tick(dt) {
      clock += dt
      screen.Harin.Tick(dt)
      if (!isNaive) return
      const g = ground!
      const walking0 = g.walking
      g.Update(dt)
      if (walking0 && !g.walking) events.push(`하린 도착 ${F2(g.harinX)}`)
    },
    drain: () => events.splice(0),
    snapshot: () => {
      if (!isNaive)
        return `harin=${F2(screen.Harin.X)} target=${F2(screen.Harin.TargetX)} popup=${B(screen.Popup.IsOpen)} selected=${B(screen.Drone.IsSelected)} clicks=${clicks}`
      return `harin=${F2(ground!.harinX)} target=${F2(ground!.targetX)} popup=${B(ui!.popupOpen)} selected=${B(drone!.selected)} eharin=${F2(screen.Harin.X)} clicks=${clicks}`
    },
    view(): SimView {
      const open = popupOpen()
      const selected = isNaive ? drone!.selected : screen.Drone.IsSelected
      const hx = isNaive ? ground!.harinX : screen.Harin.X
      const htarget = isNaive ? ground!.targetX : screen.Harin.TargetX
      const walking = isNaive ? ground!.walking : screen.Harin.IsWalking
      const btn = screen.Button.Area
      const dr = screen.Drone.Area
      const world: WorldItem[] = [{ kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' }]

      // 드론 (공중), 하린
      if (selected) world.push({ kind: 'ring', x: dr.CenterX, y: dr.CenterY, r: 0.95, color: badSelect !== null ? RED : GREEN })
      // 이름표는 드론 아래에 둔다 (위는 정비 창 아래 가장자리와 닿는다)
      world.push({ kind: 'actor', x: dr.CenterX, y: dr.Bottom, role: 'neutral' })
      const ghost = isNaive && Math.abs(hx - screen.Harin.X) > 0.01
      // 흐린 하린이 하린과 가까우면 두 이름표가 겹치므로, 흐린 쪽 이름표를 한 줄 위(y 3.25)에 따로 둔다
      const ghostNear = ghost && Math.abs(hx - screen.Harin.X) < 1.6
      if (ghost) world.push({ kind: 'actor', x: screen.Harin.X, y: 1, role: 'ally', label: ghostNear ? undefined : '있어야 할 자리', alpha: 0.3 })
      if (ghostNear) world.push({ kind: 'text', x: screen.Harin.X, y: 3.25, text: '있어야 할 자리', color: DIM, size: 14 })
      world.push({
        kind: 'actor',
        x: hx,
        y: 1,
        role: 'ally',
        label: '하린',
        pose: walking ? 'run' : 'idle',
        facing: htarget < hx ? -1 : 1,
      })
      // 드론 이름표는 드론 밑(y 1.5)에 둔다. 하린이 드론 밑에 오면 몸과 겹치지 않게 하린의 반대쪽 옆으로 비킨다
      const nearDrone = Math.abs(hx - dr.CenterX) < 1.5
      const tagX = nearDrone ? (hx >= dr.CenterX ? hx - 1.6 : hx + 1.6) : dr.CenterX
      if (badSelect !== null) world.push({ kind: 'text', x: tagX, y: 1.5, text: `✖ 선택 (#${badSelect} 관통)`, color: RED, size: 16 })
      else world.push({ kind: 'text', x: tagX, y: 1.5, text: selected ? '정비 드론 · 선택됨' : '정비 드론', color: selected ? GREEN : SOFT, size: 15 })
      if (walking) world.push({ kind: 'arrow', x1: hx, y1: 0.72, x2: htarget, y2: 0.72, color: isNaive && badWalk ? RED : SOFT, dashed: true })
      if (isNaive && badWalk) {
        const by = badWalk.kind === '클릭 관통' ? '클릭 관통으로' : `${badWalk.kind}로`
        world.push({ kind: 'text', x: hx, y: 0.28, text: `✖ #${badWalk.n} ${by} ${walking ? '걷는 중' : '온 자리'}`, color: RED, size: 15 })
      }

      // UI 층: 정비 버튼, 열린 정비 창 (모달은 화면 전체를 어둡게 덮는다)
      world.push({ kind: 'box', x: btn.Left, y: btn.Bottom, w: btn.Width, h: btn.Height, fill: 'rgba(44, 93, 143, 0.92)', stroke: '#8fc8ff', label: 'UI 정비' })
      if (open) {
        world.push({ kind: 'box', x: 0, y: 0, w: 16, h: 7, fill: 'rgba(6, 10, 18, 0.35)' })
        const p = screen.Popup.Panel
        const c = screen.Popup.CloseButton
        world.push({ kind: 'box', x: p.Left, y: p.Bottom, w: p.Width, h: p.Height, fill: '#283450', stroke: '#c8d0de', label: '정비 창 (모달)' })
        world.push({ kind: 'box', x: c.Left, y: c.Bottom, w: c.Width, h: c.Height, fill: '#3a4766', stroke: '#c8d0de', label: '✕' })
      }

      // 클릭 자리와 번호
      if (prev) world.push({ kind: 'text', x: prev.x, y: prev.y - 0.15, text: `#${prev.n}`, color: DIM, size: 15 })
      if (last) {
        const color = isNaive ? (last.bug ? RED : GREEN) : last.by ? GREEN : SOFT
        world.push({ kind: 'ring', x: last.x, y: last.y, r: recent(last.at, 0.4) ? 0.45 : 0.3, color })
        world.push({ kind: 'text', x: last.x + 0.45, y: last.y + 0.3, text: `#${last.n}`, color, size: 18, align: 'left' })
      }

      // 왼쪽 위 상태
      const state = `정비 창 ${open ? '열림 (모달)' : '닫힘'} · 드론 ${selected ? '선택됨' : '선택 안 됨'} · 하린 x ${F2(hx)}`
      let head = '클릭을 기다린다'
      let headColor = '#c8d0de'
      if (last && !isNaive) head = last.by ? `클릭 #${last.n} ${last.spot} → ${last.by}이 소비` : `클릭 #${last.n} ${last.spot} → 아무도 받지 않아 버림`
      if (last && isNaive) {
        const r = last.reacted
        const list = [r.ui && 'UI', r.drone && '드론 선택', r.ground && '땅 이동'].filter(Boolean).join(', ')
        head = `클릭 #${last.n} ${last.spot} → 반응: ${list || '없음'}${last.bug ? ` ✖ ${last.bug}` : ''}`
        if (last.bug) headColor = RED
      }
      world.push({ kind: 'text', x: 0.4, y: 8.3, text: head, color: headColor, size: 19, align: 'left' })
      world.push({ kind: 'text', x: 0.4, y: 7.6, text: state, color: SOFT, size: 17, align: 'left' })

      // 오른쪽 위 사슬 줄
      if (!isNaive) {
        world.push({ kind: 'text', x: 9.3, y: 8.6, text: '사슬: 앞에서부터 (✓ 넘김 · ● 소비)', color: SOFT, size: 14, align: 'left' })
        CHAIN.forEach((name, i) => {
          const x = 9.3 + i * 1.65
          const passed = !!last && last.passed.includes(name)
          const used = !!last && last.by === name
          const reached = passed || used
          world.push({ kind: 'box', x, y: 7.45, w: 1.35, h: 0.75, fill: used ? '#24502a' : reached ? '#1d2638' : '#141a26', stroke: used ? GREEN : reached ? SOFT : '#262f40' })
          world.push({ kind: 'text', x: x + 0.675, y: 7.72, text: `${used ? '● ' : passed ? '✓ ' : ''}${name}`, color: used ? GREEN : reached ? '#c8d0de' : DIM, size: 16 })
          if (i < CHAIN.length - 1) world.push({ kind: 'arrow', x1: x + 1.38, y1: 7.82, x2: x + 1.62, y2: 7.82, color: reached && !used ? SOFT : '#2a3346' })
        })
      } else {
        world.push({ kind: 'text', x: 9.3, y: 8.6, text: '각자 구독 (사슬 없음 · ● 반응)', color: SOFT, size: 14, align: 'left' })
        const cells: [string, keyof LastClick['reacted'], string | null][] = [
          ['UI', 'ui', null],
          ['드론 선택', 'drone', '드론'],
          ['땅 이동', 'ground', '땅'],
        ]
        cells.forEach(([label, key, chainName], i) => {
          const x = 9.3 + i * 2.2
          const on = !!last && last.reacted[key]
          const wrong = on && !!last && !!last.bug && chainName !== null && last.by !== chainName
          world.push({ kind: 'box', x, y: 7.45, w: 2.0, h: 0.75, fill: wrong ? '#4a1c24' : on ? '#24502a' : '#141a26', stroke: wrong ? RED : on ? GREEN : '#262f40' })
          world.push({ kind: 'text', x: x + 1.0, y: 7.72, text: `${on ? '● ' : ''}${label}`, color: wrong ? RED : on ? GREEN : DIM, size: 16 })
        })
      }

      // 구조 그림: 클릭 직후 0.35초 동안 이번 클릭이 지난 노드와 화살표
      const active: string[] = []
      if (last && recent(last.at)) {
        if (isNaive) {
          active.push('nin')
          const r = last.reacted
          if (r.ui) active.push('n-ui', 'n-ui-nin')
          if (r.drone) active.push('n-drone', 'n-drone-nin')
          if (r.ground) active.push('n-ground', 'n-ground-nin')
        } else {
          active.push('input', 'input-chain', 'chain', 'chain-iface')
          const went = [...last.passed, ...(last.by ? [last.by] : [])]
          went.forEach((name, i) => {
            active.push(ID[name])
            if (i > 0) active.push(`${ID[went[i - 1]]}-${ID[name]}`)
          })
          if (last.by === '땅') active.push('ground-walker', 'walker')
        }
      }
      return { world, active }
    },
  }
}
