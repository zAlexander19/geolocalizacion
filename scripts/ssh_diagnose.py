import paramiko

host = '172.19.82.206'
port = 2200
user = 'geocampus'
password = 'Thi4$f3kLgiT'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password)

commands = [
    'hostname && whoami',
    'ss -tlnp',
    'find /etc/nginx -name "*.conf" | xargs ls -la 2>&1',
    'ls /etc/nginx/conf.d/',
    'for f in /etc/nginx/conf.d/*.conf; do echo "=== $f ==="; cat "$f"; done',
    'cat /etc/nginx/nginx.conf | grep -v "^#" | grep -v "^$"',
    # Ver que hay en la carpeta web del .206
    'find /home /var/www /usr/share/nginx -name "index.html" 2>/dev/null | head -10',
]

for cmd in commands:
    print(f'\n{"="*60}')
    print(f'CMD: {cmd}')
    print('='*60)
    stdin, stdout, stderr = client.exec_command(cmd)
    output = stdout.read().decode()
    err = stderr.read().decode()
    if output:
        print(output)
    if err:
        print('STDERR:', err)

client.close()
print('\nDone.')
