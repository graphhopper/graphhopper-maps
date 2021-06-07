import { setTranslation } from '../src/translation/Translation'

describe('translate', () => {
    it('should translate', () => {
        const tr = setTranslation('de', true)
        expect(tr.get('unknownKEY')).toEqual('unknownKEY')
        expect(tr.get('racingbike')).toEqual('Rennrad')
        expect(tr.get('route_info', ['27km', '18min'])).toEqual('27km werden 18min brauchen')
    })

    it('should fallback', () => {
        const tr = setTranslation('fi', true)
        expect(tr.get('drag_to_reorder')).toEqual('Drag to reorder')
    })
})
