#!/bin/bash
set -e

echo "📦 Installing backend dependencies..."
cd backend && npm install
cd ..

echo ""
echo "✅ Semua dependencies berhasil diinstall!"
echo "🚀 Jalankan server dengan: node backend/index.js"
