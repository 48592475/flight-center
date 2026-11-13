/* Flight Center · interfaz (parte 8: pañol — inventario y préstamos) */

const CATEGORIAS_PANOL = ['Herramientas', 'Equipo de vuelo', 'Seguridad', 'Repuestos', 'Insumos', 'Otros'];
const fmtCant = (n) => String(n).replace('.', ',');

VISTAS.panol = async function vistaPanol(v, filtro = state.filtroPanol || { q: '', cat: '' }) {
  state.filtroPanol = filtro;
  const [items, r] = await Promise.all([Store.panolItems(), Store.panolResumen()]);
  const l = items.filter((i) => (!filtro.cat || i.categoria === filtro.cat) && (!filtro.q || `${i.nombre} ${i.ubicacion} ${i.notas}`.toLowerCase().includes(filtro.q.toLowerCase())));
  v.innerHTML = hero('Pañol', 'Inventario de herramientas, equipo, repuestos e insumos de la escuela, con lo que está prestado y lo que queda disponible.',
    '<div style="margin-top:14px" class="flujo"><button class="btn sec" id="nuevo-item">+ Nuevo artículo</button><button class="btn sec" id="nuevo-prest">+ Prestar</button></div>') + `
    <div class="stats">${stat('Artículos', r.articulos, { dest: true, i: 1 })}${stat('Unidades prestadas', r.prestadas, { i: 2 })}${stat('Bajo stock mínimo', r.bajo_minimo, { i: 3 })}${stat('Préstamos vencidos', r.vencidos, { i: 4 })}</div>
    <div class="card anim" style="--i:5">
      <div class="filtro"><input id="pq" placeholder="Buscar artículo o ubicación" value="${esc(filtro.q)}" aria-label="Buscar">
        <select id="pc" aria-label="Categoría"><option value="">Todas las categorías</option>${CATEGORIAS_PANOL.map((c) => `<option ${filtro.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      ${l.length ? `<div class="tabla-wrap"><table><thead><tr><th>Artículo</th><th>Categoría</th><th>Ubicación</th><th class="num">Stock</th><th class="num">Prestado</th><th class="num">Disponible</th><th></th></tr></thead><tbody>
        ${l.map((i) => `<tr><td><strong>${esc(i.nombre)}</strong>${i.notas ? `<div class="muted" style="font-size:12.5px">${esc(i.notas)}</div>` : ''}</td><td><span class="badge gris">${esc(i.categoria)}</span></td>
          <td>${esc(i.ubicacion || '—')}</td><td class="num">${fmtCant(i.cantidad)}${i.unidad ? ` <small class="muted">${esc(i.unidad)}</small>` : ''}</td><td class="num">${i.prestado ? fmtCant(i.prestado) : '—'}</td>
          <td class="num">${i.bajo_minimo ? `<span class="badge warn" title="Mínimo ${fmtCant(i.minimo)}">${fmtCant(i.disponible)} · reponer</span>` : `<span class="badge ok">${fmtCant(i.disponible)}</span>`}</td>
          <td style="text-align:right;white-space:nowrap">${i.prestable ? `<button class="btn sm" data-prest="${i.id}" ${i.disponible > 0 ? '' : 'disabled'}>Prestar</button> ` : ''}<button class="btn sec sm" data-aj="${i.id}">Stock</button> <button class="btn sec sm" data-ed="${i.id}">Editar</button></td></tr>`).join('')}
      </tbody></table></div>` : vacio(items.length ? 'No hay artículos con esos filtros.' : 'Todavía no hay artículos cargados. Empezá con "+ Nuevo artículo".')}
    </div>
    <div class="card anim" style="--i:6"><div class="card-head"><h3>Últimos movimientos de stock</h3></div>
      ${r.movimientos.length ? `<div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Artículo</th><th class="num">Cantidad</th><th>Motivo</th><th>Registró</th></tr></thead><tbody>
        ${r.movimientos.map((m) => `<tr><td style="white-space:nowrap">${esc(fmtCorta(m.fecha.slice(0, 10)))}</td><td>${esc(m.articulo)}</td><td class="num ${m.cantidad > 0 ? 'pago' : ''}">${m.cantidad > 0 ? '+' : ''}${fmtCant(m.cantidad)}</td><td>${esc(m.motivo)}</td><td>${esc(m.por)}</td></tr>`).join('')}
      </tbody></table></div>` : vacio('Sin movimientos todavía.')}</div>`;
  animarNumeros(v);
  const re = async () => await VISTAS.panol(v, state.filtroPanol);
  $('#pq', v).oninput = (e) => { clearTimeout(state.tq); state.tq = setTimeout(async () => { await VISTAS.panol(v, { ...filtro, q: e.target.value }); const i = $('#pq', v); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
  $('#pc', v).onchange = async (e) => await VISTAS.panol(v, { ...filtro, cat: e.target.value });
  $('#nuevo-item', v).onclick = () => formArticulo(null, re);
  $('#nuevo-prest', v).onclick = () => formPrestamo(null, re);
  $$('[data-ed]', v).forEach((b) => b.onclick = () => formArticulo(items.find((i) => i.id == b.dataset.ed), re));
  $$('[data-aj]', v).forEach((b) => b.onclick = () => ajustarStock(items.find((i) => i.id == b.dataset.aj), re));
  $$('[data-prest]', v).forEach((b) => b.onclick = () => formPrestamo(Number(b.dataset.prest), re));
};

function formArticulo(it, despues) {
  const m = modal(`<div class="modal-head"><h3>${it ? 'Editar artículo' : 'Nuevo artículo'}</h3><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <form class="modal-body form-grid" id="f-art">
      <label class="campo full">Nombre<input id="ar-nom" name="nombre" value="${esc(it?.nombre || '')}" placeholder="Ej: Auriculares David Clark H10-13.4"></label>
      <label class="campo">Categoría<select id="ar-cat" name="categoria">${CATEGORIAS_PANOL.map((c) => `<option ${(it?.categoria || 'Herramientas') === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label class="campo">Ubicación<input id="ar-ubi" name="ubicacion" value="${esc(it?.ubicacion || '')}" placeholder="Ej: Estante A2"></label>
      ${it ? '' : '<label class="campo">Cantidad inicial<input id="ar-cant" name="cantidad" inputmode="decimal" value="1"></label>'}
      <label class="campo">Unidad <span class="op">(opcional)</span><input id="ar-uni" name="unidad" value="${esc(it?.unidad || '')}" placeholder="Ej: litros, unidades"></label>
      <label class="campo">Stock mínimo <span class="op">(avisa cuando hay que reponer)</span><input id="ar-min" name="minimo" inputmode="decimal" value="${it?.minimo ?? 0}"></label>
      <label class="marca full"><input type="checkbox" id="ar-prest" ${it ? (it.prestable ? 'checked' : '') : 'checked'}> Se presta (herramientas y equipo). Desmarcalo para insumos que se consumen.</label>
      <label class="campo full">Notas <span class="op">(opcional)</span><input id="ar-notas" name="notas" value="${esc(it?.notas || '')}" placeholder="Ej: N° de serie, estado, proveedor"></label>
    </form><div class="modal-foot">${it ? '<button class="btn danger" id="ar-borrar" style="margin-right:auto">Borrar</button>' : ''}<button class="btn sec" data-cerrar>Volver</button><button class="btn" id="ar-ok">Guardar</button></div>`);
  $('#ar-ok', m.el).onclick = async () => {
    const d = { ...Object.fromEntries(new FormData($('#f-art', m.el))), prestable: $('#ar-prest', m.el).checked, id: it?.id };
    if (await hacer(async () => { await Store.panolGuardarItem(d); return true; }, it ? 'Artículo actualizado' : 'Artículo agregado')) { m.cerrar(); despues(); }
  };
  const bo = $('#ar-borrar', m.el); if (bo) bo.onclick = async () => {
    m.cerrar(); if (!(await confirmar('Borrar artículo', `Se borra "${it.nombre}" del inventario.`, 'Borrar'))) return;
    if (await hacer(async () => { await Store.panolBorrarItem(it.id); return true; }, 'Artículo borrado')) despues();
  };
}

function ajustarStock(it, despues) {
  const m = modal(`<div class="modal-head"><div><h3>Stock · ${esc(it.nombre)}</h3><div class="muted">Hay ${fmtCant(it.cantidad)}${it.unidad ? ` ${esc(it.unidad)}` : ''} · prestado ${fmtCant(it.prestado)}</div></div><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <form class="modal-body form-grid" id="f-aj">
      <label class="campo">Movimiento<select id="aj-tipo"><option value="1">Ingreso (compra, devolución de proveedor)</option><option value="-1">Egreso (uso, rotura, pérdida)</option></select></label>
      <label class="campo">Cantidad<input id="aj-cant" inputmode="decimal" value="1"></label>
      <label class="campo full">Motivo<input id="aj-mot" placeholder="Ej: compra a proveedor, cambio de aceite LV-FCA"></label>
    </form><div class="modal-foot"><button class="btn sec" data-cerrar>Volver</button><button class="btn" id="aj-ok">Registrar</button></div>`);
  $('#aj-ok', m.el).onclick = async () => {
    const c = Number(String($('#aj-cant', m.el).value).replace(',', '.')) * Number($('#aj-tipo', m.el).value);
    if (await hacer(async () => { await Store.panolAjustar(it.id, { cantidad: c, motivo: $('#aj-mot', m.el).value }); return true; }, 'Stock actualizado')) { m.cerrar(); despues(); }
  };
}

async function formPrestamo(itemId, despues) {
  const [items, personas] = await Promise.all([Store.panolItems(), Store.panolPersonas()]);
  const prestables = items.filter((i) => i.prestable && i.disponible > 0);
  if (!prestables.length) return toast('No hay artículos disponibles para prestar.', 'error');
  const hoyS = isoLocal(new Date());
  const m = modal(`<div class="modal-head"><h3>Nuevo préstamo</h3><button class="x" data-cerrar aria-label="Cerrar">×</button></div>
    <form class="modal-body form-grid" id="f-pr">
      <label class="campo full">Artículo<select id="pr-item" name="item_id">${prestables.map((i) => `<option value="${i.id}" ${i.id === itemId ? 'selected' : ''}>${esc(i.nombre)} · ${fmtCant(i.disponible)} disponible(s)</option>`).join('')}</select></label>
      <label class="campo full">¿A quién?<input id="pr-buscar" placeholder="Buscar persona" autocomplete="off"></label>
      <div class="lista-alumnos full" id="pr-personas">${personas.map((p) => `<label class="marca" data-nombre="${esc(`${p.nombre} ${p.apellido}`.toLowerCase())}"><input type="radio" name="usuario_id" value="${p.id}"> ${esc(p.nombre)} ${esc(p.apellido)} <small class="muted">${esc(nombreRol(p))}</small></label>`).join('')}</div>
      <label class="campo">Cantidad<input id="pr-cant" name="cantidad" inputmode="decimal" value="1"></label>
      <label class="campo">Devolución prevista<input id="pr-dev" type="date" name="devolucion" value="${hoyS}" min="${hoyS}"></label>
      <label class="campo full">Notas <span class="op">(opcional)</span><input id="pr-notas" name="notas" placeholder="Ej: para el vuelo de las 10 en LV-FCA"></label>
    </form><div class="modal-foot"><button class="btn sec" data-cerrar>Volver</button><button class="btn" id="pr-ok">Registrar préstamo</button></div>`, { ancho: true });
  $('#pr-buscar', m.el).oninput = (e) => { const q = e.target.value.toLowerCase(); $$('#pr-personas label', m.el).forEach((l) => { l.hidden = q && !l.dataset.nombre.includes(q); }); };
  $('#pr-ok', m.el).onclick = async () => {
    const d = Object.fromEntries(new FormData($('#f-pr', m.el)));
    if (await hacer(async () => { await Store.panolPrestar(d); return true; }, 'Préstamo registrado')) { m.cerrar(); despues(); }
  };
}

VISTAS.prestamos = async function vistaPrestamos(v, modo = state.modoPrest || 'abiertos') {
  state.modoPrest = modo;
  const l = await Store.panolPrestamos({ abiertos: modo === 'abiertos' });
  v.innerHTML = hero('Préstamos', 'Quién tiene cada herramienta o equipo, desde cuándo y cuándo lo tiene que devolver.',
    '<div style="margin-top:14px"><button class="btn sec" id="nuevo-prest">+ Nuevo préstamo</button></div>') + `
    <div class="segmento anim" style="--i:1;margin-bottom:18px"><button class="${modo === 'abiertos' ? 'on' : ''}" data-m="abiertos">Sin devolver</button><button class="${modo === 'todos' ? 'on' : ''}" data-m="todos">Historial</button></div>
    <div class="card anim" style="--i:2">${l.length ? `<div class="tabla-wrap"><table><thead><tr><th>Artículo</th><th>Persona</th><th class="num">Cant.</th><th>Desde</th><th>Devolución</th><th>Estado</th><th></th></tr></thead><tbody>
      ${l.map((p) => `<tr><td><strong>${esc(p.articulo)}</strong>${p.notas ? `<div class="muted" style="font-size:12.5px">${esc(p.notas)}</div>` : ''}</td>
        <td><div style="display:flex;gap:8px;align-items:center">${avatarDe({ nombre: p.persona.split(' ')[0], apellido: p.persona.split(' ').slice(-1)[0] }, 30, p.persona_foto)}<div>${esc(p.persona)}<div class="muted" style="font-size:12px">${esc(p.persona_tel || '')}</div></div></div></td>
        <td class="num">${fmtCant(p.cantidad)}</td><td style="white-space:nowrap">${esc(fmtCorta(p.fecha.slice(0, 10)))}</td><td style="white-space:nowrap">${esc(fmtCorta(p.devolucion))}</td>
        <td>${p.devuelto ? `<span class="badge ok">Devuelto ${esc(fmtCorta(p.devuelto.slice(0, 10)))}</span>` : p.vencido ? '<span class="badge danger">Vencido</span>' : '<span class="badge warn">Prestado</span>'}</td>
        <td style="text-align:right">${p.devuelto ? '' : `<button class="btn ok sm" data-dev="${p.id}">Devolvió</button>`}</td></tr>`).join('')}
    </tbody></table></div>` : vacio(modo === 'abiertos' ? 'No hay nada prestado en este momento.' : 'Todavía no hubo préstamos.')}</div>`;
  const re = async () => await VISTAS.prestamos(v, modo);
  $$('[data-m]', v).forEach((b) => b.onclick = async () => await VISTAS.prestamos(v, b.dataset.m));
  $('#nuevo-prest', v).onclick = () => formPrestamo(null, re);
  $$('[data-dev]', v).forEach((b) => b.onclick = async () => { if (await hacer(async () => { await Store.panolDevolver(Number(b.dataset.dev)); return true; }, 'Devolución registrada')) await re(); });
};

// en el perfil de cada persona: lo que tiene prestado del pañol
{
  const perfil = VISTAS.perfil;
  VISTAS.perfil = async function (v) {
    await perfil(v);
    const l = await Store.misPrestamos().catch(() => []);
    if (!l.length) return;
    const card = document.createElement('div'); card.className = 'card anim';
    card.innerHTML = `<div class="card-head"><h3>Préstamos del pañol</h3><span class="muted">Lo que tenés en tu poder</span></div>
      ${l.map((p) => `<div class="agenda-fila"><span><b>${esc(p.articulo)}</b> × ${fmtCant(p.cantidad)}</span><span>devolver el ${esc(fmtCorta(p.devolucion))} ${p.vencido ? '<span class="badge danger">Vencido</span>' : ''}</span></div>`).join('')}`;
    v.append(card);
  };
}
