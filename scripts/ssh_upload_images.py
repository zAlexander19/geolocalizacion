import paramiko
import os

pw = 'Thi4$f3kLgiT'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('172.19.82.205', port=2200, username='geocampus', password=pw)

# Asegurar directorio uploads en el servidor
c.exec_command('mkdir -p /home/geocampus/geocampus/apps/api/uploads')

sftp = c.open_sftp()
remote_dir = '/home/geocampus/geocampus/apps/api/uploads'
local_dir = os.path.join(os.path.dirname(__file__), '..', 'apps', 'api', 'uploads')
local_dir = os.path.abspath(local_dir)

files = [f for f in os.listdir(local_dir) if os.path.isfile(os.path.join(local_dir, f))]
print(f'Subiendo {len(files)} archivos de imágenes...')

for i, fname in enumerate(files, 1):
    local_path = os.path.join(local_dir, fname)
    remote_path = f'{remote_dir}/{fname}'
    try:
        sftp.put(local_path, remote_path)
        print(f'  [{i}/{len(files)}] {fname} ✓')
    except Exception as e:
        print(f'  [{i}/{len(files)}] {fname} ERROR: {e}')

sftp.close()
print('\n✅ Imágenes subidas.')

# También subir el app.js corregido
print('\nSubiendo app.js con fix de CORS...')
local_app = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'apps', 'api', 'src', 'app.js'))
remote_app = '/home/geocampus/geocampus/apps/api/src/app.js'

sftp2 = c.open_sftp()
sftp2.put(local_app, remote_app)
sftp2.close()
print('✅ app.js actualizado.')

# Reiniciar PM2
print('\nReiniciando PM2...')
_, o, e = c.exec_command('pm2 restart api-geocampus --update-env 2>&1')
print(o.read().decode())
err = e.read().decode()
if err: print('STDERR:', err)

# Verificar
import time
time.sleep(3)
print('\nVerificando API...')
_, o, _ = c.exec_command('curl -s -o /dev/null -w "STATUS:%{http_code}" http://127.0.0.1:4000/buildings')
print(o.read().decode())

_, o, _ = c.exec_command('ls /home/geocampus/geocampus/apps/api/uploads | wc -l')
print(f'Archivos en uploads en servidor: {o.read().decode().strip()}')

c.close()
print('\nListo.')
