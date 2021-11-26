import { ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './PopUp.module.css'
import { POPUP_CONTAINER_ID, SIDEBAR_CONTENT_ID } from '@/App'

export interface PopUpProps {
    children: ReactNode
    keepClearAtBottom: number
    inputElement: HTMLElement
}

export default function PopUp({ children, inputElement, keepClearAtBottom }: PopUpProps) {
    const container = useRef<HTMLElement>(document.createElement('div'))
    const root = useRef<HTMLElement>(document.getElementById(POPUP_CONTAINER_ID))
    const rect = useRect(SIDEBAR_CONTENT_ID, inputElement)

    function applyStyleAbove(rect: DOMRect, rootRect: DOMRect, element: HTMLElement) {
        const offsetY = rootRect.bottom - rect.bottom + rect.height
        const offsetX = rect.left - rootRect.left

        element.style.bottom = offsetY + 'px'
        element.style.top = ''
        element.style.left = offsetX + 'px'
        element.style.width = rect.width + 'px'
    }

    function applyStyleBelow(rect: DOMRect, rootRect: DOMRect, element: HTMLElement) {
        const offsetY = rect.bottom - rootRect.top
        const offsetX = rect.left - rootRect.left

        element.style.top = offsetY + 'px'
        element.style.bottom = ''
        element.style.left = offsetX + 'px'
        element.style.width = rect.width + 'px'
    }

    useEffect(() => {
        container.current.className = styles.popup
        root.current!.appendChild(container.current)

        return () => {
            root.current!.removeChild(container.current)
        }
    }, [container])

    useEffect(() => {
        const rootRect = root.current!.getBoundingClientRect()
        const emptySpace = rootRect.bottom - rect.bottom

        emptySpace > keepClearAtBottom
            ? applyStyleBelow(rect, rootRect, container.current)
            : applyStyleAbove(rect, rootRect, container.current)
    }, [rect])

    return createPortal(children, container.current)
}

export function useRect(scrollContainerId: string, element: HTMLElement) {
    const [rect, setRect] = useState(DOMRect.fromRect())

    useEffect(() => {
        if (element) setRect(element.getBoundingClientRect())
    }, [element])

    useEffect(() => {
        const handle = () => {
            setRect(element.getBoundingClientRect())
        }
        const scrollContainer = document.getElementById(scrollContainerId)
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handle, { passive: true })
        }

        return () => {
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', handle)
            }
        }
    }, [element])

    return rect
}
