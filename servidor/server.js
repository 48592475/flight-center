/* Flight Center · servidor
   Sirve la página, guarda los datos, envía los avisos y consulta METAR, TAF y NOTAM. */
process.env.TZ = process.env.TZ || 'America/Argentina/Buenos_Aires';
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');
const { crearStore } = require('./nucleo');
const persistencia = require('./persistencia');
const avisos = require('./avisos');
const meteo = require('./meteo');
const asistente = require('./asistente');

const PORT = Number(process.env.PORT || 3000);
const PRODUCCION = process.env.NODE_ENV === 'production';

(async () => {
  await persistencia.iniciar();
  const inicial = await persistencia.cargar();

  const Store = crearStore({
    cargar: () => inicial,
    guardar: persistencia.guardar,
    produccion: process.env.DEMO !== '1',
    adminInicial: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, nombre: process.env.ADMIN_NOMBRE, apellido: process.env.ADMIN_APELLIDO },
    hashPass: (p) => bcrypt.hashSync(String(p), 10),
    // acepta contraseñas sin cifrar de datos viejos y las de bcrypt
    verificarPass: (p, h) => (String(h || '').startsWith('$2') ? bcrypt.compareSync(String(p), h) : String(p) === h),
    docs: persistencia.docs,
    archivos: persistencia.archivos,
    alNotificar: (n) => avisos.enviar(Store, n),
  });

  // métodos que la página puede llamar
  const NO_EXPUESTOS = new Set(['reiniciar', 'recordatoriosDeuda', 'login', 'logout', 'documento', 'BLOQUES', 'LECCIONES', 'TRACKS', 'itemKeys', 'hoy', 'dia', 'OPR']);
  const PERMITIDOS = new Set(Object.keys(Store).filter((k) => typeof Store[k] === 'function' && !k.startsWith('_') && !NO_EXPUESTOS.has(k)));

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'SAMEORIGIN' });
    if (PRODUCCION && req.headers['x-forwarded-proto'] === 'http') return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    next();
  });
  app.use(express.json({ limit: '40mb' }));
  app.use(cookieSession({
    name: 'fc_sesion', keys: [process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex')],
    maxAge: 12 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax', secure: PRODUCCION,
  }));

  // límite de intentos de inicio de sesión por IP
  const intentos = new Map();
  const bloqueado = (ip) => { const x = intentos.get(ip); return x && x.n >= 10 && Date.now() - x.t < 15 * 60 * 1000; };
  const fallo = (ip) => { const x = intentos.get(ip); intentos.set(ip, !x || Date.now() - x.t > 15 * 60 * 1000 ? { n: 1, t: Date.now() } : { n: x.n + 1, t: x.t }); };

  app.get('/api/salud', (req, res) => res.json({ ok: true, email: avisos.emailListo(), whatsapp: avisos.whatsappListo() }));

  // Tarea diaria para hostings gratuitos que apagan el servidor cuando no se usa:
  // un servicio externo (por ejemplo cron-job.org) llama a esta dirección a las 9:00.
  // Si hoy ya se enviaron los recordatorios, no se repiten.
  app.get('/api/tareas/diarias', (req, res) => {
    const token = process.env.CRON_TOKEN;
    const dado = String(req.query.token || '');
    if (!token || dado.length !== token.length || !crypto.timingSafeEqual(Buffer.from(dado), Buffer.from(token))) return res.status(403).json({ error: 'No autorizado' });
    try { const n = Store.recordatoriosDeuda(); console.log('Recordatorios de deuda (tarea diaria):', n); res.json({ ok: true, recordatorios: n }); } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/rpc', async (req, res) => {
    const { m, a = [] } = req.body || {};
    const args = Array.isArray(a) ? a : [];
    const uid = req.session?.uid || null;
    try {
      if (m === 'login') {
        if (bloqueado(req.ip)) return res.status(429).json({ error: 'Demasiados intentos. Esperá 15 minutos y probá de nuevo.' });
        try { const u = Store.login(args[0], args[1]); req.session.uid = u.id; intentos.delete(req.ip); return res.json({ r: u }); } catch (e) { fallo(req.ip); throw e; }
      }
      if (m === 'logout') { req.session = null; return res.json({ r: null }); }
      if (m !== 'yo' && !uid) return res.status(401).json({ error: 'Sesión no iniciada' });
      if (m === 'documento') {
        Store._como(uid); const meta = Store._metaDocumento(args[0], args[1]); Store._como(null);
        if (!meta) return res.json({ r: null });
        const data = await persistencia.docs.leer(Number(args[0]), String(args[1]));
        return res.json({ r: data ? { ...meta, data } : null });
      }
      if (!PERMITIDOS.has(m)) return res.status(404).json({ error: 'Acción desconocida' });
      Store._como(uid);
      const r = Store[m](...args);
      if (m === 'yo' && !r && uid) req.session = null;
      return res.json({ r: r === undefined ? null : r });
    } catch (e) {
      const msg = e && e.message ? e.message : 'Error interno';
      if (!(e instanceof Error) || /is not a function|undefined|null/.test(msg)) console.error(m, e);
      return res.status(msg === 'Sesión no iniciada' ? 401 : 400).json({ error: msg });
    } finally { Store._como(null); }
  });

  // archivos del campus: solo con sesión y si la persona tiene permiso para verlos
  app.get('/api/archivo/:id', async (req, res) => {
    const uid = req.session?.uid;
    if (!uid) return res.status(401).send('Iniciá sesión para ver este archivo.');
    let meta = null;
    try { Store._como(uid); meta = Store._archivoPermitido(Number(req.params.id)); } catch { meta = null; } finally { Store._como(null); }
    if (!meta) return res.status(404).send('Archivo no disponible.');
    const buf = await persistencia.archivos.leer(meta.id);
    if (!buf) return res.status(404).send('Archivo no disponible.');
    const inline = /^(application\/pdf|image\/|text\/plain)/.test(meta.tipo);
    res.set({ 'Content-Type': meta.tipo || 'application/octet-stream', 'Content-Length': buf.length, 'Cache-Control': 'private, max-age=300',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(meta.nombre)}` });
    res.send(buf);
  });

  // asistente de IA del campus
  const contextoAsistente = (uid, leccion) => {
    Store._como(uid);
    try {
      const u = Store.yo(); if (!u) return null;
      const lecs = u.rol === 'alumno' ? ['teorica', 'vuelo', 'simulador'].map((t) => ({ ...Store.leccionActual(u.id, t), track: t })).filter((l) => l.id) : [];
      if (leccion && Store.LECCIONES[leccion]) lecs.unshift({ ...Store.LECCIONES[leccion], track: Store.LECCIONES[leccion].track, consulta: true });
      return { usuario: u, lecciones: lecs };
    } finally { Store._como(null); }
  };
  app.get('/api/asistente/estado', (req, res) => {
    const uid = req.session?.uid; if (!uid) return res.status(401).json({ error: 'Sesión no iniciada' });
    res.json({ activo: asistente.activo(), limite: asistente.LIMITE_DIARIO, ...asistente.cupo(uid) });
  });
  app.post('/api/asistente', async (req, res) => {
    const uid = req.session?.uid; if (!uid) return res.status(401).json({ error: 'Sesión no iniciada' });
    const ctx = contextoAsistente(uid, req.body?.leccion);
    if (!ctx || !['alumno', 'ppa', 'instructor', 'admin'].includes(ctx.usuario.rol)) return res.status(403).json({ error: 'Sin permiso' });
    await asistente.responder({ ...ctx, mensajes: req.body?.mensajes }, res);
  });

  app.get('/api/meteo', async (req, res) => {
    if (!req.session?.uid) return res.status(401).json({ error: 'Sesión no iniciada' });
    try { res.json(await meteo.consultar(req.query.id)); } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // errores al leer el pedido (por ejemplo, un archivo demasiado grande): respuesta clara en JSON
  app.use((err, req, res, next) => {
    if (!err) return next();
    if (err.type === 'entity.too.large' || err.status === 413) return res.status(413).json({ error: 'El archivo es demasiado grande. El máximo es 20 MB por archivo.' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'No se pudo leer lo que se envió. Probá de nuevo.' });
    console.error('Error en el pedido:', err.message);
    return res.status(500).json({ error: 'Ocurrió un error en el servidor. Probá de nuevo en un momento.' });
  });

  app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h', index: 'index.html' }));
  app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

  // recordatorio de deuda: todos los días a las 9:00 (hora de Argentina)
  cron.schedule(process.env.HORA_RECORDATORIO || '0 9 * * *', () => {
    try { console.log('Recordatorios de deuda enviados:', Store.recordatoriosDeuda()); } catch (e) { console.error('Recordatorios:', e.message); }
  }, { timezone: 'America/Argentina/Buenos_Aires' });

  // avisos que quedaron en cola si el servidor se reinició
  for (const n of Store._pendientes()) avisos.enviar(Store, n);

  const servidor = app.listen(PORT, () => console.log(`Flight Center escuchando en el puerto ${PORT}`));
  const cerrar = async () => {
    servidor.close();
    for (let i = 0; i < 50 && persistencia.sinGuardar(); i++) await new Promise((r) => setTimeout(r, 100));
    process.exit(0);
  };
  process.on('SIGTERM', cerrar); process.on('SIGINT', cerrar);
})().catch((e) => { console.error('No se pudo iniciar el servidor:', e); process.exit(1); });
