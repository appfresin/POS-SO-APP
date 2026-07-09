# Deploy Ready

Folder ini berisi paket siap upload/deploy yang dipisah menjadi dua aplikasi.

## Struktur

- `pos/`
  Aplikasi kasir, admin, dapur, pesanan, produk, laporan, dan settings.

- `self-order/`
  Aplikasi customer self order. Paket ini lebih ringan karena tidak membawa file halaman POS/admin.

## Cara Deploy

### Opsi 1: Dua Repo GitHub

Upload isi folder berikut ke repo yang berbeda:

- Isi `deploy-ready/pos/` ke repo aplikasi kasir/admin.
- Isi `deploy-ready/self-order/` ke repo aplikasi self order.

Keduanya sudah punya `index.html`, jadi bisa langsung dibuka dari root hosting.

### Opsi 2: Satu Repo, Dua Subfolder

Upload folder `pos/` dan `self-order/` ke repo yang sama.

Contoh URL:

- `https://domain-kamu.com/pos/`
- `https://domain-kamu.com/self-order/?table=A-1#selforder`

## URL QR Meja

Untuk QR meja, gunakan format:

```text
https://domain-kamu.com/self-order/?table=A-1#selforder
https://domain-kamu.com/self-order/?table=A-2#selforder
...
https://domain-kamu.com/self-order/?table=A-20#selforder
```

Jika self order dideploy sebagai subdomain:

```text
https://order.domain-kamu.com/?table=A-1#selforder
```

## Catatan Maintenance

Source utama tetap berada di root project. Jika ada perubahan fitur, lakukan perubahan di source utama dulu, lalu refresh isi folder `deploy-ready`.
