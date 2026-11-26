-- 09_stocks_corporate_calendar.sql
-- Jalankan SEKALI di Supabase SQL Editor SEBELUM menjalankan sync-idx-full.mjs versi baru.
-- Kalau tidak, upsert ke `stocks` akan gagal karena kolom belum ada.
-- (Ganti nomor 09 kalau sudah dipakai file migrasi lain.)

alter table public.stocks
  add column if not exists ex_dividend_date   date,
  add column if not exists dividend_pay_date  date,
  add column if not exists next_earnings_date date;

comment on column public.stocks.ex_dividend_date   is 'Yahoo calendarEvents.exDividendDate (bisa tanggal terakhir yang sudah lewat)';
comment on column public.stocks.dividend_pay_date  is 'Yahoo calendarEvents.dividendDate';
comment on column public.stocks.next_earnings_date is 'Yahoo calendarEvents.earnings.earningsDate (tanggal paling awal)';

-- app.js membaca 3 kolom ini LANGSUNG dari tabel `stocks` (bukan dari view stocks_screener),
-- jadi view tidak perlu dibuat ulang. Pastikan role anon boleh SELECT tabel stocks.
-- Kalau belum, salah satu dari dua opsi ini (pilih sesuai kebijakan RLS-mu):
--   grant select (ticker, ex_dividend_date, dividend_pay_date, next_earnings_date) on public.stocks to anon;
--   -- dan bila RLS aktif di `stocks`:
--   create policy "anon read stocks calendar" on public.stocks for select to anon using (true);

-- Cek hasil setelah sync:
-- select count(*) filter (where ex_dividend_date is not null)   as ada_exdiv,
--        count(*) filter (where dividend_pay_date is not null)  as ada_bayar,
--        count(*) filter (where next_earnings_date is not null) as ada_earnings,
--        count(*)                                               as total
-- from public.stocks;
