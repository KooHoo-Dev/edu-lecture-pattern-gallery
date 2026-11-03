import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/observer-health-events 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/observer-health-events/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다. */

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

interface HealthChange {
  Previous: number
  Current: number
  Max: number
}
const delta = (c: HealthChange) => c.Current - c.Previous

/* ───────── Core/Health.cs ───────── */

class Health {
  Max: number
  Current: number
  Changed = new Event<[HealthChange]>()
  Died = new Event<[]>()
  constructor(max: number) {
    this.Max = max
    this.Current = max
  }
  get IsDead() {
    return this.Current <= 0
  }
  Damage(amount: number) {
    if (this.IsDead || amount <= 0) return
    this.Set(this.Current - amount)
  }
  Heal(amount: number) {
    if (this.IsDead || amount <= 0) return
    this.Set(this.Current + amount)
  }
  private Set(value: number) {
    const previous = this.Current
    this.Current = Math.min(this.Max, Math.max(0, value))
    if (this.Current === previous) return
    const died = this.Current === 0
    this.Changed.invoke({ Previous: previous, Current: this.Current, Max: this.Max })
    if (died) this.Died.invoke()
  }
}

/* ───────── Core/HealthReactions.cs ───────── */

class HealthBar {
  LowRatio = f(0.3)
  Fill = f(1)
  Warning = false
  Updated = new Event<[number, boolean]>()
  private bound: Health | null = null
  Bind(health: Health) {
    if (this.bound === health) return
    this.Unbind()
    this.bound = health
    health.Changed.add(this.OnChanged)
    this.Show(health.Current, health.Max)
  }
  Unbind() {
    if (!this.bound) return
    this.bound.Changed.remove(this.OnChanged)
    this.bound = null
  }
  private OnChanged = (c: HealthChange) => this.Show(c.Current, c.Max)
  private Show(current: number, max: number) {
    this.Fill = max > 0 ? f(current / max) : 0
    this.Warning = this.Fill <= this.LowRatio
    this.Updated.invoke(this.Fill, this.Warning)
  }
}

class HitSound {
  PlayCount = 0
  Played = new Event<[number]>()
  private bound: Health | null = null
  Bind(health: Health) {
    if (this.bound === health) return
    this.Unbind()
    this.bound = health
    health.Changed.add(this.OnChanged)
  }
  Unbind() {
    if (!this.bound) return
    this.bound.Changed.remove(this.OnChanged)
    this.bound = null
  }
  private OnChanged = (c: HealthChange) => {
    if (delta(c) >= 0) return
    this.PlayCount++
    this.Played.invoke(this.PlayCount)
  }
}

class DamageAchievement {
  Threshold = 60
  TotalDamage = 0
  IsUnlocked = false
  Progressed = new Event<[number]>()
  Unlocked = new Event<[]>()
  private bound: Health | null = null
  Bind(health: Health) {
    if (this.bound === health) return
    this.Unbind()
    this.bound = health
    health.Changed.add(this.OnChanged)
  }
  Unbind() {
    if (!this.bound) return
    this.bound.Changed.remove(this.OnChanged)
    this.bound = null
  }
  private OnChanged = (c: HealthChange) => {
    if (delta(c) >= 0) return
    this.TotalDamage += -delta(c)
    this.Progressed.invoke(this.TotalDamage)
    if (this.IsUnlocked || this.TotalDamage < this.Threshold) return
    this.IsUnlocked = true
    this.Unlocked.invoke()
  }
}

class GameOverPanel {
  IsShown = false
  Shown = new Event<[]>()
  private bound: Health | null = null
  Bind(health: Health) {
    if (this.bound === health) return
    this.Unbind()
    this.bound = health
    health.Died.add(this.OnDied)
    if (health.IsDead) this.OnDied()
  }
  Unbind() {
    if (!this.bound) return
    this.bound.Died.remove(this.OnDied)
    this.bound = null
  }
  private OnDied = () => {
    if (this.IsShown) return
    this.IsShown = true
    this.Shown.invoke()
  }
}

/* ───────── Naive/NaivePlayerHealth.cs ───────── */

class MissingReference extends Error {}

class NaiveHealthBar {
  Destroyed = false
  LowRatio = f(0.3)
  Fill = f(1)
  Warning = false
  SetFill(value: number) {
    if (this.Destroyed) throw new MissingReference('MissingReferenceException: 파괴된 HealthBar 의 Image 를 건드렸다')
    this.Fill = value
    this.Warning = value <= this.LowRatio
  }
}

class NaiveHitSound {
  Destroyed = false
  PlayCount = 0
  Play() {
    if (this.Destroyed) throw new MissingReference('MissingReferenceException: 파괴된 HitSound 의 AudioSource 를 건드렸다')
    this.PlayCount++
  }
}

class NaiveAchievement {
  Threshold = 60
  TotalDamage = 0
  Unlocked = false
  AddDamage(amount: number) {
    this.TotalDamage += amount
    if (!this.Unlocked && this.TotalDamage >= this.Threshold) this.Unlocked = true
  }
}

class NaiveGameOver {
  Shown = false
  Show() {
    this.Shown = true
  }
}

class NaivePlayerHealth {
  Max = 100
  Current = 100
  bar = new NaiveHealthBar()
  sound = new NaiveHitSound()
  achievement = new NaiveAchievement()
  gameOver = new NaiveGameOver()
  Damage(amount: number) {
    if (this.Current <= 0) return
    const before = this.Current
    this.Current = Math.max(0, this.Current - amount)
    this.bar.SetFill(f(this.Current / this.Max))
    this.sound.Play()
    this.achievement.AddDamage(before - this.Current)
    if (this.Current === 0) this.gameOver.Show()
  }
  Heal(amount: number) {
    if (this.Current <= 0) return
    this.Current = Math.min(this.Max, this.Current + amount)
    this.bar.SetFill(f(this.Current / this.Max))
  }
}

/* ───────── truth/observer-health-events/Target.cs 와 같은 어댑터 + 무대 그림 ───────── */

const F2 = (v: number) => v.toFixed(2)
const B = (b: boolean) => (b ? 1 : 0)
const intOf = (values: ParamValues, k: string) => Math.round(Number(values[k]))

export const createSim: SimFactory = (values: ParamValues, isNaive: boolean): PatternSim => {
  const events: string[] = []
  const damage = intOf(values, 'damage')
  const healAmount = intOf(values, 'healAmount')
  const lowRatio = f(Number(values.lowHealthRatio))
  const max = intOf(values, 'maxHealth')
  let clock = 0
  const at = { input: -9, damage: -9, bug: -9, sound: -9, unlock: -9, react: new Map<string, number>() }
  const mark = (who: string) => at.react.set(who, clock)

  // 패턴
  let health: Health | null = null
  let bar: HealthBar | null = null
  let sound: HitSound | null = null
  let achievement: DamageAchievement | null = null
  let gameOver: GameOverPanel | null = null
  let barAlive = true
  let soundAlive = true
  let lastWarning = false
  let soundsTotal = 0

  // 나쁜 예
  let naive: NaivePlayerHealth | null = null
  let shownBar: NaiveHealthBar | null = null
  let shownSound: NaiveHitSound | null = null
  let deadButNoGameOver = false
  const last = { bar: '', warning: false, sounds: 0, total: 0, unlocked: false, over: false }

  const onBarUpdated = (fill: number, warning: boolean) => {
    events.push(`HealthBar 채움 ${F2(fill)}`)
    if (warning !== lastWarning) events.push(warning ? 'HealthBar 경고 색' : 'HealthBar 보통 색')
    lastWarning = warning
    mark('bar')
  }
  const newBar = () => {
    bar = new HealthBar()
    bar.LowRatio = lowRatio
    lastWarning = false
    bar.Updated.add(onBarUpdated)
    bar.Bind(health!)
  }
  const newSound = () => {
    sound = new HitSound()
    sound.Played.add(() => {
      events.push(`HitSound 재생 (${++soundsTotal}번째)`)
      mark('sound')
      at.sound = clock
    })
    sound.Bind(health!)
  }

  const barText = () => (naive ? (shownBar ? F2(shownBar.Fill) : 'off') : barAlive ? F2(bar!.Fill) : 'off')
  const remember = () => {
    const n = naive!
    last.bar = barText()
    last.warning = shownBar !== null && shownBar.Warning
    last.sounds = n.sound.PlayCount
    last.total = n.achievement.TotalDamage
    last.unlocked = n.achievement.Unlocked
    last.over = n.gameOver.Shown
  }

  if (isNaive) {
    naive = new NaivePlayerHealth()
    naive.Max = max
    naive.Current = max
    naive.bar.LowRatio = lowRatio
    naive.achievement.Threshold = intOf(values, 'achievementDamage')
    shownBar = naive.bar
    shownSound = naive.sound
    remember()
  } else {
    health = new Health(max)
    health.Changed.add(c => events.push(`Health ${c.Previous} → ${c.Current} (Changed)`))
    health.Died.add(() => events.push('Health 0 (Died)'))
    achievement = new DamageAchievement()
    achievement.Threshold = intOf(values, 'achievementDamage')
    achievement.Progressed.add(total => {
      events.push(`Achievement 누적 피해 ${total}`)
      mark('achievement')
    })
    achievement.Unlocked.add(() => {
      events.push('Achievement 해금: 버텨 낸 탐사대장')
      at.unlock = clock
    })
    gameOver = new GameOverPanel()
    gameOver.Shown.add(() => {
      events.push('GameOver 표시')
      mark('gameover')
    })
    newBar()
    newSound()
    achievement.Bind(health)
    gameOver.Bind(health)
  }

  const diff = () => {
    const n = naive!
    const b = barText()
    if (b !== last.bar && b !== 'off') {
      events.push(`HealthBar 채움 ${b}`)
      mark('bar')
    }
    const w = shownBar !== null && shownBar.Warning
    if (w && !last.warning) events.push('HealthBar 경고 색')
    if (!w && last.warning && b !== 'off') events.push('HealthBar 보통 색')
    if (n.sound.PlayCount > last.sounds) {
      events.push(`HitSound 재생 (${n.sound.PlayCount}번째)`)
      mark('sound')
      at.sound = clock
    }
    if (n.achievement.TotalDamage !== last.total) {
      events.push(`Achievement 누적 피해 ${n.achievement.TotalDamage}`)
      mark('achievement')
    }
    if (n.achievement.Unlocked && !last.unlocked) {
      events.push('Achievement 해금: 버텨 낸 탐사대장')
      at.unlock = clock
    }
    if (n.gameOver.Shown && !last.over) {
      events.push('GameOver 표시')
      mark('gameover')
    }
    if (n.Current === 0 && !n.gameOver.Shown && !deadButNoGameOver) {
      deadButNoGameOver = true
      events.push('!체력이 0 인데 게임 오버 창이 뜨지 않는다')
      at.bug = clock
    }
    remember()
  }

  const call = (action: () => void, isDamage: boolean) => {
    const n = naive!
    const before = n.Current
    try {
      action()
    } catch (e) {
      if (!(e instanceof MissingReference)) throw e
      if (n.Current !== before) events.push(`Current ${before} → ${n.Current}`)
      const skipped = e.message.includes('HitSound') ? '아래 줄(업적, 게임 오버)이 실행되지 않았다' : isDamage ? '아래 줄(피격음, 업적, 게임 오버)이 실행되지 않았다' : '회복이 바에 보이지 않는다'
      events.push(`!${e.message} → ${skipped}`)
      at.bug = clock
      return
    }
    if (n.Current !== before) events.push(`Current ${before} → ${n.Current}`)
  }

  const patternInput = (name: string) => {
    if (name === 'damage') health!.Damage(damage)
    else if (name === 'heal') health!.Heal(healAmount)
    else if (name === 'bar') {
      if (barAlive) {
        bar!.Unbind()
        bar!.Updated.remove(onBarUpdated)
        events.push('HealthBar 파괴 → OnDisable 에서 구독 해제')
      } else {
        events.push('새 HealthBar → OnEnable 에서 구독 (지금 값으로 맞춘다)')
        newBar()
      }
      barAlive = !barAlive
    } else if (name === 'sound') {
      if (soundAlive) {
        sound!.Unbind()
        events.push('HitSound 파괴 → OnDisable 에서 구독 해제')
      } else {
        events.push('새 HitSound → OnEnable 에서 구독')
        newSound()
      }
      soundAlive = !soundAlive
    }
  }

  const naiveInput = (name: string) => {
    const n = naive!
    if (name === 'damage') call(() => n.Damage(damage), true)
    else if (name === 'heal') call(() => n.Heal(healAmount), false)
    else if (name === 'bar') {
      if (shownBar) {
        shownBar.Destroyed = true
        shownBar = null
        events.push('HealthBar 파괴 (Destroy)')
      } else {
        shownBar = new NaiveHealthBar()
        shownBar.LowRatio = lowRatio
        events.push('새 HealthBar 생성 (플레이어의 bar 칸은 아직 파괴된 옛 바)')
        if (n.Current < n.Max) {
          events.push('!새 체력 바가 100% 로 보인다 (아무도 값을 넣지 않는다)')
          at.bug = clock
        }
      }
    } else if (name === 'sound') {
      if (shownSound) {
        shownSound.Destroyed = true
        shownSound = null
        events.push('HitSound 파괴 (Destroy)')
      } else {
        shownSound = new NaiveHitSound()
        events.push('새 HitSound 생성 (플레이어의 sound 칸은 아직 옛 것)')
      }
    }
  }

  const recent = (t: number, within = 0.35) => clock - t < within
  const hp = () => (naive ? naive.Current : health!.Current)
  const sounds = () => (naive ? naive.sound.PlayCount : soundsTotal)
  const total = () => (naive ? naive.achievement.TotalDamage : achievement!.TotalDamage)
  const unlocked = () => (naive ? naive.achievement.Unlocked : achievement!.IsUnlocked)
  const over = () => (naive ? naive.gameOver.Shown : gameOver!.IsShown)

  return {
    input(name) {
      at.input = clock
      if (name === 'damage') at.damage = clock
      if (naive) {
        naiveInput(name)
        diff()
      } else patternInput(name)
    },
    tick(dt) {
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot: () => `hp=${hp()} bar=${barText()} sounds=${sounds()} total=${total()} unlocked=${B(unlocked())} over=${B(over())}`,
    view(): SimView {
      const dead = hp() === 0
      const barShown = naive ? shownBar !== null : barAlive
      const fill = naive ? (shownBar?.Fill ?? 0) : bar!.Fill
      const warning = naive ? (shownBar?.Warning ?? false) : barAlive && bar!.Warning
      const soundShown = naive ? shownSound !== null : soundAlive
      const threshold = naive ? naive.achievement.Threshold : achievement!.Threshold
      const world: WorldItem[] = [
        { kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' },
        { kind: 'actor', x: 4.5, y: 1, role: 'ally', label: `하린 · 체력 ${hp()}`, pose: dead ? 'down' : recent(at.damage, 0.25) ? 'hurt' : 'idle' },
        { kind: 'actor', x: 13.5, y: 1, role: 'enemy', label: '잔해 드론', facing: -1 },
        barShown
          ? { kind: 'bar', x: 0.6, y: 7.6, w: 6, value: fill, fill: warning ? '#ff6b6b' : '#5cc8ff', label: `체력 바 ${Math.round(fill * 100)}%` }
          : { kind: 'box', x: 0.6, y: 7.25, w: 6, h: 0.45, stroke: '#4a5872', dashed: true, label: '체력 바 (파괴됨)' },
        { kind: 'text', x: 0.6, y: 6.3, text: soundShown ? `♪ 피격음 ${sounds()}번` : '♪ 피격음 (파괴됨)', align: 'left', size: 22, color: recent(at.sound) ? '#7ee081' : soundShown ? '#c8d0de' : '#4a5872' },
        { kind: 'text', x: 0.6, y: 5.5, text: `업적: 누적 피해 ${total()} / ${threshold}`, align: 'left', size: 20, color: '#8796ae' },
      ]
      if (naive && shownBar !== naive.bar) world.push({ kind: 'text', x: 0.6, y: 4.8, text: '플레이어의 bar 칸 → 파괴된 옛 바', align: 'left', size: 20, color: '#ff5d6c' })
      if (recent(at.damage)) world.push({ kind: 'arrow', x1: 13, y1: 1.45, x2: 5.2, y2: 1.45, color: '#ff6b6b' })
      if (unlocked()) world.push({ kind: 'box', x: 9.4, y: 7.1, w: 6.2, h: 1.1, fill: recent(at.unlock, 1) ? '#2f7d32' : '#1d3b26', label: '업적 해금: 버텨 낸 탐사대장' })
      if (over()) world.push({ kind: 'box', x: 3, y: 3.2, w: 10, h: 1.6, fill: 'rgba(120, 20, 30, 0.85)', label: '임무 실패 · 게임 오버' })
      if (naive && recent(at.bug, 1.2)) world.push({ kind: 'text', x: 8, y: 4.4, text: 'MissingReferenceException', color: '#ff5d6c', size: 26 })
      const active: string[] = []
      if (naive) {
        if (recent(at.input)) active.push('nplayer')
        for (const [who, t] of at.react) if (recent(t)) active.push(`n-${who}`, `nplayer-${who}`)
      } else {
        if (recent(at.input)) active.push('health', 'owner-health')
        for (const [who, t] of at.react) if (recent(t)) active.push(who, `${who}-health`)
      }
      return { world, active }
    },
  }
}
