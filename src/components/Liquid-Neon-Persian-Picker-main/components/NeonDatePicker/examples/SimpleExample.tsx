/**
 * Simple Example - NeonDatePicker Integration
 * 
 * This file demonstrates how to integrate NeonDatePicker
 * into your React application.
 */

import React, { useState } from 'react';
import NeonDatePicker from '..';
import { DateRange } from '../types';

// IMPORTANT: Import the CSS file in your main App or here
// import '../../styles/neon-datepicker.css';

const SimpleExample: React.FC = () => {
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: null,
        endDate: null
    });

    const handleChange = (range: DateRange) => {
        setDateRange(range);
        console.log('Selected Range:', range);
    };

    const handleReset = () => {
        setDateRange({ startDate: null, endDate: null });
        console.log('Date range reset');
    };

    return (
        // Container must have dark background and RTL direction for best display
        <div
            dir="rtl"
            className="min-h-screen bg-slate-900 p-8 flex flex-col items-center gap-8"
        >
            <h1 className="text-2xl font-bold text-white">
                💎 انتخابگر تاریخ نئون
            </h1>

            {/* Date Picker Component */}
            <NeonDatePicker
                onChange={handleChange}
                onReset={handleReset}
            />

            {/* Display Selected Range */}
            {dateRange.startDate && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-white">
                    <h3 className="text-neon font-bold mb-4">بازه انتخاب شده:</h3>
                    <div className="space-y-2 font-mono">
                        <p>
                            <span className="text-slate-400">شروع: </span>
                            <span className="text-green-400">
                                {dateRange.startDate.toLocaleDateString('fa-IR')}
                            </span>
                        </p>
                        {dateRange.endDate && (
                            <p>
                                <span className="text-slate-400">پایان: </span>
                                <span className="text-neon">
                                    {dateRange.endDate.toLocaleDateString('fa-IR')}
                                </span>
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SimpleExample;
