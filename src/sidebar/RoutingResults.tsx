import { Instruction, Path } from '@/api/graphhopper'
import { CurrentRequest, RequestState, SubRequest } from '@/stores/QueryStore'
import styles from './RoutingResult.module.css'
import React, { useEffect, useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import { SetSelectedPath } from '@/actions/Actions'
import { metersToText, milliSecondsToText } from '@/Converters'
import PlainButton from '@/PlainButton'
import Details from '@/sidebar/list.svg'
import GPXDownload from '@/sidebar/file_download.svg'
import Instructions from '@/sidebar/instructions/Instructions'
import { Position } from 'geojson'
import { useMediaQuery } from 'react-responsive'
import { tr } from '@/translation/Translation'

export interface RoutingResultsProps {
    paths: Path[]
    selectedPath: Path
    currentRequest: CurrentRequest
}

export default function RoutingResults(props: RoutingResultsProps) {
    // for landscape orientation there is no need that there is space for the map under the 3 alternatives and so the max-height is smaller for short screen
    const isShortScreen = useMediaQuery({ query: '(max-height: 45rem) and (orientation: landscape), (max-height: 70rem) and (orientation: portrait)' })
    return <ul>{isShortScreen ? createSingletonListContent(props) : createListContent(props)}</ul>
}

function RoutingResult({ path, isSelected }: { path: Path; isSelected: boolean }) {
    const [isExpanded, setExpanded] = useState(false)
    const resultSummaryClass = isSelected
        ? styles.resultSummary + ' ' + styles.selectedResultSummary
        : styles.resultSummary

    useEffect(() => setExpanded(isSelected && isExpanded), [isSelected])

    return (
        <div className={styles.resultRow}>
            <div className={styles.resultSelectableArea} onClick={() => Dispatcher.dispatch(new SetSelectedPath(path))}>
                <div className={resultSummaryClass}>
                    <div className={styles.resultValues}>
                        <span className={styles.resultMainText}>{milliSecondsToText(path.time)}</span>
                        <span className={styles.resultSecondaryText}>{metersToText(path.distance)}</span>
                        {path.description && (
                            <span className={styles.resultTertiaryText}>
                                {tr('Via')} {path.description}
                            </span>
                        )}
                    </div>
                    <PlainButton className={styles.gpxButton} onClick={() => downloadGPX(path)}>
                        <GPXDownload />
                        <div>{tr('export_button')}</div>
                    </PlainButton>
                    {isExpanded ? (
                        <PlainButton className={styles.detailsButtonExpanded} onClick={() => setExpanded(false)}>
                            <Details />
                            <div>{tr('hide_button')}</div>
                        </PlainButton>
                    ) : (
                        <PlainButton className={styles.detailsButton} onClick={() => setExpanded(true)}>
                            <Details />
                            <div>{tr('details_button')}</div>
                        </PlainButton>
                    )}
                </div>
            </div>
            {isExpanded && <Instructions instructions={path.instructions} />}
        </div>
    )
}

function downloadGPX(path: Path) {
    let xmlString =
        '<?xml version="1.0" encoding="UTF-8" standalone="no" ?><gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" creator="GraphHopper" version="1.1" xmlns:gh="https://graphhopper.com/public/schema/gpx/1.1">\n'
    xmlString += `<metadata><copyright author="OpenStreetMap contributors"/><link href="http://graphhopper.com"><text>GraphHopper GPX</text></link><time>${new Date().toISOString()}</time></metadata>\n`

    xmlString += path.snapped_waypoints.coordinates.reduce((prevString: string, coord: Position) => {
        return prevString + `<wpt lat="${coord[1]}" lon="${coord[0]}"></wpt>\n`
    }, '')

    xmlString += '<rte>\n'
    xmlString += path.instructions.reduce((prevString: string, instruction: Instruction) => {
        let routeSegment = `<rtept lat="${instruction.points[0][1].toFixed(6)}" lon="${instruction.points[0][0].toFixed(
            6
        )}">`
        routeSegment += `<desc>${instruction.text}</desc><extensions><gh:distance>${instruction.distance}</gh:distance>`
        routeSegment += `<gh:time>${instruction.time}</gh:time><gh:sign>${instruction.sign}</gh:sign>`
        // TODO routeSegment += `<gh:direction>SW</gh:direction><gh:azimuth>222.57</gh:azimuth>` +
        routeSegment += '</extensions></rtept>\n'
        return prevString + routeSegment
    }, '')
    xmlString += '</rte>\n'

    xmlString += '<trk>\n<name>GraphHopper Track</name><desc></desc>\n<trkseg>'
    // TODO include time via path.details.time
    xmlString += path.points.coordinates.reduce((prevString, coord) => {
        let trackPoint = '<trkpt '
        trackPoint += `lat="${coord[1].toFixed(6)}" lon="${coord[0].toFixed(6)}">`
        if (coord.length > 2) trackPoint += `<ele>${coord[2].toFixed(1)}</ele>`
        trackPoint += '</trkpt>\n'
        return prevString + trackPoint
    }, '')
    xmlString += '</trkseg></trk>\n</gpx>'

    const tmpElement = document.createElement('a')
    const file = new Blob([xmlString], { type: 'application/gpx+xml' })
    tmpElement.href = URL.createObjectURL(file)
    const date = new Date()
    tmpElement.download = `GraphHopper-Route-${Math.round(path.distance / 1000)}km-${date.getUTCFullYear()}-${pad(
        date.getUTCMonth() + 1
    )}-${pad(date.getUTCDate())}.gpx`
    tmpElement.click()
}

function pad(value: number) {
    return value < 10 ? '0' + value : '' + value
}

function RoutingResultPlacelholder() {
    return (
        <div className={styles.resultRow}>
            <div className={styles.placeholderContainer}>
                <div className={styles.placeholderMain} />
                <div className={styles.placeholderMain + ' ' + styles.placeholderSecondary} />
            </div>
        </div>
    )
}

function hasPendingRequests(subRequests: SubRequest[]) {
    return subRequests.some(req => req.state === RequestState.SENT)
}

function getLength(paths: Path[], subRequests: SubRequest[]) {
    if (subRequests.length > 0 && hasPendingRequests(subRequests)) {
        // assuming that the last sub request is the one with most alternative routes
        return Math.max(subRequests[subRequests.length - 1].args.maxAlternativeRoutes, paths.length)
    }
    return paths.length
}

function createSingletonListContent(props: RoutingResultsProps) {
    if (props.paths.length > 0) return <RoutingResult path={props.selectedPath} isSelected={true} />
    if (hasPendingRequests(props.currentRequest.subRequests)) return <RoutingResultPlacelholder key={1} />
    return ''
}

function createListContent({ paths, currentRequest, selectedPath }: RoutingResultsProps) {
    const length = getLength(paths, currentRequest.subRequests)
    const result = []

    for (let i = 0; i < length; i++) {
        if (i < paths.length)
            result.push(<RoutingResult key={i} path={paths[i]} isSelected={paths[i] === selectedPath} />)
        else result.push(<RoutingResultPlacelholder key={i} />)
    }

    return result
}
