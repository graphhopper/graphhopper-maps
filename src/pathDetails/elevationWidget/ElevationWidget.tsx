import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './ElevationWidget.module.css'
import ChartRenderer from './ChartRenderer'
import { ChartData, ChartHoverResult, ChartPathDetail, LegendEntry } from './types'
import { INCLINE_CATEGORIES } from './colors'
import DetailSelector from './DetailSelector'
import Legend from './Legend'

const INCLINE_LEGEND: LegendEntry[] = INCLINE_CATEGORIES.map(c => ({ label: c.label, color: c.color }))

interface ElevationWidgetProps {
    data: ChartData | null
    showDistanceInMiles: boolean
    onHover: (result: ChartHoverResult | null) => void
    onDetailSelected: (detail: ChartPathDetail | null) => void
    isExpanded: boolean
    onToggleExpanded: () => void
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
    elevationLabel,
}: ElevationWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const chartCanvasRef = useRef<HTMLCanvasElement>(null)
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
    const rendererRef = useRef<ChartRenderer | null>(null)
    const observerRef = useRef<ResizeObserver | null>(null)
    const [selectedKey, setSelectedKey] = useState<string | null>(null)

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
                    const w = entry.contentRect.width
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

    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!rendererRef.current) return
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            const result = rendererRef.current.hitTest(x, y)
            if (result) {
                rendererRef.current.drawHoverLine(result.distance)
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

    const hasData = !!data && data.elevation.length > 0
    const selectedDetail = hasData ? (data.pathDetails.find(d => d.key === selectedKey) || null) : null

    return (
        <div className={styles.container} style={{ display: hasData ? undefined : 'none' }}>
            <div className={styles.controls}>
                <DetailSelector
                    details={data?.pathDetails || []}
                    selectedKey={selectedKey}
                    onSelect={setSelectedKey}
                    elevationLabel={elevationLabel}
                />
                {selectedDetail
                    ? <Legend entries={selectedDetail.legend} />
                    : hasData && <Legend entries={INCLINE_LEGEND} />
                }
                <button
                    className={styles.expandButton}
                    onClick={onToggleExpanded}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                >
                    {isExpanded ? '\u25C0' : '\u25B6'}
                </button>
            </div>
            <div className={styles.canvasContainer} ref={containerRef} style={{ height: CHART_HEIGHT }}>
                <canvas ref={chartCanvasRef} className={styles.chartCanvas} />
                <canvas
                    ref={overlayCanvasRef}
                    className={styles.overlayCanvas}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{ pointerEvents: 'auto' }}
                />
            </div>
        </div>
    )
}
