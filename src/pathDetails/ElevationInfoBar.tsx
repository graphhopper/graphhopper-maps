import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Path } from '@/api/graphhopper'
import { SettingsContext } from '@/contexts/SettingsContext'
import Dispatcher from '@/stores/Dispatcher'
import { PathDetailsHover } from '@/actions/Actions'
import { buildChartData, buildInclineDetail } from './elevationWidget/pathDetailData'
import { getSlopeColor } from './elevationWidget/colors'
import { ChartHoverResult, ChartPathDetail } from './elevationWidget/types'
import ElevationWidget from './elevationWidget/ElevationWidget'
import { tr } from '@/translation/Translation'

interface ElevationInfoBarProps {
    selectedPath: Path
    alternativePaths: Path[]
    profile: string
    isExpanded: boolean
    onToggleExpanded: () => void
    onClose?: () => void
    onActiveDetailChanged: (detail: ChartPathDetail | null) => void
}

export default function ElevationInfoBar({
    selectedPath,
    alternativePaths,
    profile,
    isExpanded,
    onToggleExpanded,
    onClose,
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

    // Original 1-based route numbers for each alternative (e.g. if route 2 is selected, alts are [1, 3])
    const alternativeRouteNumbers = alternativePaths
        .map((p, i) => ({ path: p, num: i + 1 }))
        .filter(x => x.path !== selectedPath && x.path.points.coordinates.length > 0)
        .map(x => x.num)

    const inclineDetail = useMemo(
        () => (chartData ? buildInclineDetail(chartData.elevation) : null),
        [chartData],
    )

    // Compute effective active detail: dropdown detail takes priority, then incline toggle
    useEffect(() => {
        const effective = selectedDropdownDetail ?? (inclineOnMap ? inclineDetail : null)
        onActiveDetailChanged(effective)
    }, [selectedDropdownDetail, inclineOnMap, inclineDetail, onActiveDetailChanged])

    const hoverRaf = useRef(0)
    const chartDataRef = useRef(chartData)
    chartDataRef.current = chartData
    const handleHover = useCallback((result: ChartHoverResult | null) => {
        cancelAnimationFrame(hoverRaf.current)
        hoverRaf.current = requestAnimationFrame(() => {
            if (result) {
                const description = result.segment ? String(result.segment.value) : ''
                const color = result.segment?.color
                const elev = chartDataRef.current?.elevation
                let incline: number | undefined
                if (elev && elev.length >= 2) {
                    const i = result.elevationIndex
                    const a = i > 0 ? i - 1 : i
                    const b = i > 0 ? i : i + 1
                    const dist = elev[b].distance - elev[a].distance
                    if (dist > 0) {
                        incline = ((elev[b].elevation - elev[a].elevation) / dist) * 100
                    }
                }
                Dispatcher.dispatch(
                    new PathDetailsHover({
                        point: result.point,
                        elevation: result.elevation,
                        description,
                        distance: result.distance,
                        incline,
                        color: color ?? (incline != null ? getSlopeColor(incline) : undefined),
                    }),
                )
            } else {
                Dispatcher.dispatch(new PathDetailsHover(null))
            }
        })
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
            onClose={onClose}
            alternativeRouteNumbers={alternativeRouteNumbers}
            showInclineOnMap={inclineOnMap}
            onToggleInclineOnMap={handleToggleIncline}
            elevationLabel={tr('elevation')}
        />
    )
}
