// Jalankan dari folder yang sama dengan sync-idx-full.mjs:
//   node patch-sync-idx-full.mjs
// Script ini membuat sync-idx-full.fixed.mjs tanpa mengubah file asli.
import { readFileSync, writeFileSync } from "node:fs";

const source = "sync-idx-full.mjs";
const target = "sync-idx-full.fixed.mjs";
let s = readFileSync(source, "utf8");
const replacements = [
  [
    'const ENV_FILE = new URL("../.env.local", import.meta.url);',
    'const ENV_FILE = new URL("./.env.local", import.meta.url);',
  ],
  [
    'const MAX_DAYS = 320;',
    'const MAX_DAYS = 320;\n// Retensi kalender harus lebih panjang dari MAX_DAYS karena MAX_DAYS\n// dihitung sebagai hari perdagangan, sedangkan cleanup memakai tanggal kalender.\nconst RETENTION_CALENDAR_DAYS = 450;',
  ],
  [
    'const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);',
    'const num = (v) => {\n  if (v === null || v === undefined || v === "") return null;\n  const n = Number(typeof v === "string" ? v.replaceAll(",", "").trim() : v);\n  return Number.isFinite(n) ? n : null;\n};',
  ],
  [
    'function calcEMA(data, period) {\n  if (data.length < period) return data[data.length - 1] || 0;',
    'function calcEMA(data, period) {\n  if (!data || data.length < period) return null;',
  ],
  [
    'const marketCap = listedShares ? Math.round(cClose * listedShares) : null;',
    'const marketCap = listedShares != null && cClose != null ? Math.round(cClose * listedShares) : null;',
  ],
  [
    'const vwap: round2((highs[n - 1] + lows[n - 1] + closes[n - 1]) / 3)',
    'const vwap: round2(calcVWAP(closes, highs, lows, volumes, 20))',
  ],
  [
    'vwap: round2((highs[n - 1] + lows[n - 1] + closes[n - 1]) / 3),',
    'vwap: round2(calcVWAP(closes, highs, lows, volumes, 20)),',
  ],
  [
    'const rawDer = pick(fin.debtToEquity);',
    'const rawDer = pick(fin.debtToEquity);',
  ],
  [
    'der: pick(fin.debtToEquity) != null ? round2(pick(fin.debtToEquity)) : null,',
    'der: pick(fin.debtToEquity) != null ? round2(pick(fin.debtToEquity) / 100) : null,',
  ],
  [
    'dividend_yield: 0,',
    'dividend_yield: null,',
  ],
  [
    'dividend_yield: pctOr(pick(summary.dividendYield)) ?? 0,',
    'dividend_yield: pctOr(pick(summary.dividendYield)),',
  ],
  [
    'const cutoff = todayWib();\n      cutoff.setUTCDate(cutoff.getUTCDate() - MAX_DAYS);',
    'const cutoff = todayWib();\n      cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_CALENDAR_DAYS);',
  ],
  [
    'technical = buildStockRowFromBars(ticker, cleanBars, cleanBars.at(-1)?.listedShares);',
    'const latestListedShares = [...cleanBars].reverse().find((b) => b.listedShares != null)?.listedShares ?? null;\n        technical = buildStockRowFromBars(ticker, cleanBars, latestListedShares);',
  ],
];

let changed = 0;
for (const [from, to] of replacements) {
  if (s.includes(from)) {
    s = s.replace(from, to);
    changed++;
  } else if (from !== 'const rawDer = pick(fin.debtToEquity);') {
    console.warn(`Tidak ditemukan, cek manual: ${from.slice(0, 100)}`);
  }
}

// Hindari bid/offer periode lama menimpa snapshot stocks terbaru saat backfill.
// Snapshot hanya dipasang pada mode harian tanpa start/end/offset.
s = s.replace(
  'if (tradingDays.length === 0) {\n        // Hari perdagangan pertama yang berhasil diambil = paling baru.',
  'if (tradingDays.length === 0 && !startArg && !endArg && offsetDays === 0) {\n        // Hari perdagangan pertama yang berhasil diambil = paling baru.',
);

writeFileSync(target, s);
console.log(`Dibuat ${target}; ${changed} penggantian utama diterapkan.`);
console.log("Tetap jalankan --debug-fields dan review diff sebelum produksi.");
