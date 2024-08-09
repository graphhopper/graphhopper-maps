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
    query: POIQuery
    icon: string
    poi: string
    static TRIGGER_VALUES: PoiTriggerPhrases[]
    static REMOVE_VALUES: string[]

    constructor(location: string, query: POIQuery, icon: string, poi: string) {
        this.location = location
        this.query = query
        this.icon = icon
        this.poi = poi
    }

    hasPOIs(): boolean {
        return this.query.queries.length > 0
    }

    text(prefix: string) {
        return this.location ? tr('poi_in', [prefix, this.location]) : tr('poi_nearby', [prefix])
    }

    /* it is a bit ugly that we have to inject the translated values here, but jest goes crazy otherwise */
    static parse(query: string, incomplete: boolean): AddressParseResult {
        query = query.toLowerCase()

        const smallWords = AddressParseResult.REMOVE_VALUES // e.g. 'restaurants in this area' or 'restaurants in berlin'
        const queryTokens: string[] = query.split(' ').filter(token => !smallWords.includes(token))
        const res = AddressParseResult.getGeneric(queryTokens)
        if (res.hasPOIs()) return res

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

        return new AddressParseResult('', new POIQuery([]), '', '')
    }

    public static getGeneric(tokens: string[]) {
        const locations = []
        const orPhrases = []
        const notPhrases = []
        const singleAndQuery = new POIQuery([new POIAndQuery([])])
        const singleAnd = tokens.includes('and')
        for (const token of tokens) {
            const indexNot = token.indexOf('!')
            const index = token.indexOf('=')
            if (indexNot >= 0) {
                const sign = token.includes('~') ? '!~' : '!='
                const p = new POIPhrase(token.substring(0, indexNot), sign, token.substring(indexNot + 2))
                singleAndQuery.queries[0].phrases.push(p)
                notPhrases.push(p)
            } else if (index >= 0) {
                const p = new POIPhrase(token.substring(0, index), '=', token.substring(index + 1))
                singleAndQuery.queries[0].phrases.push(p)
                orPhrases.push(p)
            } else if (token == 'and') {
            } else {
                locations.push(token)
            }
        }

        if (singleAnd)
            return new AddressParseResult(locations.join(' '), singleAndQuery, 'store', singleAndQuery.toString())

        const queries = []
        for (const p of orPhrases) {
            queries.push(new POIAndQuery([p, ...notPhrases]))
        }
        const poiQuery = new POIQuery(queries)
        return new AddressParseResult(locations.join(' '), poiQuery, 'store', poiQuery.toString())
    }

    public static handleGeocodingResponse(
        hits: ReverseGeocodingHit[],
        parseResult: AddressParseResult,
        queryPoint: QueryPoint
    ) {
        if (hits.length == 0) {
            Dispatcher.dispatch(new SetPOIs([], null))
            return
        }
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
                    query: parseResult.query,
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
            { k: 'poi_airports', q: ['aeroway=aerodrome and landuse!=military and military!~.*'], i: 'flight_takeoff' },
            { k: 'poi_atm', q: ['amenity=atm', 'amenity=bank'], i: 'local_atm' },
            { k: 'poi_banks', q: ['amenity=bank'], i: 'universal_currency_alt' },
            { k: 'poi_bus_stops', q: ['highway=bus_stop'], i: 'train' },
            { k: 'poi_education', q: ['amenity=school', 'building=school', 'building=university'], i: 'school' },
            { k: 'poi_gas_station', q: ['amenity=fuel'], i: 'local_gas_station' },
            { k: 'poi_hospitals', q: ['amenity=hospital', 'building=hospital'], i: 'local_hospital' },
            { k: 'poi_hotels', q: ['amenity=hotel', 'building=hotel', 'tourism=hotel'], i: 'hotel' },
            { k: 'poi_leisure', q: ['leisure=*'], i: 'sports_handball' },
            { k: 'poi_museums', q: ['tourism=museum', 'building=museum'], i: 'museum' },
            { k: 'poi_parking', q: ['amenity=parking'], i: 'local_parking' },
            { k: 'poi_parks', q: ['leisure=park'], i: 'sports_handball' },
            { k: 'poi_pharmacies', q: ['amenity=pharmacy'], i: 'local_pharmacy' },
            { k: 'poi_playgrounds', q: ['leisure=playground'], i: 'sports_handball' },
            { k: 'poi_police', q: ['amenity=police'], i: 'police' },
            // important to have this before "post"
            {
                k: 'poi_post_box',
                q: ['amenity=post_box', 'amenity=post_office', 'amenity=post_depot'],
                i: 'local_post_office',
            },
            { k: 'poi_post', q: ['amenity=post_office', 'amenity=post_depot'], i: 'local_post_office' },
            {
                k: 'poi_public_transit',
                q: ['public_transport=station', 'railway=station', 'highway=bus_stop'],
                i: 'train',
            },
            { k: 'poi_railway_station', q: ['railway=station', 'railway=halt'], i: 'train' },
            { k: 'poi_restaurants', q: ['amenity=restaurant'], i: 'restaurant' },
            { k: 'poi_schools', q: ['amenity=school', 'building=school'], i: 'school' },
            { k: 'poi_shopping', q: ['shop=*'], i: 'store' },
            { k: 'poi_super_markets', q: ['shop=supermarket', 'building=supermarket'], i: 'store' },
            { k: 'poi_toilets', q: ['amenity=toilets'], i: 'home_and_garden' },
            { k: 'poi_tourism', q: ['tourism=*'], i: 'luggage' },
            { k: 'poi_water', q: ['amenity=drinking_water'], i: 'water_drop' },
            { k: 'poi_charging_station', q: ['amenity=charging_station'], i: 'charger' },
        ].map(v => {
            const queries = v.q.map(val => {
                return new POIAndQuery(
                    val.split(' and ').map(v => {
                        let kv = v.split('!=')
                        if (kv.length > 1) return new POIPhrase(kv[0], '!=', kv[1])
                        kv = v.split('!~')
                        if (kv.length > 1) return new POIPhrase(kv[0], '!~', kv[1])
                        kv = v.split('=')
                        return new POIPhrase(kv[0], '=', kv[1])
                    })
                )
            })
            return {
                k: t(v.k),
                q: new POIQuery(queries),
                i: v.i,
            } as PoiTriggerPhrases
        })
    }
}

export class POIQuery {
    public queries: POIAndQuery[]

    constructor(queries: POIAndQuery[]) {
        this.queries = queries
    }

    toString(): string {
        return this.queries.join(' ')
    }
}

export class POIAndQuery {
    public phrases: POIPhrase[]

    constructor(phrases: POIPhrase[]) {
        this.phrases = phrases
    }

    toString(): string {
        return this.phrases
            .map(p => p.toString())
            .join(' and ')
            .trim()
    }
}

export class POIPhrase {
    public k: string
    public sign: string
    public v: string

    constructor(k: string, sign: string, v: string) {
        this.k = k
        this.sign = sign
        this.v = v
    }

    toString(): string {
        return this.k + this.sign + this.v
    }
}

export type PoiTriggerPhrases = { k: string[]; q: POIQuery; i: string }