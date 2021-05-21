import React, { useEffect, useRef, useState } from 'react'
import { QueryPoint } from '@/stores/QueryStore'
import { GeocodingHit } from '@/api/graphhopper'
import GeocodingResult from '@/sidebar/search/GeocodingResult'

import styles from './AddressInput.module.css'
import { ApiImpl } from '@/api/Api'

export interface AddressInputProps {
    point: QueryPoint
    autofocus: boolean
    onCancel: () => void
    onAddressSelected: (hit: GeocodingHit) => void
    onChange: (value: string) => void
}

export default function AddressInput(props: AddressInputProps) {
    const searchInput = useRef<HTMLInputElement>(null)

    // holds the query text making this a controlled component
    const [text, setText] = useState(props.point.queryText)
    // puts the query text from props into the state of this component
    useEffect(() => setText(props.point.queryText), [props.point.queryText])

    const [geocodingResults, setGeocodingResults] = useState<GeocodingHit[]>([])
    const [geocoder] = useState(new Geocoder(hits => setGeocodingResults(hits)))
    useEffect(() => setGeocodingResults([]), [props.point])

    const [fullscreen, setFullscreen] = useState(false)

    const containerClass = fullscreen ? styles.container + ' ' + styles.fullscreen : styles.container
    return (
        <div className={containerClass}>
            <div className={styles.inputContainer}>
                <input
                    className={styles.input}
                    type='text'
                    ref={searchInput}
                    onChange={e => {
                        setText(e.target.value)
                        geocoder.request(e.target.value)
                        props.onChange(e.target.value)
                    }}
                    onFocus={() => setFullscreen(true)}
                    value={text}
                    placeholder={'Search location or right click on the map'}
                />
                <button
                    className={styles.btnClose}
                    onClick={() => {
                        console.log(searchInput.current)
                        setFullscreen(false)
                    }}
                >
                    Close
                </button>
            </div>

            {geocodingResults.length > 0 && (
                <div className={styles.popup}>
                    <GeocodingResult
                        hits={geocodingResults}
                        onSelectHit={hit => {
                            props.onAddressSelected(hit)
                            setFullscreen(false)
                        }}
                    />
                </div>
            )}
        </div>
    )
}

/**
 * Tried for hours to make this work with a hook but failed. Now doing it the way I know...
 */
class Geocoder {
    private requestId = 0
    private api = new ApiImpl()
    private onSuccess: (hits: GeocodingHit[]) => void

    constructor(onSuccess: (hits: GeocodingHit[]) => void) {
        this.onSuccess = onSuccess
    }

    request(query: string) {
        const currentId = this.getNextId()

        if (!query) return

        this.api
            .geocode(query)
            .then(result => {
                const hits = Geocoder.filterDuplicates(result.hits)
                if (currentId === this.requestId) this.onSuccess(hits)
            })
            .catch(reason => {
                throw Error('Could not get geocoding results because: ' + reason)
            })
    }

    private getNextId() {
        this.requestId++
        return this.requestId
    }

    private static filterDuplicates = function(hits: GeocodingHit[]) {
        const set: Set<string> = new Set()
        return hits.filter(hit => {
            if (!set.has(hit.osm_id)) {
                set.add(hit.osm_id)
                return true
            }
            return false
        })
    }
}
