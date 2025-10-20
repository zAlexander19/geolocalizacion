import clsx from 'clsx'

export default function Button({ className, variant = 'default', size = 'md', ...props }) {
  const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none'
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-500',
    outline: 'border border-border bg-transparent hover:bg-gray-100/10',
    ghost: 'hover:bg-gray-100/10',
    secondary: 'bg-gray-700 text-white hover:bg-gray-600',
  }
  const sizes = {
    sm: 'h-8 px-3',
    md: 'h-9 px-4',
    lg: 'h-10 px-6',
  }
  return <button className={clsx(base, variants[variant], sizes[size], className)} {...props} />
}
