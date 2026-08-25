console.log("Stockbit Token Syncer: Background script starting...");

// ==========================================================
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

console.log("Registering webRequest listener...");

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
    // Look for the Authorization header
    const authHeader = details.requestHeaders.find(
      (header) => header.name.toLowerCase() === "authorization"
    );

    if (authHeader && authHeader.value) {
      // Check if it is a Bearer token
      if (authHeader.value.startsWith("Bearer ")) {
        const token = authHeader.value.substring(7); // Remove "Bearer " prefix

        // Only sync if the token has changed to avoid spamming the API
        if (token !== lastSyncedToken) {
          const decoded = parseJwt(token);

          // Only sync if it's a valid JWT (must have a payload with an expiry)
          if (!decoded || !decoded.exp) {
            return;
          }

          console.log("Valid JWT detected from:", details.url);
          const expiresAt = decoded.exp;
          console.log("Token Expiry:", new Date(expiresAt * 1000));

          syncToken(token, expiresAt);
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
