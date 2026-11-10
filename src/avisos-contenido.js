/* Contenido de los avisos (email y WhatsApp). Lo usan la página y el servidor. */
const contenidoAviso = (() => {
  const hh = (h) => `${String(h).padStart(2, '0')}:00`;
  const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtFecha = (s, o) => parseISO(s).toLocaleDateString('es-AR', o);
  const codigoReserva = (id, p = 'FC') => `${p}-${String(id).padStart(5, '0')}`;
  const pesos = (n) => `$ ${Math.round(n || 0).toLocaleString('es-AR')}`;
  const usd = (n) => `US$ ${(Math.round((n || 0) * 100) / 100).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    if (n.tipo === 'instructor_tarde') {
      const d = n.datos;
      return { asunto: `Llegada tarde · ${d.instructor} · ${fechaCorta(d.fecha)} ${d.hora}`, titulo: 'Un instructor llegó tarde',
        intro: `${d.instructor} registró su llegada a la escuela con el QR a las ${d.hora}, ${d.minutos} minutos después de su primer turno del día.`,
        filas: [['Instructor', d.instructor], ['Fecha', fechaLarga(d.fecha)], ['Primer turno', `${hh(d.primer_bloque)} hs`], ['Llegada', `${d.hora} hs (${d.minutos} min tarde)`],
          ...d.actividades.map((a) => [`${hh(a.bloque)} hs`, a.tipo === 'teorica' ? `Clase ${a.titulo} · ${a.recurso}` : `${a.tipo === 'simulador' ? 'Simulador' : 'Vuelo'} ${a.recurso}${a.con ? ` con ${a.con}` : ''}`])],
        notas: ['Quedó registrado en el historial de asistencia del instructor (Administración → Instructores).'], wpp: [] };
    }
    if (n.tipo === 'turno_liberado') {
      const d = n.datos; const sim = d.tipo === 'simulador'; const bl = d.bloques;
      const horario = `${hh(bl[0])} a ${hh(bl.at(-1) + 2)} hs`;
      return { asunto: `Turno liberado · ${sim ? 'Simulador' : 'Vuelo'} del ${fechaCorta(d.fecha)} a las ${hh(bl[0])}`, titulo: 'Se liberó un turno',
        intro: `Se canceló un ${sim ? 'turno de simulador' : 'vuelo'} y el horario quedó libre. Si te sirve, reservalo desde la app de Flight Center: se lo queda el primero que lo reserve.`,
        filas: [['Fecha', fechaLarga(d.fecha)], ['Horario', `${horario}${bl.length > 1 ? ` (${bl.length} bloques)` : ''}`], [sim ? 'Simulador' : 'Aeronave', `${d.recurso}${d.modelo ? ` · ${d.modelo}` : ''}`],
          ['Instructor', d.instructor || 'Sin instructor asignado']],
        notas: ['El turno no queda reservado para vos: tenés que reservarlo en la app.', 'Si no querés recibir estos avisos, desactivalos en Mi perfil → Avisos.'],
        wpp: [`🔔 *Flight Center* · Turno liberado`, '', `Hola ${n.nombre}, se liberó un ${sim ? 'turno de simulador' : 'vuelo'}.`, '', `📅 *${fechaLarga(d.fecha)}*`, `🕗 ${horario}`,
          `${sim ? '🖥️' : '🛩️'} ${d.recurso}${d.modelo ? ` · ${d.modelo}` : ''}`, `👨‍✈️ ${d.instructor || 'Sin instructor asignado'}`, '', 'Si te interesa, reservalo desde la app: se lo queda el primero que lo reserve.'] };
    }
    if (n.tipo === 'ausencia') {
      const r = n.datos.reserva; const sim = r.tipo === 'simulador';
      return { asunto: `Ausencia registrada · ${sim ? 'Simulador' : 'Vuelo'} del ${fechaCorta(r.fecha)}`, titulo: 'Registramos tu ausencia',
        intro: `${saludo(n)}, no te presentaste a tu ${sim ? 'turno de simulador' : 'vuelo'} y la reserva quedó registrada como ausente${n.datos.justificada ? ' (justificada)' : ''}.`,
        filas: [['Código de reserva', codigoReserva(r.id, sim ? 'SIM' : 'FC')], ['Fecha', fechaLarga(r.fecha)], ['Horario', `${hh(r.bloque)} a ${hh(r.bloque + 2)} hs`],
          [sim ? 'Simulador' : 'Aeronave', `${r.recurso} · ${r.modelo}`], ['Instructor', r.instructor || 'Sin instructor'],
          ...(n.datos.motivo ? [['Motivo', n.datos.motivo]] : []), ['Cargo', n.datos.cargo ? (n.datos.moneda === 'USD' && n.datos.cargo_usd != null ? usd(n.datos.cargo_usd) : pesos(n.datos.cargo)) : 'Sin cargo']],
        notas: ['Si no podés venir, cancelá con anticipación desde Mis reservas para evitar el cargo por ausencia.', 'Si creés que es un error, comunicate con la escuela.'], wpp: [] };
    }
    if (n.tipo === 'foro_respuesta') {
      const f = n.datos;
      return { asunto: `Nueva respuesta en el foro · ${f.tema.titulo}`, titulo: 'Respondieron tu consulta en el foro', intro: `${f.quien}${f.docente ? ' (instructor)' : ''} respondió tu consulta en el foro del campus de Flight Center.`,
        filas: [['Consulta', f.tema.titulo], ['Respuesta', f.texto]], notas: ['Ingresá al campus para ver la respuesta completa y, si te resolvió la duda, marcala como destacada.'], wpp: [] };
    }
    if (n.tipo === 'correccion') {
      const c = n.datos;
      return { asunto: `Trabajo corregido · ${c.tp.titulo}`, titulo: 'Tu trabajo práctico fue corregido', intro: `${c.corrector} corrigió tu entrega en el campus de Flight Center.`,
        filas: [['Trabajo', c.tp.titulo], ['Resultado', c.estado === 'aprobado' ? 'Aprobado' : 'A rehacer'], ...(c.nota != null ? [['Nota', String(c.nota)]] : []), ...(c.comentario ? [['Comentario', c.comentario]] : [])],
        notas: [c.estado === 'aprobado' ? '¡Felicitaciones! Seguí así.' : 'Revisá el comentario y volvé a entregar el trabajo desde el campus.'], wpp: [] };
    }
    const d = n.datos; const enUsd = d.moneda === 'USD'; const plata = (ars, u) => enUsd && u != null ? usd(u) : pesos(ars);
    return {
      asunto: `Recordatorio de saldo pendiente · ${plata(d.saldo, d.saldo_usd)}`, titulo: 'Recordatorio de saldo pendiente',
      intro: `Le recordamos que al día de la fecha su cuenta en Flight Center registra un saldo pendiente de pago de ${plata(d.saldo, d.saldo_usd)}.`,
      filas: [['Saldo a pagar', plata(d.saldo, d.saldo_usd)], ...d.ultimos.map((m) => [`${fechaCorta(m.fecha)} · ${m.concepto}`, plata(m.importe, m.usd)])],
      notas: ['Puede abonar en la oficina de la escuela en efectivo, con tarjeta o por transferencia bancaria / Mercado Pago.', 'Si ya realizó el pago, por favor desestime este mensaje.', 'Este recordatorio se envía una vez por día mientras haya saldo pendiente.'],
      wpp: ['💳 *Flight Center* · Recordatorio de pago', '', `Hola ${n.nombre}, tu cuenta registra un saldo pendiente de *${plata(d.saldo, d.saldo_usd)}*.`, '', 'Podés abonar en la oficina de la escuela en efectivo, tarjeta, transferencia o Mercado Pago.', '', '_Si ya pagaste, desestimá este mensaje. ¡Gracias!_'],
    };
  }
  return datosAviso;
})();
if (typeof module !== 'undefined') module.exports = { contenidoAviso };
