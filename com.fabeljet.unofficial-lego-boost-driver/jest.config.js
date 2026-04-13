export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { 
      useESM: false,
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true,
      }
    }]
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/test/**/*.test.ts'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  clearMocks: true
};
