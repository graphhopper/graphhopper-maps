import { useState } from 'react'
import styles from './MapOptions.module.css'
import { MapOptionsStoreState } from '@/stores/MapOptionsStore'
import Dispatcher from '@/stores/Dispatcher'
import { SelectMapLayer, ToggleExternalMVTLayer, ToggleRoutingGraph, ToggleUrbanDensityLayer } from '@/actions/Actions'
import PlainButton from '@/PlainButton'
import LayerImg from './layer-group-solid.svg'
import * as config from 'config'

export default function (props: MapOptionsStoreState) {
    const [isOpen, setIsOpen] = useState(false)
    return (
        <div
            className={styles.mapOptionsContainer}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            {isOpen ? (
                <Options storeState={props} notifyChanged={() => setIsOpen(false)} />
            ) : (
                <PlainButton className={styles.layerButton} onClick={() => setIsOpen(true)}>
                    <LayerImg />
                </PlainButton>
            )}
        </div>
    )
}

interface OptionsProps {
    storeState: MapOptionsStoreState
    notifyChanged: { (): void }
}

const Options = function ({ storeState, notifyChanged }: OptionsProps) {
    return (
        <div className={styles.options}>
            <div
                onChange={e => {
                    notifyChanged()
                    onStyleChange(e.target as HTMLInputElement)
                }}
            >
                {storeState.styleOptions.map(option => (
                    <div className={styles.option} key={option.name}>
                        <input
                            type="radio"
                            id={option.name}
                            name="layer"
                            value={option.name}
                            defaultChecked={option === storeState.selectedStyle}
                            disabled={!storeState.isMapLoaded}
                        />
                        <label htmlFor={option.name}>
                            {option.name + (option.type === 'vector' ? ' (Vector)' : '')}
                        </label>
                    </div>
                ))}
            </div>
            {config.routingGraphLayerAllowed && (
                <>
                    <div className={styles.option}>
                        <input
                            type="checkbox"
                            id="routing-graph-checkbox"
                            checked={storeState.routingGraphEnabled}
                            onChange={e => {
                                notifyChanged()
                                Dispatcher.dispatch(new ToggleRoutingGraph(e.target.checked))
                            }}
                        />
                        <label htmlFor="routing-graph-checkbox">Show Routing Graph</label>
                    </div>
                    <div className={styles.option}>
                        <input
                            type="checkbox"
                            id="urban-density-checkbox"
                            checked={storeState.urbanDensityEnabled}
                            onChange={e => {
                                notifyChanged()
                                Dispatcher.dispatch(new ToggleUrbanDensityLayer(e.target.checked))
                            }}
                        />
                        <label htmlFor="urban-density-checkbox">Show Urban Density</label>
                    </div>
                </>
            )}
            {config.externalMVTLayer && (
                <>
                    <div className={styles.option}>
                        <input
                            type="checkbox"
                            id="external-mvt-layer-checkbox"
                            checked={storeState.externalMVTEnabled}
                            onChange={e => {
                                notifyChanged()
                                Dispatcher.dispatch(new ToggleExternalMVTLayer(e.target.checked))
                            }}
                        />
                        <label htmlFor="external-mvt-layer-checkbox">Show External MVT</label>
                    </div>
                </>
            )}
        </div>
    )
}

function onStyleChange(target: HTMLInputElement) {
    Dispatcher.dispatch(new SelectMapLayer(target.value))
}
