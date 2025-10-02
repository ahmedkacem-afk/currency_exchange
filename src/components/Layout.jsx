import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { useAuth } from '../lib/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';

export function Layout({ children }) {
  const { t, lang, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { session, isAuthenticated, profile } = useAuth();

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  const isLogin = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-gray-900">
      <Header 
        isAuthenticated={isAuthenticated} 
        isLogin={isLogin} 
        profile={profile} 
        toggleSidebar={() => setOpen(o => !o)}
      />

      {isAuthenticated && !isLogin && (
        <Sidebar 
          isOpen={open} 
          setIsOpen={setOpen} 
          profile={profile} 
          dir={dir}
        />
      )}
      
      <main className="max-w-6xl mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}

export default Layout;