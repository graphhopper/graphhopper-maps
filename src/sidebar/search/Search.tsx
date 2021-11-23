import React, { useCallback, useEffect, useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/search/Search.module.css'
import { Coordinate, QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { AddPoint, ClearRoute, ErrorAction, InvalidatePoint, RemovePoint, SetPoint } from '@/actions/Actions'
import RoutingProfiles from '@/sidebar/search/RoutingProfiles'
import RemoveIcon from '@/sidebar/search/times-circle-solid.svg'
import CurrentLocationIcon from '@/sidebar/search/current-location.svg'
import AddIcon from './plus-circle-solid.svg'
import ArrowLeft from './arrow-left-solid.svg'
import PlainButton from '@/PlainButton'
import { GeocodingHit, RoutingProfile } from '@/api/graphhopper'

import AddressInput, { Geocoder } from '@/sidebar/search/AddressInput'
import { MarkerComponent } from '@/map/Marker'
import { convertToQueryText, textToCoordinate } from '@/Converters'
import Api, { getApi } from '@/api/Api'
import Autocomplete, {
    AutocompleteItem,
    EmptyItem,
    GeocodingItem,
    isGeocodingItem,
} from '@/sidebar/search/AddressInputAutocomplete'
import CurrentLocation from '@/sidebar/search/CurrentLocation'
import { tr } from '@/translation/Translation'

export default function Search({
    points,
    routingProfiles,
    selectedProfile,
    autofocus,
}: {
    points: QueryPoint[]
    routingProfiles: RoutingProfile[]
    selectedProfile: RoutingProfile
    autofocus: boolean
}) {
    const [currentQueryText, setCurrentQueryText] = useState('')
    const [lastSelectedPoint, setLastSelectedPoint] = useState<QueryPoint | null>(null)
    return currentQueryText ? (
        <FullSizeAutocomplete
            query={currentQueryText}
            onSelect={(text, coordinate) => {
                setCurrentQueryText('')
                Dispatcher.dispatch(
                    coordinate
                        ? new SetPoint({
                              ...lastSelectedPoint!,
                              isInitialized: true,
                              queryText: text,
                              coordinate: coordinate,
                          })
                        : new SetPoint({
                              ...lastSelectedPoint!,
                              isInitialized: false,
                              queryText: text,
                          })
                )
            }}
        />
    ) : (
        <div className={styles.searchBox}>
            {points.map(point => (
                <PointSearch
                    key={point.id}
                    point={point}
                    deletable={points.length > 2}
                    focus={point.id === lastSelectedPoint?.id}
                    onChange={value => {
                        setLastSelectedPoint(point)
                        setCurrentQueryText(value)
                        Dispatcher.dispatch(new ClearRoute())
                        Dispatcher.dispatch(new InvalidatePoint(point))
                    }}
                />
            ))}
            <PlainButton
                onClick={() => Dispatcher.dispatch(new AddPoint(points.length, { lat: 0, lng: 0 }, false))}
                className={styles.addSearchBox}
            >
                <AddIcon />
            </PlainButton>
            <RoutingProfiles routingProfiles={routingProfiles} selectedProfile={selectedProfile} />
        </div>
    )

    /*
    return (
        <div className={styles.searchBox}>
            {points.map(point => (
                <SearchBox
                    key={point.id}
                    point={point}
                    deletable={points.length > 2}
                    onChange={() => {
                        Dispatcher.dispatch(new ClearRoute())
                        Dispatcher.dispatch(new InvalidatePoint(point))
                    }}
                    autofocus={point.type === QueryPointType.From && autofocus}
                />
            ))}
            <PlainButton
                onClick={() => Dispatcher.dispatch(new AddPoint(points.length, { lat: 0, lng: 0 }, false))}
                className={styles.addSearchBox}
            >
                <AddIcon />
            </PlainButton>
            <RoutingProfiles routingProfiles={routingProfiles} selectedProfile={selectedProfile} />
        </div>
    )

     */
}

function FullSizeAutocomplete({
    query,
    onSelect,
}: {
    query: string
    onSelect: (queryText: string, coordinate: Coordinate | null) => void
}) {
    const [value, setValue] = useState(query)
    useEffect(() => {
        if (!value) onSelect('', null)
    }, [value])

    const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>(getEmptyAutocompleteItems)
    const [geocoder] = useState(
        new Geocoder(getApi(), hits => {
            const items = getEmptyAutocompleteItems()
            for (let i = 0; i < hits.length; i++) {
                items[i] = { type: 'geocoding', hit: hits[i] } as GeocodingItem
            }

            setAutocompleteItems(items)
        })
    )

    const [highlightedResult, setHighlightedResult] = useState<number>(-1)
    useEffect(() => setHighlightedResult(-1), [autocompleteItems])
    const onKeypress = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Escape') {
                onSelect(value, null)
                return
            }

            switch (event.key) {
                case 'ArrowUp':
                    setHighlightedResult(i => calculateHighlightedIndex(autocompleteItems.length, i, -1))
                    break
                case 'ArrowDown':
                    setHighlightedResult(i => calculateHighlightedIndex(autocompleteItems.length, i, 1))
                    break
                case 'Enter':
                case 'Tab':
                    // try to parse input as coordinate. Otherwise use autocomplete results
                    const coordinate = textToCoordinate(value)
                    if (coordinate) {
                        console.log('selecting coordinate')
                        onSelect(value, coordinate)
                    } else if (autocompleteItems.length !== 0) {
                        // by default use the first result, otherwise the highlighted one
                        const index = highlightedResult >= 0 ? highlightedResult : 0
                        const item = autocompleteItems[index] as GeocodingItem
                        onSelect(convertToQueryText(item.hit), item.hit.point)
                    }
                    break
            }
        },
        [autocompleteItems, highlightedResult, value]
    )

    function handleChange(value: string) {
        setValue(value)
        const coordinate = textToCoordinate(value)
        if (!coordinate) geocoder.request(value)
        else console.log('is coordinate')
    }

    return (
        <div className={styles.fullsizeAutocomplete}>
            <PlainButton className={styles.autocompleteBack} onClick={() => onSelect(value, null)}>
                <ArrowLeft />
            </PlainButton>
            <input
                className={styles.pointInput}
                type="text"
                autoFocus
                value={value}
                onChange={e => handleChange(e.target.value)}
                onKeyDown={onKeypress}
            />
            {autocompleteItems.length > 0 && (
                <div className={styles.autocompleteList}>
                    <Autocomplete
                        items={autocompleteItems}
                        highlightedItem={autocompleteItems[highlightedResult]}
                        onSelect={item => {
                            if (isGeocodingItem(item)) onSelect(convertToQueryText(item.hit), item.hit.point)
                        }}
                    />
                </div>
            )}
        </div>
    )
}

function getEmptyAutocompleteItems(): AutocompleteItem[] {
    const result: AutocompleteItem[] = []
    for (let i = 0; i < 5; i++) {
        result.push({
            type: 'empty',
        })
    }

    result.push({
        type: 'currentLocation',
    })

    return result
}

function calculateHighlightedIndex(length: number, currentIndex: number, incrementBy: number) {
    const nextIndex = currentIndex + incrementBy
    if (nextIndex >= length) return 0
    if (nextIndex < 0) return length - 1
    return nextIndex
}

function PointSearch({
    point,
    deletable,
    focus,
    onChange,
}: {
    point: QueryPoint
    deletable: boolean
    focus: boolean
    onChange: (value: string) => void
}) {
    return (
        <>
            <div className={styles.markerContainer}>
                <MarkerComponent color={point.color} />
            </div>
            <input
                className={styles.pointInput}
                type="text"
                autoFocus={focus}
                defaultValue={point.queryText}
                onChange={e => {
                    onChange(e.target.value)
                }}
                onFocus={event => {
                    event.target.select()
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

const SearchBox = ({
    point,
    onChange,
    deletable,
    autofocus,
}: {
    point: QueryPoint
    deletable: boolean
    onChange: (value: string) => void
    autofocus: boolean
}) => {
    return (
        <>
            <div className={styles.markerContainer}>
                <MarkerComponent color={point.color} />
            </div>
            <div className={styles.searchBoxInput}>
                <AddressInput
                    point={point}
                    autofocus={autofocus}
                    onCancel={() => console.log('cancel')}
                    onAddressSelected={(queryText, coordinate) =>
                        Dispatcher.dispatch(
                            coordinate
                                ? new SetPoint({
                                      ...point,
                                      isInitialized: true,
                                      queryText: queryText,
                                      coordinate: coordinate,
                                  })
                                : new SetPoint({
                                      ...point,
                                      isInitialized: false,
                                      queryText: queryText,
                                  })
                        )
                    }
                    onChange={onChange}
                />
            </div>
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
