import { GeocodingHit } from '@/api/graphhopper'

import { Coordinate } from '@/stores/QueryStore'

export function milliSecondsToText(seconds: number) {
    const hours = Math.floor(seconds / 3600000)
    const minutes = Math.floor((seconds % 3600000) / 60000)

    const hourText = hours > 0 ? hours + ' h' : ''
    return hourText + ' ' + minutes + ' min'
}

const distanceFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

export function metersToText(meters: number) {
    if (meters < 1000) return Math.floor(meters) + ' m'
    return distanceFormat.format(meters / 1000) + ' km'
}

export function convertToQueryText(hit: GeocodingHit) {
    let result = convertToName(hit, ', ')
    result += convertToStreet(hit, ', ')
    result += convertToCity(hit, ', ')
    result += convertToCountry(hit)

    return result
}

function convertToName(hit: GeocodingHit, appendix: string) {
    return hit.name === hit.street ? '' : hit.name + appendix
}

function convertToStreet(hit: GeocodingHit, appendix: string) {
    if (hit.housenumber && hit.street) return hit.street + ' ' + hit.housenumber + appendix
    if (hit.street) return hit.street + appendix
    return ''
}

function convertToCity(hit: GeocodingHit, appendix: string) {
    if (hit.city && hit.postcode) return hit.postcode + ' ' + hit.city + appendix
    if (hit.city) return hit.city + appendix
    if (hit.postcode) return hit.postcode + appendix
    return ''
}

function convertToCountry(hit: GeocodingHit) {
    return hit.country ? hit.country : ''
}

export function coordinateToText(coord: Coordinate): string {
    return Math.round(coord.lat * 1e6) / 1e6 + ',' + Math.round(coord.lng * 1e6) / 1e6
}
