// ==========================================================
// LOGIN SEDERHANA — 2 ROLE (user / admin), UNTUK TESTER SEMENTARA
//
// ⚠️ PENTING SOAL KEAMANAN: file ini (termasuk daftar username/password
// di bawah) berjalan 100% di browser dan bisa dibaca siapa pun lewat
// "View Source" / DevTools — sama seperti app.js. Jadi ini BUKAN
// keamanan sesungguhnya, cuma "gerbang" UI supaya role "user" tidak
// sengaja mengklik fitur admin. Kalau nanti mau serius (data benar-benar
// dilindungi per role), pembatasan harus dipindah ke sisi server, mis.
// Supabase Auth + Row Level Security per role, bukan cuma di sini.
//
// Load order: file ini SENGAJA dimuat PALING TERAKHIR (setelah app.js &
// quant-hub.js di index.html) supaya bisa "membungkus" fungsi yang sudah
// didefinisikan di sana (openSettings) dan elemen yang sudah ada
// (#refreshBtn, #settingsBtn).
// ==========================================================

// Ganti/tambah akun di sini kalau perlu. Username dicocokkan tanpa
// peduli huruf besar/kecil.
const APP_USERS = {
  "user":  { password: "123456",   role: "user"  },
  "admin": { password: "admin123", role: "admin" } // TODO: ganti password default ini
};

const AUTH_ROLE_KEY = "ihsg_auth_role";
const AUTH_NAME_KEY = "ihsg_auth_username";

function getAuthRole(){
  try { return localStorage.getItem(AUTH_ROLE_KEY) || null; } catch(e){ return null; }
}
function getAuthUsername(){
  try { return localStorage.getItem(AUTH_NAME_KEY) || null; } catch(e){ return null; }
}
function isAdminUser(){ return getAuthRole() === "admin"; }

function doLogin(usernameRaw, password){
  const username = String(usernameRaw || "").trim().toLowerCase();
  const u = APP_USERS[username];
  if(!u || u.password !== password) return false;
  try {
    localStorage.setItem(AUTH_ROLE_KEY, u.role);
    localStorage.setItem(AUTH_NAME_KEY, username);
  } catch(e){}
  return true;
}

function doLogout(){
  try {
    localStorage.removeItem(AUTH_ROLE_KEY);
    localStorage.removeItem(AUTH_NAME_KEY);
  } catch(e){}
  // Reload penuh: cara paling aman supaya semua state di memori (yang
  // mungkin sempat dimuat) ikut bersih, dan overlay login muncul lagi
  // dari awal (data-authed dicek ulang oleh script di <head>).
  location.reload();
}

// Terapkan pembatasan tampilan berdasarkan role yang sedang login.
// Dipanggil sekali saat halaman dibuka (kalau sudah login sebelumnya)
// dan sekali lagi tepat setelah submit form login berhasil.
function applyRolePermissions(){
  const role = getAuthRole();
  const name = getAuthUsername();

  const chip = document.getElementById("userChip");
  const chipName = document.getElementById("userChipName");
  if(chip && chipName){
    chip.style.display = "flex";
    chipName.textContent = (name || "-") + (role === "admin" ? " · admin" : " · user");
  }

  const refreshBtn = document.getElementById("refreshBtn");
  const settingsBtn = document.getElementById("settingsBtn");

  if(role === "admin"){
    // Admin: pastikan semua tombol terlihat (misalnya setelah logout lalu
    // login lagi sebagai admin di tab yang sama, walau reload harusnya
    // sudah membuat ini tidak diperlukan).
    if(refreshBtn) refreshBtn.style.display = "";
    if(settingsBtn) settingsBtn.style.display = "";
    return;
  }

  // --- Role "user": sembunyikan tombol Refresh Data (manual) & Pengaturan.
  // Refresh OTOMATIS (saat halaman pertama dibuka & auto-refresh berkala)
  // TIDAK ikut diblokir — itu bagian dari "memakai aplikasi", yang
  // dibatasi cuma tombol tarik-data MANUAL di header.
  if(refreshBtn) refreshBtn.style.display = "none";
  if(settingsBtn) settingsBtn.style.display = "none";

  // Jaga-jaga: openSettings() dipanggil dari banyak tempat di app.js
  // (bukan cuma tombol Pengaturan) — mis. otomatis kebuka kalau token
  // belum diisi. Timpa fungsinya juga supaya role "user" tetap tidak
  // bisa membuka modal Pengaturan lewat jalur manapun.
  if(typeof window.openSettings === "function" && !window.openSettings.__authWrapped){
    const original = window.openSettings;
    const wrapped = function(){
      if(typeof showToast === "function"){
        showToast("⚠️ Pengaturan hanya bisa diakses oleh admin.", "down");
      } else {
        alert("Pengaturan hanya bisa diakses oleh admin.");
      }
    };
    wrapped.__authWrapped = true;
    window.openSettings = wrapped;
  }
}

(function initAuth(){
  // Kalau sudah pernah login (role tersimpan di localStorage), langsung
  // terapkan pembatasan tampilannya begitu skrip ini jalan.
  if(getAuthRole()){
    applyRolePermissions();
  }

  const form = document.getElementById("authForm");
  const errorEl = document.getElementById("authError");
  if(form){
    form.addEventListener("submit", function(e){
      e.preventDefault();
      const uEl = document.getElementById("authUsername");
      const pEl = document.getElementById("authPassword");
      const ok = doLogin(uEl ? uEl.value : "", pEl ? pEl.value : "");
      if(ok){
        document.documentElement.setAttribute("data-authed", "1");
        if(errorEl) errorEl.textContent = "";
        applyRolePermissions();
      } else {
        if(errorEl) errorEl.textContent = "Username atau password salah.";
        if(pEl){ pEl.value = ""; pEl.focus(); }
      }
    });
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if(logoutBtn){
    logoutBtn.addEventListener("click", doLogout);
  }
})();
