'use strict';
// RadioExamen Argentina — Leandro Pena / Radio Club Miramar LU7DZL

// ── Storage ──────────────────────────────────────────────────────────
const DB = {
    _p: 'rexm5_',
    get(k, def) {
        try {
            const v = localStorage.getItem(this._p + k);
            if (!v || v === 'null' || v === 'undefined') return def;
            return JSON.parse(v) || def;
        } catch (e) {
            console.warn('DB.get error:', e);
            return def;
        }
    },
    set(k, v) { try { localStorage.setItem(this._p + k, JSON.stringify(v)); } catch (e) { console.warn('DB.set error:', e); } }
};

// ── State ─────────────────────────────────────────────────────────────
const state = {
    cfg:         DB.get('cfg',  { dark:false, sound:true, timer:true, regTier:'general' }),
    stats:       DB.get('stats',{ exams:0, avg:0, streak:0 }),
    examHistory: DB.get('ehist',[]),
    practHistory:DB.get('phist',[]),
    errors:      DB.get('errs', []),
    favs:        DB.get('favs', []),
    achs:        DB.get('achs', []),
};
function saveState() {
    DB.set('cfg',   state.cfg);
    DB.set('stats', state.stats);
    DB.set('ehist', state.examHistory);
    DB.set('phist', state.practHistory);
    DB.set('errs',  state.errors);
    DB.set('favs',  state.favs);
    DB.set('achs',  state.achs);
}

// ── Quiz session ──────────────────────────────────────────────────────
let quiz = {
    questions:[], idx:0, mode:'', correct:0, wrong:0,
    startMs:0, timer:null, reviewN:'all', practiceCount:'all',
    selectedOptions: []
};

// ── DOM helpers ───────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const q$ = sel => document.querySelector(sel);
const show = id => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    window.scrollTo(0,0);
};

// ── Custom Modal ──────────────────────────────────────────────────────
function showModal(title, msg, okLabel, cancelLabel, onOk) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:fixed;inset:0;z-index:9000;
        background:rgba(0,0,0,0.5);
        display:flex;align-items:center;justify-content:center;padding:1.5rem;
    `;
    const box = document.createElement('div');
    box.style.cssText = `
        background:var(--card,#fff);color:var(--text,#1f2937);
        border-radius:20px;padding:2rem;max-width:340px;width:100%;
        box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;
    `;
    box.innerHTML = `
        <div style="font-size:2.5rem;margin-bottom:0.75rem">⚠️</div>
        <h3 style="font-size:1.2rem;font-weight:900;margin-bottom:0.5rem">${title}</h3>
        <p style="font-size:0.9rem;color:var(--muted,#6b7280);margin-bottom:1.5rem">${msg}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <button id="m-cancel" style="background:transparent;border:2px solid var(--border,#e5e7eb);padding:0.75rem;border-radius:12px;font-weight:800;cursor:pointer;color:var(--text,#1f2937)">${cancelLabel}</button>
            <button id="m-ok" style="background:var(--primary,#4f46e5);color:white;border:none;padding:0.75rem;border-radius:12px;font-weight:800;cursor:pointer">${okLabel}</button>
        </div>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    const close = () => document.body.removeChild(overlay);
    document.getElementById('m-cancel').onclick = close;
    document.getElementById('m-ok').onclick = () => { close(); onOk(); };
    overlay.onclick = e => { if(e.target===overlay) close(); };
}

// ── Theme ─────────────────────────────────────────────────────────────
function applyTheme() {
    const dark = state.cfg.dark;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
    const btn = $('btn-theme');
    if (btn) btn.textContent = dark ? '☀️' : '🌙';
    const sw = $('sw-dark');
    if (sw) sw.checked = dark;
}

// ── Parse questions ───────────────────────────────────────────────────
function parseQuestions(raw, cat) {
    if (!raw) return [];
    let qs = raw.split('---').filter(b => b.trim()).map(b => {
        const lines = b.trim().split('\n');
        const q = { id:'', text:'', opts:[], correct:[], expl:'', cat, optExpl:{} };
        let inExpl = false;
        lines.forEach(l => {
            l = l.trim();
            if (!l) return;
            const opcionM = l.match(/^OPCION\s+([A-Z])\s*:\s*(.*)$/i);
            if (opcionM) {
                inExpl = false;
                q.optExpl[opcionM[1].toUpperCase()] = opcionM[2].trim();
                return;
            }
            if (l.startsWith('PREGUNTA:'))  { 
                const full = l.slice(9).trim();
                const pipeIdx = full.indexOf('|');
                if (pipeIdx !== -1) {
                    q.id = full.substring(0, pipeIdx).trim();
                    q.text = full.substring(pipeIdx + 1).trim();
                } else {
                    // Fallback for old format or missing pipe
                    q.text = full;
                }
                inExpl = false; 
            }
            else if (l.startsWith('CORRECTA:')) { q.correct = l.slice(9).trim().split(',').map(s=>s.trim().toUpperCase()); inExpl=false; }
            else if (l.startsWith('EXPLICACION:')) { inExpl=true; }
            else if (l.match(/^[A-Z]\)/)) { q.opts.push({ letter:l[0], text:l.slice(2).trim() }); inExpl=false; }
            else if (inExpl && l.length > 2) { q.expl += (q.expl?' ':'')+l; }
        });
        return q;
    }).filter(q => q.text && q.opts.length > 0);
    return qs;
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Convierte **negrita** del banco a <strong>; escapa el resto. */
function mdLite(s) {
    if (!s) return '';
    return escapeHtml(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

/** Tipo de bloque del banco de reglamentación (PB = plan general; PBN/PBG/PBS por categoría). */
function regBlockKind(id) {
    const u = (id || '').trim().toUpperCase();
    if (/^PBS\./.test(u)) return 'pbs';
    if (/^PBG\./.test(u)) return 'pbg';
    if (/^PBN\./.test(u)) return 'pbn';
    if (/^PB\./.test(u)) return 'pb';
    if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII)\.\d+/.test(u)) return 'roman';
    return 'other';
}

/** Filtra reglamentación: cap. I–XIII + PB en todas; PBN en Nov/Gen/Sup; PBG en Gen/Sup; PBS solo Superior. */
function filterRegByLicenseTier(questions, tier) {
    const t = tier || 'superior';
    return questions.filter(q => {
        const k = regBlockKind(q.id);
        if (k === 'roman' || k === 'pb') return true;
        if (k === 'pbn') return t === 'novicio' || t === 'general' || t === 'superior';
        if (k === 'pbg') return t === 'general' || t === 'superior';
        if (k === 'pbs') return t === 'superior';
        return false;
    });
}

function getActiveRegTier() {
    const active = q$('.toggle-reg-tier.active, .toggle-reg-tier-exam.active');
    return (active && active.dataset.regTier) || state.cfg.regTier || 'general';
}

function updateRegTierBlockVisibility() {
    const block = $('block-reg-tier');
    if (!block) return;
    const cat = q$('.toggle-opt.active');
    block.style.display = (cat && cat.dataset.cat === 'reglamentacion') ? 'block' : 'none';
}

function syncRegTierButtons(tier) {
    document.querySelectorAll('.toggle-reg-tier, .toggle-reg-tier-exam').forEach(b => {
        b.classList.toggle('active', b.dataset.regTier === tier);
    });
}

function formatReglamentoCitation(q) {
    if (typeof REGLEMENTO_INDEX === 'undefined') return '';
    const ref = REGLEMENTO_INDEX[q.id];
    if (!ref || !ref.lines || !ref.lines.length) return '';
    let html = '<div class="expl-content" style="margin-top:0.65rem">';
    html += '<p style="font-weight:800;margin-bottom:0.45rem">📋 Reglamento General de Radioaficionados (Res. ENACOM 3635-E/2017)</p>';
    if (ref.chapter) html += '<p style="margin-bottom:0.2rem"><strong>' + escapeHtml(ref.chapter) + '</strong></p>';
    if (ref.section) html += '<p style="margin-bottom:0.5rem;font-size:0.88rem;opacity:0.85">Sección: ' + escapeHtml(ref.section) + '</p>';
    html += '<ul style="margin:0;padding:0 0 0 1.1rem;line-height:1.55;list-style:disc">';
    ref.lines.forEach(line => {
        html += '<li style="margin-bottom:0.4rem">' + mdLite(line) + '</li>';
    });
    html += '</ul></div>';
    return html;
}
const GENERIC_TECNICA_RE = /fundamentos fundamentales|físicamente viable|opción seleccionada como correcta es la única|fundamentos técnicos de la radioelectricidad/i;

function isGenericTechnicalExpl(expl) {
    const s = (expl || '').trim();
    return !s || GENERIC_TECNICA_RE.test(s);
}

function showFeedbackTecnica(ok, q) {
    const isMulti = q.correct.length > 1;
    const selected = [...(q.userSelected || quiz.selectedOptions || [])].sort();
    const explRaw = (q.expl || '').trim();
    const hasExpl = !isGenericTechnicalExpl(explRaw);

    let title = ok ? '✅ ¡Correcto!' : '❌ Respuesta incorrecta';
    if (!ok && isMulti) title = '❌ Faltaron opciones o hubo errores';
    $('fb-title').textContent = title;

    let html = '';
    if (!ok) {
        html += `<p style="margin-bottom:0.5rem"><strong>La respuesta correcta es:</strong> <span class="badge-correct">${q.correct.join(', ')}</span></p>`;
        if (selected.length) html += `<p style="margin-bottom:0.5rem">Marcaste: <strong>${selected.join(', ')}</strong></p>`;
    } else if (isMulti) {
        html += `<p style="margin-bottom:0.5rem">Opciones correctas: <strong>${q.correct.join(', ')}</strong></p>`;
    }

    if (hasExpl) {
        html += '<div class="expl-content"><p style="font-weight:800;margin-bottom:0.4rem">Explicación</p><p>' + mdLite(explRaw) + '</p></div>';
    } else {
        html += '<p style="margin-top:0.5rem;font-weight:800">Opciones</p><ul style="margin:0.35rem 0 0 1.1rem;padding:0">';
        (q.opts || []).forEach(o => {
            const mark = q.correct.includes(o.letter) ? 'Correcta' : 'Incorrecta';
            html += `<li style="margin-bottom:0.35rem"><strong>${o.letter})</strong> ${mdLite(o.text)} — <em>${mark}</em></li>`;
        });
        html += '</ul>';
    }

    $('fb-text').innerHTML = html;
    $('btn-next').style.display = 'block';
}

function showFeedbackReglamentacion(ok, q) {
    const isMulti = q.correct.length > 1;
    const selected = [...(q.userSelected || quiz.selectedOptions || [])].sort();

    let title = ok ? '✅ ¡Correcto!' : '❌ Respuesta incorrecta';
    if (!ok && isMulti) title = '❌ Faltaron opciones o hubo errores';
    $('fb-title').textContent = title;

    let html = '';
    if (!ok) {
        html += `<p style="margin-bottom:0.5rem"><strong>La respuesta correcta es:</strong> <span class="badge-correct">${q.correct.join(', ')}</span></p>`;
        if (selected.length) html += `<p style="margin-bottom:0.5rem">Marcaste: <strong>${selected.join(', ')}</strong></p>`;
    } else if (isMulti) {
        html += `<p style="margin-bottom:0.5rem">Opciones correctas: <strong>${q.correct.join(', ')}</strong></p>`;
    }

    const cit = formatReglamentoCitation(q);
    html += cit || '<p class="expl-generic">No se localizó el artículo en el reglamento para esta pregunta.</p>';

    $('fb-text').innerHTML = html;
    $('btn-next').style.display = 'block';
}

function mergedOptExplMap(q) {
    const expl = (q.expl || '').trim();
    const fromFile = { ...(q.optExpl || {}) };
    const derived = {};
    const re = /\*\*[^*]+\*\*\s*\(([A-Z])\)/g;
    const hits = [];
    let m;
    while ((m = re.exec(expl)) !== null) hits.push({ i: m.index, letter: m[1] });
    for (let i = 0; i < hits.length; i++) {
        const end = i + 1 < hits.length ? hits[i + 1].i : expl.length;
        const frag = expl.slice(hits[i].i, end).trim();
        if (frag && !derived[hits[i].letter]) derived[hits[i].letter] = frag;
    }
    const letters = (q.opts || []).map(o => o.letter);
    const out = {};
    letters.forEach(L => {
        if (fromFile[L]) out[L] = fromFile[L];
        else if (derived[L]) out[L] = derived[L];
    });
    return out;
}

// ── Shuffle & Pick ────────────────────────────────────────────────────
function shuffle(arr) {
    const a = [...arr];
    for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
}
function pick(arr, n) { return shuffle(arr).slice(0, Math.min(n, arr.length)); }

// ── Quiz Start ────────────────────────────────────────────────────────
function startQuiz(questions, mode) {
    quiz.questions = questions;
    quiz.idx = 0;
    quiz.mode = mode;
    quiz.correct = 0;
    quiz.wrong = 0;
    quiz.startMs = Date.now();
    clearInterval(quiz.timer);
    const timerEl = $('q-timer');
    if (timerEl) timerEl.textContent = '00:00';
    if (state.cfg.timer) {
        quiz.timer = setInterval(() => {
            const s = Math.floor((Date.now()-quiz.startMs)/1000);
            const m = Math.floor(s/60), sec=s%60;
            if(timerEl) timerEl.textContent = `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
        }, 1000);
    }
    show('s-quiz');
    renderQuestion();
}

// ── Render Question ───────────────────────────────────────────────────
function renderQuestion() {
    const q = quiz.questions[quiz.idx];
    quiz.selectedOptions = [];
    const catText = q.cat === 'tecnica' ? '🛠️ TÉCNICA' : '⚖️ REGLAMENTACIÓN';
    $('q-cat').textContent = catText;
    $('q-text').textContent = `(Pregunta ${quiz.idx + 1}) ${q.id ? q.id + '. ' : ''}${q.text}`;
    $('q-prog').textContent = `${quiz.idx+1} / ${quiz.questions.length}`;
    $('q-fill').style.width = `${((quiz.idx+1)/quiz.questions.length)*100}%`;

    const isFav = state.favs.some(f => f.text === q.text);
    $('btn-fav').textContent = isFav ? '⭐' : '☆';

    const opts = $('q-opts');
    opts.innerHTML = '';
    q.opts.forEach(o => {
        const b = document.createElement('button');
        b.className = 'opt-btn';
        b.innerHTML = `<span class="opt-letter">${o.letter}</span> <span>${o.text}</span>`;
        b.dataset.letter = o.letter;
        b.onclick = () => toggleOption(o.letter, b);
        opts.appendChild(b);
    });

    $('q-feedback').style.display = 'none';
    $('q-feedback').className = 'feedback-box';
    $('btn-next').style.display = 'none';
    const btnConfirm = $('btn-confirm');
    if (btnConfirm) {
        btnConfirm.style.display = 'block';
        btnConfirm.disabled = true;
        btnConfirm.style.opacity = '0.5';
        btnConfirm.onclick = () => confirmAnswer(q);
    }
}

// ── Answer ────────────────────────────────────────────────────────────
function toggleOption(letter, btn) {
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

    q.userSelected = [...quiz.selectedOptions];
    q.isOk = ok;
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

    if (q.cat === 'reglamentacion') {
        showFeedbackReglamentacion(ok, q);
        return;
    }
    if (q.cat === 'tecnica') {
        showFeedbackTecnica(ok, q);
        return;
    }

    const explRaw = (q.expl || '').trim();
    const explLower = explRaw.toLowerCase();
    const hasExpl = explRaw && !explLower.includes('pendiente');
    const isMulti = q.correct.length > 1;
    const selected = [...(q.userSelected || quiz.selectedOptions || [])].sort();
    const optMap = mergedOptExplMap(q);
    const wrongPicked = selected.filter(l => !q.correct.includes(l));
    const mentionsNorma = explLower.includes('3635') || explLower.includes('enacom') || explLower.includes('reglament');

    let title = ok ? '✅ ¡Correcto!' : '❌ Respuesta incorrecta';
    if (!ok && isMulti) title = '❌ Faltaron opciones o hubo errores';
    $('fb-title').textContent = title;

    let html = '';

    if (q.cat === 'reglamentacion' && !mentionsNorma) {
        html += '<p class="expl-generic">Conforme a la reglamentación vigente (Resolución ENACOM 3635-E/2017 y normas que la complementan o modifican), la clave oficial del banco se interpreta en ese marco normativo.</p>';
    }

    if (!ok) {
        html += `<p style="margin-bottom:0.5rem"><strong>La respuesta correcta es:</strong> <span class="badge-correct">${q.correct.join(', ')}</span></p>`;
        html += `<p style="margin-bottom:0.5rem">Tus opciones: <strong>${selected.join(', ') || '—'}</strong></p>`;
    } else if (isMulti) {
        html += `<p style="margin-bottom:0.5rem"><strong>¡Muy bien!</strong> Todas las opciones correctas son: ${q.correct.join(', ')}. En esta pregunta el reglamento o el enunciado admiten más de una alternativa válida.</p>`;
    } else if (ok && selected.length) {
        html += `<p style="margin-bottom:0.5rem">Elegiste la opción <strong>${selected[0]}</strong>, que coincide con la clave oficial.</p>`;
    }

    if (!ok && wrongPicked.length) {
        html += '<p style="margin-top:0.75rem;font-weight:800">Por qué las opciones que marcaste no son la clave esperada</p>';
        html += '<ul style="margin:0.35rem 0 0.75rem 1.1rem;padding:0">';
        wrongPicked.forEach(L => {
            const piece = optMap[L];
            const o = (q.opts || []).find(x => x.letter === L);
            const label = o ? `<strong>${L})</strong> ${mdLite(o.text)}` : `<strong>${L})</strong>`;
            const why = piece
                ? mdLite(piece)
                : (q.cat === 'reglamentacion'
                    ? 'No forma parte de la combinación señalada como correcta en la clave oficial del examen conforme a la reglamentación aplicable al Servicio de Radioaficionados.'
                    : (hasExpl
                        ? 'No coincide con la clave oficial: compará con el fundamento de la opción correcta en esta misma pantalla.'
                        : 'No coincide con la clave oficial de esta pregunta; cuando no hay texto de banco, conviene repasar el tema en el material de estudio o la normativa.'));
            html += `<li style="margin-bottom:0.45rem">${label}<div style="margin-top:0.25rem">${why}</div></li>`;
        });
        html += '</ul>';
    }

    if (!ok || isMulti) {
        html += '<p style="margin-top:0.75rem;font-weight:800">Por qué la(s) respuesta(s) oficial(es) sí lo son</p>';
        html += '<ul style="margin:0.35rem 0 0.75rem 1.1rem;padding:0">';
        let embeddedFullExpl = false;
        [...q.correct].sort().forEach((L, idx) => {
            const piece = optMap[L];
            const o = (q.opts || []).find(x => x.letter === L);
            const label = o ? `<strong>${L})</strong> ${mdLite(o.text)}` : `<strong>${L})</strong>`;
            let why;
            if (piece) {
                why = mdLite(piece);
            } else if (hasExpl) {
                if (idx === 0) {
                    why = mdLite(explRaw);
                    embeddedFullExpl = true;
                } else {
                    why = '<span class="expl-generic">Lo anterior aplica también al resto de las opciones correctas de esta pregunta.</span>';
                }
            } else {
                why = q.cat === 'reglamentacion'
                    ? '<span class="expl-generic">Conforme a la reglamentación vigente (Resolución ENACOM 3635-E/2017), esta alternativa forma parte de la clave oficial del banco.</span>'
                    : '<span class="expl-generic">La clave técnica se basa en los fundamentos de la radioelectricidad y la electrónica aplicada.</span>';
            }
            html += `<li style="margin-bottom:0.45rem">${label}<div style="margin-top:0.25rem">${why}</div></li>`;
        });
        html += '</ul>';
        if (hasExpl && !embeddedFullExpl) {
            html += '<div class="expl-content"><p style="font-weight:800;margin-bottom:0.4rem">Fundamento (banco oficial)</p><p>' + mdLite(explRaw) + '</p></div>';
        } else if (!hasExpl) {
            const generic = q.cat === 'reglamentacion'
                ? 'Esta respuesta es conforme a la reglamentación vigente (Resolución ENACOM 3635-E/2017) del Servicio de Radioaficionados en Argentina.'
                : 'Esta respuesta se basa en los fundamentos técnicos de la radioelectricidad y electrónica aplicada.';
            html += `<p class="expl-generic">${generic}</p>`;
        }
    } else if (hasExpl) {
        html += '<div class="expl-content"><p style="font-weight:800;margin-bottom:0.4rem">Fundamento (banco oficial)</p><p>' + mdLite(explRaw) + '</p></div>';
    } else {
        const generic = q.cat === 'reglamentacion'
            ? 'Esta respuesta es conforme a la reglamentación vigente (Resolución ENACOM 3635-E/2017) del Servicio de Radioaficionados en Argentina.'
            : 'Esta respuesta se basa en los fundamentos técnicos de la radioelectricidad y electrónica aplicada.';
        html += `<p class="expl-generic">${generic}</p>`;
    }

    if (q.cat === 'reglamentacion') html += formatReglamentoCitation(q);

    $('fb-text').innerHTML = html;
    $('btn-next').style.display = 'block';
}

// ── Next & End ────────────────────────────────────────────────────────
function nextQuestion() {
    quiz.idx++;
    if (quiz.idx < quiz.questions.length) renderQuestion();
    else endQuiz();
}

function endQuiz() {
    clearInterval(quiz.timer);
    const sec   = Math.floor((Date.now()-quiz.startMs)/1000);
    const total = quiz.questions.length;
    const pct   = Math.round((quiz.correct/total)*100);
    const passed= quiz.correct >= Math.ceil(total*0.7);
    const entry = { 
        id: 'ex_' + Date.now(),
        date: new Date().toISOString(), 
        pct, passed, sec, ok:quiz.correct, total, mode:quiz.mode,
        questions: quiz.questions.map(q => ({
            id: q.id,
            cat: q.cat,
            text: q.text,
            opts: q.opts,
            correct: q.correct,
            expl: q.expl,
            userSelected: q.userSelected || [],
            isOk: q.isOk || false
        }))
    };
    
    quiz.lastEntry = entry;

    if (quiz.mode === 'exam') {
        state.stats.exams++;
        state.stats.avg = Math.round((state.stats.avg*(state.stats.exams-1)+pct)/state.stats.exams);
        passed ? state.stats.streak++ : (state.stats.streak=0);
        state.examHistory.unshift(entry);
        checkAchievements();
    } else if (quiz.mode === 'practice' || quiz.mode === 'daily' || quiz.mode === 'review' || quiz.mode === 'fav') {
        state.practHistory.unshift(entry);
    }
    saveState();

    $('res-emoji').textContent = passed ? '🏆' : (quiz.mode==='exam'?'📖':'🎯');
    $('res-title').textContent = quiz.mode==='exam' ? (passed?'¡Aprobado! 🎉':'No aprobado 😞')
                                                     : '¡Práctica finalizada! 🎯';
    $('res-sub').textContent   = `${quiz.correct} correctas de ${total} (${pct}%)`;
    $('res-pct').textContent   = pct+'%';
    $('res-time').textContent  = fmtTime(sec);
    $('res-ok').textContent    = `${quiz.correct}/${total}`;
    
    const btnPrint = $('btn-print-result');
    if (btnPrint) {
        btnPrint.style.display = (quiz.mode === 'exam' || quiz.mode === 'practice' || quiz.mode === 'daily') ? 'block' : 'none';
        btnPrint.onclick = () => printExam(quiz.lastEntry);
    }
    
    show('s-results');
}

function fmtTime(s) {
    return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}

// ── Config ────────────────────────────────────────────────────────────
function openConfig() {
    $('sw-dark').checked  = state.cfg.dark;
    $('sw-sound').checked = state.cfg.sound;
    $('sw-timer').checked = state.cfg.timer;
    $('cfg-overlay').classList.add('open');
}
function closeConfig() { $('cfg-overlay').classList.remove('open'); }

// ── Favorites ─────────────────────────────────────────────────────────
function toggleFav() {
    const q = quiz.questions[quiz.idx];
    const idx = state.favs.findIndex(f => f.text === q.text);
    if (idx === -1) state.favs.push(q); else state.favs.splice(idx,1);
    saveState();
    $('btn-fav').textContent = idx===-1 ? '⭐' : '☆';
    updateHomeCounts();
}

function showFavs() {
    const el = $('fav-list');
    if (state.favs.length === 0) {
        el.innerHTML = '<div class="empty"><div class="e-icon">⭐</div><p>No hay preguntas favoritas todavía.</p></div>';
    } else {
        el.innerHTML = state.favs.map((q,i) => `
            <div class="fav-card">
                <div class="fav-cat">${q.cat.toUpperCase()}</div>
                <p class="fav-q">${q.id ? q.id + '. ' : ''}${q.text}</p>
                <p class="fav-expl">${q.expl || 'Respuesta oficial del reglamento.'}</p>
                <button class="btn-fav-practice" onclick="startFavQuiz(${i})" style="
                    margin-top:0.75rem;background:var(--primary,#4f46e5);color:white;
                    border:none;padding:0.5rem 1rem;border-radius:10px;
                    font-weight:700;cursor:pointer;font-size:0.85rem
                ">📝 Responder esta pregunta</button>
            </div>
`).join('');
    }
    show('s-favs');
}

function startFavQuiz(idx) {
    startQuiz([state.favs[idx]], 'fav');
}

// ── Stats ─────────────────────────────────────────────────────────────
function buildHistoryHTML(items, listType, emptyMsg) {
    if (!items || items.length === 0)
        return `<div class="empty"><div class="e-icon">📊</div><p>${emptyMsg}</p></div>`;
    return items.slice(0,30).map(h => `
        <div class="hist-item ${h.passed?'pass':'fail'}" style="display:flex; justify-content:space-between; align-items:center;">
            <div style="flex:1;">
                <div class="hist-pct">${h.pct}% · ${h.ok}/${h.total}</div>
                <div class="hist-date">${new Date(h.date).toLocaleDateString('es-AR')} ${new Date(h.date).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
            <div style="display:flex; align-items:center; gap:0.4rem;">
                <div style="font-size:1.1rem">${h.passed?'✅':'❌'}</div>
                ${h.questions ? `<button onclick="printExamId('${h.id}')" class="icon-btn-small" title="Descargar PDF">📄</button>` : ''}
                <button onclick="deleteHistoryItem('${h.id}', '${listType}')" class="icon-btn-small" style="color:#ef4444;" title="Borrar">🗑️</button>
            </div>
        </div>`).join('');
}

function showStats() {
    $('st-exams').textContent  = state.stats.exams;
    $('st-avg').textContent    = state.stats.avg + '%';
    $('st-streak').textContent = state.stats.streak;
    $('hist-exam-list').innerHTML    = buildHistoryHTML(state.examHistory,  'exam',  'Sin exámenes rendidos aún.');
    $('hist-practice-list').innerHTML= buildHistoryHTML(state.practHistory, 'pract', 'Sin prácticas realizadas aún.');
    // Reset tabs to first tab
    document.querySelectorAll('.tab-btn').forEach((b,i) =>
        b.classList.toggle('active', i===0));
    document.querySelectorAll('.tab-panel').forEach((p,i) =>
        p.classList.toggle('active', i===0));
    show('s-stats');
}

function deleteHistoryItem(id, listType) {
    if (!confirm('¿Seguro que querés borrar este registro?')) return;
    if (listType === 'exam') {
        state.examHistory = state.examHistory.filter(h => h.id !== id);
    } else {
        state.practHistory = state.practHistory.filter(h => h.id !== id);
    }
    saveState();
    showStats();
}

function clearAllHistory(listType) {
    const msg = listType === 'exam' ? 'TODOS los exámenes' : 'TODAS las prácticas';
    if (!confirm(`¿Seguro que querés borrar ${msg}? Esta acción no se puede deshacer.`)) return;
    
    if (listType === 'exam') {
        state.examHistory = [];
        state.stats.exams = 0;
        state.stats.avg = 0;
        state.stats.streak = 0;
    } else {
        state.practHistory = [];
    }
    saveState();
    showStats();
}

// ── Achievements ──────────────────────────────────────────────────────
function checkAchievements() {
    const defs = [
        { id:'first',  title:'Primer Examen 🎉',  check:()=> state.stats.exams>=1 },
        { id:'pass1',  title:'¡Aprobado! 🏆',      check:()=> state.examHistory.some(h=>h.passed) },
        { id:'str3',   title:'Racha de 3 🔥',       check:()=> state.stats.streak>=3 },
    ];
    defs.forEach(d => {
        if (!state.achs.includes(d.id) && d.check()) {
            state.achs.push(d.id); saveState(); showToast(d.title);
        }
    });
}

function showToast(title) {
    $('toast-title').textContent = title;
    const t = $('toast-ach');
    t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'), 3500);
}

// ── Home counts ───────────────────────────────────────────────────────
function updateHomeCounts() {
    $('txt-errors').textContent = `${state.errors.length} errores guardados`;
    $('txt-favs').textContent   = `${state.favs.length} preguntas favoritas`;
}

// ── Keyboard ──────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if (!document.getElementById('s-quiz').classList.contains('active')) return;
    const k = e.key.toLowerCase();
    if (['a','b','c','d','e'].includes(k)) {
        const btn = document.querySelector(`.opt-btn[data-letter="${k.toUpperCase()}"]`);
        if (btn && !btn.disabled) btn.click();
    }
    if (e.key === 'Enter') {
        const nb = $('btn-next');
        const cb = $('btn-confirm');
        if (nb && nb.style.display !== 'none') {
            nextQuestion();
        } else if (cb && cb.style.display !== 'none' && !cb.disabled) {
            cb.click();
        }
    }
    if (e.key === 'Escape') handleQuit();
});

// ── Quit handler ──────────────────────────────────────────────────────
function handleQuit() {
    showModal(
        '¿Salir del quiz?',
        `Llevas ${quiz.idx} pregunta(s) respondidas. Si salís ahora, el progreso de esta sesión no se guardará.`,
        '😢 Sí, salir',
        '💪 Continuar',
        () => { clearInterval(quiz.timer); show('s-home'); }
    );
}

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
        
        let explHtml = '';
        if (q.expl && !q.expl.toLowerCase().includes('pendiente')) {
            explHtml = `<div class="print-expl"><strong>Explicación:</strong> ${q.expl}</div>`;
        }
        
        html += `
        <div class="print-q">
            <h3>(Pregunta ${i+1}) ${q.id ? q.id + '. ' : ''}${q.text}</h3>
            <div class="print-opts">
                ${q.opts.map(o => {
                    const isCorrect = q.correct.includes(o.letter);
                    const isSelected = q.userSelected.includes(o.letter);
                    let label = isCorrect ? ' [CORRECTA]' : '';
                    if (isSelected && !isCorrect) label += ' [TU ELECCIÓN - INCORRECTA]';
                    else if (isSelected && isCorrect) label += ' [TU ELECCIÓN]';
                    
                    let cls = isCorrect ? 'correct' : (isSelected ? 'selected-wrong' : '');
                    return `<div class="print-opt ${cls}">(${o.letter}) ${o.text}${label}</div>`;
                }).join('')}
            </div>
            ${explHtml}
        </div>
        `;
    });
    
    pa.innerHTML = html;
    window.print();
}

// ── Init ─────────────────────────────────────────────────────────────
window.onload = function() {
    console.log('RadioExamen: window.onload started');
    try {
        console.log('RadioExamen: applying theme...');
        applyTheme();
        console.log('RadioExamen: updating home counts...');
        updateHomeCounts();

        // Hide splash
        console.log('RadioExamen: setting splash timeout...');
        setTimeout(() => {
            const s = $('splash');
            if (s) {
                console.log('RadioExamen: hiding splash');
                s.style.opacity = '0';
                setTimeout(() => { s.style.display = 'none'; }, 400);
            }
        }, 600);

        // Failsafe: hide splash after 3 seconds no matter what
        setTimeout(() => {
            const s = $('splash');
            if (s && s.style.display !== 'none') {
                console.warn('RadioExamen: Failsafe hiding splash');
                s.style.display = 'none';
            }
        }, 3000);

        // Home
        $('btn-practice').onclick = () => {
            syncRegTierButtons(state.cfg.regTier || 'general');
            updateRegTierBlockVisibility();
            show('s-practice');
        };
        $('btn-exam').onclick = () => {
            syncRegTierButtons(state.cfg.regTier || 'general');
            show('s-exam-setup');
        };
        const startExam = () => {
            const tier = getActiveRegTier();
            state.cfg.regTier = tier;
            saveState();
            const t = parseQuestions(typeof TECNICA_DATA !== 'undefined' ? TECNICA_DATA : '', 'tecnica');
            let r = parseQuestions(typeof REGLAMENTACION_DATA !== 'undefined' ? REGLAMENTACION_DATA : '', 'reglamentacion');
            r = filterRegByLicenseTier(r, tier);
            startQuiz([...pick(t, 15), ...pick(r, 15)], 'exam');
        };
        if ($('btn-start-exam')) $('btn-start-exam').onclick = startExam;
        $('btn-daily').onclick = () => {
            const tier = state.cfg.regTier || 'general';
            const t = parseQuestions(typeof TECNICA_DATA !== 'undefined' ? TECNICA_DATA : '', 'tecnica');
            let r = parseQuestions(typeof REGLAMENTACION_DATA !== 'undefined' ? REGLAMENTACION_DATA : '', 'reglamentacion');
            r = filterRegByLicenseTier(r, tier);
            startQuiz(pick([...t, ...r], 10), 'daily');
        };
        $('btn-review').onclick = () => {
            if (state.errors.length===0){ showModal('Sin errores','¡No tenés errores guardados todavía! Completá alguna práctica primero.','OK','OK',()=>{}); return; }
            show('s-review');
        };
        $('btn-favs').onclick = showFavs;
        $('btn-stats').onclick = showStats;
        $('btn-cfg').onclick = openConfig;
        $('btn-theme').onclick = () => { state.cfg.dark=!state.cfg.dark; saveState(); applyTheme(); };

        // Back buttons
        document.querySelectorAll('.back-btn').forEach(b => b.onclick = ()=>show('s-home'));

        // Practice setup - category
        document.querySelectorAll('.toggle-opt').forEach(b => {
            b.onclick = () => {
                document.querySelectorAll('.toggle-opt').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                updateRegTierBlockVisibility();
            };
        });
        document.querySelectorAll('.toggle-reg-tier, .toggle-reg-tier-exam').forEach(b => {
            b.onclick = () => {
                syncRegTierButtons(b.dataset.regTier);
                state.cfg.regTier = b.dataset.regTier;
                saveState();
            };
        });
        updateRegTierBlockVisibility();
        syncRegTierButtons(state.cfg.regTier || 'general');
        // Practice count
        document.querySelectorAll('.count-pract').forEach(b => {
            b.onclick = () => { document.querySelectorAll('.count-pract').forEach(x=>x.classList.remove('active')); b.classList.add('active'); quiz.practiceCount=b.dataset.n; };
        });
        $('btn-start-practice').onclick = () => {
            const cat = q$('.toggle-opt.active').dataset.cat;
            const raw = cat==='tecnica'
                ? (typeof TECNICA_DATA!=='undefined'?TECNICA_DATA:'')
                : (typeof REGLAMENTACION_DATA!=='undefined'?REGLAMENTACION_DATA:'');
            let qs = parseQuestions(raw, cat);
            if (cat === 'reglamentacion') {
                const tier = getActiveRegTier();
                state.cfg.regTier = tier;
                saveState();
                qs = filterRegByLicenseTier(qs, tier);
            }
            if (q$('input[name="order"]:checked').value === 'rnd') qs = shuffle(qs);
            if (quiz.practiceCount !== 'all') qs = qs.slice(0, parseInt(quiz.practiceCount));
            startQuiz(qs, 'practice');
        };

        // Review setup - count
        document.querySelectorAll('.count-opt').forEach(b => {
            b.onclick = () => { document.querySelectorAll('.count-opt').forEach(x=>x.classList.remove('active')); b.classList.add('active'); quiz.reviewN=b.dataset.n; };
        });
        $('btn-start-review').onclick = () => {
            const n = quiz.reviewN==='all' ? state.errors.length : parseInt(quiz.reviewN);
            startQuiz(shuffle(state.errors).slice(0,n), 'review');
        };

        // Quiz controls
        $('btn-next').onclick     = nextQuestion;
        $('quiz-quit').onclick    = handleQuit;
        $('btn-fav').onclick      = toggleFav;
        $('btn-cfg-quiz').onclick = openConfig;

        // Results
        $('btn-home-result').onclick = () => show('s-home');
        $('btn-retry').onclick = () => {
            if (quiz.mode === 'exam') {
                if ($('btn-start-exam')) $('btn-start-exam').click();
                else $('btn-exam').click();
            } else show('s-home');
        };

        // Config
        $('cfg-close').onclick   = closeConfig;
        $('cfg-overlay').onclick = e => { if(e.target===$('cfg-overlay')) closeConfig(); };
        $('sw-dark').onchange    = () => { state.cfg.dark=$('sw-dark').checked; saveState(); applyTheme(); };
        $('sw-sound').onchange   = () => { state.cfg.sound=$('sw-sound').checked; saveState(); };
        $('sw-timer').onchange   = () => { state.cfg.timer=$('sw-timer').checked; saveState(); };
        $('btn-clear-errors').onclick = () => {
            showModal('¿Borrar errores?','Se eliminará todo tu historial de preguntas erróneas.','🗑️ Sí, borrar','Cancelar',()=>{
                state.errors=[]; saveState(); updateHomeCounts();
                showToast('Historial de errores borrado ✅');
            });
        };

        // Stats tabs
        document.querySelectorAll('.tab-btn').forEach(b =>
            b.onclick = () => {
                document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                const panel = $(b.dataset.tab);
                if (panel) panel.classList.add('active');
            }
        );

    } catch(err) {
        console.error('RadioExamen init error:', err);
        document.body.innerHTML = `<div style="padding:2rem;font-family:sans-serif;background:#fff;min-height:100vh">
            <h2 style="color:#ef4444">❌ Error al iniciar la aplicación</h2>
            <p style="margin-top:1rem">${err.message}</p>
            <p style="margin-top:0.5rem;color:#6b7280">Abrí la consola del navegador (F12) para más detalles.</p>
        </div>`;
    }
};
