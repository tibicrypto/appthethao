'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Activity, 
  Calendar, 
  Dumbbell, 
  Apple, 
  Heart, 
  CalendarDays, 
  User 
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function MainLayout({ children, title }: MainLayoutProps) {
  const pathname = usePathname();
  const { currentDate, setCurrentDate, userName } = useApp();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Activity },
    { name: 'Kế hoạch', path: '/plans', icon: Calendar },
    { name: 'Tập luyện', path: '/workouts', icon: Dumbbell },
    { name: 'Dinh dưỡng', path: '/nutrition', icon: Apple },
    { name: 'Chỉ số & Mỏi cơ', path: '/biofeedback', icon: Heart },
  ];

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentDate(e.target.value);
  };

  return (
    <div className={styles.container}>
      {/* Desktop Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logoArea}>
          <Activity size={28} color="#06b6d4" />
          <span className={styles.logoText}>AuraFit</span>
        </div>
        
        <nav className={styles.navMenu}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={`${item.path}?date=${currentDate}`}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className={styles.sidebarFooter}>
          <div className={styles.userAvatar}>
            {userName.split(' ').map(n => n[0]).join('')}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{userName}</span>
            <span className={styles.userRole}>Thành viên Premium</span>
          </div>
        </div>
      </aside>

      {/* Main Content container */}
      <div className={styles.mainContent}>
        {/* Sticky Header */}
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>{title}</h1>
          <div className={styles.headerActions}>
            <div className={styles.datePickerWrapper}>
              <CalendarDays size={18} color="#06b6d4" />
              <input 
                type="date" 
                value={currentDate} 
                onChange={handleDateChange} 
                className={styles.dateInput}
              />
            </div>
          </div>
        </header>

        {/* Scrollable body */}
        <main className={styles.contentBody}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className={styles.mobileNav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={`${item.path}?date=${currentDate}`}
              className={`${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`}
            >
              <Icon size={20} />
              <span className={styles.mobileLabel}>{item.name.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
