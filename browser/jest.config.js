module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: 'src',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
    },
    collectCoverageFrom: [
        '**/*.(t|j)s',
    ],
    coverageDirectory: '../coverage',
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
}; 