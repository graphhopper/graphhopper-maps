import { ApiImpl } from '@/api/Api'
import Dispatcher from '@/stores/Dispatcher'
import { SetBBox, SetPOIs } from '@/actions/Actions'
import { hitToItem } from '@/Converters'
import { GeocodingHit } from '@/api/graphhopper'
import { QueryPoint } from '@/stores/QueryStore'
import { tr, Translation } from '@/translation/Translation'

export class AddressParseResult {
    location: string
    tags: string[]
    icon: string
    poi: string
    static VALUES: PoiTriggerPhrases[]

    constructor(location: string, tags: string[], icon: string, poi: string) {
        this.location = location
        this.tags = tags
        this.icon = icon
        this.poi = poi
    }

    hasPOIs(): boolean {
        return this.tags.length > 0
    }

    text(prefix: string) {
        return prefix + ' ' + (this.location ? tr('in') + ' ' + this.location : tr('nearby'))
    }

    /* it is a bit ugly that we have to inject the translated values here, but jest goes crazy otherwise */
    static parse(query: string, incomplete: boolean): AddressParseResult {
        query = query.toLowerCase()

        const smallWords = ['in', 'around', 'nearby']
        const queryTokens: string[] = query.split(' ').filter(token => !smallWords.includes(token))
        const cleanQuery = queryTokens.join(' ')
        const bigrams: string[] = []
        for (let i = 0; i < queryTokens.length - 1; i++) {
            bigrams.push(queryTokens[i] + ' ' + queryTokens[i + 1])
        }

        for (const val of AddressParseResult.VALUES) {
            // two word phrases like 'public transit' must be checked before single word phrases
            for (const keyword of val.k) {
                const i = bigrams.indexOf(keyword)
                if (i >= 0)
                    return new AddressParseResult(cleanQuery.replace(bigrams[i], '').trim(), val.t, val.i, val.k[0])
            }

            for (const keyword of val.k) {
                const i = queryTokens.indexOf(keyword)
                if (i >= 0)
                    return new AddressParseResult(cleanQuery.replace(queryTokens[i], '').trim(), val.t, val.i, val.k[0])
            }
        }

        return new AddressParseResult('', [], '', '')
    }

    public static handleGeocodingResponse(
        hits: GeocodingHit[],
        parseResult: AddressParseResult,
        queryPoint: QueryPoint
    ) {
        if (hits.length == 0) return
        const pois = AddressParseResult.map(hits, parseResult)
        const bbox = ApiImpl.getBBoxPoints(pois.map(p => p.coordinate))
        if (bbox) {
            if (parseResult.location) Dispatcher.dispatch(new SetBBox(bbox))
            Dispatcher.dispatch(new SetPOIs(pois, queryPoint))
        } else {
            console.warn(
                'invalid bbox for points ' + JSON.stringify(pois) + ' result was: ' + JSON.stringify(parseResult)
            )
        }
    }

    static map(hits: GeocodingHit[], parseResult: AddressParseResult) {
        return hits.map(hit => {
            const res = hitToItem(hit)
            return {
                name: res.mainText,
                icon: parseResult.icon,
                coordinate: hit.point,
                address: res.secondText,
            }
        })
    }

    static s(s: string) {
        return
    }

    // because of the static method we need to inject the Translation object as otherwise jest has a problem
    static setPOITriggerPhrases(translation: Translation) {
        const t = (s: string) =>
            translation
                .get(s)
                .split(',')
                .map(s => s.trim().toLowerCase())
        AddressParseResult.VALUES = [
            { k: t('poi_airports'), t: ['aeroway:aerodrome'], i: 'flight_takeoff' },
            { k: t('poi_banks'), t: ['amenity:bank'], i: 'universal_currency_alt' },
            { k: t('poi_bus_stops'), t: ['highway:bus_stop'], i: 'train' },
            { k: t('poi_education'), t: ['amenity:school', 'building:school', 'building:university'], i: 'school' },
            { k: t('poi_hospitals'), t: ['amenity:hospital', 'building:hospital'], i: 'local_hospital' },
            { k: t('poi_hotels'), t: ['amenity:hotel', 'building:hotel', 'tourism:hotel'], i: 'hotel' },
            { k: t('poi_leisure'), t: ['leisure'], i: 'sports_handball' },
            { k: t('poi_museums'), t: ['tourism:museum', 'building:museum'], i: 'museum' },
            { k: t('poi_parking'), t: ['amenity:parking'], i: 'local_parking' },
            { k: t('poi_parks'), t: ['leisure:park'], i: 'sports_handball' },
            { k: t('poi_pharmacies'), t: ['amenity:pharmacy'], i: 'local_pharmacy' },
            { k: t('poi_playgrounds'), t: ['leisure:playground'], i: 'sports_handball' },
            { k: t('poi_public_transit'), t: ['railway:station', 'highway:bus_stop'], i: 'train' },
            { k: t('poi_railway_station'), t: ['railway:station'], i: 'train' },
            { k: t('poi_restaurants'), t: ['amenity:restaurant'], i: 'restaurant' },
            { k: t('poi_schools'), t: ['amenity:school', 'building:school'], i: 'school' },
            { k: t('poi_super_markets'), t: ['shop:supermarket', 'building:supermarket'], i: 'store' },
            { k: t('poi_tourism'), t: ['tourism'], i: 'luggage' },
        ]
    }
}

export type PoiTriggerPhrases = { k: string[]; t: string[]; i: string }
