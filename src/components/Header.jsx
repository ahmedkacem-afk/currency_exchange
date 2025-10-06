import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { MenuIcon, KeyIcon, LogoutIcon } from './Icons';
import { supabase } from '../lib/supabase';
import Button from './Button';
import NotificationsPanel from './NotificationsPanel';

export function Header({ isAuthenticated, isLogin, profile, toggleSidebar }) {
  const { t, lang, toggleLang } = useI18n();

  return (
    <header className="bg-white/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link to={isAuthenticated ? '/' : '/login'} className="font-semibold tracking-tight">{t('appTitle')}</Link>
        <div className="flex items-center gap-3">
          {isAuthenticated && !isLogin && (
            <>
              <nav className="hidden md:flex gap-2 text-sm">
                <NavLink to="/" end className={({ isActive }) => `px-3 py-1.5 rounded-md border ${isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}>{t('nav.dashboard')}</NavLink>
                <NavLink to="/withdrawals" className={({ isActive }) => `px-3 py-1.5 rounded-md border ${isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}>{t('nav.withdrawals')}</NavLink>
                <NavLink to="/create" className={({ isActive }) => `px-3 py-1.5 rounded-md border ${isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}>{t('nav.create')}</NavLink>
                <NavLink to="/cashier" className={({ isActive }) => `px-3 py-1.5 rounded-md border ${isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}>{t('nav.cashier')}</NavLink>
                <NavLink to="/dealership-executioner" className={({ isActive }) => `px-3 py-1.5 rounded-md border ${isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}>{t('nav.executioner')}</NavLink>
                <NavLink to="/debt-management" className={({ isActive }) => `px-3 py-1.5 rounded-md border ${isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}>{t('nav.debtManagement')}</NavLink>
                <NavLink to="/treasurer" className={({ isActive }) => `px-3 py-1.5 rounded-md border ${isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}>{t('nav.treasurer')}</NavLink>
              </nav>
              {/* Notifications */}
              <div className="hidden md:block">
                <NotificationsPanel />
              </div>
              
              {/* User menu */}
              <div className="hidden md:block relative group">
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50">
                  <span className="text-sm truncate max-w-[100px]">{profile?.name || t('nav.account')}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
                  </svg>
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-100 invisible opacity-0 transform translate-y-2 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50">
                  <div className="py-1">
                    <NavLink to="/update-password" className={({ isActive }) => `flex items-center gap-1.5 px-4 py-2 text-sm ${isActive ? 'bg-gray-100 text-emerald-600' : 'text-gray-700 hover:bg-gray-50'}`}>
                      <KeyIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="inline-block">{t('nav.changePassword', 'Change Password')}</span>
                    </NavLink>
                    <button 
                      onClick={async () => {
                        await supabase.auth.signOut();
                        window.location.href = '/login';
                      }}
                      className="w-full text-left flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LogoutIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="inline-block">{t('nav.logout', 'Sign Out')}</span>
                    </button>
                  </div>
                </div>
              </div>
              <button className="md:hidden p-2 rounded hover:bg-gray-100" onClick={toggleSidebar} aria-label="Menu">
                <MenuIcon />
              </button>
            </>
          )}
          <Button variant="outline" onClick={toggleLang} className="h-9 px-3">{lang === 'en' ? 'ع' : 'EN'}</Button>
        </div>
      </div>
    </header>
  );
}

export default Header;