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
npx firebase-tools deploy --only hosting --project kampung-bokep

echo ""
echo "================================================"
echo " Deploy selesai!"
echo " Live di: https://kampung-bokep.web.app"
echo " Backend : $BACKEND_URL"
echo "================================================"
