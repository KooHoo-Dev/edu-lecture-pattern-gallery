// kit 을 고치면서 이 갤러리에서 바로 확인할 때: 로컬 kit 폴더의 파일을 node_modules 의 kit 위에 복사한다.
//   npm run kit:sync                 (기본 C:\Users\user\edu-lecture-gallery-kit)
//   npm run kit:sync -- <kit 폴더>
// git 태그로 설치한 것과 같은 모양(복사본)이라 React 가 두 벌 생기지 않는다. 확인이 끝나면 kit 을 커밋·태그하고
// package.json 의 태그를 올린 뒤 npm install 로 돌아간다. 이 상태로 이 갤러리를 커밋하지 않는다.
import { cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const kit = resolve(process.argv[2] ?? 'C:\\Users\\user\\edu-lecture-gallery-kit')
const target = join(ROOT, 'node_modules', '@koohoo', 'gallery-kit')
if (!existsSync(join(kit, 'package.json'))) throw new Error(`kit 폴더가 아니다: ${kit}`)
for (const name of ['src', 'tools', 'templates', 'docs']) {
  rmSync(join(target, name), { recursive: true, force: true })
  cpSync(join(kit, name), join(target, name), { recursive: true })
}
for (const name of ['vite.mjs', 'vite.d.mts', 'package.json', 'README.md']) cpSync(join(kit, name), join(target, name))
console.log(`kit 을 복사했다: ${kit} -> node_modules/@koohoo/gallery-kit`)
