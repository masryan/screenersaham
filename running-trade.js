// running-trade.js — Running Trade Stockbit: deteksi saham yang sedang di-HAKA dan diakumulasi.
// Dimuat SETELAH extras.js (butuh window.ExtrasAPI). Tidak mengubah app.js.
// Muncul sebagai tab "⚡ Running Trade" di Trader Tools.
//
// SUMBER DATA (pilih salah satu atau keduanya):
//  1) WebSocket Stockbit lewat ekstensi Chrome (pesan 'FROM_EXTENSION_WS' / 'FROM_EXTENSION_WS_TRAFFIC').
//     Parser mencari objek bergaya {code/symbol, price/last, lot/volume, action/side, buyer, seller}
//     di dalam JSON frame. Kalau frame berupa biner/protobuf, frame itu dihitung "tidak terbaca".
//  2) REST polling endpoint running-trade Stockbit lewat stockbitRawRequest() milik app.js
//     (token & Proxy URL dari Pengaturan). Sifatnya sampling: hanya N transaksi terbaru per tarikan.
//
// DEFINISI (asumsi, cocokkan dengan layar Running Trade Stockbit):
//  HAKA  = transaksi sisi "buy" (pembeli agresif menyambar offer). HAKI = sisi "sell".
//  Kalau sisi tidak ada di data, dipakai tick-rule (harga naik = beli, turun = jual) dan ditandai estimasi.
//  Di-HAKA    : nilai HAKA dalam jendela >= batas, rasio HAKA >= batas, dan >= 2 HAKA besar.
//  Bandar     : broker dengan net beli (beli − jual) >= batas dan porsi >= 25% pembelian saham itu (butuh kode broker di data).
//  Akumulasi  : net beli >= batas, rasio beli >= batas, >= 3 beli besar, harga tidak jatuh.//
// FILTER (berlaku ke semua tabel, alert, dan riwayat sinyal; diterapkan saat agregasi sehingga berlaku surut untuk data yang sudah masuk):
//  Min lot per transaksi : transaksi dengan lot lebih kecil diabaikan (0 = nonaktif). 1 lot = 100 lembar.
//  Lot besar ≥           : transaksi/order dianggap "besar" bila nilainya >= batas Rp ATAU lotnya >= batas ini.
//  Min lot HAKA/akumulasi/broker : batas total lot (bukan nilai Rp) pada tiap daftar. Batas lot TIDAK ikut disesuaikan likuiditas.
//  Harga min/maks, Filter ticker (BBCA, BBRI, -GOTO = kecualikan).
(function(){
"use strict";
const X=window.ExtrasAPI;
if(!X){ console.warn("[running-trade] ExtrasAPI tidak ditemukan — muat extras.js lebih dulu."); return; }
const {E,LS,SV}=X;
const DEF_URL="https://exodus.stockbit.com/order-trade/running-trade?sort=DESC&limit=80&order_by=RUNNING_TRADE_ORDER_BY_TIME";
const CFG=Object.assign({ws:true,rest:false,url:DEF_URL,pollSec:3,tickers:"",hakaWin:5,accWin:15,
  hakaMinJt:300,hakaRatio:65,bigJt:50,accMinJt:200,accRatio:55,brkMinJt:100,minTrades:10,mkt:true,minLot:0,bigLot:0,hakaLot:0,accLot:0,brkLot:0,pxMin:0,pxMax:0,tkFilter:"",onlyOwn:false,onlyBull:false,tg:false,tick:true,auto:true,perPoll:5,adapt:true,refAdvM:20,bn:false,snd:false},LS("rt_cfg",{}));
// URL lama tersimpan di localStorage memakai order_by salah (RUN_TRADE_...): perbaiki otomatis. trade_number dibuang karena itu kursor tetap (data basi).
CFG.url=String(CFG.url||DEF_URL).replace("RUN_TRADE_ORDER_BY_TIME","RUNNING_TRADE_ORDER_BY_TIME").replace(/([?&])trade_number=\d*&?/,"$1").replace(/[?&]$/,"");
const RT={on:false,lastTs:{},first:[],diagOpen:false,trades:[],seen:new Set(),raw:new Map(),last:{},lastSide:{},flag:{},samples:[],busy:false,poll:null,rot:0,dirty:0,saved:0,
  st:{restored:0,symOk:0,symBad:0,watch:0,frames:0,parsed:0,unparsed:0,trades:0,est:0,brk:0,rest:0,restErr:null,restAt:0,startAt:0,lastIn:0,newest:0}};

/* ---------- util ---------- */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=(o,ks)=>{ for(const k of ks){ if(o[k]!=null&&o[k]!=="") return o[k]; } return null; };
const toNum=v=>v==null?NaN:+String(v).replace(/,/g,"");
const fv=n=>{ const a=Math.abs(n),s=n<0?"-":""; return s+(a>=1e9?(a/1e9).toFixed(2)+" M":a>=1e6?(a/1e6).toFixed(0)+" jt":Math.round(a/1e3)+" rb"); };
const fpx=n=>new Intl.NumberFormat("id-ID").format(n);
const fl=n=>{ const a=Math.abs(n),s=n<0?"-":""; return s+(a>=1e6?(a/1e6).toFixed(2)+" jt":a>=1e4?(a/1e3).toFixed(1)+" rb":fpx(a)); };   // jumlah lot
const pctS=n=>(n>=0?"+":"")+n.toFixed(2)+"%";
const sample=s=>{ RT.samples.push(String(s).slice(0,320)); if(RT.samples.length>5) RT.samples.shift(); };

/* ---------- normalisasi satu transaksi ---------- */
const TK=["code","symbol","ticker","stock","s"], PX=["price","last","p","trade_price"], LT=["lot","volume","vol","qty","v","trade_lot"];
const looks=o=>pick(o,TK)!=null&&pick(o,PX)!=null&&pick(o,LT)!=null;
function sideOf(o){
  const r=pick(o,["action","side","type","buy_sell","bs","flag","trade_type"]); if(r==null) return null;
  const s=String(r).toLowerCase();
  if(/^(b|buy|haka|beli|up)/.test(s)||s==="1") return "B";
  if(/^(s|sell|haki|jual|down)/.test(s)||s==="2") return "S";
  return null;
}
const brkCode=v=>{ if(v==null) return null; const c=String(v).toUpperCase().trim().replace(/\s*\[.*?\]\s*$/,""); return c||null; };   // "PP [D]" -> "PP"
function ingest(o,src,ts0){
  const tk=String(pick(o,TK)||"").toUpperCase().trim();
  if(!/^[A-Z]{2,6}$/.test(tk)) return false;
  const px=toNum(pick(o,PX)), lot=toNum(pick(o,LT));
  if(!(px>0)||!(lot>0)) return false;
  const id=pick(o,["id","trade_id","trade_number","tn"]);
  const buyer=brkCode(pick(o,["buyer","buyer_code","bc","b"])), seller=brkCode(pick(o,["seller","seller_code","sc"]));
  const ts=ts0>0?ts0:Date.now();
  const oid=pick(o,["group_order_number","buy_order_number"]), bF=/FOREIGN/i.test(String(o.buyer_type||""))||/\[F\]/i.test(String(pick(o,["buyer","buyer_code"])||"")), sF=/FOREIGN/i.test(String(o.seller_type||""))||/\[F\]/i.test(String(pick(o,["seller","seller_code"])||""));
  const key=id!=null?tk+"#"+id:(src==="rest"?[tk,pick(o,["time","t"]),px,lot,buyer,seller].join("|"):null);
  if(key){ if(RT.seen.has(key)) return true; RT.seen.add(key); if(RT.seen.size>40000) RT.seen.clear(); }
  let side=sideOf(o), est=false;
  if(!side&&CFG.tick){
    const p=RT.last[tk];
    side=p==null?null:px>p?"B":px<p?"S":(RT.lastSide[tk]||null); est=!!side;
  }
  RT.last[tk]=px; RT.lastTs[tk]=Math.max(RT.lastTs[tk]||0,ts); if(side) RT.lastSide[tk]=side;
  if(!side) return false;
  RT.trades.push({tk,px,lot,side,est,k:key||null,buyer,seller,ts,oid:oid!=null?String(oid):null,bF,sF});
  RT.dirty++; RT.st.trades++; RT.st.lastIn=Date.now(); if(ts>RT.st.newest) RT.st.newest=ts; if(buyer||seller) RT.st.brk++; if(est) RT.st.est++;
  if(RT.trades.length>30000) RT.trades.splice(0,5000);
  return true;
}
function walk(x,d,f){
  if(d>5||x==null) return;
  if(Array.isArray(x)){ x.forEach(v=>walk(v,d+1,f)); return; }
  if(typeof x!=="object") return;
  if(looks(x)){ f(x); return; }
  Object.values(x).forEach(v=>walk(v,d+1,f));
}

/* ---------- simpan/pulihkan transaksi (tahan refresh halaman) ---------- */
const KEEP=65*60000;     // sedikit di atas jendela terpanjang (60 menit)
const packT=x=>[x.tk,x.px,x.lot,x.side==="B"?1:0,x.est?1:0,x.ts,x.buyer||"",x.seller||"",x.oid||"",(x.bF?1:0)+(x.sF?2:0),x.k||""];
const unpackT=a=>({tk:a[0],px:a[1],lot:a[2],side:a[3]?"B":"S",est:!!a[4],ts:a[5],buyer:a[6]||null,seller:a[7]||null,oid:a[8]||null,bF:!!(a[9]&1),sF:!!(a[9]&2),k:a[10]||null});
function saveTrades(){
  if(RT.dirty===RT.saved) return;
  const from=Date.now()-KEEP, rows=[];
  for(let i=RT.trades.length-1;i>=0&&rows.length<8000;i--){ const x=RT.trades[i]; if(x.ts>=from) rows.push(packT(x)); }
  try{ SV("rt_trd",{at:Date.now(),rows:rows.reverse()}); RT.saved=RT.dirty; }catch(e){}
}
function loadTrades(){
  try{
    const d=LS("rt_trd",null); if(!d||!Array.isArray(d.rows)) return;
    const from=Date.now()-KEEP, L=d.rows.filter(a=>Array.isArray(a)&&a[5]>=from).map(unpackT).sort((a,b)=>a.ts-b.ts);
    L.forEach(x=>{ RT.trades.push(x); if(x.k) RT.seen.add(x.k); RT.last[x.tk]=x.px; RT.lastTs[x.tk]=Math.max(RT.lastTs[x.tk]||0,x.ts); RT.lastSide[x.tk]=x.side; if(x.buyer||x.seller) RT.st.brk++; if(x.est) RT.st.est++; });
    RT.st.trades=RT.trades.length; RT.st.restored=L.length;
  }catch(e){ console.warn("running-trade: gagal memulihkan",e); }
}

/* ---------- sumber 1: WebSocket dari ekstensi ---------- */
function onFrame(str){
  if(!RT.on||!CFG.ws) return;
  RT.st.frames++;
  let j=null;
  if(str&&typeof str==="object"){
    j=str; if(RT.first.length<8){ try{ RT.first.push(JSON.stringify(str).slice(0,500)); }catch(e){} }
  } else if(typeof str!=="string"){
    RT.st.unparsed++; sample("[bukan teks] "+Object.prototype.toString.call(str)); return;
  } else {
    const now=Date.now(), prev=RT.raw.get(str);
    if(prev&&now-prev<1000) return;                     // frame sama datang 2x lewat dua jalur pesan
    RT.raw.set(str,now); if(RT.raw.size>300) RT.raw.delete(RT.raw.keys().next().value);
    if(RT.first.length<8) RT.first.push(str.slice(0,500));
    try{ j=JSON.parse(str.replace(/^\d+/,"")); }catch(e){
      if(/^[A-Za-z0-9+\/=]{24,}$/.test(str)){          // kemungkinan base64 yang berisi JSON
        try{ j=JSON.parse(atob(str)); }catch(e2){ j=null; }
      }
      if(!j){ RT.st.unparsed++; sample(str); return; }
    }
  }
  let n=0; walk(j,0,o=>{ if(ingest(o,"ws")) n++; });
  if(n) RT.st.parsed++; else { RT.st.unparsed++; sample(typeof str==="string"?str:JSON.stringify(str)); }
}
window.addEventListener("message",e=>{
  const d=e.data; if(e.source!==window||!d) return;
  if(d.type==="FROM_EXTENSION_WS") onFrame(d.data);
  else if(d.type==="FROM_EXTENSION_WS_TRAFFIC"&&d.payload&&d.payload.direction==="recv") onFrame(d.payload.data);
});

/* ---------- sumber 2: REST polling ---------- */
async function pollOnce(){
  if(RT.busy||!RT.on||!CFG.rest) return; RT.busy=true;
  try{
    if(typeof stockbitRawRequest!=="function"){ RT.st.restErr="stockbitRawRequest tidak ditemukan (app.js belum termuat)."; return; }
    if(typeof state!=="undefined"&&!state.stockbitToken){ RT.st.restErr="Token Stockbit belum ada — isi/sinkronkan di Pengaturan."; return; }
    const list=watchList(), n=Math.max(1,Math.min(10,CFG.perPoll|0||5)); RT.st.watch=list.length;
    let tks=[]; if(list.length){ for(let i=0;i<Math.min(n,list.length);i++) tks.push(list[(RT.rot+i)%list.length]); RT.rot=(RT.rot+n)%list.length; }
    const urls=tks.map(t=>CFG.url+"&symbols[]="+encodeURIComponent(t)); if(!urls.length||CFG.mkt) urls.unshift(CFG.url);   // feed seluruh pasar duluan, lalu ticker bergiliran
    for(const u of urls){
      const want=(u.match(/symbols\[\]=([A-Za-z0-9]+)/)||[])[1];
      let cursor=null, all=[], dt=null;
      for(let pg=0,maxPg=(u===CFG.url?8:4);pg<maxPg;pg++){                         // trade_number = kursor: ambil halaman lebih lama kalau 1 halaman penuh transaksi baru
        const r=await stockbitRawRequest(cursor?u+"&trade_number="+cursor:u);
        if(r.error){ RT.st.restErr=r.error; break; }
        RT.st.restErr=null; RT.st.restAt=Date.now();
        dt=(r.raw&&r.raw.data&&r.raw.data.date)||dt; if(r.raw&&r.raw.data&&typeof r.raw.data.is_open_market==="boolean"){ RT.st.open=r.raw.data.is_open_market; RT.st.dataDate=dt; }
        const items=[]; walk(r.raw,0,o=>items.push(o));
        if(!items.length){ if(!pg) sample("[REST tanpa transaksi terbaca] "+JSON.stringify(r.raw)); break; }
        RT.st.rest+=items.length; all=all.concat(items);
        if(want&&!pg){ const hit=items.filter(o=>String(pick(o,TK)||"").toUpperCase()===want.toUpperCase()).length; if(hit*2>=items.length) RT.st.symOk++; else RT.st.symBad++; }
        const fresh=items.filter(o=>{ const id=pick(o,["id","trade_id","trade_number","tn"]); const tk=String(pick(o,TK)||"").toUpperCase().trim(); return id==null||!RT.seen.has(tk+"#"+id); }).length;
        const tn=items.map(o=>toNum(o.trade_number)).filter(n=>n>0);
        if(fresh<items.length||!tn.length) break;     // sudah menyentuh data yang pernah diproses
        const nx=Math.min(...tn); if(nx===cursor) break; cursor=nx;
      }
      const tsOf=o=>{ const m=String(pick(o,["time","t"])||"").match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/); if(!dt||!m) return 0;
        const v=Date.parse(dt+"T"+m[1].padStart(2,"0")+":"+m[2]+":"+(m[3]||"00")+"+07:00"); return v>0?v:0; };
      all.reverse().forEach(o=>ingest(o,"rest",tsOf(o)));   // respons terbaru-dulu → proses dari yang terlama; ts = waktu bursa (WIB)
    }
  } finally { RT.busy=false; }
}
function watchList(){            // manual dulu, lalu Watchlist/Posisi, lalu Smart Pick (skor tertinggi dulu); kosong = seluruh pasar
  const man=CFG.tickers.split(/[\s,]+/).map(s=>s.toUpperCase()).filter(s=>/^[A-Z]{2,6}$/.test(s));
  let auto=[]; if(CFG.auto){ try{ auto=[...X.ownTickers()].concat(ctx().spTk); }catch(e){} }
  return [...new Set(man.concat(auto))].slice(0,60);
}
function applyPoll(){
  if(RT.poll){ clearInterval(RT.poll); RT.poll=null; }
  if(RT.on&&CFG.rest){ pollOnce(); RT.poll=setInterval(pollOnce,Math.max(2,CFG.pollSec)*1000); }
}

/* ---------- filter lot / harga / ticker ---------- */
let TKF={s:null,inc:null,exc:null};
function tkFilter(){
  if(TKF.s===CFG.tkFilter) return TKF;
  const inc=new Set(), exc=new Set();
  String(CFG.tkFilter||"").toUpperCase().split(/[\s,;]+/).filter(Boolean).forEach(t=>{ const ex=/^[-!]/.test(t), c=t.replace(/^[-!]/,""); if(!/^[A-Z]{2,6}$/.test(c)) return; (ex?exc:inc).add(c); });
  TKF={s:CFG.tkFilter,inc:inc.size?inc:null,exc:exc.size?exc:null}; return TKF;
}
function filtersOn(){ const f=tkFilter(); return CFG.minLot>0||CFG.pxMin>0||CFG.pxMax>0||!!f.inc||!!f.exc; }
function useTr(x){        // transaksi ini ikut dihitung?
  if(CFG.minLot>0&&x.lot<CFG.minLot) return false;
  if(CFG.pxMin>0&&x.px<CFG.pxMin) return false;
  if(CFG.pxMax>0&&x.px>CFG.pxMax) return false;
  const f=tkFilter(); if(f.inc&&!f.inc.has(x.tk)) return false; if(f.exc&&f.exc.has(x.tk)) return false;
  return true;
}

/* ---------- agregasi per ticker dalam jendela waktu ---------- */
function agg(winMs){
  const now=Date.now(), from=now-winMs, m=new Map(), t=RT.trades;
  for(let i=t.length-1;i>=0;i--){
    const x=t[i]; if(x.ts<from||!useTr(x)) continue;
    let a=m.get(x.tk);
    if(!a){ a={tk:x.tk,bv:0,sv:0,bl:0,sl:0,maxL:0,nb:0,ns:0,big:0,hi:x.px,lo:x.px,first:x.px,last:x.px,b60:0,one:[],ord:new Map(),brk:new Map()}; m.set(x.tk,a); }
    const v=x.px*x.lot*100;
    a.first=x.px; if(x.px>a.hi) a.hi=x.px; if(x.px<a.lo) a.lo=x.px; if(x.lot>a.maxL) a.maxL=x.lot;
    if(x.side==="B"){
      a.bv+=v; a.bl+=x.lot; a.nb++;
      if(x.oid){ const o=a.ord.get(x.oid)||{v:0,l:0}; o.v+=v; o.l+=x.lot; a.ord.set(x.oid,o); } else a.one.push({v,l:x.lot});
      if(x.ts>=now-60000) a.b60+=v;
      if(x.buyer) a.brk.set(x.buyer,(a.brk.get(x.buyer)||0)+v);
    } else { a.sv+=v; a.sl+=x.lot; a.ns++; }
  }
  m.forEach(a=>{
    const big=thr(a.tk,CFG.bigJt), bl=CFG.bigLot, isBig=o=>o.v>=big||(bl>0&&o.l>=bl);
    a.big=0; a.one.forEach(o=>{ if(isBig(o)) a.big++; }); a.ord.forEach(o=>{ if(isBig(o)) a.big++; });   // order beli yang dipecah jadi banyak transaksi dihitung sekali
    const tot=a.bv+a.sv; a.ratio=tot?a.bv/tot:0; a.net=a.bv-a.sv;
    a.chg=a.first?(a.last-a.first)/a.first*100:0; a.rng=a.first?(a.hi-a.lo)/a.first:0;
    let top=null,tv=0; a.brk.forEach((v,k)=>{ if(v>tv){ tv=v; top=k; } });
    a.topBrk=top; a.topShare=a.bv?tv/a.bv:0;
  });
  return m;
}
function okTk(tk,cnt,own){
  if(cnt<CFG.minTrades) return false;
  if(CFG.onlyOwn&&!own.has(tk)) return false;
  if(CFG.onlyBull){ const r=X.stk(tk); if(!r||typeof trendTone!=="function"||trendTone(r.trendHarga)!=="up") return false; }
  return true;
}
let CTX={at:0,sp:new Map(),adv:new Map(),spTk:[]};
function ctx(){                  // Smart Pick + rata-rata nilai transaksi harian per ticker; enriched() berat, jadi di-cache 60 dtk
  const now=Date.now(); if(now-CTX.at<60000) return CTX; CTX.at=now;
  const sp=new Map(), adv=new Map(), score=new Map();
  try{
    if(typeof enriched==="function"){
      const rows=enriched(), defs=(typeof SMART_PICK_DEFS!=="undefined")?SMART_PICK_DEFS:[];
      rows.forEach(r=>{
        const tk=r.ticker; if(!tk) return;
        defs.forEach(d=>{ try{ const x=d.detect(r); if(x&&x.match){ const l=sp.get(tk)||[]; l.push(d.title); sp.set(tk,l); score.set(tk,Math.max(score.get(tk)||0,x.score||0)); } }catch(e){} });
        // rata-rata nilai harian (Rp): riwayat Stockbit kalau ada; kalau tidak, nilai hari ini ÷ rasio volume (satuan lot/lembar saling meniadakan)
        let v=null; try{ if(typeof spStockbitAvgValue==="function") v=spStockbitAvgValue(tk); }catch(e){}
        if(!(v>0)){ const vt=(r.valueTraded!=null?r.valueTraded:r.turnover), vr=r.volRatio; if(vt>0&&vr>0.05) v=vt/vr; }
        if(v>0) adv.set(tk,v);
      });
    }
  }catch(e){ console.warn("running-trade: konteks aplikasi",e); }
  CTX.sp=sp; CTX.adv=adv; CTX.spTk=[...score.entries()].sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
  return CTX;
}
const spMap=()=>ctx().sp;
// pengali batas per saham: likuiditas acuan = pengali 1×; saham 5× lebih likuid butuh nilai 5× lebih besar (batas 0.3×–5×)
function scale(tk){
  if(!CFG.adapt) return 1;
  const adv=ctx().adv.get(tk), ref=CFG.refAdvM*1e9; if(!(adv>0)||!(ref>0)) return 1;
  return clamp(adv/ref,0.3,5);
}
const thr=(tk,jt)=>jt*1e6*scale(tk);
const whale=a=>a.share>=.4&&a.net>=thr(a.tk,CFG.brkMinJt*2);
function badges(tk){
  let b=""; try{
    if(X.ownTickers().has(tk)) b+=" ⭐";
    const sp=spMap().get(tk); if(sp) b+=` <span title="Smart Pick: ${E(sp.join(", "))}">✨</span>`;
    const sc=scale(tk); if(CFG.adapt&&Math.abs(sc-1)>.05) b+=` <span class="ex-mut" title="Batas nilai dikali ${sc.toFixed(2)} sesuai likuiditas saham">×${sc.toFixed(1)}</span>`;
    const r=X.stk(tk);
    if(r&&typeof trendTone==="function"&&trendTone(r.trendHarga)==="up") b+=" 📈";
    if(r&&r.keyakinanTone==="up") b+=" ✅";
  }catch(e){}
  return b;
}
function hakaList(){
  const m=agg(CFG.hakaWin*60000), out=[], own=X.ownTickers();
  m.forEach(a=>{ if(a.bv>=thr(a.tk,CFG.hakaMinJt)&&a.ratio*100>=CFG.hakaRatio&&a.big>=2&&a.bl>=CFG.hakaLot&&okTk(a.tk,a.nb+a.ns,own)) out.push(a); });
  return out.sort((a,b)=>b.bv-a.bv);
}
function accList(){
  const m=agg(CFG.accWin*60000), out=[], own=X.ownTickers();
  m.forEach(a=>{
    if(!(a.net>=thr(a.tk,CFG.accMinJt)&&a.ratio*100>=CFG.accRatio&&a.big>=3&&a.chg>-1.5&&(a.bl-a.sl)>=CFG.accLot&&okTk(a.tk,a.nb+a.ns,own))) return;
    a.score=Math.round(
      clamp((a.ratio-.5)/.3,0,1)*35 + clamp(a.net/(thr(a.tk,CFG.accMinJt)*4),0,1)*25 + clamp(a.big/10,0,1)*15 +
      (a.chg>=0?10:a.chg>-.5?5:0) + (a.rng<=.015?5:0) + (a.topShare>=.4?10:a.topShare>=.25?6:0));
    out.push(a);
  });
  return out.sort((a,b)=>b.score-a.score);
}

/* ---------- bandar: broker dengan net beli terbesar per ticker ---------- */
function brokerList(){
  const from=Date.now()-CFG.accWin*60000, m=new Map(), tot={}, cnt={}, own=X.ownTickers();
  for(let i=RT.trades.length-1;i>=0;i--){
    const x=RT.trades[i]; if(x.ts<from||!useTr(x)) continue;
    const v=x.px*x.lot*100; cnt[x.tk]=(cnt[x.tk]||0)+1;
    if(x.buyer){ tot[x.tk]=(tot[x.tk]||0)+v; const k=x.tk+"|"+x.buyer; const a=m.get(k)||{tk:x.tk,br:x.buyer,buy:0,sell:0,bl:0,sl:0,n:0,f:false}; a.buy+=v; a.bl+=x.lot; a.n++; if(x.bF) a.f=true; m.set(k,a); }
    if(x.seller){ const k=x.tk+"|"+x.seller; const a=m.get(k)||{tk:x.tk,br:x.seller,buy:0,sell:0,bl:0,sl:0,n:0,f:false}; a.sell+=v; a.sl+=x.lot; if(x.sF) a.f=true; m.set(k,a); }
  }
  const out=[];
  m.forEach(a=>{
    a.net=a.buy-a.sell; a.netL=a.bl-a.sl; a.share=tot[a.tk]?a.buy/tot[a.tk]:0;
    if(a.net>=thr(a.tk,CFG.brkMinJt)&&a.netL>=CFG.brkLot&&a.share>=.25&&okTk(a.tk,cnt[a.tk]||0,own)) out.push(a);
  });
  return out.sort((a,b)=>b.net-a.net).slice(0,20);
}

/* ---------- aliran asing: net beli/jual broker asing per ticker ---------- */
function foreignList(){
  const from=Date.now()-CFG.accWin*60000, m=new Map(), own=X.ownTickers();
  for(let i=RT.trades.length-1;i>=0;i--){
    const x=RT.trades[i]; if(x.ts<from||!useTr(x)) continue;
    const v=x.px*x.lot*100; let a=m.get(x.tk); if(!a){ a={tk:x.tk,fb:0,fs:0,fbl:0,fsl:0,tot:0,n:0}; m.set(x.tk,a); }
    a.tot+=v; a.n++; if(x.bF){ a.fb+=v; a.fbl+=x.lot; } if(x.sF){ a.fs+=v; a.fsl+=x.lot; }
  }
  const out=[];
  m.forEach(a=>{ a.net=a.fb-a.fs; a.netL=a.fbl-a.fsl; a.share=a.tot?(a.fb+a.fs)/(2*a.tot):0;
    if(Math.abs(a.net)>=thr(a.tk,CFG.brkMinJt)&&Math.abs(a.netL)>=CFG.brkLot&&okTk(a.tk,a.n,own)) out.push(a); });
  return out.sort((a,b)=>Math.abs(b.net)-Math.abs(a.net)).slice(0,12);
}

/* ---------- tampilan ---------- */
const ck=(id,v)=>`<label style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" id="${id}"${v?" checked":""} style="width:auto"> `;
function view(){
  const sel=(id,arr,v)=>`<select id="${id}">${arr.map(n=>`<option value="${n}"${+v===n?" selected":""}>${n} menit</option>`).join("")}</select>`;
  const inp=(id,v,t)=>`<input id="${id}" ${t||"type=\"number\""} value="${E(v)}">`;
  return `<div class="ex-card"><h3>⚡ Running Trade — deteksi HAKA &amp; akumulasi</h3>
  <div class="ex-mut" style="margin-bottom:10px;line-height:1.55">HAKA = pembeli agresif menyambar offer; nilai dihitung dari harga × lot × 100. ⭐ = Watchlist/posisi, ✨ = lolos Smart Pick (arahkan kursor untuk nama sinyalnya), 📈 = trend Bullish di Screener, ✅ = keyakinan tinggi. Batas nilai (HAKA, akumulasi, bandar, transaksi besar) dikalikan ×N sesuai likuiditas saham (acuan di pengaturan; saham sepi 0.3×, sangat likuid sampai 5×). Deteksi memakai transaksi yang tertangkap sejak tombol Mulai ditekan, jadi butuh beberapa menit untuk terisi. Filter lot/harga/ticker berlaku ke semua tabel dan alert; 1 lot = 100 lembar, dan batas lot tidak ikut disesuaikan likuiditas seperti batas nilai.</div>
  <div class="ex-grid">
    ${ck("rt-ws",CFG.ws)}Sumber WebSocket (ekstensi)</label>
    ${ck("rt-rest",CFG.rest)}Sumber REST polling</label>
    <label>Interval REST (detik)${inp("rt-poll",CFG.pollSec)}</label>
    ${ck("rt-auto",CFG.auto)}Ticker REST otomatis: Watchlist/Posisi + Smart Pick</label>
    ${ck("rt-mkt",CFG.mkt)}Sertakan feed seluruh pasar tiap tarikan (disarankan)</label>
    <label>Ticker REST manual (opsional, ditambahkan di depan)${inp("rt-tickers",CFG.tickers,"type=\"text\" placeholder=\"BBCA, GOTO\"")}</label>
    <label>Ticker per tarikan (1–10, bergiliran)${inp("rt-pp",CFG.perPoll)}</label>
    ${ck("rt-adapt",CFG.adapt)}Batas menyesuaikan likuiditas saham</label>
    <label>Likuiditas acuan (miliar Rp/hari)${inp("rt-ref",CFG.refAdvM)}</label>
    <label>Jendela HAKA${sel("rt-hw",[1,3,5,15],CFG.hakaWin)}</label>
    <label>Jendela akumulasi${sel("rt-aw",[5,15,30,60],CFG.accWin)}</label>
    <label>Min nilai HAKA (jt Rp)${inp("rt-hmin",CFG.hakaMinJt)}</label>
    <label>Min rasio HAKA (%)${inp("rt-hr",CFG.hakaRatio)}</label>
    <label>Transaksi besar ≥ (jt Rp)${inp("rt-big",CFG.bigJt)}</label>
    <label>Min net beli akumulasi (jt Rp)${inp("rt-amin",CFG.accMinJt)}</label>
    <label>Min rasio beli akumulasi (%)${inp("rt-ar",CFG.accRatio)}</label>
    <label>Min net broker/bandar (jt Rp)${inp("rt-bmin",CFG.brkMinJt)}</label>
    <label>Min lot per transaksi (0 = nonaktif)${inp("rt-minlot",CFG.minLot)}</label>
    <label>Lot besar ≥ (selain batas Rp; 0 = nonaktif)${inp("rt-biglot",CFG.bigLot)}</label>
    <label>Min total lot HAKA (jendela HAKA)${inp("rt-hlot",CFG.hakaLot)}</label>
    <label>Min net lot beli akumulasi${inp("rt-alot",CFG.accLot)}</label>
    <label>Min net lot broker/bandar &amp; asing${inp("rt-blot",CFG.brkLot)}</label>
    <label>Harga min (Rp; 0 = nonaktif)${inp("rt-pxmin",CFG.pxMin)}</label>
    <label>Harga maks (Rp; 0 = nonaktif)${inp("rt-pxmax",CFG.pxMax)}</label>
    <label>Filter ticker (awali - untuk kecualikan)${inp("rt-tkf",CFG.tkFilter,"type=\"text\" placeholder=\"BBCA, BBRI, -GOTO\"")}</label>
    ${ck("rt-tick",CFG.tick)}Tebak sisi dengan tick-rule bila kosong</label>
    ${ck("rt-tg",CFG.tg)}Kirim alert ke Telegram</label>
    ${ck("rt-bn",CFG.bn)}Notifikasi browser saat tab tidak aktif</label>
    ${ck("rt-snd",CFG.snd)}Bunyi saat alert</label>
    <label>Min jumlah transaksi (filter tidak likuid)${inp("rt-mt",CFG.minTrades)}</label>
    ${ck("rt-own",CFG.onlyOwn)}Hanya Watchlist/Posisi ⭐</label>
    ${ck("rt-bull",CFG.onlyBull)}Hanya trend Bullish di Screener 📈</label>
    <label class="ex-wide">Endpoint REST${inp("rt-url",CFG.url,"type=\"text\"")}</label>
  </div>
  <button class="ex-btn ${RT.on?"":"pri"}" data-act="rtToggle">${RT.on?"⏸ Berhenti":"▶ Mulai"}</button>
  <button class="ex-btn" data-act="rtReset">🗑 Kosongkan data</button>
  <button class="ex-btn" data-act="rtTest">🔔 Tes alert</button>
  <button class="ex-btn" data-act="rtResetFilter">↺ Reset filter lot/harga/ticker</button></div>
  <div id="rtDyn"></div>`;
}
function tbl(head,rows,empty){
  return rows.length?`<div class="ex-wrap"><table class="ex-tbl"><thead><tr>${head.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`
    :`<div class="ex-mut">${empty}</div>`;
}
function dyn(){
  const el=document.getElementById("rtDyn"); if(!el) return;
  const dOld=el.querySelector("details"); if(dOld) RT.diagOpen=dOld.open;
  const s=RT.st, H=hakaList(), A=accList(), B=brokerList(), F=foreignList();
  const tot=RT.trades.reduce((t,x)=>{ const v=x.px*x.lot*100; return x.side==="B"?[t[0]+v,t[1]]:[t[0],t[1]+v]; },[0,0]);
  const fOn=filtersOn(); let fc=0; if(fOn){ for(let i=0;i<RT.trades.length;i++) if(useTr(RT.trades[i])) fc++; }
  const chg=a=>`<span class="${a.chg>=0?"ex-up":"ex-dn"}">${pctS(a.chg)}</span>`;
  const nl=n=>`<span class="${n>=0?"ex-up":"ex-dn"}">${fl(n)}</span>`;
  const hRows=H.map(a=>`<tr><td><b>${E(a.tk)}</b>${badges(a.tk)}</td><td>${fpx(a.last)} ${chg(a)}</td><td class="ex-up">${fv(a.bv)}</td><td class="ex-dn">${fv(a.sv)}</td><td>${fl(a.bl)} / ${fl(a.sl)}</td>
    <td>${Math.round(a.ratio*100)}%</td><td>${a.big}</td><td>${fpx(a.maxL)}</td><td class="ex-up">${fv(a.b60)}</td><td><div class="ex-bar" style="width:${Math.round(a.ratio*100)}%"></div></td></tr>`);
  const aRows=A.map(a=>`<tr><td><b>${E(a.tk)}</b>${badges(a.tk)}</td><td>${fpx(a.last)} ${chg(a)}</td><td class="ex-up">${fv(a.net)}</td><td>${nl(a.bl-a.sl)}</td><td>${Math.round(a.ratio*100)}%</td><td>${a.big}</td><td>${fpx(a.maxL)}</td>
    <td>${(a.rng*100).toFixed(1)}%</td><td>${a.topBrk?E(a.topBrk)+" ("+Math.round(a.topShare*100)+"%)":"-"}</td><td><b>${a.score}</b><div class="ex-bar" style="width:${a.score}%"></div></td></tr>`);
  const bRows=B.map(a=>`<tr><td><b>${E(a.tk)}</b>${badges(a.tk)}</td><td><b>${E(a.br)}</b>${a.f?" 🌍":""}${whale(a)?" 🐋":""}</td><td class="ex-up">${fv(a.net)}</td><td>${nl(a.netL)}</td>
    <td>${fv(a.buy)}</td><td>${fv(a.sell)}</td><td>${Math.round(a.share*100)}%</td><td><div class="ex-bar" style="width:${Math.round(a.share*100)}%"></div></td></tr>`);
  const fRows=F.map(a=>`<tr><td><b>${E(a.tk)}</b>${badges(a.tk)}</td><td class="${a.net>=0?"ex-up":"ex-dn"}">${fv(a.net)}</td><td>${nl(a.netL)}</td><td class="ex-up">${fv(a.fb)}</td><td class="ex-dn">${fv(a.fs)}</td><td>${Math.round(a.share*100)}%</td></tr>`);
  const fEmpty=s.trades&&!s.brk?"Sumber data ini tidak membawa kode broker, jadi aliran asing tidak bisa dihitung.":"Belum ada saham dengan net asing di atas batas.";
  const bEmpty=s.trades&&!s.brk?"Sumber data ini tidak membawa kode broker pembeli/penjual, jadi bandar tidak bisa dilacak dari running trade. Cek Diagnostik, atau pakai menu Bandarmologi untuk data broker harian."
    :"Belum ada broker yang memenuhi syarat (net beli ≥ batas dan porsi beli ≥ 25% dari total beli saham itu).";
  const bigL=CFG.bigLot, rowT=x=>`<tr><td>${new Date(x.ts).toLocaleTimeString("id-ID")}</td><td><b>${E(x.tk)}</b></td><td>${fpx(x.px)}</td><td>${bigL>0&&x.lot>=bigL?`<b>${fpx(x.lot)}</b>`:fpx(x.lot)}</td>
    <td class="${x.side==="B"?"ex-up":"ex-dn"}">${x.side==="B"?"HAKA":"HAKI"}${x.est?" ~":""}</td><td>${fv(x.px*x.lot*100)}</td></tr>`;
  const tapeL=[]; for(let i=RT.trades.length-1;i>=0;i--){ const x=RT.trades[i]; if(!useTr(x)) continue; if(tapeL.length<25||x.ts>tapeL[tapeL.length-1].ts){ tapeL.push(x); tapeL.sort((a,b)=>b.ts-a.ts); if(tapeL.length>25) tapeL.pop(); } }   // 25 terbaru menurut waktu transaksi
  const tape=tapeL.map(rowT);
  const from=Date.now()-CFG.accWin*60000, bigT=[]; for(let i=RT.trades.length-1;i>=0;i--){ const x=RT.trades[i]; if(x.ts>=from&&useTr(x)) bigT.push(x); }
  const lotRows=bigT.sort((a,b)=>b.lot-a.lot).slice(0,15).map(rowT);
  const idle=RT.on&&s.trades&&s.open!==false&&Date.now()-(s.lastIn||s.startAt)>90000&&Date.now()-s.startAt>90000;
  const warn2=idle?`<div class="ex-warn" style="margin-top:8px">Tidak ada transaksi BARU selama ${Math.round((Date.now()-(s.lastIn||s.startAt))/1000)} detik padahal sedang merekam. Cek: (1) "Sertakan feed seluruh pasar" aktif, (2) token Stockbit dan Proxy URL masih valid (lihat pesan REST di atas), (3) sumber WebSocket hanya berguna kalau frame \"terbaca\" &gt; 0.</div>`:"";
  const warn=RT.on&&Date.now()-s.startAt>45000&&!s.trades
    ?`<div class="ex-warn" style="margin-top:8px">Belum ada transaksi terbaca setelah 45 detik. Lihat bagian Diagnostik di bawah.</div>`:"";
  el.innerHTML=`<div class="ex-card"><div class="ex-mut">
    ${RT.on?"🟢 Merekam":"⚪ Berhenti"}${s.open===false?` · 🔒 Pasar tutup (data terakhir ${E(s.dataDate||"-")})`:""} · WS: ${s.frames} frame (${s.parsed} terbaca, ${s.unparsed} tidak terbaca) · REST: ${s.rest} baris${CFG.rest?` (${s.watch?s.watch+" ticker bergiliran":"seluruh pasar"})`:""}${s.restAt?" · terakhir "+new Date(s.restAt).toLocaleTimeString("id-ID"):""}
    · ${s.trades} transaksi di memori${s.restored?` (${s.restored} dipulihkan)`:""}${s.est?` (${s.est} sisi ditebak ~)`:""} · Total HAKA <span class="ex-up">${fv(tot[0])}</span> / HAKI <span class="ex-dn">${fv(tot[1])}</span>${s.lastIn?` · transaksi baru terakhir ${Math.max(0,Math.round((Date.now()-s.lastIn)/1000))} dtk lalu (waktu bursa ${new Date(s.newest).toLocaleTimeString("id-ID")})`:""}${fOn?` · 🔎 filter aktif: ${fc} dari ${RT.trades.length} transaksi lolos`:""}</div>
    ${s.symBad>s.symOk?`<div class="ex-warn" style="margin-top:6px">Filter symbols[] tampaknya diabaikan Stockbit (respons berisi saham lain), jadi pemantauan per ticker tidak efektif. Kosongkan Ticker otomatis/manual untuk memakai seluruh pasar, atau kirim contoh respons ke chat.</div>`:""}${s.restErr?`<div class="ex-warn" style="margin-top:6px">REST: ${E(s.restErr)}</div>`:""}${warn}${warn2}</div>
  <div class="ex-card"><h3>🔥 Sedang di-HAKA (${CFG.hakaWin} menit terakhir)</h3>${tbl(["Ticker","Harga","HAKA","HAKI","Lot HAKA / HAKI","Rasio HAKA","HAKA besar","Lot terbesar","HAKA 60 dtk","Rasio"],hRows,"Belum ada saham yang memenuhi syarat HAKA.")}</div>
  <div class="ex-card"><h3>🧲 Terakumulasi (${CFG.accWin} menit terakhir)</h3>${tbl(["Ticker","Harga","Net beli","Net lot","Rasio beli","Beli besar","Lot terbesar","Rentang harga","Broker pembeli dominan","Skor"],aRows,"Belum ada saham yang memenuhi syarat akumulasi.")}</div>
  <div class="ex-card"><h3>🐋 Bandar akumulasi — broker net beli (${CFG.accWin} menit terakhir)</h3>${tbl(["Ticker","Broker","Net beli","Net lot","Beli","Jual","Porsi beli","Porsi"],bRows,bEmpty)}<div class="ex-mut" style="margin-top:6px">🐋 = broker menguasai ≥ 40% pembelian saham itu dan net belinya ≥ 2× batas. 🌍 = broker asing. Order beli yang dipecah menjadi banyak transaksi dihitung sebagai satu "beli besar".</div></div>
  <div class="ex-card"><h3>🌍 Aliran asing — net beli/jual broker asing (${CFG.accWin} menit terakhir)</h3>${tbl(["Ticker","Net asing","Net lot asing","Beli asing","Jual asing","Porsi asing"],fRows,fEmpty)}<div class="ex-mut" style="margin-top:6px">Net = beli asing − jual asing (hijau = net beli, merah = net jual). Porsi = rata-rata porsi sisi beli dan jual yang dipegang broker asing. Batas memakai Min net broker/bandar.</div></div>
  <div class="ex-card"><h3>🧱 Transaksi lot terbesar (${CFG.accWin} menit terakhir)</h3>${tbl(["Waktu","Ticker","Harga","Lot","Sisi","Nilai"],lotRows,"Belum ada transaksi yang lolos filter.")}<div class="ex-mut" style="margin-top:6px">15 transaksi tunggal dengan lot terbesar, setelah filter lot/harga/ticker. Lot tebal = melewati batas "Lot besar".</div></div>
  ${sigHtml()}
  <div class="ex-card"><h3>Transaksi terbaru${fOn?" (lolos filter)":""}</h3>${tbl(["Waktu","Ticker","Harga","Lot","Sisi","Nilai"],tape,fOn?"Belum ada transaksi yang lolos filter.":"Belum ada transaksi.")}</div>
  <div class="ex-card"><details${RT.diagOpen?" open":""}><summary class="ex-mut" style="cursor:pointer">Diagnostik format data</summary>
    <div class="ex-mut" style="margin:8px 0;line-height:1.55">Contoh frame yang tidak terbaca (maks 5 terakhir). Kalau transaksi tetap 0 padahal frame terus masuk, format WebSocket belum cocok dengan parser; salin contoh ini ke chat supaya parser disesuaikan, atau pakai sumber REST.</div>
    <button class="ex-btn" data-act="rtCopyDiag">📋 Salin diagnostik</button>
    <pre class="mono" style="white-space:pre-wrap;word-break:break-all;font-size:11px">Frame pertama diterima:\n${RT.first.length?RT.first.map(E).join("\n\n"):"(belum ada)"}\n\nTidak terbaca:\n${RT.samples.length?RT.samples.map(E).join("\n\n"):"(belum ada)"}</pre></details></div>`;
}

/* ---------- riwayat sinyal & hit-rate ---------- */
const TY={H:"🔥 HAKA",A:"🧲 Akumulasi",B:"🐋 Bandar"};
const sigs=()=>{ const l=LS("rt_sig",[]); return Array.isArray(l)?l:[]; };
function rec(ty,tk,px,info){
  const L=sigs(); L.push({ty,tk,ts:Date.now(),px:px||RT.last[tk]||0,info,p15:null,p30:null});
  if(L.length>400) L.splice(0,L.length-400); SV("rt_sig",L);
}
function evalSigs(){            // harga +15/+30 menit diambil dari transaksi terakhir yang masuk (maks 3 menit lalu)
  const L=sigs(), now=Date.now(); let ch=false;
  L.forEach(g=>[[15,"p15"],[30,"p30"]].forEach(([m,k])=>{
    if(g[k]!==null) return; const age=now-g.ts; if(age<m*60000) return;
    if(RT.lastTs[g.tk]&&now-RT.lastTs[g.tk]<180000){ g[k]=RT.last[g.tk]; ch=true; }
    else if(age>(m+4)*60000){ g[k]=false; ch=true; }
  }));
  if(ch) SV("rt_sig",L);
}
const ret=g=>(typeof g.p30==="number"&&g.px)?(g.p30-g.px)/g.px*100:null;
function sigHtml(){
  const L=sigs(), st={};
  L.forEach(g=>{ const t=st[g.ty]||(st[g.ty]={n:0,e:0,w:0,r:0}); t.n++; const r=ret(g); if(r!==null){ t.e++; t.r+=r; if(r>0) t.w++; } });
  const sum=Object.keys(TY).filter(k=>st[k]).map(k=>{ const t=st[k];
    return `<span class="ex-chip">${TY[k]}: ${t.n} sinyal · ${t.e?`hit-rate ${Math.round(t.w/t.e*100)}% · rata-rata ${pctS(t.r/t.e)} (30 mnt, ${t.e} terukur)`:"belum terukur"}</span>`; }).join(" ");
  const cell=(g,k)=>{ const v=g[k]; if(v===null) return "<span class='ex-mut'>menunggu</span>"; if(v===false) return "<span class='ex-mut'>tak terukur</span>";
    const r=(v-g.px)/g.px*100; return `<span class="${r>=0?"ex-up":"ex-dn"}">${pctS(r)}</span>`; };
  const rows=L.slice(-40).reverse().map(g=>`<tr><td>${new Date(g.ts).toLocaleString("id-ID",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</td><td>${TY[g.ty]||g.ty}</td><td><b>${E(g.tk)}</b>${badges(g.tk)}</td><td>${fpx(g.px)}</td><td>${cell(g,"p15")}</td><td>${cell(g,"p30")}</td><td class="ex-mut">${E(g.info||"")}</td></tr>`);
  return `<div class="ex-card"><h3>📜 Riwayat sinyal &amp; hit-rate</h3>
    <div class="ex-chips">${sum||'<span class="ex-mut">Belum ada sinyal tercatat.</span>'}</div>
    ${tbl(["Waktu","Jenis","Ticker","Harga sinyal","+15 mnt","+30 mnt","Info"],rows,"Sinyal akan tercatat otomatis saat alert muncul.")}
    <div class="ex-mut" style="margin:6px 0">Hasil diukur dari transaksi terakhir yang masuk saat 15/30 menit berlalu. Kalau tab ditutup atau saham itu sepi, hasilnya ditandai "tak terukur". Hit-rate = persentase sinyal dengan harga +30 menit lebih tinggi dari harga sinyal.</div>
    <button class="ex-btn" data-act="rtCopySig">📋 Salin CSV</button><button class="ex-btn" data-act="rtClearSig">🗑 Hapus riwayat</button></div>`;
}

/* ---------- notifikasi browser + bunyi ---------- */
let AC=null;
function audio(){ try{ if(!AC){ const C=window.AudioContext||window.webkitAudioContext; if(C) AC=new C(); } if(AC&&AC.state==="suspended") AC.resume(); }catch(e){} }
function beep(){
  audio(); if(!AC) return;
  try{ [0,.18].forEach(d=>{ const t=AC.currentTime+d, o=AC.createOscillator(), g=AC.createGain(); o.type="sine"; o.frequency.value=d?1175:880;
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.25,t+.02); g.gain.exponentialRampToValueAtTime(.0001,t+.15);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t+.16); }); }catch(e){}
}
function askPerm(){ try{ if(typeof Notification!=="undefined"&&Notification.permission==="default") Notification.requestPermission().then(p=>{ if(p!=="granted") X.toast("Izin notifikasi browser ditolak","down"); }); }catch(e){} }
function fire(msg){
  X.notify(msg,CFG.tg);
  if(CFG.snd) beep();
  try{ if(CFG.bn&&typeof Notification!=="undefined"&&Notification.permission==="granted"&&document.hidden) new Notification("⚡ Running Trade",{body:msg.replace(/^[^\s]+\s/,"")}); }catch(e){}
}

/* ---------- alert ---------- */
function alerts(){
  if(!RT.on) return;
  const now=Date.now(), cool=5*60000;
  hakaList().forEach(a=>{
    if(now-(RT.flag["H"+a.tk]||0)<cool) return; RT.flag["H"+a.tk]=now;
    rec("H",a.tk,a.last,`${fv(a.bv)} / ${fl(a.bl)} lot, rasio ${Math.round(a.ratio*100)}%`);
    fire(`🔥 ${a.tk} di-HAKA ${fv(a.bv)} (${fl(a.bl)} lot) dalam ${CFG.hakaWin} menit (rasio ${Math.round(a.ratio*100)}%, harga ${fpx(a.last)})`);
  });
  brokerList().filter(whale).forEach(a=>{
    if(now-(RT.flag["B"+a.tk+a.br]||0)<cool*3) return; RT.flag["B"+a.tk+a.br]=now;
    rec("B",a.tk,RT.last[a.tk],`${a.br} net ${fv(a.net)} (${Math.round(a.share*100)}%)`);
    fire(`🐋 ${a.tk}: broker ${a.br} net beli ${fv(a.net)} (${Math.round(a.share*100)}% dari pembelian) dalam ${CFG.accWin} menit`);
  });
  accList().filter(a=>a.score>=70).forEach(a=>{
    if(now-(RT.flag["A"+a.tk]||0)<cool*3) return; RT.flag["A"+a.tk]=now;
    rec("A",a.tk,a.last,`net ${fv(a.net)} (${fl(a.bl-a.sl)} lot), skor ${a.score}${a.topBrk?", "+a.topBrk:""}`);
    fire(`🧲 ${a.tk} terakumulasi: net beli ${fv(a.net)} (${fl(a.bl-a.sl)} lot) dalam ${CFG.accWin} menit (skor ${a.score}${a.topBrk?", broker "+a.topBrk:""})`);
  });
}

/* ---------- kontrol ---------- */
function readCfg(){
  const g=id=>document.getElementById(id); if(!g("rt-url")) return;
  const n=(id,d)=>{ const v=parseFloat(g(id).value); return isNaN(v)?d:v; };
  Object.assign(CFG,{ws:g("rt-ws").checked,rest:g("rt-rest").checked,tick:g("rt-tick").checked,tg:g("rt-tg").checked,bn:g("rt-bn").checked,snd:g("rt-snd").checked,
    pollSec:n("rt-poll",3),auto:g("rt-auto").checked,adapt:g("rt-adapt").checked,perPoll:n("rt-pp",5),refAdvM:n("rt-ref",20),tickers:g("rt-tickers").value.trim(),hakaWin:n("rt-hw",5),accWin:n("rt-aw",15),hakaMinJt:n("rt-hmin",300),
    hakaRatio:n("rt-hr",65),bigJt:n("rt-big",50),accMinJt:n("rt-amin",200),accRatio:n("rt-ar",55),brkMinJt:n("rt-bmin",100),minTrades:n("rt-mt",10),mkt:g("rt-mkt").checked,minLot:Math.max(0,n("rt-minlot",0)),bigLot:Math.max(0,n("rt-biglot",0)),hakaLot:Math.max(0,n("rt-hlot",0)),accLot:Math.max(0,n("rt-alot",0)),brkLot:Math.max(0,n("rt-blot",0)),pxMin:Math.max(0,n("rt-pxmin",0)),pxMax:Math.max(0,n("rt-pxmax",0)),tkFilter:g("rt-tkf").value.trim(),onlyOwn:g("rt-own").checked,onlyBull:g("rt-bull").checked,url:g("rt-url").value.trim()||DEF_URL});
  if(CFG.bn) askPerm(); if(CFG.snd) audio();      // dipanggil dari klik/ubah pengaturan = gestur pengguna, syarat izin & audio
  SV("rt_cfg",CFG); applyPoll(); dyn();
}
X.onChange(e=>{ if(e.target.id&&e.target.id.startsWith("rt-")) readCfg(); });
X.act("rtToggle",()=>{
  readCfg(); RT.on=!RT.on;
  if(RT.on){ RT.st.startAt=Date.now(); RT.st.restErr=null; }
  applyPoll(); X.repaint();
});
X.act("rtResetFilter",()=>{ Object.assign(CFG,{minLot:0,bigLot:0,hakaLot:0,accLot:0,brkLot:0,pxMin:0,pxMax:0,tkFilter:""}); SV("rt_cfg",CFG); X.repaint(); });
X.act("rtTest",()=>{ askPerm(); audio(); fire("🔔 Tes alert Running Trade — notifikasi dan bunyi berfungsi"); });
X.act("rtReset",()=>{
  RT.trades=[]; RT.seen.clear(); RT.raw.clear(); RT.last={}; RT.lastSide={}; RT.flag={}; RT.samples=[];
  SV("rt_trd",{at:Date.now(),rows:[]}); RT.dirty=RT.saved=0;
  Object.assign(RT.st,{restored:0,frames:0,parsed:0,unparsed:0,trades:0,est:0,brk:0,rest:0,restErr:null,lastIn:0,newest:0,startAt:Date.now()}); dyn();
});
const copy=(t,msg)=>{ try{ navigator.clipboard.writeText(t).then(()=>X.toast(msg,"up")); }catch(e){ X.toast("Gagal menyalin","down"); } };
X.act("rtClearSig",()=>{ SV("rt_sig",[]); dyn(); });
X.act("rtCopySig",()=>copy(["waktu,jenis,ticker,harga,p15,p30,info"].concat(sigs().map(g=>[new Date(g.ts).toISOString(),g.ty,g.tk,g.px,g.p15,g.p30,'"'+(g.info||"")+'"'].join(","))).join("\n"),"Riwayat sinyal disalin"));
X.act("rtCopyDiag",()=>copy(JSON.stringify({stats:RT.st,cfg:{ws:CFG.ws,rest:CFG.rest,url:CFG.url},first:RT.first,unparsed:RT.samples},null,1),"Diagnostik disalin — tempel ke chat"));
loadTrades();
window.addEventListener("pagehide",saveTrades);
setInterval(saveTrades,15000);
X.addTab("rt","⚡ Running Trade",view,dyn);
setInterval(()=>{
  try{
    alerts(); evalSigs();
    const pg=document.getElementById("exPage");
    if(pg&&pg.classList.contains("on")&&X.current()==="rt") dyn();
  }catch(e){ console.warn("running-trade:",e); }
},1500);
})();
