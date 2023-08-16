module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    globals: {
        SOURCE_VERSION: '0.0.test',
    },
    moduleNameMapper: {
        '@/(.*)$': '<rootDir>/src/$1',
        config: '<rootDir>/config.js',
    },
}
