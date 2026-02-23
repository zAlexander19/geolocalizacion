import paramiko

pw = 'Thi4$f3kLgiT'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('172.19.82.205', port=2200, username='geocampus', password=pw)

# 1. Ver variables de entorno que PM2 tiene cargadas
print('=== ENV EN PM2 ===')
_, o, _ = c.exec_command("pm2 env 1 | grep -E 'ALLOWED|NODE_ENV|PORT|DB_'")
print(o.read().decode())

# 2. Probar con Origin header correcto
print('=== TEST CON ORIGIN CORRECTO ===')
_, o, _ = c.exec_command('curl -s -w "\\nCODE:%{http_code}" -H "Origin: https://geocampus.unap.cl" http://127.0.0.1:4000/buildings')
resp = o.read().decode()
# truncar respuesta
if len(resp) > 500:
    print(resp[:300] + '...[truncado]...' + resp[-100:])
else:
    print(resp)

# 3. Ver el .env actual que tiene el servidor
print('\n=== CONTENIDO .ENV EN SERVIDOR ===')
_, o, _ = c.exec_command('cat /home/geocampus/geocampus/apps/api/.env')
print(o.read().decode())

c.close()
