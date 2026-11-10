/* Flight Center · interfaz (parte 4: estado de cuenta y cobros) */

const pesos = (n) => `$ ${Math.round(n || 0).toLocaleString('es-AR')}`;
async function politicaTxt(tipo) {
  const t = await Store.tarifas();
  const base = tipo === 'teorica' ? t.teorica : t[tipo] * 2;
  return `Cancelación sin cargo hasta ${t.horas_aviso} hs antes. Después se cobra el ${t.recargo}% del valor del bloque (${pesos(base * t.recargo / 100)} por bloque).${tipo === 'teorica' ? '' : ` Si no te presentás sin avisar, se cobra el ${t.ausencia ?? 100}% (${pesos(base * (t.ausencia ?? 100) / 100)} por bloque).`}`;
}
function textoCargo(info) {
  const h = Math.floor(info.horas);
  if (!info.cargo) return `Faltan ${h} hs: la cancelación es sin cargo.`;
  return `Faltan ${h} hs (menos de ${info.horas_aviso}): se cobra el ${info.recargo}% de ${info.bloques} bloque(s), ${pesos(info.cargo)}, en tu estado de cuenta.`;
}

function tablaMovimientos(movs) {
  return movs.length ? `<div class="tabla-wrap"><table class="movs"><thead><tr><th>Fecha</th><th>Concepto</th><th class="num">Cargo</th><th class="num">Pago</th><th class="num">Saldo</th></tr></thead><tbody>
    ${movs.map((m) => `<tr><td style="white-space:nowrap">${esc(fmtCorta(m.fecha))}</td><td>${esc(m.concepto)}</td>
      <td class="num">${m.tipo === 'cargo' ? pesos(m.importe) : ''}</td><td class="num pago">${m.tipo === 'pago' ? pesos(m.importe) : ''}</td>
      <td class="num"><b>${pesos(Math.abs(m.saldo))}</b>${m.saldo < 0 ? ' <small>a favor</small>' : ''}</td></tr>`).join('')}
  </tbody></table></div>` : vacio('Todavía no hay movimientos.');
}
function tilesCuenta(c) {
  return `<div class="stats">
    <div class="stat dest anim" style="--i:1"><div class="lbl">${c.saldo > 0 ? 'Saldo a pagar' : c.saldo < 0 ? 'Saldo a favor' : 'Saldo'}</div><div class="val">${pesos(Math.abs(c.saldo))}</div></div>
    <div class="stat anim" style="--i:2"><div class="lbl">Total cargado</div><div class="val">${pesos(c.cargos)}</div></div>
    <div class="stat anim" style="--i:3"><div class="lbl">Total pagado</div><div class="val">${pesos(c.pagos)}</div></div></div>`;
}
const fh = (n) => `${String(Math.round(n * 10) / 10).replace('.', ',')} h`;
function tilesHoras(h) {
  return `<div class="stats">
    <div class="stat dest anim" style="--i:1"><div class="lbl">Horas de vuelo disponibles</div><div class="val">${fh(h.vuelo).replace(' h', '')}<small>h</small></div></div>
    <div class="stat anim" style="--i:2"><div class="lbl">Horas de simulador disponibles</div><div class="val">${fh(h.simulador).replace(' h', '')}<small>h</small></div></div>
    <div class="stat anim" style="--i:3"><div class="lbl">Compradas · usadas (vuelo)</div><div class="val" style="font-size:22px">${fh(h.compradas.vuelo)} · ${fh(h.usadas.vuelo)}</div></div></div>`;
}
function tablaHoras(movs) {
  return movs.length ? `<div class="tabla-wrap"><table class="movs"><thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th class="num">Horas</th><th class="num">Saldo</th></tr></thead><tbody>
    ${movs.map((m) => `<tr><td style="white-space:nowrap">${esc(fmtCorta(m.fecha))}</td><td>${esc(m.concepto)}</td><td>${badgeTipo(m.tipo)}</td>
      <td class="num ${m.horas > 0 ? 'pago' : ''}">${m.horas > 0 ? '+' : '−'}${fh(Math.abs(m.horas))}</td><td class="num"><b>${fh(m.saldo)}</b></td></tr>`).join('')}
  </tbody></table></div>` : vacio('Todavía no hay packs de horas. Se compran en la oficina de la escuela.');
}
function tarifasCard(t) {
  return `<div class="tarifas">
    <div><small>Hora de vuelo</small><b>${pesos(t.vuelo)}</b></div>
    <div><small>Hora de simulador</small><b>${pesos(t.simulador)}</b></div>
    <div><small>Clase teórica</small><b>${pesos(t.teorica)}</b></div>
    <div><small>Cancelación tardía</small><b>${t.recargo}% del bloque</b><em>con menos de ${t.horas_aviso} hs</em></div></div>`;
}

VISTAS.cuenta = async function vistaCuenta(v) {
  const c = await Store.miCuenta(); const modo = state.cuentaModo || 'dinero';
  const seg = `<div class="segmento anim" style="--i:0;margin-bottom:18px"><button class="${modo === 'dinero' ? 'on' : ''}" data-cm="dinero">Dinero</button><button class="${modo === 'horas' ? 'on' : ''}" data-cm="horas">Horas (packs)</button></div>`;
  if (modo === 'horas') {
    v.innerHTML = hero('Estado de cuenta', 'Tus packs de horas: lo que compraste, lo que usaste en cada vuelo o simulador y lo que te queda.') + seg + tilesHoras(c.horas) + `
      <div class="card anim" style="--i:4"><div class="card-head"><h3>Cómo funcionan los packs</h3></div>
        <p class="muted" style="margin:0">Cuando el instructor cierra un vuelo o un simulador, las horas se descuentan primero de tu pack. Si no te alcanzan, el resto se cobra a la tarifa vigente. Los packs se compran en la oficina de la escuela.</p></div>
      <div class="card anim" style="--i:5"><div class="card-head"><h3>Movimientos de horas</h3><span class="badge">${c.horas.movimientos.length}</span></div>${tablaHoras(c.horas.movimientos)}</div>`;
  } else {
  v.innerHTML = hero('Estado de cuenta', 'Tus vuelos, simuladores y clases se cargan cuando se completan. Los pagos los registra la administración.') + seg +
    tilesCuenta(c) + `
    <div class="card anim" style="--i:4"><div class="card-head"><h3>Tarifas vigentes</h3></div>${tarifasCard(c.tarifas)}
      <p class="muted" style="margin-bottom:0">El vuelo y el simulador se cobran por las horas registradas por el instructor. Un bloque de reserva equivale a 2 hs.</p></div>
    <div class="card anim" style="--i:5"><div class="card-head"><h3>Movimientos</h3><span class="badge">${c.movimientos.length}</span></div>${tablaMovimientos(c.movimientos)}</div>`;
  }
  $$('[data-cm]', v).forEach((b) => b.onclick = async () => { state.cuentaModo = b.dataset.cm; await VISTAS.cuenta(v); });
};

VISTAS.cuentas = async function vistaCuentas(v, q = '') {
  const l = (await Store.cuentas()).filter((u) => !q || `${u.nombre} ${u.apellido}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.saldo - a.saldo);
  const t = await Store.tarifas();
  const deuda = l.filter((u) => u.saldo > 0).reduce((s, u) => s + u.saldo, 0);
  v.innerHTML = hero('Cuentas', 'Saldos de alumnos y pilotos, registro de pagos y tarifas de la escuela.') + `
    <div class="stats"><div class="stat dest anim" style="--i:1"><div class="lbl">Total a cobrar</div><div class="val">${pesos(deuda)}</div></div>
      <div class="stat anim" style="--i:2"><div class="lbl">Con saldo pendiente</div><div class="val">${l.filter((u) => u.saldo > 0).length}</div></div>
      <div class="stat anim" style="--i:3"><div class="lbl">Cuentas</div><div class="val">${l.length}</div></div></div>
    <div class="card anim" style="--i:4"><div class="card-head"><h3>Tarifas</h3><button class="btn sec sm" id="ed-tar">Editar tarifas</button></div>${tarifasCard(t)}</div>
    <div class="card anim" style="--i:5"><div class="filtro"><input id="cq" placeholder="Buscar alumno o piloto" value="${esc(q)}" aria-label="Buscar"></div>
      <div class="tabla-wrap"><table class="movs"><thead><tr><th>Nombre</th><th>Tipo</th><th class="num">Cargado</th><th class="num">Pagado</th><th class="num">Saldo</th><th class="num">Horas pack</th><th></th></tr></thead><tbody>
      ${l.map((u) => `<tr><td><strong>${esc(u.nombre)} ${esc(u.apellido)}</strong></td><td><span class="badge">${u.rol === 'ppa' ? 'PPA' : 'Alumno'}</span></td>
        <td class="num">${pesos(u.cargos)}</td><td class="num pago">${pesos(u.pagos)}</td>
        <td class="num">${u.saldo > 0 ? `<span class="badge warn">${pesos(u.saldo)}</span>` : u.saldo < 0 ? `<span class="badge ok">${pesos(-u.saldo)} a favor</span>` : '<span class="badge ok">Al día</span>'}</td>
        <td class="num">${u.horas_vuelo || u.horas_sim ? `${u.horas_vuelo ? `<span class="badge">${fh(u.horas_vuelo)} vuelo</span>` : ''} ${u.horas_sim ? `<span class="badge gris">${fh(u.horas_sim)} sim</span>` : ''}` : '<span class="muted">—</span>'}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn sec sm" data-ver="${u.id}">Ver cuenta</button> <button class="btn sec sm" data-pack="${u.id}">Vender pack</button> <button class="btn sm" data-pago="${u.id}">Registrar pago</button></td></tr>`).join('')}
      </tbody></table></div></div>`;
  const re = async () => await VISTAS.cuentas(v, $('#cq', v)?.value || '');
  $('#cq', v).oninput = (e) => { clearTimeout(state.tq); state.tq = setTimeout(async () => { await VISTAS.cuentas(v, e.target.value); const i = $('#cq', v); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
  $('#ed-tar', v).onclick = () => editarTarifas(t, re);
  $$('[data-pago]', v).forEach((b) => b.onclick = async () => await registrarPago(Number(b.dataset.pago), re));
  $$('[data-pack]', v).forEach((b) => b.onclick = async () => await venderPack(Number(b.dataset.pack), re));
  $$('[data-ver]', v).forEach((b) => b.onclick = async () => await verCuenta(Number(b.dataset.ver), re));
};
async function verCuenta(uid, despues) {
  const c = await Store.cuenta(uid);
  const m = modal(`<div class="modal-head"><div><h3>${esc(c.usuario.nombre)} ${esc(c.usuario.apellido)}</h3><div class="muted">Estado de cuenta</div></div><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <div class="modal-body">${tilesCuenta(c)}${tablaMovimientos(c.movimientos)}
      <h3 style="margin:26px 0 12px">Horas (packs)</h3>${tilesHoras(c.horas)}${tablaHoras(c.horas.movimientos)}</div>
    <div class="modal-foot"><button class="btn sec" id="aj">Cargo o crédito manual</button><button class="btn sec" id="ajh">Ajustar horas</button><button class="btn sec" id="vp">Vender pack</button><button class="btn" id="pg">Registrar pago</button></div>`, { ancho: true });
  $('#vp', m.el).onclick = async () => { m.cerrar(); await venderPack(uid, despues); };
  $('#ajh', m.el).onclick = () => { m.cerrar(); ajusteHoras(uid, despues); };
  $('#pg', m.el).onclick = async () => { m.cerrar(); await registrarPago(uid, despues); };
  $('#aj', m.el).onclick = () => { m.cerrar(); ajuste(uid, despues); };
}
async function registrarPago(uid, despues) {
  const c = await Store.cuenta(uid);
  const m = modal(`<div class="modal-head"><div><h3>Registrar pago</h3><div class="muted">${esc(c.usuario.nombre)} ${esc(c.usuario.apellido)} · saldo ${c.saldo >= 0 ? 'a pagar' : 'a favor'} ${pesos(Math.abs(c.saldo))}</div></div><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <form class="modal-body form-grid" id="f-pago">
      <label class="campo">Monto ($)<input id="p-monto" name="monto" inputmode="numeric" value="${c.saldo > 0 ? c.saldo : ''}"></label>
      <label class="campo">Fecha<input id="p-fecha" type="date" name="fecha" value="${isoLocal(new Date())}"></label>
      <label class="campo">Medio de pago<select id="p-medio" name="medio">${['efectivo', 'transferencia', 'tarjeta de débito', 'tarjeta de crédito', 'Mercado Pago'].map((x) => `<option>${x}</option>`).join('')}</select></label>
      <label class="campo">Nota <span class="op">(opcional)</span><input id="p-nota" name="nota" placeholder="N° de comprobante"></label>
    </form><div class="modal-foot"><button class="btn sec" data-cerrar>Volver</button><button class="btn ok" id="p-ok">Registrar pago</button></div>`);
  $('#p-ok', m.el).onclick = async () => { if (await hacer(async () => { await Store.registrarPago(uid, Object.fromEntries(new FormData($('#f-pago', m.el)))); return true; }, 'Pago registrado')) { m.cerrar(); despues(); } };
}
async function venderPack(uid, despues) {
  const [c, t] = await Promise.all([Store.cuenta(uid), Store.tarifas()]);
  const m = modal(`<div class="modal-head"><div><h3>Vender pack de horas</h3><div class="muted">${esc(c.usuario.nombre)} ${esc(c.usuario.apellido)} · le quedan ${fh(c.horas.vuelo)} de vuelo y ${fh(c.horas.simulador)} de simulador</div></div><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <form class="modal-body form-grid" id="f-pack">
      <label class="campo">Tipo<select id="k-tipo" name="tipo"><option value="vuelo">Horas de vuelo</option><option value="simulador">Horas de simulador</option></select></label>
      <label class="campo">Horas<input id="k-horas" name="horas" inputmode="decimal" value="10"></label>
      <div class="full flujo" id="k-presets">${[5, 10, 20, 30].map((h) => `<button type="button" class="btn sec sm" data-h="${h}">${h} h</button>`).join('')}</div>
      <label class="campo">Descuento (%)<input id="k-desc" type="number" min="0" max="100" value="0"></label>
      <label class="campo">Precio final ($)<input id="k-precio" name="precio" inputmode="numeric"></label>
      <p class="muted full" id="k-lista" style="margin:0"></p>
      <label class="marca full"><input type="checkbox" id="k-pagado" checked> Ya lo pagó</label>
      <label class="campo" id="k-medio-c">Medio de pago<select id="k-medio" name="medio">${['efectivo', 'transferencia', 'tarjeta de débito', 'tarjeta de crédito', 'Mercado Pago'].map((x) => `<option>${x}</option>`).join('')}</select></label>
      <label class="campo">Fecha<input id="k-fecha" type="date" name="fecha" value="${isoLocal(new Date())}"></label>
    </form><div class="modal-foot"><button class="btn sec" data-cerrar>Volver</button><button class="btn ok" id="k-ok">Cargar pack</button></div>`);
  const calc = () => {
    const tipo = $('#k-tipo', m.el).value; const h = Number(String($('#k-horas', m.el).value).replace(',', '.')) || 0;
    const lista = Math.round(h * t[tipo]); const d = Number($('#k-desc', m.el).value) || 0;
    $('#k-precio', m.el).value = Math.round(lista * (1 - d / 100));
    $('#k-lista', m.el).textContent = `Precio de lista: ${fh(h)} × ${pesos(t[tipo])} = ${pesos(lista)}.`;
  };
  ['#k-tipo', '#k-horas', '#k-desc'].forEach((s) => $(s, m.el).addEventListener('input', calc)); $('#k-tipo', m.el).addEventListener('change', calc);
  $$('[data-h]', m.el).forEach((b) => b.onclick = () => { $('#k-horas', m.el).value = b.dataset.h; calc(); });
  $('#k-pagado', m.el).onchange = (e) => { $('#k-medio-c', m.el).hidden = !e.target.checked; };
  calc();
  $('#k-ok', m.el).onclick = async () => {
    const d = Object.fromEntries(new FormData($('#f-pack', m.el))); d.pagado = $('#k-pagado', m.el).checked;
    if (await hacer(async () => { await Store.venderPack(uid, d); return true; }, 'Pack cargado')) { m.cerrar(); despues(); }
  };
}
function ajusteHoras(uid, despues) {
  const m = modal(`<div class="modal-head"><h3>Ajustar horas</h3><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <form class="modal-body form-grid" id="f-ajh">
      <label class="campo">Tipo<select id="h-tipo" name="tipo"><option value="vuelo">Vuelo</option><option value="simulador">Simulador</option></select></label>
      <label class="campo">Horas <span class="op">(negativo para descontar)</span><input id="h-horas" name="horas" inputmode="decimal" placeholder="Ej: 1,5 o -2"></label>
      <label class="campo full">Motivo<input id="h-con" name="concepto" placeholder="Ej: bonificación, corrección de un vuelo"></label>
    </form><div class="modal-foot"><button class="btn sec" data-cerrar>Volver</button><button class="btn" id="h-ok">Guardar</button></div>`);
  $('#h-ok', m.el).onclick = async () => { if (await hacer(async () => { await Store.ajusteHoras(uid, Object.fromEntries(new FormData($('#f-ajh', m.el)))); return true; }, 'Horas ajustadas')) { m.cerrar(); despues(); } };
}
function ajuste(uid, despues) {
  const m = modal(`<div class="modal-head"><h3>Cargo o crédito manual</h3><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <form class="modal-body form-grid" id="f-aj">
      <label class="campo">Tipo<select id="a-tipo" name="tipo"><option value="cargo">Cargo (suma deuda)</option><option value="pago">Crédito (descuenta)</option></select></label>
      <label class="campo">Monto ($)<input id="a-monto" name="monto" inputmode="numeric"></label>
      <label class="campo full">Concepto<input id="a-concepto" name="concepto" placeholder="Ej: Bonificación, material de estudio, examen"></label>
    </form><div class="modal-foot"><button class="btn sec" data-cerrar>Volver</button><button class="btn" id="a-ok">Guardar</button></div>`);
  $('#a-ok', m.el).onclick = async () => { if (await hacer(async () => { await Store.ajusteCuenta(uid, Object.fromEntries(new FormData($('#f-aj', m.el)))); return true; }, 'Movimiento registrado')) { m.cerrar(); despues(); } };
}
function editarTarifas(t, despues) {
  const m = modal(`<div class="modal-head"><h3>Tarifas</h3><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <form class="modal-body form-grid" id="f-tar">
      <label class="campo">Hora de vuelo ($)<input id="t-vuelo" name="vuelo" inputmode="numeric" value="${t.vuelo}"></label>
      <label class="campo">Hora de simulador ($)<input id="t-sim" name="simulador" inputmode="numeric" value="${t.simulador}"></label>
      <label class="campo">Clase teórica ($)<input id="t-teo" name="teorica" inputmode="numeric" value="${t.teorica}"></label>
      <label class="campo">Recargo por cancelación tardía (%)<input id="t-rec" name="recargo" type="number" min="0" max="100" value="${t.recargo}"></label>
      <label class="campo">Aviso mínimo sin cargo (horas)<input id="t-hs" name="horas_aviso" type="number" min="0" value="${t.horas_aviso}"></label>
      <label class="campo">Cargo por ausencia sin aviso (%)<input id="t-aus" name="ausencia" type="number" min="0" max="100" value="${t.ausencia ?? 100}"></label>
      <p class="muted full" style="margin:0">Los cambios rigen para lo que se cargue de acá en adelante. Lo ya cargado no cambia.</p>
    </form><div class="modal-foot"><button class="btn sec" data-cerrar>Volver</button><button class="btn" id="t-ok">Guardar tarifas</button></div>`);
  $('#t-ok', m.el).onclick = async () => { if (await hacer(async () => { await Store.guardarTarifas(Object.fromEntries(new FormData($('#f-tar', m.el)))); return true; }, 'Tarifas actualizadas')) { m.cerrar(); despues(); } };
}

