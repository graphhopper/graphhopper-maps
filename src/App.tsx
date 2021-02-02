import React from 'react'
import {MapComponent} from "@/MapComponent";
import Sidebar from "@/Sidebar";

const styles = require('./App.css')

export default function App() {
    return (<div className={styles.appWrapper}>
            <div className={styles.map}>
                <MapComponent/>
            </div>
            <div className={styles.sidebar}>
                <Sidebar/>
            </div>
        </div>
    )
}