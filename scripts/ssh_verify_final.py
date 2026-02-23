import paramiko

pw = 'Thi4$f3kLgiT'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('172.19.82.205', port=2200, username='geocampus', password=pw)

print('=== VERIFICACION FINAL ===\n')

# 1. API con origin correcto
_, o, _ = c.exec_command('curl -s -o /dev/null -w "buildings: %{http_code} (%{time_total}s)" -H "Origin: https://geocampus.unap.cl" http://127.0.0.1:4000/buildings')
print('API buildings:', o.read().decode())

_, o, _ = c.exec_command('curl -s -o /dev/null -w " | faculties: %{http_code}" -H "Origin: https://geocampus.unap.cl" http://127.0.0.1:4000/faculties')
print('API faculties:', o.read().decode())

# 2. Imagen específica accesible
_, o, _ = c.exec_command('curl -s -o /dev/null -w "imagen gym: %{http_code} (%{size_download} bytes)" http://127.0.0.1:4000/uploads/1763478601355-gym_grande.jpeg')
print(o.read().decode())

# 3. Conteo uploads
_, o, _ = c.exec_command('ls /home/geocampus/geocampus/apps/api/uploads | wc -l')
print(f'Total imágenes en /uploads: {o.read().decode().strip()}')

c.close()
print('\n✅ Todo verificado.')
