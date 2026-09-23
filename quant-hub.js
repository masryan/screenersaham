/* ================================================================
   QUANT HUB — fitur ala ihsgscreener.com untuk idx-screener
   ================================================================
   Cara pasang:
   1. Salin file ini ke folder aplikasi (sejajar index.html & app.js).
   2. Salin quant-hub.css ke folder yang sama.
   3. Di index.html, SEBELUM </body> tambahkan:
        <link rel="stylesheet" href="quant-hub.css">
        <script src="app.js"></script>   <-- (sudah ada)
        <script src="quant-hub.js"></script>
      Urutan WAJIB: quant-hub.js SETELAH app.js.

   Yang ditambahkan (menu "⚡ Quant Hub" di sidebar):
   - Dashboard  : metrik pasar ala ihsgscreener (Total Saham, Undervalue,
                  Skor rata-rata, Danger Zone, Fair Value, Top Candidate,
                  Vol Total) + chart IHSG (TradingView) + status pasar
                  BUKA/TUTUP + ticker tape + "Ultimate Score — For Long
                  Term" top 10.
   - Bandarmology: ARA Candidate & Swing Big Cap (deteksi saham
                  berpotensi ARA dari perilaku close/off/asing/volume).
   - Broker Stalker: 2 mode — Lacak Broker (satu broker → semua saham,
                  agregat dari tabel broker_summary Supabase) & Lacak
                  Saham (satu saham → broker aktifnya).
   - Favorit P&L: watchlist + harga entry tersimpan (localStorage) +
                  P/L unrealized + status FAIR/UV/DANGER.

   Desain integrasi: file ini SENGAJA tidak menyentuh render() app.js.
   Halaman punya container sendiri (#qhPage) di luar #content, jadi
   tidak ikut terhapus tiap app.js menggambar ulang layar. Data dibaca
   langsung dari state.stocks (global app.js) & tabel broker_summary.
   Formula Ultimate Score adalah formula transparan milik sendiri —
   BUKAN tiruan formula ihsgscreener (yang tidak dipublikasikan).
   ================================================================ */
(function(){
"use strict";

/* ─────────────────────────── STATE LOKAL ─────────────────────────── */
const QH = {
  open:false, subtab: (typeof localStorage !== "undefined" && localStorage.getItem("qh_subtab")) || "dashboard",
  // dashboard
  dashSearch:"", dashSektor:"", dashMinScore:0,
  // broker stalker
  bdTab:"broker", brokerCode:"", bdTicker:"", bdPeriod:"1m", bdView:"net",
  bdLoading:false, bdError:null, bdRaw:null, bdRangeDays:22, bdLatestDate:null,
  // favorit
  favSearch:"", favSort:{key:"pnl",asc:false},
  // BPJS (Beli Pagi, Jual Sore) — sumber: tabel sesi_snapshots (lihat
  // 08_sesi_snapshots.sql), diisi 2x/hari oleh snapshot-sesi.mjs
  bpjsLoading:false, bpjsError:null, bpjsRows:null,
  bpjsSearch:"", bpjsSort:{key:"return",asc:false}, bpjsMinReturn:null,
  // tombol "Snapshot Sekarang" — tarik live Stockbit utk watchlist, isi
  // sesi_snapshots langsung dari browser (tanpa laptop/cron)
  snapLoading:false, snapError:null, snapLastResult:null,
  lastStocksSig:"", modalTicker:null, booted:false
};
const QH_LS_ENTRY="qh_entry_prices_v1";
const QH_FOREIGN = new Set(["CS","UBS","AK","BK","YU","ZP","XC","CC","ML","JPM","GS","DB","NOM","CL","MS","RBS","HSBC","DGF","CGS","KIM","EI","CIC","YPI","BNI","XSP"]); // perkiraan kode asing umum — hanya untuk label
const QH_BROKER_NAMES = {
  AK:"UBS Sekuritas Indonesia", CS:"CGS International Sekuritas Indonesia", UB:"UBS AG",
  YU:"CGS-CIMB Sekuritas Indonesia", BK:"J.P. Morgan Sekuritas Indonesia", ZP:"Maybank Sekuritas Indonesia",
  XC:"Citi Sekuritas Indonesia", CC:"CICC Sekuritas Indonesia", ML:"Mandiri Sekuritas",
  OD:"Mandiri Sekuritas", PD:"BNI Sekuritas", LG:"Danareksa Sekuritas", FZ:"Trimegah Bangun Persada",
  DR:"Bahana Sekuritas", NI:"Indo Premier Sekuritas", HD:"Ciptadana Sekuritas", IF:"Investindo Nusantara",
  CP:"Permata Sekuritas", MK:"Mirae Asset Sekuritas", DP:"Phillip Sekuritas Indonesia",
  YP:"Phillip Sekuritas Indonesia", PO:"Korea Investment", KI:"Korea Investment & Sekuritas",
  UV:"UOB Kay Hian Sekuritas", SI:"Shinhan Sekuritas", NY:"NH Korindo Sekuritas", HW:"Hi Win Sekuritas"
};

/* ─────────────────────────── HELPERS ─────────────────────────── */
function qhEsc(s){ return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function qhN(v){ const n = Number(v); return (v===null||v===undefined||v===""||isNaN(n)) ? null : n; }
function qhFmt(n){ return n===null||n===undefined||isNaN(n) ? "-" : new Intl.NumberFormat("id-ID").format(n); }
function qhRp(n){ return n===null||n===undefined||isNaN(n) ? "-" : "Rp" + new Intl.NumberFormat("id-ID").format(Math.round(n)); }
function qhPct(n, signed){
  if(n===null||n===undefined||isNaN(n)) return "-";
  const v = new Intl.NumberFormat("id-ID",{minimumFractionDigits:1,maximumFractionDigits:1}).format(Math.abs(n));
  return (n>0&&signed?"+":n<0?"-":"")+v+"%";
}
function qhCompact(v){ // 3.40T / 596.6B / 187.5M / 12.3jt
  if(v===null||v===undefined||isNaN(v)) return "-";
  const a = Math.abs(v);
  if(a>=1e12) return new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(v/1e12)+"T";
  if(a>=1e9)  return new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(v/1e9)+"B";
  if(a>=1e6)  return new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(v/1e6)+"M";
  if(a>=1e3)  return new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(v/1e3)+"K";
  return String(Math.round(v));
}
function qhChgTone(n){ return n>0?"qh-net-pos":n<0?"qh-net-neg":""; }
function qhChgArrow(n){ return n>0?"▲":n<0?"▼":"—"; }
function qhAraLimit(price){ // auto-rejection allowance bursa (simetris, sejak 2023)
  if(price==null) return 20;
  if(price<50) return 35;
  if(price<200) return 25;
  if(price<=5000) return 20;
  return 15;
}
function qhSektorShort(s){
  const t = String(s||"").toLowerCase();
  if(!t) return "-";
  if(t.includes("properti")||t.includes("real estate")) return "Prop";
  if(t.includes("keuangan")||t.includes("financial")) return "Financials";
  if(t.includes("energi")) return "Energy";
  if(t.includes("infrastruktur")||t.includes("utilit")) return "Infrastruct";
  if(t.includes("bahan baku")||t.includes("basic material")) return "Basic Mater";
  if(t.includes("industri")) return "Industrials";
  if(t.includes("konsumen siklik")||t.includes("cyclic")) return "C.Cyclicals";
  if(t.includes("non-siklik")||t.includes("non cycl")) return "C.Non-Cycli";
  if(t.includes("kesehatan")||t.includes("health")) return "Healthcare";
  if(t.includes("teknologi")||t.includes("tech")) return "Tech";
  if(t.includes("transportasi")) return "Transport";
  return String(s).split(/\s+/).slice(0,2).join(" ");
}
function qhToneClass(score){
  if(score>=75) return "qh-us-score";           // emas (utama)
  if(score>=60) return "qh-us-score";
  return "qh-us-score";
}
function qhStocks(){
  try{ return (typeof state!=="undefined" && Array.isArray(state.stocks)) ? state.stocks : []; }catch(e){ return []; }
}
function qhSupa(){
  try{
    if(typeof SUPABASE_URL!=="undefined" && SUPABASE_URL && typeof getSupaHeaders==="function") return {url:SUPABASE_URL, headers:getSupaHeaders()};
  }catch(e){}
  const u = typeof localStorage !== "undefined" ? localStorage.getItem("ihsg_supa_url") : null;
  const k = typeof localStorage !== "undefined" ? localStorage.getItem("ihsg_supa_key") : null;
  if(u && k) return {url:u.replace(/\/$/,"")+(u.includes("/rest/v1")?"":"/rest/v1"), headers:{apikey:k,Authorization:"Bearer "+k,"Content-Type":"application/json"}};
  return null;
}
function qhTradingDaysBack(n){
  try{ if(typeof tradingDaysBack==="function") return tradingDaysBack(n); }catch(e){}
  const days=[]; let d=new Date();
  while(days.length<n){ d.setDate(d.getDate()-1); const dow=d.getDay(); if(dow!==0&&dow!==6) days.push(d.toISOString().slice(0,10)); }
  return days.reverse();
}

/* ==========================================
   STYLE QUANT HUB — gradasi biru tipis, disuntik langsung dari file ini
   (tidak bergantung ke quant-hub.css eksternal yang bisa saja belum
   lengkap/ketinggalan). Semua selector di-scope di bawah #qhPage supaya
   TIDAK bocor ke tab lain di aplikasi utama. Palet sengaja kontras kuat
   (teks navy tua di atas gradasi biru sangat muda) supaya kebalik dari
   sebelumnya (teks abu-abu di atas kotak abu-abu yang nyaris tak
   terbaca, lihat kartu Bandarmology yang datanya sempat kosong/rusak).
   ========================================== */
const QH_STYLE_ID = "qhInjectedStyles";
function qhInjectStyles(){
  if(document.getElementById(QH_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = QH_STYLE_ID;
  style.textContent = `
#qhPage{
  --qh-bg1:#eaf1fc; --qh-bg2:#f8fbff; --qh-card1:#ffffff; --qh-card2:#eaf2fe;
  --qh-border:#d3e3fb; --qh-text:#132a4d; --qh-soft:#5c7396; --qh-accent:#2563eb;
  --qh-up:#16a34a; --qh-down:#dc2626; --qh-gold:#b98900;
  background:linear-gradient(180deg,var(--qh-bg1) 0%,var(--qh-bg2) 55%,#ffffff 100%);
  min-height:100%; padding-bottom:40px;
}
#qhPage, #qhPage *{ color:var(--qh-text); }
#qhPage .qh-topbar{ display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:8px; }
#qhPage .qh-page-title{ font-size:19px; font-weight:800; letter-spacing:.04em; color:var(--qh-text); }
#qhPage .qh-topbtns{ display:flex; gap:8px; }
#qhPage .qh-badge{ background:linear-gradient(135deg,var(--qh-card1),var(--qh-card2)); border:1px solid var(--qh-border); color:var(--qh-accent); border-radius:20px; padding:2px 10px; font-size:11px; font-weight:700; }

#qhPage .qh-subtabs{ display:flex; gap:8px; flex-wrap:wrap; margin:14px 0; }
#qhPage .qh-subtab{ background:linear-gradient(135deg,var(--qh-card1),var(--qh-card2)); border:1px solid var(--qh-border); color:var(--qh-soft); border-radius:8px; padding:8px 14px; font-weight:700; font-size:12.5px; cursor:pointer; }
#qhPage .qh-subtab.active{ background:linear-gradient(135deg,#3b82f6,#2563eb); border-color:#2563eb; }
#qhPage .qh-subtab.active, #qhPage .qh-subtab.active *{ color:#ffffff; }
#qhPage .qh-subtab.small{ padding:5px 10px; font-size:11px; }
#qhPage .qh-subtabs.small{ margin:0 0 12px; }

#qhPage .qh-metric-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:16px; }
#qhPage .qh-metric{ background:linear-gradient(135deg,var(--qh-card1) 0%,var(--qh-card2) 100%); border:1px solid var(--qh-border); border-radius:12px; padding:14px 16px; cursor:pointer; box-shadow:0 1px 3px rgba(37,99,235,.06); }
#qhPage .qh-lbl{ font-size:10.5px; font-weight:700; letter-spacing:.05em; color:var(--qh-soft) !important; }
#qhPage .qh-val{ font-size:22px; font-weight:800; color:var(--qh-text); margin:4px 0 2px; display:block; }
#qhPage .qh-hint{ font-size:11px; color:var(--qh-soft) !important; }
#qhPage .qh-metric.tone-up .qh-val{ color:var(--qh-up) !important; }
#qhPage .qh-metric.tone-down .qh-val{ color:var(--qh-down) !important; }
#qhPage .qh-metric.tone-gold .qh-val{ color:var(--qh-gold) !important; }
#qhPage .qh-metric.tone-teal .qh-val{ color:var(--qh-accent) !important; }

#qhPage .qh-ihsg-panel, #qhPage .qh-tape-box, #qhPage .panel{ background:linear-gradient(135deg,var(--qh-card1),var(--qh-card2)); border:1px solid var(--qh-border); border-radius:12px; padding:14px; margin-bottom:14px; }
#qhPage .qh-ihsg-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px; }
#qhPage .qh-ihsg-title{ font-weight:800; font-size:12.5px; display:flex; align-items:center; gap:8px; }
#qhPage .qh-dot{ width:8px;height:8px;border-radius:50%;background:var(--qh-up); display:inline-block; }
#qhPage .qh-market-status{ font-size:11px; font-weight:800; padding:4px 10px; border-radius:8px; background:var(--qh-down); text-align:center; line-height:1.3; }
#qhPage .qh-market-status, #qhPage .qh-market-status *{ color:#ffffff !important; }
#qhPage .qh-market-status.open{ background:var(--qh-up); }
#qhPage .qh-tv-box{ border-radius:10px; overflow:hidden; }

#qhPage .qh-searchbar{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:10px; }
#qhPage .qh-input{ background:#ffffff; border:1px solid var(--qh-border); border-radius:8px; padding:8px 10px; font-size:12px; color:var(--qh-text); }
#qhPage .qh-input::placeholder{ color:#93a9c9; }
#qhPage select.qh-input{ text-transform:none; }
#qhPage .qh-count{ font-size:11px; color:var(--qh-soft) !important; }
#qhPage .qh-minibtn{ background:linear-gradient(135deg,var(--qh-card1),var(--qh-card2)); border:1px solid var(--qh-border); border-radius:7px; padding:6px 12px; font-size:11.5px; font-weight:700; cursor:pointer; }
#qhPage .qh-minibtn, #qhPage .qh-minibtn *{ color:var(--qh-accent) !important; }
#qhPage .qh-minibtn.danger, #qhPage .qh-minibtn.danger *{ color:var(--qh-down) !important; border-color:#fecaca; }

#qhPage .qh-section-title{ font-size:12px; font-weight:800; letter-spacing:.04em; margin:18px 0 10px; display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; }
#qhPage .qh-section-title small{ font-weight:500; color:var(--qh-soft) !important; font-size:10.5px; }

#qhPage .qh-us-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; }
#qhPage .qh-us-card{ background:linear-gradient(135deg,var(--qh-card1),var(--qh-card2)); border:1px solid var(--qh-border); border-radius:12px; padding:14px; cursor:pointer; }
#qhPage .qh-us-card:hover{ border-color:var(--qh-accent); }
#qhPage .qh-us-rank{ font-size:10px; font-weight:700; color:var(--qh-soft) !important; margin-bottom:4px; }
#qhPage .qh-us-ticker{ font-size:16px; font-weight:800; }
#qhPage .qh-us-name{ font-size:11px; color:var(--qh-soft) !important; margin-bottom:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
#qhPage .qh-us-score{ font-size:26px; font-weight:800; color:var(--qh-gold); }
#qhPage .qh-us-mini{ display:flex; gap:10px; flex-wrap:wrap; font-size:10.5px; color:var(--qh-soft); margin:8px 0; }
#qhPage .qh-us-mini span{ color:var(--qh-soft) !important; }
#qhPage .qh-us-mini b{ color:var(--qh-text); }

#qhPage .qh-chips{ display:flex; gap:6px; flex-wrap:wrap; margin:6px 0; }
#qhPage .qh-chip{ font-size:9.5px; font-weight:700; padding:3px 8px; border-radius:20px; background:#eef2ff; border:1px solid #dbe4ff; }
#qhPage .qh-chip, #qhPage .qh-chip *{ color:var(--qh-accent) !important; }
#qhPage .qh-chip.g{ background:#ecfdf3; border-color:#bbf1cf; }
#qhPage .qh-chip.g, #qhPage .qh-chip.g *{ color:var(--qh-up) !important; }
#qhPage .qh-chip.r{ background:#fef2f2; border-color:#fecaca; }
#qhPage .qh-chip.r, #qhPage .qh-chip.r *{ color:var(--qh-down) !important; }
#qhPage .qh-upside{ display:flex; justify-content:space-between; font-size:11px; color:var(--qh-soft); border-top:1px dashed var(--qh-border); padding-top:8px; margin-top:4px; }
#qhPage .qh-upside span{ color:var(--qh-soft) !important; }
#qhPage .qh-upside b{ color:var(--qh-text); }

#qhPage .qh-info-note{ font-size:11px; color:var(--qh-soft) !important; background:linear-gradient(135deg,var(--qh-card2),var(--qh-card1)); border:1px dashed var(--qh-border); border-radius:8px; padding:10px 12px; margin-top:12px; }

#qhPage .qh-grid-2{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media (max-width:860px){ #qhPage .qh-grid-2{ grid-template-columns:1fr; } }
#qhPage .qh-cand-list{ display:flex; flex-direction:column; gap:8px; }
#qhPage .qh-cand-row{ display:flex; align-items:center; gap:12px; background:linear-gradient(135deg,var(--qh-card1),var(--qh-card2)); border:1px solid var(--qh-border); border-radius:10px; padding:10px 14px; cursor:pointer; }
#qhPage .qh-cand-row:hover{ border-color:var(--qh-accent); }
#qhPage .qh-cand-rank{ flex:0 0 auto; width:22px; height:22px; border-radius:6px; background:#eef2ff; color:var(--qh-accent) !important; font-weight:800; font-size:11px; display:flex; align-items:center; justify-content:center; }
#qhPage .qh-cand-id{ flex:1 1 auto; min-width:0; }
#qhPage .qh-cand-ticker{ font-weight:800; font-size:13px; }
#qhPage .qh-cand-name{ font-size:10.5px; color:var(--qh-soft) !important; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
#qhPage .qh-cand-row .qh-chips{ flex:1 1 auto; margin:0; }
#qhPage .qh-cand-price{ flex:0 0 auto; text-align:right; font-size:12px; font-weight:700; min-width:76px; }
#qhPage .qh-cand-score{ flex:0 0 auto; text-align:center; min-width:44px; }
#qhPage .qh-cand-score b{ display:block; font-size:15px; color:var(--qh-gold); }
#qhPage .qh-cand-score small{ font-size:8.5px; color:var(--qh-soft) !important; }
#qhPage .qh-empty{ font-size:12px; color:var(--qh-soft) !important; padding:16px; text-align:center; }

#qhPage .qh-net-pos{ color:var(--qh-up) !important; }
#qhPage .qh-net-neg{ color:var(--qh-down) !important; }

#qhPage .qh-toolbar{ display:flex; gap:14px; flex-wrap:wrap; align-items:flex-end; margin-bottom:10px; }
#qhPage .qh-toolbar .field label{ display:block; font-size:9.5px; font-weight:700; color:var(--qh-soft) !important; margin-bottom:4px; }
#qhPage .btn{ border-radius:8px; padding:8px 14px; font-size:12px; font-weight:700; cursor:pointer; border:1px solid var(--qh-border); text-decoration:none; display:inline-block; }
#qhPage .btn-primary{ background:linear-gradient(135deg,#3b82f6,#2563eb); border-color:#2563eb; }
#qhPage .btn-primary, #qhPage .btn-primary *{ color:#ffffff !important; }
#qhPage .btn-tradingview{ background:#131722; border-color:#131722; }
#qhPage .btn-tradingview, #qhPage .btn-tradingview *{ color:#ffffff !important; }
#qhPage .btn-stockbit{ background:#00baf2; border-color:#00baf2; }
#qhPage .btn-stockbit, #qhPage .btn-stockbit *{ color:#ffffff !important; }
#qhPage .qh-code-chip{ background:#ffffff; border:1px solid var(--qh-border); border-radius:16px; padding:4px 10px; font-size:11px; font-weight:700; cursor:pointer; margin:2px; }
#qhPage .qh-code-chip.active{ background:linear-gradient(135deg,#3b82f6,#2563eb); border-color:#2563eb; }
#qhPage .qh-code-chip.active, #qhPage .qh-code-chip.active *{ color:#ffffff !important; }
#qhPage .qh-group-lbl{ font-size:10px; color:var(--qh-soft) !important; margin-right:6px; font-weight:700; }
#qhPage .qh-broker-quick{ margin-bottom:8px; }

#qhPage .qh-stat-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; margin:10px 0; }
#qhPage .qh-stat{ background:linear-gradient(135deg,var(--qh-card1),var(--qh-card2)); border:1px solid var(--qh-border); border-radius:10px; padding:10px 12px; }
#qhPage .qh-weight-list{ display:flex; flex-direction:column; gap:6px; }
#qhPage .qh-weight-row{ display:flex; align-items:center; gap:10px; cursor:pointer; padding:6px 4px; }
#qhPage .qh-weight-tk{ flex:0 0 90px; font-weight:700; font-size:12px; }
#qhPage .qh-weight-track{ flex:1 1 auto; height:8px; background:#eef2ff; border-radius:6px; overflow:hidden; }
#qhPage .qh-weight-fill{ height:100%; border-radius:6px; }
#qhPage .qh-weight-fill.buy{ background:var(--qh-up); }
#qhPage .qh-weight-fill.sell{ background:var(--qh-down); }
#qhPage .qh-weight-net{ flex:0 0 90px; text-align:right; font-size:12px; font-weight:700; }
#qhPage .qh-acc-badge{ color:var(--qh-down) !important; font-weight:800; }
#qhPage .qh-dis-badge{ color:var(--qh-up) !important; font-weight:800; }

#qhPage table{ width:100%; border-collapse:collapse; font-size:12px; }
#qhPage thead th{ text-align:left; font-size:10px; color:var(--qh-soft) !important; font-weight:800; padding:8px; border-bottom:1px solid var(--qh-border); }
#qhPage tbody td{ padding:8px; border-bottom:1px solid #eef2fb; }
#qhPage .mono{ font-family:'JetBrains Mono',monospace; }
#qhPage .ticker-link{ background:none; border:none; color:var(--qh-accent) !important; font-weight:800; cursor:pointer; padding:0; }
#qhPage .empty-box{ text-align:center; padding:20px; color:var(--qh-soft) !important; font-size:12px; }
#qhPage .table-wrap{ border-radius:10px; overflow:auto; }

#qhPage .qh-status-badge{ font-size:9.5px; font-weight:800; padding:3px 8px; border-radius:14px; }
#qhPage .qh-st-uv{ background:#ecfdf3; }
#qhPage .qh-st-uv, #qhPage .qh-st-uv *{ color:var(--qh-up) !important; }
#qhPage .qh-st-danger{ background:#fef2f2; }
#qhPage .qh-st-danger, #qhPage .qh-st-danger *{ color:var(--qh-down) !important; }
#qhPage .qh-st-fair{ background:#fff7ed; }
#qhPage .qh-st-fair, #qhPage .qh-st-fair *{ color:var(--qh-gold) !important; }

#qhPage .qh-pnl-total{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; background:linear-gradient(135deg,var(--qh-card1),var(--qh-card2)); border:1px solid var(--qh-border); border-radius:12px; padding:14px 16px; margin-bottom:14px; }
#qhPage .qh-big{ font-size:22px; font-weight:800; }
#qhPage .qh-table-note{ font-size:10.5px; color:var(--qh-soft) !important; }

#qhPage .qh-loading, #qhPage .qh-error{ padding:16px; text-align:center; font-size:12.5px; }
#qhPage .qh-loading{ color:var(--qh-soft) !important; }
#qhPage .qh-error{ color:var(--qh-down) !important; }

#qhPage .qh-modal-overlay{ position:fixed; inset:0; background:rgba(15,32,64,.45); display:flex; align-items:center; justify-content:center; z-index:999; padding:16px; }
#qhPage .qh-modal{ background:linear-gradient(160deg,#ffffff,#eaf2fe); border:1px solid var(--qh-border); border-radius:16px; padding:20px; max-width:440px; width:100%; max-height:88vh; overflow:auto; }
#qhPage .qh-modal-head{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
#qhPage .qh-modal-price{ display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:10px; }
#qhPage .qh-modal-big{ font-size:24px; font-weight:800; }
#qhPage .qh-detail-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:14px; }
#qhPage .qh-stat .qh-val{ font-size:15px !important; }
#qhPage .qh-modal-actions{ display:flex; gap:8px; flex-wrap:wrap; }
  `;
  document.head.appendChild(style);
}

/* ───────────── ULTIMATE SCORE (formula transparan sendiri) ─────────────
   0-100 = Fundamental (50) + Valuasi (25) + Momentum teknikal (25).
   Semua komponen bisa diaudit; tidak meniru formula ihsgscreener.      */
function qhUltimateScore(s){
  const per=qhN(s.per), pbv=qhN(s.pbv), roe=qhN(s.roe), der=qhN(s.der),
        npm=qhN(s.npm), cr=qhN(s.currentRatio), dy=qhN(s.divYield),
        eps=qhN(s.eps), rsi=qhN(s.rsi14), price=qhN(s.cClose);
  const clamp01 = x => Math.max(0, Math.min(1, x));

  // — Fundamental 50 —
  let fRoe = roe!=null ? Math.round(12*clamp01((roe-5)/20)) : 0;          // ROE 5→0, 25+→12
  let fNpm = npm!=null ? Math.round(8*clamp01(npm/20)) : 0;               // NPM 20%+ full
  let fDer = der!=null ? Math.round(10*clamp01((1.2-der)/1.2)) : 5;       // DER 0→10, >=1.2→0; tanpa data netral 5
  let fCr  = cr!=null ? Math.round(5*clamp01((cr-1.0)/0.5)) : 2;          // CR >=1.5 full
  let fDy  = dy!=null ? Math.round(5*clamp01((dy-1)/3)) : 0;              // Div yield 4%+ full
  let fCons= (eps!=null && eps>0 ? 5 : 0) + (String(s.valuasi||"").match(/murah|undervalued/i) ? 5 : 0);
  const fund = fRoe+fNpm+fDer+fCr+fDy+fCons;

  // — Valuasi 25 —
  const vPer = per!=null && per>0 ? Math.round(15*clamp01((30-per)/25)) : 0; // PER<=5 full, >=30 zero
  const vPbv = pbv!=null && pbv>0 ? Math.round(10*clamp01((3-pbv)/2.5)) : 0; // PBV<=0.5 full
  const val  = vPer+vPbv;

  // — Momentum 25 —
  const ma50=qhN(s.ma50), ma200=qhN(s.ma200);
  const mMa50 = price!=null && ma50!=null ? (price>ma50?8:0) : 0;
  const mMa200= price!=null && ma200!=null ? (price>ma200?7:0) : 0;
  const mRsi  = rsi!=null && rsi>=40 && rsi<=70 ? 5 : (rsi!=null&&rsi>70?2:0);
  const mTrend= String(s.trendHarga||"").toLowerCase().startsWith("bullish") ? 5 : 0;
  const mom   = mMa50+mMa200+mRsi+mTrend;

  const total = Math.max(0, Math.min(100, fund+val+mom));
  let grade="Biasa", tone="muted";
  if(total>=75){ grade="Potensi Besar"; tone="up"; }
  else if(total>=60){ grade="Menarik"; tone="gold"; }
  else if(total<40){ grade="Lemah"; tone="down"; }

  const badges=[];
  if(per!=null && per<10 && per>0) badges.push({t:"PER<10",c:"g"});
  if(roe!=null && roe>15) badges.push({t:"ROE>15%",c:"g"});
  if(der!=null && der<1) badges.push({t:"DER<1",c:"g"});
  if(pbv!=null && pbv<1 && pbv>0) badges.push({t:"PBV<1",c:"g"});
  if(per!=null && per>30) badges.push({t:"PER>30",c:"r"});
  if(der!=null && der>1.5) badges.push({t:"DER>1.5",c:"r"});

  // Est. upside — fair value sederhana & transparan
  let upsidePct=null, fairPrice=null, method=null;
  if(per!=null && per>0 && roe!=null){
    const fairPer = Math.max(5, Math.min(20, roe*0.8));
    fairPrice = price!=null ? price*(fairPer/per) : null;
    method="PER";
  } else if(pbv!=null && pbv>0 && roe!=null){
    const fairPbv = Math.max(0.4, Math.min(2.5, roe/10*1.2));
    fairPrice = price!=null ? price*(fairPbv/pbv) : null;
    method="PBV";
  }
  if(fairPrice!=null && price) upsidePct = Math.round((fairPrice/price-1)*100);

  return { total, grade, tone, fund, val, mom,
    detail:{fRoe,fNpm,fDer,fCr,fDy,fCons,vPer,vPbv,mMa50,mMa200,mRsi,mTrend},
    badges, upsidePct, fairPrice, method };
}
function qhStatusBadge(s, pnl){
  const v = String(s.valuasi||"");
  if(/murah|undervalued/i.test(v)) return {t:"UV",c:"qh-st-uv"};
  if(/over|mahal/i.test(v)){
    if((pnl!=null&&pnl<-15) || (qhN(s.rsi14)!=null&&qhN(s.rsi14)>75)) return {t:"DANGER",c:"qh-st-danger"};
    return {t:"OV",c:"qh-st-danger"};
  }
  if(/wajar|fair/i.test(v)) return {t:"FAIR",c:"qh-st-fair"};
  if(pnl!=null && pnl>=15) return {t:"PROFIT",c:"qh-st-uv"};
  if(pnl!=null && pnl<=-10) return {t:"DANGER",c:"qh-st-danger"};
  return {t:"NEUTRAL",c:"qh-st-fair"};
}

/* ───────────── ARA CANDIDATE & SWING BIG CAP ───────────── */
function qhAraCandidates(stocks){
  return stocks.map(s=>{
    const price=qhN(s.cClose), chg=qhN(s.changePct), vr=qhN(s.volRatio)||0,
          fn1=qhN(s.foreignNet1D)||0, cap=qhN(s.marketCap),
          offer=qhN(s.offer), offVol=qhN(s.offerVolume);
    if(price==null||chg==null) return null;
    const isSmallMid = cap==null ? true : cap < 5e12;
    if(!isSmallMid) return null;
    const closeHigh = s.cHigh!=null && price >= s.cHigh*0.99;
    const offKosong = offer==null || offVol===0;
    const offThin   = offKosong || (offer!=null && offer >= price*1.03);
    const notYet    = chg < qhAraLimit(price)-3;
    if(!closeHigh || !offThin || !notYet) return null;
    let score = 0;
    score += closeHigh ? 30 : 0;
    score += Math.round(25*Math.min(1, vr/2));
    score += fn1>0 ? 25 : (fn1<0 ? 0 : 10);
    score += offKosong ? 20 : 10;
    if(String(s.cekHarga||"").includes("crossup")) score += 0; // info saja
    return {
      ticker:s.ticker, name:s.name, price, chg, vr,
      off: offKosong ? "OFF" : qhCompact(offer), offKosong,
      bigBuy: fn1>0, bigBuyVal: fn1, volVal: qhN(s.turnover),
      cap, sektor:s.sektor, score: Math.min(100,score),
      arah: 1
    };
  }).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,10);
}
function qhSwingBigCap(stocks){
  return stocks.map(s=>{
    const price=qhN(s.cClose), fn1=qhN(s.foreignNet1D), fud=qhN(s.foreignUpDays),
          ma21=qhN(s.ma21), ma50=qhN(s.ma50), cap=qhN(s.marketCap),
          chg=qhN(s.changePct);
    if(price==null) return null;
    const isBig = cap!=null ? cap>=10e12 : String(s.capCategory||"").match(/mega|large/i)!=null;
    if(!isBig) return null;
    const forBuy = fn1!=null && fn1>0;
    const konsisten = fud!=null && fud>=2;
    if(!forBuy) return null;
    let score = 50;
    score += konsisten ? 20 : 8;
    if(ma21!=null && price>ma21) score += 10;
    if(ma50!=null && price>ma50) score += 10;
    if(chg!=null && chg>0) score += 10;
    return { ticker:s.ticker, name:s.name, price, chg:chg||0, fn1, fud:fud||0,
      volVal:qhN(s.turnover), sektor:s.sektor, score:Math.min(100,score) };
  }).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,10);
}

/* ───────────── BROKER STALKER (dari tabel broker_summary) ───────────── */
async function qhFetchLatestDate(){
  const c = qhSupa(); if(!c) throw new Error("Koneksi Supabase belum diatur.");
  const res = await fetch(c.url+"/broker_summary?select=trade_date&order=trade_date.desc&limit=1", {headers:c.headers});
  if(!res.ok) throw new Error("Gagal baca broker_summary: HTTP "+res.status);
  const rows = await res.json();
  return rows && rows[0] ? rows[0].trade_date : null;
}
async function qhFetchBrokerRows(days){
  const c = qhSupa(); if(!c) throw new Error("Koneksi Supabase belum diatur.");
  const latest = await qhFetchLatestDate();
  if(!latest) return {latest:null, rows:[]};
  const cut = new Date(latest+"T00:00:00"); cut.setDate(cut.getDate() - Math.ceil(days*1.7));
  const from = cut.toISOString().slice(0,10);
  let all=[], offset=0, page=5000;
  while(true){
    const qs = new URLSearchParams({select:"stock_code,trade_date,side,broker_code,value_idr",
      trade_date:"gte."+from, order:"trade_date.asc", limit:String(page), offset:String(offset)});
    const res = await fetch(c.url+"/broker_summary?"+qs, {headers:c.headers});
    if(!res.ok) throw new Error("Gagal baca broker_summary: HTTP "+res.status);
    const rows = await res.json();
    all = all.concat(rows);
    if(rows.length < page || all.length >= 60000) break;
    offset += page;
  }
  return {latest, rows:all};
}
function qhAggregateByStock(rows, code){
  const m={};
  rows.forEach(r=>{
    if(String(r.broker_code||"").toUpperCase()!==code) return;
    const t=m[r.stock_code] ||= {ticker:r.stock_code, buyVal:0, sellVal:0};
    if(r.side==="buy") t.buyVal += Number(r.value_idr)||0;
    else t.sellVal += Number(r.value_idr)||0;
  });
  return Object.values(m).map(t=>{
    const net=t.buyVal-t.sellVal, tot=t.buyVal+t.sellVal;
    return {...t, net, tot, share: tot>0 ? Math.round(net/tot*100) : 0,
      status: net>0 && tot>0 && t.buyVal/tot>=0.55 ? "ACC" : (net<0 && tot>0 && t.sellVal/tot>=0.55 ? "DIS" : "NET")};
  });
}
function qhAggregateByBroker(rows, ticker){
  const m={};
  rows.forEach(r=>{
    if(r.stock_code!==ticker) return;
    const b=m[r.broker_code] ||= {code:r.broker_code, buyVal:0, sellVal:0, days:new Set()};
    b.days.add(r.trade_date);
    if(r.side==="buy") b.buyVal += Number(r.value_idr)||0;
    else b.sellVal += Number(r.value_idr)||0;
  });
  return Object.values(m).map(b=>({...b, net:b.buyVal-b.sellVal}))
    .sort((a,b)=>b.net-a.net);
}
function qhBrokerDirectory(rows){
  const m={};
  rows.forEach(r=>{
    const b=m[r.broker_code] ||= {code:r.broker_code, val:0, buy:0, sell:0};
    b.val += Number(r.value_idr)||0;
    if(r.side==="buy") b.buy+=Number(r.value_idr)||0; else b.sell+=Number(r.value_idr)||0;
  });
  const list = Object.values(m).sort((a,b)=>b.val-a.val);
  const asing = list.filter(b=>QH_FOREIGN.has(b.code)).slice(0,9);
  const lokal = list.filter(b=>!QH_FOREIGN.has(b.code)).slice(0,11);
  return {asing, lokal};
}
async function qhLoadBroker(){
  if(QH.bdLoading) return;
  const days = {today:1, "1w":5, "1m":22, "3m":66}[QH.bdPeriod] ?? 22;
  QH.bdLoading=true; QH.bdError=null; QH.bdRangeDays=days; QH.qhRenderSafe();
  try{
    const {latest, rows} = await qhFetchBrokerRows(days);
    QH.bdRaw=rows; QH.bdLatestDate=latest;
    if(!rows.length) QH.bdError="Tidak ada baris broker_summary di rentang ini (cek tanggal terakhir sync).";
  }catch(e){ QH.bdError=e.message; QH.bdRaw=null; }
  QH.bdLoading=false; QH.qhRenderSafe();
}

/* ───────────── BPJS — Beli Pagi, Jual Sore (tabel sesi_snapshots) ─────────────
   Beda dengan broker_summary/flows (EOD, 1x/hari), tabel ini diisi INTRADAY
   2x/hari oleh script snapshot-sesi.mjs (mode "pagi" ~09:05 WIB & "sore"
   ~15:45 WIB) — lihat 08_sesi_snapshots.sql. Dibaca langsung lewat qhSupa()
   (fallback yang sama dipakai qhFetchBrokerRows), TIDAK lewat state.stocks. */
function qhTodayWIB(){
  try{ return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()); }
  catch(e){ return new Date().toISOString().slice(0,10); }
}
async function qhFetchBpjsRows(){
  const supa = qhSupa();
  if(!supa) throw new Error("Supabase belum dikonfigurasi (buka Pengaturan di aplikasi utama dulu).");
  const date = qhTodayWIB();
  const qs = `trade_date=eq.${date}&select=ticker,trade_date,harga_pagi,volume_pagi,captured_pagi_at,harga_sore,volume_sore,captured_sore_at,return_pct&order=return_pct.desc.nullslast`;
  const res = await fetch(`${supa.url}/sesi_snapshots?${qs}`, {headers:supa.headers, cache:"no-store"});
  if(!res.ok){
    let msg=`HTTP ${res.status}`;
    try{ const body=await res.json(); if(body && body.message) msg+=" — "+body.message; }catch(e){}
    // Pesan ramah kalau tabelnya belum ada sama sekali (migrasi belum dijalankan)
    if(res.status===404 || /relation .* does not exist/i.test(msg)) msg="Tabel sesi_snapshots belum ada — jalankan migrasi 08_sesi_snapshots.sql dulu.";
    throw new Error(msg);
  }
  return {date, rows: await res.json()};
}
async function qhLoadBpjs(){
  if(QH.bpjsLoading) return;
  QH.bpjsLoading=true; QH.bpjsError=null; QH.qhRenderSafe();
  try{
    const {rows} = await qhFetchBpjsRows();
    QH.bpjsRows=rows;
    if(!rows.length) QH.bpjsError="Belum ada snapshot untuk hari ini. Jalankan `node snapshot-sesi.mjs pagi` (pagi) atau tunggu cron jalan.";
  }catch(e){ QH.bpjsError=e.message; QH.bpjsRows=[]; }
  QH.bpjsLoading=false; QH.qhRenderSafe();
}

/* ───────────── SNAPSHOT SEKARANG (tombol) ─────────────
   Alternatif snapshot-sesi.mjs: tarik harga live Watchlist lewat
   fetchStockbitLiveBulk() milik app.js (token + proxy CORS-nya sudah
   ada), lalu upsert ke sesi_snapshots — semua dari browser, tanpa
   laptop/cron menyala di jam tertentu. */
async function qhSnapshotSesiNow(mode){
  if(QH.snapLoading) return;
  if(typeof fetchStockbitLiveBulk !== "function"){
    QH.snapError="fetchStockbitLiveBulk() tidak ditemukan — pastikan quant-hub.js dimuat SETELAH app.js.";
    QH.qhRenderSafe(); return;
  }
  let tickers=[];
  try{ tickers=[...(state.watchlist||[])]; }catch(e){}
  if(!tickers.length){
    QH.snapError="Watchlist kosong — tandai saham dengan ⭐ di tab Screener dulu (itu sumber ticker utk tombol ini).";
    QH.qhRenderSafe(); return;
  }
  const supa = qhSupa();
  if(!supa){ QH.snapError="Supabase belum dikonfigurasi."; QH.qhRenderSafe(); return; }
  if(!state.stockbitToken){ QH.snapError="Token Stockbit belum diisi (buka Pengaturan di aplikasi utama)."; QH.qhRenderSafe(); return; }

  QH.snapLoading=true; QH.snapError=null; QH.snapLastResult=null; QH.qhRenderSafe();
  try{
    await fetchStockbitLiveBulk(tickers); // isi state.stockbitLive[ticker].mapped, ~350ms/ticker
    const tradeDate = qhTodayWIB();
    const capturedAt = new Date().toISOString();
    const rows=[]; let failed=0;
    for(const t of tickers){
      const live = state.stockbitLive && state.stockbitLive[t];
      const price = live && live.mapped ? qhN(live.mapped.last) : null;
      const vol = live && live.mapped ? qhN(live.mapped.volume) : null;
      if(price==null){ failed++; continue; } // jangan tulis NULL nimpa data lama
      const row = {ticker:t, trade_date:tradeDate};
      if(mode==="pagi"){ row.harga_pagi=price; row.volume_pagi=vol; row.captured_pagi_at=capturedAt; }
      else { row.harga_sore=price; row.volume_sore=vol; row.captured_sore_at=capturedAt; }
      rows.push(row);
    }
    if(rows.length){
      await supaFetch(`${supa.url}/sesi_snapshots?on_conflict=ticker,trade_date`, {
        method:"POST", headers:{...supa.headers, "Prefer":"resolution=merge-duplicates"},
        body: JSON.stringify(rows)
      });
    }
    QH.snapLastResult = {mode, ok:rows.length, failed, total:tickers.length, at:capturedAt};
    QH.bpjsRows=null; // paksa tabel BPJS reload dari data terbaru
    await qhLoadBpjs();
  }catch(e){ QH.snapError=e.message; }
  QH.snapLoading=false; QH.qhRenderSafe();
}

/* ───────────── FAVORIT P&L (localStorage) ───────────── */
function qhLoadEntries(){ try{ return JSON.parse((typeof localStorage !== "undefined" && localStorage.getItem(QH_LS_ENTRY))||"{}"); }catch(e){ return {}; } }
function qhSaveEntry(ticker, price){
  const e=qhLoadEntries(); e[ticker]={price, date:new Date().toISOString().slice(0,10)};
  if(typeof localStorage!=="undefined") localStorage.setItem(QH_LS_ENTRY, JSON.stringify(e)); QH.qhRenderSafe();
}
function qhClearEntry(ticker){ const e=qhLoadEntries(); delete e[ticker]; if(typeof localStorage!=="undefined") localStorage.setItem(QH_LS_ENTRY, JSON.stringify(e)); QH.qhRenderSafe(); }

/* ─────────────────────────── RENDER ─────────────────────────── */
QH.qhRenderSafe = function(){
  const page = document.getElementById("qhPage");
  if(!page || !QH.open) return;
  try{ QH.render(); }catch(e){
    page.innerHTML = '<div class="qh-error">Quant Hub error: '+qhEsc(e.message)+'</div>';
  }
};

QH.render = function(){
  const page = document.getElementById("qhPage");
  const stocks = qhStocks();
  const tabs = [
    ["dashboard","◧ Dashboard"],["bandar","🔥 Bandarmology"],
    ["broker","◉ Broker Stalker"],["bpjs","🌅 BPJS"],["bsjp","🌆 BSJP"],["fav","◈ Favorit P&L"],
    ["info","📖 Info"]
  ];
  let html = `
  <div class="qh-topbar">
    <div class="qh-page-title">QUANT HUB <span class="qh-badge">● ${stocks.length? stocks.length+" emiten":"memuat…"}</span></div>
    <div class="qh-topbtns">
      <button class="qh-minibtn" onclick="qhRefresh()">${stocks.length?"↻ Refresh tampilan":"↻ Tunggu data…"}</button>
      <button class="qh-minibtn danger" onclick="qhClose()">✕ Tutup Quant Hub</button>
    </div>
  </div>
  <div class="qh-subtabs">
    ${tabs.map(([id,l])=>`<button class="qh-subtab ${QH.subtab===id?"active":""}" onclick="qhSetTab('${id}')">${l}</button>`).join("")}
  </div>
  <div id="qhBody">${ (!stocks.length && QH.subtab!=="info")
      ? '<div class="qh-loading">⏳ Menunggu data stocks_screener dari Supabase… (buka dulu tab Screener di aplikasi bila perlu)</div>'
      : (
    QH.subtab==="dashboard" ? QH.renderDashboard(stocks) :
    QH.subtab==="bandar"    ? QH.renderBandar(stocks) :
    QH.subtab==="broker"    ? QH.renderBroker(stocks) :
    QH.subtab==="bpjs"      ? QH.renderBpjs(stocks) :
    QH.subtab==="bsjp"      ? QH.renderBsjpEmbed() :
    QH.subtab==="info"      ? QH.renderInfo() :
                              QH.renderFav(stocks)
  )}</div>
  ${QH.modalTicker ? QH.modalHtml(stocks.find(s=>s.ticker===QH.modalTicker)) : ""}`;
  page.innerHTML = html;
  if(QH.subtab==="dashboard" && stocks.length){
    QH.mountTradingView();
    window.qhSearchDash && null;
  }
  // BSJP (2026-09, dipindah dari tab utama app.js ke Quant Hub -- lihat
  // QH.renderBsjpEmbed): reuse langsung renderBsjp() global dari app.js
  // (BUKAN duplikat engine-nya), lalu panggil attachContentEvents() global
  // supaya semua tombol/preset di dalamnya (yang di-wire lewat
  // document.getElementById/querySelectorAll, bukan onclick inline) tetap
  // berfungsi walau markup-nya sekarang ada di #qhPage, bukan #content.
  if(QH.subtab==="bsjp" && typeof attachContentEvents==="function"){
    try{ attachContentEvents(); }catch(e){ console.error("BSJP attachContentEvents:", e); }
  }
  // BPJS: lazy-load sekali saat tab dibuka pertama kali (bukan tiap render,
  // supaya tidak spam request tiap auto-refresh 5 detik dari state.stocks).
  if(QH.subtab==="bpjs" && QH.bpjsRows===null && !QH.bpjsLoading){
    qhLoadBpjs();
  }
};

/* ---------- DASHBOARD ---------- */
QH.renderDashboard = function(stocks){
  const scored = stocks.map(s=>({s, u:qhUltimateScore(s)}));
  const avg = scored.length ? Math.round(scored.reduce((a,x)=>a+x.u.total,0)/scored.length) : 0;
  const under = scored.filter(x=>/murah|undervalued/i.test(x.s.valuasi||"")).length;
  const fair  = scored.filter(x=>/wajar|fair/i.test(x.s.valuasi||"")).length;
  const danger= scored.filter(x=>{
    const r=qhN(x.s.rsi14), r5=qhN(x.s.rsi7), r21=qhN(x.s.rsi21);
    return /over|mahal/i.test(x.s.valuasi||"") || (r!=null&&r>75) || (r5!=null&&r5>80) || (r21!=null&&r21>75);
  }).length;
  const top = [...scored].sort((a,b)=>b.u.total-a.u.total)[0];
  const volTotal = stocks.reduce((a,s)=>a+(qhN(s.cVol)||0),0);

  const metrics = [
    ["TOTAL SAHAM", stocks.length, "-", "klik lihat semua","tone-teal"],
    ["UNDERVALUE (UV)", under, "-", "valuasi murah","tone-up"],
    ["SCORE RATA-RATA", avg, "-", "Ultimate Score","tone-gold"],
    ["DANGER ZONE", danger, "-", "overvalued / RSI>75","tone-down"],
    ["FAIR VALUE", fair, "-", "valuasi wajar","tone-teal"],
    ["TOP CANDIDATE", top ? top.s.ticker : "-", "-", top ? "skor "+top.u.total : "","tone-up"],
    ["VOL TOTAL", qhCompact(volTotal), "-", "lembar saham",""]
  ];

  // filter bar untuk daftar Ultimate
  let list = scored.filter(x=>{
    const q=QH.dashSearch.trim().toUpperCase();
    if(q && !(x.s.ticker.includes(q) || String(x.s.name||"").toUpperCase().includes(q))) return false;
    if(QH.dashSektor && qhSektorShort(x.s.sektor)!==QH.dashSektor) return false;
    if(x.u.total < QH.dashMinScore) return false;
    return true;
  }).sort((a,b)=>b.u.total-a.u.total);
  const sektors = [...new Set(stocks.map(s=>qhSektorShort(s.sektor)))].sort();

  return `
  <div class="qh-metric-grid">
    ${metrics.map(([l,v,h,h2,tone])=>`
      <div class="qh-metric ${tone}" onclick="qhSetTab('${l==="TOP CANDIDATE"&&top?"bandar":"dashboard"}')">
        <div class="qh-lbl">${l}</div>
        <div class="qh-val">${v}</div>
        <div class="qh-hint">${qhEsc(h2)}</div>
      </div>`).join("")}
  </div>

  <div class="qh-ihsg-panel">
    <div class="qh-ihsg-head">
      <div class="qh-ihsg-title"><span class="qh-dot"></span> IHSG · JAKARTA COMPOSITE INDEX <span class="qh-badge">LIVE</span></div>
      <div id="qhMktStatus" class="qh-market-status">…</div>
    </div>
    <div class="qh-tv-box"><div id="qhTvIhsg" class="qh-tv-inner"></div></div>
  </div>

  <div class="qh-tape-box"><div id="qhTvTape"></div></div>

  <div class="qh-searchbar">
    <input id="qhDashSearch" class="qh-input grow" placeholder="Cari kode / nama saham…" value="${qhEsc(QH.dashSearch)}"
      oninput="qhDashFilter('search', this.value)">
    <select class="qh-input" onchange="qhDashFilter('sektor', this.value)">
      <option value="">Semua sektor</option>
      ${sektors.map(se=>`<option ${QH.dashSektor===se?"selected":""}>${qhEsc(se)}</option>`).join("")}
    </select>
    <select class="qh-input" onchange="qhDashFilter('minScore', Number(this.value))">
      <option value="0" ${QH.dashMinScore==0?"selected":""}>Skor: semua</option>
      <option value="60" ${QH.dashMinScore==60?"selected":""}>Skor ≥ 60</option>
      <option value="75" ${QH.dashMinScore==75?"selected":""}>Skor ≥ 75</option>
    </select>
    <span class="qh-count">${list.length} emiten</span>
  </div>

  <div class="qh-searchbar">
    <button class="qh-minibtn" onclick="qhExportDash()">⬇ Export Ultimate Score (Excel)</button>
    <span class="qh-count">${list.length} emiten tampil</span>
  </div>

  <div class="qh-section-title">ULTIMATE SCORE — FOR LONG TERM <small>formula transparan: Fundamental 50 + Valuasi 25 + Momentum 25 · bukan rekomendasi</small></div>
  <div class="qh-us-grid">
    ${list.slice(0,30).map((x,i)=>`
      <div class="qh-us-card" onclick="qhOpenModal('${qhEsc(x.s.ticker)}')">
        <div class="qh-us-rank"><span>${i+1} RANK #${i+1}</span></div>
        <div class="qh-us-ticker">${qhEsc(x.s.ticker)}</div>
        <div class="qh-us-name">${qhEsc(x.s.name||"-")}</div>
        <div class="${qhToneClass(x.u.total)}">${x.u.total}</div>
        <div class="qh-us-mini">
          <div><span>PER</span><b>${x.s.per!=null?new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(x.s.per)+"x":"-"}</b></div>
          <div><span>PBV</span><b>${x.s.pbv!=null?new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(x.s.pbv)+"x":"-"}</b></div>
          <div><span>ROE%</span><b>${x.s.roe!=null?new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(x.s.roe)+"%":"-"}</b></div>
          <div><span>DER</span><b>${x.s.der!=null?new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(x.s.der):"-"}</b></div>
        </div>
        <div class="qh-chips">${x.u.badges.slice(0,3).map(b=>`<span class="qh-chip ${b.c}">${b.t}</span>`).join("")}</div>
        <div class="qh-upside">
          <span>Est. Upside (${qhEsc(x.u.method||"-")})</span>
          <b>${x.u.upsidePct!=null ? (x.u.upsidePct>0?"+":"")+qhPct(x.u.upsidePct) : "-"}</b>
        </div>
      </div>`).join("") || '<div class="qh-empty">Tidak ada emiten yang lolos filter.</div>'}
  </div>
  <div class="qh-info-note">Ultimate Score dihitung dari data fundamental & teknikal yang sudah ada di database Anda (formula terbuka di quant-hub.js — qhUltimateScore). Est. Upside = estimasi kasar fair value berbasis PER/PBV vs ROE — bukan saran investasi. DYOR.</div>`;
};
QH.mountTradingView = function(){
  function mount(elId, widget, cfg){
    const el = document.getElementById(elId); if(!el) return;
    el.innerHTML="";
    try{
      const c=document.createElement("div"); c.className=widget; c.style.height="100%"; c.style.width="100%";
      const inner=document.createElement("div"); inner.className=widget+"-inner-box"; inner.style.cssText="height:100%;width:100%;";
      const s=document.createElement("script"); s.async=true; s.type="text/javascript";
      s.src="https://s3.tradingview.com/external-embedding/embed-widget-"+widget+".js";
      s.text=JSON.stringify(cfg);
      inner.appendChild(s); c.appendChild(inner); el.appendChild(c);
    }catch(e){ el.innerHTML='<div class="qh-loading">Chart TradingView gagal dimuat.</div>'; }
  }
  mount("qhTvIhsg","advanced-chart",{
    autosize:true, symbol:"IDX:COMPOSITE", interval:"D", timezone:"Asia/Jakarta",
    theme:"dark", style:"1", locale:"id", hide_side_toolbar:true, allow_symbol_change:false,
    save_image:false, calendar:false, support_host:"https://www.tradingview.com"
  });
  mount("qhTvTape","ticker-tape",{
    symbols:[{proName:"IDX:COMPOSITE",title:"IHSG"},{proName:"IDX:LQ45",title:"LQ45"},
      {proName:"IDX:BBCA",title:"BBCA"},{proName:"IDX:BBRI",title:"BBRI"},
      {proName:"IDX:BMRI",title:"BMRI"},{proName:"IDX:TLKM",title:"TLKM"},
      {proName:"IDX:ASII",title:"ASII"},{proName:"IDX:UNTR",title:"UNTR"}],
    showSymbolLogo:true, isTransparent:true, displayMode:"adaptive", colorTheme:"dark", locale:"id"
  });
  // status pasar BUKA/TUTUP (jam bursa WIB)
  const st=document.getElementById("qhMktStatus");
  if(st){
    try{
      const now=new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Jakarta"}));
      const dow=now.getDay(), mins=now.getHours()*60+now.getMinutes();
      let holiday=false;
      try{ if(typeof BURSA_HOLIDAYS!=="undefined"){ const d=new Date(now); holiday=BURSA_HOLIDAYS.has(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")); } }catch(e){}
      const open = dow>=1&&dow<=5&&!holiday&&((mins>=540&&mins<=690)||(mins>=810&&mins<=949));
      st.className="qh-market-status "+(open?"open":"closed");
      st.innerHTML=open?"PASAR<br>BUKA":"PASAR<br>TUTUP";
    }catch(e){ st.textContent=""; }
  }
};

/* ---------- BANDARMOLOGY (ARA detector) ---------- */
QH.renderBandar = function(stocks){
  const ara = qhAraCandidates(stocks);
  const swing = qhSwingBigCap(stocks);
  // PENTING: parameter (c,i) di sini HARUS mengikuti urutan yang dikirim
  // Array.map() sendiri, yaitu (elemen, index) — bukan (index, elemen).
  // Sebelumnya fungsi ini bernama `row(i,c)` dan dipanggil lewat `.map(row)`,
  // sehingga `i` menerima objek kandidat & `c` menerima angka index → semua
  // baris tampil "[object Object]" / "undefined". ARA Candidate & Swing Big
  // Cap juga punya BENTUK DATA BERBEDA (qhAraCandidates vs qhSwingBigCap),
  // jadi sekarang dipisah jadi 2 fungsi render, bukan 1 fungsi `row` yang
  // dipaksa dipakai untuk keduanya.
  const rowAra = (c,i)=>`
    <div class="qh-cand-row" onclick="qhOpenModal('${qhEsc(c.ticker)}')">
      <div class="qh-cand-rank">${i+1}</div>
      <div class="qh-cand-id"><div class="qh-cand-ticker">${qhEsc(c.ticker)}</div><div class="qh-cand-name">${qhEsc(c.name||"")}</div></div>
      <div class="qh-chips">
        ${c.bigBuy?`<span class="qh-chip g">BIG BUY +${qhCompact(c.bigBuyVal)}</span>`:""}
        ${c.vr?`<span class="qh-chip">VOL ${qhPct((c.vr-1)*100)}</span>`:""}
        <span class="qh-chip ${c.offKosong?"g":""}">${c.offKosong?"OFF KOSONG":"OFF "+c.off}</span>
      </div>
      <div class="qh-cand-price">${qhRp(c.price)}<br><span class="${qhChgTone(c.chg)}">${qhChgArrow(c.chg)} ${qhPct(c.chg,true)}</span></div>
      <div class="qh-cand-score"><b>${c.score}</b><small>SCORE</small></div>
    </div>`;
  const rowSwing = (c,i)=>`
    <div class="qh-cand-row" onclick="qhOpenModal('${qhEsc(c.ticker)}')">
      <div class="qh-cand-rank">${i+1}</div>
      <div class="qh-cand-id"><div class="qh-cand-ticker">${qhEsc(c.ticker)}</div><div class="qh-cand-name">${qhEsc(c.name||"")}</div></div>
      <div class="qh-chips">
        <span class="qh-chip g">ASING +${qhCompact(c.fn1)}</span>
        ${c.fud>=2?`<span class="qh-chip g">KONSISTEN ${c.fud}H</span>`:""}
      </div>
      <div class="qh-cand-price">${qhRp(c.price)}<br><span class="${qhChgTone(c.chg)}">${qhChgArrow(c.chg)} ${qhPct(c.chg,true)}</span></div>
      <div class="qh-cand-score"><b>${c.score}</b><small>SCORE</small></div>
    </div>`;
  return `
  <div class="qh-info-note" style="margin-top:0">⚠️ Kandidat di sini dihitung dari perilaku order/harga EOD di database Anda (close di area high + offer tipis/kosong + net asing/volume). <strong>Bukan jaminan ARA</strong> — selalu cek berita & risiko masing-masing.</div>
  <div class="qh-grid-2" style="margin-top:16px">
    <div>
      <div class="qh-section-title">ARA CANDIDATE <small>small-mid · close di high · offer tipis · belum ARA</small></div>
      <div class="qh-cand-list">${ara.length ? ara.map(rowAra).join("") : '<div class="qh-empty">Tidak ada kandidat hari ini.</div>'}</div>
    </div>
    <div>
      <div class="qh-section-title">SWING BIG CAP <small>cap ≥ 10T · net foreign buy · konsisten</small></div>
      <div class="qh-cand-list">${swing.length ? swing.map(rowSwing).join("") : '<div class="qh-empty">Tidak ada kandidat hari ini.</div>'}</div>
    </div>
  </div>`;
};

/* ---------- BROKER STALKER ---------- */
QH.renderBroker = function(stocks){
  const periods=[["today","Today"],["1w","1W"],["1m","1M"],["3m","3M"]];
  let body="";
  if(QH.bdLoading) body='<div class="qh-loading">⏳ Menarik broker_summary dari Supabase (rentang '+QH.bdRangeDays+' hari bursa)…</div>';
  else if(QH.bdError) body='<div class="qh-error">'+qhEsc(QH.bdError)+'</div>';
  else if(!QH.bdRaw) body='<div class="qh-loading">Klik "Lacak" untuk menarik data broker_summary.</div>';
  else if(QH.bdTab==="broker") body=QH.renderBrokerView();
  else body=QH.renderStockView();

  return `
  <div class="qh-subtabs small">
    <button class="qh-subtab ${QH.bdTab==="broker"?"active":""}" onclick="qhSetBdTab('broker')">◎ LACAK BROKER</button>
    <button class="qh-subtab ${QH.bdTab==="saham"?"active":""}" onclick="qhSetBdTab('saham')">◈ LACAK SAHAM</button>
  </div>
  <div class="panel">
    ${QH.bdTab==="broker" ? `
      <div class="qh-toolbar">
        <div class="field"><label>KODE BROKER</label><input id="qhBrokerCode" class="qh-input" maxlength="4" placeholder="mis. AK" value="${qhEsc(QH.brokerCode)}"></div>
        <div class="field"><label>PERIODE</label><div class="qh-chips">
          ${periods.map(([v,l])=>`<button class="qh-subtab small ${QH.bdPeriod===v?"active":""}" onclick="qhSetBdPeriod('${v}')">${l}</button>`).join("")}
        </div></div>
        <div class="field"><label>VIEW</label><div class="qh-chips">
          <button class="qh-subtab small ${QH.bdView==="net"?"active":""}" onclick="qhSetBdView('net')">Net Buy</button>
          <button class="qh-subtab small ${QH.bdView==="vol"?"active":""}" onclick="qhSetBdView('vol')">Volume</button>
        </div></div>
        <div class="field"><label>&nbsp;</label><button class="btn btn-primary" onclick="qhRunBroker()">▶ LACAK BROKER</button></div>
      </div>
      <div id="qhBrokerQuick">${QH.renderBrokerQuick()}</div>
    ` : `
      <div class="qh-toolbar">
        <div class="field"><label>KODE SAHAM</label><input id="qhBdTicker" class="qh-input" maxlength="6" placeholder="mis. MEDS" value="${qhEsc(QH.bdTicker)}"></div>
        <div class="field"><label>PERIODE</label><div class="qh-chips">
          ${periods.map(([v,l])=>`<button class="qh-subtab small ${QH.bdPeriod===v?"active":""}" onclick="qhSetBdPeriod('${v}')">${l}</button>`).join("")}
        </div></div>
        <div class="field"><label>&nbsp;</label><button class="btn btn-primary" onclick="qhRunBroker()">◈ LACAK SAHAM</button></div>
      </div>
    `}
    <div class="qh-table-note">Sumber: tabel broker_summary Supabase (top-5 buy/sell per hari hasil tarikan Stockbit). Data terakhir: <b>${qhEsc(QH.bdLatestDate||"-")}</b>. Top-5 saja = angka agregat lebih kecil dari total pasar.</div>
  </div>
  ${body}`;
};
QH.renderBrokerQuick = function(){
  if(!QH.bdRaw) return "";
  const dir = qhBrokerDirectory(QH.bdRaw);
  const chip = (b, cls)=>`<button class="qh-code-chip ${cls||""} ${QH.brokerCode===b.code?"active":""}" onclick="qhPickBroker('${qhEsc(b.code)}')">${qhEsc(b.code)}</button>`;
  return `
    <div class="qh-broker-quick"><span class="qh-group-lbl">Asing inst.</span>${dir.asing.map(b=>chip(b,"asing")).join("")}</div>
    <div class="qh-broker-quick"><span class="qh-group-lbl">Lokal kuat</span>${dir.lokal.map(b=>chip(b)).join("")}</div>`;
};
QH.renderBrokerView = function(){
  const code=QH.brokerCode.trim().toUpperCase();
  if(!code) return '<div class="qh-empty">Isi kode broker lalu klik LACAK BROKER (atau klik chip cepat di atas).</div>';
  const agg = qhAggregateByStock(QH.bdRaw, code);
  if(!agg.length) return '<div class="qh-empty">Broker '+qhEsc(code)+' tidak ditemukan di data '+QH.bdRangeDays+' hari terakhir.</div>';
  const buyVal=agg.reduce((a,t)=>a+t.buyVal,0), sellVal=agg.reduce((a,t)=>a+t.sellVal,0);
  const net=buyVal-sellVal;
  const acc=agg.filter(t=>t.status==="ACC").length, dis=agg.filter(t=>t.status==="DIS").length;
  const list=[...agg].sort((a,b)=>QH.bdView==="net" ? Math.abs(b.net)-Math.abs(a.net) : b.tot-a.tot).slice(0,40);
  const maxAbs=Math.max(...list.map(t=>Math.abs(t.net)),1);
  return `
  <div class="qh-stat-grid">
    <div class="qh-stat"><div class="qh-lbl">TOTAL SAHAM</div><div class="qh-val">${agg.length}</div></div>
    <div class="qh-stat"><div class="qh-lbl">TOTAL BUY</div><div class="qh-val qh-net-pos">${qhCompact(buyVal)}</div></div>
    <div class="qh-stat"><div class="qh-lbl">TOTAL SELL</div><div class="qh-val qh-net-neg">${qhCompact(sellVal)}</div></div>
    <div class="qh-stat"><div class="qh-lbl">NET</div><div class="qh-val ${qhChgTone(net)}">${qhCompact(net)}</div></div>
    <div class="qh-stat"><div class="qh-lbl">SENTIMENT</div><div class="qh-val">${acc>dis?"🔴 Akum":"🟢 Dis"} ${Math.round(acc/(acc+dis||1)*100)}% Acc</div></div>
    <div class="qh-stat"><div class="qh-lbl">AKK / DIS</div><div class="qh-val">${acc} Acc / ${dis} Dis</div></div>
  </div>
  <div class="qh-section-title">${qhEsc(code)} — STOCK LIST <small>${QH.bdView==="net"?"urut |net|":"urut total value"} · ${qhEsc(QH_BROKER_NAMES[code]||"")}</small></div>
  <div class="qh-weight-list">
    ${list.map(t=>`
      <div class="qh-weight-row" onclick="qhOpenModal('${qhEsc(t.ticker)}')">
        <div class="qh-weight-tk">${qhEsc(t.ticker)} <span class="${t.status==="ACC"?"qh-acc-badge":t.status==="DIS"?"qh-dis-badge":""}" style="font-size:9px">${t.status}</span></div>
        <div class="qh-weight-track"><div class="qh-weight-fill ${t.net>=0?"buy":"sell"}" style="width:${Math.round(Math.abs(t.net)/maxAbs*100)}%"></div></div>
        <div class="qh-weight-net ${qhChgTone(t.net)}">${qhCompact(t.net)} <small style="color:var(--muted)">${t.share>0?"+":""}${t.share}%</small></div>
      </div>`).join("")}
  </div>`;
};
QH.renderStockView = function(){
  const t=QH.bdTicker.trim().toUpperCase();
  if(!t) return '<div class="qh-empty">Isi kode saham lalu klik LACAK SAHAM.</div>';
  const agg = qhAggregateByBroker(QH.bdRaw, t);
  if(!agg.length) return '<div class="qh-empty">Tidak ada data broker untuk '+qhEsc(t)+' di rentang ini.</div>';
  const buy=agg.reduce((a,b)=>a+b.buyVal,0), sell=agg.reduce((a,b)=>a+b.sellVal,0), net=buy-sell;
  const dominan = net>0 ? "AKUMULASI" : net<0 ? "DISTRIBUSI" : "NETRAL";
  return `
  <div class="qh-stat-grid">
    <div class="qh-stat"><div class="qh-lbl">BROKER AKTIF</div><div class="qh-val">${agg.length}</div></div>
    <div class="qh-stat"><div class="qh-lbl">NET BUY AGG</div><div class="qh-val qh-net-pos">${qhCompact(buy)}</div></div>
    <div class="qh-stat"><div class="qh-lbl">NET SELL AGG</div><div class="qh-val qh-net-neg">${qhCompact(sell)}</div></div>
    <div class="qh-stat"><div class="qh-lbl">DOMINAN</div><div class="qh-val ${net>0?"qh-net-pos":net<0?"qh-net-neg":""}" style="font-size:15px">${dominan}</div></div>
  </div>
  <div class="qh-section-title">BROKER AKTIF — ${qhEsc(t)} <small>top 12 berdasar net</small></div>
  <div class="qh-cand-list">
    ${agg.slice(0,12).map((b,i)=>`
      <div class="qh-cand-row" style="cursor:default">
        <div class="qh-cand-rank">${i+1}</div>
        <div><div class="qh-cand-ticker">${qhEsc(b.code)}</div><div class="qh-cand-name">${qhEsc(QH_BROKER_NAMES[b.code]||"")}${QH_FOREIGN.has(b.code)?" · ASING":""}</div></div>
        <div class="qh-chips"><span class="qh-chip g">B ${qhCompact(b.buyVal)}</span><span class="qh-chip r">S ${qhCompact(b.sellVal)}</span><span class="qh-chip">${b.days.size} hari</span></div>
        <div class="qh-cand-price">&nbsp;</div>
        <div class="qh-cand-score"><b class="${qhChgTone(b.net)}" style="font-size:13px">${qhCompact(b.net)}</b><small>NET</small></div>
      </div>`).join("")}
  </div>`;
};

/* ---------- FAVORIT P&L ---------- */
QH.renderFav = function(stocks){
  let wl=[];
  try{ wl=[...(state.watchlist||[])]; }catch(e){}
  const entries=qhLoadEntries();
  const q=QH.favSearch.trim().toUpperCase();
  let rows = wl.map((t,i)=>{
    const s = stocks.find(x=>x.ticker===t) || {ticker:t};
    let e = entries[t];
    // AUTO ENTRY: simpan sekali saat ticker pertama kali masuk watchlist.
    // Jangan memanggil qhSaveEntry() dari render(): fungsi itu me-render ulang
    // halaman dan sebelumnya dapat memicu render rekursif/tumpukan call yang
    // tidak berujung saat Quant Hub dibuka pertama kali.
    if(!e){
      const now2=qhN(s.cClose);
      if(now2!=null && now2>0){
        e={price:now2, date:new Date().toISOString().slice(0,10)};
        entries[t]=e;
        try{ if(typeof localStorage!=="undefined") localStorage.setItem(QH_LS_ENTRY, JSON.stringify(entries)); }catch(err){}
      }
    }
    const entry = e? e.price : qhN(s.cClose);
    const now = qhN(s.cClose);
    const pnl = entry&&now ? (now/entry-1)*100 : null;
    const w52h=qhN(s.high52w), w52l=qhN(s.low52w);
    const pctFrom52w = (w52h!=null && w52l!=null && w52h>w52l && now!=null) ? (now-w52l)/(w52h-w52l)*100 : null;
    return {i, s, entry, entryDate:e?e.date:(entries[t]?entries[t].date:new Date().toISOString().slice(0,10)), now, pnl, pctFrom52w};
  }).filter(r=>!q || r.s.ticker.includes(q) || String(r.s.name||"").toUpperCase().includes(q));
  const pnls = rows.map(r=>r.pnl).filter(v=>v!=null);
  // Hitung skor sekali per baris untuk tampilan & sort (sebelum dipakai)
  rows.forEach(r=>{ r._score = qhUltimateScore(r.s).total; });
  const avgPnl = pnls.length ? pnls.reduce((a,b)=>a+b,0)/pnls.length : null;
  // Total P&L berbobot modal, agar ringkasan tidak menyesatkan ketika
  // ukuran posisi berbeda. Tetap tampilkan equal-weight di hint bila perlu.
  const invested = rows.reduce((a,r)=>a+(r.entry&&r.entry>0 ? r.entry*100 : 0),0);
  const currentValue = rows.reduce((a,r)=>a+(r.now&&r.entry&&r.entry>0 ? r.now*100 : 0),0);
  const weightedPnl = invested>0 ? (currentValue/invested-1)*100 : null;

  // Urutkan sesuai pilihan user (kolom + arah disimpan di QH.favSort)
  const dir = QH.favSort.asc ? 1 : -1;
  const sortBy = {
    pnl: r => r.pnl, chg: r => qhN(r.s.changePct), score: r => r._score,
    entry: r => r.entry, now: r => r.now, code: r => r.s.ticker, date: r => r.entryDate
  }[QH.favSort.key];
  if(sortBy) rows.sort((a,b)=>{ const va=sortBy(a), vb=sortBy(b);
    if(va==null&&vb==null) return 0; if(va==null) return 1; if(vb==null) return -1;
    return typeof va==="string" ? va.localeCompare(vb)*dir : (va-vb)*dir; });
  else rows.sort((a,b)=>a.i-b.i); // urutan asli watchlist
  const sortArrow = k => QH.favSort.key===k ? (QH.favSort.asc?" ▲":" ▼") : "";
  const thSort = (k,label)=>`<th style="cursor:pointer;user-select:none" onclick="qhFavSort('${k}')">${label}${sortArrow(k)}</th>`;
  return `
  <div class="qh-pnl-total">
    <span class="qh-lbl" style="color:var(--muted);font-size:11px;font-weight:700;letter-spacing:.06em">PORTFOLIO UNREALIZED P&L</span>
    <span class="qh-big ${qhChgTone(weightedPnl!=null?weightedPnl:avgPnl)}">${(weightedPnl!=null?weightedPnl:avgPnl)!=null?qhChgArrow(weightedPnl!=null?weightedPnl:avgPnl)+" "+qhPct(weightedPnl!=null?weightedPnl:avgPnl,true):"-"}</span>
    <span class="qh-badge">● ${rows.filter(r=>r.entry&&r.entry>0).length} saham dengan entry · ${wl.length} total${weightedPnl==null&&avgPnl!=null?" (equal-weight)":""}</span>
    <button class="qh-minibtn" onclick="qhShareFav()">Share</button>
    <button class="qh-minibtn" onclick="qhExportFav()">⬇ Export Excel</button>
    <span class="qh-table-note">Berbobot modal (entry × 100 lembar) · equal-weight: ${avgPnl!=null?qhPct(avgPnl,true):"-"}</span>
  </div>
  <div class="panel" style="padding:0;overflow:hidden">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:12px 16px 0;font-size:11px;color:var(--muted)">
      <input class="qh-input" style="width:220px;text-transform:none" placeholder="Cari kode / nama…" value="${qhEsc(QH.favSearch)}" oninput="qhFavSearch(this.value)">
      <span>${rows.length} saham tampil</span>
      <button class="qh-minibtn" onclick="qhClearAllEntries()">Clear All</button>
    </div>
    <div class="table-wrap" style="border:none;max-height:70vh">
    <table>
      <thead><tr><th>#</th>${thSort("code","KODE")}<th>NAMA</th><th>SEKTOR</th>${thSort("score","SCORE")}${thSort("date","TGL FAVORIT")}${thSort("entry","HARGA ENTRY")}${thSort("now","HARGA KINI")}${thSort("pnl","P&L %")}${thSort("chg","1D %")}<th>52W%</th><th>STATUS</th><th>ENTRY</th></tr></thead>
      <tbody>
        ${rows.map(r=>{
          const st=qhStatusBadge(r.s, r.pnl);
          const score = r._score!=null ? r._score : qhUltimateScore(r.s).total;
          return `<tr>
            <td>${r.i+1}</td>
            <td><button class="ticker-link" style="font-weight:800" onclick="qhOpenModal('${qhEsc(r.s.ticker)}')">${qhEsc(r.s.ticker)}</button></td>
            <td style="color:var(--muted);font-size:11.5px">${qhEsc((r.s.name||"-").slice(0,28))}</td>
            <td style="color:var(--teal);font-size:11px">${qhEsc(qhSektorShort(r.s.sektor))}</td>
            <td><span style="font-family:'JetBrains Mono',monospace;font-weight:800;color:${score>=75?'var(--up)':score>=60?'var(--gold)':'var(--muted)'};font-size:13px">${score}</span></td>
            <td style="font-size:11px;color:var(--muted)">${qhEsc(r.entryDate)}</td>
            <td class="mono">${qhRp(r.entry)}</td>
            <td class="mono">${qhRp(r.now)}</td>
            <td class="mono ${qhChgTone(r.pnl)}">${r.pnl!=null?qhChgArrow(r.pnl)+" "+qhPct(r.pnl,true):"-"}</td>
            <td class="mono ${qhChgTone(qhN(r.s.changePct))}">${qhPct(qhN(r.s.changePct),true)}</td>
            <td class="mono" style="color:var(--muted)">${r.pctFrom52w!=null?Math.round(r.pctFrom52w)+"%":"-"}</td>
            <td><span class="qh-status-badge ${st.c}">${st.t}</span></td>
            <td>
              <button class="qh-minibtn" onclick="qhPromptEntry('${qhEsc(r.s.ticker)}')">set</button>
              <button class="qh-minibtn danger" onclick="qhClearEntry('${qhEsc(r.s.ticker)}')">×</button>
            </td>
          </tr>`;
        }).join("") || '<tr><td colspan="13"><div class="empty-box">Watchlist kosong — tandai saham dengan ⭐ di tab Screener dulu. Harga entry otomatis terisi saat pertama kali halaman ini dibuka.</div></td></tr>'}
      </tbody>
    </table>
    </div>
  </div>`;
};

/* ---------- BPJS — BELI PAGI, JUAL SORE ---------- */
/* ───────────── BSJP (dipindah dari tab utama app.js) ─────────────
   SENGAJA tidak diimplementasi ulang di sini (beda dengan BPJS di atas
   yang murni native Quant Hub) -- BSJP adalah engine momentum yang besar
   (computeBsjpEngine, BSJP_PRESETS, dst di app.js) yang juga masih
   dipakai fitur lain (backtest, checklist). Duplikat logikanya di sini
   berisiko dua sumber kebenaran yang bisa divergen. Jadi cukup panggil
   renderBsjp() global (sudah theme-aware, pakai var(--...) yang berlaku
   di mana saja termasuk #qhPage) dan sambungkan wiring tombolnya lewat
   attachContentEvents() (lihat pemanggilannya di QH.render di atas). */
QH.renderBsjpEmbed = function(){
  try{
    if(typeof renderBsjp !== "function") return '<div class="qh-error">BSJP tidak tersedia (renderBsjp() tidak ditemukan di app.js).</div>';
    return renderBsjp();
  }catch(e){
    return '<div class="qh-error">BSJP error: '+qhEsc(e.message)+'</div>';
  }
};
QH.renderBpjs = function(){
  if(QH.bpjsLoading) return '<div class="qh-loading">⏳ Menarik sesi_snapshots dari Supabase…</div>';

  const all = QH.bpjsRows || [];
  const withBoth = all.filter(r=>r.harga_pagi!=null && r.harga_sore!=null);
  const avgReturn = withBoth.length ? withBoth.reduce((a,r)=>a+(Number(r.return_pct)||0),0)/withBoth.length : null;
  const gainers = withBoth.filter(r=>Number(r.return_pct)>0).length;
  const losers  = withBoth.filter(r=>Number(r.return_pct)<0).length;

  const q = QH.bpjsSearch.trim().toUpperCase();
  let rows = all.filter(r=>!q || r.ticker.toUpperCase().includes(q));
  if(QH.bpjsMinReturn!=null) rows = rows.filter(r=>r.return_pct!=null && Number(r.return_pct)>=QH.bpjsMinReturn);

  const dir = QH.bpjsSort.asc ? 1 : -1;
  const sortBy = {
    return: r=>qhN(r.return_pct), volume: r=>qhN(r.volume_sore)??qhN(r.volume_pagi),
    ticker: r=>r.ticker, pagi: r=>qhN(r.harga_pagi), sore: r=>qhN(r.harga_sore)
  }[QH.bpjsSort.key];
  if(sortBy) rows.sort((a,b)=>{ const va=sortBy(a), vb=sortBy(b);
    if(va==null&&vb==null) return 0; if(va==null) return 1; if(vb==null) return -1;
    return typeof va==="string" ? va.localeCompare(vb)*dir : (va-vb)*dir; });
  const sortArrow = k => QH.bpjsSort.key===k ? (QH.bpjsSort.asc?" ▲":" ▼") : "";
  const thSort = (k,label)=>`<th style="cursor:pointer;user-select:none" onclick="qhBpjsSort('${k}')">${label}${sortArrow(k)}</th>`;

  const jam = iso => { if(!iso) return "-"; try{ return new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit"}).format(new Date(iso)); }catch(e){ return "-"; } };

  return `
  <div class="qh-metric-grid">
    <div class="qh-metric ${avgReturn>=0?"tone-up":"tone-down"}">
      <div class="qh-lbl">AVG RETURN PAGI→SORE</div>
      <div class="qh-val">${avgReturn!=null?qhPct(avgReturn,true):"-"}</div>
      <div class="qh-hint">${withBoth.length} saham sudah 2 snapshot</div>
    </div>
    <div class="qh-metric tone-up"><div class="qh-lbl">NAIK</div><div class="qh-val">${gainers}</div><div class="qh-hint">return_pct &gt; 0</div></div>
    <div class="qh-metric tone-down"><div class="qh-lbl">TURUN</div><div class="qh-val">${losers}</div><div class="qh-hint">return_pct &lt; 0</div></div>
    <div class="qh-metric tone-teal"><div class="qh-lbl">TOTAL TER-SNAPSHOT</div><div class="qh-val">${all.length}</div><div class="qh-hint">${qhTodayWIB()}</div></div>
  </div>

  ${QH.bpjsError ? `<div class="qh-info-note">⚠️ ${qhEsc(QH.bpjsError)}</div>` : ""}

  <div class="panel" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
    <span style="font-size:11px;color:var(--muted);font-weight:700;">📸 SNAPSHOT SEKARANG (dari browser, watchlist · ${(()=>{try{return (state.watchlist||[]).length;}catch(e){return 0;}})()} ticker):</span>
    <button class="qh-minibtn" ${QH.snapLoading?"disabled":""} onclick="qhSnapshotSesiNow('pagi')">${QH.snapLoading?"⏳ Menarik...":"🌅 Snapshot PAGI"}</button>
    <button class="qh-minibtn" ${QH.snapLoading?"disabled":""} onclick="qhSnapshotSesiNow('sore')">${QH.snapLoading?"⏳ Menarik...":"🌆 Snapshot SORE"}</button>
    ${QH.snapLoading ? '<span style="font-size:11px;color:var(--muted);">Menarik harga live Stockbit satu-satu (~0.35 dtk/ticker, mohon tunggu)…</span>' : ""}
    ${QH.snapError ? `<span style="font-size:11px;color:var(--down);">⚠️ ${qhEsc(QH.snapError)}</span>` : ""}
    ${QH.snapLastResult ? `<span style="font-size:11px;color:var(--up);">✅ ${QH.snapLastResult.ok}/${QH.snapLastResult.total} ticker ter-snapshot (${QH.snapLastResult.mode})${QH.snapLastResult.failed?`, ${QH.snapLastResult.failed} gagal ambil harga`:""}</span>` : ""}
  </div>

  <div class="panel" style="padding:0;overflow:hidden">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:12px 16px 0;font-size:11px;color:var(--muted)">
      <input class="qh-input" style="width:180px;text-transform:none" placeholder="Cari ticker…" value="${qhEsc(QH.bpjsSearch)}" oninput="qhBpjsSearch(this.value)">
      <select class="qh-input" onchange="qhBpjsMinReturn(this.value)">
        <option value="" ${QH.bpjsMinReturn==null?"selected":""}>Semua return</option>
        <option value="1" ${QH.bpjsMinReturn===1?"selected":""}>≥ +1%</option>
        <option value="2" ${QH.bpjsMinReturn===2?"selected":""}>≥ +2%</option>
        <option value="3" ${QH.bpjsMinReturn===3?"selected":""}>≥ +3%</option>
        <option value="5" ${QH.bpjsMinReturn===5?"selected":""}>≥ +5%</option>
      </select>
      <span>${rows.length} ticker tampil</span>
      <button class="qh-minibtn" onclick="qhLoadBpjs()">↻ Refresh</button>
    </div>
    <div class="table-wrap" style="border:none;max-height:70vh">
    <table>
      <thead><tr>${thSort("ticker","TICKER")}${thSort("pagi","HARGA PAGI")}${thSort("sore","HARGA SORE")}${thSort("return","RETURN %")}${thSort("volume","VOLUME")}</tr></thead>
      <tbody>
        ${rows.slice(0,300).map(r=>{
          const rp = r.return_pct!=null ? Number(r.return_pct) : null;
          return `<tr>
            <td><button class="ticker-link" style="font-weight:800" onclick="qhOpenModal('${qhEsc(r.ticker)}')">${qhEsc(r.ticker)}</button></td>
            <td class="mono">${qhRp(r.harga_pagi)}<div style="font-size:10px;color:var(--muted)">${jam(r.captured_pagi_at)} WIB</div></td>
            <td class="mono">${qhRp(r.harga_sore)}<div style="font-size:10px;color:var(--muted)">${jam(r.captured_sore_at)} WIB</div></td>
            <td class="mono ${qhChgTone(rp)}">${rp!=null?qhChgArrow(rp)+" "+qhPct(rp,true):"-"}</td>
            <td class="mono" style="color:var(--muted)">${qhFmt(r.volume_sore??r.volume_pagi)}</td>
          </tr>`;
        }).join("") || '<tr><td colspan="5"><div class="empty-box">Tidak ada ticker yang cocok filter.</div></td></tr>'}
      </tbody>
    </table>
    </div>
  </div>
  <div class="qh-info-note">ℹ️ Harga Pagi & Sore adalah snapshot live (Yahoo Finance) via <code>snapshot-sesi.mjs</code> pada jam yang tertera — bukan Open/Close resmi bursa. "-" berarti snapshot sesi itu belum jalan hari ini.</div>`;
};

/* ---------- INFO — logika & formula semua fitur Quant Hub ---------- */
function qhiCard(icon, title, tone, bodyHtml){
  return `
  <div class="panel qhi-card">
    <div class="qhi-card-head"><span class="qhi-card-icon">${icon}</span><span class="qhi-card-title">${title}</span>${tone?`<span class="qh-chip ${tone}">${tone==="g"?"TRANSPARAN":tone}</span>`:""}</div>
    <div class="qhi-card-body">${bodyHtml}</div>
  </div>`;
}
function qhiKv(term, desc){ return `<div class="qhi-kv"><span class="qhi-kv-term">${term}</span><span class="qhi-kv-desc">${desc}</span></div>`; }
function qhiNote(html, tone){ return `<div class="qh-info-note qhi-note-${tone||"info"}">${html}</div>`; }

QH.renderInfo = function(){
  return `
  <div class="qhi-wrap">
  ${qhiNote(`Semua formula di bawah ini <b>terbuka &amp; bisa diaudit</b> — bisa dibaca langsung di kode sumber <code>quant-hub.js</code>. Semuanya dihitung dari data yang sudah ada di database Anda sendiri (fundamental/teknikal via Screener, broker_summary, sesi_snapshots) — <b>bukan</b> API/formula rahasia pihak ketiga, dan <b>bukan</b> saran investasi.`, "info")}

  ${qhiCard("◧", "Ultimate Score — Dashboard", "g", `
    <p>Skor 0–100 gabungan tiga komponen, dihitung ulang tiap kali data live berubah (fungsi <code>qhUltimateScore</code>):</p>
    ${qhiKv("Fundamental (maks 50)", "ROE (maks 12, penuh di ROE≥25%) + NPM (maks 8, penuh di NPM≥20%) + DER (maks 10, penuh di DER≤0 — makin kecil utang makin tinggi; tanpa data dapat nilai netral 5) + Current Ratio (maks 5, penuh di CR≥1,5) + Dividend Yield (maks 5, penuh di yield≥4%) + Konsistensi (maks 10: +5 jika EPS positif, +5 jika label valuasi \"murah/undervalued\").")}
    ${qhiKv("Valuasi (maks 25)", "PER (maks 15, penuh di PER≤5x, nol di PER≥30x) + PBV (maks 10, penuh di PBV≤0,5x, nol di PBV≥3x). Kedua komponen ini <b>terbalik</b> — makin murah, makin tinggi skornya.")}
    ${qhiKv("Momentum (maks 25)", "+8 jika harga &gt; MA50, +7 jika harga &gt; MA200, +5 jika RSI14 di rentang sehat 40–70 (atau +2 jika RSI14&gt;70/overbought), +5 jika label tren harga \"bullish\".")}
    ${qhiKv("Grade", "Total ≥75 = <b>Potensi Besar</b> · 60–74 = <b>Menarik</b> · 40–59 = <b>Biasa</b> · &lt;40 = <b>Lemah</b>.")}
    ${qhiKv("Badge otomatis", "PER&lt;10 · ROE&gt;15% · DER&lt;1 · PBV&lt;1 (hijau, sinyal bagus) — PER&gt;30 · DER&gt;1,5 (merah, perlu hati-hati). Bisa muncul beberapa sekaligus.")}
    ${qhiKv("Est. Upside / Fair Value", "Kalau ada PER &amp; ROE: <code>fairPER = clamp(ROE×0,8, 5, 20)</code>, lalu <code>fairPrice = harga × (fairPER ÷ PER)</code>. Kalau PER tidak tersedia tapi ada PBV &amp; ROE: <code>fairPBV = clamp(ROE÷10×1,2, 0.4, 2.5)</code>, <code>fairPrice = harga × (fairPBV ÷ PBV)</code>. Upside % = <code>(fairPrice ÷ harga − 1) × 100</code>.")}
    ${qhiNote(`Ini estimasi kasar berbasis rasio historis, <b>bukan</b> valuasi DCF/analis. Kalau salah satu komponen (PER/PBV/ROE) tidak ada datanya, Est. Upside otomatis kosong ("data kurang").`, "warn")}
  `)}

  ${qhiCard("🔥", "ARA Candidate & Swing Big Cap — Bandarmology", "g", `
    <p><b>ARA Candidate</b> (fungsi <code>qhAraCandidates</code>) — saham small–mid cap (kapitalisasi &lt;Rp5T, atau tanpa data cap dianggap masuk) yang HARUS memenuhi ketiganya:</p>
    <ul class="qhi-list">
      <li><b>Close di high</b> — harga penutupan ≥ 99% dari harga tertinggi hari itu.</li>
      <li><b>Offer tipis/kosong</b> — antrian offer kosong (volume offer = 0), atau harga offer ≥ 103% dari harga close.</li>
      <li><b>Belum ARA</b> — kenaikan hari ini masih di bawah (batas ARA − 3%). Batas ARA otomatis mengikuti rentang harga: &lt;Rp50 = 35% · &lt;Rp200 = 25% · ≤Rp5.000 = 20% · &gt;Rp5.000 = 15%.</li>
    </ul>
    ${qhiKv("Skor ARA (maks 100)", "+30 (close di high) + hingga 25×min(1, rasio volume÷2) (kekuatan volume) + 25 jika net asing 1 hari positif / 10 jika netral atau data kosong / 0 jika net asing negatif + 20 jika offer benar-benar kosong (10 jika hanya tipis).")}
    <p style="margin-top:10px"><b>Swing Big Cap</b> (fungsi <code>qhSwingBigCap</code>) — saham big/mega cap (kapitalisasi ≥Rp10T) yang net asing 1 harinya <b>positif</b> (syarat mutlak, kalau tidak langsung tidak lolos):</p>
    ${qhiKv("Skor Swing (maks 100)", "Dasar 50 + 20 jika net asing konsisten positif ≥2 hari berturut (atau +8 kalau belum konsisten) + 10 jika harga &gt; MA21 + 10 jika harga &gt; MA50 + 10 jika hari ini hijau (perubahan &gt;0%).")}
    ${qhiNote(`Kedua daftar menampilkan top 10 skor tertinggi. Ini murni proxy perilaku harga/order EOD — <b>bukan jaminan ARA/breakout terjadi</b>, selalu cek berita &amp; risiko masing-masing saham.`, "warn")}
  `)}

  ${qhiCard("◉", "Broker Stalker — Lacak Broker & Lacak Saham", "g", `
    <p>Sumbernya sama persis dengan tabel yang diisi fitur Broker Summary di tab utama: <code>broker_summary</code> (top-5 broker beli/jual per saham per hari). Bedanya, versi Quant Hub menarik &amp; mengagregasi langsung dari Supabase untuk rentang tanggal yang dipilih (Today ≈1 hari, 1W ≈5 hari, 1M ≈22 hari, 3M ≈66 hari bursa).</p>
    ${qhiKv("Mode Lacak Broker", "Jumlah semua baris buy/sell broker terpilih per saham dalam periode → <b>Net</b> = Total Buy − Total Sell, <b>Share</b> = Net ÷ (Buy+Sell) × 100%.")}
    ${qhiKv("Status ACC / DIS / NET", "<b>ACC</b> (akumulasi) jika Net &gt; 0 dan nilai Buy ≥ 55% dari total transaksi broker itu di saham tsb. <b>DIS</b> (distribusi) jika Net &lt; 0 dan nilai Sell ≥ 55%. Selain itu <b>NET</b> (campuran/netral).")}
    ${qhiKv("Mode Lacak Saham", "Kebalikannya — jumlah buy/sell tiap broker yang aktif di satu saham terpilih, diurutkan dari Net tertinggi, plus jumlah hari broker itu muncul di data.")}
    ${qhiNote(`Data top-5 saja per hari (bukan seluruh transaksi pasar) — jadi angka agregat di sini lebih kecil dari total transaksi saham yang sebenarnya. Seakurat &amp; serutin data Broker Summary diisi.`, "info")}
  `)}

  ${qhiCard("🌅", "BPJS — Beli Pagi, Jual Sore", "g", `
    <p>Membandingkan harga <b>pagi</b> (snapshot ~09:05 WIB) dengan harga <b>sore</b> (~15:45 WIB) di hari yang sama, dari tabel <code>sesi_snapshots</code>.</p>
    ${qhiKv("Return %", "<code>(harga_sore ÷ harga_pagi − 1) × 100</code>, dihitung &amp; disimpan langsung di kolom <code>return_pct</code> tabel <code>sesi_snapshots</code>.")}
    ${qhiKv("Sumber snapshot", "Otomatis 2×/hari lewat script <code>snapshot-sesi.mjs</code> (cron pagi &amp; sore), ATAU manual lewat tombol Snapshot PAGI/SORE di halaman ini — menarik harga live Stockbit untuk semua saham di Watchlist, lalu upsert ke tabel yang sama.")}
    ${qhiKv("Avg Return Pagi→Sore", "Rata-rata sederhana <code>return_pct</code> dari semua saham yang SUDAH punya kedua snapshot (pagi &amp; sore) hari itu.")}
    ${qhiNote(`Harga Pagi/Sore adalah snapshot live sesaat, <b>bukan</b> harga Open/Close resmi bursa (yang biasanya dibentuk lewat pre-opening/pre-closing auction). Jangan tertukar dengan <b>BSJP</b> (Beli Sore, Jual Pagi) di tab utama — arahnya kebalikan.`, "warn")}
  `)}

  ${qhiCard("◈", "Favorit P&L", "g", `
    <p>Dibangun di atas Watchlist (⭐) yang sama dengan tab utama.</p>
    ${qhiKv("Harga entry otomatis", "Saat sebuah saham pertama kali masuk Watchlist, harga penutupan saat itu langsung tersimpan sebagai harga entry (localStorage perangkat ini). Bisa diubah manual kapan saja lewat tombol \"set\".")}
    ${qhiKv("P&L per saham", "<code>(harga kini ÷ harga entry − 1) × 100</code>.")}
    ${qhiKv("P&L portofolio (berbobot modal)", "<code>invested = Σ(harga entry × 100 lembar)</code> untuk tiap saham yang punya entry, <code>currentValue = Σ(harga kini × 100 lembar)</code> saham yang sama, lalu <code>(currentValue ÷ invested − 1) × 100</code>. Ini yang ditampilkan sebagai angka besar utama; versi equal-weight (rata-rata sederhana tiap saham) ditampilkan sebagai pembanding kecil di sampingnya.")}
    ${qhiKv("Status badge", "UV = label valuasi \"murah/undervalued\". OV/DANGER = label \"over/mahal\" (jadi DANGER kalau P&L ≤ −15% atau RSI14 &gt;75). FAIR = label \"wajar/fair\". Kalau labelnya tidak ada: PROFIT jika P&L ≥15%, DANGER jika P&L ≤ −10%, selain itu NEUTRAL.")}
  `)}
  </div>
  <style>
  .qhi-wrap{ display:flex; flex-direction:column; gap:12px; }
  .qhi-card-head{ display:flex; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap; }
  .qhi-card-icon{ font-size:16px; }
  .qhi-card-title{ font-weight:800; font-size:13.5px; }
  .qhi-card-body p{ font-size:12.5px; line-height:1.7; margin:0 0 8px; }
  .qhi-card-body ul.qhi-list{ margin:0 0 8px; padding-left:18px; font-size:12.5px; line-height:1.8; }
  .qhi-kv{ display:flex; gap:12px; padding:7px 0; border-bottom:1px dashed var(--qh-border); font-size:12px; flex-wrap:wrap; }
  .qhi-kv:last-child{ border-bottom:none; }
  .qhi-kv-term{ flex:0 0 190px; font-weight:700; color:var(--qh-accent) !important; }
  .qhi-kv-desc{ flex:1 1 240px; line-height:1.6; }
  .qhi-note-warn{ border-color:#f3b93f !important; }
  code{ background:#eef4ff; border:1px solid var(--qh-border); border-radius:4px; padding:1px 5px; font-family:'JetBrains Mono',monospace; font-size:11px; }
  @media (max-width:640px){ .qhi-kv-term{ flex-basis:100%; } }
  </style>`;
};

/* ---------- MODAL DETAIL ---------- */
QH.modalHtml = function(s){
  if(!s) return "";
  const u = qhUltimateScore(s);
  const price=qhN(s.cClose), chg=qhN(s.changePct);
  const ring = (()=>{ // donut skor
    const r=26, c=2*Math.PI*r, off=c*(1-u.total/100);
    const col = u.total>=75?"#34d399":u.total>=60?"#fbbf24":"#f87171";
    return `<svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="7"/>
      <circle cx="36" cy="36" r="${r}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 36 36)"/>
      <text x="36" y="41" text-anchor="middle" font-size="17" font-weight="800" fill="#fff" font-family="JetBrains Mono">${u.total}</text>
    </svg>`; })();
  const items=[
    ["PER", s.per!=null?new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(s.per)+"x":"-", /mahal|over/i.test(s.valuasi||"")?"qh-net-neg":""],
    ["PBV", s.pbv!=null?new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(s.s_pbv??s.pbv)+"x":"-", ""],
    ["ROE", s.roe!=null?qhPct(s.roe):"-", (qhN(s.roe)>15?"qh-net-pos":"")],
    ["DER", s.der!=null?new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(s.der):"-", (qhN(s.der)<1?"qh-net-pos":"")],
    ["NPM", s.npm!=null?qhPct(s.npm):"-", ""],
    ["EPS", s.eps!=null?qhFmt(s.eps):"-", ""],
    ["Div Yield", s.divYield!=null?qhPct(s.divYield):"-", ""],
    ["Market Cap", s.marketCap!=null?qhCompact(s.marketCap):"-", ""],
    ["RSI14", s.rsi14!=null?new Intl.NumberFormat("id-ID",{maximumFractionDigits:1}).format(s.rsi14):"-", ""],
    ["Vol Ratio", s.volRatio!=null?qhPct((qhN(s.volRatio)-1)*100):"-", (qhN(s.volRatio)>1.5?"qh-net-pos":"")],
    ["Foreign 1D", s.foreignNet1D!=null?qhCompact(s.foreignNet1D):"-", qhChgTone(qhN(s.foreignNet1D))],
    ["Foreign 5D", s.foreignNet5D!=null?qhCompact(s.foreignNet5D):"-", qhChgTone(qhN(s.foreignNet5D))],
    ["Support", s.support?qhRp(s.support):"-", ""],
    ["Resistance", s.resistance?qhRp(s.resistance):"-", ""],
    ["52W High", s.high52w?qhRp(s.high52w):"-", ""],
    ["52W Low", s.low52w?qhRp(s.low52w):"-", ""]
  ];
  return `
  <div class="qh-modal-overlay" onclick="if(event.target===this)qhCloseModal()">
    <div class="qh-modal">
      <div class="qh-modal-head">
        <div>
          <div class="qh-us-ticker" style="font-size:24px">${qhEsc(s.ticker)}</div>
          <div class="qh-us-name">${qhEsc(s.name||"-")} · ${qhEsc(qhSektorShort(s.sektor))}</div>
        </div>
        <button class="qh-minibtn danger" onclick="qhCloseModal()">✕</button>
      </div>
      <div class="qh-modal-price">
        <div><div class="qh-lbl" style="color:var(--muted);font-size:10px;font-weight:700">HARGA TERAKHIR</div>
        <div class="qh-modal-big">${qhRp(price)}</div>
        <div class="${qhChgTone(chg)}">${qhChgArrow(chg)} ${qhPct(chg,true)} hari ini</div></div>
        <div style="display:flex;align-items:center;gap:10px">${ring}
          <div><b style="color:var(--gold)">${qhEsc(u.grade)}</b><div class="qh-table-note">Ultimate Score<br>Fund ${u.fund}/50 · Val ${u.val}/25 · Mom ${u.mom}/25</div></div>
        </div>
        <div class="qh-chips">${u.badges.map(b=>`<span class="qh-chip ${b.c}">${b.t}</span>`).join("")}</div>
      </div>
      <div class="qh-upside" style="margin-bottom:14px">
        <span>Est. Fair Value (${qhEsc(u.method||"-")})${u.fairPrice?" — "+qhRp(u.fairPrice):""}</span>
        <b>${u.upsidePct!=null?(u.upsidePct>0?"+":"")+qhPct(u.upsidePct):"data kurang"}</b>
      </div>
      <div class="qh-detail-grid">
        ${items.map(([l,v,c])=>`<div class="qh-stat"><div class="qh-lbl">${l}</div><div class="qh-val ${c}" style="font-size:15px">${v}</div></div>`).join("")}
      </div>
      <div class="qh-modal-actions">
        <a class="btn btn-tradingview" target="_blank" rel="noopener" href="https://www.tradingview.com/chart/?symbol=IDX%3A${qhEsc(s.ticker)}">Buka di TradingView</a>
        <a class="btn btn-stockbit" target="_blank" rel="noopener" href="https://stockbit.com/symbol/${qhEsc(s.ticker)}">Buka di Stockbit</a>
        <button class="qh-minibtn" onclick="qhSetEntryFromModal('${qhEsc(s.ticker)}', ${price!=null?price:"null"})">⭐ Set sbg harga entry favorit</button>
      </div>
      <div class="qh-info-note">Analisis informatif berbasis data di database Anda — bukan saran investasi. Selalu riset mandiri (DYOR).</div>
    </div>
  </div>`;
};

/* ─────────────────────────── BOOT & INTEGRASI ─────────────────────────── */
QH.ensureDom = function(){
  if(QH.booted) return true;
  const sidebar = document.getElementById("sidebarNav");
  const appBody = document.querySelector(".app-body") || document.body;
  if(!sidebar || !appBody) return false;
  qhInjectStyles();

  // Tombol sidebar (class sendiri supaya tidak konflik handler app.js)
  if(!document.getElementById("qhNavBtn")){
    const btn=document.createElement("button");
    btn.id="qhNavBtn"; btn.className="qh-nav-btn"; btn.innerHTML='<span class="tab-icon">⚡</span><span class="tab-label">Quant Hub</span>';
    btn.onclick=(e)=>{ e.preventDefault(); e.stopPropagation(); QH.openPage(); };
    // letakkan setelah tombol tab terakhir
    sidebar.appendChild(btn);
  }
  // Halaman container — saudara #content di dalam .app-body
  if(!document.getElementById("qhPage")){
    const page=document.createElement("div");
    page.id="qhPage"; page.className="content"; page.style.display="none";
    appBody.appendChild(page);
  }
  // Kalau user klik tab app.js manapun → tutup Quant Hub
  sidebar.addEventListener("click", (e)=>{
    const tb=e.target.closest(".tab-btn");
    if(tb) QH.closePage();
  }, true);
  QH.booted=true;
  return true;
};
QH.openPage = function(){
  if(!QH.ensureDom()){ alert("Quant Hub: sidebar (#sidebarNav) tidak ditemukan. Pastikan file ditempatkan dengan benar."); return; }
  QH.open=true;
  document.getElementById("qhPage").style.display="";
  const content=document.getElementById("content"); if(content) content.style.display="none";
  document.querySelectorAll("#sidebarNav .tab-btn.active").forEach(b=>b.classList.remove("active"));
  document.getElementById("qhNavBtn").classList.add("active");
  QH.qhRenderSafe();
};
QH.closePage = function(){
  QH.open=false;
  const page=document.getElementById("qhPage"); if(page) page.style.display="none";
  const content=document.getElementById("content"); if(content) content.style.display="";
  const btn=document.getElementById("qhNavBtn"); if(btn) btn.classList.remove("active");
};

// Auto-refresh halaman saat state.stocks berubah (loadLive selesai / harga update)
setInterval(()=>{
  if(!QH.open) return;
  const st=qhStocks();
  const sig=st.length+"|"+(st[0]&&st[0].updatedAt||"")+"|"+(st[0]&&st[0].cClose||"");
  if(sig!==QH.lastStocksSig){ QH.lastStocksSig=sig; QH.qhRenderSafe(); }
}, 5000);

/* API global untuk inline onclick */
window.qhSetTab=(t)=>{ QH.subtab=t; if(typeof localStorage!=="undefined") localStorage.setItem("qh_subtab",t); QH.qhRenderSafe(); };
window.qhRefresh=()=>QH.qhRenderSafe();
window.qhClose=()=>QH.closePage();
window.qhDashFilter=(k,v)=>{ QH[k]=v; QH.qhRenderSafe(); const el=document.getElementById("qhDashSearch"); if(el&&k==="search"){el.focus(); el.setSelectionRange(el.value.length,el.value.length);} };
window.qhOpenModal=(t)=>{ QH.modalTicker=t; QH.qhRenderSafe(); };
window.qhCloseModal=()=>{ QH.modalTicker=null; QH.qhRenderSafe(); };
window.qhFavSort=(k)=>{
  if(QH.favSort.key===k) QH.favSort.asc=!QH.favSort.asc;
  else QH.favSort={key:k, asc:true};
  QH.qhRenderSafe();
};
window.qhFavSearch=(v)=>{
  QH.favSearch=v;
  // Render ulang TANPA kehilangan fokus kursor di kotak pencarian
  const el=document.activeElement;
  const pos=el && el.tagName==="INPUT" ? el.selectionStart : null;
  QH.qhRenderSafe();
  const inp=document.querySelector("#qhBody .qh-input");
  if(inp && pos!=null){ inp.focus(); try{ inp.setSelectionRange(pos,pos); }catch(e){} }
};
window.qhExportFav=()=>{
  try{
    if(typeof XLSX==="undefined") throw new Error("Library XLSX belum termuat (cek koneksi CDN).");
    const st=qhStocks(); const entries=qhLoadEntries();
    let wl=[]; try{ wl=[...(state.watchlist||[])]; }catch(e){}
    const data=[["Kode","Nama","Sektor","Score","Tgl Favorit","Harga Entry","Harga Kini","P&L %","1D %","Status"]];
    wl.filter(t=>!QH.favSearch || t.includes(QH.favSearch.trim().toUpperCase()) || String((st.find(x=>x.ticker===t)||{}).name||"").toUpperCase().includes(QH.favSearch.trim().toUpperCase())).forEach(t=>{ const s=st.find(x=>x.ticker===t)||{}; const e=entries[t]; const now=qhN(s.cClose);
      const pnl=e&&now?(now/e.price-1)*100:null;
      data.push([t, s.name||"", s.sektor||"", qhUltimateScore(s).total, e?e.date:"", e?e.price:"", now??"" ,
        pnl!=null?Number(pnl.toFixed(2)):"", qhN(s.changePct)!=null?Number(qhN(s.changePct).toFixed(2)):"", qhStatusBadge(s,pnl).t]);
    });
    const ws=XLSX.utils.aoa_to_sheet(data);
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Watchlist PnL");
    XLSX.writeFile(wb, "watchlist-pnl-"+new Date().toISOString().slice(0,10)+".xlsx");
  }catch(e){ alert("Export gagal: "+e.message); }
};
window.qhExportDash=()=>{
  try{
    if(typeof XLSX==="undefined") throw new Error("Library XLSX belum termuat (cek koneksi CDN).");
    const stocks=qhStocks();
    const scored=stocks.map(s=>({s,u:qhUltimateScore(s)}))
      .filter(x=>{ const q=QH.dashSearch.trim().toUpperCase();
        if(q && !(x.s.ticker.includes(q)||String(x.s.name||"").toUpperCase().includes(q))) return false;
        if(QH.dashSektor && qhSektorShort(x.s.sektor)!==QH.dashSektor) return false;
        return x.u.total>=QH.dashMinScore; })
      .sort((a,b)=>b.u.total-a.u.total);
    const data=[["Rank","Kode","Nama","Sektor","Ultimate Score","Grade","Fund (50)","Valuasi (25)","Momentum (25)","Harga","Est Upside %","Est Fair Value","Metode"]];
    scored.forEach((x,i)=>data.push([i+1, x.s.ticker, x.s.name||"", x.s.sektor||"", x.u.total, x.u.grade,
      x.u.fund, x.u.val, x.u.mom, x.s.cClose??"", x.u.upsidePct!=null?x.u.upsidePct:"", x.u.fairPrice!=null?Math.round(x.u.fairPrice):"", x.u.method||""]));
    const ws=XLSX.utils.aoa_to_sheet(data);
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Ultimate Score");
    XLSX.writeFile(wb, "ultimate-score-"+new Date().toISOString().slice(0,10)+".xlsx");
  }catch(e){ alert("Export gagal: "+e.message); }
};
window.qhBpjsSort=(k)=>{
  if(QH.bpjsSort.key===k) QH.bpjsSort.asc=!QH.bpjsSort.asc;
  else QH.bpjsSort={key:k, asc:false};
  QH.qhRenderSafe();
};
window.qhBpjsSearch=(v)=>{
  QH.bpjsSearch=v;
  const el=document.activeElement;
  const pos=el && el.tagName==="INPUT" ? el.selectionStart : null;
  QH.qhRenderSafe();
  const inp=document.querySelector("#qhBody .qh-input");
  if(inp && pos!=null){ inp.focus(); try{ inp.setSelectionRange(pos,pos); }catch(e){} }
};
window.qhBpjsMinReturn=(v)=>{ QH.bpjsMinReturn = v===""?null:Number(v); QH.qhRenderSafe(); };
window.qhLoadBpjs=()=>{ QH.bpjsRows=null; qhLoadBpjs(); };
window.qhSnapshotSesiNow=(mode)=>qhSnapshotSesiNow(mode);
window.qhSetBdTab=(t)=>{ QH.bdTab=t; QH.qhRenderSafe(); };
window.qhSetBdPeriod=(p)=>{ QH.bdPeriod=p; QH.qhRenderSafe(); };
window.qhSetBdView=(v)=>{ QH.bdView=v; QH.qhRenderSafe(); };
window.qhPickBroker=(c)=>{ QH.brokerCode=c; if(!QH.bdRaw){ QH.runBroker(); } else QH.qhRenderSafe(); };
window.qhRunBroker=()=>QH.runBroker();
QH.runBroker=function(){
  const inp=document.getElementById(QH.bdTab==="broker"?"qhBrokerCode":"qhBdTicker");
  if(inp) { const v=inp.value.trim().toUpperCase(); if(QH.bdTab==="broker") QH.brokerCode=v; else QH.bdTicker=v; }
  if(QH.bdTab==="saham" && !QH.bdTicker){ alert("Isi kode saham dulu."); return; }
  qhLoadBroker();
};
window.qhPromptEntry=(t)=>{
  const now=(qhStocks().find(s=>s.ticker===t)||{}).cClose;
  const v=prompt("Harga entry untuk "+t+" (kosongkan = harga kini "+(now?qhRp(now):"-")+"):", now||"");
  if(v===null) return;
  const n=parseFloat(String(v).replace(/[^\d.,]/g,"").replace(/\.(?=\d{3}\b)/g,"").replace(",","."));
  if(isNaN(n)||n<=0){ alert("Harga tidak valid."); return; }
  qhSaveEntry(t,n);
};
window.qhSetEntryFromModal=(t,price)=>{ if(price) qhSaveEntry(t,price); };
window.qhClearAllEntries=()=>{
  if(!confirm("Hapus semua harga entry tersimpan? P&L akan dihitung ulang dari harga saat ini.")) return;
  if(typeof localStorage!=="undefined") localStorage.removeItem(QH_LS_ENTRY); QH.qhRenderSafe();
};
window.qhShareFav=()=>{
  const st=qhStocks(); const entries=qhLoadEntries();
  let wl=[]; try{ wl=[...(state.watchlist||[])]; }catch(e){}
  const lines=wl.map(t=>{ const s=st.find(x=>x.ticker===t)||{}; const e=entries[t]; const now=qhN(s.cClose);
    const pnl=e&&now?(now/e.price-1)*100:null;
    return `${t}: entry ${e?qhRp(e.price):"-"} → kini ${qhRp(now)} (${pnl!=null?qhPct(pnl,true):"-"})`; });
  const txt="Watchlist P&L ("+new Date().toLocaleDateString("id-ID")+")\n"+lines.join("\n");
  (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(
    ()=>alert("Ringkasan P&L dikopi ke clipboard ✅"),
    ()=>alert(txt));
};

const start=()=>{ if(QH.ensureDom()){ /* siap; halaman dibuka manual lewat menu */ } else setTimeout(start,500); };
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", start); else start();

})();
