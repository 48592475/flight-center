/* Flight Center · interfaz (parte 7: campus — materiales, trabajos prácticos y entregas) */

const TABS_CAMPUS = {
  alumno: [['c-inicio', 'Inicio'], ['c-materiales', 'Materiales'], ['c-tps', 'Trabajos prácticos'], ['c-ia', 'Asistente IA'], ['perfil', 'Mi perfil']],
  ppa: [['c-inicio', 'Inicio'], ['c-materiales', 'Materiales'], ['c-ia', 'Asistente IA'], ['perfil', 'Mi perfil']],
  instructor: [['c-materiales', 'Materiales'], ['c-tps', 'Trabajos prácticos'], ['c-ia', 'Asistente IA'], ['perfil', 'Mi perfil']],
  admin: [['c-materiales', 'Materiales'], ['c-tps', 'Trabajos prácticos'], ['c-ia', 'Asistente IA'], ['perfil', 'Mi perfil']],
};
const esDocente = () => ['instructor', 'admin'].includes(state.user?.rol);
const ICON_CAMPUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>';
const ICON_RESERVAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 15h3"/></svg>';
const ICON_TIPO = {
  archivo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="15" height="14" rx="2"/><path d="m17 10 5-3v10l-5-3z"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
  texto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
};
const TIPO_MAT = { archivo: 'Archivo', video: 'Video', link: 'Link', texto: 'Texto' };
const ESTADO_TP = { pendiente: ['Pendiente', 'warn'], entregado: ['Entregado · falta corregir', ''], aprobado: ['Aprobado', 'ok'], rehacer: ['A rehacer', 'danger'], vencido: ['Vencido', 'gris'] };
const SECCIONES = { GENERAL: 'Material general', SIMULADOR: 'Simulador', VUELO: 'Vuelo y maniobras' };
const nombreLeccion = (id) => SECCIONES[id] || `${id} · ${Store.LECCIONES[id]?.titulo || ''}`;
const fmtTam = (b) => b > 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
const youtubeId = (u) => (String(u).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/) || [])[1] || null;
const MAX_MB = () => (MODO === 'servidor' ? 20 : 2);
const leerArchivo = (file) => new Promise((ok, mal) => {
  if (!file) return ok(null);
  if (file.size > MAX_MB() * 1048576) return mal(new Error(`"${file.name}" pesa ${(file.size / 1048576).toFixed(1).replace('.', ',')} MB. El máximo es ${MAX_MB()} MB por archivo${MODO === 'servidor' ? '. Podés comprimir el PDF (por ejemplo en ilovepdf.com) o dividirlo en partes' : ' en la demo'}.`));
  const fr = new FileReader(); fr.onload = () => ok({ nombre: file.name, tam: file.size, tipo: file.type, data: fr.result }); fr.onerror = mal; fr.readAsDataURL(file);
});
async function abrirArchivo(id) {
  if (MODO === 'servidor') { window.open(`/api/archivo/${id}`, '_blank', 'noopener'); return; }
  const a = await hacer(() => Store.archivo(id)); if (!a) return;
  const bin = atob(a.data.split(',')[1]); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: a.tipo })); const w = window.open(url, '_blank');
  if (!w) { const l = document.createElement('a'); l.href = url; l.download = a.nombre; l.click(); }
}
const botonArchivo = (a, txt = 'Abrir') => a ? `<button class="btn sec sm" data-archivo="${a.id}">${ICON_TIPO.archivo.replace('<svg', '<svg width="15"')} ${txt} · ${esc(a.nombre)} <span class="muted">(${fmtTam(a.tam)})</span></button>` : '';
document.addEventListener('click', (e) => { const b = e.target.closest('[data-archivo]'); if (b) abrirArchivo(Number(b.dataset.archivo)); });

// ---------- elegir campus o reservas ----------
function elegirPortal(p) {
  state.portal = p; state.tab = null;
  try { sessionStorage.setItem('fc-portal', p); } catch { /* sin storage */ }
  renderApp(); window.scrollTo({ top: 0 });
}
function renderPortal(u) {
  app.innerHTML = `<section class="portal">
    <div class="portal-head anim">${logo('', 'oscuro')}<button class="logout" title="Cerrar sesión" aria-label="Cerrar sesión" id="logout">${ICON.salir}</button></div>
    <div class="portal-cuerpo">
      <h2 class="anim" style="--i:1">Hola, ${esc(u.nombre)}</h2>
      <p class="anim" style="--i:2">¿A dónde querés ir?</p>
      <div class="portal-opciones">
        <button class="portal-op anim" style="--i:3" data-p="campus"><span class="portal-ico">${ICON_CAMPUS}</span><strong>Campus</strong>
          <span>${u.rol === 'alumno' ? 'Material de teoría, simulador y maniobras, y tus trabajos prácticos.' : u.rol === 'ppa' ? 'Material de estudio de la escuela.' : 'Subí material y corregí los trabajos prácticos.'}</span></button>
        <button class="portal-op anim" style="--i:4" data-p="reservas"><span class="portal-ico">${ICON_RESERVAS}</span><strong>Sistema de reservas</strong>
          <span>${['alumno', 'ppa'].includes(u.rol) ? 'Vuelos, simulador, clases, tu syllabus y tu estado de cuenta.' : u.rol === 'instructor' ? 'Tu agenda, tus alumnos, clases y flota.' : 'Panel, instructores, reservas, cuentas y usuarios.'}</span></button>
      </div>
    </div></section>`;
  $$('[data-p]').forEach((b) => b.onclick = () => elegirPortal(b.dataset.p));
  $('#logout').onclick = async () => { await Store.logout(); state.user = null; state.portal = null; await render(); };
}

// ---------- inicio del campus (alumno y piloto) ----------
VISTAS['c-inicio'] = async function (v) {
  const u = state.user;
  const [tps, resumen, generales] = await Promise.all([u.rol === 'alumno' ? Store.trabajos() : [], Store.campusResumen(), Store.materiales('GENERAL')]);
  const teo = u.rol === 'alumno' ? await Store.leccionActual(u.id, 'teorica') : null;
  const proximas = [...(teo ? [{ id: teo.id, codigo: teo.id, titulo: teo.titulo }] : []), { id: 'VUELO', codigo: 'FL', titulo: 'Vuelo y maniobras' }, { id: 'SIMULADOR', codigo: 'SIM', titulo: 'Simulador' }];
  const pendientes = tps.filter((t) => ['pendiente', 'rehacer'].includes(t.estado));
  const corregidos = tps.filter((t) => ['aprobado', 'rehacer'].includes(t.estado) && t.entrega?.fecha_correccion).sort((a, b) => b.entrega.fecha_correccion.localeCompare(a.entrega.fecha_correccion)).slice(0, 3);
  v.innerHTML = hero('Campus Flight Center', u.rol === 'alumno' ? 'Material de estudio ordenado según tu syllabus y tus trabajos prácticos.' : 'Material de estudio de la escuela, ordenado por lección.') + `
    ${proximas.length ? `<div class="card anim" style="--i:1"><div class="card-head"><h3>${teo ? 'Para estudiar' : 'Secciones'}</h3><span class="muted">${teo ? 'Tu próxima clase teórica y el material de vuelo y simulador' : 'Material de vuelo y simulador'}</span></div>
      <div class="prox-grid">${proximas.map((l) => `<button class="prox-lec" data-lec="${esc(l.id)}"><span class="codigo-lec">${esc(l.codigo)}</span>
        <span><strong>${esc(l.titulo)}</strong><small>${(resumen[l.id]?.materiales || 0)} material(es) · ${(resumen[l.id]?.tps || 0)} trabajo(s)</small></span></button>`).join('')}</div></div>` : ''}
    ${u.rol === 'alumno' ? `<div class="card anim" style="--i:2"><div class="card-head"><h3>Trabajos pendientes</h3><span class="badge ${pendientes.length ? 'warn' : 'ok'}">${pendientes.length}</span></div>
      ${pendientes.length ? pendientes.map((t, i) => filaTP(t, i)).join('') : vacio('No tenés trabajos pendientes.')}</div>
      ${corregidos.length ? `<div class="card anim" style="--i:3"><div class="card-head"><h3>Últimas correcciones</h3></div>${corregidos.map((t, i) => filaTP(t, i)).join('')}</div>` : ''}` : ''}
    <div class="card anim" style="--i:4"><div class="card-head"><h3>Material general</h3><button class="btn sec sm" id="ver-todo">Ver todo el material</button></div>
      ${generales.length ? generales.map((m, i) => tarjetaMaterial(m, i)).join('') : vacio('Todavía no hay material general.')}</div>`;
  $$('[data-lec]', v).forEach((b) => b.onclick = () => { state.campusLec = b.dataset.lec; irA('c-materiales'); });
  $('#ver-todo', v).onclick = () => { state.campusLec = 'GENERAL'; irA('c-materiales'); };
  activarTPs(v, () => VISTAS['c-inicio'](v));
};

// ---------- materiales por lección ----------
function tarjetaMaterial(m, i) {
  const yt = m.tipo === 'video' ? youtubeId(m.url) : null;
  return `<article class="material anim" style="--i:${i}">
    <div class="material-ico t-${m.tipo}">${ICON_TIPO[m.tipo]}</div>
    <div class="material-cuerpo">
      <div class="material-head"><strong>${esc(m.titulo)}</strong><span class="badge gris">${TIPO_MAT[m.tipo]}</span></div>
      ${m.descripcion ? `<p class="muted" style="margin:4px 0 0">${esc(m.descripcion)}</p>` : ''}
      ${m.tipo === 'texto' ? `<div class="material-texto">${esc(m.texto).replace(/\n/g, '<br>')}</div>` : ''}
      ${yt ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${yt}" title="${esc(m.titulo)}" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>` : ''}
      <div class="flujo" style="margin-top:8px">${m.tipo === 'archivo' ? botonArchivo(m.archivo) : ''}${(m.tipo === 'link' || (m.tipo === 'video' && !yt)) ? `<a class="btn sec sm" href="${esc(m.url)}" target="_blank" rel="noopener">Abrir link</a>` : ''}
        ${esDocente() ? `<button class="btn sec sm" data-edmat="${m.id}">Editar</button><button class="btn danger sm" data-bmat="${m.id}">Borrar</button>` : ''}</div>
      <div class="muted" style="font-size:12px;margin-top:6px">${esc(m.autor)} · ${esc(fmtCorta(m.fecha.slice(0, 10)))}</div>
    </div></article>`;
}
VISTAS['c-materiales'] = async function (v) {
  const sel = state.campusLec || 'GENERAL';
  const [resumen, mats, tps] = await Promise.all([Store.campusResumen(), Store.materiales(sel), state.user.rol === 'ppa' ? [] : Store.trabajos(sel)]);
  const item = (id, cod, tit) => { const c = resumen[id] || {};
    return `<button class="indice-item ${id === sel ? 'on' : ''}" data-l="${id}"><span class="punto ${c.materiales || c.tps ? 'aprobada' : ''}"></span><span class="cod">${esc(cod)}</span><span class="tit">${esc(tit)}</span></button>`; };
  v.innerHTML = hero('Materiales', esDocente() ? 'Subí apuntes, videos, links y trabajos prácticos a cada lección del syllabus.' : 'El material de cada clase teórica, simulador y lección de vuelo.') + `
    <div class="libro">
      <aside class="indice anim"><div class="indice-head"><h3>Secciones</h3><div class="muted">Con punto verde: tienen material</div></div>
        <div class="indice-select"><select id="lec-sel" aria-label="Elegir sección">${opcionesLeccion(sel)}</select></div>
        <div class="indice-lista">${item('GENERAL', '—', 'Material general')}
          <div class="indice-grupo"><span>Teoría</span></div>${Store.TRACKS.teorica.map((l) => item(l.id, l.id, l.titulo)).join('')}
          <div class="indice-grupo"><span>Práctica</span></div>${item('VUELO', 'FL', 'Vuelo y maniobras')}${item('SIMULADOR', 'SIM', 'Simulador')}</div></aside>
      <div>
        <div class="card anim"><div class="card-head"><div><h3>${esc(nombreLeccion(sel))}</h3>${Store.LECCIONES[sel]?.contenidos?.length ? `<div class="muted" style="margin-top:4px">Contenidos: ${Store.LECCIONES[sel].contenidos.slice(0, 6).map(esc).join(' · ')}</div>` : ''}${Store.LECCIONES[sel]?.estudiar?.length ? `<div class="muted" style="margin-top:4px">Temas a traer estudiados: ${Store.LECCIONES[sel].estudiar.slice(0, 5).map(esc).join(' · ')}</div>` : ''}</div>
          <div class="flujo">${MODO === 'servidor' && sel !== 'GENERAL' ? `<button class="btn sec sm" id="preguntar-ia">Preguntarle a la IA sobre ${esc(sel.startsWith('TEO') ? sel : nombreLeccion(sel).toLowerCase())}</button>` : ''}${esDocente() ? `<button class="btn sm" id="nuevo-mat">+ Material</button><button class="btn sec sm" id="nuevo-tp">+ Trabajo práctico</button>` : ''}</div></div>
          ${mats.length ? mats.map((m, i) => tarjetaMaterial(m, i)).join('') : vacio(esDocente() ? 'Todavía no hay material en esta lección. Tocá "+ Material" para subir el primero.' : 'Todavía no hay material en esta lección.')}</div>
        ${tps.length ? `<div class="card anim" style="--i:1"><div class="card-head"><h3>Trabajos prácticos</h3></div>${tps.map((t, i) => filaTP(t, i)).join('')}</div>` : ''}
      </div></div>`;
  const ir = (l) => { state.campusLec = l; VISTAS['c-materiales'](v); };
  $$('[data-l]', v).forEach((b) => b.onclick = () => ir(b.dataset.l));
  $('#lec-sel', v).value = sel; $('#lec-sel', v).onchange = (e) => ir(e.target.value);
  const re = () => VISTAS['c-materiales'](v);
  const pia = $('#preguntar-ia', v); if (pia) pia.onclick = () => { state.iaLeccion = Store.LECCIONES[sel] ? sel : null; state.iaTema = nombreLeccion(sel); irA('c-ia'); };
  if ($('#nuevo-mat', v)) { $('#nuevo-mat', v).onclick = () => formMaterial(null, sel, re); $('#nuevo-tp', v).onclick = () => formTP(null, sel, re); }
  $$('[data-edmat]', v).forEach((b) => b.onclick = () => formMaterial(mats.find((m) => m.id == b.dataset.edmat), sel, re));
  $$('[data-bmat]', v).forEach((b) => b.onclick = async () => { if (await confirmar('Borrar material', 'El material se borra para todos.', 'Borrar')) { await hacer(() => Store.borrarMaterial(b.dataset.bmat), 'Material borrado'); re(); } });
  activarTPs(v, re, tps);
};
const opcionesLeccion = (sel) => `<option value="GENERAL" ${sel === 'GENERAL' ? 'selected' : ''}>Material general</option>
  <optgroup label="Teoría">${Store.TRACKS.teorica.map((l) => `<option value="${l.id}" ${l.id === sel ? 'selected' : ''}>${l.id} · ${esc(l.titulo)}</option>`).join('')}</optgroup>
  <optgroup label="Práctica"><option value="VUELO" ${sel === 'VUELO' ? 'selected' : ''}>Vuelo y maniobras</option><option value="SIMULADOR" ${sel === 'SIMULADOR' ? 'selected' : ''}>Simulador</option></optgroup>`;
function formMaterial(m, leccion, despues) {
  const md = modal(`<div class="modal-head"><h3>${m ? 'Editar material' : 'Nuevo material'}</h3><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <form class="modal-body form-grid" id="f-mat">
      <label class="campo full">Lección<select id="mt-lec" name="leccion">${opcionesLeccion(m?.leccion || leccion)}</select></label>
      <label class="campo">Tipo<select id="mt-tipo" name="tipo">${Object.entries({ archivo: 'Archivo (PDF, Word, PowerPoint, imagen)', video: 'Video de YouTube', link: 'Link a otra página', texto: 'Texto' }).map(([k, t]) => `<option value="${k}" ${(m?.tipo || 'archivo') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Título<input id="mt-tit" name="titulo" value="${esc(m?.titulo || '')}" placeholder="Ej: Apunte de meteorología"></label>
      <label class="campo full">Descripción <span class="op">(opcional)</span><input id="mt-desc" name="descripcion" value="${esc(m?.descripcion || '')}"></label>
      <label class="campo full" data-t="archivo">Archivo <span class="op">(máx. ${MAX_MB()} MB${m?.archivo ? ` · actual: ${esc(m.archivo.nombre)}` : ''})</span><input id="mt-arch" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip"></label>
      <label class="campo full" data-t="video link">Link <span class="op" data-t="video">(el video de YouTube puede ser "no listado")</span><input id="mt-url" name="url" value="${esc(m?.url || '')}" placeholder="https://"></label>
      <label class="campo full" data-t="texto">Contenido<textarea id="mt-texto" name="texto" rows="8">${esc(m?.texto || '')}</textarea></label>
    </form><div class="modal-foot"><button class="btn sec" data-cerrar>Volver</button><button class="btn" id="mt-ok">Guardar</button></div>`, { ancho: true });
  const ajustar = () => { const t = $('#mt-tipo', md.el).value; $$('[data-t]', md.el).forEach((el) => { el.hidden = !el.dataset.t.split(' ').includes(t); }); };
  $('#mt-tipo', md.el).onchange = ajustar; ajustar();
  $('#mt-arch', md.el).onchange = (e) => { const f = e.target.files[0]; const t = $('#mt-tit', md.el); if (f && !t.value.trim()) t.value = f.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim(); };
  $('#mt-ok', md.el).onclick = async (e) => {
    const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Subiendo…';
    const d = Object.fromEntries(new FormData($('#f-mat', md.el)));
    const f0 = $('#mt-arch', md.el).files[0];
    if (!String(d.titulo || '').trim() && d.tipo === 'archivo' && f0) d.titulo = f0.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();
    const r = await hacer(async () => { const archivo = d.tipo === 'archivo' ? await leerArchivo($('#mt-arch', md.el).files[0]) : null; return Store.guardarMaterial({ ...d, id: m?.id, archivo }); }, 'Material guardado');
    btn.disabled = false; btn.textContent = 'Guardar';
    if (r) { md.cerrar(); state.campusLec = r.leccion; despues(); }
  };
}

// ---------- trabajos prácticos ----------
function filaTP(t, i) {
  const docente = esDocente();
  const [txt, cls] = docente ? (t.sin_corregir ? [`${t.sin_corregir} para corregir`, 'warn'] : [`${t.entregas} entrega(s)`, 'gris']) : ESTADO_TP[t.estado];
  const vence = t.fecha_limite ? `Entrega hasta el ${fmtCorta(t.fecha_limite)}` : 'Sin fecha límite';
  return `<div class="tp anim" style="--i:${i}">
    <div class="tp-info"><strong>${esc(t.titulo)}</strong> <span class="badge ${cls}">${txt}</span>${!docente && t.entrega?.nota != null ? ` <span class="badge ok">Nota ${t.entrega.nota}</span>` : ''}
      <div class="muted">${esc(SECCIONES[t.leccion] || t.leccion)} · ${esc(vence)} · ${esc(t.autor)}</div>
      ${!docente && t.entrega?.comentario ? `<div class="tp-comentario"><b>${esc(t.entrega.corrector || 'Instructor')}:</b> ${esc(t.entrega.comentario)}</div>` : ''}</div>
    <div class="flujo">${docente ? `<button class="btn sm" data-entregas="${t.id}">Ver entregas</button><button class="btn sec sm" data-edtp="${t.id}">Editar</button><button class="btn danger sm" data-btp="${t.id}">Borrar</button>`
      : state.user.rol === 'alumno' ? `<button class="btn ${['pendiente', 'rehacer', 'vencido'].includes(t.estado) ? '' : 'sec'} sm" data-tp="${t.id}">${t.estado === 'aprobado' || t.estado === 'entregado' ? 'Ver' : t.estado === 'rehacer' ? 'Volver a entregar' : 'Entregar'}</button>` : ''}</div></div>`;
}
function activarTPs(v, despues, lista) {
  const buscar = async (id) => (lista || await Store.trabajos()).find((t) => t.id == id);
  $$('[data-tp]', v).forEach((b) => b.onclick = async () => entregarTP(await buscar(b.dataset.tp), despues));
  $$('[data-entregas]', v).forEach((b) => b.onclick = async () => verEntregas(await buscar(b.dataset.entregas), despues));
  $$('[data-edtp]', v).forEach((b) => b.onclick = async () => formTP(await buscar(b.dataset.edtp), null, despues));
  $$('[data-btp]', v).forEach((b) => b.onclick = async () => { if (await confirmar('Borrar trabajo práctico', 'Se borra para todos los alumnos.', 'Borrar')) { await hacer(() => Store.borrarTP(b.dataset.btp), 'Trabajo borrado'); despues(); } });
}
VISTAS['c-tps'] = async function (v) {
  const tps = await Store.trabajos(); const docente = esDocente();
  const grupos = docente ? [['Para corregir', tps.filter((t) => t.sin_corregir)], ['Todos los trabajos', tps]]
    : [['Pendientes', tps.filter((t) => ['pendiente', 'rehacer'].includes(t.estado))], ['Entregados', tps.filter((t) => ['entregado', 'aprobado'].includes(t.estado))], ['Vencidos', tps.filter((t) => t.estado === 'vencido')]];
  v.innerHTML = hero('Trabajos prácticos', docente ? 'Publicá consignas, mirá las entregas y corregí. El alumno recibe un aviso cuando lo corregís.' : 'Las consignas de tus instructores. Entregá antes de la fecha límite.',
    docente ? '<div style="margin-top:14px"><button class="btn sec" id="nuevo-tp">+ Nuevo trabajo práctico</button></div>' : '') +
    grupos.filter(([, l], i) => l.length || i === 0).map(([titulo, l], i) => `<div class="card anim" style="--i:${i + 1}"><div class="card-head"><h3>${titulo}</h3><span class="badge">${l.length}</span></div>
      ${l.length ? l.map((t, j) => filaTP(t, j)).join('') : vacio(docente ? 'No hay entregas para corregir.' : '¡Nada pendiente!')}</div>`).join('');
  const re = () => VISTAS['c-tps'](v);
  const n = $('#nuevo-tp', v); if (n) n.onclick = () => formTP(null, state.campusLec || 'GENERAL', re);
  activarTPs(v, re, tps);
};
function formTP(t, leccion, despues) {
  const md = modal(`<div class="modal-head"><h3>${t ? 'Editar trabajo práctico' : 'Nuevo trabajo práctico'}</h3><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <form class="modal-body form-grid" id="f-tp">
      <label class="campo full">Lección<select id="tp-lec" name="leccion">${opcionesLeccion(t?.leccion || leccion)}</select></label>
      <label class="campo">Título<input id="tp-tit" name="titulo" value="${esc(t?.titulo || '')}" placeholder="Ej: TP 3 · Planificación de navegación"></label>
      <label class="campo">Fecha límite <span class="op">(opcional)</span><input id="tp-lim" type="date" name="fecha_limite" value="${esc(t?.fecha_limite || '')}"></label>
      <label class="campo full">Consigna<textarea id="tp-con" name="consigna" rows="7" placeholder="Qué tiene que hacer y entregar el alumno">${esc(t?.consigna || '')}</textarea></label>
      <label class="campo full">Archivo de la consigna <span class="op">(opcional${t?.archivo ? ` · actual: ${esc(t.archivo.nombre)}` : ''})</span><input id="tp-arch" type="file"></label>
      ${t ? '' : '<p class="muted full" style="margin:0">Los alumnos reciben un aviso por email cuando publicás el trabajo.</p>'}
    </form><div class="modal-foot"><button class="btn sec" data-cerrar>Volver</button><button class="btn" id="tp-ok">${t ? 'Guardar' : 'Publicar'}</button></div>`, { ancho: true });
  $('#tp-ok', md.el).onclick = async () => {
    const d = Object.fromEntries(new FormData($('#f-tp', md.el)));
    const r = await hacer(async () => Store.guardarTP({ ...d, id: t?.id, archivo: await leerArchivo($('#tp-arch', md.el).files[0]) }), t ? 'Trabajo actualizado' : 'Trabajo publicado');
    if (r) { md.cerrar(); despues(); }
  };
}
function entregarTP(t, despues) {
  const e = t.entrega; const puede = t.estado !== 'aprobado';
  const md = modal(`<div class="modal-head"><div><h3>${esc(t.titulo)}</h3><div class="muted">${esc(nombreLeccion(t.leccion))} · ${t.fecha_limite ? `entrega hasta el ${esc(fmtCorta(t.fecha_limite))}` : 'sin fecha límite'}</div></div><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <div class="modal-body">
      <h4 style="margin:0 0 6px">Consigna</h4><div class="consigna">${esc(t.consigna).replace(/\n/g, '<br>')}</div>
      ${t.archivo ? `<div style="margin-top:8px">${botonArchivo(t.archivo, 'Archivo de la consigna')}</div>` : ''}
      ${e ? `<div class="aviso ${e.estado === 'aprobado' ? '' : e.estado === 'rehacer' ? 'warn' : ''}" style="margin-top:16px"><div>
        <strong>${ESTADO_TP[e.estado][0]}${e.nota != null ? ` · Nota ${e.nota}` : ''}</strong>Entregado el ${esc(fmtCorta(e.fecha.slice(0, 10)))} ${esc(e.fecha.slice(11, 16))}${e.tardia ? ' (fuera de término)' : ''}
        ${e.comentario ? `<div style="margin-top:6px"><b>${esc(e.corrector || 'Instructor')}:</b> ${esc(e.comentario)}</div>` : ''}</div></div>` : ''}
      ${puede ? `<form id="f-ent" style="display:grid;gap:12px;margin-top:16px">
        <label class="campo">Tu respuesta<textarea id="en-texto" rows="7" placeholder="Escribí tu respuesta acá">${esc(e?.texto || '')}</textarea></label>
        <label class="campo">Adjuntar archivo <span class="op">(opcional · máx. ${MAX_MB()} MB${e?.archivo ? ` · actual: ${esc(e.archivo.nombre)}` : ''})</span><input id="en-arch" type="file"></label>
      </form>` : `${e?.texto ? `<h4 style="margin:16px 0 6px">Tu respuesta</h4><div class="consigna">${esc(e.texto).replace(/\n/g, '<br>')}</div>` : ''}${e?.archivo ? `<div style="margin-top:8px">${botonArchivo(e.archivo, 'Tu archivo')}</div>` : ''}`}
    </div>
    <div class="modal-foot"><button class="btn sec" data-cerrar>${puede ? 'Volver' : 'Cerrar'}</button>${puede ? `<button class="btn" id="en-ok">${e ? 'Volver a entregar' : 'Entregar'}</button>` : ''}</div>`, { ancho: true });
  const ok = $('#en-ok', md.el);
  if (ok) ok.onclick = async () => {
    ok.disabled = true; ok.textContent = 'Enviando…';
    const r = await hacer(async () => Store.entregarTP(t.id, { texto: $('#en-texto', md.el).value, archivo: await leerArchivo($('#en-arch', md.el).files[0]) }), 'Trabajo entregado');
    ok.disabled = false; ok.textContent = e ? 'Volver a entregar' : 'Entregar';
    if (r) { md.cerrar(); despues(); }
  };
}
async function verEntregas(t, despues) {
  const l = await hacer(() => Store.entregasDeTP(t.id)); if (!l) return;
  const md = modal(`<div class="modal-head"><div><h3>${esc(t.titulo)}</h3><div class="muted">${esc(nombreLeccion(t.leccion))} · ${l.filter((x) => x.entrega).length} de ${l.length} alumnos entregaron</div></div><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <div class="modal-body">${l.length ? l.map((x) => { const e = x.entrega; const [txt, cls] = ESTADO_TP[x.estado];
      return `<div class="entrega"><div class="entrega-head"><strong>${esc(x.alumno)}</strong><span class="badge ${cls}">${txt}</span>${e?.nota != null ? `<span class="badge ok">Nota ${e.nota}</span>` : ''}${e?.tardia ? '<span class="badge warn">Fuera de término</span>' : ''}
        ${e ? `<span class="muted" style="margin-left:auto;font-size:12px">${esc(fmtCorta(e.fecha.slice(0, 10)))} ${esc(e.fecha.slice(11, 16))}</span>` : ''}</div>
        ${e ? `${e.texto ? `<div class="consigna">${esc(e.texto).replace(/\n/g, '<br>')}</div>` : ''}${e.archivo ? `<div style="margin-top:6px">${botonArchivo(e.archivo)}</div>` : ''}
          <div class="corregir" data-en="${e.id}">
            <select aria-label="Resultado"><option value="aprobado" ${e.estado === 'aprobado' ? 'selected' : ''}>Aprobado</option><option value="rehacer" ${e.estado === 'rehacer' ? 'selected' : ''}>A rehacer</option></select>
            <input type="number" min="1" max="10" placeholder="Nota 1–10" value="${e.nota ?? ''}" aria-label="Nota">
            <input placeholder="Comentario para el alumno" value="${esc(e.comentario || '')}" aria-label="Comentario">
            <button class="btn ok sm">${e.fecha_correccion ? 'Actualizar' : 'Guardar corrección'}</button></div>` : '<p class="muted" style="margin:6px 0 0">Todavía no entregó.</p>'}</div>`; }).join('') : vacio('No hay alumnos activos.')}</div>`, { ancho: true });
  $$('.corregir', md.el).forEach((c) => { $('button', c).onclick = async () => {
    const [sel, nota, com] = $$('select, input', c);
    const r = await hacer(() => Store.corregirEntrega(c.dataset.en, { estado: sel.value, nota: nota.value, comentario: com.value }), 'Corrección guardada. El alumno recibe un aviso.');
    if (r) { md.cerrar(); despues(); setTimeout(() => verEntregas(t, despues), 250); }
  }; });
}

// ---------- asistente de IA ----------
// texto con formato simple (negritas, listas, títulos) de forma segura
function formatoIA(t) {
  const lineas = esc(t).split('\n'); let html = ''; let lista = null;
  const cerrar = () => { if (lista) { html += `</${lista}>`; lista = null; } };
  for (const l of lineas) {
    const inl = (x) => x.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
    let m;
    if ((m = /^\s*[-*•]\s+(.*)$/.exec(l))) { if (lista !== 'ul') { cerrar(); html += '<ul>'; lista = 'ul'; } html += `<li>${inl(m[1])}</li>`; }
    else if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(l))) { if (lista !== 'ol') { cerrar(); html += '<ol>'; lista = 'ol'; } html += `<li>${inl(m[1])}</li>`; }
    else if ((m = /^#{1,4}\s+(.*)$/.exec(l))) { cerrar(); html += `<h4>${inl(m[1])}</h4>`; }
    else if (!l.trim()) { cerrar(); }
    else { cerrar(); html += `<p>${inl(l)}</p>`; }
  }
  cerrar(); return html;
}
const SUGERENCIAS = ['¿Cómo se decodifica un METAR? Dame un ejemplo', '¿Qué es la pérdida y cómo se recupera?', 'Explicame el circuito de tránsito', '¿Qué diferencia hay entre QNH, QNE y QFE?', '¿Qué tengo que estudiar para mi próxima clase?'];
const chatIA = () => { try { return JSON.parse(sessionStorage.getItem('fc-ia') || '[]'); } catch { return []; } };
const guardarChatIA = (m) => { try { sessionStorage.setItem('fc-ia', JSON.stringify(m.slice(-30))); } catch { /* sin storage */ } };

VISTAS['c-ia'] = async function (v) {
  if (MODO !== 'servidor') {
    v.innerHTML = hero('Asistente IA', 'Un asistente para sacarse dudas del curso a cualquier hora.') + `<div class="card anim">${vacio('El asistente funciona en la versión publicada con servidor. En esta demo no está disponible.')}</div>`;
    return;
  }
  let estado = { activo: false };
  try { estado = await (await fetch('/api/asistente/estado', { credentials: 'same-origin' })).json(); } catch { /* sin conexión */ }
  const mensajes = chatIA();
  const leccion = state.iaLeccion || null; const tema = state.iaTema || null;
  v.innerHTML = hero('Asistente IA', 'Preguntale lo que no te quedó claro: teoría, meteorología, reglamentación, maniobras. Responde según el temario del curso.') + `
    <div class="card anim chat-card">
      <div class="aviso" style="margin:0 0 14px"><div>Las respuestas las genera una inteligencia artificial y pueden tener errores. Ante cualquier duda, consultá con tu instructor. <b>No la uses para decidir si un vuelo real se puede hacer.</b></div></div>
      ${!estado.activo ? `<div class="aviso warn"><div><strong>El asistente todavía no está activado</strong>La administración tiene que cargar la clave de Anthropic en el servidor.</div></div>` : ''}
      ${tema ? `<div class="ia-tema">Preguntando sobre: <b>${esc(tema)}</b> <button class="link-btn" id="ia-sin-tema">Quitar</button></div>` : ''}
      <div class="chat" id="chat" aria-live="polite">${mensajes.length ? mensajes.map((m) => burbuja(m)).join('') : `<div class="chat-vacio"><div class="chat-ico">${ICON_CAMPUS}</div><p>¿En qué te ayudo?</p>
        <div class="flujo" style="justify-content:center">${SUGERENCIAS.map((x) => `<button class="chip-ad" data-sug="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>`}</div>
      <form id="f-ia" class="chat-form"><textarea id="ia-texto" rows="2" placeholder="Escribí tu pregunta…" ${estado.activo ? '' : 'disabled'}></textarea>
        <div class="flujo" style="flex-direction:column;align-items:stretch"><button class="btn" type="submit" id="ia-enviar" ${estado.activo ? '' : 'disabled'}>Enviar</button>
        ${mensajes.length ? '<button class="btn sec sm" type="button" id="ia-nuevo">Nueva conversación</button>' : ''}</div></form>
      ${estado.activo ? `<div class="muted" style="font-size:12px;margin-top:6px" id="ia-cupo">Te quedan ${estado.quedan} de ${estado.limite} preguntas por hoy.</div>` : ''}
    </div>`;
  const chat = $('#chat', v); const txt = $('#ia-texto', v);
  const abajo = () => { chat.scrollTop = chat.scrollHeight; };
  abajo();
  const st = $('#ia-sin-tema', v); if (st) st.onclick = () => { state.iaLeccion = null; state.iaTema = null; VISTAS['c-ia'](v); };
  const nv = $('#ia-nuevo', v); if (nv) nv.onclick = () => { guardarChatIA([]); state.iaLeccion = null; state.iaTema = null; VISTAS['c-ia'](v); };
  $$('[data-sug]', v).forEach((b) => b.onclick = () => { txt.value = b.dataset.sug; enviar(); });
  txt.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } };
  $('#f-ia', v).onsubmit = (e) => { e.preventDefault(); enviar(); };
  let enviando = false;
  async function enviar() {
    const q = txt.value.trim(); if (!q || enviando || !estado.activo) return;
    enviando = true; txt.value = ''; $('#ia-enviar', v).disabled = true;
    const conTema = tema && !mensajes.length ? `[Consulta sobre ${tema}] ${q}` : q;
    mensajes.push({ role: 'user', content: conTema });
    if ($('.chat-vacio', chat)) chat.innerHTML = '';
    chat.insertAdjacentHTML('beforeend', burbuja({ role: 'user', content: conTema }) + '<div class="burbuja ia escribiendo"><span></span><span></span><span></span></div>');
    abajo();
    const caja = chat.lastElementChild; let resp = '';
    try {
      const r = await fetch('/api/asistente', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensajes, leccion }) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || (r.status === 413 ? 'La pregunta es demasiado larga.' : 'El asistente no respondió. Probá de nuevo.')); }
      const lector = r.body.getReader(); const dec = new TextDecoder();
      caja.classList.remove('escribiendo');
      for (;;) { const { value, done } = await lector.read(); if (done) break; resp += dec.decode(value, { stream: true }); caja.innerHTML = formatoIA(resp); abajo(); }
      if (!resp.trim()) throw new Error('El asistente no respondió. Probá de nuevo.');
      mensajes.push({ role: 'assistant', content: resp }); guardarChatIA(mensajes);
      const c = $('#ia-cupo', v); if (c && estado.quedan > 0) { estado.quedan--; c.textContent = `Te quedan ${estado.quedan} de ${estado.limite} preguntas por hoy.`; }
    } catch (e) {
      mensajes.pop(); caja.remove(); chat.lastElementChild?.remove(); txt.value = q; toast(e.message, 'error');
    }
    enviando = false; $('#ia-enviar', v).disabled = false; txt.focus();
  }
};
function burbuja(m) {
  return m.role === 'user' ? `<div class="burbuja yo">${esc(m.content.replace(/^\[Consulta sobre [^\]]+\]\s*/, '')).replace(/\n/g, '<br>')}</div>` : `<div class="burbuja ia">${formatoIA(m.content)}</div>`;
}
