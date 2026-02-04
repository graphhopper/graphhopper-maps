import { Bbox, Instruction, Path, RoutingArgs, RoutingResultInfo } from '@/api/graphhopper'
import { CurrentRequest, RequestState, SubRequest } from '@/stores/QueryStore'
import styles from './RoutingResult.module.css'
import { ReactNode, useContext, useEffect, useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import { PathDetailsElevationSelected, SetBBox, SetSelectedPath, UpdateSettings } from '@/actions/Actions'
import { metersToShortText, metersToTextForFile, milliSecondsToText } from '@/Converters'
import PlainButton from '@/PlainButton'
import Details from '@/sidebar/list.svg'
import NaviSVG from '@/sidebar/navigation.svg'
import GPXDownload from '@/sidebar/file_download.svg'
import Cross from '@/sidebar/times-solid.svg'
import Instructions from '@/sidebar/instructions/Instructions'
import { LineString, Position } from 'geojson'
import { calcDist, Coordinate, getBBoxFromCoord } from '@/utils'
import { useMediaQuery } from 'react-responsive'
import { tr } from '@/translation/Translation'
import { ApiImpl, getApi } from '@/api/Api'
import FordIcon from '@/sidebar/routeHints/water.svg'
import CondAccessIcon from '@/sidebar/routeHints/remove_road.svg'
import FerryIcon from '@/sidebar/routeHints/directions_boat.svg'
import PrivateIcon from '@/sidebar/routeHints/privacy_tip.svg'
import StepsIcon from '@/sidebar/routeHints/floor.svg'
import BorderCrossingIcon from '@/sidebar/routeHints/border.svg'
import EuroIcon from '@/sidebar/routeHints/toll_euro.svg'
import DollarIcon from '@/sidebar/routeHints/toll_dollar.svg'
import GetOffBikeIcon from '@/sidebar/routeHints/push_bike.svg'
import SteepIcon from '@/sidebar/routeHints/elevation.svg'
import BadTrackIcon from '@/sidebar/routeHints/ssid_chart.svg'
import DangerousIcon from '@/sidebar/routeHints/warn_report.svg'
import { SettingsContext } from '@/contexts/SettingsContext'
import { Settings } from '@/stores/SettingsStore'

export interface RoutingResultsProps {
    info: RoutingResultInfo
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

function RoutingResult({
    info,
    path,
    isSelected,
    profile,
    requestArguments,
}: {
    info: RoutingResultInfo
    path: Path
    isSelected: boolean
    profile: string
    requestArguments: RoutingArgs
}) {
    const [isExpanded, setExpanded] = useState(false)
    const [selectedRH, setSelectedRH] = useState('')
    const [descriptionRH, setDescriptionRH] = useState('')
    const resultSummaryClass = isSelected
        ? styles.resultSummary + ' ' + styles.selectedResultSummary
        : styles.resultSummary

    useEffect(() => setExpanded(isSelected && isExpanded), [isSelected])
    const settings = useContext(SettingsContext)
    const showDistanceInMiles = settings.showDistanceInMiles
    const [showViaWarning, setShowViaWarning] = useState(false)
    const [showNativeWarning, setShowNativeWarning] = useState(false)

    const fordInfo = getInfoFor(path.points, path.details.road_environment, s => s === 'ford')
    const tollInfo = getInfoFor(
        path.points,
        path.details.toll,
        s => s === 'all' || (s === 'hgv' && ApiImpl.isTruck(profile)),
    )
    const ferryInfo = getInfoFor(path.points, path.details.road_environment, s => s === 'ferry')
    const accessCondInfo = getInfoFor(path.points, path.details.access_conditional, s => s != null && s.length > 0)

    const footAccessCondInfo = !ApiImpl.isFootLike(profile)
        ? new RouteInfo()
        : getInfoFor(path.points, path.details.foot_conditional, s => s != null && s.length > 0)

    const hikeRatingInfo = !ApiImpl.isFootLike(profile)
        ? new RouteInfo()
        : getInfoFor(path.points, path.details.hike_rating, s => s > 1 && s < 5)
    const dangerousHikeRatingInfo = !ApiImpl.isFootLike(profile)
        ? new RouteInfo()
        : getInfoFor(path.points, path.details.hike_rating, s => s >= 5)

    const bikeAccessCondInfo = !ApiImpl.isBikeLike(profile)
        ? new RouteInfo()
        : getInfoFor(path.points, path.details.bike_conditional, s => s != null && s.length > 0)
    const mtbRatingInfo = !ApiImpl.isBikeLike(profile)
        ? new RouteInfo()
        : getInfoFor(path.points, path.details.mtb_rating, s => s > 1)

    const privateInfo = ApiImpl.isMotorVehicle(profile)
        ? getInfoFor(path.points, path.details.road_access, s => s === 'private')
        : new RouteInfo()

    const deliveryEtcInfo = ApiImpl.isMotorVehicle(profile)
        ? getInfoFor(
              path.points,
              path.details.road_access,
              s => s === 'delivery' || s === 'customers' || s === 'destination',
          )
        : new RouteInfo()
    const badTrackInfo = !ApiImpl.isMotorVehicle(profile)
        ? new RouteInfo()
        : getInfoFor(
              path.points,
              path.details.track_type,
              s => s === 'grade2' || s === 'grade3' || s === 'grade4' || s === 'grade5',
          )
    const trunkInfo = ApiImpl.isMotorVehicle(profile)
        ? new RouteInfo()
        : getInfoFor(path.points, path.details.road_class, s => s === 'motorway' || s === 'trunk')
    const stepsInfo = !ApiImpl.isBikeLike(profile)
        ? new RouteInfo()
        : getInfoFor(path.points, path.details.road_class, s => s === 'steps')
    const steepInfo = ApiImpl.isMotorVehicle(profile)
        ? new RouteInfo()
        : getHighSlopeInfo(path.points, 15, showDistanceInMiles)
    const getOffBikeInfo = !ApiImpl.isBikeLike(profile)
        ? new RouteInfo()
        : getInfoFor(path.points, path.details.get_off_bike, s => s)
    const borderInfo = crossesBorderInfo(path.points, path.details.country)

    const showHints =
        fordInfo.distance > 0 ||
        tollInfo.distance > 0 ||
        ferryInfo.distance > 0 ||
        accessCondInfo.distance > 0 ||
        footAccessCondInfo.distance > 0 ||
        bikeAccessCondInfo.distance > 0 ||
        privateInfo.distance > 0 ||
        trunkInfo.distance > 0 ||
        badTrackInfo.distance > 0 ||
        stepsInfo.distance > 0 ||
        borderInfo.values.length > 0 ||
        getOffBikeInfo.distance > 0 ||
        mtbRatingInfo.distance > 0 ||
        hikeRatingInfo.distance > 0 ||
        dangerousHikeRatingInfo.distance > 0 ||
        steepInfo.distance > 0

    // Check if native navigation is available
    const nativeNavigation = (window as any).ghNativeNavigation ?? null

    if (showViaWarning)
        return (
            <div className={styles.showRiskButtons}>
                <div className={styles.showRiskAccept}>
                    <div>{tr('via_not_supported')}</div>
                </div>
                <PlainButton className={styles.showRiskBack} onClick={() => setShowViaWarning(false)}>
                    <Cross />
                </PlainButton>
            </div>
        )

    const startNavigation = () => {
        if (path.snapped_waypoints.coordinates.length > 2) {
            setShowNativeWarning(false)
            setShowViaWarning(true)
            return
        }
        try {
            nativeNavigation.start(
                getApi().createURLWithKey('navigate').toString(),
                JSON.stringify(ApiImpl.createRequest(requestArguments)),
                () => {
                    console.log("Navigating closed")
                },
            )
        } catch (e) {
            console.error(e)
        }
        setShowNativeWarning(false)
    }

    if (showNativeWarning)
        return (
            <div className={styles.showRiskButtons}>
                <div className={styles.showRiskAccept}>
                    <div>{tr('warning')}</div>
                    <PlainButton
                        onClick={() => {
                            Dispatcher.dispatch(new UpdateSettings({ nativeNavigationRisksAccepted: true }))
                            startNavigation()
                        }}
                    >
                        {tr('accept_risks_after_warning')}
                    </PlainButton>
                </div>
                <PlainButton className={styles.showRiskBack} onClick={() => setShowNativeWarning(false)}>
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
                            {metersToShortText(path.distance, showDistanceInMiles)}
                        </span>
                        {isSelected && !ApiImpl.isMotorVehicle(profile) && (
                            <div className={styles.elevationHint}>
                                <span title={tr('total_ascend', [Math.round(path.ascend) + 'm'])}>
                                    ↗{metersToShortText(path.ascend, showDistanceInMiles)}{' '}
                                </span>
                                <span title={tr('total_descend', [Math.round(path.descend) + 'm'])}>
                                    ↘{metersToShortText(path.descend, showDistanceInMiles)}
                                </span>
                            </div>
                        )}
                        {path.description && (
                            <span className={styles.resultTertiaryText}>
                                {tr('Via')} {path.description}
                            </span>
                        )}
                    </div>
                    {isSelected && nativeNavigation && (
                        <PlainButton className={styles.exportButton} onClick={() => {
                            if (settings.nativeNavigationRisksAccepted) {
                                startNavigation()
                            } else {
                                setShowNativeWarning(true)
                            }
                        }}>
                            <NaviSVG />
                            <div>{tr('start_navigation')}</div>
                        </PlainButton>
                    )}
                    {isSelected && (
                        <PlainButton className={styles.exportButton} onClick={() => downloadGPX(path, settings)}>
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
                    <div className={styles.icons}>
                        <RHButton
                            setDescription={b => setDescriptionRH(b)}
                            description={tr('way_contains_ford')}
                            setType={t => setSelectedRH(t)}
                            type={'ford'}
                            child={<FordIcon />}
                            value={fordInfo.distance > 0 && metersToShortText(fordInfo.distance, showDistanceInMiles)}
                            selected={selectedRH}
                            segments={fordInfo.segments}
                            values={[]}
                            addClassName={styles.orangeButton}
                        />
                        <RHButton
                            setDescription={b => setDescriptionRH(b)}
                            description={tr('way_crosses_border')}
                            setType={t => setSelectedRH(t)}
                            type={'border'}
                            child={<BorderCrossingIcon />}
                            value={borderInfo.values.length > 0 && borderInfo.values[0]}
                            selected={selectedRH}
                            segments={borderInfo.segments}
                            values={borderInfo.values}
                        />
                        <RHButton
                            setDescription={b => setDescriptionRH(b)}
                            description={tr('way_contains_ferry')}
                            setType={t => setSelectedRH(t)}
                            type={'ferry'}
                            child={<FerryIcon />}
                            value={ferryInfo.distance > 0 && metersToShortText(ferryInfo.distance, showDistanceInMiles)}
                            selected={selectedRH}
                            segments={ferryInfo.segments}
                            values={[]}
                        />
                        <RHButton
                            setDescription={b => setDescriptionRH(b)}
                            description={tr('way_contains_restrictions')}
                            setType={t => setSelectedRH(t)}
                            type={'access_conditional'}
                            child={<CondAccessIcon />}
                            value={
                                accessCondInfo.distance > 0 &&
                                metersToShortText(accessCondInfo.distance, showDistanceInMiles)
                            }
                            selected={selectedRH}
                            segments={accessCondInfo.segments}
                            values={accessCondInfo.values}
                        />
                        <RHButton
                            setDescription={b => setDescriptionRH(b)}
                            description={tr('way_contains_restrictions')}
                            setType={t => setSelectedRH(t)}
                            type={'foot_access_conditional'}
                            child={<CondAccessIcon />}
                            value={
                                footAccessCondInfo.distance > 0 &&
                                metersToShortText(footAccessCondInfo.distance, showDistanceInMiles)
                            }
                            selected={selectedRH}
                            segments={footAccessCondInfo.segments}
                            values={footAccessCondInfo.values}
                        />
                        <RHButton
                            setDescription={b => setDescriptionRH(b)}
                            description={tr('way_contains_restrictions')}
                            setType={t => setSelectedRH(t)}
                            type={'bike_access_conditional'}
                            child={<CondAccessIcon />}
                            value={
                                bikeAccessCondInfo.distance > 0 &&
                                metersToShortText(bikeAccessCondInfo.distance, showDistanceInMiles)
                            }
                            selected={selectedRH}
                            segments={bikeAccessCondInfo.segments}
                            values={bikeAccessCondInfo.values}
                        />
                        <RHButton
                            setDescription={b => setDescriptionRH(b)}
                            description={tr('way_contains', [tr('private_sections')])}
                            setType={t => setSelectedRH(t)}
                            type={'private'}
                            child={<PrivateIcon />}
                            value={
                                privateInfo.distance > 0 && metersToShortText(privateInfo.distance, showDistanceInMiles)
                            }
                            selected={selectedRH}
                            segments={privateInfo.segments}
                            values={[]}
                        />
                        <RHButton
                            setDescription={b => setDescriptionRH(b)}
                            description={tr('way_contains', [tr('restricted_sections')])}
                            setType={t => setSelectedRH(t)}
                            type={'delivery_etc'}
                            child={<PrivateIcon />}
                            value={
                                deliveryEtcInfo.distance > 0 &&
                                metersToShortText(deliveryEtcInfo.distance, showDistanceInMiles)
                            }
                            selected={selectedRH}
                            segments={deliveryEtcInfo.segments}
                            values={deliveryEtcInfo.values}
                        />
                        <RHButton
                            setDescription={b => setDescriptionRH(b)}
                            description={tr('way_contains_toll')}
                            setType={t => setSelectedRH(t)}
                            type={'toll'}
                            child={showDistanceInMiles ? <DollarIcon /> : <EuroIcon />}
                            value={tollInfo.distance > 0 && metersToShortText(tollInfo.distance, showDistanceInMiles)}
                            selected={selectedRH}
                            segments={tollInfo.segments}
                            values={[]}
                        />
                        <RHButton
                            setDescription={b => setDescriptionRH(b)}
                            description={tr('challenging_sections')}
                            setType={t => setSelectedRH(t)}
                            type={'mtb_rating'}
                            child={<DangerousIcon />}
                            value={
                                mtbRatingInfo.distance > 0 &&
                                metersToShortText(mtbRatingInfo.distance, showDistanceInMiles)
                            }
                            selected={selectedRH}
                            segments={mtbRatingInfo.segments}
                            values={mtbRatingInfo.values}
                            addClassName={styles.orangeButton}
                        />
                        <RHButton
                            setDescription={b => setDescriptionRH(b)}
                            description={tr('challenging_sections')}
                            setType={t => setSelectedRH(t)}
                            type={'hike_rating'}
                            child={<DangerousIcon />}
                            value={
                                hikeRatingInfo.distance > 0 &&
                                metersToShortText(hikeRatingInfo.distance, showDistanceInMiles)
                            }
                            selected={selectedRH}
                            segments={hikeRatingInfo.segments}
                            values={hikeRatingInfo.values}
                            addClassName={styles.orangeButton}
                        />
                        <RHButton
                            setDescription={b => setDescriptionRH(b)}
                            description={tr('dangerous_sections')}
                            setType={t => setSelectedRH(t)}
                            type={'hike_rating'}
                            child={<DangerousIcon />}
                            value={
                                dangerousHikeRatingInfo.distance > 0 &&
                                metersToShortText(dangerousHikeRatingInfo.distance, showDistanceInMiles)
                            }
                            selected={selectedRH}
                            segments={dangerousHikeRatingInfo.segments}
                            values={dangerousHikeRatingInfo.values}
                            addClassName={styles.redButton}
                        />
                        <RHButton
                            setDescription={b => setDescriptionRH(b)}
                            description={tr('way_contains', [tr('steps')])}
                            setType={t => setSelectedRH(t)}
                            type={'steps'}
                            child={<StepsIcon />}
                            value={stepsInfo.distance > 0 && metersToShortText(stepsInfo.distance, showDistanceInMiles)}
                            selected={selectedRH}
                            segments={stepsInfo.segments}
                            values={[]}
                        />
                        <RHButton
                            setDescription={b => setDescriptionRH(b)}
                            description={tr('way_contains', [tr('tracks')])}
                            setType={t => setSelectedRH(t)}
                            type={'tracks'}
                            child={<BadTrackIcon />}
                            value={
                                badTrackInfo.distance > 0 &&
                                metersToShortText(badTrackInfo.distance, showDistanceInMiles)
                            }
                            selected={selectedRH}
                            segments={badTrackInfo.segments}
                            values={badTrackInfo.values}
                        />
                        <RHButton
                            setDescription={b => setDescriptionRH(b)}
                            description={tr('trunk_roads_warn')}
                            setType={t => setSelectedRH(t)}
                            type={'trunk'}
                            child={<DangerousIcon />}
                            value={trunkInfo.distance > 0 && metersToShortText(trunkInfo.distance, showDistanceInMiles)}
                            selected={selectedRH}
                            segments={trunkInfo.segments}
                            values={[]}
                            addClassName={styles.orangeButton}
                        />
                        <RHButton
                            setDescription={b => setDescriptionRH(b)}
                            description={tr('get_off_bike_for', [
                                metersToShortText(getOffBikeInfo.distance, showDistanceInMiles),
                            ])}
                            setType={t => setSelectedRH(t)}
                            type={'get_off_bike'}
                            child={<GetOffBikeIcon />}
                            value={
                                getOffBikeInfo.distance > 0 &&
                                metersToShortText(getOffBikeInfo.distance, showDistanceInMiles)
                            }
                            selected={selectedRH}
                            segments={getOffBikeInfo.segments}
                            values={[]}
                        />
                        <RHButton
                            setDescription={b => setDescriptionRH(b)}
                            description={tr('way_contains', [tr('steep_sections')])}
                            setType={t => setSelectedRH(t)}
                            type={'steep_sections'}
                            child={<SteepIcon />}
                            value={steepInfo.distance > 0 && metersToShortText(steepInfo.distance, showDistanceInMiles)}
                            selected={selectedRH}
                            segments={steepInfo.segments}
                            values={steepInfo.values}
                        />
                    </div>
                    {descriptionRH && <div>{descriptionRH}</div>}
                </div>
            )}
            {isExpanded && <Instructions instructions={path.instructions} us={showDistanceInMiles} />}
            {isExpanded && (
                <div className={styles.routingResultRoadData}>
                    {tr('road_data_from')}: {info.road_data_timestamp}
                </div>
            )}
        </div>
    )
}

function RHButton(p: {
    setDescription: (s: string) => void
    description: string
    setType: (s: string) => void
    type: string
    child: ReactNode
    value: string | false
    selected: string
    segments: Coordinate[][]
    values: string[]
    addClassName?: string
}) {
    let [index, setIndex] = useState(0)
    if (p.value === false) return null
    return (
        <PlainButton
            className={
                (p.addClassName || '') +
                ' ' +
                (p.selected == p.type ? styles.selectedRouteHintButton : styles.routeHintButton)
            }
            onClick={() => {
                p.setType(p.type)

                if (index < 0) {
                    Dispatcher.dispatch(new PathDetailsElevationSelected([]))
                    p.setDescription('')
                } else {
                    let tmpDescription
                    if (p.type == 'get_off_bike') tmpDescription = p.description
                    else if (p.type == 'border') tmpDescription = p.description + ': ' + p.values[index]
                    else if (p.values && p.values[index]) {
                        if (p.type.includes('rating'))
                            tmpDescription =
                                p.description + ': ' + p.value + ' (' + p.type + ':' + p.values[index] + ')'
                        else if (p.type.includes('steep')) tmpDescription = p.description + ': ' + p.values[index]
                        else tmpDescription = p.description + ': ' + p.value + ' ' + p.values[index]
                    } else tmpDescription = p.description + ': ' + p.value

                    p.setDescription(tmpDescription)
                    Dispatcher.dispatch(new PathDetailsElevationSelected(p.segments))
                    if (p.segments.length > index) Dispatcher.dispatch(new SetBBox(toBBox(p.segments[index])))
                }

                setIndex(index + 1 >= p.segments.length ? -1 : index + 1)
            }}
            title={p.description}
        >
            {p.child}
            {<span>{p.value}</span>}
        </PlainButton>
    )
}

function crossesBorderInfo(points: LineString, countryPathDetail: [number, number, string][]) {
    if (!countryPathDetail || countryPathDetail.length == 0) return new RouteInfo()
    const info = new RouteInfo()
    let prev = countryPathDetail[0][2]
    const coords = points.coordinates
    for (const i in countryPathDetail) {
        if (countryPathDetail[i][2] != prev) {
            info.values.push(prev + ' - ' + countryPathDetail[i][2])
            info.segments.push([
                toCoordinate(coords[countryPathDetail[i][0] - 1]),
                toCoordinate(coords[countryPathDetail[i][0]]),
            ])
            prev = countryPathDetail[i][2]
        }
    }
    return info
}

class RouteInfo {
    segments: Coordinate[][] = []
    distance: number = 0
    values: string[] = []
}

function toCoordinate(pos: Position): Coordinate {
    return { lng: pos[0], lat: pos[1] }
}

function toBBox(segment: Coordinate[]): Bbox {
    // TODO replace with ApiImpl.getBBoxPoints
    const bbox = getBBoxFromCoord(segment[0], 0.002)
    if (segment.length == 1) bbox
    segment.forEach(c => {
        bbox[0] = Math.min(bbox[0], c.lng)
        bbox[1] = Math.min(bbox[1], c.lat)
        bbox[2] = Math.max(bbox[2], c.lng)
        bbox[3] = Math.max(bbox[3], c.lat)
    })
    if (bbox[2] - bbox[0] < 0.005) {
        bbox[0] -= 0.005 / 2
        bbox[2] += 0.005 / 2
    }
    if (bbox[3] - bbox[1] < 0.005) {
        bbox[1] -= 0.005 / 2
        bbox[3] += 0.005 / 2
    }
    return bbox as Bbox
}

function getInfoFor(points: LineString, details: [number, number, any][], fnc: { (s: any): boolean }) {
    if (!details) return new RouteInfo()
    let info = new RouteInfo()
    const coords = points.coordinates
    for (const i in details) {
        if (fnc(details[i][2])) {
            const from = details[i][0],
                to = details[i][1]
            const segCoords: Coordinate[] = []
            for (let i = from; i < to; i++) {
                const dist = calcDistPos(coords[i], coords[i + 1])
                info.distance += dist
                if (dist == 0) info.distance += 0.01 // some obstacles have no length when mapped as a node like fords
                segCoords.push(toCoordinate(coords[i]))
            }
            segCoords.push(toCoordinate(coords[to]))
            info.values.push(details[i][2])
            info.segments.push(segCoords)
        }
    }
    return info
}

function calcDistPos(from: Position, to: Position): number {
    return calcDist({ lat: from[1], lng: from[0] }, { lat: to[1], lng: to[0] })
}

// sums up the lengths of the road segments with a slope bigger than steepSlope
function getHighSlopeInfo(points: LineString, steepSlope: number, showDistanceInMiles: boolean) {
    if (points.coordinates.length == 0) return new RouteInfo()
    if (points.coordinates[0].length != 3) return new RouteInfo()
    const info = new RouteInfo()
    let distForSlope = 0
    let segmentPoints: Coordinate[] = []
    let prevElePoint = points.coordinates[0]
    let prevDistPoint = points.coordinates[0]
    points.coordinates.forEach(currPoint => {
        distForSlope += calcDistPos(currPoint, prevDistPoint)
        // we assume that elevation data is not that precise and we can improve when using a minimum distance:
        if (distForSlope > 100) {
            const slope = (100.0 * Math.abs(prevElePoint[2] - currPoint[2])) / distForSlope
            if (slope > steepSlope) {
                const distanceTxt = metersToShortText(Math.round(distForSlope), showDistanceInMiles)
                info.values.push(distanceTxt + ' (' + Math.round(slope) + '%)')
                info.distance += distForSlope
                info.segments.push(segmentPoints)
            }
            prevElePoint = currPoint
            distForSlope = 0
            segmentPoints = []
        }
        prevDistPoint = currPoint
        segmentPoints.push(toCoordinate(currPoint))
    })
    return info
}

function downloadGPX(path: Path, settings: Settings) {
    let xmlString =
        '<?xml version="1.0" encoding="UTF-8" standalone="no" ?><gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" creator="GraphHopper" version="1.1" xmlns:gh="https://graphhopper.com/public/schema/gpx/1.1">\n'
    xmlString += `<metadata><copyright author="OpenStreetMap contributors"/><link href="http://graphhopper.com"><text>GraphHopper GPX</text></link><time>${new Date().toISOString()}</time></metadata>\n`

    const rte = settings.gpxExportRte
    const wpt = settings.gpxExportWpt
    const trk = settings.gpxExportTrk

    if (wpt)
        xmlString += path.snapped_waypoints.coordinates.reduce((prevString: string, coord: Position) => {
            return prevString + `<wpt lat="${coord[1]}" lon="${coord[0]}"></wpt>\n`
        }, '')

    if (rte) {
        xmlString += '<rte>\n'
        xmlString += path.instructions.reduce((prevString: string, instruction: Instruction) => {
            let routeSegment = `<rtept lat="${instruction.points[0][1].toFixed(
                6,
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
        date.getUTCDate(),
    )}-${metersToTextForFile(path.distance, settings.showDistanceInMiles)}.gpx`
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
        // consider maxAlternativeRoutes only for subRequests that are not yet returned, i.e. state === SENT
        // otherwise it can happen that too fast alternatives reject the main request leading to stale placeholders
        return Math.max(
            paths.length,
            ...subRequests
                .filter(request => request.state === RequestState.SENT)
                .map(request => request.args.maxAlternativeRoutes),
        )
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
                info={props.info}
                requestArguments={props.currentRequest.subRequests[0].args}
            />
        )
    if (hasPendingRequests(props.currentRequest.subRequests)) return <RoutingResultPlaceholder key={1} />
    return ''
}

function createListContent({ info, paths, currentRequest, selectedPath, profile }: RoutingResultsProps) {
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
                    info={info}
                    requestArguments={currentRequest.subRequests[i].args}
                />,
            )
        else result.push(<RoutingResultPlaceholder key={i} />)
    }

    return result
}
