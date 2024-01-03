import React, {useState, useRef, ReactNode, useEffect, FC, useCallback} from 'react';
import styles from './BottomSheet.module.css'
import {useMediaQuery} from "react-responsive";
import {set} from "ol/transform";

interface BottomSheetProps {
    children?: ReactNode;
}

const BottomSheet: FC<BottomSheetProps> = ({ children }) => {
    const [isDragging, setIsDragging] = useState(false)
    const [childrenHeight, setChildrenHeight] = useState(-1)
    const offsetYRef = useRef(0)
    const bottomSheetRef = useRef<HTMLDivElement | null>(null)
    const childrenRef = useRef<HTMLDivElement | null>(null)
    const minHeight = 40
    const defaultHeight = useRef(0);

    const setHeight = (y: number) => {
        if(bottomSheetRef.current)
            bottomSheetRef.current.style.top = `${y}px`
    }

    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
        if(!bottomSheetRef.current) return

        const clickInside = e.target instanceof Node && bottomSheetRef.current.contains(e.target)
        if (!clickInside) {
            setHeight(window.innerHeight - minHeight)
            return
        }

        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        setIsDragging(true)
        offsetYRef.current = clientY - (bottomSheetRef.current.getBoundingClientRect().top || 0)
    }

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
        if (bottomSheetRef.current && isDragging) {
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
            let y = clientY - offsetYRef.current
            if(y < 0) y = 0 // top border
            else if(y > (window.innerHeight - minHeight)) y = window.innerHeight - minHeight

            setHeight(y)

            // force scrollbar for children
            setChildrenHeight(window.innerHeight - minHeight - y)
        }
    }
    const handleTouchStart = (e: MouseEvent | TouchEvent) => handleMouseDown(e)
    const handleTouchMove = (e: MouseEvent | TouchEvent) => handleMouseMove(e)
    const handleMouseUp = () => setIsDragging(false)

    useEffect(() => {
        if (childrenRef.current) {
            if(defaultHeight.current <= 0)
                defaultHeight.current = childrenRef.current.offsetHeight + 80 /* +80 for one routing result */
            console.log("height:"+defaultHeight.current)
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
    }, [isDragging])

    return (
        <div ref={bottomSheetRef} className={styles.bottomSheet}>
            <div
                className={styles.bottomSheetDrag}
                onMouseDown={(e: React.MouseEvent) => handleMouseDown(e as any)}
                onTouchStart={(e: React.TouchEvent) => handleTouchStart(e as any)}
            >
                <span style={{width: '18px', height: '4px', borderRadius: '99px', backgroundColor: 'rgb(221, 221, 221)', transform: 'translateX(2px) rotate(0deg)'}}></span>
                <span style={{width: '18px', height: '4px', borderRadius: '99px', backgroundColor: 'rgb(221, 221, 221)', transform: 'translateX(-2px) rotate(0deg)'}}></span>

                {/*<span style={{}} onClick={() => setHeight(window.innerHeight - minHeight)}>X</span>*/}
            </div>
            <div ref={childrenRef} style={childrenHeight > defaultHeight.current ? {overflowY: 'scroll', height: childrenHeight + 'px'}: {}}>
                {children}
            </div>
        </div>
    )
}

export default BottomSheet;