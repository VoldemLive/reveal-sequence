import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { gzipSync } from 'node:zlib'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const requiredFiles = [
  'dist/index.js',
  'dist/index.js.map',
  'dist/index.cjs',
  'dist/index.cjs.map',
  'dist/types/index.d.ts',
]
const gzipBudget = Math.floor(5.1 * 1024)

for (const file of requiredFiles) {
  if (!existsSync(file)) throw new Error(`Missing package artifact: ${file}`)
}

for (const file of ['dist/index.js', 'dist/index.cjs']) {
  const compressedBytes = gzipSync(readFileSync(file)).byteLength
  if (compressedBytes > gzipBudget) {
    throw new Error(`${file} exceeds the ${gzipBudget}-byte gzip budget: ${compressedBytes}`)
  }
  console.log(`${file}: ${compressedBytes} B gzip`)
}

const entry = packageJson.exports?.['.']
if (
  entry?.import !== './dist/index.js' ||
  entry?.require !== './dist/index.cjs' ||
  entry?.types !== './dist/types/index.d.ts'
) {
  throw new Error('Package exports do not point to the checked build artifacts')
}

const esm = await import(new URL('../dist/index.js', import.meta.url).href)
const require = createRequire(import.meta.url)
const cjs = require('../dist/index.cjs')

for (const exportName of ['RevealGroup', 'RevealText', 'segmentText']) {
  if (typeof esm[exportName] !== 'function' || typeof cjs[exportName] !== 'function') {
    throw new Error(`Missing runtime export: ${exportName}`)
  }
}

console.log('Package artifact, export, and runtime checks passed.')
