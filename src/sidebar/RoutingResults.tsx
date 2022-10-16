import { Instruction, Path } from '@/api/graphhopper'
import { CurrentRequest, RequestState, SubRequest } from '@/stores/QueryStore'
import styles from './RoutingResult.module.css'
import React, { useContext, useEffect, useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import { SetSelectedPath, TurnNavigationUpdate } from '@/actions/Actions'
import { metersToText, milliSecondsToText } from '@/Converters'
import PlainButton from '@/PlainButton'
import Details from '@/sidebar/list.svg'
import NaviSVG from '@/sidebar/navigation.svg'
import GPXDownload from '@/sidebar/file_download.svg'
import Instructions from '@/sidebar/instructions/Instructions'
import { Position } from 'geojson'
import { useMediaQuery } from 'react-responsive'
import { tr } from '@/translation/Translation'
import { ShowDistanceInMilesContext } from '@/ShowDistanceInMilesContext'
import { ApiImpl } from '@/api/Api'
import { getLocationStore } from '@/stores/Stores'
import { Settings } from '@/stores/SettingsStore'

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
    const hasFords = containsValue(path.details.road_environment, 'ford')
    const hasTolls = containsValue(path.details.toll, 'all')
    const hasFerries = containsValue(path.details.road_environment, 'ferry')
    const showAndHasBadTracks = ApiImpl.isMotorVehicle(profile) && containsBadTracks(path.details.track_type)
    const showAndHasSteps = ApiImpl.isBikeLike(profile) && containsValue(path.details.road_class, 'steps')
    const hasBorderCrossed = crossesBorder(path.details.country)

    const { showDistanceInMiles, fakeGPS } = useContext(ShowDistanceInMilesContext)
    let [showRisk, setShowRisk] = useState(false)

    if (showRisk)
        return (
            <div className={styles.showRisk}>
                <div>{tr('warning')}</div>
                <div className={styles.showRiskButtons}>
                    <PlainButton onClick={() => setShowRisk(false)}>{tr('back')}</PlainButton>
                    <PlainButton
                        onClick={() => {
                            Dispatcher.dispatch(new TurnNavigationUpdate({ acceptedRisk: true } as Settings))
                            return fakeGPS ? getLocationStore().initFake() : getLocationStore().initReal()
                        }}
                    >
                        {tr('accept_risks_after_warning')}
                    </PlainButton>
                </div>
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
                    {isSelected && !showRisk && (
                        <PlainButton
                            className={isExpanded ? styles.detailsButtonExpanded : styles.detailsButton}
                            onClick={() => setShowRisk(true)}
                        >
                            <NaviSVG />
                            <div>{tr('Navi')}</div>
                        </PlainButton>
                    )}
                    {isSelected && !showRisk && (
                        <PlainButton
                            className={styles.exportButton}
                            onClick={() => downloadGPX(path, showDistanceInMiles)}
                        >
                            <GPXDownload />
                            <div>{tr('gpx_button')}</div>
                        </PlainButton>
                    )}
                    {isSelected && !showRisk && (
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
            {isSelected && !isExpanded && (
                <div className={styles.routeHints}>
                    {hasFords && <div>{tr('way_contains_ford')}</div>}
                    {hasFerries && <div>{tr('way_contains_ferry')}</div>}
                    {hasBorderCrossed && <div>{tr('way_crosses_border')}</div>}
                    {hasTolls && <div>{tr('way_contains_toll')}</div>}
                    {showAndHasSteps && <div>{tr('way_contains', [tr('steps')])}</div>}
                    {showAndHasBadTracks && <div>{tr('way_contains', [tr('tracks')])}</div>}
                </div>
            )}
            {isExpanded && <Instructions instructions={path.instructions} />}
        </div>
    )
}

function containsBadTracks(details: [number, number, string][]) {
    if (!details) return false
    for (let i in details) {
        if (details[i][2] == 'grade2') return true
        if (details[i][2] == 'grade3') return true
        if (details[i][2] == 'grade4') return true
        if (details[i][2] == 'grade5') return true
    }
    return false
}

function crossesBorder(countryPathDetail: [number, number, string][]) {
    if (!countryPathDetail) return false
    const init = countryPathDetail[0][2]
    for (let i in countryPathDetail) {
        if (countryPathDetail[i][2] != init) return true
    }
    return false
}

function containsValue(details: [number, number, string][], value: string) {
    if (!details) return false
    for (let i in details) {
        if (details[i][2] == value) return true
    }
    return false
}

function downloadGPX(path: Path, showDistanceInMiles: boolean) {
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
    tmpElement.download = `GraphHopper-Route-${metersToText(
        path.distance,
        showDistanceInMiles
    )}-${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}.gpx`
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
