const fs = require('fs');
const path = require('path');

function parseTecnica(content) {
    const parts = content.split(/RESPUESTAS DEL EXAMEN/i);
    const questionsText = parts[0];
    const answersText = parts[1] || '';

    // Parse Answers
    const answers = {};
    const answerMatches = answersText.matchAll(/(\d+)\s*-\s*([A-Z])/g);
    for (const match of answerMatches) {
        answers[match[1]] = match[2];
    }

    // Parse Questions
    const questions = [];
    const blocks = questionsText.split(/\n\s*(\d+)\.\s+/).slice(1);
    for (let i = 0; i < blocks.length; i += 2) {
        const id = blocks[i];
        const block = blocks[i+1];
        if (!block) continue;

        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        let firstOptIdx = lines.findIndex(l => l.match(/^[a-z]\)/i));
        if (firstOptIdx === -1) firstOptIdx = lines.length;

        const questionText = lines.slice(0, firstOptIdx).join(' ');
        const options = [];
        for (let j = firstOptIdx; j < lines.length; j++) {
            const optMatch = lines[j].match(/^([a-z])\)\s*(.*)/i);
            if (optMatch) options.push(`${optMatch[1].toUpperCase()}) ${optMatch[2]}`);
        }
        questions.push({ id, question: questionText, options, correct: answers[id] || 'A', explanation: 'Explicación técnica pendiente.' });
    }
    return questions;
}

function parseReglamentacion(content) {
    const marker = "TABLA DE RESPUESTAS CORRECTAS";
    const lastIndex = content.lastIndexOf(marker);
    const questionsText = content.substring(0, lastIndex);
    const answersText = content.substring(lastIndex);

    // Parse Answers (Format: I.1 a, PBN.1 b, etc)
    const answers = {};
    const lines = answersText.split('\n');
    lines.forEach(line => {
        const match = line.match(/^([A-Z\d\.]+)\s+(.*)/i);
        if (match) {
            const id = match[1].trim().toUpperCase();
            // Handle multiple answers like "a, c, e y g"
            const answerStr = match[2].toLowerCase();
            const letters = [];
            ['a','b','c','d','e','f','g','h','i','j'].forEach(l => {
                if (answerStr.includes(` ${l}`) || answerStr.startsWith(`${l}`) || answerStr.includes(`, ${l}`) || answerStr.includes(` y ${l}`)) {
                    // Check if it's a standalone letter
                    const regex = new RegExp(`(^|[\\s,y]+)${l}([\\s,y]+|$)`);
                    if (regex.test(answerStr)) {
                        letters.push(l.toUpperCase());
                    }
                }
            });
            if (letters.length > 0) {
                answers[id] = letters.join(',');
            }
        }
    });

    // Parse Questions
    const questions = [];
    const blocks = questionsText.split(/\n\s*([A-Z\d]+\.?\s*\d*)\s+/).slice(1);
    for (let i = 0; i < blocks.length; i += 2) {
        const id = blocks[i].toUpperCase();
        const block = blocks[i+1];
        if (!block) continue;

        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        let firstOptIdx = lines.findIndex(l => l.match(/^[a-z]\)/i));
        if (firstOptIdx === -1) firstOptIdx = lines.length;

        const questionText = lines.slice(0, firstOptIdx).join(' ');
        const options = [];
        for (let j = firstOptIdx; j < lines.length; j++) {
            const optMatch = lines[j].match(/^([a-z])\)\s*(.*)/i);
            if (optMatch) options.push(`${optMatch[1].toUpperCase()}) ${optMatch[2]}`);
        }
        if (options.length > 0) {
            questions.push({ id, question: questionText, options, correct: answers[id] || 'A', explanation: 'Explicación reglamentaria pendiente.' });
        }
    }
    return questions;
}

function writeClean(questions, outPath) {
    let out = "";
    questions.forEach(q => {
        out += `PREGUNTA: ${q.id} | ${q.question}\n\n`;
        q.options.forEach(o => out += `${o}\n`);
        out += `\nCORRECTA: ${q.correct}\n`;
        out += `EXPLICACION:\n${q.explanation}\n`;
        out += `---\n\n`;
    });
    fs.writeFileSync(outPath, out);
    return out;
}

const dir = '/home/leandro/Programacion/Radioaficionados';
const dataDir = path.join(dir, 'data');

// Process Tecnica
const tecnicaRaw = fs.readFileSync(path.join(dataDir, 'tecnica.txt'), 'utf8');
const tecnicaData = parseTecnica(tecnicaRaw);
const tecnicaClean = writeClean(tecnicaData, path.join(dataDir, 'tecnica.clean.txt'));
console.log(`Tecnica: ${tecnicaData.length} preguntas.`);

// Process Reglamentacion
const reglRaw = fs.readFileSync(path.join(dataDir, 'reglamentacion.txt'), 'utf8');
const reglData = parseReglamentacion(reglRaw);
const reglClean = writeClean(reglData, path.join(dataDir, 'reglamentacion.clean.txt'));
console.log(`Reglamentacion: ${reglData.length} preguntas.`);

// Update data/questions.js
const questionsJsPath = path.join(dataDir, 'questions.js');
const questionsJsContent = `const TECNICA_DATA = ${JSON.stringify(tecnicaClean)};\nconst REGLAMENTACION_DATA = ${JSON.stringify(reglClean)};`;
fs.writeFileSync(questionsJsPath, questionsJsContent);
console.log(`✅ data/questions.js actualizado.`);
