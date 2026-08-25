// ==========================================================
// stockbit-proxy — Supabase Edge Function
//
// TUJUAN: meneruskan request ke API Stockbit (tidak resmi, mis.
// exodus.stockbit.com) DARI SISI SERVER, supaya browser tidak kena
// blokir CORS saat app.js memanggilnya langsung dari halaman lain.
//
// app.js akan mengirim POST ke sini dengan body:
//   { "url": "https://exodus.stockbit.com/stream/v3/symbol/BBCA", "token": "..." }
// Fungsi ini meneruskan request itu ke `url` dengan header
// Authorization: Bearer <token>, lalu mengembalikan body + status
// aslinya apa adanya ke browser, plus header CORS supaya diizinkan.
//
// CARA DEPLOY (dari terminal, folder project Supabase-mu):
//   supabase functions deploy stockbit-proxy --no-verify-jwt
//
// Lalu isi URL function ini (https://<project>.supabase.co/functions/v1/stockbit-proxy)
// ke field "Proxy URL" di ⚙️ Pengaturan aplikasi.
//
// CATATAN KEAMANAN: --no-verify-jwt dipakai supaya app.js (client statis,
// tanpa login Supabase Auth) bisa memanggilnya. Karena itu, JANGAN taruh
// token Stockbit di sini sebagai secret bersama — token tetap dikirim
// dari browser tiap request (persis seperti pola anon key di config.js:
// aman karena token itu milikmu sendiri, bukan rahasia yang dibagi lewat
// server). Kalau mau lebih ketat, bisa tambahkan pengecekan header
// custom (mis. X-App-Secret) yang cuma diketahui app.js-mu.
// ==========================================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // ganti dengan domain app-mu kalau mau lebih ketat
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed, pakai POST." }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let payload: { url?: string; token?: string };
  try {
    payload = await req.json();
  } catch (_e) {
    return new Response(JSON.stringify({ message: "Body harus JSON: {url, token}" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { url, token } = payload;
  if (!url || !token) {
    return new Response(JSON.stringify({ message: "Field 'url' dan 'token' wajib diisi." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Whitelist domain tujuan supaya proxy ini tidak disalahgunakan jadi
  // open-proxy sembarang situs. Tambahkan domain lain kalau perlu
  // (mis. broker summary Stockbit ternyata di subdomain berbeda).
  const ALLOWED_HOSTS = ["exodus.stockbit.com", "stockbit.com", "api.stockbit.com"];
  let targetHost: string;
  try {
    targetHost = new URL(url).hostname;
  } catch (_e) {
    return new Response(JSON.stringify({ message: "URL tidak valid." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
  if (!ALLOWED_HOSTS.some((h) => targetHost === h || targetHost.endsWith("." + h))) {
    return new Response(JSON.stringify({ message: `Domain "${targetHost}" tidak ada di whitelist proxy.` }), {
      status: 403,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
      },
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...CORS_HEADERS, "Content-Type": upstream.headers.get("content-type") || "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ message: `Gagal menghubungi Stockbit: ${(e as Error).message}` }), {
      status: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
