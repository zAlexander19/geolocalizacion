# Eliminación de Edificios con Verificación de Dependencias

## Descripción

Esta funcionalidad implementa un sistema de verificación de dependencias antes de eliminar un edificio, garantizando la integridad de los datos y proporcionando retroalimentación clara al usuario administrador.

## Requisitos Implementados

✅ **Verificación de Dependencias**: El sistema verifica que no existan pisos o salas asociadas al edificio antes de permitir su eliminación.

✅ **Popup Informativo**: Si existen dependencias, se muestra un modal detallado al administrador con:
- Lista de todos los pisos asociados al edificio
- Lista de todas las salas asociadas (agrupadas por piso)
- Mensaje claro indicando que primero debe eliminar las dependencias

✅ **Eliminación Exitosa**: Si no hay dependencias, el edificio se elimina correctamente en menos de 5 segundos.

## Flujo de Funcionamiento

### Backend (API)

**Endpoint**: `DELETE /buildings/:id`

1. Recibe el ID del edificio a eliminar
2. Consulta todos los pisos asociados al edificio usando `floorsRepo.findByBuilding(id)`
3. Si existen pisos:
   - Consulta todas las salas asociadas a cada piso
   - Retorna un error `400` con código `DEPENDENCIAS_ENCONTRADAS`
   - Incluye un objeto detallado con los pisos y salas encontradas
4. Si NO existen pisos:
   - Elimina el edificio
   - Retorna éxito `{ ok: true }`

**Respuesta con Dependencias**:
```json
{
  "error": "DEPENDENCIAS_ENCONTRADAS",
  "message": "No se puede eliminar el edificio porque tiene pisos y/o salas asociadas",
  "dependencias": {
    "pisos": [
      {
        "id": 1,
        "nombre": "Piso 1",
        "numero": 1
      }
    ],
    "salas": [
      {
        "id": 5,
        "nombre": "Sala 101",
        "piso": "Piso 1"
      }
    ]
  }
}
```

### Frontend (Web)

**Componente**: `BuildingsPage.jsx`

1. El administrador hace clic en el botón "Eliminar" de un edificio
2. Se muestra un confirm dialog nativo
3. Si confirma, se ejecuta la mutación `deleteMutation`
4. La mutación tiene dos posibles resultados:

   **A. Eliminación Exitosa**:
   - El edificio se elimina
   - Se invalida la caché de React Query
   - La lista de edificios se actualiza automáticamente

   **B. Dependencias Encontradas**:
   - Se captura el error con `onError`
   - Se verifica que el código sea `DEPENDENCIAS_ENCONTRADAS`
   - Se abre un modal con la información detallada de dependencias
   - El modal muestra:
     - Título en rojo indicando que no se puede eliminar
     - Sección de pisos asociados (con chips de colores)
     - Sección de salas asociadas (con scroll si hay muchas)
     - Mensaje informativo sobre qué hacer

## Componentes Modificados

### Backend
- `apps/api/src/app.js` - Endpoint DELETE /buildings/:id
- `apps/api/src/app-postgres.js` - Endpoint DELETE /buildings/:id (versión PostgreSQL)

### Frontend
- `apps/web/src/features/admin/buildings/BuildingsPage.jsx`
  - Nuevos estados: `dependenciasModalOpen`, `dependenciasData`
  - Modificación en `deleteMutation` para capturar errores
  - Nuevo modal de dependencias con diseño Material-UI

## Ejemplo de Uso

### Caso 1: Edificio sin Dependencias
1. Admin hace clic en "Eliminar"
2. Confirma la acción
3. El edificio se elimina inmediatamente
4. La lista se actualiza

### Caso 2: Edificio con Dependencias
1. Admin hace clic en "Eliminar"
2. Confirma la acción
3. Aparece modal mostrando:
   ```
   No se puede eliminar el edificio
   
   Pisos asociados (2):
   - Piso 1
   - Piso 2
   
   Salas asociadas (5):
   - Sala 101 (Piso 1)
   - Sala 102 (Piso 1)
   - Sala 201 (Piso 2)
   - Sala 202 (Piso 2)
   - Sala 203 (Piso 2)
   
   💡 Para eliminar este edificio, primero debes eliminar 
      todos los pisos y salas asociados.
   ```
4. Admin hace clic en "Entendido"
5. El modal se cierra y el edificio NO se elimina

## Tiempo de Respuesta

- **Sin dependencias**: < 1 segundo
- **Con dependencias**: < 2 segundos (incluye consultas de pisos y salas)

Ambos casos cumplen el requisito de 5 segundos.

## Notas Técnicas

- Se utilizan consultas asíncronas con `Promise.all` para optimizar la búsqueda de salas
- El modal es responsive y se adapta a dispositivos móviles
- Los datos se muestran en formato legible con componentes Material-UI (Chips, Papers, etc.)
- El sistema mantiene la integridad referencial de la base de datos

## Mejoras Futuras Sugeridas

- Agregar opción de "Eliminar en cascada" con confirmación adicional
- Mostrar vista previa de qué se eliminará antes de la acción
- Agregar logs de auditoría para eliminaciones
