import re

def parse_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We want to match lines that look like:
    # "    1. ¿Con qué elemento..." -> ID "1", Text "¿Con qué elemento..."
    # "        I.1 ¿Cuál es..." -> ID "I.1", Text "¿Cuál es..."
    # "    IX. 9 ¿Cómo se debe..." -> ID "IX. 9", Text "¿Cómo se debe..."
    # Let's extract them
    lines = content.split('\n')
    questions = []
    
    # Regex to match leading spaces, an ID, and then the question text
    # The ID can be numbers, roman numerals, dots, spaces, etc.
    # Usually followed by a question mark or similar?
    # Let's try matching: leading spaces, (Roman Numerals or Digits + Dots and Spaces), Question Text.
    # Specifically looking for the first line of a question.
    for line in lines:
        match = re.match(r'^\s*([IVX]+\.?\s*\d+|[IVX]+\.|\d+\.)\s*(.*?\?)', line)
        if match:
            qid = match.group(1).strip()
            text = match.group(2).strip()
            questions.append((qid, text))
        else:
            match = re.match(r'^\s*([IVX]+\.?\s*\d+|[IVX]+\.|\d+\.)\s*(.*)', line)
            if match and "PREGUNTA:" not in line and "CORRECTA:" not in line:
                # Let's print some to see
                qid = match.group(1).strip()
                text = match.group(2).strip()
                if len(text) > 5 and not text.startswith(('a)', 'b)', 'c)', 'd)')):
                    questions.append((qid, text))

    return questions

tec = parse_file('/home/leandro/Programacion/Radioaficionados/data/tecnica.txt')
reg = parse_file('/home/leandro/Programacion/Radioaficionados/data/reglamentacion.txt')

print("Tecnica questions found:", len(tec))
for q in tec[:5]: print(q)
print("\nReglamentacion questions found:", len(reg))
for q in reg[:5]: print(q)

