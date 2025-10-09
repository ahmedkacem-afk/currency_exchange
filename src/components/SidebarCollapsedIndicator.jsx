import React from 'react';
import { useI18n } from '../i18n/I18nProvider';

export function SidebarCollapsedIndicator({ isOpen, setIsOpen, dir }) {
  const { t } = useI18n();
  
  if (isOpen) return null;
  
  return (
    <div 
      className={`hidden md:block fixed top-20 ${dir === 'rtl' ? 'right-0' : 'left-0'} z-40 cursor-pointer`}
      onClick={() => {
        setIsOpen(true);
        localStorage.setItem('sidebarState', 'open');
      }}
    >
      <div 
        className={`flex items-center justify-center bg-emerald-600 text-white p-2 shadow-md ${
          dir === 'rtl' ? 'rounded-l-md' : 'rounded-r-md'
        }`}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={dir === 'rtl' ? 'rotate-180' : ''}
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>
    </div>
  );
}

export default SidebarCollapsedIndicator;