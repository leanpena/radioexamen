const fs = require('fs');
const content = fs.readFileSync('/home/leandro/Programacion/Radioaficionados/reglamentacion.txt', 'utf8');
const regex = /\n\s*([A-Z]+\.?\d+)\s+/;
const match = content.match(regex);
console.log('Match:', match ? match[1] : 'null');
if (!match) {
    console.log('Sample content snippet:', JSON.stringify(content.substring(500, 1000)));
}
