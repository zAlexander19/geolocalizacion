import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import HomePage from './features/public/HomePage.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import PublicFacultiesPage from './features/public/FacultiesPage.jsx'
import AdminLayout from './features/admin/AdminLayout.jsx'
import BuildingsPage from './features/admin/buildings/BuildingsPage.jsx'
import FloorsPage from './features/admin/floors/FloorsPage.jsx'
import RoomsPage from './features/admin/rooms/RoomsPage.jsx'
import FacultiesPage from './features/admin/faculties/FacultiesPage.jsx'
import OSMImportPage from './features/admin/osm/OSMImportPage.jsx'
import MapViewPage from './features/admin/map/MapViewPage.jsx'
import './index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/facultades" element={<PublicFacultiesPage />} />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/admin/edificios" replace />} />
              <Route path="edificios" element={<BuildingsPage />} />
              <Route path="pisos" element={<FloorsPage />} />
              <Route path="salas" element={<RoomsPage />} />
              <Route path="facultades" element={<FacultiesPage />} />
              <Route path="mapa" element={<MapViewPage />} />
              <Route path="osm-import" element={<OSMImportPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
