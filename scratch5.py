import re
import difflib

def parse_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    lines = content.split('\n')
    questions = []
    
    for line in lines:
        match = re.match(r'^\s*([A-Za-z]+\.\s*\d+|[IVX]+\.?\s*\d+|[IVX]+\.|\d+\.)\s*(.*)', line)
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

# Use the original index_backup.html or the newly written one, doesn't matter because the non-matched ones still have no numbers.
# Wait, let's restore from index_backup.html? We didn't make a backup! But wait, we can just replace the ones that still don't have numbers.
with open('/home/leandro/Programacion/Radioaficionados/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

def replace_question(match):
    full_str = match.group(0)
    q_text = match.group(1).strip()
    
    if re.match(r'^[A-Za-zIVX\d]+\.', q_text):
        # Already replaced!
        return full_str
        
    c_text = clean_text(q_text)
    qid = None
    
    if c_text in tec_dict:
        qid = tec_dict[c_text]
    elif c_text in reg_dict:
        qid = reg_dict[c_text]
    else:
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
        return full_str

new_html = re.sub(r'PREGUNTA:\s*(.*?)(?=\\n)', replace_question, html)

print("Modified count:", len(re.findall(r'PREGUNTA:\s*([A-Za-zIVX\d]+\.)', new_html)))

with open('/home/leandro/Programacion/Radioaficionados/index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

