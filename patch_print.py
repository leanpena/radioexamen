import re

with open('/home/leandro/Programacion/Radioaficionados/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update CSS
css_patch = """
@media print {
    body { background: white !important; color: black !important; }
    .app, .config-overlay { display: none !important; }
    #print-area { display: block !important; position: absolute; left: 0; top: 0; width: 100%; font-family: sans-serif; }
    .print-q { margin-bottom: 2rem; page-break-inside: avoid; border-bottom: 1px solid #ccc; padding-bottom: 1rem; }
    .print-q h3 { font-size: 1.1rem; margin-bottom: 0.5rem; }
    .print-opts { margin-bottom: 0.5rem; }
    .print-opt { display: block; margin-bottom: 0.25rem; }
    .print-opt.selected-wrong { color: #d32f2f; font-weight: bold; text-decoration: line-through; }
    .print-opt.correct { color: #2e7d32; font-weight: bold; }
    .print-opt.selected-correct { color: #2e7d32; font-weight: bold; background: #e8f5e9; }
    .print-expl { font-style: italic; color: #555; background: #f5f5f5; padding: 0.5rem; border-radius: 4px; border-left: 4px solid #aaa; }
    .print-header { text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #000; padding-bottom: 1rem; }
    .print-header h1 { margin: 0; font-size: 1.8rem; }
    .print-header p { margin: 0.5rem 0 0; font-size: 1.1rem; }
}
"""
html = html.replace('</style>', css_patch + '\n</style>')

# 2. Add #print-area
html = html.replace('</div><!-- /.app -->', '</div><!-- /.app -->\n<div id="print-area" style="display:none;"></div>')

# 3. Add Print Button
html = html.replace('<button class="btn-main" id="btn-home-result">Volver al Inicio 🏠</button>', 
                    '<button class="btn-main" id="btn-home-result">Volver al Inicio 🏠</button>\n    <button class="btn-sec" id="btn-print-result" style="margin-top:0.5rem;display:none;">📄 Descargar PDF</button>')

# 4. Modify confirmAnswer to save answers on the question object
ans_old = """    if (ok) {
        quiz.correct++;"""
ans_new = """    q.userSelected = [...quiz.selectedOptions];
    q.isOk = ok;
    if (ok) {
        quiz.correct++;"""
html = html.replace(ans_old, ans_new)

# 5. Modify endQuiz to save the full questions AND show the print button
end_old = """    const entry = { date:new Date().toISOString(), pct, passed, sec, ok:quiz.correct, total, mode:quiz.mode };"""
end_new = """    const entry = { 
        id: 'ex_' + Date.now(),
        date: new Date().toISOString(), 
        pct, passed, sec, ok:quiz.correct, total, mode:quiz.mode,
        questions: quiz.questions.map(q => ({
            text: q.text,
            opts: q.opts,
            correct: q.correct,
            expl: q.expl,
            userSelected: q.userSelected || [],
            isOk: q.isOk || false
        }))
    };
    
    // Almacenamos el ultimo entry en quiz para el boton de imprimir actual
    quiz.lastEntry = entry;
"""
html = html.replace(end_old, end_new)

# Show/Hide the print button based on mode. Allow printing 'exam' and 'practice'.
end2_old = """    $('res-ok').textContent    = `${quiz.correct}/${total}`;
    show('s-results');"""
end2_new = """    $('res-ok').textContent    = `${quiz.correct}/${total}`;
    
    const btnPrint = $('btn-print-result');
    if (btnPrint) {
        btnPrint.style.display = (quiz.mode === 'exam' || quiz.mode === 'practice' || quiz.mode === 'daily') ? 'block' : 'none';
        btnPrint.onclick = () => printExam(quiz.lastEntry);
    }
    
    show('s-results');"""
html = html.replace(end2_old, end2_new)

# 6. Update buildHistoryHTML to add PDF button
hist_old = """        <div class="hist-item ${h.passed?'pass':'fail'}">
            <div>
                <div class="hist-pct">${h.pct}% · ${h.ok}/${h.total}</div>
                <div class="hist-date">${new Date(h.date).toLocaleDateString('es-AR')} ${new Date(h.date).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
            <div style="font-size:1.3rem">${h.passed?'✅':'❌'}</div>
        </div>"""
hist_new = """        <div class="hist-item ${h.passed?'pass':'fail'}" style="display:flex; justify-content:space-between; align-items:center;">
            <div style="flex:1;">
                <div class="hist-pct">${h.pct}% · ${h.ok}/${h.total}</div>
                <div class="hist-date">${new Date(h.date).toLocaleDateString('es-AR')} ${new Date(h.date).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
                <div style="font-size:1.3rem">${h.passed?'✅':'❌'}</div>
                ${h.questions ? `<button onclick="printExamId('${h.id}')" style="background:none;border:1px solid var(--border);border-radius:6px;padding:0.4rem;cursor:pointer;font-size:1rem;" title="Descargar PDF">📄</button>` : ''}
            </div>
        </div>"""
html = html.replace(hist_old, hist_new)

# 7. Add print logic script
print_logic = """
// ── Print Logic ───────────────────────────────────────────────────────
function printExamId(id) {
    const entry = state.examHistory.find(e => e.id === id) || state.practHistory.find(e => e.id === id);
    if (entry) printExam(entry);
}

function printExam(entry) {
    const pa = $('print-area');
    if (!pa || !entry.questions) return;
    
    const d = new Date(entry.date);
    const dateStr = d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
    const title = entry.mode === 'exam' ? 'Examen de Radioaficionado' : 'Práctica de Radioaficionado';
    const status = entry.passed ? '✅ APROBADO' : '❌ NO APROBADO';
    
    let html = `
        <div class="print-header">
            <h1>${title}</h1>
            <p><strong>Fecha:</strong> ${dateStr} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Puntaje:</strong> ${entry.pct}% (${entry.ok}/${entry.total}) &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Estado:</strong> ${status}</p>
        </div>
    `;
    
    entry.questions.forEach((q, i) => {
        let optsHtml = '';
        q.opts.forEach(o => {
            const isCorrect = q.correct.includes(o.letter);
            const isSelected = q.userSelected.includes(o.letter);
            
            let cls = '';
            let icon = '⬜ ';
            if (isCorrect && isSelected) { cls = 'correct'; icon = '✅ '; }
            else if (isCorrect && !isSelected) { cls = 'correct'; icon = '➡️ '; }
            else if (!isCorrect && isSelected) { cls = 'selected-wrong'; icon = '❌ '; }
            else { icon = '⬜ '; }
            
            optsHtml += `<div class="print-opt ${cls}">${icon}${o.letter}) ${o.text}</div>`;
        });
        
        let explHtml = '';
        if (q.expl && !q.expl.toLowerCase().includes('pendiente')) {
            explHtml = `<div class="print-expl"><strong>Explicación:</strong> ${q.expl}</div>`;
        }
        
        html += `
        <div class="print-q">
            <h3>Pregunta ${i+1}: ${q.text}</h3>
            <div class="print-opts">
                ${optsHtml}
            </div>
            ${explHtml}
        </div>
        `;
    });
    
    pa.innerHTML = html;
    
    // Trigger print
    window.print();
}
"""

html = html.replace('// ── Init ─────────────────────────────────────────────────────────────', print_logic + '\n// ── Init ─────────────────────────────────────────────────────────────')

with open('/home/leandro/Programacion/Radioaficionados/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
