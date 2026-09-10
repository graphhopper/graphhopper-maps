module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    globals: {
        GIT_SHA: 'test',
    },
    moduleNameMapper: {
        '@/(.*)$': '<rootDir>/src/$1',
        config: '<rootDir>/config.js',
    },
}
