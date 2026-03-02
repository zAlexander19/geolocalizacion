# ========================================
# COMANDOS DE INSTALACIÓN PARA ROCKY LINUX
# ========================================

## 1. INSTALACIÓN DE NODE.JS 18

# Actualizar el sistema
sudo dnf update -y

# Habilitar el módulo de Node.js 18
sudo dnf module enable nodejs:18 -y

# Instalar Node.js
sudo dnf install nodejs -y

# Verificar la instalación
node --version
npm --version

# ALTERNATIVA: Si el método anterior no funciona, usar NodeSource

# Descargar e instalar el repositorio de NodeSource para Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -

# Instalar Node.js
sudo dnf install nodejs -y

# Verificar
node --version  # Debe mostrar v18.x.x
npm --version


## 2. INSTALACIÓN DE POSTGRESQL

# Instalar PostgreSQL (versión disponible en los repos de Rocky Linux)
sudo dnf install postgresql-server postgresql-contrib -y

# Verificar la versión instalada
postgres --version

# ALTERNATIVA: Instalar PostgreSQL 14 o superior desde repositorios oficiales

# Instalar el repositorio oficial de PostgreSQL
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# Deshabilitar el módulo PostgreSQL por defecto
sudo dnf -qy module disable postgresql

# Instalar PostgreSQL 14 (o la versión que prefieras: 12, 13, 14, 15, 16)
sudo dnf install -y postgresql14-server postgresql14-contrib

# Inicializar la base de datos
sudo /usr/pgsql-14/bin/postgresql-14-setup initdb

# Habilitar e iniciar el servicio
sudo systemctl enable postgresql-14
sudo systemctl start postgresql-14
sudo systemctl status postgresql-14


## 3. INSTALACIÓN DE NGINX

# Instalar Nginx
sudo dnf install nginx -y

# Verificar la instalación
nginx -v

# Habilitar e iniciar Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx


## 4. INSTALACIÓN DE PM2 (Gestor de procesos para Node.js)

# Instalar PM2 globalmente
sudo npm install -g pm2

# Verificar la instalación
pm2 --version


## 5. INSTALACIÓN DE GIT

# Instalar Git
sudo dnf install git -y

# Verificar
git --version


## 6. CONFIGURACIÓN DEL FIREWALL

# Permitir HTTP y HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Para el servidor de base de datos, permitir PostgreSQL
sudo firewall-cmd --permanent --add-port=5432/tcp

# Recargar el firewall
sudo firewall-cmd --reload

# Verificar las reglas
sudo firewall-cmd --list-all


## 7. INSTALACIÓN DE HERRAMIENTAS ADICIONALES

# Instalar herramientas de desarrollo (útiles para compilar módulos nativos de Node.js)
sudo dnf groupinstall "Development Tools" -y

# Instalar otras utilidades
sudo dnf install wget curl nano vim net-tools -y


## 8. INSTALACIÓN DE CERTBOT (Para certificados SSL de Let's Encrypt)

# Instalar certbot y el plugin de Nginx
sudo dnf install certbot python3-certbot-nginx -y

# Generar certificados SSL (ejemplo)
# sudo certbot --nginx -d api-geocampus.unap.cl
# sudo certbot --nginx -d geocampus.unap.cl


## RESUMEN DE COMANDOS COMPLETO

# En el Servidor Backend (172.19.82.205)
sudo dnf update -y
sudo dnf module enable nodejs:18 -y
sudo dnf install nodejs nginx git -y
sudo npm install -g pm2
sudo systemctl enable nginx
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# En el Servidor Frontend (172.19.82.206)
sudo dnf update -y
sudo dnf module enable nodejs:18 -y
sudo dnf install nodejs nginx git -y
sudo systemctl enable nginx
sudo systemctl start nginx
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# En el Servidor de Base de Datos (172.19.82.207)
sudo dnf update -y
sudo dnf install https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm
sudo dnf -qy module disable postgresql
sudo dnf install -y postgresql14-server postgresql14-contrib
sudo /usr/pgsql-14/bin/postgresql-14-setup initdb
sudo systemctl enable postgresql-14
sudo systemctl start postgresql-14
sudo firewall-cmd --permanent --add-port=5432/tcp
sudo firewall-cmd --reload


## NOTAS IMPORTANTES

# 1. Rocky Linux es compatible con paquetes de RHEL/CentOS 8
# 2. Algunos comandos pueden requerir privilegios de sudo
# 3. Asegúrate de que SELinux esté configurado correctamente si está habilitado
# 4. Para verificar si SELinux está habilitado: sestatus
# 5. Si tienes problemas con permisos, verifica SELinux: sudo setenforce 0 (temporal)
