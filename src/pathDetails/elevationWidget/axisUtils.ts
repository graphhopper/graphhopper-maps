/**
 * Calculates "nice" tick values for chart axes.
 * Returns evenly spaced round numbers between min and max.
 */
export function calculateNiceTicks(min: number, max: number, maxTicks: number): number[] {
    if (max <= min || maxTicks < 2) return [min]

    const range = max - min
    const roughStep = range / (maxTicks - 1)

    // Find the smallest "nice" step (1, 2, 5 × 10^n) that keeps the tick count
    // within maxTicks. The niceMin/niceMax rounding can extend the range beyond
    // [min, max], so we verify the actual count rather than relying on roughStep alone.
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
    let niceStep = 10 * magnitude
    for (const m of [1, 2, 5, 10]) {
        const step = m * magnitude
        // Count only ticks that fall within [min, max] — ticks outside this range
        // are generated but filtered out during rendering, so they shouldn't count.
        const firstVisible = Math.ceil(min / step) * step
        const lastVisible = Math.floor(max / step) * step
        if (lastVisible >= firstVisible && Math.round((lastVisible - firstVisible) / step) + 1 <= maxTicks) {
            niceStep = step
            break
        }
    }

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

/**
 * Compute padded y-axis range for a detail line chart.
 * Adds 10% padding on each side and clamps min to 0 when all values are non-negative.
 */
export function computeDetailYRange(dataMin: number, dataMax: number): { min: number; max: number } {
    const range = dataMax - dataMin
    const pad = (range > 0 ? range : Math.abs(dataMax) || 1) * 0.1
    let min = dataMin - pad
    let max = dataMax + pad
    if (dataMin >= 0) min = Math.max(0, min)
    return { min, max }
}

/**
 * Format a detail y-axis tick value. Uses enough decimal places to avoid duplicate labels.
 */
export function formatDetailTick(value: number, ticks: number[]): string {
    if (ticks.length < 2) return String(value)
    const step = Math.abs(ticks[1] - ticks[0])
    if (step >= 1) return String(Math.round(value))
    const decimals = Math.min(4, Math.ceil(-Math.log10(step)))
    return value.toFixed(decimals)
}
