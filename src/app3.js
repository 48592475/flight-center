/* Flight Center · interfaz (parte 3: meteorología y NOTAM) */

// =====================================================================
//                    METAR / TAF
// =====================================================================
const PISTAS_MOR = [{ id: '02', rumbo: 20 }, { id: '20', rumbo: 200 }];
const FENOMENOS = { RA: 'lluvia', DZ: 'llovizna', SN: 'nieve', TS: 'tormenta', SH: 'chubascos', BR: 'neblina', FG: 'niebla', HZ: 'bruma', FU: 'humo', GR: 'granizo', GS: 'granizo pequeño',
  DU: 'polvo', SA: 'arena', SQ: 'turbonada', FC: 'nube embudo', PL: 'hielo granulado', UP: 'precipitación desconocida', VA: 'ceniza volcánica', PO: 'remolinos de polvo' };
const DESCRIPTORES = { MI: 'baja', BC: 'en bancos', PR: 'parcial', DR: 'arrastrada', BL: 'levantada', FZ: 'engelante', VC: 'en las proximidades' };
const NUBES = { FEW: 'Pocas (1-2/8)', SCT: 'Dispersas (3-4/8)', BKN: 'Fragmentadas (5-7/8)', OVC: 'Cubierto (8/8)', VV: 'Visibilidad vertical' };

function decodificarMetar(raw) {
  const t = String(raw || '').trim().toUpperCase().replace(/=$/, '').split(/\s+/);
  const r = { raw, fenomenos: [], nubes: [], cavok: false };
  let i = 0;
  if (['METAR', 'SPECI'].includes(t[i])) r.tipo = t[i++];
  r.estacion = t[i++];
  const mh = /^(\d{2})(\d{2})(\d{2})Z$/.exec(t[i] || ''); if (mh) { r.dia = +mh[1]; r.hora = `${mh[2]}:${mh[3]}`; r.horaLocal = `${String((+mh[2] + 21) % 24).padStart(2, '0')}:${mh[3]}`; i++; }
  if (t[i] === 'AUTO' || t[i] === 'COR') r.auto = t[i++] === 'AUTO';
  for (; i < t.length; i++) {
    const x = t[i];
    if (x === 'RMK' || x === 'NOSIG' || x === 'BECMG' || x === 'TEMPO') { r.tendencia = t.slice(i).join(' '); break; }
    let m;
    if ((m = /^(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS)$/.exec(x))) { r.viento = { dir: m[1] === 'VRB' ? null : +m[1], vel: +m[2], raf: m[3] ? +m[3] : null, mps: m[4] === 'MPS' }; continue; }
    if ((m = /^(\d{3})V(\d{3})$/.exec(x))) { if (r.viento) r.viento.variable = [+m[1], +m[2]]; continue; }
    if (x === 'CAVOK') { r.cavok = true; r.vis = 10000; continue; }
    if (/^\d{4}$/.test(x) && r.vis == null) { r.vis = +x; continue; }
    if ((m = /^(FEW|SCT|BKN|OVC|VV)(\d{3}|\/\/\/)(CB|TCU)?$/.exec(x))) { r.nubes.push({ tipo: m[1], alt: m[2] === '///' ? null : +m[2] * 100, conv: m[3] || '' }); continue; }
    if (/^(NSC|NCD|SKC|CLR)$/.test(x)) { r.sinNubes = true; continue; }
    if ((m = /^(M?\d{2})\/(M?\d{2})?$/.exec(x))) { r.temp = +m[1].replace('M', '-'); r.rocio = m[2] ? +m[2].replace('M', '-') : null; continue; }
    if ((m = /^Q(\d{4})$/.exec(x))) { r.qnh = +m[1]; continue; }
    if ((m = /^A(\d{4})$/.exec(x))) { r.qnh = Math.round(+m[1] / 100 * 33.8639); continue; }
    if ((m = /^([+-]|VC)?((?:MI|BC|PR|DR|BL|SH|TS|FZ)?)((?:RA|DZ|SN|BR|FG|HZ|FU|GR|GS|DU|SA|SQ|FC|PL|UP|VA|PO)+)?$/.exec(x)) && (m[2] || m[3])) {
      const int = m[1] === '+' ? 'fuerte' : m[1] === '-' ? 'débil' : m[1] === 'VC' ? 'en las proximidades' : '';
      const desc = m[2] === 'TS' ? 'tormenta' : m[2] === 'SH' ? 'chubascos' : DESCRIPTORES[m[2]] || '';
      const fen = (m[3] || '').match(/.{2}/g)?.map((c) => FENOMENOS[c]).join(' y ') || '';
      r.fenomenos.push([desc && (m[2] === 'TS' || m[2] === 'SH') ? `${desc}${fen ? ` con ${fen}` : ''}` : `${fen} ${desc}`.trim(), int].filter(Boolean).join(' ')); continue;
    }
  }
  const techo = r.nubes.filter((n) => ['BKN', 'OVC', 'VV'].includes(n.tipo) && n.alt != null).map((n) => n.alt)[0] ?? null;
  r.techo = techo;
  const vis = r.vis ?? 10000;
  r.categoria = (techo != null && techo < 500) || vis < 1600 ? 'LIFR' : (techo != null && techo < 1000) || vis < 5000 ? 'IFR' : (techo != null && techo <= 3000) || vis <= 8000 ? 'MVFR' : 'VFR';
  if (r.viento && r.viento.dir != null) {
    r.pistas = PISTAS_MOR.map((p) => { const a = ((r.viento.dir - p.rumbo) * Math.PI) / 180;
      return { ...p, frente: Math.round(r.viento.vel * Math.cos(a)), cruzado: Math.round(Math.abs(r.viento.vel * Math.sin(a))), lado: Math.sin(a) >= 0 ? 'derecha' : 'izquierda' }; });
  }
  return r;
}
const CAT_TXT = { VFR: ['VFR', 'ok'], MVFR: ['VFR marginal', 'warn'], IFR: ['IFR', 'danger'], LIFR: ['IFR bajo', 'danger'] };
function antiguedad(m) {
  if (!m?.dia) return null;
  const now = new Date(); const obs = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), m.dia, ...m.hora.split(':').map(Number)));
  if (obs - now > 86400000) obs.setUTCMonth(obs.getUTCMonth() - 1);
  const min = Math.round((now - obs) / 60000);
  return min < -10 ? -1 : Math.max(0, min);
}
const fmtAnt = (min) => min == null ? '' : min < 60 ? `hace ${min} min` : min < 1440 ? `hace ${Math.floor(min / 60)} h ${min % 60} min` : `hace ${Math.floor(min / 1440)} día(s)`;

function tarjetaMetar(m, { compacto = false, pegado = false } = {}) {
  const d = decodificarMetar(m.metar); const ant = antiguedad(d); const futuro = ant === -1; const viejo = !pegado && (m.ejemplo || ant == null || ant > 75 || futuro);
  const [cat, cls] = CAT_TXT[d.categoria];
  const viento = !d.viento ? '—' : d.viento.dir == null ? `Variable ${d.viento.vel} kt` : `${String(d.viento.dir).padStart(3, '0')}° ${d.viento.vel} kt${d.viento.raf ? ` ráf. ${d.viento.raf}` : ''}`;
  const vis = d.cavok ? 'CAVOK' : d.vis == null ? '—' : d.vis >= 9999 ? '10 km o más' : d.vis >= 1000 ? `${d.vis / 1000} km` : `${d.vis} m`;
  const nubes = d.cavok ? 'Sin nubes significativas' : d.nubes.length ? d.nubes.map((n) => `${n.tipo} ${n.alt?.toLocaleString('es-AR') ?? '?'} ft${n.conv ? ` ${n.conv}` : ''}`).join(' · ') : d.sinNubes ? 'Sin nubes' : '—';
  const mejor = d.pistas ? d.pistas.reduce((a, b) => (b.frente > a.frente ? b : a)) : null;
  return `<div class="metar-card ${compacto ? 'compacto' : ''}">
    <div class="metar-top"><div><span class="metar-est">${esc(d.estacion || '—')}</span> ${d.estacion === 'SADM' ? '<span class="muted">Morón</span>' : ''}
      <div class="muted" style="font-size:12.5px">${d.hora ? `Observado ${d.hora} UTC (${d.horaLocal} hora local)` : ''} ${ant != null && !futuro ? `· ${fmtAnt(ant)}` : ''}</div></div>
      <span class="badge ${cls} cat">${cat}</span></div>
    ${viejo ? `<div class="aviso warn" style="margin:10px 0 0">${m.ejemplo ? '<div><strong>METAR de ejemplo (demo)</strong>No usar para volar. Cargá el METAR oficial vigente en Meteo y NOTAM.</div>' : futuro ? '<div><strong>Revisá la hora del METAR</strong>Es posterior a la hora actual. Confirmá el vigente en la fuente oficial.</div>' : '<div><strong>Este METAR puede estar desactualizado</strong>Confirmá el vigente en la fuente oficial antes de volar.</div>'}</div>` : ''}
    <div class="metar-grid">
      <div><small>Viento</small><span>${viento}</span>${d.viento?.variable ? `<em>variable ${d.viento.variable.join('°–')}°</em>` : ''}</div>
      <div><small>Visibilidad</small><span>${vis}</span></div>
      <div><small>Nubes</small><span>${esc(nubes)}</span></div>
      <div><small>Temp / rocío</small><span>${d.temp ?? '—'}° / ${d.rocio ?? '—'}°</span></div>
      <div><small>QNH</small><span>${d.qnh ?? '—'} hPa</span></div>
      ${d.estacion === 'SADM' ? `<div><small>Pista sugerida MOR</small><span>${mejor ? `${mejor.id} · ${mejor.frente} kt de frente` : '—'}</span>${mejor ? `<em>${mejor.cruzado} kt cruzado de la ${mejor.lado}</em>` : ''}</div>` : ''}
    </div>
    ${d.fenomenos.length ? `<div class="muted" style="margin-top:8px">Fenómenos: ${esc(d.fenomenos.join(', '))}</div>` : ''}
    <div class="metar-raw">${esc(m.metar)}</div>
    ${!compacto && m.taf ? `<div class="metar-raw taf">${esc(m.taf).replace(/ (FM\d{6}|BECMG|TEMPO|PROB\d{2}(?: TEMPO)?)/g, '<br>$1')}</div>` : ''}
    ${pegado && ant > 75 ? '<div class="muted" style="font-size:12px;margin-top:6px">Este METAR tiene más de una hora: buscá el vigente.</div>' : ''}</div>`;
}
const urlMetar = (c) => `https://aviationweather.gov/data/metar/?id=${encodeURIComponent(c)}&hours=0&include_taf=yes&decoded=yes`;
const URL_NOTAM_AR = 'https://ais.anac.gob.ar/notam';
const URL_NOTAM_FAA = 'https://notams.aim.faa.gov/notamSearch/';
function buscadorOficial(id, codigo = 'SADM') {
  return `<div class="buscador-of" data-buscador="${id}">
    <label class="campo">Aeródromo (código OACI)<input id="${id}-oaci" maxlength="4" value="${codigo}" style="text-transform:uppercase" autocomplete="off"></label>
    <div class="flujo">
      ${MODO === 'servidor' ? `<button class="btn" type="button" data-ver-meteo>Ver METAR, TAF y NOTAM</button>` : ''}
      <a class="btn ${MODO === 'servidor' ? 'sec' : ''}" data-link="metar" href="${urlMetar(codigo)}" target="_blank" rel="noopener">${MODO === 'servidor' ? 'Abrir en aviationweather.gov' : 'METAR y TAF de <span data-cod>' + codigo + '</span>'}</a>
      <a class="btn sec" data-link="notam" href="${URL_NOTAM_AR}" target="_blank" rel="noopener">NOTAM Argentina (ANAC)</a>
      <a class="btn sec" href="${URL_NOTAM_FAA}" target="_blank" rel="noopener">NOTAM internacional (FAA)</a>
    </div></div>`;
}
function activarBuscador(root) {
  $$('[data-buscador]', root).forEach((b) => {
    const inp = $('input', b);
    const upd = () => { const c = (inp.value.trim().toUpperCase() || 'SADM'); $('[data-link="metar"]', b).href = urlMetar(c); $$('[data-cod]', b).forEach((x) => x.textContent = c); };
    inp.oninput = upd;
    const salida = $('[data-meteo-salida]', root);
    const ver = $('[data-ver-meteo]', b);
    if (ver && salida) {
      ver.onclick = () => mostrarMeteo(inp.value.trim().toUpperCase() || 'SADM', salida, { compacto: !!b.closest('.meteo-widget') });
      inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); ver.click(); } };
    }
    $$('[data-ad]', root).forEach((x) => x.onclick = () => { inp.value = x.dataset.ad; upd(); if (ver) ver.click(); });
  });
}
// consulta al servidor (Aviation Weather Center y FAA) y muestra los datos decodificados
async function mostrarMeteo(id, cont, { compacto = false } = {}) {
  cont.innerHTML = '<div class="muted" style="margin-top:14px">Consultando la fuente oficial…</div>';
  let d;
  try {
    const r = await fetch(`/api/meteo?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
    d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error');
  } catch (e) { cont.innerHTML = `<div class="aviso warn" style="margin-top:14px"><div><strong>No se pudo consultar ${esc(id)}</strong>${esc(e.message)}. Probá con los links a las fuentes oficiales.</div></div>`; return; }
  const hora = new Date(d.consultado).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (d.error && !d.metar) { cont.innerHTML = `<div class="aviso warn" style="margin-top:14px"><div><strong>No se pudo consultar la fuente oficial</strong>El Aviation Weather Center no respondió. Probá de nuevo en unos minutos o abrí los links.</div></div>`; return; }
  const metar = d.metar ? tarjetaMetar({ metar: d.metar, taf: d.taf || '' }, { compacto, pegado: true })
    : `<div class="aviso" style="margin-top:14px"><div><strong>${esc(id)} no tiene METAR publicado</strong>${d.error ? esc(d.error) : 'Puede que el aeródromo no emita METAR. Probá con uno cercano.'}</div></div>`;
  const taf = !compacto ? (d.taf ? `<h4 style="margin:18px 0 6px">TAF</h4><div class="metar-raw taf">${esc(d.taf).replace(/ (FM\d{6}|BECMG|TEMPO|PROB\d{2}(?: TEMPO)?)/g, '<br>$1')}</div>` : `<p class="muted">${esc(id)} no tiene TAF vigente.</p>`) : '';
  const notam = compacto ? '' : !d.notamsConfigurado
    ? `<h4 style="margin:18px 0 6px">NOTAM</h4><p class="muted">La consulta automática de NOTAM se activa al cargar la clave de la FAA en el servidor. Mientras tanto usá los links a ANAC y FAA.</p>`
    : `<h4 style="margin:18px 0 6px">NOTAM vigentes (${(d.notams || []).length})</h4>${(d.notams || []).length ? d.notams.map((n) => `<div class="notam"><b class="mono">${esc(n.numero)}</b>${n.desde ? ` <span class="muted">${esc(n.desde.slice(0, 16).replace('T', ' '))} → ${esc((n.hasta || 'PERM').slice(0, 16).replace('T', ' '))}</span>` : ''}<pre>${esc(n.texto)}</pre></div>`).join('') : '<p class="muted">Sin NOTAM informados para este aeródromo.</p>'}`;
  cont.innerHTML = `<div style="margin-top:16px">${metar}${taf}${notam}<div class="muted" style="font-size:12px;margin-top:8px">Fuente: Aviation Weather Center (NOAA)${d.notamsConfigurado ? ' y FAA' : ''} · consultado ${hora} hs</div></div>`;
}
function widgetMeteo(v) {
  const hero = $('.hero', v); if (!hero || $('.meteo-widget', v)) return;
  const div = document.createElement('div'); div.className = 'card anim meteo-widget'; div.style.marginBottom = '22px';
  div.innerHTML = `<div class="card-head"><h3>Meteorología y NOTAM</h3><span class="muted">Fuente oficial${MODO === 'servidor' ? '' : ' · se abre en una pestaña nueva'}</span></div>${buscadorOficial('w')}<div data-meteo-salida></div>`;
  hero.after(div); activarBuscador(div);
  if (MODO === 'servidor') mostrarMeteo('SADM', $('[data-meteo-salida]', div), { compacto: true });
}
for (const k of ['reservar', 'agenda', 'mantenimiento', 'panel']) {
  const f = VISTAS[k];
  VISTAS[k] = async function (v, ...a) { await f(v, ...a); widgetMeteo(v); };
}

const AERODROMOS = [['SADM', 'Morón'], ['SADP', 'El Palomar'], ['SADF', 'San Fernando'], ['SABE', 'Aeroparque'], ['SAEZ', 'Ezeiza'], ['SADL', 'La Plata'], ['SAAR', 'Rosario'], ['SAZS', 'Bariloche']];
function copiar(texto, btn) {
  const ok = () => { const t = btn.textContent; btn.textContent = 'Copiado ✓'; setTimeout(() => btn.textContent = t, 1500); };
  try { navigator.clipboard.writeText(texto).then(ok, () => toast('Seleccioná el texto y copialo con Ctrl+C', 'error')); } catch { toast('Seleccioná el texto y copialo con Ctrl+C', 'error'); }
}

VISTAS.meteo = function vistaMeteo(v) {
  v.innerHTML = hero('Meteorología y NOTAM', 'Buscá cualquier aeródromo por su código OACI y abrí el METAR, el TAF y los NOTAM directamente en la fuente oficial.') + `
    <div class="card anim" style="--i:1"><div class="card-head"><h3>Buscar aeródromo</h3></div>
      ${buscadorOficial('m')}
      <div data-meteo-salida></div>
      <div class="flujo" style="margin-top:14px">${AERODROMOS.map(([c, n]) => `<button class="chip-ad" data-ad="${c}"><b>${c}</b> ${n}</button>`).join('')}</div>
      <p class="muted" style="margin-bottom:0">METAR y TAF: Aviation Weather Center (NOAA), que publica los partes del SMN. NOTAM: AIS de ANAC y buscador de la FAA${MODO === 'servidor' ? '' : '. En los NOTAM, escribí el código en el buscador del sitio'}.</p></div>
    <div class="card anim" style="--i:2"><div class="card-head"><h3>Decodificador de METAR</h3><span class="muted">Pegá el METAR que copiaste de la fuente oficial</span></div>
      <textarea id="dec-in" rows="2" placeholder="Ej: METAR SADM 061200Z 03008KT 9999 FEW030 24/12 Q1016"></textarea>
      <div id="dec-out" style="margin-top:12px"></div></div>`;
  activarBuscador(v);
  if (MODO === 'servidor') mostrarMeteo('SADM', $('[data-meteo-salida]', v));
  $('#dec-in', v).oninput = (e) => { const t = e.target.value.trim(); $('#dec-out', v).innerHTML = t.length > 12 ? tarjetaMetar({ metar: t, taf: '', fecha: '', autor: '' }, { compacto: true, pegado: true }) : ''; };
};


