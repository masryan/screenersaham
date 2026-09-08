// ==========================================================
// inject.js — WS TRAFFIC RECORDER (mode "reverse-engineer subscribe
// protocol"), bukan lagi cuma pass-through satu arah seperti versi lama.
//
// BEDA DARI VERSI SEBELUMNYA: versi lama cuma dengar pesan MASUK
// (server->client) dari WebSocket yang dibuat halaman Stockbit sendiri.
// Itu cukup untuk "live feed pasif" (ticker yang lagi dibuka user di tab
// Stockbit), TAPI TIDAK CUKUP untuk tahu bagaimana cara MEMINTA data
// ticker tertentu (mis. "tolong kirim tick BBCA") — itu artinya kita
// juga harus lihat apa yang DIKIRIM (client->server) saat user
// pindah-pindah ticker/timeframe di UI Stockbit. Versi ini menangkap
// KEDUA arah + URL WS-nya (Stockbit kemungkinan besar punya lebih dari
// satu endpoint WS — orderbook, quote, chat, dst — jadi kita perlu tahu
// endpoint mana yang relevan).
//
// CARA PAKAI (manual, oleh manusia): buka stockbit.com, login, lalu
// buka chart/orderbook 2-3 ticker BERBEDA satu-satu (mis. BBCA lalu
// ganti ke TLKM) supaya pesan "subscribe ticker baru" ketangkap jelas
// (biasanya beda dari pesan "unsubscribe ticker lama"). Traffic yang
// tertangkap muncul di tab "🧪 WS Debug" di app screener (dengan syarat
// tab "Rekam" di sana sedang ON) — salin semua lalu kirim untuk
// dianalisis.
//
// TIDAK OTOMATIS AKTIF: recorder ini selalu menangkap & mem-post lewat
// window.postMessage (murah, tidak dikirim ke background kalau app-nya
// tidak minta), tapi content_screener.js sisi app HANYA benar-benar
// menyimpan ke buffer kalau user menekan "Mulai Rekam" — lihat
// STOCKBIT_WS_DEBUG_README di app.js.
// ==========================================================
(function () {
  const OrigWebSocket = window.WebSocket;

  function safePreview(data) {
    try {
      if (typeof data === "string") return data.length > 4000 ? data.slice(0, 4000) + "…(terpotong)" : data;
      return "[binary/non-string data, " + (data && data.byteLength) + " bytes — dilewati]";
    } catch (e) {
      return "[gagal membaca data]";
    }
  }

  const wsProxy = function (url, protocols) {
    const ws = new OrigWebSocket(url, protocols);

    // --- Tangkap PESAN MASUK (server -> client) ---
    ws.addEventListener("message", function (event) {
      try {
        window.postMessage({
          type: "STOCKBIT_WS_TRAFFIC",
          direction: "recv",
          url: String(url),
          data: safePreview(event.data),
          ts: Date.now(),
        }, "*");
      } catch (e) {}
    });

    // --- Tangkap PESAN KELUAR (client -> server) — INI yang baru & PENTING
    // untuk tahu format "subscribe ticker X". Kita bungkus ws.send supaya
    // tetap memanggil implementasi asli (perilaku WebSocket TIDAK berubah
    // sama sekali dari sudut pandang halaman Stockbit), sambil mem-fork
    // salinan datanya ke recorder kita.
    const origSend = ws.send.bind(ws);
    ws.send = function (data) {
      try {
        window.postMessage({
          type: "STOCKBIT_WS_TRAFFIC",
          direction: "send",
          url: String(url),
          data: safePreview(data),
          ts: Date.now(),
        }, "*");
      } catch (e) {}
      return origSend(data);
    };

    return ws;
  };
  wsProxy.prototype = OrigWebSocket.prototype;
  wsProxy.CONNECTING = OrigWebSocket.CONNECTING;
  wsProxy.OPEN = OrigWebSocket.OPEN;
  wsProxy.CLOSING = OrigWebSocket.CLOSING;
  wsProxy.CLOSED = OrigWebSocket.CLOSED;
  window.WebSocket = wsProxy;
  console.log("🥷 WS Traffic Recorder (dupleks) tersuntik ke Stockbit.");
})();
