import React, { ButtonHTMLAttributes } from 'react'
import styles from './PlainButton.module.css'

export default function (props: ButtonHTMLAttributes<HTMLButtonElement>) {
    const combinedClass = props.className + ' ' + styles.button
    return (
        <button {...props} className={combinedClass}>
            {props.children}
        </button>
    )
}
