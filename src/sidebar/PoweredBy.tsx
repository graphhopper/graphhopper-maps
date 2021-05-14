import React from 'react'
import styles from '@/sidebar/PoweredBy.module.css'
import Header from '@/sidebar/header.svg'

export default function PoweredBy() {
    return (
        <div className={styles.poweredByContainer}>
            <span>Powered by: </span>
            <div className={styles.logoContainer}>
                <Header />
            </div>
        </div>
    )
}
