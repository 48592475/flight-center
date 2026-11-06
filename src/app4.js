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
function tarifasCard(t) {
  return `<div class="tarifas">
    <div><small>Hora de vuelo</small><b>${pesos(t.vuelo)}</b></div>
    <div><small>Hora de simulador</small><b>${pesos(t.simulador)}</b></div>
    <div><small>Clase teórica</small><b>${pesos(t.teorica)}</b></div>
    <div><small>Cancelación tardía</small><b>${t.recargo}% del bloque</b><em>con menos de ${t.horas_aviso} hs</em></div></div>`;
}

VISTAS.cuenta = async function vistaCuenta(v) {
  const c = await Store.miCuenta();
  v.innerHTML = hero('Estado de cuenta', 'Tus vuelos, simuladores y clases se cargan cuando se completan. Los pagos los registra la administración.') +
    tilesCuenta(c) + `
    <div class="card anim" style="--i:4"><div class="card-head"><h3>Tarifas vigentes</h3></div>${tarifasCard(c.tarifas)}
      <p class="muted" style="margin-bottom:0">El vuelo y el simulador se cobran por las horas registradas por el instructor. Un bloque de reserva equivale a 2 hs.</p></div>
    <div class="card anim" style="--i:5"><div class="card-head"><h3>Movimientos</h3><span class="badge">${c.movimientos.length}</span></div>${tablaMovimientos(c.movimientos)}</div>`;
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
      <div class="tabla-wrap"><table class="movs"><thead><tr><th>Nombre</th><th>Tipo</th><th class="num">Cargado</th><th class="num">Pagado</th><th class="num">Saldo</th><th></th></tr></thead><tbody>
      ${l.map((u) => `<tr><td><strong>${esc(u.nombre)} ${esc(u.apellido)}</strong></td><td><span class="badge">${u.rol === 'ppa' ? 'PPA' : 'Alumno'}</span></td>
        <td class="num">${pesos(u.cargos)}</td><td class="num pago">${pesos(u.pagos)}</td>
        <td class="num">${u.saldo > 0 ? `<span class="badge warn">${pesos(u.saldo)}</span>` : u.saldo < 0 ? `<span class="badge ok">${pesos(-u.saldo)} a favor</span>` : '<span class="badge ok">Al día</span>'}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn sec sm" data-ver="${u.id}">Ver cuenta</button> <button class="btn sm" data-pago="${u.id}">Registrar pago</button></td></tr>`).join('')}
      </tbody></table></div></div>`;
  const re = async () => await VISTAS.cuentas(v, $('#cq', v)?.value || '');
  $('#cq', v).oninput = (e) => { clearTimeout(state.tq); state.tq = setTimeout(async () => { await VISTAS.cuentas(v, e.target.value); const i = $('#cq', v); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
  $('#ed-tar', v).onclick = () => editarTarifas(t, re);
  $$('[data-pago]', v).forEach((b) => b.onclick = async () => await registrarPago(Number(b.dataset.pago), re));
  $$('[data-ver]', v).forEach((b) => b.onclick = async () => await verCuenta(Number(b.dataset.ver), re));
};
async function verCuenta(uid, despues) {
  const c = await Store.cuenta(uid);
  const m = modal(`<div class="modal-head"><div><h3>${esc(c.usuario.nombre)} ${esc(c.usuario.apellido)}</h3><div class="muted">Estado de cuenta</div></div><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <div class="modal-body">${tilesCuenta(c)}${tablaMovimientos(c.movimientos)}</div>
    <div class="modal-foot"><button class="btn sec" id="aj">Cargo o crédito manual</button><button class="btn" id="pg">Registrar pago</button></div>`, { ancho: true });
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

