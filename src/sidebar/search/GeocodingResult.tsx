import { GeocodingHit } from '@/api/graphhopper'
import styles from './GeocodingResult.module.css'
import React from 'react'

export default function GeocodingResult({
    hits,
    onSelectHit,
}: {
    hits: GeocodingHit[]
    onSelectHit: (hit: GeocodingHit) => void
}) {
    return (
        <ul>
            {hits.map(hit => (
                <GeocodingEntry key={hit.osm_id} entry={hit} onSelectHit={onSelectHit} />
            ))}
        </ul>
    )
}

const GeocodingEntry = ({ entry, onSelectHit }: { entry: GeocodingHit; onSelectHit: (hit: GeocodingHit) => void }) => {
    return (
        <li>
            <button className={styles.selectableGeocodingEntry} onClick={() => onSelectHit(entry)}>
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
