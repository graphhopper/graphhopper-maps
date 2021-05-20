import { ErrorStoreState } from '@/stores/ErrorStore'
import styles from './ErrorMessage.module.css'
import PlainButton from '@/PlainButton'
import Dispatcher from '@/stores/Dispatcher'
import { DismissLastError } from '@/actions/Actions'
import Cross from '@/sidebar/times-solid.svg'
import React from 'react'

export default function ErrorMessage({ error }: { error: ErrorStoreState }) {
    return (
        <div className={styles.errorMessageContainer}>
            <span className={styles.errorMessage}>{error.lastError}</span>
            <PlainButton
                className={styles.errorMessageCloseBtn}
                onClick={() => Dispatcher.dispatch(new DismissLastError())}
            >
                <Cross />
            </PlainButton>
        </div>
    )
}
