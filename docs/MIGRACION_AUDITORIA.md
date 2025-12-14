# Migración del Sistema de Auditoría

## Resumen
Sistema de auditoría actualizado para usar IDs de usuario en lugar de emails, integrando con la tabla `usuarios`.

## Cambios Realizados

### 1. Base de Datos
- **Tabla `audit_logs`**:
  - ✅ Agregada columna `id_usuario INTEGER`
  - ✅ Foreign key a `usuarios(id_usuario)` con `ON DELETE SET NULL`
  - ✅ Índice `idx_audit_logs_usuario` para consultas rápidas
  - ✅ Columna `user_email` mantenida para compatibilidad con logs antiguos

### 2. Servicio de Auditoría
**Archivo**: `apps/api/src/services/audit.service.js`

```javascript
// Antes:
logAudit({ userEmail, action, entityType, entityId, entityName, changes })

// Ahora:
logAudit({ userId, userEmail, action, entityType, entityId, entityName, changes })
```

- `userId`: ID del usuario (obligatorio para nuevos logs)
- `userEmail`: Email (opcional, legacy)

### 3. Utilidad de Autenticación
**Archivo**: `apps/api/src/utils/auth-helper.js`

Nueva función `getUserFromRequest()`:
```javascript
// Extrae datos del usuario autenticado desde req.user
const user = getUserFromRequest(req)
// Retorna: { userId: number|null, email: string|null }
```

### 4. Actualización de Logs en app.js
**Actualizadas 14 llamadas** a `logAudit()` en:
- Edificios (crear, modificar, eliminar)
- Pisos (crear, modificar, eliminar)
- Salas (crear, modificar, eliminar)
- Facultades (crear, modificar, eliminar)
- Restaurar elementos
- Eliminar permanentemente

**Patrón actualizado**:
```javascript
// Antes:
await logAudit({
  userEmail: getUserEmailFromRequest(req),
  action: 'crear',
  ...
})

// Ahora:
const user = getUserFromRequest(req)
await logAudit({
  userId: user.userId,
  userEmail: user.email,
  action: 'crear',
  ...
})
```

## Compatibilidad
- ✅ Logs antiguos mantienen su `user_email`
- ✅ Logs nuevos usan `id_usuario` + `user_email` opcional
- ✅ Foreign key con `ON DELETE SET NULL` (si se elimina un usuario, sus logs quedan con NULL)

## Ejecutar Migración
```bash
cd apps/api
node src/db/migrate-audit-logs.js
```

## Beneficios
1. **Integridad referencial**: Los logs están vinculados a usuarios reales
2. **Consultas mejoradas**: Posible unir audit_logs con usuarios para obtener más información
3. **Escalabilidad**: Si un usuario cambia su email, los logs históricos no se pierden
4. **Seguridad**: IDs en lugar de emails (información menos sensible en logs)

## Verificación
Para verificar que funciona correctamente:
1. Crear/editar/eliminar un edificio, piso, sala o facultad
2. Consultar la tabla `audit_logs`
3. Verificar que `id_usuario` contiene el ID del usuario autenticado

```sql
SELECT 
  a.*, 
  u.nombre, 
  u.email 
FROM audit_logs a
LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
ORDER BY a.timestamp DESC
LIMIT 10;
```
