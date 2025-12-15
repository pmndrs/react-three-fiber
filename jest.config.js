module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: {
    //* R3F Entry Points ==============================
    // Map package imports to source for testing
    '^@react-three/fiber$': '<rootDir>/packages/fiber/src/index.tsx',
    '^@react-three/fiber/legacy$': '<rootDir>/packages/fiber/src/legacy.tsx',
    '^@react-three/fiber/webgpu$': '<rootDir>/packages/fiber/src/webgpu/index.tsx',

    //* Internal R3F Aliases ==============================
    // For preconstruct dev mode and direct source testing
    '^#three$': '<rootDir>/packages/fiber/src/three/index.ts',
    '^#three/(.*)$': '<rootDir>/packages/fiber/src/three/$1.ts',
    '^#types$': '<rootDir>/packages/fiber/types/index.ts',

    //* Three.js Mappings ==============================
    // Note: three/webgpu is ESM-only, gets transformed by babel-jest
    // Known issue: multiple Three.js instances warning due to webgpu/cjs split
    '^three$': '<rootDir>/node_modules/three/build/three.cjs',
    '^three/webgpu$': '<rootDir>/node_modules/three/build/three.webgpu.js',
    '^three/tsl$': '<rootDir>/node_modules/three/build/three.tsl.js',
    '^three/addons/(.*)$': '<rootDir>/node_modules/three/examples/jsm/$1',
  },
  // Transform three's ESM files to CJS
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    // Match three's ESM files on both Windows and Unix - use modules: 'commonjs' to convert ESM
    'node_modules[\\\\/]three[\\\\/].+\\.js$': [
      'babel-jest',
      {
        presets: [['@babel/preset-env', { modules: 'commonjs' }]],
      },
    ],
  },
  // Allow transforming three (override default ignore) - works on both Windows and Unix
  transformIgnorePatterns: ['node_modules[\\\\/](?!(three)[\\\\/])'],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/packages/fiber/dist',
    '<rootDir>/packages/fiber/src/index',
    '<rootDir>/packages/test-renderer/dist',
  ],
  coverageDirectory: './coverage/',
  collectCoverage: false,
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  verbose: false,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/packages/fiber/tests/setupTests.ts'],
}
