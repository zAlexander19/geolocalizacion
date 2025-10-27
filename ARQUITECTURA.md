# Arquitectura del Sistema - Geolocalización Campus

## Índice
1. [Visión General](#visión-general)
2. [Arquitectura General](#arquitectura-general)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Backend (API)](#backend-api)
6. [Frontend (Web)](#frontend-web)
7. [Flujo de Datos](#flujo-de-datos)
8. [Características Principales](#características-principales)
9. [Seguridad y Validación](#seguridad-y-validación)
10. [Deployment](#deployment)

---

## Visión General

El sistema de **Geolocalización Campus** es una aplicación web full-stack diseñada para ayudar a estudiantes, profesores y visitantes a encontrar ubicaciones dentro del campus universitario. Permite buscar edificios, salas, facultades y baños, mostrando rutas óptimas desde la ubicación actual del usuario hasta el destino seleccionado.

### Objetivos Principales
- Facilitar la navegación dentro del campus universitario
- Proporcionar información detallada de edificios, pisos y salas
- Calcular rutas óptimas usando geolocalización
- Administrar de forma centralizada toda la información del campus

---

## Arquitectura General

El sistema sigue una arquitectura **Cliente-Servidor** con separación clara entre frontend y backend:

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React + Vite)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Páginas Públicas:                                    │   │
│  │  - HomePage (Búsqueda y navegación)                  │   │
│  │  - LoginPage (Autenticación)                         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Páginas Admin:                                       │   │
│  │  - BuildingsPage (CRUD Edificios)                    │   │
│  │  - FloorsPage (CRUD Pisos)                           │   │
│  │  - RoomsPage (CRUD Salas)                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Bibliotecas: React Router, React Query, Material UI         │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/REST API
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Express.js)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API REST Endpoints:                                  │   │
│  │  - /buildings (GET, POST, PUT, DELETE)               │   │
│  │  - /buildings/:id/floors                             │   │
│  │  - /floors/:id (GET, PUT, DELETE)                    │   │
│  │  - /rooms (GET, POST, PUT, DELETE)                   │   │
│  │  - /uploads (Archivos estáticos)                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Middleware: CORS, Multer (upload), Express JSON             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                PERSISTENCIA (JSON File)                      │
│  - db.json (Buildings, Floors, Rooms)                        │
│  - /uploads (Imágenes PNG/JPG)                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Stack Tecnológico

### Frontend
- **React 19.1.1** - Biblioteca de interfaz de usuario
- **Vite 7.1.7** - Build tool y dev server
- **React Router 6.28.0** - Enrutamiento y navegación
- **React Query 5.59.0** (@tanstack/react-query) - Gestión de estado del servidor
- **Material UI 5** (@mui/material) - Componentes UI
- **React Hook Form 7.53.2** - Manejo de formularios
- **Axios 1.7.9** - Cliente HTTP
- **Emotion** - Styled components para MUI
- **Google Maps Embed API** - Visualización de mapas y rutas

### Backend
- **Node.js** - Runtime de JavaScript
- **Express 4.19.2** - Framework web
- **Multer** - Middleware para subida de archivos
- **CORS** - Gestión de políticas de origen cruzado
- **Morgan** - Logger HTTP
- **Zod 3.23.8** - Validación de esquemas (preparado para uso futuro)
- **JWT 9.0.2** - Autenticación (preparado para uso futuro)
- **Nodemon 3.1.7** - Hot reload en desarrollo

### Persistencia
- **JSON File System** - Base de datos en archivo JSON
- **File System (fs)** - Gestión de archivos e imágenes

---

## Estructura del Proyecto

```
geolocalizacion/
├── apps/
│   ├── api/                          # Backend (Express API)
│   │   ├── src/
│   │   │   ├── app.js               # Configuración principal de Express
│   │   │   ├── index.js             # Punto de entrada del servidor
│   │   │   ├── controllers/         # (Preparado para futura modularización)
│   │   │   ├── routes/              # (Preparado para futura modularización)
│   │   │   ├── services/            # (Preparado para futura modularización)
│   │   │   ├── schemas/             # (Validación Zod preparada)
│   │   │   ├── middlewares/         # (Auth middleware preparado)
│   │   │   └── db/
│   │   │       └── memory.js        # Operaciones DB en memoria
│   │   ├── data/
│   │   │   └── db.json              # Base de datos JSON
│   │   ├── uploads/                 # Archivos subidos (imágenes)
│   │   ├── package.json
│   │   └── eslint.config.js
│   │
│   └── web/                          # Frontend (React + Vite)
│       ├── src/
│       │   ├── main.jsx             # Punto de entrada React
│       │   ├── App.jsx              # Componente raíz
│       │   ├── app/
│       │   │   ├── Layout.jsx       # Layout principal
│       │   │   └── router.jsx       # Configuración de rutas
│       │   ├── features/
│       │   │   ├── public/
│       │   │   │   └── HomePage.jsx           # Búsqueda y navegación
│       │   │   ├── auth/
│       │   │   │   └── LoginPage.jsx          # Página de login
│       │   │   └── admin/
│       │   │       ├── AdminLayout.jsx        # Layout del panel admin
│       │   │       ├── buildings/
│       │   │       │   └── BuildingsPage.jsx  # CRUD Edificios
│       │   │       ├── floors/
│       │   │       │   └── FloorsPage.jsx     # CRUD Pisos
│       │   │       └── rooms/
│       │   │           └── RoomsPage.jsx      # CRUD Salas
│       │   ├── components/
│       │   │   ├── DataTable.jsx
│       │   │   ├── FormField.jsx
│       │   │   ├── Modal.jsx
│       │   │   └── ui/              # Componentes UI reutilizables
│       │   └── lib/
│       │       ├── api.js           # Cliente Axios configurado
│       │       ├── auth.js          # Utilidades de autenticación
│       │       └── queryClient.js   # Configuración React Query
│       ├── public/
│       ├── package.json
│       ├── vite.config.js
│       ├── tailwind.config.js
│       └── postcss.config.js
│
├── docs/
│   └── api.md                       # Documentación API
├── package.json                     # Workspace root
├── README.md
└── ARQUITECTURA.md                  # Este archivo
```

---

## Backend (API)

### Arquitectura del Backend

El backend está construido como una **API RESTful** con Express.js. Utiliza un enfoque funcional simple y directo, con toda la lógica centralizada en `app.js`.

#### Características Principales

1. **CRUD Completo**
   - Edificios (Buildings)
   - Pisos (Floors)
   - Salas (Rooms)

2. **Subida de Archivos**
   - Multer configurado para PNG/JPG
   - Almacenamiento en carpeta `/uploads`
   - Nombres únicos con timestamp

3. **Persistencia en JSON**
   - Funciones `loadDB()` y `saveDB()`
   - Auto-incremento de IDs con `nextId()`
   - Eliminación en cascada (Building → Floors → Rooms)

4. **Archivos Estáticos**
   - Middleware `express.static` para servir `/uploads`

### Endpoints Principales

#### Buildings (Edificios)
```javascript
GET    /buildings              // Listar todos los edificios
POST   /buildings              // Crear edificio (multipart/form-data)
PUT    /buildings/:id          // Actualizar edificio (multipart/form-data)
DELETE /buildings/:id          // Eliminar edificio (cascada)
```

#### Floors (Pisos)
```javascript
GET    /buildings/:id/floors   // Listar pisos de un edificio
POST   /buildings/:id/floors   // Crear piso (multipart/form-data)
PUT    /floors/:id             // Actualizar piso (multipart/form-data)
DELETE /floors/:id             // Eliminar piso (cascada)
```

#### Rooms (Salas)
```javascript
GET    /rooms                  // Listar todas las salas
POST   /rooms                  // Crear sala (multipart/form-data)
PUT    /rooms/:id              // Actualizar sala (multipart/form-data)
DELETE /rooms/:id              // Eliminar sala
```

#### Archivos Estáticos
```javascript
GET    /uploads/:filename      // Servir imagen
```

### Modelo de Datos

#### Building (Edificio)
```json
{
  "id_edificio": 1,
  "nombre_edificio": "Federación de ingeniería y arquitectura",
  "acronimo": "FIA",
  "imagen": "/uploads/1234567890-image.png",
  "cord_latitud": -20.242938,
  "cord_longitud": -70.141131,
  "estado": true,
  "disponibilidad": "Disponible"
}
```

#### Floor (Piso)
```json
{
  "id_piso": 1,
  "id_edificio": 1,
  "nombre_piso": "Primer piso",
  "numero_piso": 1,
  "imagen": "/uploads/1234567890-floor.png",
  "codigo_qr": "",
  "estado": true,
  "disponibilidad": "Disponible"
}
```

#### Room (Sala)
```json
{
  "id_sala": 1,
  "id_piso": 1,
  "nombre_sala": "Ic2",
  "imagen": "/uploads/1234567890-room.jpg",
  "capacidad": 40,
  "tipo_sala": "Aula",
  "cord_latitud": -20.242950,
  "cord_longitud": -70.141150,
  "estado": true,
  "disponibilidad": "Disponible"
}
```

### Configuración de Multer

```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.resolve(__dirname, '../uploads')
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten archivos PNG o JPG'))
    }
  }
})
```

---

## Frontend (Web)

### Arquitectura del Frontend

El frontend utiliza **React** con una arquitectura basada en **features** (características). Cada feature agrupa componentes, hooks y lógica relacionada.

#### Estructura de Rutas

```javascript
/ (HomePage)                    // Página pública de búsqueda
/login (LoginPage)              // Página de inicio de sesión
/admin                          // Layout admin con sidebar
  ├── /admin/edificios          // CRUD Edificios
  ├── /admin/pisos             // CRUD Pisos
  └── /admin/salas             // CRUD Salas
```

### Componentes Principales

#### 1. HomePage (Página Pública)

**Características:**
- Búsqueda de salas por nombre
- Geolocalización del usuario (HTML5 Geolocation API)
- Cálculo de distancia usando fórmula Haversine
- Ordenamiento de resultados por proximidad
- Modal de detalles con información completa
- Integración con Google Maps para rutas

**Tecnologías:**
- React Query para fetching de datos
- Google Maps Embed API para mostrar rutas
- Material UI para componentes

**Flujo:**
```
1. Usuario acepta permisos de geolocalización
2. Busca sala por nombre
3. Sistema calcula distancias y ordena
4. Usuario ve detalles de sala
5. Usuario solicita ruta en mapa
6. Se abre Google Maps con ruta óptima
```

#### 2. AdminLayout (Panel de Administración)

**Características:**
- Sidebar con navegación (Edificios, Pisos, Salas)
- Responsive (drawer temporal en móvil)
- Botón de cerrar sesión
- Outlet para nested routes

**Componentes UI:**
- Material UI Drawer
- Material UI List/ListItem
- Material UI AppBar

#### 3. BuildingsPage (CRUD Edificios)

**Características:**
- Tabla con filtro por edificio seleccionado
- Formulario de creación/edición
- Subida de imágenes (PNG/JPG)
- Preview de imagen antes de guardar
- Vista previa fullscreen de imágenes en tabla
- Eliminación con confirmación

**Gestión de Estado:**
- React Query para operaciones CRUD
- React Hook Form para formularios
- Controller para integrar MUI Select

#### 4. FloorsPage (CRUD Pisos)

**Características:**
- Tabla filtrada por edificio
- Formulario con select de edificio
- Subida de imágenes
- Campos: nombre, número, imagen, código QR

#### 5. RoomsPage (CRUD Salas)

**Características:**
- Filtros en cascada (Edificio → Piso)
- Select de tipo sala: "Aula" o "Laboratorio"
- Subida de imágenes
- Coordenadas geográficas (latitud/longitud)

### Gestión de Estado

#### React Query (TanStack Query)

**Ventajas:**
- Cache automático de datos
- Refetch inteligente
- Optimistic updates
- Invalidación de queries

**Ejemplo de uso:**
```javascript
const { data: buildings } = useQuery({
  queryKey: ['buildings'],
  queryFn: async () => {
    const res = await api.get('/buildings')
    return res.data.data
  },
})

const createMutation = useMutation({
  mutationFn: async (formData) => {
    return await api.post('/buildings', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['buildings'])
  },
})
```

#### React Hook Form

**Ventajas:**
- Performance optimizado
- Validación integrada
- Menos re-renders

**Ejemplo de uso:**
```javascript
const { control, handleSubmit, reset, setValue } = useForm({
  defaultValues: {
    nombre_edificio: '',
    acronimo: '',
    cord_latitud: 0,
    cord_longitud: 0,
    estado: true,
  }
})

<Controller
  name="nombre_edificio"
  control={control}
  render={({ field }) => <TextField {...field} label="Nombre" />}
/>
```

### Integración con Google Maps

#### Google Maps Embed API

Se utiliza para mostrar rutas desde la ubicación del usuario hasta la sala seleccionada:

```javascript
const getGoogleMapsEmbedUrl = () => {
  if (!selectedRoom) return ''
  
  if (!userLocation) {
    // Solo mostrar destino
    return `https://www.google.com/maps/embed/v1/place?key=API_KEY&q=${lat},${lng}`
  }
  
  // Mostrar ruta
  const origin = `${userLocation.latitude},${userLocation.longitude}`
  const destination = `${room.cord_latitud},${room.cord_longitud}`
  return `https://www.google.com/maps/embed/v1/directions?key=API_KEY&origin=${origin}&destination=${destination}&mode=walking`
}
```

---

## Flujo de Datos

### Flujo de Creación de Sala

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │ 1. Completa formulario
       ▼
┌─────────────────────────────┐
│  RoomsPage (React)          │
│  - React Hook Form          │
│  - Selecciona edificio      │
│  - Selecciona piso          │
│  - Sube imagen PNG/JPG      │
│  - Ingresa coordenadas      │
└──────┬──────────────────────┘
       │ 2. Submit FormData
       ▼
┌─────────────────────────────┐
│  useMutation (React Query)  │
│  - POST /rooms              │
│  - multipart/form-data      │
└──────┬──────────────────────┘
       │ 3. HTTP Request
       ▼
┌─────────────────────────────┐
│  Express Backend            │
│  - Multer middleware        │
│  - Guarda imagen en /uploads│
│  - Genera ID único          │
└──────┬──────────────────────┘
       │ 4. Persistencia
       ▼
┌─────────────────────────────┐
│  db.json                    │
│  - Agrega nueva sala        │
│  - Guarda cambios           │
└──────┬──────────────────────┘
       │ 5. Response 201
       ▼
┌─────────────────────────────┐
│  React Query                │
│  - Invalida cache           │
│  - Re-fetch automático      │
└──────┬──────────────────────┘
       │ 6. UI actualizada
       ▼
┌─────────────────────────────┐
│  Tabla actualizada          │
│  - Nueva sala visible       │
└─────────────────────────────┘
```

### Flujo de Búsqueda y Navegación

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │ 1. Acepta geolocalización
       ▼
┌─────────────────────────────┐
│  Geolocation API            │
│  - navigator.geolocation    │
│  - getCurrentPosition()     │
└──────┬──────────────────────┘
       │ 2. Coordenadas usuario
       ▼
┌─────────────────────────────┐
│  HomePage                   │
│  - Estado: userLocation     │
└──────┬──────────────────────┘
       │ 3. Usuario busca "Ic2"
       ▼
┌─────────────────────────────┐
│  React Query                │
│  - GET /rooms               │
│  - Filtra por nombre        │
└──────┬──────────────────────┘
       │ 4. Calcula distancias
       ▼
┌─────────────────────────────┐
│  Haversine Formula          │
│  - calculateDistance()      │
│  - Ordena por proximidad    │
└──────┬──────────────────────┘
       │ 5. Muestra resultados
       ▼
┌─────────────────────────────┐
│  Cards de Salas             │
│  - Distancia en metros      │
│  - Información completa     │
└──────┬──────────────────────┘
       │ 6. Click "Ver más"
       ▼
┌─────────────────────────────┐
│  Modal de Detalles          │
│  - Imágenes (Sala/Piso/Edif)│
│  - Info completa            │
└──────┬──────────────────────┘
       │ 7. Click "Mostrar mapa"
       ▼
┌─────────────────────────────┐
│  Google Maps Modal          │
│  - Ruta óptima caminando    │
│  - Origen → Destino         │
└─────────────────────────────┘
```

---

## Características Principales

### 1. Geolocalización
- Solicitud de permisos al usuario
- Cálculo de distancias con fórmula Haversine
- Ordenamiento por proximidad

### 2. Búsqueda Inteligente
- Filtrado en tiempo real
- Búsqueda por nombre de sala
- Extensible a otros tipos (edificio, facultad, baño)

### 3. Gestión de Imágenes
- Subida de archivos PNG/JPG
- Almacenamiento con nombres únicos
- Preview antes de guardar
- Vista fullscreen en tablas

### 4. CRUD Completo
- Crear, Leer, Actualizar, Eliminar
- Validación de datos
- Confirmación antes de eliminar
- Eliminación en cascada

### 5. Rutas con Google Maps
- Cálculo automático de ruta óptima
- Modo caminata
- Visualización en iframe embebido
- Fallback si no hay geolocalización

### 6. Filtros Dinámicos
- Select de edificios
- Filtros en cascada (Edificio → Piso)
- Tablas vacías hasta selección
- Reseteo automático

### 7. Responsive Design
- Mobile-first approach
- Drawer temporal en móvil
- Grid adaptable
- Modales fullscreen en móvil

---

## Seguridad y Validación

### Backend

#### Validación de Archivos
```javascript
fileFilter: (req, file, cb) => {
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
    cb(null, true)
  } else {
    cb(new Error('Solo se permiten archivos PNG o JPG'))
  }
}
```

#### CORS
```javascript
app.use(cors())  // Permite todas las origenes en desarrollo
```

#### Conversión Segura de Tipos
```javascript
estado: b.estado === 'true' || b.estado === true  // FormData envía strings
```

### Frontend

#### Validación de Formularios
- Required fields marcados
- Tipos numéricos para coordenadas
- Selects con opciones predefinidas

#### Manejo de Errores
- Try-catch en peticiones
- Mensajes de error al usuario
- Loading states

---

## Deployment

### Requisitos de Producción

#### Backend
```bash
# Variables de entorno
PORT=4000
NODE_ENV=production

# Dependencias
npm install --production

# Iniciar servidor
npm start
```

#### Frontend
```bash
# Build de producción
npm run build

# Servir con servidor estático (nginx, apache, etc.)
# o desplegar en servicios como Vercel, Netlify
```

### Estructura de Despliegue Sugerida

```
┌─────────────────────────────────────────┐
│         Servidor de Producción          │
├─────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────┐    │
│  │  Nginx (Reverse Proxy)         │    │
│  │  Port 80/443                   │    │
│  └───┬─────────────────────┬──────┘    │
│      │                     │            │
│      │ /api/*              │ /*         │
│      ▼                     ▼            │
│  ┌────────────┐      ┌──────────────┐  │
│  │  Express   │      │  Static Files│  │
│  │  API       │      │  (React)     │  │
│  │  :4000     │      │              │  │
│  └────────────┘      └──────────────┘  │
│                                          │
└─────────────────────────────────────────┘
```

### Consideraciones de Producción

1. **Base de Datos**
   - Migrar de JSON a PostgreSQL/MongoDB
   - Implementar backups automáticos
   - Índices en campos de búsqueda

2. **Autenticación**
   - Implementar JWT real
   - Refresh tokens
   - Protección de rutas admin

3. **Almacenamiento de Imágenes**
   - Usar CDN (Cloudinary, AWS S3)
   - Optimización de imágenes
   - Lazy loading

4. **Performance**
   - Caché de API (Redis)
   - Compresión gzip
   - Minificación de assets

5. **Monitoreo**
   - Logging centralizado
   - Métricas de performance
   - Alertas de errores

---

## Conclusión

El sistema de Geolocalización Campus es una aplicación moderna y escalable que combina tecnologías web actuales con patrones de arquitectura probados. La separación clara entre frontend y backend permite desarrollo independiente y facilita el mantenimiento.

### Próximas Mejoras Sugeridas

1. Implementar autenticación real con JWT
2. Migrar a base de datos relacional (PostgreSQL)
3. Agregar búsqueda por edificio, facultad y baños
4. Implementar caché con Redis
5. Añadir tests unitarios y de integración
6. Crear documentación API con Swagger
7. Implementar WebSockets para updates en tiempo real
8. Añadir analytics y tracking de uso
9. Optimizar imágenes con Sharp
10. Implementar i18n (internacionalización)

---

**Versión:** 1.0  
**Fecha:** Octubre 2025  
**Autor:** Sistema de Geolocalización Campus UNAP
