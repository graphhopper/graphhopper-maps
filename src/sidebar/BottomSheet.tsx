import React, {FC, ReactNode, useEffect, useRef, useState} from 'react';
import styles from './BottomSheet.module.css'

interface BottomSheetProps {
    children?: ReactNode;
}

const BottomSheet: FC<BottomSheetProps> = ({children}) => {
    const [isMouseDownOnBottomSheet, setMouseDownOnBottomSheet] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [childrenHeight, setChildrenHeight] = useState(-1)
    const offsetYRef = useRef(0)
    const bottomSheetRef = useRef<HTMLDivElement | null>(null)
    const childrenRef = useRef<HTMLDivElement | null>(null)
    const minHeight = 40
    const defaultHeight = useRef(0);

    const setHeight = (y: number) => {
        if (bottomSheetRef.current)
            bottomSheetRef.current.style.top = `${y}px`
    }

    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
        if (!bottomSheetRef.current) return

        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        // negative value means above the edge
        offsetYRef.current = clientY - (bottomSheetRef.current.getBoundingClientRect().top || 0)
        const clickInside = offsetYRef.current >= 0 // e.target instanceof Node && bottomSheetRef.current.contains(e.target)
        if (!clickInside) {
            // TODO: why hiding bottom sheet does not work with mouse?
            setHeight(window.innerHeight - minHeight)
            return
        }

        setMouseDownOnBottomSheet(true)
    }

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
        const clickInsideChildren = e.target instanceof Node && childrenRef.current?.contains(e.target)
        if (clickInsideChildren && childrenHeight > defaultHeight.current) {
            // if scrolling avoid dragging
            return
        }

        if (bottomSheetRef.current && isMouseDownOnBottomSheet) {
            setIsDragging(true)

            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
            let y = clientY - offsetYRef.current
            if (y < 0) y = 0 // top border
            else if (y > (window.innerHeight - minHeight)) y = window.innerHeight - minHeight

            setHeight(y)

            // force scrollbar for children
            setChildrenHeight(window.innerHeight - minHeight - y)
        }
    }
    const handleTouchStart = (e: MouseEvent | TouchEvent) => handleMouseDown(e)
    const handleTouchMove = (e: MouseEvent | TouchEvent) => handleMouseMove(e)
    const handleMouseUp = (e: MouseEvent | TouchEvent) => {
        const clickInsideChildren = e.target instanceof Node && childrenRef.current?.contains(e.target)
        if (clickInsideChildren) return
        if (!isMouseDownOnBottomSheet) return

        if (bottomSheetRef.current && !isDragging) {
            // use changedTouches as e.touches[0] is empty on iOS (does it make sense as the 'touch gesture' was already finished?)
            const clientY = 'changedTouches' in e ? e.changedTouches[0]?.clientY : e.clientY
            let y = clientY - offsetYRef.current

            // alert('mouseUp, y=' + clientY + '-' + offsetYRef.current + ', ' + (window.innerHeight - defaultHeight.current))
            // if clicked
            if (y > (window.innerHeight - defaultHeight.current) || y <= 0) {
                // ... and closed (or max) then medium size
                setHeight(window.innerHeight - defaultHeight.current)
            } else {
                // ... and medium then maximum size
                setHeight(0)
            }
        }
        setIsDragging(false)
        setMouseDownOnBottomSheet(false)

        // prevent us from clicking on elements in the bottom pane directly after we e.g. maximized it (happened only on Android)
        e.preventDefault()
    }

    useEffect(() => {
        if (childrenRef.current) {
            if (defaultHeight.current <= 0)
                defaultHeight.current = childrenRef.current.offsetHeight + 80 // TODO use dynamic value instead of 80 for one routing result
            setHeight(window.innerHeight - defaultHeight.current)
        }
    }, []);

    useEffect(() => {
        document.addEventListener('touchstart', handleTouchStart)
        document.addEventListener('touchmove', handleTouchMove)
        document.addEventListener('touchend', handleMouseUp)
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)

        return () => {
            document.removeEventListener('touchstart', handleTouchStart)
            document.removeEventListener('touchmove', handleTouchMove)
            document.removeEventListener('touchend', handleMouseUp)
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        };
    }, [isMouseDownOnBottomSheet, isDragging])

    return (
        <div ref={bottomSheetRef} className={styles.bottomSheet}>
            <div
                className={styles.bottomSheetDrag}
                onMouseDown={(e: React.MouseEvent) => handleMouseDown(e as any)}
                onTouchStart={(e: React.TouchEvent) => handleTouchStart(e as any)}
            >
                <span style={{
                    width: '18px',
                    height: '4px',
                    borderRadius: '99px',
                    backgroundColor: 'rgb(221, 221, 221)',
                    transform: 'translateX(2px) rotate(0deg)'
                }}></span>
                <span style={{
                    width: '18px',
                    height: '4px',
                    borderRadius: '99px',
                    backgroundColor: 'rgb(221, 221, 221)',
                    transform: 'translateX(-2px) rotate(0deg)'
                }}></span>
            </div>
            <div ref={childrenRef} style={childrenHeight > defaultHeight.current ? {
                overflowY: 'scroll',
                height: childrenHeight + 'px'
            } : {}}>
                {children}
            </div>
        </div>
    )
}

export default BottomSheet;