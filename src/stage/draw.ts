import type { LogEntry } from './runner'
import type { Diagram, WorldItem } from './types'

/* 시나리오 무대 그리기. 캔버스 하나(1600 × 900)에 네 칸을 그린다:
 *   미니 월드 | 구조 그림
 *   사건 기록 | 코드 줄
 * 색은 무대 안에서만 쓰는 고정 색이다 (밝은 테마에서도 무대는 어둡다). */

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const C = {
  bg: '#0b111c',
  panel: '#111a29',
  line: '#26344c',
  text: '#e6edf7',
  dim: '#8796ae',
  faint: '#4a5872',
  accent: '#7ee081',
  ally: '#5cc8ff',
  enemy: '#ff6b6b',
  neutral: '#c8d0de',
  warn: '#ffb547',
  bug: '#ff5d6c',
  ground: '#22314a',
}

const FONT = "'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
const MONO = "'JetBrains Mono', Consolas, 'D2Coding', monospace"
export const font = (size: number, weight = 500, mono = false) => `${weight} ${size}px ${mono ? MONO : FONT}`

export function panel(g: CanvasRenderingContext2D, r: Rect, title: string, note?: string) {
  g.fillStyle = C.panel
  roundRect(g, r.x, r.y, r.w, r.h, 14)
  g.fill()
  g.strokeStyle = C.line
  g.lineWidth = 2
  g.stroke()
  g.fillStyle = C.dim
  g.font = font(20, 700)
  g.textAlign = 'left'
  g.textBaseline = 'alphabetic'
  g.fillText(title, r.x + 18, r.y + 32)
  if (note) {
    g.fillStyle = C.faint
    g.font = font(18)
    g.textAlign = 'right'
    g.fillText(note, r.x + r.w - 18, r.y + 32)
  }
}

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

function arrowHead(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, size: number, hollow = false) {
  const a = Math.atan2(y2 - y1, x2 - x1)
  g.beginPath()
  g.moveTo(x2, y2)
  g.lineTo(x2 - size * Math.cos(a - 0.45), y2 - size * Math.sin(a - 0.45))
  g.lineTo(x2 - size * Math.cos(a + 0.45), y2 - size * Math.sin(a + 0.45))
  g.closePath()
  if (hollow) {
    g.fillStyle = C.panel
    g.fill()
    g.stroke()
  } else g.fill()
}

/* ───────── 미니 월드 (가로 16, 세로 9 단위, 왼쪽 아래가 0, 0) ───────── */

export function drawWorld(g: CanvasRenderingContext2D, items: WorldItem[], r: Rect) {
  const inner = { x: r.x + 12, y: r.y + 46, w: r.w - 24, h: r.h - 58 }
  const u = Math.min(inner.w / 16, inner.h / 9)
  const ox = inner.x + (inner.w - u * 16) / 2
  const oy = inner.y + (inner.h + u * 9) / 2
  const X = (x: number) => ox + x * u
  const Y = (y: number) => oy - y * u
  g.save()
  g.beginPath()
  g.rect(inner.x, inner.y, inner.w, inner.h)
  g.clip()
  for (const it of items) {
    g.globalAlpha = it.kind === 'actor' ? (it.alpha ?? 1) : 1
    g.setLineDash([])
    if (it.kind === 'box') {
      if (it.dashed) g.setLineDash([8, 6])
      roundRect(g, X(it.x), Y(it.y + it.h), it.w * u, it.h * u, 6)
      if (it.fill) {
        g.fillStyle = it.fill
        g.fill()
      }
      if (it.stroke) {
        g.strokeStyle = it.stroke
        g.lineWidth = 2
        g.stroke()
      }
      if (it.label) text(g, it.label, X(it.x + it.w / 2), Y(it.y + it.h / 2) + 8, C.text, 22, 'center')
    } else if (it.kind === 'bar') {
      const h = 0.32 * u
      roundRect(g, X(it.x), Y(it.y) - h, it.w * u, h, h / 2)
      g.fillStyle = '#1b2638'
      g.fill()
      const v = Math.max(0, Math.min(1, it.value))
      if (v > 0) {
        roundRect(g, X(it.x), Y(it.y) - h, Math.max(h, it.w * u * v), h, h / 2)
        g.fillStyle = it.fill ?? C.accent
        g.fill()
      }
      if (it.label) text(g, it.label, X(it.x), Y(it.y) - h - 8, C.dim, 20, 'left')
    } else if (it.kind === 'text') {
      text(g, it.text, X(it.x), Y(it.y), it.color ?? C.text, it.size ?? 24, it.align ?? 'center')
    } else if (it.kind === 'ring') {
      g.beginPath()
      g.arc(X(it.x), Y(it.y), it.r * u, 0, Math.PI * 2)
      g.strokeStyle = it.color ?? C.warn
      g.lineWidth = 4
      g.stroke()
    } else if (it.kind === 'arrow') {
      if (it.dashed) g.setLineDash([8, 6])
      g.strokeStyle = it.color ?? C.dim
      g.fillStyle = it.color ?? C.dim
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(X(it.x1), Y(it.y1))
      g.lineTo(X(it.x2), Y(it.y2))
      g.stroke()
      g.setLineDash([])
      arrowHead(g, X(it.x1), Y(it.y1), X(it.x2), Y(it.y2), 14)
    } else if (it.kind === 'actor') {
      drawActor(g, it, X, Y, u)
    }
  }
  g.restore()
  g.globalAlpha = 1
}

function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, size: number, align: CanvasTextAlign) {
  g.fillStyle = color
  g.font = font(size, 600)
  g.textAlign = align
  g.textBaseline = 'alphabetic'
  g.fillText(s, x, y)
}

/** 인물: 아군은 캡슐, 적은 삼각, 중립은 마름모 (UI 갤러리의 실루엣 키트와 같은 약속) */
function drawActor(g: CanvasRenderingContext2D, a: Extract<WorldItem, { kind: 'actor' }>, X: (x: number) => number, Y: (y: number) => number, u: number) {
  const color = a.role === 'ally' ? C.ally : a.role === 'enemy' ? C.enemy : C.neutral
  const face = a.facing ?? 1
  const cx = X(a.x)
  const base = Y(a.y)
  g.save()
  g.translate(cx, base)
  if (a.pose === 'down') g.rotate((Math.PI / 2) * -face)
  if (a.pose === 'run') g.rotate(0.12 * face)
  const s = a.scale ?? 1
  const w = 0.7 * u * s
  const h = 1.4 * u * s
  g.fillStyle = a.pose === 'hurt' ? '#ffffff' : color
  if (a.role === 'ally') {
    roundRect(g, -w / 2, -h, w, h, w / 2)
    g.fill()
    // 눈: 바라보는 쪽
    g.fillStyle = C.bg
    g.beginPath()
    g.arc(face * w * 0.18, -h * 0.72, w * 0.09, 0, Math.PI * 2)
    g.fill()
  } else if (a.role === 'enemy') {
    g.beginPath()
    g.moveTo(-w * 0.6, 0)
    g.lineTo(w * 0.6, 0)
    g.lineTo(0, -h * 0.9)
    g.closePath()
    g.fill()
  } else {
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(w * 0.55, -h / 2)
    g.lineTo(0, -h)
    g.lineTo(-w * 0.55, -h / 2)
    g.closePath()
    g.fill()
  }
  if (a.pose === 'attack') {
    // 휘두르기: 바라보는 쪽의 호
    g.strokeStyle = C.warn
    g.lineWidth = 6
    g.beginPath()
    g.arc(face * w * 0.3, -h * 0.55, h * 0.55, face > 0 ? -1.2 : Math.PI - 0.5, face > 0 ? 0.5 : Math.PI + 1.2)
    g.stroke()
  }
  g.restore()
  if (a.label) text(g, a.label, cx, base - h - 12 - (a.pose === 'down' ? -h * 0.6 : 0), C.text, 20, 'center')
}

/* ───────── 구조 그림 (0~100 상자) ───────── */

export function drawDiagram(g: CanvasRenderingContext2D, d: Diagram, r: Rect, active: Set<string>, focus: Set<string>, dim: boolean) {
  const inner = { x: r.x + 16, y: r.y + 50, w: r.w - 32, h: r.h - 66 }
  const P = (x: number, y: number) => ({ x: inner.x + (x / 100) * inner.w, y: inner.y + (y / 100) * inner.h })
  const NW = 0.31 * inner.w
  const NH = 64
  const box = new Map(d.nodes.map(n => [n.id, { ...P(n.x, n.y), n }]))
  g.save()
  if (dim) g.globalAlpha = 0.35
  // 화살표 먼저
  for (const e of d.edges) {
    const a = box.get(e.from)
    const b = box.get(e.to)
    if (!a || !b) continue
    const on = active.has(e.id) || focus.has(e.id)
    // 단계 강조(주황)가 지금 일하는 표시(초록)에 묻히지 않게 단계를 앞세운다
    const color = focus.has(e.id) ? C.warn : active.has(e.id) ? C.accent : C.faint
    const [x1, y1] = edgePoint(a, b, NW, NH)
    const [x2, y2] = edgePoint(b, a, NW, NH)
    g.strokeStyle = color
    g.fillStyle = color
    g.lineWidth = on ? 4 : 2
    g.setLineDash(e.kind === 'subscribe' ? [10, 7] : e.kind === 'implements' ? [4, 5] : [])
    g.beginPath()
    g.moveTo(x1, y1)
    g.lineTo(x2, y2)
    g.stroke()
    g.setLineDash([])
    arrowHead(g, x1, y1, x2, y2, 14, e.kind === 'implements')
    if (e.label) {
      g.font = font(17, 600)
      g.textAlign = 'center'
      const mx = (x1 + x2) / 2
      const my = (y1 + y2) / 2
      const w = g.measureText(e.label).width + 12
      g.fillStyle = C.panel
      g.fillRect(mx - w / 2, my - 15, w, 22)
      g.fillStyle = on ? color : C.dim
      g.fillText(e.label, mx, my + 2)
    }
  }
  for (const { x, y, n } of box.values()) {
    const on = active.has(n.id)
    const focused = focus.has(n.id)
    roundRect(g, x - NW / 2, y - NH / 2, NW, NH, n.kind === 'object' ? 26 : 10)
    g.fillStyle = on ? 'rgba(126, 224, 129, 0.18)' : focused ? 'rgba(255, 181, 71, 0.16)' : '#162135'
    g.fill()
    g.strokeStyle = on ? C.accent : focused ? C.warn : C.line
    g.lineWidth = on || focused ? 4 : 2
    g.setLineDash(n.kind === 'interface' ? [8, 6] : [])
    g.stroke()
    g.setLineDash([])
    if (focused && on) {
      // 지금 일하면서 단계 대상이기도 하면 바깥에 주황 테두리를 하나 더 두른다
      roundRect(g, x - NW / 2 - 6, y - NH / 2 - 6, NW + 12, NH + 12, n.kind === 'object' ? 30 : 14)
      g.strokeStyle = C.warn
      g.lineWidth = 3
      g.stroke()
    }
    g.textAlign = 'center'
    g.fillStyle = on ? C.accent : C.text
    g.font = font(21, 700, true)
    g.fillText(n.label, x, y + (n.sub ? -2 : 7), NW - 12)
    if (n.sub) {
      g.fillStyle = C.dim
      g.font = font(16, 500)
      g.fillText(n.sub, x, y + 20, NW - 12)
    }
  }
  g.restore()
}

/** 사각형 a 의 가장자리에서 b 쪽으로 나가는 점 */
function edgePoint(a: { x: number; y: number }, b: { x: number; y: number }, w: number, h: number): [number, number] {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const sx = dx === 0 ? Infinity : w / 2 / Math.abs(dx)
  const sy = dy === 0 ? Infinity : h / 2 / Math.abs(dy)
  const s = Math.min(sx, sy)
  return [a.x + dx * s, a.y + dy * s]
}

/* ───────── 사건 기록 ───────── */

export function drawLog(g: CanvasRenderingContext2D, entries: LogEntry[], r: Rect, labelOf: (name: string) => string, now: number) {
  const lineH = 30
  const max = Math.floor((r.h - 56) / lineH)
  const shown = entries.slice(-max)
  g.save()
  g.beginPath()
  g.rect(r.x, r.y + 40, r.w, r.h - 44)
  g.clip()
  shown.forEach((e, i) => {
    const y = r.y + 72 + i * lineH
    const fresh = now - e.t < 0.6
    g.textAlign = 'left'
    g.font = font(18, 500, true)
    g.fillStyle = C.faint
    g.fillText(`${e.t.toFixed(2)}s`, r.x + 18, y)
    if (e.kind === 'in') {
      g.fillStyle = C.warn
      g.font = font(20, 700)
      g.fillText(`▶ ${labelOf(e.text)}`, r.x + 104, y)
    } else {
      g.fillStyle = e.bug ? C.bug : fresh ? C.accent : C.text
      g.font = font(20, e.bug ? 700 : 500, !e.bug)
      g.fillText(`${e.bug ? '✖ ' : ''}${e.text}`, r.x + 104, y, r.w - 120)
    }
  })
  g.restore()
}

/* ───────── 코드 줄 ───────── */

export interface CodeLine {
  file: string
  no: number
  text: string
}

export function drawCode(g: CanvasRenderingContext2D, lines: CodeLine[], r: Rect, empty: string, tone: string) {
  if (!lines.length) {
    g.fillStyle = C.faint
    g.font = font(20, 500)
    g.textAlign = 'left'
    wrap(g, empty, r.x + 18, r.y + 74, r.w - 36, 28)
    return
  }
  let y = r.y + 72
  let last = ''
  for (const l of lines) {
    if (y > r.y + r.h - 14) break
    if (l.file !== last) {
      g.fillStyle = C.dim
      g.font = font(16, 600)
      g.textAlign = 'left'
      g.fillText(l.file, r.x + 18, y)
      y += 26
      last = l.file
    }
    g.fillStyle = C.faint
    g.font = font(17, 500, true)
    g.textAlign = 'right'
    g.fillText(String(l.no), r.x + 62, y)
    g.fillStyle = tone
    g.textAlign = 'left'
    // 코드 글꼴의 합자(!= → ≠, => → ⇒)를 막는다. 캔버스에는 합자 끄기가 없고, 글자 간격이 0 이 아니면 브라우저가 합자를 쓰지 않는다
    g.letterSpacing = '0.01px'
    g.fillText(l.text, r.x + 74, y, r.w - 90)
    g.letterSpacing = '0px'
    y += 28
  }
}

function wrap(g: CanvasRenderingContext2D, s: string, x: number, y: number, w: number, lh: number) {
  let line = ''
  for (const word of s.split(' ')) {
    const test = line ? `${line} ${word}` : word
    if (g.measureText(test).width > w && line) {
      g.fillText(line, x, y)
      y += lh
      line = word
    } else line = test
  }
  if (line) g.fillText(line, x, y)
}
