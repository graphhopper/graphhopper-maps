import { GeocodingHit } from '@/api/graphhopper'
import styles from './AddressInputAutocomplete.module.css'
import React, { useState } from 'react'
import CurrentLocationIcon from './current-location.svg'
import { tr } from '@/translation/Translation'

export interface AutocompleteItem {
    type: 'geocoding' | 'currentLocation'
}

export interface GeocodingItem extends AutocompleteItem {
    type: 'geocoding'
    hit: GeocodingHit
}

export interface SelectCurrentLocationItem extends AutocompleteItem {
    type: 'currentLocation'
}

export function isGeocodingItem(item: AutocompleteItem): item is GeocodingItem {
    return (item as GeocodingItem).type === 'geocoding'
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
        default:
            throw Error('Unsupported item type: ' + item.type)
    }
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
            <div className={styles.geocodingEntry}>
                <span className={styles.mainText}>{convertToMainText(item.hit)}</span>
                <span className={styles.secondaryText}>{convertToSecondaryText(item.hit)}</span>
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

function convertToMainText(hit: GeocodingHit) {
    if (hit.name && hit.housenumber) return hit.name + ' ' + hit.housenumber
    return hit.name
}

function convertToSecondaryText(hit: GeocodingHit) {
    let result = convertToCity(hit, ', ')
    result += convertToCountry(hit)
    return result
}

function convertToCity(hit: GeocodingHit, appendix: string) {
    if (hit.city && hit.postcode) return hit.postcode + ' ' + hit.city + appendix
    if (hit.city) return hit.city + appendix
    if (hit.postcode) return hit.postcode + appendix
    return ''
}

function convertToCountry(hit: GeocodingHit) {
    return hit.country ? hit.country : ''
}
