import clsx from 'clsx'

export default function Input({ className, ...props }) {
  return (
    <input
      className={clsx(
        'flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      {...props}
    />
  )
}
