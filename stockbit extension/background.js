console.log("Stockbit Token Syncer: Background script starting...");

// ==========================================================
// BAGIAN 1 — SYNC TOKEN (JANGAN DIUBAH tanpa alasan kuat; ini yang
// dipakai app.js lewat syncStockbitTokenFromSupabase(), lihat catatan
// panjang di app.js soal ini).
//
// Target: tabel `stockbit_session` di Supabase project IHSG Screener Pro
// (lihat sql/05_stockbit_token_sync.sql). Nilai di bawah harus SAMA
// dengan SUPABASE_URL/SUPABASE_ANON_KEY yang dipakai app.js (config.js
// atau yang kamu isi manual lewat ⚙️ Pengaturan). Anon key ini aman
// ditaruh di sini — dibatasi RLS per-tabel di Supabase, sama seperti
// alasan kenapa aman ditaruh di config.js.
//
// Kalau kamu ganti project Supabase lewat ⚙️ Pengaturan app, UPDATE juga
// dua nilai ini + host_permissions di manifest.json, lalu reload
// extension di chrome://extensions.
// ==========================================================
const SUPABASE_URL = "https://vditwqgiqlvkpdxhocuh.supabase.co/rest/v1";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkaXR3cWdpcWx2a3BkeGhvY3VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMzI5NzgsImV4cCI6MjEwMjkwODk3OH0.LziR9ku7DltiChp4HMeTMu1btw00Du4RORhxMH29oso";

const APP_API_URL = `${SUPABASE_URL}/stockbit_session`;

console.log("Target sync URL:", APP_API_URL);

let lastSyncedToken = null;

// DIAGNOSTIK: hitung & catat request stockbit.com yang lewat, supaya kalau
// token tidak tersync kita bisa bedakan "extension tidak melihat request
// sama sekali" vs "request terlihat tapi tidak bawa Bearer token" (biasanya
// karena belum login / sesi hangus).
let diagSeenCount = 0;
let diagAuthCount = 0;
setInterval(() => {
  if (diagSeenCount > 0) {
    console.log(`[diag] ${diagSeenCount} request stockbit.com terlihat, ${diagAuthCount} di antaranya bawa Bearer token.`);
    diagSeenCount = 0; diagAuthCount = 0;
  } else {
    console.log("[diag] Belum ada request ke *.stockbit.com yang terlihat. Buka/refresh stockbit.com, pastikan sudah login, lalu klik-kli halaman (watchlist, detail saham).");
  }
}, 15000);

console.log("Registering webRequest listener (token sync)...");

// Helper to decode JWT payload
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    diagSeenCount++;
    const authHeader = details.requestHeaders.find(
      (header) => header.name.toLowerCase() === "authorization"
    );

    if (authHeader && authHeader.value) {
      // Check if it is a Bearer token
      if (authHeader.value.startsWith("Bearer ")) {
        diagAuthCount++;
        const token = authHeader.value.substring(7); // Remove "Bearer " prefix

        // Only sync if the token has changed to avoid spamming the API
        if (token !== lastSyncedToken) {
          const decoded = parseJwt(token);

          // Only sync if it's a valid JWT (must have a payload with an expiry)
          if (!decoded || !decoded.exp) {
            console.log("[diag] Header Bearer ditemukan tapi bukan JWT valid (tanpa exp):", details.url);
            return;
          }

          console.log("Valid JWT detected from:", details.url);
          const expiresAt = decoded.exp;
          console.log("Token Expiry:", new Date(expiresAt * 1000));

          syncToken(token, expiresAt);
          // Teruskan token terbaru ke tab aplikasi yang sedang terbuka.
          // Jangan hanya menyimpan ke Supabase: aplikasi bisa sedang memakai
          // token lama dari localStorage/Supabase dan semua request akan 401.
          broadcastTokenToAppTabs(token, expiresAt);
        }
      }
    }
  },
  { urls: ["https://*.stockbit.com/*"] },
  ["requestHeaders", "extraHeaders"]
);

function syncToken(token, expiresAt) {
  // Upsert (Prefer: resolution=merge-duplicates) ke baris id=1 —
  // lihat sql/05_stockbit_token_sync.sql. Butuh primary key `id` supaya
  // PostgREST tahu baris mana yang ditimpa.
  const payload = {
    id: 1,
    token: token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };

  fetch(APP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(payload)
  })
    .then((response) => {
      if (response.ok) {
        console.log("Token successfully synced to Supabase.");
        lastSyncedToken = token; // Update cache on success
      } else {
        response.text().then(t => console.error("Failed to sync token. Status:", response.status, t));
      }
    })
    .catch((error) => {
      console.error("Error syncing token:", error);
    });
}

function broadcastTokenToAppTabs(token, expiresAt) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (!tab.id || !tab.url) return;
      const isAppTab = tab.url.startsWith("https://masryan.github.io/") ||
        tab.url.startsWith("http://localhost/") ||
        tab.url.startsWith("http://127.0.0.1/");
      if (!isAppTab) return;
      chrome.tabs.sendMessage(tab.id, {
        type: "STOCKBIT_TOKEN_UPDATED",
        token,
        expiresAt
      }).catch(() => {});
    });
  });
}

// ==========================================================
// BAGIAN 2 — RELAY TRAFFIC WS (BARU) — murni untuk tab "🧪 WS Debug" di
// app, tujuannya reverse-engineer format subscribe Stockbit. TIDAK
// menyentuh/mengubah apa pun di Bagian 1 di atas.
//
// Alur: inject.js (di halaman stockbit.com) --postMessage-->
// content_stockbit.js --chrome.runtime.sendMessage--> (DI SINI) --
// chrome.tabs.sendMessage--> content_screener.js (di halaman app) --
// postMessage--> app.js.
//
// Kenapa perlu "loncat" lewat background: content script stockbit.com
// dan content script app.js berjalan di TAB BERBEDA — satu-satunya cara
// 2 tab saling kirim pesan di extension MV3 adalah lewat background
// service worker sebagai perantara.
// ==========================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'WS_TRAFFIC_FORWARD') return;

  // Cari semua tab yang menjalankan content_screener.js (match pattern-nya
  // ada di manifest.json — kalau app di-hosting di domain lain, update
  // "matches" di manifest.json, BUKAN di sini).
  chrome.tabs.query(
    { url: ["*://masryan.github.io/*", "http://localhost/*", "http://127.0.0.1/*"] },
    (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { type: 'WS_TRAFFIC_RECEIVE', payload: message.payload }).catch(() => {
          // Tab match tapi content script belum siap (baru dibuka/reload) —
          // wajar, bukan error yang perlu ditindaklanjuti.
        });
      });
    }
  );
});
