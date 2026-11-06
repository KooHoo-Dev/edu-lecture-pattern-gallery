// 리뷰 화면을 _review/<id>/ 에 찍는다 (자동 데모 = 첫 시나리오 기준).
//   node tools/workflow/review-shots.mjs <id> [id ...]
// 찍는 것: 최종 t=1.3 / 중간 / 끝 (효과 켬·끔), 자동 데모 기록에서 ✖ 종류마다 처음 뜬 순간 + 0.05초의 효과 끄기 화면,
// 단계마다 자동 데모 중간 시각의 단계 화면, 프리셋마다 끝 화면. 파일 이름은 review-brief.md 의 표와 같다.
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadMeta, logPath, readLog } from '../lib/truth-lib.mjs'

const root = resolve(fileURLToPath(import.meta.url), '../../..')
const r2 = x => Math.round(x * 100) / 100

function live(id, query, name) {
  execFileSync(process.execPath, ['tools/gallery.mjs', 'live', id, `--query=${query}`, 'wait:600', `stage:${name}`], { cwd: root, stdio: 'ignore' })
}

for (const id of process.argv.slice(2)) {
  const meta = await loadMeta(root, id)
  const demo = meta.scenarios[0]
  const end = r2(demo.duration - 0.3)
  const mid = r2(demo.duration / 2)
  const out = join(root, '_review', id)
  const shots = join(root, '_shots', id)
  rmSync(out, { recursive: true, force: true })
  rmSync(shots, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })

  for (const t of [1.3, mid, end]) {
    live(id, `auto=1&t=${t}`, `t${t}`)
    live(id, `auto=1&t=${t}&off=1`, `t${t}-off`)
  }
  // ✖ 종류마다 처음 뜬 순간
  const seen = new Set()
  const naiveLog = logPath(root, id, demo.id, true)
  for (const line of existsSync(naiveLog) ? readLog(naiveLog).lines : []) {
    const m = /^(\d+\.\d+) ev !(.*)$/.exec(line)
    if (!m) continue
    const kind = m[2].split(/:| \(/)[0].trim()
    if (seen.has(kind)) continue
    seen.add(kind)
    live(id, `auto=1&t=${r2(Number(m[1]) + 0.05)}&off=1`, `bug-${seen.size}`)
  }
  for (const s of meta.steps ?? []) live(id, `auto=1&t=${mid}&step=${s.n}`, `step${s.n}`)
  // 프리셋마다 끝 화면 (조절 값 끝에서 생기는 겹침, 프리셋 look 대조. 묶음 4 리뷰 요청)
  for (const p of meta.presets ?? []) live(id, `auto=1&t=${end}&preset=${p.id}`, `preset-${p.id}`)

  if (existsSync(shots)) for (const f of readdirSync(shots)) renameSync(join(shots, f), join(out, f))
  console.log(`${id}: ${readdirSync(out).length}장 (중간 ${mid}s, 끝 ${end}s, ✖ ${seen.size}종)`)
}
