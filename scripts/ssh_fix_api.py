import paramiko

pw = 'Thi4$f3kLgiT'

def sudo_exec(client, cmd, pw):
    full = "echo '" + pw + "' | sudo -S bash -c '" + cmd + "' 2>&1"
    _, out, _ = client.exec_command(full)
    return out.read().decode()

# ======= PASO 1: Leer certs SSL de .206 =======
print('Conectando a .206...')
c206 = paramiko.SSHClient()
c206.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c206.connect('172.19.82.206', port=2200, username='geocampus', password=pw)

cert_raw = sudo_exec(c206, 'cat /etc/nginx/ssl/unap.cl.crt', pw)
key_raw  = sudo_exec(c206, 'cat /etc/nginx/ssl/unap.cl.key', pw)
cert = cert_raw[cert_raw.find('-----BEGIN'):]
key  = key_raw[key_raw.find('-----BEGIN'):]
print('Certs leidos correctamente.')

# ======= PASO 2: Actualizar Nginx en .206 (arreglar try_files) =======
print('\nActualizando Nginx en .206...')
nginx_206 = """server {
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
    access_log /var/log/nginx/geocampus.access.log;
    error_log /var/log/nginx/geocampus.error.log;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
"""

sftp206 = c206.open_sftp()
with sftp206.open('/tmp/gc206.conf', 'w') as f:
    f.write(nginx_206)
sftp206.close()

out = sudo_exec(c206, 'mv /tmp/gc206.conf /etc/nginx/conf.d/geocampus.conf && nginx -t && systemctl reload nginx', pw)
print(out)
c206.close()
print('.206 actualizado.')

# ======= PASO 3: Configurar HTTPS en .205 para la API =======
print('\nConectando a .205...')
c205 = paramiko.SSHClient()
c205.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c205.connect('172.19.82.205', port=2200, username='geocampus', password=pw)

# Crear carpeta ssl y subir certs
sudo_exec(c205, 'mkdir -p /etc/nginx/ssl', pw)
sftp205 = c205.open_sftp()
with sftp205.open('/tmp/unap.cl.crt', 'w') as f:
    f.write(cert)
with sftp205.open('/tmp/unap.cl.key', 'w') as f:
    f.write(key)
sftp205.close()
out = sudo_exec(c205, 'mv /tmp/unap.cl.crt /etc/nginx/ssl/ && mv /tmp/unap.cl.key /etc/nginx/ssl/ && chmod 644 /etc/nginx/ssl/unap.cl.crt && chmod 600 /etc/nginx/ssl/unap.cl.key', pw)
print('Certs instalados en .205:', out or 'OK')

# Configurar Nginx .205 con HTTPS para api-geocampus.unap.cl
nginx_205 = """server {
    listen 80;
    listen [::]:80;
    server_name api-geocampus.unap.cl;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name api-geocampus.unap.cl;
    ssl_certificate /etc/nginx/ssl/unap.cl.crt;
    ssl_certificate_key /etc/nginx/ssl/unap.cl.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
"""

sftp205b = c205.open_sftp()
with sftp205b.open('/tmp/api205.conf', 'w') as f:
    f.write(nginx_205)
sftp205b.close()

out = sudo_exec(c205, 'mv /tmp/api205.conf /etc/nginx/conf.d/geocampus_final.conf && nginx -t && systemctl reload nginx', pw)
print('Nginx .205:', out)

# Abrir puerto 443 en el firewall
print('\nActivando puerto HTTPS en firewall de .205...')
out = sudo_exec(c205, 'firewall-cmd --add-service=https --permanent && firewall-cmd --reload', pw)
print('Firewall:', out or 'OK')

# Verificar que Nginx escucha en 443
_, o, _ = c205.exec_command('ss -tlnp | grep 443')
print('Puerto 443:', o.read().decode() or '(no encontrado aun - puede tardar)')

c205.close()

print('\n=== Configuracion HTTPS completada en ambos servidores ===')
