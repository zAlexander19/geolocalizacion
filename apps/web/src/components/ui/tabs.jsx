export default function Tabs({ tabs, active, onTab, className = '' }) {
  return (
    <nav className={`flex gap-1 border-b border-border mb-6 ${className}`} aria-label="Secciones">
      {tabs.map(tab => (
        <button
          key={tab.value}
          className={`px-4 py-2 font-medium rounded-t transition-colors ${active === tab.value ? 'bg-white dark:bg-zinc-900 border-x border-t border-border -mb-px text-black dark:text-white' : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
          onClick={() => onTab(tab.value)}
          aria-current={active === tab.value ? 'page' : undefined}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
