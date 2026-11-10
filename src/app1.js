/* Flight Center · interfaz (parte 1: base, login, alumno y PPA) */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');
const BLOQUES = Store.BLOQUES;
const state = { user: null, tab: null };

// ---------- utilidades ----------
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hh = (h) => `${String(h).padStart(2, '0')}:00`;
const rango = (b) => `${hh(b)} – ${hh(b + 2)}`;
const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtFecha = (s, o = { weekday: 'long', day: 'numeric', month: 'long' }) => parseISO(s).toLocaleDateString('es-AR', o);
const fmtCorta = (s) => parseISO(s).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtDM = (s) => parseISO(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
const fmtHoras = (n) => (Math.round((n || 0) * 10) / 10).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const usd = (n) => `US$ ${(Math.round((n || 0) * 100) / 100).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// montos para el propio alumno o piloto: en la moneda de su cuenta
const monedaMia = () => (state.user?.moneda === 'USD' && state.tc ? 'USD' : 'ARS');
const plata = (ars, usdVal) => (monedaMia() === 'USD' ? usd(usdVal ?? ars / state.tc) : pesos(ars));
const iniciales = (u) => `${(u.nombre || '?')[0]}${(u.apellido || '')[0] || ''}`.toUpperCase();
// avatar con la foto de perfil (o las iniciales si no tiene)
const avatarDe = (u, px = 0, foto = u?.foto_url) => `<div class="avatar ${foto ? 'con-foto' : ''}" ${px ? `style="width:${px}px;height:${px}px;font-size:${Math.round(px * 0.34)}px"` : ''}>${foto ? `<img src="${esc(foto)}" alt="">` : esc(iniciales(u || {}))}</div>`;
// elige una foto (galería o cámara), la recorta cuadrada y la achica a 400 px para que pese poco
function elegirFoto({ camara = false } = {}) {
  return new Promise((resolve) => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; if (camara) inp.capture = 'user';
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return resolve(null);
      if (!/^image\//.test(f.type)) { toast('Elegí una imagen (JPG o PNG)', 'error'); return resolve(null); }
      const url = URL.createObjectURL(f); const img = new Image();
      img.onload = () => {
        const lado = Math.min(img.width, img.height); const c = document.createElement('canvas'); c.width = c.height = 400;
        c.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 400, 400);
        URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); toast('No se pudo leer la imagen. Probá con otra (JPG o PNG).', 'error'); resolve(null); };
      img.src = url;
    };
    inp.click();
  });
}
// pantalla obligatoria: sin foto de perfil no se puede usar la app
function pantallaFoto(u) {
  let foto = null;
  app.innerHTML = `<section class="portal">
    <div class="portal-head anim">${logo('', 'oscuro')}<button class="logout" title="Cerrar sesión" aria-label="Cerrar sesión" id="logout">${ICON.salir}</button></div>
    <div class="portal-cuerpo"><div class="foto-oblig anim" style="--i:1">
      <div class="foto-prev" id="fp-prev">${esc(iniciales(u))}</div>
      <h2>Hola, ${esc(u.nombre)}: subí tu foto de perfil</h2>
      <p>Es obligatoria para usar Flight Center. Así los instructores, el mecánico y la escuela saben con quién vuelan. Usá una foto de tu cara, de frente y con buena luz.</p>
      <div class="flujo" style="justify-content:center"><button class="btn sec" id="fp-galeria">Elegir una foto</button><button class="btn sec" id="fp-camara">Sacar una foto</button></div>
      <button class="btn" id="fp-ok" disabled style="margin-top:6px">Guardar y continuar</button>
    </div></div></section>`;
  const poner = async (camara) => { const d = await elegirFoto({ camara }); if (!d) return; foto = d; $('#fp-prev').innerHTML = `<img src="${d}" alt="">`; $('#fp-prev').classList.add('con-foto'); $('#fp-ok').disabled = false; };
  $('#fp-galeria').onclick = () => poner(false); $('#fp-camara').onclick = () => poner(true);
  $('#fp-ok').onclick = async () => { const r = await hacer(async () => await Store.subirFoto({ data: foto }), '¡Listo! Foto guardada'); if (r) { state.user = r; await renderApp(); } };
  $('#logout').onclick = async () => { await Store.logout(); state.user = null; state.portal = null; try { sessionStorage.removeItem('fc-portal'); } catch { /* sin storage */ } render(); };
}
const ROLES = { alumno: 'Alumno Piloto Privado', ppa: 'Piloto', instructor: 'Instructor de vuelo', mecanico: 'Mecánico', admin: 'Administración' };
const RANGOS_INST = { vuelo: ['Instructor de vuelo', 'Solo se lo puede reservar para vuelos.'], teoria: ['Instructor de teoría', 'Solo dicta clases teóricas.'],
  simulador: ['Instructor de simulador', 'Solo se lo puede reservar para simulador.'], teoria_simulador: ['Instructor de teoría y simulador', 'Clases teóricas y simulador.'],
  vuelo_teoria: ['Instructor de vuelo y teoría', 'Vuelos y clases teóricas.'], vuelo_simulador: ['Instructor de vuelo y simulador', 'Vuelos y simulador.'],
  todo: ['Instructor de todo', 'Vuelos, simulador y clases teóricas.'] };
const RANGOS_PILOTO = { privado: ['Piloto Privado', 'Reserva varios bloques, elige avión y destino según sus habilitaciones.', 'PPA'],
  alumno_comercial: ['Alumno a Piloto Comercial', 'Reserva como piloto y tiene el syllabus del curso de Piloto Comercial (PCA c/HVI).', 'Alumno PCA'],
  comercial: ['Piloto Comercial', 'Igual que el Piloto Privado: varios bloques, elige avión y destino.', 'PCA'],
  alumno_instructor: ['Alumno a Instructor de vuelo', 'Reserva como piloto. Por ahora sin syllabus.', 'Alumno IV'] };
const tipoCorto = (rol, rango) => (rol === 'alumno' ? 'Alumno PPA' : rol === 'ppa' ? RANGOS_PILOTO[rango || 'privado']?.[2] || 'Piloto' : ROLES[rol] || '');
const RANGOS = { ppa: RANGOS_PILOTO, instructor: RANGOS_INST, admin: { contabilidad: ['Contabilidad', 'Acceso total, incluida la contabilidad: estados de cuenta, pagos, packs, tarifas y cotización.'], programador: ['Programador', 'Ve y maneja todo menos la contabilidad (estados de cuenta, pagos y tarifas).'] } };
const nombreRol = (u) => (u.rol === 'admin' && u.rango ? `${ROLES.admin} · ${RANGOS.admin[u.rango]?.[0] || u.rango}` : u.rol === 'instructor' && u.rango ? RANGOS_INST[u.rango]?.[0] || ROLES.instructor : u.rol === 'ppa' ? RANGOS_PILOTO[u.rango || 'privado']?.[0] || ROLES.ppa : ROLES[u.rol]);
const esContable = () => state.user?.rol === 'admin' && (state.user.rango || 'contabilidad') === 'contabilidad';
const TIPO_RES = { vuelo: 'Vuelo', simulador: 'Simulador', teorica: 'Clase teórica' };
const NOTA = { MB: 'Muy bien', B: 'Bien', R: 'Regular', 'S+': 'Supera el estándar', S: 'Estándar', 'S-': 'Debajo del estándar', N: 'No estándar' };
const claseNota = (v) => ({ 'S+': 'Sp', 'S-': 'Sm' }[v] || v || '');
const codigoReserva = (id, p = 'FC') => `${p}-${String(id).padStart(5, '0')}`;
const telLimpio = (t) => String(t || '').replace(/[^\d+]/g, '');
const lunesDe = (d = new Date()) => { const x = new Date(d); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return isoLocal(x); };

const ICON = {
  avion: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  salir: '<svg viewBox="0 0 24 24" width="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  tel: '<svg viewBox="0 0 24 24" width="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" width="13" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>',
  wa: '<svg viewBox="0 0 24 24" width="13" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 2 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>',
  nube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 1 0 6 17.2"/><path d="M6 19h11.5"/></svg>',
  sim: '<svg viewBox="0 0 24 24" width="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4M7 11l3-3 3 3 4-4"/></svg>',
  libro: '<svg viewBox="0 0 24 24" width="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
  llave: '<svg viewBox="0 0 24 24" width="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.7 6.3a4 4 0 0 0 5 5L22 14l-8 8-2.3-2.3a4 4 0 0 0-5-5L2 10l4-4 2.3 2.3a4 4 0 0 0 5-5z"/></svg>',
};
const avionIco = (w = 20, rot = 45) => ICON.avion.replace('<svg', `<svg width="${w}" style="transform:rotate(${rot}deg)"`);
// logo oficial de Flight Center: versión clara (fondos blancos) y oscura (fondos azules)
const logo = (sub = '', fondo = 'oscuro') => `<div class="brand brand-${fondo}"><img class="brand-img" src="${LOGOS[fondo]}" alt="Flight Center">${sub ? `<small>${sub}</small>` : ''}</div>`;
const vacio = (txt) => `<div class="vacio">${ICON.nube}<div>${txt}</div></div>`;

function toast(msg, tipo = '') {
  const t = document.createElement('div'); t.className = `toast ${tipo}`; t.textContent = msg; $('#toasts').append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3400);
}
// ejecuta una acción del Store y muestra el error si lo hay
async function hacer(fn, ok) {
  try { const r = await fn(); if (ok) toast(ok, 'ok'); return r; } catch (e) { toast(e.message, 'error'); return undefined; }
}
function countUp(el, fin, dec = 0) {
  const t0 = performance.now();
  const paso = (t) => { const p = Math.min(1, (t - t0) / 1100); el.textContent = (fin * (1 - Math.pow(1 - p, 3))).toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); if (p < 1) requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
}
const animarNumeros = (root) => $$('[data-count]', root).forEach((el) => countUp(el, Number(el.dataset.count), Number(el.dataset.dec || 0)));
function barcode(seed, n = 46) {
  let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  let out = '';
  for (let i = 0; i < n; i++) { h = (h * 1103515245 + 12345) >>> 0; out += `<i style="flex:${1 + (h % 3)} 0 0;margin-right:${1 + ((h >> 3) % 2)}px"></i>`; }
  return `<div class="barcode">${out}</div>`;
}
const stat = (lbl, val, { dec = 0, suf = '', dest = false, i = 0 } = {}) =>
  `<div class="stat ${dest ? 'dest' : ''} anim" style="--i:${i}"><div class="lbl">${lbl}</div><div class="val"><span data-count="${val}" data-dec="${dec}">0</span>${suf ? `<small>${suf}</small>` : ''}</div></div>`;

// ---------- modales ----------
function modal(html, { ancho = false } = {}) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${ancho ? 'ancho' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  const onKey = async (e) => { if (e.key === 'Escape') await cerrar(); };
  const cerrar = () => { bg.style.animation = 'fadeIn .2s reverse both'; setTimeout(() => bg.remove(), 180); document.removeEventListener('keydown', onKey); };
  document.addEventListener('keydown', onKey);
  bg.addEventListener('click', async (e) => { if (e.target === bg || e.target.closest('[data-cerrar]')) await cerrar(); });
  $('#modal-root').append(bg);
  return { el: bg, cerrar };
}
function confirmar(titulo, texto, ok = 'Confirmar') {
  return new Promise((resolve) => {
    const m = modal(`<div class="modal-head"><h3>${esc(titulo)}</h3><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
      <div class="modal-body"><p style="margin:0">${esc(texto)}</p></div>
      <div class="modal-foot"><button class="btn sec" data-cerrar>Volver</button><button class="btn danger" id="si">${esc(ok)}</button></div>`);
    let r = false;
    $('#si', m.el).onclick = () => { r = true; m.cerrar(); };
    new MutationObserver((_, o) => { if (!m.el.isConnected) { o.disconnect(); resolve(r); } }).observe($('#modal-root'), { childList: true });
  });
}

// ---------- shell ----------
async function render() { if (!state.user) return renderLogin(); await renderApp(); }

function renderLogin() {
  const nubes = Array.from({ length: 7 }, (_, i) => { const w = 120 + Math.random() * 160;
    return `<div class="cloud" style="width:${w}px;height:${w * 0.32}px;top:${8 + i * 12}%;animation-duration:${38 + Math.random() * 40}s;animation-delay:-${Math.random() * 60}s"></div>`; }).join('');
  const demo = [['Alumno', 'alumno@flightcenter.com'], ['Piloto PPA', 'ppa@flightcenter.com'], ['Instructor', 'instructor@flightcenter.com'], ['Mecánico', 'mecanico@flightcenter.com'], ['Administración', 'admin@flightcenter.com'], ['Programador', 'programador@flightcenter.com']];
  app.innerHTML = `<section class="login">${nubes}
    <div class="plane-fly">${ICON.avion.replace('<svg', '<svg style="transform:rotate(80deg)"')}</div>
    <div class="login-card">
      ${logo('Sistema de operaciones', 'claro')}${MODO === 'demo' ? '<span class="demo-tag">Versión demo · los datos se guardan en este navegador</span>' : ''}
      <p class="muted" style="margin:16px 0 0">Ingresá con el email registrado en la escuela.</p>
      <form id="f-login" novalidate>
        <label class="campo">Email<input id="l-email" type="email" name="email" autocomplete="username" required placeholder="tu@email.com"></label>
        <label class="campo">Contraseña<input id="l-pass" type="password" name="password" autocomplete="current-password" required placeholder="••••••••"></label>
        <div class="error-msg" id="login-err"></div>
        <button class="btn block" type="submit">Iniciar sesión ${avionIco(16, 90)}</button>
      </form>
      ${MODO === 'demo' ? `<div class="demo">Cuentas de prueba (contraseña <b>flight123</b>):
        <div class="demo-list">${demo.map(([t, e]) => `<button type="button" data-email="${e}">${t}</button>`).join('')}</div>
        <div style="margin-top:10px"><button class="link-btn" id="reset-demo" type="button">Restablecer los datos de ejemplo</button></div>
      </div>` : '<p class="muted" style="margin:14px 0 0;font-size:13px">¿No tenés usuario o te olvidaste la contraseña? Pedíselo a la administración de la escuela.</p>'}
    </div></section>`;
  const f = $('#f-login');
  $$('.demo-list button').forEach((b) => b.onclick = () => { f.email.value = b.dataset.email; f.password.value = 'flight123'; f.password.focus(); });
  if ($('#reset-demo')) $('#reset-demo').onclick = async () => { await Store.reiniciar(); toast('Datos de ejemplo restablecidos', 'ok'); };
  f.onsubmit = async (e) => {
    e.preventDefault(); $('#login-err').textContent = '';
    try { state.user = await Store.login(f.email.value, f.password.value); state.tab = null; state.portal = null; try { sessionStorage.removeItem('fc-portal'); } catch { /* sin storage */ } await render(); }
    catch (err) {
      $('#login-err').textContent = err.message;
      $('.login-card').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(0)' }], { duration: 350 });
    }
  };
}

const TABS = {
  alumno: [['reservar', 'Reservar'], ['reservas', 'Mis reservas'], ['syllabus', 'Mi syllabus'], ['horas', 'Mis horas'], ['cuenta', 'Estado de cuenta'], ['avisos', 'Avisos'], ['meteo', 'Meteo y NOTAM'], ['perfil', 'Mi perfil']],
  ppa: [['reservar', 'Reservar'], ['reservas', 'Mis reservas'], ['syllabus', 'Mi syllabus'], ['horas', 'Mis horas'], ['cuenta', 'Estado de cuenta'], ['avisos', 'Avisos'], ['meteo', 'Meteo y NOTAM'], ['perfil', 'Mi perfil']],
  instructor: [['agenda', 'Mi agenda'], ['alumnos', 'Mis alumnos'], ['clases', 'Clases teóricas'], ['flota', 'Flota'], ['meteo', 'Meteo y NOTAM'], ['perfil', 'Mi perfil']],
  mecanico: [['mantenimiento', 'Libros de novedades'], ['meteo', 'Meteo y NOTAM'], ['perfil', 'Mi perfil']],
  admin: [['panel', 'Panel'], ['dispo', 'Instructores'], ['clases', 'Clases teóricas'], ['todas', 'Reservas'], ['cuentas', 'Cuentas'], ['avisos', 'Avisos'], ['usuarios', 'Usuarios'], ['flota', 'Flota'], ['meteo', 'Meteo y NOTAM'], ['perfil', 'Mi perfil']],
};
const VISTAS = {};

async function renderApp() {
  const u = await Store.yo();
  if (!u) { state.user = null; return renderLogin(); }
  state.user = u;
  try { state.tc = (await Store.cotizacion())?.venta || null; } catch { state.tc = null; }
  if (u.falta_foto) return pantallaFoto(u);
  // al entrar se elige: campus o sistema de reservas (el mecánico va directo a reservas)
  const conCampus = u.rol !== 'mecanico';
  if (!conCampus) state.portal = 'reservas';
  if (!state.portal) { try { state.portal = sessionStorage.getItem('fc-portal'); } catch { /* sin storage */ } }
  if (!state.portal) return renderPortal(u);
  const tabs = (state.portal === 'campus' ? TABS_CAMPUS : TABS)[u.rol].filter(([k]) => (k !== 'cuentas' || esContable()) && (k !== 'syllabus' || u.programa));
  if (!state.tab || !tabs.some(([k]) => k === state.tab)) state.tab = tabs[0][0];
  app.innerHTML = `<header class="topbar"><div class="topbar-inner">
      ${logo(state.portal === 'campus' ? 'Campus' : nombreRol(u))}
      <nav class="tabs">${tabs.map(([k, t]) => `<button class="tab ${k === state.tab ? 'activo' : ''}" data-tab="${k}">${t}</button>`).join('')}</nav>
      <div class="user-chip">${conCampus ? `<button class="cambio-portal" id="cambio-portal" title="Cambiar de sección">${state.portal === 'campus' ? 'Ir a Reservas' : 'Ir al Campus'}</button>` : ''}${avatarDe(u)}<span class="nombre">${esc(u.nombre)}</span>
        <button class="logout" title="Cerrar sesión" aria-label="Cerrar sesión" id="logout">${ICON.salir}</button></div>
    </div></header><main id="vista"></main>`;
  $$('.tab').forEach((b) => b.onclick = async () => await irA(b.dataset.tab));
  $('#logout').onclick = async () => { await Store.logout(); state.user = null; state.portal = null; try { sessionStorage.removeItem('fc-portal'); } catch { /* sin storage */ } await render(); };
  const cp = $('#cambio-portal'); if (cp) cp.onclick = () => elegirPortal(state.portal === 'campus' ? 'reservas' : 'campus');
  const key = `${u.rol}:${state.tab}`;
  (VISTAS[key] || VISTAS[state.tab])($('#vista'));
}
async function irA(tab) { state.tab = tab; await renderApp(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

function hero(titulo, texto, extra = '') {
  return `<section class="hero anim"><span class="badge">${esc(nombreRol(state.user))}</span>
    <h2>${titulo}</h2><p>${texto}</p>${extra}</section>`;
}
const badgeEstado = (r) => r.estado === 'completado' ? `<span class="badge ok">Completado${r.horas ? ` · ${fmtHoras(r.horas)} h` : ''}</span>`
  : r.estado === 'cancelado' ? '<span class="badge gris">Cancelado</span>'
  : r.estado === 'ausente' ? `<span class="badge danger" ${r.ausencia?.motivo ? `title="${esc(r.ausencia.motivo)}"` : ''}>Ausente${r.ausencia?.justificada ? ' · justificado' : ''}</span>` : '<span class="badge warn">Pendiente</span>';
const badgeTipo = (t) => `<span class="badge ${t === 'simulador' ? 'gris' : ''}">${TIPO_RES[t]}</span>`;

// =====================================================================
//                       RESERVAR (alumno / PPA)
// =====================================================================
VISTAS.reservar = async function vistaReservar(v, tipo = state.tipoReserva || 'vuelo') {
  const u = state.user; const esPPA = u.rol === 'ppa';
  if (esPPA && tipo === 'teorica') tipo = 'vuelo';
  state.tipoReserva = tipo;
  const tipos = esPPA ? ['vuelo', 'simulador'] : ['vuelo', 'simulador', 'teorica'];
  const textos = {
    vuelo: esPPA ? 'Elegí el día, uno o más bloques de 2 horas, la aeronave, el destino y, si querés, un instructor. Todos los vuelos salen de Morón.' : 'Elegí el día, un bloque de 2 horas y tu instructor. Es un vuelo local desde Morón (MOR – MOR) y la aeronave se asigna automáticamente.',
    simulador: esPPA ? 'Reservá el Frasca o el Simu 1. Podés tomar varios bloques.' : 'Reservá el Frasca o el Simu 1 con tu instructor. Un bloque por día.',
    teorica: 'Anotate en las clases teóricas que programa la escuela. Te marcamos la que te toca según tu syllabus.',
  };
  v.innerHTML = hero(`¡Hola, ${esc(u.nombre)}! ¿Qué reservamos?`, textos[tipo]) +
    `<div class="segmento anim" style="--i:1" role="tablist">${tipos.map((t) => `<button role="tab" class="${t === tipo ? 'on' : ''}" data-t="${t}">${TIPO_RES[t]}</button>`).join('')}</div>
     <div id="res-cuerpo"></div>`;
  $$('.segmento button', v).forEach((b) => b.onclick = async () => await VISTAS.reservar(v, b.dataset.t));
  const cuerpo = $('#res-cuerpo', v);
  if (tipo === 'teorica') return await reservarTeorica(cuerpo);
  await reservarTurno(cuerpo, tipo);
};

async function avisoLeccion(track) {
  if (!state.user.programa) return '';
  const l = await Store.leccionActual(state.user.id, track);
  if (!l) return `<div class="aviso anim"><div><strong>Completaste todas las lecciones de ${track === 'vuelo' ? 'vuelo' : 'simulador'}.</strong></div></div>`;
  const estudiar = (l.estudiar || []).slice(0, 6);
  return `<div class="aviso ${l.estado === 'repetir' ? 'warn' : ''} anim" style="--i:2">
    <div class="proxima"><div class="codigo">${esc(codLeccion(l.id))}</div><div>
      <strong>${l.estado === 'repetir' ? 'Tenés que repetir esta lección' : 'Tu próxima lección'}: <span class="cap">${esc(l.titulo)}</span></strong>
      ${l.estado === 'repetir' ? `<span>En el último intento quedaron ${l.regulares.length} maniobra(s) en Regular. Hasta aprobarlas no se pasa a la siguiente.</span>` : ''}
      ${estudiar.length ? `<div class="muted" style="margin-top:4px">Traé estudiado: ${estudiar.map(esc).join(' · ')}</div>` : ''}
    </div></div></div>`;
}

async function reservarTurno(c, tipo) {
  const u = state.user; const esPPA = u.rol === 'ppa'; const esSim = tipo === 'simulador';
  const instructores = (await Store.instructores()).filter((i) => !i.actividades || i.actividades.includes(tipo));
  const recursos = await Store.recursos(esSim ? 'simulador' : 'avion');
  const eligeRecurso = esPPA || esSim;
  const hab = u.hab || {};
  const puedeSolo = esSim ? !!hab.sim_solo : !!hab.solo;
  const esBristell = (r) => /bristell/i.test(`${r?.modelo || ''} ${r?.nombre || ''}`);
  const faltaBristell = (r) => !esSim && esPPA && esBristell(r) && !hab.bristell;
  const avionOk = (id) => esSim || ((!Array.isArray(hab.aeronaves) || hab.aeronaves.includes(id)) && !faltaBristell(recursos.find((x) => x.id === id)));
  c.innerHTML = await avisoLeccion(tipo) + `
    <div class="card anim" style="--i:3"><div class="card-head"><div class="paso" id="p1"><span class="paso-num">1</span><h3>Elegí el día</h3></div></div><div class="dias" id="dias"></div></div>
    <div class="card anim" style="--i:4"><div class="card-head"><div class="paso" id="p2"><span class="paso-num">2</span><h3>Bloque horario</h3></div>
      <span class="muted">${esPPA ? 'Podés elegir varios bloques' : 'Un bloque por día'} · 08:00 a 18:00</span></div><div id="bloques" class="bloques"></div></div>
    <div class="card anim" style="--i:5"><div class="card-head"><div class="paso" id="p3"><span class="paso-num">3</span><h3>Instructor</h3></div>
      <span class="muted">${puedeSolo ? 'Opcional: estás habilitado/a para ' + (esSim ? 'usar el simulador' : 'volar') + ' sin instructor' : 'Solo aparecen los instructores asignados para ese horario'}</span></div><div id="instructores" class="opciones"></div></div>
    ${eligeRecurso ? `<div class="card anim" style="--i:6"><div class="card-head"><div class="paso" id="p4"><span class="paso-num">4</span><h3>${esSim ? 'Simulador' : 'Aeronave'}</h3></div></div><div id="recursos" class="opciones"></div></div>` : ''}
    ${esPPA && !esSim ? `<div class="card anim" style="--i:7"><div class="card-head"><div class="paso hecho"><span class="paso-num">5</span><h3>Ruta</h3></div><span class="muted">Todos los vuelos salen de Morón</span></div>
      <div class="form-grid"><label class="campo">Salida<input value="MOR · Morón" disabled></label><label class="campo">Destino <span class="op">${hab.travesia ? '(MOR = vuelo local)' : '(sin habilitación de travesía: solo vuelo local)'}</span><input id="destino" maxlength="4" value="MOR" style="text-transform:uppercase" ${hab.travesia ? '' : 'disabled'}></label></div></div>` : ''}
    <div class="collapse" id="confirmar-wrap"><div><div class="resumen-reserva" id="resumen"></div></div></div>`;
  const s = { fecha: null, bloques: [], instructor: null, recurso: null, disp: [] };
  const hoy = new Date();
  $('#dias', c).innerHTML = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(hoy); d.setDate(d.getDate() + i);
    return `<button class="dia anim" style="--i:${i}" data-f="${isoLocal(d)}"><small>${i === 0 ? 'Hoy' : d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')}</small>
      <strong>${d.getDate()}</strong><small>${d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}</small></button>`;
  }).join('');
  $$('.dia', c).forEach((b) => b.onclick = async () => await elegirDia(b.dataset.f));
  async function elegirDia(f) {
    s.fecha = f; s.bloques = [];
    $$('.dia', c).forEach((b) => b.classList.toggle('sel', b.dataset.f === f));
    s.disp = await Store.disponibilidadDia(tipo, f); await pintar();
  }
  const interseccion = (campo) => !s.bloques.length ? null : s.bloques.map((b) => s.disp.find((d) => d.bloque === b)[campo]).reduce((a, l) => a.filter((x) => l.includes(x)));
  async function pintar() {
    const yaTengo = !esPPA && (await Store.misReservas()).some((r) => r.fecha === s.fecha && r.tipo === tipo && r.estado !== 'cancelado');
    $('#bloques', c).innerHTML = s.disp.map((d, i) => {
      let est = `${d.instructores.length} instr. · ${d.recursos.length} ${esSim ? 'simul.' : 'aviones'}`; let dis = false;
      if (d.ocupadoYo) { est = 'Ya tenés actividad'; dis = true; }
      else if (d.reservado) { est = 'Reservado'; dis = true; }
      else if (d.pasado) { est = 'No disponible'; dis = true; }
      else if (!d.recursos.filter(avionOk).length || (!puedeSolo && !d.instructores.length)) { est = !d.instructores.length && !puedeSolo ? 'Sin instructores' : 'Completo'; dis = true; }
      else if (yaTengo) { est = `Ya reservaste ${esSim ? 'simulador' : 'vuelo'} este día`; dis = true; }
      const sel = s.bloques.includes(d.bloque);
      return `<button class="bloque anim ${sel ? 'sel' : ''} ${d.ocupadoYo ? 'mio' : ''}" style="--i:${i}" data-b="${d.bloque}" ${dis ? 'disabled' : ''}>
        <div class="hora">${rango(d.bloque)}</div><div class="estado">${est}</div><span class="check">${sel ? ICON.check : ''}</span></button>`;
    }).join('');
    $$('#bloques .bloque', c).forEach((b) => b.onclick = async () => {
      const n = Number(b.dataset.b);
      s.bloques = esPPA ? (s.bloques.includes(n) ? s.bloques.filter((x) => x !== n) : [...s.bloques, n].sort((a, z) => a - z)) : (s.bloques[0] === n ? [] : [n]);
      await pintar();
    });
    const il = interseccion('instructores');
    if (s.instructor && il && !il.includes(s.instructor)) s.instructor = null;
    $('#instructores', c).innerHTML = `<button class="opcion ${s.instructor === 0 ? 'sel' : ''}" data-i="0" ${!il || !puedeSolo ? 'disabled' : ''}><span class="ico">${avionIco(20, 0)}</span><span><strong>Sin instructor</strong><small>${!puedeSolo ? 'Requiere habilitación de la administración' : esSim ? 'Práctica libre' : 'Vuelo solo'}</small></span></button>` +
      instructores.map((ins) => { const ok = il && il.includes(ins.id);
        return `<button class="opcion ${s.instructor === ins.id ? 'sel' : ''}" data-i="${ins.id}" ${ok ? '' : 'disabled'}><span class="ico">${esc(iniciales(ins))}</span><span><strong>${esc(ins.nombre)} ${esc(ins.apellido)}</strong>
          <small>${!il ? 'Elegí un bloque primero' : ok ? 'Disponible' : 'No vuela en ese horario'}</small></span></button>`; }).join('');
    $$('#instructores .opcion', c).forEach((b) => b.onclick = async () => { s.instructor = Number(b.dataset.i); await pintar(); });
    if (eligeRecurso) {
      const rl = interseccion('recursos');
      if (s.recurso && rl && !rl.includes(s.recurso)) s.recurso = null;
      $('#recursos', c).innerHTML = recursos.map((r) => {
        const ok = r.estado === 'operativa' && avionOk(r.id) && rl && rl.includes(r.id);
        const sub = faltaBristell(r) ? 'Requiere adaptación a Bristell' : !avionOk(r.id) ? 'No habilitado/a' : r.estado !== 'operativa' ? 'Fuera de servicio' : !rl ? 'Elegí un bloque primero' : ok ? r.modelo : 'Ocupado en ese horario';
        return `<button class="opcion ${s.recurso === r.id ? 'sel' : ''}" data-r="${r.id}" ${ok ? '' : 'disabled'}><span class="ico">${esSim ? ICON.sim : avionIco()}</span>
          <span><strong class="${esSim ? '' : 'mono'}">${esc(r.nombre)}</strong><small>${esc(sub)}</small></span></button>`;
      }).join('');
      $$('#recursos .opcion', c).forEach((b) => b.onclick = async () => { s.recurso = Number(b.dataset.r); await pintar(); });
    }
    $('#p1', c).classList.toggle('hecho', !!s.fecha); $('#p2', c).classList.toggle('hecho', s.bloques.length > 0);
    $('#p3', c).classList.toggle('hecho', s.instructor !== null); if (eligeRecurso) $('#p4', c).classList.toggle('hecho', !!s.recurso);
    const listo = s.fecha && s.bloques.length && (puedeSolo ? s.instructor !== null : s.instructor) && (!eligeRecurso || s.recurso);
    const inst = instructores.find((x) => x.id === s.instructor); const rec = recursos.find((x) => x.id === s.recurso);
    $('#confirmar-wrap', c).classList.toggle('open', !!(s.fecha && s.bloques.length));
    $('#resumen', c).innerHTML = `<div><strong class="cap">${s.fecha ? esc(fmtFecha(s.fecha)) : ''}</strong>
      <div class="muted">${TIPO_RES[tipo]} · ${s.bloques.map(rango).join(' · ')}${inst ? ` · ${esc(inst.nombre)} ${esc(inst.apellido)}` : s.instructor === 0 ? ' · Sin instructor' : ''}${rec ? ` · ${esc(rec.nombre)}` : ''}</div></div>
      <span class="muted" style="flex-basis:100%;order:3;font-size:12.5px">${await politicaTxt(tipo)}</span>
      <button class="btn" id="btn-reservar" ${listo ? '' : 'disabled'}>Confirmar y emitir pase ${avionIco(16, 90)}</button>`;
    $('#btn-reservar', c).onclick = async () => {
      const r = await hacer(async () => await Store.reservar({ tipo, fecha: s.fecha, bloques: s.bloques, instructor_id: s.instructor || null, recurso_id: s.recurso, destino: $('#destino', c)?.value }));
      if (r) { boardingPass(paseDeReservas(r), { celebrar: true }); await elegirDia(s.fecha); }
    };
  }
  await elegirDia(isoLocal(hoy));
}

async function reservarTeorica(c) {
  const u = state.user;
  const sug = await Store.leccionActual(u.id, 'teorica');
  const clases = await Store.clasesParaAlumno();
  c.innerHTML = (sug ? `<div class="aviso ${sug.estado === 'repetir' ? 'warn' : ''} anim" style="--i:2"><div class="proxima"><div class="codigo">${esc(sug.id)}</div><div>
      <strong>${sug.estado === 'repetir' ? 'Tenés que recursar' : 'Te toca'}: ${esc(sug.titulo)}</strong>
      <div class="muted">${SYLLABUS.reglas.slice(0, 4).map(esc).join(' · ')}</div></div></div></div>` : '') +
    `<div class="card anim" style="--i:3"><div class="card-head"><h3>Clases programadas</h3><span class="muted">Cada clase dura un bloque de 2 hs</span></div>
     ${clases.length ? clases.map((k, i) => `<div class="clase-card anim ${sug && k.teo === sug.id ? 'sugerida' : ''}" style="--i:${i}">
        <div class="teo">${esc(k.teo)}</div>
        <div><strong>${esc(k.titulo)}</strong> ${sug && k.teo === sug.id ? '<span class="badge">Te corresponde</span>' : ''} ${k.aprobada ? '<span class="badge ok">Ya aprobada</span>' : ''}
          <div class="vuelo-info"><div class="meta"><span class="cap">${esc(fmtFecha(k.fecha))}</span><span class="mono">${rango(k.bloque)}</span><span>${esc(k.aula)}</span><span>${esc(k.instructor)}</span><span>${k.cupo - k.inscriptos} lugares</span></div></div></div>
        <div>${k.inscripto ? `<button class="btn danger sm" data-baja="${k.id}">Darme de baja</button>` : `<button class="btn sm" data-ins="${k.id}" ${k.cupo - k.inscriptos <= 0 ? 'disabled' : ''}>Inscribirme</button>`}</div>
      </div>`).join('') : vacio('No hay clases programadas por ahora.')}</div>`;
  $$('[data-ins]', c).forEach((b) => b.onclick = async () => {
    const k = await hacer(async () => await Store.inscribirse(b.dataset.ins));
    if (k) { boardingPass(paseDeClase(k), { celebrar: true }); await reservarTeorica(c); }
  });
  $$('[data-baja]', c).forEach((b) => b.onclick = async () => {
    const info = await Store.infoCancelacion(b.dataset.baja, 'teorica');
    if (await confirmar('Darte de baja', `¿Querés liberar tu lugar en esta clase? ${textoCargo(info)}`, info.cargo ? `Darme de baja y pagar ${plata(info.cargo)}` : 'Darme de baja')) {
      const cargo = await hacer(async () => await Store.darseDeBaja(b.dataset.baja)); if (cargo !== undefined) toast(cargo ? `Baja registrada. Se cargó ${plata(cargo)} a tu cuenta.` : 'Te diste de baja de la clase', 'ok'); await reservarTeorica(c); }
  });
}

// =====================================================================
//                         BOARDING PASS
// =====================================================================
function paseDeReservas(reservas) {
  const r = reservas[0]; const bl = reservas.map((x) => x.bloque).sort((a, b) => a - b);
  const contiguo = bl.every((b, i) => !i || b === bl[i - 1] + 2);
  const lec = r.estado === 'pendiente' ? r.leccion_sugerida || null : r.leccion;
  return { llegada: r.llegada || null, reservaId: r.id, tipo: r.tipo, codigo: codigoReserva(r.id, r.tipo === 'simulador' ? 'SIM' : 'FC'), destino: r.tipo === 'simulador' ? 'SIM' : (r.destino || 'MOR'), local: r.tipo === 'vuelo' && (r.destino || 'MOR') === 'MOR',
    salida: bl[0], regreso: bl.at(-1) + 2, horario: contiguo ? `${hh(bl[0])} – ${hh(bl.at(-1) + 2)}` : bl.map(rango).join(', '),
    piloto: r.piloto, clase: tipoCorto(r.piloto_rol, r.piloto_rango).toUpperCase(), fecha: r.fecha, recursoLbl: r.tipo === 'simulador' ? 'Simulador' : 'Aeronave', recurso: r.recurso,
    extraLbl: lec ? 'Lección' : 'Modelo', extra: lec || r.modelo, instructor: r.instructor || 'Sin instructor', bloques: `${bl.length} × 2 hs`, estado: r.estado };
}
function paseDeClase(k) {
  return { tipo: 'teorica', codigo: codigoReserva(k.id, 'TEO'), destino: 'AULA', salida: k.bloque, regreso: k.bloque + 2, horario: rango(k.bloque),
    piloto: `${state.user.nombre} ${state.user.apellido}`, clase: 'ALUMNO', fecha: k.fecha, recursoLbl: 'Aula', recurso: k.aula,
    extraLbl: 'Clase', extra: k.teo, instructor: k.instructor, bloques: '1 × 2 hs', estado: 'pendiente', titulo: k.titulo };
}
function boardingPass(p, { celebrar = false } = {}) {
  const sello = p.estado === 'completado' ? 'COMPLETADO' : p.estado === 'cancelado' ? 'CANCELADO' : p.estado === 'ausente' ? 'AUSENTE' : 'CONFIRMADO';
  const embarque = `${String(p.salida - 1).padStart(2, '0')}:45`;
  const e = document.createElement('div'); e.className = 'bp-escena';
  e.innerHTML = `<div class="bp-wrap">
    <div class="bp-titulo">${celebrar ? `<h2>¡Reserva confirmada!</h2><p>Tu pase está listo. Te esperamos 15 minutos antes.</p>` : `<h2>Pase de abordar</h2><p>${esc(p.codigo)}</p>`}</div>
    <div class="bp-ranura"></div>
    <div class="bp-clip"><article class="bp">
      <div class="bp-main">
        <div class="bp-head">${logo()}<div class="bp-tipo">Boarding pass<br>${esc(TIPO_RES[p.tipo])}</div></div>
        <div class="bp-ruta"><div class="cod">MOR<small>Morón · Salida ${hh(p.salida)}</small></div><div class="bp-linea">${ICON.avion}</div>
          <div class="cod" style="text-align:right">${esc(p.destino)}<small>${p.tipo === 'vuelo' ? (p.local ? 'Vuelo local · Regreso' : 'Destino · Regreso a MOR') : p.tipo === 'simulador' ? 'Simulador · Fin' : 'Aula · Fin'} ${hh(p.regreso)}</small></div></div>
        <div class="bp-campos">
          <div style="grid-column:span 2"><small>Piloto</small><span>${esc(p.piloto)}</span></div>
          <div><small>Clase</small><span>${p.clase}</span></div>
          <div style="grid-column:span 2"><small>Fecha</small><span class="cap">${esc(fmtFecha(p.fecha, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</span></div>
          <div class="grande"><small>Embarque</small><span>${embarque}</span></div>
          <div class="grande" style="grid-column:span 2"><small>Horario</small><span>${esc(p.horario)}</span></div>
          <div class="grande"><small>${p.recursoLbl}</small><span>${esc(p.recurso)}</span></div>
          <div><small>Instructor</small><span>${esc(p.instructor)}</span></div>
          <div><small>${p.extraLbl}</small><span>${esc(p.extra)}</span></div>
          <div><small>Duración</small><span>${p.bloques}</span></div>
        </div>
        <div class="bp-sello">${sello}</div>
      </div>
      <aside class="bp-stub"><div class="bp-campos">
          <div style="grid-column:span 2"><small>Piloto</small><span>${esc(p.piloto)}</span></div>
          <div><small>Fecha</small><span>${esc(fmtCorta(p.fecha))}</span></div><div><small>Salida</small><span class="mono">${hh(p.salida)}</span></div>
          <div><small>${p.recursoLbl}</small><span class="mono">${esc(p.recurso)}</span></div><div><small>${p.extraLbl}</small><span>${esc(p.extra)}</span></div>
        </div>${barcode(p.codigo)}<div class="bp-codigo">${esc(p.codigo)}</div></aside>
    </article></div>
    <div class="bp-acc">${celebrar ? '<button class="btn sec" id="bp-msj">Ver el email y el WhatsApp de confirmación</button>' : ''}<button class="btn" id="bp-ok">${celebrar ? 'Ver mis reservas' : 'Cerrar'}</button></div></div>`;
  document.body.append(e);
  const cerrar = async (ir) => { e.style.animation = 'fadeIn .25s reverse both'; setTimeout(() => e.remove(), 220); if (ir) await irA('reservas'); };
  $('#bp-ok', e).onclick = async () => await cerrar(celebrar);
  const bm = $('#bp-msj', e); if (bm) bm.onclick = async () => verMensajes(await Store.ultimasDeReserva());
  e.addEventListener('click', async (ev) => { if (ev.target === e) await cerrar(false); });
  if (celebrar && !matchMedia('(prefers-reduced-motion: reduce)').matches) setTimeout(() => {
    const col = ['#4fc3f7', '#1e88e5', '#ffffff', '#81d4fa', '#1565c0'];
    for (let i = 0; i < 70; i++) { const k = document.createElement('div'); k.className = 'confeti'; k.style.left = `${Math.random() * 100}vw`; k.style.background = col[i % 5];
      k.style.animationDuration = `${2 + Math.random() * 2.5}s`; k.style.animationDelay = `${Math.random() * .6}s`; document.body.append(k); setTimeout(() => k.remove(), 5500); }
  }, 1900);
}

// =====================================================================
//                          MIS RESERVAS
// =====================================================================
VISTAS.reservas = async function vistaMisReservas(v) {
  const todas = await Store.misReservas(); const hoy = isoLocal(new Date());
  const grupos = new Map();
  for (const r of todas.filter((x) => x.estado === 'pendiente' && x.fecha >= hoy)) {
    const k = `${r.tipo}|${r.fecha}|${r.recurso_id}|${r.instructor_id}`; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(r);
  }
  const empezo = (f, b) => f < hoy || (f === hoy && new Date().getHours() >= b);
  const prox = [...grupos.values()].map((g) => g.sort((a, b) => a.bloque - b.bloque)).sort((a, b) => (a[0].fecha + hh(a[0].bloque)).localeCompare(b[0].fecha + hh(b[0].bloque)));
  const clases = state.user.rol === 'alumno' ? await Store.misClases() : [];
  const clasesProx = clases.filter((k) => k.estado === 'programada' && k.inscripcion.estado === 'inscripto');
  const pasados = todas.filter((r) => !(r.estado === 'pendiente' && r.fecha >= hoy));
  v.innerHTML = hero('Mis reservas', 'Tus próximos vuelos, turnos de simulador y clases, cada uno con su pase. Tocá un pase para verlo completo.') + `
    <div class="card anim" style="--i:1"><div class="card-head"><h3>Próximas</h3><span class="badge">${prox.length + clasesProx.length}</span></div>
      ${prox.length || clasesProx.length ? `<div class="mini-grid">${prox.map((g, i) => miniPass({ ...paseDeReservas(g), empezo: empezo(g[0].fecha, g[0].bloque) }, i, `g${i}`)).join('')}${clasesProx.map((k, i) => miniPass(paseDeClase(k), prox.length + i, `c${k.id}`)).join('')}</div>` : vacio('No tenés reservas próximas.')}</div>
    <div class="card anim" style="--i:2"><div class="card-head"><h3>Anteriores y canceladas</h3></div>
      ${pasados.length || clases.length - clasesProx.length ? `<div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Horario</th><th>Equipo</th><th>Instructor</th><th>Lección</th><th>Estado</th></tr></thead><tbody>
      ${pasados.map((r) => `<tr><td>${esc(fmtCorta(r.fecha))}</td><td>${badgeTipo(r.tipo)}</td><td class="mono">${rango(r.bloque)}</td><td class="mono">${esc(r.recurso)}</td>
        <td>${esc(r.instructor || 'Solo')}</td><td>${esc(r.leccion || '—')}</td><td>${badgeEstado(r)}</td></tr>`).join('')}
      ${clases.filter((k) => !clasesProx.includes(k)).map((k) => `<tr><td>${esc(fmtCorta(k.fecha))}</td><td>${badgeTipo('teorica')}</td><td class="mono">${rango(k.bloque)}</td><td>${esc(k.aula)}</td>
        <td>${esc(k.instructor)}</td><td>${esc(k.teo)}</td><td>${k.inscripcion.estado === 'presente' ? `<span class="badge ok">Presente${k.inscripcion.nota ? ` · ${NOTA[k.inscripcion.nota]}` : ''}</span>` : k.estado === 'cancelada' ? '<span class="badge gris">Clase cancelada</span>' : '<span class="badge gris">Ausente</span>'}</td></tr>`).join('')}
      </tbody></table></div>` : vacio('Todavía no hay actividad anterior.')}</div>`;
  $$('.mini-bp', v).forEach((el) => {
    const id = el.dataset.g;
    const pase = id.startsWith('g') ? paseDeReservas(prox[Number(id.slice(1))]) : paseDeClase(clasesProx.find((k) => `c${k.id}` === id));
    el.onclick = (e) => { if (!e.target.closest('[data-cancelar]')) boardingPass(pase); };
    const bc = $('[data-cancelar]', el); if (bc) bc.onclick = async () => {
      const grupo = id.startsWith('g') ? prox[Number(id.slice(1))] : null;
      const info = grupo ? await Store.infoCancelacion(grupo.map((r) => r.id)) : await Store.infoCancelacion(id.slice(1), 'teorica');
      if (!(await confirmar('Cancelar reserva', `¿Cancelar ${TIPO_RES[pase.tipo].toLowerCase()} del ${fmtFecha(pase.fecha)} (${pase.horario})? ${textoCargo(info)}`, info.cargo ? `Cancelar y pagar ${plata(info.cargo)}` : 'Sí, cancelar'))) return;
      const cargo = await hacer(async () => { if (!grupo) return await Store.darseDeBaja(id.slice(1)); return await Store.cancelarReservas(grupo.map((r) => r.id)); });
      if (cargo !== undefined) toast(cargo ? `Cancelada. Se cargó ${plata(cargo)} a tu estado de cuenta.` : 'Reserva cancelada sin cargo', 'ok');
      await VISTAS.reservas(v);
    };
  });
};
function miniPass(p, i, key) {
  return `<div class="mini-bp anim" style="--i:${i}" data-g="${key}" tabindex="0">
    <div><div class="top"><span>${esc(TIPO_RES[p.tipo].toUpperCase())} · MOR → ${esc(p.destino)}</span><span>${esc(p.codigo)}</span></div>
      <div class="cuerpo">
        <div style="grid-column:span 2"><small>Fecha</small><span class="cap">${esc(fmtFecha(p.fecha))}</span></div>
        <div><small>${p.recursoLbl}</small><span class="mono">${esc(p.recurso)}</span></div>
        <div><small>${p.extraLbl}</small><span>${esc(p.extra)}</span></div>
        <div style="grid-column:span 2"><small>Instructor</small><span>${esc(p.instructor)}</span></div>
        ${p.empezo ? '' : '<div style="grid-column:span 2"><button class="btn danger sm" data-cancelar>Cancelar</button></div>'}
      </div></div>
    <div class="stub">${p.llegada ? `<span class="badge ok">✓ Presente ${esc(p.llegada)}</span>` : ''}<small class="muted" style="font-size:10px;font-weight:800;letter-spacing:.1em">SALIDA</small><div class="hora">${hh(p.salida)}</div><small class="muted">${p.bloques}</small>${barcode(p.codigo, 22)}</div></div>`;
}

// =====================================================================
//                         MIS HORAS
// =====================================================================
VISTAS.horas = async function vistaHoras(v) {
  const h = await Store.historial(); const esPPA = state.user.rol === 'ppa';
  const meses = []; const d = new Date(); d.setDate(1);
  for (let i = 5; i >= 0; i--) { const x = new Date(d); x.setMonth(d.getMonth() - i); meses.push(isoLocal(x).slice(0, 7)); }
  const maxMes = Math.max(1, ...meses.map((m) => h.por_mes[m] || 0));
  const recs = Object.entries(h.por_recurso).sort((a, b) => b[1] - a[1]); const maxR = Math.max(1, ...recs.map((a) => a[1]));
  const filas = [...h.vuelos, ...h.sims].sort((a, b) => (b.fecha + hh(b.bloque)).localeCompare(a.fecha + hh(a.bloque)));
  v.innerHTML = hero('Mis horas de vuelo', 'Tu libro de vuelo en Flight Center: horas totales, por mes, por aeronave, simulador y el detalle de cada vuelo con las observaciones del instructor.') + `
    <div class="stats">${stat('Horas totales', h.horas_totales, { dec: 1, suf: 'hs', dest: true, i: 1 })}${stat('En Flight Center', h.horas_vuelo, { dec: 1, suf: 'hs', i: 2 })}
      ${stat('Doble comando', h.horas_doble, { dec: 1, suf: 'hs', i: 3 })}${stat('Piloto al mando (solo)', h.horas_solo, { dec: 1, suf: 'hs', i: 4 })}
      ${stat('Simulador', h.horas_sim, { dec: 1, suf: 'hs', i: 5 })}${stat('Vuelos', h.vuelos.length, { i: 6 })}</div>
    ${h.horas_previas ? `<p class="muted anim" style="margin:-8px 0 18px">Incluye ${fmtHoras(h.horas_previas)} hs previas cargadas por la administración.</p>` : ''}
    ${esPPA ? '' : `<p class="muted anim" style="margin:-8px 0 18px">Para pedir examen ANAC: 40 hs de vuelo y mínimo 10 vuelos solo. Llevás ${fmtHoras(h.horas_totales)} hs.</p>`}
    <div class="grid-2">
      <div class="card anim" style="--i:6"><div class="card-head"><h3>Horas de vuelo por mes</h3><span class="muted">Últimos 6 meses</span></div>
        <div class="chart">${meses.map((m, i) => `<div class="bar-col"><span class="bar-val">${fmtHoras(h.por_mes[m] || 0)}</span><div class="bar" style="--i:${i};height:${((h.por_mes[m] || 0) / maxMes) * 82}%"></div></div>`).join('')}</div>
        <div class="bar-lbls">${meses.map((m) => `<span>${parseISO(`${m}-01`).toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}</span>`).join('')}</div></div>
      <div class="card anim" style="--i:7"><div class="card-head"><h3>Por aeronave</h3></div>
        ${recs.length ? recs.map(([n, hs]) => `<div class="hbar"><span class="mono">${esc(n)}</span><div class="track"><div class="fill" data-w="${(hs / maxR) * 100}"></div></div><span>${fmtHoras(hs)} h</span></div>`).join('') : vacio('Sin vuelos aún')}</div>
    </div>
    <div class="card anim" style="--i:8"><div class="card-head"><h3>Libro de vuelo</h3><span class="badge">${filas.length} registros</span></div>
      ${filas.length ? `<div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Bloque</th><th>Equipo</th><th>Instructor</th><th>Lección</th><th>Horas</th><th>Observaciones</th></tr></thead><tbody>
        ${filas.map((r) => `<tr><td style="white-space:nowrap">${esc(fmtCorta(r.fecha))}</td><td>${badgeTipo(r.tipo)}</td><td class="mono">${rango(r.bloque)}</td>
          <td><span class="mono">${esc(r.recurso)}</span><div class="muted">${esc(r.modelo)}</div></td><td>${r.instructor ? esc(r.instructor) : '<span class="badge">Solo</span>'}</td>
          <td>${esc(r.leccion || '—')}</td><td class="mono">${fmtHoras(r.horas)}</td><td>${esc(r.observaciones || '—')}</td></tr>`).join('')}
      </tbody></table></div>` : vacio('Cuando completes vuelos van a aparecer acá.')}</div>`;
  animarNumeros(v);
  setTimeout(() => { $$('.bar', v).forEach((b) => b.classList.add('on')); $$('.fill', v).forEach((f) => f.style.width = `${f.dataset.w}%`); }, 250);
};

VISTAS.syllabus = async (v) => {
  v.innerHTML = hero('Mi syllabus', `Tu libro de instrucción del curso ${state.user.programa === 'pca' ? 'de Piloto Comercial de Avión con habilitación de vuelo por instrumentos (PCA c/HVI)' : 'PPA con habilitación VFR controlado'}. Lo completa tu instructor después de cada ${state.user.programa === 'pca' ? 'vuelo o simulador' : 'vuelo, simulador o clase'}.`) + '<div id="libro"></div>';
  await libroSyllabus($('#libro', v), state.user.id);
};
