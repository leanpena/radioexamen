import re

with open('/home/leandro/Programacion/Radioaficionados/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add CSS for .selected
if '.opt-btn.selected' not in html:
    html = html.replace('.opt-btn:hover:not([disabled]) { border-color:#4f46e5; border-color:var(--primary); background:rgba(79,70,229,0.04); }',
                        '.opt-btn:hover:not([disabled]) { border-color:#4f46e5; border-color:var(--primary); background:rgba(79,70,229,0.04); }\n.opt-btn.selected { border-color:#4f46e5; border-color:var(--primary); background:rgba(79,70,229,0.08); }')

# 2. Add selectedOptions to quiz state
if 'selectedOptions: []' not in html:
    html = html.replace("startMs:0, timer:null, reviewN:'all', practiceCount:'all'\n};",
                        "startMs:0, timer:null, reviewN:'all', practiceCount:'all',\n    selectedOptions: []\n};")

# 3. Update renderQuestion
render_old = """    $('q-feedback').style.display = 'none';
    $('q-feedback').className = 'feedback-box';
    $('btn-next').style.display = 'none';
}"""
render_new = """    $('q-feedback').style.display = 'none';
    $('q-feedback').className = 'feedback-box';
    $('btn-next').style.display = 'none';
    const btnConfirm = $('btn-confirm');
    if (btnConfirm) {
        btnConfirm.style.display = 'block';
        btnConfirm.disabled = true;
        btnConfirm.style.opacity = '0.5';
        btnConfirm.onclick = () => confirmAnswer(q);
    }
}"""
html = html.replace(render_old, render_new)

# 4. In renderQuestion, change selectAnswer to toggleOption and clear selectedOptions
html = html.replace("quiz.questions[quiz.idx];\n    $('q-cat')", "quiz.questions[quiz.idx];\n    quiz.selectedOptions = [];\n    $('q-cat')")
html = html.replace("b.onclick = () => selectAnswer(o.letter, b, q);", "b.onclick = () => toggleOption(o.letter, b);")

# 5. Replace selectAnswer and showFeedback
answer_logic_old = """function selectAnswer(letter, btn, q) {
    if ($('btn-next').style.display === 'block') return;

    const ok = q.correct.includes(letter);
    btn.classList.add(ok ? 'correct' : 'wrong');
    btn.disabled = true;

    document.querySelectorAll('.opt-btn').forEach(b => {
        b.disabled = true;
        if (q.correct.includes(b.dataset.letter) && !ok) b.classList.add('correct');
    });

    if (ok) {
        quiz.correct++;
        if (quiz.mode === 'review') {
            state.errors = state.errors.filter(e => e.text !== q.text);
        }
    } else {
        quiz.wrong++;
        if (!state.errors.find(e => e.text === q.text)) state.errors.push(q);
    }

    showFeedback(ok, letter, q);
    saveState();
    updateHomeCounts();
}

function showFeedback(ok, selected, q) {
    const fb = $('q-feedback');
    fb.style.display = 'block';
    fb.className = 'feedback-box ' + (ok ? 'ok' : 'bad');

    const selOpt  = q.opts.find(o => o.letter === selected);
    const corrOpt = q.opts.find(o => q.correct.includes(o.letter));
    const hasExpl = q.expl && !q.expl.toLowerCase().includes('pendiente');

    if (ok) {
        $('fb-title').textContent = '✅ ¡Correcto!';
        $('fb-text').textContent  = hasExpl ? q.expl
            : `La opción ${q.correct.join('/')} es la respuesta oficial según el reglamento argentino de radioaficionados.`;
    } else {
        $('fb-title').textContent = '❌ Respuesta incorrecta';
        let msg = '';
        if (selOpt)  msg += `"${selOpt.text}" no es correcta. `;
        if (corrOpt) msg += `La respuesta correcta es la ${q.correct.join('/')}: "${corrOpt.text}". `;
        msg += hasExpl ? q.expl : 'Esta es la respuesta indicada en el reglamento oficial de radioaficionados de Argentina.';
        $('fb-text').textContent = msg;
    }
    $('btn-next').style.display = 'block';
}"""

answer_logic_new = """function toggleOption(letter, btn) {
    if ($('btn-next').style.display === 'block') return;
    
    const idx = quiz.selectedOptions.indexOf(letter);
    if (idx === -1) {
        quiz.selectedOptions.push(letter);
        btn.classList.add('selected');
    } else {
        quiz.selectedOptions.splice(idx, 1);
        btn.classList.remove('selected');
    }
    
    const btnConfirm = $('btn-confirm');
    if (btnConfirm) {
        if (quiz.selectedOptions.length > 0) {
            btnConfirm.disabled = false;
            btnConfirm.style.opacity = '1';
        } else {
            btnConfirm.disabled = true;
            btnConfirm.style.opacity = '0.5';
        }
    }
}

function confirmAnswer(q) {
    if ($('btn-next').style.display === 'block') return;
    if (quiz.selectedOptions.length === 0) return;
    
    const btnConfirm = $('btn-confirm');
    if (btnConfirm) btnConfirm.style.display = 'none';

    const correctSorted = [...q.correct].sort();
    const selectedSorted = [...quiz.selectedOptions].sort();
    const ok = (correctSorted.length === selectedSorted.length) && correctSorted.every((val, i) => val === selectedSorted[i]);

    document.querySelectorAll('.opt-btn').forEach(b => {
        b.disabled = true;
        b.classList.remove('selected');
        if (q.correct.includes(b.dataset.letter)) {
            b.classList.add('correct');
        } else if (quiz.selectedOptions.includes(b.dataset.letter)) {
            b.classList.add('wrong');
        }
    });

    if (ok) {
        quiz.correct++;
        if (quiz.mode === 'review') {
            state.errors = state.errors.filter(e => e.text !== q.text);
        }
    } else {
        quiz.wrong++;
        if (!state.errors.find(e => e.text === q.text)) state.errors.push(q);
    }

    showFeedback(ok, q);
    saveState();
    updateHomeCounts();
}

function showFeedback(ok, q) {
    const fb = $('q-feedback');
    fb.style.display = 'block';
    fb.className = 'feedback-box ' + (ok ? 'ok' : 'bad');

    const hasExpl = q.expl && !q.expl.toLowerCase().includes('pendiente');

    if (ok) {
        $('fb-title').textContent = '✅ ¡Correcto!';
        $('fb-text').textContent  = hasExpl ? q.expl
            : `La/s opción/es ${q.correct.join(', ')} es/son la respuesta oficial según el reglamento argentino de radioaficionados.`;
    } else {
        $('fb-title').textContent = '❌ Respuesta incorrecta';
        let msg = '';
        msg += `La respuesta correcta es: ${q.correct.join(', ')}. `;
        msg += hasExpl ? q.expl : 'Esta es la respuesta indicada en el reglamento oficial de radioaficionados de Argentina.';
        $('fb-text').textContent = msg;
    }
    $('btn-next').style.display = 'block';
}"""

html = html.replace(answer_logic_old, answer_logic_new)

# 6. Update Keyboard Handler
kb_old = """    if (e.key === 'Enter') {
        const nb = $('btn-next');
        if (nb && nb.style.display !== 'none') nextQuestion();
    }"""
kb_new = """    if (e.key === 'Enter') {
        const nb = $('btn-next');
        const cb = $('btn-confirm');
        if (nb && nb.style.display !== 'none') {
            nextQuestion();
        } else if (cb && cb.style.display !== 'none' && !cb.disabled) {
            cb.click();
        }
    }"""
html = html.replace(kb_old, kb_new)

with open('/home/leandro/Programacion/Radioaficionados/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
