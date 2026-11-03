import type { ParamDef, ParamValues } from '@koohoo/gallery-kit'
import type { PatternMeta, PatternSim, Scenario, SimFactory } from './types.ts'

/* 시나리오 재생기. 브라우저 무대와 Node 대조 검사(tools/check-domain.mjs)가 같이 쓴다.
 * C# 하네스(truth/Runner/Program.cs)가 같은 순서로 같은 기록을 만든다. 순서를 바꾸면 양쪽을 함께 고친다:
 *   프레임마다 (1) 이번 프레임 시각까지의 입력을 넣고 사건을 꺼낸다 (2) tick(1/60) (3) 사건을 꺼낸다 (4) 30 프레임마다 상태 줄 */

export const FPS = 60
/** C# 하네스가 넘기는 1f / 60 과 같은 float 값 */
export const DT = Math.fround(1 / FPS)
export const SNAPSHOT_EVERY = 30

export function valuesFor(defs: ParamDef[], extra?: ParamValues): ParamValues {
  return { ...Object.fromEntries(defs.map(d => [d.key, d.default])), ...extra }
}

export const fmt = (t: number) => t.toFixed(2)

/** 시나리오 하나를 돌려 사건 기록 줄을 만든다 */
export function runScenario(create: SimFactory, meta: PatternMeta, scenario: Scenario, naive: boolean): string[] {
  const sim = create(valuesFor(meta.params, scenario.values), naive)
  const lines = [`# ${meta.id} ${scenario.id} naive=${naive ? 1 : 0}`]
  const drain = (t: number) => {
    for (const e of sim.drain()) lines.push(`${fmt(t)} ev ${e}`)
  }
  const inputs = [...scenario.inputs].sort((a, b) => a[0] - b[0])
  let next = 0
  drain(0)
  const frames = Math.round(scenario.duration * FPS)
  for (let f = 0; f < frames; f++) {
    const t = f / FPS
    while (next < inputs.length && inputs[next][0] <= t + 1e-9) {
      lines.push(`${fmt(t)} in ${inputs[next][1]}`)
      sim.input(inputs[next][1])
      drain(t)
      next++
    }
    sim.tick(DT)
    drain(t)
    if ((f + 1) % SNAPSHOT_EVERY === 0) lines.push(`${fmt((f + 1) / FPS)} st ${sim.snapshot()}`)
  }
  lines.push(`end st ${sim.snapshot()}`)
  return lines
}

const NUM = /^-?\d+(\.\d+)?$/

/**
 * 두 기록을 비교한다. 줄 머리(시각과 종류)는 정확히 같아야 한다 (한 프레임 어긋난 전이도 잡는다).
 * 그 뒤의 숫자 낱말은 0.02 까지 같은 것으로 본다 (C# float 와 JS double 의 표기 차이). 다르면 첫 번째로 다른 줄 번호와 두 줄을 돌려준다
 */
export function compareLogs(expected: string[], actual: string[]): { line: number; expected: string; actual: string } | null {
  const n = Math.max(expected.length, actual.length)
  for (let i = 0; i < n; i++) {
    const a = expected[i] ?? '(없음)'
    const b = actual[i] ?? '(없음)'
    if (a === b) continue
    const ta = a.split(/\s+/)
    const tb = b.split(/\s+/)
    const same =
      ta.length === tb.length &&
      ta.every((x, k) => {
        const y = tb[k]
        if (x === y) return true
        if (k < 2) return false
        const nx = x.replace(/^[^-\d]*=/, '')
        const ny = y.replace(/^[^-\d]*=/, '')
        return x.slice(0, x.length - nx.length) === y.slice(0, y.length - ny.length) && NUM.test(nx) && NUM.test(ny) && Math.abs(Number(nx) - Number(ny)) <= 0.02 + 1e-9
      })
    if (!same) return { line: i + 1, expected: a, actual: b }
  }
  return null
}

export interface LogEntry {
  t: number
  kind: 'in' | 'ev'
  text: string
  bug: boolean
}

/**
 * 무대용 재생기. 무대 시간은 언제나 프레임 경계(frame / 60)이고, 같은 설정·같은 입력이면 같은 화면이 나온다.
 * 자동 데모는 script 를 (길이 + 쉼) 주기로 반복하고 주기마다 sim 을 새로 만든다.
 * 사람이 입력하면 그 주기의 나머지 script 를 멈춘다 (사람이 넘겨받는다). 뒤로 가면 처음부터 다시 돈다
 */
export class Replayer {
  sim: PatternSim
  frame = 0
  log: LogEntry[] = []
  /** 사람 입력. done 은 이번 실행에서 이미 넣었는지 */
  private manual: { at: number; name: string; done: boolean }[] = []

  private create: SimFactory
  private values: ParamValues
  private naive: boolean
  private script: Scenario | null
  private gap: number

  /** script 는 자동 데모로 반복할 시나리오 (없으면 사람 입력만), gap 은 반복 사이 쉼 (초) */
  constructor(create: SimFactory, values: ParamValues, naive: boolean, script: Scenario | null, gap = 1.5) {
    this.create = create
    this.values = values
    this.naive = naive
    this.script = script
    this.gap = gap
    this.sim = this.fresh()
  }

  get time() {
    return this.frame / FPS
  }

  private get cycle() {
    return this.script ? this.script.duration + this.gap : Infinity
  }

  private fresh(): PatternSim {
    const sim = this.create(this.values, this.naive)
    this.collect(sim, 0)
    return sim
  }

  private collect(sim: PatternSim, t: number) {
    for (const text of sim.drain()) this.push({ t, kind: 'ev', text: text.replace(/^!/, ''), bug: text.startsWith('!') })
  }

  private push(e: LogEntry) {
    this.log.push(e)
    if (this.log.length > 60) this.log.splice(0, this.log.length - 60)
  }

  private apply(name: string, t: number) {
    this.push({ t, kind: 'in', text: name, bug: false })
    this.sim.input(name)
    this.collect(this.sim, t)
  }

  private cycleOf(t: number) {
    return Math.floor(t / this.cycle + 1e-9)
  }

  /** 한 프레임 진행 */
  private step() {
    const t = this.time
    const k = this.cycleOf(t)
    const local = t - k * this.cycle
    if (this.script && this.frame > 0 && Math.abs(local) < 1e-9) {
      this.sim = this.fresh()
      this.push({ t, kind: 'ev', text: '— 처음부터 다시 —', bug: false })
    }
    // 이 주기에 사람이 이미 입력했으면 남은 자동 데모 입력은 넣지 않는다
    const humanHere = this.manual.some(m => m.at <= t + 1e-9 && this.cycleOf(m.at) === k)
    if (this.script && !humanHere) {
      for (const [at, name] of this.script.inputs) if (at >= local - 1e-9 && at < local + DT - 1e-9) this.apply(name, t)
    }
    for (const m of this.manual) {
      if (m.done || m.at < t - 1e-9 || m.at >= t + DT - 1e-9) continue
      m.done = true
      this.apply(m.name, t)
    }
    this.sim.tick(DT)
    this.collect(this.sim, t)
    this.frame++
  }

  /** 무대 시간을 time 까지 옮긴다 (프레임 경계로 내림). 뒤로 가면 처음부터 다시 돈다 */
  advanceTo(time: number) {
    const target = Math.max(0, Math.floor(time * FPS + 1e-6))
    if (target < this.frame) {
      this.frame = 0
      this.log = []
      for (const m of this.manual) m.done = false
      this.sim = this.fresh()
    }
    while (this.frame < target) this.step()
  }

  /** 사람의 입력. 지금 시각에 바로 넣고 기억해 둔다 (다시 돌 때 같은 자리에 들어간다) */
  input(name: string) {
    this.manual.push({ at: this.time, name, done: true })
    this.apply(name, this.time)
  }
}
