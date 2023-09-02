import styles from './AddressInputAutocomplete.module.css'
import CurrentLocationIcon from './current-location.svg'
import { tr } from '@/translation/Translation'
import { Bbox } from '@/api/graphhopper'
import {useState} from "react";

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

export class SelectCurrentLocationItem implements AutocompleteItem {}

export class MoreResultsItem implements AutocompleteItem {
    search: string

    constructor(search: string) {
        this.search = search
    }
}

export interface AutocompleteProps {
    items: AutocompleteItem[]
    highlightedItem: AutocompleteItem
    onSelect: (hit: AutocompleteItem) => void
}

export default function Autocomplete({ items, highlightedItem, onSelect }: AutocompleteProps) {
    return (
        <ul>
            {items.map((item, i) => (
                <li key={i} className={styles.autocompleteItem}>
                    {mapToComponent(item, highlightedItem === item, onSelect)}
                </li>
            ))}
        </ul>
    )
}

function mapToComponent(item: AutocompleteItem, isHighlighted: boolean, onSelect: (hit: AutocompleteItem) => void) {
    if (item instanceof GeocodingItem)
        return <GeocodingEntry item={item} isHighlighted={isHighlighted} onSelect={onSelect} />
    else if (item instanceof SelectCurrentLocationItem)
        return <SelectCurrentLocation item={item} isHighlighted={isHighlighted} onSelect={onSelect} />
    else if (item instanceof MoreResultsItem)
        return <MoreResultsEntry item={item} isHighlighted={isHighlighted} onSelect={onSelect} />
    else throw Error('Unsupported item type: ' + typeof item)
}

export function MoreResultsEntry({
    item,
    isHighlighted,
    onSelect,
}: {
    item: MoreResultsItem
    isHighlighted: boolean
    onSelect: (item: MoreResultsItem) => void
}) {
    return (
        <AutocompleteEntry isHighlighted={isHighlighted} onSelect={() => onSelect(item)}>
            <div className={styles.moreResultsEntry}>
                <span className={styles.moreResultsText}>{tr('search_with_nominatim')}</span>
            </div>
        </AutocompleteEntry>
    )
}

export function SelectCurrentLocation({
    item,
    isHighlighted,
    onSelect,
}: {
    item: SelectCurrentLocationItem
    isHighlighted: boolean
    onSelect: (item: SelectCurrentLocationItem) => void
}) {
    return (
        <AutocompleteEntry isHighlighted={isHighlighted} onSelect={() => onSelect(item)}>
            <div className={styles.currentLocationEntry}>
                <div className={styles.currentLocationIcon}>
                    <CurrentLocationIcon />
                </div>
                <span className={styles.mainText}>{tr('current_location')}</span>
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

function AutocompleteEntry({
    isHighlighted,
    children,
    onSelect,
}: {
    isHighlighted: boolean
    children: React.ReactNode
    onSelect: () => void
}) {
    const [isCancelled, setIsCancelled] = useState(false)
    const className = isHighlighted ? styles.selectableItem + ' ' + styles.highlightedItem : styles.selectableItem
    return (
        <button
            className={className}
            // using click events for mouse interaction to select an entry.
            onClick={() => onSelect()}
            // On touch devices when listening for the click or pointerup event the next or last address input would
            // be immediately selected after the 'onSelectHit' method was called. This can be prevented by listening
            // for the touchend event separately.
            onTouchEnd={e => {
                e.preventDefault()
                if (!isCancelled) onSelect()
            }}
            // listen for cancel events to prevent selections in case the result list is e.g. scrolled on touch devices
            onPointerCancel={() => setIsCancelled(true)}
            // prevent blur event for input textbox
            onPointerDown={e => {
                setIsCancelled(false)
                e.preventDefault()
            }}
        >
            {children}
        </button>
    )
}
