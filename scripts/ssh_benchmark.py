import paramiko
import json

pw = 'Thi4$f3kLgiT'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('172.19.82.205', port=2200, username='geocampus', password=pw)

# 1. Tiempo de respuesta de la API
print('=== TIEMPO DE RESPUESTA API ===')
_, o, _ = c.exec_command('curl -s -o /dev/null -w "buildings: %{time_total}s | code: %{http_code}\n" http://127.0.0.1:4000/buildings && curl -s -o /dev/null -w "faculties: %{time_total}s | code: %{http_code}\n" http://127.0.0.1:4000/faculties && curl -s -o /dev/null -w "rooms: %{time_total}s | code: %{http_code}\n" http://127.0.0.1:4000/rooms')
print(o.read().decode())

# 2. Campos imagen del primer edificio
print('=== CAMPO IMAGEN EN API ===')
_, o, _ = c.exec_command('curl -s http://127.0.0.1:4000/buildings')
try:
    data = json.loads(o.read().decode())
    buildings = data.get('data', [])[:3]
    for b in buildings:
        print(f"  {b.get('nombre_edificio')}: imagen = {b.get('imagen')}")
except Exception as e:
    print('Error:', e)

# 3. Ver archivos en uploads
print('\n=== ARCHIVOS EN /uploads ===')
_, o, _ = c.exec_command('ls -la /home/geocampus/geocampus/apps/api/uploads/ | head -10')
print(o.read().decode())

# 4. Ver si Nginx en .205 sirve /uploads
print('=== NGINX .205: acceso a /uploads ===')
_, o, _ = c.exec_command('cat /etc/nginx/conf.d/geocampus_final.conf')
print(o.read().decode())

# 5. Ping a la base de datos
print('=== PING A BD (.207) ===')
_, o, _ = c.exec_command('ping -c 3 172.19.82.207 2>&1')
print(o.read().decode())

c.close()
