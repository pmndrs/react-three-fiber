#!/usr/bin/env node
/**
 * Publish the workspace packages under the dist-tag their own versions imply.
 *
 * The tag is derived, never passed in. `pnpm publish` defaults to `latest` when `--tag` is omitted,
 * so the previous one-line release script would have moved `latest` from the 9.x line onto a v10
 * prerelease -- every `npm install @react-three/fiber` in the world, from a command whose danger was
 * invisible at the call site. Hardcoding `--tag alpha` fixes today and breaks at beta, so instead
 * the channel comes from the version string and stays correct through beta, rc and stable.
 *
 *   10.0.0-alpha.3  -> alpha
 *   10.0.0-beta.1   -> beta
 *   10.0.0-rc.2     -> rc
 *   10.0.0          -> latest
 *
 * Guards, in order of how much damage they prevent:
 *
 *   - every package must agree on the channel. A stray `latest` alongside prereleases is how
 *     `latest` moves by accident, and the versions are edited by hand.
 *   - publishing to `latest` requires --allow-latest. Reaching stable should be a deliberate act,
 *     not something a script does because the version happened to lose its suffix.
 *   - --dry-run prints the plan and publishes nothing.
 *
 * Usage:  node scripts/release.js [--dry-run] [--allow-latest]
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// fiber first: the others declare a peer on it, so a partial run leaves the tree resolvable.
const PACKAGES = ['fiber', 'test-renderer', 'eslint-plugin']

const argv = new Set(process.argv.slice(2))
const dryRun = argv.has('--dry-run')
const allowLatest = argv.has('--allow-latest')

const die = (msg) => {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}

/** `10.0.0-alpha.3` -> `alpha`; `10.0.0` -> `latest`. */
const channelOf = (version) => {
  const [, prerelease] = version.split('-', 2)
  if (!prerelease) return 'latest'

  const id = prerelease.split('.')[0]
  if (!/^[a-z][a-z0-9]*$/.test(id)) die(`Cannot read a dist-tag from version "${version}".`)
  return id
}

const manifests = PACKAGES.map((dir) => {
  const path = join(root, 'packages', dir, 'package.json')
  const { name, version } = JSON.parse(readFileSync(path, 'utf8'))
  return { dir, name, version, channel: channelOf(version) }
})

const channels = [...new Set(manifests.map((m) => m.channel))]
if (channels.length > 1) {
  die(
    `Packages disagree on the release channel, so publishing would tag them inconsistently:\n\n` +
      manifests.map((m) => `    ${m.name.padEnd(30)} ${m.version.padEnd(20)} -> ${m.channel}`).join('\n') +
      `\n\n  Align the versions, then re-run.`,
  )
}

const [tag] = channels

if (tag === 'latest' && !allowLatest) {
  die(
    `Refusing to publish to "latest".\n\n` +
      `  These versions carry no prerelease suffix, so this would move the "latest" dist-tag —\n` +
      `  the version every plain \`npm install\` resolves to.\n\n` +
      manifests.map((m) => `    ${m.name.padEnd(30)} ${m.version}`).join('\n') +
      `\n\n  If that is genuinely the intent, re-run with --allow-latest.`,
  )
}

console.log(`\nPublishing under dist-tag: ${tag}${dryRun ? '  (dry run)' : ''}\n`)
for (const m of manifests) console.log(`    ${m.name.padEnd(30)} ${m.version}`)
console.log()

if (dryRun) {
  console.log('Dry run — nothing published.\n')
  process.exit(0)
}

for (const m of manifests) {
  console.log(`→ ${m.name}`)
  execFileSync('pnpm', ['--filter', m.name, 'publish', '--tag', tag, '--access', 'public', '--no-git-checks'], {
    stdio: 'inherit',
    cwd: root,
  })
}

console.log(`\n✔ Published ${manifests.length} packages under "${tag}".`)
console.log(`  Verify: ${manifests.map((m) => `npm dist-tag ls ${m.name}`).join(' && ')}\n`)
