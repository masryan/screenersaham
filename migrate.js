#!/usr/bin/env node
// ==========================================
// migrate.js — Backup satu kali dari Supabase (Postgres) ke MySQL.
//
// Cara pakai singkat (detail lengkap di README.md):
//   1. cp .env.example .env, lalu isi kredensial Postgres & MySQL
//   2. npm install
//   3. node migrate.js
//
// Yang dilakukan script ini:
//   - Konek ke Postgres pakai SATU koneksi & membuka transaksi
//     REPEATABLE READ READ ONLY di awal, supaya SEMUA tabel dibaca dari
//     titik waktu yang persis sama (snapshot konsisten) — bukan diambil
//     satu-satu di waktu berbeda-beda selagi data masih mungkin berubah.
//   - Membaca daftar tabel & kolom langsung dari information_schema
//     Postgres (BUKAN hardcode dari screener.sql), supaya tetap valid
//     walau skema berubah di kemudian hari.
//   - Mengurutkan tabel berdasarkan foreign key (topological sort) supaya
//     tabel induk (mis. stocks) selalu dibuat & diisi SEBELUM tabel anak
//     yang mereferensikannya (mis. flows, stock_indicators_ext).
//   - Membuat tabel di MySQL kalau belum ada (CREATE TABLE IF NOT EXISTS)
//     dengan tipe kolom hasil konversi otomatis dari tipe Postgres.
//   - Menyalin semua baris per tabel dalam batch (default 1000 baris/insert).
//
// SENGAJA TIDAK direplikasi ke MySQL: DEFAULT expression Postgres yang
// pakai SQL kompleks (mis. kolom generated `change_pct` di market_index),
// CHECK constraint, dan FOREIGN KEY constraint. Tujuan script ini adalah
// BACKUP DATA (nilai baris apa adanya), bukan mereplikasi aturan skema
// Postgres 1:1 ke MySQL. Semua kolom dibuat NULLABLE di MySQL supaya
// proses insert tidak gagal gara-gara constraint, termasuk untuk baris
// lama/tidak biasa sekalipun.
// ==========================================

require("dotenv").config();
const { Client } = require("pg");
const mysql = require("mysql2/promise");

// ---------- Konfigurasi dari .env ----------
const PG_CONNECTION_STRING = process.env.PG_CONNECTION_STRING;
const SOURCE_SCHEMA = process.env.SOURCE_SCHEMA || "public";

const MYSQL_HOST = process.env.MYSQL_HOST || "127.0.0.1";
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || "";
const MYSQL_DATABASE = process.env.MYSQL_DATABASE;

const BATCH_SIZE = Number(process.env.BATCH_SIZE || 1000);
const TRUNCATE_BEFORE_INSERT = String(process.env.TRUNCATE_BEFORE_INSERT || "true").toLowerCase() !== "false";

// Filter opsional: hanya migrasi tabel tertentu, atau kecualikan beberapa.
const ONLY_TABLES = (process.env.TABLES || "").split(",").map(s => s.trim()).filter(Boolean);
const EXCLUDE_TABLES = (process.env.EXCLUDE_TABLES || "").split(",").map(s => s.trim()).filter(Boolean);

if (!PG_CONNECTION_STRING) {
  console.error("❌ PG_CONNECTION_STRING belum diisi di .env — lihat .env.example");
  process.exit(1);
}
if (!MYSQL_USER || !MYSQL_DATABASE) {
  console.error("❌ MYSQL_USER / MYSQL_DATABASE belum diisi di .env — lihat .env.example");
  process.exit(1);
}

// ---------- Mapping tipe kolom Postgres -> MySQL ----------
function pgTypeToMysql(col) {
  const t = col.data_type;
  const udt = col.udt_name || "";
  if (t === "ARRAY") return "JSON"; // array Postgres disimpan sebagai JSON di MySQL
  switch (t) {
    case "integer": return "INT";
    case "smallint": return "SMALLINT";
    case "bigint": return "BIGINT";
    case "boolean": return "TINYINT(1)";
    case "numeric": {
      const p = col.numeric_precision, s = col.numeric_scale;
      // numeric TANPA presisi eksplisit di Postgres artinya presisi bebas
      // -> paling aman dipetakan ke DOUBLE, bukan dipaksa DECIMAL(p,s)
      // dengan p/s yang sebenarnya null.
      return (p != null && s != null) ? `DECIMAL(${Math.min(p, 65)},${Math.min(s, 30)})` : "DOUBLE";
    }
    case "double precision": return "DOUBLE";
    case "real": return "FLOAT";
    case "character varying": return `VARCHAR(${col.character_maximum_length || 255})`;
    case "character": return `CHAR(${col.character_maximum_length || 1})`;
    case "text": return "LONGTEXT";
    case "date": return "DATE";
    case "timestamp with time zone":
    case "timestamp without time zone": return "DATETIME(6)";
    case "jsonb":
    case "json": return "JSON";
    case "uuid": return "CHAR(36)";
    default:
      if (udt === "uuid") return "CHAR(36)";
      return "LONGTEXT"; // fallback aman untuk tipe yang belum dikenal
  }
}

// Konversi 1 nilai hasil query Postgres supaya siap di-INSERT ke MySQL.
function coerceValue(v, mysqlType) {
  if (v === null || v === undefined) return null;
  if (mysqlType === "JSON") {
    // driver `pg` sudah otomatis parse jsonb jadi object/array JS -> perlu
    // di-stringify lagi supaya cocok dimasukkan ke kolom JSON MySQL.
    return typeof v === "string" ? v : JSON.stringify(v);
  }
  if (mysqlType === "TINYINT(1)") return v ? 1 : 0;
  if (v instanceof Date) {
    return mysqlType === "DATE"
      ? v.toISOString().slice(0, 10)
      : v.toISOString().slice(0, 23).replace("T", " ");
  }
  return v;
}

async function getTables(pg) {
  const { rows } = await pg.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = $1 AND table_type = 'BASE TABLE'
     ORDER BY table_name`, [SOURCE_SCHEMA]
  );
  let names = rows.map(r => r.table_name);
  if (ONLY_TABLES.length) names = names.filter(n => ONLY_TABLES.includes(n));
  if (EXCLUDE_TABLES.length) names = names.filter(n => !EXCLUDE_TABLES.includes(n));
  return names;
}

async function getColumns(pg, table) {
  const { rows } = await pg.query(
    `SELECT column_name, data_type, udt_name,
            character_maximum_length, numeric_precision, numeric_scale
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`, [SOURCE_SCHEMA, table]
  );
  return rows;
}

async function getPrimaryKey(pg, table) {
  const { rows } = await pg.query(
    `SELECT kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     WHERE tc.table_schema = $1 AND tc.table_name = $2 AND tc.constraint_type = 'PRIMARY KEY'
     ORDER BY kcu.ordinal_position`, [SOURCE_SCHEMA, table]
  );
  return rows.map(r => r.column_name);
}

// Foreign key (dalam schema sumber saja) -> dipakai buat urutan migrasi.
// FK yang menunjuk keluar schema (mis. profiles.id -> auth.users) otomatis
// tidak ikut karena tabel "parent"-nya tidak ada di daftar tabel schema
// sumber yang kita migrasi.
async function getForeignKeys(pg, tables) {
  const { rows } = await pg.query(
    `SELECT tc.table_name AS child, ccu.table_name AS parent
     FROM information_schema.table_constraints tc
     JOIN information_schema.constraint_column_usage ccu
       ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
     WHERE tc.table_schema = $1 AND tc.constraint_type = 'FOREIGN KEY'`, [SOURCE_SCHEMA]
  );
  return rows.filter(r => tables.includes(r.child) && tables.includes(r.parent) && r.child !== r.parent);
}

// Topological sort sederhana (Kahn's algorithm). Kalau ada siklus (jarang
// terjadi), sisa tabel yang belum kebagian urutan ditaruh di akhir apa
// adanya — backup tetap jalan, cuma urutannya tidak dijamin sempurna.
function sortTablesByDependency(tables, foreignKeys) {
  const deps = new Map(tables.map(t => [t, new Set()])); // child -> set(parent)
  foreignKeys.forEach(fk => deps.get(fk.child)?.add(fk.parent));

  const result = [];
  const remaining = new Set(tables);
  let progress = true;
  while (remaining.size && progress) {
    progress = false;
    for (const t of [...remaining]) {
      const stillWaiting = [...deps.get(t)].some(p => remaining.has(p));
      if (!stillWaiting) { result.push(t); remaining.delete(t); progress = true; }
    }
  }
  if (remaining.size) {
    console.warn(`⚠️  Kemungkinan foreign key siklik, ${remaining.size} tabel diurutkan apa adanya: ${[...remaining].join(", ")}`);
    result.push(...remaining);
  }
  return result;
}

function quoteIdent(name) { return `\`${String(name).replace(/`/g, "``")}\``; }

async function ensureMysqlTable(mysqlConn, table, columns, primaryKey) {
  const colDefs = columns.map(c => `${quoteIdent(c.column_name)} ${pgTypeToMysql(c)} NULL`);
  let sql = `CREATE TABLE IF NOT EXISTS ${quoteIdent(table)} (\n  ${colDefs.join(",\n  ")}`;
  if (primaryKey.length) {
    sql += `,\n  PRIMARY KEY (${primaryKey.map(quoteIdent).join(", ")})`;
  }
  sql += `\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
  await mysqlConn.query(sql);
}

async function copyTableData(pg, mysqlConn, table, columns) {
  const colNames = columns.map(c => c.column_name);
  const mysqlTypes = columns.map(pgTypeToMysql);
  const selectCols = colNames.map(c => `"${c}"`).join(", ");

  if (TRUNCATE_BEFORE_INSERT) {
    await mysqlConn.query(`TRUNCATE TABLE ${quoteIdent(table)}`);
  }

  let offset = 0, total = 0;
  for (;;) {
    const { rows } = await pg.query(
      `SELECT ${selectCols} FROM "${SOURCE_SCHEMA}"."${table}" ORDER BY ctid LIMIT $1 OFFSET $2`,
      [BATCH_SIZE, offset]
    );
    if (!rows.length) break;

    const values = rows.map(r => colNames.map((c, i) => coerceValue(r[c], mysqlTypes[i])));
    const sql = `INSERT INTO ${quoteIdent(table)} (${colNames.map(quoteIdent).join(", ")}) VALUES ?`;
    await mysqlConn.query(sql, [values]);

    total += rows.length;
    offset += BATCH_SIZE;
    process.stdout.write(`\r   ↳ ${table}: ${total} baris tersalin...`);
    if (rows.length < BATCH_SIZE) break;
  }
  if (total) process.stdout.write("\n");
  return total;
}

async function main() {
  console.log("🔌 Menghubungkan ke Postgres (Supabase)...");
  const pg = new Client({ connectionString: PG_CONNECTION_STRING, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  // Snapshot konsisten: SEMUA tabel dibaca dari titik waktu yang sama,
  // walau proses migrasinya sendiri makan waktu beberapa menit.
  await pg.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");

  console.log("🔌 Menghubungkan ke MySQL...");
  const mysqlConn = await mysql.createConnection({
    host: MYSQL_HOST, port: MYSQL_PORT, user: MYSQL_USER,
    password: MYSQL_PASSWORD, database: MYSQL_DATABASE,
    multipleStatements: false,
  });
  // Matikan FK checks sementara supaya proses insert antar tabel tidak
  // gampang gagal walau topological sort di atas sudah dipasang.
  await mysqlConn.query("SET FOREIGN_KEY_CHECKS = 0");

  const summary = [];
  try {
    const tables = await getTables(pg);
    console.log(`📋 ${tables.length} tabel ditemukan di schema "${SOURCE_SCHEMA}": ${tables.join(", ")}`);

    const foreignKeys = await getForeignKeys(pg, tables);
    const ordered = sortTablesByDependency(tables, foreignKeys);

    for (const table of ordered) {
      console.log(`\n▶️  ${table}`);
      try {
        const columns = await getColumns(pg, table);
        const primaryKey = await getPrimaryKey(pg, table);
        await ensureMysqlTable(mysqlConn, table, columns, primaryKey);
        const count = await copyTableData(pg, mysqlConn, table, columns);
        console.log(`   ✅ selesai — ${count} baris`);
        summary.push({ table, ok: true, count });
      } catch (e) {
        console.error(`   ❌ gagal migrasi tabel ${table}:`, e.message);
        summary.push({ table, ok: false, error: e.message });
      }
    }
  } finally {
    await pg.query("ROLLBACK"); // transaksi cuma dipakai buat snapshot baca, tidak ada tulis di sisi Postgres
    await pg.end();
    await mysqlConn.query("SET FOREIGN_KEY_CHECKS = 1");
    await mysqlConn.end();
  }

  console.log("\n================ RINGKASAN ================");
  summary.forEach(s => {
    console.log(s.ok ? `✅ ${s.table}: ${s.count} baris` : `❌ ${s.table}: GAGAL — ${s.error}`);
  });
  const failed = summary.filter(s => !s.ok).length;
  console.log(failed ? `\n⚠️  Selesai dengan ${failed} tabel gagal — cek log di atas.` : "\n🎉 Semua tabel berhasil dibackup ke MySQL.");
  process.exit(failed ? 1 : 0);
}

main().catch(e => {
  console.error("💥 Migrasi gagal total:", e);
  process.exit(1);
});
