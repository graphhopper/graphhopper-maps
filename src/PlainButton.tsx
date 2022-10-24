import { ButtonHTMLAttributes } from 'react'
import styles from './PlainButton.module.css'

export default function (props: ButtonHTMLAttributes<HTMLButtonElement>) {
    const combinedClass = styles.button + ' ' + props.className
    return (
        <button {...props} className={combinedClass}>
            {props.children}
        </button>
    )
}
