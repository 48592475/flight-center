/* Modo demo: la lógica corre en el navegador y los datos quedan en localStorage. */
const MODO = 'demo';
const Store = (() => {
  const s = crearStore();
  const SINCRONICOS = new Set(['BLOQUES', 'LECCIONES', 'TRACKS', 'itemKeys', 'OPR', 'hoy', 'dia']);
  return new Proxy(s, {
    get(t, k) {
      const v = t[k];
      if (SINCRONICOS.has(k) || typeof v !== 'function') return v;
      return (...a) => new Promise((ok, mal) => { try { ok(v(...a)); } catch (e) { mal(e); } });
    },
  });
})();
