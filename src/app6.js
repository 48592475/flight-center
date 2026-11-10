/* Flight Center · interfaz (parte 6: asistencia con QR) */

const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>';
const urlAsistencia = (codigo) => `${location.origin}${location.pathname}?asistencia=${encodeURIComponent(codigo)}`;

// ---------- administración: ver, imprimir y renovar el QR ----------
async function verQR() {
  let cfg = await hacer(() => Store.qrAsistencia()); if (!cfg) return;
  const m = modal(`<div class="modal-head"><div><h3>QR de asistencia</h3><div class="muted">Imprimilo y pegalo en la recepción de la escuela</div></div><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <div class="modal-body">
      <div class="qr-caja qr-imprimible">
        <img src="${LOGOS.claro}" alt="Flight Center" style="height:34px">
        <div id="qr-dibujo"></div>
        <strong style="font-size:18px">Registrá tu llegada</strong>
        <span class="muted" style="text-align:center;max-width:320px">Escaneá este código con la cámara del celular al llegar a la escuela. Tu instructor va a ver que estás presente.</span>
      </div>
      <div class="aviso" style="margin-top:16px"><div>
        <strong>Cómo funciona</strong>El alumno o piloto escanea el QR, inicia sesión si hace falta, y queda presente en el vuelo, simulador o clase que tenga en ese horario (desde 1 h 30 min antes). ${MODO === 'servidor' ? `Se verifica con la ubicación del celular que esté a menos de ${(cfg.radio / 1000).toFixed(1).replace('.', ',')} km de la escuela.` : 'En la demo no se verifica la ubicación.'}
      </div></div>
      <div class="flujo" style="margin-top:12px">
        <button class="btn sec sm" id="qr-ubic">Fijar la ubicación de la escuela con este dispositivo</button>
        <button class="btn danger sm" id="qr-nuevo">Generar un QR nuevo (anula el impreso)</button>
      </div>
      <p class="muted" id="qr-pos" style="font-size:12.5px">Ubicación de la escuela: ${cfg.lat.toFixed(5)}, ${cfg.lon.toFixed(5)} · radio ${cfg.radio} m</p>
    </div>
    <div class="modal-foot"><button class="btn sec" data-cerrar>Cerrar</button><button class="btn" id="qr-imp">Imprimir</button></div>`);
  const dibujar = async () => {
    const el = $('#qr-dibujo', m.el); el.innerHTML = '';
    try {
      const q = qrcode(0, 'M'); q.addData(urlAsistencia(cfg.qr)); q.make();
      el.innerHTML = q.createSvgTag({ cellSize: 8, margin: 2, scalable: true }).replace('<svg ', '<svg style="width:260px;height:260px;display:block" ').replace(/fill="black"/g, 'fill="#0a2540"');
    } catch { el.innerHTML = `<p class="muted">No se pudo dibujar el QR. Dirección: ${esc(urlAsistencia(cfg.qr))}</p>`; }
  };
  await dibujar();
  $('#qr-imp', m.el).onclick = () => { document.body.classList.add('imprimiendo-qr'); window.print(); setTimeout(() => document.body.classList.remove('imprimiendo-qr'), 500); };
  $('#qr-nuevo', m.el).onclick = async () => {
    if (!(await confirmar('Generar QR nuevo', 'El QR impreso deja de funcionar y vas a tener que imprimir y pegar el nuevo.', 'Generar QR nuevo'))) return;
    const n = await hacer(() => Store.regenerarQR(), 'QR nuevo generado. Imprimilo y reemplazá el anterior.'); if (n) { cfg = n; await dibujar(); }
  };
  $('#qr-ubic', m.el).onclick = async () => {
    const pos = await ubicacion().catch((e) => { toast(e.message, 'error'); return null; }); if (!pos) return;
    const n = await hacer(() => Store.guardarUbicacionEscuela({ lat: pos.lat, lon: pos.lon }), 'Ubicación de la escuela guardada');
    if (n) { cfg = n; $('#qr-pos', m.el).textContent = `Ubicación de la escuela: ${n.lat.toFixed(5)}, ${n.lon.toFixed(5)} · radio ${n.radio} m`; }
  };
}
{
  const panel = VISTAS.panel;
  VISTAS.panel = async function (v, ...a) {
    await panel(v, ...a);
    const card = document.createElement('div'); card.className = 'card anim';
    card.innerHTML = `<div class="card-head"><h3>Asistencia con QR</h3><button class="btn sm" id="ver-qr">Ver e imprimir el QR</button></div>
      <p class="muted" style="margin:0">Los alumnos y pilotos escanean el QR de la recepción al llegar, y su instructor los ve presentes al instante.</p>`;
    const g = $('.grid-2', v); (g || $('.stats', v)).after(card);
    $('#ver-qr', card).onclick = verQR;
  };
}

// ---------- alumno / piloto: registrar la llegada ----------
function ubicacion() {
  return new Promise((ok, mal) => {
    if (!navigator.geolocation) return mal(new Error('Este celular no permite usar la ubicación.'));
    navigator.geolocation.getCurrentPosition((p) => ok({ lat: p.coords.latitude, lon: p.coords.longitude, precision: p.coords.accuracy }),
      () => mal(new Error('No pudimos obtener tu ubicación. Permití el acceso a la ubicación para esta página y volvé a escanear el QR.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });
}
async function procesarLlegada(codigo) {
  if (!['alumno', 'ppa', 'instructor'].includes(state.user?.rol)) return toast('El QR de asistencia es para alumnos, pilotos e instructores.', 'error');
  let pos = null;
  if (MODO === 'servidor') {
    toast('Verificando tu ubicación…');
    try { pos = await ubicacion(); } catch (e) { return toast(e.message, 'error'); }
  }
  const r = await hacer(() => Store.registrarLlegada(codigo, pos)); if (!r) return;
  if (r.instructor) return llegadaInstructorUI(r);
  const yaEstaba = r.items.every((x) => x.ya);
  const e = document.createElement('div'); e.className = 'llegada-escena';
  e.innerHTML = `<div class="llegada-card">
    <div class="llegada-check">${ICON_CHECK}</div>
    <h2>${yaEstaba ? 'Tu llegada ya estaba registrada' : `¡Bienvenido/a, ${esc(r.nombre)}!`}</h2>
    <div class="hora">${esc(r.items[0].llegada)}</div>
    <p class="muted" style="margin:0 0 6px">${yaEstaba ? 'No hace falta volver a escanear.' : 'Quedaste presente. Tu instructor ya lo puede ver.'}</p>
    ${r.items.map((x) => `<div class="llegada-item"><b>${TIPO_RES[x.tipo]}</b> · ${rango(x.bloque)} · ${esc(x.titulo || x.recurso)}${x.instructor ? `<br><span class="muted">con ${esc(x.instructor)}</span>` : ''}</div>`).join('')}
    <button class="btn block" id="ll-ok" style="margin-top:18px">Listo</button></div>`;
  document.body.append(e);
  $('#ll-ok', e).onclick = () => { e.style.animation = 'fadeIn .25s reverse both'; setTimeout(() => e.remove(), 220); if (state.tab === 'reservas') renderApp(); };
}

function llegadaInstructorUI(r) {
  const e = document.createElement('div'); e.className = 'llegada-escena';
  const titulo = r.ya ? 'Tu llegada ya estaba registrada' : r.tarde ? `Llegaste ${r.minutos_tarde} min tarde` : `¡Buen día, ${esc(r.nombre)}!`;
  e.innerHTML = `<div class="llegada-card">
    <div class="llegada-check ${r.tarde ? 'tarde' : ''}">${r.tarde ? '!' : ICON_CHECK}</div>
    <h2>${titulo}</h2>
    <div class="hora" ${r.tarde ? 'style="color:#d97706"' : ''}>${esc(r.hora)}</div>
    <p class="muted" style="margin:0 0 6px">${r.ya ? 'No hace falta volver a escanear.' : r.tarde ? `Tu primer turno era a las ${hh(r.primer_bloque)}. Quedó registrado en tu historial y se avisó a la administración.` : 'Llegada registrada a tiempo. Tus alumnos ya te ven en la escuela.'}</p>
    ${r.items.map((x) => `<div class="llegada-item"><b>${TIPO_RES[x.tipo]}</b> · ${rango(x.bloque)} · ${esc(x.titulo || x.recurso)}${x.con ? `<br><span class="muted">con ${esc(x.con)}</span>` : ''}</div>`).join('')}
    <button class="btn block" id="ll-ok" style="margin-top:18px">Listo</button></div>`;
  document.body.append(e);
  $('#ll-ok', e).onclick = () => { e.style.animation = 'fadeIn .25s reverse both'; setTimeout(() => e.remove(), 220); if (state.tab === 'agenda') renderApp(); };
}
const ESTADO_ASIS = { a_tiempo: '<span class="badge ok">A tiempo</span>', tarde: '<span class="badge danger">Tarde</span>', sin_registro: '<span class="badge gris">Sin registro</span>' };
const filaAsis = (x) => `<tr><td style="white-space:nowrap">${esc(fmtCorta(x.fecha))}</td><td class="mono">${x.primer_bloque != null ? hh(x.primer_bloque) : '—'}</td><td class="mono">${esc(x.hora || '—')}</td>
  <td>${ESTADO_ASIS[x.estado]}${x.estado === 'tarde' ? ` <span class="muted">${x.minutos_tarde} min</span>` : ''}</td><td class="muted">${x.actividades} ${x.actividades === 1 ? 'turno' : 'turnos'}</td></tr>`;
const tablaAsis = (filas) => filas.length ? `<div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Primer turno</th><th>Llegada</th><th>Estado</th><th>Actividad</th></tr></thead><tbody>${filas.map(filaAsis).join('')}</tbody></table></div>` : vacio('Todavía no hay registros.');
// instructor: su propio historial en la agenda
{
  const agenda = VISTAS.agenda;
  VISTAS.agenda = async function (v, ...a) {
    await agenda(v, ...a);
    const h = await Store.miAsistencia();
    const card = document.createElement('div'); card.className = 'card anim';
    card.innerHTML = `<div class="card-head"><h3>Mi asistencia</h3><span class="muted">Escaneá el QR de la escuela al llegar · tolerancia ${h.tolerancia} min · últimos 60 días</span></div>
      <div class="flujo" style="margin-bottom:12px"><span class="badge ok">${h.a_tiempo} a tiempo</span><span class="badge danger">${h.tarde} tarde</span><span class="badge gris">${h.sin_registro} sin registro</span></div>
      ${tablaAsis(h.filas.slice(0, 8))}`;
    v.append(card);
  };
}
// administración: historial de cada instructor
async function historialInstructorUI(id) {
  const h = await hacer(async () => await Store.asistenciaDeInstructor(id)); if (!h) return;
  modal(`<div class="modal-head"><div style="display:flex;gap:12px;align-items:center">${avatarDe(h, 48)}<div><h3>${esc(h.nombre)} ${esc(h.apellido)}</h3><div class="muted">Asistencia del último año</div></div></div><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <div class="modal-body"><div class="flujo" style="margin-bottom:14px"><span class="badge ok">${h.a_tiempo} a tiempo</span><span class="badge danger">${h.tarde} tarde</span><span class="badge gris">${h.sin_registro} sin registro</span></div>${tablaAsis(h.filas)}</div>`, { ancho: true });
}
{
  const dispo = VISTAS.dispo;
  VISTAS.dispo = async function (v, ...a) {
    await dispo(v, ...a);
    const l = await Store.asistenciaInstructores(); const tol = l[0]?.tolerancia ?? 10;
    const card = document.createElement('div'); card.className = 'card anim';
    card.innerHTML = `<div class="card-head"><h3>Asistencia de instructores</h3>
        <div class="flujo"><span class="muted">Últimos 60 días · tolerancia</span><input id="tol" type="number" min="0" max="60" value="${tol}" style="width:76px" aria-label="Tolerancia en minutos"><span class="muted">min</span></div></div>
      <p class="muted" style="margin:-4px 0 14px">Los instructores escanean el mismo QR que los alumnos al llegar. Si llegan después de su primer turno más la tolerancia, queda como tarde y te llega un aviso.</p>
      ${l.length ? `<div class="tabla-wrap"><table><thead><tr><th>Instructor</th><th>A tiempo</th><th>Tarde</th><th>Sin registro</th><th>Última llegada</th><th></th></tr></thead><tbody>
        ${l.map((i) => { const ult = i.filas.find((x) => x.hora);
          return `<tr><td><div style="display:flex;gap:10px;align-items:center">${avatarDe(i, 34)}<strong>${esc(i.nombre)} ${esc(i.apellido)}</strong></div></td>
          <td><span class="badge ok">${i.a_tiempo}</span></td><td><span class="badge ${i.tarde ? 'danger' : 'gris'}">${i.tarde}</span></td><td><span class="badge gris">${i.sin_registro}</span></td>
          <td>${ult ? `${esc(fmtCorta(ult.fecha))} ${esc(ult.hora)} ${ESTADO_ASIS[ult.estado]}` : '—'}</td><td style="text-align:right"><button class="btn sec sm" data-hist="${i.id}">Ver historial</button></td></tr>`; }).join('')}
      </tbody></table></div>` : vacio('No hay instructores activos.')}`;
    v.append(card);
    $$('[data-hist]', card).forEach((b) => b.onclick = () => historialInstructorUI(Number(b.dataset.hist)));
    $('#tol', card).onchange = async (e) => { if (await hacer(async () => await Store.guardarTolerancia(e.target.value), 'Tolerancia actualizada') !== undefined) await VISTAS.dispo(v, ...a); };
  };
}

// ---------- instructor y administración: actualización automática ----------
let refresco = null;
function vigilar(v, vista, inicial, cada = 30000) {
  clearInterval(refresco);
  // punto de partida: los presentes que ya se ven en pantalla
  let antes = inicial;
  refresco = setInterval(async () => {
    if (!document.body.contains(v) || state.tab !== vista) return clearInterval(refresco);
    if (document.hidden || $('#modal-root').children.length || document.activeElement?.matches('input,select,textarea')) return;
    try {
      const r = await Store.resumenInstructor(isoLocal(new Date()).slice(0, 7));
      const presentes = r.pendientes.filter((f) => f.llegada).map((f) => `${f.id}|${f.piloto}|${f.llegada}`);
      for (const p of presentes) if (!antes.includes(p)) { const [, n, h] = p.split('|'); toast(`${n} llegó a la escuela (${h})`, 'ok'); }
      const cambio = presentes.join() !== antes.join(); antes = presentes;
      if (cambio) { const y = scrollY; await VISTAS.agenda(v); scrollTo(0, y); }
    } catch { /* sin conexión: se reintenta en la próxima vuelta */ }
  }, cada);
}
{
  const agenda = VISTAS.agenda;
  VISTAS.agenda = async function (v, ...a) {
    await agenda(v, ...a);
    let inicial = [];
    try { inicial = (await Store.resumenInstructor(isoLocal(new Date()).slice(0, 7))).pendientes.filter((f) => f.llegada).map((f) => `${f.id}|${f.piloto}|${f.llegada}`); } catch { /* se arma en la próxima vuelta */ }
    vigilar(v, 'agenda', inicial);
  };
}

// ---------- habilitaciones: las ve el alumno o piloto en su perfil ----------
{
  const perfil = VISTAS.perfil;
  VISTAS.perfil = async function (v, ...a) {
    await perfil(v, ...a);
    const u = state.user; if (!['alumno', 'ppa'].includes(u?.rol)) return;
    const h = u.hab || {}; const aviones = await Store.recursos('avion');
    const item = (ok, t) => `<span class="badge ${ok ? 'ok' : 'gris'}">${ok ? '✓' : '✗'} ${t}</span>`;
    const card = document.createElement('div'); card.className = 'card anim';
    card.innerHTML = `<div class="card-head"><h3>Mis habilitaciones</h3><span class="muted">Las otorga la administración</span></div>
      <div class="flujo">${item(h.solo, 'Vuelo solo')}${item(h.sim_solo, 'Simulador sin instructor')}${item(h.travesia, 'Travesías')}${u.rol === 'ppa' ? item(h.bristell, 'Adaptado a Bristell') : ''}</div>
      <p class="muted" style="margin:10px 0 0">Aeronaves: ${Array.isArray(h.aeronaves) ? (h.aeronaves.length ? aviones.filter((a) => h.aeronaves.includes(a.id)).map((a) => esc(a.nombre)).join(', ') : 'ninguna') : 'todas las de la escuela'}.</p>`;
    $$('.card', v)[0].after(card);
  };
}

// ---------- inicio ----------
// pantalla cuando la app instalada se abre sin internet (o con el servidor dormido)
function sinConexion(msg) {
  document.getElementById('app').innerHTML = `<div class="sin-red"><div class="sin-red-caja anim">
    ${logo('', 'claro')}
    <h2>Sin conexión</h2><p>${esc(msg || 'No hay conexión con el servidor.')}</p>
    <p class="muted">Apenas vuelva internet, la app se recarga sola.</p>
    <button class="btn" id="reintentar">Reintentar</button></div></div>`;
  document.getElementById('reintentar').onclick = () => location.reload();
  addEventListener('online', () => location.reload(), { once: true });
}
(async () => {
  const q = new URLSearchParams(location.search);
  let codigo = q.get('asistencia');
  if (codigo) { try { sessionStorage.setItem('fc-asistencia', codigo); } catch { /* sin storage */ } history.replaceState(null, '', location.pathname + location.hash); }
  else { try { codigo = sessionStorage.getItem('fc-asistencia'); } catch { codigo = null; } }
  try { state.user = await Store.yo(); } catch (e) { return sinConexion(e.message); }
  if (state.user && MODO === 'demo') await Store.recordatoriosDeuda();
  await render();
  const pendiente = () => { try { return sessionStorage.getItem('fc-asistencia'); } catch { return codigo; } };
  const limpiar = () => { try { sessionStorage.removeItem('fc-asistencia'); } catch { /* sin storage */ } };
  if (codigo && state.user) { limpiar(); await procesarLlegada(codigo); }
  else if (codigo) {
    toast('Iniciá sesión para registrar tu llegada');
    // cuando inicie sesión, se registra la llegada
    const espera = setInterval(async () => { if (state.user && pendiente()) { clearInterval(espera); const c = pendiente(); limpiar(); await procesarLlegada(c); } }, 700);
  }
})();
