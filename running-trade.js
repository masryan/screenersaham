// running-trade.js — Running Trade Stockbit: deteksi saham yang sedang di-HAKA dan diakumulasi.
// Dimuat SETELAH extras.js (butuh window.ExtrasAPI). Tidak mengubah app.js.
// Muncul sebagai tab "⚡ Running Trade" di Trader Tools.
// v3.13: tabel "📈 Naik vs close kemarin / open hari ini" (acuan dari tabel flows; ambang, acuan, dan syarat aliran HAKA/net beli diatur di pengaturan "Tabel Gain"), kolom HAKA/HAKI/Rasio/HAKA 60 dtk, alert saat saham baru masuk.
// v3.12: pembanding pasar di hit-rate, ukuran posisi, filter likuiditas, lama bertahan, konfirmasi lintas jendela, pelacak posisi, uji ulang parameter, arah sektor.
// v3.11: filter zona entri + R:R, skor Screener di konfluensi, uji TP1/SL, Telegram rencana trading, badge kesegaran data, broker favorit, Skor gabungan.
// v3: kolom RSI 7/14/21, skor teknikal & fundamental, zona entri/stop loss/take profit di semua tabel per saham; Top 3 broker diperbaiki (cadangan harian per saham, mundur ke hari bursa terakhir); validasi sel tabel.
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
{ const D={zoneOnly:false,rrMin:1.5,confScr:true,tgPlan:false,tgPlanScore:75,favBrk:"",favAlert:false,modal:0,riskPct:1,minRate:0,persMin:0,confSec:true,liqPos:25,freshHour:18,gainMin:2,gainAlert:true,gainBase:"close",gainFlow:"all"}; for(const k in D) if(CFG[k]===undefined) CFG[k]=D[k]; }
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
  if(typeof str==="string"&&(/^\d{0,2}$/.test(str.trim())||/primus::(pong|ping)/.test(str)||/^\[binary\/non-string data, \d{1,3} bytes/.test(str))){ RT.st.ping=(RT.st.ping||0)+1; return; }   // keepalive Primus/socket.io: bukan data, jangan memenuhi diagnostik
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
  let cursor=null, all=[], dt=null, capped=false; const maxPg=want?3:8;
  for(let pg=0;pg<maxPg;pg++){                    // trade_number = kursor: ambil halaman lebih lama kalau 1 halaman penuh transaksi baru (feed pasar: sampai 8 halaman)
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
    if(pg===maxPg-1) capped=true;                    // halaman terakhir masih penuh transaksi baru: sebagian mungkin terlewat
  }
  if(capped){ RT.gap=RT.gap||{}; RT.st.gapN=(RT.st.gapN||0)+1; if(want) RT.gap[want]=Date.now(); else RT.gapFeedAt=Date.now(); }
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
    const hotT=Object.keys(RT.gap||{}).filter(k=>Date.now()-RT.gap[k]<90000&&!tks.includes(k)).slice(0,2); tks=tks.concat(hotT);   // saham yang terpotong: tarik lagi segera
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
  const fol=(typeof POS!=="undefined"&&Array.isArray(POS))?POS.filter(q=>!q.cl).map(q=>q.tk):[];   // posisi yang diikuti harus selalu dipantau harganya
  return [...new Set(man.concat(fol,auto))].slice(0,60);
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
    const sc=scale(tk); if(CFG.adapt&&Math.abs(sc-1)>.05) b+=` <span class="ex-mut" title="Batas nilai dikali ${sc.toFixed(2)} sesuai likuiditas saham → HAKA min ${Math.round(CFG.hakaMinJt*sc)} jt, akumulasi min ${Math.round(CFG.accMinJt*sc)} jt, transaksi besar ≥ ${Math.round(CFG.bigJt*sc)} jt (matikan Batas menyesuaikan likuiditas untuk memakai angka tetap)">×${sc.toFixed(1)}</span>`;
    if(RT.gap&&Date.now()-(RT.gap[tk]||0)<180000) b+=` <span title="Transaksi saham ini terlalu ramai untuk satu tarikan REST; sebagian mungkin terlewat, jadi nilai HAKA bisa lebih kecil dari Stockbit">⚠</span>`;
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
      tb:light?[]:(topN(bm.bb,3).length?topN(bm.bb,3):bdTop(a.tk,"buy",3)),ts:light?[]:(topN(bm.bs,3).length?topN(bm.bs,3):bdTop(a.tk,"sell",3)),bdy:light?false:!(topN(bm.bb,3).length||topN(bm.bs,3).length)&&!!bdOk(a.tk),bdyB:light?false:!topN(bm.bb,3).length&&!!bdOk(a.tk),bdyS:light?false:!topN(bm.bs,3).length&&!!bdOk(a.tk),nbd:light?false:!(topN(bm.bb,3).length&&topN(bm.bs,3).length),sc:light?[]:scStatus(a.tk),ac:light?null:(am.get(a.tk)||null)}; }).map(r=>{ if(!light) r.dv=divOf(r); return r; }).filter(a=>light||((!RT.scOnly||a.sc.length)&&(!RT.dvOnly||a.dv)&&(!RT.momOnly||(a.ac&&a.ac.sig))));
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
const prevWd=iso=>{ const d=new Date(iso+"T00:00:00Z"); do{ d.setUTCDate(d.getUTCDate()-1); }while(d.getUTCDay()===0||d.getUTCDay()===6); return d.toISOString().slice(0,10); };
async function bdFetch(tk){
  // Broker Summary harian: hari data terakhir; kalau kosong (libur/belum rilis) mundur sampai 4 hari bursa. e.day = tanggal yang benar-benar terpakai.
  let day=RT.st.dataDate||(typeof todayLocalISO==="function"?todayLocalISO():new Date().toISOString().slice(0,10)); const e={at:Date.now(),ok:false,buy:[],sell:[],day};
  try{
    for(let k=0;k<5&&!e.ok;k++){
      const res=await stockbitFetchMarketDetector(tk,day,day,1);
      if(!res||res.error){ e.err=(res&&res.error)||"respons kosong"; RT.bdErr=e.err; break; }
      const by=parseStockbitMarketDetector(res.raw,day), d=by&&by[day];
      if(d&&((d.buy&&d.buy.length)||(d.sell&&d.sell.length))){ e.ok=true; e.buy=d.buy||[]; e.sell=d.sell||[]; e.day=day; RT.bdErr=null; }
      else { e.err="Tidak ada data broker untuk "+day; day=prevWd(day); await new Promise(r=>setTimeout(r,250)); }
    }
  }catch(x){ e.err=String(x&&x.message||x); RT.bdErr=e.err; }
  RT.bday.set(tk,e);
}
async function bdTick(){
  if(!CFG.bday||RT.bdBusy||!RT.on||typeof stockbitFetchMarketDetector!=="function"||typeof parseStockbitMarketDetector!=="function") return;
  const s=RT.st, need=s.trades>=30&&s.brk/s.trades<0.1, want=[];      // "need" = running trade hampir tidak membawa broker
  if(RT.sel) want.push(RT.sel);
  RT.bdWant.forEach(t=>want.push(t));                                   // saham yang barisnya masih kosong Top 3 broker-nya (tersusun dari volume terbesar)
  if(need) confList().slice(0,10).forEach(r=>want.push(r.tk));
  const now=Date.now(), seen=new Set(), q=[];
  want.forEach(t=>{ if(seen.has(t)) return; seen.add(t); const e=RT.bday.get(t); if(!e||now-e.at>(e.ok?180000:90000)) q.push(t); });
  if(!q.length) return; RT.bdBusy=true;
  try{ for(const t of q.slice(0,6)){ await bdFetch(t); await new Promise(r=>setTimeout(r,300)); } } finally{ RT.bdBusy=false; RT.dirty++; }
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
    if(a.n<6||a.v<thr(a.tk,CFG.bigJt)*2||!okTk(a.tk,1e9,own)) return;
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
function confAll(){
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
    const base=Math.round(clamp(pts,0,100)), bon=[];      // base = murni aliran transaksi (dipakai Skor gabungan agar teknikal/fundamental tidak dihitung dua kali)
    if(CFG.confScr&&sg.length>=Math.max(1,CFG.confMin)){  // penyesuaian skor Screener hanya untuk kandidat yang sudah lolos min sinyal
      const t=techOf(a.tk);
      if(t.ts!=null&&t.tsMax){ const q=t.ts/t.tsMax; if(q>=.7){ pts+=5; bon.push("📐 Teknikal kuat +5"); } else if(q<.4){ pts-=5; pen.push("📐 Teknikal lemah −5"); } }
      if(t.fs!=null&&t.fsMax){ const q=t.fs/t.fsMax; if(q>=.7){ pts+=5; bon.push("🏢 Fundamental kuat +5"); } else if(q<.35){ pts-=10; pen.push("🏢 Fundamental sangat lemah −10"); } }
    }
    if(CFG.confSec&&sg.length>=Math.max(1,CFG.confMin)){   // arah aliran sektor (min 3 saham aktif di sektor itu)
      const k=secOf(a.tk), o=k!=="(Tanpa sektor)"?secFlow().get(k):null;
      if(o&&o.n>=3){ if(o.pb>=55&&o.net>0){ pts+=5; bon.push("🏭 Sektor net beli +5"); } else if(o.pb<45){ pts-=5; pen.push("🏭 Sektor dilepas −5"); } }
    }
    const score=Math.round(clamp(pts,0,100));
    out.push({tk:a.tk,last:a.last,chg:a.chg,net:a.net,pb:a.ratio*100,score,base,n:sg.length,sg,pen,bon});
  });
  return out;
}
function confList(){
  return confAll().filter(r=>r.n>=Math.max(1,CFG.confMin)&&r.score>0).sort((a,b)=>b.score-a.score||b.n-a.n||b.net-a.net);
}

/* ---------- panduan: aturan main membaca sinyal untuk entri & jual ---------- */
const GUIDE_CHK=["Masuk tabel 🎯 Konfluensi dengan jumlah sinyal ≥ batas Anda","Kolom <b>Konfirmasi jendela</b> = 3/3 (1 mnt, jendela akumulasi, dan sejak Mulai sama-sama net beli)","Kolom <b>Bertahan</b> sudah beberapa menit (bukan muncul sesaat)","Status zona <b>Di zona entri</b> dan R:R ≥ batas (bukan ⏰ Telat atau ⬇ Di bawah zona)","Dukungan <b>Bandar</b>: ada broker pembeli dominan, dan saham tidak sepi (tanda ×0,3 / transaksi sedikit = waspada)","Tidak ada tanda ⚠ Distribusi, 🧱 Penyerapan jual, atau 🔻 anjlok","Chart searah: tidak menabrak resistance dan tren tidak melawan"];
function guideHtml(){
  const open=LS("rt_guide_open",false)?" open":"", tr=(a,b,c)=>`<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`;
  return `<details class="ex-card" id="rtGuide"${open}><summary style="cursor:pointer"><b>📖 Aturan main</b> <span class="ex-mut">— cara membaca sinyal untuk entri &amp; jual (panduan belajar)</span></summary>
  <div style="font-size:13px;line-height:1.6;margin-top:8px">
    <p><b>Prinsip dasar.</b> Running Trade mengukur <i>aliran transaksi</i>: siapa yang agresif membeli (HAKA) atau menjual (HAKI). Ini bukan ramalan harga, dan tidak ada satu tabel yang cukup untuk memutuskan. Perlakukan tiap tabel sebagai <b>saringan</b>, lalu tumpuk beberapa saringan. <span class="ex-mut">Pengaturan Anda sekarang: preset <b>${E(presetName())}</b> · min konfluensi <b>${CFG.confMin}</b> sinyal · biaya bolak-balik <b>${+CFG.cost||0}%</b>.</span></p>

    <h4 style="margin:10px 0 4px">Alur 5 langkah</h4>
    <ol style="margin:0 0 6px 18px;padding:0">
      <li><b>Saring</b> — lihat 🎯 Konfluensi (gabungan HAKA, akumulasi, bandar, lot besar, momentum). Jangan turun dari 3 sinyal.</li>
      <li><b>Konfirmasi</b> — cek kolom <i>Konfirmasi jendela</i> (3/3) dan <i>Bertahan</i>. Aliran yang hanya muncul di 1 menit sering cuma satu transaksi besar.</li>
      <li><b>Cek zona</b> — masuk hanya bila status <i>Di zona entri</i>. ⏰ Telat berarti sudah lari; ⬇ Di bawah zona lebih baik ditunggu daripada ditebak; “Zona perkiraan” tidak bisa dinilai.</li>
      <li><b>Eksekusi</b> — klik 📌 untuk mengikuti rencana (entri, SL, TP1, TP2). Alert SL/TP berjalan selama ▶ Mulai aktif dan tab terbuka. Ini pemantau, bukan pengganti order di sekuritas.</li>
      <li><b>Kelola</b> — pantau tanda keluar di bawah. Pertimbangkan jual sebagian di TP1, bukan semuanya di satu titik.</li>
    </ol>

    <h4 style="margin:10px 0 4px">Checklist entri <span class="ex-mut" style="font-weight:400">(centang sendiri untuk latihan)</span></h4>
    <div id="rtChk">${GUIDE_CHK.map((t,i)=>`<label style="display:block;margin:2px 0"><input type="checkbox" data-rt-chk="${i}"> ${t}</label>`).join("")}</div>
    <div id="rtChkN" class="ex-mut" style="margin:4px 0 8px">0/${GUIDE_CHK.length} terpenuhi — makin banyak yang terpenuhi, makin kuat alasannya; sedikit = lebih baik menunggu.</div>

    <h4 style="margin:10px 0 4px">Tanda untuk keluar / jual</h4>
    <div class="ex-wrap"><table class="ex-tbl"><thead><tr><th>Tanda</th><th>Artinya</th><th>Yang bisa dipertimbangkan</th></tr></thead><tbody>
      ${tr("Harga menyentuh SL","Rencana gagal","Keluar sesuai rencana; jangan menggeser SL")}
      ${tr("Harga menyentuh TP1 / TP2","Target tercapai","Jual sebagian di TP1, sisanya sampai TP2")}
      ${tr("% Buy turun di bawah 50% dan bertahan, atau 🔻 anjlok","Pembeli agresif berhenti / berbalik","Kurangi atau keluar")}
      ${tr("⚠ Distribusi","Harga naik tetapi net jual besar","Waspada, amankan sebagian")}
      ${tr("🧱 Penyerapan jual","Banyak HAKI tetapi harga bertahan","Awasi; bisa berbalik ke dua arah")}
      ${tr("Bandar berbalik net jual (tabel 🐋 Bandar)","Broker pembeli utama mulai melepas","Kurangi atau keluar")}
    </tbody></table></div>

    <h4 style="margin:10px 0 4px">Tanda derau (jangan terlalu dipercaya)</h4>
    <ul style="margin:0 0 6px 18px;padding:0">
      <li>Saham bertanda <b>×0,3</b> / sepi: satu transaksi besar bisa memicu semua sinyal.</li>
      <li>Data REST itu sampling dan sisi HAKA/HAKI kadang tebakan tick-rule, jadi angkanya bisa meleset dari Stockbit.</li>
      <li>Data yang basi: kalau tabel berhenti bergerak, cek ▶ Mulai, token, dan umur harga di tabel Posisi.</li>
      <li>Aliran beli besar tetap bisa gagal. Selalu konfirmasi dengan chart.</li>
    </ul>

    <h4 style="margin:10px 0 4px">Cara belajar yang disarankan</h4>
    <ol style="margin:0 0 6px 18px;padding:0">
      <li>Pilih <b>satu preset</b> (Scalping atau Intraday) dan jangan gonta-ganti selama beberapa hari, supaya datanya bisa dibandingkan.</li>
      <li>Biarkan ▶ Mulai berjalan saat bursa buka; sinyal tercatat otomatis.</li>
      <li>Buka tabel <b>📈 Hit-rate sinyal</b>: lihat jenis sinyal mana yang rata-rata positif di +5/+15/+30 menit <b>setelah biaya</b> (kolom “Hit +30m &gt; biaya”).</li>
      <li>Perhatikan juga rentang kepercayaan 95%: sampel yang masih sedikit belum bisa disimpulkan (rentangnya akan lebar).</li>
      <li>Fokuskan latihan pada jenis sinyal yang konsisten, abaikan yang tidak.</li>
    </ol>

    <h4 style="margin:10px 0 4px">Kamus singkat</h4>
    <div class="ex-mut"><b>HAKA</b> = beli agresif (menyerbu harga jual) · <b>HAKI</b> = jual agresif · <b>Net</b> = beli − jual · <b>Rasio</b> = porsi beli dari total transaksi · <b>×0,3 / ×1,2</b> = pengali batas nilai sesuai likuiditas saham · <b>Zona</b>: Di zona entri / ⏰ Telat / ⬇ Di bawah zona / ⛔ Tembus SL · <b>Konfirmasi jendela 3/3</b> = 1 mnt, jendela akumulasi, dan sejak Mulai sama-sama net beli.</div>
    <div class="ex-mut" style="margin-top:8px">Panduan ini materi belajar, bukan rekomendasi beli atau jual. Keputusan dan risikonya tetap di tangan Anda.</div>
  </div></details>`;
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
const userPres=()=>{                 // daftar preset buatan sendiri: [{id,n,v}]; preset tunggal lama ("Preset saya") dimigrasi otomatis
  let l=LS("rt_presets_user",null);
  if(!Array.isArray(l)){ l=[]; const old=LS("rt_preset_user",null); if(old&&typeof old==="object"){ l.push({id:"p"+Date.now().toString(36),n:"Preset saya",v:old}); SV("rt_presets_user",l); } }
  return l.filter(q=>q&&q.id&&q.n&&q.v&&typeof q.v==="object");
};
const sameP=(v)=>!!v&&PRE_KEYS.every(k=>+CFG[k]===+v[k]);
function presetName(){ for(const k in PRESETS) if(sameP(PRESETS[k].v)) return PRESETS[k].n; const u=userPres().find(q=>sameP(q.v)); return u?"💾 "+u.n:"Kustom"; }
function applyPreset(v,nama){
  PRE_KEYS.forEach(k=>{ if(v[k]!=null) CFG[k]=v[k]; });
  RT.mm={}; SV("rt_cfg",CFG); applyPoll(); X.repaint(); dyn(); X.toast("Preset "+nama+" diterapkan","up");
}

/* ---------- ekspor semua tabel ---------- */
const csvCell=v=>{ if(v==null) return ""; if(typeof v==="number") return isFinite(v)?String(+v.toFixed(4)):""; const t=String(v).replace(/"/g,'""'); return /[",\n]/.test(t)?'"'+t+'"':t; };
const EXP_EXTRA={rtbdb:"Detail: Top 5 Buy broker",rtbds:"Detail: Top 5 Sell broker",rtld:"Detail: Price ladder",rtbk:"Detail: Broker (net terbesar)"};
const expName=id=>String(TBL_NAMES[id]||EXP_EXTRA[id]||id);
function tblLines(id){
  const t=RT.tblData[id]; if(!t||!t.rows.length) return null; const cs=t.cols.filter(h=>h.k), L=[];
  L.push(cs.map(h=>csvCell(String(h.h).replace(/<[^>]*>/g,""))).join(","));
  t.rows.forEach(r=>L.push(cs.map(h=>{ let v; try{ v=h.k(r); }catch(e){ v=null; } if(h.h==="Waktu"&&typeof v==="number") v=new Date(v).toISOString(); return csvCell(v); }).join(",")));
  return L;
}
function exportTable(id){ const L=tblLines(id); return L?L.join("\n"):""; }
function exportCsv(){
  const L=["# Running Trade — ekspor "+new Date().toLocaleString("id-ID")+" · jendela akumulasi "+CFG.accWin+" mnt · mode Buy/Sell: "+(RT.mode==="cum"?"sejak Mulai":"jendela")+" · nilai Rp, lot, dan persen sebagai angka mentah (kolom grafik dilewati)"];
  Object.keys(RT.tblData).forEach(id=>{
    const tl=tblLines(id); if(!tl) return;
    L.push("","## "+expName(id)); tl.forEach(x=>L.push(x));
  });
  return L.join("\n");
}
function dlCsv(text,name){
  try{ const b=new Blob(["\ufeff"+text],{type:"text/csv;charset=utf-8"}), u=URL.createObjectURL(b), a=document.createElement("a"); a.href=u; a.download="running-trade-"+(name?name+"-":"")+new Date().toISOString().slice(0,16).replace(/[-:T]/g,"")+".csv"; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(u); a.remove(); },500); X.toast("CSV diunduh","up"); }
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
const TBL_NAMES={rtg:"📈 Gain harian",rtsk:"🏭 Sektor",rtrp:"🔁 Order berulang",rths:"📈 Hit-rate sinyal",rtbs:"⚖️ Buy vs Sell",rtm:"📊 Semua saham",rtb:"🐘 Lot besar",rtcf:"🎯 Konfluensi",rth:"🔥 HAKA",rta:"🧲 Terakumulasi",rtk:"🐋 Bandar",rtf:"🌍 Asing",rtt:"Transaksi terbaru"};
function colPanel(){
  const el=document.getElementById("rtColCard"); if(!el) return; const ids=Object.keys(TBL_NAMES).filter(i=>RT.colReg[i]);
  el.innerHTML=`<h3>🧩 Atur kolom tampil</h3><div class="ex-mut">Centang kolom yang ingin ditampilkan (kolom pertama selalu tampil). Pengaturan tersimpan. Kolom tambahan v3.12 (Ukuran posisi, Likuiditas, Konfirmasi jendela, Bertahan, Arah sektor, Broker favorit) tersembunyi sampai Anda mencentangnya; Ukuran posisi dan Broker favorit muncul otomatis begitu Modal / broker favorit diisi.</div>`+(ids.length?ids.map(id=>{ const hd=hidOf(id);
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
  return `<div class="ex-card"><h3>⚡ Running Trade — deteksi HAKA &amp; akumulasi <span class="ex-mut" style="font-weight:400;font-size:12px">v3.12 · pembanding pasar, ukuran posisi, pelacak posisi, uji ulang parameter</span></h3>
  <div class="ex-mut" style="margin-bottom:10px;line-height:1.55">HAKA = pembeli agresif menyambar offer; nilai dihitung dari harga × lot × 100. ⭐ = Watchlist/posisi, ✨ = lolos Smart Pick (arahkan kursor untuk nama sinyalnya), 📈 = trend Bullish di Screener, ✅ = keyakinan tinggi. Batas nilai (HAKA, akumulasi, bandar, transaksi besar) dikalikan ×N sesuai likuiditas saham (acuan di pengaturan; saham sepi 0.3×, sangat likuid sampai 5×). Deteksi memakai transaksi yang tertangkap sejak tombol Mulai ditekan, jadi butuh beberapa menit untuk terisi. Klik judul kolom untuk mengurutkan, klik nama ticker untuk membuka Detail Emiten (analisa lengkap), klik 🔎 untuk panel detail running trade.</div>
  <div class="rt-tools" style="margin:0 0 12px"><b>Preset ambang:</b>
    ${Object.keys(PRESETS).map(k=>`<button class="ex-btn ${sameP(PRESETS[k].v)?"pri":""}" data-act="rtPre_${k}" title="${E(PRESETS[k].d)}">${PRESETS[k].n}</button>`).join("")}
    ${userPres().map(q=>`<span style="display:inline-flex;gap:2px;align-items:center"><button class="ex-btn ${sameP(q.v)?"pri":""}" data-rt-upre="${E(q.id)}" title="Pakai preset ini">💾 ${E(q.n)}</button><button class="ex-btn" data-rt-udel="${E(q.id)}" title="Hapus preset ini" style="padding:0 6px">✕</button></span>`).join("")}
    <button class="ex-btn" data-act="rtPreSave" title="Simpan ambang & jendela saat ini sebagai preset baru (nama yang sama = timpa preset itu)">➕ Simpan pengaturan ini</button>
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
    <label>Tabel Gain: min kenaikan (%; 0 = semua yang naik)${inp("rt-gain",CFG.gainMin,"type=\"number\" step=\"0.1\" min=\"0\"")}</label>
    <label>Tabel Gain: acuan kenaikan<select id="rt-gbase"><option value="close"${CFG.gainBase!=="open"?" selected":""}>Close kemarin</option><option value="open"${CFG.gainBase==="open"?" selected":""}>Open hari ini</option></select></label>
    <label>Tabel Gain: syarat aliran beli<select id="rt-gflow"><option value="all"${CFG.gainFlow==="all"||!CFG.gainFlow?" selected":""}>Semua yang naik</option><option value="net"${CFG.gainFlow==="net"?" selected":""}>Net beli (HAKA &gt; HAKI di jendela HAKA)</option><option value="haka"${CFG.gainFlow==="haka"?" selected":""}>Lolos tabel 🔥 HAKA</option></select></label>
    ${ck("rt-tick",CFG.tick)}Tebak sisi dengan tick-rule bila kosong</label>
    ${ck("rt-quote",CFG.rejQuote)}Tolak frame mirip kuotasi (tanpa id/waktu/sisi)</label>
    ${ck("rt-tg",CFG.tg)}Kirim alert ke Telegram</label>
    ${ck("rt-bn",CFG.bn)}Notifikasi browser saat tab tidak aktif</label>
    ${ck("rt-snd",CFG.snd)}Bunyi saat alert</label>
    ${ck("rt-balert",CFG.bigAlert)}Alert lot JUMBO/MEGA 🐘</label>
    ${ck("rt-malert",CFG.momAlert)}Alert momentum 🚀/🔻 (%Buy melonjak/anjlok)</label>
    ${ck("rt-galert",CFG.gainAlert)}Alert 📈 saat saham baru masuk Tabel Gain (naik ≥ ambang &amp; lolos syarat aliran) (sekali per saham per hari)</label>
    <label>Min jumlah sinyal konfluensi (1–8)${inp("rt-cmin",CFG.confMin)}</label>
    ${ck("rt-calert",CFG.confAlert)}Alert konfluensi 🎯 (skor ≥ 75, ≥ 4 sinyal)</label>
    ${ck("rt-zone",CFG.zoneOnly)}Tabel hanya saham yang harganya masih di zona entri &amp; R:R ≥ batas</label>
    <label>Min R:R ke TP1 (dari harga live)${inp("rt-rrmin",CFG.rrMin)}</label>
    ${ck("rt-scr",CFG.confScr)}Konfluensi: tambah/kurangi skor dengan skor teknikal &amp; fundamental Screener</label>
    ${ck("rt-tgp",CFG.tgPlan)}Telegram: kirim rencana trading untuk sinyal lengkap (konfluensi tinggi + di zona entri + net beli)</label>
    <label>Skor konfluensi min untuk Telegram rencana (1–100)${inp("rt-tgps",CFG.tgPlanScore)}</label>
    <label>Broker favorit (kode, pisah koma)${inp("rt-fav",CFG.favBrk,"type=\"text\" placeholder=\"YP, PD, CC\"")}</label>
    ${ck("rt-favalert",CFG.favAlert)}Alert ⭐ bila broker favorit masuk Top 3 beli</label>
    <label>Modal trading (Rp; 0 = nonaktif)${inp("rt-modal",CFG.modal)}</label>
    <label>Risiko per trade (% modal)${inp("rt-risk",CFG.riskPct)}</label>
    <label>Min kecepatan tape (trx/mnt; 0 = otomatis: batas = persentil ke-20 saham aktif, hanya menandai, tidak menyaring tabel)${inp("rt-minrate",CFG.minRate)}</label>
    <label>Telegram rencana: min lama bertahan di konfluensi (menit; 0 = nonaktif)${inp("rt-pers",CFG.persMin)}</label>
    ${ck("rt-sec",CFG.confSec)}Konfluensi: bonus/penalti arah aliran sektor</label>
    <label>Posisi maks. dibanding nilai transaksi 1 menit (%) — di atasnya ditandai "Posisi besar"${inp("rt-liqpos",CFG.liqPos)}</label>
    <label>Data harian dianggap tertinggal bila belum ada setelah jam (WIB)${inp("rt-freshh",CFG.freshHour)}</label>
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
    <button class="ex-btn" data-act="rtExpXlsx" title="Unduh semua tabel yang tampil sebagai file Excel, satu sheet per tabel">📗 Unduh Excel (per sheet)</button>
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
  ${guideHtml()}
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
  const fullRows=data; if(o.max) data=data.slice(0,o.max);
  RT.colReg[id]=cols.map(h=>h.h); RT.tblData[id]={cols,rows:fullRows.slice(0,5000)};
  const hid=hidOf(id), vis=cols.map((h,i)=>({h,i})).filter(x=>x.i===0||hid.indexOf(x.h.h)<0);   // kolom pertama selalu tampil
  const head=vis.map(({h,i})=>{ const on=c&&c.i===i;
    return `<th${h.k?` class="rt-th" data-rt-sort="${id}|${i}"${h.s?"":" data-rt-num=\"1\""} title="Klik untuk urutkan"`:""}>${h.h}${on?(c.d<0?" ▼":" ▲"):""}</th>`; }).join("");
  let bad=0; const cell=(h,r)=>{ let v; try{ v=h.r(r); }catch(e){ bad++; return "-"; } if(typeof v==="string"&&/\bNaN\b|Infinity|undefined/.test(v.replace(/<[^>]*>/g,""))){ bad++; return "-"; } return v; };
  const body=data.map(r=>`<tr class="${o.cls?o.cls(r):""}">${vis.map(({h})=>`<td>${cell(h,r)}</td>`).join("")}</tr>`).join("");
  return data.length?`<div style="text-align:right;margin:0 0 3px"><button class="ex-btn" data-rt-csv="${id}" style="font-size:11px;padding:1px 8px" title="Unduh tabel ini sebagai CSV (semua baris, ${fullRows.length} baris)">⬇ CSV</button></div><div class="ex-wrap" data-rt-w="${id}"><table class="ex-tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${bad?`<div class="ex-mut" style="font-size:11px">⚠ ${bad} sel tidak valid (NaN/kosong) ditampilkan "-".</div>`:""}`:`<div class="ex-mut">${empty}</div>`;
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
/* ================= v3: RSI 7/14/21, skor teknikal & fundamental, zona entri / stop loss / take profit, validasi tabel ================= */
const PL=Object.assign({zoneAtr:0.6,slAtr:0.8,tp1:1.5,tp2:2.5,minRisk:0.015,maxRisk:0.10},CFG.plan||{});
const tickSz=p=>p<200?1:p<500?2:p<2000?5:p<5000?10:25;                       // fraksi harga BEI
const rDn=p=>{ const t=tickSz(p); return Math.floor(p/t+1e-9)*t; };
const rUp=p=>{ const t=tickSz(p); return Math.ceil(p/t-1e-9)*t; };
const okNum=v=>typeof v==="number"&&isFinite(v);
const okRow=a=>{ if(!a) return false; if(a.last!=null&&!(okNum(a.last)&&a.last>0)) return false; if(a.bv!=null&&!okNum(a.bv)) return false; if(a.sv!=null&&!okNum(a.sv)) return false; return true; };   // buang baris dengan harga/nilai rusak (NaN, 0, Infinity)

/* ---- data harian: tabel flows di Supabase (kolom dideteksi otomatis) + harga live dari running trade ---- */
const DAILY={m:new Map(),busy:false,err:null,errAt:0,cols:null,ver:0};
async function dailyProbe(){
  if(DAILY.cols) return DAILY.cols;
  const res=await fetch(`${SUPABASE_URL}/flows?select=*&limit=1`,{headers:getSupaHeaders(),cache:"no-store"});
  if(!res.ok){ let t=""; try{ t=await res.text(); }catch(e){} throw new Error("flows HTTP "+res.status+" "+t.slice(0,120)); }
  const rows=await res.json(), r=rows&&rows[0]; if(!r) throw new Error("tabel flows kosong");
  const ks=Object.keys(r), f=re=>ks.find(k=>re.test(k));
  const c={tk:f(/^(stock_code|ticker|symbol|code)$/i),dt:f(/^(trade_date|date|tanggal)$/i),c:f(/^(c_?close|close|close_price|last_price|penutupan)$/i),v:f(/^(c_?volume|volume|vol|c_?vol)$/i),h:f(/^(c_?high|high)$/i),l:f(/^(c_?low|low)$/i)};
  if(!c.tk||!c.dt||!c.c) throw new Error("kolom flows tidak dikenali ("+ks.slice(0,18).join(", ")+")");
  DAILY.cols=c; return c;
}
async function dailyFetch(tks){
  const c=await dailyProbe(), from=new Date(Date.now()-130*864e5).toISOString().slice(0,10), now=Date.now();
  const sel=[c.tk,c.dt,c.c,c.v,c.h,c.l].filter(Boolean).join(","), by=new Map();
  for(let off=0;off<3000;off+=1000){
    const url=`${SUPABASE_URL}/flows?select=${sel}&${c.tk}=in.(${tks.join(",")})&${c.dt}=gte.${from}&order=${c.tk}.asc,${c.dt}.asc&limit=1000&offset=${off}`;
    const res=await fetch(url,{headers:getSupaHeaders(),cache:"no-store"});
    if(!res.ok){ let t=""; try{ t=await res.text(); }catch(e){} throw new Error("flows HTTP "+res.status+" "+t.slice(0,120)); }
    const rows=await res.json(); rows.forEach(r=>{ const tk=String(r[c.tk]||"").toUpperCase(), cl=toNum(r[c.c]); if(!tk||!(cl>0)) return; let e=by.get(tk); if(!e){ e={at:now,dt:[],c:[],v:[],h:[],l:[]}; by.set(tk,e); } e.dt.push(String(r[c.dt]).slice(0,10)); e.c.push(cl); e.v.push(c.v?toNum(r[c.v]):NaN); e.h.push(c.h?toNum(r[c.h]):NaN); e.l.push(c.l?toNum(r[c.l]):NaN); });
    if(rows.length<1000) break;
  }
  tks.forEach(t=>DAILY.m.set(t,by.get(t)||{at:now,none:true}));
}
async function dailyTick(){
  if(DAILY.busy||!cloudOk()||(DAILY.err&&Date.now()-DAILY.errAt<120000)) return;
  const now=Date.now(), q=(RT.dayWant||[]).filter(t=>{ const e=DAILY.m.get(t); return !e||now-e.at>(e.none?600000:1800000); }).slice(0,10);
  if(!q.length) return; DAILY.busy=true;
  try{ await dailyFetch(q); DAILY.err=null; }
  catch(e){ DAILY.err=String(e&&e.message||e); DAILY.errAt=now; }
  finally{ DAILY.busy=false; DAILY.ver++; }
}

/* ---- v3.13: Gain % hari ini = (harga live − penutupan hari bursa sebelumnya) / penutupan sebelumnya ----
   Acuan utama: tabel flows (1 tanggal bursa terakhir sebelum hari data, seluruh pasar, 1–2 request). Cadangan: data harian per saham (DAILY), lalu baris Screener (ditandai "~").
   Saham tanpa acuan TIDAK ditampilkan (Δ% di tabel lain dihitung dari transaksi pertama yang terekam, bukan dari penutupan kemarin). */
const PREV={m:new Map(),day:"",for:"",at:0,busy:false,err:null,errAt:0};
async function prevTick(){
  const now=Date.now(), td=RT.cumDay||dayOf(now);
  if(PREV.busy||typeof cloudOk!=="function"||!cloudOk()||(PREV.err&&now-PREV.errAt<120000)) return;
  if(PREV.for===td&&now-PREV.at<(PREV.m.size?1800000:120000)) return;
  PREV.busy=true;
  try{
    const c=await dailyProbe(), H=getSupaHeaders();
    const r0=await fetch(`${SUPABASE_URL}/flows?select=${c.dt}&${c.dt}=lt.${td}&order=${c.dt}.desc&limit=1`,{headers:H,cache:"no-store"});
    if(!r0.ok) throw new Error("flows HTTP "+r0.status);
    const d0=await r0.json(), day=d0&&d0[0]?String(d0[0][c.dt]).slice(0,10):"";
    if(!day) throw new Error("tidak ada data flows sebelum "+td);
    const m=new Map();
    for(let off=0;off<5000;off+=1000){
      const res=await fetch(`${SUPABASE_URL}/flows?select=${c.tk},${c.c}&${c.dt}=eq.${day}&order=${c.tk}.asc&limit=1000&offset=${off}`,{headers:H,cache:"no-store"});
      if(!res.ok) throw new Error("flows HTTP "+res.status);
      const rows=await res.json();
      rows.forEach(r=>{ const tk=String(r[c.tk]||"").toUpperCase(), cl=toNum(r[c.c]); if(tk&&cl>0) m.set(tk,cl); });
      if(rows.length<1000) break;
    }
    if(!m.size) throw new Error("flows "+day+" kosong");
    PREV.m=m; PREV.day=day; PREV.for=td; PREV.err=null;
  }catch(e){ PREV.err=String(e&&e.message||e); PREV.errAt=now; }
  finally{ PREV.busy=false; PREV.at=Date.now(); RT.mm={}; }
}
function refOf(tk){      // {v: penutupan hari bursa sebelumnya, src: "flows"|"screener", day}
  const td=RT.cumDay||dayOf(Date.now());
  if(PREV.for===td){ const p=PREV.m.get(tk); if(p>0) return {v:p,src:"flows",day:PREV.day}; }
  const e=DAILY.m.get(tk);
  if(e&&!e.none&&e.c.length){ for(let i=e.dt.length-1;i>=0;i--){ if(e.dt[i]<td&&e.c[i]>0) return {v:e.c[i],src:"flows",day:e.dt[i]}; } }
  const r=rowOf(tk);
  if(r){                 // updatedAt = hari ini → prev_close adalah penutupan kemarin; updatedAt lebih lama → cClose adalah penutupan terakhir saat sync (perkiraan)
    const pc=+r.prevClose, cc=+r.cClose, ms=r.updatedAt?Date.parse(r.updatedAt):NaN, up=isFinite(ms)?dayOf(ms):"";
    if(up&&up===td&&pc>0) return {v:pc,src:"screener",day:""};
    if(up&&up<td&&cc>0) return {v:cc,src:"screener",day:up};
  }
  return null;
}
function openOf(tk){     // {v, src}: "open" = transaksi pertama terekam saat pembukaan (<= 09:03 WIB); "screener" / "mulai" = perkiraan
  const td=RT.cumDay||dayOf(Date.now()), cu=RT.cum.get(tk);
  if(cu&&cu.p0>0&&cu.t0){ const d=new Date(cu.t0+7*3600000), mnt=d.getUTCHours()*60+d.getUTCMinutes(); if(dayOf(cu.t0)===td&&mnt<=9*60+3) return {v:cu.p0,src:"open"}; }
  const r=rowOf(tk);
  if(r){ const o=+r.cOpen, ms=r.updatedAt?Date.parse(r.updatedAt):NaN; if(o>0&&isFinite(ms)&&dayOf(ms)===td) return {v:o,src:"screener"}; }
  if(cu&&cu.p0>0) return {v:cu.p0,src:"mulai"};
  return null;
}
function gainRaw(){
  const out=[], own=X.ownTickers(), mk=new Map(marketList().map(a=>[a.tk,a])), day=RT.cumDay, useOpen=CFG.gainBase==="open";
  const hk=memo("gw",()=>agg(CFG.hakaWin*60000)), hs=CFG.gainFlow==="haka"?new Set(hakaList().map(a=>a.tk)):null; let noRef=0, total=0;
  for(const tk in RT.last){
    const last=RT.last[tk]; if(!(last>0)) continue;
    if(day&&dayOf(RT.lastTs[tk]||0)!==day) continue;          // harga terakhir bukan dari hari data ini (basi)
    total++;
    const cl=refOf(tk), op=openOf(tk);
    const gc=cl&&cl.v>0?(last-cl.v)/cl.v*100:null, go=op&&op.v>0?(last-op.v)/op.v*100:null;
    const base=useOpen?go:gc; if(base==null){ noRef++; continue; }
    if(!(base>=CFG.gainMin-1e-9)||base<=0) continue;
    const h=hk.get(tk)||null;
    if(CFG.gainFlow==="net"&&!(h&&h.bv>h.sv)) continue;
    if(hs&&!hs.has(tk)) continue;
    const m=mk.get(tk)||null, cu=RT.cum.get(tk), cnt=cu?cu.nb+cu.ns:(m?m.nb+m.ns:0);
    if(!okTk(tk,cnt,own)) continue;
    const bs=useOpen?op:cl;
    out.push({tk,last,ref:bs.v,src:bs.src,refDay:cl?cl.day:"",gain:base,chg:base,gc,go,cref:cl?cl.v:null,csrc:cl?cl.src:"",oref:op?op.v:null,osrc:op?op.src:"",m,hk:h});
  }
  RT.gainInfo={noRef,total};
  return out.sort((x,y)=>CFG.gainFlow==="haka"?((y.hk?y.hk.bv:0)-(x.hk?x.hk.bv:0)):(y.gain-x.gain));
}
const gainList=()=>memo("g",gainRaw);

/* ---- indikator ---- */
function rsiW(c,n){          // RSI Wilder
  if(c.length<n+1) return null; let g=0,l=0;
  for(let i=1;i<=n;i++){ const d=c[i]-c[i-1]; if(d>0) g+=d; else l-=d; } g/=n; l/=n;
  for(let i=n+1;i<c.length;i++){ const d=c[i]-c[i-1]; g=(g*(n-1)+(d>0?d:0))/n; l=(l*(n-1)+(d<0?-d:0))/n; }
  return l===0?(g===0?50:100):100-100/(1+g/l);
}
const emaS=(c,n)=>{ const k=2/(n+1), o=[]; c.forEach((v,i)=>o.push(i?v*k+o[i-1]*(1-k):v)); return o; };
const smaL=(c,n)=>c.length>=n?c.slice(-n).reduce((t,v)=>t+v,0)/n:null;
function atrOf(e,n){          // ATR(14) bila high/low ada, selain itu rata-rata |selisih close|
  const c=e.c; if(c.length<n+1) return null; let s=0;
  for(let i=c.length-n;i<c.length;i++){ const h=e.h[i],l=e.l[i]; s+=(okNum(h)&&okNum(l)&&h>=l)?Math.max(h-l,Math.abs(h-c[i-1]),Math.abs(l-c[i-1])):Math.abs(c[i]-c[i-1]); }
  return s/n;
}
const todayIso=()=>typeof todayLocalISO==="function"?todayLocalISO():new Date().toISOString().slice(0,10);
const rowGet=(r,res)=>{ if(!r||typeof r!=="object") return null; for(const re of res){ for(const k in r){ if(re.test(k)){ const v=r[k], n=typeof v==="number"?v:parseFloat(v); if(isFinite(n)) return n; } } } return null; };
const RWM={at:0,m:new Map()};
function rowOf(tk){          // baris enriched() Screener (cache 60 dtk); cadangan: X.stk
  const now=Date.now();
  if(now-RWM.at>60000&&typeof enriched==="function"){ RWM.at=now; try{ const m=new Map(); enriched().forEach(r=>{ if(r&&r.ticker) m.set(r.ticker,r); }); RWM.m=m; }catch(e){} }
  let r=RWM.m.get(tk); if(!r){ try{ r=X.stk(tk); }catch(e){ r=null; } } return r||null;
}
const TC=new Map();
function techOf(tk){
  const live=RT.last[tk], key=tk+"|"+DAILY.ver+"|"+live, hit=TC.get(tk); if(hit&&hit.key===key) return hit.v;
  const e=DAILY.m.get(tk), r=rowOf(tk); let o={rsi7:null,rsi14:null,rsi21:null,ts:null,tsMax:10,tsSrc:"",fs:null,fsMax:10,fsSrc:"",atr:null,n:0,src:""};
  if(e&&!e.none&&e.c.length>=8){
    const c=e.c.slice(), v=e.v.slice(); const td=todayIso();
    if(live>0){ if(e.dt[e.dt.length-1]===td) c[c.length-1]=live; else { c.push(live); v.push(NaN); } }
    o.n=c.length; o.src="harian"+(live>0?" + harga live":""); o.rsi7=rsiW(c,7); o.rsi14=rsiW(c,14); o.rsi21=rsiW(c,21); o.atr=atrOf(e,14);
    // skor teknikal lokal 1–10: RSI14, MACD hist, tren MA, rasio volume (masing-masing maks 25; yang tak tersedia diabaikan lalu diskalakan)
    let pts=0,max=0; const last=c[c.length-1];
    if(o.rsi14!=null){ const x=o.rsi14; pts+=x>=50&&x<=70?25:x>70&&x<=80?15:x>80?5:x>=40?15:x>=30?10:8; max+=25; }
    if(c.length>=35){ const m12=emaS(c,12), m26=emaS(c,26), ml=m12.map((a,i)=>a-m26[i]), sg=emaS(ml,9), h=ml.map((a,i)=>a-sg[i]), h0=h[h.length-1], h1=h[h.length-2]; pts+=h0>0?(h0>=h1?25:15):(h0>h1?10:0); max+=25; }
    { const m20=smaL(c,20), m50=smaL(c,50); if(m20!=null){ pts+=(m50!=null&&last>m20&&m20>m50)?25:last>m20?15:(m50!=null&&last>m50)?10:0; max+=25; } }
    { const vv=v.filter(okNum); if(vv.length>=10){ const av=vv.slice(-21,-1).reduce((t,x)=>t+x,0)/Math.max(1,vv.slice(-21,-1).length), lv=vv[vv.length-1]; if(av>0){ const q=lv/av; pts+=q>=1.5?25:q>=1?15:q>=.7?8:0; max+=25; } } }
    if(max>=50){ o.ts=Math.round((1+pts/max*9)*10)/10; o.tsSrc="hitung lokal dari data harian (RSI14, MACD, MA20/50, volume)"; }
  }
  if(r){                                                  // nilai bawaan app.js bila ada (RSI hanya dipakai kalau data harian belum ada)
    { const a7=rowGet(r,[/^rsi7$/i]), a14=rowGet(r,[/^rsi14$/i]), a21=rowGet(r,[/^rsi21$/i]); if(a7!=null) o.rsi7=a7; if(a14!=null) o.rsi14=a14; if(a21!=null) o.rsi21=a21; o.rsiSrc=(a7!=null||a14!=null||a21!=null)?"Screener (app.js)":o.src; }   // nilai Screener diutamakan supaya sama dengan tabel Screener
    { const t40=rowGet(r,[/^techScore40$/i]), f60=rowGet(r,[/^fundScore60$/i]);
      if(t40!=null){ o.ts=t40; o.tsMax=40; o.tsSrc="Skor Teknikal (0-40) dari Screener — bagian dari FundTech Score"; }
      if(f60!=null){ o.fs=f60; o.fsMax=60; o.fsSrc="Skor Fundamental (0-60) dari Screener — bagian dari FundTech Score"; } }
    let ap=rowGet(r,[/^(tech|teknikal|technical)[_ ]?(score|skor)$/i,/^(score|skor)[_ ]?(tech|teknikal|technical)$/i,/tech.*(score|skor)/i,/(score|skor).*tech/i]);
    if(ap==null&&typeof computeTechScore==="function"){ try{ const z=computeTechScore(r); ap=typeof z==="number"?z:(z&&(z.score!=null?z.score:z.total)); ap=okNum(+ap)?+ap:null; }catch(x){} }
    if(o.tsMax!==40&&ap!=null){ o.ts=ap>10?Math.round(ap)/10:Math.round(ap*10)/10; o.tsSrc="skor teknikal dari Screener (app.js)"; }
    let fp=rowGet(r,[/^(fund|fundamental|fundamentals)[_ ]?(score|skor)$/i,/^(score|skor)[_ ]?(fund|fundamental)/i,/fund.*(score|skor)/i,/(score|skor).*fund/i]);
    if(o.fsMax===60){} else if(fp!=null){ o.fs=fp>10?Math.round(fp)/10:Math.round(fp*10)/10; o.fsSrc="skor fundamental dari Screener (app.js)"; }
    else if(o.fs==null){                                    // cadangan: rata-rata skor 0–10 dari rasio yang tersedia
      const per=rowGet(r,[/^per$/i,/^pe$/i,/^pe[_ ]?ratio$/i]), pbv=rowGet(r,[/^pbv$/i,/^pb$/i]), roe=rowGet(r,[/^roe$/i]), der=rowGet(r,[/^der$/i,/debt.*equity/i]), npm=rowGet(r,[/^npm$/i,/net.*margin/i]); const s=[];
      if(roe!=null) s.push(roe>=15?10:roe>=10?7:roe>=5?4:roe>0?2:0); if(per!=null) s.push(per<=0?0:per<=15?10:per<=25?6:per<=40?3:1); if(pbv!=null) s.push(pbv<=0?0:pbv<=1.5?10:pbv<=3?6:pbv<=5?3:1);
      if(der!=null) s.push(der<0?0:der<=.5?10:der<=1?7:der<=2?4:1); if(npm!=null) s.push(npm>=15?10:npm>=8?7:npm>=3?4:npm>0?2:0);
      if(s.length>=2){ o.fs=Math.round(s.reduce((t,x)=>t+x,0)/s.length*10)/10; o.fsSrc="hitung lokal dari "+s.length+" rasio (ROE, PER, PBV, DER, NPM) — perkiraan kasar"; }
    }
  }
  TC.set(tk,{key,v:o}); return o;
}
const amap=()=>memo("am",()=>new Map(marketList().map(a=>[a.tk,a])));
function planOf(tk){
  const last=RT.last[tk]; if(!(last>0)) return null;
  const am0=amap().get(tk), r0=rowOf(tk);
  if(r0&&typeof computeTradePlan==="function"){       // rencana trading bawaan Screener (support/resistance 20D, ATR14, 52w high)
    try{ const p=computeTradePlan(r0,last); if(p&&p.sl>0&&p.entryHigh>0) return {lo:p.entryLow,hi:p.entryHigh,sl:p.sl,tp1:p.tp1,tp2:p.tp2,basis:p.basis,neg:!!(am0&&am0.net<0),risk:(p.entryHigh-p.sl)/p.entryHigh*100,rr1:p.rr1||0,rr2:p.rr2||0,mid:p.entryHigh,app:1}; }catch(e){}
  }
  const t=techOf(tk), am=amap().get(tk); let atr=t.atr>0?t.atr:null, basis="ATR(14) harian", est=false;
  if(!atr){ const rg=am&&am.hi>am.lo?am.hi-am.lo:0; atr=rg>0?rg*1.5:last*0.02; basis=rg>0?"rentang intraday ×1,5 (data harian belum ada)":"2% harga (data harian belum ada)"; est=true; }
  let hi=rDn(last), lo=last-PL.zoneAtr*atr; if(am&&am.lo>0&&am.lo<last) lo=Math.max(lo,am.lo); lo=Math.min(rDn(lo),hi);
  const mid=(lo+hi)/2; let sl=lo-PL.slAtr*atr; if(mid-sl<mid*PL.minRisk) sl=mid*(1-PL.minRisk); if(mid-sl>mid*PL.maxRisk) sl=mid*(1-PL.maxRisk); sl=rDn(sl);
  const risk=mid-sl; if(!(risk>0)) return null;
  const tp1=rUp(mid+PL.tp1*risk), tp2=rUp(mid+PL.tp2*risk);
  return {lo,hi,sl,tp1,tp2,basis,est,neg:!!(am&&am.net<0),risk:risk/mid*100,rr1:(tp1-mid)/risk,rr2:(tp2-mid)/risk,mid};
}
/* ---- v3.11: zona entri, kesegaran data harian, broker favorit, skor gabungan ---- */
const ZS={E:"Zona perkiraan (tanpa data harian/Screener)",I:"Di zona entri",L:"Telat (di atas zona)",B:"Di bawah zona",X:"Tembus SL"};
function zoneOf(tk){           // posisi harga live terhadap zona entri; R:R dihitung dari harga live (bukan tengah zona)
  const p=planOf(tk), last=RT.last[tk]; if(!p||!(last>0)) return null;
  let st,pct=0;
  if(last<=p.sl) st="X"; else if(last<p.lo) st="B"; else if(last<=p.hi+tickSz(p.hi)) st="I"; else { st="L"; pct=(last-p.hi)/p.hi*100; }
  const rr=(last>p.sl&&p.tp1>last)?(p.tp1-last)/(last-p.sl):0;
  return {st,pct,rr:okNum(rr)?rr:0,p,last,est:!!p.est};
}
function zoneOk(tk){ if(!CFG.zoneOnly) return true; const z=zoneOf(tk); return !!z&&!z.est&&z.st==="I"&&z.rr>=CFG.rrMin; }
function zoneCell(tk){
  const z=zoneOf(tk); if(!z) return "-";
  const rr=z.rr.toFixed(1), tip=`Harga live ${fpx(z.last)} · zona ${fpx(z.p.lo)}–${fpx(z.p.hi)} · SL ${fpx(z.p.sl)} · TP1 ${fpx(z.p.tp1)} · R:R live ke TP1 = 1:${rr}`;
  const t=z.est?`<span class="ex-mut" title="Zona ini hanya perkiraan: belum ada rencana Screener maupun data harian (ATR), jadi zona dibuat dari harga sekarang dan tidak bisa dinilai 'di zona' atau 'telat'. Tidak lolos filter zona dan Telegram rencana.">≈ Zona perkiraan</span>`:z.st==="I"?(z.rr>=CFG.rrMin?`<span class="ex-up">✅ Di zona</span>`:`<span class="ex-mut">Di zona, R:R rendah</span>`)
    :z.st==="L"?`<span class="ex-dn">⏰ Telat (+${z.pct.toFixed(1)}%)</span>`:z.st==="B"?`<span class="ex-mut">⬇ Di bawah zona</span>`:`<span class="ex-dn">⛔ Tembus SL</span>`;
  return `<span title="${E(tip)}" style="white-space:nowrap">${t} <small>1:${rr}</small></span> ${folIcon(tk)}`;
}
function freshOf(tk){          // tanggal data harian terakhir vs tanggal yang seharusnya sudah ada (hari libur bursa tidak diperhitungkan)
  const e=DAILY.m.get(tk); if(!e||e.none||!e.dt||!e.dt.length) return null;
  const last=e.dt[e.dt.length-1], w=new Date(Date.now()+7*3600000), hm=w.getUTCHours()*60+w.getUTCMinutes();
  const d=new Date(w.toISOString().slice(0,10)+"T00:00:00Z"), dow=d.getUTCDay();
  if(dow===0) d.setUTCDate(d.getUTCDate()-2); else if(dow===6) d.setUTCDate(d.getUTCDate()-1);
  else if(hm<Math.round(CFG.freshHour*60)) d.setUTCDate(d.getUTCDate()-(dow===1?3:1));      // sebelum jam batas (default 18:00 WIB) data hari ini belum diharapkan
  const exp=d.toISOString().slice(0,10); return {last,exp,stale:last<exp};
}
function freshBadge(tk){
  const f=freshOf(tk); if(!f) return ""; const t=f.last.slice(8,10)+"/"+f.last.slice(5,7);
  return f.stale?` <small class="ex-dn" title="Data harian terakhir ${f.last}, seharusnya sudah ${f.exp}. Sinkron IDX tertinggal (atau ada hari libur bursa).">⚠ ${t}</small>`
    :` <small class="ex-mut" title="Data harian terakhir ${f.last}">${t}</small>`;
}
const withFresh=(h,v,tk)=>v==null?h:h+freshBadge(tk);
const favSet=()=>new Set(String(CFG.favBrk||"").toUpperCase().split(/[\s,;]+/).filter(Boolean));
const brCode=b=>{ const m=String(b==null?"":b).toUpperCase().match(/[A-Z0-9]+/); return m?m[0]:""; };
function favIn(tk,side){ const fs=favSet(); if(!fs.size) return []; return top3Of(tk,side||"buy").l.filter(x=>fs.has(brCode(x[0]))); }
const GW={c:.4,t:.3,f:.3};     // bobot Skor gabungan: konfluensi (aliran murni), teknikal, fundamental; komponen yang kosong diabaikan dan bobot dinormalkan ulang
function compOf(tk){
  const cf=memo("cfa",()=>new Map(confAll().map(r=>[r.tk,r]))).get(tk), t=techOf(tk), P=[];
  if(cf) P.push(["Konfluensi (aliran)",cf.base/100,GW.c,cf.base+"/100"]);
  if(t.ts!=null&&t.tsMax) P.push(["Teknikal",t.ts/t.tsMax,GW.t,(Math.round(t.ts*10)/10)+"/"+t.tsMax]);
  if(t.fs!=null&&t.fsMax) P.push(["Fundamental",t.fs/t.fsMax,GW.f,(Math.round(t.fs*10)/10)+"/"+t.fsMax]);
  if(!P.length) return null; const w=P.reduce((x,q)=>x+q[2],0);
  return {v:Math.round(P.reduce((x,q)=>x+q[1]*q[2],0)/w*100),P,part:P.length<3};
}
function compCell(tk){
  const c=compOf(tk); if(!c) return "-";
  return `<span title="${E(c.P.map(q=>q[0]+": "+q[3]+" (bobot "+Math.round(q[2]*100)+"%)").join("\n")+(c.part?"\n(sebagian komponen kosong, bobot dinormalkan)":""))}"><b class="${c.v>=70?"ex-up":c.v<45?"ex-dn":""}">${c.v}</b>${c.part?"*":""}</span>${bar(c.v)}`;
}
function extraNote(){
  const n=Array.from(DAILY.m.keys()).filter(t=>{ const f=freshOf(t); return f&&f.stale; }).length;
  return (n?` · <span class="ex-dn">⚠ ${n} saham data hariannya tertinggal (lihat badge tanggal di kolom RSI 14 / Skor teknikal; hari libur bursa juga bisa memicunya)</span>`:"")
    +(CFG.zoneOnly?` · <b>🎯 Filter zona aktif</b>: tabel hanya memuat saham yang harga livenya di dalam zona entri dengan R:R ke TP1 ≥ ${CFG.rrMin}; saham tanpa rencana/harga live, atau yang zonanya hanya perkiraan (belum ada data harian/Screener), ikut tersembunyi. Matikan filter untuk melihat yang ditandai "Telat".`:"");
}
/* ---- v3.12 ---- */
// kolom tambahan yang tersembunyi default pada tabel yang belum pernah Anda atur kolomnya (Ukuran posisi muncul sendiri bila Modal diisi, Broker favorit bila broker favorit diisi)
const hidDef=()=>["Ukuran posisi","Likuiditas","Konfirmasi jendela","Bertahan","Arah sektor","Broker favorit"].filter(h=>!(h==="Ukuran posisi"&&CFG.modal>0)&&!(h==="Broker favorit"&&String(CFG.favBrk||"").trim()));
const hidOf=id=>RT.hide[id]||hidDef();
// 8. arus per sektor (jendela akumulasi)
function secFlow(){
  return memo("sf",()=>{ const m=new Map();
    marketList().forEach(a=>{ const k=secOf(a.tk); let o=m.get(k); if(!o){ o={n:0,bv:0,sv:0}; m.set(k,o); } o.n++; o.bv+=a.bv; o.sv+=a.sv; });
    m.forEach(o=>{ const t=o.bv+o.sv; o.pb=t?o.bv/t*100:50; o.net=o.bv-o.sv; }); return m; });
}
const secCell=tk=>{ const k=secOf(tk); if(k==="(Tanpa sektor)") return "-"; const o=secFlow().get(k); if(!o) return E(k);
  return `${E(k)} <small class="${o.pb>=55?"ex-up":o.pb<45?"ex-dn":"ex-mut"}" title="${o.n} saham aktif; Buy ${fv(o.bv)} / Sell ${fv(o.sv)}">${Math.round(o.pb)}% Buy</small>`; };
// 1. pembanding pasar: proksi indeks = rata² perubahan harga (dari harga awal perekaman hari ini) 45 saham tersibuk, ditimbang nilai transaksi
let MKC={at:0,v:null};
function mkIdx(){
  const now=Date.now(); if(now-MKC.at<3000) return MKC.v; MKC.at=now; const a=[];
  RT.cum.forEach(c=>{ const l=RT.last[c.tk]; if(c.p0>0&&l>0&&c.nb+c.ns>=20) a.push({c:(l-c.p0)/c.p0*100,w:c.bv+c.sv}); });
  if(a.length<15){ MKC.v=null; return null; }
  a.sort((x,y)=>y.w-x.w); const top=a.slice(0,45), W=top.reduce((t,o)=>t+o.w,0);      // rata² perubahan harga, ditimbang nilai transaksi, 45 saham tersibuk
  MKC.v=W>0?top.reduce((t,o)=>t+o.c*o.w,0)/W:null; return MKC.v;
}
const csOf=tk=>{ const r=memo("cfa",()=>new Map(confAll().map(r=>[r.tk,r]))).get(tk); return r?r.score:null; };
const relRet=g=>{ const r=retAt(g,"p30"); return g.mv===2&&r!==null&&typeof g.m30==="number"&&typeof g.m0==="number"?r-(g.m30-g.m0):null; };
// 2. ukuran posisi dari SL
function sizeOf(tk){
  const m=+CFG.modal||0, rk=+CFG.riskPct||0; if(!(m>0)||!(rk>0)) return null;
  const z=zoneOf(tk); if(!z||!(z.last>z.p.sl)) return null;
  const perLot=(z.last-z.p.sl)*100, riskRp=m*rk/100; let lot=Math.floor(riskRp/perLot), cap=false; const mx=Math.floor(m/(z.last*100));
  if(lot>mx){ lot=mx; cap=true; }
  return {lot,val:lot*z.last*100,riskRp:lot*perLot,cap,perLot};
}
const sizeCell=tk=>{ const s=sizeOf(tk); if(!s) return `<span class="ex-mut"${CFG.modal>0?"":' title="Isi Modal trading di pengaturan"'}>-</span>`;
  if(s.lot<1) return `<span class="ex-mut" title="Risiko 1 lot (${fv(s.perLot)}) melebihi batas ${CFG.riskPct}% modal">kurang dari 1 lot</span>`;
  return `<span title="Risiko ≈ ${fv(s.riskRp)} (${(s.riskRp/CFG.modal*100).toFixed(2)}% modal)${s.cap?"; dibatasi modal":""}"><b>${fpx(s.lot)}</b> lot <small>${fv(s.val)}${s.cap?" ⚠":""}</small></span>`; };
// 3. likuiditas / kemudahan eksekusi
const liqMin=()=>CFG.minRate>0?CFG.minRate:Math.max(1,memo("lq",()=>{ const r=Array.from(amap().values()).map(a=>a.rate).sort((x,y)=>x-y); return r.length>=20?r[Math.floor(r.length*.2)]:3; }));
function liqOf(tk){
  const a=amap().get(tk); if(!a) return null; const s=sizeOf(tk); let ratio=null, big=false;
  if(s&&s.lot>0){ const perMin=a.vt/Math.max(1,Math.min(CFG.accWin,(Date.now()-a.t0)/60000)); ratio=perMin>0?s.val/perMin:null; big=ratio!=null&&ratio>CFG.liqPos/100; }
  const c=RT.cum.get(tk), mins=c?(Date.now()-c.t0)/60000:0, own=c&&mins>=10?(c.nb+c.ns)/mins:null, quiet=own!=null&&own>=2&&a.rate<own*0.3;   // sepi = kecepatan sekarang < 30% rata-rata saham itu sendiri hari ini
  return {rate:a.rate,thin:a.rate<liqMin()||quiet,quiet,own,big,ratio};
}
const liqOk=tk=>{ if(!(CFG.minRate>0)) return true; const l=liqOf(tk); return !!l&&!l.thin; };
const liqCell=tk=>{ const l=liqOf(tk); if(!l) return "-";
  const t=l.thin?`<span class="ex-dn">${l.rate<liqMin()?"⚠ Tipis":"⚠ Sepi"}</span>`:l.big?`<span class="ex-dn">⚠ Posisi besar</span>`:`<span class="ex-up">✅ Cukup</span>`;
  return `<span style="white-space:nowrap" title="${E("Tape "+l.rate.toFixed(1)+" trx/mnt (batas "+liqMin().toFixed(1)+(CFG.minRate>0?"":", persentil 20 saham aktif")+(l.own!=null?"; rata² saham ini hari ini "+l.own.toFixed(1)+(l.quiet?" — sedang sepi dibanding biasanya":""):"")+")"+(l.ratio!=null?"; posisi ≈ "+Math.round(l.ratio*100)+"% dari nilai transaksi 1 menit (tanda bila > "+CFG.liqPos+"%)":""))}">${t} <small>${l.rate.toFixed(1)}/mnt</small></span>`; };
// 4. lama bertahan di konfluensi (per hari bursa; hilang >90 dtk dihitung kemunculan baru)
const PS0=LS("rt_pers",null), PS={day:PS0&&PS0.day||"",m:PS0&&PS0.m&&typeof PS0.m==="object"?PS0.m:{},sv:0};
function persTick(){
  if(!RT.on) return; const now=Date.now(), day=new Date(now+7*3600000).toISOString().slice(0,10); let ch=false;
  if(PS.day!==day){ PS.day=day; PS.m={}; ch=true; }
  confList().forEach(r=>{ const e=PS.m[r.tk]; if(!e||now-e[1]>90000){ PS.m[r.tk]=[now,now,(e?e[2]:0)+1]; ch=true; } else e[1]=now; });
  if(ch||now-PS.sv>30000){ PS.sv=now; SV("rt_pers",{day:PS.day,m:PS.m}); }
}
const persMins=tk=>{ const e=PS.m[tk]; return e&&Date.now()-e[1]<90000?(e[1]-e[0])/60000:0; };
const persKey=tk=>{ const e=PS.m[tk]; return e?(Date.now()-e[1]<90000?persMins(tk):-1):null; };
const persCell=tk=>{ const e=PS.m[tk]; if(!e) return "-"; const on=Date.now()-e[1]<90000, m=(e[1]-e[0])/60000, t=new Date(e[0]+7*3600000).toISOString().slice(11,16);
  return `<span title="Pertama muncul di konfluensi ${t} WIB (kemunculan terakhir ${on?"masih berlangsung":"sudah hilang"}); ${e[2]}× muncul hari ini">${on?`<b>${m<1?"&lt;1":Math.round(m)} mnt</b>`:`<span class="ex-mut">hilang</span>`} · ${e[2]}×</span>`; };
// 5. konfirmasi lintas jendela: HAKA 1 mnt, jendela akumulasi, dan akumulasi sejak Mulai hari ini
function xwOf(tk){
  const m1=memo("a1",()=>agg(60000)).get(tk), mw=amap().get(tk), c=RT.cum.get(tk), r=CFG.accRatio/100;
  const a=!!m1&&m1.nb>=3&&m1.net>0&&m1.ratio>=Math.max(.6,r), b=!!mw&&mw.net>0&&mw.ratio>=r, d=!!c&&c.bv>c.sv&&c.bv/(c.bv+c.sv)>=.55;
  return {a,b,d,n:(a?1:0)+(b?1:0)+(d?1:0)};
}
const xwCell=tk=>{ const x=xwOf(tk), f=v=>v?"✓":"✗";
  return `<span style="white-space:nowrap" title="${E("1 mnt: net beli dan rasio ≥ "+Math.max(60,CFG.accRatio)+"% ("+f(x.a)+"); "+CFG.accWin+" mnt: net beli dan rasio ≥ "+CFG.accRatio+"% ("+f(x.b)+"); sejak Mulai: net beli dan rasio ≥ 55% ("+f(x.d)+")")}"><b class="${x.n===3?"ex-up":x.n===0?"ex-dn":""}">${x.n===3?"✅ ":""}${x.n}/3</b> <small>1m${f(x.a)} ${CFG.accWin}m${f(x.b)} hari${f(x.d)}</small></span>`; };
// 6. pelacak posisi dari rencana
const POS=(()=>{ const l=LS("rt_pos",[]); return Array.isArray(l)?l:[]; })();
const savePos=()=>{ const cl=POS.filter(q=>q.cl); if(cl.length>100) cl.sort((a,b)=>(a.ts||0)-(b.ts||0)).slice(0,cl.length-100).forEach(q=>{ const i=POS.indexOf(q); if(i>=0) POS.splice(i,1); }); SV("rt_pos",POS); };   // posisi ditutup: simpan 100 terakhir
/* ---- sinkron posisi 📌 ke Supabase (tabel rt_follow, lihat sql/07_rt_follow.sql): Edge Function running-trade-monitor memantau SL/TP saat tab ditutup ---- */
const SRV={at:0,err:null,busy:false,sig:"",px:{}};
const posKey=q=>q.tk+"|"+q.ts;
async function posSync(){
  if(SRV.busy||SRV.err==="table"||!POS.length||typeof cloudOk!=="function"||!cloudOk()) return; SRV.busy=true;
  try{
    const H=getSupaHeaders();
    // 1) tarik status dari server: SL/TP bisa saja kena saat tab tertutup
    const res=await fetch(`${SUPABASE_URL}/rt_follow?select=pos_key,ticker,t1,status,close_px,last_px,last_px_at&order=followed_at.desc&limit=500`,{headers:H,cache:"no-store"});
    if(!res.ok) throw new Error(res.status+" "+(await res.text()).slice(0,160));
    const srvRows=await res.json(), srv=new Map(srvRows.map(r=>[r.pos_key,r])); let ch=false;
    srvRows.forEach(r=>{ const at=Date.parse(r.last_px_at)||0, px=+r.last_px; if(px>0&&at&&(!SRV.px[r.ticker]||at>SRV.px[r.ticker].at)){ if(!SRV.px[r.ticker]||SRV.px[r.ticker].px!==px) ch=true; SRV.px[r.ticker]={px,at}; } });   // harga terakhir yang dicatat server (saat tab tertutup)
    POS.forEach(q=>{ const r=srv.get(posKey(q)); if(!r||q.cl) return;
      if(r.status==="SL"||r.status==="TP2"){ q.cl=r.status; q.px=+r.close_px||q.px; ch=true; X.toast(q.tk+": "+r.status+" sudah kena (dipantau server saat tab tertutup)",r.status==="SL"?"down":"up"); }
      else if(r.t1&&!q.t1){ q.t1=true; ch=true; }
    });
    if(ch){ savePos(); dyn(); }
    // 2) kirim posisi lokal. browser_seen_at = heartbeat: hanya diisi bila alert di browser benar-benar berjalan (▶ Mulai aktif dan data masuk), supaya server diam dan tidak dobel
    const live=RT.on&&(RT.st.trades>0||RT.st.rest>0), now=new Date().toISOString();
    const rows=POS.filter(q=>q.ts&&(!q.cl||Date.now()-q.ts<7*864e5)).map(q=>({pos_key:posKey(q),ticker:q.tk,entry:q.en,sl:q.sl,tp1:q.tp1,tp2:q.tp2,t1:!!q.t1,status:q.cl||"OPEN",close_px:q.px||null,followed_at:new Date(q.ts).toISOString(),browser_seen_at:live?now:null,updated_at:now}));
    const sig=JSON.stringify(rows.map(r=>[r.pos_key,r.t1,r.status]))+live;
    if(rows.length&&(live||sig!==SRV.sig)){
      await supaFetch(`${SUPABASE_URL}/rt_follow?on_conflict=pos_key`,{method:"POST",headers:{...H,"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(rows)});
      SRV.sig=sig;
    }
    SRV.at=Date.now(); SRV.err=null;
  }catch(e){ const m=String(e&&e.message||e); SRV.err=/relation|does not exist|404|42P01/i.test(m)?"table":m.slice(0,160); }
  finally{ SRV.busy=false; }
}
function posPxOf(q){          // harga posisi: transaksi lokal, atau harga catatan server bila lebih baru (tab sempat tertutup)
  if(q.cl&&q.px) return {l:q.px,t:0,src:"cl"};
  const lt=RT.lastTs[q.tk]||0, ll=RT.last[q.tk]||0, sv=SRV.px[q.tk];
  if(sv&&sv.px>0&&(sv.at>lt||!ll)) return {l:sv.px,t:sv.at,src:"srv"};
  return {l:ll,t:lt,src:"loc"};
}
function posUnf(q){ if(typeof cloudOk!=="function"||!cloudOk()||SRV.err==="table") return; try{ supaFetch(`${SUPABASE_URL}/rt_follow?pos_key=eq.${encodeURIComponent(posKey(q))}`,{method:"PATCH",headers:{...getSupaHeaders(),"Prefer":"return=minimal"},body:JSON.stringify({status:"UNFOLLOW",updated_at:new Date().toISOString()})}).catch(()=>{}); }catch(e){} }
const posSrvNote=()=>{ if(typeof cloudOk!=="function"||!cloudOk()) return "☁️ Supabase belum dikonfigurasi: alert SL/TP hanya berjalan di browser."; if(SRV.err==="table") return `☁️ Tabel rt_follow belum ada: jalankan <code>sql/07_rt_follow.sql</code> agar SL/TP tetap dipantau server saat tab ditutup.`; if(SRV.err) return `☁️ <span class="ex-dn">Sinkron ke server gagal: ${E(SRV.err)}</span>`; if(SRV.at) return `☁️ Posisi tersinkron ke server (${Math.max(0,Math.round((Date.now()-SRV.at)/60000))} mnt lalu). Bila Edge Function <code>running-trade-monitor</code> terpasang, SL/TP tetap dipantau saat tab ditutup.`; return ""; };
setInterval(()=>{ posSync(); },30000);
const folIcon=tk=>POS.some(q=>q.tk===tk&&!q.cl)?`<span title="Sedang diikuti">📍</span>`:`<span class="rt-tk" data-rt-fol="${E(tk)}" title="Ikuti rencana ini: alert saat TP1/TP2/SL tersentuh">📌</span>`;
function followTk(tk){
  const z=zoneOf(tk); if(!z){ X.toast("Belum ada rencana/harga live untuk "+tk,"down"); return; }
  if(POS.some(q=>q.tk===tk&&!q.cl)){ X.toast(tk+" sudah diikuti","down"); return; }
  POS.push({tk,en:z.last,sl:z.p.sl,tp1:z.p.tp1,tp2:z.p.tp2,ts:Date.now(),t1:false,cl:null}); savePos(); setTimeout(posSync,400); X.toast("Mengikuti "+tk+" @ "+fpx(z.last),"up"); dyn();
}
function posCheck(){            // dipanggil dari alerts()
  POS.forEach(q=>{
    if(q.cl) return; const l=RT.last[q.tk]; if(!(l>0)) return;
    if(l<=q.sl){ q.cl="SL"; q.px=l; savePos(); fire(`🛑 ${q.tk} menyentuh SL ${fpx(q.sl)} (harga ${fpx(l)}, entri ${fpx(q.en)}, ${pPct(l,q.en)})`); }
    else if(l>=q.tp2){ q.cl="TP2"; q.px=l; savePos(); fire(`🏁 ${q.tk} menyentuh TP2 ${fpx(q.tp2)} (harga ${fpx(l)}, entri ${fpx(q.en)}, ${pPct(l,q.en)})`); }
    else if(l>=q.tp1&&!q.t1){ q.t1=true; savePos(); fire(`✅ ${q.tk} menyentuh TP1 ${fpx(q.tp1)} (harga ${fpx(l)}, entri ${fpx(q.en)}, ${pPct(l,q.en)})`); }
  });
}
function posStatsHtml(){
  const C=POS.filter(q=>q.cl), A=POS.filter(q=>!q.cl), t1=A.filter(q=>q.t1).length;
  if(!C.length&&!t1) return "";
  const R=C.map(q=>q.px>0&&q.en>0?(q.px-q.en)/q.en*100:null).filter(v=>v!=null), tp=C.filter(q=>q.cl==="TP2").length, sl=C.filter(q=>q.cl==="SL").length;
  const avg=R.length?R.reduce((a,b)=>a+b,0)/R.length:null;
  return `<div class="ex-mut" style="margin-top:6px">📊 <b>Hasil posisi</b> (${C.length} ditutup, maks. 100 terakhir): TP2 ${tp} · SL ${sl}${C.length?` · TP2 tercapai ${Math.round(tp/C.length*100)}%`:""}${avg!=null?` · rata-rata hasil <span class="${avg>=0?"ex-up":"ex-dn"}">${pctS(avg)}</span>`:""}${t1?` · ${t1} masih jalan setelah TP1`:""}${C.length<30?" · <i>sampel masih kecil, jangan disimpulkan dulu</i>":""}</div>`;
}
function posHtml(){
  const act=POS.filter(q=>!q.cl), done=POS.filter(q=>q.cl).slice(-5).reverse();
  const rows=act.concat(done).map(q=>{ const pp=posPxOf(q), l=pp.l, pl=l>0?(l-q.en)/q.en*100:null;
    const st=q.cl==="SL"?"<span class='ex-dn'>🛑 SL kena</span>":q.cl==="TP2"?"<span class='ex-up'>🏁 TP2 kena</span>":q.t1?"<span class='ex-up'>✅ TP1 kena, masih jalan</span>":"<span class='ex-mut'>berjalan</span>";
    return `<tr><td>${tkc(q.tk)}</td><td>${fpx(q.en)}</td><td>${l?fpx(l):"-"}${(!q.cl&&l)?(()=>{ const t=pp.t; if(!t) return ` <small class="ex-mut" title="Belum ada transaksi baru terbaca untuk saham ini sejak perekaman dimulai; harga = harga saat diikuti">· belum update</small>`; const m=Math.round((Date.now()-t)/60000); return m>=2?` <small class="ex-mut" title="Waktu transaksi terakhir yang terbaca untuk saham ini">· ${m>=120?Math.round(m/60)+" jam":m+" mnt"} lalu${pp.src==="srv"?" (dicatat server)":""}</small>`:""; })():""}</td><td>${pl==null?"-":`<span class="${pl>=0?"ex-up":"ex-dn"}">${pctS(pl)}</span>`}</td><td class="ex-dn">${fpx(q.sl)}</td><td class="ex-up">${fpx(q.tp1)}</td><td class="ex-up">${fpx(q.tp2)}</td><td>${st}</td><td><span class="rt-tk" data-rt-unf="${E(q.tk)}|${q.ts}" title="Hapus dari daftar">🗑</span></td></tr>`; });
  return `<div class="ex-card"><h3>📌 Posisi yang diikuti (${act.length} aktif)</h3>${tbl(["Ticker","Entri","Harga","P/L","SL","TP1","TP2","Status",""],rows,"Belum ada. Klik 📌 di kolom Status zona untuk mengikuti rencana suatu saham; alert TP1/TP2/SL dikirim selama perekaman berjalan.")}${posStatsHtml()}<div class="ex-mut" style="margin-top:6px">${POS.some(q=>q.cl)?`<button class="ex-btn" data-rt-posclear="1" style="font-size:11px;padding:1px 8px;float:right">🧹 Hapus yang sudah ditutup</button>`:""}Entri = harga live saat 📌 diklik; SL/TP diambil dari rencana saat itu dan tidak ikut berubah. Harga = transaksi terakhir yang tertangkap: saham sepi bisa tidak berubah berjam-jam (label \"lalu\" menunjukkan umur harga). Alert di browser memakai transaksi yang tertangkap, jadi berjalan saat ▶ Mulai aktif dan tab terbuka. Ini pemantau, bukan pengganti order SL/TP di sekuritas.<div style="margin-top:4px">${posSrvNote()}</div></div></div>`;
}
// 7. uji ulang parameter dari riwayat TP1/SL
function btRun(){
  const L=sigs().filter(g=>(g.o==="T"||g.o==="S")&&g.sl>0&&g.px>g.sl&&g.tp1>g.px).sort((a,b)=>a.ts-b.ts);
  if(L.length<10){ RT.btHtml=`<div class="ex-mut">Baru ${L.length} sinyal dengan hasil TP1/SL (perlu minimal 10, idealnya ratusan). Biarkan perekaman berjalan beberapa hari bursa; hanya sinyal yang dicatat sejak versi 3.11 yang punya data SL/TP1, dan hanya yang punya skor konfluensi/R:R tercatat yang ikut disaring oleh parameter itu.</div>`; return; }
  const rv=g=>g.o==="T"?(g.tp1-g.px)/(g.px-g.sl):-1, types=["*"].concat(Object.keys(TY).filter(t=>L.some(g=>g.ty===t)));
  const wf=L.length>=40, cut=wf?Math.floor(L.length*.6):L.length, TR=L.slice(0,cut), TE=wf?L.slice(cut):[];     // data latih = 60% sinyal terlama, data uji = 40% terbaru
  const pick=(S,c)=>S.filter(g=>(c.ty==="*"||g.ty===c.ty)&&(!c.cs||(g.cs!=null&&g.cs>=c.cs))&&(!c.rr||(g.zr!=null&&g.zr>=c.rr))&&(!c.zo||g.zs==="I"));
  const st=S=>{ const n=S.length, tp=S.filter(g=>g.o==="T").length, ci=wilson(tp,n); return {n,tp,sl:n-tp,w:n?tp/n:0,lo:ci[0],hi:ci[1],ex:n?S.reduce((t,g)=>t+rv(g),0)/n:0}; };
  const seen=new Set(), out=[];
  types.forEach(ty=>[0,50,60,70,75,80].forEach(cs=>[0,1,1.5,2].forEach(rr=>[0,1].forEach(zo=>{
    const c={ty,cs,rr,zo}, S=pick(TR,c); if(!S.length) return; const sig=S.map(g=>g.ts+g.tk+g.ty).join("|"); if(seen.has(sig)) return; seen.add(sig);
    out.push({c,tr:st(S),te:wf?st(pick(TE,c)):null});
  }))));
  const minN=wf?10:15, base=out.find(o=>o.c.ty==="*"&&!o.c.cs&&!o.c.rr&&!o.c.zo), best=out.filter(o=>o.tr.n>=minN).sort((a,b)=>b.tr.ex-a.tr.ex).slice(0,12);
  const rs=x=>`<span class="${x>=0?"ex-up":"ex-dn"}">${x>=0?"+":"−"}${Math.abs(x).toFixed(2)} R</span>`, pw=o=>`${Math.round(o.w*100)}% <span class="ex-mut">(${Math.round(o.lo*100)}–${Math.round(o.hi*100)}%)</span>`;
  const row=o=>`<tr><td>${o.c.ty==="*"?"Semua":TY[o.c.ty]}</td><td>${o.c.cs?"≥ "+o.c.cs:"-"}</td><td>${o.c.rr?"≥ "+o.c.rr:"-"}</td><td>${o.c.zo?"Di zona":"-"}</td><td>${o.tr.n}</td><td>${pw(o.tr)}</td><td>${rs(o.tr.ex)}</td>`
    +(wf?(o.te.n?`<td>${o.te.n}${o.te.n<10?' <span class="ex-mut">⚠</span>':""}</td><td>${pw(o.te)}</td><td>${rs(o.te.ex)}</td>`:`<td>0</td><td>-</td><td>-</td>`):"")+`</tr>`;
  const hd=["Jenis","Skor konfluensi","R:R","Zona","Latih: sinyal","Latih: TP1 dulu","Latih: R"].concat(wf?["Uji: sinyal","Uji: TP1 dulu","Uji: R"]:[]);
  let verdict="";
  if(wf&&best.length){
    const t5=best.slice(0,5).filter(o=>o.te.n>0), n5=t5.reduce((t,o)=>t+o.te.n,0), e5=n5?t5.reduce((t,o)=>t+o.te.ex*o.te.n,0)/n5:null, eb=base&&base.te.n?base.te.ex:null;
    if(e5!=null&&eb!=null){ const d=e5-eb, v=d>0.1?"tampak bertahan pada data uji":d>-0.1?"tidak jelas lebih baik dari dasar":"tidak bertahan pada data uji (kemungkinan overfitting)";
      verdict=`<div class="ex-chips"><span class="ex-chip">Pemeriksaan: 5 kombinasi terbaik di data latih rata² ${e5>=0?"+":"−"}${Math.abs(e5).toFixed(2)} R pada data uji, dasar ${eb>=0?"+":"−"}${Math.abs(eb).toFixed(2)} R → <b>${v}</b></span></div>`; }
  }
  RT.btHtml=`<div class="ex-chips"><span class="ex-chip">${L.length} sinyal terukur (TP1/SL)</span>${wf?`<span class="ex-chip">Latih ${TR.length} (terlama) · Uji ${TE.length} (terbaru)</span>`:`<span class="ex-chip ex-dn">Belum dipisah latih/uji (butuh ≥ 40 sinyal)</span>`}${base?`<span class="ex-chip">Dasar (semua sinyal) di data latih: ${Math.round(base.tr.w*100)}% TP1 dulu · ${base.tr.ex>=0?"+":"−"}${Math.abs(base.tr.ex).toFixed(2)} R</span>`:""}</div>`+verdict
    +tbl(hd,best.map(row),"Belum ada kombinasi dengan sinyal cukup di data latih (minimal "+minN+").")
    +`<div class="ex-mut" style="margin-top:6px;line-height:1.55">R = hasil per sinyal dalam kelipatan risiko: TP1 dulu = +(jarak ke TP1 ÷ jarak ke SL) dari harga sinyal, SL dulu = −1, tak tersentuh tidak dihitung. Kombinasi dipilih hanya dari data latih (${wf?"60% sinyal terlama":"semua sinyal, karena belum cukup untuk dipisah"}); ${wf?"kolom Uji menunjukkan bagaimana pilihan itu bertahan pada sinyal yang lebih baru dan belum dipakai memilih.":"karena itu hasilnya hampir pasti lebih bagus daripada kenyataan ke depan."} Sinyal yang sama bisa muncul di beberapa kombinasi, dan sampel uji kecil (⚠ bila &lt; 10) hanya bisa dijadikan petunjuk.</div>`;
}
function btCard(){ return `<div class="ex-card"><h3>🧪 Uji ulang parameter (dari riwayat TP1/SL)</h3><button class="ex-btn pri" data-act="rtBt">▶ Jalankan</button> <span class="ex-mut">mencoba kombinasi jenis sinyal × skor konfluensi min × R:R min × status zona pada sinyal yang hasil TP1/SL-nya sudah terukur; dipilih dari 60% sinyal terlama lalu diuji pada 40% terbaru (bila ≥ 40 sinyal)</span><div style="margin-top:8px">${RT.btHtml||""}</div></div>`; }
/* ---------- Telegram: rencana trading untuk sinyal lengkap ---------- */
function planText(r,z){
  const p=z.p, t3=top3Of(r.tk,"buy"), fs=favSet(), L=[];
  L.push(`🎯 <b>${E(r.tk)}</b> — sinyal lengkap · skor konfluensi ${r.score} (${r.n} sinyal)`);
  L.push(`Harga ${fpx(z.last)} ${pctS(r.chg)} · net ${fv(r.net)} · ${Math.round(r.pb)}% Buy`);
  L.push(`📍 Zona entri: <b>${p.lo===p.hi?fpx(p.hi):fpx(p.lo)+"–"+fpx(p.hi)}</b> (harga di dalam zona)`);
  L.push(`🛑 SL: <b>${fpx(p.sl)}</b> (${pPct(p.sl,z.last)})`);
  L.push(`✅ TP1: <b>${fpx(p.tp1)}</b> (${pPct(p.tp1,z.last)}) · TP2: <b>${fpx(p.tp2)}</b> (${pPct(p.tp2,z.last)})`);
  L.push(`⚖️ R:R live ke TP1 = 1:${z.rr.toFixed(1)}`);
  { const sz=sizeOf(r.tk), xw=xwOf(r.tk), lq=liqOf(r.tk);
    if(sz) L.push(sz.lot>=1?`📦 Ukuran posisi: ${fpx(sz.lot)} lot (~${fv(sz.val)}, risiko ~${fv(sz.riskRp)})${sz.cap?" — dibatasi modal":""}`:`📦 Ukuran posisi: kurang dari 1 lot pada risiko ${CFG.riskPct}%`);
    L.push(`🧭 Konfirmasi jendela: ${xw.n}/3${lq?` · tape ${lq.rate.toFixed(1)} trx/mnt${lq.thin?" ⚠ tipis":""}${lq.big?" ⚠ posisi besar vs tape":""}`:""}`); }
  if(t3.l.length) L.push(`🏦 Top 3 broker beli${t3.day?" (harian)":""}: `+t3.l.map(x=>E(x[0])+(fs.has(brCode(x[0]))?"⭐":"")+" "+fv(x[1])).join(" · "));
  L.push(`Sinyal: ${E(r.sg.map(x=>x.t).join(", "))}`);
  L.push("","<i>Alat penyaring, bukan rekomendasi. Cek chart &amp; Detail Emiten sebelum bertindak.</i>");
  return L.join("\n");
}
async function sendPlanTg(r,z){
  const text=planText(r,z);
  try{
    if(typeof sendTelegramDirect==="function"){ const q=await sendTelegramDirect(text); if(!q||!q.ok) X.toast("Telegram rencana "+r.tk+" gagal: "+((q&&q.error)||"tidak diketahui"),"down"); return; }
    X.notify(text.replace(/<[^>]+>/g,""),true);
  }catch(e){ X.toast("Telegram rencana gagal: "+(e&&e.message||e),"down"); }
}
/* ---- kolom tambahan untuk tabel per saham ---- */
const rsiCell=v=>v==null||!okNum(v)?"-":`<span class="${v>=70?"ex-dn":v<=30?"ex-up":""}" title="${v>=70?"Jenuh beli (≥70)":v<=30?"Jenuh jual (≤30)":"Netral"}">${v.toFixed(1)}</span>`;
const scoreCell=(v,tip,mx)=>{ if(v==null) return "-"; mx=mx||10; const q=v/mx; return `<span title="${E(tip||"")}"><b class="${q>=.7?"ex-up":q<.5?"ex-dn":""}">${(Math.round(v*10)/10)}</b>/${mx}</span>${bar(q*100)}`; };
const pPct=(p,base)=>(p>=base?"+":"−")+(Math.abs(p-base)/base*100).toFixed(1)+"%";
const planCell=(tk,f)=>{ const p=planOf(tk); if(!p) return "-"; const s=f(p); return p.neg?`<span style="opacity:.55" title="Arus net jual: setup beli kurang valid">${s}</span>`:s; };
function xCols(){
  return [
    {h:"RSI 7",k:a=>techOf(a.tk).rsi7,r:a=>rsiCell(techOf(a.tk).rsi7)},
    {h:"RSI 14",k:a=>techOf(a.tk).rsi14,r:a=>withFresh(rsiCell(techOf(a.tk).rsi14),techOf(a.tk).rsi14,a.tk)},
    {h:"RSI 21",k:a=>techOf(a.tk).rsi21,r:a=>rsiCell(techOf(a.tk).rsi21)},
    {h:"Skor teknikal",k:a=>{ const t=techOf(a.tk); return t.ts==null?null:t.ts/t.tsMax; },r:a=>{ const t=techOf(a.tk); return withFresh(scoreCell(t.ts,t.tsSrc,t.tsMax),t.ts,a.tk); }},
    {h:"Skor fundamental",k:a=>{ const t=techOf(a.tk); return t.fs==null?null:t.fs/t.fsMax; },r:a=>{ const t=techOf(a.tk); return scoreCell(t.fs,t.fsSrc,t.fsMax); }},
    {h:"Skor gabungan",k:a=>{ const c=compOf(a.tk); return c?c.v:null; },r:a=>compCell(a.tk)},
    {h:"Status zona",k:a=>{ const z=zoneOf(a.tk); return z?(z.est?-1:z.st==="I"?100+z.rr:z.st==="L"?50-z.pct:0):null; },r:a=>zoneCell(a.tk)},
    {h:"Zona entri",k:a=>{ const p=planOf(a.tk); return p?p.hi:null; },r:a=>planCell(a.tk,p=>`<span title="Dasar: ${E(p.basis)}">${p.lo===p.hi?fpx(p.hi):fpx(p.lo)+"–"+fpx(p.hi)}</span>`)},
    {h:"Stop loss",k:a=>{ const p=planOf(a.tk); return p?p.sl:null; },r:a=>planCell(a.tk,p=>`<span class="ex-dn" title="Risiko ±${p.risk.toFixed(1)}% dari tengah zona">${fpx(p.sl)} <small>(${pPct(p.sl,p.mid)})</small></span>`)},
    {h:"Take profit 1",k:a=>{ const p=planOf(a.tk); return p?p.tp1:null; },r:a=>planCell(a.tk,p=>`<span class="ex-up" title="Reward:Risk 1:${p.rr1.toFixed(1)}">${fpx(p.tp1)} <small>(${pPct(p.tp1,p.mid)})</small></span>`)},
    {h:"Take profit 2",k:a=>{ const p=planOf(a.tk); return p?p.tp2:null; },r:a=>planCell(a.tk,p=>`<span class="ex-up" title="Reward:Risk 1:${p.rr2.toFixed(1)}">${fpx(p.tp2)} <small>(${pPct(p.tp2,p.mid)})</small></span>`)},
    {h:"Ukuran posisi",k:a=>{ const q=sizeOf(a.tk); return q?q.lot:null; },r:a=>sizeCell(a.tk)},
    {h:"Likuiditas",k:a=>{ const l=liqOf(a.tk); return l?l.rate:null; },r:a=>liqCell(a.tk)},
    {h:"Konfirmasi jendela",k:a=>xwOf(a.tk).n,r:a=>xwCell(a.tk)},
    {h:"Bertahan",k:a=>persKey(a.tk),r:a=>persCell(a.tk)},
    {h:"Arah sektor",s:1,k:a=>secOf(a.tk),r:a=>secCell(a.tk)},
    {h:"Broker favorit",s:1,k:a=>favIn(a.tk,"buy").length,r:a=>{ const f=favIn(a.tk,"buy"); return f.length?`<span title="Broker favorit di Top 3 beli">${f.map(x=>"⭐ <b>"+E(x[0])+"</b> "+fv(x[1])).join("<br>")}</span>`:"-"; }}
  ];
}
/* ---- top 3 broker per saham untuk tabel yang barisnya tidak membawa daftar broker ---- */
function top3Of(tk,side){
  const m=RT.mode==="cum"?RT.cum.get(tk):(memo("bw",brkWin).get(tk)), t=topN(m&&(side==="buy"?m.bb:m.bs),3);
  if(t.length) return {l:t,day:false}; const d=bdTop(tk,side,3); return {l:d,day:d.length>0};
}
function planNote(){
  const d=DAILY, n=Array.from(d.m.values()).filter(e=>!e.none).length;
  const st=!cloudOk()?`<span class="ex-dn">Supabase belum dikonfigurasi, RSI/skor memakai nilai dari Screener bila ada.</span>`:d.err?`<span class="ex-dn">Data harian gagal dibaca: ${E(d.err)}</span>`:`Data harian: ${n} saham termuat${d.busy?" (memuat…)":""}`;
  return `<div class="ex-card"><div class="ex-mut" style="line-height:1.55">📐 <b>Kolom analisa</b>: RSI 7/14/21, Skor teknikal (0-40) dan Skor fundamental (0-60) diambil dari Screener (FundTech Score). Zona entri/SL/TP1/TP2 memakai <code>computeTradePlan()</code> Screener (support/resistance 20D, ATR14, 52w high) dengan harga live running trade; bila Screener belum punya datanya dipakai hitungan cadangan (RSI Wilder dari tabel <code>flows</code>, ATR, reward:risk 1:${PL.tp1}/1:${PL.tp2}). Arahkan kursor ke sel untuk dasar hitungannya. Baris pudar = arus net jual. ${st}${extraNote()}. Ini hitungan mekanis untuk membantu menyaring, bukan rekomendasi beli.</div></div>`;
}
function dyn(){
  const el=document.getElementById("rtDyn"); if(!el) return;
  const dOld=el.querySelector("details"); if(dOld) RT.diagOpen=dOld.open;
  const sc={}; Array.from(el.querySelectorAll(".ex-wrap")).forEach(w=>{ const k=w.getAttribute("data-rt-w"); if(k) sc[k]={x:w.scrollLeft,y:w.scrollTop}; });
  const now=Date.now(), s=RT.st;
  const fqBase=a=>!RT.q||RT.q.split(/[\s,]+/).some(z=>z&&a.tk.startsWith(z));
  const fq=a=>fqBase(a)&&okRow(a)&&(!RT.sec||secOf(a.tk)===RT.sec);
  const fz=a=>fq(a)&&zoneOk(a.tk)&&liqOk(a.tk);          // fq + filter zona entri/R:R (aktif bila dicentang di pengaturan)
  const H=hakaList().filter(fz), A=accList().filter(fz), B=brokerList().filter(fz), F=foreignList().filter(fz), M=marketList().filter(fz), G=gainList().filter(fz);
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
  const warn0=RT.on&&now-s.startAt>45000&&!s.trades?`<div class="ex-warn" style="margin-top:8px">Belum ada transaksi terbaca setelah 45 detik. Lihat bagian Diagnostik di bawah.</div>`:"";
  const pingOnly=RT.on&&CFG.ws&&s.frames>=20&&(s.frames-(s.ping||0))<=2&&!s.parsed;
  const pingWarn=pingOnly?`<div class="ex-warn" style="margin-top:6px">WS hanya menerima sinyal ping (${s.ping||0} dari ${s.frames} frame), bukan transaksi. ${CFG.rest&&s.rest>0?"Data Anda berasal dari REST, jadi ini aman; WS boleh dimatikan.":"Buka halaman Running Trade di tab Stockbit atau centang Sumber REST polling."}</div>`:"";
  const gapWarn=RT.on&&CFG.rest&&RT.gapFeedAt&&now-RT.gapFeedAt<120000?`<div class="ex-warn" style="margin-top:6px">Feed pasar terlalu ramai untuk satu tarikan REST (${s.gapN||0} tarikan terpotong): sebagian transaksi bisa terlewat dan nilai HAKA/Buy bisa lebih kecil dari Stockbit. Perkecil Interval REST (mis. 1–2 detik).</div>`:"";
  const lotWarn=RT.on&&(CFG.minLot||0)>=200?`<div class="ex-warn" style="margin-top:6px">Min lot per transaksi = ${CFG.minLot}: semua transaksi di bawah ${CFG.minLot} lot dibuang sebelum dihitung. Kalau maksud Anda ambang total lot HAKA, isi di “Min total lot HAKA” dan nolkan kolom ini.</div>`:"";
  const warn=warn0+pingWarn+gapWarn+lotWarn;
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
  const brkCell=(l,tot,day,tk,side)=>{ if(!l.length) return "-"; const fs=side==="buy"?favSet():null; const e=day&&tk?RT.bday.get(tk):null, dl=e&&e.day?" "+e.day.slice(8,10)+"/"+e.day.slice(5,7):"";
    return `<div style="font-size:12px;line-height:1.35;min-width:130px">${l.map(x=>`<div title="${E(x[0])}: ${fv(x[1])}${day?" (harian"+dl+", Broker Summary Stockbit)":` (${tot?Math.round(x[1]/tot*100):0}% dari total ${fv(tot)})`}"><b>${E(x[0])}</b>${fs&&fs.has(brCode(x[0]))?" ⭐":""} ${fv(x[1])}</div>`).join("")}${day?`<div class="ex-mut" style="font-size:10px">harian${dl}</div>`:""}</div>`; };
  const xC=xCols(), t3C=[{h:"Top 3 broker Buy",k:a=>{ const t=top3Of(a.tk,"buy"); return t.l.length?t.l[0][1]:0; },r:a=>{ const t=top3Of(a.tk,"buy"); return brkCell(t.l,a.bv,t.day,a.tk,"buy"); }},
    {h:"Top 3 broker Sell",k:a=>{ const t=top3Of(a.tk,"sell"); return t.l.length?t.l[0][1]:0; },r:a=>{ const t=top3Of(a.tk,"sell"); return brkCell(t.l,a.sv,t.day,a.tk,"sell"); }}];
  const stack=a=>`<div style="display:flex;height:10px;min-width:110px;border-radius:3px;overflow:hidden" title="Buy ${pc1(a.pb)} / Sell ${pc1(a.ps)}"><span style="width:${a.pb.toFixed(1)}%;background:#22c55e"></span><span style="flex:1;background:#ef4444"></span></div>`;
  const BS=bsRows(M,fz), bsB=BS.reduce((t,a)=>t+a.bv,0), bsS=BS.reduce((t,a)=>t+a.sv,0), bsT=bsB+bsS;
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
    {h:"Top 3 broker Buy",k:a=>a.tb.length?a.tb[0][1]:0,r:a=>brkCell(a.tb,a.bv,a.bdyB,a.tk,"buy")},{h:"Top 3 broker Sell",k:a=>a.ts.length?a.ts[0][1]:0,r:a=>brkCell(a.ts,a.sv,a.bdyS,a.tk,"sell")}];
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
  { const lack=[]; BS.forEach(a=>{ if(a.nbd) lack.push(a); }); M.slice(0,60).forEach(a=>{ if(!top3Of(a.tk,"buy").l.length||!top3Of(a.tk,"sell").l.length) lack.push({tk:a.tk,tv:a.vt}); });
    RT.bdWant=Array.from(new Set(lack.sort((p,q)=>(q.tv||0)-(p.tv||0)).map(a=>a.tk))).slice(0,40);
  }
  const bsHead=RT.mode==="cum"?`sejak Mulai${RT.cumDay?" · "+E(RT.cumDay):""}`:`${CFG.accWin} menit terakhir`;
  const RP=repeatList().filter(fq);
  const rpC=[{h:"Ticker",s:1,k:a=>a.tk,r:a=>tkc(a.tk)},{h:"Sisi",s:1,k:a=>a.side,r:a=>`<span class="${a.side==="B"?"ex-up":"ex-dn"}">${a.side==="B"?"HAKA":"HAKI"}</span>`},{h:"Lot / order",k:a=>a.lot,r:a=>fpx(a.lot)},
    {h:"Berulang (kali)",k:a=>a.n,r:a=>a.n},{h:"Total lot",k:a=>a.tl,r:a=>fpx(a.tl)},{h:"Total nilai",k:a=>a.v,r:a=>fv(a.v)},{h:"Broker",s:1,k:a=>a.br,r:a=>a.br?`<b>${E(a.br)}</b>`:"-"},
    {h:"Harga",k:a=>a.hi,r:a=>a.lo===a.hi?fpx(a.lo):fpx(a.lo)+"–"+fpx(a.hi)},{h:"Interval rata² (dtk)",k:a=>a.mean,r:a=>a.mean.toFixed(1)},
    {h:"Pola",s:1,k:a=>a.reg?"1":"0",r:a=>a.reg?`<span title="Jarak antar transaksi sangat teratur (CV ${a.cv.toFixed(2)}): ciri algo/iceberg">🤖 Teratur</span>`:`<span class="ex-mut" title="CV ${a.cv.toFixed(2)}">Acak</span>`},
    {h:"Terakhir (dtk)",k:a=>a.age,r:a=>a.age}];
  const useOpen=CFG.gainBase==="open", baseTxt=useOpen?"open hari ini":"close kemarin";
  const gMark=(src,ok)=>src===ok?"":` <small class="ex-mut" title="${ok==="flows"?"Acuan dari data Screener (perkiraan), bukan dari tabel flows":src==="screener"?"Open dari data Screener (perkiraan)":"Open = transaksi pertama sejak Mulai direkam (bukan open resmi bila perekaman dimulai setelah 09:03 WIB)"}">~</small>`;
  const gP=(v,bold)=>v==null?"-":`<span class="${v>=0?"ex-up":"ex-dn"}">${bold?"<b>"+pctS(v)+"</b>":pctS(v)}</span>`;
  const gC=[{h:"Ticker",s:1,k:a=>a.tk,r:a=>tkc(a.tk)},{h:"Harga",k:a=>a.last,r:a=>fpx(a.last)},
    {h:"Gain vs close",k:a=>a.gc,r:a=>gP(a.gc,!useOpen)+(a.gc>=35?` <span title="Di atas batas ARA umum (35%): cek stock split / aksi korporasi / IPO sebelum percaya angka ini">⚠</span>`:"")},
    {h:"Gain vs open",k:a=>a.go,r:a=>gP(a.go,useOpen)+(a.go==null?"":gMark(a.osrc,"open"))},
    {h:"Close kemarin",k:a=>a.cref,r:a=>a.cref==null?"-":fpx(a.cref)+gMark(a.csrc,"flows")},
    {h:"Open",k:a=>a.oref,r:a=>a.oref==null?"-":fpx(a.oref)+gMark(a.osrc,"open")},
    {h:"HAKA",k:a=>a.hk?a.hk.bv:null,r:a=>a.hk?`<span class="ex-up">${fv(a.hk.bv)}</span>`:"-"},
    {h:"HAKI",k:a=>a.hk?a.hk.sv:null,r:a=>a.hk?`<span class="ex-dn">${fv(a.hk.sv)}</span>`:"-"},
    {h:"Rasio HAKA",k:a=>a.hk?a.hk.ratio:null,r:a=>a.hk?Math.round(a.hk.ratio*100)+"%":"-"},
    {h:"HAKA 60 dtk",k:a=>a.hk?a.hk.b60:null,r:a=>a.hk?`<span class="ex-up">${fv(a.hk.b60)}</span>`:"-"},
    {h:"Lot HAKA",k:a=>a.hk?a.hk.bl:null,r:a=>a.hk?fpx(a.hk.bl):"-"},
    {h:"HAKA besar",k:a=>a.hk?a.hk.big:null,r:a=>a.hk?a.hk.big:"-"},
    {h:"Nilai total",k:a=>a.m?a.m.vt:null,r:a=>a.m?fv(a.m.vt):"-"},
    {h:"Net nilai",k:a=>a.m?a.m.net:null,r:a=>a.m?`<span class="${a.m.net>=0?"ex-up":"ex-dn"}">${fv(a.m.net)}</span>`:"-"},
    {h:"Rasio beli",k:a=>a.m?a.m.ratio:null,r:a=>a.m?Math.round(a.m.ratio*100)+"%":"-"},
    {h:"Lot terbesar",k:a=>a.m?a.m.mx:null,r:a=>a.m?`${fpx(a.m.mx)} <span class="${a.m.mxs==="B"?"ex-up":"ex-dn"}">${a.m.mxs==="B"?"▲":"▼"}</span>`:"-"},
    {h:"Trx/mnt",k:a=>a.m?a.m.rate:null,r:a=>a.m?a.m.rate.toFixed(1):"-"},
    {h:"Umur (dtk)",k:a=>Math.max(0,Math.round((now-(RT.lastTs[a.tk]||now))/1000)),r:a=>Math.max(0,Math.round((now-(RT.lastTs[a.tk]||now))/1000))}];
  const gi=RT.gainInfo||{noRef:0,total:0}, g5=G.filter(a=>a.gain>=5).length, g10=G.filter(a=>a.gain>=10).length, gH=G.filter(a=>a.hk&&a.hk.bv>a.hk.sv).length;
  const prevTxt=PREV.for===(RT.cumDay||dayOf(now))&&PREV.m.size?`close kemarin: ${E(PREV.day)} (${PREV.m.size} saham)`:PREV.busy?"memuat penutupan kemarin…":PREV.err?`<span class="ex-dn">gagal memuat penutupan kemarin: ${E(PREV.err)}</span>`:(typeof cloudOk!=="function"||!cloudOk())?"Supabase belum terhubung — close kemarin dari Screener (perkiraan)":"menunggu data penutupan kemarin";
  const flowTxt=CFG.gainFlow==="haka"?"hanya yang lolos tabel 🔥 HAKA, urut nilai HAKA":CFG.gainFlow==="net"?"hanya yang net beli (HAKA > HAKI, jendela "+CFG.hakaWin+" mnt)":"semua yang naik";
  const gainCard=`<div class="ex-card"><h3>📈 Naik ${CFG.gainMin>0?"≥ "+CFG.gainMin+"% ":""}vs ${baseTxt} (${G.length} saham)</h3>
    <div class="ex-chips"><span class="ex-chip">Naik: <b>${G.length}</b>${G.length?` · net beli ${gH}`:""}</span>${CFG.gainMin<5?`<span class="ex-chip">≥ 5%: ${g5}</span>`:""}${CFG.gainMin<10?`<span class="ex-chip">≥ 10%: ${g10}</span>`:""}<span class="ex-chip">Aliran: ${flowTxt}</span><span class="ex-chip">${prevTxt}</span>${gi.noRef?`<span class="ex-chip" title="Saham yang sudah bertransaksi hari ini tetapi ${baseTxt}-nya tidak ditemukan, jadi gain-nya tidak bisa dihitung dan tidak ditampilkan.">${gi.noRef} dari ${gi.total} saham tanpa acuan</span>`:""}</div>
    ${stbl("rtg",gC.concat(xC),G,"Belum ada saham yang memenuhi syarat (kenaikan, aliran beli, atau "+baseTxt+" belum termuat). Ubah di pengaturan \"Tabel Gain\".",{max:100})}
    <div class="ex-mut" style="margin-top:6px;line-height:1.55">Gain vs close = (harga live − penutupan hari bursa sebelumnya) ÷ penutupan sebelumnya (sama dengan Stockbit). Gain vs open memakai harga transaksi pertama hari ini; bertanda ~ bila perekaman baru dimulai setelah 09:03 WIB atau open diambil dari Screener, jadi bukan open resmi. Kolom HAKA/HAKI/Rasio HAKA dihitung di jendela HAKA (${CFG.hakaWin} menit), HAKA 60 dtk = pembelian agresif semenit terakhir; Net nilai, Rasio beli, dan lot terbesar di jendela akumulasi (${CFG.accWin} menit). Klik judul kolom untuk mengurutkan, mis. HAKA 60 dtk untuk yang sedang diborong saat ini. Hanya saham yang tertangkap running trade hari ini yang bisa muncul; filter Min transaksi, harga min/maks, Watchlist, dan Bullish ikut berlaku. ⚠ = gain di atas 35%: cek stock split/aksi korporasi/IPO.</div></div>`;
  const CF=confList().filter(fz);
  { const dw=[]; [CF,G,A,H,BS,B,F,M].forEach(l=>l.slice(0,40).forEach(a=>dw.push(a.tk))); if(RT.sel) dw.unshift(RT.sel); RT.dayWant=Array.from(new Set(dw)).slice(0,120); }
  const cfC=[{h:"Ticker",s:1,k:a=>a.tk,r:a=>tkc(a.tk)},{h:"Skor",k:a=>a.score,r:a=>`<b>${a.score}</b>${bar(a.score)}`},{h:"Sinyal",k:a=>a.n,r:a=>a.n+"/8"},
    {h:"Sinyal yang terpenuhi",s:1,k:a=>a.sg.map(x=>x.k).join(""),r:a=>`<div style="max-width:420px">${a.sg.map(x=>`<span class="ex-chip${x.k==="S"?" rt-tk":""}"${x.k==="S"?` data-rt-scd="${E(a.tk)}" title="Klik untuk rincian preset"`:""} style="font-size:11px;padding:1px 6px;margin:1px;display:inline-block;white-space:nowrap">${x.t}</span>`).join("")}</div>`},
    {h:"Penalti",s:1,k:a=>a.pen.length,r:a=>a.pen.length?`<span class="ex-dn">${a.pen.join(", ")}</span>`:"-"},
    {h:"Bonus Screener",s:1,k:a=>a.bon.length,r:a=>a.bon.length?`<span class="ex-up">${a.bon.join(", ")}</span>`:"-"},
    {h:"Harga",k:a=>a.last,r:a=>fpx(a.last)},{h:"Δ%",k:a=>a.chg,r:chg},{h:"Net nilai",k:a=>a.net,r:a=>`<span class="${a.net>=0?"ex-up":"ex-dn"}">${fv(a.net)}</span>`},{h:"% Buy",k:a=>a.pb,r:a=>pc1(a.pb)}];
  const maxTier=a=>lotTier({tk:a.tk,px:a.last,lot:a.mx});
  // transaksi terbaru & lot besar
  const withTier=x=>Object.assign({},x,{tier:lotTier(x)});
  const ownF=X.ownTickers(), symF=new Map(), symOkF=tk=>{ let v=symF.get(tk); if(v===undefined){ v=okTk(tk,1e9,ownF); symF.set(tk,v); } return v; };   // filter per saham (harga min/maks, Hanya Watchlist, Hanya Bullish) juga untuk tabel per transaksi
  const tape=[]; for(let i=RT.trades.length-1;i>=0&&tape.length<60;i--){ const x=RT.trades[i]; if(!fq(x)||!symOkF(x.tk)||(CFG.minLot&&x.lot<CFG.minLot)) continue; const y=withTier(x); if(RT.bigOnly&&!y.tier) continue; tape.push(y); }
  const bigFrom=now-CFG.accWin*60000, bigs=[]; for(let i=RT.trades.length-1;i>=0&&bigs.length<150;i--){ const x=RT.trades[i]; if(x.ts<bigFrom) continue; if(!fq(x)||!symOkF(x.tk)||(CFG.minLot&&x.lot<CFG.minLot)) continue; const y=withTier(x); if(y.tier) bigs.push(y); }
  const cnt3=bigs.filter(x=>x.tier>=3).length, cnt2=bigs.filter(x=>x.tier===2).length;
  el.innerHTML=`<div class="ex-card"><div class="ex-mut">
    ${RT.on?"🟢 Merekam":"⚪ Berhenti"}${RT.frozen?" · ⏸ <b>Tampilan dibekukan</b> (data tetap direkam)":""}${s.open===false?` · 🔒 Pasar tutup (data terakhir ${E(s.dataDate||"-")})`:""}${lagTxt}${tokTxt} · WS: ${s.frames} frame (${s.parsed} terbaca, ${s.unparsed} tidak terbaca${s.quote?", "+s.quote+" mirip kuotasi ditolak":""}) · REST: ${s.rest} baris${CFG.rest?` (${CFG.feed?"seluruh pasar"+(s.watch?" + "+s.watch+" ticker bergiliran":""):s.watch?s.watch+" ticker bergiliran":"seluruh pasar"})`:""}${s.restAt?" · terakhir "+new Date(s.restAt).toLocaleTimeString("id-ID"):""}
    · ${s.trades} transaksi di memori (${s.trades?Math.round(s.brk/s.trades*100):0}% bertanda broker)${s.restored?` (${s.restored} dipulihkan)`:""}${s.est?` (${s.est} sisi ditebak ~)`:""}${s.dup?` · ${s.dup} duplikat WS/REST dibuang`:""} · Total HAKA <span class="ex-up">${fv(tot[0])}</span> / HAKI <span class="ex-dn">${fv(tot[1])}</span></div>
    ${s.symBad>s.symOk?`<div class="ex-warn" style="margin-top:6px">Filter symbols[] tampaknya diabaikan Stockbit (respons berisi saham lain), jadi pemantauan per ticker tidak efektif. Kosongkan Ticker otomatis/manual untuk memakai seluruh pasar, atau kirim contoh respons ke chat.</div>`:""}${s.restErr?`<div class="ex-warn" style="margin-top:6px">REST: ${E(s.restErr)}</div>`:""}${s.trades>=30&&!s.brk?`<div class="ex-warn" style="margin-top:6px">Running trade tidak membawa kode broker (0 dari ${s.trades} transaksi), jadi kolom Beli → Jual, tabel Bandar, dan Asing kosong. ${CFG.bday?(RT.bdErr?`Cadangan Broker Summary harian gagal: <b>${E(RT.bdErr)}</b> — cek Token dan Endpoint Broker Summary di Pengaturan. `:`Cadangan aktif: <b>Broker Summary harian Stockbit</b> dipakai untuk kolom Top 3 broker (bertanda "harian"), sinyal 🐋 dan 🌍 (${Array.from(RT.bday.values()).filter(e=>e.ok).length} saham terambil). `):"Cadangan Broker Summary harian dimatikan di pengaturan. "} Nama field baris REST: <b>${E(RT.restKeys.join(", ")||"-")}</b>. Kirim isi Diagnostik (📋 Salin diagnostik) ke chat bila field broker ada tetapi namanya belum dikenali.</div>`:""}${secNote}${tokWarn}${lagWarn}${covWarn}${feedWarn}${warn}</div>
  ${RT.sel?detail(RT.sel):""}${planNote()}${posHtml()}
  <div class="ex-card"><h3>🎯 Konfluensi — saham dengan banyak sinyal sekaligus (${CFG.accWin} menit terakhir, ${CF.length} saham)</h3>
    ${stbl("rtcf",cfC.concat(xC),CF,"Belum ada saham dengan "+CFG.confMin+"+ sinyal. Turunkan \"Min jumlah sinyal konfluensi\" atau tunggu data terkumpul.",{max:30})}
    <div class="ex-mut" style="margin-top:6px">Skor 0–100 dari 8 sinyal: 🔥 HAKA (20), 🧲 Akumulasi (12–20), 🐘 Lot besar (15, net lot besar positif), 🧬 Screener (5–15, Smart Pick/Bullish/Keyakinan/Watchlist), 🐋 Broker dominan (10), 🚀 Momentum (10), 🌍 Asing net beli (5), 🕵 Akumulasi tersembunyi (5). Penalti: ⚠ Distribusi −20, 🔻 Mulai dilepas −20, net jual −10. Penyesuaian skor Screener (bisa dimatikan di pengaturan, hanya untuk saham yang sudah lolos min sinyal): teknikal ≥ 70% +5 / &lt; 40% −5, fundamental ≥ 70% +5 / &lt; 35% −10; arah sektor: % Buy ≥ 55 dan net beli +5, &lt; 45 −5 (min 3 saham aktif di sektor). Sinyal broker/asing butuh data yang membawa kode broker. Ini alat penyaring, bukan rekomendasi beli: cek chart dan Detail Emiten sebelum bertindak.</div></div>
  ${gainCard}
  <div class="ex-card"><h3>🔥 Sedang di-HAKA (${CFG.hakaWin} menit terakhir)</h3>${stbl("rth",hC.concat(xC),H,"Belum ada saham yang memenuhi syarat HAKA.")}</div>
  <div class="ex-card"><h3>🧲 Terakumulasi (${CFG.accWin} menit terakhir)</h3>${stbl("rta",aC.concat(xC),A,"Belum ada saham yang memenuhi syarat akumulasi.")}</div>
  <div class="ex-card"><h3>⚖️ Akumulasi Buy vs Sell per emiten (${bsHead}, ${BS.length} saham)</h3>
    ${RT.mode==="cum"&&CFG.minLot>0?`<div class="ex-warn" style="margin:6px 0">Mode "Sejak Mulai" menghitung <b>semua lot</b>: filter Min lot per transaksi (${fpx(CFG.minLot)}) tidak berlaku di sini karena akumulasi harian disimpan mentah. Pilih "Jendela akumulasi" di kotak Buy/Sell bila ingin angka yang sudah tersaring.</div>`:""}
    <div class="ex-chips"><span class="ex-chip">Total Buy <span class="ex-up">${fv(bsB)}</span> (${bsT?(bsB/bsT*100).toFixed(1):"0.0"}%)</span><span class="ex-chip">Total Sell <span class="ex-dn">${fv(bsS)}</span> (${bsT?(bsS/bsT*100).toFixed(1):"0.0"}%)</span>${["H","D","P"].map(c=>{ const n=BS.filter(a=>a.dv&&a.dv.c===c).length, t=c==="H"?"🕵 Akumulasi tersembunyi":c==="D"?"⚠ Distribusi":"🧱 Penyerapan jual"; return n?`<span class="ex-chip">${t}: ${n}</span>`:""; }).join("")}</div>
    ${stbl("rtbs",bsC.concat(xC),BS,"Belum ada transaksi.",{max:100})}<div class="ex-mut" style="margin-top:6px">Buy = transaksi HAKA (pembeli agresif), Sell = HAKI (penjual agresif); % dihitung dari nilai (Rp) dan lot. Pilih jendela atau akumulasi sejak Mulai di kotak "Buy/Sell" di atas (mode sejak Mulai tersimpan saat refresh, reset saat hari bursa berganti, dan tidak terkena filter min lot). Hijau pada bar = porsi Buy, merah = porsi Sell. Sisi bertanda ~ di tape adalah tebakan tick-rule. "Momentum" = %Buy 2 menit terakhir vs 5 menit sebelumnya: 🚀 bila naik ≥ 15 poin ke ≥ 60% dengan tape ≥ 1,5× lebih cepat dan net beli berarti, 🔻 kebalikannya; hanya aktif setelah ≥ 7 menit data terkumpul. Tape × = kecepatan transaksi 2 menit terakhir ÷ rata-rata 5 menit sebelumnya. Tren = %Buy per menit 10 menit terakhir. "Divergensi" = indikasi harga vs aliran (🕵 net beli besar tapi harga datar/turun, ⚠ harga naik tapi net jual besar, 🧱 banyak HAKI tapi harga bertahan; hanya heuristik, bukan kepastian). "Lolos preset" = jumlah preset yang lolos dari total (Smart Pick, Trend Bullish, Keyakinan Tinggi, Watchlist/Posisi); arahkan kursor untuk nama-namanya, klik untuk rincian (skor, definisi, filter) dan daftar yang belum lolos. Top 3 broker = 3 broker dengan total nilai beli/jual terbesar di saham itu (kedua sisi transaksi, seperti broker summary; arahkan kursor untuk porsinya); "-" berarti sumber data tidak membawa kode broker.</div></div>
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
    ${stbl("rtm",mC.concat(t3C,xC),M,"Belum ada transaksi.",{max:80,cls:a=>tcls(maxTier(a))})}<div class="ex-mut" style="margin-top:6px">Tanpa syarat sinyal, hanya filter pengaturan (min trx, harga, lot). Baris diwarnai bila lot terbesar saham itu tergolong besar. Umur = detik sejak transaksi terakhir; Trx/mnt = kecepatan tape. Bandingkan Net nilai & Net lot dengan Stockbit untuk jendela yang sama.</div></div>
  <div class="ex-card"><h3>🐋 Bandar akumulasi — broker net beli (${CFG.accWin} menit terakhir)</h3>${stbl("rtk",bC.concat(xC),B,bEmpty)}<div class="ex-mut" style="margin-top:6px">🐋 = broker menguasai ≥ 40% pembelian saham itu dan net belinya ≥ 2× batas. 🌍 = broker asing. Order beli yang dipecah menjadi banyak transaksi dihitung sebagai satu "beli besar".</div></div>
  <div class="ex-card"><h3>🌍 Aliran asing — net beli/jual broker asing (${CFG.accWin} menit terakhir)</h3>${stbl("rtf",fC.concat(xC),F,fEmpty)}<div class="ex-mut" style="margin-top:6px">Net = beli asing − jual asing (hijau = net beli, merah = net jual). Porsi = rata-rata porsi sisi beli dan jual yang dipegang broker asing. Batas memakai Min net broker/bandar.</div></div>
  ${hitHtml()}
  ${sigHtml()}${btCard()}
  <div class="ex-card"><h3>Transaksi terbaru${RT.bigOnly?" (hanya lot besar)":""}${CFG.minLot?` <span class="ex-mut" style="font-weight:400">· lot ≥ ${fpx(CFG.minLot)}</span>`:""}</h3>${stbl("rtt",trCols,tape,"Belum ada transaksi.",{cls:x=>tcls(x.tier)})}</div>
  <div class="ex-card"><details${RT.diagOpen?" open":""}><summary class="ex-mut" style="cursor:pointer">Diagnostik format data</summary>
    <div class="ex-mut" style="margin:8px 0;line-height:1.55">Contoh frame yang tidak terbaca (maks 5 terakhir). Kalau transaksi tetap 0 padahal frame terus masuk, format WebSocket belum cocok dengan parser; salin contoh ini ke chat supaya parser disesuaikan, atau pakai sumber REST. Kalau transaksi WS tetap 0 padahal frame masuk dan "mirip kuotasi ditolak" besar, matikan opsi "Tolak frame mirip kuotasi".</div>
    <button class="ex-btn" data-act="rtCopyDiag">📋 Salin diagnostik</button>
    <pre class="mono" style="white-space:pre-wrap;word-break:break-all;font-size:11px">Nama field baris REST: ${E(RT.restKeys.join(", ")||"(belum ada)")}\n\nContoh baris REST (3 pertama):\n${RT.restRaw.length?RT.restRaw.map(E).join("\n\n"):"(belum ada)"}\n\nFrame WS pertama diterima:\n${RT.first.length?RT.first.map(E).join("\n\n"):"(belum ada)"}\n\nTidak terbaca:\n${RT.samples.length?RT.samples.map(E).join("\n\n"):"(belum ada)"}</pre></details></div>`;
  cardBg(el); cloudStUpdate();
  el.querySelectorAll(".ex-wrap").forEach(w=>{ const p=sc[w.getAttribute("data-rt-w")]; if(p){ w.scrollLeft=p.x; w.scrollTop=p.y; } });
  syncBars(el);
  RT.mkt=M; RT.mktCols=mC.concat(t3C,xC);
}
/* ---------- riwayat sinyal & hit-rate ---------- */
const TY={H:"🔥 HAKA",A:"🧲 Akumulasi",B:"🐋 Bandar",L:"🐘 Lot besar",M:"🚀 Momentum",C:"🎯 Konfluensi"};
const sigs=()=>{ const l=LS("rt_sig",[]); return Array.isArray(l)?l:[]; };
function rec(ty,tk,px,info){
  const L=sigs(), z=zoneOf(tk), g={ty,tk,ts:Date.now(),px:px||RT.last[tk]||0,info,pr:presetName(),p5:null,p15:null,p30:null,m0:mkIdx(),mv:2,cs:csOf(tk)};
  if(z){ g.zr=z.rr; g.zs=z.est?"E":z.st; g.zl=z.p.lo; g.zh=z.p.hi; g.sl=z.p.sl; g.tp1=z.p.tp1; g.o=null; }      // o: null=menunggu, "T"=TP1 dulu, "S"=SL dulu, "N"=tak tersentuh sampai penutupan, false=tak terukur
  L.push(g);
  if(L.length>2000) L.splice(0,L.length-2000); SV("rt_sig",L);
}
function evalSigs(){            // harga +15/+30 menit diambil dari transaksi terakhir yang masuk (maks 3 menit lalu)
  const L=sigs(), now=Date.now(); let ch=false;
  L.forEach(g=>[[5,"p5"],[15,"p15"],[30,"p30"]].forEach(([m,k])=>{
    if(g[k]!==null) return; const age=now-g.ts; if(age<m*60000) return;
    if(RT.lastTs[g.tk]&&now-RT.lastTs[g.tk]<180000){ g[k]=RT.last[g.tk]; g["m"+k.slice(1)]=mkIdx(); ch=true; }
    else if(age>(m+4)*60000){ g[k]=false; ch=true; }
  }));
  if(tpslEval(L)) ch=true;
  if(ch) SV("rt_sig",L);
}
function tpslEval(L){          // TP1 atau SL (dari rencana saat sinyal) tersentuh lebih dulu pada hari yang sama? Dibaca dari transaksi yang tertangkap setelah sinyal.
  const pend=L.filter(g=>g.o===null&&g.sl>0&&g.tp1>0); if(!pend.length) return false;
  const now=Date.now(), today=new Date(now+7*3600000).toISOString().slice(0,10), by=new Map(); let ch=false;
  pend.forEach(g=>{ let a=by.get(g.tk); if(!a){ a=[]; by.set(g.tk,a); } a.push(g); });
  if(RT.on) pend.forEach(g=>{ if(g.sa&&now-g.sa>300000) g.gap=true; g.sa=now; });   // detak: bila ada jeda >5 mnt (tab ditutup/berhenti), hasil hari itu ditandai tak terukur
  if(now-(RT.hbSave||0)>30000){ RT.hbSave=now; ch=true; }
  const minSx=Math.min(...pend.map(g=>g.sx||g.ts)), xs=[];
  for(let i=RT.trades.length-1;i>=0;i--){ const x=RT.trades[i]; if(x.ts<minSx-120000) break; if(x.ts>minSx&&x.px>0&&by.has(x.tk)) xs.push(x); }
  xs.sort((a,b)=>a.ts-b.ts);
  xs.forEach(x=>by.get(x.tk).forEach(g=>{
    if(g.o!==null||x.ts<=(g.sx||g.ts)) return; g.sx=x.ts;
    if(x.px>=g.tp1){ g.o="T"; ch=true; } else if(x.px<=g.sl){ g.o="S"; ch=true; }
  }));
  pend.forEach(g=>{
    if(g.o!==null) return; const d=new Date(g.ts+7*3600000).toISOString().slice(0,10);
    if(d<today||(d===today&&now>=Date.parse(d+"T09:05:00Z"))){ g.o=(!g.gap&&(g.sa||0)>=Date.parse(d+"T08:30:00Z"))?"N":false; ch=true; }   // 09:05 UTC = 16:05 WIB; 08:30 UTC = 15:30 WIB
  });
  return ch;
}
const osCell=g=>!(g.sl>0)?"<span class='ex-mut'>-</span>":g.o==="T"?"<span class='ex-up'>✅ TP1 dulu</span>":g.o==="S"?"<span class='ex-dn'>🛑 SL dulu</span>":g.o==="N"?"<span class='ex-mut'>tak tersentuh</span>":g.o===false?"<span class='ex-mut'>tak terukur</span>":"<span class='ex-mut'>menunggu</span>";
const ret=g=>(typeof g.p30==="number"&&g.px)?(g.p30-g.px)/g.px*100:null;
/* ---------- analisa hit-rate per sinyal (jenis / preset / jam / saham) ---------- */
function wilson(w,n){ if(!n) return [0,0]; const z=1.96,p=w/n,d=1+z*z/n,c=p+z*z/(2*n),a=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n)); return [Math.max(0,(c-a)/d),Math.min(1,(c+a)/d)]; }
const retAt=(g,k)=>{ const v=g[k]; return (typeof v==="number"&&g.px)?(v-g.px)/g.px*100:null; };
const median=a=>{ if(!a.length) return null; const t=a.slice().sort((x,y)=>x-y), m=t.length>>1; return t.length%2?t[m]:(t[m-1]+t[m])/2; };
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const GB={ty:"jenis sinyal",pr:"preset",typr:"jenis × preset",hr:"jam (WIB)",tk:"saham",zs:"status zona saat sinyal"};
function hitRows(){
  const L=sigs(), m=new Map(), cost=+CFG.cost||0;
  const key=g=>RT.gb==="zs"?(ZS[g.zs]||"Tanpa rencana"):RT.gb==="pr"?(g.pr||"Kustom"):RT.gb==="typr"?(TY[g.ty]||g.ty)+" · "+(g.pr||"Kustom"):RT.gb==="hr"?String(new Date(g.ts+7*3600000).getUTCHours()).padStart(2,"0")+":00":RT.gb==="tk"?g.tk:(TY[g.ty]||g.ty);
  L.forEach(g=>{ const k=key(g); let a=m.get(k); if(!a){ a={k,n:0,r5:[],r15:[],r30:[],tp:0,sl:0,nn:0,x30:[],mk:[]}; m.set(k,a); } a.n++; if(g.o==="T") a.tp++; else if(g.o==="S") a.sl++; else if(g.o==="N") a.nn++;
    { const xr=relRet(g); if(xr!==null){ a.x30.push(xr); a.mk.push(g.m30-g.m0); } }
    [["r5","p5"],["r15","p15"],["r30","p30"]].forEach(([x,p])=>{ const r=retAt(g,p); if(r!==null) a[x].push(r); }); });
  const hit=r=>r.length?r.filter(v=>v>0).length/r.length:null, out=[];
  m.forEach(a=>{ const w=a.r30.filter(v=>v>0), l=a.r30.filter(v=>v<=0), ci=wilson(w.length,a.r30.length);
    out.push({k:a.k,n:a.n,e30:a.r30.length,h5:hit(a.r5),h15:hit(a.r15),h30:hit(a.r30),lo:ci[0],hi:ci[1],a15:avg(a.r15),a30:avg(a.r30),m30:median(a.r30),
      hc:a.r30.length?a.r30.filter(v=>v>cost).length/a.r30.length:null,aw:avg(w),al:avg(l),tp:a.tp,sl:a.sl,nn:a.nn,wt:(a.tp+a.sl)?a.tp/(a.tp+a.sl):null,wci:wilson(a.tp,a.tp+a.sl),hx:hit(a.x30),ax:avg(a.x30),am:avg(a.mk),nx:a.x30.length}); });
  out.sort((x,y)=>y.n-x.n); return RT.gb==="tk"?out.slice(0,15):out;
}
function hitHtml(){
  const L=sigs(), rows=hitRows(); RT.hitRows=rows;
  const all=L.map(g=>retAt(g,"p30")).filter(v=>v!==null), w=all.filter(v=>v>0).length, ci=wilson(w,all.length), cost=+CFG.cost||0;
  const pc=v=>v==null?"-":`<span class="${v>=.55?"ex-up":v<=.45?"ex-dn":""}">${Math.round(v*100)}%</span>`, rp=v=>v==null?"-":`<span class="${v>=0?"ex-up":"ex-dn"}">${pctS(v)}</span>`;
  const cols=[{h:GB[RT.gb]?GB[RT.gb][0].toUpperCase()+GB[RT.gb].slice(1):"Grup",s:1,k:r=>r.k,r:r=>E(r.k)},{h:"Sinyal",k:r=>r.n,r:r=>r.n},{h:"Terukur +30m",k:r=>r.e30,r:r=>r.e30<30?`${r.e30} <span class="ex-dn" title="Kurang dari 30 sinyal terukur: belum bisa disimpulkan, rentang 95% masih lebar">⚠ sampel kecil</span>`:r.e30},
    {h:"Hit +5m",k:r=>r.h5,r:r=>pc(r.h5)},{h:"Hit +15m",k:r=>r.h15,r:r=>pc(r.h15)},
    {h:"Hit +30m (rentang 95%)",k:r=>r.h30,r:r=>r.h30==null?"-":`${pc(r.h30)} <span class="ex-mut">(${Math.round(r.lo*100)}–${Math.round(r.hi*100)}%)</span>`},
    {h:"Rata² +15m",k:r=>r.a15,r:r=>rp(r.a15)},{h:"Rata² +30m",k:r=>r.a30,r:r=>rp(r.a30)},{h:"Median +30m",k:r=>r.m30,r:r=>rp(r.m30)},
    {h:"Hit +30m > biaya "+cost+"%",k:r=>r.hc,r:r=>pc(r.hc)},{h:"Rata² menang",k:r=>r.aw,r:r=>rp(r.aw)},{h:"Rata² kalah",k:r=>r.al,r:r=>rp(r.al)},
    {h:"TP1 dulu",k:r=>r.tp,r:r=>r.tp?`<span class="ex-up">${r.tp}</span>`:"0"},{h:"SL dulu",k:r=>r.sl,r:r=>r.sl?`<span class="ex-dn">${r.sl}</span>`:"0"},{h:"Tak tersentuh",k:r=>r.nn,r:r=>r.nn},
    {h:"TP1 vs SL (rentang 95%)",k:r=>r.wt,r:r=>r.wt==null?"-":`${pc(r.wt)} <span class="ex-mut">(${Math.round(r.wci[0]*100)}–${Math.round(r.wci[1]*100)}%, n=${r.tp+r.sl})</span>${r.tp+r.sl<20?' <span class="ex-mut">⚠ sampel kecil</span>':""}`},
    {h:"Pasar +30m",k:r=>r.am,r:r=>rp(r.am)},{h:"Hit +30m vs pasar",k:r=>r.hx,r:r=>r.hx==null?"-":`${pc(r.hx)} <span class="ex-mut">(n=${r.nx})</span>`},{h:"Rata² relatif +30m",k:r=>r.ax,r:r=>rp(r.ax)},
    {h:"Catatan",r:r=>r.e30<20?`<span class="ex-mut" style="white-space:nowrap">⚠ sampel kecil (${r.e30} &lt; 20)</span>`:""}];
  return `<div class="ex-card"><h3>📈 Analisa hit-rate per sinyal <button class="ex-btn" data-act="rtCopyHit" style="float:right">📋 Salin CSV</button></h3>
    ${L.length?`<div class="ex-chips"><span class="ex-chip">${L.length} sinyal tercatat</span><span class="ex-chip">${all.length} terukur +30 mnt</span>${all.length?`<span class="ex-chip">Hit-rate keseluruhan ${Math.round(w/all.length*100)}% <span class="ex-mut">(${Math.round(ci[0]*100)}–${Math.round(ci[1]*100)}%)</span></span><span class="ex-chip">Rata-rata ${pctS(avg(all))} · median ${pctS(median(all))}</span>`:""}</div>`:""}
    ${stbl("rths",cols,rows,"Belum ada sinyal tercatat. Sinyal 🔥 🐋 🧲 🐘 🚀 🎯 tercatat otomatis saat alert muncul (dan saat tab ini terbuka); hasil +5/+15/+30 menit terisi seiring waktu.",{max:40})}
    <div class="ex-mut" style="margin-top:6px;line-height:1.55">Dikelompokkan menurut <b>${GB[RT.gb]||"jenis sinyal"}</b> (ubah di kotak "Analisa sinyal per" di bawah tombol Mulai). Hit = harga +N menit lebih tinggi dari harga sinyal; "&gt; biaya" = lebih tinggi dari biaya jual-beli bolak-balik ${cost}% (ubah di pengaturan). Rentang 95% (Wilson) menunjukkan ketidakpastian: makin sedikit sampel, makin lebar. <b>vs pasar</b> = hasil +30m dikurangi pergerakan proksi indeks (rata² perubahan harga 45 saham tersibuk sejak harga awal perekaman hari itu, ditimbang nilai transaksi; ini proksi, bukan IHSG) pada jendela yang sama; hanya terisi untuk sinyal yang dicatat sejak v3.12 dan butuh ≥ 15 saham aktif. <b>Hati-hati menafsirkan:</b> tanpa pembanding pasar, hit-rate tinggi bisa hanya berarti seluruh pasar sedang naik; kurang dari ±30 sinyal terukur per kelompok sebaiknya dianggap petunjuk, bukan bukti. <b>TP1 vs SL</b>: sejak sinyal, mana yang lebih dulu tersentuh oleh transaksi yang tertangkap — TP1 atau SL dari rencana saat sinyal (zona/SL/TP1 diambil dari <code>planOf()</code> pada detik sinyal) — pada hari bursa yang sama; sampai penutupan tak ada yang tersentuh = "tak tersentuh". Hasil ditandai tak terukur bila perekaman terputus >5 menit. Rasio = TP1 ÷ (TP1 + SL); pakai pengelompokan "status zona saat sinyal" untuk melihat apakah sinyal yang sudah telat memang lebih buruk. Hanya sinyal sisi beli yang dicatat (lot besar HAKI tidak), dan hasil diukur dari transaksi terakhir yang tertangkap, bukan harga yang pasti bisa Anda eksekusi.</div></div>`;
}
X.act("rtCopyHit",()=>copy(["grup,sinyal,terukur30,hit5,hit15,hit30,hit30_lo,hit30_hi,avg15,avg30,median30,hit30_di_atas_biaya,avg_menang,avg_kalah,tp1_dulu,sl_dulu,tak_tersentuh"].concat((RT.hitRows||[]).map(r=>[ '"'+r.k+'"',r.n,r.e30,r.h5,r.h15,r.h30,r.lo,r.hi,r.a15,r.a30,r.m30,r.hc,r.aw,r.al,r.tp,r.sl,r.nn].map(v=>typeof v==="number"&&!Number.isInteger(v)?+v.toFixed(4):v).join(","))).join("\n"),"Tabel hit-rate disalin"));
function sigHtml(){
  const L=sigs(), st={};
  L.forEach(g=>{ const t=st[g.ty]||(st[g.ty]={n:0,e:0,w:0,r:0}); t.n++; const r=ret(g); if(r!==null){ t.e++; t.r+=r; if(r>0) t.w++; } });
  const sum=Object.keys(TY).filter(k=>st[k]).map(k=>{ const t=st[k];
    return `<span class="ex-chip">${TY[k]}: ${t.n} sinyal · ${t.e?`hit-rate ${Math.round(t.w/t.e*100)}% · rata-rata ${pctS(t.r/t.e)} (30 mnt, ${t.e} terukur)`:"belum terukur"}</span>`; }).join(" ");
  const cell=(g,k)=>{ const v=g[k]; if(v===undefined) return "<span class='ex-mut'>-</span>"; if(v===null) return "<span class='ex-mut'>menunggu</span>"; if(v===false) return "<span class='ex-mut'>tak terukur</span>";
    const r=(v-g.px)/g.px*100; return `<span class="${r>=0?"ex-up":"ex-dn"}">${pctS(r)}</span>`; };
  const rows=L.slice(-40).reverse().map(g=>`<tr><td>${new Date(g.ts).toLocaleString("id-ID",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</td><td>${TY[g.ty]||g.ty}</td><td><b>${E(g.tk)}</b>${badges(g.tk)}</td><td>${fpx(g.px)}</td><td>${cell(g,"p5")}</td><td>${cell(g,"p15")}</td><td>${cell(g,"p30")}</td><td>${osCell(g)}</td><td class="ex-mut">${E(g.info||"")}</td></tr>`);
  return `<div class="ex-card"><h3>📜 Riwayat sinyal &amp; hit-rate</h3>
    <div class="ex-chips">${sum||'<span class="ex-mut">Belum ada sinyal tercatat.</span>'}</div>
    ${tbl(["Waktu","Jenis","Ticker","Harga sinyal","+5 mnt","+15 mnt","+30 mnt","TP1/SL","Info"],rows,"Sinyal akan tercatat otomatis saat alert muncul.")}
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
  const from=now-CFG.accWin*60000, bg=[], ownD=X.ownTickers(); for(const x of RT.trades){ if(x.ts<from||(CFG.minLot&&x.lot<CFG.minLot)||!okTk(x.tk,1e9,ownD)) continue; const t=lotTier(x); if(t>0) bg.push({x,v:x.px*x.lot*100}); }
  bg.sort((p,q)=>q.v-p.v);
  const L=sigs().map(g=>retAt(g,"p30")).filter(v=>v!==null), win=L.filter(v=>v>0).length;
  const lines=[`📊 <b>Digest Running Trade</b> · ${hh} WIB (${kind})`,`Jendela ${CFG.accWin} menit · ${M.length} saham · Buy ${fv(tb)} / Sell ${fv(ts)} (${tb+ts?Math.round(tb/(tb+ts)*100):0}% Buy)`,""];
  lines.push(`🎯 <b>Konfluensi teratas</b>`);
  if(CF.length) CF.forEach((r,i)=>lines.push(`${i+1}. <b>${E(r.tk)}</b> skor ${r.score} (${r.n} sinyal) · ${fpx(r.last)} ${pctS(r.chg)} · net ${fv(r.net)} · ${Math.round(r.pb)}% Buy`)); else lines.push("— belum ada saham dengan "+CFG.confMin+"+ sinyal");
  if(up.length) lines.push("","🚀 <b>Mulai diborong:</b> "+up.slice(0,5).map(o=>`${E(o.tk)} (+${Math.round(o.a.d)} pp, ${o.a.spike.toFixed(1)}×)`).join(", "));
  if(dn.length) lines.push("🔻 <b>Mulai dilepas:</b> "+dn.slice(0,5).map(o=>E(o.tk)).join(", "));
  if(bg.length){ lines.push("","🐘 <b>Lot besar terbesar</b>"); bg.slice(0,3).forEach(o=>lines.push(`• ${E(o.x.tk)} ${fpx(o.x.lot)} lot @ ${fpx(o.x.px)} (${fv(o.v)}) ${o.x.side==="B"?"HAKA":"HAKI"}${o.x.side==="B"&&o.x.buyer?" · "+E(o.x.buyer):o.x.side==="S"&&o.x.seller?" · "+E(o.x.seller):""}`)); }
  { const ap=POS.filter(q=>!q.cl);
    if(ap.length){ lines.push("","📌 <b>Posisi diikuti</b>"); ap.slice(0,8).forEach(q=>{ const l=RT.last[q.tk]||0; lines.push(`• ${E(q.tk)} entri ${fpx(q.en)} → ${l?fpx(l)+" ("+pctS((l-q.en)/q.en*100)+")":"-"} · SL ${fpx(q.sl)} · TP1 ${fpx(q.tp1)}${q.t1?" ✅":""}`); }); } }
  const RL=sigs().map(relRet).filter(v=>v!==null);
  if(L.length) lines.push("",`📈 Hit-rate sinyal +30 mnt: ${Math.round(win/L.length*100)}% (${L.length} terukur)${RL.length>=10?" · lebih baik dari pasar: "+Math.round(RL.filter(v=>v>0).length/RL.length*100)+"% ("+RL.length+" terukur)":" — indikatif, belum dibanding pasar"}`);
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
  if(CFG.gainAlert){                                   // saham yang baru menembus ambang gain; keadaan awal (saham yang sudah di atas ambang saat Mulai/refresh) dicatat diam-diam supaya tidak banjir alert
    const day=RT.cumDay||dayOf(now);
    if(PREV.for===day&&PREV.m.size){
      const G=gainList();
      if(RT.gainSeed!==day){ RT.gainSeed=day; G.forEach(a=>{ RT.flag["G"+a.tk+day]=now; }); }
      else { let n=0; G.forEach(a=>{
        const k="G"+a.tk+day; if(RT.flag[k]||n>=5||now-(RT.lastTs[a.tk]||0)>120000) return; RT.flag[k]=now; n++;
        fire(`📈 ${a.tk} naik ${pctS(a.gain)} vs ${CFG.gainBase==="open"?"open":"close kemarin"} (harga ${fpx(a.last)}, acuan ${fpx(a.ref)}${a.src==="flows"||a.src==="open"?"":" ~"})${a.hk?` · HAKA ${fv(a.hk.bv)} (${Math.round(a.hk.ratio*100)}%)`:""}${a.m?` · net ${fv(a.m.net)}`:""}`);
      }); }
    }
  }
  if(CFG.confAlert){
    confList().filter(r=>r.score>=75&&r.n>=4).forEach(r=>{
      const k="C"+r.tk; if(now-(RT.flag[k]||0)<15*60000) return; RT.flag[k]=now;
      const nm=r.sg.map(x=>x.t).join(", ");
      rec("C",r.tk,r.last,`skor ${r.score}: ${nm}`); fire(`🎯 ${r.tk} konfluensi skor ${r.score} (${r.n} sinyal: ${nm})${r.pen.length?" — "+r.pen.join(", "):""}`);
    });
  }
  posCheck();
  if(CFG.tgPlan){                                      // sinyal lengkap: konfluensi tinggi + harga di zona entri + R:R memadai + arus net beli; cooldown 30 mnt per saham
    confList().filter(r=>r.score>=CFG.tgPlanScore&&r.net>0).forEach(r=>{
      const k="P"+r.tk; if(now-(RT.flag[k]||0)<30*60000) return;
      const z=zoneOf(r.tk); if(!z||z.est||z.st!=="I"||z.rr<CFG.rrMin) return;
      if(CFG.persMin>0&&persMins(r.tk)<CFG.persMin) return; const lq=liqOf(r.tk); if(lq&&lq.thin) return;
      RT.flag[k]=now; sendPlanTg(r,z);
    });
  }
  if(CFG.favAlert&&favSet().size){
    marketList().forEach(a=>favIn(a.tk,"buy").forEach(x=>{
      const k="F"+a.tk+brCode(x[0]); if(now-(RT.flag[k]||0)<30*60000) return; RT.flag[k]=now;
      fire(`⭐ ${a.tk}: broker favorit ${x[0]} masuk Top 3 beli (${fv(x[1])})`);
    }));
  }
  RT.bigQ.splice(0).forEach(x=>{                       // lot JUMBO/MEGA: cooldown 2 menit per ticker+sisi; hanya sisi HAKA yang dicatat ke hit-rate
    if(CFG.minLot&&x.lot<CFG.minLot) return; if(!okTk(x.tk,1e9,X.ownTickers())) return;
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
    feed:g("rt-feed").checked,rejQuote:g("rt-quote").checked,bigAlert:g("rt-balert").checked,momAlert:g("rt-malert").checked,gainAlert:g("rt-galert").checked,confAlert:g("rt-calert").checked,hoverPause:g("rt-hover").checked,cost:Math.max(0,n("rt-cost",0.4)),digest:g("rt-dg").checked,digestMin:Math.max(5,n("rt-dgmin",30)),digestN:Math.max(1,Math.min(10,n("rt-dgn",5))),digestClose:g("rt-dgc").checked,bday:g("rt-bday").checked,cloud:g("rt-cloud").checked,cloudMin:Math.max(5,n("rt-cloudmin",10)),confMin:Math.max(1,Math.min(8,n("rt-cmin",3))),
    pollSec:n("rt-poll",3),auto:g("rt-auto").checked,adapt:g("rt-adapt").checked,perPoll:n("rt-pp",5),refAdvM:n("rt-ref",20),tickers:g("rt-tickers").value.trim(),hakaWin:n("rt-hw",5),accWin:n("rt-aw",15),hakaMinJt:n("rt-hmin",300),
    hakaRatio:n("rt-hr",65),bigJt:n("rt-big",50),accMinJt:n("rt-amin",200),accRatio:n("rt-ar",55),brkMinJt:n("rt-bmin",100),minTrades:n("rt-mt",10),onlyOwn:g("rt-own").checked,onlyBull:g("rt-bull").checked,url:g("rt-url").value.trim()||DEF_URL,
    minLot:n("rt-minlot",0),bigLot:n("rt-biglot",0),hakaMinLot:n("rt-hlot",0),accMinLot:n("rt-alot",0),brkMinLot:n("rt-blot",0),pxMin:n("rt-pmin",0),pxMax:n("rt-pmax",0),
    zoneOnly:g("rt-zone").checked,rrMin:Math.max(0,n("rt-rrmin",1.5)),confScr:g("rt-scr").checked,tgPlan:g("rt-tgp").checked,tgPlanScore:Math.max(1,Math.min(100,n("rt-tgps",75))),favBrk:g("rt-fav").value.trim(),favAlert:g("rt-favalert").checked,
    modal:Math.max(0,n("rt-modal",0)),riskPct:Math.max(0,n("rt-risk",1)),minRate:Math.max(0,n("rt-minrate",0)),persMin:Math.max(0,n("rt-pers",0)),confSec:g("rt-sec").checked,liqPos:Math.max(1,n("rt-liqpos",25)),freshHour:Math.max(0,Math.min(24,n("rt-freshh",18))),gainMin:Math.max(0,n("rt-gain",2)),gainBase:g("rt-gbase").value==="open"?"open":"close",gainFlow:["net","haka"].includes(g("rt-gflow").value)?g("rt-gflow").value:"all"});
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
  RT.mm={}; RT.trades=[]; RT.seen.clear(); RT.fp.clear(); RT.cum.clear(); RT.cumDay=""; SV("rt_cum",{day:"",rows:[]}); RT.bigQ=[]; RT.raw.clear(); RT.last={}; RT.lastSide={}; RT.flag={}; RT.gainSeed=""; RT.samples=[]; RT.restRaw=[]; RT.restKeys=[];
  SV("rt_trd",{at:Date.now(),rows:[]}); RT.dirty=RT.saved=0;
  Object.assign(RT.st,{quote:0,dup:0,nw:0,nr:0,restored:0,frames:0,parsed:0,unparsed:0,trades:0,est:0,brk:0,rest:0,restErr:null,startAt:Date.now()}); dyn();
});
const copy=(t,msg)=>{ try{ navigator.clipboard.writeText(t).then(()=>X.toast(msg,"up")); }catch(e){ X.toast("Gagal menyalin","down"); } };
X.act("rtClearSig",()=>{ SV("rt_sig",[]); dyn(); });
X.act("rtCopySig",()=>copy(["waktu,jenis,preset,ticker,harga,p5,p15,p30,info,status_zona,sl,tp1,hasil_tp_sl"].concat(sigs().map(g=>[new Date(g.ts).toISOString(),g.ty,'"'+(g.pr||"")+'"',g.tk,g.px,g.p5,g.p15,g.p30,'"'+(g.info||"")+'"',g.zs||"",g.sl||"",g.tp1||"",g.o===undefined?"":String(g.o)].join(","))).join("\n"),"Riwayat sinyal disalin"));
X.act("rtCopyDiag",()=>copy(JSON.stringify({stats:RT.st,cfg:{ws:CFG.ws,rest:CFG.rest,feed:CFG.feed,rejQuote:CFG.rejQuote,url:CFG.url},first:RT.first,restKeys:RT.restKeys,rest:RT.restRaw,unparsed:RT.samples},null,1),"Diagnostik disalin — tempel ke chat"));
X.act("rtCopyMkt",()=>{       // CSV tabel Semua saham sesuai urutan sort yang sedang aktif
  const M=(RT.mkt||[]).slice(), c=RT.sort.rtm; if(c&&RT.mktCols[c.i]&&RT.mktCols[c.i].k){ const k=RT.mktCols[c.i].k; M.sort((a,b)=>{ const x=k(a),y=k(b); return (typeof x==="string"?x.localeCompare(y):x-y)*c.d; }); }
  copy(["ticker,harga,chg_pct,nilai_total,net_nilai,rasio_beli,lot_beli,lot_jual,net_lot,lot_besar_n,net_lot_besar,lot_terbesar,trx_per_menit,umur_dtk"].concat(M.map(a=>[a.tk,a.last,a.chg.toFixed(2),Math.round(a.vt),Math.round(a.net),(a.ratio*100).toFixed(0),a.bl,a.sl,a.netL,a.big,a.bigNet,a.mx,a.rate.toFixed(1),a.age].join(","))).join("\n"),"Tabel Semua saham disalin");
});
Object.keys(PRESETS).forEach(k=>X.act("rtPre_"+k,()=>{ readCfg(); applyPreset(PRESETS[k].v,PRESETS[k].n); }));
X.act("rtPreSave",()=>{
  readCfg(); const v={}; PRE_KEYS.forEach(k=>{ v[k]=CFG[k]; }); const L=userPres();
  let nm=prompt("Nama preset (nama yang sama menimpa preset lama):","Preset "+(L.length+1)); if(nm==null) return;
  nm=nm.replace(/\s+/g," ").trim().slice(0,24); if(!nm){ X.toast("Nama preset tidak boleh kosong","down"); return; }
  const ex=L.find(q=>q.n.toLowerCase()===nm.toLowerCase());
  if(ex){ ex.v=v; ex.n=nm; } else { if(L.length>=12){ X.toast("Maksimal 12 preset — hapus salah satu dulu","down"); return; } L.push({id:"p"+Date.now().toString(36),n:nm,v}); }
  SV("rt_presets_user",L); X.repaint(); dyn(); X.toast(ex?"Preset \""+nm+"\" diperbarui":"Preset \""+nm+"\" disimpan","up");
});
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
async function loadXlsx(){
  if(typeof XLSX!=="undefined") return XLSX;
  await new Promise((ok,no)=>{ const sc=document.createElement("script"); sc.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; sc.onload=ok; sc.onerror=()=>no(new Error("library XLSX gagal dimuat")); document.head.appendChild(sc); });
  if(typeof XLSX==="undefined") throw new Error("library XLSX tidak tersedia");
  return XLSX;
}
function xlsxCell(h,r){ let v; try{ v=h.k(r); }catch(e){ v=null; } if(h.h==="Waktu"&&typeof v==="number") return new Date(v); if(v==null) return ""; if(typeof v==="number") return isFinite(v)?v:""; if(typeof v==="boolean") return v; return String(v); }
X.act("rtExpXlsx",async()=>{
  const ids=Object.keys(RT.tblData).filter(id=>RT.tblData[id].rows.length); if(!ids.length){ X.toast("Belum ada tabel — tekan ▶ Mulai dulu","down"); return; }
  try{
    const XL=await loadXlsx(), wb=XL.utils.book_new(), used=new Set();
    ids.forEach(id=>{ const t=RT.tblData[id], cs=t.cols.filter(h=>h.k);
      const aoa=[cs.map(h=>String(h.h).replace(/<[^>]*>/g,""))].concat(t.rows.map(r=>cs.map(h=>xlsxCell(h,r))));
      let nm=expName(id).replace(/[\[\]:*?\/\\]/g," ").replace(/\s+/g," ").trim().slice(0,31)||id, k=2; while(used.has(nm.toLowerCase())) nm=nm.slice(0,28)+" "+(k++); used.add(nm.toLowerCase());
      XL.utils.book_append_sheet(wb,XL.utils.aoa_to_sheet(aoa,{cellDates:true}),nm); });
    XL.writeFile(wb,"running-trade-"+new Date().toISOString().slice(0,16).replace(/[-:T]/g,"")+".xlsx"); X.toast("Excel diunduh: "+ids.length+" sheet","up");
  }catch(e){ X.toast("Ekspor Excel gagal: "+String(e&&e.message||e).slice(0,120)+" — pakai Unduh semua (CSV)","down"); }
});
X.act("rtExpCopy",()=>{ if(!Object.keys(RT.tblData).length){ X.toast("Belum ada tabel — tekan ▶ Mulai dulu","down"); return; } copy(exportCsv(),"Semua tabel disalin (CSV)"); });
X.act("rtDigestNow",()=>{ sendDigest("manual"); });
X.act("rtBt",()=>{ btRun(); dyn(); });
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
document.addEventListener("toggle",e=>{ if(e.target&&e.target.id==="rtGuide") SV("rt_guide_open",!!e.target.open); },true);
document.addEventListener("change",e=>{ const t=e.target; if(!t||!t.getAttribute||t.getAttribute("data-rt-chk")==null) return;
  const box=document.getElementById("rtChk"), n=box?box.querySelectorAll("input:checked").length:0, el=document.getElementById("rtChkN"), tot=GUIDE_CHK.length;
  if(el) el.textContent=n+"/"+tot+" terpenuhi — "+(n>=tot-1?"alasan cukup kuat; tetap tentukan SL dan ukuran posisi dulu.":n>=Math.ceil(tot/2)?"sebagian terpenuhi; periksa yang belum sebelum masuk.":"masih sedikit; lebih baik menunggu.");
});
document.addEventListener("click",e=>{
  const c=e.target&&e.target.closest?e.target.closest.bind(e.target):null; if(!c) return;
  let n=c("[data-rt-posclear]"); if(n){ const cl=POS.filter(q=>q.cl).length; if(cl&&confirm("Hapus "+cl+" posisi yang sudah ditutup dari daftar? Ringkasan hasil ikut direset.")){ for(let i=POS.length-1;i>=0;i--) if(POS[i].cl) POS.splice(i,1); savePos(); dyn(); X.toast("Posisi yang sudah ditutup dihapus","up"); } return; }
  n=c("[data-rt-upre]"); if(n){ const q=userPres().find(z=>z.id===n.getAttribute("data-rt-upre")); if(q){ readCfg(); applyPreset(q.v,q.n); } return; }
  n=c("[data-rt-udel]"); if(n){ const L=userPres(), q=L.find(z=>z.id===n.getAttribute("data-rt-udel")); if(q&&confirm("Hapus preset \""+q.n+"\"?")){ SV("rt_presets_user",L.filter(z=>z.id!==q.id)); X.repaint(); dyn(); X.toast("Preset dihapus","up"); } return; }
  n=c("[data-rt-csv]"); if(n){ const id=n.getAttribute("data-rt-csv"), tx=exportTable(id); if(!tx){ X.toast("Tabel kosong — tidak ada yang diunduh","down"); return; } dlCsv(tx,expName(id).replace(/[^\w]+/g,"-").replace(/^-+|-+$/g,"").toLowerCase()||id); return; }
  n=c("[data-rt-sort]"); if(n){ sortClick(n); return; }
  if(e.target&&e.target.id==="rtScPop"){ scClose(); return; }
  n=c("[data-rt-scx]"); if(n){ scClose(); return; }
  n=c("[data-rt-scd]"); if(n){ scPopup(n.getAttribute("data-rt-scd")); return; }
  n=c("[data-rt-sec]"); if(n){ const v=n.getAttribute("data-rt-sec"); RT.sec=(!v||RT.sec===v)?"":v; dyn(); return; }
  n=c("[data-rt-colall]"); if(n){ RT.hide[n.getAttribute("data-rt-colall")]=[]; SV("rt_cols",RT.hide); colPanel(); dyn(); return; }
  n=c("[data-rt-colcompact]"); if(n){ RT.hide.rtbs=["% Sell","Lot buy","Lot sell","Net lot","% Lot buy","Trx buy","Trx sell"]; SV("rt_cols",RT.hide); colPanel(); dyn(); return; }
  n=c("[data-rt-full]"); if(n){ scClose(); openFull(n.getAttribute("data-rt-full")); return; }
  n=c("[data-rt-tk]"); if(n){ pickTk(n.getAttribute("data-rt-tk")); return; }
  n=c("[data-rt-fol]"); if(n){ followTk(n.getAttribute("data-rt-fol")); return; }
  n=c("[data-rt-unf]"); if(n){ const pr=n.getAttribute("data-rt-unf").split("|"), i=POS.findIndex(q=>q.tk===pr[0]&&String(q.ts)===pr[1]); if(i>=0){ posUnf(POS[i]); POS.splice(i,1); savePos(); dyn(); } return; }
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
  if(mc){ const id=mc[1], h=(RT.colReg[id]||[])[+mc[2]]; if(h!=null){ const a=hidOf(id).filter(x=>x!==h); if(!t.checked) a.push(h); RT.hide[id]=a; SV("rt_cols",RT.hide); dyn(); } return; }
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
    persTick(); alerts(); evalSigs(); digestTick(); tokenTick(); cloudTick(); bdTick().catch(()=>{}); dailyTick().catch(()=>{}); prevTick().catch(()=>{});
    const pg=document.getElementById("exPage");
    let hv=false; try{ hv=!!(CFG.hoverPause&&document.querySelector("#rtDyn .ex-wrap:hover")); }catch(e){}
    if(pg&&pg.classList.contains("on")&&X.current()==="rt"&&!RT.frozen&&!hv) dyn();
  }catch(e){ console.warn("running-trade:",e); }
},1500);
})();
