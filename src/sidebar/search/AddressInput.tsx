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
    onFocus: () => void
}
export default function AddressInput(props: AddressInputProps) {
    // useRef and following useEffect put focus onto textbox when rendered
    const searchInput = useRef<HTMLInputElement>(null)
    useEffect(() => {
        if (props.autofocus) searchInput.current!.focus()
    })

    // holds the query text making this a controlled component
    const [text, setText] = useState(props.point.queryText)
    // puts the query text from props into the state of this component
    useEffect(() => setText(props.point.queryText), [props.point.queryText])

    const [geocodingResults, setGeocodingResults] = useState<GeocodingHit[]>([])
    const [geocoder] = useState(new Geocoder(hits => setGeocodingResults(hits)))
    useEffect(() => setGeocodingResults([]), [props.point])

    return (
        <div className={styles.container}>
            <input
                className={styles.input}
                type="text"
                ref={searchInput}
                onChange={e => {
                    setText(e.target.value)
                    geocoder.request(e.target.value)
                    props.onChange(e.target.value)
                }}
                onFocus={() => props.onFocus()}
                value={text}
            />
            {geocodingResults.length > 0 && (
                <div className={styles.popup}>
                    <GeocodingResult
                        hits={geocodingResults}
                        onSelectHit={hit => {
                            props.onAddressSelected(hit)
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

    private static filterDuplicates = function (hits: GeocodingHit[]) {
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
