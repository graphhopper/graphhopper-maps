import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Path } from '@/api/graphhopper'
import { SettingsContext } from '@/contexts/SettingsContext'
import Dispatcher from '@/stores/Dispatcher'
import { PathDetailsHover } from '@/actions/Actions'
import { buildChartData, buildInclineDetail } from './elevationWidget/pathDetailData'
import { ChartHoverResult, ChartPathDetail } from './elevationWidget/types'
import ElevationWidget from './elevationWidget/ElevationWidget'
import { tr } from '@/translation/Translation'

interface ElevationInfoBarProps {
    selectedPath: Path
    alternativePaths: Path[]
    profile: string
    isExpanded: boolean
    onToggleExpanded: () => void
    onActiveDetailChanged: (detail: ChartPathDetail | null) => void
}

export default function ElevationInfoBar({
    selectedPath,
    alternativePaths,
    profile,
    isExpanded,
    onToggleExpanded,
    onActiveDetailChanged,
}: ElevationInfoBarProps) {
    const settings = useContext(SettingsContext)
    const [inclineOnMap, setInclineOnMap] = useState(false)
    const [selectedDropdownDetail, setSelectedDropdownDetail] = useState<ChartPathDetail | null>(null)

    const chartData = useMemo(
        () =>
            selectedPath.points.coordinates.length > 0
                ? buildChartData(selectedPath, alternativePaths, tr, profile)
                : null,
        [selectedPath, alternativePaths, profile],
    )

    const inclineDetail = useMemo(
        () => (chartData ? buildInclineDetail(chartData.elevation) : null),
        [chartData],
    )

    // Compute effective active detail: dropdown detail takes priority, then incline toggle
    useEffect(() => {
        const effective = selectedDropdownDetail ?? (inclineOnMap ? inclineDetail : null)
        onActiveDetailChanged(effective)
    }, [selectedDropdownDetail, inclineOnMap, inclineDetail, onActiveDetailChanged])

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

    const handleDetailSelected = useCallback((detail: ChartPathDetail | null) => {
        setSelectedDropdownDetail(detail)
    }, [])

    const handleToggleIncline = useCallback(() => {
        setInclineOnMap(prev => !prev)
    }, [])

    return (
        <ElevationWidget
            data={chartData}
            showDistanceInMiles={settings.showDistanceInMiles}
            onHover={handleHover}
            onDetailSelected={handleDetailSelected}
            isExpanded={isExpanded}
            onToggleExpanded={onToggleExpanded}
            showInclineOnMap={inclineOnMap}
            onToggleInclineOnMap={handleToggleIncline}
            elevationLabel={tr('elevation')}
        />
    )
}
