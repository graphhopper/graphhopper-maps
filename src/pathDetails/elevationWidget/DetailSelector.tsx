import { ChartPathDetail } from './types'

interface DetailSelectorProps {
    details: ChartPathDetail[]
    selectedKey: string | null
    onSelect: (key: string | null) => void
    elevationLabel: string
}

export default function DetailSelector({ details, selectedKey, onSelect, elevationLabel }: DetailSelectorProps) {
    return (
        <select
            value={selectedKey || ''}
            onChange={e => onSelect(e.target.value || null)}
            style={{
                fontSize: '13px',
                padding: '6px 4px',
                border: '1px solid #ccc',
                borderRadius: 4,
                background: 'transparent',
                cursor: 'pointer',
                maxWidth: 160,
            }}
        >
            <option value="">{elevationLabel}</option>
            {details.map(d => (
                <option key={d.key} value={d.key}>
                    {d.label}
                </option>
            ))}
        </select>
    )
}
