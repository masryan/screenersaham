// ==========================================
// VARIABEL KONEKSI LOKAL (DINAMIS)
//
// Kredensial default sekarang datang dari config.js (window.APP_CONFIG),
// bukan ditulis langsung di sini. INI SENGAJA: file ini boleh dibaca
// publik (view-source), jadi hanya anon key yang boleh muncul di sini â€”
// tidak pernah service_role. Isolasi lewat RLS di database, bukan lewat
// menyembunyikan kunci di kode client (itu tidak pernah benar-benar
// tersembunyi).
// ==========================================
const DEFAULT_SUPABASE_URL = (window.APP_CONFIG && window.APP_CONFIG.SUPABASE_URL) || "";
const DEFAULT_SUPABASE_KEY = (window.APP_CONFIG && window.APP_CONFIG.SUPABASE_ANON_KEY) || "";

let SUPABASE_URL = localStorage.getItem("ihsg_supa_url") || DEFAULT_SUPABASE_URL;
let SUPABASE_KEY = localStorage.getItem("ihsg_supa_key") || DEFAULT_SUPABASE_KEY;

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
function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}

function getSupaHeaders() {
  return {
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json"
  };
}

// ==========================================
// supaFetch â€” pengganti fetch() polos untuk semua request TULIS
// (POST/PATCH/DELETE) ke Supabase.
//
// KENAPA INI PERLU: fetch() browser TIDAK melempar error untuk respons
// HTTP 4xx/5xx â€” hanya melempar kalau koneksi jaringan benar-benar putus.
// Kalau Supabase menolak insert (RLS, kolom salah, atau "Prefer:
// resolution=merge-duplicates" tanpa unique constraint yang cocok di
// tabel), balasannya tetap berupa response yang valid (cuma dengan
// status 400/401/409/dst + body {message,...}). Kode lama membungkus
// fetch dengan try{...}catch(e){} kosong dan TIDAK PERNAH mengecek
// res.ok â€” jadi kalau Supabase menolak, tidak ada error yang pernah
// muncul: data kelihatan "tersimpan" (karena localStorage sudah lebih
// dulu diupdate) padahal sebenarnya gagal sinkron ke server.
//
// supaFetch melempar Error berisi pesan asli dari Supabase kalau
// res.ok === false, supaya pemanggil bisa menampilkannya ke user lewat
// showError()/alert() alih-alih diam-diam gagal.
// ==========================================
// ==========================================
// LIVE DATA STOCKBIT (tidak resmi, pakai token extension milik user)
//
// PENTING: exodus.stockbit.com/stream/v3/symbol/{ticker} adalah endpoint
// yang diamati dari traffic stockbit.com sendiri (bukan API publik
// terdokumentasi resmi) â€” jadi bisa berubah/rusak kapan saja, dan skema
// response-nya belum 100% terverifikasi. mapStockbitQuote() di bawah
// mencoba beberapa nama field yang umum (last/close/price, bid/offer,
// volume) secara defensif; kalau tidak cocok, JSON mentah tetap
// ditampilkan apa adanya di UI (lihat renderStockbitPanel) supaya tidak
// ada data yang salah tafsir atau hilang diam-diam.
//
// CORS: karena dipanggil langsung dari browser di origin lain (bukan
// stockbit.com), permintaan LANGSUNG ke exodus.stockbit.com kemungkinan
// besar diblokir browser. Kalau state.stockbitProxyUrl diisi (Supabase
// Edge Function dsb.), request dikirim ke situ sebagai POST {url, token}
// dan proxy itu yang meneruskan ke Stockbit dari sisi server (tidak kena
// CORS) â€” lihat contoh proxy terpisah yang disediakan.
// ==========================================
// ==========================================
// stockbitRawRequest â€” satu titik request HTTP ke Stockbit (langsung atau
// lewat proxy), dipakai bersama oleh stockbitFetch, stockbitFetchMarketDetector,
// dan stockbitFetchHistorical. Sebelumnya ketiga fungsi ini menduplikasi logika
// fetch yang sama persis (termasuk tidak ada retry sama sekali untuk 429).
//
// RETRY 429: kalau Stockbit membalas 429 (rate limit) â€” yang sangat mungkin
// terjadi di tengah bulk fetch banyak ticker/hari â€” tunggu sesuai header
// "Retry-After" (kalau proxy/Stockbit mengirimnya) atau exponential backoff
// (1s, 2s, 4s) lalu coba lagi, maksimal STOCKBIT_MAX_RETRIES kali. Status
// HTTP lain (401/403/5xx/dst) TIDAK diretry â€” itu bukan soal rate limit
// sementara, jadi mencoba ulang cuma buang waktu tanpa hasil.
//
// STATUS "TERAKHIR BERHASIL": tiap kali request ini sukses (res.ok), waktunya
// dicatat ke state.stockbitLastSuccessAt supaya UI (lihat
// stockbitLiveDataStatus() & updateStockbitLastSuccessStatusUI()) bisa
// menunjukkan dengan jelas kapan data live terakhir kali benar-benar
// berhasil ditarik, tanpa user perlu buka console untuk tahu data sedang basi.
// ==========================================
const STOCKBIT_MAX_RETRIES = 3;

// Bersihkan whitespace nyasar & prefix "Bearer " yang mungkin kebawa ikut
// tersimpan (baik dari copy-paste manual di Pengaturan, dari tabel Supabase,
// maupun dari extension) â€” soalnya getSupaHeaders()/stockbitRawRequest() SUDAH
// menambahkan "Bearer " sendiri di depan token saat mengirim request. Kalau
// token yang tersimpan sudah mengandung "Bearer " juga, hasilnya jadi
// "Bearer Bearer eyJ..." (atau ada \n/spasi di ujung) â€” dan itu 401 instan,
// terus-menerus, TIDAK ADA HUBUNGANNYA dengan token itu sendiri masih
// berlaku/tidak.
function sanitizeStockbitToken(raw){
  let t = String(raw || "").trim();
  if(/^bearer\s+/i.test(t)) t = t.replace(/^bearer\s+/i, "").trim();
  return t;
}

async function stockbitRawRequest(url, extraHeaders = {}, attempt = 0){
  try{
    let res;
    if(state.stockbitProxyUrl){
      res = await fetch(state.stockbitProxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, token: state.stockbitToken })
      });
    } else {
      res = await fetch(url, { headers: { "Authorization": `Bearer ${state.stockbitToken}`, ...extraHeaders } });
    }
    if(res.status === 429 && attempt < STOCKBIT_MAX_RETRIES){
      const retryAfterHeader = Number(res.headers.get("Retry-After"));
      const waitMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader * 1000
        : 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
      await new Promise(r => setTimeout(r, waitMs));
      return stockbitRawRequest(url, extraHeaders, attempt + 1);
    }
    const text = await res.text();
    let json = null;
    try{ json = JSON.parse(text); }catch(e){ /* bukan JSON, biarkan null */ }
    if(!res.ok){
      const retryNote = (res.status === 429 && attempt >= STOCKBIT_MAX_RETRIES)
        ? ` (sudah dicoba ulang ${STOCKBIT_MAX_RETRIES}x dengan backoff, tetap kena rate limit)` : "";
      return { error: `HTTP ${res.status}${json && json.message ? " â€” " + json.message : ""}${retryNote}`, raw: json ?? text };
    }
    state.stockbitLastSuccessAt = Date.now();
    return { raw: json ?? text };
  }catch(e){
    const hint = state.stockbitProxyUrl ? "" : " â€” kemungkinan diblokir CORS oleh browser karena dipanggil langsung tanpa Proxy URL. Coba isi \"Proxy URL\" di Pengaturan.";
    return { error: e.message + hint };
  }
}

async function stockbitFetch(endpointTemplate, ticker){
  if(!state.stockbitToken) return { error: 'Token Stockbit belum diisi. Buka "âš™ï¸ Pengaturan" â†’ Live Data Stockbit.' };
  if(!endpointTemplate) return { error: "Endpoint belum diisi di Pengaturan." };
  const url = endpointTemplate.replace("{ticker}", encodeURIComponent(ticker));
  return stockbitRawRequest(url);
}
// ==========================================================
// BROKER SUMMARY OTOMATIS DARI STOCKBIT (top 5 buy/sell per hari bursa)
//
// BEDA dari fitur live quote di atas: ini bisa memicu BANYAK request
// sekaligus (N ticker x M hari), jadi SENGAJA hanya jalan untuk ticker
// yang dicentang manual oleh user (state.selectedForBacktest) â€” tidak
// ada opsi "semua yang lolos filter" supaya tidak sengaja membombardir
// akun Stockbit sendiri dengan ratusan request.
//
// SKEMA RESPONS BELUM DIKETAHUI: endpoint broker summary Stockbit belum
// diverifikasi (field "Endpoint Broker Summary" di Pengaturan memang
// masih kosong by default, diisi sendiri oleh user dari tab Network).
// mapStockbitBrokerSummary() di bawah ini mencoba beberapa nama field
// yang umum secara defensif. Kalau skemanya tidak cocok, request itu
// ditandai gagal dengan JSON mentah tetap disimpan di
// state.stockbitBrokerBulkResults supaya user bisa lihat & laporkan
// balik nama field yang benar (baru mapping-nya disesuaikan).
// ==========================================================
// Kalender resmi Libur Bursa BEI 2026, dari pengumuman IDX No. Peng-00171/BEI.POP/09-2025
// (idx.co.id/id/berita/jadwal-libur-bursa) + berita yang mengutipnya. 21 tanggal di luar
// weekend, sudah dicocokkan dengan angka resmi "21 hari libur bursa 2026" yang diberitakan.
// PENTING: kalender ini WAJIB diupdate tiap tahun (IDX biasanya umumkan kalender tahun
// berikutnya sekitar September) â€” kalau BURSA_HOLIDAYS tidak ada entri untuk suatu tahun,
// tradingDaysBack() otomatis fallback ke exclude-weekend-saja untuk tahun itu (lihat di bawah).
const BURSA_HOLIDAYS = new Set([
  // 2026
  "2026-01-01", // Tahun Baru Masehi
  "2026-01-16", // Isra Mikraj Nabi Muhammad SAW
  "2026-02-16", // Cuti Bersama Tahun Baru Imlek 2577 Kongzili
  "2026-02-17", // Tahun Baru Imlek 2577 Kongzili
  "2026-03-18", // Cuti Bersama Hari Suci Nyepi
  "2026-03-19", // Hari Suci Nyepi Tahun Baru Saka 1948
  "2026-03-20", // Cuti Bersama Idul Fitri 1447 H
  "2026-03-23", // Cuti Bersama Idul Fitri 1447 H
  "2026-03-24", // Cuti Bersama Idul Fitri 1447 H
  "2026-04-03", // Wafat Yesus Kristus (Jumat Agung)
  "2026-05-01", // Hari Buruh Internasional
  "2026-05-14", // Kenaikan Yesus Kristus
  "2026-05-27", // Idul Adha 1447 H
  "2026-05-28", // Cuti Bersama Idul Adha 1447 H
  "2026-06-01", // Hari Lahir Pancasila
  "2026-06-16", // Tahun Baru Islam 1448 H (1 Muharram)
  "2026-08-17", // Hari Kemerdekaan RI ke-81
  "2026-08-25", // Maulid Nabi Muhammad SAW
  "2026-12-24", // Cuti Bersama Hari Raya Natal
  "2026-12-25", // Hari Raya Natal
  "2026-12-31", // Libur Bursa (penutup tahun)
]);

// Selalu pakai komponen tanggal LOKAL (getFullYear/getMonth/getDate), JANGAN
// toISOString() untuk merepresentasikan "tanggal kalender" â€” toISOString()
// mengonversi ke UTC, dan karena WIB = UTC+7, tengah malam lokal (mis. dari
// input <input type="date">, yang selalu diparse sebagai "T00:00:00" lokal)
// mundur jadi jam 17:00 UTC HARI SEBELUMNYA, sehingga tanggalnya salah (bug
// ini yang bikin rentang "28/08â€“29/08" kepetakan jadi 27/08). Semua tempat
// yang butuh "tanggal hari ini"/"tanggal dari Date object" WAJIB pakai
// helper ini, bukan .toISOString().slice(0,10).
function toLocalISODate(d){
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayLocalISO(){ return toLocalISODate(new Date()); }

function tradingDaysBack(n, fromDate = new Date()){
  // Hari bursa = Senin-Jumat DIKURANGI tanggal di BURSA_HOLIDAYS (kalau tahunnya terdaftar).
  // Untuk tahun yang belum ada di kalender di atas, otomatis fallback ke exclude-weekend-saja
  // (perilaku lama) â€” lebih baik sedikit kurang akurat daripada berhenti total.
  const days = [];
  let d = new Date(fromDate);
  while(days.length < n){
    d.setDate(d.getDate() - 1);
    const dow = d.getDay();
    const iso = toLocalISODate(d);
    if(dow !== 0 && dow !== 6 && !BURSA_HOLIDAYS.has(iso)) days.push(iso);
  }
  return days.reverse(); // urut lama -> baru
}

// Sama seperti tradingDaysBack, tapi rentangnya ditentukan lewat tanggal Dariâ€“Sampai
// eksplisit (bukan "mundur N hari dari sekarang") â€” dipakai untuk Periode Tarik Otomatis
// yang sekarang bisa dipilih bebas lewat 2 input tanggal di UI.
function tradingDaysInRange(fromDateStr, toDateStr){
  const days = [];
  if(!fromDateStr || !toDateStr) return days;
  let d = new Date(fromDateStr + "T00:00:00");
  const end = new Date(toDateStr + "T00:00:00");
  if(d > end) return days; // Dari lebih baru dari Sampai â€” dianggap tidak valid, biar kelihatan kosong
  while(d <= end){
    const dow = d.getDay();
    const iso = toLocalISODate(d);
    if(dow !== 0 && dow !== 6 && !BURSA_HOLIDAYS.has(iso)) days.push(iso);
    d.setDate(d.getDate() + 1);
  }
  return days; // sudah urut lama -> baru
}

async function stockbitFetchMarketDetector(ticker, fromDate, toDate, days){
  if(!state.stockbitToken) return { error: 'Token Stockbit belum diisi. Buka "âš™ï¸ Pengaturan" â†’ Live Data Stockbit.' };
  if(!state.stockbitBrokerEndpoint) return { error: 'Endpoint Broker Summary belum diisi di Pengaturan.' };
  // Endpoint /marketdetectors mengembalikan baris CAMPUR banyak tanggal
  // sekaligus dalam satu response, dan "limit" di URL membatasi TOTAL baris
  // gabungan itu â€” bukan per hari. Kalau limit terlalu kecil untuk rentang
  // hari & keaktifan saham, tanggal-tanggal lama bisa kepotong (tidak ikut
  // ke-return sama sekali). Di sini limit dihitung otomatis dari jumlah
  // hari yang diminta (dengan margin), supaya tidak perlu diutak-atik
  // manual tiap kali "Periode" diubah. Kalau URL endpoint kamu (custom di
  // Pengaturan) masih pakai angka mati (mis. "limit=200"), ganti jadi
  // "limit={limit}" dulu supaya nilai otomatis ini kepakai.
  // "limit" dihitung otomatis dari jumlah hari yang diminta (dengan margin
  // 50 baris/hari, minimal 50) â€” supaya endpoint {from}-{to} yang custom di
  // Pengaturan tidak kepotong datanya. Lihat catatan panjang di atas.
  const limit = Math.max(50, days * 50);
  const url = state.stockbitBrokerEndpoint
    .replace("{ticker}", encodeURIComponent(ticker))
    .replace("{date}", fromDate)
    .replace("{from}", encodeURIComponent(fromDate))
    .replace("{to}", encodeURIComponent(toDate))
    .replace("{limit}", encodeURIComponent(limit));

  console.log("[BROKER_FIX_v3] URL:", url); // penanda debug sementara â€” hapus setelah beres

  return stockbitRawRequest(url);
}

// Endpoint /marketdetectors/{ticker} mengembalikan broker_summary.brokers_buy /
// .brokers_sell sebagai daftar baris CAMPUR banyak tanggal sekaligus (field
// netbs_date per baris, format YYYYMMDD) â€” bukan sudah dikelompokkan per hari.
// Fungsi ini mengelompokkan per tanggal lalu ambil top 5 net value per sisi
// (buy/sell) untuk tiap tanggal. Field asli (blot/bval untuk buy,
// slot/sval untuk sell) diverifikasi manual dari DevTools tanggal 25 Agu 2026 â€”
// kalau Stockbit ganti skema respons di masa depan, sesuaikan lagi di sini.
function parseStockbitMarketDetector(raw, fetchDate){
  if(!raw || typeof raw !== "object") return null;
  // Path asli: data.broker_summary.{brokers_buy,brokers_sell} â€” bukan data.buy/data.sell.
  const bs = raw?.data?.broker_summary || null;
  console.log("[BROKER_FIX_v3] parse", fetchDate, "bs found:", !!bs, "buy:", bs?.brokers_buy?.length, "sell:", bs?.brokers_sell?.length); // penanda debug sementara â€” hapus setelah beres
  if(!bs) return null;

  const buyRows = Array.isArray(bs.brokers_buy) ? bs.brokers_buy : [];
  const sellRows = Array.isArray(bs.brokers_sell) ? bs.brokers_sell : [];
  if(!buyRows.length && !sellRows.length) return null;

  const byDate = {}; 
  const ensure = (date) => (byDate[date] ||= { buy: [], sell: [] });
  // netbs_date per baris (format YYYYMMDD) dipakai kalau ada â€” response ini
  // bisa berisi campuran banyak tanggal sekaligus. Fallback ke fetchDate
  // kalau baris tidak punya tanggal sendiri (aman karena request sekarang
  // per 1 hari, lihat STOCKBIT_BROKER_CHUNK_DAYS).
  const rowDate = (r) => {
    const nd = r.netbs_date ?? r.date;
    if(nd != null){
      const s = String(nd);
      if(/^\d{8}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
      if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
    }
    return fetchDate;
  };

  buyRows.forEach(r => {
    ensure(rowDate(r)).buy.push({
      broker_code: String(r.netbs_broker_code || r.broker || r.broker_code || "").toUpperCase(),
      lot: Math.abs(Number(r.blot)) || null,
      value_idr: Math.abs(Number(r.bval)) || 0,
    });
  });
  
  sellRows.forEach(r => {
    ensure(rowDate(r)).sell.push({
      broker_code: String(r.netbs_broker_code || r.broker || r.broker_code || "").toUpperCase(),
      lot: Math.abs(Number(r.slot)) || null,
      value_idr: Math.abs(Number(r.sval)) || 0,
    });
  });

  Object.values(byDate).forEach(d => {
    d.buy.sort((a,b) => b.value_idr - a.value_idr);
    d.sell.sort((a,b) => b.value_idr - a.value_idr);
    d.buy = d.buy.slice(0,5).filter(r=>r.broker_code).map((r,i) => ({ ...r, rank: i+1 }));
    d.sell = d.sell.slice(0,5).filter(r=>r.broker_code).map((r,i) => ({ ...r, rank: i+1 }));
  });

  return byDate;
}

// ==========================================
// HISTORICAL DATA STOCKBIT (tabel Date/Close/Change/Value/Volume di tab
// "Historical Data" halaman detail saham â€” Daily/Weekly/Monthly).
// Endpoint belum diverifikasi (lihat catatan di STOCKBIT_DEFAULT_HISTORICAL_EP),
// jadi parseStockbitHistorical() di bawah mencoba banyak kemungkinan nama
// field secara defensif (mirip mapStockbitQuote) â€” kalau skema Stockbit
// ternyata beda, tinggal tambah alias nama field baru di pick(...) masing2
// kolom, tidak perlu ubah struktur lain.
// ==========================================
async function stockbitFetchHistorical(ticker, period, opts = {}){
  if(!state.stockbitToken) return { error: 'Token Stockbit belum diisi. Buka "âš™ï¸ Pengaturan" â†’ Live Data Stockbit.' };
  if(!state.stockbitHistoricalEndpoint) return { error: 'Endpoint Historical Data belum diisi di Pengaturan. Ambil dari DevTools â†’ Network saat membuka tab "Historical Data" di stockbit.com (lihat komentar STOCKBIT_DEFAULT_HISTORICAL_EP di app.js untuk caranya).' };
  // startDate/endDate: ISO YYYY-MM-DD. Default kalau tidak dikasih: 1 tahun
  // terakhir sampai hari ini (cukup luas untuk isi awal chart/backtest).
  const endDate = opts.endDate || todayLocalISO();
  const startDate = opts.startDate || toLocalISODate(new Date(new Date(endDate).setFullYear(new Date(endDate).getFullYear() - 1)));
  const limit = opts.limit || 300;
  const page = opts.page || 1;
  const url = state.stockbitHistoricalEndpoint
    .replace("{ticker}", encodeURIComponent(ticker))
    .replace("{period}", encodeURIComponent(stockbitHistoricalPeriodParam(period)))
    .replace("{start_date}", encodeURIComponent(startDate))
    .replace("{end_date}", encodeURIComponent(endDate))
    .replace("{limit}", encodeURIComponent(limit))
    .replace("{page}", encodeURIComponent(page));
  return stockbitRawRequest(url, { "x-platform": "web" });
}

// Menerima response mentah dan mencoba menormalkannya jadi daftar baris
// { date, close, change, changePct, value, volume }. Mengembalikan null
// kalau tidak ditemukan array baris sama sekali (supaya UI bisa menampilkan
// JSON mentah apa adanya alih-alih data yang salah tafsir/hilang diam-diam).
function parseStockbitHistorical(raw){
  if(!raw || typeof raw !== "object") return null;
  const container = raw.data || raw.result || raw;
  const list = Array.isArray(container) ? container
    : Array.isArray(container?.result) ? container.result   // bentuk asli: { data: { result: [...] } }
    : Array.isArray(container?.rows) ? container.rows
    : Array.isArray(container?.chartbit) ? container.chartbit
    : Array.isArray(container?.data) ? container.data
    : Array.isArray(container?.historical) ? container.historical
    : null;
  if(!list || !list.length) return null;

  const pick = (row, ...keys) => { for(const k of keys){ if(row && row[k]!=null && row[k]!=="") return row[k]; } return null; };
  // Normalisasi berbagai kemungkinan format tanggal Stockbit (epoch ms/detik,
  // "20260828", "28-08-2026", dll.) jadi ISO YYYY-MM-DD lokal, supaya bisa
  // dibandingkan langsung dengan hasil tradingDaysInRange() saat Tarik Otomatis
  // bulk. Kalau gagal diparse, dikembalikan apa adanya (masih tampil di tabel,
  // cuma tidak akan ikut cocok di filter rentang tanggal bulk).
  const normDate = (v) => {
    if(v == null) return null;
    if(typeof v === "number") return toLocalISODate(new Date(v > 2e10 ? v : v * 1000));
    const s = String(v).trim();
    if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
    if(/^\d{8}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
    const m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if(m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
    const parsed = new Date(s);
    return isNaN(parsed) ? s : toLocalISODate(parsed);
  };

  return list.map(row => ({
    date: normDate(pick(row, "date", "trade_date", "netbs_date", "period", "chart_date")),
    close: Number(pick(row, "close", "close_price", "last", "c")) || null,
    change: Number(pick(row, "change", "chg", "price_change")) || null,
    changePct: Number(pick(row, "change_percentage", "change_percent", "changePercent", "pct")) || null,
    value: Number(pick(row, "value", "value_idr", "val", "trade_value")) || null,
    volume: Number(pick(row, "volume", "vol", "trade_volume")) || null,
    // Field bonus yang ternyata sudah disediakan endpoint ini sekalian â€”
    // termasuk FOREIGN FLOW HARIAN per ticker (foreign_buy/foreign_sell/
    // net_foreign), jadi tidak perlu endpoint marketdetectors terpisah untuk
    // data asing (lihat diskusi "Data foreign bisa diambil dari stockbit?").
    open: Number(pick(row, "open")) || null,
    high: Number(pick(row, "high")) || null,
    low: Number(pick(row, "low")) || null,
    frequency: Number(pick(row, "frequency")) || null,
    foreignBuy: Number(pick(row, "foreign_buy")) || null,
    foreignSell: Number(pick(row, "foreign_sell")) || null,
    netForeign: pick(row, "net_foreign") != null ? Number(pick(row, "net_foreign")) : null,
  })).filter(r => r.date);
}

// Endpoint /marketdetectors membatasi TOTAL baris gabungan lewat "limit" â€”
// tapi dari pengujian lapangan (25 Agu 2026), ada masalah yang LEBIH
// MENDASAR: endpoint ini kelihatannya TIDAK benar-benar mendukung rentang
// fromâ€“to. Waktu dicoba pecah jadi beberapa chunk beberapa hari (mis. 4
// hari per request), hasilnya PERSIS 1 hari data per chunk â€” cocok dengan
// pola "cuma mengembalikan data untuk tanggal `to`, mengabaikan `from`".
// Jadi satu-satunya cara yang terbukti dapat semua hari adalah: minta
// SATU hari per request (from = to = tanggal itu), bukan rentang.
// Ini artinya jumlah request ke Stockbit jadi = jumlah hari yang diminta
// (bukan lagi dibagi jadi beberapa chunk besar) â€” lebih banyak request,
// tapi ini yang terbukti benar-benar mengembalikan datanya.
const STOCKBIT_BROKER_CHUNK_DAYS = 1; // JANGAN naikkan kecuali endpoint terbukti mendukung rentang beneran â€” lihat catatan di atas

function chunkArray(arr, size){
  const out = [];
  for(let i=0; i<arr.length; i+=size) out.push(arr.slice(i, i+size));
  return out;
}

// Cek tanggal mana saja (dari kandidat `dates`) yang SUDAH ada baris
// broker_summary-nya di Supabase untuk ticker ini, supaya tidak perlu
// tarik ulang ke Stockbit untuk hari yang datanya sudah tersimpan.
async function fetchExistingBrokerDates(ticker, dates){
  if(!dates.length) return new Set();
  try{
    const qs = new URLSearchParams({
      stock_code: `eq.${ticker}`,
      trade_date: `in.(${dates.join(",")})`,
      select: "trade_date",
    });
    const res = await fetch(`${SUPABASE_URL}/broker_summary?${qs}`, { headers: getSupaHeaders(), cache: "no-store" });
    if(!res.ok) return new Set(); // gagal cek = anggap belum ada, biar tetap ditarik (aman, cuma jadi tidak optimal)
    const rows = await res.json();
    return new Set(rows.map(r => r.trade_date));
  }catch(e){
    return new Set();
  }
}

async function fetchAndSaveBrokerSummaryBulk(tickers, rangeFrom, rangeTo){
  if(state.stockbitBrokerBulkLoading) return;
  if(!tickers || !tickers.length){
    state.stockbitBrokerBulkResults = [{ ticker:"-", date:"-", ok:false, msg:"Centang minimal 1 saham di tab Screener dulu." }];
    render(); return;
  }
  if(!state.stockbitToken){ openSettings(); return; }
  if(!state.stockbitBrokerEndpoint){
    state.stockbitBrokerBulkResults = [{ ticker:"-", date:"-", ok:false, msg:'Isi dulu "Endpoint Broker Summary" di âš™ï¸ Pengaturan.' }];
    render(); return;
  }
  if(!SUPABASE_URL || !SUPABASE_KEY){ openSettings(); return; }

  const tradingDates = tradingDaysInRange(rangeFrom, rangeTo); // urut lama -> baru
  if(!tradingDates.length){
    state.stockbitBrokerBulkResults = [{ ticker:"-", date:"-", ok:false, msg:'Periode tanggal tidak valid atau tidak ada hari bursa di rentang itu â€” cek lagi tanggal "Dari" dan "Sampai".' }];
    render(); return;
  }
  const fromDate = tradingDates[0];
  const toDate = tradingDates[tradingDates.length - 1];
  const latestDate = toDate; // hari bursa paling baru dalam periode ini â€” SELALU ditarik ulang, lihat catatan di bawah

  state.stockbitBrokerBulkLoading = true;
  state.stockbitBrokerBulkProgress = { done: 0, total: tickers.length }; // progress tetap dihitung per SAHAM (tiap saham di dalamnya bisa beberapa request kecil)
  state.stockbitBrokerBulkResults = [];
  render();

  for(const ticker of tickers){
    // Skip hari yang datanya SUDAH ada di database (broker summary hari yang
    // sudah lewat itu final, tidak berubah lagi) â€” kecuali hari bursa paling
    // baru dalam periode ini, yang tetap ditarik ulang tiap kali karena
    // kemungkinan datanya masih berjalan/belum final saat sesi bursa berlangsung.
    const existingDates = await fetchExistingBrokerDates(ticker, tradingDates);
    const datesToFetch = tradingDates.filter(d => !existingDates.has(d) || d === latestDate);
    const skippedCount = tradingDates.length - datesToFetch.length;

    if(!datesToFetch.length){
      state.stockbitBrokerBulkResults.push({ ticker, date: `${fromDate}..${toDate}`, ok:true, msg: `Semua ${tradingDates.length} hari sudah ada di database, dilewati (tidak ada request ke Stockbit).` });
      state.stockbitBrokerBulkProgress.done++;
      render();
      continue; // tidak perlu jeda 350ms karena tidak ada request Stockbit sama sekali
    }

    // Ambil tiap potongan tanggal (yang belum ada) secara berurutan lalu
    // gabungkan byDate-nya, supaya satu request yang gagal/kepotong tidak
    // menghilangkan potongan lain.
    const dateChunks = chunkArray(datesToFetch, STOCKBIT_BROKER_CHUNK_DAYS); // pecah jadi beberapa request kecil, lihat catatan di atas
    let byDate = {};
    let lastError = null;
    let anyOk = false;
    for(const chunk of dateChunks){
      const chunkFrom = chunk[0], chunkTo = chunk[chunk.length - 1];
      const res = await stockbitFetchMarketDetector(ticker, chunkFrom, chunkTo, chunk.length);
      if(res.error){
        lastError = res.error;
      } else {
        const parsed = parseStockbitMarketDetector(res.raw);
        if(parsed && Object.keys(parsed).length){
          Object.assign(byDate, parsed);
          anyOk = true;
        }
      }
      if(dateChunks.length > 1) await new Promise(r => setTimeout(r, 300)); // jeda antar-potongan tanggal, jaga rate limit
    }

    if(!anyOk){
      state.stockbitBrokerBulkResults.push({ ticker, date: `${fromDate}..${toDate}`, ok:false, msg: lastError || "Skema respons tidak dikenali / tidak ada data (cek raw JSON manual dulu)." });
    } else {
        const rows = [];
        datesToFetch.forEach(d => {
          const dd = byDate[d];
          if(!dd) return;
          dd.buy.forEach(r => rows.push({ stock_code:ticker, trade_date:d, side:"buy", rank:r.rank, broker_code:r.broker_code, lot:r.lot, value_idr:r.value_idr }));
          dd.sell.forEach(r => rows.push({ stock_code:ticker, trade_date:d, side:"sell", rank:r.rank, broker_code:r.broker_code, lot:r.lot, value_idr:r.value_idr }));
        });
        // "Hilang" di sini = hari yang sebelumnya belum ada di DB DAN gagal ditarik sekarang â€”
        // hari yang sudah ada di DB (di-skip) tidak dianggap hilang.
        const missingDates = datesToFetch.filter(d => !byDate[d]);
        if(!rows.length){
          state.stockbitBrokerBulkResults.push({ ticker, date: `${fromDate}..${toDate}`, ok:false, msg: "Tidak ada baris broker valid di respons ini." });
        } else {
          try{
            await supaFetch(`${SUPABASE_URL}/broker_summary?on_conflict=stock_code,trade_date,side,rank`, {
              method: "POST",
              headers: { ...getSupaHeaders(), "Prefer": "resolution=merge-duplicates,return=minimal" },
              body: JSON.stringify(rows)
            });
            let msg = `Tersimpan ${rows.length} baris untuk ${Object.keys(byDate).length}/${datesToFetch.length} hari yang ditarik.`;
            if(skippedCount) msg += ` (${skippedCount} hari lain dilewati, sudah ada di database.)`;
            // Sekarang tiap request cuma mencakup STOCKBIT_BROKER_CHUNK_DAYS hari
            // (lihat catatan di atas fetchAndSaveBrokerSummaryBulk), jadi kalau
            // masih ada hari kosong itu BUKAN lagi soal "limit" di URL â€” lebih
            // mungkin memang hari libur bursa, atau salah satu request chunk gagal.
            if(missingDates.length) msg += ` âš ï¸ ${missingDates.length} hari tidak ada data: ${missingDates.join(", ")} (cek dulu apakah tanggal itu ada di BURSA_HOLIDAYS di app.js â€” kalau BUKAN hari libur bursa dan STOCKBIT_BROKER_CHUNK_DAYS sudah 1, kemungkinan besar Stockbit memang tidak punya data broker net untuk saham ini di hari itu, mis. saham tidak likuid / tidak ada transaksi signifikan)`;
            state.stockbitBrokerBulkResults.push({ ticker, date: `${fromDate}..${toDate}`, ok:true, msg });
          }catch(e){
            state.stockbitBrokerBulkResults.push({ ticker, date: `${fromDate}..${toDate}`, ok:false, msg: "Gagal simpan ke DB: " + e.message });
          }
        }
      }
    state.stockbitBrokerBulkProgress.done++;
    render();
    await new Promise(r => setTimeout(r, 350)); // tetap jaga jeda antar-SAHAM (bukan antar-hari lagi)
  }

  state.stockbitBrokerBulkLoading = false;
  render();
  if(state.bsStockCode && state.bsDate) loadBrokerSummary();
}

function mapStockbitQuote(raw){
  if(!raw || typeof raw !== "object") return null;
  const d = raw.data || raw.result || raw;
  const pick = (...keys) => { for(const k of keys){ if(d && d[k]!=null && d[k]!=="") return d[k]; } return null; };
  return {
    last: pick("last","close","price","c"),
    open: pick("open","open_price","previous_open","o"),
    high: pick("high","high_price","h"),
    low: pick("low","low_price","l"),
    prevClose: pick("previous","prev_close","previousClose","yesterday_price","prevclose"),
    change: pick("change","chg"),
    changePct: pick("change_percent","changePercent","percentage_change","pct"),
    bid: pick("bid","best_bid","bid_price"),
    offer: pick("offer","ask","best_offer","offer_price"),
    volume: pick("volume","vol"),
    frequency: pick("frequency","freq"),
    time: pick("timestamp","time","updated_at","last_update"),
  };
}
// ==========================================================
// AUTO-SYNC TOKEN dari tabel `stockbit_session` (diisi oleh extension
// Chrome stockbit-token-extension via sql/05_stockbit_token_sync.sql).
// Kalau tabelnya belum dibuat (migration SQL belum dijalankan), fetch ini
// gagal diam-diam â€” fitur live Stockbit tetap jalan dengan token manual.
// ==========================================================
async function syncStockbitTokenFromSupabase(){
  if(!SUPABASE_URL || !SUPABASE_KEY) return false;
  // Kalau token yang aktif sekarang datang dari extension (WS Interceptor),
  // JANGAN ditimpa oleh jalur Supabase ini â€” dua jalur ini independen dan
  // Supabase bisa saja berisi baris basi dari lama. Extension menangkap
  // token dari request nyata yang baru terjadi, jadi lebih dipercaya. Kalau
  // dibiarkan, sync ini juga akan menulis balik ke localStorage (baris di
  // bawah) dan bikin pollExtensionStockbitToken() salah kira tidak ada
  // perubahan padahal token sudah ketiban token Supabase yang basi.
  if(state.stockbitTokenSource === "extension") return false;
  try{
    const res = await fetch(`${SUPABASE_URL}/stockbit_session?id=eq.1&select=token,expires_at,updated_at`, { headers: getSupaHeaders(), cache: "no-store" });
    if(!res.ok) return false;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if(row && row.token){
      state.stockbitToken = sanitizeStockbitToken(row.token);
      state.stockbitTokenExpiresAt = row.expires_at || null;
      state.stockbitTokenSyncedAt = row.updated_at || null;
      state.stockbitTokenSource = "auto";
      localStorage.setItem(LS_STOCKBIT_TOKEN, state.stockbitToken);
      return true;
    }
  }catch(e){ /* tabel belum ada / offline â€” biarkan token manual yang dipakai */ }
  return false;
}

// ==========================================================
// AUTO-PICKUP TOKEN dari extension Chrome "WS Interceptor"
// (background.js + content_screener.js) â€” jalur INI TERPISAH TOTAL dari
// syncStockbitTokenFromSupabase() di atas. Extension itu menangkap header
// Authorization langsung dari request stockbit.com lalu menulisnya ke
// localStorage['ihsg_stockbit_token'] di tab aplikasi ini (lewat
// chrome.storage.local -> content_screener.js) â€” TIDAK PERNAH menyentuh
// tabel Supabase `stockbit_session`. Jadi badge "Auto-sync dari extension"
// yang sebelumnya cuma bersumber dari Supabase itu SAMA SEKALI TIDAK
// MEREFLEKSIKAN token yang ditulis extension ini.
//
// KENAPA HARUS DI-POLL (bukan cukup addEventListener('storage', ...)):
// event `storage` browser HANYA terpicu di tab/dokumen LAIN yang beda dari
// yang melakukan penulisan â€” dan content_screener.js menulis ke
// localStorage di DALAM tab aplikasi ini sendiri (document yang sama,
// cuma beda isolated world JS). Jadi event storage TIDAK PERNAH nyala di
// sini walau extension berhasil menulis token baru. Satu-satunya cara
// yang reliable untuk pick up perubahan itu tanpa reload manual adalah
// baca ulang localStorage secara berkala dan bandingkan.
//
// Kalau token yang ditemukan beda dari yang sedang dipakai, expires_at
// lama (kalau ada, dari sync Supabase sebelumnya) DIBUANG â€” itu milik
// token yang BEDA, jadi countdown lama yang ditampilkan ke user tidak lagi
// relevan/menyesatkan untuk token baru ini.
// ==========================================================
function pollExtensionStockbitToken(){
  let raw;
  try{ raw = localStorage.getItem(LS_STOCKBIT_TOKEN); }catch(e){ return; }
  const clean = sanitizeStockbitToken(raw);
  if(!clean || clean === state.stockbitToken) return;
  state.stockbitToken = clean;
  state.stockbitTokenSource = "extension";
  state.stockbitTokenSyncedAt = Date.now();
  state.stockbitTokenExpiresAt = null; // milik token lama, tidak berlaku lagi untuk token ini
  try{
    localStorage.setItem(LS_STOCKBIT_TOKEN_SOURCE, "extension");
    localStorage.setItem(LS_STOCKBIT_TOKEN_SYNCED_AT, String(state.stockbitTokenSyncedAt));
  }catch(e){}
  // Kalau field token di modal Pengaturan sedang tampil TAPI tidak sedang
  // diketik user (bukan activeElement), sinkronkan juga tampilannya â€”
  // supaya kalau user buka Pengaturan, yang kelihatan bukan nilai basi.
  const stbTokenEl = document.getElementById("setStockbitToken");
  if(stbTokenEl && document.activeElement !== stbTokenEl) stbTokenEl.value = clean;
  updateStockbitTokenStatusUI();
}

// Format selisih waktu jadi teks singkat berbahasa Indonesia, dipakai untuk
// banner "terakhir berhasil ditarik" di bawah ini (dan bisa dipakai ulang di
// tempat lain kalau perlu format relatif serupa).
function fmtRelativeTimeID(ts){
  if(!ts) return null;
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if(sec < 5) return "baru saja";
  if(sec < 60) return `${sec} detik lalu`;
  const min = Math.round(sec / 60);
  if(min < 60) return `${min} menit lalu`;
  const hr = Math.round(min / 60);
  if(hr < 24) return `${hr} jam lalu`;
  return new Date(ts).toLocaleString("id-ID");
}

// ==========================================
// stockbitLiveDataStatus â€” status ringkas dipakai untuk banner "terakhir
// berhasil ditarik: [waktu]" (lihat catatan performa & keandalan data:
// endpoint Stockbit tidak resmi & rawan berhenti berfungsi tanpa
// pemberitahuan, jadi user perlu tahu dari UI kalau data live sedang basi
// tanpa perlu buka console). Dianggap "basi" (stale, warna kuning) kalau
// sudah lebih dari 5 menit sejak sukses terakhir â€” angka ini sengaja longgar
// karena live data di sini memang ditarik manual per klik, bukan auto-poll
// tiap detik.
// ==========================================
const STOCKBIT_STALE_AFTER_MS = 5 * 60 * 1000;
function stockbitLiveDataStatus(){
  if(!state.stockbitLastSuccessAt){
    return { text: "Belum pernah berhasil menarik data live dari Stockbit.", color: "var(--muted)" };
  }
  const rel = fmtRelativeTimeID(state.stockbitLastSuccessAt);
  const isStale = (Date.now() - state.stockbitLastSuccessAt) > STOCKBIT_STALE_AFTER_MS;
  return {
    text: `${isStale ? "âš ï¸ " : "âœ… "}Terakhir berhasil ditarik: ${rel}${isStale ? " â€” mungkin sudah basi, coba tarik ulang" : ""}`,
    color: isStale ? "var(--gold)" : "var(--up)"
  };
}
function updateStockbitLastSuccessStatusUI(){
  const el = document.getElementById("stockbitLastSuccessStatus");
  if(!el) return;
  const st = stockbitLiveDataStatus();
  el.textContent = st.text;
  el.style.color = st.color;
}

function stockbitTokenStatus(){
  if(!state.stockbitToken) return { text: "Belum ada token.", color: "var(--muted)" };
  const nowSec = Date.now()/1000;
  // Sumber "extension" TIDAK punya info expires_at yang valid (extension WS
  // Interceptor cuma menangkap nilai token mentah, tidak tahu klaim `exp`
  // JWT-nya) â€” jadi jangan pernah tampilkan countdown untuk sumber ini,
  // supaya tidak menyesatkan seperti badge lama yang basi.
  if(state.stockbitTokenSource === "extension"){
    const rel = state.stockbitTokenSyncedAt ? fmtRelativeTimeID(state.stockbitTokenSyncedAt) : null;
    return { text: `ðŸ§© Auto dari extension (WS Interceptor)${rel ? " Â· ditangkap " + rel : ""} â€” belum tentu masih valid di sisi server Stockbit, cek dari hasil tarik data.`, color: "var(--up)" };
  }
  let expiryTxt = "";
  if(state.stockbitTokenExpiresAt){
    if(state.stockbitTokenExpiresAt < nowSec){
      return { text: "âš ï¸ Token kadaluarsa â€” buka stockbit.com & login ulang supaya extension menyinkron token baru.", color: "var(--down)" };
    }
    const minsLeft = Math.round((state.stockbitTokenExpiresAt - nowSec)/60);
    expiryTxt = ` Â· berlaku ~${minsLeft} menit lagi`;
  }
  const src = state.stockbitTokenSource === "auto" ? "ðŸ”„ Auto-sync dari Supabase" : "âœï¸ Diisi manual";
  return { text: `${src}${expiryTxt}`, color: "var(--up)" };
}

async function fetchStockbitLive(ticker){
  state.stockbitLive[ticker] = { ...(state.stockbitLive[ticker]||{}), loading: true, error: null };
  render();
  const res = await stockbitFetch(state.stockbitQuoteEndpoint, ticker);
  const mapped = res.raw ? mapStockbitQuote(res.raw) : null;
  state.stockbitLive[ticker] = { loading: false, error: res.error || null, raw: res.raw ?? null, mapped, fetchedAt: Date.now() };
  render();
}
// Tarik live data berurutan (bukan paralel) dengan jeda antar-request,
// KHUSUS untuk ticker yang lolos filter Screener saat ini â€” supaya tidak
// membombardir Stockbit dengan puluhan request sekaligus pakai 1 token
// akun pribadi (rawan rate-limit/flag oleh sistem mereka).
async function fetchStockbitLiveBulk(tickers){
  if(state.stockbitBulkLoading) return;
  state.stockbitBulkLoading = true;
  state.stockbitBulkProgress = { done: 0, total: tickers.length };
  render();
  for(const t of tickers){
    await fetchStockbitLive(t);
    state.stockbitBulkProgress = { done: state.stockbitBulkProgress.done + 1, total: tickers.length };
    render();
    await new Promise(r => setTimeout(r, 350)); // jeda 350ms antar-request
  }
  state.stockbitBulkLoading = false;
  state.stockbitBulkProgress = null;
  render();
}

async function supaFetch(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let msg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body && body.message) {
        msg = body.message;
        if (body.hint) msg += ` (hint: ${body.hint})`;
      }
    } catch (e) { /* body bukan JSON, pakai status text saja */ }
    // Sertakan nama tabel/endpoint di pesan error â€” tanpa ini, error yang
    // sama persis bisa muncul dari beberapa request berbeda (mis.
    // backtest_sessions vs backtest_items) dan tidak mungkin dibedakan
    // dari pesan Postgrest saja.
    const table = url.replace(/^.*\/rest\/v1\//, "").split("?")[0];
    throw new Error(`[${table}] ${msg}`);
  }
  return res;
}

// ==========================================
// UJI ENDPOINT STOCKBIT (dipanggil tombol "ðŸ§ª Uji" di modal Pengaturan)
//
// Sengaja baca langsung dari INPUT field (bukan state yang sudah tersimpan),
// supaya user bisa coba-coba endpoint/token baru dulu sebelum klik "Simpan
// & Reload" â€” tidak perlu simpan dulu baru ketahuan salah.
//
// CATATAN: fungsi ini menimpa state.stockbitToken /
// state.stockbitHistoricalEndpoint SEMENTARA selama request berlangsung,
// lalu mengembalikannya. Kalau kebetulan auto-refresh Stockbit (lihat blok
// AUTO-REFRESH LIVE STOCKBIT di bagian akhir file) jalan tepat di detik yang
// sama, ada kemungkinan kecil 1 request nyasar pakai token/endpoint uji â€”
// bukan masalah serius untuk skala testing manual, tapi disebutkan di sini
// supaya tidak membingungkan kalau terlihat di Network tab.
// ==========================================
async function testStockbitQuoteEndpoint(){
  const resultEl = document.getElementById("testStockbitQuoteResult");
  const tickerEl = document.getElementById("testStockbitTicker");
  const epEl = document.getElementById("setStockbitQuoteEndpoint");
  const tokenEl = document.getElementById("setStockbitToken");
  if(!resultEl || !tickerEl || !epEl) return;
  const ticker = (tickerEl.value||"").trim().toUpperCase();
  if(!ticker){ resultEl.innerHTML = `<div style="font-size:11.5px;color:var(--down);">Isi ticker uji dulu (mis. BBCA).</div>`; return; }
  const endpointTemplate = (epEl.value||"").trim() || STOCKBIT_DEFAULT_QUOTE_EP;

  const prevToken = state.stockbitToken;
  if(tokenEl && tokenEl.value.trim()) state.stockbitToken = tokenEl.value.trim();
  resultEl.innerHTML = `<div style="font-size:11.5px;color:var(--muted);">Menguji ${escapeHtml(ticker)}...</div>`;
  const res = await stockbitFetch(endpointTemplate, ticker);
  state.stockbitToken = prevToken;

  if(res.error){
    resultEl.innerHTML = `<div style="font-size:11.5px;color:var(--down);">âš ï¸ ${escapeHtml(res.error)}</div>`;
    return;
  }
  const mapped = mapStockbitQuote(res.raw) || {};
  const foundFields = ["open","high","low","last"].filter(k => mapped[k]!=null);
  const verdict = foundFields.length
    ? `<span style="color:var(--up);">âœ… Ketemu field: ${foundFields.join(", ")} (Last=${mapped.last}, O/H/L=${mapped.open}/${mapped.high}/${mapped.low}). Kalau angkanya masuk akal, endpoint ini kemungkinan besar BENAR â€” klik "Simpan &amp; Reload".</span>`
    : `<span style="color:var(--down);">âŒ Open/High/Low/Last tidak ketemu â€” kemungkinan besar ini BUKAN endpoint harga (mis. masih endpoint stream/komentar). Cek struktur JSON mentah di bawah, cari nama field harga aslinya lalu beri tahu saya supaya mapStockbitQuote() disesuaikan.</span>`;
  resultEl.innerHTML = `
    <div style="font-size:11.5px;margin-bottom:6px;">${verdict}</div>
    <details><summary style="cursor:pointer;font-size:11px;color:var(--teal);">Lihat JSON mentah</summary>
      <pre style="font-size:10.5px;background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;overflow-x:auto;max-height:200px;">${escapeHtml(JSON.stringify(res.raw, null, 2))}</pre>
    </details>`;
}

async function testStockbitHistoricalEndpoint(){
  const resultEl = document.getElementById("testStockbitHistResult");
  const tickerEl = document.getElementById("testStockbitHistTicker");
  const periodEl = document.getElementById("testStockbitHistPeriod");
  const epEl = document.getElementById("setStockbitHistoricalEndpoint");
  const tokenEl = document.getElementById("setStockbitToken");
  if(!resultEl || !tickerEl || !epEl) return;
  const ticker = (tickerEl.value||"").trim().toUpperCase();
  const period = periodEl ? periodEl.value : "daily";
  if(!ticker){ resultEl.innerHTML = `<div style="font-size:11.5px;color:var(--down);">Isi ticker uji dulu.</div>`; return; }

  const prevEndpoint = state.stockbitHistoricalEndpoint;
  const prevToken = state.stockbitToken;
  state.stockbitHistoricalEndpoint = (epEl.value||"").trim() || STOCKBIT_DEFAULT_HISTORICAL_EP;
  if(tokenEl && tokenEl.value.trim()) state.stockbitToken = tokenEl.value.trim();
  resultEl.innerHTML = `<div style="font-size:11.5px;color:var(--muted);">Menguji mode ${escapeHtml(period)}...</div>`;
  const res = await stockbitFetchHistorical(ticker, period, { limit: 10 });
  state.stockbitHistoricalEndpoint = prevEndpoint;
  state.stockbitToken = prevToken;

  if(res.error){
    resultEl.innerHTML = `<div style="font-size:11.5px;color:var(--down);">âš ï¸ ${escapeHtml(res.error)}</div>`;
    return;
  }
  const parsed = parseStockbitHistorical(res.raw);
  const verdict = (parsed && parsed.length)
    ? `<span style="color:var(--up);">âœ… Terbaca ${parsed.length} baris. Baris pertama: tanggal ${escapeHtml(parsed[0]?.date||"-")}, Close ${parsed[0]?.close ?? "-"}. Cek jarak antar tanggal di JSON mentah â€” untuk mode "${escapeHtml(period)}" jaraknya seharusnya mingguan/bulanan, bukan harian, kalau period-nya benar-benar berpengaruh di sisi server.</span>`
    : `<span style="color:var(--down);">âŒ Formatnya tidak dikenali parseStockbitHistorical() untuk mode "${escapeHtml(period)}" â€” kemungkinan besar nama parameter period salah tebak. Cek JSON mentah di bawah lalu beri tahu saya strukturnya.</span>`;
  resultEl.innerHTML = `
    <div style="font-size:11.5px;margin-bottom:6px;">${verdict}</div>
    <details><summary style="cursor:pointer;font-size:11px;color:var(--teal);">Lihat JSON mentah</summary>
      <pre style="font-size:10.5px;background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;overflow-x:auto;max-height:200px;">${escapeHtml(JSON.stringify(res.raw, null, 2))}</pre>
    </details>`;
}

// ==========================================
// PENGATURAN UI KONEKSI
// ==========================================
async function openSettings() {
  let urlDisp = SUPABASE_URL;
  if(urlDisp.endsWith("/rest/v1")) urlDisp = urlDisp.replace("/rest/v1", "");
  document.getElementById("setSupaUrl").value = urlDisp;
  document.getElementById("setSupaKey").value = SUPABASE_KEY;
  const freqEl = document.getElementById("setFreqAnalyzerCol");
  if(freqEl) freqEl.value = state.freqAnalyzerCol;
  const stbToken = document.getElementById("setStockbitToken");
  if(stbToken) stbToken.value = state.stockbitToken || "";
  const stbQuote = document.getElementById("setStockbitQuoteEndpoint");
  if(stbQuote) stbQuote.value = state.stockbitQuoteEndpoint || STOCKBIT_DEFAULT_QUOTE_EP;
  const stbBroker = document.getElementById("setStockbitBrokerEndpoint");
  if(stbBroker) stbBroker.value = state.stockbitBrokerEndpoint || STOCKBIT_DEFAULT_BROKER_EP;
  const stbHistorical = document.getElementById("setStockbitHistoricalEndpoint");
  if(stbHistorical) stbHistorical.value = state.stockbitHistoricalEndpoint || STOCKBIT_DEFAULT_HISTORICAL_EP;
  const stbProxy = document.getElementById("setStockbitProxyUrl");
  if(stbProxy) stbProxy.value = state.stockbitProxyUrl || "";
  document.getElementById("settingsModalOverlay").classList.add("open");
  updateStockbitTokenStatusUI();
  updateStockbitLastSuccessStatusUI();
  // Coba tarik token terbaru dari Supabase di background â€” kalau berhasil,
  // timpa field token yang baru saja ditampilkan supaya selalu yang terbaru.
  // (syncStockbitTokenFromSupabase() sendiri akan no-op kalau token yang
  // aktif sekarang datang dari extension â€” lihat catatan di fungsi itu.)
  const synced = await syncStockbitTokenFromSupabase();
  if(synced && stbToken) stbToken.value = state.stockbitToken;
  updateStockbitTokenStatusUI();

  // --- Notifikasi Telegram ---
  const tgFnEl = document.getElementById("setTelegramFunctionUrl");
  if(tgFnEl) tgFnEl.value = state.telegramFunctionUrl || ""; // isi awal dari localStorage, sambil menunggu fetch di bawah
  await Promise.all([refreshCustomPresets(), loadTelegramSettingsFromSupabase()]);
  // Timpa lagi setelah fetch selesai â€” kalau Supabase punya function_url tersimpan,
  // itu yang dipakai (lihat loadTelegramSettingsFromSupabase), bukan cuma localStorage.
  if(tgFnEl) tgFnEl.value = state.telegramFunctionUrl || "";
  const tgTokenEl = document.getElementById("setTelegramBotToken");
  if(tgTokenEl) tgTokenEl.value = state.telegramBotToken || "";
  const tgChatEl = document.getElementById("setTelegramChatId");
  if(tgChatEl) tgChatEl.value = state.telegramChatId || "";
  const tgEnabledEl = document.getElementById("setTelegramEnabled");
  if(tgEnabledEl) tgEnabledEl.checked = !!state.telegramEnabled;
  const tgHoursEl = document.getElementById("setTelegramOnlyMarketHours");
  if(tgHoursEl) tgHoursEl.checked = state.telegramOnlyMarketHours !== false;
  renderTelegramPresetChecklist();
  const tgLastRunEl = document.getElementById("telegramLastRunStatus");
  if(tgLastRunEl){
    tgLastRunEl.textContent = state.telegramLastRunAt
      ? `Terakhir cek server: ${new Date(state.telegramLastRunAt).toLocaleString("id-ID")} â€” ${state.telegramLastRunNote || ""}`
      : "Belum pernah dijalankan Cron server (atau tabel telegram_settings belum dibuat).";
  }
}
function updateStockbitTokenStatusUI(){
  const el = document.getElementById("stockbitTokenStatus");
  if(!el) return;
  const st = stockbitTokenStatus();
  el.textContent = st.text;
  el.style.color = st.color;
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

  localStorage.setItem("ihsg_supa_url", SUPABASE_URL);
  localStorage.setItem("ihsg_supa_key", SUPABASE_KEY);

  const freqColInput = (document.getElementById("setFreqAnalyzerCol")?.value || "").trim();
  state.freqAnalyzerCol = freqColInput || "freq_ma20";
  localStorage.setItem(LS_FREQ_ANALYZER_COL, state.freqAnalyzerCol);

  state.stockbitToken = sanitizeStockbitToken(document.getElementById("setStockbitToken")?.value);
  state.stockbitTokenSource = "manual"; // ditimpa balik ke "auto"/"extension" oleh sync yang berjalan otomatis kalau memang datang dari situ
  state.stockbitTokenSyncedAt = Date.now();
  try{
    localStorage.setItem(LS_STOCKBIT_TOKEN_SOURCE, "manual");
    localStorage.setItem(LS_STOCKBIT_TOKEN_SYNCED_AT, String(state.stockbitTokenSyncedAt));
  }catch(e){}
  state.stockbitQuoteEndpoint = (document.getElementById("setStockbitQuoteEndpoint")?.value || "").trim() || STOCKBIT_DEFAULT_QUOTE_EP;
  state.stockbitBrokerEndpoint = (document.getElementById("setStockbitBrokerEndpoint")?.value || "").trim() || STOCKBIT_DEFAULT_BROKER_EP;
  state.stockbitHistoricalEndpoint = (document.getElementById("setStockbitHistoricalEndpoint")?.value || "").trim() || STOCKBIT_DEFAULT_HISTORICAL_EP;
  state.stockbitProxyUrl = (document.getElementById("setStockbitProxyUrl")?.value || "").trim();
  localStorage.setItem(LS_STOCKBIT_TOKEN, state.stockbitToken);
  localStorage.setItem(LS_STOCKBIT_QUOTE_EP, state.stockbitQuoteEndpoint);
  localStorage.setItem(LS_STOCKBIT_BROKER_EP, state.stockbitBrokerEndpoint);
  localStorage.setItem(LS_STOCKBIT_HISTORICAL_EP, state.stockbitHistoricalEndpoint);
  localStorage.setItem(LS_STOCKBIT_PROXY, state.stockbitProxyUrl);

  state.telegramFunctionUrl = (document.getElementById("setTelegramFunctionUrl")?.value || "").trim();
  localStorage.setItem(LS_TELEGRAM_FUNCTION_URL, state.telegramFunctionUrl);
  state.telegramBotToken = (document.getElementById("setTelegramBotToken")?.value || "").trim();
  state.telegramChatId = (document.getElementById("setTelegramChatId")?.value || "").trim();
  state.telegramEnabled = !!document.getElementById("setTelegramEnabled")?.checked;
  state.telegramOnlyMarketHours = !!document.getElementById("setTelegramOnlyMarketHours")?.checked;
  saveTelegramSettingsToSupabase();

  closeSettings();
  
  if(SUPABASE_URL && SUPABASE_KEY) {
    loadLive();
  } else {
    document.getElementById("content").innerHTML = `<div class="empty-box">Koneksi belum diatur. Klik "âš™ï¸ Pengaturan" di pojok kanan atas.</div>`;
  }
}

// ==========================================
// NOTIFIKASI TELEGRAM (tabel telegram_settings di Supabase)
//
// Dipantau & dikirim oleh Edge Function `telegram-notifier` yang jalan
// di server lewat Cron (lihat sql/06_telegram_notifikasi.sql) â€” bagian
// di sini hanya UI untuk mengisi/menyimpan konfigurasinya dan tombol
// uji-kirim manual.
// ==========================================
async function loadTelegramSettingsFromSupabase(){
  if(!SUPABASE_URL || !SUPABASE_KEY) return;
  try{
    const res = await fetch(`${SUPABASE_URL}/telegram_settings?id=eq.1&select=*`, { headers: getSupaHeaders(), cache: "no-store" });
    if(!res.ok) return; // tabel belum ada (belum jalankan sql/06_telegram_notifikasi.sql) â€” biarkan default
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if(!row) return;
    state.telegramBotToken = row.bot_token || "";
    state.telegramChatId = row.chat_id || "";
    state.telegramEnabled = !!row.enabled;
    state.telegramOnlyMarketHours = row.only_market_hours !== false;
    state.telegramPresetIds = Array.isArray(row.preset_ids) ? row.preset_ids.map(String) : [];
    state.telegramLastRunAt = row.last_run_at || null;
    state.telegramLastRunNote = row.last_run_note || null;
    // function_url disimpan di Supabase (kolom telegram_settings.function_url)
    // supaya tidak perlu diisi ulang tiap buka Pengaturan di device/browser lain.
    // Kalau kolomnya belum pernah diisi (null), tetap pakai nilai localStorage lama.
    if(row.function_url){
      state.telegramFunctionUrl = row.function_url;
      try{ localStorage.setItem(LS_TELEGRAM_FUNCTION_URL, state.telegramFunctionUrl); }catch(e){}
    }
  }catch(e){ /* offline / tabel belum ada â€” abaikan, form tetap terisi default */ }
}

async function saveTelegramSettingsToSupabase(){
  if(!SUPABASE_URL || !SUPABASE_KEY) return;
  try{
    await supaFetch(`${SUPABASE_URL}/telegram_settings?id=eq.1`, {
      method: "PATCH",
      headers: { ...getSupaHeaders(), "Prefer": "return=minimal" },
      body: JSON.stringify({
        bot_token: state.telegramBotToken,
        chat_id: state.telegramChatId,
        enabled: state.telegramEnabled,
        only_market_hours: state.telegramOnlyMarketHours,
        preset_ids: state.telegramPresetIds,
        function_url: state.telegramFunctionUrl,
        updated_at: new Date().toISOString()
      })
    });
  }catch(e){
    showError("Gagal menyimpan Pengaturan Notifikasi Telegram: " + e.message + " â€” pastikan sudah menjalankan sql/06_telegram_notifikasi.sql di Supabase.");
  }
}

// Centang/hapus centang 1 preset di daftar "preset yang dipantau" â€”
// langsung disimpan ke Supabase supaya Edge Function di server melihat
// perubahan ini di cron berikutnya, tidak perlu klik "Simpan & Reload".
function toggleTelegramPreset(id){
  const key = String(id);
  const idx = state.telegramPresetIds.indexOf(key);
  if(idx === -1) state.telegramPresetIds.push(key); else state.telegramPresetIds.splice(idx, 1);
  renderTelegramPresetChecklist();
  saveTelegramSettingsToSupabase();
}

function renderTelegramPresetChecklist(){
  const el = document.getElementById("telegramPresetChecklist");
  if(!el) return;

  // Grup 1: 9 Preset DSI bawaan. Kunci disimpan dengan prefix "dsi:" (mis.
  // "dsi:bagger") supaya Edge Function bisa bedakan dari id Preset Kustom
  // (angka polos, tanpa prefix) â€” lihat functions/telegram-notifier/index.ts.
  const dsiKeys = Object.keys(PRESET_LABELS);
  const dsiHtml = dsiKeys.map(key => {
    const fullId = `dsi:${key}`;
    return `
    <label style="display:grid;grid-template-columns:16px 1fr;align-items:center;gap:8px;font-size:12.5px;padding:6px 0;cursor:pointer;">
      <input type="checkbox" class="custom-checkbox" style="margin:0;justify-self:start;" ${state.telegramPresetIds.includes(fullId) ? "checked" : ""} onchange="toggleTelegramPreset('${fullId}')">
      <span style="text-align:left;">${escapeHtml(PRESET_LABELS[key])}</span>
    </label>`;
  }).join("");

  // Grup 2: Preset Kustom (id polos angka, TANPA prefix â€” sama seperti
  // sebelumnya, supaya query custom_presets?id=in.(...) di Edge Function
  // tidak perlu diubah untuk yang ini).
  const customHtml = state.customPresets.length
    ? state.customPresets.map(p => `
      <label style="display:grid;grid-template-columns:16px 1fr;align-items:center;gap:8px;font-size:12.5px;padding:6px 0;cursor:pointer;">
        <input type="checkbox" class="custom-checkbox" style="margin:0;justify-self:start;" ${state.telegramPresetIds.includes(String(p.id)) ? "checked" : ""} onchange="toggleTelegramPreset('${p.id}')">
        <span style="text-align:left;">${escapeHtml(p.name)}</span>
      </label>`).join("")
    : `<div style="font-size:11.5px;color:var(--muted);padding:4px 0;">Belum ada Preset Kustom tersimpan. Buat dulu lewat "+ Tambah Rule" di tab Screener, lalu "ðŸ’¾ Simpan sebagai Preset...".</div>`;

  el.innerHTML = `
    <div style="font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;">Preset DSI Bawaan</div>
    ${dsiHtml}
    <div style="font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin:10px 0 2px;border-top:1px solid var(--border);padding-top:8px;">Preset Kustom Saya</div>
    ${customHtml}
  `;
}

async function testTelegramNotification(){
  const statusEl = document.getElementById("telegramTestStatus");
  const fnUrl = (document.getElementById("setTelegramFunctionUrl")?.value || state.telegramFunctionUrl || "").trim();
  if(!fnUrl){
    if(statusEl){ statusEl.textContent = "Isi dulu \"URL Edge Function\" di bawah."; statusEl.style.color = "var(--down)"; }
    return;
  }
  // Simpan dulu token/chat_id/preset yang sedang diketik supaya Edge
  // Function di server (yang membaca dari Supabase, bukan dari body
  // request ini) memakai nilai terbaru saat mengirim test.
  state.telegramBotToken = (document.getElementById("setTelegramBotToken")?.value || "").trim();
  state.telegramChatId = (document.getElementById("setTelegramChatId")?.value || "").trim();
  state.telegramFunctionUrl = fnUrl;
  localStorage.setItem(LS_TELEGRAM_FUNCTION_URL, state.telegramFunctionUrl);
  await saveTelegramSettingsToSupabase();

  state.telegramTesting = true;
  if(statusEl){ statusEl.textContent = "Mengirim test..."; statusEl.style.color = "var(--muted)"; }
  try{
    const res = await fetch(fnUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ test: true }) });
    const body = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
    if(statusEl){ statusEl.textContent = "âœ… Test terkirim â€” cek chat Telegram kamu."; statusEl.style.color = "var(--up)"; }
  }catch(e){
    if(statusEl){ statusEl.textContent = "âŒ Gagal: " + e.message; statusEl.style.color = "var(--down)"; }
  }
  state.telegramTesting = false;
}

// ==========================================
// APLIKASI UTAMA
// ==========================================
const LS_WATCHLIST = "ihsg_watchlist", LS_BACKTEST = "ihsg_backtest", LS_PORTO = "ihsg_portofolio", LS_STOCK_CACHE = "ihsg_stock_cache";
const LS_FREQ_ANALYZER_COL = "ihsg_freq_analyzer_col";
const LS_CUSTOM_RULES = "ihsg_custom_rules_v1";
const LS_STOCKBIT_TOKEN = "ihsg_stockbit_token", LS_STOCKBIT_QUOTE_EP = "ihsg_stockbit_quote_ep",
      LS_STOCKBIT_BROKER_EP = "ihsg_stockbit_broker_ep", LS_STOCKBIT_PROXY = "ihsg_stockbit_proxy",
      LS_STOCKBIT_HISTORICAL_EP = "ihsg_stockbit_historical_ep";
// Menyimpan SUMBER token (bukan cuma token-nya sendiri) supaya label status
// ("ðŸ§© Auto dari extension" vs "âœï¸ Diisi manual") tetap akurat setelah
// halaman di-reload â€” bukan cuma benar selama tab masih terbuka.
const LS_STOCKBIT_TOKEN_SOURCE = "ihsg_stockbit_token_source", LS_STOCKBIT_TOKEN_SYNCED_AT = "ihsg_stockbit_token_synced_at";
const LS_STOCKBIT_AUTOREFRESH = "ihsg_stockbit_autorefresh", LS_STOCKBIT_AUTOREFRESH_SEC = "ihsg_stockbit_autorefresh_sec";
const STOCKBIT_AUTOREFRESH_MIN_SEC = 30; // batas bawah supaya tidak membombardir Stockbit dengan token pribadi
const STOCKBIT_AUTOREFRESH_MAX_TICKERS = 30; // di atas ini auto-refresh otomatis nonaktif sendiri (lihat maybeAutoRefreshStockbit)
// Notifikasi Telegram â€” cuma URL Edge Function yang perlu disimpan lokal
// (dipakai tombol "Uji Kirim Notifikasi" di browser). Bot token, chat ID,
// status aktif, dan preset yang dipantau disimpan di Supabase (tabel
// telegram_settings), bukan localStorage â€” supaya Edge Function di server
// (dipanggil Cron, bukan dari browser ini) bisa membacanya juga.
const LS_TELEGRAM_FUNCTION_URL = "ihsg_telegram_function_url";
const STOCKBIT_DEFAULT_QUOTE_EP = "https://exodus.stockbit.com/stream/v3/symbol/{ticker}";
// NOTE (25 Agu 2026): endpoint di atas TERBUKTI SALAH â€” itu API "Stream"
// (linimasa komentar komunitas), bukan API harga. Endpoint quote/orderbook
// yang benar belum ketemu (sempat ditelusuri sampai ke WebSocket Primus
// ws-gen.stockbit.com, tapi dihentikan karena rawan trigger rate-limit kalau
// dipakai ganti-ganti ticker cepat). Dibiarkan seperti ini dulu â€” field
// "Endpoint Quote/Orderbook" di Pengaturan tetap bisa ditimpa manual kalau
// endpoint yang benar sudah ketemu.
const STOCKBIT_DEFAULT_BROKER_EP = "https://exodus.stockbit.com/order-trade/broker/distribution?date={date}&symbol={ticker}&investor_type=INVESTOR_TYPE_ALL&market_board=MARKET_TYPE_REGULER&data_type=BROKER_DISTRIBUTION_DATA_TYPE_VALUE&period=TB_PERIOD_LAST_1_DAY";// Endpoint Historical Data (tabel Date/Close/Change/Value/Volume di halaman
// detail saham Stockbit â€” toggle Daily/Weekly/Monthly). Sudah diverifikasi
// dari traffic asli lewat DevTools (30 Agu 2026) â€” beda dengan marketdetectors,
// endpoint ini SUDAH mendukung rentang tanggal beneran lewat start_date/end_date
// + pagination lewat limit/page, jadi tidak perlu trik "tarik semua lalu saring"
// seperti broker summary. Placeholder {period} diisi lewat
// stockbitHistoricalPeriodParam() (map "daily"/"weekly"/"monthly" ->
// HS_PERIOD_DAILY/HS_PERIOD_WEEKLY/HS_PERIOD_MONTHLY â€” dua yang terakhir baru
// tebakan pola penamaan, belum dicek manual; kalau salah, field Endpoint di
// Pengaturan bisa ditimpa manual). Bentuk JSON response-nya SENDIRI belum
// dikonfirmasi â€” parseStockbitHistorical() di bawah menebak nama field secara
// defensif, jadi kalau muncul pesan "formatnya tidak dikenali", tinggal cek
// console (F12) untuk lihat JSON asli dan tambah alias field yang cocok.
const STOCKBIT_DEFAULT_HISTORICAL_EP = "https://exodus.stockbit.com/company-price-feed/historical/summary/{ticker}?period={period}&start_date={start_date}&end_date={end_date}&limit={limit}&page={page}";
function stockbitHistoricalPeriodParam(period){
  if(period === "weekly") return "HS_PERIOD_WEEKLY";
  if(period === "monthly") return "HS_PERIOD_MONTHLY";
  return "HS_PERIOD_DAILY";
}
// Diverifikasi manual dari DevTools tanggal 25 Agu 2026 (menu "Bandar
// Detector" stockbit.com) â€” {ticker} di path URL, {from}/{to} format
// YYYY-MM-DD. limit dinaikkan dari default Stockbit (25) ke 200 supaya lebih
// besar peluang semua hari dalam rentang 10 hari kebagian baris; kalau ada
// saham yang sangat aktif dan masih ada hari kosong, naikkan lagi manual di
// Pengaturan (field ini bisa ditimpa, defaultnya cuma dipakai kalau kosong).

let state = {
  demoMode: false, stocks: [], watchlist: new Set(), backtests: [],
  selectedForBacktest: new Set(),
  portfolio: [], portoEditId: null, portoModalOpen: false, portoPrefill: null, selectedPorto: new Set(),
  tab: "screener", search: "", activePreset: null,
  visibleCols: new Set(), // diisi loadSettings() dari localStorage atau DEFAULT_VISIBLE_COLS
  colPickerOpen: false,
  filters: {sektor:[], syariahLabel:[], cekHarga:[], cekRsi:[], statusRsi:[], cekMacd:[], band:[], sinyalVolume:[], sinyalFrekuensi:[], keyakinanNaik:[], trendHarga:[], polaCandle:[], uangGedeMasuk:[], isBBSqueeze:[], valuasi:[]},
  showAdvancedFilters: false,
  rangeFilters: { 
    bbWidth:{min:"",max:""}, 
    atr14:{min:"",max:""}, 
    clv:{min:"",max:""},
    rsi7:{min:"",max:""},
    rsi21:{min:"",max:""},
    frequency:{min:"",max:""}
  },
  openDropdown: null, 
  sort: { col: null, asc: true },
  page: 1, limit: 10,
  expanded: new Set(),
  selectedTicker: null, chartData: [], chartLoading: false, selectedLevels: null, loading:false, chartSearch: "",
  detailTicker: null, detailTab: "teknikal",
  // Tab Sektoral: sektor mana yang sedang di-expand untuk melihat daftar
  // sahamnya, dan urutan sortir daftar saham di dalam tiap sektor.
  sektorExpanded: new Set(), sektorSearch: "", sektorSort: "changeDesc",
  // Sub-tab aktif di panel "ðŸ”¥ Top Movers" (bagian atas tab Sektoral):
  // gainer / loser / value / volume / frequency.
  topMoversTab: "gainer",
  // "Frequency Analyzer" = kolom baseline (rata-rata Frekuensi) di DB yang
  // dipakai sebagai pembanding di rule builder, namanya bisa beda-beda
  // tergantung skema tiap orang â€” jadi dibuat konfigurasi lewat Pengaturan,
  // bukan di-hardcode. Default "freq_ma20" (isi lewat "âš™ï¸ Pengaturan").
  freqAnalyzerCol: "freq_ma20",
  // Rules kustom ala "Edit Screener" Stockbit: {id, aKey, op, mult, bType, bKey, bConst}
  customRules: [],
  ruleBuilderOpen: true, // collapsible panel Rules Kustom â€” auto-collapse setelah "Muat" preset
  // Preset Screener kustom (disimpan di tabel custom_presets Supabase):
  // {id, name, rules, created_at}. selectedPresetId = preset yang dipilih
  // di dropdown (belum tentu sudah "dimuat" ke customRules).
  customPresets: [],
  selectedPresetId: "",
  presetsLoading: false,
  // Data Top 3 Broker Beli/Jual per saham (dari broker_summary, hari
  // trading terakhir yang tercatat) â€” dipakai rule kustom "Top 3 Broker
  // (Beli/Jual) contains <kode>" untuk cari saham yang didominasi broker
  // tertentu. Bentuk: { TICKER: { buy:["AK","YP","PD"], sell:[...] } }.
  top3BrokerData: {},
  top3BrokerDate: null,
  top3BrokerLoading: false,
  // Tab Broker Summary: top 5 broker buy/sell per saham per tanggal.
  // Data diisi MANUAL (dari screenshot akun Stockbit sendiri) lewat
  // form atau tempel CSV â€” bukan hasil scraping otomatis.
  bsStockCode: "", bsDate: todayLocalISO(),
  bsRows: [], bsEditRows: [], bsLoading: false,
  bsEditorOpen: false, bsMsg: "", bsMsgError: false, bsCsvText: "",
  // Broker Summary versi di dalam modal Detail Emiten (terkunci ke
  // ticker yang sedang dibuka, tabel Supabase sama dengan di atas).
  detailBsDate: todayLocalISO(),
  detailBsRows: [], detailBsEditRows: [], detailBsLoading: false,
  detailBsEditorOpen: false, detailBsMsg: "", detailBsMsgError: false, detailBsCsvText: "",
  // ==========================================
  // Tab "ðŸŽ¯ Target Bandar": dibangun DI ATAS data broker_summary yang
  // sudah ada (top 5 buy/sell manual per hari). Tiga bagian:
  // 1) Top 5 Bandar per emiten (agregat & klasifikasi selama N hari)
  // 2) Kalkulator Target Harga (Avg Bandar + ATR14 -> R1 / Max)
  // 3) Summary & Performance (hit-rate dari riwayat kalkulasi vs
  //    histori harga close asli di tabel `flows`)
  // ==========================================
  targetStockCode: "", targetWindowDays: 20,
  targetLoading: false, targetMsg: "", targetMsgError: false,
  targetBandarRows: [], targetTopBandar: [], targetWindowActualDays: 0,
  targetAvgBandar: null, targetCurrentPrice: null, targetAtr14: null, targetLevels: null,
  targetSummaryScope: "ticker", // "ticker" = emiten ini saja, "all" = semua emiten
  targetHistory: [], targetHistoryLoading: false,
  // ==========================================
  // Tab "ðŸŽ¯ Entry Price Scanner" â€” dibangun DI ATAS data broker_summary
  // yang sama (bukan tabel baru), tapi dipakai LINTAS SEMUA saham
  // sekaligus (bukan 1 ticker seperti Target Bandar). Lihat blok komentar
  // besar "ENTRY PRICE SCANNER" di dekat fungsi runEntryPriceScan() untuk
  // penjelasan lengkap logika & keterbatasannya.
  // ==========================================
  epsScanning: false, epsMsg: "", epsMsgError: false,
  epsRaw: null, // hasil scan mentah (per saham, per hari, per tipe broker) â€” lihat runEntryPriceScan()
  epsResults: [], // hasil scan yang SUDAH kena filter+urut aktif â€” dihitung ulang instan dari epsRaw
  epsFilters: {
    periode: "1w",          // "1w" | "2w" | "1m"
    broker: "both",         // "asing" | "lokal" | "both"
    konvergensi: "all",     // "all" | "menyatu" | "diam" | "menjauh"
    tanjakan: "all",        // "all" | "menanjak"
    minMutu: 0,             // 0 = semua
    minAkum: 0,             // Rp, 0 = semua
    minGap: "all",          // "all" | "dekat" (|gap|<=3%) | "nyangkut" (harga<VWAP)
    urut: new Set(["konvergensi","tanjakan"])  // bisa digabung; lihat EPS_SORTERS
  },
  epsInfoOpen: false,
  // ==========================================
  // Tab "â¬¢ Kraken Flow (ORCA)" â€” order-flow/bandarmology screener yang
  // meniru fitur "ORCA System" di ihsgscreener.com. BEDA dari Entry Price
  // Scanner: tidak butuh scan/fetch terpisah â€” semua sinyalnya dihitung
  // LANGSUNG dari snapshot EOD yang sudah ada di state.stocks (bid,
  // bidVolume, offer, offerVolume, avgTicket, crossingPct, frequency,
  // cClose/cHigh, foreignNet1D/5D/20D â€” semua kolom ini SUDAH dipetakan
  // di loadLive(), lihat komentar "Antrian bid/offer terbaik" & "Bandarmologi
  // ASLI dari IDX" di atas). Jadi tab ini reaktif â€” tidak ada tombol "Scan",
  // hasil langsung update tiap filter diubah (lihat computeOrcaResults()).
  //
  // UPDATE: bid/offer sekarang disimpan HISTORIS per hari di `flows`
  // (lihat sync-idx-full.mjs & sql/07_flows_bid_offer.sql) â€” jadi
  // "Durasi" di bawah bisa benar-benar mengagregasi SEMUA parameter
  // (Bid/Offer, ATS, Non-Regular, Frequency, dst) lewat jendela N hari,
  // bukan cuma Foreign+ seperti sebelumnya. Datanya ditarik LAZY (sekali,
  // 7 hari bursa terakhir) lewat ensureOrcaHistoryLoaded() begitu tab ini
  // dibuka â€” lihat orcaHistory* di bawah & loadOrcaHistory(). Selama
  // masih loading atau untuk tanggal SEBELUM migration 07 dijalankan
  // (bid/offer historis masih NULL), filter otomatis jatuh balik ke
  // snapshot hari terakhir dari state.stocks supaya tab tetap terpakai.
  // ==========================================
  orcaFilters: new Set(), // subset dari ORCA_FILTER_DEFS: bidOffer, ats, noSell, closeHigh, nonRegular, topVolume, frequency, foreignPlus, offerSlender
  orcaDuration: 3,        // 1..7 "hari" â€” jendela agregasi utk semua filter (lihat computeOrcaResults()) + Foreign+ (1D/5D/20D)
  orcaMarketCap: "all",   // all | 1t | 5t | 10t | 50t | 100t | custom
  orcaCustomCapT: "",     // dipakai kalau orcaMarketCap === "custom" (nilai dalam Triliun Rupiah)
  orcaMinAts: 0,          // 0 | 2e9 | 5e9 â€” "Filter Kuat" khusus Offer's Slender
  orcaMinFreq: 0,         // 0 | 2000 | 5000 â€” "Filter Kuat" khusus Offer's Slender
  orcaSearch: "",
  orcaInfoOpen: false,
  // Histori mentah dari `flows` (7 hari bursa terakhir, SEMUA emiten),
  // ditarik sekali lewat ensureOrcaHistoryLoaded() â€” map ticker -> array
  // baris harian terurut TERBARU dulu. computeOrcaResults() menghitung
  // ulang agregat jendela N-hari dari sini secara instan tiap render,
  // tanpa fetch ulang tiap kali Durasi diubah.
  orcaHistoryByTicker: null,
  orcaHistoryLoading: false,
  orcaHistoryError: null,
  orcaHistoryLoadedAt: null,
  orcaHistorySourceCounts: null, // { idx, stockbit } -- lihat loadOrcaHistory()
  // ==========================================
  // Live Data Stockbit (opsional, via token extension Chrome milik user).
  // stockbitLive: map ticker -> {loading, error, raw, mapped, fetchedAt}
  // Hanya diisi kalau user menekan tombol "Tarik" â€” tidak otomatis, supaya
  // tidak menghabiskan rate limit/kena banned dari akun Stockbit sendiri.
  // ==========================================
  stockbitToken: "", stockbitQuoteEndpoint: STOCKBIT_DEFAULT_QUOTE_EP,
  stockbitBrokerEndpoint: STOCKBIT_DEFAULT_BROKER_EP, stockbitProxyUrl: "",
  stockbitHistoricalEndpoint: STOCKBIT_DEFAULT_HISTORICAL_EP,
  detailHistoricalPeriod: "daily", 
  detailHistoricalFrom: null, detailHistoricalTo: null,detailHistoricalRows: [],
  detailHistoricalLoading: false, detailHistoricalMsg: "", detailHistoricalMsgError: false,
  // Panel "Bandingkan dengan IDX (flows)" di tab Historical Data â€” lihat
  // loadDetailCompare(). Cuma dihitung on-demand (klik tombol), tidak
  // otomatis, karena butuh 1 fetch tambahan ke tabel `flows`.
  detailCompareRows: [], detailCompareLoading: false, detailCompareMsg: "", detailCompareOpen: false,
  stockbitTokenExpiresAt: null, stockbitTokenSyncedAt: null, stockbitTokenSource: "manual",
  // Waktu (Date.now()) request Stockbit APA SAJA (quote, broker summary,
  // historical) terakhir kali benar-benar sukses â€” lihat stockbitRawRequest().
  // Dipakai buat banner status supaya user tahu data live basi sejak kapan
  // tanpa harus buka console. null = belum pernah berhasil sama sekali.
  stockbitLastSuccessAt: null,
  stockbitLive: {}, stockbitBulkLoading: false, stockbitBulkProgress: null,
  stockbitAutoRefresh: false, stockbitAutoRefreshIntervalSec: 60,
  // Riwayat Value (Rp) harian dari Stockbit per ticker, dipakai Smart Pick â€”
  // lihat catatan lengkap di loadLive() dan spStockbitValueRatio().
  stockbitValueHistory: {},
  // Tarik otomatis Top 5 Broker Buy/Sell (jumlah hari bursa bisa diatur
  // lewat input di UI, default 10) HANYA untuk ticker yang dicentang
  // (state.selectedForBacktest) â€” lihat fetchAndSaveBrokerSummaryBulk().
  stockbitBrokerBulkLoading: false, stockbitBrokerBulkProgress: null, stockbitBrokerBulkResults: [],
  bsAutoBulkDays: 10,
  // Periode Tarik Otomatis sekarang dipilih lewat tanggal Dariâ€“Sampai (bukan cuma "N hari
  // terakhir"), supaya bisa ambil rentang tanggal bebas di masa lalu, bukan cuma mundur dari
  // hari ini. Default diisi otomatis saat pertama render (lihat renderBrokerSummary) mengikuti
  // bsAutoBulkDays lama supaya perilaku awal tetap sama.
  bsAutoBulkFrom: null, bsAutoBulkTo: null,
  bsBulkResultsOpen: true, // status buka/tutup panel hasil Tarik Otomatis (accordion panah)
  // Tarik otomatis Historical Data (Daily) HANYA untuk ticker yang dicentang
  // di tab Screener â€” lihat fetchAndSaveHistoricalBulk(). Beda dengan broker
  // summary, endpoint historical TIDAK menerima rentang tanggal (cuma
  // {ticker}+{period}), jadi tiap ticker cukup 1x request lalu hasilnya
  // disaring ke rentang Dari-Sampai yang dipilih di UI.
  stockbitHistoricalBulkLoading: false, stockbitHistoricalBulkProgress: null, stockbitHistoricalBulkResults: [],
  hdAutoBulkFrom: null, hdAutoBulkTo: null,
  hdBulkResultsOpen: true,
  // ==========================================
  // Notifikasi Telegram (tabel telegram_settings di Supabase, dieksekusi
  // oleh Edge Function `telegram-notifier` yang dijadwalkan Cron server â€”
  // lihat sql/06_telegram_notifikasi.sql). State di sini cuma cerminan
  // untuk ditampilkan/diedit di âš™ï¸ Pengaturan, sumber kebenarannya tetap
  // tabel telegram_settings.
  // ==========================================
  telegramBotToken: "", telegramChatId: "", telegramEnabled: false,
  telegramOnlyMarketHours: true, telegramPresetIds: [],
  telegramFunctionUrl: "", telegramLoading: false,
  telegramLastRunAt: null, telegramLastRunNote: null,
  telegramTestMsg: "", telegramTestMsgError: false, telegramTesting: false,
  // ==========================================
  // Tab "âœ¨ Smart Pick": 5 sinyal siap-pakai (Area Demand, Throwback/Retest
  // Breakout, Liquidity Sweep, Bull Divergence, Early Breakout) dihitung
  // dari data live yang SUDAH ADA di enriched() â€” bukan model AI beneran,
  // cuma scoring rule-based dikemas mirip "AI Screener" ala Stockbit.
  // Hasil di kartu = live/hari-ini saja (bisa berubah tiap refresh).
  // Begitu "âœ“ Finalisasi Signal (EOD)" ditekan (idealnya setelah market
  // close), snapshot hari itu (ticker+signal+harga entry) dikunci ke
  // tabel Supabase `smart_pick_signals` supaya performanya (win rate,
  // rata-rata return) bisa dilacak dari waktu ke waktu â€” lihat
  // sql/07_smart_pick.sql.
  // ==========================================
  spOpenCriteria: null, // id sinyal yang panel "Kriteria"-nya sedang terbuka
  spRecapCollapsed: (localStorage.getItem("ihsg_sp_recap_collapsed") === "1"),
  spFinalizing: false, spMsg: "", spMsgError: false,
  spFilterType: "all", spFrom: "", spTo: "",
  spHistory: [], spHistoryLoading: false,
  spListOpenDefId: null
};

function fmtNum(n){ if(n===null||n===undefined) return "-"; return new Intl.NumberFormat("id-ID").format(n); }
function fmtDateID(iso){ // "2026-08-24" -> "24/08/2026"
  if(!iso) return "-";
  // Toleran juga ke datetime penuh ala timestamptz Supabase, mis.
  // "2026-08-24T00:00:00+00:00" â€” kalau kolom entry_date di server ternyata
  // timestamptz (bukan date polos), field ini akan berisi jam & offset zona
  // waktu sekaligus. Ambil 10 karakter pertama dulu (YYYY-MM-DD murni)
  // sebelum di-parse, supaya "T00:00:00+00:00" dkk tidak ikut kepotong ke
  // bagian tanggal/bulan dan menghasilkan tampilan rusak seperti
  // "03T00:00:00+00:00/09/2026".
  const s = String(iso).slice(0, 10);
  const [y,m,d] = s.split("-");
  if(!y||!m||!d || y.length!==4 || m.length!==2 || d.length!==2) return iso;
  return `${d}/${m}/${y}`;
}
// ==========================================
// HARI SEJAK TANGGAL ENTRY â€” dipakai kolom "Hari" di tab Backtest.
// Dihitung dari tanggal kalender lokal (bukan selisih ms mentah, supaya
// tidak kepengaruh jam/timezone â€” lihat catatan toLocalISODate di atas).
// Menerima "YYYY-MM-DD"; kalau kosong/tidak valid, return null (dirender "-").
// ==========================================
function daysSinceEntry(entryDateIso){
  if(!entryDateIso) return null;
  // Sama seperti fmtDateID() â€” toleran ke timestamptz penuh ("...T00:00:00+00:00"),
  // ambil 10 karakter pertama (YYYY-MM-DD murni) dulu sebelum di-parse.
  const parts = String(entryDateIso).slice(0, 10).split("-").map(Number);
  if(parts.length !== 3 || parts.some(isNaN)) return null;
  const [y,m,d] = parts;
  const entry = new Date(y, m-1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((today - entry) / 86400000);
  return diffDays < 0 ? 0 : diffDays;
}
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
  try{ state.freqAnalyzerCol = localStorage.getItem(LS_FREQ_ANALYZER_COL) || "freq_ma20"; }catch(e){ state.freqAnalyzerCol = "freq_ma20"; }
  try{
    state.stockbitToken = sanitizeStockbitToken(localStorage.getItem(LS_STOCKBIT_TOKEN) || "");
    state.stockbitQuoteEndpoint = localStorage.getItem(LS_STOCKBIT_QUOTE_EP) || STOCKBIT_DEFAULT_QUOTE_EP;
    state.stockbitBrokerEndpoint = localStorage.getItem(LS_STOCKBIT_BROKER_EP) || STOCKBIT_DEFAULT_BROKER_EP;
    state.stockbitHistoricalEndpoint = localStorage.getItem(LS_STOCKBIT_HISTORICAL_EP) || STOCKBIT_DEFAULT_HISTORICAL_EP;
    state.stockbitProxyUrl = localStorage.getItem(LS_STOCKBIT_PROXY) || "";
    const savedSrc = localStorage.getItem(LS_STOCKBIT_TOKEN_SOURCE);
    if(savedSrc === "extension" || savedSrc === "manual") state.stockbitTokenSource = savedSrc;
    const savedSyncedAt = parseInt(localStorage.getItem(LS_STOCKBIT_TOKEN_SYNCED_AT), 10);
    if(Number.isFinite(savedSyncedAt)) state.stockbitTokenSyncedAt = savedSyncedAt;
  }catch(e){}
  try{
    state.stockbitAutoRefresh = localStorage.getItem(LS_STOCKBIT_AUTOREFRESH) === "1";
    const savedSec = parseInt(localStorage.getItem(LS_STOCKBIT_AUTOREFRESH_SEC), 10);
    state.stockbitAutoRefreshIntervalSec = (Number.isFinite(savedSec) && savedSec >= STOCKBIT_AUTOREFRESH_MIN_SEC) ? savedSec : 60;
  }catch(e){}
  try{
    const savedRules = JSON.parse(localStorage.getItem(LS_CUSTOM_RULES)||"[]");
    state.customRules = Array.isArray(savedRules) ? savedRules : [];
  }catch(e){ state.customRules = []; }
  try{ state.telegramFunctionUrl = localStorage.getItem(LS_TELEGRAM_FUNCTION_URL) || ""; }catch(e){}
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
  else if(preset === "fundamental") state.visibleCols = new Set([
    "sektor","baggerScoreTotal","stockbitLive","cClose","changePct",
    "per","forwardPer","pbv","psr","peg","roe","roa","npm","opm",
    "eps","revenueGrowth","earningsGrowth","divYield","der",
    "currentRatio","beta","valuasi","marketCap"
  ]);
  else if(preset === "teknikal") state.visibleCols = new Set([
    "sektor","baggerScoreTotal","stockbitLive","cClose","changePct","cVol","volRatio",
    "rsi7","rsi21","cekHarga","cekRsi","cekMacd","trendHarga",
    "polaCandle","bbWidth","atr14","support","resistance",
    "ma21","ma50","ma100","ma200"
  ]);
  else if(preset === "bandarmologi") state.visibleCols = new Set([
    "sektor","baggerScoreTotal","stockbitLive","cClose","changePct","cVol","volRatio","turnover",
    "frequency","foreignNet1D","foreignNet5D","foreignNet20D","foreignUpDays",
    "avgTicket","crossingPct","uangGedeMasuk","band","keyakinanNaik"
  ]);
  else if(preset === "sahamSyariah") state.visibleCols = new Set([
    "sektor","syariahLabel","baggerScoreTotal","stockbitLive","cClose","changePct",
    "per","pbv","roe","divYield","valuasi","trendHarga"
  ]);
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
// ==========================================
// FREQUENCY ANALYZER (mirip kolom "Frequency" di screener Stockbit)
//
// "Frekuensi" = jumlah transaksi (kali matched) suatu saham dalam sehari â€”
// beda dari Volume (jumlah lembar/lot). Frekuensi tinggi dengan volume
// relatif kecil sering menandakan banyak investor ritel aktif keluar-masuk
// (bukan satu order besar), jadi dianalisis terpisah dari Volume.
//
// Rasio dihitung dari `frequency / freqAnalyzer` kalau backend sudah mengirim
// rata-rata 20 hari (freq_ma20); kalau kolom itu belum ada di skema DB,
// ratio-nya null dan UI menampilkan "-" (bukan 0) â€” sama seperti pola
// avgVolume3m/vol_ma20 di atas.
// ==========================================
function frequencySignal(ratio){
  if(ratio===null || ratio===undefined || isNaN(ratio)) return { ratio:null, label:"-", tone:"muted" };
  let label, tone;
  if(ratio>=2.5)      { label="Sangat Ramai"; tone="up"; }
  else if(ratio>=1.5) { label="Ramai"; tone="up"; }
  else if(ratio>=0.7) { label="Normal"; tone="muted"; }
  else                { label="Sepi"; tone="down"; }
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

// ==========================================
// SKOR BAGGER â€” implementasi persis dari formula_screening_saham_bagger.md
//
// Composite score 0-100 = Fundamental (40) + Momentum Teknikal (35) +
// Volume/Smart Money (25). Tiap sub-kriteria pass/fail sesuai section 2
// file .md tsb (tidak ada nilai parsial), supaya hasilnya bisa diaudit
// satu-satu lewat breakdown di Detail Emiten > tab Analisa.
//
// â‰¥75 = kandidat kuat, 50-74 = menarik tunggu konfirmasi, <50 = skip.
// Red flag (section 4 file .md) dihitung terpisah dari skor â€” dipakai
// sebagai peringatan tambahan, bukan pengurang skor.
// ==========================================
function computeBaggerScore(s){
  const num = v => (v===null || v===undefined || v==="" || isNaN(v)) ? null : Number(v);
  const rsi14 = num(s.rsi14);
  const rsiCrossUp = String(s.cekRsi||"").toLowerCase().includes("cross up");

  const fundItems = [
    { label:"Revenue Growth > 15%", pass: num(s.revenueGrowth) > 15, points:10 },
    { label:"Earnings Growth > 20%", pass: num(s.earningsGrowth) > 20, points:10 },
    { label:"ROE > 15%", pass: num(s.roe) > 15, points:10 },
    { label:"DER < 0,8", pass: num(s.der) != null && num(s.der) < 0.8, points:5 },
    { label:"PEG < 1", pass: num(s.peg) != null && num(s.peg) > 0 && num(s.peg) < 1, points:5 },
  ];

  const momItems = [
    { label:"RSI7 cross up RSI21 (RSI14 < 70)", pass: rsiCrossUp && rsi14 != null && rsi14 < 70, points:10 },
    { label:"MACD Histogram negatif â†’ positif", pass: num(s.prevMacdHist) != null && num(s.hist) != null && num(s.prevMacdHist) <= 0 && num(s.hist) > 0, points:10 },
    { label:"Harga > MA21 > MA50 > MA200", pass: [s.cClose,s.ma21,s.ma50,s.ma200].every(v=>v!=null) && s.cClose > s.ma21 && s.ma21 > s.ma50 && s.ma50 > s.ma200, points:10 },
    { label:"Stoch K cross up Stoch D dari oversold", pass: [s.prevStochK,s.prevStochD,s.stochK,s.stochD].every(v=>v!=null) && s.prevStochK < s.prevStochD && s.stochK > s.stochD && s.prevStochK <= 30, points:5 },
  ];

  const volItems = [
    { label:"Volume Ratio > 1,5x", pass: num(s.volRatio) > 1.5, points:10 },
    { label:"Foreign Net 5D > 0 & Hari Asing+ â‰¥ 3", pass: num(s.foreignNet5D) > 0 && num(s.foreignUpDays) >= 3, points:10 },
    { label:"BB Squeeze lalu breakout EMA21 H", pass: String(s.isBBSqueeze||"").includes("Ya") && s.cClose != null && s.ema21H != null && s.cClose > s.ema21H, points:5 },
  ];

  const sum = items => items.reduce((a,i)=> a + (i.pass ? i.points : 0), 0);
  const fundScore = sum(fundItems), momScore = sum(momItems), volScore = sum(volItems);
  const total = fundScore + momScore + volScore;

  let tier, tone;
  if (total >= 75) { tier = "Kandidat Kuat"; tone = "up"; }
  else if (total >= 50) { tier = "Menarik, Tunggu Konfirmasi"; tone = "gold"; }
  else { tier = "Skip"; tone = "down"; }

  // Red flag â€” section 4 formula.md
  const flags = [];
  if (String(s.valuasi||"").includes("Kemahalan") && rsi14 != null && rsi14 > 80) {
    flags.push("Valuasi Overvalued + RSI14 > 80 â†’ rawan profit taking, hati-hati entry baru (pola ini persis kasus AADI di contoh formula).");
  }
  const der = num(s.der), currentRatio = num(s.currentRatio);
  if (der != null && der > 1 && currentRatio != null && currentRatio < 1) {
    flags.push("DER tinggi (>1) & Current Ratio < 1 â†’ risiko keuangan, gain teknikal bisa berbalik cepat kalau ada bad news.");
  }
  const fn5 = num(s.foreignNet5D), fn20 = num(s.foreignNet20D);
  if (num(s.volRatio) > 1.5 && fn5 != null && fn5 < 0 && fn20 != null && fn20 < 0) {
    flags.push("Volume breakout tapi Net Asing negatif terus â†’ kemungkinan cuma ritel/bandar lokal, lebih rawan distribusi.");
  }
  const pola = String(s.polaCandle||"");
  if (/bearish|shooting star|hanging man/i.test(pola) && s.resistance != null && s.cClose != null && s.cClose >= s.resistance*0.98) {
    flags.push("Pola candle bearish reversal di area resisten kuat â†’ tunda entry meski skor fundamental tinggi.");
  }

  return { total, fundScore, momScore, volScore, fundItems, momItems, volItems, tier, tone, flags };
}

async function loadLive(){
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    openSettings();
    return;
  }

  state.loading = true; showError(""); render();
  try {
    const [stocksRes, portoRes, backtestRes, wlRes, presetsRes, stockbitHistRes] = await Promise.all([
      // Ambil dari VIEW gabungan, bukan tabel stocks mentah: stocks_screener
      // sudah menggabungkan fundamental+teknikal (tabel stocks) dengan
      // bandarmologi asli dari IDX (view flow_summary), lewat left join.
      fetch(`${SUPABASE_URL}/stocks_screener?select=*`, { headers: getSupaHeaders(), cache: "no-store" }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/portfolios?select=*`, { headers: getSupaHeaders(), cache: "no-store" }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/backtest_sessions?select=*,backtest_items(*)`, { headers: getSupaHeaders(), cache: "no-store" }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/watchlists?select=ticker`, { headers: getSupaHeaders(), cache: "no-store" }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/custom_presets?select=*&order=created_at.desc`, { headers: getSupaHeaders(), cache: "no-store" }).then(r => r.json()),
      // Riwayat Value (Rp) harian dari Stockbit (tabel price_history_stockbit,
      // diisi lewat tombol "ðŸ“… Historical" di Screener / tab Historical Data
      // di modal Detail Emiten) â€” dipakai Smart Pick (Area Demand & Liquidity
      // Sweep) untuk memvalidasi volume spike pakai NILAI transaksi riil,
      // bukan cuma rasio volume lembar dari `flows`. Cuma ticker yang PERNAH
      // ditarik manual yang akan punya data di sini â€” untuk ticker lain,
      // Smart Pick tetap fallback ke volRatio seperti biasa (lihat
      // spStockbitValueRatio()). .catch(()=>[]) supaya kalau tabelnya belum
      // dibuat (migration 08 belum dijalankan), loadLive() tidak ikut gagal.
      fetch(`${SUPABASE_URL}/price_history_stockbit?period=eq.daily&select=stock_code,trade_date,value_idr&order=trade_date.desc&limit=4000`, { headers: getSupaHeaders(), cache: "no-store" })
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
    ]);

    if (stocksRes.message) throw new Error(stocksRes.message);

    state.stocks = stocksRes.map(r => ({
      ticker: r.ticker, sektor: r.sector, name: r.name, industry: r.industry,
      // Kolom `syariah` di DB dipakai kalau sudah diisi; kalau masih
      // kosong (belum dilabeli backend), fallback ke daftar statis
      // SYARIAH_TICKERS di atas supaya filter tetap bisa dipakai.
      syariah: (r.syariah === null || r.syariah === undefined || r.syariah === "") ? isSyariah(r.ticker) : r.syariah,
      // Catatan mapping: skema gabungan tidak lagi punya c_high/c_low/c_vol
      // terpisah â€” dipetakan ke kolom fundamental yang sudah ada supaya
      // tidak ada dua kolom untuk hal yang sama (day_high dulu diisi Yahoo
      // quote, sekarang jadi satu-satunya sumber High hari ini).
      cOpen: r.c_open, cHigh: r.day_high, cLow: r.day_low, cClose: r.price, cVol: r.volume,
      changePct: r.change_pct, turnover: r.turnover, valueTraded: numOrNull(r.value_traded), vwap20: r.vwap20,
      volRatio: numOrNull(r.vol_ratio), volMA20: numOrNull(r.vol_ma20), avgVolume3m: numOrNull(r.avg_volume_3m),
      // Frekuensi transaksi (jumlah kali matched, bukan jumlah lembar) â€”
      // nama kolom di beberapa skema IDX kadang "frequency", kadang
      // "frekuensi", jadi dua-duanya dicoba.
      // "freqAnalyzer" = baseline rata-rata Frekuensi (mirip "Volume MA 100"
      // punya Volume) yang dipakai rule builder, misal "Frequency > 5 *
      // Frequency Analyzer" â€” nama kolomnya di DB dikonfigurasi lewat
      // Pengaturan (state.freqAnalyzerCol) karena bisa beda tiap skema.
      frequency: numOrNull(r.frequency ?? r.frekuensi),
      freqAnalyzer: numOrNull(r[state.freqAnalyzerCol] ?? r.freq_ma20 ?? r.frequency_ma20),
      avgFrequency3m: numOrNull(r.avg_frequency_3m ?? r.avg_frekuensi_3m),
      // Antrian bid/offer terbaik â€” snapshot EOD dari sync-idx-full.mjs
      // (bukan live order book, lihat catatan di skrip). Null kalau
      // memang tidak ada antrian tercatat hari itu.
      bid: numOrNull(r.bid), bidVolume: numOrNull(r.bid_volume),
      offer: numOrNull(r.offer), offerVolume: numOrNull(r.offer_volume),
      per: r.per, forwardPer: numOrNull(r.forward_per), pbv: r.pbv, roe: r.roe, divYield: r.dividend_yield,
      bookValue: numOrNull(r.book_value), psr: numOrNull(r.psr), peg: numOrNull(r.peg),
      roa: numOrNull(r.roa), npm: numOrNull(r.npm), opm: numOrNull(r.opm), eps: numOrNull(r.eps),
      revenueGrowth: numOrNull(r.revenue_growth), earningsGrowth: numOrNull(r.earnings_growth),
      dividendRate: numOrNull(r.dividend_rate), payoutRatio: numOrNull(r.payout_ratio),
      beta: numOrNull(r.beta), der: numOrNull(r.der), currentRatio: numOrNull(r.current_ratio),
      support: r.support, resistance: r.resistance, high52w: r.week52_high, low52w: r.week52_low,
      week52ChangePct: numOrNull(r.week52_change_pct),
      ema21H: r.ema21h, ema21L: r.ema21l, ma21: r.ma21, ma50: r.ma50, ma100: r.ma100, ma200: r.ma200,
      rsi7: r.rsi7, rsi21: r.rsi21, hist: r.macd_hist, histPrev: numOrNull(r.prev_macd_hist),
      fib: r.fibonacci, 
      cekHarga: r.cek_harga, cekRsi: r.cek_rsi, statusRsi: r.status_rsi, cekMacd: r.cek_macd, cekVolume: r.cek_volume,
      keyakinanNaik: r.keyakinan_naik,
      trendHarga: r.trend_harga, candleKemarin: r.candle_kemarin, candleHariIni: r.candle_hari_ini, polaCandle: r.pola_candle,
      uangGedeMasuk: boolLabel(r.uang_gede_masuk), bbWidth: numOrNull(r.bb_width),
      isBBSqueeze: boolLabel(r.is_bb_squeeze), atr14: numOrNull(r.atr14), valuasi: r.valuasi ?? "-", clv: numOrNull(r.clv),
      ema89: numOrNull(r.ema89), prevHigh: numOrNull(r.prev_high), prevLow: numOrNull(r.prev_low), prevVol: numOrNull(r.prev_vol),
      stochK: numOrNull(r.stoch_k), stochD: numOrNull(r.stoch_d), prevStochK: numOrNull(r.prev_stoch_k), prevStochD: numOrNull(r.prev_stoch_d),

      // --- Sudah ada di DB tapi sebelumnya belum pernah dipetakan ---
      prevClose: numOrNull(r.prev_close), macd: numOrNull(r.macd), signal: numOrNull(r.signal),
      changeAbs: numOrNull(r.change_abs),
      // Kapan baris ini terakhir diupdate sync-idx-full.mjs â€” dipakai untuk
      // indikator "data seberapa fresh" di UI (mis. badge "diupdate 2j lalu"
      // atau warning kalau data lebih tua dari 1 hari bursa).
      updatedAt: r.updated_at,

      // --- Perluasan indikator dari stock_indicators_ext (via stocks_screener) ---
      priceMa5: numOrNull(r.price_ma5), priceMa10: numOrNull(r.price_ma10), priceMa20: numOrNull(r.price_ma20),
      prevPriceMa5: numOrNull(r.prev_price_ma5), prevPriceMa10: numOrNull(r.prev_price_ma10),
      prevPriceMa20: numOrNull(r.prev_price_ma20), prevPriceMa50: numOrNull(r.prev_price_ma50),
      prevPriceMa100: numOrNull(r.prev_price_ma100), prevPriceMa200: numOrNull(r.prev_price_ma200),
      volumeMa5: numOrNull(r.volume_ma5), volumeMa10: numOrNull(r.volume_ma10),
      volumeMa50: numOrNull(r.volume_ma50), volumeMa100: numOrNull(r.volume_ma100), volumeMa200: numOrNull(r.volume_ma200),
      prevVolumeMa5: numOrNull(r.prev_volume_ma5), prevVolumeMa10: numOrNull(r.prev_volume_ma10),
      prevVolumeMa20: numOrNull(r.prev_volume_ma20), prevVolumeMa50: numOrNull(r.prev_volume_ma50),
      prevVolumeMa100: numOrNull(r.prev_volume_ma100),
      valueMa5: numOrNull(r.value_ma5), valueMa10: numOrNull(r.value_ma10), valueMa20: numOrNull(r.value_ma20),
      valueMa50: numOrNull(r.value_ma50), valueMa100: numOrNull(r.value_ma100), valueMa200: numOrNull(r.value_ma200),
      frequencyMa50: numOrNull(r.frequency_ma50), freqSpike: r.freq_spike,
      rsi14: numOrNull(r.rsi14), prevRsi14: numOrNull(r.prev_rsi14),
      prevMacd: numOrNull(r.prev_macd), prevSignal: numOrNull(r.prev_signal), prevMacdHist: numOrNull(r.prev_macd_hist),
      bbUpper: numOrNull(r.bb_upper), bbLower: numOrNull(r.bb_lower),
      adr14: numOrNull(r.adr14), prevAtr14: numOrNull(r.prev_atr14), prevAdr14: numOrNull(r.prev_adr14),
      vwap: numOrNull(r.vwap),
      ema5: numOrNull(r.ema5), ema10: numOrNull(r.ema10), ema20: numOrNull(r.ema20),
      ema50: numOrNull(r.ema50), ema100: numOrNull(r.ema100), ema200: numOrNull(r.ema200),
      prevEma200: numOrNull(r.prev_ema200),
      fibP: numOrNull(r.fib_p), fibR1: numOrNull(r.fib_r1), fibR2: numOrNull(r.fib_r2), fibR3: numOrNull(r.fib_r3),
      fibS1: numOrNull(r.fib_s1), fibS2: numOrNull(r.fib_s2), fibS3: numOrNull(r.fib_s3),

      // --- Bandarmologi ASLI dari IDX (bukan proxy volume) ---
      // Null berarti "belum ditransaksikan" (suspensi dsb), bukan nol â€”
      // lihat catatan flow_summary di database. Jangan format null jadi 0.
      capCategory: r.cap_category, pos52w: numOrNull(r.pos_52w),
      // Market Cap: dipakai kalau kolom `market_cap` sudah ada di
      // stocks_screener. Kalau belum, coba turunkan dari
      // `shares_outstanding` x harga. Kalau dua-duanya belum ada di
      // skema, nilainya null dan UI menampilkan "-" (bukan 0) â€”
      // lihat catatan di README/SQL soal menambah kolom ini.
      sharesOutstanding: numOrNull(r.shares_outstanding),
      marketCap: numOrNull(r.market_cap) ?? (numOrNull(r.shares_outstanding) != null ? numOrNull(r.shares_outstanding) * (numOrNull(r.price) || 0) : null),
      vsMa50Pct: numOrNull(r.vs_ma50_pct), vsMa200Pct: numOrNull(r.vs_ma200_pct),
      foreignNet1D: numOrNull(r.foreign_net_1d), foreignNet5D: numOrNull(r.foreign_net_5d),
      foreignNet20D: numOrNull(r.foreign_net_20d), foreignUpDays: numOrNull(r.foreign_up_days),
      avgTicket: numOrNull(r.avg_ticket), crossingPct: numOrNull(r.crossing_pct),
      flowSeries: Array.isArray(r.flow_series) ? r.flow_series : null,
      flowDate: r.flow_date, flowDays: numOrNull(r.flow_days),
    }));

    // Kalau salah satu dari ketiga fetch ini gagal (mis. RLS menolak),
    // Supabase membalas objek {message:...}, bukan array â€” dulu ini
    // dilewati diam-diam tanpa pemberitahuan apa pun ke user. Sekarang
    // dikumpulkan jadi peringatan yang ditampilkan di errorMsg supaya
    // kelihatan kalau porto/backtest/watchlist gagal dimuat.
    const warnings = [];

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
    } else {
       console.warn("Gagal memuat portfolios:", portoRes);
       warnings.push("Portofolio gagal dimuat" + (portoRes && portoRes.message ? ` (${portoRes.message})` : ""));
    }

    if (Array.isArray(backtestRes)) {
       state.backtests = backtestRes.map(b => ({
         id: b.id, date: b.session_date,
         items: b.backtest_items.map(it => ({
            ticker: it.ticker, entryPrice: it.entry_price, filterStr: it.notes, sumber: it.source, kriteria: it.criteria,
            // it.entry_date butuh kolom `entry_date` di backtest_items (lihat
            // catatan migrasi di syncBacktestToSupabase). Selama kolom itu
            // belum ada di server, it.entry_date akan undefined â€” fallback ke
            // tanggal sesi (b.session_date, format "YYYY-MM-DD" dari Supabase)
            // supaya kolom "Tanggal Entry"/"Hari" tetap menampilkan sesuatu
            // yang masuk akal, bukan kosong.
            entryDate: it.entry_date || b.session_date || null
         }))
       })).sort((a,b) => String(b.id).localeCompare(String(a.id)));
       saveBacktests();
    } else {
       console.warn("Gagal memuat backtest_sessions:", backtestRes);
       warnings.push("Backtest gagal dimuat" + (backtestRes && backtestRes.message ? ` (${backtestRes.message})` : ""));
    }

    if (Array.isArray(wlRes)) {
        state.watchlist = new Set(wlRes.map(w => w.ticker));
        saveWatchlist();
    } else {
        console.warn("Gagal memuat watchlists:", wlRes);
        warnings.push("Watchlist gagal dimuat" + (wlRes && wlRes.message ? ` (${wlRes.message})` : ""));
    }

    if (Array.isArray(presetsRes)) {
       state.customPresets = presetsRes;
    } else {
       console.warn("Gagal memuat custom_presets:", presetsRes);
       warnings.push("Preset screener gagal dimuat" + (presetsRes && presetsRes.message ? ` (${presetsRes.message})` : ""));
    }

    if (warnings.length) showError(warnings.join(" Â· "));

    // Susun state.stockbitValueHistory: { TICKER: [{date, value_idr}, ...] }
    // Tidak perlu warning kalau kosong â€” ini fitur opsional (fallback ke
    // volRatio biasa kalau tidak ada), bukan data wajib.
    if(Array.isArray(stockbitHistRes) && stockbitHistRes.length){
      const grouped = {};
      stockbitHistRes.forEach(r => {
        if(r.value_idr == null) return;
        (grouped[r.stock_code] ||= []).push({ date: r.trade_date, value_idr: Number(r.value_idr) || 0 });
      });
      state.stockbitValueHistory = grouped;
    } else {
      state.stockbitValueHistory = {};
    }

  } catch (e) {
    showError("Gagal terhubung ke Database Supabase: " + e.message);
  }
  state.loading = false; render();

  // Top 3 Broker Beli/Jual dimuat terpisah (tidak di-await bareng fetch di
  // atas) supaya screener utama tetap cepat tampil â€” begitu selesai, dia
  // render() ulang sendiri untuk mengisi filter "Top 3 Broker".
  loadTop3BrokerData();
}

// Ambil top 3 broker BELI dan top 3 broker JUAL per saham, dari trade_date
// PALING BARU yang tercatat di tabel broker_summary (bukan per-saham,
// karena kolomnya diisi manual/bulk â€” kalau ditarik per saham query bisa
// sangat banyak). Asumsinya sama seperti logic skip-fetch broker summary:
// hari trading terakhir dianggap representatif untuk "kondisi terkini".
async function loadTop3BrokerData(){
  if(!SUPABASE_URL || !SUPABASE_KEY) return;
  state.top3BrokerLoading = true;
  try{
    const dateRes = await fetch(`${SUPABASE_URL}/broker_summary?select=trade_date&order=trade_date.desc&limit=1`, { headers: getSupaHeaders(), cache: "no-store" });
    const dateRows = await dateRes.json();
    const latestDate = Array.isArray(dateRows) && dateRows[0] ? dateRows[0].trade_date : null;
    if(!latestDate){
      state.top3BrokerData = {}; state.top3BrokerDate = null;
      state.top3BrokerLoading = false; render();
      return;
    }

    const res = await fetch(`${SUPABASE_URL}/broker_summary?select=stock_code,side,rank,broker_code&trade_date=eq.${latestDate}&rank=lte.3&order=stock_code.asc,side.asc,rank.asc`, { headers: getSupaHeaders(), cache: "no-store" });
    const rows = await res.json();
    const map = {};
    if(Array.isArray(rows)){
      rows.forEach(r => {
        const ticker = String(r.stock_code || "").trim().toUpperCase();
        const code = String(r.broker_code || "").trim().toUpperCase();
        if(!ticker || !code) return;
        if(!map[ticker]) map[ticker] = { buy: [], sell: [] };
        if(r.side === "buy") map[ticker].buy.push(code);
        else if(r.side === "sell") map[ticker].sell.push(code);
      });
    }
    state.top3BrokerData = map;
    state.top3BrokerDate = latestDate;
  }catch(e){
    console.warn("Gagal memuat Top 3 Broker:", e);
  }
  state.top3BrokerLoading = false;
  render();
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
      await supaFetch(`${SUPABASE_URL}/watchlists`, { method: "POST", headers: { ...getSupaHeaders(), "Prefer": "resolution=merge-duplicates" }, body: JSON.stringify({ticker}) });
    } else {
      await supaFetch(`${SUPABASE_URL}/watchlists?ticker=eq.${ticker}`, { method: "DELETE", headers: getSupaHeaders() });
    }
  } catch(e){
    // Gagal sinkron ke Supabase â€” batalkan perubahan lokal supaya UI
    // tidak "berbohong" bahwa item sudah tersimpan, dan beri tahu user
    // alasannya (bukan diam-diam gagal seperti sebelumnya).
    isFav ? state.watchlist.add(ticker) : state.watchlist.delete(ticker);
    saveWatchlist();
    showError(`Gagal menyimpan watchlist ke Supabase: ${e.message}`);
    render();
  }
}

function openDetail(ticker){
  state.detailTicker = ticker;
  state.detailTab = "teknikal";
  state.detailBsRows = []; state.detailBsEditRows = [];
  state.detailBsMsg = ""; state.detailBsMsgError = false;
  state.detailBsEditorOpen = false; state.detailBsCsvText = "";
  state.detailHistoricalRows = []; state.detailHistoricalMsg = ""; state.detailHistoricalMsgError = false;
  state.detailCompareRows = []; state.detailCompareMsg = ""; state.detailCompareOpen = false;
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

function openSmartPickList(defId){
  state.spListOpenDefId = defId;
  render();
}
function closeSmartPickList(){
  state.spListOpenDefId = null;
  render();
}

function dItem(label, valueHtml, isText){
  return `<div class="detail-item"><div class="lbl">${label}</div><div class="val ${isText?'text':''}">${valueHtml==null||valueHtml===""?'-':valueHtml}</div></div>`;
}
function baggerBreakdownRows(items){
  return items.map(i => `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:3px 0;font-size:11.5px;line-height:1.3;">
    <span style="color:${i.pass?'var(--up)':'var(--muted)'};">${i.pass?'âœ…':'â–«ï¸'} ${i.label}</span>
    <span class="mono" style="color:${i.pass?'var(--up)':'var(--muted)'};white-space:nowrap;">${i.pass?'+':''}${i.pass?i.points:0}/${i.points}</span>
  </div>`).join("");
}
function dNum(n, opts){
  opts = opts || {};
  if(n===null||n===undefined||n==="") return "-";
  const num = Number(n);
  if(isNaN(num)) return String(n);
  return (opts.plusSign && num>=0 ? "+" : "") + fmtNum(opts.decimals!=null ? +num.toFixed(opts.decimals) : num) + (opts.suffix||"");
}

function renderImbalanceBar(bidVol, offerVol) {
    const tb = Number(bidVol) || 0;
    const to = Number(offerVol) || 0;
    const total = tb + to;
    if(total === 0) return '';
    const bidPct = (tb / total) * 100;
    const offerPct = 100 - bidPct;
    return `
    <div style="margin-top:12px; margin-bottom:12px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid var(--border);">
        <div style="font-size:11px; color:var(--muted); text-transform:uppercase; margin-bottom:8px; text-align:center;">âš–ï¸ Tekanan Orderbook (Bid vs Offer)</div>
        <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px; font-weight:bold;">
            <span style="color:var(--up);">Bid Power: ${bidPct.toFixed(1)}%</span>
            <span style="color:var(--down);">Offer Power: ${offerPct.toFixed(1)}%</span>
        </div>
        <div style="height:8px; background:var(--down); border-radius:4px; display:flex; overflow:hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);">
            <div style="width:${bidPct}%; background:var(--up); height:100%;"></div>
        </div>
    </div>`;
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
      ${dItem("Value Traded IDX (Rp)", dNum(s.valueTraded))}
      ${dItem("VWAP 20D", dNum(s.vwap20))}
      ${dItem("Avg Volume 3M", dNum(s.avgVolume3m))}
    </div>

    <div class="detail-subtitle">Antrian Bid / Offer (snapshot EOD)</div>
    <div class="detail-grid">
      ${dItem("Bid", `<span style="color:var(--up)">${dNum(s.bid)}</span>`, true)}
      ${dItem("Bid Vol (Lot)", dNum(s.bidVolume ? s.bidVolume / 100 : 0))}
      ${dItem("Offer", `<span style="color:var(--down)">${dNum(s.offer)}</span>`, true)}
      ${dItem("Offer Vol (Lot)", dNum(s.offerVolume ? s.offerVolume / 100 : 0))}
    </div>
    ${renderImbalanceBar(s.bidVolume, s.offerVolume)}

    <div class="detail-subtitle">Hari Sebelumnya (Pembanding)</div>
    <div class="detail-grid">
      ${dItem("Prev Close", dNum(s.prevClose))}
      ${dItem("Prev High", dNum(s.prevHigh))}
      ${dItem("Prev Low", dNum(s.prevLow))}
      ${dItem("Prev Volume", dNum(s.prevVol))}
      ${dItem("Perubahan Volume 1D%", s.volChangePct!=null?dNum(s.volChangePct,{plusSign:true,decimals:2,suffix:'%'}):"-", true)}
    </div>

    <div class="detail-subtitle">Level Support / Resisten & Fibonacci Retracement</div>
    <div class="detail-grid">
      ${dItem("Support", `<span style="color:var(--down)">${dNum(s.support)}</span>`, true)}
      ${dItem("Resisten", `<span style="color:var(--up)">${dNum(s.resistance)}</span>`, true)}
      ${dItem("52W Tinggi", dNum(s.high52w))}
      ${dItem("52W Rendah", dNum(s.low52w))}
      ${dItem("52W Change%", s.week52ChangePct!=null?dNum(s.week52ChangePct,{plusSign:true,decimals:2,suffix:'%'}):"-", true)}
      ${dItem("Posisi dalam 52W%", s.pos52w!=null?dNum(s.pos52w,{decimals:1,suffix:'%'}):"-", true)}
      ${dItem("Fib 23.6%", dNum(s.fib?.f236))}
      ${dItem("Fib 38.2%", dNum(s.fib?.f382))}
      ${dItem("Fib 50%", dNum(s.fib?.f50))}
      ${dItem("Fib 61.8%", dNum(s.fib?.f618))}
    </div>

    <div class="detail-subtitle">Pivot Point Fibonacci Klasik</div>
    <div class="detail-grid">
      ${dItem("Pivot (P)", dNum(s.fibP))}
      ${dItem("Resisten 1", dNum(s.fibR1))}
      ${dItem("Resisten 2", dNum(s.fibR2))}
      ${dItem("Resisten 3", dNum(s.fibR3))}
      ${dItem("Support 1", dNum(s.fibS1))}
      ${dItem("Support 2", dNum(s.fibS2))}
      ${dItem("Support 3", dNum(s.fibS3))}
    </div>

    <div class="detail-subtitle">Moving Average Harga & Trend</div>
    <div class="detail-grid">
      ${dItem("MA5", dNum(s.priceMa5))}
      ${dItem("MA10", dNum(s.priceMa10))}
      ${dItem("MA20", dNum(s.priceMa20))}
      ${dItem("MA21", dNum(s.ma21))}
      ${dItem("MA50", dNum(s.ma50))}
      ${dItem("MA100", dNum(s.ma100))}
      ${dItem("MA200", dNum(s.ma200))}
      ${dItem("Trend Harga (MA)", pillHtml(s.trendHarga||"-", trendTone(s.trendHarga)), true)}
      ${dItem("Prev MA5", dNum(s.prevPriceMa5))}
      ${dItem("Prev MA10", dNum(s.prevPriceMa10))}
      ${dItem("Prev MA20", dNum(s.prevPriceMa20))}
      ${dItem("Prev MA50", dNum(s.prevPriceMa50))}
      ${dItem("Prev MA100", dNum(s.prevPriceMa100))}
      ${dItem("Prev MA200", dNum(s.prevPriceMa200))}
    </div>

    <div class="detail-subtitle">Exponential Moving Average (EMA)</div>
    <div class="detail-grid">
      ${dItem("EMA5", dNum(s.ema5))}
      ${dItem("EMA10", dNum(s.ema10))}
      ${dItem("EMA20", dNum(s.ema20))}
      ${dItem("EMA21 High", dNum(s.ema21H))}
      ${dItem("EMA21 Low", dNum(s.ema21L))}
      ${dItem("EMA50", dNum(s.ema50))}
      ${dItem("EMA89", dNum(s.ema89))}
      ${dItem("EMA100", dNum(s.ema100))}
      ${dItem("EMA200", dNum(s.ema200))}
      ${dItem("Prev EMA200", dNum(s.prevEma200))}
      ${dItem("vs MA50%", s.vsMa50Pct!=null?dNum(s.vsMa50Pct,{plusSign:true,decimals:2,suffix:'%'}):"-", true)}
      ${dItem("vs MA200%", s.vsMa200Pct!=null?dNum(s.vsMa200Pct,{plusSign:true,decimals:2,suffix:'%'}):"-", true)}
    </div>

    <div class="detail-subtitle">Momentum: RSI, Stochastic & MACD</div>
    <div class="detail-grid">
      ${dItem("RSI 7", rsiGaugeHtml(s.rsi7), true)}
      ${dItem("RSI 14", s.rsi14!=null?Number(s.rsi14).toFixed(1):"-")}
      ${dItem("RSI 21", s.rsi21!=null?Number(s.rsi21).toFixed(1):"-")}
      ${dItem("Prev RSI 14", s.prevRsi14!=null?Number(s.prevRsi14).toFixed(1):"-")}
      ${dItem("Stoch K", s.stochK??"-")}
      ${dItem("Stoch D", s.stochD??"-")}
      ${dItem("Prev Stoch K", s.prevStochK??"-")}
      ${dItem("Prev Stoch D", s.prevStochD??"-")}
      ${dItem("MACD", s.macd!=null?Number(s.macd).toFixed(3):"-")}
      ${dItem("MACD Signal", s.signal!=null?Number(s.signal).toFixed(3):"-")}
      ${dItem("MACD Histogram", s.hist!=null?Number(s.hist).toFixed(3):"-")}
      ${dItem("Prev MACD", s.prevMacd!=null?Number(s.prevMacd).toFixed(3):"-")}
      ${dItem("Prev MACD Signal", s.prevSignal!=null?Number(s.prevSignal).toFixed(3):"-")}
      ${dItem("Prev MACD Hist", s.prevMacdHist!=null?Number(s.prevMacdHist).toFixed(3):"-")}
    </div>

    <div class="detail-subtitle">Volatilitas: ATR, ADR & Bollinger Bands</div>
    <div class="detail-grid">
      ${dItem("ATR 14", s.atr14??"-")}
      ${dItem("Prev ATR 14", s.prevAtr14??"-")}
      ${dItem("ADR 14", s.adr14??"-")}
      ${dItem("Prev ADR 14", s.prevAdr14??"-")}
      ${dItem("BB Width", s.bbWidth??"-")}
      ${dItem("BB Upper", dNum(s.bbUpper))}
      ${dItem("BB Lower", dNum(s.bbLower))}
      ${dItem("CLV", s.clv??"-")}
      ${dItem("VWAP (Raw)", dNum(s.vwap))}
    </div>

    <div class="detail-subtitle">Volume, Value & Frekuensi Historis</div>
    <div class="detail-grid">
      ${dItem("Vol Ratio (vs MA20)", s.volRatio!=null?Number(s.volRatio).toFixed(2)+"x":"-", true)}
      ${dItem("Volume MA5", dNum(s.volumeMa5))}
      ${dItem("Volume MA10", dNum(s.volumeMa10))}
      ${dItem("Volume MA20", dNum(s.volMA20))}
      ${dItem("Volume MA50", dNum(s.volumeMa50))}
      ${dItem("Volume MA100", dNum(s.volumeMa100))}
      ${dItem("Volume MA200", dNum(s.volumeMa200))}
      ${dItem("Prev Volume MA5", dNum(s.prevVolumeMa5))}
      ${dItem("Prev Volume MA10", dNum(s.prevVolumeMa10))}
      ${dItem("Prev Volume MA20", dNum(s.prevVolumeMa20))}
      ${dItem("Prev Volume MA50", dNum(s.prevVolumeMa50))}
      ${dItem("Prev Volume MA100", dNum(s.prevVolumeMa100))}
      ${dItem("Value MA5 (Rp)", dNum(s.valueMa5))}
      ${dItem("Value MA10 (Rp)", dNum(s.valueMa10))}
      ${dItem("Value MA20 (Rp)", dNum(s.valueMa20))}
      ${dItem("Value MA50 (Rp)", dNum(s.valueMa50))}
      ${dItem("Value MA100 (Rp)", dNum(s.valueMa100))}
      ${dItem("Value MA200 (Rp)", dNum(s.valueMa200))}
      ${dItem("Frekuensi Transaksi", dNum(s.frequency))}
      ${dItem("Frequency Analyzer", dNum(s.freqAnalyzer))}
      ${dItem("Frequency MA50", dNum(s.frequencyMa50))}
      ${dItem("Avg Frekuensi 3M", dNum(s.avgFrequency3m))}
      ${dItem("Freq Spike", s.freqSpike||"-", true)}
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
  const graham = grahamFairValue(s);
  const marginOfSafetyPct = (graham!=null && s.cClose) ? ((graham - s.cClose) / s.cClose) * 100 : null;
  const grahamTone = marginOfSafetyPct==null ? "muted" : marginOfSafetyPct>=15 ? "up" : marginOfSafetyPct<=-15 ? "down" : "gold";

  return `
    <div class="detail-subtitle">Klasifikasi</div>
    <div class="detail-grid">
      ${dItem("Nama Perusahaan", s.name||"-", true)}
      ${dItem("Sektor", s.sektor||"-", true)}
      ${dItem("Industri", s.industry||"-", true)}
      ${dItem("Syariah", s.syariahLabel==="Ya"?"âœ… Ya":(s.syariahLabel||"-"), true)}
      ${dItem("Valuasi", pillHtml(s.valuasi||"-", valuasiTone(s.valuasi)), true)}
      ${dItem("Kategori Cap", s.capCategory||"-", true)}
      ${dItem("Market Cap", s.marketCap!=null ? `Rp ${fmtCap(s.marketCap)}` : "-", true)}
      ${dItem("Saham Beredar (Shares Outstanding)", dNum(s.sharesOutstanding), true)}
    </div>

    <div class="detail-subtitle">Rasio Valuasi & Profitabilitas</div>
    <div class="detail-grid">
      ${dItem("PER", s.per??"-")}
      ${dItem("Forward PER", s.forwardPer??"-")}
      ${dItem("PBV", s.pbv??"-")}
      ${dItem("PSR", s.psr??"-")}
      ${dItem("PEG", s.peg??"-")}
      ${dItem("Book Value", dNum(s.bookValue))}
      ${dItem("ROE%", s.roe!=null?dNum(s.roe,{decimals:2,suffix:'%'}):"-")}
      ${dItem("ROA%", s.roa!=null?dNum(s.roa,{decimals:2,suffix:'%'}):"-")}
      ${dItem("NPM%", s.npm!=null?dNum(s.npm,{decimals:2,suffix:'%'}):"-")}
      ${dItem("OPM%", s.opm!=null?dNum(s.opm,{decimals:2,suffix:'%'}):"-")}
      ${dItem("Dividend Yield%", s.divYield!=null?dNum(s.divYield,{decimals:2,suffix:'%'}):"-")}
      ${dItem("Dividend Rate", dNum(s.dividendRate))}
    </div>

    <div class="detail-subtitle">Pertumbuhan & Kesehatan Keuangan</div>
    <div class="detail-grid">
      ${dItem("Revenue Growth%", s.revenueGrowth!=null?dNum(s.revenueGrowth,{plusSign:true,decimals:2,suffix:'%'}):"-", true)}
      ${dItem("Earnings Growth%", s.earningsGrowth!=null?dNum(s.earningsGrowth,{plusSign:true,decimals:2,suffix:'%'}):"-", true)}
      ${dItem("Payout Ratio%", s.payoutRatio!=null?dNum(s.payoutRatio,{decimals:2,suffix:'%'}):"-")}
      ${dItem("Beta", s.beta??"-")}
      ${dItem("DER", s.der??"-")}
      ${dItem("Current Ratio", s.currentRatio??"-")}
    </div>

    <div class="detail-subtitle">Nilai Wajar (Graham Number)</div>
    <div class="detail-grid" style="border-left: 3px solid var(--${grahamTone}); padding-left: 10px;">
      ${dItem("Nilai Wajar", graham!=null ? dNum(graham,{decimals:0}) : "-", true)}
      ${dItem("Harga Saat Ini", dNum(s.cClose), true)}
      ${dItem("Margin of Safety", marginOfSafetyPct!=null ? `<span style="color:var(--${grahamTone})">${marginOfSafetyPct>=0?'+':''}${marginOfSafetyPct.toFixed(1)}%</span>` : "-", true)}
    </div>

    <div class="detail-narrative">
      ${s.per!=null && s.pbv!=null
        ? `Berdasarkan PER ${s.per} dan PBV ${s.pbv}, valuasi saham ini saat ini tergolong <b>${(s.valuasi||"-").toLowerCase()}</b>.
           ${s.divYield ? `Emiten ini memberikan dividend yield sekitar ${dNum(s.divYield,{decimals:2})}% pada harga saat ini.` : "Belum ada data dividend yield untuk emiten ini."}
           ${graham!=null
             ? ` Dihitung dengan formula Graham Number (âˆš(22,5 Ã— EPS Ã— BVPS), EPS & BVPS diturunkan dari PER/PBV saat ini), nilai wajarnya sekitar ${dNum(graham,{decimals:0})} â€” ${marginOfSafetyPct>=0 ? `harga saat ini ${Math.abs(marginOfSafetyPct).toFixed(1)}% di bawah nilai wajar` : `harga saat ini ${Math.abs(marginOfSafetyPct).toFixed(1)}% di atas nilai wajar`}. Graham Number cocok untuk saham dengan EPS & ekuitas positif (umumnya sektor non-cyclical); kurang relevan untuk emiten rugi, bank, atau komoditas yang labanya fluktuatif.`
             : " PER atau PBV emiten ini negatif/tidak tersedia, sehingga Nilai Wajar (Graham Number) tidak bisa dihitung secara valid."}`
        : "Data fundamental (PER/PBV) untuk emiten ini belum lengkap di database, sehingga valuasi maupun nilai wajar belum bisa dihitung."}
    </div>
  `;
}

function renderStockbitPanel(s){
  const live = state.stockbitLive[s.ticker];
  const hasToken = !!state.stockbitToken;
  let body;
  if(!hasToken){
    body = `<div style="font-size:12px;color:var(--muted);">Token Stockbit belum diisi. Buka <button type="button" onclick="closeDetail();openSettings();" style="background:none;border:none;color:var(--teal);text-decoration:underline;cursor:pointer;padding:0;font-size:12px;">âš™ï¸ Pengaturan</button> untuk mengisi token dari extension Chrome-mu.</div>`;
  } else if(!live){
    body = `<button type="button" class="btn btn-outline" data-stockbit-live="${s.ticker}" style="color:#f87171;border-color:rgba(239,68,68,0.4);">ðŸ”´ Tarik Live Sekarang</button>`;
  } else if(live.loading){
    body = `<div style="font-size:12px;color:var(--muted);">Menarik data dari Stockbit...</div>`;
  } else if(live.error){
    body = `<div style="font-size:12px;color:var(--down);margin-bottom:8px;">âš ï¸ ${escapeHtml(live.error)}</div>
      <button type="button" class="btn btn-outline" data-stockbit-live="${s.ticker}" style="color:#f87171;border-color:rgba(239,68,68,0.4);">â†» Coba Lagi</button>`;
  } else {
    const m = live.mapped || {};
    const secAgo = Math.max(0, Math.round((Date.now()-live.fetchedAt)/1000));
    body = `
      <div class="detail-grid" style="margin-bottom:8px;">
        ${dItem("Last Price", m.last!=null ? fmtNum(m.last) : "-", true)}
        ${dItem("Open", m.open!=null ? fmtNum(m.open) : "-", true)}
        ${dItem("High", m.high!=null ? fmtNum(m.high) : "-", true)}
        ${dItem("Low", m.low!=null ? fmtNum(m.low) : "-", true)}
        ${dItem("Prev Close", m.prevClose!=null ? fmtNum(m.prevClose) : "-", true)}
        ${dItem("Bid", m.bid!=null ? fmtNum(m.bid) : "-", true)}
        ${dItem("Offer", m.offer!=null ? fmtNum(m.offer) : "-", true)}
        ${dItem("Volume", m.volume!=null ? fmtNum(m.volume) : "-", true)}
      </div>
      <div style="font-size:10.5px;color:var(--muted);margin-bottom:8px;">Ditarik ${secAgo} detik lalu Â· field yang tidak muncul berarti nama field-nya belum cocok dengan skema respons Stockbit (lihat JSON mentah).</div>
      <details style="margin-bottom:8px;">
        <summary style="cursor:pointer;font-size:11px;color:var(--teal);">Lihat JSON mentah</summary>
        <pre style="font-size:10.5px;background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;overflow-x:auto;max-height:200px;">${escapeHtml(JSON.stringify(live.raw, null, 2))}</pre>
      </details>
      <button type="button" class="btn btn-outline" data-stockbit-live="${s.ticker}" style="font-size:11px;color:#f87171;border-color:rgba(239,68,68,0.4);">â†» Refresh</button>
    `;
  }
  const liveStatus = stockbitLiveDataStatus();
  return `
    <div style="background: linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95)); border: 1px solid rgba(239,68,68,0.35); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
      <div style="display:flex; align-items:center; gap: 8px; margin-bottom: 4px;">
        <span style="font-size: 18px;">ðŸ”´</span>
        <div style="font-size: 12.5px; font-weight: 700; color: var(--text);">Live Data Stockbit <span style="font-weight:400;color:var(--muted);font-size:10.5px;">(tidak resmi â€” pakai token akunmu sendiri)</span></div>
      </div>
      <div style="font-size:10.5px; color:${liveStatus.color}; margin: 0 0 10px 26px;">${liveStatus.text}</div>
      ${body}
    </div>
  `;
}

function renderDetailAnalisa(s){
  const bandLabel = s.band ? s.band.label : "-";
  const bandTone = s.band ? s.band.tone : "muted";
  
  // 1. Kalkulasi Trading Plan
  const entry = s.cClose;
  const tpFromResistance = !!s.resistance;
  const tp = s.resistance || (entry * 1.05); 
  const slFromSupport = !!(s.support && entry - s.support < (s.atr14 || entry * 0.05));
  const sl = slFromSupport ? s.support : entry - (s.atr14 || entry * 0.03); 
  const risk = entry - sl;
  const reward = tp - entry;
  const rrr = risk > 0 ? (reward / risk).toFixed(2) : 0;
  const tpPct = entry ? ((tp - entry) / entry) * 100 : null;
  const slPct = entry ? ((sl - entry) / entry) * 100 : null;
  
  let tradeTone = "muted"; let tradeStatus = "Netral";
  if (rrr >= 1.5 && s.keyakinanTone === "up" && s.volTone === "up") { tradeTone = "up"; tradeStatus = "ðŸ”¥ Highly Recommended"; } 
  else if (rrr >= 1) { tradeTone = "gold"; tradeStatus = "â­ Layak Pantau"; } 
  else { tradeTone = "down"; tradeStatus = "âš ï¸ High Risk"; }

  // --- Target TP & SL Versi RSI (jarak EMA21 Low <-> harga sekarang, rasio 1:1) ---
  // Tiga sinyal yang jadi kriteria (field sama dengan label pill Sinyal
  // Harga / Sinyal RSI / Keyakinan Naik di stocks_screener):
  //   1. Sinyal Harga = crossup EMA 21 H (harga breakout di atas EMA21 H & L)
  //   2. Sinyal RSI   = RSI 7 cross up RSI 21
  //   3. Keyakinan Naik di tier "Tinggi"/"Sangat Tinggi" (tone "up")
  // Kalau ketiganya terpenuhi -> status "confirmed" (setup penuh).
  // Kalau EMA21 Low ada tapi baru sebagian sinyal yang terpenuhi -> tetap
  // ditampilkan, statusnya "partial" (belum full-konfirmasi) supaya
  // kelihatan progress-nya, bukan langsung disembunyikan.
  // Kalau EMA21 Low belum ada di data sama sekali, ATAU tidak ada satupun
  // dari 3 sinyal yang match, blok ini disembunyikan total â€” jatuh balik
  // ke Trading Plan resistance/support/ATR di atas saja. Sesuaikan
  // substring di bawah kalau format teks cek_harga/cek_rsi berubah.
  //
  // Perhitungan (rasio 1:1, ukur dari EMA21 Low ke harga sekarang):
  //   jarak    = entry - EMA21 Low
  //   SL       = EMA21 Low (dipakai apa adanya untuk target & RRR, supaya
  //              box-nya persis simetris 1:1 seperti acuan/referensi)
  //   TP       = entry + jarak
  //   slOrder  = EMA21 Low - buffer (1-2 tik harga IDX) â€” HANYA saran
  //              penempatan order stop aktual (margin eksekusi), tidak
  //              dipakai untuk hitung RRR/Target supaya rasio tetap 1:1.
  const cekHargaLower = String(s.cekHarga || "").toLowerCase();
  const cekRsiLower = String(s.cekRsi || "").toLowerCase();
  const hargaCrossEma21 = cekHargaLower.includes("crossup") && cekHargaLower.includes("ema 21 h");
  const rsiCrossUp = cekRsiLower.includes("cross up");
  const keyakinanTinggi = keyakinanToneFromLabel(s.keyakinanNaik) === "up";
  const emaTersedia = s.ema21L != null && entry > s.ema21L;
  const sinyalCocok = [hargaCrossEma21, rsiCrossUp, keyakinanTinggi].filter(Boolean).length;
  const rsiSetupTampil = emaTersedia && sinyalCocok > 0;
  const rsiSetupConfirmed = hargaCrossEma21 && rsiCrossUp && keyakinanTinggi && emaTersedia;

  // Tabel tik harga resmi IDX (fraksi harga), dipakai untuk saran buffer SL.
  function idxTickSize(price){
    if (price == null) return 1;
    if (price < 200) return 1;
    if (price < 500) return 2;
    if (price < 2000) return 5;
    if (price < 5000) return 10;
    return 25;
  }

  let rsiSetup = null;
  if (rsiSetupTampil) {
    const jarak = entry - s.ema21L;                // jarak EMA21 Low -> harga sekarang
    const slRsi = s.ema21L;                          // SL = EMA21 Low apa adanya (rasio 1:1 persis)
    const tpRsi = entry + jarak;                     // TP = entry + jarak, rasio 1:1
    const tick = idxTickSize(s.ema21L);
    const slBuffer = tick * 2;
    const slOrder = s.ema21L - slBuffer;              // saran harga order stop aktual (2 tik di bawah SL)
    const rrrLive = 1;                                // by design selalu 1:1 (risk = reward = jarak)
    const tpRsiPct = entry ? ((tpRsi - entry) / entry) * 100 : null;
    const slRsiPct = entry ? ((slRsi - entry) / entry) * 100 : null;
    const missing = [];
    if (!hargaCrossEma21) missing.push("Sinyal Harga belum crossup EMA21 H");
    if (!rsiCrossUp) missing.push("RSI 7 belum cross up RSI 21");
    if (!keyakinanTinggi) missing.push("Keyakinan Naik belum di tier Tinggi/Sangat Tinggi");
    rsiSetup = { slRsi, tpRsi, jarak, rrrLive, tpRsiPct, slRsiPct, slOrder, confirmed: rsiSetupConfirmed, missing };
  }

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
  if (aiScore >= 5) { aiVerdict = "ðŸŸ¢ STRONG BUY (Sangat Menarik)"; aiTone = "up"; }
  else if (aiScore >= 3) { aiVerdict = "ðŸŸ¢ BUY (Menarik)"; aiTone = "up"; }
  else if (aiScore >= 1) { aiVerdict = "ðŸŸ¡ HOLD / WAIT & SEE"; aiTone = "gold"; }
  else { aiVerdict = "ðŸ”´ AVOID / SELL (Hindari)"; aiTone = "down"; }

  // Link Pencarian Berita Otomatis
  const newsUrl = `https://www.google.com/search?q=saham+${s.ticker}+berita+terbaru&tbm=nws`;

  return `
    <!-- LIVE DATA STOCKBIT (opsional, tidak resmi) -->
    ${renderStockbitPanel(s)}

    <!-- SKOR BAGGER â€” formula_screening_saham_bagger.md -->
    <div style="background: linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95)); border: 1px solid var(--${s.bagger.tone}); border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
      <div style="display:flex; align-items:center; gap: 8px; margin-bottom: 12px; border-bottom: 1px dashed var(--border); padding-bottom: 12px;">
        <span style="font-size: 20px;">ðŸŽ¯</span>
        <div>
          <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Skor Bagger (Formula Multibagger)</div>
          <div style="font-size: 20px; font-weight: 800; color: var(--${s.bagger.tone});">${s.bagger.total}<span style="font-size:12px;color:var(--muted);font-weight:500;"> /100 Â· ${s.bagger.tier}</span></div>
        </div>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap: 16px;">
        <div style="flex:1; min-width:180px;">
          <div style="font-size:10.5px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:2px;">Fundamental (40%) â€” <b class="mono" style="color:var(--text);">${s.bagger.fundScore}/40</b></div>
          ${baggerBreakdownRows(s.bagger.fundItems)}
        </div>
        <div style="flex:1; min-width:180px;">
          <div style="font-size:10.5px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:2px;">Momentum Teknikal (35%) â€” <b class="mono" style="color:var(--text);">${s.bagger.momScore}/35</b></div>
          ${baggerBreakdownRows(s.bagger.momItems)}
        </div>
        <div style="flex:1; min-width:180px;">
          <div style="font-size:10.5px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:2px;">Volume/Smart Money (25%) â€” <b class="mono" style="color:var(--text);">${s.bagger.volScore}/25</b></div>
          ${baggerBreakdownRows(s.bagger.volItems)}
        </div>
      </div>
      ${s.bagger.flags.length ? `
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border);">
        <div style="font-size: 11px; color: var(--down); font-weight: 700; margin-bottom: 6px;">âš ï¸ Red Flag (Bagian 4 Formula)</div>
        ${s.bagger.flags.map(f=>`<div style="font-size:11.5px; color:var(--down); margin-bottom:4px; line-height:1.4;">â€¢ ${f}</div>`).join("")}
      </div>` : ""}
      <div style="margin-top:10px; font-size:10.5px; color:var(--muted); line-height:1.4;">
        â‰¥75 kandidat kuat (worth watchlist utama) Â· 50â€“74 menarik tapi tunggu konfirmasi tambahan Â· &lt;50 skip, belum ada "bahan bakar" cukup. Sesuai <i>formula_screening_saham_bagger.md</i>.
      </div>
    </div>

    <!-- PANEL AI BARU -->
    <div style="background: linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95)); border: 1px solid var(--${aiTone}); border-radius: 12px; padding: 16px; margin-bottom: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
      <div style="display:flex; align-items:center; gap: 8px; margin-bottom: 12px; border-bottom: 1px dashed var(--border); padding-bottom: 12px;">
        <span style="font-size: 20px;">ðŸ¤–</span>
        <div>
          <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Kesimpulan Asisten AI</div>
          <div style="font-size: 16px; font-weight: 700; color: var(--${aiTone});">${aiVerdict}</div>
        </div>
      </div>
      <div style="display:grid; gap: 8px; font-size: 12.5px; color: var(--text);">
        <div><b style="color:var(--teal);">ðŸ“ˆ Teknikal:</b> ${techDesc}</div>
        <div><b style="color:var(--gold);">ðŸ¦ Fundamental:</b> ${fundDesc}</div>
        <div><b style="color:#a78bfa;">ðŸ‹ Bandarmologi:</b> ${bandDesc}</div>
      </div>
      <div style="margin-top: 16px; display: flex; gap: 8px;">
        <a class="btn btn-outline" href="${newsUrl}" target="_blank" rel="noopener" style="flex:1; justify-content:center; color:#38bdf8; border-color:rgba(56,189,248,0.3);">
          ðŸ“° Cek Sentimen Berita/News Terkini
        </a>
      </div>
    </div>

    <!-- TRADING PLAN (Dipertahankan) -->
    <div class="detail-subtitle">Trading Plan Otomatis (Risk/Reward)</div>
    <!-- KALKULATOR POSITION SIZING -->
    <div class="calc-box">
      <div style="font-size: 13px; font-weight: 700; color: var(--up);">ðŸ§® Kalkulator Money Management (Position Sizing)</div>
      <div style="font-size: 11px; color: var(--muted); margin-bottom: 8px;">Hitung maksimal Lot yang boleh dibeli agar kerugian tidak melebihi batas risiko Anda jika terkena Stop Loss.</div>
      <div class="calc-input-grid">
        <div>
          <label style="font-size: 11px; color: var(--muted);">Modal Tersedia (Rp)</label>
          <input type="number" id="calcCapital" value="10000000" oninput="calculatePositionSizing(${entry}, ${sl})">
        </div>
        <div>
          <label style="font-size: 11px; color: var(--muted);">Risiko per Trade (%)</label>
          <input type="number" id="calcRiskPct" value="1" step="0.1" oninput="calculatePositionSizing(${entry}, ${sl})">
        </div>
      </div>
      <div class="calc-result" id="calcResultStr">
        Maksimal Pembelian: 0 Lot
      </div>
    </div>

    ${rsiSetup ? `
    <!-- TARGET TP & SL VERSI RSI (Breakout EMA21, rasio 1:1) -->
    <div class="detail-subtitle">ðŸŽ¯ Target TP & SL â€” Versi RSI (Breakout EMA21) ${rsiSetup.confirmed ? pillHtml("Confirmed", "up") : pillHtml("Belum Full-Konfirmasi", "gold")}</div>
    <div class="detail-grid" style="border-left: 3px solid var(--${rsiSetup.confirmed ? "teal" : "gold"}); padding-left: 10px; margin-bottom: 8px;">
      ${dItem("Stop Loss (EMA21 Low)", '<span style="color:var(--down)">' + dNum(rsiSetup.slRsi) + ' <span style="font-size:11px;opacity:0.8;">(' + rsiSetup.slRsiPct.toFixed(1) + '%)</span></span>', true)}
      ${dItem("Take Profit (Proyeksi 1:1)", '<span style="color:var(--up)">' + dNum(rsiSetup.tpRsi) + ' <span style="font-size:11px;opacity:0.8;">(' + (rsiSetup.tpRsiPct>=0?'+':'') + rsiSetup.tpRsiPct.toFixed(1) + '%)</span></span>', true)}
      ${dItem("Jarak EMA21 Low â†’ Harga Sekarang", dNum(rsiSetup.jarak), true)}
      ${dItem("Risk/Reward Ratio", '<span style="color:var(--up)">' + rsiSetup.rrrLive.toFixed(2) + 'x</span>', true)}
    </div>
    <div class="detail-narrative" style="margin-bottom: 16px;">
      ${rsiSetup.confirmed
        ? `Setup breakout EMA21 <b>terkonfirmasi penuh</b>: harga crossup EMA21 H &amp; L, RSI 7 cross up RSI 21, dan Keyakinan Naik di tier Tinggi/Sangat Tinggi.`
        : `Setup breakout EMA21 <b>belum full-konfirmasi</b> â€” masih menunggu: ${rsiSetup.missing.join("; ")}.`}
      Jarak dihitung dari EMA21 Low ke harga sekarang. Stop Loss = EMA21 Low, Take Profit = harga sekarang + jarak tersebut, sehingga rasio persis 1:1.
      Untuk eksekusi order aktual, disarankan taruh stop sedikit di bawah level SL di atas â€” sekitar ${dNum(rsiSetup.slOrder)} (buffer Â±2 tik harga) â€” supaya tidak kena stop karena noise/wick tipis, tanpa mengubah target TP.
      ${!rsiSetup.confirmed ? " Level ini indikatif â€” pertimbangkan menunggu konfirmasi penuh sebelum entry." : ""}
    </div>
    ` : ``}

    <div class="detail-subtitle">Detail Parameter</div>
    <div class="detail-grid">
      ${dItem("Sinyal MACD", pillHtml(s.cekMacd||"-", ((s.cekMacd||"").includes("Buy")||(s.cekMacd||"").includes("Bullish"))?"up":(s.cekMacd||"").includes("Sell")?"down":"muted"), true)}
      ${dItem("Sinyal Volume", pillHtml(s.sinyalVolume||"-", s.volTone), true)}
      ${dItem("Frekuensi Transaksi", s.frequency!=null ? fmtNum(s.frequency) + (s.freqRatio!=null ? ` <span style="font-size:11px;opacity:0.8;">(${s.freqRatio.toFixed(2)}x)</span>` : "") : "-", true)}
      ${dItem("Sinyal Frekuensi", pillHtml(s.sinyalFrekuensi||"-", s.freqTone), true)}
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
// Sama seperti fmtRp tapi tanpa tanda +/- di depan â€” dipakai untuk
// kuantitas non-arah seperti Market Cap (bukan Net Asing yang berarah).
function fmtCap(n){
  if(n===null||n===undefined) return "-";
  const num = Number(n);
  if(isNaN(num)) return "-";
  const abs = Math.abs(num);
  if(abs>=1e12) return (num/1e12).toFixed(2)+" T";
  if(abs>=1e9)  return (num/1e9).toFixed(2)+" M";
  if(abs>=1e6)  return (num/1e6).toFixed(1)+" jt";
  return fmtNum(num);
}
// Nilai Wajar (Graham Number) = sqrt(22.5 x EPS x BVPS).
// EPS dan BVPS tidak disimpan mentah di DB, tapi bisa diturunkan dari
// rasio yang sudah ada: PER = harga/EPS -> EPS = harga/PER,
// PBV = harga/BVPS -> BVPS = harga/PBV. Jadi Graham Number bisa
// dihitung tanpa perlu kolom baru, selama PER & PBV positif (EPS/BVPS
// negatif membuat akar tidak valid secara matematis -> null / "-").
function grahamFairValue(s){
  const per = numOrNull(s.per), pbv = numOrNull(s.pbv), price = numOrNull(s.cClose);
  if(per==null || pbv==null || price==null || per<=0 || pbv<=0) return null;
  return price * Math.sqrt(22.5 / (per * pbv));
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
      <b>Data asing bukan data bandar.</b> Ini proksi, dan proksi yang kasar â€” institusi lokal besar
      (dana pensiun, asuransi, manajer investasi dalam negeri) tidak muncul sebagai "asing" sama sekali,
      sementara sebagian dana lokal yang dititipkan lewat kustodian asing justru tercatat sebagai asing.
      Data ini juga harian (bukan real-time) â€” angka di atas adalah data ${s.flowDate || "hari perdagangan terakhir"},
      berguna untuk pola berminggu-minggu, bukan keputusan intraday. Sumber: IDX resmi, terpisah dari
      indikator "BPJS" di tab Analisa yang murni proxy dari lonjakan volume â€” dua hal ini tidak sama.
    </div>
  `;
}

function emptyDbsRow(side, rank){ return { side, rank, broker_code:"", lot:"", value_idr:"" }; }

function renderDetailBrokerSummary(s){
  const ticker = s.ticker;
  const editRows = state.detailBsEditRows && state.detailBsEditRows.length ? state.detailBsEditRows : [];
  const buyEdit = [0,1,2,3,4].map(i => editRows.find(r=>r.side==="buy" && r.rank===i+1) || emptyDbsRow("buy", i+1));
  const sellEdit = [0,1,2,3,4].map(i => editRows.find(r=>r.side==="sell" && r.rank===i+1) || emptyDbsRow("sell", i+1));

  const editRowsHtml = (rows, label) => rows.map((r,i)=>`
    <div class="bs-row">
      <input class="bs-cell" id="dbs${label}Broker${i}" placeholder="Kode" maxlength="6" style="text-transform:uppercase" value="${escapeHtml(r.broker_code||"")}">
      <input class="bs-cell" id="dbs${label}Lot${i}" type="number" placeholder="Lot" value="${r.lot ?? ""}">
      <input class="bs-cell" id="dbs${label}Value${i}" type="number" placeholder="Nilai (Rp)" value="${r.value_idr ?? ""}">
    </div>`).join("");

  const dRows = state.detailBsRows || [];
  const dBuy = dRows.filter(r=>r.side==="buy").sort((a,b)=>a.rank-b.rank);
  const dSell = dRows.filter(r=>r.side==="sell").sort((a,b)=>a.rank-b.rank);
  const maxVal = Math.max(1, ...dRows.map(r=> Number(r.value_idr)||0));
  const barHtml = (r, cls) => `
    <div class="bs-bar-row">
      <span class="bs-bar-broker mono">${escapeHtml(r.broker_code)}</span>
      <div class="bs-bar-track"><div class="bs-bar-fill ${cls}" style="width:${(Number(r.value_idr)/maxVal)*100}%"></div></div>
      <span class="bs-bar-value mono">${fmtNum(r.value_idr)}</span>
    </div>`;

  return `
    <div class="bs-wrap">
      <div class="bs-toolbar">
        <span class="mono" style="font-weight:700;font-size:14px;">${escapeHtml(ticker)}</span>
        <input id="dbsDate" class="bs-input" type="date" value="${state.detailBsDate||""}">
        <button class="btn btn-outline" id="dbsLoadBtn" ${state.detailBsLoading?"disabled":""}>${state.detailBsLoading?"Memuat...":"Muat Data"}</button>
      </div>

      ${state.detailBsMsg ? `<div class="bs-msg ${state.detailBsMsgError?"bs-msg-error":"bs-msg-ok"}">${escapeHtml(state.detailBsMsg)}</div>` : ""}

      ${bsStatusRowHtml(dRows)}

      <div class="bs-display-grid">
        <div>
          <div class="bs-col-title bs-buy">Top 5 Buy</div>
          ${dBuy.length ? dBuy.map(r=>barHtml(r,"bs-fill-buy")).join("") : `<div class="empty-box" style="padding:16px;font-size:12px;">Belum ada data untuk tanggal ini.</div>`}
        </div>
        <div>
          <div class="bs-col-title bs-sell">Top 5 Sell</div>
          ${dSell.length ? dSell.map(r=>barHtml(r,"bs-fill-sell")).join("") : `<div class="empty-box" style="padding:16px;font-size:12px;">Belum ada data untuk tanggal ini.</div>`}
        </div>
      </div>

      <details class="bs-editor-panel" id="dbsEditorPanel" ${state.detailBsEditorOpen?"open":""}>
        <summary>âœï¸ Input / Edit Manual (dari screenshot Stockbit Anda)</summary>
        <div class="bs-editor-grid">
          <div>
            <div class="bs-col-title bs-buy">Top 5 Buy</div>
            <div class="bs-header-row"><span>Broker</span><span>Lot</span><span>Nilai (Rp)</span></div>
            ${editRowsHtml(buyEdit,"Buy")}
          </div>
          <div>
            <div class="bs-col-title bs-sell">Top 5 Sell</div>
            <div class="bs-header-row"><span>Broker</span><span>Lot</span><span>Nilai (Rp)</span></div>
            ${editRowsHtml(sellEdit,"Sell")}
          </div>
        </div>
        <div class="bs-toolbar" style="margin-top:12px;">
          <button class="btn btn-primary" id="dbsSaveBtn">Simpan ke Database</button>
        </div>
        <div class="bs-csv-panel">
          <label>Atau tempel CSV (format per baris: side,rank,broker_code,lot,value_idr)</label>
          <textarea id="dbsCsvInput" rows="6" placeholder="buy,1,YP,1200000,45000000000">${escapeHtml(state.detailBsCsvText||"")}</textarea>
          <button class="btn btn-outline" id="dbsCsvFillBtn">Isi ke Form dari CSV</button>
        </div>
      </details>
    </div>`;
}

async function loadDetailBrokerSummary(){
  const ticker = state.detailTicker;
  const dateEl = document.getElementById("dbsDate");
  const date = dateEl?.value || "";
  state.detailBsDate = date;
  if(!ticker || !date){ state.detailBsMsg = "Tanggal belum diisi."; state.detailBsMsgError = true; render(); return; }
  if(!SUPABASE_URL || !SUPABASE_KEY){ openSettings(); return; }

  state.detailBsLoading = true; state.detailBsMsg = ""; render();
  try {
    const qs = new URLSearchParams({ stock_code: `eq.${ticker}`, trade_date: `eq.${date}`, order: "side.asc,rank.asc" });
    const res = await fetch(`${SUPABASE_URL}/broker_summary?${qs}`, { headers: getSupaHeaders(), cache: "no-store" });
    if(!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const rows = await res.json();
    state.detailBsRows = rows;
    state.detailBsEditRows = rows.map(r=>({ side:r.side, rank:r.rank, broker_code:r.broker_code, lot:r.lot, value_idr:r.value_idr }));
    state.detailBsMsg = rows.length ? `Menampilkan ${rows.length} baris.` : "Belum ada data untuk tanggal ini.";
    state.detailBsMsgError = false;
  } catch(e) {
    state.detailBsMsg = "Gagal memuat: " + e.message;
    state.detailBsMsgError = true;
  }
  state.detailBsLoading = false;
  render();
}

function readDbsEditorRows(side, code, date){
  const label = side === "buy" ? "Buy" : "Sell";
  const rows = [];
  for(let i=0;i<5;i++){
    const brokerEl = document.getElementById(`dbs${label}Broker${i}`);
    const lotEl = document.getElementById(`dbs${label}Lot${i}`);
    const valEl = document.getElementById(`dbs${label}Value${i}`);
    const broker_code = (brokerEl?.value||"").trim().toUpperCase();
    const value_idr = valEl?.value;
    if(!broker_code || !value_idr) continue;
    rows.push({
      stock_code: code, trade_date: date, side, rank: i+1,
      broker_code, lot: lotEl?.value ? Number(lotEl.value) : null,
      value_idr: Number(value_idr)
    });
  }
  return rows;
}

async function saveDetailBrokerSummaryRows(){
  const code = state.detailTicker;
  const date = state.detailBsDate || document.getElementById("dbsDate")?.value;
  if(!code || !date){ state.detailBsMsg = "Tanggal belum diisi."; state.detailBsMsgError = true; render(); return; }
  if(!SUPABASE_URL || !SUPABASE_KEY){ openSettings(); return; }

  const rows = [...readDbsEditorRows("buy", code, date), ...readDbsEditorRows("sell", code, date)];
  if(!rows.length){ state.detailBsMsg = "Belum ada baris terisi."; state.detailBsMsgError = true; render(); return; }

  try {
    await supaFetch(`${SUPABASE_URL}/broker_summary?on_conflict=stock_code,trade_date,side,rank`, {
      method: "POST",
      headers: { ...getSupaHeaders(), "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(rows)
    });
    state.detailBsMsg = `Tersimpan ${rows.length} baris.`;
    state.detailBsMsgError = false;
    state.detailBsEditorOpen = true;
    render();
    loadDetailBrokerSummary();
  } catch(e) {
    state.detailBsMsg = "Gagal menyimpan: " + e.message;
    state.detailBsMsgError = true;
    render();
  }
}

function fillDbsFromCsv(){
  const textEl = document.getElementById("dbsCsvInput");
  const text = textEl?.value || "";
  state.detailBsCsvText = text;
  try {
    const lines = text.trim().split("\n").filter(Boolean);
    const rows = lines.map(line=>{
      const [side, rank, broker_code, lot, value_idr] = line.split(",").map(s=>s.trim());
      if(side!=="buy" && side!=="sell") throw new Error(`side harus 'buy'/'sell', dapat: "${side}"`);
      return {
        side, rank: Number(rank),
        broker_code: (broker_code||"").toUpperCase(),
        lot: lot ? Number(lot) : null,
        value_idr: Number(value_idr)
      };
    });
    state.detailBsEditRows = rows;
    state.detailBsEditorOpen = true;
    state.detailBsMsg = "CSV berhasil dibaca ke form. Cek lagi lalu klik Simpan.";
    state.detailBsMsgError = false;
  } catch(e) {
    state.detailBsMsg = "Format CSV tidak valid: " + e.message;
    state.detailBsMsgError = true;
  }
  render();
}

function renderDetailHistorical(s){
  const ticker = s.ticker;
  const rows = state.detailHistoricalRows || [];
  const periodBtn = (key, label) => `<button type="button" class="btn ${state.detailHistoricalPeriod===key?'btn-primary':'btn-outline'}" data-hist-period="${key}" ${state.detailHistoricalLoading?"disabled":""}>${label}</button>`;

  // Default date range: 1 tahun terakhir
  if(!state.detailHistoricalFrom) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    state.detailHistoricalFrom = toLocalISODate(d);
  }
  if(!state.detailHistoricalTo) {
    state.detailHistoricalTo = todayLocalISO();
  }

  const tableRows = rows.map(r => `
    <tr>
      <td class="mono">${escapeHtml(r.date)}</td>
      <td class="mono" style="text-align:right;">${r.close!=null?fmtNum(r.close):"-"}</td>
      <td class="mono" style="text-align:right;color:${(r.change??0)>=0?'var(--up)':'var(--down)'}">${r.change!=null?dNum(r.change,{plusSign:true}):"-"}${r.changePct!=null?` (${dNum(r.changePct,{plusSign:true,decimals:2,suffix:'%'})})`:""}</td>
      <td class="mono" style="text-align:right;">${r.value!=null?fmtNum(r.value):"-"}</td>
      <td class="mono" style="text-align:right;">${r.volume!=null?fmtNum(r.volume):"-"}</td>
      <td class="mono" style="text-align:right;color:${r.netForeign==null?'inherit':(r.netForeign>=0?'var(--up)':'var(--down)')}" title="Foreign Buy: ${r.foreignBuy!=null?fmtNum(r.foreignBuy):'-'} · Foreign Sell: ${r.foreignSell!=null?fmtNum(r.foreignSell):'-'}">${r.netForeign!=null?dNum(r.netForeign,{plusSign:true}):"-"}</td>
    </tr>`).join("");

  return `
    <div class="bs-wrap">
      <div class="bs-toolbar" style="flex-wrap:wrap;gap:8px;">
        <span class="mono" style="font-weight:700;font-size:14px;">${escapeHtml(ticker)}</span>
        ${periodBtn("daily","Daily")}
        ${periodBtn("weekly","Weekly")}
        ${periodBtn("monthly","Monthly")}
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin:10px 0;">
        <div class="field">
          <label style="font-size:11px;">Dari</label>
          <input type="date" id="dhistFrom" value="${state.detailHistoricalFrom||""}" style="padding:8px;border:1px solid var(--border);border-radius:6px;background:rgba(0,0,0,0.2);color:var(--text);font-size:12px;">
        </div>
        <div class="field">
          <label style="font-size:11px;">Sampai</label>
          <input type="date" id="dhistTo" value="${state.detailHistoricalTo||""}" style="padding:8px;border:1px solid var(--border);border-radius:6px;background:rgba(0,0,0,0.2);color:var(--text);font-size:12px;">
        </div>
        <button class="btn btn-primary" id="dhistDbLoadBtn" ${state.detailHistoricalLoading?"disabled":""}>
          ${state.detailHistoricalLoading?"Memuat...":"📖 Muat dari Database"}
        </button>
        <button class="btn btn-outline" id="dhistLoadBtn" ${state.detailHistoricalLoading?"disabled":""} style="color:#f87171;border-color:rgba(239,68,68,0.4);">
          ${state.detailHistoricalLoading?"Menarik...":"⬇️ Tarik dari Stockbit"}
        </button>
        ${rows.length ? `<button class="btn btn-outline" id="dhistSaveBtn">💾 Simpan ke Database</button>` : ""}
        ${rows.length ? `<button class="btn btn-outline" id="dhistCompareBtn" ${state.detailCompareLoading?"disabled":""} style="color:#a78bfa;border-color:rgba(167,139,250,0.4);">${state.detailCompareLoading?"Membandingkan...":"🔍 Bandingkan dengan IDX"}</button>` : ""}
      </div>

      ${state.detailHistoricalMsg ? `<div class="bs-msg ${state.detailHistoricalMsgError?"bs-msg-error":"bs-msg-ok"}">${escapeHtml(state.detailHistoricalMsg)}</div>` : ""}

      <div style="font-size:11px;color:var(--muted);margin-bottom:8px;">
        Menampilkan ${rows.length} baris dari database · Periode: ${state.detailHistoricalPeriod} · ${state.detailHistoricalFrom||'..'} s/d ${state.detailHistoricalTo||'..'}
      </div>

      ${!rows.length ? `<div class="empty-box" style="margin-top:12px;">Belum ada data untuk periode ini. Klik "📖 Muat dari Database" atau "⬇️ Tarik dari Stockbit" di atas.</div>` : `
      <div class="table-wrap" style="max-height:60vh;">
        <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
          <thead>
            <tr style="color:var(--muted);text-align:right;">
              <th style="text-align:left;padding:6px 8px;">Date</th>
              <th style="padding:6px 8px;">Close</th>
              <th style="padding:6px 8px;">Change</th>
              <th style="padding:6px 8px;">Value</th>
              <th style="padding:6px 8px;">Volume</th>
              <th style="padding:6px 8px;" title="Net Foreign (Buy - Sell asing)">Net Foreign</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`}

      ${state.detailCompareMsg || (state.detailCompareRows && state.detailCompareRows.length) ? `
      <div style="margin-top:16px;">
        <details id="dhistComparePanel" ${state.detailCompareOpen?"open":""}>
          <summary style="cursor:pointer; font-size:12px; color:var(--muted); user-select:none;">
            🔍 Bandingkan dengan IDX (flows) ${state.detailCompareMsg ? `— ${escapeHtml(state.detailCompareMsg)}` : ""}
          </summary>
          ${state.detailCompareRows && state.detailCompareRows.length ? `
          <div class="table-wrap" style="margin-top:10px;max-height:60vh;">
            <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
              <thead>
                <tr style="color:var(--muted);text-align:right;">
                  <th style="text-align:left;padding:6px 8px;">Date</th>
                  <th style="text-align:left;padding:6px 8px;">Sumber</th>
                  <th style="padding:6px 8px;" colspan="2">Close (SB / IDX)</th>
                  <th style="padding:6px 8px;" colspan="2">Value (SB / IDX)</th>
                  <th style="padding:6px 8px;" colspan="2">Volume (SB / IDX)</th>
                  <th style="padding:6px 8px;" colspan="2">Net Foreign (SB / IDX)</th>
                </tr>
              </thead>
              <tbody>
                ${state.detailCompareRows.map(r => {
                  const pctDiff = (a,b) => (a==null||b==null||b===0) ? null : Math.abs((a-b)/b);
                  const cellPair = (a,b,fmt=fmtNum) => {
                    const diff = pctDiff(a,b);
                    const warn = diff != null && diff > 0.01;
                    const color = a==null||b==null ? 'var(--muted)' : (warn ? 'var(--gold)' : 'inherit');
                    return `<td class="mono" style="text-align:right;color:${color};">${a!=null?fmt(a):"-"}</td><td class="mono" style="text-align:right;color:var(--muted);">${b!=null?fmt(b):"-"}</td>`;
                  };
                  // Badge sumber per baris -- "IDX" kalau ada di `flows`, "Stockbit"
                  // kalau cuma dari price_history_stockbit (tetap valid, sudah
                  // dipakai sebagai tambalan di Kraken Flow ORCA, lihat catatan
                  // di loadDetailCompare()).
                  const srcBadge = r.source === "idx"
                    ? `<span style="color:var(--teal);">IDX</span>`
                    : `<span style="color:var(--gold);" title="Tidak ada di flows (IDX), tapi baris ini sudah dipakai otomatis sebagai tambalan di tab Kraken Flow (ORCA) saat flows belum sempat sync.">Stockbit</span>`;
                  return `<tr>
                    <td class="mono">${escapeHtml(r.date)}</td>
                    <td class="mono">${srcBadge}</td>
                    ${cellPair(r.closeSb, r.closeIdx)}
                    ${cellPair(r.valueSb, r.valueIdx)}
                    ${cellPair(r.volumeSb, r.volumeIdx)}
                    ${cellPair(r.netForeignSb, r.netForeignIdx, (v)=>dNum(v,{plusSign:true}))}
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>` : ""}
        </details>
      </div>` : ""}
    </div>`;
}


// Load dari Stockbit (tarik data baru, lalu simpan otomatis ke DB)
async function loadDetailHistoricalFromStockbit(){
  const ticker = state.detailTicker;
  if(!ticker) return;
  state.detailHistoricalLoading = true; state.detailHistoricalMsg = ""; render();
  const res = await stockbitFetchHistorical(ticker, state.detailHistoricalPeriod, {
    startDate: state.detailHistoricalFrom || undefined,
    endDate: state.detailHistoricalTo || undefined,
  });
  if(res.error){
    state.detailHistoricalMsg = res.error;
    state.detailHistoricalMsgError = true;
    state.detailHistoricalRows = [];
  } else {
    const parsed = parseStockbitHistorical(res.raw);
    if(!parsed){
      state.detailHistoricalMsg = "Response diterima tapi formatnya tidak dikenali. Cek console (F12) untuk lihat JSON mentahnya.";
      state.detailHistoricalMsgError = true;
      state.detailHistoricalRows = [];
      console.log("Stockbit historical raw response:", res.raw);
    } else {
      state.detailHistoricalRows = parsed;
      state.detailHistoricalMsg = `✅ ${parsed.length} baris dari Stockbit (${state.detailHistoricalPeriod}). Klik "💾 Simpan ke Database" untuk menyimpan.`;
      state.detailHistoricalMsgError = false;
    }
  }
  state.detailHistoricalLoading = false;
  render();
}

async function loadDetailHistoricalFromDb(){
  const ticker = state.detailTicker;
  if(!ticker) return;
  if(!SUPABASE_URL || !SUPABASE_KEY){ state.detailHistoricalMsg = "Supabase belum dikonfigurasi."; state.detailHistoricalMsgError = true; render(); return; }

  state.detailHistoricalLoading = true; state.detailHistoricalMsg = ""; render();

  try {
    const from = state.detailHistoricalFrom || "";
    const to = state.detailHistoricalTo || "";
    const period = state.detailHistoricalPeriod;

    const params = new URLSearchParams({
      stock_code: `eq.${ticker}`,
      period: `eq.${period}`,
      order: "trade_date.desc",
    });

    if(from) params.append("trade_date", `gte.${from}`);
    if(to) params.append("trade_date", `lte.${to}`);

    const res = await fetch(`${SUPABASE_URL}/price_history_stockbit?${params}`, {
      headers: getSupaHeaders(), cache: "no-store"
    });

    if(!res.ok) throw new Error(`HTTP ${res.status}`);

    const rows = await res.json();

    if(!Array.isArray(rows) || !rows.length) {
      state.detailHistoricalRows = [];
      state.detailHistoricalMsg = `Tidak ada data ${period} di database untuk ${ticker} pada periode ${from || '..'} s/d ${to || '..'}. Klik "⬇️ Tarik dari Stockbit" untuk mengambil data.`;
      state.detailHistoricalMsgError = true;
    } else {
      // Map dari format DB ke format UI
      state.detailHistoricalRows = rows.map(r => ({
        date: r.trade_date,
        close: r.close,
        change: r.change,
        changePct: r.change_pct,
        value: r.value_idr,
        volume: r.volume,
        open: r.open,
        high: r.high,
        low: r.low,
        frequency: r.frequency,
        foreignBuy: r.foreign_buy,
        foreignSell: r.foreign_sell,
        netForeign: r.net_foreign,
      }));
      state.detailHistoricalMsg = `✅ ${rows.length} baris ${period} dimuat dari database (${from || '..'} s/d ${to || '..'}).`;
      state.detailHistoricalMsgError = false;
    }
  } catch(e) {
    state.detailHistoricalRows = [];
    state.detailHistoricalMsg = "Gagal memuat dari database: " + e.message;
    state.detailHistoricalMsgError = true;
  }

  state.detailHistoricalLoading = false;
  render();
}

async function saveDetailHistoricalRows(){
  const ticker = state.detailTicker;
  const rows = state.detailHistoricalRows || [];
  if(!ticker || !rows.length) return;
  if(!SUPABASE_URL || !SUPABASE_KEY){ openSettings(); return; }
  try{
    const payload = rows.map(r => ({
      stock_code: ticker, trade_date: r.date, period: state.detailHistoricalPeriod,
      close: r.close, change: r.change, change_pct: r.changePct, value_idr: r.value, volume: r.volume,
      open: r.open, high: r.high, low: r.low, frequency: r.frequency,
      foreign_buy: r.foreignBuy, foreign_sell: r.foreignSell, net_foreign: r.netForeign
    }));
    await supaFetch(`${SUPABASE_URL}/price_history_stockbit?on_conflict=stock_code,trade_date,period`, {
      method: "POST",
      headers: { ...getSupaHeaders(), "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload)
    });
    state.detailHistoricalMsg = `Tersimpan ${payload.length} baris ke tabel price_history_stockbit.`;
    state.detailHistoricalMsgError = false;
  } catch(e){
    state.detailHistoricalMsg = "Gagal menyimpan: " + e.message + " (pastikan sudah jalankan sql/08_price_history_stockbit.sql)";
    state.detailHistoricalMsgError = true;
  }
  render();
}

// ==========================================
// PANEL "BANDINGKAN DENGAN IDX" â€” validasi silang angka Stockbit
// (price_history_stockbit) vs angka IDX resmi (tabel `flows`, hasil
// sync-idx-full.mjs) untuk ticker & rentang tanggal yang sama. Dua sumber
// ini independen (lihat diskusi sebelumnya) â€” TIDAK saling menimpa di
// stocks_screener, tapi angkanya bisa sedikit beda karena metodologi/timing
// pencatatan tiap penyedia data. Panel ini murni buat verifikasi manual,
// tidak mengubah data apa pun.
// ==========================================
async function loadDetailCompare(){
  const ticker = state.detailTicker;
  const rows = state.detailHistoricalRows || [];
  if(!ticker || !rows.length){
    state.detailCompareMsg = 'Tarik data Stockbit dulu (tombol "â¬‡ï¸ Tarik Data dari Stockbit" di atas) sebelum membandingkan.';
    render(); return;
  }
  state.detailCompareLoading = true; state.detailCompareMsg = ""; render();
  try{
    const dates = rows.map(r => r.date).filter(Boolean);
    const qs = new URLSearchParams({
      ticker: `eq.${ticker}`,
      date: `in.(${dates.join(",")})`,
      select: "date,close,value,volume,foreign_buy,foreign_sell",
    });
    const res = await fetch(`${SUPABASE_URL}/flows?${qs}`, { headers: getSupaHeaders(), cache: "no-store" });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const flowsRows = await res.json();
    const idxByDate = {};
    flowsRows.forEach(r => { idxByDate[r.date] = r; });

    const combined = rows.map(r => {
      const idx = idxByDate[r.date];
      return {
        date: r.date,
        // "idx" = hari ini ADA di `flows` (data resmi IDX). "stockbit" = TIDAK
        // ada di `flows`, tapi baris ini tetap valid -- price_history_stockbit
        // adalah sumber yang sama yang dipakai loadOrcaHistory() sebagai
        // tambalan di tab Kraken Flow (ORCA) saat flows belum sempat sync
        // (lihat _src: "stockbit" di sana). Jadi "tidak cocok" di sini BUKAN
        // berarti datanya tidak ada di mana pun.
        source: idx ? "idx" : "stockbit",
        closeSb: r.close, closeIdx: idx?.close ?? null,
        valueSb: r.value, valueIdx: idx?.value ?? null,
        volumeSb: r.volume, volumeIdx: idx?.volume ?? null,
        netForeignSb: r.netForeign,
        netForeignIdx: (idx?.foreign_buy != null && idx?.foreign_sell != null) ? (idx.foreign_buy - idx.foreign_sell) : null,
      };
    });
    state.detailCompareRows = combined;
    const matchedCount = combined.filter(r => r.closeIdx != null).length;
    const stockbitOnlyCount = combined.length - matchedCount;
    state.detailCompareMsg = matchedCount
      ? `${matchedCount}/${combined.length} hari cocok dengan \`flows\` (IDX resmi).${stockbitOnlyCount ? ` ${stockbitOnlyCount} hari sisanya HANYA ada di price_history_stockbit — bukan berarti data itu hilang: tab Kraken Flow (ORCA) otomatis memakai baris ini sebagai tambalan saat \`flows\` belum sempat sync (lihat kolom "Sumber" di bawah).` : ""}`
      : `Tidak ada tanggal yang cocok di \`flows\` (IDX) untuk ${ticker} — sync-idx-full.mjs belum pernah menjangkau ticker/periode ini. Ini normal kalau saham baru ditambahkan atau laptop rumah lama tidak sempat sync: data harga/volume tetap tersedia dan tetap dipakai otomatis oleh chart, tab Historical Data, dan Kraken Flow (ORCA) sebagai tambalan, dari price_history_stockbit.`;
    state.detailCompareOpen = true;
  }catch(e){
    state.detailCompareMsg = "Gagal membandingkan: " + e.message;
    state.detailCompareRows = [];
  }
  state.detailCompareLoading = false;
  render();
}

// ==========================================
// TARIK OTOMATIS (BULK) â€” Historical Data untuk banyak ticker sekaligus,
// dipicu dari toolbar tab Screener (mirip Tarik Otomatis Broker Summary).
// Beda dengan broker summary: endpoint historical TIDAK menerima rentang
// tanggal ({ticker}+{period} saja), jadi per ticker cukup SATU request,
// lalu hasilnya disaring ke rentang Dari-Sampai yang dipilih di UI.
// ==========================================
async function fetchExistingHistoricalDates(ticker, dates){
  if(!dates.length) return new Set();
  try{
    const qs = new URLSearchParams({
      stock_code: `eq.${ticker}`, period: "eq.daily",
      trade_date: `in.(${dates.join(",")})`,
      select: "trade_date",
    });
    const res = await fetch(`${SUPABASE_URL}/price_history_stockbit?${qs}`, { headers: getSupaHeaders(), cache: "no-store" });
    if(!res.ok) return new Set();
    const rows = await res.json();
    return new Set(rows.map(r => r.trade_date));
  }catch(e){
    return new Set();
  }
}

async function fetchAndSaveHistoricalBulk(tickers, rangeFrom, rangeTo){
  if(state.stockbitHistoricalBulkLoading) return;
  if(!tickers || !tickers.length){
    state.stockbitHistoricalBulkResults = [{ ticker:"-", date:"-", ok:false, msg:"Centang minimal 1 saham di tab Screener dulu." }];
    render(); return;
  }
  if(!state.stockbitToken){ openSettings(); return; }
  if(!state.stockbitHistoricalEndpoint){
    state.stockbitHistoricalBulkResults = [{ ticker:"-", date:"-", ok:false, msg:'Isi dulu "Endpoint Historical Data" di âš™ï¸ Pengaturan.' }];
    render(); return;
  }
  if(!SUPABASE_URL || !SUPABASE_KEY){ openSettings(); return; }

  const tradingDates = tradingDaysInRange(rangeFrom, rangeTo);
  if(!tradingDates.length){
    state.stockbitHistoricalBulkResults = [{ ticker:"-", date:"-", ok:false, msg:'Periode tanggal tidak valid atau tidak ada hari bursa di rentang itu â€” cek lagi tanggal "Dari" dan "Sampai".' }];
    render(); return;
  }
  const fromDate = tradingDates[0];
  const toDate = tradingDates[tradingDates.length - 1];
  const latestDate = toDate; // hari bursa paling baru â€” tetap ditarik ulang walau sudah ada, sama seperti broker summary

  state.stockbitHistoricalBulkLoading = true;
  state.stockbitHistoricalBulkProgress = { done: 0, total: tickers.length };
  state.stockbitHistoricalBulkResults = [];
  render();

  for(const ticker of tickers){
    const existingDates = await fetchExistingHistoricalDates(ticker, tradingDates);
    const neededDates = tradingDates.filter(d => !existingDates.has(d) || d === latestDate);

    if(!neededDates.length){
      state.stockbitHistoricalBulkResults.push({ ticker, date: `${fromDate}..${toDate}`, ok:true, msg: `Semua ${tradingDates.length} hari sudah ada di database, dilewati (tidak ada request ke Stockbit).` });
      state.stockbitHistoricalBulkProgress.done++;
      render();
      continue;
    }

    const res = await stockbitFetchHistorical(ticker, "daily", { startDate: fromDate, endDate: toDate, limit: Math.max(tradingDates.length + 5, 30), page: 1 });
    if(res.error){
      state.stockbitHistoricalBulkResults.push({ ticker, date: `${fromDate}..${toDate}`, ok:false, msg: res.error });
    } else {
      const parsed = parseStockbitHistorical(res.raw);
      if(!parsed){
        state.stockbitHistoricalBulkResults.push({ ticker, date: `${fromDate}..${toDate}`, ok:false, msg: "Response diterima tapi formatnya tidak dikenali (cek console)." });
        console.log(`Stockbit historical raw response (${ticker}):`, res.raw);
      } else {
        const inRange = parsed.filter(r => r.date >= fromDate && r.date <= toDate);
        if(!inRange.length){
          state.stockbitHistoricalBulkResults.push({ ticker, date: `${fromDate}..${toDate}`, ok:false, msg: `Endpoint mengembalikan ${parsed.length} baris tapi tidak ada yang jatuh di rentang ${fromDate}..${toDate} â€” kemungkinan start_date/end_date/limit di endpoint belum sesuai skema aslinya (cek raw JSON di console).` });
        } else {
          try{
            const payload = inRange.map(r => ({
              stock_code: ticker, trade_date: r.date, period: "daily",
              close: r.close, change: r.change, change_pct: r.changePct, value_idr: r.value, volume: r.volume,
              open: r.open, high: r.high, low: r.low, frequency: r.frequency,
              foreign_buy: r.foreignBuy, foreign_sell: r.foreignSell, net_foreign: r.netForeign
            }));
            await supaFetch(`${SUPABASE_URL}/price_history_stockbit?on_conflict=stock_code,trade_date,period`, {
              method: "POST",
              headers: { ...getSupaHeaders(), "Prefer": "resolution=merge-duplicates,return=representation" },
              body: JSON.stringify(payload)
            });
            const gotDates = new Set(inRange.map(r=>r.date));
            const missing = neededDates.filter(d => !gotDates.has(d));
            state.stockbitHistoricalBulkResults.push({ ticker, date: `${fromDate}..${toDate}`, ok:true,
              msg: `Tersimpan ${payload.length} baris${missing.length ? ` (${missing.length} hari tidak ada di respons endpoint: ${missing.join(", ")})` : ""}.` });
          } catch(e){
            state.stockbitHistoricalBulkResults.push({ ticker, date: `${fromDate}..${toDate}`, ok:false, msg: "Gagal simpan ke DB: " + e.message });
          }
        }
      }
    }
    state.stockbitHistoricalBulkProgress.done++;
    render();
    await new Promise(r => setTimeout(r, 300)); // jeda antar-ticker, jaga rate limit Stockbit
  }

  state.stockbitHistoricalBulkLoading = false;
  render();
}

function renderDetailModalContent(){
  const s = enriched().find(x => x.ticker === state.detailTicker);
  if(!s){
    return `<div class="empty-box">Data untuk ${state.detailTicker} tidak ditemukan di database.</div>`;
  }
  const tabs = [
    { key:"teknikal", label:"ðŸ“Š Teknikal" },
    { key:"fundamental", label:"ðŸ’° Fundamental" },
    { key:"bandarmologi", label:"ðŸ‹ Bandarmologi (IDX)" },
    { key:"brokersum", label:"ðŸ¦ Broker Summary" },
    { key:"historical", label:"ðŸ“… Historical Data" },
    { key:"analisa", label:"ðŸ§  Analisa" }
  ];
  const tabBtns = tabs.map(t => `<button type="button" class="detail-tab-btn ${state.detailTab===t.key?'active':''}" data-detail-tab="${t.key}">${t.label}</button>`).join("");
  let body = "";
  if(state.detailTab === "teknikal") body = renderDetailTeknikal(s);
  else if(state.detailTab === "fundamental") body = renderDetailFundamental(s);
  else if(state.detailTab === "bandarmologi") body = renderDetailBandarmologi(s);
  else if(state.detailTab === "brokersum") body = renderDetailBrokerSummary(s);
  else if(state.detailTab === "historical") body = renderDetailHistorical(s);
  else body = renderDetailAnalisa(s);

  return `
    <div class="detail-head">
      <div>
        <div class="detail-head-price">${dNum(s.cClose)} <span style="font-size:15px;font-weight:600;color:${(s.changePct??0)>=0?'var(--up)':'var(--down)'}">${s.changePct!=null?dNum(s.changePct,{plusSign:true,decimals:2,suffix:'%'}):''}</span></div>
        <div class="detail-head-sub">${s.sektor||"Sektor tidak diketahui"} ${s.syariahLabel==="Ya" ? "Â· Syariah" : ""}</div>
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


async function loadChart(ticker){
  state.selectedTicker=ticker; state.tab="chart";
  const stock = enriched().find(s=>s.ticker===ticker);
  state.selectedLevels = stock ? {
    support:stock.support, resistance:stock.resistance,
    ema21H:stock.ema21H, ema21L:stock.ema21L, fib:stock.fib
  } : null;

  // Histori harga close ASLI dari tabel `flows` (diisi sync-flow.mjs dari
  // IDX). FALLBACK: kalau ticker ini belum pernah disinkronkan ke `flows`
  // (chart kosong), coba baca dari price_history_stockbit period "daily"
  // — hasil Tarik Data Stockbit yang sudah tersimpan lewat tab Historical
  // Data atau Tarik Otomatis (bulk). Sumber pertama tetap `flows` karena
  // itu data resmi IDX.
  state.chartData = [];
  state.chartLoading = true;
  state.chartDataSource = null;
  render();

  const fetchRows = async (url) => {
    try{
      const res = await fetch(url, { headers: getSupaHeaders() });
      if(!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    }catch(e){
      return [];
    }
  };

  try{
    // 1) Sumber utama: flows (sync-idx-full.mjs)
    let rows = await fetchRows(
      `${SUPABASE_URL}/flows?ticker=eq.${encodeURIComponent(ticker)}&select=date,close&order=date.asc`
    );

    if (rows.length){
      state.chartData = rows
        .filter(r => r.close != null)
        .map(r => ({ date: r.date, close: Math.round(r.close) }));
      state.chartDataSource = "flows";
    }

    // 2) Fallback: price_history_stockbit (Stockbit, period daily) —
    //    dipakai kalau flows belum punya data untuk ticker ini sama sekali.
    //    Urut DESC lalu di-reverse supaya ambil N baris TERBARU (mis. 250)
    //    tanpa harus menarik seluruh tabel.
    if (!state.chartData.length){
      rows = await fetchRows(
        `${SUPABASE_URL}/price_history_stockbit?stock_code=eq.${encodeURIComponent(ticker)}&period=eq.daily&select=trade_date,close&order=trade_date.desc&limit=250`
      );
      if (rows.length){
        state.chartData = rows
          .filter(r => r.close != null)
          .map(r => ({ date: r.trade_date, close: Math.round(r.close) }))
          .reverse(); // urut lama -> baru, sama seperti flows
        state.chartDataSource = "price_history_stockbit";
      }
    }
  } catch(e){
    state.chartData = [];
  }
  state.chartLoading = false;
  render();
}

// Return true kalau sinkron ke Supabase berhasil, false kalau gagal â€”
// dulu fungsi ini tidak mengembalikan apa pun sehingga pemanggil
// (saveToBacktest, addManualBacktest) tidak pernah tahu apakah data
// betulan tersimpan di server atau cuma di localStorage.
async function syncBacktestToSupabase(sessionId, sessionDate, items) {
  try {
    // `session_date` di Supabase bertipe kolom `date` (YYYY-MM-DD), tapi
    // `sessionDate` yang dikirim ke fungsi ini adalah string tampilan
    // locale Indonesia (mis. "23/8/2026, 11.29.08" dari
    // toLocaleString('id-ID')) â€” Postgres tidak bisa parse format itu sama
    // sekali (error: "invalid input syntax for type date"). Daripada
    // ikut-ikutan parse string locale itu (rawan salah locale/format lain
    // di kemudian hari), turunkan tanggal ISO langsung dari sessionId
    // (yang selalu berupa String(Date.now()) â€” lihat saveToBacktest &
    // addManualBacktest) sehingga selalu valid terlepas dari format
    // tampilan yang dipakai UI.
    const ts = Number(sessionId);
    const sessionDateIso = Number.isFinite(ts)
      ? toLocalISODate(new Date(ts))
      : todayLocalISO();

    await supaFetch(`${SUPABASE_URL}/backtest_sessions`, {
      method: "POST",
      headers: { ...getSupaHeaders(), "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ id: sessionId, session_date: sessionDateIso })
    });
    
    // JANGAN kirim `id` di sini â€” kolom id di tabel backtest_items adalah
    // GENERATED ALWAYS AS IDENTITY (auto-increment di sisi Supabase), jadi
    // dia MENOLAK kalau client menyertakan nilai id sendiri (error: "cannot
    // insert a non-DEFAULT value into column "id" ... Use OVERRIDING SYSTEM
    // VALUE to override"). Sebelumnya kode ini generate id manual
    // (Date.now()+random) dan selalu gagal di sini â€” makanya backtest tidak
    // pernah benar-benar tersimpan di Supabase meskipun sukses di
    // localStorage. Tidak ada bagian lain di app yang butuh id ini (hapus
    // item pakai session_id+ticker), jadi aman dihilangkan.
    const payloadItems = items.map(it => ({
      session_id: sessionId, ticker: it.ticker,
      entry_price: it.entryPrice || it.hargaEntry || 0,
      source: it.sumber || "Screener", notes: it.filterStr || it.keterangan || "",
      // Kolom baru â€” nama preset/rule kustom yang menghasilkan entry ini.
      // Butuh kolom `criteria text` di tabel backtest_items (lihat catatan
      // migrasi SQL di bawah); kalau kolom belum ada, Supabase akan
      // menolak insert dengan error "column ... does not exist" â€” jalankan
      // dulu migrasinya sebelum mencoba lagi.
      criteria: it.kriteria || null,
      // Kolom baru â€” tanggal entry PER ITEM (bukan cuma tanggal sesi),
      // dipakai kolom "Tanggal Entry" & "Hari" di tab Backtest. Butuh
      // kolom `entry_date date` di tabel backtest_items:
      //   ALTER TABLE backtest_items ADD COLUMN entry_date date;
      // Kalau kolom belum ada, Supabase menolak insert â€” jalankan migrasi
      // dulu. Selama itu belum dijalankan, data tetap tersimpan lokal
      // (localStorage) dan UI tetap menampilkan tanggal entry dari sana.
      entry_date: it.entryDate || null
    }));
    
    await supaFetch(`${SUPABASE_URL}/backtest_items`, {
      method: "POST",
      headers: { ...getSupaHeaders(), "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify(payloadItems)
    });
    return true;
  } catch(e) {
    console.error("Gagal sinkron backtest ke Supabase:", e);
    showError(`Backtest tersimpan lokal, tapi GAGAL sinkron ke Supabase: ${e.message}`);
    return false;
  }
}

async function saveToBacktest(){
  const filtered = getFiltered();
  const toSave = filtered.filter(s => state.selectedForBacktest.has(s.ticker));

  if(toSave.length === 0) return alert("Screener kosong atau tidak ada emiten yang dicentang.");

  // Tangkap preset/rule yang SEDANG AKTIF saat tombol ini diklik, supaya
  // kolom Sumber & Kriteria di tab Backtest menunjukkan preset/filter apa
  // yang menghasilkan emiten-emiten ini (bukan cuma "Screener" generik).
  const ctx = getActiveScreenerContext();
  const sessionId = String(Date.now());
  const tglSesi = new Date().toLocaleString('id-ID');
  // Tanggal entry PER ITEM dikunci ke tanggal hari ini SEKALI SAJA saat
  // disimpan (bukan dihitung ulang tiap render) â€” inilah yang membuat
  // harga & tanggal entry "terkunci": begitu tersimpan, refresh data live
  // di layar tidak pernah menulis ulang entryPrice/entryDate yang sudah
  // ada (lihat renderBacktest â€” hanya "Harga Live" yang diambil dari data
  // live, "Harga Entry" & "Tanggal Entry" selalu dari item yang tersimpan).
  const tglEntryIso = todayLocalISO();
  const items = toSave.map(s => ({
    ticker: s.ticker,
    entryPrice: s.cClose,
    entryDate: tglEntryIso,
    sumber: ctx.label,
    kriteria: ctx.criteria,
    keterangan: `Harga: ${s.cekHarga}; RSI: ${s.cekRsi}; Status RSI: ${s.statusRsi}; MACD: ${s.cekMacd}; Rasio Vol: ${(s.volRatio??0).toFixed(2)}x (${s.sinyalVolume}); Keyakinan Naik: ${s.keyakinanNaik}`
  }));

  state.backtests.unshift({
    id: sessionId, date: tglSesi,
    items: items.map(it=>({ ticker: it.ticker, entryPrice: it.entryPrice, entryDate: it.entryDate, filterStr: it.keterangan, kriteria: it.kriteria, sumber: it.sumber }))
  });
  saveBacktests();
  state.selectedForBacktest.clear(); 
  render();

  const synced = await syncBacktestToSupabase(sessionId, tglSesi, items);
  alert(synced
    ? `${toSave.length} emiten yang dipilih berhasil disimpan ke tab Backtest.`
    : `${toSave.length} emiten disimpan lokal, tapi gagal sinkron ke Supabase. Lihat pesan error di atas halaman.`);
}

async function addManualBacktest(sessionId, ticker, entryPrice, keterangan, entryDate){
  ticker = String(ticker || "").trim().toUpperCase().replace(".JK","");
  if(!ticker) return alert("Ticker wajib diisi.");
  entryPrice = parseFloat(entryPrice) || 0;
  if(!entryPrice) return alert("Harga entry wajib diisi.");
  const note = keterangan && keterangan.trim() ? keterangan.trim() : "Input manual (uji di luar screener)";
  // Tanggal entry: pakai yang diisi user di form (kalau ada), fallback ke
  // hari ini. Ini yang dikunci sebagai "Tanggal Entry" item â€” tidak pernah
  // berubah lagi setelah tersimpan (lihat catatan di saveToBacktest).
  const tglEntryIso = (entryDate && /^\d{4}-\d{2}-\d{2}$/.test(entryDate)) ? entryDate : todayLocalISO();

  let sid = sessionId || "";
  let session = sid ? state.backtests.find(b => String(b.id) === String(sid)) : null;
  if(!session){
    sid = String(Date.now());
    session = { id: sid, date: new Date().toLocaleString('id-ID'), items: [] };
    state.backtests.unshift(session);
  }

  // KUNCI HARGA ENTRY: kalau ticker ini sudah ada di sesi yang sama,
  // JANGAN timpa item lama (baik lokal maupun saat upsert ke Supabase
  // lewat "Prefer: resolution=merge-duplicates" pada session_id+ticker
  // yang sama) â€” tolak dan minta user hapus dulu item lama kalau memang
  // mau mengganti harga/tanggal entry-nya. Tanpa guard ini, menambahkan
  // ticker yang sama dua kali diam-diam mengganti harga entry yang sudah
  // "terkunci" sebelumnya.
  if(session.items.some(it => it.ticker === ticker)){
    return alert(`${ticker} sudah ada di sesi ini dengan harga entry yang sudah terkunci. Hapus item lama dulu (tombol "Hapus" di baris tabel) kalau memang ingin mengganti harga/tanggal entry-nya.`);
  }

  // Manual entry TIDAK punya kriteria screener (ticker & harga diketik
  // sendiri di luar hasil filter), jadi kolom Kriteria diisi keterangan
  // netral, bukan ikut-ikutan preset yang mungkin kebetulan sedang aktif
  // di tab Screener saat ini (itu tidak relevan untuk entry manual).
  const manualKriteria = "Input manual â€” tidak melalui filter screener";
  session.items.push({ ticker, entryPrice, entryDate: tglEntryIso, filterStr: note, kriteria: manualKriteria, sumber: "Manual" });
  saveBacktests();
  render();

  await syncBacktestToSupabase(sid, session.date, [{ ticker, entryPrice, entryDate: tglEntryIso, sumber: "Manual", filterStr: note, kriteria: manualKriteria }]);
  // Kalau gagal, showError() di dalam syncBacktestToSupabase sudah
  // menampilkan alasannya di banner atas halaman.
}

async function deleteBacktestSession(id){
  if(!confirm("Hapus sesi backtest ini?")) return;
  state.backtests = state.backtests.filter(b => String(b.id) !== String(id));
  saveBacktests();
  render();
  try{ await supaFetch(`${SUPABASE_URL}/backtest_sessions?id=eq.${id}`, { method: "DELETE", headers: getSupaHeaders() }); }
  catch(e){ showError(`Sesi dihapus lokal, tapi gagal dihapus di Supabase (bisa muncul lagi setelah refresh): ${e.message}`); }
}

async function deleteBacktestItem(sessionId, ticker){
  const session = state.backtests.find(b => String(b.id) === String(sessionId));
  if(session){
    session.items = session.items.filter(it => it.ticker !== ticker);
    if(session.items.length === 0) state.backtests = state.backtests.filter(b => String(b.id) !== String(sessionId));
  }
  saveBacktests();
  render();
  try{ await supaFetch(`${SUPABASE_URL}/backtest_items?session_id=eq.${sessionId}&ticker=eq.${ticker}`, { method: "DELETE", headers: getSupaHeaders() }); }
  catch(e){ showError(`Item dihapus lokal, tapi gagal dihapus di Supabase (bisa muncul lagi setelah refresh): ${e.message}`); }
}

// ==========================================
// EKSPOR EXCEL â€” TAB SCREENER
//
// Mengekspor hasil screener yang SEDANG TAMPIL (sudah kena filter,
// Rules Kustom, preset DSI, pencarian, dan urutan sort) â€” bukan cuma
// halaman aktif, tapi SELURUH baris hasil filter. Kolom yang diekspor
// mengikuti kolom yang sedang dipilih lewat panel "ðŸ§© Kolom" (state.visibleCols),
// supaya konsisten dengan apa yang dilihat user di tabel.
// ==========================================
let lastScreenerExport = { rows: [], columns: [] };

// Sebagian kolom nilainya nested (mis. "fib.f382", "band.label") atau
// perlu dibulatkan/diformat supaya enak dibaca di Excel (bukan HTML).
function screenerRawValue(s, col){
  switch(col.key){
    case "fib.f382": return s.fib?.f382 ?? null;
    case "fib.f50": return s.fib?.f50 ?? null;
    case "fib.f618": return s.fib?.f618 ?? null;
    case "band.label": return s.band?.label ?? null;
    case "syariah": return (s.syariah===true||s.syariah==="true"||s.syariah==="Ya") ? "Ya" : "Tidak";
    case "changePct": case "volChangePct": case "week52ChangePct": case "vsMa50Pct": case "vsMa200Pct":
      return s[col.key]!=null ? Number(s[col.key].toFixed ? s[col.key].toFixed(2) : s[col.key]) : null;
    case "freqRatio": case "volRatio":
      return s[col.key]!=null ? Number(Number(s[col.key]).toFixed(2)) : null;
    default: {
      const v = s[col.key];
      if(v === undefined) return null;
      if(typeof v === "number") return Number.isFinite(v) ? v : null;
      return v ?? null;
    }
  }
}

function exportScreenerToExcel(){
  const { rows, columns } = lastScreenerExport;
  if(!rows || !rows.length){
    return alert("Tidak ada data screener untuk diekspor (cek filter/pencarian yang aktif).");
  }

  // Selalu sertakan Ticker + Nama Emiten di depan, lalu kolom-kolom
  // yang sedang tampil di tabel (sesuai urutan SCREENER_COLUMNS).
  const data = rows.map(s => {
    const row = { "Ticker": s.ticker, "Nama Emiten": s.name || "-" };
    columns.forEach(col => { row[col.label] = screenerRawValue(s, col); });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil Screener");

  // Lebar kolom otomatis: dasar dari panjang label, minimum 10 char.
  const headers = Object.keys(data[0]);
  worksheet['!cols'] = headers.map(h => ({ wch: Math.max(10, h.length + 2) }));

  const dateStr = todayLocalISO();
  XLSX.writeFile(workbook, `Screener_IHSG_${dateStr}.xlsx`);
}

function exportBacktestToExcel(id) {
  const session = state.backtests.find(b => String(b.id) === String(id));
  if (!session) return;
  
  // 1. Siapkan data dengan kolom "Tanggal Entry"
  const data = session.items.map(item => {
    const liveData = state.stocks.find(s => s.ticker === item.ticker);
    const currentPrice = liveData ? liveData.cClose : item.entryPrice;
    const pl = item.entryPrice ? ((currentPrice - item.entryPrice) / item.entryPrice) * 100 : 0;
    const hariSejak = daysSinceEntry(item.entryDate);
    
    return {
      "Tanggal Entry": fmtDateID(item.entryDate) !== "-" ? fmtDateID(item.entryDate) : session.date, // fallback ke waktu tangkap/sesi kalau item lama belum punya tanggal sendiri
      "Ticker": item.ticker,
      "Sumber": item.sumber || "Screener",
      "Kriteria Screener": item.kriteria || "-",
      "Harga Entry": item.entryPrice,
      "Harga Live": currentPrice,
      "Profit/Loss (%)": parseFloat(pl.toFixed(2)),
      "Hari": hariSejak ?? "-",
      "Filter / Keterangan": item.filterStr || "-"
    };
  });

  // 2. Buat Workbook & Worksheet Excel murni
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Backtest");
  
  // 3. Atur lebar kolom agar rapi
  const wscols = [
    {wch: 14}, // Tanggal Entry
    {wch: 10}, // Ticker
    {wch: 12}, // Sumber
    {wch: 40}, // Kriteria Screener
    {wch: 12}, // Harga Entry
    {wch: 12}, // Harga Live
    {wch: 15}, // Profit/Loss (%)
    {wch: 8},  // Hari
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
      const hariSejak = daysSinceEntry(item.entryDate);
      
      allData.push({
        "Tanggal Entry": fmtDateID(item.entryDate) !== "-" ? fmtDateID(item.entryDate) : session.date,
        "Ticker": item.ticker,
        "Sumber": item.sumber || "Screener",
        "Kriteria Screener": item.kriteria || "-",
        "Harga Entry": item.entryPrice,
        "Harga Live": currentPrice,
        "Profit/Loss (%)": parseFloat(pl.toFixed(2)),
        "Hari": hariSejak ?? "-",
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
    {wch: 14}, // Tanggal Entry
    {wch: 10}, // Ticker
    {wch: 12}, // Sumber
    {wch: 40}, // Kriteria Screener
    {wch: 12}, // Harga Entry
    {wch: 12}, // Harga Live
    {wch: 15}, // Profit/Loss (%)
    {wch: 8},  // Hari
    {wch: 50}  // Keterangan
  ];
  worksheet['!cols'] = wscols;

  // Unduh dengan nama file otomatis memakai tanggal hari ini
  const dateStr = todayLocalISO();
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

  // Menggunakan supaFetch agar error dari Supabase tertangkap dan tidak diam-diam gagal
  await supaFetch(`${SUPABASE_URL}/portfolios?on_conflict=id`, {
    method: "POST",
    headers: { ...getSupaHeaders(), "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify(payload)
  });
}

async function submitPortoForm(){
  const v = readPortoForm();
  if(!v.ticker) return alert("Nama emiten wajib diisi.");
  if(!v.tglBeli || !v.hargaBeli || !v.lotBeli) return alert("Tanggal beli, harga beli, dan jumlah lot wajib diisi.");
  
  const btn = document.getElementById("pfSubmitBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Menyimpan..."; }

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

  try {
    // Coba simpan ke database server dulu
    if (SUPABASE_URL) await syncPortoToServer_(record);
    
    // Jika server menerima, baru simpan secara lokal dan tampilkan
    const idx = state.portfolio.findIndex(p => String(p.id) === String(record.id));
    if(idx >= 0) state.portfolio[idx] = record; else state.portfolio.unshift(record);
    savePortoLocal();
    
    state.portoEditId = null;
    state.portoModalOpen = false;
    state.portoPrefill = null;
    render();
  } catch (e) {
    // Memunculkan pop-up error asli dari server
    alert("GAGAL MENYIMPAN KE DATABASE!\n\n" + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = state.portoEditId ? "Update Transaksi" : "Simpan Transaksi"; }
  }
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
  state.portoPrefill = null;
  render();
}

function openPortoModal(id){
  state.portoEditId = id || null;
  state.portoModalOpen = true;
  state.portoPrefill = null;
  render();
}

// ==========================================
// TAMBAH KE PORTOFOLIO DARI TAB BACKTEST â€” dipicu klik kode emiten
// (ticker) di baris tabel Backtest. Membuka modal "Tambah Transaksi
// Portofolio" dalam mode TAMBAH BARU (bukan edit), dengan Ticker, Tanggal
// Beli, dan Harga Beli sudah terisi dari harga/tanggal entry backtest
// yang SUDAH TERKUNCI (item.entryPrice/item.entryDate â€” lihat catatan di
// saveToBacktest/addManualBacktest) â€” bukan dari harga live saat ini,
// supaya entry backtest dan entry portofolio konsisten.
// ==========================================
function addBacktestItemToPortfolio(sessionId, ticker){
  const session = state.backtests.find(b => String(b.id) === String(sessionId));
  const item = session ? session.items.find(it => it.ticker === ticker) : null;
  if(!item) return;
  state.portoEditId = null;
  state.portoPrefill = {
    ticker: item.ticker,
    hargaBeli: item.entryPrice || "",
    tglBeli: item.entryDate || todayLocalISO()
  };
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

    // Rasio frekuensi hanya dihitung kalau ada basis pembandingnya
    // (freqAnalyzer atau avgFrequency3m dari DB) â€” tidak diakal-akali dari
    // Volume, karena Frekuensi & Volume adalah dua metrik berbeda.
    const freqBase = s.freqAnalyzer ?? s.avgFrequency3m ?? null;
    const freqRatio = (s.frequency!=null && freqBase) ? (s.frequency/freqBase) : null;
    let freq = frequencySignal(freqRatio);
    // Fallback: kalau tabel stocks_screener tidak punya kolom "frequency"
    // (frekuensi transaksi HARI INI, beda dari frequency_ma20/ma50), rasio
    // di atas selalu null. Kalau itu terjadi tapi backend sudah menghitung
    // kolom freq_spike ("Ya"/lainnya) sendiri, pakai itu langsung sebagai
    // sinyal â€” jangan biarkan filter kosong padahal datanya sebenarnya ada.
    if (freqRatio == null && s.freqSpike != null) {
      const isSpike = String(s.freqSpike).trim().toLowerCase() === "ya";
      freq = isSpike
        ? { ratio: null, label: "Ramai (Spike)", tone: "up" }
        : { ratio: null, label: "Normal", tone: "muted" };
    }
    const sinyalFrekuensi = freq.label;

    // Dipakai rule builder ("1 Day Volume Change") â€” persentase perubahan
    // Volume hari ini vs Volume kemarin (prevVol).
    const volChangePct = (s.prevVol!=null && s.prevVol!==0 && s.cVol!=null) ? ((s.cVol - s.prevVol)/s.prevVol)*100 : null;

    const conf = keyakinanNaik(s, vol);
    const keyakinan = s.keyakinanNaik ?? conf.label;
    const kTone = s.keyakinanNaik ? keyakinanToneFromLabel(s.keyakinanNaik) : conf.tone;
    
    let rekomendasi = "-";
    let rekTone = "muted";
    
    const isBreakout = s.isBBSqueeze && s.isBBSqueeze.indexOf("Ya") > -1 && ratio >= 1.5 && s.cClose > s.ema21H && (s.changePct || 0) > 0;
    const isPullback = s.trendHarga && s.trendHarga.indexOf("Bullish") === 0 && s.cClose <= s.ema21L * 1.03 && s.cClose >= (s.support || 0) * 0.98 && s.stochK != null && s.stochD != null && s.prevStochK < s.prevStochD && s.stochK > s.stochD;

    if (isBreakout) { rekomendasi = "ðŸš€ Breakout"; rekTone = "up"; } 
    else if (isPullback) { rekomendasi = "ðŸ§² Pullback"; rekTone = "gold"; }

    // Skor Bagger dihitung setelah volRatio "asli" (ratio) sudah dipastikan,
    // karena formula.md butuh vol_ratio yang sama dipakai sinyal Bandarmologi
    // di atas, bukan volRatio mentah dari DB yang bisa null.
    const bagger = computeBaggerScore({ ...s, volRatio: ratio });

    return { 
      ...s, band, volRatio: ratio, sinyalVolume, volTone: vol.tone, 
      freqRatio, sinyalFrekuensi, freqTone: freq.tone, volChangePct,
      keyakinanNaik: keyakinan, keyakinanScore: s.keyakinanScore ?? conf.score, 
      keyakinanTone: kTone, syariahLabel: boolLabel(s.syariah),
      rekomendasi, rekTone,
      bagger, baggerScoreTotal: bagger.total, baggerTier: bagger.tier, baggerTone: bagger.tone
    };
  });
}

function getFiltered(){
  const hideGocap = document.getElementById("hideGocapChk")?.checked;
  return enriched().filter(s=>{
    if(hideGocap && (s.cClose <= 50 || !s.cVol)) return false;
    if(state.search && !s.ticker.toLowerCase().includes(state.search.toLowerCase())) return false;
    
    // --- PRESET DSI ---
    if(state.activePreset === 'bagger') {
      // Skor Bagger â€” composite formula.md (Fundamental 40% + Momentum 35%
      // + Volume/Smart Money 25%). â‰¥75 = kandidat kuat.
      if ((s.baggerScoreTotal||0) < 75) return false;
    } else if(state.activePreset === 'eri') {
      if (!(s.rsi7 >= 58 && s.rsi7 <= 70 && s.rsi21 >= 50 && s.rsi21 <= 70 && s.rsi7 > s.rsi21)) return false;
      if (!(s.cClose > s.ema21H && s.cClose <= s.ema21H * 1.03 && s.cClose > s.ema89)) return false;
      if (!(s.cHigh > s.prevHigh && s.cLow > s.prevLow && s.cVol > s.prevVol)) return false;
      if (!(s.prevStochK < s.prevStochD && s.stochK > s.stochD)) return false;
    } else if(state.activePreset === 'rsicross') {
      if (!(s.rsi7 >= 58 && s.rsi7 <= 75 && s.rsi21 >= 50 && s.rsi21 <= 75 && s.rsi7 > s.rsi21)) return false;
      if (!(s.cLow < s.ema21L && s.cClose > s.ema21H && s.cClose > s.cOpen)) return false;
      if (!(s.cClose >= (s.cHigh + s.cLow)/2 && s.turnover > 200000000 && s.cClose > s.ma100)) return false;
    } else if(state.activePreset === 'golden') {
      if (!(s.histPrev != null && s.histPrev <= 0 && s.hist > 0)) return false;
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
    } else if (state.activePreset === 'freq_spike') {
      // Lonjakan jumlah transaksi vs rata-rata. Prioritas: freqRatio kalau
      // ada (dari frequency & freq_ma20/avg_frequency_3m). Kalau tabel
      // tidak punya kolom "frequency" hari ini (freqRatio selalu null),
      // fallback ke kolom freq_spike yang sudah dihitung backend, supaya
      // preset ini tetap jalan pakai data yang memang tersedia di DB.
      const isSpikeFromRatio = s.freqRatio != null && s.freqRatio >= 1.5;
      const isSpikeFromDb = s.freqRatio == null && s.freqSpike != null
        && String(s.freqSpike).trim().toLowerCase() === "ya";
      if (!isSpikeFromRatio && !isSpikeFromDb) return false;
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
    if(f.sinyalFrekuensi.length && !f.sinyalFrekuensi.includes(s.sinyalFrekuensi)) return false;
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
    if(!inRange(s.frequency, rf.frequency)) return false;

    if(state.customRules && state.customRules.length){
      for(const rule of state.customRules){
        if(!evalCustomRule(s, rule)) return false;
      }
    }

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

// ==========================================================
// âœ¨ SMART PICK â€” mesin deteksi & skor 5 sinyal
//
// PENTING soal keterbatasan: ini BUKAN model AI/machine-learning beneran.
// Ini scoring rule-based di atas data teknikal yang sudah ada di
// enriched() (posisi 52W, rasio volume, RSI, MA, dst) â€” dikemas mirip
// "AI Screener" ala Stockbit supaya gampang dibaca. Threshold di bawah
// heuristik pribadi, silakan disesuaikan lewat konstanta di tiap
// detect() kalau hasilnya kurang cocok dengan gaya trading Anda.
// ==========================================================
function clamp01(x){ return Math.max(0, Math.min(1, x)); }
// Likuiditas harian dipakai sebagai syarat minimum tiap sinyal (supaya
// tidak menyarankan saham yang susah dieksekusi) â€” pakai value_traded
// kalau ada, fallback ke turnover.
function spLiquidity(s){ return (s.valueTraded!=null ? s.valueTraded : s.turnover) || 0; }
// Posisi harga dalam range 52 minggu (0% = di low52w, 100% = di high52w).
// Pakai kolom pos52w dari DB kalau ada; kalau tidak, turunkan sendiri
// dari cClose/high52w/low52w.
function spPos52w(s){
  if(s.pos52w!=null && !isNaN(s.pos52w)) return s.pos52w;
  if(s.high52w!=null && s.low52w!=null && s.high52w > s.low52w){
    return (s.cClose - s.low52w) / (s.high52w - s.low52w) * 100;
  }
  return null;
}
// Rata-rata Value (Rp) historis dari Stockbit (price_history_stockbit),
// EXCLUDE hari ini (kalau kebawa) supaya tidak membandingkan angka hari ini
// dengan dirinya sendiri. null kalau datanya kurang dari 3 hari (belum
// cukup untuk baseline yang wajar) â€” caller WAJIB fallback ke volRatio biasa
// kalau null, karena ini fitur opsional (cuma ticker yang pernah ditarik
// manual lewat tombol "ðŸ“… Historical" yang akan punya data).
function spStockbitAvgValue(ticker){
  const rows = state.stockbitValueHistory?.[ticker];
  if(!rows || rows.length < 3) return null;
  const today = todayLocalISO();
  const hist = rows.filter(r => r.date !== today && r.value_idr > 0);
  if(hist.length < 3) return null;
  const avg = hist.reduce((a,r)=>a+r.value_idr, 0) / hist.length;
  return avg > 0 ? avg : null;
}
// Rasio Value hari ini (live, dari stocks_screener) vs rata-rata Value
// historis Stockbit â€” versi "volRatio" tapi pakai NILAI transaksi riil
// (value_idr), bukan cuma jumlah lembar. null kalau tidak ada data Stockbit
// untuk ticker ini (lihat spStockbitAvgValue).
function spStockbitValueRatio(s){
  const avg = spStockbitAvgValue(s.ticker);
  if(!avg) return null;
  return spLiquidity(s) / avg;
}

const SMART_PICK_DEFS = [
  {
    id: "area_demand", icon: "ðŸ“¥", tone: "gold",
    title: "Area Demand",
    shortDesc: "Saham profitabel + volume tinggi di area support 52W â€” siap bounce.",
    definisi: "Saham fundamental sehat yang harganya masuk ke zona bawah range 52 minggu (area support/demand), tapi belum benar-benar rontok â€” kandidat pantulan (bounce) dari area akumulasi.",
    filter: "Volume Tinggi: wajib â‰¥ Rp1 M/hari. Saham Hidup: harga â‰¥ Rp100 (tidak rugi/gocap), Range 52W â‰¥ 15%. Profitabel: NPM â‰¥ 0 & ROE â‰¥ 0. Posisi â‰¤ 30% range 52W (zona bawah). Reaksi di Support: perubahan harga hari ini &gt; -4% (bukan dump).",
    scoring: "Skor Zona 100 = Support 25 + Reaksi 20 + Volume 25 (rasio spike ATAU nilai transaksi absolut, mana yang lebih tinggi) + Pullback 15 (toleransi Â±10% dari support) + Struktur 15 (bonus multi-minggu).",
    sinyalKuat: "Volume spike 2Ã—â€“5Ã—+ dari rata-rata (badge otomatis) di dekat area support = smart money mulai serap.",
    detect(s){
      const pos = spPos52w(s);
      const liq = spLiquidity(s);
      const changePct = s.changePct || 0;
      // "Saham profitabel" (klaim di shortDesc/definisi) & "Saham Hidup" â€”
      // dua syarat ini SEBELUMNYA cuma teks doang, tidak pernah dicek di
      // detect(). Null diperlakukan netral/lolos (bukan otomatis gagal),
      // konsisten dengan gaya defensif di kode lain â€” cuma yang JELAS
      // negatif/sempit yang digugurkan.
      const npmOk = s.npm == null || s.npm >= 0;
      const roeOk = s.roe == null || s.roe >= 0;
      const range52wPct = (s.high52w != null && s.low52w != null && s.low52w > 0) ? (s.high52w - s.low52w) / s.low52w * 100 : null;
      const rangeOk = range52wPct == null || range52wPct >= 15;
      const match = pos != null && pos <= 30 && (s.cClose||0) >= 100 && changePct > -4 && liq >= 1e9 && npmOk && roeOk && rangeOk;
      if(!match) return { match:false, score:0, strong:false };
      const supportScore = 25 * clamp01((30 - pos) / 30);
      const reaksiScore = 20 * clamp01((changePct + 4) / 8);
      // Kalau ada riwayat Value Stockbit untuk ticker ini, pakai rasio Value
      // riil (bukan cuma volRatio lembar) â€” ambil yang LEBIH TINGGI di antara
      // keduanya, karena keduanya sama-sama indikasi valid smart money masuk,
      // dan volRatio dari `flows`/Yahoo kadang telat/kurang presisi dibanding
      // Value Stockbit yang ditarik manual.
      const stockbitRatio = spStockbitValueRatio(s);
      const volRatioEffective = stockbitRatio != null ? Math.max(s.volRatio || 0, stockbitRatio) : s.volRatio;
      // Volume Score sekarang diambil dari YANG TERBAIK antara dua cara nilai:
      // (a) rasio spike vs rata-rata (cara lama) â€” bagus buat nangkep saham
      //     yang tiba-tiba ramai padahal biasanya sepi.
      // (b) nilai transaksi ABSOLUT hari ini (cara ihsgscreener.com) â€” bagus
      //     buat saham yang MEMANG likuid tiap hari (jadi "Vol Sangat Tinggi"
      //     meski rasio spike-nya kecil, mis. TCPI: Rp14M/hari tapi cuma 1.2x
      //     rata-rata â€” sebelumnya nyaris nol padahal jelas likuid tinggi).
      // Skala absolut: mulai dari syarat wajib match (Rp1 miliar = baseline
      // 0) sampai Rp20 miliar (skor penuh 25).
      const volumeScoreRatio = volRatioEffective != null ? 25 * clamp01((Math.min(volRatioEffective,6) - 1) / 5) : 12;
      const volumeScoreAbsolute = 25 * clamp01((liq - 1e9) / 19e9);
      const volumeScore = Math.max(volumeScoreRatio, volumeScoreAbsolute);
      // Toleransi jarak ke Support dilonggarkan dari 5% -> 10% dari harga
      // support â€” 5% ternyata terlalu ketat untuk saham yang sudah mulai
      // bounce tapi belum sangat dekat support (mis. TCPI: 8.4% dari support,
      // sebelumnya skor pullback = 0 padahal secara zona masih wajar disebut
      // "dekat support").
      const pullbackScore = s.support ? 15 * (1 - clamp01(Math.abs(s.cClose - s.support) / (s.support * 0.10))) : 7;
      const strukturScore = s.week52ChangePct != null ? (s.week52ChangePct > -25 ? 15 : 6) : 8;
      const score = supportScore + reaksiScore + volumeScore + pullbackScore + strukturScore;
      const strong = score >= 75 && (volRatioEffective||0) >= 2;
      return { match:true, score, strong, stockbitVerified: stockbitRatio != null };
    }
  },
  {
    id: "throwback", icon: "ðŸ”", tone: "teal",
    title: "Throwback / Retest Breakout",
    shortDesc: "Sudah breakout lalu pullback ke support â€” bounce dari retest.",
    definisi: "Saham yang sudah breakout dari uptrend menengah, lalu turun kembali (pullback) menguji area breakout sebagai support baru, dan mulai memantul lagi.",
    filter: "Posisi 45â€“90% range 52W (zona atas). Perubahan hari ini â‰¥ 0% (hold/hijau). Uptrend & pullback ke area breakout sebagai support baru = BONUS skor (bukan syarat wajib).",
    scoring: "Kekuatan uptrend (MA21&gt;MA50&gt;MA100) + kualitas retest (jarak ke support) + posisi bounce 60â€“80% dari skor total.",
    sinyalKuat: "Uptrend kuat + retest sehat + posisi bounce â‰¥60% + kenaikan hari ini &gt;2% = retest berkualitas.",
    detect(s){
      const pos = spPos52w(s);
      const changePct = s.changePct || 0;
      // Sebelumnya ada gate tambahan `cClose > MA50` di sini â€” dihapus karena
      // di spesifikasi acuan, uptrend/pullback (MA21>MA50>MA100, chg13W/26W/4W)
      // itu BONUS SKOR (lihat uptrendScore di bawah), bukan syarat lolos/gugur.
      // Saham retest sehat yang closing-nya pas sedikit di bawah MA50 dulu
      // otomatis gugur duluan â€” sekarang tetap lolos dengan skor lebih rendah.
      const match = pos != null && pos >= 45 && pos <= 90 && changePct >= 0;
      if(!match) return { match:false, score:0, strong:false };
      const uptrendScore = (s.ma21 > s.ma50 && s.ma50 > s.ma100) ? 40 : (s.cClose > s.ma50 ? 22 : 8);
      const retestRef = s.support || s.ema21L;
      const retestScore = retestRef ? 30 * (1 - clamp01(Math.abs(s.cClose - retestRef) / (retestRef * 0.05))) : 15;
      const bounceScore = 30 * clamp01(changePct / 4);
      const score = uptrendScore + retestScore + bounceScore;
      const strong = score >= 75 && changePct > 2;
      return { match:true, score, strong };
    }
  },
  {
    id: "liquidity_sweep", icon: "ðŸ’§", tone: "muted",
    title: "Liquidity Sweep",
    shortDesc: "Sapu bawah support lalu reversal tajam â€” stop hunt bandar.",
    definisi: "Harga menyapu ke bawah zona low 52 minggu (stop hunt / grab liquidity), lalu berbalik naik tajam dari harga yang sama dengan volume tinggi.",
    filter: "Posisi &lt; 30% range 52W (zona bawah). Perubahan hari ini &gt; +1% (reversal). Volume transaksi â‰¥ Rp100 jt/hari. Drop lebih dalam dari MA + volume spike = bonus skor.",
    scoring: "Kedalaman sweep (drop vs low sebelumnya) + ketajaman reversal hari ini + kekuatan volume vs median.",
    sinyalKuat: "Drop &gt;15% lalu reversal &gt;5% dengan volume &gt;5Ã— median = sweep + reversal kuat.",
    detect(s){
      const pos = spPos52w(s);
      const liq = spLiquidity(s);
      const changePct = s.changePct || 0;
      const match = pos != null && pos < 30 && changePct > 1 && liq >= 100e6;
      if(!match) return { match:false, score:0, strong:false };
      const deeper = (s.prevLow && s.cLow != null && s.cLow < s.prevLow) ? ((s.prevLow - s.cLow) / s.prevLow) * 100 : 0;
      const depthScore = 35 * clamp01(deeper / 10);
      const reversalScore = 35 * clamp01((changePct - 1) / 6);
      // Sama seperti Area Demand â€” pakai rasio Value Stockbit kalau tersedia,
      // ambil yang lebih tinggi dibanding volRatio biasa (lihat catatan di
      // spStockbitValueRatio()).
      const stockbitRatio = spStockbitValueRatio(s);
      const volRatioEffective = stockbitRatio != null ? Math.max(s.volRatio || 0, stockbitRatio) : s.volRatio;
      const volSpikeScore = volRatioEffective != null ? 30 * clamp01((volRatioEffective - 1) / 4) : 12;
      const score = depthScore + reversalScore + volSpikeScore;
      const strong = score >= 75 && changePct > 5 && (volRatioEffective||0) >= 5;
      return { match:true, score, strong, stockbitVerified: stockbitRatio != null };
    }
  },
  {
    id: "bull_divergence", icon: "ðŸ“‰", tone: "up",
    title: "Bull Divergence",
    shortDesc: "Harga turun tapi momentum berbalik naik â€” sinyal reversal.",
    definisi: "Harga masih di zona bawah 52 minggu (oversold/downtrend) tapi hari ini naik dengan volume tinggi â€” sinyal akumulasi & reversal dini.",
    filter: "Posisi harga &lt; 55% range 52W. Perubahan hari ini positif (hijau). Volume transaksi â‰¥ Rp100 jt/hari.",
    scoring: "Makin dekat ke low 52W = makin tinggi skor. Ditambah volume spike vs median pasar + kenaikan hari ini (%).",
    sinyalKuat: "Harga &lt;20% dari low 52W + naik &gt;3% + volume &gt;5Ã— median = divergence sangat kuat.",
    detect(s){
      const pos = spPos52w(s);
      const liq = spLiquidity(s);
      const changePct = s.changePct || 0;
      const match = pos != null && pos < 55 && changePct > 0 && liq >= 100e6;
      if(!match) return { match:false, score:0, strong:false };
      const proximityScore = 40 * clamp01((55 - pos) / 55);
      const volSpikeScore = s.volRatio != null ? 30 * clamp01((s.volRatio - 1) / 4) : 12;
      const gainScore = 30 * clamp01(changePct / 4);
      const score = proximityScore + volSpikeScore + gainScore;
      const strong = pos < 20 && changePct > 3 && (s.volRatio||0) >= 5;
      return { match:true, score, strong };
    }
  },
  {
    id: "early_breakout", icon: "ðŸš€", tone: "up",
    title: "Early Breakout",
    shortDesc: "Volume meledak + harga dekat resistance â€” sinyal breakout awal.",
    definisi: "Harga mendekati/menembus resistance dengan volume tinggi â€” konfirmasi breakout nyata, bukan fake breakout.",
    filter: "Posisi harga &gt; 50% range 52W. Perubahan hari ini positif (hijau). Volume transaksi â‰¥ Rp100 jt/hari.",
    scoring: "Makin dekat ke high 52W = makin tinggi skor. Ditambah volume breakout vs median pasar + kenaikan hari ini (%).",
    sinyalKuat: "Posisi &gt;85% dari range 52W + naik &gt;4% + volume &gt;5Ã— median = breakout dikonfirmasi, bukan fake.",
    detect(s){
      const pos = spPos52w(s);
      const liq = spLiquidity(s);
      const changePct = s.changePct || 0;
      const match = pos != null && pos > 50 && changePct > 0 && liq >= 100e6;
      if(!match) return { match:false, score:0, strong:false };
      const proximityScore = 40 * clamp01((pos - 50) / 50);
      const volSpikeScore = s.volRatio != null ? 30 * clamp01((s.volRatio - 1) / 4) : 12;
      const gainScore = 30 * clamp01(changePct / 4);
      const score = proximityScore + volSpikeScore + gainScore;
      const strong = pos > 85 && changePct > 4 && (s.volRatio||0) >= 5;
      return { match:true, score, strong };
    }
  }
];

function spDefById(id){ return SMART_PICK_DEFS.find(d=>d.id===id); }
function spToneFor(id){ return (spDefById(id) || {}).tone || "muted"; }
function spTitleFor(id){ return (spDefById(id) || {}).title || id; }

function getSmartPickMatches(defId){
  const def = spDefById(defId);
  if(!def) return [];
  return enriched()
    .map(s => ({ ticker: s.ticker, ...def.detect(s) }))
    .filter(m => m.match)
    .sort((a,b) => b.score - a.score);
}

// Versi lengkap untuk modal "Daftar Saham" â€” beda dari getSmartPickMatches
// (yang cuma dipakai chip ringkas di kartu), ini bawa data harga/posisi/vol
// sekalian supaya bisa ditampilkan sebagai tabel data saham per fitur.
function getSmartPickMatchesFull(defId){
  const def = spDefById(defId);
  if(!def) return [];
  return enriched()
    .map(s => {
      const r = def.detect(s);
      if(!r.match) return null;
      return {
        ticker: s.ticker, sektor: s.sektor, name: s.name,
        price: s.cClose, changePct: s.changePct,
        pos52w: spPos52w(s), volRatio: s.volRatio,
        score: r.score, strong: r.strong, stockbitVerified: !!r.stockbitVerified
      };
    })
    .filter(Boolean)
    .sort((a,b) => b.score - a.score);
}

// Gabungkan riwayat sinyal yang sudah difinalisasi (state.spHistory) dengan
// harga live saat ini (state.stocks) untuk menghitung Now / Î”% / Hari di
// tabel Rekap & Share Signal.
function smartPickRowsWithLive(){
  const priceByTicker = {};
  state.stocks.forEach(s => { priceByTicker[s.ticker] = s.cClose; });
  const today = new Date();
  return state.spHistory
    .filter(h => state.spFilterType === "all" || h.signal_type === state.spFilterType)
    .map(h => {
      const now = priceByTicker[h.stock_code];
      const entry = Number(h.entry_price);
      const chgPct = (now != null && entry) ? ((now - entry) / entry * 100) : null;
      const muncul = new Date(h.muncul_date + "T00:00:00");
      const hari = Math.max(0, Math.round((today - muncul) / 86400000));
      return { ...h, nowPrice: now, chgPct, hari };
    });
}

function computeSmartPickStats(rows){
  const withChg = rows.filter(r => r.chgPct != null);
  const wins = withChg.filter(r => r.chgPct > 0).length;
  return {
    winRate: withChg.length ? (wins / withChg.length * 100) : null,
    avg: withChg.length ? (withChg.reduce((a,r) => a + r.chgPct, 0) / withChg.length) : null,
    total: rows.length
  };
}

// "Finalisasi Signal (EOD)": ambil semua saham yang LOLOS hari ini untuk
// tiap sinyal, lalu kunci (ticker, signal_type, tanggal, harga entry) ke
// tabel smart_pick_signals. Pakai Prefer: resolution=merge-duplicates
// supaya klik ulang di HARI YANG SAMA cuma mem-update baris yang sama
// (butuh unique constraint (stock_code,signal_type,muncul_date) di DB â€”
// lihat sql/07_smart_pick.sql), bukan bikin duplikat. Begitu tanggalnya
// sudah lewat, baris lama TIDAK pernah ditimpa lagi â€” itulah "dikunci ke
// tanggal data" yang dimaksud di UI.
async function finalizeSmartPickSignals(){
  if(!SUPABASE_URL || !SUPABASE_KEY){ openSettings(); return; }
  state.spFinalizing = true; state.spMsg = ""; render();
  try{
    const today = todayLocalISO();
    const list = enriched();
    const rows = [];
    SMART_PICK_DEFS.forEach(def => {
      list.forEach(s => {
        const r = def.detect(s);
        if(r.match){
          rows.push({
            stock_code: s.ticker,
            signal_type: def.id,
            signal_label: def.title,
            muncul_date: today,
            entry_price: s.cClose,
            score: Math.round(r.score),
            is_strong: !!r.strong
          });
        }
      });
    });
    if(!rows.length){
      state.spMsg = "Tidak ada saham yang lolos kriteria Smart Pick hari ini â€” belum ada yang difinalisasi.";
      state.spMsgError = true;
    } else {
      const res = await fetch(`${SUPABASE_URL}/smart_pick_signals`, {
        method: "POST",
        headers: { ...getSupaHeaders(), "Prefer": "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(rows)
      });
      if(!res.ok){
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      state.spMsg = `âœ… Finalisasi berhasil: ${rows.length} sinyal dikunci untuk tanggal ${fmtDateID(today)}.`;
      state.spMsgError = false;
      await loadSmartPickHistory();
    }
  }catch(e){
    state.spMsg = "Gagal finalisasi: " + e.message + " â€” pastikan tabel smart_pick_signals & unique constraint-nya sudah dibuat (lihat sql/07_smart_pick.sql).";
    state.spMsgError = true;
  }
  state.spFinalizing = false;
  render();
}

async function loadSmartPickHistory(){
  if(!SUPABASE_URL || !SUPABASE_KEY) return;
  state.spHistoryLoading = true; render();
  try{
    const qs = new URLSearchParams({ select: "*", order: "muncul_date.desc,score.desc" });
    if(state.spFilterType !== "all") qs.set("signal_type", `eq.${state.spFilterType}`);
    if(state.spFrom) qs.append("muncul_date", `gte.${state.spFrom}`);
    if(state.spTo) qs.append("muncul_date", `lte.${state.spTo}`);
    const res = await fetch(`${SUPABASE_URL}/smart_pick_signals?${qs.toString()}`, { headers: getSupaHeaders(), cache: "no-store" });
    const json = await res.json();
    if(!Array.isArray(json)) throw new Error((json && json.message) || `HTTP ${res.status}`);
    state.spHistory = json;
  }catch(e){
    showError("Gagal memuat riwayat Smart Pick: " + e.message + " â€” pastikan tabel smart_pick_signals sudah dibuat (lihat sql/07_smart_pick.sql).");
  }
  state.spHistoryLoading = false;
  render();
}

function render(){
  document.getElementById("modePill").className = "pill pill-up";
  document.getElementById("modePill").textContent = "Data Live";
  if(typeof updateMarketStatusUI === 'function') updateMarketStatusUI();
  if(typeof updateMarketStatusUI === 'function') updateMarketStatusUI();
  document.querySelectorAll(".tab-btn").forEach(b=> b.classList.toggle("active", b.dataset.tab===state.tab));

  const content = document.getElementById("content");
  if(state.tab==="screener") content.innerHTML = renderScreener();
  else if(state.tab==="smartpick") content.innerHTML = renderSmartPick();
  else if(state.tab==="sektoral") content.innerHTML = renderSektoral();
  else if(state.tab==="watchlist") content.innerHTML = renderWatchlist();
  else if(state.tab==="backtest") content.innerHTML = renderBacktest();
  else if(state.tab==="portfolio") content.innerHTML = renderPortfolio();
  else if(state.tab==="chart") content.innerHTML = renderChart();
  else if(state.tab==="brokersum") content.innerHTML = renderBrokerSummary();
  else if(state.tab==="target") content.innerHTML = renderTargetBandar();
  else if(state.tab==="eps") content.innerHTML = renderEntryPriceScanner();
  else if(state.tab==="kraken") content.innerHTML = renderKrakenFlow();
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
    document.getElementById("detailModalTitle").textContent = `Detail Emiten Â· ${state.detailTicker}`;
    document.getElementById("detailModalContent").innerHTML = renderDetailModalContent();
    document.querySelectorAll("[data-detail-tab]").forEach(btn=>{
      btn.onclick = () => setDetailTab(btn.dataset.detailTab);
    });
    document.querySelectorAll("#detailModalContent [data-chart]").forEach(b=> b.onclick = ()=>{ closeDetail(); loadChart(b.dataset.chart); });

    // --- Broker Summary di dalam modal Detail Emiten ---
    const dbsDateInput = document.getElementById("dbsDate");
    if(dbsDateInput) dbsDateInput.onchange = (e) => { state.detailBsDate = e.target.value; };
    const dbsLoadBtn = document.getElementById("dbsLoadBtn");
    if(dbsLoadBtn) dbsLoadBtn.onclick = loadDetailBrokerSummary;
    const dbsSaveBtn = document.getElementById("dbsSaveBtn");
    if(dbsSaveBtn) dbsSaveBtn.onclick = saveDetailBrokerSummaryRows;
    const dbsCsvFillBtn = document.getElementById("dbsCsvFillBtn");
    if(dbsCsvFillBtn) dbsCsvFillBtn.onclick = fillDbsFromCsv;
    const dbsEditorPanel = document.getElementById("dbsEditorPanel");
    if(dbsEditorPanel) dbsEditorPanel.ontoggle = (e) => { state.detailBsEditorOpen = e.target.open; };

    // --- Historical Data (Daily/Weekly/Monthly) di dalam modal Detail Emiten ---
    document.querySelectorAll("[data-hist-period]").forEach(btn=>{
  btn.onclick = () => { state.detailHistoricalPeriod = btn.dataset.histPeriod; loadDetailHistoricalFromDb(); };
});
const dhistDbLoadBtn = document.getElementById("dhistDbLoadBtn");
if(dhistDbLoadBtn) dhistDbLoadBtn.onclick = loadDetailHistoricalFromDb;
const dhistLoadBtn = document.getElementById("dhistLoadBtn");
if(dhistLoadBtn) dhistLoadBtn.onclick = loadDetailHistoricalFromStockbit;
const dhistFromInput = document.getElementById("dhistFrom");
if(dhistFromInput) dhistFromInput.onchange = (e) => { state.detailHistoricalFrom = e.target.value; };
const dhistToInput = document.getElementById("dhistTo");
if(dhistToInput) dhistToInput.onchange = (e) => { state.detailHistoricalTo = e.target.value; }
    const dhistSaveBtn = document.getElementById("dhistSaveBtn");
    if(dhistSaveBtn) dhistSaveBtn.onclick = saveDetailHistoricalRows;
    const dhistCompareBtn = document.getElementById("dhistCompareBtn");
    if(dhistCompareBtn) dhistCompareBtn.onclick = loadDetailCompare;
    const dhistComparePanel = document.getElementById("dhistComparePanel");
    if(dhistComparePanel) dhistComparePanel.ontoggle = (e) => { state.detailCompareOpen = e.target.open; };
  }

  document.getElementById("spListModalOverlay").classList.toggle("open", !!state.spListOpenDefId);
  if(state.spListOpenDefId){
    document.getElementById("spListModalTitle").textContent = `ðŸ“‹ Daftar Saham Â· ${spTitleFor(state.spListOpenDefId)}`;
    document.getElementById("spListModalContent").innerHTML = renderSmartPickListModalContent();
    document.querySelectorAll("[data-sp-list-detail]").forEach(b=>{
      b.onclick = () => { closeSmartPickList(); openDetail(b.dataset.spListDetail); };
    });
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
          <span style="font-size:9px;color:var(--muted)">â–¼</span>
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
  sinyalVolume:"Sinyal Volume", sinyalFrekuensi:"Sinyal Frekuensi", keyakinanNaik:"Keyakinan Naik", cekHarga:"Sinyal Harga", cekRsi:"Sinyal RSI",
  statusRsi:"Status RSI", band:"Bandarmologi", uangGedeMasuk:"Uang Gede", isBBSqueeze:"BB Squeeze", valuasi:"Valuasi",
  bbWidth:"BB Width", atr14:"ATR 14", clv:"CLV", rsi7:"RSI 7", rsi21:"RSI 21", frequency:"Frekuensi"
};
const PRESET_LABELS = { bagger:"Skor Bagger â‰¥75", eri:"Eri Ginanjar", rsicross:"RSI & Harga Cross", golden:"Golden Cross DSI", uptrend:"Super Uptrend", breakout:"Volatility Breakout", pullback:"Pullback Uptrend", custom_bandar:"BPJS", asing_akumulasi:"Akumulasi Asing (IDX)", freq_spike:"Lonjakan Frekuensi" };
function clearChip(kind, key, value){
  if(kind==="search") state.search="";
  else if(kind==="preset") state.activePreset=null;
  else if(kind==="multi") state.filters[key] = state.filters[key].filter(v=>String(v)!==String(value));
  else if(kind==="range") state.rangeFilters[key] = {min:"",max:""};
  else if(kind==="rules") { state.customRules = []; saveCustomRules(); }
  state.page = 1;
  render();
}

function renderActiveFilterChips(){
  const chips = [];
  if(state.search) chips.push(`<span class="filter-chip">Cari: "${state.search}" <button onclick="clearChip('search')" title="Hapus">âœ•</button></span>`);
  if(state.activePreset) chips.push(`<span class="filter-chip">Preset: ${PRESET_LABELS[state.activePreset]||state.activePreset} <button onclick="clearChip('preset')" title="Hapus">âœ•</button></span>`);
  Object.keys(state.filters).forEach(key=>{
    state.filters[key].forEach(val=>{
      chips.push(`<span class="filter-chip">${FILTER_LABELS[key]||key}: ${val} <button onclick="clearChip('multi','${key}','${String(val).replace(/'/g,"\\'")}')" title="Hapus">âœ•</button></span>`);
    });
  });
  Object.keys(state.rangeFilters).forEach(key=>{
    const r = state.rangeFilters[key];
    if(r.min !== "" || r.max !== ""){
      chips.push(`<span class="filter-chip">${FILTER_LABELS[key]||key}: ${r.min||'â€¦'} - ${r.max||'â€¦'} <button onclick="clearChip('range','${key}')" title="Hapus">âœ•</button></span>`);
    }
  });
  if(state.customRules && state.customRules.length){
    chips.push(`<span class="filter-chip">Rules Kustom: ${state.customRules.length} aktif <button onclick="clearChip('rules')" title="Hapus semua rule">âœ•</button></span>`);
  }
  if(chips.length===0) return "";
  return `<div class="active-filters-bar">${chips.join("")}</div>`;
}

function hasActiveFilters(){
  const f = state.filters;
  const anyMulti = Object.keys(f).some(k => f[k].length > 0);
  const rf = state.rangeFilters;
  const anyRange = Object.keys(rf).some(k => rf[k].min !== "" || rf[k].max !== "");
  const anyRules = state.customRules && state.customRules.length > 0;
  return anyMulti || anyRange || !!state.search || anyRules;
}

// Setiap kolom punya "group" supaya bisa dikelompokkan di panel pemilih
// kolom (Harga, Fundamental, Teknikal, Bandarmologi, Analisa) â€” dengan
// ~50 kolom, tanpa pengelompokan panel pemilihnya sendiri akan berantakan.
const SCREENER_COLUMNS = [
  { key:"sektor", label:"Sektor", group:"Umum", cell:s=>`<td>${s.sektor||"-"}</td>` },
  { key:"syariah", label:"Syariah", group:"Umum", cell:s=>`<td>${s.syariah===true||s.syariah==="true"||s.syariah==="Ya"?"âœ…":(s.syariah===false||s.syariah==="false"||s.syariah==="Tidak"?"-":(s.syariah??"-"))}</td>` },
  { key:"cOpen", label:"Open", group:"Harga", cell:s=>`<td class="mono">${fmtNum(s.cOpen)}</td>` },
  { key:"cHigh", label:"High", group:"Harga", cell:s=>`<td class="mono">${fmtNum(s.cHigh)}</td>` },
  { key:"cLow", label:"Low", group:"Harga", cell:s=>`<td class="mono">${fmtNum(s.cLow)}</td>` },
  { key:"cClose", label:"Close", group:"Harga", cell:s=>`<td class="mono">${fmtNum(s.cClose)}</td>` },
  { key:"changePct", label:"Perubahan%", group:"Harga", cell:s=>`<td class="mono" style="color:${(s.changePct??0)>=0?'var(--up)':'var(--down)'}">${s.changePct!=null?((s.changePct>=0?'+':'')+s.changePct.toFixed(2)+'%'):'-'}</td>` },
  { key:"cVol", label:"Volume", group:"Harga", cell:s=>`<td class="mono">${fmtNum(s.cVol)}</td>` },
  { key:"volChangePct", label:"1D Vol Change (%)", group:"Harga", cell:s=>`<td class="mono" style="color:${(s.volChangePct??0)>=0?'var(--up)':'var(--down)'}">${s.volChangePct!=null?((s.volChangePct>=0?'+':'')+s.volChangePct.toFixed(1)+'%'):'-'}</td>` },
  { key:"frequency", label:"Frekuensi", group:"Harga", cell:s=>`<td class="mono">${fmtNum(s.frequency)}</td>` },
  { key:"freqAnalyzer", label:"Frequency Analyzer", group:"Harga", cell:s=>`<td class="mono">${fmtNum(s.freqAnalyzer)}</td>` },
  { key:"freqRatio", label:"Rasio Frek.", group:"Harga", cell:s=>`<td class="mono" style="color:${s.freqTone==='up'?'var(--up)':s.freqTone==='down'?'var(--down)':'var(--muted)'}">${s.freqRatio!=null?s.freqRatio.toFixed(2)+'x':'-'}</td>` },
  { key:"sinyalFrekuensi", label:"Sinyal Frekuensi", group:"Harga", cell:s=>`<td>${pillHtml(s.sinyalFrekuensi||"-", s.freqTone)}</td>` },
  { key:"turnover", label:"Turnover", group:"Harga", cell:s=>`<td class="mono">${fmtNum(s.turnover)}</td>` },
  { key:"vwap20", label:"VWAP20", group:"Harga", cell:s=>`<td class="mono">${fmtNum(s.vwap20)}</td>` },
  { key:"per", label:"PER", group:"Fundamental", cell:s=>`<td class="mono">${s.per??"-"}</td>` },
  { key:"pbv", label:"PBV", group:"Fundamental", cell:s=>`<td class="mono">${s.pbv??"-"}</td>` },
  { key:"roe", label:"ROE%", group:"Fundamental", cell:s=>`<td class="mono">${s.roe??"-"}</td>` },
  { key:"divYield", label:"Div Yield%", group:"Fundamental", cell:s=>`<td class="mono">${s.divYield??"-"}</td>` },
  { key:"forwardPer", label:"Forward PER", group:"Fundamental", cell:s=>`<td class="mono">${s.forwardPer??"-"}</td>` },
  { key:"psr", label:"PSR", group:"Fundamental", cell:s=>`<td class="mono">${s.psr??"-"}</td>` },
  { key:"peg", label:"PEG", group:"Fundamental", cell:s=>`<td class="mono">${s.peg??"-"}</td>` },
  { key:"roa", label:"ROA%", group:"Fundamental", cell:s=>`<td class="mono">${s.roa??"-"}</td>` },
  { key:"npm", label:"NPM%", group:"Fundamental", cell:s=>`<td class="mono">${s.npm??"-"}</td>` },
  { key:"opm", label:"OPM%", group:"Fundamental", cell:s=>`<td class="mono">${s.opm??"-"}</td>` },
  { key:"bid", label:"Bid", group:"Harga", cell:s=>`<td class="mono" style="color:var(--up)">${s.bid??"-"}</td>` },
  { key:"bidVolume", label:"Bid Volume", group:"Harga", cell:s=>`<td class="mono">${s.bidVolume??"-"}</td>` },
  { key:"offer", label:"Offer", group:"Harga", cell:s=>`<td class="mono" style="color:var(--down)">${s.offer??"-"}</td>` },
  { key:"offerVolume", label:"Offer Volume", group:"Harga", cell:s=>`<td class="mono">${s.offerVolume??"-"}</td>` },
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
  { key:"baggerScoreTotal", label:"ðŸŽ¯ Skor Bagger", group:"Analisa", cell:s=>`<td><div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;"><span class="mono" style="font-weight:800;font-size:13.5px;color:var(--${s.baggerTone});">${s.baggerScoreTotal}<span style="font-size:10px;font-weight:500;color:var(--muted);">/100</span></span>${pillHtml(s.baggerTier, s.baggerTone)}</div></td>` },
  { key:"stockbitLive", label:"ðŸ”´ Live Stockbit", group:"Analisa", sortable:false, cell:s=>{
      const live = state.stockbitLive[s.ticker];
      if(!live) return `<td><button type="button" class="btn btn-outline" data-stockbit-live="${s.ticker}" style="font-size:11px;padding:4px 8px;color:#f87171;border-color:rgba(239,68,68,0.35);">Tarik</button></td>`;
      if(live.loading) return `<td><span class="mono" style="font-size:11px;color:var(--muted);">Menarik...</span></td>`;
      if(live.error) return `<td><span style="font-size:10.5px;color:var(--down);" title="${escapeHtml(live.error)}">âš ï¸ Error</span> <button type="button" class="btn btn-outline" data-stockbit-live="${s.ticker}" style="font-size:10px;padding:2px 6px;margin-left:4px;">â†»</button></td>`;
      const m = live.mapped || {};
      const secAgo = Math.max(0, Math.round((Date.now()-live.fetchedAt)/1000));
      return `<td><div class="mono" style="font-size:11.5px;line-height:1.5;">
        ${m.last!=null ? `Last: <b>${fmtNum(m.last)}</b>` : "-"}
        ${(m.open!=null||m.high!=null||m.low!=null) ? `<br>O/H/L: ${fmtNum(m.open)}/${fmtNum(m.high)}/${fmtNum(m.low)}` : ""}
        ${m.bid!=null||m.offer!=null ? `<br>Bid/Offer: ${fmtNum(m.bid)}/${fmtNum(m.offer)}` : ""}
        <br><span style="color:var(--muted);font-size:10px;">${secAgo}s lalu</span>
        <button type="button" class="btn btn-outline" data-stockbit-live="${s.ticker}" style="font-size:10px;padding:1px 5px;margin-left:4px;">â†»</button>
      </div></td>`;
    } },
  { key:"keyakinanNaik", label:"Keyakinan Naik", group:"Analisa", cell:s=>`<td>${pillHtml(s.keyakinanNaik, s.keyakinanTone)}</td>` },
  { key:"rekomendasi", label:"Rekomendasi Setup", group:"Analisa", cell:s=>`<td>${s.rekomendasi !== "-" ? pillHtml(s.rekomendasi, s.rekTone) : '<span style="color:var(--muted)">-</span>'}</td>` }
];

// ==========================================
// RULE BUILDER KUSTOM (mirip "Edit Screener" Stockbit)
//
// Bentuk rule yang didukung, sesuai contoh di Stockbit:
//   1) Metric  <op>  Angka tetap                  â†’ "1 Day Price Returns (%) > -15"
//   2) Metric  <op>  Pengali * Metric lain          â†’ "Frequency > 5 * Frequency Analyzer"
// Rule disimpan sebagai {id, aKey, op, mult, bType:'metric'|'const', bKey, bConst}
// dan diterapkan sebagai filter AND tambahan di getFiltered().
// ==========================================
const RULE_METRICS = [
  { key:"cClose", label:"Price" },
  { key:"changePct", label:"1 Day Price Returns (%)" },
  { key:"cVol", label:"Volume" },
  { key:"prevVol", label:"Previous Volume" },
  { key:"volChangePct", label:"1 Day Volume Change (%)" },
  { key:"volMA20", label:"Volume MA20" },
  { key:"avgVolume3m", label:"Avg Volume 3M" },
  { key:"frequency", label:"Frequency" },
  { key:"freqAnalyzer", label:"Frequency Analyzer" },
  { key:"avgFrequency3m", label:"Avg Frequency 3M" },
  { key:"turnover", label:"Turnover" },
  { key:"ma21", label:"Price MA21" },
  { key:"ma50", label:"Price MA50" },
  { key:"ma100", label:"Price MA100" },
  { key:"ma200", label:"Price MA200" },
  { key:"rsi7", label:"RSI 7" },
  { key:"rsi21", label:"RSI 21" },
  { key:"atr14", label:"ATR 14" },
  { key:"bbWidth", label:"BB Width" },
  { key:"clv", label:"CLV" },
  { key:"support", label:"Support" },
  { key:"resistance", label:"Resistance" },

  // --- Perluasan (lihat stock_indicators_ext) ---
  { key:"cOpen", label:"Open Price" }, { key:"cHigh", label:"High Price" }, { key:"cLow", label:"Low Price" },
  { key:"prevClose", label:"Previous Price" }, { key:"valueTraded", label:"Value" },
  { key:"priceMa5", label:"Price MA 5" }, { key:"priceMa10", label:"Price MA 10" }, { key:"priceMa20", label:"Price MA 20" },
  { key:"prevPriceMa5", label:"Previous Price MA 5" }, { key:"prevPriceMa10", label:"Previous Price MA 10" },
  { key:"prevPriceMa20", label:"Previous Price MA 20" }, { key:"prevPriceMa50", label:"Previous Price MA 50" },
  { key:"prevPriceMa100", label:"Previous Price MA 100" }, { key:"prevPriceMa200", label:"Previous Price MA 200" },
  { key:"volumeMa5", label:"Volume MA 5" }, { key:"volumeMa10", label:"Volume MA 10" },
  { key:"volumeMa50", label:"Volume MA 50" }, { key:"volumeMa100", label:"Volume MA 100" }, { key:"volumeMa200", label:"Volume MA 200" },
  { key:"prevVolumeMa5", label:"Previous Volume MA 5" }, { key:"prevVolumeMa10", label:"Previous Volume MA 10" },
  { key:"prevVolumeMa20", label:"Previous Volume MA 20" }, { key:"prevVolumeMa50", label:"Previous Volume MA 50" },
  { key:"prevVolumeMa100", label:"Previous Volume MA 100" },
  { key:"valueMa5", label:"Value MA 5" }, { key:"valueMa10", label:"Value MA 10" }, { key:"valueMa20", label:"Value MA 20" },
  { key:"valueMa50", label:"Value MA 50" }, { key:"valueMa100", label:"Value MA 100" }, { key:"valueMa200", label:"Value MA 200" },
  { key:"frequencyMa50", label:"Frequency Analyzer MA 50" },
  { key:"rsi14", label:"RSI (14)" }, { key:"prevRsi14", label:"Previous RSI (14)" },
  { key:"macd", label:"MACD (12,26)" }, { key:"prevMacd", label:"Previous MACD (12,26)" },
  { key:"stochK", label:"Stochastic K (14,1,3)" }, { key:"stochD", label:"Stochastic D (14,1,3)" },
  { key:"prevStochK", label:"Previous Stochastic K" }, { key:"prevStochD", label:"Previous Stochastic D" },
  { key:"bbUpper", label:"Bollinger Band Upper (20)" }, { key:"bbLower", label:"Bollinger Band Lower (20)" },
  { key:"adr14", label:"Average Daily Range 14" },
  { key:"prevAtr14", label:"Previous Average True Range 14" }, { key:"prevAdr14", label:"Previous Average Daily Range 14" },
  { key:"vwap", label:"VWAP" },
  { key:"ema5", label:"EMA 5" }, { key:"ema10", label:"EMA 10" }, { key:"ema20", label:"EMA 20" },
  { key:"ema50", label:"EMA 50" }, { key:"ema100", label:"EMA 100" }, { key:"ema200", label:"EMA 200" },
  { key:"prevEma200", label:"Previous EMA 200" },
  { key:"fibP", label:"Fibonacci P" }, { key:"fibR1", label:"Fibonacci R1" }, { key:"fibR2", label:"Fibonacci R2" },
  { key:"fibR3", label:"Fibonacci R3" }, { key:"fibS1", label:"Fibonacci S1" }, { key:"fibS2", label:"Fibonacci S2" },
  { key:"fibS3", label:"Fibonacci S3" },

  // --- Fundamental (PER/PBV/ROE/dst) ---
  { key:"per", label:"PER" }, { key:"forwardPer", label:"Forward PER" }, { key:"pbv", label:"PBV" },
  { key:"eps", label:"EPS" }, { key:"bookValue", label:"Book Value" }, { key:"psr", label:"PSR" },
  { key:"peg", label:"PEG" }, { key:"roe", label:"ROE (%)" }, { key:"roa", label:"ROA (%)" },
  { key:"npm", label:"Net Profit Margin (%)" }, { key:"opm", label:"Operating Margin (%)" },
  { key:"revenueGrowth", label:"Revenue Growth (%)" }, { key:"earningsGrowth", label:"Earnings Growth (%)" },
  { key:"divYield", label:"Dividend Yield (%)" }, { key:"dividendRate", label:"Dividend Rate" },
  { key:"payoutRatio", label:"Payout Ratio (%)" }, { key:"beta", label:"Beta" },
  { key:"der", label:"DER" }, { key:"currentRatio", label:"Current Ratio" },
  { key:"marketCap", label:"Market Cap" }, { key:"sharesOutstanding", label:"Shares Outstanding" },

  // --- Harga & posisi 52 minggu ---
  { key:"high52w", label:"52 Week High" }, { key:"low52w", label:"52 Week Low" },
  { key:"week52ChangePct", label:"52 Week Change (%)" }, { key:"pos52w", label:"Posisi dalam Range 52W (%)" },
  { key:"changeAbs", label:"Perubahan Harga (Rp)" }, { key:"prevHigh", label:"Previous High" }, { key:"prevLow", label:"Previous Low" },
  { key:"vsMa50Pct", label:"Jarak ke MA50 (%)" }, { key:"vsMa200Pct", label:"Jarak ke MA200 (%)" },

  // --- Bid/Offer & VWAP20 ---
  { key:"bid", label:"Bid" }, { key:"bidVolume", label:"Bid Volume" },
  { key:"offer", label:"Offer" }, { key:"offerVolume", label:"Offer Volume" },
  { key:"vwap20", label:"VWAP 20" }, { key:"volRatio", label:"Volume Ratio" },

  // --- EMA/MACD tambahan ---
  { key:"ema21H", label:"EMA 21 (High)" }, { key:"ema21L", label:"EMA 21 (Low)" }, { key:"ema89", label:"EMA 89" },
  { key:"hist", label:"MACD Histogram" }, { key:"histPrev", label:"MACD Histogram (Prev)" },
  { key:"signal", label:"MACD Signal" }, { key:"prevSignal", label:"Previous MACD Signal" },
  { key:"prevMacdHist", label:"Previous MACD Histogram" },

  // --- Bandarmologi asli (foreign flow dari IDX) ---
  { key:"foreignNet1D", label:"Foreign Net 1 Hari" }, { key:"foreignNet5D", label:"Foreign Net 5 Hari" },
  { key:"foreignNet20D", label:"Foreign Net 20 Hari" }, { key:"foreignUpDays", label:"Foreign Net Positif (Hari)" },
  { key:"avgTicket", label:"Avg Ticket Size Asing" }, { key:"crossingPct", label:"Crossing (%)" },
  { key:"flowDays", label:"Jumlah Hari Data Flow" },

  // --- Field KATEGORI (teks, bukan angka) â€” dibandingkan pakai "=" / "â‰ "
  // terhadap salah satu pilihan tetap, bukan angka bebas. Daftar pilihan
  // diambil dari nilai-nilai yang benar-benar muncul di kolom stocks_screener.
  { key:"cekHarga", label:"Sinyal Harga", type:"category", options:[
    "harga crossup ema 21 H dan L", "harga diatas ema 21 L dibawah ema 21 H", "harga belum cross up"
  ]},
  { key:"cekRsi", label:"Sinyal RSI", type:"category", options:[
    "rsi 7 cross up rsi 21", "rsi 7 belum cross up"
  ]},
  { key:"statusRsi", label:"Status RSI", type:"category", options:[
    "over bought", "over sold", "bullish", "netral", "bearish"
  ]},
  { key:"cekMacd", label:"Sinyal MACD", type:"category", options:[
    "Bullish Menguat", "Wait & See / Bearish", "Momentum Buy (Early)", "Buy (Golden Cross)", "Sell (Dead Cross)"
  ]},
  { key:"keyakinanNaik", label:"Keyakinan Naik (kategori)", type:"category", options:[
    "Sedang (Candle Bullish, Volume Belum Konfirmasi)", "Tinggi (Ada Konfirmasi Volume)",
    "Sedang (Belum Ada Konfirmasi Volume)", "Rendah", "Sangat Tinggi (MACD + Volume + RSI/Stoch Konfirmasi)",
    "Sangat Waspada (Distribusi Masif / Guyuran Bandar)", "Waspada (Trend Bearish + Candle Bearish)"
  ]},
  { key:"trendHarga", label:"Trend Harga (MA)", type:"category", options:[
    "Bullish (diatas MA21/50/100/200)", "Sideways/Mixed", "Bearish (dibawah MA21/50/100/200)", "Bearish (dibawah MA yang tersedia)"
  ]},
  { key:"polaCandle", label:"Pola Candle", type:"category", options:[
    "Bullish Engulfing (potensi reversal naik)", "Tidak ada pola signifikan", "Doji (keraguan pasar / potensi pembalikan)",
    "Bearish Engulfing (potensi reversal turun)", "Bearish Harami (tekanan beli mulai melemah)",
    "Hanging Man (waspada reversal turun setelah uptrend)", "Shooting Star (waspada reversal turun)",
    "Bullish Harami (tekanan jual mulai melemah)"
  ]},
  { key:"uangGedeMasuk", label:"Uang Gede Masuk", type:"category", options:[
    "Normal", "Akumulasi Kuat (RVOL>2 & CLV>0.7)", "Guyuran (RVOL>2 & CLV Negatif)"
  ]},
  { key:"valuasi", label:"Valuasi", type:"category", options:[
    "Kemahalan (Overvalued)", "Murah (Undervalued)", "Wajar (Fair)"
  ]},
  { key:"capCategory", label:"Kategori Cap", type:"category", options:[
    "Mid Cap", "Small Cap", "Big Cap"
  ]},
  { key:"cekVolume", label:"Sinyal Volume (kategori mentah)", type:"category", options:[
    "Volume Normal", "Volume Spike Kuat", "Volume Sepi", "Volume Spike", "Volume Spike Ekstrem"
  ]},

  // --- Field BROKER (daftar kode broker top 3, bukan angka/kategori
  // tetap) â€” dibandingkan pakai "contains" / "!contains" terhadap kode
  // broker yang diketik bebas (mis. "AK"), diambil dari top 3 baris
  // broker_summary hari trading terakhir. Dipakai untuk cari saham yang
  // sedang didominasi broker tertentu di sisi beli atau jual.
  { key:"top3BuyBrokers", label:"Top 3 Broker (Beli)", type:"broker" },
  { key:"top3SellBrokers", label:"Top 3 Broker (Jual)", type:"broker" },
];
const RULE_METRICS_BY_KEY = Object.fromEntries(RULE_METRICS.map(m=>[m.key, m]));
function isCategoryMetric(key){ return RULE_METRICS_BY_KEY[key]?.type === "category"; }
function isBrokerMetric(key){ return RULE_METRICS_BY_KEY[key]?.type === "broker"; }
const RULE_OPS = {
  ">": (a,b)=>a>b, "<": (a,b)=>a<b, ">=": (a,b)=>a>=b, "<=": (a,b)=>a<=b, "=": (a,b)=>a===b, "â‰ ": (a,b)=>a!==b,
  // "a" di sini adalah ARRAY kode broker (top 3 beli/jual), "b" adalah
  // kode broker yang diketik user (sudah di-uppercase di ruleRawValue).
  "contains": (a,b)=> Array.isArray(a) && a.includes(b),
  "!contains": (a,b)=> Array.isArray(a) && !a.includes(b),
};
function ruleMetricLabel(key){ const m = RULE_METRICS.find(x=>x.key===key); return m ? m.label : key; }
function ruleMetricValue(s, key){
  const v = s[key];
  if(v===undefined || v===null || v==="" || isNaN(v)) return null;
  return Number(v);
}
// Sama seperti ruleMetricValue, tapi untuk field KATEGORI (teks) â€” tidak
// dipaksa jadi angka, cukup dikembalikan apa adanya (atau null kalau kosong).
// Juga menangani field BROKER (top3BuyBrokers/top3SellBrokers), yang bukan
// properti langsung di objek saham `s` â€” datanya diambil dari
// state.top3BrokerData (hasil loadTop3BrokerData(), keyed by ticker).
function ruleRawValue(s, key){
  if(key === "top3BuyBrokers" || key === "top3SellBrokers"){
    const data = state.top3BrokerData[String(s.ticker || "").toUpperCase()];
    if(!data) return null;
    const arr = key === "top3BuyBrokers" ? data.buy : data.sell;
    return (arr && arr.length) ? arr : null;
  }
  const v = s[key];
  return (v===undefined || v===null || v==="") ? null : v;
}
// Deskripsi 1 baris rule kustom dalam bahasa manusia, mis. "Price > 1"
// atau "1 Day Price Returns (%) > -15" atau (bandingkan 2 metrik dengan
// pengali) "Frequency > 5 Ã— Frequency Analyzer".
function ruleDescription(rule){
  const aLabel = ruleMetricLabel(rule.aKey);
  if(rule.op === "between"){
    return `${aLabel} antara ${rule.bConstMin} dan ${rule.bConstMax}`;
  }
  if(rule.bType === "const"){
    return `${aLabel} ${rule.op} ${rule.bConst}`;
  }
  const bLabel = ruleMetricLabel(rule.bKey);
  const mult = Number(rule.mult);
  const multPart = (mult && mult !== 1) ? `${rule.mult} Ã— ` : "";
  return `${aLabel} ${rule.op} ${multPart}${bLabel}`;
}
// Ringkasan screener/preset yang SEDANG AKTIF saat user klik "Simpan ke
// Backtest" â€” dipakai supaya kolom Sumber & Kriteria di tab Backtest
// menunjukkan preset/rule apa yang menghasilkan tiap entry, bukan cuma
// label generik "Screener" seperti sebelumnya.
function getActiveScreenerContext(){
  const parts = [];
  let label = "Screener";

  if(state.activePreset){
    label = PRESET_LABELS[state.activePreset] || state.activePreset;
    parts.push(`Preset DSI "${label}"`);
  }

  if(state.customRules && state.customRules.length){
    const rulesText = state.customRules.map(ruleDescription).join("; ");
    const customPreset = state.customPresets.find(p => String(p.id) === String(state.selectedPresetId));
    if(customPreset){
      if(!state.activePreset) label = customPreset.name;
      parts.push(`Preset Kustom "${customPreset.name}": ${rulesText}`);
    } else {
      if(!state.activePreset) label = "Rules Kustom";
      parts.push(`Rules Kustom: ${rulesText}`);
    }
  }

  return {
    label,
    criteria: parts.length ? parts.join(" | ") : "Tanpa filter/preset aktif (semua data screener)"
  };
}
function evalCustomRule(s, rule){
  // Field broker (top 3 broker beli/jual) â€” dibandingkan pakai
  // "contains" / "!contains" terhadap kode broker bebas yang diketik user
  // (rule.bConst), bukan angka atau pilihan tetap.
  if(isBrokerMetric(rule.aKey)){
    const aVal = ruleRawValue(s, rule.aKey); // array kode broker, atau null kalau tidak ada data
    if(aVal===null) return false;
    const cmp = RULE_OPS[rule.op];
    if(!cmp || (rule.op !== "contains" && rule.op !== "!contains")) return false;
    const needle = String(rule.bConst || "").trim().toUpperCase();
    if(!needle) return false;
    return cmp(aVal, needle);
  }
  // Field kategori (teks) â€” hanya boleh dibandingkan "=" / "â‰ " terhadap
  // salah satu pilihan tetap (rule.bConst), tidak bisa dikali/dibandingkan
  // ke metrik lain karena tidak ada artinya untuk teks.
  if(isCategoryMetric(rule.aKey)){
    const aVal = ruleRawValue(s, rule.aKey);
    if(aVal===null) return false;
    const cmp = RULE_OPS[rule.op];
    if(!cmp || (rule.op !== "=" && rule.op !== "â‰ ")) return false;
    return cmp(String(aVal), String(rule.bConst));
  }
  const aVal = ruleMetricValue(s, rule.aKey);
  if(aVal===null) return false;
  // "between" (mis. RSI21 antara 50-70, meniru filter "Between" di
  // screener Stockbit) â€” selalu 2 angka tetap, tidak bisa dibandingkan ke
  // metrik lain, jadi ditangani terpisah dari cmp(a,b) generik di bawah.
  if(rule.op === "between"){
    const lo = parseFloat(rule.bConstMin);
    const hi = parseFloat(rule.bConstMax);
    if(isNaN(lo) || isNaN(hi)) return false;
    return aVal >= Math.min(lo,hi) && aVal <= Math.max(lo,hi);
  }
  const cmp = RULE_OPS[rule.op];
  if(!cmp) return false;
  if(rule.bType === "const"){
    const bVal = parseFloat(rule.bConst);
    if(isNaN(bVal)) return false;
    return cmp(aVal, bVal);
  }
  const bVal = ruleMetricValue(s, rule.bKey);
  if(bVal===null) return false;
  const mult = parseFloat(rule.mult);
  if(isNaN(mult)) return false;
  return cmp(aVal, mult * bVal);
}
function saveCustomRules(){ localStorage.setItem(LS_CUSTOM_RULES, JSON.stringify(state.customRules)); }

// ==========================================
// PRESET SCREENER KUSTOM (tabel custom_presets di Supabase)
//
// Beda dengan "Screener DSI" (state.activePreset, hardcoded di kode) â€”
// ini preset Rules Kustom buatan user sendiri, disimpan ke Supabase
// supaya bisa dipanggil lagi kapan saja / dari device lain, mirip
// fitur "Preset" di Edit Screener Stockbit.
// ==========================================
async function refreshCustomPresets(){
  if(!SUPABASE_URL || !SUPABASE_KEY) return;
  try{
    const res = await fetch(`${SUPABASE_URL}/custom_presets?select=*&order=created_at.desc`, { headers: getSupaHeaders(), cache: "no-store" });
    const data = await res.json();
    if(Array.isArray(data)) state.customPresets = data;
  }catch(e){}
}

// Cek nama preset sudah dipakai preset LAIN atau belum (case-insensitive,
// abaikan spasi di ujung). excludeId dipakai saat update preset yang
// sedang dipilih supaya preset itu sendiri tidak dianggap "bentrok"
// dengan namanya sendiri.
function isPresetNameTaken(name, excludeId){
  const norm = name.trim().toLowerCase();
  return state.customPresets.some(p =>
    String(p.id) !== String(excludeId ?? "") && String(p.name || "").trim().toLowerCase() === norm
  );
}

async function saveCurrentAsPreset(){
  if(!SUPABASE_URL || !SUPABASE_KEY){ openSettings(); return; }
  if(!state.customRules.length){ alert("Belum ada Rule Kustom untuk disimpan. Tambahkan rule dulu lewat \"+ Tambah Rule\"."); return; }
  const name = prompt("Nama preset (mis. \"Breakout Volume + RSI\"):", "");
  if(name === null) return;
  const trimmed = name.trim();
  if(!trimmed){ alert("Nama preset tidak boleh kosong."); return; }
  // Nama harus unik antar preset â€” kalau sudah dipakai preset lain, tolak
  // di sisi client dulu (lebih cepat & pesannya lebih jelas) sebelum
  // sempat kirim ke Supabase.
  if(isPresetNameTaken(trimmed)){
    alert(`Nama preset "${trimmed}" sudah dipakai. Pilih nama lain, atau kalau maksudnya mengubah preset yang sudah ada, pilih presetnya di dropdown "Preset Tersimpan" lalu klik "ðŸ”„ Update Preset".`);
    return;
  }

  state.presetsLoading = true; render();
  try{
    const res = await supaFetch(`${SUPABASE_URL}/custom_presets`, {
      method: "POST",
      headers: { ...getSupaHeaders(), "Prefer": "return=representation" },
      body: JSON.stringify({ name: trimmed, rules: state.customRules })
    });
    const saved = await res.json();
    if(Array.isArray(saved) && saved[0] && saved[0].id){
      state.selectedPresetId = saved[0].id;
    }
    await refreshCustomPresets();
  }catch(e){
    showError("Gagal menyimpan preset: " + e.message);
  }
  state.presetsLoading = false; render();
}

// Simpan ULANG rule kustom yang sedang aktif ke preset yang SEDANG DIPILIH
// di dropdown "Preset Tersimpan" (bukan bikin preset baru). Ini yang
// dipakai kalau user memuat preset lama, menambah/mengubah kriteria, lalu
// mau menimpa preset yang sama â€” tanpa harus "Simpan sebagai Preset..."
// dengan nama baru setiap kali.
async function updateSelectedPreset(){
  if(!SUPABASE_URL || !SUPABASE_KEY){ openSettings(); return; }
  const preset = state.customPresets.find(p => String(p.id) === String(state.selectedPresetId));
  if(!preset){ alert("Pilih dulu preset yang mau diupdate dari dropdown \"Preset Tersimpan\"."); return; }
  if(!state.customRules.length){ alert("Rules Kustom kosong â€” tidak ada yang bisa disimpan ke preset."); return; }

  const name = prompt("Nama preset (boleh diganti, atau biarkan sama):", preset.name || "");
  if(name === null) return;
  const trimmed = name.trim();
  if(!trimmed){ alert("Nama preset tidak boleh kosong."); return; }
  if(isPresetNameTaken(trimmed, preset.id)){
    alert(`Nama preset "${trimmed}" sudah dipakai preset lain. Pilih nama lain.`);
    return;
  }

  state.presetsLoading = true; render();
  try{
    await supaFetch(`${SUPABASE_URL}/custom_presets?id=eq.${preset.id}`, {
      method: "PATCH",
      headers: { ...getSupaHeaders(), "Prefer": "return=minimal" },
      body: JSON.stringify({ name: trimmed, rules: state.customRules })
    });
    await refreshCustomPresets();
  }catch(e){
    showError("Gagal mengupdate preset: " + e.message);
  }
  state.presetsLoading = false; render();
}

function loadSelectedPreset(){
  const preset = state.customPresets.find(p => String(p.id) === String(state.selectedPresetId));
  if(!preset) return;
  const rules = Array.isArray(preset.rules) ? preset.rules : [];
  // Deep-clone + pastikan tiap rule punya id lokal (jaga-jaga kalau
  // rule lama disimpan tanpa id, atau dobel id antar-preset).
  state.customRules = rules.map(r => ({ ...r, id: "r" + Date.now() + "_" + (ruleIdCounter++) }));
  saveCustomRules();
  state.page = 1;
  // Otomatis collapse panel Rules Kustom setelah preset dimuat â€” biar tidak
  // langsung kelihatan 10+ baris rule tiap kali cuma mau pakai preset yang
  // sudah jadi. Tinggal klik header panel buat expand lagi kalau mau edit.
  state.ruleBuilderOpen = false;
  render();
}

async function deleteSelectedPreset(){
  const preset = state.customPresets.find(p => String(p.id) === String(state.selectedPresetId));
  if(!preset) return;
  if(!confirm(`Hapus preset "${preset.name}"? Ini tidak akan menghapus Rules Kustom yang sedang aktif.`)) return;

  state.presetsLoading = true; render();
  try{
    await fetch(`${SUPABASE_URL}/custom_presets?id=eq.${preset.id}`, { method: "DELETE", headers: getSupaHeaders() });
    state.selectedPresetId = "";
    await refreshCustomPresets();
  }catch(e){
    showError("Gagal menghapus preset: " + e.message);
  }
  state.presetsLoading = false; render();
}

let ruleIdCounter = 0;
function addCustomRule(){
  state.customRules.push({
    id: "r" + Date.now() + "_" + (ruleIdCounter++),
    aKey: "cVol", op: ">", mult: "1", bType: "metric", bKey: "volMA20", bConst: ""
  });
  saveCustomRules();
  state.page = 1;
  state.ruleBuilderOpen = true; // biar baris baru langsung kelihatan kalau panel lagi collapsed
  render();
}
function updateCustomRule(id, field, value){
  const rule = state.customRules.find(r=>r.id===id);
  if(!rule) return;
  if(field === "toggleBType"){
    rule.bType = rule.bType === "const" ? "metric" : "const";
  } else {
    rule[field] = value;
  }
  // Kalau field kategori dipilih sebagai aKey, paksa bentuk rule tetap valid:
  // tidak bisa dibandingkan ke metrik lain (bType harus "const"), operator
  // cuma "="/"â‰ ", dan bConst harus salah satu pilihan kategori itu sendiri
  // (bukan sisa angka/teks dari rule sebelumnya).
  if(field === "aKey" && isCategoryMetric(rule.aKey)){
    rule.bType = "const";
    if(rule.op !== "=" && rule.op !== "â‰ ") rule.op = "=";
    const opts = RULE_METRICS_BY_KEY[rule.aKey].options;
    if(!opts.includes(rule.bConst)) rule.bConst = opts[0];
  }
  // Kalau field BROKER (Top 3 Broker Beli/Jual) dipilih sebagai aKey: tidak
  // bisa dibandingkan ke metrik lain (bType harus "const"), operator cuma
  // "contains"/"!contains", dan bConst adalah kode broker bebas (teks),
  // bukan angka atau pilihan kategori sisa rule sebelumnya.
  else if(field === "aKey" && isBrokerMetric(rule.aKey)){
    rule.bType = "const";
    if(rule.op !== "contains" && rule.op !== "!contains") rule.op = "contains";
    if(typeof rule.bConst !== "string") rule.bConst = "";
  }
  // Kalau aKey diganti KE field numerik biasa dari kategori/broker
  // sebelumnya, operator "="/"â‰ "/"contains"/"!contains" sisa boleh tetap
  // dipakai untuk "="/"â‰ " (valid juga untuk angka), tapi "contains"/
  // "!contains" harus direset karena tidak berlaku untuk angka.
  else if(field === "aKey" && !isCategoryMetric(rule.aKey) && !isBrokerMetric(rule.aKey)){
    if(rule.op === "contains" || rule.op === "!contains") rule.op = ">";
  }
  // Kalau operator diganti JADI "between": paksa bType="const" (antara 2
  // angka tetap, tidak masuk akal dibandingkan ke metrik lain) dan siapkan
  // bConstMin/bConstMax â€” pakai bConst lama sebagai titik awal biar user
  // tidak mulai dari kosong kalau sebelumnya sudah isi satu angka.
  if(field === "op" && rule.op === "between"){
    rule.bType = "const";
    if(rule.bConstMin === undefined || rule.bConstMin === "") rule.bConstMin = rule.bConst || "";
    if(rule.bConstMax === undefined || rule.bConstMax === "") rule.bConstMax = "";
  }
  saveCustomRules();
  state.page = 1;
  render();
}
function deleteCustomRule(id){
  state.customRules = state.customRules.filter(r=>r.id!==id);
  saveCustomRules();
  state.page = 1;
  render();
}
function renderRuleBuilder(){
  const numericMetrics = RULE_METRICS.filter(m => m.type !== "category" && m.type !== "broker");
  const categoryMetrics = RULE_METRICS.filter(m => m.type === "category");
  const brokerMetrics = RULE_METRICS.filter(m => m.type === "broker");
  // Dipakai untuk dropdown "aKey" (semua field, dikelompokkan) â€” dan juga
  // untuk dropdown "bKey" (cuma field ANGKA, karena membandingkan field
  // kategori/broker ke field lain tidak ada artinya).
  const metricOptions = (selected, includeExtra) => {
    const opt = m => `<option value="${m.key}" ${selected===m.key?'selected':''}>${m.label}</option>`;
    if(!includeExtra) return numericMetrics.map(opt).join("");
    return `<optgroup label="Angka">${numericMetrics.map(opt).join("")}</optgroup><optgroup label="Kategori (Teks)">${categoryMetrics.map(opt).join("")}</optgroup><optgroup label="Broker (Top 3)">${brokerMetrics.map(opt).join("")}</optgroup>`;
  };
  const opLabels = { "contains":"contains", "!contains":"tidak mengandung", "between":"antara (between)" };
  const opOptions = (selected, categoryOnly, brokerOnly) => {
    const ops = brokerOnly ? ["contains","!contains"] : categoryOnly ? ["=","â‰ "] : [...Object.keys(RULE_OPS).filter(op=>op!=="contains"&&op!=="!contains"), "between"];
    return ops.map(op=>`<option value="${op}" ${selected===op?'selected':''}>${opLabels[op]||op}</option>`).join("");
  };

  const rows = state.customRules.map(r => {
    const isCat = isCategoryMetric(r.aKey);
    const isBroker = isBrokerMetric(r.aKey);
    const catOpts = isCat ? RULE_METRICS_BY_KEY[r.aKey].options : [];
    return `
    <div class="rule-row" data-rule-id="${r.id}">
      <select class="rule-select" data-rule-field="aKey" data-rule-id="${r.id}">${metricOptions(r.aKey, true)}</select>
      <select class="rule-op" data-rule-field="op" data-rule-id="${r.id}">${opOptions(r.op, isCat, isBroker)}</select>
      ${isCat
        ? `<select class="rule-const" data-rule-field="bConst" data-rule-id="${r.id}">${catOpts.map(o=>`<option value="${escapeHtml(o)}" ${String(r.bConst)===o?'selected':''}>${escapeHtml(o)}</option>`).join("")}</select>`
        : isBroker
          ? `<input type="text" class="rule-const" data-rule-field="bConst" data-rule-id="${r.id}" value="${escapeHtml(r.bConst||"")}" placeholder="Kode broker, mis. AK" maxlength="6" style="text-transform:uppercase;width:150px">`
          : r.op === "between"
            ? `<input type="number" step="any" class="rule-const" data-rule-field="bConstMin" data-rule-id="${r.id}" value="${r.bConstMin ?? ""}" placeholder="dari" style="width:80px">
               <span class="rule-times">&ndash;</span>
               <input type="number" step="any" class="rule-const" data-rule-field="bConstMax" data-rule-id="${r.id}" value="${r.bConstMax ?? ""}" placeholder="sampai" style="width:80px">`
            : (r.bType === "const"
              ? `<input type="number" step="any" class="rule-const" data-rule-field="bConst" data-rule-id="${r.id}" value="${r.bConst}" placeholder="angka">`
              : `<input type="number" step="any" class="rule-mult" data-rule-field="mult" data-rule-id="${r.id}" value="${r.mult}">
                 <span class="rule-times">&times;</span>
                 <select class="rule-select" data-rule-field="bKey" data-rule-id="${r.id}">${metricOptions(r.bKey, false)}</select>`
            )
      }
      ${(isCat || isBroker || r.op === "between") ? "" : `<button type="button" class="rule-btype-toggle" data-rule-field="toggleBType" data-rule-id="${r.id}" title="${r.bType==='const' ? 'Ganti jadi: bandingkan dengan metrik lain' : 'Ganti jadi: bandingkan dengan angka tetap'}">${r.bType==='const' ? 'ðŸ”¢' : 'ðŸ“Š'}</button>`}
      <button type="button" class="rule-del" data-rule-del="${r.id}" title="Hapus rule">âœ•</button>
    </div>
  `;
  }).join("");

  const presetOptions = state.customPresets.map(p =>
    `<option value="${p.id}" ${String(state.selectedPresetId)===String(p.id)?'selected':''}>${escapeHtml(p.name)} (${Array.isArray(p.rules)?p.rules.length:0} rule)</option>`
  ).join("");

  return `
    <div class="panel" style="margin-bottom:16px;">
      <div class="filter-section-title" id="ruleBuilderToggle" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;user-select:none;">
        <span style="display:flex;align-items:center;gap:8px;">
          <span style="display:inline-block;transition:transform .15s;transform:rotate(${state.ruleBuilderOpen?90:0}deg);">â–¶</span>
          Rules Kustom (mirip Edit Screener Stockbit)
        </span>
        <span class="line" style="flex:1;"></span>
        ${state.customRules.length ? `<span style="font-size:11.5px;color:var(--muted);font-weight:400;text-transform:none;letter-spacing:0;white-space:nowrap;">${state.customRules.length} rule aktif</span>` : ""}
      </div>
      ${state.ruleBuilderOpen ? `
      <div class="rule-list">${rows || '<div style="color:var(--muted);font-size:13px;padding:6px 0 2px;">Belum ada rule kustom. Klik "+ Tambah Rule" untuk mulai â€” mis. "Frequency &gt; 5 &times; Frequency Analyzer".</div>'}</div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap;">
        <button type="button" class="btn btn-outline" id="addRuleBtn">+ Tambah Rule</button>
        <button type="button" class="btn btn-outline" id="savePresetBtn" ${state.presetsLoading?'disabled':''}>ðŸ’¾ Simpan sebagai Preset...</button>
        ${state.customRules.length ? `<span style="font-size:12px;color:var(--muted);">${state.customRules.length} rule aktif â€” otomatis diterapkan ke tabel di bawah (AND, semua harus terpenuhi).</span>` : ""}
      </div>` : ""}
      <div style="display:flex;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--border);">
        <label style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;">Preset Tersimpan</label>
        <select id="presetSelect" style="background:rgba(0,0,0,0.2);border:1px solid var(--border);color:var(--text);font-size:12.5px;border-radius:7px;padding:8px 9px;min-width:220px;flex:1;max-width:320px;">
          <option value="">${state.customPresets.length ? 'â€” pilih preset â€”' : 'Belum ada preset tersimpan'}</option>
          ${presetOptions}
        </select>
        <button type="button" class="btn btn-outline" id="loadPresetBtn" ${!state.selectedPresetId || state.presetsLoading ? 'disabled' : ''} title="Muat rule dari preset ini (menimpa rule kustom yang aktif)">ðŸ“¥ Muat</button>
        <button type="button" class="btn btn-outline" id="updatePresetBtn" ${!state.selectedPresetId || !state.customRules.length || state.presetsLoading ? 'disabled' : ''} title="Timpa preset ini dengan Rules Kustom yang sedang aktif â€” tidak perlu simpan dengan nama baru" style="color:#34d399;border-color:rgba(16,185,129,0.35);">ðŸ”„ Update Preset</button>
        <button type="button" class="btn btn-outline" id="deletePresetBtn" ${!state.selectedPresetId || state.presetsLoading ? 'disabled' : ''} title="Hapus preset ini" style="color:#f87171;border-color:rgba(239,68,68,0.3);">ðŸ—‘ï¸ Hapus</button>
      </div>
    </div>
  `;
}

// Kolom yang tampil DEFAULT â€” cukup untuk overview cepat tanpa scroll
// horizontal panjang. Sisanya disembunyikan sampai dipilih lewat panel
// "ðŸ§© Kolom", supaya tabel nyaman dilihat begitu halaman dibuka.
const DEFAULT_VISIBLE_COLS = [
  "sektor", "baggerScoreTotal", "stockbitLive", "cClose", "changePct", "cVol", "frequency",
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

  // Default Periode Dariâ€“Sampai untuk tombol "Tarik Data Stockbit" di toolbar
  // Screener (state sama dengan yang dipakai tab Broker Summary, jadi kalau
  // diubah di sini otomatis kepakai juga di sana, dan sebaliknya).
  if(!state.bsAutoBulkFrom || !state.bsAutoBulkTo){
    const defaultDates = tradingDaysBack(state.bsAutoBulkDays || 10);
    state.bsAutoBulkFrom = defaultDates[0];
    state.bsAutoBulkTo = defaultDates[defaultDates.length - 1];
  }
  if(!state.hdAutoBulkFrom || !state.hdAutoBulkTo){
    const defaultHdDates = tradingDaysBack(10);
    state.hdAutoBulkFrom = defaultHdDates[0];
    state.hdAutoBulkTo = defaultHdDates[defaultHdDates.length - 1];
  }
  
  const effectiveLimit = state.limit === "all" ? Math.max(sorted.length, 1) : state.limit;
  const totalPages = Math.ceil(sorted.length / effectiveLimit) || 1;
  if (state.page > totalPages) state.page = totalPages;
  const startIndex = (state.page - 1) * effectiveLimit;
  const pagedData = sorted.slice(startIndex, startIndex + effectiveLimit);

  const getOpts = (key) => uniqueOpts(list,key);
  const allFilteredChecked = filtered.length > 0 && filtered.every(s => state.selectedForBacktest.has(s.ticker));
  const visibleColumns = SCREENER_COLUMNS.filter(c => state.visibleCols.has(c.key));
  // Disimpan supaya tombol "Ekspor Excel" (di-wire lewat attachContentEvents,
  // terpisah dari closure render ini) tetap bisa mengambil data hasil
  // filter/sort/kolom-tampil yang PALING BARU tanpa menghitung ulang.
  lastScreenerExport = { rows: sorted, columns: visibleColumns };

  const FREEZE_W = { chk: 36, star: 34, ticker: 104 };
  const FREEZE_LEFT = { chk: 0, star: FREEZE_W.chk, ticker: FREEZE_W.chk + FREEZE_W.star };

  const th = (label, col, sortable, freezeKey) => {
    const freezeStyle = freezeKey ? `width:${FREEZE_W[freezeKey]}px;left:${FREEZE_LEFT[freezeKey]}px;` : "";
    const freezeClass = freezeKey ? `col-freeze${freezeKey==='ticker' ? ' col-freeze-shadow' : ''}` : "";
    if(sortable === false) return `<th class="${freezeClass}" style="${freezeStyle}">${label}</th>`;
    let icon = `<span class="sort-icon"></span>`;
    if (state.sort.col === col) {
      icon = `<span class="sort-icon">${state.sort.asc ? 'â–²' : 'â–¼'}</span>`;
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
    <tr id="row-${s.ticker}">
      <td class="col-freeze" style="width:${FREEZE_W.chk}px;left:${FREEZE_LEFT.chk}px;"><input type="checkbox" class="custom-checkbox chk-row" data-check="${s.ticker}" ${state.selectedForBacktest.has(s.ticker)?'checked':''}></td>   <td class="col-freeze" style="width:${FREEZE_W.star}px;left:${FREEZE_LEFT.star}px;"><button class="star-btn" data-fav="${s.ticker}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="${state.watchlist.has(s.ticker)?'var(--gold)':'none'}" stroke="${state.watchlist.has(s.ticker)?'var(--gold)':'var(--muted)'}" stroke-width="2.5" style="filter: ${state.watchlist.has(s.ticker)?'drop-shadow(0 0 3px rgba(245,158,11,0.5))':'none'};"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </button></td>
      <td class="ticker-cell col-freeze col-freeze-shadow" style="width:${FREEZE_W.ticker}px;left:${FREEZE_LEFT.ticker}px;"><button class="ticker-link" data-detail="${s.ticker}" title="Lihat detail ${s.ticker}">${s.ticker}</button>${s.uangGedeMasuk==="Ya" ? ' <span title="Indikasi uang gede masuk">ðŸ’°</span>' : ''}</td>
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
    ${renderRuleBuilder()}
    <div class="panel">
      <div class="filter-toolbar">
        <div class="field" style="flex:1 1 100%;min-width:0;">
          <label>Screener DSI (Preset Siap Pakai)</label>
          <div style="display:flex; gap:10px; flex-wrap:wrap; width:100%;">
            <button class="pill ${state.activePreset === 'bagger' ? 'pill-up' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'bagger' ? null : 'bagger'; state.page=1; render();" title="Skor komposit dari formula_screening_saham_bagger.md: Fundamental 40% + Momentum Teknikal 35% + Volume/Smart Money 25%, total â‰¥75" style="font-weight:700;box-shadow:0 0 10px rgba(16,185,129,0.15);">ðŸŽ¯ Skor Bagger â‰¥75</button>
            <button class="pill ${state.activePreset === 'eri' ? 'pill-gold' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'eri' ? null : 'eri'; state.page=1; render();">Eri Ginanjar</button>
            <button class="pill ${state.activePreset === 'rsicross' ? 'pill-gold' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'rsicross' ? null : 'rsicross'; state.page=1; render();">RSI & Harga Cross</button>
            <button class="pill ${state.activePreset === 'golden' ? 'pill-gold' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'golden' ? null : 'golden'; state.page=1; render();">Golden Cross DSI</button>
            <button class="pill ${state.activePreset === 'uptrend' ? 'pill-gold' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'uptrend' ? null : 'uptrend'; state.page=1; render();">Super Uptrend</button>
            <button class="pill ${state.activePreset === 'breakout' ? 'pill-up' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'breakout' ? null : 'breakout'; state.page=1; render();">ðŸš€ Volatility Breakout</button>
            <button class="pill ${state.activePreset === 'pullback' ? 'pill-teal' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'pullback' ? null : 'pullback'; state.page=1; render();">ðŸ§² Pullback Uptrend</button>
          <button class="pill ${state.activePreset === 'custom_bandar' ? 'pill-up' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'custom_bandar' ? null : 'custom_bandar'; state.page=1; render();" title="Proxy dari lonjakan volume â€” bukan data asing resmi">ðŸ”¥ BPJS (proxy volume)</button>
          <button class="pill ${state.activePreset === 'asing_akumulasi' ? 'pill-up' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'asing_akumulasi' ? null : 'asing_akumulasi'; state.page=1; render();" title="Net beli asing 20 hari &ge; 50M, konsisten &ge;12/20 hari, likuid &ge;5M/hari â€” dari data resmi IDX">ðŸ‹ Akumulasi Asing (IDX)</button>
          <button class="pill ${state.activePreset === 'freq_spike' ? 'pill-teal' : 'pill-muted'}" onclick="state.activePreset = state.activePreset === 'freq_spike' ? null : 'freq_spike'; state.page=1; render();" title="Rasio Frekuensi &ge; 1.5x rata-rata â€” butuh kolom frequency/freq_ma20 di DB, kalau belum ada preset ini tidak akan menampilkan hasil">ðŸ”Š Lonjakan Frekuensi</button>
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
        <div class="field" style="flex:0 0 auto;">
          <label>&nbsp;</label>
          <button type="button" class="btn btn-outline" id="exportScreenerBtn" style="color:#22d3ee;border-color:rgba(6,182,212,0.4);white-space:nowrap;" title="Ekspor hasil screener yang sedang difilter/diurutkan ke file Excel (.xlsx)">ðŸ“Š Ekspor Excel (${sorted.length})</button>
        </div>
        <div class="field" style="flex:0 0 auto;">
          <label>&nbsp;</label>
          <button type="button" class="btn btn-outline" id="stockbitBulkBtn" ${state.stockbitBulkLoading ? "disabled" : ""} style="color:#f87171;border-color:rgba(239,68,68,0.4);white-space:nowrap;" title="${state.selectedForBacktest.size>0 ? 'Tarik harga/orderbook live dari Stockbit HANYA untuk saham yang dicentang' : 'Tarik harga/orderbook live dari Stockbit untuk semua saham yang lolos filter saat ini (centang baris tertentu untuk membatasi hanya itu saja)'} â€” butuh Token diisi di Pengaturan">
            ${state.stockbitBulkLoading
              ? `ðŸ”´ Menarik ${state.stockbitBulkProgress?.done||0}/${state.stockbitBulkProgress?.total||0}...`
              : (state.selectedForBacktest.size>0 ? `ðŸ”´ Live Stockbit (${state.selectedForBacktest.size} dicentang)` : `ðŸ”´ Live Stockbit (${sorted.length} lolos)`)}
          </button>
        </div>
        <div class="field" style="flex:0 0 auto;">
          <label>&nbsp;</label>
          <div style="display:flex; align-items:center; gap:8px; background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.25); border-radius:8px; padding:6px 10px;">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;white-space:nowrap;margin:0;">
              <input type="checkbox" id="stockbitAutoRefreshChk" class="custom-checkbox" style="margin:0;" ${state.stockbitAutoRefresh ? "checked" : ""}>
              ðŸ”„ Auto-refresh
            </label>
            <select id="stockbitAutoRefreshSec" style="background:rgba(0,0,0,0.2);border:1px solid var(--border);color:var(--text);font-size:11.5px;border-radius:6px;padding:4px 6px;">
              ${[30,60,120,300].map(s=>`<option value="${s}" ${String(state.stockbitAutoRefreshIntervalSec)===String(s)?'selected':''}>${s<60?s+'d':(s/60)+'m'}</option>`).join("")}
            </select>
          </div>
        </div>
        ${state.stockbitAutoRefresh && (state.selectedForBacktest.size>0 ? state.selectedForBacktest.size : sorted.length) > STOCKBIT_AUTOREFRESH_MAX_TICKERS
          ? `<div class="field" style="flex:0 0 auto;"><label>&nbsp;</label><span style="font-size:11px;color:var(--down);white-space:nowrap;">âš ï¸ &gt;${STOCKBIT_AUTOREFRESH_MAX_TICKERS} saham lolos filter â€” auto-refresh dijeda, centang saham tertentu dulu</span></div>`
          : ""}
        ${(state.stockbitQuoteEndpoint||"") === STOCKBIT_DEFAULT_QUOTE_EP
          ? `<div class="field" style="flex:0 0 auto;"><label>&nbsp;</label><span style="font-size:11px;color:var(--gold);white-space:nowrap;" title="Endpoint default diketahui SALAH (API stream/komentar, bukan API harga) â€” lihat catatan di Pengaturan">âš ï¸ Endpoint Quote masih default (belum terbukti benar)</span></div>`
          : ""}
        <div class="field" style="flex:0 0 auto;">
          <label>&nbsp;</label>
          <div style="display:flex; align-items:center; gap:6px;">
            <input type="date" id="screenerBsFromInput"
              value="${state.bsAutoBulkFrom||""}"
              ${state.stockbitBrokerBulkLoading ? "disabled" : ""}
              style="padding:9.5px 8px; border-radius:8px; border:1px solid var(--border); background:rgba(0,0,0,0.2); color:var(--text); font-size:12px;">
            <span style="color:var(--muted); font-size:11px;">&ndash;</span>
            <input type="date" id="screenerBsToInput"
              value="${state.bsAutoBulkTo||""}"
              ${state.stockbitBrokerBulkLoading ? "disabled" : ""}
              style="padding:9.5px 8px; border-radius:8px; border:1px solid var(--border); background:rgba(0,0,0,0.2); color:var(--text); font-size:12px;">
            <button type="button" class="btn btn-outline" id="screenerBsBulkBtn"
              ${state.stockbitBrokerBulkLoading ? "disabled" : ""}
              style="color:#f87171;border-color:rgba(239,68,68,0.4);white-space:nowrap;"
              title="Tarik data Broker Summary Stockbit untuk saham yang dicentang (atau semua hasil filter kalau tidak ada yang dicentang), untuk periode tanggal di samping">
              ${state.stockbitBrokerBulkLoading
                ? `Menarik ${state.stockbitBrokerBulkProgress?.done||0}/${state.stockbitBrokerBulkProgress?.total||0}...`
                : (state.selectedForBacktest.size>0 ? `Tarik Data (${state.selectedForBacktest.size} dicentang)` : `Tarik Data (${sorted.length} lolos)`)}
            </button>
          </div>
        </div>
        <div class="field" style="flex:0 0 auto;">
          <label>&nbsp;</label>
          <div style="display:flex; align-items:center; gap:6px;">
            <input type="date" id="screenerHdFromInput"
              value="${state.hdAutoBulkFrom||""}"
              ${state.stockbitHistoricalBulkLoading ? "disabled" : ""}
              style="padding:9.5px 8px; border-radius:8px; border:1px solid var(--border); background:rgba(0,0,0,0.2); color:var(--text); font-size:12px;">
            <span style="color:var(--muted); font-size:11px;">&ndash;</span>
            <input type="date" id="screenerHdToInput"
              value="${state.hdAutoBulkTo||""}"
              ${state.stockbitHistoricalBulkLoading ? "disabled" : ""}
              style="padding:9.5px 8px; border-radius:8px; border:1px solid var(--border); background:rgba(0,0,0,0.2); color:var(--text); font-size:12px;">
            <button type="button" class="btn btn-outline" id="screenerHdBulkBtn"
              ${state.stockbitHistoricalBulkLoading ? "disabled" : ""}
              style="color:#a78bfa;border-color:rgba(167,139,250,0.4);white-space:nowrap;"
              title="Tarik Historical Data (Daily) Stockbit untuk saham yang dicentang (atau semua hasil filter kalau tidak ada yang dicentang), disaring ke periode tanggal di samping">
              ${state.stockbitHistoricalBulkLoading
                ? `Menarik ${state.stockbitHistoricalBulkProgress?.done||0}/${state.stockbitHistoricalBulkProgress?.total||0}...`
                : (state.selectedForBacktest.size>0 ? `ðŸ“… Historical (${state.selectedForBacktest.size} dicentang)` : `ðŸ“… Historical (${sorted.length} lolos)`)}
            </button>
          </div>
        </div>
      </div>
      ${state.stockbitHistoricalBulkResults && state.stockbitHistoricalBulkResults.length ? `
        <div style="margin:-6px 0 14px;">
          <details class="bs-bulk-results-panel" id="hdBulkResultsPanel" ${state.hdBulkResultsOpen?"open":""}>
            <summary style="cursor:pointer; font-size:11.5px; color:var(--muted); list-style:none; display:flex; align-items:center; gap:6px; user-select:none;">
              <span class="bs-bulk-results-arrow" style="display:inline-block; transition:transform .15s; transform:rotate(${state.hdBulkResultsOpen?90:0}deg);">â–¶</span>
              Hasil Tarik Historical Data (${state.stockbitHistoricalBulkResults.length} saham)
            </summary>
            <div class="mono" style="margin-top:8px; max-height:220px; overflow-y:auto; font-size:11.5px;">
              ${state.stockbitHistoricalBulkResults.map(r => `
                <div style="padding:4px 0; border-bottom:1px solid var(--border); color:${r.ok ? 'var(--up)' : 'var(--down)'};">
                  ${r.ok ? 'âœ…' : 'âŒ'} ${escapeHtml(r.ticker)} &middot; ${escapeHtml(r.date)} â€” ${escapeHtml(r.msg||"")}
                </div>`).join("")}
            </div>
          </details>
        </div>` : ""}

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
          ${renderMultiSelect("sinyalFrekuensi", "Sinyal Frekuensi", getOpts("sinyalFrekuensi"))}
          ${renderMultiSelect("keyakinanNaik", "Keyakinan Naik", getOpts("keyakinanNaik"))}
          ${renderMultiSelect("band", "Bandarmologi", getOpts("band"))}
          ${renderMultiSelect("uangGedeMasuk", "Uang Gede Masuk", getOpts("uangGedeMasuk"))}
        </div>
      </div>

      <button type="button" class="adv-toggle ${state.showAdvancedFilters ? 'open' : ''}" id="advToggleBtn">
        <span class="chev">â–¶</span> Filter Lanjutan (Valuasi, BB Squeeze, ATR, CLV, Rentang RSI)
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
            ${renderRangeFilter("frequency", "Frekuensi (x transaksi)", {step:"1"})}
          </div>
        </div>
      </div>

      ${renderActiveFilterChips()}

     <div class="toolbar-footer">
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <span class="count-badge" style="margin:0;">${filtered.length} emiten sesuai filter &middot; ${state.selectedForBacktest.size} dipilih</span>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer; background:rgba(34,211,238,0.06); border:1px solid rgba(34,211,238,0.3); padding:4px 10px; border-radius:6px; color:var(--teal); font-weight:bold;">
            <input type="checkbox" id="hideGocapChk" class="custom-checkbox" onchange="render()" ${document.getElementById("hideGocapChk")?.checked ? "checked" : ""}>
            ðŸ›¡ï¸ Sembunyikan Gocap & Suspend
          </label>
        </div>
        <div style="display:flex; gap:12px;">
          ${hasActiveFilters() ? `<button class="btn btn-outline" id="resetFiltersBtn" style="color:#f87171;border-color:rgba(239,68,68,0.3);">Reset Filter</button>` : ""}
          <button class="btn btn-gold-outline" id="saveBacktestBtn">Simpan Pilihan ke Backtest</button>
        </div>
      </div>
    </div>

    <div class="col-picker-wrap">
      <button class="btn btn-outline" id="colPickerBtn">ðŸ§© Kolom (${visibleColumns.length}/${SCREENER_COLUMNS.length})</button>
      <div class="col-picker-panel ${state.colPickerOpen ? 'open' : ''}">
        <div class="col-picker-head">
          <span>Pilih kolom yang ditampilkan</span>
          <div style="display:flex;gap:6px;">
            <button class="link-btn" data-col-preset="ringkas">Ringkas</button>
            <button class="link-btn" data-col-preset="semua">Semua</button>
            <button class="link-btn" data-col-preset="kosong">Kosongkan</button>
            <button class="link-btn" data-col-preset="fundamental" title="Preset Fundamental">ðŸ’°Fund</button>
            <button class="link-btn" data-col-preset="teknikal" title="Preset Teknikal">ðŸ“ŠTeknik</button>
            <button class="link-btn" data-col-preset="bandarmologi" title="Preset Bandarmologi">ðŸ‹Bandar</button>
            <button class="link-btn" data-col-preset="sahamSyariah" title="Preset Saham Syariah">â˜ªï¸Syariah</button>
            <button class="link-btn" data-col-preset="fundamental">ðŸ’°Fund</button>
            <button class="link-btn" data-col-preset="teknikal">ðŸ“ŠTeknik</button>
            <button class="link-btn" data-col-preset="bandarmologi">ðŸ‹Bandar</button>
            <button class="link-btn" data-col-preset="sahamSyariah">â˜ªï¸Syariah</button>
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
          <th class="col-freeze" style="width:${FREEZE_W.star}px;left:${FREEZE_LEFT.star}px;">â˜…</th>
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
      <h3 style="margin:0 0 16px;font-size:14px; font-weight:700;">âž• Tambah Manual ke Backtest</h3>
      <div class="porto-form" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));align-items:end;">
        <div class="field"><label>Simpan ke Sesi</label><select id="btManualSession">${sessionOptions}</select></div>
        <div class="field"><label>Ticker</label><input id="btManualTicker" list="btTickerList" placeholder="BBCA" style="text-transform:uppercase;"><datalist id="btTickerList">${tickerOptions}</datalist></div>
        <div class="field"><label>Tanggal Entry</label><input id="btManualDate" type="date" value="${todayLocalISO()}"></div>
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
      const kriteriaStr = item.kriteria || "-";
      const sumberPill = pillHtml(item.sumber || "Screener", item.sumber === "Manual" ? "gold" : "muted");
      // Tanggal & harga entry di bawah ini SELALU dari item yang sudah
      // tersimpan (terkunci saat pertama kali disimpan â€” lihat
      // saveToBacktest/addManualBacktest), tidak pernah dihitung ulang
      // dari data live. Hanya "Harga Live" & P/L yang ikut data live.
      const tglEntryStr = fmtDateID(item.entryDate);
      const hariSejak = daysSinceEntry(item.entryDate);
      const hariStr = hariSejak === null ? "-" : `${hariSejak}h`;

      return `<tr>
        <td class="ticker-cell"><button class="ticker-link" data-bt-add-porto="${session.id}|${item.ticker}" title="Tambah ${item.ticker} ke Portofolio (harga &amp; tanggal entry otomatis terisi)">${item.ticker}</button></td>
        <td>${sumberPill}</td>
        <td class="mono">${tglEntryStr}</td>
        <td style="white-space:normal; max-width:260px; font-family:'Sora',sans-serif; font-size:12px; line-height:1.6; color:var(--gold); opacity:0.9;">${kriteriaStr}</td>
        <td style="white-space:normal; max-width:320px; font-family:'Sora',sans-serif; font-size:12px; line-height:1.6; color:var(--text); opacity:0.9;">${filterStr}</td>
        <td class="mono" title="Harga entry terkunci sejak disimpan">${fmtNum(item.entryPrice)}</td>
        <td class="mono">${fmtNum(currentPrice)}</td>
        <td class="mono" style="color:var(--${tone}); font-weight:700; font-size:14px;">${plStr}</td>
        <td class="mono">${hariStr}</td>
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
            <h3 style="margin:0; font-size: 15px; font-weight:700;">Waktu Tangkap: ${fmtDateID(session.date)}</h3>
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
                <th>Ticker</th><th>Sumber</th><th>Tanggal Entry</th><th>Kriteria Screener</th><th>Filter / Keterangan</th><th>Harga Entry</th>
                <th>Harga Live</th><th>Profit / Loss</th><th>Hari</th><th>Aksi</th><th></th>
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

  

// ==========================================
// TAB SEKTORAL â€” breakdown per sektor (jumlah naik/turun, rata-rata
// %perubahan, breadth) + daftar saham per sektor yang bisa di-expand,
// masing-masing menampilkan %gain/loss dan bisa diklik untuk membuka
// detail emiten (Teknikal/Fundamental/Bandarmologi/Analisa).
// ==========================================
// ==========================================
// TOP MOVERS â€” 10 Besar Top Gainer / Loser / Value / Volume / Frekuensi
//
// Ditampilkan di bagian atas tab Sektoral supaya kelihatan saham mana yang
// paling aktif/paling bergerak hari ini di seluruh pasar (lintas sektor),
// beda dengan sektor-grid di bawahnya yang dikelompokkan per sektor.
// Data diambil dari enriched() yang sama dipakai Screener/Sektoral, jadi
// selalu sinkron dengan hasil "Refresh Data" terakhir.
// ==========================================
const MOVER_TABS = [
  { key: "gainer",    label: "ðŸš€ Top Gainer",    metricLabel: "%Perubahan" },
  { key: "loser",     label: "ðŸ”» Top Loser",     metricLabel: "%Perubahan" },
  { key: "value",     label: "ðŸ’° Top Value",     metricLabel: "Value (Rp)" },
  { key: "volume",    label: "ðŸ“¦ Top Volume",    metricLabel: "Volume (lbr)" },
  { key: "frequency", label: "ðŸ”Š Top Frekuensi", metricLabel: "Frekuensi (x)" },
];

function computeTopMovers(){
  const data = enriched();
  const withPrice = data.filter(s => s.cClose != null);

  const byChangeDesc = withPrice.filter(s => s.changePct != null).sort((a,b)=> b.changePct - a.changePct);
  const byChangeAsc  = withPrice.filter(s => s.changePct != null).sort((a,b)=> a.changePct - b.changePct);
  // "Value" = nilai transaksi Rupiah (value_traded kalau ada, fallback ke
  // turnover â€” dua-duanya representasi nilai transaksi harian di skema DB).
  const byValue = withPrice.filter(s => (s.valueTraded ?? s.turnover ?? 0) > 0)
    .sort((a,b)=> (b.valueTraded ?? b.turnover ?? 0) - (a.valueTraded ?? a.turnover ?? 0));
  const byVolume = withPrice.filter(s => (s.cVol||0) > 0).sort((a,b)=> (b.cVol||0) - (a.cVol||0));
  const byFrequency = withPrice.filter(s => (s.frequency||0) > 0).sort((a,b)=> (b.frequency||0) - (a.frequency||0));

  return {
    gainer: byChangeDesc.slice(0,10),
    loser: byChangeAsc.slice(0,10),
    value: byValue.slice(0,10),
    volume: byVolume.slice(0,10),
    frequency: byFrequency.slice(0,10),
  };
}

function moverMetricValue(s, key){
  if(key === "gainer" || key === "loser") return s.changePct;
  if(key === "value") return s.valueTraded ?? s.turnover ?? null;
  if(key === "volume") return s.cVol ?? null;
  if(key === "frequency") return s.frequency ?? null;
  return null;
}
function moverMetricDisplay(s, key){
  const v = moverMetricValue(s, key);
  if(v === null || v === undefined || isNaN(v)) return "-";
  if(key === "gainer" || key === "loser") return dNum(v, {plusSign:true, decimals:2, suffix:'%'});
  if(key === "value") return "Rp " + fmtCap(v);
  if(key === "volume") return fmtCap(v);
  if(key === "frequency") return fmtNum(Math.round(v)) + "x";
  return fmtNum(v);
}

function renderTopMovers(){
  const movers = computeTopMovers();
  const activeTab = MOVER_TABS.some(t => t.key === state.topMoversTab) ? state.topMoversTab : "gainer";
  const list = movers[activeTab] || [];
  const activeMeta = MOVER_TABS.find(t => t.key === activeTab);
  const metricTone = activeTab === "loser" ? "down" : activeTab === "gainer" ? "up" : "gold";

  const tabsHtml = MOVER_TABS.map(t => `
    <button type="button" class="mover-tab-btn ${activeTab===t.key?'active':''}" data-mover-tab="${t.key}">${t.label}</button>
  `).join("");

  const rows = list.map((s, i) => {
    const changeTone = (s.changePct||0) > 0 ? "up" : (s.changePct||0) < 0 ? "down" : "muted";
    return `
    <div class="mover-row">
      <div class="mover-rank">${i+1}</div>
      <button class="ticker-link mover-ticker" data-detail="${s.ticker}" title="Lihat detail ${s.ticker}">${s.ticker}${s.syariahLabel==="Ya" ? ' <span class="pill pill-teal" style="padding:1px 6px;font-size:9px;vertical-align:middle;">S</span>' : ''}</button>
      <div class="mover-name" title="${escapeHtml(s.name||'-')}">${escapeHtml(s.name||"-")}</div>
      <div class="mover-sektor" title="${escapeHtml(s.sektor||'-')}">${escapeHtml(s.sektor||"-")}</div>
      <div class="mono mover-price">${fmtNum(s.cClose)}</div>
      <div class="mono mover-change" style="color:var(--${changeTone})">${s.changePct!=null?dNum(s.changePct,{plusSign:true,decimals:2,suffix:'%'}):'-'}</div>
      <div class="mono mover-metric" style="color:var(--${metricTone})">${moverMetricDisplay(s, activeTab)}</div>
      <button class="star-btn" data-fav="${s.ticker}" title="${state.watchlist.has(s.ticker)?'Hapus dari watchlist':'Tambah ke watchlist'}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="${state.watchlist.has(s.ticker)?'var(--gold)':'none'}" stroke="${state.watchlist.has(s.ticker)?'var(--gold)':'var(--muted)'}" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </button>
    </div>`;
  }).join("");

  return `
    <div class="panel" style="flex-direction:column;align-items:stretch;">
      <div class="filter-section-title"><span>ðŸ”¥ TOP MOVERS â€” 10 BESAR HARI INI</span><span class="line"></span></div>
      <div class="mover-tabs">${tabsHtml}</div>
      ${list.length ? `
      <div class="mover-list">
        <div class="mover-row mover-row-header">
          <div class="mover-rank">#</div>
          <div>Ticker</div>
          <div>Nama Emiten</div>
          <div>Sektor</div>
          <div>Harga</div>
          <div>%Perubahan</div>
          <div>${activeMeta ? activeMeta.metricLabel : ""}</div>
          <div></div>
        </div>
        ${rows}
      </div>` : `<div class="empty-box" style="padding:20px;">Belum ada data untuk kategori ini.</div>`}
    </div>
  `;
}

function sektorGroups(){
  const data = enriched();
  const q = (state.sektorSearch||"").toLowerCase().trim();
  const groups = {};
  data.forEach(s=>{
    const sek = s.sektor || "Tidak Diketahui";
    if(!groups[sek]) groups[sek] = [];
    groups[sek].push(s);
  });
  return Object.entries(groups).map(([sek, list])=>{
    const withChange = list.filter(s=> s.changePct!=null);
    const avgChange = withChange.length ? withChange.reduce((a,s)=>a+s.changePct,0)/withChange.length : null;
    const gainers = list.filter(s=> (s.changePct||0) > 0).length;
    const losers = list.filter(s=> (s.changePct||0) < 0).length;
    const flat = list.length - gainers - losers;
    const totalTurnover = list.reduce((a,s)=> a + (s.turnover||0), 0);
    const totalMarketCap = list.reduce((a,s)=> a + (s.marketCap||0), 0);

    let sorted = [...list];
    let filteredList = q ? sorted.filter(s=> s.ticker.toLowerCase().includes(q) || String(s.name||"").toLowerCase().includes(q)) : sorted;
    if(state.sektorSort === "changeDesc") filteredList.sort((a,b)=> (b.changePct??-999) - (a.changePct??-999));
    else if(state.sektorSort === "changeAsc") filteredList.sort((a,b)=> (a.changePct??999) - (b.changePct??999));
    else if(state.sektorSort === "turnoverDesc") filteredList.sort((a,b)=> (b.turnover||0) - (a.turnover||0));
    else if(state.sektorSort === "ticker") filteredList.sort((a,b)=> a.ticker.localeCompare(b.ticker));

    const byChange = [...list].sort((a,b)=> (b.changePct??-999) - (a.changePct??-999));
    return {
      sektor: sek, list: filteredList, rawCount: list.length,
      avgChange, gainers, losers, flat, total: list.length,
      totalTurnover, totalMarketCap,
      topGainer: byChange[0] || null, topLoser: byChange[byChange.length-1] || null
    };
  }).filter(g => !q || g.list.length)
    .sort((a,b)=> (b.avgChange ?? -999) - (a.avgChange ?? -999));
}

function renderSektoral(){
  const data = enriched();
  if(!data.length){
    return `<div class="empty-box">Belum ada data saham. Klik "Refresh Data" atau atur koneksi Supabase lewat "âš™ï¸ Pengaturan".</div>`;
  }
  const groups = sektorGroups();

  const withChange = data.filter(s=>s.changePct!=null);
  const overallAvg = withChange.length ? withChange.reduce((a,s)=>a+s.changePct,0)/withChange.length : null;
  const overallGainers = data.filter(s=>(s.changePct||0)>0).length;
  const overallLosers = data.filter(s=>(s.changePct||0)<0).length;
  const overallFlat = data.length - overallGainers - overallLosers;
  const bestSektor = groups.length ? groups[0] : null;
  const worstSektor = groups.length ? groups[groups.length-1] : null;

  return `
    <div class="panel">
      <div class="filter-section-title"><span>ðŸ“Š RINGKASAN PASAR PER SEKTOR</span><span class="line"></span></div>
      <div class="summary-grid">
        <div class="summary-card tone-up">
          <div class="summary-lbl">Saham Naik</div>
          <div class="summary-val" style="color:var(--up)">â–² ${overallGainers}</div>
        </div>
        <div class="summary-card tone-down">
          <div class="summary-lbl">Saham Turun</div>
          <div class="summary-val" style="color:var(--down)">â–¼ ${overallLosers}</div>
        </div>
        <div class="summary-card">
          <div class="summary-lbl">Stagnan</div>
          <div class="summary-val">${overallFlat}</div>
        </div>
        <div class="summary-card tone-gold">
          <div class="summary-lbl">Rata-rata Perubahan</div>
          <div class="summary-val" style="color:${overallAvg!=null && overallAvg>=0?'var(--up)':'var(--down)'}">${overallAvg!=null?dNum(overallAvg,{plusSign:true,decimals:2,suffix:'%'}):'-'}</div>
        </div>
        <div class="summary-card">
          <div class="summary-lbl">Sektor Terkuat</div>
          <div class="summary-val" style="font-size:15px;color:var(--up);">${bestSektor ? escapeHtml(bestSektor.sektor) : '-'}</div>
        </div>
        <div class="summary-card">
          <div class="summary-lbl">Sektor Terlemah</div>
          <div class="summary-val" style="font-size:15px;color:var(--down);">${worstSektor ? escapeHtml(worstSektor.sektor) : '-'}</div>
        </div>
      </div>

      <div class="filter-toolbar" style="margin-bottom:0;padding-bottom:0;border-bottom:none;">
        <div class="field">
          <label>Cari Saham dalam Sektor</label>
          <div class="search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="sektorSearchInput" placeholder="Ticker / nama emiten..." value="${escapeHtml(state.sektorSearch)}" style="width:220px;">
          </div>
        </div>
        <div class="field">
          <label>Urutkan Saham</label>
          <select id="sektorSortSelect" style="background:rgba(0,0,0,0.2);border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:8px;font-size:12.5px;">
            <option value="changeDesc" ${state.sektorSort==='changeDesc'?'selected':''}>%Perubahan: Tertinggi</option>
            <option value="changeAsc" ${state.sektorSort==='changeAsc'?'selected':''}>%Perubahan: Terendah</option>
            <option value="turnoverDesc" ${state.sektorSort==='turnoverDesc'?'selected':''}>Turnover Terbesar</option>
            <option value="ticker" ${state.sektorSort==='ticker'?'selected':''}>Ticker (A-Z)</option>
          </select>
        </div>
      </div>
    </div>

    ${renderTopMovers()}

    <div class="sektor-grid">
      ${groups.map(g=> renderSektorCard(g)).join("")}
    </div>
  `;
}

function renderSektorCard(g){
  const isOpen = state.sektorExpanded.has(g.sektor);
  const breadthPct = g.total ? Math.round((g.gainers/g.total)*100) : 0;
  const avgTone = g.avgChange==null ? "muted" : g.avgChange>0 ? "up" : g.avgChange<0 ? "down" : "gold";
  return `
    <div class="sektor-card ${isOpen?'open':''}">
      <div class="sektor-card-head" data-sektor-toggle="${escapeHtml(g.sektor)}">
        <div class="sektor-card-title">
          <div class="sektor-name">${escapeHtml(g.sektor)}</div>
          <div class="sektor-meta">${g.total} emiten Â· Turnover Rp ${fmtCap(g.totalTurnover)} Â· Cap Rp ${fmtCap(g.totalMarketCap)}</div>
        </div>
        <div class="sektor-card-mid">
          <div class="sektor-avg-change mono" style="color:var(--${avgTone})">${g.avgChange!=null?dNum(g.avgChange,{plusSign:true,decimals:2,suffix:'%'}):'-'}</div>
          <div class="sektor-breadth-bar"><div class="sektor-breadth-fill" style="width:${breadthPct}%"></div></div>
          <div class="sektor-breadth-lbl"><span style="color:var(--up)">â–²${g.gainers}</span> <span style="color:var(--down)">â–¼${g.losers}</span> <span style="color:var(--muted)">â€¢${g.flat}</span></div>
        </div>
        <div class="sektor-card-extremes">
          ${g.topGainer ? `<div title="Top Gainer">ðŸ† ${escapeHtml(g.topGainer.ticker)} <span style="color:var(--up)">${g.topGainer.changePct!=null?dNum(g.topGainer.changePct,{plusSign:true,decimals:2,suffix:'%'}):'-'}</span></div>` : ""}
          ${g.topLoser ? `<div title="Top Loser">ðŸ”» ${escapeHtml(g.topLoser.ticker)} <span style="color:var(--down)">${g.topLoser.changePct!=null?dNum(g.topLoser.changePct,{plusSign:true,decimals:2,suffix:'%'}):'-'}</span></div>` : ""}
        </div>
        <button class="sektor-expand-btn" type="button" title="${isOpen?'Tutup':'Lihat semua saham'}">${isOpen?'â–²':'â–¼'}</button>
      </div>
      ${isOpen ? `
      <div class="sektor-card-body">
        ${g.list.length ? `
        <div class="sektor-stock-row sektor-stock-header">
          <div></div>
          <div>Ticker</div>
          <div>Nama Emiten</div>
          <div>Harga</div>
          <div>%Gain/Loss</div>
        </div>
        <div class="sektor-stock-list">
          ${g.list.map(s=> renderSektorStockRow(s)).join("")}
        </div>` : `<div class="empty-box" style="padding:20px;">Tidak ada saham yang cocok dengan pencarian.</div>`}
      </div>` : ``}
    </div>
  `;
}

function renderSektorStockRow(s){
  const tone = (s.changePct||0) > 0 ? "up" : (s.changePct||0) < 0 ? "down" : "muted";
  const barPct = Math.min(100, Math.abs(s.changePct||0) / 10 * 100); // skala visual thd 10%
  return `
    <div class="sektor-stock-row">
      <button class="star-btn" data-fav="${s.ticker}" title="${state.watchlist.has(s.ticker)?'Hapus dari watchlist':'Tambah ke watchlist'}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="${state.watchlist.has(s.ticker)?'var(--gold)':'none'}" stroke="${state.watchlist.has(s.ticker)?'var(--gold)':'var(--muted)'}" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </button>
      <button class="ticker-link sektor-stock-ticker" data-detail="${s.ticker}" title="Lihat detail ${s.ticker}">${s.ticker}${s.syariahLabel==="Ya" ? ' <span class="pill pill-teal" style="padding:1px 6px;font-size:9px;vertical-align:middle;">S</span>' : ''}</button>
      <div class="sektor-stock-name" title="${escapeHtml(s.name||'-')}">${escapeHtml(s.name||"-")}</div>
      <div class="sektor-stock-price mono">${dNum(s.cClose)}</div>
      <div class="sektor-stock-change-wrap">
        <div class="sektor-change-bar-track"><div class="sektor-change-bar-fill tone-${tone}" style="width:${barPct}%"></div></div>
        <span class="mono sektor-stock-change" style="color:var(--${tone})">${s.changePct!=null?dNum(s.changePct,{plusSign:true,decimals:2,suffix:'%'}):'-'}</span>
      </div>
    </div>
  `;
}

function renderWatchlist(){
  const rows = enriched().filter(s=>state.watchlist.has(s.ticker));
  if(rows.length===0) return `<div class="empty-box">Belum ada saham di watchlist. Klik ikon â˜… di tab Screener untuk menambahkan.</div>`;
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
      <button class="btn btn-outline" style="width: 100%; justify-content:center; color: var(--teal); border-color: rgba(6,182,212,0.3);" data-chart="${s.ticker}">Lihat grafik â†’</button>
    </div>
  `).join("")}</div>`;
}

function renderPortoFormFields(){
  const editing = state.portoEditId ? state.portfolio.find(p => String(p.id) === String(state.portoEditId)) : null;
  const prefill = !editing && state.portoPrefill ? state.portoPrefill : null;
  const f = editing || {
    ticker: prefill?.ticker || "", tglBeli: prefill?.tglBeli || "", hargaBeli: prefill?.hargaBeli || "", lotBeli: "", feeBeliPct: 0.15,
    support:"", resistance:"", fib618:"", targetTP:"", cutLoss:"",
    tglJual:"", hargaJual:"", lotJual:"", feeJualPct:0.25, catatan: prefill ? `Dari Backtest â€” harga entry terkunci ${fmtNum(prefill.hargaBeli)} @ ${fmtDateID(prefill.tglBeli)}` : ""
  };
  const c = editing ? hitungPorto({
    hargaBeli:+f.hargaBeli||0, lotBeli:+f.lotBeli||0, feeBeliPct:+f.feeBeliPct||0,
    hargaJual:+f.hargaJual||0, lotJual:+f.lotJual||0, feeJualPct:+f.feeJualPct||0,
    tglBeli:f.tglBeli, tglJual:f.tglJual
  }) : { totalBeli:"", netJual:"", jangkaWaktu:"", persenPL:"", nilaiPL:"", status:"Open" };

  const tickerOptions = [...new Set(state.stocks.map(s=>s.ticker))].map(t=>`<option value="${t}">`).join("");

  document.getElementById("portoModalTitle") && (document.getElementById("portoModalTitle").textContent = editing ? "âœï¸ Edit Transaksi Portofolio" : "âž• Tambah Transaksi Portofolio");

  // Kalkulator Averaging (Hanya muncul saat Mode Edit Portofolio)
  const avgCalcHtml = editing ? `
    <div style="grid-column: 1/-1; background: rgba(34,211,238,0.05); border: 1px dashed rgba(34,211,238,0.4); border-radius: 10px; padding: 16px; margin-top: 12px;">
      <div style="font-size: 13px; font-weight: 700; color: var(--teal); margin-bottom: 8px;">âš–ï¸ Kalkulator Averaging (Simulasi)</div>
      <div style="font-size: 11px; color: var(--muted); margin-bottom: 12px;">Masukkan skenario pembelian baru untuk melihat perubahan harga rata-rata Anda.</div>
      <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <div class="field" style="flex:1;"><label>Harga Beli Baru</label><input type="number" id="avgNewPrice" placeholder="Misal: 1200" oninput="calcAveraging(${f.hargaBeli}, ${f.lotBeli})"></div>
          <div class="field" style="flex:1;"><label>Lot Beli Baru</label><input type="number" id="avgNewLot" placeholder="Misal: 50" oninput="calcAveraging(${f.hargaBeli}, ${f.lotBeli})"></div>
      </div>
      <div id="avgResult" style="margin-top: 14px; font-size: 14px; font-weight: bold; color: var(--gold);">Harga Rata-rata Baru: -</div>
    </div>
  ` : '';

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
        ${avgCalcHtml}
      </div>
      <div style="display:flex;gap:12px;margin-top:24px;">
        <button class="btn btn-primary" id="pfSubmitBtn" style="border-radius:8px; padding: 12px; font-size: 14px;">${editing?"Update Transaksi":"Simpan Transaksi"}</button>
        <button class="btn btn-outline" id="pfCancelBtn" style="border-radius:8px; padding: 12px; font-size: 14px;">Batal</button>
      </div>`;
}

function renderPortfolioStrategyStats() {
    const closed = state.portfolio.filter(p => p.nilaiPL !== "" && p.nilaiPL !== undefined && p.nilaiPL !== null);
    if(closed.length === 0) return '';
    const strategyStats = {};
    closed.forEach(p => {
        let strat = "Manual / Umum";
        if (p.catatan && p.catatan.includes("Dari Backtest")) strat = "Hasil Screener/Backtest";
        if (!strategyStats[strat]) strategyStats[strat] = { wins: 0, total: 0 };
        strategyStats[strat].total++;
        if (p.status === "Win") strategyStats[strat].wins++;
    });
    const rows = Object.keys(strategyStats).map(key => {
        const s = strategyStats[key];
        const rate = (s.wins / s.total) * 100;
        const tone = rate >= 50 ? "up" : "down";
        return `
        <div style="display:flex; justify-content:space-between; font-size:12px; border-bottom:1px dashed var(--border); padding:8px 0;">
            <span style="color:var(--text);">${escapeHtml(key)}</span>
            <span style="color:var(--${tone}); font-weight:bold;">${rate.toFixed(0)}% <span style="font-size:10px;color:var(--muted)">(${s.wins}/${s.total})</span></span>
        </div>`;
    }).join("");
    return `
    <div class="porto-stat" style="grid-column: 1 / -1; margin-top: 10px;">
        <div class="lbl">ðŸ“Š Win Rate Berdasarkan Strategi / Tipe Entry</div>
        <div style="margin-top:8px;">${rows}</div>
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
      ${state.selectedPorto.size > 0 ? `<button class="btn btn-outline" style="color:#f87171;border-color:rgba(239,68,68,0.4);" id="pfBulkDeleteBtn">ðŸ—‘ Hapus ${state.selectedPorto.size} Terpilih</button>` : ""}
    </div>`;

  const summary = `
    <div class="porto-summary">
      <div class="porto-stat"><div class="lbl">Total Transaksi</div><div class="val">${state.portfolio.length}</div></div>
      <div class="porto-stat"><div class="lbl">Total Modal Dibeli</div><div class="val">${fmtNum(totalInvest)}</div></div>
      <div class="porto-stat"><div class="lbl">Total P/L Realisasi</div><div class="val" style="color:${totalPL>=0?'var(--up)':'var(--down)'}">${totalPL>=0?'+':''}${fmtNum(totalPL)}</div></div>
      <div class="porto-stat"><div class="lbl">Win Rate</div><div class="val">${winRate}% <span style="font-size:12px;color:var(--muted); font-weight:500;">(${winCount}/${closed.length})</span></div></div>
      ${renderPortfolioStrategyStats()}
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
    hint = `<div class="hint-text" style="color:var(--gold); font-size:12px;">Menampilkan ticker dari Watchlist â­. Ketik di kotak pencarian untuk mencari emiten lain.</div>`;
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

  const chartBoxInner = state.chartLoading
    ? `<div class="empty-box" style="height:100%;display:flex;align-items:center;justify-content:center;">Memuat histori harga...</div>`
    : (!state.chartData.length
        ? `<div class="empty-box" style="height:100%;display:flex;align-items:center;justify-content:center;">Belum ada histori harga untuk ${t} di tabel <code>flows</code> â€” jalankan <code>sync-flow.mjs</code> dulu.</div>`
        : `<svg id="chartSvg" width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="none"></svg>`);

  return `${picker}
    ${chartToolbar}
    ${tvBox}
    <div class="chart-section-title">Level Teknikal Internal (harga close — sumber: ${state.chartDataSource === "price_history_stockbit" ? "price_history_stockbit (Stockbit, flows belum tersedia)" : "flows (IDX)"})</div>
    ${legend}
    <div class="chart-box">${chartBoxInner}</div>`;
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

function spCriteriaBox(label, html){
  return `<div class="sp-crit-box"><div class="sp-crit-lbl">${label}</div><div class="sp-crit-body">${html}</div></div>`;
}

function renderSmartPickListModalContent(){
  const defId = state.spListOpenDefId;
  const def = spDefById(defId);
  if(!def) return "";
  const list = getSmartPickMatchesFull(defId);
  if(!list.length){
    return `<div class="empty-box">Belum ada saham yang lolos kriteria "${escapeHtml(def.title)}" hari ini.</div>`;
  }
  return `
    <div style="font-size:12px;color:var(--muted);margin-bottom:12px;">
      ${escapeHtml(def.shortDesc)} â€” <b class="mono">${list.length}</b> saham lolos, diurutkan dari skor tertinggi.
    </div>
    <div class="table-wrap" style="max-height:60vh;">
      <table class="mono">
        <thead>
          <tr><th>#</th><th>Kode</th><th>Sektor</th><th>Harga</th><th>Î”%</th><th>Posisi 52W</th><th>Vol Ratio</th><th>Skor</th><th></th></tr>
        </thead>
        <tbody>
          ${list.map((s,i)=>`
            <tr>
              <td>${i+1}</td>
              <td class="ticker-cell">${escapeHtml(s.ticker)}${s.strong?' <span title="Sinyal Kuat">ðŸ”¥</span>':''}${s.stockbitVerified?' <span title="Volume spike tervalidasi Value (Rp) riil dari Stockbit, bukan cuma rasio volume lembar">ðŸ’ </span>':''}</td>
              <td style="white-space:normal;max-width:160px;font-family:'Sora',sans-serif;">${escapeHtml(s.sektor||"-")}</td>
              <td>Rp${fmtNum(Math.round(s.price||0))}</td>
              <td style="font-weight:700;color:${(s.changePct||0)>=0?'var(--up)':'var(--down)'};">${(s.changePct||0)>=0?"+":""}${(s.changePct||0).toFixed(1)}%</td>
              <td>${s.pos52w!=null?s.pos52w.toFixed(0)+"%":"-"}</td>
              <td>${s.volRatio!=null?s.volRatio.toFixed(1)+"x":"-"}</td>
              <td>${pillHtml(s.score.toFixed(0), s.strong?"gold":"teal")}</td>
              <td><button type="button" class="link-btn" data-sp-list-detail="${s.ticker}">Detail</button></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSmartPickCard(def){
  const matches = getSmartPickMatches(def.id);
  const open = state.spOpenCriteria === def.id;
  return `
    <div class="sp-card">
      <div class="sp-card-head">
        <div class="sp-card-title">${def.icon} ${escapeHtml(def.title)}</div>
        <button type="button" class="sp-crit-toggle ${open?'open':''}" data-sp-toggle="${def.id}">Kriteria <span class="chev">â–¾</span></button>
      </div>
      <div class="sp-card-desc">${escapeHtml(def.shortDesc)}</div>
      <div class="sp-card-count">
        ${matches.length ? `<span class="pill pill-${def.tone}">${matches.length} lolos hari ini</span>` : `<span class="pill pill-muted">Belum ada yang lolos</span>`}
      </div>
      ${matches.length ? `
      <div class="sp-card-tickers">
        ${matches.slice(0,6).map(m=>`<button type="button" class="sp-ticker-chip ${m.strong?'strong':''}" data-sp-ticker="${m.ticker}" title="Skor ${m.score.toFixed(0)}${m.strong?' Â· Sinyal Kuat ðŸ”¥':''}${m.stockbitVerified?' Â· Value Stockbit terverifikasi ðŸ’ ':''}">${escapeHtml(m.ticker)}${m.strong?' ðŸ”¥':''}${m.stockbitVerified?' ðŸ’ ':''}</button>`).join("")}
        ${matches.length>6?`<span class="sp-ticker-more">+${matches.length-6} lagi</span>`:""}
      </div>
      <button type="button" class="btn btn-outline sp-viewall-btn" data-sp-viewall="${def.id}">ðŸ“‹ Lihat Daftar Lengkap (${matches.length})</button>` : ""}
      <div class="sp-crit-panel ${open?'open':''}">
        <div class="sp-crit-grid">
          ${spCriteriaBox("Definisi", def.definisi)}
          ${spCriteriaBox("Filter", def.filter)}
          ${spCriteriaBox("Scoring", def.scoring)}
          ${spCriteriaBox("Sinyal Kuat", def.sinyalKuat)}
        </div>
      </div>
    </div>`;
}

function renderSmartPick(){
  const cardsHtml = SMART_PICK_DEFS.map(renderSmartPickCard).join("");

  const rows = smartPickRowsWithLive();
  const stats = computeSmartPickStats(rows);
  const todayStr = todayLocalISO();
  const alreadyToday = state.spHistory.some(h => h.muncul_date === todayStr);

  const tableRows = rows.map(r => `
    <tr>
      <td class="ticker-cell">${escapeHtml(r.stock_code)}</td>
      <td>${pillHtml(escapeHtml(spTitleFor(r.signal_type)), spToneFor(r.signal_type))}</td>
      <td>${fmtDateID(r.muncul_date)}</td>
      <td class="mono">Rp${fmtNum(Math.round(r.entry_price))}</td>
      <td class="mono">${r.nowPrice!=null ? "Rp"+fmtNum(Math.round(r.nowPrice)) : "-"}</td>
      <td class="mono" style="font-weight:700;color:${r.chgPct==null?'var(--muted)':(r.chgPct>=0?'var(--up)':'var(--down)')};">${r.chgPct==null?"-":(r.chgPct>=0?"+":"")+r.chgPct.toFixed(1)+"%"}</td>
      <td class="mono">${r.hari}h</td>
    </tr>`).join("");

  return `
    <div class="panel" style="margin-bottom:16px;">
      <div class="filter-section-title">âœ¨ Smart Pick <span class="pill pill-teal" style="margin-left:8px;">AI SCREENER</span><span class="line"></span></div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:14px;">
        5 sinyal siap pakai, dihitung otomatis dari data live saat ini (rule-based, bukan model AI beneran). Klik "Kriteria" di tiap kartu untuk lihat definisi & cara skornya.
      </div>
      <div class="sp-grid">${cardsHtml}</div>
    </div>

    <div class="panel">
      <button type="button" class="sp-recap-header" id="spRecapHeader">
        <div>
          <div class="filter-section-title" style="margin-bottom:2px;">ðŸ“Œ Rekap &amp; Share Signal</div>
          <div style="font-size:11.5px;color:var(--muted);font-weight:400;">Performa tiap signal sejak finalisasi + lacak win rate</div>
        </div>
        <span class="chev sp-recap-chev ${state.spRecapCollapsed?'':'open'}">â–¾</span>
      </button>
      <div class="sp-recap-body ${state.spRecapCollapsed?'':'open'}">
        <div class="sp-finalize-bar">
          <div>
            <div style="font-weight:700;font-size:13px;">FINALISASI HARI INI</div>
            <div style="font-size:11px;color:var(--muted);">Klik setelah market close â€” dikunci ke tanggal data${alreadyToday?" (sudah difinalisasi hari ini)":""}</div>
          </div>
          <button type="button" class="btn btn-primary" id="spFinalizeBtn" ${state.spFinalizing?"disabled":""}>${state.spFinalizing?"Memproses...":"âœ“ Finalisasi Signal (EOD)"}</button>
        </div>
        ${state.spMsg?`<div class="bs-msg ${state.spMsgError?'bs-msg-error':'bs-msg-ok'}" style="margin-top:8px;">${escapeHtml(state.spMsg)}</div>`:""}

        <div class="sp-toolbar">
          <select id="spFilterType" class="bs-input">
            <option value="all" ${state.spFilterType==="all"?"selected":""}>Semua signal</option>
            ${SMART_PICK_DEFS.map(d=>`<option value="${d.id}" ${state.spFilterType===d.id?"selected":""}>${escapeHtml(d.title)}</option>`).join("")}
          </select>
          <span style="font-size:11px;color:var(--muted);">Dari</span>
          <input type="date" id="spFromInput" class="bs-input" value="${state.spFrom||""}">
          <span style="font-size:11px;color:var(--muted);">s/d</span>
          <input type="date" id="spToInput" class="bs-input" value="${state.spTo||""}">
          <button type="button" class="btn btn-outline" id="spRefreshBtn" title="Muat ulang riwayat">ðŸ”„</button>
        </div>

        <div class="summary-grid" style="margin-top:14px;">
          <div class="summary-card tone-up">
            <div class="summary-lbl">Win Rate</div>
            <div class="summary-val">${stats.winRate!=null?stats.winRate.toFixed(0)+"%":"-"}</div>
          </div>
          <div class="summary-card tone-gold">
            <div class="summary-lbl">Rata-rata</div>
            <div class="summary-val" style="color:${stats.avg==null?'var(--text)':(stats.avg>=0?'var(--up)':'var(--down)')};font-size:20px;">${stats.avg!=null?(stats.avg>=0?"+":"")+stats.avg.toFixed(1)+"%":"-"}</div>
          </div>
          <div class="summary-card">
            <div class="summary-lbl">Tercatat</div>
            <div class="summary-val">${stats.total}</div>
          </div>
        </div>

        ${state.spHistoryLoading ? `<div class="empty-box" style="margin-top:14px;">Memuat riwayat...</div>` :
          rows.length ? `
          <div class="table-wrap" style="margin-top:14px;">
            <table class="mono">
              <thead><tr><th>Kode</th><th>Signal</th><th>Muncul</th><th>Entry</th><th>Now</th><th>Î”%</th><th>Hari</th></tr></thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>` : `<div class="empty-box" style="margin-top:14px;">Belum ada riwayat sinyal${!SUPABASE_URL?" (Supabase belum dikonfigurasi)":""}. Klik "âœ“ Finalisasi Signal (EOD)" di atas â€” idealnya setelah market close â€” untuk mulai melacak performa.</div>`}
      </div>
    </div>
  `;
}

// ==========================================
// Panduan tab "â„¹ï¸ Info" â€” SATU sumber kebenaran untuk daftar fitur yang
// ditampilkan ke user. Kalau nambah tab baru atau ubah cakupan fitur
// besar, update array ini juga supaya halaman Info tidak kembali basi
// (versi lama cuma menyebut 6 hal dari puluhan fitur yang sudah ada).
// ==========================================
const ABOUT_TAB_GUIDE = [
  { icon:"ðŸ“‹", title:"Screener", tone:"teal",
    desc:"Tabel utama semua saham IHSG dengan filter teknikal &amp; fundamental siap pakai, preset DSI (Eri Ginanjar, RSI Cross, Golden Cross, Super Uptrend, Volatility Breakout, Pullback Uptrend), plus Rule Builder kustom untuk menyusun kombinasi filter sendiri (mirip \"Edit Screener\" Stockbit) â€” bisa disimpan sebagai preset pribadi.",
    catatan:"Rule Builder saat ini menggabungkan semua rule dengan AND (seluruh syarat harus terpenuhi bersamaan, belum ada OR/grouping)." },
  { icon:"âœ¨", title:"Smart Pick", tone:"gold",
    desc:"5 sinyal siap pakai â€” Area Demand, Throwback/Retest Breakout, Liquidity Sweep, Bull Divergence, Early Breakout â€” dihitung dari data live yang sama dengan Screener. Tombol \"Finalisasi Signal (EOD)\" mengunci snapshot harian ke database supaya win-rate &amp; rata-rata return tiap sinyal bisa dilacak dari waktu ke waktu.",
    catatan:"Ini scoring rule-based dari data yang sudah ada, bukan model AI/machine learning â€” hasil bisa berubah tiap refresh sebelum difinalisasi." },
  { icon:"ðŸ¢", title:"Sektoral", tone:"teal",
    desc:"Saham dikelompokkan per sektor, lengkap dengan panel Top Movers (Gainer / Loser / Value / Volume / Frequency) 10 besar hari ini." },
  { icon:"â­", title:"Watchlist", tone:"muted",
    desc:"Kumpulan saham yang ditandai bintang dari tab manapun. Tersimpan otomatis di penyimpanan browser (localStorage) perangkat ini, dan disinkronkan ke Supabase kalau koneksi aktif." },
  { icon:"ðŸ”¬", title:"Backtest", tone:"teal",
    desc:"Catat sesi backtest manual (harga entry, tanggal, keterangan) per saham lalu bandingkan hasilnya dari waktu ke waktu. Bisa diekspor ke Excel per sesi atau digabung semua sekaligus." },
  { icon:"ðŸ’¼", title:"Portofolio", tone:"up",
    desc:"Pencatatan transaksi beli/jual saham nyata beserta kalkulasi P&amp;L. Bisa diisi otomatis dari saham yang lolos Screener atau dari item Backtest." },
  { icon:"ðŸ“ˆ", title:"Grafik", tone:"teal",
    desc:"Chart harga per saham (digambar langsung di aplikasi ini, tanpa library chart eksternal), plus tautan cepat ke TradingView dan Stockbit untuk analisis lebih lanjut." },
  { icon:"ðŸ“Š", title:"Broker Summary", tone:"gold",
    desc:"Top 5 broker beli/jual per saham per hari â€” diketik manual atau ditempel dari CSV berdasarkan data akun Stockbit Anda sendiri, lalu disimpan supaya bisa dipakai fitur lain (Target Bandar, Entry Price Scanner).",
    catatan:"BUKAN hasil scraping otomatis dari Stockbit â€” datanya sepenuhnya bergantung pada apa yang Anda masukkan sendiri, jadi seakurat dan serutin Anda mengisinya." },
  { icon:"ðŸŽ¯", title:"Target Bandar", tone:"up",
    desc:"Dibangun di atas data Broker Summary: agregasi top bandar per emiten, kalkulator target harga (rata-rata harga bandar + ATR14 â†’ level target R1/Max), dan ringkasan hit-rate dari kalkulasi sebelumnya dibanding harga aktual." },
  { icon:"ðŸ•µï¸", title:"Entry Price Scanner", tone:"gold",
    desc:"Menganalisis konvergensi VWAP broker (menyatu / diam / menjauh), tren akumulasi 10 hari (\"tanjakan\"), dan skor \"mutu\" untuk membantu mencari area entry yang dekat dengan harga rata-rata broker besar." },
  { icon:"â¬¢", title:"Kraken Flow (ORCA)", tone:"gold",
    desc:"Screener order-flow ala fitur \"ORCA System\" â€” mendeteksi pola antrian bid/offer, ukuran transaksi rata-rata (ATS), transaksi non-reguler, dan aliran dana asing, langsung dari data live tanpa perlu tombol \"Scan\" terpisah â€” cukup ubah filter, hasil update otomatis." },
];

const ABOUT_INTEGRATION_GUIDE = [
  { title:"Data Teknikal &amp; Fundamental", tone:"teal",
    desc:"Diambil dari Yahoo Finance (data publik) lewat Google Apps Script milik Anda sendiri. Indikator: EMA21 High/Low, RSI7 vs RSI21, MACD histogram, Volume MA20, PER, PBV, ROE, Dividend Yield." },
  { title:"Bandarmologi (kolom Screener)", tone:"down",
    desc:"PENTING: kolom \"Bandarmologi\" di tabel Screener BUKAN data transaksi broker asli â€” itu PROXY heuristik dari rasio volume hari ini terhadap rata-rata 20 hari, dikombinasikan arah harga. Data bandarmologi yang lebih mendekati transaksi asli (bid/offer, net asing, ATS) ada di tab Kraken Flow (ORCA) dan Target Bandar, yang bersumber dari data resmi IDX / input manual Broker Summary." },
  { title:"Live Data Stockbit", tone:"down",
    desc:"Opsional, pakai token dari extension Chrome Stockbit milik Anda sendiri. Ini API TIDAK RESMI (hasil pengamatan traffic, bukan dokumentasi resmi Stockbit) â€” endpoint bisa berubah atau berhenti berfungsi kapan saja tanpa pemberitahuan. Token hanya disimpan di Local Storage browser ini." },
  { title:"Notifikasi Telegram", tone:"teal",
    desc:"Opsional â€” mengirim notifikasi otomatis lewat Cron server (Supabase Edge Function) kalau ada saham baru lolos preset Rules Kustom pilihan Anda, tetap terkirim walau aplikasi ini tidak sedang dibuka. Butuh setup 1x lewat menu âš™ï¸ Pengaturan." },
  { title:"Penyimpanan Kredensial", tone:"up",
    desc:"Supabase URL/Key, token Stockbit, dan pengaturan Telegram disimpan di Local Storage browser perangkat ini â€” tidak tertanam di HTML, jadi tetap aman kalau aplikasi ini di-hosting publik. Selalu pakai anon key Supabase, jangan pernah service_role key." },
];

function renderAbout(){
  const row=(title,tone,desc)=>`<div class="about-row">${pillHtml(title,tone)}<p>${desc}</p></div>`;
  const tabRow=(t)=>`
    <details class="about-row" style="display:block;padding:10px 0;">
      <summary style="cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;">
        <span style="font-size:15px;">${t.icon}</span>${pillHtml(t.title,t.tone)}
        <span style="font-size:11.5px;color:var(--muted);font-weight:400;">â–¾ detail</span>
      </summary>
      <div style="margin-top:8px;padding-left:24px;">
        <p style="margin:0 0 6px;">${t.desc}</p>
        ${t.catatan ? `<p style="margin:0;font-size:11.5px;color:var(--gold);">âš ï¸ ${t.catatan}</p>` : ""}
      </div>
    </details>`;
  return `
    <div class="panel" style="flex-direction:column;align-items:stretch;margin-bottom:16px;">
      <p style="margin:0;font-size:13px;color:var(--text);line-height:1.6;">
        IHSG Screener Pro adalah alat bantu screening &amp; analisis saham IHSG pribadi â€”
        menggabungkan data teknikal/fundamental, sinyal siap pakai (Smart Pick), pelacakan
        bandarmologi (Broker Summary, Target Bandar, Kraken Flow), backtest, dan portofolio
        dalam satu aplikasi. Ini <b>bukan nasihat/rekomendasi investasi</b> â€” semua sinyal
        &amp; skor di sini adalah alat bantu keputusan, keputusan akhir tetap di tangan Anda.
      </p>
    </div>

    <div class="filter-section-title">ðŸ“š Peta Fitur (klik tiap baris untuk detail)<span class="line"></span></div>
    <div class="panel" style="flex-direction:column;align-items:stretch;margin-bottom:16px;">
      ${ABOUT_TAB_GUIDE.map(tabRow).join("")}
    </div>

    <div class="filter-section-title">ðŸ”Œ Sumber Data &amp; Integrasi<span class="line"></span></div>
    <div class="panel" style="flex-direction:column;align-items:stretch;">
      ${ABOUT_INTEGRATION_GUIDE.map(g=>row(g.title,g.tone,g.desc)).join("")}
    </div>
  `;
}

// ==========================================
// BROKER SUMMARY
//
// Menyimpan & menampilkan top 5 broker buy / top 5 broker sell per
// saham per tanggal. Sumber data: diketik manual atau ditempel dari
// CSV oleh pengguna, berdasarkan screenshot akun Stockbit MEREKA
// SENDIRI â€” bukan hasil scraping otomatis dari Stockbit. Disimpan ke
// tabel `broker_summary` di Supabase yang sama dengan tabel lain.
// ==========================================

// Status Normal/Akumulasi/Distribusi â€” dihitung dari SELISIH total
// value top 5 broker buy vs top 5 broker sell yang tersimpan (bukan
// dari total transaksi harian saham, karena kita hanya punya data top
// 5). Ambang batas 15% net dari total (buy+sell) dipilih supaya
// selisih kecil/wajar tetap dianggap "Normal" â€” sesuaikan angka
// BS_STATUS_THRESHOLD_PCT di bawah kalau mau lebih sensitif/longgar.
const BS_STATUS_THRESHOLD_PCT = 15;

function computeBsStatus(rows){
  const buyTotal = rows.filter(r=>r.side==="buy").reduce((a,r)=>a+(Number(r.value_idr)||0),0);
  const sellTotal = rows.filter(r=>r.side==="sell").reduce((a,r)=>a+(Number(r.value_idr)||0),0);
  const total = buyTotal + sellTotal;
  if(total <= 0) return { label:"-", tone:"muted", netPct:0, buyTotal, sellTotal, hasData:false };
  const netPct = ((buyTotal - sellTotal) / total) * 100;
  let label, tone;
  if(netPct >= BS_STATUS_THRESHOLD_PCT){ label = "Akumulasi"; tone = "up"; }
  else if(netPct <= -BS_STATUS_THRESHOLD_PCT){ label = "Distribusi"; tone = "down"; }
  else { label = "Normal"; tone = "gold"; }
  return { label, tone, netPct, buyTotal, sellTotal, hasData:true };
}

function bsStatusRowHtml(rows){
  const st = computeBsStatus(rows);
  if(!st.hasData) return "";
  const sign = st.netPct >= 0 ? "+" : "";
  return `
    <div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:-4px 0 14px;">
      <span style="font-size:12.5px;color:var(--muted);">Status:</span>
      ${pillHtml(st.label, st.tone)}
      <span class="mono" style="font-size:11.5px;color:var(--muted);">
        Net ${sign}${st.netPct.toFixed(1)}% &middot; Buy ${fmtNum(st.buyTotal)} vs Sell ${fmtNum(st.sellTotal)}
      </span>
    </div>`;
}

function emptyBsRow(side, rank){ return { side, rank, broker_code:"", lot:"", value_idr:"" }; }

function renderBrokerSummary(){
  // Default Periode Dariâ€“Sampai (dipakai kalau user belum pernah mengubahnya) â€”
  // meniru default lama "10 hari bursa terakhir" supaya perilaku awal tetap sama.
  if(!state.bsAutoBulkFrom || !state.bsAutoBulkTo){
    const defaultDates = tradingDaysBack(state.bsAutoBulkDays || 10);
    state.bsAutoBulkFrom = defaultDates[0];
    state.bsAutoBulkTo = defaultDates[defaultDates.length - 1];
  }
  const editRows = state.bsEditRows && state.bsEditRows.length ? state.bsEditRows : [];
  const buyEdit = [0,1,2,3,4].map(i => editRows.find(r=>r.side==="buy" && r.rank===i+1) || emptyBsRow("buy", i+1));
  const sellEdit = [0,1,2,3,4].map(i => editRows.find(r=>r.side==="sell" && r.rank===i+1) || emptyBsRow("sell", i+1));

  const editRowsHtml = (rows, label) => rows.map((r,i)=>`
    <div class="bs-row">
      <input class="bs-cell" id="bs${label}Broker${i}" placeholder="Kode" maxlength="6" style="text-transform:uppercase" value="${escapeHtml(r.broker_code||"")}">
      <input class="bs-cell" id="bs${label}Lot${i}" type="number" placeholder="Lot" value="${r.lot ?? ""}">
      <input class="bs-cell" id="bs${label}Value${i}" type="number" placeholder="Nilai (Rp)" value="${r.value_idr ?? ""}">
    </div>`).join("");

  const dRows = state.bsRows || [];
  const dBuy = dRows.filter(r=>r.side==="buy").sort((a,b)=>a.rank-b.rank);
  const dSell = dRows.filter(r=>r.side==="sell").sort((a,b)=>a.rank-b.rank);
  const maxVal = Math.max(1, ...dRows.map(r=> Number(r.value_idr)||0));
  const barHtml = (r, cls) => `
    <div class="bs-bar-row">
      <span class="bs-bar-broker mono">${escapeHtml(r.broker_code)}</span>
      <div class="bs-bar-track"><div class="bs-bar-fill ${cls}" style="width:${(Number(r.value_idr)/maxVal)*100}%"></div></div>
      <span class="bs-bar-value mono">${fmtNum(r.value_idr)}</span>
    </div>`;

  return `
    <div class="bs-wrap">
      <div class="bs-toolbar">
        <input id="bsStockCode" class="bs-input" placeholder="Kode saham (mis. BBCA)" maxlength="6" style="text-transform:uppercase" value="${escapeHtml(state.bsStockCode||"")}">
        <input id="bsDate" class="bs-input" type="date" value="${state.bsDate||""}">
        <button class="btn btn-outline" id="bsLoadBtn" ${state.bsLoading?"disabled":""}>${state.bsLoading?"Memuat...":"Muat Data"}</button>
      </div>

      ${state.bsMsg ? `<div class="bs-msg ${state.bsMsgError?"bs-msg-error":"bs-msg-ok"}">${escapeHtml(state.bsMsg)}</div>` : ""}

      <div style="margin:14px 0; padding:12px; border:1px solid rgba(239,68,68,0.25); border-radius:10px; background:rgba(239,68,68,0.06);">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <div style="font-size:12px; color:var(--muted); max-width:560px; line-height:1.5;">
            ðŸ”´ Tarik otomatis Top 5 Buy/Sell dari Stockbit untuk
            <b>${state.selectedForBacktest.size} saham yang dicentang</b> di tab ðŸ“‹ Screener,
            untuk hari bursa dari <b>${escapeHtml(fmtDateID(state.bsAutoBulkFrom))}</b> sampai
            <b>${escapeHtml(fmtDateID(state.bsAutoBulkTo))}</b> (Senin&ndash;Jumat, libur bursa nasional otomatis dilewati).
            Hari yang datanya sudah ada di database otomatis dilewati (skip) â€” hanya hari yang belum ada
            dan hari bursa paling baru yang benar-benar ditarik ulang ke Stockbit.
            Butuh "Endpoint Broker Summary" &amp; Token terisi di âš™ï¸ Pengaturan. Hasil otomatis disimpan
            langsung ke database yang sama seperti input manual di bawah.
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <label style="font-size:11.5px; color:var(--muted); display:flex; align-items:center; gap:6px; white-space:nowrap;">
              Dari
              <input type="date" id="bsAutoBulkFromInput"
                value="${state.bsAutoBulkFrom||""}"
                ${state.stockbitBrokerBulkLoading ? "disabled" : ""}
                style="padding:6px 8px; border-radius:8px; border:1px solid var(--border); background:var(--bg2,#0f1420); color:var(--text,#fff); font-size:12px;">
            </label>
            <label style="font-size:11.5px; color:var(--muted); display:flex; align-items:center; gap:6px; white-space:nowrap;">
              Sampai
              <input type="date" id="bsAutoBulkToInput"
                value="${state.bsAutoBulkTo||""}"
                ${state.stockbitBrokerBulkLoading ? "disabled" : ""}
                style="padding:6px 8px; border-radius:8px; border:1px solid var(--border); background:var(--bg2,#0f1420); color:var(--text,#fff); font-size:12px;">
            </label>
            <button type="button" class="btn btn-outline" id="bsAutoBulkBtn"
              ${state.stockbitBrokerBulkLoading || state.selectedForBacktest.size===0 ? "disabled" : ""}
              style="color:#f87171;border-color:rgba(239,68,68,0.4);white-space:nowrap;"
              title="${state.selectedForBacktest.size===0 ? 'Centang minimal 1 saham di tab Screener dulu' : ''}">
              ${state.stockbitBrokerBulkLoading
                ? `Menarik ${state.stockbitBrokerBulkProgress?.done||0}/${state.stockbitBrokerBulkProgress?.total||0}...`
                : `Tarik Otomatis (${state.selectedForBacktest.size} dicentang)`}
            </button>
          </div>
        </div>
        ${state.stockbitBrokerBulkResults && state.stockbitBrokerBulkResults.length ? `
          <details class="bs-bulk-results-panel" id="bsBulkResultsPanel" ${state.bsBulkResultsOpen?"open":""} style="margin-top:10px;">
            <summary style="cursor:pointer; font-size:11.5px; color:var(--muted); list-style:none; display:flex; align-items:center; gap:6px; user-select:none;">
              <span class="bs-bulk-results-arrow" style="display:inline-block; transition:transform .15s; transform:rotate(${state.bsBulkResultsOpen?90:0}deg);">â–¶</span>
              Hasil (${state.stockbitBrokerBulkResults.length} saham)
            </summary>
            <div class="mono" style="margin-top:8px; max-height:220px; overflow-y:auto; font-size:11.5px;">
              ${state.stockbitBrokerBulkResults.map(r => `
                <div style="padding:4px 0; border-bottom:1px solid var(--border); color:${r.ok ? 'var(--up)' : 'var(--down)'};">
                  ${r.ok ? 'âœ…' : 'âŒ'} ${escapeHtml(r.ticker)} &middot; ${escapeHtml(r.date)} â€” ${escapeHtml(r.msg||"")}
                </div>`).join("")}
            </div>
          </details>` : ""}
      </div>

      ${bsStatusRowHtml(dRows)}

      <div class="bs-display-grid">
        <div>
          <div class="bs-col-title bs-buy">Top 5 Buy</div>
          ${dBuy.length ? dBuy.map(r=>barHtml(r,"bs-fill-buy")).join("") : `<div class="empty-box" style="padding:16px;font-size:12px;">Belum ada data untuk saham/tanggal ini.</div>`}
        </div>
        <div>
          <div class="bs-col-title bs-sell">Top 5 Sell</div>
          ${dSell.length ? dSell.map(r=>barHtml(r,"bs-fill-sell")).join("") : `<div class="empty-box" style="padding:16px;font-size:12px;">Belum ada data untuk saham/tanggal ini.</div>`}
        </div>
      </div>

      <details class="bs-editor-panel" id="bsEditorPanel" ${state.bsEditorOpen?"open":""}>
        <summary>âœï¸ Input / Edit Manual (dari screenshot Stockbit Anda)</summary>
        <div class="bs-editor-grid">
          <div>
            <div class="bs-col-title bs-buy">Top 5 Buy</div>
            <div class="bs-header-row"><span>Broker</span><span>Lot</span><span>Nilai (Rp)</span></div>
            ${editRowsHtml(buyEdit,"Buy")}
          </div>
          <div>
            <div class="bs-col-title bs-sell">Top 5 Sell</div>
            <div class="bs-header-row"><span>Broker</span><span>Lot</span><span>Nilai (Rp)</span></div>
            ${editRowsHtml(sellEdit,"Sell")}
          </div>
        </div>
        <div class="bs-toolbar" style="margin-top:12px;">
          <button class="btn btn-primary" id="bsSaveBtn">Simpan ke Database</button>
        </div>
        <div class="bs-csv-panel">
          <label>Atau tempel CSV (format per baris: side,rank,broker_code,lot,value_idr)</label>
          <textarea id="bsCsvInput" rows="6" placeholder="buy,1,YP,1200000,45000000000">${escapeHtml(state.bsCsvText||"")}</textarea>
          <button class="btn btn-outline" id="bsCsvFillBtn">Isi ke Form dari CSV</button>
        </div>
      </details>
    </div>`;
}

async function loadBrokerSummary(){
  const codeEl = document.getElementById("bsStockCode");
  const dateEl = document.getElementById("bsDate");
  const code = (codeEl?.value||"").trim().toUpperCase();
  const date = dateEl?.value||"";
  state.bsStockCode = code; state.bsDate = date;
  if(!code || !date){ state.bsMsg = "Isi kode saham dan tanggal dulu."; state.bsMsgError = true; render(); return; }
  if(!SUPABASE_URL || !SUPABASE_KEY){ openSettings(); return; }

  state.bsLoading = true; state.bsMsg = ""; render();
  try {
    const qs = new URLSearchParams({ stock_code: `eq.${code}`, trade_date: `eq.${date}`, order: "side.asc,rank.asc" });
    const res = await fetch(`${SUPABASE_URL}/broker_summary?${qs}`, { headers: getSupaHeaders(), cache: "no-store" });
    if(!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const rows = await res.json();
    state.bsRows = rows;
    state.bsEditRows = rows.map(r=>({ side:r.side, rank:r.rank, broker_code:r.broker_code, lot:r.lot, value_idr:r.value_idr }));
    state.bsMsg = rows.length ? `Menampilkan ${rows.length} baris.` : "Belum ada data untuk saham/tanggal ini.";
    state.bsMsgError = false;
  } catch(e) {
    state.bsMsg = "Gagal memuat: " + e.message;
    state.bsMsgError = true;
  }
  state.bsLoading = false;
  render();
}

function readBsEditorRows(side, code, date){
  const label = side === "buy" ? "Buy" : "Sell";
  const rows = [];
  for(let i=0;i<5;i++){
    const brokerEl = document.getElementById(`bs${label}Broker${i}`);
    const lotEl = document.getElementById(`bs${label}Lot${i}`);
    const valEl = document.getElementById(`bs${label}Value${i}`);
    const broker_code = (brokerEl?.value||"").trim().toUpperCase();
    const value_idr = valEl?.value;
    if(!broker_code || !value_idr) continue; // lewati baris kosong
    rows.push({
      stock_code: code, trade_date: date, side, rank: i+1,
      broker_code, lot: lotEl?.value ? Number(lotEl.value) : null,
      value_idr: Number(value_idr)
    });
  }
  return rows;
}

async function saveBrokerSummaryRows(){
  const code = state.bsStockCode || (document.getElementById("bsStockCode")?.value||"").trim().toUpperCase();
  const date = state.bsDate || document.getElementById("bsDate")?.value;
  if(!code || !date){ state.bsMsg = "Isi kode saham dan tanggal dulu."; state.bsMsgError = true; render(); return; }
  if(!SUPABASE_URL || !SUPABASE_KEY){ openSettings(); return; }

  const rows = [...readBsEditorRows("buy", code, date), ...readBsEditorRows("sell", code, date)];
  if(!rows.length){ state.bsMsg = "Belum ada baris terisi."; state.bsMsgError = true; render(); return; }

  try {
    await supaFetch(`${SUPABASE_URL}/broker_summary?on_conflict=stock_code,trade_date,side,rank`, {
      method: "POST",
      headers: { ...getSupaHeaders(), "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(rows)
    });
    state.bsMsg = `Tersimpan ${rows.length} baris.`;
    state.bsMsgError = false;
    state.bsEditorOpen = true;
    render();
    loadBrokerSummary();
  } catch(e) {
    state.bsMsg = "Gagal menyimpan: " + e.message;
    state.bsMsgError = true;
    render();
  }
}

function fillBsFromCsv(){
  const textEl = document.getElementById("bsCsvInput");
  const text = textEl?.value || "";
  state.bsCsvText = text;
  try {
    const lines = text.trim().split("\n").filter(Boolean);
    const rows = lines.map(line=>{
      const [side, rank, broker_code, lot, value_idr] = line.split(",").map(s=>s.trim());
      if(side!=="buy" && side!=="sell") throw new Error(`side harus 'buy'/'sell', dapat: "${side}"`);
      return {
        side, rank: Number(rank),
        broker_code: (broker_code||"").toUpperCase(),
        lot: lot ? Number(lot) : null,
        value_idr: Number(value_idr)
      };
    });
    state.bsEditRows = rows;
    state.bsEditorOpen = true;
    state.bsMsg = "CSV berhasil dibaca ke form. Cek lagi lalu klik Simpan.";
    state.bsMsgError = false;
  } catch(e) {
    state.bsMsg = "Format CSV tidak valid: " + e.message;
    state.bsMsgError = true;
  }
  render();
}

// ==========================================
// TARGET BANDAR â€” dibangun di atas tabel broker_summary yang sudah ada.
//
// PENTING (baca ini dulu): formula di bawah adalah HEURISTIK yang kami
// rancang sendiri berdasarkan data yang tersedia di app ini (Avg Bandar
// dari broker_summary + ATR14 dari stocks_screener + histori close dari
// flows). ITU BUKAN replikasi rumus rahasia aplikasi Adimology (kami
// tidak pernah melihat source code perhitungan mereka) dan BUKAN
// jaminan harga akan benar-benar tercapai â€” anggap sebagai alat bantu,
// bukan rekomendasi investasi. Semua konstanta (ATR_MULT_R1,
// ATR_MULT_MAX, dst) sengaja dijadikan variabel supaya gampang
// disesuaikan sendiri.
// ==========================================

const TB_ATR_MULT_R1 = 1;    // Target R1 = Avg Bandar + 1x ATR14
const TB_ATR_MULT_MAX = 2;   // Target Max = Avg Bandar + 2x ATR14
const TB_ATR_FALLBACK_PCT = 0.03; // kalau ATR14 kosong, pakai 3% dari Avg Bandar (selaras dg fallback SL di detail modal)
const TB_HIT_HORIZON_DAYS = 20;   // batas hari bursa untuk menilai "belum tercapai" vs "masih berjalan"

// Kelompokkan baris broker_summary (buy+sell, beberapa tanggal) per kode
// broker, lalu klasifikasikan relatif terhadap broker LAIN di jendela
// waktu & saham yang sama (bukan angka Rupiah absolut â€” skala transaksi
// saham blue-chip vs saham kecil bisa beda jauh).
function aggregateTopBandar(rows){
  const byBroker = {};
  rows.forEach(r=>{
    const code = (r.broker_code||"").trim();
    if(!code) return;
    if(!byBroker[code]) byBroker[code] = { broker_code: code, buyValue:0, sellValue:0, days: new Set() };
    const val = Number(r.value_idr)||0;
    if(r.side === "buy") byBroker[code].buyValue += val;
    else if(r.side === "sell") byBroker[code].sellValue += val;
    byBroker[code].days.add(r.trade_date);
  });

  const totalWindowDays = new Set(rows.map(r=>r.trade_date)).size || 1;

  const list = Object.values(byBroker).map(b=>{
    const netValue = b.buyValue - b.sellValue;
    const totalValue = b.buyValue + b.sellValue;
    const daysAppeared = b.days.size;
    return {
      broker_code: b.broker_code, buyValue: b.buyValue, sellValue: b.sellValue,
      netValue, totalValue, daysAppeared,
      avgPerAppearance: daysAppeared ? totalValue/daysAppeared : 0
    };
  });

  const sortedAvg = list.map(b=>b.avgPerAppearance).sort((a,b)=>a-b);
  const pctile = (p) => sortedAvg.length ? sortedAvg[Math.min(sortedAvg.length-1, Math.floor(p*sortedAvg.length))] : 0;
  const p80 = pctile(0.8), p40 = pctile(0.4);

  list.forEach(b=>{
    const freqRatio = b.daysAppeared / totalWindowDays;
    const consistentDirection = b.totalValue > 0 && (Math.abs(b.netValue)/b.totalValue) >= 0.6;
    if(b.avgPerAppearance > 0 && b.avgPerAppearance >= p80){
      b.type = "Whale"; b.typeIcon = "ðŸ‹"; b.typeTone = "gold";
    } else if(freqRatio >= 0.5 && consistentDirection){
      b.type = "Smart Money"; b.typeIcon = "ðŸ§ "; b.typeTone = "up";
    } else if(b.avgPerAppearance <= p40){
      b.type = "Ritel"; b.typeIcon = "ðŸ£"; b.typeTone = "muted";
    } else {
      b.type = "Mix"; b.typeIcon = "âž–"; b.typeTone = "teal";
    }
  });

  list.sort((a,b)=> Math.abs(b.netValue) - Math.abs(a.netValue));
  return { top5: list.slice(0,5), totalWindowDays };
}

// Avg Bandar = harga beli rata-rata tertimbang dari Top 5 Buy pada
// tanggal PALING BARU yang ada datanya di jendela waktu (bukan
// dirata-rata lintas banyak tanggal, supaya mencerminkan akumulasi
// terkini). Baris tanpa "lot" terisi dilewati karena tidak bisa
// dikonversi ke harga per lembar.
function computeAvgBandarBuyPrice(rows){
  if(!rows.length) return null;
  const latestDate = rows.reduce((max,r)=> r.trade_date > max ? r.trade_date : max, rows[0].trade_date);
  const buyRows = rows.filter(r=> r.side==="buy" && r.trade_date===latestDate && Number(r.lot)>0);
  const totalValue = buyRows.reduce((a,r)=>a+(Number(r.value_idr)||0), 0);
  const totalShares = buyRows.reduce((a,r)=>a+(Number(r.lot)||0)*100, 0); // 1 lot = 100 lembar
  if(!totalShares) return null;
  return { avgPrice: totalValue/totalShares, latestDate, buyRowsCount: buyRows.length };
}

function computeTargetLevels(avgBandarPrice, atr14){
  const hasAtr = atr14 !== null && atr14 !== undefined && atr14 > 0;
  const atr = hasAtr ? atr14 : avgBandarPrice * TB_ATR_FALLBACK_PCT;
  return {
    r1: avgBandarPrice + atr * TB_ATR_MULT_R1,
    max: avgBandarPrice + atr * TB_ATR_MULT_MAX,
    atrUsed: atr,
    atrIsFallback: !hasAtr
  };
}

async function loadTargetWindow(){
  const codeEl = document.getElementById("tbStockCode");
  const winEl = document.getElementById("tbWindowDays");
  const code = (codeEl?.value || state.targetStockCode || "").trim().toUpperCase();
  const windowDays = Number(winEl?.value || state.targetWindowDays || 20) || 20;
  state.targetStockCode = code; state.targetWindowDays = windowDays;
  if(!code){ state.targetMsg = "Isi kode saham dulu."; state.targetMsgError = true; render(); return; }
  if(!SUPABASE_URL || !SUPABASE_KEY){ openSettings(); return; }

  state.targetLoading = true; state.targetMsg = ""; render();
  try{
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - windowDays);
    const cutoffStr = toLocalISODate(cutoff);
    const qs = new URLSearchParams({
      stock_code: `eq.${code}`, trade_date: `gte.${cutoffStr}`,
      order: "trade_date.asc,side.asc,rank.asc"
    });
    const res = await fetch(`${SUPABASE_URL}/broker_summary?${qs}`, { headers: getSupaHeaders(), cache: "no-store" });
    if(!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const rows = await res.json();
    if(rows.message) throw new Error(rows.message);
    state.targetBandarRows = rows;

    if(rows.length){
      const agg = aggregateTopBandar(rows);
      state.targetTopBandar = agg.top5;
      state.targetWindowActualDays = agg.totalWindowDays;

      const avgRes = computeAvgBandarBuyPrice(rows);
      state.targetAvgBandar = avgRes;

      const s = enriched().find(x=>x.ticker===code);
      state.targetCurrentPrice = s ? s.cClose : null;
      state.targetAtr14 = s ? s.atr14 : null;

      state.targetLevels = avgRes ? computeTargetLevels(avgRes.avgPrice, state.targetAtr14) : null;

      state.targetMsg = avgRes
        ? `Ditemukan ${rows.length} baris dalam ${agg.totalWindowDays} hari bursa dengan data.`
        : `Ditemukan ${rows.length} baris, tapi tidak ada baris Top Buy tanggal terbaru dengan kolom "Lot" terisi â€” Avg Bandar tidak bisa dihitung. Lengkapi Lot di tab Broker Summary.`;
      state.targetMsgError = !avgRes;
    } else {
      state.targetTopBandar = []; state.targetAvgBandar = null; state.targetLevels = null;
      state.targetMsg = "Belum ada data broker_summary untuk saham/periode ini. Isi dulu di tab ðŸ“Š Broker Summary.";
      state.targetMsgError = true;
    }
  } catch(e){
    state.targetMsg = "Gagal memuat: " + e.message;
    state.targetMsgError = true;
  }
  state.targetLoading = false;
  render();
}

async function saveTargetCalculation(){
  const code = state.targetStockCode;
  if(!code || !state.targetLevels || !state.targetAvgBandar){
    state.targetMsg = "Muat data dulu (perlu Avg Bandar & Target berhasil dihitung).";
    state.targetMsgError = true; render(); return;
  }
  if(!SUPABASE_URL || !SUPABASE_KEY){ openSettings(); return; }

  const today = todayLocalISO();
  const payload = {
    stock_code: code, calc_date: today, window_days: state.targetWindowDays,
    avg_bandar_price: state.targetAvgBandar.avgPrice,
    target_r1: state.targetLevels.r1, target_max: state.targetLevels.max,
    price_at_calc: state.targetCurrentPrice, atr14_at_calc: state.targetAtr14
  };
  try{
    await supaFetch(`${SUPABASE_URL}/target_calculations?on_conflict=stock_code,calc_date`, {
      method: "POST",
      headers: { ...getSupaHeaders(), "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload)
    });
    state.targetMsg = "Perhitungan hari ini tersimpan ke riwayat (Summary & Performance).";
    state.targetMsgError = false;
    render();
    loadTargetHistory();
  } catch(e){
    state.targetMsg = "Gagal menyimpan (jalankan dulu SQL migration 05_target_bandar.sql?): " + e.message;
    state.targetMsgError = true;
    render();
  }
}

// Muat riwayat kalkulasi + cek hit-rate terhadap histori close ASLI di
// tabel `flows`. Flows di-fetch SEKALI per ticker unik (bukan per baris
// riwayat) supaya jumlah request tetap kecil.
async function loadTargetHistory(){
  if(!SUPABASE_URL || !SUPABASE_KEY){ openSettings(); return; }
  state.targetHistoryLoading = true; render();
  try{
    const qs = new URLSearchParams({ order: "calc_date.desc" });
    if(state.targetSummaryScope === "ticker" && state.targetStockCode){
      qs.set("stock_code", `eq.${state.targetStockCode}`);
    }
    const res = await fetch(`${SUPABASE_URL}/target_calculations?${qs}`, { headers: getSupaHeaders(), cache: "no-store" });
    if(!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const rows = await res.json();
    if(rows.message) throw new Error(rows.message);

    const tickers = [...new Set(rows.map(r=>r.stock_code))];
    const flowsByTicker = {};
    await Promise.all(tickers.map(async (tk)=>{
      const minDate = rows.filter(r=>r.stock_code===tk).reduce((min,r)=> r.calc_date < min ? r.calc_date : min, rows.find(r=>r.stock_code===tk).calc_date);
      const fq = new URLSearchParams({ ticker: `eq.${tk}`, date: `gt.${minDate}`, select: "date,close", order: "date.asc" });
      const frows = await fetch(`${SUPABASE_URL}/flows?${fq}`, { headers: getSupaHeaders(), cache: "no-store" }).then(r=>r.json());
      flowsByTicker[tk] = Array.isArray(frows) ? frows : [];
    }));

    state.targetHistory = rows.map(r=>{
      const closes = (flowsByTicker[r.stock_code]||[]).filter(f=> f.date > r.calc_date && f.close != null);
      let hitR1 = null, hitMax = null, daysToR1 = null, daysToMax = null;
      closes.forEach((f,i)=>{
        if(hitR1===null && r.target_r1!=null && f.close >= r.target_r1){ hitR1 = true; daysToR1 = i+1; }
        if(hitMax===null && r.target_max!=null && f.close >= r.target_max){ hitMax = true; daysToMax = i+1; }
      });
      const elapsedDays = closes.length;
      // null = masih berjalan (belum sampai horizon & belum kena target)
      if(hitR1===null) hitR1 = elapsedDays >= TB_HIT_HORIZON_DAYS ? false : null;
      if(hitMax===null) hitMax = elapsedDays >= TB_HIT_HORIZON_DAYS ? false : null;
      return { ...r, hitR1, hitMax, daysToR1, daysToMax, elapsedDays };
    });
    state.targetMsg = `Riwayat dimuat: ${rows.length} kalkulasi.`;
    state.targetMsgError = false;
  } catch(e){
    state.targetMsg = "Gagal memuat riwayat (jalankan dulu SQL migration 05_target_bandar.sql?): " + e.message;
    state.targetMsgError = true;
  }
  state.targetHistoryLoading = false;
  render();
}

function computeTargetSummaryStats(history){
  const finishedR1 = history.filter(h=>h.hitR1 !== null);
  const finishedMax = history.filter(h=>h.hitMax !== null);
  const hitR1Count = finishedR1.filter(h=>h.hitR1).length;
  const hitMaxCount = finishedMax.filter(h=>h.hitMax).length;
  const daysR1List = history.filter(h=>h.daysToR1!=null).map(h=>h.daysToR1);
  const avgDaysR1 = daysR1List.length ? daysR1List.reduce((a,b)=>a+b,0)/daysR1List.length : null;
  return {
    total: history.length,
    hitRateR1: finishedR1.length ? (hitR1Count/finishedR1.length*100) : null,
    hitRateMax: finishedMax.length ? (hitMaxCount/finishedMax.length*100) : null,
    finishedR1Count: finishedR1.length,
    finishedMaxCount: finishedMax.length,
    avgDaysR1
  };
}

function targetStatusPill(hit){
  if(hit === true) return pillHtml("Tercapai", "up");
  if(hit === false) return pillHtml("Belum Tercapai", "down");
  return pillHtml("Berjalan", "gold");
}

function renderTargetBandar(){
  const rows = state.targetBandarRows;
  const top5 = state.targetTopBandar;
  const avgB = state.targetAvgBandar;
  const lv = state.targetLevels;
  const curPrice = state.targetCurrentPrice;

  const distPct = (target) => (curPrice && target) ? ((target - curPrice) / curPrice * 100) : null;

  const calcSection = avgB && lv ? `
    <div class="porto-summary" style="margin-bottom:8px;">
      <div class="porto-stat"><div class="lbl">Avg Bandar (Beli)</div><div class="val mono">${fmtNum(Math.round(avgB.avgPrice))}</div></div>
      <div class="porto-stat"><div class="lbl">Harga Sekarang</div><div class="val mono">${curPrice!=null?fmtNum(Math.round(curPrice)):"-"}</div></div>
      <div class="porto-stat tone-up" style="border-top-color:var(--up);"><div class="lbl">Target R1</div><div class="val mono" style="color:var(--up);">${fmtNum(Math.round(lv.r1))}${distPct(lv.r1)!=null?` <span style="font-size:11px;color:var(--muted);">(${distPct(lv.r1)>=0?"+":""}${distPct(lv.r1).toFixed(1)}%)</span>`:""}</div></div>
      <div class="porto-stat tone-gold" style="border-top-color:var(--gold);"><div class="lbl">Target Max</div><div class="val mono" style="color:var(--gold);">${fmtNum(Math.round(lv.max))}${distPct(lv.max)!=null?` <span style="font-size:11px;color:var(--muted);">(${distPct(lv.max)>=0?"+":""}${distPct(lv.max).toFixed(1)}%)</span>`:""}</div></div>
    </div>
    <div style="font-size:11.5px;color:var(--muted);margin-bottom:16px;">
      Avg Bandar dihitung tertimbang dari Top Buy tanggal <b class="mono">${avgB.latestDate}</b> (${avgB.buyRowsCount} baris broker).
      ATR14 dipakai: <span class="mono">${fmtNum(lv.atrUsed.toFixed(2))}</span>${lv.atrIsFallback?' <span style="color:var(--gold);">(fallback 3% â€” ATR14 kosong di stocks_screener)</span>':""}.
      Formula: R1 = Avg Bandar + ${TB_ATR_MULT_R1}Ã—ATR14, Max = Avg Bandar + ${TB_ATR_MULT_MAX}Ã—ATR14 â€” silakan disesuaikan (konstanta TB_ATR_MULT_* di app.js) sesuai gaya trading Anda.
    </div>
    <button class="btn btn-primary" id="tbSaveCalcBtn">ðŸ’¾ Simpan Perhitungan Hari Ini ke Riwayat</button>
  ` : `<div class="empty-box" style="padding:16px;font-size:12px;">Muat data dulu di atas untuk melihat Avg Bandar & Target.</div>`;

  const maxNet = Math.max(1, ...top5.map(b=>Math.abs(b.netValue)));
  const top5Html = top5.length ? `
    <div class="table-wrap">
      <table class="mono">
        <thead><tr><th>Broker</th><th>Muncul</th><th>Net Value</th><th>Avg/Muncul</th><th>Tipe</th></tr></thead>
        <tbody>
          ${top5.map(b=>`
            <tr>
              <td>${escapeHtml(b.broker_code)}</td>
              <td>${b.daysAppeared}/${state.targetWindowActualDays} hari</td>
              <td style="color:${b.netValue>=0?'var(--up)':'var(--down)'};">${b.netValue>=0?'+':''}${fmtNum(Math.round(b.netValue))}</td>
              <td>${fmtNum(Math.round(b.avgPerAppearance))}</td>
              <td>${pillHtml(b.typeIcon+" "+b.type, b.typeTone)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>` : `<div class="empty-box" style="padding:16px;font-size:12px;">Belum ada data untuk dianalisis.</div>`;

  const history = state.targetHistory;
  const stats = computeTargetSummaryStats(history);
  const summaryStatsHtml = `
    <div class="porto-summary">
      <div class="porto-stat"><div class="lbl">Total Kalkulasi</div><div class="val mono">${stats.total}</div></div>
      <div class="porto-stat tone-up" style="border-top-color:var(--up);"><div class="lbl">Hit Rate R1</div><div class="val mono">${stats.hitRateR1!=null?stats.hitRateR1.toFixed(0)+"%":"-"}</div></div>
      <div class="porto-stat tone-gold" style="border-top-color:var(--gold);"><div class="lbl">Hit Rate Max</div><div class="val mono">${stats.hitRateMax!=null?stats.hitRateMax.toFixed(0)+"%":"-"}</div></div>
      <div class="porto-stat"><div class="lbl">RataÂ² Hari ke R1</div><div class="val mono">${stats.avgDaysR1!=null?stats.avgDaysR1.toFixed(1):"-"}</div></div>
    </div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:16px;">
      Hit Rate hanya dihitung dari kalkulasi yang sudah lewat ${TB_HIT_HORIZON_DAYS} hari bursa sejak tanggal kalkulasi (atau sudah kena target lebih cepat) â€” kalkulasi yang masih baru berstatus "Berjalan" dan belum masuk hitungan.
    </div>`;

  const historyRowsHtml = history.length ? `
    <div class="table-wrap">
      <table class="mono">
        <thead><tr><th>Tgl Kalkulasi</th><th>Emiten</th><th>Avg Bandar</th><th>R1</th><th>Max</th><th>Status R1</th><th>Status Max</th></tr></thead>
        <tbody>
          ${history.map(h=>`
            <tr>
              <td>${escapeHtml(h.calc_date)}</td>
              <td>${escapeHtml(h.stock_code)}</td>
              <td>${fmtNum(Math.round(h.avg_bandar_price))}</td>
              <td>${fmtNum(Math.round(h.target_r1))}</td>
              <td>${fmtNum(Math.round(h.target_max))}</td>
              <td>${targetStatusPill(h.hitR1)}${h.daysToR1!=null?` <span style="font-size:10.5px;color:var(--muted);">(H+${h.daysToR1})</span>`:""}</td>
              <td>${targetStatusPill(h.hitMax)}${h.daysToMax!=null?` <span style="font-size:10.5px;color:var(--muted);">(H+${h.daysToMax})</span>`:""}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>` : `<div class="empty-box" style="padding:16px;font-size:12px;">Belum ada riwayat. Simpan perhitungan dari Kalkulator di atas dulu.</div>`;

  return `
    <div class="panel">
      <div class="filter-section-title">ðŸŽ¯ Target Bandar<span class="line"></span></div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:14px;">
        Dibangun dari data ðŸ“Š Broker Summary yang sudah Anda isi. Bukan data resmi otomatis dari Stockbit â€” dan Target R1/Max adalah heuristik, bukan jaminan.
      </div>
      <div class="bs-toolbar">
        <input id="tbStockCode" class="bs-input" placeholder="Kode saham (mis. BBCA)" maxlength="6" style="text-transform:uppercase" value="${escapeHtml(state.targetStockCode||"")}">
        <input id="tbWindowDays" class="bs-input" type="number" min="5" max="120" placeholder="Hari" value="${state.targetWindowDays}" style="max-width:100px;">
        <button class="btn btn-outline" id="tbLoadBtn" ${state.targetLoading?"disabled":""}>${state.targetLoading?"Memuat...":"Muat Data"}</button>
      </div>
      ${state.targetMsg ? `<div class="bs-msg ${state.targetMsgError?"bs-msg-error":"bs-msg-ok"}">${escapeHtml(state.targetMsg)}</div>` : ""}
    </div>

    <div class="panel">
      <div class="filter-section-title">ðŸ‹ Top 5 Bandar (${state.targetWindowActualDays || state.targetWindowDays} hari terakhir)<span class="line"></span></div>
      ${top5Html}
    </div>

    <div class="panel">
      <div class="filter-section-title">ðŸ§® Kalkulator Target Harga<span class="line"></span></div>
      ${calcSection}
    </div>

    <div class="panel">
      <div class="filter-section-title">ðŸ“ˆ Summary & Performance<span class="line"></span></div>
      <div class="bs-toolbar" style="margin-bottom:14px;">
        <select id="tbScopeSelect" style="background:rgba(0,0,0,0.2);border:1px solid var(--border);color:var(--text);font-size:13px;border-radius:8px;padding:9.5px 12px;">
          <option value="ticker" ${state.targetSummaryScope==="ticker"?"selected":""}>Emiten ini (${escapeHtml(state.targetStockCode||"-")})</option>
          <option value="all" ${state.targetSummaryScope==="all"?"selected":""}>Semua Emiten</option>
        </select>
        <button class="btn btn-outline" id="tbHistoryBtn" ${state.targetHistoryLoading?"disabled":""}>${state.targetHistoryLoading?"Memuat...":"ðŸ”„ Muat Riwayat & Hit Rate"}</button>
      </div>
      ${summaryStatsHtml}
      ${historyRowsHtml}
    </div>
  `;
}

// ==========================================================================
// ENTRY PRICE SCANNER â€” "broker trap" scanner lintas SEMUA saham sekaligus.
//
// Konsep (mengikuti pola ihsgscreener.com): setiap broker punya harga
// rata-rata beli (VWAP Buy) = total nilai beli Ã· total volume beli, dalam
// suatu jendela waktu. Kalau harga sekarang di BAWAH VWAP Buy itu, broker
// tsb sedang rugi ("NYANGKUT") â€” orang yang rugi cenderung menahan/menambah,
// bukan jual murah, jadi level itu jadi support psikologis. Kalau harga
// sudah jauh DI ATAS VWAP mereka, mereka sudah untung dan rawan ambil
// untung, jadi level itu dilewati sebagai area entry.
//
// SUMBER DATA: tabel `broker_summary` yang SAMA dengan tab ðŸ“Š Broker
// Summary / ðŸŽ¯ Target Bandar (top 5 broker beli & jual per hari, per
// saham) â€” BUKAN endpoint baru. Konsekuensinya: hasil scan ini HANYA
// SEBAGUS data broker_summary yang sudah terisi. Kalau broker_summary
// kosong/jarang diisi untuk banyak saham, "Hasil Scan" akan kosong/sedikit
// juga â€” ini bukan bug, tapi keterbatasan data sumber (top-5 broker/hari,
// bukan seluruh transaksi pasar).
//
// KLASIFIKASI ASING/LOKAL: TIDAK ADA API publik resmi untuk ini, jadi
// dipakai daftar statis best-effort EPS_FOREIGN_BROKER_CODES di bawah
// (sama semangatnya dengan SYARIAH_TICKERS di atas file ini â€” silakan
// diperbaiki sendiri kalau ada kode yang salah/kurang). Kode yang TIDAK
// ada di daftar itu default dianggap "Lokal".
//
// SEMUA formula (Gap%, Konvergensi, Tanjakan 10H, Mutu, Score) di bawah
// adalah HEURISTIK YANG KAMI RANCANG SENDIRI dari data yang tersedia â€”
// BUKAN replikasi rumus rahasia ihsgscreener.com (kami tidak pernah
// melihat source code mereka) dan BUKAN jaminan/rekomendasi investasi.
// Semua konstanta sengaja dijadikan variabel (EPS_* di bawah) supaya
// gampang disesuaikan.
// ==========================================================================

const EPS_AREA_PCT = 3;        // Â±X% dari VWAP = dianggap "DI AREA"
const EPS_TANJAKAN_WINDOW = 10; // jumlah hari bursa untuk "Tanjakan 10H"
const EPS_MIN_PRICE = 80;       // saham di bawah harga ini diblokir (saham gorengan receh)
const EPS_EXCLUDED_SECTOR_KEYWORDS = ["propert", "real estate"]; // dicocokkan case-insensitive, substring

// Daftar kode broker yang UMUM dianggap sekuritas asing/JV asing oleh
// komunitas bandarmologi (BELUM diverifikasi resmi ke daftar anggota
// bursa IDX terbaru â€” cek ulang sebelum dipakai serius). Kode lain di
// luar daftar ini dianggap "Lokal" secara default.
const EPS_FOREIGN_BROKER_CODES = new Set([
  "AK","BK","CS","DB","KZ","MS","RX","BW","GW","AG","XA","ZP","YU","RS","OD","IF"
]);
function epsBrokerType(brokerCode){
  return EPS_FOREIGN_BROKER_CODES.has(String(brokerCode||"").trim().toUpperCase()) ? "asing" : "lokal";
}

function epsIsExcludedSector(sektor){
  const s = String(sektor||"").toLowerCase();
  return EPS_EXCLUDED_SECTOR_KEYWORDS.some(kw => s.includes(kw));
}

// Ambil ISO date N hari bursa (Senin-Jumat) ke belakang dari hari ini â€”
// dipakai sebagai cutoff query supaya jendela 1 bulan (20 hari bursa)
// tidak perlu narik seluruh histori broker_summary yang mungkin sudah
// bertahun-tahun.
function epsCutoffDate(tradingDaysBackN){
  const calendarDaysBack = Math.ceil(tradingDaysBackN * 7/5) + 10; // buffer libur bursa
  const d = new Date();
  d.setDate(d.getDate() - calendarDaysBack);
  return toLocalISODate(d);
}

// ==========================================================================
// LANGKAH 1 â€” tarik SEMUA baris broker_summary (semua saham) dalam jendela
// ~1 bulan bursa, lalu susun jadi struktur harian per saham per tipe
// broker (asing/lokal). Ini query BERAT (bisa ratusan ribu baris kalau
// broker_summary sudah terisi rutin untuk banyak saham) â€” makanya scan
// ini TIDAK jalan otomatis, harus ditekan manual lewat tombol "ðŸ”„ Scan
// Sekarang", dan hasilnya di-cache (localStorage + tabel Supabase
// eps_scan_cache kalau migrasinya sudah dijalankan) supaya sesi
// berikutnya tidak perlu scan ulang.
// ==========================================================================
async function runEntryPriceScan(){
  if(!SUPABASE_URL || !SUPABASE_KEY){ openSettings(); return; }
  state.epsScanning = true; state.epsMsg = "Menarik data broker_summary untuk semua saham..."; state.epsMsgError = false; render();

  try{
    const cutoff = epsCutoffDate(EPS_TANJAKAN_WINDOW * 2); // ambil 2x jendela terpanjang biar aman utk 1 bulan (20 hari bursa)
    const qs = new URLSearchParams({
      trade_date: `gte.${cutoff}`,
      select: "stock_code,trade_date,side,broker_code,lot,value_idr",
      order: "trade_date.asc"
    });
    const res = await fetch(`${SUPABASE_URL}/broker_summary?${qs}`, { headers: getSupaHeaders(), cache: "no-store" });
    if(!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const rows = await res.json();
    if(rows.message) throw new Error(rows.message);

    if(!rows.length){
      state.epsRaw = null;
      state.epsMsg = "Belum ada data broker_summary sama sekali. Isi dulu di tab ðŸ“Š Broker Summary untuk minimal beberapa saham.";
      state.epsMsgError = true;
      state.epsScanning = false; render(); return;
    }

    // Susun: byStock[TICKER].days[TANGGAL].asing / .lokal = {buyVal,sellVal,buyLot,sellLot,brokerNet:{kode:net}}
    const byStock = {};
    const allDatesSet = new Set();
    rows.forEach(r=>{
      const code = String(r.stock_code||"").toUpperCase();
      const date = r.trade_date;
      const type = epsBrokerType(r.broker_code);
      if(!code || !date) return;
      allDatesSet.add(date);
      if(!byStock[code]) byStock[code] = { days: {} };
      if(!byStock[code].days[date]) byStock[code].days[date] = {
        asing: { buyVal:0, sellVal:0, buyLot:0, sellLot:0, brokerNet:{} },
        lokal: { buyVal:0, sellVal:0, buyLot:0, sellLot:0, brokerNet:{} }
      };
      const bucket = byStock[code].days[date][type];
      const val = Number(r.value_idr)||0;
      const lot = Number(r.lot)||0;
      const bc = String(r.broker_code||"").trim().toUpperCase();
      if(r.side === "buy"){ bucket.buyVal += val; bucket.buyLot += lot; }
      else if(r.side === "sell"){ bucket.sellVal += val; bucket.sellLot += lot; }
      if(bc){ bucket.brokerNet[bc] = (bucket.brokerNet[bc]||0) + (r.side==="buy"?val:-val); }
    });

    // Hanya simpan EPS_TANJAKAN_WINDOW*2 hari bursa TERBARU per saham
    // (cukup untuk 1 bulan + buffer tren), supaya objek yang disimpan ke
    // localStorage tidak membengkak tanpa batas seiring waktu.
    const keepDays = EPS_TANJAKAN_WINDOW * 2;
    Object.values(byStock).forEach(stock=>{
      const dates = Object.keys(stock.days).sort();
      const drop = dates.slice(0, Math.max(0, dates.length - keepDays));
      drop.forEach(d => delete stock.days[d]);
    });

    state.epsRaw = {
      scannedAt: new Date().toISOString(),
      stockCount: Object.keys(byStock).length,
      byStock
    };
    saveEpsCache();
    state.epsMsg = `Scan selesai â€” ${Object.keys(byStock).length} saham, ${allDatesSet.size} hari bursa dengan data.`;
    state.epsMsgError = false;

    // Simpan salinan ringkas ke Supabase supaya user LAIN (kalau app ini
    // dipakai bersama) tidak perlu scan ulang â€” opsional, gagal diam-diam
    // kalau tabel `eps_scan_cache` belum dimigrasikan (lihat catatan di
    // saveEpsCache/loadEpsCacheFromServer).
    await syncEpsCacheToSupabase();
  } catch(e){
    state.epsMsg = "Gagal scan: " + e.message;
    state.epsMsgError = true;
  }
  state.epsScanning = false;
  recomputeEpsResults();
  render();
}

function saveEpsCache(){
  try{ localStorage.setItem("ihsg_eps_scan", JSON.stringify(state.epsRaw)); }catch(e){ /* localStorage penuh â€” abaikan, cache Supabase tetap dicoba */ }
}

function loadEpsCacheFromLocal(){
  try{
    const raw = localStorage.getItem("ihsg_eps_scan");
    if(raw) state.epsRaw = JSON.parse(raw);
  }catch(e){ state.epsRaw = null; }
}

// Tabel `eps_scan_cache` BELUM tentu ada di Supabase Anda â€” ini fitur
// opsional (biar hasil scan bisa dipakai bareng lintas device/user tanpa
// tiap orang scan ulang). Kalau mau aktifkan, jalankan migrasi:
//   CREATE TABLE eps_scan_cache (
//     id text PRIMARY KEY DEFAULT 'latest',
//     scanned_at timestamptz NOT NULL,
//     payload jsonb NOT NULL
//   );
// Tanpa tabel ini, scan tetap jalan & tersimpan di localStorage browser
// ini saja â€” cuma tidak otomatis kebagi ke device/user lain.
async function syncEpsCacheToSupabase(){
  if(!state.epsRaw) return;
  try{
    await supaFetch(`${SUPABASE_URL}/eps_scan_cache?on_conflict=id`, {
      method: "POST",
      headers: { ...getSupaHeaders(), "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ id: "latest", scanned_at: state.epsRaw.scannedAt, payload: state.epsRaw })
    });
  } catch(e){
    console.warn("Gagal sinkron eps_scan_cache (tabel mungkin belum dimigrasikan):", e.message);
  }
}

async function loadEpsCacheFromServer(){
  if(!SUPABASE_URL || !SUPABASE_KEY) return false;
  try{
    const res = await fetch(`${SUPABASE_URL}/eps_scan_cache?id=eq.latest&select=scanned_at,payload`, { headers: getSupaHeaders(), cache: "no-store" });
    if(!res.ok) return false;
    const rows = await res.json();
    if(!Array.isArray(rows) || !rows.length) return false;
    const server = rows[0].payload;
    // Pakai hasil server HANYA kalau lebih baru dari cache lokal (atau
    // belum ada cache lokal sama sekali) â€” supaya scan lokal yang baru
    // saja dijalankan tidak ketimpa data server yang lebih basi.
    if(!state.epsRaw || new Date(server.scannedAt) > new Date(state.epsRaw.scannedAt)){
      state.epsRaw = server;
      saveEpsCache();
    }
    return true;
  } catch(e){ return false; }
}

async function ensureEpsDataLoaded(){
  if(state.epsRaw){ recomputeEpsResults(); return; }
  loadEpsCacheFromLocal();
  const gotServer = await loadEpsCacheFromServer();
  if(!state.epsRaw && !gotServer){
    state.epsMsg = "Belum ada hasil scan tersimpan. Klik \"ðŸ”„ Scan Sekarang\" untuk mulai (sekali scan berlaku untuk semua kombinasi filter).";
    state.epsMsgError = false;
  }
  recomputeEpsResults();
  render();
}

function clearEpsCache(){
  if(!confirm("Hapus cache hasil scan Entry Price Scanner? Anda perlu \"Scan Sekarang\" lagi setelah ini.")) return;
  state.epsRaw = null; state.epsResults = [];
  try{ localStorage.removeItem("ihsg_eps_scan"); }catch(e){}
  state.epsMsg = "Cache dihapus.";
  state.epsMsgError = false;
  render();
}

// Jumlah hari bursa yang dipakai untuk tiap opsi Periode.
const EPS_PERIODE_DAYS = { "1w": 5, "2w": 10, "1m": 20 };

// ==========================================================================
// LANGKAH 2 â€” dari epsRaw (mentah, mencakup jendela terpanjang), hitung
// SATU baris hasil per saham sesuai filter yang sedang aktif. Semua
// filter (periode, broker, konvergensi, dst) beroperasi di sini, di
// memori, TANPA fetch ulang â€” makanya instan.
// ==========================================================================
function computeEpsRowForStock(ticker, stockRaw, filters, stockMap){
  const dates = Object.keys(stockRaw.days).sort(); // ascending
  if(!dates.length) return null;
  const windowDays = EPS_PERIODE_DAYS[filters.periode] || 5;
  const periodeDates = dates.slice(-windowDays);
  if(!periodeDates.length) return null;

  const typesToInclude = filters.broker === "asing" ? ["asing"] : filters.broker === "lokal" ? ["lokal"] : ["asing","lokal"];

  // --- VWAP Buy & Net Buy kumulatif dalam periode terpilih ---
  let cumBuyVal = 0, cumBuyLot = 0, netBuyPeriode = 0;
  const brokerNetTotal = {}; // kode broker -> net value, dalam periode & tipe terpilih
  periodeDates.forEach(d=>{
    const day = stockRaw.days[d];
    typesToInclude.forEach(t=>{
      const b = day[t];
      cumBuyVal += b.buyVal; cumBuyLot += b.buyLot;
      netBuyPeriode += (b.buyVal - b.sellVal);
      Object.entries(b.brokerNet).forEach(([code,net])=>{ brokerNetTotal[code] = (brokerNetTotal[code]||0) + net; });
    });
  });
  const vwapBuy = cumBuyLot > 0 ? cumBuyVal / (cumBuyLot*100) : null;
  if(vwapBuy === null) return null; // tidak ada transaksi beli sama sekali di periode ini -> tidak bisa dinilai

  const s = stockMap.get(ticker);
  const currentPrice = s ? s.cClose : null;
  if(currentPrice == null) return null; // saham tidak ada di data live saat ini (delisted/berubah kode dsb)
  if(currentPrice < EPS_MIN_PRICE) return null;
  if(epsIsExcludedSector(s.sektor)) return null;

  const gapPct = ((currentPrice - vwapBuy) / vwapBuy) * 100;
  const areaLabel = Math.abs(gapPct) <= EPS_AREA_PCT ? "DI AREA" : (gapPct < 0 ? "NYANGKUT" : "UNTUNG");
  const areaTone = areaLabel === "NYANGKUT" ? "down" : areaLabel === "DI AREA" ? "gold" : "up";

  // --- Konvergensi: bandingkan |gap%| VWAP kumulatif hari demi hari,
  // dalam periode terpilih. "Menyatu" = mengecil, "Menjauh" = membesar,
  // "Diam" = relatif flat (dalam Â±0.5 poin persentase). Butuh min. 2 titik.
  let konvergensi = "diam", konvergensiVal = 0;
  if(periodeDates.length >= 2){
    let runBuyVal = 0, runBuyLot = 0;
    const gapSeries = [];
    periodeDates.forEach(d=>{
      const day = stockRaw.days[d];
      typesToInclude.forEach(t=>{ runBuyVal += day[t].buyVal; runBuyLot += day[t].buyLot; });
      if(runBuyLot > 0){
        const vwapAtDay = runBuyVal/(runBuyLot*100);
        gapSeries.push(Math.abs((currentPrice - vwapAtDay)/vwapAtDay*100));
      }
    });
    if(gapSeries.length >= 2){
      konvergensiVal = gapSeries[gapSeries.length-1] - gapSeries[0];
      if(konvergensiVal <= -0.5) konvergensi = "menyatu";
      else if(konvergensiVal >= 0.5) konvergensi = "menjauh";
      else konvergensi = "diam";
    }
  }
  const konvergensiIcon = konvergensi === "menyatu" ? "â‡„" : konvergensi === "menjauh" ? "â†”" : "â–¶";

  // --- Tanjakan 10H: tren net-buy kumulatif selama EPS_TANJAKAN_WINDOW
  // hari bursa TERAKHIR (independen dari filter Periode di atas â€” selalu
  // 10 hari, sesuai nama fiturnya), dibagi 2 paruh, dibandingkan.
  const tj10Dates = dates.slice(-EPS_TANJAKAN_WINDOW);
  let tanjakan = "diam", tanjakanSlope = 0, tanjakanScore = 0, tanjakanTopBroker = "-";
  if(tj10Dates.length >= 4){
    const dailyNet = tj10Dates.map(d=>{
      const day = stockRaw.days[d];
      return typesToInclude.reduce((a,t)=> a + (day[t].buyVal - day[t].sellVal), 0);
    });
    const half = Math.floor(dailyNet.length/2);
    const firstHalfAvg = dailyNet.slice(0,half).reduce((a,b)=>a+b,0) / (half||1);
    const secondHalfAvg = dailyNet.slice(half).reduce((a,b)=>a+b,0) / (dailyNet.length-half||1);
    const upDays = dailyNet.filter(v=>v>0).length;
    tanjakanScore = Math.round((upDays/dailyNet.length)*100);
    tanjakan = secondHalfAvg > firstHalfAvg ? "menanjak" : "diam";
    const scale = Math.max(1, Math.abs(firstHalfAvg));
    tanjakanSlope = (secondHalfAvg - firstHalfAvg) / scale;

    const tjBrokerNet = {};
    tj10Dates.forEach(d=>{
      const day = stockRaw.days[d];
      typesToInclude.forEach(t=> Object.entries(day[t].brokerNet).forEach(([code,net])=>{ tjBrokerNet[code]=(tjBrokerNet[code]||0)+net; }));
    });
    const tjTop = Object.entries(tjBrokerNet).sort((a,b)=>b[1]-a[1])[0];
    tanjakanTopBroker = tjTop ? tjTop[0] : "-";
  }
  const tanjakanIcon = tanjakan === "menanjak" ? "â–²" : "â–¶";

  // --- Top Broker & Tipe (dari total net value periode terpilih) ---
  const topBrokerEntry = Object.entries(brokerNetTotal).sort((a,b)=>b[1]-a[1])[0];
  const topBroker = topBrokerEntry ? topBrokerEntry[0] : "-";
  const topBrokerTipe = topBroker !== "-" ? epsBrokerType(topBroker) : "-";
  const topBrokerShare = topBrokerEntry && netBuyPeriode !== 0 ? Math.min(1, Math.abs(topBrokerEntry[1]) / Math.abs(netBuyPeriode || topBrokerEntry[1])) : 0;

  // --- Mutu (0-100): kombinasi konsistensi arah (net buy positif berapa
  // hari dari total hari yang ada data) + konsentrasi broker dominan.
  // Heuristik sendiri, BUKAN dari sumber luar â€” lihat catatan di atas.
  const daysWithBuy = periodeDates.filter(d=> typesToInclude.some(t=>stockRaw.days[d][t].buyVal>0)).length;
  const consistencyScore = periodeDates.length ? (daysWithBuy/periodeDates.length)*100 : 0;
  const concentrationScore = Math.min(100, topBrokerShare*100);
  const mutu = Math.round(consistencyScore*0.5 + concentrationScore*0.5);

  // --- Score akhir (0-100): gabungan Mutu, Tanjakan, dan kedekatan ke
  // VWAP (semakin dekat/"DI AREA" semakin bagus untuk entry). ---
  const proximityScore = Math.max(0, 100 - Math.min(100, Math.abs(gapPct) * 5));
  const score = Math.round(mutu*0.4 + tanjakanScore*0.3 + proximityScore*0.3);

  return {
    ticker, nama: s.name || "-", harga: currentPrice, sektor: s.sektor,
    vwapBuy, gapPct, areaLabel, areaTone,
    konvergensi, konvergensiIcon, konvergensiVal,
    tanjakan, tanjakanIcon, tanjakanSlope, tanjakanScore, tanjakanTopBroker,
    mutu, netBuy: netBuyPeriode, score,
    topBroker, topBrokerTipe
  };
}

function recomputeEpsResults(){
  if(!state.epsRaw){ state.epsResults = []; return; }
  const filters = state.epsFilters;
  // enriched() dibangun SEKALI di sini (bukan per-saham di dalam loop) â€”
  // dia lumayan berat (dihitung dari seluruh state.stocks), jadi kalau
  // dipanggil ulang per-ticker di dalam computeEpsRowForStock() bisa jadi
  // O(nÂ²) dan bikin filter yang harusnya instan malah lag untuk ratusan saham.
  const stockMap = new Map(enriched().map(x=>[x.ticker, x]));
  const rows = [];
  Object.entries(state.epsRaw.byStock).forEach(([ticker, stockRaw])=>{
    const row = computeEpsRowForStock(ticker, stockRaw, filters, stockMap);
    if(!row) return;
    if(filters.konvergensi !== "all" && row.konvergensi !== filters.konvergensi) return;
    if(filters.tanjakan === "menanjak" && row.tanjakan !== "menanjak") return;
    if(filters.minMutu > 0 && row.mutu < filters.minMutu) return;
    if(filters.minAkum > 0 && Math.abs(row.netBuy) < filters.minAkum) return;
    if(filters.minGap === "dekat" && Math.abs(row.gapPct) > EPS_AREA_PCT) return;
    if(filters.minGap === "nyangkut" && row.areaLabel !== "NYANGKUT") return;
    rows.push(row);
  });

  const urutKeys = [...filters.urut];
  const sorters = {
    konvergensi: (a,b) => (a.konvergensi==="menyatu"?0:a.konvergensi==="diam"?1:2) - (b.konvergensi==="menyatu"?0:b.konvergensi==="diam"?1:2) || a.konvergensiVal - b.konvergensiVal,
    tanjakan: (a,b) => (b.tanjakan==="menanjak"?1:0) - (a.tanjakan==="menanjak"?1:0) || b.tanjakanScore - a.tanjakanScore,
    mutu: (a,b) => b.mutu - a.mutu,
    terdekat: (a,b) => Math.abs(a.gapPct) - Math.abs(b.gapPct)
  };
  rows.sort((a,b)=>{
    for(const key of (urutKeys.length ? urutKeys : ["mutu"])){
      const fn = sorters[key];
      if(!fn) continue;
      const d = fn(a,b);
      if(d !== 0) return d;
    }
    return b.score - a.score;
  });

  state.epsResults = rows;
}

function toggleEpsSort(key){
  const s = state.epsFilters.urut;
  if(s.has(key)) s.delete(key); else s.add(key);
  recomputeEpsResults();
  render();
}

function setEpsFilter(key, val){
  state.epsFilters[key] = val;
  recomputeEpsResults();
  render();
}

function exportEpsToCsv(){
  const rows = state.epsResults;
  if(!rows.length) return alert("Belum ada hasil scan untuk diekspor.");
  const header = ["Kode","Nama","Harga","VWAP Buy","Gap %","Area","Konvergensi","Tanjakan 10H","Mutu","Net Buy","Score","Top Broker","Tipe"];
  const lines = [header.join(",")];
  rows.forEach(r=>{
    lines.push([
      r.ticker, `"${(r.nama||"").replace(/"/g,'""')}"`, Math.round(r.harga), Math.round(r.vwapBuy),
      r.gapPct.toFixed(2), r.areaLabel, r.konvergensi, r.tanjakan, r.mutu, Math.round(r.netBuy), r.score, r.topBroker, r.topBrokerTipe
    ].join(","));
  });
  const blob = new Blob([lines.join("\\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `EntryPriceScanner_${todayLocalISO()}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function epsSegBtn(group, key, label, active){
  return `<button type="button" class="btn ${active?'btn-primary':'btn-outline'}" data-eps-filter="${group}" data-eps-value="${key}" style="padding:8px 12px;font-size:12px;">${label}</button>`;
}
function epsSortBtn(key, label){
  const active = state.epsFilters.urut.has(key);
  return `<button type="button" class="btn ${active?'btn-primary':'btn-outline'}" data-eps-sort="${key}" style="padding:8px 12px;font-size:12px;">${label}</button>`;
}

function renderEntryPriceScanner(){
  const f = state.epsFilters;
  const raw = state.epsRaw;
  const rows = state.epsResults;

  const infoPanel = `
    <details class="panel" id="epsInfoPanel" style="flex-direction:column;align-items:stretch;" ${state.epsInfoOpen?"open":""}>
      <summary style="cursor:pointer;font-weight:700;font-size:14px;list-style:none;display:flex;justify-content:space-between;align-items:center;">
        <span>ðŸ“– Logika &amp; Cara Pakai Entry Price Scanner</span><span style="color:var(--muted);font-size:11px;">${state.epsInfoOpen?"â–² Tutup":"â–¼ Buka"}</span>
      </summary>
      <div style="margin-top:16px;display:flex;flex-direction:column;gap:16px;font-size:12.5px;line-height:1.7;color:var(--text);">
        <div>
          <div style="font-weight:700;margin-bottom:6px;">Logika di baliknya</div>
          <div style="color:var(--muted);">
            Setiap broker punya <b>harga rata-rata beli</b> (VWAP Buy) = total nilai beli Ã· total volume beli.
            Kalau harga sekarang <b>di bawah</b> rata-rata broker itu, broker tersebut sedang rugi. Orang yang rugi cenderung <i>menahan</i> atau <i>menambah</i>, bukan menjual murah.
            Sebaliknya, kalau harga sudah jauh <b>di atas</b> rata-rata mereka, mereka sudah untung dan rawan ambil untung â€” saham seperti itu dilewati.
          </div>
          <div style="margin-top:8px;"><span style="color:var(--teal);font-weight:700;">NYANGKUT</span> â€” Harga di bawah VWAP broker. Ada dorongan mempertahankan harga.</div>
          <div><span style="color:var(--teal);font-weight:700;">DI AREA</span> â€” Harga masih dalam Â±${EPS_AREA_PCT}% dari VWAP. Level ini biasanya dijaga.</div>
        </div>
        <div>
          <div style="font-weight:700;margin-bottom:6px;">Cara pakai</div>
          <div style="color:var(--muted);">
            1. Buka tab ini â€” kalau sudah pernah di-scan, hasil terakhir otomatis tampil.<br>
            2. Atur filter sesuai kebutuhan (periode, broker, konvergensi, tanjakan, min akumulasi, dst).<br>
            3. Semua filter berjalan <b>instan</b> â€” bebas diutak-atik tanpa scan ulang.
          </div>
          <div style="margin-top:8px;background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.25);border-radius:8px;padding:10px 12px;">
            Tombol <b>ðŸ”„ Scan Sekarang</b> menarik ulang seluruh data broker_summary (bisa berat kalau datanya besar) â€” sekali jalan sudah mencakup semua kombinasi filter (3 periode Ã— asing/lokal/keduanya). Tidak perlu diklik tiap ganti filter.
          </div>
        </div>
        <div>
          <div style="font-weight:700;margin-bottom:6px;">Arti tiap filter</div>
          <div style="color:var(--muted);">
            <div><b style="color:var(--text);">Periode</b> â€” Rentang data broker: 1 minggu / 2 minggu / 1 bulan (hari bursa).</div>
            <div><b style="color:var(--text);">Broker</b> â€” Asing, Lokal, atau Keduanya (klasifikasi best-effort, lihat EPS_FOREIGN_BROKER_CODES di app.js).</div>
            <div><b style="color:var(--text);">Konvergensi</b> â€” Menyatu = harga mendekati VWAP (bagus). Menjauh = harga menjauh.</div>
            <div><b style="color:var(--text);">Tanjakan 10H</b> â€” â–² Menanjak = akumulasi broker 10 hari terakhir naik terus.</div>
            <div><b style="color:var(--text);">Min Akum</b> â€” Nilai akumulasi (net buy) minimal dalam periode terpilih.</div>
            <div><b style="color:var(--text);">Min Gap</b> â€” "Terdekat VWAP" = |gap| â‰¤ ${EPS_AREA_PCT}%. "Nyangkut" = harga di bawah VWAP.</div>
            <div><b style="color:var(--text);">Urut</b> â€” Bisa digabung beberapa sekaligus, diterapkan berurutan.</div>
          </div>
          <div style="margin-top:8px;background:rgba(234,179,8,0.08);border:1px solid rgba(234,179,8,0.2);border-radius:8px;padding:10px 12px;color:var(--gold);">
            Saham berharga di bawah Rp${EPS_MIN_PRICE} dan sektor Properties &amp; Real Estate diblokir otomatis untuk mengurangi jebakan.
          </div>
        </div>
      </div>
    </details>`;

  const filterPanel = `
    <div class="panel" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div class="filter-section-title" style="margin:0;">ðŸŽ¯ Entry Price Scanner <span class="pill pill-teal">BROKER TRAP</span><span class="line"></span></div>
        <div style="font-size:11px;color:var(--muted);">
          ${raw ? `Server: ${raw.stockCount} saham Â· ${escapeHtml(f.periode)} Â· ${escapeHtml(f.broker)} Â· ${new Date(raw.scannedAt).toLocaleString('id-ID')}` : "Belum ada data"}
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:18px;margin-bottom:12px;">
        <div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700;margin-bottom:6px;">Periode</div>
          <div style="display:flex;gap:6px;">
            ${epsSegBtn("periode","1w","1 Minggu",f.periode==="1w")}
            ${epsSegBtn("periode","2w","2 Minggu",f.periode==="2w")}
            ${epsSegBtn("periode","1m","1 Bulan",f.periode==="1m")}
          </div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700;margin-bottom:6px;">Broker</div>
          <div style="display:flex;gap:6px;">
            ${epsSegBtn("broker","asing","Asing",f.broker==="asing")}
            ${epsSegBtn("broker","lokal","Lokal",f.broker==="lokal")}
            ${epsSegBtn("broker","both","Keduanya",f.broker==="both")}
          </div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700;margin-bottom:6px;">Konvergensi</div>
          <div style="display:flex;gap:6px;">
            ${epsSegBtn("konvergensi","all","Semua",f.konvergensi==="all")}
            ${epsSegBtn("konvergensi","menyatu","â‡„ Menyatu",f.konvergensi==="menyatu")}
            ${epsSegBtn("konvergensi","diam","â–¶ Diam",f.konvergensi==="diam")}
            ${epsSegBtn("konvergensi","menjauh","â†” Menjauh",f.konvergensi==="menjauh")}
          </div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700;margin-bottom:6px;">Tanjakan 10H</div>
          <div style="display:flex;gap:6px;">
            ${epsSegBtn("tanjakan","all","Semua",f.tanjakan==="all")}
            ${epsSegBtn("tanjakan","menanjak","â–² Menanjak",f.tanjakan==="menanjak")}
          </div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end;">
        <div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700;margin-bottom:6px;">Urut (bisa digabung)</div>
          <div style="display:flex;gap:6px;">
            ${epsSortBtn("konvergensi","Konvergensi")}
            ${epsSortBtn("tanjakan","Tanjakan 10H")}
            ${epsSortBtn("mutu","Mutu")}
            ${epsSortBtn("terdekat","Terdekat VWAP")}
          </div>
        </div>
        <div class="field" style="max-width:150px;">
          <label style="font-size:10px;">Min Mutu</label>
          <select id="epsMinMutu" style="background:rgba(0,0,0,0.2);border:1px solid var(--border);color:var(--text);font-size:12.5px;border-radius:8px;padding:8px 10px;">
            <option value="0" ${f.minMutu===0?"selected":""}>Semua</option>
            <option value="50" ${f.minMutu===50?"selected":""}>â‰¥ 50</option>
            <option value="70" ${f.minMutu===70?"selected":""}>â‰¥ 70</option>
            <option value="85" ${f.minMutu===85?"selected":""}>â‰¥ 85</option>
          </select>
        </div>
        <div class="field" style="max-width:150px;">
          <label style="font-size:10px;">Min Akumulasi</label>
          <select id="epsMinAkum" style="background:rgba(0,0,0,0.2);border:1px solid var(--border);color:var(--text);font-size:12.5px;border-radius:8px;padding:8px 10px;">
            <option value="0" ${f.minAkum===0?"selected":""}>Semua</option>
            <option value="100000000" ${f.minAkum===100000000?"selected":""}>â‰¥ 100 Jt</option>
            <option value="1000000000" ${f.minAkum===1000000000?"selected":""}>â‰¥ 1 M</option>
            <option value="10000000000" ${f.minAkum===10000000000?"selected":""}>â‰¥ 10 M</option>
          </select>
        </div>
        <div class="field" style="max-width:150px;">
          <label style="font-size:10px;">Min Gap</label>
          <select id="epsMinGap" style="background:rgba(0,0,0,0.2);border:1px solid var(--border);color:var(--text);font-size:12.5px;border-radius:8px;padding:8px 10px;">
            <option value="all" ${f.minGap==="all"?"selected":""}>Semua</option>
            <option value="dekat" ${f.minGap==="dekat"?"selected":""}>Terdekat VWAP (â‰¤${EPS_AREA_PCT}%)</option>
            <option value="nyangkut" ${f.minGap==="nyangkut"?"selected":""}>Nyangkut (di bawah VWAP)</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;margin-left:auto;">
          <button class="btn btn-outline" id="epsCsvBtn" style="color:#22d3ee;border-color:rgba(6,182,212,0.4);">CSV</button>
          <button class="btn btn-outline" id="epsClearCacheBtn" style="color:#f87171;border-color:rgba(239,68,68,0.4);">Clear Cache</button>
          <button class="btn btn-primary" id="epsScanBtn" ${state.epsScanning?"disabled":""}>${state.epsScanning?"â³ Scanning...":"ðŸ”„ Scan Sekarang"}</button>
        </div>
      </div>
      ${state.epsMsg ? `<div class="bs-msg ${state.epsMsgError?"bs-msg-error":"bs-msg-ok"}" style="margin-top:12px;">${escapeHtml(state.epsMsg)}</div>` : ""}
    </div>`;

  const resultsPanel = `
    <div class="panel" style="flex-direction:column;align-items:stretch;">
      <div class="filter-section-title">Hasil Scan <span class="count-badge">${rows.length} saham</span><span class="line"></span></div>
      ${!rows.length ? `<div class="empty-box">${raw ? "Tidak ada saham yang lolos kombinasi filter ini â€” coba longgarkan Min Mutu/Akumulasi/Gap." : "Belum ada hasil. Klik \"ðŸ”„ Scan Sekarang\" di atas untuk mulai."}</div>` : `
      <div class="table-wrap">
        <table class="mono">
          <thead>
            <tr>
              <th>#</th><th>Kode</th><th>Nama</th><th>Harga</th><th>VWAP Buy</th><th>Gap %</th><th>Konv</th><th>Tanjakan</th><th>Mutu</th><th>Net Buy</th><th>Score</th><th>Top Broker</th><th>Tipe</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r,i)=>`
              <tr>
                <td>${i+1}</td>
                <td class="ticker-cell"><button class="ticker-link" data-detail="${r.ticker}" title="Lihat detail ${r.ticker}">${r.ticker}</button></td>
                <td style="white-space:normal;max-width:180px;font-family:'Sora',sans-serif;font-size:12px;">${escapeHtml(r.nama)}</td>
                <td>${fmtNum(Math.round(r.harga))}</td>
                <td style="color:var(--gold);">${fmtNum(Math.round(r.vwapBuy))}</td>
                <td>
                  <span style="color:${r.gapPct>=0?'var(--up)':'var(--down)'};">${r.gapPct>=0?'+':''}${r.gapPct.toFixed(1)}%</span>
                  ${pillHtml(r.areaLabel, r.areaTone)}
                </td>
                <td title="${r.konvergensiVal.toFixed(2)} poin">${r.konvergensiIcon} ${r.konvergensi}</td>
                <td title="Top broker tren: ${escapeHtml(r.tanjakanTopBroker)}">${r.tanjakanIcon} ${r.tanjakanSlope.toFixed(1)}x ${r.tanjakanScore}</td>
                <td>${r.mutu}</td>
                <td style="color:${r.netBuy>=0?'var(--up)':'var(--down)'};">${r.netBuy>=0?'+':''}${fmtCap(r.netBuy)}</td>
                <td style="font-weight:700;color:var(--gold);">${r.score}</td>
                <td>${escapeHtml(r.topBroker)}</td>
                <td>${pillHtml(r.topBrokerTipe==="asing"?"ASING":r.topBrokerTipe==="lokal"?"LOKAL":"-", r.topBrokerTipe==="asing"?"teal":"muted")}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`}
    </div>`;

  return infoPanel + filterPanel + resultsPanel;
}

// ==========================================================================
// KRAKEN FLOW (ORCA) â€” lihat blok komentar besar di state.orca* di atas
// untuk penjelasan lengkap arsitektur & keterbatasan datanya.
// ==========================================================================
const ORCA_TOP_N = 25;
const ORCA_BID_OFFER_RATIO_MIN = 2;    // bidVolume >= 2x offerVolume
const ORCA_ATS_THRESHOLD = 50000000;   // Rp50 juta/transaksi dianggap "besar" (bukan ritel) untuk toggle umum High ATS
const ORCA_NONREGULAR_PCT_MIN = 30;    // crossingPct >= 30%
const ORCA_OFFER_SLENDER_RATIO_MAX = 0.15; // offerVolume <= 15% bidVolume (tapi offer masih >0, beda dari No Sell)

const ORCA_FILTER_DEFS = [
  { key:"bidOffer",    label:"High Bid/Offer",   desc:"Antrian beli jauh lebih tebal dari antrian jual â€” ada yang menampung." },
  { key:"ats",         label:"High ATS",         desc:"Average Trade Size besar = transaksi per eksekusi besar = pemain besar, bukan ritel." },
  { key:"noSell",      label:"No Sell",          desc:"Nyaris tidak ada tekanan jual pada periode itu (antrian jual kosong)." },
  { key:"closeHigh",   label:"Close High",       desc:"Ditutup di harga tertinggi hari itu â€” tanda kekuatan." },
  { key:"nonRegular",  label:"High Non-Regular", desc:"Banyak transaksi crossing/negosiasi di luar pasar reguler." },
  { key:"topVolume",   label:"Top Volume",       desc:`Top ${ORCA_TOP_N} saham paling ramai secara volume transaksi.` },
  { key:"frequency",   label:"Frequency",        desc:`Top ${ORCA_TOP_N} saham paling ramai secara frekuensi transaksi.` },
  { key:"foreignPlus", label:"Foreign +",        desc:"Asing net beli pada jendela waktu terpilih." },
  { key:"offerSlender",label:"Offer's Slender",  desc:"Antrian jual menipis drastis â€” sedikit yang mau melepas barang." },
];

const ORCA_MARKETCAP_OPTIONS = [
  { key:"all",    label:"Semua", max:null },
  { key:"1t",     label:"â‰¤1T",   max:1e12 },
  { key:"5t",     label:"â‰¤5T",   max:5e12 },
  { key:"10t",    label:"â‰¤10T",  max:10e12 },
  { key:"50t",    label:"â‰¤50T",  max:50e12 },
  { key:"100t",   label:"â‰¤100T", max:100e12 },
  { key:"custom", label:"Custom T", max:null },
];

function orcaForeignWindowField(duration){
  if(duration <= 1) return { field:"foreignNet1D", label:"1 Hari" };
  if(duration <= 5) return { field:"foreignNet5D", label:"5 Hari" };
  return { field:"foreignNet20D", label:"20 Hari" };
}

function orcaMarketCapMax(){
  const opt = ORCA_MARKETCAP_OPTIONS.find(o=>o.key===state.orcaMarketCap);
  if(!opt) return null;
  if(opt.key === "custom"){
    const v = parseFloat(state.orcaCustomCapT);
    return (v > 0) ? v * 1e12 : null;
  }
  return opt.max;
}

// ==========================================================================
// Histori bid/offer/value/frequency/nonreg PER HARI dari `flows`, dipakai
// supaya Durasi (1-7 hari) di Kraken Flow benar-benar mengagregasi semua
// parameter -- bukan cuma Foreign+ seperti sebelum kolom bid/offer di
// `flows` ada (lihat sql/07_flows_bid_offer.sql & sync-idx-full.mjs).
// Ditarik SEKALI (7 hari bursa terakhir, semua emiten) lalu di-cache di
// state.orcaHistoryByTicker -- computeOrcaResults() menghitung ulang
// agregat jendela N-hari dari cache ini tiap render, instan, tanpa fetch
// ulang tiap kali Durasi/filter diubah (pola sama seperti epsRaw di
// Entry Price Scanner).
// ==========================================================================
const ORCA_HISTORY_TRADING_DAYS = 7;

// FALLBACK STOCKBIT â€” `flows` (IDX resmi) hanya terisi kalau sync-idx-full.mjs
// sempat jalan (laptop menyala & tidak diblokir IDX). Kalau hari bursa
// TERBARU (biasanya "kemarin" dari sudut pandang user buka app pagi ini)
// belum sempat ke-sync ke `flows`, kita isi tanggal itu dari
// `price_history_stockbit` (hasil tarik histori Stockbit yang sudah
// didownload/disimpan lewat tab Historical Data / Tarik Otomatis Bulk).
// Bid/Offer & Non-Regular% TETAP kosong untuk baris asal Stockbit karena
// endpoint histori Stockbit tidak menyediakan data antrian order book /
// crossing (itu hanya ada di data resmi IDX) -- filter yang butuh field
// itu (Antrian Bid/Offer, No Sell, Offer Menipis) otomatis tidak match
// untuk baris tsb, tapi ATS, Frequency, Top Volume/Frequency tetap jalan
// karena value & frequency tersedia di Stockbit.
async function fetchStockbitHistoryForOrca(cutoff){
  const qs = new URLSearchParams({
    period: "eq.daily",
    trade_date: `gte.${cutoff}`,
    select: "stock_code,trade_date,close,high,volume,value_idr,frequency",
    order: "trade_date.desc"
  });
  const res = await fetch(`${SUPABASE_URL}/price_history_stockbit?${qs}`, { headers: getSupaHeaders(), cache: "no-store" });
  if(!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} (price_history_stockbit)`);
  const rows = await res.json();
  if(rows.message) throw new Error(rows.message);
  return rows;
}

async function loadOrcaHistory(){
  if(!SUPABASE_URL || !SUPABASE_KEY) return;
  state.orcaHistoryLoading = true; state.orcaHistoryError = null; render();
  try{
    const cutoff = epsCutoffDate(ORCA_HISTORY_TRADING_DAYS);
    const qs = new URLSearchParams({
      date: `gte.${cutoff}`,
      select: "ticker,date,bid,bid_volume,offer,offer_volume,value,frequency,nonreg_value,volume,close,high",
      order: "date.desc"
    });
    const res = await fetch(`${SUPABASE_URL}/flows?${qs}`, { headers: getSupaHeaders(), cache: "no-store" });
    if(!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const idxRows = await res.json();
    if(idxRows.message) throw new Error(idxRows.message);

    // Tandai baris IDX per ticker+tanggal supaya bisa dicek tanggal mana
    // saja yang SUDAH ada dari `flows` sebelum menambal dari Stockbit.
    const idxKeySet = new Set(idxRows.map(r => `${String(r.ticker||"").toUpperCase()}|${r.date}`));
    idxRows.forEach(r => { r._src = "idx"; });

    // Tambal tanggal yang belum ada di `flows` (mis. hari bursa terakhir
    // belum sempat disync dari laptop) pakai price_history_stockbit.
    // Gagal ambil Stockbit TIDAK menggagalkan seluruh load -- data IDX yang
    // sudah ada tetap dipakai, cuma histori jadi kurang lengkap.
    let stockbitRows = [];
    try{
      stockbitRows = await fetchStockbitHistoryForOrca(cutoff);
    }catch(e){
      state.orcaHistoryError = "Histori IDX (`flows`) berhasil dimuat, tapi tambalan dari Stockbit gagal: " + e.message;
    }
    const stockbitAsFlowRows = stockbitRows
      .filter(r => r.stock_code && r.trade_date && !idxKeySet.has(`${String(r.stock_code).toUpperCase()}|${r.trade_date}`))
      .map(r => ({
        ticker: r.stock_code, date: r.trade_date,
        bid: null, bid_volume: null, offer: null, offer_volume: null, nonreg_value: null,
        value: r.value_idr, frequency: r.frequency, volume: r.volume, close: r.close, high: r.high,
        _src: "stockbit",
      }));

    const rows = idxRows.concat(stockbitAsFlowRows);

    // Susun per ticker, simpan hanya ORCA_HISTORY_TRADING_DAYS tanggal
    // TERBARU yang benar-benar ada datanya untuk ticker itu (tidak semua
    // saham transaksi tiap hari bursa, mis. suspensi).
    const byTicker = {};
    rows.forEach(r=>{
      const t = String(r.ticker||"").toUpperCase();
      if(!t || !r.date) return;
      if(!byTicker[t]) byTicker[t] = [];
      byTicker[t].push(r);
    });
    Object.keys(byTicker).forEach(t=>{
      byTicker[t].sort((a,b)=> a.date < b.date ? 1 : -1); // terbaru dulu
      byTicker[t] = byTicker[t].slice(0, ORCA_HISTORY_TRADING_DAYS);
    });

    // Ringkasan jumlah baris per sumber (dihitung dari byTicker SETELAH
    // di-slice ke ORCA_HISTORY_TRADING_DAYS, bukan dari rows mentah) --
    // ditampilkan di UI supaya user tahu berapa banyak yang masih pakai
    // data resmi IDX vs. tambalan Stockbit.
    let idxCount = 0, stockbitCount = 0;
    Object.values(byTicker).forEach(list => list.forEach(r => {
      if(r._src === "stockbit") stockbitCount++; else idxCount++;
    }));
    state.orcaHistorySourceCounts = { idx: idxCount, stockbit: stockbitCount };

    state.orcaHistoryByTicker = byTicker;
    state.orcaHistoryLoadedAt = new Date().toISOString();
  } catch(e){
    state.orcaHistoryError = "Gagal menarik histori Kraken Flow: " + e.message + " (filter tetap jalan pakai snapshot hari terakhir).";
  }
  state.orcaHistoryLoading = false;
  render();
}

function ensureOrcaHistoryLoaded(){
  if(state.orcaHistoryByTicker || state.orcaHistoryLoading) return;
  loadOrcaHistory();
}

// Hitung agregat jendela `duration` hari bursa TERBARU untuk satu ticker
// dari cache histori. Null kalau ticker itu tidak ada di cache sama
// sekali (belum ada baris `flows` sejak migration 07 dijalankan) --
// pemanggil (computeOrcaResults) lalu jatuh balik ke snapshot stocks.
function orcaWindowAggregate(ticker, duration){
  const rowsAll = state.orcaHistoryByTicker ? state.orcaHistoryByTicker[ticker] : null;
  if(!rowsAll || !rowsAll.length) return null;
  const rows = rowsAll.slice(0, Math.max(1, duration));
  const latest = rows[0]; // hari bursa paling baru dalam jendela

  let sumValue = 0, sumFreq = 0, sumNonreg = 0, sumVolume = 0;
  let hasValue = false, hasFreq = false;
  rows.forEach(r=>{
    if(r.value != null){ sumValue += Number(r.value)||0; hasValue = true; }
    if(r.frequency != null){ sumFreq += Number(r.frequency)||0; hasFreq = true; }
    if(r.nonreg_value != null) sumNonreg += Number(r.nonreg_value)||0;
    if(r.volume != null) sumVolume += Number(r.volume)||0;
  });

  return {
    // Bid/Offer adalah snapshot antrian (state sesaat), jadi dipakai dari
    // hari PALING BARU dalam jendela -- bukan dijumlah/dirata-rata lintas
    // hari (menjumlah antrian order book beberapa hari tidak bermakna).
    bid: latest.bid != null ? Number(latest.bid) : null,
    bidVolume: latest.bid_volume != null ? Number(latest.bid_volume) : null,
    offer: latest.offer != null ? Number(latest.offer) : null,
    offerVolume: latest.offer_volume != null ? Number(latest.offer_volume) : null,
    cClose: latest.close != null ? Number(latest.close) : null,
    cHigh: latest.high != null ? Number(latest.high) : null,
    // ATS & Non-Regular% dihitung dari TOTAL jendela (rata-rata tertimbang),
    // bukan rata-rata dari rata-rata harian -- lebih akurat kalau frekuensi
    // hari-hari dalam jendela tidak sama.
    avgTicket: (hasValue && hasFreq && sumFreq > 0) ? sumValue / sumFreq : null,
    crossingPct: (hasValue && sumValue > 0) ? (sumNonreg / sumValue) * 100 : null,
    frequency: hasFreq ? sumFreq : null,
    cVol: sumVolume,
    tradingDaysInWindow: rows.length,
    // Sumber baris PALING BARU dalam jendela ("idx" dari `flows` atau
    // "stockbit" dari tambalan price_history_stockbit, lihat loadOrcaHistory()).
    // Dipakai untuk badge "Sumber" per-baris di tabel Hasil ORCA -- sebelumnya
    // cuma ada ringkasan agregat (idxCount/stockbitCount) di atas tabel, tidak
    // ada indikator per-saham, jadi user tidak tahu MANA yang datanya dari
    // tambalan Stockbit (bid/offer/nonreg_value pasti null untuk baris itu).
    src: latest._src || null,
  };
}

function computeOrcaResults(){
  const filters = state.orcaFilters;
  if(!filters.size) return { rows:[], ranked:false, universeSize:0 };

  const capMax = orcaMarketCapMax();
  const foreignWin = orcaForeignWindowField(state.orcaDuration);

  // Tempel agregat jendela N-hari (dari cache `flows`, lihat
  // orcaWindowAggregate() di atas) ke tiap saham SEBELUM filter apa pun
  // dijalankan -- jadi Bid/Offer, ATS, Non-Regular%, Frequency & Volume di
  // bawah sudah mengikuti Durasi terpilih. Kalau histori belum ke-load
  // (masih fetch) atau ticker itu belum punya baris histori sama sekali
  // (migration baru dijalankan / belum pernah sync), field snapshot asli
  // dari `stocks` (hari terakhir) dipakai sebagai fallback -- jadi tab
  // tetap terpakai walau data historis belum lengkap.
  const usingHistory = !!state.orcaHistoryByTicker;
  let universe = enriched()
    .map(s=>{
      const w = usingHistory ? orcaWindowAggregate(s.ticker, state.orcaDuration) : null;
      if(!w) return { ...s, orcaWindowDays: null, orcaSrc: null };
      return {
        ...s,
        bid: w.bid ?? s.bid, bidVolume: w.bidVolume ?? s.bidVolume,
        offer: w.offer ?? s.offer, offerVolume: w.offerVolume ?? s.offerVolume,
        avgTicket: w.avgTicket ?? s.avgTicket, crossingPct: w.crossingPct ?? s.crossingPct,
        frequency: w.frequency ?? s.frequency, cVol: w.cVol || s.cVol,
        cClose: w.cClose ?? s.cClose, cHigh: w.cHigh ?? s.cHigh,
        orcaWindowDays: w.tradingDaysInWindow,
        // "idx" | "stockbit" | null (null = belum ada histori flows/stockbit
        // sama sekali untuk ticker ini, masih pakai snapshot `stocks`).
        orcaSrc: w.src,
      };
    })
    .filter(s=>{
      if(s.cClose == null) return false; // suspensi / tanpa harga -> tidak relevan
      if(capMax != null && (s.marketCap == null || s.marketCap > capMax)) return false;
      return true;
    });

  // Rank-based (Top Volume / Frequency) dihitung dari universe SETELAH filter
  // Market Cap, supaya "Top 25" konsisten dengan kategori cap yang dipilih.
  const topVolumeTickers = new Set(
    universe.filter(s=>(s.cVol||0) > 0).sort((a,b)=>(b.cVol||0)-(a.cVol||0)).slice(0, ORCA_TOP_N).map(s=>s.ticker)
  );
  const topFreqTickers = new Set(
    universe.filter(s=>(s.frequency||0) > 0).sort((a,b)=>(b.frequency||0)-(a.frequency||0)).slice(0, ORCA_TOP_N).map(s=>s.ticker)
  );

  function passesAll(s){
    for(const key of filters){
      if(key === "bidOffer"){
        if(!(s.bidVolume > 0 && s.offerVolume != null && (s.offerVolume === 0 || (s.bidVolume / s.offerVolume) >= ORCA_BID_OFFER_RATIO_MIN))) return false;
      } else if(key === "ats"){
        if(!(s.avgTicket != null && s.avgTicket >= ORCA_ATS_THRESHOLD)) return false;
      } else if(key === "noSell"){
        if(!(s.offerVolume != null && s.offerVolume <= 0 && s.bidVolume > 0)) return false;
      } else if(key === "closeHigh"){
        if(!(s.cClose != null && s.cHigh != null && s.cClose >= s.cHigh - 1e-6)) return false;
      } else if(key === "nonRegular"){
        if(!(s.crossingPct != null && s.crossingPct >= ORCA_NONREGULAR_PCT_MIN)) return false;
      } else if(key === "topVolume"){
        if(!topVolumeTickers.has(s.ticker)) return false;
      } else if(key === "frequency"){
        if(!topFreqTickers.has(s.ticker)) return false;
      } else if(key === "foreignPlus"){
        const v = s[foreignWin.field];
        if(!(v != null && v > 0)) return false;
      } else if(key === "offerSlender"){
        if(!(s.offerVolume > 0 && s.bidVolume > 0 && (s.offerVolume / s.bidVolume) <= ORCA_OFFER_SLENDER_RATIO_MAX)) return false;
        if(state.orcaMinAts > 0 && !(s.avgTicket != null && s.avgTicket >= state.orcaMinAts)) return false;
        if(state.orcaMinFreq > 0 && !(s.frequency != null && s.frequency >= state.orcaMinFreq)) return false;
      }
    }
    return true;
  }

  let rows = universe.filter(passesAll);

  if(state.orcaSearch.trim()){
    const q = state.orcaSearch.trim().toUpperCase();
    rows = rows.filter(s => s.ticker.includes(q) || (s.name||"").toUpperCase().includes(q));
  }

  // Skor komposit heuristik v1 â€” HANYA dipakai untuk urutan tampil, bukan
  // untuk lolos/tidaknya filter (itu murni AND di atas). Bukan dari sumber
  // luar mana pun, dan boleh disetel ulang kalau ada masukan lebih baik.
  rows = rows.map(s=>{
    const bidOfferRatio = (s.bidVolume > 0 && s.offerVolume > 0) ? s.bidVolume / s.offerVolume : (s.bidVolume > 0 && s.offerVolume === 0 ? 999 : null);
    const foreignVal = s[foreignWin.field];
    const score = (bidOfferRatio != null ? Math.min(bidOfferRatio, 20) * 2 : 0)
      + (s.avgTicket ? Math.min(s.avgTicket / 1e9, 10) * 3 : 0)
      + (foreignVal > 0 ? Math.min(foreignVal / 1e9, 20) * 2 : 0)
      + (s.crossingPct ? Math.min(s.crossingPct, 100) * 0.3 : 0)
      + (s.frequency ? Math.min(s.frequency / 1000, 20) : 0)
      + (s.cVol ? Math.min(s.cVol / 1e7, 20) : 0);
    return { ...s, orcaBidOfferRatio: bidOfferRatio, orcaForeignVal: foreignVal, orcaScore: score };
  }).sort((a,b)=> b.orcaScore - a.orcaScore).slice(0, ORCA_TOP_N);

  return { rows, ranked:true, foreignWinLabel: foreignWin.label, universeSize: universe.length, usingHistory };
}

function toggleOrcaFilter(key){
  state.orcaFilters.has(key) ? state.orcaFilters.delete(key) : state.orcaFilters.add(key);
  render();
}

function setOrcaSeg(group, value){
  if(group === "duration") state.orcaDuration = Number(value) || 1;
  else if(group === "cap") state.orcaMarketCap = value;
  else if(group === "minAts") state.orcaMinAts = Number(value) || 0;
  else if(group === "minFreq") state.orcaMinFreq = Number(value) || 0;
  render();
}

function resetOrcaFilters(){
  state.orcaFilters = new Set();
  state.orcaDuration = 3;
  state.orcaMarketCap = "all";
  state.orcaCustomCapT = "";
  state.orcaMinAts = 0;
  state.orcaMinFreq = 0;
  state.orcaSearch = "";
  render();
}

function orcaFilterChip(def){
  const active = state.orcaFilters.has(def.key);
  return `<button type="button" class="btn ${active?'btn-primary':'btn-outline'}" data-orca-filter="${def.key}" title="${escapeHtml(def.desc)}" style="padding:9px 14px;font-size:12px;">${active?'âœ“ ':''}${def.label}</button>`;
}

function orcaSegBtn(group, key, label, active){
  return `<button type="button" class="btn ${active?'btn-primary':'btn-outline'}" data-orca-seg="${group}" data-orca-value="${key}" style="padding:7px 12px;font-size:11.5px;">${label}</button>`;
}

// Badge kecil "Sumber" per baris di tabel Hasil ORCA -- item #3 dari
// perbaikan fallback Stockbit: sebelumnya cuma ada ringkasan agregat
// (idxCount/stockbit di atas tabel), tidak ada indikator PER SAHAM mana
// yang bid/offer/nonreg_value-nya null karena masih tambalan Stockbit.
// Sama persis pola & warna badge di panel "Bandingkan dengan IDX"
// (renderDetailHistorical) supaya konsisten di seluruh app.
function orcaSrcBadge(src){
  if(src === "idx") return `<span style="color:var(--teal);font-size:11px;">IDX</span>`;
  if(src === "stockbit") return `<span style="color:var(--gold);font-size:11px;" title="Baris histori terbaru untuk saham ini dari tambalan price_history_stockbit (Stockbit), bukan flows (IDX) -- Bid/Offer & Non-Regular% kosong karena endpoint histori Stockbit tidak punya data itu.">Stockbit</span>`;
  return `<span style="color:var(--muted);font-size:11px;" title="Belum ada baris histori (flows/price_history_stockbit) untuk saham ini -- masih pakai snapshot terakhir dari tabel stocks.">-</span>`;
}

function renderKrakenFlow(){
  const result = computeOrcaResults();
  const rows = result.rows;

  const infoPanel = `
    <details class="panel" id="orcaInfoPanel" style="flex-direction:column;align-items:stretch;" ${state.orcaInfoOpen?"open":""}>
      <summary style="cursor:pointer;font-weight:700;font-size:14px;list-style:none;display:flex;justify-content:space-between;align-items:center;">
        <span>â¬¢ Cara Pakai &amp; Arti Parameter â€” Kraken Flow (ORCA)</span><span style="color:var(--muted);font-size:11px;">${state.orcaInfoOpen?"â–² Tutup":"â–¼ Buka"}</span>
      </summary>
      <div style="margin-top:16px;display:flex;flex-direction:column;gap:14px;font-size:12.5px;line-height:1.7;color:var(--text);">
        <div>
          <div style="font-weight:700;margin-bottom:6px;">Cara pakai</div>
          <div style="color:var(--muted);">
            1. Pilih <b>minimal satu filter</b> dari daftar parameter (bisa dikombinasikan).<br>
            2. Atur Durasi (1-7 hari) dan batas Kapitalisasi Pasar bila perlu.<br>
            3. Hasil langsung tampil â€” Top ${ORCA_TOP_N}, tanpa perlu tombol scan.
          </div>
          <div style="margin-top:8px;background:rgba(234,179,8,0.08);border:1px solid rgba(234,179,8,0.2);border-radius:8px;padding:10px 12px;color:var(--gold);">
            Makin banyak filter digabung, makin sedikit dan makin selektif hasilnya (logika AND â€” harus lolos SEMUA filter aktif). Kalau hasilnya kosong, kurangi filternya.
          </div>
        </div>
        <div>
          <div style="font-weight:700;margin-bottom:6px;">Arti tiap parameter</div>
          <div style="color:var(--muted);display:flex;flex-direction:column;gap:4px;">
            ${ORCA_FILTER_DEFS.map(d=>`<div><b style="color:var(--text);">${d.label}</b> â€” ${d.desc}</div>`).join("")}
          </div>
        </div>
        <div style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.25);border-radius:8px;padding:10px 12px;">
          <b style="color:var(--teal);">Catatan data:</b> Bid/Offer, ATS, Non-Regular%, Frequency & Volume sekarang mengikuti <b>Durasi (1-7 hari bursa) yang dipilih</b>, dihitung dari histori harian asli di tabel <code>flows</code> (bukan cuma snapshot hari terakhir lagi) â€” ATS & Non-Regular% dijumlah dulu lalu dibagi (rata-rata tertimbang), Bid/Offer diambil dari hari bursa paling baru dalam jendela (antrian order book tidak dijumlah lintas hari). Foreign+ tetap memakai agregat 1/5/20 hari yang memang sudah ada. Kalau sebuah saham belum punya baris histori sama sekali (mis. baru pertama kali disinkronkan setelah fitur ini aktif), filternya otomatis jatuh balik ke snapshot hari terakhir supaya tidak hilang dari hasil.
          ${state.orcaHistoryLoading ? `<div style="margin-top:6px;color:var(--gold);">⏳ Menarik histori 7 hari bursa terakhir dari <code>flows</code> (IDX) + tambalan <code>price_history_stockbit</code> (Stockbit)...</div>` : ""}
          ${state.orcaHistoryError ? `<div style="margin-top:6px;color:#f87171;">${escapeHtml(state.orcaHistoryError)}</div>` : ""}
          ${(!state.orcaHistoryLoading && state.orcaHistoryByTicker) ? `<div style="margin-top:6px;color:var(--muted);">Histori dimuat (${Object.keys(state.orcaHistoryByTicker).length} emiten punya baris dalam jendela ini${state.orcaHistorySourceCounts ? ` — ${state.orcaHistorySourceCounts.idx} baris dari <code>flows</code> (IDX), ${state.orcaHistorySourceCounts.stockbit} baris tambalan dari <code>price_history_stockbit</code> (Stockbit)` : ""})${state.orcaHistoryLoadedAt ? " — " + new Date(state.orcaHistoryLoadedAt).toLocaleTimeString("id-ID") : ""}. ${state.orcaHistorySourceCounts && state.orcaHistorySourceCounts.stockbit > 0 ? `<span style="color:var(--gold);">Bid/Offer &amp; Non-Regular% baris Stockbit kosong (endpoint histori Stockbit tidak punya data itu).</span> ` : ""}<button type="button" id="orcaHistoryRefreshBtn" style="background:none;border:none;color:var(--teal);text-decoration:underline;cursor:pointer;font-size:11.5px;padding:0;">Muat ulang</button></div>` : ""}
        </div>
      </div>
    </details>`;

  const filterChips = ORCA_FILTER_DEFS.map(orcaFilterChip).join("");

  const strongPanel = `
    <div style="margin-top:14px;padding-top:14px;border-top:1px dashed var(--border);">
      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700;margin-bottom:8px;">Filter Kuat Â· khusus Offer's Slender</div>
      <div style="display:flex;flex-wrap:wrap;gap:18px;">
        <div>
          <div style="font-size:10px;color:var(--muted);margin-bottom:6px;">Min ATS</div>
          <div style="display:flex;gap:6px;">
            ${orcaSegBtn("minAts","0","Semua",state.orcaMinAts===0)}
            ${orcaSegBtn("minAts","2000000000","â‰¥2M",state.orcaMinAts===2000000000)}
            ${orcaSegBtn("minAts","5000000000","â‰¥5M",state.orcaMinAts===5000000000)}
          </div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--muted);margin-bottom:6px;">Min Freq</div>
          <div style="display:flex;gap:6px;">
            ${orcaSegBtn("minFreq","0","Semua",state.orcaMinFreq===0)}
            ${orcaSegBtn("minFreq","2000","â‰¥2k",state.orcaMinFreq===2000)}
            ${orcaSegBtn("minFreq","5000","â‰¥5k",state.orcaMinFreq===5000)}
          </div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:6px;">Nilai mengikuti angka di kartu (ATS dalam Miliar Rp â€” "M" = Miliar, Freq = jumlah transaksi hari itu). Semua = tak dibatasi. Hanya aktif kalau filter <b>Offer's Slender</b> dinyalakan.</div>
    </div>`;

  const durationBtns = [1,2,3,4,5,6,7].map(d=>orcaSegBtn("duration",String(d),`${d}H`,state.orcaDuration===d)).join("");
  const capBtns = ORCA_MARKETCAP_OPTIONS.map(o=>orcaSegBtn("cap",o.key,o.label,state.orcaMarketCap===o.key)).join("");
  const capLabel = ORCA_MARKETCAP_OPTIONS.find(o=>o.key===state.orcaMarketCap)?.label || "Semua";

  const filterPanel = `
    <div class="panel" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div class="filter-section-title" style="margin:0;">â¬¢ Filter Order Flow â€” Bandarmology<span class="line"></span></div>
        <input id="orcaSearchInput" type="text" placeholder="Cari emiten (mis. IATA)" value="${escapeHtml(state.orcaSearch)}" style="background:rgba(0,0,0,0.2);border:1px solid var(--border);color:var(--text);font-size:12.5px;border-radius:8px;padding:8px 12px;width:180px;">
      </div>
      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700;margin-bottom:8px;">Parameter Â· bisa dikombinasikan Â· Top ${ORCA_TOP_N} hasil</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">${filterChips}</div>
      ${strongPanel}
      <div style="display:flex;flex-wrap:wrap;gap:24px;margin-top:16px;padding-top:14px;border-top:1px dashed var(--border);">
        <div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700;margin-bottom:8px;">Durasi Â· max 7 hari</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">${durationBtns}</div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700;margin-bottom:8px;">Market Cap Â· maksimal ${escapeHtml(capLabel)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            ${capBtns}
            ${state.orcaMarketCap==="custom" ? `<input id="orcaCustomCapInput" type="number" min="0" step="0.1" placeholder="mis. 25" value="${escapeHtml(state.orcaCustomCapT)}" style="background:rgba(0,0,0,0.2);border:1px solid var(--border);color:var(--text);font-size:12px;border-radius:8px;padding:7px 10px;width:90px;"> <span style="font-size:11px;color:var(--muted);">Triliun Rp</span>` : ""}
          </div>
        </div>
        <div style="margin-left:auto;display:flex;align-items:flex-end;">
          <button class="btn btn-outline" id="orcaResetBtn" style="color:#f87171;border-color:rgba(239,68,68,0.4);">â†º Reset ORCA</button>
        </div>
      </div>
    </div>`;

  const resultsPanel = `
    <div class="panel" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div class="filter-section-title" style="margin:0;">âŠ™ Hasil ORCA <span class="count-badge">${result.ranked ? rows.length : 0} saham</span><span class="line"></span></div>
        ${rows.length ? `<button class="btn btn-outline" id="orcaCsvBtn" style="color:#22d3ee;border-color:rgba(6,182,212,0.4);">CSV</button>` : ""}
      </div>
      ${!result.ranked
        ? `<div class="empty-box">â¬¢ Pilih minimal satu filter di atas â€” hasil akan langsung tampil di sini tanpa perlu scan.<br>${result.usingHistory ? `Data diagregasi dari histori ${ORCA_HISTORY_TRADING_DAYS} hari bursa terakhir (${state.stocks.length} emiten diikuti).` : `Data diambil dari snapshot Bandarmology terakhir (${state.stocks.length} emiten)${state.orcaHistoryLoading ? " â€” histori sedang dimuat..." : ""}.`}</div>`
        : !rows.length
          ? `<div class="empty-box">Tidak ada saham yang lolos kombinasi filter ini (dari ${result.universeSize} emiten setelah filter Market Cap) â€” coba kurangi filter atau longgarkan Market Cap.</div>`
          : `<div class="table-wrap">
        <table class="mono">
          <thead>
            <tr>
              <th>#</th><th>Kode</th><th title="Sumber baris histori paling baru: IDX (flows) atau tambalan Stockbit (bid/offer/non-reg kosong)">Sumber</th><th>Nama</th><th>Harga</th><th>1D%</th><th>Bid</th><th>Offer</th><th>B/O</th><th>ATS${result.usingHistory?` (${state.orcaDuration}H)`:""}</th><th>Freq${result.usingHistory?` (${state.orcaDuration}H)`:""}</th><th>Non-Reg%${result.usingHistory?` (${state.orcaDuration}H)`:""}</th><th>Foreign (${escapeHtml(result.foreignWinLabel||"")})</th><th>Volume</th><th>Mkt Cap</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r,i)=>`
              <tr>
                <td>${i+1}</td>
                <td class="ticker-cell"><button class="ticker-link" data-detail="${r.ticker}" title="Lihat detail ${r.ticker}">${r.ticker}</button></td>
                <td>${orcaSrcBadge(r.orcaSrc)}</td>
                <td style="white-space:normal;max-width:160px;font-family:'Sora',sans-serif;font-size:12px;">${escapeHtml(r.name)}</td>
                <td>${fmtNum(r.cClose)}</td>
                <td style="color:${(r.changePct||0)>=0?'var(--up)':'var(--down)'};">${r.changePct!=null?((r.changePct>=0?'+':'')+r.changePct.toFixed(1)+'%'):'-'}</td>
                <td>${fmtNum(r.bidVolume)}</td>
                <td>${fmtNum(r.offerVolume)}</td>
                <td>${r.orcaBidOfferRatio!=null ? (r.orcaBidOfferRatio>=999?'âˆž':r.orcaBidOfferRatio.toFixed(1)+'x') : '-'}</td>
                <td>${r.avgTicket!=null?fmtCap(r.avgTicket):'-'}</td>
                <td>${fmtNum(r.frequency)}</td>
                <td>${r.crossingPct!=null?r.crossingPct.toFixed(1)+'%':'-'}</td>
                <td style="color:${(r.orcaForeignVal||0)>=0?'var(--up)':'var(--down)'};">${r.orcaForeignVal!=null?fmtRp(r.orcaForeignVal):'-'}</td>
                <td>${fmtCap(r.cVol)}</td>
                <td>${r.marketCap!=null?fmtCap(r.marketCap):'-'}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`}
    </div>`;

  return infoPanel + filterPanel + resultsPanel;
}

function exportOrcaToCsv(){
  const result = computeOrcaResults();
  const rows = result.rows;
  if(!rows.length) return alert("Belum ada hasil ORCA untuk diekspor.");
  const header = ["Kode","Sumber","Nama","Harga","1D%","Bid","Offer","B/O Ratio","ATS","Frekuensi","Non-Reg %","Foreign","Volume","Market Cap"];
  const lines = [header.join(",")];
  rows.forEach(r=>{
    lines.push([
      r.ticker, r.orcaSrc || "-", `"${(r.name||"").replace(/"/g,'""')}"`, Math.round(r.cClose||0), (r.changePct||0).toFixed(2),
      Math.round(r.bidVolume||0), Math.round(r.offerVolume||0), r.orcaBidOfferRatio!=null?r.orcaBidOfferRatio.toFixed(2):"",
      Math.round(r.avgTicket||0), Math.round(r.frequency||0), r.crossingPct!=null?r.crossingPct.toFixed(2):"",
      Math.round(r.orcaForeignVal||0), Math.round(r.cVol||0), Math.round(r.marketCap||0)
    ].join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `KrakenFlowORCA_${todayLocalISO()}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================
// bindSearchInputPreservingCursor â€” pengganti pola oninput manual lama
// (state.x = e.target.value; render(); ...selectionStart = value.length).
//
// KENAPA INI PERLU: render() mengganti innerHTML tab yang aktif secara
// PENUH tiap kali state berubah, jadi elemen <input> lama "dibuang" dan
// diganti elemen baru â€” fokus & posisi kursor otomatis hilang. Kode lama
// menutupi ini dengan memaksa fokus balik + kursor SELALU ke UJUNG teks
// (selectionStart = value.length). Akibatnya: begitu user mencoba
// mengedit di TENGAH teks (bukan di ujung), kursor selalu melompat balik
// ke akhir setiap kali mengetik satu huruf â€” mustahil menyisipkan atau
// menghapus karakter di tengah kata tanpa kursor "kabur".
//
// Fungsi ini menyimpan posisi kursor ASLI (selectionStart/selectionEnd)
// SEBELUM state berubah & re-render, lalu mengembalikan ke posisi yang
// SAMA (di-clamp ke panjang teks baru, bukan otomatis ke ujung) setelah
// elemen input baru terpasang di DOM.
// ==========================================
function bindSearchInputPreservingCursor(id, onValueChange){
  const el = document.getElementById(id);
  if(!el) return;
  el.oninput = (e) => {
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    onValueChange(e.target.value);
    render();
    const newEl = document.getElementById(id);
    if(newEl){
      newEl.focus();
      const pos = Math.min(start, newEl.value.length);
      const posEnd = Math.min(end, newEl.value.length);
      newEl.setSelectionRange(pos, posEnd);
    }
  };
}

function attachContentEvents(){
  const advToggleBtn = document.getElementById("advToggleBtn");
  if(advToggleBtn) advToggleBtn.onclick = () => { state.showAdvancedFilters = !state.showAdvancedFilters; render(); };

  const addRuleBtn = document.getElementById("addRuleBtn");
  if(addRuleBtn) addRuleBtn.onclick = addCustomRule;

  document.querySelectorAll("[data-rule-del]").forEach(btn=>{
    btn.onclick = () => deleteCustomRule(btn.dataset.ruleDel);
  });

  const savePresetBtn = document.getElementById("savePresetBtn");
  if(savePresetBtn) savePresetBtn.onclick = saveCurrentAsPreset;

  const presetSelect = document.getElementById("presetSelect");
  if(presetSelect) presetSelect.onchange = (e) => { state.selectedPresetId = e.target.value; render(); };

  const loadPresetBtn = document.getElementById("loadPresetBtn");
  if(loadPresetBtn) loadPresetBtn.onclick = loadSelectedPreset;
  const ruleBuilderToggle = document.getElementById("ruleBuilderToggle");
  if(ruleBuilderToggle) ruleBuilderToggle.onclick = () => { state.ruleBuilderOpen = !state.ruleBuilderOpen; render(); };

  const updatePresetBtn = document.getElementById("updatePresetBtn");
  if(updatePresetBtn) updatePresetBtn.onclick = updateSelectedPreset;

  const deletePresetBtn = document.getElementById("deletePresetBtn");
  if(deletePresetBtn) deletePresetBtn.onclick = deleteSelectedPreset;

  document.querySelectorAll("[data-rule-field]").forEach(el=>{
    const id = el.dataset.ruleId;
    const field = el.dataset.ruleField;
    if(field === "toggleBType"){
      el.onclick = () => updateCustomRule(id, field, null);
    } else {
      el.onchange = (e) => updateCustomRule(id, field, e.target.value);
    }
  });

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
    // Klik di luar panel menutupnya â€” dipasang sekali lewat setTimeout supaya
    // tidak langsung menutup panel yang baru saja dibuka oleh klik yang sama.
    setTimeout(() => {
      document.addEventListener("click", function closeColPicker(){
        state.colPickerOpen = false; render();
        document.removeEventListener("click", closeColPicker);
      }, { once:true });
    }, 0);
  }

  bindSearchInputPreservingCursor("searchInput", (val) => { state.search = val; state.page = 1; });

  const chartSearchInput = document.getElementById("chartSearchInput");
  if(chartSearchInput){
    bindSearchInputPreservingCursor("chartSearchInput", (val) => { state.chartSearch = val; });
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
    state.customRules = [];
    saveCustomRules();
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

  const exportScreenerBtn = document.getElementById("exportScreenerBtn");
  if(exportScreenerBtn) exportScreenerBtn.onclick = exportScreenerToExcel;
  const stockbitBulkBtn = document.getElementById("stockbitBulkBtn");
  if(stockbitBulkBtn) stockbitBulkBtn.onclick = async () => {
    if(!isValidStockbitToken(state.stockbitToken)){
      if(typeof showToast === 'function') showToast("Token Stockbit belum valid/ kosong. Isi di Pengaturan.", "down");
      openSettings(); return;
    }
    if(!isStockbitQuoteEndpointValid()){
      if(typeof showToast === 'function') showToast("Endpoint Quote belum benar (masih default / tanpa {ticker}). Cek Pengaturan.", "down");
      openSettings(); return;
    }
    const checked = [...state.selectedForBacktest];
    const tickers = checked.length ? checked : getSorted(getFiltered()).map(s=>s.ticker);
    if(!tickers.length){
      if(typeof showToast === 'function') showToast("Tidak ada saham yang lolos filter / dicentang.", "down");
      return;
    }
    if(!confirmBulkFetch("menarik data live", tickers.length)) return;
    if(tickers.length) fetchStockbitLiveBulk(tickers);
  };
  const stockbitAutoRefreshChk = document.getElementById("stockbitAutoRefreshChk");
  if(stockbitAutoRefreshChk) stockbitAutoRefreshChk.onchange = (e) => {
    if(e.target.checked){
      if(!isValidStockbitToken(state.stockbitToken)){
        e.target.checked = false;
        if(typeof showToast === 'function') showToast("Token Stockbit belum valid. Isi di Pengaturan dulu.", "down");
        openSettings(); return;
      }
      if(!isStockbitQuoteEndpointValid()){
        e.target.checked = false;
        if(typeof showToast === 'function') showToast("Endpoint Quote belum benar. Cek Pengaturan dulu.", "down");
        openSettings(); return;
      }
      const tickers = state.selectedForBacktest.size > 0
        ? [...state.selectedForBacktest]
        : getSorted(getFiltered()).map(s=>s.ticker);
      if(tickers.length > STOCKBIT_AUTOREFRESH_MAX_TICKERS){
        e.target.checked = false;
        if(typeof showToast === 'function') showToast("Auto-refresh dijeda: terlalu banyak ticker. Centang maksimal " + STOCKBIT_AUTOREFRESH_MAX_TICKERS + " saham.", "down");
        return;
      }
    }
    state.stockbitAutoRefresh = e.target.checked;
    localStorage.setItem(LS_STOCKBIT_AUTOREFRESH, state.stockbitAutoRefresh ? "1" : "0");
    if(state.stockbitAutoRefresh){
      if(typeof showToast === 'function') showToast("Auto-refresh aktif.", "up");
      stockbitAutoRefreshTick();
    }
  };
  const stockbitAutoRefreshSec = document.getElementById("stockbitAutoRefreshSec");
  if(stockbitAutoRefreshSec) stockbitAutoRefreshSec.onchange = (e) => {
    const sec = parseInt(e.target.value, 10);
    state.stockbitAutoRefreshIntervalSec = (Number.isFinite(sec) && sec >= STOCKBIT_AUTOREFRESH_MIN_SEC) ? sec : 60;
    localStorage.setItem(LS_STOCKBIT_AUTOREFRESH_SEC, String(state.stockbitAutoRefreshIntervalSec));
  };
  const screenerBsFromInput = document.getElementById("screenerBsFromInput");
  if(screenerBsFromInput) screenerBsFromInput.onchange = (e) => { state.bsAutoBulkFrom = e.target.value || state.bsAutoBulkFrom; };
  const screenerBsToInput = document.getElementById("screenerBsToInput");
  if(screenerBsToInput) screenerBsToInput.onchange = (e) => { state.bsAutoBulkTo = e.target.value || state.bsAutoBulkTo; };
  const screenerBsBulkBtn = document.getElementById("screenerBsBulkBtn");
  if(screenerBsBulkBtn) screenerBsBulkBtn.onclick = () => {
    if(!isValidStockbitToken(state.stockbitToken)){
      if(typeof showToast === 'function') showToast("Token Stockbit belum valid. Isi di Pengaturan.", "down");
      openSettings(); return;
    }
    if(!state.stockbitBrokerEndpoint){
      if(typeof showToast === 'function') showToast("Endpoint Broker Summary belum diisi di Pengaturan.", "down");
      openSettings(); return;
    }
    const range = isValidDateRange(state.bsAutoBulkFrom, state.bsAutoBulkTo);
    if(!range.valid){
      if(typeof showToast === 'function') showToast("Periode tidak valid: " + range.error, "down");
      return;
    }
    const checked = [...state.selectedForBacktest];
    const tickers = checked.length ? checked : getSorted(getFiltered()).map(s=>s.ticker);
    if(!tickers.length){
      if(typeof showToast === 'function') showToast("Tidak ada saham yang lolos filter / dicentang.", "down");
      return;
    }
    if(!confirmBulkFetch("menarik Broker Summary", tickers.length, range.days + " hari")) return;
    fetchAndSaveBrokerSummaryBulk(tickers, state.bsAutoBulkFrom, state.bsAutoBulkTo);
  };
  const screenerHdFromInput = document.getElementById("screenerHdFromInput");
  if(screenerHdFromInput) screenerHdFromInput.onchange = (e) => { state.hdAutoBulkFrom = e.target.value || state.hdAutoBulkFrom; };
  const screenerHdToInput = document.getElementById("screenerHdToInput");
  if(screenerHdToInput) screenerHdToInput.onchange = (e) => { state.hdAutoBulkTo = e.target.value || state.hdAutoBulkTo; };
  const screenerHdBulkBtn = document.getElementById("screenerHdBulkBtn");
  if(screenerHdBulkBtn) screenerHdBulkBtn.onclick = () => {
    if(!isValidStockbitToken(state.stockbitToken)){
      if(typeof showToast === 'function') showToast("Token Stockbit belum valid. Isi di Pengaturan.", "down");
      openSettings(); return;
    }
    if(!state.stockbitHistoricalEndpoint){
      if(typeof showToast === 'function') showToast("Endpoint Historical Data belum diisi di Pengaturan.", "down");
      openSettings(); return;
    }
    const range = isValidDateRange(state.hdAutoBulkFrom, state.hdAutoBulkTo);
    if(!range.valid){
      if(typeof showToast === 'function') showToast("Periode tidak valid: " + range.error, "down");
      return;
    }
    const checked = [...state.selectedForBacktest];
    const tickers = checked.length ? checked : getSorted(getFiltered()).map(s=>s.ticker);
    if(!tickers.length){
      if(typeof showToast === 'function') showToast("Tidak ada saham yang lolos filter / dicentang.", "down");
      return;
    }
    if(!confirmBulkFetch("menarik Historical Data", tickers.length, range.days + " hari")) return;
    fetchAndSaveHistoricalBulk(tickers, state.hdAutoBulkFrom, state.hdAutoBulkTo);
  };
  const hdBulkResultsPanel = document.getElementById("hdBulkResultsPanel");
  if(hdBulkResultsPanel) hdBulkResultsPanel.ontoggle = (e) => { state.hdBulkResultsOpen = e.target.open; };
  
  document.querySelectorAll("[data-sektor-toggle]").forEach(el=>{
    el.onclick = ()=>{
      const sek = el.dataset.sektorToggle;
      state.sektorExpanded.has(sek) ? state.sektorExpanded.delete(sek) : state.sektorExpanded.add(sek);
      render();
    };
  });
  bindSearchInputPreservingCursor("sektorSearchInput", (val) => { state.sektorSearch = val; });
  const sektorSortSelect = document.getElementById("sektorSortSelect");
  if(sektorSortSelect){
    sektorSortSelect.onchange = (e)=>{ state.sektorSort = e.target.value; render(); };
  }
  document.querySelectorAll("[data-mover-tab]").forEach(btn=>{
    btn.onclick = ()=>{ state.topMoversTab = btn.dataset.moverTab; render(); };
  });

  document.querySelectorAll("[data-detail]").forEach(b=> b.onclick=()=>openDetail(b.dataset.detail));
  document.querySelectorAll("[data-fav]").forEach(b=> b.onclick=()=>toggleFav(b.dataset.fav));
  document.querySelectorAll("[data-chart]").forEach(b=> b.onclick=()=>loadChart(b.dataset.chart));
  document.querySelectorAll("[data-stockbit-live]").forEach(b=> b.onclick=(e)=>{ e.stopPropagation(); fetchStockbitLive(b.dataset.stockbitLive); });
  document.querySelectorAll("[data-expand]").forEach(b=> b.onclick=()=>{
    const t = b.dataset.expand;
    state.expanded.has(t) ? state.expanded.delete(t) : state.expanded.add(t);
    render();
  });

  document.querySelectorAll("[data-del-bt-item]").forEach(btn=>{
    btn.onclick = ()=>{ const [sid,tk] = btn.dataset.delBtItem.split("|"); deleteBacktestItem(sid,tk); };
  });
  document.querySelectorAll("[data-bt-add-porto]").forEach(btn=>{
    btn.onclick = ()=>{ const [sid,tk] = btn.dataset.btAddPorto.split("|"); addBacktestItemToPortfolio(sid,tk); };
  });
  const btManualAddBtn = document.getElementById("btManualAddBtn");
  if(btManualAddBtn) btManualAddBtn.onclick = ()=>{
    addManualBacktest(
      document.getElementById("btManualSession").value,
      document.getElementById("btManualTicker").value,
      document.getElementById("btManualPrice").value,
      document.getElementById("btManualNote").value,
      document.getElementById("btManualDate").value
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

  // --- Broker Summary ---
  const bsStockCodeInput = document.getElementById("bsStockCode");
  if(bsStockCodeInput) bsStockCodeInput.onchange = (e) => { state.bsStockCode = e.target.value.trim().toUpperCase(); };
  const bsDateInput = document.getElementById("bsDate");
  if(bsDateInput) bsDateInput.onchange = (e) => { state.bsDate = e.target.value; };
  const bsLoadBtn = document.getElementById("bsLoadBtn");
  if(bsLoadBtn) bsLoadBtn.onclick = loadBrokerSummary;
  const bsSaveBtn = document.getElementById("bsSaveBtn");
  if(bsSaveBtn) bsSaveBtn.onclick = saveBrokerSummaryRows;
  const bsCsvFillBtn = document.getElementById("bsCsvFillBtn");
  if(bsCsvFillBtn) bsCsvFillBtn.onclick = fillBsFromCsv;
  const bsAutoBulkFromInput = document.getElementById("bsAutoBulkFromInput");
  if(bsAutoBulkFromInput) bsAutoBulkFromInput.onchange = (e) => {
    state.bsAutoBulkFrom = e.target.value || state.bsAutoBulkFrom;
    render();
  };
  const bsAutoBulkToInput = document.getElementById("bsAutoBulkToInput");
  if(bsAutoBulkToInput) bsAutoBulkToInput.onchange = (e) => {
    state.bsAutoBulkTo = e.target.value || state.bsAutoBulkTo;
    render();
  };
  const bsAutoBulkBtn = document.getElementById("bsAutoBulkBtn");
  if(bsAutoBulkBtn) bsAutoBulkBtn.onclick = () => fetchAndSaveBrokerSummaryBulk([...state.selectedForBacktest], state.bsAutoBulkFrom, state.bsAutoBulkTo);
  const bsBulkResultsPanel = document.getElementById("bsBulkResultsPanel");
  if(bsBulkResultsPanel) bsBulkResultsPanel.ontoggle = (e) => { state.bsBulkResultsOpen = e.target.open; };
  const bsEditorPanel = document.getElementById("bsEditorPanel");
  if(bsEditorPanel) bsEditorPanel.ontoggle = (e) => { state.bsEditorOpen = e.target.open; };

  // --- Target Bandar ---
  const tbStockCodeInput = document.getElementById("tbStockCode");
  if(tbStockCodeInput) tbStockCodeInput.onchange = (e) => { state.targetStockCode = e.target.value.trim().toUpperCase(); };
  const tbWindowDaysInput = document.getElementById("tbWindowDays");
  if(tbWindowDaysInput) tbWindowDaysInput.onchange = (e) => { state.targetWindowDays = Number(e.target.value)||20; };
  const tbLoadBtn = document.getElementById("tbLoadBtn");
  if(tbLoadBtn) tbLoadBtn.onclick = loadTargetWindow;
  const tbSaveCalcBtn = document.getElementById("tbSaveCalcBtn");
  if(tbSaveCalcBtn) tbSaveCalcBtn.onclick = saveTargetCalculation;
  const tbScopeSelect = document.getElementById("tbScopeSelect");
  if(tbScopeSelect) tbScopeSelect.onchange = (e) => { state.targetSummaryScope = e.target.value; };
  const tbHistoryBtn = document.getElementById("tbHistoryBtn");
  if(tbHistoryBtn) tbHistoryBtn.onclick = loadTargetHistory;

  // --- Entry Price Scanner ---
  const epsScanBtn = document.getElementById("epsScanBtn");
  if(epsScanBtn) epsScanBtn.onclick = runEntryPriceScan;
  const epsCsvBtn = document.getElementById("epsCsvBtn");
  if(epsCsvBtn) epsCsvBtn.onclick = exportEpsToCsv;
  const epsClearCacheBtn = document.getElementById("epsClearCacheBtn");
  if(epsClearCacheBtn) epsClearCacheBtn.onclick = clearEpsCache;
  document.querySelectorAll("[data-eps-filter]").forEach(btn=>{
    btn.onclick = () => setEpsFilter(btn.dataset.epsFilter, btn.dataset.epsValue);
  });
  document.querySelectorAll("[data-eps-sort]").forEach(btn=>{
    btn.onclick = () => toggleEpsSort(btn.dataset.epsSort);
  });
  const epsMinMutu = document.getElementById("epsMinMutu");
  if(epsMinMutu) epsMinMutu.onchange = (e)=> setEpsFilter("minMutu", Number(e.target.value)||0);
  const epsMinAkum = document.getElementById("epsMinAkum");
  if(epsMinAkum) epsMinAkum.onchange = (e)=> setEpsFilter("minAkum", Number(e.target.value)||0);
  const epsMinGap = document.getElementById("epsMinGap");
  if(epsMinGap) epsMinGap.onchange = (e)=> setEpsFilter("minGap", e.target.value);
  const epsInfoPanel = document.getElementById("epsInfoPanel");
  if(epsInfoPanel) epsInfoPanel.ontoggle = (e)=> { state.epsInfoOpen = e.target.open; };

  // --- Kraken Flow (ORCA) ---
  document.querySelectorAll("[data-orca-filter]").forEach(btn=>{
    btn.onclick = () => toggleOrcaFilter(btn.dataset.orcaFilter);
  });
  document.querySelectorAll("[data-orca-seg]").forEach(btn=>{
    btn.onclick = () => setOrcaSeg(btn.dataset.orcaSeg, btn.dataset.orcaValue);
  });
  bindSearchInputPreservingCursor("orcaSearchInput", (val) => { state.orcaSearch = val; });
  const orcaCustomCapInput = document.getElementById("orcaCustomCapInput");
  if(orcaCustomCapInput) orcaCustomCapInput.onchange = (e) => { state.orcaCustomCapT = e.target.value; render(); };
  const orcaResetBtn = document.getElementById("orcaResetBtn");
  if(orcaResetBtn) orcaResetBtn.onclick = resetOrcaFilters;
  const orcaCsvBtn = document.getElementById("orcaCsvBtn");
  if(orcaCsvBtn) orcaCsvBtn.onclick = exportOrcaToCsv;
  const orcaInfoPanel = document.getElementById("orcaInfoPanel");
  if(orcaInfoPanel) orcaInfoPanel.ontoggle = (e)=> { state.orcaInfoOpen = e.target.open; };
  const orcaHistoryRefreshBtn = document.getElementById("orcaHistoryRefreshBtn");
  if(orcaHistoryRefreshBtn) orcaHistoryRefreshBtn.onclick = () => { state.orcaHistoryByTicker = null; loadOrcaHistory(); };

  // --- Smart Pick ---
  document.querySelectorAll("[data-sp-toggle]").forEach(btn=>{
    btn.onclick = () => {
      const id = btn.dataset.spToggle;
      state.spOpenCriteria = (state.spOpenCriteria === id) ? null : id;
      render();
    };
  });
  document.querySelectorAll("[data-sp-ticker]").forEach(btn=>{
    btn.onclick = () => openDetail(btn.dataset.spTicker);
  });
  document.querySelectorAll("[data-sp-viewall]").forEach(btn=>{
    btn.onclick = () => openSmartPickList(btn.dataset.spViewall);
  });
  const spRecapHeader = document.getElementById("spRecapHeader");
  if(spRecapHeader) spRecapHeader.onclick = () => {
    state.spRecapCollapsed = !state.spRecapCollapsed;
    localStorage.setItem("ihsg_sp_recap_collapsed", state.spRecapCollapsed ? "1" : "0");
    render();
  };
  const spFinalizeBtn = document.getElementById("spFinalizeBtn");
  if(spFinalizeBtn) spFinalizeBtn.onclick = finalizeSmartPickSignals;
  const spFilterType = document.getElementById("spFilterType");
  if(spFilterType) spFilterType.onchange = (e) => { state.spFilterType = e.target.value; loadSmartPickHistory(); };
  const spFromInput = document.getElementById("spFromInput");
  if(spFromInput) spFromInput.onchange = (e) => { state.spFrom = e.target.value; loadSmartPickHistory(); };
  const spToInput = document.getElementById("spToInput");
  if(spToInput) spToInput.onchange = (e) => { state.spTo = e.target.value; loadSmartPickHistory(); };
  const spRefreshBtn = document.getElementById("spRefreshBtn");
  if(spRefreshBtn) spRefreshBtn.onclick = loadSmartPickHistory;
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
  if(state.tab === "smartpick" && !state.spHistory.length && !state.spHistoryLoading) loadSmartPickHistory();
  if(state.tab === "eps" && !state.epsRaw && !state.epsScanning) ensureEpsDataLoaded();
  if(state.tab === "kraken") ensureOrcaHistoryLoaded();
  render();
  if(window._closeSidebarDrawer) window._closeSidebarDrawer(); // di mobile: drawer nutup sendiri setelah pilih menu
});
document.getElementById("refreshBtn").onclick = ()=> loadLive();

// Sidebar collapsible (desktop) â€” status disimpan di localStorage supaya
// tetap keciut/lebar sama seperti terakhir dipilih user kalau halaman
// di-reload. + Sidebar sebagai MENU DRAWER di layar sempit (<=640px,
// lihat styles.css) â€” dibuka/ditutup lewat #hamburgerBtn di header,
// #sidebarDrawerClose, tap #sidebarBackdrop, tombol Esc, atau otomatis
// setelah memilih satu menu (lihat listener klik #tabs di atas).
(function initSidebarToggle(){
  const sidebar = document.getElementById("sidebarNav");
  const toggleBtn = document.getElementById("sidebarToggleBtn");
  if(!sidebar) return;

  if(toggleBtn){
    if(localStorage.getItem("ihsg_sidebar_collapsed") === "1") sidebar.classList.add("collapsed");
    toggleBtn.onclick = () => {
      const collapsed = sidebar.classList.toggle("collapsed");
      localStorage.setItem("ihsg_sidebar_collapsed", collapsed ? "1" : "0");
    };
  }

  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const backdrop = document.getElementById("sidebarBackdrop");
  const drawerCloseBtn = document.getElementById("sidebarDrawerClose");

  const openDrawer = () => {
    sidebar.classList.add("drawer-open");
    if(backdrop) backdrop.classList.add("show");
    if(hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden"; // kunci scroll body selagi drawer terbuka
  };
  const closeDrawer = () => {
    sidebar.classList.remove("drawer-open");
    if(backdrop) backdrop.classList.remove("show");
    if(hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };
  if(hamburgerBtn) hamburgerBtn.onclick = () => sidebar.classList.contains("drawer-open") ? closeDrawer() : openDrawer();
  if(backdrop) backdrop.onclick = closeDrawer;
  if(drawerCloseBtn) drawerCloseBtn.onclick = closeDrawer;
  document.addEventListener("keydown", (e) => { if(e.key === "Escape") closeDrawer(); });
  // Kalau layar dilebarkan balik ke ukuran desktop (mis. rotate tablet /
  // resize jendela), pastikan drawer tidak "nyangkut" ke luar layar.
  window.matchMedia("(min-width: 641px)").addEventListener("change", (e) => { if(e.matches) closeDrawer(); });
  window._closeSidebarDrawer = closeDrawer; // dipanggil dari listener klik #tabs
})();

document.getElementById("portoModalClose").onclick = ()=> resetPortoForm();
document.getElementById("portoModalOverlay").onclick = (e)=>{ if(e.target.id==="portoModalOverlay") resetPortoForm(); };
document.getElementById("detailModalClose").onclick = ()=> closeDetail();
document.getElementById("detailModalOverlay").onclick = (e)=>{ if(e.target.id==="detailModalOverlay") closeDetail(); };
document.getElementById("spListModalClose").onclick = ()=> closeSmartPickList();
document.getElementById("spListModalOverlay").onclick = (e)=>{ if(e.target.id==="spListModalOverlay") closeSmartPickList(); };

loadSettings();
syncStockbitTokenFromSupabase();
pollExtensionStockbitToken();
setInterval(pollExtensionStockbitToken, 3000); // lihat catatan di pollExtensionStockbitToken() kenapa harus di-poll, bukan cukup event 'storage'
loadLive();

// ==========================================
// AUTO-REFRESH HARGA LIVE â€” sebelumnya loadLive() cuma dipanggil sekali saat
// page load, jadi tab yang dibiarkan terbuka lama menampilkan harga basi.
// Sekarang dijadwalkan ulang tiap LIVE_REFRESH_INTERVAL_MS, dengan 2 pengaman:
// 1. Diskip kalau tab sedang di background (document.hidden) â€” hemat request,
//    dan begitu tab dibuka lagi langsung refresh sekali (visibilitychange)
//    supaya tidak perlu nunggu interval penuh.
// 2. Diskip kalau user sedang fokus mengetik di input/textarea/select manapun
//    (search box, form manual Broker Summary, dsb.) â€” render() replace
//    innerHTML, jadi kalau dipaksa refresh di tengah ketikan akan reset fokus
//    & nilai yang belum ke-commit ke state. Kalau sedang diskip, otomatis
//    dicoba lagi di siklus interval berikutnya (tidak hilang, cuma ditunda).
// ==========================================
const LIVE_REFRESH_INTERVAL_MS = 45000; // 45 detik â€” cukup sering tanpa membebani Supabase/Stockbit
let liveRefreshInFlight = false;

function shouldSkipAutoRefreshLive(){
  const el = document.activeElement;
  return !!(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT"));
}

async function autoRefreshLiveTick(){
  if(liveRefreshInFlight || document.hidden || shouldSkipAutoRefreshLive()) return;
  liveRefreshInFlight = true;
  try{ await loadLive(); } finally { liveRefreshInFlight = false; }
}

setInterval(autoRefreshLiveTick, LIVE_REFRESH_INTERVAL_MS);
document.addEventListener("visibilitychange", () => { if(!document.hidden) autoRefreshLiveTick(); });

// ==========================================
// AUTO-REFRESH LIVE STOCKBIT (Screener) â€” beda dari AUTO-REFRESH HARGA LIVE
// di atas (yang narik dari Supabase). Ini khusus buat kolom "ðŸ”´ Live
// Stockbit" di tabel Screener, dan SENGAJA jauh lebih hati-hati karena:
//
// 1. Pakai token pribadi user ke API tidak resmi â€” tiap siklus bisa memicu
//    N request berurutan (N = jumlah saham dicentang / lolos filter).
// 2. Makanya ada 3 pengaman TAMBAHAN di luar yang sudah dipakai
//    autoRefreshLiveTick() (skip kalau tab background / user sedang ngetik):
//      a. Cuma jalan kalau tab "screener" yang sedang dibuka (state.tab) â€”
//         tidak berguna narik data ini kalau user sedang di tab lain.
//      b. Interval MINIMAL 30 detik (STOCKBIT_AUTOREFRESH_MIN_SEC), tidak
//         bisa diset lebih cepat dari itu lewat dropdown.
//      c. Kalau jumlah ticker (dicentang, atau semua yang lolos filter
//         kalau tak ada yang dicentang) melebihi STOCKBIT_AUTOREFRESH_MAX_TICKERS,
//         auto-refresh DIJEDA OTOMATIS (bukan dimatikan â€” toggle tetap ON,
//         tinggal skip siklus itu) sampai user mempersempit filter atau
//         mencentang saham tertentu. Badge peringatan sudah muncul di UI
//         Screener kalau kondisi ini aktif.
// 3. Dipakai clock 5 detik (bukan setInterval langsung sebesar interval
//    pilihan user) supaya ganti pilihan dropdown interval efektif LANGSUNG
//    di siklus berikutnya, tanpa perlu clearInterval/setInterval ulang.
// ==========================================
let stockbitAutoRefreshInFlight = false;
let lastStockbitAutoRefreshAt = 0;

function getStockbitAutoRefreshTickers(){
  const checked = [...state.selectedForBacktest];
  return checked.length ? checked : getSorted(getFiltered()).map(s=>s.ticker);
}

async function stockbitAutoRefreshTick(){
  if(!state.stockbitAutoRefresh || !state.stockbitToken) return;
  if(state.tab !== "screener") return;
  if(document.hidden || shouldSkipAutoRefreshLive()) return;
  if(stockbitAutoRefreshInFlight || state.stockbitBulkLoading) return;

  const tickers = getStockbitAutoRefreshTickers();
  if(!tickers.length || tickers.length > STOCKBIT_AUTOREFRESH_MAX_TICKERS) return;

  stockbitAutoRefreshInFlight = true;
  try{ await fetchStockbitLiveBulk(tickers); }
  finally{ stockbitAutoRefreshInFlight = false; }
}




function stockbitAutoRefreshClockTick(){
  if(!state.stockbitAutoRefresh) return;
  const intervalMs = Math.max(STOCKBIT_AUTOREFRESH_MIN_SEC, state.stockbitAutoRefreshIntervalSec||60) * 1000;
  if(Date.now() - lastStockbitAutoRefreshAt < intervalMs) return;
  lastStockbitAutoRefreshAt = Date.now();
  stockbitAutoRefreshTick();
}

setInterval(stockbitAutoRefreshClockTick, 5000); // "jam" granularitas 5 detik, lihat catatan poin 3 di atas
document.addEventListener("visibilitychange", () => { if(!document.hidden) stockbitAutoRefreshClockTick(); });


// ==========================================
// FITUR: MARKET STATUS INDICATOR (WIB)
// ==========================================
function getMarketStatus() {
  const now = new Date();
  const wibMs = now.getTime() + (7 * 60 * 60 * 1000) - (now.getTimezoneOffset() * 60000);
  const wib = new Date(wibMs);
  const day = wib.getUTCDay();
  const hour = wib.getUTCHours();
  const minute = wib.getUTCMinutes();
  const t = hour * 100 + minute;
  if (day === 0 || day === 6) return { label: "Minggu", color: "var(--muted)", icon: "ðŸ”´", desc: "Bursa tutup (weekend)" };
  if (t < 830)  return { label: "Pre-Market", color: "var(--gold)", icon: "ðŸŸ¡", desc: "Sesi pra-pembukaan" };
  if (t < 900)  return { label: "Opening", color: "var(--up)", icon: "ðŸŸ¢", desc: "Sesi pembukaan (auction)" };
  if (t < 1200) return { label: "Buka", color: "var(--up)", icon: "ðŸŸ¢", desc: "Sesi perdagangan 1" };
  if (t < 1300) return { label: "Istirahat", color: "var(--gold)", icon: "ðŸŸ¡", desc: "Jeda istirahat makan siang" };
  if (t < 1500) return { label: "Buka", color: "var(--up)", icon: "ðŸŸ¢", desc: "Sesi perdagangan 2" };
  if (t < 1600) return { label: "Closing", color: "var(--gold)", icon: "ðŸŸ¡", desc: "Sesi penutupan (closing auction)" };
  return { label: "Tutup", color: "var(--muted)", icon: "ðŸ”´", desc: "Bursa sudah tutup" };
}

function updateMarketStatusUI() {
  const el = document.getElementById("marketStatus");
  if (!el) return;
  const s = getMarketStatus();
  el.innerHTML = `<span class="pill pill-muted" style="border-color:${s.color};color:${s.color};font-size:11px;">${s.icon} ${s.label} Â· WIB</span>`;
  el.title = s.desc;
}


// ==========================================
// FITUR: KEYBOARD SHORTCUTS
// ==========================================
document.addEventListener("keydown", (e) => {
  const tag = e.target.tagName;
  const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  // Ctrl/Cmd+K = Quick search di Screener
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    state.tab = "screener"; render();
    setTimeout(() => { const el = document.getElementById("searchInput"); if(el){ el.focus(); el.select(); } }, 100);
    return;
  }
  if (isInput) return;
  // 1-9 = switch tab
  const tabMap = { "1":"screener","2":"smartpick","3":"sektoral","4":"watchlist","5":"backtest","6":"portfolio","7":"chart","8":"brokersum","9":"target" };
  if (tabMap[e.key]) {
    state.tab = tabMap[e.key]; render();
    if(state.tab==="smartpick" && !state.spHistory.length) loadSmartPickHistory();
    return;
  }
  // Escape = close modals
  if (e.key === "Escape") {
    if(state.detailTicker) closeDetail();
    else if(state.portoModalOpen) resetPortoForm();
    else if(state.spListOpenDefId) closeSmartPickList();
    return;
  }
  // R = refresh data
  if (e.key === "r" || e.key === "R") { e.preventDefault(); loadLive(); }
});


// ==========================================
// FITUR: VALIDASI TOKEN & ENDPOINT STOCKBIT
// Dipakai tombol-tombol tarik data supaya gagal cepat dengan pesan jelas,
// bukan diam-diam fetch ratusan request ke endpoint yang salah.
// ==========================================
function isValidStockbitToken(token) {
  if (!token || typeof token !== 'string') return false;
  const t = sanitizeStockbitToken(token);
  if (t.length < 20) return false;
  if (/^(token|your_token|bearer|xxx)$/i.test(t)) return false;
  return true;
}

function isStockbitQuoteEndpointValid() {
  const ep = (state.stockbitQuoteEndpoint || "").trim();
  if (!ep) return false;
  if (typeof STOCKBIT_DEFAULT_QUOTE_EP !== 'undefined' && ep === STOCKBIT_DEFAULT_QUOTE_EP) return false;
  return ep.includes('{ticker}');
}

function isValidDateRange(from, to) {
  if (!from || !to) return { valid: false, error: 'Tanggal Dari dan Sampai harus diisi' };
  const f = new Date(from), t = new Date(to);
  if (isNaN(f.getTime()) || isNaN(t.getTime())) return { valid: false, error: 'Format tanggal tidak valid' };
  if (f > t) return { valid: false, error: 'Tanggal Dari harus sebelum tanggal Sampai' };
  const days = Math.ceil((t - f) / 86400000);
  if (days > 365) return { valid: false, error: 'Maksimal rentang 1 tahun' };
  return { valid: true, days };
}

function confirmBulkFetch(actionLabel, tickerCount, daysInfo) {
  const msg = daysInfo
    ? `Akan ${actionLabel} untuk ${tickerCount} saham dalam ${daysInfo}. Bisa memakan waktu & banyak request. Lanjutkan?`
    : `Akan ${actionLabel} untuk ${tickerCount} saham. Lanjutkan?`;
  if (tickerCount <= 10) return true; // sedikit â€” tidak perlu konfirmasi
  return confirm(msg);
}


// ==========================================
// FITUR: MARKET STATUS INDICATOR (WIB)
// Element #marketStatus dibuat otomatis di header kalau belum ada â€”
// tidak perlu edit index.html.
// ==========================================
function getMarketStatus() {
  const now = new Date();
  const wibMs = now.getTime() + (7 * 60 * 60 * 1000) - (now.getTimezoneOffset() * 60000);
  const wib = new Date(wibMs);
  const day = wib.getUTCDay();
  const t = wib.getUTCHours() * 100 + wib.getUTCMinutes();
  if (day === 0 || day === 6) return { label: "Tutup", color: "var(--muted)", icon: "ðŸ”´", desc: "Bursa tutup (weekend)" };
  if (t < 830)  return { label: "Pre-Market", color: "var(--gold)", icon: "ðŸŸ¡", desc: "Sesi pra-pembukaan" };
  if (t < 900)  return { label: "Opening", color: "var(--up)", icon: "ðŸŸ¢", desc: "Sesi pembukaan (auction)" };
  if (t < 1200) return { label: "Buka", color: "var(--up)", icon: "ðŸŸ¢", desc: "Sesi perdagangan 1" };
  if (t < 1300) return { label: "Istirahat", color: "var(--gold)", icon: "ðŸŸ¡", desc: "Jeda istirahat" };
  if (t < 1500) return { label: "Buka", color: "var(--up)", icon: "ðŸŸ¢", desc: "Sesi perdagangan 2" };
  if (t < 1600) return { label: "Closing", color: "var(--gold)", icon: "ðŸŸ¡", desc: "Sesi penutupan" };
  return { label: "Tutup", color: "var(--muted)", icon: "ðŸ”´", desc: "Bursa sudah tutup" };
}

function updateMarketStatusUI() {
  let el = document.getElementById("marketStatus");
  if (!el) {
    const headerRow = document.querySelector(".header .header-row");
    if (!headerRow) return;
    el = document.createElement("span");
    el.id = "marketStatus";
    headerRow.appendChild(el);
  }
  const s = getMarketStatus();
  el.innerHTML = `<span class="pill pill-muted" style="border-color:${s.color};color:${s.color};font-size:11px;">${s.icon} ${s.label} Â· WIB</span>`;
  el.title = s.desc;
}
setInterval(() => { if(typeof updateMarketStatusUI === 'function') updateMarketStatusUI(); }, 60000);


// ==========================================
// FITUR: KEYBOARD SHORTCUTS
// Ctrl+K = cari Â· 1-9 = pindah tab Â· Esc = tutup modal Â· R = refresh
// ==========================================
document.addEventListener("keydown", (e) => {
  const tag = e.target.tagName;
  const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    state.tab = "screener"; render();
    setTimeout(() => { const el = document.getElementById("searchInput"); if(el){ el.focus(); el.select(); } }, 100);
    return;
  }
  if (isInput) return;
  const tabMap = { "1":"screener","2":"smartpick","3":"sektoral","4":"watchlist","5":"backtest","6":"portfolio","7":"chart","8":"brokersum","9":"target" };
  if (tabMap[e.key]) {
    state.tab = tabMap[e.key]; render();
    if(state.tab==="smartpick" && !state.spHistory.length) loadSmartPickHistory();
    return;
  }
  if (e.key === "Escape") {
    if(state.detailTicker) closeDetail();
    else if(state.portoModalOpen) resetPortoForm();
    else if(state.spListOpenDefId) closeSmartPickList();
    return;
  }
  if (e.key === "r" || e.key === "R") { e.preventDefault(); loadLive(); }
});

// ==========================================
// PWA: daftarkan service worker supaya browser menganggap app ini
// "installable" (syarat "Add to Home Screen"/install prompt di Android
// Chrome; iOS Safari tidak butuh service worker tapi tetap aman didaftarkan).
// Dibungkus try/catch + cek 'serviceWorker' in navigator karena:
//  - Kalau halaman ini masih dibuka lewat file:// (bukan http/https),
//    registrasi service worker akan gagal/ditolak browser â€” itu WAJAR,
//    bukan bug. Fitur install penuh baru aktif kalau di-hosting via HTTPS
//    (lihat catatan PWA_HOSTING.md).
// ==========================================
if("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => { /* diamkan â€” bukan fatal */ });
  });
}

// Fungsi Pemanis UI: Membuat baris tabel berkedip saat ada data live masuk
window.updateLivePriceUI = function(ticker, currentPrice, prevPrice) {
    if (!currentPrice || currentPrice === prevPrice) return;
    const row = document.getElementById('row-' + ticker);
    if (row) {
        // Hijau jika naik, Merah jika turun
        const flashColor = currentPrice > prevPrice ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)';
        row.style.transition = 'none';
        row.style.backgroundColor = flashColor;
        
        // Hilangkan warna setelah setengah detik
        setTimeout(() => {
            row.style.transition = 'background-color 0.8s ease';
            row.style.backgroundColor = '';
        }, 500);
    }
}

window.calculatePositionSizing = function(entryPrice, slPrice) {
  const capital = parseFloat(document.getElementById('calcCapital').value) || 0;
  const riskPct = parseFloat(document.getElementById('calcRiskPct').value) || 0;
  
  if (!capital || !riskPct || !entryPrice || !slPrice || entryPrice <= slPrice) {
    document.getElementById('calcResultStr').innerHTML = 'Maksimal Pembelian: <span style="color:var(--muted)">- Lot</span>';
    return;
  }

  const riskAmount = capital * (riskPct / 100);
  const lossPerShare = entryPrice - slPrice;
  const lossPerLot = lossPerShare * 100;
  
  const maxLot = Math.floor(riskAmount / lossPerLot);
  const totalValue = maxLot * 100 * entryPrice;
  
  document.getElementById('calcResultStr').innerHTML = 
    `Maksimal Pembelian: <span style="color:var(--up)">${fmtNum(maxLot)} Lot</span><br>
     <span style="font-size: 12px; color: var(--muted); font-weight: 500;">(Total Beli: Rp ${fmtNum(totalValue)} | Potensi Rugi: Rp ${fmtNum(riskAmount)})</span>`;
};

function playAlertSound() {
    // Suara notifikasi singkat (bebas diganti URL audionya)
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
    audio.play().catch(e => console.log("Autoplay diblokir browser, user harus interaksi dengan layar dulu.", e));
}

function showToast(message, tone = "up") {
    let container = document.getElementById('toastContainer');
    if(!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = `var(--${tone})`;
    toast.innerHTML = `<div style="font-size:11px;">${escapeHtml(message)}</div>`;
    
    container.appendChild(toast);
    playAlertSound();
    
    // Hilang otomatis setelah 5 detik
    setTimeout(() => { 
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}




// ==========================================
// ðŸ¥· WEBSOCKET INTERCEPTOR (DAY TRADE MODE)
// ==========================================

// 1. Fungsi Parser Mentah
// Bertugas menerjemahkan data string ajaib dari Stockbit menjadi JSON (Objek)
function parseStockbitWsMessage(rawString) {
    try {
        let cleanStr = rawString;
        
        // Pipa WebSocket sering menambahkan angka di depan (misal: "42[...]")
        // Kita bersihkan dulu angka di depannya agar bisa di-parse sebagai JSON
        if (/^\d+/.test(cleanStr)) {
            cleanStr = cleanStr.replace(/^\d+/, '');
        }
        
        if (!cleanStr) return null;
        
        const parsed = JSON.parse(cleanStr);
        return parsed; 
    } catch (e) {
        // Jika format bukan JSON, biarkan lewat
        return null;
    }
}

// 2. Fungsi Update Data & Logika Day Trade
function handleLiveTick(parsedData) {
    /* 
       âš ï¸ CATATAN UNTUK BESOK: 
       Kita belum tahu pasti nama field yang dipakai Stockbit di WebSocket mereka.
       Asumsi sementara, strukturnya memuat: { symbol: "BBCA", price: 10000, volume: 50000 }
       Besok kita sesuaikan bagian ini setelah melihat data aslinya di Console!
    */
    
    // (Contoh Kerangka) Jika data berupa array, biasanya data ada di index ke-1
    const payload = Array.isArray(parsedData) ? parsedData[1] : parsedData;
    if (!payload) return;

    // Asumsi nama field dari Stockbit (Akan kita revisi besok)
    const ticker = payload.symbol || payload.code; 
    const currentPrice = payload.price || payload.last;
    const currentVol = payload.volume || payload.vol;

    if (!ticker) return;

    // Pastikan state saham live sudah siap
    if (!state.stockbitLive[ticker]) {
        state.stockbitLive[ticker] = { loading: false, error: null, mapped: {} };
    }

    const prevPrice = state.stockbitLive[ticker].mapped.last;

    // Perbarui State Harga
    state.stockbitLive[ticker].mapped = {
        ...state.stockbitLive[ticker].mapped,
        last: currentPrice || prevPrice,
        volume: currentVol || state.stockbitLive[ticker].mapped.volume
    };
    state.stockbitLive[ticker].fetchedAt = Date.now();

    // ðŸ”¥ LOGIKA DETEKSI VOLUME SPIKE (DAY TRADE)
    const dbData = state.stocks.find(s => s.ticker === ticker);
    if (dbData && dbData.cVol && currentVol) {
         // Jika volume lompat 20% dari EOD sebelumnya dengan sangat cepat
         if (currentVol > (dbData.cVol * 1.2)) {
             state.stockbitLive[ticker].intradaySpike = true;
         }
    }

    // Perbarui UI jika saham ini sedang dirender di layar
    updateLivePriceUI(ticker, currentPrice, prevPrice);
}

// 3. Fungsi Pemanis UI (Berkedip Hijau/Merah)
function updateLivePriceUI(ticker, currentPrice, prevPrice) {
    if (!currentPrice || currentPrice === prevPrice) return;

    // Cari elemen di DOM yang menampilkan harga saham ini
    // (Pastikan tabel screener Anda memiliki class/id yang mudah ditarget)
    const priceCells = document.querySelectorAll(`.ticker-row-${ticker} .price-cell`);
    
    priceCells.forEach(cell => {
        cell.textContent = fmtNum(currentPrice);
        
        // Efek Kedip Harga (Naik = Hijau, Turun = Merah)
        const flashColor = currentPrice > prevPrice ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)';
        cell.style.transition = 'none';
        cell.style.backgroundColor = flashColor;
        
        setTimeout(() => {
            cell.style.transition = 'background-color 0.5s ease';
            cell.style.backgroundColor = 'transparent';
        }, 300);
    });
}

// 4. Listener Utama Penangkap Sinyal Ekstensi
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'FROM_EXTENSION_WS') {
      
      // LOG INI SANGAT PENTING UNTUK BESOK PAGI! 
      // Kita akan cek struktur aslinya dari sini.
      console.log("ðŸ“¥ WS RAW:", event.data.data); 
      
      const parsed = parseStockbitWsMessage(event.data.data);
      if (parsed) {
          handleLiveTick(parsed);
      }
  }
});

window.calcAveraging = function(oldPrice, oldLot) {
    const newPrice = parseFloat(document.getElementById('avgNewPrice').value) || 0;
    const newLot = parseFloat(document.getElementById('avgNewLot').value) || 0;
    const resEl = document.getElementById('avgResult');

    if (!newPrice || !newLot || !oldPrice || !oldLot) {
        resEl.innerHTML = 'Harga Rata-rata Baru: <span style="color:var(--muted)">-</span>';
        return;
    }

    const totalOldValue = oldPrice * oldLot;
    const totalNewValue = newPrice * newLot;
    const totalLot = oldLot + newLot;
    const avgPrice = (totalOldValue + totalNewValue) / totalLot;

    resEl.innerHTML = `Harga Rata-rata Baru: <span style="color:var(--up); font-size:18px;">Rp ${fmtNum(Math.round(avgPrice))}</span> <span style="font-size:12px;color:var(--muted); font-weight:normal;">(Total Kepemilikan: ${totalLot} Lot)</span>`;
}
