-- ============================================================================
-- AYDATTIRE — Skema Database Supabase (PostgreSQL)
-- Mendukung PRD_Sewa_Kebaya.md:
-- 1. Katalog produk (Pria & Wanita) dengan spesifikasi ukuran & deposit
-- 2. Pemesanan sewa (Dalam Kota 3 hari / Luar Kota 5 hari) + Date Range Locking
--    (tgl_ambil, tgl_pakai, tgl_kembali, tgl_selesai_laundry)
-- 3. Opsi custom_size (Permak Ringan: LD, Panjang, Pinggang, Catatan) per item
-- 4. Bukti transfer, resi pengembalian luar kota, & status refund deposit
-- 5. Janji temu sesi fitting (opsional)
-- 6. Storage bucket 'aydattire-uploads' untuk bukti bayar & resi
-- ============================================================================

-- Bersihkan tabel jika sudah ada (urutan aman relasi)
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.fitting_appointments cascade;
drop table if exists public.products cascade;

-- ============================================================================
-- 1. TABEL PRODUCTS (Katalog Busana)
-- ============================================================================
create table public.products (
  id bigint primary key,
  name text not null,
  cat text not null default 'wanita',
  sub text not null,
  img text not null,
  price integer not null check (price >= 0),
  deposit integer not null check (deposit >= 0),
  sizes text[] not null default '{}',
  color text not null,
  tema text[] not null default '{}',
  tag text not null default 'Tersedia',
  booked boolean not null default false,
  bahan text not null default '',
  ukuran jsonb not null default '{"LD": "", "Panjang": "", "Pinggang": ""}'::jsonb,
  aksesori text[] default null,
  created_at timestamptz not null default now()
);

create index idx_products_cat on public.products (cat);

-- ============================================================================
-- 2. TABEL ORDERS (Transaksi Penyewaan)
-- ============================================================================
create table public.orders (
  id text primary key, -- contoh: AYD-261113-ABCD
  customer jsonb not null, -- { name, wa, email, address, city, zip, note }
  type text not null check (type in ('dalam_kota', 'luar_kota')),
  event_date date not null,
  tgl_ambil date not null,
  tgl_pakai date not null,
  tgl_kembali date not null,
  tgl_selesai_laundry date not null,
  schedule jsonb not null default '[]'::jsonb,
  security text not null check (security in ('ktp', 'deposit')),
  payment text not null check (payment in ('dp', 'full')),
  totals jsonb not null, -- { rental, shipping, deposit, subtotal, grandTotal, payNow, payLater }
  refund jsonb default null, -- { bank, number, holder }
  status text not null default 'pending' check (status in ('pending', 'paid', 'active', 'returned', 'completed', 'expired', 'cancelled')),
  pay_method text default null,
  proof_url text default null,
  proof_name text default null,
  balance_proof_url text default null,
  balance_pay_method text default null,
  balance_paid_at timestamptz default null,
  balance_verified boolean not null default false,
  outbound_shipment jsonb default null, -- { courier, number }
  return_shipment jsonb default null,   -- { courier, number, proofUrl, submittedAt }
  deposit_status text not null default 'holding' check (deposit_status in ('holding', 'inspecting', 'refunded', 'penalized')),
  deposit_penalty integer not null default 0,
  deposit_refund_proof_url text default null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  paid_at timestamptz default null
);

create index idx_orders_status on public.orders (status);
create index idx_orders_dates on public.orders (tgl_ambil, tgl_selesai_laundry);

-- ============================================================================
-- 3. TABEL ORDER_ITEMS (Daftar Busana per Pesanan + Permak Ukuran)
-- ============================================================================
create table public.order_items (
  id bigserial primary key,
  order_id text not null references public.orders (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete restrict,
  name text not null,
  img text not null,
  sub text not null,
  size text not null,
  price integer not null,
  deposit integer not null,
  ukuran jsonb not null default '{}'::jsonb,
  custom_size jsonb not null default '{"isCustom": false, "ld": "", "panjang": "", "pinggang": "", "note": ""}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_order_items_order_id on public.order_items (order_id);
create index idx_order_items_product_id on public.order_items (product_id);

-- ============================================================================
-- 4. TABEL FITTING_APPOINTMENTS (Janji Temu Fitting Mandiri)
-- ============================================================================
create table public.fitting_appointments (
  id text primary key, -- contoh: FIT-AB12C
  name text not null,
  wa text not null,
  appointment_date date not null,
  session_id smallint not null check (session_id in (1, 2, 3)),
  session_label text not null,
  session_time text not null,
  product_ids bigint[] not null default '{}',
  product_names text[] not null default '{}',
  note text default '',
  status text not null default 'confirmed' check (status in ('confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index idx_fitting_date_session on public.fitting_appointments (appointment_date, session_id);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) — Publik (Front-Office) & Admin (Authenticated)
-- ============================================================================
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.fitting_appointments enable row level security;

-- Kebijakan Tabel PRODUCTS
drop policy if exists "Publik dapat melihat katalog produk" on public.products;
create policy "Publik dapat melihat katalog produk"
  on public.products for select using (true);

drop policy if exists "Admin dapat mengelola katalog produk" on public.products;
create policy "Admin dapat mengelola katalog produk"
  on public.products for all
  to authenticated, anon
  using (true)
  with check (true);

-- Kebijakan Tabel ORDERS
drop policy if exists "Publik & Admin dapat mengelola pesanan" on public.orders;
create policy "Publik & Admin dapat mengelola pesanan"
  on public.orders for all
  to authenticated, anon
  using (true)
  with check (true);

-- Kebijakan Tabel ORDER_ITEMS
drop policy if exists "Publik & Admin dapat mengelola item pesanan" on public.order_items;
create policy "Publik & Admin dapat mengelola item pesanan"
  on public.order_items for all
  to authenticated, anon
  using (true)
  with check (true);

-- Kebijakan Tabel FITTING_APPOINTMENTS
drop policy if exists "Publik & Admin dapat mengelola janji fitting" on public.fitting_appointments;
create policy "Publik & Admin dapat mengelola janji fitting"
  on public.fitting_appointments for all
  to authenticated, anon
  using (true)
  with check (true);

-- ============================================================================
-- 6. SEED DATA KATALOG PRODUK (Dari frontend/src/data/products.js)
-- ============================================================================
insert into public.products
  (id, name, cat, sub, img, price, deposit, sizes, color, tema, tag, booked, bahan, ukuran, aksesori)
values
  (1,  'Kebaya Beludru Marun',          'wanita', 'Kebaya Modern',      '/assets/img/hero.jpg',             450000,  300000, array['S','M','L'],      'Merah', array['Pernikahan','Lamaran'], 'Terlaris', false, 'Beludru premium, bordir benang emas', '{"LD": "88–96 cm", "Panjang": "62 cm", "Pinggang": "70–78 cm"}', null),
  (2,  'Beskap Jawa Hitam',             'pria',   'Beskap Tradisional', '/assets/img/beskap.jpg',           350000,  250000, array['M','L','XL'],     'Hitam', array['Pernikahan','Adat'],    'Baru',     false, 'Wol campuran, kancing kuningan',      '{"LD": "96–110 cm", "Panjang": "70 cm", "Pinggang": "84–96 cm"}', array['Blangkon','Jarik','Bros']),
  (3,  'Kebaya Kutubaru Sage',          'wanita', 'Kutubaru',           '/assets/img/kebaya-kutubaru.jpg',  300000,  200000, array['S','M','L','XL'], 'Hijau', array['Lamaran','Adat'],       'Tersedia', false, 'Katun brokat, furing satin',          '{"LD": "86–100 cm", "Panjang": "60 cm", "Pinggang": "68–82 cm"}', null),
  (4,  'Jas Navy Slim Fit',             'pria',   'Jas',                '/assets/img/jas.jpg',              275000,  200000, array['M','L','XL'],     'Biru',  array['Wisuda','Pernikahan'],  'Tersedia', false, 'Wool blend, slim fit',                '{"LD": "96–108 cm", "Panjang": "72 cm", "Pinggang": "82–94 cm"}', array['Dasi','Manset']),
  (5,  'Kebaya Pengantin Brokat Putih', 'wanita', 'Pengantin',          '/assets/img/kebaya-pengantin.jpg', 1250000, 500000, array['S','M','L'],      'Putih', array['Pernikahan'],           'Premium',  false, 'Brokat Prancis, payet & mutiara',     '{"LD": "84–94 cm", "Panjang": "Ekor 120 cm", "Pinggang": "66–76 cm"}', array['Veil','Bros']),
  (6,  'Beskap Solo Velvet',            'pria',   'Basofi',             '/assets/img/beskap.jpg',           400000,  300000, array['L','XL'],         'Hitam', array['Adat','Pernikahan'],    'Penuh',    true,  'Velvet, bordir emas',                 '{"LD": "100–112 cm", "Panjang": "72 cm", "Pinggang": "88–100 cm"}', null),
  (7,  'Kebaya Wisuda Hijau',           'wanita', 'Wisuda',             '/assets/img/kebaya-kutubaru.jpg',  250000,  200000, array['S','M'],          'Hijau', array['Wisuda'],               'Tersedia', false, 'Brokat lembut, furing katun',         '{"LD": "84–92 cm", "Panjang": "58 cm", "Pinggang": "66–74 cm"}', null),
  (8,  'Jas Formal Klasik',             'pria',   'Jas',                '/assets/img/jas.jpg',              300000,  200000, array['M','L'],          'Biru',  array['Wisuda','Lamaran'],     'Tersedia', false, 'Wool, regular fit',                   '{"LD": "98–106 cm", "Panjang": "74 cm", "Pinggang": "84–92 cm"}', null),
  (9,  'Kebaya Encim Bordir Marun',     'wanita', 'Encim',              '/assets/img/hero.jpg',             325000,  250000, array['M','L','XL'],     'Merah', array['Adat','Lamaran'],       'Tersedia', false, 'Voile, bordir tangan',                '{"LD": "90–104 cm", "Panjang": "64 cm", "Pinggang": "72–86 cm"}', null),
  (10, 'Kebaya Akad Lace Ivory',        'wanita', 'Pengantin',          '/assets/img/kebaya-pengantin.jpg', 950000,  500000, array['S','M'],          'Putih', array['Pernikahan'],           'Tersedia', false, 'Lace ivory, payet halus',             '{"LD": "84–92 cm", "Panjang": "Ekor 90 cm", "Pinggang": "66–74 cm"}', null),
  (11, 'Beskap Landung Hitam Emas',     'pria',   'Beskap Tradisional', '/assets/img/beskap.jpg',           375000,  250000, array['M','L'],          'Hitam', array['Pernikahan','Adat'],    'Tersedia', false, 'Drill premium, list emas',            '{"LD": "96–106 cm", "Panjang": "90 cm", "Pinggang": "84–94 cm"}', null),
  (12, 'Kebaya Modern Sage Brokat',     'wanita', 'Kebaya Modern',      '/assets/img/kebaya-kutubaru.jpg',  350000,  250000, array['S','M','L'],      'Hijau', array['Wisuda','Lamaran'],     'Tersedia', false, 'Brokat, kerah sabrina',               '{"LD": "84–96 cm", "Panjang": "60 cm", "Pinggang": "66–78 cm"}', null)
on conflict (id) do update set
  name = excluded.name,
  cat = excluded.cat,
  sub = excluded.sub,
  img = excluded.img,
  price = excluded.price,
  deposit = excluded.deposit,
  sizes = excluded.sizes,
  color = excluded.color,
  tema = excluded.tema,
  tag = excluded.tag,
  booked = excluded.booked,
  bahan = excluded.bahan,
  ukuran = excluded.ukuran,
  aksesori = excluded.aksesori;

-- ============================================================================
-- 7. STORAGE BUCKET UNTUK BUKTI TRANSFER & RESI ('aydattire-uploads')
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('aydattire-uploads', 'aydattire-uploads', true)
on conflict (id) do nothing;

drop policy if exists "Publik dapat melihat file bukti & resi" on storage.objects;
create policy "Publik dapat melihat file bukti & resi"
  on storage.objects for select
  using (bucket_id = 'aydattire-uploads');

drop policy if exists "Publik dapat mengunggah file bukti & resi" on storage.objects;
create policy "Publik dapat mengunggah file bukti & resi"
  on storage.objects for insert
  to authenticated, anon
  with check (bucket_id = 'aydattire-uploads');

drop policy if exists "Admin dapat memperbarui & menghapus file storage" on storage.objects;
create policy "Admin dapat memperbarui & menghapus file storage"
  on storage.objects for update
  to authenticated, anon
  using (bucket_id = 'aydattire-uploads');

drop policy if exists "Admin dapat menghapus file storage" on storage.objects;
create policy "Admin dapat menghapus file storage"
  on storage.objects for delete
  to authenticated, anon
  using (bucket_id = 'aydattire-uploads');
