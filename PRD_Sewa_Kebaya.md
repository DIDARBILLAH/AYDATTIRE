# Product Requirements Document (PRD)

## Sistem Manajemen & Penyewaan Kebaya Online (Web-Based)

---

### 1. Ringkasan Produk & Objektif (_Executive Summary_)

Aplikasi web ini dirancang untuk mendigitalkan proses bisnis penyewaan busana tradisional dan modern (Kebaya, Beskap, Jas, Basofi) baik untuk pria maupun wanita. Sistem menangani dua skenario penyewaan (Dalam Kota dan Luar Kota) dengan mekanisme kalender ketersediaan dinamis, penjadwalan _fitting_ bertahap, manajemen jaminan (KTP fisik / uang deposit), serta sistem pembayaran bertahap (DP dan Pelunasan).

---

### 2. User Roles & Hak Akses

1. **User / Penyewa (Klien):**
   - Menjelajahi katalog busana (kategori Pria dan Wanita).
   - Memesan sesi _fitting_ mandiri dengan pemilihan tanggal dan slot sesi.
   - Melakukan reservasi sewa dengan sistem kalender terpadu (keterangan otomatis pengambilan, pemakaian, pengembalian).
   - Melakukan pembayaran (DP atau Lunas) serta memilih skema jaminan.
   - Memantau status pesanan, jadwal ambil/kembali, dan status pencairan deposit.
2. **Admin / Pengelola Toko:**
   - Memiliki akses penuh ke seluruh pengaturan sistem dan data operasional.
   - Mengelola katalog produk, stok, variasi ukuran, harga sewa, dan nominal deposit.
   - Mengatur jadwal dan kuota sesi _fitting_ harian.
   - Memantau dashboard operasional (kalender keluar-masuk baju, status laundry, deposit aktif).
   - Melakukan verifikasi pembayaran, inspeksi pengembalian barang, dan persetujuan pengembalian deposit (_refund_).

---

### 3. Logika Bisnis Utama (_Core Business Logic_)

#### A. Sistem Booking _Fitting_ (Janji Temu Ukur Baju)

- _Fitting_ bersifat opsional namun memiliki alur independen dari sewa agar tidak bentrok dengan jadwal keluar-masuk baju.
- Setiap hari memiliki kuota kapasitas per sesi untuk mencegah penumpukan tamu di butik/studio.
- **Format Sesi Harian:**
  - **Sesi 1:** 10:00 – 12:00 WIB
  - **Sesi 2:** 13:00 – 15:00 WIB
  - **Sesi 3:** 15:30 – 17:30 WIB
- Klien memilih tanggal temu + sesi jam, lalu mendapatkan tiket/kode konfirmasi janji temu _fitting_.

#### B. Logika Kalender Rental & Kunci Tanggal Otomatis

Sistem menggunakan mekanisme _Date Range Locking_:

- **Dalam Kota (Durasi 3 Hari):**
  - Klien memilih **Tanggal Pemakaian / Hari Acara (H)**.
  - Sistem secara otomatis mengunci rentang 3 hari berurutan:
    - **H-1:** Tanggal Pengambilan (Pukul 10.00 – 17.00 WIB)
    - **H:** Tanggal Pemakaian (Hari Acara)
    - **H+1:** Tanggal Pengembalian (Maksimal pukul 18.00 WIB)
  - **Laundry & Maintenance Buffer (H+2):** Otomatis di-lock oleh sistem sebagai jeda cuci kering (_dry clean_) dan inspeksi sebelum baju bisa disewa kembali oleh klien lain.
- **Luar Kota (Durasi 5 Hari):**
  - Memperhitungkan transit ekspedisi (2 hari ekspedisi kirim, 1 hari acara, 2 hari ekspedisi kembali).
  - Hari ke-1: Baju diterima penyewa (berdasarkan resi aktif / estimasi kirim).
  - Hari ke-5: Batas penyewa mengunggah resi pengiriman balik ke toko.
- **Aturan Kunci Slot (_Locking Rule_):**
  - Saat klien menekan tombol "Checkout", sistem menerapkan status _temporary lock_ selama 30 menit untuk memberi waktu pembayaran.
  - Jika pembayaran DP/Lunas terverifikasi, tanggal tersebut resmi berstatus **Booked** dan tertutup di kalender publik.

#### C. Kebijakan Jaminan (_Security Deposit_ & KTP)

- **Penyewaan Dalam Kota:**
  - Opsi 1: KTP Asli (diserahkan langsung secara fisik saat pengambilan baju di butik).
  - Opsi 2: Deposit Uang Tunai / Transfer (nominal ditentukan per busana, misal Rp200.000 – Rp500.000).
- **Penyewaan Luar Kota:**
  - Wajib Deposit Uang Penuh (tidak menerima KTP foto demi mitigasi risiko kehilangan).
- **Alur Pengembalian Deposit:**
  - Baju diterima kembali oleh butik.
  - Admin melakukan inspeksi kondisi fisik (kancing, payet, kain, noda).
  - Jika kondisi baik, deposit ditransfer balik ke rekening penyewa dalam 1x24 jam.
  - Jika terdapat kerusakan/keterlambatan, deposit dipotong sesuai denda yang tercatat di sistem.

#### D. Skema Pembayaran

- **Pembayaran Bertahap (DP):**
  - Minimal DP 30% atau 50% untuk mengunci tanggal.
  - Pelunasan sisa tagihan sewa (+ uang deposit jika memilih opsi deposit) wajib dilakukan maksimal pada saat pengambilan baju (H-1) atau sebelum paket dikirim untuk luar kota.
- **Pembayaran Lunas:**
  - Pembayaran 100% biaya sewa di awal saat checkout (+ uang deposit jika berlaku).

---

### 4. Kebutuhan Fungsional (_Functional Requirements_)

#### Modul Pengguna (Front-Office / Klien)

1. **Navigasi & Katalog:**
   - Filter kategori utama: **Pria** (Beskap Tradisional, Basofi, Jas) dan **Wanita** (Kebaya Modern, Kutubaru, Encim, Wisuda, Pengantin).
   - Filter sekunder: Ukuran (S, M, L, XL, Custom Lingkar Dada), Warna, Tema Acara.
2. **Halaman Detail Produk & Kalender Interaktif:**
   - Tampilan galeri foto multi-sudut, detail bahan, detail ukuran (LD, panjang baju, lingkar pinggang).
   - Kalender interaktif: Ketika user mengklik 1 tanggal, sistem otomatis menyorot 3 hari (Ambil, Pakai, Kembali) dengan warna dan label keterangan yang jelas.
   - Indikator warna kalender: Hijau (_Available_), Abu-abu (_Booked/Maintenance_), Biru (_Selected Range_).
3. **Pemesanan Sesi Fitting:**
   - Halaman khusus janji temu _fitting_.
   - Kalender pemilihan hari dan pilihan radio button sesi jam (Sesi 1 / Sesi 2 / Sesi 3).
   - Input nama, nomor WhatsApp aktif, dan daftar baju yang ingin dicoba (maksimal 3 item).
4. **Checkout & Pembayaran:**
   - Pilihan metode sewa (Ambil di Toko / Kirim Luar Kota).
   - Pilihan tipe jaminan (KTP Fisik saat ambil / Transfer Deposit).
   - Pilihan nominal bayar (Bayar DP 50% atau Bayar Lunas).
   - Upload bukti transfer atau integrasi Payment Gateway otomatis (QRIS, VA, Transfer Bank).
   - Input detail rekening penyewa untuk keperluan _refund_ deposit.
5. **Dashboard Klien:**
   - Riwayat transaksi dan invoice digital.
   - Countdown menuju tanggal pengambilan dan pengembalian.
   - Form upload resi pengembalian (khusus luar kota).
   - Pelacak status pengembalian deposit.

#### Modul Admin (Back-Office)

1. **Dashboard Utama:**
   - Ringkasan pendapatan sewa bulan ini (DP vs Lunas).
   - Baju yang wajib disiapkan / diserahkan hari ini.
   - Baju yang wajib kembali hari ini.
   - Notifikasi deposit tertahan yang belum di-refund.
2. **Kalender Operasional (Timeline / Gantt View):**
   - Visualisasi jadwal per busana (status: _Fitting, Booked, In-Use, Laundry, Available_).
3. **Manajemen Order & Rental:**
   - Daftar seluruh pesanan dengan filter status: _Pending Payment, DP Terverifikasi, Lunas, Siap Ambil/Kirim, Sedang Disewa, Dikembalikan, Pengecekan, Selesai, Dibatalkan_.
   - Aksi admin: Konfirmasi pembayaran manual, ubah status pesanan, terbitkan tagihan pelunasan.
4. **Manajemen Fitting:**
   - Daftar janji temu harian per sesi jam.
   - Aksi konfirmasi kehadiran klien dan catatan hasil _fitting_ (misal: perlu peniti/kait tambahan).
5. **Manajemen Jaminan & Inspeksi Barang:**
   - Form checklist pengembalian: kebersihan kain, kelengkapan payet/kancing, kelengkapan aksesori (bros/manset/jarik).
   - Input potongan denda (jika ada) dan upload bukti transfer pengembalian sisa deposit ke klien.
6. **Manajemen Produk & Inventaris:**
   - Tambah/edit/hapus busana, set stok per ukuran, atur harga sewa, dan tentukan nilai deposit default.
   - Fitur blokir tanggal manual untuk keperluan maintenance/rusak.

---

### 5. Rancangan Struktur Entitas Data (_Database Schema Outline_)

```
[Users]
- id, name, email, phone, role (client/admin), created_at

[Products]
- id, name, category (pria/wanita), sub_category (kebaya/beskap/jas),
  size, chest_size_cm, rental_price, deposit_amount, status, photos

[FittingAppointments]
- id, user_id, appointment_date, session_slot (10-12 / 13-15 / 15:30-17:30),
  notes, status (confirmed/completed/cancelled)

[RentalOrders]
- id, order_number, user_id, rental_type (dalam_kota / luar_kota),
  start_date (ambil), event_date (pakai), end_date (kembali),
  payment_type (dp / full), total_rental_fee, dp_amount, remaining_amount,
  security_type (ktp / deposit), deposit_amount, deposit_status (holding/refunded/penalized),
  order_status (pending/confirmed/active/returned/completed),
  created_at

[OrderItems]
- id, order_id, product_id, price

[ProductSchedules]
- id, product_id, date, status (booked/usage/return/laundry), order_id
```

---

### 6. Rencana Tahapan Pengembangan (_Roadmap_)

- **Fase 1 (MVP):** Katalog baju pria & wanita, kalender 3-hari otomatis (ambil-pakai-kembali), form order manual transfer, dashboard admin dasar.
- **Fase 2:** Modul janji temu sesi _fitting_ mandiri, manajemen deposit & checklist inspeksi barang.
- **Fase 3:** Integrasi Payment Gateway (pembayaran otomatis) dan API pelacakan resi ekspedisi (untuk luar kota).
