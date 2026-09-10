module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    globals: {
        __GH_CLIENT__: 'maps-test',
    },
    moduleNameMapper: {
        '@/(.*)$': '<rootDir>/src/$1',
        config: '<rootDir>/config.js',
    },
}
