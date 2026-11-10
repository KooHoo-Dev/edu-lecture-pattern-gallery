import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/memento-checkpoint 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/memento-checkpoint/Target.cs 와 같은 글을 만드는 어댑터. float 계산이 없어 fround 는 쓰지 않는다. */

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

/* ───────── Core/ExplorerMemento.cs ───────── */

class ExplorerMemento {
  readonly Hp: number
  readonly Cell: number
  readonly Credits: number
  /** 저장한 순간 인벤토리의 복사본 (C# 는 ReadOnlyCollection) */
  readonly Items: readonly string[]
  constructor(hp: number, cell: number, credits: number, items: Iterable<string>) {
    this.Hp = hp
    this.Cell = cell
    this.Credits = credits
    this.Items = Object.freeze([...items])
  }
}

/* ───────── Core/Explorer.cs ───────── */

class Explorer {
  static readonly LastCell = 8
  readonly MaxHp: number
  Hp: number
  Cell: number
  Credits = 0
  private items: string[] = []
  get Items(): readonly string[] {
    return this.items
  }
  get IsDown() {
    return this.Hp === 0
  }

  Walked = new Event<[number]>()
  PickedUp = new Event<[string, number]>()
  Hurt = new Event<[number]>()
  Downed = new Event<[]>()
  Restored = new Event<[]>()
  InputIgnored = new Event<[string]>()

  constructor(maxHp: number, startCell: number) {
    this.MaxHp = Math.max(1, maxHp)
    this.Hp = this.MaxHp
    this.Cell = Math.max(0, Math.min(Explorer.LastCell, startCell))
  }

  Walk() {
    if (this.IsDown || this.Cell >= Explorer.LastCell) {
      this.InputIgnored.invoke('walk')
      return
    }
    this.Cell++
    this.Walked.invoke(this.Cell)
  }

  PickUp(item: string, credits: number) {
    if (this.IsDown) {
      this.InputIgnored.invoke('pickup')
      return
    }
    const gained = Math.max(0, credits)
    this.items.push(item)
    this.Credits += gained
    this.PickedUp.invoke(item, gained)
  }

  TakeDamage(amount: number) {
    if (this.IsDown || amount <= 0) {
      this.InputIgnored.invoke('hurt')
      return
    }
    this.Hp = Math.max(0, this.Hp - amount)
    const downedNow = this.Hp === 0
    this.Hurt.invoke(amount)
    if (downedNow && this.IsDown) this.Downed.invoke()
  }

  CreateMemento(): ExplorerMemento {
    return new ExplorerMemento(this.Hp, this.Cell, this.Credits, this.items)
  }

  Restore(memento: ExplorerMemento) {
    if (memento == null) throw new Error('memento')
    this.Hp = memento.Hp
    this.Cell = memento.Cell
    this.Credits = memento.Credits
    this.items.length = 0
    this.items.push(...memento.Items)
    this.Restored.invoke()
  }
}

/* ───────── Core/Checkpoint.cs ───────── */

class Checkpoint {
  private explorer: Explorer
  Memento: ExplorerMemento | null = null
  get HasSave() {
    return this.Memento != null
  }
  Saved = new Event<[ExplorerMemento]>()
  SaveRefused = new Event<[]>()
  NothingToRestore = new Event<[]>()

  constructor(explorer: Explorer) {
    this.explorer = explorer
  }

  Save(): boolean {
    if (this.explorer.IsDown) {
      this.SaveRefused.invoke()
      return false
    }
    this.Memento = this.explorer.CreateMemento()
    this.Saved.invoke(this.Memento)
    return true
  }

  Respawn(): boolean {
    if (this.Memento == null) {
      this.NothingToRestore.invoke()
      return false
    }
    this.explorer.Restore(this.Memento)
    return true
  }
}

/* ───────── Naive/NaiveCheckpoint.cs ───────── */

class NaivePlayer {
  hp = 0
  cell = 0
  credits = 0
  items: string[] = []
}

class SaveData {
  hp = 0
  cell = 0
  credits = 0
  items: string[] = []
}

class NaiveCheckpoint {
  static readonly lastCell = 8
  hurtDamage = 50
  fragmentValue = 20
  player = new NaivePlayer()
  saved: SaveData | null = null

  constructor(maxHp: number, startCell: number) {
    this.player.hp = Math.max(1, maxHp)
    this.player.cell = startCell
  }

  OnSave() {
    if (this.player.hp === 0) return
    this.saved = new SaveData()
    this.saved.hp = this.player.hp
    this.saved.cell = this.player.cell
    this.saved.credits = this.player.credits
    this.saved.items = this.player.items // 목록은 참조째 담긴다 (C# 의 문제 줄)
  }

  OnPickup() {
    if (this.player.hp === 0) return
    this.player.items.push('회로 조각')
    this.player.credits += this.fragmentValue
  }

  OnHurt() {
    if (this.player.hp === 0) return
    this.player.hp = Math.max(0, this.player.hp - this.hurtDamage)
  }

  OnWalk() {
    if (this.player.hp === 0 || this.player.cell >= NaiveCheckpoint.lastCell) return
    this.player.cell++
  }

  OnRestore() {
    if (this.saved == null) return
    this.player.hp = this.saved.hp
    this.player.cell = this.saved.cell
    this.player.credits = this.saved.credits
    this.player.items = this.saved.items
  }
}

/* ───────── truth/memento-checkpoint/Target.cs 와 같은 어댑터 ───────── */

const Fragment = '회로 조각'
const StartCell = 1

const WalkLine = (cell: number) => `한 칸 이동 → 칸 ${cell}`
const PickLine = (gained: number, count: number, credits: number, tail: string) => `${Fragment} 주움 (+${gained}) → 인벤토리 ${count}개 크레딧 ${credits}${tail}`
const HurtLine = (amount: number, hp: number) => `피해 ${amount} → HP ${hp}`
const DownLine = '쓰러짐 (HP 0)'
const RestoreLine = (hp: number, cell: number, credits: number, count: number) => `되살림 · HP ${hp} 칸 ${cell} 크레딧 ${credits} 인벤토리 ${count}개`
const SaveLine = (hp: number, cell: number, credits: number, count: number, shared: boolean) =>
  `저장 · HP ${hp} 칸 ${cell} 크레딧 ${credits} 인벤토리 ${count}개 (${shared ? '지금 목록을 그대로 가리킴' : '새 목록에 복사'})`
const SaveRefusedLine = '쓰러져 있어 저장하지 않음'
const NothingLine = '되살릴 저장본이 없다'

function Ignored(input: string, down: boolean) {
  if (!down) return '끝 칸이라 더 가지 않음'
  const label = input === 'walk' ? '이동' : input === 'pickup' ? '줍기' : '피해'
  return `쓰러져 있어 받지 않음 (${label})`
}

function SameItems(a: readonly string[], b: readonly string[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

/* ───────── 무대 그림 ───────── */

const C = { ok: '#7ee081', bug: '#ff5d6c', warn: '#ffb547', dim: '#8796ae', faint: '#4a5872', line: '#56688a', slot: '#34445e', fresh: '#2f7d4a', leak: '#7a5a1f', bad: '#7a2a36', hp: '#5cc8ff', hpLow: '#ff6b6b', flag: '#5cc8ff', panel: '#1a2436' }
/** 칸의 x (칸 사이 거리는 화면에만 있다) */
const CX = (c: number) => 1.2 + c * 1.7
/** 위쪽 두 상자: 지금 상태(왼쪽), 저장본(오른쪽) */
const BOX_Y = 4.2
const BOX_H = 2.3
const BOX_W = 7.2
const NOW_X = 0.4
const SAVE_X = 8.4
/** 인벤토리 목록 상자의 위쪽, 한 칸 */
const LIST_TOP = 3.75
const SLOT_W = 1.2
const SLOT_H = 0.5
const SLOT_GAP = 0.08
const MAX_SLOTS = 5
/** HP 막대의 꽉 찬 값 (조절 값의 최대. 조절 값으로 계산하지 않는다) */
const HP_FULL = 100

type Kind = 'save' | 'refused' | 'pickup' | 'hurt' | 'walk' | 'restore' | 'nothing' | 'ignored' | ''
const PATH: Record<Exclude<Kind, ''>, string[]> = {
  save: ['in', 'in-cp', 'cp', 'cp-ex', 'ex', 'ex-me', 'me', 'me-ml', 'ml', 'cp-me'],
  refused: ['in', 'in-cp', 'cp'],
  pickup: ['in', 'in-ex', 'ex', 'ex-el', 'el'],
  hurt: ['in', 'in-ex', 'ex'],
  walk: ['in', 'in-ex', 'ex'],
  restore: ['in', 'in-cp', 'cp', 'cp-me', 'me', 'cp-ex', 'ex', 'ex-me', 'ex-el', 'el'],
  nothing: ['in', 'in-cp', 'cp'],
  ignored: ['in', 'in-ex', 'ex'],
}
const NPATH: Record<Exclude<Kind, ''>, string[]> = {
  save: ['nmb', 'nmb-ns', 'ns', 'ns-nl', 'nl'],
  refused: ['nmb'],
  pickup: ['nmb', 'nmb-np', 'np', 'np-nl', 'nl'],
  hurt: ['nmb', 'nmb-np', 'np'],
  walk: ['nmb', 'nmb-np', 'np'],
  restore: ['nmb', 'nmb-ns', 'ns', 'nmb-np', 'np', 'ns-nl', 'nl'],
  nothing: ['nmb'],
  ignored: ['nmb', 'nmb-np', 'np'],
}

interface StateLike {
  hp: number
  cell: number
  credits: number
  count: number
}

/** 상태 상자 하나: 제목, HP 막대, 크레딧, 칸과 인벤토리 수, 오른쪽 아래 꼬리표 */
function stateBox(x: number, title: string, s: StateLike | null, chip: string, chipColor: string, frame: string): WorldItem[] {
  const items: WorldItem[] = [
    { kind: 'box', x, y: BOX_Y, w: BOX_W, h: BOX_H, fill: C.panel, stroke: frame },
    { kind: 'text', x: x + 0.2, y: BOX_Y + 1.95, text: title, align: 'left', size: 17, color: C.dim },
  ]
  if (!s) {
    items.push({ kind: 'text', x: x + BOX_W / 2, y: BOX_Y + 0.85, text: '저장본 없음 (Q 저장)', size: 17, color: C.faint })
    return items
  }
  const ratio = s.hp / HP_FULL
  items.push(
    { kind: 'bar', x: x + 0.2, y: BOX_Y + 0.85, w: 3.2, value: ratio, fill: s.hp === 0 ? C.hpLow : C.hp, label: `HP ${s.hp}` },
    { kind: 'text', x: x + 3.8, y: BOX_Y + 0.9, text: `크레딧 ${s.credits}`, align: 'left', size: 20, color: '#e6edf7' },
    { kind: 'text', x: x + 0.2, y: BOX_Y + 0.4, text: `칸 ${s.cell} · 인벤토리 ${s.count}개`, align: 'left', size: 16, color: C.dim },
  )
  if (chip) items.push({ kind: 'text', x: x + BOX_W - 0.2, y: BOX_Y + 0.4, text: chip, align: 'right', size: 15, color: chipColor })
  return items
}

/** 인벤토리 목록 상자: 가운데 cx, 칸마다 색 (fills[i]) */
function listBox(cx: number, fills: string[], stroke: string): WorldItem[] {
  const shown = Math.min(MAX_SLOTS, fills.length)
  const w = Math.max(1.4, 0.16 + shown * (SLOT_W + SLOT_GAP) - SLOT_GAP)
  const h = SLOT_H + 0.2
  const left = cx - w / 2
  const items: WorldItem[] = [{ kind: 'box', x: left, y: LIST_TOP - h, w, h, stroke, dashed: true }]
  if (fills.length === 0) items.push({ kind: 'text', x: cx, y: LIST_TOP - h + 0.22, text: '빈 목록', size: 14, color: C.faint })
  for (let i = 0; i < shown; i++) items.push({ kind: 'box', x: left + 0.08 + i * (SLOT_W + SLOT_GAP), y: LIST_TOP - h + 0.1, w: SLOT_W, h: SLOT_H, fill: fills[i], label: '조각' })
  if (fills.length > shown) items.push({ kind: 'text', x: left + w + 0.12, y: LIST_TOP - h + 0.2, text: `+${fills.length - shown}`, align: 'left', size: 15, color: C.dim })
  return items
}

export const createSim: SimFactory = (values: ParamValues, isNaive: boolean): PatternSim => {
  const intOf = (k: string) => Math.round(Number(values[k]))
  const fragmentValue = intOf('fragmentValue')
  const hurtDamage = intOf('hurtDamage')
  const events: string[] = []
  let clock = 0
  const at = { input: -9, hurt: -9, walk: -9, save: -9, restore: -9, bug: -9, ignored: -9 }
  let kind: Kind = ''
  let note = ''

  let explorer: Explorer | null = null
  let checkpoint: Checkpoint | null = null
  let naive: NaiveCheckpoint | null = null
  /** 나쁜 예: 저장한 순간의 인벤토리 (있어야 할 것). 저장 전 null */
  let savedItems: string[] | null = null
  /** 나쁜 예: 마지막 되살리기가 인벤토리를 돌려놓지 못했다 (다음 저장까지 남긴다) */
  let bugActive = false
  let bugExtra = 0

  if (isNaive) {
    naive = new NaiveCheckpoint(intOf('maxHp'), StartCell)
    naive.fragmentValue = fragmentValue
    naive.hurtDamage = hurtDamage
  } else {
    const ex = new Explorer(intOf('maxHp'), StartCell)
    const cp = new Checkpoint(ex)
    explorer = ex
    checkpoint = cp
    ex.Walked.add(cell => {
      events.push(WalkLine(cell))
      kind = 'walk'
      at.walk = clock
      note = `칸 ${cell} 로 걸었다. 저장본의 칸은 그대로`
    })
    ex.PickedUp.add((_item, gained) => {
      events.push(PickLine(gained, ex.Items.length, ex.Credits, ''))
      kind = 'pickup'
      note = cp.HasSave ? '주운 조각은 지금 목록에만 들어간다' : '아직 저장하지 않았다'
    })
    ex.Hurt.add(amount => {
      events.push(HurtLine(amount, ex.Hp))
      kind = 'hurt'
      at.hurt = clock
      note = `피해 ${amount}: 지금 HP 만 준다`
    })
    ex.Downed.add(() => {
      events.push(DownLine)
      note = '쓰러졌다. R 로 체크포인트에서 되살린다'
    })
    ex.Restored.add(() => {
      events.push(RestoreLine(ex.Hp, ex.Cell, ex.Credits, ex.Items.length))
      kind = 'restore'
      at.restore = clock
      note = '메멘토의 값으로 덮었다. 인벤토리도 저장할 때로'
    })
    ex.InputIgnored.add(input => {
      events.push(Ignored(input, ex.IsDown))
      kind = 'ignored'
      at.ignored = clock
      note = ex.IsDown ? '쓰러져 있어 받지 않는다' : '끝 칸이다'
    })
    cp.Saved.add(m => {
      events.push(SaveLine(m.Hp, m.Cell, m.Credits, m.Items.length, false))
      kind = 'save'
      at.save = clock
      note = '값으로 떠서 저장. 인벤토리는 새 목록에 복사'
    })
    cp.SaveRefused.add(() => {
      events.push(SaveRefusedLine)
      kind = 'refused'
      note = '쓰러진 상태는 저장하지 않는다'
    })
    cp.NothingToRestore.add(() => {
      events.push(NothingLine)
      kind = 'nothing'
      note = '저장본이 없어 되살리지 않았다'
    })
  }

  const coreInput = (name: string) => {
    if (!explorer || !checkpoint) return
    if (name === 'save') checkpoint.Save()
    else if (name === 'pickup') explorer.PickUp(Fragment, fragmentValue)
    else if (name === 'hurt') explorer.TakeDamage(hurtDamage)
    else if (name === 'restore') checkpoint.Respawn()
    else if (name === 'walk') explorer.Walk()
  }

  const naiveInput = (n: NaiveCheckpoint, name: string) => {
    let p = n.player
    const hp0 = p.hp
    const cell0 = p.cell
    const count0 = p.items.length
    const saved0 = n.saved
    if (name === 'save') n.OnSave()
    else if (name === 'pickup') n.OnPickup()
    else if (name === 'hurt') n.OnHurt()
    else if (name === 'restore') n.OnRestore()
    else if (name === 'walk') n.OnWalk()
    p = n.player
    const down = p.hp === 0

    if (name === 'walk') {
      if (p.cell !== cell0) {
        events.push(WalkLine(p.cell))
        kind = 'walk'
        at.walk = clock
        note = `칸 ${p.cell} 로 걸었다. 저장본의 칸은 값이라 그대로`
      } else {
        events.push(Ignored('walk', down))
        kind = 'ignored'
        at.ignored = clock
        note = down ? '쓰러져 있어 받지 않는다' : '끝 칸이다'
      }
    } else if (name === 'pickup') {
      if (p.items.length === count0) {
        events.push(Ignored('pickup', down))
        kind = 'ignored'
        at.ignored = clock
        note = '쓰러져 있어 받지 않는다'
      } else {
        const shared = n.saved != null && n.saved.items === p.items
        const tail = shared ? ` · 저장본 인벤토리도 ${n.saved!.items.length}개 (같은 목록)` : ''
        events.push(PickLine(n.fragmentValue, p.items.length, p.credits, tail))
        kind = 'pickup'
        note = shared ? '같은 목록이라 저장본에도 들어갔다. 크레딧은 따로' : '아직 저장하지 않았다'
      }
    } else if (name === 'hurt') {
      if (p.hp === hp0) {
        events.push(Ignored('hurt', down))
        kind = 'ignored'
        at.ignored = clock
        note = '쓰러져 있어 받지 않는다'
      } else {
        events.push(HurtLine(n.hurtDamage, p.hp))
        kind = 'hurt'
        at.hurt = clock
        note = `피해 ${n.hurtDamage}: 지금 HP 만 준다 (값)`
        if (down) {
          events.push(DownLine)
          note = '쓰러졌다. R 로 체크포인트에서 되살린다'
        }
      }
    } else if (name === 'save') {
      if (n.saved === saved0) {
        events.push(SaveRefusedLine)
        kind = 'refused'
        note = '쓰러진 상태는 저장하지 않는다'
      } else {
        const s = n.saved!
        savedItems = [...s.items]
        bugActive = false
        events.push(SaveLine(s.hp, s.cell, s.credits, s.items.length, s.items === p.items))
        kind = 'save'
        at.save = clock
        note = 'HP·칸·크레딧은 값, 인벤토리는 주소만 담았다'
      }
    } else if (name === 'restore') {
      if (n.saved == null) {
        events.push(NothingLine)
        kind = 'nothing'
        note = '저장본이 없어 되살리지 않았다'
      } else {
        events.push(RestoreLine(p.hp, p.cell, p.credits, p.items.length))
        kind = 'restore'
        at.restore = clock
        note = 'HP·칸·크레딧은 돌아왔다'
        if (!SameItems(p.items, savedItems!)) {
          const extra = p.items.length - savedItems!.length
          events.push(`!인벤토리 안 돌아옴: 저장 뒤 주운 ${Fragment} ${extra}개가 그대로 (저장할 때 ${savedItems!.length}개, 되살린 뒤 ${p.items.length}개) · 크레딧은 저장한 값 ${p.credits} 이 돌아옴`)
          bugActive = true
          bugExtra = extra
          at.bug = clock
          note = `크레딧은 돌아왔는데 조각 ${extra}개가 그대로`
        }
      }
    }
  }

  const recent = (t: number, within = 0.35) => clock - t < within

  return {
    input(name) {
      at.input = clock
      kind = ''
      if (naive) naiveInput(naive, name)
      else coreInput(name)
    },
    tick(dt) {
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot() {
      if (explorer && checkpoint) {
        const m = checkpoint.Memento
        const save = m == null ? 'saved=0' : `saved=1 shp=${m.Hp} scell=${m.Cell} scredits=${m.Credits} sitems=${m.Items.length}`
        return `hp=${explorer.Hp} cell=${explorer.Cell} credits=${explorer.Credits} items=${explorer.Items.length} ${save}`
      }
      const n = naive!
      const p = n.player
      const s = n.saved
      const nsave = s == null ? 'saved=0' : `saved=1 shp=${s.hp} scell=${s.cell} scredits=${s.credits} sitems=${s.items.length} shared=${s.items === p.items ? 1 : 0} expect=${savedItems!.length}`
      return `hp=${p.hp} cell=${p.cell} credits=${p.credits} items=${p.items.length} ${nsave}`
    },
    view(): SimView {
      // 그릴 값: 지금 상태와 저장본
      let now: StateLike
      let saved: StateLike | null
      let maxHp: number
      if (explorer && checkpoint) {
        now = { hp: explorer.Hp, cell: explorer.Cell, credits: explorer.Credits, count: explorer.Items.length }
        const m = checkpoint.Memento
        saved = m ? { hp: m.Hp, cell: m.Cell, credits: m.Credits, count: m.Items.length } : null
        maxHp = explorer.MaxHp
      } else {
        const p = naive!.player
        const s = naive!.saved
        now = { hp: p.hp, cell: p.cell, credits: p.credits, count: p.items.length }
        saved = s ? { hp: s.hp, cell: s.cell, credits: s.credits, count: s.items.length } : null
        maxHp = intOf('maxHp')
      }
      const down = now.hp === 0

      const world: WorldItem[] = [{ kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' }]
      // 칸 번호
      for (let c = 0; c <= Explorer.LastCell; c++) world.push({ kind: 'text', x: CX(c), y: 0.35, text: String(c), size: 13, color: C.faint })
      // 체크포인트 깃발: 저장한 칸에 선다
      if (saved) {
        // 깃발 천은 기둥 왼쪽에 둔다 (하린의 이름표와 겹치지 않게)
        const fx = CX(saved.cell) - 0.5
        world.push(
          { kind: 'box', x: fx, y: 1, w: 0.07, h: 1.45, fill: '#c9d3e6' },
          { kind: 'box', x: fx - 0.5, y: 2.05, w: 0.5, h: 0.36, fill: C.flag },
        )
        if (recent(at.save, 0.5)) world.push({ kind: 'ring', x: fx - 0.25, y: 1.9, r: 0.6, color: C.ok })
      }
      // 하린
      const pose = down ? 'down' : recent(at.hurt, 0.3) ? 'hurt' : recent(at.walk, 0.3) ? 'run' : 'idle'
      world.push({ kind: 'actor', x: CX(now.cell), y: 1, role: 'ally', label: '하린', scale: 0.85, pose })
      if (recent(at.restore, 0.5)) world.push({ kind: 'ring', x: CX(now.cell), y: 1.6, r: 0.75, color: bugActive ? C.bug : C.ok })
      if (recent(at.hurt, 0.35)) world.push({ kind: 'ring', x: CX(now.cell), y: 1.6, r: 0.7, color: C.warn })

      // 두 상자
      const nowCx = NOW_X + BOX_W / 2
      const saveCx = SAVE_X + BOX_W / 2
      let nowChip = ''
      let nowChipColor = C.dim
      let saveChip = ''
      let saveChipColor = C.dim
      let line2: string
      let line2Color: string

      if (explorer && checkpoint) {
        const m = checkpoint.Memento
        const savedCount = m ? m.Items.length : explorer.Items.length
        if (m) {
          saveChip = '읽기 전용 복사본'
          saveChipColor = C.ok
        }
        if (recent(at.restore, 1.2)) {
          nowChip = '메멘토의 값으로 덮음'
          nowChipColor = C.ok
        } else if (m && explorer.Items.length > savedCount) {
          nowChip = `저장 뒤 주운 것 ${explorer.Items.length - savedCount}개`
          nowChipColor = C.ok
        }
        world.push(...stateBox(NOW_X, '지금 상태 (Explorer)', now, nowChip, nowChipColor, C.line))
        world.push(...stateBox(SAVE_X, '저장본 (ExplorerMemento)', saved, saveChip, saveChipColor, m ? C.line : C.faint))
        // 목록: 상자마다 따로
        const nowFills = explorer.Items.map((_, i) => (m && i >= savedCount ? C.fresh : C.slot))
        world.push({ kind: 'arrow', x1: nowCx, y1: BOX_Y, x2: nowCx, y2: LIST_TOP + 0.03, color: C.line })
        world.push(...listBox(nowCx, nowFills, C.line))
        if (m) {
          world.push({ kind: 'arrow', x1: saveCx, y1: BOX_Y, x2: saveCx, y2: LIST_TOP + 0.03, color: C.line })
          world.push(...listBox(saveCx, m.Items.map(() => C.slot), C.line))
        }
        line2 = m ? `저장본: 칸 ${m.Cell} · 인벤토리 ${m.Items.length}개 (새 목록에 복사)` : '저장본: 없음'
        line2Color = C.ok
      } else {
        const n = naive!
        const p = n.player
        const s = n.saved
        const shared = s != null && s.items === p.items
        const expect = savedItems ? savedItems.length : p.items.length
        if (s) {
          saveChip = shared ? '인벤토리는 같은 목록' : ''
          saveChipColor = C.warn
        }
        if (bugActive) {
          nowChip = `✖ 저장 뒤 주운 ${bugExtra}개가 그대로`
          nowChipColor = C.bug
        } else if (recent(at.restore, 1.2)) {
          nowChip = 'HP·칸·크레딧만 덮음'
          nowChipColor = C.dim
        } else if (shared && p.items.length > expect) {
          nowChip = `저장 뒤 주운 것 ${p.items.length - expect}개`
          nowChipColor = C.warn
        }
        world.push(...stateBox(NOW_X, '지금 상태 (player)', now, nowChip, nowChipColor, bugActive ? C.bug : C.line))
        world.push(...stateBox(SAVE_X, '저장본 (SaveData)', saved, saveChip, saveChipColor, s ? C.warn : C.faint))
        // 목록이 하나뿐이다. 두 상자가 가운데 목록 상자를 함께 가리킨다
        const cx = 8
        const fills = p.items.map((_, i) => (s && i >= expect ? (bugActive ? C.bad : C.leak) : C.slot))
        const listColor = bugActive ? C.bug : shared ? C.warn : C.line
        world.push({ kind: 'arrow', x1: nowCx, y1: BOX_Y, x2: cx - 0.5, y2: LIST_TOP + 0.03, color: bugActive ? C.bug : shared ? C.warn : C.line })
        if (s) world.push({ kind: 'arrow', x1: saveCx, y1: BOX_Y, x2: cx + 0.5, y2: LIST_TOP + 0.03, color: shared ? C.warn : C.line })
        world.push(...listBox(cx, fills, listColor))
        if (bugActive) {
          line2 = `✖ 인벤토리 안 돌아옴: 조각 ${bugExtra}개가 그대로 · 크레딧은 돌아옴`
          line2Color = C.bug
        } else if (s) {
          line2 = `저장본: 칸 ${s.cell} · 인벤토리는 지금 목록을 그대로 가리킴`
          line2Color = C.warn
        } else {
          line2 = '저장본: 없음'
          line2Color = C.dim
        }
      }
      // 저장·되살리기 순간: 두 상자 사이 화살표 (뜨기 →, ← 덮기)
      if (recent(at.save, 0.6)) world.push({ kind: 'arrow', x1: NOW_X + BOX_W - 0.1, y1: BOX_Y + 1.2, x2: SAVE_X + 0.1, y2: BOX_Y + 1.2, color: C.ok })
      if (recent(at.restore, 0.6)) world.push({ kind: 'arrow', x1: SAVE_X + 0.1, y1: BOX_Y + 0.8, x2: NOW_X + BOX_W - 0.1, y2: BOX_Y + 0.8, color: bugActive ? C.bug : C.ok })

      world.push(
        { kind: 'text', x: 0.4, y: 8.3, text: `하린 HP ${now.hp}/${maxHp} · 칸 ${now.cell} · 크레딧 ${now.credits} · 인벤토리 ${now.count}개${down ? ' · 쓰러짐' : ''}`, align: 'left', size: 22, color: down ? C.warn : C.ok },
        { kind: 'text', x: 0.4, y: 7.6, text: line2, align: 'left', size: 19, color: line2Color },
        { kind: 'text', x: 15.6, y: 6.9, text: note, align: 'right', size: 16, color: C.dim },
      )
      const active = recent(at.input, 0.3) && kind ? [...(naive ? NPATH : PATH)[kind]] : []
      return { world, active }
    },
  }
}
