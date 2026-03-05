import paramiko
import sys

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('172.19.82.205', port=2200, username='geocampus', password='Thi4$f3kLgiT')
    
    print('Connected, uploading fix-sequences.js...')
    sftp = client.open_sftp()
    sftp.put('apps/api/fix-sequences.js', '/home/geocampus/geocampus/apps/api/fix-sequences.js')
    sftp.close()
    
    print('Running fix-sequences.js...')
    stdin, stdout, stderr = client.exec_command('cd /home/geocampus/geocampus/apps/api && node fix-sequences.js')
    
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print('STDOUT:', out)
    if err: print('STDERR:', err)
    
    print('Done.')
finally:
    client.close()
