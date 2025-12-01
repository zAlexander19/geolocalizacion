# Documentación de Seguridad

## Resumen
Sistema de autenticación basado en JWT (JSON Web Tokens) implementado para proteger las rutas administrativas y prevenir acceso no autorizado.

## Componentes Implementados

### 1. Servicio de Autenticación (`src/lib/auth.js`)

**Ubicación:** `apps/web/src/lib/auth.js`

**Funcionalidades:**
- **Gestión de Tokens:** Almacenamiento seguro de tokens JWT en `localStorage`
- **Validación de Sesión:** Verificación de tokens y su fecha de expiración
- **Login Mock:** Sistema de autenticación de desarrollo (debe reemplazarse con API real)
- **Logout:** Limpieza completa de datos de sesión

**Métodos principales:**
```javascript
authService.login(email, password)     // Autenticación de usuario
authService.logout()                    // Cierre de sesión
authService.isAuthenticated()           // Verifica si hay sesión válida
authService.getToken()                  // Obtiene token JWT
authService.getCurrentUser()            // Obtiene datos del usuario actual
```

**Validación de Tokens:**
- Decodifica el payload del JWT usando `atob()`
- Verifica la propiedad `exp` (expiration) del token
- Compara con la fecha actual para determinar si el token expiró
- Token de desarrollo válido por 24 horas

### 2. Contexto de Autenticación (`src/contexts/AuthContext.jsx`)

**Ubicación:** `apps/web/src/contexts/AuthContext.jsx`

**Propósito:** Proporciona estado de autenticación global a toda la aplicación usando React Context API

**Estado gestionado:**
- `user`: Información del usuario autenticado (null si no hay sesión)
- `loading`: Indica si se está verificando la autenticación

**Hook personalizado:**
```javascript
const { user, loading, login, logout } = useAuth()
```

**Funcionalidades:**
- Verificación automática de sesión al cargar la aplicación
- Gestión centralizada del estado de autenticación
- Métodos `login()` y `logout()` accesibles desde cualquier componente
- Redirección automática a login al cerrar sesión

### 3. Componente de Rutas Protegidas (`src/components/ProtectedRoute.jsx`)

**Ubicación:** `apps/web/src/components/ProtectedRoute.jsx`

**Propósito:** Guard de rutas que previene acceso no autorizado a secciones protegidas

**Comportamiento:**
1. **Durante verificación:** Muestra spinner de carga centrado
2. **Sin autenticación:** Redirige a `/login` con la ubicación deseada guardada
3. **Con autenticación:** Renderiza el componente hijo (ruta protegida)

**Implementación:**
```javascript
<Route path="/admin/*" element={
  <ProtectedRoute>
    <AdminLayout />
  </ProtectedRoute>
} />
```

**Redirección inteligente:**
- Guarda la ruta que el usuario intentaba acceder
- Después del login exitoso, redirige a esa ruta automáticamente

### 4. Página de Login (`src/features/auth/LoginPage.jsx`)

**Ubicación:** `apps/web/src/features/auth/LoginPage.jsx`

**Mejoras de seguridad implementadas:**
- Integración con `AuthContext` para autenticación real
- Manejo de errores de autenticación con mensajes al usuario
- Estados de carga con deshabilitación de formulario
- Validación de campos obligatorios
- Redirección post-login a ruta deseada o dashboard por defecto
- Diseño responsive para móvil y escritorio

**Credenciales de desarrollo:**
- Email: `admin@example.com`
- Password: `admin123`

### 5. Layout Administrativo (`src/features/admin/AdminLayout.jsx`)

**Ubicación:** `apps/web/src/features/admin/AdminLayout.jsx`

**Actualización:**
- Botón de "Cerrar Sesión" integrado con `useAuth()`
- Llama al método `logout()` que limpia el token y redirige

## Flujo de Autenticación

### Login
```
1. Usuario ingresa credenciales en LoginPage
2. Se llama a login(email, password) del AuthContext
3. AuthContext llama a authService.login()
4. authService genera/valida token JWT
5. Token y datos de usuario se guardan en localStorage
6. Estado global se actualiza con información del usuario
7. Usuario es redirigido a la ruta deseada o /admin
```

### Verificación de Sesión
```
1. Al cargar la app, AuthProvider verifica si existe token
2. Llama a authService.isAuthenticated()
3. Decodifica JWT y verifica fecha de expiración
4. Si es válido, obtiene datos de usuario y actualiza estado
5. Si no es válido o expiró, limpia localStorage
```

### Acceso a Rutas Protegidas
```
1. Usuario intenta acceder a /admin/*
2. ProtectedRoute verifica estado de autenticación con useAuth()
3. Si loading=true, muestra spinner
4. Si user=null, redirige a /login guardando ubicación deseada
5. Si user existe, permite acceso y renderiza componente
```

### Logout
```
1. Usuario hace clic en "Cerrar Sesión"
2. Se llama a logout() del AuthContext
3. authService.logout() limpia localStorage
4. Estado global se resetea (user=null)
5. Usuario es redirigido a /login
```

## Estructura de Token JWT

### Mock Token (Desarrollo)
```javascript
{
  header: { alg: "HS256", typ: "JWT" },
  payload: {
    userId: "1",
    email: "admin@example.com",
    role: "admin",
    exp: timestamp + 86400  // 24 horas
  }
}
```

### Almacenamiento
- **Token:** `localStorage.getItem('token')`
- **Usuario:** `localStorage.getItem('user')` (JSON stringificado)

## Rutas Protegidas

Todas las rutas bajo `/admin` están protegidas:
- `/admin` - Dashboard administrativo
- `/admin/buildings` - Gestión de edificios
- `/admin/floors` - Gestión de pisos
- `/admin/rooms` - Gestión de salas
- `/admin/bathrooms` - Gestión de baños
- `/admin/osm` - Importación OSM

## Consideraciones de Seguridad Actuales

### ✅ Implementado
- Autenticación basada en tokens JWT
- Validación de expiración de tokens
- Protección de rutas administrativas
- Estado de autenticación global
- Cierre de sesión seguro con limpieza de datos
- Redirección automática en caso de token inválido
- Persistencia de sesión entre recargas

### ⚠️ Pendiente para Producción

#### 1. **Integración con Backend Real**
```javascript
// Reemplazar en auth.js
async login(email, password) {
  const response = await fetch('http://localhost:4000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  const data = await response.json()
  // Manejar token real del servidor
}
```

#### 2. **Interceptor de API para Autorización**
Agregar token a todas las peticiones:
```javascript
// En api.js
api.interceptors.request.use((config) => {
  const token = authService.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

#### 3. **Refresh Token**
Implementar renovación automática de tokens antes de expiración:
```javascript
// Verificar cada 5 minutos si token expira pronto
setInterval(() => {
  if (tokenExpiresInLessThan(5 * 60 * 1000)) {
    refreshToken()
  }
}, 5 * 60 * 1000)
```

#### 4. **Cookies HttpOnly** (Recomendado)
En lugar de `localStorage`, usar cookies HttpOnly para mayor seguridad:
- No accesibles desde JavaScript
- Protección contra XSS
- Enviadas automáticamente en cada request

#### 5. **Rate Limiting**
Limitar intentos de login para prevenir ataques de fuerza bruta:
```javascript
// Backend debe implementar
// Frontend puede mostrar mensaje después de X intentos
```

#### 6. **CSRF Protection**
Tokens CSRF para prevenir Cross-Site Request Forgery

#### 7. **Headers de Seguridad**
```javascript
// Backend debe enviar
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000
```

#### 8. **Validación de Entrada**
- Sanitización de inputs en frontend y backend
- Validación de formato de email
- Requisitos de contraseña fuerte

#### 9. **Logging y Auditoría**
- Registro de intentos de login
- Log de accesos a rutas protegidas
- Alertas de actividad sospechosa

#### 10. **Encriptación HTTPS**
- Obligatorio en producción
- Certificado SSL/TLS válido

## Testing de Seguridad

### Casos de Prueba
1. ✅ Intentar acceder a `/admin` sin login → Redirige a `/login`
2. ✅ Login exitoso → Muestra dashboard
3. ✅ Logout → Limpia sesión y redirige
4. ✅ Token expirado → Redirige a login automáticamente
5. ✅ Recargar página con sesión válida → Mantiene sesión
6. ✅ Escribir URL directa `/admin/buildings` sin auth → Bloquea acceso

### Pruebas Manuales
```javascript
// En DevTools Console
// Verificar token
localStorage.getItem('token')

// Eliminar token manualmente
localStorage.removeItem('token')
// Intentar acceder a /admin → debe redirigir

// Verificar expiración
const token = localStorage.getItem('token')
const payload = JSON.parse(atob(token.split('.')[1]))
console.log(new Date(payload.exp * 1000)) // Fecha de expiración
```

## Mejores Prácticas Implementadas

1. **Separación de Responsabilidades**
   - Servicio de autenticación independiente
   - Contexto para estado global
   - Componente guard para protección de rutas

2. **DRY (Don't Repeat Yourself)**
   - Hook `useAuth()` reutilizable en cualquier componente
   - Lógica de autenticación centralizada

3. **User Experience**
   - Loading states durante verificación
   - Mensajes de error claros
   - Redirección inteligente post-login

4. **Mantenibilidad**
   - Código modular y desacoplado
   - Comentarios y nombres descriptivos
   - Fácil migración a autenticación real

## Archivos Modificados/Creados

### Nuevos Archivos
- `apps/web/src/lib/auth.js` - Servicio de autenticación
- `apps/web/src/contexts/AuthContext.jsx` - Contexto de auth
- `apps/web/src/components/ProtectedRoute.jsx` - Guard de rutas

### Archivos Modificados
- `apps/web/src/main.jsx` - Integración de AuthProvider y ProtectedRoute
- `apps/web/src/features/auth/LoginPage.jsx` - Integración con auth real
- `apps/web/src/features/admin/AdminLayout.jsx` - Logout funcional

## Conclusión

El sistema de seguridad implementado proporciona una base sólida para proteger la aplicación contra accesos no autorizados. El uso de JWT, rutas protegidas y gestión centralizada de estado garantiza que solo usuarios autenticados puedan acceder a las secciones administrativas.

Para producción, es **crítico** implementar las recomendaciones pendientes, especialmente:
- Backend con autenticación real
- HTTPS obligatorio
- Cookies HttpOnly en lugar de localStorage
- Rate limiting y validación robusta

La arquitectura actual facilita estas mejoras futuras sin necesidad de refactorización mayor.
