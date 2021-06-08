import { setTranslation } from '../src/translation/Translation'

describe('translate', () => {
    it('should translate', () => {
        const tr = setTranslation('de', true)
        expect(tr.get('unknownKEY')).toEqual('unknownKEY')
        expect(tr.get('racingbike')).toEqual('Rennrad')
        expect(tr.get('route_info', ['27km', '18min'])).toEqual('27km werden 18min brauchen')

        const tr2 = setTranslation('de-DE', true)
        expect(tr2.get('racingbike')).toEqual('Rennrad')
    })

    it('should fallback', () => {
        const trFI = setTranslation('fi', true)
        expect(trFI.get('drag_to_reorder')).toEqual('Drag to reorder')

        // empty string
        const trBN = setTranslation('bn_BN', true)
        expect(trBN.get('search_button')).toEqual('Search')
    })
})
