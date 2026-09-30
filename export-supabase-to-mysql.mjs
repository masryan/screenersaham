#!/usr/bin/env node
// Salin data Supabase (Postgres) -> MySQL. Aman dijalankan berulang (upsert).
//
// Persiapan:
//   npm i mysql2
//   mysql -u USER -p DBNAME < 01_schema_mysql.sql
//
// Jalankan (Node 18+):
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_KEY=... \
//   MYSQL_HOST=127.0.0.1 MYSQL_USER=ihsg MYSQL_PASSWORD=... MYSQL_DATABASE=ihsg \
//   node export-supabase-to-mysql.mjs
//
// Opsi:
//   --only=stocks,flows     hanya tabel tertentu
//   --truncate              kosongkan tabel tujuan dulu (default: upsert saja)
//   --dry                   hanya hitung baris di kedua sisi, tanpa menulis

import mysql from "mysql2/promise";

const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || "";
if (!SB_URL || !SB_KEY) { console.error("Isi SUPABASE_URL dan SUPABASE_SERVICE_KEY."); process.exit(1); }

const args = process.argv.slice(2);
const only = (args.find(a => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const TRUNCATE = args.includes("--truncate");
const DRY = args.includes("--dry");
const PAGE = 1000;      // batas default PostgREST
const BATCH = 500;      // baris per INSERT MySQL

// Urutan penting: tabel induk (stocks, backtest_sessions) sebelum anaknya.
// key = kolom untuk paginasi. keyset=true -> pakai `key=gt.X` (cepat untuk tabel besar),
// selain itu pakai offset dengan order deterministik.
const TABLES = [
  { t: "stocks",               order: ["ticker"] },
  { t: "index_membership",     order: ["ticker"] },
  { t: "stock_indicators_ext", order: ["ticker"] },
  { t: "flows",                order: ["ticker", "date"] },
  { t: "broker_activity",      order: ["id"], keyset: "id" },
  { t: "watchlists",           order: ["ticker"] },
  { t: "portfolios",           order: ["id"], keyset: "id" },
  { t: "custom_presets",       order: ["id"] },
  { t: "backtest_sessions",    order: ["id"], keyset: "id" },
  { t: "backtest_items",       order: ["id"], keyset: "id" },
  { t: "smart_pick_signals",   order: ["id"], keyset: "id" },
  { t: "rekap_signals",        order: ["id"], keyset: "id" },
  { t: "target_calculations",  order: ["id"], keyset: "id" },
  { t: "sesi_snapshots",       order: ["id"], keyset: "id" },
  { t: "market_index",         order: ["symbol"] },
  { t: "stockbit_session",     order: ["id"] },
  { t: "telegram_settings",    order: ["id"] },
  { t: "telegram_notified_log",order: ["id"], keyset: "id" },
  { t: "sync_log",             order: ["id"], keyset: "id" },
  { t: "orca_daily_snapshot",  order: ["trade_date", "ticker"] },
];

const BOOL = new Set(["syariah","lq45","is_lq45","is_syariah","is_fca","is_suspended","is_unsuspended",
  "is_fca_out","is_strong","enabled","only_market_hours"]);
const JSONC = new Set(["fibonacci","broker_summary","entries","rules","preset_ids"]);
const pad = (n, w = 2) => String(n).padStart(w, "0");

// timestamptz Postgres -> "YYYY-MM-DD HH:MM:SS.mmm" (UTC, sesuai SET time_zone '+00:00' di lib.php)
function toDatetime(v) {
  const d = new Date(v);
  if (isNaN(d)) return null;
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ` +
         `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(),3)}`;
}

function convert(col, v, mysqlType) {
  if (v === null || v === undefined) return null;
  if (BOOL.has(col) || mysqlType === "tinyint") return v === true || v === 1 || v === "true" ? 1 : 0;
  if (mysqlType === "json" || JSONC.has(col)) return typeof v === "string" ? v : JSON.stringify(v);
  if (mysqlType === "datetime" || mysqlType === "timestamp") return toDatetime(v);
  if (mysqlType === "date") return String(v).slice(0, 10);
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}

const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

async function sbGet(path, extra = {}) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: { ...sbHeaders, ...extra } });
    if (res.ok) return res;
    if (attempt >= 4 || res.status < 500) {
      throw new Error(`Supabase ${res.status} untuk ${path}: ${(await res.text()).slice(0, 300)}`);
    }
    await new Promise(r => setTimeout(r, 1000 * attempt));
  }
}

async function sbCount(t) {
  const res = await sbGet(`${t}?select=*&limit=1`, { Prefer: "count=exact" });
  const cr = res.headers.get("content-range") || "";
  return Number(cr.split("/")[1]);
}

async function mysqlMeta(conn, t) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME c, DATA_TYPE d, EXTRA x FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, [t]);
  const m = new Map();
  for (const r of rows) m.set(r.c, { type: String(r.d).toLowerCase(), gen: /GENERATED/i.test(r.x || "") });
  return m;
}

async function* pages(spec) {
  const orderQ = spec.order.map(c => `${c}.asc`).join(",");
  if (spec.keyset) {
    let last = null;
    for (;;) {
      const f = last === null ? "" : `&${spec.keyset}=gt.${last}`;
      const rows = await (await sbGet(`${spec.t}?select=*&order=${orderQ}&limit=${PAGE}${f}`)).json();
      if (!rows.length) return;
      yield rows;
      last = rows[rows.length - 1][spec.keyset];
      if (rows.length < PAGE) return;
    }
  } else {
    for (let off = 0; ; off += PAGE) {
      const rows = await (await sbGet(`${spec.t}?select=*&order=${orderQ}&limit=${PAGE}&offset=${off}`)).json();
      if (!rows.length) return;
      yield rows;
      if (rows.length < PAGE) return;
    }
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE, charset: "utf8mb4", timezone: "Z",
    multipleStatements: false,
  });
  await conn.query("SET time_zone = '+00:00'");
  await conn.query("SET FOREIGN_KEY_CHECKS = 0");

  const report = [];
  for (const spec of TABLES) {
    if (only.length && !only.includes(spec.t)) continue;
    const meta = await mysqlMeta(conn, spec.t);
    if (!meta.size) { console.warn(`! ${spec.t}: tabel belum ada di MySQL, dilewati`); report.push([spec.t, "-", "-", "TABEL HILANG"]); continue; }

    const srcCount = await sbCount(spec.t);
    if (DRY) {
      const [[{ n }]] = await conn.query(`SELECT COUNT(*) n FROM \`${spec.t}\``);
      report.push([spec.t, srcCount, n, srcCount === n ? "OK" : "BEDA"]);
      continue;
    }
    if (TRUNCATE) await conn.query(`DELETE FROM \`${spec.t}\``);

    let done = 0, warned = false;
    for await (const rows of pages(spec)) {
      // kolom: hanya yang ada di MySQL & bukan generated column
      const cols = Object.keys(rows[0]).filter(c => {
        const m = meta.get(c);
        return m && !m.gen;
      });
      const skipped = Object.keys(rows[0]).filter(c => !meta.has(c));
      if (skipped.length && !warned) { console.warn(`! ${spec.t}: kolom tidak ada di MySQL, diabaikan: ${skipped.join(", ")}`); warned = true; }

      for (let i = 0; i < rows.length; i += BATCH) {
        const part = rows.slice(i, i + BATCH);
        const values = part.map(r => cols.map(c => convert(c, r[c], meta.get(c).type)));
        const upd = cols.map(c => `\`${c}\` = VALUES(\`${c}\`)`).join(",");
        await conn.query(
          `INSERT INTO \`${spec.t}\` (${cols.map(c => `\`${c}\``).join(",")}) VALUES ? ON DUPLICATE KEY UPDATE ${upd}`,
          [values]);
      }
      done += rows.length;
      process.stdout.write(`\r${spec.t}: ${done}/${srcCount}`);
    }
    process.stdout.write("\n");

    const [[{ n }]] = await conn.query(`SELECT COUNT(*) n FROM \`${spec.t}\``);
    report.push([spec.t, srcCount, n, srcCount === n ? "OK" : "BEDA"]);
  }
  await conn.query("SET FOREIGN_KEY_CHECKS = 1");
  await conn.end();

  console.log("\nTabel".padEnd(24) + "Supabase".padStart(10) + "MySQL".padStart(10) + "  Status");
  for (const [t, a, b, s] of report) console.log(t.padEnd(23) + String(a).padStart(10) + String(b).padStart(10) + "  " + s);
  if (report.some(r => r[3] !== "OK")) { console.log("\nAda tabel yang BEDA/HILANG — cek pesan di atas."); process.exitCode = 2; }
}

main().catch(e => { console.error("\nGAGAL:", e.message); process.exit(1); });
