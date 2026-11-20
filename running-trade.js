// running-trade.js — Running Trade Stockbit: deteksi saham yang sedang di-HAKA dan diakumulasi.
// Dimuat SETELAH extras.js (butuh window.ExtrasAPI). Tidak mengubah app.js.
// Muncul sebagai tab "⚡ Running Trade" di Trader Tools.
// v2: highlight lot besar (3 level), semua tabel bisa di-sort (klik judul kolom), tabel Semua Saham, panel Detail saham (price ladder,
//     aliran per menit, broker, audit sumber WS/REST), alert lot besar, feed seluruh pasar tiap tarikan, polling paralel tanpa jeda,
//     dedup lintas sumber WS+REST, penolakan frame kuotasi, indikator keterlambatan & cakupan jendela.
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
//  Akumulasi  : net beli >= batas, rasio beli >= batas, >= 3 beli besar, harga tidak jatuh.
(function(){
"use strict";
const X=window.ExtrasAPI;
if(!X){ console.warn("[running-trade] ExtrasAPI tidak ditemukan — muat extras.js lebih dulu."); return; }
const {E,LS,SV}=X;
const DEF_URL="https://exodus.stockbit.com/order-trade/running-trade?sort=DESC&limit=80&order_by=RUNNING_TRADE_ORDER_BY_TIME";
const CFG=Object.assign({ws:true,rest:false,url:DEF_URL,pollSec:3,tickers:"",hakaWin:5,accWin:15,
  hakaMinJt:300,hakaRatio:65,bigJt:50,accMinJt:200,accRatio:55,brkMinJt:100,minTrades:10,onlyOwn:false,onlyBull:false,tg:false,tick:true,auto:true,perPoll:5,adapt:true,refAdvM:20,bn:false,snd:false,feed:true,minLot:0,bigLot:0,hakaMinLot:0,accMinLot:0,brkMinLot:0,pxMin:0,pxMax:0,rejQuote:true,bigAlert:true,momAlert:true,confMin:3,confAlert:true,hoverPause:true,cost:0.4,digest:false,digestMin:30,digestN:5,digestClose:true,bday:true,cloud:false,cloudMin:10},LS("rt_cfg",{}));
// URL lama tersimpan di localStorage memakai order_by salah (RUN_TRADE_...): perbaiki otomatis. trade_number dibuang karena itu kursor tetap (data basi).
CFG.url=String(CFG.url||DEF_URL).replace("RUN_TRADE_ORDER_BY_TIME","RUNNING_TRADE_ORDER_BY_TIME").replace(/([?&])trade_number=\d*&?/,"$1").replace(/[?&]$/,"");
const RT={on:false,lastTs:{},first:[],diagOpen:false,trades:[],seen:new Set(),fp:new Map(),bigQ:[],sort:LS("rt_sort",{}),q:"",sel:"",bigOnly:false,gen:0,mm:{},cloud:{},streak:new Map(),streakAt:0,streakBusy:false,hq:LS("rt_hq",{}),bday:new Map(),bdBusy:false,bdErr:null,bdWant:[],sec:"",secMap:new Map(),tblData:{},gb:LS("rt_gb","ty"),frozen:false,hide:LS("rt_cols",{}),colReg:{},cal:LS("rt_cal",{}),restRaw:[],restKeys:[],dvOnly:false,momOnly:false,scOnly:false,cum:new Map(),cumDay:"",mode:LS("rt_mode","win"),raw:new Map(),last:{},lastSide:{},flag:{},samples:[],busy:false,poll:null,rot:0,dirty:0,saved:0,
  st:{quote:0,dup:0,nw:0,nr:0,restored:0,symOk:0,symBad:0,watch:0,frames:0,parsed:0,unparsed:0,trades:0,est:0,brk:0,rest:0,restErr:null,restAt:0,startAt:0}};

/* ---------- util ---------- */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=(o,ks)=>{ for(const k of ks){ if(o[k]!=null&&o[k]!=="") return o[k]; } return null; };
const toNum=v=>v==null?NaN:+String(v).replace(/,/g,"");
const fv=n=>{ const a=Math.abs(n),s=n<0?"-":""; return s+(a>=1e9?(a/1e9).toFixed(2)+" M":a>=1e6?(a/1e6).toFixed(0)+" jt":Math.round(a/1e3)+" rb"); };
const fpx=n=>new Intl.NumberFormat("id-ID").format(n);
const pctS=n=>(n>=0?"+":"")+n.toFixed(2)+"%";
const hms=v=>{ if(v==null||v==="") return null; let d=null;
  if(typeof v==="number"||/^\d{9,}$/.test(String(v))){ const n=+v; d=new Date(n>1e12?n:n*1000); }
  else { const s=String(v), m=s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/); if(m) return m[1].padStart(2,"0")+":"+m[2]+":"+(m[3]||"00"); d=new Date(s); }
  if(!d||isNaN(d)) return null;
  try{ return d.toLocaleTimeString("en-GB",{timeZone:"Asia/Jakarta",hour12:false}); }catch(e){ return null; } };
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
// kode broker bisa bernama macam-macam atau berupa objek ({code,type}); cari nama umum dulu, lalu pola buyer*/seller*/broker_buy*/broker_sell*
const BK={B:["buyer","buyer_code","buyer_broker","buyer_broker_code","buy_broker","buy_broker_code","broker_buy","broker_buyer","buy_code","buyer_id","bc","b","bb"],
          S:["seller","seller_code","seller_broker","seller_broker_code","sell_broker","sell_broker_code","broker_sell","broker_seller","sell_code","seller_id","sc","sb"]};
function brkOf(o,k){
  let v=pick(o,BK[k]);
  if(v==null){ const re=k==="B"?/^(buyer|buy_?(broker|code)|broker_?buy)/i:/^(seller|sell_?(broker|code)|broker_?sell)/i;
    for(const key in o){ if(re.test(key)&&!/type|order|foreign|name|qty|lot|price|vol|value|count/i.test(key)){ const x=o[key]; if(x!=null&&x!==""){ v=x; break; } } } }
  if(v&&typeof v==="object") v=v.code||v.broker_code||v.broker||v.id||null;
  return brkCode(v);
}
function forOf(o,k){            // broker asing? (buyer_type=FOREIGN, flag boolean, atau akhiran [F])
  const P=k==="B"?"buyer":"seller", raw=pick(o,k==="B"?["buyer","buyer_code","buyer_broker"]:["seller","seller_code","seller_broker"]);
  const ty=o[P+"_type"]!=null?o[P+"_type"]:(raw&&typeof raw==="object"?raw.type:null);
  if(ty!=null&&/^(f$|foreign|asing)/i.test(String(ty))) return true;
  const fl=o[P+"_foreign"]!=null?o[P+"_foreign"]:o["is_foreign_"+P]!=null?o["is_foreign_"+P]:o[P+"_is_foreign"]; if(fl===true||fl==="true"||fl===1||fl==="1") return true;
  return typeof raw==="string"&&/\[F\]/i.test(raw);
}

/* ---------- akumulasi buy/sell harian per emiten (sejak Mulai; reset otomatis saat hari bursa berganti) ---------- */
const dayOf=ts=>new Date(ts+7*3600000).toISOString().slice(0,10);
function cumAdd(t){
  const d=dayOf(t.ts); if(d!==RT.cumDay){ if(!RT.cumDay||d>RT.cumDay){ RT.cum.clear(); RT.cumDay=d; } else return; }
  let a=RT.cum.get(t.tk); if(!a){ a={tk:t.tk,bv:0,sv:0,bl:0,sl:0,nb:0,ns:0,p0:t.px,t0:t.ts,t1:t.ts,bb:new Map(),bs:new Map()}; RT.cum.set(t.tk,a); }
  if(t.ts>(a.t1||0)) a.t1=t.ts; if(!a.t0||t.ts<a.t0) a.t0=t.ts;
  const v=t.px*t.lot*100; if(t.buyer) a.bb.set(t.buyer,(a.bb.get(t.buyer)||0)+v); if(t.seller) a.bs.set(t.seller,(a.bs.get(t.seller)||0)+v); if(t.side==="B"){ a.bv+=v; a.bl+=t.lot; a.nb++; } else { a.sv+=v; a.sl+=t.lot; a.ns++; }
}
/* ---------- level lot besar & penolakan frame kuotasi ---------- */
const hasMark=o=>pick(o,["id","trade_id","trade_number","tn","time","t","action","side","buy_sell","bs","trade_type","buyer","buyer_code","bc","seller","seller_code","sc"])!=null;
// 0 = biasa, 1 = BESAR (>= batas), 2 = JUMBO (>= 3x), 3 = MEGA (>= 10x). Batas = Rp (disesuaikan likuiditas) ATAU lot besar, mana yang lebih besar rasionya.
function lotTier(x){
  const v=x.px*x.lot*100, big=thr(x.tk,CFG.bigJt), bl=CFG.bigLot>0?CFG.bigLot:0;
  const r=Math.max(big>0?v/big:0,bl?x.lot/bl:0);
  return r>=10?3:r>=3?2:r>=1?1:0;
}
const pxOk=tk=>{ const p=RT.last[tk]; if(!(p>0)) return true; return !(CFG.pxMin>0&&p<CFG.pxMin)&&!(CFG.pxMax>0&&p>CFG.pxMax); };
function ingest(o,src,ts0){
  const tk=String(pick(o,TK)||"").toUpperCase().trim();
  if(!/^[A-Z]{2,6}$/.test(tk)) return false;
  const px=toNum(pick(o,PX)), lot=toNum(pick(o,LT));
  if(!(px>0)||!(lot>0)) return false;
  // frame kuotasi/ringkasan (kode+harga+volume kumulatif tanpa id/waktu/sisi/broker) bukan transaksi: kalau dihitung, nilainya membengkak
  if(src==="ws"&&CFG.rejQuote&&!hasMark(o)){ RT.st.quote++; return false; }
  const id=pick(o,["id","trade_id","trade_number","tn"]);
  const buyer=brkOf(o,"B"), seller=brkOf(o,"S");
  const ts=ts0>0?ts0:Date.now();
  const oid=pick(o,["group_order_number","buy_order_number"]), bF=forOf(o,"B"), sF=forOf(o,"S");
  const key=id!=null?tk+"#"+id:(src==="rest"?[tk,pick(o,["time","t"]),px,lot,buyer,seller].join("|"):null);
  if(key){ if(RT.seen.has(key)) return true; RT.seen.add(key); if(RT.seen.size>40000) RT.seen.clear(); }
  // dedup lintas sumber: transaksi yang sama bisa datang dari WS dan REST dengan id berbeda. Sidik jari = ticker|jam|harga|lot|broker.
  // Kemunculan ke-n dari satu sumber dianggap duplikat kalau sumber lain sudah punya >= n (transaksi kembar asli tetap terhitung).
  const tm=hms(pick(o,["time","t"])), fp=tm?[tk,tm,px,lot,buyer||"",seller||""].join("|"):null;
  if(fp){
    const me=src==="ws"?"w":"r", ot=me==="w"?"r":"w"; let e=RT.fp.get(fp);
    if(!e){ e={w:0,r:0}; RT.fp.set(fp,e); if(RT.fp.size>40000) RT.fp.clear(); }
    e[me]++; if(e[ot]>=e[me]){ RT.st.dup++; return true; }
  }
  let side=sideOf(o), est=false;
  if(!side&&CFG.tick){
    const p=RT.last[tk];
    side=p==null?null:px>p?"B":px<p?"S":(RT.lastSide[tk]||null); est=!!side;
  }
  RT.last[tk]=px; RT.lastTs[tk]=Math.max(RT.lastTs[tk]||0,ts); if(side) RT.lastSide[tk]=side;
  if(!side) return false;
  const t={tk,px,lot,side,est,k:key||null,buyer,seller,ts,oid:oid!=null?String(oid):null,bF,sF,src:src==="ws"?"w":"r"};
  RT.trades.push(t); cumAdd(t);
  RT.dirty++; RT.st.trades++; if(buyer||seller) RT.st.brk++; if(est) RT.st.est++; if(t.src==="w") RT.st.nw++; else RT.st.nr++;
  if(RT.trades.length>60000) RT.trades.splice(0,10000);
  if(CFG.bigAlert&&Date.now()-ts<90000&&lotTier(t)>=2){ RT.bigQ.push(t); if(RT.bigQ.length>50) RT.bigQ.shift(); }
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
const packT=x=>[x.tk,x.px,x.lot,x.side==="B"?1:0,x.est?1:0,x.ts,x.buyer||"",x.seller||"",x.oid||"",(x.bF?1:0)+(x.sF?2:0),x.k||"",x.src==="w"?1:0];
const unpackT=a=>({tk:a[0],px:a[1],lot:a[2],side:a[3]?"B":"S",est:!!a[4],ts:a[5],buyer:a[6]||null,seller:a[7]||null,oid:a[8]||null,bF:!!(a[9]&1),sF:!!(a[9]&2),k:a[10]||null,src:a[11]?"w":"r"});
function saveTrades(){
  if(RT.dirty===RT.saved) return;
  const from=Date.now()-KEEP, rows=[];
  for(let i=RT.trades.length-1;i>=0&&rows.length<8000;i--){ const x=RT.trades[i]; if(x.ts>=from) rows.push(packT(x)); }
  try{ SV("rt_trd",{at:Date.now(),rows:rows.reverse()}); SV("rt_cum",{day:RT.cumDay,rows:Array.from(RT.cum.values()).map(a=>[a.tk,Math.round(a.bv),Math.round(a.sv),a.bl,a.sl,a.nb,a.ns,a.p0,topN(a.bb,8),topN(a.bs,8),a.t0||0,a.t1||0])}); RT.saved=RT.dirty; }catch(e){}
}
function loadTrades(){
  try{
    const cd=LS("rt_cum",null); if(cd&&Array.isArray(cd.rows)){ RT.cumDay=cd.day||""; cd.rows.forEach(r=>{ if(Array.isArray(r)) RT.cum.set(r[0],{tk:r[0],bv:r[1],sv:r[2],bl:r[3],sl:r[4],nb:r[5],ns:r[6],p0:r[7],t0:r[10]||0,t1:r[11]||0,bb:new Map((r[8]||[]).map(x=>[x[0],x[1]])),bs:new Map((r[9]||[]).map(x=>[x[0],x[1]]))}); }); }
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

/* ---------- sumber 2: REST polling (paralel, tanpa jeda mati) ---------- */
async function fetchOne(u){
  const want=(u.match(/symbols\[\]=([A-Za-z0-9]+)/)||[])[1];
  let cursor=null, all=[], dt=null;
  for(let pg=0;pg<(want?3:8);pg++){                    // trade_number = kursor: ambil halaman lebih lama kalau 1 halaman penuh transaksi baru (feed pasar: sampai 8 halaman)
    const r=await stockbitRawRequest(cursor?u+"&trade_number="+cursor:u);
    if(r.error){ RT.st.restErr=r.error; break; }
    RT.st.restErr=null; RT.st.restAt=Date.now();
    dt=(r.raw&&r.raw.data&&r.raw.data.date)||dt; if(r.raw&&r.raw.data&&typeof r.raw.data.is_open_market==="boolean"){ RT.st.open=r.raw.data.is_open_market; RT.st.dataDate=dt; }
    const items=[]; walk(r.raw,0,o=>items.push(o));
    if(!items.length){ if(!pg) sample("[REST tanpa transaksi terbaca] "+JSON.stringify(r.raw)); break; }
    RT.st.rest+=items.length; all=all.concat(items);
    if(!RT.restKeys.length) RT.restKeys=Object.keys(items[0]||{}).slice(0,40);
    if(RT.restRaw.length<3){ try{ RT.restRaw.push(JSON.stringify(items[0]).slice(0,700)); }catch(e){} }
    if(want&&!pg){ const hit=items.filter(o=>String(pick(o,TK)||"").toUpperCase()===want.toUpperCase()).length; if(hit*2>=items.length) RT.st.symOk++; else RT.st.symBad++; }
    const fresh=items.filter(o=>{ const id=pick(o,["id","trade_id","trade_number","tn"]); const tk=String(pick(o,TK)||"").toUpperCase().trim(); return id==null||!RT.seen.has(tk+"#"+id); }).length;
    const tn=items.map(o=>toNum(o.trade_number)).filter(n=>n>0);
    if(fresh<items.length||!tn.length) break;        // sudah menyentuh data yang pernah diproses
    const nx=Math.min(...tn); if(nx===cursor) break; cursor=nx;
  }
  const tsOf=o=>{ const m=String(pick(o,["time","t"])||"").match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/); if(!dt||!m) return 0;
    const v=Date.parse(dt+"T"+m[1].padStart(2,"0")+":"+m[2]+":"+(m[3]||"00")+"+07:00"); return v>0?v:0; };
  return all.reverse().map(o=>({o,ts:tsOf(o)}));      // terlama dulu; ts = waktu bursa (WIB)
}
async function pollOnce(){
  if(RT.busy||!RT.on||!CFG.rest) return; RT.busy=true;
  try{
    if(typeof stockbitRawRequest!=="function"){ RT.st.restErr="stockbitRawRequest tidak ditemukan (app.js belum termuat)."; return; }
    if(typeof state!=="undefined"&&!state.stockbitToken){ RT.st.restErr="Token Stockbit belum ada — isi/sinkronkan di Pengaturan."; return; }
    const list=watchList(), n=Math.max(1,Math.min(10,CFG.perPoll|0||5)); RT.st.watch=list.length;
    let tks=[]; if(list.length){ for(let i=0;i<Math.min(n,list.length);i++) tks.push(list[(RT.rot+i)%list.length]); RT.rot=(RT.rot+n)%list.length; }
    const sep=CFG.url.indexOf("?")>=0?"&":"?";
    const urls=tks.map(t=>CFG.url+sep+"symbols[]="+encodeURIComponent(t));
    if(CFG.feed||!urls.length) urls.unshift(CFG.url);   // feed seluruh pasar tiap tarikan: saham di luar giliran tidak tertinggal
    const res=[]; for(let i=0;i<urls.length;i+=4){ const part=await Promise.all(urls.slice(i,i+4).map(u=>fetchOne(u))); part.forEach(p=>res.push(p)); }
    const flat=[]; res.forEach(r=>r.forEach(it=>flat.push(it)));
    flat.sort((a,b)=>a.ts-b.ts);                        // urut waktu lintas URL supaya tick-rule & dedup konsisten
    flat.forEach(it=>ingest(it.o,"rest",it.ts));
  } finally { RT.busy=false; }
}
function watchList(){            // manual dulu, lalu Watchlist/Posisi, lalu Smart Pick (skor tertinggi dulu); kosong = seluruh pasar
  const man=CFG.tickers.split(/[\s,]+/).map(s=>s.toUpperCase()).filter(s=>/^[A-Z]{2,6}$/.test(s));
  let auto=[]; if(CFG.auto){ try{ auto=[...X.ownTickers()].concat(ctx().spTk); }catch(e){} }
  return [...new Set(man.concat(auto))].slice(0,60);
}
function applyPoll(){            // penjadwalan sendiri: tarikan berikut mulai segera setelah yang lama selesai (interval = jarak minimum, bukan jeda tetap)
  if(RT.poll){ clearTimeout(RT.poll); RT.poll=null; }
  const g=++RT.gen;
  if(RT.on&&CFG.rest){
    const loop=async()=>{
      if(g!==RT.gen||!RT.on||!CFG.rest) return;
      const t0=Date.now();
      try{ await pollOnce(); }catch(e){ RT.st.restErr=String(e&&e.message||e); }
      if(g!==RT.gen) return;
      RT.poll=setTimeout(loop,Math.max(300,Math.max(1,CFG.pollSec)*1000-(Date.now()-t0)));
    };
    loop();
  }
}

/* ---------- agregasi per ticker dalam jendela waktu ---------- */
function agg(winMs){
  const now=Date.now(), from=now-winMs, m=new Map(), t=RT.trades, ml=CFG.minLot||0, bL=CFG.bigLot||0;
  for(let i=t.length-1;i>=0;i--){
    const x=t[i]; if(x.ts<from||(ml&&x.lot<ml)) continue;
    let a=m.get(x.tk);
    if(!a){ a={tk:x.tk,bv:0,sv:0,nb:0,ns:0,big:0,bl:0,sl:0,bigBl:0,bigSl:0,mx:0,mxv:0,mxs:"B",nt:0,t0:x.ts,th:thr(x.tk,CFG.bigJt),hi:x.px,lo:x.px,first:x.px,last:x.px,b60:0,one:[],ord:new Map(),brk:new Map()}; m.set(x.tk,a); }
    const v=x.px*x.lot*100, isBig=v>=a.th||(bL>0&&x.lot>=bL);
    a.first=x.px; if(x.px>a.hi) a.hi=x.px; if(x.px<a.lo) a.lo=x.px; if(x.ts<a.t0) a.t0=x.ts; a.nt++;
    if(x.lot>a.mx){ a.mx=x.lot; a.mxv=v; a.mxs=x.side; }
    if(x.side==="B"){
      a.bv+=v; a.bl+=x.lot; a.nb++; if(isBig) a.bigBl+=x.lot;
      if(x.oid){ const o=a.ord.get(x.oid)||{v:0,l:0}; o.v+=v; o.l+=x.lot; a.ord.set(x.oid,o); } else a.one.push({v,l:x.lot});
      if(x.ts>=now-60000) a.b60+=v;
      if(x.buyer) a.brk.set(x.buyer,(a.brk.get(x.buyer)||0)+v);
    } else { a.sv+=v; a.sl+=x.lot; a.ns++; if(isBig) a.bigSl+=x.lot; }
  }
  m.forEach(a=>{
    const big=a.th, isB=o=>o.v>=big||(bL>0&&o.l>=bL); a.big=0;
    a.one.forEach(o=>{ if(isB(o)) a.big++; }); a.ord.forEach(o=>{ if(isB(o)) a.big++; });   // order beli yang dipecah jadi banyak transaksi dihitung sekali
    const tot=a.bv+a.sv; a.vt=tot; a.ratio=tot?a.bv/tot:0; a.net=a.bv-a.sv; a.netL=a.bl-a.sl; a.bigNet=a.bigBl-a.bigSl;
    a.chg=a.first?(a.last-a.first)/a.first*100:0; a.rng=a.first?(a.hi-a.lo)/a.first:0;
    let top=null,tv=0; a.brk.forEach((v,k)=>{ if(v>tv){ tv=v; top=k; } });
    a.topBrk=top; a.topShare=a.bv?tv/a.bv:0;
    a.age=Math.max(0,Math.round((now-(RT.lastTs[a.tk]||a.t0))/1000));
    a.rate=a.nt/(Math.max(30000,Math.min(winMs,now-a.t0))/60000);
  });
  return m;
}
function okTk(tk,cnt,own){
  if(cnt<CFG.minTrades) return false;
  if(!pxOk(tk)) return false;
  if(CFG.onlyOwn&&!own.has(tk)) return false;
  if(CFG.onlyBull){ const r=X.stk(tk); if(!r||typeof trendTone!=="function"||trendTone(r.trendHarga)!=="up") return false; }
  return true;
}
let CTX={at:0,sp:new Map(),ic:new Map(),adv:new Map(),spTk:[]};
function ctx(){                  // Smart Pick + rata-rata nilai transaksi harian per ticker; enriched() berat, jadi di-cache 60 dtk
  const now=Date.now(); if(now-CTX.at<60000) return CTX; CTX.at=now;
  const sp=new Map(), ic=new Map(), adv=new Map(), score=new Map();
  try{
    if(typeof enriched==="function"){
      const rows=enriched(), defs=(typeof SMART_PICK_DEFS!=="undefined")?SMART_PICK_DEFS:[];
      rows.forEach(r=>{
        const tk=r.ticker; if(!tk) return;
        defs.forEach(d=>{ try{ const x=d.detect(r); if(x&&x.match){ const l=sp.get(tk)||[]; l.push(d.title); sp.set(tk,l); const li=ic.get(tk)||[]; li.push(d.icon||"✨"); ic.set(tk,li); score.set(tk,Math.max(score.get(tk)||0,x.score||0)); } }catch(e){} });
        // rata-rata nilai harian (Rp): riwayat Stockbit kalau ada; kalau tidak, nilai hari ini ÷ rasio volume (satuan lot/lembar saling meniadakan)
        let v=null; try{ if(typeof spStockbitAvgValue==="function") v=spStockbitAvgValue(tk); }catch(e){}
        if(!(v>0)){ const vt=(r.valueTraded!=null?r.valueTraded:r.turnover), vr=r.volRatio; if(vt>0&&vr>0.05) v=vt/vr; }
        if(v>0) adv.set(tk,v);
      });
    }
  }catch(e){ console.warn("running-trade: konteks aplikasi",e); }
  CTX.sp=sp; CTX.ic=ic; CTX.adv=adv; CTX.spTk=[...score.entries()].sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
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
function hakaRaw(){
  const m=agg(CFG.hakaWin*60000), out=[], own=X.ownTickers();
  m.forEach(a=>{ if(a.bv>=thr(a.tk,CFG.hakaMinJt)&&a.ratio*100>=CFG.hakaRatio&&a.big>=2&&(!CFG.hakaMinLot||a.bl>=CFG.hakaMinLot)&&okTk(a.tk,a.nb+a.ns,own)) out.push(a); });
  return out.sort((a,b)=>b.bv-a.bv);
}
function accRaw(){
  const m=agg(CFG.accWin*60000), out=[], own=X.ownTickers();
  m.forEach(a=>{
    if(!(a.net>=thr(a.tk,CFG.accMinJt)&&a.ratio*100>=CFG.accRatio&&a.big>=3&&a.chg>-1.5&&(!CFG.accMinLot||a.netL>=CFG.accMinLot)&&okTk(a.tk,a.nb+a.ns,own))) return;
    a.score=Math.round(
      clamp((a.ratio-.5)/.3,0,1)*35 + clamp(a.net/(thr(a.tk,CFG.accMinJt)*4),0,1)*25 + clamp(a.big/10,0,1)*15 +
      (a.chg>=0?10:a.chg>-.5?5:0) + (a.rng<=.015?5:0) + (a.topShare>=.4?10:a.topShare>=.25?6:0));
    out.push(a);
  });
  return out.sort((a,b)=>b.score-a.score);
}
function marketRaw(){           // semua saham yang tertangkap di jendela akumulasi (tanpa syarat sinyal) — untuk dibandingkan langsung dengan Stockbit
  const m=agg(CFG.accWin*60000), out=[], own=X.ownTickers();
  m.forEach(a=>{ if(okTk(a.tk,a.nb+a.ns,own)) out.push(a); });
  return out;
}

const topN=(m,n)=>m&&m.size?Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).slice(0,n):[];
function brkWin(){               // total nilai beli/jual per broker per ticker di jendela akumulasi (kedua sisi transaksi, seperti broker summary)
  const from=Date.now()-CFG.accWin*60000, m=new Map(), ml=CFG.minLot||0;
  for(let i=RT.trades.length-1;i>=0;i--){
    const x=RT.trades[i]; if(x.ts<from||(ml&&x.lot<ml)||(!x.buyer&&!x.seller)) continue;
    let a=m.get(x.tk); if(!a){ a={bb:new Map(),bs:new Map()}; m.set(x.tk,a); }
    const v=x.px*x.lot*100; if(x.buyer) a.bb.set(x.buyer,(a.bb.get(x.buyer)||0)+v); if(x.seller) a.bs.set(x.seller,(a.bs.get(x.seller)||0)+v);
  }
  return m;
}
// status lolos screener: Smart Pick (nama sinyal), Trend Bullish, Keyakinan Tinggi, Watchlist/Posisi
function scStatus(tk){
  const out=[]; try{
    const c=ctx(), sp=c.sp.get(tk), ic=c.ic.get(tk)||[];
    if(sp) sp.forEach((t,i)=>out.push({i:ic[i]||"✨",t}));
    const r=X.stk(tk);
    if(r&&typeof trendTone==="function"&&trendTone(r.trendHarga)==="up") out.push({i:"📈",t:"Trend Bullish"});
    if(r&&r.keyakinanTone==="up") out.push({i:"✅",t:"Keyakinan Tinggi"});
    if(X.ownTickers().has(tk)) out.push({i:"⭐",t:"Watchlist/Posisi"});
  }catch(e){}
  return out;
}
// akselerasi tape: %Buy 2 menit terakhir vs 5 menit sebelumnya, lonjakan kecepatan transaksi, dan tren %Buy per menit (10 menit)
function accelRaw(){
  const now=Date.now(), N=10, R=2, B=5, m=new Map(), ml=CFG.minLot||0; let old=now;
  for(let i=RT.trades.length-1;i>=0;i--){
    const x=RT.trades[i]; if(x.ts<old) old=x.ts;
    const mi=Math.floor((now-x.ts)/60000); if(mi<0||mi>=N||(ml&&x.lot<ml)) continue;
    let a=m.get(x.tk); if(!a){ a={bv:new Array(N).fill(0),sv:new Array(N).fill(0),n:new Array(N).fill(0)}; m.set(x.tk,a); }
    const v=x.px*x.lot*100; if(x.side==="B") a.bv[mi]+=v; else a.sv[mi]+=v; a.n[mi]++;
  }
  const spanOk=now-old>=(R+B)*60000, out=new Map();
  m.forEach((a,tk)=>{
    let rb=0,rs=0,rn=0,bb=0,bs=0,bn=0,cnt=0;
    for(let i=0;i<N;i++){ cnt+=a.n[i]; if(i<R){ rb+=a.bv[i]; rs+=a.sv[i]; rn+=a.n[i]; } else if(i<R+B){ bb+=a.bv[i]; bs+=a.sv[i]; bn+=a.n[i]; } }
    const pbR=(rb+rs)?rb/(rb+rs)*100:null, pbB=(bb+bs)?bb/(bb+bs)*100:null, d=pbR!=null&&pbB!=null?pbR-pbB:null;
    const spike=(rn/R)/Math.max(bn/B,0.5), th=thr(tk,CFG.accMinJt)*0.15; let sig=null;
    if(spanOk&&d!=null&&rn>=8&&bn>=5&&spike>=1.5){
      if(d>=15&&pbR>=60&&rb-rs>=th) sig="U"; else if(d<=-15&&pbR<=40&&rs-rb>=th) sig="D";
    }
    const spark=[]; for(let i=N-1;i>=0;i--){ const t=a.bv[i]+a.sv[i]; spark.push(t?a.bv[i]/t*100:null); }
    out.set(tk,{d,spike,pbR,pbB,sig,spark,cnt,rn,net:rb-rs});
  });
  return out;
}
const sparkSvg=p=>{
  const W=70,H=18,n=p.length; let path="",pen=false, last=null;
  p.forEach((v,i)=>{ if(v==null){ pen=false; return; } const x=(i*(W/(n-1))).toFixed(1), y=(H-1-(v/100)*(H-2)).toFixed(1); path+=(pen?"L":"M")+x+" "+y+" "; pen=true; last=v; });
  if(last==null) return "-";
  return `<svg viewBox="0 0 ${W} ${H}" style="width:${W}px;height:${H}px" title="%Buy per menit, 10 menit terakhir (kanan = terbaru)"><line x1="0" y1="${H/2}" x2="${W}" y2="${H/2}" stroke="currentColor" stroke-opacity=".25" stroke-dasharray="2 2"/><path d="${path}" fill="none" stroke="${last>=50?"#22c55e":"#ef4444"}" stroke-width="1.6"/></svg>`;
};
function divOf(a){              // indikasi divergensi harga vs aliran (heuristik; sisi HAKA/HAKI bisa saja tebakan)
  if(Math.abs(a.net)<thr(a.tk,CFG.accMinJt)*0.5||a.nb+a.ns<Math.max(CFG.minTrades,10)) return null;
  if(a.net>0&&a.pb>=60&&a.chg<=0.2) return {c:"H",t:"🕵 Akumulasi tersembunyi",d:"Net beli besar tetapi harga datar/turun: indikasi akumulasi diam-diam."};
  if(a.net<0&&a.pb<=40&&a.chg>=0.5) return {c:"D",t:"⚠ Distribusi",d:"Harga naik tetapi net jual besar: indikasi penjualan ke kekuatan harga."};
  if(a.net<0&&a.pb<=40&&a.chg>=-0.2) return {c:"P",t:"🧱 Penyerapan jual",d:"Banyak HAKI tetapi harga bertahan: indikasi ada yang menyerap tekanan jual."};
  return null;
}
function bsRows(M,fq,light){      // light = hanya angka buy/sell (tanpa screener, broker, momentum, divergensi, dan filter kartu)
  const am=light?null:accelMap();          // baris komposisi buy/sell: mode "win" = jendela akumulasi, "cum" = akumulasi sejak Mulai hari ini
  let src=M;
  if(RT.mode==="cum"){ src=[]; const own=X.ownTickers();
    RT.cum.forEach(a=>{ if(!okTk(a.tk,a.nb+a.ns,own)) return; const l=RT.last[a.tk]||a.p0; src.push({tk:a.tk,last:l,chg:a.p0?(l-a.p0)/a.p0*100:0,bv:a.bv,sv:a.sv,bl:a.bl,sl:a.sl,nb:a.nb,ns:a.ns,bb:a.bb,bs:a.bs}); }); }
  const bw=(light||RT.mode==="cum")?null:brkWin();
  return src.filter(fq).map(a=>{ const tv=a.bv+a.sv, tl=a.bl+a.sl, bm=bw?(bw.get(a.tk)||{}):a;
    return {tk:a.tk,last:a.last,chg:a.chg,bv:a.bv,sv:a.sv,bl:a.bl,sl:a.sl,nb:a.nb,ns:a.ns,tv,net:a.bv-a.sv,netL:a.bl-a.sl,pb:tv?a.bv/tv*100:0,ps:tv?a.sv/tv*100:0,pl:tl?a.bl/tl*100:0,
      tb:light?[]:(topN(bm.bb,3).length?topN(bm.bb,3):bdTop(a.tk,"buy",3)),ts:light?[]:(topN(bm.bs,3).length?topN(bm.bs,3):bdTop(a.tk,"sell",3)),bdy:light?false:!(topN(bm.bb,3).length||topN(bm.bs,3).length)&&!!bdOk(a.tk),sc:light?[]:scStatus(a.tk),ac:light?null:(am.get(a.tk)||null)}; }).map(r=>{ if(!light) r.dv=divOf(r); return r; }).filter(a=>light||((!RT.scOnly||a.sc.length)&&(!RT.dvOnly||a.dv)&&(!RT.momOnly||(a.ac&&a.ac.sig))));
}

/* ---------- bandar: broker dengan net beli terbesar per ticker ---------- */
function brokerRaw(){
  const from=Date.now()-CFG.accWin*60000, m=new Map(), tot={}, cnt={}, own=X.ownTickers(), ml=CFG.minLot||0;
  for(let i=RT.trades.length-1;i>=0;i--){
    const x=RT.trades[i]; if(x.ts<from||(ml&&x.lot<ml)) continue;
    const v=x.px*x.lot*100; cnt[x.tk]=(cnt[x.tk]||0)+1;
    if(x.buyer){ tot[x.tk]=(tot[x.tk]||0)+v; const k=x.tk+"|"+x.buyer; const a=m.get(k)||{tk:x.tk,br:x.buyer,buy:0,sell:0,lb:0,ls:0,n:0,f:false}; a.buy+=v; a.lb+=x.lot; a.n++; if(x.bF) a.f=true; m.set(k,a); }
    if(x.seller){ const k=x.tk+"|"+x.seller; const a=m.get(k)||{tk:x.tk,br:x.seller,buy:0,sell:0,lb:0,ls:0,n:0,f:false}; a.sell+=v; a.ls+=x.lot; if(x.sF) a.f=true; m.set(k,a); }
  }
  const out=[];
  m.forEach(a=>{
    a.net=a.buy-a.sell; a.netL=a.lb-a.ls; a.share=tot[a.tk]?a.buy/tot[a.tk]:0;
    if(a.net>=thr(a.tk,CFG.brkMinJt)&&a.share>=.25&&(!CFG.brkMinLot||a.netL>=CFG.brkMinLot)&&okTk(a.tk,cnt[a.tk]||0,own)) out.push(a);
  });
  return out.sort((a,b)=>b.net-a.net).slice(0,20);
}

/* ---------- aliran asing: net beli/jual broker asing per ticker ---------- */
function foreignRaw(){
  const from=Date.now()-CFG.accWin*60000, m=new Map(), own=X.ownTickers(), ml=CFG.minLot||0;
  for(let i=RT.trades.length-1;i>=0;i--){
    const x=RT.trades[i]; if(x.ts<from||(ml&&x.lot<ml)) continue;
    const v=x.px*x.lot*100; let a=m.get(x.tk); if(!a){ a={tk:x.tk,fb:0,fs:0,lb:0,ls:0,tot:0,n:0}; m.set(x.tk,a); }
    a.tot+=v; a.n++; if(x.bF){ a.fb+=v; a.lb+=x.lot; } if(x.sF){ a.fs+=v; a.ls+=x.lot; }
  }
  const out=[];
  m.forEach(a=>{ a.net=a.fb-a.fs; a.netL=a.lb-a.ls; a.share=a.tot?(a.fb+a.fs)/(2*a.tot):0;
    if(Math.abs(a.net)>=thr(a.tk,CFG.brkMinJt)&&(!CFG.brkMinLot||Math.abs(a.netL)>=CFG.brkMinLot)&&okTk(a.tk,a.n,own)) out.push(a); });
  return out.sort((a,b)=>Math.abs(b.net)-Math.abs(a.net)).slice(0,12);
}

/* ---------- cadangan: Broker Summary harian Stockbit (app.js: stockbitFetchMarketDetector + parseStockbitMarketDetector) ---------- */
// dipakai bila running trade tidak membawa kode broker: top 5 beli/jual per saham untuk HARI ITU (kumulatif, bukan per jendela)
const isForeignT=t=>/asing|foreign|^f$/i.test(String(t||""));
const bdOk=tk=>{ const e=RT.bday.get(tk); return e&&e.ok?e:null; };
const bdTop=(tk,side,n)=>{ const e=bdOk(tk); return e?(e[side]||[]).slice(0,n).map(r=>[r.broker_code,r.value_idr]):[]; };
function bdWhale(tk){            // broker beli teratas: net (beli − jual) >= 3x batas broker dan >= 30% dari total beli top 5
  const e=bdOk(tk); if(!e||!e.buy.length) return false; const b=e.buy[0], sv=(e.sell.find(r=>r.broker_code===b.broker_code)||{}).value_idr||0, tb=e.buy.reduce((t,r)=>t+r.value_idr,0);
  return b.value_idr-sv>=thr(tk,CFG.brkMinJt)*3&&tb>0&&b.value_idr/tb>=.3;
}
function bdForeignNet(tk){ const e=bdOk(tk); if(!e) return 0; const f=(l)=>l.filter(r=>isForeignT(r.investor_type)).reduce((t,r)=>t+r.value_idr,0); return f(e.buy)-f(e.sell); }
async function bdFetch(tk){
  const day=RT.st.dataDate||(typeof todayLocalISO==="function"?todayLocalISO():new Date().toISOString().slice(0,10)), e={at:Date.now(),ok:false,buy:[],sell:[],day};
  try{
    const res=await stockbitFetchMarketDetector(tk,day,day,1);
    if(!res||res.error){ e.err=(res&&res.error)||"respons kosong"; RT.bdErr=e.err; }
    else { const by=parseStockbitMarketDetector(res.raw,day), d=by&&by[day]; if(d&&((d.buy&&d.buy.length)||(d.sell&&d.sell.length))){ e.ok=true; e.buy=d.buy||[]; e.sell=d.sell||[]; RT.bdErr=null; } else e.err="Tidak ada data broker untuk "+day; }
  }catch(x){ e.err=String(x&&x.message||x); RT.bdErr=e.err; }
  RT.bday.set(tk,e);
}
async function bdTick(){
  if(!CFG.bday||RT.bdBusy||!RT.on||typeof stockbitFetchMarketDetector!=="function"||typeof parseStockbitMarketDetector!=="function") return;
  const s=RT.st, need=s.trades>=30&&s.brk/s.trades<0.1, want=[];      // "need" = running trade tidak membawa broker
  if(RT.sel) want.push(RT.sel);
  if(need){ confList().slice(0,10).forEach(r=>want.push(r.tk)); RT.bdWant.forEach(t=>want.push(t)); }
  const now=Date.now(), seen=new Set(), q=[];
  want.forEach(t=>{ if(seen.has(t)) return; seen.add(t); const e=RT.bday.get(t); if(!e||now-e.at>(e.ok?180000:300000)) q.push(t); });
  if(!q.length) return; RT.bdBusy=true;
  try{ for(const t of q.slice(0,3)){ await bdFetch(t); await new Promise(r=>setTimeout(r,400)); } } finally{ RT.bdBusy=false; }
}
const secOf=tk=>{ let v=RT.secMap.get(tk); if(v!==undefined) return v; const r=X.stk(tk); if(r&&r.sektor){ RT.secMap.set(tk,r.sektor); return r.sektor; } return "(Tanpa sektor)"; };   // hanya di-cache bila data sektor ada
/* ---------- cache hasil daftar berat (dyn, alert, dan konfluensi memakai hasil yang sama dalam 0,7 detik) ---------- */
const memo=(k,f)=>{ const e=RT.mm[k], n=Date.now(); if(e&&n-e.t<700&&e.d===RT.dirty) return e.v; const v=f(); RT.mm[k]={t:n,d:RT.dirty,v}; return v; };   // batal otomatis bila ada transaksi baru
// order berulang: lot sama (>= 50) dari broker yang sama berulang >= 6 kali dengan nilai total >= 2x batas lot besar (indikasi iceberg/algo/order dipecah)
function repeatRaw(){
  const now=Date.now(), from=now-CFG.accWin*60000, m=new Map(), ml=Math.max(50,CFG.minLot||0), own=X.ownTickers(), out=[];
  for(const x of RT.trades){
    if(x.ts<from||x.lot<ml) continue;
    const br=x.side==="B"?x.buyer:x.seller, k=x.tk+"|"+x.side+"|"+x.lot+"|"+(br||""); let a=m.get(k);
    if(!a){ a={tk:x.tk,side:x.side,lot:x.lot,br:br||"",n:0,v:0,t:[],lo:x.px,hi:x.px}; m.set(k,a); }
    a.n++; a.v+=x.px*x.lot*100; a.t.push(x.ts); if(x.px<a.lo) a.lo=x.px; if(x.px>a.hi) a.hi=x.px;
  }
  m.forEach(a=>{
    if(a.n<6||a.v<thr(a.tk,CFG.bigJt)*2||!pxOk(a.tk)||(CFG.onlyOwn&&!own.has(a.tk))) return;
    const t=a.t.slice().sort((p,q)=>p-q), iv=[]; for(let i=1;i<t.length;i++) iv.push((t[i]-t[i-1])/1000);
    const mean=avg(iv), sd=Math.sqrt(avg(iv.map(d=>(d-mean)*(d-mean)))), cv=mean>0?sd/mean:9;
    out.push({tk:a.tk,side:a.side,lot:a.lot,br:a.br,n:a.n,tl:a.n*a.lot,v:a.v,lo:a.lo,hi:a.hi,mean,cv,reg:cv<0.6,span:(t[t.length-1]-t[0])/1000,age:Math.round((now-t[t.length-1])/1000)});
  });
  return out.sort((p,q)=>q.v-p.v).slice(0,40);
}
const repeatList=()=>memo("r",repeatRaw);
const hakaList=()=>memo("h",hakaRaw), accList=()=>memo("a",accRaw), marketList=()=>memo("m",marketRaw), brokerList=()=>memo("b",brokerRaw), foreignList=()=>memo("f",foreignRaw), accelMap=()=>memo("x",accelRaw);

/* ---------- skor konfluensi: gabungan sinyal per saham (jendela akumulasi) ---------- */
// bobot maks: HAKA 20, Akumulasi 20, Lot besar 15, Screener 15, Broker dominan 10, Momentum 10, Asing 5, Akumulasi tersembunyi 5 = 100; penalti: distribusi −20, momentum turun −20, net jual −10
function confList(){
  const M=marketList(), hs=new Set(hakaList().map(a=>a.tk)), as=new Map(accList().map(a=>[a.tk,a.score])), bs=new Set(brokerList().filter(whale).map(a=>a.tk)),
        fs=new Map(foreignList().map(a=>[a.tk,a.net])), am=accelMap(), out=[];
  M.forEach(a=>{
    const sc=scStatus(a.tk), ac=am.get(a.tk)||null, sg=[], pen=[]; let pts=0;
    const add=(k,t,p)=>{ sg.push({k,t}); pts+=p; };
    if(hs.has(a.tk)) add("H","🔥 HAKA",20);
    if(as.has(a.tk)) add("A","🧲 Akumulasi",12+8*clamp((as.get(a.tk)||0)/100,0,1));
    if(a.bigNet>0&&a.big>=1) add("L","🐘 Lot besar",15);
    if(sc.length) add("S","🧬 Screener ("+sc.length+")",5+10*clamp(sc.length/3,0,1));
    if(bs.has(a.tk)||bdWhale(a.tk)) add("B","🐋 Broker dominan"+(bs.has(a.tk)?"":" (harian)"),10);
    if(ac&&ac.sig==="U") add("M","🚀 Momentum",10);
    if((fs.get(a.tk)||0)>0) add("F","🌍 Asing net beli",5); else if(!fs.has(a.tk)&&bdForeignNet(a.tk)>0) add("F","🌍 Asing net beli (harian, top 5)",5);
    const dv=divOf({tk:a.tk,net:a.net,pb:a.ratio*100,chg:a.chg,nb:a.nb,ns:a.ns});
    if(dv&&dv.c==="H") add("V","🕵 Akumulasi tersembunyi",5);
    if(dv&&dv.c==="D"){ pts-=20; pen.push("⚠ Distribusi"); }
    if(ac&&ac.sig==="D"){ pts-=20; pen.push("🔻 Mulai dilepas"); }
    if(a.net<0){ pts-=10; pen.push("Net jual"); }
    const score=Math.round(clamp(pts,0,100));
    if(sg.length>=Math.max(1,CFG.confMin)&&score>0) out.push({tk:a.tk,last:a.last,chg:a.chg,net:a.net,pb:a.ratio*100,score,n:sg.length,sg,pen});
  });
  return out.sort((a,b)=>b.score-a.score||b.n-a.n||b.net-a.net);
}

/* ---------- preset ambang (hanya ambang & jendela; sumber data, alert, filter lot/harga, dan pilihan Anda lainnya tidak diubah) ---------- */
const PRE_KEYS=["hakaWin","accWin","hakaMinJt","hakaRatio","bigJt","accMinJt","accRatio","brkMinJt","minTrades","pollSec","confMin"];
const PRESETS={
  scalp:{n:"⚡ Scalping",d:"Jendela HAKA 1 mnt, akumulasi 3 mnt; ambang kecil dan reaksi cepat (polling 2 dtk). Sinyal banyak tetapi lebih berisik.",
    v:{hakaWin:1,accWin:3,hakaMinJt:150,hakaRatio:70,bigJt:30,accMinJt:100,accRatio:60,brkMinJt:60,minTrades:8,pollSec:2,confMin:3}},
  intra:{n:"📊 Intraday",d:"Jendela HAKA 5 mnt, akumulasi 15 mnt; ambang standar (nilai bawaan aplikasi).",
    v:{hakaWin:5,accWin:15,hakaMinJt:300,hakaRatio:65,bigJt:50,accMinJt:200,accRatio:55,brkMinJt:100,minTrades:10,pollSec:3,confMin:3}},
  swing:{n:"🌊 Swing",d:"Jendela HAKA 15 mnt, akumulasi 60 mnt; ambang besar, sinyal lebih sedikit tetapi lebih tahan lama (polling 5 dtk). Butuh data terkumpul ± 1 jam.",
    v:{hakaWin:15,accWin:60,hakaMinJt:800,hakaRatio:60,bigJt:100,accMinJt:600,accRatio:55,brkMinJt:300,minTrades:30,pollSec:5,confMin:4}}
};
const userPre=()=>LS("rt_preset_user",null);
const sameP=(v)=>!!v&&PRE_KEYS.every(k=>+CFG[k]===+v[k]);
function presetName(){ for(const k in PRESETS) if(sameP(PRESETS[k].v)) return PRESETS[k].n; return sameP(userPre())?"💾 Preset saya":"Kustom"; }
function applyPreset(v,nama){
  PRE_KEYS.forEach(k=>{ if(v[k]!=null) CFG[k]=v[k]; });
  RT.mm={}; SV("rt_cfg",CFG); applyPoll(); X.repaint(); dyn(); X.toast("Preset "+nama+" diterapkan","up");
}

/* ---------- ekspor semua tabel ---------- */
const csvCell=v=>{ if(v==null) return ""; if(typeof v==="number") return isFinite(v)?String(+v.toFixed(4)):""; const t=String(v).replace(/"/g,'""'); return /[",\n]/.test(t)?'"'+t+'"':t; };
function exportCsv(){
  const L=["# Running Trade — ekspor "+new Date().toLocaleString("id-ID")+" · jendela akumulasi "+CFG.accWin+" mnt · mode Buy/Sell: "+(RT.mode==="cum"?"sejak Mulai":"jendela")+" · nilai Rp, lot, dan persen sebagai angka mentah (kolom grafik dilewati)"];
  Object.keys(RT.tblData).forEach(id=>{
    const t=RT.tblData[id]; if(!t.rows.length) return; const cs=t.cols.filter(h=>h.k);
    L.push("","## "+(TBL_NAMES[id]||id), cs.map(h=>csvCell(String(h.h).replace(/<[^>]*>/g,""))).join(","));
    t.rows.forEach(r=>L.push(cs.map(h=>{ let v=h.k(r); if(h.h==="Waktu"&&typeof v==="number") v=new Date(v).toISOString(); return csvCell(v); }).join(",")));
  });
  return L.join("\n");
}
function dlCsv(text){
  try{ const b=new Blob(["\ufeff"+text],{type:"text/csv;charset=utf-8"}), u=URL.createObjectURL(b), a=document.createElement("a"); a.href=u; a.download="running-trade-"+new Date().toISOString().slice(0,16).replace(/[-:T]/g,"")+".csv"; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(u); a.remove(); },500); X.toast("CSV diunduh","up"); }
  catch(e){ copy(text,"Unduhan tidak didukung — CSV disalin ke clipboard"); }
}
/* ---------- kalibrasi dengan Stockbit & pengaturan kolom ---------- */
function parseRp(t){            // "8,07 M" (miliar), "500 jt", "250 rb", "1.250.000.000", "1,2T"
  if(t==null) return null; const s0=String(t).toLowerCase().replace(/rp/g,"").replace(/\s+/g,""); const m=s0.match(/^([\d.,]+)(t|m|b|jt|j|rb|k)?$/); if(!m) return null;
  let num=m[1]; const u=m[2]||"";
  if(num.indexOf(".")>=0&&num.indexOf(",")>=0){ const dec=num.lastIndexOf(".")>num.lastIndexOf(",")?".":",", th=dec==="."?",":"."; num=num.split(th).join("").replace(dec,"."); }
  else if(num.indexOf(",")>=0||num.indexOf(".")>=0){ const sep=num.indexOf(",")>=0?",":".", p=num.split(sep);
    if(p.length>2||(!u&&p.slice(1).every(x=>x.length===3))) num=p.join(""); else num=p[0]+"."+p[1]; }
  const v=parseFloat(num); if(isNaN(v)) return null;
  return v*({t:1e12,m:1e9,b:1e9,jt:1e6,j:1e6,rb:1e3,k:1e3}[u]||1);
}
const parseLot=t=>{ const d=String(t==null?"":t).replace(/[^\d]/g,""); return d?parseInt(d,10):null; };
function calRun(){
  const out=document.getElementById("rtCalRes"); if(!out) return;
  const say=m=>{ out.innerHTML=`<div class="ex-mut" style="margin-top:8px">${m}</div>`; };
  const tk=String(RT.cal.tk||"").toUpperCase().replace(/[^A-Z]/g,""), win=RT.cal.win===undefined||RT.cal.win===""?15:+RT.cal.win;
  const sb=parseRp(RT.cal.b), ss=parseRp(RT.cal.s), slb=parseLot(RT.cal.lb), sls=parseLot(RT.cal.ls);
  if(!tk) return say("Isi ticker dulu.");
  if(sb==null&&ss==null) return say("Isi nilai Buy dan/atau Sell dari Stockbit, contoh: 8,07 M, 500 jt, atau 1.250.000.000 (M = miliar).");
  const now=Date.now(); let bv=0,sv=0,bl=0,sl=0,nt=0,est=0,nw=0,nr=0,t0=Infinity,has=false;
  for(const x of RT.trades){ if(x.ts<t0) t0=x.ts; if(x.tk!==tk) continue; has=true; if(win>0&&x.ts>=now-win*60000){ const v=x.px*x.lot*100; if(x.side==="B"){ bv+=v; bl+=x.lot; } else { sv+=v; sl+=x.lot; } nt++; if(x.est) est++; if(x.src==="w") nw++; else nr++; } }
  if(win===0){ const a=RT.cum.get(tk); if(a){ bv=a.bv; sv=a.sv; bl=a.bl; sl=a.sl; nt=a.nb+a.ns; } }
  const spanMin=t0===Infinity?0:(now-t0)/60000, tot=bv+sv, both=sb!=null&&ss!=null, sbT=(sb||0)+(ss||0);
  const pbO=tot?bv/tot*100:0, pbS=both&&sbT?sb/sbT*100:null;
  const cell=(sv0,ov,fmt)=>{ if(sv0==null||!sv0) return "<td>-</td>"; const d=(ov-sv0)/sv0*100, a=Math.abs(d); return `<td><span class="${a<=5?"ex-up":a<=15?"":"ex-dn"}">${d>=0?"+":"−"}${a.toFixed(1)}%</span> <span class="ex-mut">(${ov>=sv0?"+":"−"}${fmt(Math.abs(ov-sv0))})</span></td>`; };
  const row=(n,x,o,fmt)=>`<tr><td>${n}</td><td>${x==null?"-":fmt(x)}</td><td>${fmt(o)}</td>${cell(x,o,fmt)}</tr>`;
  const fl=n=>fpx(Math.round(n));
  let rows=row("Buy (nilai)",sb,bv,fv)+row("Sell (nilai)",ss,sv,fv);
  if(both) rows+=row("Total nilai",sbT,tot,fv)+`<tr><td>% Buy</td><td>${pbS.toFixed(1)}%</td><td>${pbO.toFixed(1)}%</td><td><span class="${Math.abs(pbO-pbS)<=3?"ex-up":Math.abs(pbO-pbS)<=8?"":"ex-dn"}">${pbO-pbS>=0?"+":"−"}${Math.abs(pbO-pbS).toFixed(1)} poin</span></td></tr>`;
  if(slb!=null) rows+=row("Lot buy",slb,bl,fl); if(sls!=null) rows+=row("Lot sell",sls,sl,fl);
  const why=[];
  if(!has) why.push(`Tidak ada transaksi ${tk} yang terekam sama sekali: cek ejaan ticker, aktifkan <b>Sertakan feed seluruh pasar</b>, atau pastikan sudah menekan ▶ Mulai.`);
  if(win>0&&spanMin<win*0.95) why.push(`<b>Jendela belum penuh:</b> data terekam baru ${spanMin.toFixed(1)} menit dari ${win} menit, jadi angka aplikasi masih lebih kecil dan akan naik seiring waktu.`);
  if(win===0) why.push("Mode <b>Sejak Mulai</b>: aplikasi hanya menghitung sejak ▶ Mulai ditekan (plus data yang dipulihkan), sedangkan Stockbit menghitung sejak pembukaan.");
  const ratio=both&&sbT?tot/sbT:(sb!=null&&sb?bv/sb:(ss?sv/ss:1));
  if(has&&ratio<0.9) why.push(`<b>Aplikasi menangkap ${Math.round((1-ratio)*100)}% lebih sedikit.</b> Kemungkinan: tarikan REST tidak sempat mengambil semua transaksi (feed seluruh pasar mati, atau saham ini di luar giliran ticker), WebSocket ekstensi terputus, atau jendela belum penuh.${CFG.feed?"":" Saat ini <b>feed seluruh pasar nonaktif</b>."}`);
  if(has&&ratio>1.1) why.push(`<b>Aplikasi menghitung ${Math.round((ratio-1)*100)}% lebih banyak.</b> Kemungkinan: transaksi ganda dari WS+REST yang lolos dedup (${RT.st.dup} duplikat sudah dibuang), atau Stockbit memakai definisi lain (misalnya tidak menghitung pasar negosiasi).`);
  if(both&&pbS!=null&&Math.abs(pbO-pbS)>5) why.push(nt&&est/nt>0.05?`<b>${Math.round(est/nt*100)}% transaksi bertanda ~</b> (sisi ditebak tick-rule): pembagian Buy/Sell bisa meleset. Pastikan sumber membawa sisi HAKA/HAKI.`:"Total mendekati tetapi pembagian Buy/Sell berbeda: definisi sisi Stockbit kemungkinan berbeda (misalnya agresor vs broker).");
  const age=RT.lastTs[tk]?Math.round((now-RT.lastTs[tk])/1000):null;
  if(RT.on&&has&&age!=null&&age>45&&RT.st.open!==false) why.push(`Transaksi ${tk} terakhir yang tertangkap ${age} detik lalu: data mungkin tertinggal.`);
  if(CFG.minLot>0) why.push(`Catatan: kalibrasi ini mengabaikan filter lot, sedangkan tabel lain memakai <i>Min lot per transaksi</i> = ${fpx(CFG.minLot)}.`);
  const okTot=both&&sbT&&Math.abs(ratio-1)<=0.05&&Math.abs(pbO-pbS)<=3;
  const verdict=okTot?`<div class="ex-up" style="margin:8px 0"><b>✅ Cocok</b> — total dalam ±5% dan % Buy dalam ±3 poin.</div>`:(both?"":`<div class="ex-mut" style="margin:8px 0">Isi Buy <b>dan</b> Sell untuk membandingkan total dan % Buy.</div>`);
  out.innerHTML=`<div class="ex-mut" style="margin-top:10px">${E(tk)} · ${win===0?"sejak Mulai":win+" menit terakhir"} · ${nt} transaksi di aplikasi${nt&&win>0?` (WS ${nw}, REST ${nr})`:""} · dihitung ${new Date(now).toLocaleTimeString("id-ID")}</div>
    <div class="ex-wrap"><table class="ex-tbl"><thead><tr><th>Metrik</th><th>Stockbit</th><th>Aplikasi</th><th>Selisih (aplikasi vs Stockbit)</th></tr></thead><tbody>${rows}</tbody></table></div>${verdict}
    ${why.length?`<div style="margin-top:6px;line-height:1.55"><b>Kemungkinan penyebab selisih</b><br>${why.map(w=>"▸ "+w).join("<br>")}</div>`:(okTot?"":`<div class="ex-mut">Tidak ada penyebab teknis yang terdeteksi; selisih kecil bisa berasal dari beda waktu pengambilan data.</div>`)}`;
}
const TBL_NAMES={rtsk:"🏭 Sektor",rtrp:"🔁 Order berulang",rths:"📈 Hit-rate sinyal",rtbs:"⚖️ Buy vs Sell",rtm:"📊 Semua saham",rtb:"🐘 Lot besar",rtcf:"🎯 Konfluensi",rth:"🔥 HAKA",rta:"🧲 Terakumulasi",rtk:"🐋 Bandar",rtf:"🌍 Asing",rtt:"Transaksi terbaru"};
function colPanel(){
  const el=document.getElementById("rtColCard"); if(!el) return; const ids=Object.keys(TBL_NAMES).filter(i=>RT.colReg[i]);
  el.innerHTML=`<h3>🧩 Atur kolom tampil</h3><div class="ex-mut">Centang kolom yang ingin ditampilkan (kolom pertama selalu tampil). Pengaturan tersimpan.</div>`+(ids.length?ids.map(id=>{ const hd=RT.hide[id]||[];
    return `<div style="margin:10px 0"><b>${TBL_NAMES[id]}</b> <button class="ex-btn" data-rt-colall="${id}">Tampilkan semua</button>${id==="rtbs"?` <button class="ex-btn" data-rt-colcompact="1">Ringkas</button>`:""}
      <div class="rt-tools" style="margin-top:4px">${RT.colReg[id].map((h,i)=>i===0?"":`<label><input type="checkbox" id="rtcol_${id}_${i}"${hd.indexOf(h)<0?" checked":""} style="width:auto"> ${E(h)}</label>`).join("")}</div></div>`; }).join(""):`<div class="ex-mut">Tabel belum terbentuk — tekan ▶ Mulai dulu.</div>`);
}

/* ---------- tampilan ---------- */
(function css(){
  if(document.getElementById("rt-css")) return;
  const s=document.createElement("style"); s.id="rt-css";
  s.textContent=".rt-l1>td{background:rgba(250,204,21,.16)}.rt-l2>td{background:rgba(251,146,60,.28);font-weight:600}.rt-l3>td{background:rgba(239,68,68,.36);font-weight:700}"
   +".rt-th{cursor:pointer;user-select:none;white-space:nowrap}.rt-th:hover{text-decoration:underline}.rt-tk{cursor:pointer}.rt-tk:hover{text-decoration:underline}"
   +".rt-tools{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:10px}.rt-tools label{display:inline-flex;flex-direction:row;align-items:center;gap:6px}"
   +"#rtDyn .ex-wrap{overflow:auto;max-height:70vh}#rtDyn .ex-wrap thead th{position:sticky;top:0;z-index:2}#rtDyn .ex-wrap thead th:first-child{left:0;z-index:3}"
   +"#rtDyn .ex-wrap tbody td:first-child{position:sticky;left:0;z-index:1;background-color:var(--rt-bg,Canvas)}"
   +"#rtDyn .rt-l1>td:first-child{background-image:linear-gradient(rgba(250,204,21,.16),rgba(250,204,21,.16))}#rtDyn .rt-l2>td:first-child{background-image:linear-gradient(rgba(251,146,60,.28),rgba(251,146,60,.28))}#rtDyn .rt-l3>td:first-child{background-image:linear-gradient(rgba(239,68,68,.36),rgba(239,68,68,.36))}"
   +"#exPage,#exPage>*,#rtDyn,#rtDyn>.ex-card{min-width:0;max-width:100%;box-sizing:border-box}#exPage .ex-grid>*{min-width:0}#rtDyn .ex-wrap{max-width:100%}"
   +"#exPage .ex-grid input,#exPage .ex-grid select{max-width:100%;box-sizing:border-box}"
   +".rt-xs{overflow-x:auto;overflow-y:hidden;height:14px;margin-bottom:2px}"
   +".rt-tools input[type=text]{width:150px}.rt-leg span{display:inline-block;padding:1px 8px;border-radius:6px;margin-right:6px}";
  document.head.appendChild(s);
})();
const ck=(id,v)=>`<label style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" id="${id}"${v?" checked":""} style="width:auto"> `;
function view(){
  const sel=(id,arr,v)=>`<select id="${id}">${arr.map(n=>`<option value="${n}"${+v===n?" selected":""}>${n} menit</option>`).join("")}</select>`;
  const inp=(id,v,t)=>`<input id="${id}" ${t||"type=\"number\""} value="${E(v)}">`;
  return `<div class="ex-card"><h3>⚡ Running Trade — deteksi HAKA &amp; akumulasi <span class="ex-mut" style="font-weight:400;font-size:12px">v3.10 · kolom Lolos preset (jumlah + rincian)</span></h3>
  <div class="ex-mut" style="margin-bottom:10px;line-height:1.55">HAKA = pembeli agresif menyambar offer; nilai dihitung dari harga × lot × 100. ⭐ = Watchlist/posisi, ✨ = lolos Smart Pick (arahkan kursor untuk nama sinyalnya), 📈 = trend Bullish di Screener, ✅ = keyakinan tinggi. Batas nilai (HAKA, akumulasi, bandar, transaksi besar) dikalikan ×N sesuai likuiditas saham (acuan di pengaturan; saham sepi 0.3×, sangat likuid sampai 5×). Deteksi memakai transaksi yang tertangkap sejak tombol Mulai ditekan, jadi butuh beberapa menit untuk terisi. Klik judul kolom untuk mengurutkan, klik nama ticker untuk membuka Detail Emiten (analisa lengkap), klik 🔎 untuk panel detail running trade.</div>
  <div class="rt-tools" style="margin:0 0 12px"><b>Preset ambang:</b>
    ${Object.keys(PRESETS).map(k=>`<button class="ex-btn ${sameP(PRESETS[k].v)?"pri":""}" data-act="rtPre_${k}" title="${E(PRESETS[k].d)}">${PRESETS[k].n}</button>`).join("")}
    <button class="ex-btn ${sameP(userPre())?"pri":""}" data-act="rtPreUser" title="Pakai ambang yang Anda simpan">💾 Preset saya</button>
    <button class="ex-btn" data-act="rtPreSave" title="Simpan ambang & jendela saat ini sebagai Preset saya">➕ Simpan pengaturan ini</button>
    <span class="ex-mut">Aktif: <b>${E(presetName())}</b> · preset hanya mengubah jendela &amp; ambang nilai/rasio/min transaksi/interval/konfluensi (sumber data, alert, filter lot &amp; harga tidak ikut berubah)</span></div>
  <div class="ex-grid">
    ${ck("rt-ws",CFG.ws)}Sumber WebSocket (ekstensi)</label>
    ${ck("rt-rest",CFG.rest)}Sumber REST polling</label>
    <label>Interval REST (detik)${inp("rt-poll",CFG.pollSec)}</label>
    ${ck("rt-auto",CFG.auto)}Ticker REST otomatis: Watchlist/Posisi + Smart Pick</label>
    ${ck("rt-feed",CFG.feed)}Sertakan feed seluruh pasar tiap tarikan (disarankan)</label>
    <label>Ticker REST manual (opsional, ditambahkan di depan)${inp("rt-tickers",CFG.tickers,"type=\"text\" placeholder=\"BBCA, GOTO\"")}</label>
    <label>Ticker per tarikan (1–10, bergiliran)${inp("rt-pp",CFG.perPoll)}</label>
    ${ck("rt-adapt",CFG.adapt)}Batas menyesuaikan likuiditas saham</label>
    <label>Likuiditas acuan (miliar Rp/hari)${inp("rt-ref",CFG.refAdvM)}</label>
    <label>Jendela HAKA${sel("rt-hw",[1,3,5,15],CFG.hakaWin)}</label>
    <label>Jendela akumulasi${sel("rt-aw",[1,2,3,5,15,30,60],CFG.accWin)}</label>
    <label>Min nilai HAKA (jt Rp)${inp("rt-hmin",CFG.hakaMinJt)}</label>
    <label>Min rasio HAKA (%)${inp("rt-hr",CFG.hakaRatio)}</label>
    <label>Transaksi besar ≥ (jt Rp)${inp("rt-big",CFG.bigJt)}</label>
    <label>Min net beli akumulasi (jt Rp)${inp("rt-amin",CFG.accMinJt)}</label>
    <label>Min rasio beli akumulasi (%)${inp("rt-ar",CFG.accRatio)}</label>
    <label>Min net broker/bandar (jt Rp)${inp("rt-bmin",CFG.brkMinJt)}</label>
    <label>Min lot per transaksi (0 = nonaktif)${inp("rt-minlot",CFG.minLot)}</label>
    <label>Lot besar ≥ (selain batas Rp; 0 = nonaktif)${inp("rt-biglot",CFG.bigLot)}</label>
    <label>Min total lot HAKA (jendela HAKA)${inp("rt-hlot",CFG.hakaMinLot)}</label>
    <label>Min net lot beli akumulasi${inp("rt-alot",CFG.accMinLot)}</label>
    <label>Min net lot broker/bandar &amp; asing${inp("rt-blot",CFG.brkMinLot)}</label>
    <label>Harga min (Rp; 0 = nonaktif)${inp("rt-pmin",CFG.pxMin)}</label>
    <label>Harga maks (Rp; 0 = nonaktif)${inp("rt-pmax",CFG.pxMax)}</label>
    ${ck("rt-tick",CFG.tick)}Tebak sisi dengan tick-rule bila kosong</label>
    ${ck("rt-quote",CFG.rejQuote)}Tolak frame mirip kuotasi (tanpa id/waktu/sisi)</label>
    ${ck("rt-tg",CFG.tg)}Kirim alert ke Telegram</label>
    ${ck("rt-bn",CFG.bn)}Notifikasi browser saat tab tidak aktif</label>
    ${ck("rt-snd",CFG.snd)}Bunyi saat alert</label>
    ${ck("rt-balert",CFG.bigAlert)}Alert lot JUMBO/MEGA 🐘</label>
    ${ck("rt-malert",CFG.momAlert)}Alert momentum 🚀/🔻 (%Buy melonjak/anjlok)</label>
    <label>Min jumlah sinyal konfluensi (1–8)${inp("rt-cmin",CFG.confMin)}</label>
    ${ck("rt-calert",CFG.confAlert)}Alert konfluensi 🎯 (skor ≥ 75, ≥ 4 sinyal)</label>
    ${ck("rt-hover",CFG.hoverPause)}Jeda tabel otomatis saat kursor di atasnya</label>
    ${ck("rt-bday",CFG.bday)}Cadangan broker: pakai Broker Summary harian Stockbit bila running trade tanpa broker</label>
    ${ck("rt-dg",CFG.digest)}Digest Telegram berkala (konfluensi, momentum, lot besar)</label>
    <label>Interval digest (menit, min 5)${inp("rt-dgmin",CFG.digestMin)}</label>
    <label>Jumlah saham di digest (1–10)${inp("rt-dgn",CFG.digestN)}</label>
    ${ck("rt-dgc",CFG.digestClose)}Kirim juga ringkasan penutupan (15:50 WIB)</label>
    ${ck("rt-cloud",CFG.cloud)}Simpan ringkasan harian ke Supabase otomatis</label>
    <label>Interval simpan (menit, min 5)${inp("rt-cloudmin",CFG.cloudMin)}</label>
    <label>Biaya jual-beli bolak-balik (%) untuk analisa hit-rate${inp("rt-cost",CFG.cost)}</label>
    <label>Min jumlah transaksi (filter tidak likuid)${inp("rt-mt",CFG.minTrades)}</label>
    ${ck("rt-own",CFG.onlyOwn)}Hanya Watchlist/Posisi ⭐</label>
    ${ck("rt-bull",CFG.onlyBull)}Hanya trend Bullish di Screener 📈</label>
    <label class="ex-wide">Endpoint REST${inp("rt-url",CFG.url,"type=\"text\"")}</label>
  </div>
  <button class="ex-btn ${RT.on?"":"pri"}" data-act="rtToggle">${RT.on?"⏸ Berhenti":"▶ Mulai"}</button>
  <button class="ex-btn" data-act="rtReset">🗑 Kosongkan data</button>
  <button class="ex-btn" data-act="rtTest">🔔 Tes alert</button>
  <div class="rt-tools">
    <label>🔍 Cari ticker <input id="rtq" type="text" placeholder="BBCA, GO" value="${E(RT.q)}"></label>
    <label>🔎 Detail saham <input id="rtsel" type="text" placeholder="BBRI" value="${E(RT.sel)}"></label>
    <button id="rtFreezeBtn" class="ex-btn${RT.frozen?" pri":""}" data-act="rtFreeze" title="Tahan tampilan tabel (data tetap direkam)">${RT.frozen?"▶ Lanjutkan tampilan":"⏸ Bekukan tampilan"}</button>
    <button class="ex-btn" data-act="rtTokSync" title="Ambil token Stockbit terbaru dari Supabase (diisi extension Chrome)">🔄 Sinkron token</button>
    <button class="ex-btn" data-act="rtColBtn">🧩 Atur kolom</button>
    <button class="ex-btn" data-act="rtExpDl" title="Unduh semua tabel yang tampil sebagai satu file CSV">💾 Unduh semua (CSV)</button>
    <button class="ex-btn" data-act="rtExpCopy">📋 Salin semua</button>
    <button class="ex-btn" data-act="rtDigestNow" title="Kirim ringkasan sekarang ke Telegram (perlu Bot Token & Chat ID di Pengaturan)">📨 Kirim digest sekarang</button>
    <label>⚖️ Buy/Sell <select id="rtmode"><option value="win"${RT.mode==="win"?" selected":""}>Jendela akumulasi</option><option value="cum"${RT.mode==="cum"?" selected":""}>Sejak Mulai (hari ini)</option></select></label>
    <label>📈 Analisa sinyal per <select id="rtgb">${Object.keys(GB).map(k=>`<option value="${k}"${RT.gb===k?" selected":""}>${GB[k]}</option>`).join("")}</select></label>
    <label><input type="checkbox" id="rtmo"${RT.momOnly?" checked":""} style="width:auto"> Buy/Sell: hanya yang ada momentum</label>
    <label><input type="checkbox" id="rtdv"${RT.dvOnly?" checked":""} style="width:auto"> Buy/Sell: hanya yang ada divergensi</label>
    <label><input type="checkbox" id="rtsc"${RT.scOnly?" checked":""} style="width:auto"> Buy/Sell: hanya yang lolos preset</label>
    <label><input type="checkbox" id="rtbig"${RT.bigOnly?" checked":""} style="width:auto"> Tape: hanya lot besar</label>
  </div></div>
  <div class="ex-card" id="rtColCard" style="display:none"></div>
  <details class="ex-card"><summary style="cursor:pointer"><b>🎚 Kalibrasi dengan Stockbit</b> <span class="ex-mut">— bandingkan angka Buy/Sell satu saham dengan Stockbit</span></summary>
    <div class="ex-mut" style="margin:8px 0;line-height:1.55">Buka Running Trade/ringkasan Stockbit untuk satu saham dan jendela waktu yang sama, isi angkanya di sini (format Stockbit boleh: 8,07 M = miliar, 500 jt, 250 rb), lalu klik Bandingkan. Aplikasi menampilkan selisihnya dan kemungkinan penyebabnya.</div>
    <div class="rt-tools"><label>Ticker <input id="rtc-tk" type="text" value="${E(RT.cal.tk||"")}" placeholder="SMIL"></label>
      <label>Jendela <select id="rtc-win">${[1,3,5,15,30,60].map(m=>`<option value="${m}"${+(RT.cal.win===undefined?15:RT.cal.win)===m?" selected":""}>${m} menit</option>`).join("")}<option value="0"${RT.cal.win==="0"||RT.cal.win===0?" selected":""}>Sejak Mulai (hari ini)</option></select></label>
      <label>Buy Stockbit <input id="rtc-b" type="text" value="${E(RT.cal.b||"")}" placeholder="8,07 M"></label>
      <label>Sell Stockbit <input id="rtc-s" type="text" value="${E(RT.cal.s||"")}" placeholder="1,88 M"></label>
      <label>Lot buy (opsional) <input id="rtc-lb" type="text" value="${E(RT.cal.lb||"")}" placeholder="196.196"></label>
      <label>Lot sell (opsional) <input id="rtc-ls" type="text" value="${E(RT.cal.ls||"")}" placeholder="45.959"></label>
      <button class="ex-btn pri" data-act="rtCal">🔍 Bandingkan</button></div>
    <div id="rtCalRes"></div></details>
  <details class="ex-card"><summary style="cursor:pointer"><b>☁️ Riwayat harian (Supabase)</b> <span class="ex-mut">— simpan ringkasan Buy/Sell per saham per hari; lihat riwayat dan net buy beruntun</span></summary>
    <div class="ex-mut" style="margin:8px 0;line-height:1.55">Perlu tabel <code>running_trade_daily</code> di Supabase: jalankan <code>sql/06_running_trade_daily.sql</code> sekali. Penyimpanan otomatis diaktifkan di pengaturan ("Simpan ringkasan harian ke Supabase otomatis"). Yang tersimpan adalah akumulasi hari itu sejak perekaman dimulai (bukan seluruh pasar sejak pembukaan bila Anda baru menekan Mulai siang hari).</div>
    <div class="rt-tools"><label>Ticker <input id="rth-tk" type="text" value="${E(RT.hq.tk||"")}" placeholder="SMIL"></label>
      <label>Riwayat <select id="rth-n">${[5,10,20,60].map(m=>`<option value="${m}"${+(RT.hq.n||10)===m?" selected":""}>${m} hari</option>`).join("")}</select></label>
      <button class="ex-btn pri" data-act="rtHistLoad">📅 Muat riwayat saham</button><button class="ex-btn" data-act="rtStreak">🔥 Cari net buy beruntun</button><button class="ex-btn" data-act="rtCloudSave">☁️ Simpan hari ini sekarang</button></div>
    <div id="rtCloudSt" class="ex-mut" style="margin-top:6px"></div><div id="rtHistRes"></div></details>
  <div id="rtDyn"></div>`;
}
function tbl(head,rows,empty){
  return rows.length?`<div class="ex-wrap"><table class="ex-tbl"><thead><tr>${head.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`
    :`<div class="ex-mut">${empty}</div>`;
}
// tabel yang bisa di-sort: cols=[{h,k(row)->nilai sort,s:1 bila teks,r(row)->html}]; status sort disimpan per id (tahan re-render & refresh halaman)
function stbl(id,cols,rows,empty,o){
  o=o||{}; const c=RT.sort[id]; let data=rows;
  if(c&&cols[c.i]&&cols[c.i].k){ const k=cols[c.i].k;
    data=rows.slice().sort((a,b)=>{ const x=k(a),y=k(b); const r=(typeof x==="string"||typeof y==="string")?String(x==null?"":x).localeCompare(String(y==null?"":y)):((x==null||isNaN(x)?-1e18:x)-(y==null||isNaN(y)?-1e18:y)); return r*c.d; }); }
  if(o.max) data=data.slice(0,o.max);
  RT.colReg[id]=cols.map(h=>h.h); RT.tblData[id]={cols,rows:data.slice(0,5000)};
  const hid=RT.hide[id]||[], vis=cols.map((h,i)=>({h,i})).filter(x=>x.i===0||hid.indexOf(x.h.h)<0);   // kolom pertama selalu tampil
  const head=vis.map(({h,i})=>{ const on=c&&c.i===i;
    return `<th${h.k?` class="rt-th" data-rt-sort="${id}|${i}"${h.s?"":" data-rt-num=\"1\""} title="Klik untuk urutkan"`:""}>${h.h}${on?(c.d<0?" ▼":" ▲"):""}</th>`; }).join("");
  const body=data.map(r=>`<tr class="${o.cls?o.cls(r):""}">${vis.map(({h})=>`<td>${h.r(r)}</td>`).join("")}</tr>`).join("");
  return data.length?`<div class="ex-wrap" data-rt-w="${id}"><table class="ex-tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`:`<div class="ex-mut">${empty}</div>`;
}
function sortClick(th){
  const p=th.getAttribute("data-rt-sort").split("|"), id=p[0], idx=+p[1], first=th.hasAttribute("data-rt-num")?-1:1, c=RT.sort[id];
  if(!c||c.i!==idx) RT.sort[id]={i:idx,d:first}; else if(c.d===first) RT.sort[id]={i:idx,d:-first}; else delete RT.sort[id];
  SV("rt_sort",RT.sort); dyn();
}
const tkc=tk=>`<b class="rt-tk" data-rt-full="${E(tk)}" title="Klik: buka Detail Emiten (analisa lengkap)">${E(tk)}</b> <span class="rt-tk" data-rt-tk="${E(tk)}" title="Detail running trade: price ladder, broker, aliran per menit">🔎</span>${badges(tk)}`;
const tierTxt=t=>t>=3?"🐘🐘🐘 MEGA":t===2?"🐘🐘 JUMBO":t===1?"🐘 BESAR":"";
const tcls=t=>t?"rt-l"+t:"";
const sgn=n=>`<span class="${n>=0?"ex-up":"ex-dn"}">${n>=0?"+":"−"}${fpx(Math.abs(n))}</span>`;
const bar=p=>`<div class="ex-bar" style="width:${Math.max(0,Math.min(100,Math.round(p)))}%"></div>`;
const hhmm=ts=>new Date(ts).toLocaleTimeString("id-ID");
const trCols=[
  {h:"Waktu",k:x=>x.ts,r:x=>hhmm(x.ts)},
  {h:"Ticker",s:1,k:x=>x.tk,r:x=>tkc(x.tk)},
  {h:"Harga",k:x=>x.px,r:x=>fpx(x.px)},
  {h:"Lot",k:x=>x.lot,r:x=>fpx(x.lot)},
  {h:"Nilai",k:x=>x.px*x.lot,r:x=>fv(x.px*x.lot*100)},
  {h:"Sisi",s:1,k:x=>x.side,r:x=>`<span class="${x.side==="B"?"ex-up":"ex-dn"}">${x.side==="B"?"HAKA":"HAKI"}${x.est?" ~":""}</span>`},
  {h:"Beli → Jual",s:1,k:x=>x.buyer||"",r:x=>`${E(x.buyer||"-")} → ${E(x.seller||"-")}`},
  {h:"Level",k:x=>x.tier,r:x=>tierTxt(x.tier)},
  {h:"Sumber",s:1,k:x=>x.src,r:x=>x.src==="w"?"WS":"REST"}];

/* ---------- panel detail satu saham: price ladder, aliran per menit, broker, audit sumber ---------- */
function levelsOf(s0,last){     // POC, value area 70%, level aktivitas beli/jual, penyerapan; s0 = [{px,bl,sl,tot,net}]
  if(s0.length<3) return null; const s=s0.slice().sort((a,b)=>a.px-b.px), tot=s.reduce((t,l)=>t+l.tot,0); if(!tot) return null;
  let pi=0; s.forEach((l,i)=>{ if(l.tot>s[pi].tot) pi=i; });
  let lo=pi,hi=pi,acc=s[pi].tot;
  while(acc<tot*0.7&&(lo>0||hi<s.length-1)){ const dn=lo>0?s[lo-1].tot:-1, up=hi<s.length-1?s[hi+1].tot:-1; if(up>=dn){ hi++; acc+=s[hi].tot; } else { lo--; acc+=s[lo].tot; } }
  const mean=tot/s.length, act=l=>l.tot>=mean*0.5, big=l=>l.tot>=mean*1.5, imb=l=>Math.abs(l.net)/l.tot;   // aktivitas berarti >= 0,5x rata-rata level; ketimpangan beli/jual >= 40%; penyerapan butuh >= 1,5x rata-rata
  return {poc:s[pi].px,val:s[lo].px,vah:s[hi].px,
    sup:s.filter(l=>l.px<last&&l.net>0&&act(l)&&imb(l)>=.4).sort((a,b)=>b.net-a.net).slice(0,2), res:s.filter(l=>l.px>last&&l.net<0&&act(l)&&imb(l)>=.4).sort((a,b)=>a.net-b.net).slice(0,2),
    absS:s.filter(l=>l.sl>=l.bl*1.5&&big(l)&&last>=l.px).sort((a,b)=>b.sl-a.sl).slice(0,2), absB:s.filter(l=>l.bl>=l.sl*1.5&&big(l)&&last<=l.px).sort((a,b)=>b.bl-a.bl).slice(0,2)};
}
function bdHtml(tk){
  if(!CFG.bday) return "";
  const e=RT.bday.get(tk);
  if(!e) return `<h3 style="margin-top:12px">Broker Summary harian (Stockbit)</h3><div class="ex-mut">Sedang diambil…</div>`;
  if(!e.ok) return `<h3 style="margin-top:12px">Broker Summary harian (Stockbit)</h3><div class="ex-mut">Tidak tersedia: ${E(e.err||"-")}</div>`;
  const nm=(l,o)=>{ const m=new Map(o.map(r=>[r.broker_code,r.value_idr])); return l.map(r=>Object.assign({},r,{net:r.value_idr-(m.get(r.broker_code)||0),hasO:m.has(r.broker_code)})); };
  const cols=[{h:"Broker",s:1,k:r=>r.broker_code,r:r=>`<b>${E(r.broker_code)}</b>`},{h:"Tipe",s:1,k:r=>r.investor_type||"",r:r=>E(r.investor_type||"-")},{h:"Lot",k:r=>r.lot||0,r:r=>r.lot?fpx(r.lot):"-"},{h:"Nilai",k:r=>r.value_idr,r:r=>fv(r.value_idr)},
    {h:"Net vs sisi lain",k:r=>r.net,r:r=>r.hasO?`<span class="${r.net>=0?"ex-up":"ex-dn"}">${fv(r.net)}</span>`:`<span class="ex-mut" title="Broker ini tidak masuk top 5 sisi lawan, jadi net sebenarnya sedikit lebih kecil">≥ ${fv(r.net)}</span>`}];
  const fn=bdForeignNet(tk);
  return `<h3 style="margin-top:12px">Broker Summary harian — ${E(e.day)} (top 5 per sisi, kumulatif hari itu; diambil ${new Date(e.at).toLocaleTimeString("id-ID")})</h3>
    <div class="ex-chips"><span class="ex-chip" title="Selisih beli−jual broker asing yang masuk top 5 kedua sisi (perkiraan)">Asing di top 5: net <span class="${fn>=0?"ex-up":"ex-dn"}">${fv(fn)}</span></span></div>
    <div style="display:flex;gap:12px;flex-wrap:wrap"><div style="flex:1;min-width:300px"><b class="ex-up">Top 5 Buy</b>${stbl("rtbdb",cols,nm(e.buy,e.sell),"-")}</div><div style="flex:1;min-width:300px"><b class="ex-dn">Top 5 Sell</b>${stbl("rtbds",cols,nm(e.sell,e.buy),"-")}</div></div>
    <div class="ex-mut" style="margin-top:4px">Data harian dari Broker Summary Stockbit (endpoint di Pengaturan), bukan per transaksi/jendela. Dipakai sebagai pengganti ketika running trade tidak membawa kode broker.</div>`;
}
function detail(tk){
  const win=CFG.accWin*60000, now=Date.now(), from=now-win, tr=RT.trades.filter(x=>x.tk===tk&&x.ts>=from&&!(CFG.minLot&&x.lot<CFG.minLot));
  const head=`<div class="ex-card" id="rtDetail"><h3>🔎 Detail ${tkc(tk)} — ${CFG.accWin} menit terakhir <button class="ex-btn" data-rt-close="1" style="float:right">✕ Tutup</button></h3>`;
  if(!tr.length) return head+`<div class="ex-mut">Belum ada transaksi ${E(tk)} dalam jendela ini${CFG.minLot?` dengan lot ≥ ${fpx(CFG.minLot)} (filter Min lot per transaksi aktif)`:""} (hanya transaksi yang tertangkap sejak Mulai). Cek ejaan ticker atau aktifkan feed seluruh pasar.</div></div>`;
  let bv=0,sv=0,bl=0,sl=0,pl=0,nw=0,nr=0,vw=0,vr=0,nbig=0,mx=0;
  const lad=new Map(), mins=new Map(), brk=new Map(), nMin=Math.max(5,Math.min(30,CFG.accWin));
  tr.forEach(x=>{
    const v=x.px*x.lot*100, B=x.side==="B"; pl+=x.px*x.lot;
    if(B){ bv+=v; bl+=x.lot; } else { sv+=v; sl+=x.lot; }
    if(x.src==="w"){ nw++; vw+=v; } else { nr++; vr+=v; }
    if(lotTier(x)>0) nbig++; if(x.lot>mx) mx=x.lot;
    const l=lad.get(x.px)||{px:x.px,bl:0,sl:0}; if(B) l.bl+=x.lot; else l.sl+=x.lot; lad.set(x.px,l);
    const mi=Math.floor((now-x.ts)/60000); mins.set(mi,(mins.get(mi)||0)+(B?v:-v));
    if(x.buyer){ const b=brk.get(x.buyer)||{br:x.buyer,buy:0,sell:0}; b.buy+=v; brk.set(x.buyer,b); }
    if(x.seller){ const b=brk.get(x.seller)||{br:x.seller,buy:0,sell:0}; b.sell+=v; brk.set(x.seller,b); }
  });
  const cu=RT.cum.get(tk), last=RT.last[tk], vwap=(bl+sl)?pl/(bl+sl):0, ratio=(bv+sv)?bv/(bv+sv):0;
  const w=300/nMin, mxA=Math.max(1,...Array.from(mins.values()).map(Math.abs));
  let bars=""; for(let i=0;i<nMin;i++){ const v=mins.get(i)||0, h=Math.abs(v)/mxA*28;
    bars+=`<rect x="${((nMin-1-i)*w+1).toFixed(1)}" y="${(v>=0?30-h:30).toFixed(1)}" width="${(w-2).toFixed(1)}" height="${(v?Math.max(h,1):0).toFixed(1)}" fill="${v>=0?"#22c55e":"#ef4444"}"><title>${i} mnt lalu: ${fv(v)}</title></rect>`; }
  const svg=`<svg viewBox="0 0 300 60" style="width:100%;max-width:520px;height:70px"><line x1="0" y1="30" x2="300" y2="30" stroke="currentColor" stroke-opacity=".3"/>${bars}</svg>`;
  const ladAll=Array.from(lad.values()).map(l=>Object.assign(l,{tot:l.bl+l.sl,net:l.bl-l.sl}));
  const top=ladAll.slice().sort((a,b)=>b.tot-a.tot).slice(0,20), mxT=Math.max(...top.map(l=>l.tot)), rows=top.sort((a,b)=>b.px-a.px);
  const lv=levelsOf(ladAll,last), tg=new Map(), tag=(p,t)=>tg.set(p,(tg.get(p)||[]).concat(t));
  if(lv){ tag(lv.poc,"POC"); if(lv.vah!==lv.poc) tag(lv.vah,"VAH"); if(lv.val!==lv.poc) tag(lv.val,"VAL"); lv.sup.forEach(l=>tag(l.px,"S")); lv.res.forEach(l=>tag(l.px,"R")); lv.absS.forEach(l=>tag(l.px,"🧱 serap jual")); lv.absB.forEach(l=>tag(l.px,"🧱 serap beli")); }
  const lvl=lv?`<div class="ex-chips" style="margin-top:8px"><span class="ex-chip" title="Point of Control: harga dengan total lot terbesar">POC ${fpx(lv.poc)}</span><span class="ex-chip" title="Value area: rentang harga yang memuat ± 70% volume">Area nilai ${fpx(lv.val)}–${fpx(lv.vah)}</span>
    ${lv.sup.map(l=>`<span class="ex-chip ex-up" title="Net beli besar di bawah harga sekarang">Support ${fpx(l.px)} (net ${fpx(l.net)} lot)</span>`).join("")}${lv.res.map(l=>`<span class="ex-chip ex-dn" title="Net jual besar di atas harga sekarang">Resisten ${fpx(l.px)} (net ${fpx(l.net)} lot)</span>`).join("")}
    ${lv.absS.map(l=>`<span class="ex-chip" title="HAKI besar di level ini tetapi harga bertahan di atasnya">🧱 Penyerapan jual ${fpx(l.px)}</span>`).join("")}${lv.absB.map(l=>`<span class="ex-chip" title="HAKA besar di level ini tetapi harga tidak naik melewatinya">🧱 Penyerapan beli ${fpx(l.px)}</span>`).join("")}</div>
    <div class="ex-mut" style="margin:4px 0">Level dihitung dari transaksi yang tertangkap dalam ${CFG.accWin} menit: aktivitas harga, bukan analisa teknikal penuh. Support/resisten di sini hanya berarti banyak net beli/jual terjadi di harga itu.</div>`:"";
  const lc=[{h:"Harga",k:l=>l.px,r:l=>fpx(l.px)+(l.px===last?" ◀":"")},{h:"Lot beli (HAKA)",k:l=>l.bl,r:l=>`<span class="ex-up">${fpx(l.bl)}</span>`},{h:"Lot jual (HAKI)",k:l=>l.sl,r:l=>`<span class="ex-dn">${fpx(l.sl)}</span>`},
    {h:"Net lot",k:l=>l.net,r:l=>sgn(l.net)},{h:"Total lot",k:l=>l.tot,r:l=>fpx(l.tot)},{h:"Level",s:1,k:l=>(tg.get(l.px)||[]).join(","),r:l=>(tg.get(l.px)||[]).join(" · ")||"-"},{h:"Porsi",r:l=>bar(l.tot/mxT*100)}];
  const bk=Array.from(brk.values()).map(b=>Object.assign(b,{net:b.buy-b.sell})).sort((a,b)=>Math.abs(b.net)-Math.abs(a.net)).slice(0,10);
  const bc=[{h:"Broker",s:1,k:b=>b.br,r:b=>`<b>${E(b.br)}</b>`},{h:"Beli",k:b=>b.buy,r:b=>fv(b.buy)},{h:"Jual",k:b=>b.sell,r:b=>fv(b.sell)},{h:"Net",k:b=>b.net,r:b=>`<span class="${b.net>=0?"ex-up":"ex-dn"}">${fv(b.net)}</span>`}];
  return head+`<div class="ex-chips">
    ${CFG.minLot?`<span class="ex-chip" title="Pengaturan Min lot per transaksi">Filter lot ≥ ${fpx(CFG.minLot)} aktif</span>`:""}<span class="ex-chip">Harga ${fpx(last)}</span><span class="ex-chip">VWAP ${fpx(Math.round(vwap))}</span>
    <span class="ex-chip">HAKA <span class="ex-up">${fv(bv)}</span> · ${fpx(bl)} lot</span><span class="ex-chip">HAKI <span class="ex-dn">${fv(sv)}</span> · ${fpx(sl)} lot</span>
    <span class="ex-chip">Rasio beli ${Math.round(ratio*100)}%</span>${cu&&cu.bv+cu.sv?`<span class="ex-chip">Sejak Mulai: Buy ${(cu.bv/(cu.bv+cu.sv)*100).toFixed(1)}% / Sell ${(cu.sv/(cu.bv+cu.sv)*100).toFixed(1)}% (${fv(cu.bv)} / ${fv(cu.sv)})</span>`:""}<span class="ex-chip">Net ${sgn(bl-sl)} lot</span>
    <span class="ex-chip">Lot besar: ${nbig} transaksi · terbesar ${fpx(mx)} lot</span>
    <span class="ex-chip" title="Cocokkan dengan Running Trade Stockbit: kalau angka beda jauh, lihat apakah salah satu sumber kosong">Sumber: WS ${nw} trx (${fv(vw)}) · REST ${nr} trx (${fv(vr)})</span></div>
  <div class="ex-mut" style="margin:8px 0 2px">Net beli/jual per menit (kanan = terbaru; hijau = net HAKA, merah = net HAKI)</div>${svg}
  ${lvl}<h3 style="margin-top:12px">Price ladder (20 harga teratas menurut total lot; baris kuning = harga paling ramai)</h3>${stbl("rtld",lc,rows,"-",{cls:l=>l.tot===mxT?"rt-l1":""})}
  <h3 style="margin-top:12px">Broker (net terbesar, dari running trade)</h3>${stbl("rtbk",bc,bk,"Running trade tidak membawa kode broker — lihat Broker Summary harian di bawah.")}${bdHtml(tk)}</div>`;
}

/* ---------- rincian preset screener satu saham (popup) ---------- */
function scDetailHtml(tk){
  const defs=(typeof SMART_PICK_DEFS!=="undefined")?SMART_PICK_DEFS:[]; let r=null; try{ r=(typeof enriched==="function")?enriched().find(x=>x.ticker===tk):null; }catch(e){}
  const pass=[], fail=[];
  defs.forEach(d=>{ let x=null; try{ x=r?d.detect(r):null; }catch(e){} if(x&&x.match) pass.push({d,x}); else fail.push(d); });
  const st=X.stk(tk)||{}, own=X.ownTickers().has(tk), bull=typeof trendTone==="function"&&trendTone(st.trendHarga)==="up", kyk=st.keyakinanTone==="up";
  const n=pass.length+(bull?1:0)+(kyk?1:0)+(own?1:0), box="border:1px solid rgba(128,128,128,.35);border-radius:8px;padding:8px 10px;margin:6px 0";
  const sp=pass.map(({d,x})=>`<div style="${box}"><div><b>${d.icon||"✨"} ${E(d.title)}</b>${typeof x.score==="number"?` <span class="ex-chip" style="font-size:11px;padding:1px 6px">Skor ${Math.round(x.score)}</span>`:""}</div>
      ${d.shortDesc?`<div class="ex-mut" style="margin-top:3px">${d.shortDesc}</div>`:""}
      <details style="margin-top:4px"><summary style="cursor:pointer" class="ex-mut">Definisi, filter, dan skor</summary><div style="font-size:12px;line-height:1.5;margin-top:4px">${d.definisi?`<p><b>Definisi.</b> ${d.definisi}</p>`:""}${d.filter?`<p><b>Filter.</b> ${d.filter}</p>`:""}${d.scoring?`<p><b>Skor.</b> ${d.scoring}</p>`:""}${d.sinyalKuat?`<p><b>Sinyal kuat.</b> ${d.sinyalKuat}</p>`:""}</div></details></div>`).join("");
  const oth=[bull?`<div style="${box}"><b>📈 Trend Bullish</b><div class="ex-mut">Trend harga di Screener: ${E(String(st.trendHarga||"-"))}</div></div>`:"",kyk?`<div style="${box}"><b>✅ Keyakinan Tinggi</b><div class="ex-mut">Keyakinan di Screener: ${E(String(st.keyakinan||"tinggi"))}</div></div>`:"",own?`<div style="${box}"><b>⭐ Watchlist/Posisi</b><div class="ex-mut">Saham ini ada di Watchlist atau Posisi Anda.</div></div>`:""].join("");
  return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3 style="margin:0">🧬 Preset screener — ${E(tk)}</h3><button class="ex-btn" data-rt-scx="1">✕ Tutup</button></div>
    <div class="ex-mut" style="margin:4px 0 6px">Lolos <b>${n}</b> dari <b>${defs.length+3}</b> preset (Smart Pick ${pass.length}/${defs.length}, ditambah Trend Bullish, Keyakinan Tinggi, dan Watchlist/Posisi)${r?"":" — data saham ini belum termuat di Screener, jadi Smart Pick tidak bisa dihitung"}.</div>
    ${sp||oth?sp+oth:`<div class="ex-mut">Tidak lolos preset apa pun.</div>`}
    ${fail.length?`<details style="margin-top:8px"><summary style="cursor:pointer" class="ex-mut">Belum lolos (${fail.length} Smart Pick)</summary><div style="margin-top:4px">${fail.map(d=>`<span class="ex-chip" style="font-size:11px;padding:1px 6px;margin:1px;display:inline-block;opacity:.75" title="${E(d.shortDesc||"")}">${d.icon||"✨"} ${E(d.title)}</span>`).join("")}</div></details>`:""}
    <div style="margin-top:10px"><button class="ex-btn pri" data-rt-full="${E(tk)}">Buka Detail Emiten</button></div>`;
}
function scClose(){ const o=document.getElementById("rtScPop"); if(o&&typeof o.remove==="function") o.remove(); }
function scPopup(tk){
  scClose(); const ov=document.createElement("div"); ov.id="rtScPop";
  ov.style.cssText="position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,.5);display:flex;align-items:flex-start;justify-content:center;padding:6vh 12px;overflow:auto";
  const card=document.createElement("div"); card.className="ex-card"; card.style.cssText="max-width:720px;width:100%;box-sizing:border-box;padding:14px 16px;border-radius:12px;background:"+(RT.bg||"Canvas")+";box-shadow:0 10px 40px rgba(0,0,0,.35)";
  card.innerHTML=scDetailHtml(tk); ov.appendChild(card); document.body.appendChild(ov);
}
// warna latar kartu -> variabel CSS untuk kolom Ticker yang menempel (supaya tidak tembus pandang)
function cardBg(el){
  try{ if(typeof getComputedStyle!=="function") return; let n=el.querySelector(".ex-card")||el;
    while(n&&n.nodeType===1){ const c=getComputedStyle(n).backgroundColor; if(c&&c!=="transparent"&&!/rgba?\(0,\s*0,\s*0,\s*0\)/.test(c)){ el.style.setProperty("--rt-bg",c); RT.bg=c; return; } n=n.parentElement; } }catch(e){}
}
// scrollbar horizontal tambahan di atas tabel yang lebih lebar dari layarnya (sinkron dengan scrollbar bawah)
function syncBars(el){
  el.querySelectorAll(".ex-wrap").forEach(w=>{
    if(!(w.scrollWidth>w.clientWidth+2)||!w.parentNode) return;
    const bar=document.createElement("div"), inn=document.createElement("div");
    bar.className="rt-xs"; inn.style.width=w.scrollWidth+"px"; inn.style.height="1px"; bar.appendChild(inn); w.parentNode.insertBefore(bar,w);
    bar.scrollLeft=w.scrollLeft;
    bar.addEventListener("scroll",()=>{ if(w.scrollLeft!==bar.scrollLeft) w.scrollLeft=bar.scrollLeft; });
    w.addEventListener("scroll",()=>{ if(bar.scrollLeft!==w.scrollLeft) bar.scrollLeft=w.scrollLeft; });
  });
}
function dyn(){
  const el=document.getElementById("rtDyn"); if(!el) return;
  const dOld=el.querySelector("details"); if(dOld) RT.diagOpen=dOld.open;
  const sc={}; Array.from(el.querySelectorAll(".ex-wrap")).forEach(w=>{ const k=w.getAttribute("data-rt-w"); if(k) sc[k]={x:w.scrollLeft,y:w.scrollTop}; });
  const now=Date.now(), s=RT.st;
  const fqBase=a=>!RT.q||RT.q.split(/[\s,]+/).some(z=>z&&a.tk.startsWith(z));
  const fq=a=>fqBase(a)&&(!RT.sec||secOf(a.tk)===RT.sec);
  const H=hakaList().filter(fq), A=accList().filter(fq), B=brokerList().filter(fq), F=foreignList().filter(fq), M=marketList().filter(fq);
  const tot=RT.trades.reduce((t,x)=>{ const v=x.px*x.lot*100; return x.side==="B"?[t[0]+v,t[1]]:[t[0],t[1]+v]; },[0,0]);
  const chg=a=>`<span class="${a.chg>=0?"ex-up":"ex-dn"}">${pctS(a.chg)}</span>`;
  const px=a=>`${fpx(a.last)} ${chg(a)}`;
  // keterlambatan & cakupan data
  let t0=Infinity,tl=0; for(const x of RT.trades){ if(x.ts<t0) t0=x.ts; if(x.ts>tl) tl=x.ts; }
  const lag=tl?Math.round((now-tl)/1000):null, openMkt=s.open!==false;
  const tk0=tokenInfo(), tokTxt=tk0?` · <span class="${tk0.kind==="ok"?"":"ex-dn"}">${tk0.txt}</span>`:"";
  const tokWarn=tk0&&tk0.kind!=="ok"&&CFG.rest?`<div class="ex-warn" style="margin-top:6px">${tk0.kind==="none"?"Token Stockbit belum ada. Buka stockbit.com dalam keadaan login (extension akan menyinkron token otomatis) atau isi manual di Pengaturan.":tk0.kind==="exp"?"Token Stockbit kedaluwarsa. Buka stockbit.com dan login ulang agar extension menyinkron token baru.":"Token Stockbit habis sekitar "+tk0.m+" menit lagi; aplikasi mencoba sinkron otomatis."} <button class="ex-btn" data-act="rtTokSync">🔄 Sinkron token sekarang</button></div>`:"";
  const lagTxt=lag===null?"":` · ⏱ transaksi terakhir ${lag<90?lag+" dtk":Math.round(lag/60)+" mnt"} lalu`;
  const lagWarn=RT.on&&openMkt&&lag!==null&&lag>20?`<div class="ex-warn" style="margin-top:6px">Tidak ada transaksi baru ${lag} detik. Kalau Stockbit masih bergerak: cek koneksi ekstensi/token, atau naikkan jumlah ticker/aktifkan feed seluruh pasar.</div>`:"";
  const spanMin=t0===Infinity?0:(now-t0)/60000;
  const covWarn=RT.on&&RT.trades.length&&spanMin<CFG.accWin*.95?`<div class="ex-warn" style="margin-top:6px">Data baru terkumpul ${spanMin.toFixed(1)} menit, jadi jendela ${spanMin<CFG.hakaWin*.95?"HAKA "+CFG.hakaWin+" dan ":""}akumulasi ${CFG.accWin} menit belum penuh. Angka akan lebih kecil dari Stockbit (yang menghitung seluruh jendela) sampai penuh.</div>`:"";
  const feedWarn=CFG.rest&&!CFG.feed&&s.watch?`<div class="ex-warn" style="margin-top:6px">REST hanya memantau ${s.watch} ticker bergiliran, saham lain tertinggal. Aktifkan "Sertakan feed seluruh pasar tiap tarikan".</div>`:"";
  const warn=RT.on&&now-s.startAt>45000&&!s.trades?`<div class="ex-warn" style="margin-top:8px">Belum ada transaksi terbaca setelah 45 detik. Lihat bagian Diagnostik di bawah.</div>`:"";
  const fEmpty=s.trades&&!s.brk?"Sumber data ini tidak membawa kode broker, jadi aliran asing tidak bisa dihitung.":"Belum ada saham dengan net asing di atas batas.";
  const bEmpty=s.trades&&!s.brk?"Sumber data ini tidak membawa kode broker pembeli/penjual, jadi bandar tidak bisa dilacak dari running trade. Cek Diagnostik, atau pakai menu Bandarmologi untuk data broker harian."
    :"Belum ada broker yang memenuhi syarat (net beli ≥ batas dan porsi beli ≥ 25% dari total beli saham itu).";
  // kolom
  const hC=[{h:"Ticker",s:1,k:a=>a.tk,r:a=>tkc(a.tk)},{h:"Harga",k:a=>a.last,r:px},{h:"HAKA",k:a=>a.bv,r:a=>`<span class="ex-up">${fv(a.bv)}</span>`},{h:"HAKI",k:a=>a.sv,r:a=>`<span class="ex-dn">${fv(a.sv)}</span>`},
    {h:"Rasio HAKA",k:a=>a.ratio,r:a=>Math.round(a.ratio*100)+"%"},{h:"Lot HAKA",k:a=>a.bl,r:a=>fpx(a.bl)},{h:"HAKA besar",k:a=>a.big,r:a=>a.big},
    {h:"Lot terbesar",k:a=>a.mx,r:a=>`${fpx(a.mx)} <span class="${a.mxs==="B"?"ex-up":"ex-dn"}">${a.mxs==="B"?"▲":"▼"}</span>`},{h:"HAKA 60 dtk",k:a=>a.b60,r:a=>`<span class="ex-up">${fv(a.b60)}</span>`},{h:"Rasio",r:a=>bar(a.ratio*100)}];
  const aC=[{h:"Ticker",s:1,k:a=>a.tk,r:a=>tkc(a.tk)},{h:"Harga",k:a=>a.last,r:px},{h:"Net beli",k:a=>a.net,r:a=>`<span class="ex-up">${fv(a.net)}</span>`},{h:"Net lot",k:a=>a.netL,r:a=>sgn(a.netL)},
    {h:"Rasio beli",k:a=>a.ratio,r:a=>Math.round(a.ratio*100)+"%"},{h:"Beli besar",k:a=>a.big,r:a=>a.big},{h:"Net lot besar",k:a=>a.bigNet,r:a=>sgn(a.bigNet)},{h:"Rentang harga",k:a=>a.rng,r:a=>(a.rng*100).toFixed(1)+"%"},
    {h:"Broker pembeli dominan",s:1,k:a=>a.topBrk||"",r:a=>a.topBrk?E(a.topBrk)+" ("+Math.round(a.topShare*100)+"%)":"-"},{h:"Skor",k:a=>a.score,r:a=>`<b>${a.score}</b>${bar(a.score)}`}];
  const bC=[{h:"Ticker",s:1,k:a=>a.tk,r:a=>tkc(a.tk)},{h:"Broker",s:1,k:a=>a.br,r:a=>`<b>${E(a.br)}</b>${a.f?" 🌍":""}${whale(a)?" 🐋":""}`},{h:"Net beli",k:a=>a.net,r:a=>`<span class="ex-up">${fv(a.net)}</span>`},{h:"Net lot",k:a=>a.netL,r:a=>sgn(a.netL)},
    {h:"Beli",k:a=>a.buy,r:a=>fv(a.buy)},{h:"Jual",k:a=>a.sell,r:a=>fv(a.sell)},{h:"Porsi beli",k:a=>a.share,r:a=>Math.round(a.share*100)+"%"},{h:"Porsi",r:a=>bar(a.share*100)}];
  const fC=[{h:"Ticker",s:1,k:a=>a.tk,r:a=>tkc(a.tk)},{h:"Net asing",k:a=>a.net,r:a=>`<span class="${a.net>=0?"ex-up":"ex-dn"}">${fv(a.net)}</span>`},{h:"Net lot",k:a=>a.netL,r:a=>sgn(a.netL)},
    {h:"Beli asing",k:a=>a.fb,r:a=>`<span class="ex-up">${fv(a.fb)}</span>`},{h:"Jual asing",k:a=>a.fs,r:a=>`<span class="ex-dn">${fv(a.fs)}</span>`},{h:"Porsi asing",k:a=>a.share,r:a=>Math.round(a.share*100)+"%"}];
  const mC=[{h:"Ticker",s:1,k:a=>a.tk,r:a=>tkc(a.tk)},{h:"Harga",k:a=>a.last,r:a=>fpx(a.last)},{h:"Δ%",k:a=>a.chg,r:chg},{h:"Nilai total",k:a=>a.vt,r:a=>fv(a.vt)},{h:"Net nilai",k:a=>a.net,r:a=>`<span class="${a.net>=0?"ex-up":"ex-dn"}">${fv(a.net)}</span>`},
    {h:"Rasio beli",k:a=>a.ratio,r:a=>Math.round(a.ratio*100)+"%"},{h:"Lot beli",k:a=>a.bl,r:a=>fpx(a.bl)},{h:"Lot jual",k:a=>a.sl,r:a=>fpx(a.sl)},{h:"Net lot",k:a=>a.netL,r:a=>sgn(a.netL)},
    {h:"Lot besar (n)",k:a=>a.big,r:a=>a.big||"-"},{h:"Net lot besar",k:a=>a.bigNet,r:a=>a.bigNet?sgn(a.bigNet):"-"},{h:"Lot terbesar",k:a=>a.mx,r:a=>`${fpx(a.mx)} <span class="${a.mxs==="B"?"ex-up":"ex-dn"}">${a.mxs==="B"?"▲":"▼"}</span>`},
    {h:"Trx/mnt",k:a=>a.rate,r:a=>a.rate.toFixed(1)},{h:"Umur (dtk)",k:a=>a.age,r:a=>a.age}];
  const pc1=n=>n.toFixed(1)+"%";
  const scTot=(typeof SMART_PICK_DEFS!=="undefined"?SMART_PICK_DEFS.length:0)+3;      // Smart Pick + Trend Bullish + Keyakinan Tinggi + Watchlist/Posisi
  const scCell=a=>a.sc.length?`<span class="ex-chip rt-tk" data-rt-scd="${E(a.tk)}" style="font-size:12px;padding:2px 9px;display:inline-block;white-space:nowrap" title="${E(a.sc.map(x=>x.i+" "+x.t).join("\n"))}&#10;(klik untuk rincian)">🧬 <b>${a.sc.length}</b>/${scTot}</span>`:"-";
  const brkCell=(l,tot,day)=>l.length?`<div style="font-size:12px;line-height:1.35;min-width:130px">${l.map(x=>`<div title="${E(x[0])}: ${fv(x[1])}${day?" (harian, Broker Summary Stockbit)":` (${tot?Math.round(x[1]/tot*100):0}% dari total ${fv(tot)})`}"><b>${E(x[0])}</b> ${fv(x[1])}</div>`).join("")}${day?`<div class="ex-mut" style="font-size:10px">harian</div>`:""}</div>`:"-";
  const stack=a=>`<div style="display:flex;height:10px;min-width:110px;border-radius:3px;overflow:hidden" title="Buy ${pc1(a.pb)} / Sell ${pc1(a.ps)}"><span style="width:${a.pb.toFixed(1)}%;background:#22c55e"></span><span style="flex:1;background:#ef4444"></span></div>`;
  const BS=bsRows(M,fq), bsB=BS.reduce((t,a)=>t+a.bv,0), bsS=BS.reduce((t,a)=>t+a.sv,0), bsT=bsB+bsS;
  const bsC=[{h:"Ticker",s:1,k:a=>a.tk,r:a=>tkc(a.tk)},{h:"Lolos preset",k:a=>a.sc.length,r:scCell},{h:"Harga",k:a=>a.last,r:a=>fpx(a.last)},{h:"Δ%",k:a=>a.chg,r:chg},
    {h:"Buy (HAKA)",k:a=>a.bv,r:a=>`<span class="ex-up">${fv(a.bv)}</span>`},{h:"Sell (HAKI)",k:a=>a.sv,r:a=>`<span class="ex-dn">${fv(a.sv)}</span>`},
    {h:"Net",k:a=>a.net,r:a=>`<span class="${a.net>=0?"ex-up":"ex-dn"}">${fv(a.net)}</span>`},
    {h:"% Buy",k:a=>a.pb,r:a=>`<span class="${a.pb>=50?"ex-up":"ex-dn"}">${pc1(a.pb)}</span>`},{h:"% Sell",k:a=>a.ps,r:a=>pc1(a.ps)},{h:"Komposisi",r:stack},{h:"Δ% Buy (2m vs 5m)",k:a=>a.ac?a.ac.d:null,r:a=>a.ac&&a.ac.d!=null?`<span class="${a.ac.d>=0?"ex-up":"ex-dn"}" title="%Buy 2 menit terakhir ${a.ac.pbR==null?"-":a.ac.pbR.toFixed(0)}% vs 5 menit sebelumnya ${a.ac.pbB==null?"-":a.ac.pbB.toFixed(0)}%">${a.ac.d>=0?"+":"−"}${Math.abs(a.ac.d).toFixed(0)} pp</span>`:"-"},
    {h:"Tape ×",k:a=>a.ac?a.ac.spike:null,r:a=>a.ac?`<span title="Kecepatan transaksi 2 menit terakhir dibanding rata-rata 5 menit sebelumnya">${a.ac.spike.toFixed(1)}×</span>`:"-"},
    {h:"Tren %Buy 10m",r:a=>a.ac?sparkSvg(a.ac.spark):"-"},
    {h:"Momentum",s:1,k:a=>a.ac&&a.ac.sig||"",r:a=>a.ac&&a.ac.sig==="U"?`<span class="ex-up" style="white-space:nowrap">🚀 Mulai diborong</span>`:a.ac&&a.ac.sig==="D"?`<span class="ex-dn" style="white-space:nowrap">🔻 Mulai dilepas</span>`:"-"},
    {h:"Net buy beruntun",k:a=>(RT.streak.get(a.tk)||{n:0}).n,r:a=>{ const t=RT.streak.get(a.tk); return t&&t.n?`<span class="ex-up" title="Net buy ${t.n} hari berturut-turut sejak ${E(t.from)} (total ${fv(t.sum)}) — dari riwayat Supabase + data live${t.ld&&!t.today?"; hari ini belum net buy, jadi dihitung sampai kemarin":""}">${t.n} hr${t.ld&&!t.today?"*":""}</span>`:"-"; }},
    {h:"Divergensi",s:1,k:a=>a.dv?a.dv.c:"",r:a=>a.dv?`<span title="${E(a.dv.d)}" style="white-space:nowrap">${a.dv.t}</span>`:"-"},
    {h:"Lot buy",k:a=>a.bl,r:a=>fpx(a.bl)},{h:"Lot sell",k:a=>a.sl,r:a=>fpx(a.sl)},{h:"Net lot",k:a=>a.netL,r:a=>sgn(a.netL)},{h:"% Lot buy",k:a=>a.pl,r:a=>pc1(a.pl)},
    {h:"Trx buy",k:a=>a.nb,r:a=>fpx(a.nb)},{h:"Trx sell",k:a=>a.ns,r:a=>fpx(a.ns)},
    {h:"Top 3 broker Buy",k:a=>a.tb.length?a.tb[0][1]:0,r:a=>brkCell(a.tb,a.bv,a.bdy)},{h:"Top 3 broker Sell",k:a=>a.ts.length?a.ts[0][1]:0,r:a=>brkCell(a.ts,a.sv,a.bdy)}];
  const SR=bsRows(marketList().filter(fqBase),fqBase,true), secM=new Map();
  SR.forEach(a=>{ const k=secOf(a.tk); let o=secM.get(k); if(!o){ o={k,n:0,bv:0,sv:0,up:0,dn:0,L:[]}; secM.set(k,o); } o.n++; o.bv+=a.bv; o.sv+=a.sv; if(a.net>0) o.up++; else if(a.net<0) o.dn++; o.L.push(a); });
  const SK=Array.from(secM.values()).map(o=>{ const tv=o.bv+o.sv, L=o.L.slice().sort((p,q)=>q.net-p.net);
    return Object.assign(o,{tv,net:o.bv-o.sv,pb:tv?o.bv/tv*100:0,ps:tv?o.sv/tv*100:0,tb:L.filter(x=>x.net>0).slice(0,3),ts:L.slice().reverse().filter(x=>x.net<0).slice(0,3)}); });
  const skList=l=>l.length?`<div style="font-size:12px;line-height:1.35;min-width:130px">${l.map(x=>`<div><b class="rt-tk" data-rt-full="${E(x.tk)}">${E(x.tk)}</b> ${fv(x.net)}</div>`).join("")}</div>`:"-";
  const skC=[{h:"Sektor",s:1,k:a=>a.k,r:a=>`<span class="rt-tk" data-rt-sec="${E(a.k)}" title="Klik: saring semua tabel ke sektor ini"><b>${E(a.k)}</b></span>`},{h:"Saham aktif",k:a=>a.n,r:a=>a.n},
    {h:"Buy (HAKA)",k:a=>a.bv,r:a=>`<span class="ex-up">${fv(a.bv)}</span>`},{h:"Sell (HAKI)",k:a=>a.sv,r:a=>`<span class="ex-dn">${fv(a.sv)}</span>`},
    {h:"Net",k:a=>a.net,r:a=>`<span class="${a.net>=0?"ex-up":"ex-dn"}">${fv(a.net)}</span>`},{h:"% Buy",k:a=>a.pb,r:a=>`<span class="${a.pb>=50?"ex-up":"ex-dn"}">${pc1(a.pb)}</span>`},{h:"Komposisi",r:stack},
    {h:"Saham net buy / sell",k:a=>a.up-a.dn,r:a=>`<span class="ex-up">${a.up}▲</span> / <span class="ex-dn">${a.dn}▼</span>`},{h:"Top net buy",k:a=>a.tb.length?a.tb[0].net:0,r:a=>skList(a.tb)},{h:"Top net sell",k:a=>a.ts.length?a.ts[0].net:0,r:a=>skList(a.ts)}];
  const heat=SK.slice().sort((p,q)=>q.net-p.net).map(o=>{ const al=Math.min(.55,.1+Math.abs(o.pb-50)/50*.8), bgc=o.pb>=50?`rgba(34,197,94,${al.toFixed(2)})`:`rgba(239,68,68,${al.toFixed(2)})`;
    return `<span class="ex-chip rt-tk" data-rt-sec="${E(o.k)}" style="background:${bgc};margin:2px;display:inline-block${RT.sec===o.k?";outline:2px solid currentColor":""}" title="${E(o.k)}: Buy ${fv(o.bv)} / Sell ${fv(o.sv)}">${E(o.k)} · ${Math.round(o.pb)}% · ${fv(o.net)}</span>`; }).join("");
  const noSec=SK.length===1&&SK[0].k==="(Tanpa sektor)";
  const secNote=RT.sec?`<div class="ex-mut" style="margin-top:6px">🏭 Semua tabel disaring ke sektor <b>${E(RT.sec)}</b> <button class="ex-btn" data-rt-sec="">✕ Hapus saringan</button></div>`:"";
  RT.bdWant=BS.slice().sort((p,q)=>q.tv-p.tv).slice(0,12).map(a=>a.tk);
  const bsHead=RT.mode==="cum"?`sejak Mulai${RT.cumDay?" · "+E(RT.cumDay):""}`:`${CFG.accWin} menit terakhir`;
  const RP=repeatList().filter(fq);
  const rpC=[{h:"Ticker",s:1,k:a=>a.tk,r:a=>tkc(a.tk)},{h:"Sisi",s:1,k:a=>a.side,r:a=>`<span class="${a.side==="B"?"ex-up":"ex-dn"}">${a.side==="B"?"HAKA":"HAKI"}</span>`},{h:"Lot / order",k:a=>a.lot,r:a=>fpx(a.lot)},
    {h:"Berulang (kali)",k:a=>a.n,r:a=>a.n},{h:"Total lot",k:a=>a.tl,r:a=>fpx(a.tl)},{h:"Total nilai",k:a=>a.v,r:a=>fv(a.v)},{h:"Broker",s:1,k:a=>a.br,r:a=>a.br?`<b>${E(a.br)}</b>`:"-"},
    {h:"Harga",k:a=>a.hi,r:a=>a.lo===a.hi?fpx(a.lo):fpx(a.lo)+"–"+fpx(a.hi)},{h:"Interval rata² (dtk)",k:a=>a.mean,r:a=>a.mean.toFixed(1)},
    {h:"Pola",s:1,k:a=>a.reg?"1":"0",r:a=>a.reg?`<span title="Jarak antar transaksi sangat teratur (CV ${a.cv.toFixed(2)}): ciri algo/iceberg">🤖 Teratur</span>`:`<span class="ex-mut" title="CV ${a.cv.toFixed(2)}">Acak</span>`},
    {h:"Terakhir (dtk)",k:a=>a.age,r:a=>a.age}];
  const CF=confList().filter(fq);
  const cfC=[{h:"Ticker",s:1,k:a=>a.tk,r:a=>tkc(a.tk)},{h:"Skor",k:a=>a.score,r:a=>`<b>${a.score}</b>${bar(a.score)}`},{h:"Sinyal",k:a=>a.n,r:a=>a.n+"/8"},
    {h:"Sinyal yang terpenuhi",s:1,k:a=>a.sg.map(x=>x.k).join(""),r:a=>`<div style="max-width:420px">${a.sg.map(x=>`<span class="ex-chip${x.k==="S"?" rt-tk":""}"${x.k==="S"?` data-rt-scd="${E(a.tk)}" title="Klik untuk rincian preset"`:""} style="font-size:11px;padding:1px 6px;margin:1px;display:inline-block;white-space:nowrap">${x.t}</span>`).join("")}</div>`},
    {h:"Penalti",s:1,k:a=>a.pen.length,r:a=>a.pen.length?`<span class="ex-dn">${a.pen.join(", ")}</span>`:"-"},
    {h:"Harga",k:a=>a.last,r:a=>fpx(a.last)},{h:"Δ%",k:a=>a.chg,r:chg},{h:"Net nilai",k:a=>a.net,r:a=>`<span class="${a.net>=0?"ex-up":"ex-dn"}">${fv(a.net)}</span>`},{h:"% Buy",k:a=>a.pb,r:a=>pc1(a.pb)}];
  const maxTier=a=>lotTier({tk:a.tk,px:a.last,lot:a.mx});
  // transaksi terbaru & lot besar
  const withTier=x=>Object.assign({},x,{tier:lotTier(x)});
  const tape=[]; for(let i=RT.trades.length-1;i>=0&&tape.length<60;i--){ const x=RT.trades[i]; if(!fq(x)||(CFG.minLot&&x.lot<CFG.minLot)) continue; const y=withTier(x); if(RT.bigOnly&&!y.tier) continue; tape.push(y); }
  const bigFrom=now-CFG.accWin*60000, bigs=[]; for(let i=RT.trades.length-1;i>=0&&bigs.length<150;i--){ const x=RT.trades[i]; if(x.ts<bigFrom) continue; if(!fq(x)||!pxOk(x.tk)||(CFG.minLot&&x.lot<CFG.minLot)) continue; const y=withTier(x); if(y.tier) bigs.push(y); }
  const cnt3=bigs.filter(x=>x.tier>=3).length, cnt2=bigs.filter(x=>x.tier===2).length;
  el.innerHTML=`<div class="ex-card"><div class="ex-mut">
    ${RT.on?"🟢 Merekam":"⚪ Berhenti"}${RT.frozen?" · ⏸ <b>Tampilan dibekukan</b> (data tetap direkam)":""}${s.open===false?` · 🔒 Pasar tutup (data terakhir ${E(s.dataDate||"-")})`:""}${lagTxt}${tokTxt} · WS: ${s.frames} frame (${s.parsed} terbaca, ${s.unparsed} tidak terbaca${s.quote?", "+s.quote+" mirip kuotasi ditolak":""}) · REST: ${s.rest} baris${CFG.rest?` (${CFG.feed?"seluruh pasar"+(s.watch?" + "+s.watch+" ticker bergiliran":""):s.watch?s.watch+" ticker bergiliran":"seluruh pasar"})`:""}${s.restAt?" · terakhir "+new Date(s.restAt).toLocaleTimeString("id-ID"):""}
    · ${s.trades} transaksi di memori (${s.trades?Math.round(s.brk/s.trades*100):0}% bertanda broker)${s.restored?` (${s.restored} dipulihkan)`:""}${s.est?` (${s.est} sisi ditebak ~)`:""}${s.dup?` · ${s.dup} duplikat WS/REST dibuang`:""} · Total HAKA <span class="ex-up">${fv(tot[0])}</span> / HAKI <span class="ex-dn">${fv(tot[1])}</span></div>
    ${s.symBad>s.symOk?`<div class="ex-warn" style="margin-top:6px">Filter symbols[] tampaknya diabaikan Stockbit (respons berisi saham lain), jadi pemantauan per ticker tidak efektif. Kosongkan Ticker otomatis/manual untuk memakai seluruh pasar, atau kirim contoh respons ke chat.</div>`:""}${s.restErr?`<div class="ex-warn" style="margin-top:6px">REST: ${E(s.restErr)}</div>`:""}${s.trades>=30&&!s.brk?`<div class="ex-warn" style="margin-top:6px">Running trade tidak membawa kode broker (0 dari ${s.trades} transaksi), jadi kolom Beli → Jual, tabel Bandar, dan Asing kosong. ${CFG.bday?(RT.bdErr?`Cadangan Broker Summary harian gagal: <b>${E(RT.bdErr)}</b> — cek Token dan Endpoint Broker Summary di Pengaturan. `:`Cadangan aktif: <b>Broker Summary harian Stockbit</b> dipakai untuk kolom Top 3 broker (bertanda "harian"), sinyal 🐋 dan 🌍 (${Array.from(RT.bday.values()).filter(e=>e.ok).length} saham terambil). `):"Cadangan Broker Summary harian dimatikan di pengaturan. "} Nama field baris REST: <b>${E(RT.restKeys.join(", ")||"-")}</b>. Kirim isi Diagnostik (📋 Salin diagnostik) ke chat bila field broker ada tetapi namanya belum dikenali.</div>`:""}${secNote}${tokWarn}${lagWarn}${covWarn}${feedWarn}${warn}</div>
  ${RT.sel?detail(RT.sel):""}
  <div class="ex-card"><h3>🎯 Konfluensi — saham dengan banyak sinyal sekaligus (${CFG.accWin} menit terakhir, ${CF.length} saham)</h3>
    ${stbl("rtcf",cfC,CF,"Belum ada saham dengan "+CFG.confMin+"+ sinyal. Turunkan \"Min jumlah sinyal konfluensi\" atau tunggu data terkumpul.",{max:30})}
    <div class="ex-mut" style="margin-top:6px">Skor 0–100 dari 8 sinyal: 🔥 HAKA (20), 🧲 Akumulasi (12–20), 🐘 Lot besar (15, net lot besar positif), 🧬 Screener (5–15, Smart Pick/Bullish/Keyakinan/Watchlist), 🐋 Broker dominan (10), 🚀 Momentum (10), 🌍 Asing net beli (5), 🕵 Akumulasi tersembunyi (5). Penalti: ⚠ Distribusi −20, 🔻 Mulai dilepas −20, net jual −10. Sinyal broker/asing butuh data yang membawa kode broker. Ini alat penyaring, bukan rekomendasi beli: cek chart dan Detail Emiten sebelum bertindak.</div></div>
  <div class="ex-card"><h3>🔥 Sedang di-HAKA (${CFG.hakaWin} menit terakhir)</h3>${stbl("rth",hC,H,"Belum ada saham yang memenuhi syarat HAKA.")}</div>
  <div class="ex-card"><h3>🧲 Terakumulasi (${CFG.accWin} menit terakhir)</h3>${stbl("rta",aC,A,"Belum ada saham yang memenuhi syarat akumulasi.")}</div>
  <div class="ex-card"><h3>⚖️ Akumulasi Buy vs Sell per emiten (${bsHead}, ${BS.length} saham)</h3>
    ${RT.mode==="cum"&&CFG.minLot>0?`<div class="ex-warn" style="margin:6px 0">Mode "Sejak Mulai" menghitung <b>semua lot</b>: filter Min lot per transaksi (${fpx(CFG.minLot)}) tidak berlaku di sini karena akumulasi harian disimpan mentah. Pilih "Jendela akumulasi" di kotak Buy/Sell bila ingin angka yang sudah tersaring.</div>`:""}
    <div class="ex-chips"><span class="ex-chip">Total Buy <span class="ex-up">${fv(bsB)}</span> (${bsT?(bsB/bsT*100).toFixed(1):"0.0"}%)</span><span class="ex-chip">Total Sell <span class="ex-dn">${fv(bsS)}</span> (${bsT?(bsS/bsT*100).toFixed(1):"0.0"}%)</span>${["H","D","P"].map(c=>{ const n=BS.filter(a=>a.dv&&a.dv.c===c).length, t=c==="H"?"🕵 Akumulasi tersembunyi":c==="D"?"⚠ Distribusi":"🧱 Penyerapan jual"; return n?`<span class="ex-chip">${t}: ${n}</span>`:""; }).join("")}</div>
    ${stbl("rtbs",bsC,BS,"Belum ada transaksi.",{max:100})}<div class="ex-mut" style="margin-top:6px">Buy = transaksi HAKA (pembeli agresif), Sell = HAKI (penjual agresif); % dihitung dari nilai (Rp) dan lot. Pilih jendela atau akumulasi sejak Mulai di kotak "Buy/Sell" di atas (mode sejak Mulai tersimpan saat refresh, reset saat hari bursa berganti, dan tidak terkena filter min lot). Hijau pada bar = porsi Buy, merah = porsi Sell. Sisi bertanda ~ di tape adalah tebakan tick-rule. "Momentum" = %Buy 2 menit terakhir vs 5 menit sebelumnya: 🚀 bila naik ≥ 15 poin ke ≥ 60% dengan tape ≥ 1,5× lebih cepat dan net beli berarti, 🔻 kebalikannya; hanya aktif setelah ≥ 7 menit data terkumpul. Tape × = kecepatan transaksi 2 menit terakhir ÷ rata-rata 5 menit sebelumnya. Tren = %Buy per menit 10 menit terakhir. "Divergensi" = indikasi harga vs aliran (🕵 net beli besar tapi harga datar/turun, ⚠ harga naik tapi net jual besar, 🧱 banyak HAKI tapi harga bertahan; hanya heuristik, bukan kepastian). "Lolos preset" = jumlah preset yang lolos dari total (Smart Pick, Trend Bullish, Keyakinan Tinggi, Watchlist/Posisi); arahkan kursor untuk nama-namanya, klik untuk rincian (skor, definisi, filter) dan daftar yang belum lolos. Top 3 broker = 3 broker dengan total nilai beli/jual terbesar di saham itu (kedua sisi transaksi, seperti broker summary; arahkan kursor untuk porsinya); "-" berarti sumber data tidak membawa kode broker.</div></div>
  <div class="ex-card"><h3>🏭 Aliran per sektor (${bsHead}, ${SK.length} sektor)</h3>
    ${noSec?`<div class="ex-mut">Data sektor belum tersedia: buka/muat data saham di Screener dulu, lalu kembali ke sini.</div>`:`<div style="margin-bottom:6px">${heat}</div>`}
    ${stbl("rtsk",skC,SK,"Belum ada transaksi.",{max:40})}
    <div class="ex-mut" style="margin-top:6px">Jumlah Buy/Sell semua saham aktif per sektor (mengikuti pilihan Buy/Sell: jendela atau sejak Mulai; filter cari ticker ikut berlaku). Warna chip: hijau = % Buy &gt; 50, merah = &lt; 50; makin pekat makin condong. Klik chip atau nama sektor untuk menyaring semua tabel ke sektor itu, klik lagi untuk menghapus. Sektor dengan sedikit saham aktif mudah didominasi satu saham besar — lihat kolom Top net buy/sell.</div></div>
  <div class="ex-card"><h3>🐘 Lot besar (${CFG.accWin} menit terakhir) — ${bigs.length} transaksi${cnt3||cnt2?` (${cnt3} mega, ${cnt2} jumbo)`:""}</h3>
    <div class="ex-mut rt-leg" style="margin-bottom:6px"><span class="rt-l1" style="background:rgba(250,204,21,.3)">🐘 BESAR ≥ batas</span><span style="background:rgba(251,146,60,.4)">🐘🐘 JUMBO ≥ 3×</span><span style="background:rgba(239,68,68,.5)">🐘🐘🐘 MEGA ≥ 10×</span> Batas = "Transaksi besar ≥ (jt Rp)" × pengali likuiditas, atau "Lot besar ≥" bila diisi.</div>
    ${stbl("rtb",trCols,bigs,"Belum ada transaksi lot besar di jendela ini.",{max:60,cls:x=>tcls(x.tier)})}</div>
  <div class="ex-card"><h3>🔁 Order berulang — lot sama dari broker sama (${CFG.accWin} menit terakhir, ${RP.length} pola)</h3>
    ${stbl("rtrp",rpC,RP,"Belum ada pola berulang (min 6 kali, lot ≥ 50, nilai total ≥ 2× batas lot besar).",{max:40})}
    <div class="ex-mut" style="margin-top:6px;line-height:1.55">Lot yang persis sama dan berulang dari broker yang sama sering menandakan order besar yang dipecah (iceberg) atau algoritma. 🤖 Teratur = jarak antar transaksi hampir seragam (CV &lt; 0,6). Tanpa kode broker, pola dikelompokkan hanya per saham + sisi + lot, sehingga lebih mudah salah. Ini petunjuk, bukan bukti niat pelakunya.</div></div>
  <div class="ex-card"><h3>📊 Semua saham (${CFG.accWin} menit terakhir, ${M.length} saham) <button class="ex-btn" data-act="rtCopyMkt" style="float:right">📋 Salin CSV</button></h3>
    ${stbl("rtm",mC,M,"Belum ada transaksi.",{max:80,cls:a=>tcls(maxTier(a))})}<div class="ex-mut" style="margin-top:6px">Tanpa syarat sinyal, hanya filter pengaturan (min trx, harga, lot). Baris diwarnai bila lot terbesar saham itu tergolong besar. Umur = detik sejak transaksi terakhir; Trx/mnt = kecepatan tape. Bandingkan Net nilai & Net lot dengan Stockbit untuk jendela yang sama.</div></div>
  <div class="ex-card"><h3>🐋 Bandar akumulasi — broker net beli (${CFG.accWin} menit terakhir)</h3>${stbl("rtk",bC,B,bEmpty)}<div class="ex-mut" style="margin-top:6px">🐋 = broker menguasai ≥ 40% pembelian saham itu dan net belinya ≥ 2× batas. 🌍 = broker asing. Order beli yang dipecah menjadi banyak transaksi dihitung sebagai satu "beli besar".</div></div>
  <div class="ex-card"><h3>🌍 Aliran asing — net beli/jual broker asing (${CFG.accWin} menit terakhir)</h3>${stbl("rtf",fC,F,fEmpty)}<div class="ex-mut" style="margin-top:6px">Net = beli asing − jual asing (hijau = net beli, merah = net jual). Porsi = rata-rata porsi sisi beli dan jual yang dipegang broker asing. Batas memakai Min net broker/bandar.</div></div>
  ${hitHtml()}
  ${sigHtml()}
  <div class="ex-card"><h3>Transaksi terbaru${RT.bigOnly?" (hanya lot besar)":""}${CFG.minLot?` <span class="ex-mut" style="font-weight:400">· lot ≥ ${fpx(CFG.minLot)}</span>`:""}</h3>${stbl("rtt",trCols,tape,"Belum ada transaksi.",{cls:x=>tcls(x.tier)})}</div>
  <div class="ex-card"><details${RT.diagOpen?" open":""}><summary class="ex-mut" style="cursor:pointer">Diagnostik format data</summary>
    <div class="ex-mut" style="margin:8px 0;line-height:1.55">Contoh frame yang tidak terbaca (maks 5 terakhir). Kalau transaksi tetap 0 padahal frame terus masuk, format WebSocket belum cocok dengan parser; salin contoh ini ke chat supaya parser disesuaikan, atau pakai sumber REST. Kalau transaksi WS tetap 0 padahal frame masuk dan "mirip kuotasi ditolak" besar, matikan opsi "Tolak frame mirip kuotasi".</div>
    <button class="ex-btn" data-act="rtCopyDiag">📋 Salin diagnostik</button>
    <pre class="mono" style="white-space:pre-wrap;word-break:break-all;font-size:11px">Nama field baris REST: ${E(RT.restKeys.join(", ")||"(belum ada)")}\n\nContoh baris REST (3 pertama):\n${RT.restRaw.length?RT.restRaw.map(E).join("\n\n"):"(belum ada)"}\n\nFrame WS pertama diterima:\n${RT.first.length?RT.first.map(E).join("\n\n"):"(belum ada)"}\n\nTidak terbaca:\n${RT.samples.length?RT.samples.map(E).join("\n\n"):"(belum ada)"}</pre></details></div>`;
  cardBg(el); cloudStUpdate();
  el.querySelectorAll(".ex-wrap").forEach(w=>{ const p=sc[w.getAttribute("data-rt-w")]; if(p){ w.scrollLeft=p.x; w.scrollTop=p.y; } });
  syncBars(el);
  RT.mkt=M; RT.mktCols=mC;
}
/* ---------- riwayat sinyal & hit-rate ---------- */
const TY={H:"🔥 HAKA",A:"🧲 Akumulasi",B:"🐋 Bandar",L:"🐘 Lot besar",M:"🚀 Momentum",C:"🎯 Konfluensi"};
const sigs=()=>{ const l=LS("rt_sig",[]); return Array.isArray(l)?l:[]; };
function rec(ty,tk,px,info){
  const L=sigs(); L.push({ty,tk,ts:Date.now(),px:px||RT.last[tk]||0,info,pr:presetName(),p5:null,p15:null,p30:null});
  if(L.length>2000) L.splice(0,L.length-2000); SV("rt_sig",L);
}
function evalSigs(){            // harga +15/+30 menit diambil dari transaksi terakhir yang masuk (maks 3 menit lalu)
  const L=sigs(), now=Date.now(); let ch=false;
  L.forEach(g=>[[5,"p5"],[15,"p15"],[30,"p30"]].forEach(([m,k])=>{
    if(g[k]!==null) return; const age=now-g.ts; if(age<m*60000) return;
    if(RT.lastTs[g.tk]&&now-RT.lastTs[g.tk]<180000){ g[k]=RT.last[g.tk]; ch=true; }
    else if(age>(m+4)*60000){ g[k]=false; ch=true; }
  }));
  if(ch) SV("rt_sig",L);
}
const ret=g=>(typeof g.p30==="number"&&g.px)?(g.p30-g.px)/g.px*100:null;
/* ---------- analisa hit-rate per sinyal (jenis / preset / jam / saham) ---------- */
function wilson(w,n){ if(!n) return [0,0]; const z=1.96,p=w/n,d=1+z*z/n,c=p+z*z/(2*n),a=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n)); return [Math.max(0,(c-a)/d),Math.min(1,(c+a)/d)]; }
const retAt=(g,k)=>{ const v=g[k]; return (typeof v==="number"&&g.px)?(v-g.px)/g.px*100:null; };
const median=a=>{ if(!a.length) return null; const t=a.slice().sort((x,y)=>x-y), m=t.length>>1; return t.length%2?t[m]:(t[m-1]+t[m])/2; };
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const GB={ty:"jenis sinyal",pr:"preset",typr:"jenis × preset",hr:"jam (WIB)",tk:"saham"};
function hitRows(){
  const L=sigs(), m=new Map(), cost=+CFG.cost||0;
  const key=g=>RT.gb==="pr"?(g.pr||"Kustom"):RT.gb==="typr"?(TY[g.ty]||g.ty)+" · "+(g.pr||"Kustom"):RT.gb==="hr"?String(new Date(g.ts+7*3600000).getUTCHours()).padStart(2,"0")+":00":RT.gb==="tk"?g.tk:(TY[g.ty]||g.ty);
  L.forEach(g=>{ const k=key(g); let a=m.get(k); if(!a){ a={k,n:0,r5:[],r15:[],r30:[]}; m.set(k,a); } a.n++;
    [["r5","p5"],["r15","p15"],["r30","p30"]].forEach(([x,p])=>{ const r=retAt(g,p); if(r!==null) a[x].push(r); }); });
  const hit=r=>r.length?r.filter(v=>v>0).length/r.length:null, out=[];
  m.forEach(a=>{ const w=a.r30.filter(v=>v>0), l=a.r30.filter(v=>v<=0), ci=wilson(w.length,a.r30.length);
    out.push({k:a.k,n:a.n,e30:a.r30.length,h5:hit(a.r5),h15:hit(a.r15),h30:hit(a.r30),lo:ci[0],hi:ci[1],a15:avg(a.r15),a30:avg(a.r30),m30:median(a.r30),
      hc:a.r30.length?a.r30.filter(v=>v>cost).length/a.r30.length:null,aw:avg(w),al:avg(l)}); });
  out.sort((x,y)=>y.n-x.n); return RT.gb==="tk"?out.slice(0,15):out;
}
function hitHtml(){
  const L=sigs(), rows=hitRows(); RT.hitRows=rows;
  const all=L.map(g=>retAt(g,"p30")).filter(v=>v!==null), w=all.filter(v=>v>0).length, ci=wilson(w,all.length), cost=+CFG.cost||0;
  const pc=v=>v==null?"-":`<span class="${v>=.55?"ex-up":v<=.45?"ex-dn":""}">${Math.round(v*100)}%</span>`, rp=v=>v==null?"-":`<span class="${v>=0?"ex-up":"ex-dn"}">${pctS(v)}</span>`;
  const cols=[{h:GB[RT.gb]?GB[RT.gb][0].toUpperCase()+GB[RT.gb].slice(1):"Grup",s:1,k:r=>r.k,r:r=>E(r.k)},{h:"Sinyal",k:r=>r.n,r:r=>r.n},{h:"Terukur +30m",k:r=>r.e30,r:r=>r.e30},
    {h:"Hit +5m",k:r=>r.h5,r:r=>pc(r.h5)},{h:"Hit +15m",k:r=>r.h15,r:r=>pc(r.h15)},
    {h:"Hit +30m (rentang 95%)",k:r=>r.h30,r:r=>r.h30==null?"-":`${pc(r.h30)} <span class="ex-mut">(${Math.round(r.lo*100)}–${Math.round(r.hi*100)}%)</span>`},
    {h:"Rata² +15m",k:r=>r.a15,r:r=>rp(r.a15)},{h:"Rata² +30m",k:r=>r.a30,r:r=>rp(r.a30)},{h:"Median +30m",k:r=>r.m30,r:r=>rp(r.m30)},
    {h:"Hit +30m > biaya "+cost+"%",k:r=>r.hc,r:r=>pc(r.hc)},{h:"Rata² menang",k:r=>r.aw,r:r=>rp(r.aw)},{h:"Rata² kalah",k:r=>r.al,r:r=>rp(r.al)},
    {h:"Catatan",r:r=>r.e30<20?`<span class="ex-mut" style="white-space:nowrap">⚠ sampel kecil (${r.e30} &lt; 20)</span>`:""}];
  return `<div class="ex-card"><h3>📈 Analisa hit-rate per sinyal <button class="ex-btn" data-act="rtCopyHit" style="float:right">📋 Salin CSV</button></h3>
    ${L.length?`<div class="ex-chips"><span class="ex-chip">${L.length} sinyal tercatat</span><span class="ex-chip">${all.length} terukur +30 mnt</span>${all.length?`<span class="ex-chip">Hit-rate keseluruhan ${Math.round(w/all.length*100)}% <span class="ex-mut">(${Math.round(ci[0]*100)}–${Math.round(ci[1]*100)}%)</span></span><span class="ex-chip">Rata-rata ${pctS(avg(all))} · median ${pctS(median(all))}</span>`:""}</div>`:""}
    ${stbl("rths",cols,rows,"Belum ada sinyal tercatat. Sinyal 🔥 🐋 🧲 🐘 🚀 🎯 tercatat otomatis saat alert muncul (dan saat tab ini terbuka); hasil +5/+15/+30 menit terisi seiring waktu.",{max:40})}
    <div class="ex-mut" style="margin-top:6px;line-height:1.55">Dikelompokkan menurut <b>${GB[RT.gb]||"jenis sinyal"}</b> (ubah di kotak "Analisa sinyal per" di bawah tombol Mulai). Hit = harga +N menit lebih tinggi dari harga sinyal; "&gt; biaya" = lebih tinggi dari biaya jual-beli bolak-balik ${cost}% (ubah di pengaturan). Rentang 95% (Wilson) menunjukkan ketidakpastian: makin sedikit sampel, makin lebar. <b>Hati-hati menafsirkan:</b> tanpa pembanding pasar, hit-rate tinggi bisa hanya berarti seluruh pasar sedang naik; kurang dari ±30 sinyal terukur per kelompok sebaiknya dianggap petunjuk, bukan bukti. Hanya sinyal sisi beli yang dicatat (lot besar HAKI tidak), dan hasil diukur dari transaksi terakhir yang tertangkap, bukan harga yang pasti bisa Anda eksekusi.</div></div>`;
}
X.act("rtCopyHit",()=>copy(["grup,sinyal,terukur30,hit5,hit15,hit30,hit30_lo,hit30_hi,avg15,avg30,median30,hit30_di_atas_biaya,avg_menang,avg_kalah"].concat((RT.hitRows||[]).map(r=>[ '"'+r.k+'"',r.n,r.e30,r.h5,r.h15,r.h30,r.lo,r.hi,r.a15,r.a30,r.m30,r.hc,r.aw,r.al].map(v=>typeof v==="number"&&!Number.isInteger(v)?+v.toFixed(4):v).join(","))).join("\n"),"Tabel hit-rate disalin"));
function sigHtml(){
  const L=sigs(), st={};
  L.forEach(g=>{ const t=st[g.ty]||(st[g.ty]={n:0,e:0,w:0,r:0}); t.n++; const r=ret(g); if(r!==null){ t.e++; t.r+=r; if(r>0) t.w++; } });
  const sum=Object.keys(TY).filter(k=>st[k]).map(k=>{ const t=st[k];
    return `<span class="ex-chip">${TY[k]}: ${t.n} sinyal · ${t.e?`hit-rate ${Math.round(t.w/t.e*100)}% · rata-rata ${pctS(t.r/t.e)} (30 mnt, ${t.e} terukur)`:"belum terukur"}</span>`; }).join(" ");
  const cell=(g,k)=>{ const v=g[k]; if(v===undefined) return "<span class='ex-mut'>-</span>"; if(v===null) return "<span class='ex-mut'>menunggu</span>"; if(v===false) return "<span class='ex-mut'>tak terukur</span>";
    const r=(v-g.px)/g.px*100; return `<span class="${r>=0?"ex-up":"ex-dn"}">${pctS(r)}</span>`; };
  const rows=L.slice(-40).reverse().map(g=>`<tr><td>${new Date(g.ts).toLocaleString("id-ID",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</td><td>${TY[g.ty]||g.ty}</td><td><b>${E(g.tk)}</b>${badges(g.tk)}</td><td>${fpx(g.px)}</td><td>${cell(g,"p5")}</td><td>${cell(g,"p15")}</td><td>${cell(g,"p30")}</td><td class="ex-mut">${E(g.info||"")}</td></tr>`);
  return `<div class="ex-card"><h3>📜 Riwayat sinyal &amp; hit-rate</h3>
    <div class="ex-chips">${sum||'<span class="ex-mut">Belum ada sinyal tercatat.</span>'}</div>
    ${tbl(["Waktu","Jenis","Ticker","Harga sinyal","+5 mnt","+15 mnt","+30 mnt","Info"],rows,"Sinyal akan tercatat otomatis saat alert muncul.")}
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

/* ---------- riwayat harian di Supabase (tabel running_trade_daily, lihat sql/06_running_trade_daily.sql) ---------- */
const cloudOk=()=>typeof SUPABASE_URL!=="undefined"&&!!SUPABASE_URL&&typeof SUPABASE_KEY!=="undefined"&&!!SUPABASE_KEY&&typeof supaFetch==="function"&&typeof getSupaHeaders==="function";
function dayRows(){
  const out=[], iso=t=>t?new Date(t).toISOString():null;
  RT.cum.forEach(a=>{
    if(a.nb+a.ns<5) return; const b=bdOk(a.tk), mp=l=>(l||[]).map(r=>({c:r.broker_code,l:r.lot,v:r.value_idr,t:r.investor_type||null}));
    out.push({trade_date:RT.cumDay,ticker:a.tk,open_px:a.p0||null,last_px:RT.last[a.tk]||a.p0||null,buy_value:Math.round(a.bv),sell_value:Math.round(a.sv),buy_lot:a.bl,sell_lot:a.sl,n_buy:a.nb,n_sell:a.ns,
      top_buy:topN(a.bb,3),top_sell:topN(a.bs,3),bs_buy:b?mp(b.buy):null,bs_sell:b?mp(b.sell):null,first_trade_at:iso(a.t0),last_trade_at:iso(a.t1),updated_at:new Date().toISOString()});
  });
  return out;
}
async function saveCloud(kind){
  if(!cloudOk()){ if(kind==="manual") X.toast("Supabase belum dikonfigurasi di Pengaturan","down"); return false; }
  if(!RT.cumDay||!RT.cum.size){ if(kind==="manual") X.toast("Belum ada data harian untuk disimpan","down"); return false; }
  const rows=dayRows(); if(!rows.length){ if(kind==="manual") X.toast("Belum ada saham dengan ≥ 5 transaksi","down"); return false; }
  try{
    for(let i=0;i<rows.length;i+=500) await supaFetch(`${SUPABASE_URL}/running_trade_daily?on_conflict=trade_date,ticker`,{method:"POST",headers:{...getSupaHeaders(),"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(rows.slice(i,i+500))});
    RT.cloud={at:Date.now(),n:rows.length,day:RT.cumDay,kind,err:null,dirty:RT.dirty}; cloudStUpdate();
    if(kind==="manual") X.toast("Tersimpan ke Supabase: "+rows.length+" saham ("+RT.cumDay+")","up"); return true;
  }catch(e){
    const first=!RT.cloud.err; RT.cloud={...RT.cloud,at:Date.now(),err:String(e&&e.message||e),kind}; cloudStUpdate();
    if(kind==="manual"||first) X.toast("Simpan ke Supabase gagal: "+RT.cloud.err.slice(0,140)+(/relation|does not exist|404/i.test(RT.cloud.err)?" — jalankan sql/06_running_trade_daily.sql dulu":""),"down"); return false;
  }
}
async function supaGet(qs){       // baca semua halaman (PostgREST umumnya membatasi 1000 baris per permintaan)
  const out=[]; for(let off=0;off<30000;off+=1000){
    const res=await fetch(`${SUPABASE_URL}/running_trade_daily?${qs}&limit=1000&offset=${off}`,{headers:getSupaHeaders(),cache:"no-store"});
    if(!res.ok){ let t=""; try{ t=await res.text(); }catch(e){} throw new Error("HTTP "+res.status+" "+t.slice(0,160)); }
    const rows=await res.json(); rows.forEach(r=>out.push(r)); if(rows.length<1000) break;
  }
  return out;
}
function calcStreaks(rows,live,liveDay){      // net buy beruntun per saham; hari terbaru yang tersimpan/live dihitung dulu, mundur selama net > 0 dan barisnya ada
  const by=new Map(), dates=new Set();
  rows.forEach(r=>{ dates.add(r.trade_date); let m=by.get(r.ticker); if(!m){ m=new Map(); by.set(r.ticker,m); } m.set(r.trade_date,{net:(+r.buy_value||0)-(+r.sell_value||0),px:+r.last_px||0}); });
  if(liveDay){ dates.add(liveDay); live.forEach(a=>{ let m=by.get(a.tk); if(!m){ m=new Map(); by.set(a.tk,m); } m.set(liveDay,{net:a.bv-a.sv,px:RT.last[a.tk]||a.p0||0,live:true}); }); }
  const ds=Array.from(dates).sort().reverse(), out=new Map(), liveFirst=!!liveDay&&ds[0]===liveDay;
  by.forEach((m,tk)=>{
    let n=0,sum=0,px=0,first=null,today=false;
    for(let i=0;i<ds.length;i++){ const r=m.get(ds[i]);
      if(i===0&&liveFirst&&(!r||r.net<=0)) continue;      // hari ini masih berjalan: belum net buy tidak memutus rangkaian sampai kemarin
      if(!r||r.net<=0) break;
      if(!n) px=r.px; if(i===0&&liveFirst) today=true; n++; sum+=r.net; first=ds[i]; }
    if(n) out.set(tk,{n,sum,px,from:first,to:ds[0],today,ld:liveFirst});
  });
  return out;
}
async function loadStreaks(){
  if(RT.streakBusy||!cloudOk()) return null; RT.streakBusy=true;
  try{
    const from=new Date(Date.now()-16*86400000).toISOString().slice(0,10);
    const rows=await supaGet(`select=trade_date,ticker,buy_value,sell_value,last_px&trade_date=gte.${from}&order=trade_date.desc,ticker.asc`);
    const liveRows=[]; RT.cum.forEach(a=>{ if(a.nb+a.ns>=5) liveRows.push(a); });
    RT.streak=calcStreaks(rows,liveRows,RT.cumDay); RT.streakAt=Date.now(); return rows.length;
  } finally { RT.streakBusy=false; }
}
function cloudStUpdate(){
  const el=document.getElementById("rtCloudSt"); if(!el) return; const c=RT.cloud||{};
  el.innerHTML=!cloudOk()?"⚠ Supabase belum dikonfigurasi di Pengaturan aplikasi.":c.err?`<span class="ex-dn">Simpan terakhir gagal: ${E(c.err.slice(0,200))}</span>`:c.at?`Tersimpan ${E(String(c.n))} saham untuk ${E(c.day)} pada ${new Date(c.at).toLocaleTimeString("id-ID")} (${E(c.kind)}).`:"Belum ada penyimpanan pada sesi ini.";
}
function cloudTick(){
  if(!RT.on||!cloudOk()) return; const now=Date.now();
  if(CFG.cloud&&RT.cum.size&&RT.dirty!==RT.cloud.dirty){
    const w=new Date(now+7*3600000), dow=w.getUTCDay(), hm=w.getUTCHours()*60+w.getUTCMinutes(), day=w.toISOString().slice(0,10), ref=RT.cloud.at||RT.st.startAt||now;
    if(dow>0&&dow<6&&hm>=950&&hm<960&&RT.cloudClose!==day){ RT.cloudClose=day; saveCloud("penutupan"); }
    else if(now-ref>=Math.max(5,CFG.cloudMin)*60000) saveCloud("otomatis");
  }
  if(CFG.cloud&&!RT.streakBusy&&(!RT.streakAt||now-RT.streakAt>30*60000)&&now-(RT.st.startAt||now)>8000){ RT.streakAt=now; loadStreaks().catch(()=>{}); }
}
const dayName=d=>{ try{ return new Date(d+"T00:00:00Z").toLocaleDateString("id-ID",{weekday:"short",timeZone:"UTC"}); }catch(e){ return ""; } };
async function histRun(){
  const out=document.getElementById("rtHistRes"); if(!out) return; const say=m=>{ out.innerHTML=`<div class="ex-mut" style="margin-top:8px">${m}</div>`; };
  if(!cloudOk()) return say("Supabase belum dikonfigurasi di Pengaturan aplikasi.");
  const tk=String(RT.hq.tk||"").toUpperCase().replace(/[^A-Z]/g,""), n=Math.max(1,Math.min(120,+RT.hq.n||10)); if(!tk) return say("Isi ticker dulu.");
  say("Memuat…");
  try{
    const rows=(await supaGet(`ticker=eq.${tk}&order=trade_date.desc`)).slice(0,n);
    if(!rows.length) return say(`Belum ada riwayat ${E(tk)} di Supabase. Aktifkan penyimpanan otomatis atau klik ☁️ Simpan hari ini sekarang saat merekam.`);
    const bsum=l=>Array.isArray(l)?l.slice(0,3).map(x=>Array.isArray(x)?x[0]:x&&x.c).filter(Boolean).join(", "):"";
    const body=rows.map(r=>{ const b=+r.buy_value||0, s0=+r.sell_value||0, t=b+s0, net=b-s0, ch=+r.open_px?(+r.last_px-+r.open_px)/+r.open_px*100:0;
      return `<tr><td>${E(r.trade_date)} <span class="ex-mut">${dayName(r.trade_date)}</span></td><td>${fpx(+r.open_px||0)}</td><td>${fpx(+r.last_px||0)}</td><td><span class="${ch>=0?"ex-up":"ex-dn"}">${pctS(ch)}</span></td>
        <td><span class="ex-up">${fv(b)}</span></td><td><span class="ex-dn">${fv(s0)}</span></td><td><span class="${net>=0?"ex-up":"ex-dn"}">${fv(net)}</span></td><td>${t?(b/t*100).toFixed(1)+"%":"-"}</td>
        <td>${fpx(+r.buy_lot||0)} / ${fpx(+r.sell_lot||0)}</td><td>${(+r.n_buy||0)+(+r.n_sell||0)}</td><td>${r.first_trade_at?new Date(r.first_trade_at).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Jakarta"}):"-"}</td>
        <td>${E(bsum(r.top_buy)||bsum(r.bs_buy)||"-")} <span class="ex-mut">/</span> ${E(bsum(r.top_sell)||bsum(r.bs_sell)||"-")}</td></tr>`; }).join("");
    out.innerHTML=`<div class="ex-wrap" style="margin-top:8px"><table class="ex-tbl"><thead><tr><th>Tanggal</th><th>Open*</th><th>Last</th><th>Δ%</th><th>Buy (HAKA)</th><th>Sell (HAKI)</th><th>Net</th><th>% Buy</th><th>Lot buy / sell</th><th>Trx</th><th>Mulai tercatat (WIB)</th><th>Top broker buy / sell</th></tr></thead><tbody>${body}</tbody></table></div>
      <div class="ex-mut" style="margin-top:6px">*Open = harga transaksi pertama yang tertangkap, bukan harga pembukaan resmi. "Mulai tercatat" menunjukkan kapan perekaman hari itu dimulai: hari yang dimulai setelah jam 09:00 hanya berisi sebagian transaksi, jadi jangan dibandingkan langsung dengan hari yang direkam penuh.</div>`;
  }catch(e){ say(`<span class="ex-dn">Gagal memuat: ${E(String(e&&e.message||e).slice(0,220))}${/relation|does not exist|404|42P01/i.test(String(e&&e.message))?" — jalankan sql/06_running_trade_daily.sql di Supabase dulu.":""}</span>`); }
}
async function streakRun(){
  const out=document.getElementById("rtHistRes"); if(!out) return; const say=m=>{ out.innerHTML=`<div class="ex-mut" style="margin-top:8px">${m}</div>`; };
  if(!cloudOk()) return say("Supabase belum dikonfigurasi di Pengaturan aplikasi."); say("Memuat…");
  try{
    const n=await loadStreaks(); if(n===null) return say("Pemuatan sedang berjalan, coba lagi sebentar lagi.");
    const L=Array.from(RT.streak.entries()).map(([tk,v])=>Object.assign({tk},v)).sort((a,b)=>b.n-a.n||b.sum-a.sum).slice(0,40);
    if(!L.length) return say(`Tidak ada saham dengan net buy beruntun (${n} baris riwayat dibaca). Riwayat baru terisi setelah beberapa hari merekam dengan penyimpanan aktif.`);
    out.innerHTML=`<div class="ex-wrap" style="margin-top:8px"><table class="ex-tbl"><thead><tr><th>Ticker</th><th>Net buy beruntun</th><th>Total net</th><th>Sejak</th><th>Hari ini</th><th>Harga terakhir</th></tr></thead><tbody>${L.map(r=>`<tr><td>${tkc(r.tk)}</td><td><b class="ex-up">${r.n} hari</b></td><td><span class="ex-up">${fv(r.sum)}</span></td><td>${E(r.from)}</td><td>${r.ld?(r.today?"<span class=\"ex-up\">✓ ikut dihitung</span>":"<span class=\"ex-mut\">belum net buy</span>"):"-"}</td><td>${fpx(r.px)}</td></tr>`).join("")}</tbody></table></div>
      <div class="ex-mut" style="margin-top:6px">${n} baris riwayat dibaca (16 hari terakhir) + data live hari ini. Beruntun = hari-hari bursa berturut-turut yang tercatat dengan Buy &gt; Sell; hari yang tidak tercatat (misalnya aplikasi tidak merekam) memutus rangkaian. Data hari ini (live) ikut dihitung bila sudah net buy; bila belum, rangkaian dihitung sampai kemarin (ditandai * di tabel Buy/Sell). Kolom "Net buy beruntun" juga muncul di tabel Buy/Sell.</div>`;
  }catch(e){ say(`<span class="ex-dn">Gagal memuat: ${E(String(e&&e.message||e).slice(0,220))}${/relation|does not exist|404|42P01/i.test(String(e&&e.message))?" — jalankan sql/06_running_trade_daily.sql di Supabase dulu.":""}</span>`); }
}
/* ---------- status & sinkron token Stockbit (memakai mekanisme app.js: Supabase stockbit_session / extension Chrome) ---------- */
function tokenInfo(){
  if(typeof state==="undefined") return null;
  if(!state.stockbitToken) return {kind:"none",txt:"⚠ belum ada token"};
  const src=state.stockbitTokenSource==="auto"?"Supabase":state.stockbitTokenSource==="extension"?"extension Chrome":"manual", exp=state.stockbitTokenExpiresAt, now=Date.now()/1000;
  if(exp){ if(exp<now) return {kind:"exp",txt:"⚠ token kedaluwarsa",src}; const m=Math.round((exp-now)/60); return {kind:m<=5?"soon":"ok",txt:"🔑 token "+src+" · ~"+m+" mnt lagi",src,m}; }
  return {kind:"ok",txt:"🔑 token "+src,src};
}
function tokenTick(){            // token kosong/kedaluwarsa/hampir habis: minta sinkron otomatis (maks tiap 30 dtk; app.js membatasi lagi 10 dtk)
  if(!RT.on||!CFG.rest||typeof maybeResyncStockbitTokenFromSupabase!=="function") return;
  const t=tokenInfo(), n=Date.now(); if(!t||t.kind==="ok"||n-(RT.tokAt||0)<30000) return;
  RT.tokAt=n; maybeResyncStockbitTokenFromSupabase();
}
/* ---------- digest Telegram ---------- */
function digestText(kind){
  const now=Date.now(), n=Math.max(1,Math.min(10,CFG.digestN|0||5)), w=new Date(now+7*3600000), hh=String(w.getUTCHours()).padStart(2,"0")+":"+String(w.getUTCMinutes()).padStart(2,"0");
  const CF=confList().slice(0,n), am=accelMap(), up=[], dn=[], M=marketList(); let tb=0,ts=0; M.forEach(a=>{ tb+=a.bv; ts+=a.sv; });
  am.forEach((a,tk)=>{ if(a.sig==="U") up.push({tk,a}); else if(a.sig==="D") dn.push({tk,a}); });
  up.sort((p,q)=>q.a.net-p.a.net); dn.sort((p,q)=>p.a.net-q.a.net);
  const from=now-CFG.accWin*60000, bg=[]; for(const x of RT.trades){ if(x.ts<from||(CFG.minLot&&x.lot<CFG.minLot)) continue; const t=lotTier(x); if(t>0) bg.push({x,v:x.px*x.lot*100}); }
  bg.sort((p,q)=>q.v-p.v);
  const L=sigs().map(g=>retAt(g,"p30")).filter(v=>v!==null), win=L.filter(v=>v>0).length;
  const lines=[`📊 <b>Digest Running Trade</b> · ${hh} WIB (${kind})`,`Jendela ${CFG.accWin} menit · ${M.length} saham · Buy ${fv(tb)} / Sell ${fv(ts)} (${tb+ts?Math.round(tb/(tb+ts)*100):0}% Buy)`,""];
  lines.push(`🎯 <b>Konfluensi teratas</b>`);
  if(CF.length) CF.forEach((r,i)=>lines.push(`${i+1}. <b>${E(r.tk)}</b> skor ${r.score} (${r.n} sinyal) · ${fpx(r.last)} ${pctS(r.chg)} · net ${fv(r.net)} · ${Math.round(r.pb)}% Buy`)); else lines.push("— belum ada saham dengan "+CFG.confMin+"+ sinyal");
  if(up.length) lines.push("","🚀 <b>Mulai diborong:</b> "+up.slice(0,5).map(o=>`${E(o.tk)} (+${Math.round(o.a.d)} pp, ${o.a.spike.toFixed(1)}×)`).join(", "));
  if(dn.length) lines.push("🔻 <b>Mulai dilepas:</b> "+dn.slice(0,5).map(o=>E(o.tk)).join(", "));
  if(bg.length){ lines.push("","🐘 <b>Lot besar terbesar</b>"); bg.slice(0,3).forEach(o=>lines.push(`• ${E(o.x.tk)} ${fpx(o.x.lot)} lot @ ${fpx(o.x.px)} (${fv(o.v)}) ${o.x.side==="B"?"HAKA":"HAKI"}${o.x.side==="B"&&o.x.buyer?" · "+E(o.x.buyer):o.x.side==="S"&&o.x.seller?" · "+E(o.x.seller):""}`)); }
  if(L.length) lines.push("",`📈 Hit-rate sinyal +30 mnt: ${Math.round(win/L.length*100)}% (${L.length} terukur) — indikatif, belum dibanding pasar`);
  lines.push("","<i>Alat penyaring, bukan rekomendasi. Cek chart & Detail Emiten sebelum bertindak.</i>");
  return lines.join("\n");
}
async function sendDigest(kind){
  const text=digestText(kind);
  try{
    if(typeof sendTelegramDirect==="function"){ const r=await sendTelegramDirect(text); if(!r||!r.ok){ X.toast("Digest Telegram gagal: "+((r&&r.error)||"tidak diketahui"),"down"); return false; } X.toast("Digest Telegram terkirim","up"); return true; }
    X.notify(text.replace(/<[^>]+>/g,""),true); return true;      // cadangan: lewat jalur notifikasi biasa
  }catch(e){ X.toast("Digest Telegram gagal: "+(e&&e.message||e),"down"); return false; }
}
function digestTick(){          // hanya hari bursa, 09:00–15:50 WIB, saat merekam dan pasar tidak dilaporkan tutup; penutupan sekali per hari pada 15:50
  if(!CFG.digest||!RT.on||RT.st.open===false) return;
  const w=new Date(Date.now()+7*3600000), dow=w.getUTCDay(), hm=w.getUTCHours()*60+w.getUTCMinutes(), day=w.toISOString().slice(0,10);
  if(dow===0||dow===6||RT.trades.length<30) return;
  if(CFG.digestClose&&hm>=950&&hm<960&&RT.dgClose!==day){ RT.dgClose=day; RT.dgAt=Date.now(); sendDigest("penutupan"); return; }
  if(hm<540||hm>=950) return;
  const iv=Math.max(5,CFG.digestMin)*60000, ref=RT.dgAt||RT.st.startAt||Date.now();
  if(Date.now()-ref>=iv){ RT.dgAt=Date.now(); sendDigest("berkala"); }
}

/* ---------- alert ---------- */
function alerts(){
  if(!RT.on) return;
  const now=Date.now(), cool=5*60000;
  hakaList().forEach(a=>{
    if(now-(RT.flag["H"+a.tk]||0)<cool) return; RT.flag["H"+a.tk]=now;
    rec("H",a.tk,a.last,`${fv(a.bv)}, rasio ${Math.round(a.ratio*100)}%`);
    fire(`🔥 ${a.tk} di-HAKA ${fv(a.bv)} dalam ${CFG.hakaWin} menit (rasio ${Math.round(a.ratio*100)}%, harga ${fpx(a.last)})`);
  });
  brokerList().filter(whale).forEach(a=>{
    if(now-(RT.flag["B"+a.tk+a.br]||0)<cool*3) return; RT.flag["B"+a.tk+a.br]=now;
    rec("B",a.tk,RT.last[a.tk],`${a.br} net ${fv(a.net)} (${Math.round(a.share*100)}%)`);
    fire(`🐋 ${a.tk}: broker ${a.br} net beli ${fv(a.net)} (${Math.round(a.share*100)}% dari pembelian) dalam ${CFG.accWin} menit`);
  });
  accList().filter(a=>a.score>=70).forEach(a=>{
    if(now-(RT.flag["A"+a.tk]||0)<cool*3) return; RT.flag["A"+a.tk]=now;
    rec("A",a.tk,a.last,`net ${fv(a.net)}, skor ${a.score}${a.topBrk?", "+a.topBrk:""}`);
    fire(`🧲 ${a.tk} terakumulasi: net beli ${fv(a.net)} dalam ${CFG.accWin} menit (skor ${a.score}${a.topBrk?", broker "+a.topBrk:""})`);
  });
  if(CFG.momAlert){
    const own=X.ownTickers();
    accelMap().forEach((a,tk)=>{
      if(!a.sig||!okTk(tk,a.cnt,own)) return;
      const k="M"+tk+a.sig; if(now-(RT.flag[k]||0)<cool) return; RT.flag[k]=now;
      const pp=Math.abs(a.d).toFixed(0), txt=`%Buy 2 mnt ${a.pbR.toFixed(0)}% vs 5 mnt sebelumnya ${a.pbB.toFixed(0)}%, tape ${a.spike.toFixed(1)}×`;
      if(a.sig==="U"){ rec("M",tk,RT.last[tk],`+${pp} pp, ${txt}`); fire(`🚀 ${tk} mulai diborong: ${txt} (net beli ${fv(a.net)})`); }
      else fire(`🔻 ${tk} mulai dilepas: ${txt} (net jual ${fv(-a.net)})`);
    });
  }
  if(CFG.confAlert){
    confList().filter(r=>r.score>=75&&r.n>=4).forEach(r=>{
      const k="C"+r.tk; if(now-(RT.flag[k]||0)<15*60000) return; RT.flag[k]=now;
      const nm=r.sg.map(x=>x.t).join(", ");
      rec("C",r.tk,r.last,`skor ${r.score}: ${nm}`); fire(`🎯 ${r.tk} konfluensi skor ${r.score} (${r.n} sinyal: ${nm})${r.pen.length?" — "+r.pen.join(", "):""}`);
    });
  }
  RT.bigQ.splice(0).forEach(x=>{                       // lot JUMBO/MEGA: cooldown 2 menit per ticker+sisi; hanya sisi HAKA yang dicatat ke hit-rate
    if(CFG.minLot&&x.lot<CFG.minLot) return; if(!pxOk(x.tk)) return;
    const k="L"+x.tk+x.side; if(now-(RT.flag[k]||0)<120000) return; RT.flag[k]=now;
    const v=x.px*x.lot*100;
    if(x.side==="B") rec("L",x.tk,x.px,`${fpx(x.lot)} lot HAKA ${fv(v)}${x.buyer?" · "+x.buyer:""}`);
    fire(`🐘 ${x.tk} lot ${lotTier(x)>=3?"MEGA":"JUMBO"} ${fpx(x.lot)} @ ${fpx(x.px)} (${fv(v)}) ${x.side==="B"?"HAKA":"HAKI"}${x.buyer?" · beli "+x.buyer:""}${x.seller?" · jual "+x.seller:""}`);
  });
}

/* ---------- kontrol ---------- */
function readCfg(){
  const g=id=>document.getElementById(id); if(!g("rt-url")) return;
  const n=(id,d)=>{ const v=parseFloat(g(id).value); return isNaN(v)?d:v; };
  Object.assign(CFG,{ws:g("rt-ws").checked,rest:g("rt-rest").checked,tick:g("rt-tick").checked,tg:g("rt-tg").checked,bn:g("rt-bn").checked,snd:g("rt-snd").checked,
    feed:g("rt-feed").checked,rejQuote:g("rt-quote").checked,bigAlert:g("rt-balert").checked,momAlert:g("rt-malert").checked,confAlert:g("rt-calert").checked,hoverPause:g("rt-hover").checked,cost:Math.max(0,n("rt-cost",0.4)),digest:g("rt-dg").checked,digestMin:Math.max(5,n("rt-dgmin",30)),digestN:Math.max(1,Math.min(10,n("rt-dgn",5))),digestClose:g("rt-dgc").checked,bday:g("rt-bday").checked,cloud:g("rt-cloud").checked,cloudMin:Math.max(5,n("rt-cloudmin",10)),confMin:Math.max(1,Math.min(8,n("rt-cmin",3))),
    pollSec:n("rt-poll",3),auto:g("rt-auto").checked,adapt:g("rt-adapt").checked,perPoll:n("rt-pp",5),refAdvM:n("rt-ref",20),tickers:g("rt-tickers").value.trim(),hakaWin:n("rt-hw",5),accWin:n("rt-aw",15),hakaMinJt:n("rt-hmin",300),
    hakaRatio:n("rt-hr",65),bigJt:n("rt-big",50),accMinJt:n("rt-amin",200),accRatio:n("rt-ar",55),brkMinJt:n("rt-bmin",100),minTrades:n("rt-mt",10),onlyOwn:g("rt-own").checked,onlyBull:g("rt-bull").checked,url:g("rt-url").value.trim()||DEF_URL,
    minLot:n("rt-minlot",0),bigLot:n("rt-biglot",0),hakaMinLot:n("rt-hlot",0),accMinLot:n("rt-alot",0),brkMinLot:n("rt-blot",0),pxMin:n("rt-pmin",0),pxMax:n("rt-pmax",0)});
  if(CFG.bn) askPerm(); if(CFG.snd) audio();      // dipanggil dari klik/ubah pengaturan = gestur pengguna, syarat izin & audio
  RT.mm={}; SV("rt_cfg",CFG); applyPoll(); dyn();
}
X.onChange(e=>{ if(e.target.id&&e.target.id.startsWith("rt-")) readCfg(); });
X.act("rtToggle",()=>{
  readCfg(); RT.on=!RT.on;
  if(RT.on){ RT.st.startAt=Date.now(); RT.st.restErr=null; }
  applyPoll(); X.repaint();
});
X.act("rtTest",()=>{ askPerm(); audio(); fire("🔔 Tes alert Running Trade — notifikasi dan bunyi berfungsi"); });
X.act("rtReset",()=>{
  RT.mm={}; RT.trades=[]; RT.seen.clear(); RT.fp.clear(); RT.cum.clear(); RT.cumDay=""; SV("rt_cum",{day:"",rows:[]}); RT.bigQ=[]; RT.raw.clear(); RT.last={}; RT.lastSide={}; RT.flag={}; RT.samples=[]; RT.restRaw=[]; RT.restKeys=[];
  SV("rt_trd",{at:Date.now(),rows:[]}); RT.dirty=RT.saved=0;
  Object.assign(RT.st,{quote:0,dup:0,nw:0,nr:0,restored:0,frames:0,parsed:0,unparsed:0,trades:0,est:0,brk:0,rest:0,restErr:null,startAt:Date.now()}); dyn();
});
const copy=(t,msg)=>{ try{ navigator.clipboard.writeText(t).then(()=>X.toast(msg,"up")); }catch(e){ X.toast("Gagal menyalin","down"); } };
X.act("rtClearSig",()=>{ SV("rt_sig",[]); dyn(); });
X.act("rtCopySig",()=>copy(["waktu,jenis,preset,ticker,harga,p5,p15,p30,info"].concat(sigs().map(g=>[new Date(g.ts).toISOString(),g.ty,'"'+(g.pr||"")+'"',g.tk,g.px,g.p5,g.p15,g.p30,'"'+(g.info||"")+'"'].join(","))).join("\n"),"Riwayat sinyal disalin"));
X.act("rtCopyDiag",()=>copy(JSON.stringify({stats:RT.st,cfg:{ws:CFG.ws,rest:CFG.rest,feed:CFG.feed,rejQuote:CFG.rejQuote,url:CFG.url},first:RT.first,restKeys:RT.restKeys,rest:RT.restRaw,unparsed:RT.samples},null,1),"Diagnostik disalin — tempel ke chat"));
X.act("rtCopyMkt",()=>{       // CSV tabel Semua saham sesuai urutan sort yang sedang aktif
  const M=(RT.mkt||[]).slice(), c=RT.sort.rtm; if(c&&RT.mktCols[c.i]&&RT.mktCols[c.i].k){ const k=RT.mktCols[c.i].k; M.sort((a,b)=>{ const x=k(a),y=k(b); return (typeof x==="string"?x.localeCompare(y):x-y)*c.d; }); }
  copy(["ticker,harga,chg_pct,nilai_total,net_nilai,rasio_beli,lot_beli,lot_jual,net_lot,lot_besar_n,net_lot_besar,lot_terbesar,trx_per_menit,umur_dtk"].concat(M.map(a=>[a.tk,a.last,a.chg.toFixed(2),Math.round(a.vt),Math.round(a.net),(a.ratio*100).toFixed(0),a.bl,a.sl,a.netL,a.big,a.bigNet,a.mx,a.rate.toFixed(1),a.age].join(","))).join("\n"),"Tabel Semua saham disalin");
});
Object.keys(PRESETS).forEach(k=>X.act("rtPre_"+k,()=>{ readCfg(); applyPreset(PRESETS[k].v,PRESETS[k].n); }));
X.act("rtPreSave",()=>{ readCfg(); const v={}; PRE_KEYS.forEach(k=>{ v[k]=CFG[k]; }); SV("rt_preset_user",v); X.repaint(); dyn(); X.toast("Pengaturan disimpan sebagai Preset saya","up"); });
X.act("rtPreUser",()=>{ const v=userPre(); if(!v){ X.toast("Belum ada Preset saya — atur dulu, lalu klik ➕ Simpan pengaturan ini","down"); return; } applyPreset(v,"💾 Preset saya"); });
X.act("rtCal",()=>{ calRun(); });
X.act("rtCloudSave",()=>{ saveCloud("manual"); });
X.act("rtHistLoad",()=>{ histRun(); });
X.act("rtStreak",()=>{ streakRun().then(()=>dyn()); });
X.act("rtTokSync",async()=>{
  if(typeof syncStockbitTokenFromSupabase!=="function"){ X.toast("Fungsi sinkron token tidak ditemukan di app.js","down"); return; }
  try{ const ok=await syncStockbitTokenFromSupabase(); if(ok) RT.st.restErr=null; X.toast(ok?"Token diperbarui dari Supabase":"Tidak ada token baru di Supabase (sudah terbaru, atau tabel/extension belum terpasang)",ok?"up":"down"); dyn(); }
  catch(e){ X.toast("Sinkron token gagal: "+(e&&e.message||e),"down"); }
});
X.act("rtExpDl",()=>{ if(!Object.keys(RT.tblData).length){ X.toast("Belum ada tabel — tekan ▶ Mulai dulu","down"); return; } dlCsv(exportCsv()); });
X.act("rtExpCopy",()=>{ if(!Object.keys(RT.tblData).length){ X.toast("Belum ada tabel — tekan ▶ Mulai dulu","down"); return; } copy(exportCsv(),"Semua tabel disalin (CSV)"); });
X.act("rtDigestNow",()=>{ sendDigest("manual"); });
X.act("rtFreeze",()=>{
  RT.frozen=!RT.frozen; const b=document.getElementById("rtFreezeBtn");
  if(b){ b.textContent=RT.frozen?"▶ Lanjutkan tampilan":"⏸ Bekukan tampilan"; b.classList.toggle("pri",RT.frozen); }
  dyn();
});
X.act("rtColBtn",()=>{ const el=document.getElementById("rtColCard"); if(!el) return; const open=el.style.display==="none"; el.style.display=open?"":"none"; if(open) colPanel(); });
// kontrol di luar pengaturan: sort kolom, klik ticker (detail), cari ticker, tape lot besar
function openFull(tk){      // modal Detail Emiten milik app.js; tombol ‹ › di modal berjalan menurut urutan tabel Semua saham
  if(typeof openDetail!=="function"){ pickTk(tk); return; }
  const nav=(RT.mkt||[]).slice().sort((a,b)=>b.net-a.net).map(a=>a.tk);
  try{
    openDetail(tk,nav.length>1&&nav.indexOf(tk)>=0?{nav}:undefined);
    const ov=document.getElementById("detailModalOverlay"); if(ov&&!ov.classList.contains("open")) pickTk(tk);   // modal tidak terbuka: pakai panel detail bawaan tab ini
  }catch(e){ console.warn("running-trade: openDetail gagal",e); pickTk(tk); }
}
function pickTk(tk){ RT.sel=tk; const i=document.getElementById("rtsel"); if(i) i.value=tk; dyn(); const d=document.getElementById("rtDetail"); if(d&&d.scrollIntoView) d.scrollIntoView({behavior:"smooth",block:"start"}); }
document.addEventListener("click",e=>{
  const c=e.target&&e.target.closest?e.target.closest.bind(e.target):null; if(!c) return;
  let n=c("[data-rt-sort]"); if(n){ sortClick(n); return; }
  if(e.target&&e.target.id==="rtScPop"){ scClose(); return; }
  n=c("[data-rt-scx]"); if(n){ scClose(); return; }
  n=c("[data-rt-scd]"); if(n){ scPopup(n.getAttribute("data-rt-scd")); return; }
  n=c("[data-rt-sec]"); if(n){ const v=n.getAttribute("data-rt-sec"); RT.sec=(!v||RT.sec===v)?"":v; dyn(); return; }
  n=c("[data-rt-colall]"); if(n){ delete RT.hide[n.getAttribute("data-rt-colall")]; SV("rt_cols",RT.hide); colPanel(); dyn(); return; }
  n=c("[data-rt-colcompact]"); if(n){ RT.hide.rtbs=["% Sell","Lot buy","Lot sell","Net lot","% Lot buy","Trx buy","Trx sell"]; SV("rt_cols",RT.hide); colPanel(); dyn(); return; }
  n=c("[data-rt-full]"); if(n){ scClose(); openFull(n.getAttribute("data-rt-full")); return; }
  n=c("[data-rt-tk]"); if(n){ pickTk(n.getAttribute("data-rt-tk")); return; }
  n=c("[data-rt-close]"); if(n){ RT.sel=""; const i=document.getElementById("rtsel"); if(i) i.value=""; dyn(); }
});
document.addEventListener("keydown",e=>{ if(e.key==="Escape") scClose(); });
document.addEventListener("input",e=>{ const t=e.target; if(!t||!t.id) return;
  if(t.id==="rtq"){ RT.q=t.value.trim().toUpperCase(); dyn(); }
  else if(t.id.indexOf("rtc-")===0){ RT.cal[t.id.slice(4)]=t.value; SV("rt_cal",RT.cal); }
  else if(t.id==="rth-tk"){ RT.hq.tk=t.value; SV("rt_hq",RT.hq); }
});
document.addEventListener("change",e=>{
  const t=e.target; if(!t||!t.id) return;
  const mc=t.id.match(/^rtcol_(\w+)_(\d+)$/);
  if(mc){ const id=mc[1], h=(RT.colReg[id]||[])[+mc[2]]; if(h!=null){ const a=(RT.hide[id]||[]).filter(x=>x!==h); if(!t.checked) a.push(h); if(a.length) RT.hide[id]=a; else delete RT.hide[id]; SV("rt_cols",RT.hide); dyn(); } return; }
  if(t.id==="rtc-win"){ RT.cal.win=t.value; SV("rt_cal",RT.cal); return; }
  if(t.id==="rth-n"){ RT.hq.n=+t.value; SV("rt_hq",RT.hq); return; }
  if(t.id==="rtsel"){ RT.sel=t.value.trim().toUpperCase().replace(/[^A-Z]/g,""); dyn(); }
  else if(t.id==="rtbig"){ RT.bigOnly=t.checked; dyn(); }
  else if(t.id==="rtmo"){ RT.momOnly=t.checked; dyn(); }
  else if(t.id==="rtdv"){ RT.dvOnly=t.checked; dyn(); }
  else if(t.id==="rtsc"){ RT.scOnly=t.checked; dyn(); }
  else if(t.id==="rtgb"){ RT.gb=GB[t.value]?t.value:"ty"; SV("rt_gb",RT.gb); dyn(); }
  else if(t.id==="rtmode"){ RT.mode=t.value==="cum"?"cum":"win"; SV("rt_mode",RT.mode); dyn(); }
});
loadTrades();
window.addEventListener("pagehide",saveTrades);
setInterval(saveTrades,15000);
X.addTab("rt","⚡ Running Trade",view,dyn);
setInterval(()=>{
  try{
    alerts(); evalSigs(); digestTick(); tokenTick(); cloudTick(); bdTick().catch(()=>{});
    const pg=document.getElementById("exPage");
    let hv=false; try{ hv=!!(CFG.hoverPause&&document.querySelector("#rtDyn .ex-wrap:hover")); }catch(e){}
    if(pg&&pg.classList.contains("on")&&X.current()==="rt"&&!RT.frozen&&!hv) dyn();
  }catch(e){ console.warn("running-trade:",e); }
},1500);
})();
