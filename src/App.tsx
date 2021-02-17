import React from 'react'
import { MapComponent } from '@/MapComponent'
import Sidebar from '@/Sidebar'

import styles from './App.module.css'

export default function App() {
    return (
        <div className={styles.appWrapper}>
            <div className={styles.map}>
                <MapComponent />
            </div>
            <div className={styles.sidebar}>
                <div className={styles.sidebarContent}>
                    <Sidebar />
                </div>
            </div>
        </div>
    )
}
