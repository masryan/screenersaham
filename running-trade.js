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
  hakaMinJt:300,hakaRatio:65,bigJt:50,accMinJt:200,accRatio:55,brkMinJt:100,minTrades:10,onlyOwn:false,onlyBull:false,tg:false,tick:true,auto:true,perPoll:5,adapt:true,refAdvM:20,bn:false,snd:false,feed:true,minLot:0,bigLot:0,hakaMinLot:0,accMinLot:0,brkMinLot:0,pxMin:0,pxMax:0,rejQuote:true,bigAlert:true,momAlert:true,confMin:3,confAlert:true},LS("rt_cfg",{}));
// URL lama tersimpan di localStorage memakai order_by salah (RUN_TRADE_...): perbaiki otomatis. trade_number dibuang karena itu kursor tetap (data basi).
CFG.url=String(CFG.url||DEF_URL).replace("RUN_TRADE_ORDER_BY_TIME","RUNNING_TRADE_ORDER_BY_TIME").replace(/([?&])trade_number=\d*&?/,"$1").replace(/[?&]$/,"");
const RT={on:false,lastTs:{},first:[],diagOpen:false,trades:[],seen:new Set(),fp:new Map(),bigQ:[],sort:LS("rt_sort",{}),q:"",sel:"",bigOnly:false,gen:0,mm:{},restRaw:[],restKeys:[],dvOnly:false,momOnly:false,scOnly:false,cum:new Map(),cumDay:"",mode:LS("rt_mode","win"),raw:new Map(),last:{},lastSide:{},flag:{},samples:[],busy:false,poll:null,rot:0,dirty:0,saved:0,
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
  let a=RT.cum.get(t.tk); if(!a){ a={tk:t.tk,bv:0,sv:0,bl:0,sl:0,nb:0,ns:0,p0:t.px,bb:new Map(),bs:new Map()}; RT.cum.set(t.tk,a); }
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
  try{ SV("rt_trd",{at:Date.now(),rows:rows.reverse()}); SV("rt_cum",{day:RT.cumDay,rows:Array.from(RT.cum.values()).map(a=>[a.tk,Math.round(a.bv),Math.round(a.sv),a.bl,a.sl,a.nb,a.ns,a.p0,topN(a.bb,8),topN(a.bs,8)])}); RT.saved=RT.dirty; }catch(e){}
}
function loadTrades(){
  try{
    const cd=LS("rt_cum",null); if(cd&&Array.isArray(cd.rows)){ RT.cumDay=cd.day||""; cd.rows.forEach(r=>{ if(Array.isArray(r)) RT.cum.set(r[0],{tk:r[0],bv:r[1],sv:r[2],bl:r[3],sl:r[4],nb:r[5],ns:r[6],p0:r[7],bb:new Map((r[8]||[]).map(x=>[x[0],x[1]])),bs:new Map((r[9]||[]).map(x=>[x[0],x[1]]))}); }); }
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
function bsRows(M,fq){
  const am=accelMap();          // baris komposisi buy/sell: mode "win" = jendela akumulasi, "cum" = akumulasi sejak Mulai hari ini
  let src=M;
  if(RT.mode==="cum"){ src=[]; const own=X.ownTickers();
    RT.cum.forEach(a=>{ if(!okTk(a.tk,a.nb+a.ns,own)) return; const l=RT.last[a.tk]||a.p0; src.push({tk:a.tk,last:l,chg:a.p0?(l-a.p0)/a.p0*100:0,bv:a.bv,sv:a.sv,bl:a.bl,sl:a.sl,nb:a.nb,ns:a.ns,bb:a.bb,bs:a.bs}); }); }
  const bw=RT.mode==="cum"?null:brkWin();
  return src.filter(fq).map(a=>{ const tv=a.bv+a.sv, tl=a.bl+a.sl, bm=bw?(bw.get(a.tk)||{}):a;
    return {tk:a.tk,last:a.last,chg:a.chg,bv:a.bv,sv:a.sv,bl:a.bl,sl:a.sl,nb:a.nb,ns:a.ns,tv,net:a.bv-a.sv,netL:a.bl-a.sl,pb:tv?a.bv/tv*100:0,ps:tv?a.sv/tv*100:0,pl:tl?a.bl/tl*100:0,
      tb:topN(bm.bb,3),ts:topN(bm.bs,3),sc:scStatus(a.tk),ac:am.get(a.tk)||null}; }).map(r=>{ r.dv=divOf(r); return r; }).filter(a=>(!RT.scOnly||a.sc.length)&&(!RT.dvOnly||a.dv)&&(!RT.momOnly||(a.ac&&a.ac.sig)));
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

/* ---------- cache hasil daftar berat (dyn, alert, dan konfluensi memakai hasil yang sama dalam 0,7 detik) ---------- */
const memo=(k,f)=>{ const e=RT.mm[k], n=Date.now(); if(e&&n-e.t<700&&e.d===RT.dirty) return e.v; const v=f(); RT.mm[k]={t:n,d:RT.dirty,v}; return v; };   // batal otomatis bila ada transaksi baru
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
    if(bs.has(a.tk)) add("B","🐋 Broker dominan",10);
    if(ac&&ac.sig==="U") add("M","🚀 Momentum",10);
    if((fs.get(a.tk)||0)>0) add("F","🌍 Asing net beli",5);
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
   +"#exPage .ex-grid{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr))!important;gap:10px 12px;width:100%;max-width:100%}"
   +"#exPage .ex-grid .ex-wide{grid-column:1/-1}#exPage .ex-card .ex-mut,#exPage .ex-card h3{overflow-wrap:anywhere;word-break:break-word;white-space:normal}"
   +"#exPage .ex-grid label{display:flex;flex-direction:column;gap:4px;min-width:0}#exPage .ex-grid label:has(>input[type=checkbox]){flex-direction:row;align-items:flex-start}"
   +".rt-scn{cursor:pointer;font-size:12px;font-weight:600;padding:1px 10px;border-radius:999px;white-space:nowrap}.rt-scn:hover{text-decoration:underline}"
   +"#rtScPop{position:fixed;z-index:99999;min-width:220px;max-width:min(340px,92vw);padding:10px 12px;border-radius:10px;border:1px solid rgba(128,128,128,.45);background:var(--rt-bg,Canvas);color:CanvasText;box-shadow:0 8px 28px rgba(0,0,0,.35);font-size:13px;line-height:1.45}"
   +"#rtScPop .rt-pt{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px}#rtScPop .rt-pi{padding:4px 0;border-top:1px solid rgba(128,128,128,.25)}#rtScPop .rt-ps{font-size:11px;opacity:.65}#rtScPop button{cursor:pointer}"
   +".rt-xs{overflow-x:auto;overflow-y:hidden;height:14px;margin-bottom:2px}"
   +".rt-tools input[type=text]{width:150px}.rt-leg span{display:inline-block;padding:1px 8px;border-radius:6px;margin-right:6px}";
  document.head.appendChild(s);
})();
function fitWidth(){
  try{
    for(let el=document.getElementById("exPage");el&&el!==document.documentElement;el=el.parentElement){
      el.style.minWidth="0"; el.style.maxWidth="100%"; if(el===document.body) break;
    }
  }catch(e){}
}
const ck=(id,v)=>`<label style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" id="${id}"${v?" checked":""} style="width:auto"> `;
function view(){
  setTimeout(fitWidth,0);
  const sel=(id,arr,v)=>`<select id="${id}">${arr.map(n=>`<option value="${n}"${+v===n?" selected":""}>${n} menit</option>`).join("")}</select>`;
  const inp=(id,v,t)=>`<input id="${id}" ${t||"type=\"number\""} value="${E(v)}">`;
  return `<div class="ex-card"><h3>⚡ Running Trade — deteksi HAKA &amp; akumulasi <span class="ex-mut" style="font-weight:400;font-size:12px">v3.5 · + Lolos screener = jumlah, klik untuk detail</span></h3>
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
    <label>⚖️ Buy/Sell <select id="rtmode"><option value="win"${RT.mode==="win"?" selected":""}>Jendela akumulasi</option><option value="cum"${RT.mode==="cum"?" selected":""}>Sejak Mulai (hari ini)</option></select></label>
    <label><input type="checkbox" id="rtmo"${RT.momOnly?" checked":""} style="width:auto"> Buy/Sell: hanya yang ada momentum</label>
    <label><input type="checkbox" id="rtdv"${RT.dvOnly?" checked":""} style="width:auto"> Buy/Sell: hanya yang ada divergensi</label>
    <label><input type="checkbox" id="rtsc"${RT.scOnly?" checked":""} style="width:auto"> Buy/Sell: hanya yang lolos screener</label>
    <label><input type="checkbox" id="rtbig"${RT.bigOnly?" checked":""} style="width:auto"> Tape: hanya lot besar</label>
  </div></div>
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
  const head=cols.map((h,i)=>{ const on=c&&c.i===i;
    return `<th${h.k?` class="rt-th" data-rt-sort="${id}|${i}"${h.s?"":" data-rt-num=\"1\""} title="Klik untuk urutkan"`:""}>${h.h}${on?(c.d<0?" ▼":" ▲"):""}</th>`; }).join("");
  const body=data.map(r=>`<tr class="${o.cls?o.cls(r):""}">${cols.map(h=>`<td>${h.r(r)}</td>`).join("")}</tr>`).join("");
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
function detail(tk){
  const win=CFG.accWin*60000, now=Date.now(), from=now-win, tr=RT.trades.filter(x=>x.tk===tk&&x.ts>=from);
  const head=`<div class="ex-card" id="rtDetail"><h3>🔎 Detail ${tkc(tk)} — ${CFG.accWin} menit terakhir <button class="ex-btn" data-rt-close="1" style="float:right">✕ Tutup</button></h3>`;
  if(!tr.length) return head+`<div class="ex-mut">Belum ada transaksi ${E(tk)} dalam jendela ini (hanya transaksi yang tertangkap sejak Mulai). Cek ejaan ticker atau aktifkan feed seluruh pasar.</div></div>`;
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
  const lc=[{h:"Harga",k:l=>l.px,r:l=>fpx(l.px)+(l.px===last?" ◀":"")},{h:"Lot beli (HAKA)",k:l=>l.bl,r:l=>`<span class="ex-up">${fpx(l.bl)}</span>`},{h:"Lot jual (HAKI)",k:l=>l.sl,r:l=>`<span class="ex-dn">${fpx(l.sl)}</span>`},
    {h:"Net lot",k:l=>l.net,r:l=>sgn(l.net)},{h:"Total lot",k:l=>l.tot,r:l=>fpx(l.tot)},{h:"Porsi",r:l=>bar(l.tot/mxT*100)}];
  const bk=Array.from(brk.values()).map(b=>Object.assign(b,{net:b.buy-b.sell})).sort((a,b)=>Math.abs(b.net)-Math.abs(a.net)).slice(0,10);
  const bc=[{h:"Broker",s:1,k:b=>b.br,r:b=>`<b>${E(b.br)}</b>`},{h:"Beli",k:b=>b.buy,r:b=>fv(b.buy)},{h:"Jual",k:b=>b.sell,r:b=>fv(b.sell)},{h:"Net",k:b=>b.net,r:b=>`<span class="${b.net>=0?"ex-up":"ex-dn"}">${fv(b.net)}</span>`}];
  return head+`<div class="ex-chips">
    <span class="ex-chip">Harga ${fpx(last)}</span><span class="ex-chip">VWAP ${fpx(Math.round(vwap))}</span>
    <span class="ex-chip">HAKA <span class="ex-up">${fv(bv)}</span> · ${fpx(bl)} lot</span><span class="ex-chip">HAKI <span class="ex-dn">${fv(sv)}</span> · ${fpx(sl)} lot</span>
    <span class="ex-chip">Rasio beli ${Math.round(ratio*100)}%</span>${cu&&cu.bv+cu.sv?`<span class="ex-chip">Sejak Mulai: Buy ${(cu.bv/(cu.bv+cu.sv)*100).toFixed(1)}% / Sell ${(cu.sv/(cu.bv+cu.sv)*100).toFixed(1)}% (${fv(cu.bv)} / ${fv(cu.sv)})</span>`:""}<span class="ex-chip">Net ${sgn(bl-sl)} lot</span>
    <span class="ex-chip">Lot besar: ${nbig} transaksi · terbesar ${fpx(mx)} lot</span>
    <span class="ex-chip" title="Cocokkan dengan Running Trade Stockbit: kalau angka beda jauh, lihat apakah salah satu sumber kosong">Sumber: WS ${nw} trx (${fv(vw)}) · REST ${nr} trx (${fv(vr)})</span></div>
  <div class="ex-mut" style="margin:8px 0 2px">Net beli/jual per menit (kanan = terbaru; hijau = net HAKA, merah = net HAKI)</div>${svg}
  <h3 style="margin-top:12px">Price ladder (20 harga teratas menurut total lot; baris kuning = harga paling ramai)</h3>${stbl("rtld",lc,rows,"-",{cls:l=>l.tot===mxT?"rt-l1":""})}
  <h3 style="margin-top:12px">Broker (net terbesar)</h3>${stbl("rtbk",bc,bk,"Sumber data ini tidak membawa kode broker.")}</div>`;
}

// warna latar kartu -> variabel CSS untuk kolom Ticker yang menempel (supaya tidak tembus pandang)
function cardBg(el){
  try{ if(typeof getComputedStyle!=="function") return; let n=el.querySelector(".ex-card")||el;
    while(n&&n.nodeType===1){ const c=getComputedStyle(n).backgroundColor; if(c&&c!=="transparent"&&!/rgba?\(0,\s*0,\s*0,\s*0\)/.test(c)){ el.style.setProperty("--rt-bg",c); return; } n=n.parentElement; } }catch(e){}
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
  const fq=a=>!RT.q||RT.q.split(/[\s,]+/).some(z=>z&&a.tk.startsWith(z));
  const H=hakaList().filter(fq), A=accList().filter(fq), B=brokerList().filter(fq), F=foreignList().filter(fq), M=marketList().filter(fq);
  const tot=RT.trades.reduce((t,x)=>{ const v=x.px*x.lot*100; return x.side==="B"?[t[0]+v,t[1]]:[t[0],t[1]+v]; },[0,0]);
  const chg=a=>`<span class="${a.chg>=0?"ex-up":"ex-dn"}">${pctS(a.chg)}</span>`;
  const px=a=>`${fpx(a.last)} ${chg(a)}`;
  // keterlambatan & cakupan data
  let t0=Infinity,tl=0; for(const x of RT.trades){ if(x.ts<t0) t0=x.ts; if(x.ts>tl) tl=x.ts; }
  const lag=tl?Math.round((now-tl)/1000):null, openMkt=s.open!==false;
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
  const scCell=a=>a.sc.length?`<button type="button" class="ex-chip rt-scn" data-rt-sc="${E(a.tk)}" title="Klik untuk melihat sinyal apa saja yang lolos">🎯 ${a.sc.length}</button>`:"-";
  const brkCell=(l,tot)=>l.length?`<div style="font-size:12px;line-height:1.35;min-width:130px">${l.map(x=>`<div title="${E(x[0])}: ${fv(x[1])} (${tot?Math.round(x[1]/tot*100):0}% dari total ${fv(tot)})"><b>${E(x[0])}</b> ${fv(x[1])}</div>`).join("")}</div>`:"-";
  const stack=a=>`<div style="display:flex;height:10px;min-width:110px;border-radius:3px;overflow:hidden" title="Buy ${pc1(a.pb)} / Sell ${pc1(a.ps)}"><span style="width:${a.pb.toFixed(1)}%;background:#22c55e"></span><span style="flex:1;background:#ef4444"></span></div>`;
  const BS=bsRows(M,fq), bsB=BS.reduce((t,a)=>t+a.bv,0), bsS=BS.reduce((t,a)=>t+a.sv,0), bsT=bsB+bsS;
  const bsC=[{h:"Ticker",s:1,k:a=>a.tk,r:a=>tkc(a.tk)},{h:"Lolos screener",k:a=>a.sc.length,r:scCell},{h:"Harga",k:a=>a.last,r:a=>fpx(a.last)},{h:"Δ%",k:a=>a.chg,r:chg},
    {h:"Buy (HAKA)",k:a=>a.bv,r:a=>`<span class="ex-up">${fv(a.bv)}</span>`},{h:"Sell (HAKI)",k:a=>a.sv,r:a=>`<span class="ex-dn">${fv(a.sv)}</span>`},
    {h:"Net",k:a=>a.net,r:a=>`<span class="${a.net>=0?"ex-up":"ex-dn"}">${fv(a.net)}</span>`},
    {h:"% Buy",k:a=>a.pb,r:a=>`<span class="${a.pb>=50?"ex-up":"ex-dn"}">${pc1(a.pb)}</span>`},{h:"% Sell",k:a=>a.ps,r:a=>pc1(a.ps)},{h:"Komposisi",r:stack},{h:"Δ% Buy (2m vs 5m)",k:a=>a.ac?a.ac.d:null,r:a=>a.ac&&a.ac.d!=null?`<span class="${a.ac.d>=0?"ex-up":"ex-dn"}" title="%Buy 2 menit terakhir ${a.ac.pbR==null?"-":a.ac.pbR.toFixed(0)}% vs 5 menit sebelumnya ${a.ac.pbB==null?"-":a.ac.pbB.toFixed(0)}%">${a.ac.d>=0?"+":"−"}${Math.abs(a.ac.d).toFixed(0)} pp</span>`:"-"},
    {h:"Tape ×",k:a=>a.ac?a.ac.spike:null,r:a=>a.ac?`<span title="Kecepatan transaksi 2 menit terakhir dibanding rata-rata 5 menit sebelumnya">${a.ac.spike.toFixed(1)}×</span>`:"-"},
    {h:"Tren %Buy 10m",r:a=>a.ac?sparkSvg(a.ac.spark):"-"},
    {h:"Momentum",s:1,k:a=>a.ac&&a.ac.sig||"",r:a=>a.ac&&a.ac.sig==="U"?`<span class="ex-up" style="white-space:nowrap">🚀 Mulai diborong</span>`:a.ac&&a.ac.sig==="D"?`<span class="ex-dn" style="white-space:nowrap">🔻 Mulai dilepas</span>`:"-"},
    {h:"Divergensi",s:1,k:a=>a.dv?a.dv.c:"",r:a=>a.dv?`<span title="${E(a.dv.d)}" style="white-space:nowrap">${a.dv.t}</span>`:"-"},
    {h:"Lot buy",k:a=>a.bl,r:a=>fpx(a.bl)},{h:"Lot sell",k:a=>a.sl,r:a=>fpx(a.sl)},{h:"Net lot",k:a=>a.netL,r:a=>sgn(a.netL)},{h:"% Lot buy",k:a=>a.pl,r:a=>pc1(a.pl)},
    {h:"Trx buy",k:a=>a.nb,r:a=>fpx(a.nb)},{h:"Trx sell",k:a=>a.ns,r:a=>fpx(a.ns)},
    {h:"Top 3 broker Buy",k:a=>a.tb.length?a.tb[0][1]:0,r:a=>brkCell(a.tb,a.bv)},{h:"Top 3 broker Sell",k:a=>a.ts.length?a.ts[0][1]:0,r:a=>brkCell(a.ts,a.sv)}];
  const bsHead=RT.mode==="cum"?`sejak Mulai${RT.cumDay?" · "+E(RT.cumDay):""}`:`${CFG.accWin} menit terakhir`;
  const CF=confList().filter(fq);
  const cfC=[{h:"Ticker",s:1,k:a=>a.tk,r:a=>tkc(a.tk)},{h:"Skor",k:a=>a.score,r:a=>`<b>${a.score}</b>${bar(a.score)}`},{h:"Sinyal",k:a=>a.n,r:a=>a.n+"/8"},
    {h:"Sinyal yang terpenuhi",s:1,k:a=>a.sg.map(x=>x.k).join(""),r:a=>`<div style="display:flex;flex-wrap:wrap;gap:3px;white-space:normal;min-width:180px;max-width:420px">${a.sg.map(x=>`<span class="ex-chip" style="font-size:11px;padding:1px 6px;margin:1px;display:inline-block;white-space:nowrap">${x.t}</span>`).join("")}</div>`},
    {h:"Penalti",s:1,k:a=>a.pen.length,r:a=>a.pen.length?`<span class="ex-dn">${a.pen.join(", ")}</span>`:"-"},
    {h:"Harga",k:a=>a.last,r:a=>fpx(a.last)},{h:"Δ%",k:a=>a.chg,r:chg},{h:"Net nilai",k:a=>a.net,r:a=>`<span class="${a.net>=0?"ex-up":"ex-dn"}">${fv(a.net)}</span>`},{h:"% Buy",k:a=>a.pb,r:a=>pc1(a.pb)}];
  const maxTier=a=>lotTier({tk:a.tk,px:a.last,lot:a.mx});
  // transaksi terbaru & lot besar
  const withTier=x=>Object.assign({},x,{tier:lotTier(x)});
  const tape=[]; for(let i=RT.trades.length-1;i>=0&&tape.length<60;i--){ const x=RT.trades[i]; if(!fq(x)) continue; const y=withTier(x); if(RT.bigOnly&&!y.tier) continue; tape.push(y); }
  const bigFrom=now-CFG.accWin*60000, bigs=[]; for(let i=RT.trades.length-1;i>=0&&bigs.length<150;i--){ const x=RT.trades[i]; if(x.ts<bigFrom) continue; if(!fq(x)||!pxOk(x.tk)||(CFG.minLot&&x.lot<CFG.minLot)) continue; const y=withTier(x); if(y.tier) bigs.push(y); }
  const cnt3=bigs.filter(x=>x.tier>=3).length, cnt2=bigs.filter(x=>x.tier===2).length;
  el.innerHTML=`<div class="ex-card"><div class="ex-mut">
    ${RT.on?"🟢 Merekam":"⚪ Berhenti"}${s.open===false?` · 🔒 Pasar tutup (data terakhir ${E(s.dataDate||"-")})`:""}${lagTxt} · WS: ${s.frames} frame (${s.parsed} terbaca, ${s.unparsed} tidak terbaca${s.quote?", "+s.quote+" mirip kuotasi ditolak":""}) · REST: ${s.rest} baris${CFG.rest?` (${CFG.feed?"seluruh pasar"+(s.watch?" + "+s.watch+" ticker bergiliran":""):s.watch?s.watch+" ticker bergiliran":"seluruh pasar"})`:""}${s.restAt?" · terakhir "+new Date(s.restAt).toLocaleTimeString("id-ID"):""}
    · ${s.trades} transaksi di memori (${s.trades?Math.round(s.brk/s.trades*100):0}% bertanda broker)${s.restored?` (${s.restored} dipulihkan)`:""}${s.est?` (${s.est} sisi ditebak ~)`:""}${s.dup?` · ${s.dup} duplikat WS/REST dibuang`:""} · Total HAKA <span class="ex-up">${fv(tot[0])}</span> / HAKI <span class="ex-dn">${fv(tot[1])}</span></div>
    ${s.symBad>s.symOk?`<div class="ex-warn" style="margin-top:6px">Filter symbols[] tampaknya diabaikan Stockbit (respons berisi saham lain), jadi pemantauan per ticker tidak efektif. Kosongkan Ticker otomatis/manual untuk memakai seluruh pasar, atau kirim contoh respons ke chat.</div>`:""}${s.restErr?`<div class="ex-warn" style="margin-top:6px">REST: ${E(s.restErr)}</div>`:""}${s.trades>=30&&!s.brk?`<div class="ex-warn" style="margin-top:6px">Belum ada kode broker yang terbaca dari ${s.trades} transaksi, jadi kolom Beli → Jual, Top 3 broker, Bandar, dan Asing kosong. Nama field baris REST: <b>${E(RT.restKeys.join(", ")||"-")}</b>. Kirim isi Diagnostik (📋 Salin diagnostik) ke chat bila field broker ada tetapi namanya belum dikenali.</div>`:""}${lagWarn}${covWarn}${feedWarn}${warn}</div>
  ${RT.sel?detail(RT.sel):""}
  <div class="ex-card"><h3>🎯 Konfluensi — saham dengan banyak sinyal sekaligus (${CFG.accWin} menit terakhir, ${CF.length} saham)</h3>
    ${stbl("rtcf",cfC,CF,"Belum ada saham dengan "+CFG.confMin+"+ sinyal. Turunkan \"Min jumlah sinyal konfluensi\" atau tunggu data terkumpul.",{max:30})}
    <div class="ex-mut" style="margin-top:6px">Skor 0–100 dari 8 sinyal: 🔥 HAKA (20), 🧲 Akumulasi (12–20), 🐘 Lot besar (15, net lot besar positif), 🧬 Screener (5–15, Smart Pick/Bullish/Keyakinan/Watchlist), 🐋 Broker dominan (10), 🚀 Momentum (10), 🌍 Asing net beli (5), 🕵 Akumulasi tersembunyi (5). Penalti: ⚠ Distribusi −20, 🔻 Mulai dilepas −20, net jual −10. Sinyal broker/asing butuh data yang membawa kode broker. Ini alat penyaring, bukan rekomendasi beli: cek chart dan Detail Emiten sebelum bertindak.</div></div>
  <div class="ex-card"><h3>🔥 Sedang di-HAKA (${CFG.hakaWin} menit terakhir)</h3>${stbl("rth",hC,H,"Belum ada saham yang memenuhi syarat HAKA.")}</div>
  <div class="ex-card"><h3>🧲 Terakumulasi (${CFG.accWin} menit terakhir)</h3>${stbl("rta",aC,A,"Belum ada saham yang memenuhi syarat akumulasi.")}</div>
  <div class="ex-card"><h3>⚖️ Akumulasi Buy vs Sell per emiten (${bsHead}, ${BS.length} saham)</h3>
    <div class="ex-chips"><span class="ex-chip">Total Buy <span class="ex-up">${fv(bsB)}</span> (${bsT?(bsB/bsT*100).toFixed(1):"0.0"}%)</span><span class="ex-chip">Total Sell <span class="ex-dn">${fv(bsS)}</span> (${bsT?(bsS/bsT*100).toFixed(1):"0.0"}%)</span>${["H","D","P"].map(c=>{ const n=BS.filter(a=>a.dv&&a.dv.c===c).length, t=c==="H"?"🕵 Akumulasi tersembunyi":c==="D"?"⚠ Distribusi":"🧱 Penyerapan jual"; return n?`<span class="ex-chip">${t}: ${n}</span>`:""; }).join("")}</div>
    ${stbl("rtbs",bsC,BS,"Belum ada transaksi.",{max:100})}<div class="ex-mut" style="margin-top:6px">Buy = transaksi HAKA (pembeli agresif), Sell = HAKI (penjual agresif); % dihitung dari nilai (Rp) dan lot. Pilih jendela atau akumulasi sejak Mulai di kotak "Buy/Sell" di atas (mode sejak Mulai tersimpan saat refresh, reset saat hari bursa berganti, dan tidak terkena filter min lot). Hijau pada bar = porsi Buy, merah = porsi Sell. Sisi bertanda ~ di tape adalah tebakan tick-rule. "Momentum" = %Buy 2 menit terakhir vs 5 menit sebelumnya: 🚀 bila naik ≥ 15 poin ke ≥ 60% dengan tape ≥ 1,5× lebih cepat dan net beli berarti, 🔻 kebalikannya; hanya aktif setelah ≥ 7 menit data terkumpul. Tape × = kecepatan transaksi 2 menit terakhir ÷ rata-rata 5 menit sebelumnya. Tren = %Buy per menit 10 menit terakhir. "Divergensi" = indikasi harga vs aliran (🕵 net beli besar tapi harga datar/turun, ⚠ harga naik tapi net jual besar, 🧱 banyak HAKI tapi harga bertahan; hanya heuristik, bukan kepastian). "Lolos screener" = hasil Smart Pick (nama sinyal), Trend Bullish, Keyakinan Tinggi, dan Watchlist/Posisi untuk saham itu; arahkan kursor ke chip untuk nama lengkap. Top 3 broker = 3 broker dengan total nilai beli/jual terbesar di saham itu (kedua sisi transaksi, seperti broker summary; arahkan kursor untuk porsinya); "-" berarti sumber data tidak membawa kode broker.</div></div>
  <div class="ex-card"><h3>🐘 Lot besar (${CFG.accWin} menit terakhir) — ${bigs.length} transaksi${cnt3||cnt2?` (${cnt3} mega, ${cnt2} jumbo)`:""}</h3>
    <div class="ex-mut rt-leg" style="margin-bottom:6px"><span class="rt-l1" style="background:rgba(250,204,21,.3)">🐘 BESAR ≥ batas</span><span style="background:rgba(251,146,60,.4)">🐘🐘 JUMBO ≥ 3×</span><span style="background:rgba(239,68,68,.5)">🐘🐘🐘 MEGA ≥ 10×</span> Batas = "Transaksi besar ≥ (jt Rp)" × pengali likuiditas, atau "Lot besar ≥" bila diisi.</div>
    ${stbl("rtb",trCols,bigs,"Belum ada transaksi lot besar di jendela ini.",{max:60,cls:x=>tcls(x.tier)})}</div>
  <div class="ex-card"><h3>📊 Semua saham (${CFG.accWin} menit terakhir, ${M.length} saham) <button class="ex-btn" data-act="rtCopyMkt" style="float:right">📋 Salin CSV</button></h3>
    ${stbl("rtm",mC,M,"Belum ada transaksi.",{max:80,cls:a=>tcls(maxTier(a))})}<div class="ex-mut" style="margin-top:6px">Tanpa syarat sinyal, hanya filter pengaturan (min trx, harga, lot). Baris diwarnai bila lot terbesar saham itu tergolong besar. Umur = detik sejak transaksi terakhir; Trx/mnt = kecepatan tape. Bandingkan Net nilai & Net lot dengan Stockbit untuk jendela yang sama.</div></div>
  <div class="ex-card"><h3>🐋 Bandar akumulasi — broker net beli (${CFG.accWin} menit terakhir)</h3>${stbl("rtk",bC,B,bEmpty)}<div class="ex-mut" style="margin-top:6px">🐋 = broker menguasai ≥ 40% pembelian saham itu dan net belinya ≥ 2× batas. 🌍 = broker asing. Order beli yang dipecah menjadi banyak transaksi dihitung sebagai satu "beli besar".</div></div>
  <div class="ex-card"><h3>🌍 Aliran asing — net beli/jual broker asing (${CFG.accWin} menit terakhir)</h3>${stbl("rtf",fC,F,fEmpty)}<div class="ex-mut" style="margin-top:6px">Net = beli asing − jual asing (hijau = net beli, merah = net jual). Porsi = rata-rata porsi sisi beli dan jual yang dipegang broker asing. Batas memakai Min net broker/bandar.</div></div>
  ${sigHtml()}
  <div class="ex-card"><h3>Transaksi terbaru${RT.bigOnly?" (hanya lot besar)":""}</h3>${stbl("rtt",trCols,tape,"Belum ada transaksi.",{cls:x=>tcls(x.tier)})}</div>
  <div class="ex-card"><details${RT.diagOpen?" open":""}><summary class="ex-mut" style="cursor:pointer">Diagnostik format data</summary>
    <div class="ex-mut" style="margin:8px 0;line-height:1.55">Contoh frame yang tidak terbaca (maks 5 terakhir). Kalau transaksi tetap 0 padahal frame terus masuk, format WebSocket belum cocok dengan parser; salin contoh ini ke chat supaya parser disesuaikan, atau pakai sumber REST. Kalau transaksi WS tetap 0 padahal frame masuk dan "mirip kuotasi ditolak" besar, matikan opsi "Tolak frame mirip kuotasi".</div>
    <button class="ex-btn" data-act="rtCopyDiag">📋 Salin diagnostik</button>
    <pre class="mono" style="white-space:pre-wrap;word-break:break-all;font-size:11px">Nama field baris REST: ${E(RT.restKeys.join(", ")||"(belum ada)")}\n\nContoh baris REST (3 pertama):\n${RT.restRaw.length?RT.restRaw.map(E).join("\n\n"):"(belum ada)"}\n\nFrame WS pertama diterima:\n${RT.first.length?RT.first.map(E).join("\n\n"):"(belum ada)"}\n\nTidak terbaca:\n${RT.samples.length?RT.samples.map(E).join("\n\n"):"(belum ada)"}</pre></details></div>`;
  cardBg(el);
  el.querySelectorAll(".ex-wrap").forEach(w=>{ const p=sc[w.getAttribute("data-rt-w")]; if(p){ w.scrollLeft=p.x; w.scrollTop=p.y; } });
  syncBars(el);
  RT.mkt=M; RT.mktCols=mC;
}
/* ---------- riwayat sinyal & hit-rate ---------- */
const TY={H:"🔥 HAKA",A:"🧲 Akumulasi",B:"🐋 Bandar",L:"🐘 Lot besar",M:"🚀 Momentum",C:"🎯 Konfluensi"};
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
    feed:g("rt-feed").checked,rejQuote:g("rt-quote").checked,bigAlert:g("rt-balert").checked,momAlert:g("rt-malert").checked,confAlert:g("rt-calert").checked,confMin:Math.max(1,Math.min(8,n("rt-cmin",3))),
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
X.act("rtCopySig",()=>copy(["waktu,jenis,ticker,harga,p15,p30,info"].concat(sigs().map(g=>[new Date(g.ts).toISOString(),g.ty,g.tk,g.px,g.p15,g.p30,'"'+(g.info||"")+'"'].join(","))).join("\n"),"Riwayat sinyal disalin"));
X.act("rtCopyDiag",()=>copy(JSON.stringify({stats:RT.st,cfg:{ws:CFG.ws,rest:CFG.rest,feed:CFG.feed,rejQuote:CFG.rejQuote,url:CFG.url},first:RT.first,restKeys:RT.restKeys,rest:RT.restRaw,unparsed:RT.samples},null,1),"Diagnostik disalin — tempel ke chat"));
X.act("rtCopyMkt",()=>{       // CSV tabel Semua saham sesuai urutan sort yang sedang aktif
  const M=(RT.mkt||[]).slice(), c=RT.sort.rtm; if(c&&RT.mktCols[c.i]&&RT.mktCols[c.i].k){ const k=RT.mktCols[c.i].k; M.sort((a,b)=>{ const x=k(a),y=k(b); return (typeof x==="string"?x.localeCompare(y):x-y)*c.d; }); }
  copy(["ticker,harga,chg_pct,nilai_total,net_nilai,rasio_beli,lot_beli,lot_jual,net_lot,lot_besar_n,net_lot_besar,lot_terbesar,trx_per_menit,umur_dtk"].concat(M.map(a=>[a.tk,a.last,a.chg.toFixed(2),Math.round(a.vt),Math.round(a.net),(a.ratio*100).toFixed(0),a.bl,a.sl,a.netL,a.big,a.bigNet,a.mx,a.rate.toFixed(1),a.age].join(","))).join("\n"),"Tabel Semua saham disalin");
});
Object.keys(PRESETS).forEach(k=>X.act("rtPre_"+k,()=>{ readCfg(); applyPreset(PRESETS[k].v,PRESETS[k].n); }));
X.act("rtPreSave",()=>{ readCfg(); const v={}; PRE_KEYS.forEach(k=>{ v[k]=CFG[k]; }); SV("rt_preset_user",v); X.repaint(); dyn(); X.toast("Pengaturan disimpan sebagai Preset saya","up"); });
X.act("rtPreUser",()=>{ const v=userPre(); if(!v){ X.toast("Belum ada Preset saya — atur dulu, lalu klik ➕ Simpan pengaturan ini","down"); return; } applyPreset(v,"💾 Preset saya"); });
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
const SC_SRC={"Trend Bullish":"Trend harga Bullish di tab Screener","Keyakinan Tinggi":"Skor keyakinan tinggi di tab Screener","Watchlist/Posisi":"Ada di Watchlist atau Posisi Anda"};
function closeScPop(){ const o=document.getElementById("rtScPop"); if(o) o.remove(); }
function openScPop(btn){
  const tk=btn.getAttribute("data-rt-sc"), was=document.getElementById("rtScPop");
  const same=was&&was.getAttribute("data-tk")===tk; closeScPop(); if(same) return;
  const l=scStatus(tk);
  const pop=document.createElement("div"); pop.id="rtScPop"; pop.setAttribute("data-tk",tk);
  pop.innerHTML=`<div class="rt-pt"><b>${E(tk)} — lolos ${l.length} screener</b><button type="button" class="ex-btn" data-rt-scx="1" title="Tutup">✕</button></div>`
    +(l.length?l.map(x=>`<div class="rt-pi">${x.i} <b>${E(x.t)}</b><div class="rt-ps">${E(SC_SRC[x.t]||"Smart Pick")}</div></div>`).join(""):`<div class="rt-ps">Sudah tidak lolos screener apa pun.</div>`)
    +`<div style="margin-top:8px"><button type="button" class="ex-btn" data-rt-scd="${E(tk)}">🔎 Buka Detail Emiten</button></div>`;
  document.body.appendChild(pop);
  const r=btn.getBoundingClientRect(), w=pop.offsetWidth, h=pop.offsetHeight;
  let x=Math.min(Math.max(8,r.left),window.innerWidth-w-8), y=r.bottom+6; if(y+h>window.innerHeight-8) y=Math.max(8,r.top-h-6);
  pop.style.left=x+"px"; pop.style.top=y+"px";
}
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeScPop(); });
window.addEventListener("scroll",closeScPop,true);
document.addEventListener("click",e=>{
  const c=e.target&&e.target.closest?e.target.closest.bind(e.target):null; if(!c) return;
  let n=c("[data-rt-sc]"); if(n){ openScPop(n); return; }
  n=c("[data-rt-scd]"); if(n){ const tk=n.getAttribute("data-rt-scd"); closeScPop(); openFull(tk); return; }
  if(c("[data-rt-scx]")){ closeScPop(); return; }
  if(!c("#rtScPop")) closeScPop();
  n=c("[data-rt-sort]"); if(n){ sortClick(n); return; }
  n=c("[data-rt-full]"); if(n){ openFull(n.getAttribute("data-rt-full")); return; }
  n=c("[data-rt-tk]"); if(n){ pickTk(n.getAttribute("data-rt-tk")); return; }
  n=c("[data-rt-close]"); if(n){ RT.sel=""; const i=document.getElementById("rtsel"); if(i) i.value=""; dyn(); }
});
document.addEventListener("input",e=>{ const t=e.target; if(t&&t.id==="rtq"){ RT.q=t.value.trim().toUpperCase(); dyn(); } });
document.addEventListener("change",e=>{
  const t=e.target; if(!t||!t.id) return;
  if(t.id==="rtsel"){ RT.sel=t.value.trim().toUpperCase().replace(/[^A-Z]/g,""); dyn(); }
  else if(t.id==="rtbig"){ RT.bigOnly=t.checked; dyn(); }
  else if(t.id==="rtmo"){ RT.momOnly=t.checked; dyn(); }
  else if(t.id==="rtdv"){ RT.dvOnly=t.checked; dyn(); }
  else if(t.id==="rtsc"){ RT.scOnly=t.checked; dyn(); }
  else if(t.id==="rtmode"){ RT.mode=t.value==="cum"?"cum":"win"; SV("rt_mode",RT.mode); dyn(); }
});
loadTrades();
window.addEventListener("pagehide",saveTrades);
setInterval(saveTrades,15000);
X.addTab("rt","⚡ Running Trade",view,dyn);
setInterval(()=>{
  try{
    alerts(); evalSigs();
    const pg=document.getElementById("exPage");
    if(pg&&pg.classList.contains("on")&&X.current()==="rt"){ fitWidth(); dyn(); }
  }catch(e){ console.warn("running-trade:",e); }
},1500);
})();
