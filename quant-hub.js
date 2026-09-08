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
    ["broker","◉ Broker Stalker"],["fav","◈ Favorit P&L"]
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
  <div id="qhBody">${ !stocks.length
      ? '<div class="qh-loading">⏳ Menunggu data stocks_screener dari Supabase… (buka dulu tab Screener di aplikasi bila perlu)</div>'
      : (
    QH.subtab==="dashboard" ? QH.renderDashboard(stocks) :
    QH.subtab==="bandar"    ? QH.renderBandar(stocks) :
    QH.subtab==="broker"    ? QH.renderBroker(stocks) :
                              QH.renderFav(stocks)
  )}</div>
  ${QH.modalTicker ? QH.modalHtml(stocks.find(s=>s.ticker===QH.modalTicker)) : ""}`;
  page.innerHTML = html;
  if(QH.subtab==="dashboard" && stocks.length){
    QH.mountTradingView();
    window.qhSearchDash && null;
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
  const row = (i,c)=>`
    <div class="qh-cand-row" onclick="qhOpenModal('${qhEsc(c.ticker)}')">
      <div class="qh-cand-rank">${i+1}</div>
      <div><div class="qh-cand-ticker">${qhEsc(c.ticker)}</div><div class="qh-cand-name">${qhEsc(c.name||"")}</div></div>
      <div class="qh-chips">
        ${c.bigBuy?`<span class="qh-chip g">BIG BUY +${qhCompact(c.bigBuyVal)}</span>`:""}
        ${c.vr?`<span class="qh-chip">VOL ${qhPct((c.vr-1)*100)}</span>`:""}
        <span class="qh-chip ${c.offKosong?"g":""}">${c.offKosong?"OFF KOSONG":"OFF "+c.off}</span>
      </div>
      <div class="qh-cand-price">${qhRp(c.price)}<br><span class="${qhChgTone(c.chg)}">${qhChgArrow(c.chg)} ${qhPct(c.chg,true)}</span></div>
      <div class="qh-cand-score"><b>${c.score}</b><small>SCORE</small></div>
    </div>`;
  return `
  <div class="qh-info-note" style="margin-top:0">⚠️ Kandidat di sini dihitung dari perilaku order/harga EOD di database Anda (close di area high + offer tipis/kosong + net asing/volume). <strong>Bukan jaminan ARA</strong> — selalu cek berita & risiko masing-masing.</div>
  <div class="qh-grid-2" style="margin-top:16px">
    <div>
      <div class="qh-section-title">ARA CANDIDATE <small>small-mid · close di high · offer tipis · belum ARA</small></div>
      <div class="qh-cand-list">${ara.length ? ara.map(row).join("") : '<div class="qh-empty">Tidak ada kandidat hari ini.</div>'}</div>
    </div>
    <div>
      <div class="qh-section-title">SWING BIG CAP <small>cap ≥ 10T · net foreign buy · konsisten</small></div>
      <div class="qh-cand-list">${swing.length ? swing.map(row).join("") : '<div class="qh-empty">Tidak ada kandidat hari ini.</div>'}</div>
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
