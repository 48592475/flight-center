/* METAR y TAF del Aviation Weather Center (NOAA) y NOTAM de la FAA (opcional, requiere clave). */
const cache = new Map(); // código → { t, datos }
const DURACION = 5 * 60 * 1000;

async function texto(url, opciones) {
  const r = await fetch(url, { ...opciones, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

async function notams(id) {
  const { FAA_CLIENT_ID, FAA_CLIENT_SECRET } = process.env;
  if (!FAA_CLIENT_ID || !FAA_CLIENT_SECRET) return null;
  const t = await texto(`https://external-api.faa.gov/notamapi/v1/notams?icaoLocation=${id}&pageSize=50&sortBy=effectiveStartDate&sortOrder=Desc`,
    { headers: { client_id: FAA_CLIENT_ID, client_secret: FAA_CLIENT_SECRET } });
  const j = JSON.parse(t);
  return (j.items || []).map((it) => { const n = it.properties?.coreNOTAMData?.notam || {};
    return { numero: n.number || n.id || '', texto: n.text || '', desde: n.effectiveStart || '', hasta: n.effectiveEnd || '' }; });
}

async function consultar(id) {
  id = String(id || '').toUpperCase().trim();
  if (!/^[A-Z0-9]{3,4}$/.test(id)) throw new Error('Código OACI inválido');
  const c = cache.get(id);
  if (c && Date.now() - c.t < DURACION) return c.datos;
  const [m, t, n] = await Promise.allSettled([
    texto(`https://aviationweather.gov/api/data/metar?ids=${id}&format=raw&hours=3`),
    texto(`https://aviationweather.gov/api/data/taf?ids=${id}&format=raw`),
    notams(id),
  ]);
  const datos = {
    id,
    metar: m.status === 'fulfilled' ? (m.value.trim().split('\n')[0] || '').trim() : null,
    taf: t.status === 'fulfilled' ? t.value.trim().replace(/\s+/g, ' ') : null,
    notams: n.status === 'fulfilled' ? n.value : null,
    notamsConfigurado: !!(process.env.FAA_CLIENT_ID && process.env.FAA_CLIENT_SECRET),
    error: m.status === 'rejected' ? 'No se pudo consultar el Aviation Weather Center' : null,
    consultado: new Date().toISOString(),
  };
  cache.set(id, { t: Date.now(), datos });
  return datos;
}

module.exports = { consultar };
