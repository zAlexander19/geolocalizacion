# Guía de Optimización de Performance

## Problemas Comunes de Lag en Producción

### 1. React Query - Configuración Optimizada ✅ IMPLEMENTADO

**Problema:** Sin configuración, React Query refetch los datos constantemente.

**Solución Implementada en `main.jsx`:**
```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min - datos frescos
      cacheTime: 10 * 60 * 1000,     // 10 min - en caché
      refetchOnWindowFocus: false,    // No refetch al cambiar pestaña
      refetchOnMount: false,          // No refetch si hay caché
      retry: 1,                       // Solo 1 reintento
    },
  },
})
```

**Beneficios:**
- Reduce peticiones HTTP innecesarias
- Mejora tiempo de respuesta con datos en caché
- Disminuye carga en el servidor

---

### 2. Imágenes - Lazy Loading ✅ IMPLEMENTADO

**Problema:** Todas las imágenes cargan al mismo tiempo, bloqueando el render.

**Solución: Componente OptimizedImage**
- Lazy loading nativo (`loading="lazy"`)
- Skeleton placeholder mientras carga
- Manejo de errores con fallback
- Cloudinary optimizations (si aplica)

**Uso:**
```jsx
import OptimizedImage from '../components/OptimizedImage'

<OptimizedImage 
  src={building.imagen}
  alt={building.nombre}
  width="100%"
  height={200}
/>
```

---

### 3. Leaflet Maps - Memory Leaks 🔴 PENDIENTE

**Problema:** Los mapas no se limpian correctamente, causando memory leaks.

**Solución Recomendada:**
```jsx
useEffect(() => {
  // Inicializar mapa
  const map = L.map('map')
  
  return () => {
    // IMPORTANTE: Limpiar al desmontar
    map.remove()
  }
}, [])
```

**Implementar en:**
- `HomePage.jsx` (mapa principal)
- `MapViewPage.jsx` (admin)

---

### 4. API Backend en Render/Railway ⚠️ VERIFICAR

**Problema:** Free tier de Render duerme después de 15 min de inactividad.

**Síntomas:**
- Primera carga lenta (30+ segundos)
- Lag después de inactividad
- Timeout en peticiones

**Soluciones:**

#### Opción A: Keep-Alive Ping (Temporal)
```javascript
// Hacer ping cada 10 minutos para mantener activo
setInterval(() => {
  fetch(`${API_URL}/health`)
}, 10 * 60 * 1000)
```

#### Opción B: Upgrade a Plan Pago
- Render: $7/mes (sin sleep)
- Railway: $5/mes (500 horas)

#### Opción C: Migrar a Vercel Functions
- Serverless
- No cold starts en edge
- Gratis hasta cierto límite

---

### 5. Bundle Size - Code Splitting 🔴 PENDIENTE

**Problema:** Todo el código carga al inicio.

**Solución: React Lazy + Suspense**
```jsx
import { lazy, Suspense } from 'react'

const AdminLayout = lazy(() => import('./features/admin/AdminLayout'))

<Suspense fallback={<CircularProgress />}>
  <AdminLayout />
</Suspense>
```

**Implementar para:**
- Admin pages (solo cuando se necesiten)
- Modal components grandes
- Leaflet (cargar solo en HomePage)

---

### 6. Service Worker - PWA Cache 🔴 PENDIENTE

**Problema:** Recursos se descargan en cada visita.

**Solución: Workbox + Vite PWA**
```bash
npm install vite-plugin-pwa -D
```

```javascript
// vite.config.js
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg}']
      }
    })
  ]
}
```

---

## Diagnóstico de Performance

### Chrome DevTools

1. **Performance Tab:**
   ```
   1. Abrir DevTools (F12)
   2. Ir a Performance
   3. Grabar sesión
   4. Navegar por la app
   5. Detener grabación
   6. Analizar flamegraph
   ```

2. **Network Tab:**
   - Verificar tamaño de recursos
   - Buscar waterfall largo
   - Identificar recursos bloqueantes

3. **Lighthouse:**
   ```
   1. DevTools > Lighthouse
   2. Generate report
   3. Ver métricas:
      - FCP (First Contentful Paint)
      - LCP (Largest Contentful Paint)
      - TTI (Time to Interactive)
   ```

### React DevTools Profiler

```bash
npm install -D @welldone-software/why-did-you-render
```

Identifica re-renders innecesarios.

---

## Checklist de Optimización

### ✅ Implementado
- [x] React Query configuración de caché
- [x] Componente OptimizedImage con lazy loading
- [x] Cloudinary transformaciones automáticas

### 🔴 Pendiente
- [ ] Leaflet map cleanup (useEffect return)
- [ ] Code splitting con React.lazy
- [ ] Service Worker / PWA
- [ ] Image CDN / Compression
- [ ] Backend keep-alive o upgrade plan
- [ ] Bundle analyzer (vite-plugin-visualizer)
- [ ] Debounce en búsquedas
- [ ] Virtualización de listas largas (react-window)

---

## Testing de Performance

### Local
```bash
# Build de producción
npm run build

# Preview local
npm run preview

# Medir con Lighthouse
```

### Producción
```bash
# Chrome DevTools Network
1. Throttling: Fast 3G
2. Disable cache
3. Navegar por la app
4. 4. Verificar tiempos de carga
```

### Métricas Objetivo
- **FCP:** < 1.8s
- **LCP:** < 2.5s
- **TTI:** < 3.8s
- **Bundle Size:** < 500KB (gzipped)
- **API Response:** < 200ms (caché) / < 1s (fresh)

---

## Monitoreo Continuo

### Herramientas Recomendadas
1. **Sentry** - Error tracking + performance
2. **Google Analytics** - User behavior
3. **Vercel Analytics** - Web Vitals automático
4. **Uptime Robot** - Keep API alive (free)

### Scripts de Utilidad

**Analizar Bundle:**
```bash
npm install -D vite-plugin-visualizer
```

```javascript
// vite.config.js
import { visualizer } from 'vite-plugin-visualizer'

plugins: [
  visualizer({ open: true })
]
```

**Keep API Alive (Temporal):**
```javascript
// HomePage.jsx
useEffect(() => {
  const keepAlive = setInterval(() => {
    fetch(`${import.meta.env.VITE_API_URL}/health`).catch(() => {})
  }, 14 * 60 * 1000) // 14 minutos

  return () => clearInterval(keepAlive)
}, [])
```

---

## Próximos Pasos Recomendados

1. **Inmediato (< 1 hora):**
   - Implementar cleanup de Leaflet maps
   - Agregar keep-alive ping al backend
   - Usar OptimizedImage en cards principales

2. **Corto plazo (< 1 día):**
   - Code splitting de admin pages
   - Debounce en SearchBar
   - Bundle analyzer

3. **Mediano plazo (< 1 semana):**
   - PWA con service worker
   - Upgrade backend plan (eliminar cold starts)
   - Comprimir imágenes existentes

4. **Largo plazo:**
   - Migrar imágenes a Cloudinary
   - CDN para assets estáticos
   - Redis cache en backend
