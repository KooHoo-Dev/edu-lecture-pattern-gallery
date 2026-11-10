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
  E: { name: '생성', desc: '무엇을, 몇 개, 어떤 설정으로 만들지 한 곳에서 정한다' },
  F: { name: '조립', desc: '원본을 고치지 않고 감싸고 묶어 기능을 더한다' },
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
  { id: 'strategy-turret-targeting', title: '전략 패턴: 포탑 조준 방식', group: 'A', order: 2, oneLiner: '포탑은 조준 방식 객체에게 대상을 묻고, 방식은 실행 중에 갈아 끼운다' },
  { id: 'prototype-drone-clone', title: '프로토타입 패턴: 견본 드론 복제', group: 'E', order: 1, oneLiner: '견본을 복제하되 참조 필드는 새로 만들어 복제본끼리 섞이지 않게 한다' },
  { id: 'singleton-scene-managers', title: '싱글턴 패턴: 씬을 넘는 매니저', group: 'E', order: 2, oneLiner: '씬을 넘는 매니저와 씬과 함께 사라질 매니저를 나누고 둘 다 하나만 둔다' },
  { id: 'decorator-stat-buffs', title: '데코레이터 패턴: 버프 겹치기와 풀기', group: 'F', order: 1, oneLiner: '버프를 감싸는 층으로 겹치고, 층을 빼면 원래 값으로 돌아온다' },
  { id: 'state-drone-ai', title: '상태 패턴: 잔해 드론 AI', group: 'A', order: 3, oneLiner: '적 AI 의 순찰·추격·공격·파괴를 상태 객체로 나누고, 들어갈 때 바꾼 것을 나올 때 되돌린다' },
  { id: 'object-pool-projectiles', title: '오브젝트 풀: 포탑 탄 재사용', group: 'D', order: 1, oneLiner: '탄을 만들고 지우는 대신 빌려 쓰고 돌려주되, 빌릴 때 상태를 새로 맞춘다' },
  { id: 'factory-drone-spawner', title: '팩토리 메서드: 드론 스포너', group: 'E', order: 3, oneLiner: '무엇을 만들지는 스포너 자식이, 만드는 절차는 부모가 한 곳에서 정한다' },
  { id: 'facade-hit-resolution', title: '퍼사드 패턴: 명중 처리 창구', group: 'F', order: 2, oneLiner: '명중 처리 다섯 단계를 창구 하나가 맡고, 공격하는 곳은 창구만 부른다' },
  { id: 'composite-drone-squads', title: '컴포지트 패턴: 드론 편대 명령', group: 'F', order: 3, oneLiner: '드론 하나와 편대를 같은 인터페이스로 다뤄, 편대 안 편대까지 명령 한 번이 끝까지 닿는다' },
  { id: 'abstract-factory-zone-themes', title: '추상 팩토리: 구역 테마 세트', group: 'E', order: 4, oneLiner: '구역마다 드론·투사체·바닥을 한 공장이 세트로 만들어, 다른 구역 것이 섞이지 않는다' },
  { id: 'event-queue-sound', title: '이벤트 큐: 효과음 요청 모으기', group: 'B', order: 2, oneLiner: '효과음을 바로 틀지 않고 큐에 모아, 같은 프레임의 같은 소리는 합치고 빈 채널이 나면 차례로 튼다' },
  { id: 'adapter-sensor-units', title: '어댑터 패턴: 센서 장비 단위 맞추기', group: 'F', order: 4, oneLiner: '장비마다 다른 API 와 단위를 어댑터 한 곳에서 우리 모양으로 바꿔, 화면과 경보는 한 모양만 안다' },
  { id: 'hierarchical-state-enemy', title: '상태 패턴: 계층 상태 기계', group: 'A', order: 4, oneLiner: '여러 상태에 공통인 규칙(EMP, 경계등)을 부모 상태 한 곳에 두고, 자식 상태는 자기 일만 한다' },
  { id: 'update-method-drone-list', title: '업데이트 메서드: 드론 목록 한 프레임', group: 'A', order: 5, oneLiner: '매니저가 드론 목록을 돌며 하나씩 업데이트하되, 도는 중에 생기고 사라지는 드론은 루프 밖에서 정리한다' },
  { id: 'service-locator-audio', title: '서비스 로케이터: 소리 서비스와 널 객체', group: 'B', order: 3, oneLiner: '게임 코드는 소리 서비스를 찾아 쓰기만 하고, 서비스가 없으면 아무것도 하지 않는 널 객체가 대신한다' },
  { id: 'flyweight-drone-types', title: '플라이웨이트: 드론 종류 데이터 공유', group: 'D', order: 2, oneLiner: '종류마다 같은 값은 한 객체를 모든 드론이 함께 쓰고, 드론마다 다른 값은 드론이 든다' },
  { id: 'dirty-flag-loadout', title: '더티 플래그: 장비 무게 다시 계산', group: 'D', order: 3, oneLiner: '비싼 합계는 바뀌었을 때만 다시 계산하고, 값을 바꾸는 모든 길이 다시 계산 표시를 켜게 한 곳에 모은다' },
  { id: 'game-loop-fixed-step', title: '게임 루프: 고정 시간 간격', group: 'A', order: 6, oneLiner: '화면 프레임이 몇이든 게임 규칙은 같은 시간 간격으로 돌려, 30fps 와 144fps 에서 점프 높이가 같게 한다' },
  { id: 'chain-input-handlers', title: '책임 연쇄: 클릭 처리 사슬', group: 'B', order: 4, oneLiner: '클릭을 처리자 사슬에 앞에서부터 넘기고, 처리한 처리자가 소비하면 뒤로 넘기지 않는다' },
  { id: 'memento-checkpoint', title: '메멘토: 체크포인트 저장과 되살리기', group: 'C', order: 2, oneLiner: '저장할 때 상태를 값으로 떠서 메멘토에 담고, 되살릴 때 그 값으로 덮는다' },
  { id: 'spatial-grid-detection', title: '공간 분할: 격자로 근처 적 찾기', group: 'D', order: 4, oneLiner: '땅을 칸으로 나눠 드론을 칸에 등록하고, 근처 칸만 보아 탐지 범위 안의 적을 찾는다' },
]
