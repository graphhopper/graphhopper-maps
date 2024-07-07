import { ApiImpl } from '@/api/Api'
import Dispatcher from '@/stores/Dispatcher'
import { SetBBox, SetPOIs } from '@/actions/Actions'
import { hitToItem } from '@/Converters'
import { GeocodingHit, ReverseGeocodingHit } from '@/api/graphhopper'
import { QueryPoint } from '@/stores/QueryStore'
import { tr, Translation } from '@/translation/Translation'
import { POI } from '@/stores/POIsStore'

export class AddressParseResult {
    location: string
    queries: POIQuery[]
    icon: string
    poi: string
    static TRIGGER_VALUES: PoiTriggerPhrases[]
    static REMOVE_VALUES: string[]

    constructor(location: string, queries: POIQuery[], icon: string, poi: string) {
        this.location = location
        this.queries = queries
        this.icon = icon
        this.poi = poi
    }

    hasPOIs(): boolean {
        return this.queries.length > 0
    }

    text(prefix: string) {
        return this.location ? tr('poi_in', [prefix, this.location]) : tr('poi_nearby', [prefix])
    }

    /* it is a bit ugly that we have to inject the translated values here, but jest goes crazy otherwise */
    static parse(query: string, incomplete: boolean): AddressParseResult {
        query = query.toLowerCase()

        const smallWords = AddressParseResult.REMOVE_VALUES // e.g. 'restaurants in this area' or 'restaurants in berlin'
        const queryTokens: string[] = query.split(' ').filter(token => !smallWords.includes(token))
        const cleanQuery = queryTokens.join(' ')
        const bigrams: string[] = []
        for (let i = 0; i < queryTokens.length - 1; i++) {
            bigrams.push(queryTokens[i] + ' ' + queryTokens[i + 1])
        }

        for (const val of AddressParseResult.TRIGGER_VALUES) {
            // two word phrases like 'public transit' must be checked before single word phrases
            for (const keyword of val.k) {
                const i = bigrams.indexOf(keyword)
                if (i >= 0)
                    return new AddressParseResult(cleanQuery.replace(bigrams[i], '').trim(), val.q, val.i, val.k[0])
            }

            for (const keyword of val.k) {
                const i = queryTokens.indexOf(keyword)
                if (i >= 0)
                    return new AddressParseResult(cleanQuery.replace(queryTokens[i], '').trim(), val.q, val.i, val.k[0])
            }
        }

        return new AddressParseResult('', [], '', '')
    }

    public static handleGeocodingResponse(
        hits: ReverseGeocodingHit[],
        parseResult: AddressParseResult,
        queryPoint: QueryPoint
    ) {
        if (hits.length == 0) return
        const pois = hits
            .filter(hit => !!hit.point)
            .map(hit => {
                const res = hitToItem({
                    name: hit.tags.name ? hit.tags.name : '',
                    country: hit.tags['addr:country'],
                    city: hit.tags['addr:city'],
                    state: hit.tags['addr:state'],
                    street: hit.tags['addr:street'],
                    housenumber: hit.tags['addr:housenumer'],
                    postcode: hit.tags['addr:postcode'],
                } as GeocodingHit)
                return {
                    name: res.mainText,
                    osm_id: '' + hit.id,
                    osm_type: hit.type,
                    queries: parseResult.queries,
                    tags: hit.tags,
                    icon: parseResult.icon,
                    coordinate: hit.point,
                    address: res.secondText,
                } as POI
            })
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

    // because of the static method we need to inject the Translation object as otherwise jest has a problem
    static setPOITriggerPhrases(translation: Translation) {
        const t = (s: string) =>
            translation
                .get(s)
                .split(',')
                .map(s => s.trim().toLowerCase())
        AddressParseResult.REMOVE_VALUES = t('poi_removal_words')
        AddressParseResult.TRIGGER_VALUES = [
            { k: 'poi_airports', t: ['aeroway:aerodrome'], i: 'flight_takeoff' }, // TODO exclude landuse = military AND military = airfield
            { k: 'poi_atm', t: ['amenity:atm', 'amenity:bank'], i: 'local_atm' },
            { k: 'poi_banks', t: ['amenity:bank'], i: 'universal_currency_alt' },
            { k: 'poi_bus_stops', t: ['highway:bus_stop'], i: 'train' },
            { k: 'poi_education', t: ['amenity:school', 'building:school', 'building:university'], i: 'school' },
            { k: 'poi_gas_station', t: ['amenity:fuel'], i: 'local_gas_station' },
            { k: 'poi_hospitals', t: ['amenity:hospital', 'building:hospital'], i: 'local_hospital' },
            { k: 'poi_hotels', t: ['amenity:hotel', 'building:hotel', 'tourism:hotel'], i: 'hotel' },
            { k: 'poi_leisure', t: ['leisure'], i: 'sports_handball' },
            { k: 'poi_museums', t: ['tourism:museum', 'building:museum'], i: 'museum' },
            { k: 'poi_parking', t: ['amenity:parking'], i: 'local_parking' },
            { k: 'poi_parks', t: ['leisure:park'], i: 'sports_handball' },
            { k: 'poi_pharmacies', t: ['amenity:pharmacy'], i: 'local_pharmacy' },
            { k: 'poi_playgrounds', t: ['leisure:playground'], i: 'sports_handball' },
            { k: 'poi_police', t: ['amenity:police '], i: 'police' },
            // important to have this before "post"
            {
                k: 'poi_post_box',
                t: ['amenity:post_box', 'amenity:post_office', 'amenity:post_depot'],
                i: 'local_post_office',
            },
            { k: 'poi_post', t: ['amenity:post_office', 'amenity:post_depot'], i: 'local_post_office' },
            { k: 'poi_public_transit', t: ['public_transport:station', 'railway:station', 'highway:bus_stop'], i: 'train' },
            { k: 'poi_railway_station', t: ['railway:station', 'railway:halt'], i: 'train' },
            { k: 'poi_restaurants', t: ['amenity:restaurant'], i: 'restaurant' },
            { k: 'poi_schools', t: ['amenity:school', 'building:school'], i: 'school' },
            { k: 'poi_shopping', t: ['shop'], i: 'store' },
            { k: 'poi_super_markets', t: ['shop:supermarket', 'building:supermarket'], i: 'store' },
            { k: 'poi_toilets', t: ['amenity:toilets'], i: 'home_and_garden' },
            { k: 'poi_tourism', t: ['tourism'], i: 'luggage' },
            { k: 'poi_water', t: ['amenity:drinking_water '], i: 'water_drop' },
            { k: 'poi_charging_station', t: ['amenity:charging_station'], i: 'charger' },
        ].map(v => {
            const tags = v.t.map(val => {
                return { k: val.split(':')[0], v: val.split(':')[1] }
            })
            return {
                k: t(v.k),
                q: tags,
                i: v.i,
            }
        })
    }
}

export type POIQuery = { k: string; v: string }
export type PoiTriggerPhrases = { k: string[]; q: POIQuery[]; i: string }
