import { bullets, codeSection, numbered, promptDoc, richToMarkdown, valueTable, type AiConfig, type CodeFile, type ParamDef, type ParamValues } from '@koohoo/gallery-kit'
import type { PatternSpecimen } from './stage/types'

/** Skill 설명의 패턴 목록: 표본마다가 아니라 패턴마다 한 번 (설명 한도 1536자. 표본 20개에서 1315자였다) */
const patternList = (all: { meta: { pattern: string; titleEn: string } }[]) =>
  [...new Map(all.map(s => [s.meta.pattern, `${s.meta.pattern}(${s.meta.titleEn.split(':')[0].trim()})`])).values()].join(', ')

/* AI 지시 세트와 Skill. 프롬프트는 특정 AI 도구에 묶지 않는 평범한 Markdown 이다. */

const ENVIRONMENT = ['- Unity 6.3 LTS (6000.3), C# 9', '- 입력: 새 Input System 패키지 (구 Input Manager 는 쓰지 않음)'].join('\n')

export const FIXED_RULES = [
  '- 게임 규칙은 `Core/` 의 순수 C# 클래스에 둔다. `Core/` 는 `UnityEngine` 을 참조하지 않고, 시간은 `Tick(float dt)` 로만 받는다. 그래야 에디터 없이 테스트할 수 있다.',
  '- `MonoBehaviour` 는 입력을 코어에 넘기고 코어의 상태를 화면에 옮기는 일만 한다.',
  '- 입력은 새 Input System 으로만 받는다. `Input.GetKey` 같은 구 Input Manager API, `FindObjectOfType`, `Rigidbody.velocity` 는 쓰지 않는다.',
  '- 형식은 파일에 있는 `namespace PatternGallery.…` 블록 안에 둔다. Unity 6 은 C# 9 라 `namespace X;` 한 줄 형식, `record struct` 같은 C# 10 이상 문법은 쓰지 않는다.',
  '- 외부 패키지(DOTween, UniRx 등)는 쓰지 않는다. 각 파일 맨 위에 무엇을 하는지 한국어 주석을 둔다.',
  '- 코드에서 만드는 `InputAction` 은 `InputActionType.Button` 으로 만들고, `OnEnable` 에서 콜백을 붙이고 `Enable`, `OnDisable` 에서 떼고 `Disable` 한다 (떼지 않으면 다시 켤 때 한 번 누를 때 두 번 처리된다).',
  '- `// [1]` 같은 줄 끝 표시는 웹 갤러리의 단계 보기에 쓰는 것이다. Unity 에서는 아무 일도 하지 않으므로 그대로 두어도 되고 지워도 된다.',
].join('\n')

/** Unity 프로젝트 안 자리에서 표본 폴더 뒤 경로 (Core/X.cs) */
export const relPath = (s: PatternSpecimen, f: CodeFile) => f.path.slice(`Assets/Patterns/${s.meta.id}/`.length)

/** 넣는 파일: 코어(Core/)와 MonoBehaviour 연결 컴포넌트(Unity/). 나쁜 예(Naive/)는 넣지 않는다 */
export const installFiles = (s: PatternSpecimen) => s.files.filter(f => !relPath(s, f).startsWith('Naive/'))

function csLiteral(def: ParamDef, value: unknown, declaration: string): string {
  if (def.type === 'toggle') return value ? 'true' : 'false'
  if (def.type === 'color') {
    const n = parseInt(String(value).slice(1), 16)
    const c = (shift: number) => String(Number((((n >> shift) & 255) / 255).toFixed(3)))
    return `new Color(${c(16)}f, ${c(8)}f, ${c(0)}f)`
  }
  if (def.type === 'select') {
    const type = /\b([A-Z]\w*)\s+\w+\s*=/.exec(declaration)?.[1]
    return type && type !== 'string' ? `${type}.${value}` : `"${value}"`
  }
  const v = Number(value)
  if (/\bint\b/.test(declaration)) return String(Math.round(v))
  return `${Number(v.toFixed(4))}f`
}

/** [SerializeField] 필드의 초기값을 지금 조절 값으로 바꾼다 (Inspector 의 기본값이 된다) */
export function applyValues(code: string, defs: ParamDef[], values: ParamValues): string {
  let out = code
  for (const def of defs) {
    const re = new RegExp(`(\\[SerializeField\\][^;\\n]*?\\b${def.key}\\s*=\\s*)([^;\\n]+)(;)`)
    out = out.replace(re, (all, head: string, _old: string, tail: string) => `${head}${csLiteral(def, values[def.key] ?? def.default, all)}${tail}`)
  }
  return out
}

export function filesWithValues(s: PatternSpecimen, values: ParamValues): CodeFile[] {
  return installFiles(s).map(f => ({ ...f, code: applyValues(f.code, s.meta.params, values) }))
}

const inspector = (s: PatternSpecimen, values: ParamValues) => valueTable(s.meta.params, values, ['필드', '뜻', '값'])

const defaults = (s: PatternSpecimen): ParamValues => Object.fromEntries(s.meta.params.map(p => [p.key, p.default]))

export const ai: AiConfig<PatternSpecimen> = {
  intro: '이 세트는 지금 조절 값을 그대로 담습니다. 위에서 값을 바꾼 뒤 복사하세요. 코드의 [SerializeField] 기본값도 지금 값으로 바뀌어 있습니다.',
  prompts: [
    {
      id: 'direct',
      name: '그대로 넣기',
      desc: '코드를 바꾸지 않고 내 프로젝트에 추가한다',
      build: (s, values) =>
        promptDoc(`Unity 패턴 추가: ${s.meta.title}`, `${s.meta.prompt.goal} (${s.meta.pattern})`, [
          ['환경', ENVIRONMENT],
          ['할 일', numbered(['아래 파일은 코드를 바꾸지 않고 그대로 만든다.', ...s.meta.unity.setup.map(richToMarkdown), `확인: ${richToMarkdown(s.meta.unity.verify)}`])],
          ['Inspector 값', inspector(s, values)],
          ['지킬 것', FIXED_RULES],
          ['주의할 점', bullets(s.meta.unity.pitfalls.map(richToMarkdown))],
          ['파일', codeSection(filesWithValues(s, values))],
        ]),
    },
    {
      id: 'adapt',
      name: '내 프로젝트에 맞게 변형',
      desc: '대괄호 칸을 채워 원하는 방향으로 바꾼다',
      build: (s, values) =>
        promptDoc(`Unity 패턴 변형: ${s.meta.title}`, `아래 코드를 기준으로 내 프로젝트에 맞게 바꿔 줘. 원래 표본: ${s.meta.oneLiner} (${s.meta.pattern})`, [
          ['환경', `${ENVIRONMENT}\n- 장르와 플랫폼: [여기에 적는다]`],
          ['바꾸고 싶은 점', `[여기에 적는다. 예: ${s.meta.prompt.adaptIdeas[0] ?? '상태를 하나 더 넣고 싶다'}]`],
          [
            '바꾸는 규칙',
            bullets([
              '게임 규칙을 바꾸면 `Core/` 를 고치고, `Unity/` 는 입력과 화면 연결이 달라질 때만 고친다.',
              '바꾼 파일은 일부가 아니라 전체 내용을 출력한다.',
              '무엇을 왜 바꿨는지 세 줄 이내로 설명하고, 확인 방법을 적는다.',
            ]),
          ],
          ['지킬 것', FIXED_RULES],
          ['변형 예시', bullets(s.meta.prompt.adaptIdeas)],
          ['현재 Inspector 값', inspector(s, values)],
          ['현재 파일', codeSection(filesWithValues(s, values))],
        ]),
    },
    {
      id: 'troubleshoot',
      name: '문제 해결',
      desc: '넣었는데 안 될 때 증상을 적어 맡긴다',
      build: (s, values) =>
        promptDoc(`Unity 패턴 문제 해결: ${s.meta.title}`, '이 코드를 넣었는데 제대로 동작하지 않아. 원인을 찾아 고쳐 줘.', [
          ['환경', `${ENVIRONMENT}\n- 장르와 플랫폼: [여기에 적는다]`],
          ['증상', '- 보이는 모습: [여기에 적는다]\n- Console 오류: [있으면 그대로 붙인다]\n- 내가 넣은 곳과 순서: [여기에 적는다]'],
          ['먼저 확인할 것', bullets([...s.meta.mistakes.map(m => `${m.title}: ${richToMarkdown(m.body)}`), ...s.meta.unity.pitfalls.map(richToMarkdown)])],
          ['고치는 규칙', bullets(['가능성이 높은 원인부터 하나씩 확인하게 안내한다. 한 번에 여러 곳을 바꾸지 않는다.', '코드 문제면 바꾼 파일 전체를 출력한다.', '고친 뒤 확인 방법을 적는다.'])],
          ['지킬 것', FIXED_RULES],
          ['정상 동작 기준', richToMarkdown(s.meta.unity.verify)],
          ['기준 Inspector 값', inspector(s, values)],
          ['기준 파일', codeSection(filesWithValues(s, values))],
        ]),
    },
  ],
  files: (s, values) => [...filesWithValues(s, values), ...s.files.filter(f => relPath(s, f).startsWith('Naive/'))],
  codeNote: s => `Core 와 Unity 폴더를 Assets/Patterns/${s.meta.id}/ 에 둡니다. Naive 폴더는 비교용 나쁜 예라 넣지 않습니다.`,
  sheet: { tab: 'Inspector 값', markdown: inspector },
  images: {
    title: '무대 화면',
    list: s => [
      ...(s.shots.default ? [{ name: 'default', label: '기본값', url: s.shots.default }] : []),
      ...(s.meta.captures ?? []).filter(c => s.shots[c.name]).map(c => ({ name: c.name, label: c.label, url: s.shots[c.name] })),
    ],
    note: '무대는 C# 코어를 옮긴 웹 시뮬레이션이다. 같은 시나리오를 dotnet 으로 돌린 C# 결과와 기록을 대조해 맞춘다.',
    liveLabel: '현재 무대 복사',
  },
  skill: {
    name: 'game-patterns',
    description: all =>
      `Unity 에 게임 프로그래밍 패턴을 넣거나 변형하거나 고칠 때 쓴다. Unity 6.3 LTS, C# 9, 새 Input System 기준의 검증된 샘플(순수 C# 코어 + MonoBehaviour 연결 컴포넌트)과 넣는 순서가 들어 있다. 다루는 패턴: ${patternList(all)}. 비슷한 구조를 새로 만들 때도 기준 코드로 삼는다.`,
    compatibility: 'Unity 6.3 LTS (6000.3), C# 9, Input System',
    title: 'Pattern Gallery',
    intro: '사용자가 Unity 에서 상태 관리, 이벤트 알림, 되돌리기, 객체 재사용, 생성 관리 같은 구조를 요청하면 아래 목록에서 가장 가까운 표본을 고르고, 그 표본의 `references/<id>/guide.md` 만 읽는다. 다른 표본의 자료는 읽지 않는다.',
    kindOf: s => s.meta.pattern,
    steps: [
      '`references/<id>/guide.md` 를 읽는다.',
      '같은 폴더의 `Core/`, `Unity/` 파일을 프로젝트의 `Assets/Patterns/<id>/` 아래 같은 하위 폴더에 그대로 복사한다.',
      'guide 의 넣는 순서대로 장면과 Input System 연결을 안내하거나 적용한다.',
      '사용자가 다른 동작을 원하면 게임 규칙은 `Core/` 에서, 입력과 화면 연결은 `Unity/` 에서 고친다.',
      'guide 의 확인 방법을 사용자에게 알려 준다.',
    ],
    rules: FIXED_RULES,
    notes: ['`Core/` 는 에디터 없이 테스트할 수 있게 `UnityEngine` 을 참조하지 않는다. 이 구분을 유지한다.', '표에 없는 패턴은 가장 비슷한 표본의 코어와 연결 컴포넌트 구조를 틀로 삼아 새로 만든다.'],
    guide: s => {
      const m = s.meta
      const list = (lines: string[]) => lines.map(line => `- ${line}`).join('\n')
      return (
        [
          `# ${m.title} (${m.titleEn})`,
          m.oneLiner,
          `패턴: ${m.pattern}. 난이도 ${m.difficulty}/3. 주제: ${m.tags.join(', ')}.`,
          `## 파일\n${list(installFiles(s).map(f => `\`${relPath(s, f)}\``))}`,
          `## 넣는 순서\n${numbered(m.unity.setup.map(richToMarkdown))}`,
          `## 확인\n${richToMarkdown(m.unity.verify)}`,
          `## 기본 Inspector 값\n${valueTable(m.params, defaults(s), ['필드', '뜻', '값'])}`,
          `## 동작 단계\n${m.steps.map(st => `${st.n}. **${st.label}**: ${richToMarkdown(st.body)}`).join('\n')}`,
          `## 주의할 점\n${list(m.unity.pitfalls.map(richToMarkdown))}`,
          `## 흔한 실수\n${list(m.mistakes.map(x => `**${x.title}**: ${richToMarkdown(x.body)}`))}`,
          `## 변형 예시\n${list(m.prompt.adaptIdeas)}`,
        ].join('\n\n') + '\n'
      )
    },
    files: async s => installFiles(s).map(f => ({ name: relPath(s, f), content: f.code })),
  },
}
