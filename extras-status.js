// extras-status.js — Status & Kesegaran Data + Papan Peringkat Uji Maju untuk IHSG Screener Pro.
// Dimuat SETELAH extras.js dan extras-plus.js (bergantung pada window.ExtrasAPI). Tidak mengubah app.js.
// Menambah dua tab di Trader Tools:
//   🩺 Status Data  — umur data per sumber (screener, flows IDX, flows Stockbit, broker activity, token, live quote)
//                     + badge kesegaran di header (pil "Data Live") yang bisa diklik.
//   🏅 Peringkat    — papan peringkat sumber/kriteria screener dari sesi Backtest (uji maju) dengan ukuran sampel,
//                     skor konservatif, profit factor, dan peringatan sampel kecil.
(function(){
"use strict";
const X=window.ExtrasAPI;
if(!X){ console.warn("[extras-status] ExtrasAPI tidak ditemukan — pastikan extras.js dimuat sebelum file ini."); return; }
const {E,LS,SV,ST,pc,cls,toast}=X;
const $=s=>document.querySelector(s);
const N=v=>{ if(v==null||v==="") return null; const n=+v; return isNaN(n)?null:n; };
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const median=a=>{ const b=[...a].sort((x,y)=>x-y), m=b.length>>1; return b.length%2?b[m]:(b[m-1]+b[m])/2; };
const sd=a=>{ if(a.length<2) return null; const m=mean(a); return Math.sqrt(a.reduce((s,v)=>s+(v-m)*(v-m),0)/(a.length-1)); };
const pad=n=>String(n).padStart(2,"0");
const fmtD=d=>d?String(d).slice(8,10)+"/"+String(d).slice(5,7)+"/"+String(d).slice(0,4):"-";
const MON=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const fmtShort=d=>d?(+String(d).slice(8,10))+" "+MON[+String(d).slice(5,7)-1]:"-";

/* ================= WAKTU BURSA (WIB) ================= */
// Catatan: libur bursa tidak dihitung (tidak ada kalender libur di aplikasi), jadi "selisih hari bursa" bersifat perkiraan.
function wib(ts){ // -> {date:"YYYY-MM-DD", h, m, dow}
  const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false,weekday:"short"}).formatToParts(new Date(ts));
  const g=t=>(p.find(x=>x.type===t)||{}).value;
  return {date:`${g("year")}-${g("month")}-${g("day")}`,h:+g("hour")%24,m:+g("minute"),dow:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(g("weekday"))};
}
const dayShift=(ds,n)=>{ const d=new Date(ds+"T00:00:00Z"); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };
const dowOf=ds=>new Date(ds+"T00:00:00Z").getUTCDay();
const isWd=ds=>{ const w=dowOf(ds); return w>0&&w<6; };
function prevTrading(ds){ let d=dayShift(ds,-1); while(!isWd(d)) d=dayShift(d,-1); return d; }
function lastTradingOnOrBefore(ds){ let d=ds; while(!isWd(d)) d=dayShift(d,-1); return d; }
// Tanggal bursa yang SEHARUSNYA sudah punya data EOD sekarang (EOD dianggap siap ±16:30 WIB).
function expectedDate(now){ const w=wib(now||Date.now()); if(isWd(w.date)&&(w.h>16||(w.h===16&&w.m>=30))) return w.date; return prevTrading(w.date); }
// Selisih hari bursa (weekday) antara tanggal data dan tanggal yang diharapkan.
function lagDays(dataDate,exp){ if(!dataDate) return null; let d=String(dataDate).slice(0,10), n=0; if(d>=exp) return 0; while(d<exp&&n<60){ d=dayShift(d,1); if(isWd(d)) n++; } return n; }
// Waktu sinkron (timestamp) -> tanggal bursa yang kira-kira dicakup datanya.
function coverDate(ts){ const w=wib(ts); if(!isWd(w.date)) return lastTradingOnOrBefore(w.date); return (w.h>16||(w.h===16&&w.m>=30))?w.date:prevTrading(w.date); }
const lvl=lag=>lag==null?"na":lag<=0?"ok":lag===1?"warn":"bad";
const LV={ok:["🟢","var(--up,#10b981)","Segar"],warn:["🟡","#f59e0b","Telat 1 hari bursa"],bad:["🔴","var(--down,#ef4444)","Basi"],na:["⚪","var(--muted,#888)","Tidak diketahui"]};
const ago=ts=>{ if(!ts) return "-"; const s=Math.max(0,Math.round((Date.now()-ts)/1000)); if(s<60) return "baru saja"; const m=Math.round(s/60); if(m<60) return m+" menit lalu"; const h=Math.round(m/60); if(h<48) return h+" jam lalu"; return Math.round(h/24)+" hari lalu"; };
const badge=l=>`<span style="color:${LV[l][1]};font-weight:700">${LV[l][0]} ${LV[l][2]}</span>`;

/* ================= PROBE SUMBER DATA ================= */
let PROBE={at:0,rows:null,busy:false,err:null};
const rpt=()=>{ if(X.current()==="status") X.repaint(); }; // jangan menimpa tab lain / input yang sedang diketik
async function q(path){
  if(typeof SUPABASE_URL==="undefined"||!SUPABASE_URL) throw new Error("Supabase belum dikonfigurasi (Pengaturan).");
  const r=await fetch(`${SUPABASE_URL}/${path}`,{headers:getSupaHeaders(),cache:"no-store"});
  if(!r.ok) throw new Error("HTTP "+r.status);
  const j=await r.json(); return Array.isArray(j)?j:[];
}
async function probeAll(force){
  if(PROBE.busy||(!force&&Date.now()-PROBE.at<60000)) return;
  PROBE.busy=true; PROBE.err=null; rpt();
  const defs=[
    ["Harga EOD resmi IDX (tabel flows)","flows?select=date&or=(src.is.null,src.neq.stockbit)&order=date.desc&limit=1",r=>r[0]&&r[0].date,"date","sync-idx-full.mjs (manual, jaringan rumah)"],
    ["Harga Stockbit di flows (susulan)","flows?select=date&src=eq.stockbit&order=date.desc&limit=1",r=>r[0]&&r[0].date,"date","update-flows-prices.mjs / live-harga.bat"],
    ["Broker Activity","broker_activity?select=trade_date&order=trade_date.desc&limit=1",r=>r[0]&&r[0].trade_date,"date","tarik broker summary / cron"],
    ["Token Stockbit (stockbit_session)","stockbit_session?id=eq.1&select=updated_at,expires_at",r=>r[0]&&r[0].updated_at,"ts","extension Chrome"]
  ];
  const out=[];
  await Promise.all(defs.map(async d=>{
    try{ const rows=await q(d[1]); const v=d[2](rows); const extra=d[0].startsWith("Token")&&rows[0]?rows[0].expires_at:null; out.push({name:d[0],kind:d[3],val:v,src:d[4],extra,ok:true}); }
    catch(e){ out.push({name:d[0],kind:d[3],val:null,src:d[4],ok:false,err:e.message}); }
  }));
  PROBE.rows=defs.map(d=>out.find(o=>o.name===d[0])); PROBE.at=Date.now(); PROBE.busy=false; X.repaint();
}

/* ================= RINGKASAN SCREENER (stocks_screener.updated_at) ================= */
function screenerFresh(){
  const S=(ST().stocks||[]).filter(s=>s&&s.ticker&&!s.suspended&&s.updatedAt);
  if(!S.length) return null;
  const exp=expectedDate();
  const rows=S.map(s=>{ const ts=new Date(s.updatedAt).getTime(); if(isNaN(ts)) return null; const cd=coverDate(ts); return {t:s.ticker,ts,cd,lag:lagDays(cd,exp)}; }).filter(Boolean);
  if(!rows.length) return null;
  const tss=rows.map(r=>r.ts).sort((a,b)=>a-b), lags=rows.map(r=>r.lag);
  const cnt={ok:0,warn:0,bad:0}; rows.forEach(r=>cnt[lvl(r.lag)]++);
  const worstLag=Math.max(...lags), newest=tss[tss.length-1], med=tss[tss.length>>1], oldest=tss[0];
  // level keseluruhan ditentukan median (bukan hanya satu saham yang telat)
  const medLag=median(lags);
  return {n:rows.length,exp,cnt,newest,med,oldest,worstLag,medLag,level:lvl(Math.round(medLag)),stale:rows.filter(r=>r.lag>=1).sort((a,b)=>a.ts-b.ts).slice(0,15),cover:coverDate(med)};
}
function liveQuoteInfo(){
  const L=ST().stockbitLive||{}, ks=Object.keys(L).filter(k=>L[k]&&L[k].fetchedAt);
  if(!ks.length) return null;
  const newest=Math.max(...ks.map(k=>L[k].fetchedAt)), err=ks.filter(k=>L[k].error).length;
  return {n:ks.length,newest,err};
}

/* ================= BADGE HEADER ================= */
let _badgeBusy=false;
function applyBadge(){
  const el=$("#modePill"); if(!el) return;
  const f=screenerFresh(); if(!f) return;
  const txt=`Data Live · ${f.level==="ok"?"harga "+fmtShort(f.exp):"harga s/d "+fmtShort(f.cover)}`;
  _badgeBusy=true;
  try{
    if(el.textContent!==txt) el.textContent=txt;
    el.style.color=LV[f.level][1]; el.style.cursor="pointer";
    el.title=`${LV[f.level][2]} — diperbarui ${ago(f.newest)} (median ${ago(f.med)}). ${f.cnt.warn+f.cnt.bad} dari ${f.n} saham tertinggal. Klik untuk detail.`;
    if(!el._exBound){ el._exBound=true; el.addEventListener("click",()=>X.go("status")); }
  }finally{ setTimeout(()=>{_badgeBusy=false;},0); }
}
(function watch(){
  const el=$("#modePill"); if(!el){ setTimeout(watch,1500); return; }
  new MutationObserver(()=>{ if(!_badgeBusy) applyBadge(); }).observe(el,{childList:true,characterData:true,subtree:true});
  applyBadge();
})();
X.tick(applyBadge);
setTimeout(applyBadge,3000); setTimeout(applyBadge,10000);

/* ================= TAB: STATUS DATA ================= */
function vStatus(){
  const f=screenerFresh(), exp=expectedDate(), lq=liveQuoteInfo();
  const tok=(PROBE.rows||[]).find(r=>r.name.startsWith("Token"));
  let h=`<div class="ex-card"><h3>🩺 Status & Kesegaran Data</h3>
  <p class="ex-mut">Tanggal bursa yang seharusnya sudah punya data EOD sekarang: <b>${fmtD(exp)}</b> (EOD dianggap siap ±16:30 WIB). Libur bursa tidak dihitung, jadi selisih hari bersifat perkiraan.</p>
  <button class="ex-btn pri" data-act="stCheck">🔄 Cek ulang sumber</button>${PROBE.busy?` <span class="ex-mut">memeriksa…</span>`:PROBE.at?` <span class="ex-mut">dicek ${ago(PROBE.at)}</span>`:""}</div>`;

  // Ringkasan umum
  if(f){
    h+=`<div class="ex-card"><h3>Data screener (tabel stocks_screener) — ${badge(f.level)}</h3>
    <table class="ex-tbl"><tr><td>Update terbaru</td><td>${E(ago(f.newest))} <span class="ex-mut">(${new Date(f.newest).toLocaleString("id-ID")})</span></td></tr>
    <tr><td>Update median</td><td>${E(ago(f.med))}</td></tr><tr><td>Update tertua</td><td>${E(ago(f.oldest))}</td></tr>
    <tr><td>Saham</td><td>${f.n} total · <span style="color:var(--up,#10b981)">${f.cnt.ok} segar</span> · <span style="color:#f59e0b">${f.cnt.warn} telat 1 hari</span> · <span style="color:var(--down,#ef4444)">${f.cnt.bad} telat ≥2 hari</span></td></tr></table>
    ${f.stale.length?`<p class="ex-mut" style="margin-top:10px">Saham paling tertinggal (hanya yang tercatat telat; saham suspend dikecualikan):</p><div class="ex-wrap"><table class="ex-tbl"><tr><th>Ticker</th><th>Diupdate</th><th>Perkiraan data s/d</th><th>Telat</th></tr>${f.stale.map(r=>`<tr><td><span class="ex-link" data-act="xDetail" data-t="${E(r.t)}">${E(r.t)}</span></td><td>${E(ago(r.ts))}</td><td>${fmtD(r.cd)}</td><td>${r.lag} hari bursa</td></tr>`).join("")}</table></div>`:`<p class="ex-up" style="margin-top:8px">Tidak ada saham yang tertinggal.</p>`}</div>`;
  }else{
    h+=`<div class="ex-card"><h3>Data screener</h3><p class="ex-mut">Belum ada data saham dengan kolom updated_at. Klik “Refresh Data” di header, atau cek Pengaturan koneksi Supabase.</p></div>`;
  }

  // Sumber per tabel
  const rows=(PROBE.rows||[]).map(r=>{
    if(!r.ok) return `<tr><td>${E(r.name)}<div class="ex-mut">${E(r.src)}</div></td><td colspan="3" class="ex-dn">Gagal dibaca: ${E(r.err)}</td></tr>`;
    if(r.kind==="ts"){
      const ts=r.val?new Date(r.val).getTime():null, exs=r.extra?new Date(r.extra).getTime():null, expired=exs&&exs<Date.now();
      const l=expired?"bad":ts==null?"na":(Date.now()-ts<12*36e5?"ok":Date.now()-ts<48*36e5?"warn":"bad");
      return `<tr><td>${E(r.name)}<div class="ex-mut">${E(r.src)}</div></td><td>${ts?E(ago(ts)):"-"}</td><td>${exs?(expired?`<span class="ex-dn">kedaluwarsa ${E(ago(exs))}</span>`:"berlaku sampai "+new Date(exs).toLocaleString("id-ID")):"-"}</td><td>${badge(l)}${expired?`<div class="ex-mut">Token ditolak → update harga jatuh ke Yahoo / gagal 403.</div>`:""}</td></tr>`;
    }
    const lag=lagDays(r.val,exp), l=lvl(lag);
    return `<tr><td>${E(r.name)}<div class="ex-mut">${E(r.src)}</div></td><td>${r.val?fmtD(String(r.val).slice(0,10)):"-"}</td><td>${lag==null?"-":lag+" hari bursa"}</td><td>${badge(l)}</td></tr>`;
  }).join("");
  h+=`<div class="ex-card"><h3>Sumber di Supabase</h3>
  ${PROBE.rows?`<div class="ex-wrap"><table class="ex-tbl"><tr><th>Sumber</th><th>Data/aktivitas terakhir</th><th>Selisih / masa berlaku</th><th>Status</th></tr>${rows}</table></div>`:`<p class="ex-mut">${PROBE.busy?"Memeriksa sumber…":"Klik “Cek ulang sumber”."}</p>`}
  <p class="ex-mut" style="margin-top:10px">Jika “Harga EOD resmi IDX” tertinggal tetapi “Harga Stockbit” lebih baru, candle terakhir di Grafik memakai data susulan Stockbit. Jika keduanya tertinggal, jalankan menu.bat (opsi update).</p></div>`;

  // Live quote browser ini
  h+=`<div class="ex-card"><h3>Live quote di browser ini</h3>${lq?`<table class="ex-tbl"><tr><td>Terakhir ditarik</td><td>${E(ago(lq.newest))} ${Date.now()-lq.newest>5*60*1000?`<span class="ex-warn">(lebih dari 5 menit — basi)</span>`:""}</td></tr><tr><td>Ticker ditarik</td><td>${lq.n}${lq.err?` · <span class="ex-dn">${lq.err} gagal</span>`:""}</td></tr></table>`:`<p class="ex-mut">Belum ada live quote Stockbit yang ditarik pada sesi ini.</p>`}</div>`;
  return h;
}
X.act("stCheck",()=>probeAll(true));
X.addTab("status","🩺 Status",vStatus,()=>{ probeAll(false); });

/* ================= TAB: PERINGKAT UJI MAJU ================= */
const MIN_OPTS=[1,5,10,20];
let LB=LS("lb",{by:"kriteria",min:5,sort:"skor",dir:-1}), lbOpen=new Set();
const saveLB=()=>SV("lb",LB);
const lbCost=()=>{ const c=parseFloat(LS("pbt_cost",0.5)); return isFinite(c)&&c>=0?c:0; }; // dipakai bersama tab Uji Resep
let BM={at:0,map:null,busy:false,err:null,tk:0,from:null};
const rpl=()=>{ if(X.current()==="lb") X.repaint(); };
const liqOf=s=>{ const a=N(s.turnover); return a!=null?a:N(s.valueTraded); };
async function loadBench(){
  if(BM.busy) return;
  const S=ST(); if(!S.backtests||!S.backtests.length){ toast("Belum ada sesi Backtest","down"); return; }
  const dates=new Set(); S.backtests.forEach(b=>(b.items||[]).forEach(it=>{ const d=String(it.entryDate||b.date||"").slice(0,10); if(d) dates.add(d); }));
  if(!dates.size){ toast("Sesi Backtest tidak punya tanggal entry","down"); return; }
  const now={}; (S.stocks||[]).forEach(s=>{ const px=N(s.cClose); if(s.ticker&&!s.suspended&&px>0&&(liqOf(s)||0)>=1e9) now[s.ticker]=px; });
  if(Object.keys(now).length<50){ toast("Data saham belum dimuat","down"); return; }
  BM.busy=true; BM.err=null; rpl();
  try{
    const since=[...dates].sort()[0], H={};
    for(let pg=0;pg<150;pg++){
      const qs=new URLSearchParams({select:"ticker,date,close",date:`gte.${since}`,order:"date.asc,ticker.asc",limit:"1000",offset:String(pg*1000)});
      const rows=await q("flows?"+qs);
      rows.forEach(r=>{ if(r.close==null||!now[r.ticker]) return; const h=H[r.ticker]||(H[r.ticker]={d:[],c:[]}); h.d.push(String(r.date).slice(0,10)); h.c.push(+r.close); });
      if(rows.length<1000) break;
    }
    const map={}, tks=Object.keys(H); let tot=0;
    dates.forEach(d=>{ const r=[]; tks.forEach(t=>{ const h=H[t], i=h.d.findIndex(x=>x>=d); if(i<0||h.c[i]<=0) return; r.push((now[t]/h.c[i]-1)*100); });
      if(r.length>=30){ map[d]=mean(r); tot+=r.length; } });
    const nd=Object.keys(map).length;
    if(!nd) throw new Error("Riwayat harga di tabel flows tidak cukup untuk tanggal entry Anda.");
    BM={at:Date.now(),map,busy:false,err:null,tk:Math.round(tot/nd),from:since};
  }catch(e){ BM.busy=false; BM.err=e.message; }
  rpl();
}
function wilsonLow(w,n){ if(!n) return null; const z=1.645,p=w/n,d=1+z*z/n; return ((p+z*z/(2*n))-z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n)))/d*100; }
function ageDays(o){ const d=String(o.entryDate||"").slice(0,10); if(!d) return null; const t=Date.parse(d+"T00:00:00Z"); return isNaN(t)?null:Math.max(1,Math.round((Date.now()-t)/864e5)); }
function lbCompute(){
  if(typeof computeScreenerRekap!=="function") return {err:"Fungsi computeScreenerRekap tidak ditemukan di app.js."};
  const S=ST();
  if(!S.backtests||!S.backtests.length) return {err:"Belum ada sesi Backtest yang disimpan. Simpan hasil screener ke tab 🔬 Backtest dulu (mis. BSJP, Gap Up & Go, Resep)."};
  const tpPct=N(S.backtestTargetTpPct)>0?+S.backtestTargetTpPct:5, mode=S.backtestTpMode==="auto"?"auto":"percent";
  let base; try{ base=computeScreenerRekap(tpPct,mode); }catch(e){ return {err:"Gagal menghitung rekap: "+e.message}; }
  const all=[]; const cost=lbCost(); base.forEach(r=>r.occurrences.forEach(o=>all.push(Object.assign({},o,{pl:o.pl==null?null:o.pl-cost,periodMaxPL:o.periodMaxPL==null?null:o.periodMaxPL-cost}))));
  const allPl=all.filter(o=>o.pl!=null).map(o=>o.pl);
  if(!allPl.length) return {err:"Belum ada sinyal dengan P/L terhitung (harga live/riwayat belum termuat)."};
  const groups=new Map();
  all.forEach(o=>{ const k=LB.by==="sumber"?(o.sumber||"Screener"):((o.kriteria&&o.kriteria!=="-")?o.kriteria:(o.sumber||"Screener")); (groups.get(k)||groups.set(k,[]).get(k)).push(o); });
  const baseAvg=mean(allPl);
  const rows=[...groups.entries()].map(([label,occ])=>{
    const w=occ.filter(o=>o.pl!=null), pls=w.map(o=>o.pl), n=pls.length;
    if(!n) return null;
    const wins=pls.filter(v=>v>0), loss=pls.filter(v=>v<0), avg=mean(pls), s=sd(pls), se=s==null?null:s/Math.sqrt(n);
    const gw=wins.reduce((a,b)=>a+b,0), gl=-loss.reduce((a,b)=>a+b,0);
    const mx=occ.filter(o=>o.periodMaxPL!=null).map(o=>o.periodMaxPL), avgBest=mx.length?mean(mx):null;
    const tr=occ.filter(o=>o.target&&o.target.hasHistory), tpHit=tr.length?tr.filter(o=>o.target.achieved).length/tr.length*100:null;
    const exs=BM.map?w.map(o=>{ const b=BM.map[String(o.entryDate||o.sessionDate||"").slice(0,10)]; return b==null?null:o.pl-b; }).filter(v=>v!=null):[];
    const ages=w.map(ageDays).filter(v=>v!=null), age=ages.length?mean(ages):null;
    const days=new Set(w.map(o=>String(o.entryDate||o.sessionDate||"").slice(0,10)).filter(Boolean)).size;
    return {label,occ:w,n,days,tickers:new Set(w.map(o=>o.ticker)).size,win:wins.length/n*100,wlow:wilsonLow(wins.length,n),avg,med:median(pls),se,
      skor:se==null?avg-Math.abs(avg)*0.5-5:avg-se, // sampel tunggal: penalti besar
      pf:gl>0?gw/gl:(gw>0?Infinity:null),avgBest,giveback:avgBest!=null?avgBest-avg:null,tpHit,age,perDay:age?avg/age:null,vsBase:avg-baseAvg,ex:exs.length?mean(exs):null,exN:exs.length,beat:exs.length?exs.filter(v=>v>0).length/exs.length*100:null};
  }).filter(Boolean);
  return {rows,baseAvg,nAll:allPl.length,tpPct,mode,cost};
}
const rel=r=>r.n<5?["⚠ sangat kecil","var(--down,#ef4444)"]:r.n<10?["⚠ kecil","#f59e0b"]:r.n<20?["cukup","var(--muted,#888)"]:["memadai","var(--up,#10b981)"];
const pf=v=>v==null?"-":v===Infinity?"∞":v.toFixed(2);
function vLB(){
  const d=lbCompute();
  const ctl=`<div class="ex-chips" style="align-items:center"><span class="ex-mut">Kelompokkan:</span>${[["kriteria","Per Kriteria/Preset"],["sumber","Per Sumber"]].map(([id,l])=>`<button class="ex-chip${LB.by===id?" on":""}" data-act="lbBy" data-id="${id}">${l}</button>`).join("")}
  <span class="ex-mut" style="margin-left:10px">Min. sinyal agar masuk peringkat:</span>${MIN_OPTS.map(m=>`<button class="ex-chip${LB.min===m?" on":""}" data-act="lbMin" data-id="${m}">${m}</button>`).join("")}</div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 10px"><label class="ex-mut">Biaya + slippage bolak-balik (%): <input id="ex-lb-cost" type="number" step="0.05" min="0" value="${lbCost()}" style="width:70px"> <span>(dibagi dengan tab Uji Resep)</span></label>
  <button class="ex-btn" style="margin:0" data-act="lbHist">📥 Muat riwayat harga Backtest</button><button class="ex-btn pri" style="margin:0" data-act="lbBench" ${BM.busy?"disabled":""}>📈 ${BM.map?"Hitung ulang":"Hitung"} benchmark pasar</button>
  <span class="ex-mut">${BM.busy?"mengambil riwayat harga semua saham…":BM.err?`<span class="ex-dn">${E(BM.err)}</span>`:BM.map?`benchmark: rata-rata ±${BM.tk} saham likuid (≥ Rp1 M), dihitung ${E(ago(BM.at))}`:"benchmark belum dihitung"}</span></div>`;
  if(d.err) return `<div class="ex-card"><h3>🏅 Peringkat Uji Maju</h3>${ctl}<p class="ex-mut">${E(d.err)}</p></div>`;
  const key=LB.sort, dir=LB.dir;
  const ok=d.rows.filter(r=>r.n>=LB.min), low=d.rows.filter(r=>r.n<LB.min);
  const val=r=>{ const v=r[key]; return v==null?-Infinity:(typeof v==="string"?v.toLowerCase():v===Infinity?1e12:v); };
  const sorter=(a,b)=>{ const x=val(a),y=val(b); return (x<y?-1:x>y?1:0)*dir; };
  ok.sort(sorter); low.sort((a,b)=>b.n-a.n);
  const rankBy=ok.slice().sort((a,b)=>b.skor-a.skor), rank=new Map(rankBy.map((r,i)=>[r.label,i+1]));
  const medal=i=>i===1?"🥇":i===2?"🥈":i===3?"🥉":i;
  const th=(k,l,tip)=>`<th class="srt" data-act="lbSort" data-k="${k}" title="${E(tip||"")}">${l}${key===k?(dir<0?" ▼":" ▲"):""}</th>`;
  const lab=t=>typeof compactScreenerLabel==="function"&&LB.by==="kriteria"?compactScreenerLabel(t):t;
  const tr=(r,ranked)=>{
    const [rl,rc]=rel(r), open=lbOpen.has(r.label), sorted=r.occ.slice().sort((a,b)=>b.pl-a.pl);
    const det=open?`<tr><td colspan="15" style="padding:8px 12px;background:rgba(127,127,127,.06)"><div class="ex-mut" style="margin-bottom:6px;white-space:normal;word-break:break-word">${E(r.label)}</div>
      <div class="ex-mut">Terbaik: ${sorted.slice(0,3).map(o=>`${E(o.ticker)} <span class="${cls(o.pl)}">${pc(o.pl)}</span> (${fmtD(String(o.entryDate||"").slice(0,10))})`).join(" · ")}</div>
      <div class="ex-mut">Terburuk: ${sorted.slice(-3).reverse().map(o=>`${E(o.ticker)} <span class="${cls(o.pl)}">${pc(o.pl)}</span> (${fmtD(String(o.entryDate||"").slice(0,10))})`).join(" · ")}</div></td></tr>`:"";
    return `<tr${ranked?"":' style="opacity:.55"'}><td>${ranked?medal(rank.get(r.label)):"–"}</td>
      <td style="max-width:300px;white-space:normal;word-break:break-word"><span class="ex-link" data-act="lbOpen" data-id="${E(r.label)}">${E(lab(r.label))}</span></td>
      <td>${r.n}<div class="ex-mut">${r.days} hari entry · ${r.tickers} ticker</div></td>
      <td style="color:${rc}" title="Makin banyak sinyal & makin beragam hari entry, makin layak dipercaya">${rl}${r.days<3?`<div class="ex-warn" style="font-size:11px">bergerombol (&lt;3 hari entry)</div>`:""}</td>
      <td>${r.win.toFixed(0)}%<div class="ex-mut">batas bawah ${r.wlow==null?"-":r.wlow.toFixed(0)+"%"}</div></td>
      <td class="${cls(r.avg)}"><b>${pc(r.avg)}</b></td><td class="${cls(r.med)}">${pc(r.med)}</td>
      <td class="${cls(r.skor)}"><b>${pc(r.skor)}</b></td><td>${pf(r.pf)}</td>
      <td class="${cls(r.vsBase)}">${pc(r.vsBase)}</td><td class="${r.ex==null?"":cls(r.ex)}">${r.ex==null?"-":pc(r.ex)}${r.ex!=null&&r.exN<r.n?`<div class="ex-mut">${r.exN}/${r.n} sinyal</div>`:""}</td><td>${r.beat==null?"-":r.beat.toFixed(0)+"%"}</td>
      <td>${r.tpHit==null?"-":r.tpHit.toFixed(0)+"%"}</td>
      <td title="Rata-rata P/L tertinggi yang sempat tercapai dikurangi P/L sekarang">${r.giveback==null?"-":pc(r.giveback)}</td>
      <td>${r.age==null?"-":r.age.toFixed(0)+" hr"}</td></tr>${det}`;
  };
  const head=`<tr><th>#</th>${th("label","Kriteria / Sumber")}${th("n","Sinyal","Jumlah sinyal dengan P/L terhitung")}<th>Keandalan</th>${th("win","Win rate","Batas bawah = Wilson 90%, estimasi pesimis win rate")}${th("avg","Rata² P/L")}${th("med","Median")}${th("skor","Skor konservatif","Rata² P/L dikurangi galat baku (sd/√n). Dasar peringkat 🥇🥈🥉")}${th("pf","Profit factor","Total untung ÷ total rugi")}${th("vsBase","vs semua sinyal","Selisih rata² P/L terhadap rata-rata seluruh sinyal tersimpan")}${th("ex","vs pasar","Rata² (P/L − return rata-rata saham likuid sejak tanggal entry yang sama). Perlu “Hitung benchmark pasar”")}${th("beat","Menang vs pasar","Porsi sinyal yang mengalahkan benchmark")}${th("tpHit","TP tercapai")}${th("giveback","Keuntungan terlepas","Rata² puncak P/L − P/L sekarang")}${th("age","Umur rata²")}</tr>`;
  const warnN=ok.length&&ok.every(r=>r.n<10);
  return `<div class="ex-card"><h3>🏅 Peringkat Uji Maju — sumber/kriteria screener</h3>
  <p class="ex-mut">Dihitung dari ${d.nAll} sinyal di sesi Backtest (P/L closing = harga entry → harga sekarang, setelah memuat riwayat). Semua P/L sudah dikurangi biaya ${d.cost}% per transaksi. Rata-rata seluruh sinyal: <b class="${cls(d.baseAvg)}">${pc(d.baseAvg)}</b>. Peringkat memakai <b>skor konservatif</b> (rata² − galat baku), bukan rata² mentah, supaya satu sinyal untung besar tidak langsung jadi juara.</p>
  ${ctl}${warnN?`<p class="ex-warn">⚠ Semua yang masuk peringkat punya &lt; 10 sinyal. Anggap urutan ini hipotesis, bukan bukti.</p>`:""}
  <div class="ex-wrap"><table class="ex-tbl">${head}${ok.map(r=>tr(r,true)).join("")||`<tr><td colspan="15" class="ex-mut">Belum ada yang punya ≥ ${LB.min} sinyal. Turunkan batas minimum di atas.</td></tr>`}${low.length?`<tr><td colspan="15" class="ex-mut" style="padding-top:14px">Belum cukup sampel (&lt; ${LB.min} sinyal) — tidak diberi peringkat:</td></tr>${low.map(r=>tr(r,false)).join("")}`:""}</table></div>
  <button class="ex-btn" data-act="lbCsv">⬇ CSV</button>
  <p class="ex-mut" style="margin-top:10px"><b>Cara membaca & batasan:</b> (1) Sinyal dari sesi yang berdekatan sering saham yang sama dan bergerak bersamaan, jadi tidak sepenuhnya independen — lihat “hari entry”. (2) Saham yang sudah tak ada di screener tanpa riwayat harga dikeluarkan (P/L kosong), jadi hasil cenderung sedikit optimis. (3) “vs pasar” membandingkan dengan rata-rata return saham likuid (≥ Rp1 M) sejak tanggal entry yang sama (bukan IHSG); saham yang sudah delisting/tak likuid tidak ikut. (4) Target TP mengikuti pengaturan di tab Backtest (${d.mode==="auto"?"Auto TP1":d.tpPct+"%"}).</p></div>`;
}
X.act("lbBy",el=>{ LB.by=el.dataset.id; lbOpen.clear(); saveLB(); X.repaint(); });
X.act("lbMin",el=>{ LB.min=+el.dataset.id; saveLB(); X.repaint(); });
X.act("lbSort",el=>{ const k=el.dataset.k; if(LB.sort===k) LB.dir=-LB.dir; else { LB.sort=k; LB.dir=k==="label"?1:-1; } saveLB(); X.repaint(); });
X.act("lbOpen",el=>{ const id=el.dataset.id; lbOpen.has(id)?lbOpen.delete(id):lbOpen.add(id); X.repaint(); });
X.act("lbBench",()=>loadBench());
X.act("lbHist",async()=>{ if(typeof loadBacktestPriceHistory!=="function"){ toast("Fungsi riwayat harga Backtest tidak ditemukan","down"); return; }
  toast("Memuat riwayat harga Backtest…"); try{ await loadBacktestPriceHistory(); }catch(e){ toast("Gagal: "+e.message,"down"); return; } setTimeout(rpl,800); });
X.onChange(e=>{ if(e.target.id!=="ex-lb-cost") return; const v=parseFloat(e.target.value); SV("pbt_cost",isFinite(v)&&v>=0?v:0); X.repaint(); });
X.act("lbCsv",()=>{
  const d=lbCompute(); if(d.err){ toast(d.err,"down"); return; }
  const c=v=>{ const s=String(v==null?"":v); return /[",\n;]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; };
  const out=[["Kelompok","Label","Sinyal","Hari entry","Ticker","Win %","Rata2 P/L %","Median %","Skor konservatif","Profit factor","vs semua sinyal %","TP tercapai %","Keuntungan terlepas %","Umur rata2 (hari)","vs pasar %","Menang vs pasar %"]];
  d.rows.slice().sort((a,b)=>b.skor-a.skor).forEach(r=>out.push([LB.by,r.label,r.n,r.days,r.tickers,r.win.toFixed(1),r.avg.toFixed(2),r.med.toFixed(2),r.skor.toFixed(2),r.pf==null?"":r.pf===Infinity?"inf":r.pf.toFixed(2),r.vsBase.toFixed(2),r.tpHit==null?"":r.tpHit.toFixed(0),r.giveback==null?"":r.giveback.toFixed(2),r.age==null?"":r.age.toFixed(0),r.ex==null?"":r.ex.toFixed(2),r.beat==null?"":r.beat.toFixed(0)]));
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob(["\uFEFF"+out.map(r=>r.map(c).join(",")).join("\n")],{type:"text/csv"})); a.download=`peringkat-uji-maju-${X.today()}.csv`; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
});
X.addTab("lb","🏅 Peringkat",vLB);
})();
