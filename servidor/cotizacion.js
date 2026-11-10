/* Cotización del dólar en Argentina desde dolarapi.com (gratis, sin clave).
   Se actualiza al arrancar y cada hora; si falla, queda la última conocida. */
const BASE = (process.env.COTIZACION_URL || 'https://dolarapi.com/v1/dolares').replace(/\/$/, '');

async function actualizar(Store) {
  const casa = Store._casaCotizacion();
  if (casa === 'manual') return;
  try {
    const r = await fetch(`${BASE}/${casa}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`respondió ${r.status}`);
    const j = await r.json();
    if (!(Number(j.venta) > 0)) throw new Error('respuesta sin valor de venta');
    Store._setCotizacion({ venta: Number(j.venta), compra: Number(j.compra), fecha: j.fechaActualizacion, casa, fuente: 'dolarapi.com' });
  } catch (e) { console.error('Cotización del dólar no actualizada:', e.message); }
}
function iniciar(Store) { actualizar(Store); setInterval(() => actualizar(Store), 60 * 60 * 1000).unref(); }
module.exports = { actualizar, iniciar };
