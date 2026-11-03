import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/facade-hit-resolution 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/facade-hit-resolution/Target.cs 와 같은 글을 만드는 어댑터. 모두 int 계산이라 float 맞추기는 없다. */

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

class Drone {
  Name: string
  MaxHp: number
  Hp: number
  Armor: number
  Reward: number
  IsDestroyed = false
  HpChanged = new Event<[Drone, number, number]>()
  constructor(name: string, maxHp: number, armor: number, reward: number) {
    this.Name = name
    this.MaxHp = maxHp
    this.Hp = maxHp
    this.Armor = armor
    this.Reward = reward
  }
  TakeDamage(amount: number) {
    const before = this.Hp
    this.Hp = Math.max(0, this.Hp - amount)
    this.HpChanged.invoke(this, before, this.Hp)
  }
  MarkDestroyed() {
    this.IsDestroyed = true
  }
}

class DroneField {
  static NormalHp = 10
  static NormalReward = 10
  static HeavyReward = 20
  private drones: Drone[]
  TrapSlot: number
  HeavySlot: number
  constructor(drones: Drone[], trapSlot: number, heavySlot: number) {
    this.drones = drones
    this.TrapSlot = trapSlot
    this.HeavySlot = heavySlot
  }
  get All(): readonly Drone[] {
    return this.drones
  }
  static CreateDefault(heavyArmor: number) {
    return new DroneField(
      [
        new Drone('D1', DroneField.NormalHp, 0, DroneField.NormalReward),
        new Drone('D2', DroneField.NormalHp, 0, DroneField.NormalReward),
        new Drone('D3', DroneField.NormalHp, heavyArmor, DroneField.HeavyReward),
      ],
      0,
      2,
    )
  }
  get Heavy() {
    return this.drones[this.HeavySlot]
  }
  FrontAlive(): Drone | null {
    for (const d of this.drones) if (!d.IsDestroyed) return d
    return null
  }
  OnTrap(): Drone | null {
    const d = this.drones[this.TrapSlot]
    return d.IsDestroyed ? null : d
  }
  IndexOf(d: Drone) {
    return this.drones.indexOf(d)
  }
}

/* ───────── Core/HitSubsystems.cs ───────── */

class DamageCalculator {
  static MinDamage = 1
  Calculated = new Event<[number, number, number]>()
  Final(baseDamage: number, armor: number) {
    const final = Math.max(DamageCalculator.MinDamage, baseDamage - armor)
    this.Calculated.invoke(baseDamage, armor, final)
    return final
  }
}

class HitFeed {
  DamageShown = new Event<[Drone, number]>()
  HitTaken = new Event<[string, Drone]>()
  ShowDamage(target: Drone, amount: number) {
    this.DamageShown.invoke(target, amount)
  }
  NotifyHit(attacker: string, target: Drone) {
    this.HitTaken.invoke(attacker, target)
  }
}

class Wreckage {
  Credits = 0
  Destroyed = new Event<[Drone]>()
  RewardGranted = new Event<[Drone, number, number]>()
  Destroy(target: Drone) {
    target.MarkDestroyed()
    this.Destroyed.invoke(target)
    this.Credits += target.Reward
    this.RewardGranted.invoke(target, target.Reward, this.Credits)
  }
}

/* ───────── Core/CombatSystem.cs ───────── */

class CombatSystem {
  Calculator = new DamageCalculator()
  Feed = new HitFeed()
  Wreckage = new Wreckage()
  HitRequested = new Event<[string, Drone, number]>()
  HitRefused = new Event<[string, Drone | null]>()
  Hit(attacker: string, target: Drone | null, baseDamage: number) {
    if (target === null || target.IsDestroyed) {
      this.HitRefused.invoke(attacker, target)
      return false
    }
    this.HitRequested.invoke(attacker, target, baseDamage)
    const damage = this.Calculator.Final(baseDamage, target.Armor)
    this.Feed.ShowDamage(target, damage)
    target.TakeDamage(damage)
    this.Feed.NotifyHit(attacker, target)
    if (target.Hp === 0) this.Wreckage.Destroy(target)
    return true
  }
}

/* ───────── Core/Attackers.cs ───────── */

class Gun {
  static DefaultDamage = 4
  Damage = Gun.DefaultDamage
  private combat: CombatSystem
  private field: DroneField
  constructor(combat: CombatSystem, field: DroneField) {
    this.combat = combat
    this.field = field
  }
  Fire() {
    return this.combat.Hit('Gun', this.field.FrontAlive(), this.Damage)
  }
}

class Trap {
  Damage = 5
  private combat: CombatSystem
  private field: DroneField
  constructor(combat: CombatSystem, field: DroneField) {
    this.combat = combat
    this.field = field
  }
  Trigger() {
    return this.combat.Hit('Trap', this.field.OnTrap(), this.Damage)
  }
}

class ShockDrone {
  Damage = 6
  private combat: CombatSystem
  private field: DroneField
  constructor(combat: CombatSystem, field: DroneField) {
    this.combat = combat
    this.field = field
  }
  Zap() {
    return this.combat.Hit('ShockDrone', this.field.Heavy, this.Damage)
  }
}

/* ───────── Naive/NaiveAttacks.cs ───────── */

class NaiveDrone {
  name = ''
  maxHp = 10
  hp = 10
  armor = 0
  reward = 10
  removed = false
}

class NaiveField {
  drones: NaiveDrone[] = []
  trapSlot = 0
  heavySlot = 2
  FrontAlive(): NaiveDrone | null {
    for (const d of this.drones) if (!d.removed && d.hp > 0) return d
    return null
  }
  OnTrap(): NaiveDrone | null {
    return this.drones[this.trapSlot].removed ? null : this.drones[this.trapSlot]
  }
  Heavy(): NaiveDrone | null {
    return this.drones[this.heavySlot].removed ? null : this.drones[this.heavySlot]
  }
  Remove(d: NaiveDrone) {
    d.removed = true
  }
}

class NaiveDamagePopup {
  count = 0
  lastTarget: NaiveDrone | null = null
  lastAmount = 0
  Show(target: NaiveDrone, amount: number) {
    this.count++
    this.lastTarget = target
    this.lastAmount = amount
  }
}

class NaiveHitFlash {
  count = 0
  Play(_target: NaiveDrone) {
    this.count++
  }
}

class NaiveWallet {
  credits = 0
  Add(amount: number) {
    this.credits += amount
  }
}

interface NaiveParts {
  field: NaiveField
  popup: NaiveDamagePopup
  flash: NaiveHitFlash
  wallet: NaiveWallet
}

class NaiveGun {
  damage = 4
  field: NaiveField
  popup: NaiveDamagePopup
  flash: NaiveHitFlash
  wallet: NaiveWallet
  constructor(p: NaiveParts) {
    this.field = p.field
    this.popup = p.popup
    this.flash = p.flash
    this.wallet = p.wallet
  }
  Fire() {
    const target = this.field.FrontAlive()
    if (target === null) return
    const dmg = Math.max(1, this.damage - target.armor)
    this.popup.Show(target, dmg)
    target.hp = Math.max(0, target.hp - dmg)
    this.flash.Play(target)
    if (target.hp <= 0) {
      this.wallet.Add(target.reward)
      this.field.Remove(target)
    }
  }
}

class NaiveTrap {
  damage = 5
  field: NaiveField
  popup: NaiveDamagePopup
  flash: NaiveHitFlash
  wallet: NaiveWallet
  constructor(p: NaiveParts) {
    this.field = p.field
    this.popup = p.popup
    this.flash = p.flash
    this.wallet = p.wallet
  }
  Trigger() {
    const target = this.field.OnTrap()
    if (target === null) return
    const dmg = Math.max(1, this.damage - target.armor)
    this.popup.Show(target, dmg)
    target.hp = Math.max(0, target.hp - dmg)
    this.flash.Play(target) // [!] 파괴 단계 없음
  }
}

class NaiveShockDrone {
  damage = 6
  field: NaiveField
  popup: NaiveDamagePopup
  flash: NaiveHitFlash
  wallet: NaiveWallet
  constructor(p: NaiveParts) {
    this.field = p.field
    this.popup = p.popup
    this.flash = p.flash
    this.wallet = p.wallet
  }
  Zap() {
    const target = this.field.Heavy()
    if (target === null) return
    const dmg = this.damage // [!] 방어력 빼기 없음
    this.popup.Show(target, dmg)
    target.hp = Math.max(0, target.hp - dmg)
    this.flash.Play(target)
    if (target.hp <= 0) {
      this.wallet.Add(target.reward)
      this.field.Remove(target)
    }
  }
}

/* ───────── truth/facade-hit-resolution/Target.cs 와 같은 어댑터 + 무대 그림 ───────── */

const intOf = (values: ParamValues, k: string) => Math.round(Number(values[k]))
const who = (input: string) => (input === 'shot' ? 'Gun' : input === 'trap' ? 'Trap' : 'ShockDrone')
const calcText = (b: number, armor: number, final: number) => (b - armor >= DamageCalculator.MinDamage ? `계산 ${b} - 방어 ${armor} = ${final}` : `계산 ${b} - 방어 ${armor} → 최소 ${final}`)

/** 무대 왼쪽 위 표: 공격하는 쪽마다 마지막 명중의 다섯 단계 */
interface HitRow {
  target: string
  calc: boolean
  shown: boolean
  applied: boolean
  notified: boolean
  /** ok 파괴함, none HP 가 남아 파괴할 일 없음, missing HP 0 인데 파괴하지 않음 */
  destroy: 'ok' | 'none' | 'missing'
  /** 받지 않았거나 아무 일도 없었을 때의 글 */
  skipped: string | null
  at: number
}

const ATTACKERS = ['Gun', 'Trap', 'ShockDrone']
const ROW_LABEL: Record<string, string> = { Gun: '총', Trap: '함정', ShockDrone: '충격' }
const DRONE_X = [7, 10, 13]
const HARIN_X = 2
const SHOCK_AT = { x: 15, y: 5.3 }
/** 버그가 이어지는 동안 드론 위에 남는 글의 높이 */
const BUG_Y = 5.2
const COL = {
  ok: '#7ee081',
  dim: '#8796ae',
  faint: '#4a5872',
  text: '#e6edf7',
  bug: '#ff5d6c',
  warn: '#ffb547',
  shot: '#ffd166',
  shock: '#8fd3ff',
  trap: '#9a6a2c',
  trapHot: '#ffb547',
  hp: '#ff8a8a',
}

export const createSim: SimFactory = (values: ParamValues, isNaive: boolean): PatternSim => {
  const events: string[] = []
  const armor = intOf(values, 'armor')
  const trapDamage = intOf(values, 'trapDamage')
  const shockDamage = intOf(values, 'shockDamage')
  let clock = 0
  const at = { input: -9, attacker: '', calc: -9, shown: -9, applied: -9, notified: -9, destroyed: -9, refused: -9, bug: -9 }
  /** 마지막 피해 숫자 (드론 번호, 값, 시각, 방어력을 빠뜨렸는지) */
  let popupMark: { i: number; amount: number; t: number; bad: boolean } | null = null
  const rows = new Map<string, HitRow>()

  // 패턴 (나쁜 예 모드에서는 그림자: 사건은 적지 않는다)
  const field = DroneField.CreateDefault(armor)
  const combat = new CombatSystem()
  const gun = new Gun(combat, field)
  gun.Damage = Gun.DefaultDamage
  const trap = new Trap(combat, field)
  trap.Damage = trapDamage
  const shock = new ShockDrone(combat, field)
  shock.Damage = shockDamage

  // 나쁜 예
  let parts: NaiveParts | null = null
  let nGun: NaiveGun | null = null
  let nTrap: NaiveTrap | null = null
  let nShock: NaiveShockDrone | null = null
  const missingFlagged = [false, false, false]

  /** 패턴: 지금 처리 중인 명중의 표 한 줄 (이벤트가 채운다) */
  let current: HitRow | null = null
  let currentWho = ''

  if (isNaive) {
    const nField = new NaiveField()
    nField.trapSlot = field.TrapSlot
    nField.heavySlot = field.HeavySlot
    for (const d of field.All) {
      const n = new NaiveDrone()
      n.name = d.Name
      n.maxHp = d.MaxHp
      n.hp = d.MaxHp
      n.armor = d.Armor
      n.reward = d.Reward
      nField.drones.push(n)
    }
    parts = { field: nField, popup: new NaiveDamagePopup(), flash: new NaiveHitFlash(), wallet: new NaiveWallet() }
    nGun = new NaiveGun(parts)
    nGun.damage = Gun.DefaultDamage
    nTrap = new NaiveTrap(parts)
    nTrap.damage = trapDamage
    nShock = new NaiveShockDrone(parts)
    nShock.damage = shockDamage
  } else {
    combat.HitRequested.add((a, d, b) => {
      events.push(`${a} → 창구 Hit(${d.Name}, 기본 ${b})`)
      current = { target: d.Name, calc: false, shown: false, applied: false, notified: false, destroy: 'none', skipped: null, at: clock }
      rows.set(a, current)
    })
    combat.HitRefused.add((a, d) => {
      events.push(d === null ? `${a} → 창구: 대상 없음, 받지 않는다` : `${a} → 창구: ${d.Name} 이미 파괴됨, 받지 않는다`)
      rows.set(a, { target: d?.Name ?? '', calc: false, shown: false, applied: false, notified: false, destroy: 'none', skipped: d === null ? '대상 없음 → 창구가 받지 않았다' : `${d.Name} 이미 파괴됨 → 창구가 받지 않았다`, at: clock })
      at.refused = clock
    })
    combat.Calculator.Calculated.add((b, ar, f) => {
      events.push(calcText(b, ar, f))
      if (current) current.calc = true
      at.calc = clock
    })
    combat.Feed.DamageShown.add((d, n) => {
      events.push(`표시 ${d.Name} -${n}`)
      if (current) current.shown = true
      popupMark = { i: field.IndexOf(d), amount: n, t: clock, bad: false }
      at.shown = clock
    })
    for (const d of field.All)
      d.HpChanged.add((x, before, after) => {
        events.push(`적용 ${x.Name} HP ${before} → ${after}`)
        if (current) current.applied = true
        at.applied = clock
      })
    combat.Feed.HitTaken.add((a, d) => {
      events.push(`알림 ${d.Name} 피격 (${a})`)
      if (current) current.notified = true
      at.notified = clock
    })
    combat.Wreckage.Destroyed.add(d => {
      events.push(`파괴 ${d.Name} (화면에서 뺀다)`)
      if (current) current.destroy = 'ok'
      at.destroyed = clock
    })
    combat.Wreckage.RewardGranted.add((_d, r, total) => events.push(`보상 +${r} 크레딧 (합 ${total})`))
  }

  const coreInput = (name: string) => {
    if (name === 'shot') gun.Fire()
    else if (name === 'trap') trap.Trigger()
    else if (name === 'shock') shock.Zap()
  }

  const naiveInput = (name: string) => {
    const p = parts!
    const nField = p.field
    const shown0 = p.popup.count
    const flashed0 = p.flash.count
    const credits0 = p.wallet.credits
    const hp0 = nField.drones.map(d => d.hp)
    const removed0 = nField.drones.map(d => d.removed)
    const w = who(name)
    let baseDamage: number
    if (name === 'shot') {
      baseDamage = nGun!.damage
      nGun!.Fire()
    } else if (name === 'trap') {
      baseDamage = nTrap!.damage
      nTrap!.Trigger()
    } else if (name === 'shock') {
      baseDamage = nShock!.damage
      nShock!.Zap()
    } else return

    if (p.popup.count === shown0) {
      const text = name === 'shot' ? 'Gun 코드: 쏠 드론 없음 (return)' : name === 'trap' ? 'Trap 코드: 함정 위에 드론 없음 (return)' : 'ShockDrone 코드: D3 없음 (target == null 이면 return)'
      events.push(text)
      rows.set(w, { target: '', calc: false, shown: false, applied: false, notified: false, destroy: 'none', skipped: text.replace(/^\S+ 코드: /, ''), at: clock })
      return
    }

    const d = p.popup.lastTarget!
    const k = nField.drones.indexOf(d)
    events.push(`${w} 코드 → ${d.name} (다섯 단계를 직접)`)
    events.push(`표시 ${d.name} -${p.popup.lastAmount}`)
    events.push(`적용 ${d.name} HP ${hp0[k]} → ${d.hp}`)
    const notified = p.flash.count > flashed0
    if (notified) events.push(`알림 ${d.name} 피격 (${w})`)
    const destroyed = d.removed && !removed0[k]
    if (destroyed) events.push(`파괴 ${d.name} (화면에서 뺀다)`)
    if (p.wallet.credits > credits0) events.push(`보상 +${p.wallet.credits - credits0} 크레딧 (합 ${p.wallet.credits})`)

    const expected = Math.max(DamageCalculator.MinDamage, baseDamage - d.armor)
    const calcOk = p.popup.lastAmount === expected
    if (!calcOk) {
      events.push(`!방어력 무시: ${d.name} 에 피해 ${p.popup.lastAmount} 그대로 (방어력 ${d.armor} 를 빼면 ${expected})`)
      at.bug = clock
    }
    if (d.hp === 0 && !d.removed && !missingFlagged[k]) {
      missingFlagged[k] = true
      events.push(`!파괴 누락: ${d.name} HP 0 인데 그대로 서 있다 (보상 +${d.reward} 도 없다)`)
      at.bug = clock
    }

    rows.set(w, { target: d.name, calc: calcOk, shown: true, applied: true, notified, destroy: destroyed ? 'ok' : d.hp === 0 ? 'missing' : 'none', skipped: null, at: clock })
    popupMark = { i: k, amount: p.popup.lastAmount, t: clock, bad: !calcOk }
    at.shown = clock
    at.applied = clock
    if (notified) at.notified = clock
    if (destroyed) at.destroyed = clock
  }

  const hpText = (d: Drone) => (d.IsDestroyed ? 'gone' : String(d.Hp))
  const nHpText = (d: NaiveDrone) => (d.removed ? 'gone' : String(d.hp))
  const recent = (t: number, within = 0.3) => clock - t < within

  return {
    input(name) {
      at.input = clock
      at.attacker = who(name)
      current = null
      currentWho = at.attacker
      coreInput(name)
      current = null
      if (isNaive) naiveInput(name)
    },
    tick(dt) {
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot: () => {
      const all = field.All
      const core = `D1=${hpText(all[0])} D2=${hpText(all[1])} D3=${hpText(all[2])}`
      if (!isNaive) return `credits=${combat.Wreckage.Credits} ${core}`
      const n = parts!.field.drones
      return `credits=${parts!.wallet.credits} D1=${nHpText(n[0])} D2=${nHpText(n[1])} D3=${nHpText(n[2])} ecredits=${combat.Wreckage.Credits} e${core.replaceAll(' ', ' e')}`
    },
    view(): SimView {
      const world: WorldItem[] = [
        { kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' },
        // 함정: D1 발밑 (땅 위 얇은 판)
        { kind: 'box', x: DRONE_X[field.TrapSlot] - 0.85, y: 1, w: 1.7, h: 0.2, fill: at.attacker === 'Trap' && recent(at.input, 0.4) ? COL.trapHot : COL.trap },
        { kind: 'text', x: DRONE_X[field.TrapSlot], y: 0.4, text: '함정', size: 18, color: COL.dim },
        { kind: 'actor', x: HARIN_X, y: 1, role: 'ally', label: '하린', pose: at.attacker === 'Gun' && recent(at.input, 0.25) ? 'attack' : 'idle' },
        { kind: 'actor', x: SHOCK_AT.x, y: SHOCK_AT.y, role: 'neutral', label: '정비 드론', scale: 0.6 },
      ]
      // 드론 셋
      const credits = isNaive ? parts!.wallet.credits : combat.Wreckage.Credits
      const expectedCredits = combat.Wreckage.Credits
      for (let i = 0; i < 3; i++) {
        const core = field.All[i]
        const name = core.Name
        const x = DRONE_X[i]
        const hp = isNaive ? parts!.field.drones[i].hp : core.Hp
        const max = core.MaxHp
        const gone = isNaive ? parts!.field.drones[i].removed : core.IsDestroyed
        const heavy = i === field.HeavySlot
        const armorNow = isNaive ? parts!.field.drones[i].armor : core.Armor
        const label = heavy ? `${name} 중장갑 · 방어 ${armorNow}` : name
        if (gone) {
          // 파괴 처리되어 화면에서 빠진 자리: 흐린 점선 윤곽만 남긴다
          world.push({ kind: 'box', x: x - 0.5, y: 1.25, w: 1, h: 1.1, stroke: COL.faint, dashed: true })
          world.push({ kind: 'text', x, y: 2.7, text: `${name} 파괴됨`, size: 18, color: COL.faint })
          continue
        }
        const hit = popupMark !== null && popupMark.i === i && recent(popupMark.t, 0.25)
        world.push({ kind: 'actor', x, y: 1, role: 'enemy', label, pose: hit ? 'hurt' : 'idle', facing: -1 })
        world.push({ kind: 'bar', x: x - 0.75, y: 3.0, w: 1.5, value: hp / max, fill: hp === 0 ? COL.bug : COL.hp, label: `HP ${hp}/${max}` })
        if (isNaive) {
          // 버그가 이어지는 동안 남는 표시: HP 0 인데 서 있는 드론, 그림자 코어와 HP 가 다른 드론
          if (hp === 0) {
            world.push({ kind: 'box', x: x - 0.9, y: 0.95, w: 1.8, h: 2.95, stroke: COL.bug, dashed: true })
            world.push({ kind: 'text', x, y: BUG_Y, text: 'HP 0 인데 서 있다', size: 18, color: COL.bug })
          } else if (core.IsDestroyed || core.Hp !== hp) {
            world.push({ kind: 'text', x, y: BUG_Y, text: `있어야 할 HP ${core.IsDestroyed ? 0 : core.Hp}`, size: 18, color: COL.bug })
          }
        }
      }
      // 나쁜 예에서 이미 터졌는데 그림자 코어에서는 살아 있는 드론 (방어력 무시로 일찍 터짐)
      if (isNaive) {
        for (let i = 0; i < 3; i++) {
          const core = field.All[i]
          if (parts!.field.drones[i].removed && !core.IsDestroyed) world.push({ kind: 'text', x: DRONE_X[i], y: BUG_Y, text: `있어야 할 HP ${core.Hp}`, size: 18, color: COL.bug })
        }
      }
      // 공격 연출 (잠깐)
      if (recent(at.input, 0.3) && popupMark && recent(popupMark.t, 0.3)) {
        const tx = DRONE_X[popupMark.i]
        if (at.attacker === 'Gun') world.push({ kind: 'arrow', x1: HARIN_X + 0.5, y1: 1.8, x2: tx - 0.55, y2: 1.8, color: COL.shot })
        if (at.attacker === 'ShockDrone') world.push({ kind: 'arrow', x1: SHOCK_AT.x - 0.3, y1: SHOCK_AT.y + 0.1, x2: tx + 0.35, y2: 2.2, color: COL.shock, dashed: true })
      }
      if (popupMark && recent(popupMark.t, 0.7)) {
        world.push({ kind: 'text', x: DRONE_X[popupMark.i], y: 4.0 + (clock - popupMark.t) * 0.6, text: `-${popupMark.amount}`, size: 30, color: popupMark.bad ? COL.bug : COL.shot })
      }

      // 왼쪽 위: 크레딧과 공격하는 쪽마다 마지막 명중의 다섯 단계
      const creditBad = isNaive && credits !== expectedCredits
      world.push({ kind: 'text', x: 0.4, y: 8.3, text: `크레딧 ${credits}${creditBad ? `  (있어야 할 값 ${expectedCredits})` : ''}`, align: 'left', size: 24, color: creditBad ? COL.bug : COL.ok })
      ATTACKERS.forEach((a, k) => {
        const y = 7.6 - k * 0.6
        const r = rows.get(a)
        const fresh = r !== undefined && recent(r.at, 0.6)
        const head = `${ROW_LABEL[a]} `
        if (!r) {
          world.push({ kind: 'text', x: 0.4, y, text: `${head} 아직 안 씀`, align: 'left', size: 18, color: COL.faint })
          return
        }
        if (r.skipped) {
          world.push({ kind: 'text', x: 0.4, y, text: `${head}${r.skipped}`, align: 'left', size: 18, color: fresh ? COL.text : COL.dim })
          return
        }
        const m = (ok: boolean) => (ok ? '✓' : '✗')
        const destroy = r.destroy === 'ok' ? '✓' : r.destroy === 'missing' ? '✗' : '—'
        const bad = !r.calc || !r.shown || !r.applied || !r.notified || r.destroy === 'missing'
        const text = `${head}→ ${r.target}   계산 ${m(r.calc)}  표시 ${m(r.shown)}  적용 ${m(r.applied)}  알림 ${m(r.notified)}  파괴 ${destroy}`
        world.push({ kind: 'text', x: 0.4, y, text, align: 'left', size: 18, color: bad ? COL.bug : fresh ? COL.ok : COL.dim })
      })

      // 구조 그림: 입력 직후 0.3초, 그 명중이 지난 노드와 화살표만
      const active: string[] = []
      if (!isNaive) {
        const src = currentWho === 'Gun' ? 'gun' : currentWho === 'Trap' ? 'trap' : 'shock'
        if (recent(at.input)) active.push(src, `${src}-combat`, 'combat')
        if (recent(at.calc)) active.push('calc', 'combat-calc')
        if (recent(at.shown) || recent(at.notified)) active.push('feed', 'combat-feed')
        if (recent(at.applied)) active.push('drone', 'combat-drone')
        if (recent(at.destroyed)) active.push('wreck', 'combat-wreck')
      } else {
        const src = currentWho === 'Gun' ? 'ngun' : currentWho === 'Trap' ? 'ntrap' : 'nshock'
        if (recent(at.input)) active.push(src)
        // 나쁜 예의 공식은 따로 사건이 없어서, 그 코드에 공식 줄이 있으면 표시와 함께 켠다
        if (recent(at.shown) && src !== 'nshock') active.push('nformula', `${src}-nformula`)
        if (recent(at.shown) || recent(at.notified)) active.push('nfeed', `${src}-nfeed`)
        if (recent(at.applied)) active.push('nhp', `${src}-nhp`)
        if (recent(at.destroyed)) active.push('nwreck', `${src}-nwreck`)
      }
      return { world, active }
    },
  }
}
