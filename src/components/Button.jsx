export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600',
    secondary: 'bg-gray-900 text-white hover:bg-black focus:ring-gray-900',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 focus:ring-gray-300',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>
  )
}


