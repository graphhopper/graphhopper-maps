// Small helpers wrapping the browser-native CompressionStream API for use in
// share URLs. Uses 'deflate-raw' (no zlib/gzip framing → smallest output) plus
// base64url so the result is safe to drop straight into a URLSearchParam value
// without any percent-encoding overhead.

export function canCompress(): boolean {
    return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'
}

function bytesToBase64Url(bytes: Uint8Array): string {
    let bin = ''
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(s: string): Uint8Array {
    const padLen = (4 - (s.length % 4)) % 4
    const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen)
    const bin = atob(padded)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
}

async function streamThrough(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
        total += value.length
    }
    const out = new Uint8Array(total)
    let off = 0
    for (const c of chunks) {
        out.set(c, off)
        off += c.length
    }
    return out
}

function bytesAsReadableStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
    return new ReadableStream({
        start(controller) {
            controller.enqueue(bytes)
            controller.close()
        },
    })
}

export async function deflateB64url(input: string): Promise<string> {
    const bytes = new TextEncoder().encode(input)
    const compressed = (bytesAsReadableStream(bytes) as any).pipeThrough(new CompressionStream('deflate-raw'))
    return bytesToBase64Url(await streamThrough(compressed))
}

export async function inflateB64url(input: string): Promise<string> {
    const bytes = base64UrlToBytes(input)
    const decompressed = (bytesAsReadableStream(bytes) as any).pipeThrough(new DecompressionStream('deflate-raw'))
    return new TextDecoder().decode(await streamThrough(decompressed))
}
