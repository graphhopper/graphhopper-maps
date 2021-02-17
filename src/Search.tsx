import React, { useEffect, useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import { InvalidatePoint, QueryPoint, SetPointFromAddress } from '@/stores/QueryStore'
import { geocode, GeocodingHit } from '@/routing/Api'
import { ClearRoute } from '@/stores/RouteStore'
import styles from '@/Search.module.css'

interface Query {
    point: QueryPoint
    text: string
}

export default function Search({ points }: { points: QueryPoint[] }) {
    const [query, setQuery] = useState<Query>({
        point: {
            queryText: '',
            point: { lat: 0, lng: 0 },
            isInitialized: false,
            id: -1,
        },
        text: '',
    })
    const [geocodingHits, setGeocodingHits] = useState<GeocodingHit[]>([])

    useEffect(() => {
        setGeocodingHits([])
    }, [points])

    useEffect(() => {
        if (!query.text) return

        let isCancelled = false

        geocode(query.text)
            .then(result => {
                const hits = filterDuplicates(result.hits)
                if (!isCancelled) setGeocodingHits(hits)
            })
            .catch(reason => {
                throw Error('Could not get geocoding results because: ' + reason)
            })
        return () => {
            isCancelled = true
        }
    }, [query])

    const handleHitSelected = (hit: GeocodingHit) => {
        Dispatcher.dispatch(new SetPointFromAddress(hit, query.point))
    }

    const searchBoxStyle = (hits: GeocodingHit[]) => {
        return hits.length > 0 ? styles.searchBox + ' ' + styles.searchBoxScrollable : styles.searchBox
    }

    return (
        <div className={searchBoxStyle(geocodingHits)}>
            {points.map(point => (
                <SearchBox
                    key={point.id}
                    point={point}
                    onChange={text => {
                        Dispatcher.dispatch(new ClearRoute())
                        Dispatcher.dispatch(new InvalidatePoint(point))
                        setQuery({ point: point, text: text })
                    }}
                />
            ))}
            <GeocodingResults hits={geocodingHits} onSelectHit={handleHitSelected} />
        </div>
    )
}

const SearchBox = ({ point, onChange }: { point: QueryPoint; onChange: (value: string) => void }) => {
    const [text, setText] = useState(point.queryText)
    useEffect(() => setText(point.queryText), [point.queryText])

    return (
        <input
            type="text"
            className={styles.searchBoxInput}
            value={text}
            placeholder="Click on map to select a location"
            onChange={e => {
                setText(e.target.value)
                onChange(e.target.value)
            }}
        />
    )
}

const GeocodingResults = ({
    hits,
    onSelectHit,
}: {
    hits: GeocodingHit[]
    onSelectHit: (hit: GeocodingHit) => void
}) => {
    return (
        <div>
            <ul>
                {hits.map(hit => (
                    <GeocodingEntry key={hit.osm_id} entry={hit} onSelectHit={onSelectHit} />
                ))}
            </ul>
        </div>
    )
}

function geocodingHitToName(result: GeocodingHit) {
    if (result.name && result.housenumber) return result.name + ' ' + result.housenumber
    if (result.name) return result.name
    return 'No name?'
}

function geocodingHitToAdress(hit: GeocodingHit) {
    let result = hit.postcode ? hit.postcode : ''
    if (hit.city) result = result + ' ' + hit.city
    if (hit.country) result = result ? result + ', ' + hit.country : hit.country // if it is only the country, don't make a comma
    return result
}

const GeocodingEntry = ({ entry, onSelectHit }: { entry: GeocodingHit; onSelectHit: (hit: GeocodingHit) => void }) => {
    return (
        <li>
            <button className={styles.selectableGeocodingEntry} onClick={() => onSelectHit(entry)}>
                <div className={styles.geocodingEntry}>
                    <span className={styles.geocodingEntryMain}>{geocodingHitToName(entry)}</span>
                    <span>{geocodingHitToAdress(entry)}</span>
                </div>
            </button>
        </li>
    )
}

const filterDuplicates = function (hits: GeocodingHit[]) {
    const set: Set<string> = new Set()
    return hits.filter(hit => {
        if (!set.has(hit.osm_id)) {
            set.add(hit.osm_id)
            return true
        }
        return false
    })
}
