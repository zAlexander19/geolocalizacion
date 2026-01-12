# Guía Rápida: Sistema de Logs y Manejo de Errores

Esta guía proporciona ejemplos prácticos de cómo usar el nuevo sistema de logs en el backend y el manejo de errores en el frontend.

## 🔧 Backend: Sistema de Logs

### Uso Básico

```javascript
import logger from './utils/logger.js'

// Información general
logger.info('Usuario autenticado', { userId: 123, email: 'user@example.com' })

// Advertencias
logger.warn('Intento de acceso sin permisos', { userId: 456 })

// Errores
logger.error('Error al conectar a base de datos', { error: err.message })

// Debug (solo en desarrollo)
logger.debug('Datos de entrada', { data: req.body })
```

### En Rutas y Controladores

```javascript
// En un controlador
export const createBuilding = async (req, res) => {
  try {
    const building = await buildingsRepo.create(req.body)
    
    // Log de éxito
    logger.info('Edificio creado', { 
      buildingId: building.id_edificio,
      name: building.nombre_edificio 
    })
    
    res.status(201).json({ data: building })
  } catch (error) {
    // Log de error con contexto
    logger.logError(error, req)
    
    // El middleware de error se encargará de la respuesta
    throw error
  }
}
```

### Logs de Base de Datos

```javascript
// Antes de una operación importante
logger.logDatabaseOperation('CREATE', 'buildings', {
  userId: req.user.id,
  buildingName: data.nombre_edificio
})

// Después de una operación
logger.info('Registro actualizado', {
  table: 'buildings',
  id: building.id_edificio,
  changes: diff
})
```

## 🎨 Frontend: Manejo de Errores

### Opción 1: Hook useError (recomendado para mensajes personalizados)

```jsx
import { useError } from '../contexts/ErrorContext'

function MyComponent() {
  const { showError, showSuccess, showWarning, showInfo } = useError()
  
  const handleSubmit = async (data) => {
    try {
      await api.post('/buildings', data)
      showSuccess('Edificio creado correctamente')
    } catch (error) {
      // Mensaje personalizado
      showError('No se pudo crear el edificio. Verifique los datos.')
    }
  }
  
  return <button onClick={handleSubmit}>Crear</button>
}
```

### Opción 2: Hook useApiErrorHandler (recomendado para errores automáticos)

```jsx
import { useApiErrorHandler } from '../utils/errorHandler'

function MyComponent() {
  const handleError = useApiErrorHandler()
  const { showSuccess } = useError()
  
  const handleSubmit = async (data) => {
    try {
      await api.post('/buildings', data)
      showSuccess('Edificio creado correctamente')
    } catch (error) {
      // Muestra automáticamente el mensaje del servidor
      handleError(error)
    }
  }
  
  return <button onClick={handleSubmit}>Crear</button>
}
```

### Diferentes Tipos de Notificaciones

```jsx
const { showError, showSuccess, showWarning, showInfo } = useError()

// Error (rojo)
showError('No se pudo completar la operación')

// Éxito (verde)
showSuccess('Operación completada exitosamente')

// Advertencia (naranja)
showWarning('Esta acción no se puede deshacer')

// Información (azul)
showInfo('Se han aplicado los filtros')
```

### Manejo de Errores Específicos

```jsx
const handleDelete = async (id) => {
  try {
    await api.delete(`/buildings/${id}`)
    showSuccess('Edificio eliminado correctamente')
  } catch (error) {
    // Manejo específico según el tipo de error
    if (error.response?.status === 400) {
      // Error de validación o dependencias
      const message = error.response.data.message
      showWarning(message)
    } else if (error.response?.status === 401) {
      // No autenticado
      showError('Su sesión ha expirado. Por favor inicie sesión.')
      navigate('/login')
    } else if (error.response?.status === 403) {
      // Sin permisos
      showError('No tiene permisos para realizar esta acción')
    } else {
      // Error genérico
      handleError(error)
    }
  }
}
```

## 📊 Monitoreo de Logs

### Ver logs en tiempo real

```bash
# Ver todos los logs
tail -f apps/api/logs/combined-*.log

# Ver solo errores
tail -f apps/api/logs/error-*.log

# Buscar errores específicos
grep "Error al" apps/api/logs/error-*.log
```

### Analizar logs con jq

```bash
# Ver los últimos 10 errores
cat apps/api/logs/error-*.log | jq -r '"\(.timestamp) - \(.message)"' | tail -10

# Contar tipos de errores
cat apps/api/logs/error-*.log | jq -r '.name' | sort | uniq -c

# Ver peticiones lentas (>1000ms)
cat apps/api/logs/combined-*.log | grep "http" | jq 'select(.responseTime | sub("ms";"") | tonumber > 1000)'

# Ver errores del usuario específico
cat apps/api/logs/error-*.log | jq 'select(.request.body.userId == 123)'
```

## 🚨 Patrones Comunes

### Backend: Manejando Errores de Validación

```javascript
import { AppError } from './middlewares/errorHandler.middleware.js'

export const createBuilding = async (req, res) => {
  const { nombre_edificio, acronimo } = req.body
  
  // Validación personalizada
  if (!nombre_edificio) {
    throw new AppError('El nombre del edificio es requerido', 400)
  }
  
  // Verificar duplicados
  const existing = await buildingsRepo.findByName(nombre_edificio)
  if (existing) {
    throw new AppError('Ya existe un edificio con este nombre', 400)
  }
  
  // Crear edificio...
}
```

### Frontend: Confirmación con Manejo de Errores

```jsx
const handleDelete = async (building) => {
  const confirmed = window.confirm(
    `¿Está seguro de eliminar el edificio ${building.nombre_edificio}?`
  )
  
  if (!confirmed) return
  
  try {
    await api.delete(`/buildings/${building.id_edificio}`)
    showSuccess(`Edificio ${building.nombre_edificio} eliminado correctamente`)
    refetch() // Recargar datos
  } catch (error) {
    if (error.response?.data?.error === 'DEPENDENCIAS_ENCONTRADAS') {
      showWarning(
        'No se puede eliminar el edificio porque tiene pisos asociados'
      )
    } else {
      handleError(error)
    }
  }
}
```

### Formularios con React Hook Form

```jsx
const onSubmit = async (data) => {
  try {
    if (editId) {
      await api.put(`/buildings/${editId}`, data)
      showSuccess('Edificio actualizado correctamente')
    } else {
      await api.post('/buildings', data)
      showSuccess('Edificio creado correctamente')
    }
    handleClose()
    refetch()
  } catch (error) {
    // El error ya tiene un mensaje amigable del interceptor
    handleError(error)
  }
}
```

## 📝 Mejores Prácticas

### Backend

1. **Siempre usar logger en lugar de console.log**
2. **Incluir contexto relevante en los logs** (userId, requestId, etc.)
3. **No loguear información sensible** (contraseñas, tokens, etc.)
4. **Usar niveles de log apropiados**
5. **Dejar que los middleware manejen los errores** (no capturar todo)

### Frontend

1. **Siempre manejar errores de API**
2. **Mostrar mensajes específicos y accionables**
3. **Usar notificaciones de éxito para feedback positivo**
4. **No mostrar mensajes técnicos al usuario final**
5. **Manejar errores de red y timeout apropiadamente**

## 🔍 Troubleshooting

### Los logs no se crean

```bash
# Verificar permisos
ls -la apps/api/logs/

# Crear directorio si no existe
mkdir -p apps/api/logs/

# Verificar que Winston está instalado
cd apps/api && npm list winston
```

### Las notificaciones no aparecen

1. Verificar que `ErrorProvider` envuelve tu aplicación en `main.jsx`
2. Verificar que usas el hook `useError` o `useApiErrorHandler`
3. Revisar la consola del navegador para errores

### Los errores no tienen mensajes amigables

1. Verificar que el interceptor de API está configurado en `lib/api.js`
2. Verificar que el middleware de error está en `app.js`
3. Revisar que los errores del servidor incluyen `message` o `error`

## 📚 Documentación Completa

Para más información, consulta:
- `/docs/LOGS_Y_ERRORES.md` - Documentación completa del sistema
- `/apps/web/src/components/ExampleErrorHandling.jsx` - Ejemplos de uso
