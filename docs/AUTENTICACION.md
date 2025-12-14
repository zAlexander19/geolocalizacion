# Sistema de Autenticación y Usuarios

## Tabla de Usuarios

La tabla `usuarios` gestiona los usuarios del sistema con dos roles principales:

### Estructura
```sql
- id_usuario: SERIAL PRIMARY KEY
- nombre: VARCHAR(255) NOT NULL
- email: VARCHAR(255) NOT NULL UNIQUE
- password_hash: VARCHAR(255) NOT NULL (bcrypt)
- rol: 'admin_primario' | 'admin_secundario'
- estado: BOOLEAN (activo/inactivo)
- ultimo_acceso: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Roles

#### Admin Primario
- Puede gestionar usuarios (crear, ver, cambiar contraseñas, activar/desactivar)
- Puede gestionar todo el contenido (edificios, pisos, salas, baños, facultades)
- Puede cambiar su propia contraseña
- Acceso completo al sistema

#### Admin Secundario
- Puede gestionar contenido (edificios, pisos, salas, baños, facultades)
- Puede cambiar su propia contraseña
- **NO** puede gestionar otros usuarios
- **NO** puede cambiar contraseñas de otros usuarios

## Instalación

### 1. Instalar dependencias
```bash
cd apps/api
npm install
```

### 2. Crear tabla de usuarios
```bash
node src/db/create-usuarios.js
```

Este comando creará:
- La tabla `usuarios` con índices y triggers
- Un usuario administrador por defecto:
  - **Email**: `admin@unap.cl`
  - **Contraseña**: `admin123`
  - **Rol**: `admin_primario`

⚠️ **IMPORTANTE**: Cambia la contraseña después del primer inicio de sesión.

### 3. Variables de entorno

Asegúrate de tener en tu `.env`:
```bash
# JWT Secret (cambiar en producción)
JWT_SECRET=your-secret-key-change-in-production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=geolocalizacion
DB_USER=postgres
DB_PASSWORD=tu_password
```

## API Endpoints

### Autenticación

#### POST `/auth/login`
Iniciar sesión

**Request:**
```json
{
  "email": "admin@unap.cl",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": 1,
      "nombre": "Administrador Principal",
      "email": "admin@unap.cl",
      "rol": "admin_primario"
    }
  }
}
```

#### GET `/auth/me`
Obtener usuario actual (requiere token)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Administrador Principal",
    "email": "admin@unap.cl",
    "rol": "admin_primario"
  }
}
```

### Gestión de Contraseñas

#### POST `/auth/change-password`
Cambiar contraseña propia (requiere token)

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "passwordActual": "admin123",
  "passwordNueva": "miNuevaPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contraseña actualizada exitosamente"
}
```

#### POST `/auth/users/:userId/reset-password`
Resetear contraseña de otro usuario (solo admin primario)

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "passwordNueva": "nuevaPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contraseña del usuario actualizada exitosamente"
}
```

### Gestión de Usuarios (Solo Admin Primario)

#### GET `/auth/users`
Listar todos los usuarios

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id_usuario": 1,
      "nombre": "Administrador Principal",
      "email": "admin@unap.cl",
      "rol": "admin_primario",
      "estado": true,
      "ultimo_acceso": "2025-12-14T10:30:00.000Z",
      "created_at": "2025-12-01T08:00:00.000Z"
    }
  ]
}
```

#### POST `/auth/users`
Crear nuevo usuario

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@unap.cl",
  "password": "password123",
  "rol": "admin_secundario"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "data": {
    "id_usuario": 2,
    "nombre": "Juan Pérez",
    "email": "juan@unap.cl",
    "rol": "admin_secundario",
    "estado": true,
    "created_at": "2025-12-14T10:45:00.000Z"
  }
}
```

#### PATCH `/auth/users/:userId/status`
Activar/desactivar usuario

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "estado": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Estado del usuario actualizado exitosamente",
  "data": {
    "id_usuario": 2,
    "nombre": "Juan Pérez",
    "email": "juan@unap.cl",
    "rol": "admin_secundario",
    "estado": false
  }
}
```

## Uso en el Frontend

### 1. Login y almacenar token

```javascript
import api from '@/lib/api'

const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password })
  const { token, usuario } = response.data.data
  
  // Guardar token en localStorage
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(usuario))
  
  return { token, usuario }
}
```

### 2. Configurar interceptor de axios

```javascript
// lib/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000'
})

// Interceptor para agregar token a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor para manejar errores 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

### 3. Verificar permisos

```javascript
const user = JSON.parse(localStorage.getItem('user'))

// Verificar si es admin primario
const isAdminPrimario = user?.rol === 'admin_primario'

// Mostrar sección de gestión de usuarios solo para admin primario
{isAdminPrimario && (
  <MenuItem onClick={() => navigate('/admin/usuarios')}>
    Gestión de Usuarios
  </MenuItem>
)}
```

## Seguridad

### Contraseñas
- Hasheadas con bcrypt (10 rounds)
- Longitud mínima: 6 caracteres
- Nunca se almacenan en texto plano

### Tokens JWT
- Expiración: 24 horas
- Incluyen: id, email, rol, nombre
- Verificados en cada petición protegida

### Validaciones
- Email único
- Roles válidos
- Estados booleanos
- Permisos por rol

## Migración desde sistema anterior

Si ya tienes datos en el sistema:

1. Los datos de edificios, pisos, salas, etc. NO se ven afectados
2. El sistema de autenticación es adicional
3. Para auditoría, los logs existentes mantienen el campo `user_email`
4. Los nuevos logs pueden usar el email del usuario autenticado

## Próximos pasos

1. **Crear interfaz de login** en el frontend
2. **Agregar página de gestión de usuarios** (solo admin primario)
3. **Agregar página de cambio de contraseña**
4. **Proteger rutas del frontend** según rol
5. **Actualizar audit logs** para usar usuarios de la tabla

## Troubleshooting

### Error: "bcrypt no está instalado"
```bash
cd apps/api
npm install bcrypt
```

### Error: "La función update_updated_at_column no existe"
Ejecuta primero el schema principal:
```bash
node src/db/setup.js
```

### Error: "Token inválido"
- Verifica que el JWT_SECRET sea el mismo en todas partes
- Verifica que el token no haya expirado (24h)
- Verifica el formato: `Bearer <token>`
