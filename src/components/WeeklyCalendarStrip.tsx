'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './WeeklyCalendarStrip.module.css';

export default function WeeklyCalendarStrip() {
  const { currentDate, setCurrentDate } = useApp();

  // Helper to format date object to YYYY-MM-DD string
  const formatDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to get today's local date string
  const getTodayDateString = () => {
    return formatDateString(new Date());
  };

  // Generate Monday-Sunday dates for the week of `currentDate`
  const getWeekDays = (dateStr: string) => {
    const current = new Date(dateStr);
    const day = current.getDay(); // 0 is Sunday, 1 is Monday...
    
    // Calculate difference to Monday
    // If Sunday (0), diff is -6. Otherwise diff is 1 - day
    const diffToMonday = day === 0 ? -6 : 1 - day;
    
    const monday = new Date(current);
    monday.setDate(current.getDate() + diffToMonday);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays(currentDate);

  // Switch to today
  const handleSelectToday = () => {
    setCurrentDate(getTodayDateString());
  };

  // Navigate back 1 day
  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(formatDateString(d));
  };

  // Navigate forward 1 day
  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(formatDateString(d));
  };

  const getVNDayName = (dayIdx: number) => {
    const names = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return names[dayIdx];
  };

  const todayStr = getTodayDateString();

  return (
    <div className={styles.container}>
      <button onClick={handlePrevDay} className={styles.navBtn} title="Ngày trước">
        <ChevronLeft size={20} />
      </button>

      <div className={styles.daysWrapper}>
        {weekDays.map((date, idx) => {
          const dateStr = formatDateString(date);
          const isActive = dateStr === currentDate;
          const isToday = dateStr === todayStr;
          const dayName = getVNDayName(date.getDay());
          const dayNum = date.getDate();

          return (
            <div
              key={idx}
              className={`${styles.dayCard} ${isActive ? styles.dayCardActive : ''}`}
              onClick={() => setCurrentDate(dateStr)}
            >
              <span className={styles.dayName}>{dayName}</span>
              <span className={styles.dayNumber}>{dayNum}</span>
              {isToday && <span className={styles.todayLabel}>Hôm nay</span>}
            </div>
          );
        })}
      </div>

      <button onClick={handleNextDay} className={styles.navBtn} title="Ngày sau">
        <ChevronRight size={20} />
      </button>

      <button onClick={handleSelectToday} className={styles.todayBtn}>
        Hôm nay
      </button>
    </div>
  );
}
