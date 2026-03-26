import styles from './AddressInputAutocomplete.module.css'
import { Bbox } from '@/api/graphhopper'
import { AddressParseResult } from '@/pois/AddressParseResult'

export interface AutocompleteItem {}

export class GeocodingItem implements AutocompleteItem {
    mainText: string
    secondText: string
    point: { lat: number; lng: number }
    bbox: Bbox

    constructor(mainText: string, secondText: string, point: { lat: number; lng: number }, bbox: Bbox) {
        this.mainText = mainText
        this.secondText = secondText
        this.point = point
        this.bbox = bbox
    }

    toText() {
        return this.mainText + ', ' + this.secondText
    }
}

export class RecentLocationItem implements AutocompleteItem {
    mainText: string
    secondText: string
    point: { lat: number; lng: number }

    constructor(mainText: string, secondText: string, point: { lat: number; lng: number }) {
        this.mainText = mainText
        this.secondText = secondText
        this.point = point
    }

    toText() {
        return this.mainText + ', ' + this.secondText
    }
}

export class POIQueryItem implements AutocompleteItem {
    result: AddressParseResult

    constructor(result: AddressParseResult) {
        this.result = result
    }
}

export interface AutocompleteProps {
    items: AutocompleteItem[]
    highlightedItem: AutocompleteItem
    onSelect: (hit: AutocompleteItem) => void
    onClearRecents?: () => void
}

export default function Autocomplete({ items, highlightedItem, onSelect, onClearRecents }: AutocompleteProps) {
    let recentHeaderShown = false
    return (
        <ul>
            {items.map((item, i) => {
                let header = null
                if (item instanceof RecentLocationItem && !recentHeaderShown) {
                    recentHeaderShown = true
                    header = (
                        <div className={styles.recentHeader}>
                            <span className={styles.recentHeaderText}>Recent</span>
                            {onClearRecents && (
                                <button
                                    className={styles.clearRecentsButton}
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={onClearRecents}
                                    title="Clear recent locations"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 -960 960 960">
                                        <path
                                            fill="currentColor"
                                            d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"
                                        />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )
                }
                return (
                    <li key={i} className={styles.autocompleteItem}>
                        {header}
                        {mapToComponent(item, highlightedItem === item, onSelect)}
                    </li>
                )
            })}
        </ul>
    )
}

function mapToComponent(item: AutocompleteItem, isHighlighted: boolean, onSelect: (hit: AutocompleteItem) => void) {
    if (item instanceof GeocodingItem)
        return <GeocodingEntry item={item} isHighlighted={isHighlighted} onSelect={onSelect} />
    else if (item instanceof RecentLocationItem)
        return <RecentLocationEntry item={item} isHighlighted={isHighlighted} onSelect={onSelect} />
    else if (item instanceof POIQueryItem)
        return <POIQueryEntry item={item} isHighlighted={isHighlighted} onSelect={onSelect} />
    else throw Error('Unsupported item type: ' + typeof item)
}

export function POIQueryEntry({
    item,
    isHighlighted,
    onSelect,
}: {
    item: POIQueryItem
    isHighlighted: boolean
    onSelect: (item: POIQueryItem) => void
}) {
    const poi = item.result.poi ? item.result.poi : ''
    return (
        <AutocompleteEntry isHighlighted={isHighlighted} onSelect={() => onSelect(item)}>
            <div className={styles.poiEntry}>
                <span className={styles.poiEntryPrimaryText}>{poi.charAt(0).toUpperCase() + poi.slice(1)}</span>
                <span>{item.result.text('')}</span>
            </div>
        </AutocompleteEntry>
    )
}

function GeocodingEntry({
    item,
    isHighlighted,
    onSelect,
}: {
    item: GeocodingItem
    isHighlighted: boolean
    onSelect: (item: GeocodingItem) => void
}) {
    return (
        <AutocompleteEntry isHighlighted={isHighlighted} onSelect={() => onSelect(item)}>
            <div className={styles.geocodingEntry} title={item.toText()}>
                <span className={styles.mainText}>{item.mainText}</span>
                <span className={styles.secondaryText}>{item.secondText}</span>
            </div>
        </AutocompleteEntry>
    )
}

function RecentLocationEntry({
    item,
    isHighlighted,
    onSelect,
}: {
    item: RecentLocationItem
    isHighlighted: boolean
    onSelect: (item: RecentLocationItem) => void
}) {
    return (
        <AutocompleteEntry isHighlighted={isHighlighted} onSelect={() => onSelect(item)}>
            <div className={styles.recentLocationEntry} title={item.toText()}>
                <span className={styles.mainText}>{item.mainText}</span>
                <span className={styles.secondaryText}>{item.secondText}</span>
            </div>
        </AutocompleteEntry>
    )
}

function AutocompleteEntry({
    isHighlighted,
    children,
    onSelect,
}: {
    isHighlighted: boolean
    children: React.ReactNode
    onSelect: () => void
}) {
    const className = isHighlighted ? styles.selectableItem + ' ' + styles.highlightedItem : styles.selectableItem
    return (
        <button
            className={className}
            // using click events for mouse interaction and touch end to select an entry.
            onClick={() => onSelect()}
            // minor workaround to improve success rate for click even if start and end location on screen are slightly different
            onTouchEnd={e => {
                e.preventDefault() // do not forward click to underlying component
                onSelect()
            }}
            onMouseDown={e => {
                // prevents that input->onBlur is called when clicking the autocomplete item (focus would be lost and autocomplete items would disappear before they can be clicked)
                // See also the onMouseDown calls in the buttons in AddressInput.tsx created for the same reason.
                e.preventDefault()
            }}
        >
            {children}
        </button>
    )
}
