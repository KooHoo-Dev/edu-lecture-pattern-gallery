import type { BaseMeta, BaseSpecimen, ParamValues } from '@koohoo/gallery-kit'

/* ──────────────────────────────────────────────────────────────
 * 패턴 표본 규격 (자세한 규칙은 docs/specimen-guide.md)
 * 표본 1개 = 다음 폴더들.
 *   unity/<id>/Core/      순수 C# 코어. UnityEngine 을 참조하지 않는다. 원본
 *   unity/<id>/Unity/     MonoBehaviour 어댑터 (입력, 화면)
 *   unity/<id>/Naive/     패턴 없이 짠 나쁜 예 (효과 끄기)
 *   truth/<id>/Target.cs  dotnet 하네스가 코어와 나쁜 예를 시나리오로 돌리는 어댑터
 *   truth/<id>/*.log      dotnet 이 남긴 사건 기록 (생성물, 커밋)
 *   src/specimens/<id>/meta.ts  글, 값, 시나리오, 구조 그림
 *   src/specimens/<id>/sim.ts   코어와 나쁜 예를 같은 이름, 같은 순서로 옮긴 TS. 무대가 실행한다
 * 이 파일과 runner.ts 는 Node 도 직접 읽는다 (대조 검사). 타입만 import 하고 런타임 import 는 상대 경로 .ts 만 쓴다.
 * ────────────────────────────────────────────────────────────── */

/** 입력 순서. [초, 입력 이름]. 입력 이름은 meta.events 의 id */
export interface Scenario {
  id: string
  label: string
  /** 기록할 길이 (초) */
  duration: number
  inputs: [number, string][]
  /** 기본값과 다른 조절 값 */
  values?: ParamValues
  /** 무엇을 보여 주는 시나리오인지 (리뷰와 문서용) */
  note?: string
}

export type NodeKind = 'class' | 'interface' | 'object'
export type EdgeKind = 'ref' | 'call' | 'subscribe' | 'implements'

/** 구조 그림. 좌표는 0~100 상자 안 (가로 100, 세로 100) */
export interface Diagram {
  nodes: { id: string; label: string; x: number; y: number; kind?: NodeKind; sub?: string }[]
  edges: { id: string; from: string; to: string; label?: string; kind?: EdgeKind }[]
}

export interface PatternMeta extends BaseMeta {
  /** 패턴 이름 (예: 상태 패턴). 카드와 머리에 칩으로 보인다 */
  pattern: string
  /** 자동 데모·검사·대조가 함께 쓰는 입력 순서. 첫 번째가 자동 데모 */
  scenarios: Scenario[]
  diagram: Diagram
  /** 효과 끄기(나쁜 예) 구조 그림. 없으면 diagram 을 흐리게 쓴다 */
  naiveDiagram?: Diagram
  /** 무대에 포커스가 있을 때 키 -> 입력 (KeyboardEvent.code, 예 ArrowUp: 'up') */
  keys?: Record<string, string>
}

export interface PatternSpecimen extends BaseSpecimen<PatternMeta> {
  createSim: SimFactory
}

/* ───────── 시뮬레이션 (sim.ts) ───────── */

/** 미니 월드의 그림 하나. 좌표는 가로 16, 세로 9 단위 (왼쪽 아래가 0, 0) */
export type WorldItem =
  | { kind: 'actor'; x: number; y: number; role: 'ally' | 'enemy' | 'neutral'; label?: string; pose?: 'idle' | 'run' | 'jump' | 'attack' | 'hurt' | 'down'; facing?: 1 | -1; alpha?: number }
  | { kind: 'box'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; label?: string; dashed?: boolean }
  | { kind: 'bar'; x: number; y: number; w: number; value: number; fill?: string; label?: string }
  | { kind: 'text'; x: number; y: number; text: string; color?: string; size?: number; align?: 'left' | 'center' | 'right' }
  | { kind: 'ring'; x: number; y: number; r: number; color?: string }
  | { kind: 'arrow'; x1: number; y1: number; x2: number; y2: number; color?: string; dashed?: boolean }

export interface SimView {
  world: WorldItem[]
  /** 지금 빛나는 구조 그림 노드·화살표 id */
  active: string[]
}

export interface PatternSim {
  /** 입력 하나 (meta.events 의 id) */
  input(name: string): void
  /** dt 초 진행 (고정 1/60) */
  tick(dt: number): void
  /** 마지막으로 꺼낸 뒤 일어난 사건. 버그는 '!' 로 시작한다 (기록에서 빨갛게) */
  drain(): string[]
  /** 0.5초마다 기록에 남기는 상태 한 줄 */
  snapshot(): string
  view(): SimView
}

/** values 는 기본값이 채워진 조절 값, naive 면 나쁜 예 */
export type SimFactory = (values: ParamValues, naive: boolean) => PatternSim
