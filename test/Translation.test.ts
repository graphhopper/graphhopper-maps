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
        const trFI = setTranslation('fil', true)
        expect(trFI.get('drag_to_reorder')).toEqual('Drag to reorder')

        // empty string
        const trBN = setTranslation('bn_BN', true)
        expect(trBN.get('truck')).toEqual('Truck')
    })

    it('finland', () => {
        let trFI = setTranslation('fi', true)
        expect(trFI.get('car')).toEqual('Auto')

        trFI = setTranslation('fi-fi', true)
        expect(trFI.get('car')).toEqual('Auto')

        trFI = setTranslation('Fi-fi', true)
        expect(trFI.get('car')).toEqual('Auto')
    })
})
