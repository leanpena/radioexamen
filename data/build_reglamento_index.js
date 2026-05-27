#!/usr/bin/env node
/**
 * Genera data/reglamento-index.js — vincula preguntas con artículos de reglamento.txt
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DATA = __dirname;
const regText = fs.readFileSync(path.join(DATA, 'reglamento.txt'), 'utf8');
const cleanText = fs.readFileSync(path.join(DATA, 'reglamentacion.clean.txt'), 'utf8');

const ROMAN_TO_NUM = {
    I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8,
    IX: 9, X: 10, XI: 11, XII: 12, XIII: 13
};

/** Capítulo I — aspectos generales: pregunta → artículo(s) */
const CAP_I_ASPECTS = {
    'I.35': ['1.5.1'],
    'I.36': ['1.5.3'],
    'I.37': ['1.5.4'],
    'I.38': ['1.5.5'],
    'I.39': ['1.5.5'],
    'I.40': ['1.5.7'],
    'I.41': ['1.5.8'],
    'I.42': ['1.5.12'],
    'I.43': ['1.5.15'],
    'I.44': ['1.5.16'],
    'I.45': ['1.5.18'],
    'I.46': ['1.5.17'],
    'I.47': ['1.5.17', '1.5.18']
};

const CAP_I_SPECIAL = {
    'I.1': ['1.1', '1.1.1', '1.1.2'],
    'I.2': ['1.2', '1.3'],
    'I.3': ['1.4.1'],
    'I.4': ['1.3']
};

function norm(s) {
    return (s || '')
        .toLowerCase()
        .normalize('NFD').replace(/\p{M}/gu, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseReglamento(text) {
    const articles = {};
    let chapter = '';
    let section = '';
    let currentNum = null;

    const flushLine = (line) => {
        const m = line.match(/^\s+(\d+(?:\.\d+)+)\.\s+(.+)$/);
        if (m) {
            currentNum = m[1];
            articles[currentNum] = {
                num: currentNum,
                text: m[2].trim(),
                chapter,
                section
            };
            return;
        }
        if (currentNum && line.trim() && !line.match(/^Capítulo/i) && !line.match(/^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{2,}$/)) {
            articles[currentNum].text += ' ' + line.trim();
        }
    };

    text.split('\n').forEach(line => {
        const ch = line.match(/^Capítulo\s+([IVX]+)\s*[–-]\s*(.+)$/i);
        if (ch && !line.includes('\t')) {
            chapter = `Capítulo ${ch[1]} – ${ch[2].trim()}`;
            currentNum = null;
            return;
        }
        const sec = line.match(/^(OBJETO|ALCANCE|DEFINICIONES|ASPECTOS GENERALES|RADIO CLUBES|INSTITUCIONES AUTORIZADAS|INSTITUCIONES RECONOCIDAS|POTENCIAS MÁXIMAS|SEÑALES DISTINTIVAS ESPECIALES|ESTACIONES FIJAS|ESTACIONES MÓVILES|ESTACIONES ESPACIALES Y TERRENAS|PRÁCTICAS OPERATIVAS|INSTRUCTOR|EXÁMENES|EXAMEN ESCRITO|EXAMEN DE TELEGRAFÍA|LIBRO DE GUARDIA|LIBRO DE CURSOS|VEEDOR|INFRACCIONES|SANCIONES|ANEXO)/);
        if (sec && line === line.trim() && line.length < 80) {
            section = sec[1];
            return;
        }
        flushLine(line);
    });

    return { articles };
}

function articleLabel(text) {
    const m = (text || '').match(/^([^:]+):/);
    return m ? norm(m[1]) : '';
}

function isBareParent(text) {
    const t = (text || '').trim();
    return t.length < 30 && /:\s*$/.test(t);
}

function parseCleanBlocks(text) {
    return text.split('---').filter(b => b.trim()).map(block => {
        const q = { id: '', text: '', opts: [], correct: [] };
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
            else if (l.match(/^[A-Z]\)/)) q.opts.push({ letter: l[0], text: l.slice(2).trim() });
        });
        return q;
    }).filter(q => q.id && q.opts.length);
}

function correctTexts(q) {
    return q.correct
        .map(L => (q.opts.find(o => o.letter === L) || {}).text)
        .filter(Boolean);
}

function extractDefinitionTerm(q) {
    const t = q.text.replace(/\s+/g, ' ');
    const m = t.match(/defina\s*[“"']?\s*(.+?)\s*[”"']?\s*$/i)
        || t.match(/defina\s*[“"']?\s*(.+?)\s*[”"']?\s*:/i);
    return m ? norm(m[1]) : '';
}

function termMatchScore(term, label) {
    if (!term || !label) return 0;
    if (term === label) return 10;
    if (label.includes(term) || term.includes(label)) return 7;
    const tw = term.split(' ').filter(w => w.length > 2);
    const hits = tw.filter(w => label.includes(w)).length;
    return (hits / Math.max(tw.length, 1)) * 5;
}

function optionMatchScore(optNorm, articleText) {
    const at = norm(articleText);
    if (!optNorm || !at) return 0;
    if (at.includes(optNorm) || optNorm.includes(at)) return 8;
    const ow = optNorm.split(' ').filter(w => w.length > 4);
    const hit = ow.filter(w => at.includes(w)).length;
    return (hit / Math.max(ow.length, 1)) * 6;
}

function findDefinitionArticle(q, articles) {
    const term = extractDefinitionTerm(q);
    const opts = correctTexts(q).map(norm);
    let best = null;
    let bestScore = 0;

    Object.keys(articles).forEach(num => {
        if (!num.startsWith('1.4.')) return;
        const text = articles[num].text;
        if (isBareParent(text)) return;

        const label = articleLabel(text);
        let score = termMatchScore(term, label);
        opts.forEach(o => { score = Math.max(score, optionMatchScore(o, text)); });

        if (score > bestScore) {
            bestScore = score;
            best = num;
        }
    });

    return bestScore >= 4 ? best : null;
}

function questionTextMatchScore(q, articleText) {
    const qt = norm(q.text);
    const at = norm(articleText);
    const opts = correctTexts(q).map(norm);
    let score = 0;

    if (qt.length > 20 && at.includes(qt.slice(0, Math.min(90, qt.length)))) score += 3;
    opts.forEach(o => { score = Math.max(score, optionMatchScore(o, articleText)); });

    const qWords = qt.split(' ').filter(w => w.length > 4);
    const hits = qWords.filter(w => at.includes(w)).length;
    score += (hits / Math.max(qWords.length, 1)) * 1.5;

    if (/cancelaci[oó]n/.test(qt) && /cancelaci[oó]n/.test(at)) score += 4;
    if (/caducidad/.test(qt) && /caducidad/.test(at)) score += 4;
    if (/caducidad/.test(qt) && /cancelaci[oó]n/.test(at)) score -= 5;
    if (/cancelaci[oó]n/.test(qt) && /caducidad/.test(at)) score -= 5;

    return score;
}

function articlesInChapter(chNum, articles) {
    const prefix = chNum + '.';
    return Object.keys(articles).filter(n => n.startsWith(prefix));
}

function bestInChapterByText(q, chNum, articles, minScore) {
    const pool = articlesInChapter(chNum, articles).filter(n => !isBareParent(articles[n].text));
    let best = null;
    let bestScore = minScore;
    pool.forEach(num => {
        const sc = questionTextMatchScore(q, articles[num].text);
        if (sc > bestScore) {
            bestScore = sc;
            best = num;
        }
    });
    return best;
}

function buildRef(articleNums, articles) {
    const nums = articleNums.filter(n => articles[n] && !isBareParent(articles[n].text));
    if (!nums.length) return null;
    const first = articles[nums[0]];
    return {
        chapter: first.chapter || '',
        section: first.section || '',
        lines: nums.map(n => `${n}. ${articles[n].text.trim()}`)
    };
}

function mapQuestion(q, { articles }) {
    const id = q.id.trim().toUpperCase();
    if (CAP_I_SPECIAL[id]) return buildRef(CAP_I_SPECIAL[id], articles);
    if (CAP_I_ASPECTS[id]) return buildRef(CAP_I_ASPECTS[id], articles);

    const roman = id.match(/^([IVX]+)\.(\d+)$/);
    if (roman) {
        const chNum = ROMAN_TO_NUM[roman[1]];
        const qn = parseInt(roman[2], 10);

        if (chNum === 1 && qn >= 5 && qn <= 34) {
            const def = findDefinitionArticle(q, articles);
            if (def) return buildRef([def], articles);
        }

        const best = bestInChapterByText(q, chNum, articles, 2.5);
        if (best) return buildRef([best], articles);
    } else if (/^PB/.test(id)) {
        const best = bestInChapterByText(q, null, articles, 2);
        const pool = Object.keys(articles).filter(n => {
            const ch = articles[n].chapter || '';
            return ch.includes('Anexo') || /^A\./.test(n);
        });
        let b = null;
        let bs = 2;
        pool.forEach(num => {
            const sc = questionTextMatchScore(q, articles[num].text);
            if (sc > bs) { bs = sc; b = num; }
        });
        if (b) return buildRef([b], articles);
    }

    let best = null;
    let bs = 4;
    Object.keys(articles).forEach(num => {
        if (isBareParent(articles[num].text)) return;
        const sc = questionTextMatchScore(q, articles[num].text);
        if (sc > bs) { bs = sc; best = num; }
    });
    if (best) return buildRef([best], articles);

    return null;
}

const reg = parseReglamento(regText);
const questions = parseCleanBlocks(cleanText);
const index = {};

questions.forEach(q => {
    const ref = mapQuestion(q, reg);
    if (ref) index[q.id.trim()] = ref;
});

const checks = ['I.7', 'I.28', 'I.38', 'I.44', 'I.45', 'I.46'];
checks.forEach(id => {
    const r = index[id];
    console.log(id, r ? r.lines[0].slice(0, 85) + '…' : 'SIN CITA');
});

fs.writeFileSync(
    path.join(DATA, 'reglamento-index.js'),
    `// Generado por data/build_reglamento_index.js — no editar a mano\nconst REGLEMENTO_INDEX = ${JSON.stringify(index, null, 2)};\n`,
    'utf8'
);
console.log(`\n✅ reglamento-index.js: ${Object.keys(index).length} preguntas.`);
