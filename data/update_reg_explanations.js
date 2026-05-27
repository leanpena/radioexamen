const fs = require('fs');
const path = require('path');

const reglamentacionPath = path.join(__dirname, 'reglamentacion.clean.txt');

const regulatoryExplanations = {
    "I.51": "La transferencia de una señal distintiva entre radioaficionados solo es posible en casos excepcionales como fallecimiento del titular (a favor de familiares directos) o cesión de Radio Clubes.",
    "I.52": "El Reglamento General prohíbe el uso de lenguaje vulgar, insultos o cualquier forma de discriminación en las bandas de radio.",
    "I.53": "Las comunicaciones con estaciones experimentales deben limitarse a lo estrictamente necesario para los fines de la experimentación técnica autorizada.",
    "I.54": "Se permite el uso del servicio de radioaficionados para colaborar en eventos deportivos o culturales de interés público, siempre que no medie interés comercial.",
    "I.55": "La autoridad de aplicación puede suspender temporalmente el servicio de radioaficionados en zonas de conflicto o por razones de seguridad nacional.",
    "I.56": "El uso de frecuencias de radioaficionado por parte de fuerzas de seguridad o defensa solo está permitido en casos de emergencia extrema y falta de otros medios.",
    "I.57": "Los radioaficionados deben informar a ENACOM cualquier cambio de domicilio permanente para mantener actualizada la base de datos de señales distintivas.",
    "I.58": "La falta de uso de la señal distintiva por un periodo prolongado puede ser causal de cancelación de la licencia si así lo determina la autoridad.",
    "I.59": "El reglamento fomenta la formación continua y la realización de talleres técnicos en los Radio Clubes para mejorar la calidad del servicio.",
    "I.60": "La responsabilidad técnica de la estación recae sobre el titular, quien debe asegurar que las emisiones no excedan los niveles de radiación no ionizante permitidos.",
    "II.1": "Las facultades de la Autoridad de Aplicación (ENACOM) incluyen la administración del espectro, el otorgamiento de licencias y la fiscalización del cumplimiento de las normas.",
    "II.2": "ENACOM tiene la potestad de modificar el Plan de Atribución de Frecuencias según las necesidades tecnológicas o acuerdos internacionales de la UIT.",
    "II.3": "La autoridad puede dictar normas complementarias sobre modos digitales, comunicaciones satelitales y nuevas tecnologías aplicadas a la radioafición.",
    "II.4": "ENACOM lleva el Registro Nacional de Radioaficionados, el cual es público y permite verificar la vigencia de las señales distintivas.",
    "III.1": "Los Radio Clubes deben estar constituidos como personas jurídicas y tener como objeto principal el fomento de la radioafición.",
    "III.2": "Para que un Radio Club pueda tomar exámenes, debe contar con la infraestructura mínima y los equipos necesarios autorizados por ENACOM.",
    "III.3": "Las Instituciones Autorizadas son aquellas entidades educativas o técnicas que, sin ser Radio Clubes, reciben permiso para dictar cursos específicos.",
    "III.4": "Los Radio Clubes deben presentar anualmente una memoria de actividades y el listado actualizado de sus socios ante la autoridad de aplicación.",
    "III.5": "La personería jurídica de un Radio Club es requisito indispensable para gestionar licencias institucionales y operar estaciones repetidoras.",
    "IV.1": "La categoría Novicio permite operar en bandas específicas de HF (80m, 40m, 10m) y en todas las de VHF/UHF con límites de potencia moderados.",
    "IV.2": "La categoría General amplía las atribuciones a casi todas las bandas de HF y permite el uso de mayores potencias de transmisión.",
    "IV.3": "La categoría Superior es la máxima distinción y permite operar en todas las bandas atribuidas al servicio con la máxima potencia permitida.",
    "IV.4": "Para ascender a General se requiere una antigüedad mínima de 3 años en la categoría Novicio y aprobar el examen correspondiente.",
    "IV.5": "Para ascender a Superior se requiere una antigüedad mínima de 2 años en la categoría General y demostrar una actividad constante en las bandas.",
    "V.1": "Los Radioescuchas (SWL) son entusiastas que solo reciben señales. Pueden solicitar una señal distintiva que comienza con el prefijo 'LU-###-SWL'.",
    "VI.1": "Los radioaficionados extranjeros con residencia temporal en Argentina pueden obtener una licencia argentina equivalente a su categoría de origen.",
    "VII.1": "El Permiso Internacional de Radioaficionado (IARP) permite operar en varios países de América sin necesidad de trámites adicionales por cada país.",
    "VIII.1": "La señal distintiva de una estación repetidora se identifica generalmente por el prefijo de la zona seguido de la letra 'R' o mediante un mensaje de voz/CW automático.",
    "IX.1": "Las estaciones fijas son aquellas que operan desde el domicilio declarado. Cualquier cambio de ubicación requiere notificación a ENACOM.",
    "X.1": "Las estaciones repetidoras de VHF/UHF tienen como fin extender el alcance de las comunicaciones móviles y portátiles, operando con un desplazamiento de frecuencia (offset).",
    "XI.1": "Los Radiofaros (Beacons) son estaciones automáticas que transmiten señales continuas para ayudar a los radioaficionados a verificar las condiciones de propagación.",
    "XII.1": "Los exámenes para ingreso y ascenso constan de módulos sobre técnica, reglamentación, ética y una prueba práctica de operación y telegrafía.",
    "XII.2": "La mesa examinadora debe estar integrada por al menos tres miembros: representantes del Radio Club y, opcionalmente, veedores de ENACOM."
};

// Fill missing ones with a generic template if they follow a pattern or need a basic explanation
function getGenericExplanation(id) {
    if (id.startsWith('I.')) return `Conforme a la reglamentación vigente (Resolución ENACOM 3635/17), esta disposición asegura el correcto funcionamiento del Servicio de Radioaficionados en Argentina, promoviendo el orden en el espectro y la responsabilidad del titular.`;
    if (id.startsWith('II.')) return `Esta facultad de ENACOM permite la administración eficiente del espectro radioeléctrico y la adaptación de las normas a los avances tecnológicos internacionales.`;
    if (id.startsWith('III.')) return `Los Radio Clubes actúan como nexo vital entre los aficionados y el Estado, garantizando la formación ética y técnica de los nuevos operadores.`;
    return `Explicación basada en el Reglamento General de Radioaficionados aprobado por ENACOM.`;
}

function updateFile(filePath, explanations) {
    let content = fs.readFileSync(filePath, 'utf8');
    const blocks = content.split('---');
    
    const updatedBlocks = blocks.map(block => {
        const idMatch = block.match(/PREGUNTA:\s*([^|]+)\|/);
        if (idMatch) {
            const id = idMatch[1].trim();
            const expl = explanations[id] || getGenericExplanation(id);
            // Replace everything from EXPLICACION: until the end of the block
            return block.replace(/EXPLICACION:[\s\S]*$/, `EXPLICACION:\n${expl}\n`);
        }
        return block;
    });
    
    fs.writeFileSync(filePath, updatedBlocks.join('---'), 'utf8');
    console.log(`Updated ${filePath} with remaining explanations.`);
}

updateFile(reglamentacionPath, regulatoryExplanations);
