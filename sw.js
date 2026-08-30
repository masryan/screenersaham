// ==========================================
// sw.js — Service worker MINIMAL.
//
// Fungsinya HANYA supaya kriteria "installable" Chrome/Android terpenuhi
// (butuh service worker terdaftar dengan handler 'fetch'). SENGAJA TIDAK
// melakukan caching apa pun terhadap file app (index.html/app.js/styles.css)
// maupun data (Supabase/Stockbit), karena:
//   1. App ini sering diupdate — cache agresif bisa bikin bug "kok fitur
//      baru/perbaikan bug kok gak muncul" karena versi lama ke-serve dari
//      cache.
//   2. Data harga/broker summary WAJIB selalu live, tidak boleh basi gara2
//      ke-cache service worker.
//
// Kalau nanti mau tambah dukungan offline, lakukan SECARA SENGAJA & SELEKTIF
// (mis. cache cuma styles.css atau ikon), jangan blanket-cache semuanya.
// ==========================================

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Sengaja kosong -> otomatis fallback ke perilaku network normal browser.
});
