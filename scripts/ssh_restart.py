import paramiko
import time

pw = 'Thi4$f3kLgiT'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('172.19.82.205', port=2200, username='geocampus', password=pw)

print('Reiniciando PM2 con --update-env...')
_, out, _ = c.exec_command('pm2 restart api-geocampus --update-env')
print(out.read().decode())

time.sleep(3)

# Verificar que PM2 cargó las nuevas variables
print('Variables de entorno en PM2:')
_, out, _ = c.exec_command('pm2 env api-geocampus 2>&1 | grep -E "ALLOWED|DB_HOST|PORT|NODE_ENV"')
print(out.read().decode())

# Probar con origen correcto
print('Probando API con header Origin correcto:')
_, out, _ = c.exec_command('curl -s -H "Origin: https://geocampus.unap.cl" http://127.0.0.1:4000/buildings | head -c 300')
print(out.read().decode())

c.close()
print('\nListo.')
