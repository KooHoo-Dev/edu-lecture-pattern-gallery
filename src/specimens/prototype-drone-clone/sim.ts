import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/prototype-drone-clone 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/prototype-drone-clone/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다. */

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

/** C# Object.MemberwiseClone: 같은 형식의 새 객체에 필드를 그대로 복사한다 (참조 필드는 주소만) */
function memberwiseClone<T extends object>(o: T): T {
  return Object.assign(Object.create(Object.getPrototypeOf(o)) as T, o)
}

/* ───────── Core/ScoutDrone.cs ───────── */

class ScoutDrone {
  Name: string
  MaxHp: number
  Hp: number
  Speed: number
  Modules: string[]
  constructor(name: string, maxHp: number, speed: number, modules: Iterable<string>) {
    this.Name = name
    this.MaxHp = Math.max(1, maxHp)
    this.Hp = this.MaxHp
    this.Speed = f(speed)
    this.Modules = [...modules]
  }
  static CreateDefaultTemplate() {
    return new ScoutDrone('정찰 드론', 100, 4, ['카메라'])
  }
  Clone(): ScoutDrone {
    const copy = memberwiseClone(this)
    copy.Modules = [...this.Modules]
    return copy
  }
  TakeDamage(amount: number) {
    if (amount <= 0) return
    this.Hp = Math.max(0, this.Hp - amount)
  }
  AddSpeed(amount: number) {
    this.Speed = f(this.Speed + amount)
  }
}

/* ───────── Core/Hangar.cs ───────── */

class Hangar {
  MaxClones = 5
  DamageAmount = 40
  UpgradeSpeed = f(2)
  ModuleName = '냉각'
  Template: ScoutDrone
  private clones: ScoutDrone[] = []
  get Clones(): readonly ScoutDrone[] {
    return this.clones
  }
  Cloned = new Event<[ScoutDrone]>()
  CloneRejected = new Event<[number]>()
  ModuleAttached = new Event<[ScoutDrone, string]>()
  Damaged = new Event<[ScoutDrone, number]>()
  TemplateUpgraded = new Event<[number, number]>()
  NoClone = new Event<[string]>()

  constructor(template: ScoutDrone) {
    this.Template = template
  }
  CloneTemplate(): ScoutDrone | null {
    if (this.clones.length >= this.MaxClones) {
      this.CloneRejected.invoke(this.MaxClones)
      return null
    }
    const drone = this.Template.Clone()
    this.clones.push(drone)
    drone.Name = '#' + this.clones.length
    this.Cloned.invoke(drone)
    return drone
  }
  AttachModule() {
    if (this.clones.length === 0) {
      this.NoClone.invoke('module')
      return
    }
    const target = this.clones[this.clones.length - 1]
    target.Modules.push(this.ModuleName)
    this.ModuleAttached.invoke(target, this.ModuleName)
  }
  DamageFirst() {
    if (this.clones.length === 0) {
      this.NoClone.invoke('damage')
      return
    }
    const target = this.clones[0]
    target.TakeDamage(this.DamageAmount)
    this.Damaged.invoke(target, this.DamageAmount)
  }
  UpgradeTemplate() {
    const previous = this.Template.Speed
    this.Template.AddSpeed(this.UpgradeSpeed)
    this.TemplateUpgraded.invoke(previous, this.Template.Speed)
  }
}

/* ───────── Naive/NaiveHangar.cs ───────── */

class NaiveScoutDrone {
  Name = ''
  MaxHp = 0
  Hp = 0
  Speed = 0
  Modules: string[] = []
  Clone(): NaiveScoutDrone {
    return memberwiseClone(this) // 얕은 복사: Modules 는 견본과 같은 배열
  }
}

class NaiveHangar {
  maxClones = 5
  damageAmount = 40
  upgradeSpeed = f(2)
  moduleName = '냉각'
  template: NaiveScoutDrone
  clones: NaiveScoutDrone[] = []
  constructor() {
    this.template = Object.assign(new NaiveScoutDrone(), { Name: '정찰 드론', MaxHp: 100, Hp: 100, Speed: f(4) })
    this.template.Modules.push('카메라')
  }
  OnClone() {
    if (this.clones.length >= this.maxClones) return
    const drone = this.template.Clone()
    this.clones.push(drone)
    drone.Name = '#' + this.clones.length
  }
  OnModule() {
    if (this.clones.length === 0) return
    this.clones[this.clones.length - 1].Modules.push(this.moduleName)
  }
  OnDamage() {
    if (this.clones.length === 0) return
    const first = this.clones[0]
    first.Hp = Math.max(0, first.Hp - this.damageAmount)
  }
  OnUpgrade() {
    this.template.Speed = f(this.template.Speed + this.upgradeSpeed)
  }
}

/* ───────── truth/prototype-drone-clone/Target.cs 와 같은 어댑터 ───────── */

const F2 = (v: number) => v.toFixed(2)
const Mods = (m: readonly string[]) => `[${m.join(' ')}]`
const CloneLine = (name: string, hp: number, speed: number, modules: string[], templateModules: string[]) =>
  `복제 ${name} · HP ${hp} 속도 ${F2(speed)} · 모듈 ${Mods(modules)} (${modules === templateModules ? '견본과 같은 목록' : '새 목록'})`
const Rejected = (max: number) => `복제 거절: 활주로가 가득 찼다 (${max}/${max})`
const Attached = (name: string, module: string, modules: string[]) => `${name} 에 ${module} 장착 → ${name} 모듈 ${Mods(modules)}`
const DamagedLine = (name: string, amount: number, hp: number) => `${name} 피해 ${amount} → HP ${hp}`
const Upgraded = (from: number, to: number) => `견본 개조: 속도 ${F2(from)} → ${F2(to)} (이미 나간 복제본은 그대로)`
const NoCloneLine = (input: string) => `복제본이 없다 (${input === 'module' ? '모듈 장착' : '피해'})`

/** 견본과 복제본 가운데 같은 Modules 목록을 가리키는 가장 큰 무리의 크기. 모두 따로면 0 */
function Shared(lists: string[][]) {
  let best = 0
  for (const a of lists) {
    const n = lists.filter(b => b === a).length
    if (n > best) best = n
  }
  return best > 1 ? best : 0
}
const Join = <T>(items: readonly T[], fn: (x: T) => string) => items.map(fn).join(',') || '-'

/* ───────── 무대 그림 ───────── */

interface DroneLike {
  Name: string
  MaxHp: number
  Hp: number
  Speed: number
  Modules: string[]
}

const C = { ok: '#7ee081', bug: '#ff5d6c', warn: '#ffb547', dim: '#8796ae', faint: '#4a5872', line: '#56688a', camera: '#34445e', cool: '#1f5f7a', fresh: '#2f7d4a', hp: '#5cc8ff', hpLow: '#ff6b6b' }
/** 견본 x, 드론이 떠 있는 높이, 복제본 자리 */
const TX = 1.6
const BASE = 3.6
const CX = (i: number) => 4.4 + i * 2.1
/** 드론 아래 모듈 목록 상자의 위쪽, 모듈 한 칸 */
const LIST_TOP = 2.95
const ROW = 0.42
const GAP = 0.06
const MOD_W = 1.5

type Kind = 'clone' | 'rejected' | 'module' | 'damage' | 'upgrade' | 'none' | ''
const PATH: Record<Exclude<Kind, ''>, string[]> = {
  // 어댑터 → Hangar → 견본.Clone() → 복제본 → 새 목록, 어댑터가 프리팹을 Instantiate
  clone: ['mb', 'mb-hangar', 'hangar', 'hangar-template', 'template', 'template-clone', 'clone', 'clone-clist', 'clist', 'mb-prefab', 'prefab'],
  rejected: ['mb', 'mb-hangar', 'hangar'],
  module: ['mb-hangar', 'hangar', 'hangar-clone', 'clone', 'clone-clist', 'clist'],
  damage: ['mb-hangar', 'hangar', 'hangar-clone', 'clone'],
  upgrade: ['mb-hangar', 'hangar', 'hangar-template', 'template'],
  none: ['mb-hangar', 'hangar'],
}
const NPATH: Record<Exclude<Kind, ''>, string[]> = {
  clone: ['nhangar', 'nhangar-ntemplate', 'ntemplate', 'ntemplate-nclones', 'nclones', 'nclones-nlist', 'ntemplate-nlist', 'nlist'],
  rejected: ['nhangar'],
  module: ['nhangar', 'nhangar-nclones', 'nclones', 'nclones-nlist', 'nlist', 'ntemplate-nlist'],
  damage: ['nhangar', 'nhangar-nclones', 'nclones'],
  upgrade: ['nhangar', 'nhangar-ntemplate', 'ntemplate'],
  none: ['nhangar'],
}

/** 드론 하나: 마름모, 이름, HP 바, 바닥의 속도 화살표 */
function droneItems(d: DroneLike, x: number, label: string, scale: number, hurt: boolean): WorldItem[] {
  const top = BASE + 1.4 * scale + 0.55
  const ratio = d.Hp / d.MaxHp
  const len = Math.min(1.9, 0.2 * d.Speed)
  return [
    { kind: 'actor', x, y: BASE, role: 'neutral', label, scale, pose: hurt ? 'hurt' : 'idle' },
    { kind: 'bar', x: x - 0.6, y: top, w: 1.2, value: ratio, fill: ratio <= 0.3 ? C.hpLow : C.hp, label: `HP ${d.Hp}` },
    { kind: 'arrow', x1: x - 0.8, y1: 0.66, x2: x - 0.8 + len, y2: 0.66, color: C.dim },
    { kind: 'text', x: x - 0.8, y: 0.2, text: `속도 ${d.Speed.toFixed(1)}`, align: 'left', size: 15, color: C.dim },
  ]
}

/** 패턴: 드론마다 자기 목록 상자 (세로로 쌓은 모듈) */
/** 드론 아래에서 목록으로 가는 화살표의 시작 높이 (견본은 받침대 아래에서) */
const fromY = (x: number) => (x === TX ? BASE - 0.36 : BASE - 0.05)

function ownList(x: number, modules: string[], freshLast: boolean): WorldItem[] {
  const n = Math.min(3, modules.length)
  const h = 0.08 + n * (ROW + GAP)
  const items: WorldItem[] = [
    { kind: 'arrow', x1: x, y1: fromY(x), x2: x, y2: LIST_TOP + 0.03, color: C.line },
    { kind: 'box', x: x - 0.83, y: LIST_TOP - h, w: 1.66, h, stroke: C.line, dashed: true },
  ]
  for (let i = 0; i < n; i++) {
    const m = modules[i]
    const fresh = freshLast && i === modules.length - 1
    items.push({ kind: 'box', x: x - MOD_W / 2, y: LIST_TOP - 0.04 - (i + 1) * (ROW + GAP) + GAP, w: MOD_W, h: ROW, fill: fresh ? C.fresh : m === '카메라' ? C.camera : C.cool, label: m })
  }
  if (modules.length > 3) items.push({ kind: 'text', x: x + 0.86, y: LIST_TOP - h + 0.05, text: `+${modules.length - 3}`, align: 'left', size: 15, color: C.dim })
  return items
}

export const createSim: SimFactory = (values: ParamValues, isNaive: boolean): PatternSim => {
  const intOf = (k: string) => Math.round(Number(values[k]))
  const events: string[] = []
  let clock = 0
  const at = { input: -9, damage: -9, attach: -9, reject: -9, bug: -9 }
  let kind: Kind = ''
  let note = ''
  let sharedBug = false
  let templateBug = false
  let lastModuleTarget = ''
  /** 마지막으로 모듈을 단 복제본 (패턴 그림에서 방금 단 상자를 칠한다) */
  let attachIndex = -1

  const hangar = new Hangar(ScoutDrone.CreateDefaultTemplate())
  hangar.MaxClones = intOf('maxClones')
  hangar.DamageAmount = intOf('damageAmount')
  hangar.UpgradeSpeed = f(Number(values.upgradeSpeed))

  let naive: NaiveHangar | null = null
  if (isNaive) {
    naive = new NaiveHangar()
    naive.maxClones = intOf('maxClones')
    naive.damageAmount = intOf('damageAmount')
    naive.upgradeSpeed = f(Number(values.upgradeSpeed))
  } else {
    hangar.Cloned.add(d => {
      events.push(CloneLine(d.Name, d.Hp, d.Speed, d.Modules, hangar.Template.Modules))
      kind = 'clone'
      note = `${d.Name}: 값은 복사, Modules 는 새 목록`
    })
    hangar.CloneRejected.add(max => {
      events.push(Rejected(max))
      kind = 'rejected'
      at.reject = clock
      note = `활주로 ${max}자리가 가득 차 복제를 받지 않았다`
    })
    hangar.ModuleAttached.add((d, m) => {
      events.push(Attached(d.Name, m, d.Modules))
      kind = 'module'
      at.attach = clock
      attachIndex = hangar.Clones.indexOf(d)
      note = `${m} 모듈은 ${d.Name} 의 목록에만 들어갔다`
    })
    hangar.Damaged.add((d, amount) => {
      events.push(DamagedLine(d.Name, amount, d.Hp))
      kind = 'damage'
      at.damage = clock
      note = `피해는 ${d.Name} 의 Hp 에만`
    })
    hangar.TemplateUpgraded.add((from, to) => {
      events.push(Upgraded(from, to))
      kind = 'upgrade'
      note = `견본 속도 ${to.toFixed(1)}: 다음 복제본부터`
    })
    hangar.NoClone.add(input => {
      events.push(NoCloneLine(input))
      kind = 'none'
      note = '복제본이 없다'
    })
  }

  const CoreInput = (name: string) => {
    if (name === 'clone') hangar.CloneTemplate()
    else if (name === 'module') hangar.AttachModule()
    else if (name === 'damage') hangar.DamageFirst()
    else if (name === 'upgrade') hangar.UpgradeTemplate()
  }

  const findBugs = (n: NaiveHangar) => {
    const wrong: string[] = []
    for (let i = 0; i < n.clones.length; i++) if (Mods(n.clones[i].Modules) !== Mods(hangar.Clones[i].Modules)) wrong.push(n.clones[i].Name)
    if (!sharedBug && wrong.length > 0) {
      sharedBug = true
      events.push(`!모듈 공유: ${wrong.join(' ')} 에도 ${n.moduleName} 모듈이 보인다 (단 것은 ${lastModuleTarget} 하나)`)
      at.bug = clock
    }
    if (!templateBug && Mods(n.template.Modules) !== Mods(hangar.Template.Modules)) {
      templateBug = true
      events.push(`!견본 오염: 견본 목록에도 ${n.moduleName} 모듈이 생겼다 (다음 복제본이 달고 나온다)`)
      at.bug = clock
    }
  }

  const naiveInput = (n: NaiveHangar, name: string) => {
    const count0 = n.clones.length
    const speed0 = n.template.Speed
    if (name === 'clone') n.OnClone()
    else if (name === 'module') n.OnModule()
    else if (name === 'damage') n.OnDamage()
    else if (name === 'upgrade') n.OnUpgrade()

    if (name === 'clone') {
      if (n.clones.length === count0) {
        events.push(Rejected(n.maxClones))
        kind = 'rejected'
        at.reject = clock
        note = `활주로 ${n.maxClones}자리가 가득 차 복제를 받지 않았다`
      } else {
        const d = n.clones[n.clones.length - 1]
        events.push(CloneLine(d.Name, d.Hp, d.Speed, d.Modules, n.template.Modules))
        kind = 'clone'
        note = `${d.Name}: 값은 복사, Modules 는 견본 목록의 주소`
        const expected = Mods(hangar.Clones[n.clones.length - 1].Modules)
        if (Mods(d.Modules) !== expected) {
          events.push(`${d.Name} 가 ${n.moduleName} 모듈을 달고 나왔다 (있어야 할 모듈 ${expected})`)
          note = `${d.Name} 가 견본의 목록을 함께 가리켜 ${n.moduleName} 모듈을 달고 나왔다`
        }
      }
    } else if (name === 'module') {
      if (count0 === 0) {
        events.push(NoCloneLine('module'))
        kind = 'none'
        note = '복제본이 없다'
      } else {
        const d = n.clones[count0 - 1]
        lastModuleTarget = d.Name
        events.push(Attached(d.Name, n.moduleName, d.Modules))
        kind = 'module'
        at.attach = clock
        note = `${d.Name} 에 달았는데 같은 목록이라 모두에게 보인다`
      }
    } else if (name === 'damage') {
      if (count0 === 0) {
        events.push(NoCloneLine('damage'))
        kind = 'none'
        note = '복제본이 없다'
      } else {
        events.push(DamagedLine(n.clones[0].Name, n.damageAmount, n.clones[0].Hp))
        kind = 'damage'
        at.damage = clock
        note = `피해는 ${n.clones[0].Name} 에만: Hp 는 값으로 복사됐다`
      }
    } else if (name === 'upgrade') {
      events.push(Upgraded(speed0, n.template.Speed))
      kind = 'upgrade'
      note = `견본 속도 ${n.template.Speed.toFixed(1)}: Speed 는 값이라 나간 복제본은 그대로`
    }
    findBugs(n)
  }

  const recent = (t: number, within = 0.35) => clock - t < within

  return {
    input(name) {
      at.input = clock
      kind = ''
      CoreInput(name)
      if (naive) naiveInput(naive, name)
    },
    tick(dt) {
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot() {
      if (!naive) {
        const all = [hangar.Template.Modules, ...hangar.Clones.map(d => d.Modules)]
        return `clones=${hangar.Clones.length} tspeed=${F2(hangar.Template.Speed)} tmods=${hangar.Template.Modules.length} hp=${Join(hangar.Clones, d => String(d.Hp))} speed=${Join(hangar.Clones, d => F2(d.Speed))} mods=${Join(hangar.Clones, d => String(d.Modules.length))} shared=${Shared(all)}`
      }
      const n = naive
      const lists = [n.template.Modules, ...n.clones.map(d => d.Modules)]
      return `clones=${n.clones.length} tspeed=${F2(n.template.Speed)} tmods=${n.template.Modules.length} hp=${Join(n.clones, d => String(d.Hp))} speed=${Join(n.clones, d => F2(d.Speed))} mods=${Join(n.clones, d => String(d.Modules.length))} shared=${Shared(lists)} emods=${Join(hangar.Clones, d => String(d.Modules.length))}`
    },
    view(): SimView {
      const tmpl: DroneLike = naive ? naive.template : hangar.Template
      const list: readonly DroneLike[] = naive ? naive.clones : hangar.Clones
      const max = naive ? naive.maxClones : hangar.MaxClones
      const world: WorldItem[] = [
        { kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' },
        // 받침대
        { kind: 'box', x: 0.6, y: BASE - 0.32, w: 2, h: 0.3, fill: '#3a4a66', stroke: C.line },
      ]
      // 빈 활주로 자리 (maxClones)
      for (let i = list.length; i < max; i++) world.push({ kind: 'box', x: CX(i) - 0.55, y: BASE, w: 1.1, h: 1.1, stroke: C.faint, dashed: true })
      // 드론
      world.push(...droneItems(tmpl, TX, '견본', 1, false))
      list.forEach((d, i) => world.push(...droneItems(d, CX(i), d.Name, 0.8, i === 0 && recent(at.damage, 0.25))))
      if (recent(at.damage) && list.length > 0) world.push({ kind: 'ring', x: CX(0), y: BASE + 0.45, r: 0.7, color: C.warn })
      if (recent(at.reject, 0.8)) world.push({ kind: 'ring', x: TX, y: BASE + 0.7, r: 0.95, color: C.warn })

      let sharedText: string
      let sharedColor: string
      if (!naive) {
        // 패턴: 드론마다 자기 목록
        world.push(...ownList(TX, tmpl.Modules, false))
        list.forEach((d, i) => world.push(...ownList(CX(i), d.Modules, recent(at.attach, 0.8) && i === attachIndex)))
        sharedText = 'Modules 공유: 없음 (대마다 새 목록)'
        sharedColor = C.ok
      } else {
        // 나쁜 예: 목록이 하나뿐이다. 견본과 모든 복제본이 그 상자를 가리킨다
        const mods = tmpl.Modules
        const shown = Math.min(5, mods.length)
        const W = 0.16 + shown * (MOD_W + 0.1) - 0.1
        const cx = 8.2
        const top = 2.3
        const left = cx - W / 2
        const drones: { d: DroneLike; x: number; expected: string[] }[] = [
          { d: tmpl, x: TX, expected: hangar.Template.Modules },
          ...list.map((d, i) => ({ d, x: CX(i), expected: hangar.Clones[i]?.Modules ?? [] })),
        ]
        for (const { d, x, expected } of drones) {
          if (d.Modules !== mods) continue
          const wrong = Mods(d.Modules) !== Mods(expected)
          world.push({ kind: 'arrow', x1: x, y1: fromY(x), x2: cx + (x - cx) * 0.3, y2: top + 0.03, color: wrong ? C.bug : C.dim })
        }
        world.push({ kind: 'box', x: left, y: top - 0.58, w: W, h: 0.58, stroke: templateBug ? C.bug : C.warn, dashed: true })
        for (let i = 0; i < shown; i++) {
          const m = mods[i]
          const fresh = recent(at.attach, 0.8) && i === mods.length - 1
          world.push({ kind: 'box', x: left + 0.08 + i * (MOD_W + 0.1), y: top - 0.5, w: MOD_W, h: ROW, fill: fresh ? C.fresh : m === '카메라' ? C.camera : C.cool, label: m })
        }
        if (mods.length > shown) world.push({ kind: 'text', x: left + W + 0.12, y: top - 0.42, text: `+${mods.length - shown}`, align: 'left', size: 15, color: C.dim })
        world.push({ kind: 'text', x: cx, y: 1.2, text: 'List<string> 하나 · 모두 같은 주소', size: 16, color: templateBug ? C.bug : C.warn })
        if (templateBug) {
          world.push({ kind: 'ring', x: TX, y: BASE + 0.7, r: 0.95, color: C.bug })
          world.push({ kind: 'text', x: TX + 1.05, y: BASE + 0.55, text: '오염', align: 'left', size: 16, color: C.bug })
        }
        // ✖ 가 뜬 순간: 모듈이 '있어야 할 것' 과 다른 복제본에 링
        if (recent(at.bug, 1.2)) list.forEach((d, i) => {
          if (Mods(d.Modules) !== Mods(hangar.Clones[i]?.Modules ?? [])) world.push({ kind: 'ring', x: CX(i), y: BASE + 0.45, r: 0.7, color: C.bug })
        })
        const shared = Shared([naive.template.Modules, ...naive.clones.map(d => d.Modules)])
        sharedText = shared > 0 ? `Modules 공유: ${shared}대 · HP·속도는 대마다 따로` : 'Modules 공유: 아직 견본 하나뿐'
        sharedColor = templateBug ? C.bug : C.warn
      }
      world.push(
        { kind: 'text', x: 0.4, y: 8.3, text: `복제 ${list.length}/${max} · 견본 HP ${tmpl.Hp} 속도 ${tmpl.Speed.toFixed(1)}`, align: 'left', size: 24, color: C.ok },
        { kind: 'text', x: 0.4, y: 7.6, text: sharedText, align: 'left', size: 20, color: sharedColor },
        { kind: 'text', x: 15.6, y: 6.95, text: note, align: 'right', size: 17, color: C.dim },
      )
      const active = recent(at.input, 0.3) && kind ? [...(naive ? NPATH : PATH)[kind]] : []
      return { world, active }
    },
  }
}
