import React, { useEffect, useState } from 'react'
import styles from '@/layers/MapFeaturePopup.module.css'
import MapPopup from '@/layers/MapPopup'
import { Map } from 'ol'
import { POIsStoreState } from '@/stores/POIsStore'
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

async function fetchInfo(url: string): Promise<TagHash> {
    try {
        const response = await fetch(url)
        if (!response.ok) return { status: response.statusText }
        const xmlText = await response.text()
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml')
        const tags = xmlDoc.querySelectorAll('tag')
        const hash: Record<string, string> = {}
        tags.forEach(tag => {
            const key = tag.getAttribute('k')
            const value = tag.getAttribute('v')
            if (key && value) hash[key] = value
        })

        return hash
    } catch (error) {
        return { status: '' + error }
    }
}

function KVTable(props: { kv: TagHash }) {
    return (
        <table className={styles.poiPopupTable}>
            <tbody>
                {Object.entries(props.kv).map(([key, value]) => {
                    const url = value.startsWith('https://')
                    const tel = key.toLowerCase().includes('phone')
                    const email = key.toLowerCase().includes('email')
                    const valueArr = value.split(':').map(v => v.trim())
                    const wiki = key.toLowerCase().includes('wikipedia') && valueArr.length == 2
                    const wikiUrl = wiki
                        ? 'https://' + valueArr[0] + '.wikipedia.org/wiki/' + encodeURIComponent(valueArr[1])
                        : ''
                    return (
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
    const path = (t === 'W' ? 'way' : t === 'N' ? 'node' : 'relation') + '/' + selectedPOI?.osm_id
    const [kv, setKV] = useState<TagHash>({})

    useEffect(() => {
        return () => {
            setKV({})
        }
    }, [poiState.selected])

    return (
        <MapPopup map={map} coordinate={selectedPOI ? selectedPOI.coordinate : null}>
            <div className={styles.poiPopup}>
                <div>{selectedPOI?.name}</div>
                <div>{selectedPOI?.address}</div>
                {Object.keys(kv).length == 0 && (
                    <PlainButton
                        onClick={e => {
                            fetchInfo('https://www.openstreetmap.org/api/0.6/' + path).then(tagHash => setKV(tagHash))
                        }}
                    >
                        {tr('Fetch more info')}
                    </PlainButton>
                )}
                <KVTable kv={kv} />
                <div className={styles.osmLink}>
                    <a  href={'https://www.openstreetmap.org/' + path} target="_blank">
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
