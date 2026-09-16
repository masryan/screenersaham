// =============================================================
// sync-stockbit-to-flows.mjs
//
// TUJUAN: skrip JEMBATAN — nambal tabel `flows` pakai data yang sudah
// ada di `price_history_stockbit`, KHUSUS untuk (ticker, date) yang
// BELUM ADA di `flows`. Skrip ini tidak pernah menimpa baris `flows`
// yang sudah ada.
//
// KENAPA DIBUTUHKAN: sync-idx-full.mjs mengisi `flows` dari IDX (harus
// jalan dari PC rumah karena Cloudflare), sedangkan
// sync-stockbit-history.mjs mengisi `price_history_stockbit` dari
// Stockbit (jalan otomatis 30 menit sekali lewat GitHub Actions, tidak
// tergantung PC rumah). Dua tabel itu independen — sync-idx-full.mjs
// (mode --skip-fetch) menghitung indikator teknikal HANYA dari `flows`,
// jadi kalau PC rumah sempat tidak sync IDX di suatu hari, `flows`
// bolong dan skrip jembatan inilah yang menambalnya dari Stockbit
// supaya perhitungan teknikal tetap punya data segar.
//
// APA YANG DISALIN (aman, murni OHLCV + foreign flow harian):
//   ticker       <- stock_code
//   date         <- trade_date
//   open_price   <- open
//   high         <- high
//   low          <- low
//   close        <- close
//   volume       <- volume
//   value        <- value_idr
//   frequency    <- frequency
//   foreign_buy  <- foreign_buy
//   foreign_sell <- foreign_sell
//
// APA YANG SENGAJA TIDAK DISENTUH/DIISI (by design, sesuai keputusan
// user — 272 hari data IDX yang sudah ada harus tetap jadi sumber
// tunggal untuk ini):
//   - listed_shares  : tidak ada di payload Stockbit sama sekali.
//   - bid/offer/*_volume : bahkan bukan kolom `flows` (itu snapshot
//     harian yang ditempel ke `stocks`, bukan deret waktu di `flows`),
//     dan endpoint historical Stockbit memang tidak menyediakannya.
// Baris baru yang disisipkan lewat skrip ini otomatis NULL di kolom²
// tsb (kolom `flows` yang tidak diisi saat INSERT) — itu memang yang
// diinginkan, BUKAN bug.
//
// STRATEGI ANTI-TIMPA: untuk tiap ticker, skrip HANYA mengambil baris
// price_history_stockbit yang tanggalnya BELUM ADA di flows (dicek
// lebih dulu lewat query terpisah), lalu insert baris itu saja. Baris
// `flows` yang sudah ada — termasuk yang listed_shares/bid/offer-nya
// sudah terisi dari IDX — TIDAK PERNAH disentuh oleh skrip ini.
//
// Pakai:
//   node sync-stockbit-to-flows.mjs                    -> semua ticker, 30 hari kalender terakhir
//   node sync-stockbit-to-flows.mjs --days=400          -> jendela lebih lebar (mis. backfill sekali di awal)
//   node sync-stockbit-to-flows.mjs --tickers=BBCA,TLKM -> batasi ke ticker tertentu (uji coba)
//   node sync-stockbit-to-flows.mjs --dry-run           -> hitung & tampilkan saja, tanpa menulis ke Supabase
// =============================================================

import { readFileSync } from "node:fs";

// -------------------------------------------------------------
// Konfigurasi (pola identik dengan sync-stockbit-history.mjs)
// -------------------------------------------------------------
const ENV_FILE = new URL("../.env.local", import.meta.url);

function loadEnv() {
  let text;
  try {
    text = readFileSync(ENV_FILE, "utf8");
  } catch {
    return {};
  }
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnv(), ...process.env };
const SUPABASE_URL = env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi.\n" +
      "Buat berkas .env.local di root project atau isi GitHub Secrets:\n\n" +
      "  SUPABASE_URL=https://xxxx.supabase.co\n" +
      "  SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...\n",
  );
  process.exit(1);
}

// -------------------------------------------------------------
// Argumen
// -------------------------------------------------------------
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const dryRun = argv.includes("--dry-run");
const calendarDaysBack = Math.max(1, Math.floor(Number(arg("days", 30))) || 30);
const tickerFilter = arg("tickers", null);
const onlyTickers = tickerFilter ? new Set(tickerFilter.split(",").map((t) => t.trim().toUpperCase())) : null;

// -------------------------------------------------------------
// Util tanggal — WIB eksplisit, sama seperti dua skrip lain (runner
// GitHub Actions jalan di UTC, jangan sampai tanggal bursa geser).
// -------------------------------------------------------------
function wibDate(d = new Date()) {
  return new Date(d.getTime() + 7 * 3600_000);
}
function toISODate(d) {
  return d.toISOString().slice(0, 10);
}
function todayWibISO() {
  return toISODate(wibDate());
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// -------------------------------------------------------------
// Supabase lewat REST (pola sama persis seperti dua skrip lain)
// -------------------------------------------------------------
async function sb(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Supabase ${res.status}: ${detail}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const insertOnly = (table, rows, onConflict) =>
  // Prefer resolution=ignore-duplicates (BUKAN merge-duplicates) —
  // ini pengaman kedua di level Supabase: kalaupun ada race condition
  // dan baris ternyata sudah ada, Postgres akan DIAM-DIAM SKIP baris
  // itu, bukan menimpa kolom yang sudah terisi dari IDX.
  sb(`${table}?on_conflict=${onConflict}`, {
    method: "POST",
    body: rows,
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
  });

// -------------------------------------------------------------
// Utama
// -------------------------------------------------------------
async function main() {
  console.log(
    `Jembatan price_history_stockbit -> flows (jendela ${calendarDaysBack} hari kalender, hanya tanggal yang belum ada di flows)${dryRun ? " (dry-run)" : ""}...`,
  );

  const endDate = todayWibISO();
  const startDate = toISODate(new Date(wibDate().getTime() - calendarDaysBack * 86400_000));

  let tickers;
  if (onlyTickers) {
    tickers = [...onlyTickers];
  } else {
    const rows = await sb(
      `price_history_stockbit?period=eq.daily&trade_date=gte.${startDate}&trade_date=lte.${endDate}&select=stock_code`,
    );
    tickers = [...new Set((rows || []).map((r) => r.stock_code))].sort();
  }
  if (!tickers.length) {
    console.log("Tidak ada ticker/data untuk diproses pada jendela ini.");
    process.exit(0);
  }
  console.log(`${tickers.length} ticker akan diperiksa.`);

  let tickersWithGap = 0, totalRowsInserted = 0, failCount = 0;
  const failures = [];
  const details = [];

  for (const ticker of tickers) {
    try {
      // 1. Baris Stockbit yang tersedia untuk ticker ini di jendela waktu.
      const stockbitRows = await sb(
        `price_history_stockbit?stock_code=eq.${encodeURIComponent(ticker)}&period=eq.daily` +
          `&trade_date=gte.${startDate}&trade_date=lte.${endDate}` +
          `&select=trade_date,open,high,low,close,volume,value_idr,frequency,foreign_buy,foreign_sell` +
          `&order=trade_date.asc`,
      );
      if (!stockbitRows?.length) continue;

      // 2. Tanggal yang SUDAH ADA di flows untuk ticker ini -- ini yang
      //    dijadikan dasar "jangan ditimpa".
      const existingFlowRows = await sb(
        `flows?ticker=eq.${encodeURIComponent(ticker)}&date=gte.${startDate}&date=lte.${endDate}&select=date`,
      );
      const existingDates = new Set((existingFlowRows || []).map((r) => r.date));

      // 3. Cuma tanggal yang BELUM ADA di flows, dan closenya valid.
      const missing = stockbitRows.filter((r) => !existingDates.has(r.trade_date) && r.close != null);
      if (!missing.length) continue;

      const payload = missing.map((r) => ({
        ticker,
        date: r.trade_date,
        open_price: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
        value: r.value_idr,
        frequency: r.frequency,
        foreign_buy: r.foreign_buy,
        foreign_sell: r.foreign_sell,
        // listed_shares, nonreg_volume, nonreg_value: sengaja tidak
        // diisi -- lihat catatan di kepala berkas.
      }));

      if (!dryRun) await insertOnly("flows", payload, "ticker,date");

      tickersWithGap++;
      totalRowsInserted += payload.length;
      details.push(`${ticker}: +${payload.length} hari (${missing[0].trade_date} s/d ${missing.at(-1).trade_date})`);
      console.log(`  ${ticker}  +${payload.length} baris ditambal (${missing[0].trade_date} s/d ${missing.at(-1).trade_date})`);
    } catch (e) {
      failCount++;
      failures.push(`${ticker}: ${e.message}`);
    }
    await sleep(80); // jeda ringan, ini query DB bukan API eksternal jadi tidak perlu delay besar
  }

  console.log(
    `\nSelesai: ${tickersWithGap} ticker punya celah dan ditambal (${totalRowsInserted} baris baru), ` +
      `${tickers.length - tickersWithGap - failCount} ticker sudah lengkap/tidak ada celah, ${failCount} gagal.`,
  );
  if (failures.length) {
    console.log("\nDaftar gagal (maks 20 ditampilkan):");
    failures.slice(0, 20).forEach((f) => console.log(`  - ${f}`));
  }

  if (!dryRun) {
    await sb("sync_log", {
      method: "POST",
      body: {
        status: failCount === 0 ? "success" : "partial",
        source: "stockbit_to_flows_bridge",
        ok_count: tickersWithGap,
        fail_count: failCount,
        finished_at: new Date().toISOString(),
        message:
          `stockbit_to_flows_bridge: ${tickersWithGap} ticker ditambal / ${totalRowsInserted} baris baru / ${failCount} gagal ` +
          `dari ${tickers.length} ticker diperiksa (jendela ${startDate}..${endDate}). ` +
          details.slice(0, 15).join("; "),
      },
      headers: { Prefer: "return=minimal" },
    });
  }

  process.exit(failCount > tickers.length / 2 ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
