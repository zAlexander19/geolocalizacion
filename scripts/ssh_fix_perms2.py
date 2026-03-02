import paramiko
import os, time

pw = 'Thi4$f3kLgiT'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('172.19.82.206', port=2200, username='geocampus', password=pw)

# Arreglar permisos con sudo -S (lee password desde stdin)
print('=== Arreglando permisos ===')
stdin, o, e = c.exec_command(f'echo "{pw}" | sudo -S chown -R geocampus:nginx /var/www/geocampus.unap.cl/public_html 2>&1')
out = o.read().decode()
err = e.read().decode()
print('OUT:', out)
print('ERR:', err)

# Arreglar permisos de escritura
stdin, o, e = c.exec_command(f'echo "{pw}" | sudo -S chmod -R 775 /var/www/geocampus.unap.cl/public_html 2>&1')
out = o.read().decode()
err = e.read().decode()
print('chmod OUT:', out)
print('chmod ERR:', err)

# Verificar
_, o, _ = c.exec_command('ls -la /var/www/geocampus.unap.cl/public_html | head -5')
print('Permisos:', o.read().decode())

c.close()
print('Listo.')
