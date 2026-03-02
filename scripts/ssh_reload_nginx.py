import paramiko
import time

pw = 'Thi4$f3kLgiT'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('172.19.82.206', port=2200, username='geocampus', password=pw)

shell = c.invoke_shell()
time.sleep(1)

def send_wait(s, cmd, wait=2):
    s.send(cmd + '\n')
    time.sleep(wait)
    out = ''
    while s.recv_ready():
        out += s.recv(4096).decode('utf-8', errors='replace')
        time.sleep(0.3)
    return out

out = send_wait(shell, 'sudo systemctl reload nginx', 3)
if 'contraseña' in out or 'password' in out.lower():
    out2 = send_wait(shell, pw, 3)
    print('nginx reload:', out2[:200])
else:
    print('nginx reload:', out[:200])

out = send_wait(shell, 'sudo systemctl status nginx | grep Active', 2)
if 'contraseña' in out or 'password' in out.lower():
    out2 = send_wait(shell, pw, 2)
    print(out2[:200])
else:
    print(out[:200])

shell.close()
c.close()
