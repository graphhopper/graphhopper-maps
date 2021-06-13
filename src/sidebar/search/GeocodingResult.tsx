import { GeocodingHit } from '@/api/graphhopper'
import styles from './GeocodingResult.module.css'
import React, { useState } from 'react'

export default function GeocodingResult({
    hits,
    highlightedHit,
    onSelectHit,
}: {
    hits: GeocodingHit[]
    highlightedHit: GeocodingHit
    onSelectHit: (hit: GeocodingHit) => void
}) {
    return (
        <ul className={styles.geocodingList}>
            {hits.map(hit => (
                <GeocodingEntry
                    key={hit.osm_id}
                    entry={hit}
                    isHighlighted={hit === highlightedHit}
                    onSelectHit={onSelectHit}
                />
            ))}
        </ul>
    )
}

const GeocodingEntry = ({
    entry,
    isHighlighted,
    onSelectHit,
}: {
    entry: GeocodingHit
    isHighlighted: boolean
    onSelectHit: (hit: GeocodingHit) => void
}) => {
    const [wasCancelled, setWasCancelled] = useState(false)

    const className = isHighlighted
        ? styles.selectableGeocodingEntry + ' ' + styles.highlightedGeocodingEntry
        : styles.selectableGeocodingEntry
    return (
        <li className={styles.geocodingListItem}>
            {
            <button
                className={className}
                onClick={() => {
                    console.log('hit selected ' + entry.name)
                    onSelectHit(entry)
                }}
                // Using the click event would close the popup to quickly, see #100
                onTouchEnd={e => {
                    onSelectHit(entry)
                    e.preventDefault()
                }}
                // prevent blur event for input textbox
                onPointerDown={e => e.preventDefault()}
            >
                <div className={styles.geocodingEntry}>
                    <span className={styles.geocodingEntryMain}>{convertToMainText(entry)}</span>
                    <span>{convertToSecondaryText(entry)}</span>
                </div>
            </button>
        </li>
    )
}

function convertToMainText(hit: GeocodingHit) {
    if (hit.name && hit.housenumber) return hit.name + ' ' + hit.housenumber
    return hit.name
}

function convertToSecondaryText(hit: GeocodingHit) {
    let result = convertToCity(hit, ', ')
    result += convertToCountry(hit)
    return result
}

function convertToCity(hit: GeocodingHit, appendix: string) {
    if (hit.city && hit.postcode) return hit.postcode + ' ' + hit.city + appendix
    if (hit.city) return hit.city + appendix
    if (hit.postcode) return hit.postcode + appendix
    return ''
}

function convertToCountry(hit: GeocodingHit) {
    return hit.country ? hit.country : ''
}
