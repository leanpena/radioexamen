#!/bin/bash
# RadioExamen - Servidor local para Chrome/Brave/Flatpak
# Uso: bash serve.sh

PORT=8080
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo " RadioExamen Argentina"
echo " Servidor local iniciado en:"
echo " http://localhost:$PORT"
echo ""
echo " Abriendo en tu navegador..."
echo " Presiona Ctrl+C para detener."
echo "========================================"

# Abrir navegador en segundo plano
sleep 1 && xdg-open "http://localhost:$PORT" &

# Iniciar servidor Python 3
cd "$DIR" && python3 -m http.server $PORT
