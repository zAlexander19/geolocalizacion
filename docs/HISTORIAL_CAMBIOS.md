# Historial de Cambios - Sistema de Auditoría

Este módulo registra automáticamente todos los cambios realizados por los administradores en el sistema.

## 📋 Características

- **Registro automático** de todas las operaciones: crear, modificar y eliminar
- **Entidades monitoreadas**: Edificios, Pisos, Salas, Baños y Facultades
- **Información capturada**:
  - Email del administrador que realizó el cambio
  - Fecha y hora exacta del cambio
  - Tipo de acción (crear, modificar, eliminar)
  - Datos completos antes y después del cambio (para modificaciones)
  - Datos del elemento creado o eliminado

## 🚀 Instalación

### 1. Actualizar la Base de Datos

Ejecuta el siguiente comando para crear la tabla de auditoría:

```bash
cd apps/api
psql -U [tu_usuario] -d geolocalizacion -f src/db/migrations/001_add_audit_logs.sql
```

O desde pgAdmin/DBeaver, ejecuta el script SQL ubicado en:
`apps/api/src/db/migrations/001_add_audit_logs.sql`

### 2. Reiniciar el Servidor

Después de actualizar la base de datos, reinicia el servidor del API:

```bash
cd apps/api
npm run dev
```

## 📱 Uso

### Acceder al Historial

1. Inicia sesión como administrador
2. En el menú lateral, haz clic en **"Historial de Cambios"**
3. Verás una lista completa de todos los cambios realizados

### Filtrar Registros

Puedes filtrar el historial por:
- **Acción**: Crear, Modificar, Eliminar
- **Tipo de Entidad**: Edificio, Piso, Sala, Baño, Facultad
- **Email del Usuario**: Filtra por el email del administrador

### Ver Detalles

Haz clic en el icono de "Ver Detalles" (👁️) para ver:
- Información completa del cambio
- Datos anteriores y nuevos (en modificaciones)
- Comparación visual de los cambios en formato JSON

## 🔧 API Endpoints

### Obtener historial de auditoría
```
GET /audit-logs
```

**Query Parameters:**
- `userEmail` (opcional): Filtrar por email del usuario
- `action` (opcional): Filtrar por acción (crear, modificar, eliminar)
- `entityType` (opcional): Filtrar por tipo de entidad
- `limit` (opcional): Número de registros (default: 100)
- `offset` (opcional): Offset para paginación (default: 0)

**Ejemplo:**
```
GET /audit-logs?action=eliminar&entityType=sala&limit=50
```

### Obtener un registro específico
```
GET /audit-logs/:id
```

## 📊 Estructura de Datos

### Tabla `audit_logs`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_audit | SERIAL | ID único del registro |
| user_email | VARCHAR(255) | Email del usuario que realizó el cambio |
| action | VARCHAR(50) | Tipo de acción: 'crear', 'modificar', 'eliminar' |
| entity_type | VARCHAR(50) | Tipo de entidad afectada |
| entity_id | VARCHAR(50) | ID de la entidad |
| entity_name | VARCHAR(255) | Nombre de la entidad |
| changes | JSONB | Detalles de los cambios en formato JSON |
| created_at | TIMESTAMP | Fecha y hora del cambio |

### Formato del campo `changes`

**Para creación:**
```json
{
  "nuevo": {
    "id_edificio": 1,
    "nombre_edificio": "Edificio Central",
    // ... otros campos
  }
}
```

**Para modificación:**
```json
{
  "anterior": {
    "nombre_edificio": "Edificio A",
    "descripcion": "Descripción antigua"
  },
  "nuevo": {
    "nombre_edificio": "Edificio Central",
    "descripcion": "Nueva descripción"
  }
}
```

**Para eliminación:**
```json
{
  "eliminado": {
    "id_sala": 5,
    "nombre_sala": "Sala 101",
    // ... otros campos
  }
}
```

## 🔐 Seguridad

- Solo usuarios autenticados pueden acceder al historial
- El sistema captura automáticamente el email del usuario desde el token JWT
- Los registros no pueden ser modificados ni eliminados (inmutabilidad)

## 📝 Notas Importantes

1. **Rendimiento**: La tabla está indexada para consultas rápidas por usuario, entidad y fecha
2. **Almacenamiento**: Los datos JSON se almacenan en formato JSONB para consultas eficientes
3. **Retención**: Por defecto, todos los registros se mantienen indefinidamente
4. **Privacidad**: Los registros incluyen el email del administrador que realizó el cambio

## 🐛 Solución de Problemas

### Error: Tabla audit_logs no existe
- Ejecuta el script de migración SQL

### No se registran cambios
- Verifica que el servidor esté actualizado
- Revisa los logs del servidor para errores

### No aparecen datos en el historial
- Asegúrate de estar autenticado
- Verifica que haya cambios registrados en la base de datos:
  ```sql
  SELECT COUNT(*) FROM audit_logs;
  ```

## 🔄 Mantenimiento

### Limpiar registros antiguos (opcional)
Si necesitas limpiar registros muy antiguos:

```sql
-- Eliminar registros de más de 1 año
DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '1 year';
```

⚠️ **Advertencia**: Esta operación es irreversible. Considera hacer un respaldo antes.
