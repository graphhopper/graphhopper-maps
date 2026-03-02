import { LegendEntry } from './types'

interface LegendProps {
    entries: LegendEntry[]
}

export default function Legend({ entries }: LegendProps) {
    if (entries.length === 0) return null
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 0.75rem', fontSize: '11px', color: '#555' }}>
            {entries.map((entry, i) => (
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
        </div>
    )
}
