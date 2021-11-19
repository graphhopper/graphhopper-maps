import React, { useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/search/Search.module.css'
import { Coordinate, QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { AddPoint, ClearRoute, InvalidatePoint, RemovePoint, SetPoint } from '@/actions/Actions'
import RoutingProfiles from '@/sidebar/search/RoutingProfiles'
import RemoveIcon from '../times-solid.svg'
import AddIcon from './plus-circle-solid.svg'
import PlainButton from '@/PlainButton'
import { GeocodingHit, RoutingProfile } from '@/api/graphhopper'

import AddressInput, { Geocoder } from '@/sidebar/search/AddressInput'
import { MarkerComponent } from '@/map/Marker'
import { convertToQueryText, textToCoordinate } from '@/Converters'
import Api, { getApi } from '@/api/Api'
import Autocomplete, {
    AutocompleteItem,
    GeocodingItem,
    isGeocodingItem,
} from '@/sidebar/search/AddressInputAutocomplete'

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
    const [currentQueryPoint, setCurrentQueryPoint] = useState<QueryPoint | null>(null)
    return currentQueryText ? (
        <FullSizeAutocomplete
            query={currentQueryText}
            onSelect={(text, coordinate) => {
                setCurrentQueryText('')
                setCurrentQueryPoint(null)
                Dispatcher.dispatch(
                    coordinate
                        ? new SetPoint({
                              ...currentQueryPoint!,
                              isInitialized: true,
                              queryText: text,
                              coordinate: coordinate,
                          })
                        : new SetPoint({
                              ...currentQueryPoint!,
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
                    onChange={value => {
                        setCurrentQueryPoint(point)
                        setCurrentQueryText(value)
                        Dispatcher.dispatch(new ClearRoute())
                        Dispatcher.dispatch(new InvalidatePoint(point))
                    }}
                />
            ))}
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
    onSelect: (queryText: string, coordinate: Coordinate) => void
}) {
    const [value, setValue] = useState(query)

    const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>([])
    const [geocoder] = useState(
        new Geocoder(getApi(), hits => {
            const items = hits.map(hit => {
                return { type: 'geocoding', hit: hit } as GeocodingItem
            })
            setAutocompleteItems(items)
        })
    )

    function handleChange(value: string) {
        setValue(value)
        const coordinate = textToCoordinate(value)
        if (!coordinate) geocoder.request(value)
    }

    return (
        <div>
            <input type="text" autoFocus value={value} onChange={e => handleChange(e.target.value)} />
            {autocompleteItems.length > 0 && (
                <Autocomplete
                    items={autocompleteItems}
                    highlightedItem={autocompleteItems[0]}
                    onSelect={item => {
                        if (isGeocodingItem(item)) onSelect(convertToQueryText(item.hit), item.hit.point)
                    }}
                />
            )}
        </div>
    )
}

function PointSearch({
    point,
    deletable,
    onChange,
}: {
    point: QueryPoint
    deletable: boolean
    onChange: (value: string) => void
}) {
    return (
        <>
            <div className={styles.markerContainer}>
                <MarkerComponent color={point.color} />
            </div>
            <input
                type="text"
                defaultValue={point.queryText}
                onChange={e => {
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
