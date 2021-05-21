import fetchMock from 'jest-fetch-mock'

import { setTranslation } from '../src/translation/Translation'
import { ApiImpl } from '../src/api/Api'

beforeAll(fetchMock.enableMocks)
beforeEach(() => fetchMock.mockClear())
afterAll(() => fetchMock.disableMocks())

fetchMock.mockResponse(request => {
    expect(request.method).toEqual('GET')
    expect(request.headers.get('Accept')).toEqual('application/json')
    return Promise.resolve(
        JSON.stringify({
            locale: 'de',
            en: {
                fallback: 'fall back English'
            },
            default: {
                'web.racingbike': 'Rennrad',
                'web.route_info': '%1$s werden %2$s brauchen'
            }
        })
    )
})

describe('translate', () => {
    it('should translate', () => {
        new ApiImpl().i18n().then(tr => {
            setTranslation(tr)

            expect(tr.tr('unknownKEY')).toEqual('unknownKEY')
            expect(tr.tr('web.racingbike')).toEqual('Rennrad')
            expect(tr.tr('fallback')).toEqual('fall back English')
            expect(tr.tr('web.route_info', ['27km', '18min'])).toEqual('27km werden 18min brauchen')
        })
    })
})
