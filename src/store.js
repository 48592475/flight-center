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
        contacto_emergencia: '', licencia_nro: '', vencimiento_cma: '', horas_previas: 0, docs: {}, nacionalidad: 'Argentina', ...extra };
      db.usuarios.push(u); return u.id;
    };
    const admin = U('admin', 'Gabriela', 'Torres', 'admin@flightcenter.com', { rango: 'contabilidad', telefono: '+54 9 11 5555-0001', direccion: 'Aeródromo de Morón, Hangar 3' });
    U('admin', 'Nicolás', 'Vega', 'programador@flightcenter.com', { rango: 'programador', telefono: '+54 9 11 5555-0002', direccion: 'Aeródromo de Morón, Haedo' });
    const mec = U('mecanico', 'Carlos', 'Medina', 'mecanico@flightcenter.com', { telefono: '+54 9 11 5555-0002', licencia_nro: 'MMA-2231', direccion: 'Castelar, Buenos Aires' });
    const martin = U('instructor', 'Martín', 'Gómez', 'instructor@flightcenter.com', { rango: 'todo', dni: '25111222', fecha_nacimiento: '1980-03-12', direccion: 'Av. Libertador 1200, San Fernando', telefono: '+54 9 11 5555-1001', contacto_emergencia: 'Laura Gómez +54 9 11 5555-2001', licencia_nro: 'INV-4521', vencimiento_cma: '2027-05-30', horas_previas: 3250 });
    const sofia = U('instructor', 'Sofía', 'Ramírez', 'sofia@flightcenter.com', { rango: 'vuelo_teoria', dni: '30222333', fecha_nacimiento: '1987-08-02', direccion: 'Calle Belgrano 455, Tigre', telefono: '+54 9 11 5555-1002', contacto_emergencia: 'Pablo Ramírez +54 9 11 5555-2002', licencia_nro: 'INV-5873', vencimiento_cma: '2027-01-15', horas_previas: 1840 });
    const diego = U('instructor', 'Diego', 'Ortiz', 'diego@flightcenter.com', { rango: 'teoria_simulador', telefono: '+54 9 11 5555-1003', licencia_nro: 'INV-6120', vencimiento_cma: '2027-08-10', horas_previas: 960 });
    const juan = U('alumno', 'Juan', 'Pérez', 'alumno@flightcenter.com', { dni: '45123456', fecha_nacimiento: '2008-06-20', direccion: 'Mitre 789, San Isidro', telefono: '+54 9 11 5555-3001', contacto_emergencia: 'Ana Pérez (madre) +54 9 11 5555-4001', vencimiento_cma: '2027-03-01' });
    const vale = U('alumno', 'Valentina', 'Ruiz', 'valentina@flightcenter.com', { moneda: 'USD', nacionalidad: 'Uruguay', tutor_nombre: 'Marcos Ruiz', tutor_parentesco: 'Padre', tutor_telefono: '+598 99 123 456', tutor_email: 'marcos.ruiz@example.com', dni: '44222111', fecha_nacimiento: '2002-02-14', direccion: 'Rivadavia 15000, Haedo', telefono: '+54 9 11 5555-3003', contacto_emergencia: 'Marcos Ruiz +54 9 11 5555-4003', vencimiento_cma: dia(20) });
    const lucia = U('ppa', 'Lucía', 'Fernández', 'ppa@flightcenter.com', { dni: '38999888', fecha_nacimiento: '1995-11-04', direccion: 'Sarmiento 321, Vicente López', telefono: '+54 9 11 5555-3002', contacto_emergencia: 'Diego Fernández +54 9 11 5555-4002', licencia_nro: 'PPA-77812', vencimiento_cma: '2026-12-20', horas_previas: 58, hab: { solo: true, sim_solo: true, travesia: true, aeronaves: null } });
    void admin;

    const R = (tipo, nombre, modelo, estado = 'operativa') => { db.recursos.push({ id: ++db.seq.rec, tipo, nombre, modelo, estado, ...(tipo === 'avion' ? datosModelo(modelo) : {}) }); return db.seq.rec; };
    const fca = R('avion', 'LV-FCA', 'Cessna 152'); const fcb = R('avion', 'LV-FCB', 'Cessna 172 Skyhawk');
    const fcc = R('avion', 'LV-FCC', 'Piper PA-28 Warrior'); const fcd = R('avion', 'LV-FCD', 'Cessna 152', 'mantenimiento');
    R('avion', 'LV-FCE', 'Bristell B23');
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
    res('vuelo', vale, martin, fca, dia(-1), 12, 'pendiente');
    res('simulador', vale, sofia, frasca, dia(-9), 10, 'ausente', { ausencia: { por: sofia, fecha: dia(-9) + ' 11:00', justificada: false, motivo: null } });
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
    // campus: ejemplos de la demo
    Object.assign(db, { materiales: [], tps: [], entregas: [], archivos: [] }); Object.assign(db.seq, { mat: 0, tp: 0, en: 0, ar: 0 });
    const mat = (leccion, titulo, tipo, extra, autor, dias) => db.materiales.push({ id: ++db.seq.mat, leccion, titulo, tipo, descripcion: '', url: '', texto: '', archivo_id: null, autor_id: autor, fecha: dia(dias) + ' 10:00', ...extra });
    mat('GENERAL', 'Bienvenida al curso de Piloto Privado', 'texto', { texto: 'Bienvenidos al campus de Flight Center. Acá van a encontrar el material de cada clase teórica, de los simuladores y de las lecciones de vuelo, ordenado según el syllabus. Antes de cada vuelo revisen el material de la lección que les toca y traigan estudiados los temas indicados.' }, martin, -60);
    mat('TEO 2', 'Resumen: fuerzas que actúan sobre el avión', 'texto', { texto: 'Sustentación, peso, empuje y resistencia. En vuelo recto, nivelado y no acelerado, la sustentación equilibra el peso y el empuje equilibra la resistencia. Repasar: ángulo de ataque, pérdida, factor de carga en virajes.' }, diego, -45);
    mat('VUELO', 'Escapes: puntos clave', 'texto', { texto: 'Potencia máxima, actitud de ascenso, flaps de a etapas según el POH, compensar y comunicar. Practicar la secuencia en tierra antes del vuelo.' }, martin, -13);
    const tp = (leccion, titulo, consigna, limite, autor) => { db.tps.push({ id: ++db.seq.tp, leccion, titulo, consigna, fecha_limite: limite, archivo_id: null, autor_id: autor, fecha: dia(-3) + ' 09:00' }); return db.seq.tp; };
    const tp1 = tp('TEO 4', 'TP 1 · Interpretación de METAR', 'Decodificá estos tres METAR y explicá si las condiciones permiten un vuelo VFR local en Morón:\n1) METAR SADM 061200Z 03008KT 9999 FEW030 24/12 Q1016\n2) METAR SADP 061200Z 36012G22KT 6000 -RA BKN012 OVC030 19/17 Q1009\n3) METAR SAEZ 061200Z 18015KT 3000 BR OVC005 12/11 Q1020', dia(5), diego);
    tp('TEO 5', 'TP 2 · Espacios aéreos', 'Dibujá el espacio aéreo alrededor de Morón y marcá los límites de la ATZ y de la TMA Baires. Indicá frecuencias y altitudes.', dia(10), diego);
    if (!db.config) db.config = configInicial();
    db.config.cotizacion = { venta: 1455, compra: 1405, casa: 'oficial', fecha: ahora(), fuente: 'valor de ejemplo' };
    // asistencia de instructores de ejemplo
    db.asistencia_inst = []; db.seq.ai = 0;
    const asis = (inst, dias, hora, primer) => { const [h, m] = hora.split(':').map(Number); const mins = h * 60 + m - primer * 60;
      db.asistencia_inst.push({ id: ++db.seq.ai, instructor_id: inst, fecha: dia(dias), hora, primer_bloque: primer, tarde: mins > 10, minutos_tarde: Math.max(0, mins) }); };
    asis(sofia, -40, '07:40', 8); asis(martin, -25, '09:50', 10); asis(martin, -12, '14:25', 14); asis(martin, -2, '09:45', 10); asis(sofia, -9, '09:35', 10);
    // fotos de ejemplo (ilustraciones), salvo Valentina
    const COLORES = ['#1565c0', '#0f3460', '#1e88e5', '#00838f', '#5e35b1', '#2e7d32', '#ad1457'];
    db.usuarios.filter((u) => u.id !== vale).forEach((u, i) => {
      const ini = `${u.nombre[0]}${u.apellido[0] || ''}`.toUpperCase(); const c = COLORES[i % COLORES.length];
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="${c}"/><circle cx="60" cy="47" r="22" fill="#ffffff" opacity=".9"/><path d="M18 120c4-26 22-40 42-40s38 14 42 40z" fill="#ffffff" opacity=".9"/><text x="60" y="54" font-family="Arial" font-weight="700" font-size="17" fill="${c}" text-anchor="middle">${ini}</text></svg>`;
      const id = ++db.seq.ar; const data = `data:image/svg+xml;base64,${typeof btoa === 'function' ? btoa(svg) : Buffer.from(svg).toString('base64')}`;
      const meta = { id, nombre: `foto-${u.id}.svg`, tam: svg.length, tipo: 'image/svg+xml', autor_id: u.id, fecha: ahora(), ambito: 'foto' };
      if (opts.archivos) opts.archivos.guardar(id, data); else meta.data = data;
      db.archivos.push(meta);
      u.foto = id;
    });
    // foro: ejemplos de la demo
    db.foro_temas = []; db.foro_respuestas = []; db.seq.ft = 0; db.seq.fr = 0;
    const tema = (autor, titulo, cuerpo, seccion, dias, extra = {}) => { db.foro_temas.push({ id: ++db.seq.ft, autor_id: autor, titulo, cuerpo, seccion, fecha: dia(dias) + ' 19:30', actividad: dia(dias) + ' 19:30', resuelto: false, fijado: false, ...extra }); return db.seq.ft; };
    const resp = (tId, autor, cuerpo, dias, mejor = false) => { db.foro_respuestas.push({ id: ++db.seq.fr, tema_id: tId, autor_id: autor, cuerpo, fecha: dia(dias) + ' 21:10', mejor }); const t = db.foro_temas.find((x) => x.id === tId); t.actividad = dia(dias) + ' 21:10'; if (mejor) t.resuelto = true; };
    tema(martin, 'Normas del foro', 'Este espacio es para consultas del curso: teoría, maniobras, simulador y dudas generales. Respondan con respeto y, si alguna respuesta les resolvió la duda, márquenla como destacada. Ante dudas sobre un vuelo concreto, consulten siempre con su instructor.', 'GENERAL', -30, { fijado: true });
    const t1 = tema(vale, '¿Cuál es la diferencia entre QNH y QFE?', 'En la clase vimos los reglajes altimétricos pero no me queda claro cuándo se usa cada uno.', 'TEO 3', -6);
    resp(t1, juan, 'Con QNH el altímetro marca la altitud sobre el nivel del mar; con QFE marca la altura sobre el aeródromo (en tierra marca cero).', -6);
    resp(t1, sofia, 'Exacto. En Argentina se opera con QNH por debajo de la altitud de transición; el QFE casi no se usa en la práctica. Repasen la parte de altimetría de la TEO 3.', -5, true);
    tema(juan, '¿Cómo practican la secuencia del escape en casa?', 'Me cuesta acordarme el orden de los pasos del escape en la FL 3. ¿Alguno tiene un truco?', 'VUELO', -2);
    db.entregas.push({ id: ++db.seq.en, tp_id: tp1, alumno_id: juan, texto: '1) Viento 030° 8 kt, visibilidad mayor a 10 km, pocas nubes a 3000 ft: VFR. 2) Ráfagas de 22 kt y techo a 1200 ft: marginal, no recomendable. 3) Visibilidad 3 km y techo a 500 ft: IFR, no se puede volar VFR.', archivo_id: null, fecha: dia(-1) + ' 20:15', tardia: false, estado: 'aprobado', nota: 9, comentario: 'Muy bien. En el 2 revisá el viento cruzado para la pista 20.', corrector_id: diego, fecha_correccion: dia(0) + ' 08:30' });
    db.notificaciones = []; db.seq.nt = 0;
    const mov = reconstruirCuentas(db);
    mov(juan, dia(-38), 'Pago · transferencia', 'pago', 600000, 'pago:1');
    mov(juan, dia(-10), 'Pago · efectivo', 'pago', 400000, 'pago:2');
    mov(lucia, dia(-30), 'Pago · transferencia', 'pago', 300000, 'pago:3');
    mov(lucia, dia(-1), 'Pago · tarjeta de débito', 'pago', 700000, 'pago:4');
    // pack de horas de ejemplo: Lucía compró 10 h de vuelo con 10% de descuento
    db.horas_mov = [{ id: 1, usuario_id: lucia, fecha: dia(-1), tipo: 'vuelo', horas: 10, concepto: 'Pack de 10 h de vuelo', ref: 'pack:1' }]; db.seq.hm = 1;
    mov(lucia, dia(-1), 'Pack de 10 h de vuelo (10% de descuento)', 'cargo', 1764000, 'pack:1');
    mov(lucia, dia(-1), 'Pago · transferencia · pack de horas', 'pago', 1764000, 'pago:5');
    for (const m of db.movimientos) if (m.usd == null) { m.usd = Math.round(m.importe / 1455 * 100) / 100; m.tc = 1455; } // demo: dólar de ejemplo
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
      recursos: [], materiales: [], tps: [], entregas: [], archivos: [], foro_temas: [], foro_respuestas: [] };
    Object.assign(db.seq, { mat: 0, tp: 0, en: 0, ar: 0, ft: 0, fr: 0 });
    const R = (tipo, nombre, modelo) => db.recursos.push({ id: ++db.seq.rec, tipo, nombre, modelo, estado: 'operativa', ...(tipo === 'avion' ? datosModelo(modelo) : {}) });
    R('avion', 'LV-FCA', 'Cessna 152'); R('avion', 'LV-FCB', 'Cessna 172 Skyhawk'); R('avion', 'LV-FCC', 'Piper PA-28 Warrior'); R('avion', 'LV-FCD', 'Cessna 152');
    R('simulador', 'Frasca', 'Frasca 141'); R('simulador', 'Simu 1', 'Simulador de procedimientos');
    return db;
  }
  // ---------- cuentas: tarifas y movimientos ----------
  const TARIFAS_INICIALES = { vuelo: 196000, simulador: 36000, teorica: 26000, recargo: 20, horas_aviso: 24, ausencia: 100 };
  function reconstruirCuentas(d) {
    d.tarifas = d.tarifas || { ...TARIFAS_INICIALES };
    d.movimientos = []; d.seq.m = 0;
    const T = d.tarifas;
    const mov = (usuario_id, fecha, concepto, tipo, importe, ref) => d.movimientos.push({ id: ++d.seq.m, usuario_id, fecha, concepto, tipo, importe: Math.round(importe), ref });
    for (const r of d.reservas.filter((x) => x.estado === 'completado')) {
      const rec = d.recursos.find((x) => x.id === r.recurso_id);
      mov(r.piloto_id, r.fecha, `${r.tipo === 'vuelo' ? 'Vuelo' : 'Simulador'} ${rec?.nombre || ''} · ${String(r.horas).replace('.', ',')} h${r.leccion ? ` · ${r.leccion}` : ''}`, 'cargo', (r.horas || 0) * T[r.tipo], `res:${r.id}`);
    }
    for (const r of d.reservas.filter((x) => x.estado === 'ausente' && !x.ausencia?.justificada)) {
      mov(r.piloto_id, r.fecha, `Ausencia sin aviso · ${r.tipo === 'vuelo' ? 'vuelo' : 'simulador'} ${r.fecha.split('-').reverse().join('/')} ${String(r.bloque).padStart(2, '0')}:00 (${T.ausencia ?? 100}% del bloque)`, 'cargo', (r.tipo === 'teorica' ? T.teorica : T[r.tipo] * 2) * (T.ausencia ?? 100) / 100, `aus:${r.id}`);
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
  const HAB_VACIA = () => ({ solo: false, sim_solo: false, travesia: false, bristell: false, aeronaves: null }); // aeronaves: null = todas
  // aviones Bristell: solo los pueden reservar los pilotos adaptados (habilitación que dan administración o instructores)
  const esBristell = (r) => /bristell/i.test(`${r?.modelo || ''} ${r?.nombre || ''}`);
  const habDe = (u) => ({ ...HAB_VACIA(), ...(u.hab || {}) });
  // migración de datos guardados por versiones anteriores de la demo
  function migrar(d) {
    for (const k of ['materiales', 'tps', 'entregas', 'archivos', 'foro_temas', 'foro_respuestas']) if (!d[k]) d[k] = [];
    for (const k of ['ft', 'fr']) if (!d.seq[k]) d.seq[k] = 0;
    if (d.tarifas && d.tarifas.ausencia == null) d.tarifas.ausencia = 100;
    for (const x of [...d.materiales, ...d.tps]) { if (/^FL /.test(x.leccion)) x.leccion = 'VUELO'; if (/^SL /.test(x.leccion)) x.leccion = 'SIMULADOR'; }
    for (const k of ['mat', 'tp', 'en', 'ar']) if (!d.seq[k]) d.seq[k] = 0;
    for (const u of d.usuarios) if (['alumno', 'ppa'].includes(u.rol) && !u.hab) u.hab = HAB_VACIA();
    if (!d.config) d.config = configInicial();
    if (!d.asistencia_inst) { d.asistencia_inst = []; d.seq.ai = 0; }
    if (!d.horas_mov) { d.horas_mov = []; d.seq.hm = 0; }
    if (d.config.tolerancia_inst == null) d.config.tolerancia_inst = 10;
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
  let loteLiberados = null; // al cancelar varios bloques juntos se manda un solo aviso
  if (navegador) { try { sesion = Number(sessionStorage.getItem(KEY + '-s')) || null; } catch { /* sin storage */ } }
  const guardar = () => {
    if (!navegador) return opts.guardar(db);
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* cuota llena o bloqueado: queda en memoria */ }
  };
  const guardarSesion = () => { if (!navegador) return; try { sesion ? sessionStorage.setItem(KEY + '-s', String(sesion)) : sessionStorage.removeItem(KEY + '-s'); } catch { /* ignorar */ } };
  if (!navegador) guardar();

  // ---------- notificaciones (email y WhatsApp) ----------
  // En la demo quedan registradas para verlas; con un servidor se envían de verdad.
  function notificar(u, tipo, datos, { soloEmail = false } = {}) {
    const pref = u.notif || { email: true, whatsapp: true };
    const canales = [pref.email && u.email ? ['email', u.email] : null, !soloEmail && pref.whatsapp && u.telefono ? ['whatsapp', u.telefono] : null].filter(Boolean);
    for (const [canal, destino] of canales) {
      const n = { id: ++db.seq.nt, usuario_id: u.id, canal, destino, tipo, fecha: ahora(), dia: hoy(), datos: JSON.parse(JSON.stringify(datos)),
        nombre: u.nombre, apellido: u.apellido, rol: u.rol, estado: navegador ? 'demo' : 'pendiente' };
      db.notificaciones.push(n);
      if (opts.alNotificar) setTimeout(() => opts.alNotificar(n), 0);
    }
    return canales.length;
  }
  // ---------- helpers ----------
  const r2 = (x) => Math.round(x * 100) / 100;
  const tc = () => Number(db.config?.cotizacion?.venta) || null;
  // movimientos de antes de tener cotización: quedan fijos en dólares con la primera que haya
  const congelarUsd = () => { const t = tc(); if (!t) return false; let n = 0; for (const m of db.movimientos || []) if (m.usd == null) { m.usd = r2(m.importe / t); m.tc = t; n++; } return n > 0; };
  // cada movimiento guarda su valor en pesos y en dólares al tipo de cambio del día en que se generó
  const movimiento = (usuario_id, concepto, tipo, importe, ref, fecha = hoy(), usdExacto = null) => {
    if (ref && db.movimientos.some((m) => m.ref === ref)) return;
    const t = tc();
    db.movimientos.push({ id: ++db.seq.m, usuario_id, fecha, concepto, tipo, importe: Math.round(importe), ref, tc: t, usd: usdExacto != null ? r2(usdExacto) : t ? r2(importe / t) : null });
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
  // rangos dentro de cada tipo de usuario (por ahora, administración)
  const ACT_INST = { vuelo: ['vuelo'], teoria: ['teorica'], simulador: ['simulador'], teoria_simulador: ['teorica', 'simulador'],
    vuelo_teoria: ['vuelo', 'teorica'], vuelo_simulador: ['vuelo', 'simulador'], todo: ['vuelo', 'simulador', 'teorica'] };
  const RANGOS = { admin: ['contabilidad', 'programador'], instructor: Object.keys(ACT_INST) };
  const rangoDe = (u) => (u.rol === 'admin' ? (u.rango || 'contabilidad') : u.rol === 'instructor' ? (RANGOS.instructor.includes(u.rango) ? u.rango : 'todo') : null);
  // qué actividades puede dar cada instructor según su tipo (vuelo, simulador, teórica)
  const instPuede = (u, tipo) => u?.rol === 'instructor' && ACT_INST[rangoDe(u)].includes(tipo);
  // contabilidad: estados de cuenta, pagos, packs, tarifas y cotización. El rango "programador" no tiene acceso.
  const exigirContable = () => { const u = exigir('admin'); if (rangoDe(u) !== 'contabilidad') fail('Tu rango (programador) no tiene acceso a la contabilidad.'); return u; };
  const nombre = (u) => (u ? `${u.nombre} ${u.apellido}` : '');
  // alumnos extranjeros: solo pueden reservar 08-10, 14-16 y 16-18; el resto les figura reservado
  const BLOQUES_EXTRANJEROS = [8, 14, 16];
  const bloquesPermitidos = (u) => u && u.rol === 'alumno' && u.nacionalidad && u.nacionalidad !== 'Argentina' ? BLOQUES_EXTRANJEROS : null;
  // foto de perfil: obligatoria para todos menos la administración
  const FOTO_OBLIGATORIA = ['alumno', 'ppa', 'instructor', 'mecanico'];
  const fotoUrl = (u) => { if (!u?.foto) return null; if (opts.archivos) return `/api/archivo/${u.foto}`; return db.archivos.find((a) => a.id === u.foto)?.data || null; };
  const faltaFoto = (u) => FOTO_OBLIGATORIA.includes(u.rol) && !u.foto;
  const pub = (u) => { if (!u) return null; const { password, docs, ...r } = u; r.foto_url = fotoUrl(u); r.falta_foto = faltaFoto(u); if (u.rol === 'admin' || u.rol === 'instructor') r.rango = rangoDe(u); if (u.rol === 'instructor') r.actividades = ACT_INST[rangoDe(u)]; if (['alumno', 'ppa'].includes(u.rol)) r.hab = habDe(u); return { ...r, docs: Object.fromEntries(Object.entries(docs).map(([k, v]) => [k, { nombre: v.nombre, tam: v.tam, fecha: v.fecha }])) }; };
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
  // ---------- turno liberado: aviso a todos los alumnos y pilotos ----------
  function avisarLiberado(rs, quien) {
    const grupos = new Map();
    for (const r of rs.filter((x) => ['vuelo', 'simulador'].includes(x.tipo) && !yaEmpezo(x.fecha, x.bloque))) {
      const k = `${r.tipo}|${r.fecha}|${r.recurso_id}|${r.instructor_id}`; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(r);
    }
    for (const g of grupos.values()) {
      const r = g[0]; const bloques = g.map((x) => x.bloque).sort((a, b) => a - b);
      const rec = recurso(r.recurso_id); const inst = usuario(r.instructor_id);
      const datos = { tipo: r.tipo, fecha: r.fecha, bloques, recurso: rec?.nombre || '', modelo: rec?.modelo || '', instructor: inst ? nombre(inst) : null };
      for (const u of db.usuarios) {
        if (!u.activo || !['alumno', 'ppa'].includes(u.rol) || u.id === r.piloto_id || u.id === quien?.id) continue;
        if (u.notif && u.notif.liberados === false) continue;
        const permitidos = bloquesPermitidos(u); // un alumno extranjero solo se entera de los bloques que puede reservar
        if (permitidos && !bloques.some((b) => permitidos.includes(b))) continue;
        notificar(u, 'turno_liberado', datos);
      }
    }
  }
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
      if (me.rol === 'admin' && rangoDe(me) !== 'contabilidad' && u.id !== me.id && (rangoDe(u) === 'contabilidad' && u.email || datos.rango === 'contabilidad'))
        fail('Un programador no puede crear ni modificar usuarios del rango contabilidad.');
      if (!String(datos.nombre || '').trim() || !String(datos.apellido || '').trim()) fail('Nombre y apellido son obligatorios');
      if (!/^\S+@\S+\.\S+$/.test(String(datos.email || ''))) fail('El email no es válido');
      if (db.usuarios.some((x) => x.id !== u.id && x.email.toLowerCase() === datos.email.trim().toLowerCase())) fail('Ese email ya está registrado');
      // nacionalidad (obligatoria) y, para alumnos y pilotos extranjeros, contacto de emergencia de sus tutores
      const rolFinal = me.rol === 'admin' && datos.rol && u.id !== me.id ? datos.rol : u.rol;
      const nac = 'nacionalidad' in datos ? String(datos.nacionalidad ?? '').trim() : (u.nacionalidad || '');
      if (('nacionalidad' in datos || !u.email) && !nac) fail('Elegí la nacionalidad');
      const pideTutor = nac && nac !== 'Argentina' && ['alumno', 'ppa'].includes(rolFinal);
      if (pideTutor) {
        const t = (k) => String((k in datos ? datos[k] : u[k]) ?? '').trim();
        if (!t('tutor_nombre')) fail('Por no ser de Argentina, cargá el nombre del tutor o responsable');
        if (!t('tutor_parentesco')) fail('Indicá el parentesco o vínculo del tutor');
        if (t('tutor_telefono').replace(/\D/g, '').length < 6) fail('Cargá un teléfono válido del tutor, con código de país');
        if (t('tutor_email') && !/^\S+@\S+\.\S+$/.test(t('tutor_email'))) fail('El email del tutor no es válido');
      }
      for (const c of ['nombre', 'apellido', 'email', 'dni', 'fecha_nacimiento', 'direccion', 'telefono', 'contacto_emergencia', 'licencia_nro', 'vencimiento_cma', 'nacionalidad', 'tutor_nombre', 'tutor_parentesco', 'tutor_telefono', 'tutor_email']) if (c in datos) u[c] = String(datos[c] ?? '').trim();
      if (!pideTutor) for (const c of ['tutor_nombre', 'tutor_parentesco', 'tutor_telefono', 'tutor_email']) delete u[c];
      if (me.rol === 'admin') {
        if ('horas_previas' in datos) u.horas_previas = Math.max(0, Number(datos.horas_previas) || 0);
        if (['ARS', 'USD'].includes(datos.moneda)) u.moneda = datos.moneda;
        const rolNuevo = datos.rol && u.id !== me.id ? datos.rol : u.rol;
        if (RANGOS[rolNuevo]?.includes(datos.rango) && (u.id !== me.id || rolNuevo !== 'admin')) u.rango = datos.rango;
        if (!RANGOS[rolNuevo]?.includes(u.rango)) delete u.rango;
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
      const me = yo(); const permitidos = bloquesPermitidos(me);
      const insts = db.usuarios.filter((u) => u.rol === 'instructor' && u.activo);
      const recs = db.recursos.filter((r) => r.tipo === (tipo === 'vuelo' ? 'avion' : 'simulador') && r.estado === 'operativa');
      return BLOQUES.map((b) => ({
        bloque: b, pasado: yaEmpezo(f, b), ocupadoYo: ocupacionPersona(me.id, f, b), reservado: !!permitidos && !permitidos.includes(b),
        instructores: insts.filter((i) => instPuede(i, tipo) && disponibleAdmin(i.id, f, b) && !ocupacionPersona(i.id, f, b)).map((i) => i.id),
        recursos: recs.filter((r) => !activas().some((x) => x.recurso_id === r.id && x.fecha === f && x.bloque === b)).map((r) => r.id),
      }));
    },
    reservar({ tipo, fecha, bloques, instructor_id, recurso_id, destino }) {
      const u = exigir('alumno', 'ppa');
      if (faltaFoto(u)) fail('Antes de reservar tenés que subir tu foto de perfil.');
      const esPPA = u.rol === 'ppa';
      if (!['vuelo', 'simulador'].includes(tipo)) fail('Tipo de reserva inválido');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ''))) fail('Elegí un día');
      bloques = [...new Set((bloques || []).map(Number))].sort((a, b) => a - b);
      if (!bloques.length || bloques.some((b) => !BLOQUES.includes(b))) fail('Elegí al menos un bloque horario');
      if (bloques.some((b) => yaEmpezo(fecha, b))) fail('Ese horario ya pasó');
      const permitidos = bloquesPermitidos(u);
      if (permitidos && bloques.some((b) => !permitidos.includes(b))) fail('Ese horario ya está reservado. Elegí otro bloque.');
      const inst = instructor_id ? usuario(instructor_id) : null;
      if (instructor_id && (!inst || inst.rol !== 'instructor' || !inst.activo)) fail('Instructor inválido');
      if (inst && !instPuede(inst, tipo)) fail(`${nombre(inst)} no es instructor de ${tipo === 'vuelo' ? 'vuelo' : 'simulador'}. Elegí otro instructor.`);
      const tipoRec = tipo === 'vuelo' ? 'avion' : 'simulador';
      // todos los vuelos salen de Morón; los de alumnos son siempre locales (MOR - MOR)
      destino = tipo === 'vuelo' && esPPA ? String(destino || 'MOR').trim().toUpperCase() : 'MOR';
      if (!/^[A-Z0-9]{3,4}$/.test(destino)) fail('El destino debe ser un código de aeródromo de 3 o 4 letras (ej: MOR, SAN, SADF)');
      const hab = habDe(u);
      if (!inst && tipo === 'vuelo' && !hab.solo) fail('No tenés habilitación para volar solo. Elegí un instructor o pedile la habilitación a la administración.');
      if (!inst && tipo === 'simulador' && !hab.sim_solo) fail('No tenés habilitación para usar el simulador sin instructor. Elegí un instructor o pedile la habilitación a la administración.');
      if (destino !== 'MOR' && !hab.travesia) fail('No tenés habilitación para travesías: solo podés reservar vuelos locales (MOR – MOR).');
      const avionPermitido = (id) => tipo !== 'vuelo' || ((!Array.isArray(hab.aeronaves) || hab.aeronaves.includes(id)) && !(esPPA && esBristell(recurso(id)) && !hab.bristell));
      if (!esPPA) {
        if (bloques.length > 1) fail('Como alumno podés reservar un solo bloque por día');
        if (activas().some((r) => r.piloto_id === u.id && r.fecha === fecha && r.tipo === tipo)) fail(`Ya tenés ${tipo === 'vuelo' ? 'un vuelo' : 'un turno de simulador'} ese día. Los alumnos pueden reservar un bloque por día.`);
      }
      if ((esPPA || tipo === 'simulador') && !recurso_id) fail(tipo === 'vuelo' ? 'Elegí una aeronave' : 'Elegí un simulador');
      const rec = recurso_id ? recurso(recurso_id) : null;
      if (rec && (rec.tipo !== tipoRec || rec.estado !== 'operativa')) fail(`${rec.nombre} no está disponible (fuera de servicio)`);
      if (rec && tipo === 'vuelo' && esPPA && esBristell(rec) && !hab.bristell) fail(`Para volar el ${rec.nombre} (Bristell) necesitás la adaptación a Bristell. La otorga un instructor o la administración.`);
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
      if (r.piloto_id === u.id && yaEmpezo(r.fecha, r.bloque)) fail('Tu turno ya empezó y no se puede cancelar. Si no pudiste venir, avisale a tu instructor o a la escuela.');
      r.estado = 'cancelado';
      if (loteLiberados) loteLiberados.push(r); else avisarLiberado([r], u);
      // solo se cobra cuando cancela el propio piloto con menos de 24 hs de aviso
      let cargo = 0;
      if (r.piloto_id === u.id) {
        cargo = cargoCancelacion(r.tipo, r.fecha, r.bloque).cargo;
        if (cargo) movimiento(u.id, `Cancelación con menos de ${db.tarifas.horas_aviso} hs · ${r.tipo === 'vuelo' ? 'vuelo' : 'simulador'} ${r.fecha.split('-').reverse().join('/')} ${hh(r.bloque)} (${db.tarifas.recargo}% del bloque)`, 'cargo', cargo, `canc:${r.id}`);
      }
      guardar(); return cargo;
    },
    marcarAusente(id, { justificada = false, motivo = '' } = {}) {
      const u = exigir('instructor', 'admin'); const r = db.reservas.find((x) => x.id === Number(id));
      if (!r) fail('Reserva no encontrada');
      if (u.rol === 'instructor' && r.instructor_id !== u.id) fail('Solo podés marcar ausencias en tus propios vuelos');
      if (r.estado !== 'pendiente') fail('Esta reserva ya fue cerrada');
      if (!yaEmpezo(r.fecha, r.bloque)) fail('El turno todavía no empezó');
      if (r.llegada) fail(`Registró su llegada con el QR a las ${r.llegada}: no se puede marcar como ausente`);
      const m = String(motivo || '').trim().slice(0, 300);
      if (justificada && !m) fail('Escribí el motivo de la ausencia justificada');
      r.estado = 'ausente'; r.ausencia = { por: u.id, fecha: ahora(), justificada: !!justificada, motivo: m || null };
      const cargo = justificada ? 0 : Math.round(valorBloque(r.tipo) * (db.tarifas.ausencia ?? 100) / 100);
      if (cargo) movimiento(r.piloto_id, `Ausencia sin aviso · ${r.tipo === 'vuelo' ? 'vuelo' : 'simulador'} ${r.fecha.split('-').reverse().join('/')} ${hh(r.bloque)} (${db.tarifas.ausencia ?? 100}% del bloque)`, 'cargo', cargo, `aus:${r.id}`, r.fecha);
      const p = usuario(r.piloto_id);
      if (p?.activo) notificar(p, 'ausencia', { reserva: expandir(r), cargo, cargo_usd: tc() ? r2(cargo / tc()) : null, moneda: p.moneda || 'ARS', justificada: !!justificada, motivo: m || null }, { soloEmail: true });
      guardar(); return cargo;
    },
    anularAusencia(id) {
      const u = exigir('instructor', 'admin'); const r = db.reservas.find((x) => x.id === Number(id));
      if (!r || r.estado !== 'ausente') fail('La reserva no está marcada como ausente');
      if (u.rol === 'instructor' && r.instructor_id !== u.id) fail('Solo podés corregir tus propios vuelos');
      r.estado = 'pendiente'; delete r.ausencia;
      db.movimientos = db.movimientos.filter((m) => m.ref !== `aus:${r.id}`);
      guardar();
    },
    cancelarReservas(ids) {
      const u = yo(); loteLiberados = []; let total = 0;
      try { for (const id of ids || []) total += api.cancelarReserva(id); }
      finally { const l = loteLiberados; loteLiberados = null; if (l.length) { avisarLiberado(l, u); guardar(); } }
      return total;
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
      if (!instPuede(inst, 'teorica')) fail(`${nombre(inst)} no es instructor de teoría. Elegí otro instructor.`);
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
        sims_mes: comp.filter((r) => r.tipo === 'simulador').length, ausencias_mes: delMes.filter((r) => r.estado === 'ausente').length, clases_mes: clases.filter((c) => c.fecha.slice(0, 7) === mes && c.estado === 'dictada').length,
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
      return { ...pub(p), horas_centro: horas, horas_totales: (p.horas_previas || 0) + horas, reservas: res, veSyllabus, ausencias: res.filter((r) => r.estado === 'ausente' && !r.ausencia?.justificada).length };
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
      const desc = `${r.tipo === 'vuelo' ? 'Vuelo' : 'Simulador'} ${recurso(r.recurso_id).nombre} · ${String(h).replace('.', ',')} h${r.leccion ? ` · ${r.leccion}` : ''}`;
      const delPack = Math.min(h, Math.max(0, saldoHoras(r.piloto_id, r.tipo))); const aCobrar = r1(h - delPack);
      if (delPack > 0) movHoras(r.piloto_id, r.tipo, -delPack, desc, `res:${r.id}`, r.fecha);
      if (aCobrar > 0) movimiento(r.piloto_id, delPack > 0 ? `${desc} (${String(r1(delPack)).replace('.', ',')} h del pack, ${String(aCobrar).replace('.', ',')} h a cobrar)` : desc, 'cargo', aCobrar * db.tarifas[r.tipo], `res:${r.id}`, r.fecha);
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
        sinInstructor: db.usuarios.filter((u) => u.rol === 'instructor' && u.activo && !(db.disponibilidad[`${u.id}|${h}`] || []).length).map(pub), vence,
        tardesHoy: db.asistencia_inst.filter((a) => a.fecha === h && a.tarde).map((a) => ({ ...a, instructor: nombre(usuario(a.instructor_id)) })) };
    },
    todasReservas({ desde, hasta, tipo, estado } = {}) {
      exigir('admin');
      return db.reservas.filter((r) => (!desde || r.fecha >= desde) && (!hasta || r.fecha <= hasta) && (!tipo || r.tipo === tipo) && (!estado || r.estado === estado)).sort(ord).map(expandir);
    },
    usuarios(rol) { exigir('admin'); return db.usuarios.filter((u) => !rol || u.rol === rol).map(pub); },
    crearUsuario(datos) {
      exigir('admin');
      if (!['alumno', 'ppa', 'instructor', 'mecanico', 'admin'].includes(datos.rol)) fail('Elegí el tipo de usuario');
      if (['alumno', 'ppa'].includes(datos.rol) && !['ARS', 'USD'].includes(datos.moneda)) fail('Elegí la moneda del estado de cuenta (pesos o dólares)');
      if (datos.rol === 'admin' && !RANGOS.admin.includes(datos.rango)) fail('Elegí el rango del administrador (contabilidad o programador)');
      if (datos.rol === 'instructor' && !RANGOS.instructor.includes(datos.rango)) fail('Elegí el tipo de instructor (vuelo, teoría, simulador o sus combinaciones)');
      if (!String(datos.nacionalidad || '').trim()) fail('Elegí la nacionalidad');
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
  // ---------- cuenta de horas (packs) ----------
  const r1 = (x) => Math.round(x * 10) / 10;
  const saldoHoras = (uid, tipo) => r1(db.horas_mov.filter((m) => m.usuario_id === uid && m.tipo === tipo).reduce((s, m) => s + m.horas, 0));
  const movHoras = (usuario_id, tipo, horas, concepto, ref, fecha = hoy()) => {
    if (ref && db.horas_mov.some((m) => m.ref === ref)) return;
    db.horas_mov.push({ id: ++db.seq.hm, usuario_id, fecha, tipo, horas: r1(horas), concepto, ref });
  };
  const horasDe = (u) => {
    const saldo = { vuelo: 0, simulador: 0 };
    const movs = db.horas_mov.filter((m) => m.usuario_id === u.id).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
      .map((m) => { saldo[m.tipo] = r1(saldo[m.tipo] + m.horas); return { ...m, saldo: saldo[m.tipo] }; });
    const compradas = (t) => r1(movs.filter((m) => m.tipo === t && m.horas > 0).reduce((s, m) => s + m.horas, 0));
    const usadas = (t) => r1(-movs.filter((m) => m.tipo === t && m.horas < 0).reduce((s, m) => s + m.horas, 0));
    return { vuelo: saldo.vuelo, simulador: saldo.simulador, compradas: { vuelo: compradas('vuelo'), simulador: compradas('simulador') },
      usadas: { vuelo: usadas('vuelo'), simulador: usadas('simulador') }, movimientos: movs.reverse() };
  };
  const cuentaDe = (u) => {
    let saldo = 0, saldoUsd = 0; const t = tc();
    const movs = db.movimientos.filter((m) => m.usuario_id === u.id).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
      .map((m) => { const usd = m.usd ?? (t ? r2(m.importe / t) : 0); saldo += m.tipo === 'cargo' ? m.importe : -m.importe; saldoUsd = r2(saldoUsd + (m.tipo === 'cargo' ? usd : -usd));
        return { ...m, usd, saldo, saldo_usd: saldoUsd }; });
    const suma = (tipo, k) => movs.filter((m) => m.tipo === tipo).reduce((s, m) => s + m[k], 0);
    return { usuario: pub(u), movimientos: movs.reverse(), saldo, cargos: suma('cargo', 'importe'), pagos: suma('pago', 'importe'),
      saldo_usd: saldoUsd, cargos_usd: r2(suma('cargo', 'usd')), pagos_usd: r2(suma('pago', 'usd')), moneda: u.moneda || 'ARS',
      tarifas: { ...db.tarifas, tc: t }, cotizacion: db.config.cotizacion ? { ...db.config.cotizacion } : null, horas: horasDe(u) };
  };
  api.tarifas = () => { yo(); return { ...db.tarifas, tc: tc() }; };
  // montos que carga la administración: en pesos o en dólares
  const monto = (v) => { let s = String(v ?? '').trim().replace(/\s|\$|US/g, ''); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); return Number(s); };
  const enPesos = (valor, moneda) => {
    if (moneda !== 'USD') return { ars: Math.round(valor), usd: null };
    if (!tc()) fail('Todavía no hay cotización del dólar. Cargala en Cuentas → Cotización del dólar.');
    return { ars: Math.round(valor * tc()), usd: r2(valor) };
  };
  const fmtM = (valor, moneda) => moneda === 'USD' ? `US$ ${r2(valor).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : `$ ${Math.round(valor).toLocaleString('es-AR')}`;
  api.cotizacion = () => { yo(); return db.config.cotizacion ? { ...db.config.cotizacion, casa_elegida: db.config.cotizacion_casa || 'oficial' } : { casa_elegida: db.config.cotizacion_casa || 'oficial' }; };
  api.guardarCotizacion = ({ casa, manual }) => {
    exigirContable();
    if (casa === 'manual') {
      const v = monto(manual); if (!(v > 0)) fail('Ingresá el valor del dólar en pesos');
      db.config.cotizacion_casa = 'manual'; db.config.cotizacion = { venta: r2(v), compra: r2(v), casa: 'manual', fecha: ahora(), fuente: 'cargada a mano' }; congelarUsd();
    } else {
      if (!['oficial', 'bolsa', 'blue', 'tarjeta', 'mayorista'].includes(casa)) fail('Elegí el tipo de dólar');
      db.config.cotizacion_casa = casa;
    }
    guardar(); return api.cotizacion();
  };
  api._casaCotizacion = () => db.config.cotizacion_casa || 'oficial';
  api._cotizacion = () => (db.config.cotizacion ? { ...db.config.cotizacion, casa_elegida: db.config.cotizacion_casa || 'oficial' } : { casa_elegida: db.config.cotizacion_casa || 'oficial' });
  api._setCotizacion = ({ venta, compra, fecha, casa, fuente }) => {
    if ((db.config.cotizacion_casa || 'oficial') === 'manual' || !(Number(venta) > 0)) return;
    db.config.cotizacion = { venta: r2(Number(venta)), compra: r2(Number(compra) || Number(venta)), casa, fecha: fecha || ahora(), fuente }; congelarUsd(); guardar();
  };
  api.miCuenta = () => cuentaDe(exigir('alumno', 'ppa'));
  api.cuenta = (uid) => { exigirContable(); const u = usuario(uid); if (!u) fail('Usuario inexistente'); return cuentaDe(u); };
  api.cuentas = () => { exigirContable(); return db.usuarios.filter((u) => ['alumno', 'ppa'].includes(u.rol)).map((u) => { const c = cuentaDe(u); return { ...c.usuario, saldo: c.saldo, cargos: c.cargos, pagos: c.pagos, saldo_usd: c.saldo_usd, cargos_usd: c.cargos_usd, pagos_usd: c.pagos_usd, moneda: c.moneda, ultimo: c.movimientos[0]?.fecha || null, horas_vuelo: c.horas.vuelo, horas_sim: c.horas.simulador }; }); };
  api.registrarPago = (uid, { monto: valor, medio, fecha, nota, moneda }) => {
    exigirContable(); const u = usuario(uid); if (!u) fail('Usuario inexistente');
    const v = monto(valor); if (!(v > 0)) fail('Ingresá el monto del pago');
    const { ars, usd } = enPesos(v, moneda);
    movimiento(u.id, `Pago · ${medio || 'efectivo'}${moneda === 'USD' ? ` · ${fmtM(v, 'USD')}` : ''}${nota ? ` · ${String(nota).trim()}` : ''}`, 'pago', ars, `pago:${Date.now()}`, /^\d{4}-\d{2}-\d{2}$/.test(fecha || '') ? fecha : hoy(), usd);
    guardar();
  };
  const numero = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.'));
  api.venderPack = (uid, { tipo, horas, precio, pagado, medio, fecha, moneda }) => {
    exigirContable(); const u = usuario(uid); if (!u || !['alumno', 'ppa'].includes(u.rol)) fail('Elegí un alumno o piloto');
    if (!['vuelo', 'simulador'].includes(tipo)) fail('Elegí si el pack es de vuelo o de simulador');
    const h = r1(Number(String(horas).replace(',', '.'))); if (!(h > 0 && h <= 300)) fail('Indicá la cantidad de horas del pack (hasta 300)');
    const pv = monto(precio); if (!(pv >= 0)) fail('Revisá el precio del pack');
    const { ars: p, usd: pUsd } = enPesos(pv, moneda);
    const f = /^\d{4}-\d{2}-\d{2}$/.test(fecha || '') ? fecha : hoy();
    const lista = r1(h * db.tarifas[tipo]); const desc = lista > 0 ? Math.round((1 - p / lista) * 100) : 0;
    const nombrePack = `Pack de ${String(h).replace('.', ',')} h de ${tipo === 'vuelo' ? 'vuelo' : 'simulador'}`;
    const ref = `pack:${Date.now()}:${u.id}`;
    movHoras(u.id, tipo, h, nombrePack, ref, f);
    if (p > 0) movimiento(u.id, `${nombrePack}${desc > 0 ? ` (${desc}% de descuento)` : ''}`, 'cargo', p, ref, f, pUsd);
    if (pagado && p > 0) movimiento(u.id, `Pago · ${medio || 'efectivo'} · ${nombrePack.toLowerCase()}`, 'pago', p, `pago:${ref}`, f, pUsd);
    guardar(); return horasDe(u);
  };
  api.ajusteHoras = (uid, { tipo, horas, concepto }) => {
    exigirContable(); const u = usuario(uid); if (!u || !['alumno', 'ppa'].includes(u.rol)) fail('Elegí un alumno o piloto');
    if (!['vuelo', 'simulador'].includes(tipo)) fail('Elegí vuelo o simulador');
    const h = r1(Number(String(horas).replace(',', '.'))); if (!h) fail('Indicá las horas (en negativo para descontar)');
    if (!String(concepto || '').trim()) fail('Escribí el motivo del ajuste');
    if (saldoHoras(u.id, tipo) + h < 0) fail('El ajuste deja el saldo de horas en negativo');
    movHoras(u.id, tipo, h, String(concepto).trim(), `ajh:${Date.now()}`); guardar(); return horasDe(u);
  };
  api.ajusteCuenta = (uid, { monto: valor, concepto, tipo, moneda }) => {
    exigirContable(); const u = usuario(uid); if (!u) fail('Usuario inexistente');
    const v = monto(valor); if (!(v > 0) || !String(concepto || '').trim()) fail('Completá concepto y monto');
    const { ars, usd } = enPesos(v, moneda);
    movimiento(u.id, String(concepto).trim(), tipo === 'pago' ? 'pago' : 'cargo', ars, `ajuste:${Date.now()}`, hoy(), usd); guardar();
  };
  api.guardarTarifas = (t) => {
    exigirContable();
    const n = (v) => Math.round(Number(String(v).replace(/\./g, '').replace(',', '.')));
    const nt = { vuelo: n(t.vuelo), simulador: n(t.simulador), teorica: n(t.teorica), recargo: Number(t.recargo), horas_aviso: Number(t.horas_aviso), ausencia: Number(t.ausencia ?? db.tarifas.ausencia ?? 100) };
    if (nt.recargo > 100 || nt.ausencia > 100) fail('Los porcentajes no pueden superar el 100%');
    if (Object.values(nt).some((v) => !(v >= 0)) || !nt.vuelo) fail('Revisá los valores de las tarifas');
    db.tarifas = nt; guardar();
  };

  // ---------- avisos ----------
  // recordatorio de deuda: una vez por día a cada alumno o piloto con saldo a pagar
  api.recordatoriosDeuda = () => {
    let n = 0;
    for (const u of db.usuarios.filter((x) => x.activo && ['alumno', 'ppa'].includes(x.rol))) {
      const c = cuentaDe(u);
      if ((c.moneda === 'USD' ? c.saldo_usd : c.saldo) <= 0.009) continue;
      if (db.notificaciones.some((x) => x.usuario_id === u.id && x.tipo === 'deuda' && x.dia === hoy())) continue;
      n += notificar(u, 'deuda', { saldo: c.saldo, saldo_usd: c.saldo_usd, moneda: c.moneda, ultimos: c.movimientos.filter((m) => m.tipo === 'cargo').slice(0, 4), tarifas: c.tarifas });
    }
    if (n) guardar();
    return n;
  };
  api.enviarRecordatoriosAhora = () => { exigirContable(); return api.recordatoriosDeuda(); };
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
  // ---------- asistencia de instructores ----------
  // el instructor escanea el mismo QR al llegar; si llega después de su primer turno (más la tolerancia) queda como tarde
  const actividadesInst = (id, f) => [
    ...db.reservas.filter((r) => r.instructor_id === id && r.fecha === f && r.estado !== 'cancelado').map((r) => ({ tipo: r.tipo, bloque: r.bloque, recurso: recurso(r.recurso_id)?.nombre || '', con: nombre(usuario(r.piloto_id)), rid: r.id })),
    ...db.clases.filter((c) => c.instructor_id === id && c.fecha === f && c.estado !== 'cancelada').map((c) => ({ tipo: 'teorica', bloque: c.bloque, recurso: c.aula, titulo: `${c.teo} · ${LECCIONES[c.teo]?.titulo || ''}` })),
  ].sort((a, b) => a.bloque - b.bloque);
  function llegadaInstructor(u, h, min, hora) {
    const acts = actividadesInst(u.id, h);
    if (!acts.length) fail('Hoy no tenés vuelos, simuladores ni clases asignados.');
    const ya = db.asistencia_inst.find((a) => a.instructor_id === u.id && a.fecha === h);
    const items = acts.map(({ rid, ...a }) => a);
    if (ya) return { instructor: true, ya: true, nombre: u.nombre, ...ya, items };
    const primer = acts[0].bloque;
    if (min < primer * 60 - 90) fail(`Podés registrar tu llegada desde 1 h 30 min antes de tu primer turno (${hh(primer)}).`);
    const minutos = Math.max(0, min - primer * 60); const tol = db.config.tolerancia_inst ?? 10;
    const reg = { id: ++db.seq.ai, instructor_id: u.id, fecha: h, hora, primer_bloque: primer, tarde: minutos > tol, minutos_tarde: minutos };
    db.asistencia_inst.push(reg);
    for (const a of acts) if (a.rid) { const r = db.reservas.find((x) => x.id === a.rid); if (r) r.llegada_instructor = hora; }
    if (reg.tarde) for (const ad of db.usuarios.filter((x) => x.rol === 'admin' && x.activo))
      notificar(ad, 'instructor_tarde', { instructor: nombre(u), fecha: h, hora, primer_bloque: primer, minutos, actividades: items }, { soloEmail: true });
    guardar();
    return { instructor: true, ya: false, nombre: u.nombre, ...reg, items, tolerancia: tol };
  }
  // historial: cada día con actividad asignada, con la llegada registrada (a tiempo o tarde) o sin registro
  function historialInstructor(id, dias = 60) {
    const h = hoy(); const desde = dia(-dias); const fechas = new Set();
    for (const r of db.reservas) if (r.instructor_id === id && r.estado !== 'cancelado' && r.fecha >= desde && r.fecha <= h) fechas.add(r.fecha);
    for (const c of db.clases) if (c.instructor_id === id && c.estado !== 'cancelada' && c.fecha >= desde && c.fecha <= h) fechas.add(c.fecha);
    for (const a of db.asistencia_inst) if (a.instructor_id === id && a.fecha >= desde) fechas.add(a.fecha);
    const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes(); const tol = db.config.tolerancia_inst ?? 10;
    const filas = [...fechas].sort().reverse().map((f) => {
      const reg = db.asistencia_inst.find((a) => a.instructor_id === id && a.fecha === f);
      const acts = actividadesInst(id, f); const primer = reg?.primer_bloque ?? acts[0]?.bloque;
      if (reg) return { fecha: f, estado: reg.tarde ? 'tarde' : 'a_tiempo', hora: reg.hora, primer_bloque: primer, minutos_tarde: reg.minutos_tarde, actividades: acts.length };
      if (f === h && (primer == null || ahoraMin <= primer * 60 + tol)) return null; // hoy todavía está a tiempo
      return { fecha: f, estado: 'sin_registro', hora: null, primer_bloque: primer, minutos_tarde: null, actividades: acts.length };
    }).filter(Boolean);
    return { filas, a_tiempo: filas.filter((x) => x.estado === 'a_tiempo').length, tarde: filas.filter((x) => x.estado === 'tarde').length, sin_registro: filas.filter((x) => x.estado === 'sin_registro').length, tolerancia: tol };
  }
  api.miAsistencia = () => { const u = exigir('instructor'); return historialInstructor(u.id); };
  api.asistenciaInstructores = () => {
    exigir('admin');
    return db.usuarios.filter((u) => u.rol === 'instructor' && u.activo).map((u) => ({ ...pub(u), ...historialInstructor(u.id) }));
  };
  api.asistenciaDeInstructor = (id) => { exigir('admin'); const u = usuario(id); if (!u || u.rol !== 'instructor') fail('Instructor no encontrado'); return { ...pub(u), ...historialInstructor(u.id, 365) }; };
  api.guardarTolerancia = (min) => { exigir('admin'); const n = Math.round(Number(min)); if (!(n >= 0 && n <= 60)) fail('La tolerancia tiene que estar entre 0 y 60 minutos'); db.config.tolerancia_inst = n; guardar(); return n; };
  api.registrarLlegada = (codigo, pos) => {
    const u = exigir('alumno', 'ppa', 'instructor');
    if (String(codigo || '') !== db.config.qr) fail('Este QR no es válido. Escaneá el QR de asistencia que está en la escuela.');
    if (!navegador && opts.exigirUbicacion !== false) {
      if (!pos || pos.lat == null) fail('Para registrar tu llegada necesitamos la ubicación del celular. Activala y volvé a escanear el QR.');
      const m = distancia(db.config.lat, db.config.lon, Number(pos.lat), Number(pos.lon));
      if (m > db.config.radio + Math.min(Number(pos.precision) || 0, 300)) fail(`Estás a ${(m / 1000).toFixed(1).replace('.', ',')} km de la escuela. La llegada se registra solo estando en el aeródromo.`);
    }
    const h = hoy(); const ahoraH = new Date(); const min = ahoraH.getHours() * 60 + ahoraH.getMinutes();
    const enVentana = (b) => min >= b * 60 - 90 && min < (b + 2) * 60; // desde 1 h 30 antes hasta el final del bloque
    const hora = `${String(ahoraH.getHours()).padStart(2, '0')}:${String(ahoraH.getMinutes()).padStart(2, '0')}`;
    if (u.rol === 'instructor') return llegadaInstructor(u, h, min, hora);
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
    const antes = habDe(u);
    u.hab = { ...antes, solo: !!h.solo, sim_solo: !!h.sim_solo, travesia: !!h.travesia,
      aeronaves: Array.isArray(h.aeronaves) ? [...new Set(h.aeronaves.map(Number))].filter((x) => ids.has(x)) : null };
    if (u.rol === 'ppa' && 'bristell' in h && !!h.bristell !== antes.bristell) marcarBristell(u, !!h.bristell, yo());
    guardar(); return pub(u);
  };
  function marcarBristell(u, valor, quien) {
    u.hab = { ...habDe(u), bristell: valor, bristell_por: valor ? nombre(quien) : null, bristell_fecha: valor ? hoy() : null };
  }
  // adaptación a Bristell: solo para pilotos PPA; la pueden dar o quitar la administración y los instructores
  api.adaptacionBristell = (uid, valor) => {
    const me = exigir('admin', 'instructor'); const u = usuario(uid);
    if (!u || u.rol !== 'ppa') fail('La adaptación a Bristell es solo para pilotos PPA');
    marcarBristell(u, !!valor, me); guardar(); return pub(u);
  };
  api.pilotosPPA = () => { exigir('admin', 'instructor'); return db.usuarios.filter((u) => u.rol === 'ppa' && u.activo).map(pub).sort((a, b) => a.apellido.localeCompare(b.apellido)); };
  // ---------- campus: materiales, trabajos prácticos y entregas ----------
  const DOCENTES = ['instructor', 'admin'];
  // teoría por clase (TEO 1 a 8); simulador y vuelo son una sección cada uno
  const leccionValida = (l) => ['GENERAL', 'SIMULADOR', 'VUELO'].includes(l) || LECCIONES[l]?.track === 'teorica';
  const MAX_ARCHIVO = () => (navegador ? 2 : 20) * 1024 * 1024;
  function guardarArchivo(archivo, autor, ambito) {
    if (!archivo || !archivo.data) return null;
    if (Number(archivo.tam) > MAX_ARCHIVO()) fail(`El archivo supera los ${MAX_ARCHIVO() / 1048576} MB permitidos${navegador ? ' en la demo' : ''}.`);
    const okTipo = /^(application\/pdf|image\/(png|jpe?g|gif|webp)|application\/(msword|vnd\.openxmlformats|vnd\.ms-)|text\/plain|application\/zip)/.test(archivo.tipo || '')
      || /\.(pdf|docx?|pptx?|xlsx?|jpe?g|png|gif|webp|txt|zip)$/i.test(archivo.nombre || '');
    if (!okTipo) fail('Formato no permitido. Subí PDF, Word, PowerPoint, Excel, imagen, texto o ZIP.');
    const id = ++db.seq.ar;
    const meta = { id, nombre: String(archivo.nombre || 'archivo').slice(0, 140), tam: Number(archivo.tam) || 0, tipo: String(archivo.tipo || 'application/octet-stream').slice(0, 100), autor_id: autor.id, fecha: ahora(), ambito };
    if (opts.archivos) opts.archivos.guardar(id, archivo.data); else meta.data = archivo.data;
    db.archivos.push(meta); return id;
  }
  function borrarArchivo(id) {
    if (!id) return; db.archivos = db.archivos.filter((a) => a.id !== id); if (opts.archivos) opts.archivos.borrar(id);
  }
  const metaArchivo = (id) => { const a = db.archivos.find((x) => x.id === id); if (!a) return null; const { data, ...m } = a; return m; };
  const puedeVerArchivo = (me, a) => a && (a.ambito === 'foto' || a.ambito === 'material' || a.ambito === 'tp' || a.ambito === `entrega:${me.id}` || DOCENTES.includes(me.rol));
  const conAutor = (x) => ({ ...x, autor: nombre(usuario(x.autor_id)), archivo: metaArchivo(x.archivo_id) });

  api.campusResumen = () => {
    yo(); const r = {};
    for (const m of db.materiales) { r[m.leccion] = r[m.leccion] || { materiales: 0, tps: 0 }; r[m.leccion].materiales++; }
    for (const t of db.tps) { r[t.leccion] = r[t.leccion] || { materiales: 0, tps: 0 }; r[t.leccion].tps++; }
    return r;
  };
  api.materiales = (leccion) => { yo(); return db.materiales.filter((m) => !leccion || m.leccion === leccion).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id).map(conAutor); };
  api.guardarMaterial = (d) => {
    const me = exigir(...DOCENTES);
    if (!leccionValida(d.leccion)) fail('Elegí la lección del syllabus');
    if (!String(d.titulo || '').trim()) fail('Poné un título');
    if (!['archivo', 'video', 'link', 'texto'].includes(d.tipo)) fail('Elegí el tipo de material');
    const url = String(d.url || '').trim();
    if (['video', 'link'].includes(d.tipo) && !/^https:\/\/\S+$/i.test(url)) fail('Pegá un link que empiece con https://');
    if (d.tipo === 'texto' && !String(d.texto || '').trim()) fail('Escribí el contenido');
    let m = d.id ? db.materiales.find((x) => x.id === Number(d.id)) : null;
    if (d.id && !m) fail('Material no encontrado');
    if (d.tipo === 'archivo' && !d.archivo && !m?.archivo_id) fail('Elegí el archivo');
    const nuevoArchivo = d.tipo === 'archivo' && d.archivo ? guardarArchivo(d.archivo, me, 'material') : null;
    if (!m) { m = { id: ++db.seq.mat, autor_id: me.id, archivo_id: null }; db.materiales.push(m); }
    if (nuevoArchivo || d.tipo !== 'archivo') { borrarArchivo(m.archivo_id); m.archivo_id = nuevoArchivo; }
    Object.assign(m, { leccion: d.leccion, titulo: String(d.titulo).trim().slice(0, 140), tipo: d.tipo, descripcion: String(d.descripcion || '').trim().slice(0, 600),
      url: ['video', 'link'].includes(d.tipo) ? url.slice(0, 500) : '', texto: d.tipo === 'texto' ? String(d.texto).trim().slice(0, 20000) : '', fecha: ahora() });
    guardar(); return conAutor(m);
  };
  api.borrarMaterial = (id) => { exigir(...DOCENTES); const m = db.materiales.find((x) => x.id === Number(id)); if (!m) fail('Material no encontrado'); borrarArchivo(m.archivo_id); db.materiales = db.materiales.filter((x) => x !== m); guardar(); };

  const estadoEntrega = (t, e) => e ? e.estado : (t.fecha_limite && t.fecha_limite < hoy() ? 'vencido' : 'pendiente');
  api.trabajos = (leccion) => {
    const me = yo();
    const l = db.tps.filter((t) => !leccion || t.leccion === leccion).sort((a, b) => (a.fecha_limite || '9999').localeCompare(b.fecha_limite || '9999') || b.id - a.id);
    if (me.rol === 'alumno') return l.map((t) => { const e = db.entregas.find((x) => x.tp_id === t.id && x.alumno_id === me.id);
      return { ...conAutor(t), entrega: e ? { ...e, archivo: metaArchivo(e.archivo_id), corrector: nombre(usuario(e.corrector_id)) } : null, estado: estadoEntrega(t, e) }; });
    if (DOCENTES.includes(me.rol)) return l.map((t) => { const es = db.entregas.filter((x) => x.tp_id === t.id);
      return { ...conAutor(t), entregas: es.length, sin_corregir: es.filter((x) => x.estado === 'entregado').length }; });
    return [];
  };
  api.guardarTP = (d) => {
    const me = exigir(...DOCENTES);
    if (!leccionValida(d.leccion)) fail('Elegí la lección del syllabus');
    if (!String(d.titulo || '').trim() || !String(d.consigna || '').trim()) fail('Completá el título y la consigna');
    if (d.fecha_limite && !/^\d{4}-\d{2}-\d{2}$/.test(d.fecha_limite)) fail('Fecha límite inválida');
    let t = d.id ? db.tps.find((x) => x.id === Number(d.id)) : null;
    const nuevo = !t;
    const adj = d.archivo ? guardarArchivo(d.archivo, me, 'tp') : null;
    if (!t) { t = { id: ++db.seq.tp, autor_id: me.id, archivo_id: null, fecha: ahora() }; db.tps.push(t); }
    if (adj) { borrarArchivo(t.archivo_id); t.archivo_id = adj; }
    Object.assign(t, { leccion: d.leccion, titulo: String(d.titulo).trim().slice(0, 140), consigna: String(d.consigna).trim().slice(0, 20000), fecha_limite: d.fecha_limite || null });
    if (nuevo) for (const a of db.usuarios.filter((x) => x.rol === 'alumno' && x.activo)) notificar(a, 'tp_nuevo', { tp: { titulo: t.titulo, leccion: t.leccion, fecha_limite: t.fecha_limite } }, { soloEmail: true });
    guardar(); return conAutor(t);
  };
  api.borrarTP = (id) => {
    exigir(...DOCENTES); const t = db.tps.find((x) => x.id === Number(id)); if (!t) fail('Trabajo no encontrado');
    if (db.entregas.some((e) => e.tp_id === t.id)) fail('Este trabajo ya tiene entregas, no se puede borrar.');
    borrarArchivo(t.archivo_id); db.tps = db.tps.filter((x) => x !== t); guardar();
  };
  api.entregarTP = (tpId, { texto, archivo }) => {
    const me = exigir('alumno'); const t = db.tps.find((x) => x.id === Number(tpId)); if (!t) fail('Trabajo no encontrado');
    if (!String(texto || '').trim() && !archivo) fail('Escribí tu respuesta o adjuntá un archivo');
    let e = db.entregas.find((x) => x.tp_id === t.id && x.alumno_id === me.id);
    if (e && e.estado === 'aprobado') fail('Este trabajo ya está aprobado');
    const adj = archivo ? guardarArchivo(archivo, me, `entrega:${me.id}`) : null;
    if (!e) { e = { id: ++db.seq.en, tp_id: t.id, alumno_id: me.id, archivo_id: null }; db.entregas.push(e); }
    if (adj) { borrarArchivo(e.archivo_id); e.archivo_id = adj; }
    Object.assign(e, { texto: String(texto || '').trim().slice(0, 20000), fecha: ahora(), tardia: !!(t.fecha_limite && t.fecha_limite < hoy()), estado: 'entregado', nota: null, comentario: e.comentario || null });
    guardar(); return { ...e, archivo: metaArchivo(e.archivo_id) };
  };
  api.entregasDeTP = (tpId) => {
    exigir(...DOCENTES); const t = db.tps.find((x) => x.id === Number(tpId)); if (!t) fail('Trabajo no encontrado');
    return db.usuarios.filter((u) => u.rol === 'alumno' && u.activo).map((u) => { const e = db.entregas.find((x) => x.tp_id === t.id && x.alumno_id === u.id);
      return { alumno_id: u.id, alumno: nombre(u), entrega: e ? { ...e, archivo: metaArchivo(e.archivo_id), corrector: nombre(usuario(e.corrector_id)) } : null, estado: estadoEntrega(t, e) }; })
      .sort((a, b) => ['entregado', 'rehacer', 'aprobado', 'pendiente', 'vencido'].indexOf(a.estado) - ['entregado', 'rehacer', 'aprobado', 'pendiente', 'vencido'].indexOf(b.estado));
  };
  api.corregirEntrega = (id, { estado, nota, comentario }) => {
    const me = exigir(...DOCENTES); const e = db.entregas.find((x) => x.id === Number(id)); if (!e) fail('Entrega no encontrada');
    if (!['aprobado', 'rehacer'].includes(estado)) fail('Elegí si está aprobado o hay que rehacerlo');
    const n = nota === '' || nota == null ? null : Number(nota);
    if (n != null && !(Number.isInteger(n) && n >= 1 && n <= 10)) fail('La nota tiene que ser un número del 1 al 10');
    Object.assign(e, { estado, nota: n, comentario: String(comentario || '').trim().slice(0, 4000) || null, corrector_id: me.id, fecha_correccion: ahora() });
    const t = db.tps.find((x) => x.id === e.tp_id); const al = usuario(e.alumno_id);
    if (al) notificar(al, 'correccion', { tp: { titulo: t.titulo, leccion: t.leccion }, estado, nota: n, comentario: e.comentario, corrector: nombre(me) }, { soloEmail: true });
    guardar(); return e;
  };
  // en la demo los archivos viven en el navegador; en el servidor se descargan por /api/archivo/:id
  api.archivo = (id) => { const me = yo(); const a = db.archivos.find((x) => x.id === Number(id)); if (!puedeVerArchivo(me, a)) fail('Archivo no disponible'); return a; };
  api._archivoPermitido = (id) => { const me = yo(); const a = db.archivos.find((x) => x.id === Number(id)); return puedeVerArchivo(me, a) ? metaArchivo(a.id) : null; };
  // ---------- foro de consultas ----------
  const EN_FORO = ['alumno', 'ppa', 'instructor', 'admin'];
  const autorForo = (id) => { const u = usuario(id); return u ? { autor: nombre(u), autor_rol: u.rol, autor_foto: fotoUrl(u) } : { autor: 'Usuario eliminado', autor_rol: '' }; };
  const textoForo = (t, min, max, que) => { t = String(t || '').trim(); if (t.length < min) fail(`${que} es muy corto`); if (t.length > max) fail(`${que} es muy largo (máximo ${max} caracteres)`); return t; };
  const temaPub = (t) => { const rs = db.foro_respuestas.filter((r) => r.tema_id === t.id);
    return { ...t, ...autorForo(t.autor_id), respuestas: rs.length, responde_instructor: rs.some((r) => DOCENTES.includes(usuario(r.autor_id)?.rol)) }; };
  api.foroTemas = ({ seccion, q, filtro } = {}) => {
    exigir(...EN_FORO); const b = String(q || '').trim().toLowerCase();
    return db.foro_temas.filter((t) => (!seccion || t.seccion === seccion)
      && (!b || `${t.titulo} ${t.cuerpo} ${db.foro_respuestas.filter((r) => r.tema_id === t.id).map((r) => r.cuerpo).join(' ')}`.toLowerCase().includes(b)))
      .map(temaPub).filter((t) => !filtro || (filtro === 'sin_respuesta' ? !t.respuestas && !t.fijado : filtro === 'resueltas' ? t.resuelto : true))
      .sort((a, b2) => (b2.fijado - a.fijado) || b2.actividad.localeCompare(a.actividad));
  };
  api.foroTema = (id) => {
    const me = exigir(...EN_FORO); const t = db.foro_temas.find((x) => x.id === Number(id)); if (!t) fail('La consulta ya no existe');
    const rs = db.foro_respuestas.filter((r) => r.tema_id === t.id).sort((a, b) => (b.mejor - a.mejor) || a.fecha.localeCompare(b.fecha) || a.id - b.id)
      .map((r) => ({ ...r, ...autorForo(r.autor_id), mia: r.autor_id === me.id }));
    return { ...temaPub(t), mio: t.autor_id === me.id, puede_moderar: DOCENTES.includes(me.rol), puede_destacar: t.autor_id === me.id || DOCENTES.includes(me.rol), respuestas_lista: rs };
  };
  api.foroCrearTema = ({ titulo, cuerpo, seccion }) => {
    const me = exigir(...EN_FORO);
    if (!leccionValida(seccion)) fail('Elegí la sección');
    const t = { id: ++db.seq.ft, autor_id: me.id, titulo: textoForo(titulo, 5, 140, 'El título'), cuerpo: textoForo(cuerpo, 2, 8000, 'El texto de la consulta'), seccion, fecha: ahora(), actividad: ahora(), resuelto: false, fijado: false };
    db.foro_temas.push(t); guardar(); return temaPub(t);
  };
  api.foroResponder = (temaId, cuerpo) => {
    const me = exigir(...EN_FORO); const t = db.foro_temas.find((x) => x.id === Number(temaId)); if (!t) fail('La consulta ya no existe');
    const r = { id: ++db.seq.fr, tema_id: t.id, autor_id: me.id, cuerpo: textoForo(cuerpo, 2, 8000, 'El texto de la respuesta'), fecha: ahora(), mejor: false };
    db.foro_respuestas.push(r); t.actividad = r.fecha;
    const autor = usuario(t.autor_id);
    if (autor && autor.id !== me.id && autor.activo) notificar(autor, 'foro_respuesta', { tema: { titulo: t.titulo }, quien: nombre(me), docente: DOCENTES.includes(me.rol), texto: r.cuerpo.slice(0, 400) }, { soloEmail: true });
    guardar(); return r;
  };
  api.foroEditar = (tipo, id, { titulo, cuerpo }) => {
    const me = exigir(...EN_FORO);
    const x = (tipo === 'tema' ? db.foro_temas : db.foro_respuestas).find((y) => y.id === Number(id)); if (!x) fail('El mensaje ya no existe');
    if (x.autor_id !== me.id) fail('Solo podés editar tus propios mensajes');
    if (tipo === 'tema') x.titulo = textoForo(titulo, 5, 140, 'El título');
    x.cuerpo = textoForo(cuerpo, 2, 8000, 'El mensaje'); x.editado = ahora(); guardar();
  };
  api.foroBorrar = (tipo, id) => {
    const me = exigir(...EN_FORO);
    const lista = tipo === 'tema' ? db.foro_temas : db.foro_respuestas; const x = lista.find((y) => y.id === Number(id)); if (!x) fail('El mensaje ya no existe');
    if (x.autor_id !== me.id && !DOCENTES.includes(me.rol)) fail('Solo podés borrar tus propios mensajes');
    if (tipo === 'tema') { db.foro_temas = db.foro_temas.filter((y) => y !== x); db.foro_respuestas = db.foro_respuestas.filter((r) => r.tema_id !== x.id); }
    else { db.foro_respuestas = db.foro_respuestas.filter((y) => y !== x); const t = db.foro_temas.find((y) => y.id === x.tema_id); if (t) t.resuelto = db.foro_respuestas.some((r) => r.tema_id === t.id && r.mejor); }
    guardar();
  };
  api.foroDestacar = (respId) => {
    const me = exigir(...EN_FORO); const r = db.foro_respuestas.find((x) => x.id === Number(respId)); if (!r) fail('La respuesta ya no existe');
    const t = db.foro_temas.find((x) => x.id === r.tema_id);
    if (t.autor_id !== me.id && !DOCENTES.includes(me.rol)) fail('Solo quien preguntó o un instructor puede destacar una respuesta');
    r.mejor = !r.mejor; t.resuelto = db.foro_respuestas.some((x) => x.tema_id === t.id && x.mejor); guardar(); return r.mejor;
  };
  api.foroFijar = (temaId) => { exigir(...DOCENTES); const t = db.foro_temas.find((x) => x.id === Number(temaId)); if (!t) fail('La consulta ya no existe'); t.fijado = !t.fijado; guardar(); return t.fijado; };
  api.subirFoto = (foto) => {
    const u = yo();
    if (!foto || !/^data:image\/(jpeg|png|webp);base64,/.test(String(foto.data || ''))) fail('Elegí una foto (JPG o PNG)');
    if (String(foto.data).length > 1.5 * 1024 * 1024) fail('La foto es muy pesada. Probá con otra.');
    const anterior = u.foto;
    u.foto = guardarArchivo({ nombre: `foto-${u.id}.jpg`, tam: Math.round(foto.data.length * 0.75), tipo: 'image/jpeg', data: foto.data }, u, 'foto');
    if (anterior) borrarArchivo(anterior);
    guardar(); return pub(u);
  };
  api.misNotificaciones = () => { const u = yo(); return db.notificaciones.filter((x) => x.usuario_id === u.id).sort((a, b) => b.id - a.id); };
  api.notificaciones = ({ dia } = {}) => { const me = exigir('admin'); const contable = rangoDe(me) === 'contabilidad'; return db.notificaciones.filter((x) => (contable || x.tipo !== 'deuda') && (!dia || x.dia === dia)).sort((a, b) => b.id - a.id); };
  api.ultimasDeReserva = () => { const u = yo(); const l = db.notificaciones.filter((x) => x.usuario_id === u.id && ['reserva', 'clase'].includes(x.tipo)); const ult = l.at(-1); return ult ? l.filter((x) => x.fecha === ult.fecha && x.tipo === ult.tipo) : []; };
  api.guardarPreferencias = ({ email, whatsapp, liberados }) => { const u = yo(); u.notif = { email: !!email, whatsapp: !!whatsapp, liberados: liberados !== false }; guardar(); return pub(u); };
  // ---------- uso interno del servidor (no se exponen a la interfaz) ----------
  api._como = (id) => { sesion = id || null; };
  api._sesion = () => sesion;
  api._metaDocumento = (uid, tipo) => { const me = yo(); if (me.id !== Number(uid) && !['instructor', 'admin'].includes(me.rol)) return null; return usuario(uid)?.docs[tipo] || null; };
  api._marcarNotificacion = (id, estado, detalle) => { const n = db.notificaciones.find((x) => x.id === id); if (n) { n.estado = estado; n.detalle = detalle || null; guardar(); } };
  api._pendientes = () => db.notificaciones.filter((n) => n.estado === 'pendiente');
  return api;
}
if (typeof module !== 'undefined') module.exports = { crearStore };
