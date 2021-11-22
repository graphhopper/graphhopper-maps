import React, { useCallback, useEffect, useRef, useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/search/Search.module.css'
import { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { AddPoint, ClearRoute, InvalidatePoint, RemovePoint, SetPoint } from '@/actions/Actions'
import RoutingProfiles from '@/sidebar/search/RoutingProfiles'
import RemoveIcon from '../times-solid.svg'
import AddIcon from './plus-circle-solid.svg'
import PlainButton from '@/PlainButton'
import { RoutingProfile } from '@/api/graphhopper'

import AddressInput, { Geocoder } from '@/sidebar/search/AddressInput'
import { MarkerComponent } from '@/map/Marker'
import { createPortal } from 'react-dom'
import Autocomplete, { AutocompleteItem, GeocodingItem } from '@/sidebar/search/AddressInputAutocomplete'
import { getApi } from '@/api/Api'
import { coordinateToText, textToCoordinate } from '@/Converters'
import { tr } from '@/translation/Translation'

export default function Search({
    points,
    routingProfiles,
    selectedProfile,
    autofocus,
    portalRoot,
}: {
    points: QueryPoint[]
    routingProfiles: RoutingProfile[]
    selectedProfile: RoutingProfile
    autofocus: boolean
    portalRoot: HTMLElement
}) {
    return (
        <div className={styles.searchBox}>
            {points.map(point => (
                <PointSearch
                    key={point.id}
                    point={point}
                    deletable={points.length > 2}
                    focus={false}
                    onChange={value => {
                        Dispatcher.dispatch(new ClearRoute())
                        Dispatcher.dispatch(new InvalidatePoint(point))
                    }}
                    modalContainer={portalRoot}
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
}

function Portal({ children, container, y }: { container: HTMLElement; children: React.ReactNode; y: number }) {
    const element = useRef(document.createElement('div'))

    useEffect(() => {
        console.log('effect')
        element.current.style.top = Math.min(y, Math.max(0, y - 60)) + 'px'
        element.current.style.position = 'absolute'
        element.current.style.width = '100%'
        container.appendChild(element.current)
        return () => {
            container.removeChild(element.current)
        }
    }, [container, element])

    return createPortal(children, element.current)
}

function PointSearch({
    point,
    deletable,
    focus,
    onChange,
    modalContainer,
}: {
    point: QueryPoint
    deletable: boolean
    focus: boolean
    onChange: (value: string) => void
    modalContainer: HTMLElement
}) {
    // controlled component pattern with initial value set from props
    const [text, setText] = useState(point.queryText)
    useEffect(() => setText(point.queryText), [point.queryText])

    // container for geocoding results which get set by the geocoder class and set to empty if the underlying query point gets changed from outside
    // also gets filled with an item to select the current location as input if input has focus and geocoding results are
    // empty
    const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>([])
    const [geocoder] = useState(
        new Geocoder(getApi(), hits => {
            const items = hits.map(hit => {
                return { type: 'geocoding', hit: hit } as GeocodingItem
            })
            setScreenCoordinates(searchInput.current!.getBoundingClientRect().top)
            setAutocompleteItems(items)
        })
    )
    useEffect(() => setAutocompleteItems([]), [point])

    // highlighted result of geocoding results. Keep track which index is highlighted and change things on ArrowUp and Down
    // on Enter select highlighted result or the 0th if nothing is highlighted
    const [highlightedResult, setHighlightedResult] = useState<number>(-1)
    useEffect(() => setHighlightedResult(-1), [autocompleteItems])
    const searchInput = useRef<HTMLInputElement>(null)
    const [screenCoordinates, setScreenCoordinates] = useState(0)
    const onKeypress = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Escape') {
                searchInput.current!.blur()
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
                    const coordinate = textToCoordinate(text)
                    if (coordinate) {
                        Dispatcher.dispatch(
                            new SetPoint({
                                ...point,
                                isInitialized: true,
                                coordinate: coordinate,
                                queryText: coordinateToText(coordinate),
                            })
                        )
                    } else if (autocompleteItems.length !== 0) {
                        // by default use the first result, otherwise the highlighted one
                        const index = highlightedResult >= 0 ? highlightedResult : 0
                        const item = autocompleteItems[index] as GeocodingItem
                        Dispatcher.dispatch(
                            new SetPoint({
                                ...point,
                                queryText: item.hit.name,
                                coordinate: item.hit.point,
                                isInitialized: true,
                            })
                        )
                    }
                    searchInput.current!.blur()
                    break
            }
        },
        [autocompleteItems, highlightedResult]
    )

    return (
        <>
            <div className={styles.markerContainer}>
                <MarkerComponent color={point.color} />
            </div>
            <input
                className={styles.pointInput}
                type="text"
                autoFocus={focus}
                value={text}
                onChange={e => {
                    setText(e.target.value)
                    const coordinate = textToCoordinate(e.target.value)
                    if (!coordinate) geocoder.request(e.target.value)
                }}
                onFocus={event => {
                    event.target.select()
                }}
                onBlur={() => {
                    geocoder.cancel()
                    //setAutocompleteItems([])
                }}
                onKeyDown={onKeypress}
                ref={searchInput}
            />

            {deletable && (
                <PlainButton
                    onClick={() => Dispatcher.dispatch(new RemovePoint(point))}
                    className={styles.removeSearchBox}
                >
                    <RemoveIcon />
                </PlainButton>
            )}
            {autocompleteItems.length > 0 && (
                <Portal container={modalContainer} y={screenCoordinates}>
                    <Autocomplete
                        items={autocompleteItems}
                        highlightedItem={autocompleteItems[highlightedResult]}
                        onSelect={item => {
                            const geocodingItem = item as GeocodingItem
                            Dispatcher.dispatch(
                                new SetPoint({
                                    ...point,
                                    queryText: geocodingItem.hit.name,
                                    coordinate: geocodingItem.hit.point,
                                    isInitialized: true,
                                })
                            )
                            searchInput.current!.blur()
                        }}
                    />
                </Portal>
            )}
        </>
    )
}

function calculateHighlightedIndex(length: number, currentIndex: number, incrementBy: number) {
    const nextIndex = currentIndex + incrementBy
    if (nextIndex >= length) return 0
    if (nextIndex < 0) return length - 1
    return nextIndex
}

/* export default function Search({
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
    points.every(point => point.isInitialized)
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
}

 */

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
