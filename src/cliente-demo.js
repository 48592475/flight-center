/* Modo demo: la lógica corre en el navegador y los datos quedan en localStorage. */
const MODO = 'demo';
const Store = (() => {
  const s = crearStore();
  fetch('https://dolarapi.com/v1/dolares/oficial').then((r) => r.json()).then((j) => { if (j.venta > 0) s._setCotizacion({ venta: j.venta, compra: j.compra, fecha: j.fechaActualizacion, casa: 'oficial', fuente: 'dolarapi.com' }); }).catch(() => {});
  const SINCRONICOS = new Set(['BLOQUES', 'LECCIONES', 'TRACKS', 'itemKeys', 'OPR', 'hoy', 'dia']);
  return new Proxy(s, {
    get(t, k) {
      const v = t[k];
      if (SINCRONICOS.has(k) || typeof v !== 'function') return v;
      return (...a) => new Promise((ok, mal) => { try { ok(v(...a)); } catch (e) { mal(e); } });
    },
  });
})();
