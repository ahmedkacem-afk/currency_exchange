import React, { createContext, useContext, useMemo, useState } from 'react'

const strings = {
  en: {
    appTitle: 'Currency Exchange Manager',
    nav: { 
      dashboard: 'Dashboard', 
      withdrawals: 'Withdrawals & Reports', 
      create: 'Create Entities',
      changePassword: 'Change Password',
      logout: 'Sign Out',
      account: 'Account'
    },
    login: { title: 'Manager Login', email: 'Email', password: 'Password', submit: 'Login' },
    dashboard: {
      totals: 'Totals', totalUsd: 'Total USD', totalLyd: 'Total LYD', numWallets: 'Wallets',
      selectWallet: 'Select Wallet', walletBalances: 'Wallet Balances', usd: 'USD', lyd: 'LYD',
      buyInfo: 'Buying Dinar', sellInfo: 'Selling Dinar', lowest: 'Lowest', median: 'Median', highest: 'Highest',
      managerPrices: 'Manager Prices', sellOld: 'Selling old dinar', sellNew: 'Selling new dinar', buyOld: 'Buying old dinar', buyNew: 'Buying new dinar', save: 'Save Prices'
    },    withdrawals: {
      title: 'Withdrawals & Reports', chooseWallet: 'Choose Wallet', usd: 'USD to withdraw', lyd: 'LYD to withdraw', reason: 'Reason', confirm: 'Confirm Withdraw',
      reportType: 'Report Type', exportPdf: 'Export PDF'
    },
    updatePassword: {
      title: 'Change Password', 
      newPassword: 'New Password', 
      confirmPassword: 'Confirm Password',
      passwordPlaceholder: 'Enter new password',
      confirmPasswordPlaceholder: 'Confirm new password',
      passwordRequired: 'Password is required',
      passwordLength: 'Password must be at least 6 characters',
      passwordMismatch: 'Passwords do not match',
      success: 'Password updated successfully',
      error: 'Failed to update password',
      updating: 'Updating...',
      submit: 'Update Password'
    },
    common: {
      cancel: 'Cancel'
    },
    create: {
      title: 'Create Entities', wallet: 'Create Wallet', name: 'Name', initUsd: 'Initial USD', initLyd: 'Initial LYD', create: 'Create',
      user: 'Create User', email: 'Email', phone: 'Phone', password: 'Password',
      operation: 'Create Operation', operationName: 'Operation Name'
    }
  },  ar: {
    appTitle: 'إدارة الصرافة',
    nav: { 
      dashboard: 'لوحة المدير', 
      withdrawals: 'السحوبات والتقارير', 
      create: 'إنشاء الكيانات',
      changePassword: 'تغيير كلمة المرور',
      logout: 'تسجيل الخروج',
      account: 'الحساب'
    },
    login: { title: 'تسجيل دخول المدير', email: 'البريد الإلكتروني', password: 'كلمة المرور', submit: 'دخول' },
    dashboard: {
      totals: 'الإجماليات', totalUsd: 'إجمالي الدولار', totalLyd: 'إجمالي الدينار', numWallets: 'عدد المحافظ',
      selectWallet: 'اختر المحفظة', walletBalances: 'أرصدة المحفظة', usd: 'دولار', lyd: 'دينار',
      buyInfo: 'معلومات شراء الدينار', sellInfo: 'معلومات بيع الدينار', lowest: 'الأدنى', median: 'الوسطي', highest: 'الأعلى',
      managerPrices: 'أسعار المدير', sellOld: 'بيع الدينار القديم', sellNew: 'بيع الدينار الجديد', buyOld: 'شراء الدينار القديم', buyNew: 'شراء الدينار الجديد', save: 'حفظ الأسعار'
    },    withdrawals: {
      title: 'السحوبات والتقارير', chooseWallet: 'اختر المحفظة', usd: 'الدولار المسحوب', lyd: 'الدينار المسحوب', reason: 'السبب', confirm: 'تأكيد السحب',
      reportType: 'نوع التقرير', exportPdf: 'تصدير PDF'
    },
    updatePassword: {
      title: 'تغيير كلمة المرور', 
      newPassword: 'كلمة المرور الجديدة', 
      confirmPassword: 'تأكيد كلمة المرور',
      passwordPlaceholder: 'أدخل كلمة المرور الجديدة',
      confirmPasswordPlaceholder: 'تأكيد كلمة المرور الجديدة',
      passwordRequired: 'كلمة المرور مطلوبة',
      passwordLength: 'يجب أن تكون كلمة المرور على الأقل 6 أحرف',
      passwordMismatch: 'كلمات المرور غير متطابقة',
      success: 'تم تحديث كلمة المرور بنجاح',
      error: 'فشل في تحديث كلمة المرور',
      updating: 'جاري التحديث...',
      submit: 'تحديث كلمة المرور'
    },
    common: {
      cancel: 'إلغاء'
    },
    create: {
      title: 'إنشاء الكيانات', wallet: 'إنشاء محفظة', name: 'الاسم', initUsd: 'الدولار الابتدائي', initLyd: 'الدينار الابتدائي', create: 'إنشاء',
      user: 'إنشاء مستخدم', email: 'البريد الإلكتروني', phone: 'الهاتف', password: 'كلمة المرور',
      operation: 'إنشاء نوع معاملات', operationName: 'اسم المعاملة'
    }
  }
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const initial = typeof localStorage !== 'undefined' ? (localStorage.getItem('lang') || 'en') : 'en'
  const [lang, setLang] = useState(initial)
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const toggleLang = () => setLang(prev => {
    const next = prev === 'en' ? 'ar' : 'en'
    try { localStorage.setItem('lang', next) } catch {}
    return next
  })
  const t = (key) => key.split('.').reduce((o, k) => (o ? o[k] : key), strings[lang])
  const value = useMemo(() => ({ t, lang, dir, toggleLang }), [lang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}


