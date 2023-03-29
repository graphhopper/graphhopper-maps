import { Instruction, Path } from '@/api/graphhopper'
import { CurrentRequest, RequestState, SubRequest } from '@/stores/QueryStore'
import styles from './RoutingResult.module.css'
import { useContext, useEffect, useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import { SetSelectedPath } from '@/actions/Actions'
import { metersToSimpleText, metersToText, milliSecondsToText } from '@/Converters'
import PlainButton from '@/PlainButton'
import Details from '@/sidebar/list.svg'
import GPXDownload from '@/sidebar/file_download.svg'
import Instructions from '@/sidebar/instructions/Instructions'
import { LineString, Position } from 'geojson'
import { calcDist } from '@/distUtils'
import { useMediaQuery } from 'react-responsive'
import { tr } from '@/translation/Translation'
import { ShowDistanceInMilesContext } from '@/ShowDistanceInMilesContext'
import { ApiImpl } from '@/api/Api'

export interface RoutingResultsProps {
    paths: Path[]
    selectedPath: Path
    currentRequest: CurrentRequest
    profile: string
}

export default function RoutingResults(props: RoutingResultsProps) {
    // for landscape orientation there is no need that there is space for the map under the 3 alternatives and so the max-height is smaller for short screen
    const isShortScreen = useMediaQuery({
        query: '(max-height: 45rem) and (orientation: landscape), (max-height: 70rem) and (orientation: portrait)',
    })
    return <ul>{isShortScreen ? createSingletonListContent(props) : createListContent(props)}</ul>
}

function RoutingResult({ path, isSelected, profile }: { path: Path; isSelected: boolean; profile: string }) {
    const [isExpanded, setExpanded] = useState(false)
    const resultSummaryClass = isSelected
        ? styles.resultSummary + ' ' + styles.selectedResultSummary
        : styles.resultSummary

    useEffect(() => setExpanded(isSelected && isExpanded), [isSelected])
    const fordLength = getLengthFor(path.points, path.details.road_environment, { ford: true })
    const tollLength = getLengthFor(path.points, path.details.toll, { all: true, hgv: ApiImpl.isTruck(profile) })
    const ferryLength = getLengthFor(path.points, path.details.road_environment, { ferry: true })
    const badTrackLength = !ApiImpl.isMotorVehicle(profile)
        ? 0
        : getLengthBadTracks(path.points, path.details.track_type)
    const stepsLength = !ApiImpl.isBikeLike(profile)
        ? 0
        : getLengthFor(path.points, path.details.road_class, { steps: true })
    const steepLength = ApiImpl.isMotorVehicle(profile) ? 0 : getHighSlopeLength(path.points, 15)
    const getOffBikeLength = !ApiImpl.isBikeLike(profile)
        ? 0
        : getLengthFor(path.points, path.details.get_off_bike, { true: true })
    const hasBorderCrossed = crossesBorder(path.details.country)
    const showHints =
        fordLength > 0 ||
        tollLength > 0 ||
        ferryLength > 0 ||
        badTrackLength > 0 ||
        stepsLength > 0 ||
        hasBorderCrossed ||
        getOffBikeLength > 0 ||
        steepLength > 0

    const showDistanceInMiles = useContext(ShowDistanceInMilesContext)

    return (
        <div className={styles.resultRow}>
            <div className={styles.resultSelectableArea} onClick={() => Dispatcher.dispatch(new SetSelectedPath(path))}>
                <div className={resultSummaryClass}>
                    <div className={styles.resultValues}>
                        <span className={styles.resultMainText}>{milliSecondsToText(path.time)}</span>
                        <span className={styles.resultSecondaryText}>
                            {metersToText(path.distance, showDistanceInMiles)}
                        </span>
                        {isSelected && !ApiImpl.isMotorVehicle(profile) && (
                            <div className={styles.elevationHint}>
                                <span title={tr('total_ascend', [Math.round(path.ascend) + 'm'])}>
                                    ↗{metersToText(path.ascend, showDistanceInMiles)}{' '}
                                </span>
                                <span title={tr('total_descend', [Math.round(path.descend) + 'm'])}>
                                    ↘{metersToText(path.descend, showDistanceInMiles)}
                                </span>
                            </div>
                        )}
                        {path.description && (
                            <span className={styles.resultTertiaryText}>
                                {tr('Via')} {path.description}
                            </span>
                        )}
                    </div>
                    {isSelected && (
                        <PlainButton
                            className={styles.exportButton}
                            onClick={() => downloadGPX(path, showDistanceInMiles)}
                        >
                            <GPXDownload />
                            <div>{tr('gpx_button')}</div>
                        </PlainButton>
                    )}
                    {isSelected && (
                        <PlainButton
                            className={isExpanded ? styles.detailsButtonExpanded : styles.detailsButton}
                            onClick={() => setExpanded(!isExpanded)}
                        >
                            <Details />
                            <div>{isExpanded ? tr('hide_button') : tr('details_button')}</div>
                        </PlainButton>
                    )}
                </div>
            </div>
            {isSelected && !isExpanded && showHints && (
                <div className={styles.routeHints}>
                    {getHint(tr('way_contains_ford'), fordLength, showDistanceInMiles)}
                    {getHint(tr('way_contains_ferry'), ferryLength, showDistanceInMiles)}
                    {hasBorderCrossed && <div>{tr('way_crosses_border')}</div>}
                    {getHint(tr('way_contains_toll'), tollLength, showDistanceInMiles)}
                    {getHint(tr('way_contains', [tr('steps')]), stepsLength, showDistanceInMiles)}
                    {getHint(tr('way_contains', [tr('tracks')]), badTrackLength, showDistanceInMiles)}
                    {getOffBikeLength > 0 && (
                        <div>{tr('get_off_bike_for', [metersToSimpleText(getOffBikeLength, showDistanceInMiles)])}</div>
                    )}
                    {getHint(tr('way_contains', [tr('steep_sections')]), steepLength, showDistanceInMiles)}
                </div>
            )}
            {isExpanded && <Instructions instructions={path.instructions} />}
        </div>
    )
}

function getHint(str: string, value: number, showDistanceInMiles: boolean) {
    return value <= 0 ? null : <div>{str + ': ' + metersToSimpleText(value, showDistanceInMiles)}</div>
}

function getLengthBadTracks(points: LineString, details: [number, number, string][]) {
    if (!details) return 0
    let distance = 0
    for (const i in details) {
        const grade = details[i][2]
        if (grade == 'grade2' || grade == 'grade3' || grade == 'grade4' || grade == 'grade5')
            distance += calcDistPos(points.coordinates[details[i][0]], points.coordinates[details[i][1]])
    }
    return distance
}

function crossesBorder(countryPathDetail: [number, number, string][]) {
    if (!countryPathDetail || countryPathDetail.length == 0) return false
    const init = countryPathDetail[0][2]
    for (const i in countryPathDetail) {
        if (countryPathDetail[i][2] != init) return true
    }
    return false
}

function getLengthFor(points: LineString, details: [number, number, any][], values: { [Identifier: string]: boolean }) {
    if (!details) return 0
    let distance = 0
    for (const i in details) {
        if (values[details[i][2]]) distance += calcDistAlong(points.coordinates, details[i][0], details[i][1])
    }
    return distance
}

function calcDistAlong(coordinates: Position[], from: number, to: number) {
    let dist = 0
    for (let i = from; i < to; i++) {
        dist += calcDistPos(coordinates[i], coordinates[i + 1])
    }
    return dist
}

function calcDistPos(from: Position, to: Position): number {
    return calcDist({ lat: from[1], lng: from[0] }, { lat: to[1], lng: to[0] })
}

// sums up the lengths of the road segments with a slope bigger than steepSlope
function getHighSlopeLength(points: LineString, steepSlope: number): number {
    if (points.coordinates.length == 0) return 0
    if (points.coordinates[0].length != 3) return 0
    let sumDistance = 0
    let distForSlope = 0
    let prevElePoint = points.coordinates[0]
    let prevDistPoint = points.coordinates[0]
    points.coordinates.forEach(currPoint => {
        distForSlope += calcDistPos(currPoint, prevDistPoint)
        prevDistPoint = currPoint
        // we assume that elevation data is not that precise and we can improve when using a minimum distance:
        if (distForSlope > 100) {
            const slope = (100.0 * Math.abs(prevElePoint[2] - currPoint[2])) / distForSlope
            if (slope > steepSlope) sumDistance += distForSlope
            prevElePoint = currPoint
            distForSlope = 0
        }
    })
    return sumDistance
}

function downloadGPX(path: Path, showDistanceInMiles: boolean) {
    let xmlString =
        '<?xml version="1.0" encoding="UTF-8" standalone="no" ?><gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" creator="GraphHopper" version="1.1" xmlns:gh="https://graphhopper.com/public/schema/gpx/1.1">\n'
    xmlString += `<metadata><copyright author="OpenStreetMap contributors"/><link href="http://graphhopper.com"><text>GraphHopper GPX</text></link><time>${new Date().toISOString()}</time></metadata>\n`

    const rte = false
    const wpt = false
    const trk = true

    if (wpt)
        xmlString += path.snapped_waypoints.coordinates.reduce((prevString: string, coord: Position) => {
            return prevString + `<wpt lat="${coord[1]}" lon="${coord[0]}"></wpt>\n`
        }, '')

    if (rte) {
        xmlString += '<rte>\n'
        xmlString += path.instructions.reduce((prevString: string, instruction: Instruction) => {
            let routeSegment = `<rtept lat="${instruction.points[0][1].toFixed(
                6
            )}" lon="${instruction.points[0][0].toFixed(6)}">`
            routeSegment += `<desc>${instruction.text}</desc><extensions><gh:distance>${instruction.distance}</gh:distance>`
            routeSegment += `<gh:time>${instruction.time}</gh:time><gh:sign>${instruction.sign}</gh:sign>`
            // TODO routeSegment += `<gh:direction>SW</gh:direction><gh:azimuth>222.57</gh:azimuth>` +
            routeSegment += '</extensions></rtept>\n'
            return prevString + routeSegment
        }, '')
        xmlString += '</rte>\n'
    }

    if (trk) {
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
    }

    const tmpElement = document.createElement('a')
    const file = new Blob([xmlString], { type: 'application/gpx+xml' })
    tmpElement.href = URL.createObjectURL(file)
    const date = new Date()
    tmpElement.download = `GraphHopper-Track-${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
        date.getUTCDate()
    )}-${metersToSimpleText(path.distance, showDistanceInMiles)}.gpx`
    tmpElement.click()
}

function pad(value: number) {
    return value < 10 ? '0' + value : '' + value
}

function RoutingResultPlaceholder() {
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
    if (props.paths.length > 0)
        return <RoutingResult path={props.selectedPath} isSelected={true} profile={props.profile} />
    if (hasPendingRequests(props.currentRequest.subRequests)) return <RoutingResultPlaceholder key={1} />
    return ''
}

function createListContent({ paths, currentRequest, selectedPath, profile }: RoutingResultsProps) {
    const length = getLength(paths, currentRequest.subRequests)
    const result = []

    for (let i = 0; i < length; i++) {
        if (i < paths.length)
            result.push(
                <RoutingResult key={i} path={paths[i]} isSelected={paths[i] === selectedPath} profile={profile} />
            )
        else result.push(<RoutingResultPlaceholder key={i} />)
    }

    return result
}
