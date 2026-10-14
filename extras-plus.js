// extras-plus.js — modul tambahan Trader Tools untuk IHSG Screener Pro.
// Dimuat SETELAH extras.js (bergantung pada window.ExtrasAPI). Tidak mengubah app.js.
// Fitur: Uji Resep (forward test), Daftar (multi-watchlist), Peta Panas, Resep Guru + pantau preset, RS Rank,
//        Bandingkan (tabel + grafik performa), Dividen, Backup & Pulihkan.
// Semua data pengguna disimpan di localStorage (prefix "ex_"), sama seperti extras.js.
(function(){
"use strict";
const X=window.ExtrasAPI;
if(!X){ console.warn("[extras-plus] ExtrasAPI tidak ditemukan — pastikan extras.js dimuat sebelum file ini."); return; }
const {E,LS,SV,ST,stk,PX,rp,pc,num,val,toast,today,cls,openPos,notify}=X;
const $=s=>document.querySelector(s);
const N=v=>{ if(v==null||v==="") return null; const n=+v; return isNaN(n)?null:n; };
const fx=(v,d)=>N(v)==null?"-":N(v).toFixed(d==null?2:d);
const pcn=v=>N(v)==null?"-":pc(N(v));
const SS=()=>ST().stocks||[];
const liqOf=s=>{ const a=N(s.turnover); return a!=null?a:N(s.valueTraded); };
const trunc=(t,n)=>String(t||"").slice(0,n);
const compact=v=>{ const n=N(v); if(n==null) return "-"; const a=Math.abs(n);
  return a>=1e12?(n/1e12).toFixed(2)+" T":a>=1e9?(n/1e9).toFixed(2)+" M":a>=1e6?(n/1e6).toFixed(1)+" Jt":String(Math.round(n)); };
const link=t=>`<span class="ex-link" data-act="xDetail" data-t="${E(t)}">${E(t)}</span>`;
const parseT=txt=>[...new Set(String(txt||"").toUpperCase().split(/[^A-Z0-9]+/).filter(t=>/^[A-Z0-9]{4}$/.test(t)))];
const chips=(items,cur,act,key)=>`<div class="ex-chips">${items.map(([id,l])=>`<button class="ex-chip${id===cur?" on":""}" data-act="${act}" data-${key}="${E(id)}">${E(l)}</button>`).join("")}</div>`;
const sel=(id,items,cur)=>`<select id="${id}">${items.map(([v,l])=>`<option value="${E(v)}"${String(v)===String(cur)?" selected":""}>${E(l)}</option>`).join("")}</select>`;
function dl(name,text,type){ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([text],{type:type||"application/json"})); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500); }
const csvCell=v=>{ const s=String(v==null?"":v); return /[",\n;]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; };
const toCsv=rows=>"\uFEFF"+rows.map(r=>r.map(csvCell).join(",")).join("\n");
X.act("xDetail",el=>{ if(typeof openDetail==="function") openDetail(el.dataset.t); else toast("Detail emiten belum tersedia","down"); });

/* ================= RS RANK (komposit) ================= */
let _rsKey="",_rs={};
function rsMap(){
  const S=SS(); if(!S.length) return {};
  const key=S.length+":"+(S[0].updatedAt||"")+":"+S[0].cClose+":"+S[S.length-1].cClose;
  if(key===_rsKey) return _rs;
  const F=[["weekChangePct",10],["monthChangePct",30],["ytdPct",30],["week52ChangePct",30]], pct={};
  F.forEach(([f])=>{ const arr=S.map(s=>[s.ticker,N(s[f])]).filter(x=>x[1]!=null).sort((a,b)=>a[1]-b[1]), m={};
    arr.forEach((x,i)=>{ m[x[0]]=arr.length>1?i/(arr.length-1)*100:50; }); pct[f]=m; });
  const out={};
  S.forEach(s=>{ let w=0,a=0; F.forEach(([f,wt])=>{ const p=pct[f][s.ticker]; if(p!=null){ a+=p*wt; w+=wt; } });
    if(w>=30) out[s.ticker]=Math.max(1,Math.min(99,Math.round(a/w))); });
  _rsKey=key; _rs=out; return out;
}
const LIQ_OPTS=[["0","Semua saham"],["1e9","Nilai transaksi ≥ Rp1 M"],["5e9","Nilai transaksi ≥ Rp5 M"],["2e10","Nilai transaksi ≥ Rp20 M"]];
function vRS(){
  const f=LS("rsf",{liq:"1e9",sek:"",near:false}), rs=rsMap(), minL=+f.liq||0;
  const S=SS().filter(s=>rs[s.ticker]!=null&&(!minL||(liqOf(s)||0)>=minL)&&(!f.sek||s.sektor===f.sek)&&(!f.near||(N(s.high52w)>0&&PX(s)>=N(s.high52w)*0.9)));
  S.sort((a,b)=>rs[b.ticker]-rs[a.ticker]);
  const sektors=[...new Set(SS().map(s=>s.sektor).filter(Boolean))].sort();
  const sg={}; SS().forEach(s=>{ if(rs[s.ticker]==null||!s.sektor) return; if(minL&&(liqOf(s)||0)<minL) return; (sg[s.sektor]||(sg[s.sektor]={n:0,t:0})); sg[s.sektor].n++; sg[s.sektor].t+=rs[s.ticker]; });
  const sa=Object.keys(sg).filter(k=>sg[k].n>=3).map(k=>[k,sg[k].t/sg[k].n,sg[k].n]).sort((a,b)=>b[1]-a[1]).slice(0,12);
  const rows=S.slice(0,100).map(s=>{ const h=N(s.high52w), fromH=h>0&&PX(s)!=null?(PX(s)/h-1)*100:null;
    return `<tr><td>${link(s.ticker)}</td><td><b>${rs[s.ticker]}</b></td><td class="${cls(N(s.weekChangePct))}">${pcn(s.weekChangePct)}</td><td class="${cls(N(s.monthChangePct))}">${pcn(s.monthChangePct)}</td><td class="${cls(N(s.ytdPct))}">${pcn(s.ytdPct)}</td><td class="${cls(N(s.week52ChangePct))}">${pcn(s.week52ChangePct)}</td><td>${fromH==null?"-":fromH.toFixed(1)+"%"}</td><td>${fx(s.volRatio,2)}x</td><td class="ex-mut">${E(trunc(s.sektor,18))}</td></tr>`; }).join("");
  return `<div class="ex-card"><h3>🏆 RS Rank — kekuatan harga relatif (1–99)</h3>
  <p class="ex-mut">Peringkat persentil komposit dari kenaikan 1 minggu (10%), 1 bulan (30%), YTD (30%), dan 52 minggu (30%) terhadap seluruh saham yang datanya dimuat aplikasi. Konsepnya mirip RS Rating ala IBD/Minervini; ini perhitungan sendiri dari data yang ada, bukan angka resmi siapa pun.</p>
  <div class="ex-grid"><label>Likuiditas${sel("ex-rs-liq",LIQ_OPTS,f.liq)}</label><label>Sektor${sel("ex-rs-sek",[["","Semua sektor"],...sektors.map(x=>[x,x])],f.sek)}</label>
  <label>Dekat puncak 52 minggu<select id="ex-rs-near"><option value="0"${f.near?"":" selected"}>Semua</option><option value="1"${f.near?" selected":""}>≤ 10% dari puncak</option></select></label></div>
  <button class="ex-btn pri" data-act="rsApply">Terapkan</button></div>
  <div class="ex-card"><h3>Sektor terkuat (rata-rata RS)</h3><table class="ex-tbl">${sa.map(([k,v,n])=>`<tr><td>${E(k)}</td><td style="width:45%"><div class="ex-bar" style="width:${v}%"></div></td><td>${v.toFixed(0)}</td><td class="ex-mut">${n} saham</td></tr>`).join("")||`<tr><td class="ex-mut">Data belum cukup.</td></tr>`}</table></div>
  <div class="ex-card"><h3>${S.length} saham (tampil 100 teratas)</h3><div class="ex-wrap"><table class="ex-tbl"><tr><th>Ticker</th><th>RS</th><th>1 Mgg</th><th>1 Bln</th><th>YTD</th><th>52 Mgg</th><th>Dari puncak 52M</th><th>Vol×</th><th>Sektor</th></tr>${rows||`<tr><td colspan="9" class="ex-mut">Belum ada data. Muat data dulu lewat Refresh Data.</td></tr>`}</table></div></div>`;
}
X.act("rsApply",()=>{ SV("rsf",{liq:val("ex-rs-liq"),sek:val("ex-rs-sek"),near:val("ex-rs-near")==="1"}); X.repaint(); });

/* ================= RESEP GURU (preset screening ala investor legendaris) ================= */
const ge=(v,x)=>N(v)!=null&&N(v)>=x, le=(v,x)=>N(v)!=null&&N(v)<=x, gt=(v,x)=>N(v)!=null&&N(v)>x, rng=(v,a,b)=>N(v)!=null&&N(v)>=a&&N(v)<=b;
const isFin=s=>/keuangan|financ|bank|asuransi|insurance|pembiayaan/i.test((s.sektor||"")+" "+(s.industry||""));
const PRESETS=[
 {id:"graham",name:"Graham Defensif",ref:"Benjamin Graham",desc:"Saham murah dan neracanya kuat. Bank/pembiayaan biasanya gugur karena DER & current ratio-nya memang tidak sebanding.",
  checks:[["PER 0–15",s=>rng(s.per,0.01,15)],["PBV ≤ 1,5",s=>rng(s.pbv,0.01,1.5)],["PER × PBV ≤ 22,5",s=>N(s.per)>0&&N(s.pbv)>0&&N(s.per)*N(s.pbv)<=22.5],["DER ≤ 1",s=>le(s.der,1)],["Current ratio ≥ 1,5",s=>ge(s.currentRatio,1.5)],["EPS positif",s=>gt(s.eps,0)]],
  cols:[["PER",s=>fx(s.per,1)],["PBV",s=>fx(s.pbv,2)],["DER",s=>fx(s.der,2)],["Div%",s=>fx(s.divYield,2)]],sortKey:s=>-(N(s.per)||99)},
 {id:"buffett",name:"Kualitas ala Buffett",ref:"Warren Buffett",desc:"Bisnis berprofit tinggi dan tidak terlalu berutang, dengan harga yang masih masuk akal.",
  checks:[["ROE ≥ 15%",s=>ge(s.roe,15)],["Net margin ≥ 10%",s=>ge(s.npm,10)],["DER ≤ 1",s=>le(s.der,1)],["Laba tumbuh (>0%)",s=>gt(s.earningsGrowth,0)],["PER ≤ 25",s=>rng(s.per,0.01,25)],["PBV ≤ 5",s=>rng(s.pbv,0.01,5)]],
  cols:[["ROE%",s=>fx(s.roe,1)],["NPM%",s=>fx(s.npm,1)],["DER",s=>fx(s.der,2)],["PER",s=>fx(s.per,1)]],sortKey:s=>N(s.roe)||0},
 {id:"lynch",name:"Growth wajar (PEG) ala Lynch",ref:"Peter Lynch",desc:"Pertumbuhan laba bagus tapi harganya belum mahal dibanding pertumbuhannya (PEG ≤ 1).",
  checks:[["PEG 0–1",s=>rng(s.peg,0.01,1)],["Pertumbuhan laba 10–50%",s=>rng(s.earningsGrowth,10,50)],["PER ≤ 25",s=>rng(s.per,0.01,25)],["DER ≤ 1,5",s=>le(s.der,1.5)]],
  cols:[["PEG",s=>fx(s.peg,2)],["Laba tumbuh%",s=>fx(s.earningsGrowth,1)],["PER",s=>fx(s.per,1)],["DER",s=>fx(s.der,2)]],sortKey:s=>-(N(s.peg)||9)},
 {id:"magic",name:"Magic Formula (proksi)",ref:"Joel Greenblatt",desc:"Peringkat gabungan earnings yield (1/PER) dan ROE, tanpa sektor keuangan, 30 teratas. Proksi: Greenblatt asli memakai EBIT/EV dan ROIC yang tidak tersedia di data ini.",
  prep:(S,ctx)=>{ const U=S.filter(s=>!isFin(s)&&gt(s.per,0)&&gt(s.roe,0)&&!s.suspended&&(liqOf(s)||0)>=1e9);
    const r1=[...U].sort((a,b)=>N(a.per)-N(b.per)), r2=[...U].sort((a,b)=>N(b.roe)-N(a.roe)), rk={};
    r1.forEach((s,i)=>{rk[s.ticker]=(rk[s.ticker]||0)+i+1;}); r2.forEach((s,i)=>{rk[s.ticker]=(rk[s.ticker]||0)+i+1;});
    const top=Object.keys(rk).sort((a,b)=>rk[a]-rk[b]).slice(0,30); ctx.magic={}; top.forEach((t,i)=>{ctx.magic[t]=i+1;}); },
  checks:[["Masuk 30 teratas peringkat gabungan",(s,c)=>c.magic&&c.magic[s.ticker]!=null]],
  cols:[["Peringkat",(s,c)=>c.magic[s.ticker]],["Earn. yield%",s=>N(s.per)>0?(100/N(s.per)).toFixed(1):"-"],["ROE%",s=>fx(s.roe,1)],["PER",s=>fx(s.per,1)]],sortKey:(s,c)=>-(c.magic&&c.magic[s.ticker]||999)},
 {id:"dividen",name:"Dividen Kuat",ref:"Strategi dividen klasik",desc:"Yield tinggi yang masih ditopang laba (payout wajar), bukan yield tinggi karena harga jatuh.",
  checks:[["Div yield ≥ 4%",s=>ge(s.divYield,4)],["Payout 20–90%",s=>rng(s.payoutRatio,20,90)],["ROE ≥ 8%",s=>ge(s.roe,8)],["EPS positif",s=>gt(s.eps,0)]],
  cols:[["Yield%",s=>fx(s.divYield,2)],["Payout%",s=>fx(s.payoutRatio,0)],["ROE%",s=>fx(s.roe,1)],["PER",s=>fx(s.per,1)]],sortKey:s=>N(s.divYield)||0},
 {id:"minervini",name:"Trend Template ala Minervini",ref:"Mark Minervini (diadaptasi)",desc:"Tren naik yang rapi. MA150 diganti MA100 karena itu yang tersedia di data; MA200 dianggap naik jika EMA200 hari ini ≥ kemarin.",
  checks:[["Harga > MA50, MA100, MA200",s=>PX(s)>N(s.ma50)&&PX(s)>N(s.ma100)&&PX(s)>N(s.ma200)&&N(s.ma200)>0],["MA50 > MA100 > MA200",s=>N(s.ma50)>N(s.ma100)&&N(s.ma100)>N(s.ma200)],["EMA200 naik",s=>N(s.ema200)!=null&&N(s.prevEma200)!=null&&N(s.ema200)>=N(s.prevEma200)],["≥ 30% di atas low 52M",s=>N(s.low52w)>0&&PX(s)>=N(s.low52w)*1.3],["≤ 25% di bawah high 52M",s=>N(s.high52w)>0&&PX(s)>=N(s.high52w)*0.75],["RS ≥ 70",(s,c)=>ge(c.rs[s.ticker],70)]],
  cols:[["RS",(s,c)=>c.rs[s.ticker]==null?"-":c.rs[s.ticker]],["vs MA50%",s=>pcn(s.vsMa50Pct)],["Dari high 52M",s=>N(s.high52w)>0?((PX(s)/N(s.high52w)-1)*100).toFixed(1)+"%":"-"],["Vol×",s=>fx(s.volRatio,2)]],sortKey:(s,c)=>c.rs[s.ticker]||0},
 {id:"canslim",name:"Growth momentum ala O'Neil (proksi)",ref:"William O'Neil — CAN SLIM (sebagian)",desc:"Hanya huruf yang bisa diukur dari data ini: C/A (laba), N (dekat puncak baru), S (volume), L (leader/RS). Huruf I (institusi) dan M (arah pasar) tidak tercakup.",
  checks:[["Laba tumbuh ≥ 25%",s=>ge(s.earningsGrowth,25)],["Omzet tumbuh ≥ 10%",s=>ge(s.revenueGrowth,10)],["Dalam 15% dari high 52M",s=>N(s.high52w)>0&&PX(s)>=N(s.high52w)*0.85],["Rasio volume ≥ 1,2x",s=>ge(s.volRatio,1.2)],["RS ≥ 80",(s,c)=>ge(c.rs[s.ticker],80)]],
  cols:[["RS",(s,c)=>c.rs[s.ticker]==null?"-":c.rs[s.ticker]],["Laba tumbuh%",s=>fx(s.earningsGrowth,0)],["Omzet tumbuh%",s=>fx(s.revenueGrowth,0)],["Vol×",s=>fx(s.volRatio,2)]],sortKey:(s,c)=>c.rs[s.ticker]||0},
 {id:"quality9",name:"Skor Kualitas 9 poin",ref:"Terinspirasi F-Score Piotroski — BUKAN F-Score asli",desc:"F-Score asli butuh perbandingan laporan tahun lalu yang tidak ada di data ini. Ini 9 cek kesehatan dari data terkini; lolos jika ≥ 7 poin.",min:7,
  checks:[["EPS positif",s=>gt(s.eps,0)],["ROA positif",s=>gt(s.roa,0)],["ROE ≥ 10%",s=>ge(s.roe,10)],["Net margin positif",s=>gt(s.npm,0)],["Operating margin positif",s=>gt(s.opm,0)],["Laba tumbuh",s=>gt(s.earningsGrowth,0)],["Omzet tumbuh",s=>gt(s.revenueGrowth,0)],["DER ≤ 1",s=>le(s.der,1)],["Current ratio ≥ 1",s=>ge(s.currentRatio,1)]],
  cols:[["ROE%",s=>fx(s.roe,1)],["ROA%",s=>fx(s.roa,1)],["DER",s=>fx(s.der,2)],["Laba tumbuh%",s=>fx(s.earningsGrowth,0)]],sortKey:s=>N(s.roe)||0}
];
function runPreset(p,minLiq){
  const S=SS(), ctx={rs:rsMap()}; if(p.prep) p.prep(S,ctx);
  const res=[];
  S.forEach(s=>{ if(!s.ticker||s.suspended) return; if(minLiq>0&&!((liqOf(s)||0)>=minLiq)) return;
    let ok=0; const det=p.checks.map(c=>{ let r=false; try{ r=!!c[1](s,ctx); }catch(e){} if(r) ok++; return r; });
    if(ok>=(p.min||p.checks.length)) res.push({s,ok,det,key:p.sortKey?p.sortKey(s,ctx):0}); });
  res.sort((a,b)=>b.ok-a.ok||b.key-a.key); return {res,ctx};
}
function vGuru(){
  const g=LS("guru",{id:"graham",liq:"1e9"}), p=PRESETS.find(x=>x.id===g.id)||PRESETS[0], W=LS("scanwatch",{}), watching=!!W[p.id];
  const {res,ctx}=runPreset(p,+g.liq||0), need=p.min||p.checks.length;
  const rows=res.slice(0,100).map(r=>`<tr><td>${link(r.s.ticker)}</td><td class="ex-mut">${E(trunc(r.s.name,22))}</td><td>${PX(r.s)==null?"-":rp(PX(r.s))}</td><td class="${cls(N(r.s.changePct))}">${pcn(r.s.changePct)}</td><td>${r.ok}/${p.checks.length}</td>${p.cols.map(c=>`<td>${E(c[1](r.s,ctx))}</td>`).join("")}</tr>`).join("");
  return `<div class="ex-card"><h3>🧙 Resep Guru — preset screening ala investor ternama</h3>
  ${chips(PRESETS.map(x=>[x.id,x.name]),p.id,"guruSel","id")}
  <p><b>${E(p.name)}</b> <span class="ex-mut">— ${E(p.ref)}</span><br><span class="ex-mut">${E(p.desc)}</span></p>
  <p class="ex-mut">Kriteria (${need===p.checks.length?"semua harus lolos":"minimal "+need+" lolos"}): ${p.checks.map(c=>E(c[0])).join(" · ")}</p>
  <div class="ex-grid"><label>Likuiditas${sel("ex-g-liq",LIQ_OPTS,g.liq)}</label></div>
  <button class="ex-btn pri" data-act="guruRun">Terapkan</button>
  <button class="ex-btn${watching?" pri":""}" data-act="guruWatch">${watching?"🔔 Dipantau (klik untuk berhenti)":"🔔 Pantau: beri tahu saat ada saham baru lolos"}</button>
  <button class="ex-btn" data-act="guruList">➜ Simpan ke Daftar</button><button class="ex-btn" data-act="guruCsv">⬇ CSV</button>
  <p class="ex-mut">Ini penyaring mekanis dari data yang dimuat aplikasi, bukan rekomendasi. Data kosong dianggap tidak lolos. Pemantauan dicek tiap 30 detik selama halaman terbuka; notifikasi ke Telegram memakai pengaturan Telegram aplikasi.</p></div>
  <div class="ex-card"><h3>${res.length} saham lolos${res.length>100?" (tampil 100 teratas)":""}</h3><div class="ex-wrap"><table class="ex-tbl"><tr><th>Ticker</th><th>Nama</th><th>Harga</th><th>Hari ini</th><th>Lolos</th>${p.cols.map(c=>`<th>${E(c[0])}</th>`).join("")}</tr>${rows||`<tr><td colspan="${5+p.cols.length}" class="ex-mut">Tidak ada saham yang lolos (atau data belum dimuat).</td></tr>`}</table></div></div>`;
}
const curPreset=()=>{ const g=LS("guru",{id:"graham",liq:"1e9"}); return {p:PRESETS.find(x=>x.id===g.id)||PRESETS[0],liq:+g.liq||0}; };
X.act("guruSel",el=>{ const g=LS("guru",{id:"graham",liq:"1e9"}); g.id=el.dataset.id; SV("guru",g); X.repaint(); });
X.act("guruRun",()=>{ const g=LS("guru",{id:"graham"}); g.liq=val("ex-g-liq")||"0"; SV("guru",g); X.repaint(); });
X.act("guruWatch",()=>{ const {p,liq}=curPreset(), W=LS("scanwatch",{});
  if(W[p.id]){ delete W[p.id]; SV("scanwatch",W); toast("Pemantauan "+p.name+" dihentikan"); }
  else { const r=runPreset(p,Math.max(liq,1e9)).res; if(!r.length&&!SS().length){ toast("Data saham belum dimuat","down"); return; }
    W[p.id]={base:r.map(x=>x.s.ticker),liq:Math.max(liq,1e9),tg:true}; SV("scanwatch",W); toast(`Memantau ${p.name}: ${r.length} saham jadi patokan awal`); }
  X.repaint(); });
X.act("guruList",()=>{ const {p,liq}=curPreset(), r=runPreset(p,liq).res.slice(0,30).map(x=>x.s.ticker); if(!r.length){ toast("Tidak ada hasil untuk disimpan","down"); return; }
  const d=lists(); const id="l"+Date.now(); d.lists.push({id,name:`${p.name} ${today()}`,tickers:r}); d.active=id; SV("wl",d); toast(`${r.length} saham disimpan ke Daftar`); X.go("wl"); });
X.act("guruCsv",()=>{ const {p,liq}=curPreset(), {res,ctx}=runPreset(p,liq);
  dl(`resep-${p.id}-${today()}.csv`,toCsv([["Ticker","Nama","Harga","Hari ini %","Lolos",...p.cols.map(c=>c[0])],...res.map(r=>[r.s.ticker,r.s.name,PX(r.s),N(r.s.changePct),r.ok+"/"+p.checks.length,...p.cols.map(c=>c[1](r.s,ctx))])]),"text/csv"); });
function scanTick(){
  const W=LS("scanwatch",{}), ids=Object.keys(W); if(!ids.length||SS().length<50) return; let ch=false;
  ids.forEach(id=>{ const p=PRESETS.find(x=>x.id===id); if(!p) return; const now=runPreset(p,W[id].liq||1e9).res.map(x=>x.s.ticker), base=new Set(W[id].base||[]), fresh=now.filter(t=>!base.has(t));
    if(fresh.length){ notify(`${p.name}: ${fresh.slice(0,10).join(", ")}${fresh.length>10?" dst.":""} baru lolos`,W[id].tg); }
    W[id].base=[...new Set([...(W[id].base||[]),...now])]; if(fresh.length) ch=true; });
  if(ch) SV("scanwatch",W);
}
X.tick(scanTick);

/* ================= DAFTAR (multi-watchlist) ================= */
function lists(){ let d=LS("wl",null); if(!d||!Array.isArray(d.lists)||!d.lists.length){ d={lists:[{id:"l1",name:"Daftar 1",tickers:[]}],active:"l1",sort:"ticker",dir:1}; SV("wl",d); } return d; }
const activeList=d=>d.lists.find(l=>l.id===d.active)||d.lists[0];
function vWL(){
  const d=lists(), L=activeList(d), rs=rsMap(), k=d.sort||"ticker", dir=d.dir||1;
  const rows=L.tickers.map(t=>{ const s=stk(t); return {t,s,chg:N(s&&s.changePct),w1:N(s&&s.weekChangePct),m1:N(s&&s.monthChangePct),ytd:N(s&&s.ytdPct),rsi:N(s&&(s.rsi14!=null?s.rsi14:s.rsi7)),vol:N(s&&s.volRatio),rs:rs[t]==null?null:rs[t],per:N(s&&s.per),div:N(s&&s.divYield)}; });
  rows.sort((a,b)=>{ if(k==="ticker") return a.t.localeCompare(b.t)*dir; const x=a[k],y=b[k]; if(x==null&&y==null) return 0; if(x==null) return 1; if(y==null) return -1; return (x-y)*dir; });
  const H=[["ticker","Ticker"],["chg","Hari ini"],["w1","1 Mgg"],["m1","1 Bln"],["ytd","YTD"],["rsi","RSI14"],["vol","Vol×"],["rs","RS"],["per","PER"],["div","Div%"]];
  const pcell=v=>`<td class="${cls(v)}">${pcn(v)}</td>`;
  const body=rows.map(r=>`<tr><td>${link(r.t)}${r.s?` <span class="ex-mut">${PX(r.s)==null?"":rp(PX(r.s))}</span>`:` <span class="ex-mut">(tidak ada data)</span>`}</td>${pcell(r.chg)}${pcell(r.w1)}${pcell(r.m1)}${pcell(r.ytd)}<td>${fx(r.rsi,0)}</td><td>${fx(r.vol,2)}</td><td>${r.rs==null?"-":r.rs}</td><td>${fx(r.per,1)}</td><td>${fx(r.div,2)}</td><td><button class="ex-btn sm" data-act="wlRm" data-t="${E(r.t)}">✕</button></td></tr>`).join("");
  const avg=a=>{ const v=a.filter(x=>x!=null); return v.length?v.reduce((p,c)=>p+c,0)/v.length:null; };
  return `<div class="ex-card"><h3>⭐ Daftar Saham (banyak daftar, mis. Kandidat, Dividen, Swing)</h3>
  ${chips(d.lists.map(l=>[l.id,`${l.name} (${l.tickers.length})`]),L.id,"wlSel","id")}
  <button class="ex-btn" data-act="wlNew">＋ Daftar baru</button><button class="ex-btn" data-act="wlRen">✎ Ganti nama</button><button class="ex-btn" data-act="wlDel">🗑 Hapus daftar</button>
  <div class="ex-grid" style="margin-top:10px"><label class="ex-wide">Tambah ticker (pisahkan koma/spasi/baris)<textarea id="ex-wl-add" rows="2" placeholder="BBCA, TLKM BBRI"></textarea></label></div>
  <button class="ex-btn pri" data-act="wlAdd">Tambah</button><button class="ex-btn" data-act="wlImpMain">Impor Watchlist utama</button><button class="ex-btn" data-act="wlImpPorto">Impor posisi Portofolio Open</button>
  <button class="ex-btn" data-act="wlToHeat">🔥 Peta Panas</button><button class="ex-btn" data-act="wlToCmp">🆚 Bandingkan 5 teratas</button><button class="ex-btn" data-act="wlCopy">📋 Salin ticker</button><button class="ex-btn" data-act="wlToMain">⬆ Kirim ke Watchlist utama</button></div>
  <div class="ex-card"><h3>${E(L.name)} — ${L.tickers.length} saham${rows.length?` · rata-rata hari ini ${pcn(avg(rows.map(r=>r.chg)))}`:""}</h3><div class="ex-wrap"><table class="ex-tbl"><tr>${H.map(([key,l])=>`<th class="srt" data-act="wlSort" data-k="${key}">${l}${key===k?(dir>0?" ▲":" ▼"):""}</th>`).join("")}<th></th></tr>${body||`<tr><td colspan="11" class="ex-mut">Daftar kosong. Tambahkan ticker di atas.</td></tr>`}</table></div></div>`;
}
const saveL=d=>{ SV("wl",d); X.repaint(); };
X.act("wlSel",el=>{ const d=lists(); d.active=el.dataset.id; saveL(d); });
X.act("wlNew",()=>{ const n=(prompt("Nama daftar baru:","")||"").trim(); if(!n) return; const d=lists(), id="l"+Date.now(); d.lists.push({id,name:n.slice(0,30),tickers:[]}); d.active=id; saveL(d); });
X.act("wlRen",()=>{ const d=lists(), L=activeList(d), n=(prompt("Nama baru:",L.name)||"").trim(); if(!n) return; L.name=n.slice(0,30); saveL(d); });
X.act("wlDel",()=>{ const d=lists(), L=activeList(d); if(!confirm(`Hapus daftar "${L.name}"?`)) return; d.lists=d.lists.filter(x=>x.id!==L.id); if(!d.lists.length) d.lists=[{id:"l"+Date.now(),name:"Daftar 1",tickers:[]}]; d.active=d.lists[0].id; saveL(d); });
X.act("wlAdd",()=>{ const t=parseT(val("ex-wl-add")); if(!t.length){ toast("Tidak ada ticker valid (4 huruf)","down"); return; } const d=lists(), L=activeList(d); L.tickers=[...new Set([...L.tickers,...t])]; saveL(d); });
X.act("wlRm",el=>{ const d=lists(), L=activeList(d); L.tickers=L.tickers.filter(t=>t!==el.dataset.t); saveL(d); });
X.act("wlSort",el=>{ const d=lists(), k=el.dataset.k; if(d.sort===k) d.dir=-(d.dir||1); else { d.sort=k; d.dir=k==="ticker"?1:-1; } saveL(d); });
X.act("wlImpMain",()=>{ const d=lists(), L=activeList(d), t=[...(ST().watchlist||[])]; L.tickers=[...new Set([...L.tickers,...t])]; toast(`${t.length} ticker diimpor`); saveL(d); });
X.act("wlImpPorto",()=>{ const d=lists(), L=activeList(d), t=[...new Set(openPos().map(p=>p.ticker))]; L.tickers=[...new Set([...L.tickers,...t])]; toast(`${t.length} ticker diimpor`); saveL(d); });
X.act("wlToHeat",()=>{ const d=lists(), h=LS("heat",{scope:"all",metric:"changePct",size:"marketCap",n:80}); h.scope="list:"+activeList(d).id; SV("heat",h); X.go("heat"); });
X.act("wlToCmp",()=>{ const L=activeList(lists()), c=LS("cmp",{t:"",days:90}); c.t=L.tickers.slice(0,5).join(" "); SV("cmp",c); cmpHtml=""; X.go("cmp"); });
X.act("wlToMain",async()=>{ const L=activeList(lists()); if(!L.tickers.length){ toast("Daftar kosong","down"); return; }
  if(typeof addTickersToWatchlistBulk!=="function"){ toast("Fungsi watchlist app tidak ditemukan","down"); return; }
  const ok=L.tickers.filter(t=>stk(t)); if(!ok.length){ toast("Tidak ada ticker yang dikenal di data saham","down"); return; }
  if(!confirm(`Kirim ${ok.length} saham dari "${L.name}" ke Watchlist utama (tersinkron ke Supabase)?`)) return;
  await addTickersToWatchlistBulk(ok); });
X.act("wlCopy",()=>{ const t=activeList(lists()).tickers.join(", "); try{ navigator.clipboard.writeText(t); toast("Ticker disalin"); }catch(e){ prompt("Salin manual:",t); } });

/* ================= PETA PANAS (treemap ala Finviz) ================= */
function worst(row,sum,side){ let mx=-Infinity,mn=Infinity; row.forEach(r=>{ mx=Math.max(mx,r.a); mn=Math.min(mn,r.a); }); const s2=side*side; return Math.max(s2*mx/(sum*sum),sum*sum/(s2*mn)); }
function squarify(items,x,y,w,h){
  const out=[], total=items.reduce((a,i)=>a+i.v,0); if(!(total>0)||w<=0||h<=0) return out;
  const k=w*h/total; let rest=items.map(i=>({it:i,a:i.v*k})), cx=x,cy=y,cw=w,ch=h;
  while(rest.length){
    const side=Math.min(cw,ch); let row=[],sum=0,best=Infinity,i=0;
    for(;i<rest.length;i++){ const t=row.concat(rest[i]), s=sum+rest[i].a, wr=worst(t,s,side); if(row.length&&wr>best) break; row=t; sum=s; best=wr; }
    rest=rest.slice(i); const th=sum/side;
    if(cw>=ch){ let yy=cy; row.forEach(r=>{ const hh=r.a/th; out.push({it:r.it,x:cx,y:yy,w:th,h:hh}); yy+=hh; }); cx+=th; cw-=th; }
    else { let xx=cx; row.forEach(r=>{ const ww=r.a/th; out.push({it:r.it,x:xx,y:cy,w:ww,h:th}); xx+=ww; }); cy+=th; ch-=th; }
  }
  return out;
}
const HM=[["changePct","1 Hari",5],["weekChangePct","1 Minggu",10],["monthChangePct","1 Bulan",20],["ytdPct","YTD",40],["week52ChangePct","52 Minggu",80]];
function heatColor(v,clamp){ if(v==null) return "#475569"; const a=Math.min(1,Math.abs(v)/clamp), base=[71,85,105], to=v>=0?[5,150,105]:[220,38,38];
  return `rgb(${base.map((b,i)=>Math.round(b+(to[i]-b)*a)).join(",")})`; }
function heatItems(scope){
  const S=SS();
  if(scope==="wl"){ const w=ST().watchlist||new Set(); return S.filter(s=>w.has(s.ticker)); }
  if(scope==="porto"){ const t=new Set(openPos().map(p=>p.ticker)); return S.filter(s=>t.has(s.ticker)); }
  if(scope.startsWith("list:")){ const L=lists().lists.find(l=>l.id===scope.slice(5)); const t=new Set(L?L.tickers:[]); return S.filter(s=>t.has(s.ticker)); }
  if(scope==="lq45") return S.filter(s=>s.indexLq45===true||s.indexLq45==="true"||s.indexLq45===1);
  if(scope==="syariah") return S.filter(s=>s.syariah===true||s.syariah==="true"||s.syariah===1);
  if(scope.startsWith("sek:")) return S.filter(s=>s.sektor===scope.slice(4));
  return S;
}
function vHeat(){
  const h=LS("heat",{scope:"all",metric:"changePct",size:"marketCap",n:80}), m=HM.find(x=>x[0]===h.metric)||HM[0];
  const sektors=[...new Set(SS().map(s=>s.sektor).filter(Boolean))].sort().slice(0,60);
  const scopes=[["all","Semua saham (terbesar)"],["wl","Watchlist utama"],["porto","Portofolio (Open)"],...lists().lists.map(l=>["list:"+l.id,"Daftar: "+l.name]),["lq45","LQ45"],["syariah","Syariah"],...sektors.map(x=>["sek:"+x,"Sektor: "+x])];
  let items=heatItems(h.scope||"all").filter(s=>s.ticker&&N(s[m[0]])!=null);
  const szf=s=>h.size==="equal"?1:h.size==="turnover"?(liqOf(s)||0):(N(s.marketCap)||0);
  items=items.map(s=>({s,v:szf(s)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v).slice(0,+h.n||80);
  let map="";
  if(!items.length) map=`<div class="ex-mut" style="padding:20px">Tidak ada data untuk pilihan ini (cek apakah kolom ${E(m[1])}${h.size==="marketCap"?" atau kapitalisasi pasar":""} terisi). Coba ukuran “Nilai transaksi” atau “Sama besar”.</div>`;
  else {
    const W=1000,H=600, G={}; items.forEach(i=>{ const k=i.s.sektor||"(lainnya)"; (G[k]||(G[k]={name:k,v:0,ch:[]})); G[k].v+=i.v; G[k].ch.push(i); });
    const gr=squarify(Object.values(G).sort((a,b)=>b.v-a.v),0,0,W,H), pctX=v=>(v/W*100).toFixed(3)+"%", pctY=v=>(v/H*100).toFixed(3)+"%";
    gr.forEach(g=>{ const G0=g.it, hd=g.h>46&&g.w>60?15:0;
      map+=`<div class="ex-hm-g" style="left:${pctX(g.x)};top:${pctY(g.y)};width:${pctX(g.w)};height:${pctY(g.h)}">${hd?`<div class="ex-hm-gl">${E(G0.name)}</div>`:""}</div>`;
      squarify(G0.ch.sort((a,b)=>b.v-a.v),g.x+1,g.y+hd+1,g.w-2,g.h-hd-2).forEach(c=>{ const s=c.it.s, v=N(s[m[0]]), fs=Math.max(7,Math.min(15,Math.sqrt(c.w*c.h)/5.2));
        map+=`<div class="ex-hm-c" data-act="xDetail" data-t="${E(s.ticker)}" title="${E(s.ticker+" · "+trunc(s.name,30)+" · "+m[1]+" "+pcn(v)+(PX(s)!=null?" · "+rp(PX(s)):""))}" style="left:${pctX(c.x)};top:${pctY(c.y)};width:${pctX(c.w)};height:${pctY(c.h)};background:${heatColor(v,m[2])};font-size:${fs.toFixed(1)}px">${c.w>26&&c.h>14?`<b>${E(s.ticker)}</b>`:""}${c.w>34&&c.h>26?`<span>${pc(v)}</span>`:""}</div>`; }); });
  }
  const leg=[-m[2],-m[2]/2,0,m[2]/2,m[2]].map(v=>`<span style="background:${heatColor(v,m[2])}">${v>0?"+":""}${v}%</span>`).join("");
  return `<div class="ex-card"><h3>🔥 Peta Panas — ukuran = ${h.size==="equal"?"sama besar":h.size==="turnover"?"nilai transaksi":"kapitalisasi pasar"}, warna = perubahan ${E(m[1])}</h3>
  <div class="ex-grid"><label>Cakupan${sel("ex-h-scope",scopes,h.scope)}</label><label>Warna berdasarkan${sel("ex-h-metric",HM.map(x=>[x[0],x[1]]),h.metric)}</label>
  <label>Ukuran kotak${sel("ex-h-size",[["marketCap","Kapitalisasi pasar"],["turnover","Nilai transaksi"],["equal","Sama besar"]],h.size)}</label><label>Maks. saham${sel("ex-h-n",[["40","40"],["80","80"],["150","150"],["300","300"]],h.n)}</label></div>
  <button class="ex-btn pri" data-act="heatApply">Terapkan</button><span class="ex-leg">${leg}</span>
  <div class="ex-heatmap">${map}</div><p class="ex-mut">Klik kotak untuk membuka detail emiten. Dikelompokkan per sektor.</p></div>`;
}
X.act("heatApply",()=>{ SV("heat",{scope:val("ex-h-scope"),metric:val("ex-h-metric"),size:val("ex-h-size"),n:val("ex-h-n")}); X.repaint(); });

/* ================= BANDINGKAN ================= */
let cmpHtml="";
const tp=s=>{ try{ return typeof computeTradePlan==="function"?computeTradePlan(s,PX(s)):null; }catch(e){ return null; } };
const pos=v=>v==null?null:(v>0?1:0);
// Skor mekanis (centang syarat), BUKAN rekomendasi. Syarat yang datanya kosong dihitung tidak terpenuhi.
function techScore(s){ const rsi=N(s.rsi14!=null?s.rsi14:s.rsi7), m=N(s.macd), sg=N(s.signal), adx=N(s.adx), pd=N(s.plusDi), md=N(s.minusDi);
  const c=[rsi!=null&&rsi>=40&&rsi<=70, m!=null&&sg!=null&&m>sg, N(s.vsMa50Pct)>0, N(s.vsMa200Pct)>0, adx!=null&&adx>20&&pd!=null&&md!=null&&pd>md, N(s.volRatio)>=1];
  return c.filter(Boolean).length; }
function flowScore(s){ return [N(s.foreignNet1D)>0,N(s.foreignNet5D)>0,N(s.foreignNet20D)>0].filter(Boolean).length; }
function oppScore(s){ const p=tp(s); return techScore(s)+flowScore(s)+(p&&p.rr1!=null&&p.rr1>=1.5?1:0); }
const CMP_SECS=[["fund","Fundamental"],["tech","Teknikal"],["band","Bandarmologi"],["opp","Peluang Trading"]];
const CMP_ROWS=[
 ["§","Umum"],
 ["Harga",s=>PX(s),v=>rp(v),null],["Hari ini",s=>N(s.changePct),pc,"hi"],["Kapitalisasi pasar",s=>N(s.marketCap),compact,null],
 ["§","fund"],
 ["PER",s=>N(s.per)>0?N(s.per):null,v=>v.toFixed(1),"lo"],["PBV",s=>N(s.pbv)>0?N(s.pbv):null,v=>v.toFixed(2),"lo"],["PEG",s=>N(s.peg)>0?N(s.peg):null,v=>v.toFixed(2),"lo"],
 ["ROE %",s=>N(s.roe),v=>v.toFixed(1),"hi"],["Net margin %",s=>N(s.npm),v=>v.toFixed(1),"hi"],["DER",s=>N(s.der),v=>v.toFixed(2),"lo"],
 ["Laba tumbuh %",s=>N(s.earningsGrowth),v=>v.toFixed(1),"hi"],["Omzet tumbuh %",s=>N(s.revenueGrowth),v=>v.toFixed(1),"hi"],["Div yield %",s=>N(s.divYield),v=>v.toFixed(2),"hi"],
 ["§","tech"],
 ["RSI7",s=>N(s.rsi7),v=>v.toFixed(0),null],["RSI14",s=>N(s.rsi14!=null?s.rsi14:s.rsi7),v=>v.toFixed(0),null],["RSI21",s=>N(s.rsi21),v=>v.toFixed(0),null],
 ["RSI7 vs RSI21",s=>{ const a=N(s.rsi7),b=N(s.rsi21); return a==null||b==null?null:(a>b?"RSI7 di atas (momentum naik)":"RSI7 di bawah (momentum turun)"); },v=>v,null],["Stochastic %K",s=>N(s.stochK),v=>v.toFixed(0),null],
 ["MACD vs signal",s=>{ const m=N(s.macd),g=N(s.signal); return m==null||g==null?null:(m>g?"Bullish":"Bearish"); },v=>v,null],
 ["ADX (kekuatan tren)",s=>N(s.adx),v=>v.toFixed(0),"hi"],
 ["Arah tren (+DI vs −DI)",s=>{ const a=N(s.plusDi),b=N(s.minusDi); return a==null||b==null?null:(a>b?"Naik":"Turun"); },v=>v,null],
 ["vs MA50 %",s=>N(s.vsMa50Pct),pc,"hi"],["vs MA200 %",s=>N(s.vsMa200Pct),pc,"hi"],["Posisi 52M %",s=>N(s.pos52w),v=>v.toFixed(0)+"%",null],
 ["ATR14 % dari harga",s=>{ const a=N(s.atr14),p=PX(s); return a>0&&p>0?a/p*100:null; },v=>v.toFixed(1)+"%",null],
 ["1 Bulan %",s=>N(s.monthChangePct),pc,"hi"],["YTD %",s=>N(s.ytdPct),pc,"hi"],["RS Rank",s=>rsMap()[s.ticker]==null?null:rsMap()[s.ticker],v=>String(v),"hi"],
 ["Skor teknikal (0–6)",s=>techScore(s),v=>v+"/6","hi"],
 ["§","band"],
 ["Sinyal bandar (proksi volume+candle)",s=>{ try{ if(typeof bandarmologi==="function"&&N(s.volRatio)!=null) return bandarmologi(s,N(s.volRatio)).label; }catch(e){} return null; },v=>v,null],
 ["Rasio volume",s=>N(s.volRatio),v=>v.toFixed(2)+"x",null],
 ["Asing net 1 hari",s=>N(s.foreignNet1D),compact,"hi"],["Asing net 5 hari",s=>N(s.foreignNet5D),compact,"hi"],["Asing net 20 hari",s=>N(s.foreignNet20D),compact,"hi"],
 ["Hari asing net beli",s=>N(s.foreignUpDays),v=>String(v),"hi"],
 ["Crossing %",s=>N(s.crossingPct),v=>v.toFixed(1)+"%",null],["Rata² nilai per transaksi",s=>N(s.avgTicket),compact,null],["Free float %",s=>N(s.freeFloatPct),v=>v.toFixed(1)+"%",null],
 ["Skor arus asing (0–3)",s=>N(s.foreignNet1D)==null&&N(s.foreignNet5D)==null&&N(s.foreignNet20D)==null?null:flowScore(s),v=>v+"/3","hi"],
 ["§","opp"],
 ["Area entry",s=>{ const p=tp(s); return p?(p.entryLow===p.entryHigh?rp(p.entryHigh):rp(p.entryLow)+" – "+rp(p.entryHigh)):null; },v=>v,null],
 ["Stop loss",s=>{ const p=tp(s); return p?rp(p.sl)+" ("+p.slPct.toFixed(1)+"%)":null; },v=>v,null],
 ["Risiko ke SL %",s=>{ const p=tp(s); return p?p.slPct:null; },pc,"hi"],
 ["Target 1",s=>{ const p=tp(s); return p?rp(p.tp1)+" ("+pc(p.tp1Pct)+")":null; },v=>v,null],
 ["Target 2",s=>{ const p=tp(s); return p&&p.tp2!=null?rp(p.tp2)+" ("+pc(p.tp2Pct)+")":null; },v=>v,null],
 ["Potensi ke Target 1 %",s=>{ const p=tp(s); return p?p.tp1Pct:null; },pc,"hi"],
 ["Reward:Risk (TP1)",s=>{ const p=tp(s); return p&&p.rr1!=null?p.rr1:null; },v=>v.toFixed(2),"hi"],
 ["Reward:Risk (TP2)",s=>{ const p=tp(s); return p&&p.rr2!=null?p.rr2:null; },v=>v.toFixed(2),"hi"],
 ["Skor peluang gabungan (0–10)",s=>oppScore(s),v=>v+"/10","hi"]
];
const CMP_COL=["#3b82f6","#f59e0b","#10b981","#ef4444","#a855f7"];
function scrRows(){ try{ if(typeof getFiltered==="function") return (getFiltered()||[]).filter(s=>s&&s.ticker); }catch(e){} return []; }
function cmpCur(){ const e=document.querySelector("#ex-cmp-t"); return parseT(e?e.value:LS("cmp",{t:""}).t).slice(0,5); }
function cmpSet(arr){ const c=LS("cmp",{t:"",days:90}); c.t=arr.slice(0,5).join(" "); SV("cmp",c); cmpHtml=""; X.repaint(); }
function cmpPicker(cur){
  const R=scrRows(); if(!R.length) return `<div class="ex-card"><h3>Pilih dari hasil Screener</h3><p class="ex-mut">Belum ada hasil Screener (data belum dimuat atau filter tidak menghasilkan saham). Buka tab Screener dan atur filter dulu.</p></div>`;
  const sel=(typeof state!=="undefined"&&state.selectedForBacktest)?[...state.selectedForBacktest]:[], nSel=R.filter(s=>sel.includes(s.ticker)).length, top=R.slice(0,40);
  return `<div class="ex-card"><h3>Pilih dari hasil Screener <span class="ex-mut">(${R.length} saham lolos filter saat ini, urutan sama seperti di Screener)</span></h3>
  <button class="ex-btn" data-act="cmpFromChecked">☑ Pakai yang dicentang di Screener (${nSel})</button><button class="ex-btn" data-act="cmpTop5">🔝 5 teratas hasil Screener</button><button class="ex-btn" data-act="cmpClear">✕ Kosongkan pilihan</button>
  <p class="ex-mut">Atau klik ticker di bawah (${cur.length}/5 terpilih). ${R.length>40?"Menampilkan 40 teratas.":""}</p>
  <div class="ex-chips">${top.map(s=>{ const on=cur.includes(s.ticker), ch=N(s.changePct); return `<button class="ex-chip${on?" on":""}" data-act="cmpPick" data-t="${E(s.ticker)}">${E(s.ticker)}${ch==null?"":` <small>${ch>=0?"+":""}${ch.toFixed(1)}%</small>`}</button>`; }).join("")}</div></div>`;
}
function vCmp(){
  const c=LS("cmp",{t:"",days:90}), T=parseT(c.t).slice(0,5), S=T.map(stk);
  let tbl=""; const SEC=Object.assign({fund:true,tech:true,band:true,opp:true},c.sec||{});
  if(T.length){
    const names=Object.fromEntries(CMP_SECS); let show=true, body="";
    CMP_ROWS.forEach(r=>{
      if(r[0]==="§"){ const k=r[1]; if(names[k]){ show=!!SEC[k]; if(show) body+=`<tr><td colspan="${T.length+1}" style="background:rgba(127,127,127,.12);font-weight:700">${E(names[k])}</td></tr>`; } else { show=true; } return; }
      if(!show) return; const [l,f,fm,best]=r;
      const vals=S.map(s=>{ if(!s) return null; let v; try{ v=f(s); }catch(e){ v=null; } return v==null||(typeof v==="number"&&isNaN(v))?null:v; }), nums=vals.filter(v=>typeof v==="number"); let bst=null;
      if(best&&nums.length>1) bst=best==="hi"?Math.max(...nums):Math.min(...(nums.filter(v=>v>0).length?nums.filter(v=>v>0):nums));
      body+=`<tr><td class="ex-mut">${l}</td>${vals.map(v=>`<td${typeof v==="number"&&v===bst?` class="ex-up" style="font-weight:700"`:""}>${v==null?"-":E(fm(v))}</td>`).join("")}</tr>`; });
    tbl=`<div class="ex-chips">${CMP_SECS.map(([k,l])=>`<button class="ex-chip${SEC[k]?" on":""}" data-act="cmpSec" data-k="${k}">${l}</button>`).join("")}</div>
    <div class="ex-wrap"><table class="ex-tbl"><tr><th></th>${T.map((tk,i)=>`<th style="color:${CMP_COL[i]}">${E(tk)}${S[i]?"":" ?"}</th>`).join("")}</tr>${body}</table></div>
    <p class="ex-mut">Hijau tebal = terbaik di antara yang dibandingkan (PER/PBV/PEG/DER: makin kecil makin baik, abaikan nilai ≤ 0). Ini perbandingan angka mentah, bukan penilaian kualitas bisnis.</p>
    <p class="ex-mut"><b>Bandarmologi:</b> “Sinyal bandar” adalah proksi dari rasio volume dan arah candle (bukan data broker). Angka asing berasal dari ringkasan transaksi IDX di data Anda. <b>Peluang trading:</b> area entry, SL, dan target dihitung oleh <code>computeTradePlan</code> milik app (support/resistance 20 hari dan ATR14), sama seperti tab Trading Plan. Skor teknikal, arus asing, dan gabungan adalah hitungan centang syarat yang mekanis (data kosong dianggap tidak terpenuhi), <b>bukan rekomendasi beli/jual</b>.</p>`;
  }
  return `<div class="ex-card"><h3>🆚 Bandingkan Saham (maks. 5)</h3><div class="ex-grid"><label class="ex-wide">Ticker<input id="ex-cmp-t" placeholder="BBCA BBRI BMRI BBNI" style="text-transform:uppercase" value="${E(c.t)}"></label>
  <label>Periode grafik${sel("ex-cmp-d",[["30","1 bulan"],["90","3 bulan"],["180","6 bulan"],["365","1 tahun"]],c.days)}</label></div>
  <button class="ex-btn pri" data-act="cmpRun">Bandingkan</button></div>
  ${cmpPicker(T)}
  ${tbl?`<div class="ex-card"><h3>Tabel perbandingan</h3>${tbl}</div>`:""}
  <div class="ex-card"><h3>Performa relatif (dirata-ratakan ke 100)</h3><div id="ex-cmp-chart">${cmpHtml||`<p class="ex-mut">Isi ticker lalu klik Bandingkan untuk memuat riwayat harga dari tabel flows (Supabase).</p>`}</div></div>`;
}
window.exCompare=function(arr){ const tk=[...new Set((arr||[]).map(x=>String(x||"").toUpperCase()).filter(x=>/^[A-Z0-9]{4}$/.test(x)))];
  if(tk.length<2){ toast("Pilih minimal 2 saham untuk dibandingkan","down"); return; }
  if(tk.length>5) toast(`${tk.length} dipilih; diambil 5 pertama sesuai urutan Screener`,"down");
  const c=LS("cmp",{t:"",days:90}); c.t=tk.slice(0,5).join(" "); SV("cmp",c); cmpHtml=""; X.go("cmp");
  setTimeout(()=>{ const b=document.querySelector('[data-act="cmpRun"]'); if(b) b.click(); },60); };
X.act("cmpSec",el=>{ const c=LS("cmp",{t:"",days:90}); c.sec=Object.assign({fund:true,tech:true,band:true,opp:true},c.sec||{}); c.sec[el.dataset.k]=!c.sec[el.dataset.k]; c.t=parseT(val("ex-cmp-t")).slice(0,5).join(" ")||c.t; SV("cmp",c); X.repaint(); });
X.act("cmpPick",el=>{ const tk=el.dataset.t, cur=cmpCur(), i=cur.indexOf(tk);
  if(i>=0) cur.splice(i,1); else { if(cur.length>=5){ toast("Maksimal 5 saham. Lepas salah satu dulu.","down"); return; } cur.push(tk); } cmpSet(cur); });
X.act("cmpFromChecked",()=>{ const R=scrRows(), sel=(typeof state!=="undefined"&&state.selectedForBacktest)?state.selectedForBacktest:new Set(), pk=R.filter(s=>sel.has(s.ticker)).map(s=>s.ticker);
  if(!pk.length){ toast("Belum ada saham yang dicentang di Screener (yang lolos filter saat ini)","down"); return; }
  if(pk.length>5) toast(`${pk.length} dicentang; diambil 5 pertama sesuai urutan Screener`,"down");
  cmpSet(pk); });
X.act("cmpTop5",()=>{ const R=scrRows(); if(!R.length){ toast("Belum ada hasil Screener","down"); return; } cmpSet(R.slice(0,5).map(s=>s.ticker)); });
X.act("cmpClear",()=>cmpSet([]));
X.act("cmpRun",async()=>{
  const T=parseT(val("ex-cmp-t")).slice(0,5), days=+val("ex-cmp-d")||90; SV("cmp",Object.assign(LS("cmp",{}),{t:T.join(" "),days}));
  if(T.length<2){ toast("Isi minimal 2 ticker","down"); return; }
  cmpHtml=`<p class="ex-mut">Mengambil riwayat harga…</p>`; X.repaint();
  try{
    if(typeof SUPABASE_URL==="undefined"||!SUPABASE_URL) throw new Error("Supabase belum dikonfigurasi (Pengaturan).");
    const since=new Date(Date.now()-(days+10)*864e5).toISOString().slice(0,10), rows=[];
    for(let pg=0;pg<20;pg++){
      const qs=new URLSearchParams({ticker:`in.(${T.join(",")})`,select:"ticker,date,close",date:`gte.${since}`,order:"date.asc",limit:"1000",offset:String(pg*1000)});
      const r=await fetch(`${SUPABASE_URL}/flows?${qs}`,{headers:getSupaHeaders(),cache:"no-store"}); if(!r.ok) throw new Error("HTTP "+r.status);
      const part=await r.json(); if(!Array.isArray(part)) throw new Error("respons bukan array"); rows.push(...part); if(part.length<1000) break;
    }
    const px={}; rows.forEach(r=>{ if(r.close!=null) (px[r.ticker]||(px[r.ticker]={}))[String(r.date).slice(0,10)]=+r.close; });
    const have=T.filter(t=>px[t]&&Object.keys(px[t]).length>=5);
    if(have.length<2) throw new Error("Riwayat harga kurang untuk minimal 2 ticker.");
    let dates=Object.keys(px[have[0]]).filter(d=>have.every(t=>px[t][d]!=null)).sort();
    if(dates.length<5) throw new Error("Tanggal data tidak beririsan cukup antar ticker.");
    const cut=new Date(Date.now()-days*864e5).toISOString().slice(0,10); const d2=dates.filter(d=>d>=cut); if(d2.length>=5) dates=d2;
    const series=have.map(t=>dates.map(d=>px[t][d]/px[t][dates[0]]*100)), all=series.flat(), mn=Math.min(...all),mx=Math.max(...all);
    const W=700,H=260,pd=8,Xp=i=>pd+i/(dates.length-1)*(W-2*pd),Yp=v=>H-pd-(v-mn)/((mx-mn)||1)*(H-2*pd);
    cmpHtml=`<svg class="ex-svg" viewBox="0 0 ${W} ${H}"><line x1="0" x2="${W}" y1="${Yp(100)}" y2="${Yp(100)}" stroke="currentColor" opacity=".25" stroke-dasharray="4"/>${series.map((s,i)=>`<polyline fill="none" stroke="${CMP_COL[T.indexOf(have[i])]}" stroke-width="2.2" points="${s.map((v,j)=>`${Xp(j).toFixed(1)},${Yp(v).toFixed(1)}`).join(" ")}"/>`).join("")}</svg>
    <table class="ex-tbl">${have.map((t,i)=>{ const r=series[i][series[i].length-1]-100; return `<tr><td style="color:${CMP_COL[T.indexOf(t)]}"><b>${E(t)}</b></td><td class="${cls(r)}">${pc(r)}</td></tr>`; }).join("")}</table>
    <p class="ex-mut">${dates[0]} s.d. ${dates[dates.length-1]} (${dates.length} hari bursa). Berdasarkan harga penutupan; belum memperhitungkan dividen.${have.length<T.length?" Tanpa data cukup: "+T.filter(t=>!have.includes(t)).map(E).join(", ")+".":""}</p>`;
  }catch(e){ cmpHtml=`<p class="ex-dn">Gagal: ${E(e.message)}</p>`; }
  X.repaint();
});

/* ================= DIVIDEN ================= */
function ccOf(t){ try{ return typeof ccFields==="function"?(ccFields(t)||{}):{}; }catch(e){ return {}; } }
function dpsOf(s){ if(!s) return {v:null,approx:false}; const d=N(s.dividendRate); if(d!=null&&d>0) return {v:d,approx:false}; const y=N(s.divYield), p=PX(s); return y>0&&p>0?{v:p*y/100,approx:true}:{v:null,approx:false}; }
function vDiv(){
  const F=LS("divf",{y:4,pay:90,roe:8,liq:"1e9"}), g={};
  openPos().forEach(p=>{ const o=g[p.ticker]||(g[p.ticker]={t:p.ticker,lot:0,cost:0}); const lot=+p.lotBeli||0; o.lot+=lot; o.cost+=(+p.hargaBeli||0)*lot*100; });
  let tot=0,totCost=0,totVal=0;
  const prow=Object.values(g).map(o=>{ const s=stk(o.t), d=dpsOf(s), px=PX(s), avg=o.lot?o.cost/(o.lot*100):null, proj=d.v!=null?d.v*o.lot*100:null, cc=ccOf(o.t);
    if(proj!=null){ tot+=proj; totCost+=o.cost; } totVal+=(px||0)*o.lot*100;
    return `<tr><td>${link(o.t)}</td><td>${o.lot}</td><td>${avg==null?"-":rp(avg)}</td><td>${px==null?"-":rp(px)}</td><td>${d.v==null?"-":(d.approx?"≈ ":"")+rp(d.v)}</td><td>${d.v!=null&&avg?(d.v/avg*100).toFixed(2)+"%":"-"}</td><td>${fx(s&&s.divYield,2)}%</td><td class="ex-up">${proj==null?"-":rp(proj)}</td><td>${cc.exDivDate?E(String(cc.exDivDate).slice(0,10))+(cc.exDivDays!=null?` <span class="ex-mut">(${cc.exDivDays>=0?"H-"+cc.exDivDays:"lewat"})</span>`:""):"-"}</td></tr>`; }).join("");
  const minL=+F.liq||0;
  const top=SS().filter(s=>!s.suspended&&ge(s.divYield,+F.y)&&(N(s.payoutRatio)==null||le(s.payoutRatio,+F.pay))&&(+F.roe<=0||ge(s.roe,+F.roe))&&(!minL||(liqOf(s)||0)>=minL)).sort((a,b)=>N(b.divYield)-N(a.divYield)).slice(0,50);
  const trows=top.map(s=>{ const cc=ccOf(s.ticker); return `<tr><td>${link(s.ticker)}</td><td class="ex-mut">${E(trunc(s.name,22))}</td><td>${rp(PX(s))}</td><td class="ex-up">${fx(s.divYield,2)}%</td><td>${fx(s.payoutRatio,0)}%</td><td>${fx(s.roe,1)}%</td><td>${fx(s.per,1)}</td><td>${cc.exDivDate?E(String(cc.exDivDate).slice(0,10)):"-"}</td></tr>`; }).join("");
  return `<div class="ex-card"><h3>💸 Proyeksi Dividen Portofolio (posisi Open)</h3>
  ${prow?`<div class="ex-wrap"><table class="ex-tbl"><tr><th>Ticker</th><th>Lot</th><th>Harga rata²</th><th>Harga kini</th><th>DPS/thn</th><th>Yield on cost</th><th>Yield kini</th><th>Proyeksi/thn</th><th>Ex-dividen</th></tr>${prow}</table></div>
  <p><b>Total proyeksi: <span class="ex-up">${rp(tot)}</span>/tahun</b> (≈ ${rp(tot/12)}/bulan) · yield on cost portofolio ${totCost>0?(tot/totCost*100).toFixed(2)+"%":"-"} · yield terhadap nilai pasar ${totVal>0?(tot/totVal*100).toFixed(2)+"%":"-"}</p>
  <p class="ex-mut">Proyeksi = dividen per saham (DPS) terbaru di data × jumlah saham; tanda ≈ berarti DPS diturunkan dari yield × harga. Dividen masa depan tidak dijamin dan sebelum pajak final. Ex-dividen tampil jika jadwalnya sudah dimuat aplikasi.</p>`:`<p class="ex-mut">Belum ada posisi Open di Portofolio.</p>`}</div>
  <div class="ex-card"><h3>Peringkat Dividen Yield</h3><div class="ex-grid"><label>Yield min (%)<input id="ex-dv-y" type="number" step="0.5" value="${E(F.y)}"></label><label>Payout maks (%)<input id="ex-dv-p" type="number" value="${E(F.pay)}"></label><label>ROE min (%)<input id="ex-dv-r" type="number" value="${E(F.roe)}"></label><label>Likuiditas${sel("ex-dv-l",LIQ_OPTS,F.liq)}</label></div>
  <button class="ex-btn pri" data-act="divApply">Terapkan</button>
  <div class="ex-wrap"><table class="ex-tbl"><tr><th>Ticker</th><th>Nama</th><th>Harga</th><th>Yield</th><th>Payout</th><th>ROE</th><th>PER</th><th>Ex-dividen</th></tr>${trows||`<tr><td colspan="8" class="ex-mut">Tidak ada yang memenuhi.</td></tr>`}</table></div>
  <p class="ex-mut">Yield tinggi sering berarti harga sudah turun atau dividen sekali-sekali (one-off). Cek konsistensi dividen beberapa tahun sebelum memutuskan.</p></div>
  <div class="ex-card"><h3>Kalkulator Target Pendapatan Pasif</h3><div class="ex-grid"><label>Target per bulan (Rp)<input id="ex-pp-t" type="number" value="${LS("pp_t",5000000)}"></label><label>Asumsi yield (%)<input id="ex-pp-y" type="number" step="0.1" value="${LS("pp_y",5)}"></label></div>
  <button class="ex-btn pri" data-act="ppRun">Hitung</button><div id="ex-pp-out" style="margin-top:8px"></div></div>`;
}
X.act("divApply",()=>{ SV("divf",{y:val("ex-dv-y"),pay:val("ex-dv-p"),roe:val("ex-dv-r"),liq:val("ex-dv-l")}); X.repaint(); });
X.act("ppRun",()=>{ const t=num("ex-pp-t"),y=num("ex-pp-y"),o=$("#ex-pp-out"); if(!(t>0&&y>0)){ o.innerHTML=`<span class="ex-dn">Isi target dan yield.</span>`; return; } SV("pp_t",t); SV("pp_y",y);
  o.innerHTML=`Modal yang dibutuhkan ≈ <b>${rp(t*12/(y/100))}</b> agar dividen ${rp(t)}/bulan pada yield ${y}% (sebelum pajak).`; });

/* ================= BACKUP & PULIHKAN ================= */
const SENS=/(token|key|secret|api|pass|supa|telegram|chat|auth|bearer)/i;
let pending=null;
function collect(inclSecret){ const o={}; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(!/^(ex_|ihsg_)/.test(k)) continue; if(!inclSecret&&SENS.test(k)) continue; o[k]=localStorage.getItem(k); } return o; }
function vData(){
  const all=collect(true), safe=collect(false), size=o=>(Object.values(o).reduce((a,v)=>a+(v||"").length,0)/1024).toFixed(0);
  const big=Object.keys(safe).map(k=>[k,(safe[k]||"").length]).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return `<div class="ex-card"><h3>💾 Backup & Pulihkan Data</h3>
  <p class="ex-mut">Semua jurnal, daftar, alert, paper trading, preset, dan pengaturan tampilan tersimpan di browser ini saja. Ganti browser/perangkat atau bersihkan data situs = hilang. Unduh backup berkala.</p>
  <p>Ditemukan <b>${Object.keys(safe).length}</b> entri data (≈ ${size(safe)} KB) tanpa kredensial; ${Object.keys(all).length-Object.keys(safe).length} entri kredensial (token/API key) terdeteksi.</p>
  ${big.length?`<p class="ex-mut">Terbesar: ${big.map(([k,n])=>`${E(k)} (${(n/1024).toFixed(0)} KB)`).join(", ")}</p>`:""}
  <label class="ex-mut" style="display:block;margin:6px 0"><input type="checkbox" id="ex-d-sec"> Sertakan kredensial (Supabase key, token Stockbit, API key, Telegram) — hanya jika file disimpan aman</label>
  <button class="ex-btn pri" data-act="bkExport">⬇ Unduh backup (.json)</button></div>
  <div class="ex-card"><h3>Pulihkan dari file</h3><input type="file" id="ex-d-file" accept="application/json,.json" class="ex-in"><div id="ex-d-sum" style="margin-top:8px">${pending?pendingHtml():""}</div></div>
  <div class="ex-card"><h3>Reset</h3><button class="ex-btn" data-act="bkReset">🗑 Hapus semua data Trader Tools (jurnal, daftar, alert, paper…)</button><p class="ex-mut">Data portofolio & watchlist utama aplikasi tidak terhapus.</p></div>`;
}
function pendingHtml(){ const k=Object.keys(pending.keys); return `<p>Backup tanggal <b>${E(pending.exportedAt||"?")}</b>: ${k.length} entri.</p><button class="ex-btn pri" data-act="bkRestore">Pulihkan sekarang (menimpa entri bernama sama)</button>`; }
X.act("bkExport",()=>{ const inc=!!($("#ex-d-sec")&&$("#ex-d-sec").checked); const keys=collect(inc);
  dl(`ihsg-screener-backup-${today()}.json`,JSON.stringify({app:"ihsg-screener-extras",version:1,exportedAt:new Date().toISOString(),includesSecrets:inc,keys},null,1)); toast("Backup diunduh"); });
X.onChange(e=>{ if(e.target.id!=="ex-d-file"||!e.target.files[0]) return; const r=new FileReader();
  r.onload=()=>{ try{ const j=JSON.parse(r.result); if(j.app!=="ihsg-screener-extras"||!j.keys||typeof j.keys!=="object") throw new Error("bukan file backup aplikasi ini"); pending=j; const o=$("#ex-d-sum"); if(o) o.innerHTML=pendingHtml(); }
    catch(x){ pending=null; const o=$("#ex-d-sum"); if(o) o.innerHTML=`<span class="ex-dn">File tidak valid: ${E(x.message)}</span>`; } };
  r.readAsText(e.target.files[0]); });
X.act("bkRestore",()=>{ if(!pending) return; const ks=Object.keys(pending.keys).filter(k=>/^(ex_|ihsg_)/.test(k)); if(!confirm(`Pulihkan ${ks.length} entri? Data bernama sama di browser ini akan ditimpa.`)) return;
  let n=0; ks.forEach(k=>{ try{ localStorage.setItem(k,String(pending.keys[k])); n++; }catch(e){} }); pending=null; toast(`${n} entri dipulihkan. Muat ulang halaman agar semua berlaku.`); X.repaint(); });
X.act("bkReset",()=>{ if(!confirm("Hapus SEMUA data Trader Tools (jurnal, daftar, alert, paper trading, preset)? Tidak bisa dibatalkan.")) return;
  const del=[]; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(/^ex_/.test(k)) del.push(k); } del.forEach(k=>localStorage.removeItem(k)); toast(`${del.length} entri dihapus`); X.repaint(); });


/* ================= UJI RESEP (forward test semua preset) ================= */
// Kenapa forward test, bukan backtest historis: data fundamental di app hanya snapshot terkini. Menjalankan resep
// hari ini lalu melihat return masa lalu = look-ahead bias. Jadi hasil tiap preset difoto per hari bursa lalu
// dinilai dari pergerakan harga SESUDAH foto itu, dibanding rata-rata semua saham likuid (benchmark equal-weight).
const PBT_LIQ=1e9, mean=a=>a.reduce((x,y)=>x+y,0)/a.length, median=a=>{ const b=[...a].sort((x,y)=>x-y), m=b.length>>1; return b.length%2?b[m]:(b[m-1]+b[m])/2; };
const pbtCost=()=>{ const c=parseFloat(LS("pbt_cost",0.5)); return isFinite(c)&&c>=0?c:0; };
const pbt=()=>{ const d=LS("pbt",{days:[]}); if(!Array.isArray(d.days)) d.days=[]; return d; };
let hzHtml="", pbtSel=null;
function takeSnap(manual){
  const S=SS(); if(S.length<50){ if(manual) toast("Data saham belum dimuat","down"); return false; }
  const d=pbt(), t=today(); if(d.days.some(x=>x.d===t)){ if(manual) toast("Snapshot hari ini sudah ada","down"); return false; }
  const px={}; S.forEach(s=>{ if(s.ticker&&!s.suspended&&PX(s)>0&&(liqOf(s)||0)>=PBT_LIQ) px[s.ticker]=PX(s); });
  const pk={}; PRESETS.forEach(p=>{ pk[p.id]=runPreset(p,PBT_LIQ).res.map(r=>r.s.ticker).filter(x=>px[x]!=null).slice(0,30); });
  d.days.push({d:t,px,pk}); d.days=d.days.slice(-120); SV("pbt",d); if(manual) toast("Snapshot semua preset tersimpan"); return true;
}
X.tick(()=>{ if(LS("pbt_auto",false)){ const wd=new Date().getDay(); if(wd>0&&wd<6) takeSnap(false); } });
function evalPBT(){
  const days=pbt().days, R={}; PRESETS.forEach(p=>{ R[p.id]={obs:[],days:[]}; });
  days.forEach(day=>{ const all=Object.keys(day.px).map(t=>{ const n=PX(stk(t)); return n>0?(n/day.px[t]-1)*100:null; }).filter(v=>v!=null), bench=all.length?mean(all):null;
    PRESETS.forEach(p=>{ const r=(day.pk[p.id]||[]).map(t=>{ const n=PX(stk(t)); return n>0?(n/day.px[t]-1)*100:null; }); const ok=r.filter(v=>v!=null).map(v=>v-pbtCost()); if(!ok.length) return;
      R[p.id].obs.push(...ok); R[p.id].days.push({d:day.d,n:ok.length,avg:mean(ok),bench,ex:bench==null?null:mean(ok)-bench,win:ok.filter(v=>v>0).length/ok.length*100}); }); });
  return R;
}
function vPBT(){
  const d=pbt(), R=evalPBT(), auto=LS("pbt_auto",false);
  const rows=PRESETS.map(p=>{ const r=R[p.id], ex=r.days.filter(x=>x.ex!=null);
    return {p,n:r.obs.length,nd:r.days.length,win:r.obs.length?r.obs.filter(v=>v>0).length/r.obs.length*100:null,avg:r.obs.length?mean(r.obs):null,med:r.obs.length?median(r.obs):null,exA:ex.length?mean(ex.map(x=>x.ex)):null,beat:ex.length?ex.filter(x=>x.ex>0).length/ex.length*100:null,worst:ex.length?Math.min(...ex.map(x=>x.ex)):null}; }).sort((a,b)=>(b.exA==null?-1e9:b.exA)-(a.exA==null?-1e9:a.exA));
  const selId=pbtSel||(rows[0]&&rows[0].p.id), sp=PRESETS.find(x=>x.id===selId)||PRESETS[0];
  const dd=(R[sp.id]||{days:[]}).days.slice().reverse().map(x=>`<tr><td>${E(x.d)}</td><td>${x.n}</td><td class="${cls(x.avg)}">${pc(x.avg)}</td><td class="${cls(x.bench)}">${x.bench==null?"-":pc(x.bench)}</td><td class="${cls(x.ex)}">${x.ex==null?"-":pc(x.ex)}</td><td>${x.win.toFixed(0)}%</td></tr>`).join("");
  return `<div class="ex-card"><h3>📊 Uji Resep — forward test semua preset</h3>
  <p class="ex-mut">Tiap snapshot memotret saham yang lolos tiap preset (maks. 30 teratas, hanya saham bernilai transaksi ≥ Rp1 M) beserta harga saat itu. Hasil dihitung dari harga sekarang. Pembanding: rata-rata return semua saham likuid yang sama di snapshot itu. Return saham pilihan preset sudah dikurangi biaya bolak-balik (fee, pajak, slippage) sesuai isian di bawah; benchmark tidak dikurangi biaya.</p>
  ${d.days.length<20?`<p class="ex-warn">⚠ Baru ${d.days.length} dari ±20 hari snapshot. Ranking di bawah masih bisa kebetulan; jangan dipakai untuk memilih strategi.</p>`:""}
  <p class="ex-mut"><b>Kenapa bukan backtest historis?</b> Data fundamental di aplikasi hanya kondisi terkini; menerapkannya ke masa lalu memberi hasil yang bias (kita sudah “tahu” siapa yang akhirnya bagus). Forward test ini jujur tapi butuh waktu: ${d.days.length} snapshot terkumpul. Di bawah ± 20 hari bursa, anggap hasilnya belum bermakna.</p>
  <button class="ex-btn pri" data-act="pbtSnap">📸 Ambil snapshot sekarang</button><button class="ex-btn" data-act="pbtHz">📈 Hitung horizon 5/10/20 hari (dari tabel flows)</button><button class="ex-btn" data-act="pbtCsv">⬇ CSV</button><button class="ex-btn" data-act="pbtClr">🗑 Hapus semua</button><button class="ex-btn" data-act="pbtToBt">💾 Kirim hasil preset terpilih (hari ini) ke tab Backtest</button>
  <label class="ex-mut" style="display:block;margin-top:10px">Biaya + slippage bolak-balik (% dari nilai posisi): <input id="ex-pbt-cost" type="number" step="0.05" min="0" value="${pbtCost()}" style="width:80px"> <span>(isi sesuai fee broker dan pajak jual Anda)</span></label>
  <label class="ex-mut" style="display:block;margin-top:10px"><input type="checkbox" data-act="pbtAuto" ${auto?"checked":""}> Snapshot otomatis tiap hari bursa (hanya berjalan saat aplikasi terbuka; harga yang tersimpan = harga yang sedang dimuat saat itu)</label></div>
  <div class="ex-card"><h3>Ringkasan per preset (diurutkan menurut selisih terhadap benchmark)</h3><div class="ex-wrap"><table class="ex-tbl"><tr><th>Preset</th><th>Hari</th><th>Observasi</th><th>Win rate</th><th>Rata² return</th><th>Median</th><th>Selisih vs benchmark</th><th>Hari menang</th><th>Selisih terburuk</th></tr>
  ${rows.map(r=>`<tr${r.nd<20?' style="opacity:.6"':""}><td><span class="ex-link" data-act="pbtSel" data-id="${r.p.id}">${E(r.p.name)}</span>${r.nd<20?' <span class="ex-warn" title="Kurang dari 20 hari snapshot">⚠</span>':""}</td><td>${r.nd}</td><td>${r.n}</td><td>${r.win==null?"-":r.win.toFixed(0)+"%"}</td><td class="${cls(r.avg)}">${r.avg==null?"-":pc(r.avg)}</td><td class="${cls(r.med)}">${r.med==null?"-":pc(r.med)}</td><td class="${cls(r.exA)}">${r.exA==null?"-":pc(r.exA)}</td><td>${r.beat==null?"-":r.beat.toFixed(0)+"%"}</td><td class="${cls(r.worst)}">${r.worst==null?"-":pc(r.worst)}</td></tr>`).join("")}</table></div>
  <p class="ex-mut">Satu snapshot yang sama dinilai berulang tiap hari, jadi angka ini “return sejak snapshot sampai sekarang” dan makin lama makin besar. Bandingkan antar preset, bukan sebagai angka absolut.</p></div>
  <div class="ex-card"><h3>Rincian: ${E(sp.name)} <span class="ex-mut">(klik nama preset di tabel untuk ganti)</span></h3><div class="ex-wrap"><table class="ex-tbl"><tr><th>Tanggal snapshot</th><th>Saham</th><th>Rata² sejak itu</th><th>Benchmark</th><th>Selisih</th><th>Win</th></tr>${dd||`<tr><td colspan="6" class="ex-mut">Belum ada data. Ambil snapshot dulu.</td></tr>`}</table></div></div>
  <div class="ex-card"><h3>Horizon tetap (5/10/20 hari bursa setelah snapshot)</h3>${hzHtml||`<p class="ex-mut">Klik “Hitung horizon” untuk memakai riwayat harga penutupan dari tabel flows. Berguna karena membandingkan semua snapshot pada jangka waktu yang sama.</p>`}</div>`;
}
X.act("pbtToBt",async()=>{ const p=PRESETS.find(x=>x.id===pbtSel)||PRESETS[0];
  if(typeof saveGenericListToBacktest!=="function"||typeof state==="undefined"||!state.genericBacktestItems){ toast("Mekanisme Backtest app tidak ditemukan","down"); return; }
  const r=runPreset(p,PBT_LIQ).res.slice(0,30).map(x=>({ticker:x.s.ticker,price:PX(x.s),kriteria:"Resep: "+p.name,keterangan:"Resep "+p.name+" ("+x.ok+"/"+p.checks.length+" lolos)"})).filter(x=>x.price>0);
  if(!r.length){ toast("Tidak ada saham lolos dengan harga valid","down"); return; }
  if(!confirm(`Simpan ${r.length} saham resep "${p.name}" ke tab Backtest dengan harga hari ini?`)) return;
  const ns="resep_"+p.id; state.genericBacktestItems[ns]=r; const sel=getBacktestSelection(ns); sel.clear(); r.forEach(x=>sel.add(x.ticker));
  await saveGenericListToBacktest(ns,"Resep: "+p.name); });
X.act("pbtSnap",()=>{ takeSnap(true); X.repaint(); });
X.onChange(e=>{ if(e.target.id!=="ex-pbt-cost") return; const v=parseFloat(e.target.value); SV("pbt_cost",isFinite(v)&&v>=0?v:0); hzHtml=""; X.repaint(); });
X.act("pbtAuto",el=>{ SV("pbt_auto",!!el.checked); toast(el.checked?"Snapshot otomatis aktif":"Snapshot otomatis mati"); });
X.act("pbtSel",el=>{ pbtSel=el.dataset.id; X.repaint(); });
X.act("pbtClr",()=>{ if(!confirm("Hapus semua snapshot uji resep?")) return; SV("pbt",{days:[]}); hzHtml=""; X.repaint(); });
X.act("pbtCsv",()=>{ const R=evalPBT(); const out=[["Preset","Tanggal snapshot","Jumlah saham","Rata2 return %","Benchmark %","Selisih %","Win %"]];
  PRESETS.forEach(p=>R[p.id].days.forEach(x=>out.push([p.name,x.d,x.n,x.avg.toFixed(2),x.bench==null?"":x.bench.toFixed(2),x.ex==null?"":x.ex.toFixed(2),x.win.toFixed(0)]))); dl(`uji-resep-${today()}.csv`,toCsv(out),"text/csv"); });
X.act("pbtHz",async()=>{
  const days=pbt().days; if(days.length<1){ toast("Belum ada snapshot","down"); return; }
  hzHtml=`<p class="ex-mut">Mengambil riwayat harga…</p>`; X.repaint();
  try{
    if(typeof SUPABASE_URL==="undefined"||!SUPABASE_URL) throw new Error("Supabase belum dikonfigurasi (Pengaturan).");
    const since=days[0].d, H={}, rows=[];
    for(let pg=0;pg<80;pg++){
      const qs=new URLSearchParams({select:"ticker,date,close",date:`gte.${since}`,order:"date.asc",limit:"1000",offset:String(pg*1000)});
      const r=await fetch(`${SUPABASE_URL}/flows?${qs}`,{headers:getSupaHeaders(),cache:"no-store"}); if(!r.ok) throw new Error("HTTP "+r.status);
      const part=await r.json(); if(!Array.isArray(part)) throw new Error("respons bukan array"); rows.push(...part); if(part.length<1000) break;
    }
    rows.forEach(r=>{ if(r.close==null) return; const h=H[r.ticker]||(H[r.ticker]={d:[],c:[]}); h.d.push(String(r.date).slice(0,10)); h.c.push(+r.close); });
    const at=(t,d0,h)=>{ const x=H[t]; if(!x) return null; let i=x.d.findIndex(z=>z>d0); if(i<0) return null; i+=h-1; return i<x.c.length?x.c[i]:null; };
    const HS=[5,10,20], agg={};
    PRESETS.forEach(p=>{ agg[p.id]={}; HS.forEach(h=>{ const dr=[]; let obs=[]; days.forEach(day=>{
      const b=Object.keys(day.px).map(t=>{ const n=at(t,day.d,h); return n>0?(n/day.px[t]-1)*100:null; }).filter(v=>v!=null); if(b.length<20) return;
      const r=(day.pk[p.id]||[]).map(t=>{ const n=at(t,day.d,h); return n>0?(n/day.px[t]-1)*100-pbtCost():null; }).filter(v=>v!=null); if(!r.length) return;
      obs.push(...r); dr.push(mean(r)-mean(b)); });
      agg[p.id][h]=dr.length?{nd:dr.length,avg:mean(obs),win:obs.filter(v=>v>0).length/obs.length*100,ex:mean(dr),beat:dr.filter(v=>v>0).length/dr.length*100}:null; }); });
    hzHtml=`<div class="ex-wrap"><table class="ex-tbl"><tr><th>Preset</th>${HS.map(h=>`<th>${h} hari: selisih vs benchmark · win · n hari</th>`).join("")}</tr>${PRESETS.map(p=>`<tr><td>${E(p.name)}</td>${HS.map(h=>{ const a=agg[p.id][h]; return a?`<td><span class="${cls(a.ex)}">${pc(a.ex)}</span> · ${a.win.toFixed(0)}% · ${a.nd}</td>`:`<td class="ex-mut">belum cukup</td>`; }).join("")}</tr>`).join("")}</table></div><p class="ex-mut">Harga acuan = harga saat snapshot; harga akhir = penutupan hari bursa ke-N sesudahnya. Snapshot yang belum cukup umur dilewati. “n hari” = jumlah snapshot yang ikut. Return preset sudah dikurangi biaya bolak-balik yang Anda isi di atas. Sampel kecil = hasil mudah kebetulan.</p>`;
  }catch(e){ hzHtml=`<p class="ex-dn">Gagal: ${E(e.message)}</p>`; }
  X.repaint();
});
/* ================= DAFTAR TAB ================= */
X.addTab("wl","⭐ Daftar",vWL);
X.addTab("heat","🔥 Peta",vHeat);
X.addTab("guru","🧙 Resep",vGuru);
X.addTab("rs","🏆 RS",vRS);
let cmpAutoDone=false;
X.addTab("cmp","🆚 Banding",vCmp,()=>{ // grafik otomatis dimuat sekali per pemuatan halaman bila sudah ada 2+ ticker tersimpan
  if(cmpAutoDone||cmpHtml) return; cmpAutoDone=true;
  if(parseT(val("ex-cmp-t")).length<2) return;
  const b=document.querySelector('[data-act="cmpRun"]'); if(b) b.click(); });
X.addTab("div","💸 Dividen",vDiv);
X.addTab("pbt","📊 Uji Resep",vPBT);
X.addTab("data","💾 Data",vData);
})();
