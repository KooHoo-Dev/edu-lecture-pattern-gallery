// 갤러리 도구 진입점: node tools/gallery.mjs <check | live | thumbs | skill | size | unity-compile> ...
// 워커 잡의 git worktree 에는 node_modules 가 없으므로, 메인 작업 폴더의 것을 정션으로 먼저 잇고 kit 의 도구를 부른다.
// (Vite 앱이 web/ 같은 하위 폴더에 있으면 WEB 을 바꾼다)
import { spawnSync } from 'node:child_process'
import { existsSync, symlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WEB = ROOT
const modules = join(WEB, 'node_modules')
if (!existsSync(modules)) {
  const r = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: ROOT, encoding: 'utf8' })
  const main = r.status === 0 ? dirname(resolve(r.stdout.trim())) : ROOT
  const source = join(main, WEB.slice(ROOT.length), 'node_modules')
  if (resolve(main).toLowerCase() !== ROOT.toLowerCase() && existsSync(source)) symlinkSync(source, modules, 'junction')
}
process.chdir(ROOT)
await import(pathToFileURL(join(modules, '@koohoo', 'gallery-kit', 'tools', 'gallery.mjs')).href)
