// 패턴 갤러리 도메인 검사 (Node 쪽). kit 의 gallery check 가 부른다. 브라우저 쪽 규칙은 src/gallery.config.tsx 의 lint.
//   1. 폴더: unity/<id>/Core, Unity, Naive, truth/<id>/Target.cs, src/specimens/<id>/sim.ts
//   2. C#: namespace PatternGallery.<Pascal id> 블록, Core 는 UnityEngine 을 쓰지 않음, 구 입력·금지 API
//   3. 기록: 시나리오마다 truth 기록이 있고, C# 지문이 지금 코드와 같고, sim 을 돌린 기록과 줄마다 같다

import { existsSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { csFiles, loadMeta, loadRunner, loadSim, logPath, readLog, sourceHash } from './lib/truth-lib.mjs'

const pascal = id => id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')

export default async function checkDomain({ project, ids, err, warn }) {
  const root = project.root
  const runner = await loadRunner(root)
  for (const id of ids) {
    const unity = join(root, 'unity', id)
    for (const [path, what] of [
      [join(unity, 'Core'), 'unity/<id>/Core (순수 C# 코어)'],
      [join(unity, 'Unity'), 'unity/<id>/Unity (MonoBehaviour 어댑터)'],
      [join(unity, 'Naive'), 'unity/<id>/Naive (나쁜 예)'],
      [join(root, 'truth', id, 'Target.cs'), 'truth/<id>/Target.cs (하네스 어댑터)'],
      [join(root, 'src', 'specimens', id, 'sim.ts'), 'src/specimens/<id>/sim.ts'],
    ]) {
      if (!existsSync(path)) err(`${id}: ${what} 가 없다`)
    }

    const ns = new RegExp(`namespace\\s+PatternGallery\\.${pascal(id)}(\\.\\w+)?\\s*\\{`)
    for (const file of [...csFiles(unity), join(root, 'truth', id, 'Target.cs')].filter(existsSync)) {
      const rel = relative(root, file).replaceAll('\\', '/')
      const code = readFileSync(file, 'utf8')
      if (!ns.test(code)) err(`${rel}: namespace PatternGallery.${pascal(id)} { … } 블록 안에 둔다 (파일 범위 namespace 는 C# 10)`)
      if (/^\s*namespace\s+[\w.]+\s*;/m.test(code)) err(`${rel}: 파일 범위 namespace 는 Unity 6 의 C# 9 에서 안 된다`)
      if (/\bFindObjectOfType\b|\.velocity\b|\bInput\.Get(Key|Axis|Button|Mouse)/.test(code)) err(`${rel}: 쓰지 않는 API (FindObjectOfType, Rigidbody.velocity, 구 Input Manager)`)
      if (!/^\s*\/\/.*\S/.test(code.split(/\r?\n/).find(l => l.trim()) ?? '')) warn(`${rel}: 첫 줄에 무엇을 하는지 한국어 주석을 둔다`)
      // 단계 표시 `// [n]` 은 코드 줄 끝에 둔다. 주석만 있는 줄에 두면 무대의 코드 줄 칸에 빈 줄로 나온다 (묶음 5 리뷰)
      code.split(/\r?\n/).forEach((line, i) => {
        if (/^\s*\/\/ \[\d+\]/.test(line)) err(`${rel}:${i + 1}: // [n] 은 코드 줄 끝에 둔다 (주석만 있는 줄은 코드 칸에 빈 줄로 나온다)`)
      })
      if (rel.includes('/Core/') || rel.includes('/Naive/')) {
        // 주석과 문자열은 빼고 본다 ("UnityEngine 을 쓰지 않는다" 같은 설명 때문에)
        const bare = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
        if (/\bUnityEngine\b|\bMonoBehaviour\b|\bTime\.(deltaTime|time)\b|\bDebug\.Log/.test(bare)) err(`${rel}: Core 와 Naive 는 UnityEngine 을 쓰지 않는다 (시간은 Tick(dt) 로 받는다)`)
      }
    }

    // 기록 대조
    let meta
    let createSim
    try {
      meta = await loadMeta(root, id)
      createSim = await loadSim(root, id)
    } catch (e) {
      err(`${id}: meta.ts 나 sim.ts 를 Node 가 읽지 못한다 (타입은 import type, 상대 경로는 .ts 확장자): ${e.message}`)
      continue
    }
    // 패턴 필터: meta.pattern 이 갤러리 설정의 facet.options 에 있어야 필터 칩에 나온다 (묶음 2 에서 넷이 빠졌다)
    const config = readFileSync(join(root, 'src', 'gallery.config.tsx'), 'utf8')
    if (meta.pattern && !config.includes(`value: '${meta.pattern}'`)) err(`${id}: 패턴 '${meta.pattern}' 이 src/gallery.config.tsx 의 facet.options 에 없다 (구독 세션에 요청한다)`)
    // 제목: src/registry.ts PLANNED 의 제목과 같아야 한다 (카드·프롬프트·Skill 이 같은 이름을 쓴다. 묶음 6 에서 갈라졌다)
    const reg = readFileSync(join(root, 'src', 'registry.ts'), 'utf8')
    const planned = new RegExp("id: '" + id + "', title: '([^']+)'").exec(reg)?.[1]
    if (planned && meta.title !== planned) err(`${id}: 제목 '${meta.title}' 이 src/registry.ts PLANNED 의 '${planned}' 와 다르다`)
    // offNote 는 효과 끄기 화면 옆에 붙는 짧은 글이다. 길면 시나리오 note 로 옮긴다 (일관성 정리 기준 300~450자)
    if ((meta.offNote ?? '').length > 600) warn(`${id}: offNote 가 ${meta.offNote.length}자다. 600자 안으로 (시각·숫자는 시나리오 note 로)`)
    const src = sourceHash(root, id)
    let compared = 0
    // 나쁜 예의 버그(! 줄)는 모두 첫 시나리오(자동 데모)에도 나와야 한다 (가이드 8절)
    const bugs = new Map()
    // 종류는 문구의 앞부분(첫 ':' 나 ' (' 앞)이다. "MissingReferenceException: 파괴된 …" 은 대상이 달라도 같은 종류
    const bugText = line => line.replace(/^\S+ ev !/, '').split(/:| \(/)[0].trim()
    for (const sc of meta.scenarios ?? []) {
      for (const naive of [false, true]) {
        const path = logPath(root, id, sc.id, naive)
        const name = `${sc.id}${naive ? ' (나쁜 예)' : ''}`
        if (!existsSync(path)) {
          err(`${id}: 시나리오 기록이 없다: ${relative(root, path)}. node tools/truth.mjs ${id}`)
          continue
        }
        const log = readLog(path)
        if (log.src !== src) err(`${id}: C# 코드가 바뀌었는데 기록을 다시 만들지 않았다 (${name}). node tools/truth.mjs ${id}`)
        let actual
        try {
          actual = runner.runScenario(createSim, meta, sc, naive)
        } catch (e) {
          err(`${id}: sim 실행 오류 (${name}): ${e.message}`)
          continue
        }
        if (naive) bugs.set(sc.id, new Set(log.lines.filter(l => / ev !/.test(l)).map(bugText)))
        const diff = runner.compareLogs(log.lines, actual)
        if (diff) err(`${id}: 시나리오 ${name} 에서 C# 와 sim 이 ${diff.line}번째 줄부터 다르다\n    C#  : ${diff.expected}\n    sim : ${diff.actual}`)
        compared++
      }
    }
    const demo = meta.scenarios?.[0]?.id
    if (demo && bugs.has(demo)) {
      for (const [scenario, set] of bugs) for (const b of set) if (!bugs.get(demo).has(b)) err(`${id}: 나쁜 예 버그 "${b}" 가 ${scenario} 에만 나오고 자동 데모(${demo})에는 없다`)
    }
    if (compared) console.log(`  ${id}: 시나리오 기록 ${compared}개 대조`)
  }
}
