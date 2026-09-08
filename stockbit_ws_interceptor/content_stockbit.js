// ==========================================================
// content_stockbit.js — jalan DI HALAMAN stockbit.com.
// Tugasnya cuma satu: suntik inject.js (supaya bisa akses WebSocket
// halaman dari "main world", content script sendiri jalan di "isolated
// world" yang tidak bisa langsung override window.WebSocket milik
// halaman), lalu terusin pesan STOCKBIT_WS_TRAFFIC yang diposting
// inject.js ke background.js lewat chrome.runtime.sendMessage.
//
// Penangkapan Bearer token TIDAK lewat sini — itu tetap lewat
// chrome.webRequest di background.js (lihat catatan di sana), karena
// header request tidak bisa dibaca dari content script/halaman biasa.
// ==========================================================
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() { this.remove(); };
(document.head || document.documentElement).appendChild(script);

window.addEventListener('message', function(event) {
    if (event.source !== window || !event.data || event.data.type !== 'STOCKBIT_WS_TRAFFIC') return;
    // best-effort: kalau background service worker sedang "tidur"/reload,
    // sendMessage bisa reject — itu tidak fatal (cuma 1 frame WS hilang),
    // makanya .catch() dikosongkan alih-alih dibiarkan jadi unhandled
    // rejection di console halaman Stockbit.
    chrome.runtime.sendMessage({ type: 'WS_TRAFFIC_FORWARD', payload: event.data }).catch(() => {});
});
