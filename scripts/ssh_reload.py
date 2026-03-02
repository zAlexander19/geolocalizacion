import paramiko

host = '172.19.82.205'
port = 2200
user = 'geocampus'
password = 'Thi4$f3kLgiT'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password)

# Recargar Nginx pasando la contraseña via stdin con sudo -S
print('Recargando Nginx...')
stdin, stdout, stderr = client.exec_command('echo "Thi4$f3kLgiT" | sudo -S systemctl reload nginx 2>&1')
stdin.flush()
out = stdout.read().decode()
err = stderr.read().decode()
print('OUT:', out)
print('ERR:', err)

# Verificar estado
print('\nEstado de Nginx:')
stdin2, stdout2, stderr2 = client.exec_command('sudo systemctl is-active nginx')
stdin2.flush()
print(stdout2.read().decode())

client.close()
print('Listo.')
