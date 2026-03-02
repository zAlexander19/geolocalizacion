import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.19.82.205', port=2200, username='geocampus', password='Thi4$f3kLgiT')

# Check API response times
endpoints = ['/api/buildings', '/api/rooms', '/api/bathrooms', '/api/faculties']
print("=== API Response Times (measured on server) ===")
for ep in endpoints:
    cmd = 'curl -s -o /dev/null -w "%{time_total}" http://localhost:3001' + ep
    _, stdout, _ = ssh.exec_command(cmd)
    result = stdout.read().decode().strip()
    print(f"{ep}: {result}s")

# Check if /api/floors endpoint exists (single call for all floors)
print("\n=== Checking /api/floors bulk endpoint ===")
cmd = 'curl -s -o /dev/null -w "%{http_code} %{time_total}" http://localhost:3001/api/floors'
_, stdout, _ = ssh.exec_command(cmd)
result = stdout.read().decode().strip()
print(f"/api/floors: {result}")

# Check how many buildings (to estimate N+1 severity)
print("\n=== Building count (N+1 severity) ===")
cmd = 'curl -s http://localhost:3001/api/buildings | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\'{len(d[\"data\"])} buildings -> {len(d[\"data\"])} extra /floors requests on load\')"'
_, stdout, stderr = ssh.exec_command(cmd)
print(stdout.read().decode().strip())

# Check PM2 logs for slow queries
print("\n=== Last 20 API log lines ===")
cmd = 'pm2 logs geocampus-api --lines 20 --nostream 2>/dev/null || tail -20 /var/log/geocampus/api.log 2>/dev/null || echo "no logs found"'
_, stdout, _ = ssh.exec_command(cmd)
print(stdout.read().decode().strip())

ssh.close()
