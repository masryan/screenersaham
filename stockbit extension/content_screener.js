// ==========================================================
// content_screener.js — jalan DI HALAMAN app screener (masryan.github.io
// / localhost, lihat "matches" di manifest.json — SESUAIKAN kalau app
// di-hosting di domain lain).
//
// CATATAN: versi lama file ini juga menjembatani token Stockbit dari
// chrome.storage.local ke localStorage. Itu SUDAH TIDAK DIPAKAI —
// app.js sekarang ambil token lewat tabel Supabase `stockbit_session`
// (disync langsung oleh background.js via chrome.webRequest, lihat
// syncStockbitTokenFromSupabase() di app.js), jadi tidak perlu content
// script sama sekali untuk token. Fungsi file ini sekarang murni jadi
// jembatan traffic WS (untuk tab "🧪 WS Debug" di app) dari background.js
// ke halaman lewat window.postMessage, karena background.js (service
// worker) tidak bisa langsung sentuh DOM/window halaman.
// ==========================================================
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type === 'STOCKBIT_TOKEN_UPDATED' && message.token) {
        // Background menangkap token dari request Stockbit yang baru. Simpan di
        // localStorage halaman agar app.js bisa langsung memakainya.
        try {
            localStorage.setItem('ihsg_stockbit_token', message.token);
            localStorage.setItem('ihsg_stockbit_token_source', 'extension');
            localStorage.setItem('ihsg_stockbit_token_synced_at', String(Date.now()));
        } catch (e) {}
        window.postMessage({
            type: 'STOCKBIT_TOKEN_UPDATED',
            token: message.token,
            expiresAt: message.expiresAt || null
        }, '*');
        return;
    }
    if (message.type === 'WS_TRAFFIC_RECEIVE') {
        window.postMessage({ type: 'FROM_EXTENSION_WS_TRAFFIC', payload: message.payload }, '*');
    }
});
