import React from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { KeyIcon, LogoutIcon } from './Icons';
import { supabase } from '../lib/supabase';

export function Sidebar({ isOpen, setIsOpen, profile, dir }) {
  const { t } = useI18n();

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} md:hidden z-30`} 
        onClick={() => setIsOpen(false)} 
      />
      
      {/* Side drawer */}
      <div 
        className={`fixed top-0 bottom-0 ${dir === 'rtl' ? 'right-0' : 'left-0'} h-full w-72 bg-gradient-to-b from-emerald-50 to-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out md:hidden ${dir === 'rtl' ? 'rounded-l-xl' : 'rounded-r-xl'} ${isOpen ? 'translate-x-0' : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header with user info */}
          <div className="p-5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-emerald-800">{t('appTitle')}</h2>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 rounded-full hover:bg-white/50 text-emerald-700"
                aria-label="Close menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            {profile && (
              <div className="bg-white/70 backdrop-blur-sm p-3 rounded-lg shadow-sm">
                <div className="font-medium text-sm text-emerald-900">{profile.name}</div>
                <div className="text-xs text-emerald-700">{profile.email}</div>
              </div>
            )}
          </div>
          
          {/* Navigation */}
          <div className="flex-1 p-4">
            <h3 className="text-xs uppercase tracking-wider text-emerald-600 font-semibold mb-3 px-2">{t('nav.menu', 'Menu')}</h3>
            <nav className="flex flex-col space-y-2 text-sm">
              <NavLink onClick={() => setIsOpen(false)} to="/" end>
                {({ isActive }) => (
                  <div className={`px-4 py-3 rounded-lg flex items-center transition-colors ${isActive ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-900 hover:bg-emerald-50'}`}>
                    <svg className={`w-5 h-5 mr-2.5 ${isActive ? 'text-emerald-100' : 'text-emerald-500'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                    <span>{t('nav.dashboard')}</span>
                  </div>
                )}
              </NavLink>
              <NavLink onClick={() => setIsOpen(false)} to="/withdrawals">
                {({ isActive }) => (
                  <div className={`px-4 py-3 rounded-lg flex items-center transition-colors ${isActive ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-900 hover:bg-emerald-50'}`}>
                    <svg className={`w-5 h-5 mr-2.5 ${isActive ? 'text-emerald-100' : 'text-emerald-500'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <span>{t('nav.withdrawals')}</span>
                  </div>
                )}
              </NavLink>
              <NavLink onClick={() => setIsOpen(false)} to="/create">
                {({ isActive }) => (
                  <div className={`px-4 py-3 rounded-lg flex items-center transition-colors ${isActive ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-900 hover:bg-emerald-50'}`}>
                    <svg className={`w-5 h-5 mr-2.5 ${isActive ? 'text-emerald-100' : 'text-emerald-500'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="16"></line>
                      <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    <span>{t('nav.create')}</span>
                  </div>
                )}
              </NavLink>
            </nav>
          </div>
          
          {/* Footer actions */}
          <div className="p-4 border-t border-emerald-100 bg-gradient-to-b from-white to-emerald-50">
            <h3 className="text-xs uppercase tracking-wider text-emerald-600 font-semibold mb-3 px-2">{t('nav.account', 'Account')}</h3>
            <div className="flex flex-col space-y-2">
                    <NavLink onClick={() => setIsOpen(false)} to="/update-password">
                      {({ isActive }) => (
                        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-900 hover:bg-emerald-50'}`}>
                          <KeyIcon className={`w-5 h-5 ${isActive ? 'text-emerald-100' : 'text-emerald-500'}`} />
                          <span>{t('nav.changePassword', 'Change Password')}</span>
                        </div>
                      )}
                    </NavLink>              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-emerald-900 hover:bg-emerald-50 transition-colors"
              >
                <LogoutIcon className="w-5 h-5 text-emerald-500" />
                <span>{t('nav.logout', 'Sign Out')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;