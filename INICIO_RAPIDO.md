# Guía Rápida de Migración a PostgreSQL

## ⚡ Inicio Rápido

### 1. Configurar Credenciales
Edita `apps/api/.env` y agrega tus credenciales:

```env
DB_HOST=tu_servidor_universidad.edu
DB_PORT=5432
DB_NAME=geolocalizacion
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_SSL=true
```

### 2. Probar Conexión
```bash
cd apps/api
npm run db:test
```

### 3. Crear Tablas
```bash
npm run db:setup
```

### 4. Migrar Datos (si tienes db.json)
```bash
npm run db:migrate
```

### 5. Iniciar Servidor
```bash
npm run dev
```

## 🔄 Cambiar a PostgreSQL

### Método 1: Reemplazar app.js (Recomendado)
```bash
cd apps/api/src
mv app.js app-json-backup.js
mv app-postgres.js app.js
npm run dev
```

### Método 2: Solo para pruebas
Modifica `apps/api/src/index.js` línea 2:
```javascript
import { createApp } from './app-postgres.js'
```

## 🌐 Desplegar en Vercel

1. **Configurar variables en Vercel:**
   - Ve a: Settings → Environment Variables
   - Agrega: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL

2. **Desplegar:**
   ```bash
   vercel --prod
   ```

## 🆘 Problemas Comunes

### No se conecta
```bash
# Verifica credenciales
npm run db:test

# Verifica que el servidor PostgreSQL esté corriendo
# Verifica firewall/VPN si es necesario
```

### Tablas no existen
```bash
# Ejecuta el setup
npm run db:setup
```

### Sin datos
```bash
# Migra desde JSON
npm run db:migrate
```

## 📋 Comandos Disponibles

```bash
npm run dev          # Iniciar servidor en desarrollo
npm run start        # Iniciar servidor en producción
npm run db:test      # Probar conexión a PostgreSQL
npm run db:setup     # Crear todas las tablas
npm run db:migrate   # Migrar datos desde db.json
```

## ✅ Verificación Final

Prueba estos endpoints:
```bash
curl http://localhost:4000/health
curl http://localhost:4000/buildings
curl http://localhost:4000/faculties
```

---

Para más detalles, consulta `MIGRACION_POSTGRESQL.md`
