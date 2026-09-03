/* PWA lifecycle: install prompt, service-worker registration, and updates. */
(function () {
  "use strict";

  let deferredInstallPrompt = null;

  function addPwaStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .pwa-install-btn { display:none; }
      .pwa-install-btn.is-visible { display:inline-flex; }
      .pwa-toast { position:fixed; z-index:9999; right:18px; bottom:18px; max-width:360px;
        display:flex; gap:12px; align-items:center; padding:12px 14px; color:#e5eefb;
        background:#111827; border:1px solid rgba(6,182,212,.35); border-radius:10px;
        box-shadow:0 10px 30px rgba(0,0,0,.35); font:12px/1.45 Sora,sans-serif; }
      .pwa-toast button { border:0; border-radius:6px; padding:7px 10px; cursor:pointer;
        color:#07131d; background:#22d3ee; font:600 11px Sora,sans-serif; white-space:nowrap; }
    `;
    document.head.appendChild(style);
  }

  function showUpdateToast(registration) {
    if (document.querySelector(".pwa-toast")) return;
    const toast = document.createElement("div");
    toast.className = "pwa-toast";
    toast.innerHTML = `<span>Pembaruan aplikasi tersedia.</span><button type="button">Muat ulang</button>`;
    toast.querySelector("button").addEventListener("click", function () {
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    });
    document.body.appendChild(toast);
  }

  function setupInstallButton() {
    const actions = document.querySelector(".header-actions");
    if (!actions || document.getElementById("pwaInstallBtn")) return;
    const button = document.createElement("button");
    button.id = "pwaInstallBtn";
    button.type = "button";
    button.className = "btn btn-outline pwa-install-btn";
    button.textContent = "⬇ Install App";
    button.addEventListener("click", async function () {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      button.classList.remove("is-visible");
    });
    actions.insertBefore(button, actions.firstChild);
  }

  addPwaStyles();
  setupInstallButton();

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredInstallPrompt = event;
    document.getElementById("pwaInstallBtn")?.classList.add("is-visible");
  });

  window.addEventListener("appinstalled", function () {
    deferredInstallPrompt = null;
    document.getElementById("pwaInstallBtn")?.classList.remove("is-visible");
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").then(function (registration) {
        if (registration.waiting) showUpdateToast(registration);
        registration.addEventListener("updatefound", function () {
          const worker = registration.installing;
          worker?.addEventListener("statechange", function () {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              showUpdateToast(registration);
            }
          });
        });
      }).catch(function (error) {
        console.warn("PWA service worker gagal didaftarkan:", error);
      });
    });
  }
})();
