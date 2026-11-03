import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/decorator-stat-buffs 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/decorator-stat-buffs/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다. */

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

/* ───────── Core/PowerStats.cs ───────── */

interface IPowerStat {
  readonly Value: number
  readonly Label: string
}

class BasePower implements IPowerStat {
  readonly Value: number
  get Label() {
    return '기본 ' + StatText.Num(this.Value)
  }
  constructor(value: number) {
    this.Value = value
  }
}

/** C# 의 abstract class. Value, Label 은 자식이 덮어쓴다 */
class PowerDecorator implements IPowerStat {
  readonly Inner: IPowerStat
  readonly Name: string
  constructor(inner: IPowerStat, name: string) {
    this.Inner = inner
    this.Name = name
  }
  get Value(): number {
    throw new Error('abstract')
  }
  get Label(): string {
    throw new Error('abstract')
  }
}

class AddLayer extends PowerDecorator {
  readonly Amount: number
  constructor(inner: IPowerStat, name: string, amount: number) {
    super(inner, name)
    this.Amount = amount
  }
  override get Value() {
    return f(this.Inner.Value + this.Amount)
  }
  override get Label() {
    return this.Name + ' +' + StatText.Num(this.Amount)
  }
}

class MultiplyLayer extends PowerDecorator {
  readonly Factor: number
  constructor(inner: IPowerStat, name: string, factor: number) {
    super(inner, name)
    this.Factor = factor
  }
  override get Value() {
    return f(this.Inner.Value * this.Factor)
  }
  override get Label() {
    return this.Name + ' ×' + StatText.Num(this.Factor)
  }
}

const StatText = {
  /** C# 의 ToString("0.##") */
  Num(v: number) {
    return String(Number(v.toFixed(2)))
  },

  Describe(stat: IPowerStat): string {
    if (stat instanceof PowerDecorator) return stat.Label + ' [' + StatText.Describe(stat.Inner) + ']'
    return stat.Label
  },
}

/* ───────── Core/BuffSet.cs ───────── */

type BuffKind = 'Cell' | 'Overload'

interface BuffSettings {
  BasePower: number
  CellBonus: number
  OverloadMultiplier: number
  CellDuration: number
  OverloadDuration: number
}

class ActiveBuff {
  readonly Kind: BuffKind
  Remaining: number
  constructor(kind: BuffKind, remaining: number) {
    this.Kind = kind
    this.Remaining = remaining
  }
}

class BuffSet {
  readonly Settings: BuffSettings
  private active: ActiveBuff[] = []
  private current: number
  Power: IPowerStat
  BuffApplied = new Event<[BuffKind, number]>()
  BuffRefreshed = new Event<[BuffKind, number]>()
  BuffExpired = new Event<[BuffKind]>()
  BuffsPurged = new Event<[number]>()
  NothingToPurge = new Event<[]>()
  ChainRebuilt = new Event<[IPowerStat]>()
  PowerChanged = new Event<[number, number]>()

  constructor(settings: BuffSettings) {
    this.Settings = settings
    this.Power = new BasePower(settings.BasePower)
    this.current = this.Power.Value
  }

  get Active(): readonly ActiveBuff[] {
    return this.active
  }

  get Value() {
    return this.Power.Value
  }

  DurationOf(kind: BuffKind) {
    return kind === 'Cell' ? this.Settings.CellDuration : this.Settings.OverloadDuration
  }

  static NameOf(kind: BuffKind) {
    return kind === 'Cell' ? '냉각 셀' : '과부하'
  }

  RemainingOf(kind: BuffKind) {
    const b = this.Find(kind)
    return b === null ? 0 : b.Remaining
  }

  private Find(kind: BuffKind): ActiveBuff | null {
    for (const b of this.active) if (b.Kind === kind) return b
    return null
  }

  Apply(kind: BuffKind) {
    const existing = this.Find(kind)
    if (existing !== null) {
      existing.Remaining = this.DurationOf(kind)
      this.BuffRefreshed.invoke(kind, existing.Remaining)
      return
    }
    this.active.push(new ActiveBuff(kind, this.DurationOf(kind)))
    this.Rebuild()
    this.BuffApplied.invoke(kind, this.DurationOf(kind))
    this.AnnounceChain()
  }

  Purge() {
    if (this.active.length === 0) {
      this.NothingToPurge.invoke()
      return
    }
    const count = this.active.length
    this.active.length = 0
    this.Rebuild()
    this.BuffsPurged.invoke(count)
    this.AnnounceChain()
  }

  Tick(dt: number) {
    let ended: BuffKind[] | null = null
    for (let i = 0; i < this.active.length; ) {
      const b = this.active[i]
      b.Remaining = f(b.Remaining - dt)
      if (b.Remaining > 0) {
        i++
        continue
      }
      this.active.splice(i, 1)
      if (ended === null) ended = []
      ended.push(b.Kind)
    }
    if (ended === null) return
    this.Rebuild()
    for (const kind of ended) this.BuffExpired.invoke(kind)
    this.AnnounceChain()
  }

  SettingsChanged() {
    this.Rebuild()
    this.AnnounceChain()
  }

  private Rebuild() {
    let stat: IPowerStat = new BasePower(this.Settings.BasePower)
    for (const b of this.active) if (b.Kind === 'Cell') stat = new AddLayer(stat, BuffSet.NameOf(b.Kind), this.Settings.CellBonus)
    for (const b of this.active) if (b.Kind === 'Overload') stat = new MultiplyLayer(stat, BuffSet.NameOf(b.Kind), this.Settings.OverloadMultiplier)
    this.Power = stat
  }

  private AnnounceChain() {
    this.ChainRebuilt.invoke(this.Power)
    const previous = this.current
    this.current = this.Power.Value
    if (this.current !== previous) this.PowerChanged.invoke(previous, this.current)
  }
}

/* ───────── Naive/NaivePowerBuffs.cs ───────── */

class WaitTimer {
  Remaining: number
  Running = true
  private onDone: () => void
  constructor(seconds: number, onDone: () => void) {
    this.Remaining = seconds
    this.onDone = onDone
  }
  Stop() {
    this.Running = false
  }
  Tick(dt: number) {
    if (!this.Running) return
    this.Remaining = f(this.Remaining - dt)
    if (this.Remaining > 0) return
    this.Running = false
    this.onDone()
  }
}

class NaivePowerBuffs {
  basePower = f(10)
  cellBonus = f(5)
  overloadMultiplier = f(2)
  cellDuration = f(4)
  overloadDuration = f(2)
  power = f(10)
  cellRoutine: WaitTimer | null = null
  overloadRoutine: WaitTimer | null = null
  private coroutines: WaitTimer[] = []

  get RunningCount() {
    let n = 0
    for (const t of this.coroutines) if (t.Running) n++
    return n
  }

  private StartCoroutine(seconds: number, onDone: () => void) {
    const t = new WaitTimer(seconds, onDone)
    this.coroutines.push(t)
    return t
  }

  private StopCoroutine(t: WaitTimer) {
    t.Stop()
  }

  OnCell() {
    if (this.cellRoutine !== null) this.StopCoroutine(this.cellRoutine)
    this.cellRoutine = this.StartCoroutine(this.cellDuration, () => this.CellEnd())
    this.power = f(this.power + this.cellBonus)
  }

  private CellEnd() {
    this.power = f(this.power - this.cellBonus)
    this.cellRoutine = null
  }

  OnOverload() {
    if (this.overloadRoutine !== null) this.StopCoroutine(this.overloadRoutine)
    this.overloadRoutine = this.StartCoroutine(this.overloadDuration, () => this.OverloadEnd())
    this.power = f(this.power * this.overloadMultiplier)
  }

  private OverloadEnd() {
    this.power = f(this.power / this.overloadMultiplier)
    this.overloadRoutine = null
  }

  OnPurge() {
    if (this.cellRoutine !== null) {
      this.StopCoroutine(this.cellRoutine)
      this.cellRoutine = null
      this.power = f(this.power - this.cellBonus)
    }
    if (this.overloadRoutine !== null) {
      this.StopCoroutine(this.overloadRoutine)
      this.overloadRoutine = null
      this.power = f(this.power / this.overloadMultiplier)
    }
  }

  Update(dt: number) {
    for (const t of [...this.coroutines]) t.Tick(dt)
    this.coroutines = this.coroutines.filter(t => t.Running)
  }
}

/* ───────── truth/decorator-stat-buffs/Target.cs 와 같은 어댑터 + 무대 그림 ───────── */

const F2 = (v: number) => v.toFixed(2)
const Num = StatText.Num
const Name = BuffSet.NameOf
/** 출력 막대가 가득 차는 값. 조절 값 범위의 최대값 (10 + 15) × 3 으로 고정 (Unity 어댑터의 FullScale 과 같다) */
const FULL = 75
const Left = (t: WaitTimer | null) => (t === null ? 0 : t.Remaining)

/** 출력 막대 (가로 3 ~ 15) */
const BAR = { x: 3, y: 6, w: 12 }
const COLOR = { add: '#5cc8ff', mul: '#ffb547', base: '#7ee081', bug: '#ff5d6c', dim: '#8796ae', text: '#e6edf7' }

/** 감싸기 사슬의 층 하나 (바깥부터) */
interface Layer {
  node: 'mul' | 'add' | 'base'
  label: string
  value: number
  kind: BuffKind | null
}

function layersOf(stat: IPowerStat): Layer[] {
  const out: Layer[] = []
  let s: IPowerStat = stat
  for (;;) {
    if (s instanceof MultiplyLayer) out.push({ node: 'mul', label: s.Label, value: s.Value, kind: 'Overload' })
    else if (s instanceof AddLayer) out.push({ node: 'add', label: s.Label, value: s.Value, kind: 'Cell' })
    else {
      out.push({ node: 'base', label: s.Label, value: s.Value, kind: null })
      return out
    }
    s = (s as PowerDecorator).Inner
  }
}

/** 출력 막대, 기본값 눈금, 숫자 (두 모드가 같이 쓴다) */
function powerBar(world: WorldItem[], power: number, base: number, full: number, fill: string) {
  const xAt = (v: number) => BAR.x + BAR.w * Math.max(0, Math.min(1, v / full))
  world.push(
    { kind: 'text', x: BAR.x, y: BAR.y + 0.55, text: '무기 출력', align: 'left', size: 20, color: COLOR.dim },
    { kind: 'text', x: BAR.x + BAR.w, y: BAR.y + 0.55, text: F2(power), align: 'right', size: 30, color: fill },
    { kind: 'bar', x: BAR.x, y: BAR.y, w: BAR.w, value: power / full, fill },
    { kind: 'box', x: xAt(base) - 0.04, y: BAR.y - 0.15, w: 0.08, h: 0.62, fill: COLOR.text },
    { kind: 'text', x: xAt(base), y: BAR.y - 0.6, text: `기본 ${Num(base)}`, size: 18, color: COLOR.dim },
  )
  return xAt
}

export const createSim: SimFactory = (values: ParamValues, isNaive: boolean): PatternSim => {
  const num = (k: string) => f(Number(values[k]))
  const settings: BuffSettings = {
    BasePower: f(10),
    CellBonus: num('cellBonus'),
    OverloadMultiplier: num('overloadMultiplier'),
    CellDuration: num('cellDuration'),
    OverloadDuration: num('overloadDuration'),
  }
  const full = FULL
  const events: string[] = []
  const buffs = new BuffSet(settings)
  let clock = 0
  const at = { input: -9, rebuild: -9, change: -9, end: -9, bug: -9 }
  const recent = (t: number, within = 0.3) => clock - t < within

  if (!isNaive) {
    buffs.BuffApplied.add((k, d) => events.push(`${Name(k)} 받음 → 목록에 넣음 (${F2(d)}초)`))
    buffs.BuffRefreshed.add((k, r) => events.push(`${Name(k)} 다시 받음 → 층은 그대로, 남은 시간만 ${F2(r)}초로`))
    buffs.BuffExpired.add(k => events.push(`${Name(k)} 끝 → 목록에서 뺌`))
    buffs.BuffsPurged.add(n => events.push(`정화 → 버프 ${n}개를 목록에서 뺌`))
    buffs.NothingToPurge.add(() => events.push('정화할 버프가 없다'))
    buffs.ChainRebuilt.add(p => {
      events.push(`사슬 다시 감싸기: ${StatText.Describe(p)}`)
      at.rebuild = clock
    })
    buffs.PowerChanged.add((from, to) => {
      events.push(`출력 ${F2(from)} → ${F2(to)}`)
      at.change = clock
    })

    return {
      input(name) {
        at.input = clock
        if (name === 'cell') buffs.Apply('Cell')
        else if (name === 'overload') buffs.Apply('Overload')
        else if (name === 'purge') buffs.Purge()
      },
      tick(dt) {
        buffs.Tick(dt)
        clock += dt
      },
      drain: () => events.splice(0),
      snapshot: () => `power=${F2(buffs.Value)} layers=${buffs.Active.length} cell=${F2(buffs.RemainingOf('Cell'))} overload=${F2(buffs.RemainingOf('Overload'))}`,
      view(): SimView {
        const power = buffs.Value
        const layers = layersOf(buffs.Power)
        const timers = buffs.Active.map(b => `${Name(b.Kind)} ${F2(b.Remaining)}초`).join(', ')
        const world: WorldItem[] = [
          { kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' },
          { kind: 'actor', x: 1.4, y: 1, role: 'ally', label: '하린', pose: buffs.Active.length ? 'attack' : 'idle' },
          { kind: 'text', x: 0.4, y: 8.3, text: `출력 ${F2(power)} = ${StatText.Describe(buffs.Power)}`, align: 'left', size: 24, color: '#7ee081' },
          { kind: 'text', x: 0.4, y: 7.6, text: buffs.Active.length ? `활성 버프 ${buffs.Active.length}개: ${timers}` : '활성 버프 없음 · 사슬은 BasePower 하나', align: 'left', size: 20, color: COLOR.dim },
          { kind: 'text', x: 15, y: 5.05, text: '감싸기 사슬 = BuffSet.Power', align: 'right', size: 18, color: COLOR.dim },
        ]
        powerBar(world, power, settings.BasePower, full, layers[0].node === 'base' ? COLOR.base : layers[0].node === 'mul' ? COLOR.mul : COLOR.add)
        // 겹친 상자: 바깥 층이 안쪽 층을 감싼다. 왼쪽 위에 층 이름, 오른쪽 위에 그 층이 돌려준 값, 왼쪽 아래에 남은 시간
        layers.forEach((l, i) => {
          const x0 = BAR.x + i * 3
          const x1 = BAR.x + BAR.w - i * 0.3
          const y0 = 1.3 + i * 0.6
          const y1 = 4.9 - i * 0.6
          const stroke = COLOR[l.node]
          const fresh = recent(at.rebuild)
          if (l.node === 'base') {
            world.push({ kind: 'box', x: x0, y: y0, w: x1 - x0, h: y1 - y0, fill: '#1d3b26', stroke, label: `${l.label} (고치지 않는다)` })
            return
          }
          world.push(
            { kind: 'box', x: x0, y: y0, w: x1 - x0, h: y1 - y0, fill: l.node === 'mul' ? 'rgba(255, 181, 71, 0.10)' : 'rgba(92, 200, 255, 0.10)', stroke, dashed: fresh },
            { kind: 'text', x: x0 + 0.2, y: y1 - 0.45, text: l.label, align: 'left', size: 20, color: stroke },
            { kind: 'text', x: x1 - 0.2, y: y1 - 0.45, text: `→ ${F2(l.value)}`, align: 'right', size: 20, color: stroke },
          )
          const kind = l.kind as BuffKind
          const left = buffs.RemainingOf(kind)
          world.push({ kind: 'bar', x: x0 + 0.2, y: y0 + 0.25, w: 2.5, value: left / buffs.DurationOf(kind), fill: stroke, label: `${F2(left)}초` })
        })
        const outer = layers[0].node
        const active: string[] = [outer]
        if (recent(at.input)) active.push('ctrl', 'ctrl-buffset', 'buffset')
        if (recent(at.rebuild)) active.push('buffset', 'buffset-mul', ...layers.map(l => l.node))
        if (recent(at.change)) {
          active.push('buffset-istat', 'istat')
          const nodes = layers.map(l => l.node)
          if (nodes.includes('mul') && nodes.includes('add')) active.push('mul-add')
          if (nodes.includes('add')) active.push('add-base')
        }
        return { world, active }
      },
    }
  }

  const n = new NaivePowerBuffs()
  n.cellBonus = settings.CellBonus
  n.overloadMultiplier = settings.OverloadMultiplier
  n.cellDuration = settings.CellDuration
  n.overloadDuration = settings.OverloadDuration
  let lastDrift = false
  /** 화면용: power 를 고친 순서 (작업, 결과, 중복인가) */
  const history: { op: string; result: number; dup: boolean }[] = [{ op: '시작', result: n.power, dup: false }]
  /** 화면용: 멈춰서 돌지 않게 된 끝 처리 */
  const skipped: string[] = []
  let lastEndWasTick = false

  const checkDrift = () => {
    const drift = n.RunningCount === 0 && Math.abs(f(n.power - n.basePower)) > f(0.005)
    if (drift && !lastDrift) {
      events.push(`!기본값 어긋남 (버프가 모두 끝났는데 power ${F2(n.power)}, 기본값 ${F2(n.basePower)})`)
      at.bug = clock
    }
    lastDrift = drift
  }

  return {
    input(name) {
      at.input = clock
      if (name === 'cell') buffs.Apply('Cell')
      else if (name === 'overload') buffs.Apply('Overload')
      else if (name === 'purge') buffs.Purge()

      const p0 = n.power
      const bonus = Num(n.cellBonus)
      const factor = Num(n.overloadMultiplier)
      if (name === 'cell') {
        const before = n.cellRoutine
        n.OnCell()
        if (before !== null) {
          events.push(`앞 냉각 셀 코루틴 멈춤 (남은 ${F2(before.Remaining)}초) → 그 power -= ${bonus} 는 돌지 않는다`)
          skipped.push(`−${bonus}`)
        }
        events.push(`power += ${bonus} : ${F2(p0)} → ${F2(n.power)} (있어야 할 값 ${F2(buffs.Value)})`)
        history.push({ op: `+${bonus}`, result: n.power, dup: before !== null })
        if (before !== null) {
          events.push(`!중복 적용 (냉각 셀 +${bonus} 를 두 번 더했는데 끝날 때는 한 번만 뺀다)`)
          at.bug = clock
        }
      } else if (name === 'overload') {
        const before = n.overloadRoutine
        n.OnOverload()
        if (before !== null) {
          events.push(`앞 과부하 코루틴 멈춤 (남은 ${F2(before.Remaining)}초) → 그 power /= ${factor} 는 돌지 않는다`)
          skipped.push(`÷${factor}`)
        }
        events.push(`power *= ${factor} : ${F2(p0)} → ${F2(n.power)} (있어야 할 값 ${F2(buffs.Value)})`)
        history.push({ op: `×${factor}`, result: n.power, dup: before !== null })
        if (before !== null) {
          events.push(`!중복 적용 (과부하 ×${factor} 를 두 번 곱했는데 끝날 때는 한 번만 나눈다)`)
          at.bug = clock
        }
      } else if (name === 'purge') {
        const parts: string[] = []
        const hadCell = n.cellRoutine !== null
        const hadOverload = n.overloadRoutine !== null
        if (hadCell) parts.push(`power -= ${bonus}`)
        if (hadOverload) parts.push(`power /= ${factor}`)
        n.OnPurge()
        if (parts.length === 0) events.push('정화할 버프가 없다')
        else {
          events.push(`정화 → 코루틴을 멈추고 ${parts.join(', ')} : ${F2(p0)} → ${F2(n.power)}`)
          let v = p0
          if (hadCell) history.push({ op: `−${bonus}`, result: (v = f(v - n.cellBonus)), dup: false })
          if (hadOverload) history.push({ op: `÷${factor}`, result: (v = f(v / n.overloadMultiplier)), dup: false })
          at.end = clock
          lastEndWasTick = false
        }
      }
      checkDrift()
    },
    tick(dt) {
      buffs.Tick(dt)
      const cell0 = n.cellRoutine
      const overload0 = n.overloadRoutine
      const p0 = n.power
      n.Update(dt)
      const parts: string[] = []
      if (cell0 !== null && n.cellRoutine === null) parts.push(`냉각 셀 끝 power -= ${Num(n.cellBonus)}`)
      if (overload0 !== null && n.overloadRoutine === null) parts.push(`과부하 끝 power /= ${Num(n.overloadMultiplier)}`)
      if (parts.length > 0) {
        events.push(`${parts.join(', ')} : ${F2(p0)} → ${F2(n.power)} (있어야 할 값 ${F2(buffs.Value)})`)
        // 화면용 기록: 한 프레임에 둘이 끝나면 합친 결과만 남긴다
        const ops = [cell0 !== null && n.cellRoutine === null ? `−${Num(n.cellBonus)}` : '', overload0 !== null && n.overloadRoutine === null ? `÷${Num(n.overloadMultiplier)}` : ''].filter(Boolean)
        history.push({ op: ops.join(' '), result: n.power, dup: false })
        at.end = clock
        lastEndWasTick = true
      }
      checkDrift()
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot: () => `power=${F2(n.power)} expect=${F2(buffs.Value)} timers=${n.RunningCount} cell=${F2(Left(n.cellRoutine))} overload=${F2(Left(n.overloadRoutine))}`,
    view(): SimView {
      const expect = buffs.Value
      const running = n.RunningCount
      const world: WorldItem[] = [
        { kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' },
        { kind: 'actor', x: 1.4, y: 1, role: 'ally', label: '하린', pose: running ? 'attack' : 'idle' },
        { kind: 'text', x: 0.4, y: 8.3, text: `power = ${F2(n.power)}`, align: 'left', size: 26, color: lastDrift || recent(at.bug, 0.8) ? COLOR.bug : '#ffb547' },
        { kind: 'text', x: 0.4, y: 7.6, text: `돌고 있는 타이머 ${running}개 · 멈춘 타이머 ${skipped.length}개 · 있어야 할 값 ${F2(expect)}`, align: 'left', size: 20, color: COLOR.dim },
      ]
      const xAt = powerBar(world, n.power, n.basePower, full, lastDrift ? COLOR.bug : '#ffb547')
      // 같은 입력을 받은 데코레이터 코어의 출력 (있어야 할 값)
      world.push({ kind: 'box', x: xAt(expect) - 0.06, y: BAR.y - 0.2, w: 0.12, h: 0.72, stroke: COLOR.base, dashed: true })
      if (lastDrift) {
        const x = xAt(n.power)
        const d = f(n.power - n.basePower)
        world.push(
          { kind: 'box', x: x - 0.05, y: BAR.y - 0.2, w: 0.1, h: 0.72, fill: COLOR.bug },
          // 기본값 눈금 글과 겹치지 않게 그 오른쪽에 둔다
          { kind: 'text', x: Math.max(x + 0.2, xAt(n.basePower) + 1), y: BAR.y - 0.6, text: `멈춘 막대 끝 ${F2(n.power)} (기본값 ${d > 0 ? '+' : ''}${F2(d)})`, align: 'left', size: 18, color: COLOR.bug },
        )
      }
      // 돌고 있는 코루틴 (흉내 낸 타이머)
      const slots: [string, WaitTimer | null, number, string][] = [
        ['냉각 셀', n.cellRoutine, n.cellDuration, `끝나면 −${Num(n.cellBonus)}`],
        ['과부하', n.overloadRoutine, n.overloadDuration, `끝나면 ÷${Num(n.overloadMultiplier)}`],
      ]
      slots.forEach(([label, t, dur, then], i) => {
        const x = BAR.x + i * 6.2
        if (t !== null) world.push({ kind: 'bar', x, y: 4.1, w: 5.6, value: t.Remaining / dur, fill: i === 0 ? COLOR.add : COLOR.mul, label: `${label} 코루틴 ${F2(t.Remaining)}초 · ${then}` })
        else world.push({ kind: 'text', x, y: 4.15, text: `${label} 코루틴 없음`, align: 'left', size: 18, color: '#4a5872' })
      })
      if (skipped.length) world.push({ kind: 'text', x: BAR.x, y: 3.35, text: `멈춰서 영영 돌지 않은 끝 처리: ${skipped.join(', ')}`, align: 'left', size: 18, color: COLOR.bug })
      // power 를 직접 고친 순서 (최근 6개)
      world.push({ kind: 'text', x: BAR.x, y: 2.7, text: 'power 를 직접 고친 순서', align: 'left', size: 18, color: COLOR.dim })
      history.slice(-6).forEach((h, i) => {
        const x = BAR.x + i * 2
        world.push(
          { kind: 'box', x, y: 1.3, w: 1.85, h: 1.1, fill: '#162135', stroke: h.dup ? COLOR.bug : '#26344c' },
          { kind: 'text', x: x + 0.92, y: 1.95, text: h.op, size: 20, color: h.dup ? COLOR.bug : COLOR.text },
          { kind: 'text', x: x + 0.92, y: 1.5, text: F2(h.result), size: 18, color: COLOR.dim },
        )
      })
      const active = ['n-power']
      if (recent(at.input)) active.push('n-start', 'start-power', 'start-routine', 'n-routine')
      if (recent(at.end)) active.push('n-end', 'end-power', ...(lastEndWasTick ? ['routine-end', 'n-routine'] : []))
      return { world, active }
    },
  }
}
