/* =====================================================================
   Flight Center · capa de datos
   Todas las reglas del negocio viven acá. El mismo archivo corre:
   - en el navegador (demo de GitHub Pages, datos en localStorage)
   - en el servidor (Node), con persistencia en PostgreSQL
   ===================================================================== */
function crearStore(opts = {}) {
  const KEY = 'flightcenter-demo-v2';
  const BLOQUES = [8, 10, 12, 14, 16];
  const NOTAS_OK = ['MB', 'B'];
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hoy = () => iso(new Date());
  const dia = (n, base = new Date()) => { const d = new Date(base); d.setDate(d.getDate() + n); return iso(d); };
  const ahora = () => new Date().toISOString().replace('T', ' ').slice(0, 16);
  const hh = (b) => `${String(b).padStart(2, '0')}:00`;
  const fail = (m) => { throw new Error(m); };
  const hashPass = opts.hashPass || ((p) => String(p));
  const verificarPass = opts.verificarPass || ((p, h) => String(p) === h);

  // ---------- syllabus ----------
  const TRACKS = { teorica: SYLLABUS.teorica, vuelo: SYLLABUS.vuelo, simulador: SYLLABUS.simulador };
  const LECCIONES = Object.fromEntries([...SYLLABUS.teorica, ...SYLLABUS.vuelo, ...SYLLABUS.simulador].map((l) => [l.id, l]));
  // datos de cada modelo para el plan de vuelo (casillas 9, 10, 15, 19)
  const DATOS_MODELO = [
    [/152/, { oaci: 'C152', estela: 'L', equipo: 'S/C', velocidad: 'N0090', autonomia: '0330', color: 'BLANCO Y AZUL' }],
    [/172/, { oaci: 'C172', estela: 'L', equipo: 'S/C', velocidad: 'N0110', autonomia: '0430', color: 'BLANCO Y AZUL' }],
    [/PA-?28/i, { oaci: 'P28A', estela: 'L', equipo: 'S/C', velocidad: 'N0105', autonomia: '0430', color: 'BLANCO Y AZUL' }],
  ];
  const datosModelo = (modelo) => ({ oaci: '', estela: 'L', equipo: 'S/C', velocidad: 'N0090', autonomia: '0300', color: '', ...(DATOS_MODELO.find(([re]) => re.test(modelo || ''))?.[1] || {}) });
  const itemKeys = (l) => l.secciones.flatMap((s, si) => s.items.map((_, ii) => `${si}.${ii}`));

  // ---------- datos de ejemplo ----------
  function semilla() {
    const db = { v: 2, seq: { u: 0, rec: 0, r: 0, c: 0, i: 0, n: 0 }, usuarios: [], recursos: [], disponibilidad: {}, reservas: [], clases: [], inscripciones: [], novedades: [] };
    const U = (rol, nombre, apellido, email, extra = {}) => {
      const u = { id: ++db.seq.u, rol, activo: true, nombre, apellido, email, password: hashPass('flight123'), dni: '', fecha_nacimiento: '', direccion: '', telefono: '',
        contacto_emergencia: '', licencia_nro: '', vencimiento_cma: '', horas_previas: 0, docs: {}, ...extra };
      db.usuarios.push(u); return u.id;
    };
    const admin = U('admin', 'Gabriela', 'Torres', 'admin@flightcenter.com', { telefono: '+54 9 11 5555-0001', direccion: 'Aeródromo de Morón, Hangar 3' });
    const mec = U('mecanico', 'Carlos', 'Medina', 'mecanico@flightcenter.com', { telefono: '+54 9 11 5555-0002', licencia_nro: 'MMA-2231', direccion: 'Castelar, Buenos Aires' });
    const martin = U('instructor', 'Martín', 'Gómez', 'instructor@flightcenter.com', { dni: '25111222', fecha_nacimiento: '1980-03-12', direccion: 'Av. Libertador 1200, San Fernando', telefono: '+54 9 11 5555-1001', contacto_emergencia: 'Laura Gómez +54 9 11 5555-2001', licencia_nro: 'INV-4521', vencimiento_cma: '2027-05-30', horas_previas: 3250 });
    const sofia = U('instructor', 'Sofía', 'Ramírez', 'sofia@flightcenter.com', { dni: '30222333', fecha_nacimiento: '1987-08-02', direccion: 'Calle Belgrano 455, Tigre', telefono: '+54 9 11 5555-1002', contacto_emergencia: 'Pablo Ramírez +54 9 11 5555-2002', licencia_nro: 'INV-5873', vencimiento_cma: '2027-01-15', horas_previas: 1840 });
    const diego = U('instructor', 'Diego', 'Ortiz', 'diego@flightcenter.com', { telefono: '+54 9 11 5555-1003', licencia_nro: 'INV-6120', vencimiento_cma: '2027-08-10', horas_previas: 960 });
    const juan = U('alumno', 'Juan', 'Pérez', 'alumno@flightcenter.com', { dni: '45123456', fecha_nacimiento: '2008-06-20', direccion: 'Mitre 789, San Isidro', telefono: '+54 9 11 5555-3001', contacto_emergencia: 'Ana Pérez (madre) +54 9 11 5555-4001', vencimiento_cma: '2027-03-01' });
    const vale = U('alumno', 'Valentina', 'Ruiz', 'valentina@flightcenter.com', { dni: '44222111', fecha_nacimiento: '2002-02-14', direccion: 'Rivadavia 15000, Haedo', telefono: '+54 9 11 5555-3003', contacto_emergencia: 'Marcos Ruiz +54 9 11 5555-4003', vencimiento_cma: dia(20) });
    const lucia = U('ppa', 'Lucía', 'Fernández', 'ppa@flightcenter.com', { dni: '38999888', fecha_nacimiento: '1995-11-04', direccion: 'Sarmiento 321, Vicente López', telefono: '+54 9 11 5555-3002', contacto_emergencia: 'Diego Fernández +54 9 11 5555-4002', licencia_nro: 'PPA-77812', vencimiento_cma: '2026-12-20', horas_previas: 58, hab: { solo: true, sim_solo: true, travesia: true, aeronaves: null } });
    void admin;

    const R = (tipo, nombre, modelo, estado = 'operativa') => { db.recursos.push({ id: ++db.seq.rec, tipo, nombre, modelo, estado, ...(tipo === 'avion' ? datosModelo(modelo) : {}) }); return db.seq.rec; };
    const fca = R('avion', 'LV-FCA', 'Cessna 152'); const fcb = R('avion', 'LV-FCB', 'Cessna 172 Skyhawk');
    const fcc = R('avion', 'LV-FCC', 'Piper PA-28 Warrior'); const fcd = R('avion', 'LV-FCD', 'Cessna 152', 'mantenimiento');
    const frasca = R('simulador', 'Frasca', 'Frasca 141'); const simu1 = R('simulador', 'Simu 1', 'Simulador de procedimientos');
    void fcc; void simu1;

    // disponibilidad que carga el administrador (patrón semanal, 45 días atrás y 60 adelante)
    const patron = { [martin]: { 1: BLOQUES, 2: BLOQUES, 3: BLOQUES, 4: BLOQUES, 5: BLOQUES }, [sofia]: { 2: [8, 10, 12], 4: [8, 10, 12], 6: [8, 10, 12, 14], 0: [8, 10] }, [diego]: { 1: [14, 16], 3: [14, 16], 5: [12, 14, 16], 6: BLOQUES, 0: BLOQUES } };
    for (let n = -45; n <= 60; n++) {
      const f = dia(n); const wd = new Date(`${f}T12:00`).getDay();
      for (const [id, p] of Object.entries(patron)) if (p[wd]) db.disponibilidad[`${id}|${f}`] = [...p[wd]];
    }
    const libre = (instId, f, b) => { const k = `${instId}|${f}`; db.disponibilidad[k] = [...new Set([...(db.disponibilidad[k] || []), b])].sort((a, c) => a - c); };

    const notas = (lecId, regularEn = []) => Object.fromEntries(itemKeys(LECCIONES[lecId]).map((k, i) => [k, regularEn.includes(i) ? 'R' : (i % 3 === 0 ? 'MB' : 'B')]));
    const res = (tipo, piloto, inst, rec, f, b, estado, extra = {}) => {
      if (inst) libre(inst, f, b);
      db.reservas.push({ id: ++db.seq.r, tipo, piloto_id: piloto, instructor_id: inst, recurso_id: rec, fecha: f, bloque: b, estado, horas: null, observaciones: null, leccion: null, notas: {}, creado: ahora(), ...extra });
    };
    // Juan: teoría 1-3 aprobada, FL1 y FL2 aprobadas, FL3 con regulares (debe repetirla)
    res('vuelo', juan, sofia, fca, dia(-40), 8, 'completado', { horas: 1.5, leccion: 'FL 1', notas: notas('FL 1'), observaciones: 'Primer vuelo. Muy buena actitud, trae la teoría estudiada.' });
    res('vuelo', juan, martin, fca, dia(-25), 10, 'completado', { horas: 1.6, leccion: 'FL 2', notas: notas('FL 2'), observaciones: 'Cambios de velocidad correctos. Mejorar uso del trim.' });
    res('vuelo', juan, martin, fca, dia(-12), 14, 'completado', { horas: 1.7, leccion: 'FL 3', notas: notas('FL 3', [20, 23]), observaciones: 'Escapes y aproximaciones con flaps a reforzar. Repite FL 3.' });
    res('vuelo', juan, martin, fca, dia(1), 10, 'pendiente');
    // Valentina: arrancando
    res('vuelo', vale, sofia, fcb, dia(3), 8, 'pendiente');
    // Lucía (PPA)
    res('vuelo', lucia, sofia, fcc, dia(-33), 12, 'completado', { horas: 1.2, observaciones: 'Readaptación PA-28.' });
    res('vuelo', lucia, martin, fcb, dia(-2), 10, 'completado', { horas: 1.9, destino: 'SPD', observaciones: 'Navegación a San Pedro.' });
    res('vuelo', lucia, martin, fcb, dia(-2), 12, 'completado', { horas: 1.8, observaciones: 'Regreso de San Pedro.' });
    res('simulador', lucia, null, frasca, dia(-6), 16, 'completado', { horas: 1.0, observaciones: 'Práctica VOR por su cuenta.' });
    res('vuelo', lucia, martin, fcb, dia(2), 14, 'pendiente');
    res('vuelo', lucia, martin, fcb, dia(2), 16, 'pendiente');

    // clases teóricas
    const clase = (teo, f, b, inst, cupo, aula, estado, alumnos = []) => {
      db.clases.push({ id: ++db.seq.c, teo, fecha: f, bloque: b, instructor_id: inst, cupo, aula, estado });
      for (const [alId, est, nota] of alumnos) db.inscripciones.push({ id: ++db.seq.i, clase_id: db.seq.c, alumno_id: alId, estado: est, nota: nota || null });
    };
    clase('TEO 1', dia(-50), 16, diego, 8, 'Aula 1', 'dictada', [[juan, 'presente', 'MB'], [vale, 'presente', 'B']]);
    clase('TEO 2', dia(-46), 16, diego, 8, 'Aula 1', 'dictada', [[juan, 'presente', 'B']]);
    clase('TEO 3', dia(-43), 16, sofia, 8, 'Aula 2', 'dictada', [[juan, 'presente', 'B']]);
    clase('TEO 4', dia(-20), 16, diego, 8, 'Aula 1', 'dictada', [[juan, 'presente', 'MB']]);
    clase('TEO 5', dia(-15), 16, diego, 8, 'Aula 1', 'dictada', [[juan, 'presente', 'R']]);
    clase('TEO 2', dia(4), 16, diego, 8, 'Aula 1', 'programada', [[vale, 'inscripto']]);
    clase('TEO 5', dia(5), 14, diego, 10, 'Aula 1', 'programada');
    clase('TEO 6', dia(6), 16, sofia, 10, 'Aula 2', 'programada', [[juan, 'inscripto']]);
    clase('TEO 7', dia(11), 16, diego, 10, 'Aula 1', 'programada');
    for (const c of db.clases) libre(c.instructor_id, c.fecha, c.bloque);

    // libros de novedades
    const nov = (rec, autor, tipo, desc, estado, rev, dias) => db.novedades.push({ id: ++db.seq.n, recurso_id: rec, autor_id: autor, fecha: dia(dias) + ' 11:20', tipo, descripcion: desc, estado,
      revision: rev ? { mecanico_id: mec, fecha: dia(dias + 1) + ' 09:10', comentario: rev } : null });
    nov(fca, martin, 'falla', 'Luz de navegación del ala izquierda intermitente.', 'reportada', null, -1);
    nov(fcb, martin, 'observacion', 'Leve vibración en carrera de despegue, revisar balanceo de hélice.', 'en_revision', 'Se programó balanceo dinámico de hélice para el jueves. Puede volar mientras tanto.', -5);
    nov(fca, sofia, 'falla', 'Radio COM2 sin recepción.', 'resuelta', 'Se reemplazó el conector de antena COM2. Probado en tierra y en vuelo.', -20);
    nov(fcd, mec, 'mantenimiento', 'Inspección de 100 hs en curso.', 'en_revision', 'Avión en hangar. Fecha estimada de salida: próxima semana.', -3);
    nov(fcc, diego, 'falla', 'Indicador de temperatura de aceite marca bajo en crucero.', 'descartada', 'Indicación normal para la temperatura exterior del día. No es falla.', -9);
    nov(frasca, martin, 'falla', 'El joystick de alerón tiene juego hacia la izquierda.', 'reportada', null, -2);
    db.planes = []; db.seq.p = 0;
    db.notificaciones = []; db.seq.nt = 0;
    const mov = reconstruirCuentas(db);
    mov(juan, dia(-38), 'Pago · transferencia', 'pago', 600000, 'pago:1');
    mov(juan, dia(-10), 'Pago · efectivo', 'pago', 400000, 'pago:2');
    mov(lucia, dia(-30), 'Pago · transferencia', 'pago', 300000, 'pago:3');
    mov(lucia, dia(-1), 'Pago · tarjeta de débito', 'pago', 700000, 'pago:4');
    // EJEMPLO para la demo: la administración o un instructor pega el METAR/TAF oficial vigente
    const obs = new Date(Date.now() - 25 * 60000); const z = (n) => String(n).padStart(2, '0');
    db.meteo = { metar: `METAR SADM ${z(obs.getUTCDate())}${z(obs.getUTCHours())}00Z 03008KT 9999 FEW030 24/12 Q1016`, taf: '', fecha: ahora(), autor_id: martin, ejemplo: true };
    return db;
  }
  // semilla del sistema real: solo el administrador, la flota y las tarifas
  function semillaProduccion() {
    const a = opts.adminInicial || {};
    const db = { v: 2, seq: { u: 1, rec: 0, r: 0, c: 0, i: 0, n: 0, m: 0, nt: 0, p: 0 }, disponibilidad: {}, reservas: [], clases: [], inscripciones: [], novedades: [],
      movimientos: [], notificaciones: [], planes: [], meteo: null, tarifas: { ...TARIFAS_INICIALES },
      usuarios: [{ id: 1, rol: 'admin', activo: true, nombre: a.nombre || 'Administración', apellido: a.apellido || 'Flight Center', email: a.email || 'admin@flightcenter.com',
        password: hashPass(a.password || 'cambiar123'), dni: '', fecha_nacimiento: '', direccion: '', telefono: '', contacto_emergencia: '', licencia_nro: '', vencimiento_cma: '', horas_previas: 0, docs: {} }],
      recursos: [] };
    const R = (tipo, nombre, modelo) => db.recursos.push({ id: ++db.seq.rec, tipo, nombre, modelo, estado: 'operativa', ...(tipo === 'avion' ? datosModelo(modelo) : {}) });
    R('avion', 'LV-FCA', 'Cessna 152'); R('avion', 'LV-FCB', 'Cessna 172 Skyhawk'); R('avion', 'LV-FCC', 'Piper PA-28 Warrior'); R('avion', 'LV-FCD', 'Cessna 152');
    R('simulador', 'Frasca', 'Frasca 141'); R('simulador', 'Simu 1', 'Simulador de procedimientos');
    return db;
  }
  // ---------- cuentas: tarifas y movimientos ----------
  const TARIFAS_INICIALES = { vuelo: 196000, simulador: 36000, teorica: 26000, recargo: 20, horas_aviso: 24 };
  function reconstruirCuentas(d) {
    d.tarifas = d.tarifas || { ...TARIFAS_INICIALES };
    d.movimientos = []; d.seq.m = 0;
    const T = d.tarifas;
    const mov = (usuario_id, fecha, concepto, tipo, importe, ref) => d.movimientos.push({ id: ++d.seq.m, usuario_id, fecha, concepto, tipo, importe: Math.round(importe), ref });
    for (const r of d.reservas.filter((x) => x.estado === 'completado')) {
      const rec = d.recursos.find((x) => x.id === r.recurso_id);
      mov(r.piloto_id, r.fecha, `${r.tipo === 'vuelo' ? 'Vuelo' : 'Simulador'} ${rec?.nombre || ''} · ${String(r.horas).replace('.', ',')} h${r.leccion ? ` · ${r.leccion}` : ''}`, 'cargo', (r.horas || 0) * T[r.tipo], `res:${r.id}`);
    }
    for (const i of d.inscripciones.filter((x) => x.estado === 'presente')) {
      const c = d.clases.find((x) => x.id === i.clase_id);
      mov(i.alumno_id, c.fecha, `Clase teórica ${c.teo}`, 'cargo', T.teorica, `cla:${i.id}`);
    }
    return mov;
  }
  // configuración del QR de asistencia: código impreso + ubicación de la escuela (Aeródromo de Morón)
  const nuevoCodigo = () => { const b = new Uint8Array(12); globalThis.crypto.getRandomValues(b); return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(''); };
  const configInicial = () => ({ qr: nuevoCodigo(), lat: -34.6761, lon: -58.6428, radio: 1500 });
  // habilitaciones que da la administración a cada alumno o piloto
  const HAB_VACIA = () => ({ solo: false, sim_solo: false, travesia: false, aeronaves: null }); // aeronaves: null = todas
  const habDe = (u) => ({ ...HAB_VACIA(), ...(u.hab || {}) });
  // migración de datos guardados por versiones anteriores de la demo
  function migrar(d) {
    for (const u of d.usuarios) if (['alumno', 'ppa'].includes(u.rol) && !u.hab) u.hab = HAB_VACIA();
    if (!d.config) d.config = configInicial();
    if (!d.movimientos) reconstruirCuentas(d);
    if (!d.notificaciones) { d.notificaciones = []; d.seq.nt = 0; }
    if (!d.planes) { d.planes = []; d.seq.p = 0; }
    if (!d.meteo) d.meteo = null;
    for (const r of d.recursos) if (r.tipo === 'avion' && !r.oaci) Object.assign(r, datosModelo(r.modelo));
    return d;
  }

  const navegador = !opts.cargar;
  let db;
  if (navegador) { try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; } } else db = opts.cargar();
  if (!db || db.v !== 2) db = opts.produccion ? semillaProduccion() : semilla(); else db = migrar(db);
  if (!db.config) db.config = configInicial();
  let sesion = null;
  if (navegador) { try { sesion = Number(sessionStorage.getItem(KEY + '-s')) || null; } catch { /* sin storage */ } }
  const guardar = () => {
    if (!navegador) return opts.guardar(db);
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* cuota llena o bloqueado: queda en memoria */ }
  };
  const guardarSesion = () => { if (!navegador) return; try { sesion ? sessionStorage.setItem(KEY + '-s', String(sesion)) : sessionStorage.removeItem(KEY + '-s'); } catch { /* ignorar */ } };
  if (!navegador) guardar();

  // ---------- notificaciones (email y WhatsApp) ----------
  // En la demo quedan registradas para verlas; con un servidor se envían de verdad.
  function notificar(u, tipo, datos) {
    const pref = u.notif || { email: true, whatsapp: true };
    const canales = [pref.email && u.email ? ['email', u.email] : null, pref.whatsapp && u.telefono ? ['whatsapp', u.telefono] : null].filter(Boolean);
    for (const [canal, destino] of canales) {
      const n = { id: ++db.seq.nt, usuario_id: u.id, canal, destino, tipo, fecha: ahora(), dia: hoy(), datos: JSON.parse(JSON.stringify(datos)),
        nombre: u.nombre, apellido: u.apellido, rol: u.rol, estado: navegador ? 'demo' : 'pendiente' };
      db.notificaciones.push(n);
      if (opts.alNotificar) setTimeout(() => opts.alNotificar(n), 0);
    }
    return canales.length;
  }
  // ---------- helpers ----------
  const movimiento = (usuario_id, concepto, tipo, importe, ref, fecha = hoy()) => {
    if (ref && db.movimientos.some((m) => m.ref === ref)) return;
    db.movimientos.push({ id: ++db.seq.m, usuario_id, fecha, concepto, tipo, importe: Math.round(importe), ref });
  };
  const horasHasta = (f, b) => (new Date(`${f}T${hh(b)}:00`) - new Date()) / 3600000;
  const valorBloque = (tipo) => tipo === 'teorica' ? db.tarifas.teorica : db.tarifas[tipo] * 2; // un bloque = 2 hs
  const cargoCancelacion = (tipo, f, b) => {
    const h = horasHasta(f, b);
    const cargo = h < db.tarifas.horas_aviso ? valorBloque(tipo) * db.tarifas.recargo / 100 : 0;
    return { horas: Math.max(0, h), cargo: Math.round(cargo) };
  };
  const usuario = (id) => db.usuarios.find((u) => u.id === Number(id));
  const recurso = (id) => db.recursos.find((r) => r.id === Number(id));
  const yo = () => { const u = sesion && usuario(sesion); if (!u || !u.activo) fail('Sesión no iniciada'); return u; };
  const exigir = (...roles) => { const u = yo(); if (!roles.includes(u.rol)) fail('No tenés permiso para esta acción'); return u; };
  const nombre = (u) => (u ? `${u.nombre} ${u.apellido}` : '');
  const pub = (u) => { if (!u) return null; const { password, docs, ...r } = u; if (['alumno', 'ppa'].includes(u.rol)) r.hab = habDe(u); return { ...r, docs: Object.fromEntries(Object.entries(docs).map(([k, v]) => [k, { nombre: v.nombre, tam: v.tam, fecha: v.fecha }])) }; };
  const activas = () => db.reservas.filter((r) => r.estado !== 'cancelado');
  const clasesActivas = () => db.clases.filter((c) => c.estado !== 'cancelada');
  const ord = (a, b) => (a.fecha + hh(a.bloque)).localeCompare(b.fecha + hh(b.bloque));
  const yaEmpezo = (f, b) => f < hoy() || (f === hoy() && new Date().getHours() >= b);

  const expandir = (r) => {
    const rec = recurso(r.recurso_id); const p = usuario(r.piloto_id); const i = usuario(r.instructor_id);
    return { ...r, recurso: rec.nombre, modelo: rec.modelo, piloto: nombre(p), piloto_rol: p.rol, piloto_email: p.email, piloto_telefono: p.telefono,
      instructor: i ? nombre(i) : null, instructor_telefono: i?.telefono || null };
  };
  const expandirClase = (c) => {
    const ins = db.inscripciones.filter((x) => x.clase_id === c.id && x.estado !== 'cancelado');
    return { ...c, titulo: LECCIONES[c.teo]?.titulo || '', instructor: nombre(usuario(c.instructor_id)), inscriptos: ins.length,
      alumnos: ins.map((x) => ({ ...x, alumno: nombre(usuario(x.alumno_id)) })) };
  };

  // ¿Qué está haciendo una persona en un día y bloque? (vuelos, simulador, clases)
  function ocupacionPersona(uid, f, b, { ignorarClase } = {}) {
    if (activas().some((r) => r.fecha === f && r.bloque === b && (r.piloto_id === uid || r.instructor_id === uid))) return true;
    if (clasesActivas().some((c) => c.fecha === f && c.bloque === b && c.id !== ignorarClase && c.instructor_id === uid)) return true;
    return db.inscripciones.some((x) => x.alumno_id === uid && x.estado !== 'cancelado' && clasesActivas().some((c) => c.id === x.clase_id && c.fecha === f && c.bloque === b && c.id !== ignorarClase));
  }
  const disponibleAdmin = (instId, f, b) => (db.disponibilidad[`${instId}|${f}`] || []).includes(b);

  // ---------- syllabus: estado de cada lección ----------
  function intentos(alumnoId, lecId) {
    const l = LECCIONES[lecId];
    if (l.track === 'teorica') {
      return db.inscripciones.filter((x) => x.alumno_id === alumnoId && x.estado === 'presente')
        .map((x) => ({ x, c: db.clases.find((c) => c.id === x.clase_id) })).filter(({ c }) => c && c.teo === lecId)
        .map(({ x, c }) => ({ fecha: c.fecha, bloque: c.bloque, instructor: nombre(usuario(c.instructor_id)), notas: x.nota ? { '0.0': x.nota } : {}, observaciones: null }))
        .sort(ord);
    }
    return db.reservas.filter((r) => r.piloto_id === alumnoId && r.estado === 'completado' && r.leccion === lecId)
      .map((r) => ({ fecha: r.fecha, bloque: r.bloque, instructor: nombre(usuario(r.instructor_id)) || 'Solo', notas: r.notas || {}, observaciones: r.observaciones, horas: r.horas }))
      .sort(ord);
  }
  function estadoLeccion(alumnoId, lecId) {
    const its = intentos(alumnoId, lecId);
    if (!its.length) return { estado: 'pendiente', intentos: its };
    const ult = its.at(-1);
    const keys = itemKeys(LECCIONES[lecId]);
    const ok = keys.every((k) => NOTAS_OK.includes(ult.notas[k]));
    const regulares = keys.filter((k) => ult.notas[k] === 'R');
    return { estado: ok ? 'aprobada' : 'repetir', intentos: its, ultimo: ult, regulares };
  }
  function leccionActual(alumnoId, track) {
    for (const l of TRACKS[track]) {
      const e = estadoLeccion(alumnoId, l.id);
      if (e.estado === 'aprobada') continue;
      if (l.opcional && e.estado === 'pendiente') continue;
      return { ...l, ...e };
    }
    return null;
  }
  function syllabusDe(alumnoId) {
    const u = usuario(alumnoId);
    if (!u || u.rol !== 'alumno') fail('Solo los alumnos tienen syllabus');
    const me = yo();
    const puede = me.id === u.id || me.rol === 'admin' || (me.rol === 'instructor' && activas().some((r) => r.piloto_id === u.id && r.instructor_id === me.id));
    if (!puede) fail('Solo los instructores que vuelan con este alumno pueden ver su syllabus');
    const pistas = {};
    for (const t of Object.keys(TRACKS)) {
      const lecciones = TRACKS[t].map((l) => ({ ...l, ...estadoLeccion(u.id, l.id) }));
      pistas[t] = { lecciones, actual: leccionActual(u.id, t), aprobadas: lecciones.filter((l) => l.estado === 'aprobada').length, total: lecciones.filter((l) => !l.opcional).length };
    }
    return { alumno: pub(u), pistas, reglas: SYLLABUS.reglas };
  }

  // ---------- API pública ----------
  const api = {
    BLOQUES, LECCIONES, TRACKS, itemKeys, hoy, dia,

    reiniciar() { if (!navegador) fail('No disponible'); db = semilla(); sesion = null; guardarSesion(); guardar(); },
    login(email, password) {
      const u = db.usuarios.find((x) => x.email.toLowerCase() === String(email || '').trim().toLowerCase());
      if (!u || !verificarPass(String(password || ''), u.password)) fail('Email o contraseña incorrectos. Verificá que estés registrado en Flight Center.');
      if (!u.activo) fail('Tu usuario está desactivado. Consultá con la administración.');
      sesion = u.id; guardarSesion(); if (navegador) api.recordatoriosDeuda(); return pub(u);
    },
    logout() { sesion = null; guardarSesion(); },
    yo: () => { try { return pub(yo()); } catch { return null; } },

    // perfil
    guardarPerfil(datos, uid) {
      const me = yo(); const u = uid ? usuario(uid) : me;
      if (!u || (u.id !== me.id && me.rol !== 'admin')) fail('No tenés permiso para editar este perfil');
      if (!String(datos.nombre || '').trim() || !String(datos.apellido || '').trim()) fail('Nombre y apellido son obligatorios');
      if (!/^\S+@\S+\.\S+$/.test(String(datos.email || ''))) fail('El email no es válido');
      if (db.usuarios.some((x) => x.id !== u.id && x.email.toLowerCase() === datos.email.trim().toLowerCase())) fail('Ese email ya está registrado');
      for (const c of ['nombre', 'apellido', 'email', 'dni', 'fecha_nacimiento', 'direccion', 'telefono', 'contacto_emergencia', 'licencia_nro', 'vencimiento_cma']) if (c in datos) u[c] = String(datos[c] ?? '').trim();
      if (me.rol === 'admin') {
        if ('horas_previas' in datos) u.horas_previas = Math.max(0, Number(datos.horas_previas) || 0);
        if (datos.rol && u.id !== me.id) u.rol = datos.rol;
        if ('activo' in datos && u.id !== me.id) u.activo = !!datos.activo;
        if (datos.password) { if (String(datos.password).length < 6) fail('La contraseña debe tener al menos 6 caracteres'); u.password = hashPass(datos.password); }
      }
      guardar(); return pub(u);
    },
    cambiarPassword(actual, nueva) {
      const u = yo();
      if (!verificarPass(String(actual || ''), u.password)) fail('La contraseña actual no es correcta');
      if (String(nueva || '').length < 6) fail('La nueva contraseña debe tener al menos 6 caracteres');
      u.password = hashPass(nueva); guardar();
    },
    // archivo = { nombre, tam, tipo, data (data URL) } leído por la interfaz
    subirDoc(tipo, archivo) {
      const u = yo();
      if (!['cma', 'licencia', 'autorizacion'].includes(tipo)) fail('Documento desconocido');
      if (!archivo || !archivo.data) fail('No se eligió ningún archivo');
      if (!(archivo.tipo === 'application/pdf' || /\.pdf$/i.test(archivo.nombre || ''))) fail('Solo se aceptan archivos PDF');
      if (!String(archivo.data).startsWith('data:application/pdf') && !String(archivo.data).startsWith('data:application/octet-stream')) fail('El archivo no es un PDF válido');
      if (archivo.tam > 10 * 1024 * 1024) fail('El PDF supera los 10 MB');
      const meta = { nombre: String(archivo.nombre).slice(0, 120), tam: Number(archivo.tam) || 0, fecha: ahora() };
      if (opts.docs) { opts.docs.guardar(u.id, tipo, archivo.data); u.docs[tipo] = meta; } else u.docs[tipo] = { ...meta, data: archivo.data };
      guardar(); return pub(u);
    },
    quitarDoc(tipo) { const u = yo(); delete u.docs[tipo]; if (opts.docs) opts.docs.borrar(u.id, tipo); guardar(); return pub(u); },
    documento(uid, tipo) {
      const me = yo();
      if (me.id !== Number(uid) && !['instructor', 'admin'].includes(me.rol)) return null;
      return usuario(uid)?.docs[tipo] || null;
    },

    // catálogos
    instructores: () => db.usuarios.filter((u) => u.rol === 'instructor' && u.activo).map(pub),
    recursos: (tipo) => db.recursos.filter((r) => !tipo || r.tipo === tipo).map((r) => ({ ...r,
      abiertas: db.novedades.filter((n) => n.recurso_id === r.id && ['reportada', 'en_revision'].includes(n.estado)).length,
      reportadas: db.novedades.filter((n) => n.recurso_id === r.id && n.estado === 'reportada').length })),
    usuario: (id) => { exigir('admin'); return pub(usuario(id)); },

    // ---------- reservas de vuelo y simulador ----------
    disponibilidadDia(tipo, f) {
      const me = yo();
      const insts = db.usuarios.filter((u) => u.rol === 'instructor' && u.activo);
      const recs = db.recursos.filter((r) => r.tipo === (tipo === 'vuelo' ? 'avion' : 'simulador') && r.estado === 'operativa');
      return BLOQUES.map((b) => ({
        bloque: b, pasado: yaEmpezo(f, b), ocupadoYo: ocupacionPersona(me.id, f, b),
        instructores: insts.filter((i) => disponibleAdmin(i.id, f, b) && !ocupacionPersona(i.id, f, b)).map((i) => i.id),
        recursos: recs.filter((r) => !activas().some((x) => x.recurso_id === r.id && x.fecha === f && x.bloque === b)).map((r) => r.id),
      }));
    },
    reservar({ tipo, fecha, bloques, instructor_id, recurso_id, destino }) {
      const u = exigir('alumno', 'ppa');
      const esPPA = u.rol === 'ppa';
      if (!['vuelo', 'simulador'].includes(tipo)) fail('Tipo de reserva inválido');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ''))) fail('Elegí un día');
      bloques = [...new Set((bloques || []).map(Number))].sort((a, b) => a - b);
      if (!bloques.length || bloques.some((b) => !BLOQUES.includes(b))) fail('Elegí al menos un bloque horario');
      if (bloques.some((b) => yaEmpezo(fecha, b))) fail('Ese horario ya pasó');
      const inst = instructor_id ? usuario(instructor_id) : null;
      if (instructor_id && (!inst || inst.rol !== 'instructor' || !inst.activo)) fail('Instructor inválido');
      const tipoRec = tipo === 'vuelo' ? 'avion' : 'simulador';
      // todos los vuelos salen de Morón; los de alumnos son siempre locales (MOR - MOR)
      destino = tipo === 'vuelo' && esPPA ? String(destino || 'MOR').trim().toUpperCase() : 'MOR';
      if (!/^[A-Z0-9]{3,4}$/.test(destino)) fail('El destino debe ser un código de aeródromo de 3 o 4 letras (ej: MOR, SAN, SADF)');
      const hab = habDe(u);
      if (!inst && tipo === 'vuelo' && !hab.solo) fail('No tenés habilitación para volar solo. Elegí un instructor o pedile la habilitación a la administración.');
      if (!inst && tipo === 'simulador' && !hab.sim_solo) fail('No tenés habilitación para usar el simulador sin instructor. Elegí un instructor o pedile la habilitación a la administración.');
      if (destino !== 'MOR' && !hab.travesia) fail('No tenés habilitación para travesías: solo podés reservar vuelos locales (MOR – MOR).');
      const avionPermitido = (id) => tipo !== 'vuelo' || !Array.isArray(hab.aeronaves) || hab.aeronaves.includes(id);
      if (!esPPA) {
        if (bloques.length > 1) fail('Como alumno podés reservar un solo bloque por día');
        if (activas().some((r) => r.piloto_id === u.id && r.fecha === fecha && r.tipo === tipo)) fail(`Ya tenés ${tipo === 'vuelo' ? 'un vuelo' : 'un turno de simulador'} ese día. Los alumnos pueden reservar un bloque por día.`);
      }
      if ((esPPA || tipo === 'simulador') && !recurso_id) fail(tipo === 'vuelo' ? 'Elegí una aeronave' : 'Elegí un simulador');
      const rec = recurso_id ? recurso(recurso_id) : null;
      if (rec && (rec.tipo !== tipoRec || rec.estado !== 'operativa')) fail(`${rec.nombre} no está disponible (fuera de servicio)`);
      if (rec && !avionPermitido(rec.id)) fail(`No estás habilitado/a para volar el ${rec.nombre}. Consultá con la administración.`);
      const plan = bloques.map((b) => {
        if (ocupacionPersona(u.id, fecha, b)) fail(`Ya tenés otra actividad a las ${hh(b)}`);
        if (inst && !disponibleAdmin(inst.id, fecha, b)) fail(`${nombre(inst)} no está asignado a volar a las ${hh(b)}`);
        if (inst && ocupacionPersona(inst.id, fecha, b)) fail(`${nombre(inst)} ya está ocupado a las ${hh(b)}`);
        let r = rec;
        if (r && activas().some((x) => x.recurso_id === r.id && x.fecha === fecha && x.bloque === b)) fail(`${r.nombre} ya está reservado a las ${hh(b)}`);
        if (!r) {
          r = db.recursos.find((x) => x.tipo === tipoRec && x.estado === 'operativa' && avionPermitido(x.id) && !activas().some((y) => y.recurso_id === x.id && y.fecha === fecha && y.bloque === b));
          if (!r) fail(`No hay aeronaves disponibles (en las que estés habilitado/a) a las ${hh(b)}`);
        }
        return { b, r };
      });
      const nuevas = plan.map(({ b, r }) => {
        const x = { id: ++db.seq.r, tipo, piloto_id: u.id, instructor_id: inst?.id || null, recurso_id: r.id, fecha, bloque: b, estado: 'pendiente', horas: null, observaciones: null, leccion: null, notas: {}, destino, creado: ahora() };
        db.reservas.push(x); return x;
      });
      const lec = u.rol === 'alumno' ? leccionActual(u.id, tipo)?.id || null : null;
      const exp = nuevas.map((r) => ({ ...expandir(r), leccion_sugerida: lec }));
      notificar(u, 'reserva', { reservas: exp, leccion: lec });
      guardar(); return exp;
    },
    misReservas() { const u = yo(); const sug = (r) => u.rol === 'alumno' && r.estado === 'pendiente' ? leccionActual(u.id, r.tipo)?.id || null : null;
      return db.reservas.filter((r) => r.piloto_id === u.id).sort(ord).reverse().map((r) => ({ ...expandir(r), leccion_sugerida: sug(r) })); },
    cancelarReserva(id) {
      const u = yo(); const r = db.reservas.find((x) => x.id === Number(id));
      if (!r) fail('Reserva no encontrada');
      if (!(r.piloto_id === u.id || r.instructor_id === u.id || u.rol === 'admin')) fail('No podés cancelar esta reserva');
      if (r.estado !== 'pendiente') fail('Solo se pueden cancelar reservas pendientes');
      r.estado = 'cancelado';
      // solo se cobra cuando cancela el propio piloto con menos de 24 hs de aviso
      let cargo = 0;
      if (r.piloto_id === u.id) {
        cargo = cargoCancelacion(r.tipo, r.fecha, r.bloque).cargo;
        if (cargo) movimiento(u.id, `Cancelación con menos de ${db.tarifas.horas_aviso} hs · ${r.tipo === 'vuelo' ? 'vuelo' : 'simulador'} ${r.fecha.split('-').reverse().join('/')} ${hh(r.bloque)} (${db.tarifas.recargo}% del bloque)`, 'cargo', cargo, `canc:${r.id}`);
      }
      guardar(); return cargo;
    },
    infoCancelacion(ids, tipo) {
      yo(); const l = (Array.isArray(ids) ? ids : [ids]);
      if (tipo === 'teorica') { const c = db.clases.find((x) => x.id === Number(l[0])); return { ...cargoCancelacion('teorica', c.fecha, c.bloque), bloques: 1, ...db.tarifas }; }
      const rs = l.map((id) => db.reservas.find((x) => x.id === Number(id)));
      const info = rs.map((r) => cargoCancelacion(r.tipo, r.fecha, r.bloque));
      return { horas: Math.min(...info.map((x) => x.horas)), cargo: info.reduce((s, x) => s + x.cargo, 0), bloques: rs.length, ...db.tarifas };
    },
    historial() {
      const u = exigir('alumno', 'ppa');
      const comp = db.reservas.filter((r) => r.piloto_id === u.id && r.estado === 'completado').sort(ord).reverse().map(expandir);
      const vuelos = comp.filter((r) => r.tipo === 'vuelo'); const sims = comp.filter((r) => r.tipo === 'simulador');
      const sum = (l) => l.reduce((s, v) => s + (v.horas || 0), 0);
      const porMes = {}; const porRec = {};
      for (const v of vuelos) { porMes[v.fecha.slice(0, 7)] = (porMes[v.fecha.slice(0, 7)] || 0) + (v.horas || 0); porRec[v.recurso] = (porRec[v.recurso] || 0) + (v.horas || 0); }
      return { horas_previas: u.horas_previas || 0, horas_vuelo: sum(vuelos), horas_totales: (u.horas_previas || 0) + sum(vuelos), horas_doble: sum(vuelos.filter((v) => v.instructor_id)),
        horas_solo: sum(vuelos.filter((v) => !v.instructor_id)), horas_sim: sum(sims), vuelos, sims, por_mes: porMes, por_recurso: porRec };
    },

    // ---------- clases teóricas ----------
    clases({ desde, instructor } = {}) {
      return db.clases.filter((c) => (!desde || c.fecha >= desde) && (!instructor || c.instructor_id === instructor)).sort(ord).map(expandirClase);
    },
    clasesParaAlumno() {
      const u = exigir('alumno');
      return db.clases.filter((c) => c.estado === 'programada' && !yaEmpezo(c.fecha, c.bloque)).sort(ord).map((c) => {
        const x = expandirClase(c); const mia = db.inscripciones.find((i) => i.clase_id === c.id && i.alumno_id === u.id && i.estado !== 'cancelado');
        return { ...x, inscripto: !!mia, aprobada: estadoLeccion(u.id, c.teo).estado === 'aprobada' };
      });
    },
    inscribirse(claseId) {
      const u = exigir('alumno'); const c = db.clases.find((x) => x.id === Number(claseId));
      if (!c || c.estado !== 'programada') fail('La clase no está disponible');
      if (yaEmpezo(c.fecha, c.bloque)) fail('La clase ya comenzó');
      if (db.inscripciones.some((i) => i.clase_id === c.id && i.alumno_id === u.id && i.estado !== 'cancelado')) fail('Ya estás inscripto en esta clase');
      if (db.inscripciones.filter((i) => i.clase_id === c.id && i.estado !== 'cancelado').length >= c.cupo) fail('La clase no tiene más cupo');
      if (ocupacionPersona(u.id, c.fecha, c.bloque)) fail(`Ya tenés otra actividad a las ${hh(c.bloque)}`);
      db.inscripciones.push({ id: ++db.seq.i, clase_id: c.id, alumno_id: u.id, estado: 'inscripto', nota: null });
      notificar(u, 'clase', { clase: expandirClase(c) }); guardar();
      return expandirClase(c);
    },
    darseDeBaja(claseId) {
      const u = exigir('alumno'); const i = db.inscripciones.find((x) => x.clase_id === Number(claseId) && x.alumno_id === u.id && x.estado === 'inscripto');
      if (!i) fail('No estás inscripto en esta clase'); i.estado = 'cancelado';
      const c = db.clases.find((x) => x.id === i.clase_id); const cargo = cargoCancelacion('teorica', c.fecha, c.bloque).cargo;
      if (cargo) movimiento(u.id, `Baja con menos de ${db.tarifas.horas_aviso} hs · clase ${c.teo} (${db.tarifas.recargo}%)`, 'cargo', cargo, `bajacla:${i.id}`);
      guardar(); return cargo;
    },
    misClases() {
      const u = exigir('alumno');
      return db.inscripciones.filter((i) => i.alumno_id === u.id && i.estado !== 'cancelado')
        .map((i) => ({ ...expandirClase(db.clases.find((c) => c.id === i.clase_id)), inscripcion: i })).sort(ord).reverse();
    },
    guardarClase(datos) {
      const me = exigir('admin');
      const { id, teo, fecha, bloque, instructor_id, cupo, aula } = datos;
      if (!LECCIONES[teo] || LECCIONES[teo].track !== 'teorica') fail('Elegí la clase del syllabus');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ''))) fail('Elegí la fecha');
      if (!BLOQUES.includes(Number(bloque))) fail('Elegí el horario');
      const inst = usuario(instructor_id); if (!inst || inst.rol !== 'instructor') fail('Elegí el instructor que dicta la clase');
      if (!(Number(cupo) > 0)) fail('El cupo debe ser mayor a 0');
      if (ocupacionPersona(inst.id, fecha, Number(bloque), { ignorarClase: Number(id) })) fail(`${nombre(inst)} ya tiene otra actividad en ese horario`);
      let c = id ? db.clases.find((x) => x.id === Number(id)) : null;
      if (!c) { c = { id: ++db.seq.c, estado: 'programada' }; db.clases.push(c); }
      Object.assign(c, { teo, fecha, bloque: Number(bloque), instructor_id: inst.id, cupo: Number(cupo), aula: String(aula || '').trim() || 'Aula 1' });
      const k = `${inst.id}|${fecha}`; db.disponibilidad[k] = [...new Set([...(db.disponibilidad[k] || []), Number(bloque)])].sort((a, b) => a - b);
      void me; guardar(); return expandirClase(c);
    },
    cancelarClase(id) { exigir('admin'); const c = db.clases.find((x) => x.id === Number(id)); if (!c) fail('Clase no encontrada'); c.estado = 'cancelada'; guardar(); },
    tomarAsistencia(claseId, registros) {
      const me = exigir('admin', 'instructor'); const c = db.clases.find((x) => x.id === Number(claseId));
      if (!c) fail('Clase no encontrada');
      if (me.rol === 'instructor' && c.instructor_id !== me.id) fail('Solo el instructor que dicta la clase puede tomar asistencia');
      for (const [insId, { estado, nota }] of Object.entries(registros)) {
        const i = db.inscripciones.find((x) => x.id === Number(insId) && x.clase_id === c.id); if (!i) continue;
        i.estado = estado; i.nota = estado === 'presente' ? (nota || null) : null;
        if (estado === 'presente') movimiento(i.alumno_id, `Clase teórica ${c.teo}`, 'cargo', db.tarifas.teorica, `cla:${i.id}`, c.fecha);
        else db.movimientos = db.movimientos.filter((m) => m.ref !== `cla:${i.id}`);
      }
      c.estado = 'dictada'; guardar();
    },

    // ---------- instructor ----------
    resumenInstructor(mes) {
      const me = exigir('instructor');
      const delMes = activas().filter((r) => r.instructor_id === me.id && r.fecha.slice(0, 7) === mes).sort(ord).map(expandir);
      const comp = delMes.filter((r) => r.estado === 'completado');
      const pendientes = db.reservas.filter((r) => r.instructor_id === me.id && r.estado === 'pendiente').sort(ord).map(expandir)
        .map((r) => ({ ...r, leccion_sugerida: usuario(r.piloto_id).rol === 'alumno' ? leccionActual(r.piloto_id, r.tipo)?.id || null : null }));
      const clases = clasesActivas().filter((c) => c.instructor_id === me.id);
      return { vuelos_mes: comp.filter((r) => r.tipo === 'vuelo').length, horas_mes: comp.filter((r) => r.tipo === 'vuelo').reduce((s, r) => s + (r.horas || 0), 0),
        sims_mes: comp.filter((r) => r.tipo === 'simulador').length, clases_mes: clases.filter((c) => c.fecha.slice(0, 7) === mes && c.estado === 'dictada').length,
        pilotos_mes: new Set(delMes.map((r) => r.piloto_id)).size, pendientes, del_mes: delMes,
        clases_proximas: clases.filter((c) => c.estado === 'programada').sort(ord).map(expandirClase) };
    },
    misAlumnos() {
      const me = exigir('instructor');
      const ids = [...new Set(activas().filter((r) => r.instructor_id === me.id).map((r) => r.piloto_id))];
      return ids.map(usuario).filter((u) => u.rol === 'alumno').map((u) => ({ ...pub(u), vuelo: leccionActual(u.id, 'vuelo'), simulador: leccionActual(u.id, 'simulador'),
        teorica: leccionActual(u.id, 'teorica'), vuelos_conmigo: activas().filter((r) => r.instructor_id === me.id && r.piloto_id === u.id).length }));
    },
    fichaPiloto(id) {
      const me = exigir('instructor', 'admin'); const p = usuario(id);
      if (!p || !['alumno', 'ppa'].includes(p.rol)) fail('Piloto no encontrado');
      const res = activas().filter((r) => r.piloto_id === p.id).sort(ord).reverse().map(expandir);
      const horas = res.filter((r) => r.estado === 'completado' && r.tipo === 'vuelo').reduce((s, r) => s + (r.horas || 0), 0);
      const veSyllabus = p.rol === 'alumno' && (me.rol === 'admin' || res.some((r) => r.instructor_id === me.id));
      return { ...pub(p), horas_centro: horas, horas_totales: (p.horas_previas || 0) + horas, reservas: res, veSyllabus };
    },
    completarReserva(id, { horas, observaciones, leccion, notas }) {
      const me = exigir('instructor'); const r = db.reservas.find((x) => x.id === Number(id) && x.instructor_id === me.id);
      if (!r) fail('Reserva no encontrada'); if (r.estado !== 'pendiente') fail('Esta reserva ya fue cerrada');
      const h = Number(horas); if (!(h > 0 && h <= 4)) fail('Indicá las horas (entre 0,1 y 4)');
      const p = usuario(r.piloto_id);
      if (p.rol === 'alumno') {
        if (!LECCIONES[leccion] || LECCIONES[leccion].track !== r.tipo) fail('Elegí la lección del syllabus');
        r.leccion = leccion; r.notas = Object.fromEntries(Object.entries(notas || {}).filter(([, v]) => ['MB', 'B', 'R'].includes(v)));
      }
      r.estado = 'completado'; r.horas = h; r.observaciones = String(observaciones || '').trim() || null;
      movimiento(r.piloto_id, `${r.tipo === 'vuelo' ? 'Vuelo' : 'Simulador'} ${recurso(r.recurso_id).nombre} · ${String(h).replace('.', ',')} h${r.leccion ? ` · ${r.leccion}` : ''}`, 'cargo', h * db.tarifas[r.tipo], `res:${r.id}`, r.fecha);
      guardar();
      return p.rol === 'alumno' ? { leccion: r.leccion, ...estadoLeccion(p.id, r.leccion) } : null;
    },
    syllabus: syllabusDe,
    leccionActual: (alumnoId, track) => {
      const me = yo(); const id = alumnoId ?? me.id;
      if (Number(id) !== me.id && !['instructor', 'admin'].includes(me.rol)) fail('Sin permiso');
      return leccionActual(Number(id), track);
    },

    // ---------- disponibilidad de instructores (admin) ----------
    disponibilidadSemana(lunes, instId) {
      const me = yo();
      const insts = me.rol === 'admin' ? db.usuarios.filter((u) => u.rol === 'instructor' && u.activo) : [me];
      const dias = Array.from({ length: 7 }, (_, i) => dia(i, new Date(`${lunes}T12:00`)));
      return { dias, filas: insts.filter((i) => !instId || i.id === instId).map((i) => ({ ...pub(i), dias: dias.map((f) => ({ fecha: f, bloques: BLOQUES.map((b) => {
        const res = activas().find((r) => r.instructor_id === i.id && r.fecha === f && r.bloque === b);
        const cla = clasesActivas().find((c) => c.instructor_id === i.id && c.fecha === f && c.bloque === b);
        return { bloque: b, disponible: disponibleAdmin(i.id, f, b), ocupado: res ? `${res.tipo === 'vuelo' ? 'Vuelo' : 'Simulador'} con ${nombre(usuario(res.piloto_id))}` : cla ? `Clase ${cla.teo}` : null };
      }) })) })) };
    },
    alternarDisponibilidad(instId, f, b) {
      exigir('admin'); const k = `${instId}|${f}`; const l = db.disponibilidad[k] || [];
      if (l.includes(b)) {
        if (ocupacionPersona(Number(instId), f, b)) fail('Ese bloque ya tiene una actividad asignada. Cancelala antes de quitar la disponibilidad.');
        db.disponibilidad[k] = l.filter((x) => x !== b);
      } else db.disponibilidad[k] = [...l, b].sort((a, c) => a - c);
      guardar();
    },
    diaCompleto(instId, f, on) {
      exigir('admin'); const k = `${instId}|${f}`;
      db.disponibilidad[k] = on ? [...BLOQUES] : BLOQUES.filter((b) => ocupacionPersona(Number(instId), f, b)); guardar();
    },
    copiarSemana(lunes) {
      exigir('admin');
      const insts = db.usuarios.filter((u) => u.rol === 'instructor');
      for (let i = 0; i < 7; i++) {
        const f = dia(i, new Date(`${lunes}T12:00`)); const g = dia(i + 7, new Date(`${lunes}T12:00`));
        for (const ins of insts) {
          const ocupados = BLOQUES.filter((b) => ocupacionPersona(ins.id, g, b));
          db.disponibilidad[`${ins.id}|${g}`] = [...new Set([...(db.disponibilidad[`${ins.id}|${f}`] || []), ...ocupados])].sort((a, b) => a - b);
        }
      }
      guardar();
    },

    // ---------- administración ----------
    panelAdmin() {
      exigir('admin'); const h = hoy();
      const hoyRes = activas().filter((r) => r.fecha === h).sort(ord).map(expandir);
      const hoyCla = clasesActivas().filter((c) => c.fecha === h).sort(ord).map(expandirClase);
      const semana = activas().filter((r) => r.fecha >= h && r.fecha <= dia(6)).length;
      const vence = db.usuarios.filter((u) => u.activo && u.vencimiento_cma && ['alumno', 'ppa', 'instructor'].includes(u.rol) && u.vencimiento_cma <= dia(30))
        .map((u) => ({ ...pub(u), vencido: u.vencimiento_cma < h }));
      return { hoyRes, hoyCla, semana, aviones: db.recursos.filter((r) => r.tipo === 'avion'), sims: db.recursos.filter((r) => r.tipo === 'simulador'),
        reportadas: db.novedades.filter((n) => n.estado === 'reportada').length, alumnos: db.usuarios.filter((u) => u.rol === 'alumno' && u.activo).length,
        sinInstructor: db.usuarios.filter((u) => u.rol === 'instructor' && u.activo && !(db.disponibilidad[`${u.id}|${h}`] || []).length).map(pub), vence };
    },
    todasReservas({ desde, hasta, tipo, estado } = {}) {
      exigir('admin');
      return db.reservas.filter((r) => (!desde || r.fecha >= desde) && (!hasta || r.fecha <= hasta) && (!tipo || r.tipo === tipo) && (!estado || r.estado === estado)).sort(ord).map(expandir);
    },
    usuarios(rol) { exigir('admin'); return db.usuarios.filter((u) => !rol || u.rol === rol).map(pub); },
    crearUsuario(datos) {
      exigir('admin');
      if (!['alumno', 'ppa', 'instructor', 'mecanico', 'admin'].includes(datos.rol)) fail('Elegí el tipo de usuario');
      if (!String(datos.password || '').trim() || String(datos.password).length < 6) fail('La contraseña inicial debe tener al menos 6 caracteres');
      const u = { id: ++db.seq.u, rol: datos.rol, activo: true, nombre: '', apellido: '', email: '', password: hashPass(datos.password), docs: {}, horas_previas: 0 };
      db.usuarios.push(u);
      try { return api.guardarPerfil(datos, u.id); } catch (e) { db.usuarios.pop(); db.seq.u--; throw e; }
    },
    guardarRecurso(datos) {
      exigir('admin');
      if (!['avion', 'simulador'].includes(datos.tipo)) fail('Elegí el tipo');
      if (!String(datos.nombre || '').trim()) fail(datos.tipo === 'avion' ? 'Ingresá la matrícula' : 'Ingresá el nombre del simulador');
      if (db.recursos.some((r) => r.id !== Number(datos.id) && r.nombre.toLowerCase() === datos.nombre.trim().toLowerCase())) fail('Ya existe un equipo con ese nombre');
      let r = datos.id ? recurso(datos.id) : null;
      if (!r) { r = { id: ++db.seq.rec, estado: 'operativa' }; db.recursos.push(r); }
      if (datos.tipo === 'avion' && !r.oaci) Object.assign(r, datosModelo(datos.modelo));
      Object.assign(r, { tipo: datos.tipo, nombre: datos.nombre.trim().toUpperCase().startsWith('LV-') ? datos.nombre.trim().toUpperCase() : datos.nombre.trim(), modelo: String(datos.modelo || '').trim() });
      guardar(); return r;
    },

    // ---------- libros de novedades ----------
    novedades(recursoId) {
      yo();
      return db.novedades.filter((n) => !recursoId || n.recurso_id === Number(recursoId))
        .sort((a, b) => ['reportada', 'en_revision', 'resuelta', 'descartada'].indexOf(a.estado) - ['reportada', 'en_revision', 'resuelta', 'descartada'].indexOf(b.estado) || b.fecha.localeCompare(a.fecha))
        .map((n) => ({ ...n, autor: nombre(usuario(n.autor_id)), autor_rol: usuario(n.autor_id)?.rol, recurso: recurso(n.recurso_id)?.nombre,
          revision: n.revision ? { ...n.revision, mecanico: nombre(usuario(n.revision.mecanico_id)) } : null }));
    },
    reportarNovedad(recursoId, tipo, descripcion) {
      const me = exigir('instructor', 'mecanico', 'admin');
      if (!['falla', 'observacion', 'mantenimiento'].includes(tipo) || !String(descripcion || '').trim()) fail('Completá el tipo y la descripción');
      if (!recurso(recursoId)) fail('Equipo inexistente');
      db.novedades.push({ id: ++db.seq.n, recurso_id: Number(recursoId), autor_id: me.id, fecha: ahora(), tipo, descripcion: descripcion.trim(),
        estado: me.rol === 'mecanico' ? 'en_revision' : 'reportada', revision: me.rol === 'mecanico' ? { mecanico_id: me.id, fecha: ahora(), comentario: '' } : null });
      guardar();
    },
    revisarNovedad(id, { estado, comentario, descripcion, tipo }) {
      const me = exigir('mecanico');
      const n = db.novedades.find((x) => x.id === Number(id)); if (!n) fail('Novedad inexistente');
      if (!['reportada', 'en_revision', 'resuelta', 'descartada'].includes(estado)) fail('Estado inválido');
      if (['resuelta', 'descartada'].includes(estado) && !String(comentario || '').trim()) fail('Escribí qué se hizo o por qué no corresponde');
      if (descripcion != null && String(descripcion).trim()) n.descripcion = String(descripcion).trim();
      if (['falla', 'observacion', 'mantenimiento'].includes(tipo)) n.tipo = tipo;
      n.estado = estado; n.revision = { mecanico_id: me.id, fecha: ahora(), comentario: String(comentario || '').trim() };
      guardar();
    },
    estadoRecurso(id, estado) {
      exigir('mecanico', 'admin'); const r = recurso(id); if (!r) fail('Equipo inexistente');
      if (!['operativa', 'mantenimiento'].includes(estado)) fail('Estado inválido');
      r.estado = estado; guardar();
      return estado === 'mantenimiento' ? activas().filter((x) => x.recurso_id === r.id && x.estado === 'pendiente').length : 0;
    },
  };

  // ---------- meteorología ----------
  api.meteo = () => { yo(); const m = db.meteo; return m ? { ...m, autor: nombre(usuario(m.autor_id)) } : null; };
  api.publicarMeteo = ({ metar, taf }) => {
    const me = exigir('admin', 'instructor');
    metar = String(metar || '').trim().replace(/\s+/g, ' ').replace(/=$/, '').toUpperCase();
    taf = String(taf || '').trim().replace(/[ \t]+/g, ' ').replace(/=$/, '').toUpperCase();
    if (!/^(METAR |SPECI )?[A-Z]{4} \d{6}Z /.test(metar)) fail('Pegá el METAR completo, por ejemplo: METAR SADM 061200Z 03008KT 9999 FEW030 24/12 Q1016');
    db.meteo = { metar, taf, fecha: ahora(), autor_id: me.id, ejemplo: false }; guardar();
  };


  // ---------- estado de cuenta ----------
  const cuentaDe = (u) => {
    let saldo = 0;
    const movs = db.movimientos.filter((m) => m.usuario_id === u.id).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
      .map((m) => { saldo += m.tipo === 'cargo' ? m.importe : -m.importe; return { ...m, saldo }; });
    const cargos = movs.filter((m) => m.tipo === 'cargo').reduce((s, m) => s + m.importe, 0);
    const pagos = movs.filter((m) => m.tipo === 'pago').reduce((s, m) => s + m.importe, 0);
    return { usuario: pub(u), movimientos: movs.reverse(), saldo, cargos, pagos, tarifas: { ...db.tarifas } };
  };
  api.tarifas = () => { yo(); return { ...db.tarifas }; };
  api.miCuenta = () => cuentaDe(exigir('alumno', 'ppa'));
  api.cuenta = (uid) => { exigir('admin'); const u = usuario(uid); if (!u) fail('Usuario inexistente'); return cuentaDe(u); };
  api.cuentas = () => { exigir('admin'); return db.usuarios.filter((u) => ['alumno', 'ppa'].includes(u.rol)).map((u) => { const c = cuentaDe(u); return { ...c.usuario, saldo: c.saldo, cargos: c.cargos, pagos: c.pagos, ultimo: c.movimientos[0]?.fecha || null }; }); };
  api.registrarPago = (uid, { monto, medio, fecha, nota }) => {
    exigir('admin'); const u = usuario(uid); if (!u) fail('Usuario inexistente');
    const m = Math.round(Number(String(monto).replace(/\./g, '').replace(',', '.')));
    if (!(m > 0)) fail('Ingresá el monto del pago');
    movimiento(u.id, `Pago · ${medio || 'efectivo'}${nota ? ` · ${String(nota).trim()}` : ''}`, 'pago', m, `pago:${Date.now()}`, /^\d{4}-\d{2}-\d{2}$/.test(fecha || '') ? fecha : hoy());
    guardar();
  };
  api.ajusteCuenta = (uid, { monto, concepto, tipo }) => {
    exigir('admin'); const u = usuario(uid); if (!u) fail('Usuario inexistente');
    const m = Math.round(Number(String(monto).replace(/\./g, '').replace(',', '.')));
    if (!(m > 0) || !String(concepto || '').trim()) fail('Completá concepto y monto');
    movimiento(u.id, String(concepto).trim(), tipo === 'pago' ? 'pago' : 'cargo', m, `ajuste:${Date.now()}`); guardar();
  };
  api.guardarTarifas = (t) => {
    exigir('admin');
    const n = (v) => Math.round(Number(String(v).replace(/\./g, '').replace(',', '.')));
    const nt = { vuelo: n(t.vuelo), simulador: n(t.simulador), teorica: n(t.teorica), recargo: Number(t.recargo), horas_aviso: Number(t.horas_aviso) };
    if (Object.values(nt).some((v) => !(v >= 0)) || !nt.vuelo) fail('Revisá los valores de las tarifas');
    db.tarifas = nt; guardar();
  };

  // ---------- avisos ----------
  // recordatorio de deuda: una vez por día a cada alumno o piloto con saldo a pagar
  api.recordatoriosDeuda = () => {
    let n = 0;
    for (const u of db.usuarios.filter((x) => x.activo && ['alumno', 'ppa'].includes(x.rol))) {
      const c = cuentaDe(u);
      if (c.saldo <= 0) continue;
      if (db.notificaciones.some((x) => x.usuario_id === u.id && x.tipo === 'deuda' && x.dia === hoy())) continue;
      n += notificar(u, 'deuda', { saldo: c.saldo, ultimos: c.movimientos.filter((m) => m.tipo === 'cargo').slice(0, 4), tarifas: c.tarifas });
    }
    if (n) guardar();
    return n;
  };
  api.enviarRecordatoriosAhora = () => { exigir('admin'); return api.recordatoriosDeuda(); };
  // ---------- asistencia por QR ----------
  const distancia = (a, b, c, d) => { const R = 6371000, r = Math.PI / 180; const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  api.qrAsistencia = () => { exigir('admin'); return { ...db.config }; };
  api.regenerarQR = () => { exigir('admin'); db.config.qr = nuevoCodigo(); guardar(); return { ...db.config }; };
  api.guardarUbicacionEscuela = ({ lat, lon, radio }) => {
    exigir('admin');
    if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) fail('Ubicación inválida');
    db.config.lat = Number(lat); db.config.lon = Number(lon); if (radio) db.config.radio = Math.max(100, Math.min(5000, Number(radio)));
    guardar(); return { ...db.config };
  };
  // el alumno o piloto escanea el QR de la escuela: queda presente en lo que tenga ahora
  api.registrarLlegada = (codigo, pos) => {
    const u = exigir('alumno', 'ppa');
    if (String(codigo || '') !== db.config.qr) fail('Este QR no es válido. Escaneá el QR de asistencia que está en la escuela.');
    if (!navegador && opts.exigirUbicacion !== false) {
      if (!pos || pos.lat == null) fail('Para registrar tu llegada necesitamos la ubicación del celular. Activala y volvé a escanear el QR.');
      const m = distancia(db.config.lat, db.config.lon, Number(pos.lat), Number(pos.lon));
      if (m > db.config.radio + Math.min(Number(pos.precision) || 0, 300)) fail(`Estás a ${(m / 1000).toFixed(1).replace('.', ',')} km de la escuela. La llegada se registra solo estando en el aeródromo.`);
    }
    const h = hoy(); const ahoraH = new Date(); const min = ahoraH.getHours() * 60 + ahoraH.getMinutes();
    const enVentana = (b) => min >= b * 60 - 90 && min < (b + 2) * 60; // desde 1 h 30 antes hasta el final del bloque
    const hora = `${String(ahoraH.getHours()).padStart(2, '0')}:${String(ahoraH.getMinutes()).padStart(2, '0')}`;
    const items = [];
    const res = db.reservas.filter((r) => r.piloto_id === u.id && r.fecha === h && r.estado === 'pendiente' && enVentana(r.bloque));
    // si tiene varios bloques seguidos, queda presente en todos
    const bloquesHoy = db.reservas.filter((r) => r.piloto_id === u.id && r.fecha === h && r.estado === 'pendiente');
    const marcar = new Set(res.map((r) => r.id));
    for (const r of res) for (const x of bloquesHoy) if (x.recurso_id === r.recurso_id && x.bloque > r.bloque && x.bloque <= r.bloque + 6) marcar.add(x.id);
    for (const r of bloquesHoy.filter((x) => marcar.has(x.id)).sort((a, b) => a.bloque - b.bloque)) {
      const ya = !!r.llegada; if (!ya) r.llegada = hora;
      items.push({ tipo: r.tipo, bloque: r.bloque, recurso: recurso(r.recurso_id).nombre, instructor: nombre(usuario(r.instructor_id)) || null, llegada: r.llegada, ya });
    }
    for (const i of db.inscripciones.filter((x) => x.alumno_id === u.id && x.estado === 'inscripto')) {
      const c = db.clases.find((k) => k.id === i.clase_id);
      if (!c || c.fecha !== h || c.estado !== 'programada' || !enVentana(c.bloque)) continue;
      const ya = !!i.llegada; if (!ya) i.llegada = hora;
      items.push({ tipo: 'teorica', bloque: c.bloque, recurso: c.aula, instructor: nombre(usuario(c.instructor_id)), titulo: `${c.teo} · ${LECCIONES[c.teo]?.titulo || ''}`, llegada: i.llegada, ya });
    }
    if (!items.length) fail('No tenés ningún vuelo, simulador ni clase en este horario. Podés registrar tu llegada desde 1 h 30 min antes del turno.');
    guardar();
    return { hora, items, nombre: u.nombre };
  };
  api.guardarHabilitaciones = (uid, h) => {
    exigir('admin'); const u = usuario(uid);
    if (!u || !['alumno', 'ppa'].includes(u.rol)) fail('Las habilitaciones son para alumnos y pilotos');
    const ids = new Set(db.recursos.filter((r) => r.tipo === 'avion').map((r) => r.id));
    u.hab = { solo: !!h.solo, sim_solo: !!h.sim_solo, travesia: !!h.travesia,
      aeronaves: Array.isArray(h.aeronaves) ? [...new Set(h.aeronaves.map(Number))].filter((x) => ids.has(x)) : null };
    guardar(); return pub(u);
  };
  api.misNotificaciones = () => { const u = yo(); return db.notificaciones.filter((x) => x.usuario_id === u.id).sort((a, b) => b.id - a.id); };
  api.notificaciones = ({ dia } = {}) => { exigir('admin'); return db.notificaciones.filter((x) => !dia || x.dia === dia).sort((a, b) => b.id - a.id); };
  api.ultimasDeReserva = () => { const u = yo(); const l = db.notificaciones.filter((x) => x.usuario_id === u.id && ['reserva', 'clase'].includes(x.tipo)); const ult = l.at(-1); return ult ? l.filter((x) => x.fecha === ult.fecha && x.tipo === ult.tipo) : []; };
  api.guardarPreferencias = ({ email, whatsapp }) => { const u = yo(); u.notif = { email: !!email, whatsapp: !!whatsapp }; guardar(); return pub(u); };
  // ---------- uso interno del servidor (no se exponen a la interfaz) ----------
  api._como = (id) => { sesion = id || null; };
  api._sesion = () => sesion;
  api._metaDocumento = (uid, tipo) => { const me = yo(); if (me.id !== Number(uid) && !['instructor', 'admin'].includes(me.rol)) return null; return usuario(uid)?.docs[tipo] || null; };
  api._marcarNotificacion = (id, estado, detalle) => { const n = db.notificaciones.find((x) => x.id === id); if (n) { n.estado = estado; n.detalle = detalle || null; guardar(); } };
  api._pendientes = () => db.notificaciones.filter((n) => n.estado === 'pendiente');
  return api;
}
if (typeof module !== 'undefined') module.exports = { crearStore };
