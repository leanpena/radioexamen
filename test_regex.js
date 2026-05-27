const block = `PREGUNTA: 1 | ¿Con qué elemento bloqueamos el paso de una corriente continua entre dos puntos de un circuito ?\n\nA) Resistor.\nB) Inductor.\nC) Capacitor.\nD) Termistor\n\nCORRECTA: C\nEXPLICACION:\nExplicación técnica pendiente.\n`;
const expl = "NUEVA EXPLICACION";
const updated = block.replace(/EXPLICACION:[\s\S]*$/, `EXPLICACION:\n${expl}\n`);
console.log(updated);
