export function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-xl shadow-sm ring-1 ring-gray-100 ${className}`}>{children}</div>
}

export function CardHeader({ title, subtitle, action, icon }) {
  return (
    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="text-sm text-gray-500">{subtitle}</div>
          <div className="text-base font-semibold">{title}</div>
        </div>
      </div>
      {action}
    </div>
  )
}

export function CardBody({ children, className = '' }) {
  return <div className={`p-4 ${className}`}>{children}</div>
}


