/**
 * Calculates "nice" tick values for chart axes.
 * Returns evenly spaced round numbers between min and max.
 */
export function calculateNiceTicks(min: number, max: number, maxTicks: number): number[] {
    if (max <= min || maxTicks < 2) return [min]

    const range = max - min
    const roughStep = range / (maxTicks - 1)

    // Find a "nice" step size: 1, 2, 5, 10, 20, 50, 100, ...
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
    const residual = roughStep / magnitude

    let niceStep: number
    if (residual <= 1.5) niceStep = magnitude
    else if (residual <= 3.5) niceStep = 2 * magnitude
    else if (residual <= 7.5) niceStep = 5 * magnitude
    else niceStep = 10 * magnitude

    const niceMin = Math.floor(min / niceStep) * niceStep
    const niceMax = Math.ceil(max / niceStep) * niceStep

    const ticks: number[] = []
    for (let v = niceMin; v <= niceMax + niceStep * 0.5; v += niceStep) {
        ticks.push(Math.round(v * 1e10) / 1e10) // avoid floating point artifacts
    }
    return ticks
}

/**
 * Format a distance value for the x-axis label.
 */
export function formatDistanceLabel(meters: number, showMiles: boolean): string {
    if (showMiles) {
        const miles = meters / 1609.34
        if (miles < 0.1) {
            const feet = Math.round(meters / 0.3048)
            return `${feet} ft`
        }
        return `${formatNumber(miles)} mi`
    } else {
        if (meters < 1000) return `${Math.round(meters)} m`
        return `${formatNumber(meters / 1000)} km`
    }
}

/**
 * Format an elevation value for the y-axis label.
 */
export function formatElevationLabel(meters: number, showMiles: boolean): string {
    if (showMiles) {
        return `${Math.round(meters / 0.3048)} ft`
    }
    return `${Math.round(meters)} m`
}

function formatNumber(n: number): string {
    if (n >= 100) return Math.round(n).toString()
    if (n >= 10) return (Math.round(n * 10) / 10).toString()
    return (Math.round(n * 100) / 100).toString()
}
