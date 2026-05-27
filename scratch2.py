import re
import difflib

def parse_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    lines = content.split('\n')
    questions = []
    
    for line in lines:
        match = re.match(r'^\s*([IVX]+\.?\s*\d+|[IVX]+\.|\d+\.)\s*(.*)', line)
        if match and "PREGUNTA:" not in line and "CORRECTA:" not in line:
            qid = match.group(1).strip()
            text = match.group(2).strip()
            if len(text) > 5 and not text.lower().startswith(('a)', 'b)', 'c)', 'd)')):
                questions.append((qid, text))
    return questions

tec = parse_file('/home/leandro/Programacion/Radioaficionados/data/tecnica.txt')
reg = parse_file('/home/leandro/Programacion/Radioaficionados/data/reglamentacion.txt')

def clean_text(t):
    return re.sub(r'\s+', ' ', t).strip().lower()

tec_dict = {clean_text(t): qid for qid, t in tec}
reg_dict = {clean_text(t): qid for qid, t in reg}

with open('/home/leandro/Programacion/Radioaficionados/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

def replace_question(match):
    full_str = match.group(0)
    q_text = match.group(1).strip()
    
    # Try to find ID
    c_text = clean_text(q_text)
    qid = None
    
    # Is it in tec or reg?
    if c_text in tec_dict:
        qid = tec_dict[c_text]
    elif c_text in reg_dict:
        qid = reg_dict[c_text]
    else:
        # Fuzzy match
        all_texts = list(tec_dict.keys()) + list(reg_dict.keys())
        matches = difflib.get_close_matches(c_text, all_texts, n=1, cutoff=0.8)
        if matches:
            matched_text = matches[0]
            if matched_text in tec_dict:
                qid = tec_dict[matched_text]
            else:
                qid = reg_dict[matched_text]
    
    if qid:
        return f"PREGUNTA: {qid} {q_text}"
    else:
        print(f"NOT FOUND: {q_text}")
        return full_str

new_html = re.sub(r'PREGUNTA:\s*(.*)', replace_question, html)

# Let's see how many were changed
print("Original PREGUNTA count:", len(re.findall(r'PREGUNTA:', html)))
print("Modified PREGUNTA count with IDs:", len(re.findall(r'PREGUNTA:\s*([IVX\d]+\.)', new_html)))

with open('/home/leandro/Programacion/Radioaficionados/index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

