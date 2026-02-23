import paramiko
import os

pw = 'Thi4$f3kLgiT'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('172.19.82.206', port=2200, username='geocampus', password=pw)

remote_root = '/var/www/geocampus.unap.cl/public_html'
local_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'apps', 'web', 'dist'))

sftp = c.open_sftp()

def upload_dir(local_path, remote_path):
    try:
        sftp.mkdir(remote_path)
    except:
        pass
    for item in os.listdir(local_path):
        loc = os.path.join(local_path, item)
        rem = remote_path + '/' + item
        if os.path.isdir(loc):
            upload_dir(loc, rem)
        else:
            sftp.put(loc, rem)
            print(f'  {rem}')

print(f'Subiendo build a {remote_root}...')
upload_dir(local_dist, remote_root)
sftp.close()

print('\n✅ Frontend actualizado.')
print('Reiniciando Nginx en .206...')
_, o, e = c.exec_command('sudo systemctl reload nginx 2>&1')
print(o.read().decode())
err = e.read().decode()
if err: print('STDERR:', err)

c.close()
print('Listo.')
