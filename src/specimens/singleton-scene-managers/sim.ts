import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/singleton-scene-managers 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/singleton-scene-managers/Target.cs 와 같은 글을 만드는 어댑터 (씬 흉내 SceneObject, SceneSimulator 포함).
 * 씬 흉내가 따르는 Unity 규칙과 단순하게 한 점은 Target.cs 머리 주석에 있다. float 계산은 없다 (모두 int). */

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

/* ───────── Core/SingleSlot.cs ───────── */

class SingleSlot<T extends object> {
  Current: T | null = null
  get IsEmpty() {
    return this.Current === null
  }
  Claimed = new Event<[T]>()
  Rejected = new Event<[T, T]>()
  Released = new Event<[T]>()
  TryClaim(candidate: T): boolean {
    if (candidate === null) throw new Error('ArgumentNullException: candidate')
    if (this.Current === candidate) return true
    if (this.Current !== null) {
      this.Rejected.invoke(candidate, this.Current)
      return false
    }
    this.Current = candidate
    this.Claimed.invoke(candidate)
    return true
  }
  Release(owner: T) {
    if (this.Current === null || this.Current !== owner) return
    this.Current = null
    this.Released.invoke(owner)
  }
}

/* ───────── Core/ExpeditionRules.cs ───────── */

class Credits {
  Balance: number
  Changed = new Event<[number, number]>()
  constructor(start: number) {
    this.Balance = Math.max(0, start)
  }
  Deposit(amount: number) {
    if (amount <= 0) return
    const previous = this.Balance
    this.Balance += amount
    this.Changed.invoke(previous, this.Balance)
  }
}

class Expedition {
  FragmentValue: number
  Fragments = 0
  Changed = new Event<[number]>()
  constructor(fragmentValue: number) {
    this.FragmentValue = fragmentValue
  }
  Pickup() {
    this.Fragments++
    this.Changed.invoke(this.Fragments)
  }
  TakeAll(): number {
    const taken = this.Fragments
    if (taken === 0) return 0
    this.Fragments = 0
    this.Changed.invoke(this.Fragments)
    return taken
  }
}

class Settlement {
  Settled = new Event<[number, number]>()
  Refused = new Event<[string]>()
  Settle(expedition: Expedition | null, bank: Credits | null): boolean {
    if (expedition === null) {
      this.Refused.invoke('탐사 구역에서만 정산')
      return false
    }
    if (bank === null) {
      this.Refused.invoke('크레딧 은행이 없다')
      return false
    }
    const fragments = expedition.TakeAll()
    const credits = fragments * expedition.FragmentValue
    bank.Deposit(credits)
    this.Settled.invoke(fragments, credits)
    return true
  }
}

/* ───────── Naive/NaiveManagers.cs ─────────
 * C# 의 static 은 실행(도메인)에 하나다. 무대는 sim 을 여럿 만들 수 있어서, sim 마다 클래스를 새로 만든다 (도메인 리로드와 같다). */

class MissingReference extends Error {}

function naiveDomain() {
  class NaiveSoundManager {
    static Instance: NaiveSoundManager | null = null
    KeptOnLoad = false
    Playing = false
    Awake() {
      NaiveSoundManager.Instance = this
      this.KeptOnLoad = true
      this.Playing = true
    }
  }

  class NaiveCreditBank {
    static Instance: NaiveCreditBank | null = null
    startCredits = 0
    Credits = 0
    KeptOnLoad = false
    Awake() {
      NaiveCreditBank.Instance = this
      this.KeptOnLoad = true
      this.Credits = this.startCredits
    }
    Deposit(amount: number) {
      this.Credits += amount
    }
  }

  class NaiveLabel {
    Destroyed = false
    private shown = ''
    get text() {
      return this.shown
    }
    set text(value: string) {
      if (this.Destroyed) throw new MissingReference('MissingReferenceException: 파괴된 ExpeditionManager 의 Text 를 건드렸다')
      this.shown = value
    }
  }

  class NaiveExpeditionManager {
    static Instance: NaiveExpeditionManager | null = null
    fragmentValue = 0
    countLabel = new NaiveLabel()
    Fragments = 0
    Destroyed = false
    Awake() {
      NaiveExpeditionManager.Instance = this
    }
    Pickup() {
      this.Fragments++
      this.countLabel.text = '회로 조각 ' + this.Fragments
    }
    TakeAll(): number {
      const credits = this.Fragments * this.fragmentValue
      this.Fragments = 0
      this.countLabel.text = '회로 조각 0'
      return credits
    }
  }

  class NaiveExpeditionInput {
    InField = false
    Pickup() {
      if (!this.InField) return
      NaiveExpeditionManager.Instance!.Pickup()
    }
    Settle() {
      const credits = NaiveExpeditionManager.Instance!.TakeAll()
      NaiveCreditBank.Instance!.Deposit(credits)
    }
  }

  return { NaiveSoundManager, NaiveCreditBank, NaiveExpeditionManager, NaiveExpeditionInput }
}

type Naive = ReturnType<typeof naiveDomain>
type NaiveSoundManager = InstanceType<Naive['NaiveSoundManager']>
type NaiveCreditBank = InstanceType<Naive['NaiveCreditBank']>
type NaiveExpeditionManager = InstanceType<Naive['NaiveExpeditionManager']>

/* ───────── truth/singleton-scene-managers/Target.cs: SceneObject, SceneSimulator ───────── */

class SceneObject {
  readonly Kind: string
  readonly Serial: number
  Scene: string
  PendingDestroy = false
  Destroyed = false
  Awake: (() => void) | null = null
  OnEnable: (() => void) | null = null
  OnDisable: (() => void) | null = null
  OnDestroy: (() => void) | null = null
  Bgm = false
  Credits: Credits | null = null
  Expedition: Expedition | null = null
  NaiveSound: NaiveSoundManager | null = null
  NaiveBank: NaiveCreditBank | null = null
  NaiveExpedition: NaiveExpeditionManager | null = null
  constructor(kind: string, serial: number, scene: string) {
    this.Kind = kind
    this.Serial = serial
    this.Scene = scene
  }
  get Name() {
    return `${this.Kind}#${this.Serial}`
  }
}

class SceneSimulator {
  static readonly Base = 'base'
  static readonly Field = 'field'
  static readonly Ddol = 'ddol'

  Active = ''
  readonly Objects: SceneObject[] = []
  readonly LastDestroyed: SceneObject[] = []
  private spawn: (kind: string, scene: string) => SceneObject
  private log: (s: string) => void

  constructor(spawn: (kind: string, scene: string) => SceneObject, log: (s: string) => void) {
    this.spawn = spawn
    this.log = log
  }

  static Placed(scene: string): string[] {
    return scene === SceneSimulator.Base ? ['SoundManager', 'CreditBank'] : ['ExpeditionManager']
  }

  static Title(scene: string): string {
    return scene === SceneSimulator.Base ? '정비 기지' : scene === SceneSimulator.Field ? '지표 탐사 구역' : 'DontDestroyOnLoad'
  }

  Count(kind: string): number {
    let n = 0
    for (const o of this.Objects) if (o.Kind === kind) n++
    return n
  }

  LoadScene(scene: string) {
    this.LastDestroyed.length = 0
    if (this.Active !== '') {
      this.log(`씬 언로드: ${SceneSimulator.Title(this.Active)}`)
      for (const o of [...this.Objects]) if (o.Scene === this.Active) this.Kill(o, '')
    }
    this.Active = scene
    let kept = 0
    for (const o of this.Objects) if (o.Scene === SceneSimulator.Ddol) kept++
    this.log(kept > 0 ? `씬 로드: ${SceneSimulator.Title(scene)} (DontDestroyOnLoad ${kept}개는 그대로)` : `씬 로드: ${SceneSimulator.Title(scene)}`)
    for (const kind of SceneSimulator.Placed(scene)) {
      const o = this.spawn(kind, scene)
      this.Objects.push(o)
      o.Awake?.()
      if (o.PendingDestroy) this.log(`${o.Name} OnEnable (파괴 예약 중에도 불린다)`)
      o.OnEnable?.()
    }
    this.EndOfFrame()
  }

  Destroy(o: SceneObject) {
    o.PendingDestroy = true
  }

  DontDestroyOnLoad(o: SceneObject) {
    o.Scene = SceneSimulator.Ddol
    this.log(`${o.Name} → DontDestroyOnLoad`)
  }

  private EndOfFrame() {
    for (const o of [...this.Objects]) if (o.PendingDestroy) this.Kill(o, '프레임 끝: ')
  }

  private Kill(o: SceneObject, when: string) {
    this.log(`${when}${o.Name} OnDisable → OnDestroy`)
    o.OnDisable?.()
    o.OnDestroy?.()
    o.Destroyed = true
    this.Objects.splice(this.Objects.indexOf(o), 1)
    this.LastDestroyed.push(o)
  }
}

/* ───────── truth/singleton-scene-managers/Target.cs 와 같은 어댑터 + 무대 그림 ───────── */

const intOf = (values: ParamValues, k: string) => Math.round(Number(values[k]))
const COLOR = { SoundManager: '#2c5282', CreditBank: '#2f6b4a', ExpeditionManager: '#7a5a2a' } as Record<string, string>

export const createSim: SimFactory = (values: ParamValues, isNaive: boolean): PatternSim => {
  const events: string[] = []
  const startCredits = intOf(values, 'startCredits')
  const fragmentValue = intOf(values, 'fragmentValue')
  const serials = new Map<string, number>()
  const spawned: SceneObject[] = []
  let clock = 0
  const at = { persistentSlot: -9, sceneSlot: -9, reject: -9, settle: -9, refuse: -9, pickup: -9, ignore: -9, dup: -9, bug: -9, nre: -9, lost: -9, overwrite: -9 }
  let lastSettled = 0
  let lastLost = 0

  // 패턴
  let soundSlot: SingleSlot<SceneObject> | null = null
  let bankSlot: SingleSlot<SceneObject> | null = null
  let expeditionSlot: SingleSlot<SceneObject> | null = null
  let settlement: Settlement | null = null

  // 나쁜 예
  const N = naiveDomain()
  let naiveInput: InstanceType<Naive['NaiveExpeditionInput']> | null = null
  let reportedSounds = 1
  let reportedBanks = 1
  let lastBank: NaiveCreditBank | null = null
  let lastCredits = 0
  let lastExpedition: NaiveExpeditionManager | null = null
  let lastFragments = 0

  const newSlot = (kind: string) => {
    const slot = new SingleSlot<SceneObject>()
    const mark = () => {
      if (kind === 'ExpeditionManager') at.sceneSlot = clock
      else at.persistentSlot = clock
    }
    slot.Claimed.add(o => {
      events.push(`${o.Name} Awake: TryClaim → 자리 차지`)
      mark()
    })
    slot.Rejected.add((o, owner) => {
      events.push(`${o.Name} Awake: TryClaim 실패 (주인 ${owner.Name}) → Destroy 후 return`)
      at.reject = clock
      mark()
    })
    slot.Released.add(o => {
      events.push(`${o.Kind} 자리 비움`)
      mark()
    })
    return slot
  }
  const slotOf = (kind: string) => (kind === 'SoundManager' ? soundSlot! : kind === 'CreditBank' ? bankSlot! : expeditionSlot!)

  const newObject = (kind: string, scene: string) => {
    const n = (serials.get(kind) ?? 0) + 1
    serials.set(kind, n)
    const o = new SceneObject(kind, n, scene)
    spawned.push(o)
    return o
  }

  const bgm = () => {
    let n = 0
    for (const o of scenes.Objects) if (isNaive ? o.NaiveSound !== null && o.NaiveSound.Playing : o.Bgm) n++
    return n
  }

  const spawnPattern = (kind: string, scene: string) => {
    const o = newObject(kind, scene)
    const slot = slotOf(kind)
    const persistent = kind !== 'ExpeditionManager'
    o.Awake = () => {
      if (!slot.TryClaim(o)) {
        scenes.Destroy(o)
        return
      }
      if (persistent) scenes.DontDestroyOnLoad(o)
      onClaimed(o)
    }
    o.OnDestroy = () => {
      if (!persistent && slot.Current === o && o.Expedition !== null && o.Expedition.Fragments > 0) {
        events.push(`ExpeditionManager 파괴: 정산하지 않은 회로 조각 ${o.Expedition.Fragments}개 사라짐`)
        lastLost = o.Expedition.Fragments
        at.lost = clock
      }
      slot.Release(o)
    }
    return o
  }

  const onClaimed = (o: SceneObject) => {
    if (o.Kind === 'SoundManager') {
      o.Bgm = true
      events.push(`BGM 재생 (${bgm()}겹)`)
    } else if (o.Kind === 'CreditBank') {
      o.Credits = new Credits(startCredits)
      o.Credits.Changed.add((previous, current) => events.push(`CreditBank 크레딧 ${previous} → ${current}`))
    } else {
      o.Expedition = new Expedition(fragmentValue)
      o.Expedition.Changed.add(fragments => events.push(`ExpeditionManager 회로 조각 ${fragments}`))
    }
  }

  const spawnNaive = (kind: string, scene: string) => {
    const o = newObject(kind, scene)
    if (kind === 'SoundManager') {
      const m = new N.NaiveSoundManager()
      o.NaiveSound = m
      o.Awake = () => {
        m.Awake()
        events.push(`${o.Name} Awake: Instance = this`)
        at.overwrite = clock
        if (m.KeptOnLoad) scenes.DontDestroyOnLoad(o)
        if (m.Playing) events.push(`BGM 재생 (${bgm()}겹)`)
      }
    } else if (kind === 'CreditBank') {
      const m = new N.NaiveCreditBank()
      m.startCredits = startCredits
      o.NaiveBank = m
      o.Awake = () => {
        m.Awake()
        events.push(`${o.Name} Awake: Instance = this`)
        at.overwrite = clock
        if (m.KeptOnLoad) scenes.DontDestroyOnLoad(o)
      }
    } else {
      const m = new N.NaiveExpeditionManager()
      m.fragmentValue = fragmentValue
      o.NaiveExpedition = m
      o.Awake = () => {
        m.Awake()
        events.push(`${o.Name} Awake: Instance = this`)
      }
      o.OnDestroy = () => {
        m.Destroyed = true
        m.countLabel.Destroyed = true
      }
    }
    return o
  }

  const nameOf = (m: object | null) => {
    for (const o of spawned) if (o.NaiveSound === m || o.NaiveBank === m || o.NaiveExpedition === m) return o.Name
    return '?'
  }

  const remember = () => {
    lastBank = N.NaiveCreditBank.Instance
    lastCredits = lastBank !== null ? lastBank.Credits : 0
    lastExpedition = N.NaiveExpeditionManager.Instance
    lastFragments = lastExpedition !== null ? lastExpedition.Fragments : 0
  }

  const diff = () => {
    const expedition = N.NaiveExpeditionManager.Instance
    if (expedition !== null && !expedition.Destroyed && expedition === lastExpedition && expedition.Fragments !== lastFragments) {
      events.push(`${nameOf(expedition)} 회로 조각 ${expedition.Fragments}`)
      if (expedition.Fragments > lastFragments) at.pickup = clock
    }
    const bank = N.NaiveCreditBank.Instance
    if (bank !== null && bank === lastBank && bank.Credits !== lastCredits) {
      events.push(`${nameOf(bank)} 크레딧 ${lastCredits} → ${bank.Credits}`)
      lastSettled = bank.Credits - lastCredits
      at.settle = clock
    }
    remember()
  }

  const checkDuplicates = () => {
    const sounds = scenes.Count('SoundManager')
    if (sounds > reportedSounds) {
      reportedSounds = sounds
      events.push(`!중복 매니저: SoundManager ${sounds}개 (BGM ${bgm()}겹)`)
      at.dup = clock
    }
    const banks = scenes.Count('CreditBank')
    if (banks > reportedBanks) {
      reportedBanks = banks
      const bank = N.NaiveCreditBank.Instance!
      events.push(`!중복 매니저: CreditBank ${banks}개 (Instance 는 새 은행 ${nameOf(bank)}, 크레딧 ${bank.Credits})`)
      at.dup = clock
    }
  }

  const call = (action: () => void, skipped: string) => {
    try {
      action()
    } catch (e) {
      if (!(e instanceof MissingReference)) throw e
      events.push(`!파괴된 매니저 호출: ${e.message} → ${skipped}`)
      at.bug = clock
    }
  }

  let scenes: SceneSimulator
  if (isNaive) {
    naiveInput = new N.NaiveExpeditionInput()
    scenes = new SceneSimulator(spawnNaive, s => events.push(s))
  } else {
    soundSlot = newSlot('SoundManager')
    bankSlot = newSlot('CreditBank')
    expeditionSlot = newSlot('ExpeditionManager')
    settlement = new Settlement()
    settlement.Settled.add((fragments, credits) => {
      events.push(`정산: 회로 조각 ${fragments}개 → ${credits} 크레딧`)
      lastSettled = credits
      at.settle = clock
    })
    settlement.Refused.add(reason => {
      events.push(`정산 받지 않음: ${reason}`)
      at.refuse = clock
    })
    scenes = new SceneSimulator(spawnPattern, s => events.push(s))
  }
  scenes.LoadScene(SceneSimulator.Base)
  if (isNaive) remember()

  const patternInput = (name: string) => {
    if (name === 'toField') scenes.LoadScene(SceneSimulator.Field)
    else if (name === 'toBase') scenes.LoadScene(SceneSimulator.Base)
    else if (name === 'pickup') {
      const expedition = expeditionSlot!.Current
      if (expedition === null) {
        events.push('줍기 무시 (기지에는 회로 조각이 없다)')
        at.ignore = clock
      } else {
        expedition.Expedition!.Pickup()
        at.pickup = clock
      }
    } else if (name === 'settle') {
      const expedition = expeditionSlot!.Current
      const bank = bankSlot!.Current
      settlement!.Settle(expedition !== null ? expedition.Expedition : null, bank !== null ? bank.Credits : null)
    }
  }

  const naiveInputOf = (name: string) => {
    const input = naiveInput!
    if (name === 'toField') {
      scenes.LoadScene(SceneSimulator.Field)
      checkDuplicates()
    } else if (name === 'toBase') {
      scenes.LoadScene(SceneSimulator.Base)
      checkDuplicates()
    } else if (name === 'pickup') {
      input.InField = scenes.Active === SceneSimulator.Field
      if (!input.InField) {
        events.push('줍기 무시 (기지에는 회로 조각이 없다)')
        at.ignore = clock
      } else call(() => input.Pickup(), '조각 수가 화면에 보이지 않는다')
    } else if (name === 'settle') {
      if (N.NaiveExpeditionManager.Instance === null) {
        events.push('!빈 Instance 호출: NullReferenceException → 아래 줄(입금)이 실행되지 않았다')
        at.nre = clock
      } else call(() => input.Settle(), '아래 줄(입금)이 실행되지 않았다')
    }
  }

  /* 무대 그림에서 읽는 값 */
  const creditsSeen = (): number | null => {
    if (isNaive) return N.NaiveCreditBank.Instance?.Credits ?? null
    return bankSlot!.Current?.Credits?.Balance ?? null
  }
  const expeditionRef = (): 'none' | 'alive' | 'destroyed' => {
    if (!isNaive) return expeditionSlot!.Current === null ? 'none' : 'alive'
    const e = N.NaiveExpeditionManager.Instance
    return e === null ? 'none' : e.Destroyed ? 'destroyed' : 'alive'
  }
  const fragmentsText = () => {
    if (!isNaive) {
      const e = expeditionSlot!.Current
      return e !== null ? String(e.Expedition!.Fragments) : '-'
    }
    const e = N.NaiveExpeditionManager.Instance
    return e !== null ? String(e.Fragments) : '-'
  }
  const objectOf = (m: NaiveExpeditionManager | null) => spawned.find(o => o.NaiveExpedition === m && m !== null) ?? null

  /** 상자 둘째 줄: 파괴됨, 크레딧, 조각 수, BGM */
  const detailOf = (o: SceneObject) => {
    if (o.Destroyed) {
      // 패턴: 정산하지 않은 조각은 씬과 함께 사라진다 (의도된 동작)
      const lost = !isNaive && o.Kind === 'ExpeditionManager' ? (o.Expedition?.Fragments ?? 0) : 0
      return lost > 0 ? `파괴됨 · 조각 ${lost}개 사라짐` : '파괴됨'
    }
    if (o.Kind === 'CreditBank') {
      const c = isNaive ? o.NaiveBank!.Credits : o.Credits?.Balance
      return c === undefined ? '' : `${c} 크레딧`
    }
    if (o.Kind === 'ExpeditionManager') {
      const f = isNaive ? o.NaiveExpedition!.Fragments : o.Expedition?.Fragments
      return f === undefined ? '' : `회로 조각 ${f}`
    }
    return (isNaive ? o.NaiveSound?.Playing : o.Bgm) ? 'BGM 재생 중' : ''
  }

  const recent = (t: number, within = 0.35) => clock - t < within

  return {
    input(name) {
      if (isNaive) {
        naiveInputOf(name)
        diff()
      } else patternInput(name)
    },
    tick(dt) {
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot: () =>
      `scene=${scenes.Active} sound=${scenes.Count('SoundManager')} bank=${scenes.Count('CreditBank')} expedition=${scenes.Count('ExpeditionManager')} bgm=${bgm()} credits=${creditsSeen() ?? '-'} fragments=${fragmentsText()} expRef=${expeditionRef()}`,
    view(): SimView {
      const world: WorldItem[] = []
      // 세 구역: 정비 기지 씬, 지표 탐사 구역 씬, DontDestroyOnLoad (Hierarchy 처럼)
      const cols = [
        { scene: SceneSimulator.Base, x: 0.2, title: '정비 기지 씬' },
        { scene: SceneSimulator.Field, x: 5.45, title: '지표 탐사 구역 씬' },
        { scene: SceneSimulator.Ddol, x: 10.7, title: 'DontDestroyOnLoad' },
      ]
      const W = 5.1
      const TOP = 6.3
      const boxAt = new Map<SceneObject, { x: number; y: number; w: number; h: number }>()
      for (const col of cols) {
        const lit = col.scene === scenes.Active || col.scene === SceneSimulator.Ddol
        world.push({ kind: 'box', x: col.x, y: 0.2, w: W, h: TOP - 0.2, fill: lit ? (col.scene === SceneSimulator.Ddol ? '#1b2440' : '#1d2f4d') : '#111824', stroke: col.scene === scenes.Active ? '#5cc8ff' : '#2a3548' })
        world.push({ kind: 'text', x: col.x + 0.25, y: TOP - 0.55, text: col.scene === scenes.Active ? `▶ ${col.title}` : col.title, align: 'left', size: 20, color: lit ? '#e6edf7' : '#55627a' })
        // 살아 있는 것 + 이번 전환에서 파괴된 것 (+ 나쁜 예의 Instance 가 가리키는 파괴된 매니저)
        const items = scenes.Objects.filter(o => o.Scene === col.scene)
        const dead = scenes.LastDestroyed.filter(o => o.Scene === col.scene)
        const stale = isNaive ? objectOf(N.NaiveExpeditionManager.Instance) : null
        if (stale && stale.Destroyed && stale.Scene === col.scene && !dead.includes(stale)) dead.push(stale)
        const list = [...items, ...dead]
        const shown = list.slice(0, 8)
        const step = Math.min(1.25, 5.0 / Math.max(1, shown.length))
        const h = step * 0.84
        const twoLines = h >= 0.85
        shown.forEach((o, i) => {
          const y = TOP - 0.85 - (i + 1) * step + (step - h)
          const b = { x: col.x + 0.25, y, w: W - 0.5, h }
          boxAt.set(o, b)
          const twin = !o.Destroyed && scenes.Count(o.Kind) > 1
          world.push(o.Destroyed ? { kind: 'box', ...b, stroke: '#5a6680', dashed: true } : { kind: 'box', ...b, fill: COLOR[o.Kind], stroke: twin ? '#ff5d6c' : undefined })
          const cx = b.x + b.w / 2
          const name = o.Destroyed ? '#55627a' : '#e6edf7'
          const detail = detailOf(o)
          if (twoLines) {
            world.push({ kind: 'text', x: cx, y: b.y + h * 0.55, text: o.Name, size: 20, color: name })
            if (detail) world.push({ kind: 'text', x: cx, y: b.y + h * 0.14, text: detail, size: 18, color: o.Destroyed ? '#8796ae' : '#c8d0de' })
          } else world.push({ kind: 'text', x: cx, y: b.y + h * 0.26, text: detail && o.Kind !== 'SoundManager' ? `${o.Name} · ${detail}` : o.Name, size: 16, color: name })
          if (!o.Destroyed && (isNaive ? o.NaiveSound?.Playing : o.Bgm)) world.push({ kind: 'ring', x: b.x + b.w - 0.3, y: b.y + h / 2, r: Math.min(0.2, h * 0.3), color: '#7ee081' })
        })
        if (list.length > shown.length) world.push({ kind: 'text', x: col.x + W - 0.2, y: TOP - 0.55, text: `+${list.length - shown.length}개 더`, align: 'right', size: 16, color: '#ff5d6c' })
        if (col.scene !== SceneSimulator.Ddol && !lit && list.length === 0) world.push({ kind: 'text', x: col.x + W / 2, y: 3.2, text: '언로드됨', size: 20, color: '#3c475c' })
      }

      // 왼쪽 위: 지금 씬과 CreditBank.Instance 가 보는 크레딧
      const credits = creditsSeen()
      const sounds = bgm()
      world.push({ kind: 'text', x: 0.3, y: 8.3, text: `지금 씬: ${SceneSimulator.Title(scenes.Active)}`, align: 'left', size: 24, color: '#e6edf7' })
      const lostCredits = isNaive && scenes.Count('CreditBank') > 1
      world.push({ kind: 'text', x: 0.3, y: 7.6, text: `CreditBank.Instance → ${credits ?? '없음'} 크레딧`, align: 'left', size: 22, color: lostCredits ? '#ff5d6c' : recent(at.settle, 0.8) ? '#7ee081' : '#c8d0de' })
      const ref = expeditionRef()
      // 나쁜 예에서 빈 Instance 를 불렀으면 Instance 가 null 인 동안 붉게 둔다
      const nullBug = isNaive && ref === 'none' && at.nre >= 0
      const noneText = isNaive ? 'ExpeditionManager.Instance → null (아직 생긴 적 없음)' : 'ExpeditionManager.Instance → null (자리 비어 있음)'
      const refText = ref === 'none' ? noneText : ref === 'alive' ? `ExpeditionManager.Instance → 조각 ${fragmentsText()}` : 'ExpeditionManager.Instance → 파괴된 매니저'
      world.push({ kind: 'text', x: 0.3, y: 6.85, text: refText, align: 'left', size: 20, color: ref === 'destroyed' || nullBug ? '#ff5d6c' : '#8796ae' })
      world.push({ kind: 'text', x: 15.7, y: 8.3, text: `♪ BGM ${sounds}겹`, align: 'right', size: 24, color: sounds > 1 ? '#ff5d6c' : '#7ee081' })
      world.push({ kind: 'text', x: 15.7, y: 7.6, text: `조각 1개 = ${fragmentValue} 크레딧`, align: 'right', size: 20, color: '#8796ae' })

      // 나쁜 예: Instance 가 파괴된 매니저를 가리키는 화살표
      if (ref === 'destroyed') {
        const target = boxAt.get(objectOf(N.NaiveExpeditionManager.Instance)!)
        if (target) world.push({ kind: 'arrow', x1: 7.6, y1: 6.7, x2: target.x + target.w / 2, y2: target.y + target.h + 0.05, color: '#ff5d6c' })
      }
      // 잠깐 뜨는 글: 가장 최근 것 하나만 오른쪽 위에
      const flashes: [number, string, string][] = [
        [at.bug, 'MissingReferenceException', '#ff5d6c'],
        [at.nre, 'NullReferenceException', '#ff5d6c'],
        [at.lost, `정산하지 않은 조각 ${lastLost}개 사라짐`, '#ffd166'],
        [at.refuse, '정산 받지 않음: 탐사 구역에서만', '#ffd166'],
        [at.ignore, '기지에는 회로 조각이 없다', '#ffd166'],
        [at.settle, `+${lastSettled} 크레딧 입금`, '#7ee081'],
        [at.pickup, '회로 조각 +1', '#7ee081'],
        [isNaive ? -9 : at.reject, '복제본은 프레임 끝에 파괴', '#ffd166'],
        [isNaive ? at.dup : -9, '같은 매니저가 또 생겼다', '#ff5d6c'],
      ]
      const flash = flashes.filter(([t]) => recent(t, 1.2)).sort((a, b) => b[0] - a[0])[0]
      if (flash) world.push({ kind: 'text', x: 15.7, y: 6.85, text: flash[1], align: 'right', color: flash[2], size: 20 })

      const active: string[] = []
      if (isNaive) {
        if (recent(at.overwrite)) active.push('n-new', 'n-new-instance', 'n-instance')
        if (recent(at.dup)) active.push('n-old', 'n-old-instance')
        if (recent(at.bug)) active.push('n-caller', 'n-caller-exp', 'n-exp', 'n-exp-dead', 'n-dead')
        if (recent(at.nre)) active.push('n-caller', 'n-caller-exp', 'n-exp')
      } else {
        if (recent(at.persistentSlot)) active.push('slot', 'persistent', 'persistent-slot')
        if (recent(at.sceneSlot) || recent(at.lost)) active.push('slot', 'scene', 'scene-slot', 'expedition')
        if (recent(at.settle) || recent(at.refuse) || recent(at.pickup) || recent(at.ignore)) active.push('caller', 'caller-instance', 'instance', 'instance-slot')
      }
      return { world, active }
    },
  }
}
