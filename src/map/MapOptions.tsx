import React, { useState } from 'react'
import styles from './MapOptions.modules.css'
import { StyleOption } from '@/stores/mapOptionsSlice'
import PlainButton from '@/PlainButton'
import LayerImg from './layer-group-solid.svg'
import * as config from 'config'
import { store, useStore } from '@/stores/useStore'

export default function () {
    const [isOpen, setIsOpen] = useState(false)
    return (
        <div
            className={styles.mapOptionsContainer}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            {isOpen ? (
                <Options notifyChanged={() => setIsOpen(false)} />
            ) : (
                <PlainButton className={styles.layerButton} onClick={() => setIsOpen(true)}>
                    <LayerImg />
                </PlainButton>
            )}
        </div>
    )
}

interface OptionsProps {
    notifyChanged: { (): void }
}

const Options = function ({ notifyChanged }: OptionsProps) {
    const styleOptions = useStore(state => state.styleOptions)
    const selectedStyle = useStore(state => state.selectedStyle)
    const isMapLoaded = useStore(state => state.isMapLoaded)
    const routingGraphEnabled = useStore(state => state.routingGraphEnabled)
    const urbanDensityEnabled = useStore(state => state.urbanDensityEnabled)
    return (
        <div className={styles.options}>
            <div
                onChange={e => {
                    notifyChanged()
                    onStyleChange(e.target as HTMLInputElement, styleOptions)
                }}
            >
                {styleOptions.map(option => (
                    <div className={styles.option} key={option.name}>
                        <input
                            type="radio"
                            id={option.name}
                            name="layer"
                            value={option.name}
                            defaultChecked={option === selectedStyle}
                            disabled={!isMapLoaded}
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
                            checked={routingGraphEnabled}
                            onChange={e => {
                                notifyChanged()
                                store.getState().setRoutingGraphEnabled(e.target.checked)
                            }}
                        />
                        <label htmlFor="routing-graph-checkbox">Show Routing Graph</label>
                    </div>
                    <div className={styles.option}>
                        <input
                            type="checkbox"
                            id="urban-density-checkbox"
                            checked={urbanDensityEnabled}
                            onChange={e => {
                                notifyChanged()
                                store.getState().setUrbanDensityLayerEnabled(e.target.checked)
                            }}
                        />
                        <label htmlFor="urban-density-checkbox">Show Urban Density</label>
                    </div>
                </>
            )}
        </div>
    )
}

function onStyleChange(target: HTMLInputElement, options: StyleOption[]) {
    const option = options.find(option => option.name === target.value)
    if (option) store.getState().selectMapStyle(option)
}
