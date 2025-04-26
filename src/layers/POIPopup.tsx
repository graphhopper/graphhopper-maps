import React from 'react'
import styles from '@/layers/MapFeaturePopup.module.css'
import MapPopup from '@/layers/MapPopup'
import { POI, POIsStoreState } from '@/stores/POIsStore'
import { tr } from '@/translation/Translation'
import Dispatcher from '@/stores/Dispatcher'
import { SelectPOI, SetPoint, SetPOIs } from '@/actions/Actions'
import PlainButton from '@/PlainButton'
import { MarkerComponent } from '@/map/Marker'
import QueryStore, { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { Map } from 'ol'

function POITable(props: { poi: POI }) {
    return (
        <table className={styles.poiPopupTable}>
            <tbody>
                {Object.entries(props.poi.tags).map(([key, value]) => {
                    const url = value.startsWith('https://') || value.startsWith('http://')
                    const tel = key.toLowerCase().includes('phone')
                    const email = key.toLowerCase().includes('email')
                    const valueArr = value.split(':').map(v => v.trim())
                    const wiki = key.toLowerCase().includes('wikipedia') && valueArr.length == 2
                    const wikiUrl = wiki
                        ? 'https://' + valueArr[0] + '.wikipedia.org/wiki/' + encodeURIComponent(valueArr[1])
                        : ''
                    // tags like amenity:restaurant should not be shown if it is a restaurant
                    const poiInfoRepeated = props.poi.query.queries
                        ? props.poi.query.queries.some(q => q.phrases.some(q => q.k == key && q.v === value))
                        : false
                    // prettier-ignore
                    const showRow = !poiInfoRepeated && key !== 'source' && key !== 'image' && key !== 'check_data'
                        && !key.includes('fax') && !key.startsWith('addr') && !key.startsWith('name') && !key.startsWith('building')
                    return (
                        showRow && (
                            <tr key={key}>
                                <td>{key}</td>
                                <td>
                                    {url && (
                                        <a href={value} target="_blank">
                                            {value}
                                        </a>
                                    )}
                                    {tel && <a href={'tel:' + value}>{value}</a>}
                                    {email && <a href={'mailto:' + value}>{value}</a>}
                                    {wiki && (
                                        <a href={wikiUrl} target="_blank">
                                            {value}
                                        </a>
                                    )}
                                    {!url && !tel && !email && !wiki && value}
                                </td>
                            </tr>
                        )
                    )
                })}
            </tbody>
        </table>
    )
}

interface POIStatePopupProps {
    map: Map
    poiState: POIsStoreState
    points: QueryPoint[]
}

/**
 * The popup shown when certain map features are hovered. For example a road of the routing graph layer.
 */
export default function POIStatePopup({ map, poiState, points }: POIStatePopupProps) {
    const selectedPOI = poiState.selected
    const type = selectedPOI?.osm_type

    function fire(index: number) {
        if (selectedPOI && index < points.length) {
            const queryPoint = {
                ...points[index],
                queryText: selectedPOI?.name,
                coordinate: selectedPOI?.coordinate,
                isInitialized: true,
            }
            Dispatcher.dispatch(new SetPoint(queryPoint, false))
            Dispatcher.dispatch(new SelectPOI(null))
            Dispatcher.dispatch(new SetPOIs([]))
        }
    }

    return (
        <MapPopup map={map} coordinate={selectedPOI ? selectedPOI.coordinate : null}>
            <div className={styles.poiPopup}>
                <div>{selectedPOI?.name}</div>
                <div>{selectedPOI?.address}</div>
                <div className={styles.poiPopupButton} onClick={() => fire(0)}>
                    <MarkerComponent color={QueryStore.getMarkerColor(QueryPointType.From)} size={18} />
                    <PlainButton>{tr('as_start')}</PlainButton>
                </div>
                <div className={styles.poiPopupButton} onClick={() => fire(points.length - 1)}>
                    <MarkerComponent color={QueryStore.getMarkerColor(QueryPointType.To)} size={18} />
                    <PlainButton>{tr('as_destination')}</PlainButton>
                </div>
                {selectedPOI && <POITable poi={selectedPOI} />}
                <div className={styles.osmLink}>
                    <a href={'https://www.openstreetmap.org/' + type + '/' + selectedPOI?.osm_id} target="_blank">
                        OpenStreetMap.org
                    </a>
                </div>
            </div>
        </MapPopup>
    )
}
