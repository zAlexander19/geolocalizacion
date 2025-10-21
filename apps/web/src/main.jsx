import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HomePage from './features/public/HomePage.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import AdminLayout from './features/admin/AdminLayout.jsx'
import BuildingsPage from './features/admin/buildings/BuildingsPage.jsx'
import FloorsPage from './features/admin/floors/FloorsPage.jsx'
import RoomsPage from './features/admin/rooms/RoomsPage.jsx'
import './index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/edificios" replace />} />
            <Route path="edificios" element={<BuildingsPage />} />
            <Route path="pisos" element={<FloorsPage />} />
            <Route path="salas" element={<RoomsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)
