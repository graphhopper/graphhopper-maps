import { setTranslation } from '../src/translation/Translation'

describe('translate', () => {
    it('should translate', () => {
        const tr = setTranslation('de', true)
        expect(tr.get('unknownKEY')).toEqual('unknownKEY')
        expect(tr.get('racingbike')).toEqual('Rennrad')
        expect(tr.get('route_info', ['27km', '18min'])).toEqual('27km werden 18min brauchen')
    })

    it('should translate if language and locale is known', () => {
        const tr = setTranslation('de-DE', true)
        expect(tr.get('racingbike')).toEqual('Rennrad')
    })

    it('should translate if only language is known', () => {
        const tr = setTranslation('de-XX', true)
        expect(tr.get('racingbike')).toEqual('Rennrad')
    })

    it('should fallback', () => {
        const trFI = setTranslation('fi', true)
        expect(trFI.get('drag_to_reorder')).toEqual('Drag to reorder')

        // empty string
        const trBN = setTranslation('bn_BN', true)
        expect(trBN.get('search_button')).toEqual('Search')
    })
})
