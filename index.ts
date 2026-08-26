// ==========================================================
// telegram-notifier — Supabase Edge Function
//
// TUJUAN: dipanggil berkala oleh Cron (lihat sql/06_telegram_notifikasi.sql),
// mengecek saham mana yang lolos preset Rules Kustom yang kamu pilih di
// ⚙️ Pengaturan > Notifikasi Telegram, lalu mengirim notifikasi ke
// Telegram untuk saham BARU yang baru lolos hari ini (yang sudah pernah
// dikirim untuk preset+tanggal yang sama TIDAK dikirim ulang).
//
// Jalan di server (bukan browser) supaya tetap terkirim walau aplikasi
// tidak sedang dibuka.
//
// CARA DEPLOY (dari terminal, folder project Supabase-mu):
//   supabase functions deploy telegram-notifier --no-verify-jwt
//
// Lalu jadwalkan lewat pg_cron (lihat sql/06_telegram_notifikasi.sql)
// atau lewat tab "Cron" di Supabase Dashboard > Edge Functions.
//
// Bisa juga dipanggil manual untuk TEST dengan body {"test": true} —
// dalam mode ini fungsi langsung kirim 1 pesan test ke chat_id yang
// tersimpan, tanpa mengecek preset apa pun. Tombol "Uji Kirim Notifikasi"
// di aplikasi memakai mode ini.
// ==========================================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// service_role dipakai di sini (bukan anon) karena fungsi ini jalan di
// server sepenuhnya, perlu baca telegram_settings/custom_presets/
// stocks_screener dan menulis telegram_notified_log tanpa terhalang RLS
// yang ditulis untuk anon key di client. Supabase otomatis menyediakan
// env var ini untuk Edge Function — tidak perlu diisi manual sebagai
// secret terpisah.
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function sbHeaders() {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}

// -----------------------------------------------------------
// PORTINGAN dari app.js: mapping LENGKAP stocks_screener (152 kolom)
// -> camelCase, sama persis dengan loadLive() di client. Diperluas
// dari versi sebelumnya (yang cuma cukup untuk Rules Kustom) supaya
// juga cukup untuk evaluasi 9 Preset DSI bawaan (butuh field seperti
// cekHarga/cekRsi/statusRsi/trendHarga/uangGedeMasuk/isBBSqueeze dll
// yang sebelumnya tidak dipetakan di sini).
// -----------------------------------------------------------
function numOrNull(n: unknown): number | null {
  if (n === null || n === undefined || n === "") return null;
  const v = parseFloat(String(n));
  return isNaN(v) ? null : v;
}
function boolLabel(v: unknown): string {
  if (v===true || v==="true" || v==="Ya" || v===1 || v==="1") return "Ya";
  if (v===false || v==="false" || v==="Tidak" || v===0 || v==="0") return "Tidak";
  return (v as string) ?? "-";
}

// deno-lint-ignore no-explicit-any
function mapRow(r: any) {
  return {
    ticker: r.ticker, sektor: r.sector, name: r.name, industry: r.industry,
    syariah: r.syariah, // fallback SYARIAH_TICKERS di app.js sengaja tidak diporting ke sini —
                         // tidak ada preset DSI/rule bawaan yang bergantung ke field ini
    cOpen: r.c_open, cHigh: r.day_high, cLow: r.day_low, cClose: r.price, cVol: r.volume,
    changePct: r.change_pct, turnover: r.turnover, valueTraded: numOrNull(r.value_traded), vwap20: r.vwap20,
    volRatio: numOrNull(r.vol_ratio), volMA20: numOrNull(r.vol_ma20), avgVolume3m: numOrNull(r.avg_volume_3m),
    frequency: numOrNull(r.frequency ?? r.frekuensi),
    freqAnalyzer: numOrNull(r.freq_ma20 ?? r.frequency_ma20),
    avgFrequency3m: numOrNull(r.avg_frequency_3m ?? r.avg_frekuensi_3m),
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
    rsi7: r.rsi7, rsi21: r.rsi21, hist: r.macd_hist, histPrev: 0,
    fib: r.fibonacci,
    cekHarga: r.cek_harga, cekRsi: r.cek_rsi, statusRsi: r.status_rsi, cekMacd: r.cek_macd, cekVolume: r.cek_volume,
    keyakinanNaik: r.keyakinan_naik,
    trendHarga: r.trend_harga, candleKemarin: r.candle_kemarin, candleHariIni: r.candle_hari_ini, polaCandle: r.pola_candle,
    uangGedeMasuk: boolLabel(r.uang_gede_masuk), bbWidth: numOrNull(r.bb_width),
    isBBSqueeze: boolLabel(r.is_bb_squeeze), atr14: numOrNull(r.atr14), valuasi: r.valuasi ?? "-", clv: numOrNull(r.clv),
    ema89: numOrNull(r.ema89), prevHigh: numOrNull(r.prev_high), prevLow: numOrNull(r.prev_low), prevVol: numOrNull(r.prev_vol),
    stochK: numOrNull(r.stoch_k), stochD: numOrNull(r.stoch_d), prevStochK: numOrNull(r.prev_stoch_k), prevStochD: numOrNull(r.prev_stoch_d),
    prevClose: numOrNull(r.prev_close), macd: numOrNull(r.macd), signal: numOrNull(r.signal),
    changeAbs: numOrNull(r.change_abs),
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
    capCategory: r.cap_category, pos52w: numOrNull(r.pos_52w),
    sharesOutstanding: numOrNull(r.shares_outstanding),
    marketCap: numOrNull(r.market_cap) ?? (numOrNull(r.shares_outstanding) != null ? (numOrNull(r.shares_outstanding) as number) * (numOrNull(r.price) || 0) : null),
    vsMa50Pct: numOrNull(r.vs_ma50_pct), vsMa200Pct: numOrNull(r.vs_ma200_pct),
    foreignNet1D: numOrNull(r.foreign_net_1d), foreignNet5D: numOrNull(r.foreign_net_5d),
    foreignNet20D: numOrNull(r.foreign_net_20d), foreignUpDays: numOrNull(r.foreign_up_days),
    avgTicket: numOrNull(r.avg_ticket), crossingPct: numOrNull(r.crossing_pct),
    flowDate: r.flow_date, flowDays: numOrNull(r.flow_days),
    volChangePct: (numOrNull(r.prev_vol) != null && numOrNull(r.prev_vol) !== 0 && numOrNull(r.volume) != null)
      ? (((numOrNull(r.volume) as number) - (numOrNull(r.prev_vol) as number)) / (numOrNull(r.prev_vol) as number)) * 100
      : null,
  };
}

// -----------------------------------------------------------
// PORTINGAN dari app.js: sinyal turunan (bandarmologi, volume,
// keyakinan naik) + Skor Bagger komposit + enrichRow() — dibutuhkan
// supaya 9 Preset DSI bawaan bisa dievaluasi (Rules Kustom TIDAK
// butuh ini, cukup mapRow() + evalCustomRule() di bawah).
// -----------------------------------------------------------
// deno-lint-ignore no-explicit-any
function bandarmologi(row: any, ratio: number){
  const naik = row.cClose>row.cOpen;
  if(ratio>=1.5 && naik) return {label:"Indikasi Akumulasi", tone:"up"};
  if(ratio>=1.5 && !naik) return {label:"Indikasi Distribusi", tone:"down"};
  if(ratio>=1.0 && naik) return {label:"Minat Beli Naik", tone:"up"};
  if(ratio>=1.0 && !naik) return {label:"Tekanan Jual", tone:"down"};
  return {label:"Netral", tone:"muted"};
}
// deno-lint-ignore no-explicit-any
function computeBaggerScore(s: any){
  const num = (v: unknown) => (v===null || v===undefined || v==="" || isNaN(v as number)) ? null : Number(v);
  const rsi14 = num(s.rsi14);
  const rsiCrossUp = String(s.cekRsi||"").toLowerCase().includes("cross up");

  const fundItems = [
    { pass: num(s.revenueGrowth) as number > 15, points:10 },
    { pass: num(s.earningsGrowth) as number > 20, points:10 },
    { pass: num(s.roe) as number > 15, points:10 },
    { pass: num(s.der) != null && (num(s.der) as number) < 0.8, points:5 },
    { pass: num(s.peg) != null && (num(s.peg) as number) > 0 && (num(s.peg) as number) < 1, points:5 },
  ];
  const momItems = [
    { pass: rsiCrossUp && rsi14 != null && rsi14 < 70, points:10 },
    { pass: num(s.prevMacdHist) != null && num(s.hist) != null && (num(s.prevMacdHist) as number) <= 0 && (num(s.hist) as number) > 0, points:10 },
    { pass: [s.cClose,s.ma21,s.ma50,s.ma200].every((v: unknown)=>v!=null) && s.cClose > s.ma21 && s.ma21 > s.ma50 && s.ma50 > s.ma200, points:10 },
    { pass: [s.prevStochK,s.prevStochD,s.stochK,s.stochD].every((v: unknown)=>v!=null) && s.prevStochK < s.prevStochD && s.stochK > s.stochD && s.prevStochK <= 30, points:5 },
  ];
  const volItems = [
    { pass: num(s.volRatio) as number > 1.5, points:10 },
    { pass: num(s.foreignNet5D) as number > 0 && num(s.foreignUpDays) as number >= 3, points:10 },
    { pass: String(s.isBBSqueeze||"").includes("Ya") && s.cClose != null && s.ema21H != null && s.cClose > s.ema21H, points:5 },
  ];
  const sum = (items: {pass: boolean, points: number}[]) => items.reduce((a,i)=> a + (i.pass ? i.points : 0), 0);
  const total = sum(fundItems) + sum(momItems) + sum(volItems);
  return { total };
}
// deno-lint-ignore no-explicit-any
function enrichRow(s: any){
  const ratio = (s.volRatio!=null && !isNaN(s.volRatio)) ? s.volRatio : (s.cVol/(s.volMA20||1));
  const band = bandarmologi(s, ratio);
  const freqBase = s.freqAnalyzer ?? s.avgFrequency3m ?? null;
  const freqRatio = (s.frequency!=null && freqBase) ? (s.frequency/freqBase) : null;
  const bagger = computeBaggerScore({ ...s, volRatio: ratio });
  return { ...s, band, volRatio: ratio, freqRatio, baggerScoreTotal: bagger.total };
}

// -----------------------------------------------------------
// PORTINGAN PERSIS dari getFiltered() di app.js — 9 Preset DSI bawaan.
// PENTING: kalau logika preset di app.js diubah/ditambah, fungsi ini
// WAJIB disinkronkan manual juga (client & server jalan di runtime
// terpisah, tidak ada mekanisme "satu sumber" otomatis).
// -----------------------------------------------------------
const PRESET_LABELS: Record<string,string> = {
  bagger:"Skor Bagger ≥75", eri:"Eri Ginanjar", rsicross:"RSI & Harga Cross", golden:"Golden Cross DSI",
  uptrend:"Super Uptrend", breakout:"Volatility Breakout", pullback:"Pullback Uptrend",
  custom_bandar:"BPJS", asing_akumulasi:"Akumulasi Asing (IDX)", freq_spike:"Lonjakan Frekuensi",
};
// deno-lint-ignore no-explicit-any
function presetPasses(s: any, key: string): boolean {
  if(key === 'bagger') {
    if ((s.baggerScoreTotal||0) < 75) return false;
  } else if(key === 'eri') {
    if (!(s.rsi7 >= 58 && s.rsi7 <= 70 && s.rsi21 >= 50 && s.rsi21 <= 70 && s.rsi7 > s.rsi21)) return false;
    if (!(s.cClose > s.ema21H && s.cClose <= s.ema21H * 1.03 && s.cClose > s.ema89)) return false;
    if (!(s.cHigh > s.prevHigh && s.cLow > s.prevLow && s.cVol > s.prevVol)) return false;
    if (!(s.prevStochK < s.prevStochD && s.stochK > s.stochD)) return false;
  } else if(key === 'rsicross') {
    if (!(s.rsi7 >= 58 && s.rsi7 <= 75 && s.rsi21 >= 50 && s.rsi21 <= 75 && s.rsi7 > s.rsi21)) return false;
    if (!(s.cLow < s.ema21L && s.cClose > s.ema21H && s.cClose > s.cOpen)) return false;
    if (!(s.cClose >= (s.cHigh + s.cLow)/2 && s.turnover > 200000000 && s.cClose > s.ma100)) return false;
  } else if(key === 'golden') {
    if (!(s.histPrev <= 0 && s.hist > 0)) return false;
    if (!(s.prevStochK < s.prevStochD && s.stochK > s.stochD)) return false;
  } else if (key === 'uptrend') {
    if (!(s.cClose > s.ma21 && s.ma21 > s.ma50 && s.ma50 > s.ma100 && s.ma100 > s.ma200)) return false;
  } else if (key === 'breakout') {
    if (s.isBBSqueeze && String(s.isBBSqueeze).indexOf("Ya") === -1) return false;
    if (s.volRatio == null || s.volRatio < 1.5) return false;
    if (s.cClose <= s.ema21H) return false;
    if ((s.changePct || 0) <= 0) return false;
  } else if (key === 'pullback') {
    if (!s.trendHarga || String(s.trendHarga).indexOf("Bullish") !== 0) return false;
    if (s.cClose > s.ema21L * 1.03) return false;
    if (s.cClose < (s.support || 0) * 0.98) return false;
    if (s.stochK != null && s.stochD != null) {
       if (!(s.prevStochK < s.prevStochD && s.stochK > s.stochD)) return false;
    }
  } else if (key === 'custom_bandar') {
    if (!(s.cOpen > s.ma21 && s.cOpen > s.ma50 && s.cOpen > s.ma100 && s.cOpen > s.ma200)) return false;
    if (s.volRatio == null || s.volRatio <= 2) return false;
    if (s.turnover == null || s.turnover < 10000000000) return false;
    if (s.band.tone !== "up" && (!s.uangGedeMasuk || !String(s.uangGedeMasuk).includes("Akumulasi"))) return false;
  } else if (key === 'asing_akumulasi') {
    if (s.foreignNet20D == null || s.foreignNet20D < 50e9) return false;
    if (s.foreignUpDays == null || s.foreignUpDays < 12) return false;
    if (s.turnover == null || s.turnover < 5e9) return false;
  } else if (key === 'freq_spike') {
    const isSpikeFromRatio = s.freqRatio != null && s.freqRatio >= 1.5;
    const isSpikeFromDb = s.freqRatio == null && s.freqSpike != null
      && String(s.freqSpike).trim().toLowerCase() === "ya";
    if (!isSpikeFromRatio && !isSpikeFromDb) return false;
  }
  return true;
}

const RULE_OPS: Record<string, (a: number, b: number) => boolean> = {
  ">": (a, b) => a > b, "<": (a, b) => a < b, ">=": (a, b) => a >= b, "<=": (a, b) => a <= b, "=": (a, b) => a === b,
};
// deno-lint-ignore no-explicit-any
function ruleMetricValue(s: any, key: string): number | null {
  const v = s[key];
  if (v === undefined || v === null || v === "" || isNaN(v)) return null;
  return Number(v);
}
// deno-lint-ignore no-explicit-any
function evalCustomRule(s: any, rule: any): boolean {
  const aVal = ruleMetricValue(s, rule.aKey);
  if (aVal === null) return false;
  const cmp = RULE_OPS[rule.op];
  if (!cmp) return false;
  if (rule.bType === "const") {
    const bVal = parseFloat(rule.bConst);
    if (isNaN(bVal)) return false;
    return cmp(aVal, bVal);
  }
  const bVal = ruleMetricValue(s, rule.bKey);
  if (bVal === null) return false;
  const mult = parseFloat(rule.mult);
  if (isNaN(mult)) return false;
  return cmp(aVal, mult * bVal);
}

async function sendTelegram(botToken: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", disable_web_page_preview: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) {
    throw new Error(`Telegram menolak pesan: ${body.description || res.statusText}`);
  }
  return body;
}

function todayJakartaISO(): string {
  // Tanggal "hari ini" versi WIB (UTC+7), dipakai sebagai kunci
  // dedup di telegram_notified_log supaya tidak dobel kirim per hari
  // bursa, terlepas dari server Edge Function jalan di zona apa.
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

function isMarketHoursJakarta(): boolean {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const day = wib.getUTCDay(); // sudah digeser ke WIB
  const hour = wib.getUTCHours();
  if (day === 0 || day === 6) return false; // Sabtu/Minggu
  return hour >= 9 && hour < 17;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  let payload: { test?: boolean } = {};
  try { payload = await req.json(); } catch (_e) { /* body kosong juga valid (dipanggil cron tanpa body) */ }

  try {
    const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/telegram_settings?id=eq.1&select=*`, { headers: sbHeaders() });
    const settingsRows = await settingsRes.json();
    const settings = Array.isArray(settingsRows) ? settingsRows[0] : null;

    if (!settings || !settings.bot_token || !settings.chat_id) {
      return new Response(JSON.stringify({ message: "Bot token / chat_id belum diisi di ⚙️ Pengaturan." }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Mode TEST — kirim 1 pesan percobaan, tidak menyentuh preset/log.
    if (payload.test) {
      await sendTelegram(settings.bot_token, settings.chat_id, "✅ Test notifikasi dari *IHSG Screener Pro* berhasil! Bot Telegram kamu sudah terhubung dengan benar.");
      return new Response(JSON.stringify({ message: "Test terkirim." }), {
        status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!settings.enabled) {
      return new Response(JSON.stringify({ message: "Notifikasi Telegram sedang nonaktif." }), {
        status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (settings.only_market_hours && !isMarketHoursJakarta()) {
      return new Response(JSON.stringify({ message: "Di luar jam bursa, dilewati (only_market_hours aktif)." }), {
        status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const presetIds: (number | string)[] = Array.isArray(settings.preset_ids) ? settings.preset_ids : [];
    if (!presetIds.length) {
      return new Response(JSON.stringify({ message: "Belum ada preset yang dipilih untuk dipantau." }), {
        status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Pisahkan 2 jenis id: string berprefix "dsi:" = Preset DSI bawaan
    // (tidak ada baris DB-nya, logikanya di-hardcode di presetPasses()
    // di atas), sisanya (angka / string angka) = id baris custom_presets.
    const dsiIds = presetIds.filter((id) => typeof id === "string" && id.startsWith("dsi:")).map((id) => String(id));
    const customIds = presetIds.filter((id) => !(typeof id === "string" && id.startsWith("dsi:")));

    const [presetsRes, stocksRes] = await Promise.all([
      customIds.length
        ? fetch(`${SUPABASE_URL}/rest/v1/custom_presets?id=in.(${customIds.map((id) => `${id}`).join(",")})&select=*`, { headers: sbHeaders() })
        : Promise.resolve(new Response("[]")),
      fetch(`${SUPABASE_URL}/rest/v1/stocks_screener?select=*`, { headers: sbHeaders() }),
    ]);
    const customPresets = await presetsRes.json();
    const stocksRaw = await stocksRes.json();
    if (!Array.isArray(customPresets)) throw new Error("Gagal memuat custom_presets: " + JSON.stringify(customPresets));
    if (!Array.isArray(stocksRaw)) throw new Error("Gagal memuat stocks_screener: " + JSON.stringify(stocksRaw));

    const stocksMapped = stocksRaw.map(mapRow);
    // enrichRow() cukup dihitung sekali untuk SEMUA saham (dipakai preset DSI
    // maupun Rules Kustom yang kebetulan pakai metrik turunan seperti
    // volRatio/freqRatio) — tidak mahal, cuma perhitungan array biasa.
    const stocks = stocksMapped.map(enrichRow);

    // Susun "jobs" seragam: setiap job punya id (buat dedup log), nama
    // (buat teks notifikasi), dan fungsi matcher(saham) -> boolean.
    // deno-lint-ignore no-explicit-any
    type Job = { id: string; name: string; matcher: (s: any) => boolean };
    const jobs: Job[] = [];

    for (const key of Object.keys(PRESET_LABELS)) {
      const fullId = `dsi:${key}`;
      if (!dsiIds.includes(fullId)) continue;
      jobs.push({ id: fullId, name: PRESET_LABELS[key], matcher: (s) => presetPasses(s, key) });
    }
    for (const preset of customPresets) {
      const rules = Array.isArray(preset.rules) ? preset.rules : [];
      if (!rules.length) continue;
      jobs.push({
        id: String(preset.id), name: preset.name,
        matcher: (s) => rules.every((rule: unknown) => evalCustomRule(s, rule)),
      });
    }

    const today = todayJakartaISO();
    let totalSent = 0;
    const perPresetSummary: string[] = [];

    for (const job of jobs) {
      const matches = stocks.filter(job.matcher);
      if (!matches.length) { perPresetSummary.push(`${job.name}: 0 lolos`); continue; }

      // Cek yang sudah pernah dinotifikasi hari ini untuk preset ini.
      const existingRes = await fetch(
        `${SUPABASE_URL}/rest/v1/telegram_notified_log?preset_id=eq.${encodeURIComponent(job.id)}&trade_date=eq.${today}&select=ticker`,
        { headers: sbHeaders() },
      );
      const existingRows = await existingRes.json();
      const alreadyNotified = new Set(Array.isArray(existingRows) ? existingRows.map((r: { ticker: string }) => r.ticker) : []);

      const newMatches = matches.filter((m) => !alreadyNotified.has(m.ticker));
      if (!newMatches.length) { perPresetSummary.push(`${job.name}: 0 baru (${matches.length} sudah dinotifikasi sebelumnya)`); continue; }

      const lines = newMatches.slice(0, 30).map((m) =>
        `• *${m.ticker}* — Rp${m.cClose != null ? Number(m.cClose).toLocaleString("id-ID") : "-"} (${m.changePct != null ? (Number(m.changePct) >= 0 ? "+" : "") + Number(m.changePct).toFixed(2) + "%" : "-"})`
      );
      const more = newMatches.length > 30 ? `\n… dan ${newMatches.length - 30} saham lainnya.` : "";
      const text = `🔔 *${job.name}*\n${newMatches.length} saham baru lolos filter:\n\n${lines.join("\n")}${more}`;

      await sendTelegram(settings.bot_token, settings.chat_id, text);
      totalSent += newMatches.length;
      perPresetSummary.push(`${job.name}: ${newMatches.length} baru dikirim`);

      // Catat ke log supaya tidak dikirim ulang hari ini.
      await fetch(`${SUPABASE_URL}/rest/v1/telegram_notified_log`, {
        method: "POST",
        headers: { ...sbHeaders(), Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(newMatches.map((m) => ({ preset_id: job.id, ticker: m.ticker, trade_date: today }))),
      });
    }

    const note = perPresetSummary.join(" | ") || "Tidak ada preset dengan rules aktif.";
    await fetch(`${SUPABASE_URL}/rest/v1/telegram_settings?id=eq.1`, {
      method: "PATCH",
      headers: { ...sbHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify({ last_run_at: new Date().toISOString(), last_run_note: note }),
    });

    return new Response(JSON.stringify({ message: "OK", totalSent, detail: note }), {
      status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ message: `Gagal: ${(e as Error).message}` }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
