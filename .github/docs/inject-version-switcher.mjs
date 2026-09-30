// Injects the docs version switcher into every page of an assembled docs site.
//
//   node .github/docs/inject-version-switcher.mjs <site dir>
//
// Env:
//   BASE_PATH  the Pages base path the site is served under ('' for a custom domain)
//   VERSIONS   JSON [{ label, tag, path, prerelease? }] -- see version-switcher.js
//
// A version whose sub-path is missing from the site (its build failed) is left out of the picker.

import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const site = process.argv[2]
if (!site) throw new Error('usage: inject-version-switcher.mjs <site dir>')

const base = process.env.BASE_PATH ?? ''
const versions = JSON.parse(process.env.VERSIONS ?? '[]').filter((v) => existsSync(join(site, v.path)))

copyFileSync(join(dirname(fileURLToPath(import.meta.url)), 'version-switcher.js'), join(site, 'version-switcher.js'))

const attr = JSON.stringify(versions).replaceAll('&', '&amp;').replaceAll('"', '&quot;')
const tag = `<script src="${base}/version-switcher.js" data-versions="${attr}" defer></script>`

let count = 0
for (const file of readdirSync(site, { recursive: true })) {
  if (!file.endsWith('.html')) continue
  const path = join(site, file)
  const html = readFileSync(path, 'utf8')
  if (!html.includes('</head>')) continue
  writeFileSync(path, html.replace('</head>', `${tag}</head>`))
  count++
}

console.log(`Injected version switcher (${versions.map((v) => v.label).join(', ')}) into ${count} pages`)
