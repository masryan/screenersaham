// ==========================================
// VARIABEL KONEKSI LOKAL (DINAMIS)
//
// Kredensial default sekarang datang dari config.js (window.APP_CONFIG),
// bukan ditulis langsung di sini. INI SENGAJA: file ini boleh dibaca
// publik (view-source), jadi hanya anon key yang boleh muncul di sini —
// tidak pernah service_role. Isolasi lewat RLS di database, bukan lewat
// menyembunyikan kunci di kode client (itu tidak pernah benar-benar
// tersembunyi).
// ==========================================
const DEFAULT_SUPABASE_URL = (window.APP_CONFIG && window.APP_CONFIG.SUPABASE_URL) || "";
const DEFAULT_SUPABASE_KEY = (window.APP_CONFIG && window.APP_CONFIG.SUPABASE_ANON_KEY) || "";

let SUPABASE_URL = localStorage.getItem("ihsg_supa_url") || DEFAULT_SUPABASE_URL;
let SUPABASE_KEY = localStorage.getItem("ihsg_supa_key") || DEFAULT_SUPABASE_KEY;
let APPSCRIPT_URL = localStorage.getItem("ihsg_script_url") || "";

// ==========================================
// DAFTAR SAHAM SYARIAH (fallback client-side)
//
// Kolom `syariah` di database (stocks_screener) sudah ada tapi belum
// diisi labelnya. Selama kolom itu masih kosong (null/undefined) untuk
// sebuah ticker, aplikasi menandai saham tsb sebagai syariah berdasarkan
// daftar statis ini (bisa diperbarui manual sesuai daftar resmi DES/ISSI
// terbaru). Begitu kolom `syariah` di database sudah diisi oleh backend,
// nilai dari database itu yang dipakai (daftar ini otomatis diabaikan).
// ==========================================
const SYARIAH_TICKERS = new Set([
  "BANK","BBMI","BRIS","BTPS","JMAS","PNBS","SPOT","AADI","ABMM","ADMR","ADRO","AKRA","ARII","ATLA","BBRM","BESS","BOAT","BSML","BSSR","BULL","BUMI","BYAN","CANI","CGAS","COAL","DEWA","DSSA","DWGL","ELSA","ENRG","FIRE","GEMS","HRUM","IATA","INDY","ITMA","ITMG","KKGI","KOPI","MAHA","MBAP","MCOL","MEDC","MKAP","MYOH","PGAS","PKPK","PSAT","PSSI","PTBA","PTIS","RAJA","RATU","RGAS","RMKE","RMKO","RUIS","SEMA","SGER","SICO","SMMT","SOCI","SUNI","TCPI","TEBE","TOBA","TPMA","UNIQ","WINS","WOWS","ADMG","AGII","AKPI","ALDO","ALKA","ANTM","APLI","ARCI","ASPR","AVIA","AYLS","BATR","BLES","BMSR","BRMS","BRNA","CHEM","CITA","CLPI","CTBN","DGWG","DKFT","EKAD","EPAC","ESIP","ESSA","FASW","FPNI","FWCT","GDST","GGRP","IFII","IFSH","IGAR","INCI","INKP","INTD","INTP","IPOL","ISSP","KDSI","KKES","LMSH","LTLS","MBMA","MDKA","MDKI","MINE","NICE","NICL","NIKL","OBMD","OKAS","PACK","PBID","PDPP","PICO","PPRI","PSAB","PTMR","SAMF","SBMA","SMBR","SMCB","SMGA","SMGR","SMKL","SMLE","SOLA","SPMA","SULI","TALF","TBMS","TINS","TIRT","TKIM","TPIA","TRST","UNIC","WTON","YPAS","AMFG","AMIN","APII","ARNA","ASGR","BINO","BLUE","CAKK","CCSI","CRSN","DYAN","FOLK","GPSO","HEXA","HOPE","HYGN","ICON","IKAI","IKBI","IMPC","JECC","JTPE","KBLI","KBLM","KIAS","KING","KOBX","KOIN","KONI","KUAS","LION","MARK","MFMI","MHKI","MLIA","MUTU","NAIK","NTBK","PADA","PTMP","SCCO","SKRN","SMIL","SOSS","SPTO","TIRA","TOTO","UNTR","VISI","VOKS","WIDI","AALI","ADES","AGAR","AISA","AMMS","ASHA","AYAM","BISI","BOBA","BRRC","BUAH","BUDI","BWPT","CAMP","CEKA","CLEO","CMRY","CPIN","CPRO","CSRA","DAYA","DEWI","DMND","DSFI","DSNG","EPMT","EURO","FISH","FLMC","FOOD","FORE","GOOD","GRPM","GULA","GUNA","GZCO","HERO","HOKI","ICBP","IKAN","INDF","JARR","JAWA","JPFA","KEJU","KINO","KMDS","LSIP","MAIN","MAXI","MBTO","MKTR","MLPL","MPPA","MRAT","MSJA","MYOR","NANO","NASI","NAYZ","NEST","NSSS","PCAR","PGUN","PNGO","PSDN","PSGO","PTPS","RANC","ROTI","SDPC","SGRO","SIMP","SIPD","SKBM","SKLT","SMAR","STAA","STTP","TAPG","TCID","TGKA","TGUK","TLDN","UCID","UDNG","ULTJ","UNVR","VICI","WAPO","YUPI","ACES","AEGS","ASLC","AUTO","BABY","BAIK","BAUT","BAYU","BELL","BIKE","BLTZ","BMBL","BMTR","BOGA","BOLT","BRAM","CINT","CNMA","CSAP","CSMI","DEPO","DOOH","DOSS","DRMA","EAST","ECII","ENAK","ERAA","ERAL","ERTX","ESTA","FAST","FILM","GDYR","GEMA","GJTL","GOLF","GRPH","GWSA","HAJJ","HRTA","IDEA","IIKP","INDR","INDS","IPTV","ISAP","JGLE","JIHD","KAQI","KICI","KLIN","KOTA","KPIG","LFLO","LIVE","LMAX","LMPI","LPIN","LPPF","MAPA","MAPB","MAPI","MDIA","MDIY","MEJA","MERI","MGLV","MICE","MKNT","MNCN","MPMX","MSIN","MSKY","OLIV","PANR","PART","PDES","PGLI","PJAA","PLAN","PMJS","PMUI","POLU","PSKT","PTSP","PZZA","RAAM","RALS","SCNP","SHID","SLIS","SMSM","SNLK","SOFA","SOTS","SPRE","SSTM","SWID","TFCO","TMPO","TOOL","TRIS","TYRE","UFOE","VERN","VKTR","WOOD","YELO","ZONE","BMHS","CARE","CHEK","DGNS","DVLA","HALO","HEAL","IKPM","IRRA","KLBF","LABS","MDLA","MEDS","MERK","MIKA","MMIX","MTMH","OBAT","OMED","PEHA","PEVE","PRAY","PRDA","PRIM","RSCH","RSGK","SAME","SCPI","SIDO","SILO","SOHO","SURI","TSPC","SRTG","PALM","DEFI","ADCP","AMAN","APLN","ASPI","ASRI","ATAP","BAPI","BBSS","BCIP","BEST","BIPP","BKDP","BKSL","BSBK","BSDE","CITY","CSIS","CTRA","DADA","DILD","DMAS","DUTI","ELTY","EMDE","FMII","GMTD","GPRA","GRIA","HBAT","HOMI","INPP","IPAC","JRPT","KBAG","KIJA","KOCI","LAND","LPCK","LPLI","MKPI","MMLP","MSIE","MTLA","MTSM","NZIA","PAMG","PLIN","POLI","PURI","RBMS","REAL","RELF","RISE","ROCK","RODA","SAGE","SATU","SMDM","SMRA","UANG","URBN","VAST","WINR","AREA","ATIC","AWAN","AXIO","BELI","CASH","CHIP","CYBR","DCII","DIVA","DMMX","ELIT","GLVA","HDIT","IOTF","IRSX","JATI","KIOS","KREN","LUCK","MCAS","MLPT","MPIX","MSTI","MTDL","NFCX","PGJO","PTSN","RUNS","TFAS","TOSK","TRON","UVCR","WGSH","WIFI","WIRG","ZYRX","ASLI","BALI","BDKR","CASS","CMNP","DATA","DGIK","EXCL","FIMP","GHON","GOLD","HADE","IBST","IDPR","INET","IPCM","ISAT","JAST","JKON","JSMR","KARW","KEEN","KETR","KOKA","MANG","META","MORA","MPOW","MTEL","MTPS","NRCA","PORT","POWR","PPRE","PTPP","PTPW","SMKM","SSIA","SUPR","TAMA","TLKM","TOTL","WEGE","AKSI","ASSA","BIRD","BLOG","BLTA","CMPP","ELPI","GIAA","GTRA","HAIS","HATM","HELI","JAYA","KJEN","KLAS","LAJU","LOPI","LRNA","MIRA","MITI","NELY","PJHB","PPGL","PURA","RCCC","SAFE","SAPX","SMDR","TAXI","TMAS","TNCA","TRJA","TRUK","WBSA","WEHA","GRHA"
]);
function isSyariah(ticker){ return SYARIAH_TICKERS.has(String(ticker||"").toUpperCase()); }

function getSupaHeaders() {
  return {
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json"
  };
}

// ==========================================
// PENGATURAN UI KONEKSI
// ==========================================
function openSettings() {
  let urlDisp = SUPABASE_URL;
  if(urlDisp.endsWith("/rest/v1")) urlDisp = urlDisp.replace("/rest/v1", "");
  document.getElementById("setSupaUrl").value = urlDisp;
  document.getElementById("setSupaKey").value = SUPABASE_KEY;
  document.getElementById("setScriptUrl").value = APPSCRIPT_URL;
  document.getElementById("settingsModalOverlay").classList.add("open");
}

function closeSettings() {
  document.getElementById("settingsModalOverlay").classList.remove("open");
}

function saveSettings() {
  let supaUrlInput = document.getElementById("setSupaUrl").value.trim();
  // Validasi URL dan otomatisasi append path /rest/v1
  if (supaUrlInput) {
    if (supaUrlInput.endsWith("/")) supaUrlInput = supaUrlInput.slice(0, -1);
    if (!supaUrlInput.endsWith("/rest/v1")) supaUrlInput += "/rest/v1";
  }
  
  SUPABASE_URL = supaUrlInput;
  SUPABASE_KEY = document.getElementById("setSupaKey").value.trim();
  APPSCRIPT_URL = document.getElementById("setScriptUrl").value.trim();
  
  localStorage.setItem("ihsg_supa_url", SUPABASE_URL);
  localStorage.setItem("ihsg_supa_key", SUPABASE_KEY);
  localStorage.setItem("ihsg_script_url", APPSCRIPT_URL);
  
  closeSettings();
  
  if(SUPABASE_URL && SUPABASE_KEY) {
    loadLive();
  } else {
    document.getElementById("content").innerHTML = `<div class="empty-box">Koneksi belum diatur. Klik "⚙️ Pengaturan" di pojok kanan atas.</div>`;
  }
}

// ==========================================
// APLIKASI UTAMA
// ==========================================
const LS_WATCHLIST = "ihsg_watchlist", LS_BACKTEST = "ihsg_backtest", LS_PORTO = "ihsg_portofolio", LS_STOCK_CACHE = "ihsg_stock_cache";

let state = {
  demoMode: false, stocks: [], watchlist: new Set(), backtests: [],
  selectedForBacktest: new Set(),
  portfolio: [], portoEditId: null, portoModalOpen: false, selectedPorto: new Set(),
  tab: "screener", search: "", activePreset: null,
  visibleCols: new Set(), // diisi loadSettings() dari localStorage atau DEFAULT_VISIBLE_COLS
  colPickerOpen: false,
  filters: {sektor:[], syariahLabel:[], cekHarga:[], cekRsi:[], statusRsi:[], cekMacd:[], band:[], sinyalVolume:[], keyakinanNaik:[], trendHarga:[], polaCandle:[], uangGedeMasuk:[], isBBSqueeze:[], valuasi:[]},
  showAdvancedFilters: false,
  rangeFilters: { 
    bbWidth:{min:"",max:""}, 
    atr14:{min:"",max:""}, 
    clv:{min:"",max:""},
    rsi7:{min:"58",max:"72"},  
    rsi21:{min:"58",max:"72"}  
  },
  openDropdown: null, 
  sort: { col: null, asc: true },
  page: 1, limit: 10,
  expanded: new Set(),
  selectedTicker: null, chartData: [], selectedLevels: null, loading:false, chartSearch: "",
  detailTicker: null, detailTab: "teknikal"
};

function fmtNum(n){ if(n===null||n===undefined) return "-"; return new Intl.NumberFormat("id-ID").format(n); }
function numOrNull(n){ if(n===null||n===undefined||n==="") return null; const v=parseFloat(n); return isNaN(v) ? null : v; }
function boolLabel(v){
  if(v===true || v==="true" || v==="Ya" || v===1 || v==="1") return "Ya";
  if(v===false || v==="false" || v==="Tidak" || v===0 || v==="0") return "Tidak";
  return v ?? "-";
}
function pillHtml(text, tone){ return `<span class="pill pill-${tone}">${text}</span>`; }
function trendTone(t){
  t = String(t||"");
  if(t.indexOf("Bullish")===0) return "up";
  if(t.indexOf("Bearish")===0) return "down";
  if(t.indexOf("Sideways")===0) return "gold";
  return "muted";
}
function polaTone(p){
  p = String(p||"");
  if(p==="-"||!p) return "muted";
  if(p.indexOf("Bullish")>=0 || p.indexOf("Hammer")===0 || p.indexOf("Inverted Hammer")>=0) return "up";
  if(p.indexOf("Bearish")>=0 || p.indexOf("Shooting Star")>=0 || p.indexOf("Hanging Man")>=0) return "down";
  if(p.indexOf("Doji")>=0) return "gold";
  return "muted";
}
function valuasiTone(v){
  v = String(v||"");
  if(/murah|undervalued/i.test(v)) return "up";
  if(/mahal|overvalued/i.test(v)) return "down";
  if(/wajar|fair/i.test(v)) return "gold";
  return "muted";
}
function rsiGaugeHtml(value){
  if(value===null||value===undefined||isNaN(value)) return `<span class="mono" style="color:var(--muted);font-size:11px;">-</span>`;
  const pct=Math.max(0,Math.min(100,value));
  const angle=(pct/100)*180-90;
  const color = pct<=30 ? "var(--down)" : pct>=70 ? "var(--up)" : "var(--gold)";
  const cx=15+11*Math.sin(angle*Math.PI/180), cy=16-11*Math.cos(angle*Math.PI/180);
  return `<div class="gauge-wrap">
    <svg width="30" height="18" viewBox="0 0 30 18">
      <path d="M2,16 A13,13 0 0 1 28,16" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3" stroke-linecap="round"/>
      <path d="M2,16 A13,13 0 0 1 28,16" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(pct/100)*40.8} 40.8"/>
      <circle cx="${cx}" cy="${cy}" r="1.6" fill="${color}" style="filter: drop-shadow(0 0 2px ${color});"/>
    </svg>
    <span class="mono" style="color:${color};font-size:11.5px;font-weight:700;">${value.toFixed(1)}</span>
  </div>`;
}

function loadSettings(){
  try{ const wl=JSON.parse(localStorage.getItem(LS_WATCHLIST)||"[]"); state.watchlist=new Set(wl); }catch(e){}
  try{ state.backtests=JSON.parse(localStorage.getItem(LS_BACKTEST)||"[]"); }catch(e){}
  try{ state.portfolio=JSON.parse(localStorage.getItem(LS_PORTO)||"[]"); }catch(e){}
  try{
    const saved = JSON.parse(localStorage.getItem(LS_VISIBLE_COLS)||"null");
    state.visibleCols = new Set(Array.isArray(saved) ? saved : DEFAULT_VISIBLE_COLS);
  }catch(e){ state.visibleCols = new Set(DEFAULT_VISIBLE_COLS); }
}
function saveVisibleCols(){ localStorage.setItem(LS_VISIBLE_COLS, JSON.stringify([...state.visibleCols])); }
function toggleColumn(key){
  if(state.visibleCols.has(key)) state.visibleCols.delete(key); else state.visibleCols.add(key);
  saveVisibleCols(); render();
}
function setColumnPreset(preset){
  if(preset === "ringkas") state.visibleCols = new Set(DEFAULT_VISIBLE_COLS);
  else if(preset === "semua") state.visibleCols = new Set(SCREENER_COLUMNS.map(c=>c.key));
  else if(preset === "kosong") state.visibleCols = new Set();
  saveVisibleCols(); render();
}
function saveWatchlist(){ localStorage.setItem(LS_WATCHLIST, JSON.stringify([...state.watchlist])); }
function saveBacktests(){ localStorage.setItem(LS_BACKTEST, JSON.stringify(state.backtests)); }
function savePortoLocal(){ localStorage.setItem(LS_PORTO, JSON.stringify(state.portfolio)); }

function bandarmologi(row, ratio){
  const naik = row.cClose>row.cOpen;
  if(ratio>=1.5 && naik) return {label:"Indikasi Akumulasi", tone:"up"};
  if(ratio>=1.5 && !naik) return {label:"Indikasi Distribusi", tone:"down"};
  if(ratio>=1.0 && naik) return {label:"Minat Beli Naik", tone:"up"};
  if(ratio>=1.0 && !naik) return {label:"Tekanan Jual", tone:"down"};
  return {label:"Netral", tone:"muted"};
}
function volumeSignal(row, ratio){
  let label, tone;
  if(ratio>=2)      { label="Sangat Tinggi"; tone="up"; }
  else if(ratio>=1.5){ label="Tinggi"; tone="up"; }
  else if(ratio>=0.8){ label="Normal"; tone="muted"; }
  else               { label="Rendah"; tone="down"; }
  return { ratio, label, tone };
}
function keyakinanNaik(row, vol){
  let score=0;
  if(row.cekHarga && row.cekHarga.includes("crossup")) score+=25;
  else if(row.cekHarga && row.cekHarga.includes("diatas ema 21 L")) score+=10;
  if(row.cekRsi && row.cekRsi.includes("cross up")) score+=20;
  if(row.statusRsi==="bullish") score+=15;
  else if(row.statusRsi==="netral") score+=5;
  if(row.cekMacd && (row.cekMacd.includes("Buy")||row.cekMacd.includes("Bullish"))) score+=25;
  if((vol.label==="Tinggi"||vol.label==="Sangat Tinggi") && row.cClose>row.cOpen) score+=15;
  score = Math.min(100, score);
  let label, tone;
  if(score>=70)      { label="Tinggi"; tone="up"; }
  else if(score>=40) { label="Sedang"; tone="gold"; }
  else                { label="Rendah"; tone="down"; }
  return { score, label, tone };
}
function keyakinanToneFromLabel(label){
  const l = String(label||"");
  if(/^Sangat Tinggi|^Tinggi/.test(l)) return "up";
  if(/^Sedang/.test(l)) return "gold";
  if(/^Waspada|^Sangat Waspada/.test(l)) return "down";
  if(/^Rendah/.test(l)) return "down";
  return "muted";
}

async function loadLive(){
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    openSettings();
    return;
  }

  state.loading = true; showError(""); render();
  try {
    const [stocksRes, portoRes, backtestRes, wlRes] = await Promise.all([
      // Ambil dari VIEW gabungan, bukan tabel stocks mentah: stocks_screener
      // sudah menggabungkan fundamental+teknikal (tabel stocks) dengan
      // bandarmologi asli dari IDX (view flow_summary), lewat left join.
      fetch(`${SUPABASE_URL}/stocks_screener?select=*`, { headers: getSupaHeaders() }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/portfolios?select=*`, { headers: getSupaHeaders() }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/backtest_sessions?select=*,backtest_items(*)`, { headers: getSupaHeaders() }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/watchlists?select=ticker`, { headers: getSupaHeaders() }).then(r => r.json())
    ]);

    if (stocksRes.message) throw new Error(stocksRes.message);

    state.stocks = stocksRes.map(r => ({
      ticker: r.ticker, sektor: r.sector,
      // Kolom `syariah` di DB dipakai kalau sudah diisi; kalau masih
      // kosong (belum dilabeli backend), fallback ke daftar statis
      // SYARIAH_TICKERS di atas supaya filter tetap bisa dipakai.
      syariah: (r.syariah === null || r.syariah === undefined || r.syariah === "") ? isSyariah(r.ticker) : r.syariah,
      // Catatan mapping: skema gabungan tidak lagi punya c_high/c_low/c_vol
      // terpisah — dipetakan ke kolom fundamental yang sudah ada supaya
      // tidak ada dua kolom untuk hal yang sama (day_high dulu diisi Yahoo
      // quote, sekarang jadi satu-satunya sumber High hari ini).
      cOpen: r.c_open, cHigh: r.day_high, cLow: r.day_low, cClose: r.price, cVol: r.volume,
      changePct: r.change_pct, turnover: r.turnover ?? r.value_traded, vwap20: r.vwap20,
      volRatio: numOrNull(r.vol_ratio), volMA20: numOrNull(r.vol_ma20 ?? r.avg_volume_3m),
      per: r.per, pbv: r.pbv, roe: r.roe, divYield: r.dividend_yield,
      support: r.support, resistance: r.resistance, high52w: r.week52_high, low52w: r.week52_low,
      ema21H: r.ema21h, ema21L: r.ema21l, ma21: r.ma21, ma50: r.ma50, ma100: r.ma100, ma200: r.ma200,
      rsi7: r.rsi7, rsi21: r.rsi21, hist: r.macd_hist, histPrev: 0,
      fib: r.fibonacci, 
      cekHarga: r.cek_harga, cekRsi: r.cek_rsi, statusRsi: r.status_rsi, cekMacd: r.cek_macd,
      keyakinanNaik: r.keyakinan_naik,
      trendHarga: r.trend_harga, candleKemarin: r.candle_kemarin, candleHariIni: r.candle_hari_ini, polaCandle: r.pola_candle,
      uangGedeMasuk: boolLabel(r.uang_gede_masuk), bbWidth: numOrNull(r.bb_width),
      isBBSqueeze: boolLabel(r.is_bb_squeeze), atr14: numOrNull(r.atr14), valuasi: r.valuasi ?? "-", clv: numOrNull(r.clv),
      ema89: numOrNull(r.ema89), prevHigh: numOrNull(r.prev_high), prevLow: numOrNull(r.prev_low), prevVol: numOrNull(r.prev_vol),
      stochK: numOrNull(r.stoch_k), stochD: numOrNull(r.stoch_d), prevStochK: numOrNull(r.prev_stoch_k), prevStochD: numOrNull(r.prev_stoch_d),

      // --- Bandarmologi ASLI dari IDX (bukan proxy volume) ---
      // Null berarti "belum ditransaksikan" (suspensi dsb), bukan nol —
      // lihat catatan flow_summary di database. Jangan format null jadi 0.
      capCategory: r.cap_category, pos52w: numOrNull(r.pos_52w),
      vsMa50Pct: numOrNull(r.vs_ma50_pct), vsMa200Pct: numOrNull(r.vs_ma200_pct),
      foreignNet1D: numOrNull(r.foreign_net_1d), foreignNet5D: numOrNull(r.foreign_net_5d),
      foreignNet20D: numOrNull(r.foreign_net_20d), foreignUpDays: numOrNull(r.foreign_up_days),
      avgTicket: numOrNull(r.avg_ticket), crossingPct: numOrNull(r.crossing_pct),
      flowSeries: Array.isArray(r.flow_series) ? r.flow_series : null,
      flowDate: r.flow_date, flowDays: numOrNull(r.flow_days),
    }));

    if (Array.isArray(portoRes)) {
       state.portfolio = portoRes.map(p => ({
         id: p.id, ticker: p.ticker, status: p.status,
         tglBeli: p.tgl_beli, hargaBeli: p.harga_beli, lotBeli: p.lot_beli, feeBeliPct: p.fee_beli_pct, totalBeli: p.total_beli,
         support: p.support, resistance: p.resistance, fib618: p.fib618, targetTP: p.target_tp, cutLoss: p.cut_loss,
         tglJual: p.tgl_jual, hargaJual: p.harga_jual, lotJual: p.lot_jual, feeJualPct: p.fee_jual_pct, netJual: p.net_jual,
         jangkaWaktu: p.jangka_waktu, persenPL: p.persen_pl, nilaiPL: p.nilai_pl, catatan: p.catatan,
         entries: p.entries 
       }));
       savePortoLocal();
    }

    if (Array.isArray(backtestRes)) {
       state.backtests = backtestRes.map(b => ({
         id: b.id, date: b.session_date,
         items: b.backtest_items.map(it => ({
            ticker: it.ticker, entryPrice: it.entry_price, filterStr: it.notes, sumber: it.source
         }))
       })).sort((a,b) => String(b.id).localeCompare(String(a.id)));
       saveBacktests();
    }

    if (Array.isArray(wlRes)) {
        state.watchlist = new Set(wlRes.map(w => w.ticker));
        saveWatchlist();
    }

  } catch (e) {
    showError("Gagal terhubung ke Database Supabase: " + e.message);
  }
  state.loading = false; render();
}

function showError(msg){
  const el=document.getElementById("errorMsg");
  el.style.display = msg ? "block" : "none";
  el.textContent = msg;
}

async function toggleFav(ticker){
  const isFav = state.watchlist.has(ticker);
  isFav ? state.watchlist.delete(ticker) : state.watchlist.add(ticker);
  saveWatchlist();
  render();

  try{ 
    if(!isFav) {
      await fetch(`${SUPABASE_URL}/watchlists`, { method: "POST", headers: { ...getSupaHeaders(), "Prefer": "resolution=merge-duplicates" }, body: JSON.stringify({ticker}) });
    } else {
      await fetch(`${SUPABASE_URL}/watchlists?ticker=eq.${ticker}`, { method: "DELETE", headers: getSupaHeaders() });
    }
  } catch(e){}
}

function openDetail(ticker){
  state.detailTicker = ticker;
  state.detailTab = "teknikal";
  render();
}
function closeDetail(){
  state.detailTicker = null;
  render();
}
function setDetailTab(tab){
  state.detailTab = tab;
  render();
}

function dItem(label, valueHtml, isText){
  return `<div class="detail-item"><div class="lbl">${label}</div><div class="val ${isText?'text':''}">${valueHtml==null||valueHtml===""?'-':valueHtml}</div></div>`;
}
function dNum(n, opts){
  opts = opts || {};
  if(n===null||n===undefined||n==="") return "-";
  const num = Number(n);
  if(isNaN(num)) return String(n);
  return (opts.plusSign && num>=0 ? "+" : "") + fmtNum(opts.decimals!=null ? +num.toFixed(opts.decimals) : num) + (opts.suffix||"");
}

function renderDetailTeknikal(s){
  return `
    <div class="detail-subtitle">Harga & Volume Hari Ini</div>
    <div class="detail-grid">
      ${dItem("Open", dNum(s.cOpen))}
      ${dItem("High", dNum(s.cHigh))}
      ${dItem("Low", dNum(s.cLow))}
      ${dItem("Close", dNum(s.cClose))}
      ${dItem("Perubahan%", `<span style="color:${(s.changePct??0)>=0?'var(--up)':'var(--down)'}">${s.changePct!=null?dNum(s.changePct,{plusSign:true,decimals:2,suffix:'%'}):'-'}</span>`, true)}
      ${dItem("Volume", dNum(s.cVol))}
      ${dItem("Turnover (Rp)", dNum(s.turnover))}
      ${dItem("VWAP 20D", dNum(s.vwap20))}
    </div>

    <div class="detail-subtitle">Level Support / Resisten & Fibonacci</div>
    <div class="detail-grid">
      ${dItem("Support", `<span style="color:var(--down)">${dNum(s.support)}</span>`, true)}
      ${dItem("Resisten", `<span style="color:var(--up)">${dNum(s.resistance)}</span>`, true)}
      ${dItem("52W Tinggi", dNum(s.high52w))}
      ${dItem("52W Rendah", dNum(s.low52w))}
      ${dItem("Fib 23.6%", dNum(s.fib?.f236))}
      ${dItem("Fib 38.2%", dNum(s.fib?.f382))}
      ${dItem("Fib 50%", dNum(s.fib?.f50))}
      ${dItem("Fib 61.8%", dNum(s.fib?.f618))}
    </div>

    <div class="detail-subtitle">Moving Average & Trend</div>
    <div class="detail-grid">
      ${dItem("MA21", dNum(s.ma21))}
      ${dItem("MA50", dNum(s.ma50))}
      ${dItem("MA100", dNum(s.ma100))}
      ${dItem("MA200", dNum(s.ma200))}
      ${dItem("EMA21 High", dNum(s.ema21H))}
      ${dItem("EMA21 Low", dNum(s.ema21L))}
      ${dItem("EMA 89", dNum(s.ema89))}
      ${dItem("Trend Harga (MA)", pillHtml(s.trendHarga||"-", trendTone(s.trendHarga)), true)}
    </div>

    <div class="detail-subtitle">Momentum & Volatilitas</div>
    <div class="detail-grid">
      ${dItem("RSI 7", rsiGaugeHtml(s.rsi7), true)}
      ${dItem("RSI 21", s.rsi21!=null?Number(s.rsi21).toFixed(1):"-")}
      ${dItem("MACD Hist", s.hist!=null?Number(s.hist).toFixed(3):"-")}
      ${dItem("Stoch K", s.stochK??"-")}
      ${dItem("Stoch D", s.stochD??"-")}
      ${dItem("ATR 14", s.atr14??"-")}
      ${dItem("BB Width", s.bbWidth??"-")}
      ${dItem("CLV", s.clv??"-")}
    </div>

    <div class="detail-subtitle">Candlestick</div>
    <div class="detail-grid">
      ${dItem("Candle Kemarin", s.candleKemarin||"-", true)}
      ${dItem("Candle Hari Ini", s.candleHariIni||"-", true)}
      ${dItem("Pola Candle", pillHtml(s.polaCandle||"-", polaTone(s.polaCandle)), true)}
      ${dItem("BB Squeeze (6B)", pillHtml(s.isBBSqueeze||"-", s.isBBSqueeze==="Ya"?"gold":"muted"), true)}
    </div>
  `;
}

function renderDetailFundamental(s){
  return `
    <div class="detail-subtitle">Klasifikasi</div>
    <div class="detail-grid">
      ${dItem("Sektor", s.sektor||"-", true)}
      ${dItem("Syariah", s.syariahLabel==="Ya"?"✅ Ya":(s.syariahLabel||"-"), true)}
      ${dItem("Valuasi", pillHtml(s.valuasi||"-", valuasiTone(s.valuasi)), true)}
    </div>

    <div class="detail-subtitle">Rasio Valuasi & Profitabilitas</div>
    <div class="detail-grid">
      ${dItem("PER", s.per??"-")}
      ${dItem("PBV", s.pbv??"-")}
      ${dItem("ROE%", s.roe!=null?dNum(s.roe,{decimals:2,suffix:'%'}):"-")}
      ${dItem("Dividend Yield%", s.divYield!=null?dNum(s.divYield,{decimals:2,suffix:'%'}):"-")}
    </div>

    <div class="detail-narrative">
      ${s.per!=null && s.pbv!=null
        ? `Berdasarkan PER ${s.per} dan PBV ${s.pbv}, valuasi saham ini saat ini tergolong <b>${(s.valuasi||"-").toLowerCase()}</b>.
           ${s.divYield ? `Emiten ini memberikan dividend yield sekitar ${dNum(s.divYield,{decimals:2})}% pada harga saat ini.` : "Belum ada data dividend yield untuk emiten ini."}`
        : "Data fundamental (PER/PBV) untuk emiten ini belum lengkap di database, sehingga valuasi belum bisa dihitung secara akurat."}
    </div>
  `;
}

function renderDetailAnalisa(s){
  const bandLabel = s.band ? s.band.label : "-";
  const bandTone = s.band ? s.band.tone : "muted";
  
  // 1. Kalkulasi Trading Plan
  const entry = s.cClose;
  const tp = s.resistance || (entry * 1.05); 
  const sl = s.support && entry - s.support < (s.atr14 || entry * 0.05) ? s.support : entry - (s.atr14 || entry * 0.03); 
  const risk = entry - sl;
  const reward = tp - entry;
  const rrr = risk > 0 ? (reward / risk).toFixed(2) : 0;
  
  let tradeTone = "muted"; let tradeStatus = "Netral";
  if (rrr >= 1.5 && s.keyakinanTone === "up" && s.volTone === "up") { tradeTone = "up"; tradeStatus = "🔥 Highly Recommended"; } 
  else if (rrr >= 1) { tradeTone = "gold"; tradeStatus = "⭐ Layak Pantau"; } 
  else { tradeTone = "down"; tradeStatus = "⚠️ High Risk"; }

  // 2. Sintesis AI (Teknikal, Fundamental, Bandarmologi)
  let aiScore = 0;
  let techDesc = ""; let fundDesc = ""; let bandDesc = "";

  // Evaluasi Teknikal
  if (s.keyakinanTone === "up" || s.trendHarga.includes("Bullish")) { aiScore += 2; techDesc = "Tren dan momentum positif. MACD/RSI mendukung pergerakan naik."; }
  else if (s.keyakinanTone === "gold" || s.trendHarga.includes("Sideways")) { aiScore += 1; techDesc = "Pergerakan konsolidasi. Menunggu konfirmasi breakout atau pantulan support."; }
  else { aiScore -= 1; techDesc = "Tekanan jual teknikal masih kuat atau sedang downtrend."; }

  // Evaluasi Fundamental
  if (s.valuasi && s.valuasi.includes("Murah")) { aiScore += 2; fundDesc = "Valuasi menarik (Undervalued) dengan margin of safety yang baik."; }
  else if (s.valuasi && s.valuasi.includes("Wajar")) { aiScore += 1; fundDesc = "Valuasi tergolong wajar (Fair Value) berdasarkan kinerja saat ini."; }
  else if (s.valuasi && s.valuasi.includes("Kemahalan")) { aiScore -= 1; fundDesc = "Valuasi relatif mahal (Overvalued) dibandingkan historis atau sektornya."; }
  else { fundDesc = "Data rasio fundamental tidak memadai untuk evaluasi valuasi."; }

  // Evaluasi Bandarmologi (Volume & Squeeze)
  if (s.band && s.band.tone === "up" && (s.volRatio || 0) >= 1.5) { aiScore += 2; bandDesc = `Adanya akumulasi kuat (Uang Gede) dengan lonjakan volume ${(s.volRatio || 0).toFixed(1)}x.`; }
  else if (s.band && s.band.tone === "up") { aiScore += 1; bandDesc = "Minat beli terpantau stabil dengan volume normal."; }
  else if (s.band && s.band.tone === "down") { aiScore -= 1; bandDesc = "Terdeteksi adanya distribusi atau aksi buang barang dari institusi."; }
  else { bandDesc = "Aktivitas transaksi normal, tidak ada anomali bandarmologi yang mencolok."; }

  // Keputusan Akhir AI
  let aiVerdict = ""; let aiTone = "muted";
  if (aiScore >= 5) { aiVerdict = "🟢 STRONG BUY (Sangat Menarik)"; aiTone = "up"; }
  else if (aiScore >= 3) { aiVerdict = "🟢 BUY (Menarik)"; aiTone = "up"; }
  else if (aiScore >= 1) { aiVerdict = "🟡 HOLD / WAIT & SEE"; aiTone = "gold"; }
  else { aiVerdict = "🔴 AVOID / SELL (Hindari)"; aiTone = "down"; }

  // Link Pencarian Berita Otomatis
  const newsUrl = `https://www.google.com/search?q=saham+${s.ticker}+berita+terbaru&tbm=nws`;

  return `
    <!-- PANEL AI BARU -->
    <div style="background: linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95)); border: 1px solid var(--${aiTone}); border-radius: 12px; padding: 16px; margin-bottom: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
      <div style="display:flex; align-items:center; gap: 8px; margin-bottom: 12px; border-bottom: 1px dashed var(--border); padding-bottom: 12px;">
        <span style="font-size: 20px;">🤖</span>
        <div>
          <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Kesimpulan Asisten AI</div>
          <div style="font-size: 16px; font-weight: 700; color: var(--${aiTone});">${aiVerdict}</div>
        </div>
      </div>
      <div style="display:grid; gap: 8px; font-size: 12.5px; color: var(--text);">
        <div><b style="color:var(--teal);">📈 Teknikal:</b> ${techDesc}</div>
        <div><b style="color:var(--gold);">🏦 Fundamental:</b> ${fundDesc}</div>
        <div><b style="color:#a78bfa;">🐋 Bandarmologi:</b> ${bandDesc}</div>
      </div>
      <div style="margin-top: 16px; display: flex; gap: 8px;">
        <a class="btn btn-outline" href="${newsUrl}" target="_blank" rel="noopener" style="flex:1; justify-content:center; color:#38bdf8; border-color:rgba(56,189,248,0.3);">
          📰 Cek Sentimen Berita/News Terkini
        </a>
      </div>
    </div>

    <!-- TRADING PLAN (Dipertahankan) -->
    <div class="detail-subtitle">Trading Plan Otomatis (Risk/Reward)</div>
    <div class="detail-grid" style="border-left: 3px solid var(--${tradeTone}); padding-left: 10px; margin-bottom: 16px;">
      ${dItem("Asumsi Entry (Harga Live)", dNum(entry), true)}
      ${dItem("Target Price (Resisten)", '<span style="color:var(--up)">' + dNum(tp) + '</span>', true)}
      ${dItem("Stop Loss (Support/ATR)", '<span style="color:var(--down)">' + dNum(sl) + '</span>', true)}
      ${dItem("Risk/Reward Ratio (RRR)", '<span style="color:var(--' + (rrr >= 1.5 ? 'up' : 'down') + ')">' + rrr + 'x</span>', true)}
      ${dItem("Kualitas Setup", pillHtml(tradeStatus, tradeTone), true)}
    </div>

    <div class="detail-subtitle">Detail Parameter</div>
    <div class="detail-grid">
      ${dItem("Sinyal MACD", pillHtml(s.cekMacd||"-", ((s.cekMacd||"").includes("Buy")||(s.cekMacd||"").includes("Bullish"))?"up":(s.cekMacd||"").includes("Sell")?"down":"muted"), true)}
      ${dItem("Sinyal Volume", pillHtml(s.sinyalVolume||"-", s.volTone), true)}
      ${dItem("Bandarmologi", pillHtml(bandLabel, bandTone), true)}
      ${dItem("Keyakinan Naik", pillHtml(s.keyakinanNaik||"-", s.keyakinanTone), true)}
    </div>
  `;
}

function fmtRp(n){
  if(n===null||n===undefined) return "-";
  const num = Number(n);
  if(isNaN(num)) return "-";
  const abs = Math.abs(num);
  const sign = num<0 ? "-" : "+";
  if(abs>=1e12) return sign+(abs/1e12).toFixed(2)+" T";
  if(abs>=1e9)  return sign+(abs/1e9).toFixed(2)+" M";
  if(abs>=1e6)  return sign+(abs/1e6).toFixed(1)+" jt";
  return sign+fmtNum(abs);
}

function flowBarsHtml(series){
  if(!Array.isArray(series) || !series.length){
    return `<div class="empty-box" style="padding:20px;font-size:12px;">Belum ada riwayat 20 hari untuk emiten ini.</div>`;
  }
  const max = Math.max(1, ...series.map(v=>Math.abs(Number(v)||0)));
  const bars = series.map(v=>{
    const val = Number(v)||0;
    const h = Math.max(4, Math.round(Math.abs(val)/max*48));
    const color = val>=0 ? "var(--up)" : "var(--down)";
    return `<div title="${fmtRp(val)}" style="width:6px;height:${h}px;background:${color};border-radius:2px;align-self:${val>=0?'flex-end':'flex-start'};"></div>`;
  }).join("");
  return `<div style="display:flex;align-items:center;gap:3px;height:56px;padding:4px 0;">${bars}</div>`;
}

function renderDetailBandarmologi(s){
  const belumAdaData = s.foreignNet20D==null && s.foreignNet5D==null && s.foreignNet1D==null;
  if(belumAdaData){
    return `<div class="empty-box" style="padding:24px;">
      Emiten ini belum punya data aliran dana IDX (kemungkinan suspensi atau nyaris tidak diperdagangkan
      dalam 20 hari terakhir). Kosong di sini artinya "tidak ada transaksi untuk dinilai", bukan nol.
    </div>`;
  }
  return `
    <div class="detail-subtitle">Net Beli Asing (Rupiah)</div>
    <div class="detail-grid">
      ${dItem("1 Hari", `<span style="color:${(s.foreignNet1D??0)>=0?'var(--up)':'var(--down)'}">${fmtRp(s.foreignNet1D)}</span>`, true)}
      ${dItem("5 Hari", `<span style="color:${(s.foreignNet5D??0)>=0?'var(--up)':'var(--down)'}">${fmtRp(s.foreignNet5D)}</span>`, true)}
      ${dItem("20 Hari", `<span style="color:${(s.foreignNet20D??0)>=0?'var(--up)':'var(--down)'}">${fmtRp(s.foreignNet20D)}</span>`, true)}
      ${dItem("Hari Asing Positif", s.foreignUpDays!=null ? `${s.foreignUpDays} / ${s.flowDays??20} hari` : "-", true)}
    </div>

    <div class="detail-subtitle">Grafik Aliran Dana 20 Hari (hijau = net beli, merah = net jual)</div>
    ${flowBarsHtml(s.flowSeries)}

    <div class="detail-subtitle">Karakter Transaksi</div>
    <div class="detail-grid">
      ${dItem("Rata-rata Tiket", s.avgTicket!=null ? fmtRp(s.avgTicket)+"/transaksi" : "-", true)}
      ${dItem("Transaksi Negosiasi", s.crossingPct!=null ? dNum(s.crossingPct,{decimals:1,suffix:'%'}) : "-", true)}
      ${dItem("Update Terakhir", s.flowDate || "-", true)}
    </div>

    <div class="detail-narrative">
      <b>Data asing bukan data bandar.</b> Ini proksi, dan proksi yang kasar — institusi lokal besar
      (dana pensiun, asuransi, manajer investasi dalam negeri) tidak muncul sebagai "asing" sama sekali,
      sementara sebagian dana lokal yang dititipkan lewat kustodian asing justru tercatat sebagai asing.
      Data ini juga harian (bukan real-time) — angka di atas adalah data ${s.flowDate || "hari perdagangan terakhir"},
      berguna untuk pola berminggu-minggu, bukan keputusan intraday. Sumber: IDX resmi, terpisah dari
      indikator "BPJS" di tab Analisa yang murni proxy dari lonjakan volume — dua hal ini tidak sama.
    </div>
  `;
}

function renderDetailModalContent(){
  const s = enriched().find(x => x.ticker === state.detailTicker);
  if(!s){
    return `<div class="empty-box">Data untuk ${state.detailTicker} tidak ditemukan di database.</div>`;
  }
  const tabs = [
    { key:"teknikal", label:"📊 Teknikal" },
    { key:"fundamental", label:"💰 Fundamental" },
    { key:"bandarmologi", label:"🐋 Bandarmologi (IDX)" },
    { key:"analisa", label:"🧠 Analisa" }
  ];
  const tabBtns = tabs.map(t => `<button type="button" class="detail-tab-btn ${state.detailTab===t.key?'active':''}" data-detail-tab="${t.key}">${t.label}</button>`).join("");
  let body = "";
  if(state.detailTab === "teknikal") body = renderDetailTeknikal(s);
  else if(state.detailTab === "fundamental") body = renderDetailFundamental(s);
  else if(state.detailTab === "bandarmologi") body = renderDetailBandarmologi(s);
  else body = renderDetailAnalisa(s);

  return `
    <div class="detail-head">
      <div>
        <div class="detail-head-price">${dNum(s.cClose)} <span style="font-size:15px;font-weight:600;color:${(s.changePct??0)>=0?'var(--up)':'var(--down)'}">${s.changePct!=null?dNum(s.changePct,{plusSign:true,decimals:2,suffix:'%'}):''}</span></div>
        <div class="detail-head-sub">${s.sektor||"Sektor tidak diketahui"} ${s.syariahLabel==="Ya" ? "· Syariah" : ""}</div>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-outline" data-chart="${s.ticker}">Lihat Grafik</button>
        <a class="btn btn-outline btn-tradingview" href="${tvChartPageUrl(s.ticker)}" target="_blank" rel="noopener">TV</a>
        <a class="btn btn-outline btn-stockbit" href="${stockbitUrl(s.ticker)}" target="_blank" rel="noopener">SB</a>
      </div>
    </div>
    <div class="detail-tabs">${tabBtns}</div>
    ${body}
  `;
}

function hashStringToSeed(str){
  let h = 0;
  for(let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0; }
  return Math.abs(h) || 1;
}
function seededRandom(seed){
  let s = seed % 2147483647;
  if(s<=0) s += 2147483646;
  return function(){ s = (s*16807) % 2147483647; return (s-1)/2147483646; };
}
function genDemoSeries(ticker, lastClose, length){
  length = length || 60;
  const base = (lastClose && lastClose>0) ? lastClose : 1000;
  const rand = seededRandom(hashStringToSeed(String(ticker||"TICKER")));
  const volatility = Math.max(base*0.015, 5);
  let price = base;
  const series = [price];
  for(let i=1;i<length;i++){
    const change = (rand()-0.5) * volatility * 2;
    price = Math.max(price - change, base*0.5);
    series.push(price);
  }
  series.reverse();
  series[series.length-1] = base;
  return series;
}

function loadChart(ticker){
  state.selectedTicker=ticker; state.tab="chart";
  try{
    const stock = enriched().find(s=>s.ticker===ticker);
    state.selectedLevels = stock ? {
      support:stock.support, resistance:stock.resistance,
      ema21H:stock.ema21H, ema21L:stock.ema21L, fib:stock.fib
    } : null;
    const series = genDemoSeries(ticker, stock ? stock.cClose : 1000);
    state.chartData = series.map((c,i)=>({date:`H${i-series.length}`, close:Math.round(c)}));
  } catch(e){
    state.selectedLevels = null;
    state.chartData = [];
  }
  render();
}

async function syncBacktestToSupabase(sessionId, sessionDate, items) {
  try {
    await fetch(`${SUPABASE_URL}/backtest_sessions`, {
      method: "POST",
      headers: { ...getSupaHeaders(), "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ id: sessionId, session_date: sessionDate })
    });
    
    const payloadItems = items.map(it => ({
      id: String(Date.now()) + Math.floor(Math.random()*1000),
      session_id: sessionId, ticker: it.ticker,
      entry_price: it.entryPrice || it.hargaEntry || 0,
      source: it.sumber || "Screener", notes: it.filterStr || it.keterangan || ""
    }));
    
    await fetch(`${SUPABASE_URL}/backtest_items`, {
      method: "POST",
      headers: { ...getSupaHeaders(), "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify(payloadItems)
    });
  } catch(e) { }
}

async function saveToBacktest(){
  const filtered = getFiltered();
  const toSave = filtered.filter(s => state.selectedForBacktest.has(s.ticker));

  if(toSave.length === 0) return alert("Screener kosong atau tidak ada emiten yang dicentang.");

  const sessionId = String(Date.now());
  const tglSesi = new Date().toLocaleString('id-ID');
  const items = toSave.map(s => ({
    ticker: s.ticker,
    entryPrice: s.cClose,
    sumber: "Screener",
    keterangan: `Harga: ${s.cekHarga}; RSI: ${s.cekRsi}; Status RSI: ${s.statusRsi}; MACD: ${s.cekMacd}; Rasio Vol: ${(s.volRatio??0).toFixed(2)}x (${s.sinyalVolume}); Keyakinan Naik: ${s.keyakinanNaik}`
  }));

  state.backtests.unshift({
    id: sessionId, date: tglSesi,
    items: items.map(it=>({ ticker: it.ticker, entryPrice: it.entryPrice, filterStr: it.keterangan, sumber: it.sumber }))
  });
  saveBacktests();
  state.selectedForBacktest.clear(); 
  render();

  await syncBacktestToSupabase(sessionId, tglSesi, items);
  alert(`${toSave.length} emiten yang dipilih berhasil disimpan ke tab Backtest.`);
}

async function addManualBacktest(sessionId, ticker, entryPrice, keterangan){
  ticker = String(ticker || "").trim().toUpperCase().replace(".JK","");
  if(!ticker) return alert("Ticker wajib diisi.");
  entryPrice = parseFloat(entryPrice) || 0;
  if(!entryPrice) return alert("Harga entry wajib diisi.");
  const note = keterangan && keterangan.trim() ? keterangan.trim() : "Input manual (uji di luar screener)";

  let sid = sessionId || "";
  let session = sid ? state.backtests.find(b => String(b.id) === String(sid)) : null;
  if(!session){
    sid = String(Date.now());
    session = { id: sid, date: new Date().toLocaleString('id-ID'), items: [] };
    state.backtests.unshift(session);
  }
  session.items.push({ ticker, entryPrice, filterStr: note, sumber: "Manual" });
  saveBacktests();
  render();

  await syncBacktestToSupabase(sid, session.date, [{ ticker, entryPrice, sumber: "Manual", filterStr: note }]);
}

async function deleteBacktestSession(id){
  if(!confirm("Hapus sesi backtest ini?")) return;
  state.backtests = state.backtests.filter(b => String(b.id) !== String(id));
  saveBacktests();
  render();
  try{ await fetch(`${SUPABASE_URL}/backtest_sessions?id=eq.${id}`, { method: "DELETE", headers: getSupaHeaders() }); }catch(e){}
}

async function deleteBacktestItem(sessionId, ticker){
  const session = state.backtests.find(b => String(b.id) === String(sessionId));
  if(session){
    session.items = session.items.filter(it => it.ticker !== ticker);
    if(session.items.length === 0) state.backtests = state.backtests.filter(b => String(b.id) !== String(sessionId));
  }
  saveBacktests();
  render();
  try{ await fetch(`${SUPABASE_URL}/backtest_items?session_id=eq.${sessionId}&ticker=eq.${ticker}`, { method: "DELETE", headers: getSupaHeaders() }); }catch(e){}
}

function exportBacktestToExcel(id) {
  const session = state.backtests.find(b => String(b.id) === String(id));
  if (!session) return;
  
  // 1. Siapkan data dengan kolom "Tanggal Entry"
  const data = session.items.map(item => {
    const liveData = state.stocks.find(s => s.ticker === item.ticker);
    const currentPrice = liveData ? liveData.cClose : item.entryPrice;
    const pl = item.entryPrice ? ((currentPrice - item.entryPrice) / item.entryPrice) * 100 : 0;
    
    return {
      "Tanggal Entry": session.date, // Diambil dari waktu tangkap/sesi
      "Ticker": item.ticker,
      "Sumber": item.sumber || "Screener",
      "Harga Entry": item.entryPrice,
      "Harga Live": currentPrice,
      "Profit/Loss (%)": parseFloat(pl.toFixed(2)),
      "Filter / Keterangan": item.filterStr || "-"
    };
  });

  // 2. Buat Workbook & Worksheet Excel murni
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Backtest");
  
  // 3. Atur lebar kolom agar rapi
  const wscols = [
    {wch: 22}, // Tanggal Entry
    {wch: 10}, // Ticker
    {wch: 12}, // Sumber
    {wch: 12}, // Harga Entry
    {wch: 12}, // Harga Live
    {wch: 15}, // Profit/Loss (%)
    {wch: 50}  // Keterangan
  ];
  worksheet['!cols'] = wscols;

  // 4. Unduh file sebagai .xlsx
  XLSX.writeFile(workbook, `Backtest_IHSG_${session.id}.xlsx`);
}

function exportAllBacktestToExcel() {
  if (!state.backtests || state.backtests.length === 0) {
    return alert("Belum ada data backtest untuk diekspor.");
  }

  let allData = [];
  
  // Looping untuk menggabungkan seluruh item dari semua sesi
  state.backtests.forEach(session => {
    session.items.forEach(item => {
      const liveData = state.stocks.find(s => s.ticker === item.ticker);
      const currentPrice = liveData ? liveData.cClose : item.entryPrice;
      const pl = item.entryPrice ? ((currentPrice - item.entryPrice) / item.entryPrice) * 100 : 0;
      
      allData.push({
        "Tanggal Entry": session.date,
        "Ticker": item.ticker,
        "Sumber": item.sumber || "Screener",
        "Harga Entry": item.entryPrice,
        "Harga Live": currentPrice,
        "Profit/Loss (%)": parseFloat(pl.toFixed(2)),
        "Filter / Keterangan": item.filterStr || "-"
      });
    });
  });

  if (allData.length === 0) {
    return alert("Sesi backtest kosong, tidak ada item untuk diekspor.");
  }

  // Buat file Excel
  const worksheet = XLSX.utils.json_to_sheet(allData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Semua Backtest");
  
  // Mengatur lebar kolom agar rapi
  const wscols = [
    {wch: 22}, // Tanggal Entry
    {wch: 10}, // Ticker
    {wch: 12}, // Sumber
    {wch: 12}, // Harga Entry
    {wch: 12}, // Harga Live
    {wch: 15}, // Profit/Loss (%)
    {wch: 50}  // Keterangan
  ];
  worksheet['!cols'] = wscols;

  // Unduh dengan nama file otomatis memakai tanggal hari ini
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Semua_Backtest_IHSG_${dateStr}.xlsx`);
}

async function syncPortoToServer_(record) {
  const payload = {
    id: record.id, ticker: record.ticker, status: record.status,
    tgl_beli: record.tglBeli || null, harga_beli: record.hargaBeli || 0,
    lot_beli: record.lotBeli || 0, fee_beli_pct: record.feeBeliPct || 0, total_beli: record.totalBeli || 0,
    support: record.support || null, resistance: record.resistance || null,
    fib618: record.fib618 || null, target_tp: record.targetTP || null, cut_loss: record.cutLoss || null,
    tgl_jual: record.tglJual || null, harga_jual: record.hargaJual || 0,
    lot_jual: record.lotJual || 0, fee_jual_pct: record.feeJualPct || 0, net_jual: record.netJual || 0,
    jangka_waktu: record.jangkaWaktu !== "" ? record.jangkaWaktu : null,
    persen_pl: record.persenPL !== "" ? record.persenPL : null,
    nilai_pl: record.nilaiPL !== "" ? record.nilaiPL : null,
    catatan: record.catatan || "", entries: record.entries || []
  };

  try {
    await fetch(`${SUPABASE_URL}/portfolios`, {
      method: "POST",
      headers: { ...getSupaHeaders(), "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify(payload)
    });
  } catch (e) { console.error("Gagal sinkron Portofolio:", e); }
}

async function submitPortoForm(){
  const v = readPortoForm();
  if(!v.ticker) return alert("Nama emiten wajib diisi.");
  if(!v.tglBeli || !v.hargaBeli || !v.lotBeli) return alert("Tanggal beli, harga beli, dan jumlah lot wajib diisi.");
  const c = hitungPorto(v);
  const record = {
    id: state.portoEditId || String(Date.now()),
    ticker: v.ticker, tglBeli: v.tglBeli, hargaBeli: v.hargaBeli, lotBeli: v.lotBeli,
    feeBeliPct: isNaN(v.feeBeliPct) ? 0.15 : v.feeBeliPct, totalBeli: c.totalBeli,
    support: v.support, resistance: v.resistance, fib618: v.fib618, targetTP: v.targetTP, cutLoss: v.cutLoss,
    tglJual: v.tglJual, hargaJual: v.hargaJual, lotJual: v.lotJual,
    feeJualPct: isNaN(v.feeJualPct) ? 0.25 : v.feeJualPct, netJual: c.netJual,
    jangkaWaktu: c.jangkaWaktu, persenPL: c.persenPL, nilaiPL: c.nilaiPL, status: c.status,
    catatan: v.catatan
  };

  await syncPortoToServer_(record);
  
  const idx = state.portfolio.findIndex(p => String(p.id) === String(record.id));
  if(idx >= 0) state.portfolio[idx] = record; else state.portfolio.unshift(record);
  savePortoLocal();
  state.portoEditId = null;
  state.portoModalOpen = false;
  render();
}

async function deletePortoRecord(id){
  if(!confirm("Hapus catatan portofolio ini?")) return;
  state.portfolio = state.portfolio.filter(p => String(p.id) !== String(id));
  state.selectedPorto.delete(String(id));
  savePortoLocal();
  render();
  try { await fetch(`${SUPABASE_URL}/portfolios?id=eq.${id}`, { method: "DELETE", headers: getSupaHeaders() }); } catch(e) {}
}

async function bulkDeletePorto(){
  const ids = [...state.selectedPorto];
  if(ids.length === 0) return alert("Belum ada transaksi yang dicentang. Centang dulu di kolom paling kiri tabel.");
  if(!confirm(`Hapus ${ids.length} transaksi portofolio yang dicentang?`)) return;
  state.portfolio = state.portfolio.filter(p => !ids.includes(String(p.id)));
  state.selectedPorto.clear();
  savePortoLocal();
  render();
  try { await fetch(`${SUPABASE_URL}/portfolios?id=in.(${ids.join(',')})`, { method: "DELETE", headers: getSupaHeaders() }); } catch(e) {}
}

function hitungPorto(v){
  const nilaiBeli = (v.hargaBeli||0) * (v.lotBeli||0) * 100;
  const feeBeliRp = nilaiBeli * ((v.feeBeliPct||0)/100);
  const totalBeli = nilaiBeli > 0 ? Math.round(nilaiBeli + feeBeliRp) : 0;

  const nilaiJual = (v.hargaJual||0) * (v.lotJual||0) * 100;
  const feeJualRp = nilaiJual * ((v.feeJualPct||0)/100);
  const netJual = nilaiJual > 0 ? Math.round(nilaiJual - feeJualRp) : 0;

  let jangkaWaktu = "";
  if(v.tglBeli && v.tglJual){
    const d1 = new Date(v.tglBeli), d2 = new Date(v.tglJual);
    if(!isNaN(d1) && !isNaN(d2)) jangkaWaktu = Math.round((d2-d1)/86400000);
  }

  let persenPL = "", nilaiPL = "", status = "Open";
  if(totalBeli > 0 && netJual > 0){
    nilaiPL = netJual - totalBeli;
    persenPL = +((nilaiPL/totalBeli)*100).toFixed(2);
    status = nilaiPL > 0 ? "Win" : (nilaiPL < 0 ? "Loss" : "BEP");
  }
  return { totalBeli, netJual, jangkaWaktu, persenPL, nilaiPL, status };
}

function readPortoForm(){
  const g = id => document.getElementById(id);
  return {
    ticker: (g("pfTicker").value||"").trim().toUpperCase().replace(".JK",""),
    tglBeli: g("pfTglBeli").value,
    hargaBeli: parseFloat(g("pfHargaBeli").value) || 0,
    lotBeli: parseFloat(g("pfLotBeli").value) || 0,
    feeBeliPct: parseFloat(g("pfFeeBeli").value),
    support: g("pfSupport").value,
    resistance: g("pfResistance").value,
    fib618: g("pfFib618").value,
    targetTP: g("pfTargetTP").value,
    cutLoss: g("pfCutLoss").value,
    tglJual: g("pfTglJual").value,
    hargaJual: parseFloat(g("pfHargaJual").value) || 0,
    lotJual: parseFloat(g("pfLotJual").value) || 0,
    feeJualPct: parseFloat(g("pfFeeJual").value),
    catatan: g("pfCatatan").value
  };
}

function recalcPortoForm(){
  const v = readPortoForm();
  const c = hitungPorto(v);
  document.getElementById("pfTotalBeli").value = c.totalBeli ? fmtNum(c.totalBeli) : "";
  document.getElementById("pfNetJual").value = c.netJual ? fmtNum(c.netJual) : "";
  document.getElementById("pfJangka").value = c.jangkaWaktu !== "" ? c.jangkaWaktu + " hari" : "";
  document.getElementById("pfPersenPL").value = c.persenPL !== "" ? (c.persenPL>0?"+":"") + c.persenPL + "%" : "";
  document.getElementById("pfNilaiPL").value = c.nilaiPL !== "" ? fmtNum(c.nilaiPL) : "";
  const statusEl = document.getElementById("pfStatus");
  statusEl.value = c.status;
  statusEl.className = c.status==="Win" ? "status-win" : c.status==="Loss" ? "status-loss" : "status-open";
}

function resetPortoForm(){
  state.portoEditId = null;
  state.portoModalOpen = false;
  render();
}

function openPortoModal(id){
  state.portoEditId = id || null;
  state.portoModalOpen = true;
  render();
}

function autofillPortoFromScreener(){
  const el = document.getElementById("pfTicker");
  if(!el) return;
  const ticker = (el.value||"").trim().toUpperCase().replace(".JK","");
  const s = enriched().find(x=>x.ticker===ticker);
  if(!s) return;
  const sSupport = document.getElementById("pfSupport");
  const sResistance = document.getElementById("pfResistance");
  const sFib618 = document.getElementById("pfFib618");
  if(sSupport) sSupport.value = s.support ?? "";
  if(sResistance) sResistance.value = s.resistance ?? "";
  if(sFib618) sFib618.value = s.fib?.f618 ?? "";
}

function editPortoRecord(id){
  openPortoModal(id);
}

function enriched(){
  return state.stocks.map(s=>{
    const ratio = (s.volRatio!=null && !isNaN(s.volRatio)) ? s.volRatio : (s.cVol/(s.volMA20||1));
    const band = bandarmologi(s, ratio);
    const vol = volumeSignal(s, ratio);
    const sinyalVolume = s.sinyalVolume ?? vol.label;
    const conf = keyakinanNaik(s, vol);
    const keyakinan = s.keyakinanNaik ?? conf.label;
    const kTone = s.keyakinanNaik ? keyakinanToneFromLabel(s.keyakinanNaik) : conf.tone;
    
    let rekomendasi = "-";
    let rekTone = "muted";
    
    const isBreakout = s.isBBSqueeze && s.isBBSqueeze.indexOf("Ya") > -1 && ratio >= 1.5 && s.cClose > s.ema21H && (s.changePct || 0) > 0;
    const isPullback = s.trendHarga && s.trendHarga.indexOf("Bullish") === 0 && s.cClose <= s.ema21L * 1.03 && s.cClose >= (s.support || 0) * 0.98 && s.stochK != null && s.stochD != null && s.prevStochK < s.prevStochD && s.stochK > s.stochD;

    if (isBreakout) { rekomendasi = "🚀 Breakout"; rekTone = "up"; } 
    else if (isPullback) { rekomendasi = "🧲 Pullback"; rekTone = "gold"; }

    return { 
      ...s, band, volRatio: ratio, sinyalVolume, volTone: vol.tone, 
      keyakinanNaik: keyakinan, keyakinanScore: s.keyakinanScore ?? conf.score, 
      keyakinanTone: kTone, syariahLabel: boolLabel(s.syariah),
      rekomendasi, rekTone
    };
  });
}

function getFiltered(){
  return enriched().filter(s=>{
    if(state.search && !s.ticker.toLowerCase().includes(state.search.toLowerCase())) return false;
    
    // --- PRESET DSI ---
    if(state.activePreset === 'eri') {
      if (!(s.rsi7 >= 58 && s.rsi7 <= 70 && s.rsi21 >= 50 && s.rsi21 <= 70 && s.rsi7 > s.rsi21)) return false;
      if (!(s.cClose > s.ema21H && s.cClose <= s.ema21H * 1.03 && s.cClose > s.ema89)) return false;
      if (!(s.cHigh > s.prevHigh && s.cLow > s.prevLow && s.cVol > s.prevVol)) return false;
      if (!(s.prevStochK < s.prevStochD && s.stochK > s.stochD)) return false;
    } else if(state.activePreset === 'rsicross') {
      if (!(s.rsi7 >= 58 && s.rsi7 <= 75 && s.rsi21 >= 50 && s.rsi21 <= 75 && s.rsi7 > s.rsi21)) return false;
      if (!(s.cLow < s.ema21L && s.cClose > s.ema21H && s.cClose > s.cOpen)) return false;
      if (!(s.cClose >= (s.cHigh + s.cLow)/2 && s.turnover > 200000000 && s.cClose > s.ma100)) return false;
    } else if(state.activePreset === 'golden') {
      if (!(s.histPrev <= 0 && s.hist > 0)) return false;
      if (!(s.prevStochK < s.prevStochD && s.stochK > s.stochD)) return false;
    } else if (state.activePreset === 'uptrend') {
      if (!(s.cClose > s.ma21 && s.ma21 > s.ma50 && s.ma50 > s.ma100 && s.ma100 > s.ma200)) return false;
    } else if (state.activePreset === 'breakout') {
      if (s.isBBSqueeze && s.isBBSqueeze.indexOf("Ya") === -1) return false;
      if (s.volRatio == null || s.volRatio < 1.5) return false;
      if (s.cClose <= s.ema21H) return false;
      if ((s.changePct || 0) <= 0) return false;
    } else if (state.activePreset === 'pullback') {
      if (!s.trendHarga || s.trendHarga.indexOf("Bullish") !== 0) return false;
      if (s.cClose > s.ema21L * 1.03) return false;
      if (s.cClose < (s.support || 0) * 0.98) return false;
      if (s.stochK != null && s.stochD != null) {
         if (!(s.prevStochK < s.prevStochD && s.stochK > s.stochD)) return false;
      }
    } else if (state.activePreset === 'custom_bandar') {
      if (!(s.cOpen > s.ma21 && s.cOpen > s.ma50 && s.cOpen > s.ma100 && s.cOpen > s.ma200)) return false;
      if (s.volRatio == null || s.volRatio <= 2) return false;
      if (s.turnover == null || s.turnover < 10000000000) return false;
      if (s.band.tone !== "up" && (!s.uangGedeMasuk || !s.uangGedeMasuk.includes("Akumulasi"))) return false;
    } else if (state.activePreset === 'asing_akumulasi') {
      // Bandarmologi ASLI (data resmi IDX), bukan proxy volume seperti
      // 'custom_bandar' di atas. Syarat sama seperti preset "Akumulasi
      // Asing" di idx-screener: net 20 hari besar, konsisten (>=12/20
      // hari positif), dan cukup likuid untuk ditindaklanjuti.
      if (s.foreignNet20D == null || s.foreignNet20D < 50e9) return false;
      if (s.foreignUpDays == null || s.foreignUpDays < 12) return false;
      if (s.turnover == null || s.turnover < 5e9) return false;
    }

    const f=state.filters;
    if(f.sektor.length && !f.sektor.includes(s.sektor)) return false;
    if(f.syariahLabel.length && !f.syariahLabel.includes(s.syariahLabel)) return false;
    if(f.cekHarga.length && !f.cekHarga.includes(s.cekHarga)) return false;
    if(f.cekRsi.length && !f.cekRsi.includes(s.cekRsi)) return false;
    if(f.statusRsi.length && !f.statusRsi.includes(s.statusRsi)) return false;
    if(f.cekMacd.length && !f.cekMacd.includes(s.cekMacd)) return false;
    if(f.band.length && !f.band.includes(s.band.label)) return false;
    if(f.sinyalVolume.length && !f.sinyalVolume.includes(s.sinyalVolume)) return false;
    if(f.keyakinanNaik.length && !f.keyakinanNaik.includes(s.keyakinanNaik)) return false;
    if(f.trendHarga.length && !f.trendHarga.includes(s.trendHarga)) return false;
    if(f.polaCandle.length && !f.polaCandle.includes(s.polaCandle)) return false;
    if(f.uangGedeMasuk.length && !f.uangGedeMasuk.includes(s.uangGedeMasuk)) return false;
    if(f.isBBSqueeze.length && !f.isBBSqueeze.includes(s.isBBSqueeze)) return false;
    if(f.valuasi.length && !f.valuasi.includes(s.valuasi)) return false;

    const rf = state.rangeFilters;
    if(!inRange(s.bbWidth, rf.bbWidth)) return false;
    if(!inRange(s.atr14, rf.atr14)) return false;
    if(!inRange(s.clv, rf.clv)) return false;
    if(!inRange(s.rsi7, rf.rsi7)) return false;
    if(!inRange(s.rsi21, rf.rsi21)) return false;

    return true;
  });
}

function inRange(value, range){
  if(!range) return true;
  const hasMin = range.min !== "" && range.min !== null && range.min !== undefined;
  const hasMax = range.max !== "" && range.max !== null && range.max !== undefined;
  if(!hasMin && !hasMax) return true;
  if(value===null || value===undefined || isNaN(value)) return false;
  if(hasMin && value < parseFloat(range.min)) return false;
  if(hasMax && value > parseFloat(range.max)) return false;
  return true;
}
function getSorted(data) {
  if (!state.sort.col) return data;
  return [...data].sort((a, b) => {
    let valA = a[state.sort.col];
    let valB = b[state.sort.col];
    if (state.sort.col === 'band.label') { valA = a.band.label; valB = b.band.label; }
    if (state.sort.col === 'fib.f382') { valA = a.fib?.f382; valB = b.fib?.f382; }
    if (state.sort.col === 'fib.f50') { valA = a.fib?.f50; valB = b.fib?.f50; }
    if (state.sort.col === 'fib.f618') { valA = a.fib?.f618; valB = b.fib?.f618; }
    if (valA == null) valA = -Infinity;
    if (valB == null) valB = -Infinity;
    if (valA < valB) return state.sort.asc ? -1 : 1;
    if (valA > valB) return state.sort.asc ? 1 : -1;
    return 0;
  });
}
function uniqueOpts(list, key){ return [...new Set(list.map(s=> key==="band" ? s.band.label : s[key]))]; }

function render(){
  document.getElementById("modePill").className = "pill pill-up";
  document.getElementById("modePill").textContent = "Data Live";
  document.querySelectorAll(".tab-btn").forEach(b=> b.classList.toggle("active", b.dataset.tab===state.tab));

  const content = document.getElementById("content");
  if(state.tab==="screener") content.innerHTML = renderScreener();
  else if(state.tab==="watchlist") content.innerHTML = renderWatchlist();
  else if(state.tab==="backtest") content.innerHTML = renderBacktest();
  else if(state.tab==="portfolio") content.innerHTML = renderPortfolio();
  else if(state.tab==="chart") content.innerHTML = renderChart();
  else if(state.tab==="about") content.innerHTML = renderAbout();

  attachContentEvents();
  if(state.tab==="chart" && state.selectedTicker) drawChartSVG();

  document.getElementById("portoModalOverlay").classList.toggle("open", state.portoModalOpen);
  if(state.portoModalOpen){
    document.getElementById("portoModalContent").innerHTML = renderPortoFormFields();
    attachPortoModalEvents();
    recalcPortoForm();
  }

  document.getElementById("detailModalOverlay").classList.toggle("open", !!state.detailTicker);
  if(state.detailTicker){
    document.getElementById("detailModalTitle").textContent = `Detail Emiten · ${state.detailTicker}`;
    document.getElementById("detailModalContent").innerHTML = renderDetailModalContent();
    document.querySelectorAll("[data-detail-tab]").forEach(btn=>{
      btn.onclick = () => setDetailTab(btn.dataset.detailTab);
    });
    document.querySelectorAll("#detailModalContent [data-chart]").forEach(b=> b.onclick = ()=>{ closeDetail(); loadChart(b.dataset.chart); });
  }
}

function attachPortoModalEvents(){
  const portoInputIds = ["pfTicker","pfTglBeli","pfHargaBeli","pfLotBeli","pfFeeBeli","pfSupport","pfResistance","pfFib618","pfTargetTP","pfCutLoss","pfTglJual","pfHargaJual","pfLotJual","pfFeeJual"];
  portoInputIds.forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.oninput = recalcPortoForm;
  });
  const pfTickerEl = document.getElementById("pfTicker");
  if(pfTickerEl) pfTickerEl.addEventListener("change", autofillPortoFromScreener);

  const pfSubmitBtn = document.getElementById("pfSubmitBtn");
  if(pfSubmitBtn) pfSubmitBtn.onclick = submitPortoForm;
  const pfCancelBtn = document.getElementById("pfCancelBtn");
  if(pfCancelBtn) pfCancelBtn.onclick = resetPortoForm;
}

function renderMultiSelect(key, label, options) {
  const selected = state.filters[key];
  const btnText = selected.length === 0 ? "(Semua)" : `${selected.length} dipilih`;
  const isOpen = state.openDropdown === key;
  
  const itemsHtml = options.map(o => `
    <label class="select-item" onclick="event.stopPropagation()">
      <input type="checkbox" value="${o}" data-filter="${key}" ${selected.includes(o) ? 'checked' : ''}>
      <span>${o}</span>
    </label>
  `).join("");

  return `
    <div class="field">
      <label>${label}</label>
      <div class="multi-select">
        <button type="button" class="select-btn" onclick="state.openDropdown = state.openDropdown === '${key}' ? null : '${key}'; render(); event.stopPropagation();">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100px;">${btnText}</span>
          <span style="font-size:9px;color:var(--muted)">▼</span>
        </button>
        <div class="select-dropdown ${isOpen ? 'open' : ''}" onclick="event.stopPropagation()">
          ${itemsHtml}
        </div>
      </div>
    </div>
  `;
}

function renderRangeFilter(key, label, opts){
  opts = opts || {};
  const rf = state.rangeFilters[key];
  const step = opts.step || "any";
  return `
    <div class="field">
      <label>${label}</label>
      <div style="display:flex;gap:4px;">
        <input type="number" step="${step}" class="range-filter-input mono" data-range="${key}" data-bound="min" placeholder="Min" value="${rf.min}" style="width:64px;background:rgba(0,0,0,0.2);border:1px solid var(--border);color:var(--text);font-size:12px;border-radius:6px;padding:8px 6px;">
        <input type="number" step="${step}" class="range-filter-input mono" data-range="${key}" data-bound="max" placeholder="Max" value="${rf.max}" style="width:64px;background:rgba(0,0,0,0.2);border:1px solid var(--border);color:var(--text);font-size:12px;border-radius:6px;padding:8px 6px;">
      </div>
    </div>`;
}

const FILTER_LABELS = {
  sektor:"Sektor", syariahLabel:"Syariah", trendHarga:"Trend", cekMacd:"MACD", polaCandle:"Pola Candle",
  sinyalVolume:"Sinyal Volume", keyakinanNaik:"Keyakinan Naik", cekHarga:"Sinyal Harga", cekRsi:"Sinyal RSI",
  statusRsi:"Status RSI", band:"Bandarmologi", uangGedeMasuk:"Uang Gede", isBBSqueeze:"BB Squeeze", valuasi:"Valuasi",
  bbWidth:"BB Width", atr14:"ATR 14", clv:"CLV", rsi7:"RSI 7", rsi21:"RSI 21"
};
const PRESET_LABELS = { eri:"Eri Ginanjar", rsicross:"RSI & Harga Cross", golden:"Golden Cross DSI", uptrend:"Super Uptrend", breakout:"Volatility Breakout", pullback:"Pullback Uptrend", custom_bandar:"BPJS", asing_akumulasi:"Akumulasi Asing (IDX)" };
function clearChip(kind, key, value){
  if(kind==="search") state.search="";
  else if(kind==="preset") state.activePreset=null;
  else if(kind==="multi") state.filters[key] = state.filters[key].filter(v=>String(v)!==String(value));
  else if(kind==="range") state.rangeFilters[key] = {min:"",max:""};
  state.page = 1;
  render();
}

function renderActiveFilterChips(){
  const chips = [];
  if(state.search) chips.push(`<span class="filter-chip">Cari: "${state.search}" <button onclick="clearChip('search')" title="Hapus">✕</button></span>`);
  if(state.activePreset) chips.push(`<span class="filter-chip">Preset: ${PRESET_LABELS[state.activePreset]||state.activePreset} <button onclick="clearChip('preset')" title="Hapus">✕</button></span>`);
  Object.keys(state.filters).forEach(key=>{
    state.filters[key].forEach(val=>{
      chips.push(`<span class="filter-chip">${FILTER_LABELS[key]||key}: ${val} <button onclick="clearChip('multi','${key}','${String(val).replace(/'/g,"\\'")}')" title="Hapus">✕</button></span>`);
    });
  });
  Object.keys(state.rangeFilters).forEach(key=>{
    const r = state.rangeFilters[key];
    if(r.min !== "" || r.max !== ""){
      chips.push(`<span class="filter-chip">${FILTER_LABELS[key]||key}: ${r.min||'…'} - ${r.max||'…'} <button onclick="clearChip('range','${key}')" title="Hapus">✕</button></span>`);
    }
  });
  if(chips.length===0) return "";
  return `<div class="active-filters-bar">${chips.join("")}</div>`;
}

function hasActiveFilters(){
  const f = state.filters;
  const anyMulti = Object.keys(f).some(k => f[k].length > 0);
  const rf = state.rangeFilters;
  const anyRange = Object.keys(rf).some(k => rf[k].min !== "" || rf[k].max !== "");
  return anyMulti || anyRange || !!state.search;
}

// Setiap kolom punya "group" supaya bisa dikelompokkan di panel pemilih
// kolom (Harga, Fundamental, Teknikal, Bandarmologi, Analisa) — dengan
// ~50 kolom, tanpa pengelompokan panel pemilihnya sendiri akan berantakan.
const SCREENER_COLUMNS = [
  { key:"sektor", label:"Sektor", group:"Umum", cell:s=>`<td>${s.sektor||"-"}</td>` },
  { key:"syariah", label:"Syariah", group:"Umum", cell:s=>`<td>${s.syariah===true||s.syariah==="true"||s.syariah==="Ya"?"✅":(s.syariah===false||s.syariah==="false"||s.syariah==="Tidak"?"-":(s.syariah??"-"))}</td>` },
  { key:"cOpen", label:"Open", group:"Harga", cell:s=>`<td class="mono">${fmtNum(s.cOpen)}</td>` },
  { key:"cHigh", label:"High", group:"Harga", cell:s=>`<td class="mono">${fmtNum(s.cHigh)}</td>` },
  { key:"cLow", label:"Low", group:"Harga", cell:s=>`<td class="mono">${fmtNum(s.cLow)}</td>` },
  { key:"cClose", label:"Close", group:"Harga", cell:s=>`<td class="mono">${fmtNum(s.cClose)}</td>` },
  { key:"changePct", label:"Perubahan%", group:"Harga", cell:s=>`<td class="mono" style="color:${(s.changePct??0)>=0?'var(--up)':'var(--down)'}">${s.changePct!=null?((s.changePct>=0?'+':'')+s.changePct.toFixed(2)+'%'):'-'}</td>` },
  { key:"cVol", label:"Volume", group:"Harga", cell:s=>`<td class="mono">${fmtNum(s.cVol)}</td>` },
  { key:"turnover", label:"Turnover", group:"Harga", cell:s=>`<td class="mono">${fmtNum(s.turnover)}</td>` },
  { key:"vwap20", label:"VWAP20", group:"Harga", cell:s=>`<td class="mono">${fmtNum(s.vwap20)}</td>` },
  { key:"per", label:"PER", group:"Fundamental", cell:s=>`<td class="mono">${s.per??"-"}</td>` },
  { key:"pbv", label:"PBV", group:"Fundamental", cell:s=>`<td class="mono">${s.pbv??"-"}</td>` },
  { key:"roe", label:"ROE%", group:"Fundamental", cell:s=>`<td class="mono">${s.roe??"-"}</td>` },
  { key:"divYield", label:"Div Yield%", group:"Fundamental", cell:s=>`<td class="mono">${s.divYield??"-"}</td>` },
  { key:"valuasi", label:"Valuasi", group:"Fundamental", cell:s=>`<td>${pillHtml(s.valuasi||"-", valuasiTone(s.valuasi))}</td>` },
  { key:"support", label:"Support", group:"Teknikal", cell:s=>`<td class="mono" style="color:var(--down)">${fmtNum(s.support)}</td>` },
  { key:"resistance", label:"Resisten", group:"Teknikal", cell:s=>`<td class="mono" style="color:var(--up)">${fmtNum(s.resistance)}</td>` },
  { key:"high52w", label:"High 52W", group:"Teknikal", cell:s=>`<td class="mono">${fmtNum(s.high52w)}</td>` },
  { key:"low52w", label:"Low 52W", group:"Teknikal", cell:s=>`<td class="mono">${fmtNum(s.low52w)}</td>` },
  { key:"ema21H", label:"EMA21 H", group:"Teknikal", cell:s=>`<td class="mono">${fmtNum(s.ema21H)}</td>` },
  { key:"ema21L", label:"EMA21 L", group:"Teknikal", cell:s=>`<td class="mono">${fmtNum(s.ema21L)}</td>` },
  { key:"ema89", label:"EMA 89", group:"Teknikal", cell:s=>`<td class="mono">${fmtNum(s.ema89)}</td>` },
  { key:"ma21", label:"MA21", group:"Teknikal", cell:s=>`<td class="mono">${fmtNum(s.ma21)}</td>` },
  { key:"ma50", label:"MA50", group:"Teknikal", cell:s=>`<td class="mono">${fmtNum(s.ma50)}</td>` },
  { key:"ma100", label:"MA100", group:"Teknikal", cell:s=>`<td class="mono">${fmtNum(s.ma100)}</td>` },
  { key:"ma200", label:"MA200", group:"Teknikal", cell:s=>`<td class="mono">${fmtNum(s.ma200)}</td>` },
  { key:"trendHarga", label:"Trend (MA)", group:"Teknikal", cell:s=>`<td>${pillHtml(s.trendHarga||"-", trendTone(s.trendHarga))}</td>` },
  { key:"rsi7", label:"RSI 7", group:"Teknikal", cell:s=>`<td>${rsiGaugeHtml(s.rsi7)}</td>` },
  { key:"rsi21", label:"RSI 21", group:"Teknikal", cell:s=>`<td class="mono">${s.rsi21!=null?Number(s.rsi21).toFixed(1):"-"}</td>` },
  { key:"statusRsi", label:"Status RSI", group:"Teknikal", cell:s=>`<td>${s.statusRsi||"-"}</td>` },
  { key:"cekRsi", label:"Sinyal RSI", group:"Teknikal", cell:s=>`<td>${s.cekRsi||"-"}</td>` },
  { key:"hist", label:"MACD Hist", group:"Teknikal", cell:s=>`<td class="mono">${s.hist!=null?Number(s.hist).toFixed(3):"-"}</td>` },
  { key:"stochK", label:"Stoch K", group:"Teknikal", cell:s=>`<td class="mono">${s.stochK??"-"}</td>` },
  { key:"stochD", label:"Stoch D", group:"Teknikal", cell:s=>`<td class="mono">${s.stochD??"-"}</td>` },
  { key:"cekMacd", label:"MACD", group:"Teknikal", cell:s=>`<td>${pillHtml(s.cekMacd||"-", ((s.cekMacd||"").includes("Buy")||(s.cekMacd||"").includes("Bullish"))?"up":(s.cekMacd||"").includes("Sell")?"down":"muted")}</td>` },
  { key:"cekHarga", label:"Sinyal Harga", group:"Teknikal", cell:s=>`<td>${s.cekHarga||"-"}</td>` },
  { key:"fib.f382", label:"Fib 38.2", group:"Teknikal", cell:s=>`<td class="mono">${fmtNum(s.fib?.f382)}</td>` },
  { key:"fib.f50", label:"Fib 50", group:"Teknikal", cell:s=>`<td class="mono">${fmtNum(s.fib?.f50)}</td>` },
  { key:"fib.f618", label:"Fib 61.8", group:"Teknikal", cell:s=>`<td class="mono">${fmtNum(s.fib?.f618)}</td>` },
  { key:"candleKemarin", label:"Candle Kemarin", group:"Teknikal", sortable:false, cell:s=>`<td style="white-space:normal;max-width:160px;font-size:11px;font-family:'Sora',sans-serif;">${s.candleKemarin||"-"}</td>` },
  { key:"candleHariIni", label:"Candle Hari Ini", group:"Teknikal", sortable:false, cell:s=>`<td style="white-space:normal;max-width:160px;font-size:11px;font-family:'Sora',sans-serif;">${s.candleHariIni||"-"}</td>` },
  { key:"polaCandle", label:"Pola Candle", group:"Teknikal", cell:s=>`<td>${pillHtml(s.polaCandle||"-", polaTone(s.polaCandle))}</td>` },
  { key:"volRatio", label:"Rasio Vol", group:"Teknikal", cell:s=>`<td class="mono" style="color:${s.volTone==='up'?'var(--up)':s.volTone==='down'?'var(--down)':'var(--muted)'}">${(s.volRatio??0).toFixed(2)}x</td>` },
  { key:"sinyalVolume", label:"Sinyal Volume", group:"Teknikal", cell:s=>`<td>${pillHtml(s.sinyalVolume||"-", s.volTone)}</td>` },
  { key:"band.label", label:"Bandarmologi (proxy vol.)", group:"Bandarmologi", cell:s=>`<td>${pillHtml(s.band.label, s.band.tone)}</td>` },
  { key:"foreignNet20D", label:"Net Asing 20H (IDX)", group:"Bandarmologi", cell:s=>`<td class="mono" style="color:${(s.foreignNet20D??0)>=0?'var(--up)':'var(--down)'}">${s.foreignNet20D!=null?fmtRp(s.foreignNet20D):'-'}</td>` },
  { key:"foreignUpDays", label:"Hari Asing +", group:"Bandarmologi", cell:s=>`<td class="mono">${s.foreignUpDays!=null?`${s.foreignUpDays}/${s.flowDays??20}`:'-'}</td>` },
  { key:"uangGedeMasuk", label:"Uang Gede Masuk", group:"Bandarmologi", cell:s=>`<td>${pillHtml(s.uangGedeMasuk||"-", s.uangGedeMasuk==="Ya"?"up":"muted")}</td>` },
  { key:"isBBSqueeze", label:"BB Squeeze", group:"Teknikal", cell:s=>`<td>${pillHtml(s.isBBSqueeze||"-", s.isBBSqueeze==="Ya"?"gold":"muted")}</td>` },
  { key:"bbWidth", label:"BB Width", group:"Teknikal", cell:s=>`<td class="mono">${s.bbWidth??"-"}</td>` },
  { key:"atr14", label:"ATR 14", group:"Teknikal", cell:s=>`<td class="mono">${s.atr14??"-"}</td>` },
  { key:"clv", label:"CLV", group:"Teknikal", cell:s=>`<td class="mono">${s.clv??"-"}</td>` },
  { key:"keyakinanNaik", label:"Keyakinan Naik", group:"Analisa", cell:s=>`<td>${pillHtml(s.keyakinanNaik, s.keyakinanTone)}</td>` },
  { key:"rekomendasi", label:"Rekomendasi Setup", group:"Analisa", cell:s=>`<td>${s.rekomendasi !== "-" ? pillHtml(s.rekomendasi, s.rekTone) : '<span style="color:var(--muted)">-</span>'}</td>` }
];

// Kolom yang tampil DEFAULT — cukup untuk overview cepat tanpa scroll
// horizontal panjang. Sisanya disembunyikan sampai dipilih lewat panel
// "🧩 Kolom", supaya tabel nyaman dilihat begitu halaman dibuka.
const DEFAULT_VISIBLE_COLS = [
  "sektor", "cClose", "changePct", "cVol",
  "per", "pbv", "roe", "divYield", "valuasi",
  "trendHarga", "rsi7", "cekMacd",
  "foreignNet20D", "keyakinanNaik", "rekomendasi"
];
const LS_VISIBLE_COLS = "ihsg_visible_cols_v1";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];

function renderScreener(){
  const list = enriched();
  const filtered = getFiltered();
  const sorted = getSorted(filtered);
  
  const effectiveLimit = state.limit === "all" ? Math.max(sorted.length, 1) : state.limit;
  const totalPages = Math.ceil(sorted.length / effectiveLimit) || 1;
  if (state.page > totalPages) state.page = totalPages;
  const startIndex = (state.page - 1) * effectiveLimit;
  const pagedData = sorted.slice(startIndex, startIndex + effectiveLimit);

  const getOpts = (key) => uniqueOpts(list,key);
  const allFilteredChecked = filtered.length > 0 && filtered.every(s => state.selectedForBacktest.has(s.ticker));
  const visibleColumns = SCREENER_COLUMNS.filter(c => state.visibleCols.has(c.key));

  const FREEZE_W = { chk: 36, star: 34, ticker: 104 };
  const FREEZE_LEFT = { chk: 0, star: FREEZE_W.chk, ticker: FREEZE_W.chk + FREEZE_W.star };

  const th = (label, col, sortable, freezeKey) => {
    const freezeStyle = freezeKey ? `width:${FREEZE_W[freezeKey]}px;left:${FREEZE_LEFT[freezeKey]}px;` : "";
    const freezeClass = freezeKey ? `col-freeze${freezeKey==='ticker' ? ' col-freeze-shadow' : ''}` : "";
    if(sortable === false) return `<th class="${freezeClass}" style="${freezeStyle}">${label}</th>`;
    let icon = `<span class="sort-icon"></span>`;
    if (state.sort.col === col) {
      icon = `<span class="sort-icon">${state.sort.asc ? '▲' : '▼'}</span>`;
    }
    return `<th class="sortable ${freezeClass}" data-sort="${col}" style="${freezeStyle}">${label} ${icon}</th>`;
  };

  const nBullish = filtered.filter(s=>trendTone(s.trendHarga)==="up").length;
  const nBearish = filtered.filter(s=>trendTone(s.trendHarga)==="down").length;
  const nSideways = filtered.length - nBullish - nBearish;
  const nHighConf = filtered.filter(s=>s.keyakinanTone==="up").length;
  const topGainer = filtered.length ? filtered.reduce((a,b)=> (b.changePct??-999) > (a.changePct??-999) ? b : a) : null;
  const summaryCards = `
    <div class="summary-grid">
      <div class="summary-card"><div class="summary-lbl">Total Emiten</div><div class="summary-val">${filtered.length}</div></div>
      <div class="summary-card tone-up"><div class="summary-lbl">Trend Bullish</div><div class="summary-val">${nBullish}</div></div>
      <div class="summary-card tone-down"><div class="summary-lbl">Trend Bearish</div><div class="summary-val">${nBearish}</div></div>
      <div class="summary-card tone-gold"><div class="summary-lbl">Sideways/Mixed</div><div class="summary-val">${nSideways}</div></div>
      <div class="summary-card tone-up"><div class="summary-lbl">Keyakinan Tinggi</div><div class="summary-val">${nHighConf}</div></div>
      <div class="summary-card"><div class="summary-lbl">Top Gainer</div><div class="summary-val" style="font-size:16px;">${topGainer ? topGainer.ticker + (topGainer.changePct!=null ? ' <span style="color:var(--up);font-size:13px; text-shadow:0 0 5px rgba(16,185,129,0.5);">+' + topGainer.changePct.toFixed(2) + '%</span>' : '') : "-"}</div></div>
    </div>`;

  const rows = pagedData.map(s=>{
    const bodyCells = visibleColumns.map(c => c.cell(s)).join("");
    return `
    <tr>
      <td class="col-freeze" style="width:${FREEZE_W.chk}px;left:${FREEZE_LEFT.chk}px;"><input type="checkbox" class="custom-checkbox chk-row" data-check="${s.ticker}" ${state.selectedForBacktest.has(s.ticker)?'checked':''}></td>
      <td class="col-freeze" style="width:${FREEZE_W.star}px;left:${FREEZE_LEFT.star}px;"><button class="star-btn" data-fav="${s.ticker}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="${state.watchlist.has(s.ticker)?'var(--gold)':'none'}" stroke="${state.watchlist.has(s.ticker)?'var(--gold)':'var(--muted)'}" stroke-width="2.5" style="filter: ${state.watchlist.has(s.ticker)?'drop-shadow(0 0 3px rgba(245,158,11,0.5))':'none'};"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </button></td>
      <td class="ticker-cell col-freeze col-freeze-shadow" style="width:${FREEZE_W.ticker}px;left:${FREEZE_LEFT.ticker}px;"><button class="ticker-link" data-detail="${s.ticker}" title="Lihat detail ${s.ticker}">${s.ticker}</button>${s.uangGedeMasuk==="Ya" ? ' <span title="Indikasi uang gede masuk">💰</span>' : ''}</td>
      ${bodyCells}
      <td>
        <div style="display:flex; gap: 8px;">
          <button class="link-btn" data-chart="${s.ticker}">Chart</button>
          <a class="link-btn link-btn-tv" href="${tvChartPageUrl(s.ticker)}" target="_blank" rel="noopener" title="Buka ${s.ticker} di TradingView">TV</a>
          <a class="link-btn link-btn-sb" href="${stockbitUrl(s.ticker)}" target="_blank" rel="noopener" title="Buka ${s.ticker} di Stockbit">SB</a>
        </div>
      </td>
    </tr>`;
  }).join("");

  return `
    ${summaryCards}
    <div class="panel">
      <div class="filter-toolbar">
        <div class="field" style="flex:0 0 auto;">
          <label>Screener DSI (Preset Siap Pakai)</label>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="pill ${state.activePreset === 'eri' ? 'pill-gold' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'eri' ? null : 'eri'; state.page=1; render();">Eri Ginanjar</button>
            <button class="pill ${state.activePreset === 'rsicross' ? 'pill-gold' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'rsicross' ? null : 'rsicross'; state.page=1; render();">RSI & Harga Cross</button>
            <button class="pill ${state.activePreset === 'golden' ? 'pill-gold' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'golden' ? null : 'golden'; state.page=1; render();">Golden Cross DSI</button>
            <button class="pill ${state.activePreset === 'uptrend' ? 'pill-gold' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'uptrend' ? null : 'uptrend'; state.page=1; render();">Super Uptrend</button>
            <button class="pill ${state.activePreset === 'breakout' ? 'pill-up' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'breakout' ? null : 'breakout'; state.page=1; render();">🚀 Volatility Breakout</button>
            <button class="pill ${state.activePreset === 'pullback' ? 'pill-teal' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'pullback' ? null : 'pullback'; state.page=1; render();">🧲 Pullback Uptrend</button>
          <button class="pill ${state.activePreset === 'custom_bandar' ? 'pill-up' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'custom_bandar' ? null : 'custom_bandar'; state.page=1; render();" title="Proxy dari lonjakan volume — bukan data asing resmi">🔥 BPJS (proxy volume)</button>
          <button class="pill ${state.activePreset === 'asing_akumulasi' ? 'pill-up' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'asing_akumulasi' ? null : 'asing_akumulasi'; state.page=1; render();" title="Net beli asing 20 hari &ge; 50M, konsisten &ge;12/20 hari, likuid &ge;5M/hari — dari data resmi IDX">🐋 Akumulasi Asing (IDX)</button>
            </div>
        </div>
        <div class="field">
          <label>Cari Ticker</label>
          <div class="search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input id="searchInput" value="${state.search}" placeholder="BBCA..." />
          </div>
        </div>
        <div class="field">
          <label>Baris / Hal</label>
          <select id="pageSizeSelect" style="background:rgba(0,0,0,0.2);border:1px solid var(--border);color:var(--text);font-size:13px;border-radius:8px;padding:9.5px 12px; transition:0.2s;">
            ${PAGE_SIZE_OPTIONS.map(n=>`<option value="${n}" ${String(state.limit)===String(n)?'selected':''}>${n}</option>`).join("")}
            <option value="all" ${state.limit==="all"?'selected':''}>Semua</option>
          </select>
        </div>
      </div>

      <div class="filter-section">
        <div class="filter-section-title">Klasifikasi Emiten<span class="line"></span></div>
        <div class="filter-grid">
          ${renderMultiSelect("sektor", "Sektor", getOpts("sektor"))}
          ${renderMultiSelect("syariahLabel", "Syariah", getOpts("syariahLabel"))}
        </div>
      </div>

      <div class="filter-section">
        <div class="filter-section-title">Trend & Sinyal Teknikal<span class="line"></span></div>
        <div class="filter-grid">
          ${renderMultiSelect("trendHarga", "Trend Harga (MA)", getOpts("trendHarga"))}
          ${renderMultiSelect("cekMacd", "Sinyal MACD", getOpts("cekMacd"))}
          ${renderMultiSelect("cekHarga", "Sinyal Harga (EMA)", getOpts("cekHarga"))}
          ${renderMultiSelect("cekRsi", "Sinyal RSI", getOpts("cekRsi"))}
          ${renderMultiSelect("statusRsi", "Status RSI", getOpts("statusRsi"))}
          ${renderMultiSelect("polaCandle", "Pola Candle", getOpts("polaCandle"))}
        </div>
      </div>

      <div class="filter-section">
        <div class="filter-section-title">Momentum, Volume & Keyakinan<span class="line"></span></div>
        <div class="filter-grid">
          ${renderMultiSelect("sinyalVolume", "Sinyal Volume", getOpts("sinyalVolume"))}
          ${renderMultiSelect("keyakinanNaik", "Keyakinan Naik", getOpts("keyakinanNaik"))}
          ${renderMultiSelect("band", "Bandarmologi", getOpts("band"))}
          ${renderMultiSelect("uangGedeMasuk", "Uang Gede Masuk", getOpts("uangGedeMasuk"))}
        </div>
      </div>

      <button type="button" class="adv-toggle ${state.showAdvancedFilters ? 'open' : ''}" id="advToggleBtn">
        <span class="chev">▶</span> Filter Lanjutan (Valuasi, BB Squeeze, ATR, CLV, Rentang RSI)
      </button>
      <div class="adv-body ${state.showAdvancedFilters ? 'open' : ''}">
        <div class="filter-section">
          <div class="filter-grid">
            ${renderMultiSelect("valuasi", "Valuasi", getOpts("valuasi"))}
            ${renderMultiSelect("isBBSqueeze", "BB Squeeze", getOpts("isBBSqueeze"))}
            ${renderRangeFilter("bbWidth", "BB Width (%)", {step:"0.01"})}
            ${renderRangeFilter("atr14", "ATR 14", {step:"0.01"})}
            ${renderRangeFilter("clv", "CLV", {step:"0.01"})}
            ${renderRangeFilter("rsi7", "RSI 7", {step:"0.1"})}
            ${renderRangeFilter("rsi21", "RSI 21", {step:"0.1"})}
          </div>
        </div>
      </div>

      ${renderActiveFilterChips()}

      <div class="toolbar-footer">
        <span class="count-badge" style="margin:0;">${filtered.length} emiten sesuai filter &middot; ${state.selectedForBacktest.size} dipilih</span>
        <div style="display:flex; gap:12px;">
          ${hasActiveFilters() ? `<button class="btn btn-outline" id="resetFiltersBtn" style="color:#f87171;border-color:rgba(239,68,68,0.3);">Reset Filter</button>` : ""}
          <button class="btn btn-gold-outline" id="saveBacktestBtn">Simpan Pilihan ke Backtest</button>
        </div>
      </div>
    </div>

    <div class="col-picker-wrap">
      <button class="btn btn-outline" id="colPickerBtn">🧩 Kolom (${visibleColumns.length}/${SCREENER_COLUMNS.length})</button>
      <div class="col-picker-panel ${state.colPickerOpen ? 'open' : ''}">
        <div class="col-picker-head">
          <span>Pilih kolom yang ditampilkan</span>
          <div style="display:flex;gap:6px;">
            <button class="link-btn" data-col-preset="ringkas">Ringkas</button>
            <button class="link-btn" data-col-preset="semua">Semua</button>
            <button class="link-btn" data-col-preset="kosong">Kosongkan</button>
          </div>
        </div>
        ${["Umum","Harga","Fundamental","Teknikal","Bandarmologi","Analisa"].map(group => {
          const cols = SCREENER_COLUMNS.filter(c=>c.group===group);
          if(!cols.length) return "";
          return `<div class="col-picker-group">
            <div class="col-picker-group-title">${group}</div>
            <div class="col-picker-grid">
              ${cols.map(c=>`<label class="col-picker-item"><input type="checkbox" data-col-toggle="${c.key}" ${state.visibleCols.has(c.key)?'checked':''}> ${c.label}</label>`).join("")}
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>
    
    <div class="table-wrap">
      <table class="mono">
        <thead><tr>
          <th class="col-freeze" style="width:${FREEZE_W.chk}px;left:${FREEZE_LEFT.chk}px;"><input type="checkbox" id="chkSelectAll" class="custom-checkbox" title="Pilih Semua Hasil Filter" ${allFilteredChecked ? 'checked' : ''}></th>
          <th class="col-freeze" style="width:${FREEZE_W.star}px;left:${FREEZE_LEFT.star}px;">★</th>
          ${th('Ticker', 'ticker', true, 'ticker')}
          ${visibleColumns.map(c => th(c.label, c.key, c.sortable)).join("")}
          <th>Aksi</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="pagination">
      <button class="btn btn-outline" id="prevPage" ${state.page <= 1 ? 'disabled' : ''}>&laquo; Prev</button>
      <span style="font-size:12px;color:var(--text); font-weight: 500;">Halaman <b style="color:var(--gold)">${state.page}</b> dari ${totalPages} (${sorted.length} emiten)</span>
      <button class="btn btn-outline" id="nextPage" ${state.page >= totalPages ? 'disabled' : ''}>Next &raquo;</button>
    </div>
  `;
}

function renderBacktest(){
  const tickerOptions = [...new Set(state.stocks.map(s=>s.ticker))].map(t=>`<option value="${t}">`).join("");
  const sessionOptions = `<option value="">+ Buat sesi baru</option>` +
    state.backtests.map(b=>`<option value="${b.id}">${b.date} (${b.items.length} emiten)</option>`).join("");

  const manualForm = `
    <div style="display:flex; justify-content:flex-end; margin-bottom: 16px;">
      <button class="btn btn-primary" id="exportAllBtBtn" style="background:var(--teal-grad); box-shadow:0 4px 12px rgba(6,182,212,0.3); border:none;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Ekspor Semua Sesi ke Excel
      </button>
    </div>
    <div class="panel" style="flex-direction:column;align-items:stretch;">
      <h3 style="margin:0 0 16px;font-size:14px; font-weight:700;">➕ Tambah Manual ke Backtest</h3>
      <div class="porto-form" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));align-items:end;">
        <div class="field"><label>Simpan ke Sesi</label><select id="btManualSession">${sessionOptions}</select></div>
        <div class="field"><label>Ticker</label><input id="btManualTicker" list="btTickerList" placeholder="BBCA" style="text-transform:uppercase;"><datalist id="btTickerList">${tickerOptions}</datalist></div>
        <div class="field"><label>Harga Entry</label><input id="btManualPrice" type="number" placeholder="0"></div>
        <div class="field wide"><label>Keterangan</label><input id="btManualNote" placeholder="Catatan"></div>
        <div class="field"><button class="btn btn-outline" style="border-color:var(--goldDim);color:var(--gold);justify-content:center; padding:10px;" id="btManualAddBtn">+ Tambah</button></div>
      </div>
    </div>`;

  if(state.backtests.length === 0){
    return manualForm + `<div class="empty-box">Belum ada sesi backtest yang disimpan.</div>`;
  }

  const sessions = state.backtests.map(session => {
    let winCount = 0, totalPL = 0, maxPL = -Infinity, minPL = Infinity, validItems = 0;

    const rows = session.items.map(item => {
      const liveData = state.stocks.find(s => s.ticker === item.ticker);
      const currentPrice = liveData ? liveData.cClose : item.entryPrice;
      const pl = item.entryPrice ? ((currentPrice - item.entryPrice) / item.entryPrice) * 100 : 0;
      
      if (item.entryPrice) {
        if (pl > 0) winCount++;
        totalPL += pl;
        if (pl > maxPL) maxPL = pl;
        if (pl < minPL) minPL = pl;
        validItems++;
      }

      const tone = pl > 0 ? "up" : pl < 0 ? "down" : "muted";
      const plStr = (pl > 0 ? "+" : "") + pl.toFixed(2) + "%";
      const filterStr = item.filterStr || "-";
      const sumberPill = pillHtml(item.sumber || "Screener", item.sumber === "Manual" ? "gold" : "muted");

      return `<tr>
        <td class="ticker-cell"><button class="ticker-link" data-detail="${item.ticker}" title="Lihat detail ${item.ticker}">${item.ticker}</button></td>
        <td>${sumberPill}</td>
        <td style="white-space:normal; max-width:320px; font-family:'Sora',sans-serif; font-size:12px; line-height:1.6; color:var(--text); opacity:0.9;">${filterStr}</td>
        <td class="mono">${fmtNum(item.entryPrice)}</td>
        <td class="mono">${fmtNum(currentPrice)}</td>
        <td class="mono" style="color:var(--${tone}); font-weight:700; font-size:14px;">${plStr}</td>
        <td><button class="link-btn" data-chart="${item.ticker}">Chart</button></td>
        <td><button class="link-btn" style="color:#f87171;" data-del-bt-item="${session.id}|${item.ticker}">Hapus</button></td>
      </tr>`;
    }).join("");

    const avgPL = validItems > 0 ? (totalPL / validItems).toFixed(2) : "0.00";
    const winRate = validItems > 0 ? Math.round((winCount / validItems) * 100) : 0;
    const bestPL = maxPL !== -Infinity ? maxPL.toFixed(2) : "0.00";
    const worstPL = minPL !== Infinity ? minPL.toFixed(2) : "0.00";

    const avgTone = avgPL > 0 ? "up" : avgPL < 0 ? "down" : "muted";
    const winTone = winRate >= 50 ? "up" : winRate > 0 ? "gold" : "down";

    const sessionSummary = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:12px; margin-bottom:16px;">
        <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:8px; padding:12px; border-top: 3px solid var(--${winTone});">
          <div style="font-size:10.5px; color:var(--muted); text-transform:uppercase; font-weight:600; margin-bottom:4px;">Win Rate</div>
          <div style="font-size:18px; font-weight:700; font-family:'JetBrains Mono',monospace; color:var(--text);">${winRate}%</div>
        </div>
        <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:8px; padding:12px; border-top: 3px solid var(--${avgTone});">
          <div style="font-size:10.5px; color:var(--muted); text-transform:uppercase; font-weight:600; margin-bottom:4px;">Rata-rata P/L</div>
          <div style="font-size:18px; font-weight:700; font-family:'JetBrains Mono',monospace; color:var(--${avgTone});">${avgPL > 0 ? '+' : ''}${avgPL}%</div>
        </div>
        <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:8px; padding:12px; border-top: 3px solid var(--up);">
          <div style="font-size:10.5px; color:var(--muted); text-transform:uppercase; font-weight:600; margin-bottom:4px;">P/L Tertinggi</div>
          <div style="font-size:18px; font-weight:700; font-family:'JetBrains Mono',monospace; color:var(--up);">${bestPL > 0 ? '+' : ''}${bestPL}%</div>
        </div>
        <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:8px; padding:12px; border-top: 3px solid var(--down);">
          <div style="font-size:10.5px; color:var(--muted); text-transform:uppercase; font-weight:600; margin-bottom:4px;">P/L Terendah</div>
          <div style="font-size:18px; font-weight:700; font-family:'JetBrains Mono',monospace; color:var(--down);">${worstPL > 0 ? '+' : ''}${worstPL}%</div>
        </div>
      </div>
    `;

    return `
      <div class="panel" style="flex-direction:column; align-items:stretch; margin-bottom: 24px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 16px;">
          <div>
            <h3 style="margin:0; font-size: 15px; font-weight:700;">Waktu Tangkap: ${session.date}</h3>
            <div style="font-size: 12px; color: var(--muted); margin-top: 6px; font-weight:500;">${session.items.length} Emiten Disimpan</div>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="btn btn-outline" style="color:#22d3ee; border-color:rgba(6,182,212,0.4);" data-export-bt="${session.id}">Ekspor Excel</button>
            <button class="btn btn-outline" style="color:#f87171; border-color:rgba(239,68,68,0.4);" data-del-bt="${session.id}">Hapus Sesi</button>
          </div>
        </div>
        ${sessionSummary}
        <div class="table-wrap">
          <table class="mono">
            <thead>
              <tr>
                <th>Ticker</th><th>Sumber</th><th>Filter / Keterangan</th><th>Harga Entry</th>
                <th>Harga Live</th><th>Profit / Loss</th><th>Aksi</th><th></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }).join("");

  return manualForm + sessions;
}

  

function renderWatchlist(){
  const rows = enriched().filter(s=>state.watchlist.has(s.ticker));
  if(rows.length===0) return `<div class="empty-box">Belum ada saham di watchlist. Klik ikon ★ di tab Screener untuk menambahkan.</div>`;
  return `<div class="wl-grid">${rows.map(s=>`
    <div class="wl-card">
      <div class="wl-card-top">
        <button class="ticker-link ticker-cell" data-detail="${s.ticker}" title="Lihat detail ${s.ticker}">${s.ticker}</button>
        <button class="star-btn" data-fav="${s.ticker}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--gold)" stroke="var(--gold)" stroke-width="2" style="filter: drop-shadow(0 0 4px rgba(245,158,11,0.6));"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
      </div>
      <div class="wl-price mono">${fmtNum(s.cClose)}</div>
      <div class="wl-pills">
        ${pillHtml(s.cekMacd, s.cekMacd.includes("Buy")?"up":"muted")}
        ${pillHtml(s.band.label, s.band.tone)}
      </div>
      <div class="mono" style="font-size:11.5px;color:var(--muted);display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;margin-bottom:16px;">
        <span>RSI7/21: <span style="color:var(--text); font-weight:600;">${s.rsi7}/${s.rsi21}</span></span>
        <span>EMA21 H/L: <span style="color:var(--text); font-weight:600;">${fmtNum(s.ema21H)}/${fmtNum(s.ema21L)}</span></span>
        <span style="color:#f87171;">Support: <span style="color:var(--text); font-weight:600;">${fmtNum(s.support)}</span></span>
        <span style="color:#34d399;">Resisten: <span style="color:var(--text); font-weight:600;">${fmtNum(s.resistance)}</span></span>
        <span>Fib 50%: <span style="color:var(--text); font-weight:600;">${fmtNum(s.fib?.f50)}</span></span>
        <span>Fib 61.8%: <span style="color:var(--text); font-weight:600;">${fmtNum(s.fib?.f618)}</span></span>
      </div>
      <button class="btn btn-outline" style="width: 100%; justify-content:center; color: var(--teal); border-color: rgba(6,182,212,0.3);" data-chart="${s.ticker}">Lihat grafik →</button>
    </div>
  `).join("")}</div>`;
}

function renderPortoFormFields(){
  const editing = state.portoEditId ? state.portfolio.find(p => String(p.id) === String(state.portoEditId)) : null;
  const f = editing || {
    ticker:"", tglBeli:"", hargaBeli:"", lotBeli:"", feeBeliPct:0.15,
    support:"", resistance:"", fib618:"", targetTP:"", cutLoss:"",
    tglJual:"", hargaJual:"", lotJual:"", feeJualPct:0.25, catatan:""
  };
  const c = editing ? hitungPorto({
    hargaBeli:+f.hargaBeli||0, lotBeli:+f.lotBeli||0, feeBeliPct:+f.feeBeliPct||0,
    hargaJual:+f.hargaJual||0, lotJual:+f.lotJual||0, feeJualPct:+f.feeJualPct||0,
    tglBeli:f.tglBeli, tglJual:f.tglJual
  }) : { totalBeli:"", netJual:"", jangkaWaktu:"", persenPL:"", nilaiPL:"", status:"Open" };

  const tickerOptions = [...new Set(state.stocks.map(s=>s.ticker))].map(t=>`<option value="${t}">`).join("");

  document.getElementById("portoModalTitle") && (document.getElementById("portoModalTitle").textContent = editing ? "✏️ Edit Transaksi Portofolio" : "➕ Tambah Transaksi Portofolio");

  return `
      <div class="porto-form">
        <div class="field"><label>Nama Emiten *</label><input id="pfTicker" list="pfTickerList" value="${f.ticker}" placeholder="BBCA" style="text-transform:uppercase;"><datalist id="pfTickerList">${tickerOptions}</datalist></div>
        <div class="field"><label>Tanggal Beli *</label><input id="pfTglBeli" type="date" value="${f.tglBeli||""}"></div>
        <div class="field"><label>Harga Beli *</label><input id="pfHargaBeli" type="number" value="${f.hargaBeli||""}"></div>
        <div class="field"><label>Jumlah Lot Beli *</label><input id="pfLotBeli" type="number" value="${f.lotBeli||""}"></div>
        <div class="field"><label>Fee Beli (%)</label><input id="pfFeeBeli" type="number" step="0.01" value="${f.feeBeliPct??0.15}"></div>
        <div class="field"><label>Total Beli (Rp)</label><input id="pfTotalBeli" readonly value="${c.totalBeli?fmtNum(c.totalBeli):""}"></div>
        <div class="field"><label>Harga Support</label><input id="pfSupport" type="number" value="${f.support||""}"></div>
        <div class="field"><label>Harga Resistance</label><input id="pfResistance" type="number" value="${f.resistance||""}"></div>
        <div class="field"><label>Fibo 61.8%</label><input id="pfFib618" type="number" value="${f.fib618||""}"></div>
        <div class="field"><label>Target TP</label><input id="pfTargetTP" type="number" value="${f.targetTP||""}"></div>
        <div class="field"><label>Cut Loss</label><input id="pfCutLoss" type="number" value="${f.cutLoss||""}"></div>
        <div class="field"><label>Tanggal Jual</label><input id="pfTglJual" type="date" value="${f.tglJual||""}"></div>
        <div class="field"><label>Harga Jual</label><input id="pfHargaJual" type="number" value="${f.hargaJual||""}"></div>
        <div class="field"><label>Jumlah Lot Jual</label><input id="pfLotJual" type="number" value="${f.lotJual||""}"></div>
        <div class="field"><label>Fee Jual (%)</label><input id="pfFeeJual" type="number" step="0.01" value="${f.feeJualPct??0.25}"></div>
        <div class="field"><label>Net Jual (Rp)</label><input id="pfNetJual" readonly value="${c.netJual?fmtNum(c.netJual):""}"></div>
        <div class="field"><label>Jangka Waktu</label><input id="pfJangka" readonly value="${c.jangkaWaktu!==""?c.jangkaWaktu+" hari":""}"></div>
        <div class="field"><label>Prosentase P/L</label><input id="pfPersenPL" readonly value="${c.persenPL!==""?((c.persenPL>0?'+':'')+c.persenPL+'%'):""}"></div>
        <div class="field"><label>Nilai P/L (Rp)</label><input id="pfNilaiPL" readonly value="${c.nilaiPL!==""?fmtNum(c.nilaiPL):""}"></div>
        <div class="field"><label>Status</label><input id="pfStatus" readonly value="${c.status}" class="${c.status==='Win'?'status-win':c.status==='Loss'?'status-loss':'status-open'}" style="font-weight:700;"></div>
        <div class="field wide" style="grid-column:1/-1;"><label>Catatan</label><textarea id="pfCatatan" rows="2">${f.catatan||""}</textarea></div>
      </div>
      <div style="display:flex;gap:12px;margin-top:24px;">
        <button class="btn btn-primary" id="pfSubmitBtn" style="border-radius:8px; padding: 12px; font-size: 14px;">${editing?"Update Transaksi":"Simpan Transaksi"}</button>
        <button class="btn btn-outline" id="pfCancelBtn" style="border-radius:8px; padding: 12px; font-size: 14px;">Batal</button>
      </div>`;
}

function renderPortfolio(){
  const closed = state.portfolio.filter(p => p.nilaiPL !== "" && p.nilaiPL !== undefined && p.nilaiPL !== null);
  const totalInvest = state.portfolio.reduce((a,p)=>a+(+p.totalBeli||0),0);
  const totalPL = closed.reduce((a,p)=>a+(+p.nilaiPL||0),0);
  const winCount = closed.filter(p=>p.status==="Win").length;
  const winRate = closed.length ? Math.round((winCount/closed.length)*100) : 0;

  const topBar = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
      <button class="btn btn-primary" id="pfOpenAddBtn">+ Tambah Transaksi Portofolio</button>
      ${state.selectedPorto.size > 0 ? `<button class="btn btn-outline" style="color:#f87171;border-color:rgba(239,68,68,0.4);" id="pfBulkDeleteBtn">🗑 Hapus ${state.selectedPorto.size} Terpilih</button>` : ""}
    </div>`;

  const summary = `
    <div class="porto-summary">
      <div class="porto-stat"><div class="lbl">Total Transaksi</div><div class="val">${state.portfolio.length}</div></div>
      <div class="porto-stat"><div class="lbl">Total Modal Dibeli</div><div class="val">${fmtNum(totalInvest)}</div></div>
      <div class="porto-stat"><div class="lbl">Total P/L Realisasi</div><div class="val" style="color:${totalPL>=0?'var(--up)':'var(--down)'}">${totalPL>=0?'+':''}${fmtNum(totalPL)}</div></div>
      <div class="porto-stat"><div class="lbl">Win Rate</div><div class="val">${winRate}% <span style="font-size:12px;color:var(--muted); font-weight:500;">(${winCount}/${closed.length})</span></div></div>
    </div>`;

  if(state.portfolio.length === 0){
    return topBar + summary + `<div class="empty-box">Belum ada transaksi portofolio. Klik "+ Tambah Transaksi Portofolio" untuk mulai mencatat.</div>`;
  }

  const allChecked = state.portfolio.length > 0 && state.portfolio.every(p => state.selectedPorto.has(String(p.id)));

  const rows = state.portfolio.map(p => {
    const statusClass = p.status==="Win" ? "status-win" : p.status==="Loss" ? "status-loss" : "status-open";
    const plStr = p.persenPL!=="" && p.persenPL!=null ? (p.persenPL>0?'+':'')+p.persenPL+'%' : "-";
    return `<tr>
      <td><input type="checkbox" class="custom-checkbox chk-porto-row" data-check-porto="${p.id}" ${state.selectedPorto.has(String(p.id))?'checked':''}></td>
      <td class="ticker-cell"><button class="ticker-link" data-detail="${p.ticker}" title="Lihat detail ${p.ticker}">${p.ticker}</button></td>
      <td class="mono">${p.tglBeli||"-"}</td>
      <td class="mono">${fmtNum(p.hargaBeli)}</td>
      <td class="mono">${p.lotBeli}</td>
      <td class="mono">${fmtNum(p.totalBeli)}</td>
      <td class="mono">${p.tglJual||"-"}</td>
      <td class="mono">${p.hargaJual?fmtNum(p.hargaJual):"-"}</td>
      <td class="mono">${fmtNum(p.netJual)||"-"}</td>
      <td class="mono">${p.jangkaWaktu!==""&&p.jangkaWaktu!=null?p.jangkaWaktu+" hari":"-"}</td>
      <td class="mono" style="color:var(--${p.nilaiPL>0?'up':p.nilaiPL<0?'down':'muted'});font-weight:700;">${plStr}</td>
      <td class="mono">${p.nilaiPL!==""&&p.nilaiPL!=null?fmtNum(p.nilaiPL):"-"}</td>
      <td class="${statusClass}" style="font-weight:700;">${p.status}</td>
      <td style="white-space:normal;max-width:200px;font-size:12px;color:var(--muted);">${p.catatan||"-"}</td>
      <td><button class="link-btn" data-edit-porto="${p.id}">Edit</button></td>
      <td><button class="link-btn" style="color:#f87171;" data-del-porto="${p.id}">Hapus</button></td>
    </tr>`;
  }).join("");

  const table = `
    <div class="table-wrap">
      <table class="mono">
        <thead><tr>
          <th style="width:30px;"><input type="checkbox" id="chkSelectAllPorto" class="custom-checkbox" title="Pilih Semua" ${allChecked ? 'checked' : ''}></th>
          <th>Ticker</th><th>Tgl Beli</th><th>Hrg Beli</th><th>Lot Beli</th><th>Total Beli</th>
          <th>Tgl Jual</th><th>Hrg Jual</th><th>Net Jual</th><th>Jangka</th><th>%P/L</th><th>Nilai P/L</th>
          <th>Status</th><th>Catatan</th><th></th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  return topBar + summary + table;
}

function tvSymbol(ticker){ return `IDX:${ticker}`; }
function tvEmbedUrl(ticker){
  const sym = encodeURIComponent(tvSymbol(ticker));
  return `https://s.tradingview.com/widgetembed/?symbol=${sym}&interval=D&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=1e293b&studies=%5B%5D&theme=dark&style=1&timezone=Asia%2FJakarta&locale=id&withdateranges=1&hideideas=1`;
}
function tvChartPageUrl(ticker){ return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol(ticker))}`; }
function stockbitUrl(ticker){ return `https://stockbit.com/symbol/${encodeURIComponent(ticker)}`; }

function renderTickerPicker(){
  const list = enriched();
  const q = (state.chartSearch||"").trim().toUpperCase();
  const tickerOptions = list.map(s=>`<option value="${s.ticker}">`).join("");
  let candidates, hint;
  if(q){
    candidates = list.filter(s=>s.ticker.includes(q)).slice(0,24);
    hint = candidates.length===0
      ? `<div class="hint-text" style="color:var(--muted); font-size:12px;">Tidak ada ticker yang cocok dengan "${state.chartSearch}".</div>`
      : `<div class="hint-text" style="color:var(--teal); font-size:12px;">Menampilkan ${candidates.length} hasil pencarian untuk "${state.chartSearch}".</div>`;
  } else if(state.watchlist.size>0){
    candidates = list.filter(s=>state.watchlist.has(s.ticker));
    hint = `<div class="hint-text" style="color:var(--gold); font-size:12px;">Menampilkan ticker dari Watchlist ⭐. Ketik di kotak pencarian untuk mencari emiten lain.</div>`;
  } else {
    candidates = [];
    hint = `<div class="hint-text" style="color:var(--muted); font-size:12px;">Ketik kode ticker (mis. BBCA) di kotak pencarian di atas untuk menampilkan chart.</div>`;
  }
  const chips = candidates.map(s=>`<button class="chip ${state.selectedTicker===s.ticker?'active':''}" data-chart="${s.ticker}">${s.ticker}</button>`).join("");
  return `
    <div class="field" style="margin-bottom:16px;max-width:300px;">
      <label>Cari &amp; Pilih Ticker</label>
      <div class="search-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="chartSearchInput" value="${state.chartSearch||""}" placeholder="Ketik BBCA..." list="chartTickerList" style="width:240px;">
      </div>
      <datalist id="chartTickerList">${tickerOptions}</datalist>
    </div>
    <div class="ticker-chips">${chips}</div>
    ${hint}`;
}

function renderChart(){
  const picker = renderTickerPicker();
  if(!state.selectedTicker){
    return `${picker}<div class="empty-box" style="margin-top: 24px;">Cari &amp; pilih ticker di atas untuk menampilkan grafik.</div>`;
  }
  const t = state.selectedTicker;
  const chartToolbar = `
    <div class="chart-toolbar" style="margin-top: 24px;">
      <span style="color:var(--muted);font-size:13px; font-weight:500;">Chart live <b class="mono" style="color:var(--text); font-size:15px;">${t}</b> via TradingView (IDX:${t})</span>
      <div class="chart-external-links">
        <a class="btn btn-outline btn-tradingview" href="${tvChartPageUrl(t)}" target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          TradingView
        </a>
        <a class="btn btn-outline btn-stockbit" href="${stockbitUrl(t)}" target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Stockbit
        </a>
      </div>
    </div>`;
  const tvBox = `<div class="tv-chart-box"><iframe src="${tvEmbedUrl(t)}" title="TradingView ${t}" allowtransparency="true" scrolling="no"></iframe></div>`;

  const legend = `
    <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-bottom:12px; font-weight:500;">
      <span><span style="display:inline-block;width:12px;height:3px;border-radius:2px;background:var(--gold);vertical-align:middle;margin-right:6px;"></span>Harga Close</span>
      <span><span style="display:inline-block;width:12px;height:3px;border-radius:2px;background:var(--down);vertical-align:middle;margin-right:6px;"></span>Support</span>
      <span><span style="display:inline-block;width:12px;height:3px;border-radius:2px;background:var(--up);vertical-align:middle;margin-right:6px;"></span>Resisten</span>
      <span><span style="display:inline-block;width:12px;height:3px;border-radius:2px;background:var(--teal);vertical-align:middle;margin-right:6px;"></span>EMA21 H/L</span>
      <span><span style="display:inline-block;width:12px;height:3px;border-radius:2px;background:#94a3b8;vertical-align:middle;margin-right:6px;border-top:2px dashed #94a3b8;"></span>Fibonacci</span>
    </div>`;

  return `${picker}
    ${chartToolbar}
    ${tvBox}
    <div class="chart-section-title">Level Teknikal Internal (dari data Screener)</div>
    ${legend}
    <div class="chart-box"><svg id="chartSvg" width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="none"></svg></div>`;
}

function drawChartSVG(){
  const svg = document.getElementById("chartSvg");
  if(!svg || !state.chartData.length) return;
  const data = state.chartData;
  const closes = data.map(d=>d.close);
  const lv = state.selectedLevels;

  const levelVals = lv ? [lv.support, lv.resistance, lv.ema21H, lv.ema21L, lv.fib?.f382, lv.fib?.f50, lv.fib?.f618].filter(v=>v!=null) : [];
  const allVals = closes.concat(levelVals);
  const min = Math.min(...allVals), max = Math.max(...allVals);
  const pad = (max-min)*0.08 || 1;
  const yMin = min-pad, yMax = max+pad;
  const W=800, H=300, L=50, R=54, T=10, B=24;
  const xStep = (W-L-R)/(data.length-1 || 1);
  const yScale = v => T + (H-T-B) - ((v-yMin)/(yMax-yMin))*(H-T-B);
  let path = data.map((d,i)=> `${i===0?"M":"L"}${(L+i*xStep).toFixed(1)},${yScale(d.close).toFixed(1)}`).join(" ");

  let gridLines = "";
  for(let i=0;i<=4;i++){
    const y = T + (i/4)*(H-T-B);
    const val = yMax - (i/4)*(yMax-yMin);
    gridLines += `<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4,4"/>`;
    gridLines += `<text x="4" y="${y+3}" fill="var(--muted)" font-size="10" font-family="JetBrains Mono, monospace">${fmtNum(Math.round(val))}</text>`;
  }

  let levelLines = "";
  const drawLevel = (val, color, label, dashed) => {
    if(val==null || isNaN(val)) return;
    const y = yScale(val);
    levelLines += `<line x1="${L}" y1="${y.toFixed(1)}" x2="${W-R}" y2="${y.toFixed(1)}" stroke="${color}" stroke-width="1.5" ${dashed?'stroke-dasharray="5,4"':''} opacity="0.8"/>`;
    levelLines += `<text x="${W-R+6}" y="${(y+3).toFixed(1)}" fill="${color}" font-size="10" font-family="JetBrains Mono, monospace" font-weight="600">${label}</text>`;
  };
  if(lv){
    drawLevel(lv.support, "var(--down)", fmtNum(Math.round(lv.support)), false);
    drawLevel(lv.resistance, "var(--up)", fmtNum(Math.round(lv.resistance)), false);
    drawLevel(lv.ema21H, "var(--teal)", "E21H", true);
    drawLevel(lv.ema21L, "var(--teal)", "E21L", true);
    if(lv.fib){
      drawLevel(lv.fib.f382, "#94a3b8", "Fib38", true);
      drawLevel(lv.fib.f50, "#94a3b8", "Fib50", true);
      drawLevel(lv.fib.f618, "#94a3b8", "Fib61", true);
    }
  }

  svg.innerHTML = `${gridLines}${levelLines}<path d="${path}" fill="none" stroke="var(--gold)" stroke-width="2.5" style="filter: drop-shadow(0 4px 6px rgba(245,158,11,0.2));"/>`;
}

function renderAbout(){
  const row=(title,tone,desc)=>`<div class="about-row">${pillHtml(title,tone)}<p>${desc}</p></div>`;
  return `
    ${row("Teknikal","teal","Diambil dari Yahoo Finance (data publik, gratis) lewat Google Apps Script Anda sendiri. Indikator: EMA21 High/Low, RSI7 vs RSI21, MACD histogram, Volume MA20 — persis logika di script screener.txt Anda.")}
    ${row("Screener DSI","gold","Terdapat tombol preset yang akan menyaring data secara otomatis berdasarkan kondisi DSI (Eri Ginanjar, RSI Cross, Golden Cross, Super Uptrend, Volatility Breakout, Pullback Uptrend).")}
    ${row("Penyimpanan Koneksi","up","Semua API Key Supabase dan URL Anda sekarang disimpan aman di dalam Local Storage browser perangkat ini. Tidak tertanam di dalam HTML sehingga aman jika di-hosting publik.")}
    ${row("Fundamental","teal","PER, PBV, ROE, dan Dividend Yield dari modul quoteSummary Yahoo Finance.")}
    ${row("Bandarmologi","down","PENTING: ini BUKAN data transaksi broker asli. Yang ditampilkan di sini hanyalah PROXY heuristik: rasio volume hari ini terhadap volume rata-rata 20 hari, dikombinasikan arah harga.")}
    ${row("Watchlist","muted","Disimpan otomatis di penyimpanan browser Anda (localStorage) di perangkat ini. Jika Web App terhubung, tanda bintang juga akan disinkronkan ke Supabase.")}
  `;
}

function attachContentEvents(){
  const advToggleBtn = document.getElementById("advToggleBtn");
  if(advToggleBtn) advToggleBtn.onclick = () => { state.showAdvancedFilters = !state.showAdvancedFilters; render(); };

  const colPickerBtn = document.getElementById("colPickerBtn");
  if(colPickerBtn) colPickerBtn.onclick = (e) => { e.stopPropagation(); state.colPickerOpen = !state.colPickerOpen; render(); };

  document.querySelectorAll("[data-col-preset]").forEach(btn => {
    btn.onclick = (e) => { e.stopPropagation(); setColumnPreset(btn.dataset.colPreset); };
  });

  document.querySelectorAll("[data-col-toggle]").forEach(chk => {
    chk.onclick = (e) => e.stopPropagation();
    chk.onchange = (e) => { e.stopPropagation(); toggleColumn(chk.dataset.colToggle); };
  });

  if(state.colPickerOpen){
    const panel = document.querySelector(".col-picker-panel");
    if(panel) panel.onclick = (e) => e.stopPropagation();
    // Klik di luar panel menutupnya — dipasang sekali lewat setTimeout supaya
    // tidak langsung menutup panel yang baru saja dibuka oleh klik yang sama.
    setTimeout(() => {
      document.addEventListener("click", function closeColPicker(){
        state.colPickerOpen = false; render();
        document.removeEventListener("click", closeColPicker);
      }, { once:true });
    }, 0);
  }

  const s = document.getElementById("searchInput");
  if(s) s.oninput = (e)=>{ state.search=e.target.value; state.page=1; render(); document.getElementById("searchInput").focus(); document.getElementById("searchInput").selectionStart = document.getElementById("searchInput").value.length; };

  const chartSearchInput = document.getElementById("chartSearchInput");
  if(chartSearchInput){
    chartSearchInput.oninput = (e) => {
      state.chartSearch = e.target.value;
      render();
      const el = document.getElementById("chartSearchInput");
      if(el){ el.focus(); el.selectionStart = el.selectionEnd = el.value.length; }
    };
    chartSearchInput.addEventListener("keydown", (e) => {
      if(e.key === "Enter"){
        const val = (e.target.value||"").trim().toUpperCase();
        const exists = state.stocks.some(st => st.ticker === val);
        if(exists) loadChart(val);
        else if(val) alert(`Ticker "${val}" tidak ditemukan di data screener.`);
      }
    });
  }

  document.querySelectorAll('.select-item input[type="checkbox"]').forEach(chk => {
    chk.onchange = (e) => {
      const key = e.target.dataset.filter;
      const val = e.target.value;
      if (e.target.checked) {
        if (!state.filters[key].includes(val)) state.filters[key].push(val);
      } else {
        state.filters[key] = state.filters[key].filter(v => v !== val);
      }
      state.page = 1;
      render(); 
    };
  });

  document.querySelectorAll(".range-filter-input").forEach(inp => {
    inp.onchange = (e) => {
      const key = e.target.dataset.range;
      const bound = e.target.dataset.bound;
      state.rangeFilters[key][bound] = e.target.value;
      state.page = 1;
      render();
    };
  });

  const pageSizeSelect = document.getElementById("pageSizeSelect");
  if(pageSizeSelect) pageSizeSelect.onchange = (e) => {
    const v = e.target.value;
    state.limit = v === "all" ? "all" : parseInt(v, 10);
    state.page = 1;
    render();
  };

  const resetFiltersBtn = document.getElementById("resetFiltersBtn");
  if(resetFiltersBtn) resetFiltersBtn.onclick = () => {
    state.search = "";
    state.activePreset = null;
    Object.keys(state.filters).forEach(k => state.filters[k] = []);
    Object.keys(state.rangeFilters).forEach(k => state.rangeFilters[k] = {min:"", max:""});
    state.page = 1;
    render();
  };

  const chkAll = document.getElementById("chkSelectAll");
  if(chkAll) {
    chkAll.onchange = (e) => {
      const filtered = getFiltered();
      if(e.target.checked) {
        filtered.forEach(s => state.selectedForBacktest.add(s.ticker));
      } else {
        filtered.forEach(s => state.selectedForBacktest.delete(s.ticker));
      }
      render(); 
    };
  }

  document.querySelectorAll(".chk-row").forEach(chk => {
    chk.onchange = (e) => {
      const ticker = e.target.dataset.check;
      if(e.target.checked) state.selectedForBacktest.add(ticker);
      else state.selectedForBacktest.delete(ticker);
      
      const allFiltered = getFiltered();
      const allChecked = allFiltered.length > 0 && allFiltered.every(s => state.selectedForBacktest.has(s.ticker));
      const mainChk = document.getElementById("chkSelectAll");
      if(mainChk) mainChk.checked = allChecked;
    };
  });
  
  const saveBt = document.getElementById("saveBacktestBtn");
  if(saveBt) saveBt.onclick = saveToBacktest;
  
  document.querySelectorAll("[data-del-bt]").forEach(btn => {
    btn.onclick = () => deleteBacktestSession(parseInt(btn.dataset.delBt));
  });

  document.querySelectorAll("[data-export-bt]").forEach(btn => {
    btn.onclick = () => exportBacktestToExcel(parseInt(btn.dataset.exportBt));
  });

  const exportAllBtBtn = document.getElementById("exportAllBtBtn");
  if(exportAllBtBtn) exportAllBtBtn.onclick = exportAllBacktestToExcel;
  
  document.querySelectorAll("[data-detail]").forEach(b=> b.onclick=()=>openDetail(b.dataset.detail));
  document.querySelectorAll("[data-fav]").forEach(b=> b.onclick=()=>toggleFav(b.dataset.fav));
  document.querySelectorAll("[data-chart]").forEach(b=> b.onclick=()=>loadChart(b.dataset.chart));
  document.querySelectorAll("[data-expand]").forEach(b=> b.onclick=()=>{
    const t = b.dataset.expand;
    state.expanded.has(t) ? state.expanded.delete(t) : state.expanded.add(t);
    render();
  });

  document.querySelectorAll("[data-del-bt-item]").forEach(btn=>{
    btn.onclick = ()=>{ const [sid,tk] = btn.dataset.delBtItem.split("|"); deleteBacktestItem(sid,tk); };
  });
  const btManualAddBtn = document.getElementById("btManualAddBtn");
  if(btManualAddBtn) btManualAddBtn.onclick = ()=>{
    addManualBacktest(
      document.getElementById("btManualSession").value,
      document.getElementById("btManualTicker").value,
      document.getElementById("btManualPrice").value,
      document.getElementById("btManualNote").value
    );
  };

  const pfOpenAddBtn = document.getElementById("pfOpenAddBtn");
  if(pfOpenAddBtn) pfOpenAddBtn.onclick = ()=> openPortoModal(null);
  document.querySelectorAll("[data-edit-porto]").forEach(btn=>{
    btn.onclick = ()=> editPortoRecord(btn.dataset.editPorto);
  });
  document.querySelectorAll("[data-del-porto]").forEach(btn=>{
    btn.onclick = ()=> deletePortoRecord(btn.dataset.delPorto);
  });
  const pfBulkDeleteBtn = document.getElementById("pfBulkDeleteBtn");
  if(pfBulkDeleteBtn) pfBulkDeleteBtn.onclick = bulkDeletePorto;
  const chkSelectAllPorto = document.getElementById("chkSelectAllPorto");
  if(chkSelectAllPorto) chkSelectAllPorto.onchange = (e)=>{
    if(e.target.checked) state.portfolio.forEach(p=> state.selectedPorto.add(String(p.id)));
    else state.selectedPorto.clear();
    render();
  };
  document.querySelectorAll(".chk-porto-row").forEach(chk=>{
    chk.onchange = (e)=>{
      const id = String(e.target.dataset.checkPorto);
      e.target.checked ? state.selectedPorto.add(id) : state.selectedPorto.delete(id);
      render();
    };
  });
  
  const btnPrev = document.getElementById("prevPage");
  const btnNext = document.getElementById("nextPage");
  if (btnPrev) btnPrev.onclick = () => { if(state.page > 1) { state.page--; render(); } };
  if (btnNext) btnNext.onclick = () => { state.page++; render(); };

  document.querySelectorAll(".sortable").forEach(th => {
    th.onclick = () => {
      const col = th.dataset.sort;
      if (state.sort.col === col) {
        state.sort.asc = !state.sort.asc;
      } else {
        state.sort.col = col;
        state.sort.asc = true;
      }
      state.page = 1;
      render();
    };
  });
}

document.addEventListener("click", (e) => {
  if (!e.target.closest('.select-dropdown') && !e.target.closest('.select-btn')) {
    if (state.openDropdown) {
      state.openDropdown = null;
      render();
    }
  }
});

document.getElementById("tabs").addEventListener("click", (e)=>{
  const btn = e.target.closest(".tab-btn");
  if(!btn) return;
  state.tab = btn.dataset.tab;
  render();
});
document.getElementById("refreshBtn").onclick = ()=> loadLive();
document.getElementById("portoModalClose").onclick = ()=> resetPortoForm();
document.getElementById("portoModalOverlay").onclick = (e)=>{ if(e.target.id==="portoModalOverlay") resetPortoForm(); };
document.getElementById("detailModalClose").onclick = ()=> closeDetail();
document.getElementById("detailModalOverlay").onclick = (e)=>{ if(e.target.id==="detailModalOverlay") closeDetail(); };

loadSettings();
loadLive();
