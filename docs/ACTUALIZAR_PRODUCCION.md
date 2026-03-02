# Guía: Cómo desarrollar en local y subir cambios a producción

> **Requisito previo:** tener Python instalado con el paquete `paramiko`.
> Si no lo tienes: `pip install paramiko`

---

## Desarrollar y probar en local antes de subir a producción

Sí, se puede trabajar en local y probar todo antes de subir. El proyecto tiene dos modos:

| Modo | Comando | URL |
|---|---|---|
| Desarrollo local | `npm run dev` | `http://localhost:5173` (web) + `http://localhost:4000` (API) |
| Producción | scripts de deploy | `https://geocampus.unap.cl` |

### Paso 1 — Instalar dependencias (solo la primera vez)

Abre una terminal en la raíz del proyecto y ejecuta:

```powershell
# Instalar dependencias del frontend
cd apps\web
npm install

# Instalar dependencias del backend
cd ..\api
npm install

# Volver a la raíz
cd ..\..
```

### Paso 2 — Configurar el `.env` local del backend

El backend necesita un archivo `.env` en `apps/api/` para saber a qué base de datos conectarse.
Ya existe `apps/api/.env.development` como referencia. Cópialo como `.env`:

```powershell
copy apps\api\.env.development apps\api\.env
```

Luego edita `apps/api/.env` con los datos de la base de datos. Tienes dos opciones:

**Opción A (recomendada): conectarse a la BD de producción en `.207`**

Edita el archivo y pon los datos reales del servidor:

```env
PORT=4000
NODE_ENV=development
DB_HOST=172.19.82.207
DB_PORT=5432
DB_NAME=geocampus
DB_USER=postgres
DB_PASSWORD=AqN65xZ31
DB_SSL=false
JWT_SECRET=tu_secreto_para_jwt_development_key
```

> ⚠️ Esto conecta tu entorno local a la base de datos real. Los datos que crees o borres
> en local afectarán también a producción. Úsalo solo si necesitas datos reales para probar.

**Opción B: base de datos local (PostgreSQL instalado en tu PC)**

Deja el `.env` con `DB_HOST=localhost` y crea la BD local ejecutando:

```powershell
cd apps\api
npm run db:setup
```

Esta opción es más segura pero necesitas tener PostgreSQL instalado en tu computador.

### Paso 3 — Iniciar el entorno de desarrollo

Necesitas abrir **dos terminales** simultáneas:

**Terminal 1 — Backend (API):**
```powershell
cd apps\api
npm run dev
```
Verás: `🚀 Servidor corriendo en puerto 4000`

**Terminal 2 — Frontend (React):**
```powershell
cd apps\web
npm run dev
```
Verás: `➜  Local: http://localhost:5173/`

Abre el navegador en `http://localhost:5173` y ya tienes el proyecto corriendo en local.

### Paso 4 — Hacer cambios y probarlos

Con el entorno corriendo, los cambios que hagas en cualquier archivo de `apps/web/src/` o `apps/api/src/` se aplicarán **automáticamente** sin necesidad de reiniciar:

- **Frontend:** Vite recarga el navegador en tiempo real al guardar cualquier archivo `.jsx`/`.js`/`.css`
- **Backend:** Nodemon reinicia el servidor automáticamente al guardar cualquier archivo `.js`

Haz tus cambios → prueba en `http://localhost:5173` → cuando todo funcione, sube a producción.

### Paso 5 — Subir a producción cuando esté listo

Una vez probado en local, sube usando los scripts según lo que hayas cambiado:

```powershell
# Si cambiaste el frontend:
cd apps\web
npm run build
cd ..\..
python scripts\ssh_deploy_web2.py

# Si cambiaste el backend:
python scripts\ssh_deploy_api.py

# Verificar que producción quedó bien:
python scripts\ssh_verify_final.py
```

---

---

## Infraestructura

| Servidor | IP | Rol |
|---|---|---|
| `.205` | 172.19.82.205 | API (Node.js + PM2, puerto 4000) |
| `.206` | 172.19.82.206 | Frontend (Nginx, sirve React) |
| `.207` | 172.19.82.207 | Base de datos PostgreSQL |

- SSH: puerto `2200`, usuario `geocampus`
- Frontend público: `https://geocampus.unap.cl`
- API pública: `https://api-geocampus.unap.cl`

---

## Caso 1: Cambié código del frontend (React)

Ejemplo: modifiqué un componente, agregué una página, cambié estilos, etc.

**Paso 1 — Compilar el proyecto**

Abre una terminal en la raíz del proyecto (`C:\Users\123\Desktop\geolocalizacion`) y ejecuta:

```powershell
cd apps\web
npm run build
cd ..\..
```

Esto genera la carpeta `apps/web/dist/` con todos los archivos listos para producción.
El proceso tarda entre 10 y 30 segundos. Al final verás algo como:
```
✓ built in 13.70s
```

**Paso 2 — Subir el build al servidor**

```powershell
python scripts\ssh_deploy_web2.py
```

El script se conecta al servidor `.206` y sube todo `apps/web/dist/` a `/var/www/geocampus.unap.cl/public_html/`.
Listo. Los cambios son visibles en `https://geocampus.unap.cl` de inmediato.

---

## Caso 2: Cambié código del backend (API Node.js)

Ejemplo: modifiqué un controlador, una ruta, un middleware, `app.js`, etc.

**Paso único — Subir y reiniciar**

```powershell
python scripts\ssh_deploy_api.py
```

Este script:
1. Se conecta al servidor `.205`
2. Sube **todos** los archivos de `apps/api/src/` y `ecosystem.config.cjs`
3. Reinicia PM2 automáticamente con `--update-env`
4. Verifica que la API responde HTTP 200 y muestra el resultado

Si todo va bien verás al final:
```
✓ api-geocampus → online | PID: XXXXX | reinicios: X
✓ GET /buildings → HTTP 200
✅ Deploy backend completado.
```

### Si instalaste un paquete nuevo (`npm install <paquete>`)

Usa el flag `--full` para que también suba `package.json` e instale las dependencias en el servidor:

```powershell
# Primero instalar el paquete localmente
cd apps\api
npm install <nombre-del-paquete>
cd ..\..

# Luego desplegar incluyendo npm install en el servidor
python scripts\ssh_deploy_api.py --full
```

> ⚠️ El flag `--full` puede tardar varios minutos si hay muchas dependencias.

---

## Caso 3: Cambié variables de entorno (`.env`)

Las variables de entorno del API viven **en el servidor** en:
`/home/geocampus/geocampus/apps/api/.env`

NO se suben automáticamente con `ssh_deploy_api.py` por seguridad.

**Para editarlas, conéctate por SSH al servidor `.205`:**

```powershell
ssh -p 2200 geocampus@172.19.82.205
```

Una vez conectado:

```bash
nano /home/geocampus/geocampus/apps/api/.env
```

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`. Luego aplica los cambios:

```bash
pm2 restart api-geocampus --update-env
```

Verifica que quedó bien:

```bash
pm2 env 1 | grep -E 'ALLOWED|NODE_ENV|PORT'
```

**Contenido actual del `.env` en producción:**

```env
PORT=4000
DB_HOST=172.19.82.207
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=AqN65xZ31
DB_NAME=geocampus
NODE_ENV=production
ALLOWED_ORIGINS=https://geocampus.unap.cl,http://localhost:5173,http://localhost:3000
```

---

## Caso 4: Subí imágenes nuevas

Si añadiste imágenes a la carpeta `apps/api/uploads/` en tu computador:

```powershell
python scripts\ssh_upload_images.py
```

El script sube todos los archivos de `apps/api/uploads/` al servidor `.205`.
Es seguro correrlo varias veces — solo sobreescribe, no duplica.

---

## Caso 5: Cambié la base de datos (migración SQL)

**Opción A — Desde tu computador usando el servidor .205 como puente:**

```powershell
ssh -p 2200 geocampus@172.19.82.205
```

Una vez conectado al `.205`:

```bash
PGPASSWORD=AqN65xZ31 psql -h 172.19.82.207 -U postgres -d geocampus
```

Esto abre una consola SQL interactiva. Escribe tus comandos SQL y `\q` para salir.

**Opción B — Ejecutar un archivo `.sql`:**

```bash
# Desde el servidor .205, conectado por SSH:
PGPASSWORD=AqN65xZ31 psql -h 172.19.82.207 -U postgres -d geocampus -f /ruta/script.sql
```

---

## Flujo completo: cambié frontend Y backend al mismo tiempo

```powershell
# 1. Compilar el frontend
cd apps\web
npm run build
cd ..\..

# 2. Subir el frontend
python scripts\ssh_deploy_web2.py

# 3. Subir el backend
python scripts\ssh_deploy_api.py

# 4. (Opcional) Subir imágenes nuevas si las hay
python scripts\ssh_upload_images.py

# 5. Verificar que todo funciona
python scripts\ssh_verify_final.py
```

---

## Scripts de utilidad disponibles

| Script | Qué hace | Servidor |
|---|---|---|
| `scripts/ssh_deploy_web2.py` | Sube el build de React (frontend) | `.206` |
| `scripts/ssh_deploy_api.py` | Sube el código fuente del backend y reinicia PM2 | `.205` |
| `scripts/ssh_deploy_api.py --full` | Igual + sube package.json + hace npm install | `.205` |
| `scripts/ssh_upload_images.py` | Sube todas las imágenes de `/uploads/` | `.205` |
| `scripts/ssh_verify_final.py` | Verifica que API e imágenes responden correctamente | `.205` |
| `scripts/ssh_pm2_logs.py` | Muestra los logs de PM2 (para ver errores) | `.205` |
| `scripts/ssh_check_env.py` | Muestra las variables de entorno activas en PM2 | `.205` |
| `scripts/ssh_benchmark.py` | Mide tiempos de respuesta de la API | `.205` |

---

## Diagnóstico rápido (algo está fallando)

```powershell
# Ver si la API responde bien
python scripts\ssh_verify_final.py

# Ver logs de error de PM2
python scripts\ssh_pm2_logs.py

# Ver variables de entorno activas
python scripts\ssh_check_env.py
```

---

## Acceso SSH directo (diagnóstico manual avanzado)

```powershell
# Servidor APP/API (.205)
ssh -p 2200 geocampus@172.19.82.205

# Servidor WEB (.206)
ssh -p 2200 geocampus@172.19.82.206
```

Comandos útiles una vez conectado al `.205`:

```bash
pm2 list                             # ver estado de todos los procesos
pm2 logs api-geocampus               # ver logs en tiempo real (Ctrl+C para salir)
pm2 restart api-geocampus            # reiniciar la API
pm2 restart api-geocampus --update-env  # reiniciar aplicando nuevas variables de entorno
pm2 stop api-geocampus               # detener la API
pm2 start ecosystem.config.cjs       # iniciar desde cero
```

Comandos útiles en el `.206` (servidor web):

```bash
sudo nginx -t                        # validar configuración de Nginx (no rompe nada)
sudo systemctl reload nginx          # recargar Nginx sin cortar conexiones activas
sudo systemctl restart nginx         # reinicio completo (corta conexiones momentáneamente)
sudo systemctl status nginx          # ver si Nginx está activo
ls /var/www/geocampus.unap.cl/public_html/  # ver archivos del frontend desplegado
```
