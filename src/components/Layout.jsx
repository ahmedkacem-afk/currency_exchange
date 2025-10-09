import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { useAuth } from '../lib/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';
import SidebarCollapsedIndicator from './SidebarCollapsedIndicator';

export function Layout({ children }) {
  const { t, lang, dir } = useI18n();
  // Default to open on desktop (using window.innerWidth to check if we're on desktop)
  const [open, setOpen] = useState(window.innerWidth >= 768); // 768px is md: breakpoint in Tailwind
  const location = useLocation();
  const { session, isAuthenticated, userData } = useAuth();

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  // We no longer need to force open the sidebar on resize since we want collapsible behavior
  // But we'll keep the initial state to be open on desktop
  useEffect(() => {
    // Initial setup only - don't auto-open on subsequent resizes
    if (window.innerWidth >= 768 && !localStorage.getItem('sidebarState')) {
      setOpen(true);
    } else if (localStorage.getItem('sidebarState')) {
      // Restore last sidebar state from localStorage if available
      setOpen(localStorage.getItem('sidebarState') === 'open');
    }
  }, []);

  const isLogin = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-gray-900">
      <Header 
        isAuthenticated={isAuthenticated} 
        isLogin={isLogin} 
        profile={userData} 
        toggleSidebar={() => {
          const newState = !open;
          setOpen(newState);
          // Save sidebar state to localStorage
          localStorage.setItem('sidebarState', newState ? 'open' : 'closed');
        }}
      />

      {isAuthenticated && !isLogin && (
        <>
          <Sidebar 
            isOpen={open} 
            setIsOpen={setOpen} 
            profile={userData} 
            dir={dir}
          />
          <SidebarCollapsedIndicator
            isOpen={open}
            setIsOpen={setOpen}
            dir={dir}
          />
        </>
      )}
      
      {/* Adjust main content to account for sidebar - respect RTL/LTR direction */}
      <main className={`transition-all duration-300 p-4 sm:p-6 ${
        isAuthenticated && !isLogin && open 
          ? dir === 'rtl'
            ? 'mr-0 md:mr-72' // For RTL: add right margin
            : 'ml-0 md:ml-72' // For LTR: add left margin
          : ''
      }`}>
        {children}
      </main>
    </div>
  );
}

export default Layout;