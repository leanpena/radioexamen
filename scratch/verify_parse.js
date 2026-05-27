
const fs = require('fs');
const path = require('path');

// Mock a few things to make it run in node
const TECNICA_DATA = fs.readFileSync('data/reglamentacion.clean.txt', 'utf8');

function parseQuestions(raw, cat) {
    const questions = [];
    if (!raw) return questions;
    const blocks = raw.split('---');
    blocks.forEach(block => {
        const lines = block.split('\n');
        const q = { id:'', text:'', opts:[], correct:[], expl:'', cat };
        let inExpl = false;
        lines.forEach(l => {
            l = l.trim();
            if (!l) return;
            if (l.startsWith('PREGUNTA:'))  { 
                const full = l.slice(9).trim();
                const pipeIdx = full.indexOf('|');
                if (pipeIdx !== -1) {
                    q.id = full.substring(0, pipeIdx).trim();
                    q.text = full.substring(pipeIdx + 1).trim();
                } else {
                    q.text = full;
                }
                inExpl = false; 
            }
            else if (l.match(/^[A-Z]\)/)) { q.opts.push({ letter: l[0], text: l.slice(2).trim() }); inExpl = false; }
            else if (l.startsWith('CORRECTA:')) { q.correct = l.slice(9).split(',').map(s=>s.trim()); inExpl = false; }
            else if (l.startsWith('EXPLICACION:')) { inExpl = true; }
            else if (inExpl) { q.expl += (q.expl ? ' ' : '') + l; }
        });
        if (q.text) questions.push(q);
    });
    return questions;
}

const qs = parseQuestions(TECNICA_DATA, 'tecnica');
console.log('Total questions:', qs.length);
console.log('First question ID:', JSON.stringify(qs[0].id));
console.log('First question Text:', JSON.stringify(qs[0].text));
console.log('Sample question (III. 3):', qs.find(q => q.id.includes('III. 3')));
