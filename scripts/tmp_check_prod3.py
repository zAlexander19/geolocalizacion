import paramiko

pw = 'Thi4$f3kLgiT'
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.19.82.205', port=2200, username='geocampus', password=pw)

print('=== NGINX CONFIG (api backend) ===')
_, out, _ = client.exec_command('cat /etc/nginx/conf.d/*.conf 2>/dev/null || cat /etc/nginx/sites-enabled/* 2>/dev/null || cat /etc/nginx/nginx.conf 2>&1 | head -80')
print(out.read().decode('utf-8', errors='replace'))

print('\n=== TEST PUT directo al servidor (sin nginx) ===')
_, out, _ = client.exec_command('''curl -s -X PUT http://localhost:4000/buildings/47 \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "nombre_edificio=test&acronimo=tst&cord_latitud=-18.477&cord_longitud=-70.249&disponibilidad=Disponible&estado=true" \
  2>&1 | head -200''')
print(out.read().decode('utf-8', errors='replace'))

client.close()
