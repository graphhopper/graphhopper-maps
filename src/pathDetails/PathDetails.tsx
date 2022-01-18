import React, { useEffect, useRef, useState } from 'react'
import styles from '@/pathDetails/PathDetails.module.css'
import { HeightGraph } from 'leaflet.heightgraph/src/heightgraph'
import 'leaflet.heightgraph/src/heightgraph.css'
import { Path } from '@/api/graphhopper'
import Dispatcher from '@/stores/Dispatcher'
import { PathDetailsElevationSelected, PathDetailsHover, PathDetailsRangeSelected } from '@/actions/Actions'
import QueryStore, { Coordinate, QueryPointType } from '@/stores/QueryStore'
import { Position } from 'geojson'

interface PathDetailsProps {
    selectedPath: Path
}

export default function ({ selectedPath }: PathDetailsProps) {
    // keep a ref to the container to determine the size of the graph,
    const containerRef: React.RefObject<HTMLDivElement> = useRef(null)

    // keep a ref to the container of the actual graph and pass it to the graph once the container is mounted
    const heightgraphRef: React.RefObject<HTMLDivElement> = useRef(null)
    const [graph, setGraph] = useState<any | null>(null)
    useEffect(() => {
        const options = {
            width: clampWidth(containerRef.current!.clientWidth),
            height: 224,
            expandControls: true,
        }
        const callbacks = {
            pointSelectedCallback: onPathDetailHover,
            areaSelectedCallback: onRangeSelected,
            routeSegmentsSelectedCallback: onElevationSelected,
        }
        setGraph(new HeightGraph(heightgraphRef.current, options, callbacks))
    }, [heightgraphRef])

    // the graph needs to be resized when the window size changes and when the component mounts
    // because then the width will be 0 first and then a plausible value after the layout pass
    const resizeGraph = () => {
        graph?.resize({ width: clampWidth(containerRef.current!.clientWidth) })
    }
    useEffect(() => {
        window.addEventListener('resize', resizeGraph)
        return () => window.removeEventListener('resize', resizeGraph)
    })

    // set data in case anything changes
    useEffect(() => {
        const pathDetailsData = buildPathDetailsData(selectedPath)
        graph?.setData(pathDetailsData.data, pathDetailsData.mappings)
    }, [selectedPath, graph])

    // render the container
    const isPathPresent = selectedPath.points.coordinates.length !== 0
    const style: any = { display: isPathPresent ? null : 'none' }
    return (
        <div className={styles.heightgraphContainer} ref={containerRef}>
            <div className={styles.innerDiv} style={style} ref={heightgraphRef} />
        </div>
    )
}

function clampWidth(clientWidth: number) {
    return Math.min(clientWidth, 1000)
}

/** executed when we hover the mouse over the path details diagram */
function onPathDetailHover(point: Coordinate, elevation: string, description: string) {
    Dispatcher.dispatch(new PathDetailsHover(point ? { point, elevation, description } : null))
}

/** executed when we box-select a range of the path details diagram */
function onRangeSelected(bbox: { sw: Coordinate; ne: Coordinate } | null) {
    // bbox = null means that the range was cleared
    Dispatcher.dispatch(
        new PathDetailsRangeSelected(bbox ? [bbox.sw.lng, bbox.sw.lat, bbox.ne.lng, bbox.ne.lat] : null)
    )
}

/** executed when we use the vertical elevation slider on the right side of the diagram */
function onElevationSelected(segments: Coordinate[][]) {
    Dispatcher.dispatch(new PathDetailsElevationSelected(segments))
}

function buildPathDetailsData(selectedPath: Path) {
    let points = selectedPath.points.coordinates.map((pos: Position) => (pos.length == 2 ? [...pos, 0] : pos))
    const elevation = createFeatureCollection('Elevation [m]', [createFeature(points, 'elevation')])
    const pathDetails = Object.entries(selectedPath.details).map(([detailName, details]) => {
        const features = details.map(([from, to, value = 'Undefined']: [number, number, string | number]) =>
            createFeature(points.slice(from, to + 1), value)
        )
        return createFeatureCollection(detailName, features)
    })
    const mappings: any = {
        'Elevation [m]': function () {
            return { text: 'Elevation [m]', color: QueryStore.getMarkerColor(QueryPointType.From) }
        },
    }
    Object.entries(selectedPath.details).forEach(([detailName, details]: [string, PathDetails]) => {
        mappings[detailName] = createColorMapping(details)
    })
    return {
        data: [elevation, ...pathDetails],
        mappings,
    }
}

function createColorMapping(detail: PathDetails): (attributeType: any) => { text: string; color: string } {
    const detailInfo: any = inspectDetail(detail)
    if (detailInfo.numeric === true && detailInfo.minVal !== detailInfo.maxVal) {
        // for numeric details we use a color gradient, taken from here:  https://uigradients.com/#Superman
        const colorMin = [0, 153, 247]
        const colorMax = [241, 23, 18]
        return function (attributeType: number) {
            const factor = (attributeType - detailInfo.minVal) / (detailInfo.maxVal - detailInfo.minVal)
            const color = []
            for (let i = 0; i < 3; i++) color.push(colorMin[i] + factor * (colorMax[i] - colorMin[i]))
            return {
                text: '' + attributeType,
                color: 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')',
            }
        }
    } else {
        // for discrete encoded values we use discrete colors
        const values = (detail as [number, number, string][]).map(d => d[2])
        return function (attributeType: string) {
            // we choose a color-blind friendly palette from here: https://personal.sron.nl/~pault/#sec:qualitative
            // see also this: https://thenode.biologists.com/data-visualization-with-flying-colors/research/
            const palette = [
                '#332288',
                '#88ccee',
                '#44aa99',
                '#117733',
                '#999933',
                '#ddcc77',
                '#cc6677',
                '#882255',
                '#aa4499',
            ]
            const missingColor = '#dddddd'
            const index = values.indexOf(attributeType) % palette.length
            const color =
                attributeType === 'missing' || attributeType === 'unclassified' || attributeType === 'Undefined'
                    ? missingColor
                    : palette[index]
            return {
                text: attributeType,
                color: color,
            }
        }
    }
}

function inspectDetail(detail: PathDetails): {
    numeric: boolean
    minVal: number | undefined
    maxVal: number | undefined
} {
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
        maxVal: maxVal,
    }
}

function createFeature(coordinates: number[][], attributeType: number | string) {
    return {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: coordinates,
        },
        properties: {
            attributeType: attributeType,
        },
    }
}

function createFeatureCollection(detailName: string, features: any[]) {
    return {
        type: 'FeatureCollection',
        features: features,
        properties: {
            summary: detailName,
            records: features.length,
        },
    }
}

type PathDetails = [number, number, number][] | [number, number, string][]
