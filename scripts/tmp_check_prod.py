import paramiko

pw = 'Thi4$f3kLgiT'
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.19.82.205', port=2200, username='geocampus', password=pw)

print('=== LOGS DE ERROR (ultimas 50 lineas) ===')
_, out, _ = client.exec_command('pm2 logs api-geocampus --err --lines 50 --nostream 2>&1')
print(out.read().decode('utf-8', errors='replace'))

print('\n=== VERIFICACION: ¿existe "const prev = await buildingsRepo.findById" en app.js? ===')
_, out, _ = client.exec_command('grep -n "const prev = await buildingsRepo.findById\|findById\|PUT.*buildings" /home/geocampus/geocampus/apps/api/src/app.js | head -20')
print(out.read().decode('utf-8', errors='replace'))

print('\n=== CUAL ARCHIVO USA PM2 ===')
_, out, _ = client.exec_command('pm2 show api-geocampus 2>&1 | grep -E "script|cwd|pid|status"')
print(out.read().decode('utf-8', errors='replace'))

client.close()
