export default function Input({ label, hint, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <div className="text-sm mb-1 text-gray-600">{label}</div>}
      <input className="w-full border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-md px-3 py-2 outline-none transition" {...props} />
      {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
    </label>
  )
}


