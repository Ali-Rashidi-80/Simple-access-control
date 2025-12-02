import { useState, useRef, KeyboardEvent } from 'react';
import { motion } from 'motion/react';

interface OTPInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    onComplete?: (value: string) => void;
}

export function OTPInput({ length = 6, value, onChange, onComplete }: OTPInputProps) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, digit: string) => {
        if (!/^\d*$/.test(digit)) return;

        const newValue = value.split('');
        newValue[index] = digit.slice(-1);
        const updatedValue = newValue.join('');

        onChange(updatedValue);

        // Move to next input if digit entered
        if (digit && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Call onComplete if all digits filled
        if (updatedValue.length === length && onComplete) {
            onComplete(updatedValue);
        }
    };

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !value[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        onChange(pastedData);

        if (pastedData.length === length && onComplete) {
            onComplete(pastedData);
        }
    };

    return (
        <div className="flex gap-2 justify-center" dir="ltr">
            {Array.from({ length }).map((_, index) => (
                <motion.input
                    key={index}
                    ref={el => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[index] || ''}
                    onChange={e => handleChange(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-12 h-14 text-center text-2xl font-bold rounded-xl glass-card backdrop-blur-xl border-2 border-white/20 text-white bg-white/5 focus:border-[#00F0FF] focus:outline-none transition-all duration-300"
                    whileFocus={{ scale: 1.05, borderColor: '#00F0FF' }}
                    animate={{
                        borderColor: value[index] ? '#00FF9D' : 'rgba(255, 255, 255, 0.2)',
                    }}
                />
            ))}
        </div>
    );
}
