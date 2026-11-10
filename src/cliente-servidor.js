/* Modo servidor: cada acción se envía al servidor, que guarda los datos en la base. */
const MODO = 'servidor';
const Store = (() => {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const local = {
    BLOQUES: [8, 10, 12, 14, 16],
    LECCIONES: Object.fromEntries([...SYLLABUS.teorica, ...SYLLABUS.vuelo, ...SYLLABUS.simulador, ...SYLLABUS_PCA.vuelo, ...SYLLABUS_PCA.simulador].map((l) => [l.id, l])),
    PROGRAMAS: {
      ppa: { nombre: 'Piloto Privado de Avión con habilitación VFR controlado', corto: 'PPA – VFR controlado', tracks: { teorica: SYLLABUS.teorica, vuelo: SYLLABUS.vuelo, simulador: SYLLABUS.simulador }, reglas: SYLLABUS.reglas, escala: ['MB', 'B', 'R'], ok: ['MB', 'B'] },
      pca: { nombre: SYLLABUS_PCA.nombre, corto: 'PCA c/HVI', tracks: { vuelo: SYLLABUS_PCA.vuelo, simulador: SYLLABUS_PCA.simulador }, reglas: SYLLABUS_PCA.reglas, escala: ['S+', 'S', 'S-', 'N'], ok: ['S+', 'S'] },
    },
    TRACKS: { teorica: SYLLABUS.teorica, vuelo: SYLLABUS.vuelo, simulador: SYLLABUS.simulador },
    itemKeys: (l) => l.secciones.flatMap((s, si) => s.items.map((_, ii) => `${si}.${ii}`)),
    OPR: 'OPR/TWR.SRL',
    hoy: () => iso(new Date()),
    dia: (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); },
  };
  async function llamar(m, a) {
    let r;
    try {
      r = await fetch('/api/rpc', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ m, a }) });
    } catch { throw new Error('No hay conexión con el servidor. Revisá tu internet y probá de nuevo.'); }
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && m !== 'login' && m !== 'yo') { setTimeout(() => { state.user = null; render(); }, 0); }
    if (!r.ok) {
      if (d.error) throw new Error(d.error);
      if (r.status === 413) throw new Error('El archivo es demasiado grande. El máximo es 20 MB por archivo.');
      if ([502, 503, 504].includes(r.status)) throw new Error('El servidor se está iniciando o no responde. Esperá un minuto y probá de nuevo.');
      throw new Error(`Ocurrió un error en el servidor (código ${r.status}). Probá de nuevo en un momento.`);
    }
    return d.r;
  }
  return new Proxy(local, { get: (t, k) => (k in t ? t[k] : (...a) => llamar(k, a)) });
})();
