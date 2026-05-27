const fs = require('fs');
const path = require('path');

const filePath = '/home/leandro/Programacion/Radioaficionados/data/tecnica.clean.txt';
const content = fs.readFileSync(filePath, 'utf8');

const explanations = {
    "¿Con qué elemento bloqueamos el paso de una corriente continua": "Los capacitores bloquean la corriente continua (DC) pero permiten el paso de la alterna (AC) debido a su reactancia.",
    "¿Cuál es el cable coaxil menos recomendado para VHF y UHF": "El RG-58 tiene muchas pérdidas en frecuencias altas (VHF/UHF) por su diseño y diámetro delgado.",
    "Rojo-Naranja-Rojo": "Rojo(2), Naranja(3), Rojo(x100) = 2300 Ω = 2,3 KΩ.",
    "dorado que se encuentra en un resistor": "La banda dorada representa una tolerancia de fabricación del 5%.",
    "¿En qué unidad se mide la inductancia": "La inductancia se mide en Henrios (H).",
    "Enuncie la ley de Ohm": "Establece que la corriente (I) es igual a la tensión (V) dividida por la resistencia (R).",
    "unidad de medida de la intensidad": "La intensidad de corriente eléctrica se mide en Amperios (A).",
    "unidad de medida de la tensión": "La tensión o voltaje se mide en Voltios (V).",
    "3 resistencias en serie de 10 Ω": "En serie: Rt = 10+10+10 = 30 Ω. I = 30V / 30Ω = 1 Amperio.",
    "mide la tensión en un circuito eléctrico": "El voltímetro mide la diferencia de potencial y se conecta en paralelo.",
    "mide la intensidad de corriente": "El amperímetro mide el flujo de electrones y se conecta en serie.",
    "unidad de medida de la potencia": "La potencia eléctrica se mide en Vatios (Watts).",
    "potencia se producirá en una resistencia de 400 Ω, si la tensión aplicada es de 20V": "P = V² / R = 400 / 400 = 1 Vatio.",
    "paralelo tres capacitores de 22, 33 y 5": "En paralelo se suman: 22+33+5 = 60 uF.",
    "antena puede ser una buena elección como parte de un equipo portable": "El dipolo de 1/2 onda es simple, robusto y eficiente para uso portable.",
    "ángulo ideal entre ramas de una antena dipolo tipo “V” invertida": "Un ángulo cercano a 90º baja la impedancia del centro a unos 50 Ω, ideal para cables coaxiales comunes.",
    "En un receptor el demodulador": "Es la etapa que separa la información (audio) de la portadora de radio.",
    "elevar por si solo, una tensión alterna": "El transformador puede elevar o reducir la tensión alterna mediante inducción magnética.",
    "En un transmisor, el modulador": "Encargado de variar alguna característica de la portadora (amplitud o frecuencia) según la señal de audio.",
    "valor máximo de una corriente alterna es de 200 mA. ¿Cuál es su valor eficaz": "El valor eficaz (RMS) es Vmax * 0,707. 200 * 0,707 = 141,4 mA.",
    "equipo de 220 Voltios y 1 KW de consumo": "I = P / V = 1000 / 220 = 4,54A. Un fusible de 6A es la opción segura más cercana.",
    "En un capacitor, ¿qué fenómeno se produce entre la tensión y la corriente": "En capacitores, la corriente adelanta a la tensión (ICE: I adelanta a E en C).",
    "¿Cuándo existe resonancia en un circuito": "La resonancia ocurre cuando la reactancia inductiva (Xl) es igual a la capacitiva (Xc).",
    "material que separa las placas de un capacitor": "Se denomina dieléctrico y es un material aislante.",
    "¿Los diodos comunes permiten circulación de corriente en ambas direcciones": "No, actúan como una válvula permitiendo el paso en un solo sentido.",
    "¿De qué elemento se compone un puente rectificador": "Se compone de 4 diodos (puente de Graetz) para rectificar onda completa.",
    "¿Qué elementos indispensables componen un transformador": "Dos o más bobinas acopladas magnéticamente por un núcleo.",
    "componentes una fuente de alimentación típica de 12 Volts": "Transformador (baja tensión), Rectificador (diodos), Filtro (capacitores) y Regulador (estabilidad).",
    "¿Qué tipo de corriente entrega una fuente de alimentación": "Entrega corriente continua (DC) limpia para alimentar circuitos electrónicos.",
    "funciones mas importantes que realiza un transistor": "Su función estrella es la amplificación de señales débiles.",
    "conforman un transistor": "Base, Colector y Emisor son los tres terminales de un transistor BJT.",
    "¿Qué debemos hacer con dicha antena?": "Si la ROE sube al subir la frecuencia, la antena está larga y debe acortarse.",
    "selectividad": "Es la capacidad de sintonizar una estación ignorando las interferencias de las frecuencias cercanas.",
    "sensibilidad": "Es la capacidad de captar señales muy débiles por encima del ruido.",
    "adaptar una antena dipolo con una línea de alimentación desbalanceada": "El Balún adapta el sistema balanceado (antena) al desbalanceado (coaxial).",
    "dipolo de media onda, ¿cómo irradia": "Irradia en forma de '8' perpendicular al cable, siendo bidireccional.",
    "¿Qué función cumple un oscilador?": "Genera una señal periódica (como la portadora) sin necesidad de una entrada de señal.",
    "longitud de una antena dipolo de 1/2 onda para operar en 28950": "L(m) = 142.5 / f(MHz). 142.5 / 28.95 = 4,92 metros.",
    "longitud de una de las ramas del dipolo de 1/2 onda para la frecuencia de 7043": "L total = 142.5 / 7.043 = 20.23m. Una rama es la mitad: 10.11 metros.",
    "Un filtro :": "Su función es dejar pasar ciertas frecuencias y eliminar otras del espectro.",
    "antena vertical de 1/4 de onda para la frecuencia de 146 MHz": "L(m) = 71.25 / 146 = 0.488 m (48,8 cm).",
    "¿Cómo irradia una antena vertical ?": "Irradia en todas las direcciones del horizonte (360º), por lo tanto es omnidireccional.",
    "antena direccional de 3 elementos tipo Yagui": "Típicamente ofrece una ganancia de entre 6 y 8 dB respecto a una antena isotrópica.",
    "cable coaxil RG-58U tiene una impedancia": "La impedancia estándar para equipos de radioaficionado es de 50 Ω.",
    "RG-8-U y el RG-213U": "Son cables de 50 Ω con mejores prestaciones que el RG-58.",
    "vatímetros en ambas puntas": "La potencia medida en la antena siempre será menor que en el equipo debido a la atenuación del cable.",
    "I.T.V .?": "Sigla de Interferencia a Televisión, causada por armónicos o radiación espuria.",
    "antena tiene mas ganancia en estaciones VHF móviles": "La 5/8 de onda tiene mejor ángulo de disparo y ganancia que la de 1/4.",
    "frecuencia de trabajo de un transmisor es de 21.000 Khz": "Para pasar de KHz a MHz se divide por 1000: 21.000 / 1000 = 21 MHz.",
    "Un resistor variable es llamado": "Se denomina potenciómetro y permite ajustar niveles de señal o tensión.",
    "polarización de una onda ?": "Se define por la posición del campo eléctrico respecto a la tierra (Vertical u Horizontal).",
    "ciclo de manchas solares": "La actividad solar ioniza las capas de la atmósfera permitiendo que las ondas de HF reboten y viajen largas distancias.",
    "oscilador a cristal de cuarzo": "El cuarzo vibra a una frecuencia muy precisa, ofreciendo una estabilidad que los circuitos LC no pueden igualar.",
    "propagación usualmente las señales de VHF": "Suelen viajar en línea de vista (recto), atravesando la atmósfera sin rebotar.",
    "frecuencia de una armónica": "Un armónico es siempre un múltiplo entero (2x, 3x, etc.) de la frecuencia fundamental.",
    "PTT de un equipo": "Sigla de 'Push To Talk' (Presionar para Hablar), activa el modo transmisión.",
    "operar en vacío": "Nunca se debe transmitir sin antena; la energía reflejada puede destruir los componentes finales del equipo.",
    "transformador reductor": "Tiene más vueltas en el primario que en el secundario para reducir el voltaje de salida.",
    "sigla ALC": "Automatic Level Control: mantiene la potencia de salida estable y evita la distorsión del audio.",
    "frecuencia y su correspondiente longitud de onda": "Son inversamente proporcionales: a mayor frecuencia, menor longitud de onda (y viceversa).",
    "repetidoras en la banda de 2 m": "Se utiliza polarización vertical para facilitar el uso con handies y antenas de móvil.",
    "medimos la R.O.E.": "Se utiliza un medidor de ondas estacionarias (SWR meter).",
    "velocidad de las ondas electromagnéticas": "Viajan a la velocidad de la luz, aproximadamente 300.000 kilómetros por segundo.",
    "coaxiles son líneas de transmisión": "Son líneas desbalanceadas, ya que la malla está a potencial de tierra y el centro lleva la señal.",
    "líneas abiertas son líneas de transmisión": "Son líneas balanceadas porque ambos conductores llevan la misma señal con fases opuestas.",
    "Squelch:": "Circuito que silencia el parlante cuando no hay señal, eliminando el molesto ruido de estática.",
    "intensidad de corriente circula por una resistencia de 5000 Ω si se le aplica 250 V": "I = V / R = 250 / 5000 = 0,05 Amperios.",
    "En el símbolo de la batería, la línea mas corta": "Representa el polo negativo (-), mientras que la línea larga es el positivo (+).",
    "¿Qué función cumple un transmatch?": "Adapta la impedancia de la antena a la del transmisor para que este trabaje cómodo (ROE 1:1).",
    "¿Qué es la ROE?": "Relación de Ondas Estacionarias: indica qué porcentaje de potencia regresa al equipo por mala adaptación.",
    "¿Qué es un Balún?": "Transformador encargado de unir una línea desbalanceada (coaxial) a una balanceada (dipolo)."
};

const blocks = content.split('---');
const updatedBlocks = blocks.map(block => {
    let newBlock = block;
    for (const [key, expl] of Object.entries(explanations)) {
        if (block.includes(key)) {
            newBlock = block.replace("Explicación técnica pendiente.", expl);
            break;
        }
    }
    return newBlock;
});

fs.writeFileSync(filePath, updatedBlocks.join('---'));
console.log("Base de datos técnica completada.");
