module.exports = {
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          // Note: #three is handled by the rollup plugin in preconstruct.config.js during build
          // This fallback is for preconstruct dev mode and Jest testing
          '#three': './packages/fiber/src/three/index.ts',
          '#three/legacy': './packages/fiber/src/three/legacy.ts',
          '#three/webgpu': './packages/fiber/src/three/webgpu.ts',
          '#three/tsl': './packages/fiber/src/three/tsl.ts',
          '#types': './packages/fiber/types/index.ts',
        },
      },
    ],
  ],
  presets: [
    [
      '@babel/preset-env',
      {
        include: [
          '@babel/plugin-proposal-class-properties',
          '@babel/plugin-proposal-optional-chaining',
          '@babel/plugin-proposal-nullish-coalescing-operator',
          '@babel/plugin-proposal-numeric-separator',
          '@babel/plugin-proposal-logical-assignment-operators',
        ],
        bugfixes: true,
        loose: true,
        modules: false,
        targets: '> 1%, not dead, not ie 11, not op_mini all',
      },
    ],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
}
