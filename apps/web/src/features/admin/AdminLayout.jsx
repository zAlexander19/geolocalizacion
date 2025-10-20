import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { removeToken } from '../../lib/auth';
import Tabs from '../../components/ui/tabs';
import Button from '../../components/ui/button';

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const handleLogout = () => {
    removeToken()
    navigate('/login')
  }
  const tabs = [
    { value: '/admin/buildings', label: 'Edificios' },
    { value: '/admin/floors', label: 'Pisos' },
    { value: '/admin/rooms', label: 'Habitaciones' },
    { value: '/admin/debug', label: 'Base de datos de depuración' },
  ]
  const activeTab = tabs.find(tab => location.pathname.startsWith(tab.value))?.value || '/admin/buildings'
  return (
    <div className="bg-background min-h-screen">
      <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-white dark:bg-zinc-900">
        <h1 className="text-lg font-bold tracking-tight">Sistema de Gestión</h1>
        <Button onClick={handleLogout} variant="outline">Cerrar sesión</Button>
      </header>
      <div className="px-8">
        <Tabs
          tabs={tabs}
          active={activeTab}
          onTab={v => navigate(v)}
        />
        <Outlet />
      </div>
    </div>
  )
}
