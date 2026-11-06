import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/adapter-sensor-units 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/adapter-sensor-units/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다. */

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

/* ───────── Core/IRadiationSensor.cs ───────── */

interface IRadiationSensor {
  readonly Zone: string
  readonly Level01: number
}

/* ───────── Core/RadiationField.cs ───────── */

class RadiationField {
  Level = 0
  Changed = new Event<[number, number]>()
  Add(delta: number): boolean {
    const before = this.Level
    this.Level = Math.min(1, Math.max(0, f(this.Level + delta)))
    if (this.Level === before) return false
    this.Changed.invoke(before, this.Level)
    return true
  }
}

/* ───────── Core/RadiationHud.cs ───────── */

class RadiationHud {
  AlarmLevel = f(0.7)
  LevelShown = new Event<[string, number]>()
  AlarmChanged = new Event<[string, boolean]>()
  private sensors: IRadiationSensor[] = []
  private shown = new Map<string, number>()
  private alarms = new Map<string, boolean>()
  get Sensors(): readonly IRadiationSensor[] {
    return this.sensors
  }
  Attach(sensor: IRadiationSensor) {
    const i = this.sensors.findIndex(s => s.Zone === sensor.Zone)
    if (i >= 0) this.sensors[i] = sensor
    else this.sensors.push(sensor)
    this.Show(sensor)
  }
  Refresh() {
    for (const sensor of this.sensors) this.Show(sensor)
  }
  LevelOf(zone: string) {
    return this.shown.get(zone) ?? 0
  }
  IsAlarmOn(zone: string) {
    return this.alarms.get(zone) ?? false
  }
  private Show(sensor: IRadiationSensor) {
    const level = sensor.Level01
    this.shown.set(sensor.Zone, level)
    this.LevelShown.invoke(sensor.Zone, level)
    const on = level >= this.AlarmLevel
    if (on === this.IsAlarmOn(sensor.Zone)) return
    this.alarms.set(sensor.Zone, on)
    this.AlarmChanged.invoke(sensor.Zone, on)
  }
}

/* ───────── Core/RadiationSite.cs ───────── */

const ZoneA = 'A'
const ZoneB = 'B'

class RadiationSite {
  Field = new RadiationField()
  Hud: RadiationHud
  RiseStep: number
  probeA: LegacyProbe
  probeB: LegacyProbe
  geigerB: GeigerX
  legacyB: IRadiationSensor
  upgradedB: IRadiationSensor
  IsBUpgraded = false
  get DeviceA() {
    return 'LegacyProbe'
  }
  get DeviceB() {
    return this.IsBUpgraded ? 'GeigerX' : 'LegacyProbe'
  }
  SensorSwapped = new Event<[string, string]>()
  constructor(alarmLevel: number, riseStep: number) {
    this.RiseStep = riseStep
    this.Hud = new RadiationHud()
    this.Hud.AlarmLevel = alarmLevel
    this.probeA = new LegacyProbe(() => this.Field.Level)
    this.probeB = new LegacyProbe(() => this.Field.Level)
    this.geigerB = new GeigerX(() => this.Field.Level)
    this.legacyB = new LegacyProbeAdapter(ZoneB, this.probeB)
    this.upgradedB = new GeigerXAdapter(ZoneB, this.geigerB)
    this.Hud.Attach(new LegacyProbeAdapter(ZoneA, this.probeA))
    this.Hud.Attach(this.legacyB)
  }
  Rise() {
    if (this.Field.Add(this.RiseStep)) this.Hud.Refresh()
  }
  Fall() {
    if (this.Field.Add(-this.RiseStep)) this.Hud.Refresh()
  }
  SwapB() {
    this.IsBUpgraded = !this.IsBUpgraded
    this.SensorSwapped.invoke(ZoneB, this.DeviceB)
    this.Hud.Attach(this.IsBUpgraded ? this.upgradedB : this.legacyB)
  }
}

/* ───────── Core/SensorAdapters.cs ───────── */

class LegacyProbeAdapter implements IRadiationSensor {
  readonly Zone: string
  private device: LegacyProbe
  constructor(zone: string, device: LegacyProbe) {
    this.Zone = zone
    this.device = device
  }
  get Level01() {
    return this.device.GetLevel()
  }
}

class GeigerXAdapter implements IRadiationSensor {
  readonly Zone: string
  private device: GeigerX
  constructor(zone: string, device: GeigerX) {
    this.Zone = zone
    this.device = device
  }
  get Level01() {
    const percent = this.device.ReadPercent()
    return f(percent / 100)
  }
}

/* ───────── Core/VendorDevices.cs ───────── */

class LegacyProbe {
  private sense: () => number
  constructor(sense: () => number) {
    this.sense = sense
  }
  GetLevel() {
    return this.sense()
  }
}

/** Math.Round(x, MidpointRounding.AwayFromZero) */
const roundAway = (x: number) => Math.sign(x) * Math.round(Math.abs(x))

class GeigerX {
  private sense: () => number
  constructor(sense: () => number) {
    this.sense = sense
  }
  ReadPercent() {
    return roundAway(f(this.sense() * 100))
  }
}

/* ───────── Naive/NaiveRadiationHud.cs ───────── */

type Device = LegacyProbe | GeigerX

class NaiveRadiationHud {
  alarmLevel = f(0.7)
  zones = ['A', 'B']
  sensors: (Device | null)[] = [null, null]
  bars = [0, 0]
  alarms = [false, false]
  Refresh() {
    this.DrawBars()
    this.CheckAlarm()
  }
  DrawBars() {
    for (let i = 0; i < this.sensors.length; i++) {
      const s = this.sensors[i]
      if (s instanceof LegacyProbe) this.bars[i] = s.GetLevel()
      else if (s instanceof GeigerX) this.bars[i] = s.ReadPercent() // [!] 0~100 을 그대로 0~1 막대에
    }
  }
  CheckAlarm() {
    for (let i = 0; i < this.sensors.length; i++) {
      const s = this.sensors[i]
      let level = 0
      if (s instanceof LegacyProbe) level = s.GetLevel()
      else if (s instanceof GeigerX) level = Math.trunc(s.ReadPercent() / 100) // [!] int / int 정수 나눗셈
      this.alarms[i] = level >= this.alarmLevel
    }
  }
}

/* ───────── truth/adapter-sensor-units/Target.cs 와 같은 어댑터 + 무대 그림 ───────── */

const F2 = (v: number) => v.toFixed(2)
const B = (b: boolean) => (b ? 1 : 0)

export const createSim: SimFactory = (values: ParamValues, isNaive: boolean): PatternSim => {
  const events: string[] = []
  const alarmLevel = f(Number(values.alarmLevel))
  const riseStep = f(Number(values.riseStep))
  let clock = 0
  const at = { input: -9, swap: -9, overflow: -9, missed: -9 }
  let lastInput = ''

  // 패턴
  let site: RadiationSite | null = null

  // 나쁜 예: 방사선 값과 장비는 Core 의 것을 쓰고, HUD 만 장비를 직접 안다
  let field: RadiationField | null = null
  let naive: NaiveRadiationHud | null = null
  let probeB: LegacyProbe | null = null
  let geigerB: GeigerX | null = null
  let upgraded = false
  const lastBars = [0, 0]
  const lastAlarms = [false, false]
  const lastOverflow = [false, false]
  const lastMissed = [false, false]
  const reportedOverflow = [false, false]
  const reportedMissed = [false, false]

  const onFieldChanged = (before: number, after: number) => events.push(`방사선 ${F2(before)} → ${F2(after)}`)

  const remember = () => {
    for (let i = 0; i < 2; i++) {
      lastBars[i] = naive!.bars[i]
      lastAlarms[i] = naive!.alarms[i]
    }
  }

  if (isNaive) {
    const fld = new RadiationField()
    field = fld
    field.Changed.add(onFieldChanged)
    probeB = new LegacyProbe(() => fld.Level)
    geigerB = new GeigerX(() => fld.Level)
    naive = new NaiveRadiationHud()
    naive.alarmLevel = alarmLevel
    naive.sensors[0] = new LegacyProbe(() => fld.Level)
    naive.sensors[1] = probeB
    naive.Refresh()
    remember()
  } else {
    site = new RadiationSite(alarmLevel, riseStep)
    site.Field.Changed.add(onFieldChanged)
    site.Hud.LevelShown.add((zone, level) => events.push(`HUD ${zone} 막대 ${F2(level)}`))
    site.Hud.AlarmChanged.add((zone, on) => events.push(`HUD ${zone} 경보 ${on ? '켜짐' : '꺼짐'} (AlarmChanged)`))
    site.SensorSwapped.add((zone, device) => events.push(`도윤: ${zone} 구역 장비 → ${device} (SensorSwapped)`))
  }

  const deviceB = () => (upgraded ? 'GeigerX' : 'LegacyProbe')
  /** 장비가 돌려준 값을 제대로 0~1 로 바꾼 값 (버그 판정용. 패턴의 어댑터와 같은 계산) */
  const correct = (s: Device) => (s instanceof GeigerX ? f(s.ReadPercent() / 100) : s.GetLevel())

  /** 나쁜 예: HUD 의 막대와 경보등 변화를 구역마다 적고, 버그를 찾는다 */
  const diff = () => {
    const n = naive!
    for (let i = 0; i < 2; i++) {
      const zone = n.zones[i]
      const bar = n.bars[i]
      if (bar !== lastBars[i]) events.push(`HUD ${zone} 막대 ${F2(bar)}`)
      const overflow = bar > 1
      if (overflow && !lastOverflow[i]) {
        if (!reportedOverflow[i]) {
          reportedOverflow[i] = true
          events.push(`!막대 넘침: ${zone} 막대 ${F2(bar)} (0~1 막대에 ReadPercent 의 0~100 을 그대로 넣었다)`)
          at.overflow = clock
        } else events.push(`${zone} 막대 또 넘침 ${F2(bar)}`)
      }
      const alarm = n.alarms[i]
      if (alarm !== lastAlarms[i]) events.push(`HUD ${zone} 경보 ${alarm ? '켜짐' : '꺼짐'}`)
      const s = n.sensors[i]!
      const c = correct(s)
      const missed = c >= n.alarmLevel && !alarm
      if (missed && !lastMissed[i]) {
        const why = s instanceof GeigerX ? `${s.ReadPercent()} / 100 = ${Math.trunc(s.ReadPercent() / 100)}` : ''
        if (!reportedMissed[i]) {
          reportedMissed[i] = true
          events.push(`!경보 누락: ${zone} 구역 ${F2(c)} ≥ 기준 ${F2(n.alarmLevel)} 인데 경보등 꺼짐 (${why})`)
          at.missed = clock
        } else events.push(`${zone} 경보 또 누락 (${why})`)
      }
      lastOverflow[i] = overflow
      lastMissed[i] = missed
    }
    remember()
  }

  const naiveInput = (name: string) => {
    const n = naive!
    if (name === 'rise') {
      if (field!.Add(riseStep)) n.Refresh()
    } else if (name === 'fall') {
      if (field!.Add(-riseStep)) n.Refresh()
    } else if (name === 'swap') {
      upgraded = !upgraded
      n.sensors[1] = upgraded ? geigerB : probeB
      events.push(`도윤: B 구역 장비 → ${deviceB()} (HUD 의 sensors[1] 칸에 장비를 직접 끼움)`)
      n.Refresh()
    }
    diff()
  }

  const recent = (t: number, within = 0.35) => clock - t < within
  const level = () => (naive ? field!.Level : site!.Field.Level)
  const bUpgraded = () => (naive ? upgraded : site!.IsBUpgraded)
  const barOf = (i: number) => (naive ? naive.bars[i] : site!.Hud.LevelOf(i === 0 ? ZoneA : ZoneB))
  const alarmOf = (i: number) => (naive ? naive.alarms[i] : site!.Hud.IsAlarmOn(i === 0 ? ZoneA : ZoneB))
  /** 장비가 돌려준 원래 값 (그림용) */
  const rawOf = (i: number): { text: string; percent: number | null } => {
    const dev: Device = naive ? naive.sensors[i]! : i === 0 ? site!.probeA : site!.IsBUpgraded ? site!.geigerB : site!.probeB
    if (dev instanceof GeigerX) {
      const p = dev.ReadPercent()
      return { text: `원래 ${p} (0~100)`, percent: p }
    }
    return { text: `원래 ${F2(dev.GetLevel())} (0~1)`, percent: null }
  }

  return {
    input(name) {
      at.input = clock
      lastInput = name
      if (name === 'swap') at.swap = clock
      if (naive) naiveInput(name)
      else {
        const s = site!
        if (name === 'rise') s.Rise()
        else if (name === 'fall') s.Fall()
        else if (name === 'swap') s.SwapB()
      }
    },
    tick(dt) {
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot: () =>
      `level=${F2(level())} b=${naive ? deviceB() : site!.DeviceB} barA=${F2(barOf(0))} barB=${F2(barOf(1))} alarmA=${B(alarmOf(0))} alarmB=${B(alarmOf(1))}`,
    view(): SimView {
      const upg = bUpgraded()
      const world: WorldItem[] = [{ kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' }]

      // 왼쪽 위: 실제 방사선과 B 구역 장비
      world.push({ kind: 'text', x: 0.6, y: 8.3, text: `실제 방사선 ${F2(level())} (두 구역 같음)`, align: 'left', size: 22, color: '#e6edf7' })
      world.push({
        kind: 'text',
        x: 0.6,
        y: 7.6,
        text: naive
          ? `B 구역 장비 ${upg ? 'GeigerX' : 'LegacyProbe'} · HUD 가 장비 API 를 직접 부른다`
          : `B 구역 장비 ${upg ? 'GeigerX ← GeigerXAdapter' : 'LegacyProbe ← LegacyProbeAdapter'} · HUD 는 Level01 만`,
        align: 'left',
        size: 20,
        color: naive && upg ? '#ffb547' : '#8796ae',
      })

      // 땅 위 두 구역과 장비
      const zoneNames = ['북쪽 A', '남쪽 B']
      for (let i = 0; i < 2; i++) {
        const x0 = i === 0 ? 0.8 : 8.8
        const alarm = alarmOf(i)
        world.push({ kind: 'box', x: x0, y: 1, w: 6.4, h: 2.4, fill: '#16202f', stroke: alarm ? '#ff6b6b' : '#33445f', label: zoneNames[i] })
        const isGeiger = i === 1 && upg
        world.push({
          kind: 'box',
          x: x0 + 1.6,
          y: 1.15,
          w: 3.2,
          h: 0.65,
          fill: isGeiger ? '#3b2d5c' : '#24364f',
          stroke: isGeiger ? '#b48cff' : '#5cc8ff',
          label: isGeiger ? 'GeigerX' : 'LegacyProbe',
        })
        // 입력 직후 장비 → HUD 로 값이 올라가는 모양 (교체는 B 만 다시 읽는다)
        if (recent(at.input) && !(lastInput === 'swap' && i === 0)) world.push({ kind: 'arrow', x1: x0 + 0.6, y1: 3.5, x2: x0 + 0.6, y2: 4.45, color: '#5cc8ff', dashed: true })
      }
      if (recent(at.swap, 1.5)) world.push({ kind: 'actor', x: 8, y: 1, role: 'ally', label: '도윤', pose: 'run', facing: 1, scale: 0.8 })

      // HUD: 구역마다 막대, 원래 값과 쓴 값, 경보등
      for (let i = 0; i < 2; i++) {
        const x0 = i === 0 ? 0.8 : 8.8
        const w = 5.6
        const bar = barOf(i)
        const alarm = alarmOf(i)
        const raw = rawOf(i)
        const overflow = bar > 1
        world.push({ kind: 'bar', x: x0, y: 6.2, w, value: bar, fill: alarm ? '#ff6b6b' : '#5cc8ff', label: `${zoneNames[i]} 막대 ${F2(bar)}` })
        // 1 에서 잘린 막대 뒤로 넘친 부분 (틀 밖으로 뻗는다)
        if (overflow) world.push({ kind: 'box', x: x0 + w, y: 6.2, w: Math.min(4, (bar - 1) * w), h: 0.32, fill: '#ff5d6c' })
        // 경보 기준 눈금 (막대의 꽉 찬 값은 언제나 1)
        world.push({ kind: 'box', x: x0 + w * alarmLevel - 0.03, y: 6.1, w: 0.06, h: 0.52, fill: '#ffffff' })
        // 원래 값 → HUD 가 쓴 값
        if (naive && overflow) world.push({ kind: 'text', x: x0, y: 5.55, text: `${F2(bar)} ← 0~1 막대에 0~100`, align: 'left', size: 20, color: '#ff5d6c' })
        else world.push({ kind: 'text', x: x0, y: 5.55, text: `${raw.text} → ${F2(bar)}`, align: 'left', size: 20, color: '#c8d0de' })
        // 경보등
        world.push({ kind: 'ring', x: x0 + 0.3, y: 5.0, r: 0.26, color: alarm ? '#ff6b6b' : '#4a5872' })
        const missed = naive !== null && raw.percent !== null && f(raw.percent / 100) >= alarmLevel && !alarm
        if (missed) world.push({ kind: 'text', x: x0 + 0.8, y: 4.82, text: `경보 꺼짐 ← ${raw.percent} / 100 = ${Math.trunc(raw.percent! / 100)}`, align: 'left', size: 20, color: '#ff5d6c' })
        else world.push({ kind: 'text', x: x0 + 0.8, y: 4.82, text: alarm ? `경보 켜짐 (기준 ${F2(alarmLevel)} 이상)` : `경보 꺼짐 (기준 ${F2(alarmLevel)})`, align: 'left', size: 20, color: alarm ? '#ff6b6b' : '#8796ae' })
      }
      if (naive && recent(at.overflow, 1.2)) world.push({ kind: 'text', x: 12, y: 7.0, text: '막대 넘침', color: '#ff5d6c', size: 24 })
      if (naive && recent(at.missed, 1.2)) world.push({ kind: 'text', x: 12, y: 3.9, text: '경보 누락', color: '#ff5d6c', size: 24 })

      // 구조 그림: 입력 직후 그 입력이 지나는 노드와 화살표만
      const active: string[] = []
      if (recent(at.input)) {
        const swapOnly = lastInput === 'swap'
        if (naive) {
          active.push('ndraw', 'ncheck')
          const dev = upg ? 'ngeiger' : 'nlegacy'
          if (!swapOnly) active.push('nlegacy', 'ndraw-nlegacy', 'ncheck-nlegacy')
          active.push(dev, `ndraw-${dev}`, `ncheck-${dev}`)
        } else {
          active.push('hud', 'hud-sensor', 'sensor')
          const b = upg ? 'geiger' : 'legacy'
          if (!swapOnly) active.push('legacy-adapter', 'legacy', 'legacy-adapter-legacy', 'legacy-adapter-sensor')
          active.push(`${b}-adapter`, b, `${b}-adapter-${b}`, `${b}-adapter-sensor`)
        }
      }
      return { world, active: [...new Set(active)] }
    },
  }
}
