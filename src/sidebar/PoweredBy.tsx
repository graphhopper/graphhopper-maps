import React from 'react'
import styles from '@/sidebar/PoweredBy.module.css'
import Header from '@/sidebar/header.svg'
import { tr } from '@/translation/Translation'

export default function PoweredBy() {
    return (
        <div className={styles.poweredByContainer}>
            <span>{tr('powered_by')}</span>
            <a className={styles.logoContainer} href="https://www.graphhopper.com" target="_blank">
                <Header />
            </a>
        </div>
    )
}
