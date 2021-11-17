const MARKER_PATH =
    'M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z'
const INNER_CIRCLE = 'M192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z'

interface MarkerProps {
    color: string
    number?: number
    size?: number
}

// todo: this is mostly duplicated from `Marker.tsx`. To use `Marker.tsx` we would probably need to add ol.Overlays, i.e.
// create a div for each marker and insert the svg from `Marker.tsx`.
export function createSvg({ color, number, size = 0 }: MarkerProps) {
    return `<svg aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="${
        // todo: we do not use width in Marker.tsx, but without this the markers are not shown in Firefox :( (but they are shown in Chrome...)
        size
    }" height="${size}" style="cursor: pointer; stroke: none; fill: ${hexToRgb(color)}; transform: \`translate(${
        -size / 2
    }px, ${-size}px)"><path d="${MARKER_PATH}"/>${
        number === undefined
            ? '<path d="' + INNER_CIRCLE + '" fill="white" />'
            : '<circle cx="192" cy="190" r="120" fill="white" />'
    }<text x="50%" y="47%" text-anchor="middle" style="font-size: ${150}" fill="black">${
        // todo: the text is not shown in Firefox (only in Chrome) :(
        number !== undefined ? number : ''
    }</text></svg>`
}

// todo: for some weird reason the markers are not shown when the color is given in hex format #012345
function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) throw new Error('invalid hex color: ' + hex)
    return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`
}
