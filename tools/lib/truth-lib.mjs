// 시나리오 기록 공용 도구. tools/truth.mjs (dotnet 으로 기록 만들기)와 tools/check-domain.mjs (sim 과 대조)가 쓴다.
// Node 는 갤러리의 TS 를 직접 읽는다 (타입 지우기). 그래서 meta.ts, sim.ts, runner.ts 는 타입만 import 하고
// 런타임 import 는 확장자를 붙인 상대 경로(.ts)만 쓴다 (docs/specimen-guide.md 3절).

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

export const csFiles = dir =>
  existsSync(dir)
    ? readdirSync(dir)
        .flatMap(name => {
          const p = join(dir, name)
          return statSync(p).isDirectory() ? csFiles(p) : name.endsWith('.cs') ? [p] : []
        })
        .sort()
    : []

/** 기록이 기대는 C# 코드(코어, 나쁜 예, 어댑터)의 지문. 코드를 바꾸고 기록을 다시 만들지 않으면 검사가 잡는다 */
export function sourceHash(root, id) {
  const hash = createHash('sha1')
  for (const file of [...csFiles(join(root, 'unity', id, 'Core')), ...csFiles(join(root, 'unity', id, 'Naive')), join(root, 'truth', id, 'Target.cs')]) {
    if (!existsSync(file)) continue
    hash.update(relative(root, file).replaceAll('\\', '/'))
    hash.update(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))
  }
  return hash.digest('hex').slice(0, 12)
}

export const logPath = (root, id, scenario, naive) => join(root, 'truth', id, `${scenario}${naive ? '.naive' : ''}.log`)

export async function loadMeta(root, id) {
  return (await import(pathToFileURL(join(root, 'src', 'specimens', id, 'meta.ts')).href)).meta
}

export async function loadSim(root, id) {
  return (await import(pathToFileURL(join(root, 'src', 'specimens', id, 'sim.ts')).href)).createSim
}

export async function loadRunner(root) {
  return import(pathToFileURL(join(root, 'src', 'stage', 'runner.ts')).href)
}

/** 기록 파일 = '# src <지문>' 한 줄 + 하네스 기록 */
export function readLog(path) {
  const lines = readFileSync(path, 'utf8').replace(/\r\n/g, '\n').trimEnd().split('\n')
  const src = /^# src (\w+)$/.exec(lines[0] ?? '')?.[1] ?? null
  return { src, lines: src ? lines.slice(1) : lines }
}
