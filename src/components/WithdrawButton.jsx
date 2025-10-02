import Button from './Button.jsx'

export function WithdrawIcon({ className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 9l-5 5-5-5"></path>
      <path d="M12 14V4"></path>
      <path d="M12 14v6"></path>
      <line x1="4" y1="20" x2="20" y2="20"></line>
    </svg>
  )
}

export default function WithdrawButton({ children, variant = 'primary', className = '', iconClassName = 'w-5 h-5', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600',
    secondary: 'bg-gray-900 text-white hover:bg-black focus:ring-gray-900',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 focus:ring-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600',
  }
  
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      <WithdrawIcon className={iconClassName} />
      <span>{children}</span>
    </button>
  )
}