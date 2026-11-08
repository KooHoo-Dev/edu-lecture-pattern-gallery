import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/service-locator-audio 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/service-locator-audio/Target.cs 와 같은 글을 만드는 어댑터. float 계산은 없다 (모두 int).
 * C# 의 static(Services, AudioManager.Instance)은 모듈 전역이라, 한 페이지에 sim 이 둘 있어도 섞이지 않게
 * 어댑터가 입력마다 자기 static 값을 넣고(enter) 끝나면 꺼내 둔다(leave). */

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

/* ───────── Core/IAudioService.cs ───────── */

interface IAudioService {
  Play(clip: string): void
}

const SoundIds = { Fire: 'fire', DroneDown: 'drone-down', RepairDone: 'repair-done' }

/* ───────── Core/AudioService.cs ───────── */

class AudioService implements IAudioService {
  PlayCount = 0
  Played = new Event<[string]>()
  Play(clip: string) {
    this.PlayCount++
    this.Played.invoke(clip)
  }
}

/* ───────── Core/NullAudioService.cs ───────── */

class NullAudioService implements IAudioService {
  static readonly Instance = new NullAudioService()
  Play(_clip: string) {}
}

/* ───────── Core/Services.cs ───────── */

class Services {
  static audio: IAudioService = NullAudioService.Instance
  static get Audio() {
    return Services.audio
  }
  static AudioChanged = new Event<[IAudioService]>()
  static Provide(service: IAudioService | null) {
    Services.audio = service ?? NullAudioService.Instance
    Services.AudioChanged.invoke(Services.audio)
  }
  static Reset() {
    Services.audio = NullAudioService.Instance
    Services.AudioChanged = new Event<[IAudioService]>()
  }
}

/* ───────── Core/BaseGameCode.cs ───────── */

class Turret {
  Ammo: number
  Fired = new Event<[number]>()
  Empty = new Event<[]>()
  constructor(startAmmo: number) {
    this.Ammo = Math.max(0, startAmmo)
  }
  Fire() {
    if (this.Ammo <= 0) {
      this.Empty.invoke()
      return false
    }
    this.Ammo--
    Services.Audio.Play(SoundIds.Fire)
    this.Fired.invoke(this.Ammo)
    return true
  }
}

class DroneField {
  private alive: boolean[]
  Reward: number
  Credits = 0
  Destroyed = new Event<[number, number]>()
  NoneLeft = new Event<[]>()
  constructor(count: number, reward: number) {
    this.alive = new Array<boolean>(count).fill(true)
    this.Reward = reward
  }
  get Count() {
    return this.alive.length
  }
  IsAlive(index: number) {
    return this.alive[index]
  }
  DestroyNext() {
    const index = this.alive.indexOf(true)
    if (index < 0) {
      this.NoneLeft.invoke()
      return false
    }
    this.alive[index] = false
    Services.Audio.Play(SoundIds.DroneDown)
    this.Credits += this.Reward
    this.Destroyed.invoke(index, this.Reward)
    return true
  }
}

class RepairBay {
  Kits: number
  Completed = 0
  Repaired = new Event<[number, number]>()
  NoKits = new Event<[]>()
  constructor(startKits: number) {
    this.Kits = Math.max(0, startKits)
  }
  Complete() {
    if (this.Kits <= 0) {
      this.NoKits.invoke()
      return false
    }
    this.Kits--
    Services.Audio.Play(SoundIds.RepairDone)
    this.Completed++
    this.Repaired.invoke(this.Kits, this.Completed)
    return true
  }
}

/* ───────── Naive/NaiveAudioCalls.cs ───────── */

/** C# 의 null 참조 호출. 이 TS 에서는 null 을 부르는 대신 이 예외를 던진다 */
class NullReference extends Error {}
const deref = <T>(x: T | null): T => {
  if (x === null) throw new NullReference('NullReferenceException')
  return x
}

class AudioManager {
  static Instance: AudioManager | null = null
  PlayCount = 0
  LastClip = ''
  Awake() {
    AudioManager.Instance = this
  }
  OnDestroy() {
    if (AudioManager.Instance === this) AudioManager.Instance = null
  }
  Play(clip: string) {
    this.PlayCount++
    this.LastClip = clip
  }
}

class NaiveTurret {
  Ammo = 0
  Fire() {
    if (this.Ammo <= 0) return false
    this.Ammo--
    if (AudioManager.Instance !== null) AudioManager.Instance.Play('fire')
    return true
  }
}

class NaiveDroneField {
  alive: boolean[]
  reward = 0
  Credits = 0
  constructor(count: number) {
    this.alive = new Array<boolean>(count).fill(true)
  }
  DestroyNext() {
    const index = this.alive.indexOf(true)
    if (index < 0) return false
    this.alive[index] = false
    deref(AudioManager.Instance).Play('drone-down')
    this.Credits += this.reward
    return true
  }
}

class NaiveRepairBay {
  Kits = 0
  Completed = 0
  Complete() {
    if (this.Kits <= 0) return false
    this.Kits--
    deref(AudioManager.Instance).Play('repair-done')
    this.Completed++
    return true
  }
}

/* ───────── truth/service-locator-audio/Target.cs 와 같은 어댑터 + 무대 그림 ───────── */

const DroneCount = 5
const StartKits = 3
const intOf = (values: ParamValues, k: string) => Math.round(Number(values[k]))
const Name = (clip: string) => (clip === SoundIds.Fire ? '발사음' : clip === SoundIds.DroneDown ? '파괴음' : clip === SoundIds.RepairDone ? '완료음' : clip)
const Silent = () => (Services.Audio instanceof NullAudioService ? ' (무음)' : '')

/** 화면 좌표 (규칙에 쓰지 않는다) */
const droneX = (i: number) => 9.6 + i * 1.35
const AMMO_FULL = 10 // 탄약 막대 끝 = 조절 값 범위의 최대
const TURRET = { x: 3.1, y: 1.75 }
const BAY = { x: 6.6, y: 1.35 }

type Source = 'fire' | 'destroy' | 'repair'

export const createSim: SimFactory = (values: ParamValues, isNaive: boolean): PatternSim => {
  const events: string[] = []
  const ammo = intOf(values, 'startAmmo')
  const reward = intOf(values, 'reward')
  let clock = 0
  const at = { input: -9, inputName: '', sound: -9, soundClip: '', soundOn: true, soundFrom: 'fire' as Source, soundDrone: 0, bug: -9, shot: -9, shotTo: 0 }

  // 이 sim 의 static 값 (파일 머리 주석)
  const statics = { audio: NullAudioService.Instance as IAudioService, changed: new Event<[IAudioService]>(), instance: null as AudioManager | null }
  const enter = () => {
    Services.audio = statics.audio
    Services.AudioChanged = statics.changed
    AudioManager.Instance = statics.instance
  }
  const leave = () => {
    statics.audio = Services.audio
    statics.changed = Services.AudioChanged
    statics.instance = AudioManager.Instance
  }

  // 패턴
  let turret: Turret | null = null
  let drones: DroneField | null = null
  let bay: RepairBay | null = null
  let service: AudioService | null = null
  let hostEnabled = false

  // 나쁜 예
  let nTurret: NaiveTurret | null = null
  let nDrones: NaiveDroneField | null = null
  let nBay: NaiveRepairBay | null = null
  let naivePlays = 0
  const failedDrones: number[] = []
  let failedRepairs = 0

  const sounded = (clip: string, on: boolean) => {
    at.sound = clock
    at.soundClip = clip
    at.soundOn = on
  }

  const enableHost = () => {
    hostEnabled = true
    events.push('AudioServiceHost OnEnable → Provide(AudioService)')
    Services.Provide(service)
  }
  const disableHost = () => {
    hostEnabled = false
    events.push('AudioServiceHost OnDisable → 내가 등록한 서비스라 Provide(null)')
    if (Services.Audio === service) Services.Provide(null)
  }
  const newManager = () => {
    new AudioManager().Awake()
    events.push('AudioManager Awake → Instance = this')
  }

  enter()
  Services.Reset()
  AudioManager.Instance = null
  if (isNaive) {
    nTurret = new NaiveTurret()
    nTurret.Ammo = ammo
    nDrones = new NaiveDroneField(DroneCount)
    nDrones.reward = reward
    nBay = new NaiveRepairBay()
    nBay.Kits = StartKits
    newManager()
  } else {
    const t = (turret = new Turret(ammo))
    const d = (drones = new DroneField(DroneCount, reward))
    const b = (bay = new RepairBay(StartKits))
    service = new AudioService()
    service.Played.add(clip => {
      events.push(`AudioService 재생: ${Name(clip)}`)
      sounded(clip, true)
    })
    Services.AudioChanged.add(a => events.push(a instanceof NullAudioService ? 'Services.Audio → NullAudioService (무음)' : 'Services.Audio → AudioService'))
    t.Fired.add(left => {
      events.push(`Turret 발사 · 탄약 ${left}${Silent()}`)
      if (Silent()) sounded(SoundIds.Fire, false)
    })
    t.Empty.add(() => events.push('Turret 탄약 없음 (쏘지 않음)'))
    d.Destroyed.add((i, r) => {
      events.push(`DroneField 드론 ${i + 1} 파괴${Silent()} · 크레딧 +${r} → ${d.Credits}`)
      if (Silent()) sounded(SoundIds.DroneDown, false)
    })
    d.NoneLeft.add(() => events.push('DroneField 남은 드론 없음'))
    b.Repaired.add((kits, done) => {
      events.push(`RepairBay 정비 완료 ${done}건${Silent()} · 수리 키트 ${kits}`)
      if (Silent()) sounded(SoundIds.RepairDone, false)
    })
    b.NoKits.add(() => events.push('RepairBay 수리 키트 없음 (정비 안 함)'))
    enableHost()
  }
  leave()

  const patternInput = (name: string) => {
    if (name === 'fire') turret!.Fire()
    else if (name === 'destroy') drones!.DestroyNext()
    else if (name === 'repair') bay!.Complete()
    else if (name === 'toggleAudio') {
      if (hostEnabled) disableHost()
      else enableHost()
    }
  }

  const playsNow = () => (AudioManager.Instance === null ? -1 : AudioManager.Instance.PlayCount)
  const played = (before: number) => {
    const m = AudioManager.Instance
    if (m === null || m.PlayCount <= before) return false
    naivePlays++
    events.push(`AudioManager 재생: ${Name(m.LastClip)}`)
    sounded(m.LastClip, true)
    return true
  }

  const naiveInput = (name: string) => {
    if (name === 'fire') {
      const before = playsNow()
      if (!nTurret!.Fire()) {
        events.push('Turret 탄약 없음 (쏘지 않음)')
        return
      }
      const ok = played(before)
      events.push(`Turret 발사 · 탄약 ${nTurret!.Ammo}${ok ? '' : ' (무음: null 검사로 건너뜀)'}`)
      if (!ok) sounded(SoundIds.Fire, false)
    } else if (name === 'destroy') {
      const index = nDrones!.alive.indexOf(true)
      const before = playsNow()
      try {
        if (!nDrones!.DestroyNext()) {
          events.push('DroneField 남은 드론 없음')
          return
        }
      } catch (e) {
        if (!(e instanceof NullReference)) throw e
        events.push(`DroneField 드론 ${index + 1} 파괴`)
        events.push(`!NullReferenceException: AudioManager.Instance 가 null → 아래 줄(크레딧 +${nDrones!.reward})이 실행되지 않았다`)
        failedDrones.push(index)
        at.bug = clock
        return
      }
      played(before)
      events.push(`DroneField 드론 ${index + 1} 파괴 · 크레딧 +${nDrones!.reward} → ${nDrones!.Credits}`)
    } else if (name === 'repair') {
      const before = playsNow()
      try {
        if (!nBay!.Complete()) {
          events.push('RepairBay 수리 키트 없음 (정비 안 함)')
          return
        }
      } catch (e) {
        if (!(e instanceof NullReference)) throw e
        events.push(`RepairBay 수리 키트 ${nBay!.Kits}`)
        events.push('!NullReferenceException: AudioManager.Instance 가 null → 아래 줄(정비 완료 기록)이 실행되지 않았다')
        failedRepairs++
        at.bug = clock
        return
      }
      played(before)
      events.push(`RepairBay 정비 완료 ${nBay!.Completed}건 · 수리 키트 ${nBay!.Kits}`)
    } else if (name === 'toggleAudio') {
      if (AudioManager.Instance !== null) {
        AudioManager.Instance.OnDestroy()
        events.push('AudioManager 파괴 → OnDestroy 에서 Instance = null')
      } else newManager()
    }
  }

  const recent = (t: number, within = 0.35) => clock - t < within
  const aliveAt = (i: number) => (isNaive ? nDrones!.alive[i] : drones!.IsAlive(i))
  const firstAlive = () => {
    for (let i = 0; i < DroneCount; i++) if (aliveAt(i)) return i
    return -1
  }
  const snapAudio = () => (isNaive ? (statics.instance === null ? 'null' : 'AudioManager') : statics.audio instanceof NullAudioService ? 'NullAudioService' : 'AudioService')
  const ammoNow = () => (isNaive ? nTurret!.Ammo : turret!.Ammo)
  const credits = () => (isNaive ? nDrones!.Credits : drones!.Credits)
  const kits = () => (isNaive ? nBay!.Kits : bay!.Kits)
  const repaired = () => (isNaive ? nBay!.Completed : bay!.Completed)
  const aliveCount = () => {
    let n = 0
    for (let i = 0; i < DroneCount; i++) if (aliveAt(i)) n++
    return n
  }
  const sounds = () => (isNaive ? naivePlays : service!.PlayCount)

  return {
    input(name) {
      at.input = clock
      at.inputName = name
      if (name === 'fire' && ammoNow() > 0) {
        at.shot = clock
        at.shotTo = firstAlive()
      }
      if (name === 'destroy') at.soundDrone = firstAlive()
      at.soundFrom = name === 'destroy' ? 'destroy' : name === 'repair' ? 'repair' : 'fire'
      enter()
      if (isNaive) naiveInput(name)
      else patternInput(name)
      leave()
    },
    tick(dt) {
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot: () => `audio=${snapAudio()} ammo=${ammoNow()} credits=${credits()} kits=${kits()} repaired=${repaired()} drones=${aliveCount()} sounds=${sounds()}`,
    view(): SimView {
      const silentSlot = isNaive ? statics.instance === null : statics.audio instanceof NullAudioService
      const missed = failedDrones.length * reward
      const world: WorldItem[] = [
        { kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' },
        // 왼쪽 위 상태
        { kind: 'text', x: 0.4, y: 8.3, text: `탄약 ${ammoNow()} · 크레딧 ${credits()} · 수리 키트 ${kits()}`, align: 'left', size: 22, color: '#e6ebf3' },
      ]
      if (isNaive) {
        const lost: string[] = []
        if (failedDrones.length > 0) lost.push(`못 받은 크레딧 ${missed}`)
        if (failedRepairs > 0) lost.push(`기록 안 된 정비 ${failedRepairs}건`)
        world.push({ kind: 'text', x: 0.4, y: 7.6, text: lost.length > 0 ? lost.join(' · ') : `정비 완료 ${repaired()}건 · 예외 없음`, align: 'left', size: 18, color: lost.length > 0 ? '#ff5d6c' : '#8796ae' })
      } else world.push({ kind: 'text', x: 0.4, y: 7.6, text: `정비 완료 ${repaired()}건 · 소리 ${sounds()}번`, align: 'left', size: 18, color: '#8796ae' })

      // 서비스 자리
      const slotLabel = isNaive ? (silentSlot ? 'AudioManager.Instance → null' : 'AudioManager.Instance → AudioManager') : silentSlot ? 'Services.Audio → NullAudioService (무음)' : 'Services.Audio → AudioService'
      const slotFill = silentSlot ? (isNaive ? '#5a3a12' : '#2c3442') : '#1d4a3a'
      world.push({ kind: 'box', x: 7.1, y: 7.4, w: 8.7, h: 1.05, fill: slotFill, stroke: silentSlot && isNaive ? '#ffa94d' : undefined, dashed: silentSlot, label: slotLabel })

      // 포탑과 탄약
      world.push({ kind: 'box', x: 0.8, y: 1, w: 1.9, h: 1.0, fill: '#3a4a63', label: '포탑' })
      world.push({ kind: 'box', x: 2.7, y: 1.62, w: 0.6, h: 0.26, fill: '#5d6f8c' })
      world.push({ kind: 'bar', x: 0.6, y: 2.7, w: 2.6, value: Math.min(1, ammoNow() / AMMO_FULL), fill: ammoNow() > 0 ? '#ffd166' : '#4a5872', label: `탄약 ${ammoNow()}` })
      if (recent(at.shot, 0.3) && at.shotTo >= 0) world.push({ kind: 'arrow', x1: TURRET.x + 0.3, y1: TURRET.y, x2: droneX(at.shotTo) - 0.4, y2: 3.9, color: '#ffd166' })

      // 드론
      for (let i = 0; i < DroneCount; i++) {
        const alive = aliveAt(i)
        world.push(alive ? { kind: 'actor', x: droneX(i), y: 3.4, role: 'enemy', label: `D${i + 1}`, facing: -1, scale: 0.8 } : { kind: 'actor', x: droneX(i), y: 1, role: 'enemy', label: `D${i + 1}`, pose: 'down', alpha: 0.35, scale: 0.8, facing: -1 })
        if (!alive && failedDrones.includes(i)) world.push({ kind: 'text', x: droneX(i), y: 2.3, text: '✖', color: '#ff5d6c', size: 26 })
      }
      if (failedDrones.length > 0) {
        world.push({ kind: 'text', x: 12.3, y: 5.6, text: `✖ 드론 ${failedDrones.map(i => i + 1).join(', ')} 파괴 · 크레딧 +${reward} 안 들어옴`, color: '#ff5d6c', size: 18 })
      }

      // 정비대
      world.push({ kind: 'box', x: 4.6, y: 1, w: 4, h: 0.7, fill: '#2b3d33', label: `정비대 · 완료 ${repaired()}건` })
      world.push({ kind: 'actor', x: 8.1, y: 1.7, role: 'ally', label: '도윤', scale: 0.6 })
      if (isNaive && failedRepairs > 0) world.push({ kind: 'text', x: 6.4, y: 3.7, text: `✖ 키트만 쓰고 완료 기록 안 됨 (${failedRepairs}건)`, color: '#ff5d6c', size: 16 })

      // 소리
      if (recent(at.sound, 0.7)) {
        const p = at.soundFrom === 'destroy' ? { x: droneX(Math.max(0, at.soundDrone)), y: 1.5 } : at.soundFrom === 'repair' ? BAY : TURRET
        if (at.soundOn) world.push({ kind: 'ring', x: p.x, y: p.y, r: 0.5 + (clock - at.sound) * 0.9, color: '#7ee081' })
        world.push({ kind: 'text', x: p.x, y: p.y + 1.3, text: at.soundOn ? `♪ ${Name(at.soundClip)}` : '♪ 무음', color: at.soundOn ? '#7ee081' : '#8796ae', size: 20 })
      }
      if (isNaive && recent(at.bug, 1.2)) world.push({ kind: 'text', x: 12.3, y: 6.4, text: 'NullReferenceException', color: '#ff5d6c', size: 24 })

      const active: string[] = []
      if (recent(at.input)) {
        const n = at.inputName
        if (isNaive) {
          if (n === 'toggleAudio') active.push('n-manager', 'n-manager-instance', 'n-instance')
          else {
            const who = n === 'fire' ? 'n-turret' : n === 'destroy' ? 'n-drones' : 'n-bay'
            active.push(who, `${who}-instance`, 'n-instance')
          }
        } else if (n === 'toggleAudio') active.push('host', 'host-services', 'services')
        else {
          active.push('game', 'game-services', 'services', 'services-iface')
          if (recent(at.sound) && at.sound >= at.input) active.push(at.soundOn ? 'real' : 'null', at.soundOn ? 'real-iface' : 'null-iface')
        }
      }
      return { world, active }
    },
  }
}
