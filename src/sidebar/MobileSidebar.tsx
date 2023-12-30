import React, { useCallback, useEffect, useRef, useState } from 'react'
import { QueryPoint, QueryPointType, QueryStoreState, RequestState } from '@/stores/QueryStore'
import { RouteStoreState } from '@/stores/RouteStore'
import { ErrorStoreState } from '@/stores/ErrorStore'
import styles from './MobileSidebar.module.css'
import Search from '@/sidebar/search/Search'
import ErrorMessage from '@/sidebar/ErrorMessage'
import { MarkerComponent } from '@/map/Marker'
import RoutingProfiles from '@/sidebar/search/routingProfiles/RoutingProfiles'
import CustomModelBox from '@/sidebar/CustomModelBox'

type MobileSidebarProps = {
    query: QueryStoreState
    error: ErrorStoreState
    encodedValues: object[]
    drawAreas: boolean
    onFocus: (b: boolean) => void
}

export default function ({ query, error, encodedValues, drawAreas, onFocus }: MobileSidebarProps) {
    const [showCustomModelBox, setShowCustomModelBox] = useState(false)

    // query results get only the selected path as result list. If we like having just one path on the small layout we can change
    // the store so that it will only fetch a single route on mobile
    return (
        <div className={styles.sidebar}>
            <div className={styles.background}>
                <div className={styles.btnCloseContainer}>
                    <RoutingProfiles
                        routingProfiles={query.profiles}
                        selectedProfile={query.routingProfile}
                        showCustomModelBox={showCustomModelBox}
                        toggleCustomModelBox={() => setShowCustomModelBox(!showCustomModelBox)}
                        customModelBoxEnabled={query.customModelEnabled}
                    />
                    {showCustomModelBox && (
                        <CustomModelBox
                            customModelEnabled={query.customModelEnabled}
                            encodedValues={encodedValues}
                            customModelStr={query.customModelStr}
                            queryOngoing={query.currentRequest.subRequests[0]?.state === RequestState.SENT}
                            drawAreas={drawAreas}
                        />
                    )}
                    <Search points={query.queryPoints} onFocus={onFocus} />
                </div>
                {!error.isDismissed && <ErrorMessage error={error} />}
            </div>
        </div>
    )
}

function hasResult(route: RouteStoreState) {
    return route.routingResult.paths.length > 0
}

// call this queryText, so that QueryPoints can be passed in as props because they have a fitting shape
function SmallQueryPoint({ text, color, position }: { text: string; color: string; position: QueryPointType }) {
    // @ts-ignore
    return (
        <div className={styles.mapViewRow}>
            <div className={styles.markerContainer}>
                <MarkerComponent color={color} />
            </div>
            <span className={getClassName(position)}>{text}</span>
        </div>
    )
}

function getClassName(position: QueryPointType) {
    switch (position) {
        case QueryPointType.To:
            return styles.queryPointText + ' ' + styles.queryPointTextTo
        case QueryPointType.Via:
            return styles.queryPointText + ' ' + styles.queryPointTextVia
        default:
            return styles.queryPointText
    }
}

function IntermediatePoint({ points }: { points: QueryPoint[] }) {
    // for a total number of three points display intermediate via point
    if (points.length === 3)
        return <SmallQueryPoint text={points[1].queryText} color={points[1].color} position={QueryPointType.Via} />

    // for more than total of three points display the number of via points
    if (points.length > 3)
        return (
            <SmallQueryPoint text={points.length - 2 + ' via points'} color={'#76D0F7'} position={QueryPointType.Via} />
        )

    return <div /> // in case of no via points display nothing
}
