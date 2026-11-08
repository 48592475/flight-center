/* Envío real de avisos: email (SMTP, por ejemplo Gmail) y WhatsApp (API oficial de Meta).
   Si un canal no tiene sus claves cargadas, el aviso queda registrado como "sin configurar". */
const { contenidoAviso } = require('./nucleo');

const env = process.env;
const URL_PUBLICA = (env.PUBLIC_URL || env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');
const emailListo = () => !!(env.SMTP_USER && env.SMTP_PASS);
const whatsappListo = () => !!(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID);

let transporte = null;
function smtp() {
  if (!transporte) {
    const nodemailer = require('nodemailer');
    const port = Number(env.SMTP_PORT || 465);
    transporte = nodemailer.createTransport({ host: env.SMTP_HOST || 'smtp.gmail.com', port, secure: port === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } });
  }
  return transporte;
}

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// HTML con estilos en línea: es lo que respetan Gmail, Outlook y los celulares
function htmlEmail(n, a) {
  const filas = a.filas.map(([k, v], i) => {
    const total = n.tipo === 'deuda' && i === 0;
    return `<tr><td style="padding:10px 14px;border-bottom:1px solid #e6edf4;color:#5b7690;width:45%;font-size:14px;${total ? 'background:#fff8e6;' : ''}">${esc(k)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e6edf4;color:#0a2540;font-weight:600;font-size:${total ? 17 : 14}px;${total ? 'background:#fff8e6;color:#8a5a00;font-weight:800;' : ''}">${esc(v)}</td></tr>`;
  }).join('');
  const logo = URL_PUBLICA ? `<img src="${URL_PUBLICA}/logo-oscuro.png" alt="Flight Center" height="28" style="display:block;height:28px;border:0">` : '<span style="color:#ffffff;font:700 20px Arial,sans-serif">Flight Center</span>';
  return `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#eef3f8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;font-family:Georgia,'Times New Roman',serif">
<tr><td style="background:#0a2540;padding:20px 26px">${logo}<div style="color:#81d4fa;font:600 11px Arial,sans-serif;letter-spacing:1.5px;text-transform:uppercase;margin-top:8px">Escuela de vuelo · Aeródromo de Morón</div></td></tr>
<tr><td style="padding:28px 30px 10px;color:#1b2a3a;font-size:16px;line-height:1.55">
<h1 style="font:600 23px Georgia,serif;color:#0a2540;margin:0 0 16px;padding-bottom:12px;border-bottom:2px solid #4fc3f7">${esc(a.titulo)}</h1>
<p style="margin:0 0 10px">Estimado/a ${esc(n.nombre)} ${esc(n.apellido)}:</p>
<p style="margin:0 0 16px">${esc(a.intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;margin:0 0 18px">${filas}</table>
<div style="background:#e3f2fd;border-left:3px solid #1e88e5;padding:12px 16px;font:14px/1.5 Arial,sans-serif;color:#0f3460;margin:0 0 18px">${a.notas.map((x) => `<div style="margin:2px 0">${esc(x)}</div>`).join('')}</div>
<p style="margin:0 0 4px">Saludos cordiales,</p><p style="margin:0 0 20px;font-weight:600">Administración<br>Flight Center</p>
</td></tr>
<tr><td style="background:#f5f8fb;padding:14px 26px;font:12px Arial,sans-serif;color:#5b7690">Flight Center · Aeródromo de Morón (SADM), Buenos Aires · Este es un mensaje automático, por favor no lo responda.</td></tr>
</table></td></tr></table></body></html>`;
}

// Número argentino en formato internacional para WhatsApp: 549 + característica + número
function numeroWhatsapp(tel) {
  let d = String(tel || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  if (!d.startsWith('54')) d = '54' + d;
  if (d[2] !== '9') d = '549' + d.slice(2);
  return d.length >= 12 ? d : null;
}

// Parámetros de cada plantilla de WhatsApp (el orden tiene que coincidir con la plantilla aprobada en Meta)
function plantillaWhatsapp(n) {
  const d = n.datos;
  if (n.tipo === 'reserva') {
    const rs = d.reservas; const r = rs[0]; const bl = rs.map((x) => x.bloque).sort((a, b) => a - b);
    const hh = (h) => `${String(h).padStart(2, '0')}:00`;
    const fecha = new Date(`${r.fecha}T12:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    return { nombre: env.WHATSAPP_TPL_RESERVA || 'reserva_confirmada', params: [n.nombre, r.tipo === 'simulador' ? 'turno de simulador' : 'vuelo', fecha,
      `${hh(bl[0])} a ${hh(bl.at(-1) + 2)} hs`, `${r.recurso} (${r.modelo})`, r.instructor || 'sin instructor', `${r.tipo === 'simulador' ? 'SIM' : 'FC'}-${String(r.id).padStart(5, '0')}`] };
  }
  if (n.tipo === 'clase') {
    const k = d.clase; const hh = (h) => `${String(h).padStart(2, '0')}:00`;
    const fecha = new Date(`${k.fecha}T12:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    return { nombre: env.WHATSAPP_TPL_CLASE || 'clase_confirmada', params: [n.nombre, `${k.teo} · ${k.titulo}`, fecha, `${hh(k.bloque)} a ${hh(k.bloque + 2)} hs`, `${k.aula} con ${k.instructor}`] };
  }
  if (n.tipo === 'turno_liberado') {
    const hh = (h) => `${String(h).padStart(2, '0')}:00`; const bl = d.bloques;
    const fecha = new Date(`${d.fecha}T12:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    return { nombre: env.WHATSAPP_TPL_LIBERADO || 'turno_liberado', params: [n.nombre, d.tipo === 'simulador' ? 'simulador' : 'vuelo', fecha, `${hh(bl[0])} a ${hh(bl.at(-1) + 2)} hs`,
      `${d.recurso}${d.modelo ? ` (${d.modelo})` : ''}`, d.instructor || 'sin instructor asignado'] };
  }
  return { nombre: env.WHATSAPP_TPL_DEUDA || 'recordatorio_pago', params: [n.nombre, `$ ${Math.round(d.saldo).toLocaleString('es-AR')}`] };
}

async function enviarWhatsapp(n) {
  const to = numeroWhatsapp(n.destino);
  if (!to) throw new Error('Teléfono inválido en el perfil');
  const t = plantillaWhatsapp(n);
  const r = await fetch(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION || 'v21.0'}/${env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template',
      template: { name: t.nombre, language: { code: env.WHATSAPP_IDIOMA || 'es_AR' }, components: [{ type: 'body', parameters: t.params.map((p) => ({ type: 'text', text: String(p).replace(/\s+/g, ' ').slice(0, 300) })) }] } }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message || `WhatsApp respondió ${r.status}`);
}

async function enviar(Store, n) {
  const marcar = (estado, detalle) => Store._marcarNotificacion(n.id, estado, detalle);
  try {
    if (n.canal === 'email') {
      if (!emailListo()) return marcar('sin_configurar');
      const a = contenidoAviso(n);
      await smtp().sendMail({ from: env.MAIL_FROM || `Flight Center <${env.SMTP_USER}>`, to: n.destino, subject: a.asunto, html: htmlEmail(n, a),
        text: [`Estimado/a ${n.nombre} ${n.apellido}:`, '', a.intro, '', ...a.filas.map(([k, v]) => `${k}: ${v}`), '', ...a.notas, '', 'Administración · Flight Center'].join('\n') });
      return marcar('enviado');
    }
    if (n.canal === 'whatsapp') {
      if (!whatsappListo()) return marcar('sin_configurar');
      await enviarWhatsapp(n);
      return marcar('enviado');
    }
  } catch (e) {
    console.error(`Aviso ${n.id} (${n.canal}) no enviado:`, e.message);
    marcar('error', e.message.slice(0, 200));
  }
}

module.exports = { enviar, emailListo, whatsappListo, htmlEmail, numeroWhatsapp, plantillaWhatsapp };
