import { collectFiles, collectMetas, collectShots, sortSpecimens, type PlannedSpecimen } from '@koohoo/gallery-kit'
import type { PatternMeta, PatternSpecimen, SimFactory } from './stage/types'

/* 표본 자동 등록: src/specimens/<id>/meta.ts 와 sim.ts 를 만들면 갤러리에 나타난다.
 * Unity 코드는 unity/<id>/ 에서, 촬영은 src/shots/<id>/ 에서 모은다. glob 의 첫 '/*\/' 가 표본 자리다 (격리 빌드). */
const metas = import.meta.glob<{ meta: PatternMeta }>('./specimens/*/meta.ts', { eager: true })
const sims = import.meta.glob<{ createSim: SimFactory }>('./specimens/*/sim.ts', { eager: true })
const sources = import.meta.glob<string>('../unity/*/**/*.cs', { query: '?raw', import: 'default', eager: true })
const shots = import.meta.glob<string>('./shots/*/*.webp', { import: 'default', eager: true })

/* 그룹은 docs/selection.md 와 같다 */
export const GROUPS: Record<string, { name: string; desc: string }> = {
  A: { name: '행동', desc: '캐릭터와 물체가 상황에 따라 다르게 움직이게 한다' },
  B: { name: '연결', desc: '서로 모르는 객체끼리 소식을 주고받게 한다' },
  C: { name: '데이터', desc: '행동과 상태를 값으로 다뤄 저장하고 되돌린다' },
  D: { name: '최적화', desc: '많이 만들고 지우는 것을 싸게 한다' },
}

/** 파일 순서: Core, Unity, Naive */
const order = (rel: string) => (rel.startsWith('Core/') ? 0 : rel.startsWith('Unity/') ? 1 : 2)

export const SPECIMENS: PatternSpecimen[] = sortSpecimens(
  collectMetas(metas, './specimens/').map(meta => {
    const sim = sims[`./specimens/${meta.id}/sim.ts`]
    if (!sim?.createSim) throw new Error(`${meta.id}: sim.ts 가 createSim 을 내보내지 않는다`)
    return {
      meta,
      createSim: sim.createSim,
      files: collectFiles(sources, '../unity/', meta.id, 'Assets/Patterns/', order),
      shots: collectShots(shots, './shots/', meta.id),
    }
  }),
  Object.keys(GROUPS),
)

/* 아직 구현되지 않은 표본. 구현되면 자동으로 목록에서 빠진다. 목록은 docs/selection.md */
export const PLANNED: PlannedSpecimen[] = [
  { id: 'state-player-actions', title: '상태 패턴: 플레이어 행동', group: 'A', order: 1, oneLiner: 'bool 덩어리 대신 상태 객체가 입력을 처리한다' },
  { id: 'observer-health-events', title: '관찰자 패턴: 체력 알림', group: 'B', order: 1, oneLiner: '체력이 바뀌면 구독한 화면들이 각자 반응한다' },
  { id: 'command-undo-replay', title: '명령 패턴: 되돌리기와 리플레이', group: 'C', order: 1, oneLiner: '입력을 객체로 만들어 기록하고 되돌리고 다시 재생한다' },
]
