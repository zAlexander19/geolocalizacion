import paramiko

pw = 'Thi4$f3kLgiT'

def sudo_exec(client, cmd, pw):
    full = "echo '" + pw + "' | sudo -S bash -c '" + cmd + "' 2>&1"
    _, out, _ = client.exec_command(full)
    return out.read().decode()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('172.19.82.205', port=2200, username='geocampus', password=pw)

# 1. Agregar ALLOWED_ORIGINS al .env
print('Actualizando .env con ALLOWED_ORIGINS...')
env_path = '/home/geocampus/geocampus/apps/api/.env'
_, out, _ = c.exec_command(f'cat {env_path}')
current_env = out.read().decode()
print('Env actual:')
print(current_env)

# Agregar la linea si no existe
if 'ALLOWED_ORIGINS' not in current_env:
    new_line = 'ALLOWED_ORIGINS=https://geocampus.unap.cl,http://localhost:5173,http://localhost:3000'
    _, out, _ = c.exec_command(f"echo '{new_line}' >> {env_path}")
    out.read()
    print('ALLOWED_ORIGINS agregado.')
else:
    # Reemplazar la linea existente
    _, out, _ = c.exec_command(f"sed -i 's|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://geocampus.unap.cl,http://localhost:5173,http://localhost:3000|' {env_path}")
    out.read()
    print('ALLOWED_ORIGINS actualizado.')

print('\nNuevo .env:')
_, out, _ = c.exec_command(f'cat {env_path}')
print(out.read().decode())

# 2. Reiniciar PM2
print('Reiniciando API...')
_, out, _ = c.exec_command('pm2 reload api-geocampus && pm2 save')
print(out.read().decode())

# 3. Verificar que responde correctamente
import time
time.sleep(3)
print('Probando API:')
_, out, _ = c.exec_command('curl -s http://127.0.0.1:4000/buildings | head -c 200')
print(out.read().decode())

c.close()
print('\nListo.')

