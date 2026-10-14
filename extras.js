// extras.js — Trader Tools untuk IHSG Screener Pro. Dimuat SETELAH app.js (& quant-hub.js).
// Isi: Jurnal, Kalkulator Posisi, Kalender/Berita, Alert Harga+Trailing, Paper Trading,
// Risiko (konsentrasi/korelasi/rebalancing), Kurva Ekuitas, Kartu Bagikan, Ctrl+K, PWA.
// Semua data disimpan di localStorage (prefix "ex_"). Tidak mengubah app.js.
(function(){
"use strict";
const $=s=>document.querySelector(s);
const E=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LS=(k,d)=>{try{const v=JSON.parse(localStorage.getItem("ex_"+k));return v==null?d:v}catch(e){return d}};
const SV=(k,v)=>{try{localStorage.setItem("ex_"+k,JSON.stringify(v))}catch(e){}};
const ST=()=>(typeof state!=="undefined"?state:{stocks:[],portfolio:[],watchlist:new Set()});
const stk=t=>(ST().stocks||[]).find(s=>s.ticker===String(t||"").trim().toUpperCase());
// Harga terakhir: baris state.stocks memakai cClose (bukan price). Fallback ke price/live bila ada.
const PX=s=>{ if(!s) return null; const v=s.cClose!=null?s.cClose:(s.price!=null?s.price:null); return v==null||isNaN(+v)?null:+v; };
const rp=n=>n==null||isNaN(n)?"-":(n<0?"-":"")+"Rp"+new Intl.NumberFormat("id-ID").format(Math.abs(Math.round(n)));
const pc=n=>n==null||isNaN(n)?"-":(n>=0?"+":"")+Number(n).toFixed(2)+"%";
const num=id=>{const e=$("#"+id);return e&&e.value!==""?parseFloat(String(e.value).replace(",",".")):NaN};
const val=id=>{const e=$("#"+id);return e?e.value.trim():""};
const toast=(m,t)=>{try{showToast(m,t||"up")}catch(e){console.log(m)}};
const today=()=>new Date().toISOString().slice(0,10);
const cls=n=>n>=0?"ex-up":"ex-dn";
const openPos=()=>(ST().portfolio||[]).filter(p=>p.status==="Open");
const ownTickers=()=>new Set([...(ST().watchlist||[]),...openPos().map(p=>p.ticker)]);
async function tg(text){ try{ if(typeof sendTelegramDirect==="function") return await sendTelegramDirect(text);}catch(e){} return {ok:false}; }
function notify(msg,useTg){
  toast("🔔 "+msg,"up");
  try{ if("Notification" in window && Notification.permission==="granted") new Notification("IHSG Screener Pro",{body:msg}); }catch(e){}
  if(useTg) tg("🔔 <b>IHSG Screener Pro</b>\n"+E(msg));
}

const snapTick=(p,mode)=>{ try{ if(typeof roundToTick==="function") return roundToTick(p,mode||"near"); }catch(e){} return Math.round(p); };
// Registry untuk modul tambahan (extras-plus.js): tab/aksi/hook didaftarkan dari luar tanpa mengubah file ini.
const EXT={views:{},after:{},onInput:[],onChange:[],ticks:[]};
/* ================= NAV & HALAMAN ================= */
const TABS=[["jurnal","📓 Jurnal"],["calc","🧮 Posisi"],["cal","📅 Kalender"],["alert","🔔 Alert"],["paper","🧪 Paper"],["risk","🧩 Risiko"],["equity","📈 Ekuitas"],["share","🖼️ Bagikan"]];
let cur=LS("tab","jurnal"), page=null, corrHtml="";
function mount(){
  const content=$("#content"); if(!content||$("#exPage")) return;
  page=document.createElement("div"); page.id="exPage"; content.parentNode.insertBefore(page,content.nextSibling);
  const tabs=$("#tabs");
  if(tabs){
    const g=document.createElement("div"); g.className="tab-group";
    g.innerHTML=`<div class="tab-group-header" style="cursor:default"><span class="tab-group-title"><span aria-hidden="true">🛠️</span><span class="tab-group-label">Trader Tools</span></span></div>
    <div class="tab-group-items"><a class="tab-btn ex-nav" href="#/tradertools" title="Trader Tools" aria-label="Trader Tools"><span class="tab-icon" aria-hidden="true">🛠️</span><span class="tab-label">Trader Tools</span></a></div>`;
    tabs.appendChild(g);
    g.querySelector(".ex-nav").addEventListener("click",e=>{e.preventDefault();openPage();});
    document.querySelectorAll("#tabs .tab-btn:not(.ex-nav)").forEach(b=>b.addEventListener("click",closePage,true));
  }
  window.addEventListener("popstate",()=>{ if(!/tradertools/.test(location.hash)) closePage(); });
  page.addEventListener("click",e=>{const el=e.target.closest("[data-act]"); if(el&&A[el.dataset.act]) A[el.dataset.act](el);});
  page.addEventListener("input",e=>{ if(e.target.id&&e.target.id.startsWith("ex-c-")) calcRun(); EXT.onInput.forEach(f=>{try{f(e)}catch(x){console.warn(x)}}); });
  page.addEventListener("change",e=>{ if(e.target.id==="ex-c-t") calcFill(); EXT.onChange.forEach(f=>{try{f(e)}catch(x){console.warn(x)}}); });
  const fab=document.createElement("button"); fab.id="exFab"; fab.title="Kalkulator Posisi (Ctrl+K untuk cari cepat)"; fab.textContent="🧮";
  fab.onclick=()=>{cur="calc";openPage();}; document.body.appendChild(fab);
  if(/tradertools/.test(location.hash)) openPage();
}
function openPage(){
  const c=$("#content"); if(c) c.style.display="none"; page.classList.add("on");
  document.querySelectorAll("#tabs .tab-btn").forEach(b=>b.classList.toggle("active",b.classList.contains("ex-nav")));
  history.pushState(null,"","#/tradertools"); const sb=$("#sidebarNav"); if(sb) sb.classList.remove("nav-open");
  paint();
}
function closePage(){ if(!page||!page.classList.contains("on")) return; page.classList.remove("on"); const c=$("#content"); if(c) c.style.display=""; document.querySelectorAll(".ex-nav").forEach(b=>b.classList.remove("active")); }
function paint(){
  if(!page) return;
  const V=EXT.views[cur]||{jurnal:vJurnal,calc:vCalc,cal:vCal,alert:vAlert,paper:vPaper,risk:vRisk,equity:vEquity,share:vShare}[cur]||vJurnal;
  page.innerHTML=`<div class="ex-tabs">${TABS.map(t=>`<button data-act="tab" data-t="${t[0]}" class="${t[0]===cur?"on":""}">${t[1]}</button>`).join("")}</div><div id="exBody">${V()}</div>`;
  if(cur==="calc") calcRun(); if(cur==="share") drawShare(); if(EXT.after[cur]){ try{EXT.after[cur]();}catch(e){console.warn("extras after:",e);} }
}
const live=()=>page&&page.classList.contains("on")&&!/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||"");

/* ================= 1. JURNAL ================= */
const SETUPS=["Smart Pick","Entry Price Scanner","BSJP","Skor Bagger","Bandarmologi","Breakout","Lainnya"];
const EMOS=["Tenang","Disiplin","FOMO","Takut","Serakah","Ragu"];
const opt=(a,sel)=>a.map(x=>`<option${x===sel?" selected":""}>${E(x)}</option>`).join("");
function vJurnal(){
  const J=LS("jurnal",[]), by={}, byE={};
  J.filter(j=>j.hasil!=="Open").forEach(j=>{
    [[by,j.setup],[byE,j.emosi]].forEach(([o,k])=>{const b=o[k]||(o[k]={n:0,w:0,s:0});b.n++;if(j.hasil==="Win")b.w++;b.s+=+j.pl||0;});
  });
  const st=o=>Object.keys(o).sort().map(k=>`<tr><td>${E(k)}</td><td>${o[k].n}</td><td>${(o[k].w/o[k].n*100).toFixed(0)}%</td><td class="${cls(o[k].s)}">${pc(o[k].s/o[k].n)}</td></tr>`).join("")||`<tr><td colspan="4" class="ex-mut">Belum ada trade selesai.</td></tr>`;
  return `<div class="ex-card"><h3>Catat Trade</h3><div class="ex-grid">
    <label>Tanggal<input id="ex-j-date" type="date" value="${today()}"></label>
    <label>Ticker<input id="ex-j-t" placeholder="BBCA" style="text-transform:uppercase"></label>
    <label>Setup<select id="ex-j-setup">${opt(SETUPS)}</select></label>
    <label>Emosi saat entry<select id="ex-j-emo">${opt(EMOS)}</select></label>
    <label>Hasil<select id="ex-j-hasil">${opt(["Open","Win","Loss"])}</select></label>
    <label>P/L %<input id="ex-j-pl" type="number" step="0.01" placeholder="mis. 4.5"></label>
    <label class="ex-wide">Alasan entry<textarea id="ex-j-why" rows="2"></textarea></label>
    <label class="ex-wide">Evaluasi (apa yang dipelajari)<textarea id="ex-j-eval" rows="2"></textarea></label></div>
    <button class="ex-btn pri" data-act="jSave">Simpan</button><button class="ex-btn" data-act="jImport">Impor dari Portofolio (Win/Loss)</button></div>
  <div class="ex-card"><h3>Statistik per Setup</h3><div class="ex-wrap"><table class="ex-tbl"><tr><th>Setup</th><th>Trade</th><th>Win rate</th><th>Rata-rata P/L</th></tr>${st(by)}</table></div>
  <h3 style="margin-top:14px">Statistik per Emosi</h3><div class="ex-wrap"><table class="ex-tbl"><tr><th>Emosi</th><th>Trade</th><th>Win rate</th><th>Rata-rata P/L</th></tr>${st(byE)}</table></div></div>
  <div class="ex-card"><h3>Riwayat (${J.length})</h3><div class="ex-wrap"><table class="ex-tbl"><tr><th>Tgl</th><th>Ticker</th><th>Setup</th><th>Emosi</th><th>Hasil</th><th>P/L</th><th>Catatan</th><th></th></tr>
  ${J.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(j=>`<tr><td>${E(j.date)}</td><td><b>${E(j.t)}</b></td><td>${E(j.setup)}</td><td>${E(j.emo)}</td><td>${E(j.hasil)}</td><td class="${cls(+j.pl)}">${j.pl===""||j.pl==null?"-":pc(+j.pl)}</td><td>${E(j.why)}${j.eval?`<br><span class="ex-mut">📝 ${E(j.eval)}</span>`:""}</td><td><button class="ex-btn sm" data-act="jDel" data-id="${j.id}">✕</button></td></tr>`).join("")||`<tr><td colspan="8" class="ex-mut">Kosong.</td></tr>`}</table></div></div>`;
}
/* ================= 2. KALKULATOR POSISI ================= */
function vCalc(){
  return `<div class="ex-card"><h3>Kalkulator Ukuran Posisi (1 lot = 100 saham)</h3><div class="ex-grid">
  <label>Ticker (isi harga otomatis)<input id="ex-c-t" placeholder="BBCA" style="text-transform:uppercase"></label>
  <label>Modal (Rp)<input id="ex-c-modal" type="number" value="${LS("modal",100000000)}"></label>
  <label>Risiko per trade (%)<input id="ex-c-risk" type="number" step="0.1" value="${LS("risk",1)}"></label>
  <label>Harga entry<input id="ex-c-entry" type="number"></label>
  <label>Stop loss<input id="ex-c-sl" type="number"></label>
  <label>Target (TP)<input id="ex-c-tp" type="number"></label>
  <label>Fee beli (%)<input id="ex-c-fb" type="number" step="0.01" value="${LS("fb",0.15)}"></label>
  <label>Fee jual (%)<input id="ex-c-fs" type="number" step="0.01" value="${LS("fs",0.25)}"></label></div>
  <div id="ex-c-out" style="margin-top:12px"></div></div>`;
}
function calcFill(){ const s=stk(val("ex-c-t")); if(s&&PX(s)!=null){ $("#ex-c-entry").value=PX(s); const sl=$("#ex-c-sl"); if(!sl.value) sl.value=snapTick(PX(s)*0.95,"down"); } calcRun(); }
function calcRun(){
  const m=num("ex-c-modal"),r=num("ex-c-risk"),en=num("ex-c-entry"),sl=num("ex-c-sl"),tp=num("ex-c-tp"),fb=num("ex-c-fb")||0,fs=num("ex-c-fs")||0, o=$("#ex-c-out"); if(!o) return;
  SV("modal",m);SV("risk",r);SV("fb",fb);SV("fs",fs);
  if(!(m>0&&r>0&&en>0&&sl>0)){ o.innerHTML=`<span class="ex-mut">Isi modal, risiko, entry, dan stop loss.</span>`; return; }
  if(sl>=en){ o.innerHTML=`<span class="ex-dn">Stop loss harus di bawah harga entry (posisi beli).</span>`; return; }
  const riskRp=m*r/100, byRisk=Math.floor(riskRp/((en-sl)*100)), byCash=Math.floor(m/(en*100*(1+fb/100))), lot=Math.max(0,Math.min(byRisk,byCash));
  const cost=lot*100*en*(1+fb/100), loss=lot*100*(en*(1+fb/100)-sl*(1-fs/100));
  let h=`<table class="ex-tbl"><tr><td>Batas risiko</td><td>${rp(riskRp)}</td></tr><tr><td><b>Jumlah lot</b></td><td><b>${lot} lot</b> (${lot*100} lembar) ${byCash<byRisk?`<span class="ex-warn">dibatasi modal</span>`:""}</td></tr>
  <tr><td>Nilai beli (+fee)</td><td>${rp(cost)} (${(cost/m*100).toFixed(1)}% modal)</td></tr><tr><td>Rugi jika kena SL (+fee)</td><td class="ex-dn">${rp(-loss)} (${(loss/m*100).toFixed(2)}% modal)</td></tr>`;
  if(tp>en){ const pf=lot*100*(tp*(1-fs/100)-en*(1+fb/100)); h+=`<tr><td>Untung jika kena TP</td><td class="ex-up">${rp(pf)}</td></tr><tr><td>Risk:Reward</td><td>1 : ${(pf/loss).toFixed(2)}</td></tr>`; }
  const bad=[["Entry",en],["Stop loss",sl],["Target",tp]].filter(([n,v])=>v>0&&snapTick(v,"near")!==v);
  if(bad.length) h+=`<tr><td colspan="2" class="ex-warn">⚠️ Bukan kelipatan fraksi harga BEI: ${bad.map(([n,v])=>`${n} ${v} → ${snapTick(v,"near")}`).join(", ")}</td></tr>`;
  o.innerHTML=h+`</table><button class="ex-btn" data-act="calcToPaper">➜ Buka sebagai Paper Trade</button><button class="ex-btn" data-act="calcToAlert">➜ Pasang alert SL & TP</button>`;
}
/* ================= 3+4. KALENDER AKSI KORPORASI & BERITA ================= */
const CAT=["Cum Dividen","Ex Dividen","RUPS","Rights Issue","Buyback","Stock Split","Lainnya"];
// Event otomatis (read-only) dari jadwal korporasi yang sudah dimuat app.js (ccFields: ex-dividen, bayar dividen, earnings)
function calAll(){
  const C=LS("cal",[]).slice();
  try{
    if(typeof ccFields==="function"){
      const t0=new Date(today());
      ownTickers().forEach(t=>{ const f=ccFields(t)||{};
        [["Ex Dividen",f.exDivDate],["Bayar Dividen",f.payDivDate],["Rilis Laporan Keuangan",f.nextEarnDate]].forEach(([type,d])=>{
          if(!d) return; const ds=String(d).slice(0,10), diff=Math.round((new Date(ds)-t0)/864e5); if(isNaN(diff)||diff<-1) return;
          C.push({id:`auto-${t}-${type}-${ds}`,t,type,date:ds,note:"otomatis dari jadwal korporasi aplikasi",auto:true}); }); });
    }
  }catch(e){}
  return C;
}
function vCal(){
  const C=calAll().sort((a,b)=>a.date.localeCompare(b.date)), own=ownTickers(), t0=new Date(today());
  return `<div class="ex-card"><h3>Tambah Event / Pengumuman</h3><div class="ex-grid">
  <label>Ticker<input id="ex-k-t" placeholder="TLKM" style="text-transform:uppercase"></label>
  <label>Jenis<select id="ex-k-type">${opt(CAT)}</select></label>
  <label>Tanggal<input id="ex-k-date" type="date" value="${today()}"></label>
  <label class="ex-wide">Catatan<input id="ex-k-note" placeholder="mis. DPS Rp150, recording date ..."></label></div>
  <button class="ex-btn pri" data-act="kSave">Simpan</button>
  <p class="ex-mut">Baris bertanda 🔗 (ex-dividen, bayar dividen, rilis laporan) terisi otomatis dari jadwal korporasi yang dimuat aplikasi untuk saham di Watchlist/Portofolio; RUPS, rights issue, dan lainnya tetap diinput manual. Pengingat Telegram (H-3 dan hari-H) hanya dikirim untuk saham di Watchlist/Portofolio terbuka. Tautan keterbukaan informasi resmi ada di tiap baris.</p></div>
  <div class="ex-card"><h3>Daftar Event</h3><div class="ex-wrap"><table class="ex-tbl"><tr><th>Tgl</th><th>Ticker</th><th>Jenis</th><th>Catatan</th><th>Cari berita</th><th></th></tr>
  ${C.map(c=>{const d=Math.round((new Date(c.date)-t0)/864e5);const tag=d<0?`<span class="ex-mut">lewat</span>`:d===0?`<b class="ex-warn">HARI INI</b>`:d<=3?`<span class="ex-warn">H-${d}</span>`:`<span class="ex-mut">H-${d}</span>`;
  return `<tr><td>${E(c.date)}<br>${tag}</td><td><b>${E(c.t)}</b>${own.has(c.t)?" ⭐":""}</td><td>${E(c.type)}</td><td>${E(c.note)}</td>
  <td><a href="https://www.idx.co.id/id/perusahaan-tercatat/keterbukaan-informasi/" target="_blank" rel="noopener">IDX</a> · <a href="https://news.google.com/search?q=${encodeURIComponent(c.t+" saham")}" target="_blank" rel="noopener">Berita</a></td>
  <td>${c.auto?`<span class="ex-mut" title="otomatis">🔗</span>`:`<button class="ex-btn sm" data-act="kDel" data-id="${c.id}">✕</button>`}</td></tr>`}).join("")||`<tr><td colspan="6" class="ex-mut">Belum ada event.</td></tr>`}</table></div></div>`;
}
/* ================= 6. ALERT HARGA + TRAILING ================= */
const ALT={p_gte:"Harga ≥",p_lte:"Harga ≤",vol_gte:"Rasio volume ≥ (x)",chg_gte:"Naik hari ini ≥ (%)",chg_lte:"Turun hari ini ≤ (%)",trail:"Trailing stop (% dari puncak)"};
function vAlert(){
  const AL=LS("alerts",[]), auto=LS("autoslt",true), perm=("Notification" in window)?Notification.permission:"n/a";
  return `<div class="ex-card"><h3>Alert Baru</h3><div class="ex-grid">
  <label>Ticker<input id="ex-a-t" placeholder="BBCA" style="text-transform:uppercase"></label>
  <label>Kondisi<select id="ex-a-type">${Object.keys(ALT).map(k=>`<option value="${k}">${ALT[k]}</option>`).join("")}</select></label>
  <label>Nilai<input id="ex-a-val" type="number" step="any"></label>
  <label>Telegram<select id="ex-a-tg"><option value="1">Kirim</option><option value="0">Tidak</option></select></label></div>
  <button class="ex-btn pri" data-act="aSave">Pasang</button><button class="ex-btn" data-act="aPerm">Aktifkan notifikasi browser (${E(perm)})</button>
  <label class="ex-mut" style="display:block;margin-top:10px"><input type="checkbox" id="ex-a-auto" data-act="aAuto" ${auto?"checked":""}> Otomatis awasi Cut Loss & Target TP semua posisi Portofolio yang masih Open</label>
  <p class="ex-mut">Dicek tiap 30 detik memakai data harga yang sudah dimuat aplikasi (ikut refresh data). Trailing stop mencatat harga tertinggi sejak alert dipasang.</p></div>
  <div class="ex-card"><h3>Alert Aktif & Riwayat</h3><div class="ex-wrap"><table class="ex-tbl"><tr><th>Ticker</th><th>Kondisi</th><th>Status</th><th></th></tr>
  ${AL.slice().reverse().map(a=>{const s=stk(a.t);return `<tr><td><b>${E(a.t)}</b> <span class="ex-mut">${s?rp(PX(s)):""}</span></td><td>${ALT[a.type]} ${a.val}${a.type==="trail"&&a.hwm?` <span class="ex-mut">(puncak ${rp(a.hwm)}, stop ${rp(a.hwm*(1-a.val/100))})</span>`:""}</td><td>${a.done?`<span class="ex-warn">✔ terpicu ${new Date(a.done).toLocaleString("id-ID")}</span>`:"⏳ aktif"}</td><td><button class="ex-btn sm" data-act="aDel" data-id="${a.id}">✕</button></td></tr>`}).join("")||`<tr><td colspan="4" class="ex-mut">Belum ada alert.</td></tr>`}</table></div></div>`;
}
function checkAlerts(){
  const AL=LS("alerts",[]); let ch=false;
  AL.forEach(a=>{ if(a.done) return; const s=stk(a.t); if(!s||PX(s)==null) return; const p=PX(s);
    if(a.type==="trail"&&(a.hwm==null||p>a.hwm)){a.hwm=p;ch=true;}
    const hit={p_gte:p>=a.val,p_lte:p<=a.val,vol_gte:(+s.volRatio||0)>=a.val,chg_gte:(+s.changePct||0)>=a.val,chg_lte:(+s.changePct||0)<=a.val,trail:a.hwm!=null&&p<=a.hwm*(1-a.val/100)}[a.type];
    if(hit){a.done=Date.now();ch=true;notify(`${a.t}: ${ALT[a.type]} ${a.val} terpenuhi (harga ${rp(p)})`,a.tg);}
  });
  if(ch) SV("alerts",AL);
  if(LS("autoslt",true)){ const F=LS("fired",{}); let fc=false;
    openPos().forEach(p=>{ const s=stk(p.ticker); if(!s||PX(s)==null) return; const px=PX(s);
      [["sl",p.cutLoss,px<=+p.cutLoss,"menyentuh Cut Loss"],["tp",p.targetTP,px>=+p.targetTP,"mencapai Target TP"]].forEach(([k,lv,hit,txt])=>{
        const key=`${p.id}:${k}:${today()}`; if(lv&&+lv>0&&hit&&!F[key]){F[key]=1;fc=true;notify(`${p.ticker} ${txt} (${rp(lv)}), harga ${rp(px)}`,true);} }); });
    if(fc) SV("fired",F); }
}
/* ================= 11. PAPER TRADING ================= */
function vPaper(){
  const P=LS("paper",[]), cl=P.filter(p=>p.status!=="Open"), w=cl.filter(p=>p.pl>0).length;
  return `<div class="ex-card"><h3>Posisi Paper Baru (uang virtual)</h3><div class="ex-grid">
  <label>Ticker<input id="ex-p-t" placeholder="BBCA" style="text-transform:uppercase"></label>
  <label>Lot<input id="ex-p-lot" type="number" value="10"></label>
  <label>Entry (kosong = harga sekarang)<input id="ex-p-en" type="number"></label>
  <label>Stop loss<input id="ex-p-sl" type="number"></label><label>Target<input id="ex-p-tp" type="number"></label>
  <label class="ex-wide">Catatan / setup<input id="ex-p-note"></label></div><button class="ex-btn pri" data-act="pSave">Buka Posisi</button>
  <p class="ex-mut">Posisi tutup otomatis saat harga menyentuh SL/TP (dicek tiap 30 detik). P/L belum menghitung fee.</p></div>
  <div class="ex-card"><h3>Hasil: ${cl.length} trade, win rate ${cl.length?(w/cl.length*100).toFixed(0):0}%, total ${pc(cl.reduce((a,p)=>a+p.pl,0))}</h3><div class="ex-wrap"><table class="ex-tbl"><tr><th>Ticker</th><th>Lot</th><th>Entry</th><th>SL / TP</th><th>Sekarang / Exit</th><th>P/L</th><th>Status</th><th></th></tr>
  ${P.slice().reverse().map(p=>{const s=stk(p.t),now=p.status==="Open"?(s?PX(s):null):p.exit,pl=p.status==="Open"?(now?(now/p.entry-1)*100:null):p.pl;
  return `<tr><td><b>${E(p.t)}</b><br><span class="ex-mut">${E(p.date)} ${E(p.note||"")}</span></td><td>${p.lot}</td><td>${rp(p.entry)}</td><td>${p.sl?rp(p.sl):"-"} / ${p.tp?rp(p.tp):"-"}</td><td>${rp(now)}</td><td class="${cls(pl)}">${pc(pl)}</td><td>${E(p.status)}</td><td>${p.status==="Open"?`<button class="ex-btn sm" data-act="pClose" data-id="${p.id}">Tutup</button>`:`<button class="ex-btn sm" data-act="pDel" data-id="${p.id}">✕</button>`}</td></tr>`}).join("")||`<tr><td colspan="8" class="ex-mut">Belum ada posisi.</td></tr>`}</table></div></div>`;
}
function closePaper(p,px,why){ p.exit=px; p.pl=(px/p.entry-1)*100; p.status=why||(p.pl>=0?"Win":"Loss"); p.closed=today(); }
function checkPaper(){
  const P=LS("paper",[]); let ch=false;
  P.forEach(p=>{ if(p.status!=="Open") return; const s=stk(p.t); if(!s||PX(s)==null) return; const px=PX(s);
    if(p.sl&&px<=p.sl){closePaper(p,px,"Loss");ch=true;notify(`Paper ${p.t} kena SL, P/L ${pc(p.pl)}`,false);}
    else if(p.tp&&px>=p.tp){closePaper(p,px,"Win");ch=true;notify(`Paper ${p.t} capai TP, P/L ${pc(p.pl)}`,false);} });
  if(ch) SV("paper",P);
}
/* ================= 5+7. RISIKO: KONSENTRASI, REBALANCING, KORELASI ================= */
function posValues(){ const m={}; openPos().forEach(p=>{ const s=stk(p.ticker),px=s&&PX(s)!=null?PX(s):+p.hargaBeli; m[p.ticker]=(m[p.ticker]||0)+(+p.lotBeli||0)*100*(px||0); }); return m; }
function groupBy(vals,mapFn){ const g={}; Object.keys(vals).forEach(t=>{ (mapFn(t)||["(lainnya)"]).forEach(k=>{g[k]=(g[k]||0)+vals[t];}); }); return g; }
function bars(g,total,limit){ return Object.keys(g).sort((a,b)=>g[b]-g[a]).map(k=>{const x=g[k]/total*100;return `<tr><td>${E(k)}</td><td style="width:45%"><div class="ex-bar" style="width:${Math.min(100,x)}%"></div></td><td class="${x>limit?"ex-warn":""}">${x.toFixed(1)}% ${x>limit?"⚠️":""}</td><td class="ex-mut">${rp(g[k])}</td></tr>`}).join(""); }
function vRisk(){
  const V=posValues(), tot=Object.values(V).reduce((a,b)=>a+b,0), tick=Object.keys(V);
  if(!tick.length) return `<div class="ex-card">Belum ada posisi Open di Portofolio.</div>`;
  const sek=groupBy(V,t=>{const s=stk(t);return [s&&s.sektor]}), mem=(M,t)=>{const r=[];if(typeof M!=="undefined")Object.keys(M).forEach(k=>{if(M[k].includes(t))r.push(k)});return r.length?r:null};
  const grp=groupBy(V,t=>typeof GRUP_SAHAM!=="undefined"?mem(GRUP_SAHAM,t):null), kat=groupBy(V,t=>typeof KATEGORI_SAHAM!=="undefined"?mem(KATEGORI_SAHAM,t):null);
  const T=LS("targets",""), tg={}; T.split("\n").forEach(l=>{const m=l.match(/^\s*([A-Za-z]{4})\s*[=:]\s*([\d.,]+)/);if(m)tg[m[1].toUpperCase()]=parseFloat(m[2].replace(",","."));});
  const rb=Object.keys(tg).map(t=>{const cu=(V[t]||0)/tot*100,d=(tg[t]-cu)/100*tot,s=stk(t),lot=s&&PX(s)?Math.round(d/(PX(s)*100)):null;return `<tr><td><b>${t}</b></td><td>${cu.toFixed(1)}%</td><td>${tg[t]}%</td><td class="${cls(d)}">${rp(d)}</td><td>${lot==null?"-":lot===0?"pas":(lot>0?"Beli ":"Jual ")+Math.abs(lot)+" lot"}</td></tr>`}).join("");
  return `<div class="ex-card"><h3>Konsentrasi Portofolio (nilai pasar posisi Open: ${rp(tot)})</h3>
  <b>Per saham</b> <span class="ex-mut">(⚠️ &gt; 25%)</span><table class="ex-tbl">${bars(V,tot,25)}</table>
  <b>Per sektor</b> <span class="ex-mut">(⚠️ &gt; 40%)</span><table class="ex-tbl">${bars(sek,tot,40)}</table>
  <b>Per grup kepemilikan</b><table class="ex-tbl">${bars(grp,tot,40)}</table><b>Per kategori/komoditas</b><table class="ex-tbl">${bars(kat,tot,40)}</table>
  <p class="ex-mut">Satu saham bisa masuk beberapa grup/kategori, jadi total persennya bisa melebihi 100%. Lot dihitung dari kolom lot beli posisi Open.</p></div>
  <div class="ex-card"><h3>Rebalancing ke Target</h3><textarea id="ex-r-t" class="ex-in" rows="4" placeholder="Satu per baris, mis.&#10;BBCA=30&#10;TLKM=20">${E(T)}</textarea><button class="ex-btn pri" data-act="rbSave">Simpan & Hitung</button>
  ${rb?`<div class="ex-wrap"><table class="ex-tbl"><tr><th>Ticker</th><th>Sekarang</th><th>Target</th><th>Selisih</th><th>Aksi</th></tr>${rb}</table></div>`:""}</div>
  <div class="ex-card"><h3>Korelasi Antar Posisi</h3><button class="ex-btn pri" data-act="corr">Hitung korelasi (return harian ±6 bulan)</button><div id="ex-corr">${corrHtml}</div></div>`;
}
async function runCorr(){
  const o=$("#ex-corr"), T=Object.keys(posValues()).slice(0,15); if(T.length<2){o.innerHTML=`<p class="ex-mut">Butuh minimal 2 saham Open.</p>`;return;}
  if(typeof SUPABASE_URL==="undefined"||!SUPABASE_URL){o.innerHTML=`<p class="ex-dn">Supabase belum dikonfigurasi.</p>`;return;}
  o.innerHTML=`<p class="ex-mut">Mengambil riwayat harga…</p>`;
  try{
    const since=new Date(Date.now()-185*864e5).toISOString().slice(0,10), rows=[];
    for(let pg=0;pg<30;pg++){
      const qs=new URLSearchParams({ticker:`in.(${T.join(",")})`,select:"ticker,date,close",date:`gte.${since}`,order:"date.asc",limit:"1000",offset:String(pg*1000)});
      const r=await fetch(`${SUPABASE_URL}/flows?${qs}`,{headers:getSupaHeaders(),cache:"no-store"}); if(!r.ok) throw new Error("HTTP "+r.status);
      const part=await r.json(); rows.push(...part); if(part.length<1000) break;
    }
    const px={}; rows.forEach(r=>{ if(r.close!=null)(px[r.ticker]||(px[r.ticker]={}))[String(r.date).slice(0,10)]=+r.close; });
    const have=T.filter(t=>px[t]&&Object.keys(px[t]).length>20);
    const corr=(a,b)=>{ const d=Object.keys(px[a]).filter(x=>px[b][x]!=null).sort(), ra=[],rb=[]; for(let i=1;i<d.length;i++){ra.push(px[a][d[i]]/px[a][d[i-1]]-1);rb.push(px[b][d[i]]/px[b][d[i-1]]-1);} if(ra.length<20) return null;
      const n=ra.length,ma=ra.reduce((s,x)=>s+x,0)/n,mb=rb.reduce((s,x)=>s+x,0)/n; let c=0,va=0,vb=0; for(let i=0;i<n;i++){c+=(ra[i]-ma)*(rb[i]-mb);va+=(ra[i]-ma)**2;vb+=(rb[i]-mb)**2;} return va&&vb?c/Math.sqrt(va*vb):null; };
    const hi=[]; let h=`<div class="ex-wrap"><table class="ex-tbl ex-heat"><tr><th></th>${have.map(t=>`<th>${t}</th>`).join("")}</tr>`;
    have.forEach((a,i)=>{ h+=`<tr><th>${a}</th>`+have.map((b,j)=>{ if(i===j) return `<td>1</td>`; const c=corr(a,b); if(c==null) return `<td>-</td>`; if(j>i&&c>=0.8) hi.push(`${a}–${b} (${c.toFixed(2)})`);
      const al=Math.abs(c); return `<td style="background:rgba(${c>=0?"239,68,68":"16,185,129"},${(al*0.6).toFixed(2)})">${c.toFixed(2)}</td>`; }).join("")+`</tr>`; });
    corrHtml=h+`</table></div>`+(hi.length?`<p class="ex-warn">⚠️ Korelasi tinggi (≥0,80): ${hi.map(E).join(", ")}. Posisi ini cenderung bergerak searah, jadi diversifikasinya semu.</p>`:`<p class="ex-mut">Tidak ada pasangan dengan korelasi ≥ 0,80.</p>`)+(have.length<T.length?`<p class="ex-mut">Tanpa data cukup: ${T.filter(t=>!have.includes(t)).join(", ")}.</p>`:"")+`<p class="ex-mut">Merah = searah, hijau = berlawanan. Sumber: tabel flows (harga penutupan).</p>`;
    o.innerHTML=corrHtml;
  }catch(e){ o.innerHTML=`<p class="ex-dn">Gagal: ${E(e.message)}</p>`; }
}
/* ================= 8. KURVA EKUITAS ================= */
function vEquity(){
  const C=(ST().portfolio||[]).filter(p=>(p.status==="Win"||p.status==="Loss")&&p.tglJual&&p.nilaiPL!=null).sort((a,b)=>String(a.tglJual).localeCompare(String(b.tglJual)));
  if(C.length<2) return `<div class="ex-card">Butuh minimal 2 posisi tertutup (Win/Loss) dengan tanggal jual di Portofolio.</div>`;
  let cum=0,peak=0,mdd=0; const pts=C.map(p=>{cum+=+p.nilaiPL;peak=Math.max(peak,cum);mdd=Math.min(mdd,cum-peak);return cum;});
  const wins=C.filter(p=>+p.nilaiPL>0), gp=wins.reduce((a,p)=>a+ +p.nilaiPL,0), gl=-C.filter(p=>+p.nilaiPL<0).reduce((a,p)=>a+ +p.nilaiPL,0);
  const W=700,H=220,pad=8,mn=Math.min(0,...pts),mx=Math.max(0,...pts),X=i=>pad+i/(pts.length-1)*(W-2*pad),Y=v=>H-pad-(v-mn)/((mx-mn)||1)*(H-2*pad);
  return `<div class="ex-card"><h3>Kurva Ekuitas (akumulasi P/L posisi tertutup)</h3>
  <svg class="ex-svg" viewBox="0 0 ${W} ${H}"><line x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}" stroke="currentColor" opacity=".25" stroke-dasharray="4"/><polyline fill="none" stroke="${cum>=0?"#10b981":"#ef4444"}" stroke-width="2.5" points="${pts.map((v,i)=>`${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}"/></svg>
  <table class="ex-tbl"><tr><td>Total P/L</td><td class="${cls(cum)}">${rp(cum)}</td></tr><tr><td>Jumlah trade</td><td>${C.length} (win rate ${(wins.length/C.length*100).toFixed(0)}%)</td></tr><tr><td>Max drawdown (Rp, dari puncak kumulatif)</td><td class="ex-dn">${rp(mdd)}</td></tr><tr><td>Profit factor</td><td>${gl?(gp/gl).toFixed(2):"∞"}</td></tr><tr><td>Rata-rata menang / kalah</td><td>${rp(gp/(wins.length||1))} / ${rp(-gl/((C.length-wins.length)||1))}</td></tr></table>
  <p class="ex-mut">Perbandingan dengan IHSG belum disertakan karena belum ada sumber riwayat indeks yang saya pastikan di data Anda.</p></div>`;
}
/* ================= 10. KARTU BAGIKAN ================= */
function vShare(){
  return `<div class="ex-card"><h3>Kartu Saham untuk Dibagikan</h3><div class="ex-grid"><label>Ticker<input id="ex-s-t" placeholder="BBCA" style="text-transform:uppercase" value="${E(LS("sharet",""))}"></label>
  <label class="ex-wide">Catatan (opsional)<input id="ex-s-n" placeholder="mis. Area beli 9.800–9.900, SL 9.600"></label></div>
  <button class="ex-btn pri" data-act="sDraw">Buat Kartu</button><button class="ex-btn" data-act="sDl">Unduh PNG</button><button class="ex-btn" data-act="sShare">Bagikan…</button>
  <div style="margin-top:12px"><canvas id="ex-cv" width="1080" height="640" style="width:100%;max-width:540px;border-radius:12px"></canvas></div><p class="ex-mut">Bukan rekomendasi investasi.</p></div>`;
}
function drawShare(){
  const cv=$("#ex-cv"); if(!cv) return; const c=cv.getContext("2d"), t=val("ex-s-t").toUpperCase(), s=stk(t); SV("sharet",t);
  const g=c.createLinearGradient(0,0,1080,640); g.addColorStop(0,"#0f172a"); g.addColorStop(1,"#1e293b"); c.fillStyle=g; c.fillRect(0,0,1080,640);
  c.fillStyle="#94a3b8"; c.font="600 28px sans-serif"; c.fillText("IHSG Screener Pro",60,70);
  if(!s){ c.fillStyle="#e2e8f0"; c.font="600 40px sans-serif"; c.fillText(t?`Ticker "${t}" tidak ditemukan`:"Isi ticker lalu klik Buat Kartu",60,330); return; }
  c.fillStyle="#f8fafc"; c.font="700 120px sans-serif"; c.fillText(s.ticker,60,210);
  c.fillStyle="#94a3b8"; c.font="500 30px sans-serif"; c.fillText(String(s.name||"").slice(0,48),60,260);
  const up=(+s.changePct||0)>=0; c.fillStyle="#f8fafc"; c.font="700 76px monospace"; c.fillText(PX(s)==null?"-":rp(PX(s)),60,375);
  c.fillStyle=up?"#10b981":"#ef4444"; c.font="700 50px monospace"; c.fillText(pc(+s.changePct),60,440);
  c.fillStyle="#cbd5e1"; c.font="500 30px sans-serif"; c.fillText(`Sektor: ${s.sektor||"-"}   ·   Rasio volume: ${s.volRatio!=null?(+s.volRatio).toFixed(2)+"x":"-"}`,60,505);
  const n=val("ex-s-n"); if(n){ c.fillStyle="#fbbf24"; c.font="600 30px sans-serif"; c.fillText(n.slice(0,60),60,555); }
  c.fillStyle="#64748b"; c.font="500 22px sans-serif"; c.fillText(new Date().toLocaleString("id-ID")+"  ·  bukan rekomendasi investasi",60,610);
}
/* ================= AKSI ================= */
const A={
  tab:el=>{cur=el.dataset.t;SV("tab",cur);paint();},
  jSave:()=>{ const t=val("ex-j-t").toUpperCase(); if(!t){toast("Isi ticker dulu","down");return;} const J=LS("jurnal",[]); J.push({id:Date.now(),date:val("ex-j-date")||today(),t,setup:val("ex-j-setup"),emo:val("ex-j-emo"),hasil:val("ex-j-hasil"),pl:val("ex-j-pl"),why:val("ex-j-why"),eval:val("ex-j-eval")}); SV("jurnal",J); paint(); },
  jDel:el=>{SV("jurnal",LS("jurnal",[]).filter(j=>String(j.id)!==el.dataset.id));paint();},
  jImport:()=>{ const J=LS("jurnal",[]), have=new Set(J.map(j=>j.src).filter(Boolean)); let n=0;
    (ST().portfolio||[]).filter(p=>(p.status==="Win"||p.status==="Loss")&&!have.has("p"+p.id)).forEach(p=>{J.push({id:Date.now()+n++,src:"p"+p.id,date:String(p.tglJual||p.tglBeli||today()).slice(0,10),t:p.ticker,setup:"Lainnya",emo:"Tenang",hasil:p.status,pl:p.persenPL!=null?+(+p.persenPL).toFixed(2):"",why:p.catatan||"(impor portofolio)",eval:""});});
    SV("jurnal",J); toast(`${n} trade diimpor. Lengkapi setup & emosinya agar statistik berguna.`); paint(); },
  calcToPaper:()=>{ cur="paper"; paint(); const t=val("ex-c-t"); /* nilai form sebelumnya sudah hilang setelah paint; isi ulang dari kalkulator */ },
  calcToAlert:()=>{ const t=LS("calcctx",null); },
  kSave:()=>{ const t=val("ex-k-t").toUpperCase(); if(!t){toast("Isi ticker","down");return;} const C=LS("cal",[]); C.push({id:Date.now(),t,type:val("ex-k-type"),date:val("ex-k-date"),note:val("ex-k-note")}); SV("cal",C); paint(); },
  kDel:el=>{SV("cal",LS("cal",[]).filter(c=>String(c.id)!==el.dataset.id));paint();},
  aSave:()=>{ const t=val("ex-a-t").toUpperCase(),v=num("ex-a-val"),type=val("ex-a-type"); if(!t||isNaN(v)){toast("Isi ticker & nilai","down");return;} const s=stk(t); const AL=LS("alerts",[]); AL.push({id:Date.now(),t,type,val:v,tg:val("ex-a-tg")==="1",created:Date.now(),hwm:type==="trail"&&s?PX(s):null}); SV("alerts",AL); paint(); },
  aDel:el=>{SV("alerts",LS("alerts",[]).filter(a=>String(a.id)!==el.dataset.id));paint();},
  aAuto:el=>{SV("autoslt",el.checked);},
  aPerm:()=>{ if("Notification" in window) Notification.requestPermission().then(paint); },
  pSave:()=>{ const t=val("ex-p-t").toUpperCase(),s=stk(t),en=num("ex-p-en")||(s&&PX(s)),lot=num("ex-p-lot"); if(!t||!(en>0)||!(lot>0)){toast("Ticker/harga/lot belum valid","down");return;}
    const P=LS("paper",[]); P.push({id:Date.now(),t,lot,entry:en,sl:num("ex-p-sl")||0,tp:num("ex-p-tp")||0,date:today(),note:val("ex-p-note"),status:"Open"}); SV("paper",P); paint(); },
  pClose:el=>{ const P=LS("paper",[]),p=P.find(x=>String(x.id)===el.dataset.id),s=p&&stk(p.t); if(p){closePaper(p,s?PX(s):p.entry,p.pl>=0?"Win":"Loss"); p.status=p.pl>=0?"Win":"Loss"; SV("paper",P);paint();} },
  pDel:el=>{SV("paper",LS("paper",[]).filter(p=>String(p.id)!==el.dataset.id));paint();},
  rbSave:()=>{SV("targets",$("#ex-r-t").value);paint();},
  corr:()=>runCorr(),
  sDraw:()=>drawShare(),
  sDl:()=>{ drawShare(); const a=document.createElement("a"); a.download=`${val("ex-s-t")||"saham"}.png`; a.href=$("#ex-cv").toDataURL("image/png"); a.click(); },
  sShare:()=>{ drawShare(); $("#ex-cv").toBlob(async b=>{ const f=new File([b],`${val("ex-s-t")||"saham"}.png`,{type:"image/png"}); try{ if(navigator.canShare&&navigator.canShare({files:[f]})) await navigator.share({files:[f],title:"IHSG Screener Pro"}); else A.sDl(); }catch(e){} }); }
};
// Kalkulator → Paper / Alert: ambil nilai SEBELUM pindah tab
A.calcToPaper=()=>{ const ctx={t:val("ex-c-t").toUpperCase(),en:num("ex-c-entry"),sl:num("ex-c-sl"),tp:num("ex-c-tp"),lot:(val("ex-c-out").match(/(\d+) lot/)||[])[1]}; const m=$("#ex-c-out").textContent.match(/Jumlah lot(\d+) lot/); ctx.lot=m?m[1]:""; cur="paper"; paint(); $("#ex-p-t").value=ctx.t;$("#ex-p-lot").value=ctx.lot||10;$("#ex-p-en").value=ctx.en||"";$("#ex-p-sl").value=ctx.sl||"";$("#ex-p-tp").value=ctx.tp||""; };
A.calcToAlert=()=>{ const t=val("ex-c-t").toUpperCase(),sl=num("ex-c-sl"),tp=num("ex-c-tp"); if(!t){toast("Isi ticker di kalkulator dulu","down");return;} const AL=LS("alerts",[]),id=Date.now(); if(sl>0)AL.push({id,t,type:"p_lte",val:sl,tg:true,created:id}); if(tp>0)AL.push({id:id+1,t,type:"p_gte",val:tp,tg:true,created:id}); SV("alerts",AL); toast("Alert SL/TP terpasang untuk "+t); cur="alert"; paint(); };
/* ================= 4b. PENGINGAT KALENDER ================= */
function checkCal(){
  const C=calAll(),own=ownTickers(),sent=LS("calsent",{}),t0=new Date(today()); let ch=false;
  C.forEach(c=>{ const d=Math.round((new Date(c.date)-t0)/864e5); if(d<0||d>3||!own.has(c.t)) return; const k=`${c.id}:${d===0?0:3}`; if(d>0&&d<3&&sent[`${c.id}:3`]) return; if(sent[k]) return; sent[k]=1; ch=true; notify(`${c.t}: ${c.type} ${d===0?"HARI INI":"H-"+d} ${c.note||""}`,true); });
  if(ch) SV("calsent",sent);
}
/* ================= 12. COMMAND PALETTE (Ctrl/Cmd+K) ================= */
let pal,palItems=[],palSel=0;
function buildPal(){
  pal=document.createElement("div"); pal.id="exPal"; pal.innerHTML=`<div class="box"><input id="exPalIn" placeholder="Cari tab atau ticker… (Esc untuk tutup)" autocomplete="off"><div id="exPalList"></div></div>`; document.body.appendChild(pal);
  pal.addEventListener("click",e=>{ if(e.target===pal) closePal(); });
  const inp=pal.querySelector("input"); inp.addEventListener("input",()=>{palSel=0;palRender();});
  inp.addEventListener("keydown",e=>{ if(e.key==="Escape") closePal(); else if(e.key==="ArrowDown"){palSel=Math.min(palItems.length-1,palSel+1);palRender();e.preventDefault();} else if(e.key==="ArrowUp"){palSel=Math.max(0,palSel-1);palRender();e.preventDefault();} else if(e.key==="Enter"&&palItems[palSel]){palItems[palSel].go();closePal();} });
}
function palRender(){
  const q=pal.querySelector("input").value.trim().toLowerCase(); palItems=[];
  document.querySelectorAll("#tabs .tab-btn[data-tab]").forEach(b=>{ const l=(b.getAttribute("title")||"").trim(); if(l&&(!q||l.toLowerCase().includes(q))) palItems.push({l:"▸ "+l,s:"tab",go:()=>{closePage();selectMainTab(b.dataset.tab);}}); });
  TABS.forEach(t=>{ if(!q||t[1].toLowerCase().includes(q)||"trader tools".includes(q)) palItems.push({l:"🛠️ "+t[1],s:"Trader Tools",go:()=>{cur=t[0];SV("tab",cur);openPage();}}); });
  if(q) (ST().stocks||[]).filter(s=>s.ticker.toLowerCase().startsWith(q)||String(s.name||"").toLowerCase().includes(q)).slice(0,8).forEach(s=>palItems.push({l:s.ticker,s:`${String(s.name||"").slice(0,30)} ${PX(s)!=null?rp(PX(s)):""}`,go:()=>{closePage();if(typeof openDetail==="function")openDetail(s.ticker);}}));
  palItems=palItems.slice(0,14);
  pal.querySelector("#exPalList").innerHTML=palItems.map((it,i)=>`<div class="it${i===palSel?" sel":""}" data-i="${i}"><span>${E(it.l)}</span><small>${E(it.s)}</small></div>`).join("")||`<div class="it"><small>Tidak ada hasil</small></div>`;
  pal.querySelectorAll(".it[data-i]").forEach(el=>el.onclick=()=>{palItems[+el.dataset.i].go();closePal();});
}
function openPal(){ if(!pal) buildPal(); pal.classList.add("on"); const i=pal.querySelector("input"); i.value=""; palSel=0; palRender(); i.focus(); }
function closePal(){ if(pal) pal.classList.remove("on"); }
document.addEventListener("keydown",e=>{ if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){ e.preventDefault(); pal&&pal.classList.contains("on")?closePal():openPal(); } });
/* ================= PWA ================= */
if("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
/* ================= API UNTUK MODUL TAMBAHAN ================= */
window.ExtrasAPI={
  E,LS,SV,ST,stk,PX,rp,pc,num,val,toast,today,cls,openPos,ownTickers,notify,tg,snapTick,
  get opt(){return opt;},
  addTab(id,label,view,after){ if(!TABS.some(t=>t[0]===id)) TABS.push([id,label]); EXT.views[id]=view; if(after) EXT.after[id]=after; },
  act(name,fn){ A[name]=fn; },
  onInput(f){ EXT.onInput.push(f); }, onChange(f){ EXT.onChange.push(f); }, tick(f){ EXT.ticks.push(f); },
  repaint(){ paint(); }, current(){ return cur; }, go(id){ cur=id; SV("tab",cur); openPage(); }, isLive:live
};
/* ================= START ================= */
function start(){ mount(); setInterval(()=>{ try{checkAlerts();checkPaper();checkCal();}catch(e){console.warn("extras:",e)} EXT.ticks.forEach(f=>{try{f()}catch(e){console.warn("extras tick:",e)}}); if(live()&&(cur==="alert"||cur==="paper")) paint(); },30000); setTimeout(()=>{try{checkAlerts();checkPaper();checkCal();}catch(e){} EXT.ticks.forEach(f=>{try{f()}catch(e){}});},8000); }
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
