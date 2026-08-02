#!/bin/bash
set -e

echo "================================================"
echo " KAMPUNG BOKEP — Deploy to Firebase Hosting"
echo "================================================"

CONFIG="frontend/config.js"

# ── Tentukan REPLIT_BACKEND_URL ──────────────────────────────────────
# Prioritas: env var REPLIT_BACKEND_URL → baca dari config.js yang sudah terpatch
if [ -n "$REPLIT_BACKEND_URL" ]; then
  BACKEND_URL="$REPLIT_BACKEND_URL"
  BACKEND_LABEL="env var REPLIT_BACKEND_URL"
else
  # Fallback: ekstrak URL yang sudah ada di config.js (jika sebelumnya sudah di-patch)
  BACKEND_URL=$(grep -o "https://[a-zA-Z0-9._-]*\.replit\.app" "$CONFIG" 2>/dev/null | head -1)
  if [ -n "$BACKEND_URL" ]; then
    BACKEND_LABEL="config.js (sudah terpatch)"
  else
    echo ""
    echo " ❌ ERROR: REPLIT_BACKEND_URL tidak ditemukan."
    echo ""
    echo " Set env var berikut di Replit (bukan secret, ini nilai publik):"
    echo "   REPLIT_BACKEND_URL=https://<nama-proyek>.<user>.replit.app"
    echo ""
    echo " Atau set via shell sebelum menjalankan script ini:"
    echo "   export REPLIT_BACKEND_URL=https://... && ./deploy.sh"
    echo ""
    exit 1
  fi
fi

echo ""
echo "[1/3] Backend ($BACKEND_LABEL): $BACKEND_URL"

# ── Backup & patch config.js ─────────────────────────────────────────
cp "$CONFIG" "${CONFIG}.bak"

# Pastikan config.js SELALU dikembalikan ke placeholder setelah script selesai,
# bahkan jika deploy gagal atau di-interrupt (Ctrl+C).
restore_config() {
  if [ -f "${CONFIG}.bak" ]; then
    mv "${CONFIG}.bak" "$CONFIG"
    echo " config.js dikembalikan ke placeholder."
  fi
}
trap restore_config EXIT

# Gunakan delimiter | agar karakter & atau / di URL tidak mengganggu sed
sed -i "s|__REPLIT_BACKEND_URL__|${BACKEND_URL}|g" "$CONFIG"
echo "[2/3] config.js sudah di-patch dengan URL backend."

# ── Deploy ke Firebase Hosting ────────────────────────────────────────
echo "[3/3] Deploying ke Firebase Hosting (project: kampung-bokep)..."

# FIREBASE_TOKEN dibutuhkan untuk autentikasi non-interactive (CI/Replit).
# Dapatkan token dengan menjalankan: firebase login:ci
# lalu simpan hasilnya sebagai secret FIREBASE_TOKEN di Replit.
if [ -z "$FIREBASE_TOKEN" ]; then
  echo ""
  echo " ❌ ERROR: FIREBASE_TOKEN tidak ditemukan."
  echo ""
  echo " Cara mendapatkan token:"
  echo "   1. Di terminal lokal (bukan Replit), jalankan: npx firebase-tools login:ci"
  echo "   2. Login ke akun Google yang punya akses project kampung-bokep"
  echo "   3. Salin token yang muncul (1//<xxx>...)"
  echo "   4. Simpan sebagai Secret di Replit dengan nama: FIREBASE_TOKEN"
  echo ""
  exit 1
fi

npx firebase-tools deploy --only hosting --project kampung-bokep --token "$FIREBASE_TOKEN"

echo ""
echo "================================================"
echo " Deploy selesai!"
echo " Live di: https://kampung-bokep.web.app"
echo " Backend : $BACKEND_URL"
echo "================================================"
