# Gapura Media — Situs Artikel

Situs resmi **Gapura Media** di [gapuramedia.my.id](https://gapuramedia.my.id): versi lengkap dan panjang dari setiap berita yang terbit sebagai carousel di Instagram dan Facebook [@gapuramedia](https://www.instagram.com/gapuramedia).

## Stack

Sama seperti landing avenia.my.id: situs statis [DVE](https://www.npmjs.com/package/@neabyte/dve) (Deserve View Engine) + Node, di-build oleh GitHub Actions dan di-deploy ke GitHub Pages setiap push ke `main`.

- `views/` — template DVE (layout, partial, halaman beranda + artikel)
- `data/site.json` — identitas situs
- `data/articles/<slug>.json` — satu berkas per artikel (sumber kebenaran; beranda, sitemap, dan RSS digenerate dari sini)
- `public/` — aset statis (CSS, favicon, cover) + `CNAME`
- `scripts/build.mjs` — render `dist/`
- `scripts/add-article.mjs` — ubah draf Gapura yang sudah terbit (dari API dashboard) menjadi berkas artikel: `node scripts/add-article.mjs --draft <id>`

## Menambah artikel

Setiap konten Gapura yang terbit otomatis ditambahkan oleh otomatisasi Muse (mengambil draf terbit dari API, menjalankan `add-article.mjs`, lalu push berkas JSON artikelnya ke repo ini). Manual: jalankan perintah di atas lalu commit + push `data/articles/<slug>.json`.
