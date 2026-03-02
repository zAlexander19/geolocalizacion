# 🚀 Guía de Despliegue - GeoCampus
## Infraestructura Universidad UNAP

---

## 📋 Tabla de Contenidos
1. [Arquitectura de Servidores](#arquitectura-de-servidores)
2. [Instalación de Dependencias](#instalación-de-dependencias)
3. [Configuración de Base de Datos](#configuración-de-base-de-datos)
4. [Despliegue del Backend](#despliegue-del-backend)
5. [Despliegue del Frontend](#despliegue-del-frontend)
6. [Configuración de CORS](#configuración-de-cors)
7. [Configuración de Nginx](#configuración-de-nginx)
8. [Gestión con PM2](#gestión-con-pm2)
9. [Verificación y Troubleshooting](#verificación-y-troubleshooting)

---

## 🖥️ Arquitectura de Servidores

### Servidor 1: Backend (API)
- **IP**: 172.19.82.205
- **Puerto**: 4000
- **Dominio**: api-geocampus.unap.cl
- **SO**: Rocky Linux

### Servidor 2: Frontend (Web)
- **IP**: 172.19.82.206
- **Puerto**: 80/443
- **Dominio**: geocampus.unap.cl
- **SO**: Rocky Linux

### Servidor 3: Base de Datos
- **IP**: 172.19.82.207
- **Puerto**: 5432
- **DBMS**: PostgreSQL 12+
- **SO**: Rocky Linux

---

## 📦 Instalación de Dependencias

### En el Servidor Backend (172.19.82.205)

```bash
# Actualizar el sistema
sudo dnf update -y

# Instalar Node.js 18
sudo dnf module enable nodejs:18 -y
sudo dnf install nodejs -y

# Verificar la instalación
node --version  # Debe mostrar v18.x.x
npm --version

# Instalar PM2 globalmente (gestor de procesos)
sudo npm install -g pm2

# Instalar Git (si no está instalado)
sudo dnf install git -y
```

### En el Servidor Frontend (172.19.82.206)

```bash
# Actualizar el sistema
sudo dnf update -y

# Instalar Nginx
sudo dnf install nginx -y

# Habilitar e iniciar Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx

# Instalar Node.js 18 (necesario para el build)
sudo dnf module enable nodejs:18 -y
sudo dnf install nodejs -y
```

### En el Servidor de Base de Datos (172.19.82.207)

```bash
# Actualizar el sistema
sudo dnf update -y

# Instalar PostgreSQL 12 o superior
sudo dnf install postgresql-server postgresql-contrib -y

# Inicializar la base de datos
sudo postgresql-setup --initdb

# Habilitar e iniciar PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql
```

---

## 🗄️ Configuración de Base de Datos

### En el Servidor de Base de Datos (172.19.82.207)

```bash
# Cambiar al usuario postgres
sudo -i -u postgres

# Crear la base de datos
createdb geolocalizacion

# Acceder a PostgreSQL
psql

# Configurar la contraseña del usuario postgres
ALTER USER postgres WITH PASSWORD 'AqN65xZ31';

# Salir de PostgreSQL
\q
exit
```

### Configurar acceso remoto

```bash
# Editar el archivo de configuración de PostgreSQL
sudo nano /var/lib/pgsql/data/postgresql.conf

# Buscar y modificar la línea:
listen_addresses = '*'  # Escuchar en todas las interfaces

# Editar el archivo pg_hba.conf para permitir conexiones desde el servidor backend
sudo nano /var/lib/pgsql/data/pg_hba.conf

# Agregar esta línea al final del archivo:
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    geolocalizacion postgres        172.19.82.205/32        md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### Configurar el firewall

```bash
# Permitir conexiones PostgreSQL en el firewall
sudo firewall-cmd --permanent --add-port=5432/tcp
sudo firewall-cmd --reload
```

---

## 🔧 Despliegue del Backend

### En el Servidor Backend (172.19.82.205)

#### 1. Clonar el repositorio

```bash
# Crear directorio para la aplicación
sudo mkdir -p /var/www/geocampus
sudo chown $USER:$USER /var/www/geocampus

# Clonar el repositorio (reemplazar con tu repositorio)
cd /var/www/geocampus
git clone <URL_DE_TU_REPOSITORIO> .

# O si ya tienes los archivos, subirlos con SCP desde tu máquina local:
# scp -r ./geolocalizacion usuario@172.19.82.205:/var/www/geocampus/
```

#### 2. Configurar el archivo .env

```bash
cd /var/www/geocampus/apps/api

# Copiar el archivo de configuración de producción
cp .env.production .env

# Editar si es necesario (las credenciales ya están configuradas)
nano .env
```

#### 3. Instalar dependencias y ejecutar migraciones

```bash
# Instalar dependencias
npm install

# Ejecutar las migraciones de la base de datos
npm run db:setup
npm run db:migrate

# Crear usuarios iniciales (si es necesario)
npm run db:create-usuarios
```

#### 4. Iniciar con PM2

```bash
# Iniciar la aplicación con PM2
pm2 start src/start.js --name geocampus-api

# Guardar la configuración de PM2
pm2 save

# Configurar PM2 para iniciarse al arrancar el sistema
pm2 startup

# Verificar que esté corriendo
pm2 status
pm2 logs geocampus-api
```

#### 5. Configurar el firewall

```bash
# Permitir el puerto 4000 (solo si se accede directamente, no recomendado)
# Con Nginx como proxy, no es necesario exponer este puerto externamente

# Permitir HTTP y HTTPS para Nginx
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 🎨 Despliegue del Frontend

### En el Servidor Frontend (172.19.82.206)

#### 1. Preparar el build del frontend

**Opción A: Compilar en tu máquina local**

```bash
# En tu máquina de desarrollo
cd apps/web

# Configurar la URL de la API
# Editar el archivo .env o vite.config.js para apuntar a la API de producción
echo "VITE_API_URL=https://api-geocampus.unap.cl" > .env.production

# Compilar para producción
npm run build

# Subir el build al servidor
scp -r dist/ usuario@172.19.82.206:/tmp/geocampus-dist/
```

**Opción B: Compilar en el servidor**

```bash
# En el servidor frontend
cd /var/www
git clone <URL_DE_TU_REPOSITORIO> geocampus
cd geocampus/apps/web

# Configurar la URL de la API
echo "VITE_API_URL=https://api-geocampus.unap.cl" > .env.production

# Instalar dependencias y compilar
npm install
npm run build
```

#### 2. Configurar el directorio de Nginx

```bash
# Crear directorio para el frontend
sudo mkdir -p /var/www/geocampus/dist

# Copiar los archivos del build
sudo cp -r dist/* /var/www/geocampus/dist/

# Configurar permisos
sudo chown -R nginx:nginx /var/www/geocampus
sudo chmod -R 755 /var/www/geocampus
```

---

## 🔒 Configuración de CORS

### Explicación de CORS en Express

El archivo `apps/api/src/app.js` ya tiene configuración de CORS implementada. La configuración utiliza la variable de entorno `ALLOWED_ORIGINS` para definir qué dominios pueden acceder a la API.

**Cómo funciona:**

```javascript
// En apps/api/src/app.js (líneas 91-100 aproximadamente)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000']

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))
```

**En el archivo .env.production ya está configurado:**

```env
ALLOWED_ORIGINS=https://geocampus.unap.cl,http://geocampus.unap.cl
```

Esto significa que **solo el dominio geocampus.unap.cl** podrá hacer peticiones a la API.

**Si necesitas agregar más dominios:**

```env
ALLOWED_ORIGINS=https://geocampus.unap.cl,http://geocampus.unap.cl,https://admin.geocampus.unap.cl
```

---

## 🌐 Configuración de Nginx

### En el Servidor Backend (172.19.82.205)

```bash
# Instalar Nginx
sudo dnf install nginx -y

# Copiar el archivo de configuración
sudo cp /var/www/geocampus/deployment/nginx-backend.conf /etc/nginx/conf.d/geocampus-api.conf

# IMPORTANTE: Editar las rutas de los certificados SSL
sudo nano /etc/nginx/conf.d/geocampus-api.conf
# Modificar estas líneas con tus certificados reales:
#   ssl_certificate /etc/ssl/certs/api-geocampus.unap.cl.crt;
#   ssl_certificate_key /etc/ssl/private/api-geocampus.unap.cl.key;

# Verificar la configuración
sudo nginx -t

# Si la verificación es exitosa, reiniciar Nginx
sudo systemctl enable nginx
sudo systemctl restart nginx
```

### En el Servidor Frontend (172.19.82.206)

```bash
# Copiar el archivo de configuración
sudo cp /var/www/geocampus/deployment/nginx-frontend.conf /etc/nginx/conf.d/geocampus-web.conf

# IMPORTANTE: Editar las rutas de los certificados SSL
sudo nano /etc/nginx/conf.d/geocampus-web.conf
# Modificar estas líneas con tus certificados reales:
#   ssl_certificate /etc/ssl/certs/geocampus.unap.cl.crt;
#   ssl_certificate_key /etc/ssl/private/geocampus.unap.cl.key;

# Verificar la configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### Obtener Certificados SSL

Si no tienes certificados SSL, puedes usar **Let's Encrypt**:

```bash
# Instalar Certbot
sudo dnf install certbot python3-certbot-nginx -y

# Para el backend
sudo certbot --nginx -d api-geocampus.unap.cl

# Para el frontend
sudo certbot --nginx -d geocampus.unap.cl

# Los certificados se renovarán automáticamente
```

---

## ⚙️ Gestión con PM2

### Comandos útiles de PM2

```bash
# Ver estado de los procesos
pm2 status

# Ver logs en tiempo real
pm2 logs geocampus-api

# Ver logs de errores
pm2 logs geocampus-api --err

# Reiniciar la aplicación
pm2 restart geocampus-api

# Detener la aplicación
pm2 stop geocampus-api

# Información detallada del proceso
pm2 show geocampus-api

# Monitoreo en tiempo real
pm2 monit

# Ver las últimas 200 líneas de logs
pm2 logs geocampus-api --lines 200
```

### Configuración avanzada de PM2

Crear un archivo `ecosystem.config.js` en `/var/www/geocampus/apps/api/`:

```javascript
module.exports = {
  apps: [{
    name: 'geocampus-api',
    script: './src/start.js',
    instances: 2,  // Número de instancias (usar 'max' para usar todos los CPUs)
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/pm2/geocampus-api-error.log',
    out_file: '/var/log/pm2/geocampus-api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
}
```

Luego iniciar con:

```bash
pm2 start ecosystem.config.js
```

---

## ✅ Verificación y Troubleshooting

### Verificar que todo funcione

```bash
# 1. Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# 2. Probar conexión a la base de datos desde el servidor backend
psql -h 172.19.82.207 -U postgres -d geolocalizacion
# Ingresar la contraseña: AqN65xZ31

# 3. Verificar que PM2 esté corriendo la aplicación
pm2 status

# 4. Verificar que Nginx esté corriendo
sudo systemctl status nginx

# 5. Probar el endpoint de la API
curl http://localhost:4000/api/buildings
curl https://api-geocampus.unap.cl/api/buildings

# 6. Ver logs del backend
pm2 logs geocampus-api

# 7. Ver logs de Nginx
sudo tail -f /var/log/nginx/api-geocampus-access.log
sudo tail -f /var/log/nginx/api-geocampus-error.log
```

### Problemas comunes

#### 1. Error de conexión a la base de datos

```bash
# Verificar que PostgreSQL esté escuchando en la IP correcta
sudo netstat -tlnp | grep 5432

# Verificar las reglas del firewall
sudo firewall-cmd --list-all

# Verificar los logs de PostgreSQL
sudo tail -f /var/lib/pgsql/data/log/postgresql-*.log
```

#### 2. Error 502 Bad Gateway en Nginx

```bash
# Verificar que el backend esté corriendo
pm2 status

# Verificar los logs
pm2 logs geocampus-api
sudo tail -f /var/log/nginx/api-geocampus-error.log

# Verificar que el puerto 4000 esté escuchando
sudo netstat -tlnp | grep 4000
```

#### 3. Error de CORS

```bash
# Verificar la variable ALLOWED_ORIGINS en el .env
cat /var/www/geocampus/apps/api/.env

# Asegurarse de que incluya el dominio del frontend
# ALLOWED_ORIGINS=https://geocampus.unap.cl,http://geocampus.unap.cl

# Reiniciar el backend después de cambios
pm2 restart geocampus-api
```

#### 4. El frontend no carga

```bash
# Verificar que los archivos estén en el lugar correcto
ls -la /var/www/geocampus/dist

# Verificar permisos
sudo chown -R nginx:nginx /var/www/geocampus
sudo chmod -R 755 /var/www/geocampus

# Verificar la configuración de Nginx
sudo nginx -t

# Ver logs de Nginx
sudo tail -f /var/log/nginx/geocampus-error.log
```

---

## 📊 Monitoreo y Mantenimiento

### Configurar logs rotativos

```bash
# Crear configuración de logrotate
sudo nano /etc/logrotate.d/geocampus

# Agregar:
/var/log/nginx/geocampus*.log
/var/log/nginx/api-geocampus*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 nginx adm
    sharedscripts
    postrotate
        systemctl reload nginx
    endscript
}
```

### Backups de la base de datos

```bash
# Crear script de backup
sudo nano /usr/local/bin/backup-geocampus-db.sh

# Agregar:
#!/bin/bash
BACKUP_DIR="/var/backups/geocampus"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -h 172.19.82.207 -U postgres geolocalizacion | gzip > $BACKUP_DIR/geocampus_$DATE.sql.gz
# Mantener solo los últimos 7 días
find $BACKUP_DIR -name "geocampus_*.sql.gz" -mtime +7 -delete

# Hacer ejecutable
sudo chmod +x /usr/local/bin/backup-geocampus-db.sh

# Programar con cron (diario a las 2 AM)
sudo crontab -e
# Agregar:
0 2 * * * /usr/local/bin/backup-geocampus-db.sh
```

---

## 🎯 Checklist Final

- [ ] Node.js 18 instalado en servidor backend
- [ ] PostgreSQL configurado y accesible desde el backend
- [ ] Base de datos creada con las migraciones ejecutadas
- [ ] Archivo `.env` configurado correctamente en el backend
- [ ] Backend corriendo con PM2
- [ ] Nginx instalado y configurado en ambos servidores
- [ ] Certificados SSL configurados
- [ ] Frontend compilado y desplegado
- [ ] CORS configurado correctamente
- [ ] Firewall configurado
- [ ] Endpoints de la API respondiendo correctamente
- [ ] Frontend accesible desde el navegador
- [ ] Logs configurados y funcionando
- [ ] Backups automáticos configurados

---

## 📞 Contacto

**Equipo GeoCampus**  
Alexander Farías y Joaquín Ortiz  

En caso de problemas durante el despliegue, revisar los logs y contactar al equipo de desarrollo.
