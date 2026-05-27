#!/usr/bin/env node
/**
 * Regenera explicaciones técnicas en tecnica.clean.txt (reemplaza textos genéricos).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const EXPL_BY_ID = require('./tecnica_explanations_map.js');

const DATA = __dirname;
const GENERIC_RE = /fundamentos fundamentales|físicamente viable|opción seleccionada como correcta es la única|explicación técnica pendiente/i;

function isGenericExpl(s) {
    return !s || !s.trim() || GENERIC_RE.test(s);
}

function parseBlocks(text) {
    return text.split('---').filter(b => b.trim()).map(block => {
        const q = { id: '', text: '', opts: [], correct: [], expl: '' };
        let inExpl = false;
        block.trim().split('\n').forEach(l => {
            l = l.trim();
            if (!l) return;
            if (l.startsWith('PREGUNTA:')) {
                const full = l.slice(9).trim();
                const i = full.indexOf('|');
                q.id = (i >= 0 ? full.slice(0, i) : full).trim();
                q.text = (i >= 0 ? full.slice(i + 1) : '').replace(/\s+/g, ' ').trim();
                inExpl = false;
            } else if (l.startsWith('CORRECTA:')) {
                q.correct = l.slice(9).split(',').map(s => s.trim().toUpperCase());
                inExpl = false;
            } else if (l.startsWith('EXPLICACION:')) inExpl = true;
            else if (l.match(/^[A-Z]\)/)) { q.opts.push({ letter: l[0], text: l.slice(2).trim() }); inExpl = false; }
            else if (inExpl) q.expl += (q.expl ? ' ' : '') + l;
        });
        return q;
    }).filter(q => q.id && q.opts.length);
}

function explainQuestion(q) {
    if (EXPL_BY_ID[q.id]) return EXPL_BY_ID[q.id];
    const parts = [];
    q.correct.forEach(L => {
        const o = q.opts.find(x => x.letter === L);
        if (o) parts.push(`**${L})** Correcta: ${o.text.trim()}`);
    });
    q.opts.filter(o => !q.correct.includes(o.letter)).forEach(o => {
        parts.push(`**${o.letter})** Incorrecta.`);
    });
    return parts.join(' ');
}

function updateTecnicaFile() {
    const pathTxt = path.join(DATA, 'tecnica.clean.txt');
    let content = fs.readFileSync(pathTxt, 'utf8');
    const blocks = content.split('---');
    let updated = 0;
    let kept = 0;

    const newBlocks = blocks.map(block => {
        if (!block.trim()) return block;
        const q = parseBlocks(block + '---')[0];
        if (!q) return block;

        const mapped = EXPL_BY_ID[q.id];
        if (!mapped && !isGenericExpl(q.expl)) {
            kept++;
            return block;
        }

        const expl = explainQuestion(q);
        updated++;
        const parts = block.split('EXPLICACION:');
        if (parts.length < 2) return block;
        return parts[0] + 'EXPLICACION:\n' + expl + '\n';
    });

    fs.writeFileSync(pathTxt, newBlocks.join('---'), 'utf8');

    const regl = fs.existsSync(path.join(DATA, 'reglamentacion.clean.txt'))
        ? fs.readFileSync(path.join(DATA, 'reglamentacion.clean.txt'), 'utf8')
        : '';
    fs.writeFileSync(
        path.join(DATA, 'questions.js'),
        `const TECNICA_DATA = ${JSON.stringify(newBlocks.join('---'))};\nconst REGLAMENTACION_DATA = ${JSON.stringify(regl)};\n`
    );

    console.log(`✅ tecnica.clean.txt: ${updated} actualizadas, ${kept} sin cambios.`);
}

updateTecnicaFile();
