import paramiko

pw = 'Thi4$f3kLgiT'
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.19.82.205', port=2200, username='geocampus', password=pw)

print('=== STDOUT (ultimas 60 lineas) ===')
_, out, _ = client.exec_command('pm2 logs api-geocampus --out --lines 60 --nostream 2>&1')
print(out.read().decode('utf-8', errors='replace'))

print('\n=== NGINX LOGS (accesos recientes a /buildings) ===')
_, out, _ = client.exec_command('sudo tail -30 /var/log/nginx/access.log 2>&1 | grep building || echo "no nginx logs or no buildings requests"')
print(out.read().decode('utf-8', errors='replace'))

print('\n=== VERIFICAR LINEA 423-440 del app.js en produccion ===')
_, out, _ = client.exec_command('sed -n "423,445p" /home/geocampus/geocampus/apps/api/src/app.js')
print(out.read().decode('utf-8', errors='replace'))

client.close()
