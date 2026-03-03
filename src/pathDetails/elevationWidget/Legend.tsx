import { LegendEntry } from './types'

interface LegendProps {
    entries: LegendEntry[]
    maxVisible?: number
}

export default function Legend({ entries, maxVisible }: LegendProps) {
    if (entries.length === 0) return null
    const truncated = maxVisible != null && entries.length > maxVisible
    const visible = truncated ? entries.slice(0, maxVisible) : entries
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 0.75rem', fontSize: '13px', color: '#555' }}>
            {visible.map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span
                        style={{
                            display: 'inline-block',
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            backgroundColor: entry.color,
                            flexShrink: 0,
                        }}
                    />
                    <span>{entry.label}</span>
                </div>
            ))}
            {truncated && <span style={{ color: '#999' }}>{'\u2026'}</span>}
        </div>
    )
}
