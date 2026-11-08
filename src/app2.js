/* Flight Center · interfaz (parte 2: syllabus, perfil, instructor, mecánico y administración) */

// =====================================================================
//                    LIBRO DEL SYLLABUS
// =====================================================================
const TRACK_NOMBRE = { teorica: 'Teoría', vuelo: 'Vuelo', simulador: 'Simulador' };
async function libroSyllabus(cont, alumnoId, { abrir } = {}) {
  let data;
  try { data = await Store.syllabus(alumnoId); } catch (e) { cont.innerHTML = `<div class="card">${vacio(esc(e.message))}</div>`; return; }
  const lecciones = ['teorica', 'vuelo', 'simulador'].flatMap((t) => data.pistas[t].lecciones);
  const paginas = ['tapa', 'reglas', ...lecciones.map((l) => l.id)];
  const actuales = new Set(['teorica', 'vuelo', 'simulador'].map((t) => data.pistas[t].actual?.id).filter(Boolean));
  let pag = Math.max(0, paginas.indexOf(abrir || 'tapa'));
  const a = data.alumno;

  cont.innerHTML = `<div class="libro">
    <aside class="indice anim"><div class="indice-head"><h3>Índice</h3><div class="muted">${esc(a.nombre)} ${esc(a.apellido)}</div></div>
      <div class="indice-select"><select id="idx-sel" aria-label="Ir a la página">${paginas.map((p, i) => `<option value="${i}">${p === 'tapa' ? 'Tapa' : p === 'reglas' ? 'Normas del curso' : `${p} · ${esc(Store.LECCIONES[p].titulo)}`}</option>`).join('')}</select></div>
      <div class="indice-lista">
        <button class="indice-item" data-p="0"><span class="punto"></span><span class="cod">—</span><span class="tit">Tapa</span></button>
        <button class="indice-item" data-p="1"><span class="punto"></span><span class="cod">—</span><span class="tit">Normas del curso</span></button>
        ${['teorica', 'vuelo', 'simulador'].map((t) => `<div class="indice-grupo"><span>${TRACK_NOMBRE[t]}</span><span>${data.pistas[t].aprobadas}/${data.pistas[t].total}</span></div>
          ${data.pistas[t].lecciones.map((l) => `<button class="indice-item" data-p="${paginas.indexOf(l.id)}"><span class="punto ${l.estado !== 'pendiente' ? l.estado : ''} ${actuales.has(l.id) ? 'actual' : ''}"></span>
            <span class="cod">${esc(l.id)}</span><span class="tit">${esc(l.titulo)}</span></button>`).join('')}`).join('')}
      </div></aside>
    <div class="libro-escena" id="escena"></div></div>`;

  const ir = (n, dir = 1) => {
    pag = Math.max(0, Math.min(paginas.length - 1, n));
    $$('.indice-item', cont).forEach((b) => b.classList.toggle('on', Number(b.dataset.p) === pag));
    $('#idx-sel', cont).value = pag;
    const p = paginas[pag];
    const esc_ = $('#escena', cont);
    esc_.innerHTML = p === 'tapa' ? tapa() : p === 'reglas' ? reglas() : hojaLeccion(lecciones.find((l) => l.id === p));
    const hoja = esc_.firstElementChild; hoja.classList.add(dir >= 0 ? 'pasar-adelante' : 'pasar-atras');
    $$('[data-ir]', esc_).forEach((b) => b.onclick = () => ir(pag + Number(b.dataset.ir), Number(b.dataset.ir)));
    $$('[data-p]', esc_).forEach((b) => b.onclick = () => ir(Number(b.dataset.p)));
    setTimeout(() => $$('.barra i', esc_).forEach((i) => i.style.width = i.dataset.w), 120);
    const act = $('.indice-item.on', cont); if (act) act.scrollIntoView({ block: 'nearest' });
  };
  $$('.indice-item', cont).forEach((b) => b.onclick = () => ir(Number(b.dataset.p), Number(b.dataset.p) - pag));
  $('#idx-sel', cont).onchange = (e) => ir(Number(e.target.value), Number(e.target.value) - pag);

  const pie = () => `<div class="pie-hoja"><button class="btn sec sm" data-ir="-1" ${pag === 0 ? 'disabled' : ''}>← Anterior</button>
    <span>Página ${pag + 1} de ${paginas.length}</span><button class="btn sec sm" data-ir="1" ${pag === paginas.length - 1 ? 'disabled' : ''}>Siguiente →</button></div>`;

  function tapa() {
    const fila = (t) => { const p = data.pistas[t]; const pc = p.total ? Math.round((p.aprobadas / p.total) * 100) : 0;
      return `<div class="fila"><span>${TRACK_NOMBRE[t]}</span><div class="barra"><i data-w="${pc}%"></i></div><span>${p.aprobadas}/${p.total}</span></div>`; };
    const act = (t) => data.pistas[t].actual;
    return `<div class="tapa">
      <img class="tapa-logo" src="${LOGOS.oscuro}" alt="Flight Center">
      <h2>Libro de instrucción del alumno piloto</h2>
      <div class="sub">Curso de Piloto Privado de Avión con habilitación VFR controlado</div>
      <div class="progreso-tapa">${['teorica', 'vuelo', 'simulador'].map(fila).join('')}</div>
      <div class="datos">
        <div><small>Alumno piloto</small><span>${esc(a.nombre)} ${esc(a.apellido)}</span></div>
        <div><small>DNI</small><span>${esc(a.dni || '—')}</span></div>
        <div><small>Próxima lección de vuelo</small><span>${act('vuelo') ? `${esc(act('vuelo').id)}${act('vuelo').estado === 'repetir' ? ' (repetir)' : ''}` : 'Completo'}</span></div>
        <div><small>Próxima de simulador / teoría</small><span>${esc(act('simulador')?.id || '—')} · ${esc(act('teorica')?.id || '—')}</span></div>
      </div>
      <div style="position:relative;z-index:1;margin-top:26px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <span class="muted" style="color:var(--celeste-2)">Flight Center · Escuela de vuelo</span>
        <button class="btn sm" data-ir="1">Abrir el libro →</button></div></div>`;
  }
  function reglas() {
    return `<article class="hoja"><div class="membrete"><span>Flight Center · Syllabus PPA – VFR controlado</span><span>Normas del curso</span></div>
      <h2 class="leccion" style="font-size:32px">Normas del curso</h2>
      <h4>Cómo se avanza</h4>
      <p class="reglas-libro">Para pasar de una lección a la siguiente, el alumno debe cumplir con los estándares de cada lección. Una lección puede requerir uno o más vuelos. En cada intento el instructor califica cada maniobra como <b>Muy bien</b>, <b>Bien</b> o <b>Regular</b>. Si alguna maniobra queda en <b>Regular</b>, en el próximo vuelo se repite la misma lección hasta tener todo aprobado.</p>
      <h4>Orden de las clases teóricas y del simulador</h4>
      <ul class="lista">${data.reglas.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      <h4>Preparación del alumno</h4>
      <p class="reglas-libro">El alumno debe traer estudiados los temas teóricos de la lección y la teoría de las maniobras nuevas. Si no los trae, en ese vuelo solo se practican las maniobras de repaso y queda pendiente el resto de la lección.</p>
      <h4>Chequeos de fin de etapa</h4>
      <p class="reglas-libro">En la FL 4 y en la FL 23 el Jefe de Instructores, su asistente o un instructor designado realiza un vuelo de chequeo para constatar que el alumno cumple con los estándares requeridos.</p>
      ${pie()}</article>`;
  }
  function hojaLeccion(l) {
    const its = l.intentos || []; const cols = Math.max(5, its.length);
    const estadoTxt = { aprobada: 'Aprobada', repetir: 'Repetir', pendiente: actuales.has(l.id) ? 'Próxima' : 'Pendiente' }[l.estado];
    const sub = l.track === 'teorica' ? 'Clase teórica' : l.track === 'simulador' ? 'Adiestrador sintético de vuelo' : (l.etapa || '');
    let n = 0;
    return `<article class="hoja"><div class="membrete"><span>Flight Center · Syllabus PPA – VFR controlado</span><span>${esc(a.nombre)} ${esc(a.apellido)}</span></div>
      <span class="sello-libro ${l.estado === 'pendiente' ? 'pendiente' : l.estado}">${estadoTxt}</span>
      <h2 class="leccion">${esc(l.id)}${l.opcional ? ' <small style="font-size:16px;font-weight:500">(opcional)</small>' : ''}</h2>
      <div class="titulo-leccion">${esc(l.titulo)}</div>
      <div class="etapa">${esc(sub)}</div>
      <div class="ficha-leccion">${l.modalidad ? `<span><b>Modalidad:</b> ${esc(l.modalidad.replace(/\s*\(.*$/, ''))}</span>` : ''}${l.horas ? `<span><b>Duración estimada:</b> ${fmtHoras(l.horas)} hs</span>` : ''}<span><b>Intentos:</b> ${its.length}</span></div>
      ${l.contenidos ? `<h4>Contenidos</h4><ul class="lista">${l.contenidos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${l.objetivos?.length ? `<h4>Objetivos de la lección</h4><ul class="lista">${l.objetivos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${l.estudiar?.length ? `<h4>Temas a traer estudiados</h4><ul class="lista">${l.estudiar.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <h4>Planilla de calificación</h4>
      <div class="planilla-wrap"><table class="planilla"><thead><tr><th>Maniobra / procedimiento</th>${Array.from({ length: cols }, (_, i) => `<th>${its[i] ? fmtDM(its[i].fecha) : i + 1}</th>`).join('')}</tr></thead><tbody>
        ${l.secciones.map((s, si) => `<tr class="sec"><td colspan="${cols + 1}">${esc(s.titulo)}</td></tr>${s.items.map((it, ii) => { n++; const k = `${si}.${ii}`;
          return `<tr><td>${esc(it)}</td>${Array.from({ length: cols }, (_, i) => { const v = its[i]?.notas[k]; return `<td class="n ${v || ''}">${v || ''}</td>`; }).join('')}</tr>`; }).join('')}`).join('')}
      </tbody></table></div>
      <div class="leyenda"><span><b>MB</b> Muy bien</span><span><b>B</b> Bien</span><span><b>R</b> Regular</span><span>Se aprueba cuando todas las maniobras (${n}) del último intento están en Bien o Muy bien.</span></div>
      ${its.length ? `<div class="observaciones-libro"><h4>Registro de intentos</h4>${its.map((x, i) => `<div class="obs"><small>Intento ${i + 1} · ${esc(fmtCorta(x.fecha))} · ${esc(x.instructor)}${x.horas ? ` · ${fmtHoras(x.horas)} hs` : ''}</small>${esc(x.observaciones || 'Sin observaciones.')}</div>`).join('')}</div>` : ''}
      ${pie()}</article>`;
  }
  ir(pag, 1);
}
async function abrirLibro(alumnoId, abrir) {
  const m = modal(`<div class="modal-head"><h3>Syllabus del alumno</h3><button class="x" data-cerrar aria-label="Cerrar">×</button></div><div class="modal-body" id="libro-m"></div>`, { ancho: true });
  $('.modal', m.el).style.width = 'min(1180px, 100%)';
  await libroSyllabus($('#libro-m', m.el), alumnoId, { abrir });
}

// ---------- nacionalidad y tutores ----------
const PAISES = ['Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador', 'El Salvador', 'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú',
  'Puerto Rico', 'República Dominicana', 'Uruguay', 'Venezuela', 'Canadá', 'Estados Unidos', 'Alemania', 'Austria', 'Bélgica', 'Dinamarca', 'España', 'Francia', 'Grecia', 'Irlanda', 'Italia',
  'Noruega', 'Países Bajos', 'Polonia', 'Portugal', 'Reino Unido', 'Rusia', 'Suecia', 'Suiza', 'Ucrania', 'Australia', 'China', 'Corea del Sur', 'India', 'Israel', 'Japón', 'Líbano',
  'Nueva Zelanda', 'Sudáfrica', 'Turquía', 'Otro país'];
const selectNacionalidad = (id, valor) => `<label class="campo"><span>Nacionalidad</span><select id="${id}" name="nacionalidad" required>
  <option value="" ${valor ? '' : 'selected'} disabled>Elegí la nacionalidad</option>
  ${PAISES.map((p) => `<option ${valor === p ? 'selected' : ''}>${p}</option>`).join('')}${valor && !PAISES.includes(valor) ? `<option selected>${esc(valor)}</option>` : ''}</select></label>`;
const bloqueTutor = (pre, u) => `<fieldset class="hab-caja full tutor-caja" data-tutor hidden><legend>Contacto de emergencia de sus tutores</legend>
  <p class="muted" style="margin:0 0 12px">Obligatorio para alumnos y pilotos que no son de Argentina: a quién llamar ante una emergencia.</p>
  <div class="form-grid">
    <label class="campo">Nombre y apellido del tutor<input id="${pre}-tnom" name="tutor_nombre" value="${esc(u?.tutor_nombre || '')}"></label>
    <label class="campo">Parentesco o vínculo<input id="${pre}-tpar" name="tutor_parentesco" value="${esc(u?.tutor_parentesco || '')}" placeholder="Ej: madre, padre, tutor legal"></label>
    <label class="campo"><span>Teléfono <span class="op">(con código de país)</span></span><input id="${pre}-ttel" name="tutor_telefono" type="tel" value="${esc(u?.tutor_telefono || '')}" placeholder="Ej: +598 99 123 456"></label>
    <label class="campo"><span>Email <span class="op">(opcional)</span></span><input id="${pre}-tmail" name="tutor_email" type="email" value="${esc(u?.tutor_email || '')}"></label>
  </div></fieldset>`;
// muestra el bloque de tutores según nacionalidad y tipo de usuario
function activarTutor(form, rolDe) {
  const sel = $('select[name=nacionalidad]', form); const caja = $('[data-tutor]', form);
  const ajustar = () => { caja.hidden = !(sel.value && sel.value !== 'Argentina' && ['alumno', 'ppa'].includes(rolDe())); };
  sel.addEventListener('change', ajustar); ajustar(); return ajustar;
}

// =====================================================================
//                              PERFIL
// =====================================================================
VISTAS.perfil = async function vistaPerfil(v) {
  const u = await Store.yo();
  const docs = {
    alumno: [['cma', 'CMA', 'Certificado Médico Aeronáutico', false], ['licencia', 'Licencia PPA', 'Si ya la tenés', true], ['autorizacion', 'Autorización de menor', 'Solo para menores de 18 años', true]],
    ppa: [['cma', 'CMA', 'Certificado Médico Aeronáutico', false], ['licencia', 'Licencia PPA', 'Licencia vigente', false], ['autorizacion', 'Autorización de menor', 'Solo para menores de 18 años', true]],
    instructor: [['cma', 'CMA', 'Certificado Médico Aeronáutico', false], ['licencia', 'Licencia de instructor', 'Licencia vigente', false]],
    mecanico: [['licencia', 'Licencia de mecánico', 'Habilitación vigente', false]],
    admin: [],
  }[u.rol];
  const campo = (n, l, t = 'text', extra = '') => `<label class="campo ${extra}">${l}<input id="pf-${n}" type="${t}" name="${n}" value="${esc(u[n] || '')}"></label>`;
  v.innerHTML = hero('Mi perfil', 'Mantené tus datos y tu documentación al día.') + `
    ${u.nacionalidad ? '' : '<div class="aviso-perfil anim"><b>Falta tu nacionalidad.</b> Elegila en tus datos personales y guardá los cambios.</div>'}
    <div class="card anim" style="--i:1"><div class="card-head"><h3>Datos personales</h3></div>
      <form id="f-perfil" class="form-grid">
        ${campo('nombre', 'Nombre completo')} ${campo('apellido', 'Apellido')} ${campo('email', 'Email', 'email')} ${campo('telefono', 'Teléfono', 'tel')}
        ${campo('direccion', 'Dirección', 'text', 'full')} ${campo('dni', 'DNI')} ${campo('fecha_nacimiento', 'Fecha de nacimiento', 'date')}
        ${u.rol !== 'admin' ? `${campo('licencia_nro', 'N° de licencia <span class="op">(si corresponde)</span>')} ${u.rol !== 'mecanico' ? campo('vencimiento_cma', 'Vencimiento del CMA', 'date') : ''}` : ''}
        ${selectNacionalidad('pf-nacionalidad', u.nacionalidad)}
        ${campo('contacto_emergencia', 'Contacto de emergencia <span class="op">(nombre y teléfono)</span>', 'text', 'full')}
        ${bloqueTutor('pf', u)}
        <div class="full" style="display:flex;justify-content:flex-end"><button class="btn" type="submit">Guardar cambios</button></div>
      </form></div>
    ${docs.length ? `<div class="card anim" style="--i:2"><div class="card-head"><h3>Documentación</h3><span class="muted">Solo PDF · máx. 10 MB · arrastrá el archivo o hacé clic</span></div>
      <div class="docs">${docs.map(([t, n, sub, op]) => { const d = u.docs[t]; return `<div class="doc ${d ? 'cargado' : ''}" data-doc="${t}"><div class="doc-ico">PDF</div>
        <strong>${n} ${op ? '<span class="muted" style="font-weight:500;font-size:12px">(opcional)</span>' : ''}</strong><span class="muted">${d ? `✓ ${esc(d.nombre)}` : sub}</span>
        <input type="file" accept="application/pdf,.pdf" hidden><div class="acc"><button class="btn ${d ? 'sec' : ''} sm" data-subir>${d ? 'Reemplazar' : 'Subir PDF'}</button>
        ${d ? `<button class="btn sec sm" data-verdoc="${u.id}|${t}|${n}">Ver</button><button class="btn danger sm" data-quitar>Quitar</button>` : ''}</div></div>`; }).join('')}</div></div>` : ''}
    <div class="card anim" style="--i:3"><div class="card-head"><h3>Cambiar contraseña</h3></div>
      <form id="f-pass" class="form-grid">
        <label class="campo">Contraseña actual<input id="pw-a" type="password" name="actual" autocomplete="current-password" required></label>
        <label class="campo">Nueva contraseña<input id="pw-n" type="password" name="nueva" autocomplete="new-password" minlength="6" required></label>
        <div class="full" style="display:flex;justify-content:flex-end"><button class="btn sec" type="submit">Actualizar contraseña</button></div>
      </form></div>`;
  activarTutor($('#f-perfil', v), () => u.rol);
  $('#f-perfil', v).onsubmit = async (e) => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); d.nacionalidad = $('#pf-nacionalidad', v).value; if ($('[data-tutor]', v).hidden) for (const k of ['tutor_nombre', 'tutor_parentesco', 'tutor_telefono', 'tutor_email']) d[k] = '';
    const r = await hacer(async () => await Store.guardarPerfil(d), 'Perfil actualizado'); if (r) { state.user = r; $('.user-chip .nombre').textContent = r.nombre; $('.aviso-perfil', v)?.remove(); } };
  $('#f-pass', v).onsubmit = async (e) => { e.preventDefault(); const f = e.target; if (await hacer(async () => { await Store.cambiarPassword(f.actual.value, f.nueva.value); return true; }, 'Contraseña actualizada')) f.reset(); };
  $$('.doc', v).forEach((d) => {
    const tipo = d.dataset.doc; const input = $('input[type=file]', d);
    const subir = async (file) => {
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) return toast('El PDF supera los 10 MB', 'error');
      try {
        const data = await new Promise((ok, mal) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = mal; fr.readAsDataURL(file); });
        await Store.subirDoc(tipo, { nombre: file.name, tam: file.size, tipo: file.type, data }); toast('Documento cargado', 'ok'); await VISTAS.perfil(v);
      } catch (e) { toast(e.message, 'error'); }
    };
    $('[data-subir]', d).onclick = () => input.click(); input.onchange = async () => await subir(input.files[0]);
    d.ondragover = (e) => { e.preventDefault(); d.classList.add('drag'); }; d.ondragleave = () => d.classList.remove('drag');
    d.ondrop = async (e) => { e.preventDefault(); d.classList.remove('drag'); await subir(e.dataTransfer.files[0]); };
    const q = $('[data-quitar]', d);
    if (q) q.onclick = async () => { if (await confirmar('Quitar documento', '¿Querés quitar este documento de tu perfil?', 'Quitar')) { await Store.quitarDoc(tipo); toast('Documento quitado'); await VISTAS.perfil(v); } };
  });
};

// ---------- visor de PDF ----------
const cargarScript = (src) => new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = mal; document.head.append(s); });
let pdfjsListo = null;
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
async function verDoc(uid, tipo, nombre) {
  const d = await Store.documento(uid, tipo);
  if (!d) return toast('Documento no disponible', 'error');
  const m = modal(`<div class="modal-head"><div><h3>${esc(nombre)}</h3><div class="muted">${esc(d.nombre)} · ${Math.max(1, Math.round(d.tam / 1024))} KB · subido ${esc(fmtCorta(d.fecha.slice(0, 10)))}</div></div><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <div class="modal-body"><div class="pdf-view" id="pdfv"><span class="muted">Cargando documento…</span></div></div>`, { ancho: true });
  const c = $('#pdfv', m.el);
  try {
    pdfjsListo = pdfjsListo || cargarScript(PDFJS + 'pdf.min.js').then(() => cargarScript(PDFJS + 'pdf.worker.min.js'));
    await pdfjsListo;
    const bin = atob(d.data.split(',')[1]); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const pdf = await window.pdfjsLib.getDocument({ data: bytes, isEvalSupported: false }).promise; c.innerHTML = '';
    for (let n = 1; n <= Math.min(pdf.numPages, 10); n++) {
      const page = await pdf.getPage(n); const vp = page.getViewport({ scale: 1.5 });
      const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height; c.append(cv);
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    }
  } catch { c.innerHTML = '<span class="muted">El documento está cargado, pero no se pudo mostrar la vista previa en este navegador.</span>'; }
}
document.addEventListener('click', async (e) => { const b = e.target.closest('[data-verdoc]'); if (b) { const [uid, tipo, n] = b.dataset.verdoc.split('|'); await verDoc(uid, tipo, n); } });

// ---------- ficha de piloto ----------
async function fichaPiloto(id) {
  const p = await hacer(async () => await Store.fichaPiloto(id)); if (!p) return;
  const doc = (t, n) => p.docs[t] ? `<button class="btn sec sm" data-verdoc="${p.id}|${t}|${n}">${n} (PDF)</button>` : `<span class="badge gris">${n}: no cargado</span>`;
  const venc = p.vencimiento_cma && p.vencimiento_cma < isoLocal(new Date());
  const m = modal(`<div class="modal-head"><div style="display:flex;gap:12px;align-items:center"><div class="avatar" style="width:44px;height:44px">${esc(iniciales(p))}</div>
      <div><h3>${esc(p.nombre)} ${esc(p.apellido)}</h3><span class="badge">${esc(ROLES[p.rol])}</span></div></div><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <div class="modal-body">
      <div class="stats" style="margin-bottom:18px"><div class="stat dest"><div class="lbl">Horas totales</div><div class="val">${fmtHoras(p.horas_totales)}<small>hs</small></div></div>
        <div class="stat"><div class="lbl">En Flight Center</div><div class="val">${fmtHoras(p.horas_centro)}<small>hs</small></div></div>
        <div class="stat"><div class="lbl">Ausencias sin aviso</div><div class="val" ${p.ausencias ? 'style="color:var(--danger)"' : ''}>${p.ausencias}</div></div></div>
      <div class="ficha">
        <div><small>Email</small><span>${esc(p.email)}</span></div><div><small>Teléfono</small><span>${esc(p.telefono || '—')}</span></div>
        <div><small>DNI</small><span>${esc(p.dni || '—')}</span></div><div><small>Fecha de nacimiento</small><span>${p.fecha_nacimiento ? esc(fmtCorta(p.fecha_nacimiento)) : '—'}</span></div>
        <div style="grid-column:1/-1"><small>Dirección</small><span>${esc(p.direccion || '—')}</span></div>
        <div><small>Nacionalidad</small><span>${esc(p.nacionalidad || 'Sin cargar')}</span></div>
        <div><small>Contacto de emergencia</small><span>${esc(p.contacto_emergencia || '—')}</span></div><div><small>N° de licencia</small><span>${esc(p.licencia_nro || '—')}</span></div>
        ${p.tutor_nombre ? `<div style="grid-column:1/-1" class="tutor-ficha"><small>Tutor · contacto de emergencia</small><span><b>${esc(p.tutor_nombre)}</b> (${esc(p.tutor_parentesco || '')}) ·
          <a href="tel:${esc(String(p.tutor_telefono).replace(/[^\d+]/g, ''))}">${esc(p.tutor_telefono)}</a>${p.tutor_email ? ` · <a href="mailto:${esc(p.tutor_email)}">${esc(p.tutor_email)}</a>` : ''}</span></div>` : ''}
        <div><small>Vencimiento CMA</small><span>${p.vencimiento_cma ? `${esc(fmtCorta(p.vencimiento_cma))} ${venc ? '<span class="badge danger">Vencido</span>' : ''}` : '—'}</span></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px">${doc('cma', 'CMA')} ${doc('licencia', 'Licencia PPA')} ${doc('autorizacion', 'Autorización de menor')}
        ${p.veSyllabus ? `<button class="btn sm" id="ver-syl">${ICON.libro} Abrir syllabus</button>` : ''}</div>
      ${p.rol === 'ppa' ? `<div class="aviso" style="margin-top:16px"><div style="flex:1"><strong>Adaptación a Bristell</strong>${p.hab?.bristell ? `✓ Adaptado/a${p.hab.bristell_por ? ` · otorgada por ${esc(p.hab.bristell_por)}` : ''}${p.hab.bristell_fecha ? ` el ${esc(fmtCorta(p.hab.bristell_fecha))}` : ''}` : 'No adaptado/a: no puede reservar aviones Bristell.'}</div>
        <button class="btn ${p.hab?.bristell ? 'danger' : 'ok'} sm" id="bristell">${p.hab?.bristell ? 'Quitar adaptación' : 'Marcar como adaptado/a'}</button></div>` : ''}
      <h3 style="margin:24px 0 10px;font-size:15px">Actividad</h3>
      ${p.reservas.length ? `<div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Horario</th><th>Equipo</th><th>Instructor</th><th>Estado</th></tr></thead><tbody>
        ${p.reservas.map((r) => `<tr><td>${esc(fmtCorta(r.fecha))}</td><td>${badgeTipo(r.tipo)}</td><td class="mono">${rango(r.bloque)}</td><td class="mono">${esc(r.recurso)}</td><td>${esc(r.instructor || 'Solo')}</td><td>${badgeEstado(r)}</td></tr>`).join('')}
      </tbody></table></div>` : vacio('Sin actividad')}</div>`, { ancho: true });
  const b = $('#ver-syl', m.el); if (b) b.onclick = async () => await abrirLibro(p.id);
  const br = $('#bristell', m.el);
  if (br) br.onclick = async () => {
    const r = await hacer(() => Store.adaptacionBristell(p.id, !p.hab?.bristell), p.hab?.bristell ? 'Adaptación a Bristell quitada' : 'Piloto adaptado a Bristell');
    if (r) { m.cerrar(); setTimeout(() => fichaPiloto(p.id), 200); }
  };
}

// =====================================================================
//                         INSTRUCTOR
// =====================================================================
VISTAS.agenda = async function vistaAgenda(v, mes = isoLocal(new Date()).slice(0, 7)) {
  const r = await Store.resumenInstructor(mes);
  const opMes = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i + 1); const m = isoLocal(d).slice(0, 7);
    return `<option value="${m}" ${m === mes ? 'selected' : ''}>${d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</option>`; }).join('');
  v.innerHTML = hero(`Hola, ${esc(state.user.nombre)}`, 'Tus vuelos, simuladores y clases. Al cerrar cada vuelo con un alumno calificás su lección del syllabus.',
    `<div style="margin-top:14px;max-width:220px"><select id="mes" aria-label="Mes">${opMes}</select></div>`) + `
    <div class="stats">${stat('Vuelos realizados en el mes', r.vuelos_mes, { dest: true, i: 1 })}${stat('Horas voladas', r.horas_mes, { dec: 1, suf: 'hs', i: 2 })}
      ${stat('Simuladores', r.sims_mes, { i: 3 })}${stat('Clases dictadas', r.clases_mes, { i: 4 })}${stat('Pendientes', r.pendientes.length, { i: 5 })}${stat('Ausencias del mes', r.ausencias_mes, { i: 6 })}${stat('Pilotos del mes', r.pilotos_mes, { i: 6 })}</div>
    <div class="card anim" style="--i:6"><div class="card-head"><h3>Vuelos y simuladores pendientes</h3><span class="muted">Con quién volás y cómo contactarlo</span></div>
      ${r.pendientes.length ? r.pendientes.map((f, i) => filaPendiente(f, i)).join('') : vacio('No tenés vuelos pendientes.')}</div>
    <div class="grid-2">
      <div class="card anim" style="--i:7"><div class="card-head"><h3>Mi disponibilidad</h3><span class="muted">La asigna la administración</span></div><div id="mi-dispo"></div></div>
      <div class="card anim" style="--i:8"><div class="card-head"><h3>Próximas clases teóricas</h3></div>
        ${r.clases_proximas.length ? r.clases_proximas.map((k) => `<div class="agenda-fila"><span class="mono">${esc(fmtDM(k.fecha))} ${hh(k.bloque)}</span><span><b>${esc(k.teo)}</b> · ${esc(k.titulo)} · ${k.inscriptos} inscriptos</span></div>`).join('') : vacio('Sin clases asignadas')}</div>
    </div>
    <div class="card anim" style="--i:9"><div class="card-head"><h3>Actividad del mes</h3></div>
      ${r.del_mes.length ? `<div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Horario</th><th>Piloto</th><th>Equipo</th><th>Lección</th><th>Estado</th></tr></thead><tbody>
        ${r.del_mes.map((f) => `<tr><td style="white-space:nowrap">${esc(fmtCorta(f.fecha))}</td><td>${badgeTipo(f.tipo)}</td><td class="mono">${rango(f.bloque)}</td>
          <td><a href="#" data-piloto="${f.piloto_id}">${esc(f.piloto)}</a></td><td class="mono">${esc(f.recurso)}</td><td>${esc(f.leccion || '—')}</td><td>${badgeEstado(f)}${f.estado === 'ausente' ? ` <button class="link-btn" data-desaus="${f.id}">Deshacer</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>` : vacio('Sin actividad este mes.')}</div>`;
  animarNumeros(v);
  await gridDisponibilidad($('#mi-dispo', v), lunesDe(), { editable: false, inst: state.user.id });
  $('#mes', v).onchange = async (e) => await VISTAS.agenda(v, e.target.value);
  $$('[data-piloto]', v).forEach((a) => a.onclick = async (e) => { e.preventDefault(); await fichaPiloto(a.dataset.piloto); });
  $$('[data-completar]', v).forEach((b) => b.onclick = () => completarReserva(r.pendientes.find((f) => f.id == b.dataset.completar), async () => await VISTAS.agenda(v, mes)));
  $$('[data-syl]', v).forEach((b) => b.onclick = async () => await abrirLibro(Number(b.dataset.syl), b.dataset.lec));
  $$('[data-ausente]', v).forEach((b) => b.onclick = () => marcarAusente(r.pendientes.find((f) => f.id == b.dataset.ausente), async () => await VISTAS.agenda(v, mes)));
  $$('[data-desaus]', v).forEach((b) => b.onclick = () => deshacerAusencia(b.dataset.desaus, async () => await VISTAS.agenda(v, mes)));
  $$('[data-cancelar-i]', v).forEach((b) => b.onclick = async () => {
    if (await confirmar('Cancelar', '¿Seguro que querés cancelar? Avisale al piloto.', 'Cancelar')) { await hacer(async () => await Store.cancelarReserva(b.dataset.cancelarI), 'Reserva cancelada'); await VISTAS.agenda(v, mes); }
  });
};
const turnoEmpezo = (f) => { const h = isoLocal(new Date()); return f.fecha < h || (f.fecha === h && new Date().getHours() >= f.bloque); };
async function marcarAusente(f, despues) {
  const t = await Store.tarifas(); const valor = (f.tipo === 'vuelo' ? t.vuelo : t.simulador) * 2 * (t.ausencia ?? 100) / 100;
  const m = modal(`<div class="modal-head"><h3>Marcar ausente</h3><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <div class="modal-body">
      <p style="margin-top:0"><b>${esc(f.piloto)}</b> no se presentó a su ${f.tipo === 'vuelo' ? 'vuelo' : 'turno de simulador'} del ${esc(fmtCorta(f.fecha))}, ${rango(f.bloque)} (${esc(f.recurso)}).</p>
      <div class="opciones-aus">
        <label class="op-aus"><input type="radio" name="aus" value="cargo" checked><span><b>Ausencia sin aviso</b><small>Se cobra el ${t.ausencia ?? 100}% del bloque: ${pesos(valor)}</small></span></label>
        <label class="op-aus"><input type="radio" name="aus" value="just"><span><b>Ausencia justificada</b><small>Sin cargo. Por ejemplo, enfermedad o un problema avisado tarde.</small></span></label>
      </div>
      <label class="campo" style="margin-top:12px"><span>Motivo <span class="muted" id="aus-opc">(opcional)</span></span><textarea id="aus-mot" rows="2" maxlength="300" placeholder="Ej: no avisó, no atendió el teléfono"></textarea></label>
      <p class="muted" style="margin-bottom:0">Le llega un aviso por email. Si fue un error, se puede deshacer desde la actividad del mes.</p>
    </div><div class="modal-foot"><button class="btn sec" data-cerrar>Volver</button><button class="btn danger" id="aus-ok">Marcar ausente</button></div>`);
  const just = () => $('input[name=aus]:checked', m.el).value === 'just';
  $$('input[name=aus]', m.el).forEach((x) => x.onchange = () => { $('#aus-opc', m.el).textContent = just() ? '(obligatorio)' : '(opcional)'; $('#aus-ok', m.el).textContent = just() ? 'Marcar ausente sin cargo' : `Marcar ausente y cobrar ${pesos(valor)}`; });
  $('#aus-ok', m.el).textContent = `Marcar ausente y cobrar ${pesos(valor)}`;
  $('#aus-ok', m.el).onclick = async () => {
    const r = await hacer(async () => await Store.marcarAusente(f.id, { justificada: just(), motivo: $('#aus-mot', m.el).value }));
    if (r === undefined) return;
    toast(r ? `Ausencia registrada. Se cargó ${pesos(r)} a su estado de cuenta.` : 'Ausencia justificada registrada, sin cargo', 'ok'); m.cerrar(); await despues();
  };
}
async function deshacerAusencia(id, despues) {
  if (!(await confirmar('Deshacer ausencia', 'La reserva vuelve a quedar pendiente y se quita el cargo del estado de cuenta.', 'Deshacer'))) return;
  if (await hacer(async () => { await Store.anularAusencia(id); return true; }, 'Ausencia anulada')) await despues();
}
function badgeLlegada(f) {
  if (f.fecha < isoLocal(new Date()) && f.estado === 'pendiente') return '<span class="badge warn">Sin cerrar</span>';
  if (f.fecha !== isoLocal(new Date())) return '';
  if (f.llegada) return `<span class="badge ok llegada">✓ Presente · ${esc(f.llegada)}</span>`;
  const empezo = new Date().getHours() >= f.bloque;
  return empezo ? '<span class="badge danger">No registró llegada</span>' : '<span class="badge gris">Esperando llegada</span>';
}
function filaPendiente(f, i) {
  const d = parseISO(f.fecha); const tel = telLimpio(f.piloto_telefono);
  return `<div class="vuelo anim" style="--i:${i}">
    <div class="vuelo-fecha"><small>${d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')}</small><strong>${d.getDate()}</strong><small>${d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}</small></div>
    <div class="vuelo-info"><strong>${esc(f.piloto)}</strong> <span class="badge">${f.piloto_rol === 'ppa' ? 'PPA' : 'Alumno'}</span> ${badgeTipo(f.tipo)} ${f.leccion_sugerida ? `<span class="badge warn">${esc(f.leccion_sugerida)}</span>` : ''} ${badgeLlegada(f)}
      <div class="meta"><span class="mono">${rango(f.bloque)}</span><span><span class="mono">${esc(f.recurso)}</span> · ${esc(f.modelo)}</span></div>
      <div class="contacto">${tel ? `<a href="tel:${esc(tel)}">${ICON.tel} ${esc(f.piloto_telefono)}</a><a href="https://wa.me/${esc(tel.replace('+', ''))}" target="_blank" rel="noopener">${ICON.wa} WhatsApp</a>` : ''}
        <a href="mailto:${esc(f.piloto_email)}">${ICON.mail} ${esc(f.piloto_email)}</a></div></div>
    <div class="vuelo-acc"><button class="btn sec sm" data-piloto="${f.piloto_id}">Ficha</button>
      ${f.piloto_rol === 'alumno' ? `<button class="btn sec sm" data-syl="${f.piloto_id}" data-lec="${esc(f.leccion_sugerida || '')}">Syllabus</button>` : ''}
      <button class="btn ok sm" data-completar="${f.id}">Cerrar ${f.tipo === 'vuelo' ? 'vuelo' : 'turno'}</button>${turnoEmpezo(f) && !f.llegada ? `<button class="btn warn-btn sm" data-ausente="${f.id}">Marcar ausente</button>` : ''}<button class="btn danger sm" data-cancelar-i="${f.id}">Cancelar</button></div></div>`;
}

function completarReserva(f, despues) {
  const esAlumno = f.piloto_rol === 'alumno';
  const lecs = Store.TRACKS[f.tipo];
  let lec = f.leccion_sugerida || lecs[0].id;
  const notas = {};
  const m = modal(`<div class="modal-head"><div><h3>Cerrar ${f.tipo === 'vuelo' ? 'vuelo' : 'turno de simulador'}</h3><div class="muted">${esc(f.piloto)} · ${esc(fmtFecha(f.fecha))} · ${rango(f.bloque)} · ${esc(f.recurso)}</div></div><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <div class="modal-body" style="display:grid;gap:14px">
      <div class="form-grid"><label class="campo">Horas ${f.tipo === 'vuelo' ? 'de vuelo' : 'de simulador'}<input id="c-horas" type="number" min="0.1" max="4" step="0.1" value="${f.tipo === 'vuelo' ? '1.5' : '1.0'}"></label>
      ${esAlumno ? `<label class="campo">Lección del syllabus<select id="c-lec">${lecs.map((l) => `<option value="${l.id}" ${l.id === lec ? 'selected' : ''}>${l.id} · ${esc(l.titulo)}</option>`).join('')}</select></label>` : ''}</div>
      ${esAlumno ? `<div><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><strong>Calificá cada maniobra</strong>
        <span class="flujo"><button class="btn sec sm" data-todas="MB">Todo MB</button><button class="btn sec sm" data-todas="B">Todo B</button></span></div>
        <div id="c-tabla" style="max-height:46vh;overflow:auto;margin-top:8px"></div><div id="c-res"></div></div>` : ''}
      <label class="campo">Observaciones <span class="op">(el ${esAlumno ? 'alumno' : 'piloto'} las ve en su historial)</span><textarea id="c-obs" placeholder="Desempeño, temas a reforzar, recomendaciones…"></textarea></label>
    </div>
    <div class="modal-foot"><button class="btn sec" data-cerrar>Volver</button><button class="btn ok" id="c-ok">Guardar y cerrar</button></div>`, { ancho: true });
  const tabla = () => {
    const l = Store.LECCIONES[lec];
    $('#c-tabla', m.el).innerHTML = `<table class="calif">${l.secciones.map((s, si) => `<tr class="sec"><td colspan="2">${esc(s.titulo)}</td></tr>${s.items.map((it, ii) => { const k = `${si}.${ii}`;
      return `<tr><td>${esc(it)}</td><td style="text-align:right;white-space:nowrap"><span class="notas" data-k="${k}">${['MB', 'B', 'R'].map((n) => `<button type="button" data-v="${n}" class="${notas[k] === n ? 'on' : ''}" title="${NOTA[n]}">${n}</button>`).join('')}</span></td></tr>`; }).join('')}`).join('')}</table>`;
    $$('.notas button', m.el).forEach((b) => b.onclick = () => { const k = b.parentElement.dataset.k; notas[k] = notas[k] === b.dataset.v ? undefined : b.dataset.v; tabla(); });
    const keys = Store.itemKeys(l); const hechas = keys.filter((k) => notas[k]).length; const reg = keys.filter((k) => notas[k] === 'R').length;
    $('#c-res', m.el).innerHTML = reg ? `<div class="resultado no">${reg} maniobra(s) en Regular: el alumno repite ${esc(l.id)} en el próximo vuelo.</div>`
      : hechas < keys.length ? `<div class="resultado inc">Calificadas ${hechas} de ${keys.length}. Si quedan sin calificar, la lección no se aprueba.</div>`
      : `<div class="resultado ok">Todo en Bien o Muy bien: ${esc(l.id)} queda aprobada y el alumno avanza a la siguiente.</div>`;
  };
  if (esAlumno) {
    tabla();
    $('#c-lec', m.el).onchange = (e) => { lec = e.target.value; for (const k of Object.keys(notas)) delete notas[k]; tabla(); };
    $$('[data-todas]', m.el).forEach((b) => b.onclick = () => { Store.itemKeys(Store.LECCIONES[lec]).forEach((k) => notas[k] = b.dataset.todas); tabla(); });
  }
  $('#c-ok', m.el).onclick = async () => {
    const res = await hacer(async () => await Store.completarReserva(f.id, { horas: $('#c-horas', m.el).value, observaciones: $('#c-obs', m.el).value, leccion: lec, notas }) ?? true);
    if (res === undefined) return;
    toast(res === true ? 'Vuelo cerrado' : res.estado === 'aprobada' ? `${res.leccion} aprobada ✓` : `${res.leccion}: el alumno debe repetirla`, 'ok');
    m.cerrar(); despues();
  };
}

VISTAS.alumnos = async function vistaAlumnos(v) {
  setTimeout(() => tarjetaBristell(v), 0);
  const l = await Store.misAlumnos();
  v.innerHTML = hero('Mis alumnos', 'Solo ves el syllabus de los alumnos con los que volás o tenés vuelos programados.') + `<div class="card anim" style="--i:1">
    ${l.length ? `<div class="tabla-wrap"><table><thead><tr><th>Alumno</th><th>Vuelo</th><th>Simulador</th><th>Teoría</th><th>Vuelos conmigo</th><th></th></tr></thead><tbody>
      ${l.map((a) => { const c = (x) => x ? `<span class="badge ${x.estado === 'repetir' ? 'warn' : ''}">${esc(x.id)}${x.estado === 'repetir' ? ' · repetir' : ''}</span>` : '<span class="badge ok">Completo</span>';
        return `<tr><td><strong>${esc(a.nombre)} ${esc(a.apellido)}</strong><div class="muted">${esc(a.telefono)}</div></td><td>${c(a.vuelo)}</td><td>${c(a.simulador)}</td><td>${c(a.teorica)}</td>
          <td class="mono">${a.vuelos_conmigo}</td><td style="text-align:right;white-space:nowrap"><button class="btn sec sm" data-piloto="${a.id}">Ficha</button> <button class="btn sm" data-syl="${a.id}" data-lec="${esc(a.vuelo?.id || '')}">${ICON.libro} Syllabus</button></td></tr>`; }).join('')}
    </tbody></table></div>` : vacio('Todavía no tenés alumnos asignados en vuelos.')}</div>`;
  $$('[data-piloto]', v).forEach((b) => b.onclick = async () => await fichaPiloto(b.dataset.piloto));
  $$('[data-syl]', v).forEach((b) => b.onclick = async () => await abrirLibro(Number(b.dataset.syl), b.dataset.lec));
};

// ---------- clases teóricas (instructor y admin) ----------
VISTAS.clases = async function vistaClases(v) {
  const esAdmin = state.user.rol === 'admin';
  const clases = await Store.clases(esAdmin ? {} : { instructor: state.user.id });
  const hoy = isoLocal(new Date());
  const prox = clases.filter((k) => k.fecha >= hoy && k.estado === 'programada'); const resto = clases.filter((k) => !prox.includes(k)).reverse();
  const fila = (k, i) => `<div class="clase-card anim" style="--i:${i}"><div class="teo">${esc(k.teo)}</div>
    <div><strong>${esc(k.titulo)}</strong> ${k.estado === 'dictada' ? '<span class="badge ok">Dictada</span>' : k.estado === 'cancelada' ? '<span class="badge gris">Cancelada</span>' : '<span class="badge">Programada</span>'}
      <div class="vuelo-info"><div class="meta"><span class="cap">${esc(fmtFecha(k.fecha))}</span><span class="mono">${rango(k.bloque)}</span><span>${esc(k.aula)}</span>${esAdmin ? `<span>${esc(k.instructor)}</span>` : ''}<span>${k.inscriptos}/${k.cupo} inscriptos</span></div></div></div>
    <div class="flujo">${k.estado !== 'cancelada' ? `<button class="btn sm ${k.estado === 'dictada' ? 'sec' : 'ok'}" data-asis="${k.id}">${k.estado === 'dictada' ? 'Ver asistencia' : 'Tomar asistencia'}</button>` : ''}
      ${esAdmin && k.estado === 'programada' ? `<button class="btn sec sm" data-edit="${k.id}">Editar</button><button class="btn danger sm" data-canc="${k.id}">Cancelar</button>` : ''}</div></div>`;
  v.innerHTML = hero('Clases teóricas', esAdmin ? 'Programá las clases del syllabus (TEO 1 a TEO 8). Los alumnos se inscriben desde su panel.' : 'Las clases que dictás. Al tomar asistencia calificás la clase en el syllabus de cada alumno.',
    esAdmin ? '<div style="margin-top:14px"><button class="btn sec" id="nueva">+ Programar clase</button></div>' : '') + `
    <div class="card anim" style="--i:1"><div class="card-head"><h3>Próximas</h3><span class="badge">${prox.length}</span></div>${prox.length ? prox.map(fila).join('') : vacio('No hay clases programadas.')}</div>
    <div class="card anim" style="--i:2"><div class="card-head"><h3>Anteriores</h3></div>${resto.length ? resto.map(fila).join('') : vacio('Sin clases anteriores.')}</div>`;
  const recargar = async () => await VISTAS.clases(v);
  $$('[data-asis]', v).forEach((b) => b.onclick = async () => await asistencia(clases.find((k) => k.id == b.dataset.asis), recargar));
  $$('[data-edit]', v).forEach((b) => b.onclick = async () => await editarClase(clases.find((k) => k.id == b.dataset.edit), recargar));
  $$('[data-canc]', v).forEach((b) => b.onclick = async () => { if (await confirmar('Cancelar clase', 'Los alumnos inscriptos dejarán de verla en su agenda.', 'Cancelar clase')) { await hacer(async () => await Store.cancelarClase(b.dataset.canc), 'Clase cancelada'); await recargar(); } });
  const n = $('#nueva', v); if (n) n.onclick = async () => await editarClase(null, recargar);
};
async function editarClase(k, despues) {
  const insts = await Store.instructores();
  const m = modal(`<div class="modal-head"><h3>${k ? 'Editar clase' : 'Programar clase teórica'}</h3><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <form class="modal-body form-grid" id="f-clase">
      <label class="campo full">Clase<select id="k-teo" name="teo">${SYLLABUS.teorica.map((t) => `<option value="${t.id}" ${k?.teo === t.id ? 'selected' : ''}>${t.id} · ${esc(t.titulo)}</option>`).join('')}</select></label>
      <label class="campo">Fecha<input id="k-fecha" type="date" name="fecha" value="${k?.fecha || isoLocal(new Date())}"></label>
      <label class="campo">Horario<select id="k-bloque" name="bloque">${BLOQUES.map((b) => `<option value="${b}" ${k?.bloque === b ? 'selected' : ''}>${rango(b)}</option>`).join('')}</select></label>
      <label class="campo">Instructor<select id="k-inst" name="instructor_id">${insts.map((i) => `<option value="${i.id}" ${k?.instructor_id === i.id ? 'selected' : ''}>${esc(i.nombre)} ${esc(i.apellido)}</option>`).join('')}</select></label>
      <label class="campo">Cupo<input id="k-cupo" type="number" min="1" name="cupo" value="${k?.cupo || 10}"></label>
      <label class="campo full">Aula<input id="k-aula" name="aula" value="${esc(k?.aula || 'Aula 1')}"></label>
    </form><div class="modal-foot"><button class="btn sec" data-cerrar>Volver</button><button class="btn" id="k-ok">Guardar</button></div>`);
  $('#k-ok', m.el).onclick = async () => { if (await hacer(async () => await Store.guardarClase({ ...Object.fromEntries(new FormData($('#f-clase', m.el))), id: k?.id }), 'Clase guardada')) { m.cerrar(); despues(); } };
}
async function asistencia(k, despues) {
  const reg = Object.fromEntries(k.alumnos.map((a) => [a.id, { estado: a.estado === 'inscripto' ? (a.llegada || k.fecha !== isoLocal(new Date()) ? 'presente' : 'ausente') : a.estado, nota: a.nota || 'B' }]));
  const puede = state.user.rol === 'admin' || k.instructor_id === state.user.id;
  const m = modal(`<div class="modal-head"><div><h3>${esc(k.teo)} · asistencia</h3><div class="muted">${esc(fmtFecha(k.fecha))} · ${rango(k.bloque)} · ${esc(k.instructor)}</div></div><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <div class="modal-body" id="asis"></div>
    <div class="modal-foot"><button class="btn sec" data-cerrar>Volver</button>${puede && k.alumnos.length ? '<button class="btn ok" id="a-ok">Guardar asistencia</button>' : ''}</div>`, { ancho: true });
  const pintar = () => {
    $('#asis', m.el).innerHTML = k.alumnos.length ? `<table class="calif">${k.alumnos.map((a) => `<tr><td><strong>${esc(a.alumno)}</strong>${a.llegada ? ` <span class="badge ok">Llegó ${esc(a.llegada)}</span>` : ''}</td>
      <td style="text-align:right"><span class="flujo" style="justify-content:flex-end"><select data-est="${a.id}" style="width:auto">${['presente', 'ausente'].map((e) => `<option ${reg[a.id].estado === e ? 'selected' : ''}>${e}</option>`).join('')}</select>
      ${reg[a.id].estado === 'presente' ? `<span class="notas" data-a="${a.id}">${['MB', 'B', 'R'].map((n) => `<button type="button" data-v="${n}" class="${reg[a.id].nota === n ? 'on' : ''}" title="${NOTA[n]}">${n}</button>`).join('')}</span>` : ''}</span></td></tr>`).join('')}</table>
      <p class="muted">Una clase en Regular queda para recursar en el syllabus del alumno.</p>` : vacio('No hay alumnos inscriptos.');
    $$('[data-est]', m.el).forEach((s) => s.onchange = async () => { reg[s.dataset.est].estado = s.value; await pintar(); });
    $$('.notas button', m.el).forEach((b) => b.onclick = async () => { reg[b.parentElement.dataset.a].nota = b.dataset.v; await pintar(); });
  };
  await pintar();
  const ok = $('#a-ok', m.el); if (ok) ok.onclick = async () => { if (await hacer(async () => { await Store.tomarAsistencia(k.id, reg); return true; }, 'Asistencia guardada')) { m.cerrar(); despues(); } };
}

// =====================================================================
//                FLOTA Y LIBROS DE NOVEDADES
// =====================================================================
const ESTADO_NOV = { reportada: ['Reportada', 'danger'], en_revision: ['En revisión', 'warn'], resuelta: ['Resuelta', 'ok'], descartada: ['No es falla', 'gris'] };
const TIPO_NOV = { falla: 'Falla', observacion: 'Observación', mantenimiento: 'Mantenimiento' };
function tarjetasFlota(recs, sel) {
  return `<div class="aviones">${recs.map((a, i) => `<button class="avion anim ${a.id === sel ? 'sel' : ''}" style="--i:${i}" data-av="${a.id}">
    <div class="silueta">${a.tipo === 'avion' ? ICON.avion : ICON.sim.replace('width="20"', '')}</div>
    <div class="mat">${esc(a.nombre)}</div><div class="mod">${esc(a.modelo)} · ${a.tipo === 'avion' ? 'Aeronave' : 'Simulador'}</div>
    <div class="pie">${a.estado === 'operativa' ? '<span class="badge ok">Operativo</span>' : '<span class="badge warn">Fuera de servicio</span>'}
      ${a.reportadas ? `<span class="badge danger">${a.reportadas} sin revisar</span>` : a.abiertas ? `<span class="badge warn">${a.abiertas} en revisión</span>` : '<span class="badge">Sin pendientes</span>'}</div></button>`).join('')}</div>`;
}
function itemNovedad(n, i, { mecanico }) {
  const [txt, cls] = ESTADO_NOV[n.estado];
  return `<div class="novedad anim ${n.tipo} ${['resuelta', 'descartada'].includes(n.estado) ? 'resuelta' : ''}" style="--i:${i}">
    <div class="novedad-head"><div class="flujo"><span class="badge ${n.tipo === 'falla' ? 'danger' : n.tipo === 'mantenimiento' ? 'warn' : ''}">${TIPO_NOV[n.tipo]}</span><span class="badge ${cls}">${txt}</span>
      ${n.recurso ? `<span class="badge gris">${esc(n.recurso)}</span>` : ''}</div>
      <span class="muted" style="font-size:12px">Reportó ${esc(n.autor)} · ${esc(fmtCorta(n.fecha.slice(0, 10)))}</span></div>
    <p>${esc(n.descripcion)}</p>
    ${n.revision?.comentario ? `<div class="res"><b>Mecánico (${esc(n.revision.mecanico)} · ${esc(fmtCorta(n.revision.fecha.slice(0, 10)))}):</b> ${esc(n.revision.comentario)}</div>` : ''}
    ${mecanico ? `<div class="acc"><button class="btn sm ${n.estado === 'reportada' ? '' : 'sec'}" data-rev="${n.id}">${n.estado === 'reportada' ? 'Revisar' : 'Modificar'}</button></div>` : ''}</div>`;
}
async function libroNovedades(cont, rec, { mecanico = false, reportar = false, admin = false, recargar }) {
  const novs = await Store.novedades(rec.id);
  cont.innerHTML = `<div class="grid-2">
    <div class="card anim"><div class="card-head"><h3>Libro de novedades · <span class="mono">${esc(rec.nombre)}</span></h3>
      <div class="flujo">${mecanico || admin ? `<button class="btn ${rec.estado === 'operativa' ? 'danger' : 'ok'} sm" id="toggle">${rec.estado === 'operativa' ? 'Poner fuera de servicio' : 'Habilitar (operativo)'}</button>` : ''}
        ${admin ? '<button class="btn sec sm" id="edit-rec">Editar equipo</button>' : ''}</div></div>
      ${novs.length ? novs.map((n, i) => itemNovedad({ ...n, recurso: null }, i, { mecanico })).join('') : vacio('Sin novedades registradas.')}</div>
    ${reportar ? `<div class="card anim" style="--i:1;align-self:start"><div class="card-head"><h3>${mecanico ? 'Nueva anotación' : 'Reportar novedad'}</h3></div>
      <form id="f-nov" style="display:grid;gap:12px">
        <label class="campo">Tipo<select id="n-tipo" name="tipo">${Object.entries(TIPO_NOV).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
        <label class="campo">Descripción<textarea id="n-desc" name="descripcion" placeholder="Ej: Indicador de temperatura de aceite oscila en crucero…"></textarea></label>
        ${mecanico ? '' : '<p class="muted" style="margin:0">El mecánico revisa cada reporte y decide si corresponde, lo corrige o lo da por resuelto.</p>'}
        <button class="btn" type="submit">${mecanico ? 'Agregar al libro' : 'Enviar al mecánico'}</button></form></div>` : ''}</div>`;
  const f = $('#f-nov', cont);
  if (f) f.onsubmit = async (e) => { e.preventDefault(); if (await hacer(async () => { await Store.reportarNovedad(rec.id, f.tipo.value, f.descripcion.value); return true; }, mecanico ? 'Anotación agregada' : 'Novedad reportada al mecánico')) await recargar(); };
  const t = $('#toggle', cont);
  if (t) t.onclick = async () => { const n = await hacer(async () => await Store.estadoRecurso(rec.id, rec.estado === 'operativa' ? 'mantenimiento' : 'operativa'));
    if (n !== undefined) { toast(n ? `${rec.nombre} fuera de servicio. Tiene ${n} reserva(s) pendiente(s) para reprogramar.` : 'Estado actualizado', 'ok'); await recargar(); } };
  const ed = $('#edit-rec', cont); if (ed) ed.onclick = () => editarRecurso(rec, recargar);
  $$('[data-rev]', cont).forEach((b) => b.onclick = () => revisarNovedad(novs.find((n) => n.id == b.dataset.rev), recargar));
}
function revisarNovedad(n, despues) {
  const m = modal(`<div class="modal-head"><div><h3>Revisión del mecánico</h3><div class="muted">${esc(n.recurso)} · reportó ${esc(n.autor)}</div></div><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <form class="modal-body" id="f-rev" style="display:grid;gap:12px">
      <label class="campo">Decisión<select id="r-estado" name="estado">
        <option value="en_revision" ${n.estado === 'en_revision' ? 'selected' : ''}>Correcto, queda en revisión / trabajo pendiente</option>
        <option value="resuelta" ${n.estado === 'resuelta' ? 'selected' : ''}>Resuelta</option>
        <option value="descartada" ${n.estado === 'descartada' ? 'selected' : ''}>No es falla (descartada)</option>
        <option value="reportada" ${n.estado === 'reportada' ? 'selected' : ''}>Sin revisar</option></select></label>
      <label class="campo">Tipo<select id="r-tipo" name="tipo">${Object.entries(TIPO_NOV).map(([k, t]) => `<option value="${k}" ${n.tipo === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="campo">Descripción <span class="op">(podés corregir lo que se anotó)</span><textarea id="r-desc" name="descripcion">${esc(n.descripcion)}</textarea></label>
      <label class="campo">Comentario del mecánico<textarea id="r-com" name="comentario" placeholder="Qué se hizo, qué falta o por qué no corresponde">${esc(n.revision?.comentario || '')}</textarea></label>
    </form><div class="modal-foot"><button class="btn sec" data-cerrar>Volver</button><button class="btn" id="r-ok">Guardar revisión</button></div>`);
  $('#r-ok', m.el).onclick = async () => { if (await hacer(async () => { await Store.revisarNovedad(n.id, Object.fromEntries(new FormData($('#f-rev', m.el)))); return true; }, 'Revisión guardada')) { m.cerrar(); despues(); } };
}
function editarRecurso(r, despues) {
  const m = modal(`<div class="modal-head"><h3>${r ? 'Editar equipo' : 'Agregar equipo'}</h3><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <form class="modal-body form-grid" id="f-rec">
      <label class="campo">Tipo<select id="e-tipo" name="tipo"><option value="avion" ${r?.tipo === 'avion' ? 'selected' : ''}>Aeronave</option><option value="simulador" ${r?.tipo === 'simulador' ? 'selected' : ''}>Simulador</option></select></label>
      <label class="campo">Matrícula o nombre<input id="e-nombre" name="nombre" value="${esc(r?.nombre || '')}" placeholder="LV-FCE"></label>
      <label class="campo full">Modelo<input id="e-modelo" name="modelo" value="${esc(r?.modelo || '')}" placeholder="Cessna 152"></label>
    </form><div class="modal-foot"><button class="btn sec" data-cerrar>Volver</button><button class="btn" id="e-ok">Guardar</button></div>`);
  $('#e-ok', m.el).onclick = async () => { if (await hacer(async () => await Store.guardarRecurso({ ...Object.fromEntries(new FormData($('#f-rec', m.el))), id: r?.id }), 'Equipo guardado')) { m.cerrar(); despues(); } };
}
VISTAS.flota = async function vistaFlota(v, sel) {
  const esAdmin = state.user.rol === 'admin';
  const recs = await Store.recursos(); sel = sel || state.flotaSel || recs[0]?.id; state.flotaSel = sel;
  v.innerHTML = hero('Flota', esAdmin ? 'Aeronaves y simuladores de la escuela. Podés agregar equipos y ver el libro de novedades de cada uno.' : 'Reportá fallas u observaciones. El mecánico revisa cada reporte y decide.',
    esAdmin ? '<div style="margin-top:14px"><button class="btn sec" id="nuevo-rec">+ Agregar equipo</button></div>' : '') + tarjetasFlota(recs, sel) + '<div id="libro" style="margin-top:22px"></div>';
  $$('.avion', v).forEach((b) => b.onclick = async () => await VISTAS.flota(v, Number(b.dataset.av)));
  const nr = $('#nuevo-rec', v); if (nr) nr.onclick = () => editarRecurso(null, async () => await VISTAS.flota(v));
  const rec = recs.find((r) => r.id === sel);
  if (rec) await libroNovedades($('#libro', v), rec, { reportar: true, admin: esAdmin, recargar: async () => await VISTAS.flota(v, sel) });
};
VISTAS.mantenimiento = async function vistaMantenimiento(v, sel) {
  const recs = await Store.recursos(); const todas = await Store.novedades();
  const pend = todas.filter((n) => n.estado === 'reportada'); const enRev = todas.filter((n) => n.estado === 'en_revision');
  sel = sel || state.flotaSel || recs[0]?.id; state.flotaSel = sel;
  v.innerHTML = hero(`Hola, ${esc(state.user.nombre)}`, 'Revisá los reportes de los instructores: confirmá si es falla, corregí la anotación, cerrala cuando esté resuelta y habilitá o sacá de servicio cada equipo.') + `
    <div class="stats">${stat('Reportes sin revisar', pend.length, { dest: true, i: 1 })}${stat('En revisión', enRev.length, { i: 2 })}
      ${stat('Fuera de servicio', recs.filter((r) => r.estado !== 'operativa').length, { i: 3 })}${stat('Equipos operativos', recs.filter((r) => r.estado === 'operativa').length, { i: 4 })}</div>
    <div class="card anim" style="--i:5"><div class="card-head"><h3>Pendientes de revisión</h3><span class="badge ${pend.length ? 'danger' : 'ok'}">${pend.length}</span></div>
      ${pend.length ? pend.map((n, i) => itemNovedad(n, i, { mecanico: true })).join('') : vacio('No hay reportes nuevos. ¡Todo revisado!')}</div>
    <h3 class="anim" style="margin:26px 0 14px">Flota</h3>${tarjetasFlota(recs, sel)}<div id="libro" style="margin-top:22px"></div>`;
  animarNumeros(v);
  const recargar = async () => await VISTAS.mantenimiento(v, sel);
  $$('.card [data-rev]', v).forEach((b) => b.onclick = () => revisarNovedad(todas.find((n) => n.id == b.dataset.rev), recargar));
  $$('.avion', v).forEach((b) => b.onclick = async () => await VISTAS.mantenimiento(v, Number(b.dataset.av)));
  const rec = recs.find((r) => r.id === sel);
  if (rec) await libroNovedades($('#libro', v), rec, { mecanico: true, reportar: true, recargar });
};

// =====================================================================
//                        ADMINISTRACIÓN
// =====================================================================
VISTAS.panel = async function vistaPanel(v) {
  const p = await Store.panelAdmin(); const hoy = isoLocal(new Date());
  const items = [...p.hoyRes.map((r) => ({ b: r.bloque, t: `${TIPO_RES[r.tipo]} · <b>${esc(r.piloto)}</b> · ${esc(r.recurso)} · ${esc(r.instructor || 'sin instructor')} ${r.estado === 'pendiente' ? badgeLlegada(r) : ''}`, e: r.estado })),
    ...p.hoyCla.map((k) => ({ b: k.bloque, t: `Clase ${esc(k.teo)} · ${esc(k.titulo)} · ${esc(k.instructor)} · ${k.inscriptos} alumnos`, e: k.estado }))].sort((a, b) => a.b - b.b);
  v.innerHTML = hero('Panel de administración', `<span class="cap">${esc(fmtFecha(hoy))}</span>. Desde acá manejás instructores, clases, reservas, usuarios y flota.`) + `
    <div class="stats">${stat('Actividades hoy', items.length, { dest: true, i: 1 })}${stat('Reservas próximos 7 días', p.semana, { i: 2 })}
      ${stat('Aviones operativos', p.aviones.filter((a) => a.estado === 'operativa').length, { suf: `/ ${p.aviones.length}`, i: 3 })}
      ${stat('Simuladores operativos', p.sims.filter((a) => a.estado === 'operativa').length, { suf: `/ ${p.sims.length}`, i: 4 })}
      ${stat('Reportes sin revisar', p.reportadas, { i: 5 })}${stat('Alumnos activos', p.alumnos, { i: 6 })}</div>
    <div class="grid-2">
      <div class="card anim" style="--i:7"><div class="card-head"><h3>Agenda de hoy</h3></div>
        ${items.length ? `<div class="agenda-hoy">${items.map((x) => `<div class="agenda-fila"><span class="mono">${rango(x.b)}</span><span>${x.t}</span></div>`).join('')}</div>` : vacio('No hay actividad programada hoy.')}</div>
      <div class="card anim" style="--i:8"><div class="card-head"><h3>Alertas</h3></div>
        ${p.vence.map((u) => `<div class="aviso ${u.vencido ? 'warn' : ''}"><div><strong>${esc(u.nombre)} ${esc(u.apellido)} · CMA ${u.vencido ? 'vencido' : 'por vencer'}</strong>${esc(ROLES[u.rol])} · vence ${esc(fmtCorta(u.vencimiento_cma))}</div></div>`).join('')}
        ${p.reportadas ? `<div class="aviso warn"><div><strong>${p.reportadas} reporte(s) de flota sin revisar</strong>El mecánico todavía no los revisó.</div></div>` : ''}
        ${p.sinInstructor.length ? `<div class="aviso"><div><strong>Instructores sin turnos hoy</strong>${p.sinInstructor.map((i) => esc(`${i.nombre} ${i.apellido}`)).join(', ')}</div></div>` : ''}
        ${!p.vence.length && !p.reportadas && !p.sinInstructor.length ? vacio('Sin alertas.') : ''}
        <button class="btn sec sm" id="ir-dispo" style="margin-top:8px">Asignar instructores</button></div>
    </div>`;
  animarNumeros(v);
  $('#ir-dispo', v).onclick = async () => await irA('dispo');
};

async function gridDisponibilidad(cont, lunes, { editable, inst }) {
  const d = await Store.disponibilidadSemana(lunes, inst); const hoy = isoLocal(new Date());
  cont.innerHTML = `<div class="tabla-wrap"><table class="dispo"><thead><tr><th>${editable ? 'Instructor' : ''}</th>${d.dias.map((f) => `<th class="dia-head ${f === hoy ? 'hoy' : ''}"><small>${parseISO(f).toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')}</small>${fmtDM(f)}</th>`).join('')}</tr></thead><tbody>
    ${d.filas.map((i) => `<tr><td><strong>${esc(i.nombre)} ${esc(i.apellido)}</strong><div class="muted">${i.dias.reduce((s, x) => s + x.bloques.filter((b) => b.disponible).length, 0)} bloques</div></td>
      ${i.dias.map((x) => `<td><div class="chips">${x.bloques.map((b) => `<button class="chip ${b.ocupado ? 'ocupado' : b.disponible ? 'on' : ''}" ${editable ? '' : 'disabled'} data-i="${i.id}" data-f="${x.fecha}" data-b="${b.bloque}" title="${b.ocupado ? esc(b.ocupado) : `${rango(b.bloque)} · ${b.disponible ? 'Vuela' : 'No vuela'}`}">${String(b.bloque).padStart(2, '0')}</button>`).join('')}</div>
        ${editable ? `<div class="dia-acc"><button data-todo="${i.id}|${x.fecha}|1">todo</button><button data-todo="${i.id}|${x.fecha}|0">libre</button></div>` : ''}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div>
  <div class="leyenda"><span><span class="chip on" style="display:inline-block;padding:2px 6px">08</span> vuela en ese bloque</span><span><span class="chip ocupado" style="display:inline-block;padding:2px 6px">08</span> ya tiene vuelo o clase</span><span><span class="chip" style="display:inline-block;padding:2px 6px">08</span> no vuela</span></div>`;
  if (!editable) return;
  const re = async () => await gridDisponibilidad(cont, lunes, { editable, inst });
  $$('.chip[data-i]', cont).forEach((c) => c.onclick = async () => { await hacer(async () => await Store.alternarDisponibilidad(Number(c.dataset.i), c.dataset.f, Number(c.dataset.b))); await re(); });
  $$('[data-todo]', cont).forEach((c) => c.onclick = async () => { const [i, f, on] = c.dataset.todo.split('|'); await hacer(async () => await Store.diaCompleto(Number(i), f, on === '1')); await re(); });
}
VISTAS.dispo = async function vistaDispo(v, lunes = state.semana || lunesDe()) {
  state.semana = lunes;
  const mover = (n) => { const d = parseISO(lunes); d.setDate(d.getDate() + n); return isoLocal(d); };
  v.innerHTML = hero('Disponibilidad de instructores', 'Marcá en qué días y bloques vuela cada instructor. Los alumnos y pilotos solo pueden reservar con instructores asignados en ese horario.') + `
    <div class="card anim" style="--i:1"><div class="card-head"><div class="flujo"><button class="btn sec sm" id="ant">← Semana anterior</button><button class="btn sec sm" id="hoy">Esta semana</button><button class="btn sec sm" id="sig">Semana siguiente →</button></div>
      <div class="flujo"><span class="muted">Semana del ${esc(fmtCorta(lunes))}</span><button class="btn sm" id="copiar">Copiar a la semana siguiente</button></div></div><div id="grid"></div></div>`;
  await gridDisponibilidad($('#grid', v), lunes, { editable: true });
  $('#ant', v).onclick = async () => await VISTAS.dispo(v, mover(-7)); $('#sig', v).onclick = async () => await VISTAS.dispo(v, mover(7)); $('#hoy', v).onclick = async () => await VISTAS.dispo(v, lunesDe());
  $('#copiar', v).onclick = async () => { await hacer(async () => await Store.copiarSemana(lunes), 'Semana copiada a la siguiente'); await VISTAS.dispo(v, mover(7)); };
};

VISTAS.todas = async function vistaTodas(v, filtros = state.filtrosRes || { desde: isoLocal(new Date()), hasta: '', tipo: '', estado: 'pendiente' }) {
  state.filtrosRes = filtros;
  const l = await Store.todasReservas(filtros);
  v.innerHTML = hero('Reservas', 'Todas las reservas de vuelo y simulador. Podés cancelar cualquiera o ver la ficha del piloto.') + `
    <div class="card anim" style="--i:1"><div class="filtro">
      <label class="campo">Desde<input id="fd" type="date" value="${filtros.desde}"></label><label class="campo">Hasta<input id="fh" type="date" value="${filtros.hasta}"></label>
      <label class="campo">Tipo<select id="ft"><option value="">Todos</option><option value="vuelo" ${filtros.tipo === 'vuelo' ? 'selected' : ''}>Vuelo</option><option value="simulador" ${filtros.tipo === 'simulador' ? 'selected' : ''}>Simulador</option></select></label>
      <label class="campo">Estado<select id="fe"><option value="">Todos</option>${['pendiente', 'completado', 'ausente', 'cancelado'].map((e) => `<option ${filtros.estado === e ? 'selected' : ''}>${e}</option>`).join('')}</select></label></div>
      ${l.length ? `<div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Horario</th><th>Tipo</th><th>Piloto</th><th>Instructor</th><th>Equipo</th><th>Estado</th><th></th></tr></thead><tbody>
        ${l.map((r) => `<tr><td style="white-space:nowrap">${esc(fmtCorta(r.fecha))}</td><td class="mono">${rango(r.bloque)}</td><td>${badgeTipo(r.tipo)}</td>
          <td><a href="#" data-piloto="${r.piloto_id}">${esc(r.piloto)}</a><div class="muted">${r.piloto_rol === 'ppa' ? 'PPA' : 'Alumno'}</div></td><td>${esc(r.instructor || '—')}</td>
          <td class="mono">${esc(r.recurso)}</td><td>${badgeEstado(r)}</td><td style="white-space:nowrap">${r.estado === 'pendiente' && turnoEmpezo(r) && !r.llegada ? `<button class="btn warn-btn sm" data-aus="${r.id}">Ausente</button> ` : ''}${r.estado === 'pendiente' ? `<button class="btn danger sm" data-c="${r.id}">Cancelar</button>` : ''}${r.estado === 'ausente' ? `<button class="btn sec sm" data-desaus="${r.id}">Deshacer ausencia</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>` : vacio('No hay reservas con esos filtros.')}</div>`;
  const leer = async () => await VISTAS.todas(v, { desde: $('#fd', v).value, hasta: $('#fh', v).value, tipo: $('#ft', v).value, estado: $('#fe', v).value });
  $$('.filtro input, .filtro select', v).forEach((x) => x.onchange = leer);
  $$('[data-piloto]', v).forEach((a) => a.onclick = async (e) => { e.preventDefault(); await fichaPiloto(a.dataset.piloto); });
  $$('[data-aus]', v).forEach((b) => b.onclick = () => marcarAusente(l.find((r) => r.id == b.dataset.aus), leer));
  $$('[data-desaus]', v).forEach((b) => b.onclick = () => deshacerAusencia(b.dataset.desaus, leer));
  $$('[data-c]', v).forEach((b) => b.onclick = async () => { if (await confirmar('Cancelar reserva', 'Avisale al piloto que su reserva fue cancelada.', 'Cancelar reserva')) { await hacer(async () => await Store.cancelarReserva(b.dataset.c), 'Reserva cancelada'); await leer(); } });
};

VISTAS.usuarios = async function vistaUsuarios(v, rol = state.filtroRol || '', q = '') {
  state.filtroRol = rol;
  const l = (await Store.usuarios(rol)).filter((u) => !q || `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
  v.innerHTML = hero('Usuarios', 'Altas, bajas y datos de alumnos, pilotos, instructores, mecánicos y administradores. Solo pueden ingresar quienes estén cargados acá.',
    '<div style="margin-top:14px"><button class="btn sec" id="nuevo">+ Nuevo usuario</button></div>') + `
    <div class="card anim" style="--i:1"><div class="filtro"><select id="fr" aria-label="Tipo de usuario"><option value="">Todos los tipos</option>${Object.entries(ROLES).map(([k, t]) => `<option value="${k}" ${rol === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <input id="fq" placeholder="Buscar por nombre o email" value="${esc(q)}" aria-label="Buscar"></div>
      <div class="tabla-wrap"><table><thead><tr><th>Nombre</th><th>Tipo</th><th>Email</th><th>Teléfono</th><th>CMA</th><th>Estado</th><th></th></tr></thead><tbody>
      ${l.map((u) => `<tr><td><strong>${esc(u.nombre)} ${esc(u.apellido)}</strong></td><td><span class="badge">${esc(ROLES[u.rol])}</span></td><td>${esc(u.email)}</td><td>${esc(u.telefono || '—')}</td>
        <td>${u.vencimiento_cma ? `${esc(fmtCorta(u.vencimiento_cma))}${u.vencimiento_cma < isoLocal(new Date()) ? ' <span class="badge danger">Vencido</span>' : ''}` : '—'}</td>
        <td>${u.activo ? '<span class="badge ok">Activo</span>' : '<span class="badge gris">Inactivo</span>'}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn sec sm" data-e="${u.id}">Editar</button>${u.rol === 'alumno' ? ` <button class="btn sm" data-syl="${u.id}">Syllabus</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  $('#fr', v).onchange = async (e) => await VISTAS.usuarios(v, e.target.value, $('#fq', v).value);
  $('#fq', v).oninput = (e) => { clearTimeout(state.tq); state.tq = setTimeout(async () => { await VISTAS.usuarios(v, rol, e.target.value); const i = $('#fq', v); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
  $('#nuevo', v).onclick = () => editarUsuario(null, async () => await VISTAS.usuarios(v, rol));
  $$('[data-e]', v).forEach((b) => b.onclick = async () => editarUsuario(await Store.usuario(b.dataset.e), async () => await VISTAS.usuarios(v, rol, q)));
  $$('[data-syl]', v).forEach((b) => b.onclick = async () => await abrirLibro(Number(b.dataset.syl)));
};
const ROL_INFO = {
  alumno: ['Alumno piloto', 'Reserva vuelos de a un bloque por día, simulador y clases teóricas. Tiene su syllabus.'],
  ppa: ['Piloto privado (PPA)', 'Reserva vuelos de varios bloques, elige avión y destino, y también simulador.'],
  instructor: ['Instructor de vuelo', 'Vuela en los horarios que le asignes, califica el syllabus y reporta fallas.'],
  mecanico: ['Mecánico', 'Revisa los libros de novedades y habilita o saca de servicio aviones y simuladores.'],
  admin: ['Administración', 'Acceso completo: usuarios, instructores, clases, reservas y flota.'],
};
const ROL_ICO = { alumno: 'AL', ppa: 'PPA', instructor: 'IV', mecanico: ICON.llave, admin: 'ADM' };
async function editarUsuario(u, despues, rolElegido) {
  if (!u && !rolElegido) {
    const m = modal(`<div class="modal-head"><div><h3>Nuevo usuario</h3><div class="muted">¿Qué tipo de usuario vas a crear?</div></div><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
      <div class="modal-body"><div class="roles-grid">${Object.entries(ROL_INFO).map(([k, [t, d]], i) => `<button class="opcion rol-op anim" style="--i:${i}" data-rol="${k}">
        <span class="ico">${ROL_ICO[k]}</span><span><strong>${t}</strong><small>${d}</small></span></button>`).join('')}</div></div>`, { ancho: true });
    $$('[data-rol]', m.el).forEach((b) => b.onclick = () => { m.cerrar(); setTimeout(() => editarUsuario(null, despues, b.dataset.rol), 120); });
    return;
  }
  const rol = u?.rol || rolElegido;
  const aviones = await Store.recursos('avion');
  const yoMismo = u && u.id === state.user.id;
  const c = (n, l, t = 'text', roles = '', extra = '') => `<label class="campo ${extra}" ${roles ? `data-roles="${roles}"` : ''}>${l}<input id="u-${n}" type="${t}" name="${n}" value="${esc(u?.[n] ?? '')}"></label>`;
  const m = modal(`<div class="modal-head"><div><h3>${u ? `${esc(u.nombre)} ${esc(u.apellido)}` : `Nuevo usuario · ${ROL_INFO[rol][0]}`}</h3><div class="muted" id="u-desc">${ROL_INFO[rol][1]}</div></div><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <form class="modal-body form-grid" id="f-u">
      <label class="campo">Tipo de usuario<select id="u-rol" name="rol" ${yoMismo ? 'disabled' : ''}>${Object.entries(ROL_INFO).map(([k, [t]]) => `<option value="${k}" ${rol === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      ${u ? `<label class="campo">Estado<select id="u-activo" name="activo" ${yoMismo ? 'disabled' : ''}><option value="1" ${u.activo ? 'selected' : ''}>Activo</option><option value="" ${!u.activo ? 'selected' : ''}>Inactivo (no puede ingresar)</option></select></label>` : '<span></span>'}
      ${c('nombre', 'Nombre completo')} ${c('apellido', 'Apellido')} ${c('email', 'Email (con este inicia sesión)', 'email')} ${c('telefono', 'Teléfono', 'tel')}
      ${c('direccion', 'Dirección', 'text', '', 'full')} ${c('dni', 'DNI')} ${c('fecha_nacimiento', 'Fecha de nacimiento', 'date')}
      ${c('licencia_nro', '<span id="u-lic-lbl">N° de licencia</span>', 'text', 'alumno ppa instructor mecanico')} ${c('vencimiento_cma', 'Vencimiento del CMA', 'date', 'alumno ppa instructor')}
      ${c('horas_previas', 'Horas de vuelo previas', 'number', 'alumno ppa instructor')} ${selectNacionalidad('u-nacionalidad', u?.nacionalidad)} ${c('contacto_emergencia', 'Contacto de emergencia', 'text', '', 'full')}
      ${bloqueTutor('u', u)}
      <label class="campo full">${u ? 'Nueva contraseña <span class="op">(dejar vacío para no cambiarla)</span>' : 'Contraseña inicial <span class="op">(se la pasás al usuario para que ingrese)</span>'}<input id="u-password" type="text" name="password" autocomplete="off" placeholder="mínimo 6 caracteres"></label>
      <fieldset class="hab-caja full" data-roles="alumno ppa"><legend>Habilitaciones</legend>
        <div class="marcas">
          <label class="marca"><input type="checkbox" id="h-solo" ${u?.hab?.solo ? 'checked' : ''}> Vuelo solo (reservar sin instructor)</label>
          <label class="marca"><input type="checkbox" id="h-sim" ${u?.hab?.sim_solo ? 'checked' : ''}> Simulador sin instructor</label>
          <label class="marca"><input type="checkbox" id="h-trav" ${u?.hab?.travesia ? 'checked' : ''}> Travesías (destino distinto de MOR)</label>
          <label class="marca" data-roles="ppa"><input type="checkbox" id="h-bristell" ${u?.hab?.bristell ? 'checked' : ''}> Adaptado a Bristell</label>
        </div>
        <small class="lbl" style="margin-top:12px">Aeronaves habilitadas</small>
        <div class="marcas" id="h-aviones">${aviones.map((a) => `<label class="marca"><input type="checkbox" value="${a.id}" ${!Array.isArray(u?.hab?.aeronaves) || u.hab.aeronaves.includes(a.id) ? 'checked' : ''}> <b>${esc(a.nombre)}</b> ${esc(a.modelo)}</label>`).join('')}</div>
      </fieldset>
    </form><div class="modal-foot"><button class="btn sec" data-cerrar>Volver</button><button class="btn" id="u-ok">${u ? 'Guardar' : 'Crear usuario'}</button></div>`, { ancho: true });
  const LIC = { alumno: 'N° de licencia <span class="op">(si tiene)</span>', ppa: 'N° de licencia PPA', instructor: 'N° de licencia de instructor', mecanico: 'N° de licencia de mecánico' };
  const ajustar = () => {
    const r = $('#u-rol', m.el).value;
    $$('[data-roles]', m.el).forEach((el) => { el.hidden = !el.dataset.roles.split(' ').includes(r); });
    $('#u-lic-lbl', m.el).innerHTML = LIC[r] || 'N° de licencia';
    $('#u-desc', m.el).textContent = ROL_INFO[r][1];
    
  };
  const ajustarTutor = activarTutor($('#f-u', m.el), () => $('#u-rol', m.el).value);
  $('#u-rol', m.el).onchange = () => { ajustar(); ajustarTutor(); }; ajustar();
  $('#u-ok', m.el).onclick = async () => {
    const d = Object.fromEntries(new FormData($('#f-u', m.el)));
    if (yoMismo) d.rol = u.rol;
    for (const el of $$('[data-roles][hidden] input', m.el)) d[el.name] = el.name === 'horas_previas' ? 0 : '';
    if ($('[data-tutor]', m.el).hidden) for (const k of ['tutor_nombre', 'tutor_parentesco', 'tutor_telefono', 'tutor_email']) d[k] = '';
    d.nacionalidad = $('#u-nacionalidad', m.el).value;
    if (u) { if (!yoMismo) d.activo = d.activo === '1'; else delete d.activo; }
    const guardado = await hacer(async () => {
      const r = u ? await Store.guardarPerfil(d, u.id) : await Store.crearUsuario(d);
      if (['alumno', 'ppa'].includes(d.rol || r.rol)) {
        const todos = $$('#h-aviones input', m.el); const marcados = todos.filter((x) => x.checked).map((x) => Number(x.value));
        await Store.guardarHabilitaciones(r.id, { solo: $('#h-solo', m.el).checked, sim_solo: $('#h-sim', m.el).checked, travesia: $('#h-trav', m.el).checked, ...((d.rol || r.rol) === 'ppa' ? { bristell: $('#h-bristell', m.el).checked } : {}),
          aeronaves: marcados.length === todos.length ? null : marcados });
      }
      return r;
    }, u ? 'Usuario actualizado' : `Usuario creado: ${ROL_INFO[d.rol][0]}`);
    if (guardado) { m.cerrar(); despues(); }
  };
}

// (el inicio está en app3.js)

// pilotos PPA: el instructor puede darles o quitarles la adaptación a Bristell
async function tarjetaBristell(v) {
  if (!['instructor', 'admin'].includes(state.user?.rol)) return;
  const l = await Store.pilotosPPA().catch(() => []);
  const card = document.createElement('div'); card.className = 'card anim'; card.id = 'card-bristell';
  card.innerHTML = `<div class="card-head"><h3>Pilotos PPA · adaptación a Bristell</h3><span class="muted">Solo los pilotos adaptados pueden reservar aviones Bristell</span></div>
    ${l.length ? `<div class="tabla-wrap"><table><thead><tr><th>Piloto</th><th>Adaptación</th><th></th></tr></thead><tbody>
    ${l.map((p) => `<tr><td><strong>${esc(p.nombre)} ${esc(p.apellido)}</strong><div class="muted">${esc(p.licencia_nro || '')}</div></td>
      <td>${p.hab?.bristell ? `<span class="badge ok">✓ Adaptado/a</span> <span class="muted">${esc(p.hab.bristell_por || '')}${p.hab.bristell_fecha ? ` · ${esc(fmtCorta(p.hab.bristell_fecha))}` : ''}</span>` : '<span class="badge gris">No adaptado/a</span>'}</td>
      <td style="text-align:right"><button class="btn ${p.hab?.bristell ? 'danger' : 'ok'} sm" data-br="${p.id}" data-v="${p.hab?.bristell ? 0 : 1}">${p.hab?.bristell ? 'Quitar' : 'Marcar adaptado/a'}</button></td></tr>`).join('')}
    </tbody></table></div>` : vacio('No hay pilotos PPA cargados.')}`;
  const prev = $('#card-bristell', v); if (prev) prev.remove();
  v.append(card);
  $$('[data-br]', card).forEach((b) => b.onclick = async () => {
    const r = await hacer(() => Store.adaptacionBristell(Number(b.dataset.br), b.dataset.v === '1'), b.dataset.v === '1' ? 'Piloto adaptado a Bristell' : 'Adaptación a Bristell quitada');
    if (r) tarjetaBristell(v);
  });
}
