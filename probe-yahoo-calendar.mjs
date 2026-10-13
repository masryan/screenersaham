// probe-yahoo-calendar.mjs
// Cek seberapa lengkap Yahoo Finance menyediakan tanggal dividen & earnings untuk saham .JK.
// Jalankan lokal (bukan GitHub Actions):
//   npm i yahoo-finance2
//   node probe-yahoo-calendar.mjs            -> sampel bawaan (30 saham)
//   node probe-yahoo-calendar.mjs BBCA ASII  -> kode pilihan sendiri
// Hasil lengkap ditulis ke probe-yahoo-calendar.json

import fs from "node:fs";
import * as mod from "yahoo-finance2";

// yahoo-finance2 v2 mengekspor instance default; v3 mengekspor class.
const yf = typeof mod.default === "function" ? new mod.default() : mod.default;

const DEFAULT = ["BBCA","BBRI","BMRI","BBNI","TLKM","ASII","UNVR","ICBP","INDF","KLBF",
  "ADRO","PTBA","ANTM","INCO","MDKA","GOTO","BUKA","EMTK","CPIN","JPFA",
  "SMGR","INTP","ACES","MAPI","ERAA","PGAS","MEDC","AKRA","BRPT","TPIA"];
const tickers = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT;

const iso = (d) => (d instanceof Date && !isNaN(d) ? d.toISOString().slice(0, 10) : null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const rows = [];
for (const t of tickers) {
  const symbol = `${t.toUpperCase()}.JK`;
  try {
    const q = await yf.quoteSummary(symbol, { modules: ["calendarEvents", "summaryDetail"] });
    const ce = q.calendarEvents || {};
    const sd = q.summaryDetail || {};
    rows.push({
      ticker: t,
      exDividendDate: iso(ce.exDividendDate || sd.exDividendDate),
      dividendDate: iso(ce.dividendDate),
      earningsDates: (ce.earnings?.earningsDate || []).map(iso).filter(Boolean),
      dividendRate: sd.dividendRate ?? null,
      dividendYield: sd.dividendYield ?? null,
    });
  } catch (e) {
    rows.push({ ticker: t, error: String(e.message || e).slice(0, 120) });
  }
  await sleep(400);
}

const ok = rows.filter((r) => !r.error);
const n = (f) => ok.filter(f).length;
console.log(`\nSampel: ${rows.length} saham | berhasil: ${ok.length} | error: ${rows.length - ok.length}`);
console.log(`Punya exDividendDate : ${n((r) => r.exDividendDate)}`);
console.log(`Punya dividendDate   : ${n((r) => r.dividendDate)}`);
console.log(`Punya earningsDate   : ${n((r) => r.earningsDates.length)}`);
console.log(`Punya dividendRate   : ${n((r) => r.dividendRate != null)}`);
console.table(rows.map((r) => ({
  ticker: r.ticker, exDiv: r.exDividendDate, payDiv: r.dividendDate,
  earnings: (r.earningsDates || []).join(" / "), err: r.error || "",
})));

fs.writeFileSync("probe-yahoo-calendar.json", JSON.stringify(rows, null, 2));
console.log("Tersimpan: probe-yahoo-calendar.json");
