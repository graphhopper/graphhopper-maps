import { Instruction, Path } from '@/api/graphhopper'
import { CurrentRequest, RequestState, SubRequest } from '@/stores/QueryStore'
import styles from './RoutingResult.module.css'
import React, { useContext, useEffect, useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import {
    SelectMapLayer,
    SetSelectedPath,
    TurnNavigationSettingsUpdate,
    TurnNavigationStart,
    TurnNavigationStop,
} from '@/actions/Actions'
import { metersToSimpleText, metersToText, milliSecondsToText } from '@/Converters'
import PlainButton from '@/PlainButton'
import Details from '@/sidebar/list.svg'
import NaviSVG from '@/sidebar/navigation.svg'
import GPXDownload from '@/sidebar/file_download.svg'
import Instructions from '@/sidebar/instructions/Instructions'
import { LineString, Position } from 'geojson'
import { calcDist } from '@/turnNavigation/GeoMethods'
import { useMediaQuery } from 'react-responsive'
import { tr } from '@/translation/Translation'
import { ShowDistanceInMilesContext } from '@/ShowDistanceInMilesContext'
import { ApiImpl } from '@/api/Api'
import { TNSettingsState, TurnNavigationStoreState } from '@/stores/TurnNavigationStore'
import Cross from '@/sidebar/times-solid.svg'
import * as config from 'config'

export interface RoutingResultsProps {
    paths: Path[]
    selectedPath: Path
    currentRequest: CurrentRequest
    profile: string
    turnNavigation: TurnNavigationStoreState
}

export default function RoutingResults(props: RoutingResultsProps) {
    // for landscape orientation there is no need that there is space for the map under the 3 alternatives and so the max-height is smaller for short screen
    const isShortScreen = useMediaQuery({
        query: '(max-height: 45rem) and (orientation: landscape), (max-height: 70rem) and (orientation: portrait)',
    })
    return <ul>{isShortScreen ? createSingletonListContent(props) : createListContent(props)}</ul>
}

function RoutingResult({
    path,
    isSelected,
    profile,
    turnNavigation,
}: {
    path: Path
    isSelected: boolean
    profile: string
    turnNavigation: TurnNavigationStoreState
}) {
    const [isExpanded, setExpanded] = useState(false)
    const resultSummaryClass = isSelected
        ? styles.resultSummary + ' ' + styles.selectedResultSummary
        : styles.resultSummary

    useEffect(() => setExpanded(isSelected && isExpanded), [isSelected])
    const hasFords = containsAnyOf(path.details.road_environment, { ford: true })
    const hasTolls = containsAnyOf(path.details.toll, { all: true })
    const hasFerries = containsAnyOf(path.details.road_environment, { ferry: true })
    const hasBadTracks = ApiImpl.isMotorVehicle(profile) && containsBadTracks(path.details.track_type)
    const hasSteps = ApiImpl.isBikeLike(profile) && containsAnyOf(path.details.road_class, { steps: true })
    const hasSteepSegments = !ApiImpl.isMotorVehicle(profile) && getMaxSlope(path.points) > 15
    const hasFootways =
        ApiImpl.isBikeLike(profile) &&
        containsAnyOf(path.details.road_class, { footway: true, pedestrian: true, platform: true })
    const hasBorderCrossed = crossesBorder(path.details.country)
    const showHints =
        hasFords ||
        hasTolls ||
        hasFerries ||
        hasBadTracks ||
        hasSteps ||
        hasBorderCrossed ||
        hasFootways ||
        hasSteepSegments

    const showDistanceInMiles = useContext(ShowDistanceInMilesContext)
    let [showBackAndRisk, setShowBackAndRisk] = useState(false)

    if (showBackAndRisk)
        return (
            <div className={styles.showRiskButtons}>
                {
                    // if this panel is still shown although we already confirmed the risk then we are waiting for GPS (or an error with location permission)
                    turnNavigation.settings.acceptedRisk ? (
                        <span>{tr('waiting_for_gps')}</span>
                    ) : (
                        <div className={styles.showRiskAccept}>
                            <div>{tr('warning')}</div>
                            <PlainButton
                                onClick={() => {
                                    Dispatcher.dispatch(
                                        new TurnNavigationSettingsUpdate({ acceptedRisk: true } as TNSettingsState)
                                    )
                                    startNavigation(turnNavigation.settings.forceVectorTiles)
                                }}
                            >
                                {tr('accept_risks_after_warning')}
                            </PlainButton>
                        </div>
                    )
                }
                <PlainButton
                    className={styles.showRiskBack}
                    onClick={() => {
                        setShowBackAndRisk(false)
                        if (turnNavigation.settings.forceVectorTiles)
                            Dispatcher.dispatch(new SelectMapLayer(turnNavigation.oldTiles))
                        Dispatcher.dispatch(new TurnNavigationStop())
                    }}
                >
                    <Cross />
                </PlainButton>
            </div>
        )

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
                    {isSelected && !showBackAndRisk && (
                        <PlainButton
                            className={styles.exportButton}
                            onClick={() => {
                                setShowBackAndRisk(true)
                                if (turnNavigation.settings.acceptedRisk)
                                    startNavigation(turnNavigation.settings.forceVectorTiles)
                            }}
                        >
                            <NaviSVG />
                            <div>{tr('start_navigation')}</div>
                        </PlainButton>
                    )}
                    {isSelected && !showBackAndRisk && (
                        <PlainButton
                            className={styles.exportButton}
                            onClick={() => downloadGPX(path, showDistanceInMiles)}
                        >
                            <GPXDownload />
                            <div>{tr('gpx_button')}</div>
                        </PlainButton>
                    )}
                    {isSelected && !showBackAndRisk && (
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
                    {hasFords && <div>{tr('way_contains_ford')}</div>}
                    {hasFerries && <div>{tr('way_contains_ferry')}</div>}
                    {hasBorderCrossed && <div>{tr('way_crosses_border')}</div>}
                    {hasTolls && <div>{tr('way_contains_toll')}</div>}
                    {hasSteps && <div>{tr('way_contains', [tr('steps')])}</div>}
                    {hasBadTracks && <div>{tr('way_contains', [tr('tracks')])}</div>}
                    {hasFootways && <div>{tr('way_contains', [tr('footways')])}</div>}
                    {hasSteepSegments && <div>{tr('way_contains', [tr('steep_sections')])}</div>}
                </div>
            )}
            {isExpanded && <Instructions instructions={path.instructions} />}
        </div>
    )
}

function startNavigation(forceVectorTiles: boolean) {
    Dispatcher.dispatch(new TurnNavigationStart())
    if (forceVectorTiles) Dispatcher.dispatch(new SelectMapLayer(config.navigationTiles))
}

function containsBadTracks(details: [number, number, string][]) {
    if (!details) return false
    for (const i in details) {
        if (details[i][2] == 'grade2') return true
        if (details[i][2] == 'grade3') return true
        if (details[i][2] == 'grade4') return true
        if (details[i][2] == 'grade5') return true
    }
    return false
}

function crossesBorder(countryPathDetail: [number, number, string][]) {
    if (!countryPathDetail || countryPathDetail.length == 0) return false
    const init = countryPathDetail[0][2]
    for (const i in countryPathDetail) {
        if (countryPathDetail[i][2] != init) return true
    }
    return false
}

function containsAnyOf(details: [number, number, string][], values: { [Identifier: string]: boolean }) {
    if (!details) return false
    for (const i in details) {
        if (values[details[i][2]]) return true
    }
    return false
}

function getMaxSlope(points: LineString): number {
    if (points.coordinates.length == 0) return 0
    if (points.coordinates[0].length != 3) return 0
    let accumulatedDistance = 0
    let prevElePoint = points.coordinates[0]
    let prevDistPoint = points.coordinates[0]
    let maxSlope = 0
    points.coordinates.forEach(currPoint => {
        accumulatedDistance += calcDist(
            { lat: currPoint[0], lng: currPoint[1] },
            { lat: prevDistPoint[0], lng: prevDistPoint[1] }
        )
        prevDistPoint = currPoint
        if (accumulatedDistance > 100) {
            // we assume that elevation data is not that precise and we can improve when using a minimum distance
            const slope = (100.0 * Math.abs(prevElePoint[2] - currPoint[2])) / accumulatedDistance
            if (slope > maxSlope) maxSlope = slope
            prevElePoint = currPoint
            accumulatedDistance = 0
        }
    })
    return maxSlope
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
        return (
            <RoutingResult
                path={props.selectedPath}
                isSelected={true}
                profile={props.profile}
                turnNavigation={props.turnNavigation}
            />
        )
    if (hasPendingRequests(props.currentRequest.subRequests)) return <RoutingResultPlaceholder key={1} />
    return ''
}

function createListContent({ paths, currentRequest, selectedPath, profile, turnNavigation }: RoutingResultsProps) {
    const length = getLength(paths, currentRequest.subRequests)
    const result = []

    for (let i = 0; i < length; i++) {
        if (i < paths.length)
            result.push(
                <RoutingResult
                    key={i}
                    path={paths[i]}
                    isSelected={paths[i] === selectedPath}
                    profile={profile}
                    turnNavigation={turnNavigation}
                />
            )
        else result.push(<RoutingResultPlaceholder key={i} />)
    }

    return result
}
