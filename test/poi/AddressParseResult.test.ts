import { AddressParseResult } from '@/pois/AddressParseResult'
import fetchMock from 'jest-fetch-mock'
import { getTranslation, setTranslation } from '@/translation/Translation'

beforeAll(() => {
    setTranslation('en', false)
    AddressParseResult.setPOITriggerPhrases(getTranslation())
})

describe('reverse geocoder', () => {
    it('should parse fully', async () => {
        let res = AddressParseResult.parse('dresden restaurant', false)
        expect(res.location).toEqual('dresden')
        expect(res.icon).toEqual('restaurant')

        res = AddressParseResult.parse('restaurant', false)
        expect(res.location).toEqual('')
        expect(res.icon).toEqual('restaurant')

        res = AddressParseResult.parse('restaurant in dresden', false)
        expect(res.location).toEqual('dresden')
        expect(res.icon).toEqual('restaurant')

        res = AddressParseResult.parse('airports around some thing else', false)
        expect(res.location).toEqual('some thing else')
        expect(res.icon).toEqual('flight_takeoff')

        res = AddressParseResult.parse('dresden super market', false)
        expect(res.location).toEqual('dresden')
        expect(res.poi).toEqual('super markets')

        res = AddressParseResult.parse('dresden park', false)
        expect(res.location).toEqual('dresden')
        expect(res.poi).toEqual('parks')

        res = AddressParseResult.parse('dresden parking', false)
        expect(res.location).toEqual('dresden')
        expect(res.poi).toEqual('parking')

        res = AddressParseResult.parse('restaurants in this area', false)
        expect(res.location).toEqual('')
        expect(res.poi).toEqual('restaurants')
    })
})
