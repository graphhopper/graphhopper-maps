import React, {useEffect, useRef} from 'react'
import styles from '@/pathDetails/PathDetails.module.css'
import {HeightGraph} from 'leaflet.heightgraph/src/heightgraph';
import 'leaflet.heightgraph/src/heightgraph.css'

export default function () {
    const containerRef: React.RefObject<HTMLDivElement> = useRef(null)
    useEffect(() => {
        const options = {
            // todo: is this the right way to do this?
            width: containerRef.current!.clientWidth,
            height: containerRef.current!.clientHeight
        };
        const callbacks = {};
        const hg = new HeightGraph(containerRef.current, options, callbacks);
        hg.setData({
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": []
                    },
                    "properties": {
                        "attributeType": "elevation"
                    }
                }
            ],
            "properties": {
                "summary": "Elevation [m]",
                "records": 1
            }
        });
    }, [containerRef]);
    return (
        <div className={styles.pathDetailsContainer} ref={containerRef}></div>
    )
}