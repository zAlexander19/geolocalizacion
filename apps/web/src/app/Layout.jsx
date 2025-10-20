import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen p-6">
      <Outlet />
    </div>
  )
}
