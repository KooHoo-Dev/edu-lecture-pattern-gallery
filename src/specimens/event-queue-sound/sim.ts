import type { ParamValues } from '@koohoo/gallery-kit'
import type { PatternSim, SimFactory, SimView, WorldItem } from '../../stage/types.ts'

/* unity/event-queue-sound 의 Core/ 와 Naive/ 를 같은 이름, 같은 순서로 옮긴 시뮬레이션과
 * truth/event-queue-sound/Target.cs 와 같은 글을 만드는 어댑터. C# 의 float 계산은 f() 로 맞춘다. */

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

/* ───────── Core/DroneLine.cs ───────── */

class DroneLine {
  private alive: boolean[]
  Wave = 1
  Destroyed = new Event<[number]>()
  WaveCleared = new Event<[number]>()
  WaveStarted = new Event<[number, number]>()
  NoTarget = new Event<[]>()

  constructor(count: number) {
    this.alive = new Array(Math.max(1, count)).fill(true)
  }

  get Count() {
    return this.alive.length
  }
  IsAlive(index: number) {
    return this.alive[index]
  }
  get AliveCount() {
    let n = 0
    for (const a of this.alive) if (a) n++
    return n
  }

  Shot() {
    for (let i = 0; i < this.alive.length; i++) {
      if (!this.alive[i]) continue
      this.Destroy(i)
      return
    }
    this.NoTarget.invoke()
  }

  Volley() {
    let any = false
    for (let i = 0; i < this.alive.length; i++) {
      if (!this.alive[i]) continue
      this.Destroy(i)
      any = true
    }
    if (!any) this.NoTarget.invoke()
  }

  NewWave() {
    this.Wave++
    this.alive.fill(true)
    this.WaveStarted.invoke(this.Wave, this.alive.length)
  }

  private Destroy(index: number) {
    this.alive[index] = false
    this.Destroyed.invoke(index)
    if (this.AliveCount === 0) this.WaveCleared.invoke(this.Wave)
  }
}

/* ───────── Core/SoundQueue.cs ───────── */

const SoundIds = { Explosion: 'explosion', WaveAlert: 'wave-alert' } as const

interface SoundRequest {
  Id: string
  Volume: number
  Count: number
}

class SoundChannel {
  Id = ''
  Volume = 0
  Count = 0
  Remaining = 0
  get IsPlaying() {
    return this.Remaining > 0
  }
}

interface SoundQueueSettings {
  MaxVoices: number
  SoundLength: number
}

class SoundQueue {
  Settings: SoundQueueSettings
  // 링 버퍼. Nystrom 은 칸 하나를 비워 두고, 여기서는 count 로 꽉 참과 빔을 가른다
  private pending: SoundRequest[]
  private head = 0
  private tail = 0
  private count = 0
  private channels: SoundChannel[]
  Queued = new Event<[string, number, number]>()
  Merged = new Event<[string, number, number]>()
  Dropped = new Event<[string]>()
  Played = new Event<[number, string, number]>()
  Finished = new Event<[number, string]>()
  MergedTotal = 0
  DroppedTotal = 0

  constructor(settings: SoundQueueSettings, queueSize = 8) {
    this.Settings = settings
    this.pending = Array.from({ length: Math.max(1, queueSize) }, () => ({ Id: '', Volume: 0, Count: 0 }))
    this.channels = Array.from({ length: Math.max(1, settings.MaxVoices) }, () => new SoundChannel())
  }

  get Count() {
    return this.count
  }
  get Capacity() {
    return this.pending.length
  }
  get Head() {
    return this.head
  }
  get Tail() {
    return this.tail
  }
  get ChannelCount() {
    return this.channels.length
  }
  Channel(index: number) {
    return this.channels[index]
  }
  PendingAt(index: number): SoundRequest {
    return this.pending[(this.head + index) % this.pending.length]
  }

  get Loudness() {
    let sum = 0
    for (const c of this.channels) if (c.IsPlaying) sum = f(sum + c.Volume)
    return sum
  }

  Request(id: string, volume: number) {
    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.pending.length
      const p = this.pending[index]
      if (p.Id !== id) continue
      p.Volume = Math.max(p.Volume, volume)
      p.Count++
      this.MergedTotal++
      this.Merged.invoke(id, p.Count, p.Volume)
      return
    }
    if (this.count === this.pending.length) {
      this.DroppedTotal++
      this.Dropped.invoke(id)
      return
    }
    this.pending[this.tail] = { Id: id, Volume: volume, Count: 1 }
    this.tail = (this.tail + 1) % this.pending.length
    this.count++
    this.Queued.invoke(id, volume, this.count)
  }

  Tick(dt: number) {
    for (let i = 0; i < this.channels.length; i++) {
      const c = this.channels[i]
      if (!c.IsPlaying) continue
      c.Remaining = f(c.Remaining - dt)
      if (c.Remaining > 0) continue
      c.Remaining = 0
      this.Finished.invoke(i, c.Id)
    }
    let ready = this.count
    for (let i = 0; i < this.channels.length && ready > 0; i++) {
      const c = this.channels[i]
      if (c.IsPlaying) continue
      const r = this.pending[this.head]
      this.head = (this.head + 1) % this.pending.length
      this.count--
      ready--
      c.Id = r.Id
      c.Volume = r.Volume
      c.Count = r.Count
      c.Remaining = this.Settings.SoundLength
      this.Played.invoke(i, r.Id, r.Volume)
    }
  }
}

/* ───────── Naive/NaiveSoundManager.cs ───────── */

class NaiveSource {
  clip = ''
  volume = 0
  clipLength = 0
  remaining = 0
  get isPlaying() {
    return this.remaining > 0
  }
  Play() {
    this.remaining = this.clipLength
  }
}

class NaiveSoundManager {
  sources: NaiveSource[]
  constructor(maxVoices: number, soundLength: number) {
    this.sources = Array.from({ length: maxVoices < 1 ? 1 : maxVoices }, () => {
      const s = new NaiveSource()
      s.clipLength = soundLength
      return s
    })
  }

  Play(clip: string, volume: number): boolean {
    for (const s of this.sources) {
      if (!s.isPlaying) {
        s.clip = clip
        s.volume = volume
        s.Play()
        return true
      }
    }
    return false
  }

  Update(dt: number) {
    for (const s of this.sources) {
      if (!s.isPlaying) continue
      s.remaining = f(s.remaining - dt)
      if (s.remaining <= 0) s.remaining = 0
    }
  }
}

class NaiveDroneLine {
  alive: boolean[]
  wave = 1
  explosionVolume = f(0.5)
  alertVolume = f(0.4)
  sound: NaiveSoundManager

  constructor(count: number, sound: NaiveSoundManager) {
    this.alive = new Array(count < 1 ? 1 : count).fill(true)
    this.sound = sound
  }

  AliveCount() {
    let n = 0
    for (const a of this.alive) if (a) n++
    return n
  }

  OnShot() {
    for (let i = 0; i < this.alive.length; i++) {
      if (!this.alive[i]) continue
      this.DestroyDrone(i)
      return
    }
  }

  OnVolley() {
    for (let i = 0; i < this.alive.length; i++) if (this.alive[i]) this.DestroyDrone(i)
  }

  OnNewWave() {
    this.wave++
    this.alive.fill(true)
  }

  private DestroyDrone(index: number) {
    this.alive[index] = false
    this.sound.Play(SoundIds.Explosion, this.explosionVolume)
    if (this.AliveCount() === 0) this.sound.Play(SoundIds.WaveAlert, this.alertVolume)
  }
}

/* ───────── truth/event-queue-sound/Target.cs 와 같은 어댑터 + 무대 그림 ───────── */

const DRONE_COUNT = 5
const QUEUE_SIZE = 8
const ALERT_VOLUME = f(0.4)
/** 음량 미터의 기준선 (고정). 비교는 1% 단위 정수로 한다 (float 합이 1.00 언저리에서 갈리지 않게) */
const LIMIT = 1
const LIMIT_PERCENT = 100
const Percent = (volume: number) => Math.round(volume * 100)
/** 화면에만: 방금 꺼낸 요청을 큐 자리에 흐리게 남기는 가장 긴 시간 (그 채널이 그 소리를 울리는 동안만) */
const POPPED_SHOW = 0.5
/** 음량 미터의 꽉 찬 값 (고정. 기준선이 가운데) */
const METER_MAX = 2
/** 채널 남은 시간 막대의 꽉 찬 값 (소리 길이 조절 값의 최대. 고정) */
const LENGTH_MAX = 1.5

const F2 = (v: number) => v.toFixed(2)
const Name = (id: string) => (id === SoundIds.Explosion ? '폭발' : '웨이브 끝 알림')
const Short = (id: string) => (id === SoundIds.Explosion ? '폭발' : '알림')
const Label = (id: string, count: number) => (count > 1 ? `${Name(id)} ×${count}` : Name(id))
const ShortLabel = (id: string, count: number) => (count > 1 ? `${Short(id)} ×${count}` : Short(id))

/* 무대 배치 (세로 위치는 화면에만 있다) */
const DRONE_X = [5.6, 7.6, 9.6, 11.6, 13.6]
const MUZZLE = { x: 2.9, y: 1.6 }
const CELL = { x: 0.4, w: 1.6, gap: 0.12, y: 5.75, h: 0.85 }
const QCELL = { x: 0.4, w: 2.6, gap: 0.12, y: 3.75, h: 0.8 }
const METER = { x: 11.3, y: 5.9, w: 4.2 }
const FILL = { explosion: '#6b3d1f', alert: '#1f4d6b' }
const fillOf = (id: string) => (id === SoundIds.Explosion ? FILL.explosion : FILL.alert)

interface ChannelView {
  id: string
  count: number
  remaining: number
  playing: boolean
}

export const createSim: SimFactory = (values: ParamValues, naive: boolean): PatternSim => {
  const num = (k: string) => f(Number(values[k]))
  const maxVoices = Math.round(Number(values.maxVoices))
  const soundLength = num('soundLength')
  const explosionVolume = num('explosionVolume')
  const events: string[] = []
  let clock = 0
  let frame = 0
  const at = { input: -9, played: -9, dropped: -9, shot: -9 }
  let shotTargets: number[] = []

  /** 공통 무대: 땅, 기지, 포탑, 드론, 사격 화살표, 채널 칸, 음량 미터 */
  const scene = (alive: (i: number) => boolean, channels: ChannelView[], loud: number, overlapChannels: Set<number>, status: [string, string, string]): WorldItem[] => {
    const world: WorldItem[] = [
      { kind: 'box', x: 0, y: 0, w: 16, h: 1, fill: '#22314a' },
      { kind: 'box', x: 0.2, y: 1, w: 1.25, h: 2.0, fill: '#1b2a40', stroke: '#4a5872', label: '기지' },
      { kind: 'box', x: 1.6, y: 1, w: 1.3, h: 0.9, fill: '#2b4a6b', label: '포탑' },
    ]
    for (let i = 0; i < DRONE_COUNT; i++) {
      const up = alive(i)
      world.push({ kind: 'actor', x: DRONE_X[i], y: 1, role: 'enemy', facing: -1, scale: 0.8, label: up ? `드론 ${i + 1}` : '파괴', pose: up ? 'idle' : 'down', alpha: up ? 1 : 0.35 })
    }
    if (clock - at.shot < 0.3) {
      for (const i of shotTargets) {
        world.push({ kind: 'arrow', x1: MUZZLE.x, y1: MUZZLE.y, x2: DRONE_X[i] - 0.35, y2: 1.5, color: '#ffb547' })
        world.push({ kind: 'ring', x: DRONE_X[i], y: 1.45, r: 0.55, color: '#ffb547' })
      }
    }
    world.push(
      { kind: 'text', x: 0.4, y: 8.3, text: status[0], align: 'left', size: 26, color: status[2] },
      { kind: 'text', x: 0.4, y: 7.6, text: status[1], align: 'left', size: 20, color: '#8796ae' },
      { kind: 'text', x: CELL.x, y: 6.95, text: `스피커 채널 ${channels.length}개`, align: 'left', size: 20, color: '#8796ae' },
    )
    channels.forEach((c, i) => {
      const x = CELL.x + i * (CELL.w + CELL.gap)
      if (c.playing) {
        const bad = overlapChannels.has(i)
        world.push({ kind: 'box', x, y: CELL.y, w: CELL.w, h: CELL.h, fill: fillOf(c.id), stroke: bad ? '#ff5d6c' : undefined, label: ShortLabel(c.id, c.count) })
        world.push({ kind: 'bar', x, y: CELL.y - 0.45, w: CELL.w, value: c.remaining / LENGTH_MAX, fill: bad ? '#ff5d6c' : '#7ee081' })
      } else {
        world.push({ kind: 'box', x, y: CELL.y, w: CELL.w, h: CELL.h, stroke: '#4a5872', dashed: true, label: '빈 칸' })
      }
    })
    const over = Percent(loud) > LIMIT_PERCENT
    world.push(
      { kind: 'bar', x: METER.x, y: METER.y, w: METER.w, value: loud / METER_MAX, fill: over ? '#ff5d6c' : '#7ee081', label: over ? `음량 합 ${F2(loud)} · 기준 초과` : `음량 합 ${F2(loud)}` },
      { kind: 'box', x: METER.x + METER.w * (LIMIT / METER_MAX) - 0.03, y: METER.y - 0.12, w: 0.06, h: 0.6, fill: '#e6edf7' },
      { kind: 'text', x: METER.x + METER.w * (LIMIT / METER_MAX), y: METER.y - 0.5, text: '기준 1.0', size: 16, color: '#c8d0de' },
    )
    return world
  }

  if (!naive) {
    const line = new DroneLine(DRONE_COUNT)
    const queue = new SoundQueue({ MaxVoices: maxVoices, SoundLength: soundLength }, QUEUE_SIZE)
    const queuedAt = new Map<string, number>()
    /** 화면에만: 가장 최근 Tick 에 큐에서 꺼낸 요청들 (요청과 꺼냄이 한 프레임 안이라 큐 칸이 비어 보이지 않게 잠시 흐리게 남긴다) */
    let popped: { id: string; count: number; channel: number }[] = []
    const stillPlaying = (p: { id: string; count: number; channel: number }) => {
      const c = queue.Channel(p.channel)
      return c.IsPlaying && c.Id === p.id && c.Count === p.count
    }
    line.Destroyed.add(i => {
      events.push(`드론 ${i + 1} 파괴`)
      shotTargets.push(i)
      queue.Request(SoundIds.Explosion, explosionVolume)
    })
    line.WaveCleared.add(w => {
      events.push(`웨이브 ${w} 끝`)
      queue.Request(SoundIds.WaveAlert, ALERT_VOLUME)
    })
    line.WaveStarted.add((w, n) => events.push(`웨이브 ${w} 시작 · 드론 ${n}대`))
    line.NoTarget.add(() => events.push('쏠 드론 없음'))
    queue.Queued.add((id, volume, pending) => {
      queuedAt.set(id, frame)
      events.push(`요청 ${Name(id)} ${F2(volume)} → 대기 ${pending}`)
    })
    queue.Merged.add((id, count, volume) => events.push(`합침 ${Name(id)} ×${count} (음량 ${F2(volume)})`))
    queue.Dropped.add(id => {
      events.push(`큐가 꽉 참 · ${Name(id)} 버림`)
      at.dropped = clock
    })
    queue.Played.add((channel, id, volume) => {
      const waited = queuedAt.has(id) ? frame - queuedAt.get(id)! : 0
      const wait = waited > 0 ? ` · ${F2(waited / 60)}초 기다림` : ''
      events.push(`채널 ${channel + 1} 재생 ${Label(id, queue.Channel(channel).Count)} ${F2(volume)} · 대기 ${queue.Count}${wait}`)
      if (at.played !== clock) popped = []
      popped.push({ id, count: queue.Channel(channel).Count, channel })
      at.played = clock
    })
    queue.Finished.add((channel, id) => events.push(`채널 ${channel + 1} 끝 · ${Name(id)}`))

    return {
      input(name) {
        at.input = clock
        shotTargets = []
        if (name === 'shot') line.Shot()
        else if (name === 'volley') line.Volley()
        else line.NewWave()
        if (shotTargets.length) at.shot = clock
      },
      tick(dt) {
        queue.Tick(dt)
        frame++
        clock += dt
      },
      drain: () => events.splice(0),
      snapshot() {
        let s = `alive=${line.AliveCount} pending=${queue.Count} merged=${queue.MergedTotal} dropped=${queue.DroppedTotal} loud=${F2(queue.Loudness)} ch=`
        const names: string[] = []
        for (let i = 0; i < queue.ChannelCount; i++) {
          const c = queue.Channel(i)
          names.push(c.IsPlaying ? (c.Count > 1 ? `${Short(c.Id)}×${c.Count}` : Short(c.Id)) : '-')
        }
        s += names.join(',')
        for (let i = 0; i < queue.ChannelCount; i++) s += ` t${i + 1}=${F2(queue.Channel(i).Remaining)}`
        return s
      },
      view(): SimView {
        const channels: ChannelView[] = []
        for (let i = 0; i < queue.ChannelCount; i++) {
          const c = queue.Channel(i)
          channels.push({ id: c.Id, count: c.Count, remaining: c.Remaining, playing: c.IsPlaying })
        }
        const world = scene(
          i => line.IsAlive(i),
          channels,
          queue.Loudness,
          new Set<number>(),
          [`대기 ${queue.Count} · 합침 ${queue.MergedTotal} · 버림 ${queue.DroppedTotal}`, `웨이브 ${line.Wave} · 드론 ${line.AliveCount}/${DRONE_COUNT} · 소리 길이 ${F2(soundLength)}초`, '#7ee081'],
        )
        world.push({ kind: 'text', x: QCELL.x, y: 4.85, text: `대기 큐 · 링 버퍼 ${queue.Capacity}칸 (head ${queue.Head} · tail ${queue.Tail})`, align: 'left', size: 20, color: '#8796ae' })
        const shown = Math.min(queue.Count, 3)
        for (let i = 0; i < shown; i++) {
          const r = queue.PendingAt(i)
          world.push({ kind: 'box', x: QCELL.x + i * (QCELL.w + QCELL.gap), y: QCELL.y, w: QCELL.w, h: QCELL.h, fill: fillOf(r.Id), stroke: '#ffb547', label: ShortLabel(r.Id, r.Count) })
        }
        // Tick 은 같은 프레임 안에서 꺼내므로, 프레임이 끝났는데 남아 있다면 빈 채널을 기다리는 중이다
        if (queue.Count > 0) world.push({ kind: 'text', x: QCELL.x + shown * (QCELL.w + QCELL.gap) + 0.1, y: 4.0, text: '← 빈 채널을 기다린다', align: 'left', size: 18, color: '#ffb547' })
        else if (clock - at.played < POPPED_SHOW && popped.some(p => stillPlaying(p))) {
          // 그 채널이 아직 그 소리를 울리는 동안만 (소리가 끝났는데 '방금 꺼냄' 이 남지 않게)
          const shownPopped = popped.filter(p => stillPlaying(p))
          shownPopped.forEach((p, i) => world.push({ kind: 'box', x: QCELL.x + i * (QCELL.w + QCELL.gap), y: QCELL.y, w: QCELL.w, h: QCELL.h, stroke: '#4a5872', dashed: true, label: `${ShortLabel(p.id, p.count)} → ${p.channel + 1}` }))
          world.push({ kind: 'text', x: QCELL.x + shownPopped.length * (QCELL.w + QCELL.gap) + 0.1, y: 4.0, text: '방금 꺼내 채널로 (→ 채널 번호)', align: 'left', size: 18, color: '#8796ae' })
        } else world.push({ kind: 'box', x: QCELL.x, y: QCELL.y, w: QCELL.w, h: QCELL.h, stroke: '#4a5872', dashed: true, label: '비어 있음' })
        const active: string[] = []
        if (clock - at.input < 0.3) active.push('input', 'input-drones', 'drones', 'input-queue', 'queue')
        if (clock - at.played < 0.3) active.push('player', 'player-queue', 'queue-channels', 'channels', 'player-channels')
        if (queue.Count > 0) active.push('queue')
        return { world, active }
      },
    }
  }

  const n = new NaiveDroneLine(DRONE_COUNT, new NaiveSoundManager(maxVoices, soundLength))
  n.explosionVolume = explosionVolume
  n.alertVolume = ALERT_VOLUME
  const sources = n.sound.sources
  /** 소리 겹침으로 표시 중인 채널 (한 입력에서 함께 시작한 같은 소리). 빨간 테두리와 "같은 폭발 n겹" 이 이것만 본다 */
  let overlapChannels: number[] = []
  let naiveDropped = 0
  let explosionsDropped = 0
  /** 지금 웨이브의 끝 알림이 버려졌다 (새 웨이브까지 화면에 남긴다) */
  let alertLost = 0

  const playingFlags = () => sources.map(s => s.isPlaying)
  /** Target.cs 의 CheckOverlap: 이번 입력에서 함께 시작한 같은 소리가 둘 이상이고 음량 합이 기준을 넘을 때만 (패턴이 합쳐 고치는 경우) */
  const checkOverlap = (started: number[], playedSoFar: number) => {
    for (let a = 0; a < playedSoFar; a++) {
      const clip = sources[started[a]].clip
      let same = 0
      let percent = 0
      for (let b = 0; b < playedSoFar; b++) {
        const s = sources[started[b]]
        if (s.clip !== clip) continue
        same++
        percent += Percent(s.volume)
      }
      if (same < 2 || percent <= LIMIT_PERCENT) continue
      if (overlapChannels.length === 0) events.push(`!소리 겹침: 같은 프레임에 ${Name(clip)} ${same}겹 · 음량 합 ${F2(percent / 100)} (기준 ${F2(LIMIT_PERCENT / 100)})`)
      for (let b = 0; b < playedSoFar; b++) if (sources[started[b]].clip === clip && !overlapChannels.includes(started[b])) overlapChannels.push(started[b])
      return
    }
  }
  const loudness = () => {
    let loud = 0
    for (const s of sources) if (s.isPlaying) loud = f(loud + s.volume)
    return loud
  }

  return {
    input(name) {
      at.input = clock
      const aliveBefore = [...n.alive]
      const playingBefore = playingFlags()
      if (name === 'shot') n.OnShot()
      else if (name === 'volley') n.OnVolley()
      else {
        n.OnNewWave()
        events.push(`웨이브 ${n.wave} 시작 · 드론 ${n.alive.length}대`)
        alertLost = 0
        explosionsDropped = 0
        return
      }
      const started: number[] = []
      for (let i = 0; i < sources.length; i++) if (!playingBefore[i] && sources[i].isPlaying) started.push(i)
      const destroyed: number[] = []
      for (let i = 0; i < aliveBefore.length; i++) if (aliveBefore[i] && !n.alive[i]) destroyed.push(i)
      if (destroyed.length === 0) {
        events.push('쏠 드론 없음')
        return
      }
      shotTargets = destroyed
      at.shot = clock
      let next = 0
      for (const d of destroyed) {
        events.push(`드론 ${d + 1} 파괴`)
        if (next < started.length && sources[started[next]].clip === SoundIds.Explosion) {
          events.push(`채널 ${started[next] + 1} 바로 재생 폭발 ${F2(sources[started[next]].volume)}`)
          next++
        } else {
          naiveDropped++
          explosionsDropped++
          at.dropped = clock
          events.push('폭발 버림 · 빈 AudioSource 없음')
        }
      }
      // 알림은 한 입력에 하나뿐이라 겹침은 폭발까지만 보면 된다
      checkOverlap(started, next)
      if (n.AliveCount() === 0) {
        events.push(`웨이브 ${n.wave} 끝`)
        if (next < started.length) {
          events.push(`채널 ${started[next] + 1} 바로 재생 웨이브 끝 알림 ${F2(sources[started[next]].volume)}`)
          next++
        } else {
          naiveDropped++
          alertLost = n.wave
          at.dropped = clock
          events.push(`!알림 잘림: 웨이브 ${n.wave} 끝 알림을 버렸다 (빈 AudioSource 없음, 채널 ${sources.length}개가 모두 울리는 중)`)
        }
      }
    },
    tick(dt) {
      const playingBefore = playingFlags()
      n.sound.Update(dt)
      for (let i = 0; i < sources.length; i++) if (playingBefore[i] && !sources[i].isPlaying) events.push(`채널 ${i + 1} 끝 · ${Name(sources[i].clip)}`)
      // Tick 은 겹침 표시를 끄기만 한다
      overlapChannels = overlapChannels.filter(i => sources[i].isPlaying)
      clock += dt
    },
    drain: () => events.splice(0),
    snapshot() {
      let s = `alive=${n.AliveCount()} dropped=${naiveDropped} loud=${F2(loudness())} ch=`
      s += sources.map(src => (src.isPlaying ? Short(src.clip) : '-')).join(',')
      for (let i = 0; i < sources.length; i++) s += ` t${i + 1}=${F2(sources[i].remaining)}`
      return s
    },
    view(): SimView {
      const channels: ChannelView[] = sources.map(s => ({ id: s.clip, count: 1, remaining: s.remaining, playing: s.isPlaying }))
      const world = scene(
        i => n.alive[i],
        channels,
        loudness(),
        new Set(overlapChannels),
        [`바로 재생 · 대기 없음 · 버림 ${naiveDropped}`, `웨이브 ${n.wave} · 드론 ${n.AliveCount()}/${DRONE_COUNT} · 소리 길이 ${F2(soundLength)}초`, alertLost > 0 ? '#ff5d6c' : '#ffb547'],
      )
      world.push(
        { kind: 'text', x: QCELL.x, y: 4.85, text: '바로 재생 · 큐 없음', align: 'left', size: 20, color: '#8796ae' },
        { kind: 'text', x: QCELL.x, y: 4.1, text: '요청하는 순간 빈 AudioSource 를 찾아 튼다. 없으면 버린다', align: 'left', size: 18, color: '#8796ae' },
      )
      // 사건 기록의 ✖ 소리 겹침과 같은 판정 (함께 시작한 같은 소리만)
      if (overlapChannels.length >= 2) world.push({ kind: 'text', x: METER.x, y: 4.85, text: `같은 ${Short(sources[overlapChannels[0]].clip)} ${overlapChannels.length}겹`, align: 'left', size: 20, color: '#ff5d6c' })
      if (alertLost > 0) world.push({ kind: 'box', x: QCELL.x, y: 3.1, w: 6.4, h: 0.7, fill: 'rgba(120, 20, 30, 0.85)', stroke: '#ff5d6c', label: `웨이브 ${alertLost} 끝 알림 버림` })
      if (explosionsDropped > 0) world.push({ kind: 'text', x: 7.1, y: 3.15, text: `폭발 ${explosionsDropped}번 버림`, align: 'left', size: 18, color: '#c8d0de' })
      const active: string[] = []
      if (clock - at.input < 0.3) active.push('ndrones', 'ndrones-nmgr', 'nmgr', 'nmgr-nsources', 'nsources')
      if (clock - at.dropped < 0.3) active.push('nmgr-ndrop')
      if (alertLost > 0) active.push('ndrop')
      return { world, active }
    },
  }
}
