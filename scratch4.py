import re

with open('/home/leandro/Programacion/Radioaficionados/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

questions = re.findall(r'PREGUNTA:\s*(.*?)(?=\\n)', html)
unmatched = [q for q in questions if not re.match(r'^[IVX\d]+\.', q)]
for i, q in enumerate(unmatched):
    print(f"Unmatched {i+1}: {q}")

