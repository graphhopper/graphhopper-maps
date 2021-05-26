import React, { useCallback, useEffect, useRef, useState } from 'react'
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
    // controlled component pattern with initial value set from props
    const [text, setText] = useState(props.point.queryText)
    useEffect(() => setText(props.point.queryText), [props.point.queryText])

    // container for geocoding results which get set by the geocoder class and set to empty if the undelying query point gets changed from outside
    const [geocodingResults, setGeocodingResults] = useState<GeocodingHit[]>([])
    const [geocoder] = useState(new Geocoder(hits => setGeocodingResults(hits)))
    useEffect(() => {
        setGeocodingResults([])
        //setFullscreen(false)
    }, [props.point])

    // highlighted result of geocoding results. Keep track which index is highlighted and change things on ArrowUp and Down
    // on Enter select highlighted result or the 0th if nothing is highlighted
    const [highlightedResult, setHighlightedResult] = useState<number>(-1)
    useEffect(() => setHighlightedResult(-1), [geocodingResults])
    const searchInput = useRef<HTMLInputElement>(null)
    const onKeypress = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Escape') {
                searchInput.current!.blur()
                return
            }
            if (geocodingResults.length === 0) return

            switch (event.key) {
                case 'ArrowUp':
                    setHighlightedResult(i => calculateHighlightedIndex(geocodingResults.length, i, -1))
                    break
                case 'ArrowDown':
                    setHighlightedResult(i => calculateHighlightedIndex(geocodingResults.length, i, 1))
                    break
                case 'Enter':
                    // by default use the first result, otherwise the highlighted one
                    const index = highlightedResult >= 0 ? highlightedResult : 0
                    props.onAddressSelected(geocodingResults[index])
                    searchInput.current!.blur()
                    break
            }
        },
        [geocodingResults, highlightedResult]
    )

    // toggle fullscreen display on small screens
    const [fullscreen, setFullscreen] = useState(false)
    const containerClass = fullscreen ? styles.container + ' ' + styles.fullscreen : styles.container

    return (
        <div className={containerClass}>
            <div className={styles.inputContainer}>
                <input
                    className={styles.input}
                    type="text"
                    ref={searchInput}
                    onChange={e => {
                        setText(e.target.value)
                        geocoder.request(e.target.value)
                        props.onChange(e.target.value)
                    }}
                    onKeyDown={onKeypress}
                    onFocus={() => setFullscreen(true)}
                    onBlur={() => {
                        console.log('on blur')
                        setFullscreen(false)
                        setGeocodingResults([])
                    }}
                    value={text}
                    placeholder={'Search location or right click on the map'}
                />
                <button className={styles.btnClose} onClick={() => setFullscreen(false)}>
                    Close
                </button>
            </div>

            {geocodingResults.length > 0 && (
                <div className={styles.popup}>
                    <GeocodingResult
                        hits={geocodingResults}
                        highlightedHit={geocodingResults[highlightedResult]}
                        onSelectHit={hit => {
                            props.onAddressSelected(hit)
                            searchInput.current!.blur()
                        }}
                    />
                </div>
            )}
        </div>
    )
}

function calculateHighlightedIndex(length: number, currentIndex: number, incrementBy: number) {
    const nextIndex = currentIndex + incrementBy
    if (nextIndex >= length) return 0
    if (nextIndex < 0) return length - 1
    return nextIndex
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
