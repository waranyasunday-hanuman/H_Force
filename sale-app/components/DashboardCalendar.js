import React, { useState, useMemo } from 'react';

export default function DashboardCalendar({ visits = [], filters = {}, onVisitClick }) {
    
    // Determine which month to show based on the filters
    const getBaseDate = () => {
        if (filters.startStr) return new Date(filters.startStr);
        return new Date();
    };

    const baseDate = getBaseDate();
    const currentYear = baseDate.getFullYear();
    const currentMonth = baseDate.getMonth(); // 0-11
    
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0=Sun, 1=Mon...
    
    // Helper Icon Prefix
    const getIconPrefix = (purpose) => {
        if (purpose === 'pitch') return '🗣️';
        if (purpose === 'inspection') return '📋';
        if (purpose === 'collection') return '💰';
        return '📍';
    };
    const getPurposeColor = (purpose) => {
        if (purpose === 'pitch') return 'bg-green-100 text-green-700 border-green-200';
        if (purpose === 'inspection') return 'bg-purple-100 text-purple-700 border-purple-200';
        if (purpose === 'collection') return 'bg-red-100 text-red-700 border-red-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    // Group visits by day (1 to 31)
    const visitsByDay = useMemo(() => {
        const grouped = {};
        visits.forEach(v => {
            const dateObj = new Date(v.created_at);
            // Only group visits that are actually in this base month/year
            if (dateObj.getFullYear() === currentYear && dateObj.getMonth() === currentMonth) {
                const day = dateObj.getDate();
                if (!grouped[day]) grouped[day] = [];
                grouped[day].push(v);
            }
        });
        return grouped;
    }, [visits, currentYear, currentMonth]);

    const monthNamesThai = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const dayNamesThai = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

    return (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-sm animate-fade-in">
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-100 p-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">
                    {monthNamesThai[currentMonth]} {currentYear}
                </h3>
                <div className="flex space-x-3 text-xs font-semibold">
                    <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span> เสนอขาย</span>
                    <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-purple-500 mr-1"></span> ตรวจร้าน</span>
                    <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span> เก็บหนี้</span>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
                {dayNamesThai.map(day => (
                    <div key={day} className="py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 bg-gray-200 gap-[1px]">
                {/* Empty cells for offset */}
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-white min-h-[120px] p-2 opacity-50"></div>
                ))}

                {/* Actual day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayVisits = visitsByDay[day] || [];
                    const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear;

                    return (
                        <div key={day} className={`bg-white min-h-[120px] p-2 flex flex-col transition-colors border-t-2 ${isToday ? 'border-blue-500 bg-blue-50/10' : 'border-transparent'}`}>
                            
                            <div className={`text-right text-xs font-bold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                                {isToday ? <span className="bg-blue-600 text-white rounded-full w-5 h-5 inline-flex items-center justify-center">{day}</span> : day}
                            </div>
                            
                            <div className="flex-1 space-y-1 overflow-y-auto max-h-[150px] scrollbar-thin scrollbar-thumb-gray-200">
                                {dayVisits.map((v, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => onVisitClick && onVisitClick(v)}
                                        title={`${v.sales_person} - ${v.notes || ''}`}
                                        className={`px-1.5 py-1 text-[10px] leading-tight rounded border truncate ${getPurposeColor(v.purpose)} cursor-pointer hover:shadow-sm hover:brightness-95 transition-all`}
                                    >
                                        <span className="mr-0.5">{getIconPrefix(v.purpose)}</span>
                                        <span className="font-semibold">{new Date(v.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>{' '}
                                        <span className="font-medium text-gray-800">{v.customer_name || v.customer_code}</span>
                                    </div>
                                ))}
                            </div>

                        </div>
                    );
                })}

                {/* Fill remaining cells to complete the grid */}
                {Array.from({ length: (7 - ((firstDayIndex + daysInMonth) % 7)) % 7 }).map((_, i) => (
                    <div key={`empty-end-${i}`} className="bg-white min-h-[120px] p-2 opacity-50"></div>
                ))}
            </div>
        </div>
    );
}
