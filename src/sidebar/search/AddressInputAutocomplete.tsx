import styles from './AddressInputAutocomplete.module.css'
import React, { useState } from 'react'
import CurrentLocationIcon from './current-location.svg'
import { tr } from '@/translation/Translation'

export interface AutocompleteItem {
    type: 'geocoding' | 'currentLocation' | 'moreResults'
}

export interface GeocodingItem extends AutocompleteItem {
    type: 'geocoding'
    mainText: string
    secondText: string
    point: { lat: number; lng: number }
}

export interface SelectCurrentLocationItem extends AutocompleteItem {
    type: 'currentLocation'
}

export interface MoreResultsItem extends AutocompleteItem {
    type: 'moreResults'
    search: string
}

export function isGeocodingItem(item: AutocompleteItem): item is GeocodingItem {
    return (item as GeocodingItem).type === 'geocoding'
}

export function isMoreResults(item: AutocompleteItem): item is MoreResultsItem {
    return (item as MoreResultsItem).type === 'moreResults'
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
    switch (item.type) {
        case 'geocoding':
            const geocodingItem = item as GeocodingItem
            return <GeocodingEntry item={geocodingItem} isHighlighted={isHighlighted} onSelect={onSelect} />
        case 'currentLocation':
            const locationItem = item as SelectCurrentLocationItem
            return <SelectCurrentLocation item={locationItem} isHighlighted={isHighlighted} onSelect={onSelect} />
        case 'moreResults':
            const moreResults = item as MoreResultsItem
            return <MoreResultsEntry item={moreResults} isHighlighted={isHighlighted} onSelect={onSelect} />
        default:
            throw Error('Unsupported item type: ' + item.type)
    }
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
                <span className={styles.moreResultsText}>{tr('More...')}</span>
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
            <div className={styles.geocodingEntry} title={item.mainText + ' ' + item.secondText}>
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
