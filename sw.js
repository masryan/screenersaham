const CACHE_NAME = "ihsg-screener-shell-v4"; // <-- NAIKKAN angka ini setiap kali deploy
                                              //     perubahan ke index.html/styles.css/app.js,
                                              //     supaya cache lama otomatis dibuang (lihat
                                              //     "activate" di bawah) dan versi baru dipakai.
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./config.js",
  "./pwa.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
      // Setelah SW baru aktif, beri tahu tab yang sedang terbuka supaya
      // bisa reload otomatis — user tidak perlu tahu soal cache sama sekali.
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => clients.forEach((client) => client.postMessage({ type: "SW_UPDATED" })))
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Jangan intercept non-GET, origin luar, atau data API live.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // File "inti" yang paling sering berubah saat development (HTML/CSS/JS
  // + navigasi): NETWORK-FIRST — selalu coba ambil versi terbaru dulu,
  // baru jatuh ke cache kalau offline/network gagal. Ini menghilangkan
  // efek "harus reload 2x baru berubah" dari stale-while-revalidate.
  const isCoreAsset = /\.(html|css|js)$/i.test(url.pathname) || request.mode === "navigate";

  if (isCoreAsset) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // Aset lain (ikon, manifest, dll): stale-while-revalidate tetap oke,
  // karena jarang berubah dan tidak butuh selalu paling baru.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
