# Instrucciones para crear la tabla de Rutas

## Tabla de Rutas para OSM

Para almacenar las rutas importadas desde archivos OSM (caminos, senderos, pasillos), necesitas ejecutar el siguiente script SQL en tu base de datos PostgreSQL.

### Pasos para ejecutar:

1. Abre **DBeaver** y conéctate a tu base de datos PostgreSQL
2. Abre el archivo `apps/api/src/db/routes-schema.sql`
3. Selecciona todo el contenido del archivo
4. Ejecuta el script (Ctrl+Enter o botón "Execute SQL Script")

### ¿Qué hace este script?

El script crea la tabla `rutas` con los siguientes campos:

- **id_ruta**: ID único de la ruta (auto-incremental)
- **osm_id**: ID del elemento en OpenStreetMap
- **nombre**: Nombre de la ruta o camino
- **tipo**: Tipo de ruta (footway, path, corridor, highway, etc.)
- **coordinates**: Array JSON con las coordenadas que trazan la ruta
- **superficie**: Tipo de superficie (asfalto, concreto, grava, etc.)
- **ancho**: Ancho del camino en metros
- **acceso**: Tipo de acceso (público, privado, etc.)
- **interior**: Si es un pasillo/ruta interior de un edificio
- **nivel**: Piso o nivel donde está la ruta (para rutas interiores)
- **estado**: Si la ruta está activa
- **created_from_osm**: Si fue importada desde OSM
- **eliminado**: Para soft delete

### Características adicionales:

- ✅ Índices para búsquedas rápidas
- ✅ Trigger para actualizar automáticamente `updated_at`
- ✅ Soporte para soft delete
- ✅ Índice GIN para búsquedas en coordenadas JSON

### Después de crear la tabla:

Una vez creada la tabla, ya podrás usar la funcionalidad de importación OSM con la opción "Solo rutas" o "Ambos" para importar las rutas desde tu archivo OSM.

### Verificar que la tabla se creó correctamente:

```sql
-- Ver la estructura de la tabla
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'rutas';

-- Ver los índices creados
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'rutas';
```

### Funcionalidad de importación:

Después de ejecutar este script, en la interfaz web podrás:

1. Ir a **Admin → Importar OSM**
2. Seleccionar **"Solo rutas"** en el tipo de importación
3. Configurar las opciones de fusión
4. Importar las rutas desde tu archivo OSM

Las rutas se almacenarán con toda su información geométrica (trazado completo de coordenadas) y metadatos (tipo, superficie, ancho, etc.).
