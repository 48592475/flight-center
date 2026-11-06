/* Flight Center · interfaz (parte 5: avisos por email y WhatsApp) */

const datosAviso = contenidoAviso;
const saludo = (n) => `Estimado/a ${n.nombre} ${n.apellido}`;

function emailHTML(n) {
  const a = datosAviso(n);
  return `<div class="mail"><div class="mail-meta"><div><b>De:</b> Flight Center &lt;reservas@flightcenter.com.ar&gt;</div><div><b>Para:</b> ${esc(n.destino)}</div><div><b>Asunto:</b> ${esc(a.asunto)}</div></div>
    <div class="mail-cuerpo">
      <div class="mail-head"><img src="${LOGOS.oscuro}" alt="Flight Center"><span>Escuela de vuelo · Aeródromo de Morón</span></div>
      <div class="mail-main">
        <h2>${esc(a.titulo)}</h2>
        <p>${esc(saludo(n))}:</p><p>${esc(a.intro)}</p>
        <table class="mail-tabla">${a.filas.map(([k, v], i) => `<tr class="${n.tipo === 'deuda' && i === 0 ? 'total' : ''}"><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
        <div class="mail-notas">${a.notas.map((x) => `<p>${esc(x)}</p>`).join('')}</div>
        <p>Saludos cordiales,</p><p class="firma">Administración<br>Flight Center</p>
      </div>
      <div class="mail-pie">Flight Center · Aeródromo de Morón (SADM), Buenos Aires · Este es un mensaje automático, por favor no lo responda.</div>
    </div></div>`;
}
function whatsappHTML(n) {
  const a = datosAviso(n);
  const fmt = (t) => esc(t).replace(/\*(.+?)\*/g, '<b>$1</b>').replace(/_(.+?)_/g, '<i>$1</i>');
  return `<div class="wpp"><div class="wpp-top"><img src="${LOGOS.oscuro}" alt=""><div><b>Flight Center</b><small>Cuenta de empresa · para ${esc(n.destino)}</small></div></div>
    <div class="wpp-chat"><div class="wpp-msg">${a.wpp.map(fmt).join('<br>')}<span class="wpp-hora">${esc(n.fecha.slice(11, 16))} ✓✓</span></div></div></div>`;
}
function verMensajes(lista) {
  if (!lista.length) return toast('No hay mensajes para mostrar. Revisá tus preferencias de aviso en Mi perfil.', 'error');
  const mail = lista.find((x) => x.canal === 'email'); const wpp = lista.find((x) => x.canal === 'whatsapp');
  modal(`<div class="modal-head"><div><h3>${esc(datosAviso(lista[0]).titulo)}</h3><div class="muted">${[mail ? 'Email' : '', wpp ? 'WhatsApp' : ''].filter(Boolean).join(' y ')} · ${esc(lista[0].fecha)} hs</div></div><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <div class="modal-body">${MODO === 'demo' ? '<div class="aviso" style="margin-bottom:16px"><div><strong>Vista previa de la demo</strong>Así le llega el aviso al alumno o piloto. En la versión con servidor se envía solo, al email y al WhatsApp cargados en su perfil.</div></div>' : `<div class="aviso" style="margin-bottom:16px"><div>${lista.map((x) => `<div><strong>${x.canal === 'email' ? 'Email' : 'WhatsApp'}:</strong> ${ESTADO_ENVIO[x.estado] || x.estado}${x.detalle ? ` · ${esc(x.detalle)}` : ''}</div>`).join('')}</div></div>`}
      <div class="msj-grid">${mail ? `<div><div class="msj-canal">Email</div>${emailHTML(mail)}</div>` : ''}${wpp ? `<div><div class="msj-canal">WhatsApp</div>${whatsappHTML(wpp)}</div>` : ''}</div></div>`, { ancho: true });
  $('#modal-root .modal:last-of-type')?.style.setProperty('width', 'min(1080px, 100%)');
}

// ---------- vista de avisos ----------
const ESTADO_ENVIO = { enviado: 'Enviado ✓', pendiente: 'En cola de envío', error: 'No se pudo enviar', sin_configurar: 'No enviado: el canal todavía no está configurado en el servidor', demo: 'Demo' };
const TIPO_AVISO = { reserva: 'Reserva confirmada', clase: 'Inscripción a clase', deuda: 'Recordatorio de pago', tp_nuevo: 'Nuevo trabajo práctico', correccion: 'Trabajo corregido' };
VISTAS.avisos = async function vistaAvisos(v) {
  const esAdmin = state.user.rol === 'admin';
  const l = esAdmin ? await Store.notificaciones() : await Store.misNotificaciones();
  // agrupa email + WhatsApp del mismo aviso
  const grupos = []; const idx = new Map();
  for (const n of l) { const k = `${n.usuario_id}|${n.tipo}|${n.fecha}`; if (!idx.has(k)) { idx.set(k, grupos.length); grupos.push([]); } grupos[idx.get(k)].push(n); }
  const hoyD = isoLocal(new Date());
  const deudasHoy = esAdmin ? grupos.filter((g) => g[0].tipo === 'deuda' && g[0].dia === hoyD).length : 0;
  v.innerHTML = hero('Avisos', esAdmin ? 'Todos los emails y WhatsApp que envía el sistema: confirmaciones de reserva y el recordatorio diario a quienes tienen saldo pendiente.' : 'Las confirmaciones de tus reservas y los recordatorios que te enviamos por email y WhatsApp.') + `
    ${esAdmin ? `<div class="stats"><div class="stat dest anim" style="--i:1"><div class="lbl">Recordatorios de deuda hoy</div><div class="val">${deudasHoy}</div></div>
      <div class="stat anim" style="--i:2"><div class="lbl">Avisos enviados</div><div class="val">${grupos.length}</div></div></div>
      <div class="aviso anim" style="--i:2"><div style="flex:1"><strong>Recordatorio diario de deuda</strong>${MODO === 'servidor' ? 'Sale solo todos los días a las 9:00 a quienes tienen saldo a pagar.' : 'En la demo se genera al iniciar sesión.'} Si hoy ya salió, no se repite.</div><button class="btn sec sm" id="rec-ahora">Enviar ahora</button></div>` : ''}
    <div class="card anim" style="--i:3"><div class="card-head"><h3>${esAdmin ? 'Historial de avisos' : 'Mis avisos'}</h3><span class="badge">${grupos.length}</span></div>
      ${grupos.length ? `<div class="tabla-wrap"><table><thead><tr><th>Fecha</th>${esAdmin ? '<th>Destinatario</th>' : ''}<th>Aviso</th><th>Canales</th><th></th></tr></thead><tbody>
        ${grupos.map((g, i) => `<tr><td style="white-space:nowrap">${esc(fmtCorta(g[0].dia))} ${esc(g[0].fecha.slice(11, 16))}</td>${esAdmin ? `<td>${esc(g[0].nombre)} ${esc(g[0].apellido)}</td>` : ''}
          <td><span class="badge ${g[0].tipo === 'deuda' ? 'warn' : 'ok'}">${TIPO_AVISO[g[0].tipo]}</span> <span class="muted">${esc(datosAviso(g[0]).asunto)}</span></td>
          <td>${g.map((x) => `<span class="badge ${x.estado === 'enviado' ? 'ok' : x.estado === 'error' ? 'danger' : 'gris'}" title="${esc(ESTADO_ENVIO[x.estado] || '')}">${x.canal === 'email' ? 'Email' : 'WhatsApp'}${MODO === 'servidor' ? ` · ${x.estado === 'enviado' ? '✓' : x.estado === 'error' ? 'error' : x.estado === 'pendiente' ? '…' : 'sin enviar'}` : ''}</span>`).join(' ')}</td>
          <td><button class="btn sec sm" data-g="${i}">Ver</button></td></tr>`).join('')}</tbody></table></div>` : vacio('Todavía no hay avisos.')}</div>`;
  $$('[data-g]', v).forEach((b) => b.onclick = () => verMensajes(grupos[Number(b.dataset.g)]));
  const ra = $('#rec-ahora', v);
  if (ra) ra.onclick = async () => { const n = await hacer(() => Store.enviarRecordatoriosAhora()); if (n !== undefined) { toast(n ? `Se enviaron ${n} recordatorio(s)` : 'Hoy ya se enviaron todos los recordatorios', 'ok'); VISTAS.avisos(v); } };
};

// ---------- preferencias en el perfil ----------
{
  const perfil = VISTAS.perfil;
  VISTAS.perfil = async function (v) {
    await perfil(v);
    if (!['alumno', 'ppa'].includes(state.user.rol)) return;
    const u = await Store.yo(); const p = u.notif || { email: true, whatsapp: true };
    const card = document.createElement('div'); card.className = 'card anim';
    card.innerHTML = `<div class="card-head"><h3>Avisos</h3><span class="muted">Confirmaciones de reserva y recordatorios de pago</span></div>
      <div class="flujo"><label class="marca"><input type="checkbox" id="nt-email" ${p.email ? 'checked' : ''}> Por email (${esc(u.email)})</label>
      <label class="marca"><input type="checkbox" id="nt-wpp" ${p.whatsapp ? 'checked' : ''}> Por WhatsApp (${esc(u.telefono || 'sin teléfono cargado')})</label></div>`;
    $$('.card', v)[0].after(card);
    const g = async () => { state.user = await Store.guardarPreferencias({ email: $('#nt-email', v).checked, whatsapp: $('#nt-wpp', v).checked }); toast('Preferencias de aviso guardadas', 'ok'); };
    $('#nt-email', v).onchange = g; $('#nt-wpp', v).onchange = g;
  };
}
// ---------- aviso en el estado de cuenta ----------
{
  const cuenta = VISTAS.cuenta;
  VISTAS.cuenta = async function (v) {
    await cuenta(v);
    const r = (await Store.misNotificaciones()).filter((x) => x.tipo === 'deuda' && x.dia === isoLocal(new Date()));
    if (!r.length) return;
    const d = document.createElement('div'); d.className = 'aviso warn anim';
    d.innerHTML = `<div style="flex:1"><strong>Tenés un saldo pendiente</strong>Hoy te enviamos el recordatorio por ${r.map((x) => x.canal === 'email' ? 'email' : 'WhatsApp').join(' y ')}. Se envía una vez por día hasta que la cuenta quede al día.</div><button class="btn sec sm" id="ver-rec">Ver recordatorio</button>`;
    $('.stats', v).after(d);
    $('#ver-rec', d).onclick = () => verMensajes(r);
  };
}

