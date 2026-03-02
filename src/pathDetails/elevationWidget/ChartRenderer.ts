import { ChartConfig, ChartData, ChartHoverResult, ChartPathDetail, ElevationPoint } from './types'
import { calculateNiceTicks, formatDistanceLabel, formatElevationLabel } from './axisUtils'
import { getSlopeColor } from './colors'

const DEFAULT_MARGIN = { top: 10, right: 15, bottom: 28, left: 45 }
const DETAIL_BAR_HEIGHT = 20
const FONT = '11px sans-serif'
const AXIS_COLOR = '#666'
const GRID_COLOR = '#e8e8e8'
const VIA_POINT_COLOR = '#76D0F7'
const ALT_ROUTE_COLOR = '#aaa'

export default class ChartRenderer {
    private chartCanvas: HTMLCanvasElement
    private overlayCanvas: HTMLCanvasElement
    private data: ChartData | null = null
    private config: ChartConfig = {
        showDistanceInMiles: false,
        height: 160,
        margin: DEFAULT_MARGIN,
        devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    }
    private selectedDetail: ChartPathDetail | null = null
    private cssWidth = 0
    private cssHeight = 0

    constructor(chartCanvas: HTMLCanvasElement, overlayCanvas: HTMLCanvasElement) {
        this.chartCanvas = chartCanvas
        this.overlayCanvas = overlayCanvas
    }

    // widens the right margin so the right y-axis labels have room outside the plot area
    private getEffectiveMargin() {
        const base = this.config.margin
        if (this.selectedDetail?.type === 'line') {
            return { ...base, right: 35 }
        }
        return base
    }

    setData(data: ChartData | null) {
        this.data = data
        this.render()
    }

    setConfig(config: Partial<ChartConfig>) {
        Object.assign(this.config, config)
        this.render()
    }

    setSelectedDetail(detail: ChartPathDetail | null) {
        this.selectedDetail = detail
        this.render()
    }

    resize(width: number, height: number) {
        this.cssWidth = width
        this.cssHeight = height
        const dpr = this.config.devicePixelRatio

        for (const canvas of [this.chartCanvas, this.overlayCanvas]) {
            canvas.width = Math.round(width * dpr)
            canvas.height = Math.round(height * dpr)
            canvas.style.width = width + 'px'
            canvas.style.height = height + 'px'
        }
        this.render()
    }

    // The hitTest method determines what data point is under the mouse.
    // It uses binary search to get the closest elevation data for a certain x value.
    hitTest(pixelX: number, pixelY: number): ChartHoverResult | null {
        if (!this.data || this.data.elevation.length === 0) return null
        const margin = this.getEffectiveMargin()
        const plotWidth = this.cssWidth - margin.left - margin.right
        const elev = this.data.elevation

        const x = pixelX - margin.left
        if (x < 0 || x > plotWidth) return null

        const totalDist = elev[elev.length - 1].distance
        if (totalDist === 0) return null

        const distance = (x / plotWidth) * totalDist

        // Binary search for closest point
        let lo = 0
        let hi = elev.length - 1
        while (lo < hi) {
            const mid = (lo + hi) >> 1
            if (elev[mid].distance < distance) lo = mid + 1
            else hi = mid
        }
        // Check if previous point is closer
        if (lo > 0 && Math.abs(elev[lo - 1].distance - distance) < Math.abs(elev[lo].distance - distance)) {
            lo = lo - 1
        }

        const point = elev[lo]

        // Find which segment (if any) the hover is in
        let segment = undefined
        if (this.selectedDetail) {
            for (const seg of this.selectedDetail.segments) {
                if (distance >= seg.fromDistance && distance <= seg.toDistance) {
                    segment = seg
                    break
                }
            }
        }

        return {
            distance: point.distance,
            elevationIndex: lo,
            point: { lng: point.lng, lat: point.lat },
            elevation: point.elevation,
            segment,
        }
    }

    drawHoverLine(hit: ChartHoverResult) {
        const ctx = this.overlayCanvas.getContext('2d')
        if (!ctx || !this.data || this.data.elevation.length === 0) return
        const dpr = this.config.devicePixelRatio
        const margin = this.getEffectiveMargin()
        const plotWidth = this.cssWidth - margin.left - margin.right
        const totalDist = this.data.elevation[this.data.elevation.length - 1].distance
        if (totalDist === 0) return

        ctx.save()
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, this.cssWidth, this.cssHeight)

        const x = margin.left + (hit.distance / totalDist) * plotWidth
        const plotBottom = this.cssHeight - margin.bottom
        const detailBarH = this.selectedDetail ? DETAIL_BAR_HEIGHT : 0

        ctx.beginPath()
        ctx.strokeStyle = '#333'
        ctx.lineWidth = 1
        ctx.moveTo(Math.round(x) + 0.5, margin.top)
        ctx.lineTo(Math.round(x) + 0.5, plotBottom)
        ctx.stroke()

        const isLineDetail = this.selectedDetail?.type === 'line'

        // Draw elevation dot (only when not showing a line-type detail)
        if (!isLineDetail) {
            const { eleMin, eleMax } = this.getElevationRange()
            const plotHeight = plotBottom - margin.top - detailBarH
            const elevY = plotBottom - detailBarH - ((hit.elevation - eleMin) / (eleMax - eleMin || 1)) * plotHeight

            ctx.beginPath()
            ctx.arc(x, elevY, 4, 0, Math.PI * 2)
            ctx.fillStyle = '#333'
            ctx.fill()
            ctx.strokeStyle = 'white'
            ctx.lineWidth = 2
            ctx.stroke()
        }

        // Build tooltip label - context-aware
        const miles = this.config.showDistanceInMiles
        const distLabel = formatDistanceLabel(hit.distance, miles)
        let valueLabel: string
        if (hit.segment) {
            valueLabel = String(hit.segment.value)
        } else {
            valueLabel = formatElevationLabel(hit.elevation, miles)
        }
        const label = valueLabel ? `${distLabel}  ${valueLabel}` : distLabel

        ctx.font = '12px sans-serif'
        const textWidth = ctx.measureText(label).width
        const padding = 6
        const tooltipW = textWidth + padding * 2
        const tooltipH = 20
        let tooltipX = x - tooltipW / 2
        tooltipX = Math.max(margin.left, Math.min(tooltipX, this.cssWidth - margin.right - tooltipW))
        const tooltipY = margin.top + 2

        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.strokeStyle = '#ccc'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(tooltipX, tooltipY, tooltipW, tooltipH, 3)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = '#333'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, tooltipX + tooltipW / 2, tooltipY + tooltipH / 2)

        ctx.restore()
    }

    clearHoverLine() {
        const ctx = this.overlayCanvas.getContext('2d')
        if (!ctx) return
        const dpr = this.config.devicePixelRatio
        ctx.save()
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, this.cssWidth, this.cssHeight)
        ctx.restore()
    }

    // scans min+max and ensure 100m minimum span, plus adds padding
    private getElevationRange(): { eleMin: number; eleMax: number } {
        if (!this.data || this.data.elevation.length === 0) return { eleMin: 0, eleMax: 100 }
        let eleMin = Infinity
        let eleMax = -Infinity
        for (const p of this.data.elevation) {
            eleMin = Math.min(eleMin, p.elevation)
            eleMax = Math.max(eleMax, p.elevation)
        }
        // Ensure minimum span of 100m
        if (eleMax - eleMin < 100) {
            const mid = (eleMin + eleMax) / 2
            eleMin = mid - 50
            eleMax = mid + 50
        }
        // Add padding
        const pad = (eleMax - eleMin) * 0.1
        eleMin -= pad
        eleMax += pad
        return { eleMin, eleMax }
    }

    private render() {
        const ctx = this.chartCanvas.getContext('2d')
        if (!ctx || this.cssWidth === 0 || this.cssHeight === 0) return
        if (!this.data || this.data.elevation.length === 0) {
            ctx.save()
            ctx.setTransform(this.config.devicePixelRatio, 0, 0, this.config.devicePixelRatio, 0, 0)
            ctx.clearRect(0, 0, this.cssWidth, this.cssHeight)
            ctx.restore()
            return
        }

        const dpr = this.config.devicePixelRatio
        ctx.save()
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, this.cssWidth, this.cssHeight)

        const margin = this.getEffectiveMargin()
        const plotWidth = this.cssWidth - margin.left - margin.right
        const plotBottom = this.cssHeight - margin.bottom
        const detailBarH = this.selectedDetail ? DETAIL_BAR_HEIGHT : 0
        const plotHeight = plotBottom - margin.top - detailBarH

        const elev = this.data.elevation
        const totalDist = elev[elev.length - 1].distance
        const { eleMin, eleMax } = this.getElevationRange()

        const xScale = (d: number) => margin.left + (d / totalDist) * plotWidth
        const yScale = (e: number) => plotBottom - detailBarH - ((e - eleMin) / (eleMax - eleMin)) * plotHeight

        // Draw grid
        this.drawGrid(ctx, eleMin, eleMax, totalDist, xScale, yScale, plotWidth, plotHeight, detailBarH)

        const isLineDetail = this.selectedDetail?.type === 'line'

        // Draw elevation area only when no line-type detail is active
        if (!isLineDetail) {
            // Draw alternative elevations
            for (const altElev of this.data.alternativeElevations) {
                this.drawAlternativeElevation(ctx, altElev, plotWidth, plotBottom, detailBarH, plotHeight, eleMin, eleMax)
            }

            // Draw main elevation area with slope coloring
            this.drawElevationArea(ctx, elev, xScale, yScale, plotBottom - detailBarH)
        }

        // Draw detail bar or line
        if (this.selectedDetail) {
            if (isLineDetail) {
                this.drawDetailLine(ctx, this.selectedDetail, xScale, plotBottom, detailBarH, plotHeight, margin.top)
            } else {
                this.drawDetailBars(ctx, this.selectedDetail, xScale, plotBottom, detailBarH)
            }
        }

        // Draw via point markers
        this.drawViaPointMarkers(ctx, xScale, margin.top, plotBottom)

        // Draw axes
        this.drawXAxis(ctx, totalDist, xScale, plotBottom)
        if (!isLineDetail) {
            this.drawYAxis(ctx, eleMin, eleMax, yScale, margin.left, margin.top, plotBottom - detailBarH)
        }

        ctx.restore()
        this.clearHoverLine()
    }

    private drawGrid(
        ctx: CanvasRenderingContext2D,
        eleMin: number,
        eleMax: number,
        totalDist: number,
        xScale: (d: number) => number,
        yScale: (e: number) => number,
        plotWidth: number,
        plotHeight: number,
        detailBarH: number,
    ) {
        const margin = this.getEffectiveMargin()
        ctx.strokeStyle = GRID_COLOR
        ctx.lineWidth = 1

        // Horizontal grid lines
        const yTicks = calculateNiceTicks(eleMin, eleMax, 5)
        for (const t of yTicks) {
            const y = Math.round(yScale(t)) + 0.5
            if (y < margin.top || y > this.cssHeight - margin.bottom - detailBarH) continue
            ctx.beginPath()
            ctx.moveTo(margin.left, y)
            ctx.lineTo(margin.left + plotWidth, y)
            ctx.stroke()
        }

        // Vertical grid lines
        const xTicks = calculateNiceTicks(0, totalDist, 6)
        for (const t of xTicks) {
            const x = Math.round(xScale(t)) + 0.5
            if (x < margin.left || x > margin.left + plotWidth) continue
            ctx.beginPath()
            ctx.moveTo(x, margin.top)
            ctx.lineTo(x, this.cssHeight - margin.bottom)
            ctx.stroke()
        }
    }

    private drawAlternativeElevation(
        ctx: CanvasRenderingContext2D,
        altElev: ElevationPoint[],
        plotWidth: number,
        plotBottom: number,
        detailBarH: number,
        plotHeight: number,
        eleMin: number,
        eleMax: number,
    ) {
        if (altElev.length < 2) return
        const margin = this.getEffectiveMargin()
        const altTotalDist = altElev[altElev.length - 1].distance

        // Alt route spans the full plot width at its own total distance
        const altXScale = (d: number) => margin.left + (d / altTotalDist) * plotWidth
        const yScale = (e: number) => plotBottom - detailBarH - ((e - eleMin) / (eleMax - eleMin)) * plotHeight

        ctx.beginPath()
        ctx.strokeStyle = ALT_ROUTE_COLOR
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 3])
        ctx.moveTo(altXScale(altElev[0].distance), yScale(altElev[0].elevation))
        for (let i = 1; i < altElev.length; i++) {
            ctx.lineTo(altXScale(altElev[i].distance), yScale(altElev[i].elevation))
        }
        ctx.stroke()
        ctx.setLineDash([])
    }

    private drawElevationArea(
        ctx: CanvasRenderingContext2D,
        elev: ElevationPoint[],
        xScale: (d: number) => number,
        yScale: (e: number) => number,
        baseline: number,
    ) {
        if (elev.length < 2) return

        // Merge consecutive segments with the same slope color to avoid sub-pixel gaps
        const runs: { fromIdx: number; toIdx: number; color: string }[] = []
        let currentColor = ''
        let runStart = 0

        for (let i = 0; i < elev.length - 1; i++) {
            const dist = elev[i + 1].distance - elev[i].distance
            const slope = dist > 0 ? (100 * (elev[i + 1].elevation - elev[i].elevation)) / dist : 0
            const color = getSlopeColor(slope)
            if (color !== currentColor) {
                if (currentColor !== '') {
                    runs.push({ fromIdx: runStart, toIdx: i, color: currentColor })
                }
                runStart = i
                currentColor = color
            }
        }
        if (currentColor !== '') {
            runs.push({ fromIdx: runStart, toIdx: elev.length - 1, color: currentColor })
        }

        // Draw each merged run as a single filled polygon
        for (const run of runs) {
            const x1 = xScale(elev[run.fromIdx].distance)
            const x2 = xScale(elev[run.toIdx].distance)
            if (x2 - x1 < 0.1) continue

            ctx.beginPath()
            ctx.moveTo(x1, baseline)
            for (let i = run.fromIdx; i <= run.toIdx; i++) {
                ctx.lineTo(xScale(elev[i].distance), yScale(elev[i].elevation))
            }
            ctx.lineTo(x2, baseline)
            ctx.closePath()
            ctx.fillStyle = run.color + '60'
            ctx.fill()
        }

        // Draw elevation line on top
        ctx.beginPath()
        ctx.strokeStyle = '#555'
        ctx.lineWidth = 1
        ctx.moveTo(xScale(elev[0].distance), yScale(elev[0].elevation))
        for (let i = 1; i < elev.length; i++) {
            ctx.lineTo(xScale(elev[i].distance), yScale(elev[i].elevation))
        }
        ctx.stroke()
    }

    private drawDetailBars(
        ctx: CanvasRenderingContext2D,
        detail: ChartPathDetail,
        xScale: (d: number) => number,
        plotBottom: number,
        barHeight: number,
    ) {
        const barTop = plotBottom - barHeight
        for (const seg of detail.segments) {
            const x1 = xScale(seg.fromDistance)
            const x2 = xScale(seg.toDistance)
            ctx.fillStyle = seg.color
            ctx.fillRect(x1, barTop, x2 - x1, barHeight)
        }

        // Draw bar border
        ctx.strokeStyle = '#ccc'
        ctx.lineWidth = 0.5
        ctx.strokeRect(xScale(detail.segments[0]?.fromDistance || 0), barTop,
            xScale(detail.segments[detail.segments.length - 1]?.toDistance || 0) - xScale(detail.segments[0]?.fromDistance || 0),
            barHeight)
    }

    private drawDetailLine(
        ctx: CanvasRenderingContext2D,
        detail: ChartPathDetail,
        xScale: (d: number) => number,
        plotBottom: number,
        detailBarH: number,
        plotHeight: number,
        plotTop: number,
    ) {
        if (detail.minValue === undefined || detail.maxValue === undefined) return
        let min = detail.minValue
        let max = detail.maxValue
        // Ensure minimum span
        if (max - min < 10) {
            const mid = (min + max) / 2
            min = mid - 25
            max = mid + 25
        }
        const pad = (max - min) * 0.1
        min -= pad
        max += pad

        const lineY = (v: number) => plotBottom - detailBarH - ((v - min) / (max - min)) * plotHeight

        // Draw stepped line
        ctx.beginPath()
        ctx.strokeStyle = '#1976D2'
        ctx.lineWidth = 2
        let started = false
        for (const seg of detail.segments) {
            const x1 = xScale(seg.fromDistance)
            const x2 = xScale(seg.toDistance)
            const y = lineY(Number(seg.value))
            if (!started) {
                ctx.moveTo(x1, y)
                started = true
            } else {
                ctx.lineTo(x1, y)
            }
            ctx.lineTo(x2, y)
        }
        ctx.stroke()

        // Draw right-side y-axis for the detail values
        const margin = this.getEffectiveMargin()
        const rightX = this.cssWidth - margin.right
        const ticks = calculateNiceTicks(min, max, 4)
        ctx.font = '10px sans-serif'
        ctx.fillStyle = '#1976D2'
        ctx.textBaseline = 'middle'

        // Axis line
        ctx.strokeStyle = '#1976D2'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(rightX + 0.5, plotTop)
        ctx.lineTo(rightX + 0.5, plotBottom - detailBarH)
        ctx.stroke()

        ctx.textAlign = 'left'
        for (const t of ticks) {
            const y = lineY(t)
            if (y < plotTop || y > plotBottom - detailBarH) continue
            ctx.fillText(String(Math.round(t)), rightX + 4, y)
        }

        // Draw unit label at top of axis
        if (detail.unit) {
            ctx.font = '9px sans-serif'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'bottom'
            ctx.fillText(detail.unit, rightX + 3, plotTop - 1)
        }
    }

    private drawViaPointMarkers(
        ctx: CanvasRenderingContext2D,
        xScale: (d: number) => number,
        top: number,
        bottom: number,
    ) {
        if (!this.data) return
        ctx.save()
        ctx.strokeStyle = VIA_POINT_COLOR
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 4])

        for (const dist of this.data.viaPointDistances) {
            const x = Math.round(xScale(dist)) + 0.5
            ctx.beginPath()
            ctx.moveTo(x, top)
            ctx.lineTo(x, bottom)
            ctx.stroke()
        }

        ctx.restore()
    }

    private drawXAxis(
        ctx: CanvasRenderingContext2D,
        totalDist: number,
        xScale: (d: number) => number,
        plotBottom: number,
    ) {
        const margin = this.getEffectiveMargin()
        const miles = this.config.showDistanceInMiles
        const ticks = calculateNiceTicks(0, totalDist, 6)

        // Axis line
        ctx.strokeStyle = AXIS_COLOR
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(margin.left, plotBottom + 0.5)
        ctx.lineTo(this.cssWidth - margin.right, plotBottom + 0.5)
        ctx.stroke()

        // Tick labels
        ctx.font = FONT
        ctx.fillStyle = AXIS_COLOR
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        for (const t of ticks) {
            const x = xScale(t)
            if (x < margin.left || x > this.cssWidth - margin.right) continue
            ctx.fillText(formatDistanceLabel(t, miles), x, plotBottom + 4)
        }
    }

    private drawYAxis(
        ctx: CanvasRenderingContext2D,
        eleMin: number,
        eleMax: number,
        yScale: (e: number) => number,
        left: number,
        top: number,
        bottom: number,
    ) {
        const miles = this.config.showDistanceInMiles
        const ticks = calculateNiceTicks(eleMin, eleMax, 5)

        // Axis line
        ctx.strokeStyle = AXIS_COLOR
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(left - 0.5, top)
        ctx.lineTo(left - 0.5, bottom)
        ctx.stroke()

        // Tick labels
        ctx.font = FONT
        ctx.fillStyle = AXIS_COLOR
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        for (const t of ticks) {
            const y = yScale(t)
            if (y < top || y > bottom) continue
            ctx.fillText(formatElevationLabel(t, miles), left - 5, y)
        }
    }
}
