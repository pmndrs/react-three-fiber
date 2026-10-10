import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index.ts'],
  outDir: 'dist',
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
    // The default export is the plugin for flat configs; `rules` and `configs` are also named
    // exports, so `require()` (eslintrc on ESLint 8) still finds them on the module itself.
    output: { exports: 'named' },
    esbuild: {
      target: 'es2020',
    },
  },
  externals: ['eslint'],
  hooks: {
    // The CJS declarations are written as `export = plugin`, but the CJS build sets
    // `exports.default` alongside the named exports (`__esModule` interop). Describe what it
    // actually exports, the same way the ESM declarations do.
    async 'build:done'(ctx) {
      // A stub build re-exports the sources and writes no bundled declarations
      if (ctx.options.stub) return
      for (const file of ['index.d.cts', 'index.d.ts']) {
        const path = join(ctx.options.outDir, file)
        const source = await readFile(path, 'utf8')
        const fixed = source.replace(
          /\/\/ @ts-ignore\nexport = (\w+);\nexport \{ (.*) \};/,
          (_, name: string, named: string) => `export { ${named}, ${name} as default };`,
        )
        if (fixed === source) throw new Error(`build: expected an \`export =\` declaration in ${file}`)
        await writeFile(path, fixed)
      }
    },
  },
})
