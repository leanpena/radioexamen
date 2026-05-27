# RadioExamen Argentina

Simulador web para preparar el examen de **Licencia de Radioaficionado en Argentina**.

El proyecto está orientado a práctica realista del banco de preguntas de **Técnica** y **Reglamentación**, con modos de entrenamiento, examen y repaso de errores.

## Objetivo

Brindar una herramienta simple, rápida y usable desde navegador para:

- Practicar preguntas técnicas y reglamentarias.
- Simular una evaluación con seguimiento de progreso.
- Revisar errores y reforzar temas débiles.
- Consultar fundamentos por respuesta, con referencias normativas cuando corresponda.

## Características principales

- Banco de preguntas en dos categorías:
  - `Técnica`
  - `Reglamentación`
- Soporte de preguntas con **una o múltiples opciones correctas**.
- Feedback inmediato al confirmar:
  - Marcado visual de opciones correctas/incorrectas.
  - Explicaciones técnicas concretas.
  - Citas del reglamento en preguntas reglamentarias.
- Filtro de reglamentación por categoría de licencia:
  - `Novicio`: I-XIII + PB + PBN
  - `General`: I-XIII + PB + PBN + PBG
  - `Superior`: I-XIII + PB + PBN + PBG + PBS
- Modo examen y modo práctica.
- Diseño responsive y funcionamiento como PWA básica (`manifest.json` + `sw.js`).
- Build listo para hosting estático con salida compacta en `dist/`.

## Tecnologías

- HTML
- CSS
- JavaScript (vanilla)
- Node.js (scripts de build y generación de datos)

## Estructura del proyecto

```text
.
├── index.html
├── js/
│   └── app.js
├── css/
│   └── style.css
├── data/
│   ├── tecnica.clean.txt
│   ├── reglamentacion.clean.txt
│   ├── reglamento.txt
│   ├── questions.js
│   ├── reglamento-index.js
│   ├── build_reglamento_index.js
│   ├── tecnica_explanations_map.js
│   └── build_tecnica_explanations.js
├── dist/
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   ├── manifest.json
│   └── sw.js
└── build.js
```

## Requisitos

- Node.js 18+ (recomendado)
- Python 3 (opcional, para servidor local rápido)

## Ejecución local

### Opción 1: Script incluido

```bash
bash serve.sh
```

Abre el navegador automáticamente en `http://localhost:8080`.

### Opción 2: Servidor Python manual

```bash
python3 -m http.server 8080
```

Luego abrir `http://localhost:8080`.

## Build de producción

Desde la raíz del proyecto:

```bash
node build.js
```

Este proceso:

1. Regenera el índice de citas de reglamentación (`data/build_reglamento_index.js`).
2. Regenera explicaciones técnicas (`data/build_tecnica_explanations.js`).
3. Genera el `index.html` autocontenido.
4. Actualiza la carpeta `dist/` lista para deploy.

## Deploy

Subir el contenido de `dist/` a tu hosting estático.

Salida esperada (5 archivos):

- `dist/index.html`
- `dist/app.js`
- `dist/style.css`
- `dist/manifest.json`
- `dist/sw.js`

## Licencia

Este proyecto se distribuye bajo **GNU General Public License v3.0**.
Ver archivo `LICENSE`.

## Autor

Proyecto: **RadioExamen Argentina**  
Callsign en la app: **LU7DZL**

