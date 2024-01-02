import React, {useState, useRef, ReactNode, useEffect, FC, useCallback} from 'react';
import styles from './BottomSheet.module.css'
import {useMediaQuery} from "react-responsive";

interface BottomSheetProps {
    children?: ReactNode;
}

const BottomSheet: FC<BottomSheetProps> = ({ children }) => {
    const [isDragging, setIsDragging] = useState(false);
    const offsetYRef = useRef(0);
    const bottomSheetRef = useRef<HTMLDivElement | null>(null);

    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
        if(!bottomSheetRef.current) return

        const clickInside = e.target instanceof Node && bottomSheetRef.current.contains(e.target)
        if (!clickInside) {
            bottomSheetRef.current.style.top = `${window.innerHeight - 30}px`
            return
        }

        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        setIsDragging(true)
        offsetYRef.current = clientY - (bottomSheetRef.current.getBoundingClientRect().top || 0)
    }

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
        if (isDragging) {
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
            const y = clientY - offsetYRef.current
            if(bottomSheetRef.current) bottomSheetRef.current.style.top = `${y}px`
        }
    }
    const handleTouchStart = (e: MouseEvent | TouchEvent) => handleMouseDown(e)
    const handleTouchMove = (e: MouseEvent | TouchEvent) => handleMouseMove(e)
    const handleMouseUp = () => setIsDragging(false)

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
        <div
            ref={bottomSheetRef}
            className={styles.bottomSheet}
        >
            <div
                className={styles.bottomSheetDrag}
                onMouseDown={(e: React.MouseEvent) => handleMouseDown(e as any)}
                onTouchStart={(e: React.TouchEvent) => handleTouchStart(e as any)}
            >
                drag
            </div>
            {children}
        </div>
    )
}

export default BottomSheet;