import { requestFlash, startLoop, useStageKeys, type StageHandle, type StageProps } from '@koohoo/gallery-kit'
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react'
import { C, drawCode, drawDiagram, drawLog, drawWorld, panel, type CodeLine, type Rect } from './draw'
import { Replayer, valuesFor } from './runner'
import type { PatternSpecimen } from './types'

/* 시나리오 무대: 표본의 sim.ts 를 고정 시간 간격으로 돌려 미니 월드, 구조 그림, 사건 기록, 코드 줄을 그린다.
 * 자동 데모는 첫 시나리오를 반복하고, 사람이 입력(이벤트 버튼, 무대 포커스 때 키)하면 그 주기를 넘겨받는다.
 * 조절 값이나 효과 끄기를 바꾸면 처음부터 다시 돈다 (같은 입력을 나쁜 예로 다시 보여 주려는 것). */

const W = 1600
const H = 900
const WORLD: Rect = { x: 16, y: 16, w: 940, h: 560 }
const DIAGRAM: Rect = { x: 972, y: 16, w: 612, h: 560 }
const LOG: Rect = { x: 16, y: 592, w: 940, h: 292 }
const CODE: Rect = { x: 972, y: 592, w: 612, h: 292 }

/** `// [n]` (단계) 와 `// [!]` (나쁜 예의 문제 줄) 표시가 있는 줄 */
function markedLines(specimen: PatternSpecimen, mark: string, folder: (path: string) => boolean): CodeLine[] {
  const out: CodeLine[] = []
  for (const f of specimen.files) {
    if (!folder(f.path)) continue
    f.code.split(/\r?\n/).forEach((line, i) => {
      if (line.includes(`// [${mark}]`)) out.push({ file: f.name, no: i + 1, text: line.replace(/\s*\/\/ \[[^\]]+\].*$/, '').trim() })
    })
  }
  return out
}

export function ScenarioStage({ ref, specimen, values, step, off, playing, speed, auto, startTime, thumbnail, children }: StageProps<PatternSpecimen> & { ref?: Ref<StageHandle> }) {
  const m = specimen.meta
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const st = useRef({ rep: null as Replayer | null, time: 0, held: false, frames: 0, dirty: true, error: null as string | null })
  const [shownError, setShownError] = useState<string | null>(null)
  const fail = (e: unknown) => {
    const message = e instanceof Error ? (e.stack ?? e.message) : String(e)
    st.current.error = message
    setShownError(message)
  }
  const live = useRef({ step, playing, speed, off })
  live.current = { step, playing, speed, off }

  const labels = useMemo(() => Object.fromEntries(m.events.map(e => [e.id, e.label])), [m.events])
  /** 무대 키 안내 (meta.keys): '↑ 점프 · X 공격' */
  const keyHelp = useMemo(() => {
    const name = (code: string) => ({ ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space', Enter: 'Enter' })[code] ?? code.replace(/^Key|^Digit/, '')
    return Object.entries(m.keys ?? {}).map(([code, id]) => `${name(code)} ${labels[id] ?? id}`).join(' · ')
  }, [m.keys, labels])
  const code = useMemo(() => {
    const stepLines = new Map(m.steps.map(s => [s.n, markedLines(specimen, String(s.n), p => !p.includes('/Naive/'))]))
    return { stepLines, bugLines: markedLines(specimen, '!', p => p.includes('/Naive/')) }
  }, [specimen, m.steps])

  const fire = (id: string) => {
    const s = st.current
    if (!s.rep || !m.events.some(e => e.id === id)) return
    if (m.flashes && !requestFlash()) return
    try {
      s.rep.input(id)
    } catch (e) {
      fail(e)
    }
    s.dirty = true
  }

  useImperativeHandle(ref, () => ({
    fire,
    capture: () => new Promise(ok => (canvas.current ? canvas.current.toBlob(b => ok(b), 'image/png') : ok(null))),
    seek: time => {
      const s = st.current
      s.held = time !== null
      if (time !== null && s.rep) {
        s.time = time
        try {
          s.rep.advanceTo(time)
        } catch (e) {
          fail(e)
        }
      }
      s.dirty = true
    },
    status: () => ({ frames: st.current.frames, time: st.current.time, error: st.current.error }),
  }))

  // 표본, 조절 값, 효과 끄기, 자동 데모가 바뀌면 처음부터 다시 (링크의 t= 가 있으면 그 시간까지 돌린다)
  useEffect(() => {
    const s = st.current
    try {
      s.error = null
      setShownError(null)
      s.rep = new Replayer(specimen.createSim, valuesFor(m.params, values), off, auto ? (m.scenarios[0] ?? null) : null)
      s.time = startTime ?? 0
      s.rep.advanceTo(s.time)
    } catch (e) {
      fail(e)
    }
    s.dirty = true
  }, [specimen, m, values, off, auto, startTime])

  useEffect(() => {
    st.current.dirty = true
  }, [step])

  useStageKeys(root, {
    enabled: !thumbnail,
    onKey: e => {
      const name = m.keys?.[e.code]
      if (!name) return false
      fire(name)
      return true
    },
  })

  useEffect(
    () =>
      startLoop(dt => {
        const s = st.current
        const p = live.current
        if (!s.rep) return
        if (p.playing && !s.held && !s.error) {
          s.time += dt * p.speed
          try {
            s.rep.advanceTo(s.time)
          } catch (e) {
            fail(e)
          }
          s.dirty = true
        }
        const g = canvas.current?.getContext('2d')
        if (!s.dirty || !g) return
        s.dirty = false
        render(g, s.rep, p.step, p.off)
        s.frames++
      }),
    // render 가 쓰는 표본 자료(m, code, labels)는 표본이 바뀔 때만 바뀐다
    [specimen],
  )

  function render(g: CanvasRenderingContext2D, rep: Replayer, stepN: number, isOff: boolean) {
    g.fillStyle = C.bg
    g.fillRect(0, 0, W, H)
    let view
    try {
      view = rep.sim.view()
    } catch (e) {
      fail(e)
      return
    }
    const active = new Set(view.active)
    const focus = new Set((m.steps.find(s => s.n === stepN)?.target ?? '').split(',').map(x => x.trim()).filter(Boolean))
    panel(g, WORLD, isOff ? '미니 월드 · 나쁜 예' : '미니 월드', `${rep.time.toFixed(2)}s`)
    drawWorld(g, view.world, WORLD)
    const diagram = isOff ? (m.naiveDiagram ?? m.diagram) : m.diagram
    panel(g, DIAGRAM, isOff ? '구조 · 나쁜 예' : `구조 · ${m.pattern}`)
    drawDiagram(g, diagram, DIAGRAM, active, focus, isOff && !m.naiveDiagram)
    panel(g, LOG, '사건 기록', isOff ? '✖ = 버그' : undefined)
    drawLog(g, rep.log, LOG, name => labels[name] ?? name, rep.time)
    if (isOff) {
      panel(g, CODE, '문제 줄', 'Naive/')
      drawCode(g, code.bugLines, CODE, '나쁜 예의 문제 줄에 // [!] 표시가 없다.', C.bug)
    } else if (stepN > 0) {
      panel(g, CODE, `${stepN}단계 코드`, '// [n] 표시 줄')
      drawCode(g, code.stepLines.get(stepN) ?? [], CODE, '이 단계에 // [n] 표시 줄이 없다.', C.warn)
    } else {
      panel(g, CODE, '코드 줄')
      const keys = keyHelp ? ` 무대를 클릭하면 키보드로도 입력한다: ${keyHelp}.` : ''
      drawCode(g, [], CODE, `단계 보기(← →)를 누르면 그 단계에서 일하는 코드 줄이 여기에 나온다. 효과 끄기(J)는 나쁜 예의 문제 줄을 보여 준다.${keys}`, C.text)
    }
  }

  return (
    <div className="stage" ref={root} tabIndex={thumbnail ? -1 : 0} aria-label={`${m.title} 무대. 클릭하면 키보드로 조작할 수 있다`}>
      <canvas ref={canvas} className="stage-canvas" width={W} height={H} />
      {shownError && (
        <div className="stage-error" role="alert">
          <b>시뮬레이션 오류</b>
          <pre>{shownError}</pre>
        </div>
      )}
      {children}
    </div>
  )
}
