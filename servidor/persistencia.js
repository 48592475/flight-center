/* Guardado de datos.
   - Con DATABASE_URL (Render): PostgreSQL.
   - Sin DATABASE_URL (pruebas locales): archivos en ./datos
   Los datos del sistema se guardan como un documento JSON; los PDF, aparte. */
const fs = require('fs');
const path = require('path');

const URL_DB = process.env.DATABASE_URL;
let pool = null;
const DIR = path.join(__dirname, 'datos');

async function iniciar() {
  if (URL_DB) {
    const { Pool } = require('pg');
    const local = /localhost|127\.0\.0\.1/.test(URL_DB) || !/\./.test(new URL(URL_DB).hostname);
    pool = new Pool({ connectionString: URL_DB, ssl: local ? false : { rejectUnauthorized: false }, max: 5 });
    await pool.query(`CREATE TABLE IF NOT EXISTS fc_estado (id INT PRIMARY KEY, datos JSONB NOT NULL, actualizado TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS fc_documentos (usuario_id INT NOT NULL, tipo TEXT NOT NULL, data TEXT NOT NULL, actualizado TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (usuario_id, tipo))`);
    console.log('Base de datos: PostgreSQL');
  } else {
    fs.mkdirSync(path.join(DIR, 'documentos'), { recursive: true });
    console.log('Base de datos: archivos locales en', DIR);
  }
}

async function cargar() {
  if (pool) { const r = await pool.query('SELECT datos FROM fc_estado WHERE id = 1'); return r.rows[0]?.datos || null; }
  try { return JSON.parse(fs.readFileSync(path.join(DIR, 'estado.json'), 'utf8')); } catch { return null; }
}

// Guardado agrupado: si llegan varios cambios seguidos se escribe la última versión.
let escribiendo = false; let pendiente = null;
function guardar(db) {
  pendiente = JSON.stringify(db);
  if (!escribiendo) escribir();
}
async function escribir() {
  escribiendo = true;
  while (pendiente) {
    const texto = pendiente; pendiente = null;
    try {
      if (pool) await pool.query(`INSERT INTO fc_estado (id, datos, actualizado) VALUES (1, $1::jsonb, now()) ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos, actualizado = now()`, [texto]);
      else { fs.writeFileSync(path.join(DIR, 'estado.tmp'), texto); fs.renameSync(path.join(DIR, 'estado.tmp'), path.join(DIR, 'estado.json')); }
    } catch (e) { console.error('Error al guardar los datos:', e.message); pendiente = pendiente || texto; await new Promise((r) => setTimeout(r, 2000)); }
  }
  escribiendo = false;
}
const sinGuardar = () => escribiendo || !!pendiente;

const archivoDoc = (uid, tipo) => path.join(DIR, 'documentos', `${Number(uid)}-${String(tipo).replace(/[^a-z]/g, '')}.txt`);
const docs = {
  guardar(uid, tipo, data) {
    const p = pool ? pool.query(`INSERT INTO fc_documentos (usuario_id, tipo, data) VALUES ($1, $2, $3) ON CONFLICT (usuario_id, tipo) DO UPDATE SET data = EXCLUDED.data, actualizado = now()`, [uid, tipo, data])
      : Promise.resolve(fs.writeFileSync(archivoDoc(uid, tipo), data));
    p.catch((e) => console.error('Error al guardar un documento:', e.message));
  },
  borrar(uid, tipo) {
    const p = pool ? pool.query('DELETE FROM fc_documentos WHERE usuario_id = $1 AND tipo = $2', [uid, tipo]) : Promise.resolve(fs.rmSync(archivoDoc(uid, tipo), { force: true }));
    p.catch((e) => console.error('Error al borrar un documento:', e.message));
  },
  async leer(uid, tipo) {
    if (pool) { const r = await pool.query('SELECT data FROM fc_documentos WHERE usuario_id = $1 AND tipo = $2', [uid, tipo]); return r.rows[0]?.data || null; }
    try { return fs.readFileSync(archivoDoc(uid, tipo), 'utf8'); } catch { return null; }
  },
};

module.exports = { iniciar, cargar, guardar, sinGuardar, docs };
