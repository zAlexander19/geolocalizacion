import paramiko

pw = 'Thi4$f3kLgiT'

def sudo_exec(client, cmd):
    full = "echo '" + pw + "' | sudo -S bash -c '" + cmd + "' 2>&1"
    _, out, _ = client.exec_command(full)
    return out.read().decode()

print('Conectando a .206...')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('172.19.82.206', port=2200, username='geocampus', password=pw)

nginx_conf = """# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name geocampus.unap.cl;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name geocampus.unap.cl;

    root /var/www/geocampus.unap.cl/public_html;
    index index.html;

    ssl_certificate /etc/nginx/ssl/unap.cl.crt;
    ssl_certificate_key /etc/nginx/ssl/unap.cl.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Compresion GZIP
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/x-javascript
        image/svg+xml
        application/manifest+json;

    access_log /var/log/nginx/geocampus.access.log;
    error_log /var/log/nginx/geocampus.error.log;

    # Cache para assets estaticos (JS, CSS, imagenes)
    location ~* \.(js|css|png|jpg|jpeg|svg|ico|webp|woff2|woff)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # index.html sin cache (para que siempre descargue la version nueva)
    location ~* \.(html|json|webmanifest)$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files $uri $uri/ /index.html;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
"""

sftp = c.open_sftp()
with sftp.open('/tmp/gc206_opt.conf', 'w') as f:
    f.write(nginx_conf)
sftp.close()

print('Aplicando configuración optimizada...')
out = sudo_exec(c, 'mv /tmp/gc206_opt.conf /etc/nginx/conf.d/geocampus.conf && nginx -t && systemctl reload nginx')
print(out)

# Verificar gzip activo
print('Verificando gzip:')
_, o, _ = c.exec_command('curl -sI -H "Accept-Encoding: gzip" https://geocampus.unap.cl/assets/ 2>&1 | grep -i "content-encoding\|content-type" || echo "verificar manualmente"')
print(o.read().decode())

c.close()
print('Optimizacion aplicada.')
