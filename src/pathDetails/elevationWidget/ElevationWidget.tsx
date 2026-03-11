import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './ElevationWidget.module.css'
import ChartRenderer from './ChartRenderer'
import { ChartData, ChartHoverResult, ChartPathDetail, LegendEntry } from './types'
import { INCLINE_CATEGORIES, computeInclineCategoryDistances } from './colors'
import { ElevationPoint } from './types'
import DetailSelector from './DetailSelector'
import Legend from './Legend'

// Slope colors are also computed in ChartRenderer.drawElevationArea. Duplicate calculation here to keep the
// legend independent of the renderer's draw cycle.
function getUsedInclineCategories(elevation: ElevationPoint[]): Set<string> {
    const coords = elevation.map(p => [p.lng, p.lat, p.elevation])
    const distances = computeInclineCategoryDistances(coords)
    const used = new Set<string>()
    for (let i = 0; i < distances.length; i++)
        if (distances[i] > 0) used.add(INCLINE_CATEGORIES[i].color)
    return used
}

interface ElevationWidgetProps {
    data: ChartData | null
    showDistanceInMiles: boolean
    onHover: (result: ChartHoverResult | null) => void
    onDetailSelected: (detail: ChartPathDetail | null) => void
    isExpanded: boolean
    onToggleExpanded: () => void
    onClose?: () => void
    alternativeRouteNumbers: number[]
    elevationLabel: string
}

const CHART_HEIGHT = 120

export default function ElevationWidget({
    data,
    showDistanceInMiles,
    onHover,
    onDetailSelected,
    isExpanded,
    onToggleExpanded,
    onClose,
    alternativeRouteNumbers,
    elevationLabel,
}: ElevationWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const chartCanvasRef = useRef<HTMLCanvasElement>(null)
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
    const rendererRef = useRef<ChartRenderer | null>(null)
    const observerRef = useRef<ResizeObserver | null>(null)
    const [selectedKey, setSelectedKey] = useState<string | null>(null)
    const [alternativeIndex, setAltIndex] = useState(-1) // -1 = hidden, 0..N-1 = show that alternative

    // Lazily initialize renderer when canvas refs become available,
    // and update data in the same effect so ordering is guaranteed.
    useEffect(() => {
        const chartCanvas = chartCanvasRef.current
        const overlayCanvas = overlayCanvasRef.current
        const container = containerRef.current
        if (!chartCanvas || !overlayCanvas || !container) return

        if (!rendererRef.current) {
            const renderer = new ChartRenderer(chartCanvas, overlayCanvas)
            rendererRef.current = renderer

            const width = container.clientWidth
            if (width > 0) renderer.resize(width, CHART_HEIGHT)

            const observer = new ResizeObserver(entries => {
                for (const entry of entries) {
                    const w = Math.floor(entry.contentRect.width)
                    if (w > 0) renderer.resize(w, CHART_HEIGHT)
                }
            })
            observer.observe(container)
            observerRef.current = observer
        }

        rendererRef.current.setData(data)
    }, [data])

    // Cleanup observer on unmount
    useEffect(() => {
        return () => {
            observerRef.current?.disconnect()
        }
    }, [])

    // Update config when miles setting changes
    useEffect(() => {
        rendererRef.current?.setConfig({ showDistanceInMiles })
    }, [showDistanceInMiles])

    // Update selected detail
    useEffect(() => {
        const detail = data?.pathDetails.find(d => d.key === selectedKey) || null
        rendererRef.current?.setSelectedDetail(detail)
        onDetailSelected(detail)
    }, [selectedKey, data])

    // Sync alternative index with renderer, and reset when data changes
    useEffect(() => {
        setAltIndex(-1)
    }, [data])

    useEffect(() => {
        rendererRef.current?.setVisibleAlternativeIndex(alternativeIndex)
    }, [alternativeIndex])

    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!rendererRef.current) return
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            const result = rendererRef.current.hitTest(x, y)
            if (result) {
                rendererRef.current.drawHoverLine(result)
                onHover(result)
            } else {
                rendererRef.current.clearHoverLine()
                onHover(null)
            }
        },
        [onHover],
    )

    const handleMouseLeave = useCallback(() => {
        rendererRef.current?.clearHoverLine()
        onHover(null)
    }, [onHover])

    const handleTouchMove = useCallback(
        (e: React.TouchEvent<HTMLCanvasElement>) => {
            if (!rendererRef.current) return
            e.preventDefault() // prevent scrolling while interacting with chart
            const touch = e.touches[0]
            const rect = e.currentTarget.getBoundingClientRect()
            const x = touch.clientX - rect.left
            const y = touch.clientY - rect.top
            const result = rendererRef.current.hitTest(x, y)
            if (result) {
                rendererRef.current.drawHoverLine(result)
                onHover(result)
            } else {
                rendererRef.current.clearHoverLine()
                onHover(null)
            }
        },
        [onHover],
    )

    const handleTouchEnd = useCallback(() => {
        // Keep the hover line visible after finger lifts — don't clear it
        onHover(null)
    }, [onHover])

    const hasData = !!data && data.elevation.length > 0
    const selectedDetail = hasData ? (data.pathDetails.find(d => d.key === selectedKey) || null) : null
    const alternativeCount = data?.alternativeElevations.length ?? 0

    const usedColors = data && data.elevation.length >= 2 ? getUsedInclineCategories(data.elevation) : null
    const inclineLegend = usedColors
        ? INCLINE_CATEGORIES
            .filter(c => usedColors.has(c.color))
            .map(c => ({ label: isExpanded ? c.label : c.shortLabel, color: c.color, title: c.tooltip }))
        : []

    const cycleAlternative = useCallback(() => {
        setAltIndex(prev => (prev + 1 >= alternativeCount ? -1 : prev + 1))
    }, [alternativeCount])

    return (
        <div className={`${styles.container}${isExpanded ? ' ' + styles.containerExpanded : ''}`}>
            <div className={styles.controls}>
                <DetailSelector
                    details={data?.pathDetails || []}
                    selectedKey={selectedKey}
                    onSelect={setSelectedKey}
                    elevationLabel={elevationLabel}
                />
                {selectedDetail
                    ? <Legend entries={selectedDetail.legend} maxVisible={onClose && !isExpanded ? 3 : undefined} showTitle={isExpanded} />
                    : hasData && <Legend entries={inclineLegend} maxVisible={onClose && !isExpanded ? 3 : undefined} />
                }
                <div className={styles.buttons}>
                    {!selectedDetail && alternativeCount > 0 && (
                        <button
                            className={`${styles.alternativeButton}${alternativeIndex >= 0 ? ' ' + styles.alternativeButtonActive : ''}`}
                            onClick={cycleAlternative}
                            title={alternativeIndex >= 0 ? `Route ${alternativeRouteNumbers[alternativeIndex]}` : 'Show alternative elevation'}
                        >
                            {alternativeIndex >= 0 && alternativeCount > 1
                                ? <span className={styles.alternativeNumber}>{alternativeRouteNumbers[alternativeIndex]}</span>
                                : <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M1 10 Q4 4 7 7 Q10 10 13 4" stroke={alternativeIndex >= 0 ? '#555' : '#aaa'} strokeWidth="1.5" fill="none" />
                                    <path d="M1 10 Q5 6 9 5 L13 4" stroke={alternativeIndex >= 0 ? '#aaa' : '#ccc'} strokeWidth="1" strokeDasharray="2 2" fill="none" />
                                </svg>
                            }
                        </button>
                    )}
                    <button
                        className={styles.expandButton}
                        onClick={onToggleExpanded}
                        title={isExpanded ? 'Compact' : 'Expand'}
                    >
                        {isExpanded ? '\u25C0' : '\u25B6'}
                    </button>
                    {isExpanded && onClose && (
                        <button
                            className={styles.expandButton}
                            onClick={onClose}
                            title="Close"
                        >
                            {'\u2715'}
                        </button>
                    )}
                </div>
            </div>
            <div className={styles.canvasContainer} ref={containerRef} style={{ height: CHART_HEIGHT }}>
                <canvas ref={chartCanvasRef} className={styles.chartCanvas} />
                <canvas
                    ref={overlayCanvasRef}
                    className={styles.overlayCanvas}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={handleTouchMove}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{ pointerEvents: 'auto', touchAction: 'none' }}
                />
            </div>
        </div>
    )
}
