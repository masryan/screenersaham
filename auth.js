//
===========================================
===============
// auth.js — Login & Approval Gate
(Supabase Auth)
//
// File ini WAJIB dimuat di index.html:
//   1. SETELAH SDK @supabase/supabase-js
(CDN)
//   2. SEBELUM app.js
//
// Tugasnya:
//   - Menampilkan layar login/daftar kalau
belum ada sesi.
//   - Setelah login, cek tabel `profiles`:
kalau status belum 'approved'
//     (masih pending / sudah expired),
tampilkan layar "menunggu approval"
//     dan TIDAK memuat aplikasi/data sama
sekali.
//   - Kalau approved, sembunyikan layar
ini, tampilkan aplikasi, lalu
//     resolve window.authReady supaya
app.js lanjut jalan (loadLive(), dst).
//   - Menyediakan window.getAuthHeader()
dipakai app.js untuk mengganti
//     header Authorization dari "anon key
untuk semua orang" menjadi
//     "token JWT user yang login" — ini
KUNCI supaya RLS di Supabase bisa
//     membedakan siapa yang sedang akses
(auth.uid()).
//
===========================================
===============
(function () {
  const AUTH_SUPA_URL = (window.APP_CONFIG
&& window.APP_CONFIG.SUPABASE_URL) ||
localStorage.getItem("ihsg_supa_url") ||
"";
  const AUTH_SUPA_KEY = (window.APP_CONFIG
&& window.APP_CONFIG.SUPABASE_ANON_KEY) ||
localStorage.getItem("ihsg_supa_key") ||
"";
  let resolveAuthReady;
  window.authReady = new Promise((res) => {
resolveAuthReady = res; });
  window.authProfile = null; //
{id,email,role,status,expires_at} setelah
lolos gate
  if (!AUTH_SUPA_URL || !AUTH_SUPA_KEY ||
!window.supabase) {
   
document.getElementById("authGateMsg").text
Content =
      "Konfigurasi Supabase belum diisi di
config.js. Login tidak bisa berjalan.";
   
document.getElementById("authGateOverlay").
style.display = "flex";
    return;
  }
  const sb =
window.supabase.createClient(AUTH_SUPA_URL,
AUTH_SUPA_KEY);
  window.sbAuthClient = sb;
  // window.__currentAccessToken diisi/direfresh oleh runGate() dan
  // onAuthStateChange() di bawah — dibaca
langsung oleh getSupaHeaders()
  // di app.js supaya tiap request ke
Supabase membawa JWT user yang login.
  window.__currentAccessToken = null;
  const overlay =
document.getElementById("authGateOverlay");
  const els = {
    msg:
document.getElementById("authGateMsg"),
    loginBox:
document.getElementById("authLoginBox"),
    pendingBox:
document.getElementById("authPendingBox"),
    email:
document.getElementById("authEmail"),
    password:
document.getElementById("authPassword"),
    loginBtn:
document.getElementById("authLoginBtn"),
    signupBtn:
document.getElementById("authSignupBtn"),
    error:
document.getElementById("authError"),
    pendingText:
document.getElementById("authPendingText"),
    logoutFromPendingBtn:
document.getElementById("authLogoutFromPend
ing"),
  };
  function showLoginForm() {
    els.loginBox.style.display = "block";
    els.pendingBox.style.display = "none";
    overlay.style.display = "flex";
  }
  function showPending(status, expiresAt) {
    els.loginBox.style.display = "none";
    els.pendingBox.style.display = "block";
    overlay.style.display = "flex";
    if (status === "expired" || (expiresAt
&& new Date(expiresAt) < new Date())) {
      els.pendingText.textContent =
        "Paket langganan kamu sudah
berakhir. Silakan lakukan pembayaran ulang,
lalu tunggu admin mengaktifkan kembali
akunmu.";
    } else {
      els.pendingText.textContent =
        "Akun berhasil dibuat. Akun kamu
sedang menunggu approval admin setelah
pembayaran diterima. Silakan cek kembali
beberapa saat lagi.";
    }
  }
  function hideOverlayAndEnterApp(profile)
{
    window.authProfile = profile;
    overlay.style.display = "none";
    document.body.classList.add("authapproved");
    resolveAuthReady(profile);
  }
  async function fetchProfile(userId) {
    const { data, error } = await
sb.from("profiles").select("*").eq("id",
userId).single();
    if (error) return null;
    return data;
  }
  async function runGate() {
    const { data: { session } } = await
sb.auth.getSession();
    window.__currentAccessToken = session ?
session.access_token : null;
    if (!session) {
      showLoginForm();
      return;
    }
    const profile = await
fetchProfile(session.user.id);
    if (!profile || profile.status !==
"approved" ||
        (profile.expires_at && new
Date(profile.expires_at) < new Date())) {
      showPending(profile ? profile.status
: "pending", profile ? profile.expires_at :
null);
      return;
    }
    hideOverlayAndEnterApp(profile);
  }
  els.loginBtn.addEventListener("click",
async () => {
    els.error.textContent = "";
    const { error } = await
sb.auth.signInWithPassword({
      email: els.email.value.trim(),
      password: els.password.value,
    });
    if (error) { els.error.textContent =
"Login gagal: " + error.message; return; }
    runGate();
  });
  els.signupBtn.addEventListener("click",
async () => {
    els.error.textContent = "";
    const { error } = await
sb.auth.signUp({
      email: els.email.value.trim(),
      password: els.password.value,
    });
    if (error) { els.error.textContent =
"Daftar gagal: " + error.message; return; }
    els.error.style.color = "var(--up)";
    els.error.textContent = "Akun dibuat!
Silakan lakukan pembayaran, lalu tunggu
admin approve akunmu.";
    runGate();
  });
els.logoutFromPendingBtn.addEventListener("
click", async () => {
    await sb.auth.signOut();
    location.reload();
  });
  // Tombol logout di header aplikasi
(ditambahkan lewat index.html)
document.addEventListener("DOMContentLoaded
", () => {
    const logoutBtn =
document.getElementById("authLogoutBtn");
    if (logoutBtn)
logoutBtn.addEventListener("click", async
() => {
      await sb.auth.signOut();
      location.reload();
    });
  });
  sb.auth.onAuthStateChange((_event,
session) => {
    window.__currentAccessToken = session ?
session.access_token : null;
  });
  runGate();
})();