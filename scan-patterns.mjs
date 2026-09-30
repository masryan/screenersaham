#!/usr/bin/env node
// ============================================================================
// scan-patterns.mjs — hitung Chart Pattern Scanner di server, simpan hasilnya
// ke tabel `pattern_scan_results` (lihat pattern_scan_results.sql).
//
// Detektornya TIDAK ditulis ulang di sini: skrip memuat blok engine dari
// app.js (antara penanda @@PS_ENGINE_BEGIN dan @@PS_ENGINE_END), jadi hasil
// server & hasil scan lokal di browser selalu identik. Tiap kali Anda
// mengubah detektor di app.js, cukup jalankan ulang skrip ini.
//
// PAKAI (Node 18+):
//   export SUPABASE_URL="https://xxxx.supabase.co"        # boleh dengan /rest/v1
//   export SUPABASE_SERVICE_KEY="..."                     # service_role, JANGAN di-commit
//   node scan-patterns.mjs                                # semua saham, 1D + 1W
//   node scan-patterns.mjs --dry-run                      # hitung & tampilkan ringkasan, tanpa menulis
//   node scan-patterns.mjs --tickers=BBCA,TLKM --tf=1D    # uji sebagian saja
//   node scan-patterns.mjs --app=../web/app.js --min-score=50
//
// Jadwalkan SETELAH sync-idx-full.mjs selesai (cron / GitHub Actions / dll.).
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------- argumen & env ----------
const args = Object.fromEntries(process.argv.slice(2).map(a=>{
  const m = /^--([^=]+)(?:=(.*))?$/.exec(a); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const here = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH   = path.resolve(args.app || path.join(here, "app.js"));
const TFS        = String(args.tf || "1D,1W").split(",").map(s=>s.trim().toUpperCase()).filter(Boolean);
const MIN_STORE  = Number(args["min-score"] ?? 40);   // skor minimum yang disimpan (klien bisa filter lebih tinggi)
const DRY        = !!args["dry-run"];
const ONLY       = args.tickers ? String(args.tickers).toUpperCase().split(/[\s,;]+/).filter(Boolean) : null;
const DAYS       = 470, CHUNK = 10, PAGE = 1000, PAR = 6, BATCH = 500;

let BASE = String(process.env.SUPABASE_URL || "").replace(/\/+$/,"");
const KEY = process.env.SUPABASE_SERVICE_KEY || "";
if(!BASE || (!KEY && !DRY)){
  console.error("Isi env SUPABASE_URL dan SUPABASE_SERVICE_KEY (service_role) dulu. Lihat komentar di atas file ini.");
  process.exit(1);
}
if(!/\/rest\/v1$/.test(BASE)) BASE += "/rest/v1";
for(const t of TFS) if(t!=="1D" && t!=="1W"){ console.error(`Timeframe tidak dikenal: ${t} (pakai 1D / 1W)`); process.exit(1); }
const HEAD = { apikey:KEY, Authorization:`Bearer ${KEY}`, "Content-Type":"application/json" };

// ---------- muat engine dari app.js ----------
function loadEngine(){
  let src;
  try{ src = fs.readFileSync(APP_PATH, "utf8"); }
  catch(e){ console.error(`Tidak bisa membaca ${APP_PATH}. Pakai --app=path/ke/app.js`); process.exit(1); }
  const a = src.indexOf("// @@PS_ENGINE_BEGIN"), b = src.indexOf("// @@PS_ENGINE_END");
  if(a<0 || b<a){ console.error("Penanda @@PS_ENGINE_BEGIN/END tidak ditemukan di app.js — pakai app.js versi terbaru."); process.exit(1); }
  const block = src.slice(a, b);
  // Stub untuk referensi browser yang hanya dipakai di dalam fungsi UI/loader (tidak dipanggil di sini).
  const factory = new Function("SUPABASE_URL","getSupaHeaders","state","isSyariah",
    `${block}\nreturn { psScanBars, psToWeekly, psToRow, psRowToBar };`);
  return factory("", ()=>({}), { stocks:[] }, ()=>false);
}
const E = loadEngine();

// ---------- HTTP ----------
const sleep = ms=> new Promise(r=>setTimeout(r,ms));
async function http(url, opt={}, tries=4){
  let last;
  for(let i=0;i<tries;i++){
    try{
      const r = await fetch(url, { ...opt, headers:{ ...HEAD, ...(opt.headers||{}) } });
      if(r.ok) return r;
      const body = await r.text().catch(()=> "");
      const err = new Error(`HTTP ${r.status} ${url.split("?")[0]} ${body.slice(0,200)}`);
      if(r.status<500 && r.status!==429){ err.fatal = true; throw err; } // 4xx (selain 429): jangan diulang
      last = err;
    }catch(e){ if(e.fatal) throw e; last = e; }
    await sleep(600*(i+1)**2);
  }
  throw last;
}
async function fetchAll(pathQ){
  const rows = []; let off = 0, total = null;
  for(let guard=0; guard<500; guard++){
    const r = await http(`${BASE}/${pathQ}&limit=${PAGE}&offset=${off}`, { headers:{ Prefer:"count=exact" } });
    const part = await r.json(); if(!Array.isArray(part) || !part.length) break;
    rows.push(...part); off += part.length;
    if(total==null){ const m = /\/(\d+)$/.exec(r.headers.get("content-range")||""); total = m ? Number(m[1]) : null; }
    if(total!=null ? off>=total : part.length<PAGE) break;
  }
  return rows;
}

// ---------- alur utama ----------
const t0 = Date.now(), runStart = new Date().toISOString();
const log = (...a)=> console.log(`[${((Date.now()-t0)/1000).toFixed(1)}s]`, ...a);

let tickers = ONLY;
if(!tickers){
  const rows = await fetchAll("stocks_screener?select=ticker&order=ticker.asc");
  tickers = [...new Set(rows.map(r=>String(r.ticker||"").toUpperCase()).filter(Boolean))];
}
if(!tickers.length){ console.error("Daftar saham kosong (stocks_screener tidak mengembalikan ticker)."); process.exit(1); }
log(`${tickers.length} saham · timeframe ${TFS.join("+")} · simpan skor ≥ ${MIN_STORE}${DRY?" · DRY-RUN":""}`);

const since = new Date(Date.now()-DAYS*864e5).toISOString().slice(0,10);
const groups = []; for(let i=0;i<tickers.length;i+=CHUNK) groups.push(tickers.slice(i,i+CHUNK));
const out = []; let gi = 0, done = 0, noData = 0;

async function worker(){
  while(gi<groups.length){
    const g = groups[gi++];
    const rows = await fetchAll(`flows?ticker=in.(${g.map(encodeURIComponent).join(",")})&date=gte.${since}&select=ticker,date,open_price,high,low,close,volume&order=ticker.asc,date.asc`);
    const by = {};
    for(const r of rows){ const b = E.psRowToBar(r); if(b) (by[String(r.ticker).toUpperCase()] ||= []).push(b); }
    for(const t of g){
      const daily = by[t] || [];
      if(daily.length<40){ noData++; continue; }
      for(const tf of TFS){
        const bars = tf==="1W" ? E.psToWeekly(daily) : daily;
        for(const r of E.psScanBars(bars, tf)) if(r.score>=MIN_STORE) out.push(E.psToRow(t, tf, r, bars));
      }
    }
    done += g.length;
    if(done % 100 < CHUNK || done===tickers.length) log(`diproses ${done}/${tickers.length} saham · ${out.length} pola`);
  }
}
await Promise.all(Array.from({ length:Math.min(PAR, groups.length) }, worker));
log(`deteksi selesai: ${out.length} pola dari ${tickers.length-noData} saham (${noData} saham dilewati: histori < 40 bar)`);

// ringkasan
const cnt = {}; out.forEach(r=>{ const k=`${r.tf} ${r.pattern}`; cnt[k]=(cnt[k]||0)+1; });
const st = {}; out.forEach(r=> st[r.status]=(st[r.status]||0)+1);
console.log("status:", st);
console.log("top 10 skor:", out.slice().sort((a,b)=>b.score-a.score).slice(0,10).map(r=>`${r.ticker} ${r.tf} ${r.label} ${r.score}`).join(" | "));
if(DRY){ log("dry-run: tidak ada yang ditulis."); process.exit(0); }
if(!out.length && tickers.length>50){
  console.error("0 pola untuk >50 saham — kemungkinan masalah data. Tidak menulis/menghapus apa pun.");
  process.exit(2);
}

// ---------- tulis: upsert lalu bersihkan baris basi ----------
for(const r of out) r.scanned_at = runStart;
let written = 0;
for(let i=0;i<out.length;i+=BATCH){
  await http(`${BASE}/pattern_scan_results?on_conflict=ticker,tf,pattern`, {
    method:"POST", headers:{ Prefer:"resolution=merge-duplicates,return=minimal" }, body:JSON.stringify(out.slice(i,i+BATCH)),
  });
  written += Math.min(BATCH, out.length-i);
  log(`upsert ${written}/${out.length}`);
}
// Baris yang tidak tersentuh run ini = pola yang sudah tidak terdeteksi lagi -> hapus.
// (Hanya untuk tf & ticker yang ikut di-scan; --tickers tidak menghapus saham lain.)
let del = `pattern_scan_results?scanned_at=lt.${encodeURIComponent(runStart)}&tf=in.(${TFS.join(",")})`;
if(ONLY) del += `&ticker=in.(${ONLY.map(encodeURIComponent).join(",")})`;
await http(`${BASE}/${del}`, { method:"DELETE", headers:{ Prefer:"return=minimal" } });
log(`selesai. ${written} baris ditulis, baris basi dibersihkan.`);
