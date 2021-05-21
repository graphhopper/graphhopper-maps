import React, { useEffect, useRef, useState } from 'react'
import styles from '@/pathDetails/PathDetails.module.css'
import { HeightGraph } from 'leaflet.heightgraph/src/heightgraph'
import 'leaflet.heightgraph/src/heightgraph.css'
import { Path } from '@/api/graphhopper'
import Dispatcher from '@/stores/Dispatcher'
import { PathDetailsElevationSelected, PathDetailsHover, PathDetailsRangeSelected } from '@/actions/Actions'
import { Coordinate } from '@/stores/QueryStore'

interface PathDetailsProps {
    selectedPath: Path
}

export default function({ selectedPath }: PathDetailsProps) {
    const containerRef: React.RefObject<HTMLDivElement> = useRef(null)
    const [graph, setGraph] = useState<any | null>(null)
    useEffect(() => {
        const options = {
            // todo: is this the right way to do this? for example it should adjust its size when the browser window
            //       size is changed
            width: containerRef.current!.clientWidth,
            height: containerRef.current!.clientHeight,
            // todo: since we do not use this maybe we can/should remove the svg asset rules again because this we added
            //       them just for this...
            expandControls: false
        }
        const callbacks = {
            pointSelectedCallback: onPathDetailHover,
            areaSelectedCallback: onRangeSelected,
            routeSegmentsSelectedCallback: onElevationSelected
        }
        setGraph(new HeightGraph(containerRef.current, options, callbacks))
    }, [containerRef])
    useEffect(() => {
        const pathDetailsData = buildPathDetailsData(selectedPath)
        graph?.setData(pathDetailsData.data, pathDetailsData.mappings)
    }, [selectedPath, graph])
    return (
        <div className={styles.pathDetailsContainer} ref={containerRef}></div>
    )
}

/** executed when we hover the mouse over the path details diagram */
function onPathDetailHover(point: Coordinate, elevation: string, description: string) {
    Dispatcher.dispatch(
        new PathDetailsHover(point ? { point, elevation, description } : null))
}

/** executed when we box-select a range of the path details diagram */
function onRangeSelected(bbox: { sw: Coordinate, ne: Coordinate } | null) {
    // bbox = null means that the range was cleared
    Dispatcher.dispatch(new PathDetailsRangeSelected(bbox ? [bbox.sw.lng, bbox.sw.lat, bbox.ne.lng, bbox.ne.lat] : null))
}

/** executed when we use the vertical elevation slider on the right side of the diagram */
function onElevationSelected(segments: Coordinate[][]) {
    Dispatcher.dispatch(new PathDetailsElevationSelected(segments))
}

function buildPathDetailsData(selectedPath: Path) {
    const elevation = createFeatureCollection(
        'Elevation [m]',
        [createFeature(selectedPath.points.coordinates, 'elevation')]
    )
    const pathDetails = Object.entries(selectedPath.details).map(([detailName, details]) => {
        const points = selectedPath.points.coordinates
        const features = details.map(([from, to, value = 'Undefined']: [number, number, string | number]) =>
            createFeature(points.slice(from, to + 1), value))
        return createFeatureCollection(detailName, features)
    })
    const mappings: any = {
        'Elevation [m]': function() {
            return { text: 'Elevation [m]', color: '#27ce49' }
        }
    }
    Object.entries(selectedPath.details).forEach(([detailName, details]) => {
        mappings[detailName] = createColorMapping(details)
    })
    return {
        data: [elevation, ...pathDetails],
        mappings
    }
}

function createColorMapping(detail: any): any {
    const detailInfo: any = inspectDetail(detail)
    if (detailInfo.numeric === true && detailInfo.minVal !== detailInfo.maxVal) {
        // for numeric details we use a color gradient, taken from here:  https://uigradients.com/#Superman
        const colorMin = [0, 153, 247]
        const colorMax = [241, 23, 18]
        return function(attributeType: number) {
            const factor = (attributeType - detailInfo.minVal) / (detailInfo.maxVal - detailInfo.minVal)
            const color = []
            for (let i = 0; i < 3; i++)
                color.push(colorMin[i] + factor * (colorMax[i] - colorMin[i]))
            return {
                'text': attributeType,
                'color': 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')'
            }
        }
    } else {
        // for discrete encoded values we use discrete colors
        const values = detail.map((d: any) => d[2])
        return function(attributeType: string) {
            // we choose a color-blind friendly palette from here: https://personal.sron.nl/~pault/#sec:qualitative
            // see also this: https://thenode.biologists.com/data-visualization-with-flying-colors/research/
            const palette = ['#332288', '#88ccee', '#44aa99', '#117733', '#999933', '#ddcc77', '#cc6677', '#882255', '#aa4499']
            const missingColor = '#dddddd'
            const index = values.indexOf(attributeType) % palette.length
            const color = attributeType === 'missing' || attributeType === 'unclassified' || attributeType === 'Undefined'
                ? missingColor
                : palette[index]
            return {
                'text': attributeType,
                'color': color
            }
        }
    }
}

function inspectDetail(detail: any) {
    // we check if all detail values are numeric
    const numbers = new Set()
    let minVal, maxVal
    let numberCount = 0
    for (let i = 0; i < detail.length; i++) {
        const val = detail[i][2]
        if (typeof val === 'number') {
            if (!minVal) minVal = val
            if (!maxVal) maxVal = val
            numbers.add(val)
            numberCount++
            minVal = Math.min(val, minVal)
            maxVal = Math.max(val, maxVal)
        }
    }
    return {
        numeric: numberCount === detail.length,
        minVal: minVal,
        maxVal: maxVal
    }
}

function createFeature(coordinates: number[][], attributeType: number | string) {
    return {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: coordinates
        },
        properties: {
            attributeType: attributeType
        }
    }
}

function createFeatureCollection(detailName: string, features: any[]) {
    return {
        type: 'FeatureCollection',
        features: features,
        properties: {
            summary: detailName,
            records: features.length
        }
    }
}