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
    number?: string | undefined
    size?: number
    cursor?: string | undefined
}

// depending on the number of digits the font must be smaller so that e.g. '10' still fits into the circle
function circleFontSize(number: string | undefined) {
    if (number === undefined || number.length <= 1) return 230
    return number.length === 2 ? 170 : 120
}

/**
 * This component draws a circle with a thick colored ring and a white center, used for via points. If a number is
 * passed it is displayed inside the circle.
 */
export function CircleComponent({ color, number, size = 0, cursor }: MarkerProps) {
    return (
        <svg
            aria-hidden="true"
            focusable="false"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 384 384"
            height={size}
            // the (deliberately global) class allows styling, e.g. Search.module.css enlarges the via icon
            className="viaCircle"
            style={{ cursor: cursor ? cursor : markerStyle.cursor }}
        >
            <circle cx="192" cy="192" r="160" fill="white" stroke={color} strokeWidth="60" />
            {number !== undefined && (
                <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dy="0.35em"
                    style={{ fontSize: circleFontSize(number) }}
                    fill="#333"
                >
                    {number}
                </text>
            )}
        </svg>
    )
}

/**
 * This component draws the default marker from https://fontawesome.com/v5.15/icons/map-marker-alt?style=solid.
 * If a number is passed the marker is a via point and drawn as a circle displaying the number.
 */
export function MarkerComponent({ color, number, size = 0, cursor }: MarkerProps) {
    if (number !== undefined) return <CircleComponent color={color} number={number} size={size} cursor={cursor} />
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
            <path d={INNER_CIRCLE} fill="white" />
        </svg>
    )
}
