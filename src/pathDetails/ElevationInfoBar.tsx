import { useCallback, useContext, useMemo, useState } from 'react'
import { Path } from '@/api/graphhopper'
import { QueryPoint } from '@/stores/QueryStore'
import { SettingsContext } from '@/contexts/SettingsContext'
import Dispatcher from '@/stores/Dispatcher'
import { PathDetailsHover } from '@/actions/Actions'
import { buildChartData } from './elevationWidget/pathDetailData'
import { ChartHoverResult, ChartPathDetail } from './elevationWidget/types'
import ElevationWidget from './elevationWidget/ElevationWidget'
import { tr } from '@/translation/Translation'

interface ElevationInfoBarProps {
    selectedPath: Path
    alternativePaths: Path[]
    queryPoints: QueryPoint[]
    isExpanded: boolean
    onToggleExpanded: () => void
    onActiveDetailChanged: (detail: ChartPathDetail | null) => void
}

export default function ElevationInfoBar({
    selectedPath,
    alternativePaths,
    queryPoints,
    isExpanded,
    onToggleExpanded,
    onActiveDetailChanged,
}: ElevationInfoBarProps) {
    const settings = useContext(SettingsContext)

    const chartData = useMemo(
        () =>
            selectedPath.points.coordinates.length > 0
                ? buildChartData(selectedPath, alternativePaths, queryPoints, tr)
                : null,
        [selectedPath, alternativePaths, queryPoints],
    )

    const handleHover = useCallback((result: ChartHoverResult | null) => {
        if (result) {
            const description = result.segment ? String(result.segment.value) : ''
            Dispatcher.dispatch(
                new PathDetailsHover({
                    point: result.point,
                    elevation: result.elevation,
                    description,
                }),
            )
        } else {
            Dispatcher.dispatch(new PathDetailsHover(null))
        }
    }, [])

    const handleDetailSelected = useCallback(
        (detail: ChartPathDetail | null) => {
            onActiveDetailChanged(detail)
        },
        [onActiveDetailChanged],
    )

    return (
        <ElevationWidget
            data={chartData}
            showDistanceInMiles={settings.showDistanceInMiles}
            onHover={handleHover}
            onDetailSelected={handleDetailSelected}
            isExpanded={isExpanded}
            onToggleExpanded={onToggleExpanded}
            elevationLabel={tr('elevation')}
        />
    )
}
