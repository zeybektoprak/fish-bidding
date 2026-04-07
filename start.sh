#!/bin/bash
# Balıklıova Balık İhalesi Sistemi - Başlatma Scripti

echo "🐟 Balıklıova Balık İhalesi Sistemi başlatılıyor..."

# Backend
echo "📦 Backend başlatılıyor (http://localhost:8000)..."
cd "$(dirname "$0")/backend"
pyenv global 3.10.12
python3 -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Frontend
echo "🌐 Frontend başlatılıyor (http://localhost:5173)..."
cd "$(dirname "$0")/frontend"
/opt/homebrew/bin/npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Sistem çalışıyor!"
echo "   Frontend: http://localhost:5173"
echo "   API Docs: http://localhost:8000/docs"
echo "   İlk kurulum: http://localhost:5173/setup"
echo ""
echo "Durdurmak için Ctrl+C..."

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Sistem durduruldu.'" EXIT
wait
