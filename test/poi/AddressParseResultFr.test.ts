import { AddressParseResult } from '@/pois/AddressParseResult'
import { Translation } from '@/translation/Translation'
import trJson from '@/translation/tr.json'

beforeAll(() => {
    const fr = {
        poi_removal_words: 'autour, dans, ici, lieu, local, proche',
        poi_hotels: 'hôtels, hôtel, hotel',
        poi_townhall: 'mairie, hotel de ville',
        poi_post: 'poste, bureau de poste',
        poi_post_box: 'boîte aux lettres',
    }
    AddressParseResult.setPOITriggerPhrases(new Translation('fr', fr, trJson['en_US']))
})

describe('reverse geocoder french', () => {
    it('should prefer longer phrases', async () => {
        let res = AddressParseResult.parse('hotel de ville lille', false)
        expect(res.location).toEqual('lille')
        expect(res.poiType).toEqual('mairie')

        res = AddressParseResult.parse('hotel lille', false)
        expect(res.location).toEqual('lille')
        expect(res.poiType).toEqual('hôtels')

        res = AddressParseResult.parse('boîte aux lettres dans lyon', false)
        expect(res.location).toEqual('lyon')
        expect(res.poiType).toEqual('boîte aux lettres')

        res = AddressParseResult.parse('bureau de poste paris', false)
        expect(res.location).toEqual('paris')
        expect(res.poiType).toEqual('poste')
    })
})
