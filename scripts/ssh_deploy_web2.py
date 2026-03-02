import paramiko
import os
import time

pw = 'Thi4$f3kLgiT'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('172.19.82.206', port=2200, username='geocampus', password=pw)

# Paso 1: Subir build a /tmp/geocampus_dist/ vía SFTP
local_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'apps', 'web', 'dist'))
remote_tmp = '/tmp/geocampus_dist'

# Limpiar y crear directorio temporal
c.exec_command(f'rm -rf {remote_tmp} && mkdir -p {remote_tmp}')
time.sleep(1)

sftp = c.open_sftp()

def upload_dir(lp, rp):
    try:
        sftp.mkdir(rp)
    except:
        pass
    for item in os.listdir(lp):
        loc = os.path.join(lp, item)
        rem = rp + '/' + item
        if os.path.isdir(loc):
            upload_dir(loc, rem)
        else:
            sftp.put(loc, rem)

print(f'Subiendo build a {remote_tmp}...')
upload_dir(local_dist, remote_tmp)
sftp.close()
print('✅ Archivos subidos a /tmp/')

# Paso 2: Usar invoke_shell para sudo interactivo
print('\nCambiando propietario con sudo interactivo...')
shell = c.invoke_shell()
time.sleep(1)

def send_and_wait(shell, cmd, wait=2):
    shell.send(cmd + '\n')
    time.sleep(wait)
    out = ''
    while shell.recv_ready():
        out += shell.recv(4096).decode('utf-8', errors='replace')
        time.sleep(0.3)
    return out

# Cambiar propietario
out = send_and_wait(shell, f'sudo chown -R geocampus:nginx /var/www/geocampus.unap.cl/public_html', 3)
if 'contraseña' in out or 'password' in out.lower():
    out2 = send_and_wait(shell, pw, 3)
    print('sudo chown result:', out2[:200])
else:
    print('chown result:', out[:200])

# Ajustar permisos
out = send_and_wait(shell, f'sudo chmod -R 775 /var/www/geocampus.unap.cl/public_html', 2)
if 'contraseña' in out or 'password' in out.lower():
    out2 = send_and_wait(shell, pw, 2)

# Copiar archivos del tmp al destino
print('Copiando archivos...')
out = send_and_wait(shell, f'cp -rf {remote_tmp}/* /var/www/geocampus.unap.cl/public_html/', 5)
print('copy result:', out[:200])

# Verificar
out = send_and_wait(shell, 'ls -la /var/www/geocampus.unap.cl/public_html/ | head -8', 2)
print('Resultado final:\n' + out)

shell.close()
c.close()
print('\n✅ Deploy completado.')
