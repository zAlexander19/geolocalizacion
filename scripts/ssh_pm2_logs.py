import paramiko

pw = 'Thi4$f3kLgiT'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('172.19.82.205', port=2200, username='geocampus', password=pw)

print('=== PM2 STATUS ===')
_, o, _ = c.exec_command('pm2 list')
print(o.read().decode())

print('=== PM2 LOGS (ultimas 50 lineas) ===')
_, o, _ = c.exec_command('pm2 logs api-geocampus --lines 50 --nostream 2>&1')
print(o.read().decode())

print('=== ERROR LOG DIRECTO ===')
_, o, _ = c.exec_command('tail -60 /home/geocampus/.pm2/logs/api-geocampus-error.log 2>&1')
print(o.read().decode())

print('=== OUT LOG DIRECTO ===')
_, o, _ = c.exec_command('tail -30 /home/geocampus/.pm2/logs/api-geocampus-out.log 2>&1')
print(o.read().decode())

c.close()
