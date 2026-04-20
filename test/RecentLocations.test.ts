import { getRecentLocations, saveRecentLocation, MAX_ENTRIES } from '@/sidebar/search/RecentLocations'

jest.mock('@/translation/Translation', () => ({ tr: (key: string) => key }))
jest.mock('@/Converters', () => ({ textToCoordinate: () => null }))

beforeEach(() => localStorage.clear())

function save(name: string, lat: number, timestamp: number) {
    saveRecentLocation(name, '', { lat, lng: 0 }, timestamp)
}

function names() {
    return getRecentLocations().map(l => l.mainText)
}

describe('RecentLocations', () => {
    it('should dedup nearby locations and increment count', () => {
        save('A', 1, 1000)
        save('A2', 1, 2000)
        const locs = getRecentLocations()
        expect(locs).toHaveLength(1)
        expect(locs[0]).toMatchObject({ mainText: 'A2', count: 2, timestamp: 2000 })
    })

    it('should evict oldest entry when MAX is reached, not a recent one', () => {
        for (let i = 0; i < MAX_ENTRIES; i++) save(`Old${i}`, 10 + i, 1000 + i)

        save('Recent', 90, 100_000)

        expect(names()).toContain('Recent')
        expect(names()).not.toContain('Old0') // oldest timestamp evicted
        expect(getRecentLocations()).toHaveLength(MAX_ENTRIES)
    })

    it('should keep a re-used location from being evicted', () => {
        for (let i = 0; i < MAX_ENTRIES; i++) save(`P${i}`, 10 + i, 1000 + i)

        save('P0', 10, 200_000) // re-use refreshes timestamp
        save('New', 90, 200_001) // triggers eviction

        expect(names()).toContain('P0')
        expect(names()).not.toContain('P1') // now the oldest
    })

    it('should keep a frequently used (high count) location even if older than new one-off entries', () => {
        // user visits Home many times long ago
        for (let i = 0; i < 5; i++) save('Home', 42, 1000 + i)
        // then visits MAX_ENTRIES brand-new one-off locations
        for (let i = 0; i < MAX_ENTRIES; i++) save(`One${i}`, 10 + i, 100_000 + i)

        // Home has count 5 and should not be evicted by single-count newer entries
        expect(names()).toContain('Home')
    })

    it('should save a new one-off even when the cache is full of frequently-used entries', () => {
        // every slot taken by a favorite (count=2)
        for (let i = 0; i < MAX_ENTRIES; i++) {
            save(`Fav${i}`, 10 + i, 1000 + i)
            save(`Fav${i}`, 10 + i, 2000 + i) // re-visit → count=2
        }
        expect(getRecentLocations()).toHaveLength(MAX_ENTRIES)

        save('New', 100, 10_000)
        // a brand-new one-off must still be stored, otherwise it can never accumulate count on future visits
        expect(names()).toContain('New')
    })

    it('should sort by count desc, then timestamp desc', () => {
        save('Once', 1, 5000)
        save('Twice', 2, 1000)
        save('Twice', 2, 2000) // count=2

        const locs = getRecentLocations()
        expect(locs[0].mainText).toBe('Twice') // higher count first
        expect(locs[1].mainText).toBe('Once')
    })
})
