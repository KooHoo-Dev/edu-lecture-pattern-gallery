// 표본 구현 잡 파일을 같은 틀로 만든다 (JayDispatch 가 읽는 jobs/<id>.md).
//   node tools/workflow/make-jobs.mjs <명세.mjs> [id ...]
// 명세 형식은 tools/workflow/specs-pilot.mjs. id 를 주면 그 잡만 쓴다. 수정 잡은 fix: true 와 items 에 리뷰 지적을 적는다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO = path.resolve(fileURLToPath(import.meta.url), '../../..')

function job(spec) {
  const id = spec.id
  const allowed = ['Read', 'Edit', 'Write', 'Glob', 'Grep', '"Bash(node tools/truth.mjs *)"', '"Bash(node tools/gallery.mjs *)"', '"Bash(git status*)"', '"Bash(git diff*)"', '"Bash(ls *)"']
  const writePaths = [`unity/${id}/**`, `truth/${id}/**`, `src/specimens/${id}/**`, `src/shots/${id}/**`]
  const head = `---
# ${spec.fix ? '표본 수정' : '표본 구현'} 잡. tools/workflow/make-jobs.mjs 로 만들었다.
model: ${spec.model ?? 'claude-opus-5-5'}
effort: ${spec.effort ?? 'high'}
budgetUsd: ${spec.budgetUsd ?? 12}
verify:
  - node tools/truth.mjs ${id}
  - node tools/gallery.mjs check ${id}
  - node tools/gallery.mjs unity-compile ${id}
  - node tools/gallery.mjs thumbs ${id}
allowedTools: [${allowed.join(', ')}]
writePaths:
${writePaths.map(p => `  - ${p}`).join('\n')}
allowProfiles: [${(spec.profiles ?? ['org']).join(', ')}]
verifyTimeoutMinutes: 20
timeoutMinutes: 75
maxRetries: 2
---
`
  if (spec.fix) {
    return `${head}
# 표본 수정: ${id}

Pattern Gallery 의 표본 \`${id}\` 을 독립 리뷰 지적대로 고친다. 이 리포는 웹 앱(루트)과 Unity C# 표본(\`unity/\`)이다.

## 먼저 읽을 것

1. \`docs/specimen-guide.md\` 전체.
2. 이 표본의 파일 전부 (\`unity/${id}/\`, \`truth/${id}/\`, \`src/specimens/${id}/\`).

## 고칠 것 (위에서부터 중요한 순서)

${spec.items.map((x, i) => `${i + 1}. ${x}`).join('\n')}

## 범위

- 위 \`writePaths\` 밖은 고치지 않는다. 무대나 도구가 바뀌어야 하면 마지막 보고에 요청으로 적는다.
- C# 를 고쳤으면 \`node tools/truth.mjs ${id}\` 로 기록을 다시 만들고 sim 과 "같다" 를 확인한다.

## 끝내기 전에

1. \`node tools/truth.mjs ${id}\`, \`node tools/gallery.mjs check ${id}\`, \`node tools/gallery.mjs unity-compile ${id}\` 를 통과시킨다.
2. 고친 화면을 \`node tools/gallery.mjs live\` 로 찍어 Read 로 직접 본다.

마지막 보고에는 지적마다 고친 방법, 고치지 않은 것과 이유, 직접 확인하지 못한 것을 적는다.
`
  }
  return `${head}
# 표본 구현: ${id}

Pattern Gallery 에 표본 하나를 새로 만든다. 이 리포는 웹 앱(루트, Vite + React, 공통 셸은 \`@koohoo/gallery-kit\`)과 Unity C# 표본(\`unity/\`)이다.

## 먼저 읽을 것

1. \`docs/specimen-guide.md\` 전체. 규격과 절차는 이 문서를 따른다.
2. \`node_modules/@koohoo/gallery-kit/docs/kit-guide.md\` 의 2절(meta 글쓰기), 3절(콘텐츠 정책), 5절(안전).
3. 기준 샘플 \`${spec.sample}\` 의 파일 전부 (\`unity/${spec.sample}/\`, \`truth/${spec.sample}/Target.cs\`, \`src/specimens/${spec.sample}/\`). ${spec.sampleNote ?? ''}
4. \`docs/selection.md\` 의 \`${id}\` 카드.

## 표본별

- ID \`${id}\`, namespace \`PatternGallery.${spec.pascal}\`. ${spec.meta}
- 제목, 그룹, 순서, 한 줄 설명은 \`src/registry.ts\` 의 PLANNED 항목과 같게 한다.
${spec.items.map(x => `- ${x}`).join('\n')}

## 범위

- 위 \`writePaths\` 밖은 고치지 않는다. 특히 \`src/stage\`, \`src/ai.ts\`, \`src/gallery.config.tsx\`, \`src/registry.ts\`, \`tools\`, \`truth/Runner\`, \`docs\`, 다른 표본.
- 무대(\`src/stage\`)의 그림 부품으로 안 되는 것이 있으면 무대를 고치지 말고 가이드 9절대로 마지막 보고에 요청으로 적는다.

## 끝내기 전에

1. \`node tools/truth.mjs ${id}\` 가 모든 시나리오에서 "같다".
2. \`node tools/gallery.mjs check ${id}\`, \`node tools/gallery.mjs unity-compile ${id}\` 통과.
3. \`node tools/gallery.mjs live ${id} --query="auto=1&t=<초>" wait:600 stage:<이름>\` 으로 최종, \`&off=1\`, \`&step=N\` 화면을 찍어 Read 로 직접 본다.
4. 가이드 8절 완료 체크리스트.

마지막 보고에는 만든 것, 직접 확인하지 못한 것(Unity 장면에서 실행해 보지 않은 것 등), 가이드 9절 요청을 적는다.
`
}

const [specPath, ...only] = process.argv.slice(2)
if (!specPath) {
  console.log('사용법: node tools/workflow/make-jobs.mjs <명세.mjs> [id ...]')
  process.exit(2)
}
const specs = (await import(pathToFileURL(path.resolve(specPath)).href)).default
for (const spec of specs) {
  if (only.length && !only.includes(spec.id)) continue
  const file = path.join(REPO, 'jobs', `${spec.id}${spec.fix ? '-fix' : ''}.md`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, job(spec))
  console.log(path.relative(REPO, file))
}
