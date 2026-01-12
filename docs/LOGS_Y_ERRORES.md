# Sistema de Logs y Manejo de Errores (RF-09, RF-10)

## Descripción General

Este documento describe el sistema de logs implementado en el backend y el manejo de errores en la interfaz de usuario para proporcionar una experiencia más robusta y facilitar la depuración técnica.

## RF-10: Sistema de Logs del Backend

### Características

El sistema de logs utiliza **Winston** como librería principal con las siguientes capacidades:

#### Niveles de Log
- **error**: Errores críticos que requieren atención inmediata
- **warn**: Advertencias que no detienen la ejecución pero requieren atención
- **info**: Información general sobre el funcionamiento del sistema
- **http**: Logs de peticiones y respuestas HTTP
- **debug**: Información detallada para depuración (solo en desarrollo)

#### Rotación de Archivos
Los logs se almacenan en archivos que rotan diariamente:
- `combined-YYYY-MM-DD.log`: Todos los logs
- `error-YYYY-MM-DD.log`: Solo errores
- `exceptions-YYYY-MM-DD.log`: Excepciones no capturadas
- `rejections-YYYY-MM-DD.log`: Promesas rechazadas no manejadas

Los archivos se mantienen por **30 días** y tienen un tamaño máximo de **20MB** antes de rotar.

### Ubicación de los Logs

```
apps/api/logs/
├── combined-2026-01-12.log
├── error-2026-01-12.log
├── exceptions-2026-01-12.log
└── rejections-2026-01-12.log
```

### Uso del Logger

#### Importación

```javascript
import logger from './utils/logger.js'
```

#### Métodos Básicos

```javascript
// Logs de información
logger.info('Usuario creado exitosamente', { userId: 123 })

// Logs de errores
logger.error('Error al conectar a la base de datos', { error: err.message })

// Logs de advertencia
logger.warn('Configuración faltante, usando valores por defecto')

// Logs HTTP (peticiones)
logger.http('GET /api/buildings', { statusCode: 200, responseTime: '15ms' })
```

#### Métodos Extendidos

```javascript
// Log de petición HTTP
logger.logRequest(req, 'Usuario solicitando datos')

// Log de respuesta HTTP
logger.logResponse(req, res, responseTime)

// Log de error con contexto de petición
logger.logError(error, req)

// Log de operación de base de datos
logger.logDatabaseOperation('CREATE', 'buildings', { 
  buildingId: 123,
  name: 'Edificio Central' 
})
```

### Middleware de Logging

#### Request Logger
Registra automáticamente todas las peticiones HTTP entrantes:

```javascript
import { requestLogger } from './middlewares/logger.middleware.js'
app.use(requestLogger)
```

#### Error Logger
Registra automáticamente todos los errores:

```javascript
import { errorLogger } from './middlewares/logger.middleware.js'
app.use(errorLogger)
```

### Formato de Logs

Los logs se almacenan en formato JSON para facilitar su análisis:

```json
{
  "level": "error",
  "message": "Error al procesar petición",
  "timestamp": "2026-01-12 13:50:24",
  "method": "POST",
  "url": "/api/buildings",
  "statusCode": 500,
  "stack": "Error: ...",
  "request": {
    "body": {...},
    "ip": "192.168.1.1"
  }
}
```

## RF-09: Manejo de Errores en la Interfaz

### Características

El sistema de manejo de errores en el frontend proporciona:
- **Notificaciones claras** y comprensibles para el usuario
- **Error Boundary** para capturar errores de React
- **Interceptores de API** para manejar errores HTTP
- **Context API** para manejo global de errores

### Componentes

#### 1. ErrorProvider
Proveedor de contexto global para mostrar notificaciones de error:

```jsx
import { ErrorProvider, useError } from './contexts/ErrorContext'

// En el componente raíz
<ErrorProvider>
  <App />
</ErrorProvider>

// En cualquier componente
const { showError, showSuccess, showWarning, showInfo } = useError()

// Mostrar error
showError('Ha ocurrido un error al guardar los datos')

// Mostrar éxito
showSuccess('Datos guardados correctamente')
```

#### 2. ErrorBoundary
Captura errores de React y muestra una interfaz amigable:

```jsx
import ErrorBoundary from './components/ErrorBoundary'

<ErrorBoundary>
  <App />
</ErrorBoundary>
```

#### 3. Interceptor de API
Maneja automáticamente errores de peticiones HTTP:

```javascript
// En lib/api.js
api.interceptors.response.use(
  response => response,
  error => {
    // Extrae mensaje amigable
    error.userMessage = getFriendlyMessage(error)
    return Promise.reject(error)
  }
)
```

### Mensajes de Error Amigables

El sistema traduce errores técnicos a mensajes comprensibles:

| Error Técnico | Mensaje para Usuario |
|--------------|---------------------|
| 401 Unauthorized | Su sesión ha expirado. Por favor inicie sesión nuevamente |
| 403 Forbidden | No tiene permisos para realizar esta acción |
| 404 Not Found | El recurso solicitado no fue encontrado |
| 500 Internal Server Error | Error interno del servidor. Por favor intente más tarde |
| Network Error | No se pudo conectar con el servidor. Verifique su conexión |
| CORS Error | Acceso no permitido desde este origen |
| File Too Large | El archivo es demasiado grande. Tamaño máximo: 10MB |
| Duplicate Entry | Ya existe un registro con estos datos |

### Uso en Componentes

#### Método 1: Hook personalizado

```jsx
import { useApiErrorHandler } from '../utils/errorHandler'

function MyComponent() {
  const handleError = useApiErrorHandler()
  
  const saveData = async () => {
    try {
      await api.post('/buildings', data)
    } catch (error) {
      handleError(error) // Muestra notificación automáticamente
    }
  }
}
```

#### Método 2: Context directo

```jsx
import { useError } from '../contexts/ErrorContext'

function MyComponent() {
  const { showError, showSuccess } = useError()
  
  const saveData = async () => {
    try {
      await api.post('/buildings', data)
      showSuccess('Edificio creado correctamente')
    } catch (error) {
      showError(error.userMessage || 'Error al crear edificio')
    }
  }
}
```

## Configuración

### Variables de Entorno

```bash
# Nivel de logs (development/production)
NODE_ENV=development

# Orígenes permitidos para CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Desarrollo vs Producción

#### Desarrollo
- Nivel de log: `debug`
- Logs en consola con colores
- Stack traces completos
- Detalles de errores en respuestas

#### Producción
- Nivel de log: `info`
- Solo logs en archivos
- Stack traces solo en logs
- Mensajes de error simplificados

## Monitoreo y Análisis

### Análisis de Logs

Los logs en formato JSON pueden ser analizados con herramientas como:

```bash
# Ver últimos errores
grep "error" apps/api/logs/error-*.log | tail -20

# Contar errores por tipo
cat apps/api/logs/error-*.log | jq -r '.name' | sort | uniq -c

# Ver peticiones lentas (>1000ms)
cat apps/api/logs/combined-*.log | grep "http" | jq 'select(.responseTime | tonumber > 1000)'
```

### Alertas Recomendadas

1. **Tasa de errores alta**: Más de 10 errores en 5 minutos
2. **Errores de base de datos**: Cualquier error de conexión
3. **Excepciones no capturadas**: Cualquier entrada en exceptions.log
4. **Peticiones lentas**: Tiempo de respuesta > 2 segundos

## Mejores Prácticas

### Backend

1. **Usar el logger en lugar de console.log**
   ```javascript
   // ❌ No hacer
   console.log('Usuario creado')
   
   // ✅ Hacer
   logger.info('Usuario creado', { userId: user.id })
   ```

2. **Incluir contexto en los logs**
   ```javascript
   logger.error('Error al guardar edificio', {
     buildingId: id,
     error: err.message,
     stack: err.stack
   })
   ```

3. **Usar niveles apropiados**
   - `error`: Solo para errores reales
   - `warn`: Para situaciones anómalas pero no críticas
   - `info`: Para eventos importantes del sistema
   - `debug`: Para información detallada de depuración

### Frontend

1. **Manejar todos los errores de API**
   ```javascript
   try {
     await api.post('/buildings', data)
   } catch (error) {
     handleError(error) // Siempre manejar errores
   }
   ```

2. **Mostrar mensajes específicos**
   ```javascript
   showError('No se pudo guardar el edificio. Verifique los datos e intente nuevamente')
   ```

3. **Usar notificaciones de éxito**
   ```javascript
   showSuccess('Edificio guardado correctamente')
   ```

## Solución de Problemas

### Los logs no se crean

1. Verificar permisos de escritura en `apps/api/logs/`
2. Verificar que Winston esté correctamente instalado
3. Revisar errores en la consola al iniciar el servidor

### Los errores no se muestran al usuario

1. Verificar que ErrorProvider esté envolviendo la aplicación
2. Revisar que el interceptor de API esté configurado
3. Verificar que los componentes usen useError o useApiErrorHandler

### Logs muy grandes

1. Ajustar maxFiles y maxSize en logger.js
2. Implementar rotación más agresiva
3. Configurar limpieza automática de logs antiguos

## Extensiones Futuras

1. **Integración con servicios externos**: Sentry, LogRocket, etc.
2. **Dashboard de logs**: Interfaz web para visualizar logs
3. **Alertas automáticas**: Notificaciones por email/Slack
4. **Análisis de métricas**: Estadísticas sobre errores y rendimiento
5. **Logs estructurados avanzados**: OpenTelemetry, correlación de trazas
