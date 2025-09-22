import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'

export default function UnauthorizedPage() {
  const { t } = useI18n()
  
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-xl shadow ring-1 ring-gray-100 p-6 text-center">
        <div className="text-amber-600 text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-semibold tracking-tight mb-3">
          {t('unauthorized.title', 'Access Denied')}
        </h1>
        <p className="text-gray-600 mb-6">
          {t('unauthorized.message', "You don't have permission to access this page.")}
        </p>
        <Link 
          to="/"
          className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md"
        >
          {t('unauthorized.backHome', 'Back to Dashboard')}
        </Link>
      </div>
    </div>
  )
}
