import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TooltipProps {
    children: ReactNode;
    content: string | ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}

export function Tooltip({ children, content, position = 'top', delay = 300 }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => {
            setShowTooltip(true);
            setIsVisible(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setShowTooltip(false);
        setTimeout(() => setIsVisible(false), 200);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const positions = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowPositions = {
        top: 'top-full left-1/2 -translate-x-1/2 -mt-1',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
        left: 'left-full top-1/2 -translate-y-1/2 -ml-1',
        right: 'right-full top-1/2 -translate-y-1/2 -mr-1',
    };

    const arrowStyles = {
        top: 'border-t-white/90 border-t-8 border-x-transparent border-x-8 border-b-0',
        bottom: 'border-b-white/90 border-b-8 border-x-transparent border-x-8 border-t-0',
        left: 'border-l-white/90 border-l-8 border-y-transparent border-y-8 border-r-0',
        right: 'border-r-white/90 border-r-8 border-y-transparent border-y-8 border-l-0',
    };

    return (
        <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            {children}

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        className={`absolute ${positions[position]} z-50 pointer-events-none`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: showTooltip ? 1 : 0, scale: showTooltip ? 1 : 0.9 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                    >
                        <div className="glass-card backdrop-blur-xl border border-white/20 rounded-lg px-3 py-2 shadow-xl">
                            <div className="text-white/90 text-sm whitespace-nowrap">
                                {content}
                            </div>
                        </div>

                        {/* Arrow */}
                        <div className={`absolute ${arrowPositions[position]} w-0 h-0 ${arrowStyles[position]}`} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
