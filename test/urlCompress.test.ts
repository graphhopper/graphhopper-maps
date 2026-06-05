/**
 * @jest-environment node
 */
// Use Node's environment because jsdom doesn't ship CompressionStream / Blob.
import { canCompress, deflateB64url, inflateB64url } from '@/util/urlCompress'

describe('urlCompress', () => {
    it('feature-detect works under Node (CompressionStream is global since v18)', () => {
        expect(canCompress()).toBe(true)
    })

    it('roundtrips a typical custom_model JSON and outputs URL-safe chars', async () => {
        const input =
            '{"distance_influence":15,"priority":[{"if":"road_environment==FERRY","multiply_by":"0.9"}],"speed":[],"areas":{"type":"FeatureCollection","features":[]}}'
        const compressed = await deflateB64url(input)
        expect(compressed).toMatch(/^[A-Za-z0-9_-]+$/)
        expect(await inflateB64url(compressed)).toEqual(input)
    })

    it('produces a smaller output than the raw URL-encoded input for redundant payloads', async () => {
        // A larger custom_model with repeated keys / structure — the case where
        // compression actually pays off (the bloat-fallback in NavBar handles
        // the small-input case where it doesn't).
        const heavy = JSON.stringify({
            distance_influence: 15,
            priority: Array(20).fill({ if: 'road_environment==FERRY', multiply_by: '0.9' }),
            speed: [],
            areas: { type: 'FeatureCollection', features: [] },
        })
        const compressed = await deflateB64url(heavy)
        expect(compressed.length).toBeLessThan(heavy.length)
        expect(await inflateB64url(compressed)).toEqual(heavy)
    })

    it('roundtrips a *-joined names list with non-ASCII characters', async () => {
        const input = 'München*Wien*Brandenburger Tor, 10117 Berlin, Germany*Krakow'
        const compressed = await deflateB64url(input)
        const decompressed = await inflateB64url(compressed)
        expect(decompressed).toEqual(input)
    })

    it('roundtrips an empty string', async () => {
        const compressed = await deflateB64url('')
        const decompressed = await inflateB64url(compressed)
        expect(decompressed).toEqual('')
    })
})
