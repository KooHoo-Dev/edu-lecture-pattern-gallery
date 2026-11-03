import { defineGallery } from '@koohoo/gallery-kit'
import { ai, relPath } from './ai'
import { GROUPS, PLANNED, SPECIMENS } from './registry'
import { ScenarioStage } from './stage/ScenarioStage'
import type { PatternSpecimen } from './stage/types'

const SERIALIZE = /\[SerializeField\][^;\n]*?\b(\w+)\s*(=|;)/g
const STEP = /\/\/ \[(\d+)\]/g
/** 갤러리 단축키 (kit 의 SpecimenPage, App). 무대 키로 쓰면 포커스에 따라 같은 키가 다르게 동작한다 */
const RESERVED = /^(Space|Digit[1-9]|Numpad[1-9]|KeyJ|KeyS|KeyA|KeyP|ArrowLeft|ArrowRight|Escape)$/

/** 도메인 검사 (브라우저에서 돈다): 조절 값과 Inspector 필드, 단계 표시, 시나리오 */
function lint(s: PatternSpecimen): string[] {
  const out: string[] = []
  const m = s.meta
  const unity = s.files.filter(f => relPath(s, f).startsWith('Unity/'))
  const fields = new Set(unity.flatMap(f => [...f.code.matchAll(SERIALIZE)].map(x => x[1])))
  for (const p of m.params) if (!fields.has(p.key)) out.push(`조절 값 ${p.key} 와 같은 이름의 [SerializeField] 필드가 Unity/ 에 없다`)
  const marks = new Set(s.files.filter(f => !relPath(s, f).startsWith('Naive/')).flatMap(f => [...f.code.matchAll(STEP)].map(x => Number(x[1]))))
  for (const st of m.steps) if (!marks.has(st.n)) out.push(`${st.n}단계를 가리키는 // [${st.n}] 표시가 Core/ 나 Unity/ 에 없다`)
  if (!s.files.some(f => relPath(s, f).startsWith('Naive/') && f.code.includes('// [!]'))) out.push('나쁜 예(Naive/)에 문제 줄 표시 // [!] 가 없다')
  if (!m.scenarios.length) out.push('scenarios 가 없다 (첫 번째가 자동 데모)')
  const eventIds = new Set(m.events.map(e => e.id))
  for (const sc of m.scenarios) for (const [, name] of sc.inputs) if (!eventIds.has(name)) out.push(`시나리오 ${sc.id}: 없는 입력 ${name}`)
  for (const [code, name] of Object.entries(m.keys ?? {})) {
    if (!eventIds.has(name)) out.push(`keys.${code}: 없는 입력 ${name}`)
    if (RESERVED.test(code)) out.push(`keys.${code}: 갤러리 단축키와 겹친다 (Space, 1~9, J, S, A, P, ←/→, Esc 는 쓰지 않는다)`)
  }
  const nodes = new Set(m.diagram.nodes.map(n => n.id))
  const edges = new Set(m.diagram.edges.map(e => e.id))
  for (const e of m.diagram.edges) if (!nodes.has(e.from) || !nodes.has(e.to)) out.push(`구조 그림 화살표 ${e.id}: 없는 노드`)
  for (const st of m.steps) for (const t of (st.target ?? '').split(',').map(x => x.trim()).filter(Boolean)) if (!nodes.has(t) && !edges.has(t)) out.push(`${st.n}단계 target ${t} 가 구조 그림에 없다`)
  return out
}

export const config = defineGallery<PatternSpecimen>({
  id: 'pattern-gallery',
  name: 'Pattern Gallery',
  brand: { title: 'PATTERN GALLERY', tagline: '게임 프로그래밍 패턴 · 시나리오 · Unity C#' },
  storageKey: 'jaytools.patterngallery.v1.',
  downloadName: 'PatternGallery.html',
  envLabel: 'Unity 6.3 LTS · C# 9',
  footer: '모든 코드와 글은 학습용으로 새로 작성했으며 게임 원작의 코드와 에셋을 포함하지 않습니다.',
  hero: {
    eyebrow: '유니티 개발자 양성과정 · 게임 프로그래밍 패턴',
    title: (
      <>
        나쁜 예와 <em>나란히</em>, 같은 입력을 <em>다시</em> 넣어 본다
      </>
    ),
    lead: '표본마다 패턴 없이 짠 코드(효과 끄기)와 패턴을 쓴 코드를 같은 시나리오로 돌려 봅니다. 구조 그림에서 지금 일하는 객체가 빛나고, 단계 보기로 그 순간의 코드 줄을 따라갑니다. 아래쪽 AI 지시 세트를 복사하면 같은 구조를 Unity 프로젝트에 넣을 수 있습니다.',
  },
  searchPlaceholder: '검색: 상태, 이벤트, 되돌리기…',
  groups: GROUPS,
  facet: {
    label: '패턴',
    options: [
      { value: '상태 패턴', label: '상태' },
      { value: '관찰자 패턴', label: '관찰자' },
      { value: '명령 패턴', label: '명령' },
    ],
    of: s => s.meta.pattern,
  },
  tagLabel: '주제',
  specimens: SPECIMENS,
  planned: PLANNED,
  Stage: ScenarioStage,
  shotAlt: '무대 화면',
  chips: s => [{ label: s.meta.pattern, tone: '#7ee081' }],
  cardChip: s => ({ label: s.meta.pattern, tone: '#7ee081' }),
  finalStep: { label: '최종', body: '모든 단계를 거쳐 입력 하나가 처리된 결과. 구조 그림에서 지금 일하는 객체가 빛난다.' },
  ai,
  about: {
    intro: (
      <>
        <p>
          유니티 개발자 양성과정의 강사와 수강생이 함께 보는 게임 프로그래밍 패턴 갤러리입니다. 패턴을 쓰지 않은 흔한 코드와 패턴을 쓴 코드를 같은 입력으로 돌려, 무엇이 왜 깨지고 어떻게 고쳐지는지 화면으로 봅니다. 기준은 Unity 6.3 LTS, C# 9, 새 Input System 입니다.
        </p>
        <p>
          게임 규칙은 <b>UnityEngine 을 쓰지 않는 순수 C# 코어</b>에 있고, 웹 무대는 그 코어를 같은 이름으로 옮긴 시뮬레이션입니다. 같은 시나리오를 dotnet 으로 실제 C# 코어에 돌린 기록과 웹의 기록을 줄마다 대조해 둘이 같게 유지합니다.
        </p>
      </>
    ),
    principles: [
      '책, 강연, 블로그, 오픈소스 코드는 원리만 참고하고 코드와 글은 새로 씁니다. 출처는 링크합니다.',
      '게임명은 표본 ID 와 제목에 쓰지 않습니다. 화면 속 인물과 문구는 이 갤러리의 가상 세계(외곽 탐사대)입니다.',
      '넓은 면이 번쩍이는 연출은 초당 3회 이하로 제한합니다.',
    ],
    noticeEn: 'All code and text in this gallery are original work written for education. No game code or assets are included. Game titles and trademarks belong to their respective owners; this project is not affiliated with or endorsed by them.',
    students: (
      <p>
        여기 있는 코드는 MIT 라이선스로 자유롭게 써도 됩니다. 패턴은 정답이 아니라 도구입니다. 효과 끄기로 나쁜 예가 언제 깨지는지 먼저 보고, 내 게임에 그 문제가 있을 때 쓰세요.
      </p>
    ),
  },
  lint,
})
