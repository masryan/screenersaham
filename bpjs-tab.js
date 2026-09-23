// ==========================================================
// bpjs-tab.js — Tab "🌅 BPJS (Beli Pagi, Jual Sore)"
//
// BELUM di-wire ke quant-hub.js karena file itu belum saya lihat.
// Begitu kamu upload quant-hub.js, tinggal 3 titik integrasi:
//   1. Daftarkan tab baru di array/list navigasi tab Quant Hub
//      (cari pola yang sama dengan bagaimana tab lain didaftarkan,
//      mis. { key:"bpjs", label:"🌅 BPJS", icon:... }).
//   2. Di dispatcher render (pola `else if(state.tab==="...")` di
//      app.js baris ~8908-8927 — quant-hub.js kemungkinan punya
//      dispatcher serupa), tambahkan:
//        else if (qhState.tab === "bpjs") content.innerHTML = renderBpjs();
//   3. Panggil bindBpjsEvents() setelah innerHTML di-set (event
//      delegation untuk search/sort/refresh), sama seperti tab lain.
//
// Pola & vocabulary CSS (.panel, .pill, .btn, .summary-card, dst) saya
// contek dari renderBsjp() di app.js supaya tampilannya konsisten.
//
// SUMBER DATA: tabel `sesi_snapshots` (lihat 08_sesi_snapshots.sql),
// diisi oleh snapshot-sesi.mjs 2x/hari — BUKAN dari `flows`/`stocks`
// (yang EOD). Asumsikan SUPABASE_URL & getSupaHeaders() sudah ada
// secara global (sama seperti di app.js) — kalau quant-hub.js punya
// helper sendiri dengan nama beda, tinggal ganti 2 referensi itu.
// ==========================================================

const bpjsState = {
  loading: false,
  rows: [],       // hasil fetch sesi_snapshots, sudah di-map
  search: "",
  sort: "return",  // "return" | "volume" | "ticker"
  minReturnPct: null, // filter opsional, mis. 1.5 = tampilkan hanya naik >=1.5%
  error: null,
};

async function fetchBpjsSnapshots(tradeDate /* optional, default hari ini WIB */) {
  bpjsState.loading = true; bpjsState.error = null;
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
    const date = tradeDate || fmt.format(new Date());
    const qs = `trade_date=eq.${date}&select=ticker,trade_date,harga_pagi,volume_pagi,captured_pagi_at,harga_sore,volume_sore,captured_sore_at,return_pct&order=return_pct.desc.nullslast`;
    const res = await fetch(`${SUPABASE_URL}/sesi_snapshots?${qs}`, { headers: getSupaHeaders(), cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    bpjsState.rows = await res.json();
  } catch (e) {
    bpjsState.error = e.message || String(e);
    bpjsState.rows = [];
  } finally {
    bpjsState.loading = false;
  }
}

function bpjsFilteredSortedRows() {
  const q = (bpjsState.search || "").trim().toLowerCase();
  let rows = bpjsState.rows.filter(r => !q || r.ticker.toLowerCase().includes(q));
  if (bpjsState.minReturnPct != null) {
    rows = rows.filter(r => r.return_pct != null && r.return_pct >= bpjsState.minReturnPct);
  }
  rows.sort((a, b) => {
    if (bpjsState.sort === "volume") return (b.volume_sore || b.volume_pagi || 0) - (a.volume_sore || a.volume_pagi || 0);
    if (bpjsState.sort === "ticker") return a.ticker.localeCompare(b.ticker);
    // default: return_pct desc, null di bawah
    if (a.return_pct == null) return 1;
    if (b.return_pct == null) return -1;
    return b.return_pct - a.return_pct;
  });
  return rows;
}

function bpjsFmtRp(v) { return v == null ? "-" : "Rp " + Math.round(v).toLocaleString("id-ID"); }
function bpjsFmtVol(v) { return v == null ? "-" : Number(v).toLocaleString("id-ID"); }
function bpjsFmtJam(iso) {
  if (!iso) return "-";
  try { return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) + " WIB"; }
  catch { return "-"; }
}

function renderBpjs() {
  const rows = bpjsFilteredSortedRows();
  const withBoth = bpjsState.rows.filter(r => r.harga_pagi != null && r.harga_sore != null);
  const avgReturn = withBoth.length
    ? withBoth.reduce((a, r) => a + (r.return_pct || 0), 0) / withBoth.length
    : null;
  const gainers = withBoth.filter(r => (r.return_pct || 0) > 0).length;
  const losers = withBoth.filter(r => (r.return_pct || 0) < 0).length;

  const headerBar = `
    <div class="panel" style="flex-wrap:wrap;gap:10px;align-items:center;">
      <span class="pill pill-up" style="display:inline-flex;align-items:center;gap:6px;">🌅 BPJS — Beli Pagi, Jual Sore</span>
      <span class="pill" style="background:rgba(6,182,212,0.12);color:var(--teal);border:1px solid rgba(6,182,212,0.3);">${bpjsState.rows.length} ticker ter-snapshot hari ini</span>
      <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <input type="text" id="bpjsSearchInput" placeholder="Cari ticker..." value="${escapeHtml(bpjsState.search)}" style="max-width:140px;" class="input"/>
        <button class="btn btn-outline" id="bpjsRefreshBtn" title="Refresh dari sesi_snapshots">🔄</button>
      </div>
    </div>`;

  const statCard = (label, val, tone) => `<div class="summary-card" style="min-width:150px;"><div class="summary-lbl">${label}</div><div class="summary-val" style="${tone ? `color:${tone};` : ""}font-size:16px;">${val}</div></div>`;
  const statsBar = `
    <div class="summary-grid" style="margin-bottom:0;">
      ${statCard("Avg Return Pagi→Sore", avgReturn != null ? `${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(2)}%` : "-", avgReturn != null ? (avgReturn >= 0 ? "var(--up)" : "var(--down)") : null)}
      ${statCard("Naik / Turun", `<span style="color:var(--up)">▲${gainers}</span> <span style="color:var(--down)">▼${losers}</span>`)}
      ${statCard("Sudah 2 Snapshot (Pagi+Sore)", `${withBoth.length}`, "var(--teal)")}
      ${statCard("Filter Min Return", bpjsState.minReturnPct != null ? `≥ ${bpjsState.minReturnPct}%` : "Tidak difilter", "var(--gold)")}
    </div>`;

  if (bpjsState.error) {
    return headerBar + `<div class="panel" style="color:var(--down);">⚠️ Gagal ambil data: ${escapeHtml(bpjsState.error)} — pastikan migrasi <code>08_sesi_snapshots.sql</code> sudah dijalankan & <code>snapshot-sesi.mjs</code> sudah pernah jalan minimal 1x.</div>`;
  }
  if (bpjsState.loading) {
    return headerBar + `<div class="panel">⏳ Memuat data snapshot sesi...</div>`;
  }
  if (!bpjsState.rows.length) {
    return headerBar + `<div class="panel" style="color:var(--muted);">Belum ada snapshot untuk hari ini. Jalankan <code>node snapshot-sesi.mjs pagi</code> pagi ini (atau tunggu cron jalan ~09:05 WIB).</div>`;
  }

  const tableRows = rows.slice(0, 300).map(r => {
    const tone = r.return_pct == null ? "var(--muted)" : (r.return_pct >= 0 ? "var(--up)" : "var(--down)");
    const arrow = r.return_pct == null ? "" : (r.return_pct >= 0 ? "▲" : "▼");
    return `
      <tr>
        <td><b>${escapeHtml(r.ticker)}</b></td>
        <td>${bpjsFmtRp(r.harga_pagi)}<div style="font-size:10.5px;color:var(--muted);">${bpjsFmtJam(r.captured_pagi_at)}</div></td>
        <td>${bpjsFmtRp(r.harga_sore)}<div style="font-size:10.5px;color:var(--muted);">${bpjsFmtJam(r.captured_sore_at)}</div></td>
        <td style="color:${tone};font-weight:700;">${arrow} ${r.return_pct != null ? (r.return_pct >= 0 ? "+" : "") + r.return_pct.toFixed(2) + "%" : "-"}</td>
        <td>${bpjsFmtVol(r.volume_sore ?? r.volume_pagi)}</td>
      </tr>`;
  }).join("");

  const table = `
    <div class="panel" style="overflow-x:auto;">
      <table class="data-table">
        <thead><tr>
          <th>Ticker</th><th data-bpjs-sort="ticker">Harga Pagi</th><th>Harga Sore</th>
          <th data-bpjs-sort="return" style="cursor:pointer;">Return % ${bpjsState.sort === "return" ? "▾" : ""}</th>
          <th data-bpjs-sort="volume" style="cursor:pointer;">Volume ${bpjsState.sort === "volume" ? "▾" : ""}</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>`;

  const note = `<div class="panel" style="font-size:11.5px;color:var(--muted);">
    ℹ️ Harga <b>Pagi</b> & <b>Sore</b> adalah snapshot live (Yahoo Finance) pada jam yang tertera di bawah tiap angka —
    bukan Open/Close resmi bursa. Kolom kosong ("-") berarti snapshot sesi itu belum jalan hari ini.
  </div>`;

  return headerBar + statsBar + table + note;
}

// Event delegation — panggil SEKALI setelah content di-render (atau taruh
// di listener delegation global quant-hub.js yang sudah ada, kalau ada).
function bindBpjsEvents() {
  const searchEl = document.getElementById("bpjsSearchInput");
  if (searchEl) searchEl.oninput = (e) => { bpjsState.search = e.target.value; renderAndReplaceBpjs(); };

  const refreshBtn = document.getElementById("bpjsRefreshBtn");
  if (refreshBtn) refreshBtn.onclick = async () => { await fetchBpjsSnapshots(); renderAndReplaceBpjs(); };

  document.querySelectorAll("[data-bpjs-sort]").forEach(el => {
    el.onclick = () => { bpjsState.sort = el.getAttribute("data-bpjs-sort"); renderAndReplaceBpjs(); };
  });
}

// Helper generik — SESUAIKAN dengan cara quant-hub.js re-render kontennya
// (mis. mungkin sudah ada fungsi `qhRender()` / `render()` global; kalau
// begitu, hapus fungsi ini dan panggil itu langsung).
function renderAndReplaceBpjs() {
  const content = document.getElementById("qhContent") || document.getElementById("content");
  if (content) content.innerHTML = renderBpjs();
  bindBpjsEvents();
}

// Panggil ini saat tab BPJS pertama kali dibuka.
async function initBpjsTab() {
  await fetchBpjsSnapshots();
  renderAndReplaceBpjs();
}
