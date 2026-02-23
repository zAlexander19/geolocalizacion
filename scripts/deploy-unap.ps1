# Script de Despliegue Automatizado para Geo-Campus
# Ejecutar desde la raíz del proyecto en Windows (PowerShell)

$ServerIP = "172.19.82.205"
$ServerUser = "geocampus"
$SSHPort = "2200"
$RemotePath = "/home/geocampus/geocampus"

Write-Host ">>> Iniciando despliegue a UNAP ($ServerIP)..." -ForegroundColor Cyan

# 1. Construir Frontend
Write-Host "1. Construyendo Frontend (React)..." -ForegroundColor Yellow
Set-Location "apps/web"
try {
    npm install
    npm run build
} catch {
    Write-Error "Error construyendo el frontend."
    exit 1
}
Set-Location ../../

# 2. Preparar API (limpieza de node_modules locales para la copia si fuera necesario, pero mejor ignorarlo al copiar)
Write-Host "2. Preparando API..." -ForegroundColor Yellow
# No se requiere acción específica más que asegurar que los archivos fuente estén listos.

# 3. Transferir Archivos (Requiere OpenSSH Client instalado en Windows)
Write-Host "3. Transfiriendo archivos al servidor (esto puede tardar)..." -ForegroundColor Yellow

# Crear directorios remotos si no existen
ssh -p $SSHPort $ServerUser@$ServerIP "mkdir -p $RemotePath/apps/api $RemotePath/apps/web"

# Copiar API (excluyendo node_modules y otros)
# Nota: scp no tiene un flag --exclude nativo fácil en Windows, usamos una estrategia de copia selectiva o requerimos rsync.
# Simplificación: Copiamos todo src y package.json.
Write-Host "   -> Copiando API Sources..." -ForegroundColor Gray
scp -P $SSHPort -r apps/api/src apps/api/package.json apps/api/ecosystem.config.cjs "$ServerUser@$ServerIP`:$RemotePath/apps/api/"

# Copiar Frontend (Dist)
Write-Host "   -> Copiando Frontend Build..." -ForegroundColor Gray
# Limpiar carpeta web remota primero (opcional, cuidado con archivos persistentes)
ssh -p $SSHPort $ServerUser@$ServerIP "rm -rf $RemotePath/apps/web/*"
scp -P $SSHPort -r apps/web/dist/* "$ServerUser@$ServerIP`:$RemotePath/apps/web/"

# 4. Comandos Remotos
Write-Host "4. Ejecutando instalación y reinicio remoto..." -ForegroundColor Yellow

# Crear un script bash temporal para asegurar compatibilidad con Linux (evitar problemas de CRLF)
$BashScriptContent = @"
#!/bin/bash
export PATH=`$PATH:/usr/local/bin

echo "-> Entrando a directorio API..."
cd $RemotePath/apps/api || exit 1

echo "-> Instalando dependencias..."
npm install --production --no-audit

echo "-> Gestionando proceso PM2..."
if pm2 list | grep -q "api-geocampus"; then
    pm2 reload api-geocampus
else
    pm2 start ecosystem.config.cjs --name "api-geocampus"
fi
pm2 save
"@

# Guardar script localmente con encoding ASCII/UTF8 sin BOM
$TempScriptPath = "deploy-temp.sh"
[IO.File]::WriteAllText($TempScriptPath, $BashScriptContent.Replace("`r`n", "`n"))

# Subir y ejecutar el script
scp -P $SSHPort $TempScriptPath "$ServerUser@$ServerIP`:$RemotePath/"
ssh -p $SSHPort $ServerUser@$ServerIP "chmod +x $RemotePath/deploy-temp.sh && $RemotePath/deploy-temp.sh && rm $RemotePath/deploy-temp.sh"

# Limpieza local
Remove-Item $TempScriptPath

Write-Host ">>> Despliegue Completado Exitosamente." -ForegroundColor Green
