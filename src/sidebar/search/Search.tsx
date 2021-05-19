import React, { useEffect, useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/search/Search.module.css'
import { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { AddPoint, ClearRoute, InvalidatePoint, RemovePoint, SetPoint } from '@/actions/Actions'
import RoutingProfiles from '@/sidebar/search/RoutingProfiles'
import RemoveIcon from '../times-solid.svg'
import AddIcon from './plus-circle-solid.svg'
import PlainButton from '@/PlainButton'
import { GeocodingHit, RoutingProfile } from '@/api/graphhopper'
import Api, { ApiImpl } from '@/api/Api'

interface Query {
    point: QueryPoint
    text: string
}

export default function Search({
    points,
    routingProfiles,
    selectedProfile,
}: {
    points: QueryPoint[]
    routingProfiles: RoutingProfile[]
    selectedProfile: RoutingProfile
}) {
    const [query, setQuery] = useState<Query>({
        point: {
            queryText: '',
            coordinate: { lat: 0, lng: 0 },
            isInitialized: false,
            id: -1,
            color: '',
            type: QueryPointType.Via,
        },
        text: '',
    })
    const [geocodingHits, setGeocodingHits] = useState<GeocodingHit[]>([])
    // future me will take care of this
    const [api] = useState<Api>(new ApiImpl())

    useEffect(() => {
        setGeocodingHits([])
    }, [points])

    useEffect(() => {
        if (!query.text) return

        let isCancelled = false

        api.geocode(query.text)
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
        Dispatcher.dispatch(
            new SetPoint({
                ...query.point,
                coordinate: hit.point,
                isInitialized: true,
                queryText: convertToQueryText(hit),
            })
        )
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
                    deletable={points.length > 2}
                    onChange={text => {
                        Dispatcher.dispatch(new ClearRoute())
                        Dispatcher.dispatch(new InvalidatePoint(point))
                        setQuery({ point: point, text: text })
                    }}
                />
            ))}
            <PlainButton
                onClick={() => Dispatcher.dispatch(new AddPoint(points.length, { lat: 0, lng: 0}, false))}
                className={styles.addSearchBox}
            >
                <AddIcon />
                <span>Add Point</span>
            </PlainButton>
            <RoutingProfiles routingProfiles={routingProfiles} selectedProfile={selectedProfile} />
            <GeocodingResults hits={geocodingHits} onSelectHit={handleHitSelected} />
        </div>
    )
}

const SearchBox = ({
    point,
    onChange,
    deletable,
}: {
    point: QueryPoint
    deletable: boolean
    onChange: (value: string) => void
}) => {
    const [text, setText] = useState(point.queryText)
    useEffect(() => setText(point.queryText), [point.queryText])

    return (
        <>
            <div className={styles.dot} style={{ backgroundColor: point.color }} />
            <input
                type="text"
                className={styles.searchBoxInput}
                value={text}
                placeholder="Search location or click the map"
                onChange={e => {
                    setText(e.target.value)
                    onChange(e.target.value)
                }}
            />
            {deletable && (
                <PlainButton
                    onClick={() => Dispatcher.dispatch(new RemovePoint(point))}
                    className={styles.removeSearchBox}
                >
                    <RemoveIcon />
                </PlainButton>
            )}
        </>
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
        <div className={styles.geocodingResults}>
            <ul>
                {hits.map(hit => (
                    <GeocodingEntry key={hit.osm_id} entry={hit} onSelectHit={onSelectHit} />
                ))}
            </ul>
        </div>
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

function convertToQueryText(hit: GeocodingHit) {
    let result = convertToName(hit, ', ')
    result += convertToStreet(hit, ', ')
    result += convertToCity(hit, ', ')
    result += convertToCountry(hit)

    return result
}

function convertToName(hit: GeocodingHit, appendix: string) {
    return hit.name === hit.street ? '' : hit.name + appendix
}

function convertToStreet(hit: GeocodingHit, appendix: string) {
    if (hit.housenumber && hit.street) return hit.street + ' ' + hit.housenumber + appendix
    if (hit.street) return hit.street + appendix
    return ''
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
