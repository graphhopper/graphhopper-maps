const MARKER_PATH =
    'M 172.968 632.025 C 26.97 291.031 0 269.413 0 192 C 0 85.961 85.961 0 192 0 S 384 85.961 384 192 C 384 269.413 357.03 291.031 213 632 C 193.781 667.361 192.57 667.361 172.968 632.025 Z'
const INNER_CIRCLE = 'M192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z'

interface MarkerProps {
    color: string
    number?: number
    size?: number
}

export function createPOI(pathD: string) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="-100 -1060 1160 1160">
        <circle fill="white" cx="480" cy="-480" r="580" />
        <path color="lightcoral" fill="currentColor" d="${pathD}"/>
    </svg>`
}

export function createPOIMarker(pathD: string) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 -1260 960 1560">
        <path color="rgb(249, 119, 119)" fill="currentColor" d="m -46.278793,-739.50038 c -0.119546,-249.77515 165.728493,-515.03832 526.428923,-516.08842 392.86041,-1.1438 528.51077,269.46826 528.84707,519.24315 0.3488,259.06981 -254.78805,473.49828 -382.7069,701.499743 C 519.97666,154.64661 509.30678,296.87227 479.27479,296.44795 444.1137,295.95116 422.98296,153.89016 311.80839,-41.049369 182.8093,-267.24338 -46.156365,-483.7031 -46.278793,-739.50038 Z" style="stroke-width:2.3555"/> 
        <path color="white" fill="currentColor" d="${pathD}" transform="scale(0.8) translate(120, -450)"/>
    </svg>`
}

// todo: this is mostly duplicated from `Marker.tsx`, but we use a more elongated shape (MARKER_PATH).
//       To use `Marker.tsx` we would probably need to add ol.Overlays, i.e. create a div for each marker and insert the svg from `Marker.tsx`.
export function createSvg({ color, number, size = 0 }: MarkerProps) {
    return `<svg aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 658" width="${
        // todo: we do not use width in Marker.tsx, but without this the markers are not shown in Firefox :( (but they are shown in Chrome...)
        size
    }" height="${size}" style="stroke: none; fill: ${hexToRgb(color)};">
    <path d="${MARKER_PATH}"/>${
        number === undefined
            ? '<path d="' + INNER_CIRCLE + '" fill="white" />'
            : '<circle cx="192" cy="190" r="120" fill="white" />'
    }<text x="50%" y="40%" text-anchor="middle" style="font-size: ${180 + 'px'}" fill="black">${
        number !== undefined ? number : ''
    }</text></svg>`
}

// todo: for some weird reason the markers are not shown when the color is given in hex format #012345
function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) throw new Error('invalid hex color: ' + hex)
    return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`
}
