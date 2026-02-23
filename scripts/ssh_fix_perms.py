import paramiko

pw = 'Thi4$f3kLgiT'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('172.19.82.206', port=2200, username='geocampus', password=pw)

# Ver sudo permisos
_, o, _ = c.exec_command('sudo -n chown -R geocampus:geocampus /var/www/geocampus.unap.cl/public_html 2>&1')
print('chown:', o.read().decode())

_, o, _ = c.exec_command('ls -la /var/www/geocampus.unap.cl/ 2>&1')
print(o.read().decode())

# Intentar con sudoers
stdin, o, e = c.exec_command('echo "geocampus ALL=(ALL) NOPASSWD: /bin/chown" | sudo tee /etc/sudoers.d/geocampus-chown 2>&1')
print('tee:', o.read().decode(), e.read().decode())

c.close()
