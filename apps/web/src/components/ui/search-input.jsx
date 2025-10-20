import Input from './input'

export default function SearchInput({ value, onChange, placeholder = 'Buscar...', className = '' }) {
  return (
    <div className={`relative w-full ${className}`}>
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </span>
      <Input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="pl-8 pr-3 py-2"
      />
    </div>
  )
}
