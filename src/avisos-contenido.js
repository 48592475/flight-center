/* Contenido de los avisos (email y WhatsApp). Lo usan la página y el servidor. */
const contenidoAviso = (() => {
  const hh = (h) => `${String(h).padStart(2, '0')}:00`;
  const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtFecha = (s, o) => parseISO(s).toLocaleDateString('es-AR', o);
  const codigoReserva = (id, p = 'FC') => `${p}-${String(id).padStart(5, '0')}`;
  const pesos = (n) => `$ ${Math.round(n || 0).toLocaleString('es-AR')}`;
  const fechaLarga = (f) => { const t = fmtFecha(f, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); return t[0].toUpperCase() + t.slice(1); };
  const fechaCorta = (f) => f.split('-').reverse().join('/');
  const saludo = (n) => `Estimado/a ${n.nombre} ${n.apellido}`;

  // ---------- contenido de cada aviso ----------
  function datosAviso(n) {
    if (n.tipo === 'reserva') {
      const rs = n.datos.reservas; const r = rs[0]; const bl = rs.map((x) => x.bloque).sort((a, b) => a - b);
      const sim = r.tipo === 'simulador';
      return {
        asunto: `Reserva confirmada · ${sim ? 'Simulador' : 'Vuelo'} del ${fechaCorta(r.fecha)} · ${codigoReserva(r.id, sim ? 'SIM' : 'FC')}`,
        titulo: sim ? 'Turno de simulador confirmado' : 'Reserva de vuelo confirmada',
        intro: `Le confirmamos su reserva de ${sim ? 'simulador' : 'vuelo'} en Flight Center. A continuación encontrará el detalle.`,
        filas: [['Código de reserva', codigoReserva(r.id, sim ? 'SIM' : 'FC')], ['Fecha', fechaLarga(r.fecha)], ['Horario', `${hh(bl[0])} a ${hh(bl.at(-1) + 2)} hs (${rs.length} bloque${rs.length > 1 ? 's' : ''})`],
          ['Presentación', `${String(bl[0] - 1).padStart(2, '0')}:45 hs`], [sim ? 'Simulador' : 'Aeronave', `${r.recurso} · ${r.modelo}`], ['Instructor', r.instructor || 'Sin instructor'],
          ...(sim ? [] : [['Ruta', `MOR → ${r.destino && r.destino !== 'MOR' ? r.destino : 'MOR (vuelo local)'}`]]), ...(n.datos.leccion ? [['Lección del syllabus', n.datos.leccion]] : [])],
        notas: ['Preséntese 15 minutos antes con su CMA vigente y documentación.', 'Antes del vuelo consulte METAR, TAF y NOTAM en las fuentes oficiales.',
          'Cancelación sin cargo hasta 24 horas antes. Con menos aviso se cobra el 20% del valor de cada bloque.'],
        wpp: [`✈️ *Flight Center* · ${sim ? 'Simulador confirmado' : 'Reserva confirmada'}`, '', `Hola ${n.nombre}, tu ${sim ? 'turno de simulador' : 'vuelo'} quedó confirmado.`, '',
          `📅 *${fechaLarga(r.fecha)}*`, `🕗 ${hh(bl[0])} a ${hh(bl.at(-1) + 2)} hs · presentación ${String(bl[0] - 1).padStart(2, '0')}:45`, `${sim ? '🖥️' : '🛩️'} ${r.recurso} · ${r.modelo}`,
          `👨‍✈️ ${r.instructor || 'Sin instructor'}`, ...(sim ? [] : [`🛫 MOR → ${r.destino && r.destino !== 'MOR' ? r.destino : 'MOR (local)'}`]), ...(n.datos.leccion ? [`📘 Lección ${n.datos.leccion}`] : []),
          `🔖 Código ${codigoReserva(r.id, sim ? 'SIM' : 'FC')}`, '', '_Cancelación sin cargo hasta 24 h antes; después se cobra el 20% del bloque._', '', '¡Buen vuelo!'],
      };
    }
    if (n.tipo === 'clase') {
      const k = n.datos.clase;
      return {
        asunto: `Inscripción confirmada · Clase ${k.teo} del ${fechaCorta(k.fecha)}`, titulo: 'Inscripción a clase teórica confirmada',
        intro: 'Le confirmamos su inscripción a la siguiente clase teórica.',
        filas: [['Clase', `${k.teo} · ${k.titulo}`], ['Fecha', fechaLarga(k.fecha)], ['Horario', `${hh(k.bloque)} a ${hh(k.bloque + 2)} hs`], ['Aula', k.aula], ['Instructor', k.instructor]],
        notas: ['Traiga leídos los contenidos de la clase del syllabus.', 'Baja sin cargo hasta 24 horas antes. Con menos aviso se cobra el 20% del valor de la clase.'],
        wpp: ['📚 *Flight Center* · Inscripción confirmada', '', `Hola ${n.nombre}, quedaste inscripto/a en la clase *${k.teo} · ${k.titulo}*.`, '', `📅 *${fechaLarga(k.fecha)}*`, `🕗 ${hh(k.bloque)} a ${hh(k.bloque + 2)} hs`, `🏫 ${k.aula} · ${k.instructor}`, '', '_Baja sin cargo hasta 24 h antes._'],
      };
    }
    if (n.tipo === 'tp_nuevo') {
      const t = n.datos.tp;
      return { asunto: `Nuevo trabajo práctico · ${t.titulo}`, titulo: 'Nuevo trabajo práctico en el campus', intro: 'Se publicó un nuevo trabajo práctico en el campus de Flight Center.',
        filas: [['Trabajo', t.titulo], ['Lección', t.leccion === 'GENERAL' ? 'General' : t.leccion], ['Fecha límite', t.fecha_limite ? fechaLarga(t.fecha_limite) : 'Sin fecha límite']],
        notas: ['Ingresá al campus para ver la consigna y hacer tu entrega.'], wpp: [] };
    }
    if (n.tipo === 'correccion') {
      const c = n.datos;
      return { asunto: `Trabajo corregido · ${c.tp.titulo}`, titulo: 'Tu trabajo práctico fue corregido', intro: `${c.corrector} corrigió tu entrega en el campus de Flight Center.`,
        filas: [['Trabajo', c.tp.titulo], ['Resultado', c.estado === 'aprobado' ? 'Aprobado' : 'A rehacer'], ...(c.nota != null ? [['Nota', String(c.nota)]] : []), ...(c.comentario ? [['Comentario', c.comentario]] : [])],
        notas: [c.estado === 'aprobado' ? '¡Felicitaciones! Seguí así.' : 'Revisá el comentario y volvé a entregar el trabajo desde el campus.'], wpp: [] };
    }
    const d = n.datos;
    return {
      asunto: `Recordatorio de saldo pendiente · ${pesos(d.saldo)}`, titulo: 'Recordatorio de saldo pendiente',
      intro: `Le recordamos que al día de la fecha su cuenta en Flight Center registra un saldo pendiente de pago de ${pesos(d.saldo)}.`,
      filas: [['Saldo a pagar', pesos(d.saldo)], ...d.ultimos.map((m) => [`${fechaCorta(m.fecha)} · ${m.concepto}`, pesos(m.importe)])],
      notas: ['Puede abonar en la oficina de la escuela en efectivo, con tarjeta o por transferencia bancaria / Mercado Pago.', 'Si ya realizó el pago, por favor desestime este mensaje.', 'Este recordatorio se envía una vez por día mientras haya saldo pendiente.'],
      wpp: ['💳 *Flight Center* · Recordatorio de pago', '', `Hola ${n.nombre}, tu cuenta registra un saldo pendiente de *${pesos(d.saldo)}*.`, '', 'Podés abonar en la oficina de la escuela en efectivo, tarjeta, transferencia o Mercado Pago.', '', '_Si ya pagaste, desestimá este mensaje. ¡Gracias!_'],
    };
  }
  return datosAviso;
})();
if (typeof module !== 'undefined') module.exports = { contenidoAviso };
