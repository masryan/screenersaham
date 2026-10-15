// extras-gap.js — Gap Up & Go untuk IHSG Screener Pro. Dimuat SETELAH extras.js (dan extras-plus.js / extras-status.js).
// Tidak mengubah app.js. Menambah tab "⛽ Gap Up & Go" di Trader Tools:
//   1) Scanner saham gap up yang bertahan, dengan skor 0–100 dan trade plan (entry / SL / TP1 / TP2).
//   2) Uji Maju: sinyal disimpan ke log; hasilnya dinilai otomatis dari data harian (tabel flows: open/high/low/close)
//      lengkap dengan HARGA KELUAR dan ALASAN KELUAR (SL, TP1, batas waktu), atau bisa diisi manual.
//   3) Statistik: win rate, profit factor, rata-rata R, sebaran alasan keluar, dan apakah skor tinggi memang lebih baik.
//   4) Tombol kirim ke tab Backtest (agar ikut Peringkat) dan CSV.
// Data disimpan di localStorage (prefix "ex_", kunci "gug").
(function(){
"use strict";
const X=window.ExtrasAPI;
if(!X){ console.warn("[extras-gap] ExtrasAPI tidak ditemukan — pastikan extras.js dimuat sebelum file ini."); return; }
const {E,LS,SV,ST,PX,pc,cls,toast,snapTick}=X;
const N=v=>{ if(v==null||v==="") return null; const n=+v; return isNaN(n)?null:n; };
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const median=a=>{ const b=[...a].sort((x,y)=>x-y), m=b.length>>1; return b.length%2?b[m]:(b[m-1]+b[m])/2; };
const fx=(v,d)=>N(v)==null?"-":N(v).toFixed(d==null?2:d);
const rp=n=>n==null||isNaN(n)?"-":new Intl.NumberFormat("id-ID").format(Math.round(n));
const compact=v=>{ const n=N(v); if(n==null) return "-"; const a=Math.abs(n); return a>=1e12?(n/1e12).toFixed(1)+" T":a>=1e9?(n/1e9).toFixed(1)+" M":a>=1e6?(n/1e6).toFixed(0)+" Jt":String(Math.round(n)); };
const cost=()=>{ const c=parseFloat(LS("pbt_cost",0.5)); return isFinite(c)&&c>=0?c:0; }; // dibagi dengan Uji Resep & Peringkat
const link=t=>`<span class="ex-link" data-act="xDetail" data-t="${E(t)}">${E(t)}</span>`;

/* ================= WAKTU BURSA (WIB) ================= */
function wib(ts){ const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false,weekday:"short"}).formatToParts(new Date(ts)); const g=t=>(p.find(x=>x.type===t)||{}).value; return {date:`${g("year")}-${g("month")}-${g("day")}`,h:+g("hour")%24,m:+g("minute")}; }
const shift=(ds,n)=>{ const d=new Date(ds+"T00:00:00Z"); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };
const isWd=ds=>{ const w=new Date(ds+"T00:00:00Z").getUTCDay(); return w>0&&w<6; };
const prevTr=ds=>{ let d=shift(ds,-1); while(!isWd(d)) d=shift(d,-1); return d; };
// Tanggal data yang sedang dipegang aplikasi + apakah sesi masih berjalan (data bisa belum final).
function sigInfo(){ const w=wib(Date.now()), t=w.h*60+w.m, wd=isWd(w.date);
  if(!wd) return {date:prevTr(w.date),live:false};
  if(t>=16*60+30) return {date:w.date,live:false};
  if(t>=9*60) return {date:w.date,live:true};
  return {date:prevTr(w.date),live:false}; }

/* ================= PENGATURAN ================= */
const DEF={gap:2,vol:1.2,liq:5e9,minPx:100,hold:3,mode:"open",top:10,minScore:60};
const G=()=>{ const g=LS("gug",null)||{}; if(!Array.isArray(g.trades)) g.trades=[]; g.cfg=Object.assign({},DEF,g.cfg||{}); return g; };
const saveG=g=>SV("gug",g);

/* ================= SKOR & TRADE PLAN ================= */
const araPct=px=>typeof qhAraLimit==="function"?qhAraLimit(px):(px<50?35:px<200?25:px<=5000?20:15);
function gapScore(g){ return g<1?0:g<2?(g-1)*12:g<=5?12+(g-2)/3*13:g<=8?25-(g-5)*3:Math.max(4,16-(g-8)*3); }
function evalStock(s,c){
  const op=N(s.cOpen),cl=PX(s),hi=N(s.cHigh),lo=N(s.cLow),pv=N(s.prevClose);
  if(!(op>0&&cl>0&&pv>0)||s.suspended) return null;
  const gap=(op-pv)/pv*100, chg=N(s.changePct)!=null?N(s.changePct):(cl-pv)/pv*100;
  const liq=N(s.turnover)!=null?N(s.turnover):N(s.valueTraded);
  const rng=(hi>0&&lo>0&&hi>lo)?(cl-lo)/(hi-lo):1, fromOpen=(cl-op)/op*100, filled=lo!=null&&lo<=pv;
  const vr=N(s.volRatio)!=null?N(s.volRatio):(N(s.cVol)>0&&N(s.volMA20)>0?N(s.cVol)/N(s.volMA20):null);
  const lock=chg>=araPct(pv)-0.5;
  const sGap=gapScore(gap), sHold=Math.max(0,(cl>=op?12:0)+rng*13-(filled?8:0)), sVol=vr==null?6:vr<1?0:Math.min(20,(vr-1)/2*20);
  const sLiq=liq==null?0:liq>=2e10?10:liq>=c.liq?6+(liq-c.liq)/(2e10-c.liq)*4:liq/c.liq*6;
  const m21=N(s.ma21),m50=N(s.ma50), sTr=(m21!=null&&cl>m21?4:0)+(m50!=null&&cl>m50?3:0)+(m21!=null&&m50!=null&&m21>m50?3:0);
  const sExt=lock?0:chg<=0?2:chg<=8?10:chg<=12?6:3;
  const score=Math.round(Math.max(0,Math.min(100,sGap+sHold+sVol+sLiq+sTr+sExt)));
  // Trade plan: SL di bawah low hari sinyal (kegagalan gap), risiko dibatasi 2–6%; TP berbasis kelipatan risiko.
  const atr=N(s.atr14)||cl*0.02;
  let sl=Math.max((lo!=null?lo:cl*0.97)-0.3*atr,cl*0.94); sl=Math.min(sl,cl*0.98);
  const slPct=(cl-sl)/cl*100;
  return {t:s.ticker,s,px:cl,gap,chg,fromOpen,rng,vr,liq,lock,filled,score,slPct,tp1Pct:slPct*1.5,tp2Pct:slPct*2.5,
    parts:{gap:sGap,hold:sHold,vol:sVol,liq:sLiq,trend:sTr,ext:sExt}};
}
function scan(){
  const c=G().cfg, out=[]; let locked=0;
  (ST().stocks||[]).forEach(s=>{
    if(!s||!s.ticker) return; const px=PX(s); if(!(px>=c.minPx)) return;
    const liq=N(s.turnover)!=null?N(s.turnover):N(s.valueTraded); if(!(liq>=c.liq)) return;
    const r=evalStock(s,c); if(!r) return;
    if(r.gap<c.gap||r.px<N(s.cOpen)||(r.vr!=null&&r.vr<c.vol)) return; // gap cukup besar, bertahan (close ≥ open), volume mendukung
    if(r.lock){ locked++; return; }
    out.push(r);
  });
  out.sort((a,b)=>b.score-a.score); out.locked=locked; return out;
}
const plan=r=>({sl:snapTick(r.px*(1-r.slPct/100),"down"),tp1:snapTick(r.px*(1+r.tp1Pct/100),"up"),tp2:snapTick(r.px*(1+r.tp2Pct/100),"up")});

/* ================= LOG UJI MAJU ================= */
function addTrades(rs,quiet){
  const g=G(), si=sigInfo(); let n=0;
  rs.forEach(r=>{ if(g.trades.some(x=>x.t===r.t&&x.sd===si.date)) return;
    g.trades.push({id:si.date+"-"+r.t,t:r.t,sd:si.date,score:r.score,gap:+r.gap.toFixed(2),vr:r.vr==null?null:+r.vr.toFixed(2),ref:r.px,slPct:+r.slPct.toFixed(2),tp1Pct:+r.tp1Pct.toFixed(2),tp2Pct:+r.tp2Pct.toFixed(2),mode:g.cfg.mode,hold:g.cfg.hold,live:si.live,man:null,res:null}); n++; });
  saveG(g); if(!quiet) toast(n?`${n} sinyal disimpan ke Uji Maju (tanggal sinyal ${si.date})`:"Sinyal sudah ada di log","up"); return n;
}
let EV={busy:false,at:0,err:null};
const rpg=()=>{ if(X.current()==="gug") X.repaint(); };
async function fetchBars(trades){
  if(typeof SUPABASE_URL==="undefined"||!SUPABASE_URL) throw new Error("Supabase belum dikonfigurasi (Pengaturan).");
  const since=trades.map(t=>t.sd).sort()[0], tk=[...new Set(trades.map(t=>t.t))], H={};
  for(let i=0;i<tk.length;i+=60){ const chunk=tk.slice(i,i+60);
    for(let pg=0;pg<40;pg++){
      const qs=new URLSearchParams({ticker:`in.(${chunk.join(",")})`,date:`gt.${since}`,select:"ticker,date,open_price,high,low,close,src",order:"date.asc,ticker.asc",limit:"1000",offset:String(pg*1000)});
      const r=await fetch(`${SUPABASE_URL}/flows?${qs}`,{headers:getSupaHeaders(),cache:"no-store"}); if(!r.ok) throw new Error("HTTP "+r.status);
      const part=await r.json(); if(!Array.isArray(part)) throw new Error("respons bukan array");
      part.forEach(b=>{ if(b.close==null) return; const arr=H[b.ticker]||(H[b.ticker]=[]), d=String(b.date).slice(0,10), bar={d,o:N(b.open_price),h:N(b.high),l:N(b.low),c:+b.close,sb:b.src==="stockbit"}, i=arr.findIndex(x=>x.d===d);
        if(i<0) arr.push(bar); else if(arr[i].sb&&!bar.sb) arr[i]=bar; }); // satu bar per tanggal; data resmi IDX menang atas susulan Stockbit
      if(part.length<1000) break; } }
  return H;
}
// Simulasi satu sinyal pada bar harian setelah tanggal sinyal. Aturan konservatif: bila SL dan TP1 sama-sama
// tersentuh di hari yang sama, dianggap SL lebih dulu (urutan intraday tidak diketahui dari data harian).
function simulate(t,bars){
  const b=bars.filter(x=>x.d>t.sd); if(!b.length) return {status:"wait"};
  const open=t.mode==="open"; let entry=open?(b[0].o!=null?b[0].o:b[0].c):t.ref;
  const sl=snapTick(entry*(1-t.slPct/100),"down"), tp1=snapTick(entry*(1+t.tp1Pct/100),"up");
  let hi=entry, lo=entry;
  for(let i=0;i<b.length;i++){ const x=b[i], day=i+1, first=open&&i===0;
    hi=Math.max(hi,x.h!=null?x.h:x.c); lo=Math.min(lo,x.l!=null?x.l:x.c);
    const low=x.l!=null?x.l:x.c, high=x.h!=null?x.h:x.c, o=x.o!=null?x.o:x.c; let ex=null,why=null;
    if(!first&&o<=sl){ ex=o; why="Stop loss (gap turun)"; }
    else if(low<=sl&&high>=tp1){ ex=sl; why="Stop loss (SL & TP1 di hari sama, diasumsikan SL)"; }
    else if(low<=sl){ ex=sl; why="Stop loss"; }
    else if(!first&&o>=tp1){ ex=o; why="TP1 (gap naik)"; }
    else if(high>=tp1){ ex=tp1; why="TP1 tercapai"; }
    else if(day>=t.hold){ ex=x.c; why=`Batas waktu ${t.hold} hari`; }
    if(ex!=null) return {status:"closed",entry,ed:b[0].d,exit:ex,xd:x.d,why,days:day,mfe:(hi/entry-1)*100,mae:(lo/entry-1)*100,auto:true}; }
  const last=b[b.length-1]; return {status:"open",entry,ed:b[0].d,exit:last.c,xd:last.d,why:"Masih berjalan (harga penutupan terakhir)",days:b.length,mfe:(hi/entry-1)*100,mae:(lo/entry-1)*100,auto:true};
}
async function evaluate(){
  if(EV.busy) return; const g=G(), todo=g.trades.filter(t=>!(t.res&&t.res.status==="closed")&&!t.man);
  if(!todo.length){ toast("Semua sinyal sudah selesai / diisi manual","up"); return; }
  EV.busy=true; EV.err=null; rpg();
  try{ const H=await fetchBars(todo); let c=0;
    todo.forEach(t=>{ const r=simulate(t,H[t.t]||[]); if(r.status!=="wait"){ t.res=r; if(r.status==="closed") c++; } else t.res={status:"wait"}; });
    saveG(g); EV.at=Date.now(); toast(`Evaluasi selesai: ${c} sinyal ditutup`); }
  catch(e){ EV.err=e.message; }
  EV.busy=false; rpg();
}
// Hasil efektif satu sinyal: manual > otomatis.
function outcome(t){
  if(t.man&&N(t.man.px)>0){ const en=t.res&&t.res.entry?t.res.entry:t.ref; const gross=(t.man.px/en-1)*100;
    return {status:"closed",entry:en,exit:+t.man.px,why:t.man.why||"Manual",pl:gross-cost(),gross,manual:true,days:null}; }
  const r=t.res; if(!r||r.status==="wait") return {status:"wait"};
  const gross=(r.exit/r.entry-1)*100; return Object.assign({},r,{pl:gross-cost(),gross});
}

/* ================= STATISTIK ================= */
function stats(){
  const g=G(), cl=g.trades.map(t=>({t,o:outcome(t)})).filter(x=>x.o.status==="closed");
  if(!cl.length) return null;
  const pl=cl.map(x=>x.o.pl), wins=pl.filter(v=>v>0), loss=pl.filter(v=>v<0), gw=wins.reduce((a,b)=>a+b,0), gl=-loss.reduce((a,b)=>a+b,0);
  const R=cl.map(x=>x.o.pl/x.t.slPct), why={};
  cl.forEach(x=>{ const k=String(x.o.why).replace(/\s*\(.*\)$/,"").replace(/\d+ hari/,"N hari"); (why[k]||(why[k]={n:0,s:0})); why[k].n++; why[k].s+=x.o.pl; });
  const bucket=(f,defs)=>defs.map(([l,fn])=>{ const a=cl.filter(x=>fn(f(x))).map(x=>x.o.pl); return {l,n:a.length,avg:a.length?mean(a):null,win:a.length?a.filter(v=>v>0).length/a.length*100:null}; });
  return {n:cl.length,open:g.trades.length-cl.length,win:wins.length/cl.length*100,avg:mean(pl),med:median(pl),pf:gl>0?gw/gl:(gw>0?Infinity:null),avgR:mean(R),why,
    byScore:bucket(x=>x.t.score,[["Skor ≥ 70",v=>v>=70],["Skor 60–69",v=>v>=60&&v<70],["Skor &lt; 60",v=>v<60]]),
    byGap:bucket(x=>x.t.gap,[["Gap 2–3%",v=>v<3],["Gap 3–5%",v=>v>=3&&v<5],["Gap ≥ 5%",v=>v>=5]])};
}
const pf=v=>v==null?"-":v===Infinity?"∞":v.toFixed(2);
function statsHtml(S){
  if(!S) return `<p class="ex-mut">Belum ada sinyal yang selesai. Simpan kandidat ke Uji Maju, tunggu hari bursa berikutnya, lalu klik “Evaluasi otomatis”.</p>`;
  const bt=a=>a.map(b=>`<tr><td>${b.l}</td><td>${b.n}</td><td>${b.win==null?"-":b.win.toFixed(0)+"%"}</td><td class="${b.avg==null?"":cls(b.avg)}">${b.avg==null?"-":pc(b.avg)}</td></tr>`).join("");
  return `<table class="ex-tbl"><tr><td>Sinyal selesai / masih berjalan</td><td><b>${S.n}</b> / ${S.open}</td><td>Win rate</td><td><b>${S.win.toFixed(0)}%</b></td></tr>
  <tr><td>Rata² P/L (net biaya ${cost()}%)</td><td class="${cls(S.avg)}"><b>${pc(S.avg)}</b></td><td>Median</td><td class="${cls(S.med)}">${pc(S.med)}</td></tr>
  <tr><td>Profit factor</td><td>${pf(S.pf)}</td><td>Rata² R (P/L ÷ jarak SL)</td><td class="${cls(S.avgR)}">${S.avgR.toFixed(2)} R</td></tr></table>
  ${S.n<20?`<p class="ex-warn">⚠ Baru ${S.n} sinyal selesai. Di bawah ±20 sinyal, anggap angka ini gambaran awal, bukan bukti.</p>`:""}
  <div class="ex-grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:10px">
  <div class="ex-wrap"><table class="ex-tbl"><tr><th>Alasan keluar</th><th>Jumlah</th><th>Rata² P/L</th></tr>${Object.keys(S.why).sort((a,b)=>S.why[b].n-S.why[a].n).map(k=>`<tr><td>${E(k)}</td><td>${S.why[k].n} (${(S.why[k].n/S.n*100).toFixed(0)}%)</td><td class="${cls(S.why[k].s)}">${pc(S.why[k].s/S.why[k].n)}</td></tr>`).join("")}</table></div>
  <div class="ex-wrap"><table class="ex-tbl"><tr><th>Kelompok</th><th>n</th><th>Win</th><th>Rata² P/L</th></tr>${bt(S.byScore)}${bt(S.byGap)}</table></div></div>`;
}

/* ================= TAMPILAN ================= */
const dt=d=>d?String(d).slice(8,10)+"/"+String(d).slice(5,7):"-";
let SORT={k:"score",d:-1};
function vGug(){
  const g=G(), c=g.cfg, si=sigInfo(), R=scan(), S=stats();
  const stk=(ST().stocks||[]);
  const need=!stk.length||!stk.some(s=>N(s.cOpen)>0&&N(s.prevClose)>0);
  const val=r=>{ const v=r[SORT.k]; return v==null?-Infinity:v; };
  R.sort((a,b)=>(val(a)<val(b)?-1:val(a)>val(b)?1:0)*SORT.d);
  const th=(k,l,tip)=>`<th class="srt" data-act="gugSort" data-k="${k}" title="${E(tip||"")}">${l}${SORT.k===k?(SORT.d<0?" ▼":" ▲"):""}</th>`;
  const inp=(id,l,v,st)=>`<label>${l}<input id="ex-gug-${id}" type="number" step="${st||"any"}" value="${v}"></label>`;
  const cand=R.slice(0,60).map(r=>{ const p=plan(r); return `<tr><td>${link(r.t)}</td><td>${rp(r.px)}</td><td class="ex-up">${pc(r.gap)}</td><td class="${cls(r.fromOpen)}">${pc(r.fromOpen)}</td><td>${(r.rng*100).toFixed(0)}%</td><td>${r.vr==null?"-":r.vr.toFixed(1)+"x"}</td><td>${compact(r.liq)}</td>
    <td title="Gap ${r.parts.gap.toFixed(0)}/25 · Bertahan ${r.parts.hold.toFixed(0)}/25 · Volume ${r.parts.vol.toFixed(0)}/20 · Likuiditas ${r.parts.liq.toFixed(0)}/10 · Tren ${r.parts.trend.toFixed(0)}/10 · Tidak kejauhan ${r.parts.ext.toFixed(0)}/10"><b>${r.score}</b></td>
    <td>${rp(r.px)}</td><td class="ex-dn">${rp(p.sl)} <span class="ex-mut">(-${r.slPct.toFixed(1)}%)</span></td><td class="ex-up">${rp(p.tp1)}</td><td class="ex-up">${rp(p.tp2)}</td><td><button class="ex-btn sm" data-act="gugAdd" data-t="${E(r.t)}">➕ Uji Maju</button></td></tr>`; }).join("");
  const logRows=g.trades.slice().sort((a,b)=>b.sd.localeCompare(a.sd)||b.score-a.score).map(t=>{ const o=outcome(t), st=o.status;
    const sTxt=st==="closed"?`<span class="${cls(o.pl)}"><b>${pc(o.pl)}</b></span>`:st==="open"?`<span class="ex-mut">berjalan ${t.res&&t.res.exit&&t.res.entry?pc((t.res.exit/t.res.entry-1)*100-cost()):""}</span>`:`<span class="ex-mut">menunggu data</span>`;
    return `<tr><td>${dt(t.sd)}</td><td>${link(t.t)}${t.live?` <span class="ex-warn" title="Disimpan saat sesi masih berjalan; data bisa berubah di penutupan">*</span>`:""}</td><td>${t.score}</td><td>${t.gap>=0?"+":""}${t.gap}%</td>
      <td>${o.entry?rp(o.entry):`<span class="ex-mut">${t.mode==="open"?"open besok":rp(t.ref)}</span>`}</td><td>${o.exit&&st!=="wait"?rp(o.exit):"-"}</td><td style="white-space:normal;min-width:150px">${st==="wait"?"-":E(o.why||"")}${o.manual?" ✍️":""}</td><td>${sTxt}</td>
      <td style="white-space:nowrap"><input id="ex-gug-mx-${E(t.id)}" class="ex-in" style="width:84px;display:inline-block" type="number" placeholder="harga keluar" value="${t.man?t.man.px:""}"> <select id="ex-gug-mw-${E(t.id)}" class="ex-in" style="width:104px;display:inline-block">${["Take profit","Cut loss","Batas waktu","Lainnya"].map(w=>`<option${t.man&&t.man.why===w?" selected":""}>${w}</option>`).join("")}</select>
      <button class="ex-btn sm" data-act="gugMan" data-id="${E(t.id)}">Simpan</button> <button class="ex-btn sm" data-act="gugDel" data-id="${E(t.id)}" title="Hapus">✕</button></td></tr>`; }).join("");
  return `<div class="ex-card"><h3>⛽ Gap Up & Go — kandidat & uji maju</h3>
  <p class="ex-mut">Saham yang <b>buka gap up</b> (open ≥ penutupan kemarin + ambang), <b>bertahan</b> (harga ≥ open), didukung volume dan likuiditas, belum terkunci ARA. Skor 0–100 menggabungkan ukuran gap, kualitas bertahan, volume, likuiditas, tren, dan tidak kejauhan naik. Arahkan kursor ke skor untuk melihat rinciannya. Ini penyaring kandidat, <b>bukan rekomendasi</b>.</p>
  <p class="ex-mut">Tanggal sinyal: <b>${si.date}</b>${si.live?` <span class="ex-warn">— sesi masih berjalan, angka belum final. Simpan setelah ±16:30 WIB untuk data penutupan.</span>`:""}${need?` <span class="ex-warn">— data open/penutupan kemarin belum termuat; klik “Refresh Data”.</span>`:""}</p>
  <div class="ex-grid">${inp("gap","Gap minimum (%)",c.gap,"0.1")}${inp("vol","Volume min (× rata²)",c.vol,"0.1")}${inp("liq","Nilai transaksi min (Rp)",c.liq,"1e8")}${inp("minPx","Harga min",c.minPx)}${inp("hold","Batas waktu (hari bursa)",c.hold,"1")}
  <label>Entry uji maju<select id="ex-gug-mode"><option value="open"${c.mode==="open"?" selected":""}>Open besok (default)</option><option value="close"${c.mode==="close"?" selected":""}>Harga sinyal</option></select></label>
  ${inp("top","Simpan massal: jumlah teratas",c.top,"1")}${inp("minScore","Simpan massal: skor min",c.minScore,"1")}</div>
  <button class="ex-btn pri" data-act="gugBulk">➕ Simpan massal ke Uji Maju</button><button class="ex-btn" data-act="gugBt">➜ Kirim top ke tab Backtest</button>
  <p class="ex-mut" style="margin-top:8px">“Open besok”: entry di harga open hari bursa setelah tanggal sinyal, SL/TP dihitung dari harga entry itu dengan jarak persen dari plan. “Harga sinyal”: entry di harga penutupan hari sinyal.</p></div>
  <div class="ex-card"><h3>Kandidat hari ini (${R.length}${R.locked?` · ${R.locked} terkunci ARA dikecualikan`:""})</h3>
  ${R.length?`<div class="ex-wrap"><table class="ex-tbl"><tr><th>Ticker</th>${th("px","Harga")}${th("gap","Gap")}${th("fromOpen","vs open","Harga sekarang dibanding open")}${th("rng","Posisi range","0% = di low, 100% = di high")}${th("vr","Volume")}${th("liq","Nilai")}${th("score","Skor")}<th>Entry ref</th><th>SL</th><th>TP1 (1,5R)</th><th>TP2 (2,5R)</th><th></th></tr>${cand}</table></div>${R.length>60?`<p class="ex-mut">Menampilkan 60 teratas dari ${R.length}.</p>`:""}`:`<p class="ex-mut">Tidak ada saham yang lolos. Longgarkan gap minimum, volume, atau nilai transaksi.</p>`}</div>
  <div class="ex-card"><h3>Uji Maju — log sinyal (${g.trades.length})</h3>
  <button class="ex-btn pri" data-act="gugEval" ${EV.busy?"disabled":""}>🔄 Evaluasi otomatis (data harian flows)</button><button class="ex-btn" data-act="gugCsv">⬇ CSV</button><button class="ex-btn" data-act="gugClr">🗑 Hapus semua</button>
  <span class="ex-mut">${EV.busy?"mengambil data harga…":EV.err?`<span class="ex-dn">${E(EV.err)}</span>`:EV.at?"dievaluasi "+Math.max(0,Math.round((Date.now()-EV.at)/60000))+" menit lalu":""}</span>
  ${g.trades.length?`<div class="ex-wrap" style="margin-top:10px"><table class="ex-tbl"><tr><th>Sinyal</th><th>Ticker</th><th>Skor</th><th>Gap</th><th>Entry</th><th>Harga keluar</th><th>Alasan keluar</th><th>P/L net</th><th>Catatan keluar manual</th></tr>${logRows}</table></div>
  <p class="ex-mut">Penilaian otomatis memakai bar harian: SL dan TP1 dicek terhadap low/high, dan bila keduanya tersentuh di hari yang sama dianggap <b>SL lebih dulu</b> (urutan intraday tidak diketahui). ✍️ = diisi manual, mengalahkan hasil otomatis (misalnya jika kamu keluar di harga lain).</p>`:`<p class="ex-mut" style="margin-top:8px">Belum ada sinyal. Klik ➕ pada kandidat atau “Simpan massal”.</p>`}</div>
  <div class="ex-card"><h3>Statistik hasil keluar</h3>${statsHtml(S)}</div>`;
}

/* ================= AKSI ================= */
X.act("gugSort",el=>{ const k=el.dataset.k; if(SORT.k===k) SORT.d=-SORT.d; else { SORT.k=k; SORT.d=-1; } X.repaint(); });
X.act("gugAdd",el=>{ const r=scan().find(x=>x.t===el.dataset.t); if(!r){ toast("Saham tidak lagi lolos","down"); return; } addTrades([r]); X.repaint(); });
X.act("gugBulk",()=>{ const c=G().cfg, R=scan().filter(r=>r.score>=c.minScore).slice(0,Math.max(1,c.top|0)); if(!R.length){ toast("Tidak ada kandidat yang memenuhi skor minimum","down"); return; }
  const si=sigInfo(); if(si.live&&!confirm("Sesi bursa masih berjalan, data belum final. Tetap simpan sebagai sinyal tanggal "+si.date+"?")) return;
  addTrades(R); X.repaint(); });
X.act("gugEval",()=>evaluate());
X.act("gugMan",el=>{ const g=G(), t=g.trades.find(x=>x.id===el.dataset.id); if(!t) return; const px=N((document.getElementById("ex-gug-mx-"+t.id)||{}).value), why=(document.getElementById("ex-gug-mw-"+t.id)||{}).value;
  t.man=px>0?{px,why}:null; saveG(g); toast(px>0?"Catatan keluar disimpan":"Catatan manual dihapus"); X.repaint(); });
X.act("gugDel",el=>{ const g=G(); g.trades=g.trades.filter(x=>x.id!==el.dataset.id); saveG(g); X.repaint(); });
X.act("gugClr",()=>{ if(!confirm("Hapus semua sinyal Uji Maju Gap Up & Go?")) return; const g=G(); g.trades=[]; saveG(g); X.repaint(); });
X.act("gugBt",async()=>{ const c=G().cfg, R=scan().filter(r=>r.score>=c.minScore).slice(0,Math.max(1,c.top|0));
  if(typeof saveGenericListToBacktest!=="function"||typeof state==="undefined"||!state.genericBacktestItems){ toast("Mekanisme Backtest app tidak ditemukan","down"); return; }
  if(!R.length){ toast("Tidak ada kandidat yang memenuhi skor minimum","down"); return; }
  if(!confirm(`Simpan ${R.length} saham Gap Up & Go ke tab Backtest dengan harga sekarang?`)) return;
  const ns="gapupgo", items=R.map(r=>({ticker:r.t,price:r.px,kriteria:"Gap Up & Go (skor ≥ "+c.minScore+")",keterangan:`Gap ${r.gap.toFixed(1)}% · skor ${r.score}`}));
  state.genericBacktestItems[ns]=items; const sel=getBacktestSelection(ns); sel.clear(); items.forEach(x=>sel.add(x.ticker));
  await saveGenericListToBacktest(ns,"Gap Up & Go"); });
X.act("gugCsv",()=>{ const g=G(), out=[["Tanggal sinyal","Ticker","Skor","Gap %","Mode","Entry","Harga keluar","Alasan keluar","P/L net %","Manual"]];
  g.trades.forEach(t=>{ const o=outcome(t); out.push([t.sd,t.t,t.score,t.gap,t.mode,o.entry||"",o.status==="wait"?"":o.exit,o.why||"",o.pl==null?"":o.pl.toFixed(2),o.manual?"ya":""]); });
  const c=v=>{ const s=String(v==null?"":v); return /[",\n;]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; };
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob(["\uFEFF"+out.map(r=>r.map(c).join(",")).join("\n")],{type:"text/csv"})); a.download=`gap-up-go-${X.today()}.csv`; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500); });
X.onChange(e=>{ const id=e.target.id||""; if(!/^ex-gug-(gap|vol|liq|minPx|hold|mode|top|minScore)$/.test(id)) return;
  const g=G(), k=id.slice(7), v=k==="mode"?e.target.value:parseFloat(e.target.value); if(k==="mode"||isFinite(v)) g.cfg[k]=v; saveG(g); X.repaint(); });
X.addTab("gug","⛽ Gap Up & Go",vGug);

/* ================= UNTUK MODUL LAIN (Peringkat) ================= */
window.ExtrasGap={ stats, summaryHtml(){ const S=stats(); return `<div class="ex-card"><h3>⛽ Gap Up & Go — hasil keluar (uji maju)</h3>${statsHtml(S)}<p class="ex-mut">Detail & log per sinyal ada di tab ⛽ Gap Up & Go.</p></div>`; } };
})();
