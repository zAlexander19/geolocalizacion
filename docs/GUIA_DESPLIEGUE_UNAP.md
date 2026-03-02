# Guía de Despliegue - Geo-Campus (Infraestructura UNAP)

Esta guía detalla el proceso para desplegar la plataforma Geo-Campus en la infraestructura de servidores de la Universidad Arturo Prat.

## 1. Arquitectura y Detalles de Conexión

### Servidores
- **Aplicación (Web + API):** `172.19.82.205` (Rocky Linux 10)
- **Base de Datos:** `172.19.82.207` (PostgreSQL)

### Accesos
- **SSH:** Puerto `2200`
- **Usuario:** `geocampus`
- **Directorio de Despliegue:** `/home/geocampus/geocampus`

## 2. Preparación del Entorno (Local)

Antes de realizar el despliegue, asegúrese de tener configurado lo siguiente en su máquina local:

1. **Cliente SSH/SCP:** Herramienta para conectar y transferir archivos (OpenSSH en Windows/Linux/Mac).
2. **Node.js:** Para construir el frontend localmente antes de subirlo.

## 3. Configuración de Variables de Entorno

**API (.env):**
Cree o modifique el archivo `/home/geocampus/geocampus/apps/api/.env` en el servidor con los siguientes valores:

```env
PORT=4000
DB_HOST=172.19.82.207
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=AqN65xZ31
DB_NAME=geocampus
NODE_ENV=production
# Agregue otras claves como JWT_SECRET o CLOUDINARY_URL si son necesarias
```

**Web (.env.production):**
Asegúrese de que el frontend apunte a la API correcta al construir:

```env
VITE_API_URL=https://api-geocampus.unap.cl
```

## 4. Proceso de Despliegue (Manual)

### Paso 1: Construcción del Frontend
Compile la aplicación React para producción en su máquina local:

```bash
cd apps/web
npm install
npm run build
# Esto generará la carpeta 'dist'
```

### Paso 2: Transferencia de Archivos
Utilice SCP para subir los archivos al servidor `172.19.82.205`.

**Subir API:**
```bash
# Excluya node_modules, logs, upload
scp -P 2200 -r apps/api/src apps/api/package.json geocampus@172.19.82.205:/home/geocampus/geocampus/apps/api/
```

**Subir Frontend (Compilado):**
```bash
# Suba el contenido de dist a la carpeta web
scp -P 2200 -r apps/web/dist/* geocampus@172.19.82.205:/home/geocampus/geocampus/apps/web/
```

### Paso 3: Instalación y Reinicio en el Servidor

Conéctese al servidor:
```bash
ssh -p 2200 geocampus@172.19.82.205
```

Ejecute los comandos de actualización:

```bash
# 1. Actualizar dependencias de API
cd /home/geocampus/geocampus/apps/api
npm install --production

# 2. Migraciones de Base de Datos (si hay cambios)
npm run db:migrate 

# 3. Reiniciar el proceso PM2
pm2 reload api-geocampus || pm2 start src/start.js --name "api-geocampus"
pm2 save
```

## 5. Configuración de Nginx (Referencia)

Asegúrese de que la configuración de Nginx en `/etc/nginx/conf.d/geocampus.conf` (o similar) incluya:

```nginx
# Frontend
server {
    listen 80;
    server_name geocampus.unap.cl;
    root /home/geocampus/geocampus/apps/web;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# API
server {
    listen 80;
    server_name api-geocampus.unap.cl;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 6. Verificación

1. Acceda a `http://geocampus.unap.cl` y verifique que carga la interfaz.
2. Acceda a `http://api-geocampus.unap.cl/health` (o un endpoint público) para verificar la API.
3. Revise logs si hay errores: `pm2 logs api-geocampus`.
