import paramiko

pw = 'Thi4$f3kLgiT'

def sudo_exec(client, cmd, pw):
    full = "echo '" + pw + "' | sudo -S bash -c '" + cmd + "' 2>&1"
    _, out, _ = client.exec_command(full)
    return out.read().decode()

print('Conectando a .205...')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('172.19.82.205', port=2200, username='geocampus', password=pw)

print('\nAbriendo puerto 443 en firewall...')
out = sudo_exec(c, 'firewall-cmd --add-service=https --permanent && firewall-cmd --reload', pw)
print(out or 'OK')

print('\nVerificando puertos en escucha:')
_, o, _ = c.exec_command('ss -tlnp')
print(o.read().decode())

print('\nVerificando API localmente con HTTPS:')
_, o, _ = c.exec_command('curl -sk https://127.0.0.1/ -H "Host: api-geocampus.unap.cl" | head -3')
print(o.read().decode())

c.close()
print('Listo.')
