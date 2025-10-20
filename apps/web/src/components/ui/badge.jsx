export default function Badge({ children, color = 'gray', className = '' }) {
  const colors = {
    gray: 'bg-gray-200 text-gray-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    outline: 'border border-gray-300 text-gray-800',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[color] || colors.gray} ${className}`}>{children}</span>
  )
}
