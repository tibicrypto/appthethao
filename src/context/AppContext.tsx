'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AppContextType {
  currentDate: string; // YYYY-MM-DD format
  setCurrentDate: (date: string) => void;
  userId: string;
  userName: string;
  userEmail: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Use June 14, 2026 as default based on database entries and local time
  const [currentDate, setCurrentDate] = useState<string>('2026-06-14');
  
  // Set default user
  const userId = '00000000-0000-0000-0000-000000000001';
  const userName = 'Minh Nhật';
  const userEmail = 'minhnhat@example.com';

  // Try to load initial date from URL query parameter or localStorage if client-side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const dateParam = urlParams.get('date');
      if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        setCurrentDate(dateParam);
      } else {
        const savedDate = localStorage.getItem('aura_fit_date');
        if (savedDate) {
          setCurrentDate(savedDate);
        }
      }
    }
  }, []);

  const handleSetCurrentDate = (date: string) => {
    setCurrentDate(date);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aura_fit_date', date);
      
      // Update URL query parameter without full reload
      const url = new URL(window.location.href);
      url.searchParams.set('date', date);
      window.history.pushState({}, '', url.toString());
    }
  };

  return (
    <AppContext.Provider value={{ currentDate, setCurrentDate: handleSetCurrentDate, userId, userName, userEmail }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
