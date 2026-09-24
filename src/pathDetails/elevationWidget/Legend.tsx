import { CSSProperties } from 'react'
import { LegendEntry } from './types'

const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
// the app font has no arrow glyphs and desktop Firefox's fallback font draws them ~2px too low
// (mobile Firefox's is fine); only Firefox supports -moz-appearance
const nudgeLabelUp = !isTouchDevice && CSS.supports('-moz-appearance', 'none')

const legendStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem 0.75rem',
    fontSize: '13px',
    color: '#555',
}

// small widget state: stretch over the free row space and distribute it, keeping all entries on one line
const compactStyle: CSSProperties = {
    ...legendStyle,
    flex: 1,
    minWidth: 0,
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    gap: '0.3rem 0.2rem',
    fontSize: isTouchDevice ? '12px' : '13px',
}

interface LegendProps {
    entries: LegendEntry[]
    maxVisible?: number
    showTitle?: boolean
    compact?: boolean
}

export default function Legend({ entries, maxVisible, showTitle, compact }: LegendProps) {
    if (entries.length === 0) return null
    const truncated = maxVisible != null && entries.length > maxVisible
    const visible = truncated ? entries.slice(0, maxVisible) : entries
    const small = compact && isTouchDevice
    return (
        <div
            // the maxWidth cap keeps the distributed gaps from growing arbitrarily wide
            style={compact ? { ...compactStyle, maxWidth: `${visible.length * 2}rem` } : legendStyle}
        >
            {visible.map((entry, i) => (
                <div
                    key={i}
                    title={entry.title}
                    style={{ display: 'flex', alignItems: 'center', gap: small ? '0.15rem' : '0.25rem' }}
                >
                    <span
                        style={{
                            width: small ? 8 : 10,
                            height: small ? 8 : 10,
                            borderRadius: 2,
                            backgroundColor: entry.color,
                            flexShrink: 0,
                        }}
                    />
                    <span style={{ lineHeight: 1, ...(nudgeLabelUp ? { position: 'relative', top: -2 } : {}) }}>
                        {showTitle && entry.title ? entry.label + ' ' + entry.title : entry.label}
                    </span>
                </div>
            ))}
            {truncated && <span style={{ color: '#999' }}>{'\u2026'}</span>}
        </div>
    )
}
