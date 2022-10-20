import { GeocodingHit } from '@/api/graphhopper'

import { Coordinate } from '@/stores/QueryStore'

export function milliSecondsToText(seconds: number) {
    const hours = Math.floor(seconds / 3600000)
    const minutes = Math.floor((seconds % 3600000) / 60000)

    const hourText = hours > 0 ? hours + ' h' : ''
    if (minutes == 0 && hourText.length > 0) return hourText
    return hourText + ' ' + minutes + ' min'
}

const distanceFormat = new Intl.NumberFormat(navigator.language, { maximumFractionDigits: 1 })

export function metersToText(meters: number, showDistanceInMiles: boolean, forceSmallUnits: boolean = false) {
    if (showDistanceInMiles) {
        if (meters < 160.934 || forceSmallUnits) return Math.floor(meters / 0.3048) + ' ft'
        return distanceFormat.format(meters / 1609.34) + ' mi'
    } else {
        if (meters < 1000 || forceSmallUnits) return Math.floor(meters) + ' m'
        return distanceFormat.format(meters / 1000) + ' km'
    }
}

export function hitToItem(hit: GeocodingHit) {
    const mainText =
        hit.street && hit.name.indexOf(hit.street) >= 0
            ? hit.street + (hit.housenumber ? ' ' + hit.housenumber : '')
            : hit.name
    return {
        mainText: mainText,
        secondText: toSecondText(hit, mainText),
    }
}

function toSecondText(hit: GeocodingHit, mainText: string) {
    let result =
        hit.street && mainText.indexOf(hit.street) < 0
            ? hit.street + (hit.housenumber ? ' ' + hit.housenumber : '') + ', '
            : ''
    result += toCity(hit)
    if (hit.country) result += (result ? ', ' : '') + hit.country
    return result
}

function toCity(hit: GeocodingHit) {
    if (hit.city && hit.postcode) return hit.postcode + ' ' + hit.city
    if (hit.city) return hit.city
    if (hit.postcode) return hit.postcode
    return ''
}

export function nominatimHitToItem(hit: GeocodingHit) {
    const name = hit.name ? hit.name : hit.country
    const street = hit.street ? hit.street + (hit.housenumber ? ' ' + hit.housenumber : '') : ''
    const mainText = hit.street && name.indexOf(hit.street) == 0 ? street : name.split(',')[0]
    return {
        mainText: mainText,
        secondText:
            (mainText.indexOf(street) >= 0 ? '' : street.length > 0 ? street + ', ' : '') +
            (mainText.indexOf(hit.postcode) >= 0 ? '' : hit.postcode ? hit.postcode + ' ' : '') +
            (mainText.indexOf(hit.city) >= 0 ? '' : hit.city ? hit.city + ', ' : '') +
            hit.country,
    }
}

export function coordinateToText(coord: Coordinate): string {
    return Math.round(coord.lat * 1e6) / 1e6 + ',' + Math.round(coord.lng * 1e6) / 1e6
}

export function textToCoordinate(text: string): Coordinate | null {
    // this splits the string at ',' or ' '. The filter filters out empty results
    // in case something like 1.0, 2.0 was supplied.
    const split = text.split(/[,| s]/).filter(s => s)

    if (split.length !== 2) return null

    const result = {
        lat: Number.parseFloat(split[0]),
        lng: Number.parseFloat(split[1]),
    }

    return isNaN(result.lng) || isNaN(result.lat) ? null : result
}
