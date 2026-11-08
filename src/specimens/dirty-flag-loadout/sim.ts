import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/dirty-flag-loadout 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/dirty-flag-loadout/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다. */

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

/* ───────── Core/Items.cs ───────── */

const Items = {
  Oxygen: '산소 캔',
  OxygenWeight: f(4),
  OxygenModule: f(0.5),
  Kit: '수리 키트',
  KitModule: f(1),
  KitStack: 3,
  Cell: '냉각 셀',
  CellModule: f(0.5),
  CellStack: 2,
  FillStarter(loadout: Loadout, kitWeight: number, cellWeight: number) {
    loadout.Add(Items.Oxygen, Items.OxygenWeight, Items.OxygenModule, 1)
    loadout.Add(Items.Kit, kitWeight, Items.KitModule, Items.KitStack)
    loadout.Add(Items.Kit, kitWeight, Items.KitModule, Items.KitStack)
    loadout.Add(Items.Cell, cellWeight, Items.CellModule, Items.CellStack)
  },
}

/* ───────── Core/Loadout.cs ───────── */

interface SlotInfo {
  Name: string
  Count: number
  UnitWeight: number
  ModuleWeight: number
  Alloy: boolean
  Weight: number
}

const MaxWeight = f(30)
const MinSpeedRatio = f(0.25)
const AlloyRatio = f(0.5)
const MaxSlots = 5

class Slot {
  Name = ''
  Count = 0
  BaseUnitWeight = 0
  ModuleWeight = 0
  MaxStack = 1
  Alloy = false
  get UnitWeight() {
    return this.Alloy ? f(this.BaseUnitWeight * AlloyRatio) : this.BaseUnitWeight
  }
  Weight() {
    return f(f(this.UnitWeight * this.Count) + this.ModuleWeight)
  }
}

class Loadout {
  private readonly slots: Slot[] = [] // [1]
  private dirty = true
  private cachedWeight = 0
  RecalcCount = 0
  BaseSpeed: number
  CountChanged = new Event<[string, number, number]>()
  UnitWeightChanged = new Event<[string, number, number]>()
  Ignored = new Event<[string]>()
  Recalculated = new Event<[number, number]>()

  constructor(baseSpeed: number) {
    this.BaseSpeed = baseSpeed
  }
  get IsDirty() {
    return this.dirty
  }
  get SlotCount() {
    return this.slots.length
  }
  At(index: number): SlotInfo {
    const s = this.slots[index]
    return { Name: s.Name, Count: s.Count, UnitWeight: s.UnitWeight, ModuleWeight: s.ModuleWeight, Alloy: s.Alloy, Weight: s.Weight() }
  }

  get TotalWeight() {
    if (this.dirty) this.Recalculate() // [3]
    return this.cachedWeight // [4]
  }

  get Speed() {
    return f(this.BaseSpeed * Math.max(MinSpeedRatio, f(1 - f(this.TotalWeight / MaxWeight))))
  }

  Add(name: string, unitWeight: number, moduleWeight: number, maxStack: number) {
    const stack = findLast(this.slots, s => s.Name === name)
    if (stack && stack.Count < stack.MaxStack) {
      stack.Count++
      this.MarkDirty()
      this.CountChanged.invoke(name, stack.Count - 1, stack.Count)
      return true
    }
    if (this.slots.length >= MaxSlots) {
      this.Ignored.invoke('칸이 가득 찼다')
      return false
    }
    const s = new Slot()
    s.Name = name
    s.Count = 1
    s.BaseUnitWeight = unitWeight
    s.ModuleWeight = moduleWeight
    s.MaxStack = maxStack
    this.slots.push(s)
    this.MarkDirty()
    this.CountChanged.invoke(name, 0, 1)
    return true
  }

  RemoveLast() {
    if (this.slots.length === 0) {
      this.Ignored.invoke('버릴 칸이 없다')
      return false
    }
    const last = this.slots.pop()!
    this.MarkDirty()
    this.CountChanged.invoke(last.Name, last.Count, 0)
    return true
  }

  UseOne(name: string) {
    const slot = findLast(this.slots, s => s.Name === name)
    if (!slot) {
      this.Ignored.invoke(`${name} 없음`)
      return false
    }
    slot.Count--
    if (slot.Count === 0) this.slots.splice(this.slots.indexOf(slot), 1)
    this.MarkDirty()
    this.CountChanged.invoke(name, slot.Count + 1, slot.Count)
    return true
  }

  Upgrade(name: string) {
    const slot = this.slots.find(s => s.Name === name && !s.Alloy)
    if (!slot) {
      this.Ignored.invoke(`합금으로 바꿀 ${name} 없음`)
      return false
    }
    const before = slot.UnitWeight
    slot.Alloy = true
    this.MarkDirty()
    this.UnitWeightChanged.invoke(name, before, slot.UnitWeight)
    return true
  }

  SetUnitWeight(name: string, unitWeight: number) {
    for (const s of this.slots) {
      if (s.Name !== name || s.BaseUnitWeight === unitWeight) continue
      s.BaseUnitWeight = unitWeight
      this.MarkDirty()
    }
  }

  private MarkDirty() {
    this.dirty = true // [2]
  }

  private Recalculate() {
    let sum = 0
    for (const s of this.slots) sum = f(sum + s.Weight()) // [3]
    this.cachedWeight = sum
    this.dirty = false
    this.RecalcCount++
    this.Recalculated.invoke(this.cachedWeight, this.RecalcCount)
  }
}

function findLast<T>(list: T[], match: (t: T) => boolean): T | null {
  for (let i = list.length - 1; i >= 0; i--) if (match(list[i])) return list[i]
  return null
}

/* ───────── Naive/NaiveLoadout.cs ───────── */

class NaiveSlot {
  name = ''
  count = 0
  unitWeight = 0
  moduleWeight = 0
  maxStack = 1
  alloy = false
}

class NaiveLoadout {
  slots: NaiveSlot[] = [] // [!] 바깥에 열어 두어 표시를 건너뛰고 고치는 길이 생긴다
  isDirty = true
  cachedWeight = 0
  recalcCount = 0
  baseSpeed = f(4)

  get TotalWeight() {
    if (this.isDirty) {
      let sum = 0
      for (const s of this.slots) sum = f(sum + f(f((s.alloy ? f(s.unitWeight * AlloyRatio) : s.unitWeight) * s.count) + s.moduleWeight))
      this.cachedWeight = sum
      this.isDirty = false
      this.recalcCount++
    }
    return this.cachedWeight
  }

  get Speed() {
    return f(this.baseSpeed * Math.max(MinSpeedRatio, f(1 - f(this.TotalWeight / MaxWeight))))
  }

  Add(name: string, unitWeight: number, moduleWeight: number, maxStack: number) {
    const stack = findLast(this.slots, s => s.name === name)
    if (stack && stack.count < stack.maxStack) {
      stack.count++
      this.isDirty = true
      return
    }
    if (this.slots.length >= MaxSlots) return
    const s = new NaiveSlot()
    s.name = name
    s.count = 1
    s.unitWeight = unitWeight
    s.moduleWeight = moduleWeight
    s.maxStack = maxStack
    this.slots.push(s)
    this.isDirty = true
  }

  RemoveLast() {
    if (this.slots.length === 0) return
    this.slots.pop()
    this.isDirty = true
  }

  Upgrade(name: string) {
    const slot = this.slots.find(s => s.name === name && !s.alloy)
    if (!slot) return
    slot.alloy = true
    this.isDirty = true
  }
}

const NaiveRepairKit = {
  Use(loadout: NaiveLoadout) {
    const slot = findLast(loadout.slots, s => s.name === '수리 키트')
    if (!slot) return
    slot.count--
    if (slot.count === 0) loadout.slots.splice(loadout.slots.indexOf(slot), 1)
    // [!] 여기서 loadout.isDirty = true 를 켜지 않는다 (캐시된 옛 무게와 속도가 남는다)
  },
}

/* ───────── truth/dirty-flag-loadout/Target.cs 와 같은 어댑터 + 무대 그림 ───────── */

const F2 = (v: number) => v.toFixed(2)
const F1 = (v: number) => v.toFixed(1)
const Left = f(1.2)
const Right = f(14.8)

const countText = (name: string, before: number, after: number) => `${name} ${before} → ${after}${before === 0 ? ' (새 칸)' : after === 0 ? ' (칸 비움)' : ''}`
const recalcText = (count: number, weight: number, speed: number) => `다시 계산 ${count}회 → 총 무게 ${F2(weight)} · 속도 ${F2(speed)}`
const unitOf = (s: NaiveSlot) => (s.alloy ? f(s.unitWeight * AlloyRatio) : s.unitWeight)

interface Captured {
  name: string
  count: number
  unit: number
}

export const createSim: SimFactory = (values: ParamValues, isNaive: boolean): PatternSim => {
  const events: string[] = []
  const kitWeight = f(Number(values.kitWeight))
  const cellWeight = f(Number(values.cellWeight))
  const baseSpeed = f(Number(values.baseSpeed))
  let x = Left
  let dir = 1
  let clock = 0
  const at = { input: -9, kit: -9, recalc: -9, bug: -9, changed: -9 }
  let changedName = ''

  // 패턴
  let loadout: Loadout | null = null

  // 나쁜 예
  let naive: NaiveLoadout | null = null
  let stale = false
  let lastActual = 0
  let lastInput = ''

  const actual = () => {
    let sum = 0
    for (const s of naive!.slots) sum = f(sum + f(f(unitOf(s) * s.count) + s.moduleWeight))
    return sum
  }

  const readNaiveSpeed = () => {
    const n = naive!
    const count = n.recalcCount
    const speed = n.Speed
    if (n.recalcCount !== count) {
      events.push(recalcText(n.recalcCount, n.cachedWeight, speed))
      at.recalc = clock
    }
    return speed
  }

  if (isNaive) {
    naive = new NaiveLoadout()
    naive.baseSpeed = baseSpeed
    naive.Add(Items.Oxygen, Items.OxygenWeight, Items.OxygenModule, 1)
    naive.Add(Items.Kit, kitWeight, Items.KitModule, Items.KitStack)
    naive.Add(Items.Kit, kitWeight, Items.KitModule, Items.KitStack)
    naive.Add(Items.Cell, cellWeight, Items.CellModule, Items.CellStack)
    readNaiveSpeed()
    lastActual = actual()
  } else {
    const l = new Loadout(baseSpeed)
    loadout = l
    Items.FillStarter(l, kitWeight, cellWeight)
    l.CountChanged.add((name, before, after) => {
      events.push(`${countText(name, before, after)} · 표시 ${l.IsDirty ? '켬' : '안 켬'}`)
      at.changed = clock
      changedName = name
    })
    l.UnitWeightChanged.add((name, before, after) => {
      events.push(`${name} 합금: 한 개 ${F2(before)} → ${F2(after)} · 표시 ${l.IsDirty ? '켬' : '안 켬'}`)
      at.changed = clock
      changedName = name
    })
    l.Ignored.add(reason => events.push(`받지 않음: ${reason}`))
    l.Recalculated.add((weight, count) => {
      events.push(recalcText(count, weight, l.Speed))
      at.recalc = clock
    })
    void l.TotalWeight
  }

  const capture = (): Captured[] => naive!.slots.map(s => ({ name: s.name, count: s.count, unit: unitOf(s) }))

  const diff = (before: Captured[]) => {
    const n = naive!
    const flag = ` · 표시 ${n.isDirty ? '켬' : '안 켬'}`
    const after = n.slots
    const len = Math.min(before.length, after.length)
    let i = 0
    while (i < len && before[i].name === after[i].name && before[i].count === after[i].count && before[i].unit === unitOf(after[i])) i++
    if (after.length > before.length) {
      events.push(countText(after[i].name, 0, after[i].count) + flag)
      changedName = after[i].name
    } else if (after.length < before.length) {
      events.push(countText(before[i].name, before[i].count, 0) + flag)
      changedName = before[i].name
    } else if (i < len && before[i].count !== after[i].count) {
      events.push(countText(after[i].name, before[i].count, after[i].count) + flag)
      changedName = after[i].name
    } else if (i < len) {
      events.push(`${after[i].name} 합금: 한 개 ${F2(before[i].unit)} → ${F2(unitOf(after[i]))}${flag}`)
      changedName = after[i].name
    } else {
      events.push('바뀐 것 없음')
      return
    }
    at.changed = clock
  }

  const checkStale = () => {
    const n = naive!
    if (n.isDirty) return
    const a = actual()
    const off = n.cachedWeight !== a
    if (off && !stale) {
      stale = true
      events.push(`!옛 무게: 캐시 ${F2(n.cachedWeight)} · 실제 ${F2(a)} (무게와 속도가 그대로)`)
      at.bug = clock
    } else if (off && a !== lastActual) events.push(`캐시 ${F2(n.cachedWeight)} 그대로 · 실제 ${F2(a)}`)
    else if (!off && stale) {
      stale = false
      events.push(`무게 다시 맞음: ${lastInput} 켠 표시로 수리 키트 몫까지 다시 계산`)
    }
    lastActual = a
  }

  const naiveInput = (name: string) => {
    const n = naive!
    const before = capture()
    if (name === 'pickup') {
      n.Add(Items.Cell, cellWeight, Items.CellModule, Items.CellStack)
      lastInput = '줍기가'
    } else if (name === 'drop') {
      n.RemoveLast()
      lastInput = '버리기가'
    } else if (name === 'useKit') NaiveRepairKit.Use(n)
    else if (name === 'upgrade') {
      n.Upgrade(Items.Oxygen)
      lastInput = '합금 업그레이드가'
    }
    diff(before)
    checkStale()
  }

  const patternInput = (name: string) => {
    const l = loadout!
    if (name === 'pickup') l.Add(Items.Cell, cellWeight, Items.CellModule, Items.CellStack)
    else if (name === 'drop') l.RemoveLast()
    else if (name === 'useKit') l.UseOne(Items.Kit)
    else if (name === 'upgrade') l.Upgrade(Items.Oxygen)
  }

  /* 무대 그림에 쓰는 값. 계산을 일으키지 않게 캐시와 칸만 읽는다 (패턴은 Tick 마다 읽어 이미 깨끗하다) */
  const slotsForView = (): SlotInfo[] => {
    if (loadout) {
      const list: SlotInfo[] = []
      for (let i = 0; i < loadout.SlotCount; i++) list.push(loadout.At(i))
      return list
    }
    return naive!.slots.map(s => ({ Name: s.name, Count: s.count, UnitWeight: unitOf(s), ModuleWeight: s.moduleWeight, Alloy: s.alloy, Weight: f(f(unitOf(s) * s.count) + s.moduleWeight) }))
  }
  const sumOf = (list: SlotInfo[]) => list.reduce((sum, s) => f(sum + s.Weight), 0)
  const recent = (t: number, within = 0.35) => clock - t < within

  return {
    input(name) {
      at.input = clock
      if (name === 'useKit') at.kit = clock
      if (naive) naiveInput(name)
      else patternInput(name)
    },
    tick(dt) {
      clock += dt
      let speed: number
      if (naive) {
        speed = readNaiveSpeed()
        checkStale()
      } else speed = loadout!.Speed
      x = f(x + f(f(dir * speed) * dt))
      if (x >= Right) {
        x = Right
        dir = -1
      } else if (x <= Left) {
        x = Left
        dir = 1
      }
    },
    drain: () => events.splice(0),
    snapshot: () => {
      const list = slotsForView()
      const counts = list.length === 0 ? '-' : list.map(s => s.Count).join('/')
      if (loadout) return `w=${F2(loadout.TotalWeight)} real=${F2(sumOf(list))} speed=${F2(loadout.Speed)} recalcs=${loadout.RecalcCount} x=${F2(x)} slots=${counts}`
      const n = naive!
      return `w=${F2(n.TotalWeight)} real=${F2(actual())} speed=${F2(n.Speed)} recalcs=${n.recalcCount} x=${F2(x)} slots=${counts}`
    },
    view(): SimView {
      const list = slotsForView()
      const real = sumOf(list)
      const dirty = loadout ? loadout.IsDirty : naive!.isDirty
      // 표시가 켜져 있으면 다음 Tick 에서 다시 계산한다. 그동안은 옛 캐시를 그대로 보인다 (그림이 계산을 일으키지 않게)
      const cached = loadout ? (dirty ? null : loadout.TotalWeight) : naive!.cachedWeight
      const recalcs = loadout ? loadout.RecalcCount : naive!.recalcCount
      const base = loadout ? loadout.BaseSpeed : naive!.baseSpeed
      const shown = cached ?? real
      const speed = f(base * Math.max(MinSpeedRatio, f(1 - f(shown / MaxWeight))))
      const justRecalc = recent(at.recalc, 0.6)
      const world: WorldItem[] = [
        { kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' },
        {
          kind: 'text',
          x: 0.6,
          y: 8.3,
          text: loadout ? `다시 계산 ${recalcs} 회 · 표시 ${dirty ? 'dirty' : 'clean'}` : `다시 계산 ${recalcs} 회 · isDirty ${dirty ? 'true' : 'false'}`,
          align: 'left',
          size: 24,
          color: justRecalc ? '#7ee081' : '#e6ecf5',
        },
        { kind: 'text', x: 0.6, y: 7.6, text: `속도 = ${F1(base)} × (1 − ${F1(shown)} / 30) = ${F2(speed)}`, align: 'left', size: 20, color: '#8796ae' },
        { kind: 'bar', x: 0.6, y: 6.4, w: 7.2, value: shown / MaxWeight, fill: stale ? '#ff6b6b' : '#5cc8ff', label: `총 무게${naive ? ' (캐시)' : ''} ${F1(shown)} / 30` },
      ]
      if (naive) {
        world.push({ kind: 'bar', x: 0.6, y: 5.3, w: 7.2, value: real / MaxWeight, fill: '#8796ae', label: `칸의 실제 합 ${F1(real)}` })
        if (stale) world.push({ kind: 'text', x: 8.4, y: 6.4, text: `✖ 캐시 ${F1(shown)} · 실제 ${F1(real)}`, align: 'left', size: 24, color: '#ff5d6c' })
        if (stale) world.push({ kind: 'text', x: 8.4, y: 5.6, text: '수리 키트가 표시를 안 켰다', align: 'left', size: 18, color: '#ff9f43' })
      } else {
        world.push({ kind: 'text', x: 8.4, y: 6.4, text: justRecalc ? '표시를 보고 한 번 다시 계산' : '바뀌지 않아 캐시를 그대로', align: 'left', size: 20, color: justRecalc ? '#7ee081' : '#8796ae' })
      }
      for (let i = 0; i < MaxSlots; i++) {
        const bx = 0.5 + i * 3.05
        const s = list[i]
        if (!s) {
          world.push({ kind: 'box', x: bx, y: 3.3, w: 2.9, h: 1.6, stroke: '#4a5872', dashed: true })
          world.push({ kind: 'text', x: bx + 1.45, y: 3.95, text: '빈 칸', size: 18, color: '#4a5872' })
          continue
        }
        const hot = recent(at.changed, 0.5) && s.Name === changedName
        world.push({ kind: 'box', x: bx, y: 3.3, w: 2.9, h: 1.6, fill: '#1b2638', stroke: hot ? '#7ee081' : '#4a5872' })
        world.push({ kind: 'text', x: bx + 1.45, y: 4.4, text: `${s.Name}${s.Alloy ? ' (합금)' : ''}`, size: 19 })
        world.push({ kind: 'text', x: bx + 1.45, y: 3.6, text: `×${s.Count} · ${F1(s.Weight)}`, size: 19, color: '#c8d0de' })
      }
      world.push({ kind: 'actor', x, y: 1, role: 'ally', label: `하린 · 속도 ${F2(speed)}`, pose: recent(at.kit, 0.4) ? 'attack' : 'run', facing: dir > 0 ? 1 : -1 })

      const active: string[] = []
      if (naive) {
        if (recent(at.kit)) active.push('n-kit', 'n-kit-slots', 'n-slots')
        else if (recent(at.input)) active.push('n-input', 'n-input-loadout', 'n-loadout')
        if (recent(at.recalc)) active.push('n-mover-loadout', 'n-loadout', 'n-loadout-slots')
      } else {
        if (recent(at.input)) active.push('input', 'input-loadout', 'loadout')
        if (recent(at.recalc)) active.push('mover-loadout', 'loadout', 'slots', 'loadout-slots')
      }
      return { world, active }
    },
  }
}
