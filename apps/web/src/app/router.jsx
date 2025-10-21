import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from './Layout'
import HomePage from '../features/public/HomePage'
import LoginPage from '../features/auth/LoginPage'
import AdminLayout from '../features/admin/AdminLayout'
import BuildingsPage from '../features/admin/buildings/BuildingsPage'
import FloorsPage from '../features/admin/floors/FloorsPage'
import RoomsPage from '../features/admin/rooms/RoomsPage'
import DebugPage from '../features/admin/DebugPage'
import { isAuthenticated } from '../lib/auth'

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return children
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      {
        path: 'admin',
        element: (
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="/admin/buildings" replace /> },
          { path: 'buildings', element: <BuildingsPage /> },
          { path: 'floors', element: <FloorsPage /> },
          { path: 'rooms', element: <RoomsPage /> },
          { path: 'debug', element: <DebugPage /> },
        ],
      },
    ],
  },
])
