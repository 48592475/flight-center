/* Modo servidor: cada acción se envía al servidor, que guarda los datos en la base. */
const MODO = 'servidor';
const Store = (() => {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const local = {
    BLOQUES: [8, 10, 12, 14, 16],
    LECCIONES: Object.fromEntries([...SYLLABUS.teorica, ...SYLLABUS.vuelo, ...SYLLABUS.simulador].map((l) => [l.id, l])),
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
    if (!r.ok) throw new Error(d.error || 'Ocurrió un error en el servidor');
    return d.r;
  }
  return new Proxy(local, { get: (t, k) => (k in t ? t[k] : (...a) => llamar(k, a)) });
})();
