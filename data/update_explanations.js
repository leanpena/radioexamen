const fs = require('fs');
const path = require('path');

const tecnicaPath = path.join(__dirname, 'tecnica.clean.txt');
const reglamentacionPath = path.join(__dirname, 'reglamentacion.clean.txt');
const questionsJsPath = path.join(__dirname, 'questions.js');

const technicalExplanations = {
    "1": "El **Capacitor** (C) es el componente diseñado para bloquear la corriente continua (CC) permitiendo el paso de la alterna. Esto se debe a que sus placas están separadas por un aislante. El **Resistor** (A) solo limita la corriente pero no la bloquea; el **Inductor** (B) permite el paso de CC con baja resistencia; y el **Termistor** (D) varía con la temperatura pero no es un bloqueador de CC.",
    "2": "El cable **RG-58** (A) es el menos recomendado para VHF/UHF debido a su pequeño diámetro y materiales, lo que genera pérdidas de señal (atenuación) muy altas en esas frecuencias. Los cables **RG-8** (B) y **RG-213** (C) son mucho más eficientes por ser más gruesos y tener mejor blindaje. El **RG-11** (D) es de 75 ohms y también tiene menos pérdidas que el RG-58.",
    "3": "Según el código de colores: **Rojo** (2), **Naranja** (3) y **Rojo** (multiplicador x100) da como resultado **2300 Ω**, lo que equivale a **2,3 KΩ** (C). Las otras opciones (A, B, D) no corresponden a esta combinación de colores y multiplicador.",
    "4": "La banda **Dorada** (A) en un resistor indica una tolerancia del **5%**. La banda plateada indicaría 10% (B), y la ausencia de banda indicaría 20% (C). El 30% (D) no es un valor estándar de tolerancia por colores.",
    "5": "La unidad de medida de la inductancia es el **Henrio** (C). El **Faradio** (A) es para capacidad, el **Joulio** (B) es para energía y el **Coulombio** (D) es para carga eléctrica.",
    "6": "La **Ley de Ohm** (B) establece que la intensidad es directamente proporcional a la tensión e inversamente proporcional a la resistencia (I = V / R). Las opciones A, C y D proponen relaciones matemáticas inversas o incorrectas que no se ajustan a la realidad física del circuito.",
    "7": "La intensidad de corriente se mide en **Amperios** (B). El **Voltio** (A) mide tensión, el **Vatio** (C) mide potencia y el **Henrio** (D) mide inductancia.",
    "8": "La tensión eléctrica se mide en **Voltios** (A). El **Amperio** (B) mide intensidad, el **Vatio** (C) potencia y el **Henrio** (D) inductancia.",
    "9": "En un circuito en serie, las resistencias se suman: 10 + 10 + 10 = 30 Ω. Aplicando I = V / R, tenemos 30V / 30Ω = **1 Amperio** (D). Los valores de 10A, 100A o 3A (A, B, C) son resultados de cálculos erróneos.",
    "10": "La potencia eléctrica se mide en **Vatios** (B). El **Voltio** (A) es para tensión, el **Amperio** (C) para intensidad y el **Ohmio** (D) para resistencia.",
    "11": "La unidad de medida de la resistencia es el **Ohmio** (D). El **Vatio** (A), **Voltio** (B) y **Amperio** (C) miden potencia, tensión e intensidad respectivamente.",
    "12": "En un circuito en **paralelo** (A), la tensión (voltaje) es la misma en todos los puntos de conexión. En un circuito en serie (B), lo que se mantiene constante es la intensidad, no la tensión.",
    "13": "En paralelo, dos resistencias iguales de 10 Ω resultan en la mitad: **5 Ω** (A). Si estuvieran en serie, serían 20 Ω (B). Los valores de 100 Ω o 0 Ω (C, D) son incorrectos.",
    "14": "La **frecuencia** (B) es la cantidad de veces que una onda completa su ciclo en un segundo. El período (A) es el tiempo de un ciclo, la fase (C) es el estado de oscilación y la amplitud (D) es el valor máximo de la onda.",
    "15": "La frecuencia se mide en **Hercios** (C). El Voltio (A), Amperio (B) y Vatio (D) corresponden a otras magnitudes eléctricas.",
    "16": "El **Período** (B) es el tiempo necesario para completar un ciclo. La frecuencia (A) es la cantidad de ciclos por tiempo, la fase (C) es la posición relativa y el hertz (D) es la unidad, no la magnitud.",
    "17": "El receptor **superheterodino** (B) es el que utiliza la conversión de la señal recibida a una Frecuencia Intermedia (FI) fija. Los receptores regenerativos (A) o de conversión directa (C) funcionan con principios diferentes.",
    "18": "La **etapa de FI** (C) es donde se obtiene la mayor selectividad y ganancia en un receptor moderno. La etapa de RF (A) solo pre-amplifica y el detector (B) extrae el audio, pero no define la selectividad principal.",
    "19": "El **detector de producto** (C) es el circuito específico para demodular señales de SSB y CW. El detector de envolvente (A) se usa para AM y el discriminador (B) para FM.",
    "20": "El **AGC** (C) o Control Automático de Ganancia mantiene el nivel de audio constante ante variaciones de la señal. El Squelch (A) silencia el ruido y el RIT (B) ajusta la frecuencia de recepción ligeramente.",
};

const regulatoryExplanations = {
    "I.1": "Conforme a la reglamentación vigente (Res. ENACOM 3635/17), el objeto es regular la actividad para garantizar el orden y el desarrollo técnico. Las opciones que sugieren fines comerciales o de lucro son incorrectas ya que la radioafición es, por definición, sin fines de lucro.",
    "I.2": "La reglamentación define al radioaficionado como alguien interesado en la técnica con fines personales y **sin interés de lucro** (A). Cualquier opción que mencione beneficios económicos o comerciales es contraria a la esencia del reglamento.",
    "I.3": "El **ENACOM** (C) es la autoridad nacional encargada de aplicar el reglamento. Otros entes como la Secretaría (A) o la CNC (B) han sido reemplazados o tienen funciones distintas en la estructura actual del estado.",
    "I.5": "La **Señal Distintiva** (C) es el nombre único asignado a cada estación. El prefijo (A) es solo una parte de ella y el nombre del titular (B) no es la identificación oficial en las ondas.",
    "I.18": "La identificación debe hacerse al **comienzo, fin y cada 10 minutos** (D) para cumplir con las normas de supervisión del espectro. Identificaciones menos frecuentes o solo al final (A, B, C) son insuficientes según la norma.",
};

function getGenericExplanation(id) {
    if (id.startsWith('I.')) return `Conforme a la reglamentación vigente (Resolución ENACOM 3635/17), esta norma busca asegurar el uso correcto, ético y ordenado del espectro radioeléctrico por parte de los aficionados en Argentina.`;
    if (id.startsWith('PBG.')) return `Conforme a la reglamentación, las atribuciones de frecuencias para la categoría General están diseñadas para permitir una amplia experimentación, respetando los segmentos de modos específicos según el Plan Nacional de Atribución de Frecuencias.`;
    if (id.startsWith('PBS.')) return `Conforme a la reglamentación, la categoría Superior cuenta con las mayores atribuciones de potencia y frecuencias, incluyendo bandas experimentales, siempre bajo el cumplimiento de las normativas técnicas de ENACOM.`;
    return `Explicación basada en la normativa oficial de ENACOM para el Servicio de Radioaficionados en Argentina.`;
}

function updateFile(filePath, explanations) {
    if (!fs.existsSync(filePath)) return "";
    let content = fs.readFileSync(filePath, 'utf8');
    const blocks = content.split('---');
    
    const updatedBlocks = blocks.map(block => {
        if (!block.trim()) return block;
        const idMatch = block.match(/PREGUNTA:\s*([^|]+)\|/);
        if (idMatch) {
            const id = idMatch[1].trim();
            let expl = explanations[id];
            
            if (!expl) {
                if (filePath.includes('tecnica')) {
                    expl = '';
                } else {
                    expl = getGenericExplanation(id);
                }
            }

            const parts = block.split('EXPLICACION:');
            if (parts.length > 1) {
                return parts[0] + 'EXPLICACION:\n' + expl + '\n';
            }
        }
        return block;
    });
    
    const newContent = updatedBlocks.join('---');
    fs.writeFileSync(filePath, newContent, 'utf8');
    return newContent;
}

const tClean = updateFile(tecnicaPath, technicalExplanations);
const rClean = updateFile(reglamentacionPath, regulatoryExplanations);

if (tClean && rClean) {
    const questionsJsContent = `const TECNICA_DATA = ${JSON.stringify(tClean)};\nconst REGLAMENTACION_DATA = ${JSON.stringify(rClean)};`;
    fs.writeFileSync(questionsJsPath, questionsJsContent);
    console.log("Explanations updated and data/questions.js regenerated.");
}
