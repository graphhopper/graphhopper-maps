import PlainButton from '@/PlainButton'
import CurrentLocationIcon from '@/sidebar/search/current-location.svg'
import React from 'react'
import Dispatcher from '@/stores/Dispatcher'
import { ErrorAction } from '@/actions/Actions'
import { Coordinate } from '@/stores/QueryStore'
import { tr } from '@/translation/Translation'
import styles from './CurrentLocation.module.css'

export default function ({
    onStartSearching,
    onSuccess,
    onError,
}: {
    onStartSearching: () => void
    onError: (message: string) => void
    onSuccess: (text: string, coordinate: Coordinate) => void
}) {
    function onRequestCurrentLocation() {
        if (!navigator.geolocation) {
            Dispatcher.dispatch(new ErrorAction('Geolocation is not supported in this browser'))
        }

        onStartSearching()
        navigator.geolocation.getCurrentPosition(
            position => {
                onSuccess(tr('current_location'), { lat: position.coords.latitude, lng: position.coords.longitude })
            },
            error => {
                onError(error.message)
            },
            // DO NOT use e.g. maximumAge: 5_000 -> getCurrentPosition will then never return on mobile firefox!?
            { timeout: 300_000 }
        )
    }

    return (
        <PlainButton onClick={() => onRequestCurrentLocation()} className={styles.btn}>
            <CurrentLocationIcon fill="#5b616a" />
        </PlainButton>
    )
}
