#!/usr/bin/env node
// ==========================================================
// snapshot-sesi.mjs
// Fitur: "Beli Pagi, Jual Sore" (BPJS)
//
// Beda dengan sync-idx-full.mjs (jalan 1x/hari, EOD penuh dari file IDX),
// script ini jalan 2x SEHARI dan cuma nangkap 1 harga live per ticker
// tiap kali jalan — jauh lebih ringan, sumbernya Yahoo Finance batch
// quote (sama seperti fitur "Live Price" yang sudah dipakai di app.js),
// jadi TIDAK butuh token Stockbit yang bisa expired.
//
// CARA PAKAI (manual, dari laptop):
//   node snapshot-sesi.mjs pagi     -> jalankan ~09:05-09:15 WIB
//   node snapshot-sesi.mjs sore     -> jalankan ~15:40-15:49 WIB
//
// CARA PAKAI (otomatis, crontab -e; server/laptop HARUS di timezone WIB
// atau pakai `TZ=Asia/Jakarta` di depan tiap baris):
//   5 9 * * 1-5   cd /path/ke/app && TZ=Asia/Jakarta node snapshot-sesi.mjs pagi >> logs/sesi-pagi.log 2>&1
//   45 15 * * 1-5 cd /path/ke/app && TZ=Asia/Jakarta node snapshot-sesi.mjs sore >> logs/sesi-sore.log 2>&1
//
// ENV yang dibutuhkan (bisa taruh di .env di folder yang sama, atau
// export manual sebelum run):
//   SUPABASE_URL   -> https://xxxx.supabase.co/rest/v1   (SAMA dengan yang
//                      dipakai app.js — kalau punyamu belum ada "/rest/v1"
//                      di belakang, script ini otomatis nambahin)
//   SUPABASE_KEY   -> anon/service key yang sama dengan yang dipakai app.js
//
// SUMBER TICKER: default ambil dari tabel `watchlists` (supaya hemat
// request & rate-limit Yahoo). Kalau watchlist kosong, fallback ke SEMUA
// ticker di tabel `stocks`. Bisa dipaksa pakai semua ticker dengan flag:
//   node snapshot-sesi.mjs pagi --all
// ==========================================================

import { readFileSync, existsSync } from "node:fs";

// --- load .env sederhana (tanpa dependency dotenv) ---
if (existsSync("./.env")) {
  const envText = readFileSync("./.env", "utf8");
  for (const line of envText.split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

let SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";
if (SUPABASE_URL && !SUPABASE_URL.endsWith("/rest/v1")) SUPABASE_URL += "/rest/v1";

const MODE = (process.argv[2] || "").toLowerCase(); // "pagi" | "sore"
const FORCE_ALL = process.argv.includes("--all");

if (!["pagi", "sore"].includes(MODE)) {
  console.error('Cara pakai: node snapshot-sesi.mjs <pagi|sore> [--all]');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("SUPABASE_URL / SUPABASE_KEY belum di-set (env var atau ./.env).");
  process.exit(1);
}

function supaHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };
}

// Tanggal hari ini di WIB (YYYY-MM-DD) — dipakai sebagai key trade_date,
// SUPAYA benar walau server/laptop yang jalanin cron-nya di timezone lain.
function todayWIB() {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt.format(new Date()); // en-CA -> "YYYY-MM-DD"
}

async function getTickers() {
  if (!FORCE_ALL) {
    const res = await fetch(`${SUPABASE_URL}/watchlists?select=ticker`, { headers: supaHeaders() });
    if (res.ok) {
      const rows = await res.json();
      const tickers = [...new Set(rows.map(r => String(r.ticker).toUpperCase()))];
      if (tickers.length) {
        console.log(`Sumber ticker: watchlists (${tickers.length} ticker)`);
        return tickers;
      }
    }
    console.log("watchlists kosong/gagal diakses — fallback ke seluruh tabel stocks...");
  }
  const res = await fetch(`${SUPABASE_URL}/stocks?select=ticker`, { headers: supaHeaders() });
  if (!res.ok) throw new Error(`Gagal ambil ticker dari stocks: HTTP ${res.status}`);
  const rows = await res.json();
  const tickers = [...new Set(rows.map(r => String(r.ticker).toUpperCase()))];
  console.log(`Sumber ticker: stocks (${tickers.length} ticker)`);
  return tickers;
}

// Yahoo Finance batch quote — ticker IDX pakai suffix .JK
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchYahooBatch(tickers) {
  const results = new Map(); // ticker (tanpa .JK) -> { price, volume }
  for (const group of chunk(tickers, 40)) {
    const symbols = group.map(t => `${t}.JK`).join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) { console.warn(`  Yahoo batch gagal (HTTP ${res.status}) untuk grup: ${group.join(",")}`); continue; }
      const data = await res.json();
      const list = data?.quoteResponse?.result || [];
      for (const q of list) {
        const ticker = String(q.symbol || "").replace(/\.JK$/, "").toUpperCase();
        if (!ticker) continue;
        results.set(ticker, {
          price: q.regularMarketPrice ?? null,
          volume: q.regularMarketVolume ?? null,
        });
      }
    } catch (e) {
      console.warn(`  Error fetch grup ${group.join(",")}: ${e.message}`);
    }
    // jeda kecil biar sopan ke Yahoo
    await new Promise(r => setTimeout(r, 250));
  }
  return results;
}

async function upsertSnapshots(rows) {
  if (!rows.length) { console.log("Tidak ada baris untuk di-upsert."); return; }
  const CHUNK = 200;
  for (const group of chunk(rows, CHUNK)) {
    const res = await fetch(`${SUPABASE_URL}/sesi_snapshots?on_conflict=ticker,trade_date`, {
      method: "POST",
      headers: { ...supaHeaders(), Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(group),
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const body = await res.json(); if (body?.message) msg += ` — ${body.message}`; } catch {}
      console.error(`  Gagal upsert grup (${group.length} baris): ${msg}`);
    } else {
      console.log(`  Upsert OK: ${group.length} baris.`);
    }
  }
}

async function main() {
  console.log(`=== snapshot-sesi.mjs — mode: ${MODE.toUpperCase()} — ${new Date().toISOString()} ===`);
  const tickers = await getTickers();
  if (!tickers.length) { console.log("Tidak ada ticker untuk di-snapshot. Selesai."); return; }

  console.log(`Mengambil harga live untuk ${tickers.length} ticker dari Yahoo Finance...`);
  const quotes = await fetchYahooBatch(tickers);
  console.log(`Berhasil ambil harga untuk ${quotes.size}/${tickers.length} ticker.`);

  const tradeDate = todayWIB();
  const capturedAt = new Date().toISOString();

  const rows = [];
  for (const ticker of tickers) {
    const q = quotes.get(ticker);
    if (!q || q.price == null) continue; // skip ticker yang gagal diambil, jangan tulis NULL nimpa data lama
    const row = { ticker, trade_date: tradeDate };
    if (MODE === "pagi") {
      row.harga_pagi = q.price;
      row.volume_pagi = q.volume ?? null;
      row.captured_pagi_at = capturedAt;
    } else {
      row.harga_sore = q.price;
      row.volume_sore = q.volume ?? null;
      row.captured_sore_at = capturedAt;
    }
    rows.push(row);
  }

  console.log(`Menulis ${rows.length} baris ke sesi_snapshots (trade_date=${tradeDate})...`);
  await upsertSnapshots(rows);
  console.log("=== Selesai. ===");
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
