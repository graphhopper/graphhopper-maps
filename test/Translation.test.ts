import { setTranslation } from '../src/translation/Translation'

describe('translate', () => {
    it('should translate', () => {
        const tr = setTranslation('de', true)
        expect(tr.tr('unknownKEY')).toEqual('unknownKEY')
        expect(tr.tr('racingbike')).toEqual('Rennrad')
        expect(tr.tr('route_info', ['27km', '18min'])).toEqual('27km werden 18min brauchen')
    })

    it('should fallback', () => {
        const tr = setTranslation('fi', true)
        expect(tr.tr('drag_to_reorder')).toEqual('Drag to reorder')
    })
})
