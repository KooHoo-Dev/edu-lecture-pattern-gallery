// 시나리오 기록 만들기: 표본의 C# 코어와 나쁜 예를 dotnet 으로 실제 실행해 truth/<id>/<시나리오>(.naive).log 를 쓴다.
// 그다음 같은 시나리오를 웹 sim(src/specimens/<id>/sim.ts)으로 돌려 줄마다 대조한다.
//   node tools/truth.mjs              모든 표본
//   node tools/truth.mjs <id> ...     지정한 표본 (하네스도 그 표본만 넣어 빌드한다)
// 필요: .NET SDK (net10.0). 기록은 커밋한다. CI 는 dotnet 없이 커밋된 기록과 sim 만 대조한다.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadMeta, loadRunner, loadSim, logPath, readLog, sourceHash } from './lib/truth-lib.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const all = readdirSync(join(ROOT, 'src', 'specimens')).filter(d => existsSync(join(ROOT, 'src', 'specimens', d, 'meta.ts')))
const ids = process.argv.slice(2).length ? process.argv.slice(2) : all
let failed = false
const runner = await loadRunner(ROOT)

for (const id of ids) {
  if (!all.includes(id)) {
    console.log(`표본 폴더가 없다: ${id}`)
    failed = true
    continue
  }
  const meta = await loadMeta(ROOT, id)
  const jobs = meta.scenarios.flatMap(sc =>
    [false, true].map(naive => ({
      specimen: id,
      scenario: sc.id,
      naive,
      values: Object.fromEntries(Object.entries(runner.valuesFor(meta.params, sc.values)).map(([k, v]) => [k, String(v)])),
      inputs: sc.inputs,
      duration: sc.duration,
      out: logPath(ROOT, id, sc.id, naive),
    })),
  )
  // 이전 기록은 지운다 (이름이 바뀐 시나리오의 기록이 남지 않게)
  for (const f of existsSync(join(ROOT, 'truth', id)) ? readdirSync(join(ROOT, 'truth', id)) : []) if (f.endsWith('.log')) rmSync(join(ROOT, 'truth', id, f))
  const work = join(tmpdir(), `pattern-truth-${process.pid}-${id}.json`)
  writeFileSync(work, JSON.stringify(jobs))
  console.log(`${id}: dotnet 하네스 실행 (시나리오 ${meta.scenarios.length}개 × 패턴/나쁜 예)`)
  const r = spawnSync('dotnet', ['run', '--project', join(ROOT, 'truth', 'Harness.csproj'), '-c', 'Release', `-p:Only=${id}`, '--', work], { cwd: ROOT, encoding: 'utf8' })
  rmSync(work, { force: true })
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim()
  if (r.status !== 0) {
    console.log(out.split('\n').filter(l => /error|오류|Exception|없다/.test(l)).slice(0, 30).join('\n') || out.slice(-3000))
    console.log(`${id}: 하네스 실패`)
    failed = true
    continue
  }
  // 기록 맨 위에 C# 지문을 붙인다
  const src = sourceHash(ROOT, id)
  for (const j of jobs) writeFileSync(j.out, `# src ${src}\n${readFileSync(j.out, 'utf8').replace(/\r\n/g, '\n')}`)

  const createSim = await loadSim(ROOT, id)
  for (const sc of meta.scenarios) {
    for (const naive of [false, true]) {
      const expected = readLog(logPath(ROOT, id, sc.id, naive)).lines
      let actual
      try {
        actual = runner.runScenario(createSim, meta, sc, naive)
      } catch (e) {
        console.log(`  ${sc.id}${naive ? ' (나쁜 예)' : ''}: sim 실행 오류 ${e.stack ?? e}`)
        failed = true
        continue
      }
      const diff = runner.compareLogs(expected, actual)
      if (diff) {
        console.log(`  ${sc.id}${naive ? ' (나쁜 예)' : ''}: C# 와 sim 이 ${diff.line}번째 줄에서 다르다\n    C#  : ${diff.expected}\n    sim : ${diff.actual}`)
        failed = true
      } else console.log(`  ${sc.id}${naive ? ' (나쁜 예)' : ''}: 같다 (${expected.length}줄)`)
    }
  }
}
mkdirSync(join(ROOT, 'truth'), { recursive: true })
console.log(failed ? '실패' : '통과')
process.exitCode = failed ? 1 : 0
