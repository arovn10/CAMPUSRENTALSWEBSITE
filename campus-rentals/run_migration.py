import subprocess
import sys

# Read the SQL file
with open('prisma/add_old_debt_columns.sql', 'r') as f:
    sql = f.read()

# Run the SQL on the server
result = subprocess.run(
    ['ssh', '-i', r'..\campus-rentals\LightsailDefaultKey-us-east-1 (1).pem', 'bitnami@23.21.76.187', 
     f'cd ~/CAMPUSRENTALSWEBSITE/campus-rentals && echo "{sql}" | npx prisma db execute --stdin'],
    capture_output=True,
    text=True
)

print(result.stdout)
if result.stderr:
    print(result.stderr, file=sys.stderr)
sys.exit(result.returncode)
