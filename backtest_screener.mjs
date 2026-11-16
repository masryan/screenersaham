#!/usr/bin/env node
// =============================================================================
// backtest_screener.mjs -- backtest SEMUA screener di rekapScreenerDefs() app.js
// yang bisa diuji dari riwayat harian tabel `flows` (OHLCV + value + frequency).
//
// Pelengkap backtest7c.mjs (7C Pantulan, 7C Breakout, Dragon Buy, Harmonic, Trend).
//
// Jalankan (Node 18+, tanpa dependensi), sama seperti backtest7c.mjs:
//   set SUPABASE_URL=<URL aplikasi, berakhiran /rest/v1>
//   set SUPABASE_KEY=<anon key>
//   node backtest_screener.mjs
// atau dari CSV (kolom: ticker,date,open,high,low,close,volume[,value,frequency]):
//   node backtest_screener.mjs --csv data.csv
//
// Cakupan:
//   DSI      : Momentum Kuat Berlanjut (eri), RSI & Harga Cross, Golden Cross DSI,
//              EMA9x21, Super Uptrend, Volatility Breakout, Pullback Uptrend,
//              Buy on Weakness, BPJS proxy volume, Lonjakan Frekuensi, Freq-up Vol-down
//   BSJP     : Strict, Top Accumulation (proxy), Breakout 52W High, High Liquidity
//   SmartPick: Area Demand, Throwback, Liquidity Sweep, Bull Divergence, Early Breakout
//   Dragon   : Dragon Waspada (sisi SELL; diuji sebagai peringatan, bukan beli)
//
// TIDAK bisa di-backtest dari flows (dicetak sebagai SKIP):
//   Skor Bagger, Deep Value, Multibagger, Growth, Defensive, Small Cap
//        -> butuh fundamental point-in-time; memakai fundamental hari ini = look-ahead bias
//   Akumulasi Asing (IDX) -> butuh riwayat net asing harian
//   Preset Kustom -> aturan buatan pengguna di Supabase (custom_presets)
//
// Opsi:
//   --since 2023-01-01    mulai tanggal ini (default: semua)
//   --hold 1,3,5,10,20    lama tahan (hari bursa) untuk screener non-BSJP
//   --sl none,7           stop-loss % dari harga entry ("none" = tanpa SL; preset aslinya tidak punya SL)
//   --fee 0.4             biaya beli+jual round trip, % (default 0.4)
//   --slip 0.1            slippage per sisi, % (default 0.1)
//   --min-turnover 1e9    filter likuiditas universe (Rp), berlaku utk sinyal DAN baseline
//   --min-price 50        harga minimum universe
//   --vol-mult 100        pengali lot->lembar bila kolom value kosong (default 100)
//   --warmup 200          jumlah candle awal per ticker yang dilewati (MA200 butuh 200)
//   --ema921 fresh|all    mode EMA9x21 (default fresh = cross di hari itu saja)
//   --bsjp-tp 2 --bsjp-sl 2.5   TP1/SL trade plan BSJP (%), sama dgn BSJP_DEFAULT_PARAMS
//   --only dsi,bsjp,smartpick,dragon   atau id spesifik (lihat --list)
//   --tickers BBCA,TLKM   batasi ticker
//   --split 2025-06-01    batas in-sample / out-of-sample (default: 70% tanggal)
//   --overlap             izinkan posisi tumpang tindih per ticker (default: satu posisi per ticker per screener)
//   --out trades.csv      simpan semua transaksi (satu baris per transaksi)
//   --summary hasil.csv   nama file CSV ringkasan per screener x exit (default: backtest_summary.csv, SELALU ditulis)
//   --list                tampilkan daftar screener lalu keluar
//   --refresh             abaikan cache lokal dan tarik ulang
//   --selftest            uji internal (tanpa data)
//
// Model transaksi (konservatif, tanpa look-ahead):
//   * Screener non-BSJP: sinyal dari candle penutupan hari i, entry di OPEN hari i+1,
//     keluar di CLOSE hari ke-H (atau SL tetap bila diaktifkan; gap melewati SL keluar di open).
//   * BSJP: entry di CLOSE hari sinyal (closing auction), keluar pagi berikutnya. Tiga varian:
//     open+1 (jual di open besok), tp/sl (TP1 & SL trade plan, SL didahulukan), close+1.
//   * Baseline = beli semua saham likuid dengan aturan yang sama. "exc%" = hasil sinyal dikurangi
//     rata-rata semua saham likuid di TANGGAL YANG SAMA, jadi efek pasar naik/turun ikut dibuang.
//   * Rumus indikator disalin dari ti_* di app.js (RSI Wilder, EMA, MACD 12/26/9, Stoch 14/3/3,
//     BB 20, dst) lengkap dengan pembulatannya; jalankan --selftest untuk memverifikasi.
//   * Tidak memodelkan ARA/ARB, fraksi harga, antrian, dan kegagalan eksekusi.
// =============================================================================
import fs from "node:fs";
import path from "node:path";

// ---------- argumen -----------------------------------------------------------
function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const k = argv[i].slice(2), nx = argv[i + 1];
    if (nx === undefined || nx.startsWith("--")) a[k] = true; else { a[k] = nx; i++; }
  }
  return a;
}
const A = parseArgs(process.argv.slice(2));
const num = (v, d) => (v === undefined || v === true || isNaN(Number(v))) ? d : Number(v);
const list = (v, d) => (v === undefined || v === true) ? d : String(v).split(/[\s,;]+/).filter(Boolean);
const OPT = {
  hold: list(A.hold, ["1", "3", "5", "10", "20"]).map(Number).filter(n => n >= 1),
  sl: list(A.sl, ["none"]).map(x => x === "none" ? null : Number(x)).filter(x => x === null || x > 0),
  fee: num(A.fee, 0.4), slip: num(A.slip, 0.1),
  minTurnover: num(A["min-turnover"], 1e9), minPrice: num(A["min-price"], 50),
  volMult: num(A["vol-mult"], 100), warmup: Math.max(60, num(A.warmup, 200)),
  ema921: A.ema921 === "all" ? "all" : "fresh",
  bsjpTp: num(A["bsjp-tp"], 2), bsjpSl: num(A["bsjp-sl"], 2.5),
  since: typeof A.since === "string" ? A.since : null,
  only: typeof A.only === "string" ? new Set(A.only.toLowerCase().split(/[\s,;]+/)) : null,
  tickers: typeof A.tickers === "string" ? new Set(A.tickers.toUpperCase().split(/[\s,;]+/)) : null,
  overlap: !!A.overlap,
};

// ---------- indikator (port dari ti_* di app.js, versi deret waktu) -----------
const avg = a => a.length ? a.reduce((x, y) => x + (y || 0), 0) / a.length : 0;
const r1 = n => (n == null || Number.isNaN(n)) ? null : Math.round(n * 10) / 10;
const r2 = n => (n == null || Number.isNaN(n)) ? null : Math.round(n * 100) / 100;
const clamp01 = x => Math.max(0, Math.min(1, x));

function emaSeries(d, p) {                       // = ti_calcEMASeries
  const out = new Array(d.length).fill(null);
  if (d.length < p) return out;
  const k = 2 / (p + 1); let e = avg(d.slice(0, p)); out[p - 1] = e;
  for (let i = p; i < d.length; i++) { e = (d[i] - e) * k + e; out[i] = e; }
  return out;
}
function smaSeries(d, p) {                       // = ti_calcSMA di tiap indeks
  const out = new Array(d.length).fill(null); let s = 0;
  for (let i = 0; i < d.length; i++) { s += d[i]; if (i >= p) s -= d[i - p]; if (i >= p - 1) out[i] = s / p; }
  return out;
}
function rsiSeries(c, p) {                       // = ti_calcRSI (Wilder) di tiap indeks i >= p
  const out = new Array(c.length).fill(null);
  if (c.length <= p) return out;
  let g = 0, l = 0;
  for (let i = 1; i <= p; i++) { const d = c[i] - c[i - 1]; if (d > 0) g += d; else l -= d; }
  let ag = g / p, al = l / p;
  const val = () => al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  out[p] = val();
  for (let i = p + 1; i < c.length; i++) {
    const d = c[i] - c[i - 1];
    ag = (ag * (p - 1) + Math.max(d, 0)) / p; al = (al * (p - 1) + Math.max(-d, 0)) / p;
    out[i] = val();
  }
  return out;
}
function macdHistSeries(c) {                     // = hist dari ti_calcMACDFull (12/26/9)
  const f = emaSeries(c, 12), s = emaSeries(c, 26), out = new Array(c.length).fill(null);
  const m = [], idx = [];
  for (let i = 0; i < c.length; i++) if (f[i] != null && s[i] != null) { m.push(f[i] - s[i]); idx.push(i); }
  if (m.length < 9) return out;
  const k = 2 / 10; let sig = avg(m.slice(0, 9)); out[idx[8]] = m[8] - sig;
  for (let j = 9; j < m.length; j++) { sig = (m[j] - sig) * k + sig; out[idx[j]] = m[j] - sig; }
  return out;
}
function stochSeries(h, l, c, pk, sk, pd) {      // = ti_calcStochastic: slowK & slowD mentah
  const n = c.length, raw = new Array(n).fill(null), K = new Array(n).fill(null), D = new Array(n).fill(null);
  for (let i = pk - 1; i < n; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = i - pk + 1; j <= i; j++) { if (h[j] > hh) hh = h[j]; if (l[j] < ll) ll = l[j]; }
    raw[i] = hh - ll === 0 ? 50 : ((c[i] - ll) / (hh - ll)) * 100;
  }
  for (let i = pk - 1 + sk - 1; i < n; i++) { let s = 0; for (let j = i - sk + 1; j <= i; j++) s += raw[j]; K[i] = s / sk; }
  for (let i = pk - 1 + sk - 1 + pd - 1; i < n; i++) { let s = 0; for (let j = i - pd + 1; j <= i; j++) s += K[j]; D[i] = s / pd; }
  return { K, D, minLen: pk + sk + pd };
}
function bbWidthSeries(c, p) {                   // lebar BB (std populasi) per indeks
  const n = c.length, w = new Array(n).fill(null), mid = new Array(n).fill(null), sd = new Array(n).fill(null);
  for (let i = p - 1; i < n; i++) {
    let s = 0; for (let j = i - p + 1; j <= i; j++) s += c[j];
    const m = s / p; let v = 0; for (let j = i - p + 1; j <= i; j++) v += (c[j] - m) ** 2;
    const d = Math.sqrt(v / p); mid[i] = m; sd[i] = d; w[i] = m === 0 ? 0 : (4 * d) / m;
  }
  return { w, mid, sd };
}
function prefix(a) { const p = new Array(a.length + 1).fill(0); for (let i = 0; i < a.length; i++) p[i + 1] = p[i] + (a[i] || 0); return p; }

function buildInd(b) {
  const C = b.map(x => x.close), H = b.map(x => x.high), L = b.map(x => x.low);
  const I = { C, H, L, n: b.length };
  I.ma21 = smaSeries(C, 21); I.ma50 = smaSeries(C, 50); I.ma100 = smaSeries(C, 100); I.ma200 = smaSeries(C, 200);
  I.ema9 = emaSeries(C, 9); I.ema20 = emaSeries(C, 20); I.ema21 = emaSeries(C, 21); I.ema50 = emaSeries(C, 50); I.ema89 = emaSeries(C, 89);
  I.e21h = emaSeries(H, 21); I.e21l = emaSeries(L, 21);
  I.rsi7 = rsiSeries(C, 7); I.rsi14 = rsiSeries(C, 14); I.rsi21 = rsiSeries(C, 21);
  I.hist = macdHistSeries(C);
  const st = stochSeries(H, L, C, 14, 3, 3); I.sK = st.K; I.sD = st.D; I.stMin = st.minLen;
  I.bb = bbWidthSeries(C, 20);
  I.pv = prefix(b.map(x => x.volume || 0)); I.pf = prefix(b.map(x => x.freq || 0));
  I.hasFreq = b.some(x => x.freq > 0);
  return I;
}

// ---------- klasifikasi (sama dengan app.js) -------------------------------------
function trendOf(c, mas) {                       // = ti_tentukanTrendHarga
  const m = mas.filter(x => x != null);
  if (!m.length) return "Data MA Belum Cukup";
  const up = m.every(x => c > x), dn = m.every(x => c < x), full = m.length === 4;
  if (up) return full ? "Bullish (diatas MA21/50/100/200)" : "Bullish (diatas MA yang tersedia)";
  if (dn) return full ? "Bearish (dibawah MA21/50/100/200)" : "Bearish (dibawah MA yang tersedia)";
  return "Sideways/Mixed";
}
function bandarmologi(row, ratio) {              // = bandarmologi() app.js
  if (ratio === null || ratio === undefined || isNaN(ratio)) return { tone: "muted" };
  const naik = row.cClose > row.cOpen;
  if (ratio >= 1.5 && naik) return { tone: "up" };
  if (ratio >= 1.5 && !naik) return { tone: "down" };
  if (ratio >= 1.0 && naik) return { tone: "up" };
  if (ratio >= 1.0 && !naik) return { tone: "down" };
  return { tone: "muted" };
}

// Bangun "baris saham" s untuk candle i -- nama field SAMA dengan stocks_screener di app.js.
// Hanya memakai b[0..i] (tanpa look-ahead).
function mkRow(t, b, I, i) {
  const x = b[i], pv = b[i - 1];
  const cClose = r2(x.close), prevClose = r2(pv.close), cOpen = r2(x.open), cHigh = r2(x.high), cLow = r2(x.low);
  const cVol = Math.round(x.volume || 0), prevVol = Math.round(pv.volume || 0);
  const lo20 = Math.max(0, i - 19);
  const volMA20 = Math.round((I.pv[i + 1] - I.pv[lo20]) / (i + 1 - lo20));
  const volRatio = volMA20 > 0 ? r2(cVol / volMA20) : 0;
  const clv = cHigh !== cLow ? r2(((cClose - cLow) - (cHigh - cClose)) / (cHigh - cLow)) : 0;
  const chgAbs = r2(cClose - prevClose), changePct = prevClose ? r2(chgAbs / prevClose * 100) : 0;
  const g = a => a[i] == null ? null : r2(a[i]);
  const ma21 = g(I.ma21), ma50 = g(I.ma50), ma100 = g(I.ma100), ma200 = g(I.ma200);
  const ema9 = g(I.ema9), ema21 = g(I.ema21);
  const prevEma9 = I.ema9[i - 1] == null ? null : r2(I.ema9[i - 1]), prevEma21 = I.ema21[i - 1] == null ? null : r2(I.ema21[i - 1]);
  const ema921BullishNow = (ema9 != null && ema21 != null) ? ema9 > ema21 : null;
  const ema921FreshCross = ema921BullishNow === true && prevEma9 != null && prevEma21 != null && prevEma9 <= prevEma21;
  // Stochastic (14,3,3): app mensyaratkan >= 20 candle
  const stOk = i + 1 >= I.stMin;
  const stochK = stOk ? r1(I.sK[i]) : null, stochD = stOk ? r1(I.sD[i]) : null;
  const prevStochK = stOk ? r1(I.sK[i - 1]) : null, prevStochD = stOk ? r1(I.sD[i - 1]) : null;
  // BB 20 + squeeze (jendela 120 candle terakhir, ambang 1.05x minimum)
  let bbLower = null, bbUpper = null, isBBSqueeze = "Tidak";
  if (i >= 19) {
    bbLower = r2(I.bb.mid[i] - 2 * I.bb.sd[i]); bbUpper = r2(I.bb.mid[i] + 2 * I.bb.sd[i]);
    let mn = Infinity; for (let k = Math.max(19, i - 120); k <= i; k++) if (I.bb.w[k] < mn) mn = I.bb.w[k];
    if (r2(I.bb.w[i]) <= mn * 1.05) isBBSqueeze = "Ya (Kompresi Siap Meledak)";
  }
  // 52 minggu & support
  let high52w = null, low52w = null, pos52w = null, week52ChangePct = null;
  if (i + 1 >= 252) {
    let hh = -Infinity, ll = Infinity;
    for (let k = i - 251; k <= i; k++) { if (I.H[k] > hh) hh = I.H[k]; if (I.L[k] < ll) ll = I.L[k]; }
    high52w = r2(hh); low52w = r2(ll);
    if (high52w > low52w) pos52w = (cClose - low52w) / (high52w - low52w) * 100;
  }
  if (i + 1 > 253 && I.C[i - 252] > 0) week52ChangePct = r2((cClose - I.C[i - 252]) / I.C[i - 252] * 100);
  let sup = Infinity; for (let k = i - 19; k <= i; k++) if (I.L[k] < sup) sup = I.L[k];
  const support = r2(sup);
  const weekChangePct = (i + 1 > 6 && I.C[i - 5] > 0) ? r2((cClose - I.C[i - 5]) / I.C[i - 5] * 100) : null;
  const monthChangePct = (i + 1 > 21 && I.C[i - 20] > 0) ? r2((cClose - I.C[i - 20]) / I.C[i - 20] * 100) : null;
  const vsMa50Pct = (ma50 != null && ma50 !== 0) ? r2((cClose - ma50) / ma50 * 100) : null;
  const valueTraded = x.value > 0 ? x.value : null;
  const turnover = x.value > 0 ? Math.round(x.value) : Math.round(cClose * cVol * OPT.volMult);
  let freqRatio = null;
  if (I.hasFreq && i >= 19) { const m = Math.round((I.pf[i + 1] - I.pf[i - 19]) / 20); freqRatio = m > 0 ? Math.round(x.freq || 0) / m : null; }
  const uangGedeMasuk = (volRatio > 2 && clv > 0.7) ? "Akumulasi Kuat" : (volRatio > 2 && clv < 0) ? "Guyuran" : "Normal";
  const s = {
    ticker: t, date: x.date, cOpen, cHigh, cLow, cClose, prevClose, prevHigh: r2(pv.high), prevLow: r2(pv.low), cVol, prevVol,
    volMA20, volRatio, clv, changePct, turnover, valueTraded, freqRatio, uangGedeMasuk,
    ma21, ma50, ma100, ma200, ema9, ema21, prevEma9, prevEma21, ema20: g(I.ema20), ema50: g(I.ema50), ema89: g(I.ema89),
    ema21H: g(I.e21h), ema21L: g(I.e21l), rsi7: r1(I.rsi7[i]), rsi21: r1(I.rsi21[i]), rsi14: r1(I.rsi14[i]), prevRsi14: r1(I.rsi14[i - 1]),
    hist: r2(I.hist[i]), prevMacdHist: r2(I.hist[i - 1]), stochK, stochD, prevStochK, prevStochD,
    bbLower, bbUpper, isBBSqueeze, high52w, low52w, pos52w, week52ChangePct, support, weekChangePct, monthChangePct, vsMa50Pct,
    trendHarga: trendOf(cClose, [ma21, ma50, ma100, ma200]), ema921BullishNow, ema921FreshCross,
    foreignNet1D: null, foreignNet5D: null, npm: null, roe: null,   // tidak ada di flows -> diperlakukan kosong (sama dgn app saat data kosong)
  };
  s.band = bandarmologi(s, volRatio);
  return s;
}

// ---------- definisi screener (port dari presetPass/bowEval/BSJP/SmartPick, parameter BAWAAN) ----
const cross = s => s.prevStochK < s.prevStochD && s.stochK > s.stochD;
const nn = (...v) => v.every(x => x != null);
const BOW = { trendMa200: true, trendMa50: true, pos52On: true, pos52Min: 30, pos52Max: 80, weekOn: true, weekMin: -10, weekMax: -3, monthOn: true, monthMin: -20,
  rsiOn: true, rsiMin: 30, rsiMax: 45, rsi7Max: 40, nearOn: true, nearMa50: true, ma50Min: -8, ma50Max: 0, nearEma: true, emaPct: 3, nearSup: true, supBelow: 2, supAbove: 5,
  nearBb: true, bbPct: 2, confOn: true, confStoch: true, confRsi: true, confClv: true, clvMin: 0.5, confMin: 1, turnoverOn: true, turnoverMin: 5, panicOn: true, panicVol: 2, foreignOn: true };
function bowEval(s, c = BOW) {                   // = bowEval() app.js
  const rg = (a, b) => [Math.min(a, b), Math.max(a, b)];
  if (c.trendMa200 && (s.cClose == null || s.ma200 == null || s.cClose <= s.ma200)) return 0;
  if (c.trendMa50 && s.ma50 != null && s.ma200 != null && s.ma50 <= s.ma200) return 0;
  if (c.pos52On && s.pos52w != null) { const [lo, hi] = rg(c.pos52Min, c.pos52Max); if (s.pos52w < lo || s.pos52w > hi) return 0; }
  if (c.weekOn) { const [lo, hi] = rg(c.weekMin, c.weekMax); if (s.weekChangePct == null || s.weekChangePct < lo || s.weekChangePct > hi) return 1; }
  if (c.monthOn && s.monthChangePct != null && s.monthChangePct < c.monthMin) return 1;
  if (c.rsiOn) { const [lo, hi] = rg(c.rsiMin, c.rsiMax); const ok = s.rsi14 != null ? (s.rsi14 >= lo && s.rsi14 <= hi) : (s.rsi7 != null && s.rsi7 <= c.rsi7Max); if (!ok) return 1; }
  if (c.nearOn && (c.nearMa50 || c.nearEma || c.nearSup || c.nearBb)) {
    const [m1, m2] = rg(c.ma50Min, c.ma50Max);
    const okMa50 = c.nearMa50 && s.vsMa50Pct != null && s.vsMa50Pct >= m1 && s.vsMa50Pct <= m2;
    const okEma = c.nearEma && s.cClose != null && s.ema21L != null && s.cClose <= s.ema21L * (1 + c.emaPct / 100);
    const okSup = c.nearSup && s.cClose != null && s.support != null && s.support > 0 && s.cClose >= s.support * (1 - c.supBelow / 100) && s.cClose <= s.support * (1 + c.supAbove / 100);
    const okBb = c.nearBb && s.cClose != null && s.bbLower != null && s.cClose <= s.bbLower * (1 + c.bbPct / 100);
    if (!(okMa50 || okEma || okSup || okBb)) return 2;
  }
  if (c.confOn) {
    const avail = (c.confStoch ? 1 : 0) + (c.confRsi ? 1 : 0) + (c.confClv ? 1 : 0);
    if (avail) {
      let n = 0;
      if (c.confStoch && nn(s.prevStochK, s.prevStochD, s.stochK, s.stochD) && cross(s)) n++;
      if (c.confRsi && s.rsi14 != null && s.prevRsi14 != null && s.rsi14 > s.prevRsi14) n++;
      if (c.confClv && s.clv != null && s.clv > c.clvMin) n++;
      if (n < Math.min(Math.max(1, Math.round(c.confMin)), avail)) return 3;
    }
  }
  if (c.turnoverOn && (s.turnover == null || s.turnover < c.turnoverMin * 1e9)) return 4;
  if (c.panicOn && (s.changePct || 0) < 0 && s.volRatio != null && s.volRatio > c.panicVol) return 4;
  if (c.foreignOn && s.foreignNet5D != null && s.foreignNet5D < 0) return 4;
  return -1;
}
const BS = { minTurnover: 5e9, minVolRatio: 1.5, minChangePct: 2, maxChangePct: 15, closeProximity: 0.25 };
function bsjpLolos(s) {                          // = computeBsjpEngine().lolos; orderbook & notasi tidak ada -> NA (tidak menggugurkan)
  const proxyOk = s.cClose >= s.cHigh - BS.closeProximity * (s.cHigh - s.cLow);
  const emaF = s.ema20 ?? s.ma21, emaS = s.ema50 ?? s.ma50;
  const trendOk = nn(emaF, emaS) ? (s.cClose > emaF && s.cClose > emaS) : false;
  const cr3 = s.band.tone === "up" || (s.foreignNet1D || 0) > 0;
  return (s.turnover ?? s.valueTraded) >= BS.minTurnover && s.volRatio > BS.minVolRatio
    && s.changePct >= BS.minChangePct && s.changePct <= BS.maxChangePct && proxyOk && trendOk && cr3;
}
const liq = s => (s.valueTraded != null ? s.valueTraded : s.turnover) || 0;   // = spLiquidity
const SCR = [
  { id: "dsi_eri", grp: "dsi", label: "DSI Momentum Kuat Berlanjut", test: s =>
      s.rsi7 >= 58 && s.rsi7 <= 70 && s.rsi21 >= 50 && s.rsi21 <= 70 && s.rsi7 > s.rsi21
      && s.cClose > s.ema21H && s.cClose <= s.ema21H * 1.03 && s.cClose > s.ema89
      && s.cHigh > s.prevHigh && s.cLow > s.prevLow && s.cVol > s.prevVol && nn(s.prevStochK, s.stochK) && cross(s) },
  { id: "dsi_rsicross", grp: "dsi", label: "DSI RSI & Harga Cross", test: s =>
      s.rsi7 >= 58 && s.rsi7 <= 75 && s.rsi21 >= 50 && s.rsi21 <= 75 && s.rsi7 > s.rsi21
      && s.cLow < s.ema21L && s.cClose > s.ema21H && s.cClose > s.cOpen && s.cClose >= (s.cHigh + s.cLow) / 2
      && s.turnover > 200e6 && s.cClose > s.ma100 },
  { id: "dsi_golden", grp: "dsi", label: "DSI Golden Cross (MACD+Stoch)", test: s =>
      nn(s.prevMacdHist, s.hist, s.prevStochK, s.stochK) && s.prevMacdHist <= 0 && s.hist > 0 && cross(s) },
  { id: "dsi_ema921cross", grp: "dsi", label: () => `DSI EMA9x21 (${OPT.ema921})`, test: s =>
      OPT.ema921 === "all" ? s.ema921BullishNow === true : s.ema921FreshCross },
  { id: "dsi_uptrend", grp: "dsi", label: "DSI Super Uptrend", test: s =>
      nn(s.ma21, s.ma50, s.ma100, s.ma200) && s.cClose > s.ma21 && s.ma21 > s.ma50 && s.ma50 > s.ma100 && s.ma100 > s.ma200 },
  { id: "dsi_breakout", grp: "dsi", label: "DSI Volatility Breakout", test: s =>
      s.isBBSqueeze.indexOf("Ya") !== -1 && s.volRatio >= 1.5 && s.cClose > s.ema21H && s.changePct > 0 },
  { id: "dsi_pullback", grp: "dsi", label: "DSI Pullback Uptrend", test: s =>
      s.trendHarga.indexOf("Bullish") === 0 && s.cClose <= s.ema21L * 1.03 && s.cClose >= s.support * 0.98
      && (!nn(s.prevStochK, s.prevStochD, s.stochK, s.stochD) || cross(s)) },
  { id: "dsi_bow", grp: "dsi", label: "DSI Buy on Weakness", test: s => bowEval(s) === -1 },
  { id: "dsi_custom_bandar", grp: "dsi", label: "DSI BPJS (proxy volume)", test: s =>
      nn(s.ma21, s.ma50, s.ma100, s.ma200) && s.cOpen > s.ma21 && s.cOpen > s.ma50 && s.cOpen > s.ma100 && s.cOpen > s.ma200
      && s.volRatio > 2 && s.turnover >= 10e9 && (s.band.tone === "up" || s.uangGedeMasuk.includes("Akumulasi")) },
  { id: "dsi_freq_spike", grp: "dsi", label: "DSI Lonjakan Frekuensi", needFreq: true, test: s => s.freqRatio != null && s.freqRatio >= 1.5 },
  { id: "dsi_freq_up_vol_down", grp: "dsi", label: "DSI Freq naik Vol turun", needFreq: true, test: s =>
      s.freqRatio != null && s.freqRatio >= 1.3 && s.volRatio < 0.8 && s.turnover >= 1e9 },
  { id: "bsjp_strict", grp: "bsjp", model: "bsjp", label: "BSJP Strict Rules", test: s => bsjpLolos(s) },
  { id: "bsjp_accumulation", grp: "bsjp", model: "bsjp", label: "BSJP Top Accumulation (proxy)", test: s => s.band.tone === "up" },   // bandarScore>=15 tanpa data asing = cr3 proxy
  { id: "bsjp_breakout52w", grp: "bsjp", model: "bsjp", label: "BSJP Breakout 52W High", test: s => s.high52w != null && s.cClose >= s.high52w * 0.97 },
  { id: "bsjp_liquidity", grp: "bsjp", model: "bsjp", label: "BSJP High Liquidity >10B", test: s => (s.turnover ?? s.valueTraded ?? 0) > 10e9 },
  { id: "sp_area_demand", grp: "smartpick", label: "SmartPick Area Demand", test: s => {
      const rangeOk = s.high52w == null || s.low52w == null || !(s.low52w > 0) || (s.high52w - s.low52w) / s.low52w * 100 >= 15;
      return s.pos52w != null && s.pos52w <= 30 && s.cClose >= 100 && s.changePct > -4 && liq(s) >= 1e9 && rangeOk; } },
  { id: "sp_throwback", grp: "smartpick", label: "SmartPick Throwback/Retest", test: s => s.pos52w != null && s.pos52w >= 45 && s.pos52w <= 90 && s.changePct >= 0 },
  { id: "sp_liquidity_sweep", grp: "smartpick", label: "SmartPick Liquidity Sweep", test: s => s.pos52w != null && s.pos52w < 30 && s.changePct > 1 && liq(s) >= 100e6 },
  { id: "sp_bull_divergence", grp: "smartpick", label: "SmartPick Bull Divergence", test: s => s.pos52w != null && s.pos52w < 55 && s.changePct > 0 && liq(s) >= 100e6 },
  { id: "sp_early_breakout", grp: "smartpick", label: "SmartPick Early Breakout", test: s => s.pos52w != null && s.pos52w > 50 && s.changePct > 0 && liq(s) >= 100e6 },
  { id: "c7_dragon_warn", grp: "dragon", label: "Dragon Waspada (sisi SELL)", warn: true, test: (s, b, i) => {
      let k = 0; for (let j = i; j >= 0 && k <= 15; j--) { if (b[j].close > b[j].open) k++; else break; }
      if (![7, 8, 10].includes(k) || i < 14) return false;
      let sm = 0; for (let j = i - 14; j <= i; j++) sm += b[j].close;
      const mid = sm / 15; let v = 0; for (let j = i - 14; j <= i; j++) v += (b[j].close - mid) ** 2;
      return b[i].high >= mid + 2 * Math.sqrt(v / 15); } },
];
const SKIP = [
  ["dsi_bagger", "Skor Bagger", "butuh fundamental point-in-time"], ["dsi_deepvalue", "Deep Value", "butuh PER/PBV/ROE/DER historis"],
  ["dsi_multibagger", "Multibagger", "butuh PER/ROE/DER/NPM historis"], ["dsi_growth", "Growth", "butuh ROE/NPM historis"],
  ["dsi_defensive", "Defensive", "butuh ROE/DER/NPM historis"], ["dsi_smallcap", "Small Cap", "butuh ROE/PER historis"],
  ["dsi_asing_akumulasi", "Akumulasi Asing (IDX)", "butuh riwayat net asing harian"],
  ["custom_*", "Preset Kustom", "aturan buatan pengguna di Supabase (custom_presets)"],
  ["c7_reb / c7_brk / c7_dragon", "7C Pantulan, 7C Breakout, Dragon Buy", "sudah ada di backtest7c.mjs"],
];
const labelOf = S => typeof S.label === "function" ? S.label() : S.label;
const selected = () => SCR.filter(S => !OPT.only || OPT.only.has(S.grp) || OPT.only.has(S.id));

// ---------- konfigurasi exit ---------------------------------------------------------
const FWD = []; for (const H of OPT.hold) for (const sl of OPT.sl) FWD.push({ type: "fwd", H, sl, key: `${H}h/${sl ? "SL" + sl + "%" : "noSL"}` });
const BSJP_MODES = [{ type: "bsjp", mode: "open+1", key: "open+1" }, { type: "bsjp", mode: "tp/sl", key: "tp/sl" }, { type: "bsjp", mode: "close+1", key: "close+1" }];
const cfgsOf = S => S.model === "bsjp" ? BSJP_MODES : FWD;

// ---------- simulasi ----------------------------------------------------------------------
const net = (buyPx, sellPx) => ((sellPx * (1 - OPT.slip / 100)) / (buyPx * (1 + OPT.slip / 100)) - 1) * 100 - OPT.fee;
function simFwd(b, i, H, slPct) {                // entry open i+1; keluar close hari ke-H; SL tetap bila ada
  const e = i + 1, last = e + H - 1;
  if (last >= b.length) return null;             // data tidak cukup untuk horizon penuh -> dibuang (sama dgn baseline)
  const entry = b[e].open; if (!(entry > 0)) return null;
  const sl = slPct ? entry * (1 - slPct / 100) : null;
  let exit = null, exitIdx = last;
  if (sl !== null) for (let j = e; j <= last; j++) {
    if (b[j].open <= sl) { exit = b[j].open; exitIdx = j; break; }
    if (b[j].low <= sl) { exit = sl; exitIdx = j; break; }
  }
  if (exit === null) exit = b[last].close;
  return { ret: net(entry, exit), exitIdx };
}
function simBsjp(b, i, mode) {                   // entry close hari sinyal (closing auction), keluar hari berikutnya
  const y = b[i + 1]; if (!y) return null;
  const entry = b[i].close; if (!(entry > 0)) return null;
  let exit;
  if (mode === "open+1") exit = y.open;
  else if (mode === "close+1") exit = y.close;
  else {
    const tp = entry * (1 + OPT.bsjpTp / 100), sl = entry * (1 - OPT.bsjpSl / 100);
    if (y.open <= sl) exit = y.open; else if (y.open >= tp) exit = y.open;
    else if (y.low <= sl) exit = sl; else if (y.high >= tp) exit = tp; else exit = y.close;
  }
  return { ret: net(entry, exit), exitIdx: mode === "close+1" ? i + 1 : i };
}
const simCfg = (b, i, c) => c.type === "bsjp" ? simBsjp(b, i, c.mode) : simFwd(b, i, c.H, c.sl);

// ---------- statistik ----------------------------------------------------------------------
function stats(rets) {
  const n = rets.length; if (!n) return { n: 0 };
  const mean = rets.reduce((a, b) => a + b, 0) / n, sorted = [...rets].sort((a, b) => a - b);
  const med = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  let gw = 0, gl = 0, w = 0, ss = 0;
  for (const r of rets) { if (r > 0) { gw += r; w++; } else gl -= r; ss += (r - mean) ** 2; }
  const sd = n > 1 ? Math.sqrt(ss / (n - 1)) : 0;
  return { n, mean, med, win: w / n * 100, pf: gl > 0 ? gw / gl : (gw > 0 ? Infinity : 0), t: sd > 1e-9 ? mean / (sd / Math.sqrt(n)) : 0 };
}
const f2 = v => (v === undefined || v === null || !isFinite(v)) ? "-" : v.toFixed(2);
const pad = (s, w) => String(s).padEnd(w), rpad = (s, w) => String(s).padStart(w);

// ---------- data ---------------------------------------------------------------------------------
async function loadData() {
  let rows;
  if (typeof A.csv === "string") {
    const lines = fs.readFileSync(A.csv, "utf8").split(/\r?\n/).filter(Boolean);
    const head = lines.shift().split(",").map(s => s.trim().toLowerCase());
    const ix = k => head.indexOf(k), op = ix("open") >= 0 ? ix("open") : ix("open_price");
    const ic = { ticker: ix("ticker"), date: ix("date"), open: op, high: ix("high"), low: ix("low"), close: ix("close"), volume: ix("volume"), value: ix("value"), frequency: ix("frequency") };
    if (["ticker", "date", "open", "high", "low", "close", "volume"].some(k => ic[k] < 0)) throw new Error("Kolom CSV minimal: ticker,date,open,high,low,close,volume (opsional: value,frequency)");
    rows = lines.map(l => { const c = l.split(","); const g = k => ic[k] >= 0 ? c[ic[k]] : null; return { ticker: g("ticker"), date: g("date"), open_price: g("open"), high: g("high"), low: g("low"), close: g("close"), volume: g("volume"), value: g("value"), frequency: g("frequency") }; });
  } else {
    const cache = path.resolve("flows_cache_full.json");
    if (!A.refresh && fs.existsSync(cache)) { rows = JSON.parse(fs.readFileSync(cache, "utf8")); console.log(`Memakai cache lokal: ${rows.length} baris (--refresh untuk tarik ulang)`); }
    else {
      const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_KEY;
      if (!URL_ || !KEY) throw new Error("Set SUPABASE_URL dan SUPABASE_KEY (atau pakai --csv). Lihat komentar di atas skrip.");
      rows = []; let offset = 0; const since = OPT.since ? `&date=gte.${OPT.since}` : "";
      for (;;) {
        const u = `${URL_.replace(/\/$/, "")}/flows?select=ticker,date,open_price,high,low,close,volume,value,frequency&order=ticker.asc,date.asc&limit=1000&offset=${offset}${since}`;
        const r = await fetch(u, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } });
        if (!r.ok) throw new Error(`flows HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
        const ch = await r.json(); if (!Array.isArray(ch) || !ch.length) break;
        rows.push(...ch); offset += ch.length; process.stdout.write(`\rMenarik data flows: ${rows.length} baris...`);
        if (offset > 3_000_000) break;
      }
      process.stdout.write("\n"); fs.writeFileSync(cache, JSON.stringify(rows));
    }
  }
  return rows;
}
function groupBars(rows) {
  const by = new Map();
  for (const r of rows) {
    const close = Number(r.close); if (r.close == null || r.close === "" || !(close > 0)) continue;
    const t = String(r.ticker || "").toUpperCase(); if (!t || (OPT.tickers && !OPT.tickers.has(t))) continue;
    const date = String(r.date).slice(0, 10); if (OPT.since && date < OPT.since) continue;
    const arr = by.get(t) || by.set(t, []).get(t), prev = arr.length ? arr[arr.length - 1].close : close;
    const o = Number(r.open_price), h = Number(r.high), l = Number(r.low), open = o > 0 ? o : prev;
    arr.push({ date, open, high: h > 0 ? h : Math.max(open, close), low: l > 0 ? l : Math.min(open, close), close, volume: Number(r.volume) || 0, value: Number(r.value) || 0, freq: Number(r.frequency) || 0 });
  }
  for (const [, arr] of by) arr.sort((x, y) => x.date < y.date ? -1 : 1);
  return by;
}
const turnOf = x => x.value > 0 ? x.value : x.close * x.volume * OPT.volMult;
const inUniverse = x => turnOf(x) >= OPT.minTurnover && x.close >= OPT.minPrice;

// ---------- backtest (dua lintasan) ----------------------------------------------------------
function runAll(by, scr) {
  const all = [...FWD, ...BSJP_MODES], base = new Map(), dates = new Set();
  for (const c of all) base.set(c.key, new Map());
  const addBase = (key, d, r) => { const m = base.get(key); const o = m.get(d); if (o) { o.s += r; o.c++; } else m.set(d, { s: r, c: 1 }); };
  // Lintasan 1: baseline (semua saham likuid) per tanggal -- tidak butuh indikator
  for (const [, b] of by) {
    if (b.length < OPT.warmup + 30) continue;
    for (let i = OPT.warmup; i < b.length - 1; i++) {
      if (!inUniverse(b[i])) continue;
      dates.add(b[i].date);
      for (const c of all) { const r = simCfg(b, i, c); if (r) addBase(c.key, b[i].date, r.ret); }
    }
  }
  const dl = [...dates].sort();
  const split = typeof A.split === "string" ? A.split : (dl.length ? dl[Math.floor(dl.length * 0.7)] : "9999");
  const bm = (key, d) => { const o = base.get(key).get(d); return o ? o.s / o.c : null; };
  // Lintasan 2: sinyal screener
  const G = new Map(), raw = new Map(), trades = [];
  const grp = (sid, key) => { const k = sid + "||" + key; let g = G.get(k); if (!g) G.set(k, g = { sid, key, ret: [], exc: [], oRet: [], oExc: [] }); return g; };
  for (const [t, b] of by) {
    if (b.length < OPT.warmup + 30) continue;
    const I = buildInd(b);
    const busy = scr.map(S => cfgsOf(S).map(() => -1));
    for (let i = OPT.warmup; i < b.length - 1; i++) {
      if (!inUniverse(b[i])) continue;
      const s = mkRow(t, b, I, i);
      scr.forEach((S, si) => {
        if (S.needFreq && !I.hasFreq) return;
        let ok; try { ok = !!S.test(s, b, i); } catch (e) { ok = false; }
        if (!ok) return;
        raw.set(S.id, (raw.get(S.id) || 0) + 1);
        cfgsOf(S).forEach((c, ci) => {
          if (!OPT.overlap && i <= busy[si][ci]) return;
          const r = simCfg(b, i, c); if (!r) return;
          busy[si][ci] = r.exitIdx;
          const m = bm(c.key, b[i].date); if (m === null) return;
          const g = grp(S.id, c.key), exc = r.ret - m;
          g.ret.push(r.ret); g.exc.push(exc);
          if (b[i].date >= split) { g.oRet.push(r.ret); g.oExc.push(exc); }
          if (A.out) trades.push([labelOf(S), c.key, t, b[i].date, r.ret, exc, S.id]);
        });
      });
    }
  }
  return { G, raw, base, split, trades, nDates: dl.length };
}

function report(res, scr) {
  const { G, raw, base, split } = res;
  console.log(`\nBiaya round trip ${OPT.fee}% + slippage ${OPT.slip}%/sisi · likuiditas >= Rp${(OPT.minTurnover / 1e9).toFixed(1)} miliar · harga >= ${OPT.minPrice} · warmup ${OPT.warmup} candle · batas OOS ${split} · ${OPT.overlap ? "posisi boleh tumpang tindih" : "satu posisi per ticker per screener"}`);
  console.log("\nBASELINE (semua saham likuid, tanpa seleksi), rata-rata hasil bersih per transaksi:");
  for (const [k, m] of base) { let s = 0, c = 0; for (const o of m.values()) { s += o.s; c += o.c; } if (c) console.log(`  ${pad(k, 12)} n=${rpad(c, 9)}  avg ${f2(s / c)}%`); }
  const head = `${pad("Screener", 34)}${pad("Exit", 12)}${rpad("n", 6)}${rpad("win%", 7)}${rpad("avg%", 8)}${rpad("med%", 8)}${rpad("PF", 6)}${rpad("t", 6)} |${rpad("exc%", 8)}${rpad("t_exc", 7)} |${rpad("nOOS", 6)}${rpad("avgOOS", 8)}${rpad("excOOS", 8)}`;
  console.log("\n" + head + "\n" + "-".repeat(head.length));
  const board = [], csv = [];
  for (const [k, m] of base) { let sm = 0, c = 0; for (const o of m.values()) { sm += o.s; c += o.c; } if (c) csv.push({ id: "baseline", label: "BASELINE (semua saham likuid)", grp: "baseline", key: k, n: c, avg: sm / c }); }
  for (const S of scr) {
    if (S.needFreq && !raw.has(S.id)) { console.log(`${pad(labelOf(S), 34)}(dilewati: tidak ada kolom frequency di data)`); console.log(""); continue; }
    let printed = false;
    for (const c of cfgsOf(S)) {
      const g = G.get(S.id + "||" + c.key); if (!g || !g.ret.length) continue;
      const s = stats(g.ret), e = stats(g.exc), o = stats(g.oRet), oe = stats(g.oExc);
      console.log(`${pad(labelOf(S), 34)}${pad(c.key, 12)}${rpad(s.n, 6)}${rpad(f2(s.win), 7)}${rpad(f2(s.mean), 8)}${rpad(f2(s.med), 8)}${rpad(isFinite(s.pf) ? f2(s.pf) : "inf", 6)}${rpad(f2(s.t), 6)} |${rpad(f2(e.mean), 8)}${rpad(f2(e.t), 7)} |${rpad(o.n || 0, 6)}${rpad(f2(o.mean), 8)}${rpad(f2(oe.mean), 8)}${s.n < 30 ? " (n kecil)" : ""}`);
      printed = true;
      board.push({ S, key: c.key, s, e, o, oe });
      csv.push({ id: S.id, label: labelOf(S), grp: S.grp, key: c.key, n: s.n, win: s.win, avg: s.mean, med: s.med, pf: s.pf, t: s.t, exc: e.mean, texc: e.t, nO: o.n || 0, avgO: o.mean, excO: oe.mean, raw: raw.get(S.id) || 0 });
    }
    if (printed) console.log("");
    else console.log(`${pad(labelOf(S), 34)}(tidak ada sinyal -- sinyal mentah: ${raw.get(S.id) || 0})\n`);
  }
  // papan peringkat: konfigurasi acuan
  const refF = FWD.find(c => c.H === 5 && !c.sl) || FWD[0], refKeys = [refF && refF.key, "open+1"].filter(Boolean);
  for (const rk of refKeys) {
    const rows = board.filter(x => x.key === rk && x.s.n >= 30).sort((a, b) => b.e.mean - a.e.mean);
    if (!rows.length) continue;
    console.log(`PERINGKAT berdasarkan excess return vs pasar di tanggal yang sama (exit ${rk}, n >= 30):`);
    for (const x of rows) console.log(`  ${pad(labelOf(x.S), 34)} exc ${rpad(f2(x.e.mean), 7)}%  t=${rpad(f2(x.e.t), 6)}  avg ${rpad(f2(x.s.mean), 7)}%  OOS exc ${rpad(f2(x.oe.mean), 7)}% (n=${x.o.n || 0})  ${x.e.mean > 0 && x.oe.mean > 0 && Math.abs(x.e.t) >= 3 ? "<< lolos IS+OOS, |t|>=3" : ""}`);
    console.log("");
  }
  console.log("Cara membaca: avg% = rata-rata hasil bersih; PF = profit factor; exc% = avg dikurangi rata-rata SEMUA saham likuid di tanggal masuk yang sama (membuang efek arah pasar);");
  console.log("t / t_exc = rata-rata / galat baku. Sinyal bergerombol di tanggal yang sama (korelasi silang), jadi t cenderung terlalu optimistis: anggap |t| < 3 belum meyakinkan.");
  console.log(`Ada ${scr.length} screener x beberapa exit yang diuji sekaligus -> sebagian akan tampak bagus hanya karena kebetulan. Utamakan yang positif di avg%, exc%, DAN OOS, dengan n cukup.`);
  console.log("Dragon Waspada adalah peringatan, bukan sinyal beli: exc% NEGATIF berarti peringatannya berguna.");
  console.log("BSJP: entry di close hari sinyal (closing auction) memakai kriteria yang dihitung dari close yang sama, jadi hasilnya sedikit lebih optimistis dari eksekusi nyata; bid/offer, notasi khusus, dan data asing tidak ada di flows (diperlakukan NA/kosong seperti di app).");
  console.log("Preset DSI/Smart Pick tidak punya aturan exit sendiri; yang diuji adalah 'beli di open besok, tahan H hari' (opsional dengan SL tetap lewat --sl).");
  console.log("Baris dengan konfigurasi exit berbeda berasal dari sinyal yang SAMA, jadi tidak independen.");
  return csv;
}

// ---------- selftest ---------------------------------------------------------------------------------
function selftest() {
  let ok = 0, bad = 0; const chk = (n, c) => { c ? ok++ : bad++; console.log((c ? "PASS " : "FAIL ") + n); };
  // Referensi: fungsi ti_* DISALIN APA ADANYA dari app.js (versi jendela penuh), dibandingkan dgn versi deret waktu di atas
  const ti_average = a => (!a.length ? 0 : a.reduce((x, y) => x + (y || 0), 0) / a.length);
  const ti_calcEMA = (d, p) => { if (!d || d.length < p) return null; const k = 2 / (p + 1); let e = ti_average(d.slice(0, p)); for (let i = p; i < d.length; i++) e = (d[i] - e) * k + e; return e; };
  const ti_calcRSI = (d, p) => { if (d.length <= p) return 50; let g = 0, l = 0; for (let i = 1; i <= p; i++) { const c = d[i] - d[i - 1]; if (c > 0) g += c; else l -= c; } let ag = g / p, al = l / p; for (let i = p + 1; i < d.length; i++) { const c = d[i] - d[i - 1]; ag = (ag * (p - 1) + Math.max(c, 0)) / p; al = (al * (p - 1) + Math.max(-c, 0)) / p; } if (al === 0) return 100; return 100 - 100 / (1 + ag / al); };
  const ti_calcEMASeries = (d, p) => { const a = new Array(d.length).fill(null); if (d.length < p) return a; const k = 2 / (p + 1); let e = ti_average(d.slice(0, p)); a[p - 1] = e; for (let i = p; i < d.length; i++) { e = (d[i] - e) * k + e; a[i] = e; } return a; };
  const ti_calcMACDFull = d => { const fa = ti_calcEMASeries(d, 12), sa = ti_calcEMASeries(d, 26), ms = []; for (let i = 0; i < d.length; i++) if (fa[i] != null && sa[i] != null) ms.push(fa[i] - sa[i]); if (!ms.length) return { hist: 0 }; const sp = 9, ss = new Array(ms.length).fill(null); if (ms.length < sp) { const v = ti_average(ms); for (let i = 0; i < ms.length; i++) ss[i] = v; } else { const k = 2 / (sp + 1); let sg = ti_average(ms.slice(0, sp)); ss[sp - 1] = sg; for (let i = sp; i < ms.length; i++) { sg = (ms[i] - sg) * k + sg; ss[i] = sg; } } const hs = ms.map((m, i) => ss[i] != null ? m - ss[i] : null), last = ms.length - 1; return { hist: hs[last] != null ? hs[last] : 0 }; };
  const ti_calcStochastic = (h, l, c, pk, sk, pd) => { if (c.length < pk + sk + pd) return { k: null, d: null, prevK: null, prevD: null }; const rk = []; for (let i = pk - 1; i < c.length; i++) { const hh = Math.max(...h.slice(i - pk + 1, i + 1)), ll = Math.min(...l.slice(i - pk + 1, i + 1)); rk.push(hh - ll === 0 ? 50 : ((c[i] - ll) / (hh - ll)) * 100); } const sK = []; for (let i = sk - 1; i < rk.length; i++) sK.push(ti_average(rk.slice(i - sk + 1, i + 1))); const sD = []; for (let i = pd - 1; i < sK.length; i++) sD.push(ti_average(sK.slice(i - pd + 1, i + 1))); return { k: r1(sK[sK.length - 1]), d: r1(sD[sD.length - 1]), prevK: r1(sK[sK.length - 2]), prevD: r1(sD[sD.length - 2]) }; };
  let sd0 = 4242; const rnd = () => (sd0 = (sd0 * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const mkBars = (n, f = 0.04) => { const b = []; let p = 1000; for (let i = 0; i < n; i++) { const o = p, c = p * (1 + (rnd() - 0.48) * f); const hi = Math.max(o, c) * (1 + rnd() * 0.01), lo = Math.min(o, c) * (1 - rnd() * 0.01); b.push({ date: `2024-${String(1 + Math.floor(i / 28) % 12).padStart(2, "0")}-${String(1 + i % 28).padStart(2, "0")}#${i}`, open: o, high: hi, low: lo, close: c, volume: 1e6 * (0.5 + rnd()), value: 5e9 * (0.5 + rnd()), freq: Math.round(500 * (0.5 + rnd())) }); p = c; } return b; };
  const B = mkBars(420), I = buildInd(B), C = B.map(x => x.close), H = B.map(x => x.high), L = B.map(x => x.low);
  let eq = true; const near = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));
  for (const i of [60, 130, 250, 419]) {
    const pc = C.slice(0, i + 1), ph = H.slice(0, i + 1), pl = L.slice(0, i + 1);
    if (!near(I.rsi7[i], ti_calcRSI(pc, 7)) || !near(I.rsi21[i], ti_calcRSI(pc, 21)) || !near(I.rsi14[i], ti_calcRSI(pc, 14))) eq = false;
    if (!near(I.ema89[i], ti_calcEMA(pc, 89)) || !near(I.e21h[i], ti_calcEMA(ph, 21)) || !near(I.e21l[i], ti_calcEMA(pl, 21)) || !near(I.ema9[i], ti_calcEMA(pc, 9))) eq = false;
    if (!near(I.hist[i], ti_calcMACDFull(pc).hist)) eq = false;
    const st = ti_calcStochastic(ph, pl, pc, 14, 3, 3);
    if (r1(I.sK[i]) !== st.k || r1(I.sD[i]) !== st.d || r1(I.sK[i - 1]) !== st.prevK || r1(I.sD[i - 1]) !== st.prevD) eq = false;
  }
  chk("RSI/EMA/MACD/Stoch deret waktu = fungsi ti_* app.js pada jendela yang sama", eq);
  // BB squeeze: bandingkan dengan logika app.js
  let sqOk = true;
  for (const i of [150, 300, 419]) {
    const closes = C.slice(0, i + 1), bp = 20; const startIdx = Math.max(bp, closes.length - 120); let cur = null, mn = Infinity;
    const sdv = a => { const m = ti_average(a); return Math.sqrt(a.reduce((q, v) => q + (v - m) ** 2, 0) / a.length); };
    for (let k = startIdx; k <= closes.length; k++) { const sl = closes.slice(k - bp, k), m = ti_average(sl), w = m === 0 ? 0 : ((m + 2 * sdv(sl)) - (m - 2 * sdv(sl))) / m; if (k === closes.length) cur = r2(w); if (w < mn) mn = w; }
    const ref = cur <= mn * 1.05 ? "Ya" : "Tidak", mine = mkRow("X", B, I, i).isBBSqueeze.startsWith("Ya") ? "Ya" : "Tidak";
    if (ref !== mine) sqOk = false;
  }
  chk("BB Squeeze sama dengan logika app.js", sqOk);
  // tanpa look-ahead: baris pada candle i identik bila data setelah i dibuang
  let la = true;
  for (const i of [210, 260, 330]) { const a = mkRow("X", B, I, i), c2 = B.slice(0, i + 1), b2 = mkRow("X", c2, buildInd(c2), i); a.date = b2.date; if (JSON.stringify(a) !== JSON.stringify(b2)) la = false; }
  chk("baris indikator tidak berubah bila data masa depan dibuang (tanpa look-ahead)", la);
  const dummy = (() => { const rr = SCR.filter(S => !S.warn).map(S => { let n = 0; for (let i = 210; i < 400; i++) { const s = mkRow("X", B, I, i); try { if (S.test(s, B, i)) n++; } catch (e) { return -1; } } return n; }); return rr; })();
  chk("semua fungsi screener jalan tanpa error pada data acak", dummy.every(n => n >= 0));
  // simulasi
  OPT.fee = 0; OPT.slip = 0;
  const mk = a => a.map((x, i) => ({ date: `2026-01-${String(i + 1).padStart(2, "0")}`, open: x[0], high: x[1], low: x[2], close: x[3] }));
  let b = mk([[100, 101, 99, 100], [100, 101, 99, 100], [100, 103, 99, 102], [102, 105, 101, 104], [104, 106, 103, 105]]);
  let r = simFwd(b, 1, 2, null); chk("fwd: entry open besok, keluar close hari ke-2 (104)", r && Math.abs(r.ret - 4) < 1e-9);
  r = simFwd(mk([[100, 101, 99, 100], [100, 101, 99, 100], [100, 110, 90, 100], [100, 100, 100, 100]]), 1, 2, 5); chk("fwd: SL 5% kena intraday -> keluar di harga SL", r && Math.abs(r.ret + 5) < 1e-9);
  r = simFwd(mk([[100, 101, 99, 100], [100, 101, 99, 100], [100, 101, 99, 100], [90, 91, 88, 89], [89, 90, 88, 89]]), 1, 3, 5); chk("fwd: gap di bawah SL -> keluar di open (bukan di SL)", r && Math.abs(r.ret + 10) < 1e-9);
  chk("fwd: horizon melewati data -> dibuang", simFwd(b, 3, 5, null) === null);
  b = mk([[100, 101, 99, 100], [101, 103, 97.4, 100], [100, 100, 100, 100]]);
  r = simBsjp(b, 0, "open+1"); chk("bsjp open+1: entry close hari sinyal (100), jual open besok (101)", r && Math.abs(r.ret - 1) < 1e-9);
  r = simBsjp(b, 0, "tp/sl"); chk("bsjp tp/sl: low 97.4 <= SL 97.5 dan high 103 >= TP 102 di hari sama -> SL didahulukan", r && Math.abs(r.ret + 2.5) < 1e-9);
  OPT.fee = 0.4; OPT.slip = 0.1; r = simBsjp(b, 0, "open+1");
  chk("fee+slippage dipotong", r && Math.abs(r.ret - (((101 * 0.999) / (100 * 1.001) - 1) * 100 - 0.4)) < 1e-9);
  // BOW lolos pada contoh yang sengaja disusun & gugur di tahap yang benar
  const s0 = { cClose: 1000, ma200: 900, ma50: 950, pos52w: 50, weekChangePct: -5, monthChangePct: -8, rsi14: 40, prevRsi14: 35, vsMa50Pct: -4, ema21L: 990, support: 980, bbLower: 995,
    prevStochK: 20, prevStochD: 25, stochK: 30, stochD: 28, clv: 0.8, turnover: 8e9, changePct: 0.5, volRatio: 1, foreignNet5D: null };
  chk("BOW: contoh lolos semua tahap", bowEval(s0) === -1);
  chk("BOW: close di bawah MA200 gugur tahap 0", bowEval({ ...s0, cClose: 850 }) === 0);
  chk("BOW: turnover kecil gugur tahap 4", bowEval({ ...s0, turnover: 1e9 }) === 4);
  console.log(`${ok} lulus, ${bad} gagal`); process.exit(bad ? 1 : 0);
}

// ---------- main -------------------------------------------------------------------------------------------
(async () => {
  if (A.selftest) return selftest();
  if (A.list) { for (const S of SCR) console.log(`${pad(S.id, 24)}${pad(S.grp, 10)}${labelOf(S)}`); console.log("\nTidak diuji:"); for (const [id, n, why] of SKIP) console.log(`  ${pad(id, 28)}${pad(n, 38)}${why}`); return; }
  try {
    const scr = selected(); if (!scr.length) throw new Error("Tidak ada screener yang cocok dengan --only. Lihat --list.");
    const by = groupBars(await loadData());
    console.log(`Data: ${by.size} ticker, ${[...by.values()].reduce((a, v) => a + v.length, 0)} candle. Screener diuji: ${scr.length}.`);
    if (!OPT.only) { console.log("\nTIDAK DIUJI (tidak bisa dihitung dari flows tanpa bias):"); for (const [id, n, why] of SKIP) console.log(`  - ${n}: ${why}`); }
    const res = runAll(by, scr);
    if (!res.G.size) { console.log("Tidak ada sinyal pada data ini. Longgarkan --min-turnover / --warmup atau tambah rentang data."); return; }
    const sum = report(res, scr);
    const q0 = v => { const x = String(v ?? ""); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
    const fx = v => (v === undefined || v === null) ? "" : (v === Infinity ? "inf" : (isFinite(v) ? Number(v).toFixed(4) : ""));
    const sumPath = typeof A.summary === "string" ? A.summary : "backtest_summary.csv";
    const cols = ["id", "screener", "kelompok", "exit", "n", "win_pct", "avg_pct", "med_pct", "pf", "t", "exc_pct", "t_exc", "n_oos", "avg_oos_pct", "exc_oos_pct", "sinyal_mentah", "n_kecil", "batas_oos"];
    fs.writeFileSync(sumPath, "\uFEFF" + cols.join(",") + "\n" + sum.map(r => [r.id, r.label, r.grp, r.key, r.n, fx(r.win), fx(r.avg), fx(r.med), fx(r.pf), fx(r.t), fx(r.exc), fx(r.texc), r.nO ?? "", fx(r.avgO), fx(r.excO), r.raw ?? "", r.n !== undefined && r.id !== "baseline" ? (r.n < 30 ? "ya" : "tidak") : "", res.split].map(q0).join(",")).join("\n"));
    console.log(`\nRingkasan per screener & exit disimpan ke ${sumPath} (${sum.length} baris)`);
    if (typeof A.out === "string") {
      const q = v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      fs.writeFileSync(A.out, "screener,exit,ticker,tanggal_sinyal,hasil_bersih_pct,excess_pct,id\n" + res.trades.map(t => [t[0], t[1], t[2], t[3], f2(t[4]), f2(t[5]), t[6]].map(q).join(",")).join("\n"));
      console.log(`Transaksi disimpan ke ${A.out}`);
    }
  } catch (e) { console.error("ERROR:", e.message); process.exit(1); }
})();
