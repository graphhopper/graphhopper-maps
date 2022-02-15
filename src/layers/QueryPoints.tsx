import React, { useEffect, useRef } from 'react'
import { Map, Overlay } from 'ol'
import { MarkerComponent } from '@/map/Marker'
import { fromLonLat } from 'ol/proj'
import { QueryPoint, QueryPointType } from '@/stores/QueryStore'

interface QueryPointsProps {
    map: Map
    queryPoints: QueryPoint[]
}

export default function QueryPoints({ map, queryPoints }: QueryPointsProps) {
    const divRefs = useRef<Array<HTMLDivElement | null>>([])
    useEffect(() => {
        //todo: when we clear (make not initialized) a query point field the app crashes with this error:
        //      react-dom.development.js:10301 Uncaught DOMException: Failed to execute 'removeChild' on 'Node':
        //      The node to be removed is not a child of this node.
        //      -> not sure how to fix this
        divRefs.current = divRefs.current.slice(0, queryPoints.filter(q => q.isInitialized).length)
        map.getOverlays()
            .getArray()
            .filter(l => l.get('gh:query_point_overlay'))
            .forEach(l => map.removeOverlay(l))
        queryPoints
            .map((point, i) => {
                return { index: i, point: point}
            })
            .filter(q => q.point.isInitialized)
            .map((q, i) => {
                const overlay = new Overlay({
                    position: fromLonLat([q.point.coordinate.lng, q.point.coordinate.lat]),
                    positioning: 'bottom-center',
                    element: divRefs.current[i]!,
                })
                overlay.set('gh:query_point_overlay', true)
                overlay.set('gh:query_point', q.point)
                map.addOverlay(overlay)
            })
    }, [queryPoints])

    return (
        <>
            {queryPoints
                .map((point, i) => {
                    return { index: i, point: point}
                })
                .filter(q => q.point.isInitialized)
                .map((q, i) => {
                return (
                    <div key={i} ref={el => (divRefs.current[i] = el)}>
                        <MarkerComponent
                            color={q.point.color}
                            // todo: q.index or i? we won't need the index/point mapping if it should be i, but maybe
                            //       when we add dragging interactions we need it again. The difference is that q.index
                            //       is the index of the query points (input fields) and i is just the index of the
                            //       query points that were initialized.
                            number={q.point.type == QueryPointType.Via ? q.index : undefined}
                            size={35}
                        />
                    </div>
                )
            })}
        </>
    )
}
