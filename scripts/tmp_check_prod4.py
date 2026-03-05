import paramiko

pw = 'Thi4$f3kLgiT'
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.19.82.205', port=2200, username='geocampus', password=pw)

# Test PUT a través de Nginx (HTTPS) para simular exactamente lo que hace el navegador
print('=== TEST PUT a través de Nginx (igual que el navegador) ===')
_, out, _ = client.exec_command('''curl -sk -X PUT https://api-geocampus.unap.cl/buildings/47 \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "nombre_edificio=Arancel+y+Cobranza&acronimo=Arancel+y+Cobranza&descripcion=TEST+DESCRIPTION+FIX&cord_latitud=-20.24228746&cord_longitud=-70.14198124&disponibilidad=Disponible&estado=true" \
  2>&1''')
result = out.read().decode('utf-8', errors='replace')
print(result)

# Ver si quedo guardado
print('\n=== VERIFICAR QUE SE GUARDO ===')
_, out, _ = client.exec_command('curl -sk https://api-geocampus.unap.cl/buildings 2>&1 | python3 -c "import sys,json; data=json.load(sys.stdin); b=[x for x in data[\'data\'] if x[\'id_edificio\']==47]; print(b[0][\'descripcion\'] if b else \'not found\')"')
print(out.read().decode('utf-8', errors='replace'))

# Ver los logs en el momento (para ver si el PUT se registró)
print('\n=== LOGS RECIENTES TRAS EL PUT ===')
_, out, _ = client.exec_command('tail -5 /home/geocampus/.pm2/logs/api-geocampus-out-1.log')
print(out.read().decode('utf-8', errors='replace'))
_, out, _ = client.exec_command('tail -5 /home/geocampus/.pm2/logs/api-geocampus-error-1.log')
print('ERROR LOG:', out.read().decode('utf-8', errors='replace'))

client.close()
