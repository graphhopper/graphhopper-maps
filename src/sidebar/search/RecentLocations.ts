import { calcDist, Coordinate } from '@/utils'
import { tr } from '@/translation/Translation'
import { textToCoordinate } from '@/Converters'

const STORAGE_KEY = 'recentLocations'
export const MAX_ENTRIES = 15
const DEDUP_DISTANCE_METERS = 5

export interface RecentLocation {
    mainText: string
    secondText: string
    lat: number
    lng: number
    timestamp: number
    count: number
}

export function getRecentLocations(minCount: number = 0): RecentLocation[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed
            .filter(
                (e: any) =>
                    typeof e.mainText === 'string' &&
                    typeof e.secondText === 'string' &&
                    typeof e.lat === 'number' &&
                    typeof e.lng === 'number' &&
                    typeof e.timestamp === 'number',
            )
            .map((e: any) => ({ ...e, count: typeof e.count === 'number' ? e.count : 1 }))
            .filter((e: RecentLocation) => e.count > minCount)
            .sort((a: RecentLocation, b: RecentLocation) => b.count - a.count || b.timestamp - a.timestamp)
    } catch {
        return []
    }
}

export function clearRecentLocations(): void {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch {
        // localStorage unavailable
    }
}

export function saveRecentLocation(
    mainText: string,
    secondText: string,
    coordinate: Coordinate,
    now: number = Date.now(),
): void {
    if (mainText === tr('current_location')) return
    if (textToCoordinate(mainText)) return

    try {
        const all = getRecentLocations()
        let prevCount = 0
        const filtered = all.filter(e => {
            const isDuplicate = calcDist({ lat: e.lat, lng: e.lng }, coordinate) <= DEDUP_DISTANCE_METERS
            if (isDuplicate) prevCount = e.count
            return !isDuplicate
        })

        filtered.push({
            mainText,
            secondText,
            lat: coordinate.lat,
            lng: coordinate.lng,
            timestamp: now,
            count: prevCount + 1,
        })
        filtered.sort((a, b) => b.timestamp - a.timestamp)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ENTRIES)))
    } catch {
        // localStorage unavailable (private browsing, quota exceeded)
    }
}
