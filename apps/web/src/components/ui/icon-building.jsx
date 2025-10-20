export default function IconBuilding({ className = '', ...props }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 inline-block mr-1 ${className}`} {...props}>
      <rect x="3" y="3" width="14" height="14" rx="2" fill="currentColor" />
      <rect x="7" y="7" width="2" height="2" fill="#fff" />
      <rect x="11" y="7" width="2" height="2" fill="#fff" />
      <rect x="7" y="11" width="2" height="2" fill="#fff" />
      <rect x="11" y="11" width="2" height="2" fill="#fff" />
    </svg>
  )
}
