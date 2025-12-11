# Módulo de Estadísticas de Uso

## Descripción
Sistema para generar estadísticas de uso que registra la frecuencia de consultas y elementos más buscados.

## Instalación

### 1. Crear la tabla de estadísticas en PostgreSQL

Ejecuta el siguiente script SQL en tu base de datos:

```sql
-- Ejecutar en tu base de datos PostgreSQL
\i apps/api/src/db/statistics-schema.sql
```

O copia y pega el contenido del archivo `apps/api/src/db/statistics-schema.sql` en tu cliente SQL.

### 2. Reiniciar el servidor API

```bash
cd apps/api
npm run dev
```

### 3. Acceder al módulo

1. Inicia sesión como administrador
2. Ve a `/admin/estadisticas`

## Funcionalidades

### Para Usuarios (Automático)
- **Registro transparente**: Cada vez que un usuario hace clic en "Ver más" en un resultado de búsqueda, se registra automáticamente la consulta
- **Sin impacto**: El registro es asíncrono y no afecta la experiencia del usuario

### Para Administradores

#### Dashboard de Estadísticas
- **Total de búsquedas**: Contador general de todas las consultas
- **Búsquedas por tipo**: Distribución entre salas, edificios, baños y facultades
- **Cobertura de registros**: Porcentaje de registros capturados (debe ser ≥95%)

#### Top Rankings
- **Top 10 Salas más buscadas**: Las salas con mayor frecuencia de consultas
- **Top 10 Edificios más buscados**: Los edificios más consultados
- **Términos más buscados**: Palabras clave más utilizadas en las búsquedas

#### Gráficos y Análisis
- **Búsquedas por día**: Últimos 30 días de actividad
- **Búsquedas por hora**: Patrones de uso durante el día
- **Distribución por tipo**: Visualización porcentual de tipos de búsqueda

#### Filtros
- **Por fecha**: Filtrar estadísticas entre fechas específicas
- **Exportar CSV**: Descargar reporte completo en formato CSV

## API Endpoints

### Público
- `POST /statistics/log` - Registrar una búsqueda (llamado automáticamente desde el frontend)

### Administradores (Requiere autenticación)
- `GET /statistics/summary` - Obtener resumen de estadísticas
- `GET /statistics/report` - Obtener reporte completo con porcentaje de cobertura
- `GET /statistics/export` - Exportar datos en CSV

## Criterios de Aceptación

✅ El sistema registra al menos el 95% de las consultas realizadas
✅ Los administradores pueden acceder al módulo de estadísticas
✅ Se genera un reporte con los datos de consultas
✅ Se muestran las salas y elementos más buscados
✅ Exportación de datos en formato CSV

## Datos Registrados

Para cada búsqueda se almacena:
- Tipo de búsqueda (sala, edificio, baño, facultad, todo)
- Término de búsqueda ingresado
- Tipo de resultado seleccionado
- ID y nombre del resultado
- Ubicación del usuario (lat/lng)
- Dirección IP
- User Agent
- Fecha y hora de la consulta

## Seguridad

- Las rutas de estadísticas están protegidas con autenticación JWT
- Solo los usuarios con rol 'admin' o 'super-admin' pueden acceder
- Los datos de ubicación del usuario se registran de forma anónima
- La ruta de registro (`/statistics/log`) es pública para permitir el registro desde el frontend

## Notas Técnicas

- Base de datos: PostgreSQL
- Backend: Node.js + Express
- Frontend: React + Material-UI
- Visualización: Componentes nativos de MUI
- Consultas optimizadas con índices en PostgreSQL
