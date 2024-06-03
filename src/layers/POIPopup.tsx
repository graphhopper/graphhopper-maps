import React, { useEffect, useState } from 'react'
import styles from '@/layers/MapFeaturePopup.module.css'
import MapPopup from '@/layers/MapPopup'
import { Map } from 'ol'
import { POI, POIsStoreState } from '@/stores/POIsStore'
import { tr } from '@/translation/Translation'
import Dispatcher from '@/stores/Dispatcher'
import { SelectPOI, SetPoint, SetPOIs } from '@/actions/Actions'
import PlainButton from '@/PlainButton'
import { MarkerComponent } from '@/map/Marker'

interface POIStatePopupProps {
    map: Map
    poiState: POIsStoreState
}

interface TagHash {
    [key: string]: string
}

async function fetchInfo(type: string, ids: string[]): Promise<TagHash> {
    try {
        const data = `[out:json][timeout:15];
            (${type}(id:${ids.join(',')}););
            out body;`
        const result = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: 'data=' + encodeURIComponent(data),
        })
        const json = await result.json()
        if (json.elements.length > 0) return json.elements[0].tags
        else return { status: 'empty' }
    } catch (error) {
        return { status: '' + error }
    }
}

function KVTable(props: { kv: TagHash; poi: POI | null }) {
    return (
        <table className={styles.poiPopupTable}>
            <tbody>
                {Object.entries(props.kv).map(([key, value]) => {
                    const url = value.startsWith('https://') || value.startsWith('http://')
                    const tel = key.toLowerCase().includes('phone')
                    const email = key.toLowerCase().includes('email')
                    const valueArr = value.split(':').map(v => v.trim())
                    const wiki = key.toLowerCase().includes('wikipedia') && valueArr.length == 2
                    const wikiUrl = wiki
                        ? 'https://' + valueArr[0] + '.wikipedia.org/wiki/' + encodeURIComponent(valueArr[1])
                        : ''
                    // tags like amenity:restaurant should not be shown if it is a restaurant (determined by poi.tags)
                    const poiInfoRepeated = props.poi ? props.poi.tags.some(kv => kv.k == key && kv.v === value) : false
                    return (
                        !poiInfoRepeated &&
                        key !== 'source' &&
                        key !== 'image' &&
                        !key.includes('fax') &&
                        !key.startsWith('addr') &&
                        !key.startsWith('name') &&
                        !key.startsWith('building') && (
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

/**
 * The popup shown when certain map features are hovered. For example a road of the routing graph layer.
 */
export default function POIStatePopup({ map, poiState }: POIStatePopupProps) {
    const selectedPOI = poiState.selected
    const oldQueryPoint = poiState.oldQueryPoint
    const t = selectedPOI?.osm_type
    const type = t === 'W' ? 'way' : t === 'N' ? 'node' : 'relation'
    const [kv, setKV] = useState<TagHash>({})

    useEffect(() => {
        if (selectedPOI) fetchInfo(type, [selectedPOI.osm_id]).then(tagHash => setKV(tagHash))
        return () => {
            setKV({})
        }
    }, [poiState.selected])

    return (
        <MapPopup map={map} coordinate={selectedPOI ? selectedPOI.coordinate : null}>
            <div className={styles.poiPopup}>
                <div>{selectedPOI?.name}</div>
                <div>{selectedPOI?.address}</div>
                {Object.keys(kv).length == 0 && <PlainButton>{tr('Fetching more info...')}</PlainButton>}
                <KVTable kv={kv} poi={selectedPOI} />
                <div className={styles.osmLink}>
                    <a href={'https://www.openstreetmap.org/' + type + '/' + selectedPOI?.osm_id} target="_blank">
                        OpenStreetMap.org
                    </a>
                </div>
                <div className={styles.poiPopupButton}>
                    {oldQueryPoint && <MarkerComponent color={oldQueryPoint.color} size={18} />}
                    <PlainButton
                        onClick={() => {
                            if (selectedPOI && oldQueryPoint) {
                                // TODO NOW how to use the POI as either start or destination?
                                //  Might be too unintuitive if it relies on with which input we searched the POIs
                                const queryPoint = {
                                    ...oldQueryPoint,
                                    queryText: selectedPOI?.name,
                                    coordinate: selectedPOI?.coordinate,
                                    isInitialized: true,
                                }
                                Dispatcher.dispatch(new SetPoint(queryPoint, false))
                                Dispatcher.dispatch(new SelectPOI(null))
                                Dispatcher.dispatch(new SetPOIs([], null))
                            }
                        }}
                    >
                        {tr('Use in route')}
                    </PlainButton>
                </div>
            </div>
        </MapPopup>
    )
}
