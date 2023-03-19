module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    moduleNameMapper: {
        '@/(.*)$': '<rootDir>/src/$1',
        config: '<rootDir>/config.js',
    },
    transform: {
        "^.+\\.js?$": "ts-jest"
    },
    transformIgnorePatterns: [ `<rootDir>/node_modules/(?!custom-model-editor/)` ]
}
