# Solusi Thumbnail Blank Doodstream di Replit

Masalah thumbnail blank terjadi karena **Hotlink Protection** dari Doodstream. Berikut adalah solusi teknis lengkapnya.

## 1. Gunakan Image Proxy (Solusi Paling Ampuh)

Tambahkan kode ini ke file utama Python Anda (misal `main.py`). Kode ini berfungsi sebagai perantara untuk mengambil gambar dari Doodstream.

### Jika menggunakan Flask:
```python
import requests
from flask import Flask, request, Response

app = Flask(__name__)

@app.route('/proxy-img')
def proxy_image():
    img_url = request.args.get('url')
    if not img_url:
        return "URL missing", 400
    
    # Header palsu agar dikira browser langsung
    headers = {
        "Referer": "", 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        resp = requests.get(img_url, headers=headers, stream=True)
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for (name, value) in resp.raw.headers.items()
                   if name.lower() not in excluded_headers]
        return Response(resp.content, resp.status_code, headers)
    except Exception as e:
        return str(e), 500
```

### Jika menggunakan FastAPI:
```python
import requests
from fastapi import FastAPI, Response
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.get("/proxy-img")
def proxy_image(url: str):
    headers = {"Referer": ""}
    resp = requests.get(url, headers=headers, stream=True)
    return StreamingResponse(resp.iter_content(chunk_size=1024), media_type=resp.headers.get("Content-Type"))
```

---

## 2. Cara Mendapatkan Thumbnail di Skrip Telegram

Saat bot Telegram Anda menerima video dan mengunggahnya ke Doodstream, pastikan Anda memanggil API `file/info` atau `file/image` untuk mendapatkan URL thumbnail-nya.

Contoh logika di skrip Telegram Anda:

```python
import requests

DOOD_API_KEY = "API_KEY_ANDA"

def get_dood_thumbnail(file_code):
    # Panggil API Doodstream untuk info file
    api_url = f"https://doodapi.co/api/file/info?key={DOOD_API_KEY}&file_code={file_code}"
    response = requests.get(api_url).json()
    
    if response.get("status") == 200:
        # Ambil single_img atau thumb_img
        thumbnail_url = response['result'][0].get('single_img')
        return thumbnail_url
    return None

# SAAT SIMPAN KE DATABASE WEBSITE:
# Jangan simpan: thumbnail_url
# Tapi simpan: f"/proxy-img?url={thumbnail_url}"
```

---

## 3. Update di Tampilan Website (HTML)

Di bagian website yang menampilkan daftar video, pastikan tag `<img>` Anda mengarah ke proxy yang sudah dibuat:

```html
<!-- Contoh jika URL thumbnail adalah https://img.doodcdn.io/snaps/xxx.jpg -->
<img src="/proxy-img?url={{ video.thumbnail_url }}" alt="{{ video.title }}" style="width:200px;">
```

Atau jika ingin mencoba cara tanpa proxy dulu (lebih simpel tapi kadang gagal):
```html
<img src="{{ video.thumbnail_url }}" referrerpolicy="no-referrer" alt="Thumbnail">
```

### Ringkasan Langkah:
1. Pasang fungsi `/proxy-img` di Replit.
2. Saat bot Telegram dapat `file_code` dari Doodstream, panggil API Info untuk dapat link gambar.
3. Simpan link gambar tersebut.
4. Tampilkan di website lewat jalur `/proxy-img?url=...`.
