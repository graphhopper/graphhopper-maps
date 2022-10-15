import React from 'react'
import styles from '@/sidebar/PoweredBy.module.css'
import Header from '@/sidebar/header.svg'
import PlainButton from '@/PlainButton'
import Dispatcher from '@/stores/Dispatcher'
import { ToggleDistanceUnits } from '@/actions/Actions'
import { tr } from '@/translation/Translation'

export default function PoweredBy() {
    return (
        <div className={styles.poweredByContainer}>
            <span>{tr('powered_by')}</span>
            <a className={styles.logoContainer} href="https://www.graphhopper.com" target="_blank">
                <Header />
            </a>
            {/* todonow: put this somewhere else obviously */}
            <PlainButton onClick={() => Dispatcher.dispatch(new ToggleDistanceUnits())}>toggle units</PlainButton>
        </div>
    )
}
