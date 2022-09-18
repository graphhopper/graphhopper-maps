import React from 'react'

const MARKER_PATH =
    'M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z'
const INNER_CIRCLE = 'M192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z'

const markerStyle = {
    cursor: 'pointer',
    stroke: 'none',
}

interface MarkerProps {
    color: string
    number?: number | undefined
    size?: number
    cursor?: string | undefined
}

/**
 * This component draws a marker. If a number is passed, the white circle of the marker is larger and displays the
 * number. Otherwise the default marker from https://fontawesome.com/v5.15/icons/map-marker-alt?style=solid is taken
 */
export function MarkerComponent({ color, number, size = 0, cursor }: MarkerProps) {
    return (
        <svg
            aria-hidden="true"
            focusable="false"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 384 512"
            height={size}
            style={{ ...markerStyle, fill: color, cursor: cursor ? cursor : markerStyle.cursor }}
        >
            <path d={MARKER_PATH} />
            {number === undefined ? (
                <path d={INNER_CIRCLE} fill="white" />
            ) : (
                <circle cx="192" cy="190" r="150" fill="white" />
            )}
            <text x="50%" y="55%" textAnchor="middle" style={{ fontSize: 210 }} fill="black">
                {number !== undefined ? number : ''}
            </text>
        </svg>
    )
}
