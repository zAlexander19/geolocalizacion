# Migración a PostgreSQL - Guía Completa

## 📋 Requisitos Previos

- Acceso al servidor PostgreSQL de la universidad
- pgAdmin instalado y configurado
- Node.js y npm instalados
- Credenciales de la base de datos

## 🚀 Pasos de Migración

### 1. Configurar Variables de Entorno

Edita el archivo `apps/api/.env` con tus credenciales:

```env
# PostgreSQL Configuration
DB_HOST=tu_servidor_universidad.edu
DB_PORT=5432
DB_NAME=geolocalizacion
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_SSL=true
```

### 2. Crear la Base de Datos

#### Opción A: Usando pgAdmin

1. Abre pgAdmin
2. Conecta al servidor de la universidad
3. Click derecho en "Databases" → "Create" → "Database"
4. Nombre: `geolocalizacion`
5. Owner: Tu usuario
6. Click "Save"

#### Opción B: Usando SQL

```sql
CREATE DATABASE geolocalizacion;
```

### 3. Crear el Schema (Tablas)

#### Opción A: Usando pgAdmin

1. En pgAdmin, selecciona la base de datos `geolocalizacion`
2. Click en "Tools" → "Query Tool"
3. Copia y pega el contenido de `apps/api/src/db/schema.sql`
4. Click en "Execute/Run" (▶️)

#### Opción B: Usando psql (línea de comandos)

```bash
psql -h tu_servidor_universidad.edu -U tu_usuario -d geolocalizacion -f apps/api/src/db/schema.sql
```

### 4. Migrar los Datos Existentes

Si ya tienes datos en el archivo JSON (`db.json`):

```bash
cd apps/api
node src/db/migrate.js
```

Este script:
- Lee los datos del archivo JSON
- Los inserta en PostgreSQL
- Mantiene los IDs originales
- Actualiza las secuencias automáticamente

### 5. Cambiar al Nuevo Sistema

#### Opción A: Reemplazar app.js (Recomendado para producción)

```bash
# Hacer backup del archivo actual
cp apps/api/src/app.js apps/api/src/app-json-backup.js

# Reemplazar con la versión PostgreSQL
cp apps/api/src/app-postgres.js apps/api/src/app.js
```

#### Opción B: Modificar index.js temporalmente (Para pruebas)

Edita `apps/api/src/index.js`:

```javascript
import 'dotenv/config'
import { createApp } from './app-postgres.js'  // Cambiar aquí

const app = createApp()
const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`)
})
```

### 6. Probar Localmente

```bash
# En el directorio raíz del proyecto
npm run dev
```

Verifica que veas el mensaje:
```
✅ Connected to PostgreSQL database
API listening on http://localhost:4000
```

### 7. Configurar para Vercel (Despliegue en la Nube)

#### A. Agregar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega estas variables:

```
DB_HOST = tu_servidor_universidad.edu
DB_PORT = 5432
DB_NAME = geolocalizacion
DB_USER = tu_usuario
DB_PASSWORD = tu_password
DB_SSL = true
ALLOWED_ORIGINS = https://tu-dominio.vercel.app,http://localhost:5173
```

#### B. Verificar vercel.json

Asegúrate que `vercel.json` tenga:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "apps/api/src/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "apps/web/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "apps/api/src/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "apps/web/$1"
    }
  ]
}
```

#### C. Desplegar

```bash
vercel --prod
```

O usa el deploy automático desde GitHub.

## 🔍 Verificación

### Probar Endpoints

```bash
# Health check
curl http://localhost:4000/health

# Listar edificios
curl http://localhost:4000/buildings

# Listar pisos de un edificio
curl http://localhost:4000/buildings/1/floors
```

### Verificar Datos en pgAdmin

```sql
-- Ver todos los edificios
SELECT * FROM buildings;

-- Ver conteo de registros
SELECT 
    (SELECT COUNT(*) FROM buildings) as edificios,
    (SELECT COUNT(*) FROM floors) as pisos,
    (SELECT COUNT(*) FROM rooms) as salas,
    (SELECT COUNT(*) FROM bathrooms) as banos,
    (SELECT COUNT(*) FROM faculties) as facultades;
```

## 🔐 Seguridad

1. **Nunca subas el archivo .env a Git**
   - Ya está en `.gitignore`

2. **Usar SSL en producción**
   - `DB_SSL=true` está configurado

3. **Credenciales seguras**
   - Usa contraseñas fuertes
   - No compartas credenciales

## 🆘 Solución de Problemas

### Error: "Connection refused"
- Verifica que el servidor PostgreSQL esté corriendo
- Verifica el host y puerto en `.env`
- Verifica que tu IP tenga acceso al servidor

### Error: "Authentication failed"
- Verifica usuario y contraseña en `.env`
- Verifica que el usuario tenga permisos en la base de datos

### Error: "SSL connection required"
- Agrega `DB_SSL=true` en `.env`

### Error: "relation does not exist"
- No has ejecutado el schema.sql
- Vuelve al paso 3

### Datos no aparecen después de migrar
- Verifica que el archivo db.json exista y tenga datos
- Ejecuta el script de migración nuevamente
- Revisa los logs para errores

## 📊 Comparación: JSON vs PostgreSQL

| Característica | JSON (Antes) | PostgreSQL (Ahora) |
|----------------|--------------|-------------------|
| Rendimiento | ❌ Lento con muchos datos | ✅ Rápido incluso con millones de registros |
| Concurrencia | ❌ Problemas con múltiples usuarios | ✅ Maneja miles de usuarios simultáneos |
| Integridad | ❌ Sin validación automática | ✅ Constraints y validaciones |
| Backup | ❌ Manual | ✅ Automático del servidor |
| Relaciones | ❌ Manual | ✅ Foreign keys automáticas |
| Búsquedas | ❌ Lentas | ✅ Indexadas y optimizadas |

## 📝 Comandos Útiles

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Ejecutar migración
node src/db/migrate.js

# Ver logs de Vercel
vercel logs

# Desplegar a producción
vercel --prod
```

## 🔄 Rollback (Volver a JSON)

Si necesitas volver al sistema anterior:

```bash
# Restaurar app.js original
cp apps/api/src/app-json-backup.js apps/api/src/app.js

# Reiniciar servidor
npm run dev
```

## 📚 Recursos Adicionales

- [Documentación PostgreSQL](https://www.postgresql.org/docs/)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
- [Node.js pg Module](https://node-postgres.com/)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

## ✅ Checklist de Migración

- [ ] Variables de entorno configuradas
- [ ] Base de datos creada
- [ ] Schema ejecutado (tablas creadas)
- [ ] Datos migrados desde JSON
- [ ] Pruebas locales exitosas
- [ ] Variables configuradas en Vercel
- [ ] Desplegado a producción
- [ ] Endpoints verificados en producción
- [ ] Backup del sistema anterior guardado

---

**¡Migración completa!** 🎉

Tu sistema ahora usa PostgreSQL y está listo para escalar.
