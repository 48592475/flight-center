# Cómo publicar Flight Center con base de datos (Render)

El repositorio tiene dos versiones:

| Versión | Dónde | Datos |
|---|---|---|
| Demo | GitHub Pages: https://48592475.github.io/flight-center/ | Se guardan en el navegador de cada persona |
| Real | Render (esta guía) | Base de datos PostgreSQL compartida por todos |

Todo lo que se usa tiene plan gratuito:

| Parte | Servicio | Plan |
|---|---|---|
| Página y servidor | Render (render.com) | Free |
| Base de datos PostgreSQL | Neon (neon.tech) | Free (0,5 GB, sin vencimiento) |
| Recordatorio diario de las 9:00 | cron-job.org | Gratis |

Limitación del plan gratis de Render: si nadie usa la página durante 15 minutos, el servidor se apaga y la próxima vez tarda entre 30 y 60 segundos en abrir. Los datos no se pierden porque están en Neon. Si más adelante molesta, se pasa el servicio a un plan pago desde Render sin cambiar nada más.

## 1. Crear la base de datos en Neon

1. Entrá a https://neon.tech y tocá **Sign up**. Podés entrar con tu cuenta de GitHub.
2. Creá un proyecto: nombre `flight-center`, región **AWS US East (N. Virginia)**.
3. En el panel del proyecto tocá **Connect** y copiá la **Connection string**. Empieza con `postgresql://` y termina con `?sslmode=require`. Guardala: la vas a pegar en Render.

## 2. Publicar en Render

1. Entrá a https://render.com, tocá **Get Started** e iniciá sesión con **GitHub**. Cuando lo pida, dale acceso al repositorio **flight-center**. No hace falta cargar tarjeta.
2. Tocá **New → Blueprint** y elegí **48592475/flight-center**. Render lee el archivo `render.yaml` y muestra el servicio `flight-center`.
3. Completá las variables:
   - **DATABASE_URL**: la Connection string de Neon.
   - **ADMIN_EMAIL**: el email con el que va a entrar la administración.
   - **ADMIN_PASSWORD**: una contraseña segura (mínimo 6 caracteres). Cambiala después desde *Mi perfil*.
   - Las demás (SMTP, WHATSAPP, FAA) se pueden dejar vacías y cargar más adelante.
4. Tocá **Apply**. En unos minutos queda online en una dirección tipo `https://flight-center.onrender.com`.
5. Entrá con ADMIN_EMAIL y ADMIN_PASSWORD. Desde **Usuarios** cargá instructores, alumnos, pilotos y mecánicos, y desde **Instructores** asigná los días y horarios de vuelo.

La base arranca vacía: solo con el administrador, la flota (LV-FCA, LV-FCB, LV-FCC, LV-FCD, Frasca y Simu 1) y las tarifas. La flota y las tarifas se pueden cambiar desde la administración.

## 2b. Programar el recordatorio diario (cron-job.org)

Como el servidor gratis se apaga cuando no se usa, un servicio externo lo despierta todos los días a las 9:00 para mandar los recordatorios de deuda.

1. En Render: servicio **flight-center → Environment**, copiá el valor de **CRON_TOKEN** (Render lo generó solo).
2. Entrá a https://cron-job.org, creá una cuenta gratis y tocá **Create cronjob**.
3. **URL**: `https://flight-center.onrender.com/api/tareas/diarias?token=EL_CRON_TOKEN` (cambiá la dirección si Render te dio otra).
4. **Schedule**: todos los días a las **09:00**, zona horaria **America/Argentina/Buenos_Aires**.
5. En **Advanced**, poné el **Timeout** en 60 segundos (el servidor puede tardar en despertar). Guardá.

## 3. Activar los emails (Gmail)

1. Creá un Gmail de la escuela, por ejemplo `flightcenter.reservas@gmail.com`.
2. En https://myaccount.google.com/security activá la **Verificación en dos pasos**.
3. Entrá a https://myaccount.google.com/apppasswords, creá una contraseña de aplicación llamada "Flight Center" y copiá las 16 letras.
4. En Render: servicio **flight-center → Environment**, cargá:
   - `SMTP_USER` = el Gmail
   - `SMTP_PASS` = la contraseña de aplicación (sin espacios)
5. Guardá. El servicio se reinicia solo y desde ahí los avisos salen por email.

Más adelante, con un dominio propio (por ejemplo @flightcenter.com.ar), se cambian `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `MAIL_FROM` por los del proveedor de correo.

## 4. Activar WhatsApp (API oficial de Meta)

1. Creá una cuenta en https://business.facebook.com y después una app en https://developers.facebook.com con el producto **WhatsApp**.
2. Registrá el número de la escuela (no puede estar en uso en la app de WhatsApp) y verificá la empresa.
3. En **WhatsApp Manager → Plantillas de mensaje** creá estas cuatro plantillas, categoría **Utilidad**, idioma **Español (ARG)** (`es_AR`). El texto tiene que respetar el orden de las variables:

   **reserva_confirmada**
   ```
   Hola {{1}}, tu {{2}} en Flight Center quedó confirmado.
   Fecha: {{3}}
   Horario: {{4}}
   Equipo: {{5}}
   Instructor: {{6}}
   Código: {{7}}
   Cancelación sin cargo hasta 24 h antes; después se cobra el 20% del bloque.
   ```

   **clase_confirmada**
   ```
   Hola {{1}}, quedaste inscripto/a en la clase {{2}} de Flight Center.
   Fecha: {{3}}
   Horario: {{4}}
   Lugar: {{5}}
   ```

   **turno_liberado**
   ```
   Hola {{1}}, se liberó un turno de {{2}} en Flight Center.
   Fecha: {{3}}
   Horario: {{4}}
   Equipo: {{5}}
   Instructor: {{6}}
   Si te interesa, reservalo desde la app: se lo queda el primero que lo reserve.
   ```

   **recordatorio_pago**
   ```
   Hola {{1}}, tu cuenta en Flight Center registra un saldo pendiente de {{2}}. Podés abonar en la oficina de la escuela en efectivo, tarjeta, transferencia o Mercado Pago. Si ya pagaste, desestimá este mensaje.
   ```
4. Cuando Meta apruebe las plantillas, cargá en Render:
   - `WHATSAPP_TOKEN` = token permanente de un usuario del sistema (System User) con permiso `whatsapp_business_messaging`
   - `WHATSAPP_PHONE_ID` = el "Phone number ID" del número
5. Los teléfonos de los perfiles tienen que estar en formato argentino con característica, por ejemplo `+54 9 11 5555-1234`.

## 5. NOTAM automáticos (opcional)

1. Pedí una clave gratuita en https://api.faa.gov (NOTAM API).
2. Cargá en Render `FAA_CLIENT_ID` y `FAA_CLIENT_SECRET`.

El METAR y el TAF funcionan sin clave (Aviation Weather Center, NOAA).

## 6. Recordatorio diario de deuda

Sale todos los días a las 9:00 (hora de Argentina) a cada alumno o piloto con saldo a pagar, por email y WhatsApp, gracias a la tarea de cron-job.org del paso 2b. La administración también puede enviarlo en el momento desde **Avisos → Enviar ahora**. Nunca se manda más de uno por día a la misma persona.

## 7. Dominio propio (opcional)

1. Registrá el dominio en https://nic.ar (por ejemplo `flightcenter.com.ar`).
2. En Render: **flight-center → Settings → Custom Domains → Add** y seguí las instrucciones para cargar el registro DNS.

## 8. Copias de seguridad

Neon guarda el historial de la base de datos de los últimos días en el plan gratis y permite restaurarla desde **Branches → Restore**. Conviene además descargar una copia de vez en cuando desde el panel de Neon.

El plan gratis de Neon tiene 0,5 GB. Los datos del sistema ocupan muy poco; lo que más ocupa son los PDF de CMA y licencias (hasta 10 MB cada uno). Si se llena, Neon ofrece planes pagos.

## Para quien mantiene el código

- El código fuente está en `src/`. Después de cambiarlo, correr `python3 build.py`, que arma `index.html` (demo) y `servidor/public/index.html` + `servidor/nucleo.js` (versión real).
- Para probar el servidor en una computadora: `cd servidor && npm install && npm run demo` (usa datos de ejemplo y guarda en `servidor/datos/`).
