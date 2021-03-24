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
