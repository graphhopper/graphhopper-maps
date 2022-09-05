import React, { useState } from 'react'
import styles from './MapOptions.modules.css'
import { MapOptionsStoreState, StyleOption } from '@/stores/MapOptionsStore'
import Dispatcher from '@/stores/Dispatcher'
import { SelectMapStyle, ToggleRoutingGraph } from '@/actions/Actions'
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
                    onStyleChange(e.target as HTMLInputElement, storeState.styleOptions)
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
                <div>
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
            )}
        </div>
    )
}

function onStyleChange(target: HTMLInputElement, options: StyleOption[]) {
    const option = options.find(option => option.name === target.value)
    if (option) Dispatcher.dispatch(new SelectMapStyle(option))
}
