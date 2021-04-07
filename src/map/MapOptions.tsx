import React from 'react'
import styles from './MapOptions.modules.css'
import { MapOptionsStoreState, StyleOption } from '@/stores/MapOptionsStore'
import Dispatcher from '@/stores/Dispatcher'
import { SelectMapStyle } from '@/actions/Actions'

export interface MapOptionsProps {}

export default function (props: MapOptionsStoreState) {
    return (
        <div className={styles.options} onChange={e => onChange(e.target as HTMLInputElement, props.styleOptions)}>
            {props.styleOptions.map(option => (
                <div className={styles.option} key={option.name}>
                    <input
                        type="radio"
                        id={option.name}
                        name="layer"
                        value={option.name}
                        defaultChecked={option === props.selectedStyle}
                    />
                    <label htmlFor={option.name}>{option.name}</label>
                </div>
            ))}
        </div>
    )
}

function onChange(target: HTMLInputElement, options: StyleOption[]) {
    const option = options.find(option => option.name === target.value)

    if (option) Dispatcher.dispatch(new SelectMapStyle(option))
}
